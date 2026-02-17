import type { GoldenSpreadId, SpreadDef } from "@/data/rws_spreads";

const order = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

export const GOLDEN_SPREADS: SpreadDef[] = [
  {
    id: "golden_crown_opportunities",
    title: "Корона возможностей (5 карт)",
    description: "5 карт · рост · статус · стратегический результат",
    cardsCount: 5,
    positions: [
      { index: 1, x: 22, y: 62, label: "Текущая позиция" },
      { index: 2, x: 38, y: 30, label: "Скрытая возможность" },
      { index: 3, x: 62, y: 30, label: "Препятствие роста" },
      { index: 4, x: 78, y: 62, label: "Ресурс влияния" },
      { index: 5, x: 50, y: 62, label: "Итог при правильной стратегии" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_big_game",
    title: "Большая игра (7 карт)",
    description: "7 карт · стратегия · конкуренция · исход",
    cardsCount: 7,
    positions: [
      { index: 1, x: 24, y: 24, label: "Ваша роль" },
      { index: 2, x: 50, y: 24, label: "Скрытые игроки" },
      { index: 3, x: 76, y: 24, label: "Внешняя среда" },
      { index: 4, x: 50, y: 50, label: "Центральная стратегия" },
      { index: 5, x: 24, y: 76, label: "Риск" },
      { index: 6, x: 50, y: 76, label: "Поддержка" },
      { index: 7, x: 76, y: 76, label: "Финальный исход" }
    ],
    openOrder: order(7)
  },
  {
    id: "golden_path_success",
    title: "Путь к успеху (6 карт)",
    description: "6 карт · ускорение · ресурс · рост",
    cardsCount: 6,
    positions: [
      { index: 1, x: 24, y: 66, label: "Точка старта" },
      { index: 2, x: 38, y: 44, label: "Ближайший шаг" },
      { index: 3, x: 50, y: 24, label: "Главный ресурс" },
      { index: 4, x: 62, y: 44, label: "Слабое место" },
      { index: 5, x: 76, y: 66, label: "Возможность ускорения" },
      { index: 6, x: 50, y: 88, label: "Результат" }
    ],
    openOrder: order(6)
  },
  {
    id: "golden_influence_resources",
    title: "Ресурсы влияния (5 карт)",
    description: "5 карт · авторитет · связи · рычаги",
    cardsCount: 5,
    positions: [
      { index: 1, x: 26, y: 50, label: "Личный авторитет" },
      { index: 2, x: 50, y: 24, label: "Интеллектуальный ресурс" },
      { index: 3, x: 74, y: 50, label: "Социальные связи" },
      { index: 4, x: 50, y: 76, label: "Финансовый ресурс" },
      { index: 5, x: 50, y: 50, label: "Главный рычаг влияния" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_money_flow",
    title: "Денежный поток (5 карт)",
    description: "5 карт · доход · утечки · усиление",
    cardsCount: 5,
    positions: [
      { index: 1, x: 14, y: 50, label: "Источник дохода" },
      { index: 2, x: 32, y: 50, label: "Текущий поток" },
      { index: 3, x: 50, y: 50, label: "Утечка" },
      { index: 4, x: 68, y: 50, label: "Возможность усиления" },
      { index: 5, x: 86, y: 50, label: "Итог периода" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_investment",
    title: "Инвестиция (6 карт)",
    description: "6 карт · потенциал · риски · рекомендация",
    cardsCount: 6,
    positions: [
      { index: 1, x: 36, y: 24, label: "Потенциал проекта" },
      { index: 2, x: 64, y: 24, label: "Скрытые риски" },
      { index: 3, x: 36, y: 50, label: "Срок окупаемости" },
      { index: 4, x: 64, y: 50, label: "Неочевидный фактор" },
      { index: 5, x: 50, y: 74, label: "Результат вложения" },
      { index: 6, x: 50, y: 90, label: "Общая рекомендация" }
    ],
    openOrder: order(6)
  },
  {
    id: "golden_financial_forecast",
    title: "Финансовый прогноз (7 карт)",
    description: "7 карт · тенденции · риски · рост · итог",
    cardsCount: 7,
    positions: [
      { index: 1, x: 24, y: 24, label: "Текущая финансовая ситуация" },
      { index: 2, x: 50, y: 24, label: "Основной источник дохода" },
      { index: 3, x: 76, y: 24, label: "Внешние факторы влияния" },
      { index: 4, x: 50, y: 50, label: "Центральная финансовая тенденция периода" },
      { index: 5, x: 24, y: 76, label: "Риск или утечка средств" },
      { index: 6, x: 50, y: 76, label: "Возможность роста" },
      { index: 7, x: 76, y: 76, label: "Итог периода" }
    ],
    openOrder: order(7)
  },
  {
    id: "golden_risk_reward",
    title: "Риск и выгода (4 карты)",
    description: "4 карты · выгода · риск · итоговый баланс",
    cardsCount: 4,
    positions: [
      { index: 1, x: 38, y: 36, label: "Потенциальная прибыль" },
      { index: 2, x: 62, y: 36, label: "Реальная вероятность прибыли" },
      { index: 3, x: 38, y: 64, label: "Риск и возможные потери" },
      { index: 4, x: 62, y: 64, label: "Финальный баланс ситуации" }
    ],
    openOrder: order(4)
  },
  {
    id: "golden_strong_decision",
    title: "Сильное решение (5 карт)",
    description: "5 карт · стратегия · ресурс · решение",
    cardsCount: 5,
    positions: [
      { index: 1, x: 26, y: 50, label: "Текущая позиция" },
      { index: 2, x: 50, y: 24, label: "Скрытый фактор влияния" },
      { index: 3, x: 74, y: 50, label: "Давление или сопротивление" },
      { index: 4, x: 50, y: 76, label: "Ваш ресурс силы" },
      { index: 5, x: 50, y: 50, label: "Оптимальное решение" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_competitive_field",
    title: "Конкурентная среда (6 карт)",
    description: "6 карт · конкуренты · союзники · результат",
    cardsCount: 6,
    positions: [
      { index: 1, x: 24, y: 44, label: "Ваша позиция в среде" },
      { index: 2, x: 50, y: 24, label: "Главный конкурент" },
      { index: 3, x: 50, y: 44, label: "Скрытый оппонент" },
      { index: 4, x: 76, y: 44, label: "Союзник" },
      { index: 5, x: 50, y: 64, label: "Внешние обстоятельства" },
      { index: 6, x: 50, y: 84, label: "Итог взаимодействия" }
    ],
    openOrder: order(6)
  },
  {
    id: "golden_negotiations",
    title: "Переговоры (5 карт)",
    description: "5 карт · позиции сторон · итог переговоров",
    cardsCount: 5,
    positions: [
      { index: 1, x: 30, y: 28, label: "Ваша позиция" },
      { index: 2, x: 70, y: 28, label: "Позиция оппонента" },
      { index: 3, x: 50, y: 50, label: "Суть переговоров" },
      { index: 4, x: 30, y: 72, label: "Скрытый фактор" },
      { index: 5, x: 70, y: 72, label: "Итог сделки" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_leadership",
    title: "Лидерство (6 карт)",
    description: "6 карт · влияние · авторитет · итог",
    cardsCount: 6,
    positions: [
      { index: 1, x: 50, y: 12, label: "Личное влияние" },
      { index: 2, x: 50, y: 28, label: "Авторитет" },
      { index: 3, x: 50, y: 44, label: "Управленческие качества" },
      { index: 4, x: 50, y: 60, label: "Восприятие окружающими" },
      { index: 5, x: 50, y: 76, label: "Испытание лидерства" },
      { index: 6, x: 50, y: 92, label: "Итог позиции" }
    ],
    openOrder: order(6)
  },
  {
    id: "golden_abundance_level",
    title: "Уровень изобилия (5 карт)",
    description: "5 карт · потенциал · ограничения · максимум",
    cardsCount: 5,
    positions: [
      { index: 1, x: 26, y: 50, label: "Текущий уровень дохода" },
      { index: 2, x: 50, y: 24, label: "Внутренние установки" },
      { index: 3, x: 74, y: 50, label: "Внешние ограничения" },
      { index: 4, x: 50, y: 76, label: "Возможность роста" },
      { index: 5, x: 50, y: 50, label: "Реальный потолок периода" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_new_level",
    title: "Новый уровень (7 карт)",
    description: "7 карт · рост · барьер · переход",
    cardsCount: 7,
    positions: [
      { index: 1, x: 50, y: 12, label: "Текущая точка" },
      { index: 2, x: 50, y: 24, label: "Осознание необходимости роста" },
      { index: 3, x: 50, y: 36, label: "Главный барьер" },
      { index: 4, x: 50, y: 50, label: "Ресурс" },
      { index: 5, x: 50, y: 64, label: "Первый шаг" },
      { index: 6, x: 50, y: 78, label: "Переломный момент" },
      { index: 7, x: 50, y: 92, label: "Новый уровень" }
    ],
    openOrder: order(7)
  },
  {
    id: "golden_image_reputation",
    title: "Имидж и репутация (5 карт)",
    description: "5 карт · восприятие · сильные и слабые стороны",
    cardsCount: 5,
    positions: [
      { index: 1, x: 30, y: 28, label: "Внешний образ" },
      { index: 2, x: 70, y: 28, label: "Скрытое восприятие" },
      { index: 3, x: 50, y: 50, label: "Центральная репутация" },
      { index: 4, x: 30, y: 72, label: "Сильная сторона имиджа" },
      { index: 5, x: 70, y: 72, label: "Уязвимость образа" }
    ],
    openOrder: order(5)
  },
  {
    id: "golden_long_term_perspective",
    title: "Долгосрочная перспектива (9 карт)",
    description: "9 карт · стратегия · развитие · итог года",
    cardsCount: 9,
    positions: [
      { index: 1, x: 24, y: 24, label: "Стартовая позиция" },
      { index: 2, x: 50, y: 24, label: "Главная цель" },
      { index: 3, x: 76, y: 24, label: "Внешняя среда" },
      { index: 4, x: 24, y: 50, label: "Ресурсы" },
      { index: 5, x: 50, y: 50, label: "Центральная стратегия года" },
      { index: 6, x: 76, y: 50, label: "Основное испытание" },
      { index: 7, x: 24, y: 76, label: "Развитие" },
      { index: 8, x: 50, y: 76, label: "Результат" },
      { index: 9, x: 76, y: 76, label: "Итог года" }
    ],
    openOrder: order(9)
  }
];

export const GOLDEN_SPREADS_MAP: Record<GoldenSpreadId, SpreadDef> = Object.fromEntries(
  GOLDEN_SPREADS.map((spread) => [spread.id, spread])
) as Record<GoldenSpreadId, SpreadDef>;
