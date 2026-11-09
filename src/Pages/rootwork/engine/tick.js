// src/Pages/rootwork/engine/tick.js — offline progress, main tick, town pulse
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
import { genId, getActiveBankTier, getActiveTreasuryTier, getBankPriceBonus, getFarmBonusYield, getPrestigeSkillCount, getSatisfactionCeiling, getTotalWorkersHired, getTreasuryGrowBonus, hasPrestigeSkill } from "./core.js";
import { getSatisfactionTarget, getSchoolGrowBonus, getSchoolResearchMultiplier, getTownBuildingWorkers, getTownCapacity, getTownGrowthBonusPercent, getTownSatisfactionMultiplier, getWarehouseCropCap, isTownBuildingBuilt, pushStat } from "./town.js";
import { _startKitchenWorkerRecipe, getMarketWorkerItemsPerSecond, getSellRate } from "./workers.js";
import { getAnimalBonusYield, getAnimalEffectiveCycleSeconds, getAnimalStockMax, getBarnWorkerCapacity, getBarnWorkerCareInterval, getBarnWorkerCareMood, getBarnWorkerInterval, getEffectiveCycleSeconds, getEffectiveGrowTime, getEffectivePlotsPerCycle, getFishMealGrowBonus, getFishingWorkerGearTier, getFishingWorkerHaul, getFishingWorkerInterval, isSprinterResting, makeFreshTown, rollFishForBody } from "./setup.js";
import { applyYieldBonuses } from "./actions.js";
import { deepCloneState } from "./save.js";
import { getHeroKitchenBonusChance, tickAdventurerMissions, tickAdventurerMissionsAt, tickAdventurerRegen, tickTavernRestPulse } from "./heroes.js";
import { cancelForgeWorkerRecipe, tickForgeWorkers } from "./forge.js";
import { tickBossFight } from "./boss.js";
import { getAshportFishBonus, getMillhavenGrowBonus, getThornwickGrowBonus, tickExpeditions, tickTradeTowns } from "./roads.js";
import { tickRoads } from "./roadsV2.js";
import { getGlobalBonus } from "./bonuses.js";
import { markProjectUnlocks } from "./projects.js";

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
  // Offline: shift adventurer mission startTimes back by `seconds` so the
  // per-second tick loop can naturally fire tickAdventurerMissions each time
  // a run completes, rather than relying on Date.now() inside the loop.
  const offlineSimStart = nowMs - seconds * 1000;
  next.adventurers = (next.adventurers ?? []).map((adv) => {
    if (!adv.mission) return adv;
    // Rebase startTime relative to offlineSimStart so run completions
    // happen at the right simulated second rather than never.
    const elapsed = (nowMs - adv.mission.startTime) / 1000;
    const rebasedStart = offlineSimStart - elapsed * 1000;
    return { ...adv, mission: { ...adv.mission, startTime: rebasedStart } };
  });
  for (let i = 0; i < seconds; i++) {
    next = tick(next);
    next = tickAdventurerRegen(next, 1);
    // Advance sim clock so mission startTime comparisons work correctly
    const simNow = offlineSimStart + (i + 1) * 1000;
    next = tickAdventurerMissionsAt(next, simNow);
    next = tickBossFight(next, 1);
    next = tickExpeditions(next);
    next = tickRoads(next);
    next = tickTradeTowns(next);
  }
  next.lastSavedTime = nowMs;
  return { state: next, offlineSeconds: seconds };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

export function tick(state) {
  // Shallow clone only — every sub-object mutation in tick() uses spread operators
  // deepCloneState (full JSON.parse/stringify) every second was the main perf killer on mobile
  let next = { ...state };
  // Clone farms+plots and workers so direct mutations don't touch original references.
  // Without this, React StrictMode's double-invoke of the updater increments growthTick twice per tick.
  next.farms = next.farms.map((f) => ({ ...f, plots: f.plots.map((p) => ({ ...p })) }));
  next.workers = next.workers.map((w) => ({ ...w }));
  next.kitchenWorkers = (next.kitchenWorkers ?? []).map((w) => ({ ...w }));
  next.marketWorkers  = (next.marketWorkers  ?? []).map((w) => ({ ...w, queue: (w.queue ?? []).map((o) => ({ ...o })) }));
  next.pendingDeathEvents = []; // clear each tick; fresh events added below
  const feast = next.feastBonusPercent ?? 0;
  const townBonus = (next.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(next) + (getMillhavenGrowBonus(next) + getThornwickGrowBonus(next)) * 100;
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


  // ── Track Processing Line quest milestone (S9) ─────────────────────────────────────
  if (!next.questProgress?.processingLineReached) {
    const activeKitchenCount = (next.kitchenWorkers ?? []).filter(w => w.recipeId && w.busy).length;
    if (activeKitchenCount >= 4) {
      next.questProgress = { ...(next.questProgress ?? {}), processingLineReached: true };
    }
  }

// ── School research ────────────────────────────────────────────────────────
  if (isTownBuildingBuilt(next, "school")) {
    const school = next.town?.buildings?.school ?? next.town?.townBuildings?.school;
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
            // Clear saved progress for completed research
            if (school.researchProgressMap) {
              delete school.researchProgressMap[activeResearch.id];
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
              next.crops[farm.crop] = Math.min((next.crops[farm.crop] ?? 0) + crops, getWarehouseCropCap(next));
              next.yieldPool = newPool;
              cropsGained += crops;
              if (farm.crop === "berries") {
                next.questProgress.berriesHarvested = (next.questProgress.berriesHarvested ?? 0) + crops;
              }
              if (farm.crop === "tomatoes") {
                next.questProgress.tomatoesHarvested = (next.questProgress.tomatoesHarvested ?? 0) + crops;
              }
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
        if (!next.questProgress) next.questProgress = {};
        if (recipe.outputGood === "bread") next.questProgress.breadCrafted = (next.questProgress.breadCrafted ?? 0) + produced;
        if (recipe.outputGood === "jam")   next.questProgress.jamCrafted   = (next.questProgress.jamCrafted   ?? 0) + produced;
        if (recipe.outputGood === "sauce") next.questProgress.sauceCrafted = (next.questProgress.sauceCrafted ?? 0) + produced;
      } else if (["wheat_potion","berry_potion","tomato_potion"].includes(recipe.outputGood)) {
        if (!next.cropPotions) next.cropPotions = {};
        next.cropPotions[recipe.outputGood] = (next.cropPotions[recipe.outputGood] ?? 0) + produced;
      } else {
        if (!next.animalGoods) next.animalGoods = {};
        next.animalGoods[recipe.outputGood] = (next.animalGoods[recipe.outputGood] ?? 0) + produced;
        if (!next.questProgress) next.questProgress = {};
        if (recipe.outputGood === "omelette") next.questProgress.omelettesCrafted = (next.questProgress.omelettesCrafted ?? 0) + produced;
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

    // Accumulate fractional progress — low satisfaction slows selling but never freezes it
    worker.sellProgress = (worker.sellProgress ?? 0) + effectiveIps * satMultiplier;
    let toSellThisTick = Math.floor(worker.sellProgress);
    worker.sellProgress -= toSellThisTick;

    if (worker.hasStandingOrder && worker.standingOrder && (worker.queue ?? []).length === 0 && toSellThisTick > 0) {
  const itemType = worker.standingOrder;
  const INSTANCED_FORGE_KEYS = new Set(["master_sword", "tower_shield", "plate_armor"]);
  const isWorld  = itemType in WORLD_RESOURCES;
  const isForge  = !isWorld && Object.values(FORGE_RECIPES).some((r) => r.output.resourceKey === itemType);
  const isFish   = !isWorld && !isForge && itemType in (FISHING_FISH ?? {});
  const isAnimal = !isWorld && !isForge && !isFish && itemType in (next.animalGoods ?? {});
  const isArtisan = !isWorld && !isForge && !isFish && !isAnimal && itemType in (next.artisan ?? {});
  const isCrop   = !isWorld && !isForge && !isFish && !isAnimal && !isArtisan;
  const isInstancedForge = isForge && INSTANCED_FORGE_KEYS.has(itemType);
  const available = isCrop ? (next.crops[itemType] ?? 0)
    : isArtisan ? (next.artisan[itemType] ?? 0)
    : isAnimal ? (next.animalGoods[itemType] ?? 0)
    : isFish ? (next.fishing.fish[itemType] ?? 0)
    : isInstancedForge ? (next.forgeGoodsInstanced ?? []).filter((i) => i.key === itemType && !i._equippedBy && i.upgradeTier === 3).length
    : isForge ? (next.forgeGoods[itemType] ?? 0)
    : isWorld ? (next.worldResources[itemType] ?? 0) : 0;
  const toPull = Math.floor(Math.min(toSellThisTick, available));
  if (toPull > 0) {
    if (isCrop) next.crops[itemType] -= toPull;
    else if (isArtisan) next.artisan[itemType] -= toPull;
    else if (isAnimal) next.animalGoods[itemType] -= toPull;
    else if (isFish) next.fishing.fish[itemType] -= toPull;
    else if (isInstancedForge) {
      let removed = 0;
      next.forgeGoodsInstanced = (next.forgeGoodsInstanced ?? []).filter((i) => {
        if (i.key === itemType && !i._equippedBy && i.upgradeTier === 3 && removed < toPull) {
          removed++;
          return false;
        }
        return true;
      });
    }
    else if (isForge) next.forgeGoods[itemType] -= toPull;
    else if (isWorld) next.worldResources[itemType] -= toPull;
    worker.queue = [{ id: genId("sale"), itemType, quantity: toPull }];
  }
}

    let cashEarned = 0;
    // Grand Hall stages (and later season modifiers)
    const sellPriceMult = Math.max(0, 1 + getGlobalBonus(next, "sellPrice"));
    while (toSellThisTick > 0 && (worker.queue ?? []).length > 0) {
      const order = worker.queue[0];
      const toSell = Math.min(toSellThisTick, order.quantity);
      const rate = getSellRate(order.itemType, next.prestigeBonuses, bankPriceBonus, next) * sellPriceMult;
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

  // ── Fishing workers ───────────────────────────────────────────────
  if (next.fishing) {
    const noMinnows = hasPrestigeSkill(next, "deep_waters");
    const selectiveHaul = hasPrestigeSkill(next, "selective_haul");
    for (const bodyId of FISHING_BODY_ORDER) {
      const body = next.fishing.bodies?.[bodyId];
      if (!body?.unlocked) continue;
      // Support both new (workers array) and legacy (worker single)
      const workers = body.workers ?? (body.worker?.hired ? [body.worker] : []);
      for (const worker of workers) {
        if (!worker?.hired) continue;
        const ashportBonus = getAshportFishBonus(next);
        // Lighthouse stages (and later season modifiers) stack with the Ashport/Crestfall bonus
        const fishSpeed = Math.max(0.1, 1 + ashportBonus + getGlobalBonus(next, "fishingSpeed"));
        const interval = Math.max(1, Math.round(getFishingWorkerInterval(worker, next) / fishSpeed));
        const haul = getFishingWorkerHaul(worker);
        const gearTier = getFishingWorkerGearTier(worker);
        const baitId = worker.assignedBait;
        const hasBait = baitId && (next.bait?.[baitId] ?? 0) > 0;
        const effectiveBait = hasBait ? baitId : null;
        const allowedFish = selectiveHaul ? (worker.allowedFish ?? null) : null;

        worker.timer = (worker.timer ?? 0) + satMultiplier;
        if (worker.timer >= interval) {
          worker.timer = 0;
          if (!next.fishing.fish) next.fishing.fish = {};
          for (let i = 0; i < haul; i++) {
            let fishId = rollFishForBody(bodyId, gearTier, effectiveBait);
            // deep_waters: reroll minnows once to get bass or better
            if (noMinnows && fishId === "minnow") {
              fishId = rollFishForBody(bodyId, gearTier === "basic" ? "good" : gearTier, effectiveBait);
              if (fishId === "minnow") fishId = "bass";
            }
            // selective_haul: skip if not in allowed list
            if (allowedFish && !allowedFish.includes(fishId)) continue;
            next.fishing.fish[fishId] = (next.fishing.fish[fishId] ?? 0) + 1;
            if (!next.questProgress) next.questProgress = {};
            next.questProgress.fishCaughtCount = (next.questProgress.fishCaughtCount ?? 0) + 1;
            if (fishId === "bass" || fishId === "perch" || fishId === "rare") next.questProgress.qualityFishCount = (next.questProgress.qualityFishCount ?? 0) + 1;
            if (fishId === "rare") next.questProgress.rareFishCount = (next.questProgress.rareFishCount ?? 0) + 1;
          }
          // Consume 1 bait per catch cycle (bait boosts rare rates, not haul count)
          if (hasBait) next.bait[baitId] = Math.max(0, (next.bait[baitId] ?? 0) - 1);
        }
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

      worker.collectTimer = (worker.collectTimer ?? 0) + satMultiplier;
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
          if (!next.questProgress) next.questProgress = {};
          if (type.produces === "egg")  next.questProgress.eggsCollected  = (next.questProgress.eggsCollected  ?? 0) + toCollect;
          if (type.produces === "milk") next.questProgress.milkCollected   = (next.questProgress.milkCollected  ?? 0) + toCollect;
          if (type.produces === "wool") next.questProgress.woolCollected   = (next.questProgress.woolCollected  ?? 0) + toCollect;
          remaining -= toCollect;
        }
      }

      if (careInterval) {
        worker.careTimer = (worker.careTimer ?? 0) + satMultiplier;
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

  // ── Rec Hall cash drain (per second) ──────────────────────────────────────
  if (isTownBuildingBuilt(next, "recreation_hall")) {
    const recWorkers = getTownBuildingWorkers(next, "recreation_hall");
    if (recWorkers > 0) {
      next.cash = Math.max(0, (next.cash ?? 0) - recWorkers * REC_HALL_CASH_PER_WORKER);
    }
  }

  // ── Forge workers (inside tick so satMultiplier applies) ───────────────
  next = tickForgeWorkers(next, satMultiplier);

  next = updateTown(next, 1);
  // Town Projects: flag newly unlocked projects so they stay visible for good
  next = markProjectUnlocks(next);
  next.totalPlayTime = (next.totalPlayTime ?? 0) + 1;
  return next;
}

// ─── Town pulse ───────────────────────────────────────────────────────────────

export function fireLastHiredWorker(state) {
  const candidates = [
  ...(state.workers ?? []).map((w) => ({ id: w.id, type: "farm", hiredAt: w.hiredAt ?? 0 })),
  ...(state.kitchenWorkers ?? []).map((w) => ({ id: w.id, type: "kitchen", hiredAt: w.hiredAt ?? 0 })),
  ...(state.marketWorkers ?? []).map((w) => ({ id: w.id, type: "market", hiredAt: w.hiredAt ?? 0 })),
  ...(state.barnWorkers ?? []).map((w) => ({ id: w.id, type: "barn", hiredAt: w.hiredAt ?? 0 })),
  // Smiths count toward population, so starvation can let them go too
  ...(state.forgeWorkers ?? []).map((w) => ({ id: w.id, type: "forge", hiredAt: w.hiredAt ?? 0 })),
  ...Object.entries(state.fishing?.bodies ?? {})
    .flatMap(([bodyId, b]) => (b?.workers ?? (b?.worker?.hired ? [b.worker] : []))
      .map((w, idx) => ({ id: bodyId, type: "fishing", workerIndex: idx, hiredAt: w.hiredAt ?? 0 }))),
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
    // Remove from the root list AND from their barn — otherwise they keep working
    // in the barn without counting toward population (ghost worker)
    state.barnWorkers = state.barnWorkers.filter((w) => w.id !== toFire.id);
    for (const inst of state.barnInstances ?? []) {
      inst.barnWorkers = (inst.barnWorkers ?? []).filter((w) => w.id !== toFire.id);
    }
  } else if (toFire.type === "forge") {
    // Refund whatever they were crafting, then let them go
    state = cancelForgeWorkerRecipe(state, toFire.id);
    state = { ...state, forgeWorkers: (state.forgeWorkers ?? []).filter((w) => w.id !== toFire.id) };
  } else if (toFire.type === "fishing") {
  const body = state.fishing?.bodies?.[toFire.id];
  if (body?.workers) {
    body.workers.splice(toFire.workerIndex ?? 0, 1);
  } else if (body?.worker) {
    body.worker = null;
  }
}

  return state;
}

export function updateTown(state, seconds = 1) {
  let next = deepCloneState(state);
  if (!next.town) next.town = makeFreshTown();

  next.town.unlocked = true;
  next.town.capacity = getTownCapacity(next);

  const effectivePulse = TOWN_PULSE_SECONDS; // pulse length is now fixed — no per-building extras
  if (next.town.pulseSeconds == null) next.town.pulseSeconds = effectivePulse;
  next.town.pulseSeconds -= seconds;

  // ── Food pulse ─────────────────────────────────────────────────────────────
  // Fires before population growth so new arrivals aren't charged on arrival tick.
  while (next.town.pulseSeconds <= 0) {
    const people       = Math.floor(Math.max(0, next.town.people ?? 0));
    const totalWorkers = getTotalWorkersHired(next);
    const _fhTier      = next.town.buildings?.food_hall?.tier ?? 0;
    const _selected    = next.town.selectedFoodMode ?? null;
    // Player can choose any mode up to their unlocked tier; "wheat" always allowed
    const _tierForMode = { wheat: 0, bread: 1, jam: 2, sauce: 3 };
    const foodMode     = _fhTier > 0 && _selected && (_tierForMode[_selected] ?? 999) <= _fhTier
      ? _selected
      : _fhTier > 0 ? FOOD_HALL_FOOD_MODE[_fhTier] : "wheat";

    // Sync foodMode onto town for UI reads
    next.town.foodMode = foodMode;

    // ── Calculate food needed ─────────────────────────────────────────────
    const idlePeople     = Math.max(0, people - totalWorkers);
    const peopleFoodUnits = (idlePeople * PERSON_IDLE_FOOD_COST) + (totalWorkers * PERSON_WORKING_FOOD_COST);
    const animalFoodUnits = Object.entries(next.animals ?? {}).reduce((sum, [id, arr]) =>
      sum + arr.length * (ANIMAL_FOOD_COSTS[id] ?? 0), 0);
    const petFoodUnits    = Object.keys(next.pets ?? {}).length * PET_FOOD_COST;
    const totalFoodUnits  = peopleFoodUnits + animalFoodUnits + petFoodUnits;

    // Convert food units → actual resource needed based on food mode.
    // Bread is always the caloric cost. Jam/sauce are bonus resources that must
    // match the bread quantity to earn the sat ceiling.
    let foodNeeded = 0; // bread (or wheat) quantity required this pulse
    let fed = false;

    if (foodMode === "wheat") {
      foodNeeded = totalFoodUnits;
      const wheatHave = Math.floor(next.crops?.wheat ?? 0);
      fed = wheatHave >= foodNeeded;
    } else {
      // All artisan modes: bread is always the caloric base
      foodNeeded = totalFoodUnits === 0 ? 0 : Math.max(1, Math.ceil(totalFoodUnits / BREAD_FOOD_UNITS));
      const breadHave = Math.floor(next.artisan?.bread ?? 0);
      const jamHave   = Math.floor(next.artisan?.jam   ?? 0);
      const sauceHave = Math.floor(next.artisan?.sauce ?? 0);

      if (foodMode === "bread") {
        fed = breadHave >= foodNeeded;
      } else if (foodMode === "jam") {
        // Jam mode: need bread + jam. Failure drops to bread mode (tier preserved).
        if (breadHave < foodNeeded || jamHave < foodNeeded) {
          fed = false;
          next.town.foodMode = "bread";
          next.town.selectedFoodMode = "bread";
        } else {
          fed = true;
        }
      } else if (foodMode === "sauce") {
        // Sauce mode: need bread + jam + sauce. Failure drops to jam mode (tier preserved).
        if (breadHave < foodNeeded || jamHave < foodNeeded || sauceHave < foodNeeded) {
          fed = false;
          next.town.foodMode = "jam";
          next.town.selectedFoodMode = "jam";
        } else {
          fed = true;
        }
      }
    }

    // ── Consume food ────────────────────────────────────────────────────────────────────────────────────
    if (fed) {
      if (foodNeeded > 0) {
        if (foodMode === "wheat") {
          next.crops.wheat = (next.crops.wheat ?? 0) - foodNeeded;
        } else if (foodMode === "bread") {
          next.artisan.bread = (next.artisan.bread ?? 0) - foodNeeded;
        } else if (foodMode === "jam") {
          next.artisan.bread = (next.artisan.bread ?? 0) - foodNeeded;
          next.artisan.jam   = (next.artisan.jam   ?? 0) - foodNeeded;
        } else if (foodMode === "sauce") {
          next.artisan.bread = (next.artisan.bread ?? 0) - foodNeeded;
          next.artisan.jam   = (next.artisan.jam   ?? 0) - foodNeeded;
          next.artisan.sauce = (next.artisan.sauce ?? 0) - foodNeeded;
        }
      }
      // Reset missed food pulses on animals
      for (const animalId of Object.keys(next.animals ?? {})) {
        for (const animal of next.animals[animalId]) {
          animal.missedFoodPulses = 0;
        }
      }
      next.town.starving = false;
    } else {
      // Starving: lose a person and fire last-hired worker
      next.town.people = Math.max(0, people - TOWN_DECLINE_PER_PULSE);
      next.town.starving = true;
      if (getTotalWorkersHired(next) > next.town.people) next = fireLastHiredWorker(next);
      // Animals lose mood when town starves
      for (const animalId of Object.keys(next.animals ?? {})) {
        for (const animal of next.animals[animalId]) {
          animal.mood = Math.max(0, (animal.mood ?? 100) - 20);
          animal.missedFoodPulses = (animal.missedFoodPulses ?? 0) + 1;
        }
      }
    }

    // ── Warehouse overflow — trim crops to cap ────────────────────────────
    const cropCap = getWarehouseCropCap(next);
    for (const crop of ["wheat", "berries", "tomatoes"]) {
      if ((next.crops?.[crop] ?? 0) > cropCap) {
        next.crops[crop] = cropCap;
      }
    }

    // ── Satisfaction ──────────────────────────────────────────────────────
    next.town.satisfactionTarget = getSatisfactionTarget(next);
    const currentSat  = next.town.satisfaction ?? TOWN_SATISFACTION_DEFAULT;
    const target      = next.town.satisfactionTarget;
    const satCeiling  = getSatisfactionCeiling(next);

    // grand_opening prestige skill: first 3 pulses of new season start at 150
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
    next.town.satisfaction = Math.min(satCeiling, next.town.satisfaction);

    // Boss fight victory bonus — temporary flat sat boost
    if ((next.bossSatBonus?.pulsesRemaining ?? 0) > 0) {
      next.town.satisfaction = Math.min(satCeiling, next.town.satisfaction + next.bossSatBonus.flat);
      next.bossSatBonus = { ...next.bossSatBonus, pulsesRemaining: next.bossSatBonus.pulsesRemaining - 1 };
    }

    // ── Tavern pulse — hero auto-rest ─────────────────────────────────────
    // tickTavernRestPulse handles HP regen for idle heroes
    if (fed) next = tickTavernRestPulse(next);

    // Cache values for UI
    next.town.rawFoodNeeded      = foodNeeded;
    // Cache needed amounts for UI display
    next.town.breadNeeded        = (foodMode !== "wheat") ? foodNeeded : 0;
    next.town.rawBreadNeeded     = next.town.breadNeeded;
    next.town.jamNeeded          = (foodMode === "jam" || foodMode === "sauce") ? foodNeeded : 0;
    next.town.sauceNeeded        = foodMode === "sauce" ? foodNeeded : 0;
    next.town.foodType           = foodMode === "wheat" ? "wheat" : "bread"; // legacy shape
    next.town.capacity           = getTownCapacity(next);
    next.town.growthBonusPercent = getTownGrowthBonusPercent(next.town.people ?? 0);

    // ── Population growth ─────────────────────────────────────────────────
    // Runs inside the pulse loop, advancing by effectivePulse each time so
    // growth rate stays constant (every TOWN_PULSE_SECONDS) regardless of
    // how long the food pulse is (bakery/pantry/cannery extensions don't
    // slow population). Growth only fires when the town is fed.
    if (!next.town.starving) {
      next.town.growthAccumulator = (next.town.growthAccumulator ?? 0) + effectivePulse;
      while (next.town.growthAccumulator >= TOWN_PULSE_SECONDS) {
        next.town.growthAccumulator -= TOWN_PULSE_SECONDS;
        const cap = getTownCapacity(next);
        const ppl = Math.floor(Math.max(0, next.town.people ?? 0));
        if (ppl < cap) next.town.people = Math.min(cap, ppl + TOWN_GROWTH_PER_PULSE);
      }
    } else {
      next.town.growthAccumulator = 0;
    }

    next.town.pulseSeconds += effectivePulse;
  }

  next.town.growthBonusPercent = getTownGrowthBonusPercent(next.town.people ?? 0);
  return next;
}