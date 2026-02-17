import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ImgHTMLAttributes } from "react";

import { faceUrlCandidates } from "@/lib/cardAsset";

interface CardFaceImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  deckId: string;
  cardName: string;
  style?: CSSProperties;
}

export default function CardFaceImage({ deckId, cardName, ...imgProps }: CardFaceImageProps) {
  const sources = useMemo(() => faceUrlCandidates(deckId, cardName), [deckId, cardName]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sources]);

  const activeSrc = sources[Math.min(index, sources.length - 1)] ?? "";

  return (
    <img
      {...imgProps}
      src={activeSrc}
      onError={(event) => {
        if (index < sources.length - 1) {
          setIndex((value) => Math.min(value + 1, sources.length - 1));
          return;
        }
        imgProps.onError?.(event);
      }}
    />
  );
}
