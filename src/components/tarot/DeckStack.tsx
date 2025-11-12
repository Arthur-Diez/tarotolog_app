import { memo, useMemo } from "react";

interface DeckStackProps {
  backSrc: string;
  fanCount?: number;
  dealCount?: number;
}

export const DeckStack = memo(function DeckStack({
  backSrc,
  fanCount = 21,
  dealCount = 1
}: DeckStackProps) {
  const fanCards = useMemo(() => Array.from({ length: fanCount }), [fanCount]);
  const dealCards = useMemo(() => Array.from({ length: dealCount }), [dealCount]);
  const edges = useMemo(() => Array.from({ length: 20 }), []);

  return (
    <div className="relative flex h-[320px] w-full items-center justify-center">
      <div id="fan" className="fan pointer-events-none absolute inset-0 flex items-center justify-center">
        {fanCards.map((_, index) => {
          const t = fanCount === 1 ? 0.5 : index / (fanCount - 1);
          const spread = 280;
          const x = (t - 0.5) * spread;
          const rotation = (t - 0.5) * 35;
          const y = Math.abs(t - 0.5) * -12;
          return (
            <img
              key={`fan-${index}`}
              src={backSrc}
              className={`fan-card fan-card-${index} absolute h-56 w-36 rounded-xl object-cover shadow-xl shadow-black/40`}
              style={{
                transform: `translateX(${x}px) translateY(${y}px) rotateZ(${rotation}deg)`,
                zIndex: index
              }}
              alt=""
            />
          );
        })}
      </div>

      <div
        id="stack"
        className="stack pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 scale-95"
      >
        <div className="relative h-56 w-36" id="deckStack">
          <div className="pile pile-left absolute inset-0 flex items-center justify-center">
            {fanCards.slice(0, fanCount / 2).map((_, index) => (
              <img
                key={`left-${index}`}
                src={backSrc}
                className="absolute h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
                style={{
                  transform: `translateY(${index * -2}px)`,
                  opacity: 0.95 - index * 0.05,
                  zIndex: index
                }}
                alt=""
              />
            ))}
          </div>
          <div className="pile pile-right absolute inset-0 flex items-center justify-center">
            {fanCards.slice(fanCount / 2).map((_, index) => (
              <img
                key={`right-${index}`}
                src={backSrc}
                className="absolute h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
                style={{
                  transform: `translateY(${index * -2}px)`,
                  opacity: 0.95 - index * 0.05,
                  zIndex: index
                }}
                alt=""
              />
            ))}
          </div>
          <div className="stack-core relative h-full w-full">
            <img
              src={backSrc}
              className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
              alt=""
            />
            {edges.map((_, index) => (
              <div
                key={`edge-${index}`}
                className="stack-edge absolute rounded-sm bg-black/30 blur-[0.5px]"
                style={{
                  height: "88%",
                  width: "6px",
                  left: "50%",
                  top: "6%",
                  marginLeft: -3 + (index - 10) * 0.4,
                  transform: `translateZ(${index * 0.7}px)`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        id="dealArea"
        className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6"
      >
        {dealCards.map((_, index) => (
          <img
            key={`deal-${index}`}
            src={backSrc}
            className="deal-card h-56 w-36 opacity-0"
            style={{
              transform: `translateY(${index * -6}px)`,
              zIndex: 100 + dealCount - index
            }}
            alt=""
          />
        ))}
      </div>
    </div>
  );
});
