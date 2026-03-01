import { useEffect, useMemo } from "react";

import { type DeckTheme, resolveDeckTheme } from "./deckTheme";

export function applyDeckThemeVariables(theme: DeckTheme, target: HTMLElement = document.documentElement) {
  target.style.setProperty("--deck-accent", theme.accent);
  target.style.setProperty("--deck-glow", theme.glow);
  target.style.setProperty("--deck-bg-a", theme.bgA);
  target.style.setProperty("--deck-bg-b", theme.bgB);
}

export function useDeckTheme(deckId?: string | null): DeckTheme {
  const theme = useMemo(() => resolveDeckTheme(deckId), [deckId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    applyDeckThemeVariables(theme, document.documentElement);
  }, [theme]);

  return theme;
}
