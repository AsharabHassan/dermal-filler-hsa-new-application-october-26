// ─────────────────────────────────────────────────────────────────────────────
// Copy rules (ASA / CAP + HSA brand). Used two ways:
//  · test/copy-rules.test.ts scans every user-facing source file for these
//  · lib/assessment.ts runs Claude's text through `violations()` and swaps in
//    safe wording if anything slips through.
// ─────────────────────────────────────────────────────────────────────────────

export const FORBIDDEN_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "perfect", re: /\bperfect(ly|ion)?\b/i },
  { label: "flawless", re: /\bflawless\b/i },
  { label: "painless", re: /\bpain[- ]?less\b/i },
  { label: "no risk", re: /\b(no|zero|0%)[- ]risk\b|\brisk[- ]free\b/i },
  { label: "transform", re: /\btransform(s|ed|ing|ation|ative)?\b/i },
  { label: "snatched", re: /\bsnatched\b/i },
  { label: "plump pout", re: /\bplump(er)? pout\b/i },
  { label: "miracle", re: /\bmiracle\b/i },
  { label: "limited time", re: /\blimited[- ]time\b|\bhurry\b|\bends (tonight|soon)\b/i },
  { label: "toxin", re: /\bbotox\b|\banti[- ]?wrinkle\b|\btoxin\b|\bbotulinum\b/i },
  { label: "brand", re: /juv[eé]derm|\bsosum\b|restylane|teoxane|profhilo/i },
  { label: "old address", re: /Portpool Lane|EC1N 7UU/i },
  { label: "beauty score", re: /\b(beauty|attractiveness|age) score\b|\battractive(ness)?\b|\bugly\b/i },
  { label: "age estimate", re: /\byou look (\d+|older|younger)\b|\byears? younger\b/i },
  { label: "permanent", re: /\bpermanent(ly)?\b/i },
];

/** Labels of every rule the text breaks (empty = clean). */
export function violations(text: string): string[] {
  return FORBIDDEN_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

/** A UK phone number pattern — call-back copy must never show one. */
export const PHONE_RE = /(\+44\s?|\b0)\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/;
