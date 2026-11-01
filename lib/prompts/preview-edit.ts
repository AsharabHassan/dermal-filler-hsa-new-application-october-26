import type { Sex, ZoneKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// The image-edit instruction for the personal "See the possible difference"
// preview. The image model (gpt-image-2.5) keeps faces conservative, so the
// instruction is deliberately explicit: a concrete filler volume per zone and
// an obvious side-by-side difference. Skin surface is never retouched; the
// client keeps the AI pixels only inside the focus zones anyway
// (lib/ai-preview.ts). Sex-aware (never feminising for men). Pure; tested in
// test/sex-and-help.test.ts and test/preview-mask.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_EDIT: Record<ZoneKey, string> = {
  temples:
    "add 1 ml of filler to each temple so the hollows beside the outer brows are obviously filled, sitting flush with the brow bone, and the outer brow lifts slightly",
  teartrough:
    "add 1 ml of filler to each tear trough so the dark groove under the eyes is obviously filled and smooth, the lower lid blending straight into the cheek, and the eyes look clearly rested",
  cheeks:
    "add 2 ml of filler to the front of each cheek so the apple of the cheek is obviously fuller, rounder and lifted with a clear new highlight, and the whole mid-face looks visibly plumper",
  nasolabial:
    "add 1 ml of filler to each nasolabial fold so the lines from the nose to the mouth corners are obviously shallower and softer",
  lips: "add 1 ml of filler to the lips so they are obviously fuller with a crisp, defined border, keeping their natural shape and proportions",
  marionette:
    "add 1 ml of filler to each marionette line so the shadows running down from the mouth corners are obviously softened and the mouth corners lift slightly",
  chin: "add 2 ml of filler to the chin so it projects obviously further forward, rounder and better defined, balancing the lower face",
  jawline:
    "add 2 ml of filler along each side of the jawline so the jaw edge from chin to ear is obviously sharper, straighter and more defined, with clearly less softness under the jaw",
};

const MALE_EDIT: Partial<Record<ZoneKey, string>> = {
  cheeks:
    "add 2 ml of filler to the front of each cheek so the lost volume is obviously restored without adding roundness, keeping the cheek flat and structured",
  chin: "add 2 ml of filler to the chin so it projects obviously further forward, square and structured",
  jawline:
    "add 2 ml of filler along each side of the jawline so the jaw edge from chin to ear is obviously sharper and more defined, keeping it masculine, with clearly less softness under the jaw",
};

export function buildPreviewPrompt(zones: ZoneKey[], sex: Sex | null): string {
  const unique = Array.from(new Set(zones)).slice(0, 3);
  const edits = unique.map((z) => (sex === "man" ? MALE_EDIT[z] : undefined) ?? ZONE_EDIT[z]);
  const guards = [
    "This shows the result of a doctor-led dermal filler treatment, so the only change is volume and contour in the named areas.",
    "A viewer comparing this with the original side by side must immediately notice the fuller or sharper areas, so make the change obvious, like a strong but well-judged filler result: realistic, never overdone or cartoonish.",
    "Keep the person's identity, face shape elsewhere, skin texture, pores, freckles, pigmentation, lines, hair, expression, pose, lighting, background, framing and image size exactly the same.",
    "Change nothing outside the areas named.",
    "No slimming, no smoothing or retouching of the skin, no brightening, no makeup, no change to eye or nose shape.",
    unique.includes("lips") ? "" : "Do not change the lips at all.",
    sex === "man"
      ? "Keep every feature masculine: no added cheek roundness, no lip enlargement, no softening of the jaw."
      : "",
  ].filter(Boolean);
  return `Edit this photo: ${edits.join("; ")}. ${guards.join(" ")}`;
}
