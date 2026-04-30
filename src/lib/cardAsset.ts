const resolveDeckAssetId = (deckId: string): string => {
  if (deckId === "ancestry") return "sila_roda";
  if (deckId === "metaphoric") return "metaphorical";
  return deckId;
};

export const faceUrl = (deckId: string, name: string): string =>
  `/assets/tarot/${resolveDeckAssetId(deckId)}/faces/${encodeURIComponent(name)}.png`;

export const backUrl = (deckId: string): string => `/assets/tarot/${resolveDeckAssetId(deckId)}/back.png`;

export const faceWebpUrl = (deckId: string, name: string): string =>
  `/assets/tarot/${resolveDeckAssetId(deckId)}/faces-webp/${encodeURIComponent(name)}.webp`;

export const backWebpUrl = (deckId: string): string => `/assets/tarot/${resolveDeckAssetId(deckId)}/back.webp`;

export const backImageUrl = (deckId: string): string => backWebpUrl(deckId);

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

export const faceImageUrlCandidates = (deckId: string, name: string): string[] => {
  const variants = buildCardNameVariants(name);
  return [...variants.map((variant) => faceWebpUrl(deckId, variant)), ...variants.map((variant) => faceUrl(deckId, variant))];
};

export const faceImageUrl = (deckId: string, name: string): string => faceImageUrlCandidates(deckId, name)[0] ?? faceUrl(deckId, name);
