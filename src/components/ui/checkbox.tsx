import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-4 w-4 rounded-[10px] border border-white/20 bg-transparent accent-[var(--accent-pink)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
