export type RwsSpreadId =
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
  | "we_and_perspective"
  | "relationship_analysis"
  | "new_person"
  | "love_triangle"
  | "future_relationships"
  | "conflict_reason"
  | "will_he_return"
  | "karmic_connection"
  | "work_current_situation"
  | "change_job"
  | "career_growth"
  | "financial_flow"
  | "new_project"
  | "finances_period"
  | "team_work"
  | "vocation_profession"
  | "inner_resource"
  | "inner_conflict"
  | "shadow_side"
  | "hero_path"
  | "balance_wheel"
  | "reset_reload"
  | "soul_purpose";

export type LenormandSpreadId =
  | "lenormand_one_card"
  | "lenormand_three_cards"
  | "lenormand_yes_no"
  | "lenormand_his_intentions"
  | "lenormand_feelings_actions"
  | "lenormand_work_money"
  | "lenormand_week"
  | "lenormand_we_and_connection"
  | "lenormand_next_month"
  | "lenormand_wheel_of_year"
  | "lenormand_square_9"
  | "lenormand_grand_tableau";

export type ManaraSpreadId =
  | "manara_mystery_love"
  | "manara_love_check"
  | "manara_two_hearts"
  | "manara_relationship_future"
  | "manara_his_intentions"
  | "manara_feelings_actions"
  | "manara_three_cards"
  | "manara_path"
  | "manara_celtic_cross";

export type SpreadId = RwsSpreadId | LenormandSpreadId | ManaraSpreadId;

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
      { index: 1, x: 50, y: 36, rotate: 0, label: "Прошлое" },
      { index: 2, x: 40, y: 52, rotate: 0, label: "Настоящее" },
      { index: 3, x: 60, y: 52, rotate: 0, label: "Внешние факторы" },
      { index: 4, x: 30, y: 78, rotate: 0, label: "Внутренние процессы" },
      { index: 5, x: 50, y: 78, rotate: 0, label: "Вызовы" },
      { index: 6, x: 70, y: 78, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6]
  },
  {
    id: "celtic_cross",
    title: "Кельтский крест",
    description: "Главный расклад Таро: ситуация, препятствия, прошлое, будущее, сознательное и бессознательное.",
    cardsCount: 10,
    positions: [
      { index: 1, x: 44, y: 55, rotate: 0, label: "Ситуация" },
      { index: 2, x: 44, y: 55, rotate: 90, label: "Препятствие" },
      { index: 3, x: 44, y: 45, rotate: 0, label: "Далекое прошлое" },
      { index: 4, x: 44, y: 85, rotate: 0, label: "Недавнее прошлое" },
      { index: 5, x: 62, y: 65, rotate: 0, label: "Сознательное" },
      { index: 6, x: 26, y: 65, rotate: 0, label: "Бессознательное" },
      { index: 7, x: 80, y: 95, rotate: 0, label: "Ваша позиция" },
      { index: 8, x: 80, y: 75, rotate: 0, label: "Окружение" },
      { index: 9, x: 80, y: 55, rotate: 0, label: "Надежды и страхи" },
      { index: 10, x: 80, y: 35, rotate: 0, label: "Результат" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: "wheel_of_year",
    title: "Колесо года",
    description: "Годовой расклад из 12 карт — каждый месяц как отдельный этап.",
    cardsCount: 12,
    positions: [
      { index: 1, x: 10, y: 58, rotate: 0, label: "Общая тема года" },
      { index: 2, x: 15, y: 72, rotate: 0, label: "Внешние обстоятельства" },
      { index: 3, x: 30, y: 82, rotate: 0, label: "Работа / реализация" },
      { index: 4, x: 50, y: 86, rotate: 0, label: "Финансы" },
      { index: 5, x: 70, y: 82, rotate: 0, label: "Отношения" },
      { index: 6, x: 85, y: 72, rotate: 0, label: "Семья" },
      { index: 7, x: 90, y: 58, rotate: 0, label: "Внутреннее состояние" },
      { index: 8, x: 85, y: 44, rotate: 0, label: "Кармический урок" },
      { index: 9, x: 70, y: 34, rotate: 0, label: "Возможность" },
      { index: 10, x: 50, y: 30, rotate: 0, label: "Риск" },
      { index: 11, x: 30, y: 34, rotate: 0, label: "Поддержка" },
      { index: 12, x: 15, y: 44, rotate: 0, label: "Главный итог" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  {
    id: "we_and_perspective",
    title: "Мы и перспектива",
    description: "Вы, партнёр и вектор связи.",
    cardsCount: 3,
    positions: [
      { index: 1, x: 30, y: 50, rotate: 0, label: "Вы" },
      { index: 2, x: 50, y: 50, rotate: 0, label: "Партнёр" },
      { index: 3, x: 70, y: 50, rotate: 0, label: "Перспектива" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "relationship_analysis",
    title: "Анализ отношений",
    description: "Глубокий разбор пары.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 24, rotate: 0, label: "Ваши чувства" },
      { index: 2, x: 30, y: 50, rotate: 0, label: "Его/её чувства" },
      { index: 3, x: 50, y: 50, rotate: 0, label: "Проблема (центр)" },
      { index: 4, x: 70, y: 50, rotate: 0, label: "Потенциал" },
      { index: 5, x: 50, y: 76, rotate: 0, label: "Итог" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "new_person",
    title: "Новый человек",
    description: "Кто он и что принесёт.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 20, y: 42, rotate: 0, label: "Кто он/она" },
      { index: 2, x: 40, y: 42, rotate: 0, label: "Намерения" },
      { index: 3, x: 60, y: 42, rotate: 0, label: "Что принесёт" },
      { index: 4, x: 80, y: 42, rotate: 0, label: "Риски" },
      { index: 5, x: 50, y: 68, rotate: 0, label: "Перспектива" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "love_triangle",
    title: "Любовный треугольник",
    description: "Три стороны ситуации.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 50, y: 14, rotate: 0, label: "Вы" },
      { index: 2, x: 30, y: 34, rotate: 0, label: "Партнёр" },
      { index: 3, x: 70, y: 34, rotate: 0, label: "Третий человек" },
      { index: 4, x: 38, y: 56, rotate: 0, label: "Его чувства к вам" },
      { index: 5, x: 62, y: 56, rotate: 0, label: "Его чувства к третьему" },
      { index: 6, x: 50, y: 74, rotate: 0, label: "Скрытая динамика" },
      { index: 7, x: 50, y: 86, rotate: 0, label: "Итог" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "future_relationships",
    title: "Будущее отношений",
    description: "Прогноз развития союза.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 16, y: 56, rotate: 0, label: "Текущее состояние" },
      { index: 2, x: 33, y: 48, rotate: 0, label: "Ближайшее будущее" },
      { index: 3, x: 50, y: 44, rotate: 0, label: "Основной урок" },
      { index: 4, x: 67, y: 48, rotate: 0, label: "Что укрепит" },
      { index: 5, x: 84, y: 56, rotate: 0, label: "Долгосрочный итог" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "conflict_reason",
    title: "Причина конфликта",
    description: "Корень проблемы в паре.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 24, rotate: 0, label: "Корень проблемы" },
      { index: 2, x: 30, y: 50, rotate: 0, label: "Ваша роль" },
      { index: 3, x: 50, y: 50, rotate: 0, label: "Что мешает (центр)" },
      { index: 4, x: 70, y: 50, rotate: 0, label: "Его/её роль" },
      { index: 5, x: 50, y: 76, rotate: 0, label: "Решение" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "will_he_return",
    title: "Вернётся ли человек?",
    description: "Шанс на восстановление связи.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 16, y: 50, rotate: 0, label: "Его чувства" },
      { index: 2, x: 33, y: 50, rotate: 0, label: "Намерения" },
      { index: 3, x: 50, y: 50, rotate: 0, label: "Есть ли шанс" },
      { index: 4, x: 67, y: 50, rotate: 0, label: "Что влияет" },
      { index: 5, x: 84, y: 50, rotate: 0, label: "Итог" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "karmic_connection",
    title: "Кармическая связь",
    description: "Глубинная природа отношений.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 50, y: 52, rotate: 0, label: "Тип связи (центр)" },
      { index: 2, x: 50, y: 16, rotate: 0, label: "Урок для вас" },
      { index: 3, x: 33, y: 33, rotate: 0, label: "Урок для партнёра" },
      { index: 4, x: 67, y: 33, rotate: 0, label: "Плюсы" },
      { index: 5, x: 27, y: 71, rotate: 0, label: "Минусы" },
      { index: 6, x: 73, y: 71, rotate: 0, label: "Риски" },
      { index: 7, x: 50, y: 86, rotate: 0, label: "Предназначение связи" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "work_current_situation",
    title: "Текущая рабочая ситуация",
    description: "Быстрый срез того, что происходит.",
    cardsCount: 3,
    positions: [
      { index: 1, x: 24, y: 50, rotate: 0, label: "Текущее состояние" },
      { index: 2, x: 50, y: 50, rotate: 0, label: "Скрытый фактор" },
      { index: 3, x: 76, y: 50, rotate: 0, label: "Ближайшее развитие" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "change_job",
    title: "Стоит ли менять работу?",
    description: "Рациональное решение без эмоций.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 20, rotate: 0, label: "Текущая позиция (где вы сейчас)" },
      { index: 2, x: 30, y: 44, rotate: 0, label: "Плюсы смены" },
      { index: 3, x: 70, y: 44, rotate: 0, label: "Минусы / риски смены" },
      { index: 4, x: 30, y: 74, rotate: 0, label: "Возможности (если решитесь)" },
      { index: 5, x: 70, y: 74, rotate: 0, label: "Итог / наиболее вероятный исход" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "career_growth",
    title: "Карьерный рост",
    description: "Путь вверх: блоки и ресурсы.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 20, y: 20, rotate: 0, label: "Потенциал роста" },
      { index: 2, x: 35, y: 36, rotate: 0, label: "Что мешает" },
      { index: 3, x: 50, y: 52, rotate: 0, label: "Что поможет" },
      { index: 4, x: 65, y: 68, rotate: 0, label: "Возможности/шанс" },
      { index: 5, x: 80, y: 84, rotate: 0, label: "Итог роста (к чему ведёт)" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "financial_flow",
    title: "Финансовый поток",
    description: "Диагностика денег и утечек.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 16, y: 50, rotate: 0, label: "Источник дохода" },
      { index: 2, x: 33, y: 50, rotate: 0, label: "Где “утечка” / блок" },
      { index: 3, x: 50, y: 50, rotate: 0, label: "Скрытый фактор" },
      { index: 4, x: 67, y: 50, rotate: 0, label: "Точка роста" },
      { index: 5, x: 84, y: 50, rotate: 0, label: "Итог потока" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "new_project",
    title: "Новый проект",
    description: "Проверка идеи перед запуском.",
    cardsCount: 6,
    positions: [
      { index: 1, x: 38, y: 24, rotate: 0, label: "Идея / потенциал" },
      { index: 2, x: 62, y: 24, rotate: 0, label: "Рынок / спрос" },
      { index: 3, x: 24, y: 50, rotate: 0, label: "Ресурсы (что есть)" },
      { index: 4, x: 50, y: 50, rotate: 0, label: "Риски (что может сорвать)" },
      { index: 5, x: 76, y: 50, rotate: 0, label: "Конкуренция / внешнее давление" },
      { index: 6, x: 50, y: 76, rotate: 0, label: "Перспектива (итог)" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6]
  },
  {
    id: "finances_period",
    title: "Финансы на период",
    description: "Куда пойдут деньги в ближайшее время.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 16, y: 50, rotate: 0, label: "Тенденция периода" },
      { index: 2, x: 33, y: 50, rotate: 0, label: "Возможность" },
      { index: 3, x: 50, y: 50, rotate: 0, label: "Риск" },
      { index: 4, x: 67, y: 50, rotate: 0, label: "Совет (что делать)" },
      { index: 5, x: 84, y: 50, rotate: 0, label: "Итог периода" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "team_work",
    title: "Работа в коллективе",
    description: "Вы в системе: роли и влияние.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 50, rotate: 0, label: "Вы (ваша роль)" },
      { index: 2, x: 50, y: 24, rotate: 0, label: "Руководство / влияние сверху" },
      { index: 3, x: 30, y: 50, rotate: 0, label: "Коллеги / окружение" },
      { index: 4, x: 70, y: 50, rotate: 0, label: "Скрытые процессы" },
      { index: 5, x: 50, y: 76, rotate: 0, label: "Итог / как будет развиваться" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "vocation_profession",
    title: "Предназначение и профессия",
    description: "Глубокий разбор сильных сторон.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 50, y: 52, rotate: 0, label: "Главный потенциал (ядро)" },
      { index: 2, x: 50, y: 16, rotate: 0, label: "Талант" },
      { index: 3, x: 33, y: 33, rotate: 0, label: "Скрытый ресурс" },
      { index: 4, x: 67, y: 33, rotate: 0, label: "Препятствие" },
      { index: 5, x: 27, y: 71, rotate: 0, label: "Направление развития" },
      { index: 6, x: 73, y: 71, rotate: 0, label: "Поддержка / что усилит" },
      { index: 7, x: 50, y: 86, rotate: 0, label: "Итог (к чему ведёт путь)" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "inner_resource",
    title: "Внутренний ресурс",
    description: "Где ваша сила и как её восстановить.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 50, y: 50, rotate: 0, label: "Главный источник силы" },
      { index: 2, x: 50, y: 24, rotate: 0, label: "Что усиливает" },
      { index: 3, x: 30, y: 50, rotate: 0, label: "Что истощает" },
      { index: 4, x: 70, y: 50, rotate: 0, label: "Скрытый резерв" },
      { index: 5, x: 50, y: 76, rotate: 0, label: "Способ восстановления" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "inner_conflict",
    title: "Внутренний конфликт",
    description: "Разобраться в себе и принять решение.",
    cardsCount: 5,
    positions: [
      { index: 1, x: 30, y: 24, rotate: 0, label: "Сознательная позиция" },
      { index: 2, x: 70, y: 24, rotate: 0, label: "Подсознательное желание" },
      { index: 3, x: 50, y: 50, rotate: 0, label: "Суть конфликта" },
      { index: 4, x: 30, y: 76, rotate: 0, label: "Страх" },
      { index: 5, x: 70, y: 76, rotate: 0, label: "Решение" }
    ],
    openOrder: [1, 2, 3, 4, 5]
  },
  {
    id: "shadow_side",
    title: "Теневая сторона",
    description: "Скрытые аспекты личности.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 50, y: 14, rotate: 0, label: "Осознанная личность" },
      { index: 2, x: 34, y: 30, rotate: 0, label: "Маска и поведение" },
      { index: 3, x: 66, y: 30, rotate: 0, label: "Маска и поведение" },
      { index: 4, x: 34, y: 56, rotate: 0, label: "Подавленные эмоции" },
      { index: 5, x: 66, y: 56, rotate: 0, label: "Подавленные эмоции" },
      { index: 6, x: 50, y: 74, rotate: 0, label: "Глубинный страх" },
      { index: 7, x: 50, y: 88, rotate: 0, label: "Путь интеграции" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "hero_path",
    title: "Путь героя",
    description: "Ваш этап трансформации.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 20, y: 28, rotate: 0, label: "Начало этапа" },
      { index: 2, x: 40, y: 28, rotate: 0, label: "Вызов" },
      { index: 3, x: 60, y: 28, rotate: 0, label: "Страх" },
      { index: 4, x: 74, y: 72, rotate: 0, label: "Переломный момент" },
      { index: 5, x: 56, y: 72, rotate: 0, label: "Урок" },
      { index: 6, x: 38, y: 72, rotate: 0, label: "Трансформация" },
      { index: 7, x: 20, y: 72, rotate: 0, label: "Новый уровень" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  },
  {
    id: "balance_wheel",
    title: "Колесо баланса",
    description: "Баланс сфер жизни.",
    cardsCount: 8,
    positions: [
      { index: 1, x: 50, y: 14, rotate: 0, label: "Здоровье" },
      { index: 2, x: 34, y: 30, rotate: 0, label: "Отношения" },
      { index: 3, x: 66, y: 30, rotate: 0, label: "Работа" },
      { index: 4, x: 26, y: 50, rotate: 0, label: "Финансы" },
      { index: 5, x: 74, y: 50, rotate: 0, label: "Развитие" },
      { index: 6, x: 34, y: 68, rotate: 0, label: "Отдых" },
      { index: 7, x: 66, y: 68, rotate: 0, label: "Эмоции" },
      { index: 8, x: 50, y: 86, rotate: 0, label: "Духовность" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  {
    id: "reset_reload",
    title: "Перезагрузка",
    description: "Начало нового этапа.",
    cardsCount: 6,
    positions: [
      { index: 1, x: 26, y: 30, rotate: 0, label: "Что завершить" },
      { index: 2, x: 50, y: 30, rotate: 0, label: "Что отпустить" },
      { index: 3, x: 74, y: 30, rotate: 0, label: "Главный урок" },
      { index: 4, x: 26, y: 72, rotate: 0, label: "Новый фокус" },
      { index: 5, x: 50, y: 72, rotate: 0, label: "Ресурс" },
      { index: 6, x: 74, y: 72, rotate: 0, label: "Итог" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6]
  },
  {
    id: "soul_purpose",
    title: "Предназначение души",
    description: "Глубинный вектор жизни.",
    cardsCount: 7,
    positions: [
      { index: 1, x: 50, y: 50, rotate: 0, label: "Суть души" },
      { index: 2, x: 50, y: 20, rotate: 0, label: "Дар" },
      { index: 3, x: 34, y: 36, rotate: 0, label: "Талант" },
      { index: 4, x: 66, y: 36, rotate: 0, label: "Кармический урок" },
      { index: 5, x: 34, y: 66, rotate: 0, label: "Препятствие" },
      { index: 6, x: 66, y: 66, rotate: 0, label: "Поддержка" },
      { index: 7, x: 50, y: 84, rotate: 0, label: "Итог пути" }
    ],
    openOrder: [1, 2, 3, 4, 5, 6, 7]
  }
];

export const RWS_SPREADS_MAP: Record<RwsSpreadId, SpreadDef> = Object.fromEntries(
  RWS_SPREADS.map((spread) => [spread.id, spread])
) as Record<RwsSpreadId, SpreadDef>;
