import "server-only";

import type { Lead } from "./types";

const BASE = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

function credentials(): { token: string; locationId: string } | null {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) return null;
  if (token.includes("REPLACE") || locationId.includes("REPLACE")) return null;
  return { token, locationId };
}

/**
 * Where every fillers lead lands. Every lead goes into the Call Center for a call
 * back, and into the New Lead Treatment Pipeline under "Dermal Filler". Online
 * bookers are then moved to the Calendar pipeline by the clinic's generic
 * booking workflow.
 */
export const LEAD_OPPORTUNITIES = [
  {
    key: "callCenter",
    pipelineId: "Bcc3ems7Jv3dsdmyMzLO", // Call Center Pipeline
    pipelineStageId: "43faeceb-434f-4dfe-91b2-784ae866dba0", // New Leads For Call Center
  },
  {
    key: "treatment",
    pipelineId: "YKRFI1eaFuYA3auaZKqJ", // New Lead Treatment Pipeline
    pipelineStageId: "e9a36dc5-95d4-4712-b860-6b273391e870", // Dermal Filler
  },
] as const;

type OpportunityTarget = (typeof LEAD_OPPORTUNITIES)[number];
export type OpportunityOutcome = "created" | "exists" | "error";

export interface LeadRoutingResult {
  ok: boolean;
  skipped?: boolean;
  tagged?: boolean;
  opportunities?: Partial<Record<OpportunityTarget["key"], OpportunityOutcome>>;
  error?: string;
}

/**
 * Create the lead's opportunity in a pipeline unless the contact already has one
 * there. An existing opportunity is never moved, so a returning lead who is
 * already booked is not pushed back to "new".
 */
async function ensureOpportunity(
  auth: Record<string, string>,
  locationId: string,
  contactId: string,
  name: string,
  target: OpportunityTarget,
): Promise<OpportunityOutcome> {
  try {
    const query = new URLSearchParams({
      location_id: locationId,
      contact_id: contactId,
      pipeline_id: target.pipelineId,
    });
    const found = await fetch(`${BASE}/opportunities/search?${query}`, { headers: auth });
    if (!found.ok) return "error";
    const data = (await found.json().catch(() => ({}))) as {
      opportunities?: { pipelineId?: string; contactId?: string }[];
    };
    const existing = (data.opportunities ?? []).some(
      (o) => o.pipelineId === target.pipelineId && o.contactId === contactId,
    );
    if (existing) return "exists";

    const created = await fetch(`${BASE}/opportunities/`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        locationId,
        contactId,
        pipelineId: target.pipelineId,
        pipelineStageId: target.pipelineStageId,
        name,
        status: "open",
        source: "Facial Volume Scan",
      }),
    });
    return created.ok ? "created" : "error";
  } catch {
    return "error";
  }
}

/**
 * Upsert, tag and route a lead through the GHL Private Integration: contact,
 * campaign tags (which start the email nurture) and the two pipeline
 * opportunities. The inbound webhook remains responsible for Meta CAPI; this
 * path works even if no workflow is published.
 */
export async function ensureLeadRoutingInGhl(input: {
  lead: Lead;
  source: string;
  tags: string[];
}): Promise<LeadRoutingResult> {
  const creds = credentials();
  if (!creds) return { ok: false, skipped: true };

  const auth = {
    Authorization: `Bearer ${creds.token}`,
    Version: VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  try {
    const upsert = await fetch(`${BASE}/contacts/upsert`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        locationId: creds.locationId,
        firstName: input.lead.firstName,
        lastName: input.lead.lastName,
        email: input.lead.email,
        phone: input.lead.phone,
        source: input.source,
        createNewIfDuplicateAllowed: false,
      }),
    });
    const data = (await upsert.json().catch(() => ({}))) as {
      contact?: { id?: string };
    };
    const contactId = data.contact?.id;
    if (!upsert.ok || !contactId) {
      return { ok: false, error: `contact-upsert ${upsert.status}` };
    }

    const addTags = await fetch(`${BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ tags: input.tags }),
    });

    const name = `${input.lead.firstName} ${input.lead.lastName}`.trim() + " · Dermal Fillers";
    const opportunities: LeadRoutingResult["opportunities"] = {};
    for (const target of LEAD_OPPORTUNITIES) {
      opportunities[target.key] = await ensureOpportunity(
        auth,
        creds.locationId,
        contactId,
        name,
        target,
      );
    }

    return addTags.ok
      ? { ok: true, tagged: true, opportunities }
      : {
          ok: false,
          tagged: false,
          opportunities,
          error: `contact-tags ${addTags.status}`,
        };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ghl-routing-error",
    };
  }
}
