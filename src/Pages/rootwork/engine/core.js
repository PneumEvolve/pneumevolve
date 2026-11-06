// src/Pages/rootwork/engine/core.js — ids, upgrade materials, population, treasury, town hall, prestige skills, automation
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
import { getRecHallSatBonus, getSchoolGrowBonus } from "./town.js";
import { getFishMealGrowBonus } from "./setup.js";
import { deepCloneState, getFarmAverageGrowTime } from "./save.js";
import { getMillhavenGrowBonus, getThornwickGrowBonus } from "./roads.js";

export let _idCounter = 0;
export function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}
// ─── Upgrade material helpers ─────────────────────────────────────────────────
// T2 upgrades cost iron_ore + lumber (from worldResources)
// T3 upgrades cost a forge component (from forgeGoods)

export function canAffordUpgradeMaterials(state, upgradeRequires) {
  if (!upgradeRequires) return true;
  for (const [key, qty] of Object.entries(upgradeRequires)) {
    const inWorld = (state.worldResources ?? {})[key] ?? 0;
    const inForge = (state.forgeGoods ?? {})[key] ?? 0;
    const have = inWorld + inForge;
    if (have < qty) return false;
  }
  return true;
}

export function consumeUpgradeMaterials(state, upgradeRequires) {
  // state must already be a deep clone — mutates in place
  if (!upgradeRequires) return;
  for (const [key, qty] of Object.entries(upgradeRequires)) {
    let remaining = qty;
    // Drain from worldResources first (raw materials), then forgeGoods (components)
    const wrHave = (state.worldResources ?? {})[key] ?? 0;
    if (wrHave > 0) {
      const take = Math.min(wrHave, remaining);
      state.worldResources[key] = wrHave - take;
      remaining -= take;
    }
    if (remaining > 0) {
      const fgHave = (state.forgeGoods ?? {})[key] ?? 0;
      const take = Math.min(fgHave, remaining);
      if (!state.forgeGoods) state.forgeGoods = {};
      state.forgeGoods[key] = fgHave - take;
    }
  }
}


 
// ─── Population helpers ───────────────────────────────────────────────────────
 
export function getTotalWorkersHired(state) {
  const fishingWorkers = Object.values(state.fishing?.bodies ?? {})
    .reduce((sum, b) => sum + (b?.unlocked ? (Array.isArray(b.workers) ? b.workers.filter(w => w?.hired).length : (b.worker?.hired ? 1 : 0)) : 0), 0);
  const bldgs = state.town?.buildings ?? {};
  const townBuildingWorkers =
    (bldgs.clinic?.workers ?? 0) +
    (bldgs.school?.workers ?? 0) +
    (bldgs.warehouse?.workers ?? 0);
  return (
    (state.workers ?? []).length +
    (state.kitchenWorkers ?? []).length +
    (state.marketWorkers ?? []).length +
    (state.barnWorkers ?? []).length +
    (state.adventurers ?? []).length +
    (state.forgeWorkers ?? []).length +
    fishingWorkers +
    townBuildingWorkers
  );
}
 
export function getAvailableWorkerSlots(state) {
  return Math.max(0, Math.floor(state.town?.people ?? 0) - getTotalWorkersHired(state));
}
 
export function isAtWorkerCap(state) {
  return getAvailableWorkerSlots(state) <= 0;
}
 
// ─── Treasury helpers ─────────────────────────────────────────────────────────
 
export function getTreasuryBalance(state) {
  return state.town?.treasuryBalance ?? 0;
}
 
export function getActiveTreasuryTier(state) {
  const tierNum = state.town?.treasuryActiveTier ?? 0;
  if (!tierNum) return null;
  return TREASURY_TIERS.find((t) => t.tier === tierNum) ?? null;
}
 
export function getTownHallLevel(state) {
  const newLevel = state.town?.buildings?.town_hall?.level;
  const legacyLevel = state.town?.townHallLevel ?? 0;
  // If new field exists and is > 0, trust it; otherwise fall back to legacy
  // (avoids a stale 0 in buildings.town_hall shadowing a valid legacy value)
  if (newLevel != null && newLevel > 0) return newLevel;
  return legacyLevel;
}
 
export function getMaxTreasuryTier(state) {
  // Tiers only go up to 3; TH level 4 unlocks Invest Now, not a new tier
  return Math.min(getTownHallLevel(state), 3);
}

export function canInvestNow(state) {
  return getTownHallLevel(state) >= 4;
}

export function getInvestNowCooldownRemaining(state) {
  if (!canInvestNow(state)) return Infinity;
  const last = state.town?.lastInvestTime ?? 0;
  const elapsed = (state.totalPlayTime ?? 0) - last;
  return Math.max(0, INVEST_NOW_CD_SECONDS - elapsed);
}

export function investNow(state) {
  if (!canInvestNow(state)) return state;
  if (getInvestNowCooldownRemaining(state) > 0) return state;
  const cash = state.cash ?? 0;
  if (cash <= 0) return state;
  const next = deepCloneState(state);
  const amount = Math.floor(cash * INVEST_NOW_PCT);
  if (amount <= 0) return state;
  next.cash -= amount;
  next.town.treasuryBalance = (next.town.treasuryBalance ?? 0) + amount;
  next.town.lastInvestTime = next.totalPlayTime ?? 0;
  return next;
}
 
export function setTreasuryTier(state, tier) {
  // tier = 0 means off, 1/2/3 activates that tier if <= townHallLevel
  const next = deepCloneState(state);
  const maxTier = getMaxTreasuryTier(next);
  if (tier > maxTier) return state;
  next.town.treasuryActiveTier = tier;
  return next;
}
 
export function upgradeTownHall(state) {
  const next = deepCloneState(state);
  const currentLevel = getTownHallLevel(next);
  if (currentLevel >= TOWN_HALL_MAX_LEVEL) return state;
  const cost = TOWN_HALL_LEVEL_COSTS[currentLevel];
  if ((next.cash ?? 0) < cost) return state;
  // Level 0 → 1: iron + lumber
  if (currentLevel === 0) {
    if ((next.worldResources?.iron_ore ?? 0) < TOWN_HALL_L1_IRON) return state;
    if ((next.worldResources?.lumber ?? 0) < TOWN_HALL_L1_LUMBER) return state;
    next.worldResources.iron_ore -= TOWN_HALL_L1_IRON;
    next.worldResources.lumber -= TOWN_HALL_L1_LUMBER;
  }
  // Level 1 → 2: more iron + lumber
  if (currentLevel === 1) {
    if ((next.worldResources?.iron_ore ?? 0) < TOWN_HALL_L2_IRON) return state;
    if ((next.worldResources?.lumber ?? 0) < TOWN_HALL_L2_LUMBER) return state;
    next.worldResources.iron_ore -= TOWN_HALL_L2_IRON;
    next.worldResources.lumber -= TOWN_HALL_L2_LUMBER;
  }
  // Level 2 → 3: iron + lumber + iron fittings
  if (currentLevel === 2) {
    if ((next.worldResources?.iron_ore ?? 0) < TOWN_HALL_L3_IRON) return state;
    if ((next.worldResources?.lumber ?? 0) < TOWN_HALL_L3_LUMBER) return state;
    const fittingsHave = (next.worldResources?.iron_fitting ?? 0) + (next.forgeGoods?.iron_fitting ?? 0);
    if (fittingsHave < TOWN_HALL_L3_FITTING) return state;
    next.worldResources.iron_ore -= TOWN_HALL_L3_IRON;
    next.worldResources.lumber -= TOWN_HALL_L3_LUMBER;
    let fittingsNeeded = TOWN_HALL_L3_FITTING;
    const fromWorld = Math.min(fittingsNeeded, next.worldResources?.iron_fitting ?? 0);
    if (fromWorld > 0) { next.worldResources.iron_fitting = (next.worldResources.iron_fitting ?? 0) - fromWorld; fittingsNeeded -= fromWorld; }
    if (fittingsNeeded > 0) { next.forgeGoods = next.forgeGoods ?? {}; next.forgeGoods.iron_fitting = (next.forgeGoods.iron_fitting ?? 0) - fittingsNeeded; }
  }
  // Level 3 → 4: iron fittings + reinforced crates
  if (currentLevel === 3) {
    const fittingsHave = (next.worldResources?.iron_fitting ?? 0) + (next.forgeGoods?.iron_fitting ?? 0);
    const cratesHave = (next.worldResources?.reinforced_crate ?? 0) + (next.forgeGoods?.reinforced_crate ?? 0);
    if (fittingsHave < TOWN_HALL_L4_FITTING) return state;
    if (cratesHave < TOWN_HALL_L4_CRATE) return state;
    let fNeeded = TOWN_HALL_L4_FITTING;
    const fFromWorld = Math.min(fNeeded, next.worldResources?.iron_fitting ?? 0);
    if (fFromWorld > 0) { next.worldResources.iron_fitting = (next.worldResources.iron_fitting ?? 0) - fFromWorld; fNeeded -= fFromWorld; }
    if (fNeeded > 0) { next.forgeGoods = next.forgeGoods ?? {}; next.forgeGoods.iron_fitting = (next.forgeGoods.iron_fitting ?? 0) - fNeeded; }
    let cNeeded = TOWN_HALL_L4_CRATE;
    const cFromWorld = Math.min(cNeeded, next.worldResources?.reinforced_crate ?? 0);
    if (cFromWorld > 0) { next.worldResources.reinforced_crate = (next.worldResources.reinforced_crate ?? 0) - cFromWorld; cNeeded -= cFromWorld; }
    if (cNeeded > 0) { next.forgeGoods = next.forgeGoods ?? {}; next.forgeGoods.reinforced_crate = (next.forgeGoods.reinforced_crate ?? 0) - cNeeded; }
  }
  next.cash -= cost;
  next.town.townHallLevel = currentLevel + 1;
  if (!next.town.buildings) next.town.buildings = {};
  if (!next.town.buildings.town_hall) next.town.buildings.town_hall = {};
  next.town.buildings.town_hall.level = currentLevel + 1;
  return next;
}
 
// ─── Bank helpers ─────────────────────────────────────────────────────────────
 
export function getBankLevel(state) {
  return state.town?.bankLevel ?? 0;
}
 
export function isBankBuilt(state) {
  return (state.town?.bankBuilt === true);
}
 
export function canBuildBank(state) {
  const town = state.town ?? {};
  return (
    getTownHallLevel(state) >= TOWN_HALL_MAX_LEVEL &&
    town.bakeryLevel >= 1 &&
    town.jamBuildingOwned === true &&
    town.sauceBuildingOwned === true &&
    !town.bankBuilt &&
    (town.treasuryBalance ?? 0) >= BANK_BUILD_COST
  );
}
 
export function buildBank(state) {
  if (!canBuildBank(state)) return state;
  const next = deepCloneState(state);
  next.town.treasuryBalance -= BANK_BUILD_COST;
  next.town.bankBuilt = true;
  next.town.bankLevel = 0;
  next.town.bankActiveTier = 0;
  return next;
}
 
export function upgradeBank(state) {
  const next = deepCloneState(state);
  const level = getBankLevel(next);
  if (!next.town.bankBuilt) return state;
  if (level >= BANK_MAX_LEVEL) return state;
  const cost = BANK_LEVEL_COSTS[level];
  if ((next.town.treasuryBalance ?? 0) < cost) return state;
  next.town.treasuryBalance -= cost;
  next.town.bankLevel = level + 1;
  return next;
}
 
export function getActiveBankTier(state) {
  const tierNum = state.town?.bankActiveTier ?? 0;
  if (!tierNum) return null;
  return BANK_TIERS.find((t) => t.tier === tierNum) ?? null;
}
 
export function setActiveBankTier(state, tier) {
  const next = deepCloneState(state);
  const maxTier = getBankLevel(next);
  if (tier > maxTier) return state;
  next.town.bankActiveTier = tier;
  return next;
}
 
// ─── Grow speed bonus (fertile_soil prestige) ──────────────────────────────────────────────
 
export function getTreasuryGrowBonus(state) {
  // +5% grow speed per fertile_soil prestige skill stack.
  const fertileCount = getPrestigeSkillCount(state, "fertile_soil");
  return fertileCount * 5;
}

// ─── Prestige Skill Tree helpers ──────────────────────────────────────────────

export function getPrestigeSkillCount(state, id) {
  return state.prestigeSkills?.[id] ?? 0;
}

export function hasPrestigeSkill(state, id) {
  return getPrestigeSkillCount(state, id) > 0;
}

export function getPrestigePoints(state) {
  return state.prestigePoints ?? 0;
}

export function getSpentPrestigePoints(state) {
  return Object.values(state.prestigeSkills ?? {}).reduce((s, v) => s + v, 0);
}

export function getAvailablePrestigePoints(state) {
  return getPrestigePoints(state) - getSpentPrestigePoints(state);
}

export function canUnlockPrestigeSkill(state, id) {
  const node = PRESTIGE_SKILL_TREE[id];
  if (!node) return false;
  // Must have a point to spend
  if (getAvailablePrestigePoints(state) < 1) return false;
  // Unique nodes can only be bought once
  if (node.unique && hasPrestigeSkill(state, id)) return false;
  // Requires parent node
  if (node.requires && !hasPrestigeSkill(state, node.requires)) return false;
  return true;
}

export function unlockPrestigeSkill(state, id) {
  if (!canUnlockPrestigeSkill(state, id)) return state;
  const next = deepCloneState(state);
  if (!next.prestigeSkills) next.prestigeSkills = {};
  next.prestigeSkills[id] = (next.prestigeSkills[id] ?? 0) + 1;
  return next;
}

// Trade towns sat bonus: +5% per town with T3 route active
export function getTradeTownSatBonus(state) {
  let bonus = 0;
  for (const townId of TRADE_TOWN_ORDER) {
    const def = TRADE_TOWNS[townId];
    const town = state.tradeTowns?.[townId];
    if (!def || !town) continue;
    const t3Route = def.routes[2]; // T3 is always index 2
    if (t3Route && town.routes?.[t3Route.id]?.active) bonus += 5;
  }
  return bonus;
}

export function getSatisfactionCeiling(state) {
  if (hasPrestigeSkill(state, "town_pride")) return 200;
  const tier = state.town?.buildings?.food_hall?.tier ?? 0;
  const base = FOOD_HALL_SAT_CEILING[tier] ?? FOOD_HALL_SAT_CEILING[0];
  return base + getRecHallSatBonus(state) + getTradeTownSatBonus(state);
}
 
// ─── Sell price bonus (Bank) ──────────────────────────────────────────────────
 
export function getBankPriceBonus(state) {
  // Bank removed — sell price bonus now comes from Market Hall level
  const level = state.town?.buildings?.market_hall?.level ?? 0;
  return MARKET_HALL_PRICE_BONUS[level - 1] ?? 0;
}
 
// ─── Automation check (gear-aware, per farm) ──────────────────────────────────
 
/**
 * Returns the effective harvest rate (plots/sec) for a single worker,
 * accounting for gear and specialization including sprinter rest cycles.
 */
export function getWorkerHarvestRate(worker) {
  const gear = GEAR[worker.gear];
  let plotsPerCycle = gear.plotsPerCycle;
  let cycleSeconds = gear.cycleSeconds;
 
  if (worker.specialization === "harvester") {
    cycleSeconds = Math.max(1, Math.floor(cycleSeconds * SPECIALIZATIONS.harvester.cycleMultiplier));
  }
 
  if (worker.specialization === "sprinter") {
    // 2x plots but rests every 3rd cycle → effective multiplier = (2+2+0)/3 = 1.333...
    const restEvery = SPECIALIZATIONS.sprinter.restEvery;
    const activeRatio = (restEvery - 1) / restEvery;
    plotsPerCycle = plotsPerCycle * SPECIALIZATIONS.sprinter.plotsMultiplier * activeRatio;
  }
 
  return plotsPerCycle / cycleSeconds;
}
 
export function isFarmPrestigeReady(farm, workers, state) {
  if (farm.unlockedPlots < PRESTIGE_MIN_PLOTS) return false;

  const farmWorkers = workers.filter((w) => w.farmId === farm.id);
  if (farmWorkers.length === 0) return false;

  const growTime = getFarmAverageGrowTime(
    farm, workers, farm.crop,
    state.feastBonusPercent ?? 0,
    (state.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(state) + (getMillhavenGrowBonus(state) + getThornwickGrowBonus(state)) * 100,
    getTreasuryGrowBonus(state),
    getFishMealGrowBonus(state)
  );

  const demandRate = farm.unlockedPlots / growTime;
  const supplyRate = farmWorkers.reduce((sum, w) => sum + getWorkerHarvestRate(w), 0);

  return supplyRate >= demandRate;
}
 
/** Legacy helper used in FarmSubTabs — kept for non-prestige UI indicators */
export function isFarmAutomated(farm, workers) {
  const workerCount = workers.filter((w) => w.farmId === farm.id).length;
  return workerCount >= AUTOMATION_THRESHOLD && farm.unlockedPlots >= MIN_PLOTS_FOR_AUTOMATION;
}
 
// ─── Farm investment helpers ──────────────────────────────────────────────────
 
export function getFarmInvestment(state, farmId) {
  return (state.farmInvestments ?? {})[farmId] ?? { plotCapIndex: 0, yieldIndex: 0 };
}
 
export function getFarmMaxPlots(state, farmId) {
  const inv = getFarmInvestment(state, farmId);
  const capUpgrade = FARM_INVESTMENT_PLOT_CAP[inv.plotCapIndex - 1];
  return capUpgrade ? capUpgrade.maxPlots : MAX_PLOTS;
}
 
export function getFarmBonusYield(state, farmId) {
  const inv = getFarmInvestment(state, farmId);
  const yieldUpgrade = FARM_INVESTMENT_YIELD[inv.yieldIndex - 1];
  return yieldUpgrade ? yieldUpgrade.bonusYield : 0;
}
 
export function getNextPlotCapUpgrade(state, farmId) {
  const inv = getFarmInvestment(state, farmId);
  return FARM_INVESTMENT_PLOT_CAP[inv.plotCapIndex] ?? null;
}
 
export function getNextYieldUpgrade(state, farmId) {
  const inv = getFarmInvestment(state, farmId);
  return FARM_INVESTMENT_YIELD[inv.yieldIndex] ?? null;
}
