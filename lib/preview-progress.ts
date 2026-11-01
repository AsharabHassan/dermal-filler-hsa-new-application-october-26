// ─────────────────────────────────────────────────────────────────────────────
// Estimated progress for the personal before/after preview. The image model
// reports nothing while it works (about 30 s), so the bar follows a curve that
// reaches ~90% at the expected time, creeps towards a cap if the model is slow,
// and only hits 100% when the picture actually arrives. Pure; tested in
// test/preview-progress.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Typical wall-clock time of one preview, from production logs (Nov 2026). */
export const PREVIEW_EXPECTED_MS = 32_000;
/** Shown while still waiting; 100 is reserved for the real result. */
export const PREVIEW_PROGRESS_CAP = 96;

export function estimatedProgress(elapsedMs: number, expectedMs = PREVIEW_EXPECTED_MS): number {
  if (elapsedMs <= 0) return 0;
  const tau = expectedMs / Math.log(10); // 90% at the expected time
  const p = 100 * (1 - Math.exp(-elapsedMs / tau));
  return Math.min(PREVIEW_PROGRESS_CAP, Math.floor(p));
}
