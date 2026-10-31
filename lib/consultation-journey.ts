import type { Step } from "@/store/wizard-store";

/**
 * The client journey shown on every screen. The AI report is step 2 of 4, so
 * the result never reads as the end: the consultation is the step that counts.
 */
export const JOURNEY = [
  {
    key: "scan",
    label: "Photo scan",
    short: "Scan",
    detail: "A clear, front-facing selfie in natural light.",
  },
  {
    key: "report",
    label: "Pre-consultation report",
    short: "Report",
    detail: "Your Volume & Structure Map, prepared for our doctors.",
  },
  {
    key: "consultation",
    label: "Free consultation",
    short: "Consultation",
    detail: "We call you to book a free online consultation with a doctor.",
  },
  {
    key: "plan",
    label: "Your treatment plan",
    short: "Plan",
    detail: "Areas, ml, sequencing and price, confirmed.",
  },
] as const;

/** Index of the journey stage the client is currently on, or -1 on the hero. */
export function journeyIndex(step: Step): number {
  switch (step) {
    case "consent":
    case "scan":
    case "retake":
    case "scanfailed":
      return 0;
    case "lead":
      return 1;
    case "result":
      return 2;
    default:
      return -1;
  }
}
