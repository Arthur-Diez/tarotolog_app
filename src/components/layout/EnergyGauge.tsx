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
  const glowOpacity = Math.min(0.5 + glowIntensity * 0.25, 0.95);

  return (
    <div className={cn("glass-panel relative overflow-hidden rounded-3xl p-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Энергия</p>
          <p className="text-3xl font-semibold text-foreground">{Math.round(percentage)}%</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Максимум: {max}</p>
          <p>Баланс гармонии</p>
        </div>
      </div>
      <div className="mt-5 h-3 w-full rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="h-full rounded-full bg-energy-gradient"
          style={{ boxShadow: `0 0 25px rgba(112, 83, 244, ${glowOpacity})` }}
        />
      </div>
      <motion.div
        className="pointer-events-none absolute -inset-10 opacity-40 blur-3xl"
        animate={{ opacity: glowOpacity }}
        style={{ background: "radial-gradient(circle at top, rgba(112,83,244,0.45), transparent 65%)" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />
    </div>
  );
}
