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

export interface TelegramWebApp {
  colorScheme?: "light" | "dark" | string;
  themeParams?: ThemeParams;
  ready: () => void;
  expand: () => void;
  onEvent?: (event: "themeChanged", handler: () => void) => void;
  offEvent?: (event: "themeChanged", handler: () => void) => void;
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
