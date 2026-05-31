// src/Pages/DeadMiles/deadMilesEngine.js
// Pure functions — no React, no side effects.

// ─── World ────────────────────────────────────────────────────────────────────

export const WORLD_W = 6000;
export const WORLD_H = 6000;

export const NEEDS_TUNE = {
  food:  { drainPerSec: 0.6,  warnAt: 40, critAt: 15 },
  water: { drainPerSec: 0.8,  warnAt: 40, critAt: 15 },
  sleep: { drainPerSec: 0.4,  warnAt: 35, critAt: 12 },
};

export const PLAYER_SPEED_BASE    = 160;
export const PLAYER_SPEED_TIRED   = 100;
export const PLAYER_SPEED_VEHICLE = 300;
export const PLAYER_RADIUS        = 7;

export const ZOMBIE_SPEED_SLOW    = 38;
export const ZOMBIE_SPEED_NIGHT   = 60;
export const ZOMBIE_RADIUS        = 9;
export const ZOMBIE_SIGHT_RANGE   = 200;
export const ZOMBIE_SOUND_RANGE   = 320;
export const ZOMBIE_GIVE_UP_TIME  = 5.0;
export const ZOMBIE_ATTACK_RANGE  = 14;
export const ZOMBIE_ATTACK_DAMAGE = 8;
export const ZOMBIE_ATTACK_RATE   = 0.8;

export const PLAYER_MAX_HP        = 100;
export const PLAYER_HP_REGEN      = 0;
export const VEHICLE_MAX_HP       = 300;
export const VEHICLE_RADIUS       = 22;

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

export const CROP_GROW_TIME = { fast: 60 * 2, normal: 60 * 3 };
export const IN_GAME_DAY_SECS = 300;

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
  // If exactly on the segment, nudge in a stable direction to avoid NaN
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
        { id: "barn_s1", side: "south", offset: 0.32, width: 32, open: false },
        { id: "barn_s2", side: "south", offset: 0.68, width: 32, open: false },
      ],
      loot: [
        { type: "wood",  qty: 6 },
        { type: "food",  qty: 10 },
        { type: "tools", qty: 1 },
      ],
      barricadeable: true,
    },
    {
      ...B(60, -480, 170, 230, {}),
      id: "church", type: "church", label: "Church",
      description: "Dark inside. Something useful in the back.",
      doors: [
        { id: "church_s", side: "south", offset: 0.5,  width: 34, open: false },
        { id: "church_n", side: "north", offset: 0.5,  width: 22, open: false },
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
        { id: "farm_w", side: "west", offset: 0.5,  width: 30, open: false },
        { id: "farm_e", side: "east", offset: 0.65, width: 26, open: false },
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
        { id: "shed_e", side: "east", offset: 0.5, width: 28, open: false },
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
        { id: "h1_s", side: "south", offset: 0.4, width: 28, open: false },
        { id: "h1_e", side: "east",  offset: 0.5, width: 24, open: false },
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
        { id: "h2_s", side: "south", offset: 0.35, width: 28, open: false },
        { id: "h2_w", side: "west",  offset: 0.5,  width: 24, open: false },
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
        { id: "cabin_w", side: "west",  offset: 0.5,  width: 26, open: false },
        { id: "cabin_n", side: "north", offset: 0.55, width: 22, open: false },
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
        { id: "gas_w", side: "west", offset: 0.5, width: 34, open: false },
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

  return { buildings, roads, gardenPlots, lootPiles, wells };
}

// ─── Level 2+ procedural highway map ─────────────────────────────────────────

export function createHighwayMap(seed, difficulty = 1) {
  const rand = seededRand(seed);
  const roadCx = WORLD_W / 2;
  const roadW  = 200; // total road width (two lanes)
  const roadL  = roadCx - roadW / 2; // left edge x
  const roadR  = roadCx + roadW / 2; // right edge x

  // ── Roads ──────────────────────────────────────────────────────────────────
  const roads = [
    // Main N-S highway
    { x1: roadL, y1: 200,  x2: roadL, y2: 5600 },
    { x1: roadR, y1: 200,  x2: roadR, y2: 5600 },
    // Center dashes drawn via horizontal line segments (horizontal markers every ~200px)
    ...Array.from({ length: 26 }, (_, i) => ({
      x1: roadCx, y1: 250 + i * 200,
      x2: roadCx, y2: 250 + i * 200 + 100,
    })),
  ];

  const buildings = [];
  const lootPiles = [];
  const gardenPlots = [];
  const wells = [];

  // ── Helper ─────────────────────────────────────────────────────────────────
  const BUILDING_TYPES = ["house", "shed", "barn", "cabin"];
  const TYPE_SIZES = {
    house:  [160, 140],
    shed:   [130, 100],
    barn:   [220, 150],
    cabin:  [150, 130],
  };

  function makeLoot(type, diff) {
    const base = [
      { type: "food",  qty: Math.ceil((6 + rand() * 10) * (1 + diff * 0.2)) },
      { type: "nails", qty: Math.ceil((4 + rand() * 8)  * (1 + diff * 0.15)) },
    ];
    if (rand() > 0.5) base.push({ type: "water", qty: Math.ceil(4 + rand() * 8) });
    if (rand() > 0.6) base.push({ type: "wood",  qty: Math.ceil(3 + rand() * 6) });
    if (diff >= 2 && rand() > 0.5) base.push({ type: "car_parts", qty: Math.ceil(1 + rand() * 2) });
    if (diff >= 2 && rand() > 0.7) base.push({ type: "bat", qty: 1 });
    if (diff >= 3 && rand() > 0.6) base.push({ type: "tools", qty: 1 });
    return base;
  }

  // ── Scatter roadside buildings ─────────────────────────────────────────────
  const numBuildings = Math.floor(12 + rand() * 6); // 12-18
  const yStep = (5000 - 900) / numBuildings; // spread from y=900 to y=5000
  // Avoid the community zone (y 400-800)

  for (let i = 0; i < numBuildings; i++) {
    const side    = i % 2 === 0 ? "left" : "right"; // alternate sides
    const btype   = BUILDING_TYPES[Math.floor(rand() * BUILDING_TYPES.length)];
    const [bw, bh] = TYPE_SIZES[btype];
    const setback = 80 + rand() * 100;

    const bx = side === "left"
      ? roadL - setback - bw
      : roadR + setback;
    const by = 900 + i * yStep + (rand() - 0.5) * yStep * 0.4;

    const doorSide = side === "left" ? "east" : "west";
    const bid = `hw_b${i}`;

    const b = {
      id: bid, type: btype, label: btype.charAt(0).toUpperCase() + btype.slice(1),
      x: bx, y: by, w: bw, h: bh,
      barricadeHp: 0, hp: 100, maxHp: 100, searched: false,
      description: `A roadside ${btype}.`,
      doors: [
        { id: `${bid}_d1`, side: doorSide, offset: 0.5, width: 28, open: false, hp: DOOR_MAX_HP, broken: false },
        ...(rand() > 0.5
          ? [{ id: `${bid}_d2`, side: doorSide === "east" ? "north" : "south", offset: 0.4, width: 24, open: false, hp: DOOR_MAX_HP, broken: false }]
          : []),
      ],
      loot: makeLoot(btype, difficulty),
      barricadeable: rand() > 0.4,
      zombieGuards: rand() > 0.6 ? Math.ceil(1 + rand() * (1 + difficulty)) : 0,
    };
    buildings.push(b);

    const lx = bx + bw * (0.3 + rand() * 0.4);
    const ly = by + bh * (0.3 + rand() * 0.4);
    lootPiles.push(createLootPile(bid, b.loot, lx, ly));
  }

  // ── Community cluster at north end (y 400-800) ─────────────────────────────
  // Buildings: store, clinic, garage, house_a, house_b
  const communityDefs = [
    { id: "com_store",  type: "shed",   label: "General Store", w: 200, h: 150, ox: -140, oy:  50 },
    { id: "com_clinic", type: "house",  label: "Clinic",        w: 160, h: 130, ox:  100, oy:  40 },
    { id: "com_garage", type: "barn",   label: "Garage",        w: 220, h: 160, ox: -130, oy: 210 },
    { id: "com_houseA", type: "house",  label: "House",         w: 150, h: 130, ox:   90, oy: 200 },
    { id: "com_houseB", type: "cabin",  label: "Cabin",         w: 140, h: 120, ox:    0, oy: 340 },
  ];

  const comCx = roadCx;
  const comCy = 600; // center of community

  // One building gets the map_fragment — pick the clinic
  communityDefs.forEach((def, idx) => {
    const bx = comCx + def.ox - def.w / 2;
    const by = comCy + def.oy - def.h / 2;
    const loot = [
      { type: "food",  qty: 10 + Math.floor(rand() * 10) },
      { type: "water", qty: 8  + Math.floor(rand() * 8) },
      { type: "nails", qty: 6  + Math.floor(rand() * 8) },
    ];
    if (def.id === "com_clinic") {
      loot.push({ type: "map_fragment", qty: 1 });
    }
    if (difficulty >= 2 && rand() > 0.5) loot.push({ type: "car_parts", qty: 1 });

    const b = {
      id: def.id, type: def.type, label: def.label,
      x: bx, y: by, w: def.w, h: def.h,
      barricadeHp: 0, hp: 100, maxHp: 100, searched: false,
      description: def.label,
      doors: [
        { id: `${def.id}_s`, side: "south", offset: 0.5, width: 30, open: false, hp: DOOR_MAX_HP, broken: false },
        { id: `${def.id}_e`, side: "east",  offset: 0.5, width: 26, open: false, hp: DOOR_MAX_HP, broken: false },
      ],
      loot,
      barricadeable: true,
      zombieGuards: Math.ceil(2 + rand() * difficulty * 2),
    };
    buildings.push(b);

    const lx = bx + def.w * (0.35 + rand() * 0.3);
    const ly = by + def.h * (0.35 + rand() * 0.3);
    lootPiles.push(createLootPile(def.id, loot, lx, ly));
  });

  // A well near the community
  wells.push({
    id: "well_community",
    x: comCx + 20,
    y: comCy + 430,
    radius: 10,
  });

  return { buildings, roads, gardenPlots, lootPiles, wells };
}

// ─── Zombie spawn points ──────────────────────────────────────────────────────

export function getLevel1ZombieSpawns(seed) {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const rand = seededRand(seed);

  const clusters = [
    { x: cx - 100, y: cy - 700, count: 3 },
    { x: cx + 400, y: cy - 720, count: 3 },
    { x: cx + 100, y: cy - 260, count: 2 },
    { x: cx - 20,  y: cy - 530, count: 4 },
    { x: cx + 850, y: cy + 400, count: 2 },
    { x: cx + 680, y: cy - 80,  count: 3 },
    { x: cx - 600, y: cy + 160, count: 1 },
    { x: cx + 720, y: cy - 280, count: 1 },
  ];

  const zombies = [];
  let id = 1;
  clusters.forEach(c => {
    for (let i = 0; i < c.count; i++) {
      zombies.push(createZombie(id++, c.x + (rand() - 0.5) * 80, c.y + (rand() - 0.5) * 80));
    }
  });
  return zombies;
}

export function getHighwayZombieSpawns(seed, difficulty = 1) {
  const rand = seededRand(seed ^ 0xdeadbeef);
  const roadCx = WORLD_W / 2;
  const clusterCount = Math.floor(8 + difficulty * 2);
  const zombies = [];
  let id = 1000;

  for (let i = 0; i < clusterCount; i++) {
    const cx = roadCx + (rand() - 0.5) * 800;
    const cy = 500 + rand() * 4800;
    const count = Math.ceil(3 + difficulty * 2);
    for (let j = 0; j < count; j++) {
      zombies.push(createZombie(id++, cx + (rand() - 0.5) * 100, cy + (rand() - 0.5) * 100));
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
  };
}

export function createVehicle(x, y) {
  return {
    x, y, hp: VEHICLE_MAX_HP, maxHp: VEHICLE_MAX_HP,
    fuel: 80, maxFuel: 100, speed: PLAYER_SPEED_VEHICLE,
    facing: 0,
    occupied: false,
    driver: null,
    passenger: null,
    upgrades: [],
    radius: VEHICLE_RADIUS,
  };
}

export function createZombie(id, x, y, type = "walker") {
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

export function createSurvivor(id, x, y, name, role) {
  return { id, x, y, name, role, hp: 80, maxHp: 80, status: "found", assignedTo: null, morale: 100 };
}

export function createCrop(plotId, type, x, y) {
  const growTime = type === "potato" ? CROP_GROW_TIME.fast : CROP_GROW_TIME.normal;
  return {
    id: `crop_${plotId}_${Date.now()}`, plotId, type, x, y,
    growTimer: 0, growTime, stage: "planted",
  };
}

// ─── Game state ───────────────────────────────────────────────────────────────

export function createInitialState(seed = Date.now(), level = 1) {
  const isHighway = level > 1;
  const diff = level - 1;

  const { buildings, roads, gardenPlots, lootPiles, wells } = isHighway
    ? createHighwayMap(seed, diff)
    : createLevel1Map();

  // Player spawn
  const spawnX = isHighway ? WORLD_W / 2 : WORLD_W / 2 - 420;
  const spawnY = isHighway ? 5400         : WORLD_H / 2 + 260;

  // Vehicle spawn nearby
  const vSpawnX = spawnX + 60;
  const vSpawnY = spawnY + 50;

  return {
    seed, phase: "day", dayNumber: 1, level,
    dayTimer: IN_GAME_DAY_SECS, isNight: false,
    player:   createPlayer(spawnX, spawnY),
    player2:  null,
    p2Target: { x: spawnX, y: spawnY },
    vehicle:  createVehicle(vSpawnX, vSpawnY),
    buildings, roads, gardenPlots, lootPiles, wells,
    crops: [], zombies: isHighway
      ? getHighwayZombieSpawns(seed, diff)
      : getLevel1ZombieSpawns(seed),
    survivors: [], floaters: [], items: [],
    cam: { x: spawnX - 500, y: spawnY - 300 },
    lastTime: performance.now(), tick: 0,
    zombieNightBoost: false, nightSpawnTimer: 0,
    // Stats
    zombiesKilled: 0,
    buildingsSearched: 0,
    survivorsFound: 0,
    // Map fragment
    mapFragmentCollected: false,
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
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len, ny = dy / len;
  vehicle.x = Math.max(VEHICLE_RADIUS, Math.min(WORLD_W - VEHICLE_RADIUS, vehicle.x + nx * vehicle.speed * dt));
  vehicle.y = Math.max(VEHICLE_RADIUS, Math.min(WORLD_H - VEHICLE_RADIUS, vehicle.y + ny * vehicle.speed * dt));
  vehicle.facing = Math.atan2(ny, nx);
  vehicle.fuel = Math.max(0, vehicle.fuel - 0.4 * dt);
  if (buildings) {
    for (const b of buildings) resolveWallCollision(vehicle, b);
  }
}

export function syncPlayerToVehicle(player, vehicle) {
  player.x = vehicle.x; player.y = vehicle.y;
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────

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

export function exitVehicle(player, vehicle, role) {
  player.inVehicle = false;
  if (vehicle.driver === role) {
    vehicle.driver = null;
    vehicle.occupied = vehicle.passenger !== null;
  } else if (vehicle.passenger === role) {
    vehicle.passenger = null;
  }
  player.x = vehicle.x + VEHICLE_RADIUS + PLAYER_RADIUS + 6;
  player.y = vehicle.y;
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

// Returns a point offset through the doorway by (radius + margin) so the
// zombie's movement vector passes cleanly through the gap rather than aiming
// at the wall centre and getting squeezed by adjacent wall-segment resolvers.
function doorWaypoint(building, door, zombie, offsetDir = 1) {
  const dc = getDoorCenter(building, door);
  const OFFSET = ZOMBIE_RADIUS + 6; // past the wall plane
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
        // Waypoint is outside the building so the zombie exits cleanly
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
        // Waypoint is outside the building (approaching from outside)
        best = doorWaypoint(targetBuilding, door, zombie, -1);
      }
    }
    return best;
  }
  return null;
}

export function updateZombies(zombies, player, vehicle, dt, isNight, buildings, player2 = null) {
  const speed = isNight ? ZOMBIE_SPEED_NIGHT : ZOMBIE_SPEED_SLOW;
  zombies.forEach(z => {
    if (z.dead) return;
    z.speed = speed;
    if (z.attackCooldown > 0) z.attackCooldown -= dt;

    const { targetX, targetY, targetPlayer, inVehicle: targetInVehicle } =
      getNearestTarget(z, player, player2, vehicle);
    const dToPlayer = dist(z.x, z.y, targetX, targetY);

    const wallOccluded = buildings ? isPlayerOccludedByWalls(z, targetPlayer, buildings) : false;
    const canSee  = !wallOccluded && dToPlayer < ZOMBIE_SIGHT_RANGE;
    const canHear = (targetInVehicle && dToPlayer < ZOMBIE_SOUND_RANGE)
                 || (buildings ? canHearThroughDoor(z, targetPlayer, buildings) : false);

    switch (z.state) {
      case "wander": {
        if (canSee || canHear) { z.state = "alert"; z.alertTimer = 0.4; }
        else {
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
          z.giveUpTimer += dt;
          if (z.giveUpTimer >= ZOMBIE_GIVE_UP_TIME) { z.state = "wander"; z.giveUpTimer = 0; }
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
    if (target === "vehicle") vehicleDmg += ZOMBIE_ATTACK_DAMAGE * 0.5;
    else if (target === "p2") p2Dmg += ZOMBIE_ATTACK_DAMAGE;
    else playerDmg += ZOMBIE_ATTACK_DAMAGE;
  });
  player.hp  = Math.max(0, player.hp  - playerDmg);
  vehicle.hp = Math.max(0, vehicle.hp - vehicleDmg);
  if (player2 && p2Dmg > 0) player2.hp = Math.max(0, player2.hp - p2Dmg);
  return { playerDmg, vehicleDmg, p2Dmg };
}

export function updateVehicleCollisions(vehicle, zombies, dt, buildings) {
  if (!vehicle.occupied) return;
  zombies.forEach(z => {
    if (z.dead) return;
    const d = dist(vehicle.x, vehicle.y, z.x, z.y);
    if (d < VEHICLE_RADIUS + z.radius) {
      if (buildings && areWallSeparated(vehicle.x, vehicle.y, z.x, z.y, buildings)) return;
      z.hp -= 40; if (z.hp <= 0) z.dead = true;
      const ang = Math.atan2(z.y - vehicle.y, z.x - vehicle.x);
      z.x += Math.cos(ang) * 30; z.y += Math.sin(ang) * 30;
    }
  });
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
      z.hp -= MELEE_DAMAGE; if (z.hp <= 0) z.dead = true;
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
      // Fuel goes straight to the vehicle tank, not inventory
      if (item.type === "fuel" && vehicle) {
        const toAdd = Math.min(item.qty * 25, vehicle.maxFuel - vehicle.fuel);
        vehicle.fuel = Math.min(vehicle.maxFuel, vehicle.fuel + item.qty * 25);
        fuelGained.qty += item.qty * 25;
        gained.push({ ...item, autoFueled: true });
        return;
      }
      addToInventory(player.inventory, item.type, item.qty);
      gained.push(item);
      // Auto-equip weapon
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

export function getProximityActions(player, buildings, vehicle, gardenPlots, crops, lootPiles, wells) {
  const actions = [];

  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < 70)
    actions.push({ key: "F", label: vehicle.occupied ? "Vehicle occupied" : "Enter vehicle" });
  if (player.inVehicle)
    actions.push({ key: "F", label: "Exit vehicle" });

  // Vehicle repair (only when not in vehicle and near it)
  if (!player.inVehicle && dist(player.x, player.y, vehicle.x, vehicle.y) < REPAIR_RANGE) {
    const parts = getInventoryCount(player.inventory, "car_parts");
    if (parts > 0 && vehicle.hp < vehicle.maxHp) {
      actions.push({ key: "E", label: `Repair vehicle (+${REPAIR_HP_GAIN} HP) [${parts} parts]` });
    }
  }

  if (player.inVehicle) return actions;

  // Doors
  for (const b of buildings) {
    if (!b.doors) continue;
    for (const door of b.doors) {
      const c = getDoorCenter(b, door);
      if (dist(player.x, player.y, c.x, c.y) < DOOR_INTERACT_RANGE) {
        actions.push({ key: "F", label: door.open ? `Close door` : `Open door` });
      }
    }
  }

  // Loot piles
  for (const pile of lootPiles) {
    if (pile.collected) continue;
    if (dist(player.x, player.y, pile.x, pile.y) > LOOT_RANGE) continue;
    const names = pile.items.map(i => `${i.qty}× ${i.type}`).join(", ");
    actions.push({ key: "F", label: `Loot (${names})` });
  }

  // Barricade
  for (const b of buildings) {
    if (!b.barricadeable || b.barricadeHp > 0) continue;
    const nearDoor = (b.doors || []).some(d => {
      const c = getDoorCenter(b, d);
      return dist(player.x, player.y, c.x, c.y) < SEARCH_RANGE;
    });
    if (nearDoor || isInsideBuilding(player, b))
      actions.push({ key: "B", label: `Barricade ${b.label}` });
  }

  // Well
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

  // Crops
  const readyCrop = crops.find(c => {
    if (c.stage !== "ready") return false;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    return plot && dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) < 60;
  });
  if (readyCrop) actions.push({ key: "F", label: "Harvest crops" });

  const emptyPlot = gardenPlots.find(p =>
    !crops.some(c => c.plotId === p.id) &&
    dist(player.x, player.y, p.x + p.w / 2, p.y + p.h / 2) < 60
  );
  if (emptyPlot) actions.push({ key: "F", label: "Plant crops" });

  // Sleep
  for (const b of buildings) {
    if (isInsideBuilding(player, b))
      actions.push({ key: "Z", label: player.isSleeping ? "Wake up" : "Sleep here" });
  }

  actions.push({ key: "Q", label: "Eat food" });
  actions.push({ key: "R", label: "Drink water" });
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

export function tryHarvestCrop(player, gardenPlots, crops) {
  for (let i = crops.length - 1; i >= 0; i--) {
    const c = crops[i];
    if (c.stage !== "ready") continue;
    const plot = gardenPlots.find(p => p.id === c.plotId);
    if (!plot) continue;
    if (dist(player.x, player.y, plot.x + plot.w / 2, plot.y + plot.h / 2) > 60) continue;
    const qty = c.type === "potato" ? 12 : 10;
    addToInventory(player.inventory, "food", qty);
    crops.splice(i, 1);
    return { type: c.type, qty, id: c.id };
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
  state.nightSpawnTimer = Math.max(3, 8 - state.dayNumber * 0.5);
  const edge = Math.floor(Math.random() * 4);
  const rand = Math.random;
  let sx, sy;
  if (edge === 0)      { sx = rand() * WORLD_W; sy = 10; }
  else if (edge === 1) { sx = WORLD_W - 10;     sy = rand() * WORLD_H; }
  else if (edge === 2) { sx = rand() * WORLD_W; sy = WORLD_H - 10; }
  else                 { sx = 10;               sy = rand() * WORLD_H; }
  state.zombies.push(createZombie(Date.now() + Math.random(), sx, sy));
}

// ─── Level exit (north highway escape) ───────────────────────────────────────

export const EXIT_TARGET_X = WORLD_W / 2;
export const EXIT_TARGET_Y = 100;
export const EXIT_Y_THRESHOLD = 200;

export function checkLevelExit(state) {
  if (!state.mapFragmentCollected) return false;
  if (!state.vehicle.occupied) return false;
  if (state.vehicle.y > EXIT_Y_THRESHOLD) return false;
  return true;
}