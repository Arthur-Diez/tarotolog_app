import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center text-muted-foreground">
        <CalendarDays className="h-10 w-10 text-secondary" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Мой календарь</h2>
          <p className="text-sm">В разработке — скоро вы сможете отслеживать ключевые события.</p>
        </div>
      </div>
    </div>
  );
}
