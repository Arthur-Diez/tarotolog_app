const RICHADS_PUB_ID = "999441";
const RICHADS_APP_ID = "5734";

let initialized = false;
let initPromise: Promise<TelegramAdsControllerInstance | null> | null = null;

function log(event: "sdk_present" | "initialized_ok" | "initialized_skip" | "init_error", detail?: string) {
  const payload = detail ? ` ${detail}` : "";
  console.info(`[richads] ${event}${payload}`);
}

type TelegramAdsControllerInstance = {
  initialize: (options: { pubId: string; appId: string }) => void;
  show?: (options?: { containerId?: string }) => void;
  render?: (options?: { containerId?: string }) => void;
};

type TelegramAdsControllerCtor = new () => TelegramAdsControllerInstance;

declare global {
  interface Window {
    TelegramAdsController?: TelegramAdsControllerCtor | TelegramAdsControllerInstance;
    __richadsController?: TelegramAdsControllerInstance;
  }
}

export async function initRichAds(): Promise<TelegramAdsControllerInstance | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (initialized && window.__richadsController) {
    log("initialized_skip");
    return window.__richadsController;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const Controller = window.TelegramAdsController;
      if (!Controller) {
        log("sdk_present", "false");
        return null;
      }
      log("sdk_present", "true");

      window.Telegram?.WebApp?.ready?.();

      const controller =
        typeof Controller === "function" ? new Controller() : (Controller as TelegramAdsControllerInstance);
      controller.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
      window.__richadsController = controller;
      initialized = true;
      log("initialized_ok");
      return controller;
    } catch (error) {
      log("init_error", error instanceof Error ? error.message : "unknown");
      return null;
    }
  })()
    .catch((error) => {
      log("init_error", error instanceof Error ? error.message : "unknown");
      return null;
    })
    .finally(() => {
      if (!initialized) {
        initPromise = null;
      }
    });

  return initPromise;
}
