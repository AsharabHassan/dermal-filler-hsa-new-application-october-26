"use client";

import { motion } from "motion/react";
import { CalendarHeart, Gift, ShieldCheck, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scrollToBooking } from "./BookingCalendar";
import { ZONES } from "@/lib/zones";
import { offerLine } from "@/lib/plan";
import { TREATMENT_NOTE } from "@/lib/constants";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AnalyzeResult } from "@/lib/types";

const WHY_HSA = [
  "Only GMC-registered doctors inject",
  "Start small and build gradually",
  "Free review appointment to check how it has settled",
  "Results are temporary, usually 9–24 months depending on the area",
];

/**
 * The conservative plan preview (the "recommended plan" pitch): areas in
 * support-first order with suggested starting volumes and "from" prices, the
 * areas to review later, and the current offer. Final plan at consultation.
 */
export function PlanPreview({ result }: { result: AnalyzeResult }) {
  const { plan } = result;
  const start = plan.items.filter((i) => i.stage === "start");
  const later = plan.items.filter((i) => i.stage === "review");
  const offer = offerLine(plan);

  if (plan.items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-sage/30 bg-white/80 p-6 text-center shadow-soft sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">Your plan preview</p>
        <h3 className="mt-3 font-serif text-[26px] leading-tight text-heading">
          Nothing we&rsquo;d rush to add
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-body">
          Your face looks well supported. At your free consultation a doctor can
          talk through skin quality and prevention, and whether anything is worth
          doing at all.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="plan-heading"
      className="relative overflow-hidden rounded-[2rem] border border-peach/40 bg-gradient-to-b from-peach/[0.10] via-white/70 to-white/40 p-6 shadow-soft sm:p-8"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">
        <Sprout size={14} /> Your conservative plan preview
      </p>
      <h3 id="plan-heading" className="mt-3 font-serif text-[28px] leading-tight text-heading sm:text-[32px]">
        {plan.reviewFirst ? "A review first, then only what's needed" : "Start small, build gradually"}
      </h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-body">
        {plan.reviewFirst
          ? "Your doctor starts by looking at any previous filler. If anything is added afterwards, this is where it would usually begin."
          : "Support first, so the areas that follow often need less. This is where a doctor would usually begin."}
      </p>

      <ol className="mt-5 space-y-3">
        {start.map((item, i) => (
          <motion.li
            key={item.zone}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.08 * i, duration: 0.5, ease: EASE }}
            className="rounded-2xl border border-peach/30 bg-white p-4"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-serif text-[19px] text-heading">
                <span className="mr-2 text-peach-deep">{i + 1}.</span>
                {ZONES[item.zone].label}
              </p>
              <p className="text-[13px] font-semibold text-peach-deep">{item.priceText}</p>
            </div>
            <p className="mt-1 text-[13px] font-medium text-heading/80">
              {item.volumeText.charAt(0).toUpperCase() + item.volumeText.slice(1)}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-body">{item.why}</p>
          </motion.li>
        ))}
      </ol>

      {later.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-body/75">
            Reviewed later, only if still needed
          </p>
          <ul className="mt-2 space-y-2">
            {later.map((item) => (
              <li key={item.zone} className="rounded-2xl border border-peach/15 bg-white/70 px-4 py-3 text-[13px] leading-relaxed text-body">
                <span className="font-semibold text-heading">{ZONES[item.zone].label}</span>
                {" · "}
                {item.priceText}
                <span className="block text-body/85">{item.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {start.length > 0 && (
        <p className="mt-4 text-[13px] text-body">
          Suggested starting volume:{" "}
          <span className="font-semibold text-heading">
            {plan.startMlMin === plan.startMlMax ? `${plan.startMlMin} ml` : `${plan.startMlMin}–${plan.startMlMax} ml`}
          </span>{" "}
          in total, built up gradually.
        </p>
      )}

      {offer && (
        <div
          className={cn(
            "mt-5 flex items-start gap-3 rounded-2xl border p-4",
            plan.offerFits ? "border-peach bg-peach/[0.10]" : "border-peach/30 bg-white/80",
          )}
        >
          <Gift size={18} className="mt-0.5 shrink-0 text-peach-deep" />
          <p className="text-[14px] leading-relaxed text-heading">
            {offer}{" "}
            <span className="text-body">Your doctor confirms whether it suits your plan.</span>
          </p>
        </div>
      )}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {WHY_HSA.map((w) => (
          <li key={w} className="flex items-start gap-2 text-[13px] leading-relaxed text-body">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sage-deep" />
            {w}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <Button size="lg" className="w-full sm:w-auto" onClick={scrollToBooking}>
          <CalendarHeart size={18} /> Book my free consultation
        </Button>
      </div>
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-body/65">{TREATMENT_NOTE}</p>
    </section>
  );
}
