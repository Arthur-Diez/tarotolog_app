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
  processHoroscopeIssue,
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
  | "horoscope_oneoff_personal_today"
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

interface IssueStructuredSection {
  key: string;
  emoji: string;
  title: string;
  body: string;
  advice?: string | null;
}

interface PremiumIssueArea {
  key: string;
  icon: string;
  title: string;
  state: string;
  meaning: string;
  action: string;
}

interface PremiumIssueContent {
  version: string;
  dateLabel: string;
  periodLabel: string;
  persona: {
    zodiacSign: string | null;
    gender: string | null;
    archetype: string | null;
    personalContext: string | null;
  };
  hero: {
    eyebrow: string | null;
    title: string | null;
    subtitle: string | null;
    verdict: string | null;
  };
  dayStory: {
    title: string | null;
    text: string | null;
    innerTask: string | null;
  };
  timing: {
    bestWindow: { label: string | null; timeRange: string | null; text: string | null };
    cautionWindow: { label: string | null; timeRange: string | null; text: string | null };
  };
  areas: PremiumIssueArea[];
  opportunity: { title: string | null; text: string | null };
  risk: { title: string | null; text: string | null };
  finalAdvice: { title: string | null; text: string | null };
  ritual: { title: string | null; text: string | null };
  eveningReflection: { title: string | null; text: string | null };
  uiHints: {
    moodTags: string[];
    highlightArea: string | null;
    intensity: string | null;
  };
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

type PersonalizeModalMode = "offer" | "profile_required";

interface PersonalizeModalState {
  open: boolean;
  mode: PersonalizeModalMode;
  purchasing: boolean;
}

interface GenerationOverlayState {
  open: boolean;
  issueId: string | null;
  title: string;
}

const MOCK_FALLBACK = {
  zodiacSign: "Лев",
  genderLabel: "Мужчина",
  todayLabel: "Сегодня"
};

const ISSUE_PROCESSING_STATUSES = new Set<HoroscopeIssueStatus>(["queued", "pending", "processing"]);
const ISSUE_READY_STATUSES = new Set<HoroscopeIssueStatus>(["ready"]);
const PERSONAL_TODAY_PRODUCT_CODE: OneoffProductCode = "horoscope_oneoff_personal_today";
const PERSONAL_TODAY_DEFAULT_COST = 10;
const GENERATION_STEPS = [
  "🔮 Анализируем ваши данные рождения...",
  "✨ Определяем ключевую энергию дня...",
  "🧠 Сопоставляем главные сферы вашей жизни...",
  "⚡ Ищем лучшие возможности именно для вас...",
  "🌙 Формируем персональный прогноз..."
];

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

function resolvePreferredLanguage(raw: unknown): "ru" | "en" {
  if (typeof raw !== "string") return "ru";
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "ru";
  if (normalized.startsWith("en") || normalized.includes("english")) return "en";
  return "ru";
}

function getZodiacDisplayLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  const map: Record<string, string> = {
    aries: "Овен",
    taurus: "Телец",
    gemini: "Близнецы",
    cancer: "Рак",
    leo: "Лев",
    virgo: "Дева",
    libra: "Весы",
    scorpio: "Скорпион",
    sagittarius: "Стрелец",
    capricorn: "Козерог",
    aquarius: "Водолей",
    pisces: "Рыбы"
  };
  return map[normalized] ?? raw;
}

export default function HoroscopePage() {
  const navigate = useNavigate();
  const { profile, refresh } = useProfile();

  const birthProfile = profile?.birth_profile;
  const userLang = useMemo(
    () => resolvePreferredLanguage(birthProfile?.interface_language ?? profile?.user?.lang),
    [birthProfile?.interface_language, profile?.user?.lang]
  );

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
  const [personalizeModal, setPersonalizeModal] = useState<PersonalizeModalState>({
    open: false,
    mode: "offer",
    purchasing: false
  });
  const [generationOverlay, setGenerationOverlay] = useState<GenerationOverlayState>({
    open: false,
    issueId: null,
    title: ""
  });
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const oneoffCarouselRef = useRef<HTMLDivElement | null>(null);
  const [activeOneoffIndex, setActiveOneoffIndex] = useState(0);
  const issueProcessKickRef = useRef<string | null>(null);

  const loadFree = useCallback(async () => {
    setFreeLoading(true);
    setFreeError(null);
    try {
      const response = await getFreeHoroscopeToday({ lang: userLang ?? "ru" });
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
  }, [userLang]);

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

  const localDateKey = freeHoroscope?.meta?.local_date ?? new Date().toISOString().slice(0, 10);
  const personalTodayIssue = useMemo(
    () =>
      sortedIssues.find((issue) =>
        isIssueForProductAndDate(issue, {
          productCode: PERSONAL_TODAY_PRODUCT_CODE,
          localDate: localDateKey
        })
      ) ?? null,
    [localDateKey, sortedIssues]
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

  const zodiacLabel = getZodiacDisplayLabel(freeHoroscope?.meta?.zodiac_sign) ?? birthProfile?.zodiac_sign ?? MOCK_FALLBACK.zodiacSign;
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

  const closeGenerationOverlay = useCallback(() => {
    setGenerationOverlay({ open: false, issueId: null, title: "" });
    setGenerationStepIndex(0);
    issueProcessKickRef.current = null;
  }, []);

  const openGenerationOverlay = useCallback((issue: HoroscopeIssueResponse, fallbackTitle: string) => {
    setGenerationOverlay({
      open: true,
      issueId: issue.id,
      title: humanizeIssueTitle(issue.product_code || fallbackTitle)
    });
    setGenerationStepIndex(0);
  }, []);

  const handleOneoffCarouselScroll = useCallback(() => {
    const container = oneoffCarouselRef.current;
    if (!container) return;
    const firstCard = container.querySelector<HTMLElement>("[data-oneoff-card='true']");
    if (!firstCard) return;
    const style = window.getComputedStyle(container);
    const gap = Number.parseFloat(style.columnGap || style.gap || "0") || 0;
    const span = firstCard.offsetWidth + gap;
    if (span <= 0) return;
    const nextIndex = Math.round(container.scrollLeft / span);
    setActiveOneoffIndex(Math.max(0, Math.min(ONEOFF_PRODUCTS.length - 1, nextIndex)));
  }, []);

  const scrollToOneoffIndex = useCallback((index: number) => {
    const container = oneoffCarouselRef.current;
    if (!container) return;
    const firstCard = container.querySelector<HTMLElement>("[data-oneoff-card='true']");
    if (!firstCard) return;
    const style = window.getComputedStyle(container);
    const gap = Number.parseFloat(style.columnGap || style.gap || "0") || 0;
    const span = firstCard.offsetWidth + gap;
    container.scrollTo({
      left: Math.max(0, index * span),
      behavior: "smooth"
    });
  }, []);

  useEffect(() => {
    if (!generationOverlay.open) return;
    const rotation = window.setInterval(() => {
      setGenerationStepIndex((prev) => (prev + 1) % GENERATION_STEPS.length);
    }, 1500);
    return () => {
      window.clearInterval(rotation);
    };
  }, [generationOverlay.open]);

  useEffect(() => {
    if (!generationOverlay.open || !generationOverlay.issueId) return;

    let cancelled = false;
    let inFlight = false;

    if (issueProcessKickRef.current !== generationOverlay.issueId) {
      issueProcessKickRef.current = generationOverlay.issueId;
      void processHoroscopeIssue(generationOverlay.issueId).catch(() => {
        // Polling will continue; skip surfacing transient trigger failures to user.
      });
    }

    const pollIssue = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const issue = await getHoroscopeIssue(generationOverlay.issueId as string);
        if (cancelled) return;
        setIssues((prev) => upsertIssue(prev, issue));
        const status = normalizeIssueStatus(issue.status);
        if (ISSUE_READY_STATUSES.has(status)) {
          closeGenerationOverlay();
          showNotice({
            tone: "success",
            title: "Прогноз готов",
            message: "Открываем ваш персональный выпуск.",
            action: null
          });
          await openIssue(issue.id);
          return;
        }
        if (status === "error") {
          closeGenerationOverlay();
          showNotice({
            tone: "error",
            title: "Не удалось собрать прогноз",
            message: "Сервис временно недоступен. Попробуйте ещё раз через минуту.",
            action: "refresh"
          });
        }
      } catch {
        if (cancelled) return;
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(() => {
      void pollIssue();
    }, 2200);
    void pollIssue();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [closeGenerationOverlay, generationOverlay.issueId, generationOverlay.open, openIssue, showNotice]);

  const handlePersonalize = useCallback(() => {
    setNotice(null);
    if (!isBirthProfileReadyForPaid(birthProfile)) {
      setPersonalizeModal({
        open: true,
        mode: "profile_required",
        purchasing: false
      });
      return;
    }

    if (personalTodayIssue && ISSUE_READY_STATUSES.has(normalizeIssueStatus(personalTodayIssue.status))) {
      void openIssue(personalTodayIssue.id);
      return;
    }

    if (personalTodayIssue && ISSUE_PROCESSING_STATUSES.has(normalizeIssueStatus(personalTodayIssue.status))) {
      openGenerationOverlay(personalTodayIssue, "Персональный прогноз · Сегодня");
      return;
    }

    setPersonalizeModal({
      open: true,
      mode: "offer",
      purchasing: false
    });
  }, [birthProfile, openGenerationOverlay, openIssue, personalTodayIssue]);

  const handlePersonalizePurchase = useCallback(async () => {
    if (personalizeModal.purchasing) return;
    if (!isBirthProfileReadyForPaid(birthProfile)) {
      setPersonalizeModal({ open: true, mode: "profile_required", purchasing: false });
      return;
    }

    setPersonalizeModal((prev) => ({ ...prev, purchasing: true }));
    setGenerationOverlay({
      open: true,
      issueId: null,
      title: "Персональный прогноз · Сегодня"
    });
    setGenerationStepIndex(0);
    try {
      const response = await purchaseHoroscopeOneoff({
        product_code: PERSONAL_TODAY_PRODUCT_CODE,
        lang: userLang ?? "ru",
        source: "miniapp_horoscope_personalize"
      });
      const purchasedIssue = response.issue ?? null;
      if (purchasedIssue) {
        setIssues((prev) => upsertIssue(prev, purchasedIssue));
      }
      await Promise.all([refresh(), loadIssues({ silent: true })]);

      const issue = purchasedIssue;
      const issueStatus = normalizeIssueStatus(issue?.status);

      if (issue && ISSUE_READY_STATUSES.has(issueStatus)) {
        setPersonalizeModal({ open: false, mode: "offer", purchasing: false });
        closeGenerationOverlay();
        showNotice({
          tone: "success",
          title: "Персональный прогноз готов",
          message: "Открываем ваш выпуск на сегодня.",
          action: null
        });
        await openIssue(issue.id);
        return;
      }

      setPersonalizeModal({ open: false, mode: "offer", purchasing: false });
      if (issue) {
        openGenerationOverlay(issue, "Персональный прогноз · Сегодня");
      } else {
        closeGenerationOverlay();
      }
    } catch (error) {
      setPersonalizeModal((prev) => ({ ...prev, purchasing: false }));
      closeGenerationOverlay();
      handlePurchaseError(error, showNotice);
    }
  }, [
    birthProfile,
    closeGenerationOverlay,
    loadIssues,
    openGenerationOverlay,
    openIssue,
    personalizeModal.purchasing,
    refresh,
    showNotice,
    userLang
  ]);

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
      setGenerationOverlay({
        open: true,
        issueId: null,
        title: humanizeIssueTitle(productCode)
      });
      setGenerationStepIndex(0);
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

        if (responseIssue && ISSUE_READY_STATUSES.has(normalizeIssueStatus(responseIssue.status))) {
          closeGenerationOverlay();
          showNotice({
            tone: "success",
            title: "Прогноз готов",
            message: "Открываем выпуск.",
            action: null
          });
          await openIssue(responseIssue.id);
        } else if (responseIssue) {
          openGenerationOverlay(responseIssue, productCode);
        } else {
          closeGenerationOverlay();
          showNotice({
            tone: "success",
            title: "Запрос принят",
            message: "Прогноз поставлен в очередь на генерацию.",
            action: "refresh"
          });
        }
      } catch (error) {
        closeGenerationOverlay();
        handlePurchaseError(error, showNotice);
      } finally {
        setBuyingOneoffCode(null);
      }
    },
    [
      birthProfile,
      buyingOneoffCode,
      closeGenerationOverlay,
      loadIssues,
      openGenerationOverlay,
      openIssue,
      refresh,
      showNotice,
      userLang
    ]
  );

  const handleOneoffAction = useCallback(
    async (product: OneoffProduct) => {
      const issue = issueByProductCode.get(product.code);
      if (issue && ISSUE_READY_STATUSES.has(normalizeIssueStatus(issue.status))) {
        await openIssue(issue.id);
        return;
      }
      if (issue && ISSUE_PROCESSING_STATUSES.has(normalizeIssueStatus(issue.status))) {
        openGenerationOverlay(issue, product.code);
        return;
      }

      await handleOneoffPurchase(product.code);
    },
    [handleOneoffPurchase, issueByProductCode, openGenerationOverlay, openIssue]
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
  const personalTodayIssueStatus = personalTodayIssue ? normalizeIssueStatus(personalTodayIssue.status) : null;
  const personalTodayReady = Boolean(personalTodayIssueStatus && ISSUE_READY_STATUSES.has(personalTodayIssueStatus));
  const personalTodayProcessing = Boolean(
    personalTodayIssueStatus && ISSUE_PROCESSING_STATUSES.has(personalTodayIssueStatus)
  );
  const personalizeButtonLabel = personalTodayReady
    ? "Открыть персональный прогноз"
    : personalTodayProcessing
      ? "Готовим прогноз..."
      : "Получить персональный прогноз 🔥";

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
                ? "Перейти к энергии"
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
          <Button
            className="w-full sm:w-auto sm:min-w-[220px]"
            variant="primary"
            onClick={handlePersonalize}
            disabled={personalizeModal.purchasing}
          >
            {personalizeButtonLabel}
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
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Этот ритуал общий. Персональный прогноз учитывает ваши данные рождения и даёт более точные рекомендации.
        </p>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Разовые прогнозы</h3>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">за энергию ⚡</p>
        </div>
        {issuesError ? (
          <div className="rounded-2xl border border-red-300/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">{issuesError}</div>
        ) : null}
        <div className="space-y-3">
          <div
            ref={oneoffCarouselRef}
            onScroll={handleOneoffCarouselScroll}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ONEOFF_PRODUCTS.map((product) => {
              const issue = issueByProductCode.get(product.code);
              const issueStatus = issue ? normalizeIssueStatus(issue.status) : null;
              const ready = issueStatus ? ISSUE_READY_STATUSES.has(issueStatus) : false;
              const processing = issueStatus ? ISSUE_PROCESSING_STATUSES.has(issueStatus) : false;
              const failed = issueStatus === "error";
              const isBusy = buyingOneoffCode === product.code;

              const statusLabel = ready
                ? "Выпуск готов"
                : processing
                  ? "Готовим прогноз"
                  : failed
                    ? "Нужно повторить"
                    : "Доступно сейчас";

              return (
                <Card
                  key={product.code}
                  data-oneoff-card="true"
                  className="min-w-[84%] snap-start border border-white/10 bg-[var(--bg-card)]/90 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)] sm:min-w-[400px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{product.title}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{product.subtitle}</p>
                    </div>
                    <p className="whitespace-nowrap text-lg font-semibold text-[var(--accent-gold)]">{product.energyCost} ⚡</p>
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
                    ) : product.code === "horoscope_oneoff_tomorrow" ? (
                      `Открыть прогноз за ${product.energyCost} ⚡`
                    ) : product.code === "horoscope_oneoff_week" ? (
                      `Получить прогноз на неделю за ${product.energyCost} ⚡`
                    ) : (
                      `Получить прогноз за ${product.energyCost} ⚡`
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {ONEOFF_PRODUCTS.map((product, index) => (
              <button
                key={`${product.code}-dot`}
                type="button"
                aria-label={`Перейти к карточке ${index + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeOneoffIndex ? "w-8 bg-[var(--accent-pink)]/85" : "w-2 bg-white/25"
                }`}
                onClick={() => scrollToOneoffIndex(index)}
              />
            ))}
          </div>
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
              Здесь будут храниться ваши персональные прогнозы, чтобы к ним можно было вернуться в любой момент.
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
      <PersonalizeOfferModal
        state={personalizeModal}
        energyCost={PERSONAL_TODAY_DEFAULT_COST}
        onClose={() => setPersonalizeModal((prev) => ({ ...prev, open: false, purchasing: false }))}
        onOpenProfile={() => {
          setPersonalizeModal({ open: false, mode: "offer", purchasing: false });
          navigate("/profile");
        }}
        onOpenEnergy={() => {
          setPersonalizeModal({ open: false, mode: "offer", purchasing: false });
          navigate("/energy");
        }}
        onConfirmPurchase={() => {
          void handlePersonalizePurchase();
        }}
      />
      <HoroscopeGenerationOverlay
        state={generationOverlay}
        stepText={GENERATION_STEPS[generationStepIndex] ?? GENERATION_STEPS[0]}
      />
    </div>
  );
}

function isIssueForProductAndDate(
  issue: HoroscopeIssueResponse,
  options: { productCode: string; localDate: string }
): boolean {
  if (issue.product_code !== options.productCode) return false;
  const issueStart = (issue.start_date || "").slice(0, 10);
  const issueEnd = (issue.end_date || "").slice(0, 10);
  return issueStart === options.localDate && issueEnd === options.localDate;
}

function PersonalizeOfferModal({
  state,
  energyCost,
  onClose,
  onConfirmPurchase,
  onOpenProfile,
  onOpenEnergy
}: {
  state: PersonalizeModalState;
  energyCost: number;
  onClose: () => void;
  onConfirmPurchase: () => void;
  onOpenProfile: () => void;
  onOpenEnergy: () => void;
}) {
  if (!state.open) return null;

  const isProfileMode = state.mode === "profile_required";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-10 backdrop-blur-md">
      <div className="w-full max-w-[520px] rounded-[28px] border border-white/15 bg-[var(--bg-card)]/95 p-6 shadow-[0_35px_75px_rgba(0,0,0,0.6)]">
        {isProfileMode ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Персонализация</p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Нужны данные рождения</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Для персонального прогноза нужны дата рождения, пол и место рождения.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="w-full" variant="primary" onClick={onOpenProfile}>
                Заполнить профиль
              </Button>
              <Button className="w-full" variant="outline" onClick={onClose}>
                Не сейчас
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Premium Upsell</p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Персональный гороскоп на сегодня</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Более глубокий прогноз на день с учётом ваших данных рождения.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>• Главный вектор дня и личный фокус</li>
                <li>• Любовь, карьера, деньги и состояние</li>
                <li>• Персональный совет и лучшие окна для решений</li>
              </ul>
              <p className="mt-3 text-lg font-semibold text-[var(--accent-gold)]">Цена: {energyCost} ⚡</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="w-full" variant="primary" onClick={onConfirmPurchase} disabled={state.purchasing}>
                {state.purchasing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Готовим персональный прогноз...
                  </span>
                ) : (
                  `Получить за ${energyCost} ⚡`
                )}
              </Button>
              <Button className="w-full" variant="outline" onClick={onClose} disabled={state.purchasing}>
                Не сейчас
              </Button>
            </div>
            <Button className="w-full" variant="ghost" onClick={onOpenEnergy} disabled={state.purchasing}>
              Пополнить энергию
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function HoroscopeGenerationOverlay({
  state,
  stepText
}: {
  state: GenerationOverlayState;
  stepText: string;
}) {
  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#080913]/75 px-6 backdrop-blur-md">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/15 bg-[var(--bg-card)]/95 p-7 text-center shadow-[0_42px_90px_rgba(0,0,0,0.62)]">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent-pink)]/18 blur-3xl" />
        <div className="absolute -bottom-14 -right-8 h-44 w-44 rounded-full bg-[var(--accent-gold)]/12 blur-3xl" />
        <div className="relative space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/5">
            <span className="absolute h-16 w-16 animate-ping rounded-full border border-[var(--accent-pink)]/50" />
            <span className="absolute h-20 w-20 animate-pulse rounded-full border border-white/15" />
            <MoonStar className="relative z-10 h-8 w-8 text-[var(--accent-pink)]" />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Персональный ритуал</p>
            <h4 className="text-lg font-semibold text-[var(--text-primary)]">
              {state.title || "Готовим ваш прогноз"}
            </h4>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{stepText}</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-pink)]" />
            Анализ продолжается...
          </div>
        </div>
      </div>
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
        message: "Чтобы открыть этот прогноз, нужно пополнить баланс энергии.",
        action: "energy"
      });
      return;
    }

    const missingProfile =
      normalizedMessage.includes("birth_profile_required") ||
      normalizedMessage.includes("birth_date_required") ||
      normalizedMessage.includes("birth_gender_required") ||
      normalizedMessage.includes("birth_place_required");
    if (error.status === 409 && missingProfile) {
      showNotice({
        tone: "warning",
        title: "Нужны данные рождения",
        message: "Для персонального прогноза нужны дата рождения, пол и место рождения.",
        action: "profile"
      });
      return;
    }

    if (error.status === 409 && normalizedMessage.includes("horoscope_issue_already_exists")) {
      showNotice({
        tone: "warning",
        title: "Прогноз уже создан",
        message: "Выпуск на этот период уже существует. Откройте его в блоке «Последние выпуски».",
        action: "refresh"
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
    horoscope_oneoff_personal_today: "Персональный прогноз · Сегодня",
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
  const focus = readString(value.focus) ?? readString(value.analysis);
  const advice = readString(value.advice);
  if (!focus && !advice) return null;
  if (focus && advice) return `${focus} ${advice}`;
  return focus ?? advice;
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

function IssueSectionCard({ section }: { section: IssueStructuredSection }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {section.emoji ? `${section.emoji} ` : null}
        {section.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">{section.body}</p>
      {section.advice ? (
        <div className="mt-3 rounded-xl border border-[var(--accent-gold)]/35 bg-[var(--accent-gold)]/10 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent-gold)]">Совет</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-primary)]">{section.advice}</p>
        </div>
      ) : null}
    </div>
  );
}

function PremiumIssueHero({
  content,
  issueStatus
}: {
  content: PremiumIssueContent;
  issueStatus: HoroscopeIssueStatus;
}) {
  const personaParts = [content.persona.zodiacSign, content.persona.gender, content.dateLabel].filter(Boolean);
  return (
    <div className="space-y-3 rounded-[26px] border border-[var(--accent-gold)]/20 bg-[radial-gradient(circle_at_top,_rgba(231,201,232,0.12),_transparent_48%),linear-gradient(180deg,rgba(55,42,75,0.95),rgba(24,17,34,0.94))] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.32)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          {content.hero.eyebrow || "Главный вектор дня"}
        </p>
        <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
          {issueStatus === "ready" ? content.periodLabel || "Сегодня" : "Формируется"}
        </div>
      </div>
      <div className="space-y-2">
        <h5 className="text-[30px] font-semibold leading-[1.05] text-[var(--text-primary)]">
          {content.hero.title || "Персональный прогноз на день"}
        </h5>
        {content.hero.subtitle ? (
          <p className="max-w-[34rem] text-sm leading-relaxed text-[var(--text-secondary)]">{content.hero.subtitle}</p>
        ) : null}
      </div>
      {personaParts.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {personaParts.map((item, index) => (
            <span
              key={`persona-${index}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {content.persona.personalContext ? (
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <p className="text-sm leading-relaxed text-[var(--text-primary)]">{content.persona.personalContext}</p>
        </div>
      ) : null}
      {content.hero.verdict ? (
        <div className="rounded-2xl border border-[var(--accent-gold)]/25 bg-[var(--accent-gold)]/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-gold)]">Главный вывод</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{content.hero.verdict}</p>
        </div>
      ) : null}
      {content.uiHints.moodTags.length ? (
        <div className="flex flex-wrap gap-2">
          {content.uiHints.moodTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-[var(--accent-gold)]/18 bg-[var(--accent-gold)]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-gold)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PremiumTimingCard({
  tone,
  label,
  timeRange,
  text
}: {
  tone: "good" | "warning";
  label: string;
  timeRange: string;
  text: string;
}) {
  const toneClass =
    tone === "good"
      ? "border-[var(--accent-gold)]/22 bg-[var(--accent-gold)]/10"
      : "border-white/10 bg-white/5";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{timeRange}</p>
      {text ? <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{text}</p> : null}
    </div>
  );
}

function PremiumIssueAreaCard({ area }: { area: PremiumIssueArea }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.2)]">
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {resolveIssueIcon(area.icon)} {area.title}
      </p>
      <div className="mt-3 space-y-3">
        {area.state ? <p className="text-sm leading-relaxed text-[var(--text-primary)]">{area.state}</p> : null}
        {area.meaning ? <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{area.meaning}</p> : null}
        {area.action ? (
          <div className="rounded-2xl border border-[var(--accent-gold)]/24 bg-[var(--accent-gold)]/10 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent-gold)]">Что делать</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{area.action}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IssuePreviewModal({ state, onClose }: { state: IssueModalState; onClose: () => void }) {
  if (!state.open) return null;
  const issue = state.issue;
  const issueSections = normalizeIssueSections(issue?.content_json, issue?.summary_text ?? null, issue?.content_md ?? null);
  const premiumIssue = normalizePremiumIssueContent(
    issue?.content_json,
    issue?.summary_text ?? null,
    issue?.start_date ?? null,
    issue?.end_date ?? null
  );
  const issueStatus = normalizeIssueStatus(issue?.status);

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
            {premiumIssue ? (
              <div className="space-y-3">
                <PremiumIssueHero content={premiumIssue} issueStatus={issueStatus} />

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                      {premiumIssue.dayStory.title || "Сюжет дня"}
                    </p>
                    <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
                      {premiumIssue.periodLabel}
                    </div>
                  </div>
                  {premiumIssue.dayStory.text ? (
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-primary)]">{premiumIssue.dayStory.text}</p>
                  ) : null}
                  {premiumIssue.dayStory.innerTask ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Внутренняя задача</p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {premiumIssue.dayStory.innerTask}
                      </p>
                    </div>
                  ) : null}
                </div>

                {(premiumIssue.timing.bestWindow.timeRange || premiumIssue.timing.cautionWindow.timeRange) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {premiumIssue.timing.bestWindow.timeRange ? (
                      <PremiumTimingCard
                        tone="good"
                        label={premiumIssue.timing.bestWindow.label || "Лучшее время"}
                        timeRange={premiumIssue.timing.bestWindow.timeRange}
                        text={premiumIssue.timing.bestWindow.text || ""}
                      />
                    ) : null}
                    {premiumIssue.timing.cautionWindow.timeRange ? (
                      <PremiumTimingCard
                        tone="warning"
                        label={premiumIssue.timing.cautionWindow.label || "Осторожное время"}
                        timeRange={premiumIssue.timing.cautionWindow.timeRange}
                        text={premiumIssue.timing.cautionWindow.text || ""}
                      />
                    ) : null}
                  </div>
                )}

                {premiumIssue.areas.length ? (
                  <div className="space-y-3">
                    {premiumIssue.areas.map((area) => (
                      <PremiumIssueAreaCard key={area.key} area={area} />
                    ))}
                  </div>
                ) : null}

                {(premiumIssue.opportunity.text || premiumIssue.risk.text) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {premiumIssue.opportunity.text ? (
                      <div className="rounded-[24px] border border-[var(--accent-gold)]/18 bg-[var(--accent-gold)]/10 p-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">🚀 {premiumIssue.opportunity.title}</p>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {premiumIssue.opportunity.text}
                        </p>
                      </div>
                    ) : null}
                    {premiumIssue.risk.text ? (
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">⚠️ {premiumIssue.risk.title}</p>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{premiumIssue.risk.text}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {premiumIssue.finalAdvice.text ? (
                  <div className="rounded-[24px] border border-[var(--accent-gold)]/22 bg-[linear-gradient(180deg,rgba(215,185,139,0.16),rgba(215,185,139,0.08))] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-gold)]">
                      {premiumIssue.finalAdvice.title || "Финальный совет"}
                    </p>
                    <p className="mt-3 text-base leading-relaxed text-[var(--text-primary)]">
                      {premiumIssue.finalAdvice.text}
                    </p>
                  </div>
                ) : null}

                {(premiumIssue.ritual.text || premiumIssue.eveningReflection.text) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {premiumIssue.ritual.text ? (
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">🪄 {premiumIssue.ritual.title}</p>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{premiumIssue.ritual.text}</p>
                      </div>
                    ) : null}
                    {premiumIssue.eveningReflection.text ? (
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          🌙 {premiumIssue.eveningReflection.title}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {premiumIssue.eveningReflection.text}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : issueSections.length ? (
              <div className="space-y-3">
                {issueSections.map((section) => (
                  <IssueSectionCard key={section.key} section={section} />
                ))}
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

function normalizeIssueSections(
  contentJson: HoroscopeIssueResponse["content_json"],
  summaryText: string | null,
  markdownText: string | null
): IssueStructuredSection[] {
  const resolvedPayload = resolveIssueContentPayload(contentJson);
  const resolvedSummary =
    summaryText ??
    (isRecord(contentJson) ? normalizeIssueText(readString(contentJson.summary_text)) : null) ??
    null;
  const sections: IssueStructuredSection[] = [];
  const add = (section: IssueStructuredSection | null) => {
    if (!section || !section.body) return;
    sections.push(section);
  };

  if (resolvedPayload) {
    add({
      key: "summary",
      title: "Сюжет периода",
      emoji: "✨",
      body: normalizeIssueText(readString(resolvedPayload.summary) ?? resolvedSummary) ?? ""
    });
    add({
      key: "main_energy",
      title: "Главная энергия",
      emoji: "🌌",
      body:
        normalizeIssueText(
          readString(resolvedPayload.main_energy) ??
            readString(resolvedPayload.mainEnergy) ??
            readString(resolvedPayload.focus)
        ) ?? ""
    });

    add(buildIssueSectionFromBlock("love", "Любовь", "❤️", resolvedPayload.love));
    add(buildIssueSectionFromBlock("career", "Карьера", "💼", resolvedPayload.career));
    add(buildIssueSectionFromBlock("money", "Деньги", "💰", resolvedPayload.money));
    add(buildIssueSectionFromBlock("health", "Здоровье", "🧘", resolvedPayload.health));

    add({
      key: "opportunity",
      title: "Возможность",
      emoji: "🚀",
      body:
        normalizeIssueText(readString(resolvedPayload.opportunity) ?? readString(resolvedPayload.chance)) ?? ""
    });
    add({
      key: "risk",
      title: "Риск",
      emoji: "⚠️",
      body:
        normalizeIssueText(
          readString(resolvedPayload.risk) ?? readString(resolvedPayload.warning) ?? readString(resolvedPayload.risks)
        ) ?? ""
    });

    const timingBest = normalizeIssueText(readTimingPart(resolvedPayload.timing, "best_period"));
    const timingCaution = normalizeIssueText(readTimingPart(resolvedPayload.timing, "caution_period"));
    if (timingBest || timingCaution) {
      add({
        key: "timing",
        title: "Тайминг",
        emoji: "⏰",
        body: timingBest ? `Лучшее время: ${timingBest}` : "Работайте в спокойном ритме.",
        advice: timingCaution ? `Осторожность: ${timingCaution}` : null
      });
    }

    add({
      key: "final_advice",
      title: "Финальный совет",
      emoji: "🧭",
      body:
        normalizeIssueText(readString(resolvedPayload.advice) ?? readString(resolvedPayload.final_advice)) ?? ""
    });
  }

  if (sections.length > 1) return sections;
  const markdownSections = parseIssueMarkdownSections(markdownText, resolvedSummary);
  if (markdownSections.length) return markdownSections;
  return sections;
}

function normalizePremiumIssueContent(
  contentJson: HoroscopeIssueResponse["content_json"],
  summaryText: string | null,
  startDate: string | null,
  endDate: string | null
): PremiumIssueContent | null {
  const payload = resolveIssueContentPayload(contentJson);
  if (!payload) return null;

  const hasPremiumShape =
    readString(payload.version) === "daily_personal_v2" ||
    isRecord(payload.hero) ||
    isRecord(payload.day_story) ||
    Array.isArray(payload.areas);
  const hasLegacyDailyShape =
    Boolean(readString(payload.summary) || readString(payload.main_energy) || readString(payload.focus)) &&
    (isRecord(payload.love) || isRecord(payload.career) || isRecord(payload.money) || isRecord(payload.health));

  if (!hasPremiumShape && !hasLegacyDailyShape) return null;

  const persona = isRecord(payload.persona) ? payload.persona : {};
  const hero = isRecord(payload.hero) ? payload.hero : {};
  const dayStory = isRecord(payload.day_story) ? payload.day_story : {};
  const timing = isRecord(payload.timing) ? payload.timing : {};
  const bestWindow = isRecord(timing.best_window)
    ? timing.best_window
    : { label: "Лучшее время", time_range: readString(timing.best_period), text: null };
  const cautionWindow = isRecord(timing.caution_window)
    ? timing.caution_window
    : { label: "Осторожное время", time_range: readString(timing.caution_period), text: null };

  const rawAreas =
    Array.isArray(payload.areas) && payload.areas.length
      ? payload.areas
      : [
          { key: "love", icon: "heart", title: "Любовь", ...(isRecord(payload.love) ? payload.love : {}) },
          { key: "career", icon: "briefcase", title: "Карьера", ...(isRecord(payload.career) ? payload.career : {}) },
          { key: "money", icon: "coins", title: "Деньги", ...(isRecord(payload.money) ? payload.money : {}) },
          {
            key: "wellbeing",
            icon: "sparkles",
            title: "Состояние",
            ...((isRecord(payload.wellbeing) ? payload.wellbeing : isRecord(payload.health) ? payload.health : {}) as Record<
              string,
              unknown
            >)
          }
        ];

  const areas = rawAreas
    .map((rawArea, index) => normalizePremiumIssueArea(rawArea, index))
    .filter((area): area is PremiumIssueArea => Boolean(area));

  const uiHints = isRecord(payload.ui_hints) ? payload.ui_hints : {};
  const opportunity = isRecord(payload.opportunity)
    ? payload.opportunity
    : { title: "Главная возможность", text: readString(payload.opportunity) ?? readString(payload.chance) };
  const risk = isRecord(payload.risk)
    ? payload.risk
    : { title: "Главный риск", text: readString(payload.risk) ?? readString(payload.warning) ?? readString(payload.risks) };
  const finalAdvice = isRecord(payload.final_advice)
    ? payload.final_advice
    : { title: "Финальный совет", text: readString(payload.final_advice) ?? readString(payload.advice) };
  const ritual = isRecord(payload.ritual) ? payload.ritual : {};
  const eveningReflection = isRecord(payload.evening_reflection) ? payload.evening_reflection : {};
  const periodLabel = readString(payload.period_label) ?? "Сегодня";

  return {
    version: readString(payload.version) ?? "daily_personal_v2",
    dateLabel: readString(payload.date_label) ?? formatIssuePeriod(startDate, endDate),
    periodLabel,
    persona: {
      zodiacSign: getZodiacDisplayLabel(persona.zodiac_sign) ?? readString(persona.zodiac_sign),
      gender: getGenderLabel(readString(persona.gender)) ?? readString(persona.gender),
      archetype: normalizeIssueText(readString(persona.archetype)),
      personalContext:
        normalizeIssueText(readString(persona.personal_context)) ??
        normalizeIssueText(summaryText) ??
        normalizeIssueText(readString(payload.summary)),
    },
    hero: {
      eyebrow: readString(hero.eyebrow) ?? "Главный вектор дня",
      title:
        normalizeIssueText(readString(hero.title)) ??
        normalizeIssueText(readString(payload.main_energy) ?? readString(payload.focus)) ??
        "Персональный прогноз на день",
      subtitle:
        normalizeIssueText(readString(hero.subtitle)) ??
        normalizeIssueText(summaryText) ??
        normalizeIssueText(readString(payload.summary)),
      verdict:
        normalizeIssueText(readString(hero.verdict)) ??
        normalizeIssueText(readString(payload.final_advice) ?? readString(payload.advice)),
    },
    dayStory: {
      title: readString(dayStory.title) ?? "Сюжет дня",
      text:
        normalizeIssueText(readString(dayStory.text)) ??
        normalizeIssueText(readString(payload.summary)) ??
        normalizeIssueText(summaryText),
      innerTask:
        normalizeIssueText(readString(dayStory.inner_task)) ??
        normalizeIssueText(readString(payload.focus) ?? readString(payload.main_energy)),
    },
    timing: {
      bestWindow: {
        label: readString(bestWindow.label) ?? "Лучшее время",
        timeRange: normalizeIssueText(readString(bestWindow.time_range)),
        text: normalizeIssueText(readString(bestWindow.text)),
      },
      cautionWindow: {
        label: readString(cautionWindow.label) ?? "Осторожное время",
        timeRange: normalizeIssueText(readString(cautionWindow.time_range)),
        text: normalizeIssueText(readString(cautionWindow.text)),
      },
    },
    areas,
    opportunity: {
      title: readString(opportunity.title) ?? "Главная возможность",
      text: normalizeIssueText(readString(opportunity.text)),
    },
    risk: {
      title: readString(risk.title) ?? "Главный риск",
      text: normalizeIssueText(readString(risk.text)),
    },
    finalAdvice: {
      title: readString(finalAdvice.title) ?? "Финальный совет",
      text: normalizeIssueText(readString(finalAdvice.text)),
    },
    ritual: {
      title: readString(ritual.title) ?? "Ритуал дня",
      text: normalizeIssueText(readString(ritual.text)),
    },
    eveningReflection: {
      title: readString(eveningReflection.title) ?? "Вопрос на вечер",
      text: normalizeIssueText(readString(eveningReflection.text)),
    },
    uiHints: {
      moodTags: Array.isArray(uiHints.mood_tags)
        ? uiHints.mood_tags
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean)
            .slice(0, 3)
        : [],
      highlightArea: readString(uiHints.highlight_area),
      intensity: readString(uiHints.intensity),
    },
  };
}

function resolveIssueContentPayload(contentJson: HoroscopeIssueResponse["content_json"]): Record<string, unknown> | null {
  if (!isRecord(contentJson)) return null;
  if (isRecord(contentJson.content_json)) return contentJson.content_json;
  if (isRecord(contentJson.data) && isRecord(contentJson.data.content_json)) return contentJson.data.content_json;
  return contentJson;
}

function readTimingPart(value: unknown, key: "best_period" | "caution_period"): string | null {
  if (!isRecord(value)) return null;
  return readString(value[key]);
}

function buildIssueSectionFromBlock(
  key: string,
  title: string,
  emoji: string,
  raw: unknown
): IssueStructuredSection | null {
  if (typeof raw === "string") {
    const body = normalizeIssueText(raw);
    if (!body) return null;
    return { key, title, emoji, body };
  }
  if (!isRecord(raw)) return null;
  const analysis = normalizeIssueText(readString(raw.analysis) ?? readString(raw.focus) ?? readString(raw.text));
  const advice = normalizeIssueText(readString(raw.advice));
  if (!analysis && !advice) return null;
  return {
    key,
    title,
    emoji,
    body: analysis ?? advice ?? "",
    advice: advice && advice !== analysis ? advice : null
  };
}

function normalizePremiumIssueArea(raw: unknown, index: number): PremiumIssueArea | null {
  if (!isRecord(raw)) return null;
  const key = readString(raw.key) ?? `area-${index}`;
  const state = normalizeIssueText(readString(raw.state) ?? readString(raw.analysis) ?? readString(raw.focus) ?? readString(raw.text));
  const meaning = normalizeIssueText(readString(raw.meaning));
  const action = normalizeIssueText(readString(raw.action) ?? readString(raw.advice));
  if (!state && !meaning && !action) return null;
  return {
    key,
    icon: readString(raw.icon) ?? "sparkles",
    title: readString(raw.title) ?? "Сфера дня",
    state: state ?? "",
    meaning: meaning ?? "",
    action: action ?? "",
  };
}

function resolveIssueIcon(icon: string): string {
  const normalized = icon.trim().toLowerCase();
  if (normalized === "heart") return "❤️";
  if (normalized === "briefcase") return "💼";
  if (normalized === "coins") return "💰";
  if (normalized === "sparkles") return "✨";
  return "✨";
}

function parseIssueMarkdownSections(markdownText: string | null, summaryText: string | null): IssueStructuredSection[] {
  const sections: IssueStructuredSection[] = [];
  const normalizedSummary = normalizeIssueText(summaryText);
  if (normalizedSummary) {
    sections.push({
      key: "summary_fallback",
      title: "Сюжет периода",
      emoji: "✨",
      body: normalizedSummary
    });
  }
  if (!markdownText) return sections;

  const rows = markdownText
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) return sections;

  const parsed: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const row of rows) {
    const heading = row.match(/^#{1,6}\s*(.+)$/);
    if (heading) {
      current = { title: stripMarkdownSyntax(heading[1]), lines: [] };
      parsed.push(current);
      continue;
    }
    if (!current) {
      current = { title: "Прогноз", lines: [] };
      parsed.push(current);
    }
    const normalized = stripMarkdownSyntax(row).replace(/^[-*]\s*/, "");
    if (normalized) current.lines.push(normalized);
  }

  parsed.forEach((chunk, index) => {
    const body = normalizeIssueText(chunk.lines.join("\n"));
    if (!body) return;
    const title = chunk.title || `Раздел ${index + 1}`;
    sections.push({
      key: `md-${index}`,
      title,
      emoji: resolveIssueSectionEmoji(title),
      body
    });
  });

  return sections;
}

function resolveIssueSectionEmoji(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("люб")) return "❤️";
  if (normalized.includes("карьер") || normalized.includes("работ")) return "💼";
  if (normalized.includes("ден")) return "💰";
  if (normalized.includes("здоров")) return "🧘";
  if (normalized.includes("энерг")) return "🌌";
  if (normalized.includes("возмож")) return "🚀";
  if (normalized.includes("риск")) return "⚠️";
  if (normalized.includes("тайм") || normalized.includes("время")) return "⏰";
  if (normalized.includes("совет")) return "🧭";
  if (normalized.includes("итог") || normalized.includes("summary")) return "✨";
  return "✨";
}

function stripMarkdownSyntax(value: string): string {
  return value
    .replace(/`{1,3}/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .trim();
}

function normalizeIssueText(value: string | null): string | null {
  if (!value) return null;
  const normalized = stripMarkdownSyntax(value)
    .replace(/\b(фокус|focus)\s*:\s*/gi, "")
    .replace(/\b(совет|advice)\s*:\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized || null;
}
