// ─────────────────────────────────────────────────────────────────────────────
// Domain model for the HSA Facial Volume Scan (dermal fillers). Claude Vision,
// supported by the clinic's own HSA SkinScan signals, rates how much volume and
// structure has changed in eight facial zones. lib/zones.ts turns those ratings
// into the client-facing "Volume & Structure Map" (Well supported / Some change /
// Noticeable change), the explicit "leave alone" zones and the cause notes;
// lib/plan.ts builds the conservative plan preview. There is NO beauty score,
// NO age estimate and NO attractiveness language anywhere (ASA body-image rules).
// All face geometry for the on-screen map stays on-device (MediaPipe).
// ─────────────────────────────────────────────────────────────────────────────

/** Landing clinic selected by the campaign route. */
export type ClinicLocationKey = "london" | "glasgow";

/** The eight zones of the Volume & Structure Map, in face order (top → bottom). */
export type ZoneKey =
  | "temples"
  | "teartrough"
  | "cheeks"
  | "nasolabial"
  | "lips"
  | "marionette"
  | "chin"
  | "jawline";

/** The three client-facing zone states. */
export type ZoneStatus = "well_supported" | "some_change" | "noticeable_change";

/** "Had filler before?" — asked before the scan. */
export type FillerHistory = "no" | "yes_happy" | "yes_unhappy" | "not_sure";

/** "What matters most?" — asked before the scan. */
export type Priority =
  | "less_tired"
  | "subtle_definition"
  | "fix_previous"
  | "not_sure";

/** "Which best describes you?" — asked before the scan; never inferred from the photo. */
export type Sex = "woman" | "man" | "prefer_not";

/** What mainly drives a zone's change. */
export type ZoneCause = "none" | "volume" | "firmness" | "mixed";

/** Jowl grade (from the Endomax lower-face logic) — a skin-firmness signal. */
export type JowlGrade = "none" | "mild" | "moderate" | "advanced" | "unclear";

/** Claude's read of one zone. */
export interface ZoneRead {
  /** 0–100: how visible the volume / structure change is (0 = fully supported). */
  change: number;
  /** True when the zone already looks full (often previous filler) — never add here. */
  appearsFull: boolean;
  /** What mainly drives the change here (volume vs skin firmness). */
  cause: ZoneCause;
  /** "What we see": 1–2 specific sentences about THIS photo. */
  see: string;
  /** "Why it happens": 1 sentence tailored to the observation. */
  why: string;
  /** "What could help": 1 sentence (filler / leave alone / firming the skin). */
  help: string;
  /** "What filler could do here" — benefit-led, subtle, temporary (focus zones only). */
  benefit: string;
}

/** A zone after mapping — what the report renders. */
export interface MappedZone {
  key: ZoneKey;
  status: ZoneStatus;
  change: number;
  appearsFull: boolean;
  obscured: boolean;
  /** True when the report explicitly says "we wouldn't add volume here". */
  leaveAlone: boolean;
  cause: ZoneCause;
  see: string;
  why: string;
  help: string;
  benefit: string;
}

/** One plain-language HSA SkinScan measurement — a measurement, never a score of the person. */
export interface Measurement {
  key: string;
  label: string;
  /** "1 : 1.5", "low", "moderate", "higher", "smooth"… */
  value: string;
  /** Context such as "balanced range ≈ 1 : 1.6". */
  detail?: string;
  source: "geometry" | "undereye_measure" | "endolift_model" | "derm_foundation" | "skin_measure" | "combined";
}

/** The narrative portion Claude authors. */
export interface ClaudeNarrative {
  headline: string;
  /** 2–3 short sentences, cosmetic and observational, never judgemental. */
  narrative: string;
  encouragement: string;
}

/** Claude's raw assessment of the photo, after parsing. */
export interface PhotoAssessment {
  zones: Record<ZoneKey, ZoneRead>;
  zonesObscured: ZoneKey[];
  /** 0–100: how much of the visible change is skin firmness / laxity rather than volume. */
  skinLaxity: number;
  jowlGrade: JowlGrade;
  makeupDetected: boolean;
  framingAdequate: boolean;
  /** True when the photo looks like it shows previous filler somewhere. */
  previousWorkVisible: boolean;
  /** "What's happening to your face": 3–5 plain-English findings for THIS face. */
  summary: string[];
  narrative: ClaudeNarrative;
}

/** One line of the conservative plan preview. */
export interface PlanItem {
  zone: ZoneKey;
  /** "start" = first visit; "review" = only if still needed after the first areas settle. */
  stage: "start" | "review";
  /** Suggested starting volume range in ml (conservative; doctor confirms). */
  mlMin: number;
  mlMax: number;
  /** "often starts with 0.5–1 ml". */
  volumeText: string;
  /** Published "from" price in GBP, or null when confirmed at consultation. */
  priceFrom: number | null;
  /** "From £299 (1 ml)" or "Price confirmed at your consultation". */
  priceText: string;
  /** Why this zone is in the plan / why it is staged. */
  why: string;
}

export interface PlanPreview {
  items: PlanItem[];
  /** Total suggested starting volume (start-stage items only). */
  startMlMin: number;
  startMlMax: number;
  /** True when the current offer fits the starting plan. */
  offerFits: boolean;
  /** Previous work to review (or dissolve) before anything is added. */
  reviewFirst: boolean;
}

/** The full result returned by /api/analyze and rendered on the result screen. */
export interface AnalyzeResult {
  zones: MappedZone[];
  /** Zones with change, most-affected first. */
  focusZones: ZoneKey[];
  /** Zones the report explicitly says to leave alone. */
  leaveAloneZones: ZoneKey[];
  /** "Lines beside your mouth often come from lost cheek support above…" */
  causeNotes: string[];
  /** True when skin firmness, not volume, is the main change → honest non-filler line. */
  firmnessDominant: boolean;
  skinLaxity: number;
  jowlGrade: JowlGrade;
  makeupDetected: boolean;
  framingAdequate: boolean;
  previousWorkVisible: boolean;
  narrative: ClaudeNarrative;
  /** "What's happening to your face" bullets (3–5). */
  summary: string[];
  /** "Your scan measurements" (HSA SkinScan), plain language. */
  measurements: Measurement[];
  narrativeSource: "claude" | "fallback";
  usedPhoto: boolean;
  /** Whether HSA SkinScan signals were available for this read. */
  skinScanUsed: boolean;
  plan: PlanPreview;
  /** Echo of the pre-scan answers that shaped the report. */
  fillerHistory: FillerHistory | null;
  priority: Priority | null;
  sex: Sex | null;
}

/** Lead captured at the gate. */
export interface Lead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Request body for POST /api/analyze. */
export interface AnalyzeRequest {
  imageBase64: string | null;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp";
  /** Explicit consent to process the face image. Required when imageBase64 present. */
  imageConsent: boolean;
  fillerHistory?: FillerHistory | null;
  priority?: Priority | null;
  sex?: Sex | null;
}

/** Browser-readable attribution only. Conversion identity is server-owned. */
export interface ClientMetaAttribution {
  fbp: string | null;
  fbc: string | null;
  eventSourceUrl: string | null;
}

/** Server-owned, allow-listed Meta conversion fields. */
export interface ServerMetaConversion {
  datasetId: string;
  pixelId: string;
  eventName: "Lead";
  eventId: string;
  eventTime: number;
  actionSource: "website";
  eventSourceUrl: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  clientUserAgent?: string;
  clientIpAddress?: string;
}

/** Request body for POST /api/lead. */
export interface LeadRequest {
  lead: Lead;
  result: AnalyzeResult;
  clinicLocation: ClinicLocationKey;
  imageProcessingConsent: boolean;
  imageProcessingConsentAt: string;
  metaTrackingConsent: boolean;
  /** The client confirmed they are 18 or over before the scan. */
  ageConfirmed: true;
  fillerHistory: FillerHistory;
  priority: Priority;
  sex: Sex;
  consultationContactConsent?: true;
  consultationContactConsentAt?: string;
  consultationContactStatement?: string;
  consultationContactConsentVersion?: string;
  preferredCallTime?: "morning" | "afternoon" | "evening";
  attribution?: ClientMetaAttribution;
}
