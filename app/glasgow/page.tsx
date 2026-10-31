import type { Metadata } from "next";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "Free Facial Volume Scan in Glasgow · Harley Street Aesthetics",
  description:
    "Still you. Scan eight facial areas to see where volume has changed and what we'd leave alone, then book a free online consultation with a GMC-registered doctor at our Glasgow clinic (Ingram House).",
  alternates: { canonical: "/glasgow" },
  openGraph: {
    title: "Free Facial Volume Scan in Glasgow · Harley Street Aesthetics",
    description:
    "Still you. Scan eight facial areas to see where volume has changed and what we'd leave alone, then book a free online consultation with a GMC-registered doctor at our Glasgow clinic (Ingram House).",
    url: "/glasgow",
  },
};

export default function GlasgowFacialVolumeScan() {
  return <WizardShell clinicLocation="glasgow" />;
}
