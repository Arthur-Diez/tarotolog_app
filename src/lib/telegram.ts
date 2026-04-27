export interface ThemeParams {
  accent_color?: string | null;
  bg_color?: string | null;
  button_color?: string | null;
  button_text_color?: string | null;
  destructive_text_color?: string | null;
  header_bg_color?: string | null;
  hint_color?: string | null;
  link_color?: string | null;
  secondary_bg_color?: string | null;
  text_color?: string | null;
}

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export interface TelegramInitDataUnsafe {
  user?: TelegramUser;
  start_param?: string;
  [key: string]: unknown;
}

export interface TelegramWebApp {
  colorScheme?: "light" | "dark" | string;
  themeParams?: ThemeParams;
  initData?: string;
  initDataUnsafe?: TelegramInitDataUnsafe;
  ready: () => void;
  expand: () => void;
  onEvent?: (event: "themeChanged", handler: () => void) => void;
  offEvent?: (event: "themeChanged", handler: () => void) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink?: (url: string) => void;
  openInvoice?: (url: string, callback?: (status: string) => void) => void;
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred?: (type: "error" | "success" | "warning") => void;
    selectionChanged?: () => void;
  };
  switchInlineQuery?: (
    query: string,
    chooseChatTypes?: Array<"users" | "bots" | "groups" | "channels">
  ) => void;
}

let cachedWebApp: TelegramWebApp | null = null;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export async function initTelegram(): Promise<TelegramWebApp | null> {
  if (cachedWebApp) {
    return cachedWebApp;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const webApp = window.Telegram?.WebApp;
  if (!webApp) {
    return null;
  }

  webApp.ready();
  webApp.expand();
  cachedWebApp = webApp;

  return webApp;
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return cachedWebApp;
}

export function getTelegramStartParam(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const unsafe = window.Telegram?.WebApp?.initDataUnsafe;
  if (typeof unsafe?.start_param === "string" && unsafe.start_param.trim()) {
    return unsafe.start_param.trim();
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tgWebAppStartParam") || params.get("startapp") || params.get("start_param");
  if (raw?.trim()) {
    return raw.trim();
  }

  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
    const hashRaw = hashParams.get("tgWebAppStartParam") || hashParams.get("startapp") || hashParams.get("start_param");
    if (hashRaw?.trim()) {
      return hashRaw.trim();
    }
  }

  return null;
}

export function clearTelegramStartParam(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ["tgWebAppStartParam", "startapp", "start_param"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex < 0) {
    return;
  }
  const hashPath = hash.slice(0, queryIndex);
  const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
  let hashChanged = false;
  for (const key of ["tgWebAppStartParam", "startapp", "start_param"]) {
    if (hashParams.has(key)) {
      hashParams.delete(key);
      hashChanged = true;
    }
  }
  if (hashChanged) {
    const nextHashQuery = hashParams.toString();
    const nextHash = `${hashPath}${nextHashQuery ? `?${nextHashQuery}` : ""}`;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }
}

export function openExternalLink(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const webApp = window.Telegram?.WebApp;
  if (typeof webApp?.openLink === "function") {
    webApp.openLink(url, { try_instant_view: false });
    return;
  }

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.assign(url);
  }
}

export function openTelegramShareDialog(params: { url: string; text?: string }): void {
  if (typeof window === "undefined") {
    return;
  }

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(params.url)}${
    params.text ? `&text=${encodeURIComponent(params.text)}` : ""
  }`;
  const webApp = window.Telegram?.WebApp;

  if (typeof webApp?.openTelegramLink === "function") {
    webApp.openTelegramLink(shareUrl);
    return;
  }

  openExternalLink(shareUrl);
}

export function openInlineQueryWithFallback(params: {
  inlineQuery: string;
  fallbackUrl: string;
  fallbackText?: string;
}): { mode: "inline" | "fallback"; error?: string } {
  if (typeof window === "undefined") {
    return { mode: "fallback", error: "window_unavailable" };
  }

  const webApp = window.Telegram?.WebApp;

  const fallback = (error?: string) => {
    openTelegramShareDialog({ url: params.fallbackUrl, text: params.fallbackText });
    return { mode: "fallback" as const, error };
  };

  if (typeof webApp?.switchInlineQuery !== "function") {
    return fallback("inline_not_supported");
  }

  try {
    webApp.switchInlineQuery(params.inlineQuery, ["users", "groups", "channels", "bots"]);
    return { mode: "inline" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "inline_failed";
    return fallback(message);
  }
}

export async function openTelegramInvoice(url: string): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const webApp = window.Telegram?.WebApp;
  if (typeof webApp?.openInvoice === "function") {
    return new Promise((resolve) => {
      try {
        webApp.openInvoice?.(url, (status) => resolve(status ?? null));
      } catch {
        openExternalLink(url);
        resolve(null);
      }
    });
  }

  openExternalLink(url);
  return null;
}

export function triggerHapticNotification(type: "error" | "success" | "warning" = "success"): void {
  if (typeof window === "undefined") {
    return;
  }

  const webApp = window.Telegram?.WebApp;
  if (typeof webApp?.HapticFeedback?.notificationOccurred === "function") {
    webApp.HapticFeedback.notificationOccurred(type);
    return;
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern = type === "success" ? [18, 40, 18] : type === "warning" ? [24] : [10, 30, 10, 30, 10];
    navigator.vibrate(pattern);
  }
}
