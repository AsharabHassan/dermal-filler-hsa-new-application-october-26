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
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValue(
        new Response(JSON.stringify({ opportunities: [] }), { status: 200 }),
      );

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

    expect(result).toMatchObject({ ok: true, tagged: true });
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

  const lead = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "07700900123",
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  it("creates the Call Center and Dermal Filler opportunities for a new lead", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ contact: { id: "c-9" } }))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json({ opportunities: [] }))
      .mockResolvedValueOnce(json({ opportunity: { id: "o1" } }, 201))
      .mockResolvedValueOnce(json({ opportunities: [] }))
      .mockResolvedValueOnce(json({ opportunity: { id: "o2" } }, 201));

    const result = await ensureLeadRoutingInGhl({
      lead,
      source: "Facial Volume Scan · London",
      tags: ["dermal-fillers-analyzer"],
    });

    expect(result).toEqual({
      ok: true,
      tagged: true,
      opportunities: { callCenter: "created", treatment: "created" },
    });
    const posts = fetchMock.mock.calls
      .filter(([url, init]) => String(url).endsWith("/opportunities/") && init?.method === "POST")
      .map(([, init]) => JSON.parse(init.body));
    expect(posts).toEqual([
      expect.objectContaining({
        contactId: "c-9",
        pipelineId: "Bcc3ems7Jv3dsdmyMzLO",
        pipelineStageId: "43faeceb-434f-4dfe-91b2-784ae866dba0",
        name: "Jane Doe · Dermal Fillers",
        status: "open",
      }),
      expect.objectContaining({
        contactId: "c-9",
        pipelineId: "YKRFI1eaFuYA3auaZKqJ",
        pipelineStageId: "e9a36dc5-95d4-4712-b860-6b273391e870",
      }),
    ]);
    expect(String(fetchMock.mock.calls[2][0])).toContain("contact_id=c-9");
    expect(String(fetchMock.mock.calls[2][0])).toContain("pipeline_id=Bcc3ems7Jv3dsdmyMzLO");
  });

  it("never moves an opportunity the contact already has (e.g. already booked)", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ contact: { id: "c-9" } }))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(
        json({ opportunities: [{ contactId: "c-9", pipelineId: "Bcc3ems7Jv3dsdmyMzLO" }] }),
      )
      .mockResolvedValueOnce(json({ opportunities: [] }))
      .mockResolvedValueOnce(json({}, 201));

    const result = await ensureLeadRoutingInGhl({
      lead,
      source: "Facial Volume Scan · London",
      tags: ["dermal-fillers-analyzer"],
    });

    expect(result.opportunities).toEqual({ callCenter: "exists", treatment: "created" });
    const created = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith("/opportunities/") && init?.method === "POST",
    );
    expect(created).toHaveLength(1);
  });

  it("still reports the lead as tagged when an opportunity call fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ contact: { id: "c-9" } }))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValue(new Response("forbidden", { status: 403 }));

    const result = await ensureLeadRoutingInGhl({
      lead,
      source: "Facial Volume Scan · London",
      tags: ["dermal-fillers-analyzer"],
    });

    expect(result).toEqual({
      ok: true,
      tagged: true,
      opportunities: { callCenter: "error: search 403", treatment: "error: search 403" },
    });
  });
});
