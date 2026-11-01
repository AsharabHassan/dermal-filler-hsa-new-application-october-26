import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/preview/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function req(body: unknown) {
  return new Request("http://localhost/api/preview", { method: "POST", body: JSON.stringify(body) });
}
const body = { imageBase64: "aGVsbG8=", imageMediaType: "image/jpeg", imageConsent: true, zones: ["cheeks", "bogus"], sex: "man" };

describe("/api/preview", () => {
  it("is hidden gracefully with no OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(await (await GET()).json()).toEqual({ available: false });
    expect((await POST(req(body))).status).toBe(503);
  });

  it("reports availability and sends a subtle, focus-zone-only edit", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    expect(await (await GET()).json()).toEqual({ available: true });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: "ZWRpdA==" }], output_format: "jpeg" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await POST(req(body));
    expect(await res.json()).toEqual({ imageBase64: "ZWRpdA==", imageMediaType: "image/jpeg" });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    const prompt = String(form.get("prompt"));
    expect(prompt).toMatch(/without adding roundness/);
    expect(prompt).toMatch(/Do not change the lips at all/);
    // gpt-image treats a mask as a hint only; the client confines the result instead.
    expect(form.get("mask")).toBeNull();
  });

  it("requires consent and at least one focus zone, and never blocks on failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    expect((await POST(req({ ...body, imageConsent: false }))).status).toBe(400);
    expect((await POST(req({ ...body, zones: ["bogus"] }))).status).toBe(400);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req(body))).status).toBe(502);
  });
});
