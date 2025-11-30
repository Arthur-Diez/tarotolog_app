import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-8 text-center text-[var(--text-secondary)] shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
        <CalendarDays className="h-10 w-10 text-[var(--accent-gold)]" strokeWidth={1.4} />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Мой календарь</h2>
          <p className="text-sm">В разработке — скоро вы сможете отслеживать ключевые события.</p>
        </div>
      </div>
    </div>
  );
}
