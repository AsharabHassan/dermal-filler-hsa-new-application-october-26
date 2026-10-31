"use client";

import { MapPin } from "lucide-react";
import { CLINIC } from "@/lib/constants";
import {
  useClinicLocation,
  useSetClinicLocation,
} from "@/components/clinic/ClinicLocationContext";

/** "Your nearest clinic: London | Glasgow" — shown before the scan. */
export function ClinicChooser() {
  const clinic = useClinicLocation();
  const setLocation = useSetClinicLocation();

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-deep">
        <MapPin size={12} /> Your nearest clinic
      </p>
      <div role="group" aria-label="Your nearest clinic" className="mt-2 grid grid-cols-2 gap-2">
        {CLINIC.locations.map((loc) => {
          const on = loc.key === clinic.key;
          return (
            <button
              key={loc.key}
              type="button"
              aria-pressed={on}
              onClick={() => setLocation(loc.key)}
              className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                on
                  ? "border-peach bg-peach text-cream font-semibold"
                  : "border-heading/20 bg-cream text-heading hover:border-peach/60"
              }`}
            >
              {loc.city}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-body/70">
        Your consultation is free and online. Treatment is at the clinic you choose.
      </p>
    </div>
  );
}
