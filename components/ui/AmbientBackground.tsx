"use client";

import { motion } from "motion/react";
import { useLightFx } from "@/lib/use-light-fx";

/**
 * Fixed, decorative atmosphere: large, slow-morphing blue + teal light blooms
 * over the light canvas and fine grain. Slow + fluid by design (clinical, not
 * busy). Purely aesthetic; aria-hidden.
 *
 * On phones / reduced-motion the blooms hold still and the blur radius is
 * dialed down — continuous large-blur compositing is what makes mobile glitchy.
 */
export function AmbientBackground() {
  const reduce = useLightFx();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-cream" />

      <motion.div
        className="absolute -left-[12%] -top-[18%] h-[62vh] w-[62vh] rounded-full bg-peach/20 blur-[120px] max-md:blur-[60px]"
        animate={
          reduce
            ? undefined
            : { x: [0, 60, 10, 0], y: [0, 40, 70, 0], scale: [1, 1.15, 0.95, 1] }
        }
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[14%] top-[14%] h-[55vh] w-[55vh] rounded-full bg-sage/15 blur-[130px] max-md:blur-[65px]"
        animate={
          reduce
            ? undefined
            : { x: [0, -50, -10, 0], y: [0, 60, 20, 0], scale: [1, 0.9, 1.12, 1] }
        }
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-20%] left-[28%] h-[50vh] w-[50vh] rounded-full bg-peach-light/25 blur-[130px] max-md:blur-[65px]"
        animate={
          reduce
            ? undefined
            : { x: [0, 40, -20, 0], y: [0, -40, -10, 0], scale: [1, 1.1, 0.92, 1] }
        }
        transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* fine grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* soft top + bottom vignette */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cream/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cream/80 to-transparent" />
    </div>
  );
}
