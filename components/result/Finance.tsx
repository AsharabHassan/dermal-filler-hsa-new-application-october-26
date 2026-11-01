"use client";

import { CalendarHeart, ExternalLink, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FINANCE_OPTIONS, FINANCE_SMALL_PRINT, financeExample, formatPounds, instalment } from "@/lib/finance";
import { scrollToBooking } from "./BookingCalendar";
import type { AnalyzeResult } from "@/lib/types";

/**
 * 0% payment options worked for the client's own plan, so the price on the
 * page above never feels like a wall. Terms are the providers' published
 * headline terms; the small print always shows.
 */
export function Finance({ result }: { result: AnalyzeResult }) {
  const example = financeExample(result.plan);

  return (
    <section aria-labelledby="finance-heading" className="scroll-mt-28 rounded-[2rem] border border-peach/30 bg-white/80 p-6 shadow-soft sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">
        <PiggyBank size={14} /> Spread the cost
      </p>
      <h3 id="finance-heading" className="mt-3 font-serif text-[28px] leading-tight text-heading sm:text-[32px]">
        0% finance on your plan
      </h3>
      <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-body">
        {example.label} {formatPounds(example.amount)} could look like this:
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {FINANCE_OPTIONS.map((o) => {
          const eligible = example.amount >= o.minimum;
          const per = o.instalments ? instalment(example.amount, o.instalments) : null;
          return (
            <li key={o.key} className="flex flex-col rounded-2xl border border-peach/20 bg-cream/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-peach-deep">{o.provider}</p>
              <p className="mt-1 font-serif text-[22px] leading-tight text-heading">
                {per && eligible ? (
                  <>
                    {o.instalments} × {formatPounds(per)}
                  </>
                ) : (
                  o.headline
                )}
              </p>
              <p className="mt-1.5 flex-1 text-[12.5px] leading-snug text-body/85">
                {eligible ? o.detail : `For treatments over ${formatPounds(o.minimum)}: ${o.detail}`}
              </p>
              {o.applyUrl && (
                <a
                  href={o.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-peach-deep underline-offset-4 hover:underline"
                >
                  Apply with {o.provider} <ExternalLink size={12} />
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11.5px] leading-relaxed text-body/70">{FINANCE_SMALL_PRINT}</p>

      <div className="mt-5 flex flex-col items-center gap-2">
        <Button size="lg" className="w-full sm:w-auto" onClick={scrollToBooking}>
          <CalendarHeart size={18} /> Confirm my price at a free consultation
        </Button>
        <p className="text-xs text-body/70">Free · Online · Nothing is booked until you choose</p>
      </div>
    </section>
  );
}
