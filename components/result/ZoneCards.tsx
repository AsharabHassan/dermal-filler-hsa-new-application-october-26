"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Leaf, ScanFace } from "lucide-react";
import { useWizard } from "@/store/wizard-store";
import { ZONES } from "@/lib/zones";
import { zoneHelp, maleHoldBack } from "@/lib/plan";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import {
  REAL_PATIENT_CAPTION,
  StatusChip,
  ZONE_BEFORE_AFTER,
  useOpenZone,
  useZoneCrops,
} from "./zone-ui";
import type { AnalyzeResult, MappedZone } from "@/lib/types";

function Crop({ src, label, size }: { src: string | null | undefined; label: string; size: "lg" | "sm" }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-2xl bg-cream-deep ring-1 ring-peach/25",
        size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-14 w-14",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Close-up of your ${label}`} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-peach/60">
          <ScanFace size={size === "lg" ? 26 : 18} />
        </div>
      )}
    </div>
  );
}

/** A focus zone: what we see, why it happens, what could help, what filler could do, the difference. */
function FocusZoneCard({
  zone,
  num,
  result,
  crop,
  defaultOpen,
}: {
  zone: MappedZone;
  num: number;
  result: AnalyzeResult;
  crop: string | null | undefined;
  defaultOpen: boolean;
}) {
  const sex = useWizard((s) => s.sex);
  const [open, setOpen] = useState(defaultOpen);
  useOpenZone(zone.key, useCallback(() => setOpen(true), []));
  const meta = ZONES[zone.key];
  const help = zoneHelp(zone, { plan: result.plan, sex });
  const heldBack = maleHoldBack(zone, sex);
  const fillerLed = help.kind === "filler" || help.kind === "filler_later";
  const benefit = fillerLed && !heldBack ? zone.benefit || meta.benefit : "";
  const pair = fillerLed && !heldBack ? ZONE_BEFORE_AFTER[zone.key]?.[0] : undefined;
  const bodyId = `zone-${zone.key}-body`;

  return (
    <article
      id={`zone-${zone.key}`}
      className="scroll-mt-24 overflow-hidden rounded-[1.9rem] bg-white/90 shadow-[0_30px_70px_-55px_rgba(120,90,40,0.6)] ring-1 ring-peach/25"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left sm:gap-5 sm:p-6"
      >
        <div className="relative">
          <Crop src={crop} label={meta.label.toLowerCase()} size="lg" />
          <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-peach-deep text-[11px] font-semibold text-white shadow">
            {num}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-serif text-[26px] leading-tight text-heading sm:text-[30px]">{meta.label}</h4>
            <StatusChip zone={zone} />
          </div>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{zone.see || meta.looksLike}</p>
        </div>
        <ChevronDown
          size={20}
          className={cn("mt-2 shrink-0 text-peach-deep transition-transform duration-300", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-peach/15 px-5 pb-6 pt-5 sm:px-6">
              <dl className="grid gap-5 md:grid-cols-3 md:gap-6">
                <div>
                  <dt className="font-serif text-[17px] italic text-peach-deep">What we see</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-body">{zone.see || meta.looksLike}</dd>
                </div>
                <div>
                  <dt className="font-serif text-[17px] italic text-peach-deep">Why it happens</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-body">{zone.why || meta.cause}</dd>
                </div>
                <div>
                  <dt className="font-serif text-[17px] italic text-peach-deep">What could help</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-body">
                    <span className="block font-semibold text-heading">{help.title}</span>
                    {help.detail && <span className="mt-1 block">{help.detail}</span>}
                    {(help.kind === "filler" || help.kind === "firmness") && zone.help && (
                      <span className="mt-1 block">{zone.help}</span>
                    )}
                  </dd>
                </div>
              </dl>

              {benefit && (
                <blockquote className="mt-6 rounded-2xl bg-gradient-to-r from-peach/[0.12] to-transparent px-5 py-4">
                  <p className="text-[12.5px] font-semibold text-peach-deep">What filler could do here</p>
                  <p className="mt-1 font-serif text-[21px] leading-snug text-heading sm:text-[23px]">{benefit}</p>
                  <p className="mt-2 text-[11.5px] text-body/70">
                    Subtle and temporary, built up gradually. Results vary; your doctor confirms what&rsquo;s suitable.
                  </p>
                </blockquote>
              )}

              {pair && (
                <figure className="mt-6">
                  <BeforeAfterSlider beforeSrc={pair.before} afterSrc={pair.after} area={meta.label.toLowerCase()} ratio="2752 / 1536" />
                  <figcaption className="mt-2 text-center text-[11.5px] text-body/70">{REAL_PATIENT_CAPTION}</figcaption>
                </figure>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/** Focus zones (change worth discussing), most-affected first. The first opens by default. */
export function FocusZones({ result }: { result: AnalyzeResult }) {
  const zones = result.focusZones
    .map((k) => result.zones.find((z) => z.key === k))
    .filter((z): z is MappedZone => Boolean(z));
  const crops = useZoneCrops(zones.map((z) => z.key));
  if (zones.length === 0) return null;

  return (
    <section aria-labelledby="focus-heading">
      <h3 id="focus-heading" className="font-serif text-[30px] leading-tight text-heading sm:text-[36px]">
        Where your face has changed
      </h3>
      <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-body">
        Area by area: what we see in your photo, why it happens, and what could help.
      </p>
      <div className="mt-6 space-y-4">
        {zones.map((z, i) => (
          <FocusZoneCard key={z.key} zone={z} num={i + 1} result={result} crop={crops[z.key]} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

/** Leave-alone and covered zones, as calm compact cards. */
export function SupportedZones({ result }: { result: AnalyzeResult }) {
  const zones = result.zones.filter((z) => z.leaveAlone || z.obscured);
  const crops = useZoneCrops(zones.map((z) => z.key));
  if (zones.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {zones.map((z) => {
        const meta = ZONES[z.key];
        return (
          <div
            key={z.key}
            id={`zone-${z.key}`}
            className="flex scroll-mt-24 gap-3 rounded-2xl bg-white/80 p-3.5 ring-1 ring-sage/25"
          >
            <Crop src={crops[z.key]} label={meta.label.toLowerCase()} size="sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-serif text-[17px] text-heading">{meta.label}</p>
                <StatusChip zone={z} />
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-body">
                {z.obscured ? "Hidden in your photo, so your doctor will look at this area at your consultation." : z.see || meta.looksLike}
              </p>
              {z.leaveAlone && (
                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-sage-deep">
                  <Leaf size={12} /> {z.appearsFull ? "Already looks full — we wouldn't add more" : "We'd leave this alone"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
