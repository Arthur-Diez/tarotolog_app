export type SpreadId = "one_card" | "yes_no" | "three_cards";

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
  }
];

export const RWS_SPREADS_MAP: Record<SpreadId, SpreadDef> = Object.fromEntries(
  RWS_SPREADS.map((spread) => [spread.id, spread])
) as Record<SpreadId, SpreadDef>;
