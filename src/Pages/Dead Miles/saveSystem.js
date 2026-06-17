// src/Pages/DeadMiles/saveSystem.js
// Save/Load system for solo play

const SAVE_KEY = "dead_miles_save";

export function saveGame(state) {
  if (!state) return false;
  
  const saveData = {
    version: 2,
    timestamp: Date.now(),
    seed: state.seed,
    dayNumber: state.dayNumber,
    isNight: state.isNight,
    dayTimer: state.dayTimer,
    player: {
      x: state.player.x,
      y: state.player.y,
      hp: state.player.hp,
      food: state.player.food,
      water: state.player.water,
      sleep: state.player.sleep,
      inventory: state.player.inventory,
      weapon: state.player.weapon,
    },
    // ── FIX 5: baseStorage saved separately from player field inventory ──────
    baseStorage: state.baseStorage ?? {},
    vehicle: {
      x: state.vehicle.x,
      y: state.vehicle.y,
      hp: state.vehicle.hp,
      fuel: state.vehicle.fuel,
      vehicleType: state.vehicle.vehicleType,
      upgrades: state.vehicle.upgrades || [],
    },
    vehicles: state.vehicles?.map(v => ({
      id: v.id,
      x: v.x,
      y: v.y,
      hp: v.hp,
      fuel: v.fuel,
      vehicleType: v.vehicleType,
      upgrades: v.upgrades || [],
      isBeacon: v.isBeacon || false,
    })),
    // ── FIX 1: persist full survivor state including assignments, XP, level ──
    survivors: state.survivors?.map(sv => ({
      id: sv.id,
      name: sv.name,
      role: sv.role,
      hp: sv.hp,
      command: sv.command,
      assignedTo: sv.assignedTo ?? null,
      priority: sv.priority,
      barricaded: sv.barricaded,
      // XP & leveling — new fields
      xp: sv.xp ?? 0,
      level: sv.level ?? 1,
      // Workstation assignment (Phase 2)
      workstation: sv.workstation ?? null,
      // Phase 2: permanent specialization
      specialization: sv.specialization ?? null,
    })),
    turrets: state.turrets?.filter(t => !t.destroyed).map(t => ({
      id: t.id,
      x: t.x,
      y: t.y,
      hp: t.hp,
    })),
    crops: state.crops?.map(c => ({
      id: c.id,
      plotId: c.plotId,
      type: c.type,
      growTimer: c.growTimer,
      stage: c.stage,
    })),
    gardenPlots: state.gardenPlots,
    fragmentsCollected: state.fragmentsCollected,
    compassTarget: state.compassTarget,
    zombiesKilled: state.zombiesKilled,
    buildingsSearched: state.buildingsSearched,
    survivorsFound: state.survivorsFound,
    homesettlementId: state.homesettlementId,
    // Preserve base tick timestamp so offline tick is accurate on reload
    lastBaseTick: state.lastBaseTick,
  };
  
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error("Failed to save game:", e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Migrate v1 saves: synthesise missing fields so the rest of the code is safe
    if (!data.version || data.version < 2) {
      data.baseStorage = data.baseStorage ?? {};
      if (data.survivors) {
        data.survivors = data.survivors.map(sv => ({
          xp: 0,
          level: 1,
          workstation: null,
          ...sv,
          // v1 saves stored assignedTo inconsistently — normalise
          assignedTo: sv.assignedTo ?? null,
        }));
      }
    }
    return data;
  } catch (e) {
    console.error("Failed to load save:", e);
    return null;
  }
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

// Reconstruct full state from save data + fresh world generation
export function reconstructState(saveData, freshWorld) {
  if (!saveData || !freshWorld) return null;
  
  // Merge saved data into fresh world
  const state = { ...freshWorld, ...saveData };
  
  // ── FIX 5: restore baseStorage onto state ─────────────────────────────────
  state.baseStorage = saveData.baseStorage ?? {};

  // Restore player with saved stats
  state.player = {
    ...freshWorld.player,
    ...saveData.player,
  };
  
  // Restore vehicle
  const savedVehicle = saveData.vehicle;
  const matchingVehicle = state.vehicles?.find(v => v.id === savedVehicle?.id) || state.vehicle;
  if (matchingVehicle) {
    matchingVehicle.hp = savedVehicle?.hp ?? matchingVehicle.hp;
    matchingVehicle.fuel = savedVehicle?.fuel ?? matchingVehicle.fuel;
    matchingVehicle.upgrades = savedVehicle?.upgrades ?? [];
    state.vehicle = matchingVehicle;
  }
  
  // Restore other vehicles
  if (saveData.vehicles) {
    for (const savedV of saveData.vehicles) {
      const existing = state.vehicles?.find(v => v.id === savedV.id);
      if (existing) {
        existing.hp = savedV.hp;
        existing.fuel = savedV.fuel;
        existing.upgrades = savedV.upgrades;
      }
    }
  }
  
  // ── FIX 1: restore survivors with full assignment, XP, and level state ─────
  if (saveData.survivors) {
    for (const savedSv of saveData.survivors) {
      const existing = state.survivors?.find(sv => sv.id === savedSv.id);
      if (existing) {
        existing.hp          = savedSv.hp;
        existing.command     = savedSv.command;
        existing.assignedTo  = savedSv.assignedTo ?? null;
        existing.priority    = savedSv.priority;
        existing.barricaded  = savedSv.barricaded;
        existing.xp          = savedSv.xp ?? 0;
        existing.level       = savedSv.level ?? 1;
        existing.workstation = savedSv.workstation ?? null;
        existing.specialization = savedSv.specialization ?? null;
      }
    }
  }
  
  // Restore turrets
  if (saveData.turrets) {
    state.turrets = saveData.turrets.map(t => ({
      ...freshWorld.turrets?.find(ft => ft.id === t.id) || {},
      ...t,
      destroyed: false,
    }));
  }
  
  // Restore crops
  if (saveData.crops) {
    state.crops = saveData.crops;
  }
  
  // Restore garden plots
  if (saveData.gardenPlots) {
    state.gardenPlots = saveData.gardenPlots;
  }

  // Restore base tick timestamp
  if (saveData.lastBaseTick) {
    state.lastBaseTick = saveData.lastBaseTick;
  }

  return state;
}
// ─── Step 5: World state persistence ─────────────────────────────────────────

const WORLD_STATE_KEY = "dead_miles_world";

/**
 * Persist the world map state (level statuses, base HP, resources, etc.)
 * independently of the active level's game state.
 */
export function saveWorldState(worldState) {
  if (!worldState) return false;
  try {
    const payload = {
      version: 3,   // Phase 2: workstationGear, craftingQueues, specialization
      timestamp: Date.now(),
      levels: worldState.levels,
      totalResources: worldState.totalResources ?? { food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 },
      // ── Phase 0.1/0.2: persist the things v1 silently dropped ──────────────
      roster:        worldState.roster ?? [],        // persistent named survivors
      supplyRoutes:  worldState.supplyRoutes ?? [],   // were lost on every reload
      _survivorSeq:  worldState._survivorSeq ?? 0,    // stable id counter
      // ── Base-first reframe: persistent home base (stockpile, crops, garage) ──
      homeBase:      worldState.homeBase ?? null,
    };
    localStorage.setItem(WORLD_STATE_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error("Failed to save world state:", e);
    return false;
  }
}

// ── Phase 2: migrate older homeBase objects to include new fields ──────────────
function migrateHomeBase(homeBase) {
  if (!homeBase) return null;
  // workstationGear added in v3 — default all zones to tier 1
  if (!homeBase.workstationGear) {
    homeBase.workstationGear = { workshop: 1, kitchen: 1, medical: 1, garden: 1 };
  }
  // craftingQueues added in v3 — null means no active recipe
  if (!homeBase.craftingQueues) {
    homeBase.craftingQueues = { workshop: null, kitchen: null, medical: null, garden: null };
  }
  // Ensure all four zones exist in each map in case of partial saves
  for (const zone of ["workshop", "kitchen", "medical", "garden"]) {
    homeBase.workstationGear[zone] ??= 1;
    homeBase.craftingQueues[zone]  ??= null;
  }
  return homeBase;
}

/**
 * Load the world map state. Returns null if no save exists or parsing fails.
 */
export function loadWorldState() {
  try {
    const raw = localStorage.getItem(WORLD_STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.levels) return null;
    // Migration: ensure every level has all required fields. `...l` preserves
    // actual saved values (threatTier, full resource set) — the defaults below
    // only fill gaps for older saves.
    const levels = data.levels.map(l => ({
      baseHp:        100,
      turretPlaced:  false,
      gardenPlots:   0,
      resources:     { food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 },
      lastAttack:    null,
      threatTier:    1,
      baseUpgrades:  [],   // Phase 1.2 — default for saves predating upgrade tree
      ...l,
    }));
    // ── Phase 2 migration: ensure all roster records have specialization field ─
    const roster = (data.roster ?? []).map(r => ({
      specialization: null,
      ...r,
    }));
    return {
      levels,
      totalResources: data.totalResources ?? { food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 },
      // ── Phase 0.1/0.2: restore persistent roster + routes (default empty) ──
      roster,
      supplyRoutes:  data.supplyRoutes ?? [],
      _survivorSeq:  data._survivorSeq ?? 0,
      // ── Base-first reframe: restore home base; null → caller seeds a default ──
      homeBase:      migrateHomeBase(data.homeBase),
    };
  } catch (e) {
    console.error("Failed to load world state:", e);
    return null;
  }
}

export function hasWorldStateSave() {
  return !!localStorage.getItem(WORLD_STATE_KEY);
}

export function deleteWorldStateSave() {
  localStorage.removeItem(WORLD_STATE_KEY);
}