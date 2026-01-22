import { useCallback } from "react";

import { initAdsgramController, showAdsgramRewarded, type AdsgramInitOptions } from "@/lib/ads/adsgram";

export function useAdsgram() {
  const preload = useCallback(async (options: AdsgramInitOptions) => {
    await initAdsgramController(options);
  }, []);

  const show = useCallback(
    async (options: AdsgramInitOptions) => {
      return showAdsgramRewarded(options);
    },
    []
  );

  return { preload, show };
}
