import type { LenormandSpreadId } from "@/data/rws_spreads";

export const LENORMAND_SPREAD_ENERGY_COSTS: Record<LenormandSpreadId, number> = {
  lenormand_one_card: 2,
  lenormand_three_cards: 5,
  lenormand_yes_no: 4,
  lenormand_we_and_connection: 18,
  lenormand_his_intentions: 14,
  lenormand_feelings_actions: 15,
  lenormand_work_money: 12,
  lenormand_week: 24,
  lenormand_next_month: 40,
  lenormand_wheel_of_year: 70,
  lenormand_square_9: 44,
  lenormand_grand_tableau: 99
};

const hasLenormandSpreadEnergyCost = (spreadId: string): spreadId is LenormandSpreadId =>
  Object.prototype.hasOwnProperty.call(LENORMAND_SPREAD_ENERGY_COSTS, spreadId);

export function getLenormandSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasLenormandSpreadEnergyCost(spreadId)) {
    return LENORMAND_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
