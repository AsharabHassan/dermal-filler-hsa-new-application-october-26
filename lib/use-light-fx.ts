"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * True when we should run a lighter set of visual effects — i.e. skip the
 * continuous, GPU-heavy looping animations (large blurred blooms, iridescent
 * sweeps, rotating conic scans) that cause jank on phones. Triggers on a
 * reduced-motion preference, a small/touch viewport, or data-saver mode.
 *
 * Entrance animations (one-shot) stay on everywhere; this only gates the
 * expensive *infinite* effects and lets us dial blur down on small screens.
 */
export function useLightFx(): boolean {
  const reduce = useReducedMotion();
  const [constrained, setConstrained] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const saveData =
      (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection?.saveData === true;
    const update = () => setConstrained(mq.matches || saveData);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return Boolean(reduce) || constrained;
}
