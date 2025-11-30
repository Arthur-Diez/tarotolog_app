import { Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";

export default function EnergyPage() {
  const { profile, loading } = useProfile();
  const user = profile?.user;
  const energyBalance = user?.energy_balance ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/15 bg-white/5">
          <Zap className="h-7 w-7 text-[var(--accent-gold)]" strokeWidth={1.4} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Энергия аккаунта</p>
          {loading && !profile ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-white/10" />
          ) : (
            <p className="mt-2 text-3xl font-semibold text-[var(--accent-pink)]">{energyBalance} ⚡</p>
          )}
          {user?.telegram.username ? (
            <p className="text-xs text-[var(--text-secondary)]">@{user.telegram.username}</p>
          ) : null}
        </div>
      </div>

      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-6 text-center text-[var(--text-secondary)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Энергия</h2>
        <p className="mt-2 text-sm">
          Скоро здесь появится аналитика энергии, рекомендации по пополнению и история операций.
        </p>
      </Card>
    </div>
  );
}
