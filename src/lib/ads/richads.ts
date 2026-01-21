type TelegramAdsControllerInstance = {
  initialize: (options: { pubId: string; appId: string }) => void;
  show?: () => Promise<unknown> | void;
};

type TelegramAdsControllerCtor = new () => TelegramAdsControllerInstance;

type RichAdsResult = { ok: boolean; payload?: unknown; error?: unknown };

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

function getControllerConstructor(): TelegramAdsControllerCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as Window & { TelegramAdsController?: TelegramAdsControllerCtor }).TelegramAdsController;
  return ctor ?? null;
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
    const controller = await initRichAds();
    if (!controller || typeof controller.show !== "function") {
      log("show_unavailable");
      return { ok: false, error: "show_unavailable" };
    }

    log("show_start");
    const result = controller.show();
    if (result && typeof (result as Promise<unknown>).then === "function") {
      const payload = await result;
      log("show_resolved", payload);
      return { ok: true, payload };
    }

    log("show_called");
    return { ok: true };
  } catch (error) {
    log("show_failed", error);
    return { ok: false, error };
  }
}
