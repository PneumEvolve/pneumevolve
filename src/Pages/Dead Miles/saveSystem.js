// src/Pages/DeadMiles/saveSystem.js
// Save/Load system for solo play

const SAVE_KEY = "dead_miles_save";

export function saveGame(state) {
  if (!state) return false;
  
  const saveData = {
    version: 1,
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
    survivors: state.survivors?.map(sv => ({
      id: sv.id,
      name: sv.name,
      role: sv.role,
      hp: sv.hp,
      command: sv.command,
      assignedTo: sv.assignedTo,
      priority: sv.priority,
      barricaded: sv.barricaded,
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
    return JSON.parse(raw);
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
  
  // Restore survivors
  if (saveData.survivors) {
    for (const savedSv of saveData.survivors) {
      const existing = state.survivors?.find(sv => sv.id === savedSv.id);
      if (existing) {
        existing.hp = savedSv.hp;
        existing.command = savedSv.command;
        existing.assignedTo = savedSv.assignedTo;
        existing.priority = savedSv.priority;
        existing.barricaded = savedSv.barricaded;
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
  
  return state;
}