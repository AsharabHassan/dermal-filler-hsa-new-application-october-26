// ─────────────────────────────────────────────────────────────────────────────
// Client-only image normalisation for uploads. A raw photo straight off a phone
// can be 12+ megapixels and several MB; held as base64, drawn into MediaPipe and
// POSTed to /api/analyze, that can exhaust memory on mobile and crash/reload the
// tab (which silently resets the in-memory wizard back to the hero). We downscale
// to a sane max dimension, apply EXIF orientation, and re-encode as JPEG so the
// rest of the flow only ever handles a small, upright image. Nothing leaves the
// device here — same Canvas API the capture/crop steps already use.
// ─────────────────────────────────────────────────────────────────────────────

import type { MediaType } from "@/store/wizard-store";

function loadImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = url;
  });
}

/**
 * Decode a user-selected image file, downscale it so its longest edge is at most
 * `maxDim`px (never upscaling), apply EXIF orientation where supported, and
 * return a JPEG as base64 (no data-URL prefix). Throws if the file can't be
 * decoded. Caller owns error handling.
 */
export async function fileToDownscaledImage(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<{ base64: string; mediaType: MediaType }> {
  let width: number;
  let height: number;
  let source: CanvasImageSource;
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;

  try {
    // Preferred path: createImageBitmap decodes off the main thread and can apply
    // EXIF orientation, and is far lighter on memory than a base64 data URL.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } catch {
    // Fallback for browsers without imageOrientation support.
    objectUrl = URL.createObjectURL(file);
    const img = await loadImageEl(objectUrl);
    width = img.naturalWidth;
    height = img.naturalHeight;
    source = img;
  }

  try {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-unavailable");
    ctx.drawImage(source, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) throw new Error("encode-failed");
    return { base64, mediaType: "image/jpeg" };
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
