type AdsgramSDK = {
  init: (options: { blockId: string; debug?: boolean }) => AdsgramController;
};

export type AdsgramShowResult = {
  done?: boolean;
  description?: string;
  state?: "load" | "render" | "playing" | "destroy" | string;
  error?: boolean;
};

type AdsgramController = {
  show: () => Promise<AdsgramShowResult>;
};

export type AdsgramError =
  | "tg_sdk_unavailable"
  | "sdk_missing"
  | "controller_missing"
  | "block_id_missing"
  | "no_inventory"
  | "network_error"
  | "ad_error";

export type AdsgramResult = {
  ok: boolean;
  payload?: AdsgramShowResult;
  error?: AdsgramError;
  detail?: string | null;
};

export type AdsgramInitOptions = {
  blockId?: string | null;
  debug?: boolean;
};

const ADSGRAM_INIT_TIMEOUT_MS = 6000;
const ADSGRAM_READY_TICK_MS = 250;
const ADSGRAM_SHOW_TIMEOUT_MS = 12000;

const resolveRewardBlockId = (value?: string | null) => {
  const fallback = (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_BLOCK_ID ?? "";
  const normalized = (value ?? fallback).trim();
  return normalized || null;
};

let adsgramController: AdsgramController | null = null;
let adsgramBlockId: string | null = null;
let initPromise: Promise<AdsgramController | null> | null = null;
let lastEvent: string | null = null;
let lastError: AdsgramError | null = null;
let lastErrorDetail: string | null = null;

function log(event: string, detail?: unknown) {
  lastEvent = event;
  if (detail !== undefined) {
    console.info(`[adsgram] ${event}`, detail);
  } else {
    console.info(`[adsgram] ${event}`);
  }
}

function normalizeDetail(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  if (detail instanceof Error) return detail.message.slice(0, 140);
  return String(detail).slice(0, 140);
}

function setLastError(error: AdsgramError | null, detail?: unknown) {
  lastError = error;
  lastErrorDetail = detail ? normalizeDetail(detail) : null;
}

function getTelegramWebApp(): unknown {
  if (typeof window === "undefined") return null;
  return (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp ?? null;
}

function getAdsgram(): AdsgramSDK | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { Adsgram?: AdsgramSDK }).Adsgram ?? null;
}

function classifyAdsgramError(error: unknown): AdsgramError {
  const message = normalizeDetail(error)?.toLowerCase() ?? "";
  if (!message) return "ad_error";
  if (message.includes("inventory") || message.includes("no fill") || message.includes("no ad")) {
    return "no_inventory";
  }
  if (message.includes("network") || message.includes("failed to fetch") || message.includes("load failed")) {
    return "network_error";
  }
  return "ad_error";
}

async function waitForAdsgramSdk(
  timeoutMs = ADSGRAM_INIT_TIMEOUT_MS,
  tickMs = ADSGRAM_READY_TICK_MS
): Promise<AdsgramSDK | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const sdk = getAdsgram();
    if (sdk?.init) {
      return sdk;
    }
    await new Promise((resolve) => window.setTimeout(resolve, tickMs));
  }
  return null;
}

export function getAdsgramDebugState() {
  return {
    blockId: adsgramBlockId,
    controllerReady: Boolean(adsgramController),
    lastEvent,
    lastError,
    lastErrorDetail
  };
}

export async function initAdsgramController(options: AdsgramInitOptions): Promise<AdsgramController | null> {
  const blockId = resolveRewardBlockId(options.blockId);
  if (!blockId) {
    setLastError("block_id_missing");
    log("block_id_missing");
    return null;
  }
  if (adsgramController && adsgramBlockId === blockId) {
    log("initialized_skip", { blockId });
    return adsgramController;
  }
  if (initPromise && adsgramBlockId === blockId) {
    return initPromise;
  }

  adsgramController = null;
  initPromise = (async () => {
    const hasTg = Boolean(getTelegramWebApp());
    log("tg_webapp_ready", hasTg ? "present" : "missing");
    if (!hasTg) {
      setLastError("tg_sdk_unavailable");
      return null;
    }

    const sdk = await waitForAdsgramSdk();
    if (!sdk?.init) {
      log("sdk_missing");
      setLastError("sdk_missing");
      return null;
    }
    log("init_config", { blockId, debug: options.debug === true });
    adsgramBlockId = blockId;
    adsgramController = sdk.init({ blockId, debug: options.debug });
    log("initialized_ok", { blockId });
    return adsgramController;
  })().catch((error) => {
    log("init_error", error);
    setLastError("sdk_missing", error);
    return null;
  });

  return initPromise;
}

export async function showAdsgramRewarded(options: AdsgramInitOptions): Promise<AdsgramResult> {
  const blockId = resolveRewardBlockId(options.blockId);
  log("show_attempt", { blockId });
  if (!blockId) {
    setLastError("block_id_missing");
    return { ok: false, error: "block_id_missing", detail: "Adsgram blockId missing" };
  }
  try {
    const controller = await initAdsgramController(options);
    if (!controller?.show) {
      log("controller_missing");
      const fallbackError = lastError ?? "controller_missing";
      setLastError(fallbackError);
      return { ok: false, error: fallbackError };
    }

    const showPromise = controller.show();
    let timeoutId = 0;
    const timeoutPromise = new Promise<AdsgramShowResult>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error("Adsgram show timeout")), ADSGRAM_SHOW_TIMEOUT_MS);
    });
    const result = await Promise.race([showPromise, timeoutPromise]);
    window.clearTimeout(timeoutId);
    log("show_resolved", result);
    if (result?.error) {
      setLastError("ad_error", result?.description);
      return { ok: false, error: "ad_error", detail: normalizeDetail(result?.description) };
    }

    setLastError(null);
    return { ok: true, payload: result };
  } catch (error) {
    log("show_failed", error);
    const mapped = classifyAdsgramError(error);
    setLastError(mapped, error);
    return { ok: false, error: mapped, detail: normalizeDetail(error) };
  }
}
