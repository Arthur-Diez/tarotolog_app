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
import { AdgramTaskBanner } from "@/components/ads/AdgramTaskBanner";
import { SectionGrid } from "@/components/sections/SectionGrid";
import { useEnergy } from "@/hooks/useEnergy";
import { useProfile } from "@/hooks/useProfile";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { DEFAULT_WIDGET_KEYS, type WidgetKey } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";
import { normalizeWidgets } from "@/stores/profileState";

const sections = [
  {
    id: "tarot",
    title: "Расклады",
    description: "Глубокие расклады для любого запроса",
    icon: <LayoutDashboard className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
  },
  {
    id: "compatibility",
    title: "Совместимость",
    description: "Синергия и отношения с партнёром",
    icon: <HeartHandshake className="h-5 w-5 text-[var(--accent-pink)]" strokeWidth={1.4} />
  },
  {
    id: "horoscope",
    title: "Гороскоп",
    description: "Ежедневные подсказки от звезд",
    icon: <Sun className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
  },
  {
    id: "matrix",
    title: "Матрица судьбы",
    description: "Раскрой предназначение и таланты",
    icon: <Orbit className="h-5 w-5 text-[var(--accent-pink)]" strokeWidth={1.4} />
  },
  {
    id: "natal",
    title: "Натальная карта",
    description: "Твой личный космический паспорт",
    icon: <Star className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
  },
  {
    id: "numerology",
    title: "Нумерология",
    description: "Числа дня и жизненные циклы",
    icon: <Calculator className="h-5 w-5 text-[var(--accent-pink)]" strokeWidth={1.4} />
  },
  {
    id: "astroforecast",
    title: "Астропрогноз",
    description: "Сильные периоды и транзиты",
    icon: <MoonStar className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
  }
];

const MAX_ENERGY = 500;

interface HomeScreenProps {
  telegramUser?: TelegramUser | null;
}

export default function HomeScreen({ telegramUser }: HomeScreenProps) {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const { hasSubscription, loading: subscriptionLoading } = useSubscriptionStatus();
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
      icon: <Star className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
    },
    daily_spread: {
      title: "Ежедневный расклад",
      description: "Заглушка — практики и расклады появятся после релиза.",
      icon: <LayoutDashboard className="h-5 w-5 text-[var(--accent-pink)]" strokeWidth={1.4} />
    },
    individual_horoscope: {
      title: "Индивидуальный гороскоп",
      description: "Заглушка — персональный гороскоп готовится к запуску.",
      icon: <Sun className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
    },
    astro_forecast: {
      title: "Астропрогноз",
      description: "Заглушка — энергетика дня, тренды и подсказки появятся здесь.",
      icon: <MoonStar className="h-5 w-5 text-[var(--accent-pink)]" strokeWidth={1.4} />
    },
    numerology_forecast: {
      title: "Нумерологический прогноз",
      description: "Заглушка — числовые подсказки и расчёты скоро станут доступны.",
      icon: <Calculator className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
    }
  };

  const renderWidget = (key: WidgetKey) => {
    const meta = widgetMeta[key];
    if (!meta) {
      return null;
    }

    return (
      <div className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5 shadow-[0_25px_45px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl border border-white/15 bg-white/5 p-2">{meta.icon}</span>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{meta.title}</h3>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{meta.description}</p>
        <span className="text-[10px] uppercase tracking-[0.35em] text-[var(--text-tertiary)]">заглушка</span>
      </div>
    );
  };

  const skeletons = Array.from({ length: 3 }, (_, index) => (
    <div
      key={`skeleton-${index}`}
      className="rounded-[24px] border border-white/5 bg-white/5 p-6 opacity-70 animate-pulse"
    />
  ));

  const handleSectionSelect = useCallback(
    (sectionId: string) => {
      switch (sectionId) {
        case "tarot":
          navigate("/spreads");
          break;
        case "horoscope":
          navigate("/horoscope");
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
      <AdgramTaskBanner visible={!subscriptionLoading && !hasSubscription} loading={subscriptionLoading} />
      <EnergyGauge level={level} glowIntensity={glowIntensity} max={gaugeMax} />
      <SectionGrid sections={sections} onSectionSelect={handleSectionSelect} />
      {loading && !profile ? skeletons : null}
      {!loading &&
        widgetKeys.map((widget) => (
          <Fragment key={widget}>{renderWidget(widget)}</Fragment>
        ))}
      <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Sparkles className="h-4 w-4 text-[var(--accent-pink)]" strokeWidth={1.4} />
        <span>Настройка интеграции с ботом скоро будет доступна</span>
      </div>
    </div>
  );
}
