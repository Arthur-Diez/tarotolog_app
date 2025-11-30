import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StreakDay {
  day: string;
  completed: boolean;
  isToday?: boolean;
}

export interface StreakProps {
  days: StreakDay[];
  streakCount: number;
}

export function Streak({ days, streakCount }: StreakProps) {
  return (
    <Card className="border border-white/10 bg-[var(--bg-card)]/85">
      <CardHeader className="mb-3">
        <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">Серия дней</CardTitle>
        <p className="text-sm text-[var(--text-secondary)]">Поддерживай серию — получай бонусы</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-4xl font-semibold text-[var(--accent-pink)]">{streakCount}</p>
          <p className="text-sm text-[var(--text-tertiary)]">дней подряд</p>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <motion.div
              key={day.day}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl border text-xs font-medium backdrop-blur-sm",
                day.completed
                  ? "border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]"
                  : "border-white/10 bg-white/5 text-[var(--text-tertiary)]",
                day.isToday && !day.completed ? "text-[var(--accent-pink)]" : null
              )}
            >
              <span className="text-[11px] uppercase tracking-[0.3em]">{day.day}</span>
              <span className="text-sm font-semibold">
                {day.completed ? "⚡" : day.isToday ? "•" : ""}
              </span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
