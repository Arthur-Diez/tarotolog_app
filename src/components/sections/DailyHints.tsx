import { Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DailyHintsProps {
  highlights: string[];
  focus: string;
  mantra: string;
}

export function DailyHints({ highlights, focus, mantra }: DailyHintsProps) {
  return (
    <Card className="border border-white/10 bg-[var(--bg-card)]/90">
      <CardHeader className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Сегодня сильный день для</p>
          <CardTitle className="mt-1 text-2xl text-[var(--accent-pink)]">{focus}</CardTitle>
        </div>
        <span className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <Lightbulb className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
        </span>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Мантра дня</p>
          <p className="mt-2 text-[var(--accent-pink)]">{mantra}</p>
        </div>
      </CardContent>
    </Card>
  );
}
