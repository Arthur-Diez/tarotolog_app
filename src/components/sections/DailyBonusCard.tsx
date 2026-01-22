import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, claimDailyBonus, getDailyBonusStatus, startDailyBonus } from "@/lib/api";
import { getAdsgramDebugState, type AdsgramError } from "@/lib/ads/adsgram";
import { useAdsgram } from "@/hooks/useAdsgram";

type BonusStatus = "idle" | "loading_start" | "ad_showing" | "claiming" | "cooldown" | "error";

interface DailyBonusCardProps {
  hasSubscription: boolean;
  onBonusClaimed?: () => Promise<void> | void;
}

interface RewardState {
  amount: number;
  nextAvailableAt: string | null;
  rewardSessionId: string | null;
  adsgramBlockId: string | null;
  status: BonusStatus;
  error: string | null;
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

function normalizeNextAvailableAt(value?: string | null, fallback?: string | null): string | null {
  const resolved = value ?? fallback ?? null;
  return resolved && resolved.length > 0 ? resolved : null;
}

function normalizeRewardSessionId(value?: string | null, fallback?: string | null): string | null {
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
      return "Реклама сейчас недоступна";
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
  const [reward, setReward] = useState<RewardState>({
    amount: 0,
    nextAvailableAt: null,
    rewardSessionId: null,
    adsgramBlockId: null,
    status: "idle",
    error: null
  });

  const adsgram = useAdsgram();
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
      const nextAvailableAt = normalizeNextAvailableAt(
        startResponse.next_available_at,
        startResponse.nextAvailableAt
      );
      const amount = startResponse.amount ?? 0;
      const adsgramBlockId = startResponse.adsgram?.block_id ?? startResponse.adsgram?.blockId ?? null;
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);

      if (!rewardSessionId || (cooldownSeconds !== null && cooldownSeconds > 0)) {
        console.info("daily-bonus: start_cooldown", {
          reward_session_id: rewardSessionId,
          next_available_at: nextAvailableAt,
          cooldownSeconds
        });
        setReward((current) => ({
          ...current,
          amount,
          nextAvailableAt,
          rewardSessionId,
          adsgramBlockId,
          status: cooldownSeconds && cooldownSeconds > 0 ? "cooldown" : "idle",
          error: rewardSessionId ? null : "Бонус пока недоступен"
        }));
        return;
      }

      setReward({
        amount,
        nextAvailableAt,
        rewardSessionId,
        adsgramBlockId,
        status: "ad_showing",
        error: null
      });
      console.info("daily-bonus: ad_show", { blockId: adsgramBlockId });

      console.info("daily-bonus: ad_showing");
      const adResult = await adsgram.show({
        blockId: adsgramBlockId,
        debug: debugAds
      });
      refreshAdsDebug();
      if (!adResult.ok) {
        console.info("daily-bonus: ad_error", adResult);
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
      console.info("daily-bonus: claim", { rewardSessionId });
      const claimResponse = await claimDailyBonus({ reward_session_id: rewardSessionId });
      console.info("daily-bonus: claim_response", claimResponse);
      const claimNextAvailableAt = normalizeNextAvailableAt(
        claimResponse.next_available_at,
        claimResponse.nextAvailableAt
      );
      const claimCooldownSeconds = extractCooldownSeconds(claimNextAvailableAt);
      setReward((current) => ({
        ...current,
        nextAvailableAt: claimNextAvailableAt ?? current.nextAvailableAt,
        rewardSessionId: null,
        status: claimCooldownSeconds && claimCooldownSeconds > 0 ? "cooldown" : "idle",
        error: null
      }));
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

  const countdownLabel = useMemo(() => {
    if (cooldownSeconds === null) return "";
    return formatCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  const actionLabel = useMemo(() => {
    if (reward.status === "loading_start") return "Готовим бонус...";
    if (reward.status === "ad_showing") return "Загрузка рекламы...";
    if (reward.status === "claiming") return "Начисляем награду...";
    if (reward.status === "cooldown") return countdownLabel || "Доступно позже";
    return "Забрать";
  }, [countdownLabel, reward.status]);

  return (
    <div className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Смотри рекламу — получи +{reward.amount || 0} ⚡
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-[var(--accent-pink)]">
          +{reward.amount || 0} ⚡
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="rounded-full bg-[var(--accent-pink)] px-5 py-2 text-sm font-semibold text-[#1b111b] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[var(--text-tertiary)]"
          onClick={handleClaim}
          disabled={
            processing ||
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
              className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[var(--text-secondary)]"
              onClick={handleClaim}
              disabled={processing}
            >
              Повторить
            </button>
          </div>
        ) : null}
      </div>
      {debugAds ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
          <div>AdsGram blockId: {reward.adsgramBlockId ?? adsDebugState.blockId ?? "missing"}</div>
          <div>Controller: {adsDebugState.controllerReady ? "ready" : "missing"}</div>
          <div>Last event: {adsDebugState.lastEvent ?? "n/a"}</div>
          <div>
            Last error:{" "}
            {adsDebugState.lastError ? `${adsDebugState.lastError} ${adsDebugState.lastErrorDetail ?? ""}` : "n/a"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
