import type { AnalyzeRequest, FillerHistory, Priority, Sex } from "@/lib/types";
import { assessPhoto } from "@/lib/anthropic";
import { buildResult, type AnalyzeResponse } from "@/lib/assessment";
import { SkinScanError, skinScanFillers } from "@/lib/skinscan";
import { isZoneKey } from "@/lib/zones";
import { buildMeasurements } from "@/lib/measurements";
import { reportAgreement } from "@/lib/skinscan-agreement";
import type { FillerSignals } from "@/lib/skinscan";
import type { PhotoAssessment } from "@/lib/types";

/**
 * SkinScan agreement log (no effect on the result). Per visible zone: SkinScan
 * "high" vs Claude change >= 50; plus SkinScan laxity >= 0.5 vs Claude laxity >= 50.
 * Logging thresholds only; raw values are stored so they can be re-cut later.
 */
function logAgreement(signals: FillerSignals, a: PhotoAssessment, notVisible: string[]): void {
  const agree: Record<string, boolean> = {};
  const scanHints: Record<string, string> = {};
  const claudeChange: Record<string, number> = {};
  for (const [zone, hint] of Object.entries(signals.zone_hints ?? {})) {
    const read = isZoneKey(zone) ? a.zones[zone] : undefined;
    if (!hint || !read || notVisible.includes(zone) || a.zonesObscured.includes(zone as never)) continue;
    scanHints[zone] = hint;
    claudeChange[zone] = read.change;
    agree[`agree_${zone}`] = (hint === "high") === (read.change >= 50);
  }
  const lax = signals.combined?.laxity_proxy;
  if (typeof lax === "number") agree.agree_laxity = (lax >= 0.5) === (a.skinLaxity >= 50);
  if (!Object.keys(agree).length) return;
  reportAgreement(
    "fillers",
    { zoneHints: scanHints, laxity: lax ?? null, version: signals.version },
    { zoneChange: claudeChange, skinLaxity: a.skinLaxity, jowlGrade: a.jowlGrade },
    agree,
  );
}

export const runtime = "nodejs";
// SkinScan /fillers (Derm Foundation on CPU ~19 s, one retry) + Claude.
export const maxDuration = 90;

const HISTORY: FillerHistory[] = ["no", "yes_happy", "yes_unhappy", "not_sure"];
const PRIORITY: Priority[] = ["less_tired", "subtle_definition", "fix_previous", "not_sure"];
const SEX: Sex[] = ["woman", "man", "prefer_not"];

function fail(error: Extract<AnalyzeResponse, { ok: false }>["error"], status: number) {
  return Response.json({ ok: false, error } satisfies AnalyzeResponse, { status });
}

// POST /api/analyze — HSA SkinScan /fillers (REQUIRED) → Claude Vision → report.
// No report is produced without SkinScan: an unreachable / timed-out / failing
// scan returns { ok:false } and the client offers "try again / retake photo".
// The image lives only in this request scope and is never persisted or logged.
export async function POST(request: Request): Promise<Response> {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const { imageBase64, imageMediaType = "image/jpeg", imageConsent } = body;
  if (!imageBase64 || imageConsent !== true) {
    return Response.json({ ok: false, error: "photo and consent required" }, { status: 400 });
  }
  const fillerHistory = HISTORY.includes(body.fillerHistory as FillerHistory)
    ? (body.fillerHistory as FillerHistory)
    : null;
  const priority = PRIORITY.includes(body.priority as Priority) ? (body.priority as Priority) : null;
  const sex = SEX.includes(body.sex as Sex) ? (body.sex as Sex) : null;

  const started = Date.now();
  let signals;
  try {
    signals = await skinScanFillers(imageBase64);
  } catch (err) {
    const reason = err instanceof SkinScanError ? err.reason : "network";
    console.error("[api/analyze] SkinScan /fillers failed — no report produced:", {
      event: "skinscan_failed",
      reason,
      detail: err instanceof Error ? err.message : String(err),
    });
    return reason === "no_face" ? fail("no_face", 422) : fail("scan_unavailable", 503);
  }

  try {
    const assessment = await assessPhoto({
      imageBase64,
      imageMediaType,
      signals,
      fillerHistory,
      priority,
      sex,
    });
    // Zones SkinScan found outside the photo frame are never read, whatever
    // Claude says: they are checked at the consultation instead.
    const notVisible = (signals.zones_not_visible ?? []).filter(isZoneKey);
    if (assessment.framingAdequate) logAgreement(signals, assessment, notVisible);
    assessment.zonesObscured = Array.from(new Set([...assessment.zonesObscured, ...notVisible]));
    const result = buildResult(assessment, {
      fillerHistory,
      priority,
      sex,
      skinScanUsed: true,
      measurements: buildMeasurements(signals),
    });
    console.info("[api/analyze]", { event: "report_ready", ms: Date.now() - started, skinScanMs: signals.ms ?? null });
    return Response.json({ ok: true, result } satisfies AnalyzeResponse);
  } catch (err) {
    console.error("[api/analyze] Claude assessment failed — no report produced:", {
      event: "assessment_failed",
      detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
    return fail("analysis_failed", 502);
  }
}
