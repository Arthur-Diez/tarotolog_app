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

export default function HomeScreen() {
  const { level, glowIntensity } = useEnergy(82);

  const streakDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day, index) => ({
    day,
    completed: index < 5,
    isToday: index === 5
  }));

  return (
    <div className="space-y-6">
      <Header name="Артём Таро" username="tarot.mystic" energy={Math.round(level)} />
      <EnergyGauge level={level} glowIntensity={glowIntensity} />
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
      <Streak streakCount={5} days={streakDays} />
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
      />
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span>Настройка интеграции с ботом скоро будет доступна</span>
      </div>
    </div>
  );
}
