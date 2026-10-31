import { randomUUID } from "node:crypto";
import type {
  AnalyzeResult,
  ClientMetaAttribution,
  FillerHistory,
  Lead,
  Priority,
  Sex,
  ServerMetaConversion,
  ClinicLocationKey,
} from "./types";
import { OFFER, SITE_URL, getClinicLocation } from "./constants";
import { ANALYSIS_PRIVACY_NOTICE_VERSION } from "./privacy";
import { STATUS_LABEL, ZONES } from "./zones";

/** Meta dataset / pixel id for server-side conversions. Empty = disabled. */
export const META_DATASET_ID = (process.env.META_DATASET_ID ?? "").trim();
export const META_EVENT_NAME = "Lead" as const;
export const PRODUCTION_ORIGIN = new URL(SITE_URL).origin;

export const FILLER_HISTORY_LABEL: Record<FillerHistory, string> = {
  no: "No",
  yes_happy: "Yes, happy with it",
  yes_unhappy: "Yes, unhappy with it",
  not_sure: "Not sure",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  less_tired: "Look less tired",
  subtle_definition: "Subtle definition",
  fix_previous: "Fix previous work",
  not_sure: "Not sure",
};

export const SEX_LABEL: Record<Sex, string> = {
  woman: "Woman",
  man: "Man",
  prefer_not: "Prefer not to say",
};

export interface GhlPayload {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  clinicLocation: ClinicLocationKey;
  clinicLocationLabel: string;
  clinicAddress: string;
  usedPhoto: boolean;
  narrativeSource: string;
  skinScanUsed: boolean;
  headline: string;
  /** "Had filler before?" */
  fillerHistory: FillerHistory;
  fillerHistoryLabel: string;
  /** "What matters most?" */
  priority: Priority;
  priorityLabel: string;
  /** "Which best describes you?" (self-reported, never inferred). */
  sex: Sex;
  sexLabel: string;
  ageConfirmed: boolean;
  /** "What's happening to your face" bullets, for the call opener. */
  faceSummary: string;
  /** Zones with change, most-affected first ("cheeks, nasolabial"). */
  focusZones: string;
  /** Zones the report says to leave alone. */
  leaveAloneZones: string;
  /** Per-zone map as "zone:Status (change)" for the call opener. */
  zoneMap: string;
  /** Starting plan, e.g. "cheeks 1–2 ml; temples 0.5–1 ml". */
  planSummary: string;
  planStartMl: string;
  offerFits: boolean;
  offerLabel: string;
  firmnessDominant: boolean;
  reviewPreviousWork: boolean;
  imageProcessingConsent: boolean;
  imageProcessingConsentAt?: string;
  imageProcessingConsentRecordedAt?: string;
  privacyNoticeVersion: string;
  metaTrackingConsent: boolean;
  consultationContactConsent: boolean;
  consultationContactConsentAt?: string;
  consultationContactStatement?: string;
  consultationContactConsentVersion?: string;
  preferredCallTime?: string;
  submittedAt?: string;
  metaDatasetId?: string;
  metaPixelId?: string;
  metaEventName?: string;
  metaEventId?: string;
  metaEventTime?: number;
  metaActionSource?: string;
  metaEventSourceUrl?: string;
  metaFbp?: string;
  metaFbc?: string;
  metaFbclid?: string;
  metaFirstName?: string;
  metaLastName?: string;
  metaEmail?: string;
  metaPhone?: string;
  metaClientUserAgent?: string;
  metaClientIpAddress?: string;
}

export interface BuildGhlPayloadOptions {
  submittedAt?: string;
  clinicLocation: ClinicLocationKey;
  imageProcessingConsent: boolean;
  imageProcessingConsentAt?: string;
  privacyNoticeVersion?: string;
  metaTrackingConsent: boolean;
  meta?: ServerMetaConversion;
  ageConfirmed: boolean;
  fillerHistory: FillerHistory;
  priority: Priority;
  sex: Sex;
  consultationContact?: { at: string; statement: string; version: string };
  preferredCallTime?: string;
}

/** Force an untrusted browser URL onto the production origin and drop query/hash. */
export function canonicalEventSourceUrl(raw?: string | null): string {
  let pathname = "/";
  if (raw) {
    try {
      pathname = new URL(raw, PRODUCTION_ORIGIN).pathname || "/";
    } catch {
      pathname = "/";
    }
  }
  const canonical = new URL(PRODUCTION_ORIGIN);
  canonical.pathname = pathname.replace(/\/{2,}/g, "/");
  canonical.search = "";
  canonical.hash = "";
  return canonical.toString();
}

function optionalValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Extract the raw click id from Meta's `_fbc` cookie format (server-side only). */
export function fbclidFromFbc(fbc: string | null | undefined): string | undefined {
  const value = optionalValue(fbc);
  if (!value) return undefined;
  const match = /^fb\.\d{1,3}\.\d{13}\.([A-Za-z0-9_-]{1,220})$/.exec(value);
  return match?.[1];
}

/** Create the server-controlled Meta event after consent has been validated. */
export function createServerMetaConversion(options: {
  lead: Lead;
  attribution?: ClientMetaAttribution;
  clientUserAgent?: string | null;
  clientIpAddress?: string | null;
  eventId?: string;
  eventTime?: number;
}): ServerMetaConversion {
  const fbc = optionalValue(options.attribution?.fbc);
  const fbclid = fbclidFromFbc(fbc);
  return {
    datasetId: META_DATASET_ID,
    pixelId: META_DATASET_ID,
    eventName: META_EVENT_NAME,
    eventId: options.eventId ?? randomUUID(),
    eventTime: options.eventTime ?? Math.floor(Date.now() / 1000),
    actionSource: "website",
    eventSourceUrl: canonicalEventSourceUrl(options.attribution?.eventSourceUrl),
    fbp: optionalValue(options.attribution?.fbp),
    fbc,
    ...(fbclid ? { fbclid } : {}),
    firstName: options.lead.firstName,
    lastName: options.lead.lastName,
    email: options.lead.email,
    phone: options.lead.phone,
    clientUserAgent: optionalValue(options.clientUserAgent),
    clientIpAddress: optionalValue(options.clientIpAddress),
  };
}

/** The base tags every HSA dermal-fillers lead carries. */
export function baseTags(clinicKey: ClinicLocationKey): string[] {
  return ["dermal-fillers-analyzer", "hsa-dermal-fillers-app", `hsa-clinic-${clinicKey}`];
}

/** Build the GoHighLevel inbound-webhook body. This helper performs no I/O. */
export function buildGhlPayload(
  lead: Lead,
  result: AnalyzeResult,
  options: BuildGhlPayloadOptions,
): GhlPayload {
  const clinic = getClinicLocation(options.clinicLocation);
  const meta = options.metaTrackingConsent ? options.meta : undefined;
  const metaFields: Partial<GhlPayload> = meta
    ? {
        metaDatasetId: meta.datasetId,
        metaPixelId: meta.pixelId,
        metaEventName: meta.eventName,
        metaEventId: meta.eventId,
        metaEventTime: meta.eventTime,
        metaActionSource: meta.actionSource,
        metaEventSourceUrl: meta.eventSourceUrl,
        metaFbp: meta.fbp,
        metaFbc: meta.fbc,
        ...(meta.fbclid ? { metaFbclid: meta.fbclid } : {}),
        metaFirstName: meta.firstName,
        metaLastName: meta.lastName,
        metaEmail: meta.email,
        metaPhone: meta.phone,
        metaClientUserAgent: meta.clientUserAgent,
        metaClientIpAddress: meta.clientIpAddress,
      }
    : {};

  const start = result.plan.items.filter((i) => i.stage === "start");
  const mlRange = (a: number, b: number) => (a === b ? `${a} ml` : `${a}–${b} ml`);
  const reviewPrevious = result.plan.reviewFirst;

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
    phone: lead.phone,
    source: `Facial Volume Scan · ${clinic.city}`,
    tags: [
      ...baseTags(clinic.key),
      `fillers-history-${options.fillerHistory}`,
      `fillers-priority-${options.priority}`,
      `fillers-sex-${options.sex}`,
      ...result.focusZones.slice(0, 3).map((z) => `fillers-focus-${z}`),
      ...(result.firmnessDominant ? ["fillers-firmness-first"] : []),
      ...(reviewPrevious ? ["fillers-review-previous-work"] : []),
      ...(result.plan.offerFits ? ["fillers-offer-4ml"] : []),
      options.metaTrackingConsent ? "hsa-meta-consent-accepted" : "hsa-meta-consent-declined",
      ...(options.consultationContact ? ["hsa-consultation-call-requested"] : []),
      ...(options.preferredCallTime ? [`hsa-call-${options.preferredCallTime}`] : []),
    ],
    clinicLocation: clinic.key,
    clinicLocationLabel: clinic.city,
    clinicAddress: clinic.lines.join(", "),
    usedPhoto: result.usedPhoto,
    narrativeSource: result.narrativeSource,
    skinScanUsed: result.skinScanUsed,
    headline: result.narrative.headline,
    fillerHistory: options.fillerHistory,
    fillerHistoryLabel: FILLER_HISTORY_LABEL[options.fillerHistory],
    priority: options.priority,
    priorityLabel: PRIORITY_LABEL[options.priority],
    sex: options.sex,
    sexLabel: SEX_LABEL[options.sex],
    ageConfirmed: options.ageConfirmed,
    faceSummary: result.summary.join(" "),
    focusZones: result.focusZones.map((z) => ZONES[z].label).join(", "),
    leaveAloneZones: result.leaveAloneZones.map((z) => ZONES[z].label).join(", "),
    zoneMap: result.zones
      .map((z) => `${z.key}:${z.obscured ? "Not visible" : STATUS_LABEL[z.status]} (${z.change})`)
      .join(", "),
    planSummary: result.plan.items
      .map((i) => `${ZONES[i.zone].label} ${mlRange(i.mlMin, i.mlMax)}${i.stage === "review" ? " (review later)" : ""}`)
      .join("; "),
    planStartMl: start.length ? mlRange(result.plan.startMlMin, result.plan.startMlMax) : "",
    offerFits: result.plan.offerFits,
    offerLabel: OFFER.active ? `${OFFER.name} £${OFFER.price} (was £${OFFER.was})` : "",
    firmnessDominant: result.firmnessDominant,
    reviewPreviousWork: reviewPrevious,
    imageProcessingConsent: options.imageProcessingConsent,
    imageProcessingConsentAt: options.imageProcessingConsent
      ? (options.imageProcessingConsentAt ?? options.submittedAt)
      : undefined,
    imageProcessingConsentRecordedAt: options.imageProcessingConsent ? options.submittedAt : undefined,
    privacyNoticeVersion: options.privacyNoticeVersion ?? ANALYSIS_PRIVACY_NOTICE_VERSION,
    metaTrackingConsent: options.metaTrackingConsent,
    consultationContactConsent: Boolean(options.consultationContact),
    consultationContactConsentAt: options.consultationContact?.at,
    consultationContactStatement: options.consultationContact?.statement,
    consultationContactConsentVersion: options.consultationContact?.version,
    preferredCallTime: options.preferredCallTime,
    submittedAt: options.submittedAt,
    ...metaFields,
  };
}
