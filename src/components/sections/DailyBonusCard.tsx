import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, claimDailyReward, startDailyReward } from "@/lib/api";
import { getRichAdsDebugInfo, initRichAds, showRichAds, type RichAdsError } from "@/lib/ads/richads";

const SKIP_ADS_FOR_PREMIUM = false;

type BonusStatus = "idle" | "loading_start" | "ad_showing" | "claiming" | "cooldown" | "error";

interface DailyBonusCardProps {
  hasSubscription: boolean;
  onBonusClaimed?: () => Promise<void> | void;
}

interface RewardState {
  rewardId: string | null;
  amount: number;
  expiresAt: string | null;
  nextAvailableAt: string | null;
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

function mapRichAdsError(error?: RichAdsError): string {
  switch (error) {
    case "tg_sdk_unavailable":
      return "Проверь VPN/время/сеть";
    case "richads_sdk_missing":
      return "Реклама сейчас недоступна";
    case "network_blocked":
      return "Отключи AdBlock/Private DNS";
    case "publisher_blocked":
      return "RichAds source/domain/appId не совпадают или WebApp URL указан неверно";
    case "ad_not_available":
    default:
      return "Инвентарь недоступен (видео может быть недоступно — проверь настройки interstitial video в кабинете)";
  }
}

export function DailyBonusCard({ hasSubscription, onBonusClaimed }: DailyBonusCardProps) {
  const [processing, setProcessing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [debugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debugAds") === "1";
  });
  const [reward, setReward] = useState<RewardState>({
    rewardId: null,
    amount: 0,
    expiresAt: null,
    nextAvailableAt: null,
    status: "idle",
    error: null
  });

  const shouldSkipAds = SKIP_ADS_FOR_PREMIUM && hasSubscription;

  useEffect(() => {
    void initRichAds().catch((error) => {
      console.info("daily-bonus: prewarm_failed", error);
    });
    const retryId = window.setTimeout(() => {
      void initRichAds().catch((error) => {
        console.info("daily-bonus: prewarm_retry_failed", error);
      });
    }, 400);

    if (reward.status !== "cooldown" || !reward.nextAvailableAt) {
      window.clearTimeout(retryId);
      setCooldownSeconds(null);
      return;
    }

    const tick = () => {
      const next = extractCooldownSeconds(reward.nextAvailableAt);
      setCooldownSeconds(next);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(retryId);
      window.clearInterval(interval);
    };
  }, [reward.nextAvailableAt, reward.status]);

  const waitForAdClose = useCallback(async () => {
    console.info("daily-bonus: wait_close");
    return new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", onFocus);
        window.clearTimeout(timeoutId);
        resolve();
      };
      const onVisibility = () => {
        if (!document.hidden) {
          finish();
        }
      };
      const onFocus = () => finish();
      const timeoutId = window.setTimeout(finish, 9000);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", onFocus);
    });
  }, []);

  const handleClaim = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    setReward((current) => ({ ...current, status: "loading_start", error: null }));

    try {
      console.info("daily-bonus: start");
      const startResponse = await startDailyReward();
      console.info("daily-bonus: start_response", startResponse);

      if (!startResponse.reward_id) {
        setReward((current) => ({
          ...current,
          rewardId: null,
          amount: startResponse.amount,
          expiresAt: startResponse.expires_at,
          nextAvailableAt: startResponse.next_available_at,
          status: "cooldown",
          error: null
        }));
        return;
      }

      setReward((current) => ({
        ...current,
        rewardId: startResponse.reward_id,
        amount: startResponse.amount,
        expiresAt: startResponse.expires_at,
        nextAvailableAt: startResponse.next_available_at,
        status: "ad_showing",
        error: null
      }));

      if (!shouldSkipAds) {
        console.info("daily-bonus: ad_loading");
        const adResult = await showRichAds();
        if (!adResult.ok) {
          console.info("daily-bonus: ad_failed", adResult);
          setReward((current) => ({
            ...current,
            status: "error",
            error: mapRichAdsError(adResult.error)
          }));
          return;
        }
        console.info("daily-bonus: ad_started");
        await waitForAdClose();
      }

      setReward((current) => ({ ...current, status: "claiming", error: null }));
      const claimResponse = await claimDailyReward({ reward_id: startResponse.reward_id });
      console.info("daily-bonus: claim_response", claimResponse);

      if (onBonusClaimed) {
        await onBonusClaimed();
      }

      setReward((current) => ({
        ...current,
        status: "cooldown",
        error: null
      }));
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
          setReward((current) => ({
            ...current,
            status: "cooldown",
            error: null
          }));
          return;
        }
      }

      console.info("daily-bonus: start_failed", err);
      setReward((current) => ({ ...current, status: "error", error: "Не удалось получить бонус" }));
    } finally {
      setProcessing(false);
    }
  }, [onBonusClaimed, processing, shouldSkipAds, waitForAdClose]);

  const title = "🎁 Ежедневная энергия";

  const countdownLabel = useMemo(() => {
    if (cooldownSeconds === null) return "";
    return formatCountdown(cooldownSeconds);
  }, [cooldownSeconds]);

  const actionLabel = useMemo(() => {
    if (reward.status === "loading_start") return "Готовим бонус...";
    if (reward.status === "ad_showing") return "Загрузка рекламы...";
    if (reward.status === "claiming") return "Проверяем награду...";
    if (reward.status === "cooldown") return countdownLabel || "Доступно позже";
    return "Забрать";
  }, [countdownLabel, reward.status]);

  const debugInfo = useMemo(() => {
    if (!debugEnabled) return null;
    return getRichAdsDebugInfo();
  }, [debugEnabled, reward.status]);

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
      {debugInfo ? (
        <div className="mt-3 rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-[var(--text-tertiary)]">
          <div>richads: pubId={debugInfo.pubId} appId={debugInfo.appId}</div>
          <div>origin: {debugInfo.origin}</div>
          <div>tg_webapp: {debugInfo.tgWebApp ? "ok" : "missing"}</div>
          <div>controller: {debugInfo.controllerPresent ? "ok" : "missing"}</div>
          <div>init: {debugInfo.initialized ? "ok" : "missing"}</div>
          <div>last_event: {debugInfo.lastEvent ?? "-"}</div>
          <div>last_error: {debugInfo.lastError ?? "-"}</div>
          <div>
            last_error_detail:{" "}
            {debugInfo.lastErrorDetail ? String(debugInfo.lastErrorDetail).slice(0, 120) : "-"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
