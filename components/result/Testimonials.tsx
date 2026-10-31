"use client";

import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";
import { EASE } from "@/lib/motion";
import { GOOGLE_RATING, REVIEWS } from "@/lib/reviews";

// Real reviews — see lib/reviews.ts for sources and capture date.

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Testimonials() {
  if (REVIEWS.length === 0) return null;

  return (
    <div>
      <h3 className="text-center font-serif text-xl text-heading">
        What our patients say
      </h3>
      <p className="mx-auto mt-1 flex items-center justify-center gap-1.5 text-center text-[13px] text-body/80">
        <span className="flex gap-0.5 text-peach" aria-hidden>
          {Array.from({ length: 5 }).map((_, s) => (
            <Star key={s} size={12} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        Rated {GOOGLE_RATING.score} on Google from {GOOGLE_RATING.count} reviews
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {REVIEWS.map((t, i) => (
          <motion.figure
            key={`${t.name}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.5, ease: EASE }}
            className="relative flex flex-col rounded-2xl border border-peach/20 bg-white/80 p-5 shadow-soft"
          >
            <Quote
              size={28}
              className="absolute right-4 top-4 text-peach/25"
              aria-hidden
            />

            <div
              className="flex gap-0.5 text-peach"
              aria-label="Five out of five stars"
            >
              {Array.from({ length: t.stars }).map((_, s) => (
                <Star key={s} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>

            <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-body">
              “{t.quote}”
            </blockquote>

            <figcaption className="mt-4 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-peach/30 bg-peach/10 text-xs font-semibold text-peach-deep">
                {initials(t.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-heading">
                  {t.name}
                </span>
                <span className="block text-[11px] text-body/60">{t.date}</span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
}
