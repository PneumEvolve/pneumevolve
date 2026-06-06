// engine_systems.js — split from deadMilesEngine.js (pure functions, no React)

import { CROP_TYPES, NIGHT_DIFFICULTY, VEHICLE_UPGRADES, WEATHER_TYPES } from "./engine_constants";

export function applyVehicleUpgrade(vehicle, upgradeType) {
  const upgrade = VEHICLE_UPGRADES[upgradeType];
  if (!upgrade) return false;
  if (!vehicle.upgrades) vehicle.upgrades = [];
  if (vehicle.upgrades.includes(upgradeType)) return false;
  
  vehicle.upgrades.push(upgradeType);
  
  if (upgrade.zombieKill !== undefined) vehicle.zombieKill = upgrade.zombieKill;
  if (upgrade.speed) vehicle.speed += upgrade.speed;
  if (upgrade.speedBoost) vehicle.speed = Math.min(500, vehicle.speed + upgrade.speedBoost);
  if (upgrade.passengerSeats) vehicle.seats += upgrade.passengerSeats;
  
  return true;
}

// ─── Weather System ───────────────────────────────────────────────────────────
let currentWeather = "clear";
let weatherTimer = 0;
export function updateWeather(dt, dayNumber, state = null) {
  // If a state object is passed, use per-instance weather (preferred for multiplayer).
  // Falls back to module-level globals for backwards compatibility.
  const _timer  = state ? (state._weatherTimer  ?? 0) : weatherTimer;
  const _current = state ? (state._currentWeather ?? "clear") : currentWeather;

  let timer = _timer + dt;
  const changeInterval = 60 + (dayNumber % 3) * 30;
  let newWeather = _current;
  if (timer >= changeInterval) {
    timer = 0;
    const weathers = Object.keys(WEATHER_TYPES);
    newWeather = weathers[Math.floor(Math.random() * weathers.length)];
    if (newWeather === "storm" && Math.random() > 0.25) newWeather = "rain";
  }

  if (state) {
    state._weatherTimer   = timer;
    state._currentWeather = newWeather;
  } else {
    weatherTimer   = timer;
    currentWeather = newWeather;
  }
  return newWeather;
}
export function getCurrentWeather(state = null) {
  const key = state ? (state._currentWeather ?? "clear") : currentWeather;
  return WEATHER_TYPES[key];
}

// ─── Night Difficulty Scaling ────────────────────────────────────────────────
export function getNightDifficulty(dayNumber) {
  const tiers = Object.keys(NIGHT_DIFFICULTY).sort((a,b) => parseInt(a) - parseInt(b));
  let selected = NIGHT_DIFFICULTY.day1;
  for (const tier of tiers) {
    if (dayNumber >= parseInt(tier)) selected = NIGHT_DIFFICULTY[tier];
  }
  return selected;
}

// ─── Crop Variety ─────────────────────────────────────────────────────────────
export function getSeasonalBonus(cropType, dayNumber) {
  const season = Math.floor(dayNumber / 30) % 4;
  const cropSeason = CROP_TYPES[cropType]?.season;
  const seasonMap = { spring: 0, summer: 1, fall: 2, winter: 3 };
  if (seasonMap[cropSeason] === season) return 1.25;
  return 1.0;
}

// ─── Spatial Grid for performance ─────────────────────────────────────────────
export class SpatialGrid {
  constructor(cellSize = 256) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.entityMap = new Map();
  }

  _getCellKey(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  add(id, x, y, type = "entity") {
    const cellKey = this._getCellKey(x, y);
    if (!this.grid.has(cellKey)) this.grid.set(cellKey, []);
    this.grid.get(cellKey).push({ id, type });
    this.entityMap.set(id, { cellKey, type });
  }

  update(id, x, y) {
    const existing = this.entityMap.get(id);
    const newCellKey = this._getCellKey(x, y);
    if (existing && existing.cellKey === newCellKey) return;
    
    if (existing) {
      const oldCell = this.grid.get(existing.cellKey);
      if (oldCell) {
        const idx = oldCell.findIndex(e => e.id === id);
        if (idx !== -1) oldCell.splice(idx, 1);
      }
    }
    
    if (!this.grid.has(newCellKey)) this.grid.set(newCellKey, []);
    this.grid.get(newCellKey).push({ id, type: existing?.type || "entity" });
    this.entityMap.set(id, { cellKey: newCellKey, type: existing?.type || "entity" });
  }

  getNearby(x, y, radius, type = null) {
    const results = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(x / this.cellSize);
    const centerY = Math.floor(y / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const cellKey = `${centerX + dx},${centerY + dy}`;
        const cell = this.grid.get(cellKey);
        if (cell) {
          for (const item of cell) {
            if (!type || item.type === type) results.push(item.id);
          }
        }
      }
    }
    return results;
  }

  remove(id) {
    const existing = this.entityMap.get(id);
    if (existing) {
      const cell = this.grid.get(existing.cellKey);
      if (cell) {
        const idx = cell.findIndex(e => e.id === id);
        if (idx !== -1) cell.splice(idx, 1);
      }
      this.entityMap.delete(id);
    }
  }
}

// ─── Death Recap System ───────────────────────────────────────────────────────
export class DeathRecap {
  constructor() {
    this.lastDamage = null;
    this.damageHistory = [];
    this.kills = 0;
    this.timeAlive = 0;
  }
  
  recordDamage(source, amount, location, hpLeft) {
    this.lastDamage = { source, amount, location, time: Date.now(), hpLeft };
    this.damageHistory.unshift(this.lastDamage);
    if (this.damageHistory.length > 10) this.damageHistory.pop();
  }
  
  recordKill() { this.kills++; }
  
  getRecap() {
    const last = this.lastDamage;
    if (!last) return "";
    return `You were killed by ${last.source} while at ${Math.floor(last.hpLeft)}% health. You killed ${this.kills} zombies.`;
  }
}