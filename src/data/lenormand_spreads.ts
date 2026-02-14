import type { LenormandSpreadId, SpreadDef } from "@/data/rws_spreads";

const order = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

export const LENORMAND_SPREADS: SpreadDef[] = [
  {
    id: "lenormand_one_card",
    title: "Одна карта (Событие дня)",
    description: "1 карта · ключевое событие дня",
    cardsCount: 1,
    positions: [{ index: 1, x: 50, y: 48, label: "Ключевое событие" }],
    openOrder: [1]
  },
  {
    id: "lenormand_three_cards",
    title: "Три карты (Ход событий)",
    description: "3 карты · текущая ситуация · развитие · итог",
    cardsCount: 3,
    positions: [
      { index: 1, x: 28, y: 50, label: "Текущая ситуация" },
      { index: 2, x: 50, y: 50, label: "Развитие" },
      { index: 3, x: 72, y: 50, label: "Итог" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "lenormand_yes_no",
    title: "Да или Нет (Фактический ответ)",
    description: "3 карты · за · главный фактор · против / итог",
    cardsCount: 3,
    positions: [
      { index: 1, x: 26, y: 64, label: "За" },
      { index: 2, x: 50, y: 36, label: "Главный фактор" },
      { index: 3, x: 74, y: 64, label: "Против / Итог" }
    ],
    openOrder: [1, 2, 3]
  },
  {
    id: "lenormand_his_intentions",
    title: "Его намерения",
    description: "5 карт · мысли · чувства · реальные действия · итог",
    cardsCount: 5,
    positions: [
      { index: 1, x: 16, y: 52, label: "Его мысли" },
      { index: 2, x: 50, y: 16, label: "Его чувства" },
      { index: 3, x: 50, y: 52, label: "Истинное намерение (центр)" },
      { index: 4, x: 84, y: 52, label: "Действия в ближайшее время" },
      { index: 5, x: 50, y: 88, label: "Итог для вас" }
    ],
    openOrder: order(5)
  },
  {
    id: "lenormand_feelings_actions",
    title: "Чувства и действия",
    description: "5 карт · эмоции · поступки · развитие",
    cardsCount: 5,
    positions: [
      { index: 1, x: 24, y: 18, label: "Его чувства" },
      { index: 2, x: 76, y: 18, label: "Его намерения" },
      { index: 3, x: 50, y: 54, label: "Главный фактор влияния" },
      { index: 4, x: 24, y: 90, label: "Его реальные действия" },
      { index: 5, x: 76, y: 90, label: "Развитие ситуации" }
    ],
    openOrder: order(5)
  },
  {
    id: "lenormand_work_money",
    title: "Работа и деньги",
    description: "5 карт · доход · возможности · риски · результат",
    cardsCount: 5,
    positions: [
      { index: 1, x: 26, y: 52, label: "Текущее положение" },
      { index: 2, x: 50, y: 24, label: "Возможность" },
      { index: 3, x: 42, y: 52, label: "Финансовый поток" },
      { index: 4, x: 58, y: 52, label: "Риск" },
      { index: 5, x: 50, y: 80, label: "Итог" }
    ],
    openOrder: order(5)
  },
  {
    id: "lenormand_we_and_connection",
    title: "Мы и связь",
    description: "5 карт · вы · партнёр · связь · препятствие · перспектива",
    cardsCount: 5,
    positions: [
      { index: 1, x: 24, y: 26, label: "Вы" },
      { index: 2, x: 72, y: 26, label: "Партнёр" },
      { index: 3, x: 50, y: 26, label: "Связь между вами" },
      { index: 4, x: 50, y: 54, label: "Препятствие" },
      { index: 5, x: 50, y: 80, label: "Перспектива" }
    ],
    openOrder: order(5)
  },
  {
    id: "lenormand_week",
    title: "Неделя",
    description: "7 карт · прогноз по дням недели",
    cardsCount: 7,
    positions: [
      { index: 1, x: 20, y: 34, label: "Понедельник" },
      { index: 2, x: 36, y: 34, label: "Вторник" },
      { index: 3, x: 52, y: 34, label: "Среда" },
      { index: 4, x: 68, y: 34, label: "Четверг" },
      { index: 5, x: 24, y: 66, label: "Пятница" },
      { index: 6, x: 40, y: 66, label: "Суббота" },
      { index: 7, x: 56, y: 66, label: "Воскресенье" }
    ],
    openOrder: order(7)
  },
  {
    id: "lenormand_next_month",
    title: "Ближайший месяц",
    description: "7 карт · прогноз по неделям",
    cardsCount: 7,
    positions: [
      { index: 1, x: 20, y: 34, label: "Неделя 1 · тема" },
      { index: 2, x: 40, y: 34, label: "Неделя 2 · тема" },
      { index: 3, x: 60, y: 34, label: "Неделя 3 · тема" },
      { index: 4, x: 80, y: 34, label: "Неделя 4 · тема" },
      { index: 5, x: 30, y: 68, label: "Вторая половина месяца · фон" },
      { index: 6, x: 50, y: 68, label: "Вторая половина месяца · фокус" },
      { index: 7, x: 70, y: 68, label: "Вторая половина месяца · итог" }
    ],
    openOrder: order(7)
  },
  {
    id: "lenormand_wheel_of_year",
    title: "Колесо года (12 карт)",
    description: "12 карт · годовой цикл · события по месяцам",
    cardsCount: 12,
    positions: [
      { index: 1, x: 50, y: 16, label: "Январь" },
      { index: 2, x: 67, y: 20, label: "Февраль" },
      { index: 3, x: 79, y: 33, label: "Март" },
      { index: 4, x: 84, y: 50, label: "Апрель" },
      { index: 5, x: 79, y: 67, label: "Май" },
      { index: 6, x: 67, y: 80, label: "Июнь" },
      { index: 7, x: 50, y: 84, label: "Июль" },
      { index: 8, x: 33, y: 80, label: "Август" },
      { index: 9, x: 21, y: 67, label: "Сентябрь" },
      { index: 10, x: 16, y: 50, label: "Октябрь" },
      { index: 11, x: 21, y: 33, label: "Ноябрь" },
      { index: 12, x: 33, y: 20, label: "Декабрь" }
    ],
    openOrder: order(12)
  },
  {
    id: "lenormand_square_9",
    title: "9-карточный квадрат (Анализ ситуации)",
    description: "9 карт · фон · развитие · итог и последствия",
    cardsCount: 9,
    positions: [
      { index: 1, x: 20, y: 18, label: "Фон 1" },
      { index: 2, x: 50, y: 18, label: "Фон 2" },
      { index: 3, x: 80, y: 18, label: "Фон 3" },
      { index: 4, x: 20, y: 50, label: "Развитие 1" },
      { index: 5, x: 50, y: 50, label: "Центральная тема" },
      { index: 6, x: 80, y: 50, label: "Развитие 3" },
      { index: 7, x: 20, y: 82, label: "Итог 1" },
      { index: 8, x: 50, y: 82, label: "Итог 2" },
      { index: 9, x: 80, y: 82, label: "Итог 3" }
    ],
    openOrder: order(9)
  },
  {
    id: "lenormand_grand_tableau",
    title: "Большой расклад Ленорман (Grand Tableau)",
    description: "36 карт · полный обзор жизни и судьбоносных событий",
    cardsCount: 36,
    positions: Array.from({ length: 36 }, (_, idx) => {
      const row = Math.floor(idx / 9);
      const col = idx % 9;
      const x = 6 + col * 11;
      const y = 16 + row * 20;
      return {
        index: idx + 1,
        x,
        y,
        label: `Карта ${idx + 1}`
      };
    }),
    openOrder: order(36)
  }
];

export const LENORMAND_SPREADS_MAP: Record<LenormandSpreadId, SpreadDef> = Object.fromEntries(
  LENORMAND_SPREADS.map((spread) => [spread.id, spread])
) as Record<LenormandSpreadId, SpreadDef>;
