import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import CardFaceImage from "@/components/tarot/CardFaceImage";
import { faceUrlCandidates } from "@/lib/cardAsset";

interface DealtCardProps {
  backSrc: string;
  deckId: string;
  faceName: string;
  isOpen: boolean;
  reversed?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function DealtCard({
  backSrc,
  deckId,
  faceName,
  isOpen,
  reversed = false,
  className = "",
  onClick
}: DealtCardProps) {
  const faceCandidates = useMemo(() => faceUrlCandidates(deckId, faceName), [deckId, faceName]);
  const [preloadedFaceSrc, setPreloadedFaceSrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    setPreloadedFaceSrc(null);

    const tryLoad = (index: number) => {
      if (cancelled || index >= faceCandidates.length) return;
      const src = faceCandidates[index];
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (!cancelled) setPreloadedFaceSrc(src);
      };
      image.onerror = () => {
        tryLoad(index + 1);
      };
      image.src = src;

      if (image.complete && image.naturalWidth > 0 && !cancelled) {
        setPreloadedFaceSrc(src);
      }
    };

    tryLoad(0);

    return () => {
      cancelled = true;
    };
  }, [faceCandidates]);

  const flipTransition = {
    duration: isOpen ? 1.04 : 0.4,
    ease: [0.16, 1, 0.3, 1]
  } as const;

  const faceTransition = {
    duration: isOpen ? 0.8 : 0.3,
    ease: [0.18, 0.96, 0.28, 1]
  } as const;

  const cardAnimate = isOpen
    ? reversed
      ? {
          rotateY: [0, 186, 180],
          rotateZ: [0, 1.4, -0.9],
          y: [0, -3, 0],
          scale: [1, 1.01, 1]
        }
      : {
          rotateY: [0, 190, 180],
          rotateZ: [0, -1.4, 0],
          y: [0, -5, 0],
          scale: [1, 1.014, 1]
        }
    : { rotateY: 0, rotateZ: 0, x: 0, y: 0, scale: 1 };

  const faceAnimate = isOpen
    ? reversed
      ? {
          rotateZ: [174, 184, 180],
          scale: [0.992, 1.012, 1],
          y: [-1, 0.5, 0],
          filter: [
            "brightness(0.98) saturate(0.99)",
            "brightness(1.05) saturate(1.03)",
            "brightness(1) saturate(1)"
          ]
        }
      : {
          rotateZ: [-4, 1, 0],
          scale: [0.995, 1.014, 1],
          y: [-2.5, 0.5, 0],
          filter: [
            "brightness(0.99) saturate(0.99)",
            "brightness(1.04) saturate(1.02)",
            "brightness(1) saturate(1)"
          ]
        }
    : {
        rotateZ: 0,
        scale: 1,
        y: 0,
        filter: "brightness(1) saturate(1)"
      };

  const faceGlowAnimate = isOpen
    ? reversed
      ? {
          opacity: [0, 0.22, 0.06, 0],
          scale: [0.96, 1.04, 1.01, 1],
          filter: [
            "blur(12px)",
            "blur(15px)",
            "blur(13px)",
            "blur(12px)"
          ]
        }
      : {
          opacity: [0, 0.18, 0.05, 0],
          scale: [0.97, 1.03, 1.01, 1],
          filter: [
            "blur(10px)",
            "blur(14px)",
            "blur(12px)",
            "blur(10px)"
          ]
        }
    : {
        opacity: 0,
        scale: 1,
        filter: "blur(12px)"
      };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={`dealt-card relative z-[1000] h-60 w-36 cursor-pointer touch-manipulation [perspective:1200px] ${className}`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={cardAnimate}
        transition={flipTransition}
        style={{ willChange: "transform" }}
      >
        <img
          src={backSrc}
          alt=""
          className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-2xl [backface-visibility:hidden]"
          draggable={false}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0px)"
          }}
        />
        {isOpen ? (
          <div
            className="absolute inset-0 [backface-visibility:hidden]"
            style={{
              transform: "rotateY(180deg) translateZ(0px)",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden"
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={faceAnimate}
              transition={{
                ...faceTransition,
                delay: 0.08
              }}
              style={{ willChange: "transform, filter" }}
            >
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[6%] rounded-[22px] bg-[radial-gradient(circle_at_50%_38%,rgba(245,216,154,0.44),rgba(245,216,154,0)_68%)] mix-blend-screen"
                animate={faceGlowAnimate}
                transition={{
                  ...faceTransition,
                  delay: 0.1
                }}
                style={{ willChange: "transform, opacity, filter" }}
              />
              <CardFaceImage
                deckId={deckId}
                cardName={faceName}
                forcedSrc={preloadedFaceSrc ?? undefined}
                alt=""
                className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-2xl"
                draggable={false}
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "translateZ(0px)",
                  willChange: "transform"
                }}
              />
            </motion.div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
