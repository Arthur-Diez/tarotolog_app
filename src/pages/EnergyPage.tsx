import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdsgram } from "@/hooks/useAdsgram";
import { useProfile } from "@/hooks/useProfile";
import {
  ApiError,
  claimDailyBonus,
  createRobokassaPayment,
  getAdsConfig,
  getDailyBonusStatus,
  getPurchaseStatus,
  startDailyBonus,
  type PurchaseStatusResponse
} from "@/lib/api";
import { openExternalLink, triggerHapticNotification } from "@/lib/telegram";

const PENDING_PURCHASE_STORAGE_KEY = "tarotolog_pending_purchase";
const ENERGY_CURRENCY_STORAGE_KEY = "tarotolog_energy_currency";
const AUTO_STATUS_POLL_INTERVAL_MS = 12_000;
const AUTO_STATUS_POLL_MAX_ATTEMPTS = 12;
const BALANCE_ANIMATION_DURATION_MS = 850;
const BALANCE_DELTA_BADGE_DURATION_MS = 2600;
const FREE_ENERGY_COUNTDOWN_TICK_MS = 1000;
const TASK_ADSGRAM_BLOCK_ID =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_TASK_ID ?? "task-25628";

type PurchaseUiState = "idle" | "creating" | "awaiting_confirmation" | "succeeded" | "failed" | "pending";
type CurrencyCode = "RUB" | "USD" | "EUR";
type FreeEnergyUiState = "idle" | "starting" | "ad_showing" | "claiming" | "cooldown" | "error";

interface PendingPurchaseStorage {
  purchase_id: string;
  invoice_id: number;
  product_code: string;
  created_at: string;
}

interface EnergyPackConfig {
  productCode: string;
  title: string;
  energyAmount: number;
  pricesMinor: Record<CurrencyCode, number>;
}

interface PurchaseNotice {
  tone: "success" | "error";
  title: string;
  message: string;
}

interface FreeEnergyState {
  amount: number;
  status: FreeEnergyUiState;
  nextAvailableAt: string | null;
  error: string | null;
  taskBlockId: string;
  adsEnabled: boolean;
}

interface CurrencyOption {
  code: CurrencyCode;
  label: string;
}

const ENERGY_PACKS: EnergyPackConfig[] = [
  {
    productCode: "energy_50",
    title: "Пакет Старт",
    energyAmount: 10,
    pricesMinor: { RUB: 14900, USD: 299, EUR: 299 }
  },
  {
    productCode: "energy_100",
    title: "Пакет Фокус",
    energyAmount: 25,
    pricesMinor: { RUB: 29900, USD: 699, EUR: 699 }
  },
  {
    productCode: "energy_250",
    title: "Пакет Поток",
    energyAmount: 60,
    pricesMinor: { RUB: 59900, USD: 1499, EUR: 1499 }
  }
];

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "RUB", label: "₽ RUB" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" }
];

const FAILED_STATUSES = new Set(["failed", "canceled", "refunded"]);
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

function readPendingPurchase(): PendingPurchaseStorage | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPurchaseStorage;
    if (!parsed?.purchase_id) return null;
    return parsed;
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

function formatPrice(minor: number, currency: CurrencyCode): string {
  const amount = minor / 100;
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

function extractCooldownSeconds(nextAvailableAt: string | null): number | null {
  if (!nextAvailableAt) return null;
  const target = new Date(nextAvailableAt).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function normalizeNextAvailableAt(value?: string | null, fallback?: string | null): string | null {
  const resolved = value ?? fallback ?? null;
  return resolved && resolved.length > 0 ? resolved : null;
}

function normalizeRewardSessionId(value?: string | null, fallback?: string | null): string | null {
  const resolved = value ?? fallback ?? null;
  return resolved && resolved.length > 0 ? resolved : null;
}

function normalizeRewardId(value?: string | null, fallback?: string | null): string | null {
  const resolved = value ?? fallback ?? null;
  return resolved && resolved.length > 0 ? resolved : null;
}

function mapAdsgramError(error?: string): string {
  switch (error) {
    case "tg_sdk_unavailable":
      return "Проверь VPN/время/сеть";
    case "sdk_missing":
    case "controller_missing":
    case "block_id_missing":
      return "Реклама сейчас недоступна";
    case "no_inventory":
      return "Нет доступных заданий, попробуйте позже";
    case "network_error":
      return "Проверь соединение и отключи блокировщики";
    case "ad_error":
    default:
      return "Ошибка рекламы, попробуйте позже";
  }
}

export default function EnergyPage() {
  const { profile, loading, refresh } = useProfile();
  const adsgram = useAdsgram();
  const user = profile?.user;
  const energyBalance = user?.energy_balance ?? 0;

  const [uiState, setUiState] = useState<PurchaseUiState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activePurchase, setActivePurchase] = useState<PurchaseStatusResponse | null>(null);
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
  const [creatingProductCode, setCreatingProductCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [displayedEnergyBalance, setDisplayedEnergyBalance] = useState<number>(energyBalance);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<PurchaseNotice | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => readStoredCurrency() || "RUB");
  const [freeEnergy, setFreeEnergy] = useState<FreeEnergyState>({
    amount: 1,
    status: "idle",
    nextAvailableAt: null,
    error: null,
    taskBlockId: TASK_ADSGRAM_BLOCK_ID,
    adsEnabled: true
  });
  const [freeEnergyCooldownSeconds, setFreeEnergyCooldownSeconds] = useState<number | null>(null);

  const lastEnergyBalanceRef = useRef<number>(energyBalance);
  const balanceAnimationFrameRef = useRef<number | null>(null);
  const balanceDeltaTimeoutRef = useRef<number | null>(null);
  const statusCheckInFlightRef = useRef(false);
  const autoPollAttemptsRef = useRef(0);
  const notifiedPurchaseStatesRef = useRef<Set<string>>(new Set());
  const currencyWasChangedManuallyRef = useRef(Boolean(readStoredCurrency()));
  const freeEnergyInFlightRef = useRef(false);

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

  const loadFreeEnergyStatus = useCallback(async () => {
    try {
      const [statusResponse, adsConfigResponse] = await Promise.all([
        getDailyBonusStatus(),
        getAdsConfig().catch(() => null)
      ]);
      const nextAvailableAt = normalizeNextAvailableAt(
        statusResponse.next_available_at,
        statusResponse.nextAvailableAt
      );
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);
      const amount = Math.max(1, statusResponse.amount || 0);
      const isCooldown =
        statusResponse.status === "rewarded" ||
        statusResponse.status === "cooldown" ||
        (cooldownSeconds !== null && cooldownSeconds > 0);
      const taskBlockId = adsConfigResponse?.task_block_id?.trim() || TASK_ADSGRAM_BLOCK_ID;
      setFreeEnergy({
        amount,
        status: isCooldown ? "cooldown" : "idle",
        nextAvailableAt,
        error: null,
        taskBlockId,
        adsEnabled: adsConfigResponse?.ads_enabled ?? true
      });
    } catch (error) {
      setFreeEnergy((current) => ({
        ...current,
        status: "error",
        error: normalizeErrorMessage(error, "Не удалось загрузить бесплатную энергию")
      }));
    }
  }, []);

  useEffect(() => {
    void loadFreeEnergyStatus();
  }, [loadFreeEnergyStatus]);

  useEffect(() => {
    const handleFocus = () => {
      void loadFreeEnergyStatus();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadFreeEnergyStatus();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadFreeEnergyStatus]);

  useEffect(() => {
    if (!freeEnergy.adsEnabled) return;
    void adsgram.preload({ blockId: freeEnergy.taskBlockId }).catch(() => undefined);
  }, [adsgram, freeEnergy.adsEnabled, freeEnergy.taskBlockId]);

  useEffect(() => {
    if (freeEnergy.status !== "cooldown" || !freeEnergy.nextAvailableAt) {
      setFreeEnergyCooldownSeconds(null);
      return;
    }

    const tick = () => {
      setFreeEnergyCooldownSeconds(extractCooldownSeconds(freeEnergy.nextAvailableAt));
    };

    tick();
    const timerId = window.setInterval(tick, FREE_ENERGY_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(timerId);
  }, [freeEnergy.nextAvailableAt, freeEnergy.status]);

  const handleFreeEnergyTaskClaim = useCallback(async () => {
    if (freeEnergyInFlightRef.current || !freeEnergy.adsEnabled) return;
    freeEnergyInFlightRef.current = true;
    setFreeEnergy((current) => ({ ...current, status: "starting", error: null }));
    setErrorText(null);

    try {
      const startResponse = await startDailyBonus();
      const rewardSessionId = normalizeRewardSessionId(
        startResponse.reward_session_id,
        startResponse.rewardSessionId
      );
      const rewardId = normalizeRewardId(startResponse.reward_id, startResponse.rewardId);
      const claimId = rewardSessionId ?? rewardId;
      const claimKey = rewardSessionId ? "reward_session_id" : rewardId ? "reward_id" : null;
      const amount = Math.max(1, startResponse.amount || freeEnergy.amount || 1);
      const nextAvailableAt = normalizeNextAvailableAt(
        startResponse.next_available_at,
        startResponse.nextAvailableAt
      );
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);

      if (!claimId || (cooldownSeconds !== null && cooldownSeconds > 0)) {
        setFreeEnergy((current) => ({
          ...current,
          amount,
          nextAvailableAt,
          status: cooldownSeconds && cooldownSeconds > 0 ? "cooldown" : "error",
          error: cooldownSeconds && cooldownSeconds > 0 ? null : "Награда сейчас недоступна"
        }));
        return;
      }

      setFreeEnergy((current) => ({
        ...current,
        amount,
        status: "ad_showing",
        error: null
      }));

      const adResult = await adsgram.showPrepared({
        blockId: freeEnergy.taskBlockId,
        warmupMs: 650
      });
      if (!adResult.ok) {
        setFreeEnergy((current) => ({
          ...current,
          status: "error",
          error: mapAdsgramError(adResult.error)
        }));
        return;
      }

      setFreeEnergy((current) => ({ ...current, status: "claiming", error: null }));
      const claimPayload =
        claimKey === "reward_id"
          ? { reward_id: claimId, ad_event_payload: adResult.payload ?? {} }
          : { reward_session_id: claimId, ad_event_payload: adResult.payload ?? {} };
      const claimResponse = await claimDailyBonus(claimPayload);
      const claimNextAvailableAt = normalizeNextAvailableAt(
        claimResponse.next_available_at,
        claimResponse.nextAvailableAt
      );
      const claimCooldownSeconds = extractCooldownSeconds(claimNextAvailableAt);

      setFreeEnergy((current) => ({
        ...current,
        nextAvailableAt: claimNextAvailableAt ?? current.nextAvailableAt,
        status: claimCooldownSeconds && claimCooldownSeconds > 0 ? "cooldown" : "idle",
        error: null
      }));

      triggerHapticNotification("success");
      setPurchaseNotice({
        tone: "success",
        title: "Спасибо за помощь проекту",
        message: `Вам начислена награда +${amount} ⚡ энергии.`
      });
      await refresh();
      if (!claimNextAvailableAt) {
        await loadFreeEnergyStatus();
      }
    } catch (error) {
      setFreeEnergy((current) => ({
        ...current,
        status: "error",
        error: normalizeErrorMessage(error, "Не удалось получить бесплатную энергию")
      }));
    } finally {
      freeEnergyInFlightRef.current = false;
    }
  }, [adsgram, freeEnergy.adsEnabled, freeEnergy.amount, freeEnergy.taskBlockId, loadFreeEnergyStatus, refresh]);

  const applyPurchaseStatus = useCallback(
    async (purchase: PurchaseStatusResponse) => {
      setActivePurchase(purchase);

      if (purchase.status === "succeeded") {
        clearPendingPurchase();
        setPendingPurchaseId(null);
        setUiState("succeeded");
        setErrorText(null);
        setStatusText("Оплата подтверждена. Баланс обновляется...");

        const successNoticeKey = `${purchase.purchase_id}:succeeded`;
        if (!notifiedPurchaseStatesRef.current.has(successNoticeKey)) {
          notifiedPurchaseStatesRef.current.add(successNoticeKey);
          triggerHapticNotification("success");
          setPurchaseNotice({
            tone: "success",
            title: "Спасибо за покупку",
            message: `Платёж подтверждён, начислено ${purchase.energy_credited} ⚡.`
          });
        }

        await refresh();
        return;
      }

      if (FAILED_STATUSES.has(purchase.status)) {
        clearPendingPurchase();
        setPendingPurchaseId(null);
        setUiState("failed");
        setStatusText(null);
        setErrorText("Оплата не завершена.");

        const failNoticeKey = `${purchase.purchase_id}:${purchase.status}`;
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

      setPendingPurchaseId(purchase.purchase_id);
      setUiState("pending");
      setErrorText(null);
      setStatusText("Платёж ещё обрабатывается. Мы проверяем статус автоматически.");
    },
    [refresh]
  );

  const checkPurchaseStatus = useCallback(
    async (purchaseId: string, options?: { silent?: boolean }) => {
      if (!purchaseId || statusCheckInFlightRef.current) return;
      statusCheckInFlightRef.current = true;
      setCheckingStatus(true);
      try {
        const statusResponse = await getPurchaseStatus(purchaseId);
        await applyPurchaseStatus(statusResponse);
      } catch (error) {
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

  const handleBuyPack = useCallback(
    async (pack: EnergyPackConfig) => {
      setCreatingProductCode(pack.productCode);
      setUiState("creating");
      setStatusText(null);
      setErrorText(null);

      try {
        const payment = await createRobokassaPayment(pack.productCode, selectedCurrency);
        if (!payment.payment_url || !payment.purchase_id) {
          throw new Error("Не удалось создать платёж");
        }

        const pendingPayload: PendingPurchaseStorage = {
          purchase_id: payment.purchase_id,
          invoice_id: payment.invoice_id,
          product_code: payment.product_code,
          created_at: new Date().toISOString()
        };
        writePendingPurchase(pendingPayload);
        setPendingPurchaseId(payment.purchase_id);
        setActivePurchase({
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
        });
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
    [selectedCurrency]
  );

  useEffect(() => {
    const pending = readPendingPurchase();
    if (!pending?.purchase_id) return;
    setPendingPurchaseId(pending.purchase_id);
    setUiState("pending");
    setStatusText("Найден незавершённый платёж. Проверяем статус...");
    void checkPurchaseStatus(pending.purchase_id, { silent: true });
  }, [checkPurchaseStatus]);

  useEffect(() => {
    if (!pendingPurchaseId || typeof window === "undefined") return;
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
      void checkPurchaseStatus(pendingPurchaseId, { silent: true });
    };

    const handleFocus = () => {
      autoPollAttemptsRef.current = 0;
      void checkPurchaseStatus(pendingPurchaseId, { silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        autoPollAttemptsRef.current = 0;
        void checkPurchaseStatus(pendingPurchaseId, { silent: true });
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
  }, [checkPurchaseStatus, pendingPurchaseId]);

  const canCheckStatus = Boolean(pendingPurchaseId) && !checkingStatus;
  const formattedEnergyBalance = Math.round(displayedEnergyBalance).toLocaleString("ru-RU");
  const freeEnergyCountdownLabel =
    freeEnergyCooldownSeconds !== null ? formatCountdown(freeEnergyCooldownSeconds) : "Доступно позже";
  const freeEnergyActionLabel = useMemo(() => {
    if (!freeEnergy.adsEnabled) return "Реклама отключена";
    if (freeEnergy.status === "starting") return "Готовим бонус...";
    if (freeEnergy.status === "ad_showing") return "Загрузка задания...";
    if (freeEnergy.status === "claiming") return "Начисляем энергию...";
    if (freeEnergy.status === "cooldown") return freeEnergyCountdownLabel;
    return "Получить +1 ⚡";
  }, [freeEnergy.adsEnabled, freeEnergy.status, freeEnergyCountdownLabel]);

  return (
    <>
      <div className="space-y-6">
        <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">Бесплатная энергия</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Выполни Adsgram Task и получи +{freeEnergy.amount} ⚡
              </p>
              {freeEnergy.status === "cooldown" ? (
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">Следующая награда через {freeEnergyCountdownLabel}</p>
              ) : null}
            </div>
            <span className="rounded-full border border-[var(--surface-chip-border)] bg-[var(--surface-chip-bg)] px-3 py-1 text-sm font-semibold text-[var(--accent-pink)]">
              +{freeEnergy.amount} ⚡
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={
                !freeEnergy.adsEnabled ||
                freeEnergy.status === "starting" ||
                freeEnergy.status === "ad_showing" ||
                freeEnergy.status === "claiming" ||
                freeEnergy.status === "cooldown"
              }
              onClick={() => {
                void handleFreeEnergyTaskClaim();
              }}
            >
              {(freeEnergy.status === "starting" || freeEnergy.status === "ad_showing" || freeEnergy.status === "claiming") && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {freeEnergyActionLabel}
            </Button>
            {freeEnergy.error ? <span className="text-xs text-[var(--accent-gold)]">{freeEnergy.error}</span> : null}
          </div>
        </Card>

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
            {user?.telegram.username ? <p className="text-xs text-[var(--text-secondary)]">@{user.telegram.username}</p> : null}
          </div>
        </div>

        <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-6">
          <div className="mb-4 space-y-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Пополнение энергии</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Валюта определяется автоматически по языку и стране, но вы можете выбрать вручную.
            </p>
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
          </div>

          <div className="grid gap-3">
            {ENERGY_PACKS.map((pack) => {
              const creatingThisPack = creatingProductCode === pack.productCode;
              const priceLabel = formatPrice(pack.pricesMinor[selectedCurrency], selectedCurrency);

              return (
                <div
                  key={pack.productCode}
                  className="rounded-2xl border border-white/10 bg-[var(--surface-chip-bg)] px-4 py-3 shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">{pack.title}</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{pack.energyAmount} ⚡</p>
                    </div>
                    <p className="text-base font-semibold text-[var(--accent-gold)]">{priceLabel}</p>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    variant="default"
                    disabled={Boolean(creatingProductCode) || checkingStatus}
                    onClick={() => {
                      void handleBuyPack(pack);
                    }}
                  >
                    {creatingThisPack ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Подготовка платежа...
                      </span>
                    ) : (
                      "Купить"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {(statusText || errorText || activePurchase || pendingPurchaseId) && (
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
                Покупка #{activePurchase.invoice_id} • {activePurchase.product_title || activePurchase.product_code} •{" "}
                {activePurchase.currency} • статус: {activePurchase.status}
              </p>
            ) : null}

            {pendingPurchaseId ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-2 border-white/20"
                disabled={!canCheckStatus}
                onClick={() => {
                  if (!pendingPurchaseId) return;
                  autoPollAttemptsRef.current = 0;
                  void checkPurchaseStatus(pendingPurchaseId);
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

            {pendingPurchaseId ? (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Автопроверка статуса выполняется раз в {Math.round(AUTO_STATUS_POLL_INTERVAL_MS / 1000)} секунд, только
                когда приложение активно.
              </p>
            ) : null}
          </Card>
        )}
      </div>

      {purchaseNotice ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-[0_30px_60px_rgba(0,0,0,0.55)] ${
              purchaseNotice.tone === "success"
                ? "border-emerald-400/40 bg-[rgba(25,44,35,0.95)]"
                : "border-red-400/40 bg-[rgba(52,24,28,0.95)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{purchaseNotice.title}</h3>
              <button
                type="button"
                onClick={() => setPurchaseNotice(null)}
                className="rounded-full border border-white/20 p-2 text-white/75 transition hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-white/80">{purchaseNotice.message}</p>
            <Button className="mt-4 w-full" onClick={() => setPurchaseNotice(null)}>
              Закрыть
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
