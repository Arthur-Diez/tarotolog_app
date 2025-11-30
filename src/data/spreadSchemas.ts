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

export const SpreadCross: SpreadSchema = {
  id: "cross",
  name: "Крест",
  cardCount: 4,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4],
  positions: [
    { id: 1, label: "Суть ситуации", x: -140, y: 0 },
    { id: 2, label: "Против", x: 0, y: -160 },
    { id: 3, label: "Поддержка", x: 0, y: 160 },
    { id: 4, label: "Результат", x: 140, y: 0 }
  ]
};

export const SpreadFiveCards: SpreadSchema = {
  id: "five_cards",
  name: "Пятикарточный расклад",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Прошлое", x: 0, y: -140 },
    { id: 2, label: "Настоящее", x: -70, y: -90 },
    { id: 3, label: "Скрытые влияния", x: 70, y: -40 },
    { id: 4, label: "Совет", x: 150, y: 10 },
    { id: 5, label: "Результат", x: -150, y: 10 }
  ]
};

export const SpreadHorseshoe: SpreadSchema = {
  id: "horseshoe",
  name: "Подкова",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Прошлое", x: -160, y: -40 },
    { id: 2, label: "Настоящее", x: -80, y: 0 },
    { id: 3, label: "Скрытые влияния", x: -20, y: 60 },
    { id: 4, label: "Препятствия", x: 40, y: 100 },
    { id: 5, label: "Окружение", x: 100, y: 60 },
    { id: 6, label: "Совет", x: 140, y: 0 },
    { id: 7, label: "Результат", x: 180, y: -40 }
  ]
};

export const SpreadStar: SpreadSchema = {
  id: "star",
  name: "Звезда",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Корневая чакра", x: -160, y: -40 },
    { id: 2, label: "Сакральная чакра", x: -80, y: 0 },
    { id: 3, label: "Чакра солнечного сплетения", x: -20, y: 60 },
    { id: 4, label: "Сердечная чакра", x: 40, y: 100 },
    { id: 5, label: "Горловая чакра", x: 100, y: 60 },
    { id: 6, label: "Чакра третьего глаза", x: 140, y: 0 },
    { id: 7, label: "Коронная чакра", x: 180, y: -40 }
  ]
};

export const SpreadPyramid: SpreadSchema = {
  id: "pyramid",
  name: "Пирамида",
  cardCount: 6,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6],
  positions: [
    { id: 1, label: "Прошлое", x: 0, y: 120 },
    { id: 2, label: "Настоящее", x: -70, y: 60 },
    { id: 3, label: "Внешние факторы", x: 70, y: 60 },
    { id: 4, label: "Внутренние процессы", x: -40, y: 0 },
    { id: 5, label: "Вызовы", x: 40, y: 0 },
    { id: 6, label: "Результат", x: 0, y: -80 }
  ]
};

export const SPREAD_SCHEMAS: Record<SpreadId, SpreadSchema> = {
  one_card: SpreadOneCard,
  yes_no: SpreadYesNo,
  three_cards: SpreadThreeCards,
  cross: SpreadCross,
  five_cards: SpreadFiveCards,
  horseshoe: SpreadHorseshoe,
  star: SpreadStar,
  pyramid: SpreadPyramid
};
