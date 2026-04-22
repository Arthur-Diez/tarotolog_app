import { motion } from "framer-motion";

import CardFaceImage from "@/components/tarot/CardFaceImage";

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
  const flipTransition = {
    duration: isOpen ? 0.88 : 0.36,
    ease: [0.22, 1, 0.36, 1]
  } as const;

  const faceTransition = {
    duration: isOpen ? 0.64 : 0.28,
    ease: [0.2, 0.95, 0.3, 1]
  } as const;

  const cardAnimate = isOpen
    ? reversed
      ? {
          rotateY: [0, 188, 180],
          rotateZ: [0, 2, -1.5],
          y: [0, -3, 0],
          scale: [1, 1.014, 1]
        }
      : {
          rotateY: [0, 196, 180],
          rotateZ: [0, -2, 0],
          y: [0, -6, 0],
          scale: [1, 1.02, 1]
        }
    : { rotateY: 0, rotateZ: 0, x: 0, y: 0, scale: 1 };

  const faceAnimate = isOpen
    ? reversed
      ? {
          rotateZ: [168, 186, 180],
          scale: [0.985, 1.018, 1],
          y: [-2, 1, 0],
          filter: [
            "brightness(0.96) saturate(0.98)",
            "brightness(1.08) saturate(1.04)",
            "brightness(1) saturate(1)"
          ]
        }
      : {
          rotateZ: [-8, 2, 0],
          scale: [0.99, 1.02, 1],
          y: [-4, 1, 0],
          filter: [
            "brightness(0.98) saturate(0.98)",
            "brightness(1.06) saturate(1.03)",
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
          opacity: [0, 0.42, 0.1, 0],
          scale: [0.9, 1.08, 1.02, 1],
          filter: [
            "blur(14px)",
            "blur(18px)",
            "blur(16px)",
            "blur(14px)"
          ]
        }
      : {
          opacity: [0, 0.32, 0.08, 0],
          scale: [0.92, 1.05, 1.01, 1],
          filter: [
            "blur(12px)",
            "blur(16px)",
            "blur(14px)",
            "blur(12px)"
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
