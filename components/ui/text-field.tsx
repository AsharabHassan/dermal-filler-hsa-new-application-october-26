"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

let idCounter = 0;

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, id, className, ...props }, ref) => {
    const reactId = React.useId();
    const fieldId = id ?? `tf-${reactId}-${idCounter++}`;
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-heading/70"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "h-12 rounded-2xl border border-peach/25 bg-white px-4 text-[15px] text-heading",
            "placeholder:text-body/45 outline-none transition",
            "focus:border-peach focus:ring-4 focus:ring-peach/15",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
TextField.displayName = "TextField";
