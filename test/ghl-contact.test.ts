import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureLeadRoutingInGhl } from "@/lib/ghl-contact";

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

describe("ensureLeadRoutingInGhl", () => {
  it("upserts the lead and adds location tags without replacing current tags", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ contact: { id: "contact-1" } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await ensureLeadRoutingInGhl({
      lead: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        phone: "07700900123",
      },
      source: "Eye Rejuvenation Analyzer · Glasgow",
      tags: ["hsa-dermal-fillers-app", "hsa-clinic-glasgow"],
    });

    expect(result).toEqual({ ok: true, tagged: true });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://services.leadconnectorhq.com/contacts/upsert",
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      source: "Eye Rejuvenation Analyzer · Glasgow",
      createNewIfDuplicateAllowed: false,
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://services.leadconnectorhq.com/contacts/contact-1/tags",
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      tags: ["hsa-dermal-fillers-app", "hsa-clinic-glasgow"],
    });
  });
});
