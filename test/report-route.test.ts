import { describe, expect, it, vi, beforeEach } from "vitest";

const { deliverReportToGhl } = vi.hoisted(() => ({
  deliverReportToGhl: vi.fn(),
}));

vi.mock("@/lib/ghl-report", () => ({ deliverReportToGhl }));

import { POST, isSameOriginReportRequest } from "@/app/api/report/route";

const ORIGIN = "https://undereye.harleystreetaesthetic.clinic";

/** A minimal, structurally valid base64 PDF that passes the magic-byte check. */
const PDF_BASE64 = Buffer.from("%PDF-1.4\nreport bytes\n").toString("base64");

function reportRequest(
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Request {
  return new Request(`${ORIGIN}/api/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: ORIGIN,
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify({
      lead: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        phone: "07700900123",
      },
      focusZones: ["cheeks", "temples"],
      clinicLocation: "london",
      pdfBase64: PDF_BASE64,
      ...overrides,
    }),
  });
}

beforeEach(() => {
  deliverReportToGhl.mockReset();
  deliverReportToGhl.mockResolvedValue({ ok: true, emailed: true, noted: true });
});

describe("POST /api/report", () => {
  it("delivers the report automatically, with no feature flag or opt-in", async () => {
    const response = await POST(reportRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      emailed: true,
    });
    expect(deliverReportToGhl).toHaveBeenCalledTimes(1);

    const input = deliverReportToGhl.mock.calls[0][0];
    expect(input).toMatchObject({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      pdfBase64: PDF_BASE64,
    });
    expect(input.subject).toContain("Facial Volume Scan report");
    expect(input.emailHtml).toContain("Hi Jane");
    expect(input.emailHtml).toContain("Harley Street Aesthetics London");
    expect(input.fileName).toBe("Facial-Volume-Scan-Jane.pdf");
    expect(input.tags).toEqual([
      "dermal-fillers-analyzer",
      "hsa-dermal-fillers-app",
      "hsa-clinic-london",
    ]);
    expect(input.source).toBe("Facial Volume Scan · London");
  });

  it("escapes the name so a crafted lead cannot inject HTML into the email", async () => {
    await POST(
      reportRequest({
        lead: {
          firstName: "<img src=x onerror=alert(1)>",
          lastName: "Doe",
          email: "jane@example.com",
          phone: "07700900123",
        },
      }),
    );
    const { emailHtml } = deliverReportToGhl.mock.calls[0][0];
    expect(emailHtml).not.toContain("<img src=x");
    expect(emailHtml).toContain("&lt;img src=x");
  });

  it("uses the Glasgow clinic details for Glasgow reports", async () => {
    await POST(reportRequest({ clinicLocation: "glasgow" }));

    const input = deliverReportToGhl.mock.calls[0][0];
    expect(input.emailHtml).toContain("Harley Street Aesthetics Glasgow");
    expect(input.noteBody).toContain("Glasgow Facial Volume Scan report");
    expect(input.source).toBe("Facial Volume Scan · Glasgow");
    expect(input.tags).toContain("hsa-clinic-glasgow");
  });

  it("falls back to London for an unknown location", async () => {
    await POST(reportRequest({ clinicLocation: "manchester" }));
    expect(deliverReportToGhl.mock.calls[0][0].tags).toContain(
      "hsa-clinic-london",
    );
  });

  it("skips delivery for a missing email or a non-PDF payload", async () => {
    const noEmail = await POST(
      reportRequest({ lead: { firstName: "Jane", email: "not-an-email" } }),
    );
    await expect(noEmail.json()).resolves.toMatchObject({ skipped: true });

    const notAPdf = await POST(
      reportRequest({ pdfBase64: Buffer.from("hello").toString("base64") }),
    );
    await expect(notAPdf.json()).resolves.toMatchObject({ skipped: true });

    expect(deliverReportToGhl).not.toHaveBeenCalled();
  });

  it("refuses a cross-site caller so the endpoint cannot be used as a mail relay", async () => {
    const response = await POST(
      reportRequest({}, {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(response.status).toBe(403);
    expect(deliverReportToGhl).not.toHaveBeenCalled();
  });
});

describe("same-origin report guard", () => {
  it("accepts the app's own origin on any host, not just production", () => {
    for (const origin of [
      ORIGIN,
      "http://localhost:3000",
      "https://preview-project.vercel.app",
    ]) {
      const request = new Request(`${origin}/api/report`, {
        method: "POST",
        headers: { origin, "sec-fetch-site": "same-origin" },
      });
      expect(isSameOriginReportRequest(request)).toBe(true);
    }
  });

  it("rejects a caller that sends no browser origin headers", () => {
    expect(
      isSameOriginReportRequest(
        new Request(`${ORIGIN}/api/report`, { method: "POST" }),
      ),
    ).toBe(false);
  });

  it("rejects a mismatched origin", () => {
    expect(
      isSameOriginReportRequest(
        new Request(`${ORIGIN}/api/report`, {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });
});
