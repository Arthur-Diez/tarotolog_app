import { type CSSProperties, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
import { DeckShowcaseAnimation } from "@/components/tarot/DeckShowcaseAnimation";
import { faceUrl } from "@/lib/cardAsset";
import { DECKS, type Deck, type DeckId } from "@/data/decks";

interface DecksScreenProps {
  onSelectDeck: (deckId: DeckId) => void;
}

interface DeckContent {
  positioning: string;
  description: string[];
  purpose: string[];
  features: string[];
  animationCaption: string;
}

const RWS_FLOW_FACE_CARDS = [
  "Король Жезлов",
  "Семерка Кубков",
  "Туз Жезлов",
  "Восьмерка Кубков",
  "Шестерка Жезлов",
  "Семерка Жезлов",
  "Восьмерка Жезлов",
  "Шестерка Кубков"
];

const RWS_FLOW_CARD_URLS = RWS_FLOW_FACE_CARDS.map((name) => faceUrl("rws", name));

const LENORMAND_FLOW_FACE_CARDS = [
  "Всадник (1)",
  "Клевер (2)",
  "Корабль (3)",
  "Дом (4)",
  "Дерево (5)",
  "Тучи (6)",
  "Сердце (24)",
  "Ключ (33)"
];

const LENORMAND_FLOW_CARD_URLS = LENORMAND_FLOW_FACE_CARDS.map((name) => faceUrl("lenormand", name));

const MANARA_FLOW_FACE_CARDS = [
  "0 Шут (Манара)",
  "1 Маг (Манара)",
  "3 Императрица (Манара)",
  "6 Влюбленные (Манара)",
  "10 Колесо Фортуны (Манара)",
  "14 Умеренность (Манара)",
  "17 Звезда (Манара)",
  "19 Солнце (Манара)"
];

const MANARA_FLOW_CARD_URLS = MANARA_FLOW_FACE_CARDS.map((name) => faceUrl("manara", name));

const ANGELS_FLOW_FACE_CARDS = [
  "0 Шут (Vehuiah)",
  "1 Маг (Nithhaiah)",
  "2 Верховная Жрица (Ielahiah)",
  "3 Императрица (Mihael)",
  "6 Влюбленные (Haniel)",
  "17 Звезда (Vasariah)",
  "19 Солнце (Mehiel)",
  "21 Мир (Damabiah)"
];

const ANGELS_FLOW_CARD_URLS = ANGELS_FLOW_FACE_CARDS.map((name) => faceUrl("angels", name));

const DECK_CONTENT: Partial<Record<DeckId, DeckContent>> = {
  rws: {
    positioning: "Фундаментальная система символов и архетипов",
    description: [
      "Фундаментальная система Таро, ставшая основой большинства современных колод.",
      "Колода раскрывает архетипы человеческой психики через глубокую символику и чёткую структуру.",
      "Каждая карта отражает внутренний процесс, выбор или этап пути."
    ],
    purpose: [
      "✔ Психологический анализ",
      "✔ Отношения и внутренние процессы",
      "✔ Стратегические расклады",
      "✔ Саморазвитие"
    ],
    features: ["• 78 карт", "• 22 Старших Аркана", "• 56 Младших Арканов", "• Многослойная символика"],
    animationCaption: "Архетипы раскрываются перед вами."
  }
};

function getDeckContent(deck: Deck): DeckContent {
  const custom = DECK_CONTENT[deck.id];
  if (custom) return custom;
  return {
    positioning: deck.subtitle ?? "Символическая система чтения",
    description: [deck.description],
    purpose: ["✔ Быстрые ответы на текущие вопросы", "✔ Исследование внутренних состояний", "✔ Работа с интуицией"],
    features: [`• ${deck.spreads.length} раскладов`, "• Интуитивная работа с образами"],
    animationCaption: "Выберите колоду, которая откликается сейчас."
  };
}

function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onChange = () => setIsVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return isVisible;
}

export function DecksScreen({ onSelectDeck }: DecksScreenProps) {
  const [expandedDeck, setExpandedDeck] = useState<DeckId | null>(null);
  const isPageVisible = usePageVisibility();

  const toggleDeck = (deckId: DeckId) => {
    setExpandedDeck((prev) => (prev === deckId ? null : deckId));
    navigator.vibrate?.(10);
  };

  const handleSelectDeck = (deckId: DeckId) => {
    onSelectDeck(deckId);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Колоды Таро</h1>
        <p className="text-sm text-[var(--text-secondary)]">Выберите стиль чтения и исследуйте подходящие расклады.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DECKS.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            content={getDeckContent(deck)}
            expanded={expandedDeck === deck.id}
            animationActive={expandedDeck === deck.id && isPageVisible}
            onToggle={() => toggleDeck(deck.id)}
            onSelect={() => handleSelectDeck(deck.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DeckCardProps {
  deck: Deck;
  content: DeckContent;
  expanded: boolean;
  animationActive: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

function DeckCard({ deck, content, expanded, animationActive, onToggle, onSelect }: DeckCardProps) {
  return (
    <Card
      className="cursor-pointer rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)] transition active:opacity-95"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold leading-tight text-[var(--text-primary)]">{deck.title}</h2>
          <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{content.positioning}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 border-white/10 bg-[var(--bg-card-strong)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          aria-controls={`deck-desc-${deck.id}`}
        >
          Подробнее
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </Button>
      </div>

      <Expander isOpen={expanded} ariaId={`deck-desc-${deck.id}`}>
        <div className="mt-4 space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          {deck.id === "rws" ? (
            <RwsDeckFlowPreview isActive={animationActive} />
          ) : deck.id === "lenormand" ? (
            <LenormandDeckFlowPreview isActive={animationActive} />
          ) : deck.id === "manara" ? (
            <ManaraDeckFlowPreview isActive={animationActive} />
          ) : deck.id === "angels" ? (
            <AngelsDeckFlowPreview isActive={animationActive} />
          ) : (
            <StaticDeckPreview />
          )}
          <p className="text-center text-xs text-[var(--text-tertiary)]">{content.animationCaption}</p>

          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {content.description.map((paragraph) => (
              <p key={`${deck.id}-${paragraph}`}>{paragraph}</p>
            ))}
          </div>

          <div className="space-y-1 text-sm text-[var(--text-secondary)]">
            <p className="text-sm font-medium text-[var(--text-primary)]">Для чего подходит</p>
            {content.purpose.map((line) => (
              <p key={`${deck.id}-purpose-${line}`}>{line}</p>
            ))}
          </div>

          <div className="space-y-1 text-sm text-[var(--text-secondary)]">
            <p className="text-sm font-medium text-[var(--text-primary)]">Особенности</p>
            {content.features.map((line) => (
              <p key={`${deck.id}-feature-${line}`}>{line}</p>
            ))}
          </div>

          <Button type="button" className="w-full" onClick={onSelect}>
            Исследовать расклады этой колоды
          </Button>
        </div>
      </Expander>
    </Card>
  );
}

function FaceCard({ name, size = 56, className = "", style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={faceUrl("rws", name)}
      alt={name}
      className={`rounded-[10px] object-cover shadow-[0_14px_24px_rgba(0,0,0,0.4)] ${className}`}
      style={{ width: `${size}px`, height: `${Math.round(size * 1.5)}px`, ...style }}
      draggable={false}
      loading="eager"
    />
  );
}

function RwsDeckFlowPreview({ isActive }: { isActive: boolean }) {
  return (
    <DeckShowcaseAnimation
      cards={RWS_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
    />
  );
}

function LenormandDeckFlowPreview({ isActive }: { isActive: boolean }) {
  return (
    <DeckShowcaseAnimation
      cards={LENORMAND_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
    />
  );
}

function ManaraDeckFlowPreview({ isActive }: { isActive: boolean }) {
  return (
    <DeckShowcaseAnimation
      cards={MANARA_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
    />
  );
}

function AngelsDeckFlowPreview({ isActive }: { isActive: boolean }) {
  return (
    <DeckShowcaseAnimation
      cards={ANGELS_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
    />
  );
}

function StaticDeckPreview() {
  return (
    <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="absolute h-24 w-24 rounded-full bg-[rgba(140,90,255,0.2)] blur-2xl" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[0]} size={52} className="absolute -ml-16 opacity-80" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[1]} size={52} className="absolute" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[2]} size={52} className="absolute ml-16 opacity-90" />
    </div>
  );
}
