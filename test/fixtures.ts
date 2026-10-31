import { buildResult } from "@/lib/assessment";
import { ZONE_ORDER } from "@/lib/zones";
import type { PhotoAssessment, ZoneKey, ZoneRead } from "@/lib/types";

function detail(k: ZoneKey): Omit<ZoneRead, "change" | "appearsFull"> {
  return {
    cause: "volume",
    see: `what we see in the ${k}`,
    why: `why the ${k} changes`,
    help: `what could help the ${k}`,
    benefit: `what filler could do for the ${k}`,
  };
}

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
        ? { ...detail(k), change: v, appearsFull: false }
        : { ...detail(k), change: 10, appearsFull: false, ...(v ?? {}) };
  }
  return {
    zones,
    zonesObscured: [],
    skinLaxity: 20,
    jowlGrade: "none",
    makeupDetected: false,
    framingAdequate: true,
    previousWorkVisible: false,
    summary: [
      "Your cheeks have lost a little height at the front, so light now catches lower on your face.",
      "That creates the soft shadow running from your nose to your mouth.",
      "Your lips are in proportion, so we'd leave them alone.",
    ],
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
  {
    fillerHistory: "no",
    priority: "less_tired",
    sex: "woman",
    skinScanUsed: true,
    measurements: [
      { key: "lip_ratio", label: "Upper to lower lip ratio", value: "1 : 1.5", detail: "balanced range ≈ 1 : 1.6", source: "geometry" },
      { key: "hint_cheeks", label: "Mid-face shadow", value: "moderate", source: "geometry" },
    ],
  },
);
