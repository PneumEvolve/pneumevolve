// engine_homebase.js — PERSISTENT HOME BASE layer (pure functions, no React)
//
// The "base-first" reframe. Until now the rich base state (stockpile, crops,
// workstation assignments, turrets) only existed INSIDE an active GameView run
// snapshot, so the base felt like a side-panel of a run. This module gives the
// home base its own durable state that lives on `worldState.homeBase`, ticks
// while you're away, and is the screen you live on.
//
// Design notes:
//   • Survivors are NOT duplicated here. The roster (worldState.roster) stays the
//     single source of truth for "who exists." Home survivors are simply the
//     roster records that aren't currently DEPLOYED/DEAD. Their durable job
//     assignment (command/workstation/assignedTo) is stored directly on the
//     record, so it persists and survives mutation by the reused engine tick.
//   • We REUSE engine_base's baseTick/craftItem so home production behaves
//     identically to in-run base production — no second implementation to drift.
//   • homeBaseToSnapshot() builds a snapshot shaped exactly like the run snapshot
//     BaseView already consumes, so BaseView renders the home base WITHOUT any
//     changes to the component.

import { baseTick, craftItem, pushActivity } from "./engine_base";
import { tickSurvivorNeeds } from "./engine_survivors";
import { CROP_TYPES, SURVIVOR_MORALE_LOW_THRESHOLD, HEAL_MEDICINE_COST, HEAL_HP_RESTORE, TURRET_REPAIR_COST_SCRAP, TURRET_REPAIR_HP, WORKSHOP_BLUEPRINT_COSTS, BLUEPRINT_LABELS, BLUEPRINT_CATEGORY, WORKSTATION_CYCLE_SECS, WORKSTATION_GEAR_TIERS, SPECIALIZATIONS, SPECIALIZATION_MIN_LEVEL, BASE_RECIPES } from "./engine_constants";

// Roster lifecycle strings (kept inline to avoid any import cycle with
// survivorRoster, which imports from the engine barrel).
const STATUS_DEPLOYED = "deployed";
const STATUS_DEAD     = "dead";

const EMPTY_RESOURCES = () => ({ food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 });

const HOME_UPGRADE_BONUS = {
  kitchen: { foodBonusPerTick: 2 },
  smokehouse: { foodCapMultiplier: 2 }, // cap not used in home base, but kept for consistency
  preservation_lab: { foodCapMultiplier: 4, moraleShield: true },
  workshop: { scrapBonusPerTick: 2 },
  armory: { ammoBonusPerTick: 3, turretDamageBonus: 0.5 },
};

// ─── Default shape ────────────────────────────────────────────────────────────

// ─── Blueprint constants ──────────────────────────────────────────────────────
// A blueprint is a queued construction order placed by the Director from BaseView
// hub mode. It appears as a ghost on the homebase map and requires the player (or
// a builder-assigned survivor) to stand near it and press [F] to build it.
export const BLUEPRINT_BUILD_TIME = 5.0;   // seconds of casting to complete
export const BLUEPRINT_INTERACT_RANGE = 90; // px — player must be this close to build

export const BLUEPRINT_COSTS = {
  turret:     { scrap: 4, nails: 8 },
  crop_plot:  { seeds: 1 },
  // Workshop-type structures (physical buildings that unlock workstation slots)
  ...Object.fromEntries(
    Object.entries(WORKSHOP_BLUEPRINT_COSTS).map(([k, v]) => [k, v])
  ),
};

export function makeDefaultHomeBase() {
  return {
    baseStorage:      EMPTY_RESOURCES(), // the persistent stockpile
    crops:            [],                // planted/ready/harvested crop plots
    gardenPlots:      2,                 // starting plots
    turrets:          [],                // defensive structures at home
    garage:           [],                // vehicles parked at home (the fleet)
    blueprints:       [],                // queued builds: { id, type, x, y, placedAt }
    builtStructures:  [],                // completed buildings: { id, type, builtAt, x, y }
    homesettlementId: 0,                 // home is world level 0
    lastBaseTick:     Date.now(),        // for offline production accrual
    upgrades:         [],
    // ── Phase 2: Workstation gear tiers (1 = default for all zones) ───────────
    workstationGear: {
      workshop: 1,
      kitchen:  1,
      medical:  1,
      garden:   1,
    },
    // ── Phase 2: Per-zone crafting queues ─────────────────────────────────────
    // Each zone has at most 1 active recipe + optional next queued.
    // { recipeId, progress (0–1), workerId (survivor id), startedAt }
    craftingQueues: {
      workshop: null,
      kitchen:  null,
      medical:  null,
      garden:   null,
    },
  };
}

// Survivors currently HOME (available, not out on a mission, not dead).
export function homeRoster(roster = []) {
  return (roster ?? []).filter(
    r => r.rosterStatus !== STATUS_DEPLOYED && r.rosterStatus !== STATUS_DEAD
  );
}

// ─── Adapter: persistent home state → BaseView-shaped snapshot ────────────────
// BaseView reads: s.crops, s.survivors, s.turrets, s.baseStorage,
// s.player.inventory, s.gardenPlots, s.homesettlementId, s.settlements.
// We synthesize exactly that from homeBase + roster. The snapshot is READ-ONLY;
// every BaseView action bubbles up and is applied via applyHomeBaseAction().
export function homeBaseToSnapshot(homeBase, roster = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  const survivors = homeRoster(roster).map(r => ({
    id:         r.id,
    name:       r.name,
    role:       r.role,
    hp:         r.hp ?? r.maxHp ?? 80,
    maxHp:      r.maxHp ?? 80,
    morale:     r.morale ?? 100,
    hunger:     r.hunger ?? 0,
    xp:         r.xp ?? 0,
    level:      r.level ?? 1,
    traits:     r.traits ?? [],
    backstory:  r.backstory ?? "",
    storyLog:   r.storyLog ?? [],
    // Durable job assignment (stored on the roster record at home)
    command:    r.command ?? "idle",
    assignedTo: r.assignedTo ?? null,
    workstation:r.workstation ?? null,
    // Transient fields BaseView may read — safe defaults
    state:      "idle",
    priority:   r.priority ?? 1,
    barricaded: false,
    _home:      true,
  }));

  return {
    crops:            hb.crops ?? [],
    survivors,
    turrets:          hb.turrets ?? [],
    baseStorage:      hb.baseStorage ?? {},
    // Header pill strip mirrors the stockpile (no separate "field inventory" at home)
    player:           { inventory: hb.baseStorage ?? {} },
    gardenPlots:      hb.gardenPlots ?? 0,
    garage:           hb.garage ?? [],
    blueprints:       hb.blueprints ?? [],
    builtStructures:  hb.builtStructures ?? [],
    homesettlementId: hb.homesettlementId ?? 0,
    settlements:      { [hb.homesettlementId ?? 0]: { name: "Home Base" } },
    isHome:           true,
    builtUpgrades:    hb.upgrades ?? [],
    // ── Phase 2 ──────────────────────────────────────────────────────────────
    workstationGear:  hb.workstationGear ?? { workshop: 1, kitchen: 1, medical: 1, garden: 1 },
    craftingQueues:   hb.craftingQueues  ?? { workshop: null, kitchen: null, medical: null, garden: null },
  };
}

// ─── Production tick (reuses engine_base.baseTick) ────────────────────────────
// We hand baseTick a shim object whose arrays/objects are the SAME references
// held by homeBase / the roster records, so all mutation (food added to storage,
// XP awarded, crop stages advanced) lands directly on persistent state.
export function tickHomeBase(homeBase, roster = [], dtReal, activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.baseStorage) hb.baseStorage = EMPTY_RESOURCES();

  const shim = {
    crops:        hb.crops ?? (hb.crops = []),
    survivors:    homeRoster(roster),   // references to roster records — mutation persists
    turrets:      hb.turrets ?? (hb.turrets = []),
    baseStorage:  hb.baseStorage,
    lastBaseTick: hb.lastBaseTick,
  };

  const result = baseTick(shim, dtReal, activityLog);

  // Apply upgrade bonuses
  const upgrades = homeBase.upgrades ?? [];
  let foodBonus = 0;
  let scrapBonus = 0;
  let ammoBonus = 0;
  for (const uid of upgrades) {
    const b = HOME_UPGRADE_BONUS[uid];
    if (b) {
      foodBonus += b.foodBonusPerTick ?? 0;
      scrapBonus += b.scrapBonusPerTick ?? 0;
      ammoBonus += b.ammoBonusPerTick ?? 0;
    }
  }
  if (foodBonus > 0) homeBase.baseStorage.food = (homeBase.baseStorage.food ?? 0) + foodBonus * dtReal;
  if (scrapBonus > 0) homeBase.baseStorage.scrap = (homeBase.baseStorage.scrap ?? 0) + scrapBonus * dtReal;
  if (ammoBonus > 0) homeBase.baseStorage.ammo = (homeBase.baseStorage.ammo ?? 0) + ammoBonus * dtReal;

  // ── Step 1: needs heartbeat ─────────────────────────────────────
  // Accumulate elapsed time so short live intervals still fire whole ticks, and
  // cap the burst so a long absence doesn't starve everyone in one return.
  hb._needsAccum = (hb._needsAccum ?? 0) + (dtReal ?? 0);
  let ticks = Math.floor(hb._needsAccum / HOME_NEEDS_TICK_SECS);
  let needs = { fed: [], hungry: [], lowMorale: [] };
  if (ticks > 0) {
    hb._needsAccum -= ticks * HOME_NEEDS_TICK_SECS;
    ticks = Math.min(ticks, HOME_NEEDS_MAX_OFFLINE_TICKS);
    needs = tickHomeNeeds(hb, roster, ticks, activityLog);
  }

  hb.baseStorage  = shim.baseStorage;
  hb.lastBaseTick = shim.lastBaseTick;

  // ── Phase 2: advance all active crafting queues ──────────────────────────
  const craftCompletions = tickCraftingQueues(hb, roster, dtReal ?? 0);

  return { ...result, needs, craftCompletions };
}

// ─── Step 1: survivor needs heartbeat ─────────────────────────────
// One needs "tick" = one meal cycle. Aligned to the world-sim cadence so live
// play and offline accrual share a clock.
export const HOME_NEEDS_TICK_SECS = 60;
// Cap how many ticks one absence can accrue at once, so leaving for hours
// doesn't wipe the colony the instant you return.
export const HOME_NEEDS_MAX_OFFLINE_TICKS = 20;

/**
 * Run the hunger/morale clock for everyone currently AT HOME. Each tick they
 * try to eat one food from the shared stockpile; if it's short they go hungry
 * and morale falls (trait modifiers live inside tickSurvivorNeeds). Mutates the
 * roster records in place — they ARE the persistent survivors — and baseStorage.
 * Returns { fed, hungry, lowMorale } (arrays of names).
 */
export function tickHomeNeeds(homeBase, roster = [], ticks = 1, activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.baseStorage) hb.baseStorage = EMPTY_RESOURCES();
  const home = homeRoster(roster);
  const summary = { fed: [], hungry: [], lowMorale: [] };
  if (home.length === 0) return summary;

  for (let t = 0; t < ticks; t++) {
    for (const sv of home) {
      const { fed } = tickSurvivorNeeds(sv, hb.baseStorage);
      if (t === ticks - 1) {
        (fed ? summary.fed : summary.hungry).push(sv.name);
        if ((sv.morale ?? 100) < SURVIVOR_MORALE_LOW_THRESHOLD) summary.lowMorale.push(sv.name);
      }
    }
  }

  summary.hungry    = [...new Set(summary.hungry)];
  summary.lowMorale = [...new Set(summary.lowMorale)];
  if (summary.hungry.length) {
    const n = summary.hungry.length;
    pushActivity(activityLog, `⚠ ${n} survivor${n > 1 ? "s" : ""} went hungry — food stores are short`);
  }
  return summary;
}

// Accrue production for the elapsed real time since the player last left home.
export function applyOfflineHomeBaseTick(homeBase, roster = [], activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.lastBaseTick) {
    hb.lastBaseTick = Date.now();
    return { harvested: [], damaged: [], produced: [] };
  }
  const elapsed = (Date.now() - hb.lastBaseTick) / 1000;
  if (elapsed < 2) return { harvested: [], damaged: [], produced: [] };
  return tickHomeBase(hb, roster, elapsed, activityLog);
}

// ─── Phase 2: Cycle helpers ───────────────────────────────────────────────────

/**
 * Resolve the effective cycle duration (seconds) for a zone given the current
 * gear tier and the specialization of the stationed survivor (if any).
 */
export function getEffectiveCycleSecs(zone, gearTier = 1, specialization = null) {
  const baseSecs = WORKSTATION_CYCLE_SECS[zone] ?? 30;
  const gearDefs = WORKSTATION_GEAR_TIERS[zone] ?? [];
  const gear = gearDefs.find(g => g.tier === gearTier) ?? gearDefs[0];
  const gearMult = gear ? gear.cycleSpeedMult : 1.0;

  let specMult = 1.0;
  if (specialization) {
    const spec = SPECIALIZATIONS[specialization];
    // Only apply cycle-speed bonus when the survivor is in their native zone
    if (spec && spec.zone === zone) specMult = spec.cycleSpeedMult ?? 1.0;
  }
  // Higher mult = faster; divide base secs so it's shorter
  return baseSecs / (gearMult * specMult);
}

/**
 * Resolve the effective yield multiplier for a zone given gear and spec.
 */
export function getEffectiveYieldMult(zone, gearTier = 1, specialization = null) {
  const gearDefs = WORKSTATION_GEAR_TIERS[zone] ?? [];
  const gear = gearDefs.find(g => g.tier === gearTier) ?? gearDefs[0];
  const gearMult = gear ? gear.yieldMult : 1.0;

  let specMult = 1.0;
  if (specialization) {
    const spec = SPECIALIZATIONS[specialization];
    if (spec && spec.zone === zone) specMult = spec.yieldMult ?? 1.0;
  }
  return gearMult * specMult;
}

/**
 * Advance all active crafting queues for dt seconds.
 * When a recipe completes, deducts inputs (already deducted on assign), produces
 * output scaled by yield mult, and clears the queue slot.
 * Mutates homeBase in place; returns an array of completion events:
 *   [{ zone, recipeId, output }]
 */
export function tickCraftingQueues(homeBase, roster = [], dt) {
  if (!homeBase || dt <= 0) return [];
  const hb = homeBase;
  if (!hb.craftingQueues) hb.craftingQueues = {};
  if (!hb.workstationGear) hb.workstationGear = { workshop: 1, kitchen: 1, medical: 1, garden: 1 };

  const completions = [];

  for (const zone of ["workshop", "kitchen", "medical", "garden"]) {
    const entry = hb.craftingQueues[zone];
    if (!entry) continue;

    // Resolve the worker's specialization (if they're still stationed)
    const worker = homeRoster(roster).find(r => r.id === entry.workerId && r.workstation === zone);
    const spec = worker?.specialization ?? null;
    const gearTier = hb.workstationGear[zone] ?? 1;
    const cycleSecs = getEffectiveCycleSecs(zone, gearTier, spec);

    entry.progress = Math.min(1, (entry.progress ?? 0) + dt / cycleSecs);
    entry._cycleTimer = (entry._cycleTimer ?? 0) + dt;

    if (entry.progress >= 1) {
      // Cycle complete — produce output
      const recipe = BASE_RECIPES.find(r => r.id === entry.recipeId);
      if (recipe) {
        const yieldMult = getEffectiveYieldMult(zone, gearTier, spec);
        for (const [res, qty] of Object.entries(recipe.output)) {
          const produced = Math.round(qty * yieldMult);
          hb.baseStorage[res] = (hb.baseStorage[res] ?? 0) + produced;
        }
        completions.push({ zone, recipeId: entry.recipeId, output: recipe.output });
      }
      // Reset for next cycle (auto-repeating)
      entry.progress = 0;
      entry._cycleTimer = 0;
      entry.startedAt = Date.now();
    }
  }

  return completions;
}

// ─── Phase 2: Workstation gear upgrade ───────────────────────────────────────

/**
 * Attempt to upgrade a zone's workstation gear to the next tier.
 * Pure function — mutates homeBase in place and returns { success, reason? }.
 */
export function upgradeWorkstationGear(homeBase, zone, activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.workstationGear) hb.workstationGear = { workshop: 1, kitchen: 1, medical: 1, garden: 1 };
  const currentTier = hb.workstationGear[zone] ?? 1;
  const gearDefs = WORKSTATION_GEAR_TIERS[zone];
  if (!gearDefs) return { success: false, reason: "Unknown zone" };

  const nextDef = gearDefs.find(g => g.tier === currentTier + 1);
  if (!nextDef) return { success: false, reason: "Already at max tier" };

  const cost = nextDef.cost;
  if (!hb.baseStorage) hb.baseStorage = EMPTY_RESOURCES();

  // Check resources
  for (const [res, qty] of Object.entries(cost)) {
    if ((hb.baseStorage[res] ?? 0) < qty) {
      return { success: false, reason: `Need ${qty} ${res}` };
    }
  }
  // Deduct
  for (const [res, qty] of Object.entries(cost)) {
    hb.baseStorage[res] = Math.max(0, (hb.baseStorage[res] ?? 0) - qty);
  }
  hb.workstationGear[zone] = currentTier + 1;
  pushActivity(activityLog, `⬆️ ${zone} upgraded to ${nextDef.name}!`);
  return { success: true, newTier: currentTier + 1, gear: nextDef };
}

// ─── Phase 2: Recipe queue management ────────────────────────────────────────

/**
 * Assign a recipe to a zone's crafting queue. Deducts inputs immediately.
 * Only one recipe can be active per zone at a time.
 * Returns { success, reason? }.
 */
export function assignRecipe(homeBase, roster = [], zone, recipeId, workerId, activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.craftingQueues) hb.craftingQueues = {};
  if (!hb.workstationGear) hb.workstationGear = { workshop: 1, kitchen: 1, medical: 1, garden: 1 };
  if (!hb.baseStorage) hb.baseStorage = EMPTY_RESOURCES();

  if (hb.craftingQueues[zone]) {
    return { success: false, reason: "A recipe is already running. Cancel it first." };
  }

  const recipe = BASE_RECIPES.find(r => r.id === recipeId && r.zone === zone);
  if (!recipe) return { success: false, reason: "Recipe not found" };

  const gearTier = hb.workstationGear[zone] ?? 1;
  if (gearTier < recipe.requiresGearTier) {
    const gearDef = (WORKSTATION_GEAR_TIERS[zone] ?? []).find(g => g.tier === recipe.requiresGearTier);
    return { success: false, reason: `Requires ${gearDef?.name ?? `Tier ${recipe.requiresGearTier}`}` };
  }

  // Check + deduct inputs
  for (const [res, qty] of Object.entries(recipe.inputs)) {
    if ((hb.baseStorage[res] ?? 0) < qty) {
      return { success: false, reason: `Need ${qty} ${res}` };
    }
  }
  for (const [res, qty] of Object.entries(recipe.inputs)) {
    hb.baseStorage[res] = Math.max(0, (hb.baseStorage[res] ?? 0) - qty);
  }

  hb.craftingQueues[zone] = {
    recipeId,
    progress:   0,
    _cycleTimer:0,
    workerId:   workerId ?? null,
    startedAt:  Date.now(),
  };

  pushActivity(activityLog, `🔨 ${zone}: started crafting ${recipe.label}`);
  return { success: true };
}

/**
 * Cancel the active recipe in a zone. Refunds inputs (minus waste).
 * Returns { success, reason? }.
 */
export function cancelRecipe(homeBase, zone, activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.craftingQueues) hb.craftingQueues = {};
  const entry = hb.craftingQueues[zone];
  if (!entry) return { success: false, reason: "No active recipe" };

  const recipe = BASE_RECIPES.find(r => r.id === entry.recipeId);
  // Partial refund: if progress < 20% refund 100%, otherwise 50%
  const refundFrac = (entry.progress ?? 0) < 0.2 ? 1.0 : 0.5;
  if (recipe) {
    for (const [res, qty] of Object.entries(recipe.inputs)) {
      const refund = Math.floor(qty * refundFrac);
      if (refund > 0) hb.baseStorage[res] = (hb.baseStorage[res] ?? 0) + refund;
    }
  }
  hb.craftingQueues[zone] = null;
  pushActivity(activityLog, `✖️ ${zone}: recipe cancelled`);
  return { success: true };
}

// ─── Phase 2: Specialization ──────────────────────────────────────────────────

/**
 * Set a survivor's specialization. Permanent — only callable once when XP level >= 3.
 * Mutates the roster record in place. Returns { success, reason? }.
 */
export function setSpecialization(roster = [], survivorId, specId, activityLog = []) {
  const rec = roster.find(r => r.id === survivorId);
  if (!rec) return { success: false, reason: "Survivor not found" };
  if ((rec.level ?? 1) < SPECIALIZATION_MIN_LEVEL) {
    return { success: false, reason: `Survivor must be level ${SPECIALIZATION_MIN_LEVEL} or higher` };
  }
  if (rec.specialization) {
    return { success: false, reason: "Specialization is permanent and already set" };
  }
  if (!SPECIALIZATIONS[specId]) {
    return { success: false, reason: "Unknown specialization" };
  }
  rec.specialization = specId;
  const spec = SPECIALIZATIONS[specId];
  pushActivity(activityLog, `🏅 ${rec.name} became a ${spec.label} — ${spec.baseBonus}`);
  return { success: true, specialization: spec };
}

// ─── Actions (mirrors index.jsx's onHarvest handler, targeting home state) ────
// Returns { success, recipe?, missing? } for craft; { success } otherwise.
export function applyHomeBaseAction(homeBase, roster = [], action, activityLog = []) {
  const hb = homeBase ?? makeDefaultHomeBase();
  if (!hb.baseStorage) hb.baseStorage = EMPTY_RESOURCES();
  const findRec = id => (roster ?? []).find(r => r.id === id);

  switch (action?.type) {
    case "harvest": {
      const crop = (hb.crops ?? []).find(c => c.id === action.cropId);
      if (crop && crop.stage === "ready") {
        crop.stage = "harvested";
        const amt = CROP_TYPES[crop.type]?.yield ?? (crop.type === "potato" ? 4 : 3);
        hb.baseStorage.food = (hb.baseStorage.food ?? 0) + amt;
        pushActivity(activityLog, `You harvested a ${crop.type}`);
      }
      return { success: true };
    }

    case "reassign": {
      const rec = findRec(action.survivorId);
      if (rec) {
        rec.command = action.command;
        if (action.command !== "assign") {
          rec.assignedTo = null;
          rec.workstation = null;
        }
      }
      return { success: true };
    }

    case "assignWorkstation": {
      const rec = findRec(action.survivorId);
      if (rec) {
        rec.workstation = action.workstation ?? null;
        // Assigning a station puts them to work; clearing it leaves their command as-is.
        rec.command = action.workstation ? "assign" : (rec.command ?? "idle");
        const wsLabel = action.workstation ? action.workstation.replace("_", " ") : null;
        pushActivity(
          activityLog,
          wsLabel ? `${rec.name} assigned to ${wsLabel}`
                  : `${rec.name} unassigned from workstation`
        );
      }
      return { success: true };
    }

    case "craft": {
      const shim = { baseStorage: hb.baseStorage, survivors: homeRoster(roster) };
      const result = craftItem(shim, action.recipeId, activityLog);
      hb.baseStorage = shim.baseStorage;
      return result;
    }

    // At home there is no separate "field inventory", so deposit/withdraw are
    // no-ops here (they only make sense inside a run). Returned as handled.
    case "deposit":
    case "withdraw":
      return { success: true, noop: true };

    // ── Step 4b: Heal a wounded survivor ─────────────────────────────────────
    case "heal": {
      const rec = findRec(action.survivorId);
      if (!rec) return { success: false, reason: "Survivor not found" };
      if ((rec.hp ?? rec.maxHp ?? 80) >= (rec.maxHp ?? 80))
        return { success: false, reason: "Already at full HP" };
      const med = hb.baseStorage.medicine ?? 0;
      if (med < HEAL_MEDICINE_COST)
        return { success: false, reason: `Need ${HEAL_MEDICINE_COST} medicine` };
      hb.baseStorage.medicine = med - HEAL_MEDICINE_COST;
      rec.hp = Math.min(rec.maxHp ?? 80, (rec.hp ?? 0) + HEAL_HP_RESTORE);
      pushActivity(activityLog, `💊 ${rec.name} treated (+${HEAL_HP_RESTORE} HP)`);
      return { success: true };
    }

    // ── Step 4d: Repair a home turret ─────────────────────────────────────────
    case "repair_turret": {
      const turret = (hb.turrets ?? []).find(t => t.id === action.turretId);
      if (!turret) return { success: false, reason: "Turret not found" };
      if (turret.destroyed) return { success: false, reason: "Turret destroyed" };
      if ((turret.hp ?? 0) >= (turret.maxHp ?? 150))
        return { success: false, reason: "Already at full HP" };
      const scrap = hb.baseStorage.scrap ?? 0;
      if (scrap < TURRET_REPAIR_COST_SCRAP)
        return { success: false, reason: `Need ${TURRET_REPAIR_COST_SCRAP} scrap` };
      hb.baseStorage.scrap = scrap - TURRET_REPAIR_COST_SCRAP;
      turret.hp = Math.min(turret.maxHp ?? 150, (turret.hp ?? 0) + TURRET_REPAIR_HP);
      pushActivity(activityLog, `🔧 Turret repaired (+${TURRET_REPAIR_HP} HP)`);
      return { success: true };
    }

    // ── Task 2.3: Queue a blueprint for in-game construction ─────────────────
    case "queue_blueprint": {
      const { blueprintType, x, y } = action;
      const cost = BLUEPRINT_COSTS[blueprintType];
      if (!cost) return { success: false, reason: "Unknown blueprint type" };
      // Check and deduct resources
      for (const [res, qty] of Object.entries(cost)) {
        if ((hb.baseStorage[res] ?? 0) < qty)
          return { success: false, reason: `Need ${qty} ${res}` };
      }
      for (const [res, qty] of Object.entries(cost)) {
        hb.baseStorage[res] = Math.max(0, (hb.baseStorage[res] ?? 0) - qty);
      }
      if (!hb.blueprints) hb.blueprints = [];
      const bp = {
        id: `bp_${blueprintType}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
        type: blueprintType,
        x: x ?? 500, y: y ?? 500,
        placedAt: Date.now(),
        category: BLUEPRINT_CATEGORY[blueprintType] ?? "misc",
      };
      hb.blueprints.push(bp);
      const typeLabel = BLUEPRINT_LABELS[blueprintType] ?? blueprintType;
      pushActivity(activityLog, `📐 ${typeLabel} blueprint placed — go build it!`);
      return { success: true, blueprint: bp };
    }

    // ── complete_blueprint: called by GameView when a player/builder finishes
    //    casting [F] on a ghost blueprint. Removes the ghost and registers the
    //    structure as permanently built. For workshop-type blueprints this also
    //    unlocks the corresponding workstation assignment slot.
    case "complete_blueprint": {
      const { blueprintId } = action;
      if (!hb.blueprints) return { success: false };
      const idx = hb.blueprints.findIndex(bp => bp.id === blueprintId);
      if (idx === -1) return { success: false, reason: "Blueprint not found" };
      const bp = hb.blueprints[idx];
      hb.blueprints.splice(idx, 1);

      if (!hb.builtStructures) hb.builtStructures = [];

      // Workshop-type: register as a built structure and unlock the workstation
      const isWorkshopType = BLUEPRINT_CATEGORY[bp.type] === "workshop";
      if (isWorkshopType) {
        hb.builtStructures.push({
          id: `struct_${bp.type}_${Date.now()}`,
          type: bp.type,
          x: bp.x,
          y: bp.y,
          builtAt: Date.now(),
        });
        const typeLabel = BLUEPRINT_LABELS[bp.type] ?? bp.type;
        pushActivity(activityLog, `🏗 ${typeLabel} built! Assign a survivor to staff it.`);
      } else if (bp.type === "turret") {
        // Turret blueprint → spawn a real turret at the position
        if (!hb.turrets) hb.turrets = [];
        hb.turrets.push({
          id: `turret_home_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
          x: bp.x, y: bp.y,
          hp: 150, maxHp: 150,
          destroyed: false,
        });
        pushActivity(activityLog, `🗼 Turret constructed and online.`);
      } else if (bp.type === "crop_plot") {
        hb.gardenPlots = (hb.gardenPlots ?? 0) + 1;
        pushActivity(activityLog, `🌱 Garden plot established — plant seeds to grow food.`);
      }
      return { success: true, blueprint: bp };
    }

    case "cancel_blueprint": {
      if (!hb.blueprints) return { success: false };
      const idx = hb.blueprints.findIndex(bp => bp.id === action.blueprintId);
      if (idx === -1) return { success: false, reason: "Blueprint not found" };
      const bp = hb.blueprints[idx];
      // Refund resources
      const cost = BLUEPRINT_COSTS[bp.type];
      if (cost) {
        for (const [res, qty] of Object.entries(cost)) {
          hb.baseStorage[res] = (hb.baseStorage[res] ?? 0) + qty;
        }
      }
      hb.blueprints.splice(idx, 1);
      pushActivity(activityLog, `📐 Blueprint cancelled — resources refunded`);
      return { success: true };
    }

    // ── Phase 2: Upgrade a workstation's gear tier ───────────────────────────
    case "upgrade_gear": {
      return upgradeWorkstationGear(hb, action.zone, activityLog);
    }

    // ── Phase 2: Assign a recipe to a zone's crafting queue ─────────────────
    case "assign_recipe": {
      return assignRecipe(hb, roster, action.zone, action.recipeId, action.workerId, activityLog);
    }

    // ── Phase 2: Cancel the active recipe in a zone ──────────────────────────
    case "cancel_recipe": {
      return cancelRecipe(hb, action.zone, activityLog);
    }

    // ── Phase 2: Set a survivor's permanent specialization ───────────────────
    case "set_specialization": {
      return setSpecialization(roster, action.survivorId, action.specId, activityLog);
    }

    default:
      return { success: false };
  }
}

// ─── Run ↔ home bridging ──────────────────────────────────────────────────────
// When a run that WAS the home base (mission "homebase") ends, fold its live
// base state back into the persistent home base so changes stick.
export function mergeRunIntoHomeBase(homeBase, snapshot) {
  if (!snapshot) return homeBase ?? makeDefaultHomeBase();
  const hb = homeBase ?? makeDefaultHomeBase();

  // Merge baseStorage: take the max of each key so accumulated loot from
  // previous sessions is never clobbered by a fresh homebase run's state.
  if (snapshot.baseStorage) {
    const existing = hb.baseStorage ?? EMPTY_RESOURCES();
    const runBS    = snapshot.baseStorage;
    const allKeys  = new Set([...Object.keys(existing), ...Object.keys(runBS)]);
    const merged   = {};
    for (const k of allKeys) {
      merged[k] = Math.max(existing[k] ?? 0, runBS[k] ?? 0);
    }
    hb.baseStorage = merged;
  }
  if (Array.isArray(snapshot.crops))   hb.crops   = snapshot.crops;
  if (Array.isArray(snapshot.turrets)) hb.turrets = snapshot.turrets.filter(t => !t.destroyed);
  if (typeof snapshot.gardenPlots === "number") hb.gardenPlots = snapshot.gardenPlots;
  // Blueprints that were completed in-run are removed from the array.
  // Remaining blueprints (not yet built) persist.
  if (Array.isArray(snapshot.blueprints)) hb.blueprints = snapshot.blueprints;
  // Merge newly-built structures from the run (workshop, kitchen, etc.)
  if (Array.isArray(snapshot.builtStructures)) {
    const existingIds = new Set((hb.builtStructures ?? []).map(s => s.id));
    const newStructs = snapshot.builtStructures.filter(s => !existingIds.has(s.id));
    hb.builtStructures = [...(hb.builtStructures ?? []), ...newStructs];
  }
  // Vehicles the player ended the run with become the home garage fleet.
  if (Array.isArray(snapshot.vehicles)) {
    hb.garage = snapshot.vehicles.map(v => ({
      id: v.id, vehicleType: v.vehicleType,
      hp: v.hp, fuel: v.fuel, upgrades: v.upgrades ?? [],
    }));
  }
  hb.lastBaseTick = Date.now();
  return hb;
}