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

describe("masked preview prompt", () => {
  it("confines the edit to the mask and asks for a clearly visible filler change", () => {
    const p = buildPreviewPrompt(["jawline", "cheeks"], "woman", true);
    expect(p).toMatch(/transparent area of the mask/);
    expect(p).toMatch(/clearly visible side by side/);
    expect(p).toMatch(/volume and contour only/);
    expect(p).toMatch(/pigmentation/);
    expect(p).not.toMatch(/Change nothing outside the areas named/);
  });
});
