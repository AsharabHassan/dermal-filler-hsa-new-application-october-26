import { isIP } from "node:net";
import { z } from "zod";
import {
  buildGhlPayload,
  createServerMetaConversion,
  META_DATASET_ID,
  PRODUCTION_ORIGIN,
} from "@/lib/ghl";
import { serverEnv } from "@/lib/env";
import { ensureLeadRoutingInGhl } from "@/lib/ghl-contact";
import { CALL_TIME_KEYS } from "@/lib/consultation-consent";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

const DELIVERY_ATTEMPTS = 3;
const WEBHOOK_TIMEOUT_MS = 5_000;

const shortText = z.string().trim().min(1).max(200);
const fillerHistory = z.enum(["no", "yes_happy", "yes_unhappy", "not_sure"]);
const priority = z.enum(["less_tired", "subtle_definition", "fix_previous", "not_sure"]);
const zoneKey = z.enum([
  "temples",
  "teartrough",
  "cheeks",
  "nasolabial",
  "lips",
  "marionette",
  "chin",
  "jawline",
]);
const percent = z.number().finite().min(0).max(100);
const ml = z.number().finite().min(0).max(20);

const leadSchema = z
  .object({
    firstName: shortText,
    lastName: shortText,
    email: z.string().trim().email().max(320),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(32)
      .refine((value) => value.replace(/\D/g, "").length >= 7),
  })
  .strict()
  .transform(
    ({ firstName, lastName, email, phone }): Lead => ({
      firstName,
      lastName,
      email,
      phone,
    }),
  );

const resultSchema = z
  .object({
    zones: z
      .array(
        z
          .object({
            key: zoneKey,
            status: z.enum(["well_supported", "some_change", "noticeable_change"]),
            change: percent,
            appearsFull: z.boolean(),
            obscured: z.boolean(),
            leaveAlone: z.boolean(),
            note: z.string().max(500),
          })
          .strict(),
      )
      .max(8),
    focusZones: z.array(zoneKey).max(8),
    leaveAloneZones: z.array(zoneKey).max(8),
    causeNotes: z.array(z.string().max(500)).max(5),
    firmnessDominant: z.boolean(),
    skinLaxity: percent,
    jowlGrade: z.enum(["none", "mild", "moderate", "advanced", "unclear"]),
    makeupDetected: z.boolean(),
    framingAdequate: z.boolean(),
    previousWorkVisible: z.boolean(),
    narrative: z
      .object({
        headline: z.string().max(500),
        narrative: z.string().max(8_000),
        encouragement: z.string().max(2_000),
      })
      .strict(),
    narrativeSource: z.enum(["claude", "fallback"]),
    usedPhoto: z.boolean(),
    skinScanUsed: z.boolean(),
    plan: z
      .object({
        items: z
          .array(
            z
              .object({
                zone: zoneKey,
                stage: z.enum(["start", "review"]),
                mlMin: ml,
                mlMax: ml,
                volumeText: z.string().max(200),
                priceFrom: z.number().finite().min(0).max(10_000).nullable(),
                priceText: z.string().max(200),
                why: z.string().max(1_000),
              })
              .strict(),
          )
          .max(8),
        startMlMin: ml,
        startMlMax: ml,
        offerFits: z.boolean(),
        reviewFirst: z.boolean(),
      })
      .strict(),
    fillerHistory: fillerHistory.nullable(),
    priority: priority.nullable(),
  })
  .strict();

const attributionSchema = z
  .object({
    fbp: z.string().trim().max(255).nullable(),
    fbc: z.string().trim().max(255).nullable(),
    eventSourceUrl: z.string().trim().max(2_048).nullable(),
  })
  .strict();

export const leadRequestSchema = z
  .object({
    lead: leadSchema,
    result: resultSchema,
    clinicLocation: z.enum(["london", "glasgow"]).default("london"),
    imageProcessingConsent: z.literal(true),
    imageProcessingConsentAt: z.string().datetime(),
    metaTrackingConsent: z.boolean(),
    // 18+ confirmation and the two pre-scan questions are required.
    ageConfirmed: z.literal(true),
    fillerHistory,
    priority,
    // "I'm requesting a free consultation" — ticked before the scan. Optional
    // only so a tab opened before this release doesn't lose its lead.
    consultationContactConsent: z.literal(true).optional(),
    consultationContactConsentAt: z.string().datetime().optional(),
    consultationContactStatement: z.string().trim().max(500).optional(),
    consultationContactConsentVersion: z.string().trim().max(64).optional(),
    preferredCallTime: z.enum(CALL_TIME_KEYS).optional(),
    attribution: attributionSchema.optional(),
  })
  .strict();

/** First x-forwarded-for hop is the client address on Vercel. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0].trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";
  return isIP(candidate) ? candidate : null;
}

function requestUserAgent(request: Request): string | null {
  const userAgent = request.headers.get("user-agent")?.trim();
  return userAgent ? userAgent.slice(0, 1_024) : null;
}

/** Only the real same-origin production app may enqueue a Meta conversion. */
export function isProductionMetaRequest(request: Request): boolean {
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin.toLowerCase();
  } catch {
    return false;
  }

  if (requestOrigin !== PRODUCTION_ORIGIN.toLowerCase()) return false;

  const originHeader = request.headers.get("origin")?.trim().toLowerCase();
  if (originHeader !== PRODUCTION_ORIGIN.toLowerCase()) return false;

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  return !fetchSite || fetchSite === "same-origin";
}

export interface DeliveryResult {
  delivered: boolean;
  attempts: number;
}

export async function deliverWebhook(
  url: string,
  payload: unknown,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    wait?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<DeliveryResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? WEBHOOK_TIMEOUT_MS;
  const wait =
    options.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (response.ok) return { delivered: true, attempts: attempt };
    } catch {
      // Network errors and aborts are retried below.
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < DELIVERY_ATTEMPTS) await wait(250 * attempt);
  }

  return { delivered: false, attempts: DELIVERY_ATTEMPTS };
}

// Forward the lead to GoHighLevel. Delivery failure never blocks result access.
export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = leadRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "invalid request" },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const submittedAt = new Date().toISOString();
  const metaTrackingAllowed =
    body.metaTrackingConsent &&
    META_DATASET_ID.length > 0 &&
    isProductionMetaRequest(request);
  const meta = metaTrackingAllowed
    ? createServerMetaConversion({
        lead: body.lead,
        attribution: body.attribution,
        clientUserAgent: requestUserAgent(request),
        clientIpAddress: clientIp(request),
      })
    : undefined;
  const payload = buildGhlPayload(body.lead, body.result, {
    submittedAt,
    clinicLocation: body.clinicLocation,
    imageProcessingConsent: true,
    imageProcessingConsentAt: body.imageProcessingConsentAt,
    metaTrackingConsent: metaTrackingAllowed,
    meta,
    ageConfirmed: true,
    fillerHistory: body.fillerHistory,
    priority: body.priority,
    consultationContact: body.consultationContactConsent
      ? {
          at: body.consultationContactConsentAt ?? submittedAt,
          statement: body.consultationContactStatement ?? "",
          version: body.consultationContactConsentVersion ?? "",
        }
      : undefined,
    preferredCallTime: body.preferredCallTime,
  });

  let webhook: string | undefined;
  try {
    webhook = serverEnv().GHL_WEBHOOK_URL;
  } catch {
    webhook = undefined;
  }

  const deliveryPromise = webhook
    ? deliverWebhook(webhook, payload)
    : Promise.resolve<DeliveryResult>({ delivered: false, attempts: 0 });
  const routingPromise = ensureLeadRoutingInGhl({
    lead: body.lead,
    source: `Facial Volume Scan · ${payload.clinicLocationLabel}`,
    tags: payload.tags,
  });
  const [delivery, routing] = await Promise.all([
    deliveryPromise,
    routingPromise,
  ]);

  const trackingQueued = Boolean(meta && delivery.delivered);
  const log = {
    event: "ghl_lead_delivery",
    delivered: delivery.delivered,
    attempts: delivery.attempts,
    trackingQueued,
    routingEnsured: routing.ok && routing.tagged === true,
    webhookConfigured: Boolean(webhook),
    focusZones: payload.focusZones,
  };
  if (delivery.delivered) console.info("[lead]", log);
  else console.warn("[lead]", log);

  return Response.json({
    ok: true,
    delivered: delivery.delivered,
    trackingQueued,
    routingEnsured: routing.ok && routing.tagged === true,
  });
}
