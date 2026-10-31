import { describe, expect, it, vi } from "vitest";
import {
  buildGhlPayload,
  canonicalEventSourceUrl,
  createServerMetaConversion,
  fbclidFromFbc,
  PRODUCTION_ORIGIN,
} from "@/lib/ghl";
import {
  clientIp,
  deliverWebhook,
  isProductionMetaRequest,
  leadRequestSchema,
} from "@/app/api/lead/route";
import type { AnalyzeResult, Lead } from "@/lib/types";
import { sampleResult } from "./fixtures";

const lead: Lead = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "07700900123",
};

const result: AnalyzeResult = sampleResult;

function buildOptions(overrides: Record<string, unknown> = {}) {
  return {
    submittedAt: "2026-09-15T10:00:00.000Z",
    clinicLocation: "london" as const,
    imageProcessingConsent: true,
    imageProcessingConsentAt: "2026-09-15T09:55:00.000Z",
    metaTrackingConsent: false,
    ageConfirmed: true,
    fillerHistory: "no" as const,
    priority: "less_tired" as const,
    ...overrides,
  };
}

describe("buildGhlPayload", () => {
  it("records the consultation call request as evidence and tags the contact", () => {
    const payload = buildGhlPayload(lead, result, buildOptions({
      consultationContact: {
        at: "2026-09-15T09:50:00.000Z",
        statement: "I’m requesting a free consultation. Please call, text or WhatsApp me…",
        version: "consultation-contact-v1",
      },
      preferredCallTime: "evening",
    }));
    expect(payload).toMatchObject({
      consultationContactConsent: true,
      consultationContactConsentAt: "2026-09-15T09:50:00.000Z",
      consultationContactConsentVersion: "consultation-contact-v1",
      preferredCallTime: "evening",
    });
    expect(payload.tags).toEqual(
      expect.arrayContaining(["hsa-consultation-call-requested", "hsa-call-evening"]),
    );
    const without = buildGhlPayload(lead, result, buildOptions());
    expect(without.consultationContactConsent).toBe(false);
    expect(without.tags).not.toContain("hsa-consultation-call-requested");
  });

  it("maps CRM contact, zone map, plan, answers and consent fields", () => {
    const payload = buildGhlPayload(lead, result, buildOptions());
    expect(payload).toMatchObject({
      firstName: "Jane",
      lastName: "Doe",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "07700900123",
      source: "Facial Volume Scan · London",
      clinicLocation: "london",
      clinicLocationLabel: "London",
      clinicAddress: "1-5 Portpool Lane, London EC1N 7UU",
      fillerHistory: "no",
      fillerHistoryLabel: "No",
      priority: "less_tired",
      priorityLabel: "Look less tired",
      ageConfirmed: true,
      skinScanUsed: true,
      focusZones: "Cheeks (mid-face), Nasolabial lines, Temples",
      offerLabel: "4 ml filler plan £699 (was £899)",
      imageProcessingConsent: true,
      imageProcessingConsentAt: "2026-09-15T09:55:00.000Z",
      imageProcessingConsentRecordedAt: "2026-09-15T10:00:00.000Z",
      privacyNoticeVersion: "2026-09-15",
      metaTrackingConsent: false,
      submittedAt: "2026-09-15T10:00:00.000Z",
    });
    expect(payload.leaveAloneZones).toContain("Lips");
    expect(payload.leaveAloneZones).toContain("Chin");
    expect(payload.zoneMap).toContain("cheeks:Noticeable change (68)");
    expect(payload.planSummary).toContain("Nasolabial lines 0.5–1 ml (review later)");
    expect(payload.tags).toEqual(
      expect.arrayContaining([
        "dermal-fillers-analyzer",
        "hsa-dermal-fillers-app",
        "hsa-clinic-london",
        "fillers-history-no",
        "fillers-priority-less_tired",
        "fillers-focus-cheeks",
        "hsa-meta-consent-declined",
      ]),
    );
    expect(JSON.stringify(payload)).not.toMatch(/undereye|score/i);
  });

  it("uses the Glasgow clinic for Glasgow leads and tags firmness / previous-work routing", () => {
    const payload = buildGhlPayload(
      lead,
      { ...result, firmnessDominant: true, plan: { ...result.plan, reviewFirst: true } },
      buildOptions({ clinicLocation: "glasgow", fillerHistory: "yes_unhappy", priority: "fix_previous" }),
    );
    expect(payload.source).toBe("Facial Volume Scan · Glasgow");
    expect(payload.clinicLocationLabel).toBe("Glasgow");
    expect(payload.tags).toEqual(
      expect.arrayContaining([
        "hsa-clinic-glasgow",
        "fillers-firmness-first",
        "fillers-review-previous-work",
        "fillers-history-yes_unhappy",
      ]),
    );
    expect(JSON.stringify(payload)).not.toContain("£0");
  });

  it("carries no marketing or report-storage signal into the CRM", () => {
    const payload = buildGhlPayload(lead, result, buildOptions());
    for (const key of [
      "marketingConsent",
      "reportStorageConsent",
      "reportRetentionDays",
      "reportDeleteAfter",
    ]) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it("only includes Meta fields once consent is granted", () => {
    const meta = createServerMetaConversion({
      lead,
      attribution: { fbp: "fb.1.1.abc", fbc: null, eventSourceUrl: null },
      eventId: "evt",
      eventTime: 123,
    });
    const declined = buildGhlPayload(lead, result, buildOptions({ meta }));
    expect(declined).not.toHaveProperty("metaEventId");

    const granted = buildGhlPayload(
      lead,
      result,
      buildOptions({ metaTrackingConsent: true, meta }),
    );
    expect(granted).toMatchObject({
      metaEventId: "evt",
      metaEventTime: 123,
      metaFbp: "fb.1.1.abc",
      metaEmail: "jane@example.com",
    });
    expect(granted.tags).toContain("hsa-meta-consent-accepted");
  });
});

describe("Meta server event safety", () => {
  it("derives FBCLID only from Meta's validated _fbc cookie format", () => {
    expect(fbclidFromFbc("fb.1.1780000000000.IwAR0abc_123-xyz")).toBe(
      "IwAR0abc_123-xyz",
    );
    expect(fbclidFromFbc("IwAR0abc_123-xyz")).toBeUndefined();
    expect(fbclidFromFbc("fb.1.not-a-timestamp.IwAR0abc")).toBeUndefined();
  });

  it("canonicalises to the production origin/path", () => {
    const meta = createServerMetaConversion({
      lead,
      attribution: {
        fbp: null,
        fbc: null,
        eventSourceUrl: "https://attacker.example//london?secret=1#face",
      },
      eventId: "server-generated-id",
      eventTime: 123,
    });
    expect(meta).toMatchObject({
      eventName: "Lead",
      eventId: "server-generated-id",
      eventTime: 123,
      actionSource: "website",
      eventSourceUrl: `${PRODUCTION_ORIGIN}/london`,
    });
  });

  it("falls back to the production root for an invalid source URL", () => {
    expect(canonicalEventSourceUrl("http://[")).toBe(`${PRODUCTION_ORIGIN}/`);
  });
});

describe("lead request validation", () => {
  const valid = {
    lead,
    result,
    clinicLocation: "london",
    imageProcessingConsent: true,
    imageProcessingConsentAt: "2026-09-15T12:00:00.000Z",
    metaTrackingConsent: true,
    ageConfirmed: true,
    fillerHistory: "yes_happy",
    priority: "subtle_definition",
    attribution: {
      fbp: null,
      fbc: null,
      eventSourceUrl: `${PRODUCTION_ORIGIN}/`,
    },
  };

  it("accepts the explicit consent and attribution shape", () => {
    expect(leadRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults a missing clinic location to London", () => {
    const withoutLocation = { ...valid };
    delete (withoutLocation as Partial<typeof valid>).clinicLocation;
    const parsed = leadRequestSchema.safeParse(withoutLocation);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.clinicLocation).toBe("london");
  });

  it("requires 18+ and both pre-scan answers", () => {
    for (const key of ["ageConfirmed", "fillerHistory", "priority"] as const) {
      const without = { ...valid } as Record<string, unknown>;
      delete without[key];
      expect(leadRequestSchema.safeParse(without).success).toBe(false);
    }
    expect(leadRequestSchema.safeParse({ ...valid, ageConfirmed: false }).success).toBe(false);
    expect(leadRequestSchema.safeParse({ ...valid, priority: "bigger lips" }).success).toBe(false);
  });

  it("rejects an unknown clinic location or zone", () => {
    expect(
      leadRequestSchema.safeParse({ ...valid, clinicLocation: "manchester" })
        .success,
    ).toBe(false);
    expect(
      leadRequestSchema.safeParse({
        ...valid,
        result: {
          ...result,
          focusZones: ["forehead"],
        },
      }).success,
    ).toBe(false);
  });

  it("requires the explicit analysis statement and its time", () => {
    const withoutTime = { ...valid };
    delete (withoutTime as Partial<typeof valid>).imageProcessingConsentAt;
    expect(leadRequestSchema.safeParse(withoutTime).success).toBe(false);
    expect(
      leadRequestSchema.safeParse({ ...valid, imageProcessingConsent: false })
        .success,
    ).toBe(false);
  });

  it("accepts the consultation call request and only known call times", () => {
    const withRequest = {
      ...valid,
      consultationContactConsent: true,
      consultationContactConsentAt: "2026-09-15T11:58:00.000Z",
      consultationContactStatement: "I’m requesting a free consultation.",
      consultationContactConsentVersion: "consultation-contact-v1",
      preferredCallTime: "morning",
    };
    expect(leadRequestSchema.safeParse(withRequest).success).toBe(true);
    expect(
      leadRequestSchema.safeParse({ ...withRequest, preferredCallTime: "midnight" })
        .success,
    ).toBe(false);
    expect(
      leadRequestSchema.safeParse({ ...withRequest, consultationContactConsent: false })
        .success,
    ).toBe(false);
  });

  it("rejects client-controlled conversion identifiers", () => {
    expect(
      leadRequestSchema.safeParse({
        ...valid,
        attribution: { ...valid.attribution, fbclid: "client-controlled" },
      }).success,
    ).toBe(false);
  });
});

describe("production Meta request gate", () => {
  it("accepts only the same-origin production lead endpoint", () => {
    const productionRequest = new Request(`${PRODUCTION_ORIGIN}/api/lead`, {
      method: "POST",
      headers: { origin: PRODUCTION_ORIGIN, "sec-fetch-site": "same-origin" },
    });
    expect(isProductionMetaRequest(productionRequest)).toBe(true);
  });

  it("rejects previews, cross-site callers and missing browser origins", () => {
    expect(
      isProductionMetaRequest(
        new Request("https://preview-project.vercel.app/api/lead", {
          headers: {
            origin: "https://preview-project.vercel.app",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isProductionMetaRequest(
        new Request(`${PRODUCTION_ORIGIN}/api/lead`, {
          headers: {
            origin: "https://attacker.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isProductionMetaRequest(new Request(`${PRODUCTION_ORIGIN}/api/lead`)),
    ).toBe(false);
  });
});

describe("webhook delivery", () => {
  it("uses the first valid forwarded IP and rejects invalid input", () => {
    expect(
      clientIp(
        new Request("https://example.test", {
          headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
        }),
      ),
    ).toBe("203.0.113.7");
    expect(
      clientIp(
        new Request("https://example.test", {
          headers: { "x-forwarded-for": "not-an-ip" },
        }),
      ),
    ).toBeNull();
  });

  it("retries a failed webhook up to three times", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
    const wait = vi.fn(async () => undefined);
    const outcome = await deliverWebhook("https://example.test/hook", {}, {
      fetchImpl: fetchImpl as typeof fetch,
      wait,
    });
    expect(outcome).toEqual({ delivered: false, attempts: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after a successful attempt", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const outcome = await deliverWebhook("https://example.test/hook", {}, {
      fetchImpl: fetchImpl as typeof fetch,
      wait: async () => undefined,
    });
    expect(outcome).toEqual({ delivered: true, attempts: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
