import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import styles from "./DeckShowcaseAnimation.module.css";

interface DeckShowcaseAnimationProps {
  cards: string[];
  speedMs?: number;
  overlapPx?: number;
  scaleMoving?: number;
  scaleDeck?: number;
  isActive?: boolean;
  className?: string;
}

interface FlowState {
  left: number[];
  moving: number[];
  right: number[];
  nextSeed: number;
  dockCount: number;
}

interface LayoutMetrics {
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  leftDeckCenterX: number;
  rightDeckCenterX: number;
  centerY: number;
  arcPx: number;
  trackStartX: number;
  trackLength: number;
}

const MOVING_CARD_COUNT = 3;
const STACK_CARD_COUNT = 8;
const SLOT_SPACING = 1 / MOVING_CARD_COUNT;
const CARD_RATIO = 1.55;
const EMERGE_PORTION = 0.17;
const DOCK_PORTION = 0.2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t ** 3;

function createInitialFlow(cardCount: number): FlowState {
  if (cardCount <= 0) {
    return {
      left: Array.from({ length: STACK_CARD_COUNT }, () => 0),
      moving: Array.from({ length: MOVING_CARD_COUNT }, () => 0),
      right: Array.from({ length: STACK_CARD_COUNT }, () => 0),
      nextSeed: 0,
      dockCount: 0
    };
  }

  let seed = 0;
  const take = () => {
    const value = seed % cardCount;
    seed += 1;
    return value;
  };

  return {
    left: Array.from({ length: STACK_CARD_COUNT }, () => take()),
    moving: Array.from({ length: MOVING_CARD_COUNT }, () => take()),
    right: Array.from({ length: STACK_CARD_COUNT }, () => take()),
    nextSeed: seed,
    dockCount: 0
  };
}

function rotateFlow(flow: FlowState, cardCount: number): FlowState {
  if (cardCount <= 0) return flow;

  const dockingCard = flow.moving[flow.moving.length - 1];
  const emergingCard = flow.left[flow.left.length - 1];
  const newBottomLeft = flow.nextSeed % cardCount;

  return {
    left: [newBottomLeft, ...flow.left.slice(0, -1)],
    moving: [emergingCard, flow.moving[0], flow.moving[1]],
    right: [...flow.right.slice(1), dockingCard],
    nextSeed: flow.nextSeed + 1,
    dockCount: flow.dockCount + 1
  };
}

function computeScale(progress: number, scaleDeck: number, scaleMoving: number): number {
  if (progress < EMERGE_PORTION) {
    const t = easeOutCubic(progress / EMERGE_PORTION);
    return scaleDeck + (scaleMoving - scaleDeck) * t;
  }

  if (progress > 1 - DOCK_PORTION) {
    const t = (progress - (1 - DOCK_PORTION)) / DOCK_PORTION;
    if (t < 0.75) {
      const tt = easeInCubic(t / 0.75);
      return scaleMoving + (1.02 - scaleMoving) * tt;
    }
    const tt = (t - 0.75) / 0.25;
    return 1.02 + (scaleDeck - 1.02) * tt;
  }

  return scaleMoving;
}

function computeLayout(
  width: number,
  height: number,
  overlapPx: number,
  scaleDeck: number,
  scaleMoving: number
): LayoutMetrics {
  const cardWidth = clamp(width * 0.18, 54, 66);
  const cardHeight = cardWidth * CARD_RATIO;
  const sidePadding = clamp(width * 0.08, 16, 30);
  const leftDeckCenterX = sidePadding + cardWidth / 2;
  const rightDeckCenterX = width - sidePadding - cardWidth / 2;
  const centerY = height * 0.57;
  const arcPx = Math.min(6, height * 0.04);

  const deckVisualHalf = (cardWidth * scaleDeck) / 2;
  const movingVisualHalf = (cardWidth * scaleMoving) / 2;

  const leftOverlapX = leftDeckCenterX + deckVisualHalf - overlapPx + movingVisualHalf;
  const rightOverlapX = rightDeckCenterX - deckVisualHalf + overlapPx - movingVisualHalf;
  const laneDistance = Math.max(70, rightOverlapX - leftOverlapX);
  const trackLength = laneDistance / (2 / 3);

  return {
    width,
    height,
    cardWidth,
    cardHeight,
    leftDeckCenterX,
    rightDeckCenterX,
    centerY,
    arcPx,
    trackStartX: leftOverlapX,
    trackLength
  };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVisibilityChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return visible;
}

export function DeckShowcaseAnimation({
  cards,
  speedMs = 6000,
  overlapPx = 10,
  scaleMoving = 1.08,
  scaleDeck = 1,
  isActive = true,
  className = ""
}: DeckShowcaseAnimationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const movingRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const stepRef = useRef(0);

  const safeCards = useMemo(() => cards.filter(Boolean), [cards]);
  const cardCount = safeCards.length;
  const safeSpeedMs = Math.max(1400, speedMs);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isDocumentVisible = useDocumentVisible();
  const [isInView, setIsInView] = useState(true);
  const [flow, setFlow] = useState<FlowState>(() => createInitialFlow(cardCount));
  const flowRef = useRef(flow);
  const [layout, setLayout] = useState<LayoutMetrics>(() => computeLayout(320, 180, overlapPx, scaleDeck, scaleMoving));

  flowRef.current = flow;

  const updateMovingTransforms = useCallback(
    (baseProgress: number) => {
      for (let index = 0; index < MOVING_CARD_COUNT; index += 1) {
        const element = movingRefs.current[index];
        if (!element) continue;

        const progress = (baseProgress + index * SLOT_SPACING) % 1;
        const centerX = layout.trackStartX + layout.trackLength * progress;
        const centerY = layout.centerY - Math.sin(progress * Math.PI) * layout.arcPx;
        const scale = prefersReducedMotion ? scaleMoving : computeScale(progress, scaleDeck, scaleMoving);
        const translateX = centerX - layout.cardWidth / 2;
        const translateY = centerY - layout.cardHeight / 2;
        const isHiddenTransitionZone = progress < 0.06 || progress > 0.93;

        element.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        element.style.zIndex = isHiddenTransitionZone ? "10" : `${30 + index}`;
      }
    },
    [layout, prefersReducedMotion, scaleDeck, scaleMoving]
  );

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateLayout = () => {
      const rect = element.getBoundingClientRect();
      const nextLayout = computeLayout(rect.width, rect.height, overlapPx, scaleDeck, scaleMoving);
      setLayout(nextLayout);
    };

    updateLayout();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateLayout);
      return () => window.removeEventListener("resize", updateLayout);
    }

    const observer = new ResizeObserver(updateLayout);
    observer.observe(element);
    return () => observer.disconnect();
  }, [overlapPx, scaleDeck, scaleMoving]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.15);
      },
      { threshold: [0, 0.15, 0.35] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const initial = createInitialFlow(cardCount);
    flowRef.current = initial;
    setFlow(initial);
    progressRef.current = 0;
    stepRef.current = 0;
    lastTimestampRef.current = null;
  }, [cardCount]);

  useEffect(() => {
    updateMovingTransforms(progressRef.current % 1);
  }, [layout, updateMovingTransforms]);

  const shouldAnimate = isActive && cardCount > 0 && !prefersReducedMotion && isDocumentVisible && isInView;

  useEffect(() => {
    if (!shouldAnimate) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
      return undefined;
    }

    const run = (timestamp: number) => {
      const previous = lastTimestampRef.current ?? timestamp;
      const deltaMs = Math.min(64, Math.max(0, timestamp - previous));
      lastTimestampRef.current = timestamp;

      progressRef.current += deltaMs / safeSpeedMs;
      const currentStep = Math.floor(progressRef.current / SLOT_SPACING);
      const missedSteps = currentStep - stepRef.current;

      if (missedSteps > 0) {
        let nextFlow = flowRef.current;
        for (let index = 0; index < missedSteps; index += 1) {
          nextFlow = rotateFlow(nextFlow, cardCount);
        }
        stepRef.current = currentStep;
        flowRef.current = nextFlow;
        setFlow(nextFlow);
      }

      updateMovingTransforms(progressRef.current % 1);
      rafRef.current = window.requestAnimationFrame(run);
    };

    rafRef.current = window.requestAnimationFrame(run);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [cardCount, safeSpeedMs, shouldAnimate, updateMovingTransforms]);

  const rootStyle = {
    ["--deck-card-w" as string]: `${layout.cardWidth}px`,
    ["--deck-card-h" as string]: `${layout.cardHeight}px`,
    ["--deck-scale" as string]: String(scaleDeck)
  } as CSSProperties;

  const leftDeckBaseStyle = {
    transform: `translate3d(${(layout.leftDeckCenterX - layout.cardWidth / 2).toFixed(2)}px, ${(layout.centerY - layout.cardHeight / 2).toFixed(2)}px, 0)`
  };

  const rightDeckBaseStyle = {
    transform: `translate3d(${(layout.rightDeckCenterX - layout.cardWidth / 2).toFixed(2)}px, ${(layout.centerY - layout.cardHeight / 2).toFixed(2)}px, 0)`
  };

  const staticProgress = 0;

  return (
    <div ref={containerRef} className={`${styles.root} ${className}`.trim()} style={rootStyle}>
      <div className={styles.glow} />

      <div className={styles.deck} style={leftDeckBaseStyle}>
        {flow.left.map((cardIndex, index) => {
          const depth = flow.left.length - index - 1;
          const dx = -depth * 0.7;
          const dy = depth * 1.5;

          return (
            <img
              key={`left-${index}-${cardIndex}`}
              src={safeCards[cardIndex] ?? ""}
              alt=""
              aria-hidden
              loading="eager"
              draggable={false}
              className={styles.deckCard}
              style={
                {
                  zIndex: index + 1,
                  ["--dx" as string]: `${dx.toFixed(2)}px`,
                  ["--dy" as string]: `${dy.toFixed(2)}px`,
                  transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scaleDeck})`
                } as CSSProperties
              }
            />
          );
        })}
      </div>

      <div className={styles.deck} style={rightDeckBaseStyle}>
        {flow.right.map((cardIndex, index) => {
          const depth = flow.right.length - index - 1;
          const dx = depth * 0.7;
          const dy = depth * 1.5;
          const isTopCard = index === flow.right.length - 1;

          return (
            <img
              key={`right-${index}-${cardIndex}-${isTopCard ? flow.dockCount : "static"}`}
              src={safeCards[cardIndex] ?? ""}
              alt=""
              aria-hidden
              loading="eager"
              draggable={false}
              className={`${styles.deckCard} ${isTopCard && shouldAnimate ? styles.deckTopPop : ""}`}
              style={
                {
                  zIndex: index + 1,
                  ["--dx" as string]: `${dx.toFixed(2)}px`,
                  ["--dy" as string]: `${dy.toFixed(2)}px`,
                  transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scaleDeck})`
                } as CSSProperties
              }
            />
          );
        })}
      </div>

      <div className={styles.movingLayer}>
        {flow.moving.map((cardIndex, index) => {
          const progress = (staticProgress + index * SLOT_SPACING) % 1;
          const centerX = layout.trackStartX + layout.trackLength * progress;
          const centerY = layout.centerY - Math.sin(progress * Math.PI) * layout.arcPx;
          const scale = prefersReducedMotion ? scaleMoving : computeScale(progress, scaleDeck, scaleMoving);
          const translateX = centerX - layout.cardWidth / 2;
          const translateY = centerY - layout.cardHeight / 2;

          return (
            <div
              key={`moving-${index}`}
              ref={(element) => {
                movingRefs.current[index] = element;
              }}
              className={styles.movingCard}
              style={{
                transform: `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
                zIndex: 30 + index
              }}
            >
              <img
                src={safeCards[cardIndex] ?? ""}
                alt=""
                aria-hidden
                draggable={false}
                loading="eager"
                className={styles.movingCardImg}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
