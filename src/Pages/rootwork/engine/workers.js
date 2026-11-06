// src/Pages/rootwork/engine/workers.js — market + kitchen worker helpers
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
import { canAffordUpgradeMaterials, getPrestigeSkillCount, hasPrestigeSkill } from "./core.js";
import { getSchoolResearchMultiplier, hasSchoolResearch } from "./town.js";
import { deepCloneState } from "./save.js";
import { getHeroBreadSpeedMultiplier, getHeroMarketBonus } from "./heroes.js";
import { getAshportCraftingTimeBonus, getMillhavenMaterialBonus } from "./roads.js";

// ─── Market worker helpers ────────────────────────────────────────────────────
 
export function getSellRate(itemType, prestigeBonuses = [], bankPriceBonus = 0, state = null) {
  const base = MARKET_SELL_RATES[itemType] ?? 0;
  // Legacy array support (old saves / callers that don't pass state)
  const legacySavvyCount = (prestigeBonuses ?? []).filter((b) => b === "market_savvy").length;
  // Prestige skill tree
  const sharpEyeCount = state ? getPrestigeSkillCount(state, "sharp_eye") : 0;
  const hasSavvy = state ? hasPrestigeSkill(state, "market_savvy") : legacySavvyCount > 0;
  const savvyMult = hasSavvy ? 1.25 : 1;
  const sharpEyeMult = 1 + sharpEyeCount * 0.10;
  // Hero skill tree: Scavenger Fence Network +10%
  const heroMarketMult = state ? getHeroMarketBonus(state) : 1.0;
  let rate = Math.round(base * savvyMult * sharpEyeMult * heroMarketMult * 100) / 100;
  if (bankPriceBonus > 0) rate = Math.round(rate * (1 + bankPriceBonus / 100) * 100) / 100;
  return rate;
}
 
export function getMarketWorkerHireCost(state) {
  const count = (state.marketWorkers ?? []).length;
  const raw = MARKET_WORKER_HIRE_COST * Math.pow(MARKET_WORKER_HIRE_MULTIPLIER, count);
  return Math.round(raw / 5) * 5;
}
 
export function getMarketWorkerNextGear(currentGear) {
  const idx = MARKET_WORKER_GEAR_ORDER.indexOf(currentGear);
  if (idx === -1 || idx === MARKET_WORKER_GEAR_ORDER.length - 1) return null;
  return MARKET_WORKER_GEAR_ORDER[idx + 1];
}
 
export function getMarketWorkerItemsPerSecond(worker) {
  return MARKET_WORKER_GEAR[worker.gear]?.itemsPerSecond ?? 1;
}
 
export function getMarketWorkerQueueTotal(worker) {
  return (worker.queue ?? []).reduce((s, o) => s + o.quantity, 0);
}
 
export function getTotalMarketQueueLength(state) {
  return (state.marketWorkers ?? []).reduce((s, w) => s + getMarketWorkerQueueTotal(w), 0);
}
 
export function cancelMarketWorkerQueue(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  for (const order of worker.queue ?? []) {
    const t = order.itemType;
    const isWorld  = t in WORLD_RESOURCES;
    const isForge  = !isWorld && Object.values(FORGE_RECIPES).some((r) => r.output.resourceKey === t);
    const isFish   = !isWorld && !isForge && !!(next.fishing?.fish) && t in next.fishing.fish;
    const isAnimal = !isWorld && !isForge && !isFish && t in (next.animalGoods ?? {});
    const isArtisan = !isWorld && !isForge && !isFish && !isAnimal && t in (next.artisan ?? {});
    if      (isWorld)   next.worldResources[t] = (next.worldResources[t] ?? 0) + order.quantity;
    else if (isForge)   next.forgeGoods[t] = (next.forgeGoods[t] ?? 0) + order.quantity;
    else if (isFish)    next.fishing.fish[t] = (next.fishing.fish[t] ?? 0) + order.quantity;
    else if (isAnimal)  next.animalGoods[t] = (next.animalGoods[t] ?? 0) + order.quantity;
    else if (isArtisan) next.artisan[t] = (next.artisan[t] ?? 0) + order.quantity;
    else                next.crops[t] = (next.crops[t] ?? 0) + order.quantity;
  }
  worker.queue = [];
  return next;
}
 
export function buyMarketWorkerStandingOrder(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker || worker.hasStandingOrder) return state;
  if ((next.cash ?? 0) < MARKET_WORKER_STANDING_ORDER_COST) return state;
  next.cash -= MARKET_WORKER_STANDING_ORDER_COST;
  worker.hasStandingOrder = true;
  return next;
}
 
export function setMarketWorkerStandingOrder(state, workerId, itemType) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker || !worker.hasStandingOrder) return state;
  worker.standingOrder = itemType;
  return next;
}
 
// ─── Kitchen worker helpers ───────────────────────────────────────────────────
 
export function getKitchenWorkerHireCost(state) {
  const count = (state.kitchenWorkers ?? []).length;
  const raw = KITCHEN_WORKER_HIRE_COST * Math.pow(KITCHEN_WORKER_HIRE_MULTIPLIER, count);
  return Math.round(raw / 5) * 5;
}
 
export function getKitchenWorkerSpeedMultiplier(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("speed_2")) return KITCHEN_WORKER_UPGRADES.speed_2.speedMultiplier;
  if (upgrades.includes("speed_1")) return KITCHEN_WORKER_UPGRADES.speed_1.speedMultiplier;
  return 1;
}
 
export function getEffectiveKitchenSeconds(worker, baseSeconds, state = null, recipeId = null) {
  const workerMult = getKitchenWorkerSpeedMultiplier(worker);
  const schoolMult = state ? getSchoolResearchMultiplier(state) : 1;
  // swift_craft: -25% per stack
  const swiftCount = state ? getPrestigeSkillCount(state, "swift_craft") : 0;
  const swiftMult = Math.pow(0.75, swiftCount);
  // Fighter Hearth Guardian: bread bakes 30% faster
  const breadMult = (state && recipeId === "bread") ? getHeroBreadSpeedMultiplier(state) : 1.0;
  // Ashport: crafting time reduction (highest active tier replaces lower)
  const ashportReduction = state ? getAshportCraftingTimeBonus(state) : 0;
  const ashportMult = 1 - ashportReduction;
  return Math.max(5, Math.floor(baseSeconds * workerMult * schoolMult * swiftMult * breadMult * ashportMult));
}
 
export function isKitchenWorkerIdle(worker) {
  return !worker.busy && !worker.recipeId;
}
 
export function getIdleKitchenWorkerCount(state) {
  return (state.kitchenWorkers ?? []).filter(isKitchenWorkerIdle).length;
}
 
export function canUpgradeKitchenWorker(state, workerId, upgradeId) {
  const worker = (state.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return false;
  const upgrade = KITCHEN_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return false;
  if ((worker.upgrades ?? []).includes(upgradeId)) return false;
  if (upgrade.requires && !(worker.upgrades ?? []).includes(upgrade.requires)) return false;
  if ((state.cash ?? 0) < upgrade.cost) return false;
  if (!canAffordUpgradeMaterials(state, upgrade.upgradeRequires)) return false;
  // School gate: batch_5 and batch_10 require the school to be built
  if (upgradeId === "batch_5" && !hasSchoolResearch(state, "kitchen_batch_5")) return false;
  if (upgradeId === "batch_10" && !hasSchoolResearch(state, "kitchen_batch_10")) return false;
  return true;
}
 
export function getKitchenWorkerMaxBatchSize(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("batch_10")) return 10;
  if (upgrades.includes("batch_5")) return 5;
  if (upgrades.includes("batch_2")) return 2;
  return 1;
}

export function getKitchenWorkerBatchSize(worker) {
  const max = getKitchenWorkerMaxBatchSize(worker);
  const override = worker.activeBatchOverride;
  if (override != null && override >= 1 && override <= max) return override;
  return max;
}

export function setKitchenWorkerBatchOverride(state, workerId, batchSize) {
  const next = deepCloneState(state);
  const worker = (next.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  const max = getKitchenWorkerMaxBatchSize(worker);
  const clamped = Math.max(1, Math.min(max, batchSize));
  worker.activeBatchOverride = clamped;
  return next;
}
 
export function _startKitchenWorkerRecipe(worker, recipeId, crops, animalGoods, fish, bait, state = null) {
  const recipe = PROCESSING_RECIPES[recipeId] ?? BAIT_RECIPES[recipeId];
  if (!recipe?.inputCrop) return false;
  const batch = getKitchenWorkerBatchSize(worker);
  const efficient = state ? hasPrestigeSkill(state, "efficient_process") : false;
  const millhavenReduction = state ? getMillhavenMaterialBonus(state) : 0;
  const inputMult = (efficient ? 0.75 : 1) * (1 - millhavenReduction);
  const totalInput = Math.max(1, Math.floor(recipe.inputAmount * batch * inputMult));
  const inCrops = recipe.inputCrop in (crops ?? {});
const inAnimal = !inCrops && recipe.inputCrop in (animalGoods ?? {});
const inFish = !inCrops && !inAnimal && recipe.inputCrop in (fish ?? {});
const have = inCrops ? (crops[recipe.inputCrop] ?? 0)
  : inAnimal ? (animalGoods[recipe.inputCrop] ?? 0)
  : inFish ? (fish[recipe.inputCrop] ?? 0) : 0;
if (have < totalInput) return false;
  if (inCrops) crops[recipe.inputCrop] -= totalInput;
  else if (inAnimal) animalGoods[recipe.inputCrop] -= totalInput;
  else if (inFish) fish[recipe.inputCrop] -= totalInput;
  worker.recipeId = recipeId;
  worker.elapsedSeconds = 0;
  worker.totalSeconds = getEffectiveKitchenSeconds(worker, recipe.seconds, state, recipeId);
  worker.batchSize = batch;
  worker.busy = true;
  return true;
}
 
export function cancelKitchenWorkerRecipe(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  if (worker.busy && worker.recipeId) {
    const recipe = PROCESSING_RECIPES[worker.recipeId];
    const batch = worker.batchSize ?? 1;
    if (recipe?.inputCrop) {
      const cleanSwitch = hasPrestigeSkill(next, "clean_switch");
      const efficient = hasPrestigeSkill(next, "efficient_process");
      const millhavenReduction = getMillhavenMaterialBonus(next);
      const inputMult = (efficient ? 0.75 : 1) * (1 - millhavenReduction);
      const totalConsumed = Math.max(1, Math.floor(recipe.inputAmount * batch * inputMult));
      const refund = cleanSwitch ? totalConsumed : Math.floor(totalConsumed * 0.5);
      if (recipe.inputCrop in (next.crops ?? {})) next.crops[recipe.inputCrop] += refund;
      else if (recipe.inputCrop in (next.animalGoods ?? {})) next.animalGoods[recipe.inputCrop] += refund;
      else if (next.fishing?.fish && recipe.inputCrop in next.fishing.fish) next.fishing.fish[recipe.inputCrop] += refund;
    }
  }
  worker.busy = false;
  worker.recipeId = null;
  worker.elapsedSeconds = 0;
  worker.totalSeconds = 0;
  worker.batchSize = 1;
  return next;
}
