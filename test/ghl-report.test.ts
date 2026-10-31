import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deliverReportToGhl } from "@/lib/ghl-report";

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.GHL_API_TOKEN = "test-token";
  process.env.GHL_LOCATION_ID = "test-location";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GHL_API_TOKEN;
  delete process.env.GHL_LOCATION_ID;
});

describe("deliverReportToGhl", () => {
  it("uploads, upserts, tags, notes and emails without overwriting existing contact tags", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://cdn.example/report.pdf" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ contact: { id: "contact-1" } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await deliverReportToGhl({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "07700900123",
      pdfBase64: Buffer.from("%PDF-1.4\nreport").toString("base64"),
      fileName: "report.pdf",
      subject: "Your report",
      emailHtml: "<p>Your report</p>",
      noteBody: "London report: {url}",
      source: "Eye Rejuvenation Analyzer · London",
      tags: ["hsa-dermal-fillers-app", "hsa-clinic-london"],
    });

    expect(result).toMatchObject({
      ok: true,
      contactId: "contact-1",
      tagged: true,
      noted: true,
      emailed: true,
    });

    const upsert = fetchMock.mock.calls[1];
    expect(upsert[0]).toBe(
      "https://services.leadconnectorhq.com/contacts/upsert",
    );
    expect(JSON.parse(upsert[1].body)).toMatchObject({
      source: "Eye Rejuvenation Analyzer · London",
      customFields: [
        {
          key: "facial_app_report_pdf",
          fieldValue: "https://cdn.example/report.pdf",
        },
      ],
    });

    const addTags = fetchMock.mock.calls[2];
    expect(addTags[0]).toBe(
      "https://services.leadconnectorhq.com/contacts/contact-1/tags",
    );
    expect(JSON.parse(addTags[1].body)).toEqual({
      tags: ["hsa-dermal-fillers-app", "hsa-clinic-london"],
    });
  });

  it("no-ops when the GHL integration is not configured", async () => {
    delete process.env.GHL_API_TOKEN;
    const result = await deliverReportToGhl({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "07700900123",
      pdfBase64: "",
      fileName: "report.pdf",
      subject: "s",
      emailHtml: "<p/>",
      noteBody: "{url}",
      source: "s",
      tags: [],
    });
    expect(result).toEqual({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
