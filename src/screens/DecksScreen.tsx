import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
import { DeckShowcaseAnimation } from "@/components/tarot/DeckShowcaseAnimation";
import { faceUrl } from "@/lib/cardAsset";
import { DECKS, type Deck, type DeckId } from "@/data/decks";
import { resolveDeckTheme } from "@/ui/deckTheme";
import { startTransition } from "@/ui/deckTransitionStore";
import { applyDeckThemeVariables } from "@/ui/useDeckTheme";
import "./DecksScreen.css";

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
const GOLDEN_FLOW_FACE_CARDS = [
  "10 Монет",
  "11 Золотая Справедливость",
  "13 Золотая Смерть",
  "14 Золотая Умеренность",
  "16 Золотая Башня",
  "17 Золотая Звезда",
  "18 Золотая Луна",
  "19 Золотое Солнце"
];

const GOLDEN_FLOW_CARD_URLS = GOLDEN_FLOW_FACE_CARDS.map((name) => faceUrl("golden", name));
const SILA_RODA_FLOW_FACE_CARDS = [
  "0 Проявление себя",
  "1 Мудрость",
  "2 Единение",
  "5 Сила гармонии",
  "7 Сила Рода",
  "21 Изобилие",
  "34 Предназначение",
  "37 Успех"
];

const SILA_RODA_FLOW_CARD_URLS = SILA_RODA_FLOW_FACE_CARDS.map((name) => faceUrl("sila_roda", name));
const METAPHORICAL_FLOW_FACE_CARDS = [
  "Быть искренним",
  "Верить в себя",
  "Взять ответственность",
  "Взять паузу",
  "Вспомнить себя настоящего",
  "Вырастить крылья",
  "Дать волю фантазии",
  "Дать место спонтанности"
];

const METAPHORICAL_FLOW_CARD_URLS = METAPHORICAL_FLOW_FACE_CARDS.map((name) => faceUrl("metaphoric", name));

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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isPageVisible = usePageVisibility();
  const deckRefs = useRef<Partial<Record<DeckId, HTMLDivElement | null>>>({});
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const toggleDeck = (deckId: DeckId) => {
    setExpandedDeck((prev) => (prev === deckId ? null : deckId));
    navigator.vibrate?.(10);
  };

  const handleSelectDeck = (deck: Deck, sourceElement?: HTMLElement | null) => {
    if (isTransitioning) return;

    const rectSource = sourceElement ?? deckRefs.current[deck.id] ?? null;
    const theme = resolveDeckTheme(deck.id);
    const reducedMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    if (!rectSource || reducedMotion) {
      applyDeckThemeVariables(theme);
      onSelectDeck(deck.id);
      return;
    }

    const rect = rectSource.getBoundingClientRect();
    applyDeckThemeVariables(theme);
    startTransition({
      deckId: deck.id,
      title: deck.title,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
    });

    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      onSelectDeck(deck.id);
      setIsTransitioning(false);
    }, 480);
  };

  return (
    <div className="decks-screen space-y-5">
      <div className="decks-hero space-y-2">
        <h1 className="decks-hero-title text-2xl font-semibold text-[var(--text-primary)]">Колоды Таро</h1>
        <p className="decks-hero-subtitle text-sm text-[var(--text-secondary)]">
          Выберите стиль чтения и исследуйте подходящие расклады.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DECKS.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            content={getDeckContent(deck)}
            expanded={expandedDeck === deck.id}
            animationActive={expandedDeck === deck.id && isPageVisible}
            cardRef={(node) => {
              deckRefs.current[deck.id] = node;
            }}
            onToggle={() => toggleDeck(deck.id)}
            onSelect={(sourceElement) => handleSelectDeck(deck, sourceElement)}
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
  cardRef?: (node: HTMLDivElement | null) => void;
  onToggle: () => void;
  onSelect: (sourceElement?: HTMLElement | null) => void;
}

function DeckCard({ deck, content, expanded, animationActive, cardRef, onToggle, onSelect }: DeckCardProps) {
  const theme = resolveDeckTheme(deck.id);
  const portalStyle = {
    ["--deck-accent" as string]: theme.accent,
    ["--deck-glow" as string]: theme.glow,
    ["--deck-preview-glow" as string]: theme.glow
  } as CSSProperties;

  return (
    <Card
      className={`deck-portal-card isInteractive cursor-pointer rounded-[24px] p-4 transition active:opacity-95 ${expanded ? "isExpanded" : ""}`}
      ref={cardRef}
      style={portalStyle}
      role="button"
      tabIndex={0}
      onClick={(event) => onSelect(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(event.currentTarget);
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
          className="deck-card-toggle shrink-0 gap-1 text-[var(--text-primary)]"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          aria-controls={`deck-desc-${deck.id}`}
        >
          Подробнее
          <span className={`deck-card-chevron ${expanded ? "isExpanded" : ""}`}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </Button>
      </div>

      <Expander isOpen={expanded} ariaId={`deck-desc-${deck.id}`}>
        <div className="deck-expanded mt-4 space-y-4 rounded-[22px] p-4">
          <div className="deck-preview-shell">
            {deck.id === "rws" ? (
              <RwsDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : deck.id === "lenormand" ? (
              <LenormandDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : deck.id === "manara" ? (
              <ManaraDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : deck.id === "angels" ? (
              <AngelsDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : deck.id === "golden" ? (
              <GoldenDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : deck.id === "ancestry" ? (
              <SilaRodaDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : deck.id === "metaphoric" ? (
              <MetaphoricalDeckFlowPreview isActive={animationActive} className="deck-preview-frame" />
            ) : (
              <StaticDeckPreview className="deck-preview-frame" />
            )}
          </div>
          <p className="text-center text-xs text-[var(--text-tertiary)]">{content.animationCaption}</p>

          <div className="deck-chip-row" aria-label="Характер колоды">
            {theme.chips.filter(Boolean).map((chip) => (
              <span key={`${deck.id}-chip-${chip}`} className="deck-chip">
                {chip}
              </span>
            ))}
          </div>

          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {content.description.map((paragraph) => (
              <p key={`${deck.id}-${paragraph}`}>{paragraph}</p>
            ))}
          </div>

          <div className="deck-section space-y-1 text-sm text-[var(--text-secondary)]">
            <p className="deck-section-title">Для чего подходит</p>
            {content.purpose.map((line) => (
              <p key={`${deck.id}-purpose-${line}`}>{line}</p>
            ))}
          </div>

          <div className="deck-section space-y-1 text-sm text-[var(--text-secondary)]">
            <p className="deck-section-title">Особенности</p>
            {content.features.map((line) => (
              <p key={`${deck.id}-feature-${line}`}>{line}</p>
            ))}
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              onSelect((event.currentTarget.closest(".deck-portal-card") as HTMLElement | null) ?? event.currentTarget);
            }}
          >
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
      className={`rounded-[10px] object-cover shadow-[0_14px_24px_rgba(0,0,0,0.4)] deck-preview-card ${className}`}
      style={{ width: `${size}px`, height: `${Math.round(size * 1.5)}px`, ...style }}
      draggable={false}
      loading="eager"
    />
  );
}

function RwsDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={RWS_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function LenormandDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={LENORMAND_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function ManaraDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={MANARA_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function AngelsDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={ANGELS_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function GoldenDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={GOLDEN_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function SilaRodaDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={SILA_RODA_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function MetaphoricalDeckFlowPreview({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <DeckShowcaseAnimation
      cards={METAPHORICAL_FLOW_CARD_URLS}
      isActive={isActive}
      speedMs={12000}
      overlapPx={10}
      scaleMoving={1.08}
      scaleDeck={1}
      className={className}
    />
  );
}

function StaticDeckPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 ${className}`}>
      <div className="absolute h-24 w-24 rounded-full bg-[rgba(140,90,255,0.2)] blur-2xl" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[0]} size={52} className="absolute -ml-16 opacity-80" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[1]} size={52} className="absolute" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[2]} size={52} className="absolute ml-16 opacity-90" />
    </div>
  );
}
