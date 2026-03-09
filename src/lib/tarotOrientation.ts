const REVERSAL_ENABLED_DECKS = new Set(["rws", "golden", "golden_tarot"]);

function normalizeDeckId(deckId: string | null | undefined): string {
  return (deckId || "").trim().toLowerCase();
}

export function isDeckWithReversals(deckId: string | null | undefined): boolean {
  const normalized = normalizeDeckId(deckId);
  return REVERSAL_ENABLED_DECKS.has(normalized);
}

export function normalizeCardReversedForDeck(
  deckId: string | null | undefined,
  reversed: boolean | null | undefined
): boolean {
  if (!isDeckWithReversals(deckId)) {
    return false;
  }
  return Boolean(reversed);
}
