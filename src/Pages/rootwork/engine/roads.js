// src/Pages/rootwork/engine/roads.js — roads, trade towns, expeditions
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
import { getAdventurerMaxHp, getAdventurerXpNeeded, getHeroBonusMaxHp, getHeroMinLootBonus, getHeroPrestigeMinLootBonus, getHeroPrestigeXpBonus, getHeroXpMultiplier, isHeroBusy, getHeroExpDmgReduction, getHeroExpRollIntervalMult, getHeroExpLootMult  } from "./heroes.js";
import { getExpeditionAvailable, isTownConnected } from "./roadsV2.js";

// =============================================================================
// ROADS
// =============================================================================

export function getRoadLevel(state) {
  return state.roads?.level ?? 0;
}

export function getRoadTier(state) {
  const level = getRoadLevel(state);
  return ROAD_TIERS[level - 1] ?? null;
}

export function getRoadNextTier(state) {
  const level = getRoadLevel(state);
  return ROAD_TIERS[level] ?? null;
}

export function canAffordRoad(state) {
  const next = getRoadNextTier(state);
  if (!next) return false;
  if ((state.cash ?? 0) < next.buildCost) return false;
  for (const [k, v] of Object.entries(next.buildRequires ?? {})) {
    const have = (state.worldResources?.[k] ?? 0) + (state.forgeGoods?.[k] ?? 0);
    if (have < v) return false;
  }
  return true;
}

export function _legacyBuildOrUpgradeRoad(state) {
  const next = getRoadNextTier(state);
  if (!next) return state;
  if (!canAffordRoad(state)) return state;
  const newResources = { ...(state.worldResources ?? {}) };
  const newForgeGoods = { ...(state.forgeGoods ?? {}) };
  for (const [k, v] of Object.entries(next.buildRequires ?? {})) {
    let needed = v;
    const fromWorld = Math.min(needed, newResources[k] ?? 0);
    if (fromWorld > 0) { newResources[k] = (newResources[k] ?? 0) - fromWorld; needed -= fromWorld; }
    if (needed > 0) { newForgeGoods[k] = (newForgeGoods[k] ?? 0) - needed; }
  }
  const newTradeTowns = { ...(state.tradeTowns ?? {}) };
  return {
    ...state,
    cash: (state.cash ?? 0) - next.buildCost,
    worldResources: newResources,
    forgeGoods: newForgeGoods,
    roads: { level: next.level },
    tradeTowns: newTradeTowns,
  };
}

export function _legacyTickRoads(state) {
  const level = getRoadLevel(state);
  if (level === 0) return state;
  let next = { ...state, worldResources: { ...(state.worldResources ?? {}) } };
  let anyDisabled = false;
  // Evaluate each tier independently — highest failing tier gets toggled off
  for (let i = 0; i < level; i++) {
    const roadTier = ROAD_TIERS[i];
    const enabledKey = `road_${roadTier.level}_enabled`;
    if (next.roads?.[enabledKey] === false) continue;
    const iron   = roadTier.upkeepPerTick.iron_ore;
    const lumber = roadTier.upkeepPerTick.lumber;
    const canAfford = (next.worldResources.iron_ore ?? 0) >= iron &&
                      (next.worldResources.lumber   ?? 0) >= lumber;
    if (canAfford) {
      next.worldResources.iron_ore = (next.worldResources.iron_ore ?? 0) - iron;
      next.worldResources.lumber   = (next.worldResources.lumber   ?? 0) - lumber;
    } else {
      // Can't afford this tier — toggle it off (player must re-enable)
      next.roads = { ...next.roads, [enabledKey]: false };
      anyDisabled = true;
    }
  }
  next.roads = { ...next.roads, disrupted: anyDisabled };
  return next;
}

export function toggleRoad(state, roadLevel) {
  const enabledKey = `road_${roadLevel}_enabled`;
  const currentlyEnabled = state.roads?.[enabledKey] !== false;
  return {
    ...state,
    roads: { ...(state.roads ?? {}), [enabledKey]: !currentlyEnabled },
  };
}

export function isRoadEnabled(state, roadLevel) {
  const enabledKey = `road_${roadLevel}_enabled`;
  return state.roads?.[enabledKey] !== false;
}

export function getTotalRoadDrain(state) {
  const level = getRoadLevel(state);
  let iron = 0, lumber = 0;
  for (let i = 0; i < level; i++) {
    const rt = ROAD_TIERS[i];
    if (isRoadEnabled(state, rt.level)) {
      iron += rt.upkeepPerTick.iron_ore;
      lumber += rt.upkeepPerTick.lumber;
    }
  }
  return { iron_ore: iron, lumber };
}

export function isRoadConnected(state) {
  return getRoadLevel(state) > 0 && !(state.roads?.disrupted);
}

export function _legacyIsSpecificRoadConnected(state, roadLevel) {
  return getRoadLevel(state) >= roadLevel && !(state.roads?.disrupted) && isRoadEnabled(state, roadLevel);
}

// =============================================================================
// TRADE TOWNS
// =============================================================================

export function _getStock(state, source, itemKey) {
  if (source === "artisan")        return state.artisan?.[itemKey]       ?? 0;
  if (source === "animalGoods")    return state.animalGoods?.[itemKey]   ?? 0;
  if (source === "worldResources") return state.worldResources?.[itemKey] ?? 0;
  if (source === "pond")           return state.fishing?.fish?.[itemKey]  ?? 0;
  if (source === "crops")          return state.crops?.[itemKey]          ?? 0;
  return 0;
}

export function _deductStock(state, source, itemKey, amount) {
  if (source === "artisan")
    return { ...state, artisan: { ...(state.artisan ?? {}), [itemKey]: Math.max(0, (state.artisan?.[itemKey] ?? 0) - amount) } };
  if (source === "animalGoods")
    return { ...state, animalGoods: { ...(state.animalGoods ?? {}), [itemKey]: Math.max(0, (state.animalGoods?.[itemKey] ?? 0) - amount) } };
  if (source === "worldResources")
    return { ...state, worldResources: { ...(state.worldResources ?? {}), [itemKey]: Math.max(0, (state.worldResources?.[itemKey] ?? 0) - amount) } };
  if (source === "pond")
    return { ...state, fishing: { ...(state.fishing ?? {}), fish: { ...(state.fishing?.fish ?? {}), [itemKey]: Math.max(0, (state.fishing?.fish?.[itemKey] ?? 0) - amount) } } };
  if (source === "crops")
    return { ...state, crops: { ...(state.crops ?? {}), [itemKey]: Math.max(0, (state.crops?.[itemKey] ?? 0) - amount) } };
  return state;
}

export function _legacyIsTownConnected(state, townId) {
  const def = TRADE_TOWNS[townId];
  if (!def) return false;
  if (getRoadLevel(state) < def.roadLevel) return false;
  if (!isRoadEnabled(state, def.roadLevel)) return false;
  return true;
}

// Toggle a route tier on/off with cascade logic:
// Enabling T2 auto-enables T1. Enabling T3 auto-enables T1+T2.
// Disabling T1 cascades T2+T3 off. Disabling T2 cascades T3 off.
export function toggleTownRoute(state, townId, routeId) {
  const def = TRADE_TOWNS[townId];
  if (!def) return state;
  const town = state.tradeTowns?.[townId];
  if (!town) return state;

  const routes = { ...(town.routes ?? {}) };
  const idx = def.routes.findIndex(r => r.id === routeId);
  if (idx < 0) return state;

  const currentlyEnabled = routes[routeId]?.enabled ?? false;

  if (!currentlyEnabled) {
    // Enable this route and all routes below it (cascade up)
    for (let i = 0; i <= idx; i++) {
      const rid = def.routes[i].id;
      routes[rid] = { ...(routes[rid] ?? {}), enabled: true };
    }
  } else {
    // Disable this route and all routes above it (cascade down)
    for (let i = idx; i < def.routes.length; i++) {
      const rid = def.routes[i].id;
      routes[rid] = { ...(routes[rid] ?? {}), enabled: false, active: false };
    }
  }

  return {
    ...state,
    tradeTowns: {
      ...(state.tradeTowns ?? {}),
      [townId]: { ...town, routes },
    },
  };
}

export function tickTradeTowns(state) {
  let next = state;

  for (const townId of TRADE_TOWN_ORDER) {
    const def = TRADE_TOWNS[townId];
    const connected = isTownConnected(next, townId);
    const town = next.tradeTowns?.[townId];
    if (!town) continue;

    let updatedRoutes = { ...(town.routes ?? {}) };
    let disrupted = !connected;

    if (!connected) {
      // Connection lost — deactivate all routes
      for (const r of def.routes) {
        updatedRoutes[r.id] = { ...(updatedRoutes[r.id] ?? {}), active: false };
      }
    } else {
      // Drain goods for each enabled route.
      // If a tier goes inactive (out of stock), all higher tiers cascade off.
      let cascadeOff = false;
      for (const r of def.routes) {
        const rs = updatedRoutes[r.id] ?? { enabled: false, active: false };
        if (!rs.enabled || cascadeOff) {
          updatedRoutes[r.id] = { ...rs, active: false };
          continue;
        }
        // Accumulate fractional drain — only deduct whole units to avoid decimal goods
        const drainAccum = (rs.drainAccum ?? 0) + r.drainPerTick;
        const intDrain = Math.floor(drainAccum);
        const stock = _getStock(next, r.source, r.itemKey);
        if (stock >= r.drainPerTick) {
          if (intDrain > 0 && stock >= intDrain) {
            next = _deductStock(next, r.source, r.itemKey, intDrain);
          }
          updatedRoutes[r.id] = { ...rs, active: true, drainAccum: drainAccum - (intDrain > 0 && stock >= intDrain ? intDrain : 0) };
        } else {
          // Out of stock — go inactive and cascade all higher tiers off
          updatedRoutes[r.id] = { ...rs, active: false, drainAccum: 0 };
          cascadeOff = true;
        }
      }

      // Ironfeld resource trickle — sum active iron/lumber bonuses
      let ironTrickle = 0;
      let lumberTrickle = 0;
      if (townId === "ironfeld") {
        for (const r of def.routes) {
          if (!(updatedRoutes[r.id]?.active)) continue;
          if (r.bonus.type === "iron_trickle")       ironTrickle  += r.bonus.iron_ore ?? 0;
          if (r.bonus.type === "lumber_trickle")      lumberTrickle += r.bonus.lumber  ?? 0;
          if (r.bonus.type === "full_upkeep_cover") {
            ironTrickle  += r.bonus.iron_ore ?? 0;
            lumberTrickle += r.bonus.lumber  ?? 0;
          }
        }
        if (ironTrickle > 0 || lumberTrickle > 0) {
          next = {
            ...next,
            worldResources: {
              ...(next.worldResources ?? {}),
              iron_ore: (next.worldResources?.iron_ore ?? 0) + ironTrickle,
              lumber:   (next.worldResources?.lumber   ?? 0) + lumberTrickle,
            },
          };
        }
      }
    }

    next = {
      ...next,
      tradeTowns: {
        ...(next.tradeTowns ?? {}),
        [townId]: { ...town, routes: updatedRoutes, disrupted },
      },
    };
  }
  return next;
}

// --- Bonus getters -----------------------------------------------------------
// Each returns the highest active tier value (replace semantics, not additive).
// Helper: get the highest active bonus value of a given type across a town's routes.
export function _getHighestActiveTownBonus(state, townId, bonusType) {
  const def = TRADE_TOWNS[townId];
  const town = state.tradeTowns?.[townId];
  if (!def || !town) return 0;
  let highest = 0;
  for (const r of def.routes) {
    if (town.routes?.[r.id]?.active && r.bonus.type === bonusType) {
      highest = Math.max(highest, r.bonus.value ?? 0);
    }
  }
  return highest;
}

// Thornwick: raw crops → crop grow speed (replaces old Millhaven role)
export function getThornwickGrowBonus(state) {
  return _getHighestActiveTownBonus(state, "thornwick", "crop_grow_speed");
}

// Crestfall: raw fish → fishing rate
export function getCrestfallFishingBonus(state) {
  return _getHighestActiveTownBonus(state, "crestfall", "fishing_rate");
}

// Millhaven: processed food → crafting material reduction (0–0.30)
export function getMillhavenMaterialBonus(state) {
  return _getHighestActiveTownBonus(state, "millhaven", "crafting_material_reduction");
}

// Glenhollow: raw barn goods → barn cycle speed (0–0.30)
export function getGlenhollowBarnBonus(state) {
  return _getHighestActiveTownBonus(state, "glenhollow", "barn_cycle_speed");
}

// Ashport: artisan barn goods → crafting time reduction (0–0.30)
export function getAshportCraftingTimeBonus(state) {
  return _getHighestActiveTownBonus(state, "ashport", "crafting_time_reduction");
}

// Legacy: getMillhavenGrowBonus kept as 0 (Thornwick now owns crop_grow_speed)
export function getMillhavenGrowBonus(state) { return 0; }

// Legacy: getAshportFishBonus kept — now Crestfall handles fishing_rate
export function getAshportFishBonus(state) {
  return getCrestfallFishingBonus(state);
}

export function getVelmoorXpBonus(state) {
  const def = TRADE_TOWNS.velmoor;
  const town = state.tradeTowns?.velmoor;
  if (!town) return 0;
  let total = 0;
  for (const r of def.routes) {
    if (!town.routes?.[r.id]?.active) continue;
    if (r.bonus.type === "hero_xp")                total += r.bonus.xpBonus ?? 0;
    if (r.bonus.type === "hero_xp_and_expedition") total += r.bonus.xpBonus ?? 0;
  }
  return total;
}

export function getVelmoorExpeditionBonus(state) {
  const def = TRADE_TOWNS.velmoor;
  const town = state.tradeTowns?.velmoor;
  if (!town) return 0;
  let total = 0;
  for (const r of def.routes) {
    if (!town.routes?.[r.id]?.active) continue;
    if (r.bonus.type === "expedition_loot")         total += r.bonus.expeditionBonus ?? 0;
    if (r.bonus.type === "hero_xp_and_expedition")  total += r.bonus.expeditionBonus ?? 0;
  }
  return total;
}

// Legacy compat — kept so any stray callers don't crash
export function getTownBonusActive(state, townId) {
  const def = TRADE_TOWNS[townId];
  const town = state.tradeTowns?.[townId];
  if (!def || !town) return false;
  return def.routes.some(r => town.routes?.[r.id]?.active);
}

// =============================================================================
// EXPEDITIONS
// =============================================================================


export function isHeroOnExpedition(state, heroId) {
  const exps = state.expeditions ?? {};
  return Object.values(exps).some(exp => (exp?.heroIds ?? []).includes(heroId));
}

export function getHeroExpeditionTierId(state, heroId) {
  const exps = state.expeditions ?? {};
  for (const [tierId, exp] of Object.entries(exps)) {
    if ((exp?.heroIds ?? []).includes(heroId)) return tierId;
  }
  return null;
}

export function isHeroBusyForExpedition(state, adventurer) {
  return isHeroBusy(state, adventurer);
}

export function _legacyGetExpeditionAvailable(state, tierId) {
  const tier = EXPEDITION_TIERS[tierId];
  if (!tier) return false;
  const ghLevel = state.town?.buildings?.guild_hall?.level ?? 0;
  const roadLevel = getRoadLevel(state);
  if (ghLevel < tier.ghLevel || roadLevel < tier.roadLevel) return false;
  // Road for this tier must be enabled (not toggled off)
  const enabledKey = `road_${tier.roadLevel}_enabled`;
  return state.roads?.[enabledKey] !== false;
}

export function _legacySendExpedition(state, tierId, heroIds) {
  const tier = EXPEDITION_TIERS[tierId];
  if (!tier) return state;
  if (!getExpeditionAvailable(state, tierId)) return state;
  if (heroIds.length < 1 || heroIds.length > tier.maxHeroes) return state;
  const heroes = heroIds.map(id => state.adventurers?.find(a => a.id === id)).filter(Boolean);
  if (heroes.length !== heroIds.length) return state;
  for (const h of heroes) {
    if (isHeroBusyForExpedition(state, h)) return state;
  }
  // Snapshot each hero's current HP and food belt into the expedition
  const heroStates = Object.fromEntries(heroes.map(h => [
    h.id,
    { hp: h.hp ?? h.maxHp ?? 40, foodBelt: { ...(h.foodBelt ?? {}) } }
  ]));
  return {
    ...state,
    expeditions: {
      ...(state.expeditions ?? {}),
      [tierId]: {
        tierId,
        heroIds,
        heroStates,
        ticksSinceLastRareRoll: 0,
        accumulatedResources: {},
        lastRareDropped: null,
      },
    },
  };
}

export function recallExpedition(state, tierId) {
  const exp = (state.expeditions ?? {})[tierId];
  if (!exp) return state;
  // Return heroes to 1hp (they made it back alive but exhausted)
  let advs = state.adventurers ?? [];
  for (const heroId of exp.heroIds) {
    advs = advs.map(a => {
      if (a.id !== heroId) return a;
      const hs = exp.heroStates?.[heroId];
      return { ...a, hp: Math.max(1, hs?.hp ?? 1), foodBelt: hs?.foodBelt ?? {} };
    });
  }
  const { [tierId]: _removed, ...rest } = state.expeditions ?? {};
  return { ...state, expeditions: rest, adventurers: advs };
}

export function recallSingleHeroFromExpedition(state, tierId, heroId) {
  const exp = (state.expeditions ?? {})[tierId];
  if (!exp) return state;
  if (!exp.heroIds.includes(heroId)) return state;
  const hs = exp.heroStates?.[heroId];
  // Restore hero HP from expedition state
  const advs = (state.adventurers ?? []).map(a => {
    if (a.id !== heroId) return a;
    return { ...a, hp: Math.max(1, hs?.hp ?? 1), foodBelt: hs?.foodBelt ?? {} };
  });
  const newHeroIds = exp.heroIds.filter(id => id !== heroId);
  const { [heroId]: _hs, ...newHeroStates } = exp.heroStates ?? {};
  // If no heroes left, close the expedition
  if (newHeroIds.length === 0) {
    const { [tierId]: _removed, ...rest } = state.expeditions ?? {};
    return { ...state, expeditions: rest, adventurers: advs };
  }
  return {
    ...state,
    adventurers: advs,
    expeditions: {
      ...(state.expeditions ?? {}),
      [tierId]: { ...exp, heroIds: newHeroIds, heroStates: newHeroStates },
    },
  };
}

export function tickExpeditions(state) {
  const exps = state.expeditions ?? {};
  if (Object.keys(exps).length === 0) return state;

  const tierIndexMap = { scout: 0, dungeon: 1, dragon: 2, legendary: 3 };

  let next = { ...state, expeditions: { ...exps } };
  const completedTiers = [];

  for (const tierId of Object.keys(exps)) {
    const exp = exps[tierId];
    if (!exp) continue;
    const tier = EXPEDITION_TIERS[tierId];
    if (!tier) continue;

    let heroStates = { ...exp.heroStates };
    let heroIds = [...exp.heroIds];
    let accumulatedResources = { ...(exp.accumulatedResources ?? {}) };
    let accumulatedXp = { ...(exp.accumulatedXp ?? {}) };
    let ticksSinceLastRareRoll = (exp.ticksSinceLastRareRoll ?? 0) + 1;
    const withdrawnHeroes = [];

    // Damage phase -- with Fighter class damage reduction
    for (const heroId of heroIds) {
      let hs = { ...heroStates[heroId] };
      const hero = (next.adventurers ?? []).find(a => a.id === heroId);
      const heroClass = hero?.heroClass ?? null;

      // Fighter: damage reduction based on level + gear tier
      let effectiveDamage = tier.damagePerTick;
      if (heroClass === "fighter") {
        const cfg = EXPEDITION_CLASS_BONUSES.fighter;
        const level = hero?.level ?? 1;
        const gearTier = hero?.gear ?? 0;
        const statPoints = level + gearTier;
        const reduction = Math.min(cfg.maxDmgReduction, statPoints * cfg.dmgReductionPerStatPoint);
        effectiveDamage = tier.damagePerTick * (1 - reduction);
      }
      effectiveDamage *= 1 - (hero ? getHeroExpDmgReduction(hero) : 0); // Pathwarden
      hs.hp = (hs.hp ?? 40) - effectiveDamage;

      if (hs.hp <= 0) {
        const belt = { ...(hs.foodBelt ?? {}) };
        const beltItems = ARTISAN_FOOD_LIST
          .filter(id => (belt[id] ?? 0) > 0)
          .map(id => ({ id, heal: ARTISAN_FOOD_HEAL[id]?.healAmount ?? 0 }))
          .sort((a, b) => a.heal - b.heal);

        if (beltItems.length > 0) {
          const food = beltItems[0];
          belt[food.id] = belt[food.id] - 1;
          if (belt[food.id] <= 0) delete belt[food.id];
          hs.hp = food.heal;
          hs.foodBelt = belt;
        } else {
          withdrawnHeroes.push(heroId);
          hs.hp = 1;
        }
      }
      heroStates[heroId] = hs;
    }

    // XP accumulation per hero per tick
    const baseXpPerTick = tier.xpPerHeroPerTick ?? 0;
    for (const heroId of heroIds) {
      if (withdrawnHeroes.includes(heroId)) continue;
      const hero = (next.adventurers ?? []).find(a => a.id === heroId);
      if (!hero) continue;

      // Build XP multiplier: existing skill tree + prestige + Velmoor + Mage class bonus
      let xpMult = getHeroXpMultiplier(hero) * (1 + getHeroPrestigeXpBonus(hero)) * (1 + getVelmoorXpBonus(state));
      if (hero.heroClass === "mage") {
        xpMult *= (1 + EXPEDITION_CLASS_BONUSES.mage.xpBonus);
      }

      accumulatedXp[heroId] = (accumulatedXp[heroId] ?? 0) + baseXpPerTick * xpMult;
    }

    // Flush whole XP to heroes (level-up if needed)
    let advForXp = next.adventurers ?? [];
    let didChangeXp = false;
    for (const heroId of heroIds) {
      if (withdrawnHeroes.includes(heroId)) continue;
      const wholeXp = Math.floor(accumulatedXp[heroId] ?? 0);
      if (wholeXp <= 0) continue;
      accumulatedXp[heroId] = (accumulatedXp[heroId] ?? 0) - wholeXp;
      advForXp = advForXp.map(a => {
        if (a.id !== heroId) return a;
        let newXp = (a.xp ?? 0) + wholeXp;
        let newLevel = a.level ?? 1;
        let newSkillPoints = a.skillPoints ?? 0;
        while (newXp >= getAdventurerXpNeeded(newLevel)) {
          newXp -= getAdventurerXpNeeded(newLevel);
          newLevel++;
          newSkillPoints++;
        }
        const newMaxHp = getAdventurerMaxHp({ ...a, level: newLevel }) + getHeroBonusMaxHp({ ...a, level: newLevel });
        return { ...a, xp: newXp, level: newLevel, maxHp: newMaxHp, skillPoints: newSkillPoints };
      });
      didChangeXp = true;
    }
    if (didChangeXp) next = { ...next, adventurers: advForXp };

    // Withdraw heroes with empty belts
    let updatedAdventurers = next.adventurers ?? [];
    for (const heroId of withdrawnHeroes) {
      heroIds = heroIds.filter(id => id !== heroId);
      delete heroStates[heroId];
      delete accumulatedXp[heroId];
      updatedAdventurers = updatedAdventurers.map(a =>
        a.id !== heroId ? a : { ...a, hp: 1, foodBelt: {} }
      );
    }
    next = { ...next, adventurers: updatedAdventurers };

    if (heroIds.length === 0) {
      completedTiers.push(tierId);
      continue;
    }

        // Resource reward: each hero's share scales with Deep Pockets, all of it with Velmoor
    const velmoorMult = 1 + getVelmoorExpeditionBonus(next);
    const partyLootMult = heroIds.reduce((sum, id) => {
      const h = (next.adventurers ?? []).find((a) => a.id === id);
      return sum + (h ? getHeroExpLootMult(h) : 1);
    }, 0) * velmoorMult;
    for (const [res, amount] of Object.entries(tier.rewardPerHeroPerTick ?? {})) {
      accumulatedResources[res] = (accumulatedResources[res] ?? 0) + amount * partyLootMult;
    }

    // Flush whole-number resources to worldResources
    const wr = { ...(next.worldResources ?? {}) };
    for (const [res, amount] of Object.entries(accumulatedResources)) {
      const whole = Math.floor(amount);
      if (whole > 0) {
        wr[res] = (wr[res] ?? 0) + whole;
        accumulatedResources[res] = amount - whole;
      }
    }
    next = { ...next, worldResources: wr };

        // Rare loot: each hero rolls on their own timer (Quickened Search shortens it).
    // Deep Pockets and Velmoor's expedition bonus multiply what they find.
    let rareDropped = {};
    const tierIndex = tierIndexMap[tierId] ?? 0;
    for (const heroId of heroIds) {
      const hero = (next.adventurers ?? []).find(a => a.id === heroId);
      const heroState = heroStates[heroId];
      const interval = Math.max(10, Math.round(tier.rareLootRollIntervalTicks * (hero ? getHeroExpRollIntervalMult(hero) : 1)));
      const rareTicks = (heroState.rareTicks ?? 0) + 1;
      if (rareTicks < interval) {
        heroStates[heroId] = { ...heroState, rareTicks };
        continue;
      }
      heroStates[heroId] = { ...heroState, rareTicks: 0 };

      const gearTier = hero?.gear ?? 0;
      const heroClass = hero?.heroClass ?? null;
      const lootMult = (hero ? getHeroExpLootMult(hero) : 1) * velmoorMult;

      // Base rare loot chance from gear
      let chance = Math.min(0.8, 0.20 + gearTier * 0.05);
      // Scavenger: +10% chance per expedition tier index (0=scout..3=legendary)
      if (heroClass === "scavenger") {
        const scavBonus = EXPEDITION_CLASS_BONUSES.scavenger.rareLootChancePerTierIndex * tierIndex;
        chance = Math.min(0.9, chance + scavBonus);
      }

      if (Math.random() < chance) {
        for (const [res, [min, max]] of Object.entries(tier.rareLoot ?? {})) {
          let amount = Math.floor(min + Math.random() * (max - min + 1));
          if (heroClass === "scavenger") {
            amount += getHeroMinLootBonus(hero) + getHeroPrestigeMinLootBonus(hero);
          }
          amount = Math.round(amount * lootMult);
          rareDropped[res] = (rareDropped[res] ?? 0) + amount;
        }
      }

      // Mage: 5% chance per roll to find a mana_crystal (any tier)
      if (heroClass === "mage") {
        const mageCfg = EXPEDITION_CLASS_BONUSES.mage;
        if (Math.random() < mageCfg.manaCrystalChancePerRoll) {
          const [cMin, cMax] = mageCfg.manaCrystalAmount;
          rareDropped.mana_crystal = (rareDropped.mana_crystal ?? 0) + Math.floor(cMin + Math.random() * (cMax - cMin + 1));
        }
      }
    }
    if (Object.keys(rareDropped).length > 0) {
      const wr2 = { ...(next.worldResources ?? {}) };
      for (const [res, amount] of Object.entries(rareDropped)) wr2[res] = (wr2[res] ?? 0) + amount;
      next = { ...next, worldResources: wr2 };
    }

    // Write hero HP and food belt back to adventurer state
    let advs = next.adventurers ?? [];
    for (const heroId of heroIds) {
      const hs = heroStates[heroId];
      advs = advs.map(a => a.id === heroId ? { ...a, hp: Math.max(1, hs.hp), foodBelt: hs.foodBelt ?? a.foodBelt } : a);
    }

    next = {
      ...next,
      adventurers: advs,
      expeditions: {
        ...next.expeditions,
        [tierId]: {
          ...exp,
          heroIds,
          heroStates,
          accumulatedResources,
          accumulatedXp,
          ticksSinceLastRareRoll,
          lastRareDropped: Object.keys(rareDropped).length > 0 ? rareDropped : (exp.lastRareDropped ?? null),
        },
      },
    };
  }

  for (const tierId of completedTiers) {
    const { [tierId]: _removed, ...rest } = next.expeditions;
    next = { ...next, expeditions: rest };
  }

  return next;
}

export function claimExpedition(state, _bonusHeroId = null) {
  // Clear old single-expedition state if present
  if (state.expedition?.active?.pendingClaim) {
    return { ...state, expedition: { active: null } };
  }
  return state;
}
