import { useEffect, useMemo, useState } from "react";

import type { SpreadSchema } from "@/data/spreadSchemas";

const MIN_SCALE = 0.55;
const BASE_CARD_WIDTH = 180; // card width + spacing to keep margins
const MAX_CONTAINER_WIDTH = 420;
const CONTAINER_PADDING = 32; // px (px-4 on both sides)

export function useSpreadScale(schema: SpreadSchema): number {
  const [scale, setScale] = useState(1);

  const layoutWidth = useMemo(() => {
    if (!schema.positions.length) {
      return BASE_CARD_WIDTH;
    }
    const xs = schema.positions.map((position) => position.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const spreadWidth = maxX - minX || 0;
    return Math.max(BASE_CARD_WIDTH, spreadWidth + BASE_CARD_WIDTH);
  }, [schema.positions]);

  useEffect(() => {
    const updateScale = () => {
      const viewport = typeof window !== "undefined" ? window.innerWidth : MAX_CONTAINER_WIDTH;
      const availableWidth = Math.max(200, Math.min(viewport, MAX_CONTAINER_WIDTH) - CONTAINER_PADDING);
      const rawScale = layoutWidth > 0 ? availableWidth / layoutWidth : 1;
      const nextScale = Math.min(1, rawScale);
      setScale(Math.max(MIN_SCALE, nextScale));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [layoutWidth]);

  return scale;
}
