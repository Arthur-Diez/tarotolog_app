import type { RwsSpreadId } from "@/data/rws_spreads";

export const RWS_SPREAD_ENERGY_COSTS: Record<RwsSpreadId, number> = {
  one_card: 2,
  yes_no: 5,
  three_cards: 6,
  cross: 8,
  five_cards: 10,
  horseshoe: 30,
  star: 33,
  pyramid: 18,
  celtic_cross: 40,
  wheel_of_year: 70,
  we_and_perspective: 8,
  relationship_analysis: 10,
  new_person: 10,
  love_triangle: 16,
  future_relationships: 12,
  conflict_reason: 10,
  will_he_return: 20,
  karmic_connection: 21,
  work_current_situation: 6,
  change_job: 12,
  career_growth: 10,
  financial_flow: 20,
  new_project: 23,
  finances_period: 26,
  team_work: 16,
  vocation_profession: 35,
  inner_resource: 17,
  inner_conflict: 15,
  shadow_side: 40,
  hero_path: 33,
  balance_wheel: 30,
  reset_reload: 36,
  soul_purpose: 31
};

const hasRwsSpreadEnergyCost = (spreadId: string): spreadId is RwsSpreadId =>
  Object.prototype.hasOwnProperty.call(RWS_SPREAD_ENERGY_COSTS, spreadId);

export function getRwsSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasRwsSpreadEnergyCost(spreadId)) {
    return RWS_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
