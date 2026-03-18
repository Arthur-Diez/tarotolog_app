import type { GoldenSpreadId } from "@/data/rws_spreads";

export const GOLDEN_SPREAD_ENERGY_COSTS: Record<GoldenSpreadId, number> = {
  golden_crown_opportunities: 16,
  golden_big_game: 27,
  golden_path_success: 23,
  golden_influence_resources: 19,
  golden_money_flow: 20,
  golden_investment: 25,
  golden_financial_forecast: 30,
  golden_risk_reward: 16,
  golden_strong_decision: 15,
  golden_competitive_field: 18,
  golden_negotiations: 17,
  golden_leadership: 20,
  golden_abundance_level: 16,
  golden_new_level: 27,
  golden_image_reputation: 18,
  golden_long_term_perspective: 45
};

const hasGoldenSpreadEnergyCost = (spreadId: string): spreadId is GoldenSpreadId =>
  Object.prototype.hasOwnProperty.call(GOLDEN_SPREAD_ENERGY_COSTS, spreadId);

export function getGoldenSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasGoldenSpreadEnergyCost(spreadId)) {
    return GOLDEN_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
