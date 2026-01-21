type TelegramAdsControllerInstance = {
  initialize: (options: { pubId: string; appId: string }) => void;
  show?: () => Promise<unknown> | void;
};

type TelegramAdsControllerCtor = new () => TelegramAdsControllerInstance;

export type RichAdsError =
  | "tg_sdk_unavailable"
  | "richads_sdk_missing"
  | "network_blocked"
  | "ad_not_available";

type RichAdsResult = { ok: boolean; payload?: unknown; error?: RichAdsError; detail?: unknown };

const RICHADS_PUB_ID = "999441";
const RICHADS_APP_ID = "5823";

let controllerInstance: TelegramAdsControllerInstance | null = null;
let initPromise: Promise<TelegramAdsControllerInstance | null> | null = null;

function log(event: string, detail?: unknown) {
  if (detail !== undefined) {
    console.info(`[richads] ${event}`, detail);
  } else {
    console.info(`[richads] ${event}`);
  }
}

function getTelegramWebApp(): unknown {
  if (typeof window === "undefined") return null;
  return (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp ?? null;
}

function getControllerConstructor(): TelegramAdsControllerCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as Window & { TelegramAdsController?: TelegramAdsControllerCtor }).TelegramAdsController;
  return ctor ?? null;
}

async function waitForControllerReady(timeoutMs = 3000, tickMs = 200): Promise<TelegramAdsControllerCtor | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const ctor = getControllerConstructor();
    if (ctor) {
      return ctor;
    }
    await new Promise((resolve) => window.setTimeout(resolve, tickMs));
  }
  return null;
}

async function waitForSdk(): Promise<TelegramAdsControllerCtor | null> {
  const startedAt = Date.now();
  const timeoutMs = 5000;
  const tickMs = 200;

  while (Date.now() - startedAt < timeoutMs) {
    const ctor = getControllerConstructor();
    if (ctor) {
      return ctor;
    }
    await new Promise((resolve) => window.setTimeout(resolve, tickMs));
  }
  return null;
}

export async function initRichAds(): Promise<TelegramAdsControllerInstance | null> {
  log("tg_webapp", getTelegramWebApp() ? "present" : "missing");
  log("ads_controller", getControllerConstructor() ? "present" : "missing");
  if (controllerInstance) {
    log("initialized_skip");
    return controllerInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const ctor = await waitForSdk();
    if (!ctor) {
      log("sdk_missing");
      return null;
    }

    const instance = new ctor();
    instance.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
    controllerInstance = instance;
    log("initialized_ok");
    return instance;
  })().catch((error) => {
    log("init_error", error);
    return null;
  });

  return initPromise;
}

export async function showRichAds(): Promise<RichAdsResult> {
  try {
    const hasTg = Boolean(getTelegramWebApp());
    log("tg_webapp", hasTg ? "present" : "missing");
    if (!hasTg) {
      return { ok: false, error: "tg_sdk_unavailable" };
    }

    const ctor = await waitForControllerReady(3500, 250);
    if (!ctor) {
      log("controller_missing");
      return { ok: false, error: "richads_sdk_missing" };
    }

    const controller = await initRichAds();
    if (!controller || typeof controller.show !== "function") {
      log("show_unavailable");
      return { ok: false, error: "richads_sdk_missing" };
    }

    const attempts = 3;
    for (let i = 1; i <= attempts; i += 1) {
      log("show_attempt", i);
      try {
        const result = controller.show();
        if (result && typeof (result as Promise<unknown>).then === "function") {
          const payload = await result;
          log("show_resolved", payload);
          return { ok: true, payload };
        }
        log("show_called");
        return { ok: true };
      } catch (error) {
        log("show_failed_attempt", error);
        if (i < attempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
      }
    }

    return { ok: false, error: "ad_not_available" };
  } catch (error) {
    log("show_failed", error);
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.includes("403") || message.includes("publisher-config")) {
      return { ok: false, error: "ad_not_available", detail: error };
    }
    if (message.includes("Load failed") || message.includes("NetworkError")) {
      return { ok: false, error: "network_blocked", detail: error };
    }
    return { ok: false, error: "ad_not_available", detail: error };
  }
}
