export type DeckId =
  | "rws"
  | "lenormand"
  | "manara"
  | "angels"
  | "golden"
  | "ancestry"
  | "metaphoric";

export interface DeckSpread {
  id: string;
  title: string;
  description: string;
}

export interface Deck {
  id: DeckId;
  title: string;
  subtitle?: string;
  description: string;
  cover?: string;
  spreads: DeckSpread[];
}

function createSpreads(): DeckSpread[] {
  return Array.from({ length: 7 }).map((_, index) => ({
    id: `spread-${index + 1}`,
    title: `Расклад ${index + 1}`,
    description: "Краткое описание расклада. Заглушка."
  }));
}

import { LENORMAND_SPREADS } from "./lenormand_spreads";
import { RWS_SPREADS } from "./rws_spreads";

export const DECKS: Deck[] = [
  {
    id: "rws",
    title: "Классическая — Уэйта-Смита",
    subtitle: "Психология, путь, выбор",
    description: "Классическая система для анализа состояний, мотивации и направлений.",
    spreads: RWS_SPREADS.map((spread) => ({
      id: spread.id,
      title: spread.title,
      description: spread.description
    }))
  },
  {
    id: "lenormand",
    title: "Таро Ленорман",
    subtitle: "Событийность, факты",
    description: "Более приземленные ответы и событийные акценты.",
    spreads: LENORMAND_SPREADS.map((spread) => ({
      id: spread.id,
      title: spread.title,
      description: spread.description
    }))
  },
  {
    id: "manara",
    title: "Таро Манара",
    subtitle: "Отношения, желания",
    description: "Глубина чувств, тени, межличностные динамики.",
    spreads: createSpreads()
  },
  {
    id: "angels",
    title: "Таро Ангелов",
    subtitle: "Поддержка, исцеление",
    description: "Мягкая оптика, советы и ресурсные подсказки.",
    spreads: createSpreads()
  },
  {
    id: "golden",
    title: "Золотое Таро",
    subtitle: "Классика с изящием",
    description: "Элегантная визуальная подача и ясные интерпретации.",
    spreads: createSpreads()
  },
  {
    id: "ancestry",
    title: "Сила Рода",
    subtitle: "Корни, родовые сценарии",
    description: "Про наследуемые паттерны и ресурс предков.",
    spreads: createSpreads()
  },
  {
    id: "metaphoric",
    title: "Метафорические карты",
    subtitle: "Ассоциации, инсайты",
    description: "Проекции и художественные метафоры для саморефлексии.",
    spreads: createSpreads()
  }
];
