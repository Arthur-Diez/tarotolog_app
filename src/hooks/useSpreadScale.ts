import { useEffect, useMemo, useState } from "react";

import type { SpreadSchema } from "@/data/spreadSchemas";

const MIN_SCALE = 0.45;
const BASE_CARD_WIDTH = 180; // card width + spacing to keep margins
const BASE_CARD_HEIGHT = 240;
const MAX_CONTAINER_WIDTH = 420;
const CONTAINER_PADDING = 32; // px (px-4 on both sides)

export function useSpreadScale(schema: SpreadSchema, viewportHeight?: number, reserveHeight = 280): number {
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

  const layoutHeight = useMemo(() => {
    if (!schema.positions.length) {
      return BASE_CARD_HEIGHT;
    }
    const ys = schema.positions.map((position) => position.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spreadHeight = maxY - minY || 0;
    return Math.max(BASE_CARD_HEIGHT, spreadHeight + BASE_CARD_HEIGHT);
  }, [schema.positions]);

  useEffect(() => {
    const updateScale = () => {
      const viewportW = typeof window !== "undefined" ? window.innerWidth : MAX_CONTAINER_WIDTH;
      const viewportH = viewportHeight ?? (typeof window !== "undefined" ? window.innerHeight : 740);
      const availableWidth = Math.max(200, Math.min(viewportW, MAX_CONTAINER_WIDTH) - CONTAINER_PADDING);
      const availableHeight = Math.max(260, viewportH - reserveHeight);
      const widthScale = layoutWidth > 0 ? availableWidth / layoutWidth : 1;
      const heightScale = layoutHeight > 0 ? availableHeight / layoutHeight : 1;
      const nextScale = Math.min(1, widthScale, heightScale);
      setScale(Math.max(MIN_SCALE, nextScale));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [layoutWidth, layoutHeight, reserveHeight, viewportHeight]);

  return scale;
}
