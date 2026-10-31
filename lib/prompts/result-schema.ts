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
        "Exactly eight items, one per zone. change = 0–100 visible loss of volume/structure (0–25 well supported, 30–59 some change, 60+ noticeable). appearsFull = already full / previous filler. note = one short cosmetic observation to the person.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          zone: { type: "string", enum: ZONE_ENUM },
          change: { type: "number" },
          appearsFull: { type: "boolean" },
          note: { type: "string" },
        },
        required: ["zone", "change", "appearsFull", "note"],
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
    "headline",
    "narrative",
    "encouragement",
  ],
} as const;
