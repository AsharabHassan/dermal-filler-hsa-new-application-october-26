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

export interface LeadRoutingResult {
  ok: boolean;
  skipped?: boolean;
  tagged?: boolean;
  error?: string;
}

/**
 * Upsert and tag a lead through the GHL Private Integration. The inbound
 * webhook remains responsible for automations and Meta CAPI; this independent
 * path guarantees the clinic/location tags even if a workflow has stale fixed
 * tag mappings.
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
    return addTags.ok
      ? { ok: true, tagged: true }
      : { ok: false, tagged: false, error: `contact-tags ${addTags.status}` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ghl-routing-error",
    };
  }
}
