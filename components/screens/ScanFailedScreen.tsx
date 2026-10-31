"use client";

import { motion } from "motion/react";
import { Camera, RefreshCcw, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/store/wizard-store";
import { EASE } from "@/lib/motion";

/**
 * HSA SkinScan is required for the report (owner decision), so when the scan
 * server is unreachable, times out or errors we never show a partial or
 * generic report. Instead: a calm "please try again" with one-tap retry (same
 * photo) or a retake. Answers, consents and any lead details are kept.
 */
export function ScanFailedScreen() {
  const scanFailure = useWizard((s) => s.scanFailure);
  const retryScan = useWizard((s) => s.retryScan);
  const retakePhoto = useWizard((s) => s.retakePhoto);
  const hasPhoto = useWizard((s) => Boolean(s.imageBase64));
  const noFace = scanFailure === "no_face";

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col items-center"
        role="alert"
      >
        <span className="grid h-16 w-16 place-items-center rounded-full border border-peach/30 bg-peach/10 text-peach-deep">
          <ScanFace size={28} />
        </span>
        <h2 className="mt-6 font-serif text-[30px] leading-tight text-heading">
          We couldn&rsquo;t complete your scan
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-body">
          {noFace
            ? "We couldn't find your whole face clearly in this photo. Please retake it facing the camera, in soft, even light, with your hair off your face."
            : "Our scan didn't finish this time, so we haven't produced a report. This is usually temporary. Please try again, or retake your photo."}
        </p>
        <p className="mt-2 text-[13px] text-body/75">
          Your answers and details are saved, so it only takes a moment.
        </p>

        {!noFace && hasPhoto && (
          <Button size="lg" onClick={retryScan} className="mt-8 w-full">
            <RefreshCcw size={18} /> Try again
          </Button>
        )}
        <Button
          size="lg"
          variant={noFace || !hasPhoto ? "primary" : "outline"}
          onClick={retakePhoto}
          className={noFace || !hasPhoto ? "mt-8 w-full" : "mt-3 w-full"}
        >
          <Camera size={18} /> Retake photo
        </Button>
      </motion.div>
    </section>
  );
}
