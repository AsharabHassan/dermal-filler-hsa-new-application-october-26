import type { AnalyzeResult } from "./types";
import { ZONES, joinNames } from "./zones";

/**
 * The one-line finding the NextStepCard (and PDF) leads with: where the most
 * change is, and what we'd leave alone. Pure; tested in test/zones.test.ts.
 */
export function findingLine(r: Pick<AnalyzeResult, "focusZones" | "leaveAloneZones" | "firmnessDominant">): string {
  if (r.firmnessDominant) {
    return "Your main change is skin firmness rather than volume. Let's talk about the right approach.";
  }
  const focus = r.focusZones.slice(0, 2).map((z) => ZONES[z].name);
  const alone = r.leaveAloneZones
    .filter((z) => z === "lips" || z === "chin")
    .map((z) => ZONES[z].name);
  if (focus.length === 0) {
    return "Your face looks well supported. We'd leave it as it is.";
  }
  const tail = alone.length > 0 ? ` Your ${joinNames(alone)} we'd leave alone.` : "";
  return `Your scan found the most change in your ${joinNames(focus)}.${tail}`;
}
