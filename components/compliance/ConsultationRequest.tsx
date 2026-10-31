"use client";

import { useId } from "react";
import { Check, PhoneCall } from "lucide-react";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { ClinicChooser } from "@/components/clinic/ClinicChooser";
import {
  CALLBACK_PROMISE,
  CONSENT_HEADLINE,
  consultationContactDetail,
} from "@/lib/consultation-consent";

interface ConsultationRequestProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Highlight the box after the client tried to continue without ticking it. */
  invalid?: boolean;
}

/**
 * "What happens next" + the explicit, unticked-by-default request for our team
 * to contact the client. Shown before the scan so nobody is surprised by the
 * call: the scan is the start of a consultation, not a free AI toy.
 */
export function ConsultationRequest({ checked, onChange, invalid }: ConsultationRequestProps) {
  const clinic = useClinicLocation();
  const id = useId();
  const steps = [
    "Scan your face",
    "Get your report",
    `Our ${clinic.city} team calls you`,
    "Free consultation",
  ];

  return (
    <div
      id="consultation-request"
      className={`rounded-2xl border p-4 transition ${
        invalid && !checked
          ? "border-peach bg-peach/[0.12]"
          : "border-peach/30 bg-peach/[0.06]"
      }`}
    >
      <ClinicChooser />

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-deep">
        What happens next
      </p>
      <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] text-heading sm:grid-cols-4">
        {steps.map((label, i) => (
          <li key={label} className="flex items-start gap-2">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                i === 2 ? "bg-peach text-cream" : "border border-peach/60 text-peach-deep"
              }`}
            >
              {i === 2 ? <PhoneCall size={10} /> : i + 1}
            </span>
            <span className={`leading-snug ${i === 2 ? "font-semibold" : ""}`}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] leading-relaxed text-body">
        This scan is the first step of your free online consultation. Once your
        report is ready, a member of our team will call you {CALLBACK_PROMISE}{" "}
        to go through it and book your consultation.
      </p>

      <label
        htmlFor={id}
        className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3.5 transition ${
          checked || invalid ? "border-peach" : "border-sage/30 hover:border-peach/60"
        }`}
      >
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={invalid && !checked ? true : undefined}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-peach peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-cream ${
              checked ? "border-peach bg-peach text-cream" : "border-heading/50 bg-cream"
            }`}
          >
            {checked && <Check size={14} strokeWidth={3} />}
          </span>
        </span>
        <span className="text-sm leading-relaxed text-heading">
          <strong>{CONSENT_HEADLINE}</strong>{" "}
          {consultationContactDetail(clinic.city)}
        </span>
      </label>
      {invalid && !checked && (
        <p role="alert" className="mt-2 text-xs font-semibold text-peach-deep">
          Please tick the box to start your scan. The scan is part of your free
          consultation, so our team needs to be able to contact you.
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-body/65">
        This is how we arrange the consultation you&rsquo;re asking for, not
        marketing. You can tell us to stop at any time.
      </p>
    </div>
  );
}
