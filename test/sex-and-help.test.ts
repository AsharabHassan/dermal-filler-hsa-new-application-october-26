import { describe, expect, it } from "vitest";
import { buildPlan, maleHoldBack, zoneHelp } from "@/lib/plan";
import { mapZones } from "@/lib/zones";
import { buildPreviewPrompt } from "@/lib/prompts/preview-edit";
import { SEX_OPTIONS } from "@/lib/questions";
import { SYSTEM_FILLERS } from "@/lib/prompts/system-fillers";
import { assessment } from "./fixtures";
import type { Sex } from "@/lib/types";

function plan(changes: Parameters<typeof assessment>[0], sex: Sex | null, firmness = false) {
  const zones = mapZones(assessment(changes).zones);
  return { zones, plan: buildPlan({ zones, firmnessDominant: firmness, fillerHistory: "no", priority: null, sex }) };
}

describe("sex question", () => {
  it("offers Woman / Man / Prefer not to say", () => {
    expect(SEX_OPTIONS.map((o) => o.label)).toEqual(["Woman", "Man", "Prefer not to say"]);
  });

  it("tells Claude never to infer sex from the photo and never to feminise for men", () => {
    expect(SYSTEM_FILLERS).toMatch(/never infer it from the photo/);
    expect(SYSTEM_FILLERS).toMatch(/never suggest anything that would feminise the face/);
  });
});

describe("sex-aware plan", () => {
  it("for men, holds back lips and cheeks unless the change is clearly noticeable", () => {
    const man = plan({ lips: 45, cheeks: 50, jawline: 50 }, "man");
    expect(man.plan.items.map((i) => i.zone)).toEqual(["jawline"]);
    const woman = plan({ lips: 45, cheeks: 50, jawline: 50 }, "woman");
    expect(woman.plan.items.map((i) => i.zone).sort()).toEqual(["cheeks", "jawline", "lips"]);
    const lost = plan({ lips: 70 }, "man");
    expect(lost.plan.items.map((i) => i.zone)).toEqual(["lips"]);
  });

  it("for men, puts jaw / chin / temples / tear troughs first", () => {
    const { plan: p } = plan({ cheeks: 65, temples: 50, chin: 50, jawline: 50 }, "man");
    expect(p.items.filter((i) => i.stage === "start").map((i) => i.zone)).toEqual(["temples", "chin", "jawline"]);
  });

  it("prefer-not-to-say is neutral (same as no answer)", () => {
    const a = plan({ lips: 45, cheeks: 50 }, "prefer_not").plan.items.map((i) => i.zone);
    const b = plan({ lips: 45, cheeks: 50 }, null).plan.items.map((i) => i.zone);
    expect(a).toEqual(b);
  });
});

describe("zoneHelp — 'What could help' never contradicts the map", () => {
  it("leave-alone, filler, staged filler, firmness, held back and covered", () => {
    const { zones, plan: p } = plan({ cheeks: 65, nasolabial: 45, jawline: { change: 50, cause: "firmness" } }, "woman");
    const get = (k: string) => zones.find((z) => z.key === k)!;
    expect(zoneHelp(get("lips"), { plan: p }).kind).toBe("leave_alone");
    const cheeks = zoneHelp(get("cheeks"), { plan: p });
    expect(cheeks.kind).toBe("filler");
    expect(cheeks.detail).toBe("Often starts with 1–2 ml · From £299 (1 ml)");
    expect(zoneHelp(get("nasolabial"), { plan: p }).kind).toBe("filler_later");
    expect(zoneHelp(get("jawline"), { plan: p }).kind).toBe("firmness");
    expect(zoneHelp(get("jawline"), { plan: p }).title).toMatch(/Nu Sculpt/);

    const man = plan({ lips: 45 }, "man");
    const lips = man.zones.find((z) => z.key === "lips")!;
    expect(maleHoldBack(lips, "man")).toBe(true);
    expect(zoneHelp(lips, { plan: man.plan, sex: "man" }).kind).toBe("leave_alone");

    const covered = mapZones(assessment({ chin: 60 }).zones, ["chin"]).find((z) => z.key === "chin")!;
    expect(zoneHelp(covered, { plan: p }).kind).toBe("consultation");
  });

  it("a well-supported zone always has cause 'none' and no benefit line", () => {
    const z = mapZones(assessment({ lips: { change: 10, cause: "volume", benefit: "A little more volume" } }).zones).find(
      (x) => x.key === "lips",
    )!;
    expect(z.cause).toBe("none");
    expect(z.benefit).toBe("");
  });
});

describe("personal preview prompt", () => {
  it("is subtle, limited to the focus zones and never touches lips unless asked", () => {
    const p = buildPreviewPrompt(["cheeks", "temples"], "woman");
    expect(p).toMatch(/very subtly/);
    expect(p).toMatch(/front of the cheeks/);
    expect(p).toMatch(/Do not change the lips at all/);
    expect(p).toMatch(/No slimming/);
    expect(p).toMatch(/identity/);
  });

  it("is masculine for men and caps at three zones", () => {
    const p = buildPreviewPrompt(["jawline", "chin", "cheeks", "temples"], "man");
    expect(p).toMatch(/keeping it masculine/);
    expect(p).toMatch(/no lip enlargement/);
    expect(p).not.toMatch(/temples/);
  });
});
