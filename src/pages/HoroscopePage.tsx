import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MoonStar,
  Sparkles,
  Timer,
  Wallet
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  ApiError,
  getFreeHoroscopeToday,
  getHoroscopeIssue,
  getHoroscopeIssues,
  getHoroscopeSubscriptionStatus,
  purchaseHoroscopeOneoff,
  purchaseHoroscopeSubscription,
  type HoroscopeFreeTodayContentSection,
  type HoroscopeFreeTodayResponse,
  type HoroscopeIssueResponse,
  type HoroscopeIssueStatus,
  type HoroscopeIssuesListResponse,
  type HoroscopeSubscriptionStatusResponse
} from "@/lib/api";

type OneoffProductCode =
  | "horoscope_oneoff_tomorrow"
  | "horoscope_oneoff_week"
  | "horoscope_oneoff_month"
  | "horoscope_oneoff_3months"
  | "horoscope_oneoff_6months"
  | "horoscope_oneoff_year";

type SubscriptionPlanCode = "horoscope_sub_daily_lite" | "horoscope_sub_daily_plus";
type NoticeTone = "success" | "warning" | "error";
type NoticeAction = "energy" | "profile" | "refresh" | null;

interface OneoffProduct {
  code: OneoffProductCode;
  title: string;
  subtitle: string;
  energyCost: number;
}

interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  title: string;
  subtitle: string;
  energyCostHint: string;
  badge?: string;
  highlights: string[];
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

interface FeedbackNotice {
  tone: NoticeTone;
  title: string;
  message: string;
  action: NoticeAction;
}

interface IssueModalState {
  open: boolean;
  loading: boolean;
  issue: HoroscopeIssueResponse | null;
  error: string | null;
}

const MOCK_FALLBACK = {
  zodiacSign: "Лев",
  genderLabel: "Мужчина",
  todayLabel: "Сегодня"
};

const ISSUE_PROCESSING_STATUSES = new Set<HoroscopeIssueStatus>(["queued", "pending", "processing"]);
const ISSUE_READY_STATUSES = new Set<HoroscopeIssueStatus>(["ready"]);

const ONEOFF_PRODUCTS: OneoffProduct[] = [
  {
    code: "horoscope_oneoff_tomorrow",
    title: "Завтра",
    subtitle: "Ключевые события ближайшего дня",
    energyCost: 10
  },
  {
    code: "horoscope_oneoff_week",
    title: "Неделя",
    subtitle: "Пошаговый вектор на 7 дней",
    energyCost: 25
  },
  {
    code: "horoscope_oneoff_month",
    title: "Месяц",
    subtitle: "Главные акценты и возможности",
    energyCost: 60
  },
  {
    code: "horoscope_oneoff_3months",
    title: "3 месяца",
    subtitle: "Прогноз на сезон",
    energyCost: 120
  },
  {
    code: "horoscope_oneoff_6months",
    title: "Полгода",
    subtitle: "Среднесрочный жизненный ритм",
    energyCost: 200
  },
  {
    code: "horoscope_oneoff_year",
    title: "Год",
    subtitle: "Долгосрочная карта возможностей",
    energyCost: 350
  }
];

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    code: "horoscope_sub_daily_lite",
    title: "Daily Lite",
    subtitle: "Один персональный выпуск утром",
    energyCostHint: "по тарифу ⚡",
    highlights: ["Утренний прогноз", "Тема дня и фокус", "Короткий практичный формат"]
  },
  {
    code: "horoscope_sub_daily_plus",
    title: "Daily Plus",
    subtitle: "Утро + вечер с расширенной аналитикой",
    energyCostHint: "по тарифу ⚡",
    badge: "Рекомендуем",
    highlights: ["Утренний и вечерний прогноз", "Глубже про отношения и деньги", "Расширенные подсказки по времени"]
  }
];

export default function HoroscopePage() {
  const navigate = useNavigate();
  const { profile, refresh } = useProfile();
  const oneoffRef = useRef<HTMLElement | null>(null);

  const birthProfile = profile?.birth_profile;
  const userLang = profile?.user?.lang ?? "ru";

  const [freeHoroscope, setFreeHoroscope] = useState<HoroscopeFreeTodayResponse | null>(null);
  const [freeLoading, setFreeLoading] = useState(true);
  const [freeError, setFreeError] = useState<string | null>(null);

  const [issues, setIssues] = useState<HoroscopeIssueResponse[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<HoroscopeSubscriptionStatusResponse | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [buyingOneoffCode, setBuyingOneoffCode] = useState<OneoffProductCode | null>(null);
  const [buyingPlanCode, setBuyingPlanCode] = useState<SubscriptionPlanCode | null>(null);
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  const [issueModal, setIssueModal] = useState<IssueModalState>({
    open: false,
    loading: false,
    issue: null,
    error: null
  });

  const loadFree = useCallback(async () => {
    setFreeLoading(true);
    setFreeError(null);
    try {
      const response = await getFreeHoroscopeToday();
      setFreeHoroscope(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFreeError("Заполните данные рождения в профиле, чтобы получить бесплатный прогноз.");
      } else if (error instanceof ApiError && error.status === 401) {
        setFreeError("Сессия невалидна. Откройте мини-приложение из Telegram-бота и попробуйте снова.");
      } else {
        setFreeError(normalizeErrorMessage(error, "Не удалось загрузить бесплатный гороскоп."));
      }
      setFreeHoroscope(null);
    } finally {
      setFreeLoading(false);
    }
  }, []);

  const loadIssues = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIssuesLoading(true);
    }
    setIssuesError(null);
    try {
      const response = await getHoroscopeIssues(40);
      const normalized = extractIssues(response);
      setIssues(normalized);
    } catch (error) {
      setIssuesError(normalizeErrorMessage(error, "Не удалось загрузить персональные прогнозы."));
      if (!options?.silent) {
        setIssues([]);
      }
    } finally {
      if (!options?.silent) {
        setIssuesLoading(false);
      }
    }
  }, []);

  const loadSubscription = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setSubscriptionLoading(true);
    }
    setSubscriptionError(null);
    try {
      const response = await getHoroscopeSubscriptionStatus();
      setSubscription(response);
    } catch (error) {
      setSubscriptionError(normalizeErrorMessage(error, "Не удалось загрузить статус подписки."));
      if (!options?.silent) {
        setSubscription(null);
      }
    } finally {
      if (!options?.silent) {
        setSubscriptionLoading(false);
      }
    }
  }, []);

  const refreshScreen = useCallback(
    async (silent = false) => {
      if (!silent) {
        setRefreshing(true);
      }
      await Promise.all([loadFree(), loadIssues({ silent }), loadSubscription({ silent })]);
      if (!silent) {
        setRefreshing(false);
      }
    },
    [loadFree, loadIssues, loadSubscription]
  );

  useEffect(() => {
    void refreshScreen();
  }, [refreshScreen]);

  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });
  }, [issues]);

  const issueByProductCode = useMemo(() => {
    const map = new Map<string, HoroscopeIssueResponse>();
    sortedIssues.forEach((issue) => {
      if (!map.has(issue.product_code)) {
        map.set(issue.product_code, issue);
      }
    });
    return map;
  }, [sortedIssues]);

  const hasPendingIssues = useMemo(
    () => sortedIssues.some((issue) => ISSUE_PROCESSING_STATUSES.has(normalizeIssueStatus(issue.status))),
    [sortedIssues]
  );

  useEffect(() => {
    if (!hasPendingIssues) return;
    const timer = window.setInterval(() => {
      void loadIssues({ silent: true });
      void loadSubscription({ silent: true });
    }, 10_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [hasPendingIssues, loadIssues, loadSubscription]);

  const freeContent = freeHoroscope?.content ?? null;
  const freeTextMd = freeContent?.text_md ?? "";
  const { sections: freeSections, bestTime, luckyColor } = useMemo(
    () => normalizeLocalizedContent(freeContent?.localized_json),
    [freeContent?.localized_json]
  );
  const showMarkdown = Boolean(freeTextMd) && !freeSections.length;

  const zodiacLabel = freeHoroscope?.meta?.zodiac_sign ?? birthProfile?.zodiac_sign ?? MOCK_FALLBACK.zodiacSign;
  const genderLabel = freeHoroscope?.meta?.gender_label ?? getGenderLabel(birthProfile?.gender) ?? MOCK_FALLBACK.genderLabel;
  const periodLabel = freeHoroscope?.meta?.period_label ?? MOCK_FALLBACK.todayLabel;

  const activePlanCode = normalizeSubscriptionPlanCode(subscription?.plan_code);
  const hasActiveSubscription = isSubscriptionActive(subscription);

  const showNotice = useCallback((nextNotice: FeedbackNotice) => {
    setNotice(nextNotice);
  }, []);

  const openIssue = useCallback(async (issueId: string) => {
    setIssueModal({ open: true, loading: true, issue: null, error: null });
    try {
      const issue = await getHoroscopeIssue(issueId);
      setIssueModal({ open: true, loading: false, issue, error: null });
    } catch (error) {
      setIssueModal({
        open: true,
        loading: false,
        issue: null,
        error: normalizeErrorMessage(error, "Не удалось открыть выпуск. Попробуйте позже.")
      });
    }
  }, []);

  const handlePersonalize = useCallback(() => {
    if (!isBirthProfileReadyForPaid(birthProfile)) {
      showNotice({
        tone: "warning",
        title: "Нужно заполнить профиль",
        message: "Для персонального прогноза заполните дату рождения, пол и место рождения.",
        action: "profile"
      });
      return;
    }

    oneoffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [birthProfile, showNotice]);

  const handleOneoffPurchase = useCallback(
    async (productCode: OneoffProductCode) => {
      if (buyingOneoffCode) return;
      if (!isBirthProfileReadyForPaid(birthProfile)) {
        showNotice({
          tone: "warning",
          title: "Данные рождения неполные",
          message: "Перед покупкой заполните профиль рождения в разделе «Профиль».",
          action: "profile"
        });
        return;
      }

      setBuyingOneoffCode(productCode);
      setNotice(null);
      try {
        const response = await purchaseHoroscopeOneoff({
          product_code: productCode,
          lang: userLang ?? "ru",
          source: "miniapp_horoscope"
        });

        const responseIssue = response.issue ?? null;
        if (responseIssue) {
          setIssues((prev) => upsertIssue(prev, responseIssue));
        }

        await Promise.all([refresh(), loadIssues({ silent: true })]);

        showNotice({
          tone: "success",
          title: "Прогноз оформлен",
          message:
            responseIssue && ISSUE_READY_STATUSES.has(normalizeIssueStatus(responseIssue.status))
              ? "Прогноз уже готов — можно открыть прямо сейчас."
              : "Запрос принят, персональный прогноз готовится."
          ,
          action: "refresh"
        });
      } catch (error) {
        handlePurchaseError(error, showNotice);
      } finally {
        setBuyingOneoffCode(null);
      }
    },
    [birthProfile, buyingOneoffCode, loadIssues, refresh, showNotice, userLang]
  );

  const handleOneoffAction = useCallback(
    async (product: OneoffProduct) => {
      const issue = issueByProductCode.get(product.code);
      if (issue && ISSUE_READY_STATUSES.has(normalizeIssueStatus(issue.status))) {
        await openIssue(issue.id);
        return;
      }
      if (issue && ISSUE_PROCESSING_STATUSES.has(normalizeIssueStatus(issue.status))) {
        showNotice({
          tone: "warning",
          title: "Прогноз в генерации",
          message: "Мы готовим персональный выпуск. Обновите страницу через несколько секунд.",
          action: "refresh"
        });
        return;
      }

      await handleOneoffPurchase(product.code);
    },
    [handleOneoffPurchase, issueByProductCode, openIssue, showNotice]
  );

  const handleSubscriptionAction = useCallback(
    async (planCode: SubscriptionPlanCode) => {
      const isCurrentActive = hasActiveSubscription && activePlanCode === planCode;
      if (isCurrentActive) {
        if (subscription?.last_issue_id) {
          await openIssue(subscription.last_issue_id);
        } else {
          showNotice({
            tone: "warning",
            title: "Выпуск ещё готовится",
            message: "Подписка активна. Как только выпуск сформируется, его можно будет открыть.",
            action: "refresh"
          });
          await loadIssues({ silent: true });
        }
        return;
      }

      if (!isBirthProfileReadyForPaid(birthProfile)) {
        showNotice({
          tone: "warning",
          title: "Нужно заполнить профиль",
          message: "Для подписки требуется заполненный профиль рождения.",
          action: "profile"
        });
        return;
      }

      setBuyingPlanCode(planCode);
      setNotice(null);
      try {
        await purchaseHoroscopeSubscription({
          plan_code: planCode,
          lang: userLang ?? "ru",
          source: "miniapp_horoscope"
        });

        await Promise.all([refresh(), loadSubscription({ silent: true }), loadIssues({ silent: true })]);
        showNotice({
          tone: "success",
          title: "Подписка активирована",
          message: planCode === "horoscope_sub_daily_plus" ? "Daily Plus подключён." : "Daily Lite подключён.",
          action: "refresh"
        });
      } catch (error) {
        handlePurchaseError(error, showNotice);
      } finally {
        setBuyingPlanCode(null);
      }
    },
    [
      activePlanCode,
      birthProfile,
      hasActiveSubscription,
      loadIssues,
      loadSubscription,
      openIssue,
      refresh,
      showNotice,
      subscription?.last_issue_id,
      userLang
    ]
  );

  const noticeAction = notice?.action ?? null;

  return (
    <div className="space-y-6 pb-28">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Энергия дня</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Гороскоп</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[110px]"
          onClick={() => {
            void refreshScreen();
          }}
          disabled={refreshing}
        >
          {refreshing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Обновление
            </span>
          ) : (
            "Обновить"
          )}
        </Button>
      </header>

      {notice ? (
        <Card
          className={`border p-4 ${
            notice.tone === "success"
              ? "border-emerald-300/35 bg-emerald-500/10"
              : notice.tone === "warning"
                ? "border-amber-300/35 bg-amber-500/10"
                : "border-red-300/35 bg-red-500/10"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{notice.title}</p>
              <p className="text-sm text-[var(--text-secondary)]">{notice.message}</p>
            </div>
            <button
              type="button"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setNotice(null)}
            >
              Закрыть
            </button>
          </div>
          {noticeAction ? (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => {
                if (noticeAction === "energy") {
                  navigate("/energy");
                } else if (noticeAction === "profile") {
                  navigate("/profile");
                } else {
                  void refreshScreen();
                }
              }}
            >
              {noticeAction === "energy"
                ? "Пополнить энергию"
                : noticeAction === "profile"
                  ? "Перейти в профиль"
                  : "Обновить данные"}
            </Button>
          ) : null}
        </Card>
      ) : null}

      <Card className="overflow-hidden border border-white/10 bg-[var(--bg-card)]/90 p-6 shadow-[0_35px_70px_rgba(0,0,0,0.55)]">
        <div className="relative mb-5 overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-[#282240]/75 via-[#1e2136]/65 to-[#111528]/70 p-4">
          <div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-[var(--accent-pink)]/10 blur-2xl" />
          <div className="relative space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Ритуал дня · Free</p>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">🌙 Гороскоп на сегодня</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {zodiacLabel} · {genderLabel} · {periodLabel}
            </p>
          </div>
        </div>

        {freeLoading ? (
          <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/5 p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
          </div>
        ) : freeError ? (
          <div className="space-y-3 rounded-[20px] border border-red-300/35 bg-red-500/10 p-4">
            <p className="text-sm text-red-100">{freeError}</p>
            <Button size="sm" variant="outline" onClick={() => void loadFree()}>
              Попробовать снова
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-5">
            {showMarkdown ? <HoroscopeMarkdown text={freeTextMd} /> : null}

            {freeSections.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {freeSections.map((section) => (
                  <div key={section.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <HoroscopeSection emoji={section.emoji} title={section.title} body={section.body} />
                  </div>
                ))}
              </div>
            ) : null}

            {(bestTime || luckyColor) ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-secondary)]">
                {bestTime ? <p>🎯 Лучшее время: {bestTime}</p> : null}
                {luckyColor ? <p>🎨 Цвет дня: {capitalize(luckyColor)}</p> : null}
              </div>
            ) : null}

            {!showMarkdown && !freeSections.length && !bestTime && !luckyColor ? (
              <p className="text-sm text-[var(--text-secondary)]">На сегодня пока нет данных. Попробуйте обновить экран.</p>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button className="w-full sm:w-auto sm:min-w-[220px]" variant="primary" onClick={handlePersonalize}>
            Персонализировать 🔥
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => {
              void loadFree();
            }}
            disabled={freeLoading}
          >
            {freeLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Загружаем...
              </span>
            ) : (
              "Обновить ритуал"
            )}
          </Button>
        </div>
      </Card>

      <section ref={oneoffRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Разовые прогнозы</h3>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">за энергию ⚡</p>
        </div>
        {issuesError ? (
          <div className="rounded-2xl border border-red-300/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">{issuesError}</div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {ONEOFF_PRODUCTS.map((product) => {
            const issue = issueByProductCode.get(product.code);
            const issueStatus = issue ? normalizeIssueStatus(issue.status) : null;
            const ready = issueStatus ? ISSUE_READY_STATUSES.has(issueStatus) : false;
            const processing = issueStatus ? ISSUE_PROCESSING_STATUSES.has(issueStatus) : false;
            const failed = issueStatus === "error";
            const isBusy = buyingOneoffCode === product.code;

            const statusLabel = ready
              ? "Готово"
              : processing
                ? "Генерируется"
                : failed
                  ? "Ошибка генерации"
                  : "Доступно";

            return (
              <Card key={product.code} className="border border-white/10 bg-[var(--bg-card)]/88 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[var(--text-primary)]">{product.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{product.subtitle}</p>
                  </div>
                  <p className="whitespace-nowrap text-base font-semibold text-[var(--accent-gold)]">{product.energyCost} ⚡</p>
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
                  {ready ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  ) : processing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-pink)]" />
                  ) : failed ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-200" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-pink)]" />
                  )}
                  <span>{statusLabel}</span>
                </div>

                {issue?.created_at ? (
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    Последний выпуск: {formatDateTime(issue.created_at)}
                  </p>
                ) : null}

                <Button
                  className="mt-4 w-full"
                  variant={ready ? "primary" : "default"}
                  onClick={() => {
                    void handleOneoffAction(product);
                  }}
                  disabled={Boolean(buyingOneoffCode) || issuesLoading}
                >
                  {isBusy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Подготовка...
                    </span>
                  ) : ready ? (
                    "Открыть"
                  ) : processing ? (
                    "Проверить статус"
                  ) : failed ? (
                    "Повторить"
                  ) : (
                    `Купить за ${product.energyCost} ⚡`
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Подписки</h3>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">daily plans</p>
        </div>

        {subscriptionError ? (
          <div className="rounded-2xl border border-red-300/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {subscriptionError}
          </div>
        ) : null}

        <div className="grid gap-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isActive = hasActiveSubscription && activePlanCode === plan.code;
            const isBusy = buyingPlanCode === plan.code;
            const showPlusGlow = plan.code === "horoscope_sub_daily_plus";

            return (
              <Card
                key={plan.code}
                className={`border p-5 ${
                  showPlusGlow
                    ? "border-[var(--accent-pink)]/30 bg-[var(--bg-card)]/90 shadow-[0_24px_54px_rgba(215,154,255,0.16)]"
                    : "border-white/10 bg-[var(--bg-card)]/88"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-semibold text-[var(--text-primary)]">{plan.title}</h4>
                      {plan.badge ? (
                        <span className="rounded-full border border-[var(--accent-pink)]/35 bg-[var(--accent-pink)]/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent-pink)]">
                          {plan.badge}
                        </span>
                      ) : null}
                      {isActive ? (
                        <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
                          Активно
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{plan.subtitle}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-[var(--accent-gold)]">{plan.energyCostHint}</p>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                  {plan.highlights.map((item) => (
                    <li key={`${plan.code}-${item}`} className="flex items-start gap-2">
                      <span className="pt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {isActive && subscription?.next_run_at ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
                    <Timer className="h-3.5 w-3.5" />
                    Следующий выпуск: {formatDateTime(subscription.next_run_at)}
                  </p>
                ) : null}

                <Button
                  className="mt-4 w-full"
                  variant={isActive ? "primary" : "default"}
                  onClick={() => {
                    void handleSubscriptionAction(plan.code);
                  }}
                  disabled={Boolean(buyingPlanCode) || subscriptionLoading}
                >
                  {isBusy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Подготовка...
                    </span>
                  ) : isActive ? (
                    "Открыть последний выпуск"
                  ) : (
                    "Подключить"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Последние выпуски</h3>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">история</p>
        </div>
        <Card className="space-y-3 border border-white/10 bg-[var(--bg-card)]/85 p-4">
          {issuesLoading ? (
            <>
              <div className="h-14 animate-pulse rounded-xl bg-white/10" />
              <div className="h-14 animate-pulse rounded-xl bg-white/10" />
            </>
          ) : sortedIssues.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-[var(--text-secondary)]">
              Здесь появятся ваши персональные выпуски после покупки.
            </div>
          ) : (
            sortedIssues.slice(0, 6).map((issue) => {
              const status = normalizeIssueStatus(issue.status);
              const ready = ISSUE_READY_STATUSES.has(status);
              const processing = ISSUE_PROCESSING_STATUSES.has(status);
              return (
                <div
                  key={issue.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{humanizeIssueTitle(issue.product_code)}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{formatIssuePeriod(issue.start_date, issue.end_date)}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{formatDateTime(issue.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                      {ready ? "ready" : processing ? "processing" : status}
                    </span>
                    <Button
                      size="sm"
                      variant={ready ? "primary" : "outline"}
                      disabled={!ready}
                      onClick={() => {
                        if (ready) {
                          void openIssue(issue.id);
                        }
                      }}
                    >
                      {ready ? "Открыть" : "Ожидание"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </section>

      <IssuePreviewModal
        state={issueModal}
        onClose={() => {
          setIssueModal({ open: false, loading: false, issue: null, error: null });
        }}
      />
    </div>
  );
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

function handlePurchaseError(error: unknown, showNotice: (notice: FeedbackNotice) => void): void {
  if (error instanceof ApiError) {
    const normalizedCode = (error.code || "").toLowerCase();
    const normalizedMessage = (error.message || "").toLowerCase();
    const insufficient =
      normalizedCode === "not_enough_energy" ||
      normalizedCode === "insufficient_balance" ||
      normalizedMessage.includes("not_enough_energy") ||
      normalizedMessage.includes("недостаточно энергии");

    if (insufficient) {
      showNotice({
        tone: "warning",
        title: "Недостаточно энергии",
        message: "Пополните баланс в разделе «Энергия», затем повторите покупку.",
        action: "energy"
      });
      return;
    }

    if (error.status === 409) {
      showNotice({
        tone: "warning",
        title: "Нужно заполнить профиль",
        message: "Для персонального прогноза заполните данные рождения в профиле.",
        action: "profile"
      });
      return;
    }

    showNotice({
      tone: "error",
      title: "Покупка не выполнена",
      message: error.message || "Не удалось выполнить покупку. Попробуйте ещё раз.",
      action: "refresh"
    });
    return;
  }

  showNotice({
    tone: "error",
    title: "Покупка не выполнена",
    message: normalizeErrorMessage(error, "Не удалось выполнить покупку. Попробуйте ещё раз."),
    action: "refresh"
  });
}

function extractIssues(data: HoroscopeIssueResponse[] | HoroscopeIssuesListResponse): HoroscopeIssueResponse[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.issues)) return data.issues;
  return [];
}

function upsertIssue(items: HoroscopeIssueResponse[], issue: HoroscopeIssueResponse): HoroscopeIssueResponse[] {
  const index = items.findIndex((item) => item.id === issue.id);
  if (index === -1) return [issue, ...items];
  const next = [...items];
  next[index] = issue;
  return next;
}

function normalizeIssueStatus(status: string | null | undefined): HoroscopeIssueStatus {
  const normalized = (status || "").toLowerCase().trim();
  if (normalized === "queued" || normalized === "pending" || normalized === "processing" || normalized === "ready") {
    return normalized;
  }
  return "error";
}

function normalizeSubscriptionPlanCode(planCode: string | null | undefined): SubscriptionPlanCode | null {
  if (planCode === "horoscope_sub_daily_lite" || planCode === "horoscope_sub_daily_plus") {
    return planCode;
  }
  return null;
}

function isSubscriptionActive(subscription: HoroscopeSubscriptionStatusResponse | null): boolean {
  if (!subscription) return false;
  if (subscription.active === true) return true;
  if (subscription.has_subscription === true) return true;
  return (subscription.status || "").toLowerCase() === "active";
}

function isBirthProfileReadyForPaid(birthProfile: unknown): boolean {
  if (!birthProfile || typeof birthProfile !== "object") return false;
  const profile = birthProfile as Record<string, unknown>;
  const birthDate = typeof profile.birth_date === "string" ? profile.birth_date.trim() : "";
  const gender = typeof profile.gender === "string" ? profile.gender.trim() : "";
  const birthPlace = typeof profile.birth_place_text === "string" ? profile.birth_place_text.trim() : "";
  return Boolean(birthDate && gender && birthPlace);
}

function getGenderLabel(value?: string | null): string | null {
  if (value === "male") return "Мужчина";
  if (value === "female") return "Женщина";
  if (value === "other") return "Другое";
  return null;
}

function humanizeIssueTitle(productCode: string): string {
  const map: Record<string, string> = {
    horoscope_oneoff_tomorrow: "Разовый прогноз · Завтра",
    horoscope_oneoff_week: "Разовый прогноз · Неделя",
    horoscope_oneoff_month: "Разовый прогноз · Месяц",
    horoscope_oneoff_3months: "Разовый прогноз · 3 месяца",
    horoscope_oneoff_6months: "Разовый прогноз · 6 месяцев",
    horoscope_oneoff_year: "Разовый прогноз · Год",
    horoscope_sub_daily_lite: "Подписка · Daily Lite",
    horoscope_sub_daily_plus: "Подписка · Daily Plus"
  };
  return map[productCode] ?? "Персональный выпуск";
}

function formatIssuePeriod(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return "Период уточняется";
  if (startDate && endDate && startDate === endDate) {
    return formatDate(startDate);
  }
  if (startDate && endDate) {
    return `${formatDate(startDate)} — ${formatDate(endDate)}`;
  }
  return formatDate(startDate ?? endDate ?? "");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function normalizeLocalizedContent(raw: unknown): NormalizedLocalizedContent {
  const sections: StructuredSection[] = [];
  const dedupe = new Set<string>();
  let bestTime: string | null = null;
  let luckyColor: string | null = null;

  const pushSection = (section: StructuredSection) => {
    const key = `${normalizeSectionTitle(section.title)}|${normalizeSectionTitle(section.body)}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    sections.push(section);
  };

  if (!raw) {
    return { sections, bestTime, luckyColor };
  }

  const record = isRecord(raw) ? raw : null;
  if (!record) {
    return { sections, bestTime, luckyColor };
  }

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
    const body = readFocusAdvice(record[key]);
    if (body) {
      pushSection({ key, emoji, title, body });
    }
  });

  const lucky = readLucky(record.lucky);
  if (lucky) {
    const luckyParts: string[] = [];
    if (lucky.color) {
      luckyColor = lucky.color;
      luckyParts.push(`Цвет: ${capitalize(lucky.color)}`);
    }
    if (lucky.number) {
      luckyParts.push(`Число: ${lucky.number}`);
    }
    if (lucky.timeWindow) {
      bestTime = lucky.timeWindow;
      luckyParts.push(`Время: ${lucky.timeWindow}`);
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

  readLegacySections(record.sections).forEach((legacySection) => {
    pushSection(legacySection);
  });

  return { sections, bestTime, luckyColor };
}

function readLegacySections(value: unknown): StructuredSection[] {
  if (!Array.isArray(value)) return [];
  const result: StructuredSection[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const section = item as HoroscopeFreeTodayContentSection;
    const title = readString(section.title) ?? `Секция ${index + 1}`;
    const body = readString(section.text) ?? readString(section.title);
    if (!body) return;
    result.push({
      key: `legacy-${section.key ?? index}`,
      emoji: section.emoji ?? "✨",
      title,
      body
    });
  });
  return result;
}

function readFocusAdvice(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const focus = readString(value.focus);
  const advice = readString(value.advice);
  if (!focus && !advice) return null;
  if (focus && advice) return `${focus} Совет: ${advice}`;
  return focus ?? `Совет: ${advice}`;
}

function readLucky(value: unknown): { color?: string | null; number?: string | null; timeWindow?: string | null } | null {
  if (!isRecord(value)) return null;
  const color = readString(value.color);
  const numberRaw = value.number;
  const number = typeof numberRaw === "number" ? String(numberRaw) : readString(numberRaw);
  const timeWindow = readString(value.time_window ?? value.timeWindow ?? value.time);
  if (!color && !number && !timeWindow) return null;
  return { color, number, timeWindow };
}

function normalizeSectionTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
        <p key={`md-${index}`} className="leading-relaxed">
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

function IssuePreviewModal({ state, onClose }: { state: IssueModalState; onClose: () => void }) {
  if (!state.open) return null;
  const issue = state.issue;
  const issueSections = normalizeIssueSections(issue?.content_json);
  const showMarkdown = !issueSections.length && Boolean(issue?.content_md);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-12 backdrop-blur-md">
      <div className="w-full max-w-[520px] space-y-4 rounded-[30px] border border-white/15 bg-[var(--bg-card)]/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Персональный выпуск</p>
            <h4 className="text-xl font-semibold text-[var(--text-primary)]">
              {issue ? humanizeIssueTitle(issue.product_code) : "Загрузка"}
            </h4>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        {state.loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-[var(--text-secondary)]">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--accent-pink)]" />
            Загружаем выпуск...
          </div>
        ) : state.error ? (
          <div className="rounded-2xl border border-red-300/35 bg-red-500/10 p-4 text-sm text-red-100">{state.error}</div>
        ) : issue ? (
          <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
              <p>Статус: {normalizeIssueStatus(issue.status)}</p>
              <p>Период: {formatIssuePeriod(issue.start_date, issue.end_date)}</p>
            </div>

            {issue.summary_text ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-[var(--text-secondary)]">
                {issue.summary_text}
              </div>
            ) : null}

            {issueSections.length ? (
              <div className="space-y-3">
                {issueSections.map((section) => (
                  <div key={section.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <HoroscopeSection emoji={section.emoji} title={section.title} body={section.body} />
                  </div>
                ))}
              </div>
            ) : null}

            {showMarkdown && issue.content_md ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <HoroscopeMarkdown text={issue.content_md} />
              </div>
            ) : null}
          </div>
        ) : null}

        <Button className="w-full" variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}

function normalizeIssueSections(contentJson: HoroscopeIssueResponse["content_json"]): StructuredSection[] {
  if (!contentJson || !isRecord(contentJson)) return [];
  const sections: StructuredSection[] = [];
  const add = (key: string, title: string, emoji: string, body: string | null) => {
    if (!body) return;
    sections.push({ key, title, emoji, body });
  };

  add("main_energy", "Главная энергия", "🌌", readString(contentJson.main_energy));
  add("focus", "Фокус", "🎯", readString(contentJson.focus));
  add("love", "Любовь", "❤️", readFocusAdvice(contentJson.love));
  add("career", "Карьера", "💼", readFocusAdvice(contentJson.career));
  add("money", "Деньги", "💰", readFocusAdvice(contentJson.money));
  add("health", "Здоровье", "🧘", readFocusAdvice(contentJson.health));
  add("advice", "Совет", "🪄", readString(contentJson.advice));
  add("summary", "Итог", "✨", readString(contentJson.summary));

  return sections;
}
