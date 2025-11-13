import { memo, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { motion, useAnimate } from "framer-motion";

import type { ReadingStage } from "@/stores/readingState";

interface DeckStackProps {
  backSrc: string;
  mode: ReadingStage;
  fanCount?: number;
  fanCenterRef?: RefObject<HTMLDivElement>;
}

interface Layout {
  x: number;
  y: number;
  rotate: number;
}

interface StackLayout extends Layout {
  opacity: number;
}

const DEFAULT_FAN = 21;
const STACK_PHASES = new Set<ReadingStage>(["collecting", "shuffling", "dealing", "await_open", "done"]);
const FAN_PHASES = new Set<ReadingStage>(["fan", "sending", "ask"]);
const SHUFFLE_ROUNDS = 6;
const CARD_WIDTH = 144;
const CARD_HEIGHT = 224;
const SHUFFLE_SWING = CARD_WIDTH * 0.9;
const DEAL_SLIDE = CARD_HEIGHT + 36;
const DEAL_DURATION = 1.1;
const DEAL_LIFT = 90;
const DEAL_GAP = 18;
export const DEALT_CARD_OFFSET = DEAL_SLIDE + DEAL_GAP - DEAL_LIFT;

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function buildFanLayout(count: number): Layout[] {
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const spread = 280;
    return {
      x: (t - 0.5) * spread,
      y: Math.abs(t - 0.5) * -14,
      rotate: (t - 0.5) * 35
    };
  });
}

function buildStackOffsets(count: number): StackLayout[] {
  return Array.from({ length: count }, () => ({
    x: randomRange(-2, 2),
    y: randomRange(-1, 1),
    rotate: randomRange(-2, 2),
    opacity: randomRange(0.98, 1)
  }));
}

function gatherDelay(index: number, centerIndex: number) {
  if (centerIndex === 0) return 0;
  const maxDistance = centerIndex;
  const distance = Math.abs(centerIndex - index);
  return (maxDistance - distance) * 0.05;
}

export const DeckStack = memo(function DeckStack({
  backSrc,
  mode,
  fanCount = DEFAULT_FAN,
  fanCenterRef
}: DeckStackProps) {
  const [scope, animate] = useAnimate();
  const cards = useMemo(() => Array.from({ length: fanCount }), [fanCount]);
  const centerIndex = Math.floor(fanCount / 2);
  const fanLayout = useMemo(() => buildFanLayout(fanCount), [fanCount]);
  const [stackOffsets, setStackOffsets] = useState<StackLayout[]>(() => buildStackOffsets(fanCount));
  const [zLayers, setZLayers] = useState(() =>
    Array.from({ length: fanCount }, (_, index) => index)
  );
  const [dealPhase, setDealPhase] = useState<"idle" | "animating" | "settled">("idle");

  useEffect(() => {
    if (FAN_PHASES.has(mode) || mode === "collecting") {
      setStackOffsets(buildStackOffsets(fanCount));
      setZLayers(Array.from({ length: fanCount }, (_, index) => index));
      setDealPhase("idle");
    }
  }, [fanCount, mode]);
  
  useEffect(() => {
    if (mode === "dealing") {
      setDealPhase("animating");
      return;
    }
  }, [mode]);

  useEffect(() => {
    if (dealPhase !== "animating") return;
    const timer = setTimeout(() => setDealPhase("settled"), DEAL_DURATION * 1000 + 150);
    return () => clearTimeout(timer);
  }, [dealPhase]);

  useEffect(() => {
    if (mode !== "shuffling") return;
    let isCancelled = false;

    const pickIndex = () => {
      const pool = cards.map((_, index) => index).filter((index) => index !== centerIndex);
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const runShuffle = async () => {
      for (let step = 0; step < SHUFFLE_ROUNDS && !isCancelled; step += 1) {
        const index = pickIndex();
        const selector = `.card-${index}`;
        const base = stackOffsets[index];
        const dir = step % 2 === 0 ? SHUFFLE_SWING : -SHUFFLE_SWING;
        const tilt = dir > 0 ? 7 : -7;
        await animate(
          selector,
          {
            x: [base.x, base.x + dir, base.x + dir * 0.85, base.x],
            y: [base.y, base.y - 18, base.y - 6, base.y],
            rotateZ: [base.rotate, base.rotate + tilt, base.rotate + tilt / 2, base.rotate]
          },
          { duration: 0.65, ease: "easeInOut" }
        );
        if (isCancelled) return;
        setZLayers((prev) => {
          const next = [...prev];
          const maxZ = Math.max(...prev);
          next[index] = maxZ + 1;
          return next;
        });
      }
      if (!isCancelled) {
        await animate(
          ".deck-stack-shell",
          { scale: [1, 1.02, 1], y: [0, -6, 0] },
          { duration: 0.9, ease: "easeInOut" }
        );
      }
    };

    runShuffle();

    return () => {
      isCancelled = true;
    };
  }, [animate, cards, centerIndex, mode, stackOffsets]);

  const isStackPhase = STACK_PHASES.has(mode);
  const dealIndex = centerIndex;
  const stackRaised = dealPhase === "animating" || dealPhase === "settled";
  const stackLiftAnimation = stackRaised ? { y: -DEAL_LIFT } : { y: 0 };
  const stackLiftTransition =
    dealPhase === "animating"
      ? { duration: DEAL_DURATION, ease: "easeInOut" }
      : { duration: 0.35, ease: "easeOut" };

  return (
    <div
      ref={scope}
      className="deck-root pointer-events-none relative flex h-[320px] w-full items-center justify-center overflow-visible"
    >
      <div
        id="fanCenter"
        ref={fanCenterRef}
        className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 opacity-0"
      />
      <motion.div
        className="deck-stack-shell pointer-events-none relative h-56 w-36"
        style={{ overflow: "visible" }}
        animate={stackLiftAnimation}
        transition={stackLiftTransition}
      >
        {cards.map((_, index) => {
          const fanTarget = fanLayout[index];
          const stackTarget = stackOffsets[index];
          const target = isStackPhase || mode === "collecting" ? stackTarget : fanTarget;
          const transition =
            mode === "collecting"
              ? { duration: 0.9, delay: gatherDelay(index, centerIndex), ease: "easeInOut" }
              : { duration: 0.5, ease: "easeOut" };
          const isDealCard = index === dealIndex;
          const isExtracting = isDealCard && dealPhase !== "idle";
          const cardOpacity =
            isStackPhase || mode === "collecting" ? stackTarget.opacity : 1;
          const animateTarget = isExtracting
            ? dealPhase === "settled"
              ? {
                  x: stackTarget.x,
                  y: stackTarget.y + DEAL_SLIDE + DEAL_GAP,
                  rotateZ: stackTarget.rotate,
                  opacity: 0
                }
              : {
                  x: stackTarget.x,
                  y: stackTarget.y + DEAL_SLIDE + DEAL_GAP,
                  rotateZ: stackTarget.rotate,
                  opacity: 1
                }
            : {
                x: target.x,
                y: target.y,
                rotateZ: target.rotate,
                opacity: cardOpacity
              };
          const extractionTransition = isExtracting
            ? dealPhase === "animating"
              ? { duration: DEAL_DURATION, ease: "easeInOut" }
              : { duration: 0.001 }
            : transition;

          return (
            <motion.img
              key={`card-${index}`}
              src={backSrc}
              alt=""
              initial={{
                x: fanTarget.x,
                y: fanTarget.y,
                rotateZ: fanTarget.rotate
              }}
              className={`deck-card card-${index} absolute h-56 w-36 rounded-xl object-cover tarot-card-shadow`}
              style={{
                zIndex: isExtracting ? zLayers[index] + 200 : zLayers[index],
                imageRendering: "auto",
                backfaceVisibility: "hidden",
                willChange: "transform"
              }}
              animate={animateTarget}
              transition={extractionTransition}
            />
          );
        })}
      </motion.div>
    </div>
  );
});
