import { useState } from "react";
import { Gift, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export interface BonusAndRemindersProps {
  bonus: {
    title: string;
    amount: number;
    description: string;
  };
  defaultReminder?: boolean;
}

export function BonusAndReminders({ bonus, defaultReminder = true }: BonusAndRemindersProps) {
  const [reminderEnabled, setReminderEnabled] = useState(defaultReminder);

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-4 border border-[rgba(217,194,163,0.25)] bg-gradient-to-br from-[rgba(238,205,245,0.18)] via-[rgba(18,14,23,0.3)] to-transparent p-5 text-left shadow-[0_35px_60px_rgba(0,0,0,0.6)]">
        <div>
          <div className="flex items-center gap-2 text-[var(--accent-gold)]">
            <Gift className="h-5 w-5" strokeWidth={1.4} />
            <p className="text-xs uppercase tracking-[0.3em]">{bonus.title}</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent-pink)]">+{bonus.amount} ⚡</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{bonus.description}</p>
        </div>
        <Button variant="primary" className="h-11 rounded-2xl px-6">
          Забрать
        </Button>
      </Card>

      <Card className="border border-white/10 bg-[var(--bg-card)]/90">
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <Bell className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
              <p className="text-xs uppercase tracking-[0.3em]">Напоминания</p>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Получай уведомления о карте дня и бонусах
            </p>
          </div>
          <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
