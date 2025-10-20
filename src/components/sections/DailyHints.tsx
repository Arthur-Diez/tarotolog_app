import { Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DailyHintsProps {
  highlights: string[];
  focus: string;
  mantra: string;
}

export function DailyHints({ highlights, focus, mantra }: DailyHintsProps) {
  return (
    <Card className="glass-panel border-none bg-white/70 dark:bg-white/10">
      <CardHeader className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Сегодня сильный день для…</p>
          <CardTitle className="text-xl">{focus}</CardTitle>
        </div>
        <Lightbulb className="h-6 w-6 text-secondary" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-secondary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl bg-secondary/10 p-4 text-sm text-secondary">
          <p className="font-medium uppercase tracking-wider">Мантра дня</p>
          <p className="mt-1 text-secondary/90">{mantra}</p>
        </div>
      </CardContent>
    </Card>
  );
}
