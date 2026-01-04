import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RitualState = "closed" | "loading" | "opened";
type OneOffId = "tomorrow" | "week" | "month" | "quarter" | "halfyear" | "year";
type SubscriptionId = "lite" | "plus";

const mockProfile = {
  zodiacSign: "Лев",
  genderLabel: "Мужчина",
  todayLabel: "Сегодня",
  tzName: "Москва (UTC+03)"
};

const ritualStatuses = [
  "Настраиваемся на ваш знак…",
  `Учитываем ваш часовой пояс (${mockProfile.tzName})…`,
  "Соединяем энергию дня…"
];

const oneOffProducts: Array<{
  id: OneOffId;
  title: string;
  price: number;
  description: string[];
}> = [
  { id: "tomorrow", title: "Завтра", price: 10, description: ["Тема дня", "Лучшие моменты", "Предупреждения"] },
  {
    id: "week",
    title: "Неделя",
    price: 25,
    description: ["Общая тема", "Любовь", "Работа и финансы", "Пики энергии", "Благоприятные дни", "Риски"]
  },
  {
    id: "month",
    title: "Месяц",
    price: 60,
    description: ["Главное влияние", "Ключевые задачи", "Любовь/Работа", "Окна возможностей"]
  },
  {
    id: "quarter",
    title: "3 месяца",
    price: 120,
    description: ["Тренды сезона", "Отношения", "Финансы", "Энергетические циклы"]
  },
  {
    id: "halfyear",
    title: "Полгода",
    price: 200,
    description: ["Годовой вектор", "Риски", "Поддержка вселенной", "Лучшие периоды"]
  },
  {
    id: "year",
    title: "Год",
    price: 350,
    description: ["Большой цикл", "Судьбоносные развилки", "План действий"]
  }
];

const subscriptionPlans: Array<{
  id: SubscriptionId;
  title: string;
  badge?: string;
  highlights: string[];
}> = [
  {
    id: "lite",
    title: "Daily Lite",
    highlights: ["✨ Персональный гороскоп каждое утро", "⏰ Лучшее время дня", "🎯 Фокус дня"]
  },
  {
    id: "plus",
    title: "Daily Plus",
    badge: "⭐ Рекомендуем",
    highlights: [
      "🌞 Утренний гороскоп",
      "🌙 Вечерний разбор дня",
      "⚡ Энергетические рекомендации",
      "📅 Лучшие окна для решений"
    ]
  }
];

interface PaywallPreviewState {
  title: string;
  priceLabel: string;
  bullets: string[];
  confirmLabel: string;
  onConfirm: () => void;
}

export default function HoroscopePage() {
  const navigate = useNavigate();
  const [ritualState, setRitualState] = useState<RitualState>("closed");
  const [ritualStep, setRitualStep] = useState(0);
  const [purchases, setPurchases] = useState<Record<OneOffId, boolean>>(() => ({
    tomorrow: false,
    week: false,
    month: false,
    quarter: false,
    halfyear: false,
    year: false
  }));
  const [activePlan, setActivePlan] = useState<SubscriptionId | null>(null);
  const [preview, setPreview] = useState<PaywallPreviewState | null>(null);

  useEffect(() => {
    if (ritualState !== "loading") return;
    setRitualStep(0);
    let step = 0;
    const statusInterval = window.setInterval(() => {
      step = Math.min(step + 1, ritualStatuses.length - 1);
      setRitualStep(step);
    }, 600);
    const finishTimeout = window.setTimeout(() => {
      setRitualState("opened");
      window.clearInterval(statusInterval);
    }, 2000);
    return () => {
      window.clearInterval(statusInterval);
      window.clearTimeout(finishTimeout);
    };
  }, [ritualState]);

  const currentStatus = ritualStatuses[Math.min(ritualStep, ritualStatuses.length - 1)];

  const handleOpenRitual = () => {
    if (ritualState === "loading") return;
    if (ritualState === "opened") {
      setRitualState("closed");
      return;
    }
    setRitualState("loading");
  };

  const handlePersonalize = () => {
    setPreview({
      title: "Персонализировать 🔥",
      priceLabel: "Скоро",
      bullets: ["Индивидуальные расчёты по времени рождения", "Глубокая настройка под ваш запрос", "Интеграция с персональными циклами"],
      confirmLabel: "Узнать первым",
      onConfirm: () => {
        setPreview(null);
      }
    });
  };

  const openProductPreview = (product: OneOffId) => {
    const data = oneOffProducts.find((item) => item.id === product);
    if (!data) return;
    setPreview({
      title: `🔮 Гороскоп на ${data.title.toLowerCase()}`,
      priceLabel: `${data.price} ⚡`,
      bullets: [
        "Общая тема периода",
        "Любовь и отношения",
        "Работа и деньги",
        "Энергетические пики",
        "Благоприятные дни",
        "Риски и советы"
      ],
      confirmLabel: `Получить за ${data.price} ⚡`,
      onConfirm: () => {
        setPurchases((prev) => ({ ...prev, [product]: true }));
        setPreview(null);
      }
    });
  };

  const handlePlanToggle = (plan: SubscriptionId) => {
    setActivePlan((prev) => (prev === plan ? null : plan));
  };

  const oneOffCards = oneOffProducts.map((product) => {
    const purchased = purchases[product.id];
    return (
      <Card
        key={product.id}
        className={`min-w-[160px] snap-start rounded-[24px] border border-white/10 bg-[var(--bg-card)]/90 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)] ${
          !purchased ? "opacity-80" : "border-[var(--accent-pink)]/40"
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>{product.title}</span>
            <span>{purchased ? "🔓" : "🔒"}</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{product.price} ⚡</p>
          {purchased ? (
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>Доступно</p>
              <Button size="sm" className="w-full" onClick={() => openProductPreview(product.id)}>
                Открыть
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => openProductPreview(product.id)}
            >
              Подробнее
            </Button>
          )}
        </div>
      </Card>
    );
  });

  const subscriptionCards = subscriptionPlans.map((plan) => {
    const active = activePlan === plan.id;
    return (
      <Card
        key={plan.id}
        className={`rounded-[26px] border border-white/10 bg-[var(--bg-card)]/90 p-5 shadow-[0_30px_60px_rgba(0,0,0,0.55)] ${
          plan.id === "plus" ? "relative overflow-hidden ring-1 ring-[var(--accent-pink)]/50" : ""
        }`}
      >
        {plan.badge ? (
          <span className="mb-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-[var(--accent-pink)]">
            <Sparkles className="h-3 w-3" /> {plan.badge}
          </span>
        ) : null}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">{plan.title}</h3>
          {active ? <span className="text-sm text-[var(--accent-pink)]">Активно</span> : null}
        </div>
        <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
          {plan.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Button
          className="mt-4 w-full"
          variant={plan.id === "plus" ? "primary" : "default"}
          onClick={() => handlePlanToggle(plan.id)}
        >
          {active ? "Посмотреть сегодня" : "Подключить"}
        </Button>
      </Card>
    );
  });

  return (
    <div className="space-y-6 pb-28">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Энергия дня</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Гороскоп</h1>
        </div>
      </header>

      <Card className="space-y-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/90 p-6 shadow-[0_35px_70px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-[var(--text-secondary)]">Ритуал дня · FREE</p>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">🌙 Гороскоп на сегодня</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {mockProfile.zodiacSign} · {mockProfile.genderLabel} · {mockProfile.todayLabel}
          </p>
        </div>
        {ritualState === "closed" ? (
          <p className="text-base text-[var(--text-secondary)]">✨ Узнай, что приготовил этот день именно для тебя</p>
        ) : null}

        {ritualState === "loading" ? (
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-5 text-center">
            <div className="absolute inset-0 animate-pulse bg-white/5" />
            <div className="relative flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-pink)]" />
              <p className="text-sm text-[var(--text-secondary)]">{currentStatus}</p>
            </div>
          </div>
        ) : null}

        {ritualState === "opened" ? (
          <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
            <p className="text-lg font-semibold text-[var(--text-primary)]">🌞 Сегодня для вас важно сохранять внутреннюю устойчивость</p>
            <div className="grid gap-4 text-sm text-[var(--text-secondary)]">
              <HoroscopeSection emoji="❤️" title="Любовь" body="Диалог откроет новые смыслы, не бойтесь мягкости." />
              <HoroscopeSection emoji="💼" title="Работа" body="Фокус на задачах до обеда принесёт лучший результат." />
              <HoroscopeSection emoji="💰" title="Деньги" body="Сдержанность поможет сохранить ресурсы." />
              <HoroscopeSection emoji="🧘" title="Здоровье" body="Поддержите тело дыхательными практиками." />
            </div>
            <div className="space-y-1 text-sm text-[var(--text-primary)]">
              <p>🎯 Лучшее время: 11:00–13:00</p>
              <p>🎨 Цвет дня: Золото</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={handlePersonalize}>
                Персонализировать 🔥
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRitualState("closed")}>
                Свернуть
              </Button>
            </div>
          </div>
        ) : null}

        {ritualState !== "loading" ? (
          <Button className="w-full" onClick={handleOpenRitual}>
            {ritualState === "opened" ? "Свернуть ритуал" : "Открыть гороскоп 🔮"}
          </Button>
        ) : null}
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">🔓 Разовые прогнозы</h3>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">витрина</p>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {oneOffCards}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Режимы</h3>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">подписки</p>
        </div>
        <div className="space-y-4">{subscriptionCards}</div>
      </section>

      <PaywallPreviewModal open={Boolean(preview)} onClose={() => setPreview(null)} state={preview} />
    </div>
  );
}

function HoroscopeSection({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {emoji} {title}
      </p>
      <p className="text-sm text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

interface PaywallPreviewModalProps {
  open: boolean;
  onClose: () => void;
  state: PaywallPreviewState | null;
}

function PaywallPreviewModal({ open, onClose, state }: PaywallPreviewModalProps) {
  if (!open || !state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-12 backdrop-blur-md">
      <div className="w-full max-w-[460px] space-y-4 rounded-[32px] border border-white/10 bg-[var(--bg-card)]/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">предпросмотр</p>
            <h4 className="text-xl font-semibold text-[var(--text-primary)]">{state.title}</h4>
          </div>
          <button
            type="button"
            className="text-sm text-[var(--text-secondary)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{state.priceLabel}</p>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          {state.bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={state.onConfirm}>
          {state.confirmLabel}
        </Button>
      </div>
    </div>
  );
}
