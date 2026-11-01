"use client";

import { useEffect, useState } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import { useWizard } from "@/store/wizard-store";

export function DevResult() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    import("@/test/fixtures").then(({ sampleResult }) => {
      const s = useWizard.getState();
      s.setLead({ firstName: "Test", lastName: "Preview", email: "test@example.test", phone: "07700900123" });
      s.setResult(sampleResult);
      s.goToStep("result");
      setReady(true);
    });
  }, []);
  return ready ? <WizardShell /> : null;
}
