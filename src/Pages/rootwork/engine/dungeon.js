// src/Pages/rootwork/engine/dungeon.js — dungeon
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
import { getAdventurerMaxHp, getAdventurerXpNeeded, isHeroBusy } from "./heroes.js";
import { isHeroOnExpedition } from "./roads.js";

// --- DUNGEON -----------------------------------------------------------------------


// Apply dungeon run results: deliver loot to worldResources + XP to each hero
export function applyDungeonResult(state, result) {
  let next = { ...state };

  // NOTE: Loot is NOT applied here -- it is applied when the player clicks "Claim Reward"
  // This way retreat/finish goes to pending and clicking claim adds it to inventory.

  // Apply XP per hero, triggering level-ups via existing formula
  if (result.xpByHeroId && Object.keys(result.xpByHeroId).length > 0) {
    next.adventurers = (next.adventurers ?? []).map(adv => {
      const earned = result.xpByHeroId[adv.id] ?? 0;
      if (earned <= 0) return adv;
      let newXp = (adv.xp ?? 0) + earned;
      let newLevel = adv.level ?? 1;
      while (newXp >= getAdventurerXpNeeded(newLevel)) {
        newXp -= getAdventurerXpNeeded(newLevel);
        newLevel++;
      }
      const levelsGained = newLevel - (adv.level ?? 1);
      const newMaxHp = getAdventurerMaxHp({ ...adv, level: newLevel });
      const newSkillPoints = (adv.skillPoints ?? 0) + levelsGained;
      return { ...adv, xp: newXp, level: newLevel, maxHp: newMaxHp, skillPoints: newSkillPoints };
    });
  }

  // Apply foodBelt deductions
  if (result.foodBeltDeltas && Object.keys(result.foodBeltDeltas).length > 0) {
    next.adventurers = (next.adventurers ?? []).map(adv => {
      const deltas = result.foodBeltDeltas[adv.id];
      if (!deltas) return adv;
      const belt = { ...(adv.foodBelt ?? {}) };
      Object.entries(deltas).forEach(([itemId, used]) => {
        belt[itemId] = Math.max(0, (belt[itemId] ?? 0) - used);
        if (belt[itemId] === 0) delete belt[itemId];
      });
      return { ...adv, foodBelt: belt };
    });
  }

  // Persist hero HP from dungeon (heroes don't heal between runs)
  if (result.hpSnapshot && Object.keys(result.hpSnapshot).length > 0) {
    next.adventurers = (next.adventurers ?? []).map(adv => {
      const hp = result.hpSnapshot[adv.id];
      if (hp == null) return adv;
      return { ...adv, hp: Math.max(0, hp) };
    });
  }

  // Track max depth reached (for unlock system)
  if (result.depth && result.depth > (next.maxDungeonDepth ?? 1)) {
    next.maxDungeonDepth = Math.max(1, result.depth - 1);
  }

  // Store as pending claim
  next.pendingDungeonReward = result;
  next.dungeonRun = null; // clear the active run
  return next;
}


// --- DUNGEON STATE ---

export function getDungeonParty(state) {
  return (state.adventurers ?? []).filter(a => !isHeroBusy(state, a) && !a.tavernResting).slice(0, 3)
}

// Start a dungeon run -- lock heroes in game state
export function startDungeonRun(state, heroIds) {
  // Reject if any hero is busy (boss fight, expedition, mission, tavern)
  for (const heroId of heroIds) {
    const hero = (state.adventurers ?? []).find(a => a.id === heroId);
    if (!hero || isHeroBusy(state, hero) || hero.tavernResting) return state;
  }
  return { ...state, dungeonRun: { heroIds, mode: 'explore', active: true } };
}

// Save mid-run dungeon state (called on navigation away)
export function saveDungeonRun(state, runState) {
  if (!state.dungeonRun?.active) return state;
  return { ...state, dungeonRun: { ...state.dungeonRun, ...runState } };
}

// Clear dungeon run (called on retreat or exit)
export function clearDungeonRun(state) {
  return { ...state, dungeonRun: null };
}


// Claim the pending dungeon reward -- adds loot to worldResources
export function claimDungeonReward(state) {
  if (!state.pendingDungeonReward) return state;
  let next = { ...state };
  const reward = state.pendingDungeonReward;
  if (reward.loot && Object.keys(reward.loot).length > 0) {
    next.worldResources = { ...(next.worldResources ?? {}) };
    Object.entries(reward.loot).forEach(([key, val]) => {
      next.worldResources[key] = (next.worldResources[key] ?? 0) + val;
    });
  }
  next.pendingDungeonReward = null;
  return next;
}
