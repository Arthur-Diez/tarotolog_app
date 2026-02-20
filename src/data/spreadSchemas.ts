import type { DeckId } from "@/data/decks";
import { ANGELS_SPREADS } from "@/data/angels_spreads";
import { GOLDEN_SPREADS } from "@/data/golden_spreads";
import { LENORMAND_SPREADS } from "@/data/lenormand_spreads";
import { MANARA_SPREADS } from "@/data/manara_spreads";
import { SILA_RODA_SPREADS } from "@/data/sila_roda_spreads";
import type {
  AngelsSpreadId,
  GoldenSpreadId,
  LenormandSpreadId,
  ManaraSpreadId,
  SilaRodaSpreadId,
  SpreadId
} from "@/data/rws_spreads";

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
  deckType: Extract<DeckId, "rws" | "lenormand" | "manara" | "angels" | "golden" | "ancestry">;
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
    { id: 1, label: "Ситуация", x: -60, y: 120 },
    { id: 2, label: "Препятствие", x: -60, y: 120 },
    { id: 3, label: "Далекое прошлое", x: -60, y: -120 },
    { id: 4, label: "Недавнее прошлое", x: -60, y: 360 },
    { id: 5, label: "Сознательное", x: 160, y: 120 },
    { id: 6, label: "Бессознательное", x: -280, y: 120 },
    { id: 7, label: "Ваша позиция", x: 370, y: 480 },
    { id: 8, label: "Окружение", x: 370, y: 240 },
    { id: 9, label: "Надежды и страхи", x: 370, y: 0 },
    { id: 10, label: "Результат", x: 370, y: -240 }
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
    { id: 1, label: "Общая тема года", x: -320, y: 140 },
    { id: 2, label: "Внешние обстоятельства", x: -280, y: 300 },
    { id: 3, label: "Работа / реализация", x: -160, y: 420 },
    { id: 4, label: "Финансы", x: 0, y: 470 },
    { id: 5, label: "Отношения", x: 160, y: 420 },
    { id: 6, label: "Семья", x: 280, y: 300 },
    { id: 7, label: "Внутреннее состояние", x: 320, y: 140 },
    { id: 8, label: "Кармический урок", x: 280, y: -20 },
    { id: 9, label: "Возможность", x: 160, y: -140 },
    { id: 10, label: "Риск", x: 0, y: -190 },
    { id: 11, label: "Поддержка", x: -160, y: -140 },
    { id: 12, label: "Главный итог", x: -280, y: -20 }
  ]
};

export const SpreadWeAndPerspective: SpreadSchema = {
  id: "we_and_perspective",
  name: "Мы и перспектива",
  cardCount: 3,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3],
  positions: [
    { id: 1, label: "Вы", x: -120, y: 180 },
    { id: 2, label: "Партнёр", x: 0, y: 180 },
    { id: 3, label: "Перспектива", x: 120, y: 180 }
  ]
};

export const SpreadRelationshipAnalysis: SpreadSchema = {
  id: "relationship_analysis",
  name: "Анализ отношений",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Ваши чувства", x: 0, y: 20 },
    { id: 2, label: "Его/её чувства", x: -170, y: 240 },
    { id: 3, label: "Проблема (центр)", x: 0, y: 240 },
    { id: 4, label: "Потенциал", x: 170, y: 240 },
    { id: 5, label: "Итог", x: 0, y: 460 }
  ]
};

export const SpreadNewPerson: SpreadSchema = {
  id: "new_person",
  name: "Новый человек",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Кто он/она", x: -180, y: 160 },
    { id: 2, label: "Намерения", x: -60, y: 160 },
    { id: 3, label: "Что принесёт", x: 60, y: 160 },
    { id: 4, label: "Риски", x: 180, y: 160 },
    { id: 5, label: "Перспектива", x: 0, y: 300 }
  ]
};

export const SpreadLoveTriangle: SpreadSchema = {
  id: "love_triangle",
  name: "Любовный треугольник",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Вы", x: 0, y: 20 },
    { id: 2, label: "Партнёр", x: -180, y: 220 },
    { id: 3, label: "Третий человек", x: 180, y: 220 },
    { id: 4, label: "Его чувства к вам", x: -110, y: 410 },
    { id: 5, label: "Его чувства к третьему", x: 110, y: 410 },
    { id: 6, label: "Скрытая динамика", x: 0, y: 560 },
    { id: 7, label: "Итог", x: 0, y: 710 }
  ]
};

export const SpreadFutureRelationships: SpreadSchema = {
  id: "future_relationships",
  name: "Будущее отношений",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Текущее состояние", x: -220, y: 210 },
    { id: 2, label: "Ближайшее будущее", x: -110, y: 165 },
    { id: 3, label: "Основной урок", x: 0, y: 140 },
    { id: 4, label: "Что укрепит", x: 110, y: 165 },
    { id: 5, label: "Долгосрочный итог", x: 220, y: 210 }
  ]
};

export const SpreadConflictReason: SpreadSchema = {
  id: "conflict_reason",
  name: "Причина конфликта",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Корень проблемы", x: 0, y: 20 },
    { id: 2, label: "Ваша роль", x: -170, y: 240 },
    { id: 3, label: "Что мешает (центр)", x: 0, y: 240 },
    { id: 4, label: "Его/её роль", x: 170, y: 240 },
    { id: 5, label: "Решение", x: 0, y: 460 }
  ]
};

export const SpreadWillHeReturn: SpreadSchema = {
  id: "will_he_return",
  name: "Вернётся ли человек?",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Его чувства", x: -220, y: 190 },
    { id: 2, label: "Намерения", x: -110, y: 190 },
    { id: 3, label: "Есть ли шанс", x: 0, y: 190 },
    { id: 4, label: "Что влияет", x: 110, y: 190 },
    { id: 5, label: "Итог", x: 220, y: 190 }
  ]
};

export const SpreadKarmicConnection: SpreadSchema = {
  id: "karmic_connection",
  name: "Кармическая связь",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Тип связи (центр)", x: 0, y: 300 },
    { id: 2, label: "Урок для вас", x: 0, y: 40 },
    { id: 3, label: "Урок для партнёра", x: -200, y: 170 },
    { id: 4, label: "Плюсы", x: 200, y: 170 },
    { id: 5, label: "Минусы", x: -240, y: 430 },
    { id: 6, label: "Риски", x: 240, y: 430 },
    { id: 7, label: "Предназначение связи", x: 0, y: 560 }
  ]
};

export const SpreadWorkCurrentSituation: SpreadSchema = {
  id: "work_current_situation",
  name: "Текущая рабочая ситуация",
  cardCount: 3,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3],
  positions: [
    { id: 1, label: "Текущее состояние", x: -120, y: 190 },
    { id: 2, label: "Скрытый фактор", x: 0, y: 190 },
    { id: 3, label: "Ближайшее развитие", x: 120, y: 190 }
  ]
};

export const SpreadChangeJob: SpreadSchema = {
  id: "change_job",
  name: "Стоит ли менять работу?",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Текущая позиция (где вы сейчас)", x: 0, y: 20 },
    { id: 2, label: "Плюсы смены", x: -170, y: 220 },
    { id: 3, label: "Минусы / риски смены", x: 170, y: 220 },
    { id: 4, label: "Возможности (если решитесь)", x: -170, y: 430 },
    { id: 5, label: "Итог / наиболее вероятный исход", x: 170, y: 430 }
  ]
};

export const SpreadCareerGrowth: SpreadSchema = {
  id: "career_growth",
  name: "Карьерный рост",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Потенциал роста", x: -220, y: 40 },
    { id: 2, label: "Что мешает", x: -110, y: 140 },
    { id: 3, label: "Что поможет", x: 0, y: 240 },
    { id: 4, label: "Возможности/шанс", x: 110, y: 340 },
    { id: 5, label: "Итог роста (к чему ведёт)", x: 220, y: 440 }
  ]
};

export const SpreadFinancialFlow: SpreadSchema = {
  id: "financial_flow",
  name: "Финансовый поток",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Источник дохода", x: -220, y: 190 },
    { id: 2, label: "Где “утечка” / блок", x: -110, y: 190 },
    { id: 3, label: "Скрытый фактор", x: 0, y: 190 },
    { id: 4, label: "Точка роста", x: 110, y: 190 },
    { id: 5, label: "Итог потока", x: 220, y: 190 }
  ]
};

export const SpreadNewProject: SpreadSchema = {
  id: "new_project",
  name: "Новый проект",
  cardCount: 6,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6],
  positions: [
    { id: 1, label: "Идея / потенциал", x: -100, y: 40 },
    { id: 2, label: "Рынок / спрос", x: 100, y: 40 },
    { id: 3, label: "Ресурсы (что есть)", x: -180, y: 180 },
    { id: 4, label: "Риски (что может сорвать)", x: 0, y: 180 },
    { id: 5, label: "Конкуренция / внешнее давление", x: 180, y: 180 },
    { id: 6, label: "Перспектива (итог)", x: 0, y: 320 }
  ]
};

export const SpreadFinancesPeriod: SpreadSchema = {
  id: "finances_period",
  name: "Финансы на период",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Тенденция периода", x: -220, y: 190 },
    { id: 2, label: "Возможность", x: -110, y: 190 },
    { id: 3, label: "Риск", x: 0, y: 190 },
    { id: 4, label: "Совет (что делать)", x: 110, y: 190 },
    { id: 5, label: "Итог периода", x: 220, y: 190 }
  ]
};

export const SpreadTeamWork: SpreadSchema = {
  id: "team_work",
  name: "Работа в коллективе",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Вы (ваша роль)", x: 0, y: 240 },
    { id: 2, label: "Руководство / влияние сверху", x: 0, y: 20 },
    { id: 3, label: "Коллеги / окружение", x: -170, y: 240 },
    { id: 4, label: "Скрытые процессы", x: 170, y: 240 },
    { id: 5, label: "Итог / как будет развиваться", x: 0, y: 460 }
  ]
};

export const SpreadVocationProfession: SpreadSchema = {
  id: "vocation_profession",
  name: "Предназначение и профессия",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Главный потенциал (ядро)", x: 0, y: 300 },
    { id: 2, label: "Талант", x: 0, y: 40 },
    { id: 3, label: "Скрытый ресурс", x: -200, y: 170 },
    { id: 4, label: "Препятствие", x: 200, y: 170 },
    { id: 5, label: "Направление развития", x: -240, y: 430 },
    { id: 6, label: "Поддержка / что усилит", x: 240, y: 430 },
    { id: 7, label: "Итог (к чему ведёт путь)", x: 0, y: 560 }
  ]
};

export const SpreadInnerResource: SpreadSchema = {
  id: "inner_resource",
  name: "Внутренний ресурс",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Главный источник силы", x: 0, y: 260 },
    { id: 2, label: "Что усиливает", x: 0, y: -10 },
    { id: 3, label: "Что истощает", x: -170, y: 260 },
    { id: 4, label: "Скрытый резерв", x: 170, y: 260 },
    { id: 5, label: "Способ восстановления", x: 0, y: 530 }
  ]
};

export const SpreadInnerConflict: SpreadSchema = {
  id: "inner_conflict",
  name: "Внутренний конфликт",
  cardCount: 5,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5],
  positions: [
    { id: 1, label: "Сознательная позиция", x: -170, y: 60 },
    { id: 2, label: "Подсознательное желание", x: 170, y: 60 },
    { id: 3, label: "Суть конфликта", x: 0, y: 240 },
    { id: 4, label: "Страх", x: -170, y: 430 },
    { id: 5, label: "Решение", x: 170, y: 430 }
  ]
};

export const SpreadShadowSide: SpreadSchema = {
  id: "shadow_side",
  name: "Теневая сторона",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Осознанная личность", x: 0, y: 20 },
    { id: 2, label: "Маска и поведение", x: -170, y: 180 },
    { id: 3, label: "Маска и поведение", x: 170, y: 180 },
    { id: 4, label: "Подавленные эмоции", x: -170, y: 420 },
    { id: 5, label: "Подавленные эмоции", x: 170, y: 420 },
    { id: 6, label: "Глубинный страх", x: 0, y: 560 },
    { id: 7, label: "Путь интеграции", x: 0, y: 700 }
  ]
};

export const SpreadHeroPath: SpreadSchema = {
  id: "hero_path",
  name: "Путь героя",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Начало этапа", x: -220, y: 60 },
    { id: 2, label: "Вызов", x: -70, y: 60 },
    { id: 3, label: "Страх", x: 80, y: 60 },
    { id: 4, label: "Переломный момент", x: 240, y: 430 },
    { id: 5, label: "Урок", x: 90, y: 430 },
    { id: 6, label: "Трансформация", x: -60, y: 430 },
    { id: 7, label: "Новый уровень", x: -210, y: 430 }
  ]
};

export const SpreadBalanceWheel: SpreadSchema = {
  id: "balance_wheel",
  name: "Колесо баланса",
  cardCount: 8,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7, 8],
  positions: [
    { id: 1, label: "Здоровье", x: 0, y: 20 },
    { id: 2, label: "Отношения", x: -170, y: 170 },
    { id: 3, label: "Работа", x: 170, y: 170 },
    { id: 4, label: "Финансы", x: -230, y: 330 },
    { id: 5, label: "Развитие", x: 230, y: 330 },
    { id: 6, label: "Отдых", x: -170, y: 500 },
    { id: 7, label: "Эмоции", x: 170, y: 500 },
    { id: 8, label: "Духовность", x: 0, y: 660 }
  ]
};

export const SpreadResetReload: SpreadSchema = {
  id: "reset_reload",
  name: "Перезагрузка",
  cardCount: 6,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6],
  positions: [
    { id: 1, label: "Что завершить", x: -220, y: 80 },
    { id: 2, label: "Что отпустить", x: 0, y: 80 },
    { id: 3, label: "Главный урок", x: 220, y: 80 },
    { id: 4, label: "Новый фокус", x: -220, y: 420 },
    { id: 5, label: "Ресурс", x: 0, y: 420 },
    { id: 6, label: "Итог", x: 220, y: 420 }
  ]
};

export const SpreadSoulPurpose: SpreadSchema = {
  id: "soul_purpose",
  name: "Предназначение души",
  cardCount: 7,
  deckType: "rws",
  openingRules: "in-order",
  openOrder: [1, 2, 3, 4, 5, 6, 7],
  positions: [
    { id: 1, label: "Суть души", x: 0, y: 300 },
    { id: 2, label: "Дар", x: 0, y: 40 },
    { id: 3, label: "Талант", x: -170, y: 170 },
    { id: 4, label: "Кармический урок", x: 170, y: 170 },
    { id: 5, label: "Препятствие", x: -170, y: 430 },
    { id: 6, label: "Поддержка", x: 170, y: 430 },
    { id: 7, label: "Итог пути", x: 0, y: 620 }
  ]
};

const LENORMAND_LAYOUT_SCALE_X = 5.6;
const LENORMAND_LAYOUT_SCALE_Y = 7;
const MANARA_LAYOUT_SCALE_X = 5.4;
const MANARA_LAYOUT_SCALE_Y = 6.8;
const ANGELS_LAYOUT_SCALE_X = 5.8;
const ANGELS_LAYOUT_SCALE_Y = 7.2;
const GOLDEN_LAYOUT_SCALE_X = 5.8;
const GOLDEN_LAYOUT_SCALE_Y = 7.2;
const SILA_RODA_LAYOUT_SCALE_X = 6.4;
const SILA_RODA_LAYOUT_SCALE_Y = 8;

interface LayoutScaleOptions {
  scaleX?: number;
  scaleY?: number;
}

const toScaledPositions = (
  positions: Array<{ index: number; x: number; y: number; label?: string }>,
  defaults: { scaleX: number; scaleY: number },
  options?: LayoutScaleOptions
): SpreadPosition[] =>
  positions.map((position) => ({
    id: position.index,
    label: position.label ?? `Позиция ${position.index}`,
    x: Math.round((position.x - 50) * (options?.scaleX ?? defaults.scaleX)),
    y: Math.round((position.y - 50) * (options?.scaleY ?? defaults.scaleY))
  }));

const LENORMAND_SCHEMAS = LENORMAND_SPREADS.reduce((acc, spread) => {
  const layoutOptions =
    spread.id === "lenormand_grand_tableau"
      ? {
          scaleX: 2.6,
          scaleY: 3.4
        }
      : undefined;
  acc[spread.id as LenormandSpreadId] = {
    id: spread.id,
    name: spread.title,
    cardCount: spread.cardsCount,
    deckType: "lenormand",
    openingRules: "in-order",
    openOrder: spread.openOrder,
    positions: toScaledPositions(
      spread.positions,
      { scaleX: LENORMAND_LAYOUT_SCALE_X, scaleY: LENORMAND_LAYOUT_SCALE_Y },
      layoutOptions
    )
  };
  return acc;
}, {} as Record<LenormandSpreadId, SpreadSchema>);

const MANARA_LAYOUT_OPTIONS_BY_SPREAD: Partial<Record<ManaraSpreadId, LayoutScaleOptions>> = {
  manara_two_hearts: {
    scaleX: 9,
    scaleY: 11
  },
  manara_relationship_future: {
    scaleX: 5.6,
    scaleY: 10
  },
  manara_his_intentions: {
    scaleX: 6.4,
    scaleY: 8.8
  },
  manara_feelings_actions: {
    scaleX: 6.4,
    scaleY: 8.8
  },
  manara_path: {
    scaleX: 6.4,
    scaleY: 8.8
  },
  manara_celtic_cross: {
    scaleX: 5.6,
    scaleY: 5.8
  }
};

const MANARA_SCHEMAS = MANARA_SPREADS.reduce((acc, spread) => {
  const layoutOptions = MANARA_LAYOUT_OPTIONS_BY_SPREAD[spread.id as ManaraSpreadId];
  acc[spread.id as ManaraSpreadId] = {
    id: spread.id,
    name: spread.title,
    cardCount: spread.cardsCount,
    deckType: "manara",
    openingRules: "in-order",
    openOrder: spread.openOrder,
    positions: toScaledPositions(
      spread.positions,
      { scaleX: MANARA_LAYOUT_SCALE_X, scaleY: MANARA_LAYOUT_SCALE_Y },
      layoutOptions
    )
  };
  return acc;
}, {} as Record<ManaraSpreadId, SpreadSchema>);

const ANGELS_LAYOUT_OPTIONS_BY_SPREAD: Partial<Record<AngelsSpreadId, LayoutScaleOptions>> = {
  angels_one_card: {
    scaleX: 6.8,
    scaleY: 8
  },
  angels_advice: {
    scaleX: 6.8,
    scaleY: 8.6
  },
  angels_yes_no_soft: {
    scaleX: 6.8,
    scaleY: 8.6
  },
  angels_vector: {
    scaleX: 7.2,
    scaleY: 7
  },
  angels_higher_connection_meaning: {
    scaleX: 6.2,
    scaleY: 8.4
  }
};

const ANGELS_SCHEMAS = ANGELS_SPREADS.reduce((acc, spread) => {
  const layoutOptions = ANGELS_LAYOUT_OPTIONS_BY_SPREAD[spread.id as AngelsSpreadId];
  acc[spread.id as AngelsSpreadId] = {
    id: spread.id,
    name: spread.title,
    cardCount: spread.cardsCount,
    deckType: "angels",
    openingRules: "in-order",
    openOrder: spread.openOrder,
    positions: toScaledPositions(
      spread.positions,
      { scaleX: ANGELS_LAYOUT_SCALE_X, scaleY: ANGELS_LAYOUT_SCALE_Y },
      layoutOptions
    )
  };
  return acc;
}, {} as Record<AngelsSpreadId, SpreadSchema>);

const GOLDEN_LAYOUT_OPTIONS_BY_SPREAD: Partial<Record<GoldenSpreadId, LayoutScaleOptions>> = {
  golden_money_flow: {
    scaleX: 6.4,
    scaleY: 7.2
  },
  golden_leadership: {
    scaleX: 6,
    scaleY: 8.2
  },
  golden_new_level: {
    scaleX: 6,
    scaleY: 8.2
  },
  golden_long_term_perspective: {
    scaleX: 5.6,
    scaleY: 7.2
  }
};

const GOLDEN_SCHEMAS = GOLDEN_SPREADS.reduce((acc, spread) => {
  const layoutOptions = GOLDEN_LAYOUT_OPTIONS_BY_SPREAD[spread.id as GoldenSpreadId];
  acc[spread.id as GoldenSpreadId] = {
    id: spread.id,
    name: spread.title,
    cardCount: spread.cardsCount,
    deckType: "golden",
    openingRules: "in-order",
    openOrder: spread.openOrder,
    positions: toScaledPositions(
      spread.positions,
      { scaleX: GOLDEN_LAYOUT_SCALE_X, scaleY: GOLDEN_LAYOUT_SCALE_Y },
      layoutOptions
    )
  };
  return acc;
}, {} as Record<GoldenSpreadId, SpreadSchema>);

const SILA_RODA_LAYOUT_OPTIONS_BY_SPREAD: Partial<Record<SilaRodaSpreadId, LayoutScaleOptions>> = {
  sila_roda_ancestors_message: {
    scaleX: 7.2,
    scaleY: 8.8
  },
  sila_roda_male_line: {
    scaleX: 7,
    scaleY: 8.4
  },
  sila_roda_abundance_stream: {
    scaleX: 7.2,
    scaleY: 8.6
  }
};

const SILA_RODA_SCHEMAS = SILA_RODA_SPREADS.reduce((acc, spread) => {
  const layoutOptions = SILA_RODA_LAYOUT_OPTIONS_BY_SPREAD[spread.id as SilaRodaSpreadId];
  acc[spread.id as SilaRodaSpreadId] = {
    id: spread.id,
    name: spread.title,
    cardCount: spread.cardsCount,
    deckType: "ancestry",
    openingRules: "in-order",
    openOrder: spread.openOrder,
    positions: toScaledPositions(
      spread.positions,
      { scaleX: SILA_RODA_LAYOUT_SCALE_X, scaleY: SILA_RODA_LAYOUT_SCALE_Y },
      layoutOptions
    )
  };
  return acc;
}, {} as Record<SilaRodaSpreadId, SpreadSchema>);

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
  wheel_of_year: SpreadWheelOfYear,
  we_and_perspective: SpreadWeAndPerspective,
  relationship_analysis: SpreadRelationshipAnalysis,
  new_person: SpreadNewPerson,
  love_triangle: SpreadLoveTriangle,
  future_relationships: SpreadFutureRelationships,
  conflict_reason: SpreadConflictReason,
  will_he_return: SpreadWillHeReturn,
  karmic_connection: SpreadKarmicConnection,
  work_current_situation: SpreadWorkCurrentSituation,
  change_job: SpreadChangeJob,
  career_growth: SpreadCareerGrowth,
  financial_flow: SpreadFinancialFlow,
  new_project: SpreadNewProject,
  finances_period: SpreadFinancesPeriod,
  team_work: SpreadTeamWork,
  vocation_profession: SpreadVocationProfession,
  inner_resource: SpreadInnerResource,
  inner_conflict: SpreadInnerConflict,
  shadow_side: SpreadShadowSide,
  hero_path: SpreadHeroPath,
  balance_wheel: SpreadBalanceWheel,
  reset_reload: SpreadResetReload,
  soul_purpose: SpreadSoulPurpose,
  ...LENORMAND_SCHEMAS,
  ...MANARA_SCHEMAS,
  ...ANGELS_SCHEMAS,
  ...GOLDEN_SCHEMAS,
  ...SILA_RODA_SCHEMAS
};
