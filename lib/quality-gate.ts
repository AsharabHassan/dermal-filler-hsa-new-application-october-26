// ─────────────────────────────────────────────────────────────────────────────
// Pure readiness gate. `assessFace` turns on-device MediaPipe geometry into a
// pass/fail + a friendly retake hint. It touches no DOM or network, so it's
// fully unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

export interface FaceFrame {
  /** Number of faces detected in the frame. */
  faceCount: number;
  /** Face bounding-box area as a fraction of the frame (0–1). */
  coverage: number;
  /** Distance of the face centre from the frame centre, normalized (0–~1). */
  offCenter: number;
}

export interface FaceAssessment {
  ok: boolean;
  hint: string;
}

const MIN_COVERAGE = 0.1;
const MAX_COVERAGE = 0.85;
const MAX_OFFCENTER = 0.32;

export function assessFace(frame: FaceFrame): FaceAssessment {
  if (frame.faceCount < 1)
    return { ok: false, hint: "Position your face within the circle." };
  if (frame.faceCount > 1)
    return { ok: false, hint: "Make sure only your face is in view." };
  if (frame.coverage < MIN_COVERAGE)
    return { ok: false, hint: "Move a little closer." };
  if (frame.coverage > MAX_COVERAGE)
    return { ok: false, hint: "Move back slightly." };
  if (frame.offCenter > MAX_OFFCENTER)
    return { ok: false, hint: "Centre your face in the frame." };
  return { ok: true, hint: "Looking good — hold still." };
}
