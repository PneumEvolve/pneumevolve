// engine_entities.js — split from deadMilesEngine.js (pure functions, no React)

import { BOSS_HP, BOSS_RADIUS, BOSS_SPEED, CROP_TYPES, IN_GAME_DAY_SECS, PLAYER_MAX_HP, PLAYER_RADIUS, SURVIVOR_TRAITS, TURRET_DAMAGE, TURRET_FIRE_RATE, TURRET_HP, TURRET_RANGE, TURRET_SOUND_RANGE, VEHICLE_RADIUS, VEHICLE_TYPES, WORLD_H, WORLD_W, ZOMBIE_RADIUS, ZOMBIE_SPEED_NIGHT, ZOMBIE_SPEED_SLOW } from "./engine_constants";
import { DeathRecap } from "./engine_systems";
import { dist, findSafeVehiclePosition, getDoorCenter, seededRand } from "./engine_geometry";
import { createAwakeningRing, createOpenWorldMap, createHomeBaseMap, getOpenWorldZombieSpawns } from "./engine_mapgen";
import { assignSurvivorTraits, generateSurvivorBackstory, generateSurvivorStoryLog, hasTrait } from "./engine_survivors";

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
  const sv = {
    id, x, y, name, role,
    hp: 80, maxHp: 80,
    status: "found",
    morale: 100,
    hunger: 0,
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
    // Trait + identity system
    traits:    [],
    backstory: "",
    storyLog:  [],
    level: 1,
    xp: 0,
  };
  assignSurvivorTraits(sv);
  sv.backstory = generateSurvivorBackstory(id);
  sv.storyLog  = generateSurvivorStoryLog(id);
  // Apply resilient trait HP boost
  if (hasTrait(sv, "resilient")) {
    sv.maxHp = Math.round(sv.maxHp * SURVIVOR_TRAITS.resilient.value);
    sv.hp    = sv.maxHp;
  }
  return sv;
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

// ─── Home base initial state ──────────────────────────────────────────────────
// Separate from createInitialState — uses the homebase map, no awakening ring,
// pre-places turrets and garden plots, disables autoplay and exit-level logic.
export function createHomeBaseState() {
  const map = createHomeBaseMap();
  const {
    buildings, roads, gardenPlots, lootPiles, wells,
    extraVehicles, preplacedTurrets, depositChest,
    mainVehicle, settlements, zombies,
  } = map;

  const settlement = settlements[0];
  const spawnX = settlement.cx;
  const spawnY = settlement.cy + 200;

  const vehicles = [mainVehicle, ...extraVehicles];

  // baseStorage starts with a generous starter kit so building is possible right away
  const baseStorage = {
    scrap:    30,
    nails:    40,
    wood:     20,
    food:     30,
    water:    20,
    seeds:    4,
    tools:    2,
    fuel:     4,
  };

  return {
    seed: 0,
    phase: "day",
    dayNumber: 1,
    level: 0,
    _isHomeBase: true,           // key flag — GameView/index use this
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
    zombiesAwakened: true,       // no awakening event on homebase
    firstVehicleEntered: false,
    settlements,
    clearedSettlements: new Set([0]),
    mapFragmentCollected: false,
    fragmentsCollected: [],
    compassTarget: null,         // no fragment hunt on homebase
    totalFragments: 0,
    soundEvents: [],
    hamletCx: settlement.cx,
    hamletCy: settlement.cy,
    homesettlementId: 0,         // always home settlement
    cam: { x: spawnX - 500, y: spawnY - 300 },
    lastTime: performance.now(), tick: 0,
    zombieNightBoost: false, nightSpawnTimer: 0,
    zombiesKilled: 0,
    buildingsSearched: 0,
    survivorsFound: 0,
    turrets: preplacedTurrets,   // pre-built turret at the gate
    depositChest,                // deposit chest for merging carry to worldState
    baseStorage,
    lastBaseTick: Date.now(),
    _missionType: "homebase",
  };
}

// ─── Needs ────────────────────────────────────────────────────────────────────
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