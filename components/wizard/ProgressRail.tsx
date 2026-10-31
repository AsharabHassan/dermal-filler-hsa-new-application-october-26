"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { Step } from "@/store/wizard-store";
import { JOURNEY, journeyIndex } from "@/lib/consultation-journey";

/** Labelled 4-stage tracker. The consultation is a visible stage, so the result is never the finish line. */
export function ProgressRail({ step }: { step: Step }) {
  const active = journeyIndex(step);
  if (active < 0) return null;

  return (
    <nav aria-label="Your consultation journey" className="flex items-center">
      <p className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-heading/70 sm:hidden">
        Step {active + 1} of {JOURNEY.length}
      </p>
      <ol className="hidden items-center gap-1.5 sm:flex">
        {JOURNEY.map((stage, i) => {
          const done = i < active;
          const now = i === active;
          return (
            <li
              key={stage.key}
              className="flex items-center gap-1.5"
              aria-current={now ? "step" : undefined}
            >
              {i > 0 && (
                <span className="relative h-[2px] w-6 overflow-hidden rounded-full bg-sage/25 md:w-9">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-peach to-peach-deep"
                    initial={false}
                    animate={{ width: i <= active ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              )}
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                  done
                    ? "border-peach bg-peach text-cream"
                    : now
                      ? "border-peach-deep text-peach-deep"
                      : "border-sage/40 text-heading/50"
                }`}
              >
                {done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  now ? "text-heading" : "text-heading/50"
                }`}
              >
                {stage.short}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
