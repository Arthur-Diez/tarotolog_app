import { useCallback } from "react";

import {
  getAdsgramDebugState,
  initAdsgramController,
  showAdsgramRewarded,
  type AdsgramInitOptions
} from "@/lib/ads/adsgram";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

type ShowPreparedOptions = AdsgramInitOptions & {
  warmupMs?: number;
};

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

  const showPrepared = useCallback(
    async (options: ShowPreparedOptions) => {
      const warmupMs = Math.max(0, options.warmupMs ?? 450);
      const before = getAdsgramDebugState();
      const targetBlockId = options.blockId?.trim() ?? null;
      const needsWarmup =
        !before.controllerReady || (Boolean(targetBlockId) && before.blockId !== targetBlockId);
      const startedAt = Date.now();

      await initAdsgramController(options);

      if (needsWarmup && warmupMs > 0) {
        const elapsed = Date.now() - startedAt;
        const remaining = warmupMs - elapsed;
        if (remaining > 0) {
          await wait(remaining);
        }
      }

      return showAdsgramRewarded(options);
    },
    []
  );

  return { preload, show, showPrepared };
}
