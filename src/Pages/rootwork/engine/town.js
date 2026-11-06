// src/Pages/rootwork/engine/town.js — town buildings and halls
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
import { canAffordUpgradeMaterials, consumeUpgradeMaterials, getSatisfactionCeiling, getTotalWorkersHired, getTownHallLevel, getTradeTownSatBonus, getTreasuryBalance } from "./core.js";
import { deepCloneState } from "./save.js";

// ─── Town helpers ─────────────────────────────────────────────────────────────
 
export function getTownHomeCost(state) {
  const homes = state.town?.homes ?? 0;
  if (homes === 0) return 0;
  const raw = TOWN_HOME_SECOND_COST * Math.pow(TOWN_HOME_COST_MULTIPLIER, homes - 1);
  return Math.min(100_000, Math.round(raw / 5) * 5);
}
 
export function getTownBakeryCost(state) {
  const bakeryLevel = state.town?.bakeryLevel ?? 0;
  const raw = TOWN_BAKERY_BASE_COST * Math.pow(TOWN_BAKERY_COST_MULTIPLIER, bakeryLevel);
  return Math.round(raw / 50) * 50;
}
 
// ─── Town building helpers ────────────────────────────────────────────────────

export function getTownBuildings(state) {
  // Legacy shim — returns old townBuildings shape for backwards compat during migration
  return state.town?.townBuildings ?? {};
}

export function getTownBuildingDef(state, key) {
  // New accessor — reads from buildings{}
  return state.town?.buildings?.[key] ?? null;
}

export function getTavernLevel(state) {
  return state.town?.buildings?.tavern?.level ?? state.town?.townBuildings?.tavern?.level ?? 0;
}



export function isTownBuildingBuilt(state, key) {
  // New shape: buildings[key].built
  const newDef = state.town?.buildings?.[key];
  if (newDef !== undefined) return newDef.built === true;
  // Legacy fallback
  return getTownBuildings(state)[key]?.built === true;
}

export function getTownBuildingWorkers(state, key) {
  // New shape: buildings[key].workers
  const newDef = state.town?.buildings?.[key];
  if (newDef !== undefined) return newDef.workers ?? 0;
  // Legacy fallback
  return getTownBuildings(state)[key]?.workers ?? 0;
}

// Clinic: each medic adds 0.5 to pop cap (additive on top of homes-based cap)
export function getClinicCapBonus(state) {
  // Clinic no longer adds sat. It hard-caps population.
  // Return the bonus population cap above the base home capacity.
  const clinicBuilt = isTownBuildingBuilt(state, "clinic");
  if (!clinicBuilt) return 0;
  return getTownBuildingWorkers(state, "clinic") * CLINIC_CAP_PER_MEDIC;
}

// Clinic: each medic adds 0.3% flat satisfaction bonus
export function getClinicSatBonus(state) {
  return 0; // Clinic no longer gives satisfaction bonus — only population cap
}

// School: each researcher adds 0.2% grow speed bonus
export function getSchoolGrowBonus(state) {
  if (!isTownBuildingBuilt(state, "school")) return 0;
  return getTownBuildingWorkers(state, "school") * SCHOOL_GROW_PER_RESEARCHER;
}

// School: research time multiplier (multiplicative reduction, floor 5%)
export function getSchoolResearchMultiplier(state) {
  if (!isTownBuildingBuilt(state, "school")) return 1;
  const researchers = getTownBuildingWorkers(state, "school");
  return Math.max(0.05, Math.pow(0.99, researchers)); // each researcher = 1% faster (multiplicative)
}

export function getSchoolData(state) {
  // New shape: buildings.school. Legacy fallback: townBuildings.school
  const school = state.town?.buildings?.school ?? state.town?.townBuildings?.school ?? null;
  if (!school?.built) return null;
  return school;
}

export function getSchoolUnlockedResearch(state) {
  const school = getSchoolData(state);
  return school?.unlockedResearch ?? [];
}

export function hasSchoolResearch(state, researchId) {
  return getSchoolUnlockedResearch(state).includes(researchId);
}

export function getActiveSchoolResearch(state) {
  const school = getSchoolData(state);
  if (!school?.activeResearchId) return null;
  return SCHOOL_RESEARCH[school.activeResearchId] ?? null;
}

export function getAvailableSchoolResearch(state) {
  const school = getSchoolData(state);
  if (!school) return [];

  const unlocked = school.unlockedResearch ?? [];
  return Object.values(SCHOOL_RESEARCH).filter((research) => {
    if (unlocked.includes(research.id)) return false;
    return (research.requires ?? []).every((req) => unlocked.includes(req));
  });
}

export function startSchoolResearch(state, researchId) {
  if (!isTownBuildingBuilt(state, "school")) return state;

  const research = SCHOOL_RESEARCH[researchId];
  if (!research) return state;

  const next = deepCloneState(state);
  // Write to new buildings.school (with legacy fallback)
  const school = next.town.buildings?.school ?? next.town.townBuildings?.school;

  school.unlockedResearch = school.unlockedResearch ?? [];
  if (school.unlockedResearch.includes(researchId)) return state;

  // Allow switching research — just check it's in the available (not-yet-unlocked) list
  const available = getAvailableSchoolResearch(next).map((r) => r.id);
  if (!available.includes(researchId)) return state;

  // Save current research progress before switching
  if (school.activeResearchId && school.activeResearchId !== researchId) {
    school.researchProgressMap = school.researchProgressMap ?? {};
    school.researchProgressMap[school.activeResearchId] = school.researchProgress ?? 0;
  }

  // Restore saved progress for this research if it exists
  school.researchProgressMap = school.researchProgressMap ?? {};
  const savedProgress = school.researchProgressMap[researchId] ?? 0;

  school.activeResearchId = researchId;
  school.researchProgress = savedProgress;
  school.researchNeeded = Math.max(
    1,
    Math.floor(research.seconds * getSchoolResearchMultiplier(next))
  );

  return next;
}

// Tavern: each bartender adds 0.5% sat bonus
export function getTavernSatBonus(state) {
  if (!isTownBuildingBuilt(state, "tavern")) return 0;
  return getTownBuildingWorkers(state, "tavern") * TAVERN_SAT_PER_BARTENDER;
}

// Tavern: how many goods consumed per pulse
export function getTavernPulseCost(state) {
  const workers = getTownBuildingWorkers(state, "tavern");
  if (workers === 0) return 0;
  return Math.max(1, Math.ceil(workers / TAVERN_GOODS_PER_PULSE_DIVISOR));
}

// Restaurant: each chef adds 0.8% sat bonus
export function getRestaurantSatBonus(state) {
  if (!isTownBuildingBuilt(state, "restaurant")) return 0;
  return getTownBuildingWorkers(state, "restaurant") * RESTAURANT_SAT_PER_CHEF;
}

// Restaurant pulse costs
export function getRestaurantOmeletteCost(state) {
  const workers = getTownBuildingWorkers(state, "restaurant");
  if (workers === 0) return 0;
  return Math.max(1, Math.ceil(workers / RESTAURANT_OMELETTE_PER_PULSE_DIVISOR));
}
export function getRestaurantCheeseCost(state) {
  const workers = getTownBuildingWorkers(state, "restaurant");
  if (workers === 0) return 0;
  return Math.max(1, Math.ceil(workers / RESTAURANT_CHEESE_PER_PULSE_DIVISOR));
}

// Clothier: cash per pulse = workers * CLOTHIER_CASH_PER_CLERK
export function getClothierCashPerPulse(state) {
  if (!isTownBuildingBuilt(state, "clothier")) return 0;
  return getTownBuildingWorkers(state, "clothier") * CLOTHIER_CASH_PER_CLERK;
}

// Clothier: knitted goods consumed per pulse
export function getClothierPulseCost(state) {
  const workers = getTownBuildingWorkers(state, "clothier");
  if (workers === 0) return 0;
  return Math.max(1, Math.ceil(workers / CLOTHIER_GOODS_PER_PULSE_DIVISOR));
}

// Rec Hall: each worker adds 0.5% sat (pushes past Food Hall ceiling)
export function getRecHallSatBonus(state) {
  if (!isTownBuildingBuilt(state, "recreation_hall")) return 0;
  return getTownBuildingWorkers(state, "recreation_hall") * REC_HALL_SAT_PER_WORKER;
}

// Rec Hall: max workers allowed (base 10, +10 per upgrade tier)
export function getRecHallMaxWorkers(state) {
  const tier = state.town?.buildings?.recreation_hall?.tier ?? 1;
  return REC_HALL_MAX_WORKERS_BASE + (tier - 1) * REC_HALL_MAX_WORKERS_PER_TIER;
}

// Total sat bonus from all town buildings (flat %, added to target)
export function getTownBuildingSatBonus(state) {
  return getClinicSatBonus(state) + getTavernSatBonus(state) + getRestaurantSatBonus(state);
}

// Total workers assigned to town buildings (these count as working for food purposes)
export function getTownBuildingWorkerCount(state) {
  const b = getTownBuildings(state);
  return (b.clinic?.workers ?? 0) + (b.school?.workers ?? 0) +
         (b.tavern?.workers ?? 0) + (b.restaurant?.workers ?? 0) +
         (b.clothier?.workers ?? 0) + (b.recreation_hall?.workers ?? 0);
}

// Available population for assignment (not already a farm/kitchen/market/barn/fishing/town-building worker)
export function getFreePeople(state) {
  return Math.max(0, Math.floor(state.town?.people ?? 0) - getTotalWorkersHired(state));
}

// ─── New building helpers ──────────────────────────────────────────────────────

export function getTownHallBuildingGate(buildingKey) {
  return TOWN_HALL_BUILDING_GATES[buildingKey] ?? 99;
}

export function isBuildingUnlocked(state, key) {
  return getTownHallLevel(state) >= getTownHallBuildingGate(key);
}

// Warehouse: per-crop storage cap
// Returns WAREHOUSE_NO_BUILDING_CAP (150) before warehouse is built, then level-based cap
export function getWarehouseLevel(state) {
  const w = state.town?.buildings?.warehouse;
  // Migrate tier→level on the fly if migration didn't run (e.g. stale save)
  if (w?.tier !== undefined && w.level === undefined) return (w.tier ?? 0) + 1;
  return w?.level ?? 1;
}
export function getWarehouseCropCap(state) {
  const w = state.town?.buildings?.warehouse;
  if (!w?.built) return WAREHOUSE_NO_BUILDING_CAP;
  // Inline tier→level fallback in case migration didn't run
  const level = w.level ?? ((w.tier ?? 0) + 1);
  const workers = w.workers ?? 0;
  const base = getWarehouseLevelBaseCap(level);
  const perWorker = getWarehouseLevelCapPerWorker(level);
  return base + workers * perWorker;
}
export function getWarehouseLevelBaseCap(level) {
  const l = level || 1;
  if (l <= WAREHOUSE_LEVEL_BASE_CAP.length) return WAREHOUSE_LEVEL_BASE_CAP[l - 1];
  return Math.round(WAREHOUSE_LEVEL_BASE_CAP[WAREHOUSE_LEVEL_BASE_CAP.length - 1] * Math.pow(2.5, l - WAREHOUSE_LEVEL_BASE_CAP.length));
}
export function getWarehouseLevelCapPerWorker(level) {
  const l = level || 1;
  if (l <= WAREHOUSE_LEVEL_CAP_PER_WORKER.length) return WAREHOUSE_LEVEL_CAP_PER_WORKER[l - 1];
  return Math.round(WAREHOUSE_LEVEL_CAP_PER_WORKER[WAREHOUSE_LEVEL_CAP_PER_WORKER.length - 1] * Math.pow(2.5, l - WAREHOUSE_LEVEL_CAP_PER_WORKER.length));
}
export function getWarehouseLevelMaxWorkers(level) {
  const l = level || 1;
  if (l <= WAREHOUSE_LEVEL_MAX_WORKERS.length) return WAREHOUSE_LEVEL_MAX_WORKERS[l - 1];
  return WAREHOUSE_LEVEL_MAX_WORKERS[WAREHOUSE_LEVEL_MAX_WORKERS.length - 1] + (l - WAREHOUSE_LEVEL_MAX_WORKERS.length) * 4;
}
export function getWarehouseUpgradeCost(level) {
  const l = level || 1;
  if (l - 1 < WAREHOUSE_LEVEL_COSTS.length) return WAREHOUSE_LEVEL_COSTS[l - 1];
  return Math.round(15_000 * Math.pow(2, l - WAREHOUSE_LEVEL_COSTS.length));
}
export function getWarehouseUpgradeRequires(level) {
  const l = level || 1;
  if (l - 1 < WAREHOUSE_LEVEL_REQUIRES.length) return WAREHOUSE_LEVEL_REQUIRES[l - 1];
  const extra = l - WAREHOUSE_LEVEL_REQUIRES.length;
  return { iron_fitting: 10 + extra * 5, iron_ore: 40 + extra * 20, lumber: 30 + extra * 10 };
}
export function getWarehouseLevelName(level) {
  const l = level || 1;
  return WAREHOUSE_LEVEL_NAMES[Math.min(l - 1, WAREHOUSE_LEVEL_NAMES.length - 1)];
}

// Kitchen Hall: max kitchen workers allowed (infinite scaling: L1=1, L2=2, L3=4, L4+=level+1 each)
export function getMaxKitchenWorkers(state) {
  const kh = state.town?.buildings?.kitchen_hall;
  if (!kh?.built) return 1; // legacy: 1 worker always allowed before hall built
  const level = kh.level ?? 1;
  if (level <= 3) return KITCHEN_HALL_MAX_WORKERS[level - 1] ?? 1;
  // Level 4+: each level adds 2 more workers (4 base + 2 per level above 3)
  return 4 + (level - 3) * 2;
}

// Market Hall: max market workers allowed
export function getMaxMarketWorkers(state) {
  const mh = state.town?.buildings?.market_hall;
  if (!mh?.built) return 1; // legacy: 1 worker always allowed
  const level = mh.level ?? 1;
  if (level <= 3) return MARKET_HALL_MAX_WORKERS[level - 1] ?? 1;
  // Level 4+: each level adds 2 more workers (4 base + 2 per level above 3)
  return 4 + (level - 3) * 2;
}

// Guild Hall: max heroes allowed
export function getMaxHeroes(state) {
  const gh = state.town?.buildings?.guild_hall;
  if (!gh?.built) return 1; // starter hero always allowed
  const level = gh.level ?? 1;
  return level + 1; // each level adds one hero slot
}

// Guild Hall: current quest tier (gates which world zones are available)
export function getGuildHallQuestTier(state) {
  const gh = state.town?.buildings?.guild_hall;
  if (!gh?.built) return 1; // tier 1 zones always available
  const level = gh.level ?? 1;
  return GUILD_HALL_QUEST_TIER[level] ?? 1;
}

// Kitchen Hall: how many workers auto-retain on prestige
export function getKitchenHallRetainCount(state) {
  const kh = state.town?.buildings?.kitchen_hall;
  if (!kh?.built) return 0;
  const level = kh.level ?? 1;
  // L1=0, L2=1, L3=2, L4=3 ... (+1 per level, starting at 0)
  if (level <= KITCHEN_HALL_RETAIN_COUNT.length) return KITCHEN_HALL_RETAIN_COUNT[level - 1] ?? 0;
  return level - 1;
}

// Market Hall: how many workers auto-retain on prestige
export function getMarketHallRetainCount(state) {
  const mh = state.town?.buildings?.market_hall;
  if (!mh?.built) return 0;
  const level = mh.level ?? 1;
  return MARKET_HALL_RETAIN_COUNT[level - 1] ?? 0;
}

// Tavern: regen rate in HP/s
export function getTavernRegenRate(state) {
  const t = state.town?.buildings?.tavern;
  if (!t?.built) return 0;
  const level = t.level ?? 1;
  return TAVERN_LEVEL_REGEN[level - 1] ?? 0;
}



// School: is built
export function isSchoolBuilt(state) {
  return state.town?.buildings?.school?.built === true;
}

export function getTownCapacity(state) {
  const homeCap = (state.town?.homes ?? 0) * TOWN_HOME_CAPACITY;
  return homeCap;
}

// Build a town building
export function buildTownBuilding(state, key) {
  // Only handles clinic and school now — other buildings have dedicated functions
  const costs = { clinic: TOWN_CLINIC_COST, school: TOWN_SCHOOL_COST };
  const cost = costs[key];
  if (!cost) return state;
  if (isTownBuildingBuilt(state, key)) return state;
  if ((state.cash ?? 0) < cost) return state;
  const thLevel = getTownHallLevel(state);
  if (key === "school" && thLevel < TOWN_HALL_BUILDING_GATES.school) return state;

  const next = deepCloneState(state);
  next.cash -= cost;
  if (!next.town.buildings) next.town.buildings = {};
  if (key === "school") {
    next.town.buildings.school = {
      built: true, workers: 0,
      activeResearchId: null, researchProgress: 0,
      researchNeeded: 0, unlockedResearch: [],
    };
  } else {
    next.town.buildings[key] = { built: true, workers: 0 };
  }
  return next;
}

// Build the Recreation Hall (TH3 gate, material cost)
export function buildRecHall(state) {
  const thLevel = getTownHallLevel(state);
  if (thLevel < TOWN_HALL_BUILDING_GATES.recreation_hall) return state;
  if (isTownBuildingBuilt(state, "recreation_hall")) return state;
  if ((state.cash ?? 0) < TOWN_REC_HALL_COST) return state;
  if (!canAffordUpgradeMaterials(state, TOWN_REC_HALL_REQUIRES)) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_REC_HALL_COST;
  consumeUpgradeMaterials(next, TOWN_REC_HALL_REQUIRES);
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.recreation_hall = { built: true, tier: 1, workers: 0 };
  return next;
}

// Upgrade the Recreation Hall (increases max worker cap by 10)
export function upgradeRecHall(state) {
  const rh = state.town?.buildings?.recreation_hall;
  if (!rh?.built) return state;
  const tier = rh.tier ?? 1;
  const idx = tier - 1;
  const cost = idx < REC_HALL_UPGRADE_COSTS.length
    ? REC_HALL_UPGRADE_COSTS[idx]
    : Math.round(18_000 * Math.pow(2, idx - 1));
  const requires = idx < REC_HALL_UPGRADE_REQUIRES.length
    ? REC_HALL_UPGRADE_REQUIRES[idx]
    : { iron_fitting: 8 + (idx - 1) * 4, reinforced_crate: 4 + (idx - 1) * 2 };
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.recreation_hall.tier = tier + 1;
  return next;
}

// Upgrade (or build) the tavern — level 1 = initial build, levels 2-4 = upgrades
export function upgradeTavern(state) {
  const thLevel = getTownHallLevel(state);
  if (thLevel < TOWN_HALL_BUILDING_GATES.tavern) return state;
  const currentLevel = getTavernLevel(state);
  if (currentLevel >= 4) return state;
  const idx = currentLevel; // 0-indexed (0 = build, 1-3 = upgrade)
  const cost = TAVERN_LEVEL_COSTS[idx];
  const ironNeeded = TAVERN_LEVEL_IRON[idx];
  const lumberNeeded = TAVERN_LEVEL_LUMBER[idx];
  if ((state.cash ?? 0) < cost) return state;
  if ((state.worldResources?.iron_ore ?? 0) < ironNeeded) return state;
  if ((state.worldResources?.lumber ?? 0) < lumberNeeded) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  if (ironNeeded > 0) next.worldResources.iron_ore -= ironNeeded;
  if (lumberNeeded > 0) next.worldResources.lumber -= lumberNeeded;
  if (!next.town.buildings) next.town.buildings = {};
  if (!next.town.buildings.tavern) {
    next.town.buildings.tavern = { built: true, level: 1 };
  } else {
    next.town.buildings.tavern.built = true;
    next.town.buildings.tavern.level = currentLevel + 1;
  }
  return next;
}

export function setTavernMode(state, mode) {
  if (!isTownBuildingBuilt(state, "tavern")) return state;
  if (mode !== "jam" && mode !== "fish_pie") return state;
  const next = deepCloneState(state);
  if (!next.town.buildings) next.town.buildings = {};
  if (!next.town.buildings.tavern) next.town.buildings.tavern = { built: true, level: 0 };
  next.town.buildings.tavern.mode = mode;
  return next;
}

export function assignTownBuildingWorker(state, key, delta) {
  if (!isTownBuildingBuilt(state, key)) return state;
  const next = deepCloneState(state);
  if (!next.town.buildings) next.town.buildings = {};
  if (!next.town.buildings[key]) next.town.buildings[key] = { built: true, workers: 0 };
  const current = next.town.buildings[key].workers ?? 0;
  if (delta > 0) {
    if (getFreePeople(next) <= 0) return state;
    // Warehouse has a per-tier worker cap
    if (key === "warehouse") {
      const level = next.town.buildings.warehouse.level ?? 1;
      const maxW = getWarehouseLevelMaxWorkers(level);
      if (current >= maxW) return state;
    }
    next.town.buildings[key].workers = current + 1;
  } else {
    if (current <= 0) return state;
    next.town.buildings[key].workers = current - 1;
    // Warehouse: trim crops to new cap immediately
    if (key === "warehouse") {
      const newCap = getWarehouseCropCap(next);
      if (isFinite(newCap)) {
        for (const crop of ["wheat", "berries", "tomatoes"]) {
          if ((next.crops?.[crop] ?? 0) > newCap) next.crops[crop] = newCap;
        }
      }
    }
  }
  return next;
}

// ─── New building actions ──────────────────────────────────────────────────────

export function buildFoodHall(state) {
  if (isTownBuildingBuilt(state, "food_hall")) return state;
  if ((state.cash ?? 0) < TOWN_FOOD_HALL_COST) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_FOOD_HALL_COST;
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.food_hall = { built: true, tier: 1 };
  next.town.foodMode = FOOD_HALL_FOOD_MODE[1]; // bread mode
  next.town.selectedFoodMode = FOOD_HALL_FOOD_MODE[1];
  return next;
}

export function upgradeFoodHall(state) {
  const tier = state.town?.buildings?.food_hall?.tier ?? 0;
  if (tier === 0) return buildFoodHall(state); // not built yet
  if (tier >= 3) return state; // max
  const cost = tier === 1 ? TOWN_FOOD_HALL_TIER2_COST : TOWN_FOOD_HALL_TIER3_COST;
  const requires = tier === 1 ? TOWN_FOOD_HALL_TIER2_REQUIRES : TOWN_FOOD_HALL_TIER3_REQUIRES;
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.food_hall.tier = tier + 1;
  next.town.foodMode = FOOD_HALL_FOOD_MODE[tier + 1];
  return next;
}


export function setFoodMode(state, mode) {
  const tier = state.town?.buildings?.food_hall?.tier ?? 0;
  if (tier === 0) return state; // Food Hall not built
  // Allowed modes: "wheat" always allowed; other modes require their tier to be unlocked
  const tierForMode = { wheat: 0, bread: 1, jam: 2, sauce: 3 };
  const required = tierForMode[mode] ?? 999;
  if (required > tier) return state; // mode not unlocked yet
  const next = { ...state, town: { ...state.town, selectedFoodMode: mode, foodMode: mode } };
  return next;
}

export function buildWarehouse(state) {
  if (state.town?.buildings?.warehouse?.built) return state;
  if ((state.cash ?? 0) < TOWN_WAREHOUSE_COST) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_WAREHOUSE_COST;
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.warehouse = { built: true, level: 1, workers: 0 };
  return next;
}

export function upgradeWarehouse(state) {
  const w = state.town?.buildings?.warehouse;
  if (!w?.built) return state;
  const level = w.level ?? 1;
  const cost = getWarehouseUpgradeCost(level);
  const requires = getWarehouseUpgradeRequires(level);
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.warehouse.level = level + 1;
  return next;
}

export function buildKitchenHall(state) {
  const thLevel = getTownHallLevel(state);
  if (thLevel < TOWN_HALL_BUILDING_GATES.kitchen_hall) return state;
  if (state.town?.buildings?.kitchen_hall?.built) return state;
  if ((state.cash ?? 0) < TOWN_KITCHEN_HALL_COST) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_KITCHEN_HALL_COST;
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.kitchen_hall = { built: true, level: 1 };
  return next;
}

// Kitchen Hall upgrade cost formula for levels beyond the defined array
export function getKitchenHallUpgradeCost(level) {
  if (level - 1 < KITCHEN_HALL_LEVEL_COSTS.length) return KITCHEN_HALL_LEVEL_COSTS[level - 1];
  // Level 4+: exponential scaling starting from 6000, doubling each time
  return Math.round(6_000 * Math.pow(2, level - 3));
}
export function getKitchenHallUpgradeRequires(level) {
  if (level - 1 < KITCHEN_HALL_LEVEL_REQUIRES.length) return KITCHEN_HALL_LEVEL_REQUIRES[level - 1];
  // Level 4+: iron_fitting cost scales with level
  const fittings = 2 + (level - 3) * 2;
  return { iron_fitting: fittings, iron_ore: 20 + (level - 3) * 10, lumber: 15 + (level - 3) * 8 };
}
export function upgradeKitchenHall(state) {
  const kh = state.town?.buildings?.kitchen_hall;
  if (!kh?.built) return state;
  const level = kh.level ?? 1;
  const cost = getKitchenHallUpgradeCost(level);
  const requires = getKitchenHallUpgradeRequires(level);
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.kitchen_hall.level = level + 1;
  return next;
}

export function buildMarketHall(state) {
  const thLevel = getTownHallLevel(state);
  if (thLevel < TOWN_HALL_BUILDING_GATES.market_hall) return state;
  if (state.town?.buildings?.market_hall?.built) return state;
  if ((state.cash ?? 0) < TOWN_MARKET_HALL_COST) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_MARKET_HALL_COST;
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.market_hall = { built: true, level: 1 };
  return next;
}

export function getMarketHallUpgradeCost(level) {
  if (level - 1 < MARKET_HALL_LEVEL_COSTS.length) return MARKET_HALL_LEVEL_COSTS[level - 1];
  // Level 4+: exponential scaling starting from 8000, doubling each time
  return Math.round(8_000 * Math.pow(2, level - 3));
}
export function getMarketHallUpgradeRequires(level) {
  if (level - 1 < MARKET_HALL_LEVEL_REQUIRES.length) return MARKET_HALL_LEVEL_REQUIRES[level - 1];
  // Level 4+: scaling material costs
  const fittings = 3 + (level - 3) * 2;
  return { iron_fitting: fittings, iron_ore: 25 + (level - 3) * 10, lumber: 20 + (level - 3) * 8 };
}
export function upgradeMarketHall(state) {
  const mh = state.town?.buildings?.market_hall;
  if (!mh?.built) return state;
  const level = mh.level ?? 1;
  const cost = getMarketHallUpgradeCost(level);
  const requires = getMarketHallUpgradeRequires(level);
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.market_hall.level = level + 1;
  return next;
}

// Barn Hall
export function buildBarnHall(state) {
  if (getTownHallLevel(state) < TOWN_HALL_BUILDING_GATES.barn_hall) return state;
  if (state.town?.buildings?.barn_hall?.built) return state;
  if ((state.cash ?? 0) < TOWN_BARN_HALL_COST) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_BARN_HALL_COST;
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.barn_hall = { built: true, level: 1 };
  return next;
}

export function getBarnHallUpgradeCost(level) {
  if (level - 1 < BARN_HALL_LEVEL_COSTS.length) return BARN_HALL_LEVEL_COSTS[level - 1];
  return Math.round(7_000 * Math.pow(2, level - 3));
}
export function getBarnHallUpgradeRequires(level) {
  if (level - 1 < BARN_HALL_LEVEL_REQUIRES.length) return BARN_HALL_LEVEL_REQUIRES[level - 1];
  const fittings = 3 + (level - 3) * 2;
  return { iron_fitting: fittings, iron_ore: 25 + (level - 3) * 10, lumber: 20 + (level - 3) * 8 };
}
export function upgradeBarnHall(state) {
  const bh = state.town?.buildings?.barn_hall;
  if (!bh?.built) return state;
  const level = bh.level ?? 1;
  const cost = getBarnHallUpgradeCost(level);
  const requires = getBarnHallUpgradeRequires(level);
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.barn_hall.level = level + 1;
  return next;
}

// Forge Hall
export function buildForgeHall(state) {
  if (getTownHallLevel(state) < TOWN_HALL_BUILDING_GATES.forge_hall) return state;
  if (state.town?.buildings?.forge_hall?.built) return state;
  if ((state.cash ?? 0) < TOWN_FORGE_HALL_COST) return state;
  const next = deepCloneState(state);
  next.cash -= TOWN_FORGE_HALL_COST;
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.forge_hall = { built: true, level: 1 };
  return next;
}

export function getForgeHallUpgradeCost(level) {
  if (level - 1 < FORGE_HALL_LEVEL_COSTS.length) return FORGE_HALL_LEVEL_COSTS[level - 1];
  return Math.round(15_000 * Math.pow(2, level - 4));
}
export function getForgeHallUpgradeRequires(level) {
  if (level - 1 < FORGE_HALL_LEVEL_REQUIRES.length) return FORGE_HALL_LEVEL_REQUIRES[level - 1];
  const fittings = 6 + (level - 4) * 2;
  return { iron_fitting: fittings, reinforced_crate: 3 + (level - 4), fine_tools: 2 + (level - 4) };
}
export function upgradeForgeHall(state) {
  const fh = state.town?.buildings?.forge_hall;
  if (!fh?.built) return state;
  const level = fh.level ?? 1;
  const cost = getForgeHallUpgradeCost(level);
  const requires = getForgeHallUpgradeRequires(level);
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.forge_hall.level = level + 1;
  return next;
}

export function getMaxForgeWorkers(state) {
  const fh = state.town?.buildings?.forge_hall;
  if (!fh?.built) return 0;
  return (fh.level ?? 1) * 2 - 1;
}

export function getForgeHallRecipeTier(state) {
  const fh = state.town?.buildings?.forge_hall;
  if (!fh?.built) return 0;
  const level = fh.level ?? 1;
  return Math.min(level, 3);
}

export function isArcaneUnlocked(state) {
  const fh = state.town?.buildings?.forge_hall;
  if (!fh?.built) return false;
  return (fh.level ?? 1) >= 4;
}

export function getForgeHallRetainCount(state) {
  const fh = state.town?.buildings?.forge_hall;
  if (!fh?.built) return 0;
  return (fh.level ?? 1) - 1;
}

export function buildGuildHall(state) {
  const thLevel = getTownHallLevel(state);
  if (thLevel < TOWN_HALL_BUILDING_GATES.guild_hall) return state;
  if (state.town?.buildings?.guild_hall?.built) return state;
  const cost = TOWN_GUILD_HALL_COST;
  if ((state.cash ?? 0) < cost) return state;
  const requires = getGuildHallUpgradeRequires(0);
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  if (!next.town.buildings) next.town.buildings = {};
  next.town.buildings.guild_hall = { built: true, level: 1 };
  return next;
}

export function upgradeGuildHall(state) {
  const gh = state.town?.buildings?.guild_hall;
  if (!gh?.built) return state;
  const level = gh.level ?? 1;
  const cost = getGuildHallUpgradeCost(level);
  const requires = getGuildHallUpgradeRequires(level);
  if ((state.cash ?? 0) < cost) return state;
  if (!canAffordUpgradeMaterials(state, requires)) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  consumeUpgradeMaterials(next, requires);
  next.town.buildings.guild_hall.level = level + 1;
  return next;
}

export function getTownGrowthBonusPercent(people) {
  const steps = Math.floor(Math.max(0, people) / TOWN_PEOPLE_PER_GROWTH_BONUS);
  return Math.min(TOWN_MAX_GROWTH_BONUS_PERCENT, steps * TOWN_GROWTH_BONUS_PER_STEP);
}
 
export function getSatisfactionTarget(state) {
  const town = state.town ?? {};
  if (town.starving) return TOWN_SATISFACTION_FLOOR;
  // Target is the ceiling for the ACTIVE food mode, not the food hall's max tier.
  // e.g. switching from bread (100%) back to wheat (80%) should pull sat down to 80.
  const foodMode = town.foodMode ?? "wheat";
  const foodModeIndex = FOOD_HALL_FOOD_MODE.indexOf(foodMode);
  const modeCeiling = foodModeIndex >= 0
    ? (FOOD_HALL_SAT_CEILING[foodModeIndex] ?? FOOD_HALL_SAT_CEILING[0])
    : FOOD_HALL_SAT_CEILING[0];
  // The hard ceiling (food hall tier) still caps how high sat can physically go.
  const hardCeiling = getSatisfactionCeiling(state);
  // Rabbit pet bonus (+5 sat while mood >= 50)
  const rabbitBonus = (state.pets?.rabbit && (state.pets.rabbit.mood ?? 0) >= 50) ? 5 : 0;
  // Rec Hall and trade town bonuses raise the ceiling AND the target — sat drifts toward the new ceiling
  const recBonus = getRecHallSatBonus(state);
  const tradeTownBonus = getTradeTownSatBonus(state);
  return Math.min(hardCeiling, Math.round(modeCeiling + rabbitBonus + recBonus + tradeTownBonus));
}
 
export function getTownSatisfactionMultiplier(state) {
  return (state.town?.satisfaction ?? TOWN_SATISFACTION_DEFAULT) / 100;
}
 
export function getTownFoodReserve(state) {
  const foodMode = state.town?.foodMode ?? "wheat";
  const people = Math.floor(state.town?.people ?? 0);
  const totalWorkers = getTotalWorkersHired(state);
  const idlePeople = Math.max(0, people - totalWorkers);

  const peopleCost = (idlePeople * PERSON_IDLE_FOOD_COST) + (totalWorkers * PERSON_WORKING_FOOD_COST);
  const animalCost = Object.entries(state.animals ?? {}).reduce((sum, [id, arr]) => {
    return sum + arr.length * (ANIMAL_FOOD_COSTS[id] ?? 0);
  }, 0);
  const petCost = Object.keys(state.pets ?? {}).reduce((sum, petId) => sum + PET_FOOD_COST, 0);
  const totalFoodUnits = peopleCost + animalCost + petCost;

  if (foodMode === "wheat") return totalFoodUnits;
  return Math.max(1, Math.ceil(totalFoodUnits / BREAD_FOOD_UNITS));
}
 
export function getSmartSellAmount(state, itemType) {
  const bakeryOn = state.town?.bakeryOn === true && (state.town?.bakeryLevel ?? 0) >= 1;
  const foodItem = bakeryOn ? "bread" : "wheat";
  if (itemType !== foodItem) {
    const isAnimal = itemType in (state.animalGoods ?? {});
    const isFish = !isAnimal && state.fishing?.fish && itemType in state.fishing.fish;
    const isCrop = !isAnimal && !isFish && itemType in (state.crops ?? {});
    return isAnimal
      ? Math.floor(state.animalGoods[itemType] ?? 0)
      : isFish
      ? Math.floor(state.fishing.fish[itemType] ?? 0)
      : isCrop
      ? Math.floor(state.crops[itemType] ?? 0)
      : itemType in (state.forgeGoods ?? {})
      ? Math.floor(state.forgeGoods[itemType] ?? 0)
      : itemType in (state.worldResources ?? {})
      ? Math.floor(state.worldResources[itemType] ?? 0)
      : Math.floor(state.artisan[itemType] ?? 0);
  }
  const reserve = getTownFoodReserve(state);
  const have = itemType === "wheat"
    ? Math.floor(state.crops?.wheat ?? 0)
    : Math.floor(state.artisan?.bread ?? 0);
  return Math.max(0, have - reserve);
}
 
export function getTownFoodType(state) {
  return (state.town?.bakeryLevel ?? 0) === 0 ? "wheat" : "bread";
}
 
export function getEffectivePulseSeconds(state) {
  // Pulse length is now fixed — building toggles no longer add extra seconds.
  // Kept as a function so existing callers don't break.
  return TOWN_PULSE_SECONDS;
}
 
export function getBuildingEffectivePulseCost(state, buildingKey) {
  const totalWorkers = getTotalWorkersHired(state);
  const base = Math.max(1, Math.ceil(totalWorkers / BUILDING_WORKERS_DIVISOR));
  const upgradeLevel = state.town?.[buildingKey + "UpgradeLevel"] ?? 0;
  return Math.max(1, base - upgradeLevel);
}
 
export function getBuildingUpgradeLevel(state, buildingKey) {
  return state.town?.[buildingKey + "UpgradeLevel"] ?? 0;
}
 
export function canUpgradeBuilding(state, buildingKey) {
  const thLevel = getTownHallLevel(state);
  const town = state.town ?? {};
  if (buildingKey === "bakery" && (town.bakeryLevel ?? 0) < 1) return false;
  if (buildingKey === "pantry" && !town.jamBuildingOwned) return false;
  if (buildingKey === "cannery" && !town.sauceBuildingOwned) return false;
  const upgradeLevel = getBuildingUpgradeLevel(state, buildingKey);
  if (upgradeLevel >= thLevel) return false;
  if ((getTreasuryBalance(state)) < BUILDING_UPGRADE_COST) return false;
  return true;
}
 
export function upgradeTownBuilding(state, buildingKey) {
  if (!canUpgradeBuilding(state, buildingKey)) return state;
  const next = deepCloneState(state);
  next.town.treasuryBalance = (next.town.treasuryBalance ?? 0) - BUILDING_UPGRADE_COST;
  const key = buildingKey + "UpgradeLevel";
  next.town[key] = (next.town[key] ?? 0) + 1;
  return next;
}
 
// ─── Town purchase actions (all from treasury) ────────────────────────────────
 
export function buildTownHome(state) {
  const cost = getTownHomeCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  if (cost > 0) next.cash -= cost;
  next.town.homes = (next.town.homes ?? 0) + 1;
  next.town.capacity = getTownCapacity(next);
  const newPeople = Math.min(next.town.capacity, (next.town.people ?? 0) + TOWN_HOME_INSTANT_POPULATION);
  next.town.people = newPeople;
  next.town.growthBonusPercent = getTownGrowthBonusPercent(newPeople);
  return next;
}
 
export function buyTownBakery(state) {
  const next = deepCloneState(state);
  if (getTownHallLevel(next) < 1) return state;
  const cost = getTownBakeryCost(next);
  if ((next.town.treasuryBalance ?? 0) < cost) return state;
  next.town.treasuryBalance -= cost;
  next.town.bakeryLevel = (next.town.bakeryLevel ?? 0) + 1;
  return next;
}
 
export function buyJamBuilding(state) {
  const next = deepCloneState(state);
  if (getTownHallLevel(next) < 2) return state;
  if (next.town.jamBuildingOwned) return state;
  if ((next.town.treasuryBalance ?? 0) < TOWN_JAM_BUILDING_COST) return state;
  next.town.treasuryBalance -= TOWN_JAM_BUILDING_COST;
  next.town.jamBuildingOwned = true;
  return next;
}
 
export function buySauceBuilding(state) {
  const next = deepCloneState(state);
  if (getTownHallLevel(next) < 3) return state;
  if (!next.town?.jamBuildingOwned) return state;
  if (next.town.sauceBuildingOwned) return state;
  if ((next.town.treasuryBalance ?? 0) < TOWN_SAUCE_BUILDING_COST) return state;
  next.town.treasuryBalance -= TOWN_SAUCE_BUILDING_COST;
  next.town.sauceBuildingOwned = true;
  return next;
}
 
export function toggleBakery(state) {
  const next = deepCloneState(state);
  if ((next.town?.bakeryLevel ?? 0) < 1) return state;
  if (getTownHallLevel(next) < 1) return state;
  next.town.bakeryOn = !(next.town.bakeryOn ?? false);
  return next;
}
 
export function togglePantry(state) {
  const next = deepCloneState(state);
  if (!next.town?.jamBuildingOwned) return state;
  if (getTownHallLevel(next) < 2) return state;
  next.town.pantryOn = !(next.town.pantryOn ?? false);
  return next;
}
 
export function toggleCannery(state) {
  const next = deepCloneState(state);
  if (!next.town?.sauceBuildingOwned) return state;
  if (getTownHallLevel(next) < 3) return state;
  next.town.canneryOn = !(next.town.canneryOn ?? false);
  return next;
}
 
// ─── Stats tracking helpers ───────────────────────────────────────────────────
 
export const STATS_WINDOW = 60; // seconds rolling window
 
export function initStatsBuffer() {
  return { ticks: [], sum: 0 };
}
 
export function pushStat(buffer, value, now) {
  if (!buffer) buffer = initStatsBuffer();
  const ticks = buffer.ticks ?? [];
  const cutoff = now - STATS_WINDOW;
  const fresh = ticks.filter((t) => t.ts >= cutoff);
  let sum = fresh.reduce((s, t) => s + t.v, 0);
  if (value > 0) {
    fresh.push({ ts: now, v: value });
    sum += value;
  }
  return { ticks: fresh, sum };
}
 
export function getStatPerMinute(buffer) {
  if (!buffer) return 0;
  return Math.round(buffer.sum ?? 0);
}
