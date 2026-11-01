"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWizard } from "@/store/wizard-store";
import { aiAfterImage, previewAvailable } from "@/lib/ai-preview";
import { ZONES, joinNames } from "@/lib/zones";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import type { AnalyzeResult, ZoneKey } from "@/lib/types";

export const PREVIEW_CAPTION =
  "AI illustration of a subtle possible result, not a guarantee. Results vary; your doctor confirms what's suitable.";

/** Zones the illustration may touch: start-stage filler zones only (max 3). */
export function previewZones(result: AnalyzeResult): ZoneKey[] {
  return result.plan.items
    .filter((i) => i.stage === "start" && !/Nu Sculpt/.test(i.why))
    .map((i) => i.zone)
    .slice(0, 3);
}

type State = "checking" | "hidden" | "loading" | "ready";

/**
 * "See the possible difference" on the client's own photo. Loads after the
 * report renders, never blocks it, and stays hidden when the server has no
 * preview key, the edit fails, or the edit drifts from the original photo.
 */
export function PersonalPreview({ result }: { result: AnalyzeResult }) {
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const sex = useWizard((s) => s.sex);
  const landmarks = useWizard((s) => s.landmarks);
  const zones = useMemo(() => previewZones(result), [result]);
  const [state, setState] = useState<State>("checking");
  const [after, setAfter] = useState<{ src: string; ratio: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!imageBase64 || zones.length === 0) {
        setState("hidden");
        return;
      }
      if (!(await previewAvailable())) {
        if (!cancelled) setState("hidden");
        return;
      }
      if (cancelled) return;
      setState("loading");
      const img = await aiAfterImage(imageBase64, imageMediaType, zones, sex, landmarks);
      if (cancelled) return;
      if (img) {
        setAfter({ src: img.dataUrl, ratio: `${img.width} / ${img.height}` });
        setState("ready");
      } else {
        setState("hidden");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageBase64, imageMediaType, zones, sex, landmarks]);

  if (state === "hidden" || state === "checking" || !imageBase64) return null;
  const before = `data:${imageMediaType};base64,${imageBase64}`;
  const areas = joinNames(zones.map((z) => ZONES[z].name));

  return (
    <section aria-labelledby="preview-heading" className="rounded-[2rem] bg-white/90 p-5 ring-1 ring-peach/30 sm:p-7">
      <h3 id="preview-heading" className="font-serif text-[28px] leading-tight text-heading sm:text-[34px]">
        See the possible difference
      </h3>
      <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-body">
        A subtle illustration on your own photo, limited to your {areas}. Everything else is left exactly as it is.
      </p>
      <div className="mx-auto mt-5 max-w-[420px]">
        {state === "ready" && after ? (
          <BeforeAfterSlider beforeSrc={before} afterSrc={after.src} area="your photo" ratio={after.ratio} />
        ) : (
          <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-cream-deep/70 px-6 text-center">
            <p className="flex flex-col items-center gap-3 text-sm text-body">
              <Loader2 size={22} className="animate-spin text-peach-deep" />
              Creating your personal illustration. This can take up to a minute; the rest of your report is ready below.
            </p>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-body/70">{PREVIEW_CAPTION}</p>
    </section>
  );
}
