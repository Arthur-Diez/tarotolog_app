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
    <Card className="glass-panel border-none bg-white/60 dark:bg-white/10">
      <CardHeader className="mb-3">
        <CardTitle className="text-lg font-semibold text-foreground">Серия дней</CardTitle>
        <p className="text-sm text-muted-foreground">Поддерживай серию — получай бонусы</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-4xl font-semibold text-secondary">{streakCount}</p>
          <p className="text-sm text-muted-foreground">дней подряд</p>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <motion.div
              key={day.day}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl border text-xs font-medium",
                day.completed
                  ? "border-secondary/40 bg-secondary/10 text-secondary"
                  : "border-white/20 bg-white/10 text-muted-foreground"
              )}
            >
              <span className="text-[11px] uppercase tracking-wide">{day.day}</span>
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
