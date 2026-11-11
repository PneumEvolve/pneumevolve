// src/Pages/rootwork/engine/save.js — save / load / migrations
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
import { getEffectiveGrowTime, makeFreshTown, makeKitchenWorker, makeMarketWorker } from "./setup.js";
import { tick } from "./tick.js";

// ─── Serialization ────────────────────────────────────────────────────────────
 
export function serializeState(state) {
  // Prune stale farm stats keys (farms that no longer exist)
  const activeFarmIds = new Set((state.farms ?? []).map(f => f.id));
  const cleanFarmCrops = Object.fromEntries(
    Object.entries(state.stats?.farmCrops ?? {}).filter(([id]) => activeFarmIds.has(id))
  );

  // Cap forgeGoodsInstanced: only keep equipped items + unequipped up to 200
  const equippedInstanceIds = new Set(
    (state.adventurers ?? []).flatMap(a => Object.values(a.equippedInstanceId ?? {})).filter(Boolean)
  );
  const equippedItems = (state.forgeGoodsInstanced ?? []).filter(i => equippedInstanceIds.has(i.id));
  const unequippedItems = (state.forgeGoodsInstanced ?? []).filter(i => !equippedInstanceIds.has(i.id)).slice(-200);
  const cleanForgeInstanced = [...equippedItems, ...unequippedItems];

  const cleanState = {
    ...state,
    lastSavedTime: Date.now(),
    stats: { ...state.stats, farmCrops: cleanFarmCrops },
    forgeGoodsInstanced: cleanForgeInstanced,
    // Clear transient tick-only fields — no need to persist these
    pendingDeathEvents: [],
    pendingAutoBattleResult: null,
  };
  return JSON.stringify(cleanState);
}
 
export function deserializeState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.farms) || !Array.isArray(parsed.workers)) return null;

 
    if (parsed.kitchenWorkers === undefined) {
      parsed.kitchenWorkers = [];
      for (const item of (parsed.processingQueue ?? []).filter((i) => !i.done)) {
        const w = makeKitchenWorker();
        w.recipeId = item.recipeId; w.elapsedSeconds = item.elapsedSeconds ?? 0;
        w.totalSeconds = item.totalSeconds ?? 120; w.busy = true;
        parsed.kitchenWorkers.push(w);
      }
    }
    delete parsed.processingQueue; delete parsed.kitchenPurchased;
    delete parsed.kitchenSlotCount; delete parsed.kitchenSlots;
 
    if (parsed.marketWorkers === undefined) {
      parsed.marketWorkers = [];
      if ((parsed.marketQueue ?? []).length > 0) {
        const w = makeMarketWorker();
        w.queue = parsed.marketQueue.map((o) => ({ ...o }));
        parsed.marketWorkers.push(w);
      }
    }
    delete parsed.marketQueue; delete parsed.marketUnlocked;
 
    for (const w of parsed.workers ?? []) { if (w.cycleCount === undefined) w.cycleCount = 0; if (w.hiredAt === undefined) w.hiredAt = 0; }
    for (const w of parsed.kitchenWorkers ?? []) { if (w.batchSize === undefined) w.batchSize = 1; if (w.hiredAt === undefined) w.hiredAt = 0; }
    for (const w of parsed.marketWorkers ?? []) { if (w.hasStandingOrder === undefined) w.hasStandingOrder = false; if (w.standingOrder === undefined) w.standingOrder = null; if (w.hiredAt === undefined) w.hiredAt = 0; if (w.sellProgress === undefined) w.sellProgress = 0; }
 
    if (parsed.yieldPool === undefined) parsed.yieldPool = 0;
    if (parsed.keptWorkers === undefined) parsed.keptWorkers = [];
    for (const kw of parsed.keptWorkers) { if (kw.keptType === undefined) kw.keptType = "farm"; }
    if (parsed.pendingWorkerAssignments === undefined) parsed.pendingWorkerAssignments = false;
    if (parsed.artisan === undefined) parsed.artisan = { bread: 0, jam: 0, sauce: 0 };
    if (parsed.feastBonusPercent === undefined) parsed.feastBonusPercent = 0;
    if (parsed.feastTierIndex === undefined) parsed.feastTierIndex = 0;
    if (parsed.cash === undefined) parsed.cash = 0;
    if (parsed.lifetimeCash === undefined) parsed.lifetimeCash = 0;
    if (parsed.extraFarmsUnlocked === undefined) parsed.extraFarmsUnlocked = 0;
    if (parsed.pendingFarmUnlock === undefined) parsed.pendingFarmUnlock = false;
    if (parsed.pendingSeasonUnlock === undefined) parsed.pendingSeasonUnlock = false;
    if (!parsed.stats) parsed.stats = { farmCrops: {}, kitchenGoods: {}, marketCash: null };
 
    if (Array.isArray(parsed.prestigeBonuses)) {
      parsed.prestigeBonuses = parsed.prestigeBonuses.map((b) => b === "bigger_kitchen" ? "market_savvy" : b);
    }

    // ── Prestige skill tree migration ─────────────────────────────────────────
    if (!parsed.prestigeSkills) parsed.prestigeSkills = {};
    if (parsed.prestigePoints === undefined) parsed.prestigePoints = 0;
    // Migrate old flat prestigeBonuses array into skill tree — one-time, then clear
    if (Array.isArray(parsed.prestigeBonuses) && parsed.prestigeBonuses.length > 0 && parsed.prestigePoints === 0) {
      const legacyMap = {
        bumper_crop: "bumper_crop",
        fast_hands: "fast_hands",
        market_savvy: "market_savvy",
        head_start: null, // no direct equivalent — grant a free point instead
      };
      for (const bonus of parsed.prestigeBonuses) {
        const skillId = legacyMap[bonus];
        if (skillId) {
          parsed.prestigeSkills[skillId] = (parsed.prestigeSkills[skillId] ?? 0) + 1;
        }
        // Every old bonus was worth 1 point
        parsed.prestigePoints += 1;
      }
      parsed.prestigeBonuses = [];
    }
 
    // ── Warehouse tier→level migration ────────────────────────────────────────
  if (parsed.town?.buildings?.warehouse?.tier !== undefined && parsed.town.buildings.warehouse.level === undefined) {
    parsed.town.buildings.warehouse.level = (parsed.town.buildings.warehouse.tier ?? 0) + 1;
    delete parsed.town.buildings.warehouse.tier;
  }

  if (parsed.town === undefined) {
      parsed.town = makeFreshTown();
    } else {
      // ── Migrate old town shape → new buildings{} shape ──────────────────────
      parsed.town.unlocked = true;
      if (!parsed.town.homes || parsed.town.homes === 0) parsed.town.homes = 1;
      if (parsed.town.people === undefined || parsed.town.people === 0) parsed.town.people = TOWN_STARTING_PEOPLE;
      if (parsed.town.capacity === undefined) parsed.town.capacity = TOWN_HOME_CAPACITY;
      if (parsed.town.satisfaction === undefined || parsed.town.satisfaction <= 1) parsed.town.satisfaction = TOWN_SATISFACTION_DEFAULT;
      if (parsed.town.pulseSeconds === undefined) parsed.town.pulseSeconds = TOWN_PULSE_SECONDS;
      if (parsed.town.growthAccumulator === undefined) parsed.town.growthAccumulator = TOWN_PULSE_SECONDS / 2;
      if (parsed.town.starving === undefined) parsed.town.starving = false;
      if (parsed.town.growthBonusPercent === undefined) parsed.town.growthBonusPercent = 0;
      if (parsed.town.rawFoodNeeded === undefined) parsed.town.rawFoodNeeded = 0;

      // Build new buildings{} object if missing (first migration from old save)
      if (!parsed.town.buildings) {
        parsed.town.buildings = makeFreshTown().buildings;
        const tb = parsed.town.townBuildings ?? {};
        const thLevel = parsed.town.townHallLevel ?? 0;

        // Town Hall
        parsed.town.buildings.town_hall.level = thLevel;

        // Clinic
        if (tb.clinic?.built) {
          parsed.town.buildings.clinic.built = true;
          parsed.town.buildings.clinic.workers = tb.clinic.workers ?? 0;
        }

        // Food Hall — infer tier from old bakery/pantry/cannery flags
        const bakeryLevel = parsed.town.bakeryLevel ?? 0;
        const jamOwned    = parsed.town.jamBuildingOwned === true;
        const sauceOwned  = parsed.town.sauceBuildingOwned === true;
        const pantryOn    = parsed.town.pantryOn === true;
        const canneryOn   = parsed.town.canneryOn === true;
        if (bakeryLevel >= 1) {
          parsed.town.buildings.food_hall.built = true;
          if (sauceOwned && canneryOn) parsed.town.buildings.food_hall.tier = 3;
          else if (jamOwned && pantryOn) parsed.town.buildings.food_hall.tier = 2;
          else parsed.town.buildings.food_hall.tier = 1;
        }

        // Warehouse — not in old saves, start unbuilt
        // (players will need to build it; crop caps are Infinity until built)

        // Kitchen Hall — infer level from kitchen worker count
        const kitchenWorkerCount = (parsed.kitchenWorkers ?? []).length;
        if (kitchenWorkerCount >= 1) {
          parsed.town.buildings.kitchen_hall.built = true;
          parsed.town.buildings.kitchen_hall.level = kitchenWorkerCount >= 3 ? 3 : kitchenWorkerCount >= 2 ? 2 : 1;
        }

        // Market Hall — infer from market worker count
        const marketWorkerCount = (parsed.marketWorkers ?? []).length;
        if (marketWorkerCount >= 1) {
          parsed.town.buildings.market_hall.built = true;
          parsed.town.buildings.market_hall.level = marketWorkerCount >= 3 ? 3 : marketWorkerCount >= 2 ? 2 : 1;
        }

        // Guild Hall — infer from adventurer count
        const heroCount = (parsed.adventurers ?? []).length;
        if (heroCount >= 1) {
          parsed.town.buildings.guild_hall.built = true;
          parsed.town.buildings.guild_hall.level = Math.min(3, Math.max(0, heroCount - 1));
        }

        // Tavern
        if (tb.tavern?.built) {
          parsed.town.buildings.tavern.built = true;
          parsed.town.buildings.tavern.level = tb.tavern.level ?? 1;
        }

        // School
        if (tb.school?.built) {
          parsed.town.buildings.school.built = true;
          parsed.town.buildings.school.workers = tb.school.workers ?? 0;
          parsed.town.buildings.school.activeResearchId = tb.school.activeResearchId ?? null;
          parsed.town.buildings.school.researchProgress = tb.school.researchProgress ?? 0;
          parsed.town.buildings.school.researchNeeded = tb.school.researchNeeded ?? 0;
          parsed.town.buildings.school.unlockedResearch = tb.school.unlockedResearch ?? [];
        }
      }

      // Ensure all building keys exist (in case new buildings added after save)
      const freshBuildings = makeFreshTown().buildings;
      for (const [key, def] of Object.entries(freshBuildings)) {
        if (!parsed.town.buildings[key]) parsed.town.buildings[key] = { ...def };
      }

      // Migrate: barn_hall -- infer level from existing barn workers across all instances
      if (!parsed.town.buildings.barn_hall?.built) {
        const totalBarnWorkers = (parsed.barnInstances ?? []).reduce(
          (sum, inst) => sum + (inst.barnWorkers ?? []).length, 0
        );
        const barnCount = Math.max(1, (parsed.barnInstances ?? []).length);
        const maxPerBuilding = totalBarnWorkers > 0
          ? Math.ceil(Math.max(...(parsed.barnInstances ?? [{ barnWorkers: [] }]).map(i => (i.barnWorkers ?? []).length)) || 1)
          : 0;
        if (totalBarnWorkers > 0) {
          const inferredLevel = Math.max(1, maxPerBuilding);
          parsed.town.buildings.barn_hall = { built: true, level: inferredLevel };
        }
      }

      // Migrate: forge_hall -- infer level from existing forge workers
      if (!parsed.town.buildings.forge_hall?.built) {
        const forgeWorkerCount = (parsed.forgeWorkers ?? []).length;
        if (forgeWorkerCount > 0) {
          // L1=2 workers, L2=4, L3=6 -- infer minimum level needed to hold current workers
          const inferredLevel = Math.max(1, Math.ceil(forgeWorkerCount / 2));
          parsed.town.buildings.forge_hall = { built: true, level: inferredLevel };
        }
      }

      // Derive foodMode from food_hall tier
      parsed.town.foodMode = FOOD_HALL_FOOD_MODE[parsed.town.buildings.food_hall?.tier ?? 0] ?? "wheat";

      // satisfactionTarget will be recomputed on first tick — set to current sat for now
      if (parsed.town.satisfactionTarget === undefined) {
        parsed.town.satisfactionTarget = parsed.town.satisfaction ?? TOWN_SATISFACTION_DEFAULT;
      }

      // Clear legacy fields that are no longer used
      // (keep them for one cycle so old code doesn't crash, then they're ignored)
      parsed.town.grandOpeningPulsesLeft = parsed.town.grandOpeningPulsesLeft ?? 0;
    } // end town else
 
    // These must be outside the town block — always migrate regardless
    if (!parsed.pond) parsed.pond = null;
    if (!parsed.animals) parsed.animals = { chicken: [], cow: [], sheep: [] };
    if (!parsed.pets) parsed.pets = {};
    if (!parsed.animalGoods) parsed.animalGoods = {};
const allAnimalGoods = ["egg", "milk", "wool", "omelette", "cheese", "knitted_goods", "fish_pie", "smoked_fish", "fish_meal"];
for (const key of allAnimalGoods) {
  if (parsed.animalGoods[key] === undefined) parsed.animalGoods[key] = 0;
}
    if (parsed.animalGoods.egg === undefined) parsed.animalGoods.egg = 0;
    if (parsed.animalGoods.milk === undefined) parsed.animalGoods.milk = 0;
    if (parsed.animalGoods.wool === undefined) parsed.animalGoods.wool = 0;
    if (!parsed.bait) parsed.bait = { wheat_bait: 0, berry_bait: 0, tomato_bait: 0 };
    if (!parsed.fishMealStacks) parsed.fishMealStacks = [];
    if (!parsed.barnWorkers) parsed.barnWorkers = [];
    if (parsed.kitchenWorkers) {
      for (const w of parsed.kitchenWorkers) {
        if (w.autoRestartEnabled === undefined) w.autoRestartEnabled = true;
      }
    }

    // In deserializeState, after the animalGoods block:
if ((parsed.crops?.egg ?? 0) > 0) {
  parsed.animalGoods.egg = (parsed.animalGoods.egg ?? 0) + parsed.crops.egg;
  delete parsed.crops.egg;
}

    // Migrate animals to stock-based system
for (const animalId of Object.keys(parsed.animals ?? {})) {
  for (const animal of parsed.animals[animalId]) {
    if (animal.stock === undefined) animal.stock = animal.ready ? 1 : 0;
    if (animal.storageLevel === undefined) animal.storageLevel = 0;
    if (animal.yieldLevel === undefined) animal.yieldLevel = 0;
    if (animal.missedFoodPulses === undefined) animal.missedFoodPulses = 0;
  }
}
// Migrate barn workers to new shape
for (const w of parsed.barnWorkers ?? []) {
  if (w.upgrades === undefined) w.upgrades = [];
  if (w.collectTimer === undefined) w.collectTimer = 0;
  if (w.careTimer === undefined) w.careTimer = 0;
}

// Migrate: auto-build barn buildings for players who already have animals or workers
if (!parsed.barnBuildings) {
  parsed.barnBuildings = {
    chicken_coop: { built: false, tier: 0 },
    dairy:        { built: false, tier: 0 },
    wool_shed:    { built: false, tier: 0 },
  };
  if ((parsed.animals?.chicken?.length ?? 0) > 0 || (parsed.barnWorkers ?? []).some(w => w.animalType === "chicken"))
    parsed.barnBuildings.chicken_coop = { built: true, tier: 1 };
  if ((parsed.animals?.cow?.length ?? 0) > 0 || (parsed.barnWorkers ?? []).some(w => w.animalType === "cow"))
    parsed.barnBuildings.dairy = { built: true, tier: 1 };
  if ((parsed.animals?.sheep?.length ?? 0) > 0 || (parsed.barnWorkers ?? []).some(w => w.animalType === "sheep"))
    parsed.barnBuildings.wool_shed = { built: true, tier: 1 };
}
if (!parsed.barnInstances || parsed.barnInstances.length === 0) {
  parsed.barnInstances = [];
  const BTYPE_MAP = { chicken_coop: "chicken", dairy: "cow", wool_shed: "sheep" };
  for (const [buildingId, b] of Object.entries(parsed.barnBuildings ?? {})) {
    if (!b.built) continue;
    const animalType = BTYPE_MAP[buildingId];
    const instId = `${buildingId}_1`;
    const legacyAnimals = (parsed.animals?.[animalType] ?? []).map(a => ({
      ...a, stock: a.stock ?? (a.ready ? 1 : 0), storageLevel: a.storageLevel ?? 0,
      yieldLevel: a.yieldLevel ?? 0, missedFoodPulses: a.missedFoodPulses ?? 0,
    }));
    const legacyWorkers = (parsed.barnWorkers ?? [])
      .filter(w => w.animalType === animalType)
      .map(w => ({ ...w, instanceId: instId }));
    parsed.barnInstances.push({
      id: instId, buildingType: buildingId, tier: b.tier ?? 1,
      animals: legacyAnimals, barnWorkers: legacyWorkers,
    });
  }
}
{
  const rootIds = new Set((parsed.barnWorkers ?? []).map(w => w.id));
  for (const inst of parsed.barnInstances ?? []) {
    for (const w of inst.barnWorkers ?? []) {
      if (!rootIds.has(w.id)) { parsed.barnWorkers.push(w); rootIds.add(w.id); }
    }
  }
}
// Migrate: build barnInstances from barnBuildings + legacy animals/workers
if (!parsed.barnInstances || parsed.barnInstances.length === 0) {
  parsed.barnInstances = [];
  const BTYPE_MAP = { chicken_coop: "chicken", dairy: "cow", wool_shed: "sheep" };
  for (const [buildingId, b] of Object.entries(parsed.barnBuildings ?? {})) {
    if (!b.built) continue;
    const animalType = BTYPE_MAP[buildingId];
    const instId = `${buildingId}_1`;
    const legacyAnimals = (parsed.animals?.[animalType] ?? []).map(a => ({
      ...a, stock: a.stock ?? (a.ready ? 1 : 0), storageLevel: a.storageLevel ?? 0,
      yieldLevel: a.yieldLevel ?? 0, missedFoodPulses: a.missedFoodPulses ?? 0,
    }));
    const legacyWorkers = (parsed.barnWorkers ?? [])
      .filter(w => w.animalType === animalType)
      .map(w => ({ ...w, instanceId: instId }));
    parsed.barnInstances.push({
      id: instId,
      buildingType: buildingId,
      tier: b.tier ?? 1,
      animals: legacyAnimals,
      barnWorkers: legacyWorkers,
    });
  }
}
// Ensure all barnWorkers in instances also exist in root barnWorkers (for worker cap)
{
  const rootIds = new Set((parsed.barnWorkers ?? []).map(w => w.id));
  for (const inst of parsed.barnInstances ?? []) {
    for (const w of inst.barnWorkers ?? []) {
      if (!rootIds.has(w.id)) { parsed.barnWorkers.push(w); rootIds.add(w.id); }
    }
  }
}

// Migrate pond.fish → fishing
if (!parsed.fishing) {
  parsed.fishing = {
    activeBody: "pond",
    bodies: {
      pond:  { unlocked: parsed.pond?.owned === true, workers: parsed.pond?.owned ? [{ hired: true, upgrades: [], timer: 0, assignedBait: null, hiredAt: 0 }] : [] },
      lake:  { unlocked: false, workers: [] },
      river: { unlocked: false, workers: [] },
      ocean: { unlocked: false, workers: [] },
    },
    fish: { ...(parsed.pond?.fish ?? {}) },
  };
}
// Migration: pond must be purchased with iron/lumber (no longer auto-unlocked)
// Also migrate existing fishing workers that are missing hired flag
if (parsed.fishing?.bodies) {
  for (const body of Object.values(parsed.fishing.bodies)) {
    // Migrate legacy single worker to workers array
    if (body?.worker) {
      if (!body.workers) {
        body.workers = body.worker.hired !== false ? [{ ...body.worker, hired: true, hiredAt: body.worker.hiredAt ?? 0 }] : [];
      }
      delete body.worker;
    }
    // Ensure workers array exists
    if (!body.workers) body.workers = [];
  }
}

// Migrate old fish types to new 4-fish system
if (parsed.fishing?.fish) {
  const f = parsed.fishing.fish;
  if (f.pike) { f.rare = (f.rare ?? 0) + f.pike; delete f.pike; }
  if (f.golden_fish) { f.rare = (f.rare ?? 0) + f.golden_fish; delete f.golden_fish; }
  if (f.minnow === undefined) f.minnow = 0;
  if (f.bass === undefined) f.bass = 0;
  if (f.perch === undefined) f.perch = 0;
  if (f.rare === undefined) f.rare = 0;
}
 
    // ── forgeGoodsInstanced migration ──────────────────────────────────────────
    if (!parsed.forgeGoodsInstanced) parsed.forgeGoodsInstanced = [];
    const INSTANCED_KEYS = ["master_sword", "tower_shield", "plate_armor"];
    const BASE_TIERS = { master_sword: 3, tower_shield: 3, plate_armor: 3 };
    // Migrate flat forgeGoods counts — always runs so re-saves don't get stuck
    for (const key of INSTANCED_KEYS) {
      const count = Math.floor((parsed.forgeGoods ?? {})[key] ?? 0);
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          parsed.forgeGoodsInstanced.push({
            id: "fgi_" + Math.random().toString(36).slice(2, 10),
            key,
            upgradeTier: BASE_TIERS[key],
          });
        }
        delete parsed.forgeGoods[key];
      }
    }
    // Migrate equipped instanced gear on adventurers — assign equippedInstanceId
    for (const adv of parsed.adventurers ?? []) {
      if (!adv.equippedInstanceId) adv.equippedInstanceId = {};
      for (const slot of ["weapon", "armour", "body"]) {
        const equippedKey = adv.equippedGear?.[slot];
        if (equippedKey && INSTANCED_KEYS.includes(equippedKey) && !adv.equippedInstanceId[slot]) {
          // Find a free instance or create one
          let inst = parsed.forgeGoodsInstanced.find((i) => i.key === equippedKey && !i._equippedBy);
          if (!inst) {
            inst = {
              id: "fgi_" + Math.random().toString(36).slice(2, 10),
              key: equippedKey,
              upgradeTier: BASE_TIERS[equippedKey],
            };
            parsed.forgeGoodsInstanced.push(inst);
          }
          inst._equippedBy = adv.id;
          adv.equippedInstanceId[slot] = inst.id;
        }
      }
    }

    // --- Roads / TradeTowns / Expedition migration --------------------------
    if (!parsed.roads) parsed.roads = { level: 0 };
    if (parsed.roads.level === undefined) parsed.roads.level = 0;
    if (!parsed.tradeTowns) parsed.tradeTowns = {};
    const defaultTownRoutes = () => ({ routes: { t1: { enabled: false, active: false }, t2: { enabled: false, active: false }, t3: { enabled: false, active: false } }, disrupted: false });
    if (!parsed.tradeTowns.thornwick)   parsed.tradeTowns.thornwick   = defaultTownRoutes();
    if (!parsed.tradeTowns.crestfall)   parsed.tradeTowns.crestfall   = defaultTownRoutes();
    if (!parsed.tradeTowns.glenhollow)  parsed.tradeTowns.glenhollow  = defaultTownRoutes();
    // Migrate old pulse-based saves to new route-based system
    for (const townId of ["millhaven", "ashport", "ironfeld", "velmoor"]) {
      if (!parsed.tradeTowns[townId]) {
        parsed.tradeTowns[townId] = defaultTownRoutes();
      } else if (!parsed.tradeTowns[townId].routes) {
        // Old save — wipe old fields, init fresh routes
        parsed.tradeTowns[townId] = defaultTownRoutes();
      }
    }
    if (!parsed.expeditions) parsed.expeditions = {};
    // Migrate old single-expedition state
    if (parsed.expedition) { delete parsed.expedition; }

       // ── Nov 2026 mission pass: Damp Cave + Hunting Bow removed ─────────────────
    // Heroes mid-run in a zone that no longer exists would be stuck forever
    // (returnAdventurer bails when the zone is missing). Auto runs hand back
    // what they'd already earned; single runs are just cancelled.
    for (const adv of parsed.adventurers ?? []) {
      if (adv.lastZoneId && !WORLD_ZONES[adv.lastZoneId]) adv.lastZoneId = null;
      const m = adv.mission;
      if (m && !WORLD_ZONES[m.zoneId]) {
        if (m.autoBattle && !adv.pendingAutoCollect) {
          adv.pendingAutoCollect = {
            autoBattle: true,
            stoppedByPlayer: true,
            successfulRuns: m.autoBattleRuns ?? 0,
            zoneName: m.zoneName ?? "Retired zone",
            loot: m.autoBattleLoot ?? [],
            xpGained: m.autoBattleXp ?? 0,
            leveledUp: false,
            zoneCleared: false,
            hpLost: 0,
            hpRemaining: adv.hp ?? adv.maxHp ?? 0,
            maxHp: adv.maxHp ?? 0,
          };
        }
        adv.mission = null;
      }
    }

    // Hunting Bow: refund every bow (stock, mid-craft, queued for sale, equipped)
    // as its crafting materials.
    {
      const BOW = "hunting_bow";
      const BOW_REFUND = { lumber: 16, iron_ore: 10 };
      let bows = 0;
      if ((parsed.forgeGoods?.[BOW] ?? 0) > 0) bows += Math.floor(parsed.forgeGoods[BOW]);
      if (parsed.forgeGoods) delete parsed.forgeGoods[BOW];
      for (const w of parsed.forgeWorkers ?? []) {
        if (w.recipeId === BOW) {
          bows += 1;
          w.recipeId = null; w.busy = false; w.elapsedSeconds = 0; w.totalSeconds = 0;
        }
        if (w.lastRecipeId === BOW) w.lastRecipeId = null;
      }
      for (const w of parsed.marketWorkers ?? []) {
        if (w.standingOrder === BOW) w.standingOrder = null;
        if (Array.isArray(w.queue)) {
          for (const o of w.queue) if (o.itemType === BOW) bows += Math.floor(o.quantity ?? 0);
          w.queue = w.queue.filter((o) => o.itemType !== BOW);
        }
      }
      for (const adv of parsed.adventurers ?? []) {
        if (adv.equippedGear?.weapon === BOW) {
          bows += 1;
          adv.equippedGear = { ...adv.equippedGear, weapon: null };
          if (adv.equippedInstanceId) adv.equippedInstanceId.weapon = null;
          adv.gear = Math.max(0, (adv.gear ?? 0) - 2); // bow was gear tier 2
        }
        if (adv.equippedItem === BOW) adv.equippedItem = null;
      }
      if (bows > 0) {
        if (!parsed.worldResources) parsed.worldResources = {};
        for (const [k, v] of Object.entries(BOW_REFUND)) {
          parsed.worldResources[k] = (parsed.worldResources[k] ?? 0) + v * bows;
        }
      }
    } 

    return parsed;
  } catch { return null; }
}
 
export function deepCloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
 
/**
 * Returns the demand-side grow time for rate calculations, weighted by
 * how many plots are upgraded. Use this for supply/demand coverage % — 
 * it reflects the actual average time a plot takes to grow.
 */
export function getFarmAverageGrowTime(farm, workers, cropId, feastBonusPercent = 0, townGrowthBonusPercent = 0, treasuryGrowBonus = 0, fishMealBonus = 0) {
  const upgradedCount = farm.plots.filter((p) => p.upgraded).length;
  const totalPlots = farm.unlockedPlots;
  if (upgradedCount === 0) {
    return getEffectiveGrowTime(farm, workers, cropId, null, feastBonusPercent, townGrowthBonusPercent, treasuryGrowBonus, fishMealBonus);
  }
  if (upgradedCount === totalPlots) {
    return getEffectiveGrowTime(farm, workers, cropId, { upgraded: true }, feastBonusPercent, townGrowthBonusPercent, treasuryGrowBonus, fishMealBonus);
  }
  const plainTime = getEffectiveGrowTime(farm, workers, cropId, null, feastBonusPercent, townGrowthBonusPercent, treasuryGrowBonus, fishMealBonus);
  const upgradedTime = getEffectiveGrowTime(farm, workers, cropId, { upgraded: true }, feastBonusPercent, townGrowthBonusPercent, treasuryGrowBonus, fishMealBonus);
  const plainFraction = (totalPlots - upgradedCount) / totalPlots;
  const upgradedFraction = upgradedCount / totalPlots;
  return Math.max(3, Math.round(plainTime * plainFraction + upgradedTime * upgradedFraction));
}
