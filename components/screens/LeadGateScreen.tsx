"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Lock, PhoneCall, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useWizard } from "@/store/wizard-store";
import {
  submitLead,
  submitReportToGhl,
} from "@/lib/api-client";
import { getMetaAttribution } from "@/lib/meta-pixel";
import { hasMetaTrackingConsent } from "@/lib/meta-consent";
import type { Lead } from "@/lib/types";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import {
  CALL_TIMES,
  CALLBACK_PROMISE,
  CONSULTATION_CONTACT_CONSENT_VERSION,
  consultationContactStatement,
} from "@/lib/consultation-consent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadGateScreen() {
  const clinic = useClinicLocation();
  const imageBase64 = useWizard((s) => s.imageBase64);
  const imageMediaType = useWizard((s) => s.imageMediaType);
  const imageConsent = useWizard((s) => s.imageConsent);
  const imageConsentAt = useWizard((s) => s.imageConsentAt);
  const contactConsent = useWizard((s) => s.contactConsent);
  const contactConsentAt = useWizard((s) => s.contactConsentAt);
  const callTime = useWizard((s) => s.callTime);
  const setCallTime = useWizard((s) => s.setCallTime);
  const landmarks = useWizard((s) => s.landmarks);
  const result = useWizard((s) => s.result);
  const ageConfirmed = useWizard((s) => s.ageConfirmed);
  const fillerHistory = useWizard((s) => s.fillerHistory);
  const priority = useWizard((s) => s.priority);
  const setLead = useWizard((s) => s.setLead);
  const reveal = useWizard((s) => s.reveal);
  const goToStep = useWizard((s) => s.goToStep);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError(null);
    setBusy(true);

    const lead: Lead = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    setLead(lead);

    // The analysis already ran behind the scan loader. There is no fallback
    // report: without a real SkinScan-backed result, go back to "try again".
    if (!result || !ageConfirmed || !fillerHistory || !priority) {
      setBusy(false);
      goToStep("scanfailed");
      return;
    }

    // GHL is the sole source of the server-side Lead and receives Meta fields
    // only after advertising consent.
    void submitLead({
      lead,
      result,
      clinicLocation: clinic.key,
      imageProcessingConsent: imageConsent,
      imageProcessingConsentAt:
        imageConsentAt ?? new Date().toISOString(),
      metaTrackingConsent: hasMetaTrackingConsent(),
      ageConfirmed: true,
      fillerHistory,
      priority,
      ...(contactConsent
        ? {
            consultationContactConsent: true as const,
            consultationContactConsentAt:
              contactConsentAt ?? new Date().toISOString(),
            consultationContactStatement: consultationContactStatement(clinic.city),
            consultationContactConsentVersion: CONSULTATION_CONTACT_CONSENT_VERSION,
          }
        : {}),
      ...(callTime ? { preferredCallTime: callTime } : {}),
      attribution: getMetaAttribution(),
    });

    // Build the report PDF and deliver it to GoHighLevel: uploaded, written onto
    // the contact, and emailed to the patient with the PDF attached. Automatic
    // for every lead. Fire-and-forget so the reveal isn't delayed; it no-ops
    // server-side if the GHL integration env isn't configured.
    void submitReportToGhl({
      result,
      lead,
      clinicLocation: clinic.key,
      imageBase64,
      imageMediaType,
      landmarks,
    });

    reveal();
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[2rem] border border-peach/30 bg-white/80 p-7 shadow-soft backdrop-blur"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-peach/30 bg-peach/10 px-3 py-1 text-xs font-semibold text-peach-deep">
          <Sparkles size={13} /> Step 2 of 4 · Your report is ready
        </span>
        <h2 className="mt-4 font-serif text-[30px] leading-tight text-heading">
          Where shall we send your pre-consultation report?
        </h2>
        <p className="mt-2 text-sm text-body">
          Your Volume &amp; Structure Map is the first half of your assessment.
          We&rsquo;ll email it to you and save it to your clinic record, so a
          GMC-registered doctor in our {clinic.city} team has it ready for your
          free online consultation, where they confirm your plan.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div>
            <TextField
              label="Best number for your consultation call"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-body/80">
              <PhoneCall size={13} className="mt-0.5 shrink-0 text-peach" />
              <span>
                Our {clinic.city} team will call you {CALLBACK_PROMISE}.
              </span>
            </p>
          </div>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-heading/70">
              Best time to call you{" "}
              <span className="font-normal normal-case tracking-normal text-body/60">(optional)</span>
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CALL_TIMES.map((t) => {
                const on = callTime === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCallTime(on ? null : t.key)}
                    className={`rounded-xl border px-2 py-2.5 text-sm transition ${
                      on
                        ? "border-peach bg-peach/15 font-semibold text-heading"
                        : "border-peach/25 text-body hover:border-peach/60"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p className="rounded-2xl border border-sage/20 bg-sage/[0.06] px-4 py-3 text-xs leading-relaxed text-body/75">
            We&rsquo;ll email your full report to this address and save a copy to
            your clinic record so our team can review it before your
            consultation. The report includes your photo. You can also download
            it yourself after the reveal.
          </p>

          {error && (
            <p className="rounded-xl border border-peach/30 bg-peach/10 px-4 py-2.5 text-sm text-heading">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Preparing your
                report…
              </>
            ) : (
              "See my report"
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-body/55">
            <Lock size={12} /> Used only for your report and consultation. No spam.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
