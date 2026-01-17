import { useEffect, useState } from "react";

import { getSubscriptionStatus, type SubscriptionStatusResponse } from "@/lib/api";

let cachedStatus: SubscriptionStatusResponse | null = null;
let inflightRequest: Promise<SubscriptionStatusResponse> | null = null;

interface SubscriptionState {
  loading: boolean;
  data: SubscriptionStatusResponse | null;
}

export function useSubscriptionStatus() {
  const [state, setState] = useState<SubscriptionState>({
    loading: cachedStatus === null,
    data: cachedStatus
  });

  useEffect(() => {
    let cancelled = false;

    if (cachedStatus) {
      setState({ loading: false, data: cachedStatus });
      return;
    }

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

    setState((prev) => ({ ...prev, loading: true }));

    inflightRequest
      .then((response) => {
        if (!cancelled) {
          setState({ loading: false, data: response });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ loading: false, data: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    hasSubscription: state.data?.has_subscription ?? false,
    loading: state.loading,
    planCode: state.data?.plan_code ?? null,
    endsAt: state.data?.ends_at ?? null
  };
}
