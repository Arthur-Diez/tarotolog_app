import type { MetaphoricSpreadId } from "@/data/rws_spreads";

export const METAPHORIC_SPREAD_ENERGY_COSTS: Record<MetaphoricSpreadId, number> = {
  metaphoric_card_of_day: 2,
  metaphoric_moment_emotion: 2,
  metaphoric_quick_advice: 2,
  metaphoric_check_in: 7,
  metaphoric_energy_obstacle_advice: 8,
  metaphoric_thoughts_feelings_actions: 8,
  metaphoric_self_world_next_step: 9,
  metaphoric_strength_heart_challenge: 10,
  metaphoric_situation_cause_solution: 10,
  metaphoric_old_story_new_story_action: 11,
  metaphoric_inner_conflict: 10,
  metaphoric_new_stage: 14,
  metaphoric_personal_decision: 14,
  metaphoric_life_balance: 15,
  metaphoric_self_reflection: 12,
  metaphoric_relationships_without_masks: 19,
  metaphoric_dialogue_with_subconscious: 25,
  metaphoric_transformation_path: 23,
  metaphoric_release: 21,
  metaphoric_inner_resource: 19,
  metaphoric_reality_vs_perception: 20,
  metaphoric_horseshoe_guidance: 25,
  metaphoric_dialogue_with_self: 30,
  metaphoric_life_reboot: 33,
  metaphoric_personality_archetype: 30
};

const hasMetaphoricSpreadEnergyCost = (spreadId: string): spreadId is MetaphoricSpreadId =>
  Object.prototype.hasOwnProperty.call(METAPHORIC_SPREAD_ENERGY_COSTS, spreadId);

export function getMetaphoricSpreadEnergyCost(spreadId: string, cardsCount: number): number {
  if (hasMetaphoricSpreadEnergyCost(spreadId)) {
    return METAPHORIC_SPREAD_ENERGY_COSTS[spreadId];
  }
  return Math.max(2, cardsCount * 2);
}
