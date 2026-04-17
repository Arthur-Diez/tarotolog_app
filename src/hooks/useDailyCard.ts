import { useCallback, useEffect, useRef, useState } from "react";

import { getDailyCardToday, type DailyCardTodayResponse } from "@/lib/api";

const PENDING_STATUSES = new Set(["pending", "queued", "processing"]);

export function useDailyCard() {
  const [dailyCard, setDailyCard] = useState<DailyCardTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const loadDailyCard = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    }
    clearPoll();
    try {
      const response = await getDailyCardToday();
      setDailyCard(response);
      setError(null);
      if (PENDING_STATUSES.has(response.status)) {
        pollTimerRef.current = window.setTimeout(() => {
          void loadDailyCard({ silent: true });
        }, 2500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить карту дня";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clearPoll]);

  useEffect(() => {
    void loadDailyCard();
    return () => {
      clearPoll();
    };
  }, [clearPoll, loadDailyCard]);

  return {
    dailyCard,
    loading,
    error,
    refresh: loadDailyCard
  };
}
