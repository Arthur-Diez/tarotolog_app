import { Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";

export default function EnergyPage() {
  const { profile, loading } = useProfile();
  const user = profile?.user;
  const energyBalance = user?.energy_balance ?? 0;

  return (
    <div className="space-y-6">
      <div className="glass-panel flex items-center gap-4 rounded-3xl p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15">
          <Zap className="h-7 w-7 text-secondary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Энергия аккаунта</p>
          {loading && !profile ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted/30" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">{energyBalance} ⚡</p>
          )}
          {user?.telegram.username ? (
            <p className="text-xs text-muted-foreground">@{user.telegram.username}</p>
          ) : null}
        </div>
      </div>

      <Card className="glass-panel border-none p-6 text-center text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Энергия</h2>
        <p className="mt-2 text-sm">
          Скоро здесь появится аналитика энергии, рекомендации по пополнению и история операций.
        </p>
      </Card>
    </div>
  );
}
