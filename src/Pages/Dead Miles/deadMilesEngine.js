// src/Pages/DeadMiles/deadMilesEngine.js
// Pure functions — no React, no side effects.
// Includes: Spatial grid, weather system, crop varieties, vehicle upgrades, death recap

// ─── World ────────────────────────────────────────────────────────────────────

export const WORLD_W = 18000;
export const WORLD_H = 18000;

// ─── Zombie culling ───────────────────────────────────────────────────────────
export const ZOMBIE_CULL_DIST = 1400;

export const NEEDS_TUNE = {
  food:  { drainPerSec: 0.6,  warnAt: 40, critAt: 15 },
  water: { drainPerSec: 0.8,  warnAt: 40, critAt: 15 },
  sleep: { drainPerSec: 0.4,  warnAt: 35, critAt: 12 },
};

export const PLAYER_SPEED_BASE    = 160;
export const PLAYER_SPEED_TIRED   = 100;
export const PLAYER_SPEED_VEHICLE = 300;
export const PLAYER_RADIUS        = 7;

export const ZOMBIE_SPEED_SLOW    = 32;
export const ZOMBIE_SPEED_NIGHT   = 55;
export const ZOMBIE_RADIUS        = 9;
export const ZOMBIE_SIGHT_RANGE   = 180;
export const ZOMBIE_SOUND_RANGE   = 280;
export const ZOMBIE_GIVE_UP_TIME  = 6.0;
export const ZOMBIE_ATTACK_RANGE  = 14;
export const ZOMBIE_ATTACK_DAMAGE = 8;
export const ZOMBIE_ATTACK_RATE   = 0.8;

// ─── Sound system ─────────────────────────────────────────────────────────────
export const SOUND_DRIFT_SPEED        = 18;
export const MAX_SOUND_DRIFT_RANGE    = 900;
export const HAMLET_AMBIENT_PULL      = 0.35;
export const VEHICLE_ENGINE_RANGE     = 500;
export const COMBAT_SOUND_RANGE       = 380;
export const TURRET_SOUND_RANGE       = 450;

export const SOUND_TTL = {
  combat:  1.5,
  engine:  0.0,
  turret:  3.0,
  ambient: 0.0,
};

// ─── Turret constants ─────────────────────────────────────────────────────────
export const TURRET_COST       = { scrap: 4, nails: 8 };
export const TURRET_HP         = 150;
export const TURRET_RANGE      = 200;
export const TURRET_DAMAGE     = 25;
export const TURRET_FIRE_RATE  = 1.5;
export const TURRET_REPAIR_RANGE = 50;
export const TURRET_REPAIR_HP  = 40;
export const TURRET_REPAIR_COST_SCRAP = 2;
export const TURRET_ZOMBIE_AGGRO_RANGE = 600;
export const TURRET_ZOMBIE_ATTACK_RANGE = 16;
export const TURRET_ZOMBIE_DAMAGE = 6;

export const PLAYER_MAX_HP        = 100;
export const PLAYER_HP_REGEN      = 0;
export const VEHICLE_MAX_HP       = 300;
export const VEHICLE_RADIUS       = 22;

// ─── Vehicle types ────────────────────────────────────────────────────────────
export const VEHICLE_TYPES = {
  car:           { hp: 300, speed: 300, fuel: 80,  seats: 2, noise: 0.9, zombieKill: false, label: "Car",          color: "rgba(200,200,180,0.9)",  damageColor: "rgba(255,120,40,0.85)",  width: 24, height: 44 },
  bike:          { hp: 120, speed: 360, fuel: 60,  seats: 1, noise: 0.5, zombieKill: false, label: "Bike",         color: "rgba(120,200,100,0.9)",   damageColor: "rgba(255,140,40,0.85)",  width: 14, height: 30 },
  minivan:       { hp: 420, speed: 240, fuel: 100, seats: 3, noise: 1.1, zombieKill: false, label: "Minivan",      color: "rgba(160,180,220,0.9)",   damageColor: "rgba(255,100,40,0.85)",  width: 30, height: 54 },
  monster_truck: { hp: 600, speed: 220, fuel: 120, seats: 2, noise: 1.3, zombieKill: true,  label: "Monster Truck",color: "rgba(220,100,60,0.95)",   damageColor: "rgba(255,60,20,0.95)",   width: 34, height: 52 },
};

// ─── Vehicle Upgrades ─────────────────────────────────────────────────────────
export const VEHICLE_UPGRADES = {
  plow: { name: "Plow", zombieKill: true, speed: -20, cost: { scrap: 15, nails: 8 } },
  armor: { name: "Armor", damageReduction: 0.3, speed: -15, cost: { scrap: 20, wood: 10 } },
  turbo: { name: "Turbo", speedBoost: 80, fuelDrain: 2.0, cost: { scrap: 25, car_parts: 3 } },
  roof_rack: { name: "Roof Rack", passengerSeats: 1, drag: 0.1, cost: { wood: 12, nails: 6 } },
  reinforced_glass: { name: "Reinforced Glass", zombieDamageReduction: 0.5, cost: { scrap: 8, nails: 4 } }
};

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
export const WEATHER_TYPES = {
  clear: { name: "Clear", visibility: 1.0, zombieSpeed: 1.0, playerSpeed: 1.0, colorTint: null, spawnBonus: 0, icon: "☀️" },
  rain: { name: "Rain", visibility: 0.75, zombieSpeed: 0.92, playerSpeed: 0.92, colorTint: "rgba(80,100,140,0.15)", spawnBonus: 0.15, icon: "🌧️" },
  fog: { name: "Fog", visibility: 0.45, zombieSpeed: 0.85, playerSpeed: 0.95, colorTint: "rgba(140,140,150,0.2)", spawnBonus: -0.1, icon: "🌫️" },
  storm: { name: "Storm", visibility: 0.55, zombieSpeed: 0.75, playerSpeed: 0.85, colorTint: "rgba(60,60,80,0.25)", spawnBonus: 0.3, icon: "⛈️" }
};

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
export const NIGHT_DIFFICULTY = {
  day1: { spawnRate: 0.8, zombieSpeed: 0.9, specialChance: 0 },
  day2: { spawnRate: 1.0, zombieSpeed: 1.0, specialChance: 0.05 },
  day3: { spawnRate: 1.3, zombieSpeed: 1.1, specialChance: 0.1 },
  day4: { spawnRate: 1.6, zombieSpeed: 1.2, specialChance: 0.15 },
  day5: { spawnRate: 2.0, zombieSpeed: 1.3, specialChance: 0.25 },
  day7: { spawnRate: 2.5, zombieSpeed: 1.4, specialChance: 0.35 },
  day10: { spawnRate: 3.0, zombieSpeed: 1.5, specialChance: 0.5 }
};

export function getNightDifficulty(dayNumber) {
  const tiers = Object.keys(NIGHT_DIFFICULTY).sort((a,b) => parseInt(a) - parseInt(b));
  let selected = NIGHT_DIFFICULTY.day1;
  for (const tier of tiers) {
    if (dayNumber >= parseInt(tier)) selected = NIGHT_DIFFICULTY[tier];
  }
  return selected;
}

// ─── Crop Variety ─────────────────────────────────────────────────────────────
export const CROP_GROW_TIME = { fast: 60 * 2, normal: 60 * 3 };
export const IN_GAME_DAY_SECS = 300;

export const CROP_TYPES = {
  potato: { growTime: CROP_GROW_TIME.fast, yield: 12, nutrition: 8, icon: "🥔", name: "Potato", season: "spring", seedsNeeded: 1 },
  corn: { growTime: CROP_GROW_TIME.normal, yield: 8, nutrition: 12, icon: "🌽", name: "Corn", season: "summer", seedsNeeded: 1 },
  wheat: { growTime: CROP_GROW_TIME.normal * 1.2, yield: 15, nutrition: 10, icon: "🌾", name: "Wheat", season: "fall", seedsNeeded: 1 },
  carrot: { growTime: CROP_GROW_TIME.fast * 0.8, yield: 10, nutrition: 6, icon: "🥕", name: "Carrot", season: "spring", seedsNeeded: 1 }
};

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

export const BARRICADE_COST_WOOD  = 2;
export const BARRICADE_COST_NAILS = 4;
export const BARRICADE_HP         = 120;
export const BARRICADE_ZOMBIE_DAMAGE = 6;

export const DOOR_MAX_HP         = 60;
export const DOOR_BASH_DAMAGE    = 4;
export const DOOR_BASH_RANGE     = 28;

export const SLEEP_QUALITY = {
  exposed:   0.3,
  inVehicle: 0.55,
  indoor:    0.8,
  secured:   1.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Vehicle placement validation ─────────────────────────────────────────────

export function isValidVehiclePosition(x, y, buildings, radius = VEHICLE_RADIUS) {
  // Check world bounds
  if (x - radius < 50 || x + radius > WORLD_W - 50 || y - radius < 50 || y + radius > WORLD_H - 50) {
    return false;
  }
  
  // Check collision with all buildings
  for (const b of buildings) {
    // Expand building bounds by vehicle radius + margin
    const margin = radius + 8;
    if (x + margin > b.x && x - margin < b.x + b.w && y + margin > b.y && y - margin < b.y + b.h) {
      return false;
    }
  }
  return true;
}

export function findSafeVehiclePosition(baseX, baseY, buildings, radius = VEHICLE_RADIUS, maxAttempts = 30, seed = null) {
  // Use a deterministic seed so P1 and P2 produce identical vehicle positions
  // when both call createInitialState with the same game seed.
  const deterministicSeed = seed ?? (Math.floor(baseX * 7 + baseY * 13) & 0x7fffffff);
  const rand = seededRand(deterministicSeed);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Spiral outward from base position
    const angle = rand() * Math.PI * 2;
    const distance = 60 + rand() * 150;
    const testX = baseX + Math.cos(angle) * distance;
    const testY = baseY + Math.sin(angle) * distance;
    
    if (isValidVehiclePosition(testX, testY, buildings, radius)) {
      return { x: testX, y: testY };
    }
  }
  
  // Fallback: try cardinal directions at increasing distances
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1]
  ];
  
  for (let dist = 80; dist <= 300; dist += 40) {
    for (const [dx, dy] of directions) {
      const testX = baseX + dx * dist;
      const testY = baseY + dy * dist;
      if (isValidVehiclePosition(testX, testY, buildings, radius)) {
        return { x: testX, y: testY };
      }
    }
  }
  
  // Ultimate fallback: return a position far away - caller will need to handle
  return { x: baseX + 200, y: baseY + 200 };
}

export function lerp(a, b, t) { return a + (b - a) * t; }

// ─── Door geometry ────────────────────────────────────────────────────────────

export function getBuildingWallSegments(building) {
  const { x, y, w, h, doors } = building;
  const segs = [];

  const sides = ["north", "south", "west", "east"];
  for (const side of sides) {
    const len = (side === "north" || side === "south") ? w : h;
    const doorSpans = (doors || [])
      .filter(d => d.side === side && (d.open || d.broken))
      .map(d => {
        const center = len * d.offset;
        const hw = d.width / 2;
        return [Math.max(0, center - hw), Math.min(len, center + hw)];
      })
      .sort((a, b) => a[0] - b[0]);

    let cursor = 0;
    for (const [s, e] of doorSpans) {
      if (cursor < s) segs.push(makeSeg(building, side, cursor, s));
      cursor = e;
    }
    if (cursor < len) segs.push(makeSeg(building, side, cursor, len));
  }
  return segs;
}

function makeSeg(building, side, from, to) {
  const { x, y, w, h } = building;
  switch (side) {
    case "north": return { x1: x + from, y1: y,     x2: x + to, y2: y };
    case "south": return { x1: x + from, y1: y + h, x2: x + to, y2: y + h };
    case "west":  return { x1: x,       y1: y + from, x2: x,       y2: y + to };
    case "east":  return { x1: x + w,   y1: y + from, x2: x + w,   y2: y + to };
    default: return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }
}

function closestPointOnSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

function resolveSegCollision(entity, seg, radius, pushStrength = 1.0) {
  const r = radius ?? PLAYER_RADIUS;
  const cp = closestPointOnSeg(entity.x, entity.y, seg.x1, seg.y1, seg.x2, seg.y2);
  let dx = entity.x - cp.x;
  let dy = entity.y - cp.y;
  let d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) { dx = 0; dy = -1; d = 0.001; }
  if (d < r) {
    // Soft push - don't overshoot
    const push = Math.min((r - d) * pushStrength, 8);
    entity.x += (dx / d) * push;
    entity.y += (dy / d) * push;
    return true;
  }
  return false;
}


export function resolveWallCollision(entity, building) {
  const r = entity.radius ?? PLAYER_RADIUS;
  const { x, y, w, h } = building;
  
  // Quick bounds check with a larger margin
  if (entity.x + r < x - 8 || entity.x - r > x + w + 8) return false;
  if (entity.y + r < y - 8 || entity.y - r > y + h + 8) return false;

  const segs = getBuildingWallSegments(building);
  let anyCollision = false;
  
  // Multiple passes with diminishing returns
  for (let pass = 0; pass < 4; pass++) {
    let collided = false;
    // Use diminishing push strength on later passes to prevent overshoot
    const strength = pass === 0 ? 1.0 : 0.4;
    for (const seg of segs) {
      if (resolveSegCollision(entity, seg, r, strength)) {
        collided = true;
        anyCollision = true;
      }
    }
    if (!collided) break;
  }
  
  // Apply world bounds after collision
  entity.x = Math.max(r, Math.min(WORLD_W - r, entity.x));
  entity.y = Math.max(r, Math.min(WORLD_H - r, entity.y));
  
  return anyCollision;
}

export function isInsideBuilding(entity, building) {
  const { x, y, w, h } = building;
  return entity.x > x && entity.x < x + w && entity.y > y && entity.y < y + h;
}

export function getDoorCenter(building, door) {
  const { x, y, w, h } = building;
  const len = (door.side === "north" || door.side === "south") ? w : h;
  const pos = len * door.offset;
  switch (door.side) {
    case "north": return { x: x + pos, y: y };
    case "south": return { x: x + pos, y: y + h };
    case "west":  return { x: x,       y: y + pos };
    case "east":  return { x: x + w,   y: y + pos };
    default:      return { x: x + w / 2, y: y + h / 2 };
  }
}

export function isNearDoor(entity, building, range = 36) {
  if (!building.doors) return false;
  return building.doors.some(door => {
    const c = getDoorCenter(building, door);
    return dist(entity.x, entity.y, c.x, c.y) < range;
  });
}

// ─── Loot pile ────────────────────────────────────────────────────────────────

export function createLootPile(buildingId, items, x, y) {
  return {
    id:         `loot_${buildingId}_${Math.floor(Math.random() * 99999)}`,
    buildingId,
    items,
    x, y,
    collected:  false,
  };
}

// ─── Vehicle repair ───────────────────────────────────────────────────────────

export const REPAIR_RANGE    = 50;
export const REPAIR_HP_GAIN  = 40;

export function tryRepairVehicle(player, vehicle) {
  if (player.inVehicle) return null;
  if (dist(player.x, player.y, vehicle.x, vehicle.y) > REPAIR_RANGE) return null;
  if (getInventoryCount(player.inventory, "car_parts") < 1) return { fail: "no_parts" };
  if (vehicle.hp >= vehicle.maxHp) return { fail: "full_hp" };

  removeFromInventory(player.inventory, "car_parts", 1);
  vehicle.hp = Math.min(vehicle.maxHp, vehicle.hp + REPAIR_HP_GAIN);
  return { success: true, hp: vehicle.hp };
}

// ─── Level 1 map ─────────────────────────────────────────────────────────────

export function createLevel1Map() {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  const B = (ox, oy, bw, bh, opts) => ({
    x: cx + ox - bw / 2,
    y: cy + oy - bh / 2,
    w: bw, h: bh,
    barricadeHp: 0,
    hp: 100, maxHp: 100,
    searched: false,
    ...opts,
  });

  const buildings = [
    {
      ...B(-520, 200, 220, 150, {}),
      id: "barn", type: "barn", label: "Barn",
      description: "Hay, tools, wood scraps. Your starting shelter.",
      doors: [
        { id: "barn_s1", side: "south", offset: 0.32, width: 32, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: "barn_s2", side: "south", offset: 0.68, width: 32, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "wood",  qty: 6 },
        { type: "food",  qty: 10 },
        { type: "tools", qty: 1 },
        { type: "scrap", qty: 8 },
        { type: "nails", qty: 12 },
      ],
      barricadeable: true,
    },
    {
      ...B(60, -480, 170, 230, {}),
      id: "church", type: "church", label: "Church",
      description: "Dark inside. Something useful in the back.",
      doors: [
        { id: "church_s", side: "south", offset: 0.5,  width: 34, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: "church_n", side: "north", offset: 0.5,  width: 22, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "bat",   qty: 1 },
        { type: "food",  qty: 5 },
        { type: "nails", qty: 8 },
      ],
      barricadeable: true,
      zombieGuards: 4,
    },
    {
      ...B(460, 140, 230, 180, {}),
      id: "farmhouse", type: "farmhouse", label: "Farmhouse",
      description: "A bed, a well out back, canned food in the kitchen.",
      doors: [
        { id: "farm_w", side: "west", offset: 0.5,  width: 30, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: "farm_e", side: "east", offset: 0.65, width: 26, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "food",  qty: 18 },
        { type: "water", qty: 20 },
        { type: "wood",  qty: 3 },
        { type: "nails", qty: 6 },
        { type: "seeds", qty: 2 },
      ],
      barricadeable: true, barricadeDoors: 2,
      hasBed: true, hasWell: true,
    },
    {
      ...B(-440, -160, 150, 110, {}),
      id: "mechanic_shed", type: "shed", label: "Mechanic Shed",
      description: "Wood, nails, car parts.",
      doors: [
        { id: "shed_e", side: "east", offset: 0.5, width: 28, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "wood",      qty: 10 },
        { type: "nails",     qty: 18 },
        { type: "car_parts", qty: 2 },
        { type: "tools",     qty: 1 },
      ],
      barricadeable: false,
    },
    {
      ...B(-280, -420, 170, 150, {}),
      id: "house_1", type: "house", label: "House",
      description: "Someone used to live here.",
      doors: [
        { id: "h1_s", side: "south", offset: 0.4, width: 28, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: "h1_e", side: "east",  offset: 0.5, width: 24, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "food",  qty: 12 },
        { type: "tools", qty: 1 },
        { type: "wood",  qty: 2 },
      ],
      barricadeable: true,
    },
    {
      ...B(500, -380, 170, 150, {}),
      id: "house_2", type: "house", label: "House",
      description: "A noise from upstairs.",
      doors: [
        { id: "h2_s", side: "south", offset: 0.35, width: 28, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: "h2_w", side: "west",  offset: 0.5,  width: 24, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "food",  qty: 8 },
        { type: "water", qty: 10 },
        { type: "nails", qty: 4 },
      ],
      barricadeable: true, hiddenSurvivor: true,
    },
    {
      ...B(880, 480, 160, 140, {}),
      id: "cabin", type: "cabin", label: "Isolated Cabin",
      description: "Off the beaten path. Worth the detour.",
      doors: [
        { id: "cabin_w", side: "west",  offset: 0.5,  width: 26, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: "cabin_n", side: "north", offset: 0.55, width: 22, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "food",        qty: 15 },
        { type: "car_parts",   qty: 3 },
        { type: "tools",       qty: 2 },
        { type: "map_fragment", qty: 1 },
      ],
      barricadeable: true, zombieGuards: 2,
    },
    {
      ...B(700, -60, 190, 130, {}),
      id: "gas_station", type: "shed", label: "Gas Station",
      description: "Fuel cans and snacks.",
      doors: [
        { id: "gas_w", side: "west", offset: 0.5, width: 34, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot: [
        { type: "fuel",  qty: 3 },
        { type: "food",  qty: 6 },
        { type: "water", qty: 4 },
      ],
      barricadeable: false, zombieGuards: 3,
    },
  ];

  const roads = [
    { x1: cx - 700, y1: cy - 580, x2: cx + 900, y2: cy - 580 },
    { x1: cx + 900, y1: cy - 580, x2: cx + 900, y2: cy + 600 },
    { x1: cx + 900, y1: cy + 600, x2: cx - 700, y2: cy + 600 },
    { x1: cx - 700, y1: cy + 600, x2: cx - 700, y2: cy - 580 },
    { x1: cx - 700, y1: cy,       x2: cx + 900, y2: cy },
    { x1: cx + 100, y1: cy - 580, x2: cx + 100, y2: cy + 600 },
    { x1: cx + 100, y1: cy - 580, x2: cx + 100, y2: cy - 900 },
    { x1: cx + 900, y1: cy + 480, x2: cx + 880, y2: cy + 480 },
  ];

  const farmhouseB = buildings.find(b => b.id === "farmhouse");
  const gardenPlots = [{
    id: "plot_farmhouse",
    x: farmhouseB.x + farmhouseB.w + 20,
    y: farmhouseB.y + farmhouseB.h * 0.2,
    w: 80, h: 70,
    crop: null, growTimer: 0,
  }];

  const plotRef = gardenPlots[0];
  const wells = [{
    id: "well_farmhouse",
    x: plotRef.x + plotRef.w / 2,
    y: plotRef.y + plotRef.h + 28,
    radius: 10,
  }];

  buildings.forEach(b => {
    if (!b.doors) return;
    b.doors.forEach(d => {
      d.hp    = DOOR_MAX_HP;
      d.broken = false;
    });
  });

  const lootPiles = buildings.map(b => {
    const lx = b.x + b.w * 0.5 + (Math.random() - 0.5) * b.w * 0.3;
    const ly = b.y + b.h * 0.5 + (Math.random() - 0.5) * b.h * 0.3;
    return createLootPile(b.id, b.loot, lx, ly);
  });

  const barnB = buildings.find(b => b.id === "barn");
const bikeSafePos = findSafeVehiclePosition(barnB.x + barnB.w / 2, barnB.y + barnB.h, buildings, VEHICLE_RADIUS, 15, 0x4444);
const extraVehicles = [createVehicle(bikeSafePos.x, bikeSafePos.y, "bike")];

  return { buildings, roads, gardenPlots, lootPiles, wells, extraVehicles };
}

// ─── Procedural open world map ────────────────────────────────────────────────

const SETTLEMENT_NAMES = [
  "Millbrook", "Ashford", "Crestview", "Dunmore",
  "Harlow", "Iverton", "Janesburg", "Kellwick",
];

const SURVIVOR_NAMES = [
  "Maya", "Rico", "Dana", "Sam", "Eli", "Priya",
  "Torres", "Vance", "Zoe", "Kenji",
];

const SURVIVOR_ROLES = ["mechanic", "farmer", "scout", "medic"];

export function generateSettlementPositions(seed) {
  const rand = seededRand(seed ^ 0xC0FFEE);
  const MARGIN  = 2000;
  const MIN_SEP = 2400;
  const COUNT   = Math.floor(6 + rand() * 3);

  const positions = [];
  let attempts = 0;
  while (positions.length < COUNT && attempts < 1000) {
    attempts++;
    const cx = MARGIN + rand() * (WORLD_W - MARGIN * 2);
    const cy = MARGIN + rand() * (WORLD_H - MARGIN * 2);
    const ok = positions.every(p => dist(p.cx, p.cy, cx, cy) >= MIN_SEP);
    if (ok) positions.push({ cx, cy });
  }
  return positions;
}

function buildSettlement(sid, cx, cy, rand, isStart, isLast, prevSettlementId, nextSettlementId) {
  const BUILDING_TYPES = ["house", "shed", "barn", "cabin", "farmhouse"];
  const TYPE_SIZES = {
    house:      [160, 140],
    shed:       [130, 100],
    barn:       [220, 150],
    cabin:      [150, 130],
    farmhouse:  [190, 160],
  };

  function makeLoot() {
    const loot = [
      { type: "food",  qty: Math.ceil(8  + rand() * 12) },
      { type: "water", qty: Math.ceil(6  + rand() * 10) },
      { type: "nails", qty: Math.ceil(5  + rand() * 10) },
    ];
    if (rand() > 0.5) loot.push({ type: "wood",      qty: Math.ceil(3 + rand() * 8) });
    if (rand() > 0.6) loot.push({ type: "car_parts", qty: Math.ceil(1 + rand() * 2) });
    if (rand() > 0.7) loot.push({ type: "tools",     qty: 1 });
    if (rand() > 0.7) loot.push({ type: "bat",       qty: 1 });
    if (rand() > 0.5) loot.push({ type: "scrap",     qty: Math.ceil(2 + rand() * 6) });
    if (rand() > 0.8) loot.push({ type: "seeds",     qty: Math.ceil(1 + rand() * 3) });
    return loot;
  }

  const buildings = [];
  const lootPiles = [];
  const wells = [];
  let gardenPlot = null;

  const numB = Math.floor(3 + rand() * 4);
  const placed = [];
  function overlaps(bx, by, bw, bh) {
    return placed.some(p =>
      Math.abs(p.cx - (bx + bw/2)) < (p.hw + bw/2 + 40) &&
      Math.abs(p.cy - (by + bh/2)) < (p.hh + bh/2 + 40)
    );
  }

  for (let i = 0; i < numB; i++) {
    const btype = BUILDING_TYPES[Math.floor(rand() * BUILDING_TYPES.length)];
    const [bw, bh] = TYPE_SIZES[btype];
    let bx, by;
    let tries = 0;
    do {
      const angle = rand() * Math.PI * 2;
      const r = 120 + rand() * 480;
      bx = cx + Math.cos(angle) * r - bw / 2;
      by = cy + Math.sin(angle) * r - bh / 2;
      bx = Math.max(100, Math.min(WORLD_W - bw - 100, bx));
      by = Math.max(100, Math.min(WORLD_H - bh - 100, by));
      tries++;
    } while (overlaps(bx, by, bw, bh) && tries < 20);

    placed.push({ cx: bx + bw/2, cy: by + bh/2, hw: bw/2, hh: bh/2 });

    const bid = `s${sid}_b${i}`;
    const sides = ["north", "south", "east", "west"];
    const doorSide = sides[Math.floor(rand() * sides.length)];

    const isFragmentBuilding = (isStart && i === 0) || (!isStart && i === numB - 1);
    const loot = makeLoot();
    if (isFragmentBuilding && nextSettlementId !== null) {
      loot.push({ type: "map_fragment", qty: 1, nextSettlementId, bearing: 0 });
    }
    if (isLast && i === Math.floor(numB / 2)) {
      loot.push({ type: "map_fragment", qty: 1, nextSettlementId: "exit", bearing: 0 });
    }

    const b = {
      id: bid,
      type: btype,
      label: btype.charAt(0).toUpperCase() + btype.slice(1),
      settlementId: sid,
      x: bx, y: by, w: bw, h: bh,
      barricadeHp: 0, hp: 100, maxHp: 100, searched: false,
      description: `A ${btype} in settlement ${sid}.`,
      doors: [
        { id: `${bid}_d1`, side: doorSide, offset: 0.45 + rand() * 0.1, width: 28, open: false, hp: DOOR_MAX_HP, broken: false },
        ...(rand() > 0.5
          ? [{ id: `${bid}_d2`, side: doorSide === "north" ? "south" : doorSide === "south" ? "north" : doorSide === "east" ? "west" : "east", offset: 0.5, width: 24, open: false, hp: DOOR_MAX_HP, broken: false }]
          : []),
      ],
      loot,
      barricadeable: rand() > 0.35,
      zombieGuards: isFragmentBuilding ? Math.ceil(3 + rand() * 4) : (rand() > 0.5 ? Math.ceil(1 + rand() * 3) : 0),
      isFragmentBuilding,
    };
    buildings.push(b);

    const lx = bx + bw * (0.25 + rand() * 0.5);
    const ly = by + bh * (0.25 + rand() * 0.5);
    lootPiles.push(createLootPile(bid, loot, lx, ly));
  }

  wells.push({
    id: `well_s${sid}`,
    x: cx + (rand() - 0.5) * 200,
    y: cy + (rand() - 0.5) * 200,
    radius: 10,
  });

  const farmB = buildings.find(b => b.type === "farmhouse") ?? buildings[0];
  if (farmB) {
    gardenPlot = {
      id: `plot_s${sid}`,
      x: farmB.x + farmB.w + 20,
      y: farmB.y + farmB.h * 0.15,
      w: 80, h: 70,
      crop: null, growTimer: 0,
    };
  }

  const numSurvivors = Math.floor(1 + rand() * 3);
  const survivors = [];
  for (let i = 0; i < numSurvivors; i++) {
    const hb = buildings[Math.floor(rand() * buildings.length)];
    const name = SURVIVOR_NAMES[Math.floor(rand() * SURVIVOR_NAMES.length)];
    const role = SURVIVOR_ROLES[Math.floor(rand() * SURVIVOR_ROLES.length)];
    hb.hiddenSurvivor = true;
    survivors.push({ buildingId: hb.id, name, role,
      x: hb.x + hb.w * 0.5, y: hb.y + hb.h * 0.5 });
  }

  const vehicleTypes = ["car", "bike", "minivan", "monster_truck"];
const vtype = vehicleTypes[Math.floor(rand() * vehicleTypes.length)];
const vb = buildings[Math.floor(rand() * buildings.length)];
const settlementCenter = { x: cx, y: cy };

// Use a seed derived from settlement id and position so P1/P2 agree on placement.
const safePos = findSafeVehiclePosition(settlementCenter.x, settlementCenter.y, buildings, VEHICLE_RADIUS, 40, sid * 12345 + 0x3333);

const vehicle = createVehicle(
  Math.max(50, Math.min(WORLD_W - 50, safePos.x)),
  Math.max(50, Math.min(WORLD_H - 50, safePos.y)),
  vtype
);
vehicle.id = `v_s${sid}`;

  const roads = [];
  for (let i = 1; i < buildings.length; i++) {
    const a = buildings[i - 1];
    const b = buildings[i];
    roads.push({
      x1: a.x + a.w / 2, y1: a.y + a.h / 2,
      x2: b.x + b.w / 2, y2: b.y + b.h / 2,
    });
  }

  return { buildings, lootPiles, wells, gardenPlot, survivors, vehicle, roads };
}

function buildInterSettlementRoads(positions) {
  const roads = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i];
    const b = positions[i + 1];
    const mx = (a.cx + b.cx) / 2 + (Math.random() - 0.5) * 400;
    const my = (a.cy + b.cy) / 2 + (Math.random() - 0.5) * 400;
    roads.push(
      { x1: a.cx, y1: a.cy, x2: mx, y2: my },
      { x1: mx,   y1: my,   x2: b.cx, y2: b.cy },
    );
  }
  return roads;
}

export function createOpenWorldMap(seed) {
  const rand = seededRand(seed ^ 0xDEAD);
  const positions = generateSettlementPositions(seed);
  const N = positions.length;

  const allBuildings   = [];
  const allLootPiles   = [];
  const allWells       = [];
  const allGardenPlots = [];
  const allVehicles    = [];
  const allRoads       = [];
  const settlementData = [];

  for (let i = 0; i < N; i++) {
    const { cx, cy } = positions[i];
    const sid        = i;
    const isStart    = i === 0;
    const isLast     = i === N - 1;
    const nextId     = isLast ? null : i + 1;

    const result = buildSettlement(sid, cx, cy, rand, isStart, isLast, isStart ? null : i - 1, nextId);

    allBuildings.push(...result.buildings);
    allLootPiles.push(...result.lootPiles);
    allWells.push(...result.wells);
    if (result.gardenPlot) allGardenPlots.push(result.gardenPlot);
    allVehicles.push(result.vehicle);
    allRoads.push(...result.roads);

    settlementData.push({
      id: sid,
      name: SETTLEMENT_NAMES[i % SETTLEMENT_NAMES.length],
      cx, cy,
      cleared: false,
      survivorDefs: result.survivors,
    });
  }

  allRoads.push(...buildInterSettlementRoads(positions));

  return {
    buildings:      allBuildings,
    lootPiles:      allLootPiles,
    wells:          allWells,
    gardenPlots:    allGardenPlots,
    roads:          allRoads,
    extraVehicles:  allVehicles,
    settlements:    settlementData,
  };
}

// ─── Zombie spawn points ──────────────────────────────────────────────────────

export function getLevel1ZombieSpawns(seed) {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const rand = seededRand(seed);

  const zombies = [];
  let id = 1;

  const innerRingCount = 60;
  for (let i = 0; i < innerRingCount; i++) {
    const angle = (i / innerRingCount) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    const r     = 220 + rand() * 280;
    zombies.push(createZombie(id++,
      cx + Math.cos(angle) * r + (rand() - 0.5) * 60,
      cy + Math.sin(angle) * r + (rand() - 0.5) * 60,
    ));
  }

  const outerRingCount = 90;
  for (let i = 0; i < outerRingCount; i++) {
    const angle = (i / outerRingCount) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const r     = 500 + rand() * 500;
    zombies.push(createZombie(id++,
      cx + Math.cos(angle) * r + (rand() - 0.5) * 120,
      cy + Math.sin(angle) * r + (rand() - 0.5) * 120,
    ));
  }

  const roamerCount = 80;
  for (let i = 0; i < roamerCount; i++) {
    const angle = rand() * Math.PI * 2;
    const r     = 1000 + rand() * 1500;
    const zx = Math.max(50, Math.min(WORLD_W - 50, cx + Math.cos(angle) * r));
    const zy = Math.max(50, Math.min(WORLD_H - 50, cy + Math.sin(angle) * r));
    zombies.push(createZombie(id++, zx, zy));
  }

  const guardClusters = [
    { x: cx - 100, y: cy - 700,  count: 6 },
    { x: cx + 400, y: cy - 720,  count: 4 },
    { x: cx + 100, y: cy - 260,  count: 5 },
    { x: cx - 20,  y: cy - 530,  count: 5 },
    { x: cx + 850, y: cy + 400,  count: 4 },
    { x: cx + 680, y: cy - 80,   count: 6 },
    { x: cx - 600, y: cy + 160,  count: 3 },
    { x: cx + 720, y: cy - 280,  count: 4 },
    { x: cx - 440, y: cy - 160,  count: 5 },
    { x: cx + 460, y: cy + 140,  count: 4 },
  ];

  guardClusters.forEach(c => {
    for (let i = 0; i < c.count; i++) {
      zombies.push(createZombie(id++,
        c.x + (rand() - 0.5) * 100,
        c.y + (rand() - 0.5) * 100,
      ));
    }
  });

  return zombies;
}

// ─── Awakening ring ───────────────────────────────────────────────────────────

export const AWAKENING_COUNT  = 55;
export const AWAKENING_INNER  = 130;
export const AWAKENING_OUTER  = 260;

export function createAwakeningRing(playerX, playerY, seed) {
  const rand = seededRand(seed ^ 0xA4A1E0);
  const zombies = [];
  for (let i = 0; i < AWAKENING_COUNT; i++) {
    const angle = (i / AWAKENING_COUNT) * Math.PI * 2 + rand() * 0.22;
    const r     = AWAKENING_INNER + rand() * (AWAKENING_OUTER - AWAKENING_INNER);
    const x     = Math.max(50, Math.min(WORLD_W - 50, playerX + Math.cos(angle) * r));
    const y     = Math.max(50, Math.min(WORLD_H - 50, playerY + Math.sin(angle) * r));
    const z = createZombie(80000 + i, x, y, rand() > 0.88 ? "brute" : "walker");
    z.state = "dormant";
    zombies.push(z);
  }
  return zombies;
}

export function activateAwakeningRing(zombies, playerX, playerY) {
  let activated = 0;
  for (const z of zombies) {
    if (z.state !== "dormant") continue;
    z.state = "chase";
    z.targetX = playerX;
    z.targetY = playerY;
    z.alertTimer = ZOMBIE_GIVE_UP_TIME;
    activated++;
  }
  return activated;
}

// ─── Sound source helpers ─────────────────────────────────────────────────────

export function createSoundEvent(type, x, y, radius, strength) {
  return { type, x, y, radius, strength, age: 0, ttl: SOUND_TTL[type] ?? 2.0 };
}

export function updateSoundEvents(soundEvents, dt) {
  for (let i = soundEvents.length - 1; i >= 0; i--) {
    soundEvents[i].age += dt;
    if (soundEvents[i].age >= soundEvents[i].ttl) soundEvents.splice(i, 1);
  }
}

export function getSoundPull(zx, zy, soundEvents, hamletCx, hamletCy, level) {
  let pullX = 0, pullY = 0;

  if (level === 1) {
    const dHamlet = dist(zx, zy, hamletCx, hamletCy);
    if (dHamlet < MAX_SOUND_DRIFT_RANGE && dHamlet > 1) {
      const falloff = 1 - (dHamlet / MAX_SOUND_DRIFT_RANGE);
      const strength = HAMLET_AMBIENT_PULL * falloff * falloff;
      pullX += ((hamletCx - zx) / dHamlet) * strength;
      pullY += ((hamletCy - zy) / dHamlet) * strength;
    }
  }

  for (const ev of soundEvents) {
    const d = dist(zx, zy, ev.x, ev.y);
    if (d > ev.radius || d < 1) continue;
    const falloff = 1 - (d / ev.radius);
    const s = ev.strength * falloff;
    pullX += ((ev.x - zx) / d) * s;
    pullY += ((ev.y - zy) / d) * s;
  }

  const mag = Math.sqrt(pullX * pullX + pullY * pullY);
  if (mag < 0.001) return { dx: 0, dy: 0, mag: 0 };
  const capped = Math.min(mag, 1);
  return { dx: (pullX / mag) * capped, dy: (pullY / mag) * capped, mag: capped };
}

// ─── Open-world zombie spawner ────────────────────────────────────────────────

export function getOpenWorldZombieSpawns(seed, settlements) {
  const rand = seededRand(seed ^ 0xdeadbeef);
  const zombies = [];
  let id = 2000;

  const CELL = 2000;
  const COLS = Math.ceil(WORLD_W / CELL);
  const ROWS = Math.ceil(WORLD_H / CELL);
  const SETTLE_CLEAR_R = 1200;

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cellCx = col * CELL + CELL / 2;
      const cellCy = row * CELL + CELL / 2;

      const nearSettlement = settlements.some(s =>
        dist(s.cx, s.cy, cellCx, cellCy) < SETTLE_CLEAR_R
      );
      if (nearSettlement) continue;

      const count = Math.floor(15 + rand() * 11);
      for (let i = 0; i < count; i++) {
        const zx = col * CELL + rand() * CELL;
        const zy = row * CELL + rand() * CELL;
        const zxC = Math.max(50, Math.min(WORLD_W - 50, zx));
        const zyC = Math.max(50, Math.min(WORLD_H - 50, zy));
        const type = rand() > 0.9 ? "brute" : "walker";
        zombies.push(createZombie(id++, zxC, zyC, type));
      }
    }
  }

  return zombies;
}

// ─── Entity constructors ──────────────────────────────────────────────────────

export function createPlayer(x, y) {
  return {
    x, y,
    hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
    food: 100, water: 100, sleep: 100,
    inventory: {},
    inVehicle: false, isSleeping: false, sleepLocation: null,
    weapon: null, debuffs: [], facing: 0, attackCooldown: 0,
    radius: PLAYER_RADIUS,
    deathRecap: new DeathRecap(),
  };
}

let _vehicleIdCounter = 1;
export function createVehicle(x, y, type = "car") {
  const cfg = VEHICLE_TYPES[type] ?? VEHICLE_TYPES.car;
  return {
    id: `v_${_vehicleIdCounter++}`,
    x, y,
    hp: cfg.hp, maxHp: cfg.hp,
    fuel: cfg.fuel, maxFuel: cfg.fuel,
    speed: cfg.speed,
    facing: 0,
    occupied: false,
    driver: null,
    passenger: null,
    upgrades: [],
    radius: VEHICLE_RADIUS,
    vehicleType: type,
    seats: cfg.seats,
    noise: cfg.noise,
    zombieKill: cfg.zombieKill,
  };
}

export function createZombie(id, x, y, type = "walker") {
  if (type === "runner") {
    return {
      id, x, y, type: "runner",
      hp: 20, maxHp: 20,
      radius: ZOMBIE_RADIUS * 0.8, speed: ZOMBIE_SPEED_NIGHT * 1.3,
      state: "wander", alertTimer: 0, giveUpTimer: 0,
      targetX: x, targetY: y,
      wanderTimer: 2 + Math.random() * 3,
      attackCooldown: 0, dead: false,
    };
  }
  return {
    id, x, y, type,
    hp: type === "brute" ? 60 : 30,
    maxHp: type === "brute" ? 60 : 30,
    radius: ZOMBIE_RADIUS, speed: ZOMBIE_SPEED_SLOW,
    state: "wander", alertTimer: 0, giveUpTimer: 0,
    targetX: x, targetY: y,
    wanderTimer: 2 + Math.random() * 3,
    attackCooldown: 0, dead: false,
  };
}

export const BOSS_HP       = 500;
export const BOSS_RADIUS   = 22;
export const BOSS_SPEED    = 24;
export const BOSS_DAMAGE   = 22;
export const BOSS_ATTACK_RATE = 0.6;

export function createBossZombie(id, x, y) {
  return {
    id, x, y, type: "boss",
    hp: BOSS_HP, maxHp: BOSS_HP,
    radius: BOSS_RADIUS, speed: BOSS_SPEED,
    state: "wander", alertTimer: 0, giveUpTimer: 0,
    targetX: x, targetY: y,
    wanderTimer: 2 + Math.random() * 3,
    attackCooldown: 0, dead: false,
    _neverGiveUp: true,
  };
}

export function createSurvivor(id, x, y, name, role) {
  return {
    id, x, y, name, role,
    hp: 80, maxHp: 80,
    status: "found",
    morale: 100,
    radius: 7,
    facing: 0,
    command: "follow",
    assignedTo: null,
    priority: "safety_first",
    state: "idle",
    fleeHp: 25,
    barricaded: false,
    barricadeBuilding: null,
    _castTimer: 0,
    _castType: null,
    _attackCd: 0,
    _wanderTimer: 0,
    _wanderTargetX: x,
    _wanderTargetY: y,
  };
}

export function createCrop(plotId, type, x, y) {
  const cropDef = CROP_TYPES[type] ?? CROP_TYPES.potato;
  const growTime = cropDef.growTime;
  return {
    id: `crop_${plotId}_${Date.now()}`, plotId, type, x, y,
    growTimer: 0, growTime, stage: "planted",
    cropDef,
  };
}

// ─── Game state ───────────────────────────────────────────────────────────────

export function createInitialState(seed = Date.now(), level = 1) {
  const {
    buildings, roads, gardenPlots, lootPiles, wells, extraVehicles, settlements,
  } = createOpenWorldMap(seed);

  const startSettlement = settlements[0];
// Find a safe spawn position outside any building
let spawnX = startSettlement.cx;
let spawnY = startSettlement.cy + 180;

// Helper to check if a position is inside any building
function isInsideAnyBuilding(x, y, buildings, radius = PLAYER_RADIUS) {
  for (const b of buildings) {
    // Check if player would be inside building bounds
    if (x + radius > b.x && x - radius < b.x + b.w && 
        y + radius > b.y && y - radius < b.y + b.h) {
      // Also check if there's an open door nearby that could serve as exit
      const hasOpenDoorNearby = (b.doors || []).some(door => {
        if (!door.open && !door.broken) return false;
        const dc = getDoorCenter(b, door);
        return dist(x, y, dc.x, dc.y) < 60;
      });
      // If no open door, this is a trapped spawn
      if (!hasOpenDoorNearby) return true;
    }
  }
  return false;
}

// Try to find a safe spawn point near the settlement center
let safeSpawnFound = false;
const spawnAttempts = [
  { dx: 0, dy: 180 },    // south
  { dx: 180, dy: 0 },    // east
  { dx: -180, dy: 0 },   // west
  { dx: 0, dy: -180 },   // north
  { dx: 120, dy: 120 },  // southeast
  { dx: -120, dy: 120 }, // southwest
  { dx: 120, dy: -120 }, // northeast
  { dx: -120, dy: -120 },// northwest
  { dx: 0, dy: 240 },    // further south
  { dx: 240, dy: 0 },    // further east
  { dx: -240, dy: 0 },   // further west
  { dx: 300, dy: 300 },  // far corner
  { dx: -300, dy: 300 },
  { dx: 300, dy: -300 },
  { dx: -300, dy: -300 },
];

for (const attempt of spawnAttempts) {
  const testX = startSettlement.cx + attempt.dx;
  const testY = startSettlement.cy + attempt.dy;
  
  // Bounds check
  if (testX < 100 || testX > WORLD_W - 100 || testY < 100 || testY > WORLD_H - 100) {
    continue;
  }
  
  if (!isInsideAnyBuilding(testX, testY, buildings)) {
    spawnX = testX;
    spawnY = testY;
    safeSpawnFound = true;
    break;
  }
}

// If still inside a building, try a radial spiral search
if (!safeSpawnFound) {
  for (let radius = 100; radius <= 600; radius += 50) {
    let found = false;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const testX = startSettlement.cx + Math.cos(angle) * radius;
      const testY = startSettlement.cy + Math.sin(angle) * radius;
      
      if (testX < 50 || testX > WORLD_W - 50 || testY < 50 || testY > WORLD_H - 50) {
        continue;
      }
      
      if (!isInsideAnyBuilding(testX, testY, buildings)) {
        spawnX = testX;
        spawnY = testY;
        safeSpawnFound = true;
        found = true;
        break;
      }
    }
    if (found) break;
  }
}

// Ultimate fallback: place player in the center of the first non-building area
if (!safeSpawnFound) {
  // Find the first building and place player near its exterior
  const firstBuilding = buildings[0];
  if (firstBuilding) {
    // Place south of the building
    spawnX = firstBuilding.x + firstBuilding.w / 2;
    spawnY = firstBuilding.y + firstBuilding.h + 50;
  }
  // Clamp to world bounds
  spawnX = Math.max(PLAYER_RADIUS + 10, Math.min(WORLD_W - PLAYER_RADIUS - 10, spawnX));
  spawnY = Math.max(PLAYER_RADIUS + 10, Math.min(WORLD_H - PLAYER_RADIUS - 10, spawnY));

  const player = createPlayer(spawnX, spawnY);
}



// Use safe vehicle placement for starting vehicles.
// Pass deterministic seeds derived from the game seed so P1 and P2 land
// vehicles at the same positions when both build state from the same seed.
const mainSafePos = findSafeVehiclePosition(spawnX, spawnY, buildings, VEHICLE_RADIUS, 20, seed ^ 0x1111);
const mainVehicle = createVehicle(mainSafePos.x, mainSafePos.y, "car");

const beaconSafePos = findSafeVehiclePosition(spawnX, spawnY + 80, buildings, VEHICLE_RADIUS, 20, seed ^ 0x2222);
const beaconVehicle = createVehicle(beaconSafePos.x, beaconSafePos.y, "car");
beaconVehicle.id = "beacon_car";
beaconVehicle.isBeacon = true;

const vehicles = [mainVehicle, beaconVehicle, ...extraVehicles];

  const rand = seededRand(seed ^ 0xABCD);
  const zombies = getOpenWorldZombieSpawns(seed, settlements);
  let zid = 1;
  for (const b of buildings) {
    const guards = b.zombieGuards ?? 0;
    for (let i = 0; i < guards; i++) {
      const gx = b.x + b.w * 0.5 + (rand() - 0.5) * b.w * 1.2;
      const gy = b.y + b.h * 0.5 + (rand() - 0.5) * b.h * 1.2;
      zombies.push(createZombie(9000 + zid++, gx, gy, rand() > 0.85 ? "brute" : "walker"));
    }
  }

  const awakeningZombies = createAwakeningRing(spawnX, spawnY, seed);
  zombies.push(...awakeningZombies);

  const firstFragBuilding = buildings.find(b => b.settlementId === 0 && b.isFragmentBuilding);
  const firstTarget = firstFragBuilding
    ? { x: firstFragBuilding.x + firstFragBuilding.w / 2, y: firstFragBuilding.y + firstFragBuilding.h / 2, settlementId: 0 }
    : { x: spawnX, y: spawnY, settlementId: 0 };

  return {
    seed, phase: "day", dayNumber: 1, level: 1,
    dayTimer: IN_GAME_DAY_SECS, isNight: false,
    player:   createPlayer(spawnX, spawnY),
    player2:  null,
    p2Target: { x: spawnX, y: spawnY },
    vehicle:  mainVehicle,
    vehicles,
    buildings, roads, gardenPlots, lootPiles, wells,
    crops: [], zombies,
    survivors: [], floaters: [], items: [],
    convoyVehicles: [],
    zombiesAwakened: false,
    firstVehicleEntered: false,
    settlements,
    clearedSettlements: new Set(),
    mapFragmentCollected: false,
    fragmentsCollected: [],
    compassTarget: firstTarget,
    totalFragments: settlements.length,
    soundEvents: [],
    hamletCx: startSettlement.cx,
    hamletCy: startSettlement.cy,
    cam: { x: spawnX - 500, y: spawnY - 300 },
    lastTime: performance.now(), tick: 0,
    zombieNightBoost: false, nightSpawnTimer: 0,
    zombiesKilled: 0,
    buildingsSearched: 0,
    survivorsFound: 0,
    turrets: [],
    lastBaseTick: Date.now(),
  };
}

// ─── Needs ────────────────────────────────────────────────────────────────────

export function updateNeeds(player, dt, isSleeping, sleepLocation) {
  const tune = NEEDS_TUNE;
  if (!isSleeping) {
    player.food  = Math.max(0, player.food  - tune.food.drainPerSec  * dt);
    player.water = Math.max(0, player.water - tune.water.drainPerSec * dt);
  }
  const sleepFactor = isSleeping ? -(SLEEP_QUALITY[sleepLocation ?? "exposed"]) : 1.0;
  player.sleep = Math.max(0, Math.min(100, player.sleep - tune.sleep.drainPerSec * sleepFactor * dt));

  player.debuffs = [];
  if (player.food  <= tune.food.critAt)  player.debuffs.push("starving");
  else if (player.food  <= tune.food.warnAt)  player.debuffs.push("hungry");
  if (player.water <= tune.water.critAt) player.debuffs.push("dehydrated");
  else if (player.water <= tune.water.warnAt) player.debuffs.push("thirsty");
  if (player.sleep <= tune.sleep.critAt) player.debuffs.push("exhausted");
  else if (player.sleep <= tune.sleep.warnAt) player.debuffs.push("tired");

  // ── Health regeneration — HP regens toward the lowest need value ───────────
  // e.g. all needs at 100 → HP regens to 100; water at 20 → HP cap is 20
  // Only regens when player is alive and has no active debuffs (hungry/thirsty/exhausted)
  if (player.hp > 0) {
    const HP_REGEN_RATE = 1.5; // hp per second
    const lowestNeed = Math.min(player.food, player.water, player.sleep);
    // Require all needs above the crit threshold before any regen kicks in
    const canRegen = player.food > NEEDS_TUNE.food.critAt
                  && player.water > NEEDS_TUNE.water.critAt
                  && player.sleep > NEEDS_TUNE.sleep.critAt;
    if (canRegen) {
      const hpCap = Math.min(player.maxHp ?? PLAYER_MAX_HP, lowestNeed);
      if (player.hp < hpCap) {
        const rate = isSleeping ? HP_REGEN_RATE * 2.5 : HP_REGEN_RATE;
        player.hp = Math.min(hpCap, player.hp + rate * dt);
      }
    }
  }

  return player.sleep <= 0 || player.food <= 0 || player.water <= 0;
}

// ─── Movement ─────────────────────────────────────────────────────────────────

export function movePlayer(player, dx, dy, dt, buildings) {
  if (player.isSleeping) return;
  let speed = PLAYER_SPEED_BASE;
  if (player.debuffs.includes("exhausted")) speed = PLAYER_SPEED_TIRED;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len, ny = dy / len;
  
  // Move in smaller steps to prevent tunneling
  const stepCount = Math.max(1, Math.ceil(Math.abs(speed * dt) / 5));
  const stepDt = dt / stepCount;
  
  for (let step = 0; step < stepCount; step++) {
    const newX = player.x + nx * speed * stepDt;
    const newY = player.y + ny * speed * stepDt;
    
    // Apply world bounds
    player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, newX));
    player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, newY));
    player.facing = Math.atan2(ny, nx);
    
    if (buildings) {
      for (const b of buildings) {
        resolveWallCollision(player, b);
      }
    }
  }
  
  // No final validation - players should be able to be inside buildings
  // (that's where loot and survivors are)
}

export function driveVehicle(vehicle, dx, dy, dt, buildings) {
  if (vehicle.hp <= 0) return;
  
  // Store original position for potential rollback
  const origX = vehicle.x;
  const origY = vehicle.y;
  
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    const nx = dx / len, ny = dy / len;
    
    // Move in smaller steps for vehicles too
    const speed = vehicle.speed;
    const stepCount = Math.max(1, Math.ceil(Math.abs(speed * dt) / 10));
    const stepDt = dt / stepCount;
    
    for (let step = 0; step < stepCount; step++) {
      const newX = vehicle.x + nx * speed * stepDt;
      const newY = vehicle.y + ny * speed * stepDt;
      
      // Apply bounds
      vehicle.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, newX));
      vehicle.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, newY));
      vehicle.facing = Math.atan2(ny, nx);
      vehicle.fuel = Math.max(0, vehicle.fuel - 0.4 * stepDt);
      
      if (buildings) {
        for (const b of buildings) {
          resolveWallCollision(vehicle, b);
        }
      }
    }
  }

  if (vehicle.bounceVx || vehicle.bounceVy) {
    vehicle.x += (vehicle.bounceVx ?? 0) * dt;
    vehicle.y += (vehicle.bounceVy ?? 0) * dt;
    const decay = Math.max(0, 1 - 8 * dt);
    vehicle.bounceVx = (vehicle.bounceVx ?? 0) * decay;
    vehicle.bounceVy = (vehicle.bounceVy ?? 0) * decay;
    if (Math.abs(vehicle.bounceVx) < 1 && Math.abs(vehicle.bounceVy) < 1) {
      vehicle.bounceVx = 0; vehicle.bounceVy = 0;
    }
    
    // Re-apply collision after bounce
    if (buildings) {
      for (const b of buildings) resolveWallCollision(vehicle, b);
    }
  }

  // Final bounds and collision pass
  vehicle.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, vehicle.x));
  vehicle.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, vehicle.y));
  if (buildings) {
    for (const b of buildings) resolveWallCollision(vehicle, b);
  }
  
  // If the vehicle got stuck inside a building, try to unstuck it
  if (buildings) {
    let stuck = false;
    for (const b of buildings) {
      if (isInsideBuilding(vehicle, b)) {
        stuck = true;
        break;
      }
    }
    
    if (stuck) {
      // Try to find a safe direction to exit
      const directions = [
        [VEHICLE_RADIUS + 10, 0], [-VEHICLE_RADIUS - 10, 0],
        [0, VEHICLE_RADIUS + 10], [0, -VEHICLE_RADIUS - 10],
        [VEHICLE_RADIUS + 20, VEHICLE_RADIUS + 20],
        [-VEHICLE_RADIUS - 20, VEHICLE_RADIUS + 20],
        [VEHICLE_RADIUS + 20, -VEHICLE_RADIUS - 20],
        [-VEHICLE_RADIUS - 20, -VEHICLE_RADIUS - 20]
      ];
      
      for (const [offX, offY] of directions) {
        const testX = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, origX + offX));
        const testY = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, origY + offY));
        
        let safe = true;
        for (const b of buildings) {
          if (isInsideBuilding({ x: testX, y: testY, radius: VEHICLE_RADIUS }, b)) {
            safe = false;
            break;
          }
        }
        
        if (safe) {
          vehicle.x = testX;
          vehicle.y = testY;
          // Add a bounce effect to feel like you hit something
          vehicle.bounceVx = (vehicle.bounceVx ?? 0) + (offX > 0 ? -150 : offX < 0 ? 150 : 0);
          vehicle.bounceVy = (vehicle.bounceVy ?? 0) + (offY > 0 ? -150 : offY < 0 ? 150 : 0);
          break;
        }
      }
    }
  }
}


export function syncPlayerToVehicle(player, vehicle) {
  player.x = vehicle.x; player.y = vehicle.y;
}

// ─── Vehicle exit with safety check ───────────────────────────────────────────

export function exitVehicle(player, vehicle, role, buildings = []) {
  player.inVehicle = false;
  if (vehicle.driver === role) {
    vehicle.driver = null;
    vehicle.occupied = vehicle.passenger !== null;
  } else if (vehicle.passenger === role) {
    vehicle.passenger = null;
    vehicle.occupied = vehicle.driver !== null;
  }
  
  // Find safe exit point
  let exitX = vehicle.x + VEHICLE_RADIUS + PLAYER_RADIUS + 6;
  let exitY = vehicle.y;
  
  const exitAttempts = [
    [VEHICLE_RADIUS + PLAYER_RADIUS + 6, 0],
    [-(VEHICLE_RADIUS + PLAYER_RADIUS + 6), 0],
    [0, VEHICLE_RADIUS + PLAYER_RADIUS + 6],
    [0, -(VEHICLE_RADIUS + PLAYER_RADIUS + 6)],
    [VEHICLE_RADIUS + PLAYER_RADIUS + 20, VEHICLE_RADIUS + PLAYER_RADIUS + 20],
    [-(VEHICLE_RADIUS + PLAYER_RADIUS + 20), VEHICLE_RADIUS + PLAYER_RADIUS + 20],
  ];
  
  for (const [dx, dy] of exitAttempts) {
    const testX = vehicle.x + dx;
    const testY = vehicle.y + dy;
    let safe = true;
    
    for (const b of buildings) {
      if (isInsideBuilding({ x: testX, y: testY, radius: PLAYER_RADIUS }, b)) {
        safe = false;
        break;
      }
    }
    
    if (safe) {
      exitX = testX;
      exitY = testY;
      break;
    }
  }
  
  exitX = Math.max(PLAYER_RADIUS + 5, Math.min(WORLD_W - PLAYER_RADIUS - 5, exitX));
  exitY = Math.max(PLAYER_RADIUS + 5, Math.min(WORLD_H - PLAYER_RADIUS - 5, exitY));
  
  player.x = exitX;
  player.y = exitY;
}

export function tryEnterVehicle(player, vehicle, role) {
  if (dist(player.x, player.y, vehicle.x, vehicle.y) > 60) return false;
  if (!vehicle.driver) {
    vehicle.driver = role ?? "p1";
    vehicle.occupied = true;
    player.inVehicle = true;
    return "driver";
  }
  if (!vehicle.passenger) {
    vehicle.passenger = role ?? "p2";
    player.inVehicle = true;
    return "passenger";
  }
  return false;
}

// ─── Door open/close ──────────────────────────────────────────────────────────

const DOOR_INTERACT_RANGE = 50;

export function tryToggleDoor(player, buildings) {
  if (player.inVehicle) return null;
  for (const b of buildings) {
    if (!b.doors) continue;
    for (const door of b.doors) {
      const c = getDoorCenter(b, door);
      if (dist(player.x, player.y, c.x, c.y) < DOOR_INTERACT_RANGE) {
        door.open = !door.open;
        return { building: b, door };
      }
    }
  }
  return null;
}

// ─── Zombie AI ────────────────────────────────────────────────────────────────

function isPlayerOccludedByWalls(zombie, player, buildings) {
  if (player.inVehicle) return false;
  for (const b of buildings) {
    if (!isInsideBuilding(player, b)) continue;
    if (isInsideBuilding(zombie, b)) return false;
    const allSealed = (b.doors || []).every(d => !d.open && !d.broken);
    if (allSealed) return true;
  }
  return false;
}

const DOOR_HEAR_RANGE = 55;
function canHearThroughDoor(zombie, player, buildings) {
  if (player.inVehicle) return false;
  for (const b of buildings) {
    if (!isInsideBuilding(player, b)) continue;
    if (!(b.doors || []).every(d => !d.open && !d.broken)) continue;
    for (const door of (b.doors || [])) {
      const dc = getDoorCenter(b, door);
      if (dist(zombie.x, zombie.y, dc.x, dc.y) < DOOR_HEAR_RANGE) return true;
    }
  }
  return false;
}

function getNearestTarget(zombie, player, player2, vehicle) {
  // player.x/y is authoritative. When a player drives, their position is synced to
  // the vehicle (syncPlayerToVehicle) before being broadcast, so we never need to
  // look up a separate vehicle object — doing so risks grabbing the WRONG vehicle
  // (e.g. P1's car) and is the reason p2-in-vehicle targeting failed previously.
  // For P1 (the local/host player) we can use the live vehicle position directly.
  const p1x = player.inVehicle ? vehicle.x : player.x;
  const p1y = player.inVehicle ? vehicle.y : player.y;
  const d1  = dist(zombie.x, zombie.y, p1x, p1y);

  // Consider player2 if present and alive. hp may be undefined before the first
  // stats sync arrives, so treat a missing hp as "alive" rather than dead.
  const p2Alive = player2 && (player2.hp == null || player2.hp > 0) && !player2.isDowned;
  if (p2Alive) {
    const p2x = player2.x;
    const p2y = player2.y;
    const d2 = dist(zombie.x, zombie.y, p2x, p2y);
    if (d2 < d1) {
      return { targetX: p2x, targetY: p2y, targetPlayer: player2, inVehicle: !!player2.inVehicle };
    }
  }

  return { targetX: p1x, targetY: p1y, targetPlayer: player, inVehicle: !!player.inVehicle };
}

function doorWaypoint(building, door, zombie, offsetDir = 1) {
  const dc = getDoorCenter(building, door);
  const OFFSET = ZOMBIE_RADIUS + 6;
  switch (door.side) {
    case "north": return { x: dc.x, y: dc.y - OFFSET * offsetDir };
    case "south": return { x: dc.x, y: dc.y + OFFSET * offsetDir };
    case "west":  return { x: dc.x - OFFSET * offsetDir, y: dc.y };
    case "east":  return { x: dc.x + OFFSET * offsetDir, y: dc.y };
    default:      return dc;
  }
}

function getDoorRoutingWaypoint(zombie, targetX, targetY, buildings) {
  if (!buildings) return null;
  const zombieBuilding = buildings.find(b => isInsideBuilding(zombie, b));
  const targetBuilding = buildings.find(b =>
    targetX > b.x && targetX < b.x + b.w && targetY > b.y && targetY < b.y + b.h
  );

  if (zombieBuilding && zombieBuilding !== targetBuilding) {
    const openDoors = (zombieBuilding.doors || []).filter(d => d.open || d.broken);
    if (openDoors.length === 0) {
      // All doors closed — pick the nearest door and aim for it so the zombie
      // approaches it for bashing rather than charging into the wall.
      let bestDoor = null, bestDist = Infinity;
      for (const door of (zombieBuilding.doors || [])) {
        const dc = getDoorCenter(zombieBuilding, door);
        const d = dist(zombie.x, zombie.y, dc.x, dc.y);
        if (d < bestDist) { bestDist = d; bestDoor = door; }
      }
      return bestDoor ? doorWaypoint(zombieBuilding, bestDoor, zombie, 1) : null;
    }
    let best = null, bestScore = Infinity;
    for (const door of openDoors) {
      const dc = getDoorCenter(zombieBuilding, door);
      const score = dist(zombie.x, zombie.y, dc.x, dc.y) * 0.4
                  + dist(dc.x, dc.y, targetX, targetY);
      if (score < bestScore) {
        bestScore = score;
        best = doorWaypoint(zombieBuilding, door, zombie, 1);
      }
    }
    return best;
  }

  if (targetBuilding && targetBuilding !== zombieBuilding) {
    const openDoors = (targetBuilding.doors || []).filter(d => d.open || d.broken);
    if (openDoors.length === 0) return null;
    let best = null, bestScore = Infinity;
    for (const door of openDoors) {
      const dc = getDoorCenter(targetBuilding, door);
      const score = dist(zombie.x, zombie.y, dc.x, dc.y);
      if (score < bestScore) {
        bestScore = score;
        best = doorWaypoint(targetBuilding, door, zombie, -1);
      }
    }
    return best;
  }
  return null;
}

export function updateZombies(zombies, player, vehicle, dt, isNight, buildings, player2 = null, soundEvents = [], hamletCx = WORLD_W / 2, hamletCy = WORLD_H / 2, level = 1, turrets = [], vehicles = null) {
  const speed = isNight ? ZOMBIE_SPEED_NIGHT : ZOMBIE_SPEED_SLOW;

  // Authoritative positions: a driving player's x/y is synced to their vehicle, so we
  // use the player objects directly. (P1 may use the live vehicle position.)
  const px = player.inVehicle ? vehicle.x : player.x;
  const py = player.inVehicle ? vehicle.y : player.y;
  const p2x = player2 ? player2.x : px;
  const p2y = player2 ? player2.y : py;

  zombies.forEach(z => {
    if (z.dead) return;
    if (z.state === "dormant") return;

    z.speed = speed;
    if (z.attackCooldown > 0) z.attackCooldown -= dt;

    const dToP1 = dist(z.x, z.y, px, py);
    const dToP2 = player2 ? dist(z.x, z.y, p2x, p2y) : Infinity;
    const dNearest = Math.min(dToP1, dToP2);
    if (dNearest > ZOMBIE_CULL_DIST) {
      z.wanderTimer -= dt;
      if (z.wanderTimer <= 0) {
        z.wanderTimer = 3 + Math.random() * 4;
        z.targetX = z.x + (Math.random() - 0.5) * 300;
        z.targetY = z.y + (Math.random() - 0.5) * 300;
        z.targetX = Math.max(50, Math.min(WORLD_W - 50, z.targetX));
        z.targetY = Math.max(50, Math.min(WORLD_H - 50, z.targetY));
      }
      const wdx = z.targetX - z.x, wdy = z.targetY - z.y;
      const wlen = Math.sqrt(wdx*wdx + wdy*wdy);
      if (wlen > 1) {
        z.x += (wdx / wlen) * z.speed * 0.3 * dt;
        z.y += (wdy / wlen) * z.speed * 0.3 * dt;
      }
      return;
    }

    if (z.state === "chase_turret" || z.state === "attack_turret") {
      const t = turrets.find(tr => tr.id === z._turretTargetId && !tr.destroyed);
      if (!t) {
        z.state = "wander"; z._turretTargetId = null;
      } else {
        const dToTurret = dist(z.x, z.y, t.x, t.y);
        const attackDist = z.radius + t.radius + TURRET_ZOMBIE_ATTACK_RANGE;

        const { targetX: px, targetY: py } = getNearestTarget(z, player, player2, vehicle);
        const dToPlayer = dist(z.x, z.y, px, py);
        if (dToPlayer < ZOMBIE_SIGHT_RANGE) {
          z.state = "alert"; z.alertTimer = 0.3; z._turretTargetId = null;
          return;
        }

        if (dToTurret <= attackDist) {
          z.state = "attack_turret";
        } else {
          z.state = "chase_turret";
          moveToward(z, t.x, t.y, z.speed, dt);
          if (buildings) for (const b of buildings) resolveWallCollision(z, b);
        }
      }
      return;
    }

    const { targetX, targetY, targetPlayer, inVehicle: targetInVehicle } =
      getNearestTarget(z, player, player2, vehicle);
    const dToPlayer = dist(z.x, z.y, targetX, targetY);

    const wallOccluded = buildings ? isPlayerOccludedByWalls(z, targetPlayer, buildings) : false;
    const bossRange    = z.type === "boss" ? Infinity : ZOMBIE_SIGHT_RANGE;
    const canSee  = !wallOccluded && dToPlayer < bossRange;
    const canHear = (targetInVehicle && dToPlayer < ZOMBIE_SOUND_RANGE)
                 || (buildings ? canHearThroughDoor(z, targetPlayer, buildings) : false)
                 || z.type === "boss";

    const soundPull = getSoundPull(z.x, z.y, soundEvents, hamletCx, hamletCy, level);

    switch (z.state) {
      case "wander": {
        if (canSee || canHear) { z.state = "alert"; z.alertTimer = 0.4; }
        else if (soundPull.mag > 0.05) {
          const nearTurret = turrets.find(t =>
            !t.destroyed &&
            dist(z.x, z.y, t.x, t.y) < TURRET_ZOMBIE_AGGRO_RANGE &&
            soundEvents.some(ev => ev.type === "turret" && dist(ev.x, ev.y, t.x, t.y) < 20)
          );
          if (nearTurret && dist(z.x, z.y, nearTurret.x, nearTurret.y) < TURRET_ZOMBIE_AGGRO_RANGE) {
            z.state = "chase_turret";
            z._turretTargetId = nearTurret.id;
            return;
          }
          z.x += soundPull.dx * SOUND_DRIFT_SPEED * dt;
          z.y += soundPull.dy * SOUND_DRIFT_SPEED * dt;
          z.facing = Math.atan2(soundPull.dy, soundPull.dx);
          if (buildings) for (const b of buildings) resolveWallCollision(z, b);
          z.wanderTimer = 2 + Math.random() * 2;
          z.targetX = z.x + soundPull.dx * 200;
          z.targetY = z.y + soundPull.dy * 200;
        } else {
          z.wanderTimer -= dt;
          if (z.wanderTimer <= 0) {
            z.targetX = z.x + (Math.random() - 0.5) * 250;
            z.targetY = z.y + (Math.random() - 0.5) * 250;
            z.wanderTimer = 2 + Math.random() * 4;
          }
          moveToward(z, z.targetX, z.targetY, z.speed * 0.4, dt);
          if (buildings) for (const b of buildings) resolveWallCollision(z, b);
        }
        break;
      }
      case "alert": {
        z.alertTimer -= dt;
        if (z.alertTimer <= 0) z.state = "chase";
        break;
      }
      case "chase": {
        if (!canSee && !canHear) {
          if (z._neverGiveUp) { z.giveUpTimer = 0; }
          else {
            z.giveUpTimer += dt;
            if (z.giveUpTimer >= ZOMBIE_GIVE_UP_TIME) { z.state = "wander"; z.giveUpTimer = 0; }
          }
        } else { z.giveUpTimer = 0; }

        const attackDist = z.radius + (targetInVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 2;
        if (!wallOccluded && dToPlayer < attackDist) { z.state = "attack"; break; }

        const shouldConsiderBash = buildings
          && (canSee || canHear)
          && wallOccluded
          && dToPlayer > attackDist * 1.2;

        if (shouldConsiderBash) {
          const blockedDoor = findBlockingDoor(z, targetX, targetY, buildings);
          if (blockedDoor) {
            z.state = "bash_door";
            z._bashDoorId      = blockedDoor.door.id;
            z._bashBuildingId  = blockedDoor.building.id;
            z._bashGiveUp      = ZOMBIE_GIVE_UP_TIME;
            break;
          }
        }

        const waypoint = buildings
          ? getDoorRoutingWaypoint(z, targetX, targetY, buildings)
          : null;

        const moveTargetX = waypoint?.x ?? targetX;
        const moveTargetY = waypoint?.y ?? targetY;

        moveToward(z, moveTargetX, moveTargetY, z.speed, dt);
        if (buildings) for (const b of buildings) resolveWallCollision(z, b);
        break;
      }
      case "bash_door": {
        const attackDistBash = z.radius + (targetInVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 4;
        // Check if the door was broken/opened first — if so, resume chasing.
        const doorStillBlocking = buildings && isDoorStillBlocking(z, buildings);
        if (!doorStillBlocking) {
          z.state = "chase"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        // Only allow switching to attack when the wall is no longer occluding
        // AND the door is already gone (checked above). If wall still blocks,
        // keep bashing even if the zombie somehow got line-of-sight.
        if (!wallOccluded && dToPlayer < attackDistBash * 2.0) {
          z.state = "attack"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        if (!wallOccluded && (canSee || canHear)) {
          z.state = "chase"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        if (canSee || canHear) {
          z._bashGiveUp = ZOMBIE_GIVE_UP_TIME;
        } else {
          z._bashGiveUp = (z._bashGiveUp ?? ZOMBIE_GIVE_UP_TIME) - dt;
          if (z._bashGiveUp <= 0) {
            z.state = "wander"; z._bashDoorId = null; z._bashBuildingId = null; break;
          }
        }
        if (buildings) {
          const b = buildings.find(b2 => b2.id === z._bashBuildingId);
          const door = b?.doors?.find(d => d.id === z._bashDoorId);
          if (b && door) {
            const dc = getDoorCenter(b, door);
            const dToDoor = dist(z.x, z.y, dc.x, dc.y);
            if (dToDoor > DOOR_BASH_RANGE) {
              // Approach from the exterior face of the door so wall-collision
              // geometry doesn't push the zombie back every frame (stuck loop).
              const wp = doorWaypoint(b, door, z, 1);
              moveToward(z, wp.x, wp.y, z.speed, dt);
              for (const bld of buildings) resolveWallCollision(z, bld);
            }
          }
        }
        break;
      }
      case "attack": {
        const attackDist = z.radius + (targetInVehicle ? VEHICLE_RADIUS : PLAYER_RADIUS) + 4;
        if (dToPlayer > attackDist * 1.5 || wallOccluded) { z.state = "chase"; break; }
        if (z.attackCooldown <= 0) {
          z.attackCooldown = 1 / ZOMBIE_ATTACK_RATE;
          z._dealDamage = true;
          // p2 in vehicle → damage their vehicle; p2 on foot → damage p2; p1 in vehicle → vehicle; p1 on foot → p1
          z._damageTarget = targetPlayer === player2
            ? (targetInVehicle ? "p2_vehicle" : "p2")
            : (targetInVehicle ? "vehicle" : "p1");
        }
        break;
      }
    }
  });

  // Separate active (non-culled) zombies from each other so they don't stack.
  // Filtering to the active subset avoids an O(n²) pass over the entire world
  // population (thousands of zombies) every single frame.
  const px2 = player.inVehicle ? vehicle.x : player.x;
  const py2 = player.inVehicle ? vehicle.y : player.y;
  const cullSq = ZOMBIE_CULL_DIST * ZOMBIE_CULL_DIST;
  const activeZombies = zombies.filter(z => {
    if (z.dead || z.state === "dormant") return false;
    const dxA = z.x - px2, dyA = z.y - py2;
    if (dxA * dxA + dyA * dyA <= cullSq) return true;
    if (!player2) return false;
    const dxB = z.x - player2.x, dyB = z.y - player2.y;
    return dxB * dxB + dyB * dyB <= cullSq;
  });
  separateEntityLists(activeZombies, activeZombies);
}

function findBlockingDoor(zombie, targetX, targetY, buildings) {
  // Only consider doors that block the zombie's path FROM OUTSIDE.
  // If the zombie is already inside the building that owns the door, that
  // door isn't blocking its exit — it should use getDoorRoutingWaypoint instead.
  const zombieBuilding = buildings.find(b => isInsideBuilding(zombie, b));
  for (const b of buildings) {
    if (!b.doors) continue;
    // Skip doors on the building the zombie is currently inside.
    if (zombieBuilding && zombieBuilding.id === b.id) continue;
    for (const door of b.doors) {
      if (door.open || door.broken) continue;
      if (b.barricadeHp > 0) continue;
      const dc = getDoorCenter(b, door);
      const dToDoor = dist(zombie.x, zombie.y, dc.x, dc.y);
      if (dToDoor > DOOR_BASH_RANGE * 2.5) continue;
      const toTarget = { x: targetX - zombie.x, y: targetY - zombie.y };
      const toDoor   = { x: dc.x - zombie.x,    y: dc.y - zombie.y };
      const dot = toTarget.x * toDoor.x + toTarget.y * toDoor.y;
      // Require the door to be clearly in the direction of the target (dot > 0)
      if (dot <= 0) continue;
      return { building: b, door };
    }
  }
  return null;
}

function isDoorStillBlocking(zombie, buildings) {
  const b = buildings.find(b2 => b2.id === zombie._bashBuildingId);
  if (!b) return false;
  const door = b.doors?.find(d => d.id === zombie._bashDoorId);
  if (!door) return false;
  return !door.open && !door.broken;
}

function moveToward(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x, dy = ty - entity.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return;
  entity.x += (dx / d) * speed * dt;
  entity.y += (dy / d) * speed * dt;
  entity.facing = Math.atan2(dy, dx);
}

/**
 * Resolve overlap between two lists of entities (or the same list against itself).
 * Each entity needs { x, y, radius }. Pushes both apart so they don't overlap.
 * Uses a cheap axis-aligned early-out and squared-distance check so Math.sqrt
 * is only called for pairs that are actually overlapping.
 */
function separateEntityLists(listA, listB) {
  const sameList = listA === listB;
  for (let i = 0; i < listA.length; i++) {
    const a = listA[i];
    if (a.dead) continue;
    const ra = a.radius ?? ZOMBIE_RADIUS;
    const start = sameList ? i + 1 : 0;
    for (let j = start; j < listB.length; j++) {
      const b = listB[j];
      if (b.dead) continue;
      const minDist = ra + (b.radius ?? ZOMBIE_RADIUS);
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      // Cheap axis-aligned reject before doing any multiply
      if (dx > minDist || dx < -minDist || dy > minDist || dy < -minDist) continue;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDist * minDist) continue;
      let d = Math.sqrt(distSq);
      if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = 0.5; }
      const push = (minDist - d) * 0.5;
      const nx = (dx / d) * push;
      const ny = (dy / d) * push;
      a.x += nx; a.y += ny;
      b.x -= nx; b.y -= ny;
    }
  }
}

export function areWallSeparated(ax, ay, bx, by, buildings) {
  if (!buildings) return false;
  for (const b of buildings) {
    const aInside = ax > b.x && ax < b.x + b.w && ay > b.y && ay < b.y + b.h;
    const bInside = bx > b.x && bx < b.x + b.w && by > b.y && by < b.y + b.h;
    if (aInside === bInside) continue;
    const allSealed = (b.doors || []).every(d => !d.open && !d.broken);
    if (allSealed) return true;
  }
  return false;
}

export function applyZombieDamage(zombies, player, vehicle, buildings, player2 = null, vehicles = null) {
  let playerDmg = 0, vehicleDmg = 0, p2Dmg = 0;
  const allVehicles = vehicles ?? [vehicle];

  // The vehicle p2 is occupying (if any). May be null if occupancy hasn't synced —
  // in that case p2-in-vehicle hits fall back to damaging p2 directly, NEVER P1's car.
  const p2Vehicle = player2?.inVehicle
    ? (allVehicles.find(v => v.driver === "p2" || v.passenger === "p2") ?? null)
    : null;
  const p2VehicleDmgMap = new Map();

  zombies.forEach(z => {
    if (!z._dealDamage || z.dead) return;
    z._dealDamage = false;
    const target = z._damageTarget ?? (player.inVehicle ? "vehicle" : "p1");

    // Resolve the world position of the target for the wall-separation check.
    // Use the player object's own coords (authoritative, synced to vehicle when driving).
    let tx, ty;
    if (target === "p2" || target === "p2_vehicle") {
      tx = player2?.x ?? player.x; ty = player2?.y ?? player.y;
    } else if (target === "vehicle") {
      tx = vehicle.x; ty = vehicle.y;
    } else {
      tx = player.x; ty = player.y;
    }

    if (buildings && areWallSeparated(z.x, z.y, tx, ty, buildings)) return;
    const dmg = z.type === "boss" ? BOSS_DAMAGE : ZOMBIE_ATTACK_DAMAGE;

    if (target === "vehicle") {
      vehicleDmg += vehicle.zombieKill ? 0 : dmg * 1.5;
    } else if (target === "p2_vehicle") {
      if (p2Vehicle) {
        // Damage p2's actual vehicle (unless it's a zombie-killer like the monster truck).
        if (!p2Vehicle.zombieKill) {
          p2VehicleDmgMap.set(p2Vehicle.id, (p2VehicleDmgMap.get(p2Vehicle.id) ?? 0) + dmg * 1.5);
        }
      } else {
        // No occupied vehicle resolved — fall back to damaging p2 directly.
        p2Dmg += dmg;
      }
    } else if (target === "p2") {
      p2Dmg += dmg;
    } else {
      playerDmg += dmg;
    }

    // Record damage for death recap
    if (target === "p1" && dmg > 0) {
      player.deathRecap?.recordDamage(z.type === "boss" ? "Boss Zombie" : z.type === "brute" ? "Brute Zombie" : "Zombie", dmg, "melee", player.hp - playerDmg);
    }
  });

  player.hp  = Math.max(0, player.hp  - playerDmg);
  vehicle.hp = Math.max(0, vehicle.hp - vehicleDmg);
  if (player2 && p2Dmg > 0) player2.hp = Math.max(0, player2.hp - p2Dmg);

  // Damage to the vehicle p2 was occupying. We apply it locally (host's mirror of
  // p2's vehicle) AND report it separately so the caller can forward it to P2's
  // client, which is authoritative over that vehicle's HP.
  let p2VehicleDmg = 0, p2VehicleId = null;
  for (const [vid, dmg] of p2VehicleDmgMap) {
    const v = allVehicles.find(v2 => v2.id === vid);
    if (v) v.hp = Math.max(0, v.hp - dmg);
    p2VehicleDmg += dmg;
    p2VehicleId = vid;
  }

  return { playerDmg, vehicleDmg, p2Dmg, p2VehicleDmg, p2VehicleId };
}

export function updateVehicleCollisions(vehicle, zombies, dt, buildings) {
  if (!vehicle.occupied) return;

  zombies.forEach(z => {
    if (z._vhitCooldown > 0) z._vhitCooldown -= dt;
  });

  let totalBounceX = 0, totalBounceY = 0, hitCount = 0;

  zombies.forEach(z => {
    if (z.dead) return;
    const d = dist(vehicle.x, vehicle.y, z.x, z.y);
    if (d < VEHICLE_RADIUS + z.radius) {
      if (buildings && areWallSeparated(vehicle.x, vehicle.y, z.x, z.y, buildings)) return;
      const ang = Math.atan2(z.y - vehicle.y, z.x - vehicle.x);

      if ((z._vhitCooldown ?? 0) <= 0) {
        if (vehicle.zombieKill) {
          z.hp = 0; z.dead = true;
        } else {
          z.hp -= 40;
          if (z.hp <= 0) z.dead = true;
        }
        z._vhitCooldown = 0.4;
      }

      z.x += Math.cos(ang) * 30; z.y += Math.sin(ang) * 30;

      if (!vehicle.zombieKill) {
        totalBounceX += -Math.cos(ang);
        totalBounceY += -Math.sin(ang);
        hitCount++;
      }
    }
  });

  if (hitCount > 0) {
    const blen = Math.sqrt(totalBounceX * totalBounceX + totalBounceY * totalBounceY);
    if (blen > 0) {
      const BOUNCE_SPEED = 220;
      vehicle.bounceVx = (vehicle.bounceVx ?? 0) + (totalBounceX / blen) * BOUNCE_SPEED;
      vehicle.bounceVy = (vehicle.bounceVy ?? 0) + (totalBounceY / blen) * BOUNCE_SPEED;
    }
  }
}

// ─── Player attack ────────────────────────────────────────────────────────────

export const MELEE_RANGE  = 40;
export const MELEE_DAMAGE = 22;
export const MELEE_RATE   = 1.8;   // swings per second
export const MELEE_ARC    = Math.PI * 0.72; // ±65° cone (total 130°)

export function playerAttack(player, zombies, dt) {
  if (player.inVehicle || !player.weapon) return [];
  if (player.attackCooldown > 0) { player.attackCooldown -= dt; return []; }

  // Always set cooldown on any swing attempt (no free spam when no zombie is near)
  player.attackCooldown = 1 / MELEE_RATE;

  // Kick off the visual arc sweep
  player.swingAngle  = player.facing - MELEE_ARC / 2;
  player.swingTarget = player.facing + MELEE_ARC / 2;
  player.swingTimer  = 1 / MELEE_RATE; // lasts the full cooldown window

  const hits = [];
  zombies.forEach(z => {
    if (z.dead) return;
    const d = dist(player.x, player.y, z.x, z.y);
    if (d >= MELEE_RANGE + z.radius) return;

    // Cone check — is zombie within the swing arc?
    const angleToZ = Math.atan2(z.y - player.y, z.x - player.x);
    let diff = angleToZ - player.facing;
    // Normalise to [-π, π]
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) > MELEE_ARC / 2) return;

    z.hp -= MELEE_DAMAGE;
    if (z.hp <= 0) { z.dead = true; player.deathRecap?.recordKill(); }
    hits.push(z.id);
  });

  return hits;
}

// ─── Loot interaction ─────────────────────────────────────────────────────────

export const LOOT_RANGE = 40;

export function tryCollectLoot(player, lootPiles, vehicle) {
  if (player.inVehicle) return null;
  for (const pile of lootPiles) {
    if (pile.collected) continue;
    if (dist(player.x, player.y, pile.x, pile.y) > LOOT_RANGE) continue;

    const gained = [];
    const fuelGained = { qty: 0 };

    pile.items.forEach(item => {
      if (item.type === "fuel" && vehicle) {
        const toAdd = Math.min(item.qty * 25, vehicle.maxFuel - vehicle.fuel);
        vehicle.fuel = Math.min(vehicle.maxFuel, vehicle.fuel + item.qty * 25);
        fuelGained.qty += item.qty * 25;
        gained.push({ ...item, autoFueled: true });
        return;
      }
      addToInventory(player.inventory, item.type, item.qty);
      gained.push(item);
      if (item.type === "bat" && !player.weapon) {
        player.weapon = "bat";
        removeFromInventory(player.inventory, "bat", 1);
      }
    });

    pile.collected = true;
    return { pile, gained, fuelGained: fuelGained.qty };
  }
  return null;
}

// ─── Building search (survivor discovery only) ────────────────────────────────

export const SEARCH_RANGE = 60;

export function tryDiscoverSurvivor(player, buildings, survivors, lootPiles) {
  if (player.inVehicle) return null;
  for (const b of buildings) {
    if (!b.hiddenSurvivor) continue;
    if (!isInsideBuilding(player, b)) continue;
    const lootPile = lootPiles.find(p => p.buildingId === b.id);
    if (!lootPile?.collected) continue;
    if (survivors.some(s => s.origin === b.id)) continue;

    const names = ["Marcus", "Jen", "Dale", "Rosa", "Tony", "Beth"];
    const roles = ["mechanic", "farmer", "scavenger", "gunner"];
    const name = names[Math.floor(Math.random() * names.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const survivor = createSurvivor(`s_${b.id}`, b.x + b.w / 2, b.y + b.h / 2, name, role);
    survivor.origin = b.id;
    return { building: b, survivor };
  }
  return null;
}

// ─── Proximity context (for HUD prompts) ─────────────────────────────────────

export function getProximityActions(player, buildings, vehicle, gardenPlots, crops, lootPiles, wells, turrets = []) {
  const actions = [];

  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < 70)
    actions.push({ key: "F", label: vehicle.occupied ? "Vehicle occupied" : "Enter vehicle" });
  if (player.inVehicle)
    actions.push({ key: "F", label: "Exit vehicle" });

  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < REPAIR_RANGE) {
    const parts = getInventoryCount(player.inventory, "car_parts");
    if (parts > 0 && vehicle.hp < vehicle.maxHp) {
      actions.push({ key: "E", label: `Repair vehicle (+${REPAIR_HP_GAIN} HP) [${parts} parts]` });
    }
  }

  if (player.inVehicle) return actions;

  for (const t of turrets) {
    if (t.destroyed) continue;
    if (t.hp >= t.maxHp) continue;
    if (dist(player.x, player.y, t.x, t.y) > TURRET_REPAIR_RANGE) continue;
    const scrap = getInventoryCount(player.inventory, "scrap");
    actions.push({ key: "H", label: `Repair turret — ${TURRET_REPAIR_COST_SCRAP} scrap, 2.5s cast [${scrap} have]` });
    break;
  }

  for (const b of buildings) {
    if (!b.doors) continue;
    for (const door of b.doors) {
      const c = getDoorCenter(b, door);
      if (dist(player.x, player.y, c.x, c.y) < DOOR_INTERACT_RANGE) {
        actions.push({ key: "F", label: door.open ? `Close door` : `Open door` });
      }
    }
  }

  for (const pile of lootPiles) {
    if (pile.collected) continue;
    if (dist(player.x, player.y, pile.x, pile.y) > LOOT_RANGE) continue;
    const names = pile.items.map(i => `${i.qty}× ${i.type}`).join(", ");
    actions.push({ key: "F", label: "Loot" });
  }

  for (const b of buildings) {
    if (!b.barricadeable || b.barricadeHp > 0) continue;
    const nearDoor = (b.doors || []).some(d => {
      const c = getDoorCenter(b, d);
      return dist(player.x, player.y, c.x, c.y) < SEARCH_RANGE;
    });
    if (nearDoor || isInsideBuilding(player, b))
      actions.push({ key: "B", label: `Barricade ${b.label} (3s)` });
  }

  if (wells) {
    for (const w of wells) {
      if (dist(player.x, player.y, w.x, w.y) < 60)
        actions.push({ key: "R", label: "Drink from well" });
    }
  }
  for (const b of buildings) {
    if (b.hasWell && dist(player.x, player.y, b.x + b.w / 2, b.y + b.h / 2) < 80)
      actions.push({ key: "R", label: "Drink from well" });
  }

  const readyCrop = crops.find(c => {
    if (c.stage !== "ready") return false;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    return plot && dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) < 60;
  });
  if (readyCrop) actions.push({ key: "F", label: "Harvest crops (2s)" });

  const emptyPlot = gardenPlots.find(p =>
    !crops.some(c => c.plotId === p.id) &&
    dist(player.x, player.y, p.x + p.w / 2, p.y + p.h / 2) < 60
  );
  if (emptyPlot) actions.push({ key: "F", label: "Plant crops (2.5s)" });

  for (const b of buildings) {
    if (isInsideBuilding(player, b))
      actions.push({ key: "Z", label: player.isSleeping ? "Wake up" : "Sleep here" });
  }

  actions.push({ key: "Q", label: "Eat food (1.5s)" });
  actions.push({ key: "R", label: "Drink water (1.5s)" });
  if (player.weapon) actions.push({ key: "Space", label: `Attack (${player.weapon})` });

  const seen = new Set();
  return actions.filter(a => {
    const k = a.key + a.label;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

// ─── Barricade ────────────────────────────────────────────────────────────────

export function tryBarricade(player, buildings) {
  if (player.inVehicle) return null;
  const wood  = getInventoryCount(player.inventory, "wood");
  const nails = getInventoryCount(player.inventory, "nails");

  for (const b of buildings) {
    if (!b.barricadeable || b.barricadeHp > 0) continue;
    const nearDoor = (b.doors || []).some(d => {
      const c = getDoorCenter(b, d);
      return dist(player.x, player.y, c.x, c.y) < SEARCH_RANGE;
    });
    if (!nearDoor && !isInsideBuilding(player, b)) continue;

    const actualDoors = b.barricadeDoors ?? 1;
    const costW = BARRICADE_COST_WOOD  * actualDoors;
    const costN = BARRICADE_COST_NAILS * actualDoors;
    if (wood < costW || nails < costN)
      return { fail: "not_enough_materials", need: { wood: costW, nails: costN } };

    removeFromInventory(player.inventory, "wood",  costW);
    removeFromInventory(player.inventory, "nails", costN);
    b.barricadeHp = BARRICADE_HP * actualDoors;
    if (b.doors) {
      b.doors.forEach(d => {
        d.hp     = DOOR_MAX_HP;
        d.broken = false;
        d.open   = false;
      });
    }
    return { success: true, building: b };
  }
  return null;
}

export function updateBarricades(buildings, zombies, dt) {
  buildings.forEach(b => {
    if (!b.barricadeable || b.barricadeHp <= 0) return;
    const bCx = b.x + b.w / 2, bCy = b.y + b.h / 2;
    zombies.forEach(z => {
      if (z.dead) return;
      if (dist(z.x, z.y, bCx, bCy) < ZOMBIE_RADIUS + Math.max(b.w, b.h) / 2 + 10)
        if (z.attackCooldown <= 0)
          b.barricadeHp = Math.max(0, b.barricadeHp - BARRICADE_ZOMBIE_DAMAGE);
    });
  });
}

// ─── Door bashing ─────────────────────────────────────────────────────────────

export function updateDoorBashing(buildings, zombies, dt) {
  const events = [];
  buildings.forEach(b => {
    if (!b.doors) return;
    b.doors.forEach(door => {
      if (door.open || door.broken) return;
      if (b.barricadeHp > 0) return;

      zombies.forEach(z => {
        if (z.dead || z.state !== "bash_door") return;
        if (z._bashDoorId !== door.id) return;
        if (z.attackCooldown > 0) return;

        door.hp = Math.max(0, (door.hp ?? DOOR_MAX_HP) - DOOR_BASH_DAMAGE);
        z.attackCooldown = 1 / ZOMBIE_ATTACK_RATE;
        events.push({ buildingId: b.id, doorId: door.id, hp: door.hp });

        if (door.hp <= 0) {
          door.broken = true;
          door.open   = true;
          events.push({ buildingId: b.id, doorId: door.id, hp: 0, broken: true });
        }
      });
    });
  });
  return events;
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export function getSleepLocation(player, vehicle, buildings) {
  if (player.inVehicle) return "inVehicle";
  for (const b of buildings) {
    if (isInsideBuilding(player, b))
      return b.barricadeHp > 0 ? "secured" : "indoor";
  }
  return "exposed";
}

export function shouldInterruptFastSleep(player, zombies, buildings) {
  for (const b of buildings) {
    if (!isInsideBuilding(player, b)) continue;
    if (zombies.some(z => !z.dead && isInsideBuilding(z, b))) return true;
    if ((b.doors || []).some(d => d.broken)) return true;
  }
  return false;
}

// ─── Farming ──────────────────────────────────────────────────────────────────

export function tryPlantCrop(player, gardenPlots, crops, cropType) {
  if (player.inVehicle) return null;
  if (getInventoryCount(player.inventory, "seeds") < 1) return { fail: "no_seeds" };
  for (const plot of gardenPlots) {
    if (crops.some(c => c.plotId === plot.id)) continue;
    if (dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) > 60) continue;
    removeFromInventory(player.inventory, "seeds", 1);
    const crop = createCrop(plot.id, cropType ?? "potato", plot.x, plot.y);
    crops.push(crop);
    return { success: true, crop };
  }
  return null;
}

export function updateCrops(crops, dt) {
  const ready = [];
  crops.forEach(c => {
    if (c.stage === "ready") return;
    c.growTimer += dt;
    if (c.growTimer >= c.growTime * 0.5 && c.stage === "planted") c.stage = "growing";
    if (c.growTimer >= c.growTime) { c.stage = "ready"; ready.push(c); }
  });
  return ready;
}

export function tryHarvestCrop(player, gardenPlots, crops, dayNumber, buildings = []) {
  for (let i = crops.length - 1; i >= 0; i--) {
    const c = crops[i];
    if (c.stage !== "ready") continue;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    if (!plot) continue;
    const plotCx = plot.x + plot.w / 2, plotCy = plot.y + plot.h / 2;
    if (dist(player.x, player.y, plotCx, plotCy) > 60) continue;
    // Don't allow harvesting through a sealed wall
    if (buildings.length && areWallSeparated(player.x, player.y, plotCx, plotCy, buildings)) continue;
    
    const cropDef = CROP_TYPES[c.type] ?? CROP_TYPES.potato;
    const seasonBonus = getSeasonalBonus(c.type, dayNumber);
    const qty = Math.floor(cropDef.yield * seasonBonus);
    
    addToInventory(player.inventory, "food", qty);
    crops.splice(i, 1);
    return { type: c.type, qty, id: c.id, seasonBonus: seasonBonus > 1 };
  }
  return null;
}

// ─── Inventory helpers ────────────────────────────────────────────────────────

export function addToInventory(inv, type, qty) { inv[type] = (inv[type] ?? 0) + qty; }
export function removeFromInventory(inv, type, qty) { inv[type] = Math.max(0, (inv[type] ?? 0) - qty); }
export function getInventoryCount(inv, type) { return inv[type] ?? 0; }

export function eatFood(player) {
  if (getInventoryCount(player.inventory, "food") < 1) return false;
  removeFromInventory(player.inventory, "food", 1);
  player.food = Math.min(100, player.food + 25);
  return true;
}

export function drinkWater(player, buildings, wells) {
  if (wells) {
    const nearWell = wells.some(w => dist(player.x, player.y, w.x, w.y) < 60);
    if (nearWell) { player.water = Math.min(100, player.water + 30); return { source: "well" }; }
  }
  const nearBuildingWell = buildings.some(b => b.hasWell &&
    dist(player.x, player.y, b.x + b.w / 2, b.y + b.h / 2) < 80);
  if (nearBuildingWell) { player.water = Math.min(100, player.water + 30); return { source: "well" }; }
  if (getInventoryCount(player.inventory, "water") < 1) return false;
  removeFromInventory(player.inventory, "water", 1);
  player.water = Math.min(100, player.water + 30);
  return { source: "bottle" };
}

// ─── Day/night ────────────────────────────────────────────────────────────────

export function updateDayNight(state, dt) {
  state.dayTimer -= dt;
  if (state.dayTimer <= 0) {
    state.isNight = !state.isNight;
    state.dayTimer = IN_GAME_DAY_SECS;
    if (!state.isNight) state.dayNumber++;
    return true;
  }
  return false;
}

// ─── Camera ───────────────────────────────────────────────────────────────────

export function updateCamera(cam, player, vehicle, W, H) {
  const targetX = (player.inVehicle ? vehicle.x : player.x) - W / 2;
  const targetY = (player.inVehicle ? vehicle.y : player.y) - H / 2;
  cam.x += (targetX - cam.x) * 0.1;
  cam.y += (targetY - cam.y) * 0.1;
  cam.x = Math.max(0, Math.min(WORLD_W - W, cam.x));
  cam.y = Math.max(0, Math.min(WORLD_H - H, cam.y));
}

export function worldToCanvas(wx, wy, cam) { return { cx: wx - cam.x, cy: wy - cam.y }; }

export function addFloater(state, text, x, y, color = "rgba(255,220,80,0.95)", size = 13) {
  state.floaters.push({ text, x, y, age: 0, ttl: 2.0, color, size });
}

export function updateFloaters(floaters, dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    floaters[i].age += dt;
    if (floaters[i].age >= floaters[i].ttl) floaters.splice(i, 1);
  }
}

export function updateNightSpawns(state, dt) {
  if (!state.isNight) return;
  state.nightSpawnTimer -= dt;
  if (state.nightSpawnTimer > 0) return;

  const diff = getNightDifficulty(state.dayNumber);
  const isL1 = (state.level ?? 1) === 1;
  
  state.nightSpawnTimer = isL1
    ? Math.max(2, 5 - (state.dayNumber * 0.2) / diff.spawnRate)
    : Math.max(3, 8 - (state.dayNumber * 0.15) / diff.spawnRate);
  
  let spawnCount = isL1 ? Math.floor(1 + diff.spawnRate * 0.5) : Math.floor(diff.spawnRate * 0.8);
  spawnCount = Math.min(5, Math.max(1, spawnCount));

  for (let s = 0; s < spawnCount; s++) {
    let sx, sy;
    if (isL1) {
      const angle = Math.random() * Math.PI * 2;
      const r = 600 + Math.random() * 800;
      sx = Math.max(10, Math.min(WORLD_W - 10, state.hamletCx + Math.cos(angle) * r));
      sy = Math.max(10, Math.min(WORLD_H - 10, state.hamletCy + Math.sin(angle) * r));
    } else {
      const edge = Math.floor(Math.random() * 4);
      const rand = Math.random;
      if (edge === 0)      { sx = rand() * WORLD_W; sy = 10; }
      else if (edge === 1) { sx = WORLD_W - 10;     sy = rand() * WORLD_H; }
      else if (edge === 2) { sx = rand() * WORLD_W; sy = WORLD_H - 10; }
      else                 { sx = 10;               sy = rand() * WORLD_H; }
    }
    
    let zombieType = "walker";
    if (diff.specialChance > Math.random()) {
      zombieType = Math.random() > 0.6 ? "brute" : "runner";
    }
    state.zombies.push(createZombie(Date.now() + Math.random() + s, sx, sy, zombieType));
  }
}

// ─── Turrets ──────────────────────────────────────────────────────────────────

export function createTurret(x, y) {
  return {
    id: `turret_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    x, y,
    hp: TURRET_HP, maxHp: TURRET_HP,
    range: TURRET_RANGE,
    damage: TURRET_DAMAGE,
    shootCooldown: 0,
    fireRate: TURRET_FIRE_RATE,
    attractRadius: TURRET_SOUND_RANGE,
    destroyed: false,
    radius: 14,
  };
}

export function tryPlaceTurret(player, x, y, turrets, buildings) {
  if (player.inVehicle) return null;

  const scrap = getInventoryCount(player.inventory, "scrap");
  const nails = getInventoryCount(player.inventory, "nails");
  if (scrap < TURRET_COST.scrap) return { fail: "no_scrap", need: TURRET_COST };
  if (nails < TURRET_COST.nails) return { fail: "no_nails", need: TURRET_COST };

  const inside = buildings.some(b => {
    const pad = 10;
    return x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
  });
  if (inside) return { fail: "inside_building" };

  const overlaps = turrets.some(t => !t.destroyed && dist(t.x, t.y, x, y) < 32);
  if (overlaps) return { fail: "overlap" };

  removeFromInventory(player.inventory, "scrap", TURRET_COST.scrap);
  removeFromInventory(player.inventory, "nails", TURRET_COST.nails);
  const turret = createTurret(x, y);
  turrets.push(turret);
  return { success: true, turret };
}

export function updateTurrets(turrets, zombies, dt, soundEvents) {
  turrets.forEach(t => {
    if (t.destroyed) return;
    if (t.shootCooldown > 0) { t.shootCooldown -= dt; return; }

    let nearest = null, nearestDist = Infinity;
    zombies.forEach(z => {
      if (z.dead) return;
      const d = dist(t.x, t.y, z.x, z.y);
      if (d < t.range && d < nearestDist) { nearest = z; nearestDist = d; }
    });

    if (!nearest) return;

    nearest.hp -= t.damage;
    if (nearest.hp <= 0) { nearest.dead = true; nearest._killedByTurret = t.id; }
    t.shootCooldown = 1 / t.fireRate;

    if (soundEvents) {
      if (soundEvents.length >= 20) soundEvents.shift();
      soundEvents.push(createSoundEvent("turret", t.x, t.y, t.attractRadius, 0.85));
    }
  });
}

export function applyTurretDamage(turrets, zombies, dt) {
  const events = [];
  zombies.forEach(z => {
    if (z.dead) return;
    if (z.state !== "attack_turret") return;
    if ((z._turretAttackCd ?? 0) > 0) { z._turretAttackCd -= dt; return; }

    const t = turrets.find(tr => tr.id === z._turretTargetId && !tr.destroyed);
    if (!t) { z.state = "wander"; z._turretTargetId = null; return; }

    const d = dist(z.x, z.y, t.x, t.y);
    if (d > t.radius + ZOMBIE_RADIUS + TURRET_ZOMBIE_ATTACK_RANGE) return;

    t.hp = Math.max(0, t.hp - TURRET_ZOMBIE_DAMAGE);
    z._turretAttackCd = 1 / ZOMBIE_ATTACK_RATE;
    events.push({ turretId: t.id, hp: t.hp });

    if (t.hp <= 0 && !t.destroyed) {
      t.destroyed = true;
      events.push({ turretId: t.id, hp: 0, destroyed: true });
      zombies.forEach(z2 => {
        if (z2._turretTargetId === t.id) {
          z2.state = "wander";
          z2._turretTargetId = null;
        }
      });
    }
  });
  return events;
}

export function tryRepairTurret(player, turrets) {
  if (player.inVehicle) return null;
  for (const t of turrets) {
    if (t.destroyed) continue;
    if (dist(player.x, player.y, t.x, t.y) > TURRET_REPAIR_RANGE) continue;
    if (t.hp >= t.maxHp) return { fail: "full_hp", turret: t };
    if (getInventoryCount(player.inventory, "scrap") < TURRET_REPAIR_COST_SCRAP)
      return { fail: "no_scrap", turret: t };
    removeFromInventory(player.inventory, "scrap", TURRET_REPAIR_COST_SCRAP);
    t.hp = Math.min(t.maxHp, t.hp + TURRET_REPAIR_HP);
    return { success: true, turret: t };
  }
  return null;
}

// ─── Free crop plot placement ─────────────────────────────────────────────────

export function tryPlaceCropPlot(player, x, y, gardenPlots, buildings) {
  if (player.inVehicle) return null;

  const plotW = 80, plotH = 70;
  const plotL = x - plotW / 2, plotR = x + plotW / 2;
  const plotT = y - plotH / 2, plotB = y + plotH / 2;

  const GAP = 12;
  const tooCloseToBuilding = buildings.some(b =>
    plotL < b.x + b.w + GAP &&
    plotR > b.x - GAP &&
    plotT < b.y + b.h + GAP &&
    plotB > b.y - GAP
  );
  if (tooCloseToBuilding) return { fail: "inside_building" };

  const overlaps = gardenPlots.some(p =>
    Math.abs(p.x + p.w / 2 - x) < (p.w + plotW) / 2 + 8 &&
    Math.abs(p.y + p.h / 2 - y) < (p.h + plotH) / 2 + 8
  );
  if (overlaps) return { fail: "overlap" };

  const plot = {
    id: `plot_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    x: x - plotW / 2,
    y: y - plotH / 2,
    w: plotW, h: plotH,
    crop: null, growTimer: 0,
  };
  gardenPlots.push(plot);
  return { success: true, plot };
}

// ─── Map fragment + settlement breadcrumb system ─────────────────────────────

export const FRAGMENT_PULSE_RANGE = 300;

export function collectMapFragment(state, fragmentItem) {
  if (!fragmentItem || fragmentItem.type !== "map_fragment") return null;

  state.mapFragmentCollected = true;
  if (!state.fragmentsCollected) state.fragmentsCollected = [];

  const nextSid = fragmentItem.nextSettlementId;

  if (nextSid === "exit" || nextSid === null) {
    const curSid2 = state.compassTarget?.settlementId ?? 0;
    if (!state.fragmentsCollected.includes(curSid2)) {
      state.fragmentsCollected.push(curSid2);
      if (state.clearedSettlements) state.clearedSettlements.add(curSid2);
    }

    const startSett = state.settlements?.[0];
    let bossSettlement = state.settlements?.[state.settlements.length - 1];
    if (state.settlements && state.settlements.length > 1 && startSett) {
      let maxDist = -1;
      for (const sett of state.settlements) {
        const d = dist(sett.cx, sett.cy, startSett.cx, startSett.cy);
        if (d > maxDist) { maxDist = d; bossSettlement = sett; }
      }
    }
    const bossX = bossSettlement ? bossSettlement.cx + 120 : WORLD_W / 2;
    const bossY = bossSettlement ? bossSettlement.cy + 80  : WORLD_H / 2;
    const boss = createBossZombie("boss_final", bossX, bossY);
    state.zombies.push(boss);
    state.bossZombie = boss;

    state.compassTarget = { x: bossX, y: bossY, isBoss: true };
    return { isEndgame: false, bossSpawned: true };
  }

  const curSid = state.compassTarget?.settlementId ?? 0;
  if (!state.fragmentsCollected.includes(curSid)) {
    state.fragmentsCollected.push(curSid);
    if (state.clearedSettlements) state.clearedSettlements.add(curSid);
  }

  const nextSettlement = state.settlements?.find(s => s.id === nextSid);
  if (!nextSettlement) return { isEndgame: false };

  const nextFragBuilding = state.buildings?.find(
    b => b.settlementId === nextSid && b.isFragmentBuilding
  );

  state.compassTarget = nextFragBuilding
    ? { x: nextFragBuilding.x + nextFragBuilding.w / 2, y: nextFragBuilding.y + nextFragBuilding.h / 2, settlementId: nextSid }
    : { x: nextSettlement.cx, y: nextSettlement.cy, settlementId: nextSid };

  // Remember that the AI still needs to finish looting the settlement where
  // the fragment was just found before heading to the next one.
  state.pendingLootSettlementId = curSid;

  return { isEndgame: false, nextSettlement };
}

export function checkEndgame(state) {
  if (!state.bossZombie) return false;
  return state.bossZombie.dead === true;
}

export const EXIT_TARGET_X = WORLD_W / 2;
export const EXIT_TARGET_Y = 100;
export const EXIT_Y_THRESHOLD = 200;

export function checkLevelExit(state) {
  return checkEndgame(state);
}

// ─── Cast action system ───────────────────────────────────────────────────────

export function updateCastAction(castAction, dt, wasHit) {
  if (!castAction) return null;
  if (wasHit && castAction.interruptible !== false) return "interrupted";
  castAction.elapsed += dt;
  if (castAction.elapsed >= castAction.duration) return "done";
  return "ticking";
}

// ─── Convoy AI ───────────────────────────────────────────────────────────────

export const CONVOY_CRUMB_SPACING    = 300;
export const CONVOY_SPEED_BASE       = 260;
export const CONVOY_SPEED_CATCH_UP   = 420;
export const CONVOY_SPEED_SLOW       = 120;
export const CONVOY_GAP_FAR          = 800;
export const CONVOY_GAP_NEAR         = 100;
export const CONVOY_EJECT_RANGE      = 45;

export function updateConvoyVehicles(convoyVehicles, playerVehicle, survivors, dt, buildings) {
  if (!playerVehicle._crumbs) playerVehicle._crumbs = [{ x: playerVehicle.x, y: playerVehicle.y }];
  const lastCrumb = playerVehicle._crumbs[playerVehicle._crumbs.length - 1];
  const dToLast = dist(playerVehicle.x, playerVehicle.y, lastCrumb.x, lastCrumb.y);
  if (dToLast >= CONVOY_CRUMB_SPACING) {
    playerVehicle._crumbs.push({ x: playerVehicle.x, y: playerVehicle.y });
    if (playerVehicle._crumbs.length > 120) playerVehicle._crumbs.splice(0, playerVehicle._crumbs.length - 120);
  }

  const ejected = [];

  for (const entry of convoyVehicles) {
    const { vehicle: cv, survivor: sv } = entry;
    if (!sv || sv.hp <= 0 || cv.hp <= 0) continue;

    // FIX 5: initialise _crumbIdx to the most recent crumb (end of trail) so newly
    // assigned convoy vehicles start chasing near the player's current position
    // rather than teleporting all the way back to the oldest crumb.
    if (sv._crumbIdx === undefined) sv._crumbIdx = Math.max(0, crumbs.length - 1);

    const crumbs = playerVehicle._crumbs;
    if (!crumbs || crumbs.length === 0) continue;

    sv._crumbIdx = Math.max(0, Math.min(sv._crumbIdx, crumbs.length - 1));

    const targetCrumb = crumbs[sv._crumbIdx];

    const dx = targetCrumb.x - cv.x;
    const dy = targetCrumb.y - cv.y;
    const dToCrumb = Math.sqrt(dx * dx + dy * dy);

    if (dToCrumb < CONVOY_EJECT_RANGE && sv._crumbIdx < crumbs.length - 1) {
      sv._crumbIdx++;
      continue;
    }

    const dToPlayer = dist(cv.x, cv.y, playerVehicle.x, playerVehicle.y);

    let speed;
    if (dToPlayer > CONVOY_GAP_FAR)       speed = CONVOY_SPEED_CATCH_UP;
    else if (dToPlayer < CONVOY_GAP_NEAR) speed = CONVOY_SPEED_SLOW;
    else {
      const t = (dToPlayer - CONVOY_GAP_NEAR) / (CONVOY_GAP_FAR - CONVOY_GAP_NEAR);
      speed = CONVOY_SPEED_SLOW + (CONVOY_SPEED_BASE - CONVOY_SPEED_SLOW) * t;
    }

    if (dToCrumb > 1) {
      const nx = dx / dToCrumb, ny = dy / dToCrumb;
      cv.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, cv.x + nx * speed * dt));
      cv.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, cv.y + ny * speed * dt));
      cv.facing = Math.atan2(ny, nx);
      cv.occupied = true;
      sv.x = cv.x; sv.y = cv.y; sv.facing = cv.facing;
      if (buildings) {
        for (const b of buildings) resolveWallCollision(cv, b);
      }
    }

    if (cv.hp <= 0) {
      sv.x = cv.x + VEHICLE_RADIUS + PLAYER_RADIUS + 4;
      sv.y = cv.y;
      sv.command = "follow";
      sv.state = "idle";
      delete sv._crumbIdx;
      ejected.push(sv);
      entry._ejected = true;
    }
  }

  return ejected;
}

// ─── Survivor AI ─────────────────────────────────────────────────────────────

export const SURVIVOR_SPEED         = 130;
export const SURVIVOR_FLEE_SPEED    = 155;
export const SURVIVOR_FOLLOW_DIST   = 80;
export const SURVIVOR_INTERACT_RANGE = 70; // wider so survivors are easier to select while walking
export const SURVIVOR_FIGHT_RANGE   = 220;
export const SURVIVOR_FLEE_TRIGGER  = 200;
export const SURVIVOR_MELEE_RANGE   = 18;
export const SURVIVOR_MELEE_DAMAGE  = 12;
export const SURVIVOR_MELEE_RATE    = 1.0;
export const SURVIVOR_REPAIR_CAST   = 2.5;
export const SURVIVOR_HARVEST_CAST  = 2.0;
export const SURVIVOR_TURRET_WANDER = 150;
export const SURVIVOR_TURRET_REPAIR_HP_THRESHOLD = 0.6;
// Passive HP regen: 2 HP/sec, but only kicks in 3 seconds after last hit
export const SURVIVOR_HP_REGEN_RATE  = 2.0;  // HP per second
export const SURVIVOR_REGEN_DELAY    = 3.0;  // seconds after last hit before regen resumes

export function survivorNearestBuilding(entity, buildings) {
  let best = null, bestD = Infinity;
  for (const b of buildings) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const d = dist(entity.x, entity.y, cx, cy);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function survivorMoveTo(entity, tx, ty, speed, dt, buildings) {
  const dx = tx - entity.x, dy = ty - entity.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 4) return true;

  // Obstacle-steering: sample candidate directions and pick the best one.
  // Falls back to direct path when unobstructed; steers around walls otherwise.
  const baseAngle    = Math.atan2(dy, dx);
  const STEER_ANGLES = [0, -0.45, 0.45, -0.9, 0.9];
  const PROBE_DIST   = speed * dt * 3;

  let bestAngle = baseAngle;
  let bestScore = -Infinity;

  for (const offset of STEER_ANGLES) {
    const a  = baseAngle + offset;
    const px = entity.x + Math.cos(a) * PROBE_DIST;
    const py = entity.y + Math.sin(a) * PROBE_DIST;
    const remDx = tx - px, remDy = ty - py;
    let score = -(remDx * remDx + remDy * remDy);
    if (buildings) {
      for (const b of buildings) {
        if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) {
          score -= 999999;
          break;
        }
      }
    }
    if (score > bestScore) { bestScore = score; bestAngle = a; }
  }

  const nx = Math.cos(bestAngle), ny = Math.sin(bestAngle);
  entity.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, entity.x + nx * speed * dt));
  entity.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, entity.y + ny * speed * dt));
  entity.facing = bestAngle;
  if (buildings) {
    for (const b of buildings) resolveWallCollision(entity, b);
  }
  return false;
}

/**
 * When a follow target is inside a building (and the survivor is outside it, or
 * vice versa), return the center of the nearest open/broken door so the survivor
 * routes through the doorway instead of straight into the wall.
 * Returns null when no routing is needed (same side, or no doors available).
 */
function survivorDoorWaypoint(sv, targetX, targetY, buildings) {
  if (!buildings) return null;
  for (const b of buildings) {
    const svInside = sv.x > b.x && sv.x < b.x + b.w && sv.y > b.y && sv.y < b.y + b.h;
    const tgInside = targetX > b.x && targetX < b.x + b.w && targetY > b.y && targetY < b.y + b.h;
    if (svInside === tgInside) continue; // same side — no routing needed
    if (!b.doors || b.doors.length === 0) continue;
    // Find the nearest open/broken door
    let bestDoor = null, bestDist = Infinity;
    for (const door of b.doors) {
      if (!door.open && !door.broken) continue;
      const dc = getDoorCenter(b, door);
      const d = dist(sv.x, sv.y, dc.x, dc.y);
      if (d < bestDist) { bestDist = d; bestDoor = door; }
    }
    if (!bestDoor) {
      // All doors closed — find the nearest door anyway so the survivor at least
      // lines up with it (they may open it or wait nearby rather than wall-hugging)
      for (const door of b.doors) {
        const dc = getDoorCenter(b, door);
        const d = dist(sv.x, sv.y, dc.x, dc.y);
        if (d < bestDist) { bestDist = d; bestDoor = door; }
      }
    }
    if (bestDoor) return getDoorCenter(b, bestDoor);
  }
  return null;
}

function nearestZombieInRange(entity, zombies, range) {
  let best = null, bestD = Infinity;
  for (const z of zombies) {
    if (z.dead) continue;
    const d = dist(entity.x, entity.y, z.x, z.y);
    if (d < range && d < bestD) { bestD = d; best = z; }
  }
  return best;
}

function survivorAttack(survivor, zombies, dt) {
  if (survivor._attackCd > 0) { survivor._attackCd -= dt; return; }
  const z = nearestZombieInRange(survivor, zombies, SURVIVOR_MELEE_RANGE);
  if (!z) return;
  z.hp -= SURVIVOR_MELEE_DAMAGE;
  if (z.hp <= 0) z.dead = true;
  survivor._attackCd = 1 / SURVIVOR_MELEE_RATE;
}

export function tryAssignSurvivor(survivor, structureId, structureType) {
  survivor.command = "assign";
  survivor.assignedTo = { structureId, structureType };
  survivor.state = "idle";
  survivor._castTimer = 0;
  survivor._castType = null;
}

export function assignSurvivorToConvoy(survivor, convoyVehicles, vehicles, vehicleType = "car") {
  const taken = new Set(convoyVehicles.map(e => e.vehicle));
  // Sort by distance from the survivor so they always take the nearest free car,
  // not whichever vehicle happened to be first in the spawn array.
  const freeVehicle = [...vehicles]
    .filter(v => !taken.has(v) && !v.occupied)
    .sort((a, b) => {
      const da = (a.x - survivor.x) ** 2 + (a.y - survivor.y) ** 2;
      const db = (b.x - survivor.x) ** 2 + (b.y - survivor.y) ** 2;
      return da - db;
    })[0] ?? null;
  if (!freeVehicle) return null;

  freeVehicle.occupied = true;
  freeVehicle.driver   = `convoy_${survivor.id}`;
  if (!freeVehicle._id) freeVehicle._id = `cv_${survivor.id}`;
  survivor.command = "convoy";
  survivor.state   = "idle";

  const entry = { vehicle: freeVehicle, survivor };
  convoyVehicles.push(entry);
  return entry;
}

export function updateSurvivors(survivors, player, vehicle, zombies, turrets, gardenPlots, crops, buildings, dt, vehicles = null, player2 = null) {
  for (const sv of survivors) {
    if (sv.hp <= 0) continue;

    if (sv.barricaded) {
      survivorAttack(sv, zombies, dt);
      // Still apply hit cooldown and passive regen even while barricaded
      if (sv._hitCd > 0) sv._hitCd -= dt;
      if (sv._regenDelay > 0) {
        sv._regenDelay -= dt;
      } else if (sv.hp < sv.maxHp) {
        sv.hp = Math.min(sv.maxHp, sv.hp + SURVIVOR_HP_REGEN_RATE * dt);
      }
      // Unbarricade once HP recovers above flee threshold
      if (sv.hp > sv.fleeHp) {
        sv.barricaded = false;
        sv.barricadeBuilding = null;
        sv.state = "idle";
      }
      continue;
    }

    const shouldFlee = sv.hp <= sv.fleeHp;
    let effectiveCmd = sv.command;

    if (shouldFlee && effectiveCmd !== "barricaded") {
      effectiveCmd = "_flee_low_hp";
    }

    switch (effectiveCmd) {

      case "follow": {
        // Follow whoever issued the "follow" command (sv.followLeader), fallback to player
        const leader = sv.followLeader ?? player;

        // ── Vehicle boarding / riding ─────────────────────────────────────────
        // Determine which vehicle the leader is driving (could be any vehicle in
        // the fleet; we find whichever one claims the leader as driver/passenger).
        const leaderInVehicle = leader.inVehicle;

        if (sv.inVehicle) {
          // Already riding — check if the leader has since left the vehicle
          const ridingVehicle = sv._ridingVehicle;
          if (!ridingVehicle || !leaderInVehicle) {
            // Leader got out (or vehicle reference lost) — eject this survivor
            sv.inVehicle = false;
            if (ridingVehicle && ridingVehicle.survivorPassengers) {
              ridingVehicle.survivorPassengers = ridingVehicle.survivorPassengers.filter(id => id !== sv.id);
            }
            // Scatter slightly so survivors don't stack on top of each other
            sv.x = (ridingVehicle?.x ?? sv.x) + (Math.random() - 0.5) * 40;
            sv.y = (ridingVehicle?.y ?? sv.y) + (Math.random() - 0.5) * 40;
            sv._ridingVehicle = null;
            sv.state = "following";
          } else {
            // Stay synced to vehicle position
            sv.x = ridingVehicle.x;
            sv.y = ridingVehicle.y;
            sv.state = "riding";
          }
          break;
        }

        if (leaderInVehicle) {
          // Leader just entered a vehicle — search the full fleet for whichever
          // vehicle claims the leader as driver or passenger.
          // FIX 1: use the vehicles array passed from the caller instead of _fleet hack.
          const allVehicles = vehicles ? [...vehicles] : vehicle ? [vehicle] : [];

          // Determine the role string for this leader
          const leaderRole = (leader === player) ? "p1"
                           : (player2 && leader === player2) ? "p2"
                           : null;

          const leaderVehicle = leaderRole
            ? (allVehicles.find(v => v.driver === leaderRole || v.passenger === leaderRole) ?? vehicle)
            : vehicle;

          if (leaderVehicle) {
            const cfg = VEHICLE_TYPES[leaderVehicle.vehicleType] ?? VEHICLE_TYPES.car;
            const totalSeats = cfg.seats ?? 2;
            // Seats occupied by human players
            const humanOccupants = (leaderVehicle.driver ? 1 : 0) + (leaderVehicle.passenger ? 1 : 0);
            const survivorSeatsUsed = (leaderVehicle.survivorPassengers ?? []).length;
            const freeSeats = totalSeats - humanOccupants - survivorSeatsUsed;

            if (freeSeats > 0) {
              // Move toward the vehicle to board
              const dToVehicle = dist(sv.x, sv.y, leaderVehicle.x, leaderVehicle.y);
              if (dToVehicle < 55) {
                // Board!
                if (!leaderVehicle.survivorPassengers) leaderVehicle.survivorPassengers = [];
                leaderVehicle.survivorPassengers.push(sv.id);
                sv.inVehicle = true;
                sv._ridingVehicle = leaderVehicle;
                sv.x = leaderVehicle.x;
                sv.y = leaderVehicle.y;
                sv.state = "riding";
              } else {
                // Rush toward vehicle
                survivorMoveTo(sv, leaderVehicle.x, leaderVehicle.y, SURVIVOR_SPEED * 1.4, dt, buildings);
                sv.state = "following";
              }
              break;
            }
            // No free seat — fall through to normal foot-follow below
          }
        }

        // Normal on-foot following — offset to the side of the leader so the
        // survivor doesn't park directly behind them (makes T-selecting nearly
        // impossible because you'd have to walk into them to get in range).
        const leaderFacing = leader.facing ?? 0;
        // FIX 4: Assign a stable lateral slot based on this survivor's index among
        // all living followers of the same leader, rather than % 3 which causes
        // stacking whenever there are more than 3 followers.
        // We cache _followSlot on the survivor; if it's missing or null we assign it
        // based on how many survivors already have a slot (so new recruits get the
        // next free slot rather than colliding with existing ones).
        if (sv._followSlot == null) {
          const usedSlots = survivors
            .filter(s2 => s2 !== sv && s2.hp > 0 && s2.command === "follow" && s2._followSlot != null)
            .map(s2 => s2._followSlot);
          // Find the first slot index not already taken
          let slotIdx = 0;
          while (usedSlots.includes(slotIdx)) slotIdx++;
          sv._followSlot = slotIdx;
        }
        // Convert slot index → signed lateral offset:
        // slot 0 → 0, slot 1 → +1, slot 2 → −1, slot 3 → +2, slot 4 → −2, …
        const svSlot = sv._followSlot;
        const svLateralSign = svSlot === 0 ? 0 : svSlot % 2 === 1 ? 1 : -1;
        const svLateralMag  = Math.ceil(svSlot / 2);
        const lateralAngle = leaderFacing + Math.PI / 2;
        const behindX  = leader.x - Math.cos(leaderFacing) * SURVIVOR_FOLLOW_DIST;
        const behindY  = leader.y - Math.sin(leaderFacing) * SURVIVOR_FOLLOW_DIST;
        const targetX  = behindX + Math.cos(lateralAngle) * (svLateralSign * svLateralMag * 36);
        const targetY  = behindY + Math.sin(lateralAngle) * (svLateralSign * svLateralMag * 36);

        // If the follow target is on the other side of a building wall, route
        // through the nearest open door instead of walking straight into the wall.
        const doorWP = survivorDoorWaypoint(sv, targetX, targetY, buildings);
        const moveToX = doorWP ? doorWP.x : targetX;
        const moveToY = doorWP ? doorWP.y : targetY;

        const arrived = survivorMoveTo(sv, moveToX, moveToY, SURVIVOR_SPEED, dt, buildings);
        sv.state = arrived ? "idle" : "following";
        const nearby = nearestZombieInRange(sv, zombies, SURVIVOR_MELEE_RANGE);
        if (nearby) survivorAttack(sv, zombies, dt);
        break;
      }

      case "stay_here": {
        survivorAttack(sv, zombies, dt);
        sv.state = "idle";
        break;
      }

      case "stay_safe": {
        const threat = nearestZombieInRange(sv, zombies, SURVIVOR_FLEE_TRIGGER);
        if (threat) {
          const building = survivorNearestBuilding(sv, buildings);
          if (building) {
            const bx = building.x + building.w / 2, by = building.y + building.h / 2;
            survivorMoveTo(sv, bx, by, SURVIVOR_FLEE_SPEED, dt, buildings);
            sv.state = "fleeing";
          }
        } else {
          sv._wanderTimer -= dt;
          if (sv._wanderTimer <= 0) {
            sv._wanderTimer = 3 + Math.random() * 4;
            sv._wanderTargetX = sv.x + (Math.random() - 0.5) * 200;
            sv._wanderTargetY = sv.y + (Math.random() - 0.5) * 200;
            sv._wanderTargetX = Math.max(50, Math.min(WORLD_W - 50, sv._wanderTargetX));
            sv._wanderTargetY = Math.max(50, Math.min(WORLD_H - 50, sv._wanderTargetY));
          }
          const arrived = survivorMoveTo(sv, sv._wanderTargetX, sv._wanderTargetY, SURVIVOR_SPEED * 0.6, dt, buildings);
          sv.state = arrived ? "idle" : "following";
        }
        break;
      }

      case "fight": {
        const target = nearestZombieInRange(sv, zombies, SURVIVOR_FIGHT_RANGE);
        if (target) {
          const d = dist(sv.x, sv.y, target.x, target.y);
          if (d > SURVIVOR_MELEE_RANGE) {
            survivorMoveTo(sv, target.x, target.y, SURVIVOR_SPEED, dt, buildings);
            sv.state = "following";
          } else {
            survivorAttack(sv, zombies, dt);
            sv.state = "working";
          }
        } else {
          sv.state = "idle";
        }
        break;
      }

      case "assign": {
        if (!sv.assignedTo) { sv.command = "follow"; break; }
        const { structureId, structureType } = sv.assignedTo;

        if (structureType === "turret") {
          const turret = (turrets ?? []).find(t => t.id === structureId && !t.destroyed);
          if (!turret) { sv.command = "follow"; sv.assignedTo = null; break; }

          const dToTurret = dist(sv.x, sv.y, turret.x, turret.y);

          if (turret.hp < turret.maxHp * SURVIVOR_TURRET_REPAIR_HP_THRESHOLD) {
            if (dToTurret > TURRET_REPAIR_RANGE) {
              survivorMoveTo(sv, turret.x, turret.y, SURVIVOR_SPEED, dt, buildings);
              sv.state = "following";
              sv._castTimer = 0; sv._castType = null;
            } else {
              sv.state = "working";
              sv._castType = "repair";
              sv._castTimer += dt;
              if (sv._castTimer >= SURVIVOR_REPAIR_CAST) {
                sv._castTimer = 0;
                turret.hp = Math.min(turret.maxHp, turret.hp + TURRET_REPAIR_HP);
              }
            }
          } else {
            sv._castTimer = 0; sv._castType = null;
            sv._wanderTimer -= dt;
            if (sv._wanderTimer <= 0) {
              sv._wanderTimer = 3 + Math.random() * 4;
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * SURVIVOR_TURRET_WANDER;
              sv._wanderTargetX = Math.max(50, Math.min(WORLD_W - 50, turret.x + Math.cos(angle) * r));
              sv._wanderTargetY = Math.max(50, Math.min(WORLD_H - 50, turret.y + Math.sin(angle) * r));
            }
            survivorMoveTo(sv, sv._wanderTargetX, sv._wanderTargetY, SURVIVOR_SPEED * 0.7, dt, buildings);
            sv.state = "idle";
          }

          const nearby = nearestZombieInRange(sv, zombies, SURVIVOR_MELEE_RANGE);
          if (nearby) survivorAttack(sv, zombies, dt);

        } else if (structureType === "crop") {
          const plot = (gardenPlots ?? []).find(p => p.id === structureId);
          if (!plot) { sv.command = "follow"; sv.assignedTo = null; break; }

          const plotCx = plot.x + plot.w / 2, plotCy = plot.y + plot.h / 2;
          const dToPlot = dist(sv.x, sv.y, plotCx, plotCy);
          const readyCrop = (crops ?? []).find(c => c.plotId === plot.id && c.stage === "ready");

          const threat = sv.priority === "safety_first"
            ? nearestZombieInRange(sv, zombies, SURVIVOR_FLEE_TRIGGER)
            : null;

          if (threat) {
            const building = survivorNearestBuilding(sv, buildings);
            if (building) {
              survivorMoveTo(sv, building.x + building.w / 2, building.y + building.h / 2, SURVIVOR_FLEE_SPEED, dt, buildings);
              sv.state = "fleeing";
            }
            sv._castTimer = 0; sv._castType = null;
          } else if (readyCrop) {
            if (dToPlot > 80) {
              survivorMoveTo(sv, plotCx, plotCy, SURVIVOR_SPEED, dt, buildings);
              sv.state = "following";
              sv._castTimer = 0; sv._castType = null;
            } else {
              sv.state = "working";
              sv._castType = "harvest";
              sv._castTimer += dt;
              if (sv._castTimer >= SURVIVOR_HARVEST_CAST) {
                sv._castTimer = 0;
                readyCrop.stage = "harvested";
                readyCrop.dead = true;

                const harvestedPlot = (gardenPlots ?? []).find(p => p.id === readyCrop.plotId);
                if (harvestedPlot && getInventoryCount(player.inventory, "seeds") >= 1) {
                  removeFromInventory(player.inventory, "seeds", 1);
                  const newCrop = createCrop(harvestedPlot.id, "potato", harvestedPlot.x, harvestedPlot.y);
                  if (crops) crops.push(newCrop);
                }
              }
            }
          } else {
            const plotEmpty = !(crops ?? []).some(c => c.plotId === plot.id && !c.dead);
            if (plotEmpty && getInventoryCount(player.inventory, "seeds") >= 1) {
              if (dToPlot > 80) {
                survivorMoveTo(sv, plotCx, plotCy, SURVIVOR_SPEED, dt, buildings);
                sv.state = "following";
                sv._castTimer = 0; sv._castType = null;
              } else {
                sv.state = "working";
                sv._castType = "plant";
                sv._castTimer += dt;
                if (sv._castTimer >= SURVIVOR_HARVEST_CAST) {
                  sv._castTimer = 0;
                  if (getInventoryCount(player.inventory, "seeds") >= 1) {
                    removeFromInventory(player.inventory, "seeds", 1);
                    const newCrop = createCrop(plot.id, "potato", plot.x, plot.y);
                    if (crops) crops.push(newCrop);
                  }
                }
              }
            } else {
              sv._castTimer = 0; sv._castType = null;
              if (dToPlot > 100) {
                survivorMoveTo(sv, plotCx, plotCy, SURVIVOR_SPEED * 0.6, dt, buildings);
                sv.state = "following";
              } else {
                sv.state = "idle";
              }
            }
          }
        }
        break;
      }

      case "_flee_low_hp": {
        const building = survivorNearestBuilding(sv, buildings);
        if (building) {
          const bx = building.x + building.w / 2, by = building.y + building.h / 2;
          const arrived = survivorMoveTo(sv, bx, by, SURVIVOR_FLEE_SPEED, dt, buildings);
          sv.state = "fleeing";
          if (arrived && isInsideBuilding(sv, building)) {
            sv.barricaded = true;
            sv.barricadeBuilding = building.id;
            sv.state = "barricaded";
          }
        }
        break;
      }

      default:
        sv.state = "idle";
    }

    for (const z of zombies) {
      if (z.dead) continue;
      if (z.state !== "attack" && z.state !== "chase") continue;
      const d = dist(sv.x, sv.y, z.x, z.y);
      if (d > ZOMBIE_ATTACK_RANGE + sv.radius) continue;
      if (!sv._hitCd || sv._hitCd <= 0) {
        sv.hp = Math.max(0, sv.hp - ZOMBIE_ATTACK_DAMAGE);
        sv._hitCd = ZOMBIE_ATTACK_RATE;
        sv._regenDelay = SURVIVOR_REGEN_DELAY; // reset regen delay on hit
        sv._castTimer = 0; sv._castType = null;
      }
    }
    if (sv._hitCd > 0) sv._hitCd -= dt;

    // ── Passive HP regen ───────────────────────────────────────────────────────
    if (sv._regenDelay > 0) {
      sv._regenDelay -= dt;
    } else if (sv.hp < sv.maxHp) {
      sv.hp = Math.min(sv.maxHp, sv.hp + SURVIVOR_HP_REGEN_RATE * dt);
    }
  }

  // Separate survivors from each other so they don't overlap
  const aliveSurvivors = survivors.filter(sv => sv.hp > 0 && !sv.inVehicle);
  separateEntityLists(aliveSurvivors, aliveSurvivors);
}

// ─── Activity log ────────────────────────────────────────────────────────────

const MAX_ACTIVITY = 40;

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

export const SURVIVOR_XP_PER_KILL      = 8;
export const SURVIVOR_XP_PER_HARVEST   = 3;
export const SURVIVOR_XP_PER_CRAFT     = 5;
export const SURVIVOR_XP_TABLE         = [0, 50, 120, 220, 360, 550, 800, 1100, 1500, 2000];

export function survivorXpToLevel(xp) {
  let level = 1;
  for (let i = 1; i < SURVIVOR_XP_TABLE.length; i++) {
    if (xp >= SURVIVOR_XP_TABLE[i]) level = i + 1;
    else break;
  }
  return level;
}

/** Award XP to a survivor; returns true if they levelled up. */
export function awardSurvivorXp(sv, amount) {
  if (!sv) return false;
  sv.xp = (sv.xp ?? 0) + amount;
  const newLevel = survivorXpToLevel(sv.xp);
  if (newLevel > (sv.level ?? 1)) {
    sv.level = newLevel;
    return true; // levelled up
  }
  sv.level = sv.level ?? 1;
  return false;
}

// ─── Workstation passive generation rates ─────────────────────────────────────
// FIX 2: Constants used by baseTick so the 4 workstations produce resources
// passively every real-second tick. Rate is resources-per-second of real time.
// Values intentionally small — they reward being at base, not idle-game grinding.

export const WORKSTATION_OUTPUT = {
  kitchen:    { food:  0.010 },  // ~36 food/hour
  workshop:   { scrap: 0.006, nails: 0.004 },  // ~22 scrap/hour
  farm:       { seeds: 0.004 },  // ~14 seeds/hour
  guard_post: {},                // guard_post grants defence (handled in combat), not resources
};

/** Helper: add resource to baseStorage, initialising if absent. */
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
    for (const [resource, ratePerSec] of Object.entries(rates)) {
      const amount = ratePerSec * dtReal;
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

export const CRAFTING_RECIPES = [
  {
    id:      "scrap_to_parts",
    label:   "Car Parts",
    icon:    "⚙️",
    desc:    "Salvage scrap into usable car parts",
    inputs:  { scrap: 6 },
    outputs: { car_parts: 1 },
    seconds: 8,
  },
  {
    id:      "wood_barricade",
    label:   "Barricade Kit",
    icon:    "🪵",
    desc:    "Pre-cut lumber and nails for fast barricading",
    inputs:  { wood: 4, nails: 6 },
    outputs: { barricade_kit: 1 },
    seconds: 6,
  },
  {
    id:      "wheat_bread",
    label:   "Bread",
    icon:    "🍞",
    desc:    "Bake wheat into portable rations",
    inputs:  { food: 3 },
    outputs: { food: 5 },
    seconds: 10,
  },
  {
    id:      "turret_kit",
    label:   "Turret Kit",
    icon:    "🗼",
    desc:    "Fabricate a deployable auto-turret",
    inputs:  { scrap: 4, nails: 8 },
    outputs: { turret_kit: 1 },
    seconds: 15,
  },
  {
    id:      "water_purify",
    label:   "Purified Water",
    icon:    "💧",
    desc:    "Boil and purify water for storage",
    inputs:  { water: 2 },
    outputs: { water: 4 },
    seconds: 8,
  },
];

/**
 * Attempt to craft a recipe from baseStorage.
 * Returns { success, recipe, missing } where missing is {key: shortfall}.
 * Mutates state.baseStorage on success and awards XP to any kitchen/workshop survivor.
 */
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

export const WORKSTATION_DEFS = [
  {
    id:    "kitchen",
    label: "Kitchen",
    icon:  "🍳",
    desc:  "Produces food passively. Enables cooking recipes.",
    color: "rgba(255,160,60,0.9)",
  },
  {
    id:    "workshop",
    label: "Workshop",
    icon:  "🔧",
    desc:  "Produces scrap & nails. Enables fabrication recipes.",
    color: "rgba(255,200,60,0.9)",
  },
  {
    id:    "farm",
    label: "Farm",
    icon:  "🌾",
    desc:  "Produces seeds passively for replanting.",
    color: "rgba(120,210,80,0.9)",
  },
  {
    id:    "guard_post",
    label: "Guard Post",
    icon:  "🛡️",
    desc:  "Boosts base defence. Reduces turret decay.",
    color: "rgba(255,100,80,0.9)",
  },
];

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

export const AUTO_MELEE_RANGE    = MELEE_RANGE  ?? 32;
export const AUTO_LOOT_RANGE     = LOOT_RANGE;
export const AUTO_FLEE_RANGE     = 55;
export const AUTO_VEHICLE_RANGE  = 60;
export const AUTO_THREAT_RANGE   = 100;
// How many seconds after spawn the AI is in "safety first" mode.
export const AUTO_SPAWN_GRACE    = 4.0;
// How many zombies near a loot pile make it not worth grabbing on foot.
export const AUTO_LOOT_DANGER_THRESHOLD = 3;
// Radius checked around a loot pile before deciding it's too hot.
export const AUTO_LOOT_DANGER_RANGE     = AUTO_THREAT_RANGE * 0.8;
// Search radius for "any available vehicle in the fleet" fallback.
export const AUTO_FLEET_SEEK_RANGE  = 900;

// Needs thresholds — AI pauses everything to eat/drink/sleep at these levels.
export const AUTO_EAT_AT   = 25;   // food ≤ this → eat if possible
export const AUTO_DRINK_AT = 25;   // water ≤ this → drink if possible
export const AUTO_SLEEP_AT = 25;   // sleep ≤ this → find safe spot and sleep
export const AUTO_SLEEP_UNTIL = 100; // sleep until this level before waking

export function updateAutoPlayer(player, state, dt) {
  const { zombies = [], lootPiles = [], buildings = [], compassTarget, bossZombie } = state;
  const inVehicle = player.inVehicle;

  // ── Resolve current vehicle position ─────────────────────────────────────
  // Use the vehicle the player is actually occupying (driver or passenger),
  // not the potentially-stale state.vehicle singleton.
  const allVehicles = state.vehicles ?? (state.vehicle ? [state.vehicle] : []);
  const myVehicle   = inVehicle
    ? (allVehicles.find(v => v.driver === "p1" || v.passenger === "p1") ?? state.vehicle)
    : null;

  const px = (inVehicle && myVehicle) ? myVehicle.x : player.x;
  const py = (inVehicle && myVehicle) ? myVehicle.y : player.y;

  // ── Helper: normalised direction toward target ────────────────────────────
  function toward(tx, ty) {
    const dx = tx - px, dy = ty - py;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return { dx: 0, dy: 0 };
    return { dx: dx / len, dy: dy / len };
  }

  // ── Wall-stuck detector ───────────────────────────────────────────────────
  // Tracks position every STUCK_SAMPLE_INTERVAL seconds. If the player has
  // moved less than STUCK_MIN_DIST in that window while trying to move, they
  // are stuck on a wall. We rotate the intended direction by STUCK_ROTATE_DEG
  // and accumulate the rotation each consecutive stuck interval so the AI
  // spirals around corners rather than oscillating in one spot.
  //
  // Vehicles move ~2× faster than foot, so we use a proportionally larger
  // minimum-distance threshold — otherwise the detector fires too slowly
  // and the vehicle spends multiple intervals grinding against a wall.
  //
  // The rotation is stored on the player object so it persists across frames.
  // It resets automatically once the player is moving freely again.
  const STUCK_SAMPLE_INTERVAL = 0.35;  // seconds between position snapshots
  const STUCK_MIN_DIST        = inVehicle ? 28 : 12; // px — larger for fast vehicles
  const STUCK_ROTATE_DEG      = inVehicle ? 45 : 55; // vehicles need shallower arc to stay on road

  if (!player._stuckTimer)    player._stuckTimer    = 0;
  if (!player._stuckSampleX)  player._stuckSampleX  = px;
  if (!player._stuckSampleY)  player._stuckSampleY  = py;
  if (!player._stuckRotation) player._stuckRotation = 0;

  player._stuckTimer += dt;
  if (player._stuckTimer >= STUCK_SAMPLE_INTERVAL) {
    const moved = dist(px, py, player._stuckSampleX, player._stuckSampleY);
    if (moved < STUCK_MIN_DIST) {
      // Still stuck — accumulate more rotation, capped at ~150° so the AI
      // never points backward and oscillates in a permanent loop.
      const MAX_STUCK_ROT = 150 * (Math.PI / 180);
      player._stuckRotation = Math.min(
        player._stuckRotation + STUCK_ROTATE_DEG * (Math.PI / 180),
        MAX_STUCK_ROT
      );
    } else {
      // Moving freely — decay rotation back toward 0
      player._stuckRotation *= 0.3;
      if (Math.abs(player._stuckRotation) < 0.05) player._stuckRotation = 0;
    }
    player._stuckTimer   = 0;
    player._stuckSampleX = px;
    player._stuckSampleY = py;
  }

  // Apply rotation to a direction vector when the player is stuck.
  // Returns the original direction if not stuck.
  function unstuck(dirObj) {
    const rot = player._stuckRotation;
    if (!rot) return dirObj;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    return {
      dx: dirObj.dx * cos - dirObj.dy * sin,
      dy: dirObj.dx * sin + dirObj.dy * cos,
    };
  }

  // ── Helper: door-aware waypoint toward a loot pile ───────────────────────
  // Returns the point the AI should walk toward to reach the pile:
  //   • Pile is outside (or in an open building): the pile itself.
  //   • Pile is inside a building and player is OUTSIDE: interior face of the
  //     best open/broken door (32px inside the wall so the AI clears the
  //     threshold and wall-collision doesn't block forward progress).
  //   • Pile is inside a building and player is ALREADY INSIDE: the pile itself.
  // If all doors are closed/intact the pile is effectively inaccessible right
  // now — returns null so the caller can skip it.
  // Does the straight segment a→b pass through building b's footprint?
  // Cheap probe-point sampler; used to avoid routing the AI's door approach
  // straight through the building when the chosen door is on the far side.
  function segCrossesBuilding(ax, ay, bx, by, bld) {
    for (let t = 0.08; t < 1; t += 0.08) {
      const sx = ax + (bx - ax) * t;
      const sy = ay + (by - ay) * t;
      if (sx > bld.x && sx < bld.x + bld.w && sy > bld.y && sy < bld.y + bld.h) return true;
    }
    return false;
  }

  function getLootWaypoint(pile) {
    const pileBuilding = buildings.find(b =>
      pile.x > b.x && pile.x < b.x + b.w &&
      pile.y > b.y && pile.y < b.y + b.h
    );
    if (!pileBuilding) return { x: pile.x, y: pile.y }; // pile is outside

    // Already inside the pile's building — walk straight to the pile.
    // This is the ONLY condition that switches us from "thread the doorway" to
    // "go to the pile". The old code used a 90px distance shortcut that fired
    // while the AI was still OUTSIDE the wall (the interior point is 52px in,
    // reached from ~36px out = 88px < 90px), sending the AI diagonally into the
    // wall beside the door. Gating on isInsideBuilding eliminates that.
    if (isInsideBuilding({ x: px, y: py }, pileBuilding)) return { x: pile.x, y: pile.y };

    // Player is outside — need an open/broken door to get in.
    const openDoors = (pileBuilding.doors ?? []).filter(d => d.open || d.broken);
    if (openDoors.length === 0) return null; // no way in yet

    const OUT = 36, IN = 52;
    const exteriorOf = (door) => {
      const dc = getDoorCenter(pileBuilding, door);
      return {
        north: { x: dc.x,       y: dc.y - OUT },
        south: { x: dc.x,       y: dc.y + OUT },
        west:  { x: dc.x - OUT, y: dc.y       },
        east:  { x: dc.x + OUT, y: dc.y       },
      }[door.side] ?? { x: dc.x, y: dc.y - OUT };
    };
    const interiorOf = (door) => {
      const dc = getDoorCenter(pileBuilding, door);
      return {
        north: { x: dc.x,      y: dc.y + IN },
        south: { x: dc.x,      y: dc.y - IN },
        west:  { x: dc.x + IN, y: dc.y       },
        east:  { x: dc.x - IN, y: dc.y       },
      }[door.side] ?? { x: dc.x, y: dc.y + IN };
    };

    // Pick the best door: (player→door) + (door→pile), but heavily penalise any
    // door whose exterior approach point can't be reached without walking
    // through the building (i.e. the door faces away from us). For a building
    // with a near-side door this guarantees we use it.
    let bestDoor = null, bestScore = Infinity;
    for (const door of openDoors) {
      const dc  = getDoorCenter(pileBuilding, door);
      const ext = exteriorOf(door);
      let score = dist(px, py, dc.x, dc.y) * 0.5 + dist(dc.x, dc.y, pile.x, pile.y) * 0.5;
      if (segCrossesBuilding(px, py, ext.x, ext.y, pileBuilding)) score += 100000;
      if (score < bestScore) { bestScore = score; bestDoor = door; }
    }

    const exterior = exteriorOf(bestDoor);
    const interior = interiorOf(bestDoor);
    const dc2      = getDoorCenter(pileBuilding, bestDoor);

    // Threading decision is based on LATERAL alignment with the door gap, NOT on
    // distance/depth. Depth-based switching yo-yos when the AI sits near the
    // stage boundary; lateral switching is stable because both the exterior and
    // interior targets lie on the door's centreline:
    //   • Off to the side of the gap → aim at the exterior point to line up.
    //   • Laterally within the gap     → aim at the interior point and walk
    //     straight through; isInsideBuilding() then flips us to the pile.
    // (For the rare building whose only open door faces away, the door-score
    //  penalty above already prefers any reachable door; a genuinely far-side
    //  single door is rounded by the engine's wall-slide + unstuck rotation.)
    const horiz   = (bestDoor.side === "north" || bestDoor.side === "south");
    const lateral = horiz ? Math.abs(px - dc2.x) : Math.abs(py - dc2.y);
    const halfGap = (bestDoor.width ?? 28) / 2;
    if (lateral <= halfGap) return interior;
    return exterior;
  }

  // ── Helper: exit waypoint when player is trapped inside a building ────────
  // Returns the exterior face of the nearest open/broken door, or null if
  // the player is not inside any building.
  // Also returns an open_door action if the nearest exit door is still closed,
  // so the AI can let itself out rather than standing at a sealed wall.
  function getBuildingExitWaypoint() {
    const playerBuilding = buildings.find(b => isInsideBuilding({ x: px, y: py }, b));
    if (!playerBuilding) return null;
    const openDoors = (playerBuilding.doors ?? []).filter(d => d.open || d.broken);
    const doorsToUse = openDoors.length > 0 ? openDoors : (playerBuilding.doors ?? []);
    let best = null, bestDist = Infinity, bestDoor = null;
    for (const door of doorsToUse) {
      const dc = getDoorCenter(playerBuilding, door);
      const exterior = {
        north: { x: dc.x,      y: dc.y - 32 },
        south: { x: dc.x,      y: dc.y + 32 },
        west:  { x: dc.x - 32, y: dc.y      },
        east:  { x: dc.x + 32, y: dc.y      },
      }[door.side] ?? { x: dc.x, y: dc.y - 32 };
      const d = dist(px, py, exterior.x, exterior.y);
      if (d < bestDist) { bestDist = d; best = exterior; bestDoor = door; }
    }
    if (!best) return null;
    // If the best available door is still closed, open it first (fires once we're
    // close enough to the door centre) so the AI doesn't deadlock at a sealed wall.
    if (bestDoor && !bestDoor.open && !bestDoor.broken) {
      const dc = getDoorCenter(playerBuilding, bestDoor);
      if (dist(px, py, dc.x, dc.y) < 50) {
        return { x: best.x, y: best.y, openDoorFirst: true };
      }
    }
    return best;
  }

  // ── Helper: universal on-foot exit-building guard ─────────────
  // Call before any on-foot toward() that aims at a target that may be outside
  // the player's current building. Returns an exit move object if the player
  // is trapped inside a building whose walls lie between them and the target,
  // or null if the player is already outside (or target is in the same building).
  function exitBuildingIfNeeded(targetX, targetY, behavior = "exit_building") {
    if (inVehicle) return null;
    const playerBuilding = buildings.find(b => isInsideBuilding({ x: px, y: py }, b));
    if (!playerBuilding) return null;
    const targetInSame = (
      targetX > playerBuilding.x && targetX < playerBuilding.x + playerBuilding.w &&
      targetY > playerBuilding.y && targetY < playerBuilding.y + playerBuilding.h
    );
    if (targetInSame) return null;
    const openDoors = (playerBuilding.doors ?? []).filter(d => d.open || d.broken);
    const doorsToUse = openDoors.length > 0 ? openDoors : (playerBuilding.doors ?? []);
    let best = null, bestDist = Infinity;
    for (const door of doorsToUse) {
      const dc = getDoorCenter(playerBuilding, door);
      const exterior = {
        north: { x: dc.x,      y: dc.y - 32 },
        south: { x: dc.x,      y: dc.y + 32 },
        west:  { x: dc.x - 32, y: dc.y      },
        east:  { x: dc.x + 32, y: dc.y      },
      }[door.side] ?? { x: dc.x, y: dc.y - 32 };
      const d = dist(px, py, exterior.x, exterior.y);
      if (d < bestDist) { bestDist = d; best = exterior; }
    }
    if (!best) return null;
    return { ...unstuck(toward(best.x, best.y)), action: null, autoBehavior: behavior };
  }

  // ── Helper: building-aware on-foot navigation ─────────────────────────────
  // Returns a normalised { dx, dy } toward (tx,ty) that does NOT beeline through
  // buildings. This replaces the old "exitBuildingIfNeeded + toward()" pattern,
  // which exited a building then walked straight back into it (the in/out
  // oscillation). Behaviour:
  //   • Inside a building, target elsewhere → leave via the door that best heads
  //     toward the target (not just the nearest door).
  //   • A building lies on the straight path → route around it, stepping only to
  //     corners reachable WITHOUT crossing that building (forces near-corner-first
  //     routing so we don't cut back through a doorway). Among reachable corners
  //     pick the one nearest the target; if boxed against a wall, slide to the
  //     nearest corner to escape. A small per-player memory damps corner flicker.
  //   • Clear path → straight toward the target.
  // `allowBldg` (optional): a building the caller is intentionally approaching
  //   (e.g. the door we're walking to) so it isn't treated as an obstacle.
  function segCrossesBuildingPad(ax, ay, bx, by, bld, pad) {
    const x0 = bld.x - pad, y0 = bld.y - pad, x1 = bld.x + bld.w + pad, y1 = bld.y + bld.h + pad;
    const N = 20;
    for (let i = 1; i < N; i++) {
      const t = i / N;
      const sx = ax + (bx - ax) * t, sy = ay + (by - ay) * t;
      if (sx > x0 && sx < x1 && sy > y0 && sy < y1) return true;
    }
    return false;
  }

  function footNavTo(tx, ty, allowBldg = null) {
    const myB = buildings.find(b => isInsideBuilding({ x: px, y: py }, b));
    const targetBldg = buildings.find(b =>
      tx > b.x && tx < b.x + b.w && ty > b.y && ty < b.y + b.h
    );

    // 1) Inside a building, target elsewhere → exit via the door toward the target.
    if (myB && myB !== targetBldg) {
      const doors = myB.doors ?? [];
      const open  = doors.filter(d => d.open || d.broken);
      const use   = open.length ? open : doors;
      let best = null, bestCost = Infinity;
      for (const d of use) {
        const dc = getDoorCenter(myB, d);
        const ext = {
          north: { x: dc.x,      y: dc.y - 32 },
          south: { x: dc.x,      y: dc.y + 32 },
          west:  { x: dc.x - 32, y: dc.y      },
          east:  { x: dc.x + 32, y: dc.y      },
        }[d.side] ?? { x: dc.x, y: dc.y - 32 };
        const cost = dist(px, py, dc.x, dc.y) + dist(ext.x, ext.y, tx, ty);
        if (cost < bestCost) { bestCost = cost; best = ext; }
      }
      if (best) return toward(best.x, best.y);
    }

    // 2) A building blocks the straight path → route around its corner.
    const PAD = PLAYER_RADIUS + 6;
    let blocker = null, blockerD = Infinity;
    for (const b of buildings) {
      if (b === targetBldg || b === myB) continue;
      if (allowBldg && b.id === allowBldg.id) continue;
      if (!segCrossesBuildingPad(px, py, tx, ty, b, PAD)) continue;
      const d = dist(px, py, b.x + b.w / 2, b.y + b.h / 2);
      if (d < blockerD) { blockerD = d; blocker = b; }
    }
    if (blocker) {
      const M = PLAYER_RADIUS + 24; // wider clearance — old 16 let the AI clip corner geometry
      const corners = [
        { x: blocker.x - M,               y: blocker.y - M },
        { x: blocker.x + blocker.w + M,   y: blocker.y - M },
        { x: blocker.x - M,               y: blocker.y + blocker.h + M },
        { x: blocker.x + blocker.w + M,   y: blocker.y + blocker.h + M },
      ];
      const reachable = corners.filter(c => !segCrossesBuildingPad(px, py, c.x, c.y, blocker, PLAYER_RADIUS + 2));
      let best;
      if (reachable.length) {
        // Progress: the reachable corner nearest the final target.
        best = reachable[0]; let bc = Infinity;
        for (const c of reachable) { const cost = dist(c.x, c.y, tx, ty); if (cost < bc) { bc = cost; best = c; } }
      } else {
        // Boxed against a wall: slide to the nearest corner to escape the pad band.
        best = corners[0]; let bc = Infinity;
        for (const c of corners) { const cost = dist(px, py, c.x, c.y); if (cost < bc) { bc = cost; best = c; } }
      }
      // Flicker damping: keep the previously chosen corner on this blocker while
      // still en route to it and it remains reachable.
      // Release threshold is M + 8 (fully past the corner waypoint's pad band)
      // rather than the old 18 px, which fired before the AI had cleared the
      // corner — causing it to immediately re-evaluate and snap to a wrong corner.
      const CORNER_RELEASE = M + 8; // must be > M so we're truly past it
      const mem = player._navCorner;
      if (mem && mem.bId === blocker.id && dist(px, py, mem.x, mem.y) > CORNER_RELEASE &&
          !segCrossesBuildingPad(px, py, mem.x, mem.y, blocker, PLAYER_RADIUS + 2)) {
        best = { x: mem.x, y: mem.y };
      }
      player._navCorner = { x: best.x, y: best.y, bId: blocker.id };
      return toward(best.x, best.y);
    }

    // 3) Clear path.
    player._navCorner = null;
    return toward(tx, ty);
  }

  // ── Helper: find the best available vehicle in the full fleet ─────────────
  // "Available" = not destroyed (hp > 0), not occupied by someone else,
  //   within AUTO_FLEET_SEEK_RANGE.  Returns null if none found.
  function findNearestAvailableVehicle() {
    let best = null, bestD = Infinity;
    for (const v of allVehicles) {
      if (v.hp <= 0) continue;                            // destroyed
      if (v.occupied && v.driver !== "p1" && v.passenger !== "p1") continue; // occupied by others
      const d = dist(px, py, v.x, v.y);
      if (d < bestD && d < AUTO_FLEET_SEEK_RANGE) { best = v; bestD = d; }
    }
    return best;
  }

  // ── Count nearby active zombies (outside buildings only) ────────────────
  // Zombies inside buildings can't be hit by the vehicle and can't be reached
  // on foot without opening the door first — exclude them from ALL threat
  // calculations so the AI never drives into a wall chasing them.
  const nearbyThreats = zombies.filter(z => {
    if (z.dead) return false;
    if (dist(px, py, z.x, z.y) >= AUTO_THREAT_RANGE) return false;
    // Exclude zombies that are inside any building
    if (buildings.some(b => isInsideBuilding(z, b))) return false;
    return true;
  });
  const closestThreat = nearbyThreats.length > 0
    ? nearbyThreats.reduce((a, b) => dist(px, py, a.x, a.y) < dist(px, py, b.x, b.y) ? a : b)
    : null;

  // ── Spawn grace timer ─────────────────────────────────────────────────────
  // Initialised on first call; counts down in real seconds via dt.
  if (player._autoSpawnGrace === undefined) player._autoSpawnGrace = AUTO_SPAWN_GRACE;
  if (player._autoSpawnGrace > 0) {
    player._autoSpawnGrace = Math.max(0, player._autoSpawnGrace - dt);
  }
  const inSpawnGrace = player._autoSpawnGrace > 0;

  // ── 0. SPAWN SAFETY — beeline for nearest vehicle, flee zombie centroid ───
  if (inSpawnGrace && !inVehicle) {
    const safeVehicle = findNearestAvailableVehicle();

    if (safeVehicle) {
      const dToVehicle = dist(px, py, safeVehicle.x, safeVehicle.y);

      // Close enough — enter it
      if (dToVehicle < AUTO_VEHICLE_RANGE) {
        return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "spawn_enter_vehicle" };
      }

      // Zombies directly between us and the car — arc around them slightly
      if (nearbyThreats.length > 0 && closestThreat) {
        const dToThreat = dist(px, py, closestThreat.x, closestThreat.y);
        if (dToThreat < AUTO_FLEE_RANGE) {
          // Blend: 70% toward vehicle, 30% away from closest threat
          const toV   = toward(safeVehicle.x, safeVehicle.y);
          const fromZ = toward(closestThreat.x, closestThreat.y);
          const bx    = toV.dx * 0.7 - fromZ.dx * 0.3;
          const by    = toV.dy * 0.7 - fromZ.dy * 0.3;
          const bLen  = Math.sqrt(bx * bx + by * by) || 1;
          return { dx: bx / bLen, dy: by / bLen, action: null, autoBehavior: "spawn_arc_to_vehicle" };
        }
      }

      // Clear path — just go to the vehicle
      return { ...unstuck(toward(safeVehicle.x, safeVehicle.y)), action: null, autoBehavior: "spawn_to_vehicle" };
    }

    // No vehicle found at all — flee away from zombie centroid if threatened
    if (nearbyThreats.length > 0) {
      const cx = nearbyThreats.reduce((s2, z) => s2 + z.x, 0) / nearbyThreats.length;
      const cy = nearbyThreats.reduce((s2, z) => s2 + z.y, 0) / nearbyThreats.length;
      const { dx, dy } = toward(cx, cy);
      return { dx: -dx, dy: -dy, action: null, autoBehavior: "spawn_flee_no_vehicle" };
    }

    return { dx: 0, dy: 0, action: null, autoBehavior: "spawn_idle" };
  }

  // ── 0b. NEEDS — eat, drink, sleep when critical ───────────────────────────
  // Skip if the player is already sleeping (let sleep finish) or downed.
  // This fires before flee/fight so the AI doesn't starve mid-combat, but only
  // triggers when it's *possible* to act (not during the spawn grace period).

  // If the AI is currently auto-sleeping, keep returning auto_sleep so the
  // GameView handler can monitor sleep level and wake at AUTO_SLEEP_UNTIL.
  if (!inSpawnGrace && player.isSleeping && !player.isDowned && player._autoSleeping) {
    return { dx: 0, dy: 0, action: "auto_sleep", autoBehavior: "needs_sleeping" };
  }

  if (!inSpawnGrace && !player.isSleeping && !player.isDowned) {

    // ── EAT ────────────────────────────────────────────────────────────────
    // Trigger at AUTO_EAT_AT; keep eating until food reaches 100.
    if (player._autoEating || (player.food <= AUTO_EAT_AT && getInventoryCount(player.inventory, "food") > 0)) {
      if (player.food < 95 && getInventoryCount(player.inventory, "food") > 0) {
        player._autoEating = true;
        if (inVehicle) {
          return { dx: 0, dy: 0, action: "exit_vehicle_for_needs", autoBehavior: "needs_exit_for_eat" };
        }
        return { dx: 0, dy: 0, action: "auto_eat", autoBehavior: "needs_eat" };
      }
      player._autoEating = false; // reached 100 or ran out of food
    }

    // ── DRINK ─────────────────────────────────────────────────────────────
    // Trigger at AUTO_DRINK_AT; keep drinking until water reaches 100.
    if (player._autoDrinking || (player.water <= AUTO_DRINK_AT && getInventoryCount(player.inventory, "water") > 0)) {
      if (player.water < 95 && getInventoryCount(player.inventory, "water") > 0) {
        player._autoDrinking = true;
        if (inVehicle) {
          return { dx: 0, dy: 0, action: "exit_vehicle_for_needs", autoBehavior: "needs_exit_for_drink" };
        }
        return { dx: 0, dy: 0, action: "auto_drink", autoBehavior: "needs_drink" };
      }
      player._autoDrinking = false; // reached 100 or ran out of water
    }

    // ── SLEEP ─────────────────────────────────────────────────────────────
    // Only trigger sleep when no nearby threats (don't sleep in combat).
    if (player.sleep <= AUTO_SLEEP_AT && nearbyThreats.length === 0) {
      // Find a nearby indoor building with no zombies inside as a safe sleep spot.
      const safeSleepBuilding = buildings.find(b => {
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        if (dist(px, py, cx, cy) > 800) return false;
        return !zombies.some(z => !z.dead && isInsideBuilding(z, b));
      });

      if (inVehicle) {
        // Sleep in vehicle if no safe building nearby or already in vehicle
        return { dx: 0, dy: 0, action: "auto_sleep", autoBehavior: "needs_sleep_in_vehicle" };
      }

      if (safeSleepBuilding) {
        const alreadyInside = isInsideBuilding({ x: px, y: py }, safeSleepBuilding);
        if (alreadyInside) {
          return { dx: 0, dy: 0, action: "auto_sleep", autoBehavior: "needs_sleep_indoor" };
        }
        const bCx = safeSleepBuilding.x + safeSleepBuilding.w / 2;
        const bCy = safeSleepBuilding.y + safeSleepBuilding.h / 2;
        return { ...unstuck(footNavTo(bCx, bCy)), action: null, autoBehavior: "needs_seek_sleep_spot" };
      }

      // No safe building nearby — sleep exposed rather than collapsing
      return { dx: 0, dy: 0, action: "auto_sleep", autoBehavior: "needs_sleep_exposed" };
    }
  }

  // ── 1. VEHICLE SEEK — on foot with 2+ threats: go get a car ──────────────
  // Also fires when current vehicle was just destroyed (inVehicle became false
  // due to hp=0 eject).  Covers the "vehicle destroyed → find another" case.
  if (!inVehicle && nearbyThreats.length >= 2) {
    const safeVehicle = findNearestAvailableVehicle();
    if (safeVehicle) {
      const dToVehicle = dist(px, py, safeVehicle.x, safeVehicle.y);
      if (dToVehicle < AUTO_VEHICLE_RANGE) {
        return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "mob_enter_vehicle" };
      }
      // While running to the vehicle, flee-blend if a zombie is immediately on us
      if (closestThreat && dist(px, py, closestThreat.x, closestThreat.y) < AUTO_FLEE_RANGE) {
        const toV   = toward(safeVehicle.x, safeVehicle.y);
        const fromZ = toward(closestThreat.x, closestThreat.y);
        const bx    = toV.dx * 0.65 - fromZ.dx * 0.35;
        const by    = toV.dy * 0.65 - fromZ.dy * 0.35;
        const bLen  = Math.sqrt(bx * bx + by * by) || 1;
        return { dx: bx / bLen, dy: by / bLen, action: null, autoBehavior: "mob_arc_to_vehicle" };
      }
      return { ...unstuck(toward(safeVehicle.x, safeVehicle.y)), action: null, autoBehavior: "mob_vehicle_seek" };
    }
    // No vehicle anywhere — fall through to flee logic below
  }

  // ── 2. FLEE — on foot, overwhelmed, no vehicle reachable quickly ──────────
  if (!inVehicle && closestThreat && dist(px, py, closestThreat.x, closestThreat.y) < AUTO_FLEE_RANGE && nearbyThreats.length >= 3) {
    const cx = nearbyThreats.reduce((s2, z) => s2 + z.x, 0) / nearbyThreats.length;
    const cy = nearbyThreats.reduce((s2, z) => s2 + z.y, 0) / nearbyThreats.length;
    const { dx, dy } = toward(cx, cy);
    return { dx: -dx, dy: -dy, action: null, autoBehavior: "flee" };
  }

  // ── 3. FIGHT on foot — exactly 1 threat AND player has a melee weapon ─────
  if (!inVehicle && closestThreat && nearbyThreats.length === 1 && player.weapon) {
    const dToThreat = dist(px, py, closestThreat.x, closestThreat.y);
    if (dToThreat < AUTO_MELEE_RANGE + 12) {
      return { dx: 0, dy: 0, action: "attack", autoBehavior: "fight" };
    }
    if (dToThreat < AUTO_THREAT_RANGE * 0.6) {
      return { ...toward(closestThreat.x, closestThreat.y), action: null, autoBehavior: "fight_approach" };
    }
  }

  // ── 4. FIGHT in vehicle — drive into threats ──────────────────────────────
  // Use unstuck() so rotation kicks in when the vehicle is pinned against a
  // building wall between it and the target zombie.  Also add a lightweight
  // corner-bypass: if the straight-line path passes through a building, aim
  // for the nearest corner of that building instead of driving into the wall.
  if (inVehicle && closestThreat) {
    const raw = toward(closestThreat.x, closestThreat.y);

    // Check if any building lies between vehicle and target zombie.
    // We test whether the target position is inside a building the vehicle
    // is NOT already inside (building-interior zombies are already filtered
    // out of nearbyThreats, but a building wall can still block the path).
    const blockingBuilding = buildings.find(b => {
      // Skip buildings the vehicle is currently overlapping
      if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) return false;
      // Rough segment-vs-AABB overlap: cast a few probe points along the line
      for (let t = 0.15; t < 0.9; t += 0.15) {
        const sx = px + raw.dx * t * dist(px, py, closestThreat.x, closestThreat.y);
        const sy = py + raw.dy * t * dist(px, py, closestThreat.x, closestThreat.y);
        if (sx > b.x && sx < b.x + b.w && sy > b.y && sy < b.y + b.h) return true;
      }
      return false;
    });

    if (blockingBuilding) {
      // Aim for the nearest corner of the blocking building, offset outward
      // by VEHICLE_RADIUS so the vehicle doesn't clip the corner geometry.
      const VR = VEHICLE_RADIUS + 8;
      const corners = [
        { x: blockingBuilding.x - VR,                          y: blockingBuilding.y - VR },
        { x: blockingBuilding.x + blockingBuilding.w + VR,     y: blockingBuilding.y - VR },
        { x: blockingBuilding.x - VR,                          y: blockingBuilding.y + blockingBuilding.h + VR },
        { x: blockingBuilding.x + blockingBuilding.w + VR,     y: blockingBuilding.y + blockingBuilding.h + VR },
      ];
      const bestCorner = corners.reduce((a, b2) =>
        dist(px, py, a.x, a.y) < dist(px, py, b2.x, b2.y) ? a : b2
      );
      return { ...unstuck(toward(bestCorner.x, bestCorner.y)), action: null, autoBehavior: "fight_vehicle_bypass" };
    }

    return { ...unstuck(raw), action: null, autoBehavior: "fight_vehicle" };
  }

  // ── Settlement-clearing helpers ──────────────────────────────────────────
  // Determine which settlement the AI is currently working in.
  // If pendingLootSettlementId is set it means a fragment was just collected
  // and compassTarget already points at the NEXT settlement — but we must
  // finish looting the settlement we're standing in first. Use the pending ID
  // so all loot/clear logic below targets the correct (current) settlement.
  const settlements = state.settlements ?? [];
  const curSid      = state.pendingLootSettlementId ?? compassTarget?.settlementId ?? 0;
  const curSettlement = settlements.find(s2 => s2.id === curSid) ?? null;

  // All buildings belonging to the current settlement.
  const settlementBuildings = curSettlement
    ? buildings.filter(b => b.settlementId === curSid)
    : [];

  // Is a zombie/coordinate inside any settlement building?
  function inSettlementBldg(x, y) {
    return settlementBuildings.some(b =>
      x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h
    );
  }

  // Zombies alive INSIDE a settlement building.
  const zombiesInsideBuildings = zombies.filter(z => {
    if (z.dead) return false;
    return settlementBuildings.some(b => isInsideBuilding(z, b));
  });

  // Zombies alive OUTSIDE any building (anywhere in the world).
  const zombiesOutside = zombies.filter(z => {
    if (z.dead) return false;
    return !buildings.some(b => isInsideBuilding(z, b));
  });

  // Settlement-specific loot piles.
  const settlementBuildingIds = new Set(settlementBuildings.map(b => b.id));

  // Settlement centre for proximity checks.
  const AUTO_SETTLEMENT_RADIUS = 700;
  const settlementCx = curSettlement?.cx ?? (compassTarget?.x ?? px);
  const settlementCy = curSettlement?.cy ?? (compassTarget?.y ?? py);

  // Collect loot by building ID first, then add any orphaned piles that are
  // physically inside the settlement radius but whose buildingId didn't resolve
  // to a tagged settlement building (e.g. a building placed at the edge whose
  // settlementId got mismatched). This prevents the AI from halting because a
  // stray loot pile is invisible to the ID-based filter.
  const settlementLoot = lootPiles.filter(p => {
    if (p.collected) return false;
    if (settlementBuildingIds.has(p.buildingId)) return true;
    // Proximity fallback — treat any uncollected pile near the settlement centre
    // as belonging to this settlement so it doesn't get silently skipped.
    const pileBuilding = buildings.find(b => b.id === p.buildingId);
    const checkX = pileBuilding ? pileBuilding.x + pileBuilding.w / 2 : p.x;
    const checkY = pileBuilding ? pileBuilding.y + pileBuilding.h / 2 : p.y;
    return dist(checkX, checkY, settlementCx, settlementCy) < AUTO_SETTLEMENT_RADIUS;
  });

  // Outside zombies still within settlement perimeter.
  const outsideZombiesNearSettlement = zombiesOutside.filter(z =>
    dist(z.x, z.y, settlementCx, settlementCy) < AUTO_SETTLEMENT_RADIUS
  );

  // Buildings that have zombies trapped inside AND still have a closed door.
  const buildingsNeedingDoors = settlementBuildings.filter(b => {
    const hasZombies = zombies.some(z => !z.dead && isInsideBuilding(z, b));
    if (!hasZombies) return false;
    return (b.doors ?? []).some(d => !d.open && !d.broken);
  });

  const outsideCleared         = outsideZombiesNearSettlement.length === 0;
  // Treat dormant building zombies as cleared — a single zombie inside a building
  // that is not chasing the player should not block loot collection.
  // Active states (chase, alert, attack, bash_door) still gate the loot phase.
  const activeZombieStates = new Set(["chase", "alert", "attack", "bash_door"]);
  const buildingZombiesCleared = zombiesInsideBuildings.every(
    z => !activeZombieStates.has(z.state)
  );
  const settlementLootDone     = settlementLoot.length === 0;

  // If the pending settlement is fully cleared and looted, clear the flag so
  // that curSid reverts to compassTarget.settlementId next frame and the AI
  // can depart toward the next fragment without being held back.
  if (state.pendingLootSettlementId != null && settlementLootDone && outsideCleared && buildingZombiesCleared) {
    state.pendingLootSettlementId = null;
  }

  // ── 5. HUNT outside zombies ───────────────────────────────────────────────
  // While live zombies exist outside settlement buildings, deal with them first.
  // In vehicle: drive them down directly.
  // On foot with a vehicle available: re-enter it before hunting so the AI
  // never wanders into the door-opening or looting phase while zombies are still
  // outside (which could leave it exposed and stuck between two goals).
  // On foot without a vehicle: steps 2-3 (flee/fight) handle personal safety;
  // we fall through so we don't deadlock waiting for a vehicle that isn't there.
  if (!outsideCleared) {
    if (inVehicle) {
      const targetZ = outsideZombiesNearSettlement.reduce((a, b2) =>
        dist(px, py, a.x, a.y) < dist(px, py, b2.x, b2.y) ? a : b2
      );
      return { ...unstuck(toward(targetZ.x, targetZ.y)), action: null, autoBehavior: "hunt_outside_zombies" };
    }
    // On foot — get back into a vehicle first so we can hunt efficiently, BUT
    // only once there are no more doors to open. If doors still need opening we
    // fall through to step 6 and keep flushing on foot: running to the car after
    // every single door (a fresh zombie steps out → outsideCleared flips false)
    // is what caused the open-door / run-to-car oscillation. Immediate danger
    // while flushing is still handled by steps 1-3 above.
    if (buildingsNeedingDoors.length === 0) {
      const huntV = findNearestAvailableVehicle();
      if (huntV) {
        const dHuntV = dist(px, py, huntV.x, huntV.y);
        if (dHuntV < AUTO_VEHICLE_RANGE) {
          return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "reenter_for_hunt" };
        }
        return { ...unstuck(footNavTo(huntV.x, huntV.y)), action: null, autoBehavior: "approach_vehicle_for_hunt" };
      }
    }
    // else: fall through to step 6 (open doors) on foot.
  }

  // ── 6. OPEN DOORS to flush building zombies ───────────────────────────────
  // All outside zombies are cleared. Open any closed doors on buildings that
  // still have live zombies inside so they stream out to be driven over.
  if (outsideCleared && buildingsNeedingDoors.length > 0) {
    // Must be on foot to use the door — exit first if in vehicle.
    if (inVehicle) {
      return { dx: 0, dy: 0, action: "exit_vehicle_for_doors", autoBehavior: "exit_for_doors" };
    }

    // If the player ended up inside a settlement building, leave it first.
    // footNavTo picks the door toward open space and won't re-enter.
    const playerBuilding = settlementBuildings.find(b => isInsideBuilding({ x: px, y: py }, b));
    if (playerBuilding) {
      const exitDoors = (playerBuilding.doors ?? []).filter(d => d.open || d.broken);
      const anyDoor   = exitDoors.length > 0 ? exitDoors : (playerBuilding.doors ?? []);
      if (anyDoor.length > 0) {
        // Aim at the settlement centre so footNavTo exits via the door facing it.
        return { ...unstuck(footNavTo(settlementCx, settlementCy)), action: null, autoBehavior: "exit_building" };
      }
    }

    // Find the nearest closed door across all buildings that need opening.
    // Navigate to the EXTERIOR face of the door (offset 36px outward from wall)
    // so the AI stops comfortably clear of wall-collision pushback.
    // The open_door trigger is checked against door centre at 50px — wider than
    // DOOR_INTERACT_RANGE (38px) so it fires before wall collision can bounce
    // the player back out of range, eliminating the approach jitter loop.
    let nearestDoor = null, nearestApproach = null, nearestDoorDist = Infinity, nearestDoorBldg = null;
    for (const b of buildingsNeedingDoors) {
      for (const door of (b.doors ?? [])) {
        if (door.open || door.broken) continue;
        const c = getDoorCenter(b, door);
        // Exterior approach point — 36px outside the wall face
        const approach = {
          north: { x: c.x,      y: c.y - 36 },
          south: { x: c.x,      y: c.y + 36 },
          west:  { x: c.x - 36, y: c.y      },
          east:  { x: c.x + 36, y: c.y      },
        }[door.side] ?? { x: c.x, y: c.y - 36 };
        const d = dist(px, py, approach.x, approach.y);
        if (d < nearestDoorDist) {
          nearestDoorDist  = d;
          nearestDoor      = door;
          nearestApproach  = approach;
          nearestDoorBldg  = b;
        }
      }
    }

    if (nearestDoor && nearestDoorBldg) {
      // Fire open_door at 50px from door centre — wider than DOOR_INTERACT_RANGE
      // so the action triggers before wall collision pushes the player back out.
      const dc = getDoorCenter(nearestDoorBldg, nearestDoor);
      if (dist(px, py, dc.x, dc.y) < 50) {
        return { dx: 0, dy: 0, action: "open_door", autoBehavior: "open_door" };
      }
      const exitForDoor = footNavTo(nearestApproach.x, nearestApproach.y, nearestDoorBldg);
      return { ...unstuck(exitForDoor), action: null, autoBehavior: "approach_door" };
    }
  }

  // ── 7. CLEAR escaped building zombies (re-enter vehicle) ─────────────────
  // Doors are now open/broken; zombies are exiting. Hunt them down in vehicle.
  if (outsideCleared && !buildingZombiesCleared && buildingsNeedingDoors.length === 0) {
    const escapedZombies = zombiesOutside.filter(z =>
      dist(z.x, z.y, settlementCx, settlementCy) < AUTO_SETTLEMENT_RADIUS
    );
    if (escapedZombies.length > 0) {
      if (!inVehicle) {
        const safeV = findNearestAvailableVehicle();
        if (safeV) {
          const dV = dist(px, py, safeV.x, safeV.y);
          if (dV < AUTO_VEHICLE_RANGE) return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "reenter_vehicle" };
          return { ...unstuck(footNavTo(safeV.x, safeV.y)), action: null, autoBehavior: "reenter_vehicle_approach" };
        }
      }
      const targetZ = escapedZombies.reduce((a, b2) =>
        dist(px, py, a.x, a.y) < dist(px, py, b2.x, b2.y) ? a : b2
      );
      return { ...toward(targetZ.x, targetZ.y), action: null, autoBehavior: "hunt_escaped_zombies" };
    }
  }

  // ── 8. LOOT the settlement ────────────────────────────────────────────────
  // All zombies cleared (inside and outside). Collect all loot in this settlement.
  // Uses door-aware pathfinding: navigate to an open door first when the pile is
  // inside a building, walk to the pile, then exit back through the door afterward.
  if (outsideCleared && buildingZombiesCleared && !settlementLootDone) {
    if (inVehicle) {
      return { dx: 0, dy: 0, action: "exit_vehicle_for_doors", autoBehavior: "exit_for_loot" };
    }

    // If we're inside a building with no uncollected pile in it, exit first.
    const playerBuildingLoot = buildings.find(b => isInsideBuilding({ x: px, y: py }, b));
    if (playerBuildingLoot) {
      const pileInMyBuilding = settlementLoot.find(p => p.buildingId === playerBuildingLoot.id);
      if (!pileInMyBuilding) {
        const exitWp = getBuildingExitWaypoint();
        if (exitWp) {
          if (exitWp.openDoorFirst) {
            return { dx: 0, dy: 0, action: "open_door", autoBehavior: "open_door_to_exit_after_loot" };
          }
          return { ...unstuck(toward(exitWp.x, exitWp.y)), action: null, autoBehavior: "exit_building_after_loot" };
        }
      }
    }

    // Pick the nearest reachable pile (has an open door, or pile is outside).
    let bestPile = null, bestWaypoint = null, bestDist = Infinity;
    for (const pile of settlementLoot) {
      const wp = getLootWaypoint(pile);
      if (!wp) continue; // building door still closed — skip for now
      const d = dist(px, py, wp.x, wp.y);
      if (d < bestDist) { bestDist = d; bestPile = pile; bestWaypoint = wp; }
    }

    if (!bestPile) {
      // All remaining piles are behind closed doors. This can happen when a building
      // had no zombie guards (so step 6 never opened its door). Find the nearest
      // locked door on a loot building and open it, then loot will become reachable.
      let lockedDoor = null, lockedDoorApproach = null, lockedDoorBldg = null, lockedDoorDist = Infinity;
      for (const b of settlementBuildings) {
        if (!settlementLoot.some(p => p.buildingId === b.id)) continue; // no loot here
        for (const door of (b.doors ?? [])) {
          if (door.open || door.broken) continue;
          const dc = getDoorCenter(b, door);
          const approach = {
            north: { x: dc.x,      y: dc.y - 36 },
            south: { x: dc.x,      y: dc.y + 36 },
            west:  { x: dc.x - 36, y: dc.y      },
            east:  { x: dc.x + 36, y: dc.y      },
          }[door.side] ?? { x: dc.x, y: dc.y - 36 };
          const d = dist(px, py, approach.x, approach.y);
          if (d < lockedDoorDist) {
            lockedDoorDist  = d;
            lockedDoor      = door;
            lockedDoorApproach = approach;
            lockedDoorBldg  = b;
          }
        }
      }
      if (lockedDoor && lockedDoorBldg) {
        const dc = getDoorCenter(lockedDoorBldg, lockedDoor);
        if (dist(px, py, dc.x, dc.y) < 50) {
          return { dx: 0, dy: 0, action: "open_door", autoBehavior: "open_door_for_loot" };
        }
        const exitForLootDoor = exitBuildingIfNeeded(lockedDoorApproach.x, lockedDoorApproach.y, "exit_building_for_loot_door");
        if (exitForLootDoor) return exitForLootDoor;
        return { ...unstuck(toward(lockedDoorApproach.x, lockedDoorApproach.y)), action: null, autoBehavior: "approach_door_for_loot" };
      }
      // Truly no loot reachable via ID-tagged buildings — do a final proximity
      // sweep for any uncollected pile near the settlement centre whose building
      // may have been placed just outside the tagged set (e.g. edge-of-radius
      // buildings at settlement 2+). Without this the AI idles permanently.
      const nearbyOrphanPile = lootPiles
        .filter(p => {
          if (p.collected) return false;
          const pb = buildings.find(b => b.id === p.buildingId);
          const cx2 = pb ? pb.x + pb.w / 2 : p.x;
          const cy2 = pb ? pb.y + pb.h / 2 : p.y;
          return dist(cx2, cy2, settlementCx, settlementCy) < AUTO_SETTLEMENT_RADIUS * 1.3;
        })
        .sort((a, b2) => dist(px, py, a.x, a.y) - dist(px, py, b2.x, b2.y))[0];
      if (nearbyOrphanPile) {
        const orphanBldg = buildings.find(b => b.id === nearbyOrphanPile.buildingId);
        const wp = getLootWaypoint(nearbyOrphanPile);
        if (wp) {
          if (dist(px, py, nearbyOrphanPile.x, nearbyOrphanPile.y) < AUTO_LOOT_RANGE) {
            return { dx: 0, dy: 0, action: "collect", autoBehavior: "loot_orphan" };
          }
          return { ...unstuck(toward(wp.x, wp.y)), action: null, autoBehavior: "loot_orphan_approach" };
        }
        // Pile is in a building with all doors closed — open the nearest one.
        if (orphanBldg) {
          for (const door of (orphanBldg.doors ?? [])) {
            if (door.open || door.broken) continue;
            const dc = getDoorCenter(orphanBldg, door);
            if (dist(px, py, dc.x, dc.y) < 50) {
              return { dx: 0, dy: 0, action: "open_door", autoBehavior: "open_door_orphan" };
            }
            const ap = {
              north: { x: dc.x, y: dc.y - 36 }, south: { x: dc.x, y: dc.y + 36 },
              west:  { x: dc.x - 36, y: dc.y  }, east:  { x: dc.x + 36, y: dc.y  },
            }[door.side] ?? { x: dc.x, y: dc.y - 36 };
            return { ...unstuck(toward(ap.x, ap.y)), action: null, autoBehavior: "approach_door_orphan" };
          }
        }
      }
      // Nothing left near the settlement — fall through to navigation.
    }

    // Close enough to collect
    if (dist(px, py, bestPile.x, bestPile.y) < AUTO_LOOT_RANGE) {
      return { dx: 0, dy: 0, action: "collect", autoBehavior: "loot_settlement" };
    }

    // Walk toward door-aware waypoint (interior entry point or the pile directly)
    return { ...unstuck(toward(bestWaypoint.x, bestWaypoint.y)), action: null, autoBehavior: "loot_settlement_approach" };
  }

  // ── 9. OPPORTUNISTIC LOOT — uncollected pile nearby while travelling ──────
  // Uses door-aware waypoints so the AI enters through open doors
  // rather than walking into walls to reach piles inside buildings.
  const reachableLoot = lootPiles.filter(p => {
    if (p.collected) return false;
    const wp = getLootWaypoint(p);
    if (!wp) return false; // building door still closed
    if (dist(px, py, wp.x, wp.y) > AUTO_LOOT_RANGE * 1.5) return false;
    if (!inVehicle) {
      // Only count zombies that are OUTSIDE buildings — a zombie locked inside a
      // building can't reach the player, so it shouldn't block loot collection.
      const zombiesNearPile = zombies.filter(z => {
        if (z.dead) return false;
        if (dist(p.x, p.y, z.x, z.y) >= AUTO_LOOT_DANGER_RANGE) return false;
        return !buildings.some(b => isInsideBuilding(z, b));
      }).length;
      if (zombiesNearPile >= AUTO_LOOT_DANGER_THRESHOLD) return false;
    }
    return true;
  });
  if (reachableLoot.length > 0) {
    const pile = reachableLoot.reduce((a, b) => dist(px, py, a.x, a.y) < dist(px, py, b.x, b.y) ? a : b);
    if (dist(px, py, pile.x, pile.y) < AUTO_LOOT_RANGE) {
      return { dx: 0, dy: 0, action: "collect", autoBehavior: "loot" };
    }
    const wp = getLootWaypoint(pile);
    if (wp) return { ...unstuck(toward(wp.x, wp.y)), action: null, autoBehavior: "loot_approach" };
  }

  // ── 10. ENTER vehicle if nearby and not in one ───────────────────────────
  if (!inVehicle) {
    const safeVehicle = findNearestAvailableVehicle();
    if (safeVehicle) {
      const dToVehicle = dist(px, py, safeVehicle.x, safeVehicle.y);
      if (dToVehicle < AUTO_VEHICLE_RANGE) {
        return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "enter_vehicle" };
      }
      // Expand the approach range: always walk back to the vehicle after on-foot
      // looting regardless of how far into the settlement buildings the player walked.
      if (dToVehicle < AUTO_FLEET_SEEK_RANGE) {
        return { ...unstuck(footNavTo(safeVehicle.x, safeVehicle.y)), action: null, autoBehavior: "vehicle_approach" };
      }
    }
  }

  // ── 11. BOSS FIGHT — boss alive and fragment collected ────────────────────
  if (bossZombie && !bossZombie.dead && state.mapFragmentCollected) {
    const dToBoss = dist(px, py, bossZombie.x, bossZombie.y);
    if (inVehicle && dToBoss < 80) {
      return { ...toward(bossZombie.x, bossZombie.y), action: null, autoBehavior: "boss_fight_vehicle" };
    }
    const exitForBoss = footNavTo(bossZombie.x, bossZombie.y);
    return { ...unstuck(exitForBoss), action: null, autoBehavior: "boss_approach" };
  }

  // ── 12. EXITING — boss dead; drive/walk north ────────────────────────────
  const bossDefeated = bossZombie?.dead === true;
  if (bossDefeated) {
    const exitX = WORLD_W / 2;
    const exitY = 80;
    return { ...unstuck(footNavTo(exitX, exitY)), action: null, autoBehavior: "exiting" };
  }

  // ── 13. NAVIGATE to next settlement's fragment building ──────────────────
  // Only head out once current settlement is fully cleared AND looted.
  // buildingZombiesCleared ensures all indoor zombies are dead before moving on.
  //
  // Note: pendingLootSettlementId (set by collectMapFragment when a fragment is
  // picked up) is now handled in the settlement-clearing helpers above — curSid
  // uses it as the active settlement so steps 5-8 loot the current settlement
  // even after compassTarget has been updated to the next one. The flag is
  // cleared there once all clearing + looting conditions are met.

  if (compassTarget && outsideCleared && buildingZombiesCleared && settlementLootDone) {
    // Re-enter the vehicle first if available — never walk cross-map on foot.
    if (!inVehicle) {
      const safeVehicle = findNearestAvailableVehicle();
      if (safeVehicle) {
        const dToVehicle = dist(px, py, safeVehicle.x, safeVehicle.y);
        if (dToVehicle < AUTO_VEHICLE_RANGE) {
          return { dx: 0, dy: 0, action: "enter_vehicle", autoBehavior: "enter_vehicle_for_travel" };
        }
        if (dToVehicle < AUTO_FLEET_SEEK_RANGE) {
          return { ...unstuck(footNavTo(safeVehicle.x, safeVehicle.y)), action: null, autoBehavior: "vehicle_approach_for_travel" };
        }
      }
    }
    return { ...unstuck(footNavTo(compassTarget.x, compassTarget.y)), action: null, autoBehavior: "fragment_hunt" };
  }

  // Still working in current settlement but nothing urgent — orbit centre.
  if (compassTarget) {
    return { ...unstuck(footNavTo(compassTarget.x, compassTarget.y)), action: null, autoBehavior: "fragment_hunt" };
  }

  // ── 14. IDLE ─────────────────────────────────────────────────────────────
  return { dx: 0, dy: 0, action: null, autoBehavior: "idle" };
}
// ─── Step 4: Base attack simulation ──────────────────────────────────────────
// Pure function — call from a setInterval in index.jsx (not from the game loop).
// Returns a new worldState object; does not mutate the input.
//
// Rules:
//   • Only "secured" levels can be attacked.
//   • Levels being actively played (currentLevelId) are skipped — the player
//     is already there defending them.
//   • Each call represents one tick (call every ~30 s real-time).
//   • Attack chance per tick per secured base: ATTACK_CHANCE_PER_TICK
//   • Turret: reduces damage by TURRET_DAMAGE_REDUCTION (percent, 0–1).
//   • Garden plot: heals GARDEN_HEAL_PER_TICK HP each tick (passive regen).
//   • If baseHp reaches 0: status → "under_attack" (alert the player).
//   • Level already "under_attack" continues taking damage each tick until
//     the player drops in.
//
// Returns { worldState: <new>, attackedLevelIds: [id,...] }

const ATTACK_CHANCE_PER_TICK  = 0.25;   // 25% chance a secured base is attacked this tick
const ATTACK_BASE_DAMAGE      = 15;     // HP lost per attack event (no turret)
const TURRET_DAMAGE_REDUCTION = 0.60;   // Turret blocks 60% of damage
const GARDEN_HEAL_PER_TICK    = 3;      // HP healed per garden plot per tick

export function tickBaseAttacks(worldState, currentLevelId = null) {
  let attackedLevelIds = [];

  const levels = worldState.levels.map(level => {
    // Only secured or already under_attack levels are eligible
    if (level.status !== "secured" && level.status !== "under_attack") return level;
    // Don't simulate the level the player is currently playing
    if (level.id === currentLevelId) return level;

    let { baseHp = 100, turretPlaced = false, gardenPlots = 0 } = level;

    // Passive garden healing (applies every tick regardless of attack)
    if (gardenPlots > 0) {
      baseHp = Math.min(100, baseHp + gardenPlots * GARDEN_HEAL_PER_TICK);
    }

    // Random attack roll
    const attacked = Math.random() < ATTACK_CHANCE_PER_TICK;
    if (attacked) {
      const dmg = turretPlaced
        ? Math.round(ATTACK_BASE_DAMAGE * (1 - TURRET_DAMAGE_REDUCTION))
        : ATTACK_BASE_DAMAGE;
      baseHp = Math.max(0, baseHp - dmg);
      attackedLevelIds.push(level.id);
    }

    // Determine new status
    let status = level.status;
    if (baseHp <= 0) {
      status = "under_attack";
      baseHp = 0;
    } else if (level.status === "under_attack" && baseHp > 0) {
      // Once HP regenerates above 0 naturally (garden healing), clear the alert
      status = "secured";
    }

    return { ...level, baseHp, status };
  });

  return {
    worldState: { ...worldState, levels },
    attackedLevelIds,
  };
}

// ─── Step 6: Passive resource generation ──────────────────────────────────────
// Pure function — call from index.jsx on a slower interval (~60 s real-time).
// Each secured base generates food from garden plots and scrap if a turret is
// present (representing a salvage crew). Resources cap per-level and are also
// aggregated into worldState.totalResources.
//
// Returns a new worldState object; does not mutate the input.

const FOOD_PER_PLOT_PER_TICK  = 5;   // food generated per garden plot per tick
const SCRAP_PER_TICK          = 3;   // scrap generated per secured base with a turret per tick
const FOOD_CAP_PER_LEVEL      = 200; // maximum food stockpile per level
const SCRAP_CAP_PER_LEVEL     = 100; // maximum scrap stockpile per level

export function tickBaseResources(worldState) {
  const levels = worldState.levels.map(level => {
    // Only secured levels generate resources (under_attack pauses generation)
    if (level.status !== "secured") return level;

    const { gardenPlots = 0, turretPlaced = false } = level;
    const resources = { ...(level.resources ?? { food: 0, scrap: 0 }) };

    // Food: each garden plot contributes FOOD_PER_PLOT_PER_TICK per tick
    if (gardenPlots > 0) {
      resources.food = Math.min(FOOD_CAP_PER_LEVEL, resources.food + gardenPlots * FOOD_PER_PLOT_PER_TICK);
    }

    // Scrap: requires a turret (salvage crew is co-located with defences)
    if (turretPlaced) {
      resources.scrap = Math.min(SCRAP_CAP_PER_LEVEL, resources.scrap + SCRAP_PER_TICK);
    }

    return { ...level, resources };
  });

  // Recompute global totals by summing all level stockpiles
  const totalResources = levels.reduce(
    (acc, l) => ({
      food:  acc.food  + (l.resources?.food  ?? 0),
      scrap: acc.scrap + (l.resources?.scrap ?? 0),
    }),
    { food: 0, scrap: 0 }
  );

  return { ...worldState, levels, totalResources };
}
// ─── Step 7: Resource carry between levels ────────────────────────────────────
// Maximum food/scrap a player can carry from the world stockpile when deploying.
export const CARRY_CAP = { food: 30, scrap: 20 };

/**
 * Pre-stock the player's inventory from worldState.totalResources when
 * deploying to a level. Called in handleDeploy (index.jsx) before GameView
 * mounts so the fresh state already has the items.
 *
 * Returns { inventory, worldResources } — pass worldResources back to
 * setWorldState so the carried amount is deducted from the global pool.
 */
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
    food:  (totalResources?.food  ?? 0) + (resourcesCollected?.food  ?? 0),
    scrap: (totalResources?.scrap ?? 0) + (resourcesCollected?.scrap ?? 0),
  };
}

// ─── Step 8: Defend base mission type ─────────────────────────────────────────
// missionType: "clear" | "defend"
// "defend" is set when the deployed level has status "under_attack".
// Win  → onGameOver({ survived: true, defended: true, baseHpRestored: DEFEND_BASE_HP_RESTORE })
// Lose → onGameOver({ survived: false })

export const DEFEND_WAVE_SIZE      = 20;  // zombies spawned in the defend ring
export const DEFEND_BASE_HP_RESTORE = 50; // base HP restored on successful defence