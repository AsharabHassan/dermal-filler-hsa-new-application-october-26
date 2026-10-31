"use client";

import { AnimatePresence, motion } from "motion/react";
import { useWizard } from "@/store/wizard-store";
import { Logo } from "@/components/brand/Logo";
import { ClinicFooter } from "@/components/brand/ClinicFooter";
import { ProgressRail } from "./ProgressRail";
import { StepTransition } from "./StepTransition";
import { HeroScreen } from "@/components/screens/HeroScreen";
import { ConsentCaptureScreen } from "@/components/screens/ConsentCaptureScreen";
import { ScanScreen } from "@/components/screens/ScanScreen";
import { RetakeScreen } from "@/components/screens/RetakeScreen";
import { ScanFailedScreen } from "@/components/screens/ScanFailedScreen";
import { LeadGateScreen } from "@/components/screens/LeadGateScreen";
import { ResultScreen } from "@/components/screens/ResultScreen";
import {
  ClinicLocationProvider,
  useClinicFromRoute,
  useClinicLocation,
} from "@/components/clinic/ClinicLocationContext";
import type { ClinicLocationKey } from "@/lib/constants";
import styles from "./AnalysisExperience.module.css";

const SCREENS = {
  hero: HeroScreen,
  consent: ConsentCaptureScreen,
  scan: ScanScreen,
  retake: RetakeScreen,
  scanfailed: ScanFailedScreen,
  lead: LeadGateScreen,
  result: ResultScreen,
} as const;

export function WizardShell({
  clinicLocation,
}: {
  clinicLocation?: ClinicLocationKey;
}) {
  return (
    <ClinicLocationProvider location={clinicLocation}>
      <WizardJourney />
    </ClinicLocationProvider>
  );
}

function WizardJourney() {
  const step = useWizard((s) => s.step);
  const Screen = SCREENS[step];
  const showFooter = step === "hero" || step === "result";

  return (
    <div className={`${styles.experience} flex min-h-dvh flex-col overflow-x-hidden`} data-analysis-step={step}>
      <Header hero={step === "hero"} step={step} />

      <main className="flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          <StepTransition key={step}>
            <Screen />
          </StepTransition>
        </AnimatePresence>
      </main>

      {showFooter && <ClinicFooter />}
    </div>
  );
}

function Header({
  hero,
  step,
}: {
  hero: boolean;
  step: ReturnType<typeof useWizard.getState>["step"];
}) {
  const clinic = useClinicLocation();
  const cityFromRoute = useClinicFromRoute();

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30"
    >
      <motion.div
        className="h-px origin-left bg-gradient-to-r from-transparent via-peach-deep/60 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />
      <div className={`${styles.header} border-b backdrop-blur-xl`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8">
          <Logo />

          {hero ? (
            <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-heading/60 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-peach/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-peach" />
              </span>
              Facial Volume Scan · {cityFromRoute ? clinic.city : "London & Glasgow"}
            </div>
          ) : (
            <ProgressRail step={step} />
          )}
        </div>
      </div>
    </motion.header>
  );
}
