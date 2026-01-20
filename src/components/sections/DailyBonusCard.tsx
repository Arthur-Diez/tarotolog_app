import { useCallback, useEffect, useMemo, useState } from "react";

import {
  completeDailyBonus,
  getDailyBonusStatus,
  startDailyBonus,
  type DailyBonusStartResponse,
  type DailyBonusStatusResponse
} from "@/lib/api";
import { showInterstitialVideo, showPushStyle } from "@/lib/ads/richads";

const SKIP_ADS_FOR_PREMIUM = true;

interface DailyBonusCardProps {
  hasSubscription: boolean;
  onBonusClaimed?: () => Promise<void> | void;
}

interface BonusState {
  canClaim: boolean;
  nextClaimInSec: number;
  energyAward: number;
}

function toBonusState(status: DailyBonusStatusResponse): BonusState {
  return {
    canClaim: status.can_claim,
    nextClaimInSec: status.next_claim_in_sec,
    energyAward: status.energy_award
  };
}

function toBonusStateFromStart(status: DailyBonusStartResponse): BonusState {
  return {
    canClaim: status.can_claim,
    nextClaimInSec: status.next_claim_in_sec,
    energyAward: status.energy_award ?? 0
  };
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function DailyBonusCard({ hasSubscription, onBonusClaimed }: DailyBonusCardProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bonus, setBonus] = useState<BonusState | null>(null);

  const isPremium = hasSubscription;
  const shouldSkipAds = SKIP_ADS_FOR_PREMIUM && isPremium;

  const refreshStatus = useCallback(async () => {
    setError(null);
    try {
      console.info("daily-bonus: status_fetch");
      const status = await getDailyBonusStatus();
      setBonus(toBonusState(status));
    } catch (err) {
      console.info("daily-bonus: status_error", err);
      setError("Не удалось загрузить бонус");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!bonus || bonus.canClaim || bonus.nextClaimInSec <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setBonus((current) => {
        if (!current) return current;
        const next = Math.max(0, current.nextClaimInSec - 1);
        if (next === 0) {
          return { ...current, nextClaimInSec: 0, canClaim: true };
        }
        return { ...current, nextClaimInSec: next };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [bonus]);

  const handleClaim = useCallback(async () => {
    if (!bonus || processing) return;
    setProcessing(true);
    setError(null);

    try {
      console.info("daily-bonus: start");
      const startResponse = await startDailyBonus();
      const startState = toBonusStateFromStart(startResponse);
      setBonus(startState);

      if (!startResponse.can_claim || !startResponse.session_id) {
        console.info("daily-bonus: not_available");
        return;
      }

      if (shouldSkipAds) {
        console.info("daily-bonus: skip_ads");
        await completeDailyBonus({
          session_id: startResponse.session_id,
          ad_payload: { skipped: true, reason: "premium" }
        });
        if (onBonusClaimed) {
          await onBonusClaimed();
        }
        await refreshStatus();
        return;
      }

      console.info("daily-bonus: ad_interstitial");
      const videoResult = await showInterstitialVideo();
      if (!videoResult.ok) {
        console.info("daily-bonus: ad_interstitial_failed", videoResult.error);
        console.info("daily-bonus: ad_push");
        const pushResult = await showPushStyle();
        if (!pushResult.ok) {
          console.info("daily-bonus: ad_push_failed", pushResult.error);
          setError("Реклама недоступна, попробуйте позже");
          return;
        }
        await completeDailyBonus({
          session_id: startResponse.session_id,
          ad_payload: pushResult.payload
        });
      } else {
        await completeDailyBonus({
          session_id: startResponse.session_id,
          ad_payload: videoResult.payload
        });
      }

      if (onBonusClaimed) {
        await onBonusClaimed();
      }
      await refreshStatus();
    } catch (err) {
      console.info("daily-bonus: error", err);
      setError("Не удалось получить бонус");
    } finally {
      setProcessing(false);
    }
  }, [bonus, onBonusClaimed, processing, refreshStatus, shouldSkipAds]);

  const title = "🎁 Ежедневная энергия";

  const countdownLabel = useMemo(() => {
    if (!bonus) return "";
    return formatCountdown(bonus.nextClaimInSec);
  }, [bonus]);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="h-[88px] w-full animate-pulse rounded-[18px] border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!bonus) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Сначала короткая реклама, затем начислим энергию.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-[var(--accent-pink)]">
          +{bonus.energyAward} ⚡
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="rounded-full bg-[var(--accent-pink)] px-5 py-2 text-sm font-semibold text-[#1b111b] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[var(--text-tertiary)]"
          onClick={handleClaim}
          disabled={processing || !bonus.canClaim}
        >
          {bonus.canClaim ? "Забрать" : countdownLabel}
        </button>
        {error ? (
          <span className="text-xs text-[var(--accent-gold)]">{error}</span>
        ) : null}
      </div>
    </div>
  );
}
