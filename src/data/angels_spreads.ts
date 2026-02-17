import type { AngelsSpreadId, SpreadDef } from "@/data/rws_spreads";

const order = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

export const ANGELS_SPREADS: SpreadDef[] = [
  {
    id: "angels_one_card",
    title: "Одна карта Ангела",
    description: "1 карта · поддержка · духовный ориентир",
    cardsCount: 1,
    positions: [{ index: 1, x: 50, y: 50, label: "Послание вашего Ангела на текущий момент" }],
    openOrder: [1]
  },
  {
    id: "angels_advice",
    title: "Ангельский совет (3 карты)",
    description: "3 карты · ситуация · совет · благословение",
    cardsCount: 3,
    positions: [
      { index: 1, x: 30, y: 66, label: "Суть ситуации" },
      { index: 2, x: 50, y: 34, label: "Совет высших сил" },
      { index: 3, x: 70, y: 66, label: "Благословение / результат при следовании совету" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "angels_yes_no_soft",
    title: "Ответ свыше (Да / Нет — мягкий)",
    description: "3 карты · направление · мягкий ответ",
    cardsCount: 3,
    positions: [
      { index: 1, x: 30, y: 66, label: "Энергия «Да»" },
      { index: 2, x: 50, y: 34, label: "Главный духовный фактор" },
      { index: 3, x: 70, y: 66, label: "Энергия «Пока нет» / задержка" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "angels_balance_soul",
    title: "Баланс души (5 карт)",
    description: "5 карт · состояние · блок · восстановление",
    cardsCount: 5,
    positions: [
      { index: 1, x: 24, y: 50, label: "Эмоциональное состояние" },
      { index: 2, x: 50, y: 24, label: "Духовная энергия" },
      { index: 3, x: 50, y: 50, label: "Центральная тема души" },
      { index: 4, x: 76, y: 50, label: "Что нарушает гармонию" },
      { index: 5, x: 50, y: 76, label: "Путь восстановления" }
    ],
    openOrder: order(5)
  },
  {
    id: "angels_healing_needed",
    title: "Что требует исцеления (4 карты)",
    description: "4 карты · источник · урок · поддержка",
    cardsCount: 4,
    positions: [
      { index: 1, x: 38, y: 36, label: "Корень напряжения" },
      { index: 2, x: 62, y: 36, label: "Как это проявляется" },
      { index: 3, x: 38, y: 64, label: "Урок ситуации" },
      { index: 4, x: 62, y: 64, label: "Ангельская помощь" }
    ],
    openOrder: order(4)
  },
  {
    id: "angels_body_spirit_energy",
    title: "Энергия тела и духа (6 карт)",
    description: "6 карт · ресурс · баланс · гармония",
    cardsCount: 6,
    positions: [
      { index: 1, x: 24, y: 34, label: "Физическая энергия" },
      { index: 2, x: 50, y: 34, label: "Эмоциональное состояние" },
      { index: 3, x: 76, y: 34, label: "Уровень ресурса" },
      { index: 4, x: 24, y: 66, label: "Духовная связь" },
      { index: 5, x: 50, y: 66, label: "Интуиция" },
      { index: 6, x: 76, y: 66, label: "Общий баланс" }
    ],
    openOrder: order(6)
  },
  {
    id: "angels_soul_path",
    title: "Путь души (7 карт)",
    description: "7 карт · предназначение · урок · итог",
    cardsCount: 7,
    positions: [
      { index: 1, x: 24, y: 24, label: "Прошлый опыт" },
      { index: 2, x: 50, y: 24, label: "Текущий этап" },
      { index: 3, x: 76, y: 24, label: "Урок" },
      { index: 4, x: 50, y: 50, label: "Высшее предназначение" },
      { index: 5, x: 76, y: 76, label: "Испытание" },
      { index: 6, x: 50, y: 76, label: "Поддержка" },
      { index: 7, x: 24, y: 76, label: "Итог пути" }
    ],
    openOrder: order(7)
  },
  {
    id: "angels_karmic_lesson",
    title: "Кармический урок (5 карт)",
    description: "5 карт · карма · урок · освобождение",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 16, label: "Кармическая тема" },
      { index: 2, x: 38, y: 38, label: "Прошлое влияние" },
      { index: 3, x: 62, y: 38, label: "Повторяющийся сценарий" },
      { index: 4, x: 50, y: 60, label: "Урок" },
      { index: 5, x: 50, y: 82, label: "Освобождение" }
    ],
    openOrder: order(5)
  },
  {
    id: "angels_vector",
    title: "Вектор развития (5 карт)",
    description: "5 карт · направление · поддержка · выбор",
    cardsCount: 5,
    positions: [
      { index: 1, x: 20, y: 50, label: "Текущая точка" },
      { index: 2, x: 35, y: 50, label: "Возможность" },
      { index: 3, x: 50, y: 50, label: "Риск" },
      { index: 4, x: 65, y: 50, label: "Поддержка" },
      { index: 5, x: 80, y: 50, label: "Наилучшее направление" }
    ],
    openOrder: order(5)
  },
  {
    id: "angels_relationship_support",
    title: "Ангельская поддержка в отношениях (4 карты)",
    description: "4 карты · энергия · защита · перспектива",
    cardsCount: 4,
    positions: [
      { index: 1, x: 50, y: 24, label: "Энергия союза" },
      { index: 2, x: 34, y: 50, label: "Ваша роль" },
      { index: 3, x: 66, y: 50, label: "Роль партнёра" },
      { index: 4, x: 50, y: 76, label: "Небесная поддержка" }
    ],
    openOrder: order(4)
  },
  {
    id: "angels_union_harmony",
    title: "Гармония союза (6 карт)",
    description: "6 карт · вы · партнёр · энергия · перспектива",
    cardsCount: 6,
    positions: [
      { index: 1, x: 34, y: 24, label: "Вы" },
      { index: 2, x: 66, y: 24, label: "Партнёр" },
      { index: 3, x: 42, y: 50, label: "Общая энергия" },
      { index: 4, x: 58, y: 50, label: "Испытание" },
      { index: 5, x: 34, y: 76, label: "Что укрепляет" },
      { index: 6, x: 66, y: 76, label: "Перспектива" }
    ],
    openOrder: order(6)
  },
  {
    id: "angels_higher_connection_meaning",
    title: "Высший смысл связи (5 карт)",
    description: "5 карт · вертикаль судьбы",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 16, label: "Причина встречи" },
      { index: 2, x: 50, y: 34, label: "Главный урок" },
      { index: 3, x: 50, y: 52, label: "Кармический узел" },
      { index: 4, x: 50, y: 70, label: "Потенциал роста" },
      { index: 5, x: 50, y: 88, label: "Высший итог" }
    ],
    openOrder: order(5)
  }
];

export const ANGELS_SPREADS_MAP: Record<AngelsSpreadId, SpreadDef> = Object.fromEntries(
  ANGELS_SPREADS.map((spread) => [spread.id, spread])
) as Record<AngelsSpreadId, SpreadDef>;
