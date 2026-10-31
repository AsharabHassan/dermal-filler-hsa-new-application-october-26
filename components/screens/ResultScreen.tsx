"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Sparkles, Info, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/store/wizard-store";
import { NextStepCard } from "@/components/result/NextStepCard";
import { FaceVolumeMap } from "@/components/result/FaceVolumeMap";
import { LeaveAlonePanel } from "@/components/result/LeaveAlonePanel";
import { PlanPreview } from "@/components/result/PlanPreview";
import { HAS_RESULTS_GALLERY, ResultsGallery } from "@/components/result/ResultsGallery";
import { REVIEWS } from "@/lib/reviews";
import { Testimonials } from "@/components/result/Testimonials";
import { BookingCTA, StickyBookingBar } from "@/components/result/BookingCTA";
import { BookingCalendar } from "@/components/result/BookingCalendar";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { EASE } from "@/lib/motion";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: EASE },
});

/**
 * Report layout (pigmentation-app pattern): Summary → NextStepCard → face map
 * most-affected-first → leave-alone / cause / honesty notes → conservative plan
 * (the recommended-plan pitch, with the offer) → calendar → real results.
 */
export function ResultScreen() {
  const clinic = useClinicLocation();
  const result = useWizard((s) => s.result);
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const landmarks = useWizard((s) => s.landmarks);
  const lead = useWizard((s) => s.lead);
  const [downloading, setDownloading] = useState(false);

  if (!result) return null;
  const { narrative } = result;

  async function downloadReport() {
    if (!result) return;
    setDownloading(true);
    try {
      const { generateReportPdf } = await import("@/lib/report");
      const blob = await generateReportPdf({
        result,
        imageBase64,
        imageMediaType,
        landmarks,
        lead,
        clinicLocation: clinic.key,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const who = lead?.firstName ? `-${lead.firstName}` : "";
      a.download = `Facial-Volume-Scan${who}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      /* best-effort */
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-28 pt-10 sm:pb-10">
      <motion.div {...reveal(0)} className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-peach/30 bg-peach/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-peach-deep">
          <Sparkles size={13} /> Your pre-consultation report
        </span>
        <h2 className="mt-4 font-serif text-[32px] leading-tight text-heading sm:text-[40px]">
          {narrative.headline}
        </h2>
        <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-body">{narrative.narrative}</p>
      </motion.div>

      <motion.div {...reveal(0.1)} className="mt-8">
        <NextStepCard />
      </motion.div>

      {result.makeupDetected && (
        <motion.div
          {...reveal(0.15)}
          className="mt-6 flex items-start gap-2.5 rounded-2xl border border-sage/25 bg-sage/[0.06] px-4 py-3"
        >
          <Info size={16} className="mt-0.5 shrink-0 text-sage-deep" />
          <p className="text-[13px] leading-relaxed text-body">
            <span className="font-semibold text-heading">Makeup noticed.</span>{" "}
            Foundation or contouring can change how shadows and volume read in a
            photo, so your doctor will look again at your consultation.
          </p>
        </motion.div>
      )}

      <motion.div {...reveal(0.2)} className="mt-10">
        <FaceVolumeMap />
      </motion.div>

      <motion.div {...reveal(0.3)} className="mt-8">
        <LeaveAlonePanel result={result} />
      </motion.div>

      <motion.div {...reveal(0.4)} className="mt-10">
        <PlanPreview result={result} />
      </motion.div>

      <motion.div {...reveal(0.5)} className="mt-10">
        <BookingCalendar />
      </motion.div>

      {HAS_RESULTS_GALLERY && (
        <motion.div {...reveal(0.6)} className="mt-10">
          <ResultsGallery />
        </motion.div>
      )}

      {REVIEWS.length > 0 && (
        <motion.div {...reveal(0.7)} className="mt-10">
          <Testimonials />
        </motion.div>
      )}

      <motion.div {...reveal(0.8)} className="mt-10">
        <p className="mb-4 text-center text-[15px] font-medium text-heading">{narrative.encouragement}</p>
        <BookingCTA label="Book my free consultation" showPhone={false} />
      </motion.div>

      <motion.div {...reveal(0.85)} className="mt-4 flex justify-center">
        <Button variant="outline" onClick={downloadReport} disabled={downloading}>
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Preparing your report…
            </>
          ) : (
            <>
              <Download size={16} /> Download your report (PDF)
            </>
          )}
        </Button>
      </motion.div>

      <motion.div {...reveal(0.9)}>
        <DisclaimerBanner className="mt-8" />
      </motion.div>

      <StickyBookingBar label="Book my free consultation" />
    </div>
  );
}
