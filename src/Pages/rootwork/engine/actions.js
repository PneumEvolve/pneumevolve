// src/Pages/rootwork/engine/actions.js — farm/market/kitchen/barn/fishing actions
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
import { canAffordUpgradeMaterials, consumeUpgradeMaterials, genId, getFarmMaxPlots, getNextPlotCapUpgrade, getNextYieldUpgrade, getPrestigeSkillCount, getTreasuryGrowBonus, hasPrestigeSkill, isAtWorkerCap } from "./core.js";
import { getMaxKitchenWorkers, getMaxMarketWorkers, getSchoolGrowBonus, getWarehouseCropCap, hasSchoolResearch } from "./town.js";
import { _startKitchenWorkerRecipe, canUpgradeKitchenWorker, getKitchenWorkerHireCost, getMarketWorkerHireCost, getMarketWorkerNextGear } from "./workers.js";
import { getAnimalStorageUpgradeCost, getAnimalYieldUpgradeCost, getBarnInstanceWorkerSlots, getBarnWorkerHireCost, getEffectiveCycleSeconds, getEffectiveGrowTime, getFishMealGrowBonus, getNextGear, getPlotUnlockCost, getWorkerHireCost, makeFarm, makeFarmWorker, makeKitchenWorker, makeMarketWorker, makePlot, needsSpecialization } from "./setup.js";
import { tick } from "./tick.js";
import { deepCloneState } from "./save.js";
import { getMillhavenGrowBonus, getThornwickGrowBonus } from "./roads.js";
import { getGlobalBonus } from "./bonuses.js";

// ─── Farm actions ─────────────────────────────────────────────────────────────
 
export function plantPlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot || plot.state !== "empty") return state;
  plot.state = "planted";
  plot.growthTick = 0;
  return next;
}
 
export function harvestPlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot || plot.state !== "ready") return state;
  const crop = CROPS[farm.crop];
  const { crops, newPool } = applyYieldBonuses(crop.manualYield, next.prestigeBonuses, next.yieldPool ?? 0, 0, next);
  next.crops[farm.crop] = Math.min((next.crops[farm.crop] ?? 0) + crops, getWarehouseCropCap(next));
  next.yieldPool = newPool;
  plot.state = "empty";
  plot.growthTick = 0;
  if (!next.questProgress) next.questProgress = {};
  next.questProgress.manualHarvestCount = (next.questProgress.manualHarvestCount ?? 0) + 1;
  if (farm.crop === "berries") {
    next.questProgress.berriesHarvested = (next.questProgress.berriesHarvested ?? 0) + crops;
  }
  if (farm.crop === "tomatoes") {
    next.questProgress.tomatoesHarvested = (next.questProgress.tomatoesHarvested ?? 0) + crops;
  }
  return next;
}
 
export function tendPlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot) return state;
 
  if (plot.state === "ready") {
    const crop = CROPS[farm.crop];
    const { crops, newPool } = applyYieldBonuses(crop.manualYield, next.prestigeBonuses, next.yieldPool ?? 0, 0, next);
    next.crops[farm.crop] = Math.min((next.crops[farm.crop] ?? 0) + crops, getWarehouseCropCap(next));
    next.yieldPool = newPool;
    if (!next.questProgress) next.questProgress = {};
    next.questProgress.manualHarvestCount = (next.questProgress.manualHarvestCount ?? 0) + 1;
    if (farm.crop === "berries") {
      next.questProgress.berriesHarvested = (next.questProgress.berriesHarvested ?? 0) + crops;
    }
    if (farm.crop === "tomatoes") {
      next.questProgress.tomatoesHarvested = (next.questProgress.tomatoesHarvested ?? 0) + crops;
    }
    plot.state = "planted";
    plot.growthTick = 0;
    return next;
  }
 
  if (plot.state === "empty") {
    plot.state = "planted";
    plot.growthTick = 0;
    return next;
  }
 
  // planted — advance growth
  const growTime = getEffectiveGrowTime(
    farm, next.workers, farm.crop, plot,
    next.feastBonusPercent ?? 0,
    (next.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(next) + (getMillhavenGrowBonus(next) + getThornwickGrowBonus(next)) * 100,
    getTreasuryGrowBonus(next),
    getFishMealGrowBonus(next)
  );
  plot.growthTick = Math.min(plot.growthTick + TEND_SECONDS, growTime);
  if (plot.growthTick >= growTime) plot.state = "ready";
  return next;
}
 
export function getPlotUpgradeCost(farm, state = null) {
  const upgradedCount = farm.plots.filter((p) => p.upgraded).length;
  // Costs for plots 1–36. Early plots are cheap; costs accelerate through mid-game
  // and become genuinely painful by 6×6 expansion territory.
  const costs = [
    2,  4,  6,  10, 14, 20, 28, 38, 50,   // plots 1–9  (3×3 base)
    65, 82, 102, 125, 150, 178, 210,       // plots 10–16 (4×4 expansion)
    245, 285, 330, 380, 435, 495, 562, 635, 715, // plots 17–25 (5×5)
    800, 895, 1000, 1115, 1240, 1380, 1530, 1695, 1875, 2075, 2300, // plots 26–36 (6×6)
  ];
  const base = costs[upgradedCount] ?? Math.ceil(2300 + (upgradedCount - 36) * 300);
  if (state && hasPrestigeSkill(state, "bargain_soil")) return Math.max(1, Math.floor(base * 0.5));
  return base;
}
 
export function upgradePlot(state, farmId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => !p.upgraded);
  if (!plot) return state;
  const artisanGood = CROP_ARTISAN[farm.crop];
  if (!artisanGood) return state;
  const cost = getPlotUpgradeCost(farm, state);
  if ((next.artisan[artisanGood] ?? 0) < cost) return state;
  next.artisan[artisanGood] -= cost;
  plot.upgraded = true;
  return next;
}
 
export function buyPlot(state, farmId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const current = farm.unlockedPlots;
  const maxPlots = getFarmMaxPlots(next, farmId);
  if (current >= maxPlots) return state;
  const cost = getPlotUnlockCost(next, farmId, current);
  if (cost === null) return state;
  if ((next.crops[farm.crop] ?? 0) < cost) return state;
  next.crops[farm.crop] -= cost;
  farm.unlockedPlots += 1;
  farm.plots.push(makePlot());
  return next;
}
 
export function hireWorker(state, farmId) {
  const next = deepCloneState(state);
  if (isAtWorkerCap(next)) return state;
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const workersOnFarm = next.workers.filter((w) => w.farmId === farmId).length;
  const cost = getWorkerHireCost(next, farmId);
  if ((next.crops[farm.crop] ?? 0) < cost) return state;
  next.crops[farm.crop] -= cost;
    const newWorker = makeFarmWorker(farmId);
  newWorker.cycleProgress = getEffectiveCycleSeconds(newWorker) - 1;
  next.workers.push(newWorker);
  return next;
}
 
export function sellWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  const farm = next.farms.find((f) => f.id === worker.farmId);
  if (!farm) return state;
  const workersOnFarm = next.workers.filter((w) => w.farmId === worker.farmId).length;
  const hireCostWhenBought = Math.round((WORKER_HIRE_BASE_COST * Math.pow(WORKER_HIRE_MULTIPLIER, Math.max(0, workersOnFarm - 1))) / 5) * 5;
  next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + Math.floor(hireCostWhenBought * 0.5);
  next.workers = next.workers.filter((w) => w.id !== workerId);
  return next;
}
 
export function upgradeWorkerGear(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker || needsSpecialization(worker)) return state;
  const nextGearId = getNextGear(worker.gear);
  if (!nextGearId) return state;
  const gearDef = GEAR[nextGearId];
  const cost = gearDef.upgradeCost;
  if (!cost || (next.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, gearDef.upgradeRequires)) return state;
  next.cash -= cost;
  consumeUpgradeMaterials(next, gearDef.upgradeRequires);
  worker.gear = nextGearId;
  return next;
}
 
export function specializeWorker(state, workerId, specializationId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker || worker.gear !== "hoe" || worker.specialization !== "none") return state;
  if (!SPECIALIZATIONS[specializationId] || specializationId === "none") return state;
  if ((next.cash ?? 0) < SPECIALIZE_COST) return state;
  if (!canAffordUpgradeMaterials(state, SPECIALIZE_REQUIRES)) return state;
  next.cash -= SPECIALIZE_COST;
  consumeUpgradeMaterials(next, SPECIALIZE_REQUIRES);
  worker.specialization = specializationId;
  worker.cycleCount = 0;
  return next;
}
 
export function buyPlotCapUpgrade(state, farmId) {
  const next = deepCloneState(state);
  const upgrade = getNextPlotCapUpgrade(next, farmId);
  if (!upgrade || (next.cash ?? 0) < upgrade.cost) return state;
  if (!canAffordUpgradeMaterials(state, upgrade.upgradeRequires)) return state;
  next.cash -= upgrade.cost;
  consumeUpgradeMaterials(next, upgrade.upgradeRequires);
  if (!next.farmInvestments) next.farmInvestments = {};
  if (!next.farmInvestments[farmId]) next.farmInvestments[farmId] = { plotCapIndex: 0, yieldIndex: 0 };
  next.farmInvestments[farmId].plotCapIndex += 1;
  return next;
}
 
export function buyYieldUpgrade(state, farmId) {
  const next = deepCloneState(state);
  const upgrade = getNextYieldUpgrade(next, farmId);
  if (!upgrade || (next.cash ?? 0) < upgrade.cost) return state;
  // School gate: yield_3 and yield_4 (index 2 and 3) require the school
  const currentIndex = (next.farmInvestments?.[farmId]?.yieldIndex ?? 0);
  if (currentIndex === 2 && !hasSchoolResearch(state, "fertilizer_iii")) return state;
  if (currentIndex === 3 && !hasSchoolResearch(state, "fertilizer_iv")) return state;
  if (!canAffordUpgradeMaterials(state, upgrade.upgradeRequires)) return state;
  next.cash -= upgrade.cost;
  consumeUpgradeMaterials(next, upgrade.upgradeRequires);
  if (!next.farmInvestments) next.farmInvestments = {};
  if (!next.farmInvestments[farmId]) next.farmInvestments[farmId] = { plotCapIndex: 0, yieldIndex: 0 };
  next.farmInvestments[farmId].yieldIndex += 1;
  return next;
}
 
export function applyYieldBonuses(baseYield, prestigeBonuses, currentPool = 0, farmBonusYield = 0, state = null) {
  // New skill tree: bumper_crop is 15% per stack
  const bumperCount = state ? getPrestigeSkillCount(state, "bumper_crop") : prestigeBonuses.filter((b) => b === "bumper_crop").length;
  // Granary stages (and later season modifiers) — additive with Bumper Crop
  const globalYield = state ? getGlobalBonus(state, "cropYield") : 0;
  const total = baseYield + farmBonusYield;
  const mult = Math.max(0, 1 + bumperCount * 0.15 + globalYield);
  if (mult === 1) return { crops: total, newPool: currentPool };
  const exact = total * mult;
  const whole = Math.floor(exact);
  const newPool = currentPool + (exact - whole);
  const bonus = Math.floor(newPool);
  return { crops: whole + bonus, newPool: newPool - bonus };
}
 
// ─── Market worker actions ────────────────────────────────────────────────────
 
export function hireMarketWorker(state) {
  const next = deepCloneState(state);
  if (isAtWorkerCap(next)) return state;
  if ((next.marketWorkers ?? []).length >= getMaxMarketWorkers(next)) return state;
  const isFirst = (next.marketWorkers ?? []).length === 0;
  const cost = isFirst ? 0 : getMarketWorkerHireCost(next);
  if (!isFirst && (next.cash ?? 0) < cost) return state;
  if (!isFirst) next.cash -= cost;
  next.marketWorkers = [...(next.marketWorkers ?? []), makeMarketWorker()];
  return next;
}
 
export function upgradeMarketWorkerGear(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  const nextGear = getMarketWorkerNextGear(worker.gear);
  if (!nextGear) return state;
  const gearDef = MARKET_WORKER_GEAR[nextGear];
  const cost = gearDef.upgradeCost;
  if ((next.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, gearDef.upgradeRequires)) return state;
  next.cash -= cost;
  consumeUpgradeMaterials(next, gearDef.upgradeRequires);
  worker.gear = nextGear;
  return next;
}
 
export function assignItemToMarketWorker(state, workerId, itemType, quantity) {
  if (quantity <= 0) return state;
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  const isWorld  = itemType in WORLD_RESOURCES;
const isForge  = !isWorld && Object.values(FORGE_RECIPES).some((r) => r.output.resourceKey === itemType);
const isFish   = !isWorld && !isForge && itemType in (FISHING_FISH ?? {});
const isAnimal = !isWorld && !isForge && !isFish && itemType in (next.animalGoods ?? {});
const isArtisan = !isWorld && !isForge && !isFish && !isAnimal && itemType in (next.artisan ?? {});
const isCrop   = !isWorld && !isForge && !isFish && !isAnimal && !isArtisan;
  if (isCrop) {
    if ((next.crops[itemType] ?? 0) < quantity) return state;
    next.crops[itemType] -= quantity;
  } else if (isArtisan) {
    if ((next.artisan[itemType] ?? 0) < quantity) return state;
    next.artisan[itemType] -= quantity;
  } else if (isAnimal) {
    if ((next.animalGoods[itemType] ?? 0) < quantity) return state;
    next.animalGoods[itemType] -= quantity;
  } else if (isFish) {
  if ((next.fishing.fish[itemType] ?? 0) < quantity) return state;
  next.fishing.fish[itemType] -= quantity;
} else if (isForge) {
  const INSTANCED_FORGE_KEYS = new Set(["master_sword", "tower_shield", "plate_armor"]);
  if (INSTANCED_FORGE_KEYS.has(itemType)) {
    const available = (next.forgeGoodsInstanced ?? []).filter(
      (i) => i.key === itemType && !i._equippedBy && i.upgradeTier === 3
    );
    if (available.length < quantity) return state;
    let removed = 0;
    next.forgeGoodsInstanced = (next.forgeGoodsInstanced ?? []).filter((i) => {
      if (i.key === itemType && !i._equippedBy && i.upgradeTier === 3 && removed < quantity) {
        removed++;
        return false;
      }
      return true;
    });
  } else {
    if ((next.forgeGoods[itemType] ?? 0) < quantity) return state;
    next.forgeGoods[itemType] -= quantity;
  }
} else if (isWorld) {
  if ((next.worldResources[itemType] ?? 0) < quantity) return state;
  next.worldResources[itemType] -= quantity;
} else return state;
  const queue = worker.queue ?? [];
  const last = queue[queue.length - 1];
  if (last && last.itemType === itemType) last.quantity += quantity;
  else { queue.push({ id: genId("sale"), itemType, quantity }); worker.queue = queue; }
  return next;
}
 
export function fireMarketWorker(state, workerId) {
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
  next.marketWorkers = next.marketWorkers.filter((w) => w.id !== workerId);
  return next;
}
 
// ─── Kitchen worker actions ───────────────────────────────────────────────────
 
export function hireKitchenWorker(state) {
  const next = deepCloneState(state);
  if (isAtWorkerCap(next)) return state;
  if ((next.kitchenWorkers ?? []).length >= getMaxKitchenWorkers(next)) return state;
  const cost = getKitchenWorkerHireCost(next);
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  next.kitchenWorkers = [...(next.kitchenWorkers ?? []), makeKitchenWorker()];
  return next;
}
 
export function assignKitchenWorkerRecipe(state, workerId, recipeId) {
  const next = deepCloneState(state);
  const worker = (next.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  if (worker.busy && worker.recipeId) {
    const recipe = PROCESSING_RECIPES[worker.recipeId] ?? BAIT_RECIPES[worker.recipeId];
    const batch = worker.batchSize ?? 1;
    if (recipe?.inputCrop) {
      const refund = Math.floor(recipe.inputAmount * batch * 0.5);
      if (recipe.inputCrop in (next.crops ?? {})) {
        next.crops[recipe.inputCrop] = (next.crops[recipe.inputCrop] ?? 0) + refund;
      } else if (recipe.inputCrop in (next.animalGoods ?? {})) {
        next.animalGoods[recipe.inputCrop] = (next.animalGoods[recipe.inputCrop] ?? 0) + refund;
      } else if (next.fishing?.fish && recipe.inputCrop in next.fishing.fish) {
        next.fishing.fish[recipe.inputCrop] = (next.fishing.fish[recipe.inputCrop] ?? 0) + refund;
      }
    }
    worker.busy = false;
    worker.elapsedSeconds = 0;
    worker.batchSize = 1;
  }
  if (!_startKitchenWorkerRecipe(worker, recipeId, next.crops, next.animalGoods, next.fishing?.fish, next.bait, next)) return state;
  return next;
}
 
export function upgradeKitchenWorker(state, workerId, upgradeId) {
  if (!canUpgradeKitchenWorker(state, workerId, upgradeId)) return state;
  const next = deepCloneState(state);
  const worker = next.kitchenWorkers.find((w) => w.id === workerId);
  const upgrade = KITCHEN_WORKER_UPGRADES[upgradeId];
  next.cash -= upgrade.cost;
  consumeUpgradeMaterials(next, upgrade.upgradeRequires);
  worker.upgrades = [...(worker.upgrades ?? []), upgradeId];
  return next;
}
 
export function fireKitchenWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  if (worker.busy && worker.recipeId) {
    const recipe = PROCESSING_RECIPES[worker.recipeId] ?? BAIT_RECIPES[worker.recipeId];
    if (recipe?.inputCrop) {
      const refund = Math.floor(recipe.inputAmount * (worker.batchSize ?? 1) * 0.5);
      if (recipe.inputCrop in (next.crops ?? {})) {
        next.crops[recipe.inputCrop] = (next.crops[recipe.inputCrop] ?? 0) + refund;
      } else if (recipe.inputCrop in (next.animalGoods ?? {})) {
        next.animalGoods[recipe.inputCrop] = (next.animalGoods[recipe.inputCrop] ?? 0) + refund;
      } else if (next.fishing?.fish && recipe.inputCrop in next.fishing.fish) {
        next.fishing.fish[recipe.inputCrop] = (next.fishing.fish[recipe.inputCrop] ?? 0) + refund;
      }
    }
  }
  next.kitchenWorkers = next.kitchenWorkers.filter((w) => w.id !== workerId);
  return next;
}

export function applyFishMeal(state) {
  const have = Math.floor(state.animalGoods?.fish_meal ?? 0);
  if (have < 1) return state;
  const next = deepCloneState(state);
  next.animalGoods.fish_meal = have - 1;
  if (!next.fishMealStacks) next.fishMealStacks = [];
  const MAX_SECONDS = 4 * 60 * 60; // 4 hours
  const PER_DOSE = 600; // 10 minutes
  // Find existing active stack or create one
  const existing = next.fishMealStacks.find((s) => s.bonus === 10);
  if (existing) {
    existing.secondsLeft = Math.min(existing.secondsLeft + PER_DOSE, MAX_SECONDS);
  } else {
    next.fishMealStacks.push({ bonus: 10, secondsLeft: PER_DOSE });
  }
  return next;
}
 
// ─── Buildings ────────────────────────────────────────────────────────────────────
 
export function setTreasuryCap(state, cap) {
  const next = deepCloneState(state);
  next.town.treasuryCap = Math.max(0, Math.floor(cap));
  return next;
} 

// ─── Barn worker actions ──────────────────────────────────────────────
 
export function hireBarnWorker(state, animalType, instanceId) {
  if (!ANIMAL_TYPES[animalType]) return state;
  if (isAtWorkerCap(state)) return state;
  const inst = (state.barnInstances ?? []).find(i => i.id === instanceId);
  if (!inst) return state;
  const instWorkerSlots = getBarnInstanceWorkerSlots(state, instanceId);
  const instWorkerCount = (inst.barnWorkers ?? []).length;
  if (instWorkerCount >= instWorkerSlots) return state;
    const cost = getBarnWorkerHireCost(state, instanceId);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  const worker = {
    id: genId("bw"),
    animalType,
    instanceId,
    upgrades: hasPrestigeSkill(next, "fast_hands") ? ["capacity_1"] : [],
    collectTimer: 0,
    careTimer: 0,
    hiredAt: Date.now(),
  };
  next.barnWorkers = [...(next.barnWorkers ?? []), worker];
  const targetInst = next.barnInstances.find(i => i.id === instanceId);
  if (!targetInst.barnWorkers) targetInst.barnWorkers = [];
  targetInst.barnWorkers.push(worker);
  return next;
}
 
export function fireBarnWorker(state, workerId) {
  const next = deepCloneState(state);
  next.barnWorkers = (next.barnWorkers ?? []).filter((w) => w.id !== workerId);
  for (const inst of next.barnInstances ?? []) {
    inst.barnWorkers = (inst.barnWorkers ?? []).filter((w) => w.id !== workerId);
  }
  return next;
}
 
export function reassignBarnWorker(state, workerId, animalType) {
  if (!ANIMAL_TYPES[animalType]) return state;
  const next = deepCloneState(state);
  const worker = (next.barnWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  worker.animalType = animalType;
  worker.interactCooldown = 0;
  return next;
}

export function upgradeBarnWorker(state, workerId, upgradeId) {
  // Find the worker in whichever array holds it — flat root array or barnInstance
  // (old saves may only have workers in barnInstances, not in the flat array)
  const flatWorker = (state.barnWorkers ?? []).find((w) => w.id === workerId);
  let instWorkerRef = null;
  for (const inst of state.barnInstances ?? []) {
    const w = (inst.barnWorkers ?? []).find((w) => w.id === workerId);
    if (w) { instWorkerRef = w; break; }
  }
  const canonical = flatWorker ?? instWorkerRef;
  if (!canonical) return state;

  const upgrade = BARN_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return state;

  if ((canonical.upgrades ?? []).includes(upgradeId)) return state;
  if (upgrade.requires && !(canonical.upgrades ?? []).includes(upgrade.requires)) return state;
  if ((state.cash ?? 0) < upgrade.cost) return state;
  if (!canAffordUpgradeMaterials(state, upgrade.upgradeRequires)) return state;

  // Research gates for tier-2 barn upgrades
  if (upgradeId === "capacity_2" && !hasSchoolResearch(state, "barn_capacity_2")) return state;
  if (upgradeId === "care_2" && !hasSchoolResearch(state, "barn_care_2")) return state;

  const next = deepCloneState(state);
  next.cash -= upgrade.cost;
  consumeUpgradeMaterials(next, upgrade.upgradeRequires);
  const newUpgrades = [...(canonical.upgrades ?? []), upgradeId];

  // Update in flat root array (if present)
  const nextFlatWorker = (next.barnWorkers ?? []).find((w) => w.id === workerId);
  if (nextFlatWorker) nextFlatWorker.upgrades = newUpgrades;

  // Update in barnInstances (always — this is what the tick and UI read from)
  for (const inst of next.barnInstances ?? []) {
    const instWorker = (inst.barnWorkers ?? []).find((w) => w.id === workerId);
    if (instWorker) { instWorker.upgrades = newUpgrades; break; }
  }

  return next;
}

export function upgradeAnimalStorage(state, animalId, animalInstanceId, barnInstanceId) {
  const next = deepCloneState(state);
  let animal = null;
  for (const inst of next.barnInstances ?? []) {
    if (barnInstanceId && inst.id !== barnInstanceId) continue;
    const found = (inst.animals ?? []).find(a => a.id === animalInstanceId);
    if (found) { animal = found; break; }
  }
  // Legacy fallback
  if (!animal) {
    const animals = next.animals?.[animalId] ?? [];
    animal = animals.find((a) => a.id === animalInstanceId);
  }
  if (!animal) return state;
  const nextUpgrade = getAnimalStorageUpgradeCost(animal);
  if (!nextUpgrade) return state;
  if ((next.cash ?? 0) < nextUpgrade.cost) return state;
  next.cash -= nextUpgrade.cost;
  animal.storageLevel = (animal.storageLevel ?? 0) + 1;
  return next;
}

export function upgradeAnimalYield(state, animalId, animalInstanceId, barnInstanceId) {
  const next = deepCloneState(state);
  let animal = null;
  for (const inst of next.barnInstances ?? []) {
    if (barnInstanceId && inst.id !== barnInstanceId) continue;
    const found = (inst.animals ?? []).find(a => a.id === animalInstanceId);
    if (found) { animal = found; break; }
  }
  if (!animal) {
    const animals = next.animals?.[animalId] ?? [];
    animal = animals.find((a) => a.id === animalInstanceId);
  }
  if (!animal) return state;
  const nextUpgrade = getAnimalYieldUpgradeCost(animal);
  if (!nextUpgrade) return state;
  if ((next.cash ?? 0) < nextUpgrade.cost) return state;
  // School gate: yield level 2+ requires the school
  if (nextUpgrade.level >= 2 && !hasSchoolResearch(state, "animal_yield_2")) return state;
  if (!canAffordUpgradeMaterials(state, nextUpgrade.upgradeRequires)) return state;
  next.cash -= nextUpgrade.cost;
  consumeUpgradeMaterials(next, nextUpgrade.upgradeRequires);
  animal.yieldLevel = (animal.yieldLevel ?? 0) + 1;
  return next;
}

export function buyFeast(state) {
  const next = deepCloneState(state);
  const tier = FEAST_TIERS[next.feastTierIndex ?? 0];
  if (!tier) return state;
  const perGood = Math.ceil(tier.cost / 3);
  if ((next.artisan.bread ?? 0) < perGood || (next.artisan.jam ?? 0) < perGood || (next.artisan.sauce ?? 0) < perGood) return state;
  next.artisan.bread -= perGood;
  next.artisan.jam -= perGood;
  next.artisan.sauce -= perGood;
  next.feastBonusPercent = Math.min(FEAST_MAX_BONUS, (next.feastBonusPercent ?? 0) + tier.bonusPercent);
  next.feastTierIndex = (next.feastTierIndex ?? 0) + 1;
  return next;
}

export function unlockFishingBody(state, bodyId) {
  const next = deepCloneState(state);
  const body = FISHING_BODIES[bodyId];
  if (!body) return state;
  if (next.fishing?.bodies?.[bodyId]?.unlocked) return state;
  const order = FISHING_BODY_ORDER;
  const idx = order.indexOf(bodyId);
  if (idx > 0) {
    const prev = order[idx - 1];
    if (!next.fishing?.bodies?.[prev]?.unlocked) return state;
  }
  if (body.unlockCost > 0 && (next.cash ?? 0) < body.unlockCost) return state;
  if (body.unlockCost > 0) next.cash -= body.unlockCost;
  if (!next.fishing) next.fishing = { activeBody: "pond", bodies: {}, fish: {} };
  if (!next.fishing.bodies[bodyId]) next.fishing.bodies[bodyId] = {};
  next.fishing.bodies[bodyId].unlocked = true;
  next.fishing.bodies[bodyId].workers = next.fishing.bodies[bodyId].workers ?? []; // empty workers array
  return next;
}

export function hireFishingWorker(state, bodyId) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  if (!body?.unlocked) return state;
  if (isAtWorkerCap(next)) return state;
  const bodyDef = FISHING_BODIES[bodyId];
  const maxWorkers = bodyDef?.maxWorkers ?? 1;
  if (!body.workers) next.fishing.bodies[bodyId].workers = [];
  if (next.fishing.bodies[bodyId].workers.length >= maxWorkers) return state;
  const cost = FISHING_WORKER_HIRE_COSTS[bodyId] ?? 75;
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  next.fishing.bodies[bodyId].workers.push({
    hired: true,
    upgrades: [],
    timer: 0,
    assignedBait: null,
    hiredAt: Date.now(),
  });
  return next;
}

export function fireFishingWorker(state, bodyId, workerIndex) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  if (!body) return state;
  if (body.workers) {
    if (workerIndex == null || workerIndex < 0 || workerIndex >= body.workers.length) return state;
    body.workers.splice(workerIndex, 1);
  } else {
    if (!body.worker?.hired) return state;
    body.worker = null;
  }
  return next;
}

export function setFishingActiveBody(state, bodyId) {
  const next = deepCloneState(state);
  if (!next.fishing?.bodies?.[bodyId]?.unlocked) return state;
  next.fishing.activeBody = bodyId;
  return next;
}

export function upgradeFishingWorker(state, bodyId, upgradeId, workerIndex = 0) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  const workers = body?.workers ?? (body?.worker ? [body.worker] : []);
  const worker = workers[workerIndex];
  if (!worker) return state;
  const upgrade = FISHING_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return state;
  if ((worker.upgrades ?? []).includes(upgradeId)) return state;
  if (upgrade.requires && !(worker.upgrades ?? []).includes(upgrade.requires)) return state;
  if ((next.cash ?? 0) < upgrade.cost) return state;
  if (!canAffordUpgradeMaterials(state, upgrade.upgradeRequires)) return state;
  // School gate: tier-2 fishing upgrades require the school
  if (upgradeId === "haul_2" && !hasSchoolResearch(state, "fishing_haul_2")) return state;
  if (upgradeId === "gear_expert" && !hasSchoolResearch(state, "fishing_gear_expert")) return state;
  next.cash -= upgrade.cost;
  consumeUpgradeMaterials(next, upgrade.upgradeRequires);
  worker.upgrades = [...(worker.upgrades ?? []), upgradeId];
  return next;
}
export function setFishingWorkerBait(state, bodyId, baitId, workerIndex = 0) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  const workers = body?.workers ?? (body?.worker ? [body.worker] : []);
  const worker = workers[workerIndex];
  if (!worker) return state;
  worker.assignedBait = baitId;
  return next;
}
export function toggleFishingWorkerAllowedFish(state, bodyId, fishId, workerIndex = 0) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  const workers = body?.workers ?? (body?.worker ? [body.worker] : []);
  const worker = workers[workerIndex];
  if (!worker) return state;
  const all = ["minnow", "bass", "perch", "rare"];
  const current = worker.allowedFish ?? all;
  if (current.includes(fishId)) {
    const next_ = current.filter((f) => f !== fishId);
    worker.allowedFish = next_.length > 0 ? next_ : current;
  } else {
    worker.allowedFish = [...current, fishId];
  }
  return next;
}

export function getPlayerFishingUpgrades(state) {
  return state.fishing?.playerUpgrades ?? [];
}

/** Wider sweet spot: +10% per rod tier owned */
export function getPlayerFishingSweetSpotBonus(state) {
  const owned = getPlayerFishingUpgrades(state);
  const rodTiers = ["rod_1", "rod_2", "rod_3"].filter((id) => owned.includes(id)).length;
  return rodTiers * 0.10;
}

/** More reel per tap: +20% per reel tier owned */
export function getPlayerFishingReelBonus(state) {
  const owned = getPlayerFishingUpgrades(state);
  const reelTiers = ["reel_1", "reel_2"].filter((id) => owned.includes(id)).length;
  return reelTiers * 0.20;
}

/** Slower needle: -15% speed per patience tier owned */
export function getPlayerFishingPatienceBonus(state) {
  const owned = getPlayerFishingUpgrades(state);
  const tiers = ["patience_1", "patience_2"].filter((id) => owned.includes(id)).length;
  return tiers * 0.15;
}

/** How many fish per successful manual reel */
export function getPlayerFishingHaul(state) {
  const owned = getPlayerFishingUpgrades(state);
  if (owned.includes("haul_10")) return 10;
  if (owned.includes("haul_5")) return 5;
  if (owned.includes("haul_2")) return 2;
  return 1;
}

export function buyFishingPlayerUpgrade(state, upgradeId) {
  const upgrade = FISHING_PLAYER_UPGRADES[upgradeId];
  if (!upgrade) return state;
  const owned = state.fishing?.playerUpgrades ?? [];
  if (owned.includes(upgradeId)) return state;
  if (upgrade.requires && !owned.includes(upgrade.requires)) return state;
  if ((state.cash ?? 0) < upgrade.cost) return state;
  const next = deepCloneState(state);
  if (!next.fishing) return state;
  next.fishing.playerUpgrades = [...owned, upgradeId];
  next.cash -= upgrade.cost;
  return next;
}

export function catchFish(state, fishId, baitId, bodyId, count = 1) {
  if (!state.fishing) return state;
  const next = deepCloneState(state);
  if (!next.fishing.fish) next.fishing.fish = {};
  next.fishing.fish[fishId] = (next.fishing.fish[fishId] ?? 0) + count;
  if (baitId && (next.bait?.[baitId] ?? 0) > 0) next.bait[baitId] -= 1;
  if (!next.questProgress) next.questProgress = {};
  next.questProgress.fishCaughtCount = (next.questProgress.fishCaughtCount ?? 0) + count;
  if (fishId === "bass" || fishId === "perch" || fishId === "rare") next.questProgress.qualityFishCount = (next.questProgress.qualityFishCount ?? 0) + count;
  if (fishId === "rare") next.questProgress.rareFishCount = (next.questProgress.rareFishCount ?? 0) + count;
  return next;
}
 
// ─── Farm unlock ──────────────────────────────────────────────────────────────
 
export function unlockExtraFarm(state, cropId) {
  if (!state.pendingFarmUnlock || !EXTRA_FARM_CROPS.includes(cropId)) return state;
  const cost = getNextFarmUnlockCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  next.extraFarmsUnlocked = (next.extraFarmsUnlocked ?? 0) + 1;
  next.pendingFarmUnlock = false;
  next.farms.push(makeFarm(cropId, true));
  return next;
}

export function unlockSeasonFarm(state, cropId) {
  if (!state.pendingSeasonUnlock) return state;
  if (!EXTRA_FARM_CROPS.includes(cropId)) return state;
  const cost = getNextFarmUnlockCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  next.extraFarmsUnlocked = (next.extraFarmsUnlocked ?? 0) + 1;
  next.pendingSeasonUnlock = false;
  next.farms.push(makeFarm(cropId, true));
  return next;
}

export function skipSeasonUnlock(state) {
  if (!state.pendingSeasonUnlock) return state;
  const next = deepCloneState(state);
  next.pendingSeasonUnlock = false;
  return next;
}

export function unlockSeasonBarn(state, buildingId) {
  if (!state.pendingSeasonUnlock) return state;
  if (!BARN_BUILDINGS[buildingId]) return state;
  const next = deepCloneState(state);
  next.pendingSeasonUnlock = false;
  if (!next.barnInstances) next.barnInstances = [];
  if (next.barnBuildings?.[buildingId]?.built) {
    // Add another instance of this barn type
    next.barnInstances.push({ id: genId("bi"), buildingType: buildingId, tier: 1, animals: [], barnWorkers: [] });
  } else {
    next.barnBuildings[buildingId] = { built: true, tier: 1 };
    next.barnInstances.push({ id: genId("bi"), buildingType: buildingId, tier: 1, animals: [], barnWorkers: [] });
  }
  return next;
}
 
export function getNextFarmUnlockCost(state) {
  return getFarmUnlockCost(state.extraFarmsUnlocked ?? 0);
}
 
export function canUnlockFarm(state) {
  return state.pendingFarmUnlock && (state.cash ?? 0) >= getNextFarmUnlockCost(state);
}