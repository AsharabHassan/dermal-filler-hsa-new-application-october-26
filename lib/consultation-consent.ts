// ─────────────────────────────────────────────────────────────────────────────
// The scan is a request for a free consultation, not a free AI toy. Before the
// (paid) analysis runs, the client ticks an explicit, unticked-by-default box
// asking our team to call / text / WhatsApp them about their report and their
// consultation. That contact is the service they are requesting — it is NOT
// marketing consent, which stays separate and is never bundled with this.
// The exact wording + version are stored on the CRM contact as evidence.
// ─────────────────────────────────────────────────────────────────────────────

export const CONSULTATION_CONTACT_CONSENT_VERSION = "consultation-contact-v1";

/** How quickly the clinic promises the first call (shown to the client). */
export const CALLBACK_PROMISE = "within minutes";

export const CONSENT_HEADLINE = "I’m requesting a free consultation.";

export function consultationContactDetail(city: string): string {
  return (
    "Please call, text or WhatsApp me about my report and to arrange my " +
    `consultation with the ${city} team.`
  );
}

/** The exact statement the client agrees to (also sent to the CRM). */
export function consultationContactStatement(city: string): string {
  return `${CONSENT_HEADLINE} ${consultationContactDetail(city)}`;
}

export const CALL_TIMES = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
] as const;

export type CallTimeKey = (typeof CALL_TIMES)[number]["key"];
export const CALL_TIME_KEYS = CALL_TIMES.map((t) => t.key) as [
  CallTimeKey,
  ...CallTimeKey[],
];

