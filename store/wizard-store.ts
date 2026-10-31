import { create } from "zustand";
import type { AnalyzeResult, FillerHistory, Lead, Priority, Sex } from "@/lib/types";
import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import type { CallTimeKey } from "@/lib/consultation-consent";
import type { ScanFailure } from "@/lib/assessment";

// ─────────────────────────────────────────────────────────────────────────────
// The wizard is a small, explicit state machine:
//   hero → consent (questions + 18+ + consultation tickbox + photo) → scan →
//   lead → result
// with two side steps: "retake" (photo not readable) and "scanfailed" (HSA
// SkinScan / analysis unavailable — no report is produced). The result cannot
// be revealed until a lead is captured. The selfie and its on-device landmarks
// live in memory only; reset() drops everything. A failed scan keeps the
// answers, consents and any lead already given, so a retry is one tap.
// ─────────────────────────────────────────────────────────────────────────────

export type Step = "hero" | "consent" | "scan" | "retake" | "scanfailed" | "lead" | "result";

export type MediaType = "image/jpeg" | "image/png" | "image/webp";

interface WizardState {
  step: Step;
  imageConsent: boolean;
  imageConsentAt: string | null;
  contactConsent: boolean;
  contactConsentAt: string | null;
  ageConfirmed: boolean;
  fillerHistory: FillerHistory | null;
  priority: Priority | null;
  sex: Sex | null;
  callTime: CallTimeKey | null;
  imageBase64: string | null;
  imageMediaType: MediaType;
  landmarks: NormalizedPoint[] | null;
  lead: Lead | null;
  result: AnalyzeResult | null;
  scanFailure: ScanFailure | null;
  error: string | null;

  start: () => void;
  setImageConsent: (v: boolean) => void;
  setContactConsent: (v: boolean) => void;
  setAgeConfirmed: (v: boolean) => void;
  setFillerHistory: (v: FillerHistory) => void;
  setPriority: (v: Priority) => void;
  setSex: (v: Sex) => void;
  setCallTime: (t: CallTimeKey | null) => void;
  setImage: (base64: string, mediaType: MediaType) => void;
  setLandmarks: (pts: NormalizedPoint[] | null) => void;
  /** True when every pre-scan requirement is met. */
  canScan: () => boolean;
  beginScan: () => void;
  completeScan: () => void;
  failScan: (reason: ScanFailure) => void;
  retryScan: () => void;
  goToLead: () => void;
  setLead: (lead: Lead) => void;
  setResult: (result: AnalyzeResult) => void;
  reveal: () => void;
  clearImage: () => void;
  setError: (msg: string | null) => void;
  goToStep: (step: Step) => void;
  retakePhoto: () => void;
  reset: () => void;
}

const initial = {
  step: "hero" as Step,
  imageConsent: false,
  imageConsentAt: null as string | null,
  contactConsent: false,
  contactConsentAt: null as string | null,
  ageConfirmed: false,
  fillerHistory: null as FillerHistory | null,
  priority: null as Priority | null,
  sex: null as Sex | null,
  callTime: null as CallTimeKey | null,
  imageBase64: null as string | null,
  imageMediaType: "image/jpeg" as MediaType,
  landmarks: null as NormalizedPoint[] | null,
  lead: null as Lead | null,
  result: null as AnalyzeResult | null,
  scanFailure: null as ScanFailure | null,
  error: null as string | null,
};

export const useWizard = create<WizardState>((set, get) => ({
  ...initial,

  start: () => set({ step: "consent" }),

  setImageConsent: (v) =>
    set((state) => ({
      imageConsent: v,
      imageConsentAt: v ? (state.imageConsentAt ?? new Date().toISOString()) : null,
    })),

  setContactConsent: (v) =>
    set({ contactConsent: v, contactConsentAt: v ? new Date().toISOString() : null }),

  setAgeConfirmed: (ageConfirmed) => set({ ageConfirmed }),
  setFillerHistory: (fillerHistory) => set({ fillerHistory }),
  setPriority: (priority) => set({ priority }),
  setSex: (sex) => set({ sex }),
  setCallTime: (callTime) => set({ callTime }),

  setImage: (base64, mediaType) => set({ imageBase64: base64, imageMediaType: mediaType }),

  setLandmarks: (landmarks) => set({ landmarks }),

  canScan: () => {
    const s = get();
    return (
      s.contactConsent && s.ageConfirmed && s.sex !== null && s.fillerHistory !== null && s.priority !== null
    );
  },

  beginScan: () => {
    const { imageConsent, imageBase64 } = get();
    // The paid analysis only runs for adults who asked for a consultation and
    // answered the two pre-scan questions.
    if (!imageConsent || !imageBase64 || !get().canScan()) return;
    set({ step: "scan", scanFailure: null, result: null });
  },

  completeScan: () => set({ step: "lead" }),

  failScan: (scanFailure) => set({ step: "scanfailed", scanFailure, result: null }),

  // Run the scan again with the same photo (answers, consents and lead kept).
  retryScan: () => {
    if (!get().imageBase64) return;
    set({ step: "scan", scanFailure: null, result: null });
  },

  goToLead: () => set({ step: "lead" }),

  setLead: (lead) => set({ lead }),

  setResult: (result) => set({ result }),

  reveal: () => {
    if (!get().lead || !get().result) return;
    set({ step: "result" });
  },

  clearImage: () => set({ imageBase64: null }),

  setError: (msg) => set({ error: msg }),

  goToStep: (step) => set({ step }),

  // Drop the photo + read and return to capture. Answers, consents and lead stay.
  retakePhoto: () =>
    set({ imageBase64: null, landmarks: null, result: null, scanFailure: null, step: "consent" }),

  reset: () => set({ ...initial }),
}));
