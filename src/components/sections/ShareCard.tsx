import { forwardRef } from "react";

import "./ShareCard.css";

interface ShareCardProps {
  title: string;
  spreadTitle: string;
  deckTitle: string;
  question: string;
  headline?: string | null;
  summary: string;
  sections?: Array<{
    title: string;
    text: string;
  }>;
  cards: Array<{
    name: string;
    positionLabel: string;
    imageSrc?: string | null;
    reversed?: boolean;
    meaning?: string | null;
  }>;
}

function getSectionTone(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("риск")) return "is-risks";
  if (normalized.includes("возмож")) return "is-opportunities";
  if (normalized.includes("совет")) return "is-advice";
  if (normalized.includes("динам")) return "is-dynamics";
  if (normalized.includes("тема")) return "is-core-theme";
  return "";
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { title, spreadTitle, deckTitle, question, headline, summary, sections = [], cards },
  ref
) {
  const cardsCount = cards.length;
  const reversedCount = cards.filter((card) => card.reversed).length;
  const heroCards = cards.slice(0, Math.min(5, cards.length));

  return (
    <div ref={ref} className="share-card">
      <div className="share-card__bg" />
      <div className="share-card__inner">
        <div className="share-card__hero">
          <div className="space-y-3">
            <p className="share-card__eyebrow">Интерпретация расклада</p>
            <h1 className="share-card__title">{title}</h1>
            <p className="share-card__meta">
              {spreadTitle} • {deckTitle}
            </p>
          </div>

          <div className="share-card__chips">
            <span className="share-card__chip">{cardsCount} {cardsCount === 1 ? "карта" : cardsCount < 5 ? "карты" : "карт"}</span>
            {reversedCount > 0 ? (
              <span className="share-card__chip share-card__chip--reversed">
                {reversedCount} {reversedCount === 1 ? "перевёрнутая" : reversedCount < 5 ? "перевёрнутые" : "перевёрнутых"}
              </span>
            ) : null}
            <span className="share-card__chip share-card__chip--subtle">{deckTitle}</span>
          </div>

          {heroCards.length > 0 ? (
            <div className="share-card__card-rail">
              {heroCards.map((card, index) => (
                <div
                  key={`${card.name}-rail-${index}`}
                  className="share-card__card-rail-item"
                  style={{ zIndex: heroCards.length - index }}
                >
                  {card.imageSrc ? (
                    <img
                      src={card.imageSrc}
                      alt={card.name}
                      className={`h-full w-full object-cover ${card.reversed ? "rotate-180" : ""}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/55">
                      {card.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="share-card__section share-card__section--question">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Вопрос</p>
          <p className="mt-2 text-base text-white">{question}</p>
        </div>

        <div className="share-card__section share-card__section--summary">
          {headline ? (
            <div className="share-card__section share-card__section--headline">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Ключевой акцент</p>
              <p className="mt-2 text-base font-semibold text-white">{headline}</p>
            </div>
          ) : null}

          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Интерпретация</p>
          <p className="mt-3 text-lg font-semibold leading-relaxed text-white">{summary}</p>
        </div>

        {sections.length > 0 ? (
          <div className="share-card__analysis-grid">
            {sections.map((section) => (
              <div
                key={section.title}
                className={`share-card__analysis-card ${getSectionTone(section.title)}`.trim()}
              >
                <p className="text-xs uppercase tracking-[0.28em] text-white/60">{section.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/85">{section.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="share-card__section share-card__section--cards">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Карты</p>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="share-card__chip share-card__chip--subtle">
                {cardsCount} {cardsCount === 1 ? "позиция" : cardsCount < 5 ? "позиции" : "позиций"}
              </span>
              {reversedCount > 0 ? (
                <span className="share-card__chip share-card__chip--reversed">
                  {reversedCount} {reversedCount === 1 ? "перевёрнутая" : reversedCount < 5 ? "перевёрнутые" : "перевёрнутых"}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            {cards.map((card, index) => (
              <div key={`${card.name}-${index}`} className="share-card__card-item">
                <div className="flex gap-4">
                  {card.imageSrc ? (
                    <img
                      src={card.imageSrc}
                      alt={card.name}
                      className={`h-40 w-28 rounded-[18px] object-cover shadow-[0_14px_34px_rgba(0,0,0,0.42)] ${
                        card.reversed ? "rotate-180" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-40 w-28 items-center justify-center rounded-[18px] border border-white/15 bg-white/10 text-xs text-white/60">
                      {card.name}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[30px] font-semibold leading-tight text-white">{card.name}</p>
                    <div className="share-card__card-meta">
                      <span className="share-card__chip share-card__chip--subtle">Позиция {index + 1}</span>
                      <span className="share-card__chip share-card__chip--subtle">{card.positionLabel}</span>
                      {card.reversed ? (
                        <span className="share-card__chip share-card__chip--reversed">Перевёрнутая</span>
                      ) : null}
                    </div>
                    {card.meaning ? <p className="mt-4 text-sm leading-relaxed text-white/90">{card.meaning}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="share-card__footer">
          <div>
            <p className="text-xl font-semibold text-white">Tarotolog AI</p>
            <p className="mt-1 text-sm text-white/70">Персональные расклады в mini app</p>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/55">@Tarotolog_bot</p>
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
