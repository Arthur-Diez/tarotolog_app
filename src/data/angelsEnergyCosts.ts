import type { AngelsSpreadId } from "@/data/rws_spreads";

export const ANGELS_SPREAD_ENERGY_COSTS: Record<AngelsSpreadId, number> = {
  angels_one_card: 2,
  angels_advice: 4,
  angels_yes_no_soft: 5,
  angels_balance_soul: 10,
  angels_healing_needed: 8,
  angels_body_spirit_energy: 11,
  angels_soul_path: 15,
  angels_karmic_lesson: 11,
  angels_vector: 12,
  angels_relationship_support: 19,
  angels_union_harmony: 21,
  angels_higher_connection_meaning: 25
};

const hasAngelsSpreadEnergyCost = (spreadId: string): spreadId is AngelsSpreadId =>
  Object.prototype.hasOwnProperty.call(ANGELS_SPREAD_ENERGY_COSTS, spreadId);

export function getAngelsSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasAngelsSpreadEnergyCost(spreadId)) {
    return ANGELS_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
