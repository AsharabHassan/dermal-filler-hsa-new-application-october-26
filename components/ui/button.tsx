"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "sage" | "ghost" | "outline";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight " +
  "transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-cream focus-visible:ring-peach-deep " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-peach-deep via-peach to-peach-light text-ink font-semibold " +
    "shadow-[0_14px_40px_-12px_rgba(212,175,55,0.6)] hover:from-peach hover:via-peach-light hover:to-peach",
  sage: "bg-sage text-ink font-semibold hover:bg-sage-deep",
  ghost: "bg-transparent text-heading hover:bg-cream-deep",
  outline:
    "bg-transparent text-heading border border-peach/50 hover:border-peach hover:bg-peach/10",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-9 text-base",
};

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
