import { describe, expect, it } from "vitest";
import {
  buildMeasurements,
  firmnessReading,
  MEASUREMENTS_NOTE,
  ratioText,
  textureReading,
} from "@/lib/measurements";
import { violations } from "@/lib/copy-guard";
import { SIGNALS } from "./signals-fixture";

describe("measurement formatting", () => {
  it("formats the upper:lower lip ratio as 1 : x", () => {
    expect(ratioText(0.667)).toBe("1 : 1.5");
    expect(ratioText(0.625)).toBe("1 : 1.6");
  });

  it("reads firmness and texture as plain levels, not numbers", () => {
    expect(firmnessReading(0.15)).toBe("minimal");
    expect(firmnessReading(0.34)).toBe("mild");
    expect(firmnessReading(0.6)).toBe("moderate");
    expect(firmnessReading(0.9)).toBe("higher");
    expect(textureReading(4.2)).toBe("smooth");
    expect(textureReading(8)).toBe("some texture");
    expect(textureReading(14)).toBe("more visible texture");
  });

  it("builds the plain-language block from real SkinScan signals", () => {
    const m = buildMeasurements(SIGNALS);
    const by = Object.fromEntries(m.map((x) => [x.key, x]));
    expect(by.lip_ratio).toMatchObject({
      label: "Upper to lower lip ratio",
      value: "1 : 1.5",
      detail: "balanced range ≈ 1 : 1.6",
      source: "geometry",
    });
    expect(by.lower_face.value).toBe("1 : 1.9");
    expect(by.hint_cheeks).toMatchObject({ label: "Mid-face shadow", value: "moderate" });
    expect(by.undereye_type.value).toBe("shadow from volume (structural)");
    expect(by.firmness).toMatchObject({ label: "Lower-face firmness reading", value: "mild" });
    expect(by.texture).toMatchObject({ label: "Skin texture reading", value: "some texture" });
    expect(by.sun.value).toBe("low");
  });

  it("maps uncalibrated 'high' hints to 'higher', never a precise claim", () => {
    const m = buildMeasurements({ ...SIGNALS, zone_hints: { teartrough: "high" } });
    expect(m.find((x) => x.key === "hint_teartrough")).toMatchObject({ label: "Shadow under the eyes", value: "higher" });
  });

  it("drops readings for zones that were out of frame", () => {
    const m = buildMeasurements({ ...SIGNALS, zones_not_visible: ["lips", "chin", "cheeks"] });
    const keys = m.map((x) => x.key);
    expect(keys).not.toContain("lip_ratio");
    expect(keys).not.toContain("lower_face");
    expect(keys).not.toContain("hint_cheeks");
  });

  it("never reads as a score of the person and passes the copy guard", () => {
    const m = buildMeasurements(SIGNALS);
    for (const x of m) {
      const text = `${x.label} ${x.value} ${x.detail ?? ""}`;
      expect(violations(text)).toEqual([]);
      expect(text).not.toMatch(/score|\/100|%/i);
    }
    expect(MEASUREMENTS_NOTE).toMatch(/HSA SkinScan/);
    expect(MEASUREMENTS_NOTE).toMatch(/not scores of you/);
  });
});
