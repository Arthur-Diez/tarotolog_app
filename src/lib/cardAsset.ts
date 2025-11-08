export const faceUrl = (deckId: string, name: string): string =>
  `/assets/tarot/${deckId}/faces/${encodeURIComponent(name)}.png`;

export const backUrl = (deckId: string): string => `/assets/tarot/${deckId}/back.png`;
