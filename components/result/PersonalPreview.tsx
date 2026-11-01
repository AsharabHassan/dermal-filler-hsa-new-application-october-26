"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWizard } from "@/store/wizard-store";
import { aiAfterImage, previewAvailable } from "@/lib/ai-preview";
import { estimatedProgress } from "@/lib/preview-progress";
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
  const [progress, setProgress] = useState(0);

  // Estimated progress while the model works; 100 only once the picture is in.
  useEffect(() => {
    if (state !== "loading") return;
    const started = Date.now();
    const id = window.setInterval(() => setProgress(estimatedProgress(Date.now() - started)), 250);
    return () => window.clearInterval(id);
  }, [state]);

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
      setProgress(0);
      setState("loading");
      const img = await aiAfterImage(imageBase64, imageMediaType, zones, sex, landmarks);
      if (cancelled) return;
      if (img) {
        setProgress(100);
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
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream-deep/70"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Creating your before and after"
          >
            {/* The client's own photo, dimmed, with the estimate on top. */}
            <img src={before} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[2px]" />
            <div className="absolute inset-0 grid place-items-center bg-cream/60 px-6 text-center">
              <div className="w-full max-w-[260px]">
                <p className="flex items-center justify-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-peach-deep">
                  <Loader2 size={16} className="animate-spin" />
                  Creating your before &amp; after
                </p>
                <p className="mt-3 font-serif text-[56px] leading-none text-heading tabular-nums">{progress}%</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-peach/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-peach-light to-peach transition-[width] duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-body">
                  Usually about 30 seconds. The rest of your report is ready below.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-body/70">{PREVIEW_CAPTION}</p>
    </section>
  );
}
