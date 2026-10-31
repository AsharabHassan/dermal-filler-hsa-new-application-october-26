"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { EASE } from "@/lib/motion";

// ─────────────────────────────────────────────────────────────────────────────
// Before/after gallery — real HSA patients (supplied by the clinic for the
// dermal-fillers campaign; quality enhanced, so the caption says so). Pairs
// live in /public/results. Never reuse imagery from any other clinic.
// TODO(HSA): confirm documented patient consent covers use in this app.
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_RATIO = "2752 / 1536";

interface Case {
  area: string;
  before: string;
  after: string;
}

const CASES: Case[] = [
  { area: "lips", before: "/results/lips1-before.webp", after: "/results/lips1-after.webp" },
  { area: "tear trough", before: "/results/teartrough1-before.webp", after: "/results/teartrough1-after.webp" },
  { area: "lips ", before: "/results/lips2-before.webp", after: "/results/lips2-after.webp" },
  { area: "tear trough ", before: "/results/teartrough2-before.webp", after: "/results/teartrough2-after.webp" },
];

export const GALLERY_CAPTION = "Real HSA patients. Image quality enhanced. Results vary.";

/** True when there is at least one consented case to show. */
export const HAS_RESULTS_GALLERY = CASES.length > 0;

export function ResultsGallery() {
  if (!HAS_RESULTS_GALLERY) return null;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 text-center">
        <Sparkles size={14} className="text-peach" />
        <h3 className="font-serif text-xl text-heading">
          Real results, real patients
        </h3>
      </div>
      <p className="mx-auto mt-1 max-w-md text-center text-[13px] leading-relaxed text-body/80">
        Subtle, gradual results from our doctors. {GALLERY_CAPTION}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {CASES.map((c, i) => (
          <motion.div
            key={c.before}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 * i, duration: 0.5, ease: EASE }}
          >
            <BeforeAfterSlider
              beforeSrc={c.before}
              afterSrc={c.after}
              area={c.area.trim()}
              ratio={FRAME_RATIO}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
