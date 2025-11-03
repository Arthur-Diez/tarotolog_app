import { HelpCircle, Zap } from "lucide-react";

import { EnergyGauge } from "@/components/layout/EnergyGauge";
import { BonusAndReminders } from "@/components/sections/BonusAndReminders";
import { Card } from "@/components/ui/card";
import { useEnergy } from "@/hooks/useEnergy";
import type { InitWebAppResponse } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";

interface EnergyPageProps {
  user: InitWebAppResponse["user"];
  telegramUser?: TelegramUser | null;
}

export default function EnergyPage({ user, telegramUser }: EnergyPageProps) {
  const energyBalance = user?.energy_balance ?? 0;
  const { level, glowIntensity } = useEnergy(energyBalance);
  const gaugeMax = Math.max(500, energyBalance || 0);

  return (
    <div className="space-y-6">
      <div className="glass-panel flex items-center gap-4 rounded-3xl p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15">
          <Zap className="h-7 w-7 text-secondary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Энергия аккаунта</p>
          <p className="text-2xl font-semibold text-foreground">{energyBalance} ⚡</p>
          {telegramUser?.username ? (
            <p className="text-xs text-muted-foreground">@{telegramUser.username}</p>
          ) : null}
        </div>
      </div>

      <EnergyGauge level={level} glowIntensity={glowIntensity} max={gaugeMax} />

      <BonusAndReminders
        bonus={{
          title: "Ежедневный бонус",
          amount: 25,
          description: "Возвращайся каждый день и усиливай поток энергии"
        }}
        defaultReminder
      />

      <Card className="glass-panel space-y-3 border-none p-6">
        <div className="flex items-center gap-2 text-secondary">
          <HelpCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-foreground">Как пополнить энергию?</h3>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Заверши ежедневный расклад или практику.</li>
          <li>• Оформи подписку Tarotolog Premium и получи повышенный лимит.</li>
          <li>• Активируй промокоды, которые присылает бот в Telegram.</li>
        </ul>
      </Card>
    </div>
  );
}
