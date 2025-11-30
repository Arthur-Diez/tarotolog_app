import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-blur)] text-[var(--text-primary)] shadow-[0_10px_25px_rgba(0,0,0,0.4)] border border-white/10 hover:border-white/20 hover:bg-[var(--bg-card-strong)]",
        primary:
          "bg-[var(--accent-gold)]/90 text-[#2b1f16] shadow-[0_15px_35px_rgba(0,0,0,0.45)] hover:bg-[var(--accent-gold)]",
        outline:
          "border border-white/15 bg-transparent text-[var(--text-primary)] hover:bg-white/5 hover:text-white",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        muted: "bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
