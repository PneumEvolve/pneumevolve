// src/Pages/rootwork/engine/forge.js — forge workers
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
import { getForgeHallRecipeTier, getMaxForgeWorkers } from "./town.js";
import { tick } from "./tick.js";
import { computeTotalGearTier, getHeroPrestigeDmgBonus } from "./heroes.js";

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
  if (!state.town?.buildings?.forge_hall?.built) return state;
  if ((state.forgeWorkers ?? []).length >= getMaxForgeWorkers(state)) return state;
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
  // Block recipe assignment if forge hall level is insufficient (gearTier 0 = components, always allowed)
  const forgeRecipeTier = getForgeHallRecipeTier(state);
  if (recipe.gearTier > 0 && recipe.gearTier > forgeRecipeTier) return state;
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
      w.id === workerId
        ? { ...w, upgrades: [...(w.upgrades ?? []), upgradeId], ...(upgradeId === "forge_auto" ? { autoRestart: true } : {}) }
        : w
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

  // Can upgrade while equipped only if the hero is idle (not on mission, not tavern resting)
  if (inst._equippedBy) {
    const hero = (state.adventurers ?? []).find((a) => a.id === inst._equippedBy);
    if (!hero || hero.mission || hero.tavernResting) return state;
    // Hero is idle — allow upgrade while equipped
  }

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

  // If the upgraded item is equipped on a hero, recalculate that hero's gear score
  let nextAdventurers = state.adventurers ?? [];
  if (inst._equippedBy) {
    nextAdventurers = nextAdventurers.map((a) => {
      if (a.id !== inst._equippedBy) return a;
      const totalGearTier = computeTotalGearTier(a.equippedGear, a.equippedInstanceId, nextInstanced);
      return { ...a, gear: totalGearTier };
    });
  }

  return {
    ...state,
    cash: (state.cash ?? 0) - cashCost,
    worldResources: {
      ...(state.worldResources ?? {}),
      mana_crystal: (state.worldResources?.mana_crystal ?? 0) - crystalCost,
      titan_core: (state.worldResources?.titan_core ?? 0) - titanCoreCost,
    },
    forgeGoodsInstanced: nextInstanced,
    adventurers: nextAdventurers,
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
  let nextGoodsInstanced = [...(state.forgeGoodsInstanced ?? [])];
  let forgeQuestTrackItem = null;
  const nextWorkers = (state.forgeWorkers ?? []).map((worker) => {
    if (!worker.busy || !worker.recipeId) return worker;
    const newElapsed = (worker.elapsedSeconds ?? 0) + dtSeconds;
    if (newElapsed < worker.totalSeconds) {
      return { ...worker, elapsedSeconds: newElapsed };
    }
    // Craft complete
    const recipe = FORGE_RECIPES[worker.recipeId];
    if (recipe) {
      const INSTANCED_FORGE_KEYS = new Set(["master_sword", "tower_shield", "plate_armor"]);
      if (INSTANCED_FORGE_KEYS.has(recipe.output.resourceKey)) {
        // T3 instanced items: push to forgeGoodsInstanced (not flat forgeGoods)
        // nextGoodsInstanced is mutated below after map returns
        nextGoodsInstanced.push({
          id: "fgi_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          key: recipe.output.resourceKey,
          upgradeTier: recipe.gearTier,
          _equippedBy: null,
        });
      } else {
        nextGoods[recipe.output.resourceKey] = (nextGoods[recipe.output.resourceKey] ?? 0) + 1;
      }
      forgeQuestTrackItem = recipe;
    }
    // Auto-restart?
    const hasAutoUpgrade = (worker.upgrades ?? []).includes("forge_auto");
    if (worker.autoRestart && hasAutoUpgrade && worker.lastRecipeId) {
      const restartRecipe = FORGE_RECIPES[worker.lastRecipeId];
      if (restartRecipe) {
        // Check if resources are available — inputs may come from forgeGoods (T1 gear used in T2/T3)
        // or worldResources (raw materials like iron_ore, lumber, rare_gem, etc.)
        const canRestart = Object.entries(restartRecipe.inputs).every(([key, needed]) => {
          const fromGoods = nextGoods[key] ?? 0;
          const fromResources = nextResources[key] ?? 0;
          return (fromGoods + fromResources) >= needed;
        });
        if (canRestart) {
          for (const [key, needed] of Object.entries(restartRecipe.inputs)) {
            // Deduct from forgeGoods first, then worldResources for the remainder
            const fromGoods = Math.min(nextGoods[key] ?? 0, needed);
            if (fromGoods > 0) nextGoods[key] = (nextGoods[key] ?? 0) - fromGoods;
            const remainder = needed - fromGoods;
            if (remainder > 0) nextResources[key] = (nextResources[key] ?? 0) - remainder;
          }
          const newTotal = getForgeEffectiveSeconds(worker, restartRecipe);
          return { ...worker, recipeId: worker.lastRecipeId, elapsedSeconds: 0, totalSeconds: newTotal, busy: true };
        }
      }
    }
    return { ...worker, recipeId: null, elapsedSeconds: 0, totalSeconds: 0, busy: false };
  });

  const nextQPForge = { ...(state.questProgress ?? {}) };
  if (forgeQuestTrackItem) {
    nextQPForge.forgeItemsCrafted = (nextQPForge.forgeItemsCrafted ?? 0) + 1;
    if (["chainmail","plate_armor","tower_shield","master_sword"].includes(forgeQuestTrackItem.output.resourceKey)) nextQPForge.chainmailOrBetterCrafted = true;
    if (["master_sword","tower_shield","plate_armor"].includes(forgeQuestTrackItem.output.resourceKey)) { nextQPForge.t3ItemCrafted = true; nextQPForge.t3ItemsCrafted = (nextQPForge.t3ItemsCrafted ?? 0) + 1; }
  }
  return { ...state, forgeWorkers: nextWorkers, forgeGoods: nextGoods, forgeGoodsInstanced: nextGoodsInstanced, worldResources: nextResources, questProgress: nextQPForge };
}

// ─── Boss Fight Engine ────────────────────────────────────────────────────────

// Returns the hero class for boss ability purposes
// Reads heroClass (set by skill tree) — falls back to adventurer.class for pre-skill heroes
export function getHeroBossClass(adventurer) {
  return adventurer.heroClass ?? adventurer.class ?? null;
}

// Resolve a boss def — handles both static BOSS_DEFS and procedural infinite bosses
// Infinite boss IDs are formatted as "infinite_N" where N is the 1-indexed wave number
export function getBossDef(bossId) {
  if (BOSS_DEFS[bossId]) return BOSS_DEFS[bossId];
  const m = /^infinite_(\d+)$/.exec(bossId);
  if (m) return generateInfiniteBoss(parseInt(m[1], 10));
  return null;
}

// Damage a hero deals to the boss per tick
export function getHeroBossDamage(adventurer, bossId, forgeGoodsInstanced = []) {
  const level = adventurer.level ?? 1;
  const gearTier = adventurer.gear ?? 0;
  const base = (adventurer.bossFightAbility?.tripleNextDamage ? 3 : 1);
  const def = getBossDef(bossId) ?? BOSS_DEFS[Object.keys(BOSS_DEFS)[0]];
  // Arcane sword bonus: +5 boss damage per arcane tier above 3
  const weaponInstId = adventurer.equippedInstanceId?.weapon ?? null;
  const weaponInst = weaponInstId
    ? forgeGoodsInstanced.find((i) => i.id === weaponInstId)
    : null;
  const arcaneSwordTiers = weaponInst ? Math.max(0, (weaponInst.upgradeTier ?? 3) - 3) : 0;
  const dmg = (def?.heroDamageBase ?? 8)
    + (level - 1) * BOSS_HERO_DAMAGE_LEVEL_SCALE
    + gearTier * BOSS_HERO_DAMAGE_GEAR_SCALE
    + arcaneSwordTiers * 7;
  const prestigeDmgMult = 1 + getHeroPrestigeDmgBonus(adventurer, true);
  return Math.round(dmg * base * prestigeDmgMult);
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
