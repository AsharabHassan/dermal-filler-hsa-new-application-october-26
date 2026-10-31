import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkinScanError } from "@/lib/skinscan";
import { assessment } from "./fixtures";

const mocks = vi.hoisted(() => ({ scan: vi.fn(), assess: vi.fn() }));
vi.mock("@/lib/skinscan", async (orig) => ({
  ...(await orig<typeof import("@/lib/skinscan")>()),
  skinScanFillers: mocks.scan,
}));
vi.mock("@/lib/anthropic", () => ({ assessPhoto: mocks.assess }));

const { POST, maxDuration } = await import("@/app/api/analyze/route");

function req(body: unknown) {
  return new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify(body) });
}
const body = { imageBase64: "b64", imageMediaType: "image/jpeg", imageConsent: true, fillerHistory: "yes_unhappy", priority: "fix_previous" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/analyze", () => {
  it("allows 90 s for SkinScan + Claude", () => {
    expect(maxDuration).toBe(90);
  });

  it("returns an 8-zone report when SkinScan and Claude succeed, passing the answers", async () => {
    mocks.scan.mockResolvedValue({ ok: true });
    mocks.assess.mockResolvedValue(assessment({ cheeks: 60 }));
    const res = await POST(req(body));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.result.zones).toHaveLength(8);
    expect(json.result.skinScanUsed).toBe(true);
    expect(json.result.plan.reviewFirst).toBe(true);
    expect(mocks.assess).toHaveBeenCalledWith(
      expect.objectContaining({ fillerHistory: "yes_unhappy", priority: "fix_previous", signals: { ok: true } }),
    );
  });

  it("marks zones SkinScan found outside the frame as checked at consultation", async () => {
    mocks.scan.mockResolvedValue({ ok: true, zones_not_visible: ["chin", "jawline", "bogus"] });
    mocks.assess.mockResolvedValue(assessment({ chin: 70, cheeks: 60 }));
    const json = await (await POST(req(body))).json();
    const chin = json.result.zones.find((z: { key: string }) => z.key === "chin");
    expect(chin.obscured).toBe(true);
    expect(json.result.focusZones).toEqual(["cheeks"]);
  });

  it("produces NO report when SkinScan is unavailable — and never calls Claude", async () => {
    mocks.scan.mockRejectedValue(new SkinScanError("timeout"));
    const res = await POST(req(body));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "scan_unavailable" });
    expect(mocks.assess).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("asks for a retake when SkinScan finds no face", async () => {
    mocks.scan.mockRejectedValue(new SkinScanError("no_face"));
    const res = await POST(req(body));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("no_face");
  });

  it("produces no report when Claude fails", async () => {
    mocks.scan.mockResolvedValue({ ok: true });
    mocks.assess.mockRejectedValue(new Error("boom"));
    const res = await POST(req(body));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("analysis_failed");
  });

  it("requires a photo and consent", async () => {
    const res = await POST(req({ ...body, imageConsent: false }));
    expect(res.status).toBe(400);
    expect(mocks.scan).not.toHaveBeenCalled();
  });
});
