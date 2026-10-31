"use client";

import type { AdvertisingConsent } from "@/lib/meta-consent";

interface AdvertisingConsentProps {
  consent: AdvertisingConsent;
  settingsOpen: boolean;
  onChoose: (consent: "granted" | "denied") => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
}

export function AdvertisingConsentPanel({
  consent,
  settingsOpen,
  onChoose,
  onOpenSettings,
  onCloseSettings,
}: AdvertisingConsentProps) {
  const showPanel = consent === "unset" || settingsOpen;

  return (
    <>
      {showPanel ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="advertising-consent-title"
          aria-describedby="advertising-consent-description"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-peach/30 bg-[#fffdf8]/[0.98] p-5 text-left shadow-2xl backdrop-blur sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="advertising-consent-title"
                className="font-serif text-xl text-heading"
              >
                Your advertising privacy
              </h2>
              <p
                id="advertising-consent-description"
                className="mt-2 text-sm leading-relaxed text-body"
              >
                With your permission, we use Meta advertising cookies. If you
                submit your details, our CRM may also send Meta protected,
                hashed identifiers such as your name, email and phone, plus
                browser and network information, so Meta can match and measure
                this campaign. Nothing is sent to Meta if you reject, and your
                analysis still works normally.{" "}
                <a
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-heading/30 underline-offset-2 transition hover:text-heading"
                >
                  How Meta uses information
                </a>
                .
              </p>
            </div>
            {consent !== "unset" ? (
              <button
                type="button"
                onClick={onCloseSettings}
                className="shrink-0 rounded-full px-2 py-1 text-sm text-body transition hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach"
                aria-label="Close cookie settings"
              >
                Close
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onChoose("denied")}
              className="min-h-11 rounded-full border border-heading/20 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-heading/40 hover:bg-peach/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach"
            >
              Reject optional Meta tracking
            </button>
            <button
              type="button"
              onClick={() => onChoose("granted")}
              className="min-h-11 rounded-full bg-peach px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-peach-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach-light focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Accept optional Meta tracking
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={onOpenSettings}
          data-cookie-pill
          className="fixed bottom-3 left-3 z-[90] rounded-full border border-peach/25 bg-[#fffdf8]/95 px-3 py-2 text-xs font-medium text-body shadow-lg backdrop-blur transition hover:border-sage/50 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peach"
        >
          Cookie settings
        </button>
      )}
    </>
  );
}
