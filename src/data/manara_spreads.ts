import type { ManaraSpreadId, SpreadDef } from "@/data/rws_spreads";

const order = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

export const MANARA_SPREADS: SpreadDef[] = [
  {
    id: "manara_mystery_love",
    title: "Мистерия любви (8 карт)",
    description: "8 карт · двойной уровень близости",
    cardsCount: 8,
    positions: [
      { index: 1, x: 20, y: 30, label: "Его мысли" },
      { index: 2, x: 40, y: 30, label: "Его чувства" },
      { index: 3, x: 60, y: 30, label: "Ваши чувства" },
      { index: 4, x: 80, y: 30, label: "Скрытая динамика" },
      { index: 5, x: 20, y: 70, label: "Сексуальное притяжение" },
      { index: 6, x: 40, y: 70, label: "Подсознательные страхи" },
      { index: 7, x: 60, y: 70, label: "Развитие связи" },
      { index: 8, x: 80, y: 70, label: "Итог союза" }
    ],
    openOrder: order(8)
  },
  {
    id: "manara_love_check",
    title: "Проверка любви (4 карты)",
    description: "4 карты · квадрат близости",
    cardsCount: 4,
    positions: [
      { index: 1, x: 38, y: 36, label: "Его чувства" },
      { index: 2, x: 62, y: 36, label: "Его намерения" },
      { index: 3, x: 38, y: 64, label: "Его скрытые мотивы" },
      { index: 4, x: 62, y: 64, label: "Перспектива" }
    ],
    openOrder: order(4)
  },
  {
    id: "manara_two_hearts",
    title: "Два сердца (8 карт)",
    description: "8 карт · форма сердца",
    cardsCount: 8,
    positions: [
      { index: 1, x: 40, y: 12, label: "Вы" },
      { index: 2, x: 60, y: 12, label: "Партнёр" },
      { index: 3, x: 24, y: 34, label: "Ваши ожидания" },
      { index: 4, x: 76, y: 34, label: "Его ожидания" },
      { index: 5, x: 40, y: 60, label: "Страсть" },
      { index: 6, x: 60, y: 60, label: "Препятствие" },
      { index: 7, x: 50, y: 82, label: "Ближайшее развитие" },
      { index: 8, x: 50, y: 104, label: "Итог" }
    ],
    openOrder: order(8)
  },
  {
    id: "manara_relationship_future",
    title: "Отношения на будущее (9 карт)",
    description: "9 карт · треугольник судьбы",
    cardsCount: 9,
    positions: [
      { index: 1, x: 50, y: 4, label: "Основа связи" },
      { index: 2, x: 38, y: 30, label: "Ваш вклад" },
      { index: 3, x: 62, y: 30, label: "Его вклад" },
      { index: 4, x: 24, y: 58, label: "Сексуальная динамика" },
      { index: 5, x: 50, y: 58, label: "Главный фактор" },
      { index: 6, x: 76, y: 58, label: "Внешнее влияние" },
      { index: 7, x: 50, y: 86, label: "Ближайший этап" },
      { index: 8, x: 38, y: 114, label: "Его итог" },
      { index: 9, x: 62, y: 114, label: "Ваш итог" }
    ],
    openOrder: order(9)
  },
  {
    id: "manara_his_intentions",
    title: "Его намерения (5 карт)",
    description: "5 карт · фокус на центре",
    cardsCount: 5,
    positions: [
      { index: 1, x: 24, y: 50, label: "Мысли" },
      { index: 2, x: 50, y: 18, label: "Чувства" },
      { index: 3, x: 50, y: 50, label: "Истинное намерение" },
      { index: 4, x: 76, y: 50, label: "Действия" },
      { index: 5, x: 50, y: 82, label: "Итог" }
    ],
    openOrder: order(5)
  },
  {
    id: "manara_feelings_actions",
    title: "Чувства и действия (5 карт)",
    description: "5 карт · внутреннее vs внешнее",
    cardsCount: 5,
    positions: [
      { index: 1, x: 26, y: 20, label: "Его чувства" },
      { index: 2, x: 74, y: 20, label: "Его желания" },
      { index: 3, x: 50, y: 50, label: "Внутренний конфликт" },
      { index: 4, x: 26, y: 80, label: "Его действия" },
      { index: 5, x: 74, y: 80, label: "Итог" }
    ],
    openOrder: order(5)
  },
  {
    id: "manara_three_cards",
    title: "Три карты Манара",
    description: "3 карты · линия импульса",
    cardsCount: 3,
    positions: [
      { index: 1, x: 30, y: 50, label: "Причина" },
      { index: 2, x: 50, y: 50, label: "Развитие" },
      { index: 3, x: 70, y: 50, label: "Итог" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "manara_path",
    title: "Путь (7 карт)",
    description: "7 карт · дуга развития",
    cardsCount: 7,
    positions: [
      { index: 1, x: 24, y: 20, label: "Суть ситуации" },
      { index: 2, x: 50, y: 20, label: "Ментальный фактор" },
      { index: 3, x: 76, y: 20, label: "Эмоциональный фактор" },
      { index: 4, x: 50, y: 50, label: "Переломный момент" },
      { index: 5, x: 76, y: 80, label: "Совет" },
      { index: 6, x: 50, y: 80, label: "Риск" },
      { index: 7, x: 24, y: 80, label: "Итог" }
    ],
    openOrder: order(7)
  },
  {
    id: "manara_celtic_cross",
    title: "Кельтский крест (Манара)",
    description: "10 карт · классика + чувственный анализ",
    cardsCount: 10,
    positions: [
      { index: 1, x: 38, y: 30, label: "Суть" },
      { index: 2, x: 50, y: 4, label: "Препятствие" },
      { index: 3, x: 62, y: 30, label: "Осознанное" },
      { index: 4, x: 50, y: 58, label: "Подсознательное" },
      { index: 5, x: 76, y: 58, label: "Прошлое" },
      { index: 6, x: 24, y: 58, label: "Будущее" },
      { index: 7, x: 50, y: 86, label: "Совет" },
      { index: 8, x: 30, y: 114, label: "Влияние" },
      { index: 9, x: 50, y: 114, label: "Страх" },
      { index: 10, x: 70, y: 114, label: "Итог" }
    ],
    openOrder: order(10)
  }
];

export const MANARA_SPREADS_MAP: Record<ManaraSpreadId, SpreadDef> = Object.fromEntries(
  MANARA_SPREADS.map((spread) => [spread.id, spread])
) as Record<ManaraSpreadId, SpreadDef>;
