import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Loader2, RefreshCw, Share2, Users, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdsgramTaskBanner } from "@/components/ads/AdsgramTaskBanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  ApiError,
  completeEnergyRewardAd,
  createTelegramStarsPayment,
  createRobokassaPayment,
  getEnergyAdsState,
  getPaymentOffers,
  getReferralProgram,
  getTelegramStarsPaymentStatus,
  getPurchaseStatus,
  getWalletHistory,
  markPaymentOfferDismissed,
  markPaymentOfferExpired,
  markPaymentOffersShown,
  startEnergyRewardAd,
  type EnergyAdsStateResponse,
  type PaymentOfferResponse,
  type PurchaseStatusResponse,
  type ReferralProgramResponse,
  type TelegramStarsPaymentStatusResponse,
  type WalletHistoryItemResponse
} from "@/lib/api";
import { openExternalLink, openTelegramInvoice, triggerHapticNotification } from "@/lib/telegram";

const PENDING_PURCHASE_STORAGE_KEY = "tarotolog_pending_purchase";
const ENERGY_CURRENCY_STORAGE_KEY = "tarotolog_energy_currency";
const AUTO_STATUS_POLL_INTERVAL_MS = 12_000;
const AUTO_STATUS_POLL_MAX_ATTEMPTS = 12;
const STATUS_AUTO_HIDE_MS = 7000;
const BALANCE_ANIMATION_DURATION_MS = 850;
const BALANCE_DELTA_BADGE_DURATION_MS = 2600;
const ADS_COUNTDOWN_TICK_MS = 1000;
const ADS_STATE_REFETCH_DEBOUNCE_MS = 3000;
const OFFERS_COUNTDOWN_TICK_MS = 1000;
const ADMIN_USER_ID = "eacd5034-10e3-496b-8868-b25df9c28711";
const TASK_ADSGRAM_BLOCK_ID =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_TASK_ID ?? "task-25628";

type PurchaseUiState = "idle" | "creating" | "awaiting_confirmation" | "succeeded" | "failed" | "pending";
type CurrencyCode = "RUB" | "USD" | "EUR";
type AdActionStage = "starting" | "completing";
type PaymentMethod = "robokassa" | "telegram_stars";

interface PendingPurchaseStorage {
  entity_id: string;
  payment_method: PaymentMethod;
  invoice_id?: number | null;
  product_code?: string | null;
  offer_id?: string | null;
  created_at: string;
}

interface PurchaseNotice {
  tone: "success" | "error";
  title: string;
  message: string;
}

interface CurrencyOption {
  code: CurrencyCode;
  label: string;
}

interface PaymentStatusView {
  entity_id: string;
  payment_method: PaymentMethod;
  invoice_id?: number | null;
  status: string;
  currency: string;
  code: string | null;
  title: string | null;
  energy_credited: number;
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "RUB", label: "₽ RUB" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" }
];

const PAYMENT_METHOD_OPTIONS: Array<{ code: PaymentMethod; label: string }> = [
  { code: "robokassa", label: "Карта" },
  { code: "telegram_stars", label: "Telegram Stars" }
];

const FAILED_STATUSES = new Set(["failed", "canceled", "cancelled", "refunded"]);
const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);

function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return value === "RUB" || value === "USD" || value === "EUR";
}

function isTaskBlockId(value: string | null | undefined): value is string {
  return Boolean(value && /^task-\d+$/i.test(value.trim()));
}

function readPendingPurchase(): PendingPurchaseStorage | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPurchaseStorage & { purchase_id?: string };
    const entityId = parsed?.entity_id || parsed?.purchase_id || null;
    if (!entityId) return null;
    const method = parsed?.payment_method || "robokassa";
    return {
      ...parsed,
      entity_id: entityId,
      payment_method: method
    };
  } catch {
    return null;
  }
}

function writePendingPurchase(purchase: PendingPurchaseStorage): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
}

function clearPendingPurchase(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
}

function readStoredCurrency(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(ENERGY_CURRENCY_STORAGE_KEY);
  return isCurrencyCode(stored) ? stored : null;
}

function writeStoredCurrency(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENERGY_CURRENCY_STORAGE_KEY, currency);
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function formatFiatAmount(amountValue: string, currency: CurrencyCode): string {
  const amount = Number(amountValue || "0");
  if (!Number.isFinite(amount)) return `0 ${currency}`;
  if (currency === "RUB") {
    return `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
  }
  const locale = currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatOfferPrice(offer: PaymentOfferResponse, fallbackCurrency: CurrencyCode): string {
  if (offer.provider === "telegram_stars") {
    const stars = offer.stars_amount ?? Math.round(Number(offer.final_amount || "0"));
    return `${stars} ⭐`;
  }
  const normalized = offer.currency === "USD" || offer.currency === "EUR" || offer.currency === "RUB" ? offer.currency : fallbackCurrency;
  return formatFiatAmount(offer.final_amount, normalized as CurrencyCode);
}

function hasOfferDiscount(offer: PaymentOfferResponse): boolean {
  const discountAmount = Number(offer.discount_amount || "0");
  const baseAmount = Number(offer.base_amount || "0");
  const finalAmount = Number(offer.final_amount || "0");
  const discountPercent = Number(offer.discount_percent || "0");
  return discountAmount > 0 || discountPercent > 0 || (baseAmount > 0 && finalAmount > 0 && finalAmount < baseAmount);
}

function formatOfferOldPrice(offer: PaymentOfferResponse, fallbackCurrency: CurrencyCode): string | null {
  if (!hasOfferDiscount(offer)) return null;
  if (offer.provider === "telegram_stars") {
    const baseStars = Math.round(Number(offer.base_amount || "0"));
    return baseStars > 0 ? `${baseStars} ⭐` : null;
  }
  const normalized = offer.currency === "USD" || offer.currency === "EUR" || offer.currency === "RUB" ? offer.currency : fallbackCurrency;
  return formatFiatAmount(offer.base_amount, normalized as CurrencyCode);
}

function formatOfferRemaining(validUntil: string | null): string | null {
  if (!validUntil) return null;
  const target = new Date(validUntil).getTime();
  if (!Number.isFinite(target)) return null;
  const diffSeconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
  if (diffSeconds <= 0) return "00:00:00";
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function resolveAutodetectedCurrency(params: {
  userLang?: string | null;
  interfaceLanguage?: string | null;
  telegramLanguage?: string | null;
  detectedCountry?: string | null;
}): CurrencyCode {
  const languages = [params.userLang, params.interfaceLanguage, params.telegramLanguage]
    .filter(Boolean)
    .map((lang) => String(lang).trim().toLowerCase());

  if (languages.some((lang) => lang.startsWith("ru"))) {
    return "RUB";
  }

  const country = (params.detectedCountry || "").trim().toUpperCase();
  if (country === "RU") {
    return "RUB";
  }
  if (EU_COUNTRY_CODES.has(country)) {
    return "EUR";
  }
  return "USD";
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function cooldownSecondsFromIso(value: string | null | undefined): number {
  if (!value) return 0;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function formatWalletHistoryTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function toPaymentStatusViewFromPurchase(purchase: PurchaseStatusResponse): PaymentStatusView {
  return {
    entity_id: purchase.purchase_id,
    payment_method: "robokassa",
    invoice_id: purchase.invoice_id,
    status: purchase.status,
    currency: purchase.currency,
    code: purchase.product_code,
    title: purchase.product_title,
    energy_credited: purchase.energy_credited
  };
}

function toPaymentStatusViewFromStarsPayment(payment: TelegramStarsPaymentStatusResponse): PaymentStatusView {
  return {
    entity_id: payment.payment_id,
    payment_method: "telegram_stars",
    status: payment.status,
    currency: payment.currency,
    code: payment.offer_code,
    title: payment.offer_title,
    energy_credited: payment.energy_credited
  };
}

export default function EnergyPage() {
  const navigate = useNavigate();
  const { profile, loading, refresh } = useProfile();
  const user = profile?.user;
  const energyBalance = user?.energy_balance ?? 0;

  const [uiState, setUiState] = useState<PurchaseUiState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activePurchase, setActivePurchase] = useState<PaymentStatusView | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchaseStorage | null>(null);
  const [creatingProductCode, setCreatingProductCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [displayedEnergyBalance, setDisplayedEnergyBalance] = useState<number>(energyBalance);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<PurchaseNotice | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => readStoredCurrency() || "RUB");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("robokassa");
  const [paymentOffers, setPaymentOffers] = useState<PaymentOfferResponse[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offerUsageMap, setOfferUsageMap] = useState<Record<string, string | null>>({});

  const [adsState, setAdsState] = useState<EnergyAdsStateResponse | null>(null);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsErrorText, setAdsErrorText] = useState<string | null>(null);
  const [adsAction, setAdsAction] = useState<AdActionStage | null>(null);
  const [taskCooldownLeft, setTaskCooldownLeft] = useState<number>(0);
  const [referralProgram, setReferralProgram] = useState<ReferralProgramResponse | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [shareHintOpen, setShareHintOpen] = useState(false);
  const [pendingInlineQuery, setPendingInlineQuery] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<WalletHistoryItemResponse[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const lastEnergyBalanceRef = useRef<number>(energyBalance);
  const balanceAnimationFrameRef = useRef<number | null>(null);
  const balanceDeltaTimeoutRef = useRef<number | null>(null);
  const statusCheckInFlightRef = useRef(false);
  const statusAutoHideTimeoutRef = useRef<number | null>(null);
  const autoPollAttemptsRef = useRef(0);
  const notifiedPurchaseStatesRef = useRef<Set<string>>(new Set());
  const currencyWasChangedManuallyRef = useRef(Boolean(readStoredCurrency()));
  const lastAdsReloadAtRef = useRef(0);
  const taskRewardInFlightRef = useRef(false);
  const trackedOfferIdsRef = useRef<Set<string>>(new Set());
  const handledExpiredUsageRef = useRef<Set<string>>(new Set());
  const handledDismissedUsageRef = useRef<Set<string>>(new Set());
  const offerExpiryInFlightRef = useRef(false);
  const activeOfferUsageIdsRef = useRef<Set<string>>(new Set());

  const telegramLanguage = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || null;
  }, []);

  useEffect(() => {
    if (currencyWasChangedManuallyRef.current) return;
    if (!profile) return;

    const autodetected = resolveAutodetectedCurrency({
      userLang: profile.user?.lang,
      interfaceLanguage: profile.birth_profile?.interface_language,
      telegramLanguage,
      detectedCountry: profile.birth_profile?.detected_country
    });
    setSelectedCurrency(autodetected);
    writeStoredCurrency(autodetected);
  }, [profile, telegramLanguage]);

  useEffect(() => {
    writeStoredCurrency(selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    const previous = lastEnergyBalanceRef.current;
    const next = energyBalance;

    if (previous === next) {
      setDisplayedEnergyBalance(next);
      return;
    }

    if (balanceAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(balanceAnimationFrameRef.current);
      balanceAnimationFrameRef.current = null;
    }
    if (balanceDeltaTimeoutRef.current !== null) {
      window.clearTimeout(balanceDeltaTimeoutRef.current);
      balanceDeltaTimeoutRef.current = null;
    }

    const delta = next - previous;
    lastEnergyBalanceRef.current = next;

    if (delta <= 0) {
      setDisplayedEnergyBalance(next);
      setBalanceDelta(null);
      setIsBalanceAnimating(false);
      return;
    }

    setBalanceDelta(delta);
    setIsBalanceAnimating(true);

    const animationStart = performance.now();
    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - animationStart) / BALANCE_ANIMATION_DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayedEnergyBalance(previous + delta * eased);

      if (progress < 1) {
        balanceAnimationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        setDisplayedEnergyBalance(next);
        setIsBalanceAnimating(false);
        balanceAnimationFrameRef.current = null;
      }
    };

    balanceAnimationFrameRef.current = window.requestAnimationFrame(animate);
    balanceDeltaTimeoutRef.current = window.setTimeout(() => {
      setBalanceDelta(null);
      balanceDeltaTimeoutRef.current = null;
    }, BALANCE_DELTA_BADGE_DURATION_MS);

    return () => {
      if (balanceAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(balanceAnimationFrameRef.current);
        balanceAnimationFrameRef.current = null;
      }
      if (balanceDeltaTimeoutRef.current !== null) {
        window.clearTimeout(balanceDeltaTimeoutRef.current);
        balanceDeltaTimeoutRef.current = null;
      }
    };
  }, [energyBalance]);

  const loadAdsState = useCallback(async () => {
    try {
      setAdsLoading(true);
      const next = await getEnergyAdsState();
      setAdsState(next);
      setAdsErrorText(null);
      setTaskCooldownLeft(cooldownSecondsFromIso(next.task_available_at));
      lastAdsReloadAtRef.current = Date.now();
    } catch (error) {
      setAdsErrorText(normalizeErrorMessage(error, "Не удалось загрузить рекламные награды"));
    } finally {
      setAdsLoading(false);
    }
  }, []);

  const clearStatusAutoHideTimer = useCallback(() => {
    if (statusAutoHideTimeoutRef.current !== null) {
      window.clearTimeout(statusAutoHideTimeoutRef.current);
      statusAutoHideTimeoutRef.current = null;
    }
  }, []);

  const scheduleStatusAutoHide = useCallback(() => {
    clearStatusAutoHideTimer();
    statusAutoHideTimeoutRef.current = window.setTimeout(() => {
      setStatusText(null);
      setErrorText(null);
      setActivePurchase(null);
      setUiState("idle");
      statusAutoHideTimeoutRef.current = null;
    }, STATUS_AUTO_HIDE_MS);
  }, [clearStatusAutoHideTimer]);

  useEffect(() => {
    void loadAdsState();
  }, [loadAdsState]);

  const loadReferralProgram = useCallback(async () => {
    try {
      setReferralLoading(true);
      const response = await getReferralProgram();
      setReferralProgram(response);
      setReferralError(null);
    } catch (error) {
      setReferralError(normalizeErrorMessage(error, "Не удалось загрузить реферальную программу"));
    } finally {
      setReferralLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReferralProgram();
  }, [loadReferralProgram]);

  const loadWalletHistory = useCallback(
    async (options?: { reset?: boolean }) => {
      const reset = Boolean(options?.reset);
      try {
        if (reset) {
          setHistoryLoading(true);
          setHistoryError(null);
        } else {
          setHistoryLoadingMore(true);
        }
        const response = await getWalletHistory(reset ? undefined : historyNextCursor ?? undefined);
        setHistoryItems((prev) => {
          const base = reset ? [] : prev;
          const merged = [...base, ...response.items];
          const deduped = new Map<string, WalletHistoryItemResponse>();
          merged.forEach((item) => deduped.set(item.id, item));
          return [...deduped.values()];
        });
        setHistoryNextCursor(response.next_cursor);
      } catch (error) {
        setHistoryError(normalizeErrorMessage(error, "Не удалось загрузить историю операций"));
      } finally {
        setHistoryLoading(false);
        setHistoryLoadingMore(false);
      }
    },
    [historyNextCursor]
  );

  const loadPaymentOffers = useCallback(async () => {
    const offersCurrency = selectedPaymentMethod === "telegram_stars" ? "XTR" : selectedCurrency;
    try {
      setOffersLoading(true);
      const response = await getPaymentOffers({
        provider: selectedPaymentMethod,
        currency: offersCurrency,
        source: "energy_page",
        trigger_type: "manual"
      });
      const sorted = [...(response.offers || [])].sort((a, b) => {
        if (a.final_energy_amount !== b.final_energy_amount) {
          return a.final_energy_amount - b.final_energy_amount;
        }
        return Number(a.final_amount || "0") - Number(b.final_amount || "0");
      });
      setPaymentOffers(sorted);
      setOfferUsageMap((prev) => {
        const allowed = new Set(sorted.map((offer) => offer.offer_id));
        const next: Record<string, string | null> = {};
        Object.entries(prev).forEach(([offerId, usageId]) => {
          if (allowed.has(offerId)) {
            next[offerId] = usageId;
          }
        });
        return next;
      });
      setOffersError(null);

      const unseenOfferIds = sorted
        .map((offer) => offer.offer_id)
        .filter((offerId) => !trackedOfferIdsRef.current.has(offerId));
      if (unseenOfferIds.length > 0) {
        try {
          const marked = await markPaymentOffersShown({
            offer_ids: unseenOfferIds,
            source: "energy_page",
            trigger_snapshot: {
              provider: selectedPaymentMethod,
              currency: offersCurrency
            }
          });
          setOfferUsageMap((prev) => {
            const next = { ...prev };
            marked.items.forEach((item) => {
              trackedOfferIdsRef.current.add(item.offer_id);
              if (item.usage_id) {
                next[item.offer_id] = item.usage_id;
              } else if (!(item.offer_id in next)) {
                next[item.offer_id] = null;
              }
            });
            return next;
          });
        } catch (trackError) {
          console.warn("[EnergyPage] offer shown tracking failed", trackError);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setOffersError(
          selectedPaymentMethod === "telegram_stars"
            ? "Telegram Stars временно недоступны. Используйте оплату картой."
            : "Платёжные офферы пока недоступны."
        );
      } else {
        setOffersError(normalizeErrorMessage(error, "Не удалось загрузить предложения оплаты"));
      }
      setPaymentOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [selectedCurrency, selectedPaymentMethod]);

  useEffect(() => {
    void loadPaymentOffers();
  }, [loadPaymentOffers]);

  useEffect(() => {
    if (!historyOpen) return;
    if (historyItems.length > 0) return;
    void loadWalletHistory({ reset: true });
  }, [historyItems.length, historyOpen, loadWalletHistory]);

  useEffect(() => {
    if (!adsState) return;

    const tick = () => {
      const taskLeft = adsState.task.available ? 0 : cooldownSecondsFromIso(adsState.task_available_at);
      setTaskCooldownLeft(taskLeft);

      const shouldReload = !adsState.task.available && taskLeft === 0;
      if (shouldReload && Date.now() - lastAdsReloadAtRef.current > ADS_STATE_REFETCH_DEBOUNCE_MS) {
        void loadAdsState();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, ADS_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [adsState, loadAdsState]);

  useEffect(() => {
    const handleFocus = () => {
      void loadAdsState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadAdsState();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAdsState]);

  useEffect(() => {
    if (paymentOffers.length === 0) return;
    const intervalId = window.setInterval(() => {
      if (offerExpiryInFlightRef.current) return;

      const expiredUsageIds = paymentOffers
        .map((offer) => offerUsageMap[offer.offer_id])
        .filter((usageId): usageId is string => Boolean(usageId))
        .filter((usageId) => !handledExpiredUsageRef.current.has(usageId))
        .filter((usageId) => {
          const relatedOffer = paymentOffers.find((offer) => offerUsageMap[offer.offer_id] === usageId);
          if (!relatedOffer?.valid_until) return false;
          const expireAt = new Date(relatedOffer.valid_until).getTime();
          return Number.isFinite(expireAt) && Date.now() >= expireAt;
        });

      if (expiredUsageIds.length === 0) return;
      offerExpiryInFlightRef.current = true;
      void (async () => {
        try {
          await Promise.all(
            expiredUsageIds.map(async (usageId) => {
              handledExpiredUsageRef.current.add(usageId);
              await markPaymentOfferExpired(usageId);
            })
          );
          await loadPaymentOffers();
        } catch {
          expiredUsageIds.forEach((usageId) => handledExpiredUsageRef.current.delete(usageId));
        } finally {
          offerExpiryInFlightRef.current = false;
        }
      })();
    }, OFFERS_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [loadPaymentOffers, offerUsageMap, paymentOffers]);

  useEffect(() => {
    const currentUsageIds = new Set(
      paymentOffers
        .map((offer) => offerUsageMap[offer.offer_id])
        .filter((usageId): usageId is string => Boolean(usageId))
    );

    const previousUsageIds = activeOfferUsageIdsRef.current;
    const becameHidden = [...previousUsageIds].filter((usageId) => !currentUsageIds.has(usageId));
    if (becameHidden.length > 0) {
      void Promise.all(
        becameHidden.map(async (usageId) => {
          if (handledDismissedUsageRef.current.has(usageId)) return;
          handledDismissedUsageRef.current.add(usageId);
          try {
            await markPaymentOfferDismissed(usageId);
          } catch {
            handledDismissedUsageRef.current.delete(usageId);
          }
        })
      );
    }
    activeOfferUsageIdsRef.current = currentUsageIds;
  }, [offerUsageMap, paymentOffers]);

  const handleTaskRewardClaim = useCallback(async (taskEventDetail?: unknown) => {
    if (adsAction || taskRewardInFlightRef.current) return;
    if (!adsState?.ads_enabled) {
      setAdsErrorText("Реклама отключена для активной подписки");
      return;
    }
    if (!adsState.task.available) return;

    taskRewardInFlightRef.current = true;
    setAdsErrorText(null);
    setAdsAction("starting");

    try {
      const startResponse = await startEnergyRewardAd("task");
      setAdsAction("completing");
      const completeResponse = await completeEnergyRewardAd({
        session_id: startResponse.session_id,
        ads_completed_increment: 1,
        provider_payload: {
          source: "adsgram_task_widget",
          event_detail: taskEventDetail ?? null
        }
      });

      if (!completeResponse.success || completeResponse.energy_credited <= 0) {
        setAdsErrorText(completeResponse.message || "Не удалось зачислить награду");
        await loadAdsState();
        return;
      }

      triggerHapticNotification("success");
      setPurchaseNotice({
        tone: "success",
        title: "Спасибо за помощь проекту",
        message: `${completeResponse.message} Вам начислено +${completeResponse.energy_credited} ⚡.`
      });

      await refresh();
      await loadAdsState();
      void loadReferralProgram();
      if (historyOpen) {
        void loadWalletHistory({ reset: true });
      }
    } catch (error) {
      setAdsErrorText(normalizeErrorMessage(error, "Не удалось обработать рекламную награду"));
      await loadAdsState();
    } finally {
      setAdsAction(null);
      taskRewardInFlightRef.current = false;
    }
  }, [adsAction, adsState, historyOpen, loadAdsState, loadReferralProgram, loadWalletHistory, refresh]);

  const handleReferralInvite = useCallback(() => {
    if (!referralProgram) {
      setReferralError("Реферальная ссылка пока недоступна");
      return;
    }
    const tg = window.Telegram?.WebApp;
    if (tg?.switchInlineQuery && referralProgram.share_inline_query) {
      setPendingInlineQuery(referralProgram.share_inline_query);
      setShareHintOpen(true);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(referralProgram.referral_link)
        .then(() => {
          triggerHapticNotification("success");
          setPurchaseNotice({
            tone: "success",
            title: "Ссылка скопирована",
            message: "Реферальная ссылка скопирована, отправьте её другу в Telegram."
          });
        })
        .catch(() => {
          openExternalLink(referralProgram.referral_link);
        });
      return;
    }
    openExternalLink(referralProgram.referral_link);
  }, [referralProgram]);

  const handleReferralShareConfirm = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (!pendingInlineQuery || !tg?.switchInlineQuery) {
      setShareHintOpen(false);
      setReferralError("Telegram WebApp не поддерживает inline-пересылку");
      return;
    }
    tg.switchInlineQuery(pendingInlineQuery, ["users", "groups", "channels", "bots"] as any);
    setShareHintOpen(false);
  }, [pendingInlineQuery]);

  const handleOpenHistory = useCallback(() => {
    setHistoryOpen(true);
    if (historyItems.length === 0 && !historyLoading) {
      void loadWalletHistory({ reset: true });
    }
  }, [historyItems.length, historyLoading, loadWalletHistory]);

  const applyPurchaseStatus = useCallback(
    async (payment: PaymentStatusView) => {
      setActivePurchase(payment);

      const isSucceeded = payment.payment_method === "telegram_stars" ? payment.status === "paid" : payment.status === "succeeded";
      if (isSucceeded) {
        clearStatusAutoHideTimer();
        clearPendingPurchase();
        setPendingPurchase(null);
        setUiState("succeeded");
        setErrorText(null);
        setStatusText("Оплата подтверждена. Баланс обновляется...");

        const successNoticeKey = `${payment.entity_id}:succeeded`;
        if (!notifiedPurchaseStatesRef.current.has(successNoticeKey)) {
          notifiedPurchaseStatesRef.current.add(successNoticeKey);
          triggerHapticNotification("success");
          setPurchaseNotice({
            tone: "success",
            title: "Спасибо за покупку",
            message: `Платёж подтверждён, начислено ${payment.energy_credited} ⚡.`
          });
        }

        await refresh();
        void loadPaymentOffers();
        void loadReferralProgram();
        if (historyOpen) {
          void loadWalletHistory({ reset: true });
        }
        return;
      }

      if (FAILED_STATUSES.has(payment.status)) {
        clearStatusAutoHideTimer();
        clearPendingPurchase();
        setPendingPurchase(null);
        setUiState("failed");
        setStatusText(null);
        setErrorText("Оплата не завершена.");
        scheduleStatusAutoHide();

        const failNoticeKey = `${payment.entity_id}:${payment.status}`;
        if (!notifiedPurchaseStatesRef.current.has(failNoticeKey)) {
          notifiedPurchaseStatesRef.current.add(failNoticeKey);
          setPurchaseNotice({
            tone: "error",
            title: "Платёж не завершён",
            message: "Оплата была отменена или отклонена. Энергия не начислена."
          });
        }
        return;
      }

      setUiState("pending");
      setErrorText(null);
      setStatusText("Платёж ещё обрабатывается. Мы проверяем статус автоматически.");
    },
    [clearStatusAutoHideTimer, historyOpen, loadPaymentOffers, loadReferralProgram, loadWalletHistory, refresh, scheduleStatusAutoHide]
  );

  const checkPurchaseStatus = useCallback(
    async (pending: PendingPurchaseStorage, options?: { silent?: boolean }) => {
      if (!pending.entity_id || statusCheckInFlightRef.current) return;
      statusCheckInFlightRef.current = true;
      setCheckingStatus(true);
      try {
        if (pending.payment_method === "telegram_stars") {
          const statusResponse = await getTelegramStarsPaymentStatus(pending.entity_id);
          await applyPurchaseStatus(toPaymentStatusViewFromStarsPayment(statusResponse));
        } else {
          const statusResponse = await getPurchaseStatus(pending.entity_id);
          await applyPurchaseStatus(toPaymentStatusViewFromPurchase(statusResponse));
        }
      } catch (error) {
        if (pending.payment_method === "telegram_stars" && error instanceof ApiError && error.status === 404) {
          clearPendingPurchase();
          setPendingPurchase(null);
          setActivePurchase(null);
          setUiState("idle");
          setStatusText(null);
          setErrorText(null);
          return;
        }
        if (!options?.silent) {
          setUiState("pending");
          setErrorText(normalizeErrorMessage(error, "Не удалось проверить статус оплаты. Попробуйте ещё раз."));
        }
      } finally {
        statusCheckInFlightRef.current = false;
        setCheckingStatus(false);
      }
    },
    [applyPurchaseStatus]
  );

  const handleBuyRobokassaOffer = useCallback(
    async (offer: PaymentOfferResponse) => {
      clearStatusAutoHideTimer();
      setCreatingProductCode(offer.offer_id);
      setUiState("creating");
      setStatusText(null);
      setErrorText(null);

      try {
        const usageId = offerUsageMap[offer.offer_id] ?? undefined;
        const payment = await createRobokassaPayment({
          offer_id: offer.offer_id,
          usage_id: usageId,
          currency_code: selectedCurrency
        });
        if (!payment.payment_url || !payment.purchase_id) {
          throw new Error("Не удалось создать платёж");
        }

        const pendingPayload: PendingPurchaseStorage = {
          entity_id: payment.purchase_id,
          invoice_id: payment.invoice_id,
          product_code: payment.product_code,
          payment_method: "robokassa",
          created_at: new Date().toISOString()
        };
        writePendingPurchase(pendingPayload);
        setPendingPurchase(pendingPayload);
        setActivePurchase(toPaymentStatusViewFromPurchase({
          purchase_id: payment.purchase_id,
          invoice_id: payment.invoice_id,
          status: payment.status,
          amount_minor: payment.amount_minor,
          currency: payment.currency,
          product_code: payment.product_code,
          product_title: payment.product_title,
          energy_credited: payment.energy_credited,
          created_at: pendingPayload.created_at,
          paid_at: null
        }));
        setUiState("awaiting_confirmation");
        setStatusText("Мы ждём подтверждение оплаты. После оплаты вернитесь в мини-приложение.");
        autoPollAttemptsRef.current = 0;

        openExternalLink(payment.payment_url);
      } catch (error) {
        setUiState("failed");
        setStatusText(null);
        setErrorText(normalizeErrorMessage(error, "Не удалось создать платёж. Попробуйте ещё раз."));
      } finally {
        setCreatingProductCode(null);
      }
    },
    [clearStatusAutoHideTimer, offerUsageMap, selectedCurrency]
  );

  const handleBuyStarsOffer = useCallback(
    async (offer: PaymentOfferResponse) => {
      clearStatusAutoHideTimer();
      setCreatingProductCode(offer.offer_id);
      setUiState("creating");
      setStatusText(null);
      setErrorText(null);

      try {
        const usageId = offerUsageMap[offer.offer_id] ?? undefined;
        const starsPayment = await createTelegramStarsPayment({ offer_id: offer.offer_id, usage_id: usageId });
        const invoiceUrl = starsPayment.invoice_url || starsPayment.invoice_link || starsPayment.payment_url || null;
        if (!invoiceUrl || !starsPayment.payment_id) {
          throw new Error("Не удалось создать Stars-платёж");
        }

        const pendingPayload: PendingPurchaseStorage = {
          entity_id: starsPayment.payment_id,
          payment_method: "telegram_stars",
          offer_id: starsPayment.offer_id,
          created_at: new Date().toISOString()
        };
        writePendingPurchase(pendingPayload);
        setPendingPurchase(pendingPayload);
        setActivePurchase({
          entity_id: starsPayment.payment_id,
          payment_method: "telegram_stars",
          status: starsPayment.status,
          currency: starsPayment.currency,
          code: starsPayment.offer_code,
          title: starsPayment.offer_title,
          energy_credited: starsPayment.energy_credited
        });
        setUiState("awaiting_confirmation");
        setStatusText("Откройте счёт в Telegram Stars и подтвердите оплату.");
        autoPollAttemptsRef.current = 0;

        const invoiceStatus = await openTelegramInvoice(invoiceUrl);
        if (invoiceStatus === "paid") {
          await checkPurchaseStatus(pendingPayload, { silent: true });
          return;
        }
        if (invoiceStatus === "cancelled" || invoiceStatus === "failed") {
          clearPendingPurchase();
          setPendingPurchase(null);
          setUiState("failed");
          setStatusText(null);
          setErrorText(invoiceStatus === "cancelled" ? "Оплата отменена пользователем." : "Оплата Telegram Stars не завершена.");
          scheduleStatusAutoHide();
          return;
        }

        setUiState("pending");
        setStatusText("Платёж создан. Мы автоматически проверим подтверждение.");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setUiState("failed");
          setStatusText(null);
          setErrorText("Оплата через Telegram Stars пока не включена на сервере.");
          return;
        }
        setUiState("failed");
        setStatusText(null);
        setErrorText(normalizeErrorMessage(error, "Не удалось создать Stars-платёж. Попробуйте ещё раз."));
      } finally {
        setCreatingProductCode(null);
      }
    },
    [checkPurchaseStatus, clearStatusAutoHideTimer, offerUsageMap, scheduleStatusAutoHide]
  );

  useEffect(
    () => () => {
      clearStatusAutoHideTimer();
    },
    [clearStatusAutoHideTimer]
  );

  useEffect(() => {
    const pending = readPendingPurchase();
    if (!pending?.entity_id) return;
    setPendingPurchase(pending);
    setUiState("pending");
    setStatusText("Найден незавершённый платёж. Проверяем статус...");
    void checkPurchaseStatus(pending, { silent: true });
  }, [checkPurchaseStatus]);

  useEffect(() => {
    if (!pendingPurchase || typeof window === "undefined") return;
    autoPollAttemptsRef.current = 0;
    let intervalId: number | null = null;

    const runCheck = () => {
      if (document.visibilityState !== "visible") return;
      if (autoPollAttemptsRef.current >= AUTO_STATUS_POLL_MAX_ATTEMPTS) {
        if (intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
        setStatusText("Платёж ещё обрабатывается. Автопроверка остановлена, нажмите «Проверить статус».");
        return;
      }
      autoPollAttemptsRef.current += 1;
      void checkPurchaseStatus(pendingPurchase, { silent: true });
    };

    const handleFocus = () => {
      autoPollAttemptsRef.current = 0;
      void checkPurchaseStatus(pendingPurchase, { silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        autoPollAttemptsRef.current = 0;
        void checkPurchaseStatus(pendingPurchase, { silent: true });
      }
    };

    runCheck();
    intervalId = window.setInterval(runCheck, AUTO_STATUS_POLL_INTERVAL_MS);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkPurchaseStatus, pendingPurchase]);

  const canCheckStatus = Boolean(pendingPurchase?.entity_id) && !checkingStatus;
  const isDiscountAdmin = user?.id === ADMIN_USER_ID;
  const formattedEnergyBalance = Math.round(displayedEnergyBalance).toLocaleString("ru-RU");
  const taskBlockId = useMemo(() => {
    const backendBlockId = adsState?.adsgram_task_block_id ?? null;
    if (isTaskBlockId(backendBlockId)) return backendBlockId.trim();
    if (isTaskBlockId(TASK_ADSGRAM_BLOCK_ID)) return TASK_ADSGRAM_BLOCK_ID.trim();
    return null;
  }, [adsState?.adsgram_task_block_id]);

  const taskButtonLabel = useMemo(() => {
    if (!adsState?.ads_enabled) return "Недоступно";
    if (adsAction) {
      if (adsAction === "starting") return "Готовим...";
      return "Начисляем...";
    }
    if (!adsState?.task.available) {
      return `Доступно через ${formatCountdown(taskCooldownLeft)}`;
    }
    return `Получить +${adsState.task.next_energy} ⚡`;
  }, [adsAction, adsState?.ads_enabled, adsState?.task.available, adsState?.task.next_energy, taskCooldownLeft]);

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Бесплатная энергия</p>
          </div>

          {adsLoading ? (
            <div className="h-24 animate-pulse rounded-xl bg-white/10" />
          ) : adsState?.ads_enabled && adsState?.task.available && taskBlockId ? (
            <div className="space-y-2">
              <div className="w-full overflow-hidden rounded-2xl border border-white/15 bg-[var(--surface-chip-bg)]/55 shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
                <AdsgramTaskBanner
                  className="block w-full"
                  blockId={taskBlockId}
                  disabled={Boolean(adsAction)}
                  onReward={(detail) => {
                    void handleTaskRewardClaim(detail);
                  }}
                  onError={(message) => {
                    setAdsErrorText(message);
                    void loadAdsState();
                  }}
                  onBannerNotFound={() => {
                    setAdsErrorText("Сейчас нет доступных заданий, попробуйте позже");
                    void loadAdsState();
                  }}
                  onTooLongSession={() => {
                    setAdsErrorText("Сессия задания устарела, обновите страницу");
                    void loadAdsState();
                  }}
                />
              </div>
              {adsAction ? (
                <div className="inline-flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {taskButtonLabel}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-chip-bg)]/70 px-4 py-3">
              <p className="text-sm text-[var(--text-secondary)]">{taskButtonLabel}</p>
            </div>
          )}

          {adsErrorText ? (
            <p className="text-xs text-[var(--accent-gold)]">{adsErrorText}</p>
          ) : null}

          <div className="rounded-2xl border border-white/12 bg-[var(--surface-chip-bg)]/70 p-4 shadow-[0_14px_28px_rgba(0,0,0,0.32)]">
            {referralLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                <div className="h-9 w-full animate-pulse rounded-full bg-white/10" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">Реферальная программа</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {referralProgram?.preview_text ||
                        "Пригласите друзей и получайте бонусы: +2 ⚡ за активацию и +10 ⚡ за первую покупку."}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-emerald-100/85">
                  Заработано по рефералке: +{referralProgram?.total_earned_energy_from_referrals ?? 0} ⚡
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                    <p className="text-[var(--text-tertiary)]">Приглашено</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{referralProgram?.total_invited ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                    <p className="text-[var(--text-tertiary)]">Активно</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{referralProgram?.total_activated ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                    <p className="text-[var(--text-tertiary)]">Покупки</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{referralProgram?.total_purchased ?? 0}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    disabled={!referralProgram}
                    onClick={handleReferralInvite}
                  >
                    <Users className="h-4 w-4" />
                    Пригласить друзей
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 border-white/20"
                    disabled={!referralProgram?.referral_link}
                    onClick={() => {
                      if (!referralProgram?.referral_link) return;
                      if (navigator.clipboard?.writeText) {
                        void navigator.clipboard.writeText(referralProgram.referral_link);
                      } else {
                        openExternalLink(referralProgram.referral_link);
                        return;
                      }
                      triggerHapticNotification("success");
                      setPurchaseNotice({
                        tone: "success",
                        title: "Ссылка скопирована",
                        message: "Отправьте реферальную ссылку другу и получите бонус, когда он активируется."
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Скопировать ссылку
                  </Button>
                </div>

                {referralError ? <p className="mt-2 text-xs text-[var(--accent-gold)]">{referralError}</p> : null}
              </>
            )}
          </div>
        </section>

        <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/15 bg-white/5">
            <Zap className="h-7 w-7 text-[var(--accent-gold)]" strokeWidth={1.4} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Энергия аккаунта</p>
            {loading && !profile ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-white/10" />
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <p
                  className={`text-3xl font-semibold text-[var(--accent-pink)] transition-all duration-500 ${
                    isBalanceAnimating ? "scale-105 text-[var(--accent-gold)]" : ""
                  }`}
                >
                  {formattedEnergyBalance} ⚡
                </p>
                {balanceDelta ? (
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-1 text-xs font-semibold text-emerald-100">
                    +{balanceDelta} ⚡
                  </span>
                ) : null}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {user?.telegram.username ? <p className="text-xs text-[var(--text-secondary)]">@{user.telegram.username}</p> : null}
              <button
                type="button"
                onClick={handleOpenHistory}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                <RefreshCw className="h-3 w-3" />
                История энергии
              </button>
            </div>
          </div>
        </div>

        <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-6">
          <div className="mb-4 space-y-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Пополнение энергии</h2>
            <div className="inline-flex rounded-full border border-white/15 bg-[var(--surface-chip-bg)] p-1">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedPaymentMethod === option.code
                      ? "bg-white/15 text-[var(--text-primary)] shadow-[var(--surface-shadow-soft)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => {
                    setSelectedPaymentMethod(option.code);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {selectedPaymentMethod === "telegram_stars"
                ? "Вы можете приобрести энергию официальной валютой Telegram - Telegram Stars."
                : "Вы можете приобрести энергию в удобной для вас валюте, а если оплата картой не проходит - используйте Telegram Stars."}
            </p>
            {isDiscountAdmin ? (
              <Button
                size="sm"
                variant="outline"
                className="w-fit border-white/20"
                onClick={() => navigate("/admin/discounts")}
              >
                Админка скидок
              </Button>
            ) : null}
            {selectedPaymentMethod === "robokassa" ? (
              <div className="inline-flex rounded-full border border-white/15 bg-[var(--surface-chip-bg)] p-1">
                {CURRENCY_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selectedCurrency === option.code
                        ? "bg-white/15 text-[var(--text-primary)] shadow-[var(--surface-shadow-soft)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                    onClick={() => {
                      currencyWasChangedManuallyRef.current = true;
                      setSelectedCurrency(option.code);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {offersLoading ? <div className="h-24 animate-pulse rounded-xl bg-white/10" /> : null}
            {offersError ? <p className="text-sm text-red-100">{offersError}</p> : null}
            {!offersLoading && !offersError && paymentOffers.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                {selectedPaymentMethod === "telegram_stars"
                  ? "Сейчас нет доступных Stars-офферов."
                  : "Сейчас нет доступных предложений для оплаты картой."}
              </p>
            ) : null}

            <div className="grid gap-3">
              {paymentOffers.map((offer) => {
                const creatingThisOffer = creatingProductCode === offer.offer_id;
                const totalEnergy = offer.final_energy_amount || offer.energy_amount + offer.bonus_energy;
                const hasDiscount = hasOfferDiscount(offer);
                const oldPrice = formatOfferOldPrice(offer, selectedCurrency);
                const priceLabel = formatOfferPrice(offer, selectedCurrency);
                const remaining = formatOfferRemaining(offer.valid_until);
                const discountPercent = Number(offer.discount_percent || "0");
                const discountBadge =
                  discountPercent > 0
                    ? `-${Math.round(discountPercent)}%`
                    : hasDiscount
                      ? "Акция"
                      : null;

                return (
                  <div
                    key={offer.offer_id}
                    className="rounded-2xl border border-white/10 bg-[var(--surface-chip-bg)] px-4 py-3 shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-[var(--text-secondary)]">{offer.title}</p>
                          {discountBadge ? (
                            <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                              {discountBadge}
                            </span>
                          ) : null}
                          {offer.trigger_type !== "manual" ? (
                            <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                              {offer.trigger_type.replaceAll("_", " ")}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-end gap-2">
                          <p className="text-xl font-semibold text-[var(--text-primary)]">{totalEnergy} ⚡</p>
                          {offer.bonus_energy > 0 ? (
                            <p className="text-xs text-emerald-100/90">+{offer.bonus_energy} бонус</p>
                          ) : null}
                        </div>
                        {remaining ? (
                          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Акция активна: {remaining}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-[var(--accent-gold)]">{priceLabel}</p>
                        {oldPrice ? (
                          <p className="text-xs text-[var(--text-tertiary)] line-through">{oldPrice}</p>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      className="mt-3 w-full"
                      variant="default"
                      disabled={Boolean(creatingProductCode) || checkingStatus}
                      onClick={() => {
                        if (selectedPaymentMethod === "telegram_stars") {
                          void handleBuyStarsOffer(offer);
                          return;
                        }
                        void handleBuyRobokassaOffer(offer);
                      }}
                    >
                      {creatingThisOffer ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Подготовка платежа...
                        </span>
                      ) : selectedPaymentMethod === "telegram_stars" ? (
                        "Купить за Stars"
                      ) : (
                        "Купить"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {(statusText || errorText || activePurchase || pendingPurchase?.entity_id) && (
          <Card
            className={`border p-5 ${
              uiState === "succeeded"
                ? "border-emerald-400/40 bg-emerald-400/10"
                : uiState === "failed"
                  ? "border-red-400/40 bg-red-400/10"
                  : "border-white/10 bg-[var(--bg-card)]/85"
            }`}
          >
            {statusText ? <p className="text-sm text-[var(--text-primary)]">{statusText}</p> : null}
            {errorText ? <p className="text-sm text-red-100">{errorText}</p> : null}

            {activePurchase ? (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Покупка{activePurchase.invoice_id ? ` #${activePurchase.invoice_id}` : ""} •{" "}
                {activePurchase.title || activePurchase.code} • {activePurchase.currency} • статус:{" "}
                {activePurchase.status}
              </p>
            ) : null}

            {pendingPurchase?.entity_id ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-2 border-white/20"
                disabled={!canCheckStatus}
                onClick={() => {
                  if (!pendingPurchase) return;
                  autoPollAttemptsRef.current = 0;
                  void checkPurchaseStatus(pendingPurchase);
                }}
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Проверяем...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Проверить статус
                  </>
                )}
              </Button>
            ) : null}

            {pendingPurchase?.entity_id ? (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Автопроверка статуса выполняется раз в {Math.round(AUTO_STATUS_POLL_INTERVAL_MS / 1000)} секунд, только
                когда приложение активно.
              </p>
            ) : null}
          </Card>
        )}
      </div>

      {shareHintOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-[24px] border border-white/15 bg-[#17151f] p-4 text-[var(--text-primary)] shadow-[0_35px_70px_rgba(0,0,0,0.75)]">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Share2 className="h-4 w-4 text-[var(--accent-gold)]" />
              Поделиться через Telegram
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Выберите чат в списке и отправьте карточку приглашения. Друг перейдёт по кнопке и получит бонус.
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/20"
                onClick={() => {
                  setShareHintOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button className="flex-1" onClick={handleReferralShareConfirm}>
                Открыть чаты
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-transparent p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-3xl border border-white/15 bg-[#0b0d16] p-5 shadow-[0_40px_90px_rgba(0,0,0,0.78)] sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">История операций</h3>
                <p className="text-xs text-[var(--text-secondary)]">Все изменения баланса энергии</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/15 p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                onClick={() => setHistoryOpen(false)}
                aria-label="Закрыть историю"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-[160px] flex-1 space-y-2 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="space-y-2">
                  <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                </div>
              ) : null}

              {!historyLoading && historyItems.length === 0 && !historyError ? (
                <p className="rounded-xl border border-white/15 bg-[#171a26] p-3 text-sm text-[var(--text-secondary)]">
                  Операций пока нет.
                </p>
              ) : null}

              {historyItems.map((item) => {
                const positive = item.delta >= 0;
                const deltaLabel = `${positive ? "+" : ""}${item.delta} ⚡`;
                return (
                  <div key={item.id} className="rounded-xl border border-white/15 bg-[#1b1f2d] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.display_title}</p>
                        {item.display_subtitle ? (
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.display_subtitle}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{formatWalletHistoryTimestamp(item.created_at)}</p>
                      </div>
                      <div className={`text-sm font-semibold ${positive ? "text-emerald-200" : "text-red-200"}`}>{deltaLabel}</div>
                    </div>
                    {typeof item.balance_after === "number" ? (
                      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Баланс после операции: {item.balance_after} ⚡</p>
                    ) : null}
                  </div>
                );
              })}

              {historyError ? (
                <p className="rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-100">{historyError}</p>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/20"
                onClick={() => void loadWalletHistory({ reset: true })}
                disabled={historyLoading || historyLoadingMore}
              >
                Обновить
              </Button>
              <Button
                className="flex-1"
                onClick={() => void loadWalletHistory({ reset: false })}
                disabled={!historyNextCursor || historyLoading || historyLoadingMore}
              >
                {historyLoadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загружаем...
                  </span>
                ) : (
                  "Показать ещё"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {purchaseNotice ? (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pb-safe">
          <div
            className={`w-full max-w-md rounded-2xl border p-4 shadow-[0_24px_50px_rgba(0,0,0,0.58)] backdrop-blur-xl ${
              purchaseNotice.tone === "success"
                ? "border-emerald-400/40 bg-[rgba(20,43,33,0.94)]"
                : "border-red-400/40 bg-[rgba(52,24,28,0.94)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{purchaseNotice.title}</h3>
                <p className="mt-1 text-sm text-white/80">{purchaseNotice.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseNotice(null)}
                className="rounded-full border border-white/20 p-1.5 text-white/75 transition hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="mt-3 w-full" onClick={() => setPurchaseNotice(null)}>
              Понятно
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
