import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { ApiError, completeEnergyRewardAd, getEnergyAdsState, startEnergyRewardAd } from "@/lib/api";
import { getAdsgramDebugState, type AdsgramError } from "@/lib/ads/adsgram";
import { useAdsgram } from "@/hooks/useAdsgram";
import { Button } from "@/components/ui/button";
import { triggerHapticNotification } from "@/lib/telegram";

type BonusStatus = "idle" | "loading_start" | "ad_showing" | "claiming" | "cooldown" | "unavailable" | "error";
type RewardKind = "daily_x2" | "reward_regular" | null;

interface DailyBonusCardProps {
  hasSubscription: boolean;
  onBonusClaimed?: () => Promise<void> | void;
}

interface RewardState {
  amount: number | null;
  nextAvailableAt: string | null;
  nextRewardKind: RewardKind;
  adsgramBlockId: string | null;
  status: BonusStatus;
  error: string | null;
}

interface BonusNotice {
  title: string;
  message: string;
}

const BONUS_DELTA_BADGE_DURATION_MS = 2400;

function normalizeRewardEnergy(kind: RewardKind | "task_regular" | null | undefined, fallback = 1): number {
  if (kind === "daily_x2") return 2;
  if (kind === "reward_regular" || kind === "task_regular") return 1;
  return Math.max(1, fallback);
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function isCorsError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message?: unknown }).message ?? "");
    return msg.includes("Failed to fetch") || msg.includes("CORS") || msg.includes("NetworkError");
  }
  return false;
}

function extractCooldownSeconds(nextAvailableAt: string | null): number | null {
  if (!nextAvailableAt) return null;
  const target = new Date(nextAvailableAt).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function normalizeIso(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  return value;
}

function mapAdsgramError(error?: AdsgramError): string {
  switch (error) {
    case "tg_sdk_unavailable":
      return "Проверь VPN/время/сеть";
    case "sdk_missing":
    case "controller_missing":
    case "block_id_missing":
      return "Реклама сейчас недоступна (нет blockId)";
    case "no_inventory":
      return "Нет доступной рекламы, попробуйте позже";
    case "network_error":
      return "Проверь соединение и отключи блокировщики";
    case "ad_error":
    default:
      return "Ошибка рекламы, попробуйте позже";
  }
}

export function DailyBonusCard({ hasSubscription, onBonusClaimed }: DailyBonusCardProps) {
  const [processing, setProcessing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [adsDebugState, setAdsDebugState] = useState(() => getAdsgramDebugState());
  const [bonusDelta, setBonusDelta] = useState<number | null>(null);
  const [bonusNotice, setBonusNotice] = useState<BonusNotice | null>(null);
  const [rewardPulse, setRewardPulse] = useState(false);
  const [reward, setReward] = useState<RewardState>({
    amount: null,
    nextAvailableAt: null,
    nextRewardKind: null,
    adsgramBlockId: null,
    status: "idle",
    error: null
  });

  const adsgram = useAdsgram();
  const bonusDeltaTimerRef = useRef<number | null>(null);
  const debugAds = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debugAds") === "1";
  }, []);
  const refreshAdsDebug = useCallback(() => {
    setAdsDebugState(getAdsgramDebugState());
  }, []);

  useEffect(() => {
    void adsgram.preload({ debug: debugAds }).catch((error) => {
      console.info("daily-bonus: prewarm_failed", error);
      refreshAdsDebug();
    });
    const retryId = window.setTimeout(() => {
      void adsgram.preload({ debug: debugAds }).catch((error) => {
        console.info("daily-bonus: prewarm_retry_failed", error);
        refreshAdsDebug();
      });
    }, 400);

    return () => {
      window.clearTimeout(retryId);
    };
  }, [adsgram, debugAds, refreshAdsDebug]);

  useEffect(() => {
    return () => {
      if (bonusDeltaTimerRef.current !== null) {
        window.clearTimeout(bonusDeltaTimerRef.current);
        bonusDeltaTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;

    if (reward.status === "cooldown" && reward.nextAvailableAt) {
      const tick = () => {
        setCooldownSeconds(extractCooldownSeconds(reward.nextAvailableAt));
      };

      setCooldownSeconds(extractCooldownSeconds(reward.nextAvailableAt));
      tick();
      intervalId = window.setInterval(tick, 1000);
    } else {
      setCooldownSeconds(null);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [reward.nextAvailableAt, reward.status]);

  const loadStatus = useCallback(async () => {
    try {
      const adsState = await getEnergyAdsState();
      const nextAvailableAt = normalizeIso(adsState.reward_available_at ?? adsState.reward.available_at);
      const nextRewardKind = adsState.reward.next_reward_kind;
      const nextEnergy = normalizeRewardEnergy(nextRewardKind, adsState.reward.next_energy ?? 1);
      const isAvailable = adsState.ads_enabled && adsState.reward.available;
      const isCooldown = adsState.ads_enabled && !adsState.reward.available;
      const status: BonusStatus = hasSubscription
        ? "unavailable"
        : !adsState.ads_enabled
          ? "unavailable"
          : isCooldown
            ? "cooldown"
            : isAvailable
              ? "idle"
              : "error";
      setReward({
        amount: nextEnergy,
        nextAvailableAt,
        nextRewardKind,
        adsgramBlockId: adsState.adsgram_block_id,
        status,
        error: null
      });
    } catch (error) {
      console.info("daily-bonus: state_failed", error);
      setReward((current) => ({
        ...current,
        status: "error",
        error: "Не удалось загрузить бонус"
      }));
    }
  }, [hasSubscription]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const handleFocus = () => {
      void loadStatus();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadStatus();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadStatus]);

  useEffect(() => {
    if (debugAds) {
      refreshAdsDebug();
    }
  }, [debugAds, refreshAdsDebug]);

  const handleClaim = useCallback(async () => {
    if (processing) return;
    if (hasSubscription || reward.status === "unavailable" || reward.status === "cooldown") return;

    setProcessing(true);
    setReward((current) => ({ ...current, status: "loading_start", error: null }));

    try {
      const startResponse = await startEnergyRewardAd("reward");
      const responseRewardKind =
        startResponse.reward_kind === "daily_x2" || startResponse.reward_kind === "reward_regular"
          ? startResponse.reward_kind
          : reward.nextRewardKind;
      const expectedEnergy = normalizeRewardEnergy(responseRewardKind, startResponse.expected_energy ?? reward.amount ?? 1);
      const adsgramBlockId = startResponse.adsgram_block_id ?? reward.adsgramBlockId;

      setReward((current) => ({
        ...current,
        amount: expectedEnergy,
        nextRewardKind: responseRewardKind,
        adsgramBlockId,
        status: "ad_showing",
        error: null
      }));

      const adResult = await adsgram.showPrepared({
        blockId: adsgramBlockId,
        debug: debugAds,
        warmupMs: 650
      });
      refreshAdsDebug();
      if (!adResult.ok) {
        setReward((current) => ({
          ...current,
          status: "error",
          error: mapAdsgramError(adResult.error)
        }));
        return;
      }

      setReward((current) => ({ ...current, status: "claiming", error: null }));
      const completeResponse = await completeEnergyRewardAd({
        session_id: startResponse.session_id,
        ads_completed_increment: 1,
        provider_payload: {
          source: "adsgram_reward_home",
          event_detail: adResult.payload ?? null
        }
      });

      if (!completeResponse.success || completeResponse.energy_credited <= 0) {
        setReward((current) => ({
          ...current,
          status: "error",
          error: completeResponse.message || "Не удалось получить бонус"
        }));
        await loadStatus();
        return;
      }

      const awardedAmount = normalizeRewardEnergy(completeResponse.reward_kind, completeResponse.energy_credited);
      const nextAmount = normalizeRewardEnergy(completeResponse.next_reward_kind, 1);
      const nextAvailableAt = normalizeIso(completeResponse.reward_available_at);
      const hasCooldown = nextAvailableAt ? new Date(nextAvailableAt).getTime() > Date.now() + 1000 : false;
      setReward((current) => ({
        ...current,
        amount: nextAmount,
        nextAvailableAt,
        nextRewardKind: completeResponse.next_reward_kind,
        status: hasCooldown ? "cooldown" : "idle",
        error: null
      }));

      triggerHapticNotification("success");
      setRewardPulse(true);
      window.setTimeout(() => setRewardPulse(false), 700);
      setBonusDelta(awardedAmount);
      if (bonusDeltaTimerRef.current !== null) {
        window.clearTimeout(bonusDeltaTimerRef.current);
      }
      bonusDeltaTimerRef.current = window.setTimeout(() => {
        setBonusDelta(null);
        bonusDeltaTimerRef.current = null;
      }, BONUS_DELTA_BADGE_DURATION_MS);
      setBonusNotice({
        title: "Спасибо за помощь проекту",
        message: `Вам начислено +${awardedAmount} ⚡ энергии.`
      });

      if (onBonusClaimed) {
        await onBonusClaimed();
      }
      await loadStatus();
    } catch (err) {
      if (isCorsError(err)) {
        setReward((current) => ({
          ...current,
          status: "error",
          error: "Сервис недоступен, обновите приложение"
        }));
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        await loadStatus();
        return;
      }
      console.info("daily-bonus: request_failed", err);
      setReward((current) => ({ ...current, status: "error", error: "Не удалось получить бонус" }));
    } finally {
      setProcessing(false);
    }
  }, [adsgram, debugAds, hasSubscription, loadStatus, onBonusClaimed, processing, refreshAdsDebug, reward.adsgramBlockId, reward.amount, reward.status]);

  const title = "🎁 Ежедневная энергия";
  const promoX2Active = !hasSubscription && reward.nextRewardKind === "daily_x2" && reward.status !== "cooldown";
  const displayAmount = reward.amount ?? null;

  const countdownLabel = useMemo(() => {
    if (cooldownSeconds === null) return "";
    return formatCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  const actionLabel = useMemo(() => {
    if (hasSubscription || reward.status === "unavailable") return "Подписка активна";
    if (reward.status === "loading_start") return "Готовим бонус...";
    if (reward.status === "ad_showing") return "Загрузка рекламы...";
    if (reward.status === "claiming") return "Начисляем награду...";
    if (reward.status === "cooldown") return countdownLabel || "Доступно позже";
    const safeAmount = Math.max(1, displayAmount ?? 1);
    return `Забрать +${safeAmount} ⚡`;
  }, [countdownLabel, displayAmount, hasSubscription, reward.status]);

  return (
    <div className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--bg-card)]/80 p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
            {promoX2Active ? (
              <span className="inline-flex min-w-[74px] flex-col items-center rounded-full border border-amber-300/35 bg-amber-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100 leading-none">
                <span>x2</span>
                <span className="mt-1">сегодня</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {hasSubscription
              ? "Подписка активна — реклама отключена"
              : promoX2Active
                ? "Получите +2 ⚡ вместо +1 ⚡"
                : reward.status === "cooldown"
                  ? `Следующая награда через ${countdownLabel || "скоро"}`
                  : displayAmount !== null
                    ? `Смотри рекламу — получи +${displayAmount} ⚡`
                    : "Смотри рекламу — получи награду ⚡"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex min-w-[72px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-[var(--surface-chip-border)] bg-[var(--surface-chip-bg)] px-3 py-1 text-sm font-semibold text-[var(--accent-pink)] transition-all duration-500 ${
              rewardPulse ? "scale-110 border-emerald-300/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.45)]" : ""
            }`}
          >
            {displayAmount === null ? (
              <span className="inline-flex h-5 w-14 animate-pulse rounded-md bg-white/10 align-middle" />
            ) : (
              <>+{displayAmount} ⚡</>
            )}
          </span>
          {bonusDelta ? (
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 animate-pulse">
              +{bonusDelta} ⚡ начислено
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="rounded-full border border-[var(--surface-border)] bg-[var(--accent-pink)] px-5 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] shadow-[var(--surface-shadow-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface-chip-bg)] disabled:text-[var(--text-tertiary)]"
          onClick={handleClaim}
          disabled={
            processing ||
            hasSubscription ||
            reward.status === "unavailable" ||
            reward.status === "loading_start" ||
            reward.status === "ad_showing" ||
            reward.status === "claiming" ||
            reward.status === "cooldown"
          }
        >
          {actionLabel}
        </button>
        {reward.status === "error" && reward.error ? (
          <div className="flex items-center gap-2 text-xs text-[var(--accent-gold)]">
            <span>{reward.error}</span>
            <button
              type="button"
              className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-chip-bg)] px-2 py-1 text-[10px] text-[var(--text-secondary)]"
              onClick={() => void loadStatus()}
              disabled={processing}
            >
              Обновить
            </button>
          </div>
        ) : null}
      </div>

      {debugAds ? (
        <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-chip-bg)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
          <div>AdsGram blockId: {reward.adsgramBlockId ?? adsDebugState.blockId ?? "missing"}</div>
          <div>Reward kind: {reward.nextRewardKind ?? "n/a"}</div>
          <div>Controller: {adsDebugState.controllerReady ? "ready" : "missing"}</div>
          <div>Last event: {adsDebugState.lastEvent ?? "n/a"}</div>
          <div>
            Last error:{" "}
            {adsDebugState.lastError ? `${adsDebugState.lastError} ${adsDebugState.lastErrorDetail ?? ""}` : "n/a"}
          </div>
        </div>
      ) : null}

      {bonusNotice && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4">
              <div className="w-full max-w-md rounded-2xl border border-emerald-300/35 bg-[rgba(18,38,31,0.94)] p-4 shadow-[0_22px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{bonusNotice.title}</h3>
                    <p className="mt-1 text-sm text-white/80">{bonusNotice.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBonusNotice(null)}
                    className="rounded-full border border-white/20 p-1.5 text-white/75 transition hover:text-white"
                    aria-label="Закрыть уведомление"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => setBonusNotice(null)}>
                  Понятно
                </Button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
