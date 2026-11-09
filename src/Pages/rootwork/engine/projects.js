// src/Pages/rootwork/engine/projects.js — Town Projects (long-term resource sinks)
//
// State shape:
//   state.projects = {
//     granary: { stage: 2, progress: { wheat: 1200, iron_fitting: 4 }, unlocked: true },
//     ...
//   }
// Missing entries are fine — everything defaults to stage 0 / no progress / locked.
// Projects never reset on season prestige.

import { PROJECTS, PROJECT_ORDER, PROJECT_STAGE_COST_GROWTH } from "./projectsData.js";
import { getProjectStage } from "./bonuses.js";
import { deepCloneState } from "./save.js";

export { PROJECTS, PROJECT_ORDER, PROJECT_STAGE_COST_GROWTH };

// ─── Unlocks ──────────────────────────────────────────────────────────────────

function meetsUnlockCondition(state, projectId) {
  switch (projectId) {
    case "granary":
      return (state.farms ?? []).some((f) => f.crop === "tomatoes");
    case "lighthouse":
      return !!state.fishing?.bodies?.lake?.unlocked;
    case "grand_hall":
      return !!state.barnBuildings?.dairy?.built || (state.barnInstances ?? []).some((i) => i.buildingType === "dairy");
    case "monument":
      return (state.worldResources?.titan_core ?? 0) > 0
        || (state.questProgress?.bossFightsWon ?? 0) > 0;
    default:
      return false;
  }
}

// Once unlocked, a project stays unlocked (the flag is written by markProjectUnlocks in the tick)
export function isProjectUnlocked(state, projectId) {
  const p = state.projects?.[projectId];
  if (p?.unlocked) return true;
  if ((p?.stage ?? 0) > 0) return true;
  if (Object.values(p?.progress ?? {}).some((v) => v > 0)) return true;
  return meetsUnlockCondition(state, projectId);
}

// Called from tick(). tick() only shallow-clones state, so this never mutates the existing
// projects object — it swaps in a new one only when a project actually unlocks (rare).
export function markProjectUnlocks(next) {
  for (const id of PROJECT_ORDER) {
    if (next.projects?.[id]?.unlocked) continue;
    if (!meetsUnlockCondition(next, id)) continue;
    const prev = next.projects?.[id] ?? { stage: 0, progress: {} };
    next.projects = { ...(next.projects ?? {}), [id]: { ...prev, unlocked: true } };
  }
  return next;
}

// ─── Costs & progress ─────────────────────────────────────────────────────────

function roundNice(n) {
  if (n < 100) return Math.ceil(n);
  if (n < 1000) return Math.ceil(n / 5) * 5;
  if (n < 10000) return Math.ceil(n / 50) * 50;
  return Math.ceil(n / 500) * 500;
}

// Amount of one input needed for a given stage (0-indexed = number of stages already done)
export function getProjectInputCost(input, stage) {
  return roundNice(input.base * Math.pow(PROJECT_STAGE_COST_GROWTH, stage));
}

export function getProjectProgress(state, projectId) {
  return state.projects?.[projectId]?.progress ?? {};
}

// How much of an item the player currently has, wherever it's stored
export function getProjectStock(state, input) {
  switch (input.source) {
    case "crops":       return Math.floor(state.crops?.[input.key] ?? 0);
    case "artisan":     return Math.floor(state.artisan?.[input.key] ?? 0);
    case "animalGoods": return Math.floor(state.animalGoods?.[input.key] ?? 0);
    case "fish":        return Math.floor(state.fishing?.fish?.[input.key] ?? 0);
    case "world":       return Math.floor(state.worldResources?.[input.key] ?? 0);
    case "component":
      return Math.floor((state.worldResources?.[input.key] ?? 0) + (state.forgeGoods?.[input.key] ?? 0));
    default:            return 0;
  }
}

// Mutates `next` (must be a clone). Takes up to `amount`, returns how much it actually took.
// Shared with contracts.js — `input` just needs { key, source }.
export function takeProjectStock(next, input, amount) {
  let remaining = amount;
  const drain = (bag) => {
    if (!bag || remaining <= 0) return;
    const have = Math.floor(bag[input.key] ?? 0);
    const take = Math.min(have, remaining);
    bag[input.key] = (bag[input.key] ?? 0) - take;
    remaining -= take;
  };
  switch (input.source) {
    case "crops":       drain(next.crops); break;
    case "artisan":     drain(next.artisan); break;
    case "animalGoods": drain(next.animalGoods); break;
    case "fish":        drain(next.fishing?.fish); break;
    case "world":       drain(next.worldResources); break;
    case "component":   drain(next.worldResources); drain(next.forgeGoods); break;
    default: break;
  }
  return amount - remaining;
}

// Full view used by the UI: one row per input with need/have/deposited
export function getProjectView(state, projectId) {
  const def = PROJECTS[projectId];
  if (!def) return null;
  const stage = getProjectStage(state, projectId);
  const progress = getProjectProgress(state, projectId);
  const inputs = def.inputs.map((input) => {
    const need = getProjectInputCost(input, stage);
    const deposited = Math.min(need, Math.floor(progress[input.key] ?? 0));
    return {
      ...input,
      need,
      deposited,
      remaining: need - deposited,
      have: getProjectStock(state, input),
      done: deposited >= need,
    };
  });
  const totalNeed = inputs.reduce((s, i) => s + i.need, 0);
  // Stage % = average of each input's fill (so 10 fittings count as much as 4,000 wheat)
  const pct = inputs.length ? inputs.reduce((s, i) => s + i.deposited / i.need, 0) / inputs.length : 0;
  return {
    def,
    stage,
    unlocked: isProjectUnlocked(state, projectId),
    inputs,
    pct,
    totalNeed,
    currentBonus: stage * def.bonusPerStage,
    nextBonus: (stage + 1) * def.bonusPerStage,
    canDepositAny: inputs.some((i) => !i.done && i.have > 0),
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function finishStageIfComplete(next, projectId) {
  const def = PROJECTS[projectId];
  const entry = next.projects[projectId];
  const stage = entry.stage ?? 0;
  const done = def.inputs.every((input) => (entry.progress?.[input.key] ?? 0) >= getProjectInputCost(input, stage));
  if (!done) return false;
  entry.stage = stage + 1;
  entry.progress = {};
  return true;
}

/**
 * Deposit into a project.
 *   itemKey = null → deposit as much as possible of every input
 *   amount  = null → as much as possible of that input
 * Returns { state, deposited, completedStage } — state is unchanged if nothing moved.
 */
export function depositToProject(state, projectId, itemKey = null, amount = null) {
  const def = PROJECTS[projectId];
  if (!def || !isProjectUnlocked(state, projectId)) return { state, deposited: 0, completedStage: false };

  const next = deepCloneState(state);
  if (!next.projects) next.projects = {};
  if (!next.projects[projectId]) next.projects[projectId] = { stage: 0, progress: {} };
  const entry = next.projects[projectId];
  if (!entry.progress) entry.progress = {};
  entry.unlocked = true;
  const stage = entry.stage ?? 0;

  let deposited = 0;
  for (const input of def.inputs) {
    if (itemKey && input.key !== itemKey) continue;
    const need = getProjectInputCost(input, stage);
    const already = Math.floor(entry.progress[input.key] ?? 0);
    const room = Math.max(0, need - already);
    if (room <= 0) continue;
    const want = amount == null ? room : Math.min(room, Math.max(0, Math.floor(amount)));
    const toMove = Math.min(want, getProjectStock(next, input));
    if (toMove <= 0) continue;
    const moved = takeProjectStock(next, input, toMove);
    entry.progress[input.key] = already + moved;
    deposited += moved;
  }

  if (deposited <= 0) return { state, deposited: 0, completedStage: false };
  const completedStage = finishStageIfComplete(next, projectId);
  return { state: next, deposited, completedStage };
}

/**
 * Free progress (Seal Shop blueprint): adds `fraction` of each input's need for the current
 * stage, capped at what's still missing. Returns { state, completedStage }.
 */
export function grantProjectProgress(state, projectId, fraction) {
  const def = PROJECTS[projectId];
  if (!def || !isProjectUnlocked(state, projectId)) return { state, completedStage: false };
  const next = deepCloneState(state);
  if (!next.projects) next.projects = {};
  if (!next.projects[projectId]) next.projects[projectId] = { stage: 0, progress: {} };
  const entry = next.projects[projectId];
  if (!entry.progress) entry.progress = {};
  entry.unlocked = true;
  const stage = entry.stage ?? 0;
  for (const input of def.inputs) {
    const need = getProjectInputCost(input, stage);
    const already = Math.floor(entry.progress[input.key] ?? 0);
    const add = Math.min(need - already, Math.ceil(need * fraction));
    if (add > 0) entry.progress[input.key] = already + add;
  }
  const completedStage = finishStageIfComplete(next, projectId);
  return { state: next, completedStage };
}