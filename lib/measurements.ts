import type { Measurement } from "./types";
import type { FillerSignals, ZoneHint } from "./skinscan";

// ─────────────────────────────────────────────────────────────────────────────
// "Your scan measurements" — HSA SkinScan results in plain language. These are
// MEASUREMENTS of the photo, never scores of the person. The zone hints and
// skin readings are uncalibrated, so they read as "low / moderate / higher"
// rather than precise claims. Pure; tested in test/measurements.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Uncalibrated hint → plain level. */
export const LEVEL: Record<ZoneHint, string> = {
  low: "low",
  moderate: "moderate",
  high: "higher",
};

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** 0.66 (upper ÷ lower) → "1 : 1.5". */
export function ratioText(upperOverLower: number): string {
  return `1 : ${(1 / upperOverLower).toFixed(1)}`;
}

/** Laxity proxy (0–1) → plain firmness-change reading. */
export function firmnessReading(laxity: number): string {
  if (laxity < 0.3) return "minimal";
  if (laxity < 0.5) return "mild";
  if (laxity < 0.7) return "moderate";
  return "higher";
}

/** Measured texture index → plain reading (uncalibrated; ~4 on smooth test skin). */
export function textureReading(index: number): string {
  if (index < 6) return "smooth";
  if (index < 10) return "some texture";
  return "more visible texture";
}

const UNDEREYE_TYPE: Record<string, string> = {
  minimal: "minimal",
  structural: "shadow from volume (structural)",
  pigmented: "colour in the skin, not volume",
  vascular: "colour from thin skin, not volume",
};

const HINT_LABELS: [string, string][] = [
  ["teartrough", "Shadow under the eyes"],
  ["cheeks", "Mid-face shadow"],
  ["temples", "Temple shadow"],
  ["nasolabial", "Shadow beside your nose and mouth"],
  ["marionette", "Shadow at the corners of your mouth"],
  ["jawline", "Jawline softening reading"],
  ["chin", "Chin change reading"],
];

export function buildMeasurements(s: FillerSignals): Measurement[] {
  const out: Measurement[] = [];
  const hidden = new Set(s.zones_not_visible ?? []);
  const g = s.geometry;

  if (finite(g?.lip_ratio_upper_lower) && !hidden.has("lips")) {
    out.push({
      key: "lip_ratio",
      label: "Upper to lower lip ratio",
      value: ratioText(g.lip_ratio_upper_lower),
      detail: "balanced range ≈ 1 : 1.6",
      source: "geometry",
    });
  }
  if (finite(g?.lower_face_ratio) && !hidden.has("chin") && !hidden.has("lips")) {
    out.push({
      key: "lower_face",
      label: "Nose-to-mouth : mouth-to-chin",
      value: ratioText(g.lower_face_ratio),
      detail: "typical ≈ 1 : 2",
      source: "geometry",
    });
  }

  for (const [zone, label] of HINT_LABELS) {
    const h = s.zone_hints?.[zone];
    if (!h || hidden.has(zone)) continue;
    out.push({
      key: `hint_${zone}`,
      label,
      value: LEVEL[h],
      source: zone === "jawline" || zone === "chin" ? "endolift_model" : "geometry",
    });
  }

  if (s.undereye_measure && !hidden.has("teartrough")) {
    out.push({
      key: "undereye_type",
      label: "Under-eye shadow type",
      value: UNDEREYE_TYPE[s.undereye_measure.character] ?? "minimal",
      source: "undereye_measure",
    });
  }

  if (finite(s.combined?.laxity_proxy)) {
    out.push({
      key: "firmness",
      label: "Lower-face firmness reading",
      value: firmnessReading(s.combined.laxity_proxy),
      detail: "how much change comes from skin firmness rather than volume",
      source: "combined",
    });
  }

  const tex = s.skin_measure?.texture_index?.cheeks ?? s.skin_measure?.texture_index?.jawline;
  if (finite(tex)) {
    out.push({ key: "texture", label: "Skin texture reading", value: textureReading(tex), source: "skin_measure" });
  }

  const q = s.derm_foundation?.skin_quality?.cheeks ?? s.derm_foundation?.skin_quality?.jawline;
  if (q && Number.isFinite(q.photodamage)) {
    out.push({
      key: "sun",
      label: "Sun-related skin change reading",
      value: q.photodamage < 0.3 ? "low" : q.photodamage < 0.6 ? "moderate" : "higher",
      source: "derm_foundation",
    });
  }
  return out;
}

export const MEASUREMENTS_NOTE =
  "Measured from your photo by HSA SkinScan, the clinic's own analysis model. These are readings of the photo, not scores of you, and your doctor checks them in person.";
