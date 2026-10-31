import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("serverEnv", () => {
  it("treats a blank GHL_WEBHOOK_URL placeholder as not configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("GHL_WEBHOOK_URL", "");
    const { serverEnv } = await import("@/lib/env");
    expect(serverEnv().GHL_WEBHOOK_URL).toBeUndefined();
    expect(serverEnv().ANTHROPIC_MODEL).toBeTruthy();
  });

  it("still rejects a malformed webhook URL", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    vi.stubEnv("GHL_WEBHOOK_URL", "not a url");
    const { serverEnv } = await import("@/lib/env");
    expect(() => serverEnv()).toThrow(/GHL_WEBHOOK_URL/);
  });
});
