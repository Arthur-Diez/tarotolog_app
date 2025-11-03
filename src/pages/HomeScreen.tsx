import { Fragment, useMemo } from "react";
import { Calculator, HeartHandshake, LayoutDashboard, MoonStar, Orbit, Sparkles, Star, Sun } from "lucide-react";

import { EnergyGauge } from "@/components/layout/EnergyGauge";
import { Header } from "@/components/layout/Header";
import { CardOfDay } from "@/components/sections/CardOfDay";
import { DailyHints } from "@/components/sections/DailyHints";
import { SectionGrid } from "@/components/sections/SectionGrid";
import { Streak } from "@/components/sections/Streak";
import { useEnergy } from "@/hooks/useEnergy";
import type { InitWebAppResponse, WidgetKey } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";
import { useProfileState } from "@/stores/profileState";

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
  telegramUser?: TelegramUser | null;
}

export default function HomeScreen({ user, telegramUser }: HomeScreenProps) {
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

  const widgets = useProfileState((state) => state.widgets);
  const widgetOrder: WidgetKey[] = [
    "card_of_day",
    "daily_spread",
    "individual_horoscope",
    "astro_forecast",
    "numerology_forecast"
  ];
  const activeWidgets = widgetOrder.filter((key) => widgets.includes(key));

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case "card_of_day":
        return (
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
        );
      case "daily_spread":
        return (
          <>
            <Streak streakCount={streakCount} days={streakDays} />
            <div className="glass-panel flex flex-col gap-2 rounded-3xl p-6">
              <div className="flex items-center gap-3 text-secondary">
                <LayoutDashboard className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Расклад на день</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Персональный ориентир на ближайшие события и энергии. Обновляется каждый день.
              </p>
            </div>
          </>
        );
      case "individual_horoscope":
        return (
          <div className="glass-panel flex flex-col gap-3 rounded-3xl p-6">
            <div className="flex items-center gap-3 text-secondary">
              <Sun className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Индивидуальный гороскоп</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Личный гороскоп, сформированный с учётом даты и места рождения. Скоро добавим
              персональные рекомендации.
            </p>
          </div>
        );
      case "astro_forecast":
        return (
          <DailyHints
            focus="Астропрогноз на сегодня"
            highlights={[
              "Главные аспекты дня",
              "Гармоничные временные окна",
              "Сферы, требующие внимания"
            ]}
            mantra="Я следую подсказкам вселенной и остаюсь в потоке"
          />
        );
      case "numerology_forecast":
        return (
          <div className="glass-panel flex flex-col gap-3 rounded-3xl p-6">
            <div className="flex items-center gap-3 text-secondary">
              <Calculator className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Нумерологический прогноз</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Узнай значимые числа, которые раскрывают потенциал дня и помогают выбрать верное
              направление.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Header name={displayName} username={telegramUser?.username} energy={energyBalance} />
      <EnergyGauge level={level} glowIntensity={glowIntensity} max={gaugeMax} />
      <SectionGrid sections={sections} />
      {activeWidgets.map((widget) => (
        <Fragment key={widget}>{renderWidget(widget)}</Fragment>
      ))}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span>Настройка интеграции с ботом скоро будет доступна</span>
      </div>
    </div>
  );
}
