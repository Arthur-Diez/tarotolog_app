import type { SpreadId } from "@/data/rws_spreads";

export interface SpreadPosition {
  id: number;
  label: string;
  x: number;
  y: number;
}

export interface SpreadSchema {
  id: SpreadId;
  name: string;
  cardCount: number;
  deckType: "rws";
  openingRules: "in-order" | "any-order";
  openOrder: number[];
  positions: SpreadPosition[];
}

export const SpreadOneCard: SpreadSchema = {
  id: "one_card",
  name: "Одна карта",
  cardCount: 1,
  deckType: "rws",
  openingRules: "any-order",
  openOrder: [1],
  positions: [{ id: 1, label: "Карта дня", x: 0, y: 0 }]
};

export const SpreadYesNo: SpreadSchema = {
  id: "yes_no",
  name: "Да или Нет",
  cardCount: 3,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3],
  positions: [
    { id: 1, label: "Фактор ДА", x: -120, y: 0 },
    { id: 2, label: "Фактор НЕТ", x: 0, y: 0 },
    { id: 3, label: "Итог", x: 120, y: 0 }
  ]
};

export const SpreadThreeCards: SpreadSchema = {
  id: "three_cards",
  name: "Три карты",
  cardCount: 3,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3],
  positions: [
    { id: 1, label: "Прошлое", x: -120, y: 0 },
    { id: 2, label: "Настоящее", x: 0, y: 0 },
    { id: 3, label: "Будущее", x: 120, y: 0 }
  ]
};

export const SPREAD_SCHEMAS: Record<SpreadId, SpreadSchema> = {
  one_card: SpreadOneCard,
  yes_no: SpreadYesNo,
  three_cards: SpreadThreeCards
};
