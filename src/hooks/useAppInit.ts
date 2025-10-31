import { useEffect } from "react";

import { useAppState } from "@/stores/appState";

export function useAppInit() {
  const status = useAppState((state) => state.status);
  const user = useAppState((state) => state.user);
  const settings = useAppState((state) => state.settings);
  const error = useAppState((state) => state.error);
  const telegramUser = useAppState((state) => state.telegramUser);
  const initialize = useAppState((state) => state.initialize);

  useEffect(() => {
    if (status === "idle") {
      void initialize();
    }
  }, [initialize, status]);

  return {
    status,
    user,
    settings,
    error,
    telegramUser,
    retry: initialize
  };
}
