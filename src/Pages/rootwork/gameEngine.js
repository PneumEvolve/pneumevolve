// src/Pages/rootwork/gameEngine.js
 
import {
  CROPS, GEAR, GEAR_ORDER,
  PLOT_BASE_COST, PLOT_COST_MULTIPLIER, MAX_PLOTS,
  WORKER_HIRE_BASE_COST, WORKER_HIRE_MULTIPLIER,
  SPECIALIZATIONS, SEASON_FARMS, FIRST_EXTRA_FARM_SEASON,
  AUTOMATION_THRESHOLD, MIN_PLOTS_FOR_AUTOMATION, PRESTIGE_MIN_PLOTS,
  MAX_OFFLINE_SECONDS, PROCESSING_RECIPES, TEND_SECONDS,
  SPECIALIZE_COST, PLOT_UPGRADE_GROW_MULTIPLIER, CROP_ARTISAN,
  FEAST_TIERS, FEAST_MAX_BONUS, MARKET_SELL_RATES,
  MARKET_WORKER_HIRE_COST, MARKET_WORKER_HIRE_MULTIPLIER,
  MARKET_WORKER_GEAR, MARKET_WORKER_GEAR_ORDER,
  KITCHEN_WORKER_HIRE_COST, KITCHEN_WORKER_HIRE_MULTIPLIER,
  KITCHEN_WORKER_UPGRADES, KITCHEN_WORKER_UPGRADE_ORDER,
  getPrestigeCashThreshold, getFarmUnlockCost, EXTRA_FARM_CROPS,
  FARM_INVESTMENT_PLOT_CAP, FARM_INVESTMENT_YIELD,
  SEASON_BARNS, FIRST_CHOICE_SEASON, PRESTIGE_MIN_BARN_WORKERS,
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
  TOWN_HALL_MAX_LEVEL, TOWN_HALL_LEVEL_COSTS,
  TREASURY_TIERS, BUILDING_WORKERS_DIVISOR, BUILDING_PULSE_EXTRA_SECONDS,
  BUILDING_UPGRADE_COST, BANK_BUILD_COST, BANK_LEVEL_COSTS,
  BANK_TIERS, BANK_MAX_LEVEL, GEAR_CROP_COSTS, POND_COST, NEEDLE_SWEEP_SPEED, REEL_DURATION,
  REEL_DRAIN_RATE, REEL_TAP_AMOUNT, BAIT_TYPES,
  ANIMAL_TYPES, MAX_ANIMALS_PER_TYPE,
  BARN_BUILDINGS, BARN_BUILDING_ORDER, BARN_BUILDING_TIERS, BARN_UPKEEP_DEBT_MOOD_DRAIN,
  ANIMAL_INTERACT_MOOD_BOOST, ANIMAL_INTERACT_COOLDOWN,
  PET_TYPES, PET_INTERACT_MOOD_BOOST, PET_INTERACT_COOLDOWN,
  BAIT_RECIPES, BARN_WORKER_HIRE_BASE_COST, BARN_WORKER_HIRE_MULTIPLIER,
BARN_WORKER_UPGRADES, ANIMAL_STORAGE_UPGRADES,
BARN_WORKER_BASE_INTERVAL, BARN_WORKER_BASE_CAPACITY,
ANIMAL_BASE_STOCK_MAX, ANIMAL_OVERFULL_MOOD_DRAIN, ANIMAL_FOOD_COSTS, PET_FOOD_COST, BREAD_FOOD_UNITS,
PERSON_IDLE_FOOD_COST, PERSON_WORKING_FOOD_COST,
TOWN_CLINIC_COST, TOWN_SCHOOL_COST, TOWN_TAVERN_COST, TOWN_RESTAURANT_COST, TOWN_CLOTHIER_COST,
CLINIC_CAP_PER_MEDIC, CLINIC_SAT_PER_MEDIC,
SCHOOL_GROW_PER_RESEARCHER, SCHOOL_RESEARCH_TIME_FLOOR,
TAVERN_SAT_PER_BARTENDER, TAVERN_GOODS_PER_PULSE_DIVISOR,
RESTAURANT_SAT_PER_CHEF, RESTAURANT_OMELETTE_PER_PULSE_DIVISOR, RESTAURANT_CHEESE_PER_PULSE_DIVISOR,
CLOTHIER_CASH_PER_CLERK, CLOTHIER_GOODS_PER_PULSE_DIVISOR,
FISHING_BODIES, FISHING_BODY_ORDER, FISHING_FISH,
FISHING_CATCH_RATES, FISHING_BAIT_BONUS,
FISHING_WORKER_UPGRADES, FISHING_WORKER_BASE_INTERVAL, ANIMAL_YIELD_UPGRADES, 
  SCHOOL_RESEARCH,
  PRESTIGE_SKILL_TREE,
} from "./gameConstants";
 
let _idCounter = 0;
function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}
 
// ─── Population helpers ───────────────────────────────────────────────────────
 
export function getTotalWorkersHired(state) {
  const fishingWorkers = Object.values(state.fishing?.bodies ?? {})
    .filter((b) => b?.unlocked && b?.worker?.hired === true).length;
  const b = state.town?.townBuildings ?? {};
  const townBuildingWorkers = (b.clinic?.workers ?? 0) + (b.school?.workers ?? 0) +
    (b.tavern?.workers ?? 0) + (b.restaurant?.workers ?? 0) + (b.clothier?.workers ?? 0);
  return (
    (state.workers ?? []).length +
    (state.kitchenWorkers ?? []).length +
    (state.marketWorkers ?? []).length +
    (state.barnWorkers ?? []).length +
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
  return state.town?.townHallLevel ?? 0;
}
 
export function getMaxTreasuryTier(state) {
  return getTownHallLevel(state);
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
  next.cash -= cost;
  next.town.townHallLevel = currentLevel + 1;
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
 
// ─── Grow speed bonus (Treasury) ──────────────────────────────────────────────
 
export function getTreasuryGrowBonus(state) {
  const tier = getActiveTreasuryTier(state);
  const base = tier ? tier.growBonus : 0;
  // fertile_soil: +5% per stack
  const fertileCount = getPrestigeSkillCount(state, "fertile_soil");
  return base + fertileCount * 5;
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

export function getSatisfactionCeiling(state) {
  return hasPrestigeSkill(state, "town_pride") ? 200 : TOWN_SATISFACTION_CEILING;
}
 
// ─── Sell price bonus (Bank) ──────────────────────────────────────────────────
 
export function getBankPriceBonus(state) {
  const tier = getActiveBankTier(state);
  return tier ? tier.priceBonus : 0;
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
    (state.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(state),
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
 
// ─── Town helpers ─────────────────────────────────────────────────────────────
 
export function getTownHomeCost(state) {
  const homes = state.town?.homes ?? 0;
  if (homes === 0) return 0;
  const raw = TOWN_HOME_SECOND_COST * Math.pow(TOWN_HOME_COST_MULTIPLIER, homes - 1);
  return Math.round(raw / 5) * 5;
}
 
export function getTownBakeryCost(state) {
  const bakeryLevel = state.town?.bakeryLevel ?? 0;
  const raw = TOWN_BAKERY_BASE_COST * Math.pow(TOWN_BAKERY_COST_MULTIPLIER, bakeryLevel);
  return Math.round(raw / 50) * 50;
}
 
// ─── Town building helpers ────────────────────────────────────────────────────

export function getTownBuildings(state) {
  return state.town?.townBuildings ?? {};
}

export function isTownBuildingBuilt(state, key) {
  return getTownBuildings(state)[key]?.built === true;
}

export function getTownBuildingWorkers(state, key) {
  return getTownBuildings(state)[key]?.workers ?? 0;
}

// Clinic: each medic adds 0.5 to pop cap (additive on top of homes-based cap)
export function getClinicCapBonus(state) {
  if (!isTownBuildingBuilt(state, "clinic")) return 0;
  return getTownBuildingWorkers(state, "clinic") * CLINIC_CAP_PER_MEDIC;
}

// Clinic: each medic adds 0.3% flat satisfaction bonus
export function getClinicSatBonus(state) {
  if (!isTownBuildingBuilt(state, "clinic")) return 0;
  return getTownBuildingWorkers(state, "clinic") * CLINIC_SAT_PER_MEDIC;
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
  const school = state.town?.townBuildings?.school ?? null;
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
  const school = next.town.townBuildings.school;

  school.unlockedResearch = school.unlockedResearch ?? [];
  if (school.unlockedResearch.includes(researchId)) return state;

  const available = getAvailableSchoolResearch(next).map((r) => r.id);
  if (!available.includes(researchId)) return state;

  school.activeResearchId = researchId;
  school.researchProgress = 0;
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

// Total sat bonus from all town buildings (flat %, added to target)
export function getTownBuildingSatBonus(state) {
  return getClinicSatBonus(state) + getTavernSatBonus(state) + getRestaurantSatBonus(state);
}

// Total workers assigned to town buildings (these count as working for food purposes)
export function getTownBuildingWorkerCount(state) {
  const b = getTownBuildings(state);
  return (b.clinic?.workers ?? 0) + (b.school?.workers ?? 0) +
         (b.tavern?.workers ?? 0) + (b.restaurant?.workers ?? 0) +
         (b.clothier?.workers ?? 0);
}

// Available population for assignment (not already a farm/kitchen/market/barn/fishing/town-building worker)
export function getFreePeople(state) {
  return Math.max(0, Math.floor(state.town?.people ?? 0) - getTotalWorkersHired(state));
}

export function getTownCapacity(state) {
  const homeCap = (state.town?.homes ?? 0) * TOWN_HOME_CAPACITY;
  const clinicBonus = Math.floor(getClinicCapBonus(state));
  return homeCap + clinicBonus;
}

// Build a town building
export function buildTownBuilding(state, key) {
  const costs = {
    clinic: TOWN_CLINIC_COST, school: TOWN_SCHOOL_COST,
    tavern: TOWN_TAVERN_COST, restaurant: TOWN_RESTAURANT_COST,
    clothier: TOWN_CLOTHIER_COST,
  };
  const cost = costs[key];
  if (!cost) return state;
  if (isTownBuildingBuilt(state, key)) return state;
  if ((state.town?.treasuryBalance ?? 0) < cost) return state;
  // Gate checks
  const thLevel = getTownHallLevel(state);
  if (key === "clinic" && thLevel < 2) return state;
  if (key === "school" && !isTownBuildingBuilt(state, "clinic")) return state;
  if (key === "tavern" && !isTownBuildingBuilt(state, "school")) return state;
  if (key === "restaurant" && !(isTownBuildingBuilt(state, "school") && (state.town?.bakeryLevel ?? 0) >= 1)) return state;
  if (key === "clothier" && !(isTownBuildingBuilt(state, "school") && state.barnBuildings?.wool_shed?.built)) return state;

  const next = deepCloneState(state);
  next.town.treasuryBalance -= cost;
  if (!next.town.townBuildings) next.town.townBuildings = {};
  if (key === "school") {
  next.town.townBuildings[key] = {
    built: true,
    workers: 0,
    activeResearchId: null,
    researchProgress: 0,
    researchNeeded: 0,
    unlockedResearch: [],
  };
} else {
  next.town.townBuildings[key] = { built: true, workers: 0 };
}
  return next;
}

export function setTavernMode(state, mode) {
  if (!isTownBuildingBuilt(state, "tavern")) return state;
  if (mode !== "jam" && mode !== "fish_pie") return state;
  const next = deepCloneState(state);
  if (!next.town.townBuildings) next.town.townBuildings = {};
  if (!next.town.townBuildings.tavern) next.town.townBuildings.tavern = { built: true, workers: 0 };
  next.town.townBuildings.tavern.mode = mode;
  return next;
}

export function assignTownBuildingWorker(state, key, delta) {
  if (!isTownBuildingBuilt(state, key)) return state;
  const next = deepCloneState(state);
  if (!next.town.townBuildings) next.town.townBuildings = {};
  if (!next.town.townBuildings[key]) next.town.townBuildings[key] = { built: true, workers: 0 };
  const current = next.town.townBuildings[key].workers ?? 0;
  if (delta > 0) {
    // Need a free person
    if (getFreePeople(next) <= 0) return state;
    next.town.townBuildings[key].workers = current + 1;
  } else {
    if (current <= 0) return state;
    next.town.townBuildings[key].workers = current - 1;
  }
  return next;
}

export function getTownGrowthBonusPercent(people) {
  const steps = Math.floor(Math.max(0, people) / TOWN_PEOPLE_PER_GROWTH_BONUS);
  return Math.min(TOWN_MAX_GROWTH_BONUS_PERCENT, steps * TOWN_GROWTH_BONUS_PER_STEP);
}
 
export function getSatisfactionTarget(state) {
  const town = state.town ?? {};
  if (town.starving) return TOWN_SATISFACTION_FLOOR;
  const bakeryOn = town.bakeryOn === true && (town.bakeryLevel ?? 0) >= 1;
  const pantryOn = town.pantryOn === true && town.jamBuildingOwned === true;
  const canneryOn = town.canneryOn === true && town.sauceBuildingOwned === true;
  let base;
  if (!bakeryOn) base = TOWN_SAT_WHEAT;
  else if (pantryOn && canneryOn) base = TOWN_SAT_ALL_BUILDINGS;
  else if (canneryOn) base = TOWN_SAT_BAKERY_SAUCE;
  else if (pantryOn) base = TOWN_SAT_BAKERY_JAM;
  else base = TOWN_SAT_BAKERY;
  // Add flat bonuses from town buildings (clinic, tavern, restaurant)
  const buildingBonus = getTownBuildingSatBonus(state);
  return Math.min(getSatisfactionCeiling(state), Math.round(base + buildingBonus));
}
 
export function getTownSatisfactionMultiplier(state) {
  return (state.town?.satisfaction ?? TOWN_SATISFACTION_DEFAULT) / 100;
}
 
export function getTownFoodReserve(state) {
  const bakeryOn = state.town?.bakeryOn === true && (state.town?.bakeryLevel ?? 0) >= 1;
  const people = Math.floor(state.town?.people ?? 0);
  const totalWorkers = getTotalWorkersHired(state);
  const idlePeople = Math.max(0, people - totalWorkers);

  const peopleCost = (idlePeople * PERSON_IDLE_FOOD_COST) + (totalWorkers * PERSON_WORKING_FOOD_COST);
  const animalCost = Object.entries(state.animals ?? {}).reduce((sum, [id, arr]) => {
    return sum + arr.length * (ANIMAL_FOOD_COSTS[id] ?? 0);
  }, 0);
  const petCost = Object.keys(state.pets ?? {}).reduce((sum, petId) => sum + PET_FOOD_COST, 0);
  const totalFoodUnits = peopleCost + animalCost + petCost;

  if (bakeryOn) return Math.max(1, Math.ceil(totalFoodUnits / BREAD_FOOD_UNITS));
  return totalFoodUnits;
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
  const town = state.town ?? {};
  let extra = 0;
  if (town.bakeryOn === true && (town.bakeryLevel ?? 0) >= 1) extra += BUILDING_PULSE_EXTRA_SECONDS;
  if (town.pantryOn === true && town.jamBuildingOwned === true) extra += BUILDING_PULSE_EXTRA_SECONDS;
  if (town.canneryOn === true && town.sauceBuildingOwned === true) extra += BUILDING_PULSE_EXTRA_SECONDS;
  return TOWN_PULSE_SECONDS + extra;
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
  const next = deepCloneState(state);
  const cost = getTownHomeCost(next);
  if ((next.town.treasuryBalance ?? 0) < cost) return state;
  if (cost > 0) next.town.treasuryBalance -= cost;
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
 
const STATS_WINDOW = 60; // seconds rolling window
 
function initStatsBuffer() {
  return { ticks: [], sum: 0 };
}
 
function pushStat(buffer, value, now) {
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
 
// ─── Market worker helpers ────────────────────────────────────────────────────
 
export function getSellRate(itemType, prestigeBonuses = [], bankPriceBonus = 0, state = null) {
  const base = MARKET_SELL_RATES[itemType] ?? 0;
  // Legacy array support (old saves / callers that don't pass state)
  const legacySavvyCount = (prestigeBonuses ?? []).filter((b) => b === "market_savvy").length;
  // New skill tree
  const sharpEyeCount = state ? getPrestigeSkillCount(state, "sharp_eye") : 0;
  const hasSavvy = state ? hasPrestigeSkill(state, "market_savvy") : legacySavvyCount > 0;
  const savvyMult = hasSavvy ? 1.25 : 1;
  const sharpEyeMult = 1 + sharpEyeCount * 0.10;
  let rate = Math.round(base * savvyMult * sharpEyeMult * 100) / 100;
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
      if (order.itemType in (next.crops ?? {})) next.crops[order.itemType] = (next.crops[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.artisan ?? {})) next.artisan[order.itemType] = (next.artisan[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.animalGoods ?? {})) next.animalGoods[order.itemType] = (next.animalGoods[order.itemType] ?? 0) + order.quantity;
      else if (next.fishing?.fish && order.itemType in next.fishing.fish) next.fishing.fish[order.itemType] = (next.fishing.fish[order.itemType] ?? 0) + order.quantity;
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
 
export function getEffectiveKitchenSeconds(worker, baseSeconds, state = null) {
  const workerMult = getKitchenWorkerSpeedMultiplier(worker);
  const schoolMult = state ? getSchoolResearchMultiplier(state) : 1;
  // swift_craft: -25% per stack
  const swiftCount = state ? getPrestigeSkillCount(state, "swift_craft") : 0;
  const swiftMult = Math.pow(0.75, swiftCount);
  return Math.max(5, Math.floor(baseSeconds * workerMult * schoolMult * swiftMult));
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
  // School gate: batch_5 and batch_10 require the school to be built
  if (upgradeId === "batch_5" && !hasSchoolResearch(state, "kitchen_batch_5")) return false;
  if (upgradeId === "batch_10" && !hasSchoolResearch(state, "kitchen_batch_10")) return false;
  return true;
}
 
export function getKitchenWorkerBatchSize(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("batch_10")) return 10;
  if (upgrades.includes("batch_5")) return 5;
  if (upgrades.includes("batch_2")) return 2;
  return 1;
}
 
function _startKitchenWorkerRecipe(worker, recipeId, crops, animalGoods, fish, bait, state = null) {
  const recipe = PROCESSING_RECIPES[recipeId] ?? BAIT_RECIPES[recipeId];
  if (!recipe?.inputCrop) return false;
  const batch = getKitchenWorkerBatchSize(worker);
  const efficient = state ? hasPrestigeSkill(state, "efficient_process") : false;
  const inputMult = efficient ? 0.5 : 1;
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
  worker.totalSeconds = getEffectiveKitchenSeconds(worker, recipe.seconds, state);
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
      const inputMult = efficient ? 0.5 : 1;
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
 
function makeFreshTown() {
  return {
    unlocked: true,
    homes: 2,
    bakeryLevel: 0,
    bakeryOn: false,
    pantryOn: false,
    canneryOn: false,
    jamBuildingOwned: false,
    sauceBuildingOwned: false,
    bankBuilt: false,
    bankLevel: 0,
    bankActiveTier: 0,
    townHallLevel: 0,
    treasuryBalance: 0,
    treasuryActiveTier: 0,
    bakeryUpgradeLevel: 0,
    pantryUpgradeLevel: 0,
    canneryUpgradeLevel: 0,
    people: TOWN_STARTING_PEOPLE,
    capacity: TOWN_HOME_CAPACITY,
    satisfaction: TOWN_SATISFACTION_DEFAULT,
    satisfactionTarget: TOWN_SAT_WHEAT,
    growthBonusPercent: 0,
    breadNeeded: 0,
    rawBreadNeeded: 0,
    rawFoodNeeded: 0,
    jamNeeded: 0,
    sauceNeeded: 0,
    foodType: "wheat",
    pulseSeconds: TOWN_PULSE_SECONDS,
    starving: false,
    townBuildings: {},
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
    pets: {},
    animalGoods: { egg: 0, milk: 0, wool: 0, omelette: 0, cheese: 0, knitted_goods: 0, fish_pie: 0, smoked_fish: 0, fish_meal: 0 },
    bait: { wheat_bait: 0, berry_bait: 0, tomato_bait: 0 },
    fishMealStacks: [],
    barnWorkers: [],
    barnBuildings: {
      chicken_coop: { built: false, tier: 0 },
      dairy:        { built: false, tier: 0 },
      wool_shed:    { built: false, tier: 0 },
    },
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
  const feast = state.feastBonusPercent ?? 0;
  const townBonus = (state.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(state);
  const treasuryBonus = getTreasuryGrowBonus(state);
  const fishMeal = getFishMealGrowBonus(state);
  const totalBonus = feast + townBonus + treasuryBonus + fishMeal;
  if (totalBonus <= 0) return baseSeconds;
  return Math.max(10, Math.floor(baseSeconds / (1 + totalBonus / 100)));
}
// ─── Barn worker helpers ──────────────────────────────────────────────────────

export function getBarnWorkerHireCost(state) {
  const count = (state.barnWorkers ?? []).length;
  const raw = BARN_WORKER_HIRE_BASE_COST * Math.pow(BARN_WORKER_HIRE_MULTIPLIER, count);
  return Math.round(raw / 5) * 5;
}

export function getBarnWorkerInterval(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("speed_2")) return 20;
  if (upgrades.includes("speed_1")) return 25;
  return BARN_WORKER_BASE_INTERVAL; // 30
}

export function getBarnWorkerCapacity(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("capacity_2")) return 3;
  if (upgrades.includes("capacity_1")) return 2;
  return BARN_WORKER_BASE_CAPACITY;
}

export function getBarnWorkerCareInterval(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("care_2")) return 60;
  if (upgrades.includes("care_1")) return 90;
  return null;
}

export function getBarnWorkerCareMood(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("care_2")) return 35;
  if (upgrades.includes("care_1")) return 20;
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
  const tier = getBarnBuildingTierData(state, buildingId);
  const base = tier ? tier.animalSlots : 0;
  if (base === 0) return 0;
  return base + (hasPrestigeSkill(state, "breeding_program") ? 2 : 0);
}
 
export function getBarnBuildingWorkerSlots(state, buildingId) {
  const tier = getBarnBuildingTierData(state, buildingId);
  return tier ? tier.workerSlots : 0;
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
  return next;
}
 
export function canUpgradeBarnBuilding(state, buildingId) {
  const b = getBarnBuilding(state, buildingId);
  if (!b.built) return false;
  if (b.tier >= BARN_BUILDING_TIERS.length) return false;
  const nextTier = BARN_BUILDING_TIERS[b.tier]; // tier is 1-indexed, array is 0-indexed
  if (!nextTier) return false;
  if ((state.cash ?? 0) < nextTier.upgradeCost) return false;
  return true;
}
 
export function upgradeBarnBuilding(state, buildingId) {
  if (!canUpgradeBarnBuilding(state, buildingId)) return state;
  const next = deepCloneState(state);
  const b = next.barnBuildings[buildingId];
  const nextTier = BARN_BUILDING_TIERS[b.tier];
  next.cash -= nextTier.upgradeCost;
  b.tier += 1;
  return next;
}
 
export function getTotalBarnUpkeepPerSec(state) {
  let total = 0;
  for (const [buildingId, def] of Object.entries(BARN_BUILDINGS)) {
    const b = getBarnBuilding(state, buildingId);
    if (!b.built) continue;
    const count = (state.animals?.[def.animalType] ?? []).length;
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
  if (plot?.upgraded) time = Math.floor(time * PLOT_UPGRADE_GROW_MULTIPLIER);
  if (feastBonusPercent > 0) time = Math.floor(time / (1 + feastBonusPercent / 100));
  if (townGrowthBonusPercent > 0) time = Math.floor(time / (1 + townGrowthBonusPercent / 100));
  if (treasuryGrowBonus > 0) time = Math.floor(time / (1 + treasuryGrowBonus / 100));
  if (fishMealBonus > 0) time = Math.floor(time / (1 + fishMealBonus / 100));
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
 
// ─── Offline progress ─────────────────────────────────────────────────────────
 
export function calculateOfflineProgress(state, nowMs) {
  const lastSaved = state.lastSavedTime ?? nowMs;
  const rawSeconds = Math.floor((nowMs - lastSaved) / 1000);
  if (rawSeconds < 0 || rawSeconds > 7 * 24 * 60 * 60) {
    return { state: { ...state, lastSavedTime: nowMs }, offlineSeconds: 0 };
  }
  const seconds = Math.min(rawSeconds, MAX_OFFLINE_SECONDS);
  if (seconds <= 0) return { state, offlineSeconds: 0 };
  let next = deepCloneState(state);
  for (let i = 0; i < seconds; i++) next = tick(next);
  next.lastSavedTime = nowMs;
  return { state: next, offlineSeconds: seconds };
}
 
// ─── Tick ─────────────────────────────────────────────────────────────────────
 
export function tick(state) {
  let next = deepCloneState(state);
  next.pendingDeathEvents = []; // clear each tick; fresh events added below
  const feast = next.feastBonusPercent ?? 0;
  const townBonus = (next.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(next);
  const treasuryGrowBonus = getTreasuryGrowBonus(next);
  const fishMealBonus = getFishMealGrowBonus(next);
 
  // ── Fish Meal tick — decay active stacks ──────────────────────────────────
  if (next.fishMealStacks && next.fishMealStacks.length > 0) {
    next.fishMealStacks = next.fishMealStacks
      .map((s) => ({ ...s, secondsLeft: s.secondsLeft - 1 }))
      .filter((s) => s.secondsLeft > 0);
  }
  const satMultiplier = getTownSatisfactionMultiplier(next);
  const bankPriceBonus = getBankPriceBonus(next);
  const now = next.totalPlayTime ?? 0;
 
  if (!next.stats) next.stats = { farmCrops: {}, kitchenGoods: {}, marketCash: null };
 
  // ── Treasury drain ─────────────────────────────────────────────────────────────
const activeTier = getActiveTreasuryTier(next);
if (activeTier) {
  const treasuryCap = next.town.treasuryCap ?? 0; // 0 = no cap
  const atCap = treasuryCap > 0 && (next.town.treasuryBalance ?? 0) >= treasuryCap;
  if ((next.cash ?? 0) < activeTier.drainRate || atCap) {
    next.town.treasuryActiveTier = 0;
  } else {
    next.cash = (next.cash ?? 0) - activeTier.drainRate;
    next.town.treasuryBalance = (next.town.treasuryBalance ?? 0) + activeTier.drainRate;
  }
}
 
  // ── Bank drain ─────────────────────────────────────────────────────────────
  const activeBankTier = getActiveBankTier(next);
  if (activeBankTier) {
    const drain = Math.min(activeBankTier.drainRate, next.town.treasuryBalance ?? 0);
    if (drain > 0) next.town.treasuryBalance -= drain;
    // Bank drain is a running cost — treasury decreases but doesn't give it back
    // This is the "infinite money sink" — bank consumes treasury to give price bonus
  }
 
// ── School research ────────────────────────────────────────────────────────
  if (isTownBuildingBuilt(next, "school")) {
    const school = next.town?.townBuildings?.school;
    const researchers = school?.workers ?? 0;

    if (school) {
      school.unlockedResearch = school.unlockedResearch ?? [];

      if (school.activeResearchId) {
        const activeResearch = SCHOOL_RESEARCH[school.activeResearchId];

        if (!activeResearch) {
          school.activeResearchId = null;
          school.researchProgress = 0;
          school.researchNeeded = 0;
        } else {
          const needed = Math.max(
            1,
            Math.floor(activeResearch.seconds * getSchoolResearchMultiplier(next))
          );

          school.researchNeeded = needed;

          if (researchers > 0) {
            school.researchProgress = (school.researchProgress ?? 0) + researchers;
          }

          if ((school.researchProgress ?? 0) >= needed) {
            if (!school.unlockedResearch.includes(activeResearch.id)) {
              school.unlockedResearch.push(activeResearch.id);
            }
            school.activeResearchId = null;
            school.researchProgress = 0;
            school.researchNeeded = 0;
          }
        }
      }
    }
  }

  // ── Farms ──────────────────────────────────────────────────────────────────
  for (const farm of next.farms) {
    const farmWorkers = next.workers.filter((w) => w.farmId === farm.id);
    const bonusYield = getFarmBonusYield(next, farm.id);
 
    for (const plot of farm.plots) {
      if (plot.state === "planted") {
        const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop, plot, feast, townBonus, treasuryGrowBonus, fishMealBonus);
        plot.growthTick += 1;
        if (plot.growthTick >= growTime) plot.state = "ready";
      }
    }
 
    for (const worker of farmWorkers) {
      const workerRef = next.workers.find((w) => w.id === worker.id);
      if (!workerRef) continue;
      workerRef.cycleProgress += satMultiplier;
      const cycleSeconds = getEffectiveCycleSeconds(workerRef);
 
      if (workerRef.cycleProgress >= cycleSeconds) {
        workerRef.cycleProgress = 0;
        const resting = isSprinterResting(workerRef);
        workerRef.cycleCount = (workerRef.cycleCount ?? 0) + 1;
 
        if (!resting) {
          const crop = CROPS[farm.crop];
          const plotsPerCycle = getEffectivePlotsPerCycle(workerRef);
          let harvested = 0;
          let cropsGained = 0;
 
          for (const plot of farm.plots) {
            if (harvested >= plotsPerCycle) break;
            if (plot.state === "ready") {
              const { crops, newPool } = applyYieldBonuses(crop.workerYield, next.prestigeBonuses, next.yieldPool ?? 0, bonusYield, next);
              next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + crops;
              next.yieldPool = newPool;
              cropsGained += crops;
              plot.state = "empty";
              plot.growthTick = 0;
              harvested++;
            }
          }
 
          // Stats: track crops per farm
          if (cropsGained > 0) {
            next.stats.farmCrops[farm.id] = pushStat(next.stats.farmCrops[farm.id], cropsGained, now);
          }
 
          let replanted = 0;
          for (const plot of farm.plots) {
            if (replanted >= plotsPerCycle) break;
            if (plot.state === "empty") {
              plot.state = "planted";
              plot.growthTick = 0;
              replanted++;
            }
          }
        }
      }
    }
  }
 
  // ── Kitchen workers ────────────────────────────────────────────────────────
  for (const worker of next.kitchenWorkers ?? []) {
    if (!worker.busy || !worker.recipeId) continue;
    worker.elapsedSeconds = (worker.elapsedSeconds ?? 0) + satMultiplier;
    if (worker.elapsedSeconds >= worker.totalSeconds) {
      const recipe = PROCESSING_RECIPES[worker.recipeId] ?? BAIT_RECIPES[worker.recipeId];
      const batch = worker.batchSize ?? 1;
      const produced = recipe.outputAmount * batch;
      const artisanGoods = ["bread", "jam", "sauce"];
      if (recipe.isBait) {
        if (!next.bait) next.bait = {};
        next.bait[recipe.outputGood] = (next.bait[recipe.outputGood] ?? 0) + produced;
      } else if (artisanGoods.includes(recipe.outputGood)) {
        next.artisan[recipe.outputGood] = (next.artisan[recipe.outputGood] ?? 0) + produced;
      } else {
        if (!next.animalGoods) next.animalGoods = {};
        next.animalGoods[recipe.outputGood] = (next.animalGoods[recipe.outputGood] ?? 0) + produced;
        
      }
      // Stats
      next.stats.kitchenGoods[recipe.outputGood] = pushStat(next.stats.kitchenGoods[recipe.outputGood], produced, now);
      worker.elapsedSeconds = 0;
      worker.busy = false;
      worker.batchSize = 1;
      if ((worker.upgrades ?? []).includes("auto_restart") && (worker.autoRestartEnabled ?? true)) {
        _startKitchenWorkerRecipe(worker, worker.recipeId, next.crops, next.animalGoods, next.fishing?.fish, next.bait, next);
      }
    }
  }
 
  // ── Market workers ─────────────────────────────────────────────────────────
  for (const worker of next.marketWorkers ?? []) {
    if (worker.hasStandingOrder && worker.standingOrder && (worker.queue ?? []).length === 0) {
  const itemType = worker.standingOrder;
  const ips = getMarketWorkerItemsPerSecond(worker);
  const isCrop = itemType in (next.crops ?? {});
  const isArtisan = itemType in (next.artisan ?? {});
  const isAnimal = itemType in (next.animalGoods ?? {});
  const isFish = next.fishing?.fish && itemType in next.fishing.fish;
  const available = isCrop ? (next.crops[itemType] ?? 0)
    : isArtisan ? (next.artisan[itemType] ?? 0)
    : isAnimal ? (next.animalGoods[itemType] ?? 0)
    : isFish ? (next.fishing.fish[itemType] ?? 0) : 0;
  const toPull = Math.min(ips, available);
  if (toPull > 0) {
    if (isCrop) next.crops[itemType] -= toPull;
    else if (isArtisan) next.artisan[itemType] -= toPull;
    else if (isAnimal) next.animalGoods[itemType] -= toPull;
    else if (isFish) next.fishing.fish[itemType] -= toPull;
    worker.queue = [{ id: genId("sale"), itemType, quantity: toPull }];
  }
}
 
    const itemsPerSecond = getMarketWorkerItemsPerSecond(worker);
    // Accumulate fractional progress — low satisfaction slows selling but never freezes it
    worker.sellProgress = (worker.sellProgress ?? 0) + itemsPerSecond * satMultiplier;
    let toSellThisTick = Math.floor(worker.sellProgress);
    worker.sellProgress -= toSellThisTick;
    let cashEarned = 0;
    while (toSellThisTick > 0 && (worker.queue ?? []).length > 0) {
      const order = worker.queue[0];
      const toSell = Math.min(toSellThisTick, order.quantity);
      const rate = getSellRate(order.itemType, next.prestigeBonuses, bankPriceBonus, next);
      order.quantity = Math.floor(order.quantity - toSell);
      const earned = toSell * rate;
      next.cash = (next.cash ?? 0) + earned;
      next.lifetimeCash = (next.lifetimeCash ?? 0) + earned;
      cashEarned += earned;
      toSellThisTick -= toSell;
      if (order.quantity <= 0) worker.queue.shift();
    }
    if (cashEarned > 0) {
      next.stats.marketCash = pushStat(next.stats.marketCash, cashEarned, now);
    }
  }
 
  // ── Fishing workers ───────────────────────────────────────────────────────
  if (next.fishing) {
    for (const bodyId of FISHING_BODY_ORDER) {
      const body = next.fishing.bodies?.[bodyId];
      if (!body?.unlocked || !body.worker?.hired) continue;
      const worker = body.worker;
      const interval = getFishingWorkerInterval(worker, next);
      const haul = getFishingWorkerHaul(worker);
      const gearTier = getFishingWorkerGearTier(worker);
      const baitId = worker.assignedBait;
      const hasBait = baitId && (next.bait?.[baitId] ?? 0) > 0;
      const effectiveBait = hasBait ? baitId : null;
      // deep_waters: no minnows — reroll until bass or better
      const noMinnows = hasPrestigeSkill(next, "deep_waters");
      // selective_haul: per-worker allowed fish toggle
      const selectiveHaul = hasPrestigeSkill(next, "selective_haul");
      const allowedFish = selectiveHaul ? (worker.allowedFish ?? null) : null;

      worker.timer = (worker.timer ?? 0) + 1;
      if (worker.timer >= interval) {
        worker.timer = 0;
        const baitBonus = effectiveBait ? FISHING_BAIT_BONUS[effectiveBait].haulBonus : 0;
        const totalHaul = haul + baitBonus;
        if (!next.fishing.fish) next.fishing.fish = {};
        for (let i = 0; i < totalHaul; i++) {
          let fishId = rollFishForBody(bodyId, gearTier, effectiveBait);
          // deep_waters: reroll minnows once to get bass or better
          if (noMinnows && fishId === "minnow") {
            fishId = rollFishForBody(bodyId, gearTier === "basic" ? "good" : gearTier, effectiveBait);
            if (fishId === "minnow") fishId = "bass";
          }
          // selective_haul: skip if not in allowed list
          if (allowedFish && !allowedFish.includes(fishId)) continue;
          next.fishing.fish[fishId] = (next.fishing.fish[fishId] ?? 0) + 1;
        }
        // Consume bait
        if (hasBait) next.bait[baitId] -= 1;
      }
    }
  }
 
  // ── Barn upkeep drain ─────────────────────────────────────────────────────
  for (const [buildingId, def] of Object.entries(BARN_BUILDINGS)) {
    const b = getBarnBuilding(next, buildingId);
    if (!b.built) continue;
    const animals = next.animals?.[def.animalType] ?? [];
    if (animals.length === 0) continue;
    const upkeepThisTick = animals.length * def.upkeepPerAnimalPerSec;
    if ((next.cash ?? 0) >= upkeepThisTick) {
      next.cash -= upkeepThisTick;
    } else {
      // Can't afford — drain mood heavily on all animals in this building
      for (const animal of animals) {
        animal.mood = Math.max(0, (animal.mood ?? 100) - BARN_UPKEEP_DEBT_MOOD_DRAIN);
      }
    }
  }
 
  // ── Animals ──────────────────────────────────────────────────────────────
  const dogOwned = next.pets?.dog !== undefined;
  const dogMoodOk = dogOwned && (next.pets.dog.mood ?? 0) >= 50;
  const moodDecayMultiplier = dogMoodOk ? 0.70 : 1.0;

  for (const animalId of Object.keys(next.animals ?? {})) {
    const type = ANIMAL_TYPES[animalId];
    if (!type) continue;
    const toRemove = [];

    for (const animal of next.animals[animalId]) {
      const stockMax = getAnimalStockMax(animal);
      const stock = animal.stock ?? 0;
      const isFull = stock >= stockMax;
      const effectiveCycle = getAnimalEffectiveCycleSeconds(type.cycleSeconds, next);

      // Production — pauses when full
      if (!isFull) {
        animal.readyTick = (animal.readyTick ?? 0) + 1;
        if (animal.readyTick >= effectiveCycle) {
  const mood = animal.mood ?? 100;
  const bonusYield = getAnimalBonusYield(animal);
  let produced = 1 + bonusYield;
  if (mood >= 80) {
    const bonusChance = (mood - 80) / 20;
    produced = 2 + bonusYield + (Math.random() < bonusChance ? 1 : 0);
  } else {
    const bonusChance = mood / 80;
    produced = 1 + bonusYield + (Math.random() < bonusChance ? 1 : 0);
  }
  // sturdy_stock: +20% per stack
  const sturdyCount = getPrestigeSkillCount(next, "sturdy_stock");
  if (sturdyCount > 0) produced = Math.ceil(produced * Math.pow(1.2, sturdyCount));
  animal.stock = Math.min(stockMax, stock + produced);
  animal.readyTick = 0;
}
      }

      animal.ready = (animal.stock ?? 0) > 0;

      // Mood decay — 5x when full
      const decayPerSecond = (type.moodDecayPerMinute / 60) * moodDecayMultiplier * (isFull ? ANIMAL_OVERFULL_MOOD_DRAIN : 1);
      animal.mood = Math.max(0, (animal.mood ?? 100) - decayPerSecond);

      // Track ticks at zero mood — die after 180 seconds (3 min) at 0%
      if (animal.mood <= 0) {
        animal.zeroMoodTicks = (animal.zeroMoodTicks ?? 0) + 1;
      } else {
        animal.zeroMoodTicks = 0;
      }

      // Death conditions: 3 missed food pulses OR 180s at 0% mood
      if ((animal.missedFoodPulses ?? 0) >= 3 || (animal.zeroMoodTicks ?? 0) >= 180) {
        toRemove.push(animal.id);
        if (!next.pendingDeathEvents) next.pendingDeathEvents = [];
        next.pendingDeathEvents.push({ animalId, animalType: type.name, emoji: type.emoji });
      }

      if ((animal.interactCooldown ?? 0) > 0) {
        animal.interactCooldown = Math.max(0, animal.interactCooldown - 1);
      }
    }

    // Remove dead animals
    if (toRemove.length > 0) {
      next.animals[animalId] = next.animals[animalId].filter((a) => !toRemove.includes(a.id));
    }
  }

  // ── Barn workers ──────────────────────────────────────────────────────────
  for (const worker of next.barnWorkers ?? []) {
    const animalId = worker.animalType;
    const type = ANIMAL_TYPES[animalId];
    if (!type) continue;
    const animals = next.animals?.[animalId] ?? [];
    if (animals.length === 0) continue;

    const interval = getBarnWorkerInterval(worker);
    const capacity = getBarnWorkerCapacity(worker);
    const careInterval = getBarnWorkerCareInterval(worker);
    const careMood = getBarnWorkerCareMood(worker);

    worker.collectTimer = (worker.collectTimer ?? 0) + 1;
    if (worker.collectTimer >= interval) {
      worker.collectTimer = 0;
      let remaining = capacity;
      for (const animal of animals) {
        if (remaining <= 0) break;
        const stock = animal.stock ?? 0;
        if (stock <= 0) continue;
        const toCollect = Math.min(remaining, stock);
        animal.stock = stock - toCollect;
        animal.ready = animal.stock > 0;
        if (!next.animalGoods) next.animalGoods = {};
        next.animalGoods[type.produces] = (next.animalGoods[type.produces] ?? 0) + toCollect;
        remaining -= toCollect;
      }
    }

    if (careInterval) {
  worker.careTimer = (worker.careTimer ?? 0) + 1;
  if (worker.careTimer >= careInterval) {
    worker.careTimer = 0;
    // Find the single lowest-mood animal
    const neediest = animals.reduce((lowest, animal) => {
      return (animal.mood ?? 100) < (lowest?.mood ?? 100) ? animal : lowest;
    }, null);
    if (neediest) {
      neediest.mood = Math.min(100, (neediest.mood ?? 100) + careMood);
    }
  }
}
  }
 
  // ── Pets ─────────────────────────────────────────────────────────────────
  for (const petId of Object.keys(next.pets ?? {})) {
    const type = PET_TYPES[petId];
    if (!type) continue;
    const pet = next.pets[petId];
    pet.mood = Math.max(0, (pet.mood ?? 100) - (type.moodDecayPerMinute / 60));
    if ((pet.interactCooldown ?? 0) > 0) {
      pet.interactCooldown = Math.max(0, pet.interactCooldown - 1);
    }
  }
 
  next = updateTown(next, 1);
  next.totalPlayTime = (next.totalPlayTime ?? 0) + 1;
  return next;
}
 
// ─── Town pulse ───────────────────────────────────────────────────────────────
 
function fireLastHiredWorker(state) {
  const candidates = [
  ...(state.workers ?? []).map((w) => ({ id: w.id, type: "farm", hiredAt: w.hiredAt ?? 0 })),
  ...(state.kitchenWorkers ?? []).map((w) => ({ id: w.id, type: "kitchen", hiredAt: w.hiredAt ?? 0 })),
  ...(state.marketWorkers ?? []).map((w) => ({ id: w.id, type: "market", hiredAt: w.hiredAt ?? 0 })),
  ...(state.barnWorkers ?? []).map((w) => ({ id: w.id, type: "barn", hiredAt: w.hiredAt ?? 0 })),
  ...Object.entries(state.fishing?.bodies ?? {})
    .filter(([, b]) => b?.worker?.hired)
    .map(([bodyId, b]) => ({ id: bodyId, type: "fishing", hiredAt: b.worker.hiredAt ?? 0 })),
];
  if (candidates.length === 0) return state;
  candidates.sort((a, b) => b.hiredAt - a.hiredAt);
  const toFire = candidates[0];
 
  if (toFire.type === "farm") {
    const worker = state.workers.find((w) => w.id === toFire.id);
    if (worker) {
      const farm = state.farms.find((f) => f.id === worker.farmId);
      if (farm) {
        const workersOnFarm = state.workers.filter((w) => w.farmId === worker.farmId).length;
        const hireCost = Math.round((WORKER_HIRE_BASE_COST * Math.pow(WORKER_HIRE_MULTIPLIER, Math.max(0, workersOnFarm - 1))) / 5) * 5;
        state.crops[farm.crop] = (state.crops[farm.crop] ?? 0) + Math.floor(hireCost * 0.5);
      }
      state.workers = state.workers.filter((w) => w.id !== toFire.id);
    }
  } else if (toFire.type === "kitchen") {
    const worker = state.kitchenWorkers.find((w) => w.id === toFire.id);
    if (worker?.busy && worker.recipeId) {
      const recipe = PROCESSING_RECIPES[worker.recipeId];
      if (recipe?.inputCrop) {
  const refund = Math.floor(recipe.inputAmount * (worker.batchSize ?? 1) * 0.5);
  if (recipe.inputCrop in (state.crops ?? {})) {
    state.crops[recipe.inputCrop] = (state.crops[recipe.inputCrop] ?? 0) + refund;
  } else if (recipe.inputCrop in (state.animalGoods ?? {})) {
    state.animalGoods[recipe.inputCrop] = (state.animalGoods[recipe.inputCrop] ?? 0) + refund;
  } else if (state.fishing?.fish && recipe.inputCrop in state.fishing.fish) {
    state.fishing.fish[recipe.inputCrop] = (state.fishing.fish[recipe.inputCrop] ?? 0) + refund;
  }
}
    }
    state.kitchenWorkers = state.kitchenWorkers.filter((w) => w.id !== toFire.id);
  } else if (toFire.type === "market") {
    const worker = state.marketWorkers.find((w) => w.id === toFire.id);
    if (worker) {
      for (const order of worker.queue ?? []) {
        if (order.itemType in (state.crops ?? {})) state.crops[order.itemType] = (state.crops[order.itemType] ?? 0) + order.quantity;
        else if (order.itemType in (state.artisan ?? {})) state.artisan[order.itemType] = (state.artisan[order.itemType] ?? 0) + order.quantity;
      }
    }
    state.marketWorkers = state.marketWorkers.filter((w) => w.id !== toFire.id);
  } else if (toFire.type === "barn") {
    state.barnWorkers = state.barnWorkers.filter((w) => w.id !== toFire.id);
  } else if (toFire.type === "fishing") {
  const body = state.fishing?.bodies?.[toFire.id];
  if (body?.worker) body.worker = null;
}

  return state;
}
 
export function updateTown(state, seconds = 1) {
  let next = deepCloneState(state);
  if (!next.town) next.town = makeFreshTown();
 
  next.town.unlocked = true;
  next.town.capacity = getTownCapacity(next);
 
  const effectivePulse = getEffectivePulseSeconds(next);
  if (next.town.pulseSeconds == null) next.town.pulseSeconds = effectivePulse;
  next.town.pulseSeconds -= seconds;
 
  while (next.town.pulseSeconds <= 0) {
    const people = Math.floor(Math.max(0, next.town.people ?? 0));
    const capacity = getTownCapacity(next);
    const totalWorkers = getTotalWorkersHired(next);
    const bakeryOn = next.town.bakeryOn === true && (next.town.bakeryLevel ?? 0) >= 1;
    const pantryOn = next.town.pantryOn === true && next.town.jamBuildingOwned === true;
    const canneryOn = next.town.canneryOn === true && next.town.sauceBuildingOwned === true;
    const foodType = bakeryOn ? "bread" : "wheat";

    // ← all your new food unit calculations go here
    const idlePeople = Math.max(0, people - totalWorkers);
    const peopleFoodUnits = (idlePeople * PERSON_IDLE_FOOD_COST) + (totalWorkers * PERSON_WORKING_FOOD_COST);
    const animalFoodUnits = Object.entries(next.animals ?? {}).reduce((sum, [id, arr]) => {
      return sum + arr.length * (ANIMAL_FOOD_COSTS[id] ?? 0);
    }, 0);
    const petFoodUnits = Object.keys(next.pets ?? {}).reduce((sum, petId) => sum + PET_FOOD_COST, 0);
    const totalFoodUnits = peopleFoodUnits + animalFoodUnits + petFoodUnits;

    const foodNeeded = totalFoodUnits === 0 ? 0
      : bakeryOn
        ? Math.max(1, Math.ceil(totalFoodUnits / BREAD_FOOD_UNITS))
        : totalFoodUnits;

    const foodHave = bakeryOn
      ? Math.floor(next.artisan?.bread ?? 0)
      : Math.floor(next.crops?.wheat ?? 0);

    const fed = foodHave >= foodNeeded;

    // Jam/sauce building costs (unchanged)
    let jamNeeded = 0;
    let sauceNeeded = 0;
    if (pantryOn && fed) jamNeeded = getBuildingEffectivePulseCost(next, "pantry");
    if (canneryOn && fed) sauceNeeded = getBuildingEffectivePulseCost(next, "cannery");
    const jamFed = !pantryOn || (next.artisan?.jam ?? 0) >= jamNeeded;
    const sauceFed = !canneryOn || (next.artisan?.sauce ?? 0) >= sauceNeeded;

    if (fed) {
      if (foodNeeded > 0) {
        if (bakeryOn) next.artisan.bread = (next.artisan.bread ?? 0) - foodNeeded;
        else next.crops.wheat = (next.crops.wheat ?? 0) - foodNeeded;
      }
      if (pantryOn && jamFed && jamNeeded > 0) next.artisan.jam = (next.artisan.jam ?? 0) - jamNeeded;
      if (canneryOn && sauceFed && sauceNeeded > 0) next.artisan.sauce = (next.artisan.sauce ?? 0) - sauceNeeded;

      // Reset missed food pulses on animals
      for (const animalId of Object.keys(next.animals ?? {})) {
        for (const animal of next.animals[animalId]) {
          animal.missedFoodPulses = 0;
        }
      }

      if (people < capacity) next.town.people = Math.min(capacity, people + TOWN_GROWTH_PER_PULSE);
      else next.town.people = people;
      next.town.starving = false;
    } else {
      next.town.people = Math.max(0, people - TOWN_DECLINE_PER_PULSE);
      next.town.starving = true;
      if (getTotalWorkersHired(next) > next.town.people) next = fireLastHiredWorker(next);

      // Animals lose mood when not fed, track missed pulses
      for (const animalId of Object.keys(next.animals ?? {})) {
        for (const animal of next.animals[animalId]) {
          animal.mood = Math.max(0, (animal.mood ?? 100) - 20);
          animal.missedFoodPulses = (animal.missedFoodPulses ?? 0) + 1;
        }
      }
    }
 
    next.town.satisfactionTarget = getSatisfactionTarget(next);
    const currentSat = next.town.satisfaction ?? TOWN_SATISFACTION_DEFAULT;
    const target = next.town.satisfactionTarget;
    const satCeiling = getSatisfactionCeiling(next);
    // grand_opening: first 3 pulses of a new season start at 150
    if ((next.town.grandOpeningPulsesLeft ?? 0) > 0) {
      next.town.satisfaction = Math.min(satCeiling, Math.max(currentSat, 150));
      next.town.grandOpeningPulsesLeft -= 1;
    } else if (next.town.starving) {
      next.town.satisfaction = Math.max(TOWN_SATISFACTION_FLOOR, currentSat - TOWN_SATISFACTION_STARVE_STEP);
    } else if (currentSat < target) {
      next.town.satisfaction = Math.min(target, currentSat + TOWN_SATISFACTION_STEP);
    } else if (currentSat > target) {
      next.town.satisfaction = Math.max(target, currentSat - TOWN_SATISFACTION_STEP);
    }
    // Hard clamp to ceiling (respects town_pride upgrade)
    next.town.satisfaction = Math.min(satCeiling, next.town.satisfaction);
 
    next.town.rawFoodNeeded = foodNeeded;
    next.town.breadNeeded = foodNeeded;
    next.town.rawBreadNeeded = foodNeeded;
    next.town.jamNeeded = jamNeeded;
    next.town.sauceNeeded = sauceNeeded;
    next.town.foodType = foodType;
    next.town.capacity = getTownCapacity(next);
    next.town.growthBonusPercent = getTownGrowthBonusPercent(next.town.people ?? 0);

    // ── Town Buildings pulse effects ────────────────────────────────────────
    if (fed) {
      // Restaurant: consume omelette + cheese
      const restaurantBuilt = isTownBuildingBuilt(next, "restaurant");
      const restaurantWorkers = getTownBuildingWorkers(next, "restaurant");
      if (restaurantBuilt && restaurantWorkers > 0) {
        const omeletteCost = getRestaurantOmeletteCost(next);
        const cheeseCost = getRestaurantCheeseCost(next);
        const hasIngredients = (next.animalGoods?.omelette ?? 0) >= omeletteCost &&
                               (next.animalGoods?.cheese ?? 0) >= cheeseCost;
        if (hasIngredients) {
          next.animalGoods.omelette -= omeletteCost;
          next.animalGoods.cheese -= cheeseCost;
          next.town.townBuildings.restaurant.stocked = true;
        } else {
          next.town.townBuildings.restaurant.stocked = false;
        }
      }

      // Tavern: consume jam (preferred) or fish_pie
      const tavernBuilt = isTownBuildingBuilt(next, "tavern");
      const tavernWorkers = getTownBuildingWorkers(next, "tavern");
      if (tavernBuilt && tavernWorkers > 0) {
        const tavernCost = getTavernPulseCost(next);
        const tavernMode = next.town.townBuildings?.tavern?.mode ?? "jam";
        const tavernStock = tavernMode === "jam"
          ? (next.artisan?.jam ?? 0)
          : (next.animalGoods?.fish_pie ?? 0);
        if (tavernStock >= tavernCost) {
          if (tavernMode === "jam") next.artisan.jam -= tavernCost;
          else next.animalGoods.fish_pie -= tavernCost;
          next.town.townBuildings.tavern.stocked = true;
        } else {
          next.town.townBuildings.tavern.stocked = false;
        }
      }

      // Clothier: consume knitted_goods, generate cash
      const clothierBuilt = isTownBuildingBuilt(next, "clothier");
      const clothierWorkers = getTownBuildingWorkers(next, "clothier");
      if (clothierBuilt && clothierWorkers > 0) {
        const clothierCost = getClothierPulseCost(next);
        if ((next.animalGoods?.knitted_goods ?? 0) >= clothierCost) {
          next.animalGoods.knitted_goods -= clothierCost;
          const cashEarned = getClothierCashPerPulse(next);
          next.cash = (next.cash ?? 0) + cashEarned;
          next.lifetimeCash = (next.lifetimeCash ?? 0) + cashEarned;
          next.town.townBuildings.clothier.stocked = true;
        } else {
          next.town.townBuildings.clothier.stocked = false;
        }
      }

      // School grow bonus is passive — already applied via getSchoolGrowBonus
    }

    next.town.pulseSeconds += getEffectivePulseSeconds(next);
  }
 
  next.town.growthBonusPercent = getTownGrowthBonusPercent(next.town.people ?? 0);
  return next;
}
 
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
  next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + crops;
  next.yieldPool = newPool;
  plot.state = "empty";
  plot.growthTick = 0;
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
    next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + crops;
    next.yieldPool = newPool;
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
    (next.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(next),
    getTreasuryGrowBonus(next),
    getFishMealGrowBonus(next)
  );
  plot.growthTick = Math.min(plot.growthTick + TEND_SECONDS, growTime);
  if (plot.growthTick >= growTime) plot.state = "ready";
  return next;
}
 
export function getPlotUpgradeCost(farm, state = null) {
  const upgradedCount = farm.plots.filter((p) => p.upgraded).length;
  const costs = [1, 2, 3, 5, 7, 10, 13, 17, 22, 28];
  const base = costs[upgradedCount] ?? Math.ceil(28 + (upgradedCount - 9) * 7);
  if (state && hasPrestigeSkill(state, "bargain_soil")) return Math.max(1, Math.ceil(base * 0.5));
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
  const cost = GEAR[nextGearId].upgradeCost;
  if (!cost || (next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  worker.gear = nextGearId;
  return next;
}
 
export function specializeWorker(state, workerId, specializationId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker || worker.gear !== "hoe" || worker.specialization !== "none") return state;
  if (!SPECIALIZATIONS[specializationId] || specializationId === "none") return state;
  if ((next.cash ?? 0) < SPECIALIZE_COST) return state;
  next.cash -= SPECIALIZE_COST;
  worker.specialization = specializationId;
  worker.cycleCount = 0;
  return next;
}
 
export function buyPlotCapUpgrade(state, farmId) {
  const next = deepCloneState(state);
  const upgrade = getNextPlotCapUpgrade(next, farmId);
  if (!upgrade || (next.cash ?? 0) < upgrade.cost) return state;
  next.cash -= upgrade.cost;
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
  next.cash -= upgrade.cost;
  if (!next.farmInvestments) next.farmInvestments = {};
  if (!next.farmInvestments[farmId]) next.farmInvestments[farmId] = { plotCapIndex: 0, yieldIndex: 0 };
  next.farmInvestments[farmId].yieldIndex += 1;
  return next;
}
 
export function applyYieldBonuses(baseYield, prestigeBonuses, currentPool = 0, farmBonusYield = 0, state = null) {
  // New skill tree: bumper_crop is 15% per stack
  const bumperCount = state ? getPrestigeSkillCount(state, "bumper_crop") : prestigeBonuses.filter((b) => b === "bumper_crop").length;
  const total = baseYield + farmBonusYield;
  if (bumperCount === 0) return { crops: total, newPool: currentPool };
  const exact = total * (1 + bumperCount * 0.15);
  const whole = Math.floor(exact);
  const newPool = currentPool + (exact - whole);
  const bonus = Math.floor(newPool);
  return { crops: whole + bonus, newPool: newPool - bonus };
}
 
// ─── Market worker actions ────────────────────────────────────────────────────
 
export function hireMarketWorker(state) {
  const next = deepCloneState(state);
  if (isAtWorkerCap(next)) return state;
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
  const cost = MARKET_WORKER_GEAR[nextGear].upgradeCost;
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  worker.gear = nextGear;
  return next;
}
 
export function assignItemToMarketWorker(state, workerId, itemType, quantity) {
  if (quantity <= 0) return state;
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  const isAnimal = itemType in (next.animalGoods ?? {});
const isCrop = !isAnimal && itemType in (next.crops ?? {});
const isArtisan = !isAnimal && !isCrop && itemType in (next.artisan ?? {});
const isFish = !isAnimal && !isCrop && !isArtisan && next.fishing?.fish && itemType in next.fishing.fish;
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
      if (order.itemType in (next.crops ?? {})) next.crops[order.itemType] = (next.crops[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.artisan ?? {})) next.artisan[order.itemType] = (next.artisan[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.animalGoods ?? {})) next.animalGoods[order.itemType] = (next.animalGoods[order.itemType] ?? 0) + order.quantity;
      else if (next.fishing?.fish && order.itemType in next.fishing.fish) next.fishing.fish[order.itemType] = (next.fishing.fish[order.itemType] ?? 0) + order.quantity;
    }
  next.marketWorkers = next.marketWorkers.filter((w) => w.id !== workerId);
  return next;
}
 
// ─── Kitchen worker actions ───────────────────────────────────────────────────
 
export function hireKitchenWorker(state) {
  const next = deepCloneState(state);
  if (isAtWorkerCap(next)) return state;
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
 
export function hireBarnWorker(state, animalType) {
  if (!ANIMAL_TYPES[animalType]) return state;
  if (isAtWorkerCap(state)) return state;
  // Check building exists and has worker slot available
  const buildingDef = getBarnBuildingForAnimal(animalType);
  if (!buildingDef) return state;
  const building = getBarnBuilding(state, buildingDef.id);
  if (!building.built) return state;
  const workerSlots = getBarnBuildingWorkerSlots(state, buildingDef.id);
  const currentWorkers = (state.barnWorkers ?? []).filter((w) => w.animalType === animalType).length;
  if (currentWorkers >= workerSlots) return state;
  const cost = getBarnWorkerHireCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  next.barnWorkers = [...(next.barnWorkers ?? []), {
    id: genId("bw"),
    animalType,
    upgrades: hasPrestigeSkill(next, "fast_hands") ? ["capacity_1"] : [],
    collectTimer: 0,
    careTimer: 0,
    hiredAt: Date.now(),
  }];
  return next;
}
 
export function fireBarnWorker(state, workerId) {
  const next = deepCloneState(state);
  next.barnWorkers = (next.barnWorkers ?? []).filter((w) => w.id !== workerId);
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
  const next = deepCloneState(state);
  const worker = (next.barnWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;

  const upgrade = BARN_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return state;

  if ((worker.upgrades ?? []).includes(upgradeId)) return state;
  if (upgrade.requires && !(worker.upgrades ?? []).includes(upgrade.requires)) return state;
  if ((next.cash ?? 0) < upgrade.cost) return state;

  // Research gates for tier-2 barn upgrades
  if (upgradeId === "capacity_2" && !hasSchoolResearch(state, "barn_capacity_2")) return state;
  if (upgradeId === "care_2" && !hasSchoolResearch(state, "barn_care_2")) return state;

  next.cash -= upgrade.cost;
  worker.upgrades = [...(worker.upgrades ?? []), upgradeId];
  return next;
}

export function upgradeAnimalStorage(state, animalId, animalInstanceId) {
  const next = deepCloneState(state);
  const animals = next.animals?.[animalId] ?? [];
  const animal = animals.find((a) => a.id === animalInstanceId);
  if (!animal) return state;
  const nextUpgrade = getAnimalStorageUpgradeCost(animal);
  if (!nextUpgrade) return state;
  if ((next.cash ?? 0) < nextUpgrade.cost) return state;
  next.cash -= nextUpgrade.cost;
  animal.storageLevel = (animal.storageLevel ?? 0) + 1;
  return next;
}

export function upgradeAnimalYield(state, animalId, animalInstanceId) {
  const next = deepCloneState(state);
  const animals = next.animals?.[animalId] ?? [];
  const animal = animals.find((a) => a.id === animalInstanceId);
  if (!animal) return state;
  const nextUpgrade = getAnimalYieldUpgradeCost(animal);
  if (!nextUpgrade) return state;
  if ((next.cash ?? 0) < nextUpgrade.cost) return state;
  // School gate: yield level 2+ requires the school
  if (nextUpgrade.level >= 2 && !hasSchoolResearch(state, "animal_yield_2")) return state;
  next.cash -= nextUpgrade.cost;
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
  next.fishing.bodies[bodyId].worker = null; // no worker until hired
  return next;
}

export function hireFishingWorker(state, bodyId) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  if (!body?.unlocked) return state;
  if (body.worker?.hired) return state;
  if (isAtWorkerCap(next)) return state;
  const cost = FISHING_WORKER_HIRE_COSTS[bodyId] ?? 75;
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  next.fishing.bodies[bodyId].worker = {
    hired: true,
    upgrades: [],
    timer: 0,
    assignedBait: null,
    hiredAt: Date.now(),
  };
  return next;
}

export function fireFishingWorker(state, bodyId) {
  const next = deepCloneState(state);
  const body = next.fishing?.bodies?.[bodyId];
  if (!body?.worker?.hired) return state;
  body.worker = null;
  return next;
}

export function setFishingActiveBody(state, bodyId) {
  const next = deepCloneState(state);
  if (!next.fishing?.bodies?.[bodyId]?.unlocked) return state;
  next.fishing.activeBody = bodyId;
  return next;
}

export function upgradeFishingWorker(state, bodyId, upgradeId) {
  const next = deepCloneState(state);
  const worker = next.fishing?.bodies?.[bodyId]?.worker;
  if (!worker) return state;
  const upgrade = FISHING_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return state;
  if ((worker.upgrades ?? []).includes(upgradeId)) return state;
  if (upgrade.requires && !(worker.upgrades ?? []).includes(upgrade.requires)) return state;
  if ((next.cash ?? 0) < upgrade.cost) return state;
  // School gate: tier-2 fishing upgrades require the school
  if (upgradeId === "haul_2" && !hasSchoolResearch(state, "fishing_haul_2")) return state;
  if (upgradeId === "gear_expert" && !hasSchoolResearch(state, "fishing_gear_expert")) return state;
  next.cash -= upgrade.cost;
  worker.upgrades = [...(worker.upgrades ?? []), upgradeId];
  return next;
}

export function setFishingWorkerBait(state, bodyId, baitId) {
  const next = deepCloneState(state);
  const worker = next.fishing?.bodies?.[bodyId]?.worker;
  if (!worker) return state;
  worker.assignedBait = baitId;
  return next;
}

export function toggleFishingWorkerAllowedFish(state, bodyId, fishId) {
  const next = deepCloneState(state);
  const worker = next.fishing?.bodies?.[bodyId]?.worker;
  if (!worker) return state;
  const all = ["minnow", "bass", "perch", "rare"];
  const current = worker.allowedFish ?? all;
  if (current.includes(fishId)) {
    // Don't allow removing the last fish
    const next_ = current.filter((f) => f !== fishId);
    worker.allowedFish = next_.length > 0 ? next_ : current;
  } else {
    worker.allowedFish = [...current, fishId];
  }
  return next;
}

export function catchFish(state, fishId, baitId, bodyId) {
  if (!state.fishing) return state;
  const next = deepCloneState(state);
  if (!next.fishing.fish) next.fishing.fish = {};
  next.fishing.fish[fishId] = (next.fishing.fish[fishId] ?? 0) + 1;
  if (baitId && (next.bait?.[baitId] ?? 0) > 0) next.bait[baitId] -= 1;
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

export function unlockSeasonBarn(state, buildingId) {
  if (!state.pendingSeasonUnlock) return state;
  if (!BARN_BUILDINGS[buildingId]) return state;
  if (state.barnBuildings?.[buildingId]?.built) return state;
  const next = deepCloneState(state);
  next.pendingSeasonUnlock = false;
  next.barnBuildings[buildingId] = { built: true, tier: 1 };
  return next;
}
 
export function getNextFarmUnlockCost(state) {
  return getFarmUnlockCost(state.extraFarmsUnlocked ?? 0);
}
 
export function canUnlockFarm(state) {
  return state.pendingFarmUnlock && (state.cash ?? 0) >= getNextFarmUnlockCost(state);
}
 
// ─── Prestige ─────────────────────────────────────────────────────────────────
 
function makeKeptWorker(worker, type) {
  const base = { id: worker.id, keptType: type };
  if (type === "farm") return { ...base, gear: worker.gear, specialization: worker.specialization ?? "none", farmId: null, cycleProgress: 0, cycleCount: 0 };
  if (type === "kitchen") return { ...base, upgrades: [...(worker.upgrades ?? [])], recipeId: null, elapsedSeconds: 0, totalSeconds: 0, batchSize: 1, busy: false };
  if (type === "market") return { ...base, gear: worker.gear, hasStandingOrder: worker.hasStandingOrder ?? false, queue: [], standingOrder: null };
  if (type === "fisher") return { ...base, bodyId: worker.bodyId, upgrades: [...(worker.upgrades ?? [])], timer: 0, assignedBait: null };
  if (type === "barn") return { ...base, animalType: worker.animalType, upgrades: [...(worker.upgrades ?? [])], collectTimer: 0, careTimer: 0 };
  return base;
}

export function getBarnPrestigeReady(state) {
  for (const [buildingId, b] of Object.entries(state.barnBuildings ?? {})) {
    if (!b.built) continue;
    const workers = (state.barnWorkers ?? []).filter((w) => w.animalType === BARN_BUILDINGS[buildingId]?.animalType);
    if (workers.length < PRESTIGE_MIN_BARN_WORKERS) return false;
  }
  return true;
}

export function getAvailableBarnUnlocks(state) {
  return BARN_BUILDING_ORDER.filter((id) => !(state.barnBuildings?.[id]?.built));
}
 
export function canPrestige(state) {
  const requiredTHLevel = Math.min(2, state.season);
  if (getTownHallLevel(state) < requiredTHLevel) return false;
  const farmsToCheck = state.season >= FIRST_EXTRA_FARM_SEASON
    ? state.farms
    : state.farms.filter((f) => (SEASON_FARMS[Math.min(state.season, 3)] ?? []).includes(f.crop));
  for (const farm of farmsToCheck) {
    if (!isFarmPrestigeReady(farm, state.workers, state)) return false;
  }
  // Seasons 4-6: the season's specific barn must have at least 1 worker
  if (state.season >= 4 && state.season <= 6) {
    const barnId = SEASON_BARNS[state.season];
    if (barnId && state.barnBuildings?.[barnId]?.built) {
      const def = BARN_BUILDINGS[barnId];
      const workers = (state.barnWorkers ?? []).filter((w) => w.animalType === def?.animalType);
      if (workers.length < PRESTIGE_MIN_BARN_WORKERS) return false;
    }
  }
  if (state.season >= FIRST_CHOICE_SEASON && !getBarnPrestigeReady(state)) return false;
  if ((state.cash ?? 0) < getPrestigeCashThreshold(state.season)) return false;
  return true;
}
 
export function getPrestigeBlockers(state) {
  const blockers = [];
  const requiredTHLevel = Math.min(2, state.season);
  if (getTownHallLevel(state) < requiredTHLevel) blockers.push(`Town Hall level ${requiredTHLevel} required`);
  const farmsToCheck = state.season >= FIRST_EXTRA_FARM_SEASON
    ? state.farms
    : state.farms.filter((f) => (SEASON_FARMS[Math.min(state.season, 3)] ?? []).includes(f.crop));
  for (const farm of farmsToCheck) {
    const crop = CROPS[farm.crop];
    if (farm.unlockedPlots < PRESTIGE_MIN_PLOTS) {
      blockers.push(`${crop.emoji} ${crop.name}: needs 3×3 plots (${farm.unlockedPlots}/9)`);
    } else if (!isFarmPrestigeReady(farm, state.workers, state)) {
      blockers.push(`${crop.emoji} ${crop.name}: workers not keeping up with growth`);
    }
  }
  // Seasons 4-6: must automate the season's specific barn
  if (state.season >= 4 && state.season <= 6) {
    const barnId = SEASON_BARNS[state.season];
    if (barnId && state.barnBuildings?.[barnId]?.built) {
      const def = BARN_BUILDINGS[barnId];
      const workers = (state.barnWorkers ?? []).filter((w) => w.animalType === def?.animalType);
      if (workers.length < PRESTIGE_MIN_BARN_WORKERS) {
        blockers.push(`${def?.emoji ?? "🐄"} ${def?.name ?? barnId}: needs at least 1 barn worker`);
      }
    }
  }
  if (state.season >= FIRST_CHOICE_SEASON) {
    for (const [buildingId, b] of Object.entries(state.barnBuildings ?? {})) {
      if (!b.built) continue;
      const def = BARN_BUILDINGS[buildingId];
      const workers = (state.barnWorkers ?? []).filter((w) => w.animalType === def?.animalType);
      if (workers.length < PRESTIGE_MIN_BARN_WORKERS) {
        blockers.push(`${def?.emoji ?? "🐄"} ${def?.name ?? buildingId}: needs at least 1 barn worker`);
      }
    }
  }
  const threshold = getPrestigeCashThreshold(state.season);
  if ((state.cash ?? 0) < threshold) blockers.push(`Need $${threshold} cash (have $${Math.floor(state.cash ?? 0)})`);
  return blockers;
}
 
export function beginPrestige(state, _unused, keptWorkerIds) {
  const next = deepCloneState(state);
  const newSeason = next.season + 1;

  // Award 1 prestige skill point
  next.prestigePoints = (next.prestigePoints ?? 0) + 1;

  const idsToKeep = Array.isArray(keptWorkerIds)
    ? keptWorkerIds
    : keptWorkerIds ? [keptWorkerIds] : [];

  // Collect all kept workers — now includes fishers and barn workers
  const previousKeptWorkers = [...(next.keptWorkers ?? [])];
  for (const keptWorkerId of idsToKeep) {
    const fw = next.workers.find((w) => w.id === keptWorkerId);
    const kw = next.kitchenWorkers.find((w) => w.id === keptWorkerId);
    const mw = next.marketWorkers.find((w) => w.id === keptWorkerId);
    const bw = next.barnWorkers.find((w) => w.id === keptWorkerId);
    // Fisher workers use "fisher_<bodyId>" as their keepId
    const fisherBodyId = keptWorkerId.startsWith("fisher_") ? keptWorkerId.slice(7) : null;
    const fisherBody = fisherBodyId ? next.fishing?.bodies?.[fisherBodyId] : null;
    if (fw) previousKeptWorkers.push(makeKeptWorker(fw, "farm"));
    else if (kw) previousKeptWorkers.push(makeKeptWorker(kw, "kitchen"));
    else if (mw) previousKeptWorkers.push(makeKeptWorker(mw, "market"));
    else if (bw) previousKeptWorkers.push(makeKeptWorker(bw, "barn"));
    else if (fisherBody?.worker?.hired) {
      previousKeptWorkers.push(makeKeptWorker({ ...fisherBody.worker, bodyId: fisherBodyId, id: keptWorkerId }, "fisher"));
    }
  }
  next.keptWorkers = previousKeptWorkers;

  // Reset all worker types including fishers and barn workers
  next.workers = [];
  next.kitchenWorkers = [];
  next.marketWorkers = [];
  next.barnWorkers = [];
  // Fire all fishing workers (bodies stay unlocked)
  for (const bodyId of Object.keys(next.fishing?.bodies ?? {})) {
    if (next.fishing.bodies[bodyId]?.worker?.hired) {
      next.fishing.bodies[bodyId].worker = null;
    }
  }

  for (const cropId of Object.keys(next.crops)) {
    next.crops[cropId] = Math.floor((next.crops[cropId] ?? 0) * 0.1);
  }
  next.yieldPool = 0;

  // Seasons 1-3: auto-unlock farms from SEASON_FARMS
  // Seasons 4-6: auto-build the barn for that season
  // Season 7+: set pendingSeasonUnlock for player choice modal
  if (newSeason <= 3) {
    const newFarmCrops = SEASON_FARMS[newSeason] ?? [];
    const existingCropIds = next.farms.map((f) => f.crop);
    for (const cropId of newFarmCrops) {
      if (!existingCropIds.includes(cropId)) next.farms.push(makeFarm(cropId, true));
    }
  } else if (newSeason >= 4 && newSeason <= 6) {
    const barnId = SEASON_BARNS[newSeason];
    if (barnId && next.barnBuildings?.[barnId] && !next.barnBuildings[barnId].built) {
      next.barnBuildings[barnId].built = true;
      next.barnBuildings[barnId].tier = 1;
    }
  } else {
    // Season 7+: player picks farm or barn
    next.pendingSeasonUnlock = true;
  }

  for (const farm of next.farms) {
    farm.plots = farm.plots.map((plot, idx) => ({
      ...plot,
      state: idx === 0 ? "planted" : "empty",
      growthTick: idx === 0 ? Math.floor(CROPS[farm.crop].growTime / 2) : 0,
    }));
  }

  // warm_welcome: start with 1 extra home
  if (hasPrestigeSkill(next, "warm_welcome")) {
    next.town.homes = (next.town.homes ?? 0) + 1;
    next.town.capacity = getTownCapacity(next);
  }

  // grand_opening: satisfaction boosted to 150 for first 3 town pulses
  if (hasPrestigeSkill(next, "grand_opening")) {
    next.town.grandOpeningPulsesLeft = 3;
    next.town.satisfaction = Math.min(getSatisfactionCeiling(next), 150);
  }

  // Restore kept workers by type
  const farmKept = next.keptWorkers.filter((w) => w.keptType === "farm");
  const kitchenKept = next.keptWorkers.filter((w) => w.keptType === "kitchen");
  const marketKept = next.keptWorkers.filter((w) => w.keptType === "market");
  const barnKept = next.keptWorkers.filter((w) => w.keptType === "barn");
  const fisherKept = next.keptWorkers.filter((w) => w.keptType === "fisher");

  for (const kw of kitchenKept) { if (isAtWorkerCap(next)) break; next.kitchenWorkers.push({ ...kw }); }
  for (const kw of marketKept) { if (isAtWorkerCap(next)) break; next.marketWorkers.push({ ...kw }); }
  for (const kw of barnKept) { if (isAtWorkerCap(next)) break; next.barnWorkers.push({ ...kw, collectTimer: 0, careTimer: 0 }); }
  for (const kw of fisherKept) {
    if (isAtWorkerCap(next)) break;
    const body = next.fishing?.bodies?.[kw.bodyId];
    if (body?.unlocked && !body.worker?.hired) {
      next.fishing.bodies[kw.bodyId].worker = { ...kw, hired: true, timer: 0 };
    }
  }

  next.keptWorkers = farmKept;
  next.pendingWorkerAssignments = farmKept.length > 0;
  next.season = newSeason;
  next.lastSavedTime = Date.now();
  next.stats = { farmCrops: {}, kitchenGoods: {}, marketCash: null };
  next.town.pulseSeconds = TOWN_PULSE_SECONDS;
  return next;
}
 
export function assignKeptWorker(state, keptWorkerId, farmId) {
  const next = deepCloneState(state);
  const workerIdx = next.keptWorkers.findIndex((w) => w.id === keptWorkerId);
  if (workerIdx === -1) return state;
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const keptWorker = next.keptWorkers[workerIdx];
  next.workers.push({ ...keptWorker, farmId, cycleProgress: getEffectiveCycleSeconds(keptWorker) - 1, cycleCount: 0 });
  next.keptWorkers.splice(workerIdx, 1);
  if (next.keptWorkers.length === 0) next.pendingWorkerAssignments = false;
  return next;
}
 
export function buyPond(state) {
  if (state.fishing?.bodies?.pond?.unlocked) return state;
  if ((state.cash ?? 0) < POND_COST) return state;
  const next = deepCloneState(state);
  next.cash -= POND_COST;
  if (!next.fishing) next.fishing = { activeBody: "pond", bodies: {}, fish: {} };
  next.fishing.bodies.pond = {
    unlocked: true,
    worker: { upgrades: [], timer: 0, assignedBait: null },
  };
  next.fishing.activeBody = "pond";
  return next;
}
 

 
export function applyGoldenBonus(state, bonusId) {
  const next = deepCloneState(state);
  if (bonusId === "treasury_inject") {
    next.town.treasuryBalance = (next.town.treasuryBalance ?? 0) + 500;
  } else if (bonusId === "feast_boost") {
    next.feastBonusPercent = Math.min(FEAST_MAX_BONUS, (next.feastBonusPercent ?? 0) * 2);
  } else if (bonusId === "free_plot") {
    for (const farm of next.farms) {
      const plot = farm.plots.find((p) => !p.upgraded);
      if (plot) { plot.upgraded = true; break; }
    }
  } else if (bonusId === "town_sat") {
    next.town.satisfaction = 150;
  }
  return next;
}
 
export function buyAnimal(state, animalId) {
  const type = ANIMAL_TYPES[animalId];
  if (!type) return state;
  if ((state.season ?? 1) < type.unlockSeason) return state;
  // Must have the barn building built
  const buildingDef = getBarnBuildingForAnimal(animalId);
  if (!buildingDef) return state;
  const building = getBarnBuilding(state, buildingDef.id);
  if (!building.built) return state;
  const slotMax = getBarnBuildingAnimalSlots(state, buildingDef.id);
  const owned = (state.animals?.[animalId] ?? []).length;
  if (owned >= slotMax) return state;
  const cost = Math.round(type.baseCost * Math.pow(type.costMultiplier, owned));
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  if (!next.animals) next.animals = {};
  if (!next.animals[animalId]) next.animals[animalId] = [];
  next.animals[animalId].push({
    id: genId("animal"),
    mood: 100,
    readyTick: 0,
    ready: false,
    interactCooldown: 0,
  });
  return next;
}
 
export function toggleKitchenWorkerAutoRestart(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.kitchenWorkers.find((w) => w.id === workerId);
  if (!worker || !(worker.upgrades ?? []).includes("auto_restart")) return state;
  worker.autoRestartEnabled = !(worker.autoRestartEnabled ?? true);
  return next;
}
 
export function collectAnimal(state, animalId, animalInstanceId) {
  const type = ANIMAL_TYPES[animalId];
  if (!type) return state;
  const next = deepCloneState(state);
  const animals = next.animals?.[animalId] ?? [];
  const animal = animals.find((a) => a.id === animalInstanceId);
  if (!animal || (animal.stock ?? 0) <= 0) return state;
  const mood = animal.mood ?? 100;
  const stock = animal.stock ?? 0;
  // Collect all stock, mood affects bonus on top
  const bonusChance = mood / 100;
  const bonus = Math.random() < bonusChance ? 1 : 0;
  const collected = stock + bonus;
  animal.stock = 0;
  animal.ready = false;
  if (!next.animalGoods) next.animalGoods = {};
  next.animalGoods[type.produces] = (next.animalGoods[type.produces] ?? 0) + collected;
  return next;
}
 
export function collectAllAnimals(state) {
  const next = deepCloneState(state);
  const ANIMAL_TYPES_LOCAL = { chicken: { produces: "egg" }, cow: { produces: "milk" }, sheep: { produces: "wool" } };
  let anyCollected = false;
  for (const [animalId, animals] of Object.entries(next.animals ?? {})) {
    const type = ANIMAL_TYPES_LOCAL[animalId];
    if (!type) continue;
    for (const animal of animals) {
      const stock = animal.stock ?? 0;
      if (stock <= 0) continue;
      const mood = animal.mood ?? 100;
      const bonusChance = mood / 100;
      const bonus = Math.random() < bonusChance ? 1 : 0;
      next.animalGoods[type.produces] = (next.animalGoods[type.produces] ?? 0) + stock + bonus;
      animal.stock = 0;
      animal.ready = false;
      anyCollected = true;
    }
  }
  return anyCollected ? next : state;
}
 
export function interactAnimal(state, animalId, animalInstanceId) {
  const next = deepCloneState(state);
  const animals = next.animals?.[animalId] ?? [];
  const animal = animals.find((a) => a.id === animalInstanceId);
  if (!animal || (animal.interactCooldown ?? 0) > 0) return state;
  animal.mood = Math.min(100, (animal.mood ?? 100) + ANIMAL_INTERACT_MOOD_BOOST);
  animal.interactCooldown = ANIMAL_INTERACT_COOLDOWN;
  return next;
}
 
export function buyPet(state, petId) {
  const type = PET_TYPES[petId];
  if (!type || state.pets?.[petId]) return state;
  if ((state.cash ?? 0) < type.cost) return state;
  const next = deepCloneState(state);
  next.cash -= type.cost;
  if (!next.pets) next.pets = {};
  next.pets[petId] = { mood: 100, interactCooldown: 0 };
  return next;
}
 
export function interactPet(state, petId) {
  const next = deepCloneState(state);
  const pet = next.pets?.[petId];
  if (!pet || (pet.interactCooldown ?? 0) > 0) return state;
  pet.mood = Math.min(100, (pet.mood ?? 100) + PET_INTERACT_MOOD_BOOST);
  pet.interactCooldown = PET_INTERACT_COOLDOWN;
  return next;
}
 
// ─── Serialization ────────────────────────────────────────────────────────────
 
export function serializeState(state) {
  return JSON.stringify({ ...state, lastSavedTime: Date.now() });
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
 
    if (parsed.town === undefined) {
      parsed.town = makeFreshTown();
    } else {
      parsed.town.unlocked = true;
      if (!parsed.town.homes || parsed.town.homes === 0) parsed.town.homes = 1;
      if (parsed.town.bakeryLevel === undefined) parsed.town.bakeryLevel = 0;
      if (parsed.town.bakeryOn === undefined) parsed.town.bakeryOn = false;
      if (parsed.town.pantryOn === undefined) parsed.town.pantryOn = false;
      if (parsed.town.canneryOn === undefined) parsed.town.canneryOn = false;
      if (parsed.town.jamBuildingOwned === undefined) parsed.town.jamBuildingOwned = false;
      if (parsed.town.sauceBuildingOwned === undefined) parsed.town.sauceBuildingOwned = false;
      if (parsed.town.townHallLevel === undefined) parsed.town.townHallLevel = 0;
      if (parsed.town.treasuryBalance === undefined) parsed.town.treasuryBalance = 0;
      if (parsed.town.treasuryActiveTier === undefined) parsed.town.treasuryActiveTier = 0;
      if (parsed.town.bankBuilt === undefined) parsed.town.bankBuilt = false;
      if (parsed.town.bankLevel === undefined) parsed.town.bankLevel = 0;
      if (parsed.town.bankActiveTier === undefined) parsed.town.bankActiveTier = 0;
      if (parsed.town.bakeryUpgradeLevel === undefined) parsed.town.bakeryUpgradeLevel = 0;
      if (parsed.town.pantryUpgradeLevel === undefined) parsed.town.pantryUpgradeLevel = 0;
      if (parsed.town.canneryUpgradeLevel === undefined) parsed.town.canneryUpgradeLevel = 0;
      if (parsed.town.jamNeeded === undefined) parsed.town.jamNeeded = 0;
      if (parsed.town.sauceNeeded === undefined) parsed.town.sauceNeeded = 0;
      if (parsed.town.people === undefined || parsed.town.people === 0) parsed.town.people = TOWN_STARTING_PEOPLE;
      if (parsed.town.capacity === undefined) parsed.town.capacity = TOWN_HOME_CAPACITY;
      if (parsed.town.satisfaction === undefined || parsed.town.satisfaction <= 1) parsed.town.satisfaction = TOWN_SATISFACTION_DEFAULT;
      if (parsed.town.satisfactionTarget === undefined) parsed.town.satisfactionTarget = TOWN_SAT_WHEAT;
      if (parsed.town.growthBonusPercent === undefined) parsed.town.growthBonusPercent = 0;
      if (parsed.town.breadNeeded === undefined) parsed.town.breadNeeded = 0;
      if (parsed.town.rawBreadNeeded === undefined) parsed.town.rawBreadNeeded = 0;
      if (parsed.town.rawFoodNeeded === undefined) parsed.town.rawFoodNeeded = 0;
      parsed.town.foodType = parsed.town.bakeryOn ? "bread" : "wheat";
      if (parsed.town.pulseSeconds === undefined) parsed.town.pulseSeconds = TOWN_PULSE_SECONDS;
      if (parsed.town.starving === undefined) parsed.town.starving = false;
      // Migrate old drain-based townHall to treasury
      if (parsed.town.townHallDraining !== undefined) delete parsed.town.townHallDraining;
      if (parsed.town.townHallDrained !== undefined) delete parsed.town.townHallDrained;
      if (parsed.town.treasuryCap === undefined) parsed.town.treasuryCap = 0;
      if (parsed.town.townBuildings === undefined) parsed.town.townBuildings = {};
      if (parsed.town.grandOpeningPulsesLeft === undefined) parsed.town.grandOpeningPulsesLeft = 0;
      if (parsed.town.townBuildings.school?.built) {
  const school = parsed.town.townBuildings.school;
  if (school.activeResearchId === undefined) school.activeResearchId = null;
  if (school.researchProgress === undefined) school.researchProgress = 0;
  if (school.researchNeeded === undefined) school.researchNeeded = 0;
  if (school.unlockedResearch === undefined) school.unlockedResearch = [];
}
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

// Migrate pond.fish → fishing
// Migrate pond.fish → fishing
if (!parsed.fishing) {
  parsed.fishing = {
    activeBody: "pond",
    bodies: {
      pond:  { unlocked: parsed.pond?.owned === true, worker: parsed.pond?.owned ? { hired: true, upgrades: [], timer: 0, assignedBait: null } : null },
      lake:  { unlocked: false, worker: null },
      river: { unlocked: false, worker: null },
      ocean: { unlocked: false, worker: null },
    },
    fish: { ...(parsed.pond?.fish ?? {}) },
  };
}
// Also migrate existing fishing workers that are missing hired flag
if (parsed.fishing?.bodies) {
  for (const body of Object.values(parsed.fishing.bodies)) {
    if (body?.worker && body.worker.hired === undefined) {
  body.worker.hired = true;
}
if (body?.worker && body.worker.hiredAt === undefined) {
  body.worker.hiredAt = 0;
}
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
 
    return parsed;
  } catch { return null; }
}
 
function deepCloneState(state) {
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