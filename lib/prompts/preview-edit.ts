import type { Sex, ZoneKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// The image-edit instruction for the personal "See the possible difference"
// preview. SUBTLE and conservative, limited to the client's focus zones, and
// sex-aware (never feminising for men). Pure; tested in test/preview.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_EDIT: Record<ZoneKey, string> = {
  temples: "gently soften the hollow at the temples beside the outer brows",
  teartrough: "gently soften the shadowed groove between the lower eyelids and the cheeks",
  cheeks: "gently restore a little mid-face volume at the front of the cheeks",
  nasolabial: "very slightly soften the lines running from the sides of the nose to the mouth corners",
  lips: "very slightly restore lip volume and border definition, keeping the natural lip shape",
  marionette: "very slightly soften the shadows running down from the mouth corners",
  chin: "add very slight chin projection for balance",
  jawline: "very slightly sharpen the jaw edge from chin to ear",
};

const MALE_EDIT: Partial<Record<ZoneKey, string>> = {
  cheeks: "very slightly restore lost volume at the front of the cheeks without adding roundness",
  chin: "add very slight, square chin projection for structure",
  jawline: "very slightly sharpen and define the jaw edge from chin to ear, keeping it masculine",
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
    "The result must look like the same photo taken on a good day: subtle, natural and realistic, as after a conservative, doctor-led dermal filler treatment.",
  ].filter(Boolean);
  return `Edit this photo very subtly: ${edits.join("; ")}. ${guards.join(" ")}`;
}
