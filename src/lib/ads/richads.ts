type TelegramAdsControllerInstance = {
  initialize: (options: { pubId: string; appId: string; debug?: boolean }) => void;
  show?: () => Promise<unknown> | void;
  triggerNativeNotification?: (immediate?: boolean) => Promise<unknown>;
};

type TelegramAdsControllerCtor = new () => TelegramAdsControllerInstance;
type TelegramAdsControllerGlobal = TelegramAdsControllerInstance | TelegramAdsControllerCtor;

export type RichAdsError =
  | "tg_sdk_unavailable"
  | "richads_sdk_missing"
  | "network_blocked"
  | "publisher_blocked"
  | "ad_not_available";

type RichAdsResult = { ok: boolean; payload?: unknown; error?: RichAdsError; detail?: unknown };

const RICHADS_PUB_ID = "999441";
const RICHADS_APP_ID = "5826";
const RICHADS_INIT_TIMEOUT_MS = 6000;
const RICHADS_READY_TICK_MS = 250;
const RICHADS_SHOW_ATTEMPTS = 3;
const RICHADS_SHOW_RETRY_MS = 600;
const TG_SDK_WAIT_MS = 1500;
const RICHADS_START_DETECT_MS = 700;

let controllerInstance: TelegramAdsControllerInstance | null = null;
let initPromise: Promise<TelegramAdsControllerInstance | null> | null = null;
let controllerInitialized = false;
let lastEvent: string | null = null;
let lastError: RichAdsError | null = null;
let lastErrorDetail: string | null = null;

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
    TelegramAdsController?: TelegramAdsControllerGlobal;
    __richadsController?: TelegramAdsControllerInstance;
    __richadsInited?: boolean;
  };

  return {
    pubId: RICHADS_PUB_ID,
    appId: RICHADS_APP_ID,
    origin: window.location.origin,
    tgWebApp: Boolean(win.Telegram?.WebApp),
    controllerPresent: Boolean(win.TelegramAdsController),
    initialized: Boolean(controllerInstance || win.__richadsController || win.__richadsInited),
    lastEvent,
    lastError,
    lastErrorDetail
  };
}

function getTelegramWebApp(): unknown {
  if (typeof window === "undefined") return null;
  return (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp ?? null;
}

function getControllerGlobal(): TelegramAdsControllerGlobal | null {
  if (typeof window === "undefined") return null;
  const controller = (window as Window & { TelegramAdsController?: TelegramAdsControllerGlobal })
    .TelegramAdsController;
  if (!controller) return null;
  if (typeof controller === "object" || typeof controller === "function") {
    return controller;
  }
  return null;
}

function getControllerInstanceFromWindow(): TelegramAdsControllerInstance | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & {
    TelegramAdsController?: TelegramAdsControllerGlobal;
    __richadsController?: TelegramAdsControllerInstance;
  };

  if (win.__richadsController) {
    return win.__richadsController;
  }

  const controller = win.TelegramAdsController;
  if (!controller) return null;

  if (typeof controller === "object" && "initialize" in controller) {
    return controller as TelegramAdsControllerInstance;
  }

  if (typeof controller === "function") {
    try {
      return new (controller as TelegramAdsControllerCtor)();
    } catch (error) {
      log("controller_ctor_failed", error);
      return null;
    }
  }

  return null;
}

async function waitForAdsController(
  timeoutMs = RICHADS_INIT_TIMEOUT_MS,
  tickMs = RICHADS_READY_TICK_MS
): Promise<TelegramAdsControllerGlobal | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const controller = getControllerGlobal();
    if (controller) {
      return controller;
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

function getDebugFlag(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugAds") === "1";
}

function normalizeErrorDetail(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  if (detail instanceof Error) return detail.message.slice(0, 140);
  return String(detail).slice(0, 140);
}

function setLastError(error: RichAdsError | null, detail?: unknown) {
  lastError = error;
  lastErrorDetail = detail ? normalizeErrorDetail(detail) : null;
}

function mapErrorToResult(error: unknown): RichAdsResult {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("403") || message.includes("publisher-config") || message.includes("cdn.adx1.com")) {
    setLastError("publisher_blocked", error);
    return { ok: false, error: "publisher_blocked", detail: error };
  }
  if (message.includes("Load failed") || message.includes("NetworkError")) {
    setLastError("network_blocked", error);
    return { ok: false, error: "network_blocked", detail: error };
  }
  setLastError("ad_not_available", error);
  return { ok: false, error: "ad_not_available", detail: error };
}

export async function initRichAds(): Promise<TelegramAdsControllerInstance | null> {
  if (typeof window !== "undefined") {
    const win = window as Window & {
      __richadsController?: TelegramAdsControllerInstance;
      __richadsInited?: boolean;
    };
    if (win.__richadsController) {
      controllerInstance = win.__richadsController;
      if (win.__richadsInited) {
        controllerInitialized = true;
      }
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
    const controllerGlobal = await waitForAdsController();
    if (!controllerGlobal) {
      log("controller_missing");
      return null;
    }

    log("controller_present");
    const instance = getControllerInstanceFromWindow();
    if (!instance) {
      log("controller_instance_missing");
      return null;
    }

    controllerInstance = instance;
    if (typeof window !== "undefined") {
      const win = window as Window & { __richadsController?: TelegramAdsControllerInstance };
      win.__richadsController = instance;
    }

    const alreadyInitialized =
      controllerInitialized ||
      (typeof window !== "undefined" &&
        (window as Window & { __richadsInited?: boolean }).__richadsInited);

    if (!alreadyInitialized) {
      const debug = getDebugFlag();
      log("init_config", {
        pubId: RICHADS_PUB_ID,
        appId: RICHADS_APP_ID,
        debug,
        origin: typeof window !== "undefined" ? window.location.origin : "unknown"
      });
      instance.initialize({ pubId: RICHADS_PUB_ID, appId: RICHADS_APP_ID, debug: debug || undefined });
      controllerInitialized = true;
      if (typeof window !== "undefined") {
        (window as Window & { __richadsInited?: boolean }).__richadsInited = true;
      }
      log("initialized_ok");
    } else {
      log("initialized_skip");
    }
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
      setLastError("tg_sdk_unavailable");
      return { ok: false, error: "tg_sdk_unavailable" };
    }

    log("controller_initial", getControllerGlobal() ? "present" : "missing");

    const controllerGlobal = await waitForAdsController();
    log("controller_ready", controllerGlobal ? "present" : "missing");
    if (!controllerGlobal) {
      log("controller_missing");
      setLastError("richads_sdk_missing");
      return { ok: false, error: "richads_sdk_missing" };
    }

    const controller = await initRichAds();
    if (!controller || typeof controller.show !== "function") {
      log("show_unavailable");
      setLastError("richads_sdk_missing");
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
          setLastError(null);
          return { ok: true, payload };
        }
        log("show_called");
        const started = await detectAdStarted();
        log("ad_started_detected", started);

        if (started) {
          setLastError(null);
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

    setLastError("ad_not_available");
    return { ok: false, error: "ad_not_available" };
  } catch (error) {
    log("show_failed", error);
    return mapErrorToResult(error);
  }
}

export async function showRichAdsRewarded(): Promise<RichAdsResult> {
  log("rewarded_attempt");
  try {
    const hasTgInitial = Boolean(getTelegramWebApp());
    log("tg_webapp_initial", hasTgInitial ? "present" : "missing");

    const hasTg = hasTgInitial || (await waitForTelegramWebApp());
    log("tg_webapp_ready", hasTg ? "present" : "missing");

    if (!hasTg) {
      setLastError("tg_sdk_unavailable");
      return { ok: false, error: "tg_sdk_unavailable" };
    }

    const controllerGlobal = await waitForAdsController();
    log("controller_present", controllerGlobal ? "present" : "missing");
    if (!controllerGlobal) {
      setLastError("richads_sdk_missing");
      return { ok: false, error: "richads_sdk_missing" };
    }

    const controller = await initRichAds();
    if (!controller) {
      setLastError("richads_sdk_missing");
      return { ok: false, error: "richads_sdk_missing" };
    }
    if (controller?.triggerNativeNotification) {
      const payload = await controller.triggerNativeNotification(true);
      log("rewarded_resolved", payload);
      setLastError(null);
      return { ok: true, payload };
    }
    if (typeof controller.show === "function") {
      const fallback = await showRichAds();
      if (!fallback.ok) {
        log("rewarded_failed", fallback);
      } else {
        log("rewarded_resolved", fallback.payload);
      }
      return fallback;
    }
    log("rewarded_missing_method");
    setLastError("richads_sdk_missing");
    return { ok: false, error: "richads_sdk_missing" };
  } catch (error) {
    log("rewarded_failed", error);
    return mapErrorToResult(error);
  }
}
