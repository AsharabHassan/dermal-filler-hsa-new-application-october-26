import type { NormRect } from "./face-regions";

// ─────────────────────────────────────────────────────────────────────────────
// Client-only canvas cropping. Takes the in-memory selfie (base64) plus a
// normalized rectangle and returns a cropped JPEG data URL. Nothing leaves the
// device — this is the same Canvas API the capture/overlay steps already use.
// ─────────────────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

/**
 * Crop the source image around `rect` (normalized 0–1 coords) into a SQUARE JPEG
 * data URL — for square thumbnail cells. The square is centred on the rect,
 * grown to the rect's longer side and clamped to the photo. Returns null on
 * failure.
 */
export async function cropImage(
  base64: string,
  mediaType: string,
  rect: NormRect,
): Promise<string | null> {
  try {
    const img = await loadImage(`data:${mediaType};base64,${base64}`);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    let side = Math.max(rect.w * nw, rect.h * nh, 1);
    side = Math.min(side, nw, nh);

    const cx = (rect.x + rect.w / 2) * nw;
    const cy = (rect.y + rect.h / 2) * nh;
    let sx = Math.round(cx - side / 2);
    let sy = Math.round(cy - side / 2);
    const s = Math.round(side);
    sx = Math.max(0, Math.min(sx, nw - s));
    sy = Math.max(0, Math.min(sy, nh - s));

    const canvas = document.createElement("canvas");
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, s, s);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

/**
 * Crop EXACTLY `rect` (normalized 0–1 coords), preserving its aspect ratio, so
 * overlays computed in rect space line up with the pixels. Used for the
 * under-eye band. Returns null on failure.
 */
export async function cropRect(
  base64: string,
  mediaType: string,
  rect: NormRect,
): Promise<string | null> {
  try {
    const img = await loadImage(`data:${mediaType};base64,${base64}`);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const sx = Math.round(rect.x * nw);
    const sy = Math.round(rect.y * nh);
    const sw = Math.max(1, Math.round(rect.w * nw));
    const sh = Math.max(1, Math.round(rect.h * nh));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}
