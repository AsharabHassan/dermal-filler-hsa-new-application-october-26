// ─────────────────────────────────────────────────────────────────────────────
// Client side of the personal "See the possible difference" preview
// (app/api/preview/route.ts). Adapted from the HSA pigmentation app.
//
// The edited image is resized back onto the original photo's pixel grid and
// checked against it (luminance-layout correlation + overall brightness): if the
// model moved the face, reframed or relit the photo, it is rejected and the
// preview stays hidden. A preview must never misrepresent the result.
// A faithful edit is then applied only inside soft masks around the focus
// zones, and only as a broad shape/shading change (lib/preview-mask.ts), so the
// model's skin retouching never reaches the client.
// ─────────────────────────────────────────────────────────────────────────────

import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import { blendBroadChange, previewMaskEllipses } from "@/lib/preview-mask";
import type { Sex, ZoneKey } from "@/lib/types";

const GRID = 48;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

function lumaGrid(img: CanvasImageSource, w: number, h: number): Float32Array {
  const c = document.createElement("canvas");
  c.width = GRID;
  c.height = GRID;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h, 0, 0, GRID, GRID);
  const d = ctx.getImageData(0, 0, GRID, GRID).data;
  const out = new Float32Array(GRID * GRID);
  for (let i = 0; i < out.length; i++) {
    out[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  }
  return out;
}

function mean(a: Float32Array): number {
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

function correlation(a: Float32Array, b: Float32Array): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Same photograph: same luminance layout and no global relighting. */
export function editLooksFaithful(original: Float32Array, edited: Float32Array): boolean {
  return correlation(original, edited) >= 0.93 && Math.abs(mean(edited) - mean(original)) <= 0.04;
}

/** True when the server has a preview key configured. Never throws. */
export async function previewAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/preview", { method: "GET" });
    if (!res.ok) return false;
    return ((await res.json()) as { available?: boolean }).available === true;
  } catch {
    return false;
  }
}

/** Low-pass copy: shrink then enlarge, which keeps shape and shading but drops pores and spots. */
function lowPass(src: CanvasImageSource, w: number, h: number): Uint8ClampedArray {
  const sw = Math.max(16, Math.round(w / 14));
  const sh = Math.max(16, Math.round(h / 14));
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(src, 0, 0, w, h, 0, 0, sw, sh);
  const big = document.createElement("canvas");
  big.width = w;
  big.height = h;
  const bctx = big.getContext("2d")!;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, w, h);
  return bctx.getImageData(0, 0, w, h).data;
}

/** One 0–255 value per pixel: soft-edged ellipses around the focus zones. */
function zoneMask(zones: ZoneKey[], lm: NormalizedPoint[], w: number, h: number): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "lighten";
  for (const e of previewMaskEllipses(zones, lm)) {
    const rx = e.rx * w;
    const ry = e.ry * h;
    ctx.save();
    ctx.translate(e.cx * w, e.cy * h);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.55, "#fff");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8ClampedArray(w * h);
  for (let p = 0; p < mask.length; p++) mask[p] = Math.round((rgba[p * 4] * rgba[p * 4 + 3]) / 255);
  return mask;
}

export interface AfterImage {
  dataUrl: string;
  width: number;
  height: number;
}

let cache: { key: string; promise: Promise<AfterImage | null> } | null = null;

/** The validated "after" illustration on the original pixel grid, or null. */
export function aiAfterImage(
  imageBase64: string,
  imageMediaType: string,
  zones: ZoneKey[],
  sex: Sex | null,
  landmarks: NormalizedPoint[] | null,
): Promise<AfterImage | null> {
  // Without the face mesh the edit can't be confined to the zones, so no preview.
  if (!landmarks) return Promise.resolve(null);
  const key = `${imageBase64.length}:${imageBase64.slice(-64)}:${zones.join(",")}:${sex ?? ""}`;
  if (cache?.key === key) return cache.promise;
  const promise = (async () => {
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMediaType, imageConsent: true, zones, sex }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { imageBase64?: string; imageMediaType?: string };
      if (!json.imageBase64) return null;
      const [orig, edit] = await Promise.all([
        loadImage(`data:${imageMediaType};base64,${imageBase64}`),
        loadImage(`data:${json.imageMediaType ?? "image/png"};base64,${json.imageBase64}`),
      ]);
      const w = orig.naturalWidth;
      const h = orig.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(edit, 0, 0, w, h);
      if (!editLooksFaithful(lumaGrid(orig, w, h), lumaGrid(c, w, h))) {
        console.warn("[preview] AI edit rejected: drifted from the original photo");
        return null;
      }
      const o = document.createElement("canvas");
      o.width = w;
      o.height = h;
      const octx = o.getContext("2d")!;
      octx.drawImage(orig, 0, 0, w, h);
      const original = octx.getImageData(0, 0, w, h);
      const blended = blendBroadChange(
        original.data,
        lowPass(orig, w, h),
        lowPass(c, w, h),
        zoneMask(zones, landmarks, w, h),
      );
      original.data.set(blended);
      octx.putImageData(original, 0, 0);
      return { dataUrl: o.toDataURL("image/jpeg", 0.92), width: w, height: h };
    } catch {
      return null;
    }
  })();
  cache = { key, promise };
  return promise;
}
