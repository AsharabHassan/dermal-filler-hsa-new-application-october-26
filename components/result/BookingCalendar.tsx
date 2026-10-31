"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarHeart,
  Check,
  Clock,
  Loader2,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useWizard } from "@/store/wizard-store";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { ZONES } from "@/lib/zones";
import {
  calendarPrefill,
  prefilledCalendarUrl,
} from "@/lib/constants";

export const BOOKING_ANCHOR_ID = "book";

const FRAME_ID = "hsa-consultation-calendar";
const INITIAL_HEIGHT = 820;
const MIN_HEIGHT = 560;
const MAX_HEIGHT = 2_400;

/** Smooth-scroll to the embedded calendar from any booking button. */
export function scrollToBooking(): void {
  const calendar = document.getElementById(BOOKING_ANCHOR_ID);
  if (!calendar) return;
  calendar.scrollIntoView({ behavior: "smooth", block: "start" });
  calendar.focus({ preventScroll: true });
}

/**
 * The GoHighLevel consultation calendar, embedded in the result page with the
 * visitor's name, email and phone already filled in — they only pick a time.
 *
 * We speak the widget's postMessage protocol directly instead of loading GHL's
 * form_embed.js: that script hides the iframe until its own handshake completes
 * and can leave it hidden. Support both current and legacy widget messages:
 *   · "fetch-query-params"  → we answer with the visitor's details (prefill)
 *   · "highlevel.setHeight" → we size the frame so it never scrolls internally
 *   · "[iFrameSizer]..." → the provider's bundled iframe-resizer protocol
 */
export function BookingCalendar({ points: customPoints }: { points?: string[] } = {}) {
  const clinic = useClinicLocation();
  const lead = useWizard((s) => s.lead);
  const result = useWizard((s) => s.result);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const [loaded, setLoaded] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const src = useMemo(
    () => prefilledCalendarUrl(clinic.calendarUrl, lead),
    [clinic.calendarUrl, lead],
  );

  // A frame load event also fires for blank/blocked documents. Only the
  // provider's resize handshake proves the widget is running.
  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => setStalled(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [loaded, attempt, src]);

  function retry() {
    setLoaded(false);
    setStalled(false);
    setAttempt((value) => value + 1);
  }

  function initializeFrame() {
    // Match the provider's iframe-resizer handshake without its global script
    // hiding or repositioning the frame. Send only to this calendar's origin.
    try {
      frameRef.current?.contentWindow?.postMessage(
        `[iFrameSizer]${FRAME_ID}:8:false:false:32:true:true:null:offset:null:null:0`,
        new URL(clinic.calendarUrl).origin,
      );
    } catch {
      /* invalid calendar URL — the stalled state offers the fallback link */
    }
  }

  useEffect(() => {
    let calendarOrigin: string;
    try {
      calendarOrigin = new URL(clinic.calendarUrl).origin;
    } catch {
      return;
    }

    function onMessage(event: MessageEvent) {
      const frame = frameRef.current?.contentWindow;
      if (!frame || event.source !== frame || event.origin !== calendarOrigin) {
        return;
      }
      const data: unknown = event.data;
      if (typeof data === "string" && data.startsWith(`[iFrameSizer]${FRAME_ID}:`)) {
        const parts = data.slice(`[iFrameSizer]${FRAME_ID}:`.length).split(":");
        const next = Number(parts[0]);
        if (Number.isFinite(next) && next > 0 && parts.length >= 3) {
          setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(next) + 5)));
          setLoaded(true);
        }
        return;
      }
      if (!Array.isArray(data)) return;

      if (data[0] === "fetch-query-params") {
        frame.postMessage(
          [
            "query-params",
            calendarPrefill(lead),
            // Page address only — campaign and click ids stay out of the CRM
            // unless the visitor's own consent sends them via /api/lead.
            `${window.location.origin}${window.location.pathname}`,
            "",
            FRAME_ID,
            { consent: null, isConsentExpected: false },
          ],
          calendarOrigin,
        );
      } else if (data[0] === "highlevel.setHeight") {
        const next = Number((data[1] as { height?: unknown } | null)?.height);
        if (Number.isFinite(next) && next > 0) {
          setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(next))));
          setLoaded(true);
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clinic.calendarUrl, lead]);

  const focusKey = result?.focusZones[0];
  const focus = focusKey ? ZONES[focusKey].name : null;
  const points = customPoints ?? [
    focus
      ? `A GMC-registered doctor reviews your report before the call, starting with your ${focus}`
      : "A GMC-registered doctor reviews your report before the call",
    "You leave with your areas, ml and price confirmed, including what to leave alone",
    "No obligation — it's a conversation, not a commitment",
  ];
  const facts = [
    { icon: Clock, label: "15 minutes" },
    { icon: Video, label: "Online call" },
    { icon: ShieldCheck, label: "Free" },
  ];

  return (
    <section
      id={BOOKING_ANCHOR_ID}
      tabIndex={-1}
      aria-label="Book your free consultation"
      className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-peach/35 bg-gradient-to-b from-peach/[0.09] via-white/60 to-white/40 shadow-glow outline-none"
    >
      <div className="px-5 pt-7 text-center sm:px-8 sm:pt-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-peach/30 bg-peach/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-peach-deep">
          <CalendarHeart size={13} /> Your next step
        </span>
        <h3 className="mt-4 font-serif text-[28px] leading-tight text-heading sm:text-[34px]">
          {lead?.firstName ? `${lead.firstName}, choose` : "Choose"} your
          consultation time
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-body">
          A free online consultation with a GMC-registered doctor from our {clinic.city} team.
        </p>

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 divide-x divide-peach/20 rounded-2xl border border-peach/20 bg-white/70">
          {facts.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 px-2 py-3">
              <Icon size={16} className="text-peach-deep" />
              <span className="text-xs font-semibold text-heading">{label}</span>
            </div>
          ))}
        </div>

        <ul className="mx-auto mt-5 max-w-md space-y-2 text-left">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-body"
            >
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-peach/15">
                <Check size={11} strokeWidth={3} className="text-peach-deep" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-peach/40">
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] bg-[#faf7ef] px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs font-semibold text-[#1c1a16]">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b8902a]" />
              {loaded ? "Live availability" : "Consultation calendar"}
            </span>
            {lead && (
              <span className="truncate text-[11px] text-[#5c5852]">
                Your details are already filled in
              </span>
            )}
          </div>

          {!loaded && (
            <div
              role="status"
              className="absolute inset-x-0 bottom-0 top-[41px] z-10 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center"
            >
              {!stalled && <Loader2 size={22} className="animate-spin text-[#b8902a]" />}
              <span className="text-xs font-medium text-[#5c5852]">
                {stalled
                  ? "The embedded calendar hasn’t connected. Try loading it again."
                  : "Loading available times…"}
              </span>
              {stalled && (
                <button
                  type="button"
                  onClick={retry}
                  className="min-h-11 rounded-full border border-[#b8902a] px-5 text-sm font-semibold text-[#715320]"
                >
                  Retry calendar
                </button>
              )}
            </div>
          )}

          <iframe
            key={`${src}-${attempt}`}
            ref={frameRef}
            src={src}
            id={FRAME_ID}
            title="Choose your free online consultation time"
            scrolling="no"
            onLoad={initializeFrame}
            onError={() => setStalled(true)}
            style={{ height: stalled && !loaded ? 240 : height }}
            className="block w-full border-0 transition-[height] duration-300"
          />
        </div>
      </div>

      {stalled && !loaded && (
        <p className="px-6 pb-3 text-center text-xs text-body">
          Still having trouble?{" "}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-peach-deep underline"
          >
            Open available times in a new tab
          </a>{" "}
          or{" "}
          <a
            href={clinic.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-peach-deep underline"
          >
            contact our {clinic.city} clinic
          </a>
          .
        </p>
      )}

      <p className="px-6 pb-6 pt-3 text-center text-xs leading-relaxed text-body/65">
        Confirmation arrives by email and text. Need to change it later? Just
        reply to your confirmation.
      </p>
    </section>
  );
}
