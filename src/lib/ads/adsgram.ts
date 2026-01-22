type AdsgramSDK = {
  init: (options: { blockId: string }) => AdsgramController;
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
  | "ad_error"
  | "ad_not_completed"
  | "reward_link_failed";

type AdsgramResult = {
  ok: boolean;
  payload?: AdsgramShowResult;
  error?: AdsgramError;
  detail?: string | null;
};

const DEFAULT_REWARD_BLOCK_ID = "21501";
const ADSGRAM_INIT_TIMEOUT_MS = 6000;
const ADSGRAM_READY_TICK_MS = 250;
const REWARD_LINK_TIMEOUT_MS = 8000;

const ADSGRAM_REWARD_LINK_TEMPLATE =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_REWARD_LINK ?? "";

const resolveRewardBlockId = () => {
  const raw =
    (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_REWARD_BLOCK_ID ??
    DEFAULT_REWARD_BLOCK_ID;
  const normalized = raw.trim();
  if (!normalized) return DEFAULT_REWARD_BLOCK_ID;
  return normalized;
};

let adsgramController: AdsgramController | null = null;
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

function getTelegramUserId(): number | null {
  if (typeof window === "undefined") return null;
  const user = (window as Window & {
    Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } };
  }).Telegram?.WebApp?.initDataUnsafe?.user;
  return user?.id ?? null;
}

function getAdsgram(): AdsgramSDK | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { Adsgram?: AdsgramSDK }).Adsgram ?? null;
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

export function getAdsgramDebugInfo() {
  if (typeof window === "undefined") {
    return {
      blockId: resolveRewardBlockId(),
      rewardLinkConfigured: Boolean(ADSGRAM_REWARD_LINK_TEMPLATE.trim()),
      origin: "unknown",
      tgWebApp: false,
      sdkPresent: false,
      controllerReady: false,
      initialized: false,
      lastEvent,
      lastError,
      lastErrorDetail
    };
  }

  return {
    blockId: resolveRewardBlockId(),
    rewardLinkConfigured: Boolean(ADSGRAM_REWARD_LINK_TEMPLATE.trim()),
    origin: window.location.origin,
    tgWebApp: Boolean(getTelegramWebApp()),
    sdkPresent: Boolean(getAdsgram()),
    controllerReady: Boolean(adsgramController),
    initialized: Boolean(adsgramController),
    lastEvent,
    lastError,
    lastErrorDetail
  };
}

export async function initAdsgram(): Promise<AdsgramController | null> {
  if (adsgramController) {
    log("initialized_skip");
    return adsgramController;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const sdk = await waitForAdsgramSdk();
    if (!sdk?.init) {
      log("sdk_missing");
      setLastError("sdk_missing");
      return null;
    }
    const blockId = resolveRewardBlockId();
    log("init_config", { blockId });
    adsgramController = sdk.init({ blockId });
    log("initialized_ok");
    return adsgramController;
  })().catch((error) => {
    log("init_error", error);
    setLastError("sdk_missing", error);
    return null;
  });

  return initPromise;
}

export async function showAdsgramRewarded(): Promise<AdsgramResult> {
  log("rewarded_attempt");
  try {
    const hasTg = Boolean(getTelegramWebApp());
    log("tg_webapp_ready", hasTg ? "present" : "missing");
    if (!hasTg) {
      setLastError("tg_sdk_unavailable");
      return { ok: false, error: "tg_sdk_unavailable" };
    }

    const controller = await initAdsgram();
    if (!controller?.show) {
      log("controller_missing");
      setLastError("controller_missing");
      return { ok: false, error: "controller_missing" };
    }

    const result = await controller.show();
    log("show_resolved", result);

    if (result?.error) {
      setLastError("ad_error", result?.description);
      return { ok: false, error: "ad_error", detail: normalizeDetail(result?.description) };
    }

    if (result?.done === false) {
      setLastError("ad_not_completed", result?.description);
      return { ok: false, error: "ad_not_completed", detail: normalizeDetail(result?.description) };
    }

    setLastError(null);
    return { ok: true, payload: result };
  } catch (error) {
    log("show_failed", error);
    setLastError("ad_error", error);
    return { ok: false, error: "ad_error", detail: normalizeDetail(error) };
  }
}

function replaceToken(target: string, token: string, value: string): string {
  if (!target.includes(token)) return target;
  return target.split(token).join(value);
}

function buildRewardLink(params: { rewardId?: string | null }): string | null {
  const template = ADSGRAM_REWARD_LINK_TEMPLATE.trim();
  if (!template) return null;

  const telegramId = getTelegramUserId();
  const needsUser =
    template.includes("{telegram_id}") ||
    template.includes("{{telegram_id}}") ||
    template.includes("{user_id}") ||
    template.includes("{{user_id}}");
  if (needsUser && !telegramId) {
    return null;
  }

  const needsRewardId = template.includes("{reward_id}") || template.includes("{{reward_id}}");
  if (needsRewardId && !params.rewardId) {
    return null;
  }

  let url = template;
  const userValue = telegramId ? String(telegramId) : "";
  const rewardValue = params.rewardId ?? "";

  url = replaceToken(url, "{telegram_id}", userValue);
  url = replaceToken(url, "{{telegram_id}}", userValue);
  url = replaceToken(url, "{user_id}", userValue);
  url = replaceToken(url, "{{user_id}}", userValue);
  url = replaceToken(url, "{reward_id}", rewardValue);
  url = replaceToken(url, "{{reward_id}}", rewardValue);

  return url;
}

async function callRewardLink(url: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REWARD_LINK_TIMEOUT_MS);
  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      credentials: "omit",
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function triggerAdsgramRewardLink(params: {
  rewardId?: string | null;
}): Promise<AdsgramResult> {
  const url = buildRewardLink(params);
  if (!ADSGRAM_REWARD_LINK_TEMPLATE.trim()) {
    log("reward_link_skip");
    return { ok: true };
  }
  if (!url) {
    log("reward_link_missing_params");
    setLastError("reward_link_failed");
    return { ok: false, error: "reward_link_failed", detail: "missing_reward_link_params" };
  }

  log("reward_link_call", url);
  try {
    await callRewardLink(url);
    log("reward_link_ok");
    setLastError(null);
    return { ok: true };
  } catch (error) {
    log("reward_link_failed", error);
    setLastError("reward_link_failed", error);
    return { ok: false, error: "reward_link_failed", detail: normalizeDetail(error) };
  }
}
