import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalPreview } from "@/components/result/PersonalPreview";
import { useWizard } from "@/store/wizard-store";
import { sampleResult } from "./fixtures";

const mocks = vi.hoisted(() => ({ available: vi.fn(), after: vi.fn() }));
vi.mock("@/lib/ai-preview", () => ({ previewAvailable: mocks.available, aiAfterImage: mocks.after }));

beforeEach(() => {
  vi.useFakeTimers();
  useWizard.getState().reset();
  useWizard.getState().setResult(sampleResult);
  useWizard.getState().setImage("aGVsbG8=", "image/jpeg");
  mocks.available.mockResolvedValue(true);
  mocks.after.mockReturnValue(new Promise(() => {})); // the model is still working
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("preview loading screen", () => {
  it("shows a percentage that climbs while the before/after is generated", async () => {
    render(<PersonalPreview result={sampleResult} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // availability check resolves, loading begins
    });
    const bar = screen.getByRole("progressbar", { name: /before and after/i });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0%")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    const now = Number(bar.getAttribute("aria-valuenow"));
    expect(now).toBeGreaterThan(30);
    expect(now).toBeLessThan(100);
    expect(screen.getByText(`${now}%`)).toBeInTheDocument();
  });
});
