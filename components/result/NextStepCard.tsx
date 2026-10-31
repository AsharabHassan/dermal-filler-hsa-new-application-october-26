"use client";

import { CalendarHeart, Check, Gift, Lock, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { JOURNEY } from "@/lib/consultation-journey";
import { scrollToBooking } from "./BookingCalendar";
import { useWizard } from "@/store/wizard-store";
import { CALLBACK_PROMISE } from "@/lib/consultation-consent";
import { findingLine } from "@/lib/finding";
import { offerLine } from "@/lib/plan";

/**
 * Top-of-result framing: the report is step 2 of 4 and the consultation is what
 * turns it into a real plan. Leads with the finding (including what to leave
 * alone), then the journey, the booking CTA, the offer and the call-back
 * promise. Never shows a phone number in the call-back copy.
 */
export function NextStepCard() {
  const clinic = useClinicLocation();
  const result = useWizard((s) => s.result);
  const finding = result ? findingLine(result) : null;
  const offer = result ? offerLine(result.plan) : null;

  return (
    <section
      aria-label="Your next step"
      className="overflow-hidden rounded-[2rem] border border-peach/40 bg-white/80 shadow-soft"
    >
      <div className="border-b border-peach/20 bg-peach/[0.08] px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-deep">
        Step 2 of 4 complete · Your findings are ready
      </div>

      <div className="p-6 sm:p-7">
        <h3 className="font-serif text-[26px] leading-tight text-heading sm:text-[30px]">
          {finding ?? "Your report is ready. Now let's turn it into a plan."}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-body">
          In your free online consultation, a GMC-registered doctor from our{" "}
          {clinic.city}{" "}team goes through your map with you, checks what&rsquo;s
          suitable, and confirms the areas, volume and price. Including what
          we&rsquo;d leave alone.
        </p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-4 sm:gap-2">
          {JOURNEY.map((stage, i) => {
            const done = i < 2;
            const next = i === 2;
            return (
              <li
                key={stage.key}
                className={`flex items-start gap-3 rounded-2xl border px-3 py-3 sm:flex-col sm:gap-2 ${
                  next ? "border-peach bg-peach/[0.10]" : "border-sage/20 bg-transparent"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? "bg-peach text-cream"
                      : next
                        ? "border border-peach-deep text-peach-deep"
                        : "border border-sage/40 text-heading/50"
                  }`}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i < 3 ? i + 1 : <Lock size={11} />}
                </span>
                <span>
                  <span className={`block text-[13px] font-semibold ${next ? "text-heading" : "text-heading/70"}`}>
                    {stage.label}
                    {next && <span className="ml-1.5 text-peach-deep">← you&rsquo;re here</span>}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-body/80">{stage.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" className="w-full sm:w-auto" onClick={scrollToBooking}>
            <CalendarHeart size={18} /> Book my free consultation
          </Button>
          <p className="text-xs text-body/70">Free · Online · No obligation to go ahead</p>
        </div>

        {offer && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-peach/30 bg-peach/[0.06] p-4">
            <Gift size={18} className="mt-0.5 shrink-0 text-peach-deep" />
            <p className="text-sm leading-relaxed text-heading">{offer}</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-sage/25 bg-sage/[0.06] p-4 sm:flex-row sm:items-center">
          <PhoneCall size={20} className="shrink-0 text-peach-deep" />
          <p className="flex-1 text-sm leading-relaxed text-body">
            <span className="font-semibold text-heading">Expect a call {CALLBACK_PROMISE}</span>{" "}
            &mdash; our AI assistant will go through your report and find a
            consultation time that suits you, if you haven&rsquo;t booked yet.
          </p>
        </div>
      </div>
    </section>
  );
}
