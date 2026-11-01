"use client";

import { BadgeCheck, CalendarHeart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { GMC_REGISTER_URL, doctorsFor, teamPageUrl } from "@/lib/doctors";
import { scrollToBooking } from "./BookingCalendar";

/**
 * The doctors behind the consultation. Only GMC-registered doctors inject at
 * HSA; this shows who they are for the client's clinic, with the published
 * role, qualifications and focus, and where to verify registration.
 */
export function Doctors() {
  const clinic = useClinicLocation();
  const doctors = doctorsFor(clinic.key);

  return (
    <section aria-labelledby="doctors-heading" className="scroll-mt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">Your doctors</p>
      <h3 id="doctors-heading" className="mt-2 font-serif text-[28px] leading-tight text-heading sm:text-[34px]">
        Only GMC-registered doctors inject at Harley Street Aesthetics
      </h3>
      <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-body">
        Your free consultation, and any treatment you choose, is with a doctor from our {clinic.city} team.
        Not a nurse, not a beautician.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {doctors.map((d) => (
          <li key={d.name} className="flex gap-4 rounded-[1.5rem] border border-peach/25 bg-white/80 p-4 shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element -- local, fixed-size portrait */}
            <img
              src={d.photo}
              alt={`${d.name}, ${d.role}`}
              width={72}
              height={72}
              loading="lazy"
              className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover ring-1 ring-peach/30"
            />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[18px] leading-tight text-heading">{d.name}</p>
              <p className="mt-0.5 text-[13px] text-body">
                {d.role}
                {d.qualifications ? `, ${d.qualifications}` : ""}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-peach/[0.12] px-2 py-0.5 text-[11px] font-semibold text-peach-deep">
                <BadgeCheck size={12} /> GMC registered{d.gmc ? ` · ${d.gmc}` : ""}
              </p>
              {d.note && <p className="mt-2 text-[12.5px] leading-snug text-body/85">{d.note}</p>}
              <p className="mt-2 text-[11.5px] leading-snug text-body/70">{d.focus.join(" · ")}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-col items-start gap-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={teamPageUrl(clinic.key)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-peach-deep underline-offset-4 hover:underline">
            Meet the full team <ExternalLink size={12} />
          </a>
          <a href={GMC_REGISTER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-body/80 underline-offset-4 hover:underline">
            Check any doctor on the GMC register <ExternalLink size={12} />
          </a>
        </span>
        <Button size="lg" className="w-full sm:w-auto" onClick={scrollToBooking}>
          <CalendarHeart size={18} /> Book my free consultation
        </Button>
      </div>
    </section>
  );
}
