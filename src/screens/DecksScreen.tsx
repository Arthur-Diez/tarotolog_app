import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
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
          {deck.id === "rws" ? <RwsDeckFlowPreview isActive={animationActive} /> : <StaticDeckPreview />}
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

interface FlowCard {
  id: number;
  name: string;
}

interface DeckFlowState {
  left: FlowCard[];
  lane: FlowCard[];
  right: FlowCard[];
}

const FLOW_STEP_MS = 12000;
const FLOW_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const FLOW_LANE_X = [16, 45, 73];

function createFlowState(nextId: { current: number }): DeckFlowState {
  const takeCard = (index: number): FlowCard => {
    const id = nextId.current++;
    const name = RWS_FLOW_FACE_CARDS[index % RWS_FLOW_FACE_CARDS.length];
    return { id, name };
  };

  return {
    left: [takeCard(0), takeCard(1), takeCard(2), takeCard(3)],
    lane: [takeCard(5), takeCard(6), takeCard(7)],
    right: [takeCard(8), takeCard(9), takeCard(10), takeCard(11)]
  };
}

function advanceFlowState(prev: DeckFlowState): DeckFlowState {
  const outgoingLeftTop = prev.left[prev.left.length - 1];
  const movingIntoRightTop = prev.lane[prev.lane.length - 1];
  const recycledFromRightBottom = prev.right[0];

  return {
    left: [recycledFromRightBottom, ...prev.left.slice(0, -1)],
    lane: [outgoingLeftTop, prev.lane[0], prev.lane[1]],
    right: [...prev.right.slice(1), movingIntoRightTop]
  };
}

function RwsDeckFlowPreview({ isActive }: { isActive: boolean }) {
  const nextIdRef = useRef(1);
  const [flow, setFlow] = useState<DeckFlowState>(() => createFlowState(nextIdRef));

  useEffect(() => {
    if (!isActive) return undefined;
    const tick = () => {
      setFlow((prev) => advanceFlowState(prev));
    };
    const start = window.setTimeout(tick, 280);
    const timer = window.setInterval(() => {
      tick();
    }, FLOW_STEP_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [isActive]);

  return (
    <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(140,90,255,0.22)] blur-2xl" />

      <div className="absolute left-[16%] top-1/2 z-[2] h-[84px] w-[56px] -translate-x-1/2 -translate-y-1/2">
        {flow.left.map((card, index) => (
          <motion.div
            key={`left-${card.id}`}
            className="absolute"
            initial={false}
            animate={{ x: index * 0.65, y: (flow.left.length - 1 - index) * 1.6 }}
            transition={{ duration: 1.35, ease: FLOW_EASE }}
            style={{ zIndex: index + 1 }}
          >
            <FaceCard name={card.name} size={52} className={index < flow.left.length - 2 ? "opacity-85" : ""} />
          </motion.div>
        ))}
      </div>

      <div className="absolute left-[84%] top-1/2 z-[2] h-[84px] w-[56px] -translate-x-1/2 -translate-y-1/2">
        {flow.right.map((card, index) => (
          <motion.div
            key={`right-${card.id}`}
            className="absolute"
            initial={false}
            animate={{ x: index * 0.65, y: (flow.right.length - 1 - index) * 1.6 }}
            transition={{ duration: 1.35, ease: FLOW_EASE }}
            style={{ zIndex: index + 1 }}
          >
            <FaceCard name={card.name} size={52} className={index < flow.right.length - 2 ? "opacity-85" : ""} />
          </motion.div>
        ))}
      </div>

      <div className="absolute inset-0 z-[3]">
        {flow.lane.map((card, index) => (
          <motion.div
            key={`lane-${card.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            initial={false}
            animate={{ left: `${FLOW_LANE_X[index]}%`, top: "50%" }}
            transition={{
              duration: isActive ? FLOW_STEP_MS / 1000 : 0.2,
              ease: isActive ? "linear" : FLOW_EASE
            }}
            style={{ zIndex: 20 + index }}
          >
            <FaceCard name={card.name} size={48} />
          </motion.div>
        ))}
      </div>
    </div>
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
