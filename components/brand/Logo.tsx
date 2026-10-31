import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  tone?: "dark" | "light";
  withByline?: boolean;
  className?: string;
}

/**
 * Harley Street Aesthetics wordmark — a gold "HSA" monogram beside a stacked
 * serif wordmark. Rendered in the brand serif so it stays crisp on the dark
 * canvas and themeable via the `tone` prop.
 */
export function Logo({ tone = "dark", withByline = false, className }: LogoProps) {
  const word = tone === "light" ? "text-white" : "text-heading";
  const sub = tone === "light" ? "text-white/65" : "text-body/70";
  return (
    <span className={cn("inline-flex items-center gap-3 leading-none", className)}>
      <Image src="/brand/hsa-logo.png" width={52} height={52} alt="HSA" className="h-12 w-12 object-contain" />
      <span className="inline-flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-[15px] uppercase tracking-[0.2em]",
            word,
          )}
        >
          Harley Street
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.42em] text-peach">
          Aesthetics
        </span>
        {withByline && (
          <span
            className={cn(
              "mt-1.5 text-[10px] font-medium uppercase tracking-[0.3em]",
              sub,
            )}
          >
            {"London · Glasgow"}
          </span>
        )}
      </span>
    </span>
  );
}
