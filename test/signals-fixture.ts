import type { FillerSignals } from "@/lib/skinscan";

/** A realistic /fillers response (shape matches the live SkinScan). */
export const SIGNALS: FillerSignals = {
  ok: true,
  version: "fillers-signals-1.0",
  endolift_model: {
    version: "endolift-1.0",
    cheeks_focus: 0.41,
    chin_focus: 0.72,
    neck_focus: 0.2,
    strong_candidate: 0.55,
    jawline_enhancement: 31,
    chin_enhancement: 28,
  },
  undereye_measure: { darkness_index: 22, character: "structural" },
  geometry: {
    lip_ratio_upper_lower: 0.66,
    lip_fullness: 0.31,
    lower_face_ratio: 0.52,
    chin_height_ratio: 0.38,
    shadow_depth: { temples: 6.2, cheeks: 4.1, nasolabial: 7.5 },
  },
  derm_foundation: {
    model: "derm-foundation + dinov2 -> skinscan-1.0 head",
    skin_quality: { cheeks: { photodamage: 0.18, clear: 0.6 } },
  },
  skin_measure: { texture_index: { cheeks: 7.5 } },
  combined: { laxity_proxy: 0.34 },
  zone_hints: { cheeks: "moderate", lips: "low" },
};
