import type {
  AnalyzeResult,
  ClaudeNarrative,
  FillerHistory,
  MappedZone,
  Measurement,
  PhotoAssessment,
  Priority,
  Sex,
} from "./types";
import { deriveZones } from "./zones";
import { buildPlan } from "./plan";
import { violations } from "./copy-guard";

// ─────────────────────────────────────────────────────────────────────────────
// Maps Claude's assessment into the full result (zone mapping, leave-alone,
// cause notes, firmness check, plan preview) and enforces the copy rules on
// Claude's text. There is deliberately NO generic fallback report: HSA SkinScan
// is required, so any analysis failure becomes a "please try again" state.
// ─────────────────────────────────────────────────────────────────────────────

/** Why a scan could not be completed (no report is produced). */
export type ScanFailure = "scan_unavailable" | "no_face" | "analysis_failed";

export type AnalyzeResponse =
  | { ok: true; result: AnalyzeResult }
  | { ok: false; error: ScanFailure };

export const SAFE_NARRATIVE: ClaudeNarrative = {
  headline: "Your Volume & Structure Map is ready",
  narrative:
    "Your map shows where your face looks well supported and where some volume or structure has changed over time. Your doctor will go through each area with you.",
  encouragement:
    "A GMC-registered doctor confirms what suits you at your free online consultation.",
};

/** Replace any part of Claude's copy that breaks the copy rules. */
export function enforceCopyRules(n: ClaudeNarrative): { narrative: ClaudeNarrative; clean: boolean } {
  const out = { ...n };
  let clean = true;
  for (const k of ["headline", "narrative", "encouragement"] as const) {
    if (!out[k] || violations(out[k]).length > 0) {
      out[k] = SAFE_NARRATIVE[k];
      clean = false;
    }
  }
  return { narrative: out, clean };
}

function cleanZone(z: MappedZone): MappedZone {
  const ok = (t: string) => (violations(t).length > 0 ? "" : t);
  return { ...z, see: ok(z.see), why: ok(z.why), help: ok(z.help), benefit: ok(z.benefit) };
}

export function buildResult(
  assessment: PhotoAssessment,
  opts: {
    fillerHistory: FillerHistory | null;
    priority: Priority | null;
    skinScanUsed: boolean;
    sex?: Sex | null;
    measurements?: Measurement[];
  },
): AnalyzeResult {
  const derived = deriveZones(assessment);
  // Zone notes are shown to the client too — drop any that break the rules.
  // Every Claude-written field is shown to the client — blank any that break
  // the copy rules (the UI then falls back to the clinic's own static copy).
  const zones = derived.zones.map(cleanZone);
  const summary = assessment.summary.filter((b) => violations(b).length === 0);
  const { narrative, clean } = enforceCopyRules(assessment.narrative);
  return {
    ...derived,
    zones,
    skinLaxity: assessment.skinLaxity,
    jowlGrade: assessment.jowlGrade,
    makeupDetected: assessment.makeupDetected,
    framingAdequate: assessment.framingAdequate,
    previousWorkVisible: assessment.previousWorkVisible,
    narrative,
    summary,
    measurements: (opts.measurements ?? []).filter((m) => violations(`${m.label} ${m.value} ${m.detail ?? ""}`).length === 0),
    narrativeSource: clean && summary.length === assessment.summary.length ? "claude" : "fallback",
    usedPhoto: true,
    skinScanUsed: opts.skinScanUsed,
    plan: buildPlan({
      zones,
      firmnessDominant: derived.firmnessDominant,
      fillerHistory: opts.fillerHistory,
      priority: opts.priority,
      sex: opts.sex ?? null,
    }),
    fillerHistory: opts.fillerHistory,
    priority: opts.priority,
    sex: opts.sex ?? null,
  };
}
