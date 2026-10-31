import { buildResult } from "@/lib/assessment";
import { ZONE_ORDER } from "@/lib/zones";
import type { PhotoAssessment, ZoneKey, ZoneRead } from "@/lib/types";

/** A PhotoAssessment with every zone at `base`, overridden per zone. */
export function assessment(
  changes: Partial<Record<ZoneKey, number | Partial<ZoneRead>>> = {},
  extra: Partial<PhotoAssessment> = {},
): PhotoAssessment {
  const zones = {} as Record<ZoneKey, ZoneRead>;
  for (const k of ZONE_ORDER) {
    const v = changes[k];
    zones[k] =
      typeof v === "number"
        ? { change: v, appearsFull: false, note: `note for ${k}` }
        : { change: 10, appearsFull: false, note: `note for ${k}`, ...(v ?? {}) };
  }
  return {
    zones,
    zonesObscured: [],
    skinLaxity: 20,
    jowlGrade: "none",
    makeupDetected: false,
    framingAdequate: true,
    previousWorkVisible: false,
    narrative: {
      headline: "Your face is well supported, with two areas to discuss",
      narrative: "Your lips and chin look balanced. Your cheeks show some flattening.",
      encouragement: "A GMC-registered doctor confirms what suits you at your free online consultation.",
    },
    ...extra,
  };
}

/** A typical report: cheeks noticeable, nasolabial + temples some change, lips/chin in proportion. */
export const sampleResult = buildResult(
  assessment({ cheeks: 68, nasolabial: 45, temples: 38, lips: 12, chin: 15 }),
  { fillerHistory: "no", priority: "less_tired", skinScanUsed: true },
);
