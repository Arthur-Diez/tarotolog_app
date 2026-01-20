const RICHADS_PUB_ID = "999441";
const RICHADS_APP_ID = "5734";

let initialized = false;
let initPromise: Promise<TelegramAdsControllerInstance | null> | null = null;
const CONTROLLER_WAIT_MS = 4000;
const CONTROLLER_POLL_MS = 200;

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
    __richadsInitialized?: boolean;
  }
}

async function waitForController(): Promise<TelegramAdsControllerInstance | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < CONTROLLER_WAIT_MS) {
    const controller = window.__richadsController ?? window.TelegramAdsController;
    if (controller && typeof controller !== "function") {
      return controller as TelegramAdsControllerInstance;
    }
    await new Promise((resolve) => window.setTimeout(resolve, CONTROLLER_POLL_MS));
  }
  return null;
}

export async function initRichAds(): Promise<TelegramAdsControllerInstance | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.__richadsInitialized && window.__richadsController) {
    log("initialized_skip");
    return window.__richadsController;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const existing = await waitForController();
      if (existing) {
        log("sdk_present", "true");
        window.__richadsController = existing;
        initialized = true;
        log("initialized_ok");
        return existing;
      }

      const Controller = window.TelegramAdsController;
      if (!Controller) {
        log("sdk_present", "false");
        return null;
      }
      log("sdk_present", "true");

      const tgStart = Date.now();
      while (!window.Telegram?.WebApp && Date.now() - tgStart < 3000) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }
      window.Telegram?.WebApp?.ready?.();

      const controller =
        typeof Controller === "function" ? new Controller() : (Controller as TelegramAdsControllerInstance);
      if (!window.__richadsInitialized) {
        controller.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
        window.__richadsInitialized = true;
      }
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
