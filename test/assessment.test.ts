import { describe, it, expect } from "vitest";
import { parseAssessment, answersNote, type RawAssessment } from "@/lib/anthropic";
import { buildResult, enforceCopyRules, SAFE_NARRATIVE } from "@/lib/assessment";
import { ZONE_ORDER } from "@/lib/zones";
import { assessment } from "./fixtures";

const raw: RawAssessment = {
  zones: [
    { zone: "cheeks", change: 66.4, appearsFull: false, note: "Some flattening high on the cheek" },
    { zone: "nasolabial", change: 44, appearsFull: false, note: "Soft lines beside the mouth" },
    { zone: "lips", change: 12, appearsFull: false, note: "Balanced with the rest of your face" },
    { zone: "forehead", change: 90, appearsFull: false, note: "not a zone" },
    { zone: "chin", change: 300, appearsFull: true, note: "Already full" },
  ],
  zonesObscured: ["temples", "nonsense"],
  skinLaxity: 35,
  jowlGrade: "mild",
  makeupDetected: false,
  framingAdequate: true,
  previousWorkVisible: true,
  headline: "Well supported, with two areas to discuss",
  narrative: "Your lips look balanced. Your cheeks show some flattening.",
  encouragement: "A GMC-registered doctor confirms what suits you.",
};

describe("parseAssessment", () => {
  it("fills all eight zones, clamps values and drops unknown zones", () => {
    const a = parseAssessment(raw);
    expect(Object.keys(a.zones).sort()).toEqual([...ZONE_ORDER].sort());
    expect(a.zones.cheeks.change).toBe(66);
    expect(a.zones.chin).toMatchObject({ change: 100, appearsFull: true });
    expect(a.zones.jawline.change).toBe(0);
    expect(a.zonesObscured).toEqual(["temples"]);
    expect(a.jowlGrade).toBe("mild");
    expect(a.previousWorkVisible).toBe(true);
  });

  it("rejects malformed output and unknown jowl grades degrade to unclear", () => {
    expect(() => parseAssessment({ ...raw, zones: [] })).toThrow();
    expect(() => parseAssessment({ ...raw, headline: undefined as unknown as string })).toThrow();
    expect(parseAssessment({ ...raw, jowlGrade: "huge" }).jowlGrade).toBe("unclear");
  });
});

describe("buildResult", () => {
  it("produces the 8-zone map, leave-alone list, causes and plan", () => {
    const r = buildResult(parseAssessment(raw), { fillerHistory: "yes_happy", priority: "less_tired", skinScanUsed: true });
    expect(r.zones).toHaveLength(8);
    expect(r.focusZones).toEqual(["cheeks", "nasolabial"]);
    expect(r.leaveAloneZones).toEqual(expect.arrayContaining(["lips", "chin"]));
    expect(r.leaveAloneZones).not.toContain("temples"); // covered → checked at consultation
    expect(r.causeNotes[0]).toMatch(/lost cheek support/);
    expect(r.plan.items.map((i) => [i.zone, i.stage])).toEqual([
      ["cheeks", "start"],
      ["nasolabial", "review"],
    ]);
    expect(r.skinScanUsed).toBe(true);
    expect(r.fillerHistory).toBe("yes_happy");
    expect(r).not.toHaveProperty("score");
  });

  it("swaps out any Claude copy that breaks the rules", () => {
    const bad = assessment({}, {
      narrative: { headline: "A perfect, flawless you", narrative: "Fine.", encouragement: "Ask about Botox too." },
    });
    bad.zones.lips.note = "Lips could look more attractive";
    const r = buildResult(bad, { fillerHistory: null, priority: null, skinScanUsed: true });
    expect(r.narrative.headline).toBe(SAFE_NARRATIVE.headline);
    expect(r.narrative.encouragement).toBe(SAFE_NARRATIVE.encouragement);
    expect(r.narrative.narrative).toBe("Fine.");
    expect(r.narrativeSource).toBe("fallback");
    expect(r.zones.find((z) => z.key === "lips")!.note).toBe("");
    expect(enforceCopyRules({ headline: "Calm", narrative: "Calm", encouragement: "Calm" }).clean).toBe(true);
  });
});

describe("answersNote", () => {
  it("passes both pre-scan answers to Claude", () => {
    expect(answersNote("yes_unhappy", "fix_previous")).toBe(
      "The person's answers — Had filler before? Yes, and unhappy with it. What matters most? Fix previous work.",
    );
    expect(answersNote(null, null)).toMatch(/not answered/);
  });
});
