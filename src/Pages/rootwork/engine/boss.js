// src/Pages/rootwork/engine/boss.js — boss fights
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
import { tick } from "./tick.js";
import { getAdventurerMaxHp, getAdventurerXpNeeded, getHeroBonusMaxHp, getHeroPrestigeDmgReduction, isHeroBusy } from "./heroes.js";
import { getBossDef, getHeroBossClass, getHeroBossDamage, initBossFight } from "./forge.js";
import { isHeroOnExpedition } from "./roads.js";

// Assign a hero to the boss fight (removes from mission flow)
export function assignHeroToBoss(state, heroId) {
  const bossFight = state.bossFight;
  if (!bossFight || bossFight.phase === "defeated") return state;
  const hero = (state.adventurers ?? []).find((a) => a.id === heroId);
  if (!hero || isHeroBusy(state, hero)) return state;

  const updatedAdv = { ...hero, bossAssigned: true, tavernResting: false, tavernBuff: null };
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
    const dmg = getHeroBossDamage(a, bossFight.bossId, state.forgeGoodsInstanced ?? []);
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
    // Arcane shield bonus: -5 boss damage per arcane tier above 3
    const shieldInstId = a.equippedInstanceId?.armour ?? null;
    const shieldInst = shieldInstId
      ? (state.forgeGoodsInstanced ?? []).find((i) => i.id === shieldInstId)
      : null;
    const arcaneShieldTiers = shieldInst ? Math.max(0, (shieldInst.upgradeTier ?? 3) - 3) : 0;
    const prestigeReduce = getHeroPrestigeDmgReduction(a, true);
    const reducedDmg = Math.max(0, Math.round((bossDmgPerHero - arcaneShieldTiers * 5) * (1 - prestigeReduce)));
    const newHp = Math.max(0, (a.hp ?? maxHp) - reducedDmg);
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

  // Increment boss win counter for quest tracking
  const stateWithCount = {
    ...state,
    questProgress: {
      ...(state.questProgress ?? {}),
      bossFightsWon: ((state.questProgress?.bossFightsWon) ?? 0) + 1,
    },
  };

  const nextBossId = bossFight.pendingResult?.nextBossId ?? null;
  if (nextBossId) {
    return initBossFight({ ...stateWithCount, bossFight: { ...bossFight, pendingResult: null } }, nextBossId);
  }
  // Fallback (should not happen with infinite chain) — clear result
  return { ...stateWithCount, bossFight: { ...bossFight, pendingResult: null } };
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
