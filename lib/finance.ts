import { OFFER } from "./constants";
import type { PlanPreview } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Payment options as published on harleystreetaesthetic.co.uk/{city}/finance
// (checked 2 Nov 2026). Terms are the providers' headline terms only; the
// section always carries the "subject to status" line. Pure; tested in
// test/finance.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface FinanceOption {
  key: "klarna" | "clearpay" | "ideal";
  provider: string;
  headline: string;
  detail: string;
  /** Instalment count for the worked example, or null for a loan. */
  instalments: number | null;
  /** Minimum treatment value the option is offered for, in GBP. */
  minimum: number;
  applyUrl: string | null;
}

export const FINANCE_OPTIONS: FinanceOption[] = [
  {
    key: "klarna",
    provider: "Klarna",
    headline: "Pay in 3",
    detail: "Three interest-free instalments. No fees, no interest.",
    instalments: 3,
    minimum: 0,
    applyUrl: null,
  },
  {
    key: "clearpay",
    provider: "Clearpay",
    headline: "Pay in 4",
    detail: "Four equal payments, one every two weeks over six weeks. Always interest-free.",
    instalments: 4,
    minimum: 0,
    applyUrl: null,
  },
  {
    key: "ideal",
    provider: "Ideal 4 Finance",
    headline: "Monthly plans",
    detail: "Interest-free finance for up to 12 months on treatments over £1,000. Fast decisions.",
    instalments: null,
    minimum: 1000,
    applyUrl: "https://ideal4finance.com/retail/apply/hsm",
  },
];

export const FINANCE_SMALL_PRINT =
  "Finance is subject to status and the provider's terms; you must be 18 or over. Your exact price is confirmed at your free consultation, before anything is booked.";

/** "£233" style, rounded to the pound for readability. */
export function formatPounds(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

/** The per-instalment amount for a pay-in-N option. */
export function instalment(amount: number, n: number): number {
  return amount / n;
}

/**
 * The worked example for the client's own plan: the 4 ml plan price when the
 * starting plan fits it, otherwise the sum of published "from" prices for the
 * starting areas, otherwise the 4 ml plan as a reference.
 */
export function financeExample(plan: PlanPreview): { label: string; amount: number } {
  if (OFFER.active && plan.offerFits) {
    return { label: `Your ${OFFER.name}`, amount: OFFER.price };
  }
  const start = plan.items.filter((i) => i.stage === "start");
  if (start.length > 0 && start.every((i) => i.priceFrom !== null)) {
    const total = start.reduce((sum, i) => sum + (i.priceFrom ?? 0), 0);
    return { label: `Your starting plan from`, amount: total };
  }
  return { label: `Our ${OFFER.name}`, amount: OFFER.price };
}
