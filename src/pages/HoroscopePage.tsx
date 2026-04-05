import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  ApiError,
  getFreeHoroscopeToday,
  type HoroscopeFreeTodayContentSection,
  type HoroscopeFreeTodayResponse
} from "@/lib/api";

type OneOffId = "tomorrow" | "week" | "month" | "quarter" | "halfyear" | "year";
type SubscriptionId = "lite" | "plus";
type RitualErrorKind = "profile" | "auth" | "common" | null;

const mockProfile = {
  zodiacSign: "Лев",
  genderLabel: "Мужчина",
  todayLabel: "Сегодня",
  tzName: "Москва (UTC+03)"
};

const RITUAL_MIN_DURATION_MS = 1200;

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

interface StructuredSection {
  key: string;
  emoji: string;
  title: string;
  body: string;
}

interface NormalizedLocalizedContent {
  sections: StructuredSection[];
  bestTime: string | null;
  luckyColor: string | null;
}

export default function HoroscopePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const birthProfile = profile?.birth_profile;
  const timezoneLabel = profile?.user?.current_tz_name ?? mockProfile.tzName;

  const statusMessages = useMemo(
    () => [
      "Настраиваемся на ваш знак…",
      `Учитываем ваш часовой пояс (${timezoneLabel})…`,
      "Соединяем энергию дня…"
    ],
    [timezoneLabel]
  );

  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [horoscope, setHoroscope] = useState<HoroscopeFreeTodayResponse | null>(null);
  const [errorKind, setErrorKind] = useState<RitualErrorKind>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    if (!isOpening) {
      setStatusIndex(0);
      return;
    }
    setStatusIndex(0);
    const interval = window.setInterval(() => {
      setStatusIndex((prev) => (prev + 1 < statusMessages.length ? prev + 1 : prev));
    }, 500);
    return () => {
      window.clearInterval(interval);
    };
  }, [isOpening, statusMessages]);

  const currentStatus = statusMessages[Math.min(statusIndex, statusMessages.length - 1)];

  const runHoroscopeFlow = () => {
    if (isOpening) return;
    if (isOpened) {
      setIsOpened(false);
      return;
    }

    setErrorKind(null);
    setErrorMsg(null);
    setIsOpening(true);
    setStatusIndex(0);

    const startedAt = Date.now();
    const ensureAuraDelay = async () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < RITUAL_MIN_DURATION_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, RITUAL_MIN_DURATION_MS - elapsed));
      }
    };

    const loadHoroscope = async () => {
      try {
        const response = await getFreeHoroscopeToday();
        await ensureAuraDelay();
        setHoroscope(response);
        setIsOpened(true);
      } catch (error) {
        await ensureAuraDelay();
        setHoroscope(null);
        setIsOpened(false);
        if (error instanceof ApiError) {
          if (error.status === 409) {
            setErrorKind("profile");
            setErrorMsg("Заполните профиль (дата рождения, пол, часовой пояс), чтобы получить прогноз");
          } else if (error.status === 401) {
            setErrorKind("auth");
            setErrorMsg("Сессия истекла. Откройте мини-приложение из Telegram-бота, чтобы продолжить.");
          } else {
            setErrorKind("common");
            setErrorMsg(error.message || "Не удалось получить гороскоп, попробуйте ещё раз.");
          }
        } else {
          setErrorKind("common");
          setErrorMsg("Не удалось получить гороскоп, попробуйте ещё раз.");
        }
      } finally {
        setIsOpening(false);
      }
    };

    void loadHoroscope();
  };

  const handlePersonalize = () => {
    setPreview({
      title: "Персонализировать 🔥",
      priceLabel: "Скоро",
      bullets: [
        "Индивидуальные расчёты по времени рождения",
        "Глубокая настройка под ваш запрос",
        "Интеграция с персональными циклами"
      ],
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

  const content = horoscope?.content ?? null;
  const textMd = content?.text_md ?? "";
  const { sections: localizedSections, bestTime, luckyColor } = useMemo(
    () => normalizeLocalizedContent(content?.localized_json),
    [content?.localized_json]
  );
  const hasLuckySection = localizedSections.some((section) => section.key === "lucky");
  const showMarkdown = Boolean(textMd) && !localizedSections.length;

  const zodiacLabel = horoscope?.meta?.zodiac_sign ?? birthProfile?.zodiac_sign ?? mockProfile.zodiacSign;
  const genderFromProfile = getGenderLabel(birthProfile?.gender);
  const genderLabel = horoscope?.meta?.gender_label ?? genderFromProfile ?? mockProfile.genderLabel;
  const todayLabel = horoscope?.meta?.period_label ?? mockProfile.todayLabel;

  const renderErrorBlock = () => {
    if (!errorKind || !errorMsg) return null;
    if (errorKind === "profile") {
      return (
        <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
          <p>{errorMsg}</p>
          <Button className="w-full" onClick={() => navigate("/profile")}>
            Заполнить профиль
          </Button>
        </div>
      );
    }
    return (
      <div className="rounded-[20px] border border-white/10 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {errorMsg}
      </div>
    );
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
            <Button variant="outline" size="sm" className="w-full" onClick={() => openProductPreview(product.id)}>
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
        <Button className="mt-4 w-full" variant={plan.id === "plus" ? "primary" : "default"} onClick={() => handlePlanToggle(plan.id)}>
          {active ? "Посмотреть сегодня" : "Подключить"}
        </Button>
      </Card>
    );
  });

  const openButtonLabel = isOpening ? "Открываем…" : isOpened ? "Свернуть ритуал" : "Открыть гороскоп 🔮";

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
            {zodiacLabel} · {genderLabel} · {todayLabel}
          </p>
        </div>
        {!isOpening && !isOpened && !errorKind ? (
          <p className="text-base text-[var(--text-secondary)]">✨ Узнай, что приготовил этот день именно для тебя</p>
        ) : null}

        {isOpening ? (
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-5 text-center">
            <div className="absolute inset-0 animate-pulse bg-white/5" />
            <div className="relative flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-pink)]" />
              <p className="text-sm text-[var(--text-secondary)]">{currentStatus}</p>
            </div>
          </div>
        ) : null}

        {!isOpening && renderErrorBlock()}

        {isOpened && horoscope ? (
          <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
            {showMarkdown ? <HoroscopeMarkdown text={textMd} /> : null}
            {localizedSections.length ? (
              <div className="space-y-4 text-sm text-[var(--text-secondary)]">
                {localizedSections.map((section) => (
                  <HoroscopeSection
                    key={section.key}
                    emoji={section.emoji}
                    title={section.title}
                    body={section.body}
                  />
                ))}
              </div>
            ) : null}
            {(bestTime || luckyColor) && !hasLuckySection ? (
              <div className="space-y-1 text-sm text-[var(--text-primary)]">
                {bestTime ? <p>🎯 Лучшее время: {bestTime}</p> : null}
                {luckyColor ? <p>🎨 Цвет дня: {luckyColor}</p> : null}
              </div>
            ) : null}
            {!showMarkdown && !localizedSections.length && !bestTime && !luckyColor ? (
              <p className="text-sm text-[var(--text-secondary)]">Нет данных. Попробуйте ещё раз позже.</p>
            ) : null}
            <Button className="w-full" onClick={handlePersonalize}>
              Персонализировать 🔥
            </Button>
          </div>
        ) : null}

        <Button className="w-full" onClick={runHoroscopeFlow} disabled={isOpening}>
          {openButtonLabel}
        </Button>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">🔓 Разовые прогнозы</h3>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">витрина</p>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">{oneOffCards}</div>
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

function getGenderLabel(value?: string | null): string | null {
  if (value === "male") return "Мужчина";
  if (value === "female") return "Женщина";
  if (value === "other") return "Другое";
  return null;
}

function normalizeLocalizedContent(raw: unknown): NormalizedLocalizedContent {
  const sections: StructuredSection[] = [];
  const sectionTitleIndex = new Map<string, number>();
  let bestTime: string | null = null;
  let luckyColor: string | null = null;

  const pushSection = (section: StructuredSection) => {
    const normalizedTitle = section.title.trim().toLowerCase();
    const existingIndex = sectionTitleIndex.get(normalizedTitle);
    if (existingIndex === undefined) {
      sectionTitleIndex.set(normalizedTitle, sections.length);
      sections.push(section);
      return;
    }
    const existing = sections[existingIndex];
    if ((section.body || "").length > (existing.body || "").length) {
      sections[existingIndex] = section;
    }
  };

  if (!raw) {
    return { sections, bestTime, luckyColor };
  }

  const record = isRecord(raw) ? raw : null;

  if (record) {
    const dayTheme = readString(record.day_theme);
    if (dayTheme) {
      pushSection({ key: "day_theme", emoji: "🌗", title: "Тема дня", body: dayTheme });
    }

    const mood = readString(record.mood);
    if (mood) {
      pushSection({ key: "mood", emoji: "🧠", title: "Настрой", body: mood });
    }

    const blockConfigs: Array<{ key: string; emoji: string; title: string }> = [
      { key: "love", emoji: "❤️", title: "Любовь" },
      { key: "career", emoji: "💼", title: "Карьера" },
      { key: "money", emoji: "💰", title: "Деньги" },
      { key: "health", emoji: "🧘", title: "Здоровье" }
    ];

    blockConfigs.forEach(({ key, emoji, title }) => {
      const block = readFocusAdvice(record[key]);
      if (block) {
        pushSection({ key, emoji, title, body: block });
      }
    });

    const lucky = readLucky(record.lucky);
    if (lucky) {
      const luckyParts: string[] = [];
      if (lucky.color) {
        luckyParts.push(`Цвет: ${capitalize(lucky.color)}`);
        luckyColor = lucky.color;
      }
      if (lucky.number) {
        luckyParts.push(`Число: ${lucky.number}`);
      }
      if (lucky.timeWindow) {
        luckyParts.push(`Время: ${lucky.timeWindow}`);
        bestTime = lucky.timeWindow;
      }
      if (luckyParts.length) {
        pushSection({ key: "lucky", emoji: "🍀", title: "Удача", body: luckyParts.join(" • ") });
      }
    }

    const affirmation = readString(record.affirmation);
    if (affirmation) {
      pushSection({ key: "affirmation", emoji: "🪄", title: "Аффирмация", body: affirmation });
    }

    bestTime = bestTime ?? readString(record.best_time) ?? null;
    luckyColor = luckyColor ?? readString(record.lucky_color) ?? null;

    const legacySections = readLegacySections(record.sections);
    legacySections.forEach(pushSection);
  }

  return { sections, bestTime, luckyColor };
}

function readLegacySections(value: unknown): StructuredSection[] {
  if (!Array.isArray(value)) return [];
  const result: StructuredSection[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const section = item as HoroscopeFreeTodayContentSection;
    const body = section.text ?? section.title;
    if (!body) return;
    result.push({
      key: `legacy-${section.key ?? index}`,
      emoji: section.emoji ?? "✨",
      title: section.title ?? "Секция",
      body
    });
  });
  return result;
}

function readFocusAdvice(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const focus = readString(value.focus);
  const advice = readString(value.advice);
  const parts: string[] = [];
  if (focus) {
    parts.push(focus);
  }
  if (advice) {
    parts.push(`Совет: ${advice}`);
  }
  if (!parts.length) {
    return null;
  }
  return parts.join(" ");
}

function readLucky(value: unknown): { color?: string | null; number?: string | null; timeWindow?: string | null } | null {
  if (!isRecord(value)) return null;
  const color = readString(value.color);
  const numberValue = value.number;
  const number =
    typeof numberValue === "number"
      ? String(numberValue)
      : typeof numberValue === "string"
        ? numberValue
        : null;
  const timeWindow = readString(value.time_window ?? value.timeWindow ?? value.time);
  if (!color && !number && !timeWindow) {
    return null;
  }
  return { color, number, timeWindow };
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function splitMarkdownLine(line: string) {
  const nodes: Array<{ type: "text" | "bold"; value: string }> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }
    nodes.push({ type: "bold", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    nodes.push({ type: "text", value: line.slice(lastIndex) });
  }
  if (!nodes.length) {
    nodes.push({ type: "text", value: line });
  }
  return nodes;
}

function HoroscopeMarkdown({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
      {lines.map((line, index) => (
        <p key={`line-${index}`} className="leading-relaxed">
          {splitMarkdownLine(line).map((node, nodeIndex) =>
            node.type === "bold" ? (
              <strong key={`bold-${index}-${nodeIndex}`} className="text-[var(--text-primary)]">
                {node.value}
              </strong>
            ) : (
              <span key={`text-${index}-${nodeIndex}`}>{node.value}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

function HoroscopeSection({ emoji, title, body }: { emoji?: string | null; title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {emoji ? `${emoji} ` : null}
        {title}
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
          <button type="button" className="text-sm text-[var(--text-secondary)]" onClick={onClose}>
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
