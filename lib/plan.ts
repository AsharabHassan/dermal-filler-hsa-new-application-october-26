import type {
  FillerHistory,
  MappedZone,
  PlanItem,
  PlanPreview,
  Priority,
  Sex,
  ZoneKey,
} from "./types";
import { OFFER, PRICE_AT_CONSULTATION, ZONE_PRICING, FIRMNESS_TREATMENT } from "./constants";
import { ZONES } from "./zones";

// ─────────────────────────────────────────────────────────────────────────────
// The conservative plan preview. Pure — no network — and the single place the
// plan rules live (tested in test/plan.test.ts):
//  1. Only zones with change that are not left alone or covered are planned.
//  2. Support first: cheeks → temples → chin → jawline → tear trough → lips →
//     nasolabial → marionette. "What matters most" moves matching zones forward.
//  3. A zone whose change usually comes from another zone waits for it:
//     nasolabial and tear trough wait for the cheeks; marionette waits for the
//     chin / jawline. Waiting zones are "review once the first areas settle".
//  4. At most three areas start at the first visit; the rest are reviewed later.
//  5. When skin firmness dominates, the jawline and marionette areas wait —
//     firming the skin may suit better than filler there.
//  6. Men: jaw / chin / temples / tear troughs come first, and lips or cheeks
//     are only planned when the change is clearly noticeable — the plan never
//     adds shape that would feminise the face.
//  7. Prices are "from" prices, final at consultation; unpublished prices read
//     "Price confirmed at your consultation", never "£0".
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_ORDER: ZoneKey[] = [
  "cheeks",
  "temples",
  "chin",
  "jawline",
  "teartrough",
  "lips",
  "nasolabial",
  "marionette",
];

export const MAX_START_AREAS = 3;

const PRIORITY_ZONES: Record<Priority, ZoneKey[]> = {
  less_tired: ["teartrough", "cheeks", "temples"],
  subtle_definition: ["chin", "jawline", "lips"],
  fix_previous: [],
  not_sure: [],
};

/** Zones that usually improve when another zone is supported first. */
const WAITS_FOR: Partial<Record<ZoneKey, ZoneKey[]>> = {
  nasolabial: ["cheeks"],
  teartrough: ["cheeks"],
  marionette: ["chin", "jawline"],
};

const FIRMNESS_LED: ZoneKey[] = ["jawline", "marionette"];

/** For men: structure first. */
const MALE_FOCUS: ZoneKey[] = ["jawline", "chin", "temples", "teartrough"];
/** For men these are only planned when the change is clearly noticeable. */
const MALE_NOTICEABLE_ONLY: ZoneKey[] = ["lips", "cheeks"];

/** True when a zone is not planned for a man because the change isn't clearly noticeable. */
export function maleHoldBack(zone: MappedZone, sex: Sex | null | undefined): boolean {
  return sex === "man" && MALE_NOTICEABLE_ONLY.includes(zone.key) && zone.status !== "noticeable_change";
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** "£299". Returns "" for 0 / unpublished prices so nothing ever reads "£0". */
export function formatGbp(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "";
  return gbp.format(n);
}

function ml(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function volumeText(min: number, max: number): string {
  return min === max ? `often starts with ${ml(min)} ml` : `often starts with ${ml(min)}–${ml(max)} ml`;
}

export function priceText(zone: ZoneKey): string {
  const p = ZONE_PRICING[zone];
  if (!p.priceFrom) return PRICE_AT_CONSULTATION;
  return `From ${formatGbp(p.priceFrom)}${p.priceUnit ? ` (${p.priceUnit})` : ""}`;
}

export function buildPlan(params: {
  zones: MappedZone[];
  firmnessDominant: boolean;
  fillerHistory: FillerHistory | null;
  priority: Priority | null;
  sex?: Sex | null;
}): PlanPreview {
  const { zones, firmnessDominant } = params;
  const boosted = new Set([
    ...(params.priority ? PRIORITY_ZONES[params.priority] : []),
    ...(params.sex === "man" ? MALE_FOCUS : []),
  ]);
  const candidates = zones
    .filter((z) => !z.obscured && !z.leaveAlone && z.status !== "well_supported" && !maleHoldBack(z, params.sex))
    .sort((a, b) => {
      const ba = boosted.has(a.key) ? 0 : 1;
      const bb = boosted.has(b.key) ? 0 : 1;
      return ba - bb || PLAN_ORDER.indexOf(a.key) - PLAN_ORDER.indexOf(b.key);
    });
  const planned = new Set(candidates.map((z) => z.key));

  const items: PlanItem[] = [];
  let started = 0;
  for (const z of candidates) {
    const pricing = ZONE_PRICING[z.key];
    const waitsOn = (WAITS_FOR[z.key] ?? []).filter((k) => planned.has(k));
    let stage: PlanItem["stage"] = "start";
    let why: string;
    if ((firmnessDominant && FIRMNESS_LED.includes(z.key)) || z.cause === "firmness") {
      stage = "review";
      why = `Firming the skin may help here more than volume. Your doctor may suggest ${FIRMNESS_TREATMENT} or a skin-quality treatment first.`;
    } else if (waitsOn.length > 0) {
      stage = "review";
      why = `Often softens once your ${waitsOn.map((k) => ZONES[k].name).join(" and ")} ${waitsOn.length > 1 || ZONES[waitsOn[0]].plural ? "are" : "is"} supported, so we'd review it after.`;
    } else if (started >= MAX_START_AREAS) {
      stage = "review";
      why = "We'd review this once your first areas have settled, so nothing is overdone.";
    } else {
      why = ZONES[z.key].support;
    }
    if (stage === "start") started += 1;
    items.push({
      zone: z.key,
      stage,
      mlMin: pricing.mlMin,
      mlMax: pricing.mlMax,
      volumeText: volumeText(pricing.mlMin, pricing.mlMax),
      priceFrom: pricing.priceFrom,
      priceText: priceText(z.key),
      why,
    });
  }

  // Start-stage items first, then review items (stable within each stage).
  items.sort((a, b) => (a.stage === b.stage ? 0 : a.stage === "start" ? -1 : 1));

  const start = items.filter((i) => i.stage === "start");
  const startMlMin = round1(start.reduce((s, i) => s + i.mlMin, 0));
  const startMlMax = round1(start.reduce((s, i) => s + i.mlMax, 0));
  const reviewFirst =
    params.fillerHistory === "yes_unhappy" || params.priority === "fix_previous";

  return {
    items,
    startMlMin,
    startMlMax,
    offerFits: offerFitsPlan({ startMlMin, startMlMax, startCount: start.length }),
    reviewFirst,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The offer fits when the starting plan is at least 2 ml (or two areas) and within 4 ml. */
export function offerFitsPlan(p: { startMlMin: number; startMlMax: number; startCount: number }): boolean {
  if (!OFFER.active || p.startCount === 0) return false;
  return p.startMlMin <= OFFER.ml && (p.startMlMax >= 2 || p.startCount >= 2);
}

/** "£699 (usually £899)". */
export function offerPriceText(): string {
  return `${formatGbp(OFFER.price)} (usually ${formatGbp(OFFER.was)})`;
}

/**
 * The offer line for the plan preview / NextStepCard, or null when it should
 * not show. Never a countdown, never "limited time".
 */
export function offerLine(plan: PlanPreview): string | null {
  if (!OFFER.active) return null;
  if (plan.offerFits) {
    return `Your starting plan could fit our ${OFFER.name}: ${offerPriceText()}.`;
  }
  if (plan.items.length > 0) {
    return `Planning more than one area? Ask about our ${OFFER.name}: ${offerPriceText()}.`;
  }
  return null;
}

/** Answer-specific line for previous filler, or null. */
export function historyLine(history: FillerHistory | null, priority: Priority | null): string | null {
  if (history === "yes_unhappy" || priority === "fix_previous") {
    return "You told us you'd like previous work looked at. Your doctor will start by reviewing it. Sometimes the best first step is to dissolve it or let it settle before adding anything.";
  }
  if (history === "yes_happy") {
    return "You've had filler before and liked it. Your doctor will check what's still in place, so only what's needed is added.";
  }
  if (history === "not_sure") {
    return "Not sure whether you've had filler before? That's fine. Your doctor will check at your consultation before planning anything.";
  }
  return null;
}

/** The honest non-filler line, shown when skin firmness dominates. */
export const FIRMNESS_LINE = `Your main change looks like skin firmness rather than volume. ${FIRMNESS_TREATMENT} or a skin-quality treatment may suit you better than filler, and your doctor will be honest about that at your consultation.`;

export interface ZoneHelp {
  kind: "leave_alone" | "filler" | "filler_later" | "firmness" | "consultation";
  /** Authoritative heading for the "What could help" block. */
  title: string;
  /** Rule-based detail (volume / price / staging) shown under the heading. */
  detail: string | null;
}

/**
 * "What could help" for one zone — decided by the rules, never by Claude, so
 * the card can't contradict the map or the plan. Claude's tailored sentence is
 * shown underneath only for filler / firmness outcomes.
 */
export function zoneHelp(
  zone: MappedZone,
  ctx: { plan: PlanPreview; sex?: Sex | null },
): ZoneHelp {
  if (zone.obscured) {
    return { kind: "consultation", title: "Checked at your consultation", detail: null };
  }
  if (zone.leaveAlone) {
    return {
      kind: "leave_alone",
      title: zone.appearsFull ? "Leave alone — it already looks full" : "Leave alone",
      detail: null,
    };
  }
  if (maleHoldBack(zone, ctx.sex)) {
    return {
      kind: "leave_alone",
      title: "Usually best left as it is",
      detail: "We'd only add volume here if it had clearly been lost.",
    };
  }
  const item = ctx.plan.items.find((i) => i.zone === zone.key);
  if (!item) return { kind: "consultation", title: "Talk it through at your consultation", detail: null };
  if (/Nu Sculpt/.test(item.why)) {
    return { kind: "firmness", title: `Firming the skin: ${FIRMNESS_TREATMENT} or a skin-quality treatment`, detail: "Filler may not be the answer here." };
  }
  const volume = `${item.volumeText.charAt(0).toUpperCase()}${item.volumeText.slice(1)} · ${item.priceText}`;
  if (item.stage === "review") {
    return { kind: "filler_later", title: "Review once your first areas have settled", detail: `${item.why} If still needed: ${volume.charAt(0).toLowerCase()}${volume.slice(1)}.` };
  }
  return { kind: "filler", title: "Filler, started small", detail: volume };
}
