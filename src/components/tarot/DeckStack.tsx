import { memo, useMemo } from "react";
import type { RefObject } from "react";

interface DeckStackProps {
  backSrc: string;
  mode: "fan" | "stack";
  fanCount?: number;
  dealCount?: number;
  fanCenterRef?: RefObject<HTMLDivElement>;
}

const DEFAULT_FAN = 21;
const DEFAULT_DEAL = 1;

export const DeckStack = memo(function DeckStack({
  backSrc,
  mode,
  fanCount = DEFAULT_FAN,
  dealCount = DEFAULT_DEAL,
  fanCenterRef
}: DeckStackProps) {
  const fanCards = useMemo(() => Array.from({ length: fanCount }), [fanCount]);
  const pileLeft = fanCards.slice(0, Math.ceil(fanCount / 2));
  const pileRight = fanCards.slice(Math.ceil(fanCount / 2));
  const edges = useMemo(() => Array.from({ length: 18 }), []);
  const dealPlaceholders = useMemo(() => Array.from({ length: dealCount }), [dealCount]);

  return (
    <div className="deck-root relative flex h-[320px] w-full items-center justify-center">
      <div
        id="fan"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          mode === "fan" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          id="fanCenter"
          ref={fanCenterRef}
          className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 opacity-0"
        />
        {fanCards.map((_, index) => {
          const t = fanCount === 1 ? 0.5 : index / (fanCount - 1);
          const spread = 280;
          const x = (t - 0.5) * spread;
          const rotation = (t - 0.5) * 35;
          const y = Math.abs(t - 0.5) * -14;
          return (
            <img
              key={`fan-${index}`}
              src={backSrc}
              className={`fan-card fan-card-${index} absolute h-56 w-36 rounded-xl object-cover shadow-xl shadow-black/40`}
              style={{
                transform: `translateX(${x}px) translateY(${y}px) rotateZ(${rotation}deg)`,
                zIndex: index,
                imageRendering: "auto",
                backfaceVisibility: "hidden",
                willChange: "transform"
              }}
              alt=""
            />
          );
        })}
      </div>

      <div
        id="stack"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          mode === "stack" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div id="stackCore" className="relative h-56 w-36">
          <div className="absolute inset-0 z-0">
            {edges.map((_, index) => (
              <div
                key={`edge-${index}`}
                className="stack-edge absolute rounded-sm bg-black/35 blur-[0.5px]"
                style={{
                  height: "88%",
                  width: "6px",
                  left: "50%",
                  top: "6%",
                  marginLeft: (index - edges.length / 2) * 0.6,
                  transform: `translateZ(${index * 0.6}px)`
                }}
              />
            ))}
          </div>
            <img
              src={backSrc}
              className="relative z-20 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
              style={{ imageRendering: "auto", backfaceVisibility: "hidden", willChange: "transform" }}
              alt=""
            />
          <div
            className="pile-left pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0 }}
          >
            {pileLeft.map((_, index) => (
              <img
                key={`pile-left-${index}`}
                src={backSrc}
                className="absolute z-10 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
                style={{
                  transform: `translateY(${index * -2}px)`,
                  opacity: 0.95 - index * 0.05,
                  imageRendering: "auto",
                  backfaceVisibility: "hidden",
                  willChange: "transform"
                }}
                alt=""
              />
            ))}
          </div>
          <div
            className="pile-right pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0 }}
          >
            {pileRight.map((_, index) => (
              <img
                key={`pile-right-${index}`}
                src={backSrc}
                className="absolute z-10 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
                style={{
                  transform: `translateY(${index * -2}px)`,
                  opacity: 0.95 - index * 0.05,
                  imageRendering: "auto",
                  backfaceVisibility: "hidden",
                  willChange: "transform"
                }}
                alt=""
              />
            ))}
          </div>
        </div>
      </div>

      <div
        id="dealArea"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {dealPlaceholders.map((_, index) => (
          <img
            key={`deal-card-${index}`}
            src={backSrc}
            className={`deal-card deal-card-${index} h-56 w-36 rounded-xl object-cover opacity-0 shadow-2xl shadow-black/50`}
            style={{
              transform: "translateY(0px)",
              imageRendering: "auto",
              backfaceVisibility: "hidden",
              willChange: "transform"
            }}
            alt=""
          />
        ))}
      </div>
    </div>
  );
});
