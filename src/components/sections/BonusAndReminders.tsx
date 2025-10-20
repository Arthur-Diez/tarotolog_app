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
      <Card className="glass-panel flex items-center justify-between gap-4 border-none bg-gradient-to-r from-[#7053f4]/15 via-[#a855f7]/10 to-[#ec4899]/10 p-5 text-left">
        <div>
          <div className="flex items-center gap-2 text-secondary">
            <Gift className="h-5 w-5" />
            <p className="text-sm uppercase tracking-wider">{bonus.title}</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">+{bonus.amount} ⚡</p>
          <p className="mt-1 text-sm text-muted-foreground">{bonus.description}</p>
        </div>
        <Button variant="default" className="h-10 rounded-2xl px-4">
          Забрать
        </Button>
      </Card>

      <Card className="glass-panel border-none">
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-5 w-5" />
              <p className="text-sm uppercase tracking-wider">Напоминания</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Получай уведомления о карте дня и бонусах
            </p>
          </div>
          <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
