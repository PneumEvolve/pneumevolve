// src/Pages/rootwork/engine/setup.js — factories, initial state, farm/barn/fishing helpers
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
import { genId, getFarmMaxPlots, getPrestigeSkillCount, getTreasuryGrowBonus, hasPrestigeSkill } from "./core.js";
import { getSchoolGrowBonus } from "./town.js";
import { deepCloneState } from "./save.js";
import { getGlenhollowBarnBonus, getMillhavenGrowBonus, getThornwickGrowBonus } from "./roads.js";

// ─── Factories ────────────────────────────────────────────────────────────────

export function makePlot(id, halfGrown = false, growTime = 15) {
  return {
    id: id ?? genId("plot"),
    state: halfGrown ? "planted" : "empty",
    growthTick: halfGrown ? Math.floor(growTime / 2) : 0,
    upgraded: false,
  };
}

export function makeFarm(cropId, isFirst = false) {
  const crop = CROPS[cropId];
  return {
    id: genId("farm"),
    crop: cropId,
    plots: [makePlot(undefined, isFirst, crop?.growTime ?? 15)],
    unlockedPlots: 1,
  };
}

export function makeFarmWorker(farmId, startWithGloves = false) {
  return {
    id: genId("worker"),
    farmId,
    gear: "bare_hands",
    specialization: "none",
    cycleProgress: 0,
    cycleCount: 0,
    hiredAt: Date.now(),
  };
}

export function makeMarketWorker() {
  return {
    id: genId("mworker"),
    gear: "cart",
    queue: [],
    standingOrder: null,
    hasStandingOrder: false,
    sellProgress: 0,
    hiredAt: Date.now(),
  };
}

export function makeKitchenWorker() {
  return {
    id: genId("kworker"),
    upgrades: [],
    recipeId: null,
    elapsedSeconds: 0,
    totalSeconds: 0,
    batchSize: 1,
    busy: false,
    hiredAt: Date.now(),
  };
}

export function makeFreshTown() {
  return {
    unlocked: true,
    homes: 2,
    people: TOWN_STARTING_PEOPLE,
    capacity: TOWN_HOME_CAPACITY,
    // Food mode: "wheat"|"bread"|"jam"|"sauce" — driven by food_hall.tier
    foodMode: "wheat",
    // Satisfaction
    satisfaction: TOWN_SATISFACTION_DEFAULT,  // starts at 80, below 100 for immediate pressure
    satisfactionTarget: TOWN_SATISFACTION_DEFAULT,
    growthBonusPercent: 0,
    // Pulse timers
    pulseSeconds: TOWN_PULSE_SECONDS,
    growthAccumulator: TOWN_PULSE_SECONDS / 2,
    starving: false,
    // Cached food needed (computed each pulse, shown in UI)
    rawFoodNeeded: 0,
    // Buildings — all live here, consistent shape
    buildings: {
      town_hall:    { level: 0 },
      clinic:       { built: false, workers: 0 },
      food_hall:    { built: false, tier: 0 },      // tier 0=none,1=bread,2=jam,3=sauce
      warehouse:    { built: false, level: 1, workers: 0 },
      kitchen_hall: { built: false, level: 0 },
      market_hall:  { built: false, level: 0 },
      barn_hall:    { built: false, level: 0 },
      forge_hall:   { built: false, level: 0 },
      guild_hall:   { built: false, level: 0 },
      tavern:       { built: false, level: 0 },
      school:       {
        built: false,
        workers: 0,
        activeResearchId: null,
        researchProgress: 0,
        researchNeeded: 0,
        unlockedResearch: [],
      },
    },
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialState() {
  return {
    season: 1,
    prestigeBonuses: [],
    prestigeSkills: {},
    prestigePoints: 0,
    keptWorkers: [],
    yieldPool: 0,
    feastBonusPercent: 0,
    feastTierIndex: 0,
    farms: [makeFarm("wheat", true)],
    workers: [],
    crops: { wheat: 5, berries: 0, tomatoes: 0 },
    artisan: { bread: 0, jam: 0, sauce: 0 },

    kitchenWorkers: [],
    marketWorkers: [],
    cash: 0,
    lifetimeCash: 0,
    farmInvestments: {},
    extraFarmsUnlocked: 0,
    pendingFarmUnlock: false,
    pendingSeasonUnlock: false,
    lastSavedTime: Date.now(),
    totalPlayTime: 0,
    pendingWorkerAssignments: false,
    town: makeFreshTown(),
    // Stats buffers — rolling 60s windows
    stats: {
      farmCrops: {},
      kitchenGoods: {},
      marketCash: null,
    },
    questProgress: {
      manualHarvestCount: 0, berriesHarvested: 0, tomatoesHarvested: 0, fishCaughtCount: 0, qualityFishCount: 0, rareFishCount: 0,
      breadCrafted: 0, jamCrafted: 0, sauceCrafted: 0, eggsCollected: 0,
      milkCollected: 0, woolCollected: 0, omelettesCrafted: 0, forgeItemsCrafted: 0,
      heroQuestsCompleted: 0, tier2QuestsCompleted: 0, bossFightsWon: 0, heroPrestiges: 0,
      chainmailOrBetterCrafted: false, t3ItemCrafted: false, claimedQuestIds: [],
      maxAutoBattleRun: 0, maxSimultaneousAutoBattlers: 0,
    },
    // Animals & pond
    pond: null, // keep for migration compatibility
    fishing: {
      activeBody: "pond",
      bodies: {
        pond:  { unlocked: false, worker: null },
        lake:  { unlocked: false, worker: null },
        river: { unlocked: false, worker: null },
        ocean: { unlocked: false, worker: null },
      },
      fish: { minnow: 0, bass: 0, perch: 0, rare: 0 },
    },
    animals: { chicken: [], cow: [], sheep: [] },
    barnInstances: [],
    pets: {},
    animalGoods: { egg: 0, milk: 0, wool: 0, omelette: 0, cheese: 0, knitted_goods: 0, fish_pie: 0, smoked_fish: 0, fish_meal: 0 },
    bait: { wheat_bait: 0, berry_bait: 0, tomato_bait: 0 },
    fishMealStacks: [],
    barnWorkers: [],
    adventurers: [],
    worldZoneClears: {},
    worldResources: { iron_ore: 0, lumber: 0, herbs: 0, rare_gem: 0 },
    forgeBuilt: false,
    forgeWorkers: [],
    forgeGoods: {},
    cropPotions: {},
    barnBuildings: {
      chicken_coop: { built: false, tier: 0 },
      dairy:        { built: false, tier: 0 },
      wool_shed:    { built: false, tier: 0 },
    },
    roads: { level: 0 },
    tradeTowns: {
      millhaven: { routes: { t1: { enabled: false, active: false }, t2: { enabled: false, active: false }, t3: { enabled: false, active: false } }, disrupted: false },
      ashport:   { routes: { t1: { enabled: false, active: false }, t2: { enabled: false, active: false }, t3: { enabled: false, active: false } }, disrupted: false },
      ironfeld:  { routes: { t1: { enabled: false, active: false }, t2: { enabled: false, active: false }, t3: { enabled: false, active: false } }, disrupted: false },
      velmoor:   { routes: { t1: { enabled: false, active: false }, t2: { enabled: false, active: false }, t3: { enabled: false, active: false } }, disrupted: false },
    },
    expeditions: {},
  };
}

// ─── Farm helpers ─────────────────────────────────────────────────────────────

export function getFarmCrop(farm) { return CROPS[farm.crop]; }

export function getNextGear(currentGear) {
  const idx = GEAR_ORDER.indexOf(currentGear);
  if (idx === -1 || idx === GEAR_ORDER.length - 1) return null;
  return GEAR_ORDER[idx + 1];
}

export function getPlotUnlockCost(state, farmId, currentPlotCount) {
  const maxPlots = getFarmMaxPlots(state, farmId);
  if (currentPlotCount >= maxPlots) return null;
  const raw = PLOT_BASE_COST * Math.pow(PLOT_COST_MULTIPLIER, currentPlotCount - 1);
  return Math.max(5, Math.round(raw / 5) * 5);
}

export function needsSpecialization(worker) {
  return worker.gear === "hoe" && worker.specialization === "none";
}

export function getWorkerHireCost(state, farmId) {
  const workersOnFarm = state.workers.filter((w) => w.farmId === farmId).length;
  const raw = WORKER_HIRE_BASE_COST * Math.pow(WORKER_HIRE_MULTIPLIER, workersOnFarm);
  return Math.round(raw / 5) * 5;
}

export function getEffectiveCycleSeconds(worker) {
  const gear = GEAR[worker.gear];
  let seconds = gear.cycleSeconds;
  if (worker.specialization === "harvester") {
    seconds = Math.max(1, Math.floor(seconds * SPECIALIZATIONS.harvester.cycleMultiplier));
  }
  return seconds;
}

export function getEffectivePlotsPerCycle(worker) {
  const gear = GEAR[worker.gear];
  if (worker.specialization === "sprinter") {
    return gear.plotsPerCycle * SPECIALIZATIONS.sprinter.plotsMultiplier;
  }
  return gear.plotsPerCycle;
}

export function isSprinterResting(worker) {
  if (worker.specialization !== "sprinter") return false;
  return (worker.cycleCount ?? 0) % SPECIALIZATIONS.sprinter.restEvery === SPECIALIZATIONS.sprinter.restEvery - 1;
}

export function getFishMealGrowBonus(state) {
  const stacks = state.fishMealStacks ?? [];
  return stacks.reduce((sum, s) => sum + (s.secondsLeft > 0 ? s.bonus : 0), 0);
}

export function getAnimalEffectiveCycleSeconds(baseSeconds, state) {
  const barnSpeedBonus = getGlenhollowBarnBonus(state); // 0 / 0.15 / 0.30 / 0.50
  if (barnSpeedBonus <= 0) return baseSeconds;
  return Math.max(10, Math.floor(baseSeconds / (1 + barnSpeedBonus)));
}
// ─── Barn worker helpers ──────────────────────────────────────────────────────

export function getBarnWorkerHireCost(state, instanceId) {
  const inst = (state.barnInstances ?? []).find((i) => i.id === instanceId);
  const count = (inst?.barnWorkers ?? []).length;
  const raw = BARN_WORKER_HIRE_BASE_COST * Math.pow(BARN_WORKER_HIRE_MULTIPLIER, count);
  return Math.round(raw / 5) * 5;
}

export function getBarnWorkerInterval(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("speed_2")) return 40;
  if (upgrades.includes("speed_1")) return 50;
  return BARN_WORKER_BASE_INTERVAL; // 60
}

export function getBarnWorkerCapacity(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("capacity_2")) return 6;
  if (upgrades.includes("capacity_1")) return 3;
  return BARN_WORKER_BASE_CAPACITY;
}

export function getBarnWorkerCareInterval(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("care_2")) return 90;
  if (upgrades.includes("care_1")) return 120;
  return null;
}

export function getBarnWorkerCareMood(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("care_2")) return 35;
  if (upgrades.includes("care_1")) return 25;
  return 0;
}

export function getAnimalStockMax(animal) {
  const level = animal.storageLevel ?? 0;
  const upgrade = ANIMAL_STORAGE_UPGRADES[level - 1];
  return upgrade ? upgrade.maxStock : ANIMAL_BASE_STOCK_MAX;
}

export function getAnimalStorageUpgradeCost(animal) {
  const level = animal.storageLevel ?? 0;
  const next = ANIMAL_STORAGE_UPGRADES[level];
  return next ?? null;
}

export function getAnimalBonusYield(animal) {
  const level = animal.yieldLevel ?? 0;
  const upgrade = ANIMAL_YIELD_UPGRADES[level - 1];
  return upgrade ? upgrade.bonusYield : 0;
}

export function getAnimalYieldUpgradeCost(animal) {
  const level = animal.yieldLevel ?? 0;
  return ANIMAL_YIELD_UPGRADES[level] ?? null;
}

// ─── Barn building helpers ────────────────────────────────────────────────────

export function getBarnBuilding(state, buildingId) {
  return state.barnBuildings?.[buildingId] ?? { built: false, tier: 0 };
}

export function getBarnBuildingTierData(state, buildingId) {
  const b = getBarnBuilding(state, buildingId);
  if (!b.built) return null;
  return BARN_BUILDING_TIERS[b.tier - 1] ?? BARN_BUILDING_TIERS[0];
}

export function getBarnBuildingAnimalSlots(state, buildingId) {
  // Total slots across all instances of this building type
  const instances = (state.barnInstances ?? []).filter(i => i.buildingType === buildingId);
  const breedingBonus = hasPrestigeSkill(state, "breeding_program") ? 2 : 0;
  if (instances.length === 0) {
    // Fallback to legacy tier-based calc if no instances yet
    const tier = getBarnBuildingTierData(state, buildingId);
    return tier ? (tier.animalSlots + breedingBonus) : 0;
  }
  return instances.reduce((sum, inst) => {
    const tierData = BARN_BUILDING_TIERS[(inst.tier ?? 1) - 1] ?? BARN_BUILDING_TIERS[0];
    return sum + tierData.animalSlots + breedingBonus;
  }, 0);
}

export function getBarnInstanceAnimalSlots(state, instanceId) {
  const inst = (state.barnInstances ?? []).find(i => i.id === instanceId);
  if (!inst) return 0;
  const tierData = BARN_BUILDING_TIERS[(inst.tier ?? 1) - 1] ?? BARN_BUILDING_TIERS[0];
  const breedingBonus = hasPrestigeSkill(state, "breeding_program") ? 2 : 0;
  return tierData.animalSlots + breedingBonus;
}

// Barn Hall: max workers per barn building instance
export function getMaxBarnWorkersPerBuilding(state) {
  const bh = state.town?.buildings?.barn_hall;
  if (!bh?.built) return 0;
  return bh.level ?? 1;
}

// Barn Hall: how many barn workers retained total on prestige (1 per hall level)
export function getBarnHallRetainCount(state) {
  const bh = state.town?.buildings?.barn_hall;
  if (!bh?.built) return 0;
  return bh.level ?? 1;
}

export function getBarnBuildingWorkerSlots(state, buildingId) {
  const maxPerBuilding = getMaxBarnWorkersPerBuilding(state);
  const instances = (state.barnInstances ?? []).filter(i => i.buildingType === buildingId);
  return instances.length * maxPerBuilding;
}

export function getBarnInstanceWorkerSlots(state, instanceId) {
  return getMaxBarnWorkersPerBuilding(state);
}

export function getBarnBuildingForAnimal(animalType) {
  return Object.values(BARN_BUILDINGS).find((b) => b.animalType === animalType) ?? null;
}

export function canBuildBarnBuilding(state, buildingId) {
  const def = BARN_BUILDINGS[buildingId];
  if (!def) return false;
  const b = getBarnBuilding(state, buildingId);
  if (b.built) return false;
  if ((state.season ?? 1) < def.unlockSeason) return false;
  if ((state.cash ?? 0) < def.buildCost) return false;
  return true;
}

export function buildBarnBuilding(state, buildingId) {
  if (!canBuildBarnBuilding(state, buildingId)) return state;
  const def = BARN_BUILDINGS[buildingId];
  const next = deepCloneState(state);
  next.cash -= def.buildCost;
  if (!next.barnBuildings) next.barnBuildings = {};
  next.barnBuildings[buildingId] = { built: true, tier: 1 };
  if (!next.barnInstances) next.barnInstances = [];
  next.barnInstances.push({ id: genId("bi"), buildingType: buildingId, tier: 1, animals: [], barnWorkers: [] });
  return next;
}

export function canUpgradeBarnBuilding(state, buildingId, instanceId) {
  const b = getBarnBuilding(state, buildingId);
  if (!b.built) return false;
  const inst = instanceId
    ? (state.barnInstances ?? []).find(i => i.id === instanceId)
    : (state.barnInstances ?? []).find(i => i.buildingType === buildingId);
  if (!inst) return false;
  if (inst.tier >= BARN_BUILDING_TIERS.length) return false;
  const nextTier = BARN_BUILDING_TIERS[inst.tier];
  if (!nextTier) return false;
  if ((state.cash ?? 0) < nextTier.upgradeCost) return false;
  // Check material costs
  const matCost = nextTier.upgradeMaterialCost ?? {};
  for (const [key, needed] of Object.entries(matCost)) {
    const have = (state.worldResources?.[key] ?? 0) + (state.forgeGoods?.[key] ?? 0);
    if (have < needed) return false;
  }
  return true;
}

export function upgradeBarnBuilding(state, buildingId, instanceId) {
  if (!canUpgradeBarnBuilding(state, buildingId, instanceId)) return state;
  const next = deepCloneState(state);
  const b = next.barnBuildings[buildingId];
  // Find target instance (if provided), otherwise upgrade first instance
  const inst = instanceId
    ? (next.barnInstances ?? []).find(i => i.id === instanceId)
    : (next.barnInstances ?? []).find(i => i.buildingType === buildingId);
  if (!inst) return state;
  const nextTier = BARN_BUILDING_TIERS[inst.tier]; // inst.tier is 1-indexed
  if (!nextTier) return state;
  next.cash -= nextTier.upgradeCost;
  // Deduct material costs (worldResources first, then forgeGoods)
  const matCost = nextTier.upgradeMaterialCost ?? {};
  for (const [key, needed] of Object.entries(matCost)) {
    let remaining = needed;
    const fromWorld = Math.min(remaining, next.worldResources?.[key] ?? 0);
    if (fromWorld > 0) {
      next.worldResources[key] = (next.worldResources[key] ?? 0) - fromWorld;
      remaining -= fromWorld;
    }
    if (remaining > 0) {
      next.forgeGoods = next.forgeGoods ?? {};
      next.forgeGoods[key] = (next.forgeGoods[key] ?? 0) - remaining;
    }
  }
  inst.tier += 1;
  // Keep building-level tier as max tier across instances
  b.tier = Math.max(b.tier, inst.tier);
  return next;
}

export function getTotalBarnUpkeepPerSec(state) {
  let total = 0;
  for (const inst of state.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    const count = (inst.animals ?? []).length;
    total += count * def.upkeepPerAnimalPerSec;
  }
  return total;
}

export function getFishingWorkerInterval(worker, state = null) {
  const upgrades = worker.upgrades ?? [];
  let base;
  if (upgrades.includes("speed_2")) base = 20;
  else if (upgrades.includes("speed_1")) base = 40;
  else base = FISHING_WORKER_BASE_INTERVAL;
  // sea_legs: 20% faster per stack
  const seaLegsCount = state ? getPrestigeSkillCount(state, "sea_legs") : 0;
  if (seaLegsCount > 0) base = Math.max(5, Math.floor(base * Math.pow(0.8, seaLegsCount)));
  return base;
}

export function getFishingWorkerHaul(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("haul_2")) return 5;
  if (upgrades.includes("haul_1")) return 2;
  return 1;
}

export function getFishingWorkerGearTier(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("gear_expert")) return "expert";
  if (upgrades.includes("gear_good")) return "good";
  return "basic";
}

export function rollFishForBody(bodyId, gearTier, baitId = null) {
  const rates = [...(FISHING_CATCH_RATES[bodyId]?.[gearTier] ?? [80,20,0,0])];
  // Apply bait rare bonus — steal from minnow first, then bass
  if (baitId && FISHING_BAIT_BONUS[baitId]) {
    const bonus = FISHING_BAIT_BONUS[baitId].rarePct;
    let remaining = bonus;
    const steal = Math.min(remaining, rates[0]);
    rates[0] -= steal; rates[3] += steal; remaining -= steal;
    if (remaining > 0) {
      const steal2 = Math.min(remaining, rates[1]);
      rates[1] -= steal2; rates[3] += steal2;
    }
  }
  const roll = Math.random() * 100;
  let cumulative = 0;
  const fish = ["minnow", "bass", "perch", "rare"];
  for (let i = 0; i < fish.length; i++) {
    cumulative += rates[i];
    if (roll < cumulative) return fish[i];
  }
  return "minnow";
}

export function getEffectiveGrowTime(farm, workers, cropId, plot = null, feastBonusPercent = 0, townGrowthBonusPercent = 0, treasuryGrowBonus = 0, fishMealBonus = 0) {
  const crop = CROPS[cropId];
  let time = crop.growTime;
  const growers = workers.filter((w) => w.farmId === farm.id && w.specialization === "grower");
  for (let i = 0; i < growers.length; i++) {
    time = Math.floor(time * SPECIALIZATIONS.grower.growMultiplier);
  }
  // Plot upgrades no longer change grow time — they add yield instead (PLOT_UPGRADE_BONUS_YIELD, tick.js).
  // Percentage bonuses are combined first and rounded ONCE. Flooring after each bonus meant a
  // +1% town bonus cut wheat from 12s to 11s (an 8% speed-up), which silently raised the number
  // of workers a farm needs to be season-ready.
  const bonusDivisor =
    (1 + Math.max(0, feastBonusPercent) / 100) *
    (1 + Math.max(0, townGrowthBonusPercent) / 100) *
    (1 + Math.max(0, treasuryGrowBonus) / 100) *
    (1 + Math.max(0, fishMealBonus) / 100);
  time = Math.round(time / bonusDivisor);
  return Math.max(3, time);
}

export function getFarmGrowTime(farm, workers, cropId, feastBonusPercent = 0, townGrowthBonusPercent = 0, treasuryGrowBonus = 0, fishMealBonus = 0) {
  return getEffectiveGrowTime(farm, workers, cropId, null, feastBonusPercent, townGrowthBonusPercent, treasuryGrowBonus, fishMealBonus);
}

export function getNextFeastTier(state) {
  return FEAST_TIERS[state.feastTierIndex ?? 0] ?? null;
}

export function getAvailableFarms(season) {
  return SEASON_FARMS[Math.min(season, 3)] ?? SEASON_FARMS[3];
}