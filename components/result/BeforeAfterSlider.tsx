"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// A self-contained before/after comparison slider. The "after" image is the base
// layer; the "before" image is clipped to the left of a draggable handle. Pointer
// events cover mouse + touch with a single code path. No external dependencies.
// ─────────────────────────────────────────────────────────────────────────────

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  /** Accessible description of what the pair shows, e.g. "jawline and neck". */
  area: string;
  /** CSS aspect-ratio of the frame, matched to the source images (e.g. "1 / 1"). */
  ratio?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  area,
  ratio = "4 / 3",
  className,
}: BeforeAfterSliderProps) {
  const [pos, setPos] = useState(50); // reveal position, 0–100 (% from left)
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    // Capture on the frame (not e.target, which may be a child img/handle) so
    // move events keep flowing even if the finger/cursor leaves the element.
    frameRef.current?.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setFromClientX(e.clientX);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  // Keyboard accessibility: arrow keys nudge the handle.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
  };

  return (
    <figure className={cn("group", className)}>
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ aspectRatio: ratio }}
        className="relative w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl border border-sage/20 bg-cream-deep shadow-soft"
      >
        {/* AFTER — base layer (full width) */}
        <img
          src={afterSrc}
          alt={`${area} — after treatment at Harley Street Aesthetics`}
          draggable={false}
          loading="eager"
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* BEFORE — clipped to the left of the handle */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <img
            src={beforeSrc}
            alt={`${area} — before treatment at Harley Street Aesthetics`}
            draggable={false}
            loading="eager"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        {/* Corner labels */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          Before
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-peach-deep/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          After
        </span>

        {/* Handle */}
        <div
          role="slider"
          aria-label={`Reveal treatment result for ${area}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="absolute top-0 bottom-0 z-10 -ml-5 flex w-10 items-center justify-center outline-none"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.35)]" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/85 shadow-soft backdrop-blur transition-transform group-hover:scale-105">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-ink">
              <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs capitalize text-body/70">
        {area} · drag to compare
      </figcaption>
    </figure>
  );
}
