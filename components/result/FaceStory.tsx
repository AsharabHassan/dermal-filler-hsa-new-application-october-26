"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useWizard } from "@/store/wizard-store";
import { visibleMarkers } from "@/lib/face-regions";
import { STATUS_LABEL, ZONES, mapOrder } from "@/lib/zones";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { STATUS_STYLE, openZone } from "./zone-ui";
import type { AnalyzeResult, ZoneKey } from "@/lib/types";

/**
 * The report's centrepiece: "What's happening to your face" — the structural
 * story for THIS face — set beside the client's own photo with the eight zones
 * pinned on it. Pins open the matching zone card. One orchestrated reveal.
 */
export function FaceStory({ result }: { result: AnalyzeResult }) {
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const landmarks = useWizard((s) => s.landmarks);
  const reduce = useReducedMotion();
  const [active, setActive] = useState<ZoneKey | null>(null);
  const ordered = mapOrder(result.zones);
  const dataUrl = imageBase64 ? `data:${imageMediaType};base64,${imageBase64}` : null;
  const pins = landmarks
    ? ordered.flatMap((zone, i) =>
        visibleMarkers(zone.key, landmarks).map((e, k) => ({ key: `${zone.key}-${k}`, zone, num: i + 1, e })),
      )
    : [];

  return (
    <section aria-labelledby="story-heading" className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-24">
        <h3 id="story-heading" className="font-serif text-[34px] leading-[1.05] text-heading sm:text-[42px]">
          What&rsquo;s happening to your face
        </h3>
        <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-body/85">
          Read from your photo and HSA SkinScan, our own analysis model. Your doctor
          goes through it with you at your consultation.
        </p>

        {result.summary.length > 0 ? (
          <ol className="relative ml-1.5 mt-7 space-y-5 border-l border-peach/35 pl-6">
            {result.summary.map((line, i) => (
              <motion.li
                key={line}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.6, ease: EASE }}
                className="relative font-serif text-[20px] leading-snug text-heading sm:text-[22px]"
              >
                <span
                  aria-hidden
                  className="absolute -left-[29.5px] top-[0.55em] h-[9px] w-[9px] rounded-full border border-peach bg-cream"
                />
                {line}
              </motion.li>
            ))}
          </ol>
        ) : (
          <p className="mt-6 font-serif text-[20px] leading-snug text-heading">{result.narrative.narrative}</p>
        )}
      </div>

      {dataUrl && (
        <figure className="mx-auto w-full max-w-[440px]">
          <div className="relative overflow-hidden rounded-[2.25rem] bg-white p-2 shadow-[0_40px_90px_-50px_rgba(120,90,40,0.55)] ring-1 ring-peach/25">
            <div className="relative overflow-hidden rounded-[1.85rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Your photo with the eight areas mapped" className="block h-auto w-full select-none" draggable={false} />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {pins.map((p, i) => {
                  const st = STATUS_STYLE[p.zone.status];
                  const on = active === p.zone.key;
                  return (
                    <motion.ellipse
                      key={p.key}
                      cx={p.e.cx * 100}
                      cy={p.e.cy * 100}
                      rx={p.e.rx * 100}
                      ry={p.e.ry * 100}
                      fill={p.zone.obscured ? "none" : st.fill}
                      stroke={st.ring}
                      strokeWidth={on ? 2 : 1.1}
                      strokeDasharray={p.zone.obscured || p.zone.leaveAlone ? "3 2.5" : undefined}
                      vectorEffect="non-scaling-stroke"
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.07, duration: 0.5 }}
                    />
                  );
                })}
              </svg>
              {pins.map((p, i) => (
                <motion.button
                  key={p.key}
                  type="button"
                  aria-label={`${ZONES[p.zone.key].label}: ${STATUS_LABEL[p.zone.status]}. Open details`}
                  onClick={() => openZone(p.zone.key)}
                  onMouseEnter={() => setActive(p.zone.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(p.zone.key)}
                  onBlur={() => setActive(null)}
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.07, duration: 0.4, ease: EASE }}
                  className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  style={{ left: `${p.e.cx * 100}%`, top: `${p.e.cy * 100}%` }}
                >
                  <span
                    className={cn(
                      "flex h-[19px] w-[19px] items-center justify-center rounded-full text-[10px] font-semibold shadow ring-1 transition",
                      active === p.zone.key ? "bg-peach-deep text-white ring-white" : "bg-white/95 text-peach-deep ring-peach/60",
                    )}
                  >
                    {p.num}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
          <figcaption className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 text-[12.5px] text-body sm:grid-cols-2 lg:grid-cols-1">
            {ordered.map((z, i) => (
              <button
                key={z.key}
                type="button"
                onClick={() => openZone(z.key)}
                onMouseEnter={() => setActive(z.key)}
                onMouseLeave={() => setActive(null)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-peach/[0.07]"
              >
                <span className="w-4 text-right font-semibold text-peach-deep">{i + 1}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full", z.obscured ? "bg-body/40" : STATUS_STYLE[z.status].dot)} />
                <span className="text-heading">{ZONES[z.key].label}</span>
                <span className="ml-auto text-body/70">{z.obscured ? "Not visible" : STATUS_LABEL[z.status]}</span>
              </button>
            ))}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
