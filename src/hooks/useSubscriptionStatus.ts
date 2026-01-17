import { useCallback, useEffect, useRef, useState } from "react";

import { getSubscriptionStatus, type SubscriptionStatusResponse } from "@/lib/api";

let cachedStatus: SubscriptionStatusResponse | null = null;
let inflightRequest: Promise<SubscriptionStatusResponse> | null = null;

interface SubscriptionState {
  loading: boolean;
  data: SubscriptionStatusResponse | null;
  error: string | null;
}

async function requestSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  if (!inflightRequest) {
    inflightRequest = getSubscriptionStatus()
      .then((response) => {
        cachedStatus = response;
        return response;
      })
      .finally(() => {
        inflightRequest = null;
      });
  }
  return inflightRequest;
}

export function useSubscriptionStatus() {
  const [state, setState] = useState<SubscriptionState>({
    loading: cachedStatus === null,
    data: cachedStatus,
    error: null
  });
  const retryRef = useRef(false);

  const fetchStatus = useCallback(async (force = false) => {
    if (cachedStatus && !force) {
      setState({ loading: false, data: cachedStatus, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await requestSubscriptionStatus();
      setState({ loading: false, data: response, error: null });
    } catch (error) {
      if (!retryRef.current) {
        retryRef.current = true;
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        return fetchStatus(true);
      }
      const message = error instanceof Error ? error.message : "Не удалось получить статус подписки";
      setState({ loading: false, data: null, error: message });
    }
  }, []);

  useEffect(() => {
    void fetchStatus(false);
  }, [fetchStatus]);

  const refetch = useCallback(async () => {
    cachedStatus = null;
    retryRef.current = false;
    await fetchStatus(true);
  }, [fetchStatus]);

  return {
    hasSubscription: state.data?.has_subscription ?? false,
    loading: state.loading,
    planCode: state.data?.plan_code ?? null,
    endsAt: state.data?.ends_at ?? null,
    error: state.error,
    refetch
  };
}
