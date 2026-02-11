export type SpreadId =
  | "one_card"
  | "yes_no"
  | "three_cards"
  | "cross"
  | "five_cards"
  | "horseshoe"
  | "star"
  | "pyramid"
  | "celtic_cross"
  | "wheel_of_year"
  | "celtic_cross";

export interface SpreadPosition {
  index: number;
  x: number;
  y: number;
  rotate?: number;
  z?: number;
  label?: string;
}

export interface SpreadDef {
  id: SpreadId;
  title: string;
  description: string;
  cardsCount: number;
  positions: SpreadPosition[];
  openOrder: number[];
}

export const RWS_SPREADS: SpreadDef[] = [
  {
    id: "one_card",
    title: "Одна карта (карта дня)",
    description: "Быстрый совет Таро: энергия, фокус, урок или возможность.",
    cardsCount: 1,
    positions: [{ index: 1, x: 50, y: 45, rotate: 0, z: 1, label: "Послание дня" }],
    openOrder: [1]
  },
  {
    id: "yes_no",
    title: "Да или Нет",
    description: "Три карты: фактор ДА, фактор НЕТ, итог.",
    cardsCount: 3,
    positions: [
      { index: 1, x: 30, y: 50, rotate: -5, label: "Фактор ДА" },
      { index: 2, x: 50, y: 50, rotate: 0, label: "Фактор НЕТ" },
      { index: 3, x: 70, y: 50, rotate: 5, label: "Итог" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "three_cards",
    title: "Три карты",
    description: "Классический расклад: прошлое, настоящее, будущее.",
    cardsCount: 3,
    positions: [
      { index: 1, x: 30, y: 50, rotate: -5, label: "Прошлое" },
      { index: 2, x: 50, y: 50, rotate: 0, label: "Настоящее" },
      { index: 3, x: 70, y: 50, rotate: 5, label: "Будущее" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "cross",
    title: "Крест",
    description: "Четыре карты: ситуация, препятствие, поддержка, результат.",
    cardsCount: 4,
    positions: [
      { index: 1, x: 35, y: 55, rotate: 0, label: "Суть ситуации" },
      { index: 2, x: 50, y: 35, rotate: 0, label: "Против" },
      { index: 3, x: 50, y: 75, rotate: 0, label: "Поддержка" },
      { index: 4, x: 65, y: 55, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4]
  },
  {
    id: "five_cards",
    title: "Пятикарточный расклад",
    description: "Баланс прошлого, настоящего, скрытых влияний, совета и результата.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 55, y: 40, rotate: 0, label: "Прошлое" },
      { index: 2, x: 47, y: 50, rotate: 0, label: "Настоящее" },
      { index: 3, x: 63, y: 60, rotate: 0, label: "Скрытые влияния" },
      { index: 4, x: 70, y: 70, rotate: 0, label: "Совет" },
      { index: 5, x: 32, y: 70, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "horseshoe",
    title: "Подкова",
    description: "Семь карт: от прошлого к результату, учитывая препятствия и окружение.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 40, y: 40, rotate: 0, label: "Прошлое" },
      { index: 2, x: 50, y: 50, rotate: 0, label: "Настоящее" },
      { index: 3, x: 60, y: 60, rotate: 0, label: "Скрытые влияния" },
      { index: 4, x: 70, y: 70, rotate: 0, label: "Препятствия" },
      { index: 5, x: 80, y: 60, rotate: 0, label: "Окружение" },
      { index: 6, x: 90, y: 50, rotate: 0, label: "Совет" },
      { index: 7, x: 100, y: 40, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "star",
    title: "Звезда",
    description: "Семь карт, каждая соответствует чакре и отражает энергетическое состояние.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 40, y: 40, rotate: 0, label: "Корневая чакра" },
      { index: 2, x: 50, y: 50, rotate: 0, label: "Сакральная чакра" },
      { index: 3, x: 60, y: 60, rotate: 0, label: "Чакра солнечного сплетения" },
      { index: 4, x: 70, y: 70, rotate: 0, label: "Сердечная чакра" },
      { index: 5, x: 80, y: 60, rotate: 0, label: "Горловая чакра" },
      { index: 6, x: 90, y: 50, rotate: 0, label: "Чакра третьего глаза" },
      { index: 7, x: 100, y: 40, rotate: 0, label: "Коронная чакра" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "pyramid",
    title: "Пирамида",
    description: "Шесть карт от основания к вершине: прошлое, настоящее, внешнее, внутреннее, вызов и итог.",
    cardsCount: 6,
    positions: [
      { index: 1, x: 50, y: 30, rotate: 0, label: "Прошлое" },
      { index: 2, x: 40, y: 50, rotate: 0, label: "Настоящее" },
      { index: 3, x: 60, y: 50, rotate: 0, label: "Внешние факторы" },
      { index: 4, x: 30, y: 70, rotate: 0, label: "Внутренние процессы" },
      { index: 5, x: 50, y: 70, rotate: 0, label: "Вызовы" },
      { index: 6, x: 70, y: 70, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6]
  },
  {
    id: "celtic_cross",
    title: "Кельтский крест",
    description: "Главный расклад Таро: ситуация, препятствия, прошлое, будущее, сознательное и бессознательное.",
    cardsCount: 10,
    positions: [
      { index: 1, x: 50, y: 55, rotate: 0, label: "Ситуация" },
      { index: 2, x: 50, y: 55, rotate: 90, label: "Препятствие" },
      { index: 3, x: 50, y: 40, rotate: 0, label: "Далекое прошлое" },
      { index: 4, x: 50, y: 70, rotate: 0, label: "Недавнее прошлое" },
      { index: 5, x: 70, y: 55, rotate: 0, label: "Сознательное" },
      { index: 6, x: 30, y: 55, rotate: 0, label: "Бессознательное" },
      { index: 7, x: 80, y: 45, rotate: 0, label: "Ваша позиция" },
      { index: 8, x: 80, y: 60, rotate: 0, label: "Окружение" },
      { index: 9, x: 80, y: 75, rotate: 0, label: "Надежды и страхи" },
      { index: 10, x: 80, y: 90, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: "wheel_of_year",
    title: "Колесо года",
    description: "Годовой расклад из 12 карт — каждый месяц как отдельный этап.",
    cardsCount: 12,
    positions: [
      { index: 1, x: 30, y: 45, rotate: 0, label: "Январь" },
      { index: 2, x: 35, y: 35, rotate: 0, label: "Февраль" },
      { index: 3, x: 50, y: 30, rotate: 0, label: "Март" },
      { index: 4, x: 65, y: 35, rotate: 0, label: "Апрель" },
      { index: 5, x: 70, y: 45, rotate: 0, label: "Май" },
      { index: 6, x: 70, y: 60, rotate: 0, label: "Июнь" },
      { index: 7, x: 50, y: 70, rotate: 0, label: "Июль" },
      { index: 8, x: 30, y: 60, rotate: 0, label: "Август" },
      { index: 9, x: 45, y: 45, rotate: 0, label: "Сентябрь" },
      { index: 10, x: 55, y: 45, rotate: 0, label: "Октябрь" },
      { index: 11, x: 45, y: 55, rotate: 0, label: "Ноябрь" },
      { index: 12, x: 55, y: 55, rotate: 0, label: "Декабрь" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }
];

export const RWS_SPREADS_MAP: Record<SpreadId, SpreadDef> = Object.fromEntries(
  RWS_SPREADS.map((spread) => [spread.id, spread])
) as Record<SpreadId, SpreadDef>;
