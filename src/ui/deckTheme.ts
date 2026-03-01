export interface DeckTheme {
  accent: string;
  glow: string;
  bgA: string;
  bgB: string;
  chips: [string, string?];
}

export const DEFAULT_THEME: DeckTheme = {
  accent: "rgba(214, 176, 118, 0.92)",
  glow: "rgba(214, 176, 118, 0.16)",
  bgA: "rgba(214, 176, 118, 0.14)",
  bgB: "rgba(153, 126, 89, 0.1)",
  chips: ["Архетипы", "Саморефлексия"]
};

export const DECK_THEMES: Record<string, DeckTheme> = {
  rws: {
    accent: "rgba(224, 188, 130, 0.94)",
    glow: "rgba(224, 188, 130, 0.16)",
    bgA: "rgba(224, 188, 130, 0.14)",
    bgB: "rgba(171, 138, 96, 0.1)",
    chips: ["Архетипы", "Саморефлексия"]
  },
  lenormand: {
    accent: "rgba(123, 168, 238, 0.95)",
    glow: "rgba(123, 168, 238, 0.16)",
    bgA: "rgba(123, 168, 238, 0.14)",
    bgB: "rgba(91, 128, 196, 0.1)",
    chips: ["События", "Факты"]
  },
  manara: {
    accent: "rgba(206, 95, 140, 0.95)",
    glow: "rgba(206, 95, 140, 0.16)",
    bgA: "rgba(206, 95, 140, 0.14)",
    bgB: "rgba(157, 69, 110, 0.1)",
    chips: ["Отношения", "Желания"]
  },
  angels: {
    accent: "rgba(149, 180, 230, 0.95)",
    glow: "rgba(149, 180, 230, 0.16)",
    bgA: "rgba(149, 180, 230, 0.14)",
    bgB: "rgba(109, 140, 188, 0.1)",
    chips: ["Поддержка", "Гармония"]
  },
  golden: {
    accent: "rgba(232, 175, 91, 0.95)",
    glow: "rgba(232, 175, 91, 0.16)",
    bgA: "rgba(232, 175, 91, 0.15)",
    bgB: "rgba(180, 131, 61, 0.11)",
    chips: ["Классика", "Ясность"]
  },
  ancestry: {
    accent: "rgba(191, 146, 87, 0.95)",
    glow: "rgba(191, 146, 87, 0.16)",
    bgA: "rgba(191, 146, 87, 0.14)",
    bgB: "rgba(141, 106, 64, 0.1)",
    chips: ["Род", "Гармония"]
  },
  metaphoric: {
    accent: "rgba(166, 139, 220, 0.95)",
    glow: "rgba(166, 139, 220, 0.16)",
    bgA: "rgba(166, 139, 220, 0.14)",
    bgB: "rgba(124, 104, 179, 0.1)",
    chips: ["Саморефлексия", "Инсайты"]
  }
};

export function resolveDeckTheme(deckId?: string | null): DeckTheme {
  if (!deckId) return DEFAULT_THEME;
  return DECK_THEMES[deckId] ?? DEFAULT_THEME;
}
