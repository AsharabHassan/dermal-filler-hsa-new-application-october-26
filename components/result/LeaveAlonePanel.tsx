"use client";

import { Leaf, Lightbulb, Sparkle } from "lucide-react";
import { leaveAloneLines } from "@/lib/zones";
import { FIRMNESS_LINE, historyLine } from "@/lib/plan";
import type { AnalyzeResult } from "@/lib/types";

/**
 * The report's trust-builders, in one place:
 *  · what we'd LEAVE ALONE (explicit sentences)
 *  · why the changes happen (cause notes — treat the cause first)
 *  · the honest non-filler line when skin firmness dominates
 *  · the previous-filler line from the pre-scan answer
 */
export function LeaveAlonePanel({ result }: { result: AnalyzeResult }) {
  const alone = leaveAloneLines(result.zones);
  const history = historyLine(result.fillerHistory, result.priority);

  return (
    <div className="space-y-4">
      {result.firmnessDominant && (
        <div className="rounded-[1.75rem] border border-sage/40 bg-sage/[0.10] p-5 sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage-deep">
            <Sparkle size={14} /> An honest note
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-heading">{FIRMNESS_LINE}</p>
        </div>
      )}

      {alone.length > 0 && (
        <div className="rounded-[1.75rem] border border-sage/30 bg-white/80 p-5 shadow-soft sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage-deep">
            <Leaf size={14} /> What we&rsquo;d leave alone
          </p>
          <ul className="mt-3 space-y-2">
            {alone.map((line) => (
              <li key={line} className="font-serif text-[18px] leading-snug text-heading">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-body/80">
            Restore what time took, nothing it didn&rsquo;t. Leaving balanced areas
            alone is how results stay looking like you.
          </p>
        </div>
      )}

      {result.causeNotes.length > 0 && (
        <div className="rounded-[1.75rem] border border-peach/25 bg-white/80 p-5 shadow-soft sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-peach-deep">
            <Lightbulb size={14} /> Why these changes happen
          </p>
          <ul className="mt-3 space-y-2.5">
            {result.causeNotes.map((n) => (
              <li key={n} className="text-[14.5px] leading-relaxed text-body">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {history && (
        <p className="rounded-2xl border border-peach/25 bg-peach/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-body">
          {history}
        </p>
      )}
    </div>
  );
}
