"use client";

import { useEffect, useState } from "react";
import { useWizard } from "@/store/wizard-store";
import { zoneRect } from "@/lib/face-regions";
import { cropImage } from "@/lib/crop";
import { STATUS_LABEL } from "@/lib/zones";
import { cn } from "@/lib/utils";
import type { MappedZone, ZoneKey, ZoneStatus } from "@/lib/types";

export const STATUS_STYLE: Record<ZoneStatus, { chip: string; ring: string; fill: string; dot: string }> = {
  well_supported: {
    chip: "bg-sage/12 text-sage-deep ring-sage/35",
    ring: "rgba(97,118,108,0.9)",
    fill: "rgba(159,176,166,0.16)",
    dot: "bg-sage-deep",
  },
  some_change: {
    chip: "bg-peach/10 text-peach-deep ring-peach/40",
    ring: "rgba(194,154,58,0.95)",
    fill: "rgba(226,196,122,0.2)",
    dot: "bg-peach",
  },
  noticeable_change: {
    chip: "bg-peach/20 text-[#7a5a17] ring-peach-deep/50",
    ring: "rgba(154,116,38,1)",
    fill: "rgba(194,154,58,0.26)",
    dot: "bg-peach-deep",
  },
};

export function StatusChip({ zone, className }: { zone: MappedZone; className?: string }) {
  const covered = zone.obscured;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1",
        covered ? "bg-white text-body/80 ring-body/20" : STATUS_STYLE[zone.status].chip,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", covered ? "bg-body/40" : STATUS_STYLE[zone.status].dot)} />
      {covered ? "Checked at consultation" : STATUS_LABEL[zone.status]}
    </span>
  );
}

/** Close-up crops of every zone from the client's own photo (on-device). */
export function useZoneCrops(keys: ZoneKey[]): Partial<Record<ZoneKey, string | null>> {
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const landmarks = useWizard((s) => s.landmarks);
  const [crops, setCrops] = useState<Partial<Record<ZoneKey, string | null>>>({});
  const sig = keys.join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!imageBase64 || !landmarks) return;
      const out: Partial<Record<ZoneKey, string | null>> = {};
      for (const k of sig.split(",").filter(Boolean) as ZoneKey[]) {
        const rect = zoneRect(k, landmarks);
        out[k] = rect ? await cropImage(imageBase64, imageMediaType, rect) : null;
      }
      if (!cancelled) setCrops(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageBase64, imageMediaType, landmarks, sig]);

  return crops;
}

const OPEN_EVENT = "hsa-open-zone";

/** Ask a zone card to open and scroll into view (from a map pin). */
export function openZone(key: ZoneKey): void {
  window.dispatchEvent(new CustomEvent<ZoneKey>(OPEN_EVENT, { detail: key }));
  document.getElementById(`zone-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Subscribe a card to "open" requests for its zone. */
export function useOpenZone(key: ZoneKey, onOpen: () => void): void {
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<ZoneKey>).detail === key) onOpen();
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [key, onOpen]);
}

/** Real HSA before/after for a zone, where the clinic has one. */
export const ZONE_BEFORE_AFTER: Partial<Record<ZoneKey, { before: string; after: string }[]>> = {
  lips: [
    { before: "/results/lips1-before.webp", after: "/results/lips1-after.webp" },
    { before: "/results/lips2-before.webp", after: "/results/lips2-after.webp" },
  ],
  teartrough: [
    { before: "/results/teartrough1-before.webp", after: "/results/teartrough1-after.webp" },
    { before: "/results/teartrough2-before.webp", after: "/results/teartrough2-after.webp" },
  ],
};

export const REAL_PATIENT_CAPTION = "Real HSA patient. Image quality enhanced. Results vary.";
