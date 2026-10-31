"use client";

import { motion } from "motion/react";
import { Camera, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/store/wizard-store";
import { EASE } from "@/lib/motion";

/**
 * Shown when the photo didn't clearly capture the whole face in even
 * light — what an accurate read needs. We ask for a camera retake rather than
 * presenting a read we can't stand behind. A subtle escape hatch lets the
 * determined user continue to a (gently-worded) result anyway.
 */
export function RetakeScreen() {
  const retakePhoto = useWizard((s) => s.retakePhoto);
  const goToStep = useWizard((s) => s.goToStep);

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col items-center"
      >
        <span className="grid h-16 w-16 place-items-center rounded-full border border-peach/30 bg-peach/10 text-peach-deep shadow-[0_0_40px_-12px_rgba(194,154,58,0.45)]">
          <ScanFace size={28} />
        </span>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-peach/30 bg-peach/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-peach-deep">
          Let&rsquo;s try once more
        </span>
        <h2 className="mt-4 font-serif text-[30px] leading-tight text-heading">
          A clearer photo, please
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-body">
          We couldn&rsquo;t clearly see{" "}
          <span className="font-medium text-heading">
            your whole face in even light
          </span>{" "}
          — which is what an accurate read needs. Retake your photo with the{" "}
          <span className="font-medium text-heading">camera</span>, looking
          straight at it with a relaxed face, in soft, even light (a window works
          well), with your hair off your forehead and temples.
        </p>

        <Button size="lg" onClick={retakePhoto} className="mt-8 w-full">
          <Camera size={18} /> Retake with the camera
        </Button>
        <button
          type="button"
          onClick={() => goToStep("lead")}
          className="mt-4 text-[13px] font-medium text-body/55 underline-offset-4 transition hover:text-peach-deep"
        >
          See my result anyway
        </button>
      </motion.div>
    </section>
  );
}
