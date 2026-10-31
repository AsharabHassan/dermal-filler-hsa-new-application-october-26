import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { FORBIDDEN_PATTERNS, PHONE_RE, violations } from "@/lib/copy-guard";
import { leaveAloneLines, mapZones, ZONES } from "@/lib/zones";
import { FIRMNESS_LINE, historyLine } from "@/lib/plan";
import { CALLBACK_PROMISE } from "@/lib/consultation-consent";
import { DISCLAIMER, TREATMENT_NOTE, TRUST_MARKERS, CLINIC } from "@/lib/constants";

const ROOT = join(__dirname, "..");
// Every source file that can put words in front of a client. The Claude system
// prompt is excluded (it must name the banned words to ban them) as is the
// guard itself.
const SCAN_DIRS = ["app", "components", "lib"];
const EXCLUDE = [/lib[\\/]prompts[\\/]/, /lib[\\/]copy-guard\.ts$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** String literals and JSX text only — comments are not client-facing. */
function userFacingText(src: string): string {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const strings = noComments.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
  const jsxText = noComments.match(/>[^<>{}]*</g) ?? [];
  // Tailwind / CSS tokens such as "transition-transform" are not copy.
  return [...strings, ...jsxText].join("\n").replace(/\b[\w:-]*-transform\b|\btransform-[\w-]+|\btransform:/g, "");
}

describe("copy rules — no forbidden words in user-facing copy", () => {
  const sources = SCAN_DIRS.flatMap((d) => files(join(ROOT, d))).filter(
    (f) => !EXCLUDE.some((re) => re.test(f)),
  );

  it("scans a meaningful number of files", () => {
    expect(sources.length).toBeGreaterThan(40);
  });

  for (const file of sources) {
    it(`${relative(ROOT, file)} is clean`, () => {
      const text = userFacingText(readFileSync(file, "utf8"));
      const hits = FORBIDDEN_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
      expect(hits).toEqual([]);
    });
  }

  it("generated copy is clean too", () => {
    const generated = [
      ...leaveAloneLines(mapZones({ lips: { change: 5, appearsFull: true, note: "" } })),
      ...Object.values(ZONES).flatMap((z) => [z.label, z.looksLike, z.cause, z.support]),
      FIRMNESS_LINE,
      historyLine("yes_unhappy", null)!,
      historyLine("yes_happy", null)!,
      historyLine("not_sure", null)!,
      DISCLAIMER,
      TREATMENT_NOTE,
      ...TRUST_MARKERS,
    ];
    for (const line of generated) expect(violations(line)).toEqual([]);
  });

  it("the guard itself catches the banned words", () => {
    for (const bad of [
      "a perfect result",
      "Flawless skin",
      "it's painless",
      "no risk at all",
      "transform your face",
      "Botox",
      "anti-wrinkle injections",
      "Juvéderm",
      "Sosum",
      "10 Harley Street",
      "your beauty score",
      "limited time only",
    ]) {
      expect(violations(bad).length).toBeGreaterThan(0);
    }
  });
});

describe("compliance details", () => {
  it("uses the small-print disclaimer verbatim", () => {
    expect(DISCLAIMER).toBe("Not a diagnosis. Suitability confirmed at your consultation. Results vary.");
  });

  it("uses the Portpool Lane London address", () => {
    expect(CLINIC.locations[0].lines.join(", ")).toBe("1-5 Portpool Lane, London EC1N 7UU");
    expect(CLINIC.locations[1].lines.join(" ")).toMatch(/Ingram House/);
  });

  it("call-back copy promises 'within minutes' and never shows a phone number", () => {
    expect(CALLBACK_PROMISE).toBe("within minutes");
    for (const f of [
      "components/result/NextStepCard.tsx",
      "components/compliance/ConsultationRequest.tsx",
      "components/result/BookingCalendar.tsx",
      "components/result/PlanPreview.tsx",
      "lib/consultation-consent.ts",
    ]) {
      const text = userFacingText(readFileSync(join(ROOT, f), "utf8"));
      expect(PHONE_RE.test(text), f).toBe(false);
      expect(text, f).not.toMatch(/phoneHref|clinic\.phone/);
    }
  });

  it("says only GMC-registered doctors inject and the consultation is free and online", () => {
    const hero = readFileSync(join(ROOT, "components/screens/HeroScreen.tsx"), "utf8");
    expect(hero).toMatch(/GMC-registered doctors inject/);
    expect(hero).toMatch(/free online/);
  });
});
