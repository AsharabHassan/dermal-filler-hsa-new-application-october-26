import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import { zoneMarkers, type NormEllipse } from "./face-regions";
import type { ZoneKey } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Keeps the AI "after" illustration honest. The image model redraws the whole
// photo and tends to retouch it (fading pigmentation, smoothing pores and
// lines), which filler does not do. So the edit is only allowed inside soft
// masks around the client's focus zones, and even there only its broad shape
// and shading change is used: the original photo's fine detail (pores,
// freckles, pigment, lines) is kept. Pure; tested in test/preview-mask.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** How far each zone's mask reaches beyond its on-face marker. */
const GROW: Record<ZoneKey, number> = {
  temples: 1.7,
  teartrough: 1.5,
  cheeks: 1.8,
  nasolabial: 1.6,
  lips: 1.4,
  marionette: 1.6,
  chin: 1.6,
  jawline: 1.9,
};

/** Soft-mask ellipses (normalized) for the zones the illustration may change. */
export function previewMaskEllipses(zones: ZoneKey[], lm: NormalizedPoint[]): NormEllipse[] {
  return zones.flatMap((zone) =>
    zoneMarkers(zone, lm).map((e) => ({ ...e, rx: e.rx * GROW[zone], ry: e.ry * GROW[zone] })),
  );
}

/**
 * out = original + mask × (low-pass edit − low-pass original), per RGB channel.
 * `mask` is one 0–255 value per pixel; every array is RGBA except `mask`.
 * Alpha comes from the original.
 */
export function blendBroadChange(
  original: Uint8ClampedArray,
  lowOriginal: Uint8ClampedArray,
  lowEdit: Uint8ClampedArray,
  mask: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(original.length);
  for (let p = 0, i = 0; i < original.length; p++, i += 4) {
    const m = mask[p] / 255;
    out[i] = original[i] + m * (lowEdit[i] - lowOriginal[i]);
    out[i + 1] = original[i + 1] + m * (lowEdit[i + 1] - lowOriginal[i + 1]);
    out[i + 2] = original[i + 2] + m * (lowEdit[i + 2] - lowOriginal[i + 2]);
    out[i + 3] = original[i + 3];
  }
  return out;
}
