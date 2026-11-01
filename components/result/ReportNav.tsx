"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKING_ANCHOR_ID, scrollToBooking } from "./BookingCalendar";

export interface ReportSection {
  id: string;
  label: string;
}

/**
 * Sticky section chips under the site header with a reading-progress line, so
 * a phone reader always knows where they are in the report and can jump to
 * the plan, finance, doctors, reviews or booking in one tap.
 */
export function ReportNav({ sections }: { sections: ReportSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const [top, setTop] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  // Sit just under the sticky site header, whatever its height.
  useEffect(() => {
    const measure = () => setTop(document.querySelector("header")?.getBoundingClientRect().height ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep the active chip in view on narrow screens.
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!rail || !chip) return;
    const left = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
    rail.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  const go = (id: string) => {
    if (id === BOOKING_ANCHOR_ID) return scrollToBooking();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Report sections"
      style={{ top }}
      className="sticky z-20 -mx-5 border-b border-peach/20 bg-cream/90 backdrop-blur sm:-mx-8"
    >
      <div className="h-0.5 w-full bg-peach/15">
        <div className="h-full bg-gradient-to-r from-peach-light to-peach transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
      <div ref={railRef} className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => {
          const isBook = s.id === BOOKING_ANCHOR_ID;
          const on = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              data-section={s.id}
              aria-current={on ? "location" : undefined}
              onClick={() => go(s.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition",
                isBook
                  ? "ml-auto inline-flex items-center gap-1 bg-peach text-cream shadow-soft"
                  : on
                    ? "bg-heading text-cream"
                    : "bg-white/70 text-body ring-1 ring-peach/25 hover:ring-peach",
              )}
            >
              {isBook && <CalendarHeart size={13} />}
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
