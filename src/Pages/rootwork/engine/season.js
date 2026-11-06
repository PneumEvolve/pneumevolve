// src/Pages/rootwork/engine/season.js — season prestige, quests, animals, pets
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
import { genId, getPrestigeSkillCount, getTownHallLevel, hasPrestigeSkill, isAtWorkerCap, isFarmPrestigeReady } from "./core.js";
import { getMaxForgeWorkers, getTownCapacity } from "./town.js";
import { getMarketWorkerItemsPerSecond } from "./workers.js";
import { getAnimalBonusYield, getAnimalEffectiveCycleSeconds, getBarnInstanceAnimalSlots, getBarnWorkerCapacity, getBarnWorkerInterval, getEffectiveCycleSeconds, makeFarm } from "./setup.js";
import { tick } from "./tick.js";
import { deepCloneState } from "./save.js";
import { computeTotalGearTier } from "./heroes.js";

// ─── Prestige ─────────────────────────────────────────────────────────────────
 
export function makeKeptWorker(worker, type) {
  const base = { id: worker.id, keptType: type };
  if (type === "farm") return { ...base, gear: worker.gear, specialization: worker.specialization ?? "none", farmId: null, cycleProgress: 0, cycleCount: 0 };
  if (type === "kitchen") return { ...base, upgrades: [...(worker.upgrades ?? [])], recipeId: null, elapsedSeconds: 0, totalSeconds: 0, batchSize: 1, busy: false };
  if (type === "market") return { ...base, gear: worker.gear, hasStandingOrder: worker.hasStandingOrder ?? false, queue: [], standingOrder: null };
  if (type === "fisher") return { ...base, bodyId: worker.bodyId, upgrades: [...(worker.upgrades ?? [])], timer: 0, assignedBait: null };
  if (type === "barn") return { ...base, animalType: worker.animalType, instanceId: worker.instanceId, upgrades: [...(worker.upgrades ?? [])], collectTimer: 0, careTimer: 0 };
  if (type === "forge") return { ...base, upgrades: [...(worker.upgrades ?? [])], recipeId: null, elapsedSeconds: 0, totalSeconds: 0, busy: false, autoRestart: worker.autoRestart ?? false, lastRecipeId: null };
  return base;
}

export function getBarnInstanceSupplyRate(inst) {
  // collects/sec this barn's workers can handle
  return (inst.barnWorkers ?? []).reduce((sum, w) => {
    const interval = getBarnWorkerInterval(w);
    const capacity = getBarnWorkerCapacity(w);
    return sum + (capacity / interval);
  }, 0);
}

export function getBarnInstanceDemandRate(inst, state) {
  // produces/sec all animals in this barn generate, accounting for all modifiers
  const animals = inst.animals ?? [];
  if (animals.length === 0) return 0;
  // Derive animal type from the building definition (animals don't store their own type)
  const def = BARN_BUILDINGS[inst.buildingType];
  const animalTypeId = def?.animalType;
  const type = ANIMAL_TYPES[animalTypeId];
  if (!type) return 0;
  const sturdyCount = state ? getPrestigeSkillCount(state, "sturdy_stock") : 0;
  const cycleSeconds = state
    ? getAnimalEffectiveCycleSeconds(type.cycleSeconds, state)
    : type.cycleSeconds;
  return animals.reduce((sum, animal) => {
    // Base yield per cycle (mirrors tick engine logic, ignoring mood bonus chance for simplicity)
    const bonusYield = getAnimalBonusYield(animal);
    let avgProduced = 1 + bonusYield;
    if (sturdyCount > 0) avgProduced = Math.ceil(avgProduced * Math.pow(1.2, sturdyCount));
    return sum + (avgProduced / cycleSeconds);
  }, 0);
}

export function getBarnPrestigeReady(state) {
  for (const inst of state.barnInstances ?? []) {
    const def = BARN_BUILDINGS[inst.buildingType];
    if (!def) continue;
    if ((inst.barnWorkers ?? []).length < PRESTIGE_MIN_BARN_WORKERS) return false;
    if ((inst.animals ?? []).length < PRESTIGE_MIN_BARN_ANIMALS) return false;
    const supply = getBarnInstanceSupplyRate(inst);
    const demand = getBarnInstanceDemandRate(inst, state);
    if (supply < demand) return false;
  }
  return true;
}

export function getAvailableBarnUnlocks(state) {
  return BARN_BUILDING_ORDER.filter((id) => !(state.barnBuildings?.[id]?.built));
}
 

// ─── Quest evaluation ─────────────────────────────────────────────────────────

export function evaluateQuestCondition(state, quest) {
  const c = quest.condition;
  const qp = state.questProgress ?? {};
  if (c.type === "counter") return (qp[c.key] ?? 0) >= c.value;
  if (c.type === "hero_level") return (state.adventurers ?? []).some(a => (a.level ?? 1) >= c.value);
  if (c.type === "hero_prestige") return (qp.heroPrestiges ?? 0) >= c.value;
  if (c.type === "and") return (c.conditions ?? []).every(sub => evaluateQuestCondition(state, { condition: sub }));
  if (c.type === "live_check") {
    switch (c.check) {
      case "hero_has_crafted_weapon":
        return (state.adventurers ?? []).some(a => {
          const wKey = a.equippedGear?.weapon;
          return wKey && Object.values(FORGE_RECIPES).some(r => r.output.resourceKey === wKey);
        });
      case "fishing_workers_active":
        return Object.values(state.fishing?.bodies ?? {}).reduce((sum, b) => sum + (b.workers ?? (b.worker?.hired ? [b.worker] : [])).filter(w => w?.hired).length, 0) >= (c.value ?? 1);
      case "chainmail_or_better_crafted":
        return qp.chainmailOrBetterCrafted === true;
      case "farm_expanded_5x5":
        return (state.farms ?? []).some(farm => ((state.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 2);
      case "kitchen_workers_active":
        return (state.kitchenWorkers ?? []).filter(w => w.recipeId && w.busy).length >= (c.value ?? 1);
      case "processing_line_reached":
        return qp.processingLineReached === true;
      case "barn_upgraded_and_full":
        return (state.barnInstances ?? []).some(inst => {
          const tier = inst.tier ?? 1;
          if (tier < 2) return false;
          const tierData = BARN_BUILDING_TIERS[(tier - 1)] ?? BARN_BUILDING_TIERS[0];
          const cap = tierData.animalSlots + (hasPrestigeSkill(state, "breeding_program") ? 2 : 0);
          return (inst.animals ?? []).length >= cap;
        });
      case "t3_item_crafted":
        return qp.t3ItemCrafted === true;
      case "crop_stockpile_10k":
        return Object.values(state.crops ?? {}).some(v => v >= 10000);
      case "two_heroes":
        return (state.adventurers ?? []).length >= 2;
      case "two_heroes_level_15":
        return (state.adventurers ?? []).filter(a => (a.level ?? 1) >= 15).length >= 2;
      case "tractor_workers":
        return (state.workers ?? []).filter(w => w.gear === "tractor").length >= (c.value ?? 2);
      case "has_prestiged_hero":
        return (state.adventurers ?? []).some(a => (a.prestigeLevel ?? 0) >= 1);
      case "two_prestiged_heroes":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 1).length >= 2;
      case "hero_gear_tier_9":
        return (state.adventurers ?? []).some(a =>
          computeTotalGearTier(a.equippedGear, a.equippedInstanceId, state.forgeGoodsInstanced) >= 9
        );
      // ── Late-game checks (S11-20) ──────────────────────────────────────────
      case "farm_expanded_6x6":
        return (state.farms ?? []).some(farm => ((state.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 3);
      case "farm_expanded_7x7":
        return (state.farms ?? []).some(farm => ((state.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 4);
      case "all_farms_expanded_7x7":
        return (state.farms ?? []).length > 0 && (state.farms ?? []).every(farm => ((state.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 4);
      case "hero_prestige_level":
        return (state.adventurers ?? []).some(a => (a.prestigeLevel ?? 0) >= (c.value ?? 1));
      case "hero_gear_tier":
        return (state.adventurers ?? []).some(a =>
          computeTotalGearTier(a.equippedGear, a.equippedInstanceId, state.forgeGoodsInstanced) >= (c.value ?? 9)
        );
      case "crop_stockpile_25k":
        return Object.values(state.crops ?? {}).some(v => v >= 25000);
      case "crop_stockpile_50k":
        return Object.values(state.crops ?? {}).some(v => v >= 50000);
      case "crop_stockpile_100k":
        return Object.values(state.crops ?? {}).some(v => v >= 100000);
      case "crop_stockpile_250k":
        return Object.values(state.crops ?? {}).some(v => v >= 250000);
      case "crop_stockpile_500k":
        return Object.values(state.crops ?? {}).some(v => v >= 500000);
      case "crop_diversity_5":
        return Object.values(state.crops ?? {}).filter(v => v >= 1000).length >= 5;
      case "crop_diversity_5_10k":
        return Object.values(state.crops ?? {}).filter(v => v >= 10000).length >= 5;
      case "three_prestiged_heroes":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 1).length >= 3;
      case "three_heroes_level_15":
        return (state.adventurers ?? []).filter(a => (a.level ?? 1) >= 15).length >= 3;
      case "all_barns_tier2":
        return (state.barnInstances ?? []).length > 0 && (state.barnInstances ?? []).every(inst => (inst.tier ?? 1) >= 2);
      case "all_barns_tier3":
        return (state.barnInstances ?? []).length > 0 && (state.barnInstances ?? []).every(inst => (inst.tier ?? 1) >= 3);
      case "two_heroes_prestige_3":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 3).length >= 2;
      case "three_heroes_prestige_3":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 3).length >= 3;
      case "three_heroes_prestige_5":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 5).length >= 3;
      case "two_heroes_prestige_10":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 10).length >= 2;
      case "three_heroes_prestige_10":
        return (state.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 10).length >= 3;
      case "heroes_auto_battling":
        return (qp.maxSimultaneousAutoBattlers ?? 0) >= (c.value ?? 1);
      case "longest_auto_run":
        return (qp.maxAutoBattleRun ?? 0) >= (c.value ?? 1);
      case "all_farms_5x5_plots":
        return (state.farms ?? []).length >= 3 && (state.farms ?? []).every(f => (f.unlockedPlots ?? 0) >= 25);
      case "artisan_goods_500_each":
        return ["bread","jam","sauce","omelette"].every(k => (state.artisan?.[k] ?? 0) >= 500);
      default: return false;
    }
  }
  return false;
}

export function getCompletedQuestIds(state) {
  const questData = SEASONAL_QUESTS[Math.min(state.season ?? 1, 20)];
  if (!questData) return new Set();
  const completed = new Set();
  for (const quest of questData.quests) {
    if (evaluateQuestCondition(state, quest)) completed.add(quest.id);
  }
  return completed;
}

export function areQuestsComplete(state) {
  const season = state.season ?? 1;
  if (season < QUEST_GATE_STARTS_SEASON) return true;
  const questData = SEASONAL_QUESTS[Math.min(season, 20)];
  if (!questData || questData.requiredCount === 0) return true;
  return getCompletedQuestIds(state).size >= questData.requiredCount;
}


export function claimQuestReward(state, questId) {
  const season = state.season ?? 1;
  const questData = SEASONAL_QUESTS[Math.min(season, 20)];
  if (!questData) return state;
  const quest = questData.quests.find(q => q.id === questId);
  if (!quest) return state;
  // Must be complete
  if (!evaluateQuestCondition(state, quest)) return state;
  // Must not already be claimed
  const claimed = state.questProgress?.claimedQuestIds ?? [];
  if (claimed.includes(questId)) return state;
  const reward = season * 100;
  return {
    ...state,
    cash: (state.cash ?? 0) + reward,
    questProgress: {
      ...(state.questProgress ?? {}),
      claimedQuestIds: [...claimed, questId],
    },
  };
}

export function canPrestige(state) {
  if (state.season <= 3) { if (getTownHallLevel(state) < state.season) return false; }
  if (state.season >= QUEST_GATE_STARTS_SEASON) { if (!areQuestsComplete(state)) return false; }
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
  if (state.season <= 3) { const rTH = state.season; if (getTownHallLevel(state) < rTH) blockers.push(`Town Hall level ${rTH} required`); }
  if (state.season >= QUEST_GATE_STARTS_SEASON) {
    const questData = SEASONAL_QUESTS[Math.min(state.season, 20)];
    if (questData && questData.requiredCount > 0) {
      const completed = getCompletedQuestIds(state);
      const completedCount = (questData.quests ?? []).filter(q => completed.has(q.id)).length;
      if (completedCount < questData.requiredCount) blockers.push(`Complete ${questData.requiredCount} seasonal quests (${completedCount}/${questData.requiredCount} done) — see Guild Hall`);
    }
  }
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
        continue;
      }
      const animals = (inst.animals ?? []).length;
      if (animals < PRESTIGE_MIN_BARN_ANIMALS) {
        blockers.push(`${label}: needs at least ${PRESTIGE_MIN_BARN_ANIMALS} animals (have ${animals})`);
        continue;
      }
      const supply = getBarnInstanceSupplyRate(inst);
      const demand = getBarnInstanceDemandRate(inst, state);
      if (supply < demand) {
        blockers.push(`${label}: workers not keeping up (${supply.toFixed(3)} collects/s < ${demand.toFixed(3)} needed)`);
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
  next.questProgress = { manualHarvestCount: 0, berriesHarvested: 0, tomatoesHarvested: 0, fishCaughtCount: 0, qualityFishCount: 0, rareFishCount: 0, breadCrafted: 0, jamCrafted: 0, sauceCrafted: 0, eggsCollected: 0, milkCollected: 0, woolCollected: 0, omelettesCrafted: 0, forgeItemsCrafted: 0, heroQuestsCompleted: 0, tier2QuestsCompleted: 0, bossFightsWon: 0, heroPrestiges: 0, chainmailOrBetterCrafted: false, t3ItemCrafted: false, claimedQuestIds: [], maxAutoBattleRun: 0, maxSimultaneousAutoBattlers: 0, processingLineReached: false };

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

    // Fisher workers use "fisher_<bodyId>" or "fisher_<bodyId>_<index>" as their keepId
    let fisherBodyId = null;
    if (keptWorkerId.startsWith("fisher_")) {
      const withoutPrefix = keptWorkerId.slice(7); // e.g. "pond", "lake_1", "river_2"
      // Match against known body IDs (strip trailing _N if present)
      const knownBodies = Object.keys(next.fishing?.bodies ?? {});
      fisherBodyId = knownBodies.find(id => withoutPrefix === id || withoutPrefix.startsWith(id + "_")) ?? null;
    }
    const fisherBody = fisherBodyId ? next.fishing?.bodies?.[fisherBodyId] : null;

    const forgeW = next.forgeWorkers.find((w) => w.id === keptWorkerId);
    if (fw) previousKeptWorkers.push(makeKeptWorker(fw, "farm"));
    else if (kw) previousKeptWorkers.push(makeKeptWorker(kw, "kitchen"));
    else if (mw) previousKeptWorkers.push(makeKeptWorker(mw, "market"));
    else if (bw) previousKeptWorkers.push(makeKeptWorker(bw, "barn"));
    else if (forgeW) previousKeptWorkers.push(makeKeptWorker(forgeW, "forge"));
    else if (fisherBody) {
      const fisherWorkerList = fisherBody.workers?.length > 0 ? fisherBody.workers : (fisherBody.worker?.hired ? [fisherBody.worker] : []);
      // Determine which specific worker index this keepId refers to
      const withoutPrefix = keptWorkerId.slice(7); // e.g. "pond" or "pond_1"
      const afterBodyId = withoutPrefix.slice(fisherBodyId.length); // e.g. "" or "_1"
      const workerIndex = afterBodyId.startsWith("_") ? parseInt(afterBodyId.slice(1), 10) : 0;
      const fw = fisherWorkerList[workerIndex];
      if (fw) {
        previousKeptWorkers.push(makeKeptWorker({ ...fw, bodyId: fisherBodyId, id: keptWorkerId }, "fisher"));
      }
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
    next.fishing.bodies[bodyId].workers = [];
    next.fishing.bodies[bodyId].worker = null; // clear legacy too
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
  const forgeKept = next.keptWorkers.filter((w) => w.keptType === "forge");
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
    const targetInst = (next.barnInstances ?? []).find((i) => i.id === kw.instanceId)
      ?? (next.barnInstances ?? []).find((i) => BARN_BUILDINGS[i.buildingType]?.animalType === kw.animalType);
    if (targetInst) {
      if (!targetInst.barnWorkers) targetInst.barnWorkers = [];
      targetInst.barnWorkers.push({ ...kw, instanceId: targetInst.id });
    }
  }

  for (const kw of forgeKept) {
    if (isAtWorkerCap(next)) break;
    if ((next.forgeWorkers ?? []).length >= getMaxForgeWorkers(next)) break;
    if (!next.forgeWorkers) next.forgeWorkers = [];
    next.forgeWorkers.push({ ...kw });
  }

  for (const kw of fisherKept) {
    const body = next.fishing?.bodies?.[kw.bodyId];
    if (!body?.unlocked) continue;
    const bodyDef = FISHING_BODIES[kw.bodyId];
    const maxWorkers = bodyDef?.maxWorkers ?? 1;
    if (!body.workers) next.fishing.bodies[kw.bodyId].workers = [];
    if (next.fishing.bodies[kw.bodyId].workers.length < maxWorkers && !isAtWorkerCap(next)) {
      next.fishing.bodies[kw.bodyId].workers.push({ ...kw, hired: true, timer: 0 });
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
    workers: [],
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
 
export function sellAnimal(state, animalId, animalInstanceId, barnInstanceId) {
  const type = ANIMAL_TYPES[animalId];
  if (!type) return state;
  const inst = (state.barnInstances ?? []).find(i => i.id === barnInstanceId);
  if (!inst) return state;
  const animal = (inst.animals ?? []).find(a => a.id === animalInstanceId);
  if (!animal) return state;
  const mood = animal.mood ?? 100;
  // Sell value = baseCost scaled by current mood (0–100%)
  const saleValue = Math.floor(type.baseCost * (mood / 100));
  const next = deepCloneState(state);
  next.cash = (next.cash ?? 0) + saleValue;
  const targetInst = next.barnInstances.find(i => i.id === barnInstanceId);
  targetInst.animals = (targetInst.animals ?? []).filter(a => a.id !== animalInstanceId);
  // Sync legacy root animals
  if (next.animals?.[animalId]) {
    next.animals[animalId] = (next.barnInstances ?? [])
      .filter(i => BARN_BUILDINGS[i.buildingType]?.animalType === animalId)
      .flatMap(i => i.animals ?? []);
  }
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
  const stock = animal.stock ?? 0;
  animal.stock = 0;
  animal.ready = false;
  if (!next.animalGoods) next.animalGoods = {};
  next.animalGoods[type.produces] = (next.animalGoods[type.produces] ?? 0) + stock;
  if (!next.questProgress) next.questProgress = {};
  if (type.produces === "egg")  next.questProgress.eggsCollected  = (next.questProgress.eggsCollected  ?? 0) + stock;
  if (type.produces === "milk") next.questProgress.milkCollected   = (next.questProgress.milkCollected  ?? 0) + stock;
  if (type.produces === "wool") next.questProgress.woolCollected   = (next.questProgress.woolCollected  ?? 0) + stock;
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
      next.animalGoods[type.produces] = (next.animalGoods[type.produces] ?? 0) + stock;
      if (!next.questProgress) next.questProgress = {};
      if (type.produces === "egg")  next.questProgress.eggsCollected  = (next.questProgress.eggsCollected  ?? 0) + stock;
      if (type.produces === "milk") next.questProgress.milkCollected   = (next.questProgress.milkCollected  ?? 0) + stock;
      if (type.produces === "wool") next.questProgress.woolCollected   = (next.questProgress.woolCollected  ?? 0) + stock;
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
