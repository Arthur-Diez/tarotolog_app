import { forwardRef } from "react";

interface ShareCardProps {
  title: string;
  spreadTitle: string;
  deckTitle: string;
  question: string;
  summary: string;
  cards: Array<{
    name: string;
    positionLabel: string;
    imageSrc?: string | null;
    reversed?: boolean;
  }>;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { title, spreadTitle, deckTitle, question, summary, cards },
  ref
) {
  return (
    <div
      ref={ref}
      className="w-[900px] rounded-[32px] border border-white/15 bg-[radial-gradient(circle_at_top,_#2d1f58,_#0b0f1f)] p-10 text-white shadow-[0_50px_120px_rgba(0,0,0,0.65)]"
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-white/70">Интерпретация расклада</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-white/70">
          {spreadTitle} • {deckTitle}
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Вопрос</p>
        <p className="mt-2 text-base text-white">{question}</p>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Интерпретация</p>
        <p className="mt-3 text-lg font-semibold leading-relaxed text-white">{summary}</p>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">Карты</p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {cards.map((card, index) => (
            <div
              key={`${card.name}-${index}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-center"
            >
              {card.imageSrc ? (
                <img
                  src={card.imageSrc}
                  alt={card.name}
                  className="h-40 w-28 rounded-xl object-cover shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="flex h-40 w-28 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xs text-white/60">
                  {card.name}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{card.name}</p>
                <p className="text-xs text-white/70">
                  {card.positionLabel}
                  {card.reversed ? " • Перевёрнута" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-right text-xs uppercase tracking-[0.3em] text-white/50">@Tarotolog_bot</p>
    </div>
  );
});

export default ShareCard;
