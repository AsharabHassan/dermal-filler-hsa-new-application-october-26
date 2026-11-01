import type { Sex, ZoneKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// The image-edit instruction for the personal "See the possible difference"
// preview. Visible but natural (never overdone), limited to the client's focus zones, and
// sex-aware (never feminising for men). Pure; tested in test/preview.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_EDIT: Record<ZoneKey, string> = {
  temples: "visibly soften the hollow at the temples beside the outer brows",
  teartrough: "clearly soften the shadowed groove between the lower eyelids and the cheeks, so the eyes look more rested",
  cheeks: "restore noticeable mid-face volume at the front of the cheeks, lifting where light falls on the upper cheek",
  nasolabial: "visibly soften the folds running from the sides of the nose to the mouth corners",
  lips: "restore some lip volume and a clearer lip border, keeping the natural lip shape and proportions",
  marionette: "visibly soften the shadows running down from the mouth corners",
  chin: "add modest chin projection for better balance with the lower face",
  jawline: "visibly sharpen and define the jaw edge from chin to ear",
};

const MALE_EDIT: Partial<Record<ZoneKey, string>> = {
  cheeks: "restore noticeable lost volume at the front of the cheeks without adding roundness",
  chin: "add modest, square chin projection for structure",
  jawline: "clearly sharpen and define the jaw edge from chin to ear, keeping it masculine",
};

export function buildPreviewPrompt(zones: ZoneKey[], sex: Sex | null): string {
  const unique = Array.from(new Set(zones)).slice(0, 3);
  const edits = unique.map((z) => (sex === "man" ? MALE_EDIT[z] : undefined) ?? ZONE_EDIT[z]);
  const guards = [
    "Keep the person's identity, face shape, skin texture, pores, freckles, hair, expression, pose, lighting, background, framing and image size exactly the same.",
    "Change nothing outside the areas named. No slimming, no smoothing or retouching of the skin, no makeup, no change to eye or nose shape.",
    unique.includes("lips") ? "" : "Do not change the lips at all.",
    sex === "man"
      ? "Keep every feature masculine: no added cheek roundness, no lip enlargement, no softening of the jaw."
      : "",
    "The result must look like the same photo taken on a good day: a clear but natural, realistic improvement in the named areas, like a well-judged doctor-led dermal filler treatment. The difference should be easy to see side by side, never overdone.",
  ].filter(Boolean);
  return `Edit this photo: ${edits.join("; ")}. ${guards.join(" ")}`;
}
