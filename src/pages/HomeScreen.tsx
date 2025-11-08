import { Fragment, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { SectionGrid } from "@/components/sections/SectionGrid";
import { useEnergy } from "@/hooks/useEnergy";
import { useProfile } from "@/hooks/useProfile";
import { DEFAULT_WIDGET_KEYS, type WidgetKey } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";
import { normalizeWidgets } from "@/stores/profileState";

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
  telegramUser?: TelegramUser | null;
}

export default function HomeScreen({ telegramUser }: HomeScreenProps) {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const profileData = profile?.user;
  const widgetKeys =
    profile?.preferences?.widgets && profile.preferences.widgets.length
      ? normalizeWidgets(profile.preferences.widgets)
      : DEFAULT_WIDGET_KEYS;

  const energyBalance = profileData?.energy_balance ?? 0;
  const { level, glowIntensity } = useEnergy(energyBalance);
  const gaugeMax = Math.max(MAX_ENERGY, energyBalance || 0);

  const displayName =
    profileData?.display_name ??
    telegramUser?.first_name ??
    telegramUser?.username ??
    "Гость";

  const widgetMeta: Record<WidgetKey, { title: string; description: string; icon: JSX.Element }> = {
    card_of_day: {
      title: "Карта дня",
      description: "Заглушка — персональная карта дня появится здесь позже.",
      icon: <Star className="h-5 w-5 text-secondary" />
    },
    daily_spread: {
      title: "Ежедневный расклад",
      description: "Заглушка — практики и расклады появятся после релиза.",
      icon: <LayoutDashboard className="h-5 w-5 text-secondary" />
    },
    individual_horoscope: {
      title: "Индивидуальный гороскоп",
      description: "Заглушка — персональный гороскоп готовится к запуску.",
      icon: <Sun className="h-5 w-5 text-secondary" />
    },
    astro_forecast: {
      title: "Астропрогноз",
      description: "Заглушка — энергетика дня, тренды и подсказки появятся здесь.",
      icon: <MoonStar className="h-5 w-5 text-secondary" />
    },
    numerology_forecast: {
      title: "Нумерологический прогноз",
      description: "Заглушка — числовые подсказки и расчёты скоро станут доступны.",
      icon: <Calculator className="h-5 w-5 text-secondary" />
    }
  };

  const renderWidget = (key: WidgetKey) => {
    const meta = widgetMeta[key];
    if (!meta) {
      return null;
    }

    return (
      <div className="glass-panel flex flex-col gap-3 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          {meta.icon}
          <h3 className="text-lg font-semibold text-foreground">{meta.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
        <span className="text-xs uppercase tracking-wide text-secondary/70">заглушка</span>
      </div>
    );
  };

  const skeletons = Array.from({ length: 3 }, (_, index) => (
    <div
      key={`skeleton-${index}`}
      className="glass-panel h-20 animate-pulse rounded-3xl bg-muted/20"
    />
  ));

  const handleSectionSelect = useCallback(
    (sectionId: string) => {
      switch (sectionId) {
        case "tarot":
          navigate("/spreads");
          break;
        default:
          console.debug("[ui] section clicked", sectionId);
      }
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      <Header name={displayName} username={telegramUser?.username} energy={energyBalance} />
      <EnergyGauge level={level} glowIntensity={glowIntensity} max={gaugeMax} />
      <SectionGrid sections={sections} onSectionSelect={handleSectionSelect} />
      {loading && !profile ? skeletons : null}
      {!loading &&
        widgetKeys.map((widget) => (
          <Fragment key={widget}>{renderWidget(widget)}</Fragment>
        ))}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span>Настройка интеграции с ботом скоро будет доступна</span>
      </div>
    </div>
  );
}
