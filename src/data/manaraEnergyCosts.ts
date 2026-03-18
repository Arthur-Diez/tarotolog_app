import type { ManaraSpreadId } from "@/data/rws_spreads";

export const MANARA_SPREAD_ENERGY_COSTS: Record<ManaraSpreadId, number> = {
  manara_mystery_love: 39,
  manara_love_check: 20,
  manara_two_hearts: 30,
  manara_relationship_future: 49,
  manara_his_intentions: 25,
  manara_feelings_actions: 22,
  manara_three_cards: 6,
  manara_path: 33,
  manara_celtic_cross: 50
};

const hasManaraSpreadEnergyCost = (spreadId: string): spreadId is ManaraSpreadId =>
  Object.prototype.hasOwnProperty.call(MANARA_SPREAD_ENERGY_COSTS, spreadId);

export function getManaraSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasManaraSpreadEnergyCost(spreadId)) {
    return MANARA_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
