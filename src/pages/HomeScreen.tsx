import { useMemo } from "react";
import {
  Calculator,
  HeartHandshake,
  LayoutDashboard,
  MoonStar,
  Orbit,
  Sparkles,
  Star,
  Sun
} from "lucide-react";

import { EnergyGauge } from "@/components/layout/EnergyGauge";
import { Header } from "@/components/layout/Header";
import { CardOfDay } from "@/components/sections/CardOfDay";
import { BonusAndReminders } from "@/components/sections/BonusAndReminders";
import { DailyHints } from "@/components/sections/DailyHints";
import { SectionGrid } from "@/components/sections/SectionGrid";
import { Streak } from "@/components/sections/Streak";
import { useEnergy } from "@/hooks/useEnergy";
import type { InitWebAppResponse } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";

const sections = [
  {
    id: "tarot",
    title: "Расклады",
    description: "Глубокие расклады для любого запроса",
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    id: "compatibility",
    title: "Совместимость",
    description: "Синергия и отношения с партнёром",
    icon: <HeartHandshake className="h-5 w-5" />
  },
  {
    id: "horoscope",
    title: "Гороскоп",
    description: "Ежедневные подсказки от звезд",
    icon: <Sun className="h-5 w-5" />
  },
  {
    id: "matrix",
    title: "Матрица судьбы",
    description: "Раскрой предназначение и таланты",
    icon: <Orbit className="h-5 w-5" />
  },
  {
    id: "natal",
    title: "Натальная карта",
    description: "Твой личный космический паспорт",
    icon: <Star className="h-5 w-5" />
  },
  {
    id: "numerology",
    title: "Нумерология",
    description: "Числа дня и жизненные циклы",
    icon: <Calculator className="h-5 w-5" />
  },
  {
    id: "astroforecast",
    title: "Астропрогноз",
    description: "Сильные периоды и транзиты",
    icon: <MoonStar className="h-5 w-5" />
  }
];

const MAX_ENERGY = 500;

interface HomeScreenProps {
  user: InitWebAppResponse["user"];
  settings: InitWebAppResponse["settings"];
  telegramUser?: TelegramUser | null;
}

export default function HomeScreen({ user, settings, telegramUser }: HomeScreenProps) {
  const energyBalance = user?.energy_balance ?? 0;
  const { level, glowIntensity } = useEnergy(energyBalance);
  const streakCount = 0;
  const gaugeMax = Math.max(MAX_ENERGY, energyBalance || 0);

  const streakDays = useMemo(() => {
    const labels = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
    const todayIndex = ((new Date().getDay() + 6) % 7); // convert Sunday (0) to 6
    const completedThreshold = Math.min(streakCount, labels.length);
    return labels.map((day, index) => ({
      day,
      completed: index < completedThreshold,
      isToday: index === todayIndex
    }));
  }, [streakCount]);

  const displayName =
    user?.display_name ??
    telegramUser?.first_name ??
    telegramUser?.username ??
    "Гость";

  return (
    <div className="space-y-6">
      <Header name={displayName} username={telegramUser?.username} energy={energyBalance} />
      <EnergyGauge level={level} glowIntensity={glowIntensity} max={gaugeMax} />
      <CardOfDay
        card={{
          title: "Императрица",
          subtitle: "Пора раскрыть творческий потенциал",
          keywords: ["Изобилие", "Забота", "Созидание"],
          affirmation: "Я создаю пространство для чудес и любви",
          description:
            "Сегодня прояви заботу о себе и близких. Используй энергию дня, чтобы nurture проекты и идеи, которым давно не давал внимания."
        }}
      />
      <Streak streakCount={streakCount} days={streakDays} />
      <DailyHints
        focus="Раскрытия потенциала"
        highlights={["Создание новых проектов", "Работа с женской энергией", "Практики благодарности"]}
        mantra="Я в потоке изобилия и принимаю поддержку Вселенной"
      />
      <SectionGrid sections={sections} />
      <BonusAndReminders
        bonus={{
          title: "Ежедневный бонус",
          amount: 25,
          description: "Возвращайся каждый день и усиливай поток энергии"
        }}
        defaultReminder={settings?.notifications}
      />
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span>Настройка интеграции с ботом скоро будет доступна</span>
      </div>
    </div>
  );
}
