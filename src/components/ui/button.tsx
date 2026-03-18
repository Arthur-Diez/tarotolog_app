import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-blur)] text-[var(--text-primary)] shadow-[var(--surface-shadow-soft)] border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] hover:bg-[var(--bg-card-strong)]",
        primary:
          "bg-[var(--accent-gold)] text-[hsl(var(--secondary-foreground))] shadow-[var(--surface-shadow-soft)] hover:brightness-105",
        outline:
          "border border-[var(--surface-border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-chip-bg)]",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        muted: "bg-[var(--surface-chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
