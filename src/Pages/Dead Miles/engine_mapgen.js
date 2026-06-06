// engine_mapgen.js — split from deadMilesEngine.js (pure functions, no React)

import { AWAKENING_COUNT, AWAKENING_INNER, AWAKENING_OUTER, DOOR_MAX_HP, VEHICLE_RADIUS, WORLD_H, WORLD_W, ZOMBIE_GIVE_UP_TIME } from "./engine_constants";
import { createLootPile, dist, findSafeVehiclePosition, seededRand } from "./engine_geometry";
import { createVehicle, createZombie } from "./engine_entities";

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

  // Place well in a clear spot outside all buildings.
  // Try up to 20 random offsets within the settlement centre; if none work,
  // spiral outward until a free tile is found.
  {
    const WELL_RADIUS = 10;
    let wx = cx + (rand() - 0.5) * 200;
    let wy = cy + (rand() - 0.5) * 200;
    const wellInsideBuilding = (x, y) =>
      buildings.some(b => x > b.x - WELL_RADIUS && x < b.x + b.w + WELL_RADIUS &&
                          y > b.y - WELL_RADIUS && y < b.y + b.h + WELL_RADIUS);

    if (wellInsideBuilding(wx, wy)) {
      let placed = false;
      // Try 20 random positions close to settlement centre
      for (let attempt = 0; attempt < 20; attempt++) {
        const tx = cx + (rand() - 0.5) * 300;
        const ty = cy + (rand() - 0.5) * 300;
        if (!wellInsideBuilding(tx, ty)) { wx = tx; wy = ty; placed = true; break; }
      }
      // Spiral outward if random attempts failed
      if (!placed) {
        for (let r = 60; r <= 400; r += 30) {
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const tx = cx + Math.cos(a) * r;
            const ty = cy + Math.sin(a) * r;
            if (!wellInsideBuilding(tx, ty)) { wx = tx; wy = ty; placed = true; break; }
          }
          if (placed) break;
        }
      }
    }
    wells.push({ id: `well_s${sid}`, x: wx, y: wy, radius: WELL_RADIUS });
  }

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

// ─── Home base map ────────────────────────────────────────────────────────────
// A large, sparse map with one settlement pre-established as the player's base.
// Starts with a turret and garden plot already placed.
// Very few zombies — this is the sim hub, not a combat mission.
export function createHomeBaseMap() {
  // Centre the settlement in the world so there's room to expand in all directions
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  const DMAX_HP = DOOR_MAX_HP;

  function B(ox, oy, bw, bh, opts = {}) {
    return {
      x: cx + ox - bw / 2,
      y: cy + oy - bh / 2,
      w: bw, h: bh,
      barricadeHp: 0,
      hp: 100, maxHp: 100,
      searched: false,
      ...opts,
    };
  }

  // ── Buildings ───────────────────────────────────────────────────────────────
  // Arranged in a rough compound — farmhouse at centre, outbuildings spread out

  const buildings = [
    // Main farmhouse — the command centre
    {
      ...B(0, 0, 260, 200, {}),
      id: "hb_farmhouse", type: "farmhouse", label: "Farmhouse",
      description: "Your base of operations. Has a bed and storage.",
      doors: [
        { id: "hb_farm_s", side: "south", offset: 0.4, width: 34, open: false, hp: DMAX_HP, broken: false },
        { id: "hb_farm_e", side: "east",  offset: 0.5, width: 28, open: false, hp: DMAX_HP, broken: false },
        { id: "hb_farm_n", side: "north", offset: 0.6, width: 28, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "food",  qty: 20 },
        { type: "water", qty: 20 },
        { type: "nails", qty: 24 },
        { type: "scrap", qty: 16 },
        { type: "seeds", qty: 4 },
        { type: "wood",  qty: 10 },
      ],
      barricadeable: true, barricadeDoors: 3,
      hasBed: true, hasWell: false,
      isHomeBuilding: true,
    },

    // Workshop — crafting and repairs
    {
      ...B(-420, -80, 180, 140, {}),
      id: "hb_workshop", type: "shed", label: "Workshop",
      description: "Tools and parts for building and repair.",
      doors: [
        { id: "hb_ws_e", side: "east", offset: 0.5, width: 32, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "scrap",     qty: 20 },
        { type: "nails",     qty: 30 },
        { type: "wood",      qty: 12 },
        { type: "tools",     qty: 2 },
        { type: "car_parts", qty: 2 },
      ],
      barricadeable: false,
    },

    // Barn — storage and food
    {
      ...B(460, -100, 220, 160, {}),
      id: "hb_barn", type: "barn", label: "Barn",
      description: "Hay bales and grain. Useful for food stores.",
      doors: [
        { id: "hb_barn_w",  side: "west",  offset: 0.4, width: 36, open: false, hp: DMAX_HP, broken: false },
        { id: "hb_barn_w2", side: "west",  offset: 0.7, width: 36, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "food",  qty: 25 },
        { type: "wood",  qty: 16 },
        { type: "seeds", qty: 3 },
      ],
      barricadeable: true,
    },

    // Guard shack — small fortified entry point
    {
      ...B(0, 520, 120, 100, {}),
      id: "hb_guardshack", type: "shed", label: "Guard Shack",
      description: "Front gate. Good spot for a turret.",
      doors: [
        { id: "hb_gs_n", side: "north", offset: 0.5, width: 28, open: false, hp: DMAX_HP, broken: false },
        { id: "hb_gs_s", side: "south", offset: 0.5, width: 24, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "nails", qty: 10 },
        { type: "scrap", qty: 8 },
      ],
      barricadeable: true,
    },

    // Watchtower (ruined house repurposed)
    {
      ...B(-380, 380, 140, 120, {}),
      id: "hb_watchtower", type: "house", label: "Watchtower",
      description: "Gives a view of the south approach.",
      doors: [
        { id: "hb_wt_e", side: "east", offset: 0.5, width: 26, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "food",  qty: 8 },
        { type: "water", qty: 6 },
        { type: "nails", qty: 6 },
      ],
      barricadeable: true,
    },

    // Fuel depot — away from main buildings, fire hazard
    {
      ...B(560, 400, 150, 110, {}),
      id: "hb_fueldepot", type: "shed", label: "Fuel Depot",
      description: "Cans of fuel and some food.",
      doors: [
        { id: "hb_fd_w", side: "west", offset: 0.5, width: 28, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "fuel", qty: 6 },
        { type: "food", qty: 6 },
      ],
      barricadeable: false,
    },

    // Ruined church at the edge — has some medical supplies
    {
      ...B(-200, -600, 170, 200, {}),
      id: "hb_church", type: "church", label: "Old Church",
      description: "Crumbling roof. Someone stashed medicine here.",
      doors: [
        { id: "hb_ch_s", side: "south", offset: 0.5, width: 32, open: false, hp: DMAX_HP, broken: false },
        { id: "hb_ch_n", side: "north", offset: 0.5, width: 24, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "medicine", qty: 3 },
        { type: "food",     qty: 10 },
        { type: "nails",    qty: 8 },
      ],
      barricadeable: true,
      zombieGuards: 3,
    },

    // Far cabin — exploration reward
    {
      ...B(900, -700, 160, 130, {}),
      id: "hb_cabin", type: "cabin", label: "Remote Cabin",
      description: "Far from the main base. Worth checking out.",
      doors: [
        { id: "hb_cab_w", side: "west", offset: 0.5, width: 26, open: false, hp: DMAX_HP, broken: false },
      ],
      loot: [
        { type: "food",        qty: 14 },
        { type: "car_parts",   qty: 2 },
        { type: "tools",       qty: 1 },
        { type: "ammo",        qty: 8 },
      ],
      barricadeable: true,
      zombieGuards: 2,
    },
  ];

  // ── Roads ───────────────────────────────────────────────────────────────────
  const roads = [
    // Main north-south spine through the base
    { x1: cx,       y1: cy - 900, x2: cx,       y2: cy + 700 },
    // East-west cross road
    { x1: cx - 700, y1: cy,       x2: cx + 800, y2: cy },
    // Perimeter loop (rough)
    { x1: cx - 700, y1: cy - 300, x2: cx + 800, y2: cy - 300 },
    { x1: cx - 700, y1: cy + 400, x2: cx + 800, y2: cy + 400 },
    { x1: cx - 700, y1: cy - 300, x2: cx - 700, y2: cy + 400 },
    { x1: cx + 800, y1: cy - 300, x2: cx + 800, y2: cy + 400 },
  ];

  // ── Garden plots ─────────────────────────────────────────────────────────────
  // Two plots — one by the farmhouse, one larger one to the east (already established)
  const gardenPlots = [
    {
      id: "hb_plot_main",
      x: cx + 130, y: cy - 90,
      w: 90, h: 80,
      crop: null, growTimer: 0,
    },
    {
      id: "hb_plot_east",
      x: cx + 130, y: cy + 30,
      w: 90, h: 70,
      crop: null, growTimer: 0,
    },
  ];

  // ── Wells ────────────────────────────────────────────────────────────────────
  const wells = [
    {
      id: "hb_well_main",
      x: cx + 240, y: cy - 20,
      radius: 10,
    },
    {
      id: "hb_well_barn",
      x: cx + 590, y: cy - 60,
      radius: 10,
    },
  ];

  // ── Loot piles ───────────────────────────────────────────────────────────────
  const lootPiles = buildings.map(b => {
    const lx = b.x + b.w * 0.5 + (Math.random() - 0.5) * b.w * 0.3;
    const ly = b.y + b.h * 0.5 + (Math.random() - 0.5) * b.h * 0.3;
    return createLootPile(b.id, b.loot, lx, ly);
  });

  // ── Pre-placed turret ────────────────────────────────────────────────────────
  // Sits at the south entry near the guard shack — already built for you
  const preplacedTurrets = [
    {
      id: "hb_turret_gate",
      x: cx + 60,
      y: cy + 530,
      hp: 150, maxHp: 150,
      range: 200, damage: 25,
      shootCooldown: 0,
      fireRate: 1.5,
      attractRadius: 450,
      destroyed: false,
      radius: 14,
      _homebasePlaced: true,
    },
  ];

  // ── Deposit chest ─────────────────────────────────────────────────────────────
  // Walk up and press E to dump carry inventory into base storage
  const depositChest = {
    id: "hb_deposit",
    x: cx - 60,
    y: cy + 120,
    radius: 22,
    label: "Supply Drop",
    type: "deposit_chest",
  };

  // ── Vehicles ─────────────────────────────────────────────────────────────────
  const truckPos = { x: cx - 180, y: cy + 260 };
  const bikePos  = { x: cx + 320, y: cy + 240 };
  const mainVehicle = createVehicle(truckPos.x, truckPos.y, "car");
  const bike        = createVehicle(bikePos.x, bikePos.y, "bike");
  bike.id = "hb_bike";
  const extraVehicles = [bike];

  // ── Settlement record ────────────────────────────────────────────────────────
  const settlement = {
    id: 0,
    name: "Home Base",
    cx, cy,
    cleared: true,        // starts cleared — this is your turf
    survivorDefs: [],
    isHomeBase: true,
  };

  // ── Zombies — very sparse, mostly distant ─────────────────────────────────────
  // A few walkers scattered at the map edges; the base itself is clear
  const zombies = [];
  let zid = 5000;
  const CLEAR_RADIUS = 800; // no zombies within this distance of base centre

  // Scattered roamers at mid-range
  const roamerPositions = [
    // Each cluster: [cx offset, cy offset, count]
    [-1800,    0, 4], [-1800, -800, 3], [-1800,  800, 3],
    [ 1800,    0, 4], [ 1800, -800, 3], [ 1800,  800, 3],
    [    0, -1800, 4], [-800, -1800, 3], [ 800, -1800, 3],
    [    0,  1800, 4], [-800,  1800, 3], [ 800,  1800, 3],
    [-1200, -1200, 3], [ 1200, -1200, 3],
    [-1200,  1200, 3], [ 1200,  1200, 3],
  ];

  for (const [ox, oy, count] of roamerPositions) {
    for (let i = 0; i < count; i++) {
      const zx = Math.max(100, Math.min(WORLD_W - 100, cx + ox + (Math.random() - 0.5) * 300));
      const zy = Math.max(100, Math.min(WORLD_H - 100, cy + oy + (Math.random() - 0.5) * 300));
      const dist_ = Math.hypot(zx - cx, zy - cy);
      if (dist_ < CLEAR_RADIUS) continue;
      zombies.push(createZombie(zid++, zx, zy, Math.random() > 0.85 ? "brute" : "walker"));
    }
  }

  // Zombie guards for specific buildings (church, cabin)
  for (const b of buildings) {
    const guards = b.zombieGuards ?? 0;
    for (let i = 0; i < guards; i++) {
      const gx = b.x + b.w * 0.5 + (Math.random() - 0.5) * b.w * 1.4;
      const gy = b.y + b.h * 0.5 + (Math.random() - 0.5) * b.h * 1.4;
      zombies.push(createZombie(zid++, gx, gy, "walker"));
    }
  }

  return {
    buildings,
    roads,
    gardenPlots,
    lootPiles,
    wells,
    extraVehicles,
    preplacedTurrets,
    depositChest,
    mainVehicle,
    settlements: [settlement],
    isHomeBase: true,
    zombies,
  };
}

// ─── Entity constructors ──────────────────────────────────────────────────────