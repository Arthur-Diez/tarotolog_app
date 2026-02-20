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
  leftDeckTopX: number;
  rightDeckTopX: number;
  deckTopY: number;
  centerY: number;
  arcPx: number;
  trackStartCenterX: number;
  trackEndCenterX: number;
}

const MOVING_CARD_COUNT = 3;
const STACK_CARD_COUNT = 8;
const SLOT_SPACING = 1 / MOVING_CARD_COUNT;
const CARD_RATIO = 1.55;
const EMERGE_PORTION = 0.025;
const EMERGE_PICK_PORTION = 0.014;
const DOCK_PORTION = 0.04;
const EMERGE_LIFT_PX = 6;
const EMERGE_PULL_PX = 4;
const DECK_GAP_EXTRA_PX = 18;
const DOCK_MICRO_ARC_PX = 1.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t ** 3;
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

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

  const left = Array.from({ length: STACK_CARD_COUNT }, () => take());
  const moving = Array.from({ length: MOVING_CARD_COUNT }, () => take());
  const right = Array.from({ length: STACK_CARD_COUNT }, () => take());

  // Avoid duplicate in the first visible frame:
  // the right-most moving card should not match the top card of the right deck.
  if (cardCount > 1) {
    const movingRightCard = moving[MOVING_CARD_COUNT - 1];
    const rightTopIndex = right.length - 1;
    if (right[rightTopIndex] === movingRightCard) {
      right[rightTopIndex] = (movingRightCard + 1) % cardCount;
    }
  }

  return {
    left,
    moving,
    right,
    nextSeed: seed,
    dockCount: 0
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
  _scaleDeck: number,
  _scaleMoving: number
): LayoutMetrics {
  const cardWidth = clamp(width * 0.18, 54, 66);
  const cardHeight = cardWidth * CARD_RATIO;
  const sidePadding = clamp(width * 0.08, 16, 30);
  const halfGapExpansion = Math.min(DECK_GAP_EXTRA_PX / 2, Math.max(0, sidePadding - 4));
  const leftDeckCenterX = sidePadding + cardWidth / 2 - halfGapExpansion;
  const rightDeckCenterX = width - sidePadding - cardWidth / 2 + halfGapExpansion;
  const centerY = height * 0.57;
  const arcPx = Math.min(6, height * 0.04);
  const leftDeckTopX = leftDeckCenterX - cardWidth / 2;
  const rightDeckTopX = rightDeckCenterX - cardWidth / 2;
  const deckTopY = centerY - cardHeight / 2;
  const trackStartCenterX = leftDeckCenterX + overlapPx;
  const trackEndCenterX = rightDeckCenterX - overlapPx;

  return {
    width,
    height,
    cardWidth,
    cardHeight,
    leftDeckCenterX,
    rightDeckCenterX,
    leftDeckTopX,
    rightDeckTopX,
    deckTopY,
    centerY,
    arcPx,
    trackStartCenterX,
    trackEndCenterX
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
  speedMs = 12000,
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
      const dockStart = 1 - DOCK_PORTION;
      const trackSpan = layout.trackEndCenterX - layout.trackStartCenterX;
      const emergeTargetX = layout.trackStartCenterX + trackSpan * EMERGE_PORTION;
      const dockStartX = layout.trackStartCenterX + trackSpan * dockStart;
      const leftTopCenterX = layout.leftDeckTopX + layout.cardWidth / 2;
      const leftTopCenterY = layout.deckTopY + layout.cardHeight / 2;

      for (let index = 0; index < MOVING_CARD_COUNT; index += 1) {
        const element = movingRefs.current[index];
        if (!element) continue;

        const progress = (baseProgress + index * SLOT_SPACING) % 1;
        let centerX = layout.trackStartCenterX + trackSpan * progress;
        let centerY = layout.centerY - Math.sin(progress * Math.PI) * layout.arcPx;

        if (progress < EMERGE_PORTION) {
          if (progress < EMERGE_PICK_PORTION) {
            const t = easeOutCubic(progress / EMERGE_PICK_PORTION);
            centerX = leftTopCenterX + t * EMERGE_PULL_PX;
            centerY = leftTopCenterY - t * EMERGE_LIFT_PX;
          } else {
            const t = easeOutCubic((progress - EMERGE_PICK_PORTION) / (EMERGE_PORTION - EMERGE_PICK_PORTION));
            const pickX = leftTopCenterX + EMERGE_PULL_PX;
            const pickY = leftTopCenterY - EMERGE_LIFT_PX;
            const laneY = layout.centerY - Math.sin(progress * Math.PI) * layout.arcPx;
            centerX = lerp(pickX, emergeTargetX, t);
            centerY = lerp(pickY, laneY, t);
          }
        } else if (progress > dockStart) {
          const t = easeOutCubic((progress - dockStart) / DOCK_PORTION);
          centerX = lerp(dockStartX, layout.rightDeckCenterX, t);
          centerY += Math.sin(t * Math.PI) * DOCK_MICRO_ARC_PX;
        }

        const scale = prefersReducedMotion ? scaleMoving : computeScale(progress, scaleDeck, scaleMoving);
        const translateX = centerX - layout.cardWidth / 2;
        const translateY = centerY - layout.cardHeight / 2;
        const movingZ = progress < EMERGE_PORTION ? 90 + index : 60 + index;

        element.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        element.style.zIndex = `${movingZ}`;
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

      const previousProgress = progressRef.current % 1;
      progressRef.current += deltaMs / safeSpeedMs;
      const nextProgress = progressRef.current % 1;

      let nextFlow = flowRef.current;
      let hasWrap = false;

      for (let index = 0; index < MOVING_CARD_COUNT; index += 1) {
        const prevSlotProgress = (previousProgress + index * SLOT_SPACING) % 1;
        const nextSlotProgress = (nextProgress + index * SLOT_SPACING) % 1;
        if (nextSlotProgress >= prevSlotProgress) continue;

        const dockingCard = nextFlow.moving[index];
        const emergingCard = nextFlow.left[nextFlow.left.length - 1];
        const nextLeftBottom = nextFlow.nextSeed % cardCount;
        const nextMoving = nextFlow.moving.slice();
        nextMoving[index] = emergingCard;

        nextFlow = {
          left: [nextLeftBottom, ...nextFlow.left.slice(0, -1)],
          moving: nextMoving,
          right: [...nextFlow.right.slice(1), dockingCard],
          nextSeed: nextFlow.nextSeed + 1,
          dockCount: nextFlow.dockCount + 1
        };
        hasWrap = true;
      }

      if (hasWrap) {
        flowRef.current = nextFlow;
        setFlow(nextFlow);
      }

      updateMovingTransforms(nextProgress);
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

  const resolvePose = useCallback(
    (progress: number) => {
      const dockStart = 1 - DOCK_PORTION;
      const trackSpan = layout.trackEndCenterX - layout.trackStartCenterX;
      const emergeTargetX = layout.trackStartCenterX + trackSpan * EMERGE_PORTION;
      const dockStartX = layout.trackStartCenterX + trackSpan * dockStart;
      const leftTopCenterX = layout.leftDeckTopX + layout.cardWidth / 2;
      const leftTopCenterY = layout.deckTopY + layout.cardHeight / 2;

      let centerX = layout.trackStartCenterX + trackSpan * progress;
      let centerY = layout.centerY - Math.sin(progress * Math.PI) * layout.arcPx;

      if (progress < EMERGE_PORTION) {
        if (progress < EMERGE_PICK_PORTION) {
          const t = easeOutCubic(progress / EMERGE_PICK_PORTION);
          centerX = leftTopCenterX + t * EMERGE_PULL_PX;
          centerY = leftTopCenterY - t * EMERGE_LIFT_PX;
        } else {
          const t = easeOutCubic((progress - EMERGE_PICK_PORTION) / (EMERGE_PORTION - EMERGE_PICK_PORTION));
          const pickX = leftTopCenterX + EMERGE_PULL_PX;
          const pickY = leftTopCenterY - EMERGE_LIFT_PX;
          const laneY = layout.centerY - Math.sin(progress * Math.PI) * layout.arcPx;
          centerX = lerp(pickX, emergeTargetX, t);
          centerY = lerp(pickY, laneY, t);
        }
      } else if (progress > dockStart) {
        const t = easeOutCubic((progress - dockStart) / DOCK_PORTION);
        centerX = lerp(dockStartX, layout.rightDeckCenterX, t);
        centerY += Math.sin(t * Math.PI) * DOCK_MICRO_ARC_PX;
      }

      const scale = prefersReducedMotion ? scaleMoving : computeScale(progress, scaleDeck, scaleMoving);
      return {
        x: centerX - layout.cardWidth / 2,
        y: centerY - layout.cardHeight / 2,
        scale
      };
    },
    [layout, prefersReducedMotion, scaleDeck, scaleMoving]
  );

  const rootStyle = {
    ["--deck-card-w" as string]: `${layout.cardWidth}px`,
    ["--deck-card-h" as string]: `${layout.cardHeight}px`,
    ["--deck-scale" as string]: String(scaleDeck)
  } as CSSProperties;

  const leftDeckBaseX = layout.leftDeckTopX;
  const rightDeckBaseX = layout.rightDeckTopX;
  const deckBaseY = layout.deckTopY;

  const staticProgress = prefersReducedMotion ? 0 : progressRef.current % 1;

  return (
    <div ref={containerRef} className={`${styles.root} ${className}`.trim()} style={rootStyle}>
      <div className={styles.glow} />

      {flow.left.map((cardIndex, index) => {
        const depth = flow.left.length - index - 1;
        const x = leftDeckBaseX - depth * 0.7;
        const y = deckBaseY + depth * 1.5;

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
                zIndex: 12 + index,
                ["--dx" as string]: `${x.toFixed(2)}px`,
                ["--dy" as string]: `${y.toFixed(2)}px`,
                transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scaleDeck})`
              } as CSSProperties
            }
          />
        );
      })}

      {flow.right.map((cardIndex, index) => {
        const depth = flow.right.length - index - 1;
        const x = rightDeckBaseX + depth * 0.7;
        const y = deckBaseY + depth * 1.5;
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
                zIndex: 12 + index,
                ["--dx" as string]: `${x.toFixed(2)}px`,
                ["--dy" as string]: `${y.toFixed(2)}px`,
                transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scaleDeck})`
              } as CSSProperties
            }
          />
        );
      })}

      <div className={styles.movingLayer}>
        {flow.moving.map((cardIndex, index) => {
          const progress = (staticProgress + index * SLOT_SPACING) % 1;
          const pose = resolvePose(progress);
          const movingZ = progress < EMERGE_PORTION ? 90 + index : 60 + index;

          return (
            <div
              key={`moving-${index}`}
              ref={(element) => {
                movingRefs.current[index] = element;
              }}
              className={styles.movingCard}
              style={{
                transform: `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0) scale(${pose.scale.toFixed(4)})`,
                zIndex: movingZ
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
