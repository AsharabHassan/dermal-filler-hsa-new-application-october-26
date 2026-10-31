import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SkinScanError,
  fillerSignalsNote,
  skinScanFillers,
  type FillerSignals,
} from "@/lib/skinscan";

export const SIGNALS: FillerSignals = {
  ok: true,
  version: "fillers-signals-1.0",
  endolift_model: {
    version: "endolift-1.0",
    cheeks_focus: 0.41,
    chin_focus: 0.72,
    neck_focus: 0.2,
    strong_candidate: 0.55,
    jawline_enhancement: 31,
    chin_enhancement: 28,
  },
  undereye_measure: { darkness_index: 22, character: "structural" },
  geometry: {
    lip_ratio_upper_lower: 0.66,
    lip_fullness: 0.31,
    lower_face_ratio: 0.52,
    chin_height_ratio: 0.38,
    shadow_depth: { temples: 6.2, cheeks: 4.1, nasolabial: 7.5 },
  },
  derm_foundation: {
    model: "derm-foundation + dinov2 -> skinscan-1.0 head",
    skin_quality: { cheeks: { photodamage: 0.18, clear: 0.6 } },
  },
  skin_measure: { texture_index: { cheeks: 11.2 } },
  combined: { laxity_proxy: 0.34 },
  zone_hints: { cheeks: "moderate", lips: "low" },
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  process.env.SKINSCAN_URL = "http://skinscan.test/";
  process.env.SKINSCAN_API_KEY = "k";
});
afterEach(() => {
  delete process.env.SKINSCAN_URL;
  delete process.env.SKINSCAN_API_KEY;
});

describe("skinScanFillers (required)", () => {
  it("posts to /fillers with the key and returns the signals", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(SIGNALS));
    const s = await skinScanFillers("b64", { fetchImpl });
    expect(s.version).toBe("fillers-signals-1.0");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://skinscan.test/fillers");
    expect(init.headers["x-skinscan-key"]).toBe("k");
  });

  it("throws not_configured without SKINSCAN_URL (no Claude-only fallback)", async () => {
    delete process.env.SKINSCAN_URL;
    await expect(skinScanFillers("b64")).rejects.toMatchObject({ reason: "not_configured" });
  });

  it("retries once on a 5xx / network error, then succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(ok({}, 502)).mockResolvedValueOnce(ok(SIGNALS));
    await expect(skinScanFillers("b64", { fetchImpl })).resolves.toMatchObject({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry and reports a timeout", async () => {
    const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
    const fetchImpl = vi.fn().mockRejectedValue(timeout);
    await expect(skinScanFillers("b64", { fetchImpl })).rejects.toMatchObject({ reason: "timeout" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 401 and reports no_face without retrying", async () => {
    const f401 = vi.fn().mockResolvedValue(ok({}, 401));
    await expect(skinScanFillers("b64", { fetchImpl: f401 })).rejects.toMatchObject({ reason: "http" });
    expect(f401).toHaveBeenCalledTimes(1);
    const fNoFace = vi.fn().mockImplementation(async () => ok({ ok: false, error: "no face found" }));
    await expect(skinScanFillers("b64", { fetchImpl: fNoFace })).rejects.toBeInstanceOf(SkinScanError);
    await expect(skinScanFillers("b64", { fetchImpl: fNoFace })).rejects.toMatchObject({ reason: "no_face" });
  });
});

describe("fillerSignalsNote", () => {
  it("labels every source for Claude and asks it never to quote numbers", () => {
    const note = fillerSignalsNote(SIGNALS);
    expect(note).toMatch(/^HSA SkinScan signals/);
    for (const label of ["endolift_model", "undereye_measure", "geometry", "derm_foundation", "skin_measure", "laxity proxy"]) {
      expect(note).toContain(label);
    }
    expect(note).toMatch(/never quote these numbers/);
    expect(note).toContain("cheeks: moderate");
  });

  it("copes with missing optional blocks", () => {
    const note = fillerSignalsNote({ ...SIGNALS, endolift_model: null, undereye_measure: null, derm_foundation: null, skin_measure: null, combined: { laxity_proxy: null } });
    expect(note).toContain("geometry");
    expect(note).not.toContain("endolift_model");
  });
});
