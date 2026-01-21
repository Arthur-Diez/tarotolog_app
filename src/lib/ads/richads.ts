type TelegramAdsControllerInstance = {
  initialize: (options: { pubId: string; appId: string; debug?: boolean }) => void;
  show?: () => Promise<unknown> | void;
  triggerNativeNotification?: (immediate?: boolean) => Promise<unknown>;
};

type TelegramAdsControllerCtor = new () => TelegramAdsControllerInstance;

export type RichAdsError =
  | "tg_sdk_unavailable"
  | "richads_sdk_missing"
  | "network_blocked"
  | "publisher_blocked"
  | "ad_not_available";

type RichAdsResult = { ok: boolean; payload?: unknown; error?: RichAdsError; detail?: unknown };

const RICHADS_PUB_ID = "999441";
const RICHADS_APP_ID = "5823";
const RICHADS_INIT_TIMEOUT_MS = 6000;
const RICHADS_READY_TICK_MS = 250;
const RICHADS_SHOW_ATTEMPTS = 3;
const RICHADS_SHOW_RETRY_MS = 600;
const TG_SDK_WAIT_MS = 1500;
const RICHADS_START_DETECT_MS = 700;

let controllerInstance: TelegramAdsControllerInstance | null = null;
let initPromise: Promise<TelegramAdsControllerInstance | null> | null = null;
let lastEvent: string | null = null;
let lastError: RichAdsError | null = null;
let lastErrorDetail: unknown;

function log(event: string, detail?: unknown) {
  lastEvent = event;
  if (detail !== undefined) {
    console.info(`[richads] ${event}`, detail);
  } else {
    console.info(`[richads] ${event}`);
  }
}

export function getRichAdsDebugInfo() {
  if (typeof window === "undefined") {
    return {
      pubId: RICHADS_PUB_ID,
      appId: RICHADS_APP_ID,
      origin: "unknown",
      tgWebApp: false,
      controllerPresent: false,
      initialized: false,
      lastEvent,
      lastError,
      lastErrorDetail
    };
  }

  const win = window as Window & {
    Telegram?: { WebApp?: unknown };
    TelegramAdsController?: TelegramAdsControllerCtor;
    __richadsController?: TelegramAdsControllerInstance;
  };

  return {
    pubId: RICHADS_PUB_ID,
    appId: RICHADS_APP_ID,
    origin: window.location.origin,
    tgWebApp: Boolean(win.Telegram?.WebApp),
    controllerPresent: Boolean(win.TelegramAdsController),
    initialized: Boolean(controllerInstance || win.__richadsController),
    lastEvent,
    lastError,
    lastErrorDetail
  };
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

async function waitForTelegramWebApp(timeoutMs = TG_SDK_WAIT_MS): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (getTelegramWebApp()) {
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return Boolean(getTelegramWebApp());
}

async function waitForSdk(): Promise<TelegramAdsControllerCtor | null> {
  const startedAt = Date.now();
  const timeoutMs = RICHADS_INIT_TIMEOUT_MS;
  const tickMs = RICHADS_READY_TICK_MS;

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
  if (typeof window !== "undefined") {
    const win = window as Window & { __richadsController?: TelegramAdsControllerInstance };
    if (win.__richadsController) {
      controllerInstance = win.__richadsController;
      log("initialized_from_global");
      return controllerInstance;
    }
  }
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
    log("init_config", {
      pubId: RICHADS_PUB_ID,
      appId: RICHADS_APP_ID,
      origin: typeof window !== "undefined" ? window.location.origin : "unknown"
    });
    instance.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID });
    controllerInstance = instance;
    if (typeof window !== "undefined") {
      const win = window as Window & { __richadsController?: TelegramAdsControllerInstance };
      win.__richadsController = instance;
    }
    log("initialized_ok");
    return instance;
  })().catch((error) => {
    log("init_error", error);
    return null;
  });

  return initPromise;
}

async function detectAdStarted(timeoutMs = RICHADS_START_DETECT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;

    const finish = (started: boolean) => {
      if (done) return;
      done = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.clearTimeout(timeoutId);
      resolve(started);
    };

    const onVisibilityChange = () => {
      if (document.hidden) finish(true);
    };

    const onBlur = () => {
      // blur может быть не от рекламы, поэтому подтверждаем через document.hidden
      setTimeout(() => {
        if (document.hidden) finish(true);
      }, 0);
    };

    const timeoutId = window.setTimeout(() => finish(false), timeoutMs);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
  });
}

export async function showRichAds(): Promise<RichAdsResult> {
  try {
    const hasTgInitial = Boolean(getTelegramWebApp());
    log("tg_webapp_initial", hasTgInitial ? "present" : "missing");

    const hasTg = hasTgInitial || (await waitForTelegramWebApp());
    log("tg_webapp_ready", hasTg ? "present" : "missing");

    if (!hasTg) {
      lastError = "tg_sdk_unavailable";
      lastErrorDetail = undefined;
      return { ok: false, error: "tg_sdk_unavailable" };
    }

    log("controller_initial", getControllerConstructor() ? "present" : "missing");

    const ctor = await waitForControllerReady(RICHADS_INIT_TIMEOUT_MS, RICHADS_READY_TICK_MS);
    log("controller_ready", ctor ? "present" : "missing");
    if (!ctor) {
      log("controller_missing");
      lastError = "richads_sdk_missing";
      lastErrorDetail = undefined;
      return { ok: false, error: "richads_sdk_missing" };
    }

    const controller = await initRichAds();
    if (!controller || typeof controller.show !== "function") {
      log("show_unavailable");
      lastError = "richads_sdk_missing";
      lastErrorDetail = undefined;
      return { ok: false, error: "richads_sdk_missing" };
    }

    for (let i = 1; i <= RICHADS_SHOW_ATTEMPTS; i += 1) {
      log("show_attempt", {
        attempt: i,
        pubId: RICHADS_PUB_ID,
        appId: RICHADS_APP_ID,
        origin: typeof window !== "undefined" ? window.location.origin : "unknown"
      });
      try {
        const result = controller.show();
        if (result && typeof (result as Promise<unknown>).then === "function") {
          const payload = await result;
          log("show_resolved", payload);
          lastError = null;
          lastErrorDetail = undefined;
          return { ok: true, payload };
        }
        log("show_called");
        const started = await detectAdStarted();
        log("ad_started_detected", started);

        if (started) {
          lastError = null;
          lastErrorDetail = undefined;
          return { ok: true };
        }

        // если не стартовало — даём ретрай
        if (i < RICHADS_SHOW_ATTEMPTS) {
          await new Promise((r) => window.setTimeout(r, RICHADS_SHOW_RETRY_MS));
          continue;
        }
      } catch (error) {
        log("show_failed_attempt", error);
        if (i < RICHADS_SHOW_ATTEMPTS) {
          await new Promise((resolve) => window.setTimeout(resolve, RICHADS_SHOW_RETRY_MS));
        }
      }
    }

    lastError = "ad_not_available";
    lastErrorDetail = undefined;
    return { ok: false, error: "ad_not_available" };
  } catch (error) {
    log("show_failed", error);
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.includes("403") || message.includes("publisher-config") || message.includes("cdn.adx1.com")) {
      lastError = "publisher_blocked";
      lastErrorDetail = error;
      return { ok: false, error: "publisher_blocked", detail: error };
    }
    if (message.includes("Load failed") || message.includes("NetworkError")) {
      lastError = "network_blocked";
      lastErrorDetail = error;
      return { ok: false, error: "network_blocked", detail: error };
    }
    lastError = "ad_not_available";
    lastErrorDetail = error;
    return { ok: false, error: "ad_not_available", detail: error };
  }
}

export async function showRichAdsRewarded(): Promise<RichAdsResult> {
  log("rewarded_attempt");
  try {
    const controller = await initRichAds();
    if (controller?.triggerNativeNotification) {
      const payload = await controller.triggerNativeNotification(true);
      log("rewarded_resolved", payload);
      lastError = null;
      lastErrorDetail = undefined;
      return { ok: true, payload };
    }
    const fallback = await showRichAds();
    if (!fallback.ok) {
      log("rewarded_failed", fallback);
    } else {
      log("rewarded_resolved", fallback.payload);
    }
    return fallback;
  } catch (error) {
    log("rewarded_failed", error);
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.includes("403") || message.includes("publisher-config") || message.includes("cdn.adx1.com")) {
      lastError = "publisher_blocked";
      lastErrorDetail = error;
      return { ok: false, error: "publisher_blocked", detail: error };
    }
    if (message.includes("Load failed") || message.includes("NetworkError")) {
      lastError = "network_blocked";
      lastErrorDetail = error;
      return { ok: false, error: "network_blocked", detail: error };
    }
    lastError = "ad_not_available";
    lastErrorDetail = error;
    return { ok: false, error: "ad_not_available", detail: error };
  }
}
