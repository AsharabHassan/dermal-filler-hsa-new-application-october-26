import { Info } from "lucide-react";
import { DISCLAIMER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function DisclaimerBanner({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl bg-sage/10 px-4 py-3 text-xs leading-relaxed text-heading/70",
        className,
      )}
    >
      <Info size={14} className="mt-0.5 shrink-0 text-sage-deep" />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
