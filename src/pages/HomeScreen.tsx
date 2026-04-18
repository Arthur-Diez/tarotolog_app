import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  Crown,
  HeartHandshake,
  LayoutDashboard,
  Loader,
  MoonStar,
  NotebookPen,
  Orbit,
  RefreshCw,
  Sparkles,
  Star,
  Sun
} from "lucide-react";

import { DailyBonusCard } from "@/components/sections/DailyBonusCard";
import CardFaceImage from "@/components/tarot/CardFaceImage";
import { Button } from "@/components/ui/button";
import { useDailyCard } from "@/hooks/useDailyCard";
import { useProfile } from "@/hooks/useProfile";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { ApiError, createReading, getReading, viewReading } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";

interface HomeScreenProps {
  telegramUser?: TelegramUser | null;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  accentClassName: string;
  available: boolean;
  onClick?: () => void;
}

const DAILY_CARD_PENDING_STATUSES = new Set(["pending", "queued", "processing"]);
const DAILY_CARD_UNLOCK_STORAGE_KEY = "tarotolog_daily_card_unlock";

interface StoredDailyCardUnlock {
  localDate: string;
  readingId: string;
}

function getFocusTheme(energy: number) {
  if (energy <= 6) {
    return {
      status: "Лучше идти мягко и беречь ресурс.",
      focus: "Восстановление",
      ritualTitle: "День для тихой настройки",
      ritualBody: "Откройте однокарточный расклад, чтобы получить спокойную подсказку и не перегружать себя лишними решениями."
    };
  }

  if (energy <= 15) {
    return {
      status: "День для интуитивных решений и точных шагов.",
      focus: "Баланс",
      ritualTitle: "Карта дня ещё не открыта",
      ritualBody: "Сейчас лучший момент для короткого личного ритуала. Одна карта поможет поймать тон дня и задать направление."
    };
  }

  return {
    status: "Сильное окно для действий и ясных выборов.",
    focus: "Действие",
    ritualTitle: "Поле открыто для сильного хода",
    ritualBody: "Энергии достаточно, чтобы не распыляться. Откройте карту дня и переведите импульс в точное действие."
  };
}

function getDisplayName(telegramUser: TelegramUser | null | undefined, name?: string | null) {
  return name ?? telegramUser?.first_name ?? telegramUser?.username ?? "Гость";
}

function resolvePreferredLanguage(raw: unknown): "ru" | "en" {
  if (typeof raw !== "string") return "ru";
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "ru";
  if (normalized.startsWith("en") || normalized.includes("english")) return "en";
  return "ru";
}

function getZodiacLabel(zodiacSign?: string | null, birthDate?: string | null) {
  if (zodiacSign) {
    return zodiacSign
      .replace(/_/g, " ")
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  if (!birthDate) return "Не указан";
  const normalized = birthDate.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "Не указан";

  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return "Не указан";

  const zodiacRanges = [
    { label: "Козерог", start: [12, 22], end: [1, 19] },
    { label: "Водолей", start: [1, 20], end: [2, 18] },
    { label: "Рыбы", start: [2, 19], end: [3, 20] },
    { label: "Овен", start: [3, 21], end: [4, 19] },
    { label: "Телец", start: [4, 20], end: [5, 20] },
    { label: "Близнецы", start: [5, 21], end: [6, 20] },
    { label: "Рак", start: [6, 21], end: [7, 22] },
    { label: "Лев", start: [7, 23], end: [8, 22] },
    { label: "Дева", start: [8, 23], end: [9, 22] },
    { label: "Весы", start: [9, 23], end: [10, 22] },
    { label: "Скорпион", start: [10, 23], end: [11, 21] },
    { label: "Стрелец", start: [11, 22], end: [12, 21] }
  ] as const;

  const isWithinRange = (startMonth: number, startDay: number, endMonth: number, endDay: number) => {
    const current = month * 100 + day;
    const start = startMonth * 100 + startDay;
    const end = endMonth * 100 + endDay;
    if (start <= end) {
      return current >= start && current <= end;
    }
    return current >= start || current <= end;
  };

  const found = zodiacRanges.find((range) => isWithinRange(range.start[0], range.start[1], range.end[0], range.end[1]));
  return found?.label ?? "Не указан";
}

function formatDailyCardDate(value?: string | null) {
  if (!value) return "Сегодня";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "Сегодня";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(parsed);
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function readStoredDailyCardUnlock(): StoredDailyCardUnlock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(DAILY_CARD_UNLOCK_STORAGE_KEY) ??
      window.sessionStorage.getItem(DAILY_CARD_UNLOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDailyCardUnlock>;
    if (typeof parsed.localDate !== "string" || typeof parsed.readingId !== "string") {
      return null;
    }
    return {
      localDate: parsed.localDate,
      readingId: parsed.readingId
    };
  } catch {
    return null;
  }
}

function writeStoredDailyCardUnlock(localDate: string, readingId: string) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    localDate,
    readingId
  } satisfies StoredDailyCardUnlock);
  window.localStorage.setItem(DAILY_CARD_UNLOCK_STORAGE_KEY, payload);
  window.sessionStorage.setItem(DAILY_CARD_UNLOCK_STORAGE_KEY, payload);
}

function clearStoredDailyCardUnlock() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DAILY_CARD_UNLOCK_STORAGE_KEY);
  window.sessionStorage.removeItem(DAILY_CARD_UNLOCK_STORAGE_KEY);
}

export default function HomeScreen({ telegramUser }: HomeScreenProps) {
  const navigate = useNavigate();
  const { profile, refresh } = useProfile();
  const { dailyCard, loading: dailyCardLoading, error: dailyCardError, refresh: refreshDailyCard } = useDailyCard();
  const { hasSubscription, loading: subscriptionLoading } = useSubscriptionStatus();
  const [dailyCardUnlocking, setDailyCardUnlocking] = useState(false);
  const [dailyCardActionError, setDailyCardActionError] = useState<string | null>(null);
  const [storedDailyCardUnlock, setStoredDailyCardUnlock] = useState<StoredDailyCardUnlock | null>(() =>
    readStoredDailyCardUnlock()
  );

  const profileData = profile?.user;
  const displayName = getDisplayName(telegramUser, profileData?.display_name);
  const energyBalance = profileData?.energy_balance ?? 0;
  const zodiacLabel = getZodiacLabel(profile?.birth_profile?.zodiac_sign, profile?.birth_profile?.birth_date);
  const interfaceLocale = resolvePreferredLanguage(profile?.birth_profile?.interface_language ?? profile?.user?.lang);
  const focusTheme = useMemo(() => getFocusTheme(energyBalance), [energyBalance]);
  const formattedEnergy = new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.round(energyBalance)));

  const premiumLabel = hasSubscription ? "Premium" : "Base";
  const premiumTitle = hasSubscription ? "Премиум уже активен" : "Личный разбор недели";
  const premiumBody = hasSubscription
    ? "Ваш персональный режим включён. Забирайте расширенный гороскоп и глубокие сценарии без лишних ограничений."
    : "Углублённый прогноз на ближайшие дни с акцентом на решения, отношения и энергетику недели.";
  const premiumCta = hasSubscription ? "Открыть прогноз" : "Открыть персональный прогноз";
  const dailyCardCardReady = Boolean(dailyCard?.card_code) && dailyCard?.status === "ready";
  const dailyCardInterpretationLocked = Boolean(dailyCard?.interpretation_locked ?? dailyCard?.is_shared);
  const storedDailyCardReadingId =
    storedDailyCardUnlock && dailyCard?.local_date && storedDailyCardUnlock.localDate === dailyCard.local_date
      ? storedDailyCardUnlock.readingId
      : null;
  const resolvedDailyCardReadingId = dailyCard?.reading_id ?? storedDailyCardReadingId ?? null;
  const dailyCardHasInterpretation = Boolean(resolvedDailyCardReadingId);
  const dailyCardInterpretationPending = Boolean(
    !storedDailyCardReadingId &&
      dailyCardHasInterpretation &&
      dailyCard?.status &&
      DAILY_CARD_PENDING_STATUSES.has(dailyCard.status)
  );
  const dailyCardCanViewInterpretation = Boolean(
    resolvedDailyCardReadingId && (storedDailyCardReadingId || dailyCard?.status === "ready")
  );
  const dailyCardPending = dailyCardLoading || dailyCardUnlocking;
  const dailyCardDateLabel = formatDailyCardDate(dailyCard?.local_date);
  const dailyCardUnlockCost = dailyCard?.unlock_energy_cost ?? 2;
  const dailyCardHeadline = dailyCardCardReady
    ? null
    : dailyCardLoading
      ? "Открываем карту дня"
      : "Карта дня временно недоступна";
  const dailyCardAssetName = dailyCard?.card_name ?? null;
  const dailyCardPrimaryCta = dailyCardCanViewInterpretation
    ? "Посмотреть толкование"
    : dailyCardInterpretationPending
      ? "Толкование готовится"
      : `Личная трактовка за ${dailyCardUnlockCost} ⚡`;
  const dailyCardSecondaryCta = dailyCardCanViewInterpretation ? "Сохранить в дневник" : null;
  const dailyCardTitle = dailyCardCardReady
    ? dailyCard?.card_name ?? "Карта дня"
    : dailyCardLoading
      ? "Открываем карту дня"
      : dailyCardError || dailyCard?.error
        ? "Карта дня временно недоступна"
        : "Карта дня";
  const dailyCardBody = dailyCardCardReady
    ? dailyCardCanViewInterpretation
      ? "Личная трактовка уже открыта для вашего текущего дня. Можно вернуться к толкованию в любое время до конца суток."
      : dailyCardInterpretationPending
        ? "Личная трактовка уже создаётся для вашего текущего дня. Вернитесь через несколько секунд, и она откроется без повторной оплаты."
        : `Карта дня уже выбрана для вашего ритма и текущего дня. Личную трактовку и совет именно для вас можно открыть за ${dailyCardUnlockCost} ⚡.`
    : dailyCardLoading
      ? "Подбираем карту дня под ваш текущий день."
      : "Не удалось получить ежедневную карту. Попробуйте обновить блок ещё раз.";
  const dailyCardOrientationLabel = dailyCard?.reversed ? "Перевернутое положение" : "Прямое положение";

  useEffect(() => {
    if (!dailyCard?.local_date || !dailyCard?.reading_id) {
      return;
    }
    writeStoredDailyCardUnlock(dailyCard.local_date, dailyCard.reading_id);
    setStoredDailyCardUnlock({
      localDate: dailyCard.local_date,
      readingId: dailyCard.reading_id
    });
  }, [dailyCard?.local_date, dailyCard?.reading_id]);

  useEffect(() => {
    if (!dailyCard?.local_date || !storedDailyCardUnlock) {
      return;
    }
    if (storedDailyCardUnlock.localDate !== dailyCard.local_date) {
      clearStoredDailyCardUnlock();
      setStoredDailyCardUnlock(null);
    }
  }, [dailyCard?.local_date, storedDailyCardUnlock]);

  const handleOpenDailyCard = useCallback(async () => {
    if (!dailyCard?.card_code || !dailyCard?.local_date) {
      void refreshDailyCard();
      return;
    }

    if (dailyCardCanViewInterpretation && resolvedDailyCardReadingId) {
      navigate(`/reading/${resolvedDailyCardReadingId}`);
      return;
    }

    setDailyCardUnlocking(true);
    setDailyCardActionError(null);

    try {
      const reading = await createReading({
        type: "tarot",
        spread_id: "one_card",
        spread_title: "Одна карта",
        deck_id: dailyCard.deck_id,
        deck_title: dailyCard.deck_title ?? "Классическая — Уэйта-Смита",
        question:
          `Персональная трактовка моей карты дня на ${dailyCard.local_date}. ` +
          `Карта: ${dailyCard.card_name ?? "Карта дня"}. ` +
          "Как эта карта проявляется именно для меня сегодня, на что обратить внимание и как лучше прожить день?",
        locale: interfaceLocale,
        energy_cost: dailyCardUnlockCost,
        kind: "daily_card_unlock",
        source: "home_daily_card",
        daily_card_date: dailyCard.local_date,
        cards: [
          {
            position_index: 1,
            card_code: dailyCard.card_code,
            reversed: Boolean(dailyCard.reversed),
            position_label: "Карта дня",
            card_name: dailyCard.card_name ?? "Карта дня"
          }
        ]
      });

      let attempts = 0;
      while (attempts < 40) {
        attempts += 1;
        const current = await getReading(reading.id);
        if (current.status === "ready" && current.output_payload) {
          const viewed = await viewReading(reading.id);
          writeStoredDailyCardUnlock(dailyCard.local_date, reading.id);
          setStoredDailyCardUnlock({
            localDate: dailyCard.local_date,
            readingId: reading.id
          });
          await refreshDailyCard({ silent: true });
          navigate(`/reading/${reading.id}`, { state: { reading: viewed } });
          return;
        }
        if (current.status === "error") {
          throw new Error(current.error || "Не удалось подготовить трактовку карты дня.");
        }
        await wait(2000);
      }

      throw new Error("Трактовка готовится дольше обычного. Попробуйте открыть её ещё раз через несколько секунд.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        setDailyCardActionError(`Для личной трактовки нужно ${dailyCardUnlockCost} ⚡. Откройте раздел энергии и пополните баланс.`);
        navigate("/energy");
        return;
      }
      setDailyCardActionError(error instanceof Error ? error.message : "Не удалось открыть трактовку карты дня.");
    } finally {
      setDailyCardUnlocking(false);
    }
  }, [
    dailyCard,
    dailyCardCanViewInterpretation,
    dailyCardUnlockCost,
    interfaceLocale,
    navigate,
    refreshDailyCard,
    resolvedDailyCardReadingId
  ]);

  const metrics = [
    { label: "Энергия", value: formattedEnergy },
    { label: "Режим", value: premiumLabel },
    { label: "Фокус", value: focusTheme.focus }
  ];

  const serviceItems: ServiceItem[] = [
    {
      id: "spreads",
      title: "Расклады",
      description: "Ответ на важный вопрос",
      icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.55} />,
      accentClassName:
        "text-[var(--accent-gold)] bg-[linear-gradient(180deg,rgba(215,185,139,0.22),rgba(215,185,139,0.08))] border-[rgba(215,185,139,0.22)]",
      available: true,
      onClick: () => navigate("/spreads")
    },
    {
      id: "horoscope",
      title: "Гороскоп",
      description: "Астропрогноз на сегодня",
      icon: <Sun className="h-5 w-5" strokeWidth={1.55} />,
      accentClassName:
        "text-[var(--accent-rose)] bg-[linear-gradient(180deg,rgba(231,201,232,0.2),rgba(231,201,232,0.08))] border-[rgba(231,201,232,0.2)]",
      available: true,
      onClick: () => navigate("/horoscope")
    },
    {
      id: "compatibility",
      title: "Совместимость",
      description: "Анализ связи и динамики",
      icon: <HeartHandshake className="h-5 w-5" strokeWidth={1.55} />,
      accentClassName:
        "text-[var(--accent-gold)] bg-[linear-gradient(180deg,rgba(215,185,139,0.18),rgba(255,255,255,0.06))] border-[rgba(255,255,255,0.12)]",
      available: false
    },
    {
      id: "matrix",
      title: "Матрица судьбы",
      description: "Личный код и вектор пути",
      icon: <Orbit className="h-5 w-5" strokeWidth={1.55} />,
      accentClassName:
        "text-[var(--accent-lavender)] bg-[linear-gradient(180deg,rgba(184,163,210,0.2),rgba(184,163,210,0.08))] border-[rgba(184,163,210,0.2)]",
      available: false
    },
    {
      id: "numerology",
      title: "Нумерология",
      description: "Ваш ритм и число дня",
      icon: <Calculator className="h-5 w-5" strokeWidth={1.55} />,
      accentClassName:
        "text-[var(--accent-rose)] bg-[linear-gradient(180deg,rgba(231,201,232,0.2),rgba(231,201,232,0.08))] border-[rgba(231,201,232,0.2)]",
      available: false
    },
    {
      id: "dreams",
      title: "Толкование снов",
      description: "Символы и смысл ночных образов",
      icon: <MoonStar className="h-5 w-5" strokeWidth={1.55} />,
      accentClassName:
        "text-[var(--accent-gold)] bg-[linear-gradient(180deg,rgba(215,185,139,0.2),rgba(215,185,139,0.07))] border-[rgba(215,185,139,0.18)]",
      available: false
    }
  ];

  return (
    <div className="space-y-5 pb-6">
      <section className="flex items-center justify-between px-1">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--text-tertiary)]">TarotologAI</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Личное пространство инсайтов</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] shadow-[var(--surface-shadow-soft)] backdrop-blur-xl">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-gold)]" strokeWidth={1.6} />
          Ранний доступ
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[32px] border border-[rgba(215,185,139,0.18)] bg-[linear-gradient(180deg,rgba(42,34,49,0.96),rgba(24,19,29,0.94))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.34),0_0_40px_rgba(183,138,87,0.1)]">
        <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-[rgba(215,185,139,0.16)] blur-3xl" />
        <div className="pointer-events-none absolute left-[-12px] top-14 h-24 w-24 rounded-full bg-[rgba(110,77,120,0.22)] blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Ваше поле сегодня</span>
              <span className="inline-flex items-center rounded-full border border-[rgba(215,185,139,0.26)] bg-[rgba(215,185,139,0.12)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-gold)]">
                {premiumLabel}
              </span>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <p className="font-['Cormorant_Garamond'] text-[2.15rem] font-semibold leading-none text-[var(--text-primary)]">
                  {displayName}
                </p>
                <p className="max-w-[220px] text-[0.98rem] leading-6 text-[var(--text-secondary)]">{focusTheme.status}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)]">
                  Энергия {formattedEnergy}
                </span>
                <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                  Знак {zodiacLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_50%_30%,rgba(231,201,232,0.14),transparent_70%)]" />
            <span className="relative font-['Cormorant_Garamond'] text-4xl font-semibold text-[var(--accent-rose)]">
              {displayName.slice(0, 1)}
            </span>
          </div>
        </div>

      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(34,27,41,0.94),rgba(19,14,24,0.94))] p-5 shadow-[var(--surface-shadow)]">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(110,77,120,0.18)] blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Карта дня</p>
              <span className="inline-flex items-center rounded-full border border-[rgba(215,185,139,0.16)] bg-[rgba(215,185,139,0.08)] px-3 py-1 text-[11px] font-medium text-[var(--accent-gold)]">
                {dailyCardDateLabel}
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="font-['Cormorant_Garamond'] text-[1.9rem] font-medium leading-none text-[var(--text-primary)]">
                {dailyCardTitle}
              </h2>
              {dailyCardHeadline ? (
                <p className="max-w-[320px] text-base leading-6 text-[var(--text-primary)]">{dailyCardHeadline}</p>
              ) : null}
            </div>

            <p className="max-w-[340px] text-[0.95rem] leading-6 text-[var(--text-secondary)]">{dailyCardBody}</p>
          </div>

          <div className="flex items-stretch gap-3 sm:min-w-[198px] sm:justify-end">
            <div className="flex min-h-[156px] flex-1 flex-col justify-between rounded-[24px] border border-[rgba(215,185,139,0.2)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-3 shadow-[0_14px_28px_rgba(0,0,0,0.24)] sm:max-w-[112px]">
              <div className="flex items-center justify-between text-[var(--accent-gold)]">
                <Star className="h-4 w-4" strokeWidth={1.6} />
                <MoonStar className="h-4 w-4 text-[var(--accent-rose)]" strokeWidth={1.6} />
              </div>
              <div className="flex flex-1 items-center justify-center">
                {dailyCardAssetName ? (
                  <CardFaceImage
                    deckId="rws"
                    cardName={dailyCardAssetName}
                    alt={dailyCardAssetName}
                    className={`h-[104px] w-[72px] rounded-[18px] object-cover shadow-[0_16px_30px_rgba(0,0,0,0.35)] ${
                      dailyCard?.reversed ? "rotate-180" : ""
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-[104px] w-[72px] items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[28px] text-[var(--accent-rose)]">
                    {dailyCardPending ? <Loader className="h-7 w-7 animate-spin" strokeWidth={1.8} /> : "✦"}
                  </div>
                )}
              </div>
              <p className="text-center text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {dailyCardCardReady ? dailyCardOrientationLabel : dailyCardPending ? "в процессе" : "ритуал дня"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            className="h-11 gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#E2C79D_0%,#CFA974_100%)] px-5 text-[var(--text-on-gold)] shadow-[0_6px_18px_rgba(183,138,87,0.22)]"
            onClick={handleOpenDailyCard}
          >
            {dailyCardPrimaryCta}
            {dailyCardPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.8} />
            ) : (
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            )}
          </Button>
          {dailyCardCardReady && !dailyCardInterpretationLocked && dailyCardSecondaryCta ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-rose)] transition-opacity hover:opacity-85"
              onClick={() => navigate("/diary")}
            >
              {dailyCardSecondaryCta}
              <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
            </button>
          ) : dailyCardPending ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
              <Loader className="h-3.5 w-3.5 animate-spin text-[var(--accent-gold)]" strokeWidth={1.8} />
              Готовим личную трактовку
            </span>
          ) : null}
        </div>
        {dailyCardActionError ? (
          <p className="relative mt-3 text-sm leading-6 text-[var(--accent-gold)]">{dailyCardActionError}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 shadow-[var(--surface-shadow-soft)] backdrop-blur-xl"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{metric.label}</p>
            <p className="mt-2 text-[1rem] font-semibold text-[var(--text-primary)]">{metric.value}</p>
          </div>
        ))}
      </section>

      {!subscriptionLoading && !hasSubscription ? (
        <DailyBonusCard hasSubscription={hasSubscription} onBonusClaimed={refresh} />
      ) : null}

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Выберите сценарий</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Главные сервисы</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {serviceItems.map((service) => (
            <button
              key={service.id}
              type="button"
              className={`group rounded-[26px] text-left transition-transform duration-200 ${
                service.available ? "hover:-translate-y-0.5" : "cursor-default"
              }`}
              onClick={service.available ? service.onClick : undefined}
              disabled={!service.available}
            >
              <div className="flex min-h-[164px] h-full flex-col justify-between rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(34,27,41,0.92),rgba(20,15,23,0.96))] p-4 shadow-[var(--surface-shadow)]">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-[16px] border ${service.accentClassName}`}
                  >
                    {service.icon}
                  </span>
                  {!service.available ? (
                    <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                      скоро
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-base font-semibold text-[var(--text-primary)]">{service.title}</h4>
                    {service.available ? (
                      <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--accent-gold)]" strokeWidth={1.8} />
                    ) : null}
                  </div>
                  <p className="text-sm leading-5 text-[var(--text-secondary)]">{service.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(215,185,139,0.18)] bg-[linear-gradient(180deg,rgba(48,39,56,0.96),rgba(35,27,42,0.96))] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.32),0_0_26px_rgba(183,138,87,0.1)]">
        <div className="pointer-events-none absolute -right-4 top-2 h-24 w-24 rounded-full bg-[rgba(215,185,139,0.14)] blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(215,185,139,0.22)] bg-[rgba(215,185,139,0.12)] text-[var(--accent-gold)]">
            <Crown className="h-5 w-5" strokeWidth={1.55} />
          </span>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[rgba(231,204,158,0.8)]">Персональное предложение</p>
            <h3 className="font-['Cormorant_Garamond'] text-[1.9rem] font-medium leading-none text-[var(--text-primary)]">
              {premiumTitle}
            </h3>
            <p className="text-[0.95rem] leading-6 text-[var(--text-secondary)]">{premiumBody}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <Button
            variant="primary"
            className="h-11 rounded-full border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#E2C79D_0%,#CFA974_100%)] px-5 text-[var(--text-on-gold)] shadow-[0_6px_18px_rgba(183,138,87,0.22)]"
            onClick={() => navigate("/horoscope")}
          >
            {premiumCta}
          </Button>
        </div>
      </section>

      <section className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(34,27,41,0.9),rgba(17,13,22,0.94))] p-5 shadow-[var(--surface-shadow)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--accent-rose)]">
            <NotebookPen className="h-5 w-5" strokeWidth={1.55} />
          </span>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--text-tertiary)]">Вопрос дня</p>
            <h3 className="text-[1.05rem] font-semibold leading-6 text-[var(--text-primary)]">
              Что сегодня дало вам больше энергии, чем вы ожидали?
            </h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Сохраните ощущение дня в дневнике, чтобы собирать личные паттерны и возвращаться к ним позже.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <Button
            variant="outline"
            className="h-11 rounded-full border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-5 text-[var(--text-primary)]"
            onClick={() => navigate("/diary")}
          >
            Записать в дневник
          </Button>
        </div>
      </section>

      <section className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4 shadow-[var(--surface-shadow-soft)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-gold)]">
            <MoonStar className="h-4 w-4" strokeWidth={1.55} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Ранний доступ к новой версии</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Некоторые сценарии ещё дорабатываются, но базовые расклады и персональные прогнозы уже можно использовать.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
