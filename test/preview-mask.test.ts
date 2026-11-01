import { describe, expect, it } from "vitest";
import { previewMaskEllipses } from "@/lib/preview-mask";
import { zoneMarkers } from "@/lib/face-regions";
import { buildPreviewPrompt } from "@/lib/prompts/preview-edit";

// A face-ish mesh: 478 points spread over the middle of the frame.
const lm = Array.from({ length: 478 }, (_, i) => ({
  x: 0.3 + ((i * 37) % 100) / 250,
  y: 0.25 + ((i * 53) % 100) / 200,
  z: 0,
}));

describe("previewMaskEllipses", () => {
  it("covers only the requested zones, grown beyond their markers", () => {
    const cheeks = zoneMarkers("cheeks", lm);
    const mask = previewMaskEllipses(["cheeks"], lm);
    expect(mask).toHaveLength(cheeks.length);
    mask.forEach((e, i) => {
      expect(e.cx).toBe(cheeks[i].cx);
      expect(e.rx).toBeGreaterThan(cheeks[i].rx);
      expect(e.ry).toBeGreaterThan(cheeks[i].ry);
    });
  });

  it("returns nothing for no zones", () => {
    expect(previewMaskEllipses([], lm)).toEqual([]);
  });
});

describe("preview prompt strength", () => {
  it("asks for an obvious, concrete filler change and protects the skin surface", () => {
    const p = buildPreviewPrompt(["jawline", "cheeks"], "woman");
    expect(p).toMatch(/2 ml of filler along each side of the jawline/);
    expect(p).toMatch(/2 ml of filler to the front of each cheek/);
    expect(p).toMatch(/immediately notice/);
    expect(p).toMatch(/pigmentation/);
    expect(p).toMatch(/Change nothing outside the areas named/);
  });

  it("defaults to the calibrated strong after-photo framing", () => {
    const p = buildPreviewPrompt(["lips"], "woman");
    expect(p).toMatch(/^You are producing the AFTER photo/);
    expect(p).toMatch(/a third stronger than a typical treatment/);
    expect(p).toMatch(/defined cupid's bow/);
    expect(buildPreviewPrompt(["lips"], "woman", "plain")).toMatch(/^Edit this photo/);
    expect(buildPreviewPrompt(["lips"], "woman", "plain")).not.toMatch(/a third stronger/);
  });
});
