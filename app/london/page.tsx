import type { Metadata } from "next";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "Free Facial Volume Scan in London · Harley Street Aesthetics",
  description:
    "Still you. Scan eight facial areas to see where volume has changed and what we'd leave alone, then book a free online consultation with a GMC-registered doctor at our London clinic (1-5 Portpool Lane, EC1).",
  // `/` is the London analyzer; this route stays live for existing links.
  alternates: { canonical: "/" },
  openGraph: {
    title: "Free Facial Volume Scan in London · Harley Street Aesthetics",
    description:
    "Still you. Scan eight facial areas to see where volume has changed and what we'd leave alone, then book a free online consultation with a GMC-registered doctor at our London clinic (1-5 Portpool Lane, EC1).",
    url: "/london",
  },
};

export default function LondonFacialVolumeScan() {
  return <WizardShell clinicLocation="london" />;
}
