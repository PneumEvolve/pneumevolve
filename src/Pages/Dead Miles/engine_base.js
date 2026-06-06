// engine_base.js — split from deadMilesEngine.js (pure functions, no React)

import { AUTO_SPAWN_GRACE, BASE_UPGRADE_TREE, CARRY_CAP, CRAFTING_RECIPES, CROP_TYPES, DEFEND_BASE_HP_RESTORE, FOOD_CAP_PER_LEVEL, FOOD_PER_PLOT_PER_TICK, MAX_ACTIVITY, SCRAP_CAP_PER_LEVEL, SCRAP_PER_TICK, SURVIVOR_MORALE_LOW_THRESHOLD, SURVIVOR_MORALE_OUTPUT_PENALTY, SURVIVOR_XP_PER_CRAFT, SURVIVOR_XP_PER_HARVEST, WORKSTATION_OUTPUT } from "./engine_constants";
import { awardSurvivorXp, tickSurvivorNeeds } from "./engine_survivors";

export function pushActivity(log, text) {
  log.unshift({ text, ts: Date.now() });
  if (log.length > MAX_ACTIVITY) log.length = MAX_ACTIVITY;
}

// ─── Homebase designation ───────────────────────────────────────────────────
export function setHomebase(state, settlementId) {
  state.homesettlementId = settlementId;
}

// ─── Idle base tick ──────────────────────────────────────────────────────────

// ─── Survivor XP & leveling ──────────────────────────────────────────────────
// FIX 2: XP helpers used by workstation tick and combat resolution.
// Each level grants a small stat bump; Phase 2 surfaces name/role/level in BaseView.
function addToBaseStorage(state, key, amount) {
  if (!state.baseStorage) state.baseStorage = {};
  state.baseStorage[key] = (state.baseStorage[key] ?? 0) + amount;
}

// ─── Idle base tick ──────────────────────────────────────────────────────────
// FIX 2: Expanded to handle workstation passive output in addition to crop
// growth, survivor harvesting, and turret decay. Called both in real-time
// (every few seconds while base is open) and offline (elapsed time on reload).
export function baseTick(state, dtReal, activityLog = []) {
  const harvested  = [];
  const damaged    = [];
  const produced   = [];  // new: workstation output

  if (dtReal <= 0) return { harvested, damaged, produced };

  // ── Crop growth ────────────────────────────────────────────────────────────
  for (const crop of (state.crops ?? [])) {
    if (crop.stage !== "planted") continue;
    crop.growTimer = Math.min(crop.growTime, (crop.growTimer ?? 0) + dtReal);
    if (crop.growTimer >= crop.growTime) {
      crop.stage = "ready";
      pushActivity(activityLog, `🌱 ${crop.type} plot is ready to harvest`);
    }
  }

  // ── Assigned-survivor crop harvesting ─────────────────────────────────────
  for (const sv of (state.survivors ?? [])) {
    if (sv.command !== "assign" || !sv.assignedTo) continue;
    if (sv.assignedTo.structureType !== "crop") continue;

    const crop = (state.crops ?? []).find(
      c => c.plotId === sv.assignedTo.structureId && c.stage === "ready"
    );
    if (!crop) continue;

    crop.stage = "harvested";
    const yieldAmt = CROP_TYPES[crop.type]?.yield ?? 4;
    // FIX 5: Harvested food goes to baseStorage, not player field inventory,
    // so it persists when the player is away from base.
    addToBaseStorage(state, "food", yieldAmt);

    const levelled = awardSurvivorXp(sv, SURVIVOR_XP_PER_HARVEST);
    harvested.push({ name: sv.name, type: crop.type, amount: yieldAmt, levelled });
    pushActivity(
      activityLog,
      `${sv.name} harvested ${yieldAmt} ${crop.type}${levelled ? " ⬆ levelled up!" : ""}`
    );
  }

  // ── Workstation passive generation (Phase 2 prerequisite) ─────────────────
  // FIX 2: Each survivor assigned to a workstation trickles resources into
  // baseStorage at the rate defined in WORKSTATION_OUTPUT.
  for (const sv of (state.survivors ?? [])) {
    if (sv.command !== "assign" || !sv.workstation) continue;
    const rates = WORKSTATION_OUTPUT[sv.workstation];
    if (!rates) continue;
    // Demoralized survivors work at reduced output.
    const moraleMult = (sv.morale ?? 100) < SURVIVOR_MORALE_LOW_THRESHOLD
      ? SURVIVOR_MORALE_OUTPUT_PENALTY
      : 1;
    for (const [resource, ratePerSec] of Object.entries(rates)) {
      const amount = ratePerSec * dtReal * moraleMult;
      if (amount <= 0) continue;
      addToBaseStorage(state, resource, amount);
      produced.push({ name: sv.name, workstation: sv.workstation, resource, amount });
    }
  }

  // ── Turret decay ───────────────────────────────────────────────────────────
  const TURRET_DECAY_PER_SEC = 10 / 60;
  for (const t of (state.turrets ?? [])) {
    if (t.destroyed) continue;
    t.hp = Math.max(0, t.hp - TURRET_DECAY_PER_SEC * dtReal);
    if (t.hp <= 0 && !t.destroyed) {
      t.destroyed = true;
      damaged.push({ turretId: t.id, damage: Math.round(TURRET_DECAY_PER_SEC * dtReal) });
      pushActivity(activityLog, `⚡ A turret was destroyed while you were away`);
    }
  }

  state.lastBaseTick = Date.now();

  return { harvested, damaged, produced };
}

// ─── Crafting recipes ─────────────────────────────────────────────────────────
// Phase 1: starter recipes. All inputs/outputs reference baseStorage keys.
// Each recipe: { id, label, icon, inputs: {key: qty}, outputs: {key: qty}, seconds }
export function craftItem(state, recipeId, activityLog = []) {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return { success: false, missing: {} };

  if (!state.baseStorage) state.baseStorage = {};
  const bs = state.baseStorage;

  // Check inputs
  const missing = {};
  for (const [key, qty] of Object.entries(recipe.inputs)) {
    const have = bs[key] ?? 0;
    if (have < qty) missing[key] = qty - have;
  }
  if (Object.keys(missing).length > 0) return { success: false, missing, recipe };

  // Deduct inputs
  for (const [key, qty] of Object.entries(recipe.inputs)) {
    bs[key] = (bs[key] ?? 0) - qty;
  }

  // Add outputs
  for (const [key, qty] of Object.entries(recipe.outputs)) {
    bs[key] = (bs[key] ?? 0) + qty;
  }

  // Award XP to a relevant workstation survivor
  for (const sv of (state.survivors ?? [])) {
    if (sv.command === "assign" && sv.workstation &&
        (sv.workstation === "kitchen" || sv.workstation === "workshop")) {
      awardSurvivorXp(sv, SURVIVOR_XP_PER_CRAFT);
      break;
    }
  }

  pushActivity(activityLog, `🔨 Crafted ${recipe.label}`);
  return { success: true, recipe };
}

// ─── Workstation definitions ──────────────────────────────────────────────────
// Used by BaseView to render the 4 workstation slots and their flavour text.
export function applyOfflineBaseTick(state, activityLog) {
  if (!state.lastBaseTick) {
    state.lastBaseTick = Date.now();
    return { harvested: [], damaged: [], produced: [] };
  }
  const elapsed = (Date.now() - state.lastBaseTick) / 1000;
  if (elapsed < 2) return { harvested: [], damaged: [], produced: [] };
  return baseTick(state, elapsed, activityLog);
}
// ─── Autopilot player AI ──────────────────────────────────────────────────────
// Pure function — no React, no side effects.
// Returns a synthetic { dx, dy, action } each frame for GameView to apply.
//
// Behavior tree (priority order):
//   0. spawn_safety  — first AUTO_SPAWN_GRACE seconds: beeline to nearest vehicle,
//                      flee away from zombie centroid, ignore all fight logic.
//                      Prevents instant death from the awakening ring.
//   1. vehicle_seek  — on foot and 2+ threats nearby: find any available vehicle
//                      in the full fleet and head for it. Handles destroyed-vehicle
//                      recovery — if current vehicle is gone, target a different one.
//   2. flee_threat   — on foot, overwhelmed (3+ threats very close), no vehicle
//                      reachable quickly: back away from closest threat centroid.
//   3. fight         — exactly 1 zombie nearby AND player has a melee weapon:
//                      close in and swing. Never charges a mob unarmed.
//   4. fight_vehicle — in vehicle and threats nearby: drive them down.
//   5. collect_loot  — nearby uncollected loot, not too many zombies around it.
//   6. enter_vehicle — vehicle is close and unoccupied: enter it.
//   7. boss_fight    — boss alive and fragment collected: close on boss.
//   8. exiting       — boss dead: drive/walk toward level exit (north edge).
//   9. fragment_hunt — navigate toward compassTarget building.
//  10. idle          — nothing to do.
export function tickBaseResources(worldState, survivorsByLevel = null, worldEventsRef = null) {
  const levels = worldState.levels.map(level => {
    // Only secured levels generate resources (under_attack pauses generation)
    if (level.status !== "secured") return level;

    const { gardenPlots = 0, turretPlaced = false } = level;
    const upgrades = level.baseUpgrades ?? [];
    const resources = {
      food:     level.resources?.food     ?? 0,
      scrap:    level.resources?.scrap    ?? 0,
      medicine: level.resources?.medicine ?? 0,
      fuel:     level.resources?.fuel     ?? 0,
      ammo:     level.resources?.ammo     ?? 0,
    };

    // Compute upgrade bonuses for this level
    let foodBonusPerTick  = 0;
    let scrapBonusPerTick = 0;
    let ammoBonusPerTick  = 0;
    let foodCapMult       = 1;
    for (const uid of upgrades) {
      const fx = BASE_UPGRADE_TREE[uid]?.effects ?? {};
      if (fx.foodBonusPerTick)  foodBonusPerTick  += fx.foodBonusPerTick;
      if (fx.scrapBonusPerTick) scrapBonusPerTick += fx.scrapBonusPerTick;
      if (fx.ammoBonusPerTick)  ammoBonusPerTick  += fx.ammoBonusPerTick;
      // foodCapMultiplier stacks multiplicatively (kitchen=1, smokehouse=2, lab=4)
      if (fx.foodCapMultiplier && fx.foodCapMultiplier > foodCapMult) foodCapMult = fx.foodCapMultiplier;
    }
    const effectiveFoodCap = FOOD_CAP_PER_LEVEL * foodCapMult;

    // Food: each garden plot contributes FOOD_PER_PLOT_PER_TICK per tick; Kitchen/Lab bonus on top
    if (gardenPlots > 0 || foodBonusPerTick > 0) {
      const foodGain = gardenPlots * FOOD_PER_PLOT_PER_TICK + foodBonusPerTick;
      resources.food = Math.min(effectiveFoodCap, resources.food + foodGain);
    }

    // Scrap: requires a turret; Workshop adds flat bonus
    if (turretPlaced || scrapBonusPerTick > 0) {
      const scrapGain = (turretPlaced ? SCRAP_PER_TICK : 0) + scrapBonusPerTick;
      resources.scrap = Math.min(SCRAP_CAP_PER_LEVEL, resources.scrap + scrapGain);
    }

    // Ammo: Armory only
    if (ammoBonusPerTick > 0) {
      resources.ammo = Math.min(200, resources.ammo + ammoBonusPerTick);
    }

    // Survivor food consumption (world sim layer)
    // survivorsByLevel is a Map<levelId, survivor[]> passed from index.jsx if available
    if (survivorsByLevel) {
      const levelSurvivors = survivorsByLevel.get(level.id) ?? [];
      for (const sv of levelSurvivors) {
        tickSurvivorNeeds(sv, resources);
      }
    }

    return { ...level, resources };
  });

  // Recompute global totals by summing all level stockpiles
  const totalResources = levels.reduce(
    (acc, l) => ({
      food:     acc.food     + (l.resources?.food     ?? 0),
      scrap:    acc.scrap    + (l.resources?.scrap    ?? 0),
      medicine: acc.medicine + (l.resources?.medicine ?? 0),
      fuel:     acc.fuel     + (l.resources?.fuel     ?? 0),
      ammo:     acc.ammo     + (l.resources?.ammo     ?? 0),
    }),
    { food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 }
  );

  return { ...worldState, levels, totalResources };
}
// ─── Step 7: Resource carry between levels ────────────────────────────────────
// Maximum food/scrap a player can carry from the world stockpile when deploying.
export function applyDeployCarry(inventory, totalResources) {
  const inv  = { ...(inventory ?? {}) };
  const pool = { food: totalResources?.food ?? 0, scrap: totalResources?.scrap ?? 0 };

  const foodCarry  = Math.min(CARRY_CAP.food,  Math.floor(pool.food));
  const scrapCarry = Math.min(CARRY_CAP.scrap, Math.floor(pool.scrap));

  if (foodCarry  > 0) inv.food  = (inv.food  ?? 0) + foodCarry;
  if (scrapCarry > 0) inv.scrap = (inv.scrap ?? 0) + scrapCarry;

  return {
    inventory: inv,
    worldResources: {
      food:  Math.max(0, pool.food  - foodCarry),
      scrap: Math.max(0, pool.scrap - scrapCarry),
    },
  };
}

/**
 * Merge resourcesCollected from a completed level back into the world
 * totalResources pool. Called inside markLevelSecured (index.jsx).
 * Returns the updated totalResources object.
 */
export function mergeCollectedResources(totalResources, resourcesCollected) {
  return {
    food:     (totalResources?.food     ?? 0) + (resourcesCollected?.food     ?? 0),
    scrap:    (totalResources?.scrap    ?? 0) + (resourcesCollected?.scrap    ?? 0),
    medicine: (totalResources?.medicine ?? 0) + (resourcesCollected?.medicine ?? 0),
    fuel:     (totalResources?.fuel     ?? 0) + (resourcesCollected?.fuel     ?? 0),
    ammo:     (totalResources?.ammo     ?? 0) + (resourcesCollected?.ammo     ?? 0),
  };
}

// ─── Phase 1.2: Base upgrade tree ─────────────────────────────────────────────
// Two chains:
//   Kitchen → Smokehouse → Preservation Lab  (food production / capacity)
//   Workshop → Armory                         (scrap gen / ammo / turret power)
//
// Each upgrade is keyed by id. `requires` is a single prerequisite id or null.
// `effects` are applied in tickBaseResources; downstream logic reads baseUpgrades[].
export function applyBaseUpgrade(worldState, levelId, upgradeId) {
  const upgrade = BASE_UPGRADE_TREE[upgradeId];
  if (!upgrade) return { ok: false, reason: "Unknown upgrade.", worldState };

  const level = worldState.levels.find(l => l.id === levelId);
  if (!level || level.status !== "secured")
    return { ok: false, reason: "Level must be secured.", worldState };

  const built = level.baseUpgrades ?? [];

  if (built.includes(upgradeId))
    return { ok: false, reason: "Already built.", worldState };

  if (upgrade.requires && !built.includes(upgrade.requires))
    return { ok: false, reason: `Requires ${BASE_UPGRADE_TREE[upgrade.requires]?.label ?? upgrade.requires}.`, worldState };

  // Check cost
  const total = worldState.totalResources ?? {};
  for (const [res, qty] of Object.entries(upgrade.cost)) {
    if ((total[res] ?? 0) < qty)
      return { ok: false, reason: `Need ${qty} ${res} (have ${Math.floor(total[res] ?? 0)}).`, worldState };
  }

  // Deduct cost
  const newTotal = { ...total };
  for (const [res, qty] of Object.entries(upgrade.cost)) {
    newTotal[res] = Math.max(0, (newTotal[res] ?? 0) - qty);
  }

  // Add upgrade to level
  const newLevels = worldState.levels.map(l =>
    l.id === levelId
      ? { ...l, baseUpgrades: [...built, upgradeId] }
      : l
  );

  return {
    ok: true,
    worldState: { ...worldState, levels: newLevels, totalResources: newTotal },
  };
}

// ─── Step 8: Defend base mission type ─────────────────────────────────────────
// missionType: "clear" | "defend"
// "defend" is set when the deployed level has status "under_attack".
// Win  → onGameOver({ survived: true, defended: true, baseHpRestored: DEFEND_BASE_HP_RESTORE })
// Lose → onGameOver({ survived: false })