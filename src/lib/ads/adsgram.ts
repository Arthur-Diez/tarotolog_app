type AdsgramSDK = {
  init: (options: { blockId: string }) => AdsgramController;
};

type AdsgramController = {
  show: () => Promise<unknown>;
};

type AdResult = { ok: boolean; payload?: unknown; error?: unknown };

const DEFAULT_REWARD_BLOCK_ID = "21501";
const resolveRewardBlockId = () => {
  const raw =
    (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_REWARD_BLOCK_ID ??
    DEFAULT_REWARD_BLOCK_ID;
  const normalized = raw.trim();
  if (normalized.startsWith("int-")) {
    return normalized;
  }
  const digits = normalized.match(/\d+/)?.[0];
  if (digits) {
    return digits;
  }
  return DEFAULT_REWARD_BLOCK_ID;
};

let adsgramController: AdsgramController | null = null;
let adsgramReadyPromise: Promise<void> | null = null;

function getAdsgram(): AdsgramSDK | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { Adsgram?: AdsgramSDK }).Adsgram ?? null;
}

export async function ensureAdsgramLoaded(): Promise<void> {
  if (adsgramReadyPromise) {
    return adsgramReadyPromise;
  }

  adsgramReadyPromise = new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 6000;
    const tickMs = 200;

    const check = () => {
      const sdk = getAdsgram();
      if (sdk?.init) {
        console.info("adsgram: sdk_ready");
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        console.info("adsgram: sdk_timeout");
        reject(new Error("Adsgram SDK not available"));
        return;
      }
      window.setTimeout(check, tickMs);
    };

    check();
  });

  return adsgramReadyPromise;
}

function getRewardController(): AdsgramController | null {
  const sdk = getAdsgram();
  if (!sdk?.init) {
    return null;
  }
  if (!adsgramController) {
    const blockId = resolveRewardBlockId();
    console.info("adsgram: init", blockId);
    adsgramController = sdk.init({ blockId });
  }
  return adsgramController;
}

export async function showAdsgramReward(): Promise<AdResult> {
  try {
    await ensureAdsgramLoaded();
    const controller = getRewardController();
    if (!controller) {
      return { ok: false, error: "controller_unavailable" };
    }
    console.info("adsgram: show_reward");
    const result = await controller.show();
    return { ok: true, payload: result };
  } catch (error) {
    console.info("adsgram: show_failed", error);
    return { ok: false, error };
  }
}
