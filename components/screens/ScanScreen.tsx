"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useWizard } from "@/store/wizard-store";
import {
  useFaceLandmarker,
  type NormalizedPoint,
} from "@/components/scan/useFaceLandmarker";
import { FaceMeshOverlay } from "@/components/scan/FaceMeshOverlay";
import { requestAnalysis } from "@/lib/api-client";

const STATUS = [
  "Mapping facial structure",
  "Reading volume across eight areas",
  "Running HSA SkinScan",
  "Checking proportion and support",
  "Noting what to leave alone",
];

export function ScanScreen() {
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const imageConsent = useWizard((s) => s.imageConsent);
  const result = useWizard((s) => s.result);
  const setResult = useWizard((s) => s.setResult);
  const failScan = useWizard((s) => s.failScan);
  const fillerHistory = useWizard((s) => s.fillerHistory);
  const priority = useWizard((s) => s.priority);
  const sex = useWizard((s) => s.sex);
  const setLandmarksStore = useWizard((s) => s.setLandmarks);
  const completeScan = useWizard((s) => s.completeScan);
  const goToStep = useWizard((s) => s.goToStep);
  const reduce = useReducedMotion();

  const { detect, ready } = useFaceLandmarker();
  const imgRef = useRef<HTMLImageElement>(null);
  const [landmarks, setLandmarks] = useState<NormalizedPoint[] | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  // The scan runs the REAL analysis behind the loader. We advance to the lead gate
  // only when BOTH the analysis has resolved (store.result is set) and a minimum
  // animation time has elapsed, so the loader always reflects genuine work without
  // ever feeling abrupt.
  const [minElapsed, setMinElapsed] = useState(false);
  const startedRef = useRef(false);

  const dataUrl = imageBase64
    ? `data:${imageMediaType};base64,${imageBase64}`
    : null;

  // Detect once the still and the model are both ready (drives the mesh overlay,
  // and is kept in the store so the result screen can crop the user's areas).
  useEffect(() => {
    if (ready && imgLoaded && imgRef.current && !landmarks) {
      const pts = detect(imgRef.current);
      setLandmarks(pts);
      setLandmarksStore(pts);
    }
  }, [ready, imgLoaded, detect, landmarks, setLandmarksStore]);

  // Kick off the real Claude analysis once and write the outcome straight to the
  // store. The store is the single source of truth and survives a Strict Mode
  // remount. requestAnalysis never throws (it degrades to a safe fallback).
  useEffect(() => {
    if (startedRef.current || result) return;
    startedRef.current = true;
    // No fallback report: HSA SkinScan is required. A failure goes to the
    // "We couldn't complete your scan" step (answers, consents and lead kept).
    requestAnalysis({ imageBase64, imageMediaType, imageConsent, fillerHistory, priority, sex }).then(
      (res) => {
        if (res.ok) setResult(res.result);
        else failScan(res.error);
      },
    );
  }, [imageBase64, imageMediaType, imageConsent, fillerHistory, priority, sex, setResult, failScan, result]);

  // Cycle status lines and mark the minimum animation time as elapsed.
  useEffect(() => {
    const total = reduce ? 1600 : 6000;
    const per = total / STATUS.length;
    const timers = STATUS.map((_, i) =>
      setTimeout(() => setStatusIndex(i), per * i),
    );
    const done = setTimeout(() => setMinElapsed(true), total);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [reduce]);

  // Advance to the lead gate only once the analysis result is in the store AND the
  // loader has run its minimum duration. If the API is slow, the loader holds.
  useEffect(() => {
    if (!result || !minElapsed) return;
    // If the photo didn't clearly show the face in even light, route to a
    // retake prompt instead of giving a read we can't stand behind.
    if (result.usedPhoto && !result.framingAdequate) goToStep("retake");
    else completeScan();
  }, [result, minElapsed, completeScan, goToStep]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">
        Analysing
      </p>
      <h2 className="mt-3 text-center font-serif text-[28px] leading-tight text-heading sm:text-[34px]">
        Reading your face
      </h2>

      <div className="relative mt-8 aspect-[4/5] w-full max-w-xs overflow-hidden rounded-[2rem] border border-peach/20 bg-cream-deep shadow-soft">
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={dataUrl}
            alt="Your captured photo being analysed"
            onLoad={() => setImgLoaded(true)}
            className="h-full w-full object-cover"
          />
        )}
        {/* soft darkening for mesh contrast */}
        <div className="absolute inset-0 bg-ink/25" />

        {/* mesh */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: landmarks ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        >
          <FaceMeshOverlay landmarks={landmarks} className="h-full w-full" />
        </motion.div>

        {/* sweeping analysis bar */}
        {!reduce && (
          <motion.div
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-peach/50 to-transparent mix-blend-screen"
            initial={{ y: "-120%" }}
            animate={{ y: ["-120%", "520%"] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <Reticle />
      </div>

      <div className="mt-8 h-6 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={statusIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium tracking-wide text-heading"
          >
            {STATUS[statusIndex]}
            <span className="text-peach-deep">…</span>
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-2 text-xs text-body/55">
        This can take up to a minute · secure one-time processing · original upload not persisted
      </p>
    </div>
  );
}

function Reticle() {
  const corner = "absolute h-5 w-5 border-white/70";
  return (
    <>
      <span className={`${corner} left-3 top-3 border-l-2 border-t-2 rounded-tl`} />
      <span className={`${corner} right-3 top-3 border-r-2 border-t-2 rounded-tr`} />
      <span className={`${corner} bottom-3 left-3 border-b-2 border-l-2 rounded-bl`} />
      <span className={`${corner} bottom-3 right-3 border-b-2 border-r-2 rounded-br`} />
    </>
  );
}
