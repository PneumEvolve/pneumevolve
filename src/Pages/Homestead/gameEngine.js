// src/Pages/Homestead/gameEngine.js
// Pure functions — no React, no side effects.
// Item data (icons, recipes, loot tables) lives in items.js.
// This file owns: world layout, tile types, collision, movement, camera,
// interact detection, enemy AI, run generation.

import { rollLoot } from "./Items";

// ─── World constants ──────────────────────────────────────────────────────────
export const TILE        = 32;
export const WORLD_COLS  = 80;   // expanded world
export const WORLD_ROWS  = 60;
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
  TILLED:     6,   // hoed soil ready for seeds
  PLANTED:    7,   // has a seed/growing crop (visual handled by farmState)
};

// ─── Object types ─────────────────────────────────────────────────────────────
export const OBJ = {
  // ── Existing world objects ──────────────────────────────────────────────────
  HOUSE:      'house',
  CHEST:      'chest',
  BOARD:      'board',
  WELL:       'well',
  TREE:       'tree',
  FLOWERS:    'flowers',
  FENCE_H:    'fence_h',
  FENCE_V:    'fence_v',
  SIGN:       'sign',
  ORE_NODE:   'ore_node',      // iron ore — respawns
  FISH_SPOT:  'fish_spot',     // fishing spot on water edge
  TOWN_ENTER: 'town_enter',    // invisible trigger: walk here → town panel opens

  // ── Town buildings (placed by player via Builder's Table) ───────────────────
  // These match the item IDs in Items.js so PLACEABLES lookup works automatically.
  BUILDERS_TABLE:    'builders_table',
  TREASURY_CHEST:    'treasury_chest',
  RESIDENT_HOME:     'resident_home',
  TOWN_HALL:         'town_hall',
  MARKET_STALL:      'market_stall',
  FISHING_HUT:       'fishing_hut',
  BLACKSMITH:        'blacksmith',
  HERB_GARDEN_HUT:   'herb_garden_hut',
  FARMHOUSE:         'farmhouse',
  TOWN_KITCHEN:      'town_kitchen',
  LIBRARY:           'library',
  BEEKEEPER_COTTAGE: 'beekeeper_cottage',

  // ── NPCs ───────────────────────────────────────────────────────────────────
  // All NPCs share one OBJ type; individual identity lives in the NPC data object.
  NPC: 'npc',
};

// ─── Default homestead layout ─────────────────────────────────────────────────
// The homestead quadrant is roughly cols 1-55, rows 1-55.
// The town is implied to be at the far-right edge (cols 68+).
export function defaultObjects() {
  return [
    // House — upper-left
    { id:'house_0',     type:OBJ.HOUSE,      tx:3,  ty:4,  w:4, h:3, solid:true,  interact:false },
    // Shared chest — beside house
    { id:'chest_0',     type:OBJ.CHEST,      tx:8,  ty:6,  w:1, h:1, solid:true,  interact:true,  label:'[F] Open chest' },
    // Run notice board — mid-path
    { id:'board_0',     type:OBJ.BOARD,      tx:25, ty:14, w:1, h:1, solid:true,  interact:true,  label:'[F] Start a run' },
    // Well
    { id:'well_0',      type:OBJ.WELL,       tx:9,  ty:4,  w:1, h:1, solid:false, interact:false },
    // ── TEST RESOURCES — right next to spawn (player spawns at ~tx:8, ty:9) ──
    // Choppable tree: equip axe + press F
    { id:'tree_test',  type:OBJ.TREE,     tx:11, ty:7,  w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3, label:'[F] Chop tree' },
    // Iron ore node: equip pickaxe + press F
    { id:'ore_test',   type:OBJ.ORE_NODE, tx:13, ty:7,  w:1, h:1, solid:true,  interact:true,  label:'[F] Mine ore',  hp:3, maxHp:3, respawnTime:60, depleted:false, depletedAt:null },
    // Decorative trees — left grove
    { id:'tree_0',      type:OBJ.TREE,       tx:2,  ty:18, w:1, h:1, solid:true,  interact:false },
    { id:'tree_1',      type:OBJ.TREE,       tx:3,  ty:19, w:1, h:1, solid:true,  interact:false },
    { id:'tree_2',      type:OBJ.TREE,       tx:4,  ty:18, w:1, h:1, solid:true,  interact:false },
    { id:'tree_3',      type:OBJ.TREE,       tx:2,  ty:21, w:1, h:1, solid:true,  interact:false },
    { id:'tree_4',      type:OBJ.TREE,       tx:4,  ty:22, w:1, h:1, solid:true,  interact:false },
    // South forest — large choppable grove (no enemies yet)
    { id:'tree_f0',     type:OBJ.TREE,       tx:8,  ty:40, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f1',     type:OBJ.TREE,       tx:11, ty:42, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f2',     type:OBJ.TREE,       tx:14, ty:40, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f3',     type:OBJ.TREE,       tx:17, ty:43, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f4',     type:OBJ.TREE,       tx:20, ty:41, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f5',     type:OBJ.TREE,       tx:23, ty:44, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f6',     type:OBJ.TREE,       tx:26, ty:40, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f7',     type:OBJ.TREE,       tx:29, ty:42, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f8',     type:OBJ.TREE,       tx:32, ty:45, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f9',     type:OBJ.TREE,       tx:35, ty:41, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f10',    type:OBJ.TREE,       tx:38, ty:44, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f11',    type:OBJ.TREE,       tx:10, ty:46, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f12',    type:OBJ.TREE,       tx:16, ty:48, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f13',    type:OBJ.TREE,       tx:22, ty:47, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f14',    type:OBJ.TREE,       tx:28, ty:49, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    { id:'tree_f15',    type:OBJ.TREE,       tx:34, ty:47, w:1, h:1, solid:true,  interact:false, choppable:true, hp:3, maxHp:3 },
    // Iron ore nodes — northwest rocky area (respawn)
    { id:'ore_0',       type:OBJ.ORE_NODE,   tx:55, ty:6,  w:1, h:1, solid:true,  interact:true,  label:'[F] Mine ore', hp:3, maxHp:3, respawnTime:120, depleted:false, depletedAt:null },
    { id:'ore_1',       type:OBJ.ORE_NODE,   tx:57, ty:8,  w:1, h:1, solid:true,  interact:true,  label:'[F] Mine ore', hp:3, maxHp:3, respawnTime:120, depleted:false, depletedAt:null },
    { id:'ore_2',       type:OBJ.ORE_NODE,   tx:59, ty:5,  w:1, h:1, solid:true,  interact:true,  label:'[F] Mine ore', hp:3, maxHp:3, respawnTime:120, depleted:false, depletedAt:null },
    // Fishing spots — pond tiles
    { id:'fish_0',      type:OBJ.FISH_SPOT,  tx:60, ty:25, w:1, h:1, solid:false, interact:true,  label:'[F] Fish here' },
    { id:'fish_1',      type:OBJ.FISH_SPOT,  tx:63, ty:28, w:1, h:1, solid:false, interact:true,  label:'[F] Fish here' },
    // Flowers
    { id:'flower_0',    type:OBJ.FLOWERS,    tx:7,  ty:4,  w:1, h:1, solid:false, interact:false },
    { id:'flower_1',    type:OBJ.FLOWERS,    tx:6,  ty:5,  w:1, h:1, solid:false, interact:false },
    { id:'flower_2',    type:OBJ.FLOWERS,    tx:9,  ty:5,  w:1, h:1, solid:false, interact:false },
    // Fence around homestead plot
    { id:'fence_h_0',   type:OBJ.FENCE_H,   tx:2,  ty:2,  w:20,h:0, solid:false, interact:false },
    { id:'fence_v_0',   type:OBJ.FENCE_V,   tx:2,  ty:2,  w:0, h:14,solid:false, interact:false },
    // Path sign
    { id:'sign_0',      type:OBJ.SIGN,       tx:25, ty:2,  w:1, h:1, solid:false, interact:false, label:'→ Town' },
    // Town entrance trigger — invisible, at east edge
    { id:'town_enter',  type:OBJ.TOWN_ENTER, tx:68, ty:20, w:2, h:20,solid:false, interact:true,  label:'[F] Enter town' },
  ];
}

// ─── Tile map generation ──────────────────────────────────────────────────────
export function buildTileMap() {
  const map = Array.from({ length: WORLD_ROWS }, () => Array(WORLD_COLS).fill(T.GRASS));

  // Border water
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (r < 1 || r > WORLD_ROWS - 2 || c < 1 || c > WORLD_COLS - 2) {
        map[r][c] = T.WATER;
      }
    }
  }

  // Main horizontal path (homestead → town)
  for (let c = 1; c < WORLD_COLS - 1; c++) {
    map[18][c] = T.PATH;
    map[19][c] = T.PATH;
  }

  // Vertical path up through homestead
  for (let r = 1; r < 18; r++) {
    map[r][25] = T.PATH;
    map[r][26] = T.PATH;
  }

  // Town area — stone/dirt ground (right quarter)
  for (let r = 4; r < 45; r++) {
    for (let c = 68; c < WORLD_COLS - 1; c++) {
      map[r][c] = T.DIRT;
    }
  }
  // Town roads
  for (let r = 5; r < 44; r++) { map[r][70] = T.PATH; map[r][71] = T.PATH; }
  for (let c = 69; c < WORLD_COLS - 2; c++) { map[12][c] = T.PATH; map[13][c] = T.PATH; }
  for (let c = 69; c < WORLD_COLS - 2; c++) { map[25][c] = T.PATH; map[26][c] = T.PATH; }
  for (let c = 69; c < WORLD_COLS - 2; c++) { map[38][c] = T.PATH; map[39][c] = T.PATH; }

  // Fishing pond — southeast of homestead, northwest of town
  for (let r = 22; r < 34; r++) {
    for (let c = 56; c < 67; c++) {
      map[r][c] = T.WATER;
    }
  }
  // Pond shore (stone)
  [[21,56],[21,57],[21,58],[21,62],[21,63],[21,64],[21,65],
   [34,58],[34,59],[34,63],[34,64],
   [27,55],[28,55],[29,55],[27,67],[28,67],[29,67]].forEach(([r,c]) => {
    if (map[r][c] === T.GRASS) map[r][c] = T.STONE;
  });

  // Rocky ore area — northeast corner
  const oreArea = [
    [4,53],[4,54],[5,53],[5,54],[5,55],[6,54],[6,55],[6,56],[6,57],
    [7,55],[7,56],[7,57],[7,58],[8,56],[8,57],[8,58],[8,59],
    [4,58],[4,59],[5,58],[5,59],[5,60],[3,57],[3,58],
  ];
  oreArea.forEach(([r,c]) => { if (map[r][c] === T.GRASS) map[r][c] = T.STONE; });

  // South forest — tall grass border
  const tgPatches = [
    [36,5],[36,6],[37,5],[37,6],[37,7],[37,8],
    [36,12],[36,13],[37,12],[37,13],[37,14],
    [36,20],[36,21],[37,20],[37,21],[37,22],
    [36,28],[36,29],[37,28],[37,29],
    [38,35],[38,36],[39,35],[39,36],
  ];
  tgPatches.forEach(([r,c]) => { if (map[r][c] === T.GRASS) map[r][c] = T.TALL_GRASS; });

  // Stone patches (early game surface gathering)
  const stonePatches = [
    [8,14],[8,15],[9,14],[15,10],[15,11],[20,24],[21,24],
    // Under/around the test ore node at tx:13, ty:7
    [7,12],[7,13],[7,14],[8,12],[8,13],
  ];
  stonePatches.forEach(([r,c]) => { if (map[r][c] === T.GRASS) map[r][c] = T.STONE; });

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

// Deterministic per-tile visual noise
export function tileNoise(r, c, seed = 42) {
  let s = ((r * 997 + c * 31 + seed) & 0x7fffffff) >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return (s >>> 0) / 0xffffffff;
}

// ─── Collision helpers ────────────────────────────────────────────────────────
export function isTileSolid(wx, wy, tileMap) {
  const col = Math.floor(wx / TILE);
  const row = Math.floor(wy / TILE);
  if (!Number.isFinite(row) || !Number.isFinite(col)) return true;
  if (row < 0 || row >= WORLD_ROWS || col < 0 || col >= WORLD_COLS) return true;
  return tileMap[row][col] === T.WATER;
}

export function isObjectSolid(wx, wy, objects) {
  for (const obj of objects) {
    if (!obj.solid) continue;
    if (obj.depleted) continue;           // depleted nodes are passable
    const ox = obj.tx * TILE, oy = obj.ty * TILE;
    const ow = obj.w  * TILE, oh = (obj.h || 1) * TILE;
    if (wx >= ox && wx < ox + ow && wy >= oy && wy < oy + oh) return true;
  }
  return false;
}

export function isSolid(wx, wy, tileMap, objects) {
  return isTileSolid(wx, wy, tileMap) || isObjectSolid(wx, wy, objects);
}

// ─── Player constants ─────────────────────────────────────────────────────────
export const PLAYER_SPEED  = 128;
export const PLAYER_W      = 14;
export const PLAYER_H      = 20;
export const PLAYER_FOOT_Y = 0.6;

export function moveEntity(entity, dx, dy, dt, tileMap, objects) {
  const spd  = entity.speed ?? PLAYER_SPEED;
  const hw   = (entity.w ?? PLAYER_W) / 2;
  const fh   = (entity.h ?? PLAYER_H) * PLAYER_FOOT_Y;
  const fbot = (entity.h ?? PLAYER_H);

  const nx = entity.x + dx * spd * dt;
  const ny = entity.y + dy * spd * dt;

  if (
    !isSolid(nx - hw, entity.y + fh,   tileMap, objects) &&
    !isSolid(nx + hw, entity.y + fh,   tileMap, objects) &&
    !isSolid(nx - hw, entity.y + fbot, tileMap, objects) &&
    !isSolid(nx + hw, entity.y + fbot, tileMap, objects)
  ) { entity.x = nx; }

  if (
    !isSolid(entity.x - hw, ny + fh,   tileMap, objects) &&
    !isSolid(entity.x + hw, ny + fh,   tileMap, objects) &&
    !isSolid(entity.x - hw, ny + fbot, tileMap, objects) &&
    !isSolid(entity.x + hw, ny + fbot, tileMap, objects)
  ) { entity.y = ny; }
}

// ─── Camera ───────────────────────────────────────────────────────────────────
export function updateCamera(cam, targetX, targetY, viewW, viewH, lerp = 0.12) {
  const tx = Math.max(0, Math.min(WORLD_PX_W - viewW, targetX - viewW / 2));
  const ty = Math.max(0, Math.min(WORLD_PX_H - viewH, targetY - viewH / 2));
  cam.x += (tx - cam.x) * lerp;
  cam.y += (ty - cam.y) * lerp;
}

// ─── Interact detection ───────────────────────────────────────────────────────
export const INTERACT_REACH      = TILE * 1.8;
export const CHOP_REACH          = TILE * 2.2;   // slightly further for trees

/**
 * Find the best interact target near the player.
 *
 * Signature:
 *   findInteractTarget(playerX, playerY, facing, tileMap, objects, farmPlots, getNodeState)
 *
 *   playerX, playerY   world-pixel position of the player
 *   facing             "up" | "down" | "left" | "right"  — used to pick the facing tile for farming
 *   tileMap            tile grid (used to detect TILLED / PLANTED tiles)
 *   objects            world objects array
 *   farmPlots          map of "col,row" -> { seedId, ready, ... }   (may be undefined)
 *   getNodeState       (id) => { depleted, hp }                      (may be undefined)
 *
 * Returns one of:
 *   - a world object (with .type, .tx, .ty, ...)
 *   - a synthetic farm target { type: "tilled_plot" | "ready_crop", tx, ty, label }
 *   - null
 *
 * Backward compatible: callers may pass just (playerX, playerY, objects); farm
 * plots and depleted-state filtering are simply skipped in that case.
 */
export function findInteractTarget(playerX, playerY, facing, tileMap, objects, farmPlots, getNodeState) {
  // ── Backward-compat shim: old 3-arg form `(playerX, playerY, objects)` ──
  if (Array.isArray(facing)) {
    objects = facing;
    facing = null;
    tileMap = null;
    farmPlots = null;
    getNodeState = null;
  }

  const py = playerY + PLAYER_H * 0.5;
  let best = null, bestDist = INTERACT_REACH;

  for (const obj of (objects ?? [])) {
    // Skip nodes that are depleted (either flagged directly or via getNodeState)
    const nodeSt = getNodeState ? getNodeState(obj.id) : null;
    const isDepleted = obj.depleted || nodeSt?.depleted;
    if (isDepleted) continue;
    if (obj.chopped) continue;

    // Standard interactables (chest, board, ore, fish_spot, town_enter, placed stations, etc.)
    if (obj.interact) {
      const cx = (obj.tx + (obj.w ?? 1) * 0.5) * TILE;
      const cy = (obj.ty + (obj.h ?? 1) * 0.5) * TILE;
      const d  = Math.hypot(playerX - cx, py - cy);
      if (d < bestDist) { bestDist = d; best = obj; }
    }
    // Choppable trees — detectable even without interact:true (uses CHOP_REACH)
    if (obj.choppable) {
      const cx = (obj.tx + (obj.w ?? 1) * 0.5) * TILE;
      const cy = (obj.ty + (obj.h ?? 1) * 0.5) * TILE;
      const d  = Math.hypot(playerX - cx, py - cy);
      if (d < Math.min(bestDist, CHOP_REACH)) { bestDist = d; best = obj; }
    }
  }

  // ── Farm-plot detection on the facing tile ──
  // Only do this if the caller supplied tileMap + facing; farmPlots is optional
  // (a TILLED tile with no plot record is still plantable; PLANTED requires a record to know ready-state).
  if (tileMap && facing) {
    const facingMap = { down:[0,1], up:[0,-1], left:[-1,0], right:[1,0] };
    const [fdx, fdy] = facingMap[facing] ?? [0, 1];
    const ptx = Math.floor(playerX / TILE);
    const pty = Math.floor((playerY + PLAYER_H * 0.5) / TILE);
    const ftx = ptx + fdx;
    const fty = pty + fdy;

    if (
      fty >= 0 && fty < WORLD_ROWS &&
      ftx >= 0 && ftx < WORLD_COLS
    ) {
      const tile = tileMap[fty]?.[ftx];
      const key  = `${ftx},${fty}`;
      const plot = farmPlots ? farmPlots[key] : null;

      if (tile === T.TILLED && (!plot || !plot.seedId)) {
        // Empty tilled soil — show a plant prompt if we don't already have a closer world target
        const plantTarget = { type:"tilled_plot", tx:ftx, ty:fty, label:"[F] Plant seed" };
        if (!best) return plantTarget;
        // Prefer the closer of the two
        const cx = (ftx + 0.5) * TILE, cy = (fty + 0.5) * TILE;
        const d  = Math.hypot(playerX - cx, py - cy);
        if (d < bestDist) return plantTarget;
      }
      if (tile === T.PLANTED && plot?.ready) {
        const harvestTarget = { type:"ready_crop", tx:ftx, ty:fty, label:"[F] Harvest" };
        if (!best) return harvestTarget;
        const cx = (ftx + 0.5) * TILE, cy = (fty + 0.5) * TILE;
        const d  = Math.hypot(playerX - cx, py - cy);
        if (d < bestDist) return harvestTarget;
      }
    }
  }

  return best;
}

// ─── Character customization ──────────────────────────────────────────────────
export const HAIR_STYLES = [
  { id:'short',  label:'Short',  color:'#7a4f2a' },
  { id:'long',   label:'Long',   color:'#3a2010' },
  { id:'curly',  label:'Curly',  color:'#c88040' },
  { id:'braid',  label:'Braid',  color:'#884020' },
];
export const SKIN_TONES = [
  { id:'light',  label:'Light',  color:'#f5c5a3' },
  { id:'medium', label:'Medium', color:'#d4956a' },
  { id:'tan',    label:'Tan',    color:'#c07840' },
  { id:'brown',  label:'Brown',  color:'#8b5a2b' },
  { id:'dark',   label:'Dark',   color:'#5a3018' },
];
export const OUTFIT_COLORS = [
  { id:'blue',   label:'Blue',   body:'#5b8dd9', legs:'#3a6abf' },
  { id:'green',  label:'Green',  body:'#5a9a4a', legs:'#3a7a2a' },
  { id:'red',    label:'Red',    body:'#c05040', legs:'#8a2820' },
  { id:'purple', label:'Purple', body:'#7a5ab0', legs:'#5a3a8a' },
  { id:'orange', label:'Orange', body:'#d07830', legs:'#a05010' },
  { id:'teal',   label:'Teal',   body:'#4a9a8a', legs:'#2a7a6a' },
];
export const HAT_STYLES = [
  { id:'none',   label:'None' },
  { id:'cap',    label:'Cap',    color:'#5a3a8a' },
  { id:'straw',  label:'Straw',  color:'#d4a855' },
  { id:'beanie', label:'Beanie', color:'#c05040' },
];
export function defaultCharacter() {
  return { hair:'short', skin:'light', outfit:'blue', hat:'none' };
}

// ─── Forest run ───────────────────────────────────────────────────────────────
export const FOREST_W   = 3200;
export const FOREST_H   = 640;
export const WOLF_R     = 14;
export const WOLF_SPEED = 55;

export const FOREST_LOOT = {
  wolf:          [{ item:'leather', min:1, max:2 }, { item:'meat', min:1, max:2 }],
  spider:        [{ item:'silk',    min:1, max:3 }],
  tree:          [{ item:'wood',    min:2, max:4 }],
  stone:         [{ item:'stone',   min:1, max:3 }],
  ground:        [{ item:'sticks',  min:1, max:3 }, { item:'herbs', min:0, max:2 }, { item:'stone', min:0, max:1 }],
  stone_deposit: [{ item:'stone',   min:2, max:5 }, { item:'coal', min:0, max:1, chance:0.3 }],
};
// keep legacy name for run files that import it
export const LOOT_TABLE = FOREST_LOOT;

export function generateForestRun(seed) {
  const rand = seededRand(seed);
  const enemies = [], pickups = [], trees = [], stoneDeposits = [];
  for (let i = 0; i < 28; i++) pickups.push({ id:`pickup_${i}`, x:200+rand()*(FOREST_W-400), y:80+rand()*(FOREST_H-160), lootType:'ground', collected:false });
  for (let i = 0; i < 18; i++) trees.push({ id:`tree_${i}`, x:300+rand()*(FOREST_W-600), y:60+rand()*(FOREST_H-120), hp:3, maxHp:3, alive:true, hitFlash:0 });
  for (let i = 0; i < 10; i++) enemies.push({ id:`wolf_${i}`, type:'wolf', x:400+rand()*(FOREST_W-600), y:80+rand()*(FOREST_H-160), hp:3, maxHp:3, alive:true, dir:rand()>0.5?1:-1, state:'patrol', hitFlash:0, attackCooldown:0, speed:WOLF_SPEED+rand()*20, phase:rand()*Math.PI*2 });
  for (let i = 0; i < 6;  i++) enemies.push({ id:`spider_${i}`, type:'spider', x:1600+rand()*(FOREST_W-1800), y:80+rand()*(FOREST_H-160), hp:5, maxHp:5, alive:true, dir:rand()>0.5?1:-1, state:'patrol', hitFlash:0, attackCooldown:0, speed:35+rand()*15, phase:rand()*Math.PI*2 });
  // Stone deposits — scattered throughout, require a pickaxe to mine
  for (let i = 0; i < 8; i++) stoneDeposits.push({ id:`sdep_${i}`, x:300+rand()*(FOREST_W-600), y:60+rand()*(FOREST_H-120), hp:3, maxHp:3, alive:true, hitFlash:0 });
  return { enemies, pickups, trees, stoneDeposits };
}

// ─── Mining run ───────────────────────────────────────────────────────────────
export const MINE_W    = 3200;
export const MINE_H    = 640;
export const BAT_R     = 10;
export const BAT_SPEED = 60;

export const MINE_LOOT = {
  rock:    [{ item:'stone',    min:2, max:4 }, { item:'coal',    min:0, max:2 }, { item:'iron_ore', min:0, max:2, chance:0.45 }],
  gem:     [{ item:'gems',    min:1, max:2 }],
  crystal: [{ item:'crystal', min:1, max:1 }, { item:'stone',   min:1, max:2 }],
  bat:     [{ item:'leather', min:0, max:1 }],
};
export const MINE_LOOT_TABLE = MINE_LOOT;

export function generateMiningRun(seed) {
  const rand = seededRand(seed);
  const rocks = [], gems = [], enemies = [];
  for (let i = 0; i < 30; i++) rocks.push({ id:`rock_${i}`, x:200+rand()*(MINE_W-400), y:80+rand()*(MINE_H-160), hp:4, maxHp:4, alive:true, hitFlash:0, type:'rock' });
  for (let i = 0; i < 10; i++) gems.push({ id:`gem_${i}`, x:300+rand()*(MINE_W-600), y:80+rand()*(MINE_H-160), hp:3, maxHp:3, alive:true, hitFlash:0, type:rand()>0.5?'gem':'crystal' });
  for (let i = 0; i < 14; i++) enemies.push({ id:`bat_${i}`, type:'bat', x:400+rand()*(MINE_W-600), y:80+rand()*(MINE_H-160), hp:2, maxHp:2, alive:true, hitFlash:0, attackCooldown:0, dir:rand()>0.5?1:-1, dirY:rand()>0.5?1:-1, speed:BAT_SPEED+rand()*30, state:'patrol', phase:rand()*Math.PI*2 });
  return { rocks, gems, enemies };
}

// ─── Fruit run ────────────────────────────────────────────────────────────────
export const ORCHARD_W        = 2800;
export const ORCHARD_H        = 640;
export const ORCHARD_GROUND_Y = Math.floor(ORCHARD_H * 0.44);

export const FRUIT_LOOT = {
  apple_tree:  [{ item:'apples',    min:2, max:5 }],
  berry_bush:  [{ item:'berries',   min:2, max:4 }],
  mushroom:    [{ item:'mushrooms', min:1, max:3 }],
  flower_patch:[{ item:'herbs',     min:2, max:4 }],
};
export const FRUIT_LOOT_TABLE = FRUIT_LOOT;

export function generateFruitRun(seed) {
  const rand = seededRand(seed);
  const minY = ORCHARD_GROUND_Y + 20, maxY = ORCHARD_H - 60;
  const spawnY = () => minY + rand() * (maxY - minY);
  const trees = [], bushes = [], flowers = [];
  for (let i = 0; i < 18; i++) trees.push({ id:`ftree_${i}`, x:200+rand()*(ORCHARD_W-400), y:spawnY(), hp:1, maxHp:1, alive:true, hitFlash:0, type:'apple_tree', shakeTime:0 });
  for (let i = 0; i < 22; i++) bushes.push({ id:`bush_${i}`, x:200+rand()*(ORCHARD_W-400), y:spawnY(), hp:1, maxHp:1, alive:true, hitFlash:0, type:rand()>0.5?'berry_bush':'mushroom', shakeTime:0 });
  for (let i = 0; i < 16; i++) flowers.push({ id:`flower_${i}`, x:200+rand()*(ORCHARD_W-400), y:spawnY(), alive:true, type:'flower_patch' });
  return { trees, bushes, flowers };
}

// ─── Fishing run ──────────────────────────────────────────────────────────────
export const LAKE_W = 2400;
export const LAKE_H = 640;

export const FISH_TABLE = [
  { id:'fish_common', label:'Fish',       icon:'🐟', rarity:0.50, item:'fish',     min:1, max:2 },
  { id:'fish_big',    label:'Big Fish',   icon:'🐠', rarity:0.25, item:'big_fish', min:1, max:1 },
  { id:'fish_rare',   label:'Rare Fish',  icon:'🐡', rarity:0.15, item:'rare_fish',min:1, max:1 },
  { id:'treasure',    label:'Treasure',   icon:'💎', rarity:0.05, item:'gems',     min:1, max:2 },
  { id:'boot',        label:'Old Boot',   icon:'👢', rarity:0.05, item:'sticks',   min:1, max:2 },
];
export const FISHING_SPOTS = 12;

export function generateFishingRun(seed) {
  const rand = seededRand(seed);
  const spots = [];
  for (let i = 0; i < FISHING_SPOTS; i++) {
    spots.push({ id:`spot_${i}`, x:200+rand()*(LAKE_W-400), y:80+rand()*(LAKE_H-160), active:true, bobbing:0 });
  }
  return { spots };
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────
export const ENEMY_CHASE_RANGE  = 180;
export const ENEMY_ATTACK_RANGE = 28;
export const ENEMY_ATTACK_CD    = 1.2;
export const ENEMY_DAMAGE       = 1;

export function updateForestEnemies(enemies, playerX, playerY, dt, t) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
    if (e.attackCooldown > 0) e.attackCooldown = Math.max(0, e.attackCooldown - dt);
    const dx = playerX - e.x, dy = playerY - e.y;
    const dist = Math.hypot(dx, dy);
    e.state = dist < ENEMY_ATTACK_RANGE ? 'attack' : dist < ENEMY_CHASE_RANGE ? 'chase' : 'patrol';
    if (e.state === 'chase') { const spd = e.speed * dt; e.x += (dx/dist)*spd; e.y += (dy/dist)*spd; e.dir = dx>0?1:-1; }
    else if (e.state === 'patrol') {
      e.x += e.dir * e.speed * 0.4 * dt;
      if (e.x < 80) { e.x = 80; e.dir = 1; }
      if (e.x > FOREST_W - 80) { e.x = FOREST_W - 80; e.dir = -1; }
      // Use stable per-enemy phase (set at spawn) instead of drifting e.x so
      // both co-op clients stay in sync — the oscillation is purely time-driven.
      if (e.type === 'spider') e.y += Math.sin(t * 1.2 + (e.phase ?? 0)) * 18 * dt;
    }
    e.y = Math.max(40, Math.min(FOREST_H - 40, e.y));
  }
}

// ─── Player attack (melee) ────────────────────────────────────────────────────
export const ATTACK_REACH = 38;
export const ATTACK_ARC   = Math.PI * 0.75;

export function playerAttack(playerX, playerY, facing, enemies, trees, rand, equipStats, stoneDeposits) {
  const faceAngle = { right:0, left:Math.PI, down:Math.PI/2, up:-Math.PI/2 }[facing] ?? 0;
  const reach     = ATTACK_REACH + (equipStats?.attackRange ?? 0);
  const hasAxe     = equipStats?.canChop ?? false;
  const hasPickaxe = equipStats?.canMine ?? false;
  const lootDrops = [], hitEnemies = [], hitTrees = [], hitDeposits = [];
  let blockedTree = false;
  let blockedDeposit = false;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - playerX, dy = e.y - playerY;
    const dist = Math.hypot(dx, dy);
    if (dist > reach + WOLF_R) continue;
    let diff = Math.atan2(dy, dx) - faceAngle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > ATTACK_ARC / 2) continue;
    const dmg = 1 + Math.floor((equipStats?.attackBonus ?? 0) / 2);
    e.hp -= dmg; e.hitFlash = 1;
    if (e.hp <= 0) {
      e.alive = false;
      rollLoot(FOREST_LOOT[e.type] ?? [], rand).forEach(d => lootDrops.push({ ...d, x:e.x, y:e.y }));
    }
    hitEnemies.push(e.id);
  }

  for (const tree of trees) {
    if (!tree.alive) continue;
    if (Math.hypot(tree.x - playerX, tree.y - playerY) > reach + 20) continue;
    if (!hasAxe) { blockedTree = true; continue; }
    tree.hp--; tree.hitFlash = 1;
    if (tree.hp <= 0) {
      tree.alive = false;
      rollLoot(FOREST_LOOT.tree, rand).forEach(d => lootDrops.push({ ...d, x:tree.x, y:tree.y }));
    }
    hitTrees.push(tree.id);
  }

  if (stoneDeposits) {
    for (const dep of stoneDeposits) {
      if (!dep.alive) continue;
      if (Math.hypot(dep.x - playerX, dep.y - playerY) > reach + 20) continue;
      if (!hasPickaxe) { blockedDeposit = true; continue; }
      dep.hp--; dep.hitFlash = 1;
      if (dep.hp <= 0) {
        dep.alive = false;
        rollLoot(FOREST_LOOT.stone_deposit, rand).forEach(d => lootDrops.push({ ...d, x:dep.x, y:dep.y }));
      }
      hitDeposits.push(dep.id);
    }
  }

  return { hitEnemies, hitTrees, hitDeposits, lootDrops, blockedTree, blockedDeposit };
}

// ─── NPC system ───────────────────────────────────────────────────────────────
//
// NPC DATA SHAPE
// --------------
// Each NPC is a plain object stored in town state (useTownState).
// This file owns the pure logic (movement, AI); React state owns the data.
//
// {
//   id:           string          — unique e.g. "npc_generic_0", "npc_maren"
//   npcId:        string          — matches NPC_ROSTER key: "generic" | "maren" | "finn" | ...
//   name:         string          — display name (player can rename generic NPCs)
//   x:            number          — world-pixel X
//   y:            number          — world-pixel Y
//   facing:       "up"|"down"|"left"|"right"
//   assignment:   string | null   — OBJ type of assigned building, e.g. "town_hall" | null
//   homeObjectId: string | null   — id of the resident_home object they live in
//   mood:         "happy"|"neutral"|"unhappy"
//   waitingAtBorder: boolean      — true = NPC exists but can't move in (no free home)
//   step:         number          — walk animation frame counter
//   wanderTarget: {x,y} | null   — current wander destination
//   wanderTimer:  number          — seconds until next wander target is chosen
// }

// Where named NPCs appear when waiting (just outside the map's right border grass area)
export const NPC_BORDER_X = (WORLD_COLS - 3) * TILE;
export const NPC_BORDER_Y = 22 * TILE;

export const NPC_SPEED       = 52;   // pixels/sec while wandering
export const NPC_WANDER_RADIUS = TILE * 6;   // max tiles from home to wander
export const NPC_WANDER_PAUSE  = 3.5;        // seconds to idle before picking new target
export const NPC_INTERACT_REACH = TILE * 1.6; // how close player must be to talk

// ── NPC Roster ────────────────────────────────────────────────────────────────
// All named NPCs and their metadata. "generic" is the unnamed first resident.
// preferredJob matches an OBJ type string — the building they want to work at.
// triggerBuilding matches an OBJ type string — the building that causes them to appear.
// questItem / questQty — the gift quest parameters (wired up in useTownState later).
// questReward — plain description for now; systems built on top will read this.

export const NPC_ROSTER = {
  generic: {
    defaultName:     "Villager",
    icon:            "🧑",
    description:     "A wandering soul looking for a place to belong.",
    preferredJob:    "town_hall",
    triggerBuilding: null,      // arrives from treasury food alone
    questItem:       null,
    questQty:        0,
    questReward:     null,
  },
  maren: {
    defaultName:     "Maren",
    icon:            "🧑‍💼",
    description:     "Practical, efficient, warms up slowly. A lifelong merchant with opinions about everything she sells.",
    preferredJob:    "market_stall",
    triggerBuilding: "market_stall",
    questItem:       "gems",
    questQty:        5,
    questReward:     "better_prices",  // unlocks improved buy/sell rates
  },
  finn: {
    defaultName:     "Finn",
    icon:            "🧑‍🦱",
    description:     "Extremely calm. Speaks slowly. Has probably seen something out in the water he doesn't talk about.",
    preferredJob:    "fishing_hut",
    triggerBuilding: "fishing_hut",
    questItem:       "rare_fish",
    questQty:        5,
    questReward:     "better_fish_loot",
  },
  petra: {
    defaultName:     "Petra",
    icon:            "👩‍🔧",
    description:     "Covered in soot, doesn't care. Genuinely delighted by good materials.",
    preferredJob:    "blacksmith",
    triggerBuilding: "blacksmith",
    questItem:       "iron_ingot",
    questQty:        10,
    questReward:     "weapon_upgrades",
  },
  elda: {
    defaultName:     "Elda",
    icon:            "👵",
    description:     "Elderly, sharp as a tack, slightly mysterious. Knows things.",
    preferredJob:    "herb_garden_hut",
    triggerBuilding: "herb_garden_hut",
    questItem:       "herbs",
    questQty:        15,
    questReward:     "better_potions",
  },
  sable: {
    defaultName:     "Sable",
    icon:            "🧑‍🌾",
    description:     "Young, eager, grew up on a farm and missed it terribly. Very strong opinions about soil.",
    preferredJob:    "farmhouse",
    triggerBuilding: "farmhouse",
    questItem:       "carrot",
    questQty:        10,
    questReward:     "faster_crops",
  },
  clem: {
    defaultName:     "Clem",
    icon:            "👩‍🍳",
    description:     "Loud, warm, feeds everyone whether they asked or not.",
    preferredJob:    "town_kitchen",
    triggerBuilding: "town_kitchen",
    questItem:       "mushrooms",
    questQty:        12,
    questReward:     "new_recipes",
  },
  rowan: {
    defaultName:     "Rowan",
    icon:            "🧑‍🏫",
    description:     "Quietly obsessed with the history of the land. Doesn't leave the library much.",
    preferredJob:    "library",
    triggerBuilding: "library",
    questItem:       "crystal",
    questQty:        3,
    questReward:     "lore_and_map",
  },
  bex: {
    defaultName:     "Bex",
    icon:            "🧝",
    description:     "Shows up uninvited. No preferred job, good at everything. Nobody knows where she came from. She never says.",
    preferredJob:    null,       // assigns anywhere without complaint
    triggerBuilding: null,       // just needs a free home — no building trigger
    questItem:       null,
    questQty:        0,
    questReward:     null,
  },
  haas: {
    defaultName:     "Old Haas",
    icon:            "👴",
    description:     "Retired from something he won't specify. Keeps bees now. Very peaceful.",
    preferredJob:    "beekeeper_cottage",
    triggerBuilding: "beekeeper_cottage",
    questItem:       "herbs",   // brings herbs for the hives slowly over time
    questQty:        8,
    questReward:     "honey_crafting",
  },
};

// ── NPC factory ───────────────────────────────────────────────────────────────
/**
 * Create a fresh NPC data object.
 *
 * @param {string} npcId       — key from NPC_ROSTER, e.g. "maren" or "generic"
 * @param {number} x           — starting world-pixel X
 * @param {number} y           — starting world-pixel Y
 * @param {object} overrides   — optional field overrides (e.g. { name: "Bob" })
 */
export function createNPC(npcId, x, y, overrides = {}) {
  const roster = NPC_ROSTER[npcId] ?? NPC_ROSTER.generic;
  return {
    id:              overrides.id ?? `npc_${npcId}_${Date.now()}`,
    npcId,
    name:            overrides.name ?? roster.defaultName,
    x,
    y,
    facing:          "down",
    assignment:      null,
    homeObjectId:    null,
    mood:            "neutral",
    waitingAtBorder: false,
    step:            0,
    wanderTarget:    null,
    wanderTimer:     NPC_WANDER_PAUSE,
    questProgress:   0,          // how many quest items have been delivered
    questComplete:   false,
    ...overrides,
  };
}

// ── NPC wander AI ─────────────────────────────────────────────────────────────
/**
 * Tick all NPC movement.  Called once per frame from the HomesteadView game loop.
 * Mutates npc objects in place (same pattern as updateForestEnemies).
 *
 * @param {Array}   npcs      — array of NPC objects (from town state)
 * @param {Array}   objects   — world objects array (to find home positions)
 * @param {object}  tileMap   — tile grid for collision
 * @param {number}  dt        — delta time in seconds
 */
export function updateNPCs(npcs, objects, tileMap, dt) {
  for (const npc of npcs) {
    if (npc.waitingAtBorder) continue;  // waiting NPCs don't wander

    npc.wanderTimer -= dt;

    // ── Pick a new wander target ─────────────────────────────────────────────
    if (!npc.wanderTarget || npc.wanderTimer <= 0) {
      npc.wanderTimer = NPC_WANDER_PAUSE + Math.random() * 2;

      // Anchor wander around their home building if assigned; else current pos
      let anchorX = npc.x;
      let anchorY = npc.y;
      if (npc.homeObjectId) {
        const home = objects.find(o => o.id === npc.homeObjectId);
        if (home) {
          anchorX = (home.tx + (home.w ?? 1) * 0.5) * TILE;
          anchorY = (home.ty + (home.h ?? 1) * 0.5) * TILE;
        }
      }

      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * NPC_WANDER_RADIUS;
      const tx    = anchorX + Math.cos(angle) * dist;
      const ty    = anchorY + Math.sin(angle) * dist;

      // Clamp to world bounds
      npc.wanderTarget = {
        x: Math.max(TILE, Math.min(WORLD_PX_W - TILE, tx)),
        y: Math.max(TILE, Math.min(WORLD_PX_H - TILE, ty)),
      };
    }

    // ── Move toward target ───────────────────────────────────────────────────
    if (npc.wanderTarget) {
      const dx  = npc.wanderTarget.x - npc.x;
      const dy  = npc.wanderTarget.y - npc.y;
      const d   = Math.hypot(dx, dy);

      if (d < 4) {
        // Arrived — clear target and idle until timer fires
        npc.wanderTarget = null;
        npc.step = 0;
      } else {
        const spd = NPC_SPEED * dt;
        const nx  = npc.x + (dx / d) * spd;
        const ny  = npc.y + (dy / d) * spd;

        // Simple tile collision — NPCs stop rather than slide
        const hw = PLAYER_W / 2;
        const fy = PLAYER_H * PLAYER_FOOT_Y;
        const solidX = isTileSolid(nx - hw, npc.y + fy, tileMap) || isTileSolid(nx + hw, npc.y + fy, tileMap);
        const solidY = isTileSolid(npc.x - hw, ny + fy, tileMap) || isTileSolid(npc.x + hw, ny + fy, tileMap);

        if (!solidX) npc.x = nx;
        if (!solidY) npc.y = ny;

        // Update facing
        if (Math.abs(dx) > Math.abs(dy)) {
          npc.facing = dx > 0 ? "right" : "left";
        } else {
          npc.facing = dy > 0 ? "down" : "up";
        }

        npc.step += dt * 8;  // walk cycle
      }
    }
  }
}

// ── NPC interact check ────────────────────────────────────────────────────────
/**
 * Return the nearest NPC within talking range, or null.
 * Called by findInteractTarget so the existing interaction system picks up NPCs.
 */
export function findNearbyNPC(playerX, playerY, npcs) {
  let best = null;
  let bestDist = NPC_INTERACT_REACH;
  for (const npc of (npcs ?? [])) {
    if (npc.waitingAtBorder) continue;
    const d = Math.hypot(playerX - npc.x, playerY - npc.y);
    if (d < bestDist) { bestDist = d; best = npc; }
  }
  return best;
}

// ─── Re-exports for backward compatibility ────────────────────────────────────
// Run files (ForestRun, MiningRun, etc.) currently import these from gameEngine.
// They now live in items.js — re-export them here so no run file needs updating.
export {
  rollLoot,
  fullEmptyInventory,
  emptyInventory,
  addToInventory,
  mergeInventory,
  emptyEquipment,
  getEquipStats,
  EQUIPPABLE,
  HOTBAR_ITEMS,
  HOTBAR_SIZE,
  emptyHotbar,
  RECIPES,
  canCraft,
  craftItem,
  PLACEABLES,
  SEEDS,
  ITEM_ICONS,
  ITEM_LABELS,
} from "./Items";