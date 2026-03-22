import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { ApiError, claimDailyBonus, getDailyBonusStatus, startDailyBonus } from "@/lib/api";
import { getAdsgramDebugState, type AdsgramError } from "@/lib/ads/adsgram";
import { useAdsgram } from "@/hooks/useAdsgram";
import { Button } from "@/components/ui/button";
import { triggerHapticNotification } from "@/lib/telegram";

type BonusStatus = "idle" | "loading_start" | "ad_showing" | "claiming" | "cooldown" | "error";

interface DailyBonusCardProps {
  hasSubscription: boolean;
  onBonusClaimed?: () => Promise<void> | void;
}

interface RewardState {
  amount: number | null;
  nextAvailableAt: string | null;
  rewardSessionId: string | null;
  rewardId: string | null;
  adsgramBlockId: string | null;
  status: BonusStatus;
  error: string | null;
}

interface BonusNotice {
  title: string;
  message: string;
}

const BONUS_DELTA_BADGE_DURATION_MS = 2400;

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
    rewardSessionId: null,
    rewardId: null,
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
      console.info("daily-bonus: status_load");
      const status = await getDailyBonusStatus();
      console.info("daily-bonus: status_loaded", status);
      const nextAvailableAt = normalizeNextAvailableAt(status.next_available_at, status.nextAvailableAt);
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);
      const amount = status.amount ?? 0;
      const rewarded = status.status === "rewarded" || Boolean(status.rewarded_at ?? status.rewardedAt);
      const isCooldown =
        status.status === "cooldown" ||
        rewarded ||
        (cooldownSeconds !== null && cooldownSeconds > 0);

      setReward((current) => ({
        ...current,
        amount,
        nextAvailableAt,
        rewardSessionId: null,
        rewardId: null,
        adsgramBlockId: null,
        status: isCooldown ? "cooldown" : "idle",
        error: null
      }));
    } catch (error) {
      console.info("daily-bonus: status_failed", error);
      setReward((current) => ({
        ...current,
        status: "error",
        error: "Не удалось загрузить бонус"
      }));
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (debugAds) {
      refreshAdsDebug();
    }
  }, [debugAds, refreshAdsDebug]);

  const handleClaim = useCallback(async () => {
    if (processing) return;
    console.info("daily-bonus: click_claim");
    setProcessing(true);
    setReward((current) => ({ ...current, status: "loading_start", error: null }));

    try {
      console.info("daily-bonus: start");
      const startResponse = await startDailyBonus();
      console.info("daily-bonus: start_response", startResponse);

      const rewardSessionId = normalizeRewardSessionId(
        startResponse.reward_session_id,
        startResponse.rewardSessionId
      );
      const rewardId = normalizeRewardId(startResponse.reward_id, startResponse.rewardId);
      const claimId = rewardSessionId ?? rewardId;
      const claimKey = rewardSessionId ? "reward_session_id" : rewardId ? "reward_id" : null;
      const nextAvailableAt = normalizeNextAvailableAt(
        startResponse.next_available_at,
        startResponse.nextAvailableAt
      );
      const amount = startResponse.amount ?? 0;
      const adsgramBlockId =
        startResponse.adsgram?.block_id ??
        startResponse.adsgram?.blockId ??
        startResponse.adsgram_block_id ??
        startResponse.adsgramBlockId ??
        null;
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);

      if (!claimId || (cooldownSeconds !== null && cooldownSeconds > 0)) {
        console.info("daily-bonus: start_cooldown", {
          reward_session_id: rewardSessionId,
          reward_id: rewardId,
          next_available_at: nextAvailableAt,
          cooldownSeconds
        });
        setReward((current) => ({
          ...current,
          amount,
          nextAvailableAt,
          rewardSessionId,
          rewardId,
          adsgramBlockId,
          status: cooldownSeconds && cooldownSeconds > 0 ? "cooldown" : claimId ? "idle" : "error",
          error: claimId ? null : "Бонус пока недоступен"
        }));
        return;
      }

      setReward({
        amount,
        nextAvailableAt,
        rewardSessionId,
        rewardId,
        adsgramBlockId,
        status: "ad_showing",
        error: null
      });
      console.info("daily-bonus: ad_show", { blockId: adsgramBlockId });

      console.info("daily-bonus: ad_preparing");
      const adResult = await adsgram.showPrepared({
        blockId: adsgramBlockId,
        debug: debugAds,
        warmupMs: 650
      });
      refreshAdsDebug();
      if (!adResult.ok) {
        console.info("daily-bonus: ad_error", adResult);
        refreshAdsDebug();
        const adErrorMessage = mapAdsgramError(adResult.error);
        setReward((current) => ({
          ...current,
          status: "error",
          error: adErrorMessage
        }));
        return;
      }
      console.info("daily-bonus: ad_closed", adResult.payload);

      setReward((current) => ({ ...current, status: "claiming", error: null }));
      console.info("daily-bonus: claim", { claimId, claimKey });
      const claimPayload =
        claimKey === "reward_id"
          ? { reward_id: claimId, ad_event_payload: adResult.payload ?? {} }
          : { reward_session_id: claimId, ad_event_payload: adResult.payload ?? {} };
      const claimResponse = await claimDailyBonus(claimPayload);
      console.info("daily-bonus: claim_response", claimResponse);
      const claimNextAvailableAt = normalizeNextAvailableAt(
        claimResponse.next_available_at,
        claimResponse.nextAvailableAt
      );
      const claimCooldownSeconds = extractCooldownSeconds(claimNextAvailableAt);
      const awardedAmount = Math.max(1, Number.isFinite(amount) ? amount : 1);
      setReward((current) => ({
        ...current,
        nextAvailableAt: claimNextAvailableAt ?? current.nextAvailableAt,
        rewardSessionId: null,
        rewardId: null,
        status: claimCooldownSeconds && claimCooldownSeconds > 0 ? "cooldown" : "idle",
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
      if (!claimNextAvailableAt) {
        await loadStatus();
      }
      if (onBonusClaimed) {
        await onBonusClaimed();
      }
      return;
    } catch (err) {
      if (isCorsError(err)) {
        console.info("daily-bonus: start_failed cors_blocked", err);
        setReward((current) => ({
          ...current,
          status: "error",
          error: "Сервис недоступен, обновите приложение"
        }));
        return;
      }

      if (err instanceof ApiError) {
        if (err.status === 400 && err.code === "reward_expired") {
          setReward((current) => ({
            ...current,
            status: "error",
            error: "Время вышло, попробуйте ещё раз"
          }));
          return;
        }
        if (err.status === 409 && err.code === "already_claimed_today") {
          void loadStatus();
          return;
        }
      }

      console.info("daily-bonus: request_failed", err);
      setReward((current) => ({ ...current, status: "error", error: "Не удалось получить бонус" }));
    } finally {
      setProcessing(false);
    }
  }, [adsgram, debugAds, loadStatus, onBonusClaimed, processing, refreshAdsDebug]);

  const title = "🎁 Ежедневная энергия";
  const promoX2Active = !hasSubscription && (reward.amount ?? 0) >= 2;
  const displayAmount = reward.amount ?? null;

  const countdownLabel = useMemo(() => {
    if (cooldownSeconds === null) return "";
    return formatCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  const actionLabel = useMemo(() => {
    if (hasSubscription) return "Подписка активна";
    if (reward.status === "loading_start") return "Готовим бонус...";
    if (reward.status === "ad_showing") return "Загрузка рекламы...";
    if (reward.status === "claiming") return "Начисляем награду...";
    if (reward.status === "cooldown") return countdownLabel || "Доступно позже";
    return "Забрать";
  }, [countdownLabel, hasSubscription, reward.status]);

  return (
    <div className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--bg-card)]/80 p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
            {promoX2Active ? (
              <span className="rounded-full border border-amber-300/35 bg-gradient-to-r from-amber-300/25 to-orange-300/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100 shadow-[0_6px_14px_rgba(245,158,11,0.25)]">
                x2 прямо сейчас
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {hasSubscription
              ? "Подписка активна — реклама отключена"
              : promoX2Active
                ? "Смотри рекламу прямо сейчас: +2 ⚡ вместо +1 ⚡"
                : displayAmount !== null
                  ? `Смотри рекламу — получи +${displayAmount} ⚡`
                  : "Смотри рекламу — получи награду ⚡"}
          </p>
          {promoX2Active ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-gradient-to-r from-amber-300/20 via-orange-300/15 to-rose-300/15 px-3 py-1 text-[11px] font-semibold text-amber-100">
              <span className="line-through opacity-80">+1 ⚡</span>
              <span>→</span>
              <span className="text-[var(--accent-gold)]">+2 ⚡</span>
              <span className="opacity-90">акция дня</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full border border-[var(--surface-chip-border)] bg-[var(--surface-chip-bg)] px-3 py-1 text-sm font-semibold text-[var(--accent-pink)] transition-all duration-500 ${
              rewardPulse ? "scale-110 border-emerald-300/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.45)]" : ""
            }`}
          >
            {displayAmount === null ? (
              <span className="inline-flex h-5 w-14 animate-pulse rounded-md bg-white/10 align-middle" />
            ) : promoX2Active ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-tertiary)] line-through">+1 ⚡</span>
                <span className="text-[var(--accent-gold)]">+{displayAmount} ⚡</span>
              </span>
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
              onClick={handleClaim}
              disabled={processing}
            >
              Повторить
            </button>
          </div>
        ) : null}
      </div>
      {debugAds ? (
        <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-chip-bg)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
          <div>AdsGram blockId: {reward.adsgramBlockId ?? adsDebugState.blockId ?? "missing"}</div>
          <div>Controller: {adsDebugState.controllerReady ? "ready" : "missing"}</div>
          <div>Last event: {adsDebugState.lastEvent ?? "n/a"}</div>
          <div>
            Last error:{" "}
            {adsDebugState.lastError ? `${adsDebugState.lastError} ${adsDebugState.lastErrorDetail ?? ""}` : "n/a"}
          </div>
        </div>
      ) : null}
      {bonusNotice ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-emerald-300/40 bg-[rgba(23,45,36,0.95)] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{bonusNotice.title}</h3>
              <button
                type="button"
                onClick={() => setBonusNotice(null)}
                className="rounded-full border border-white/20 p-2 text-white/75 transition hover:text-white"
                aria-label="Закрыть уведомление"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-white/80">{bonusNotice.message}</p>
            <Button className="mt-4 w-full" onClick={() => setBonusNotice(null)}>
              Закрыть
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
