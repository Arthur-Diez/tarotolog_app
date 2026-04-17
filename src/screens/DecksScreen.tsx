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
  subtitle: string;
  badge?: string;
  tags: string[];
  shortDescription: string;
  microPrompt: string;
  fullDescription: string;
  bestFor: string[];
  outcome: string;
  cta: string;
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
    subtitle: "Архетипы, структура, ясность",
    badge: "Популярная база",
    tags: ["База", "Универсально", "Глубоко"],
    shortDescription: "Главная система Таро для точных, многослойных и понятных раскладов.",
    microPrompt: "Когда нужен серьёзный и точный ответ почти на любую тему.",
    fullDescription:
      "Классическая колода, на которой строится большая часть современной таро-практики. Она помогает увидеть суть ситуации, скрытые влияния, внутренние мотивы и направление развития событий. Если нужен сильный, универсальный и глубокий ответ, это лучший старт.",
    bestFor: ["отношений и чувств", "внутренних состояний", "решений и выбора", "жизненных поворотов", "самопознания"],
    outcome: "Чёткая структура ситуации, глубина и ощущение точного попадания в запрос.",
    cta: "Исследовать классические расклады",
    animationCaption: "Архетипы раскрываются перед вами."
  },
  lenormand: {
    subtitle: "Факты, события, конкретика",
    badge: "Самый конкретный ответ",
    tags: ["Конкретно", "События", "Практично"],
    shortDescription: "Для вопросов, где важны реальные события, действия людей и ближайшее развитие ситуации.",
    microPrompt: "Когда хочется меньше абстракции и больше жизненной конкретики.",
    fullDescription:
      "Ленорман говорит проще, конкретнее и ближе к повседневной реальности. Эта система хорошо показывает, что происходит вокруг, какие люди и обстоятельства влияют на вас, и как ситуация может развернуться в ближайшее время.",
    bestFor: [
      "повседневных вопросов",
      "отношений и общения",
      "работы и денег",
      "событий ближайшего периода",
      "понимания намерений другого человека"
    ],
    outcome: "Прямой, практичный и понятный ответ с акцентом на реальные события.",
    cta: "Посмотреть событийные расклады",
    animationCaption: "События складываются в ясную линию."
  },
  manara: {
    subtitle: "Притяжение, эмоции, желания",
    badge: "Лучше всего для отношений",
    tags: ["Отношения", "Чувства", "Химия"],
    shortDescription: "Колода для любви, сексуальности, скрытых чувств и живой динамики между людьми.",
    microPrompt: "Когда вопрос про любовь, дистанцию, ревность или притяжение.",
    fullDescription:
      "Манара особенно сильна там, где речь идёт о чувствах, желаниях, эмоциональной близости и напряжении между людьми. Она показывает не только внешнюю картину отношений, но и скрытое влечение, страхи, ожидания и тонкую психологию контакта.",
    bestFor: [
      "романтических отношений",
      "любовных треугольников",
      "скрытых чувств",
      "сексуальной динамики",
      "эмоциональной привязанности"
    ],
    outcome: "Чувственный, честный и психологически точный взгляд на отношения.",
    cta: "Открыть расклады на отношения",
    animationCaption: "Чувства и мотивы выходят на поверхность."
  },
  angels: {
    subtitle: "Поддержка, исцеление, мягкость",
    badge: "Самый мягкий формат",
    tags: ["Поддержка", "Спокойствие", "Исцеление"],
    shortDescription: "Для мягких подсказок, внутренней опоры и бережного прохождения сложного периода.",
    microPrompt: "Когда тяжело, тревожно и нужен не жёсткий прогноз, а поддержка.",
    fullDescription:
      "Эта колода не давит и не обостряет. Она помогает услышать поддерживающее послание, почувствовать внутреннюю опору и увидеть, куда направить внимание, чтобы пройти период спокойнее и чище.",
    bestFor: [
      "эмоционального восстановления",
      "тревожных состояний",
      "поиска поддержки",
      "духовной настройки",
      "вопросов о внутреннем ресурсе"
    ],
    outcome: "Тёплый, поддерживающий и исцеляющий тон без резкости.",
    cta: "Получить мягкое послание",
    animationCaption: "Мягкие подсказки собираются в опору."
  },
  golden: {
    subtitle: "Классика, статус, эстетика",
    badge: "Премиальный формат",
    tags: ["Эстетика", "Премиум", "Классика"],
    shortDescription: "Классическое чтение в более изящной, благородной и визуально насыщенной подаче.",
    microPrompt: "Когда хочется классики, но в более красивом и премиальном формате.",
    fullDescription:
      "Золотое Таро подойдёт тем, кому близка классическая система, но хочется более красивого, статусного и атмосферного переживания расклада. По смыслу оно остаётся глубоким и универсальным, но ощущается как более торжественный опыт.",
    bestFor: [
      "универсальных вопросов",
      "важных жизненных решений",
      "красивых ритуальных раскладов",
      "личных инсайтов",
      "эстетичного premium-опыта"
    ],
    outcome: "Глубокий ответ в более выразительном и дорогом визуальном стиле.",
    cta: "Открыть премиальные расклады",
    animationCaption: "Классика раскрывается в более торжественной подаче."
  },
  ancestry: {
    subtitle: "Корни, сценарии, родовая память",
    badge: "Для глубоких причин",
    tags: ["Род", "Сценарии", "Глубинно"],
    shortDescription: "Для вопросов о повторяющихся сценариях, семейных узлах и глубинных причинах происходящего.",
    microPrompt: "Когда проблема повторяется и причина ощущается глубже текущих обстоятельств.",
    fullDescription:
      "Эта колода помогает смотреть глубже личной истории: в родовые влияния, повторяющиеся сценарии, семейные связи и внутренние установки, пришедшие из системы рода. Её стоит выбирать, когда хочется дойти до корня.",
    bestFor: ["родовых сценариев", "семейных тем", "внутренних запретов и страхов", "повторяющихся отношений", "поиска глубинной причины"],
    outcome: "Глубокий взгляд на скрытые источники ситуации и повторяющиеся паттерны.",
    cta: "Исследовать родовые расклады",
    animationCaption: "Глубинные связи рода постепенно проявляются."
  },
  metaphoric: {
    subtitle: "Ассоциации, инсайты, внутренний диалог",
    badge: "Для саморефлексии",
    tags: ["Инсайт", "Мягко", "Саморефлексия"],
    shortDescription: "Не про предсказание, а про честный контакт с собой, чувствами и внутренними образами.",
    microPrompt: "Когда нужен не прогноз, а личный инсайт и новый взгляд на ситуацию.",
    fullDescription:
      "Метафорические карты работают через ассоциации, ощущения и личные смыслы. Это инструмент для самопознания, эмоциональной глубины и поиска решений через образы, а не через жёсткое предсказание.",
    bestFor: ["самопознания", "эмоциональных состояний", "внутренних блоков", "поиска решений через образы", "дневниковых и терапевтических практик"],
    outcome: "Личный инсайт, новое ощущение ситуации и более глубокий контакт с собой.",
    cta: "Открыть ассоциативные расклады",
    animationCaption: "Образы собираются в личный инсайт."
  }
};

function getDeckContent(deck: Deck): DeckContent {
  const custom = DECK_CONTENT[deck.id];
  if (custom) return custom;
  return {
    subtitle: deck.subtitle ?? "Символическая система чтения",
    tags: ["Интуиция", "Расклад", "Символы"],
    shortDescription: deck.description,
    microPrompt: "Когда хочется выбрать колоду по ощущению и типу ответа.",
    fullDescription: deck.description,
    bestFor: ["личных вопросов", "поиска инсайта", "интуитивного выбора"],
    outcome: "Новый взгляд на ситуацию и более точный выбор расклада.",
    cta: "Исследовать расклады этой колоды",
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
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{content.subtitle}</p>
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

      <div className="mt-4 space-y-3">
        <div className="deck-meta-row" aria-label="Позиционирование колоды">
          {content.badge ? <span className="deck-badge">{content.badge}</span> : null}
          {content.tags.map((tag) => (
            <span key={`${deck.id}-tag-${tag}`} className="deck-chip">
              {tag}
            </span>
          ))}
        </div>

        <p className="text-sm leading-6 text-[var(--text-primary)]/92">{content.shortDescription}</p>
        <p className="deck-micro-prompt">{content.microPrompt}</p>
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

          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p className="text-[var(--text-primary)]/90">{content.shortDescription}</p>
            <div className="deck-section">
              <p className="deck-section-title">Когда выбрать</p>
              <p>{content.microPrompt}</p>
            </div>
            <p>{content.fullDescription}</p>
          </div>

          <div className="deck-section space-y-2 text-sm text-[var(--text-secondary)]">
            <p className="deck-section-title">Для чего подходит</p>
            <ul className="deck-bullet-list">
              {content.bestFor.map((item) => (
                <li key={`${deck.id}-best-for-${item}`}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="deck-section space-y-1 text-sm text-[var(--text-secondary)]">
            <p className="deck-section-title">Что вы получите</p>
            <p>{content.outcome}</p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              onSelect((event.currentTarget.closest(".deck-portal-card") as HTMLElement | null) ?? event.currentTarget);
            }}
          >
            {content.cta}
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
    <div
      className={`relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-chip-bg)] ${className}`}
    >
      <div className="absolute h-24 w-24 rounded-full bg-[rgba(140,90,255,0.2)] blur-2xl" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[0]} size={52} className="absolute -ml-16 opacity-80" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[1]} size={52} className="absolute" />
      <FaceCard name={RWS_FLOW_FACE_CARDS[2]} size={52} className="absolute ml-16 opacity-90" />
    </div>
  );
}
