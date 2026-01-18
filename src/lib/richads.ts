const RICHADS_PUB_ID = "999441";
const RICHADS_APP_ID = "5734";

let initialized = false;
let initPromise: Promise<void> | null = null;

function log(event: "sdk_present" | "initialized_ok" | "initialized_skip" | "init_error", detail?: string) {
  const payload = detail ? ` ${detail}` : "";
  console.info(`[richads] ${event}${payload}`);
}

declare global {
  interface Window {
    TelegramAdsController?: {
      initialize: (options: { pubId: string; appId: string }) => void;
      show?: (options?: { containerId?: string }) => void;
      render?: (options?: { containerId?: string }) => void;
    };
  }
}

export async function initRichAds(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (initialized) {
    log("initialized_skip");
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      const controller = window.TelegramAdsController;
      if (!controller) {
        log("sdk_present", "false");
        return;
      }
      log("sdk_present", "true");

      window.Telegram?.WebApp?.ready?.();

      controller.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
      initialized = true;
      log("initialized_ok");
    } catch (error) {
      log("init_error", error instanceof Error ? error.message : "unknown");
    }
  })()
    .catch((error) => {
      log("init_error", error instanceof Error ? error.message : "unknown");
    })
    .finally(() => {
      if (!initialized) {
        initPromise = null;
      }
    });

  await initPromise;
}
