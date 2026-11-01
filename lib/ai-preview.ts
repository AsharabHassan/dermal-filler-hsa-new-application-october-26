// ─────────────────────────────────────────────────────────────────────────────
// Client side of the personal "See the possible difference" preview
// (app/api/preview/route.ts). Adapted from the HSA pigmentation app.
//
// The edited image is resized back onto the original photo's pixel grid and
// checked against it (luminance-layout correlation + overall brightness): if the
// model moved the face, reframed or relit the photo, it is rejected and the
// preview stays hidden. A preview must never misrepresent the result.
// ─────────────────────────────────────────────────────────────────────────────

import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import { previewMaskEllipses } from "@/lib/preview-mask";
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

export interface AfterImage {
  dataUrl: string;
  width: number;
  height: number;
}

let cache: { key: string; promise: Promise<AfterImage | null> } | null = null;

/**
 * PNG mask (base64, same size as the photo) whose transparent pixels are the
 * focus zones: the only area the image model may edit.
 */
function zoneMaskPng(zones: ZoneKey[], lm: NormalizedPoint[], w: number, h: number): string | null {
  const ellipses = previewMaskEllipses(zones, lm);
  if (ellipses.length === 0) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  for (const e of ellipses) {
    ctx.beginPath();
    ctx.ellipse(e.cx * w, e.cy * h, e.rx * w, e.ry * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return c.toDataURL("image/png").split(",")[1] ?? null;
}

/** The validated "after" illustration on the original pixel grid, or null. */
export function aiAfterImage(
  imageBase64: string,
  imageMediaType: string,
  zones: ZoneKey[],
  sex: Sex | null,
  landmarks: NormalizedPoint[] | null = null,
): Promise<AfterImage | null> {
  const key = `${imageBase64.length}:${imageBase64.slice(-64)}:${zones.join(",")}:${sex ?? ""}`;
  if (cache?.key === key) return cache.promise;
  const promise = (async () => {
    try {
      const orig = await loadImage(`data:${imageMediaType};base64,${imageBase64}`);
      const w = orig.naturalWidth;
      const h = orig.naturalHeight;
      const maskBase64 = landmarks ? zoneMaskPng(zones, landmarks, w, h) : null;
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMediaType, imageConsent: true, zones, sex, maskBase64 }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { imageBase64?: string; imageMediaType?: string };
      if (!json.imageBase64) return null;
      const edit = await loadImage(`data:${json.imageMediaType ?? "image/png"};base64,${json.imageBase64}`);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(edit, 0, 0, w, h);
      if (!editLooksFaithful(lumaGrid(orig, w, h), lumaGrid(c, w, h))) {
        console.warn("[preview] AI edit rejected: drifted from the original photo");
        return null;
      }
      return { dataUrl: c.toDataURL("image/jpeg", 0.92), width: w, height: h };
    } catch {
      return null;
    }
  })();
  cache = { key, promise };
  return promise;
}
