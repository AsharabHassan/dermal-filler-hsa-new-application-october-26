import { describe, expect, it } from "vitest";
import { blendBroadChange, previewMaskEllipses } from "@/lib/preview-mask";
import { zoneMarkers } from "@/lib/face-regions";

// A face-ish mesh: 478 points spread over the middle of the frame.
const lm = Array.from({ length: 478 }, (_, i) => ({
  x: 0.3 + ((i * 37) % 100) / 250,
  y: 0.25 + ((i * 53) % 100) / 200,
  z: 0,
}));

describe("previewMaskEllipses", () => {
  it("only covers the requested zones, grown beyond their markers", () => {
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

describe("blendBroadChange", () => {
  const original = new Uint8ClampedArray([100, 110, 120, 255, 100, 110, 120, 255]);
  const lowOriginal = new Uint8ClampedArray([100, 100, 100, 255, 100, 100, 100, 255]);
  const lowEdit = new Uint8ClampedArray([120, 90, 100, 255, 120, 90, 100, 255]);

  it("keeps the original pixel where the mask is empty", () => {
    const out = blendBroadChange(original, lowOriginal, lowEdit, new Uint8ClampedArray([0, 0]));
    expect(Array.from(out)).toEqual(Array.from(original));
  });

  it("adds only the broad change, keeping the original's fine detail", () => {
    const out = blendBroadChange(original, lowOriginal, lowEdit, new Uint8ClampedArray([255, 0]));
    expect(Array.from(out.slice(0, 4))).toEqual([120, 100, 120, 255]);
    expect(Array.from(out.slice(4))).toEqual([100, 110, 120, 255]);
  });
});
