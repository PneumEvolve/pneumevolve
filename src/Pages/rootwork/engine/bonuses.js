// src/Pages/rootwork/engine/bonuses.js — one place to read global bonuses
//
// getGlobalBonus(state, key) returns an ADDITIVE fraction (0.06 = +6%, -0.2 = -20%).
// Today it sums Town Project stages. Season modifiers will plug in here too, so the
// game code that reads a key never needs to change again.
//
// Keys wired into the game so far:
//   cropYield      — worker + manual harvest yield          (actions.js applyYieldBonuses)
//   fishingSpeed   — fishing worker catch speed             (tick.js)
//   sellPrice      — market worker sale price               (tick.js)
//   heroXp         — hero mission XP                        (heroes.js returnAdventurer)
//   missionDamage  — damage heroes take on missions         (heroes.js returnAdventurer)
//
// Keep this file free of imports from other engine files (only pure data) so it can be
// imported anywhere without creating import cycles.

import { PROJECTS } from "./projectsData.js";

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

export function getGlobalBonus(state, key) {
  if (!state) return 0;
  return getProjectBonus(state, key);
}