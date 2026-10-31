"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Info, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/store/wizard-store";
import { NextStepCard } from "@/components/result/NextStepCard";
import { FaceStory } from "@/components/result/FaceStory";
import { FocusZones, SupportedZones } from "@/components/result/ZoneCards";
import { PersonalPreview } from "@/components/result/PersonalPreview";
import { ScanMeasurements } from "@/components/result/ScanMeasurements";
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
 * Report order (owner-specified): NextStepCard (finding + offer) → What's
 * happening to your face + photo/zone map → focus zone cards (what filler could
 * do + real before/after) → personal AI preview → leave-alone zones → scan
 * measurements → plan + offer → calendar. It should read like a bespoke
 * consultation document.
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
    <div className="mx-auto w-full max-w-5xl px-5 pb-28 pt-10 sm:px-8 sm:pb-12">
      <motion.header {...reveal(0)} className="mx-auto max-w-2xl text-center">
        <p className="font-serif text-[17px] italic text-peach-deep">
          Your pre-consultation report{lead?.firstName ? ` for ${lead.firstName}` : ""}
        </p>
        <h2 className="mt-3 font-serif text-[36px] leading-[1.05] text-heading sm:text-[48px]">{narrative.headline}</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-body">{narrative.narrative}</p>
      </motion.header>

      <motion.div {...reveal(0.1)} className="mx-auto mt-10 max-w-3xl">
        <NextStepCard />
      </motion.div>

      <motion.div {...reveal(0.2)} className="mt-16 sm:mt-20">
        <FaceStory result={result} />
      </motion.div>

      {result.makeupDetected && (
        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-2.5 rounded-2xl bg-sage/[0.08] px-4 py-3 ring-1 ring-sage/25">
          <Info size={16} className="mt-0.5 shrink-0 text-sage-deep" />
          <p className="text-[13px] leading-relaxed text-body">
            <span className="font-semibold text-heading">Makeup noticed.</span> Foundation or contouring can change how
            shadows and volume read in a photo, so your doctor will look again at your consultation.
          </p>
        </div>
      )}

      <div className="mx-auto mt-16 max-w-3xl space-y-16 sm:mt-20 sm:space-y-20">
        <FocusZones result={result} />

        <PersonalPreview result={result} />

        <section aria-labelledby="alone-heading">
          <h3 id="alone-heading" className="font-serif text-[30px] leading-tight text-heading sm:text-[34px]">
            What&rsquo;s holding up well
          </h3>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-body">
            Restore what time took, nothing it didn&rsquo;t. These areas are best left as they are.
          </p>
          <div className="mt-5">
            <SupportedZones result={result} />
          </div>
          <div className="mt-6">
            <LeaveAlonePanel result={result} />
          </div>
        </section>

        <ScanMeasurements measurements={result.measurements} />

        <PlanPreview result={result} />

        <BookingCalendar />

        {HAS_RESULTS_GALLERY && <ResultsGallery />}

        {REVIEWS.length > 0 && <Testimonials />}

        <div>
          <p className="mb-4 text-center font-serif text-[20px] text-heading">{narrative.encouragement}</p>
          <BookingCTA label="Book my free consultation" showPhone={false} />
          <div className="mt-4 flex justify-center">
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
          </div>
          <DisclaimerBanner className="mt-8" />
        </div>
      </div>

      <StickyBookingBar label="Book my free consultation" />
    </div>
  );
}
