// src/Pages/rootwork/engine/modifiers.js — Season modifier roll / pick / reroll
//
// State:
//   state.seasonModifier      — id of this season's modifier, or null
//   state.modifierChoices     — [id, id, id] while a pick is pending
//   state.pendingModifierPick — true right after prestige until the player picks
// The effects themselves are read in engine/bonuses.js.

import {
  SEASON_MODIFIERS, SEASON_MODIFIER_ORDER, MODIFIER_FIRST_SEASON, MODIFIER_CHOICE_COUNT, MODIFIER_REROLL_COST,
} from "./modifiersData.js";
import { deepCloneState } from "./save.js";

export { SEASON_MODIFIERS, SEASON_MODIFIER_ORDER, MODIFIER_FIRST_SEASON, MODIFIER_CHOICE_COUNT, MODIFIER_REROLL_COST };

export function getSeasonModifier(state) {
  return SEASON_MODIFIERS[state?.seasonModifier] ?? null;
}

export function rollModifierChoices(exclude = []) {
  const pool = SEASON_MODIFIER_ORDER.filter((id) => !exclude.includes(id));
  const source = pool.length >= MODIFIER_CHOICE_COUNT ? pool : [...SEASON_MODIFIER_ORDER];
  const picks = [];
  const bag = [...source];
  while (picks.length < MODIFIER_CHOICE_COUNT && bag.length > 0) {
    picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  }
  return picks;
}

// Called from beginPrestige on the already-cloned `next` state (mutates it)
export function applyModifierRollOnPrestige(next, newSeason) {
  const previous = next.seasonModifier ?? null;
  next.seasonModifier = null;
  if (newSeason >= MODIFIER_FIRST_SEASON) {
    // Don't offer last season's modifier again
    next.modifierChoices = rollModifierChoices(previous ? [previous] : []);
    next.pendingModifierPick = true;
  } else {
    next.modifierChoices = [];
    next.pendingModifierPick = false;
  }
  return next;
}

export function pickSeasonModifier(state, modifierId) {
  if (!state.pendingModifierPick) return state;
  if (!(state.modifierChoices ?? []).includes(modifierId)) return state;
  const def = SEASON_MODIFIERS[modifierId];
  if (!def) return state;
  const next = deepCloneState(state);
  next.seasonModifier = modifierId;
  next.pendingModifierPick = false;
  next.modifierChoices = [];
  if (def.bonusPrestigePoints) {
    next.prestigePoints = (next.prestigePoints ?? 0) + def.bonusPrestigePoints;
  }
  return next;
}

export function canRerollSeasonModifiers(state) {
  return !!state.pendingModifierPick && (state.contracts?.seals ?? 0) >= MODIFIER_REROLL_COST;
}

export function rerollSeasonModifiers(state) {
  if (!canRerollSeasonModifiers(state)) return state;
  const next = deepCloneState(state);
  next.contracts.seals -= MODIFIER_REROLL_COST;
  next.contracts.shop = { ...(next.contracts.shop ?? {}) };
  next.contracts.shop.modifier_reroll = (next.contracts.shop.modifier_reroll ?? 0) + 1;
  next.modifierChoices = rollModifierChoices(state.modifierChoices ?? []);
  return next;
}