import type { Sex, ZoneKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// The image-edit instruction for the personal "See the possible difference"
// preview. Clearly visible volume/contour change (what filler does), limited
// to the client's focus zones and, when a mask is sent, to the mask area; the
// skin surface itself is never retouched. Sex-aware (never feminising for
// men). Pure; tested in test/sex-and-help.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_EDIT: Record<ZoneKey, string> = {
  temples:
    "fill the hollow temples beside the outer brows with clear volume so they sit flush with the brow bone and the hollow is gone",
  teartrough:
    "fill the tear-trough groove under each eye with clear volume so the dark hollow between the lower lid and cheek is smoothed away and the eyes look rested",
  cheeks:
    "add clear, generous volume to the front of the cheeks: a fuller, higher apple of the cheek that catches the light, with the mid-face visibly plumper and lifted",
  nasolabial:
    "fill the nasolabial folds from the sides of the nose to the mouth corners with clear volume so the folds are much shallower",
  lips:
    "make the lips noticeably fuller with a crisp, defined lip border, keeping their natural shape and proportions",
  marionette:
    "fill the marionette lines running down from the mouth corners with clear volume so the shadows there are much softer",
  chin: "add clear chin projection: a rounder, more forward, better-defined chin that balances the lower face",
  jawline:
    "sharpen and define the jawline clearly from chin to ear: a crisper, straighter jaw edge with visibly less softness under the jaw",
};

const MALE_EDIT: Partial<Record<ZoneKey, string>> = {
  cheeks:
    "restore clear lost volume at the front of the cheeks without adding roundness, keeping the cheek flat and structured",
  chin: "add clear, square chin projection for structure",
  jawline:
    "sharpen and define the jaw edge clearly from chin to ear, keeping it masculine, with visibly less softness under the jaw",
};

export function buildPreviewPrompt(zones: ZoneKey[], sex: Sex | null, masked = false): string {
  const unique = Array.from(new Set(zones)).slice(0, 3);
  const edits = unique.map((z) => (sex === "man" ? MALE_EDIT[z] : undefined) ?? ZONE_EDIT[z]);
  const guards = [
    "This simulates a doctor-led dermal filler treatment, so the change is volume and contour only.",
    "Keep the person's identity, face shape, skin texture, pores, freckles, pigmentation, lines, hair, expression, pose, lighting, background, framing and image size exactly the same.",
    masked
      ? "Edit only inside the transparent area of the mask; every pixel outside it must stay identical to the original photo."
      : "Change nothing outside the areas named.",
    "No slimming, no smoothing or retouching of the skin, no brightening, no makeup, no change to eye or nose shape.",
    unique.includes("lips") ? "" : "Do not change the lips at all.",
    sex === "man"
      ? "Keep every feature masculine: no added cheek roundness, no lip enlargement, no softening of the jaw."
      : "",
    "The difference in the named areas must be clearly visible side by side with the original, like a confident, well-judged filler result, but still realistic and never overdone.",
  ].filter(Boolean);
  return `Edit this photo: ${edits.join("; ")}. ${guards.join(" ")}`;
}
