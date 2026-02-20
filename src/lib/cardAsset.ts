const resolveDeckAssetId = (deckId: string): string => {
  if (deckId === "ancestry") return "sila_roda";
  return deckId;
};

export const faceUrl = (deckId: string, name: string): string =>
  `/assets/tarot/${resolveDeckAssetId(deckId)}/faces/${encodeURIComponent(name)}.png`;

export const backUrl = (deckId: string): string => `/assets/tarot/${resolveDeckAssetId(deckId)}/back.png`;

const buildCardNameVariants = (name: string): string[] => {
  const variants = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      variants.add(trimmed);
    }
  };

  add(name);
  add(name.normalize("NFC"));
  add(name.normalize("NFD"));
  add(name.replace(/й/g, "й"));
  add(name.replace(/й/g, "й"));
  add(name.normalize("NFC").replace(/й/g, "й"));
  add(name.normalize("NFD").replace(/й/g, "й"));

  return [...variants];
};

export const faceUrlCandidates = (deckId: string, name: string): string[] =>
  buildCardNameVariants(name).map((variant) => faceUrl(deckId, variant));
