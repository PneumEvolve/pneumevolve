//src/Pages/rootwork/gameEngine.js
 
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
  INVEST_NOW_PCT, INVEST_NOW_CD_SECONDS,
  TREASURY_TIERS, BUILDING_WORKERS_DIVISOR, BUILDING_PULSE_EXTRA_SECONDS,
  BUILDING_UPGRADE_COST, BANK_BUILD_COST, BANK_LEVEL_COSTS,
  BANK_TIERS, BANK_MAX_LEVEL, GEAR_CROP_COSTS, POND_COST, POND_IRON, POND_LUMBER, FORGE_BUILD_COST, FORGE_IRON, FORGE_LUMBER, NEEDLE_SWEEP_SPEED, REEL_DURATION,
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
FISHING_WORKER_UPGRADES, FISHING_WORKER_BASE_INTERVAL, FISHING_PLAYER_UPGRADES, ANIMAL_YIELD_UPGRADES, 
  SCHOOL_RESEARCH,
  PRESTIGE_SKILL_TREE,
  FORGE_RECIPES, FORGE_WORKER_HIRE_COST, FORGE_WORKER_HIRE_MULTIPLIER,
  FORGE_WORKER_UPGRADES, FORGE_WORKER_UPGRADE_ORDER, FORGE_RECIPE_LIST,
  WORLD_ZONES, ADVENTURER_NAMES, ADVENTURER_CLASSES, WORLD_RESOURCES,
  ADVENTURER_BASE_HP, ADVENTURER_HP_PER_LEVEL, ADVENTURER_REGEN_PER_SECOND,
  ADVENTURER_BUFF_ITEMS, ADVENTURER_BUFF_LIST,
  ARTISAN_FOOD_HEAL, ARTISAN_FOOD_LIST,
  WORLD_WORKER_HIRE_COST,
  HERO_SKILL_TREES, HERO_SKILL_DEFS, HERO_CLASS_META,
  HERO_PRESTIGE_COST_BASE, HERO_PRESTIGE_SKILL_COST, HERO_PRESTIGE_REVIVE_BASE,
  HERO_DIP_TREE_PRESTIGE_TIER1, HERO_DIP_TREE_PRESTIGE_TIER2,
  BOSS_DEFS, BOSS_ORDER, BOSS_TICK_INTERVAL, generateInfiniteBoss,
  BOSS_HERO_DAMAGE_LEVEL_SCALE, BOSS_HERO_DAMAGE_GEAR_SCALE,
  BOSS_ABILITIES, BOSS_UNLOCK_LEVEL,
} from "./gameConstants";
 
let _idCounter = 0;
function genId(prefix = "id") {
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
    .filter((b) => b?.unlocked && b?.worker?.hired === true).length;
  const b = state.town?.townBuildings ?? {};
  const townBuildingWorkers = (b.clinic?.workers ?? 0) + (b.school?.workers ?? 0) +
    (b.tavern?.workers ?? 0) + (b.restaurant?.workers ?? 0) + (b.clothier?.workers ?? 0);
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
  return state.town?.townHallLevel ?? 0;
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
  // Level 0 → 1 also costs iron ore + lumber
  if (currentLevel === 0) {
    if ((next.worldResources?.iron_ore ?? 0) < TOWN_HALL_L1_IRON) return state;
    if ((next.worldResources?.lumber ?? 0) < TOWN_HALL_L1_LUMBER) return state;
    next.worldResources.iron_ore -= TOWN_HALL_L1_IRON;
    next.worldResources.lumber -= TOWN_HALL_L1_LUMBER;
  }
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
  return Math.min(100_000, Math.round(raw / 5) * 5);
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

  // Allow switching research — just check it's in the available (not-yet-unlocked) list
  const available = getAvailableSchoolResearch(next).map((r) => r.id);
  if (!available.includes(researchId)) return state;

  // Cancel current research (progress is lost — this is intentional)
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
      if (order.itemType in (next.crops ?? {})) next.crops[order.itemType] = (next.crops[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.artisan ?? {})) next.artisan[order.itemType] = (next.artisan[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.animalGoods ?? {})) next.animalGoods[order.itemType] = (next.animalGoods[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.forgeGoods ?? {})) next.forgeGoods[order.itemType] = (next.forgeGoods[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.worldResources ?? {})) next.worldResources[order.itemType] = (next.worldResources[order.itemType] ?? 0) + order.quantity;
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
 
export function getEffectiveKitchenSeconds(worker, baseSeconds, state = null, recipeId = null) {
  const workerMult = getKitchenWorkerSpeedMultiplier(worker);
  const schoolMult = state ? getSchoolResearchMultiplier(state) : 1;
  // swift_craft: -25% per stack
  const swiftCount = state ? getPrestigeSkillCount(state, "swift_craft") : 0;
  const swiftMult = Math.pow(0.75, swiftCount);
  // Fighter Hearth Guardian: bread bakes 30% faster
  const breadMult = (state && recipeId === "bread") ? getHeroBreadSpeedMultiplier(state) : 1.0;
  return Math.max(5, Math.floor(baseSeconds * workerMult * schoolMult * swiftMult * breadMult));
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
    worldWorkers: [],
    forgeWorkers: [],
    forgeGoods: {},
    cropPotions: {},
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
 
export function getBarnBuildingWorkerSlots(state, buildingId) {
  const instances = (state.barnInstances ?? []).filter(i => i.buildingType === buildingId);
  if (instances.length === 0) {
    const tier = getBarnBuildingTierData(state, buildingId);
    return tier ? tier.workerSlots : 0;
  }
  return instances.reduce((sum, inst) => {
    const tierData = BARN_BUILDING_TIERS[(inst.tier ?? 1) - 1] ?? BARN_BUILDING_TIERS[0];
    return sum + tierData.workerSlots;
  }, 0);
}

export function getBarnInstanceWorkerSlots(state, instanceId) {
  const inst = (state.barnInstances ?? []).find(i => i.id === instanceId);
  if (!inst) return 0;
  const tierData = BARN_BUILDING_TIERS[(inst.tier ?? 1) - 1] ?? BARN_BUILDING_TIERS[0];
  return tierData.workerSlots;
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
            const crystalCost = researchers;
            const availableCrystals = next.worldResources?.mana_crystal ?? 0;
            if (availableCrystals >= crystalCost) {
              next.worldResources.mana_crystal = availableCrystals - crystalCost;
              school.researchProgress = (school.researchProgress ?? 0) + researchers;
            }
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
      // Mage Arcane Focus: 20% chance of +1 bonus output per craft
      const arcaneBonus = (!recipe.isBait && Math.random() < getHeroKitchenBonusChance(next)) ? 1 : 0;
      const produced = recipe.outputAmount * batch + arcaneBonus;
      const artisanGoods = ["bread", "jam", "sauce"];
      if (recipe.isBait) {
        if (!next.bait) next.bait = {};
        next.bait[recipe.outputGood] = (next.bait[recipe.outputGood] ?? 0) + produced;
      } else if (artisanGoods.includes(recipe.outputGood)) {
        next.artisan[recipe.outputGood] = (next.artisan[recipe.outputGood] ?? 0) + produced;
      } else if (["wheat_potion","berry_potion","tomato_potion"].includes(recipe.outputGood)) {
        if (!next.cropPotions) next.cropPotions = {};
        next.cropPotions[recipe.outputGood] = (next.cropPotions[recipe.outputGood] ?? 0) + produced;
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
    // Effective IPS: worker.sellRateLimit (if set) caps the gear speed
    const rawIps = getMarketWorkerItemsPerSecond(worker);
    const effectiveIps = worker.sellRateLimit != null
      ? Math.min(rawIps, worker.sellRateLimit)
      : rawIps;

    if (worker.hasStandingOrder && worker.standingOrder && (worker.queue ?? []).length === 0) {
  const itemType = worker.standingOrder;
  const isWorld  = itemType in WORLD_RESOURCES;
  const isForge  = !isWorld && Object.values(FORGE_RECIPES).some((r) => r.output.resourceKey === itemType);
  const isFish   = !isWorld && !isForge && itemType in (FISHING_FISH ?? {});
  const isAnimal = !isWorld && !isForge && !isFish && itemType in (next.animalGoods ?? {});
  const isArtisan = !isWorld && !isForge && !isFish && !isAnimal && itemType in (next.artisan ?? {});
  const isCrop   = !isWorld && !isForge && !isFish && !isAnimal && !isArtisan;
  const available = isCrop ? (next.crops[itemType] ?? 0)
    : isArtisan ? (next.artisan[itemType] ?? 0)
    : isAnimal ? (next.animalGoods[itemType] ?? 0)
    : isFish ? (next.fishing.fish[itemType] ?? 0)
    : isForge ? (next.forgeGoods[itemType] ?? 0)
    : isWorld ? (next.worldResources[itemType] ?? 0) : 0;
  const toPull = Math.min(effectiveIps, available);
  if (toPull > 0) {
    if (isCrop) next.crops[itemType] -= toPull;
    else if (isArtisan) next.artisan[itemType] -= toPull;
    else if (isAnimal) next.animalGoods[itemType] -= toPull;
    else if (isFish) next.fishing.fish[itemType] -= toPull;
    else if (isForge) next.forgeGoods[itemType] -= toPull;
    else if (isWorld) next.worldResources[itemType] -= toPull;
    worker.queue = [{ id: genId("sale"), itemType, quantity: toPull }];
  }
}
 
    // Accumulate fractional progress — low satisfaction slows selling but never freezes it
    worker.sellProgress = (worker.sellProgress ?? 0) + effectiveIps * satMultiplier;
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
 
  // ── Barn upkeep drain (per instance) ─────────────────────────────────────
  for (const inst of next.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    const animals = inst.animals ?? [];
    if (animals.length === 0) continue;
    const upkeepThisTick = animals.length * def.upkeepPerAnimalPerSec;
    if ((next.cash ?? 0) >= upkeepThisTick) {
      next.cash -= upkeepThisTick;
    } else {
      for (const animal of animals) {
        animal.mood = Math.max(0, (animal.mood ?? 100) - BARN_UPKEEP_DEBT_MOOD_DRAIN);
      }
    }
  }
 
  // ── Animals (per barnInstance) ────────────────────────────────────────────
  const dogOwned = next.pets?.dog !== undefined;
  const dogMoodOk = dogOwned && (next.pets.dog.mood ?? 0) >= 50;
  const moodDecayMultiplier = dogMoodOk ? 0.70 : 1.0;

  for (const inst of next.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    const animalId = def.animalType;
    const type = ANIMAL_TYPES[animalId];
    if (!type) continue;
    const toRemove = [];

    for (const animal of inst.animals ?? []) {
      const stockMax = getAnimalStockMax(animal);
      const stock = animal.stock ?? 0;
      const isFull = stock >= stockMax;
      const effectiveCycle = getAnimalEffectiveCycleSeconds(type.cycleSeconds, next);

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
          const sturdyCount = getPrestigeSkillCount(next, "sturdy_stock");
          if (sturdyCount > 0) produced = Math.ceil(produced * Math.pow(1.2, sturdyCount));
          animal.stock = Math.min(stockMax, stock + produced);
          animal.readyTick = 0;
        }
      }

      animal.ready = (animal.stock ?? 0) > 0;

      const decayPerSecond = (type.moodDecayPerMinute / 60) * moodDecayMultiplier * (isFull ? ANIMAL_OVERFULL_MOOD_DRAIN : 1);
      animal.mood = Math.max(0, (animal.mood ?? 100) - decayPerSecond);

      if (animal.mood <= 0) {
        animal.zeroMoodTicks = (animal.zeroMoodTicks ?? 0) + 1;
      } else {
        animal.zeroMoodTicks = 0;
      }

      if ((animal.missedFoodPulses ?? 0) >= 3 || (animal.zeroMoodTicks ?? 0) >= 180) {
        toRemove.push(animal.id);
        if (!next.pendingDeathEvents) next.pendingDeathEvents = [];
        next.pendingDeathEvents.push({ animalId, animalType: type.name, emoji: type.emoji });
      }

      if ((animal.interactCooldown ?? 0) > 0) {
        animal.interactCooldown = Math.max(0, animal.interactCooldown - 1);
      }
    }

    if (toRemove.length > 0) {
      inst.animals = (inst.animals ?? []).filter((a) => !toRemove.includes(a.id));
    }
  }

  // Keep root-level next.animals in sync (for any legacy reads)
  for (const animalId of Object.keys(next.animals ?? {})) {
    next.animals[animalId] = (next.barnInstances ?? [])
      .filter(i => BARN_BUILDINGS[i.buildingType]?.animalType === animalId)
      .flatMap(i => i.animals ?? []);
  }

  // ── Barn workers (per instance) ───────────────────────────────────────────
  for (const inst of next.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    const animalId = def.animalType;
    const type = ANIMAL_TYPES[animalId];
    if (!type) continue;
    const animals = inst.animals ?? [];

    for (const worker of inst.barnWorkers ?? []) {
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
          const neediest = animals.reduce((lowest, animal) =>
            (animal.mood ?? 100) < (lowest?.mood ?? 100) ? animal : lowest, null);
          if (neediest) neediest.mood = Math.min(100, (neediest.mood ?? 100) + careMood);
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

  // Population growth is decoupled from pulse length — always grows at base rate (1 per TOWN_PULSE_SECONDS)
  // This prevents late-game building stacking from slowing population growth.
  if (!next.town.starving) {
    next.town.growthAccumulator = (next.town.growthAccumulator ?? 0) + seconds;
    while (next.town.growthAccumulator >= TOWN_PULSE_SECONDS) {
      next.town.growthAccumulator -= TOWN_PULSE_SECONDS;
      const cap = getTownCapacity(next);
      const ppl = Math.floor(Math.max(0, next.town.people ?? 0));
      if (ppl < cap) next.town.people = Math.min(cap, ppl + TOWN_GROWTH_PER_PULSE);
    }
  } else {
    next.town.growthAccumulator = 0;
  }

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

    // Boss fight victory bonus — temporary flat satisfaction boost
    if ((next.bossSatBonus?.pulsesRemaining ?? 0) > 0) {
      next.town.satisfaction = Math.min(satCeiling, next.town.satisfaction + next.bossSatBonus.flat);
      next.bossSatBonus = {
        ...next.bossSatBonus,
        pulsesRemaining: next.bossSatBonus.pulsesRemaining - 1,
      };
    }

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
  next.cash -= SPECIALIZE_COST;
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
  if ((next.forgeGoods[itemType] ?? 0) < quantity) return state;
  next.forgeGoods[itemType] -= quantity;
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
      if (order.itemType in (next.crops ?? {})) next.crops[order.itemType] = (next.crops[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.artisan ?? {})) next.artisan[order.itemType] = (next.artisan[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.animalGoods ?? {})) next.animalGoods[order.itemType] = (next.animalGoods[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.forgeGoods ?? {})) next.forgeGoods[order.itemType] = (next.forgeGoods[order.itemType] ?? 0) + order.quantity;
      else if (order.itemType in (next.worldResources ?? {})) next.worldResources[order.itemType] = (next.worldResources[order.itemType] ?? 0) + order.quantity;
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
  const cost = getBarnWorkerHireCost(state);
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
  if (!canAffordUpgradeMaterials(state, upgrade.upgradeRequires)) return state;
  // School gate: tier-2 fishing upgrades require the school
  if (upgradeId === "haul_2" && !hasSchoolResearch(state, "fishing_haul_2")) return state;
  if (upgradeId === "gear_expert" && !hasSchoolResearch(state, "fishing_gear_expert")) return state;
  next.cash -= upgrade.cost;
  consumeUpgradeMaterials(next, upgrade.upgradeRequires);
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

// ─── Player fishing upgrades ──────────────────────────────────────────────────

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
  for (const inst of state.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    const workers = (inst.barnWorkers ?? []).length;
    if (workers < PRESTIGE_MIN_BARN_WORKERS) return false;
    const animals = (inst.animals ?? []).length;
    if (animals < PRESTIGE_MIN_BARN_ANIMALS) return false;
  }
  return true;
}

export function getAvailableBarnUnlocks(state) {
  return BARN_BUILDING_ORDER.filter((id) => !(state.barnBuildings?.[id]?.built));
}
 
export function canPrestige(state) {
  const requiredTHLevel = Math.min(4, state.season);
  if (getTownHallLevel(state) < requiredTHLevel) return false;
  const farmsToCheck = state.season >= FIRST_EXTRA_FARM_SEASON
    ? state.farms
    : state.farms.filter((f) => (SEASON_FARMS[Math.min(state.season, 3)] ?? []).includes(f.crop));
  for (const farm of farmsToCheck) {
    if (!isFarmPrestigeReady(farm, state.workers, state)) return false;
  }
  // Seasons 4+: all built barns must have at least 1 worker and the minimum animals
  if (state.season >= 4 && !getBarnPrestigeReady(state)) return false;
  if ((state.cash ?? 0) < getPrestigeCashThreshold(state.season)) return false;
  return true;
}
 
export function getPrestigeBlockers(state) {
  const blockers = [];
  const requiredTHLevel = Math.min(4, state.season);
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
  // Seasons 4+: all built barns must have at least 1 worker and the minimum animals
  if (state.season >= 4) {
    for (const inst of state.barnInstances ?? []) {
      const def = BARN_BUILDINGS[inst.buildingType];
      const label = def ? `${def.emoji} ${def.name}` : inst.buildingType;
      const workers = (inst.barnWorkers ?? []).length;
      if (workers < PRESTIGE_MIN_BARN_WORKERS) {
        blockers.push(`${label}: needs at least 1 barn worker`);
      }
      const animals = (inst.animals ?? []).length;
      if (animals < PRESTIGE_MIN_BARN_ANIMALS) {
        blockers.push(`${label}: needs at least ${PRESTIGE_MIN_BARN_ANIMALS} animals (have ${animals})`);
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
      previousKeptWorkers.push(
        makeKeptWorker({ ...fisherBody.worker, bodyId: fisherBodyId, id: keptWorkerId }, "fisher")
      );
    }
  }
  next.keptWorkers = previousKeptWorkers;

  // Reset all worker types including fishers and barn workers
  next.workers = [];
  next.kitchenWorkers = [];
  next.marketWorkers = [];
  next.barnWorkers = [];
  next.forgeWorkers = [];

  // Keep animals, only clear barn workers from each instance
  for (const inst of next.barnInstances ?? []) {
    inst.barnWorkers = [];
  }

  // Keep legacy root animal arrays in sync with barn instances
  for (const animalId of Object.keys(next.animals ?? {})) {
    next.animals[animalId] = (next.barnInstances ?? [])
      .filter((i) => BARN_BUILDINGS[i.buildingType]?.animalType === animalId)
      .flatMap((i) => i.animals ?? []);
  }

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
      if (!next.barnInstances) next.barnInstances = [];
      next.barnInstances.push({
        id: genId("bi"),
        buildingType: barnId,
        tier: 1,
        animals: [],
        barnWorkers: [],
      });
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
    next.town.satisfaction = 150;
    next.town.grandOpeningPulsesLeft = 3;
  }

  // Rehire kept non-farm workers immediately
  const farmKept = next.keptWorkers.filter((w) => w.keptType === "farm");
  const kitchenKept = next.keptWorkers.filter((w) => w.keptType === "kitchen");
  const marketKept = next.keptWorkers.filter((w) => w.keptType === "market");
  const barnKept = next.keptWorkers.filter((w) => w.keptType === "barn");
  const fisherKept = next.keptWorkers.filter((w) => w.keptType === "fisher");

  for (const kw of kitchenKept) {
    if (isAtWorkerCap(next)) break;
    next.kitchenWorkers.push({ ...kw });
  }

  for (const kw of marketKept) {
    if (isAtWorkerCap(next)) break;
    next.marketWorkers.push({ ...kw });
  }

  for (const kw of barnKept) {
    if (isAtWorkerCap(next)) break;
    next.barnWorkers.push({ ...kw });
    const targetInst = (next.barnInstances ?? []).find((i) => i.id === kw.instanceId);
    if (targetInst) {
      if (!targetInst.barnWorkers) targetInst.barnWorkers = [];
      targetInst.barnWorkers.push({ ...kw });
    }
  }

  for (const kw of fisherKept) {
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
  if ((state.worldResources?.iron_ore ?? 0) < POND_IRON) return state;
  if ((state.worldResources?.lumber ?? 0) < POND_LUMBER) return state;
  const next = deepCloneState(state);
  next.worldResources.iron_ore -= POND_IRON;
  next.worldResources.lumber -= POND_LUMBER;
  if (!next.fishing) next.fishing = { activeBody: "pond", bodies: {}, fish: {} };
  next.fishing.bodies.pond = {
    unlocked: true,
    worker: { hired: false, upgrades: [], timer: 0, assignedBait: null },
  };
  next.fishing.activeBody = "pond";
  return next;
}

export function buildForge(state) {
  if (state.forgeBuilt) return state;
  if ((state.cash ?? 0) < FORGE_BUILD_COST) return state;
  if ((state.worldResources?.iron_ore ?? 0) < FORGE_IRON) return state;
  if ((state.worldResources?.lumber ?? 0) < FORGE_LUMBER) return state;
  const next = { ...state, worldResources: { ...state.worldResources } };
  next.cash = (next.cash ?? 0) - FORGE_BUILD_COST;
  next.worldResources.iron_ore -= FORGE_IRON;
  next.worldResources.lumber -= FORGE_LUMBER;
  next.forgeBuilt = true;
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
 
export function buyAnimal(state, animalId, instanceId) {
  const type = ANIMAL_TYPES[animalId];
  if (!type) return state;
  if ((state.season ?? 1) < type.unlockSeason) return state;
  const inst = (state.barnInstances ?? []).find(i => i.id === instanceId);
  if (!inst) return state;
  const slotMax = getBarnInstanceAnimalSlots(state, instanceId);
  const owned = (inst.animals ?? []).length;
  if (owned >= slotMax) return state;
  // Cost based on total owned across ALL instances of this type (global rarity curve)
  const allOwned = (state.barnInstances ?? [])
    .filter(i => BARN_BUILDINGS[i.buildingType]?.animalType === animalId)
    .reduce((s, i) => s + (i.animals ?? []).length, 0);
  const cost = Math.round(type.baseCost * Math.pow(type.costMultiplier, allOwned));
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  const targetInst = next.barnInstances.find(i => i.id === instanceId);
  if (!targetInst.animals) targetInst.animals = [];
  targetInst.animals.push({
    id: genId("animal"),
    mood: 100,
    readyTick: 0,
    ready: false,
    interactCooldown: 0,
    stock: 0,
    storageLevel: 0,
    yieldLevel: 0,
    missedFoodPulses: 0,
  });
  // Sync legacy root animals
  if (!next.animals) next.animals = {};
  if (!next.animals[animalId]) next.animals[animalId] = [];
  next.animals[animalId] = (next.barnInstances ?? [])
    .filter(i => BARN_BUILDINGS[i.buildingType]?.animalType === animalId)
    .flatMap(i => i.animals ?? []);
  return next;
}
 
export function setMarketWorkerRateLimit(state, workerId, limit) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  // null = unlimited; otherwise clamp to [1, gear max]
  if (limit === null) {
    worker.sellRateLimit = null;
  } else {
    const max = getMarketWorkerItemsPerSecond(worker);
    worker.sellRateLimit = Math.max(1, Math.min(max, limit));
  }
  return next;
}

export function toggleKitchenWorkerAutoRestart(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.kitchenWorkers.find((w) => w.id === workerId);
  if (!worker || !(worker.upgrades ?? []).includes("auto_restart")) return state;
  worker.autoRestartEnabled = !(worker.autoRestartEnabled ?? true);
  return next;
}
 
export function collectAnimal(state, animalId, animalInstanceId, barnInstanceId) {
  const type = ANIMAL_TYPES[animalId];
  if (!type) return state;
  const next = deepCloneState(state);
  // Find animal in the specific barn instance
  let animal = null;
  for (const inst of next.barnInstances ?? []) {
    if (barnInstanceId && inst.id !== barnInstanceId) continue;
    const found = (inst.animals ?? []).find(a => a.id === animalInstanceId);
    if (found) { animal = found; break; }
  }
  if (!animal || (animal.stock ?? 0) <= 0) return state;
  const mood = animal.mood ?? 100;
  const stock = animal.stock ?? 0;
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
  let anyCollected = false;
  for (const inst of next.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    const type = ANIMAL_TYPES[def.animalType];
    if (!type) continue;
    for (const animal of inst.animals ?? []) {
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
 
export function interactAnimal(state, animalId, animalInstanceId, barnInstanceId) {
  const next = deepCloneState(state);
  let animal = null;
  for (const inst of next.barnInstances ?? []) {
    if (barnInstanceId && inst.id !== barnInstanceId) continue;
    const found = (inst.animals ?? []).find(a => a.id === animalInstanceId);
    if (found) { animal = found; break; }
  }
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
      if (parsed.town.lastInvestTime === undefined) parsed.town.lastInvestTime = 0;
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
  if (parsed.town.growthAccumulator === undefined) parsed.town.growthAccumulator = 0;
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
      pond:  { unlocked: parsed.pond?.owned === true, worker: parsed.pond?.owned ? { hired: true, upgrades: [], timer: 0, assignedBait: null } : null },
      lake:  { unlocked: false, worker: null },
      river: { unlocked: false, worker: null },
      ocean: { unlocked: false, worker: null },
    },
    fish: { ...(parsed.pond?.fish ?? {}) },
  };
}
// Migration: pond must be purchased with iron/lumber (no longer auto-unlocked)
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

// ─── World / Adventurer Engine ────────────────────────────────────────────────

function genWorldId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 8);
}

export function getAdventurerMaxHp(adventurer) {
  return ADVENTURER_BASE_HP + ((adventurer.level ?? 1) - 1) * ADVENTURER_HP_PER_LEVEL;
}

export function createAdventurer(classId = "fighter", usedNames = new Set()) {
  // Filter out already-used names, cycle back if all are used
  const ALL_NAMES = ADVENTURER_NAMES;
  const available = ALL_NAMES.filter((n) => !usedNames.has(n));
  const pool = available.length > 0 ? available : ALL_NAMES;
  const name = pool[Math.floor(Math.random() * pool.length)];
  const maxHp = ADVENTURER_BASE_HP;
  return {
    id: genWorldId("adv"),
    name,
    class: classId,
    level: 1,
    xp: 0,
    gear: 0,
    equippedItem: null,       // legacy — kept for save compat
    equippedGear: { weapon: null, armour: null, body: null }, // new 3-slot system
    hp: maxHp,
    maxHp,
    foodBelt: {},
    buffSlot: null,
    mission: null,
    skillPoints: 0,
    skills: {},               // now a map: { skillId: rank }
    heroClass: null,          // set when tier-1 class skill is unlocked
    prestigeLevel: 0,
    prestigeBonuses: {},      // tracks { classId: timesPrestigedAsClass }
  };
}

export function initWorldState(state) {
  const next = { ...state };
  if (!next.adventurers) next.adventurers = [];
  if (!next.worldZoneClears) next.worldZoneClears = {};
  if (!next.worldResources) next.worldResources = { iron_ore: 0, lumber: 0, herbs: 0, rare_gem: 0 };
  if (!next.worldWorkers) next.worldWorkers = [];
  if (!next.forgeWorkers) next.forgeWorkers = [];
  if (!next.forgeGoods) next.forgeGoods = {};
  if (!next.cropPotions) next.cropPotions = {};
  // Migrate existing adventurers to have hp/potions
  next.adventurers = next.adventurers.map((adv) => {
    // Migrate legacy flat-array skills to map format { skillId: rank }
    let migratedSkills = adv.skills ?? {};
    if (Array.isArray(migratedSkills)) {
      migratedSkills = Object.fromEntries(migratedSkills.map((id) => [id, 1]));
    }
    // Infer heroClass from legacy skills if missing
    let heroClass = adv.heroClass ?? null;
    if (!heroClass) {
      if (migratedSkills["fighter_t1"]) heroClass = "fighter";
      else if (migratedSkills["mage_t1"]) heroClass = "mage";
      else if (migratedSkills["scavenger_t1"]) heroClass = "scavenger";
    }
    const maxHp = getAdventurerMaxHp(adv) + getHeroBonusMaxHp({ ...adv, skills: migratedSkills });
    return {
      equippedItem: null,
      potions: {},
      ...adv,
      maxHp,
      hp: adv.hp !== undefined ? Math.min(adv.hp, maxHp) : maxHp,
      skillPoints: adv.skillPoints ?? 0,
      skills: migratedSkills,
      heroClass,
      equippedGear: adv.equippedGear ?? { weapon: null, armour: null, body: null },
      prestigeLevel: adv.prestigeLevel ?? 0,
      prestigeBonuses: adv.prestigeBonuses ?? {},
      foodBelt: adv.foodBelt ?? {},
      buffSlot: adv.buffSlot ?? null,
    };
  });
  return next;
}

const ADVENTURER_HIRE_COSTS = [10, 100, 250, 500, 1000, 2000, 4000, 8000];

export function getAdventurerSlotCost(state) {
  const count = (state.adventurers ?? []).length;
  return ADVENTURER_HIRE_COSTS[count] ?? null; // null = no more slots
}

export function getAdventurerSlotUnlocked(state) {
  // Slot N unlocks on season N (1-indexed)
  const count = (state.adventurers ?? []).length;
  return (state.season ?? 1) > count;
}

export function hireAdventurer(state, usedNames = new Set()) {
  if (!getAdventurerSlotUnlocked(state)) return state;
  if (isAtWorkerCap(state)) return state;
  const cost = getAdventurerSlotCost(state);
  if (cost === null) return state;
  if ((state.cash ?? 0) < cost) return state;
  const next = { ...state, cash: state.cash - cost };
  next.adventurers = [...(next.adventurers ?? []), createAdventurer("fighter", usedNames)];
  return next;
}

function getAdventurerMissionDuration(adventurer, zone) {
  const base = zone.baseDuration ?? 30;
  const weaponKey = adventurer.equippedGear?.weapon ?? null;
  const weaponRecipe = weaponKey ? Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === weaponKey) : null;
  const weaponBonus = weaponRecipe?.missionTimeReduction ?? (weaponKey ? 0 : (adventurer.gear ?? 0) * 0.15);
  const lvlBonus = Math.min(((adventurer.level ?? 1) - 1) * 0.05, 0.30); // caps at 30% from levels alone
  // New skill tree duration bonus
  const skillMult = getHeroDurationMultiplier(adventurer);
  // skillMult already accounts for mage_t1, mage_t5 stacks
  // Apply weapon/level reduction first, then skill multiplier
  // Level capped at 30%, gear adds up to another 30% (combined 60% max)
  const gearLvlReduction = Math.min(Math.min(weaponBonus, 0.30) + lvlBonus, 0.60);
  const afterGear = base * (1 - gearLvlReduction);
  return Math.max(12, Math.round(afterGear * skillMult));
}

function getAdventurerFailChance(adventurer, zone) {
  const gearScore = (adventurer.gear ?? 0) + (adventurer.level ?? 1);
  const required = zone.gearRequired ?? 0;
  let chance = 0;
  if (gearScore >= required + 2) chance = 0;
  else if (gearScore >= required) chance = 0.05;
  else if (gearScore >= required - 1) chance = 0.30;
  else chance = 0.65;
  if (hasHeroSkill(adventurer, "lucky")) chance = chance / 2; // legacy skill — no-op for new builds
  return chance;
}

function getAdventurerXpNeeded(level) {
  return Math.floor(10 * Math.pow(1.4, level - 1));
}

export function sendAdventurer(state, adventurerId, zoneId, autoBattle = false) {
  const zone = WORLD_ZONES[zoneId];
  if (!zone) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  if (adventurer.mission) return state;
 
  // Block dead heroes
  if ((adventurer.hp ?? adventurer.maxHp) <= 0) return state;
 
  let duration = getAdventurerMissionDuration(adventurer, zone);
  // Omelette buff: -50% run time
  if ((adventurer.buffSlot ?? null) === "omelette") {
    duration = Math.max(1, Math.round(duration * 0.5));
  }
 
  const mission = {
    zoneId,
    zoneName: zone.name,
    startTime: Date.now(),
    duration,
    autoBattle,
    // Auto battle tracking state
    autoBattleRuns: 0,          // completed successful runs so far
    autoBattleLoot: [],         // accumulated loot across all runs
    autoBattleXp: 0,            // accumulated XP
    autoBattleLeveled: false,
    autoBattleDied: false,
    autoBattleOutOfPotions: false,
  };
 
  const updatedAdv = { ...adventurer, mission };
  const next = { ...state, adventurers: [...state.adventurers] };
  next.adventurers[advIdx] = updatedAdv;
  return next;
}

// HELPER (internal): mergeLoot
// Combines two loot arrays, summing amounts for matching resourceKeys
// ─────────────────────────────────────────────────────────────────────────────
function mergeLoot(existing, incoming) {
  const map = {};
  for (const l of existing) {
    map[l.resourceKey] = { ...l };
  }
  for (const l of incoming) {
    if (map[l.resourceKey]) {
      map[l.resourceKey] = { ...map[l.resourceKey], amount: map[l.resourceKey].amount + l.amount };
    } else {
      map[l.resourceKey] = { ...l };
    }
  }
  return Object.values(map).filter((l) => l.amount > 0);
}

export function returnAdventurer(state, adventurerId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return { state, result: null };
  const adventurer = state.adventurers[advIdx];

  // If a completed auto-battle result is parked waiting for the player to collect, drain it now
  if (adventurer.pendingAutoCollect) {
    const result = adventurer.pendingAutoCollect;
    const updatedAdv = { ...adventurer, pendingAutoCollect: null, mission: null };
    const next = { ...state, adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a) };
    return { state: next, result };
  }

  const mission = adventurer.mission;
  if (!mission) return { state, result: null };
  const zone = WORLD_ZONES[mission.zoneId];
  if (!zone) return { state, result: null };
 
  const elapsed = (Date.now() - mission.startTime) / 1000;
  if (elapsed < mission.duration) return { state, result: null };
 
  // ── Single run result ────────────────────────────────────────────────────
 
  const failChance = getAdventurerFailChance(adventurer, zone);
  const failed = Math.random() < failChance;
  const hasCheeseBuff = (adventurer.buffSlot ?? null) === "cheese";
  const skills = adventurer.skills ?? {};
  const minLootBonus = getHeroMinLootBonus(adventurer);

  let runLoot = [];
  let nextResources = { ...(state.worldResources ?? {}) };

  if (!failed) {
    for (const lootDef of zone.loot) {
      const amount = Math.floor(Math.random() * (lootDef.max - lootDef.min + 1)) + lootDef.min;
      let finalAmount = amount > 0 ? amount + minLootBonus : 0;
      if (hasCheeseBuff && finalAmount > 0) finalAmount = finalAmount * 2;
      // Scavenger (auto battle): handled separately below — no loot modification here
      if (finalAmount > 0) runLoot.push({ ...lootDef, amount: finalAmount });
    }
  }
 
  // HP damage calculation — must happen BEFORE level-up so death can't be escaped by leveling
  const dmgPerTick = zone.damagePerTick ?? 1;
  // Shield: use damageReduction from equipped armour recipe
  const shieldKey = adventurer.equippedGear?.armour ?? null;
  const shieldRecipe = shieldKey ? Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === shieldKey) : null;
  const damageReduction = shieldRecipe?.damageReduction ?? 0;
  const currentMaxHp = getAdventurerMaxHp(adventurer) + getHeroBonusMaxHp(adventurer);
  // Evasion: scavenger tree — each 10s tick has a chance to deal 0 damage
  const evasionChance = getHeroEvasionChance(adventurer);
  const totalTicks = Math.floor(mission.duration / 10);
  let rawDamage = 0;
  for (let i = 0; i < totalTicks; i++) {
    if (Math.random() >= evasionChance) {
      rawDamage += dmgPerTick * (failed ? 1.5 : 0.6) * (1 - damageReduction);
    }
  }
  rawDamage = Math.round(rawDamage);
  const hpAfterDamage = Math.max(0, (adventurer.hp ?? currentMaxHp) - rawDamage);

  // Non-auto-battle death: if HP hits 0, hard fail regardless of fail chance
  const diedOnNormalRun = !mission.autoBattle && hpAfterDamage <= 0;
  const effectiveFailed = failed || diedOnNormalRun;

  const xpGained = effectiveFailed ? 0 : Math.round(zone.xpReward * getHeroXpMultiplier(adventurer));
  let newXp = (adventurer.xp ?? 0) + xpGained;
  let newLevel = adventurer.level ?? 1;
  let leveledUp = false;
  if (!diedOnNormalRun) {
    while (newXp >= getAdventurerXpNeeded(newLevel)) {
      newXp -= getAdventurerXpNeeded(newLevel);
      newLevel++;
      leveledUp = true;
    }
  }

  const newMaxHp = getAdventurerMaxHp({ ...adventurer, level: newLevel });
  const bonusMaxHp = newMaxHp + getHeroBonusMaxHp({ ...adventurer, level: newLevel });
  const levelsGained = newLevel - (adventurer.level ?? 1);
  const newSkillPoints = (adventurer.skillPoints ?? 0) + levelsGained;
  const buffSlotConsumed = null; // always consumed after a run

  // Zone clears
  const prevClears = (state.worldZoneClears ?? {})[zone.id] ?? 0;
  const newClears = effectiveFailed ? prevClears : Math.min(prevClears + 1, zone.clearsNeeded);
  const zoneCleared = !effectiveFailed && prevClears < zone.clearsNeeded && newClears >= zone.clearsNeeded;
 
  // ── Auto Battle branch ────────────────────────────────────────────────────
  if (mission.autoBattle) {
    const prevAccumLoot = mission.autoBattleLoot ?? [];
    const prevAccumXp = mission.autoBattleXp ?? 0;
    const prevRuns = mission.autoBattleRuns ?? 0;
 
    // If this run failed, the dying run doesn't count for loot
    // Hero dies — 50% of accumulated loot, mission ends, hp goes to 0
    if (failed || hpAfterDamage <= 0) {
      // Accumulate previous successful runs' loot (NOT this dying run's)
      const finalLoot = mergeLoot(prevAccumLoot, []);
      // Apply 50% to accumulated loot
      const halvedLoot = finalLoot.map((l) => ({ ...l, amount: Math.floor(l.amount * 0.5) }));
      // Credit resources
      for (const l of halvedLoot) {
        nextResources[l.resourceKey] = (nextResources[l.resourceKey] ?? 0) + l.amount;
      }
 
      const diedResult = {
          autoBattle: true,
          diedDuringAuto: true,
          successfulRuns: prevRuns,
          zoneName: mission.zoneName,
          loot: halvedLoot,
          xpGained: prevAccumXp + xpGained,
          leveledUp,
          zoneCleared,
          hpLost: rawDamage,
          hpRemaining: 0,
          maxHp: bonusMaxHp,
        };
      const updatedAdv = {
        ...adventurer,
        xp: newXp, level: newLevel, maxHp: bonusMaxHp,
        hp: 0, // dead
        foodBelt: adventurer.foodBelt ?? {},
        buffSlot: buffSlotConsumed,
        mission: null,
        pendingAutoCollect: diedResult,
        skillPoints: newSkillPoints,
        prestigeLevel: adventurer.prestigeLevel ?? 0,
      };
      const next = {
        ...state,
        adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a),
        worldResources: nextResources,
        worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
      };
      return { state: next, result: null };
    }
 
    // Successful run — accumulate loot + XP
    const newAccumLoot = mergeLoot(prevAccumLoot, runLoot);
    const newAccumXp = prevAccumXp + xpGained;
    const newRuns = prevRuns + 1;
 
    // Scavenger (scavenger_t4): 50% chance to find a food item and add it to belt
    let scavengerFoundFood = null;
    if (hasHeroSkill(adventurer, "scavenger_t4") && Math.random() < 0.50) {
      const advForBelt = adventurer;
      const beltCap = getBeltCap(advForBelt);
      const currentBeltTotal = Object.values(advForBelt.foodBelt ?? {}).reduce((s, v) => s + v, 0);
      if (currentBeltTotal < beltCap) {
        // Pick a random food item — only foods the player can actually craft (crop unlocked)
        const foodChoices = ARTISAN_FOOD_LIST.filter((id) => {
          const recipe = PROCESSING_RECIPES[id];
          return recipe && (state.crops?.[recipe.inputCrop] !== undefined);
        });
        if (foodChoices.length > 0) {
          scavengerFoundFood = foodChoices[Math.floor(Math.random() * foodChoices.length)];
        }
      }
    }

    // Check if we can do another run — need food belt to heal between runs
    const currentFoodBelt = { ...(adventurer.foodBelt ?? {}) };
    // Apply scavenger food find to belt before checking availability
    if (scavengerFoundFood) {
      currentFoodBelt[scavengerFoundFood] = (currentFoodBelt[scavengerFoundFood] ?? 0) + 1;
    }
    const beltItems = ARTISAN_FOOD_LIST
      .filter((id) => (currentFoodBelt[id] ?? 0) > 0)
      .map((id) => ({ id, heal: ARTISAN_FOOD_HEAL[id]?.healAmount ?? 0 }))
      .sort((a, b) => a.heal - b.heal); // consume smallest heal first
    const hasBeltFood = beltItems.length > 0;

    // (Relentless handled below after food check)

    // Player requested stop — finish this run then collect cleanly
    if (mission.autoBattleStopRequested) {
      for (const l of newAccumLoot) {
        nextResources[l.resourceKey] = (nextResources[l.resourceKey] ?? 0) + l.amount;
      }
      const stoppedResult = {
          autoBattle: true,
          stoppedByPlayer: true,
          successfulRuns: newRuns,
          zoneName: mission.zoneName,
          loot: newAccumLoot,
          xpGained: newAccumXp,
          leveledUp,
          zoneCleared,
          hpLost: rawDamage,
          hpRemaining: Math.max(0, hpAfterDamage),
          maxHp: bonusMaxHp,
        };
      const updatedAdvStop = {
        ...adventurer,
        xp: newXp, level: newLevel, maxHp: bonusMaxHp,
        hp: leveledUp ? bonusMaxHp : Math.min(hpAfterDamage, bonusMaxHp),
        foodBelt: currentFoodBelt,
        buffSlot: buffSlotConsumed,
        mission: null,
        pendingAutoCollect: stoppedResult,
        skillPoints: newSkillPoints,
        prestigeLevel: adventurer.prestigeLevel ?? 0,
      };
      const nextStop = {
        ...state,
        adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdvStop : a),
        worldResources: nextResources,
        worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
      };
      return { state: nextStop, result: null };
    }

    if (!hasBeltFood) {
      // Out of food — collect everything, mission ends cleanly
      for (const l of newAccumLoot) {
        nextResources[l.resourceKey] = (nextResources[l.resourceKey] ?? 0) + l.amount;
      }
      const outOfFoodResult = {
          autoBattle: true,
          ranOutOfFood: true,
          successfulRuns: newRuns,
          zoneName: mission.zoneName,
          loot: newAccumLoot,
          xpGained: newAccumXp,
          leveledUp,
          zoneCleared,
          hpLost: rawDamage,
          hpRemaining: Math.max(0, hpAfterDamage),
          maxHp: bonusMaxHp,
        };
      const updatedAdv = {
        ...adventurer,
        xp: newXp, level: newLevel, maxHp: bonusMaxHp,
        hp: leveledUp ? bonusMaxHp : Math.min(hpAfterDamage, bonusMaxHp),
        foodBelt: currentFoodBelt,
        buffSlot: buffSlotConsumed,
        mission: null,
        pendingAutoCollect: outOfFoodResult,
        skillPoints: newSkillPoints,
        prestigeLevel: adventurer.prestigeLevel ?? 0,
      };
      const next = {
        ...state,
        adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a),
        worldResources: nextResources,
        worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
      };
      return { state: next, result: null };
    }

    // Relentless (fighter_t4): skip food if HP is at or above 50% after a run
    const relentlessActive = hasHeroSkill(adventurer, "fighter_t4");
    const relentlessSkipFood = relentlessActive && hpAfterDamage >= Math.floor(bonusMaxHp * 0.50);

    // Relentless: if HP is above 50%, skip food consumption and re-queue without eating
    if (relentlessSkipFood) {
      const nextDurationRelentless = getAdventurerMissionDuration({ ...adventurer, level: newLevel, skills }, zone);
      const nextMissionRelentless = {
        ...mission,
        startTime: Date.now(),
        duration: nextDurationRelentless,
        autoBattleRuns: newRuns,
        autoBattleLoot: newAccumLoot,
        autoBattleXp: newAccumXp,
        autoBattleLeveled: leveledUp || (mission.autoBattleLeveled ?? false),
      };
      const updatedAdvRelentless = {
        ...adventurer,
        xp: newXp, level: newLevel, maxHp: bonusMaxHp,
        hp: hpAfterDamage,
        foodBelt: currentFoodBelt,
        buffSlot: buffSlotConsumed,
        mission: nextMissionRelentless,
        skillPoints: newSkillPoints,
        prestigeLevel: adventurer.prestigeLevel ?? 0,
      };
      const nextRelentless = {
        ...state,
        adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdvRelentless : a),
        worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
      };
      return { state: nextRelentless, result: null };
    }

    // Consume one food item (smallest heal first), heal up, queue next run
    const foodToUse = beltItems[0];
    currentFoodBelt[foodToUse.id] = (currentFoodBelt[foodToUse.id] ?? 1) - 1;
    // Apply food heal with Fighter Resilience bonus
    const { multiplier: healMult, flatBonus: healFlat } = getHeroHealBonus(adventurer);
    const foodHeal = Math.round(foodToUse.heal * healMult) + healFlat;
    const hpAfterFood = Math.min(bonusMaxHp, hpAfterDamage + foodHeal);
    const nextDuration = getAdventurerMissionDuration({ ...adventurer, level: newLevel, skills }, zone);
    const nextMission = {
      ...mission,
      startTime: Date.now(),
      duration: nextDuration,
      autoBattleRuns: newRuns,
      autoBattleLoot: newAccumLoot,
      autoBattleXp: newAccumXp,
      autoBattleLeveled: leveledUp || (mission.autoBattleLeveled ?? false),
    };

    const updatedAdv = {
      ...adventurer,
      xp: newXp, level: newLevel, maxHp: bonusMaxHp,
      hp: hpAfterFood,
      foodBelt: currentFoodBelt,
      buffSlot: buffSlotConsumed,
      mission: nextMission,
      skillPoints: newSkillPoints,
      prestigeLevel: adventurer.prestigeLevel ?? 0,
    };
    const next = {
      ...state,
      adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a),
      worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
    };
    // Return null result — still running
    return { state: next, result: null };
  }
 
  // ── Standard single-run branch ────────────────────────────────────────────

  // If hero died on a normal run — hard fail: no loot, no XP, hp=0, mission ends
  if (diedOnNormalRun) {
    const updatedAdvDead = {
      ...adventurer,
      xp: adventurer.xp ?? 0, // no XP on death
      level: adventurer.level ?? 1,
      maxHp: currentMaxHp,
      hp: 0,
      foodBelt: adventurer.foodBelt ?? {},
      buffSlot: buffSlotConsumed,
      mission: null,
      skillPoints: adventurer.skillPoints ?? 0,
      prestigeLevel: adventurer.prestigeLevel ?? 0,
    };
    const nextDead = {
      ...state,
      adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdvDead : a),
      worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: prevClears },
    };
    return {
      state: nextDead,
      result: {
        failed: true,
        died: true,
        autoBattle: false,
        zoneName: mission.zoneName,
        loot: [],
        xpGained: 0,
        leveledUp: false,
        zoneCleared: false,
        newClears: prevClears,
        clearsNeeded: zone.clearsNeeded,
        hpLost: rawDamage,
        hpRemaining: 0,
        maxHp: currentMaxHp,
      },
    };
  }

  // Apply loot to resources (only reach here if not dead and not diedOnNormalRun)
  const finalLootForRun = effectiveFailed ? [] : runLoot;
  for (const l of finalLootForRun) {
    nextResources[l.resourceKey] = (nextResources[l.resourceKey] ?? 0) + l.amount;
  }
 
  const postMissionHp = leveledUp ? bonusMaxHp : Math.min(Math.max(0, hpAfterDamage), bonusMaxHp);
 
  const updatedAdv = {
    ...adventurer,
    xp: newXp, level: newLevel, maxHp: bonusMaxHp,
    hp: Math.max(0, effectiveFailed ? hpAfterDamage : postMissionHp),
    foodBelt: adventurer.foodBelt ?? {},
    buffSlot: buffSlotConsumed,
    mission: null,
    skillPoints: newSkillPoints,
    prestigeLevel: adventurer.prestigeLevel ?? 0,
  };
 
  const next = {
    ...state,
    adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a),
    worldResources: nextResources,
    worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
  };
 
  return {
    state: next,
    result: {
      failed: effectiveFailed,
      autoBattle: false,
      zoneName: mission.zoneName,
      loot: finalLootForRun,
      xpGained,
      leveledUp,
      zoneCleared,
      newClears,
      clearsNeeded: zone.clearsNeeded,
      hpLost: rawDamage,
      hpRemaining: Math.max(0, postMissionHp),
      maxHp: bonusMaxHp,
    },
  };
}

// Costs $100 × max(1, prestigeLevel); sets hp to maxHp
// ─────────────────────────────────────────────────────────────────────────────
export function reviveAdventurer(state, adventurerId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
 
  // Only revive if actually dead
  if ((adventurer.hp ?? adventurer.maxHp) > 0) return state;
 
  const prestige = Math.max(1, adventurer.prestigeLevel ?? 0);
  const cost = 100 * prestige;
  if ((state.cash ?? 0) < cost) return state;
 
  const updatedAdv = { ...adventurer, hp: adventurer.maxHp };
  return {
    ...state,
    cash: (state.cash ?? 0) - cost,
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
  };
}

// Prestige an adventurer:
// - Must have reached Lv8+ (tier 4 skill unlocked as gate)
// - Costs HERO_PRESTIGE_SKILL_COST skill points + cash
// - Resets level to 1, xp to 0, skills to {}, heroClass to null (respec available)
// - Grants 1 skill point for the new run
// - prestigeLevel increments — permanent class bonuses accumulate via prestige bonuses object
// ─────────────────────────────────────────────────────────────────────────────
export function prestigeAdventurer(state, adventurerId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];

  // Must not be dead or on a mission
  if ((adventurer.hp ?? adventurer.maxHp) <= 0) return state;
  if (adventurer.mission) return state;

  // Must have at least HERO_PRESTIGE_SKILL_COST skill points to spend
  if ((adventurer.skillPoints ?? 0) < HERO_PRESTIGE_SKILL_COST) return state;

  // Must have unlocked the t4 skill (auto battle tier) of their class — gate for prestige
  const heroClass = getHeroClass(adventurer);
  if (!heroClass) return state;
  const t4SkillId = `${heroClass}_t4`;
  if (!hasHeroSkill(adventurer, t4SkillId)) return state;

  const currentPrestige = adventurer.prestigeLevel ?? 0;
  const cost = HERO_PRESTIGE_COST_BASE * (currentPrestige + 1);
  if ((state.cash ?? 0) < cost) return state;

  const newPrestigeLevel = currentPrestige + 1;
  const newMaxHp = ADVENTURER_BASE_HP; // resets to base — skills rebuild it

  // Record the last class for "suggested class" on next run
  const prestigeBonuses = { ...(adventurer.prestigeBonuses ?? {}) };
  if (heroClass) {
    prestigeBonuses[heroClass] = (prestigeBonuses[heroClass] ?? 0) + 1;
  }

  const updatedAdv = {
    ...adventurer,
    level: 1,
    xp: 0,
    skills: {},             // full reset — respec available
    heroClass: null,        // class choice unlocked again
    skillPoints: 1,         // 1 skill point granted by prestige
    prestigeLevel: newPrestigeLevel,
    prestigeBonuses,        // track which classes have been run
    maxHp: newMaxHp,
    hp: newMaxHp,
    mission: null,
    // gear/foodBelt/buffSlot all kept
  };

  return {
    ...state,
    cash: (state.cash ?? 0) - cost,
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
  };
}

// ─── Hero skill tree helpers ─────────────────────────────────────────────────

// skills is now stored as { skillId: rank } — rank >= 1 means owned
export function getHeroSkillRank(adventurer, skillId) {
  const skills = adventurer.skills ?? {};
  // Legacy: handle old flat array saves gracefully
  if (Array.isArray(skills)) return skills.includes(skillId) ? 1 : 0;
  return skills[skillId] ?? 0;
}

export function hasHeroSkill(adventurer, skillId) {
  return getHeroSkillRank(adventurer, skillId) > 0;
}

// Returns the class tree the hero has chosen (null if none chosen yet)
export function getHeroClass(adventurer) {
  return adventurer.heroClass ?? null;
}

// Returns true if the hero has auto_battle (any tree's t4 grants it)
export function heroHasAutoBattle(adventurer) {
  return (
    hasHeroSkill(adventurer, "fighter_t4") ||
    hasHeroSkill(adventurer, "mage_t4") ||
    hasHeroSkill(adventurer, "scavenger_t4")
  );
}

// Computed stat helpers
export function getHeroBonusMaxHp(adventurer) {
  let bonus = 0;
  if (hasHeroSkill(adventurer, "fighter_t1")) bonus += 20;
  const t5Rank = getHeroSkillRank(adventurer, "fighter_t5");
  bonus += t5Rank * 8;
  return bonus;
}

export function getHeroHealBonus(adventurer) {
  // Fighter resilience (+20% healing) + iron rations (+3 per rank)
  const resilienceBonus = hasHeroSkill(adventurer, "fighter_t2") ? 0.20 : 0;
  const ironRationsBonus = getHeroSkillRank(adventurer, "fighter_t6") * 3;
  return { multiplier: 1 + resilienceBonus, flatBonus: ironRationsBonus };
}

export function getHeroEvasionChance(adventurer) {
  let chance = 0;
  if (hasHeroSkill(adventurer, "scavenger_t2")) chance += 0.20;
  chance += getHeroSkillRank(adventurer, "scavenger_t6") * 0.04;
  return Math.min(chance, 0.75); // cap at 75%
}

export function getHeroMinLootBonus(adventurer) {
  let bonus = 0;
  if (hasHeroSkill(adventurer, "scavenger_t1")) bonus += 1;
  bonus += getHeroSkillRank(adventurer, "scavenger_t5");
  return bonus;
}

export function getHeroDurationMultiplier(adventurer) {
  let reduction = 0;
  if (hasHeroSkill(adventurer, "mage_t1")) reduction += 0.15;
  if (hasHeroSkill(adventurer, "mage_t4")) reduction += 0.20; // auto-battle stacking bonus — applied per run in engine
  reduction += getHeroSkillRank(adventurer, "mage_t5") * 0.03;
  return Math.max(0.25, 1 - reduction); // floor at 25% of base
}

export function getHeroXpMultiplier(adventurer) {
  let bonus = 0;
  if (hasHeroSkill(adventurer, "mage_t2")) bonus += 0.15;
  bonus += getHeroSkillRank(adventurer, "mage_t6") * 0.10;
  return 1 + bonus;
}

// Returns true if this hero's tree has cross-system effect active
export function heroHasCrossEffect(adventurer, effectId) {
  const effectMap = {
    bread_speed:    "fighter_t3",
    kitchen_bonus:  "mage_t3",
    market_bonus:   "scavenger_t3",
  };
  const skillId = effectMap[effectId];
  return skillId ? hasHeroSkill(adventurer, skillId) : false;
}

// Returns true if ANY adventurer has a given cross-system effect
export function anyHeroHasCrossEffect(state, effectId) {
  return (state.adventurers ?? []).some((a) => heroHasCrossEffect(a, effectId));
}

// Returns 0.7 (30% faster) if bread_speed active, else 1.0
export function getHeroBreadSpeedMultiplier(state) {
  return anyHeroHasCrossEffect(state, "bread_speed") ? 0.70 : 1.0;
}

// Returns 1.10 (10% bonus) if market_bonus active, else 1.0
export function getHeroMarketBonus(state) {
  return anyHeroHasCrossEffect(state, "market_bonus") ? 1.10 : 1.0;
}

// Returns chance (0.20) if kitchen_bonus active, else 0
export function getHeroKitchenBonusChance(state) {
  return anyHeroHasCrossEffect(state, "kitchen_bonus") ? 0.20 : 0;
}

// Validation: can a skill point be spent on a given skill?
export function canSpendHeroSkillPoint(adventurer, skillId, prestigeLevel) {
  const def = HERO_SKILL_DEFS[skillId];
  if (!def) return false;
  if ((adventurer.skillPoints ?? 0) < 1) return false;
  if ((adventurer.level ?? 1) < def.requiredLevel) return false;

  const currentRank = getHeroSkillRank(adventurer, skillId);
  if (currentRank >= def.maxRank) return false; // already maxed

  const heroClass = getHeroClass(adventurer);
  const pLevel = prestigeLevel ?? 0;

  // Determine which tree this skill belongs to
  const skillTree = Object.entries(HERO_SKILL_TREES).find(([, skills]) =>
    skills.some((s) => s.id === skillId)
  )?.[0];
  if (!skillTree) return false;

  // Tier-1 skills: choosing a class — only if no class chosen yet
  if (def.tier === 1) {
    if (heroClass !== null && heroClass !== undefined) return false; // already classed
    return true;
  }

  // All other tiers: must be in hero's primary class
  if (skillTree === heroClass) {
    // Must have previous tier unlocked
    const treeDefs = HERO_SKILL_TREES[heroClass];
    const prevDef = treeDefs.find((s) => s.tier === def.tier - 1);
    if (prevDef && getHeroSkillRank(adventurer, prevDef.id) === 0) return false;
    return true;
  }

  // Cross-tree dipping for second tree
  if (heroClass && skillTree !== heroClass) {
    if (pLevel < HERO_DIP_TREE_PRESTIGE_TIER1) return false;
    if (def.tier === 1) return true; // tier 1 dip allowed at P5+
    if (def.tier === 2 && pLevel >= HERO_DIP_TREE_PRESTIGE_TIER2) return true;
    return false;
  }

  return false;
}

// Spend a skill point to unlock or rank up a skill
export function spendSkillPoint(state, adventurerId, skillId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  let adventurer = state.adventurers[advIdx];
  const pLevel = adventurer.prestigeLevel ?? 0;

  if (!canSpendHeroSkillPoint(adventurer, skillId, pLevel)) return state;

  const def = HERO_SKILL_DEFS[skillId];
  const currentRank = getHeroSkillRank(adventurer, skillId);
  const newRank = currentRank + 1;

  // Migrate legacy flat-array skills to map format
  const currentSkillMap = Array.isArray(adventurer.skills ?? [])
    ? Object.fromEntries((adventurer.skills ?? []).map((id) => [id, 1]))
    : { ...(adventurer.skills ?? {}) };

  const newSkillMap = { ...currentSkillMap, [skillId]: newRank };

  // If this is a class-unlock (tier 1), set heroClass
  let newHeroClass = adventurer.heroClass ?? null;
  if (def.tier === 1 && def.classUnlock) {
    newHeroClass = def.classUnlock;
  }

  let updatedAdv = {
    ...adventurer,
    skillPoints: (adventurer.skillPoints ?? 0) - 1,
    skills: newSkillMap,
    heroClass: newHeroClass,
  };

  // Apply immediate HP bonus for fighter_t1 and fighter_t5
  if (skillId === "fighter_t1") {
    const newMaxHp = (updatedAdv.maxHp ?? getAdventurerMaxHp(updatedAdv)) + 20;
    updatedAdv = { ...updatedAdv, maxHp: newMaxHp };
  }
  if (skillId === "fighter_t5") {
    const newMaxHp = (updatedAdv.maxHp ?? getAdventurerMaxHp(updatedAdv)) + 8;
    updatedAdv = { ...updatedAdv, maxHp: newMaxHp };
  }

  return { ...state, adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a) };
}

// Helper: compute total gear tier across all slots, respecting instanced item upgrade tiers
function computeTotalGearTier(equippedGear, equippedInstanceId, forgeGoodsInstanced) {
  const instanced = forgeGoodsInstanced ?? [];
  return Object.entries(equippedGear ?? {}).reduce((sum, [slot, key]) => {
    if (!key) return sum;
    const instId = (equippedInstanceId ?? {})[slot];
    if (instId) {
      const inst = instanced.find((i) => i.id === instId);
      return sum + (inst?.upgradeTier ?? 0);
    }
    const r = Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === key);
    return sum + (r?.gearTier ?? 0);
  }, 0);
}

export function equipAdventurer(state, adventurerId, slot, itemKey, instanceId = null) {
  // slot: "weapon" | "armour" | "body"
  const VALID_SLOTS = ["weapon", "armour", "body"];
  if (!VALID_SLOTS.includes(slot)) return state;

  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;

  const recipe = Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === itemKey);
  if (!recipe || recipe.category === "consumable" || recipe.category === "component") return state;

  const INSTANCED_KEYS = ["master_sword", "tower_shield", "plate_armor"];
  const isInstanced = INSTANCED_KEYS.includes(itemKey);

  const adventurer = state.adventurers[advIdx];
  const currentGear = adventurer.equippedGear ?? { weapon: null, armour: null, body: null };
  const currentInstanceIds = adventurer.equippedInstanceId ?? {};

  let nextGoods = { ...(state.forgeGoods ?? {}) };
  let nextInstanced = [...(state.forgeGoodsInstanced ?? [])];

  if (isInstanced) {
    // Must supply a valid instanceId
    const inst = nextInstanced.find((i) => i.id === instanceId && i.key === itemKey);
    if (!inst) return state;

    // Unequip current instanced item in this slot — return it to pool (remove _equippedBy)
    const oldInstId = currentInstanceIds[slot];
    if (oldInstId) {
      nextInstanced = nextInstanced.map((i) =>
        i.id === oldInstId ? { ...i, _equippedBy: undefined } : i
      );
    } else if (currentGear[slot] && !INSTANCED_KEYS.includes(currentGear[slot])) {
      // Was a flat item — refund it
      nextGoods = { ...nextGoods, [currentGear[slot]]: (nextGoods[currentGear[slot]] ?? 0) + 1 };
    }

    // Mark instance as equipped
    nextInstanced = nextInstanced.map((i) =>
      i.id === instanceId ? { ...i, _equippedBy: adventurerId } : i
    );

    const newGear = { ...currentGear, [slot]: itemKey };
    const newInstanceIds = { ...currentInstanceIds, [slot]: instanceId };
    const totalGearTier = computeTotalGearTier(newGear, newInstanceIds, nextInstanced);
    const updatedAdv = { ...adventurer, equippedGear: newGear, equippedInstanceId: newInstanceIds, gear: totalGearTier };
    return {
      ...state,
      adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
      forgeGoods: nextGoods,
      forgeGoodsInstanced: nextInstanced,
    };
  } else {
    // Non-instanced path — original logic
    if ((nextGoods[itemKey] ?? 0) < 1) return state;

    nextGoods = { ...nextGoods, [itemKey]: nextGoods[itemKey] - 1 };
    const oldItemKey = currentGear[slot];
    // Unequip old item in slot
    if (oldItemKey) {
      const oldInstId = currentInstanceIds[slot];
      if (oldInstId) {
        // Old was instanced — return to pool
        nextInstanced = nextInstanced.map((i) =>
          i.id === oldInstId ? { ...i, _equippedBy: undefined } : i
        );
      } else {
        nextGoods = { ...nextGoods, [oldItemKey]: (nextGoods[oldItemKey] ?? 0) + 1 };
      }
    }

    const newGear = { ...currentGear, [slot]: itemKey };
    const newInstanceIds = { ...currentInstanceIds, [slot]: null };
    const totalGearTier = computeTotalGearTier(newGear, newInstanceIds, nextInstanced);
    const updatedAdv = { ...adventurer, equippedGear: newGear, equippedInstanceId: newInstanceIds, gear: totalGearTier };
    return {
      ...state,
      adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
      forgeGoods: nextGoods,
      forgeGoodsInstanced: nextInstanced,
    };
  }
}

export function unequipAdventurer(state, adventurerId, slot) {
  const VALID_SLOTS = ["weapon", "armour", "body"];
  if (!VALID_SLOTS.includes(slot)) return state;

  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  const currentGear = adventurer.equippedGear ?? { weapon: null, armour: null, body: null };
  const currentInstanceIds = adventurer.equippedInstanceId ?? {};
  const itemKey = currentGear[slot];
  if (!itemKey) return state;

  const INSTANCED_KEYS = ["master_sword", "tower_shield", "plate_armor"];
  let nextGoods = { ...(state.forgeGoods ?? {}) };
  let nextInstanced = [...(state.forgeGoodsInstanced ?? [])];

  const instId = currentInstanceIds[slot];
  if (instId && INSTANCED_KEYS.includes(itemKey)) {
    // Return instanced item to pool
    nextInstanced = nextInstanced.map((i) =>
      i.id === instId ? { ...i, _equippedBy: undefined } : i
    );
  } else {
    nextGoods = { ...nextGoods, [itemKey]: (nextGoods[itemKey] ?? 0) + 1 };
  }

  const newGear = { ...currentGear, [slot]: null };
  const newInstanceIds = { ...currentInstanceIds, [slot]: null };
  const totalGearTier = computeTotalGearTier(newGear, newInstanceIds, nextInstanced);

  const updatedAdv = { ...adventurer, equippedGear: newGear, equippedInstanceId: newInstanceIds, gear: totalGearTier };
  return {
    ...state,
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
    forgeGoods: nextGoods,
    forgeGoodsInstanced: nextInstanced,
  };
}

// Use a potion on an adventurer
// Belt cap: food belt only
export function getBeltCap(adventurer) {
  let cap = 3;
  // belt_capacity legacy skill removed — slots now come from gear and prestige
  cap += (adventurer.prestigeLevel ?? 0); // +1 per prestige
  // Body armor: add foodSlotBonus from equipped body recipe
  const bodyKey = adventurer.equippedGear?.body ?? null;
  const bodyRecipe = bodyKey ? Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === bodyKey) : null;
  cap += bodyRecipe?.foodSlotBonus ?? 0;
  return cap;
}

// ─── Artisan Food as Heal Items ────────────────────────────────────────────────

export function giveArtisanFood(state, adventurerId, foodId) {
  if (!ARTISAN_FOOD_LIST.includes(foodId)) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const artisan = state.artisan ?? {};
  if ((artisan[foodId] ?? 0) < 1) return state;
  const adventurer = state.adventurers[advIdx];
  const belt = adventurer.foodBelt ?? {};
  const foodTotal = Object.values(belt).reduce((s, v) => s + v, 0);
  if (foodTotal >= getBeltCap(adventurer)) return state;
  const updatedAdv = { ...adventurer, foodBelt: { ...belt, [foodId]: (belt[foodId] ?? 0) + 1 } };
  return {
    ...state,
    artisan: { ...artisan, [foodId]: artisan[foodId] - 1 },
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
  };
}

// ─── Buff Slot (omelette/cheese) ──────────────────────────────────────────────

export function giveBuffItem(state, adventurerId, buffId) {
  if (!ADVENTURER_BUFF_LIST.includes(buffId)) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  // Only one buff slot — must be empty
  if (adventurer.buffSlot) return state;
  const animalGoods = state.animalGoods ?? {};
  if ((animalGoods[buffId] ?? 0) < 1) return state;
  return {
    ...state,
    animalGoods: { ...animalGoods, [buffId]: animalGoods[buffId] - 1 },
    adventurers: state.adventurers.map((a, i) => i === advIdx ? { ...a, buffSlot: buffId } : a),
  };
}

export function removeBuffItem(state, adventurerId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  const buffId = adventurer.buffSlot;
  if (!buffId) return state;
  return {
    ...state,
    animalGoods: { ...(state.animalGoods ?? {}), [buffId]: ((state.animalGoods ?? {})[buffId] ?? 0) + 1 },
    adventurers: state.adventurers.map((a, i) => i === advIdx ? { ...a, buffSlot: null } : a),
  };
}

export function removeArtisanFood(state, adventurerId, foodId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  const belt = adventurer.foodBelt ?? {};
  if ((belt[foodId] ?? 0) < 1) return state;
  const updatedBelt = { ...belt, [foodId]: belt[foodId] - 1 };
  const updatedAdv = { ...adventurer, foodBelt: updatedBelt };
  return {
    ...state,
    artisan: { ...(state.artisan ?? {}), [foodId]: ((state.artisan ?? {})[foodId] ?? 0) + 1 },
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
  };
}

export function useArtisanFood(state, adventurerId, foodId) {
  const def = ARTISAN_FOOD_HEAL[foodId];
  if (!def) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  const belt = adventurer.foodBelt ?? {};
  if ((belt[foodId] ?? 0) < 1) return state;
  const maxHp = adventurer.maxHp ?? getAdventurerMaxHp(adventurer);
  if ((adventurer.hp ?? maxHp) >= maxHp) return state;
  const { multiplier: healMult, flatBonus: healFlat } = getHeroHealBonus(adventurer);
  const effectiveHeal = Math.round(def.healAmount * healMult) + healFlat;
  const newHp = Math.min(maxHp, (adventurer.hp ?? maxHp) + effectiveHeal);
  const updatedBelt = { ...belt, [foodId]: belt[foodId] - 1 };
  const updatedAdv = { ...adventurer, hp: newHp, foodBelt: updatedBelt };
  return { ...state, adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a) };
}



// Tick adventurer regen (call from main tick, not forge tick)
export function tickAdventurerRegen(state, dtSeconds) {
  if (!(state.adventurers ?? []).length) return state;
  const updated = state.adventurers.map((adv) => {
    const trueMax = (adv.maxHp ?? getAdventurerMaxHp(adv)) + getHeroBonusMaxHp(adv); // ← was just adv.maxHp
    const hp = adv.hp ?? trueMax;
    if (hp <= 0) return adv;
    if (adv.mission) return adv;
    if (hp >= trueMax) return adv;
    const newHp = Math.min(trueMax, hp + ADVENTURER_REGEN_PER_SECOND * dtSeconds);
    return { ...adv, hp: newHp };
  });
  return { ...state, adventurers: updated };
}

// ─── Auto-tick adventurer missions ───────────────────────────────────────────
export function requestAutoBattleStop(state, adventurerId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  if (!adventurer.mission?.autoBattle) return state;
  const updatedAdv = {
    ...adventurer,
    mission: { ...adventurer.mission, autoBattleStopRequested: true },
  };
  const next = { ...state, adventurers: [...state.adventurers] };
  next.adventurers[advIdx] = updatedAdv;
  return next;
}

export function tickAdventurerMissions(state) {
  let next = state;
  for (const adv of (state.adventurers ?? [])) {
    // Already waiting for player to collect — don't re-process
    if (adv.pendingAutoCollect) continue;
    if (!adv.mission?.autoBattle) continue;
    const elapsed = (Date.now() - adv.mission.startTime) / 1000;
    if (elapsed < adv.mission.duration) continue;
    const { state: afterState, result } = returnAdventurer(next, adv.id);
    next = afterState;
    // result is now always null for auto-battle endings — parked on adventurer instead
    if (result) {
      next = { ...next, pendingAutoBattleResult: { ...result, adventurerId: adv.id } };
    }
  }
  return next;
}

// ─── World Workers ─────────────────────────────────────────────────────────────

export function tickWorldWorkers(state, dtSeconds) {
  const workers = state.worldWorkers ?? [];
  if (workers.length === 0) return state;
  let nextResources = { ...(state.worldResources ?? {}) };
  const updatedWorkers = workers.map((w) => {
    const zone = WORLD_ZONES[w.zoneId];
    if (!zone) return w;
    const ratePerSecond = (zone.workerYieldPerMinute ?? 2) / 60;
    const accumulated = (w.accumulated ?? 0) + ratePerSecond * dtSeconds;
    const gained = Math.floor(accumulated);
    if (gained > 0) {
      const resourceKey = Object.keys(WORLD_RESOURCES).find(
        (k) => WORLD_RESOURCES[k].name.toLowerCase() === zone.workerResource?.toLowerCase()
      ) ?? zone.loot?.[0]?.resourceKey;
      if (resourceKey) nextResources[resourceKey] = (nextResources[resourceKey] ?? 0) + gained;
    }
    return { ...w, accumulated: accumulated - gained };
  });
  return { ...state, worldWorkers: updatedWorkers, worldResources: nextResources };
}

export function hireWorldWorker(state, zoneId) {
  const zone = WORLD_ZONES[zoneId];
  if (!zone) return state;
  const clears = (state.worldZoneClears ?? {})[zoneId] ?? 0;
  if (clears < zone.clearsNeeded) return state;
  if ((state.worldWorkers ?? []).some((w) => w.zoneId === zoneId)) return state;
  if ((state.cash ?? 0) < WORLD_WORKER_HIRE_COST) return state;
  const worker = {
    id: "ww_" + Math.random().toString(36).slice(2, 8),
    zoneId,
    name: zone.name + " Worker",
    accumulated: 0,
  };
  return {
    ...state,
    cash: state.cash - WORLD_WORKER_HIRE_COST,
    worldWorkers: [...(state.worldWorkers ?? []), worker],
  };
}

export function fireWorldWorker(state, zoneId) {
  return { ...state, worldWorkers: (state.worldWorkers ?? []).filter((w) => w.zoneId !== zoneId) };
}

// ─── Forge Engine ─────────────────────────────────────────────────────────────

export function getForgeWorkerHireCost(state) {
  const count = (state.forgeWorkers ?? []).length;
  return Math.floor(FORGE_WORKER_HIRE_COST * Math.pow(FORGE_WORKER_HIRE_MULTIPLIER, count));
}

export function getForgeEffectiveSeconds(worker, recipe) {
  let secs = recipe.seconds;
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("forge_speed_1")) secs *= 0.7;
  if (upgrades.includes("forge_speed_2")) secs *= 0.5;
  return Math.max(1, Math.round(secs));
}

export function isForgeWorkerIdle(worker) {
  return !worker.busy && !worker.recipeId;
}

export function hireForgeWorker(state) {
  const cost = getForgeWorkerHireCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const worker = {
    id: "fw_" + Math.random().toString(36).slice(2, 8),
    upgrades: [],
    recipeId: null,
    elapsedSeconds: 0,
    totalSeconds: 0,
    busy: false,
    autoRestart: false,
    lastRecipeId: null,
  };
  return { ...state, cash: state.cash - cost, forgeWorkers: [...(state.forgeWorkers ?? []), worker] };
}

export function fireForgeWorker(state, workerId) {
  return { ...state, forgeWorkers: (state.forgeWorkers ?? []).filter((w) => w.id !== workerId) };
}

export function assignForgeWorkerRecipe(state, workerId, recipeId) {
  const recipe = FORGE_RECIPES[recipeId];
  if (!recipe) return state;
  // Check resources — inputs may come from worldResources OR forgeGoods (for gear upgrades)
  const resources = state.worldResources ?? {};
  const forgeGoods = state.forgeGoods ?? {};
  for (const [key, needed] of Object.entries(recipe.inputs)) {
    const have = (resources[key] ?? 0) + (forgeGoods[key] ?? 0);
    if (have < needed) return state;
  }
  // Deduct inputs — prefer forgeGoods first for gear items, then worldResources
  const nextResources = { ...resources };
  const nextForgeGoods = { ...forgeGoods };
  for (const [key, needed] of Object.entries(recipe.inputs)) {
    let remaining = needed;
    const fromForge = Math.min(remaining, nextForgeGoods[key] ?? 0);
    nextForgeGoods[key] = (nextForgeGoods[key] ?? 0) - fromForge;
    remaining -= fromForge;
    if (remaining > 0) {
      nextResources[key] = (nextResources[key] ?? 0) - remaining;
    }
  }
  const totalSeconds = getForgeEffectiveSeconds(
    (state.forgeWorkers ?? []).find((w) => w.id === workerId) ?? {},
    recipe
  );
  return {
    ...state,
    worldResources: nextResources,
    forgeGoods: nextForgeGoods,
    forgeWorkers: (state.forgeWorkers ?? []).map((w) =>
      w.id === workerId ? { ...w, recipeId, elapsedSeconds: 0, totalSeconds, busy: true, lastRecipeId: recipeId } : w
    ),
  };
}

export function cancelForgeWorkerRecipe(state, workerId) {
  const worker = (state.forgeWorkers ?? []).find((w) => w.id === workerId);
  if (!worker?.recipeId) return state;
  // Refund inputs — gear items go back to forgeGoods, raw materials to worldResources
  const recipe = FORGE_RECIPES[worker.recipeId];
  const nextResources = { ...(state.worldResources ?? {}) };
  const nextForgeGoods = { ...(state.forgeGoods ?? {}) };
  if (recipe) {
    for (const [key, needed] of Object.entries(recipe.inputs)) {
      // If this key is a forge output (gear item), refund to forgeGoods
      const isForgeItem = Object.values(FORGE_RECIPES).some((r) => r.output.resourceKey === key);
      if (isForgeItem) {
        nextForgeGoods[key] = (nextForgeGoods[key] ?? 0) + needed;
      } else {
        nextResources[key] = (nextResources[key] ?? 0) + needed;
      }
    }
  }
  return {
    ...state,
    worldResources: nextResources,
    forgeGoods: nextForgeGoods,
    forgeWorkers: (state.forgeWorkers ?? []).map((w) =>
      w.id === workerId ? { ...w, recipeId: null, elapsedSeconds: 0, totalSeconds: 0, busy: false } : w
    ),
  };
}

export function upgradeForgeWorker(state, workerId, upgradeId) {
  const upgrade = FORGE_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return state;
  if ((state.cash ?? 0) < upgrade.cost) return state;
  const worker = (state.forgeWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  if ((worker.upgrades ?? []).includes(upgradeId)) return state;
  if (upgrade.requires && !(worker.upgrades ?? []).includes(upgrade.requires)) return state;
  return {
    ...state,
    cash: state.cash - upgrade.cost,
    forgeWorkers: (state.forgeWorkers ?? []).map((w) =>
      w.id === workerId ? { ...w, upgrades: [...(w.upgrades ?? []), upgradeId] } : w
    ),
  };
}

// ─── Instanced Gear Upgrade ───────────────────────────────────────────────────
// Upgrades a specific forgeGoodsInstanced item by bumping its upgradeTier.
// Cost: 50 × current tier mana crystals + $1000 × current tier cash
export function upgradeForgeInstance(state, instanceId) {
  const instIdx = (state.forgeGoodsInstanced ?? []).findIndex((i) => i.id === instanceId);
  if (instIdx === -1) return state;
  const inst = state.forgeGoodsInstanced[instIdx];

  // Cannot upgrade while equipped — must unequip first
  if (inst._equippedBy) return state;

  const currentTier = inst.upgradeTier ?? 3;
  const crystalCost = 50 * currentTier;
  const cashCost = 1000 * currentTier;
  const titanCoreCost = 1;

  if ((state.worldResources?.mana_crystal ?? 0) < crystalCost) return state;
  if ((state.cash ?? 0) < cashCost) return state;
  if ((state.worldResources?.titan_core ?? 0) < titanCoreCost) return state;

  const nextInstanced = (state.forgeGoodsInstanced ?? []).map((i, idx) =>
    idx === instIdx ? { ...i, upgradeTier: currentTier + 1 } : i
  );
  return {
    ...state,
    cash: (state.cash ?? 0) - cashCost,
    worldResources: {
      ...(state.worldResources ?? {}),
      mana_crystal: (state.worldResources?.mana_crystal ?? 0) - crystalCost,
      titan_core: (state.worldResources?.titan_core ?? 0) - titanCoreCost,
    },
    forgeGoodsInstanced: nextInstanced,
  };
}

export function toggleForgeWorkerAutoRestart(state, workerId) {
  return {
    ...state,
    forgeWorkers: (state.forgeWorkers ?? []).map((w) =>
      w.id === workerId ? { ...w, autoRestart: !w.autoRestart } : w
    ),
  };
}

// Called each tick — advances forge worker timers
export function tickForgeWorkers(state, dtSeconds) {
  if (!(state.forgeWorkers ?? []).length) return state;

  let nextGoods = { ...(state.forgeGoods ?? {}) };
  let nextResources = { ...(state.worldResources ?? {}) };
  const nextWorkers = (state.forgeWorkers ?? []).map((worker) => {
    if (!worker.busy || !worker.recipeId) return worker;
    const newElapsed = (worker.elapsedSeconds ?? 0) + dtSeconds;
    if (newElapsed < worker.totalSeconds) {
      return { ...worker, elapsedSeconds: newElapsed };
    }
    // Craft complete
    const recipe = FORGE_RECIPES[worker.recipeId];
    if (recipe) {
      nextGoods[recipe.output.resourceKey] = (nextGoods[recipe.output.resourceKey] ?? 0) + 1;
    }
    // Auto-restart?
    const hasAutoUpgrade = (worker.upgrades ?? []).includes("forge_auto");
    if (worker.autoRestart && hasAutoUpgrade && worker.lastRecipeId) {
      const restartRecipe = FORGE_RECIPES[worker.lastRecipeId];
      if (restartRecipe) {
        // Check if resources are available (nextGoods reflects goods mid-tick, use nextResources below)
        const canRestart = Object.entries(restartRecipe.inputs).every(
          ([key, needed]) => (nextResources[key] ?? 0) >= needed
        );
        if (canRestart) {
          for (const [key, needed] of Object.entries(restartRecipe.inputs)) {
            nextResources[key] = (nextResources[key] ?? 0) - needed;
          }
          const newTotal = getForgeEffectiveSeconds(worker, restartRecipe);
          return { ...worker, recipeId: worker.lastRecipeId, elapsedSeconds: 0, totalSeconds: newTotal, busy: true };
        }
      }
    }
    return { ...worker, recipeId: null, elapsedSeconds: 0, totalSeconds: 0, busy: false };
  });

  return { ...state, forgeWorkers: nextWorkers, forgeGoods: nextGoods, worldResources: nextResources };
}

// ─── Boss Fight Engine ────────────────────────────────────────────────────────

// Returns the hero class for boss ability purposes
// Reads heroClass (set by skill tree) — falls back to adventurer.class for pre-skill heroes
function getHeroBossClass(adventurer) {
  return adventurer.heroClass ?? adventurer.class ?? null;
}

// Resolve a boss def — handles both static BOSS_DEFS and procedural infinite bosses
// Infinite boss IDs are formatted as "infinite_N" where N is the 1-indexed wave number
function getBossDef(bossId) {
  if (BOSS_DEFS[bossId]) return BOSS_DEFS[bossId];
  const m = /^infinite_(\d+)$/.exec(bossId);
  if (m) return generateInfiniteBoss(parseInt(m[1], 10));
  return null;
}

// Damage a hero deals to the boss per tick
function getHeroBossDamage(adventurer, bossId) {
  const level = adventurer.level ?? 1;
  const gearTier = adventurer.gear ?? 0;
  const base = (adventurer.bossFightAbility?.tripleNextDamage ? 3 : 1);
  const def = getBossDef(bossId) ?? BOSS_DEFS[Object.keys(BOSS_DEFS)[0]];
  const dmg = (def?.heroDamageBase ?? 8)
    + (level - 1) * BOSS_HERO_DAMAGE_LEVEL_SCALE
    + gearTier * BOSS_HERO_DAMAGE_GEAR_SCALE;
  return Math.round(dmg * base);
}

// Initialise boss fight state (called when boss unlocks or after victory)
export function initBossFight(state, bossId) {
  const def = getBossDef(bossId);
  if (!def) return state;
  return {
    ...state,
    bossFight: {
      bossId,
      bossHp: def.maxHp,
      bossMaxHp: def.maxHp,
      assignedHeroIds: [],
      tickAccum: 0,
      blindNextTick: false,      // scavenger ability queued
      phase: "idle",             // "idle" | "fighting" | "defeated"
      pendingResult: null,       // set on victory, cleared after UI reads it
      infiniteWave: def.infiniteWave ?? null,
    },
  };
}

// Assign a hero to the boss fight (removes from mission flow)
export function assignHeroToBoss(state, heroId) {
  const bossFight = state.bossFight;
  if (!bossFight || bossFight.phase === "defeated") return state;
  const hero = (state.adventurers ?? []).find((a) => a.id === heroId);
  if (!hero || hero.mission || hero.bossAssigned) return state;
  if ((hero.hp ?? hero.maxHp ?? 40) <= 0) return state; // dead hero can't join
  if ((bossFight.assignedHeroIds ?? []).includes(heroId)) return state;

  const updatedAdv = { ...hero, bossAssigned: true };
  return {
    ...state,
    adventurers: state.adventurers.map((a) => a.id === heroId ? updatedAdv : a),
    bossFight: {
      ...bossFight,
      assignedHeroIds: [...(bossFight.assignedHeroIds ?? []), heroId],
      phase: "fighting",
    },
  };
}

// Remove a hero from the boss fight (they return to idle, keep their current HP)
export function unassignHeroFromBoss(state, heroId) {
  const bossFight = state.bossFight;
  if (!bossFight) return state;
  const updatedAdv = (state.adventurers ?? []).map((a) =>
    a.id === heroId ? { ...a, bossAssigned: false, bossFightAbility: null } : a
  );
  const newIds = (bossFight.assignedHeroIds ?? []).filter((id) => id !== heroId);
  return {
    ...state,
    adventurers: updatedAdv,
    bossFight: {
      ...bossFight,
      assignedHeroIds: newIds,
      phase: newIds.length > 0 ? bossFight.phase : "idle",
    },
  };
}

// Use a hero's boss fight ability
export function useBossAbility(state, heroId) {
  const bossFight = state.bossFight;
  if (!bossFight || bossFight.phase !== "fighting") return state;
  const hero = (state.adventurers ?? []).find((a) => a.id === heroId);
  if (!hero || !hero.bossAssigned) return state;

  const heroClass = getHeroBossClass(hero);
  const abilityDef = BOSS_ABILITIES[heroClass];
  if (!abilityDef) return state;

  const ability = hero.bossFightAbility ?? {};
  if ((ability.cooldownRemaining ?? 0) > 0) return state; // still on cooldown

  let nextState = state;
  let updatedAbility = { ...ability, cooldownRemaining: abilityDef.cooldown };

  if (abilityDef.effect === "triple_damage") {
    updatedAbility.tripleNextDamage = true;
  } else if (abilityDef.effect === "heal_party") {
    // Immediately heal all assigned living heroes
    const healAmount = abilityDef.healAmount ?? 25;
    const healedAdventurers = (nextState.adventurers ?? []).map((a) => {
      if (!(bossFight.assignedHeroIds ?? []).includes(a.id)) return a;
      if ((a.hp ?? 0) <= 0) return a;
      const maxHp = a.maxHp ?? (40 + ((a.level ?? 1) - 1) * 8);
      return { ...a, hp: Math.min(maxHp, (a.hp ?? maxHp) + healAmount) };
    });
    nextState = { ...nextState, adventurers: healedAdventurers };
  } else if (abilityDef.effect === "blind_boss") {
    nextState = {
      ...nextState,
      bossFight: { ...nextState.bossFight, blindNextTick: true },
    };
  }

  const updatedAdventurers = (nextState.adventurers ?? []).map((a) =>
    a.id === heroId ? { ...a, bossFightAbility: updatedAbility } : a
  );
  return { ...nextState, adventurers: updatedAdventurers };
}

// Main boss fight tick — call from the main game loop each second
export function tickBossFight(state, dtSeconds) {
  const bossFight = state.bossFight;
  if (!bossFight || bossFight.phase === "defeated") return state;

  // Regen boss HP when idle (no heroes assigned / all left)
  if (bossFight.phase === "idle") {
    const bossDef = getBossDef(bossFight.bossId);
    const regenPerSecond = (bossDef?.maxHp ?? 1200) * 0.005;
    const newHp = Math.min(bossFight.bossMaxHp, (bossFight.bossHp ?? 0) + regenPerSecond * dtSeconds);
    if (newHp === bossFight.bossHp) return state;
    return { ...state, bossFight: { ...bossFight, bossHp: newHp } };
  }

  if (bossFight.phase !== "fighting") return state;

  const assignedIds = bossFight.assignedHeroIds ?? [];
  const livingAssigned = assignedIds.filter((id) => {
    const h = (state.adventurers ?? []).find((a) => a.id === id);
    return h && (h.hp ?? 0) > 0;
  });

  // If no heroes alive (or none assigned), boss regens HP — making solo wins nearly impossible
  if (livingAssigned.length === 0) {
    const bossDef = getBossDef(bossFight.bossId);
    const regenPerSecond = (bossDef?.maxHp ?? 1200) * 0.005; // 0.5% max HP per second
    const newHp = Math.min(bossFight.bossMaxHp, (bossFight.bossHp ?? 0) + regenPerSecond * dtSeconds);
    if (newHp === bossFight.bossHp) return state; // no change needed
    return { ...state, bossFight: { ...bossFight, bossHp: newHp } };
  }

  // Tick down ability cooldowns each second
  let nextAdventurers = (state.adventurers ?? []).map((a) => {
    if (!a.bossFightAbility || !assignedIds.includes(a.id)) return a;
    const cd = a.bossFightAbility.cooldownRemaining ?? 0;
    if (cd <= 0) return a;
    return { ...a, bossFightAbility: { ...a.bossFightAbility, cooldownRemaining: cd - dtSeconds } };
  });

  // Accumulate time — damage fires every BOSS_TICK_INTERVAL seconds
  const newAccum = (bossFight.tickAccum ?? 0) + dtSeconds;
  if (newAccum < BOSS_TICK_INTERVAL) {
    return {
      ...state,
      adventurers: nextAdventurers,
      bossFight: { ...bossFight, tickAccum: newAccum },
    };
  }

  // ── Damage tick fires ────────────────────────────────────────────────────
  let nextBossHp = bossFight.bossHp;
  const bossDef = getBossDef(bossFight.bossId);

  // Track participation: increment tick count for each living assigned hero
  const prevHeroTicks = bossFight.heroTicksParticipated ?? {};
  const prevTotalTicks = bossFight.totalBossTicks ?? 0;
  const nextHeroTicks = { ...prevHeroTicks };
  for (const id of livingAssigned) {
    nextHeroTicks[id] = (nextHeroTicks[id] ?? 0) + 1;
  }
  const nextTotalTicks = prevTotalTicks + 1;

  // Heroes attack boss
  let heroDmgTotal = 0;
  nextAdventurers = nextAdventurers.map((a) => {
    if (!assignedIds.includes(a.id) || (a.hp ?? 0) <= 0) return a;
    const dmg = getHeroBossDamage(a, bossFight.bossId);
    heroDmgTotal += dmg;
    // Clear triple_damage flag after use
    if (a.bossFightAbility?.tripleNextDamage) {
      return { ...a, bossFightAbility: { ...a.bossFightAbility, tripleNextDamage: false } };
    }
    return a;
  });
  nextBossHp = Math.max(0, nextBossHp - heroDmgTotal);

  // Boss attacks heroes — damage split across living heroes, halved if blind
  const bossDmgPerHero = Math.round(
    (bossDef?.damagePerTick ?? 18)
    / Math.sqrt(Math.max(1, livingAssigned.length))
    * (bossFight.blindNextTick ? 0.5 : 1)
  );

  nextAdventurers = nextAdventurers.map((a) => {
    if (!livingAssigned.includes(a.id)) return a;
    const maxHp = a.maxHp ?? (40 + ((a.level ?? 1) - 1) * 8);
    const newHp = Math.max(0, (a.hp ?? maxHp) - bossDmgPerHero);
    return { ...a, hp: newHp };
  });

  // Clear blind flag
  const nextBlind = false;

  // ── Check victory ────────────────────────────────────────────────────────
  if (nextBossHp <= 0) {
    // Award drop resource
    const dropKey = bossDef?.dropResource ?? "titan_core";
    const dropAmt = bossDef?.dropAmount ?? 3;
    const nextResources = {
      ...(state.worldResources ?? {}),
      [dropKey]: ((state.worldResources ?? {})[dropKey] ?? 0) + dropAmt,
    };

    // Award XP to all surviving assigned heroes — gated by participation ratio
    const xpReward = bossDef?.xpReward ?? 50;
    const MIN_PARTICIPATION = 0.20; // hero must have participated in ≥20% of ticks
    const heroResults = [];
    nextAdventurers = nextAdventurers.map((a) => {
      if (!assignedIds.includes(a.id) || (a.hp ?? 0) <= 0) return { ...a, bossAssigned: false, bossFightAbility: null };
      const ticksParticipated = (nextHeroTicks[a.id] ?? 0);
      const participationRatio = nextTotalTicks > 0 ? ticksParticipated / nextTotalTicks : 1;
      const qualified = participationRatio >= MIN_PARTICIPATION;
      const earnedXp = qualified ? xpReward : 0;
      let newXp = (a.xp ?? 0) + earnedXp;
      let newLevel = a.level ?? 1;
      let skillPointsGained = 0;
      const oldLevel = newLevel;
      while (newXp >= getAdventurerXpNeeded(newLevel)) {
        newXp -= getAdventurerXpNeeded(newLevel);
        newLevel++;
        skillPointsGained++;
      }
      const newMaxHp = getAdventurerMaxHp({ ...a, level: newLevel }) + getHeroBonusMaxHp({ ...a, level: newLevel });
      heroResults.push({
        heroId: a.id,
        heroName: a.name ?? "Hero",
        heroClass: a.class ?? null,
        xpGained: earnedXp,
        leveledUp: newLevel > oldLevel,
        newLevel,
        participationPct: Math.round(participationRatio * 100),
        qualified,
      });
      return {
        ...a,
        xp: newXp,
        level: newLevel,
        maxHp: newMaxHp,
        skillPoints: (a.skillPoints ?? 0) + skillPointsGained,
        bossAssigned: false,
        bossFightAbility: null,
      };
    });

    // Town satisfaction bonus
    const satBonus = bossDef?.townSatisfactionBonus ?? 10;
    const satPulses = bossDef?.townSatBonusPulses ?? 2;
    const prevBonus = state.bossSatBonus ?? { flat: 0, pulsesRemaining: 0 };
    const nextSatBonus = {
      flat: satBonus,
      pulsesRemaining: prevBonus.pulsesRemaining + satPulses,
    };

    // Determine next boss in progression (infinite after BOSS_ORDER exhausted)
    const currentIdx = BOSS_ORDER.indexOf(bossFight.bossId);
    let nextBossId;
    if (currentIdx >= 0 && currentIdx + 1 < BOSS_ORDER.length) {
      // Still within the curated list
      nextBossId = BOSS_ORDER[currentIdx + 1];
    } else {
      // Infinite mode — figure out current wave and increment
      const currentWave = bossFight.infiniteWave ?? (
        /^infinite_(\d+)$/.test(bossFight.bossId)
          ? parseInt(bossFight.bossId.replace("infinite_", ""), 10)
          : 0
      );
      nextBossId = `infinite_${currentWave + 1}`;
    }

    return {
      ...state,
      adventurers: nextAdventurers,
      worldResources: nextResources,
      bossSatBonus: nextSatBonus,
      bossFight: {
        bossId: bossFight.bossId,
        bossHp: 0,
        bossMaxHp: bossDef?.maxHp ?? 1200,
        assignedHeroIds: [],
        tickAccum: 0,
        blindNextTick: false,
        phase: "defeated",
        pendingResult: {
          bossId: bossFight.bossId,
          bossName: bossDef?.name ?? "Boss",
          dropResource: dropKey,
          dropAmount: dropAmt,
          nextBossId,
          heroResults,
        },
        heroTicksParticipated: {},
        totalBossTicks: 0,
      },
    };
  }

  return {
    ...state,
    adventurers: nextAdventurers,
    bossFight: {
      ...bossFight,
      bossHp: nextBossHp,
      tickAccum: newAccum - BOSS_TICK_INTERVAL,
      blindNextTick: nextBlind,
      heroTicksParticipated: nextHeroTicks,
      totalBossTicks: nextTotalTicks,
    },
  };
}

// Call after player dismisses victory screen — always chains to next boss
export function acknowledgeBossVictory(state) {
  const bossFight = state.bossFight;
  if (!bossFight || bossFight.phase !== "defeated") return state;
  const nextBossId = bossFight.pendingResult?.nextBossId ?? null;
  if (nextBossId) {
    return initBossFight({ ...state, bossFight: { ...bossFight, pendingResult: null } }, nextBossId);
  }
  // Fallback (should not happen with infinite chain) — clear result
  return { ...state, bossFight: { ...bossFight, pendingResult: null } };
}

// Check if boss should unlock (any hero hit level 10) — call from level-up path
export function checkBossUnlock(state) {
  const alreadyUnlocked = !!(state.bossFight);
  if (alreadyUnlocked) return state;
  const anyHeroLvl10 = (state.adventurers ?? []).some((a) => (a.level ?? 1) >= BOSS_UNLOCK_LEVEL);
  if (!anyHeroLvl10) return state;
  return initBossFight(state, BOSS_ORDER[0]);
}

// Revive a hero while in boss fight (same cost as normal revive)
export function reviveHeroInBossFight(state, heroId) {
  const bossFight = state.bossFight;
  if (!bossFight) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === heroId);
  if (advIdx === -1) return state;
  const hero = state.adventurers[advIdx];
  if ((hero.hp ?? 0) > 0) return state; // not dead
  const cost = Math.max(1, hero.prestigeLevel ?? 0) * 100;
  if ((state.cash ?? 0) < cost) return state;
  const maxHp = hero.maxHp ?? (40 + ((hero.level ?? 1) - 1) * 8);
  const updated = { ...hero, hp: Math.floor(maxHp * 0.5) }; // revive at 50% HP
  return {
    ...state,
    cash: (state.cash ?? 0) - cost,
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updated : a),
  };
}