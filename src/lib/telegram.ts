import type { WebApp } from "@twa-dev/sdk";

let cachedWebApp: WebApp | null = null;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: WebApp;
    };
  }
}

export async function initTelegram(): Promise<WebApp | null> {
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

export function getTelegramWebApp(): WebApp | null {
  return cachedWebApp;
}
