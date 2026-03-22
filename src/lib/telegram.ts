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
  openInvoice?: (url: string, callback?: (status: string) => void) => void;
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred?: (type: "error" | "success" | "warning") => void;
    selectionChanged?: () => void;
  };
  switchInlineQuery?: (
    query: string,
    options?: {
      choose_chat?: boolean;
      allow_user_chats?: boolean;
      allow_bot_chats?: boolean;
      allow_group_chats?: boolean;
      allow_channel_chats?: boolean;
      query?: string;
    }
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
