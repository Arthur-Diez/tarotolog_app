import type { SilaRodaSpreadId } from "@/data/rws_spreads";

export const SILA_RODA_SPREAD_ENERGY_COSTS: Record<SilaRodaSpreadId, number> = {
  sila_roda_roots_tree: 16,
  sila_roda_lineage_flow: 24,
  sila_roda_ancestors_message: 10,
  sila_roda_ancestral_scenario: 25,
  sila_roda_karmic_knot: 21,
  sila_roda_inherited_patterns: 21,
  sila_roda_power_within: 15,
  sila_roda_protection: 20,
  sila_roda_abundance_stream: 24,
  sila_roda_healing: 31,
  sila_roda_female_line: 15,
  sila_roda_male_line: 19
};

const hasSilaRodaSpreadEnergyCost = (spreadId: string): spreadId is SilaRodaSpreadId =>
  Object.prototype.hasOwnProperty.call(SILA_RODA_SPREAD_ENERGY_COSTS, spreadId);

export function getSilaRodaSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasSilaRodaSpreadEnergyCost(spreadId)) {
    return SILA_RODA_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
