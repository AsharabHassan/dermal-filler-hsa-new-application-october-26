import { describe, it, expect } from "vitest";
import { assessFace } from "@/lib/quality-gate";

describe("assessFace", () => {
  it("is not ready when no face is detected", () => {
    const r = assessFace({ faceCount: 0, coverage: 0, offCenter: 0 });
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/face/i);
  });

  it("warns when more than one face is present", () => {
    const r = assessFace({ faceCount: 2, coverage: 0.4, offCenter: 0.1 });
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/only/i);
  });

  it("asks the user to move closer when the face is too small", () => {
    const r = assessFace({ faceCount: 1, coverage: 0.05, offCenter: 0.1 });
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/closer/i);
  });

  it("asks the user to move back when the face fills the frame", () => {
    const r = assessFace({ faceCount: 1, coverage: 0.95, offCenter: 0.1 });
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/back/i);
  });

  it("asks the user to centre when off-centre", () => {
    const r = assessFace({ faceCount: 1, coverage: 0.4, offCenter: 0.5 });
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/cent/i);
  });

  it("is ready for a well-framed single face", () => {
    const r = assessFace({ faceCount: 1, coverage: 0.4, offCenter: 0.1 });
    expect(r.ok).toBe(true);
  });
});
