// src/Pages/rootwork/engine/bonuses.js — one place to read global bonuses
//
// getGlobalBonus(state, key) returns an ADDITIVE fraction (0.06 = +6%, -0.2 = -20%).
// It sums Town Project stages + active Rush contract boosts + this season's modifier.
// Full list of keys and what they do: see the top of modifiersData.js.
//
// Keys wired into the game so far:
//   cropYield      — worker + manual harvest yield          (actions.js applyYieldBonuses)
//   fishingSpeed   — fishing worker catch speed             (tick.js)
//   sellPrice      — market worker sale price               (tick.js)
//   heroXp         — ALL hero XP: missions, auto-battle, expeditions, dungeon, bosses
//                    (heroes.js, roads.js, dungeon.js, boss.js)
//   missionDamage  — damage heroes take on missions         (heroes.js returnAdventurer)
//   contractRefillSpeed — how fast empty contract slots refill (contracts.js)
//   contractSeals  — FLAT extra seals per delivered contract (contracts.js)
//
// Keep this file free of imports from other engine files (only pure data) so it can be
// imported anywhere without creating import cycles.

import { PROJECTS } from "./projectsData.js";
import { SEASON_MODIFIERS } from "./modifiersData.js";

// Season conditions (pick-1-of-3 modifiers) are switched off. While false, no modifier
// effect is applied and none are offered after prestige (see modifiers.js).
export const SEASON_MODIFIERS_ENABLED = false;

export function getProjectStage(state, projectId) {
  return state?.projects?.[projectId]?.stage ?? 0;
}

export function getProjectBonus(state, key) {
  let total = 0;
  for (const def of Object.values(PROJECTS)) {
    if (def.bonusKey !== key) continue;
    total += getProjectStage(state, def.id) * def.bonusPerStage;
  }
  return total;
}

// Rush contract boosts (inlined here instead of importing contracts.js, to avoid an import cycle)
export function getBoostBonus(state, key) {
  let total = 0;
  for (const b of state?.contracts?.boosts ?? []) {
    if (b.key === key && (b.secondsLeft ?? 0) > 0) total += b.value ?? 0;
  }
  return total;
}

// This season's modifier (null until the player picks one). Always 0 while conditions are off.
export function getModifierBonus(state, key) {
  if (!SEASON_MODIFIERS_ENABLED) return 0;
  const mod = SEASON_MODIFIERS[state?.seasonModifier];
  return mod?.effects?.[key] ?? 0;
}

export function getGlobalBonus(state, key) {
  if (!state) return 0;
  return getProjectBonus(state, key) + getBoostBonus(state, key) + getModifierBonus(state, key);
}