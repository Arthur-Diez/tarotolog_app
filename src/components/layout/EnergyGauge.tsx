import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface EnergyGaugeProps {
  level: number;
  glowIntensity: number;
  max?: number;
  className?: string;
}

export function EnergyGauge({ level, glowIntensity, max = 100, className }: EnergyGaugeProps) {
  const percentage = Math.min(level / max, 1) * 100;
  const glowOpacity = Math.min(0.45 + glowIntensity * 0.25, 0.9);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[var(--bg-card-strong)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-2xl",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Энергетика</p>
          <p className="mt-2 text-4xl font-semibold text-[var(--accent-pink)]">{Math.round(percentage)}%</p>
        </div>
        <div className="text-right text-xs text-[var(--text-secondary)]">
          <p>Максимум: {max}</p>
          <p>Баланс гармонии</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
          <span>низкая</span>
          <span>высокая</span>
        </div>
        <div className="relative h-4 w-full rounded-full bg-[var(--surface-chip-bg)] shadow-[var(--surface-inset)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
            className="absolute inset-y-0 left-0 rounded-full bg-energy-gradient"
            style={{
              boxShadow: `0 12px 30px rgba(255, 216, 187, ${glowOpacity}), inset 0 0 12px rgba(255,255,255,0.35)`
            }}
          />
        </div>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-30"
        animate={{ opacity: glowOpacity }}
        style={{ background: "radial-gradient(circle at 30% 0%, rgba(238,205,245,0.35), transparent 50%)" }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_35px_rgba(255,255,255,0.05)]" />
    </div>
  );
}
