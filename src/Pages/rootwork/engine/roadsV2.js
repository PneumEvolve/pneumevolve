// src/Pages/rootwork/engine/roadsV2.js — roads v2 + hero quick-go (Nov 2026 patch)
// Split out of gameEngine.js (Nov 2026). Import from "../gameEngine" elsewhere, not from here.

import {
  CROPS, GEAR, GEAR_ORDER, SEASONAL_QUESTS, QUEST_GATE_STARTS_SEASON, BARN_BUILDING_TIERS, FORGE_RECIPES,
  PLOT_BASE_COST, PLOT_COST_MULTIPLIER, MAX_PLOTS,
  WORKER_HIRE_BASE_COST, WORKER_HIRE_MULTIPLIER,
  SPECIALIZATIONS, SEASON_FARMS, FIRST_EXTRA_FARM_SEASON,
  AUTOMATION_THRESHOLD, MIN_PLOTS_FOR_AUTOMATION, PRESTIGE_MIN_PLOTS,
  MAX_OFFLINE_SECONDS, PROCESSING_RECIPES, TEND_SECONDS,
  SPECIALIZE_COST, SPECIALIZE_REQUIRES, PLOT_UPGRADE_GROW_MULTIPLIER, CROP_ARTISAN,
  FEAST_TIERS, FEAST_MAX_BONUS, MARKET_SELL_RATES,
  MARKET_WORKER_HIRE_COST, MARKET_WORKER_HIRE_MULTIPLIER,
  MARKET_WORKER_GEAR, MARKET_WORKER_GEAR_ORDER,
  KITCHEN_WORKER_HIRE_COST, KITCHEN_WORKER_HIRE_MULTIPLIER,
  KITCHEN_WORKER_UPGRADES, KITCHEN_WORKER_UPGRADE_ORDER,
  getPrestigeCashThreshold, getFarmUnlockCost, EXTRA_FARM_CROPS,
  FARM_INVESTMENT_PLOT_CAP, FARM_INVESTMENT_YIELD,
  SEASON_BARNS, FIRST_CHOICE_SEASON, PRESTIGE_MIN_BARN_WORKERS, PRESTIGE_MIN_BARN_ANIMALS,
  FISHING_WORKER_HIRE_COSTS,
  MARKET_WORKER_STANDING_ORDER_COST,
  TOWN_HOME_CAPACITY, TOWN_HOME_SECOND_COST, TOWN_HOME_COST_MULTIPLIER,
  TOWN_BAKERY_BASE_COST, TOWN_BAKERY_COST_MULTIPLIER,
  TOWN_JAM_BUILDING_COST, TOWN_SAUCE_BUILDING_COST,
  TOWN_PULSE_SECONDS, TOWN_GROWTH_PER_PULSE, TOWN_DECLINE_PER_PULSE,
  TOWN_HOME_INSTANT_POPULATION,
  TOWN_SATISFACTION_DEFAULT, TOWN_SATISFACTION_FLOOR, TOWN_SATISFACTION_CEILING,
  TOWN_SATISFACTION_STEP, TOWN_SATISFACTION_STARVE_STEP,
  TOWN_SAT_WHEAT, TOWN_SAT_BAKERY, TOWN_SAT_BAKERY_JAM,
  TOWN_SAT_BAKERY_SAUCE, TOWN_SAT_ALL_BUILDINGS,
  TOWN_PEOPLE_PER_GROWTH_BONUS, TOWN_GROWTH_BONUS_PER_STEP,
  TOWN_MAX_GROWTH_BONUS_PERCENT, TOWN_STARTING_PEOPLE,
  TOWN_HALL_MAX_LEVEL, TOWN_HALL_LEVEL_COSTS, TOWN_HALL_L1_IRON, TOWN_HALL_L1_LUMBER,
  TOWN_HALL_L2_IRON, TOWN_HALL_L2_LUMBER,
  TOWN_HALL_L3_IRON, TOWN_HALL_L3_LUMBER, TOWN_HALL_L3_FITTING,
  TOWN_HALL_L4_FITTING, TOWN_HALL_L4_CRATE,
  INVEST_NOW_PCT, INVEST_NOW_CD_SECONDS,
  TREASURY_TIERS, BUILDING_WORKERS_DIVISOR, BUILDING_PULSE_EXTRA_SECONDS,
  BUILDING_UPGRADE_COST, BANK_BUILD_COST, BANK_LEVEL_COSTS,
  BANK_TIERS, BANK_MAX_LEVEL, GEAR_CROP_COSTS, POND_COST, POND_IRON, POND_LUMBER, FORGE_BUILD_COST, FORGE_IRON, FORGE_LUMBER, NEEDLE_SWEEP_SPEED, REEL_DURATION,
  REEL_DRAIN_RATE, REEL_TAP_AMOUNT, BAIT_TYPES,
  ANIMAL_TYPES, MAX_ANIMALS_PER_TYPE,
  BARN_BUILDINGS, BARN_BUILDING_ORDER, BARN_UPKEEP_DEBT_MOOD_DRAIN,
  ANIMAL_INTERACT_MOOD_BOOST, ANIMAL_INTERACT_COOLDOWN,
  PET_TYPES, PET_INTERACT_MOOD_BOOST, PET_INTERACT_COOLDOWN,
  BAIT_RECIPES, BARN_WORKER_HIRE_BASE_COST, BARN_WORKER_HIRE_MULTIPLIER,
BARN_WORKER_UPGRADES, ANIMAL_STORAGE_UPGRADES,
BARN_WORKER_BASE_INTERVAL, BARN_WORKER_BASE_CAPACITY,
ANIMAL_BASE_STOCK_MAX, ANIMAL_OVERFULL_MOOD_DRAIN, ANIMAL_FOOD_COSTS, PET_FOOD_COST, BREAD_FOOD_UNITS,
PERSON_IDLE_FOOD_COST, PERSON_WORKING_FOOD_COST,
TOWN_CLINIC_COST, TOWN_SCHOOL_COST, TOWN_TAVERN_COST, TOWN_RESTAURANT_COST, TOWN_CLOTHIER_COST,
TOWN_REC_HALL_COST, TOWN_REC_HALL_REQUIRES, REC_HALL_SAT_PER_WORKER, REC_HALL_CASH_PER_WORKER,
REC_HALL_MAX_WORKERS_BASE, REC_HALL_MAX_WORKERS_PER_TIER, REC_HALL_UPGRADE_COSTS, REC_HALL_UPGRADE_REQUIRES,
CLINIC_CAP_PER_MEDIC, CLINIC_SAT_PER_MEDIC,
SCHOOL_GROW_PER_RESEARCHER, SCHOOL_RESEARCH_TIME_FLOOR,
TAVERN_SAT_PER_BARTENDER, TAVERN_GOODS_PER_PULSE_DIVISOR,
RESTAURANT_SAT_PER_CHEF, RESTAURANT_OMELETTE_PER_PULSE_DIVISOR, RESTAURANT_CHEESE_PER_PULSE_DIVISOR,
CLOTHIER_CASH_PER_CLERK, CLOTHIER_GOODS_PER_PULSE_DIVISOR,
FISHING_BODIES, FISHING_BODY_ORDER, FISHING_FISH,
FISHING_CATCH_RATES, FISHING_BAIT_BONUS,
FISHING_WORKER_UPGRADES, FISHING_WORKER_BASE_INTERVAL, FISHING_PLAYER_UPGRADES, ANIMAL_YIELD_UPGRADES, 
  SCHOOL_RESEARCH,
  PRESTIGE_SKILL_TREE,
  FORGE_WORKER_HIRE_COST, FORGE_WORKER_HIRE_MULTIPLIER,
  FORGE_WORKER_UPGRADES, FORGE_WORKER_UPGRADE_ORDER, FORGE_RECIPE_LIST,
  WORLD_ZONES, ADVENTURER_NAMES, ADVENTURER_CLASSES, WORLD_RESOURCES,
  ADVENTURER_BASE_HP, ADVENTURER_HP_PER_LEVEL, ADVENTURER_REGEN_PER_SECOND,
  TAVERN_REGEN_BONUS, TAVERN_LEVEL_COSTS, TAVERN_LEVEL_IRON, TAVERN_LEVEL_LUMBER, TAVERN_LEVEL_REGEN,
  ADVENTURER_BUFF_ITEMS, ADVENTURER_BUFF_LIST,
  ARTISAN_FOOD_HEAL, ARTISAN_FOOD_LIST,
  WORLD_WORKER_HIRE_COST,
  HERO_SKILL_TREES, HERO_SKILL_DEFS, HERO_CLASS_META,
  HERO_PRESTIGE_COST_BASE, HERO_PRESTIGE_SKILL_COST, HERO_PRESTIGE_MIN_LEVEL, HERO_PRESTIGE_REVIVE_BASE,
  HERO_DIP_TREE_PRESTIGE_TIER1, HERO_DIP_TREE_PRESTIGE_TIER2,
  BOSS_DEFS, BOSS_ORDER, BOSS_TICK_INTERVAL, generateInfiniteBoss,
  BOSS_HERO_DAMAGE_LEVEL_SCALE, BOSS_HERO_DAMAGE_GEAR_SCALE,
  BOSS_ABILITIES, BOSS_UNLOCK_LEVEL,
  // New town building constants
  FOOD_HALL_SAT_CEILING, FOOD_HALL_FOOD_MODE,
  TOWN_HALL_BUILDING_GATES,
  CLINIC_BASE_CAP,
  TOWN_FOOD_HALL_COST, TOWN_FOOD_HALL_TIER2_COST, TOWN_FOOD_HALL_TIER3_COST,
  TOWN_FOOD_HALL_TIER2_REQUIRES, TOWN_FOOD_HALL_TIER3_REQUIRES,
  TOWN_WAREHOUSE_COST, WAREHOUSE_LEVEL_COSTS, WAREHOUSE_LEVEL_REQUIRES,
  WAREHOUSE_NO_BUILDING_CAP, WAREHOUSE_LEVEL_BASE_CAP, WAREHOUSE_LEVEL_CAP_PER_WORKER, WAREHOUSE_LEVEL_MAX_WORKERS, WAREHOUSE_LEVEL_NAMES,
  TOWN_KITCHEN_HALL_COST, KITCHEN_HALL_LEVEL_COSTS, KITCHEN_HALL_LEVEL_REQUIRES,
  KITCHEN_HALL_MAX_WORKERS, KITCHEN_HALL_RETAIN_COUNT,
  TOWN_MARKET_HALL_COST, MARKET_HALL_LEVEL_COSTS, MARKET_HALL_LEVEL_REQUIRES,
  MARKET_HALL_MAX_WORKERS, MARKET_HALL_PRICE_BONUS, MARKET_HALL_RETAIN_COUNT,
  TOWN_BARN_HALL_COST, BARN_HALL_LEVEL_COSTS, BARN_HALL_LEVEL_REQUIRES,
  TOWN_FORGE_HALL_COST, FORGE_HALL_LEVEL_COSTS, FORGE_HALL_LEVEL_REQUIRES,
  TOWN_GUILD_HALL_COST, getGuildHallUpgradeCost, getGuildHallUpgradeRequires,
  GUILD_HALL_QUEST_TIER,
  ROAD_TIERS, TRADE_TOWNS, TRADE_TOWN_ORDER,
  EXPEDITION_TIERS, EXPEDITION_TIER_ORDER, EXPEDITION_CLASS_BONUSES,
} from "../gameConstants";
import { _legacySendAdventurer } from "./heroes.js";
import { _legacyBuildOrUpgradeRoad, _legacySendExpedition, getRoadLevel, isHeroBusyForExpedition, isRoadEnabled } from "./roads.js";

// ═════════════════════════════════════════════════════════════════════════════
// ROADS v2 — "on" is player intent, "paused" is unpaid. Roads never switch
// themselves off any more: if upkeep can't be paid they pause, and resume on
// their own once iron/lumber is back. Sending heroes on an expedition turns its
// road on. Newly built roads start OFF.
// ═════════════════════════════════════════════════════════════════════════════

export function isRoadPaused(state, roadLevel) {
  return !!(state.roads?.unpaid?.[roadLevel]);
}

export function isRoadActive(state, roadLevel) {
  return getRoadLevel(state) >= roadLevel && isRoadEnabled(state, roadLevel) && !isRoadPaused(state, roadLevel);
}

export function tickRoads(state) {
  const level = getRoadLevel(state);
  if (level === 0) return state;
  const wr = { ...(state.worldResources ?? {}) };
  const unpaid = {};
  for (let i = 0; i < level; i++) {
    const rt = ROAD_TIERS[i];
    if (!rt || !isRoadEnabled(state, rt.level)) continue;
    const iron = rt.upkeepPerTick.iron_ore ?? 0;
    const lumber = rt.upkeepPerTick.lumber ?? 0;
    if ((wr.iron_ore ?? 0) >= iron && (wr.lumber ?? 0) >= lumber) {
      wr.iron_ore = (wr.iron_ore ?? 0) - iron;
      wr.lumber = (wr.lumber ?? 0) - lumber;
    } else {
      unpaid[rt.level] = true;
    }
  }
  const disrupted = Object.keys(unpaid).length > 0;
  return { ...state, worldResources: wr, roads: { ...(state.roads ?? {}), unpaid, disrupted } };
}

export function isTownConnected(state, townId) {
  const def = TRADE_TOWNS[townId];
  if (!def) return false;
  return isRoadActive(state, def.roadLevel);
}

export function isSpecificRoadConnected(state, roadLevel) {
  return isRoadActive(state, roadLevel);
}

export function buildOrUpgradeRoad(state) {
  const built = _legacyBuildOrUpgradeRoad(state);
  if (built === state) return state;
  const newLevel = built.roads?.level ?? 0;
  const roads = { ...(state.roads ?? {}), level: newLevel, unpaid: { ...(state.roads?.unpaid ?? {}) } };
  roads["road_" + newLevel + "_enabled"] = false; // new road starts OFF
  return { ...built, roads };
}

export function getExpeditionAvailable(state, tierId) {
  const tier = EXPEDITION_TIERS[tierId];
  if (!tier) return false;
  const ghLevel = state.town?.buildings?.guild_hall?.level ?? 0;
  return ghLevel >= tier.ghLevel && getRoadLevel(state) >= tier.roadLevel;
}

export function sendExpedition(state, tierId, heroIds) {
  const tier = EXPEDITION_TIERS[tierId];
  if (!tier) return state;
  const roads = { ...(state.roads ?? {}) };
  roads["road_" + tier.roadLevel + "_enabled"] = true; // sending heroes turns the road on
  const withRoad = { ...state, roads };

  const existing = (state.expeditions ?? {})[tierId];
  if (existing) {
    // Adding heroes to an expedition that's already running
    const newIds = (heroIds ?? []).filter((id) => !(existing.heroIds ?? []).includes(id));
    if (newIds.length === 0) return state;
    if ((existing.heroIds ?? []).length + newIds.length > tier.maxHeroes) return state;
    const heroes = newIds.map((id) => (state.adventurers ?? []).find((a) => a.id === id));
    if (heroes.some((h) => !h || isHeroBusyForExpedition(state, h))) return state;
    const added = Object.fromEntries(heroes.map((h) => [h.id, { hp: h.hp ?? h.maxHp ?? 40, foodBelt: { ...(h.foodBelt ?? {}) } }]));
    return {
      ...withRoad,
      expeditions: {
        ...(state.expeditions ?? {}),
        [tierId]: { ...existing, heroIds: [...(existing.heroIds ?? []), ...newIds], heroStates: { ...(existing.heroStates ?? {}), ...added } },
      },
    };
  }

  const sent = _legacySendExpedition(withRoad, tierId, heroIds);
  return sent === withRoad ? state : sent;
}

// ─── Heroes: remember last zone + mode so the collapsed card can one-tap Go ──
export function sendAdventurer(state, adventurerId, zoneId, autoBattle = false) {
  const sent = _legacySendAdventurer(state, adventurerId, zoneId, autoBattle);
  if (sent === state) return state;
  return {
    ...sent,
    adventurers: (sent.adventurers ?? []).map((a) =>
      a.id === adventurerId ? { ...a, lastZoneId: zoneId, lastAutoBattle: !!autoBattle } : a
    ),
  };
}

// PATCHED: roads+heroes v1
