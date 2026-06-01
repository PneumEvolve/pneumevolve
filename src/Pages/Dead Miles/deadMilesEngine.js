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

export function findSafeVehiclePosition(baseX, baseY, buildings, radius = VEHICLE_RADIUS, maxAttempts = 30) {
  const rand = seededRand(Math.random() * 999999);
  
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

function resolveSegCollision(entity, seg, radius) {
  const r = radius ?? PLAYER_RADIUS;
  const cp = closestPointOnSeg(entity.x, entity.y, seg.x1, seg.y1, seg.x2, seg.y2);
  let dx = entity.x - cp.x;
  let dy = entity.y - cp.y;
  let d  = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) { dx = 0; dy = -1; d = 0.001; }
  if (d < r) {
    const push = r - d;
    entity.x += (dx / d) * push;
    entity.y += (dy / d) * push;
    return true;
  }
  return false;
}

export function resolveWallCollision(entity, building) {
  const r = entity.radius ?? PLAYER_RADIUS;
  const { x, y, w, h } = building;
  if (entity.x + r < x - 4 || entity.x - r > x + w + 4) return;
  if (entity.y + r < y - 4 || entity.y - r > y + h + 4) return;

  const segs = getBuildingWallSegments(building);
  for (let pass = 0; pass < 3; pass++) {
    for (const seg of segs) resolveSegCollision(entity, seg, r);
  }
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
const bikeSafePos = findSafeVehiclePosition(barnB.x + barnB.w / 2, barnB.y + barnB.h, buildings, VEHICLE_RADIUS, 15);
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

// Find a safe position for the vehicle
const safePos = findSafeVehiclePosition(settlementCenter.x, settlementCenter.y, buildings, VEHICLE_RADIUS, 40);

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
  const spawnX = startSettlement.cx;
  const spawnY = startSettlement.cy + 180;


// Use safe vehicle placement for starting vehicles
const mainSafePos = findSafeVehiclePosition(spawnX, spawnY, buildings, VEHICLE_RADIUS, 20);
const mainVehicle = createVehicle(mainSafePos.x, mainSafePos.y, "car");

const beaconSafePos = findSafeVehiclePosition(spawnX, spawnY + 80, buildings, VEHICLE_RADIUS, 20);
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
  player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, player.x + nx * speed * dt));
  player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, player.y + ny * speed * dt));
  player.facing = Math.atan2(ny, nx);
  if (buildings) {
    for (const b of buildings) resolveWallCollision(player, b);
  }
}

export function driveVehicle(vehicle, dx, dy, dt, buildings) {
  if (vehicle.hp <= 0) return; // destroyed — can't drive
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    const nx = dx / len, ny = dy / len;
    vehicle.x += nx * vehicle.speed * dt;
    vehicle.y += ny * vehicle.speed * dt;
    vehicle.facing = Math.atan2(ny, nx);
    vehicle.fuel = Math.max(0, vehicle.fuel - 0.4 * dt);
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
  }

  vehicle.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, vehicle.x));
  vehicle.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, vehicle.y));
  if (buildings) {
    for (const b of buildings) resolveWallCollision(vehicle, b);
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

const DOOR_INTERACT_RANGE = 38;

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
  const p1x = player.inVehicle ? vehicle.x : player.x;
  const p1y = player.inVehicle ? vehicle.y : player.y;
  const d1  = dist(zombie.x, zombie.y, p1x, p1y);

  if (player2 && player2.hp > 0 && !player2.inVehicle) {
    const d2 = dist(zombie.x, zombie.y, player2.x, player2.y);
    if (d2 < d1) {
      return { targetX: player2.x, targetY: player2.y, targetPlayer: player2, inVehicle: false };
    }
  }

  return { targetX: p1x, targetY: p1y, targetPlayer: player, inVehicle: player.inVehicle };
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
    if (openDoors.length === 0) return null;
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

export function updateZombies(zombies, player, vehicle, dt, isNight, buildings, player2 = null, soundEvents = [], hamletCx = WORLD_W / 2, hamletCy = WORLD_H / 2, level = 1, turrets = []) {
  const speed = isNight ? ZOMBIE_SPEED_NIGHT : ZOMBIE_SPEED_SLOW;

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
        if (!wallOccluded && dToPlayer < attackDistBash * 2.0) {
          z.state = "attack"; z._bashDoorId = null; z._bashBuildingId = null; break;
        }
        const doorStillBlocking = buildings && isDoorStillBlocking(z, buildings);
        if (!doorStillBlocking) {
          z.state = "chase"; z._bashDoorId = null; z._bashBuildingId = null; break;
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
              moveToward(z, dc.x, dc.y, z.speed, dt);
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
          z._damageTarget = targetPlayer === player2 ? "p2" : (targetInVehicle ? "vehicle" : "p1");
        }
        break;
      }
    }
  });
}

function findBlockingDoor(zombie, targetX, targetY, buildings) {
  for (const b of buildings) {
    if (!b.doors) continue;
    for (const door of b.doors) {
      if (door.open || door.broken) continue;
      if (b.barricadeHp > 0) continue;
      const dc = getDoorCenter(b, door);
      const dToDoor = dist(zombie.x, zombie.y, dc.x, dc.y);
      if (dToDoor > DOOR_BASH_RANGE * 2.5) continue;
      const toTarget = { x: targetX - zombie.x, y: targetY - zombie.y };
      const toDoor   = { x: dc.x - zombie.x,    y: dc.y - zombie.y };
      const dot = toTarget.x * toDoor.x + toTarget.y * toDoor.y;
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

function areWallSeparated(ax, ay, bx, by, buildings) {
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

export function applyZombieDamage(zombies, player, vehicle, buildings, player2 = null) {
  let playerDmg = 0, vehicleDmg = 0, p2Dmg = 0;
  zombies.forEach(z => {
    if (!z._dealDamage || z.dead) return;
    z._dealDamage = false;
    const target = z._damageTarget ?? (player.inVehicle ? "vehicle" : "p1");
    const tx = target === "p2" ? (player2?.x ?? player.x)
             : target === "vehicle" ? vehicle.x : player.x;
    const ty = target === "p2" ? (player2?.y ?? player.y)
             : target === "vehicle" ? vehicle.y : player.y;
    if (buildings && areWallSeparated(z.x, z.y, tx, ty, buildings)) return;
    const dmg = z.type === "boss" ? BOSS_DAMAGE : ZOMBIE_ATTACK_DAMAGE;
    if (target === "vehicle") vehicleDmg += vehicle.zombieKill ? 0 : dmg * 1.5;
    else if (target === "p2") p2Dmg += dmg;
    else playerDmg += dmg;
    
    // Record damage for death recap
    if (target === "p1" && dmg > 0) {
      player.deathRecap?.recordDamage(z.type === "boss" ? "Boss Zombie" : z.type === "brute" ? "Brute Zombie" : "Zombie", dmg, "melee", player.hp - playerDmg);
    }
  });
  player.hp  = Math.max(0, player.hp  - playerDmg);
  vehicle.hp = Math.max(0, vehicle.hp - vehicleDmg);
  if (player2 && p2Dmg > 0) player2.hp = Math.max(0, player2.hp - p2Dmg);
  return { playerDmg, vehicleDmg, p2Dmg };
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

export const MELEE_RANGE  = 36;
export const MELEE_DAMAGE = 22;
export const MELEE_RATE   = 1.2;

export function playerAttack(player, zombies, dt) {
  if (player.inVehicle || !player.weapon) return [];
  if (player.attackCooldown > 0) { player.attackCooldown -= dt; return []; }
  const hits = [];
  zombies.forEach(z => {
    if (z.dead) return;
    if (dist(player.x, player.y, z.x, z.y) < MELEE_RANGE + z.radius) {
      z.hp -= MELEE_DAMAGE; if (z.hp <= 0) {
        z.dead = true;
        player.deathRecap?.recordKill();
      }
      hits.push(z.id);
    }
  });
  if (hits.length > 0) player.attackCooldown = 1 / MELEE_RATE;
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
    actions.push({ key: "F", label: `Loot (${names})` });
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

export function tryHarvestCrop(player, gardenPlots, crops, dayNumber) {
  for (let i = crops.length - 1; i >= 0; i--) {
    const c = crops[i];
    if (c.stage !== "ready") continue;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    if (!plot) continue;
    if (dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) > 60) continue;
    
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

    if (sv._crumbIdx === undefined) sv._crumbIdx = 0;

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
export const SURVIVOR_INTERACT_RANGE = 50;
export const SURVIVOR_FIGHT_RANGE   = 220;
export const SURVIVOR_FLEE_TRIGGER  = 200;
export const SURVIVOR_MELEE_RANGE   = 18;
export const SURVIVOR_MELEE_DAMAGE  = 12;
export const SURVIVOR_MELEE_RATE    = 1.0;
export const SURVIVOR_REPAIR_CAST   = 2.5;
export const SURVIVOR_HARVEST_CAST  = 2.0;
export const SURVIVOR_TURRET_WANDER = 150;
export const SURVIVOR_TURRET_REPAIR_HP_THRESHOLD = 0.6;

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
  const nx = dx / d, ny = dy / d;
  entity.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, entity.x + nx * speed * dt));
  entity.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, entity.y + ny * speed * dt));
  entity.facing = Math.atan2(ny, nx);
  if (buildings) {
    for (const b of buildings) resolveWallCollision(entity, b);
  }
  return false;
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
  const freeVehicle = vehicles.find(v => !taken.has(v) && !v.occupied);
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

export function updateSurvivors(survivors, player, vehicle, zombies, turrets, gardenPlots, crops, buildings, dt) {
  for (const sv of survivors) {
    if (sv.hp <= 0) continue;

    if (sv.barricaded) {
      survivorAttack(sv, zombies, dt);
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
        const targetX = leader.x - Math.cos(leader.facing ?? 0) * SURVIVOR_FOLLOW_DIST;
        const targetY = leader.y - Math.sin(leader.facing ?? 0) * SURVIVOR_FOLLOW_DIST;
        const arrived = survivorMoveTo(sv, targetX, targetY, SURVIVOR_SPEED, dt, buildings);
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
        sv._castTimer = 0; sv._castType = null;
      }
    }
    if (sv._hitCd > 0) sv._hitCd -= dt;
  }
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

export function baseTick(state, dtReal, activityLog = []) {
  const harvested = [];
  const damaged   = [];

  if (dtReal <= 0) return { harvested, damaged };

  for (const crop of (state.crops ?? [])) {
    if (crop.stage !== "planted") continue;
    crop.growTimer = Math.min(crop.growTime, (crop.growTimer ?? 0) + dtReal);
    if (crop.growTimer >= crop.growTime) {
      crop.stage = "ready";
      pushActivity(activityLog, `🌱 ${crop.type} plot is ready to harvest`);
    }
  }

  for (const sv of (state.survivors ?? [])) {
    if (sv.command !== "assign" || !sv.assignedTo) continue;
    if (sv.assignedTo.structureType !== "crop") continue;

    const crop = (state.crops ?? []).find(
      c => c.plotId === sv.assignedTo.structureId && c.stage === "ready"
    );
    if (!crop) continue;

    crop.stage = "harvested";
    const yieldAmt = CROP_TYPES[crop.type]?.yield ?? 4;
    if (!state.player.inventory) state.player.inventory = {};
    state.player.inventory.food = (state.player.inventory.food ?? 0) + yieldAmt;

    harvested.push({ name: sv.name, type: crop.type, amount: yieldAmt });
    pushActivity(activityLog, `${sv.name} harvested ${yieldAmt} ${crop.type}`);
  }

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

  return { harvested, damaged };
}

export function applyOfflineBaseTick(state, activityLog) {
  if (!state.lastBaseTick) {
    state.lastBaseTick = Date.now();
    return { harvested: [], damaged: [] };
  }
  const elapsed = (Date.now() - state.lastBaseTick) / 1000;
  if (elapsed < 2) return { harvested: [], damaged: [] };
  return baseTick(state, elapsed, activityLog);
}