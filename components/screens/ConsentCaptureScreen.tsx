"use client";

import { useId, useRef, useState } from "react";
import { Camera, Check, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { ConsultationRequest } from "@/components/compliance/ConsultationRequest";
import { CameraCapture, inPageCameraAvailable } from "@/components/scan/CameraCapture";
import { PhotoGuide } from "@/components/scan/PhotoGuide";
import { useWizard, type MediaType } from "@/store/wizard-store";
import { fileToDownscaledImage } from "@/lib/image";
import { FILLER_HISTORY_OPTIONS, PRIORITY_OPTIONS } from "@/lib/questions";
import { cn } from "@/lib/utils";

type Missing = "history" | "priority" | "age" | "contact";

export function ConsentCaptureScreen() {
  const setImageConsent = useWizard((s) => s.setImageConsent);
  const contactConsent = useWizard((s) => s.contactConsent);
  const setContactConsent = useWizard((s) => s.setContactConsent);
  const ageConfirmed = useWizard((s) => s.ageConfirmed);
  const setAgeConfirmed = useWizard((s) => s.setAgeConfirmed);
  const fillerHistory = useWizard((s) => s.fillerHistory);
  const setFillerHistory = useWizard((s) => s.setFillerHistory);
  const priority = useWizard((s) => s.priority);
  const setPriority = useWizard((s) => s.setPriority);
  const setImage = useWizard((s) => s.setImage);
  const beginScan = useWizard((s) => s.beginScan);

  const [missing, setMissing] = useState<Missing | null>(null);
  const [mode, setMode] = useState<"choose" | "camera">("choose");
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const [inPageCameraFailed, setInPageCameraFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ageId = useId();

  /** Questions, 18+ and the consultation request all come before the scan. */
  function requireReady(): boolean {
    const first: Missing | null = !fillerHistory
      ? "history"
      : !priority
        ? "priority"
        : !ageConfirmed
          ? "age"
          : !contactConsent
            ? "contact"
            : null;
    setMissing(first);
    if (!first) return true;
    const target = { history: "q-history", priority: "q-priority", age: "q-age", contact: "consultation-request" }[first];
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  function handleCapture(base64: string, mediaType: MediaType) {
    setImageConsent(true);
    setImage(base64, mediaType);
    beginScan();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      input.value = "";
      return;
    }
    try {
      setImageConsent(true);
      // Downscale + re-encode before storing so a full-size phone photo
      // can't crash the tab on mobile.
      const { base64, mediaType } = await fileToDownscaledImage(file);
      setImage(base64, mediaType);
      beginScan();
    } catch {
      setError("Sorry, we couldn't read that image. Please try another photo.");
    } finally {
      input.value = "";
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">
        Step 1 · Two quick questions, then your photo
      </p>
      <h2 className="mt-3 font-serif text-[32px] leading-tight text-heading sm:text-[38px]">
        A little about you first
      </h2>
      <p className="mt-3 text-body">
        Your answers help us shape your report and your consultation. Then a
        front-facing selfie lets our AI and HSA SkinScan, our own analysis
        server, map eight areas of your face. This app does not keep the
        original upload &mdash; your report is emailed to you and saved to your
        clinic record.
      </p>

      {mode === "camera" ? (
        <div className="mt-8">
          <CameraCapture
            onCapture={handleCapture}
            onError={(m) => {
              setInPageCameraFailed(true);
              setError(m);
              setMode("choose");
            }}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <ChoiceGroup
            id="q-history"
            title="Have you had filler before?"
            options={FILLER_HISTORY_OPTIONS}
            value={fillerHistory}
            onChange={(v) => {
              setFillerHistory(v);
              if (missing === "history") setMissing(null);
            }}
            invalid={missing === "history"}
          />
          <ChoiceGroup
            id="q-priority"
            title="What matters most to you?"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(v) => {
              setPriority(v);
              if (missing === "priority") setMissing(null);
            }}
            invalid={missing === "priority"}
          />

          <label
            id="q-age"
            htmlFor={ageId}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl border bg-white/80 p-4 transition",
              missing === "age" && !ageConfirmed ? "border-peach bg-peach/[0.12]" : "border-peach/25",
            )}
          >
            <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <input
                id={ageId}
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => {
                  setAgeConfirmed(e.target.checked);
                  if (e.target.checked && missing === "age") setMissing(null);
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-peach",
                  ageConfirmed ? "border-peach bg-peach text-cream" : "border-heading/50 bg-white",
                )}
              >
                {ageConfirmed && <Check size={14} strokeWidth={3} />}
              </span>
            </span>
            <span className="text-sm leading-relaxed text-heading">
              <strong>I confirm I&rsquo;m 18 or over.</strong> Dermal filler is
              only offered to adults.
            </span>
          </label>
          {missing === "age" && !ageConfirmed && (
            <p role="alert" className="-mt-3 text-xs font-semibold text-peach-deep">
              Please confirm you&rsquo;re 18 or over to continue.
            </p>
          )}

          <ConsultationRequest
            checked={contactConsent}
            onChange={(v) => {
              setContactConsent(v);
              if (v && missing === "contact") setMissing(null);
            }}
            invalid={missing === "contact"}
          />

          <PhotoGuide />

          <p className="rounded-2xl border border-sage/25 bg-sage/[0.07] px-4 py-3 text-xs leading-relaxed text-body/80">
            <Lock size={13} className="mr-1 inline text-sage-deep" />
            By choosing an option below, I explicitly consent to my selfie being
            securely sent to the AI provider and to Harley Street
            Aesthetics&rsquo; own secure analysis server (HSA SkinScan) for this
            one-time scan. My personalised report, which includes my photo, will
            be emailed to me and saved to my clinic contact record.
          </p>

          {error && (
            <p className="rounded-xl border border-peach/30 bg-peach/10 px-4 py-3 text-sm text-heading">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                if (!requireReady()) return;
                setImageConsent(true);
                setError(null);
                if (inPageCameraFailed || !inPageCameraAvailable()) {
                  nativeCameraRef.current?.click();
                } else {
                  setMode("camera");
                }
              }}
            >
              <Camera size={18} /> Use camera
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                if (!requireReady()) return;
                setImageConsent(true);
                fileRef.current?.click();
              }}
            >
              <Upload size={18} /> Upload photo
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
            <input
              ref={nativeCameraRef}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={handleUpload}
            />
          </div>

          <DisclaimerBanner className="mt-2" />
        </div>
      )}
    </div>
  );
}

function ChoiceGroup<T extends string>({
  id,
  title,
  options,
  value,
  onChange,
  invalid,
}: {
  id: string;
  title: string;
  options: readonly { key: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  invalid: boolean;
}) {
  return (
    <fieldset
      id={id}
      className={cn(
        "rounded-2xl border bg-white/80 p-4 transition",
        invalid && !value ? "border-peach bg-peach/[0.12]" : "border-peach/25",
      )}
    >
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="font-serif text-lg text-heading">
        {title}
      </p>
      <div role="radiogroup" aria-label={title} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.key)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition",
                selected
                  ? "border-peach bg-peach/15 font-semibold text-heading"
                  : "border-peach/25 bg-white text-heading hover:border-peach/60",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {invalid && !value && (
        <p role="alert" className="mt-2 text-xs font-semibold text-peach-deep">
          Please choose an answer — &ldquo;Not sure&rdquo; is fine.
        </p>
      )}
    </fieldset>
  );
}
