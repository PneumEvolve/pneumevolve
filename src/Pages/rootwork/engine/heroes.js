// src/Pages/rootwork/engine/heroes.js — adventurers, missions, hero skills
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
import { isAtWorkerCap } from "./core.js";
import { getMaxHeroes, getTavernRegenRate, isTownBuildingBuilt } from "./town.js";
import { tick, updateTown } from "./tick.js";
import { getVelmoorXpBonus } from "./roads.js";
import { getGlobalBonus } from "./bonuses.js";
import { sendAdventurer } from "./roadsV2.js";

// ─── World / Adventurer Engine ────────────────────────────────────────────────

export function genWorldId(prefix) {
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
    buffBelt: {},
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
      buffBelt: adv.buffBelt ?? (adv.buffSlot ? { [adv.buffSlot]: 1 } : {}),
    };
  });
  return next;
}

// Infinite hero slots: cost doubles each slot with a steeper base
// Slot 0=$50, 1=$200, 2=$600, 3=$1.5k, 4=$4k, 5=$10k, 6=$25k ...
export function getAdventurerSlotCost(state) {
  const count = (state.adventurers ?? []).length;
  return Math.round(50 * Math.pow(3.5, count));
}

export function hireAdventurer(state, usedNames = new Set()) {
  if (isAtWorkerCap(state)) return state;
  if ((state.adventurers ?? []).length >= getMaxHeroes(state)) return state;
  const cost = getAdventurerSlotCost(state);
  if (cost === null) return state;
  if ((state.cash ?? 0) < cost) return state;
  const next = { ...state, cash: state.cash - cost };
  next.adventurers = [...(next.adventurers ?? []), createAdventurer("fighter", usedNames)];
  return next;
}

export function getAdventurerMissionDuration(adventurer, zone) {
  const base = zone.baseDuration ?? 30;
  const weaponKey = adventurer.equippedGear?.weapon ?? null;
  const weaponRecipe = weaponKey ? Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === weaponKey) : null;
  const weaponBonus = weaponRecipe?.missionTimeReduction ?? (weaponKey ? 0 : (adventurer.gear ?? 0) * 0.15);
  const lvlBonus = Math.min(((adventurer.level ?? 1) - 1) * 0.02, 0.15); // 2% per level, caps at 15% at level 8
  // Skill tree multiplier (mage speed skills)
  const skillMult = getHeroDurationMultiplier(adventurer);
  // Prestige speed bonus: -3% per prestige level, capped at 30% (all classes)
  const prestigeSpeedMult = getHeroPrestigeDurationBonus(adventurer);
  // Apply weapon/level reduction first (combined cap 45%: 15% level + 30% weapon)
  const gearLvlReduction = Math.min(Math.min(weaponBonus, 0.30) + lvlBonus, 0.45);
  const afterGear = base * (1 - gearLvlReduction);
  return Math.max(12, Math.round(afterGear * skillMult * prestigeSpeedMult));
}

export function getAdventurerFailChance(adventurer, zone) {
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

export function getAdventurerXpNeeded(level) {
  return Math.floor(10 * Math.pow(1.4, level - 1));
}

export function _legacySendAdventurer(state, adventurerId, zoneId, autoBattle = false) {
  const zone = WORLD_ZONES[zoneId];
  if (!zone) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  if (isHeroBusy(state, adventurer)) return state;
 
  let duration = getAdventurerMissionDuration(adventurer, zone);
  // (omelette is now +25% XP via buffBelt, no run_time effect)

  const mission = {
    zoneId,
    zoneName: zone.name,
    startTime: Date.now(),
    duration,
    autoBattle,
    tavernBuffEffect: null, // removed - tavern no longer grants mission buffs
    // Auto battle tracking state
    autoBattleRuns: 0,          // completed successful runs so far
    autoBattleLoot: [],         // accumulated loot across all runs
    autoBattleXp: 0,            // accumulated XP
    autoBattleLeveled: false,
    autoBattleDied: false,
    autoBattleOutOfPotions: false,
  };
 
  let heroHpAtStart = adventurer.hp ?? (adventurer.maxHp ?? 40);
  const updatedAdv = { ...adventurer, mission, tavernResting: false, tavernBuff: null, hp: heroHpAtStart };
  const next = { ...state, adventurers: [...state.adventurers] };
  next.adventurers[advIdx] = updatedAdv;
  return next;
}

// HELPER (internal): mergeLoot
// Combines two loot arrays, summing amounts for matching resourceKeys
// ─────────────────────────────────────────────────────────────────────────────
export function mergeLoot(existing, incoming) {
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
    // Credit loot to worldResources NOW (on collect click, not when run ended)
    let nextResources = { ...(state.worldResources ?? {}) };
    for (const l of (result.loot ?? [])) {
      nextResources[l.resourceKey] = (nextResources[l.resourceKey] ?? 0) + l.amount;
    }
    const next = { ...state, adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a), worldResources: nextResources };
    return { state: next, result };
  }

  const mission = adventurer.mission;
  if (!mission) return { state, result: null };
  const zone = WORLD_ZONES[mission.zoneId];
  if (!zone) return { state, result: null };
 
  const elapsed = (Date.now() - mission.startTime) / 1000;
  if (elapsed < mission.duration) return { state, result: null };
 
  // ── Single run result ────────────────────────────────────────────────────

  // Read any queued tavern buff (already consumed from hero on sendAdventurer, passed via mission snapshot)
  // The buff was stored on the adventurer before mission start — we read from current adventurer state
  const activeTavernEffect = null; // tavern mission buffs removed

  const failChance = getAdventurerFailChance(adventurer, zone);
  const failed = Math.random() < failChance;
  const activeBuff = (() => {
    const belt = adventurer.buffBelt ?? {};
    for (const id of ADVENTURER_BUFF_LIST) { if ((belt[id] ?? 0) > 0) return id; }
    return null;
  })();
  const hasCheeseBuff  = activeBuff === "cheese";
  const hasOmeletBuff  = activeBuff === "omelette";
  const hasFishPieBuff = activeBuff === "fish_pie";
  const hasSmokedFish  = activeBuff === "smoked_fish";
  const skills = adventurer.skills ?? {};
  const minLootBonus = getHeroMinLootBonus(adventurer) + getHeroPrestigeMinLootBonus(adventurer);

  let runLoot = [];
  let nextResources = { ...(state.worldResources ?? {}) };

  if (!failed) {
    for (const lootDef of zone.loot) {
      const amount = Math.floor(Math.random() * (lootDef.max - lootDef.min + 1)) + lootDef.min;
      let finalAmount = amount > 0 ? amount + minLootBonus : 0;
      if (hasCheeseBuff  && finalAmount > 0) finalAmount = Math.round(finalAmount * 1.25);
      if (hasFishPieBuff && finalAmount > 0) finalAmount = finalAmount + 1; // +1 min loot
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
  const effectiveMaxHp = hasSmokedFish ? Math.round(currentMaxHp * 1.10) : currentMaxHp;
  // Evasion: scavenger tree — each 10s tick has a chance to deal 0 damage
  const evasionChance = getHeroEvasionChance(adventurer);
  const totalTicks = Math.floor(mission.duration / 10);
  // Global mission damage modifier (season modifiers plug in here; 0 = no change)
  const globalDmgMult = Math.max(0, 1 + getGlobalBonus(state, "missionDamage"));
  let rawDamage = 0;
  for (let i = 0; i < totalTicks; i++) {
    if (Math.random() >= evasionChance) {
      rawDamage += dmgPerTick * (failed ? 1.5 : 0.6) * (1 - damageReduction) * (1 - getHeroPrestigeDmgReduction(adventurer, false)) * globalDmgMult;
    }
  }
  rawDamage = Math.round(rawDamage);
  const hpAfterDamage = Math.max(0, (adventurer.hp ?? effectiveMaxHp) - rawDamage);

  // Non-auto-battle death: if HP hits 0, hard fail regardless of fail chance
  const diedOnNormalRun = !mission.autoBattle && hpAfterDamage <= 0;
  const effectiveFailed = failed || diedOnNormalRun;

  const xpGained = effectiveFailed ? 0 : Math.round(zone.xpReward * getHeroXpMultiplier(adventurer) * (1 + getHeroPrestigeXpBonus(adventurer)) * (hasOmeletBuff ? 1.25 : 1) * (1 + getVelmoorXpBonus(state)) * Math.max(0, 1 + getGlobalBonus(state, "heroXp")));
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
  // Consume one buff from buffBelt (the active buff for this run)
  const buffSlotConsumed = (() => {
    if (!activeBuff) return adventurer.buffBelt ?? {};
    const belt = { ...(adventurer.buffBelt ?? {}) };
    belt[activeBuff] = Math.max(0, (belt[activeBuff] ?? 1) - 1);
    if (belt[activeBuff] === 0) delete belt[activeBuff];
    return belt;
  })();

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
      // Loot credited on collect click (not here)
 
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
        buffBelt: buffSlotConsumed,
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
    // Track high-water mark for quest progress
    if (state.questProgress && newRuns > (state.questProgress.maxAutoBattleRun ?? 0)) {
      state = { ...state, questProgress: { ...state.questProgress, maxAutoBattleRun: newRuns } };
    }
 
    // Check if we can do another run — need food belt to heal between runs
    const currentFoodBelt = { ...(adventurer.foodBelt ?? {}) };

    // Scavenger (scavenger_t4): food find fires BEFORE the cap check uses currentFoodBelt.
    // Must use currentFoodBelt (not adventurer.foodBelt) for the cap check — food consumption
    // happens later this tick, so adventurer.foodBelt is stale (1 item too full), which was
    // blocking Scavenger from adding food even when a slot was about to free up.
    const _scavRank = getHeroSkillRank(adventurer, "scavenger_t4");
    const _foodFindChance = [0, 0.15, 0.30, 0.60][Math.min(_scavRank, 3)] ?? 0;
    if (_scavRank >= 1 && _foodFindChance > 0 && Math.random() < _foodFindChance) {
      const beltCap = getBeltCap(adventurer, state.forgeGoodsInstanced ?? []);
      const currentBeltTotal = Object.values(currentFoodBelt).reduce((s, v) => s + v, 0);
      if (currentBeltTotal - 1 < beltCap) { // -1 accounts for food that will be consumed this run
        // Pick a random food item — only foods the player can actually craft (crop unlocked)
        const foodChoices = ARTISAN_FOOD_LIST.filter((id) => {
          const recipe = PROCESSING_RECIPES[id];
          return recipe && (state.crops?.[recipe.inputCrop] !== undefined);
        });
        if (foodChoices.length > 0) {
          const foundFoodId = foodChoices[Math.floor(Math.random() * foodChoices.length)];
          currentFoodBelt[foundFoodId] = (currentFoodBelt[foundFoodId] ?? 0) + 1;
        }
      }
    }
    const beltItems = ARTISAN_FOOD_LIST
      .filter((id) => (currentFoodBelt[id] ?? 0) > 0)
      .map((id) => ({ id, heal: ARTISAN_FOOD_HEAL[id]?.healAmount ?? 0 }))
      .sort((a, b) => a.heal - b.heal); // consume smallest heal first
    const hasBeltFood = beltItems.length > 0;

    // (Relentless handled below after food check)

    // Player requested stop — finish this run then collect cleanly
    if (mission.autoBattleStopRequested) {
      // Loot credited on collect click (not here)
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
        buffBelt: buffSlotConsumed,
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
      // Loot credited on collect click (not here)
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
        buffBelt: buffSlotConsumed,
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

    // Relentless (fighter_t4): skip food based on rank — higher rank = more aggressive food saving
    // Rank 1: skip food if HP >= 70% (barely hurt)
    // Rank 2: skip food if HP >= 50% (moderately hurt)
    // Rank 3: skip food if HP >= 30% (pretty hurt, trust the belt)
        const relentlessThreshold = getRelentlessThreshold(adventurer);
        const relentlessSkipFood = relentlessThreshold !== null && hpAfterDamage >= Math.floor(bonusMaxHp * relentlessThreshold);

    // Relentless: skip food consumption and re-queue without eating
    if (relentlessSkipFood) {
      let nextDurationRelentless = getAdventurerMissionDuration({ ...adventurer, level: newLevel, skills }, zone);
      // (tavern mission buffs removed)
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
        buffBelt: buffSlotConsumed,
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
    const autoRunMaxHp = bonusMaxHp;
    const hpAfterFood = Math.min(autoRunMaxHp, hpAfterDamage + foodHeal);
    let nextDuration = getAdventurerMissionDuration({ ...adventurer, level: newLevel, skills }, zone);
    // (tavern speed buff removed)
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
      xp: newXp, level: newLevel, maxHp: autoRunMaxHp,
      hp: hpAfterFood,
      foodBelt: currentFoodBelt,
      buffBelt: buffSlotConsumed,
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
      buffBelt: buffSlotConsumed,
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
    buffBelt: buffSlotConsumed,
    mission: null,
    skillPoints: newSkillPoints,
    prestigeLevel: adventurer.prestigeLevel ?? 0,
  };
 
  const nextQPHero = { ...(state.questProgress ?? {}) };
  if (!effectiveFailed) {
    nextQPHero.heroQuestsCompleted = (nextQPHero.heroQuestsCompleted ?? 0) + 1;
    if ((zone.gearRequired ?? 1) >= 4) nextQPHero.tier2QuestsCompleted = (nextQPHero.tier2QuestsCompleted ?? 0) + 1;
  }
  const next = {
    ...state,
    adventurers: state.adventurers.map((a) => a.id === adventurerId ? updatedAdv : a),
    worldResources: nextResources,
    worldZoneClears: { ...(state.worldZoneClears ?? {}), [zone.id]: newClears },
    questProgress: nextQPHero,
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
    questProgress: state.questProgress,
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
  if (isHeroBusy(state, adventurer)) return state;

  // Must be level 15+ to prestige
  if ((adventurer.level ?? 1) < HERO_PRESTIGE_MIN_LEVEL) return state;

  const heroClass = getHeroClass(adventurer);

  const currentPrestige = adventurer.prestigeLevel ?? 0;
  const cost = HERO_PRESTIGE_COST_BASE * (currentPrestige + 1);
  if ((state.cash ?? 0) < cost) return state;

  const newPrestigeLevel = currentPrestige + 1;
  const newMaxHp = ADVENTURER_BASE_HP; // resets to base — skills rebuild it
  const nextQPPrestige = { ...(state.questProgress ?? {}), heroPrestiges: ((state.questProgress?.heroPrestiges ?? 0) + 1) };

  // Record the last class for "suggested class" on next run
  const prestigeBonuses = { ...(adventurer.prestigeBonuses ?? {}) };
  if (heroClass) {
    prestigeBonuses[heroClass] = (prestigeBonuses[heroClass] ?? 0) + 1;
  }

  // After skills reset, compute the new belt cap (no skill bonuses, just prestige+gear)
  // and trim any excess food from the belt so count never exceeds cap.
  const postPrestigeAdv = { ...adventurer, skills: {}, heroClass: null, prestigeLevel: newPrestigeLevel };
  const newBeltCap = getBeltCap(postPrestigeAdv, state.forgeGoodsInstanced ?? []);
  const oldBelt = adventurer.foodBelt ?? {};
  let trimmedBelt = { ...oldBelt };
  let beltTotal = Object.values(trimmedBelt).reduce((s, v) => s + v, 0);
  if (beltTotal > newBeltCap) {
    // Remove items from the belt (return them to artisan stock) until within cap
    // Iterate in a defined order and remove from the last food type first
    const beltKeys = Object.keys(trimmedBelt).filter((k) => trimmedBelt[k] > 0);
    let toRemove = beltTotal - newBeltCap;
    // We just drop the excess (simpler than returning to stock mid-prestige)
    for (let ki = beltKeys.length - 1; ki >= 0 && toRemove > 0; ki--) {
      const key = beltKeys[ki];
      const remove = Math.min(trimmedBelt[key], toRemove);
      trimmedBelt[key] = trimmedBelt[key] - remove;
      toRemove -= remove;
      if (trimmedBelt[key] === 0) delete trimmedBelt[key];
    }
  }

  // Trim buffBelt to new cap
  const newBuffBelt = { ...(adventurer.buffBelt ?? {}) };
  let buffBeltTotal = Object.values(newBuffBelt).reduce((s, v) => s + v, 0);
  for (const id of ADVENTURER_BUFF_LIST) {
    while (buffBeltTotal > newBeltCap && (newBuffBelt[id] ?? 0) > 0) {
      newBuffBelt[id]--;
      if (newBuffBelt[id] === 0) delete newBuffBelt[id];
      buffBeltTotal--;
    }
  }

  const updatedAdv = {
    ...adventurer,
    level: 1,
    xp: 0,
    skills: {},             // full reset — respec available
    heroClass: null,        // class choice unlocked again
    skillPoints: newPrestigeLevel,
    prestigeLevel: newPrestigeLevel,
    prestigeBonuses,
    maxHp: newMaxHp,
    hp: newMaxHp,
    mission: null,
    foodBelt: trimmedBelt,
    buffBelt: newBuffBelt,
    // gear kept as-is
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
  // Auto-battle granted at class selection (tier 1)
  return (
    hasHeroSkill(adventurer, "fighter_t1") ||
    hasHeroSkill(adventurer, "mage_t1") ||
    hasHeroSkill(adventurer, "scavenger_t1")
  );
}

// Computed stat helpers
// ─── Prestige Combat Bonuses ──────────────────────────────────────────────────
// Base: +2% dmg dealt / -1.6% dmg taken per prestige level (missions + bosses)
// Boss-only: additional +2% dmg dealt / -1.6% dmg taken per prestige level
// Class history (additive, capped at 5 stacks each):
//   fighter prestiges → -1% dmg taken per stack (max -5%)
//   mage    prestiges → +2% XP per stack (max +10%)
//   scavenger prestiges → +1 min loot per stack (max +5)
// Hard floor: total prestige damage reduction never exceeds 50%

export const PRESTIGE_DMG_BONUS_PER_LEVEL   = 0.02;  // +2% per prestige
export const PRESTIGE_DMG_RED_PER_LEVEL     = 0.016; // -1.6% per prestige
export const PRESTIGE_BOSS_DMG_BONUS        = 0.02;  // extra +2% per prestige vs bosses
export const PRESTIGE_BOSS_DMG_RED          = 0.016; // extra -1.6% per prestige vs bosses
export const PRESTIGE_CLASS_STACK_CAP       = 5;
export const PRESTIGE_DMG_RED_FLOOR         = 0.50;  // max 50% total prestige dmg reduction

// Returns additive damage dealt multiplier bonus from prestige (e.g. 0.06 = +6%)
export function getHeroPrestigeDmgBonus(adventurer, isBoss = false) {
  const p = adventurer.prestigeLevel ?? 0;
  if (p === 0) return 0;
  const base = p * PRESTIGE_DMG_BONUS_PER_LEVEL;
  const bossExtra = isBoss ? p * PRESTIGE_BOSS_DMG_BONUS : 0;
  return base + bossExtra;
}

// Returns damage reduction from prestige (0–0.5 range, hard floor at 0.5)
export function getHeroPrestigeDmgReduction(adventurer, isBoss = false) {
  const p = adventurer.prestigeLevel ?? 0;
  if (p === 0) return 0;
  const pb = adventurer.prestigeBonuses ?? {};
  const fighterStacks = Math.min(pb.fighter ?? 0, PRESTIGE_CLASS_STACK_CAP);
  const base = p * PRESTIGE_DMG_RED_PER_LEVEL;
  const bossExtra = isBoss ? p * PRESTIGE_BOSS_DMG_RED : 0;
  const classBonus = fighterStacks * 0.01;
  return Math.min(PRESTIGE_DMG_RED_FLOOR, base + bossExtra + classBonus);
}

// Returns additive XP multiplier bonus from mage prestige history (e.g. 0.06 = +6%)
export function getHeroPrestigeXpBonus(adventurer) {
  const pb = adventurer.prestigeBonuses ?? {};
  const mageStacks = Math.min(pb.mage ?? 0, PRESTIGE_CLASS_STACK_CAP);
  return mageStacks * 0.02;
}

// Returns flat min loot bonus from scavenger prestige history (integer, max +5)
export function getHeroPrestigeMinLootBonus(adventurer) {
  const pb = adventurer.prestigeBonuses ?? {};
  const scavStacks = Math.min(pb.scavenger ?? 0, PRESTIGE_CLASS_STACK_CAP);
  return scavStacks;
}

// Returns duration multiplier from prestige speed: -3% per prestige level, capped at 30%.
// Applies to all heroes regardless of class.
export function getHeroPrestigeDurationBonus(adventurer) {
  const p = adventurer.prestigeLevel ?? 0;
  if (p === 0) return 1;
  const reduction = Math.min(p * 0.03, 0.30);
  return 1 - reduction;
}

export function getHeroBonusMaxHp(adventurer) {
  let bonus = 0;
  // fighter_t1: +10 HP per rank (ranks 1/2/3 => +10/+20/+30)
  bonus += getHeroSkillRank(adventurer, "fighter_t1") * 10;
  // fighter_t5: +10 HP per rank
  bonus += getHeroSkillRank(adventurer, "fighter_t5") * 10;
  return bonus;
}

export function getHeroHealBonus(adventurer) {
  // fighter_t2 Iron Rations: +5 HP flat per rank (swapped from t6)
  const ironRationsBonus = getHeroSkillRank(adventurer, "fighter_t2") * 5;
  // fighter_t6 Resilience: +10% per rank (swapped from t2)
  const resilienceBonus = getHeroSkillRank(adventurer, "fighter_t6") * 0.10;
  return { multiplier: 1 + resilienceBonus, flatBonus: ironRationsBonus };
}

export function getHeroEvasionChance(adventurer) {
  let chance = 0;
  // scavenger_t2 Ghost Step: +10% evasion per rank
  chance += getHeroSkillRank(adventurer, "scavenger_t2") * 0.10;
  // scavenger_t6 Phantom: +5% evasion per rank
  chance += getHeroSkillRank(adventurer, "scavenger_t6") * 0.05;
  return Math.min(chance, 0.75); // cap at 75%
}

export function getHeroMinLootBonus(adventurer) {
  let bonus = 0;
  // scavenger_t1 Sharp Eyes: +1 min loot per rank
  bonus += getHeroSkillRank(adventurer, "scavenger_t1");
  // scavenger_t5 Keen Eye: +1 min loot per rank
  bonus += getHeroSkillRank(adventurer, "scavenger_t5");
  return bonus;
}

export function getHeroDurationMultiplier(adventurer) {
  let reduction = 0;
  // mage_t1 Flicker Step: -8%/-15%/-22% per rank
  const flickerByRank = [0, 0.08, 0.15, 0.22];
  reduction += flickerByRank[Math.min(getHeroSkillRank(adventurer, "mage_t1"), 3)] ?? 0;
  // mage_t4 Blink: rank 2 = -15%, rank 3 = -25% (rank 1 = auto-battle only)
  const blinkByRank = [0, 0.10, 0.15, 0.25];
  reduction += blinkByRank[Math.min(getHeroSkillRank(adventurer, "mage_t4"), 3)] ?? 0;
  // mage_t5 Swiftness: -5% per rank
  reduction += getHeroSkillRank(adventurer, "mage_t5") * 0.05;
  return Math.max(0.25, 1 - reduction); // floor at 25% of base
}

export function getHeroXpMultiplier(adventurer) {
  let bonus = 0;
  // mage_t2 Spell Surge: +8%/+15%/+22% per rank
  const surgeByRank = [0, 0.08, 0.15, 0.22];
  bonus += surgeByRank[Math.min(getHeroSkillRank(adventurer, "mage_t2"), 3)] ?? 0;
  // mage_t6 Mind Over Matter: +15% per rank
  bonus += getHeroSkillRank(adventurer, "mage_t6") * 0.15;
  return 1 + bonus;
}

// Returns true if this hero's tree has cross-system effect active (rank >= 1)
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

// Returns the highest rank of a given cross-system skill across all adventurers
export function maxHeroCrossRank(state, skillId) {
  return Math.max(0, ...(state.adventurers ?? []).map((a) => getHeroSkillRank(a, skillId)));
}

// fighter_t3 Hearth Guardian: 15%/30%/50% bread speed reduction per rank
export function getHeroBreadSpeedMultiplier(state) {
  const rank = maxHeroCrossRank(state, "fighter_t3");
  const reductions = [0, 0.15, 0.30, 0.50];
  const reduction = reductions[Math.min(rank, 3)] ?? 0;
  return 1 - reduction; // e.g. rank 3 => 0.50 => multiplier 0.50
}

// scavenger_t3 Fence Network: +5%/+10%/+15% market price per rank
export function getHeroMarketBonus(state) {
  const rank = maxHeroCrossRank(state, "scavenger_t3");
  return 1 + rank * 0.05;
}

// mage_t3 Arcane Focus: 10%/20%/30% kitchen bonus chance per rank
export function getHeroKitchenBonusChance(state) {
  const rank = maxHeroCrossRank(state, "mage_t3");
  return rank * 0.10;
}

// Cost to buy the next rank of a skill: rank 1 costs 1pt, rank 2 costs 2pts, rank 3 costs 3pts
export function getSkillRankCost(currentRank) {
  return currentRank + 1; // buying rank (currentRank+1) costs (currentRank+1) points
}

// Validation: can a skill point be spent on a given skill?
export function canSpendHeroSkillPoint(adventurer, skillId, prestigeLevel) {
  const def = HERO_SKILL_DEFS[skillId];
  if (!def) return false;

  const currentRank = getHeroSkillRank(adventurer, skillId);
  if (currentRank >= def.maxRank) return false; // already maxed

  const cost = getSkillRankCost(currentRank);
  if ((adventurer.skillPoints ?? 0) < cost) return false;

  const heroClass = getHeroClass(adventurer);
  const pLevel = prestigeLevel ?? 0;

  // Determine which tree this skill belongs to
  const skillTree = Object.entries(HERO_SKILL_TREES).find(([, skills]) =>
    skills.some((s) => s.id === skillId)
  )?.[0];
  if (!skillTree) return false;

  // Tier-1 skills: rank 1 unlocks class; ranks 2-3 continue normally in own class
  if (def.tier === 1) {
    if (!heroClass) return true; // no class yet — allow first purchase
    if (skillTree !== heroClass) return false; // can't rank another class's tier-1
    // own class tier-1 ranks 2-3 fall through to normal primary-tree check
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

  // Cost scales with rank being purchased: rank 1=1pt, rank 2=2pts, rank 3=3pts
  const rankCost = getSkillRankCost(currentRank);

  let updatedAdv = {
    ...adventurer,
    skillPoints: (adventurer.skillPoints ?? 0) - rankCost,
    skills: newSkillMap,
    heroClass: newHeroClass,
  };

  // Heal hero to new computed max when buying HP skills (getHeroBonusMaxHp handles the bonus, no manual mutation)
  if (skillId === "fighter_t1" || skillId === "fighter_t5") {
    const trueNewMax = getAdventurerMaxHp(updatedAdv) + getHeroBonusMaxHp(updatedAdv);
    updatedAdv = { ...updatedAdv, maxHp: trueNewMax, hp: trueNewMax };
  }

  return { ...state, adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a) };
}

// Helper: compute total gear tier across all slots, respecting instanced item upgrade tiers
export function computeTotalGearTier(equippedGear, equippedInstanceId, forgeGoodsInstanced) {
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
export function getBeltCap(adventurer, forgeGoodsInstanced = []) {
  let cap = 3;
  // belt_capacity legacy skill removed — slots now come from gear and prestige
  cap += (adventurer.prestigeLevel ?? 0); // +1 per prestige
  // Body armor: add foodSlotBonus from equipped body recipe
  const bodyKey = adventurer.equippedGear?.body ?? null;
  const bodyRecipe = bodyKey ? Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === bodyKey) : null;
  cap += bodyRecipe?.foodSlotBonus ?? 0;
  // Arcane armor bonus: +1 food slot per arcane tier above 3
  const armorInstId = adventurer.equippedInstanceId?.body ?? null;
  const armorInst = armorInstId
    ? forgeGoodsInstanced.find((i) => i.id === armorInstId)
    : null;
  cap += armorInst ? Math.max(0, (armorInst.upgradeTier ?? 3) - 3) : 0;
  // Food slot skills: Provisioner / Abundance / Pack Rat (+1/+2/+3 per rank)
  cap += getHeroSkillRank(adventurer, "fighter_t4b");
  cap += getHeroSkillRank(adventurer, "mage_t4b");
  cap += getHeroSkillRank(adventurer, "scavenger_t4b");
  return cap;
}

// ─── Artisan Food as Heal Items ────────────────────────────────────────────────

export function giveArtisanFood(state, adventurerId, foodId) {
  if (!ARTISAN_FOOD_LIST.includes(foodId)) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const foodDef = ARTISAN_FOOD_HEAL[foodId];
  const source = foodDef?.source ?? "artisan";
  const stockObj = source === "animalGoods" ? (state.animalGoods ?? {}) : (state.artisan ?? {});
  if ((stockObj[foodId] ?? 0) < 1) return state;
  const adventurer = state.adventurers[advIdx];
  const belt = adventurer.foodBelt ?? {};
  const foodTotal = Object.values(belt).reduce((s, v) => s + v, 0);
  if (foodTotal >= getBeltCap(adventurer, state.forgeGoodsInstanced ?? [])) return state;
  const updatedAdv = { ...adventurer, foodBelt: { ...belt, [foodId]: (belt[foodId] ?? 0) + 1 } };
  return {
    ...state,
    ...(source === "animalGoods"
      ? { animalGoods: { ...stockObj, [foodId]: stockObj[foodId] - 1 } }
      : { artisan: { ...(state.artisan ?? {}), [foodId]: (state.artisan ?? {})[foodId] - 1 } }),
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
  };
}

// ─── Buff Slot (omelette/cheese) ──────────────────────────────────────────────

export function giveBuffItem(state, adventurerId, buffId) {
  if (!ADVENTURER_BUFF_LIST.includes(buffId)) return state;
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  // Check buff belt cap (mirrors food belt cap)
  const beltCap = getBeltCap(adventurer, state.forgeGoodsInstanced ?? []);
  const buffBelt = adventurer.buffBelt ?? {};
  const buffTotal = Object.values(buffBelt).reduce((s, v) => s + v, 0);
  if (buffTotal >= beltCap) return state;
  // Source: artisan goods or animal goods depending on item
  const itemDef = ADVENTURER_BUFF_ITEMS[buffId];
  const source = itemDef?.source ?? "animalGoods";
  const stockObj = source === "artisan" ? (state.artisan ?? {}) : (state.animalGoods ?? {});
  if ((stockObj[buffId] ?? 0) < 1) return state;
  const newStock = { ...stockObj, [buffId]: stockObj[buffId] - 1 };
  const newBelt = { ...buffBelt, [buffId]: (buffBelt[buffId] ?? 0) + 1 };
  return {
    ...state,
    ...(source === "artisan" ? { artisan: newStock } : { animalGoods: newStock }),
    adventurers: state.adventurers.map((a, i) => i === advIdx ? { ...a, buffBelt: newBelt } : a),
  };
}

export function removeBuffItem(state, adventurerId, buffId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  const adventurer = state.adventurers[advIdx];
  const buffBelt = adventurer.buffBelt ?? {};
  const qty = buffBelt[buffId] ?? 0;
  if (!buffId || qty <= 0) return state;
  const itemDef = ADVENTURER_BUFF_ITEMS[buffId];
  const source = itemDef?.source ?? "animalGoods";
  const stockObj = source === "artisan" ? (state.artisan ?? {}) : (state.animalGoods ?? {});
  const newStock = { ...stockObj, [buffId]: (stockObj[buffId] ?? 0) + qty };
  const newBelt = { ...buffBelt };
  delete newBelt[buffId];
  return {
    ...state,
    ...(source === "artisan" ? { artisan: newStock } : { animalGoods: newStock }),
    adventurers: state.adventurers.map((a, i) => i === advIdx ? { ...a, buffBelt: newBelt } : a),
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
  const foodDef = ARTISAN_FOOD_HEAL[foodId];
  const source = foodDef?.source ?? "artisan";
  return {
    ...state,
    ...(source === "animalGoods"
      ? { animalGoods: { ...(state.animalGoods ?? {}), [foodId]: ((state.animalGoods ?? {})[foodId] ?? 0) + 1 } }
      : { artisan: { ...(state.artisan ?? {}), [foodId]: ((state.artisan ?? {})[foodId] ?? 0) + 1 } }),
    adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a),
  };
}

// Persist the hero's preferred fill food so the Fill button remembers it across renders
export function setHeroFillFood(state, adventurerId, foodId) {
  const advIdx = (state.adventurers ?? []).findIndex((a) => a.id === adventurerId);
  if (advIdx === -1) return state;
  return {
    ...state,
    adventurers: state.adventurers.map((a, i) => i === advIdx ? { ...a, lastFillFoodId: foodId } : a),
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
  // Resting at the tavern and now full: pulled out automatically
  if (newHp >= maxHp && updatedAdv.tavernResting) updatedAdv.tavernResting = false;
  return { ...state, adventurers: state.adventurers.map((a, i) => i === advIdx ? updatedAdv : a) };
}



// Heroes away from town (expedition or dungeon) can't be resting at the tavern.
// Their real HP lives in the expedition/dungeon state, so adventurer.hp is stale while away.
export function isHeroAwayFromTown(state, heroId) {
  if ((state.dungeonRun?.heroIds ?? []).includes(heroId)) return true;
  return Object.values(state.expeditions ?? {}).some((exp) => (exp?.heroIds ?? []).includes(heroId));
}

// One source of truth for "is this hero doing something?"
// Returns the activity, or null if free. Resting at the tavern counts as free.
export function getHeroActivity(state, hero) {
  if (!hero) return "missing";
  if ((state.dungeonRun?.heroIds ?? []).includes(hero.id)) return "dungeon";
  if (Object.values(state.expeditions ?? {}).some((exp) => (exp?.heroIds ?? []).includes(hero.id))) return "expedition";
  if (hero.bossAssigned || (state.bossFight?.assignedHeroIds ?? []).includes(hero.id)) return "boss";
  if (hero.mission) return hero.mission.autoBattle ? "auto" : "mission";
  if (hero.pendingAutoCollect) return "collect";
  if ((hero.hp ?? hero.maxHp ?? 1) <= 0) return "dead";
  return null;
}

export function isHeroBusy(state, hero) {
  return getHeroActivity(state, hero) !== null;
}

// ─── Relentless threshold (player-chosen) ─────────────────────────────────────
// Rank 1 unlocks 70%, rank 2 adds 50%, rank 3 adds 30%. "off" = always eat.
export const RELENTLESS_OPTIONS = [0.70, 0.50, 0.30];

// Returns the HP fraction to skip food at, or null when Relentless is off / not owned.
export function getRelentlessThreshold(adventurer) {
  const rank = Math.min(getHeroSkillRank(adventurer, "fighter_t4"), 3);
  if (rank <= 0) return null;
  const pick = adventurer.relentlessThreshold;
  if (pick === "off") return null;
  const allowed = RELENTLESS_OPTIONS.slice(0, rank);
  if (typeof pick === "number" && allowed.includes(pick)) return pick;
  return allowed[allowed.length - 1]; // default: strongest unlocked (old behaviour)
}

export function setRelentlessThreshold(state, adventurerId, value) {
  if (value !== "off" && !RELENTLESS_OPTIONS.includes(value)) return state;
  return {
    ...state,
    adventurers: (state.adventurers ?? []).map((a) =>
      a.id === adventurerId ? { ...a, relentlessThreshold: value } : a
    ),
  };
}

// ─── Expedition perks (tier 3b) ───────────────────────────────────────────────
export function getHeroExpDmgReduction(adventurer) {
  const r = Math.min(getHeroSkillRank(adventurer, "fighter_t3b"), 3);
  return HERO_SKILL_DEFS.fighter_t3b?.expDmgReductionPerRank?.[r] ?? 0;
}
export function getHeroExpRollIntervalMult(adventurer) {
  const r = Math.min(getHeroSkillRank(adventurer, "mage_t3b"), 3);
  return HERO_SKILL_DEFS.mage_t3b?.expRollIntervalMultPerRank?.[r] ?? 1;
}
export function getHeroExpLootMult(adventurer) {
  const r = Math.min(getHeroSkillRank(adventurer, "scavenger_t3b"), 3);
  return 1 + (HERO_SKILL_DEFS.scavenger_t3b?.expLootBonusPerRank?.[r] ?? 0);
}

// Tick adventurer regen (call from main tick, not forge tick)
export function tickAdventurerRegen(state, dtSeconds) {
  if (!(state.adventurers ?? []).length) return state;
  const tavernBuilt = isTownBuildingBuilt(state, "tavern");
  const updated = state.adventurers.map((adv) => {
    // Away on expedition/dungeon: never resting (also clears the flag on old saves)
    if (isHeroAwayFromTown(state, adv.id)) return adv.tavernResting ? { ...adv, tavernResting: false } : adv;
    const trueMax = adv.maxHp ?? (getAdventurerMaxHp(adv) + getHeroBonusMaxHp(adv));
    const hp = adv.hp ?? trueMax;
    if (hp <= 0) return adv;
    if (adv.mission) return adv;
    if (adv.bossAssigned) return adv;
    if (hp >= trueMax) {
      // Full HP — done resting, clear the flag so the world badge fires
      return adv.tavernResting ? { ...adv, tavernResting: false } : adv;
    }
    // Only regen if resting at tavern — no passive regen otherwise
    if (!tavernBuilt || !adv.tavernResting) return adv;
    const tavernRegen = getTavernRegenRate(state);
    const newHp = Math.min(trueMax, hp + tavernRegen * dtSeconds);
    return { ...adv, hp: newHp };
  });
  return { ...state, adventurers: updated };
}

// ─── Tavern rest assign/remove ────────────────────────────────────────────────

export function assignHeroToTavern(state, heroId) {
  const tavernBuilt = isTownBuildingBuilt(state, "tavern");
  if (!tavernBuilt) return state;
  const adv = (state.adventurers ?? []).find((a) => a.id === heroId);
  if (!adv) return state;
  if (isHeroBusy(state, adv)) return state;
  if ((adv.hp ?? adv.maxHp) <= 0) return state;      // dead
  if (adv.tavernResting) return state;                // already there
  return {
    ...state,
    adventurers: state.adventurers.map((a) =>
      a.id === heroId ? { ...a, tavernResting: true } : a
    ),
  };
}

export function removeHeroFromTavern(state, heroId) {
  return {
    ...state,
    adventurers: (state.adventurers ?? []).map((a) =>
      a.id === heroId ? { ...a, tavernResting: false } : a
    ),
  };
}

// Called each town pulse — awards XP (tier 2) and class buff (tier 3) to resting heroes
export function tickTavernRestPulse(state) {
  // Auto-rest: idle heroes at the tavern regen HP each town pulse.
  // "Idle" means not on a mission and not assigned to a boss fight.
  const tavernBuilt = isTownBuildingBuilt(state, "tavern");
  if (!tavernBuilt) return state;
  const regenPerPulse = getTavernRegenRate(state) * TOWN_PULSE_SECONDS;
  if (regenPerPulse <= 0) return state;

  const next = state; // already a deep clone from updateTown caller
  next.adventurers = (next.adventurers ?? []).map((adv) => {
    const isIdle    = !adv.mission && !adv.bossAssigned && !isHeroAwayFromTown(next, adv.id);
    const isAlive   = (adv.hp ?? 0) > 0;       // dead heroes must be manually revived
    const isResting = adv.tavernResting === true; // must be explicitly assigned to tavern
    const needsHeal = (adv.hp ?? 0) < (adv.maxHp ?? 1);
    if (!isIdle || !isAlive || !isResting || !needsHeal) return adv;
    return { ...adv, hp: Math.min(adv.maxHp ?? adv.hp, (adv.hp ?? 0) + regenPerPulse) };
  });
  return next;
}

// Legacy: tavern class buffs removed. Kept for save compat.
export function getHeroTavernBuff(adventurer) {
  return null;
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
  return tickAdventurerMissionsAt(state, Date.now());
}

export function tickAdventurerMissionsAt(state, nowMs) {
  // Track simultaneous auto-battlers high-water mark
  const activeAutoBattlers = (state.adventurers ?? []).filter(a => a.mission?.autoBattle === true).length;
  if (activeAutoBattlers > 0 && state.questProgress) {
    const prev = state.questProgress.maxSimultaneousAutoBattlers ?? 0;
    if (activeAutoBattlers > prev) {
      state = { ...state, questProgress: { ...state.questProgress, maxSimultaneousAutoBattlers: activeAutoBattlers } };
    }
  }
  let next = state;
  for (const adv of (state.adventurers ?? [])) {
    // Already waiting for player to collect — don't re-process
    if (adv.pendingAutoCollect) continue;
    if (!adv.mission?.autoBattle) continue;
    const elapsed = (nowMs - adv.mission.startTime) / 1000;
    if (elapsed < adv.mission.duration) continue;
    const { state: afterState, result } = returnAdventurer(next, adv.id);
    next = afterState;
    // After auto-battle fires during offline sim, update the new mission's startTime
    // relative to simNow so subsequent iterations can fire further completions
    const freshAdv = next.adventurers?.find((a) => a.id === adv.id);
    if (freshAdv?.mission) {
      const overrun = elapsed - adv.mission.duration;
      const newStart = nowMs - overrun * 1000;
      next = {
        ...next,
        adventurers: next.adventurers.map((a) =>
          a.id === adv.id ? { ...a, mission: { ...a.mission, startTime: newStart } } : a
        ),
      };
    }
    if (result) {
      next = { ...next, pendingAutoBattleResult: { ...result, adventurerId: adv.id } };
    }
  }
  // Auto-rest: if tavern is built, any hero who just returned (idle, alive, not full HP)
  // automatically starts resting so the player doesn't have to manually press "Rest".
  if (isTownBuildingBuilt(next, "tavern")) {
    next = {
      ...next,
      adventurers: (next.adventurers ?? []).map((a) => {
        if (a.mission) return a;                      // still on a mission
        if (a.pendingAutoCollect) return a;           // waiting for collect tap
        if (a.bossAssigned) return a;                 // in boss fight
        if (isHeroAwayFromTown(next, a.id)) return a; // on expedition / in dungeon
        if ((a.hp ?? 0) <= 0) return a;               // dead — must be revived manually
        if (a.tavernResting) return a;                // already resting
        if ((a.hp ?? 0) >= (a.maxHp ?? 1)) return a; // full HP, no need
        return { ...a, tavernResting: true };
      }),
    };
  }
  return next;
}