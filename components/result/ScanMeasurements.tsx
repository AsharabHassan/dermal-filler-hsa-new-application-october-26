"use client";

import { MEASUREMENTS_NOTE } from "@/lib/measurements";
import { cn } from "@/lib/utils";
import type { Measurement } from "@/lib/types";

/** Ordered steps for each plain-language reading, so it can be drawn as a scale. */
export const SCALES: Record<string, string[]> = {
  level: ["low", "moderate", "higher"],
  firmness: ["minimal", "mild", "moderate", "higher"],
  texture: ["smooth", "some texture", "more visible texture"],
};

export function scaleFor(m: Measurement): string[] | null {
  if (m.key === "firmness") return SCALES.firmness;
  if (m.key === "texture") return SCALES.texture;
  if (SCALES.level.includes(m.value)) return SCALES.level;
  return null;
}

function Scale({ steps, value }: { steps: string[]; value: string }) {
  const idx = steps.indexOf(value);
  return (
    <div className="mt-2.5" aria-hidden>
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              "block h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-700",
              i <= idx ? "bg-gradient-to-r from-peach-deep to-peach" : "bg-peach/15",
            )}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-body/60">
        <span>{steps[0]}</span>
        <span>{steps[steps.length - 1]}</span>
      </div>
    </div>
  );
}

/** "1 : 1.5" drawn as two proportional bars (upper vs lower). */
function RatioBars({ value }: { value: string }) {
  const b = Number(value.split(":")[1]);
  if (!Number.isFinite(b) || b <= 0) return null;
  const total = 1 + b;
  return (
    <div className="mt-2.5 flex h-1.5 gap-1" aria-hidden>
      <span className="rounded-full bg-peach/45" style={{ width: `${(1 / total) * 100}%` }} />
      <span className="rounded-full bg-peach-deep" style={{ width: `${(b / total) * 100}%` }} />
    </div>
  );
}

/**
 * "Your scan measurements" — HSA SkinScan readings in plain language, drawn as
 * calm scales. Measurements of the photo, never scores of the person.
 */
export function ScanMeasurements({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length === 0) return null;
  return (
    <section aria-labelledby="measure-heading">
      <h3 id="measure-heading" className="font-serif text-[30px] leading-tight text-heading sm:text-[34px]">
        Your scan measurements
      </h3>
      <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-body/85">{MEASUREMENTS_NOTE}</p>
      <dl className="mt-5 grid gap-x-8 gap-y-5 rounded-[1.75rem] bg-white/85 p-5 ring-1 ring-peach/20 sm:grid-cols-2 sm:p-7">
        {measurements.map((m) => {
          const steps = scaleFor(m);
          return (
            <div key={m.key}>
              <dt className="text-[13px] text-body">{m.label}</dt>
              <dd>
                <span className="font-serif text-[22px] leading-tight text-heading">{m.value}</span>
                {m.detail && <span className="ml-2 text-[12px] text-body/70">({m.detail})</span>}
                {steps ? <Scale steps={steps} value={m.value} /> : m.value.includes(":") ? <RatioBars value={m.value} /> : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-[11.5px] text-body/65">
        Readings by HSA SkinScan, Harley Street Aesthetics&rsquo; own analysis model. Scale readings are indicative.
      </p>
    </section>
  );
}
