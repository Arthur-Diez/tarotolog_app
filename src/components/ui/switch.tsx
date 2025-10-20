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
          "relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition",
          checked ? "bg-secondary" : "bg-muted",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-background shadow transition",
            checked ? "translate-x-[22px]" : "translate-x-1"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";
