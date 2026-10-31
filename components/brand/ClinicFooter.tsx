"use client";

import { Phone, Mail, Clock, Globe, MessageCircle } from "lucide-react";
import { CLINIC, DISCLAIMER } from "@/lib/constants";
import { Logo } from "./Logo";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";

export function ClinicFooter() {
  const activeClinic = useClinicLocation();
  const clinics = [
    activeClinic,
    ...CLINIC.locations.filter((clinic) => clinic.key !== activeClinic.key),
  ];

  return (
    <footer className="mt-auto border-t border-peach/15 bg-ivory-deep px-6 py-12 text-body">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo withByline />
          <p className="mt-4 text-sm leading-relaxed text-body/75">
            {CLINIC.tagline}. Only GMC-registered doctors inject.
          </p>
        </div>

        <div className="space-y-4 text-sm">
          <p className="font-serif text-base text-heading">Our clinics</p>
          {clinics.map((loc) => (
            <div key={loc.city} className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-peach-deep">
                {loc.city}
              </p>
              {loc.lines.map((l) => (
                <p key={l} className="text-body/80">
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-serif text-base text-heading">Get in touch</p>
          <a
            href={activeClinic.phoneHref}
            className="flex items-center gap-2 text-body transition hover:text-peach-deep"
          >
            <Phone size={14} /> {activeClinic.phone}
          </a>
          <a
            href={CLINIC.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-body transition hover:text-peach-deep"
          >
            <MessageCircle size={14} /> WhatsApp {CLINIC.whatsapp}
          </a>
          <a
            href={`mailto:${CLINIC.email}`}
            className="flex items-center gap-2 text-body transition hover:text-peach-deep"
          >
            <Mail size={14} /> {CLINIC.email}
          </a>
          <a
            href={CLINIC.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-body transition hover:text-peach-deep"
          >
            <Globe size={14} /> harleystreetaesthetic.co.uk
          </a>
          <p className="flex items-center gap-2 text-body/75">
            <Clock size={14} /> {CLINIC.hours}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-5xl border-t border-peach/20 pt-6">
        <p className="text-xs leading-relaxed text-body/70">{DISCLAIMER}</p>
        <p className="mt-3 text-xs text-body/60">
          © {CLINIC.name} · {CLINIC.byline}
        </p>
      </div>
    </footer>
  );
}
