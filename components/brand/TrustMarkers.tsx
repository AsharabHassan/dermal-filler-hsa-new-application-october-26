import { ShieldCheck, Stethoscope, BadgeCheck, MapPin } from "lucide-react";
import { TRUST_MARKERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS = [BadgeCheck, ShieldCheck, Stethoscope, MapPin];

export function TrustMarkers({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const text = tone === "light" ? "text-white/85" : "text-heading/80";
  const icon = tone === "light" ? "text-white" : "text-peach-deep";
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-2",
        className,
      )}
    >
      {TRUST_MARKERS.map((m, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <li
            key={m}
            className={cn(
              "flex items-center gap-2 text-[13px] font-medium",
              text,
            )}
          >
            <Icon size={15} className={icon} strokeWidth={2} />
            {m}
          </li>
        );
      })}
    </ul>
  );
}
