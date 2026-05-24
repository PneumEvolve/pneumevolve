// src/Pages/Homestead/gameEngine.js
// Pure functions — no React, no side effects.

export const TILE        = 32;
export const WORLD_COLS  = 40;
export const WORLD_ROWS  = 36;
export const WORLD_PX_W  = WORLD_COLS * TILE;
export const WORLD_PX_H  = WORLD_ROWS * TILE;

// ─── Tile types ───────────────────────────────────────────────────────────────
export const T = {
  GRASS:      0,
  DIRT:       1,
  PATH:       2,
  WATER:      3,
  TALL_GRASS: 4,
  STONE:      5,
};

// ─── Object types ─────────────────────────────────────────────────────────────
// Each object: { id, type, tx, ty, w, h, solid, interact, label, ...extras }
export const OBJ = {
  HOUSE:    'house',
  CHEST:    'chest',
  BOARD:    'board',    // run notice board
  WELL:     'well',
  TREE:     'tree',
  FLOWERS:  'flowers',
  FENCE_H:  'fence_h',
  FENCE_V:  'fence_v',
  SIGN:     'sign',
  CRAFTING: 'crafting', // crafting station (built later)
  FARM_PLOT:'farm_plot',
};

// ─── Default homestead layout ─────────────────────────────────────────────────
export function defaultObjects() {
  return [
    // House — top-left quadrant
    { id:'house_0',    type:OBJ.HOUSE,   tx:3,  ty:3,  w:4, h:3, solid:true,  interact:false },
    // Shared chest — beside house
    { id:'chest_0',    type:OBJ.CHEST,   tx:8,  ty:5,  w:1, h:1, solid:true,  interact:true,  label:'[E] Open chest' },
    // Run notice board — on the path
    { id:'board_0',    type:OBJ.BOARD,   tx:19, ty:10, w:1, h:1, solid:true,  interact:true,  label:'[E] Start a run' },
    // Well
    { id:'well_0',     type:OBJ.WELL,    tx:9,  ty:3,  w:1, h:1, solid:false, interact:false },
    // Decorative trees
    { id:'tree_0',     type:OBJ.TREE,    tx:2,  ty:15, w:1, h:1, solid:true,  interact:false },
    { id:'tree_1',     type:OBJ.TREE,    tx:3,  ty:16, w:1, h:1, solid:true,  interact:false },
    { id:'tree_2',     type:OBJ.TREE,    tx:32, ty:3,  w:1, h:1, solid:true,  interact:false },
    { id:'tree_3',     type:OBJ.TREE,    tx:33, ty:4,  w:1, h:1, solid:true,  interact:false },
    { id:'tree_4',     type:OBJ.TREE,    tx:34, ty:3,  w:1, h:1, solid:true,  interact:false },
    { id:'tree_5',     type:OBJ.TREE,    tx:33, ty:16, w:1, h:1, solid:true,  interact:false },
    { id:'tree_6',     type:OBJ.TREE,    tx:34, ty:17, w:1, h:1, solid:true,  interact:false },
    // Flowers
    { id:'flower_0',   type:OBJ.FLOWERS, tx:7,  ty:3,  w:1, h:1, solid:false, interact:false },
    { id:'flower_1',   type:OBJ.FLOWERS, tx:6,  ty:4,  w:1, h:1, solid:false, interact:false },
    { id:'flower_2',   type:OBJ.FLOWERS, tx:9,  ty:4,  w:1, h:1, solid:false, interact:false },
    // Fence along top of homestead
    { id:'fence_h_0',  type:OBJ.FENCE_H, tx:2,  ty:2,  w:16,h:0, solid:false, interact:false },
    { id:'fence_v_0',  type:OBJ.FENCE_V, tx:2,  ty:2,  w:0, h:10,solid:false, interact:false },
    // Forest sign at path entrance
    { id:'sign_0',     type:OBJ.SIGN,    tx:19, ty:2,  w:1, h:1, solid:false, interact:false, label:'Forest →' },
  ];
}

// ─── Tile map generation ──────────────────────────────────────────────────────
export function buildTileMap() {
  const map = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    map[r] = [];
    for (let c = 0; c < WORLD_COLS; c++) {
      // Border water
      if (r < 1 || r > WORLD_ROWS - 2 || c < 1 || c > WORLD_COLS - 2) {
        map[r][c] = T.WATER;
      } else {
        map[r][c] = T.GRASS;
      }
    }
  }

  // Vertical dirt path (center-ish, leading to forest sign)
  for (let r = 1; r < WORLD_ROWS - 1; r++) {
    map[r][19] = T.PATH;
    map[r][20] = T.PATH;
  }

  // Horizontal dirt path
  for (let c = 1; c < WORLD_COLS - 1; c++) {
    map[13][c] = T.PATH;
    map[14][c] = T.PATH;
  }

  // Stone patches (for picking up stones early game)
  const stonePatches = [
    [6,12],[6,13],[7,12],[15,8],[15,9],[20,18],[21,18],
  ];
  stonePatches.forEach(([r, c]) => {
    if (map[r][c] === T.GRASS) map[r][c] = T.STONE;
  });

  // Tall grass patches
  const tgPatches = [
    [4,22],[4,23],[5,22],[5,23],[6,22],
    [18,5],[19,5],[18,6],
    [8,28],[9,28],[8,29],
    [22,30],[23,30],[22,31],
  ];
  tgPatches.forEach(([r, c]) => {
    if (map[r][c] === T.GRASS) map[r][c] = T.TALL_GRASS;
  });

  return map;
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
export function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Deterministic per-tile noise (for visual variation, no state)
export function tileNoise(r, c, seed = 42) {
  let s = ((r * 997 + c * 31 + seed) & 0x7fffffff) >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return (s >>> 0) / 0xffffffff;
}

// ─── Collision helpers ────────────────────────────────────────────────────────
// Returns true if world pixel (wx, wy) is in a solid tile
export function isTileSolid(wx, wy, tileMap) {
  const col = Math.floor(wx / TILE);
  const row = Math.floor(wy / TILE);
  if (row < 0 || row >= WORLD_ROWS || col < 0 || col >= WORLD_COLS) return true;
  return tileMap[row][col] === T.WATER;
}

// Returns true if world pixel (wx, wy) is inside a solid object
export function isObjectSolid(wx, wy, objects) {
  for (const obj of objects) {
    if (!obj.solid) continue;
    const ox = obj.tx * TILE, oy = obj.ty * TILE;
    const ow = obj.w  * TILE, oh = obj.h  * TILE;
    if (wx >= ox && wx < ox + ow && wy >= oy && wy < oy + oh) return true;
  }
  return false;
}

export function isSolid(wx, wy, tileMap, objects) {
  return isTileSolid(wx, wy, tileMap) || isObjectSolid(wx, wy, objects);
}

// ─── Player movement ──────────────────────────────────────────────────────────
export const PLAYER_SPEED  = 120; // px/s
export const PLAYER_W      = 14;
export const PLAYER_H      = 20;
export const PLAYER_FOOT_Y = 0.6; // fraction of height where feet are (for collision)

export function moveEntity(entity, dx, dy, dt, tileMap, objects) {
  const spd  = (entity.speed ?? PLAYER_SPEED);
  const hw   = (entity.w ?? PLAYER_W) / 2;
  const fh   = (entity.h ?? PLAYER_H) * PLAYER_FOOT_Y;
  const fbot = (entity.h ?? PLAYER_H);

  const nx = entity.x + dx * spd * dt;
  const ny = entity.y + dy * spd * dt;

  // X-axis
  if (
    !isSolid(nx - hw, entity.y + fh,   tileMap, objects) &&
    !isSolid(nx + hw, entity.y + fh,   tileMap, objects) &&
    !isSolid(nx - hw, entity.y + fbot, tileMap, objects) &&
    !isSolid(nx + hw, entity.y + fbot, tileMap, objects)
  ) {
    entity.x = nx;
  }

  // Y-axis
  if (
    !isSolid(entity.x - hw, ny + fh,   tileMap, objects) &&
    !isSolid(entity.x + hw, ny + fh,   tileMap, objects) &&
    !isSolid(entity.x - hw, ny + fbot, tileMap, objects) &&
    !isSolid(entity.x + hw, ny + fbot, tileMap, objects)
  ) {
    entity.y = ny;
  }
}

// ─── Camera ───────────────────────────────────────────────────────────────────
export function updateCamera(cam, targetX, targetY, viewW, viewH, lerp = 0.12) {
  const tx = Math.max(0, Math.min(WORLD_PX_W - viewW, targetX - viewW / 2));
  const ty = Math.max(0, Math.min(WORLD_PX_H - viewH, targetY - viewH / 2));
  cam.x += (tx - cam.x) * lerp;
  cam.y += (ty - cam.y) * lerp;
}

// ─── Interact detection ───────────────────────────────────────────────────────
export const INTERACT_REACH = TILE * 1.5;

export function findInteractTarget(playerX, playerY, objects) {
  const py = playerY + PLAYER_H * 0.5;
  let best = null, bestDist = INTERACT_REACH;
  for (const obj of objects) {
    if (!obj.interact) continue;
    const cx = (obj.tx + obj.w * 0.5) * TILE;
    const cy = (obj.ty + obj.h * 0.5) * TILE;
    const d  = Math.hypot(playerX - cx, py - cy);
    if (d < bestDist) { bestDist = d; best = obj; }
  }
  return best;
}

// ─── Forest run generation ────────────────────────────────────────────────────
export const FOREST_W    = 3200; // total run width
export const FOREST_H    = 640;
export const WOLF_R      = 14;
export const WOLF_SPEED  = 55;
export const LOOT_TABLE  = {
  wolf:   [{ item:'leather',min:1,max:2 },{ item:'meat',min:1,max:2 }],
  spider: [{ item:'silk',   min:1,max:3 }],
  tree:   [{ item:'wood',   min:2,max:4 }],
  stone:  [{ item:'stone',  min:1,max:3 }],
  ground: [{ item:'sticks', min:1,max:3 },{ item:'herbs',min:0,max:2 },{ item:'stone',min:0,max:1 }],
};

export function rollLoot(table, rand) {
  const drops = [];
  for (const entry of table) {
    const amt = entry.min + Math.floor(rand() * (entry.max - entry.min + 1));
    if (amt > 0) drops.push({ item: entry.item, qty: amt });
  }
  return drops;
}

export function generateForestRun(seed) {
  const rand = seededRand(seed);

  const enemies  = [];
  const pickups  = [];
  const trees    = [];

  // Ground pickups (sticks, stones, herbs)
  for (let i = 0; i < 28; i++) {
    const x = 200 + rand() * (FOREST_W - 400);
    const y = 80  + rand() * (FOREST_H - 160);
    pickups.push({
      id:        `pickup_${i}`,
      x, y,
      lootType:  'ground',
      collected: false,
    });
  }

  // Trees (choppable, require axe)
  for (let i = 0; i < 18; i++) {
    trees.push({
      id:       `tree_${i}`,
      x:        300  + rand() * (FOREST_W - 600),
      y:        60   + rand() * (FOREST_H - 120),
      hp:       3,
      maxHp:    3,
      alive:    true,
      hitFlash: 0,
    });
  }

  // Wolves
  for (let i = 0; i < 10; i++) {
    const x = 400 + rand() * (FOREST_W - 600);
    const y = 80  + rand() * (FOREST_H - 160);
    enemies.push({
      id:        `wolf_${i}`,
      type:      'wolf',
      x, y,
      hp:        3,
      maxHp:     3,
      alive:     true,
      dir:       rand() > 0.5 ? 1 : -1,
      state:     'patrol',  // patrol | chase | attack
      hitFlash:  0,
      attackCooldown: 0,
      speed:     WOLF_SPEED + rand() * 20,
    });
  }

  // Giant spiders (deeper in the run — x > 1600)
  for (let i = 0; i < 6; i++) {
    const x = 1600 + rand() * (FOREST_W - 1800);
    const y = 80   + rand() * (FOREST_H - 160);
    enemies.push({
      id:        `spider_${i}`,
      type:      'spider',
      x, y,
      hp:        5,
      maxHp:     5,
      alive:     true,
      dir:       rand() > 0.5 ? 1 : -1,
      state:     'patrol',
      hitFlash:  0,
      attackCooldown: 0,
      speed:     35 + rand() * 15,
    });
  }

  return { enemies, pickups, trees };
}

// ─── Enemy AI update ──────────────────────────────────────────────────────────
export const ENEMY_CHASE_RANGE  = 180;
export const ENEMY_ATTACK_RANGE = 28;
export const ENEMY_ATTACK_CD    = 1.2;  // seconds between attacks
export const ENEMY_DAMAGE       = 1;

export function updateForestEnemies(enemies, playerX, playerY, dt, t) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.hitFlash  > 0) e.hitFlash  = Math.max(0, e.hitFlash  - dt * 4);
    if (e.attackCooldown > 0) e.attackCooldown = Math.max(0, e.attackCooldown - dt);

    const dx   = playerX - e.x;
    const dy   = playerY - e.y;
    const dist = Math.hypot(dx, dy);

    if (dist < ENEMY_CHASE_RANGE) {
      e.state = dist < ENEMY_ATTACK_RANGE ? 'attack' : 'chase';
    } else {
      e.state = 'patrol';
    }

    if (e.state === 'chase') {
      const spd = e.speed * dt;
      e.x += (dx / dist) * spd;
      e.y += (dy / dist) * spd;
      e.dir = dx > 0 ? 1 : -1;
    } else if (e.state === 'patrol') {
      e.x += e.dir * e.speed * 0.4 * dt;
      // Soft boundary
      if (e.x < 80)           { e.x = 80;           e.dir =  1; }
      if (e.x > FOREST_W - 80){ e.x = FOREST_W - 80; e.dir = -1; }
      if (e.type === 'spider') {
        e.y += Math.sin(t * 1.2 + e.x * 0.01) * 18 * dt;
      }
    }

    // Clamp vertically
    e.y = Math.max(40, Math.min(FOREST_H - 40, e.y));
  }
}

// ─── Player attack (melee) ────────────────────────────────────────────────────
// Returns { hitEnemies, hitTrees, lootDrops, blockedTree }
//   equipStats — result of getEquipStats(equipment), or null for bare-hands
//   Trees require an axe equipped (equipStats.attackBonus > 0 from the axe).
//   Pass null/undefined equipStats to use bare-hand defaults.
export const ATTACK_REACH  = 38;
export const ATTACK_ARC    = Math.PI * 0.75; // ~135° swing

export function playerAttack(playerX, playerY, facing, enemies, trees, rand, equipStats) {
  const faceAngle = { right:0, left:Math.PI, down:Math.PI/2, up:-Math.PI/2 }[facing] ?? 0;
  const reach     = ATTACK_REACH + (equipStats?.attackRange ?? 0);
  const hasAxe    = (equipStats?.attackBonus ?? 0) > 0; // axe gives attackBonus
  const lootDrops = [];
  const hitEnemies = [], hitTrees = [];
  let blockedTree = false; // true when player hit a tree but had no axe

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - playerX, dy = e.y - playerY;
    const dist = Math.hypot(dx, dy);
    if (dist > reach + WOLF_R) continue;
    const angle = Math.atan2(dy, dx);
    let diff = angle - faceAngle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > ATTACK_ARC / 2) continue;
    // Base damage 1 + bonus from weapon (axe gives +2, pickaxe gives +1)
    const dmg = 1 + Math.floor((equipStats?.attackBonus ?? 0) / 2);
    e.hp -= dmg;
    e.hitFlash = 1;
    if (e.hp <= 0) {
      e.alive = false;
      const drops = rollLoot(LOOT_TABLE[e.type], rand);
      drops.forEach(d => lootDrops.push({ ...d, x: e.x, y: e.y }));
    }
    hitEnemies.push(e.id);
  }

  for (const tree of trees) {
    if (!tree.alive) continue;
    const dx = tree.x - playerX, dy = tree.y - playerY;
    if (Math.hypot(dx, dy) > reach + 20) continue;
    if (!hasAxe) { blockedTree = true; continue; } // need axe to chop
    tree.hp--;
    tree.hitFlash = 1;
    if (tree.hp <= 0) {
      tree.alive = false;
      const drops = rollLoot(LOOT_TABLE.tree, rand);
      drops.forEach(d => lootDrops.push({ ...d, x: tree.x, y: tree.y }));
    }
    hitTrees.push(tree.id);
  }

  return { hitEnemies, hitTrees, lootDrops, blockedTree };
}

// ─── Inventory helpers ────────────────────────────────────────────────────────
// fullEmptyInventory is the single canonical empty inventory — covers all run types.
// emptyInventory is kept as an alias for backwards-compat with any callers we missed.
export function emptyInventory() { return fullEmptyInventory(); }

export function addToInventory(inv, item, qty) {
  if (item in inv) inv[item] = (inv[item] ?? 0) + qty;
  return inv;
}

export function mergeInventory(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

// ─── Equipment system ─────────────────────────────────────────────────────────
// Slots: weapon | armor | accessory
// Each crafted item that is equippable has an entry here.
export const EQUIPPABLE = {
  axe:           { slot: "weapon",    icon: "🪓", label: "Axe",           stats: { attackBonus: 2, attackRange: 12 } },
  pickaxe:       { slot: "weapon",    icon: "⛏️", label: "Pickaxe",       stats: { attackBonus: 1, stoneYield: 2 } },
  fishing_rod:   { slot: "weapon",    icon: "🎣", label: "Fishing Rod",   stats: { canFish: true } },
  leather_armor: { slot: "armor",     icon: "🛡️", label: "Leather Armor", stats: { defense: 1, maxHpBonus: 2 } },
  potion_table:  { slot: "accessory", icon: "🧪", label: "Potion Table",  stats: { herbBonus: 2 } },
};

export function emptyEquipment() {
  return { weapon: null, armor: null, accessory: null };
}

// ─── Hotbar ───────────────────────────────────────────────────────────────────
// Items that can be placed in the action hotbar (consumed on use)
export const HOTBAR_ITEMS = {
  cooked_meat:  { icon: "🍖", label: "Cooked Meat",  useEffect: { heal: 3 }, stackable: true },
  fish:         { icon: "🐟", label: "Fish",          useEffect: { heal: 1 }, stackable: true },
  big_fish:     { icon: "🐠", label: "Big Fish",      useEffect: { heal: 2 }, stackable: true },
  rare_fish:    { icon: "🐡", label: "Rare Fish",     useEffect: { heal: 3 }, stackable: true },
  apples:       { icon: "🍎", label: "Apples",        useEffect: { heal: 1 }, stackable: true },
  berries:      { icon: "🫐", label: "Berries",       useEffect: { heal: 1 }, stackable: true },
  mushrooms:    { icon: "🍄", label: "Mushrooms",     useEffect: { heal: 1 }, stackable: true },
  herbs:        { icon: "🌿", label: "Herbs",         useEffect: { heal: 1 }, stackable: true },
};

export const HOTBAR_SIZE = 6; // number of slots

export function emptyHotbar() {
  return Array(HOTBAR_SIZE).fill(null); // each slot: null | { item, qty }
}

// Returns merged stat bonuses from equipped items
export function getEquipStats(equipment) {
  const stats = { attackBonus: 0, attackRange: 0, defense: 0, maxHpBonus: 0, herbBonus: 0, stoneYield: 0, canFish: false };
  for (const slot of ["weapon", "armor", "accessory"]) {
    const item = equipment?.[slot];
    if (!item || !EQUIPPABLE[item]) continue;
    const s = EQUIPPABLE[item].stats;
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === "boolean") stats[k] = stats[k] || v;
      else stats[k] = (stats[k] ?? 0) + v;
    }
  }
  return stats;
}

// ─── Crafting recipes ─────────────────────────────────────────────────────────
// Items that are equippable go to the player's equipment, not the chest.
export const RECIPES = {
  axe:              { sticks:2, stone:3 },
  pickaxe:          { sticks:2, stone:4 },
  fishing_rod:      { sticks:3, silk:2  },
  crafting_station: { wood:8,   stone:4 },
  leather_armor:    { leather:6         },
  cooked_meat:      { meat:1            },
  potion_table:     { wood:6, herbs:4, stone:2 },
};

export function canCraft(recipe, inv) {
  for (const [item, qty] of Object.entries(recipe)) {
    if ((inv[item] ?? 0) < qty) return false;
  }
  return true;
}

export function craftItem(recipeName, inv) {
  const recipe = RECIPES[recipeName];
  if (!recipe || !canCraft(recipe, inv)) return null;
  const newInv = { ...inv };
  // Deduct ingredients
  for (const [item, qty] of Object.entries(recipe)) {
    newInv[item] = (newInv[item] ?? 0) - qty;
  }
  // Always add the crafted item to inventory
  newInv[recipeName] = (newInv[recipeName] ?? 0) + 1;
  return newInv;
}
// ─── Character customization ──────────────────────────────────────────────────
export const HAIR_STYLES = [
  { id: 'short',    label: 'Short',    color: '#7a4f2a' },
  { id: 'long',     label: 'Long',     color: '#3a2010' },
  { id: 'curly',    label: 'Curly',    color: '#c88040' },
  { id: 'braid',    label: 'Braid',    color: '#884020' },
];

export const SKIN_TONES = [
  { id: 'light',    label: 'Light',    color: '#f5c5a3' },
  { id: 'medium',   label: 'Medium',   color: '#d4956a' },
  { id: 'tan',      label: 'Tan',      color: '#c07840' },
  { id: 'brown',    label: 'Brown',    color: '#8b5a2b' },
  { id: 'dark',     label: 'Dark',     color: '#5a3018' },
];

export const OUTFIT_COLORS = [
  { id: 'blue',     label: 'Blue',     body: '#5b8dd9', legs: '#3a6abf' },
  { id: 'green',    label: 'Green',    body: '#5a9a4a', legs: '#3a7a2a' },
  { id: 'red',      label: 'Red',      body: '#c05040', legs: '#8a2820' },
  { id: 'purple',   label: 'Purple',   body: '#7a5ab0', legs: '#5a3a8a' },
  { id: 'orange',   label: 'Orange',   body: '#d07830', legs: '#a05010' },
  { id: 'teal',     label: 'Teal',     body: '#4a9a8a', legs: '#2a7a6a' },
];

export const HAT_STYLES = [
  { id: 'none',     label: 'None'  },
  { id: 'cap',      label: 'Cap',      color: '#5a3a8a' },
  { id: 'straw',    label: 'Straw',    color: '#d4a855' },
  { id: 'beanie',   label: 'Beanie',   color: '#c05040' },
];

export function defaultCharacter() {
  return { hair: 'short', skin: 'light', outfit: 'blue', hat: 'none' };
}

// ─── Placeable decoration catalog ────────────────────────────────────────────
export const PLACEABLES = {
  crafting_station: { icon:'🔨', label:'Crafting Station', cost:{ wood:8, stone:4 }, w:2, h:2, solid:true, interact:true, interactLabel:'[E] Craft' },
  bench:        { icon:'🪑', label:'Bench',        cost:{ wood:4 },              w:2, h:1, solid:true  },
  flower_bed:   { icon:'🌸', label:'Flower Bed',   cost:{ sticks:2, herbs:3 },   w:2, h:1, solid:false },
  lantern:      { icon:'🏮', label:'Lantern',      cost:{ stone:2, wood:1 },     w:1, h:1, solid:false },
  mushroom_ring:{ icon:'🍄', label:'Mushroom Ring',cost:{ herbs:2, wood:1 },     w:2, h:2, solid:false },
  watering_can: { icon:'🪣', label:'Watering Can', cost:{ stone:3 },             w:1, h:1, solid:false },
  wheat_field:  { icon:'🌾', label:'Wheat Field',  cost:{ sticks:4, herbs:2 },   w:3, h:2, solid:false },
  pet_bed:      { icon:'🐾', label:'Pet Bed',      cost:{ leather:3, wood:2 },   w:1, h:1, solid:false },
  garden_gate:  { icon:'🚪', label:'Garden Gate',  cost:{ wood:5 },              w:1, h:2, solid:true  },
  herb_garden:  { icon:'🌿', label:'Herb Garden',  cost:{ herbs:4, stone:2 },    w:2, h:2, solid:false },
  potted_plant: { icon:'🪴', label:'Potted Plant', cost:{ herbs:1, stone:1 },    w:1, h:1, solid:false },
  tool_shed:    { icon:'🛖', label:'Tool Shed',    cost:{ wood:10, stone:5 },    w:2, h:2, solid:true  },
  fountain:     { icon:'⛲', label:'Fountain',     cost:{ stone:8 },             w:2, h:2, solid:true  },
  cozy_fire:    { icon:'🔥', label:'Cozy Fire',    cost:{ wood:3, stone:4 },     w:1, h:1, solid:false },
  scarecrow:    { icon:'🕺', label:'Scarecrow',    cost:{ sticks:5, leather:2 }, w:1, h:2, solid:false },
  beehive:      { icon:'🐝', label:'Beehive',      cost:{ wood:4, herbs:3 },     w:1, h:1, solid:false },
  windmill:     { icon:'🌀', label:'Windmill',     cost:{ wood:8, stone:6 },     w:2, h:3, solid:true  },
};

// ─── Mining Run ───────────────────────────────────────────────────────────────
export const MINE_W     = 3200;
export const MINE_H     = 640;
export const BAT_R      = 10;
export const BAT_SPEED  = 60;

export const MINE_LOOT_TABLE = {
  rock:   [{ item:'stone',  min:2, max:4 }, { item:'coal', min:0, max:2 }],
  gem:    [{ item:'gems',   min:1, max:2 }],
  crystal:[{ item:'crystal',min:1, max:1 }, { item:'stone', min:1, max:2 }],
  bat:    [{ item:'leather',min:0, max:1 }],
};

export function generateMiningRun(seed) {
  const rand = seededRand(seed);
  const rocks = [], gems = [], enemies = [];

  for (let i = 0; i < 30; i++) {
    rocks.push({
      id: `rock_${i}`,
      x: 200 + rand() * (MINE_W - 400),
      y: 80  + rand() * (MINE_H - 160),
      hp: 4, maxHp: 4, alive: true, hitFlash: 0,
      type: 'rock',
    });
  }
  for (let i = 0; i < 10; i++) {
    const isGem = rand() > 0.5;
    gems.push({
      id: `gem_${i}`,
      x: 300 + rand() * (MINE_W - 600),
      y: 80  + rand() * (MINE_H - 160),
      hp: 3, maxHp: 3, alive: true, hitFlash: 0,
      type: isGem ? 'gem' : 'crystal',
    });
  }
  for (let i = 0; i < 14; i++) {
    enemies.push({
      id: `bat_${i}`,
      type: 'bat',
      x: 400 + rand() * (MINE_W - 600),
      y: 80  + rand() * (MINE_H - 160),
      hp: 2, maxHp: 2,
      alive: true, hitFlash: 0, attackCooldown: 0,
      dir: rand() > 0.5 ? 1 : -1, dirY: rand() > 0.5 ? 1 : -1,
      speed: BAT_SPEED + rand() * 30,
      state: 'patrol',
    });
  }
  return { rocks, gems, enemies };
}

// ─── Fruit Picking Run ────────────────────────────────────────────────────────
export const ORCHARD_W   = 2800;
export const ORCHARD_H   = 640;
export const ORCHARD_GROUND_Y = Math.floor(ORCHARD_H * 0.44); // top of ground region

export const FRUIT_LOOT_TABLE = {
  apple_tree: [{ item:'apples', min:2, max:5 }],
  berry_bush: [{ item:'berries', min:2, max:4 }],
  mushroom:   [{ item:'mushrooms', min:1, max:3 }],
  flower_patch:[{ item:'herbs', min:2, max:4 }],
};

export function generateFruitRun(seed) {
  const rand = seededRand(seed);
  const trees = [], bushes = [], flowers = [];

  // Spawn range: keep objects on the ground strip (not in sky)
  const minY = ORCHARD_GROUND_Y + 20;
  const maxY = ORCHARD_H - 60;
  const spawnY = () => minY + rand() * (maxY - minY);

  for (let i = 0; i < 18; i++) {
    trees.push({
      id: `ftree_${i}`,
      x: 200 + rand() * (ORCHARD_W - 400),
      y: spawnY(),
      hp: 1, maxHp: 1, alive: true, hitFlash: 0,
      type: 'apple_tree',
      shakeTime: 0,
    });
  }
  for (let i = 0; i < 22; i++) {
    bushes.push({
      id: `bush_${i}`,
      x: 200 + rand() * (ORCHARD_W - 400),
      y: spawnY(),
      hp: 1, maxHp: 1, alive: true, hitFlash: 0,
      type: rand() > 0.5 ? 'berry_bush' : 'mushroom',
      shakeTime: 0,
    });
  }
  for (let i = 0; i < 16; i++) {
    flowers.push({
      id: `flower_${i}`,
      x: 200 + rand() * (ORCHARD_W - 400),
      y: spawnY(),
      alive: true, type: 'flower_patch',
    });
  }
  return { trees, bushes, flowers };
}

// ─── Fishing Run ─────────────────────────────────────────────────────────────
export const LAKE_W   = 2400;
export const LAKE_H   = 640;

export const FISH_TABLE = [
  { id:'fish_common',   label:'Fish',          icon:'🐟', rarity:0.5,  item:'fish',        min:1, max:2 },
  { id:'fish_big',      label:'Big Fish',      icon:'🐠', rarity:0.25, item:'big_fish',    min:1, max:1 },
  { id:'fish_rare',     label:'Rare Fish',     icon:'🐡', rarity:0.15, item:'rare_fish',   min:1, max:1 },
  { id:'treasure',      label:'Treasure',      icon:'💎', rarity:0.05, item:'gems',        min:1, max:2 },
  { id:'boot',          label:'Old Boot',      icon:'👢', rarity:0.05, item:'sticks',      min:1, max:2 },
];

export const FISHING_SPOTS = 12;

export function generateFishingRun(seed) {
  const rand = seededRand(seed);
  const spots = [];
  for (let i = 0; i < FISHING_SPOTS; i++) {
    spots.push({
      id: `spot_${i}`,
      x: 200 + rand() * (LAKE_W - 400),
      y: 80  + rand() * (LAKE_H - 160),
      active: true,
      bobbing: 0,
    });
  }
  return { spots };
}

// Add new items to emptyInventory
export function fullEmptyInventory() {
  return {
    // Resources
    wood:0, stone:0, sticks:0, herbs:0, leather:0, meat:0, silk:0,
    // Mining
    coal:0, gems:0, crystal:0,
    // Fruit/fishing
    apples:0, berries:0, mushrooms:0, fish:0, big_fish:0, rare_fish:0,
    // Crafted gear
    axe:0, pickaxe:0, fishing_rod:0, crafting_station:0, leather_armor:0, cooked_meat:0, potion_table:0,
  };
}