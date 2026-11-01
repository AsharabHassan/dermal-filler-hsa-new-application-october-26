import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import { zoneMarkers, type NormEllipse } from "./face-regions";
import type { ZoneKey } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Where the AI "after" illustration may paint. The image-edit API takes a mask
// whose transparent pixels mark the editable area, so the model can make a
// clearly visible volume change in the client's focus zones while every other
// pixel (skin texture, pigmentation, lines) stays as photographed. Pure
// geometry here; the canvas work is in lib/ai-preview.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** How far each zone's editable area reaches beyond its on-face marker. */
const GROW: Record<ZoneKey, number> = {
  temples: 2.0,
  teartrough: 1.6,
  cheeks: 2.2,
  nasolabial: 1.6,
  lips: 1.5,
  marionette: 1.6,
  chin: 1.8,
  jawline: 2.4,
};

/** Editable ellipses (normalized) for the zones the illustration may change. */
export function previewMaskEllipses(zones: ZoneKey[], lm: NormalizedPoint[]): NormEllipse[] {
  return zones.flatMap((zone) =>
    zoneMarkers(zone, lm).map((e) => ({ ...e, rx: e.rx * GROW[zone], ry: e.ry * GROW[zone] })),
  );
}
