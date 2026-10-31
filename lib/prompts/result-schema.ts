// JSON schema for Claude's structured Facial Volume Scan. Structured outputs
// don't support min/max constraints, and every object needs
// additionalProperties:false.

const ZONE_ENUM = [
  "temples",
  "teartrough",
  "cheeks",
  "nasolabial",
  "lips",
  "marionette",
  "chin",
  "jawline",
] as const;

export const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    zones: {
      type: "array",
      description:
        "Exactly eight items, one per zone. change = 0–100 visible loss of volume/structure (below 30 well supported, 30–59 some change, 60+ noticeable). appearsFull = already full / previous filler. see / why / help = What we see (1–2 sentences), Why it happens (1 sentence), What could help (1 sentence), all specific to this photo and consistent with the score. cause = none (well supported) / volume / firmness / mixed. benefit = for zones scored 30+ with a volume or mixed cause, one benefit-led sentence on what filler could do HERE (subtle, gradual, temporary, no promises); empty string otherwise.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          zone: { type: "string", enum: ZONE_ENUM },
          change: { type: "number" },
          appearsFull: { type: "boolean" },
          cause: { type: "string", enum: ["none", "volume", "firmness", "mixed"] },
          see: { type: "string" },
          why: { type: "string" },
          help: { type: "string" },
          benefit: { type: "string" },
        },
        required: ["zone", "change", "appearsFull", "cause", "see", "why", "help", "benefit"],
      },
    },
    zonesObscured: {
      type: "array",
      description: "Zones that cannot be read in this photo (hair, beard, glasses, hand, shadow, head turn).",
      items: { type: "string", enum: ZONE_ENUM },
    },
    skinLaxity: {
      type: "number",
      description: "0–100: how much of the visible lower-face change is skin firmness/laxity rather than volume loss.",
    },
    jowlGrade: {
      type: "string",
      enum: ["none", "mild", "moderate", "advanced", "unclear"],
    },
    makeupDetected: { type: "boolean" },
    framingAdequate: {
      type: "boolean",
      description: "False only when the face genuinely cannot be assessed; the person will be asked to retake.",
    },
    previousWorkVisible: { type: "boolean" },
    summary: {
      type: "array",
      description:
        "What's happening to your face: 3–5 short plain-English sentences telling the structural story of this face, linking cause and effect, including at least one well-supported zone. No numbers, no judgement.",
      items: { type: "string" },
    },
    headline: { type: "string", description: "6–10 calm, warm words." },
    narrative: { type: "string", description: "2–3 short observational sentences, UK English." },
    encouragement: {
      type: "string",
      description: "One line: a GMC-registered doctor confirms suitability at a free online consultation.",
    },
  },
  required: [
    "zones",
    "zonesObscured",
    "skinLaxity",
    "jowlGrade",
    "makeupDetected",
    "framingAdequate",
    "previousWorkVisible",
    "summary",
    "headline",
    "narrative",
    "encouragement",
  ],
} as const;
