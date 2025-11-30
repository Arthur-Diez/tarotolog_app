import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full border border-white/10 bg-[var(--bg-card)] transition",
          checked ? "bg-[var(--bg-card-strong)]" : "bg-[var(--bg-card)]",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-[var(--bg-blur)] shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition",
            checked
              ? "translate-x-[22px] bg-[var(--accent-pink)]"
              : "translate-x-1 bg-[var(--bg-blur)]"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";
