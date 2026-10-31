import type { ClinicLocationKey, ZoneKey } from "./types";
export type { ClinicLocationKey } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Clinic brand + contact constants (Harley Street Aesthetics, London & Glasgow)
// and the ONLY place filler prices, starting volumes and the current offer live.
// The result screen, PDF and GoHighLevel payload all read from these tables.
// Copy rules: GMC-registered doctors only; consultations are FREE and ONLINE;
// never name product brands; never mention toxin / anti-wrinkle treatments.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicLocation {
  key: ClinicLocationKey;
  city: string;
  shortCity: string;
  lines: string[];
  phone: string;
  phoneHref: string;
}

export const CLINIC = {
  name: "Harley Street Aesthetics",
  shortName: "HSA",
  byline: "London · Glasgow",
  director: "Our GMC-registered doctors",
  tagline: "Doctor-led aesthetic medicine in London & Glasgow",
  addressLines: ["1-5 Portpool Lane", "London EC1N 7UU"],
  phone: "020 4628 3165",
  phoneHref: "tel:+442046283165",
  whatsapp: "07700 106236",
  whatsappHref: "https://wa.me/447700106236",
  email: "hello@harleystreetaesthetic.co.uk",
  hours: "Mon–Sat · by appointment",
  website: "https://harleystreetaesthetic.co.uk",
  locations: [
    {
      key: "london",
      city: "London",
      shortCity: "London",
      lines: ["1-5 Portpool Lane", "London EC1N 7UU"],
      phone: "020 4628 3165",
      phoneHref: "tel:+442046283165",
    },
    {
      key: "glasgow",
      city: "Glasgow",
      shortCity: "Glasgow",
      lines: ["5th Floor, Ingram House", "227 Ingram Street, Glasgow G1 1DA"],
      phone: "0141 488 8985",
      phoneHref: "tel:+441414888985",
    },
  ] satisfies ClinicLocation[],
} as const;

export const TRUST_MARKERS = [
  "Only GMC-registered doctors inject",
  "Free online consultation",
  "Clinics in London & Glasgow",
  "Start small, build gradually",
] as const;

/** Booking + site URLs (overridable via public env at deploy). */
const CONFIGURED_BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL;
const WORKING_BOOKING_URL = "https://harleystreetaesthetic.co.uk/london/contact/";
const WORKING_GLASGOW_BOOKING_URL =
  "https://harleystreetaesthetic.co.uk/glasgow/contact/";

export const BOOKING_URL = CONFIGURED_BOOKING_URL || WORKING_BOOKING_URL;

export const BOOKING_URLS: Record<ClinicLocationKey, string> = {
  london: BOOKING_URL,
  glasgow:
    process.env.NEXT_PUBLIC_GLASGOW_BOOKING_URL || WORKING_GLASGOW_BOOKING_URL,
};

// GoHighLevel consultation calendar (shared with the other HSA apps). Each
// clinic can be pointed at its own via public env.
const DEFAULT_CALENDAR_URL =
  "https://link.harleystreetaesthetic.co.uk/widget/bookings/aesthetic-consultant-1";

export const CALENDAR_URLS: Record<ClinicLocationKey, string> = {
  london: process.env.NEXT_PUBLIC_BOOKING_CALENDAR_URL || DEFAULT_CALENDAR_URL,
  glasgow:
    process.env.NEXT_PUBLIC_GLASGOW_BOOKING_CALENDAR_URL ||
    process.env.NEXT_PUBLIC_BOOKING_CALENDAR_URL ||
    DEFAULT_CALENDAR_URL,
};

/** UK numbers in the +44 form GoHighLevel's phone field expects. */
export function toE164Uk(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("44")) return `+${digits}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return digits;
}

type CalendarLead = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
} | null;

/** The field names GoHighLevel's calendar reads to prefill its contact form. */
export function calendarPrefill(lead: CalendarLead): Record<string, string> {
  if (!lead) return {};
  return {
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone: toE164Uk(lead.phone),
  };
}

/** Calendar link with the visitor's details prefilled, so booking is two taps. */
export function prefilledCalendarUrl(
  calendarUrl: string,
  lead: CalendarLead,
): string {
  try {
    const url = new URL(calendarUrl);
    for (const [name, value] of Object.entries(calendarPrefill(lead))) {
      url.searchParams.set(name, value);
    }
    return url.toString();
  } catch {
    return calendarUrl;
  }
}

export const DEFAULT_CLINIC_LOCATION: ClinicLocationKey = "london";

export function isClinicLocationKey(value: unknown): value is ClinicLocationKey {
  return value === "london" || value === "glasgow";
}

export function getClinicLocation(location: ClinicLocationKey) {
  const clinic = CLINIC.locations.find((item) => item.key === location);
  if (!clinic) throw new Error(`Unknown clinic location: ${location}`);
  return {
    ...clinic,
    bookingUrl: BOOKING_URLS[location],
    calendarUrl: CALENDAR_URLS[location],
  };
}

// TODO(HSA): confirm the production domain for the Facial Volume Scan.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fillers.harleystreetaesthetic.co.uk";

// ─────────────────────────────────────────────────────────────────────────────
// Zone pricing + conservative starting volumes. Prices are the published
// standard-tier "from" prices (harleystreetaesthetic.co.uk, Oct 2026). `null`
// = not published → "Price confirmed at your consultation" (never "£0").
// Starting volumes are deliberately conservative ("start small, build
// gradually"). TODO(HSA): clinician sign-off on every starting volume.
// ─────────────────────────────────────────────────────────────────────────────

export interface ZonePricing {
  /** Published "from" price (GBP), or null when it is confirmed at consultation. */
  priceFrom: number | null;
  /** The volume the published price covers, e.g. "1 ml". */
  priceUnit: string | null;
  /** Conservative suggested starting volume, in ml. */
  mlMin: number;
  mlMax: number;
}

export const PRICE_AT_CONSULTATION = "Price confirmed at your consultation";

export const ZONE_PRICING: Record<ZoneKey, ZonePricing> = {
  lips: { priceFrom: 249, priceUnit: "1 ml", mlMin: 0.5, mlMax: 1 },
  cheeks: { priceFrom: 299, priceUnit: "1 ml", mlMin: 1, mlMax: 2 },
  jawline: { priceFrom: 399, priceUnit: "2 ml", mlMin: 2, mlMax: 2 },
  teartrough: { priceFrom: 299, priceUnit: null, mlMin: 0.5, mlMax: 1 },
  // TODO(HSA): publish chin / nasolabial / marionette / temples prices.
  chin: { priceFrom: null, priceUnit: null, mlMin: 1, mlMax: 1 },
  nasolabial: { priceFrom: null, priceUnit: null, mlMin: 0.5, mlMax: 1 },
  marionette: { priceFrom: null, priceUnit: null, mlMin: 0.5, mlMax: 1 },
  temples: { priceFrom: null, priceUnit: null, mlMin: 0.5, mlMax: 1 },
};

/**
 * Current offer. Shown in the plan preview and the NextStepCard — never with a
 * countdown or "limited time" pressure. Set `active: false` to hide it.
 */
export const OFFER = {
  active: true,
  ml: 4,
  price: 699,
  was: 899,
  name: "4 ml filler plan",
} as const;

export const TREATMENT_NOTE =
  "Starting volumes are a guide, not a prescription. Your doctor confirms the areas, volume and price at your free online consultation, and treatment is built up gradually. Results are temporary and vary from person to person.";

/** Small print only. */
export const DISCLAIMER =
  "Not a diagnosis. Suitability confirmed at your consultation. Results vary.";

/** Partner non-filler treatment for skin firmness (named on the clinic site). */
export const FIRMNESS_TREATMENT = "Nu Sculpt";
