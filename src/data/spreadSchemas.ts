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
    { id: 1, label: "Суть ситуации", x: -140, y: 120 },
    { id: 2, label: "Против", x: 0, y: -20 },
    { id: 3, label: "Поддержка", x: 0, y: 260 },
    { id: 4, label: "Результат", x: 140, y: 120 }
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
    { id: 1, label: "Прошлое", x: 0, y: 40 },
    { id: 2, label: "Настоящее", x: -90, y: 160 },
    { id: 3, label: "Скрытые влияния", x: 90, y: 160 },
    { id: 4, label: "Совет", x: 180, y: 300 },
    { id: 5, label: "Результат", x: -180, y: 300 }
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
    { id: 1, label: "Прошлое", x: -210, y: 120 },
    { id: 2, label: "Настоящее", x: -140, y: 70 },
    { id: 3, label: "Скрытые влияния", x: -70, y: 30 },
    { id: 4, label: "Препятствия", x: 0, y: 0 },
    { id: 5, label: "Окружение", x: 70, y: 30 },
    { id: 6, label: "Совет", x: 140, y: 70 },
    { id: 7, label: "Результат", x: 210, y: 120 }
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
    { id: 1, label: "Корневая чакра", x: -510, y: 240 },
    { id: 2, label: "Сакральная чакра", x: -340, y: 120 },
    { id: 3, label: "Чакра солнечного сплетения", x: -170, y: 0 },
    { id: 4, label: "Сердечная чакра", x: 0, y: -120 },
    { id: 5, label: "Горловая чакра", x: 170, y: 0 },
    { id: 6, label: "Чакра третьего глаза", x: 340, y: 120 },
    { id: 7, label: "Коронная чакра", x: 510, y: 240 }
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
    { id: 1, label: "Прошлое", x: 0, y: -20 },
    { id: 2, label: "Настоящее", x: -120, y: 120 },
    { id: 3, label: "Внешние факторы", x: 120, y: 120 },
    { id: 4, label: "Внутренние процессы", x: -220, y: 380 },
    { id: 5, label: "Вызовы", x: 0, y: 380 },
    { id: 6, label: "Результат", x: 220, y: 380 }
  ]
};

export const SpreadCelticCross: SpreadSchema = {
  id: "celtic_cross",
  name: "Кельтский крест",
  cardCount: 10,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  positions: [
    { id: 1, label: "Ситуация", x: -60, y: 0 },
    { id: 2, label: "Препятствие", x: -60, y: 0 },
    { id: 3, label: "Далекое прошлое", x: -60, y: -240 },
    { id: 4, label: "Недавнее прошлое", x: -60, y: 240 },
    { id: 5, label: "Сознательное", x: 160, y: 0 },
    { id: 6, label: "Бессознательное", x: -280, y: 0 },
    { id: 7, label: "Ваша позиция", x: 370, y: 360 },
    { id: 8, label: "Окружение", x: 370, y: 120 },
    { id: 9, label: "Надежды и страхи", x: 370, y: -120 },
    { id: 10, label: "Результат", x: 370, y: -360 }
  ]
};

export const SpreadWheelOfYear: SpreadSchema = {
  id: "wheel_of_year",
  name: "Колесо года",
  cardCount: 12,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  positions: [
    { id: 1, label: "Общая тема года", x: -320, y: 0 },
    { id: 2, label: "Внешние обстоятельства", x: -250, y: 170 },
    { id: 3, label: "Работа / реализация", x: -110, y: 280 },
    { id: 4, label: "Финансы", x: 0, y: 340 },
    { id: 5, label: "Отношения", x: 110, y: 280 },
    { id: 6, label: "Семья", x: 250, y: 170 },
    { id: 7, label: "Внутреннее состояние", x: 320, y: 0 },
    { id: 8, label: "Кармический урок", x: 250, y: -170 },
    { id: 9, label: "Возможность", x: 110, y: -280 },
    { id: 10, label: "Риск", x: 0, y: -340 },
    { id: 11, label: "Поддержка", x: -110, y: -280 },
    { id: 12, label: "Главный итог", x: -250, y: -170 }
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
  pyramid: SpreadPyramid,
  celtic_cross: SpreadCelticCross,
  wheel_of_year: SpreadWheelOfYear
};
