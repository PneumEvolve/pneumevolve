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
  MARKET_WORKER_STANDING_ORDER_COST,
  TOWN_HOME_CAPACITY, TOWN_HOME_SECOND_COST, TOWN_HOME_COST_MULTIPLIER,
  TOWN_BAKERY_BASE_COST, TOWN_BAKERY_COST_MULTIPLIER,
  TOWN_JAM_BUILDING_COST, TOWN_SAUCE_BUILDING_COST,
  TOWN_PULSE_SECONDS, TOWN_GROWTH_PER_PULSE, TOWN_DECLINE_PER_PULSE,
  TOWN_HOME_INSTANT_POPULATION,
  TOWN_SATISFACTION_DEFAULT, TOWN_SATISFACTION_FLOOR,
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
  ANIMAL_INTERACT_MOOD_BOOST, ANIMAL_INTERACT_COOLDOWN,
  PET_TYPES, PET_INTERACT_MOOD_BOOST, PET_INTERACT_COOLDOWN,
  BAIT_RECIPES, BARN_WORKER_HIRE_BASE_COST, BARN_WORKER_HIRE_MULTIPLIER,
BARN_WORKER_UPGRADES, ANIMAL_STORAGE_UPGRADES,
BARN_WORKER_BASE_INTERVAL, BARN_WORKER_BASE_CAPACITY,
ANIMAL_BASE_STOCK_MAX, ANIMAL_OVERFULL_MOOD_DRAIN, ANIMAL_FOOD_COSTS, PET_FOOD_COST, BREAD_FOOD_UNITS,
PERSON_IDLE_FOOD_COST, PERSON_WORKING_FOOD_COST,
FISHING_BODIES, FISHING_BODY_ORDER, FISHING_FISH,
FISHING_CATCH_RATES, FISHING_BAIT_BONUS,
FISHING_WORKER_UPGRADES, FISHING_WORKER_BASE_INTERVAL,
} from "./gameConstants";
 
let _idCounter = 0;
function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}
 
// ─── Population helpers ───────────────────────────────────────────────────────
 
export function getTotalWorkersHired(state) {
  const fishingWorkers = Object.values(state.fishing?.bodies ?? {})
    .filter((b) => b?.unlocked && b?.worker?.hired === true).length;
  return (
    (state.workers ?? []).length +
    (state.kitchenWorkers ?? []).length +
    (state.marketWorkers ?? []).length +
    (state.barnWorkers ?? []).length +
    fishingWorkers
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
  return tier ? tier.growBonus : 0;
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
    state.town?.growthBonusPercent ?? 0,
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
 
export function getTownCapacity(state) {
  return (state.town?.homes ?? 0) * TOWN_HOME_CAPACITY;
}
 
export function getTownGrowthBonusPercent(people) {
  const steps = Math.floor(Math.max(0, people) / TOWN_PEOPLE_PER_GROWTH_BONUS);
  return Math.min(TOWN_MAX_GROWTH_BONUS_PERCENT, steps * TOWN_GROWTH_BONUS_PER_STEP);
}
 
export function getSatisfactionTarget(state) {
  const town = state.town ?? {};
  if (town.starving) return TOWN_SATISFACTION_FLOOR;
  const bakeryOn = town.bakeryOn === true && (town.bakeryLevel ?? 0) >= 1;
  if (!bakeryOn) return TOWN_SAT_WHEAT;
  const pantryOn = town.pantryOn === true && town.jamBuildingOwned === true;
  const canneryOn = town.canneryOn === true && town.sauceBuildingOwned === true;
  if (pantryOn && canneryOn) return TOWN_SAT_ALL_BUILDINGS;
  if (canneryOn) return TOWN_SAT_BAKERY_SAUCE;
  if (pantryOn) return TOWN_SAT_BAKERY_JAM;
  return TOWN_SAT_BAKERY;
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
    const isCrop = itemType in (state.crops ?? {});
    return isCrop ? Math.floor(state.crops[itemType] ?? 0) : Math.floor(state.artisan[itemType] ?? 0);
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
 
export function getSellRate(itemType, prestigeBonuses = [], bankPriceBonus = 0) {
  const base = MARKET_SELL_RATES[itemType] ?? 0;
  const savvyCount = (prestigeBonuses ?? []).filter((b) => b === "market_savvy").length;
  let rate = savvyCount > 0 ? Math.round(base * Math.pow(1.25, savvyCount) * 100) / 100 : base;
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
 
export function getEffectiveKitchenSeconds(worker, baseSeconds) {
  return Math.max(5, Math.floor(baseSeconds * getKitchenWorkerSpeedMultiplier(worker)));
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
  return true;
}
 
export function getKitchenWorkerBatchSize(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("batch_10")) return 10;
  if (upgrades.includes("batch_5")) return 5;
  if (upgrades.includes("batch_2")) return 2;
  return 1;
}
 
function _startKitchenWorkerRecipe(worker, recipeId, crops, animalGoods, fish) {
  const recipe = PROCESSING_RECIPES[recipeId] ?? BAIT_RECIPES[recipeId];
  if (!recipe?.inputCrop) return false;
  const batch = getKitchenWorkerBatchSize(worker);
  const totalInput = recipe.inputAmount * batch;
  const inCrops = recipe.inputCrop in (crops ?? {});
  const inAnimal = recipe.inputCrop in (animalGoods ?? {});
  const inFish = recipe.inputCrop in (fish ?? {});
  const have = inCrops ? (crops[recipe.inputCrop] ?? 0)
    : inAnimal ? (animalGoods[recipe.inputCrop] ?? 0)
    : inFish ? (fish[recipe.inputCrop] ?? 0) : 0;
  if (have < totalInput) return false;
  if (inCrops) crops[recipe.inputCrop] -= totalInput;
  else if (inAnimal) animalGoods[recipe.inputCrop] -= totalInput;
  else if (inFish) fish[recipe.inputCrop] -= totalInput;
  worker.recipeId = recipeId;
  worker.elapsedSeconds = 0;
  worker.totalSeconds = getEffectiveKitchenSeconds(worker, recipe.seconds);
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
      const refund = Math.floor(recipe.inputAmount * batch * 0.5);
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
    gear: startWithGloves ? "gloves" : "bare_hands",
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
  };
}
 
// ─── Initial state ────────────────────────────────────────────────────────────
 
export function createInitialState() {
  return {
    season: 1,
    prestigeBonuses: [],
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
    animalGoods: { egg: 0, milk: 0, wool: 0 },
    bait: { wheat_bait: 0, berry_bait: 0, tomato_bait: 0 },
    fishMealStacks: [],
    barnWorkers: [],
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
  const townBonus = state.town?.growthBonusPercent ?? 0;
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
  if (upgrades.includes("speed_2")) return 10;
  if (upgrades.includes("speed_1")) return 20;
  return BARN_WORKER_BASE_INTERVAL;
}

export function getBarnWorkerCapacity(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("capacity_2")) return 6;
  if (upgrades.includes("capacity_1")) return 3;
  return BARN_WORKER_BASE_CAPACITY;
}

export function getBarnWorkerCareInterval(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("care_2")) return 45;
  if (upgrades.includes("care_1")) return 60;
  return null; // no care without upgrade
}

export function getBarnWorkerCareMood(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("care_2")) return 25;
  if (upgrades.includes("care_1")) return 15;
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

// ─── Fishing helpers ──────────────────────────────────────────────────────────

export function getFishingWorkerInterval(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("speed_2")) return 20;
  if (upgrades.includes("speed_1")) return 40;
  return FISHING_WORKER_BASE_INTERVAL;
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
  const feast = next.feastBonusPercent ?? 0;
  const townBonus = next.town?.growthBonusPercent ?? 0;
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
              const { crops, newPool } = applyYieldBonuses(crop.workerYield, next.prestigeBonuses, next.yieldPool ?? 0, bonusYield);
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
        _startKitchenWorkerRecipe(worker, worker.recipeId, next.crops, next.animalGoods, next.fishing?.fish, next.bait);
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
      const rate = getSellRate(order.itemType, next.prestigeBonuses, bankPriceBonus);
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
      const interval = getFishingWorkerInterval(worker);
      const haul = getFishingWorkerHaul(worker);
      const gearTier = getFishingWorkerGearTier(worker);
      const baitId = worker.assignedBait;
      const hasBait = baitId && (next.bait?.[baitId] ?? 0) > 0;
      const effectiveBait = hasBait ? baitId : null;

      worker.timer = (worker.timer ?? 0) + 1;
      if (worker.timer >= interval) {
        worker.timer = 0;
        const baitBonus = effectiveBait ? FISHING_BAIT_BONUS[effectiveBait].haulBonus : 0;
        const totalHaul = haul + baitBonus;
        if (!next.fishing.fish) next.fishing.fish = {};
        for (let i = 0; i < totalHaul; i++) {
          const fishId = rollFishForBody(bodyId, gearTier, effectiveBait);
          next.fishing.fish[fishId] = (next.fishing.fish[fishId] ?? 0) + 1;
        }
        // Consume bait
        if (hasBait) next.bait[baitId] -= 1;
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
          let produced = 1;
          if (mood >= 80) {
            const bonusChance = (mood - 80) / 20;
            produced = 2 + (Math.random() < bonusChance ? 1 : 0);
          } else {
            const bonusChance = mood / 80;
            produced = 1 + (Math.random() < bonusChance ? 1 : 0);
          }
          animal.stock = Math.min(stockMax, stock + produced);
          animal.readyTick = 0;
        }
      }

      animal.ready = (animal.stock ?? 0) > 0;

      // Mood decay — 5x when full
      const decayPerSecond = (type.moodDecayPerMinute / 60) * moodDecayMultiplier * (isFull ? ANIMAL_OVERFULL_MOOD_DRAIN : 1);
      animal.mood = Math.max(0, (animal.mood ?? 100) - decayPerSecond);

      // Missed food pulse death check
      if ((animal.missedFoodPulses ?? 0) >= 3) {
        toRemove.push(animal.id);
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
        for (const animal of animals) {
          animal.mood = Math.min(100, (animal.mood ?? 100) + careMood);
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
        state.crops[recipe.inputCrop] = (state.crops[recipe.inputCrop] ?? 0) + Math.floor(recipe.inputAmount * (worker.batchSize ?? 1) * 0.5);
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
    if (next.town.starving) next.town.satisfaction = Math.max(TOWN_SATISFACTION_FLOOR, currentSat - TOWN_SATISFACTION_STARVE_STEP);
    else if (currentSat < target) next.town.satisfaction = Math.min(target, currentSat + TOWN_SATISFACTION_STEP);
    else if (currentSat > target) next.town.satisfaction = Math.max(target, currentSat - TOWN_SATISFACTION_STEP);
 
    next.town.rawFoodNeeded = foodNeeded;
    next.town.breadNeeded = foodNeeded;
    next.town.rawBreadNeeded = foodNeeded;
    next.town.jamNeeded = jamNeeded;
    next.town.sauceNeeded = sauceNeeded;
    next.town.foodType = foodType;
    next.town.capacity = capacity;
    next.town.growthBonusPercent = getTownGrowthBonusPercent(next.town.people ?? 0);
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
  const { crops, newPool } = applyYieldBonuses(crop.manualYield, next.prestigeBonuses, next.yieldPool ?? 0);
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
    const { crops, newPool } = applyYieldBonuses(crop.manualYield, next.prestigeBonuses, next.yieldPool ?? 0);
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
    next.town?.growthBonusPercent ?? 0,
    getTreasuryGrowBonus(next)
  );
  plot.growthTick = Math.min(plot.growthTick + TEND_SECONDS, growTime);
  if (plot.growthTick >= growTime) plot.state = "ready";
  return next;
}
 
export function getPlotUpgradeCost(farm) {
  const upgradedCount = farm.plots.filter((p) => p.upgraded).length;
  const costs = [1, 2, 3, 5, 7, 10, 13, 17, 22, 28];
  return costs[upgradedCount] ?? Math.ceil(28 + (upgradedCount - 9) * 7);
}
 
export function upgradePlot(state, farmId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => !p.upgraded);
  if (!plot) return state;
  const artisanGood = CROP_ARTISAN[farm.crop];
  if (!artisanGood) return state;
  const cost = getPlotUpgradeCost(farm);
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
  const hasHeadStart = next.prestigeBonuses.includes("head_start") && workersOnFarm === 0;
  const cost = hasHeadStart ? 0 : getWorkerHireCost(next, farmId);
  if ((next.crops[farm.crop] ?? 0) < cost) return state;
  next.crops[farm.crop] -= cost;
  const startWithGloves = next.prestigeBonuses.includes("fast_hands");
  const newWorker = makeFarmWorker(farmId, startWithGloves);
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
  next.cash -= upgrade.cost;
  if (!next.farmInvestments) next.farmInvestments = {};
  if (!next.farmInvestments[farmId]) next.farmInvestments[farmId] = { plotCapIndex: 0, yieldIndex: 0 };
  next.farmInvestments[farmId].yieldIndex += 1;
  return next;
}
 
export function applyYieldBonuses(baseYield, prestigeBonuses, currentPool = 0, farmBonusYield = 0) {
  const bumperCount = prestigeBonuses.filter((b) => b === "bumper_crop").length;
  const total = baseYield + farmBonusYield;
  if (bumperCount === 0) return { crops: total, newPool: currentPool };
  const exact = total * (1 + bumperCount * 0.1);
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
  const isCrop = itemType in (next.crops ?? {});
  const isArtisan = itemType in (next.artisan ?? {});
  const isAnimal = itemType in (next.animalGoods ?? {});
  const isFish = next.fishing?.fish && itemType in next.fishing.fish;
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
    if (recipe?.inputCrop) next.crops[recipe.inputCrop] = (next.crops[recipe.inputCrop] ?? 0) + Math.floor(recipe.inputAmount * batch * 0.5);
    worker.busy = false;
    worker.elapsedSeconds = 0;
    worker.batchSize = 1;
  }
  if (!_startKitchenWorkerRecipe(worker, recipeId, next.crops, next.animalGoods, next.fishing?.fish)) return state;
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
    if (recipe?.inputCrop) next.crops[recipe.inputCrop] = (next.crops[recipe.inputCrop] ?? 0) + Math.floor(recipe.inputAmount * 0.5);
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
  const cost = getBarnWorkerHireCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  next.barnWorkers = [...(next.barnWorkers ?? []), {
    id: genId("bw"),
    animalType,
    upgrades: [],
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
  if (body.worker?.hired) return state; // already has one
  if (isAtWorkerCap(next)) return state;
  const cost = 75; // flat cost, adjust as you like
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  next.fishing.bodies[bodyId].worker = {
    hired: true,
    upgrades: [],
    timer: 0,
    assignedBait: null,
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
  return base;
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
  const threshold = getPrestigeCashThreshold(state.season);
  if ((state.cash ?? 0) < threshold) blockers.push(`Need $${threshold} cash (have $${Math.floor(state.cash ?? 0)})`);
  return blockers;
}
 
export function beginPrestige(state, chosenBonusId, keptWorkerIds) {
  const next = deepCloneState(state);
  const newSeason = next.season + 1;
  if (chosenBonusId) next.prestigeBonuses.push(chosenBonusId);
 
  // keptWorkerIds can be a single id (legacy) or an array
  const idsToKeep = Array.isArray(keptWorkerIds)
    ? keptWorkerIds
    : keptWorkerIds ? [keptWorkerIds] : [];
 
  const previousKeptWorkers = [...(next.keptWorkers ?? [])];
  for (const keptWorkerId of idsToKeep) {
    const fw = next.workers.find((w) => w.id === keptWorkerId);
    const kw = next.kitchenWorkers.find((w) => w.id === keptWorkerId);
    const mw = next.marketWorkers.find((w) => w.id === keptWorkerId);
    if (fw) previousKeptWorkers.push(makeKeptWorker(fw, "farm"));
    else if (kw) previousKeptWorkers.push(makeKeptWorker(kw, "kitchen"));
    else if (mw) previousKeptWorkers.push(makeKeptWorker(mw, "market"));
  }
  next.keptWorkers = previousKeptWorkers;
 
  next.workers = [];
  next.kitchenWorkers = [];
  next.marketWorkers = [];
 
  for (const cropId of Object.keys(next.crops)) {
    next.crops[cropId] = Math.floor((next.crops[cropId] ?? 0) * 0.1);
  }
 
  next.yieldPool = 0;
 
  if (newSeason >= FIRST_EXTRA_FARM_SEASON) {
    next.pendingFarmUnlock = true;
  } else {
    const newFarmCrops = SEASON_FARMS[newSeason] ?? [];
    const existingCropIds = next.farms.map((f) => f.crop);
    for (const cropId of newFarmCrops) {
      if (!existingCropIds.includes(cropId)) next.farms.push(makeFarm(cropId, true));
    }
  }
 
  for (const farm of next.farms) {
    farm.plots = farm.plots.map((plot, idx) => ({
      ...plot,
      state: idx === 0 ? "planted" : "empty",
      growthTick: idx === 0 ? Math.floor(CROPS[farm.crop].growTime / 2) : 0,
    }));
  }
 
  if (next.prestigeBonuses.includes("head_start")) {
    const startWithGloves = next.prestigeBonuses.includes("fast_hands");
    const farmsForSeason = newSeason >= FIRST_EXTRA_FARM_SEASON
      ? next.farms
      : next.farms.filter((f) => (SEASON_FARMS[newSeason] ?? []).includes(f.crop));
    for (const farm of farmsForSeason) {
      if (isAtWorkerCap(next)) break;
      const w = makeFarmWorker(farm.id, startWithGloves);
      w.cycleProgress = getEffectiveCycleSeconds(w) - 1;
      next.workers.push(w);
    }
  }
 
  const farmKept = next.keptWorkers.filter((w) => w.keptType === "farm");
  const kitchenKept = next.keptWorkers.filter((w) => w.keptType === "kitchen");
  const marketKept = next.keptWorkers.filter((w) => w.keptType === "market");
 
  for (const kw of kitchenKept) { if (isAtWorkerCap(next)) break; next.kitchenWorkers.push({ ...kw }); }
  for (const kw of marketKept) { if (isAtWorkerCap(next)) break; next.marketWorkers.push({ ...kw }); }
 
  next.keptWorkers = farmKept;
  next.pendingWorkerAssignments = farmKept.length > 0;
  next.season = newSeason;
  next.lastSavedTime = Date.now();
  // Reset stats buffers on prestige
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
  const owned = (state.animals?.[animalId] ?? []).length;
  if (owned >= MAX_ANIMALS_PER_TYPE) return state;
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
    if (!parsed.stats) parsed.stats = { farmCrops: {}, kitchenGoods: {}, marketCash: null };
 
    if (Array.isArray(parsed.prestigeBonuses)) {
      parsed.prestigeBonuses = parsed.prestigeBonuses.map((b) => b === "bigger_kitchen" ? "market_savvy" : b);
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
    } // end town else
 
    // These must be outside the town block — always migrate regardless
    if (!parsed.pond) parsed.pond = null;
    if (!parsed.animals) parsed.animals = { chicken: [], cow: [], sheep: [] };
    if (!parsed.pets) parsed.pets = {};
    if (!parsed.animalGoods) parsed.animalGoods = { egg: 0, milk: 0, wool: 0 };
    if (!parsed.bait) parsed.bait = { wheat_bait: 0, berry_bait: 0, tomato_bait: 0 };
    if (!parsed.fishMealStacks) parsed.fishMealStacks = [];
    if (!parsed.barnWorkers) parsed.barnWorkers = [];
    if (parsed.kitchenWorkers) {
      for (const w of parsed.kitchenWorkers) {
        if (w.autoRestartEnabled === undefined) w.autoRestartEnabled = true;
      }
    }
    // Migrate animals to stock-based system
for (const animalId of Object.keys(parsed.animals ?? {})) {
  for (const animal of parsed.animals[animalId]) {
    if (animal.stock === undefined) animal.stock = animal.ready ? 1 : 0;
    if (animal.storageLevel === undefined) animal.storageLevel = 0;
    if (animal.missedFoodPulses === undefined) animal.missedFoodPulses = 0;
  }
}
// Migrate barn workers to new shape
for (const w of parsed.barnWorkers ?? []) {
  if (w.upgrades === undefined) w.upgrades = [];
  if (w.collectTimer === undefined) w.collectTimer = 0;
  if (w.careTimer === undefined) w.careTimer = 0;
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
      body.worker.hired = true; // treat existing workers as hired
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