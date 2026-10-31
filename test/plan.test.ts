import { describe, it, expect } from "vitest";
import {
  FIRMNESS_LINE,
  MAX_START_AREAS,
  buildPlan,
  formatGbp,
  historyLine,
  offerFitsPlan,
  offerLine,
  priceText,
  volumeText,
} from "@/lib/plan";
import { OFFER, PRICE_AT_CONSULTATION, ZONE_PRICING } from "@/lib/constants";
import { mapZones } from "@/lib/zones";
import { assessment } from "./fixtures";
import type { FillerHistory, Priority, ZoneKey } from "@/lib/types";

function plan(
  changes: Parameters<typeof assessment>[0],
  opts: { firmness?: boolean; history?: FillerHistory | null; priority?: Priority | null; obscured?: ZoneKey[] } = {},
) {
  return buildPlan({
    zones: mapZones(assessment(changes).zones, opts.obscured ?? []),
    firmnessDominant: opts.firmness ?? false,
    fillerHistory: opts.history ?? "no",
    priority: opts.priority ?? null,
  });
}

describe("prices", () => {
  it("uses the published from-prices and never shows £0", () => {
    expect(priceText("lips")).toBe("From £249 (1 ml)");
    expect(priceText("cheeks")).toBe("From £299 (1 ml)");
    expect(priceText("jawline")).toBe("From £399 (2 ml)");
    expect(priceText("teartrough")).toBe("From £299");
    for (const z of ["chin", "nasolabial", "marionette", "temples"] as ZoneKey[]) {
      expect(ZONE_PRICING[z].priceFrom).toBeNull();
      expect(priceText(z)).toBe(PRICE_AT_CONSULTATION);
    }
    expect(formatGbp(0)).toBe("");
    expect(formatGbp(null)).toBe("");
  });

  it("describes conservative starting volumes", () => {
    expect(volumeText(0.5, 1)).toBe("often starts with 0.5–1 ml");
    expect(volumeText(2, 2)).toBe("often starts with 2 ml");
    for (const p of Object.values(ZONE_PRICING)) {
      expect(p.mlMin).toBeGreaterThan(0);
      expect(p.mlMax).toBeLessThanOrEqual(2);
    }
  });
});

describe("plan builder", () => {
  it("plans only changed zones, never leave-alone or covered ones", () => {
    const p = plan(
      { cheeks: 65, lips: 10, chin: { change: 70, appearsFull: true }, jawline: 50 },
      { obscured: ["jawline"] },
    );
    expect(p.items.map((i) => i.zone)).toEqual(["cheeks"]);
  });

  it("puts support first and stages zones that wait on another", () => {
    const p = plan({ nasolabial: 70, cheeks: 40, marionette: 50, chin: 45, teartrough: 50 });
    const start = p.items.filter((i) => i.stage === "start").map((i) => i.zone);
    const review = p.items.filter((i) => i.stage === "review").map((i) => i.zone);
    expect(start).toEqual(["cheeks", "chin"]);
    expect(review).toEqual(["teartrough", "nasolabial", "marionette"]);
    expect(p.items.find((i) => i.zone === "nasolabial")!.why).toMatch(/cheeks are supported/);
  });

  it("starts at most three areas", () => {
    const p = plan({ cheeks: 60, temples: 60, chin: 60, jawline: 60, lips: 60 });
    expect(p.items.filter((i) => i.stage === "start")).toHaveLength(MAX_START_AREAS);
    expect(p.items.find((i) => i.zone === "lips")!.stage).toBe("review");
  });

  it("moves 'what matters most' zones forward", () => {
    const p = plan({ cheeks: 60, temples: 60, chin: 60, lips: 60 }, { priority: "subtle_definition" });
    expect(p.items.filter((i) => i.stage === "start").map((i) => i.zone)).toEqual(["chin", "lips", "cheeks"]);
  });

  it("holds jawline and marionette back when skin firmness dominates", () => {
    const p = plan({ jawline: 50, marionette: 45, cheeks: 40 }, { firmness: true });
    const jaw = p.items.find((i) => i.zone === "jawline")!;
    expect(jaw.stage).toBe("review");
    expect(jaw.why).toMatch(/Nu Sculpt/);
    expect(p.items.find((i) => i.zone === "cheeks")!.stage).toBe("start");
  });

  it("sums the starting volume over start-stage items only", () => {
    const p = plan({ cheeks: 60, temples: 40, nasolabial: 50 });
    expect(p.startMlMin).toBe(1.5);
    expect(p.startMlMax).toBe(3);
  });

  it("flags a review-first plan for unhappy previous filler or 'fix previous work'", () => {
    expect(plan({ cheeks: 60 }, { history: "yes_unhappy" }).reviewFirst).toBe(true);
    expect(plan({ cheeks: 60 }, { priority: "fix_previous" }).reviewFirst).toBe(true);
    expect(plan({ cheeks: 60 }, { history: "yes_happy" }).reviewFirst).toBe(false);
  });

  it("returns an empty plan for a well-supported face", () => {
    const p = plan({});
    expect(p.items).toEqual([]);
    expect(p.offerFits).toBe(false);
  });
});

describe("offer display", () => {
  it("is the 4 ml plan at £699, was £899, with no countdown language", () => {
    expect(OFFER).toMatchObject({ ml: 4, price: 699, was: 899, active: true });
    const line = offerLine(plan({ cheeks: 60, temples: 40 }))!;
    expect(line).toBe("Your starting plan could fit our 4 ml filler plan: £699 (usually £899).");
    expect(line).not.toMatch(/limited|hurry|ends|today|left/i);
  });

  it("fits when the start plan is 2 ml+ (or two areas) and within 4 ml", () => {
    expect(offerFitsPlan({ startMlMin: 1, startMlMax: 2, startCount: 1 })).toBe(true);
    expect(offerFitsPlan({ startMlMin: 0.5, startMlMax: 1, startCount: 1 })).toBe(false);
    expect(offerFitsPlan({ startMlMin: 1, startMlMax: 2, startCount: 2 })).toBe(true);
    expect(offerFitsPlan({ startMlMin: 4.5, startMlMax: 6, startCount: 3 })).toBe(false);
    expect(offerFitsPlan({ startMlMin: 0, startMlMax: 0, startCount: 0 })).toBe(false);
  });

  it("softens to an 'ask about' line when the offer doesn't fit, and hides with no plan", () => {
    const small = plan({ lips: 40 });
    expect(small.offerFits).toBe(false);
    expect(offerLine(small)).toMatch(/^Planning more than one area\? Ask about our 4 ml filler plan/);
    expect(offerLine(plan({}))).toBeNull();
  });
});

describe("answer lines", () => {
  it("routes unhappy previous filler to a review / dissolve conversation", () => {
    expect(historyLine("yes_unhappy", "less_tired")).toMatch(/dissolve/);
    expect(historyLine("no", "fix_previous")).toMatch(/reviewing it/);
    expect(historyLine("yes_happy", null)).toMatch(/only what's needed/);
    expect(historyLine("not_sure", null)).toMatch(/check/);
    expect(historyLine("no", "less_tired")).toBeNull();
  });

  it("names Nu Sculpt honestly in the firmness line", () => {
    expect(FIRMNESS_LINE).toMatch(/skin firmness rather than volume/);
    expect(FIRMNESS_LINE).toMatch(/Nu Sculpt/);
  });
});
