import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  name: string;
  username?: string;
  energy: number;
  className?: string;
}

export function Header({ name, username, energy, className }: HeaderProps) {
  const formattedEnergy = new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.round(energy)));

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/80 px-5 py-4 backdrop-blur-2xl",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-[22px] bg-[var(--accent-pink)]/20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/15 bg-[var(--bg-card-strong)] text-2xl font-semibold text-[var(--accent-pink)] shadow-[0_12px_35px_rgba(0,0,0,0.45)]">
            {name.slice(0, 1)}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Ваш проводник</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{name}</p>
          {username ? <p className="text-sm text-[var(--text-secondary)]">@{username}</p> : null}
          <p className="text-xs text-[var(--accent-gold)]">Энергия: {formattedEnergy} ⚡</p>
        </div>
      </div>
      <Button
        variant="primary"
        className="gap-2 whitespace-nowrap border border-white/10 bg-[var(--accent-gold)]/90 px-4 text-sm text-[#1b1610] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-[var(--accent-gold)]"
      >
        <Wallet className="h-4 w-4 text-[#1b1610]" strokeWidth={1.5} />
        Пополнить
      </Button>
    </div>
  );
}
