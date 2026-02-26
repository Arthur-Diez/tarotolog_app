import type { MetaphoricSpreadId, SpreadDef, SpreadPosition } from "@/data/rws_spreads";

const order = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

const GRID_COLUMNS = [24, 50, 76];
const GRID_ROWS = [24, 50, 76];

const createSequentialPositions = (count: number): SpreadPosition[] => {
  if (count === 1) {
    return [{ index: 1, x: 50, y: 50, label: "" }];
  }

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      index: index + 1,
      x: GRID_COLUMNS[col] ?? GRID_COLUMNS[GRID_COLUMNS.length - 1],
      y: GRID_ROWS[row] ?? GRID_ROWS[GRID_ROWS.length - 1],
      label: ""
    };
  });
};

const createSpread = (
  id: MetaphoricSpreadId,
  title: string,
  description: string,
  cardsCount: number
): SpreadDef => ({
  id,
  title,
  description,
  cardsCount,
  positions: createSequentialPositions(cardsCount),
  openOrder: order(cardsCount)
});

export const METAPHORIC_SPREADS: SpreadDef[] = [
  createSpread("metaphoric_card_of_day", "Карта дня", "1 карта · быстрый инсайт дня", 1),
  createSpread("metaphoric_moment_emotion", "Эмоция момента", "1 карта · эмоциональный срез текущего момента", 1),
  createSpread("metaphoric_quick_advice", "Быстрый совет", "1 карта · ключевая подсказка на сейчас", 1),
  createSpread("metaphoric_check_in", "Проверка состояния (Check-In)", "3 карты · самочувствие · фокус · действие", 3),
  createSpread("metaphoric_energy_obstacle_advice", "Энергия — Препятствие — Совет", "3 карты · ресурс · блок · решение", 3),
  createSpread("metaphoric_thoughts_feelings_actions", "Мысли — Чувства — Действия", "3 карты · внутренний и внешний контур", 3),
  createSpread("metaphoric_self_world_next_step", "Я — Мир — Следующий шаг", "3 карты · позиция · контекст · следующий шаг", 3),
  createSpread("metaphoric_strength_heart_challenge", "Сила — Сердце — Вызов", "3 карты · опора · эмоции · вызов", 3),
  createSpread("metaphoric_situation_cause_solution", "Ситуация — Причина — Решение", "3 карты · анализ причины и выхода", 3),
  createSpread("metaphoric_old_story_new_story_action", "Старая история — Новая история — Действие", "3 карты · трансформация сценария", 3),
  createSpread("metaphoric_inner_conflict", "Внутренний конфликт", "5 карт · противоречие · выбор · интеграция", 5),
  createSpread("metaphoric_new_stage", "Новый этап", "5 карт · переход · ресурс · закрепление", 5),
  createSpread("metaphoric_personal_decision", "Личное решение", "5 карт · выбор · риск · поддержка", 5),
  createSpread("metaphoric_life_balance", "Баланс жизни", "5 карт · сферы жизни · равновесие", 5),
  createSpread("metaphoric_self_reflection", "Саморефлексия (Self-Reflection)", "5 карт · зеркало состояния · вывод", 5),
  createSpread("metaphoric_relationships_without_masks", "Отношения без масок", "6 карт · честный срез взаимодействия", 6),
  createSpread("metaphoric_dialogue_with_subconscious", "Диалог с подсознанием", "7 карт · глубинный внутренний диалог", 7),
  createSpread("metaphoric_transformation_path", "Путь трансформации", "7 карт · этапы изменений", 7),
  createSpread("metaphoric_release", "Освобождение", "7 карт · отпускание · восстановление", 7),
  createSpread("metaphoric_inner_resource", "Внутренний ресурс", "7 карт · опора · энергия · активация", 7),
  createSpread("metaphoric_reality_vs_perception", "Реальность и восприятие (Reality vs Perception)", "7 карт · факты · интерпретации · синтез", 7),
  createSpread("metaphoric_horseshoe_guidance", "Подкова (Путеводный расклад)", "7 карт · путь · развилка · итог", 7),
  createSpread("metaphoric_dialogue_with_self", "Диалог с собой", "9 карт · многослойный внутренний разговор", 9),
  createSpread("metaphoric_life_reboot", "Перезагрузка жизни", "9 карт · перезапуск фокуса и стратегии", 9),
  createSpread("metaphoric_personality_archetype", "Архетип личности", "9 карт · ключевой паттерн и проявления", 9)
];

export const METAPHORIC_SPREADS_MAP: Record<MetaphoricSpreadId, SpreadDef> = Object.fromEntries(
  METAPHORIC_SPREADS.map((spread) => [spread.id, spread])
) as Record<MetaphoricSpreadId, SpreadDef>;
