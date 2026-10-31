import { describe, it, expect } from "vitest";
import {
  NOTICEABLE_AT,
  SOME_CHANGE_AT,
  STATUS_LABEL,
  ZONE_ORDER,
  causeNotes,
  deriveZones,
  focusZones,
  isFirmnessDominant,
  joinNames,
  leaveAloneLines,
  mapOrder,
  mapZones,
  zoneStatus,
} from "@/lib/zones";
import { findingLine } from "@/lib/finding";
import { assessment } from "./fixtures";

describe("zone mapping", () => {
  it("maps change to the three client-facing states at the agreed thresholds", () => {
    expect(zoneStatus(0)).toBe("well_supported");
    expect(zoneStatus(SOME_CHANGE_AT - 1)).toBe("well_supported");
    expect(zoneStatus(SOME_CHANGE_AT)).toBe("some_change");
    expect(zoneStatus(NOTICEABLE_AT - 1)).toBe("some_change");
    expect(zoneStatus(NOTICEABLE_AT)).toBe("noticeable_change");
    expect(zoneStatus(150)).toBe("noticeable_change");
    expect(zoneStatus(Number.NaN)).toBe("well_supported");
    expect(Object.values(STATUS_LABEL)).toEqual(["Well supported", "Some change", "Noticeable change"]);
  });

  it("always returns all eight zones in face order", () => {
    const mapped = mapZones({});
    expect(mapped.map((z) => z.key)).toEqual(ZONE_ORDER);
    expect(ZONE_ORDER).toEqual([
      "temples",
      "teartrough",
      "cheeks",
      "nasolabial",
      "lips",
      "marionette",
      "chin",
      "jawline",
    ]);
    expect(mapped.every((z) => z.status === "well_supported")).toBe(true);
  });

  it("a zone that already looks full is well supported and left alone, whatever was scored", () => {
    const lips = mapZones({ lips: { change: 80, appearsFull: true, note: "" } }).find((z) => z.key === "lips")!;
    expect(lips.status).toBe("well_supported");
    expect(lips.leaveAlone).toBe(true);
  });

  it("an obscured zone is never left alone and never a focus", () => {
    const mapped = mapZones({ chin: { change: 70, appearsFull: false, note: "" } }, ["chin", "temples"]);
    const chin = mapped.find((z) => z.key === "chin")!;
    const temples = mapped.find((z) => z.key === "temples")!;
    expect(chin.obscured).toBe(true);
    expect(chin.leaveAlone).toBe(false);
    expect(temples.leaveAlone).toBe(false);
    expect(focusZones(mapped)).not.toContain("chin");
  });

  it("orders focus zones and the face map most-affected first, covered last", () => {
    const mapped = mapZones(assessment({ cheeks: 50, jawline: 72, temples: 35 }).zones, ["lips"]);
    expect(focusZones(mapped)).toEqual(["jawline", "cheeks", "temples"]);
    const order = mapOrder(mapped).map((z) => z.key);
    expect(order.slice(0, 3)).toEqual(["jawline", "cheeks", "temples"]);
    expect(order[order.length - 1]).toBe("lips");
  });
});

describe("leave-alone logic", () => {
  it("says lips and chin are in proportion when they are well supported", () => {
    const lines = leaveAloneLines(
      mapZones(assessment({ cheeks: 65, nasolabial: 40, temples: 40, teartrough: 40, marionette: 40, jawline: 40 }).zones),
    );
    expect(lines).toEqual(["Your lips and chin are already in proportion — we wouldn't add volume here."]);
  });

  it("handles a single proportion zone with correct grammar", () => {
    const lines = leaveAloneLines(
      mapZones(assessment({ lips: 50, cheeks: 50, nasolabial: 50, temples: 50, teartrough: 50, marionette: 50, jawline: 50 }).zones),
    );
    expect(lines).toEqual(["Your chin is already in proportion — we wouldn't add volume here."]);
  });

  it("names other well-supported zones and full zones separately", () => {
    const lines = leaveAloneLines(
      mapZones(
        assessment({ lips: { change: 10, appearsFull: true }, chin: 50, cheeks: 50, nasolabial: 50, teartrough: 50, marionette: 50 }).zones,
      ),
    );
    expect(lines).toContain("Your temples and jawline look well supported — we'd leave them as they are.");
    expect(lines.some((l) => l.startsWith("Your lips already look full — we wouldn't add more here."))).toBe(true);
  });

  it("joins names naturally", () => {
    expect(joinNames(["a"])).toBe("a");
    expect(joinNames(["a", "b"])).toBe("a and b");
    expect(joinNames(["a", "b", "c"])).toBe("a, b and c");
  });
});

describe("cause notes", () => {
  it("explains nasolabial lines through lost cheek support", () => {
    const notes = causeNotes(mapZones(assessment({ cheeks: 55, nasolabial: 45 }).zones));
    expect(notes[0]).toBe(
      "Lines beside your mouth often come from lost cheek support above. Treating the cheek first can soften them more naturally.",
    );
  });

  it("links tear trough to cheeks and marionette to chin / jaw, at most three", () => {
    const notes = causeNotes(
      mapZones(assessment({ cheeks: 55, nasolabial: 45, teartrough: 45, marionette: 50, jawline: 40, temples: 40 }).zones),
    );
    expect(notes).toHaveLength(3);
    expect(notes.join(" ")).toMatch(/under-eye hollows/i);
    expect(notes.join(" ")).toMatch(/corners of your mouth/i);
  });

  it("gives no cheek explanation when the cheeks are well supported", () => {
    expect(causeNotes(mapZones(assessment({ nasolabial: 45 }).zones))).toEqual([]);
  });
});

describe("firmness (honest non-filler line)", () => {
  it("fires when laxity clearly exceeds every volume change", () => {
    const mapped = mapZones(assessment({ jawline: 40 }).zones);
    expect(isFirmnessDominant({ skinLaxity: 70, jowlGrade: "moderate", mapped })).toBe(true);
    expect(isFirmnessDominant({ skinLaxity: 45, jowlGrade: "moderate", mapped })).toBe(false);
  });

  it("does not fire when volume change is as large as the laxity", () => {
    const mapped = mapZones(assessment({ cheeks: 68 }).zones);
    expect(isFirmnessDominant({ skinLaxity: 70, jowlGrade: "mild", mapped })).toBe(false);
  });

  it("fires for advanced jowls with moderate laxity above the volume change", () => {
    const mapped = mapZones(assessment({ jawline: 40 }).zones);
    expect(isFirmnessDominant({ skinLaxity: 48, jowlGrade: "advanced", mapped })).toBe(true);
  });

  it("is carried through deriveZones", () => {
    expect(
      deriveZones(assessment({ jawline: 30 }, { skinLaxity: 80, jowlGrade: "advanced" })).firmnessDominant,
    ).toBe(true);
  });
});

describe("finding line", () => {
  it("leads with the most-changed zones and what we'd leave alone", () => {
    const d = deriveZones(assessment({ cheeks: 68, temples: 40 }));
    expect(findingLine(d)).toBe(
      "Your scan found the most change in your cheeks and temples. Your lips and chin we'd leave alone.",
    );
  });

  it("is honest when nothing needs adding, or when firmness dominates", () => {
    expect(findingLine({ focusZones: [], leaveAloneZones: ["lips"], firmnessDominant: false })).toMatch(/well supported/);
    expect(findingLine({ focusZones: ["jawline"], leaveAloneZones: [], firmnessDominant: true })).toMatch(/skin firmness/);
  });
});
