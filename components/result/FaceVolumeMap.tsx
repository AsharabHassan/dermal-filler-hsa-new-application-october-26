"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ScanFace, Leaf } from "lucide-react";
import { useWizard } from "@/store/wizard-store";
import { visibleMarkers, zoneRect, type NormEllipse } from "@/lib/face-regions";
import { cropImage } from "@/lib/crop";
import { STATUS_LABEL, ZONES, mapOrder } from "@/lib/zones";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MappedZone, ZoneKey, ZoneStatus } from "@/lib/types";

export const STATUS_STYLE: Record<ZoneStatus, { chip: string; ring: string; fill: string }> = {
  well_supported: {
    chip: "bg-sage/15 text-sage-deep border-sage/40",
    ring: "rgba(97,118,108,0.85)",
    fill: "rgba(159,176,166,0.18)",
  },
  some_change: {
    chip: "bg-peach/10 text-peach-deep border-peach/40",
    ring: "rgba(194,154,58,0.9)",
    fill: "rgba(226,196,122,0.22)",
  },
  noticeable_change: {
    chip: "bg-peach/20 text-peach-deep border-peach-deep/60",
    ring: "rgba(154,116,38,1)",
    fill: "rgba(194,154,58,0.28)",
  },
};

export function StatusChip({ zone }: { zone: MappedZone }) {
  if (zone.obscured) {
    return (
      <span className="inline-flex rounded-full border border-body/20 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-body/80">
        Checked at consultation
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_STYLE[zone.status].chip,
      )}
    >
      {STATUS_LABEL[zone.status]}
    </span>
  );
}

interface Pin {
  key: string;
  zone: MappedZone;
  num: number;
  e: NormEllipse;
}

/**
 * The Volume & Structure Map: the visitor's OWN selfie with the eight zones
 * marked (computed on-device from the MediaPipe mesh), numbered most-affected
 * first, each with its status and a close-up. Leave-alone zones are shown too —
 * that is the point of the report. Renders the cards alone if the face mesh
 * didn't load.
 */
export function FaceVolumeMap() {
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const landmarks = useWizard((s) => s.landmarks);
  const zones = useWizard((s) => s.result?.zones);
  const ordered = useMemo(() => (zones ? mapOrder(zones) : []), [zones]);
  const [crops, setCrops] = useState<Partial<Record<ZoneKey, string | null>>>({});
  const [active, setActive] = useState<ZoneKey | null>(null);
  const cardRefs = useRef<Partial<Record<ZoneKey, HTMLDivElement | null>>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!imageBase64 || !landmarks) return;
      const out: Partial<Record<ZoneKey, string | null>> = {};
      for (const z of ordered) {
        const rect = zoneRect(z.key, landmarks);
        out[z.key] = rect ? await cropImage(imageBase64, imageMediaType, rect) : null;
      }
      if (!cancelled) setCrops(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageBase64, imageMediaType, landmarks, ordered]);

  if (!zones) return null;
  const dataUrl = imageBase64 ? `data:${imageMediaType};base64,${imageBase64}` : null;
  const pins: Pin[] = landmarks
    ? ordered.flatMap((zone, i) =>
        visibleMarkers(zone.key, landmarks).map((e, k) => ({ key: `${zone.key}-${k}`, zone, num: i + 1, e })),
      )
    : [];

  return (
    <div>
      <div className="flex items-center justify-center gap-2 text-center">
        <ScanFace size={16} className="text-peach-deep" />
        <h3 className="font-serif text-2xl text-heading">Your Volume &amp; Structure Map</h3>
      </div>
      <p className="mx-auto mt-1 max-w-md text-center text-[13px] leading-relaxed text-body/80">
        Eight areas, mapped from your own photo on your device. The areas with
        the most change are numbered first, and the ones we&rsquo;d leave alone
        are marked too.
      </p>

      {dataUrl && pins.length > 0 && (
        <div className="mt-6 flex justify-center">
          <motion.figure
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative w-full max-w-[min(86vw,380px)] overflow-hidden rounded-[2rem] border border-peach/30 bg-white shadow-soft"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="Your photo with the eight areas mapped" className="block h-auto w-full select-none" draggable={false} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {pins.map((p, i) => {
                const style = STATUS_STYLE[p.zone.status];
                const isActive = active === p.zone.key;
                return (
                  <motion.g key={p.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.06 }}>
                    {!p.zone.obscured && (
                      <ellipse cx={p.e.cx * 100} cy={p.e.cy * 100} rx={p.e.rx * 100} ry={p.e.ry * 100} fill={style.fill} opacity={isActive ? 1 : 0.7} />
                    )}
                    <ellipse
                      cx={p.e.cx * 100}
                      cy={p.e.cy * 100}
                      rx={p.e.rx * 100}
                      ry={p.e.ry * 100}
                      fill="none"
                      stroke={style.ring}
                      strokeWidth={isActive ? 2 : 1.1}
                      strokeDasharray={p.zone.obscured || p.zone.leaveAlone ? "3 2.5" : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
                  </motion.g>
                );
              })}
            </svg>
            {pins.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-label={`${ZONES[p.zone.key].label} — ${STATUS_LABEL[p.zone.status]}`}
                onClick={() => {
                  setActive(p.zone.key);
                  cardRefs.current[p.zone.key]?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                onMouseEnter={() => setActive(p.zone.key)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.e.cx * 100}%`, top: `${p.e.cy * 100}%` }}
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-semibold shadow ring-1",
                    active === p.zone.key ? "bg-peach text-white ring-white" : "bg-white/90 text-peach-deep ring-peach/70",
                  )}
                >
                  {p.num}
                </span>
              </button>
            ))}
          </motion.figure>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ordered.map((z, i) => {
          const meta = ZONES[z.key];
          return (
            <motion.div
              key={z.key}
              ref={(el) => {
                cardRefs.current[z.key] = el;
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: EASE }}
              onMouseEnter={() => setActive(z.key)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "flex gap-3 rounded-2xl border p-3 transition-colors",
                active === z.key ? "border-peach/60 bg-peach/[0.07]" : "border-peach/20 bg-white/80",
              )}
            >
              <div className="relative shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-peach/25 bg-cream-deep sm:h-20 sm:w-20">
                  {crops[z.key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={crops[z.key]!} alt={`Close-up of your ${meta.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-peach/60">
                      <ScanFace size={20} />
                    </div>
                  )}
                </div>
                <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-peach text-[11px] font-semibold text-white shadow">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-serif text-[16px] text-heading">{meta.label}</p>
                  <StatusChip zone={z} />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-body">
                  {z.obscured
                    ? "Hidden in your photo, so your doctor will look at this area at your consultation."
                    : z.note || meta.looksLike}
                </p>
                {z.leaveAlone && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-sage-deep">
                    <Leaf size={12} /> {z.appearsFull ? "Already full — we wouldn't add more" : "We'd leave this alone"}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11.5px] text-body/65">
        An indication from your photo, not a measurement. There is no score —
        just where support has changed, and where it hasn&rsquo;t.
      </p>
    </div>
  );
}
