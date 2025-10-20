import type { ThemeParams, TelegramWebApp } from "./telegram";

const themeParamToCssVar: Partial<Record<keyof ThemeParams, string>> = {
  accent_color: "--tg-accent",
  bg_color: "--tg-bg",
  button_color: "--tg-accent",
  hint_color: "--tg-muted",
  link_color: "--tg-accent",
  secondary_bg_color: "--tg-secondary-bg",
  text_color: "--tg-fg"
};

function hexToRgb(hex?: string | null): string | null {
  if (!hex) return null;
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

function applyThemeParams(themeParams?: ThemeParams) {
  if (!themeParams) return;
  Object.entries(themeParamToCssVar).forEach(([key, cssVar]) => {
    if (!cssVar) return;
    const value = hexToRgb(themeParams[key as keyof ThemeParams]);
    if (value) {
      document.documentElement.style.setProperty(cssVar, value);
    }
  });
}

function resolveColorScheme(webApp?: TelegramWebApp) {
  const scheme = webApp?.colorScheme;
  if (scheme === "light" || scheme === "dark") {
    return scheme;
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
}

export function applyTheme(webApp?: TelegramWebApp) {
  if (typeof document === "undefined") return;

  applyThemeParams(webApp?.themeParams);
  const scheme = resolveColorScheme(webApp);
  document.documentElement.classList.toggle("dark", scheme === "dark");
}
