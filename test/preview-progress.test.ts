import { describe, expect, it } from "vitest";
import { estimatedProgress, PREVIEW_EXPECTED_MS, PREVIEW_PROGRESS_CAP } from "@/lib/preview-progress";

describe("estimatedProgress", () => {
  it("starts at 0, rises steadily and reaches about 90% at the expected time", () => {
    expect(estimatedProgress(0)).toBe(0);
    let last = 0;
    for (let t = 0; t <= PREVIEW_EXPECTED_MS; t += 500) {
      const p = estimatedProgress(t);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    expect(estimatedProgress(PREVIEW_EXPECTED_MS)).toBeGreaterThanOrEqual(88);
    expect(estimatedProgress(PREVIEW_EXPECTED_MS)).toBeLessThanOrEqual(91);
  });

  it("never claims completion while still waiting", () => {
    expect(estimatedProgress(10 * PREVIEW_EXPECTED_MS)).toBe(PREVIEW_PROGRESS_CAP);
    expect(estimatedProgress(Number.MAX_SAFE_INTEGER)).toBe(PREVIEW_PROGRESS_CAP);
  });
});
