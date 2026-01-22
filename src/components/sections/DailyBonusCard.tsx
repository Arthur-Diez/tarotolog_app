import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, getDailyBonusStatus, startDailyBonus } from "@/lib/api";
import { type AdsgramError } from "@/lib/ads/adsgram";
import { useAdsgram } from "@/hooks/useAdsgram";

const SKIP_ADS_FOR_PREMIUM = false;

type BonusStatus = "idle" | "loading_start" | "ad_showing" | "waiting_reward" | "cooldown" | "error";

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

function mapAdsgramError(error?: AdsgramError): string {
  switch (error) {
    case "tg_sdk_unavailable":
      return "Проверь VPN/время/сеть";
    case "sdk_missing":
    case "controller_missing":
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
  const [reward, setReward] = useState<RewardState>({
    amount: 0,
    nextAvailableAt: null,
    rewardSessionId: null,
    adsgramBlockId: null,
    status: "idle",
    error: null
  });

  const shouldSkipAds = SKIP_ADS_FOR_PREMIUM && hasSubscription;
  const adsgram = useAdsgram();

  useEffect(() => {
    void adsgram.preload({}).catch((error) => {
      console.info("daily-bonus: prewarm_failed", error);
    });
    const retryId = window.setTimeout(() => {
      void adsgram.preload({}).catch((error) => {
        console.info("daily-bonus: prewarm_retry_failed", error);
      });
    }, 400);

    return () => {
      window.clearTimeout(retryId);
    };
  }, [adsgram]);

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
      const status = await getDailyBonusStatus();
      const nextAvailableAt = status.next_available_at ?? null;
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);
      const amount = status.amount ?? 0;
      const rewarded = status.status === "rewarded" || Boolean(status.rewarded_at);
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

  const pollRewardStatus = useCallback(
    async (fallbackAmount: number) => {
      const attempts = 8;
      const intervalMs = 1000;

      console.info("daily-bonus: status_poll_start");
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const status = await getDailyBonusStatus();
          console.info("daily-bonus: status_poll", { attempt, status });
          const nextAvailableAt = status.next_available_at ?? null;
          const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);
          const amount = status.amount ?? fallbackAmount;
          const rewarded = status.status === "rewarded" || Boolean(status.rewarded_at);
          const cooldown =
            status.status === "cooldown" || (cooldownSeconds !== null && cooldownSeconds > 0);

          if (rewarded || cooldown) {
            setReward((current) => ({
              ...current,
              amount,
              nextAvailableAt,
              rewardSessionId: null,
              adsgramBlockId: null,
              status: cooldown ? "cooldown" : "idle",
              error: null
            }));
            if (rewarded && onBonusClaimed) {
              await onBonusClaimed();
            }
            return { rewarded: true };
          }
        } catch (error) {
          console.info("daily-bonus: status_poll_error", error);
        }

        if (attempt < attempts) {
          await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
        }
      }

      console.info("daily-bonus: status_poll_timeout");
      return { rewarded: false };
    },
    [onBonusClaimed]
  );

  const handleClaim = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    setReward((current) => ({ ...current, status: "loading_start", error: null }));

    try {
      console.info("daily-bonus: start");
      const startResponse = await startDailyBonus();
      console.info("daily-bonus: start_response", startResponse);

      const nextAvailableAt = startResponse.next_available_at ?? null;
      const amount = startResponse.amount ?? 0;
      const adsgramBlockId = startResponse.adsgram?.block_id ?? null;
      const cooldownSeconds = extractCooldownSeconds(nextAvailableAt);

      if (!startResponse.reward_session_id || (cooldownSeconds !== null && cooldownSeconds > 0)) {
        setReward((current) => ({
          ...current,
          amount,
          nextAvailableAt,
          rewardSessionId: startResponse.reward_session_id,
          adsgramBlockId,
          status: cooldownSeconds && cooldownSeconds > 0 ? "cooldown" : "idle",
          error: null
        }));
        return;
      }

      setReward({
        amount,
        nextAvailableAt,
        rewardSessionId: startResponse.reward_session_id,
        adsgramBlockId,
        status: "ad_showing",
        error: null
      });

      let adErrorMessage: string | null = null;
      if (shouldSkipAds) {
        console.info("daily-bonus: ads_skipped");
      } else {
        console.info("daily-bonus: ad_loading");
        const adResult = await adsgram.show({
          blockId: adsgramBlockId,
          debug: false
        });
        if (!adResult.ok) {
          console.info("daily-bonus: ad_failed", adResult);
          adErrorMessage = mapAdsgramError(adResult.error);
        } else {
          console.info("daily-bonus: ad_closed", adResult.payload);
        }
      }

      setReward((current) => ({ ...current, status: "waiting_reward", error: null }));
      const pollResult = await pollRewardStatus(amount);
      if (!pollResult.rewarded) {
        const fallbackError = "Не пришло подтверждение. Нажми 'Проверить'";
        setReward((current) => ({
          ...current,
          status: "error",
          error: adErrorMessage ?? fallbackError
        }));
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

      console.info("daily-bonus: start_failed", err);
      setReward((current) => ({ ...current, status: "error", error: "Не удалось получить бонус" }));
    } finally {
      setProcessing(false);
    }
  }, [adsgram, loadStatus, pollRewardStatus, processing, shouldSkipAds]);

  const title = "🎁 Ежедневная энергия";

  const countdownLabel = useMemo(() => {
    if (cooldownSeconds === null) return "";
    return formatCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  const actionLabel = useMemo(() => {
    if (reward.status === "loading_start") return "Готовим бонус...";
    if (reward.status === "ad_showing") return "Загрузка рекламы...";
    if (reward.status === "waiting_reward") return "Проверяем награду...";
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
            reward.status === "waiting_reward" ||
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
              Проверить
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
