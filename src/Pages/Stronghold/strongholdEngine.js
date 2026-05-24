// src/Pages/Stronghold/strongholdEngine.js
// Pure functions — no React, no side effects.

export const WORLD = 3000;
export const TOWN_CENTER_ID = 0;

// ─── Economy ──────────────────────────────────────────────────────────────────

export const STARTING_GOLD = 500;

export const BUILDING_COSTS = {
  town_center:   0,
  barracks:      150,
  garden:        100,
  repair_shop:   120,
  upgrade_shop:  200,
  home:          80,
};

export const BUILDING_SURVIVAL_BONUS = 25; // gold per building at full hp after wave (base, scales with wave)

// ─── Kill gold scaling ────────────────────────────────────────────────────────
// Protector / burn-aura kills: base 20–30g + wave scaling
// Unit / turret / fire-trap kills: base 10–15g + wave scaling
// Demolishers pay a premium bounty on top of the normal scaling.
export const KILL_GOLD_WAVE_SCALE_PROTECTOR = 1.5; // extra gold per wave for protector kills
export const KILL_GOLD_WAVE_SCALE_UNIT      = 1.0; // extra gold per wave for unit/turret/trap kills
export const KILL_GOLD_DEMOLISHER_BONUS     = 15;  // flat extra gold on top of scaled amount for demolisher kills
// Survival bonus scales with wave: base 25 + 3 per wave
export const BUILDING_SURVIVAL_BONUS_WAVE_SCALE = 3; // extra gold per building per wave

// ─── Protector stats ──────────────────────────────────────────────────────────

export const PROTECTOR_MAX_HP    = 100;  // base; use getProtectorMaxHp(upgrades) for scaled value
export const PROTECTOR_HP_PER_TIER = 25; // +25 max hp per hp_up tier
export const PROTECTOR_HEAL_RATE = 8;    // hp/sec when inside town center

export function getProtectorMaxHp(upgrades = []) {
  return PROTECTOR_MAX_HP + upgradeCount(upgrades, "hp_up") * PROTECTOR_HP_PER_TIER;
}
export const PROTECTOR_ATTACK_RANGE  = 80;
export const PROTECTOR_ATTACK_DAMAGE = 18;
export const PROTECTOR_ATTACK_RATE   = 1.4; // attacks/sec base

// ─── Builder shield ───────────────────────────────────────────────────────────

export const BUILDER_SHIELD_MAX  = 50;   // shield hp on top of base 100 hp
export const BUILDER_SHIELD_MAX_UPGRADED = 80; // with builder_shield_up upgrade
export const BUILDER_SHIELD_REGEN = 8;  // hp/sec out of combat (no enemy chasing)
// Shield absorbs hits first; base hp is only damaged when shield is depleted.

// ─── Revive ───────────────────────────────────────────────────────────────────

export const REVIVE_RADIUS = 70; // how close a hero must be to revive their partner

// ─── Difficulty ───────────────────────────────────────────────────────────────

// easy   — infinite time between waves; both players must ready-up to start each wave
// normal — timed breather (the original behavior)
// hard   — no breather; next wave begins immediately after the previous clears
export const DIFFICULTIES = ["easy", "normal", "hard"];
export const DIFFICULTY_LABELS = { easy: "Easy", normal: "Normal", hard: "Hard" };
export const DIFFICULTY_DESC = {
  easy:   "Infinite time between waves — both players ready up to start.",
  normal: "Timed breather between waves.",
  hard:   "No rest — waves follow immediately.",
};

// ─── Inter-wave timers ────────────────────────────────────────────────────────

// Breather grows with wave number: base 30s + 4s per wave, capped at 60s.
// Early waves get a head-start so players have breathing room to get set up.
// Hard difficulty: returns 0 (no breather).
// Easy difficulty: returns Infinity (gate is ready-up, not a timer).
export function getBreatherDuration(waveNumber, difficulty = "normal") {
  if (difficulty === "hard") return 0;
  if (difficulty === "easy") return Infinity;
  return Math.min(60, 30 + waveNumber * 4);
}

// ─── Townspeople ──────────────────────────────────────────────────────────────

export const TOWNSPEOPLE_START  = 4;
// Townspeople are now gained only by building Homes — not automatically per wave.

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

export function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Building definitions ─────────────────────────────────────────────────────

export const BUILDING_TYPES = {
  town_center: {
    id:          "town_center",
    label:       "Town Center",
    color:       "#ffd700",
    radius:      32,
    maxHp:       200,
    description: "The heart of your town. Protector heals here. If this falls, you lose.",
    placeable:   false,
    cost:        0,
  },
  barracks: {
    id:          "barracks",
    label:       "Barracks",
    color:       "#ff6644",
    radius:      22,
    maxHp:       80,
    description: "Spawns 1 soldier + 1 per worker assigned. Remove a worker and that soldier is dismissed.",
    placeable:   true,
    cost:        150,
    spawnUnit:   true,
  },
  garden: {
    id:          "garden",
    label:       "Garden",
    color:       "#66dd88",
    radius:      20,
    maxHp:       60,
    description: "Slows enemies nearby. Workers increase the effect.",
    placeable:   true,
    cost:        100,
    slowRadius:  90,
    slowFactor:  0.45,
  },
  repair_shop: {
    id:          "repair_shop",
    label:       "Repair Shop",
    color:       "#66bbff",
    radius:      20,
    maxHp:       70,
    description: "Triages the most-damaged building in range at 2× repair speed. Workers extend reach. Builder must be inside.",
    placeable:   true,
    cost:        120,
    repairRadius: 110,
    repairRate:  12,
  },
  upgrade_shop: {
    id:          "upgrade_shop",
    label:       "Upgrade Shop",
    color:       "#cc88ff",
    radius:      22,
    maxHp:       75,
    description: "Protector spends gold here on upgrades between waves.",
    placeable:   true,
    cost:        200,
  },
  home: {
    id:          "home",
    label:       "Home",
    color:       "#ffaa44",
    radius:      18,
    maxHp:       60,
    description: "Houses townspeople. Each home grants +2 workers immediately when built. Losing a home permanently removes those workers.",
    placeable:   true,
    cost:        80,
    workersGranted: 2,
    noWorkers:   true,
  },
  turret: {
    id:          "turret",
    label:       "Turret",
    color:       "#ff4488",
    radius:      16,
    maxHp:       50,
    description: "Automated tower that fires at the nearest enemy. Assign workers to boost damage (+4), range (+20), and fire rate (+0.3/s) each.",
    placeable:   true,
    cost:        60,
    attackRange: 150,       // 1.25× buff from original 120
    attackDamage: 8,
    attackRate:  1.5,
  },
  wall: {
    id:          "wall",
    label:       "Wall",
    color:       "#8899aa",
    radius:      46,         // bounding circle for rough checks (sqrt(44²+9²))
    halfW:       44,         // half-length along the wall's axis
    halfH:       9,          // half-thickness
    maxHp:       150,
    cost:        35,
    placeable:   true,
    isWall:      true,
    noWorkers:   true,
    description: "Redirects enemies — they break through if they can't go around. Rotate before placing. Walls can be placed adjacent to each other.",
  },
  market: {
    id:          "market",
    label:       "Market",
    color:       "#ffcc44",
    radius:      20,
    maxHp:       65,
    cost:        180,
    placeable:   true,
    goldPerSec:  1.5,        // base income per standing market once wave 1 begins
    description: "Generates passive gold once the first wave begins. Workers increase yield (+0.5g/s each, max 3). Destroyed markets lose their income permanently.",
  },
  fire_trap: {
    id:          "fire_trap",
    label:       "Fire Trap",
    color:       "#ff6600",
    radius:      18,
    maxHp:       55,
    cost:        90,
    placeable:   true,
    aoeRange:    100,        // radius of fire burst
    aoeDamage:   18,         // damage per tick to all enemies in range
    aoeRate:     0.8,        // bursts per second
    maxWorkers:  8,          // worker cap to prevent infinite stacking
    description: "Erupts in flames periodically, dealing AOE damage to all enemies in range. Workers increase damage (+6) and range (+15) each. Max 8 workers.",
  },
};

export const PLACEABLE_BUILDINGS = Object.values(BUILDING_TYPES).filter(b => b.placeable);

// ─── Building upgrade costs ───────────────────────────────────────────────────
// All upgradeable buildings (except home) accept both townspeople workers AND
// per-building cash tiers. Effective tier = workers + upgradeTier (they stack).
// Home only accepts cash upgrades (noWorkers: true).

// Turret: infinite tiers via repeatableCost(TURRET_UPGRADE_BASE_COST, tier).
export const TURRET_UPGRADE_BASE_COST = 80; // base cost; scales ×1.6 per tier
// Per effective tier: +12 damage, +30 range, +0.5 fire rate, +30 HP
export const TURRET_TIER_DAMAGE   = 12;
export const TURRET_TIER_RANGE    = 30;
export const TURRET_TIER_RATE     = 0.5;
export const TURRET_TIER_HP       = 30;

// Home upgrades: cash only (noWorkers). Per tier: +1 townsperson, +20 HP
export const HOME_UPGRADE_BASE_COST = 60; // base cost; scales ×1.6 per tier
export const HOME_TIER_WORKERS    = 1;
export const HOME_TIER_HP         = 20;

// Barracks: per effective tier: +1 soldier (on top of workers), +25 HP
export const BARRACKS_UPGRADE_BASE_COST = 90;
export const BARRACKS_TIER_HP           = 25;

// Garden: per effective tier: +15 slow radius, −0.03 slow factor, +20 HP
export const GARDEN_UPGRADE_BASE_COST = 70;
export const GARDEN_TIER_RADIUS       = 15;
export const GARDEN_TIER_SLOW         = 0.03;
export const GARDEN_TIER_HP           = 20;

// Repair Shop: per effective tier: +15 repair radius, +3 repair rate, +20 HP
export const REPAIR_SHOP_UPGRADE_BASE_COST = 80;
export const REPAIR_SHOP_TIER_RADIUS       = 15;
export const REPAIR_SHOP_TIER_RATE         = 3;
export const REPAIR_SHOP_TIER_HP           = 20;

// Upgrade Shop: per cash tier: +30 HP (passive quality-of-life building)
export const UPGRADE_SHOP_UPGRADE_BASE_COST = 100;
export const UPGRADE_SHOP_TIER_HP           = 30;

// Market: per effective tier: +0.4g/s income, +20 HP
export const MARKET_UPGRADE_BASE_COST = 75;
export const MARKET_TIER_GOLD         = 0.4;
export const MARKET_TIER_HP           = 20;

// Fire Trap: per effective tier: +8 damage, +12 range, +20 HP
export const FIRE_TRAP_UPGRADE_BASE_COST = 70;
export const FIRE_TRAP_TIER_DAMAGE       = 8;
export const FIRE_TRAP_TIER_RANGE        = 12;
export const FIRE_TRAP_TIER_HP           = 20;

// Wall: cash-only (noWorkers). Per cash tier: +40 HP
export const WALL_UPGRADE_BASE_COST = 45;
export const WALL_TIER_HP           = 40;

// ─── Effective tier helper ────────────────────────────────────────────────────
// For all non-home buildings: effective tier = workers assigned + cash upgrades.
// Workers and cash tiers are interchangeable and stack freely.
export function effectiveTier(building) {
  return (building.workers ?? 0) + (building.upgradeTier ?? 0);
}

// Per-building upgrade base cost lookup
export const BUILDING_UPGRADE_BASE_COST = {
  turret:       TURRET_UPGRADE_BASE_COST,
  home:         HOME_UPGRADE_BASE_COST,
  barracks:     BARRACKS_UPGRADE_BASE_COST,
  garden:       GARDEN_UPGRADE_BASE_COST,
  repair_shop:  REPAIR_SHOP_UPGRADE_BASE_COST,
  upgrade_shop: UPGRADE_SHOP_UPGRADE_BASE_COST,
  market:       MARKET_UPGRADE_BASE_COST,
  fire_trap:    FIRE_TRAP_UPGRADE_BASE_COST,
  wall:         WALL_UPGRADE_BASE_COST,
};

// HP gained per cash upgrade tier, by building type
export const BUILDING_TIER_HP = {
  turret:       TURRET_TIER_HP,
  home:         HOME_TIER_HP,
  barracks:     BARRACKS_TIER_HP,
  garden:       GARDEN_TIER_HP,
  repair_shop:  REPAIR_SHOP_TIER_HP,
  upgrade_shop: UPGRADE_SHOP_TIER_HP,
  market:       MARKET_TIER_HP,
  fire_trap:    FIRE_TRAP_TIER_HP,
  wall:         WALL_TIER_HP,
};

// ─── Enemy speed caps ─────────────────────────────────────────────────────────

export const ENEMY_SPEED_CAP = { raider: 95, brute: 72, demolisher: Infinity };

// ─── Upgrade tier helpers ─────────────────────────────────────────────────────
// Repeatable upgrades are stored as "atk_damage", "atk_damage_2", "atk_damage_3"...
// This counts how many times a repeatable upgrade has been purchased.
export function upgradeCount(upgrades, id) {
  return upgrades.filter(u => u === id || u.startsWith(id + "_")).length;
}
// Cost for the Nth purchase of a repeatable upgrade (1-indexed).
export function repeatableCost(baseCost, tier) {
  return Math.round(baseCost * Math.pow(1.6, tier - 1));
}

// ─── Movement speed ───────────────────────────────────────────────────────────
// Infinite tiers: each tier adds +12% move speed (no cap).
export const MOVE_SPEED_PER_TIER = 0.12;
export const PROTECTOR_SPEED_BASE = 160;
export const BUILDER_SPEED_BASE   = 150;

export function getMovementSpeed(upgrades, upgradeId, base) {
  const tiers = upgradeCount(upgrades, upgradeId);
  return base * (1 + tiers * MOVE_SPEED_PER_TIER);
}

export const UPGRADES = [
  // ── Personal (protector) ── repeatables first ──────────────────────────────
  { id: "atk_damage",  label: "Heavy strikes",    desc: "+10 attack damage per tier",             cost: 100, tree: "personal", tier: 1, repeatable: true },
  { id: "atk_speed",   label: "Sharper blade",    desc: "+0.3 attacks/sec per tier",              cost: 60,  tree: "personal", tier: 1, repeatable: true },
  { id: "move_speed",  label: "Swift feet",       desc: "+12% move speed per tier (infinite)",    cost: 70,  tree: "personal", tier: 1, repeatable: true },
  { id: "hp_up",       label: "Iron will",        desc: "+25 max HP per tier (infinite)",         cost: 80,  tree: "personal", tier: 1, repeatable: true },
  { id: "lifesteal",   label: "Warrior's blood",  desc: "+3 hp per kill per tier (infinite)",     cost: 80,  tree: "personal", tier: 2, repeatable: true },
  { id: "burn_aura",   label: "Burn aura",        desc: "+8 aoe dmg/s +15 radius per tier — passive fire ring around you", cost: 180, tree: "personal", tier: 2, repeatable: true },
  { id: "atk_range",   label: "Longer reach",     desc: "+20 attack range per tier (infinite)",   cost: 60,  tree: "personal", tier: 1, repeatable: true },
  { id: "dash",        label: "Hero's dash",      desc: "Unlock dash ability (space/double-tap)", cost: 80,  tree: "personal", tier: 2 },
  // ── Army ── repeatables first ───────────────────────────────────────────────
  { id: "soldier_hp",  label: "Toughen up",       desc: "+20 soldier max hp per tier (infinite)", cost: 60,  tree: "army",     tier: 1, needs: "barracks", repeatable: true },
  { id: "soldier_dmg", label: "Battle-hardened",  desc: "+5 soldier damage per tier (infinite)",  cost: 80,  tree: "army",     tier: 1, needs: "barracks", repeatable: true },
  { id: "soldier_cnt", label: "Draft more",       desc: "+1 soldier per barracks per tier",       cost: 100, tree: "army",     tier: 2, needs: "barracks", repeatable: true },
  // ── Town ── repeatables first ───────────────────────────────────────────────
  { id: "garden_size", label: "Wild growth",      desc: "+30 garden slow radius per tier",        cost: 70,  tree: "town",     tier: 1, needs: "garden", repeatable: true },
  { id: "tc_heal",     label: "Warm hearth",      desc: "Town center heals builder too",          cost: 80,  tree: "town",     tier: 1 },
  { id: "shop_auto",   label: "Steady hands",     desc: "Repair shop works at 40% without builder", cost: 100, tree: "town",  tier: 2, needs: "repair_shop" },
  // ── Workshop (builder) ── repeatables first ─────────────────────────────────
  { id: "builder_move_speed", label: "Quick boots",     desc: "+12% builder move speed per tier (infinite)", cost: 70, tree: "workshop", tier: 1, repeatable: true },
  { id: "builder_shield_up",  label: "Reinforced vest", desc: "+30 builder shield max per tier (infinite)",  cost: 100, tree: "workshop", tier: 1, repeatable: true },
  { id: "repair_speed",       label: "Quick hands",     desc: "+50% direct repair speed",                    cost: 80,  tree: "workshop", tier: 1 },
  { id: "builder_aura",       label: "Master crafts",   desc: "Overheal buildings: 125%/150%/175%/200% HP (4 tiers)", cost: 70,  tree: "workshop", tier: 1, repeatable: true, maxTier: 4 },
  { id: "place_range",        label: "Long reach",      desc: "+30 building placement range",                cost: 70,  tree: "workshop", tier: 1 },
  { id: "sell_refund",        label: "Salvage expert",  desc: "Sell buildings for 75% (was 50%)",            cost: 60,  tree: "workshop", tier: 2 },
];

// ─── Map / world setup ────────────────────────────────────────────────────────

export function createInitialMap() {
  const cx = WORLD / 2, cy = WORLD / 2;
  return {
    buildings: [
      {
        id:       TOWN_CENTER_ID,
        type:     "town_center",
        x:        cx,
        y:        cy,
        hp:       BUILDING_TYPES.town_center.maxHp,
        maxHp:    BUILDING_TYPES.town_center.maxHp,
        workers:  0,
      },
    ],
    nextBuildingId: 1,
  };
}

// ─── Collision / geometry ─────────────────────────────────────────────────────

export function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// Squared distance — use when you only need to compare, saves a sqrt
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function circlesOverlap(ax, ay, ar, bx, by, br) {
  return dist(ax, ay, bx, by) < ar + br;
}

// ─── Wall geometry helpers ────────────────────────────────────────────────────

// Shortest distance from point (ex,ey) to the surface of a rotated wall rect.
export function distToWall(ex, ey, wall) {
  const cos = Math.cos(-(wall.angle ?? 0));
  const sin = Math.sin(-(wall.angle ?? 0));
  const dx  = ex - wall.x, dy = ey - wall.y;
  const lx  = cos * dx - sin * dy;
  const ly  = sin * dx + cos * dy;
  const cx  = Math.max(-wall.halfW, Math.min(wall.halfW, lx));
  const cy  = Math.max(-wall.halfH, Math.min(wall.halfH, ly));
  return Math.sqrt((lx - cx) ** 2 + (ly - cy) ** 2);
}

// Does the segment (ax,ay)→(bx,by) intersect a living rotated wall rect?
// Uses Liang–Barsky clipping in wall-local space.
export function segmentCrossesWall(ax, ay, bx, by, wall) {
  if (wall.hp <= 0) return false;
  const angle = wall.angle ?? 0;
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  const toLocal = (px, py) => {
    const ddx = px - wall.x, ddy = py - wall.y;
    return { x: cos * ddx - sin * ddy, y: sin * ddx + cos * ddy };
  };
  const a = toLocal(ax, ay), b = toLocal(bx, by);
  const minX = -wall.halfW, maxX = wall.halfW;
  const minY = -wall.halfH, maxY = wall.halfH;
  if (Math.min(a.x, b.x) > maxX || Math.max(a.x, b.x) < minX) return false;
  if (Math.min(a.y, b.y) > maxY || Math.max(a.y, b.y) < minY) return false;
  const dx = b.x - a.x, dy = b.y - a.y;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - minX], [dx, maxX - a.x], [-dy, a.y - minY], [dy, maxY - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t0) t0 = t; } else { if (t < t1) t1 = t; }
    if (t0 > t1) return false;
  }
  return true;
}

// Push an enemy (circle, radius r) out of a living rotated wall rectangle.
// Modifies e.x / e.y in-place. No-op if enemy is already outside.
export function pushEnemyOutOfWall(e, wall) {
  if (wall.hp <= 0) return;
  const r   = e.radius ?? 6;
  const cos = Math.cos(-(wall.angle ?? 0));
  const sin = Math.sin(-(wall.angle ?? 0));
  const dx  = e.x - wall.x, dy = e.y - wall.y;
  const lx  = cos * dx - sin * dy;
  const ly  = sin * dx + cos * dy;
  // Expand wall by enemy radius for circle-vs-AABB test
  const hw  = wall.halfW + r, hh = wall.halfH + r;
  if (Math.abs(lx) >= hw || Math.abs(ly) >= hh) return; // outside — nothing to do
  // Penetration depth along each axis
  const ox = hw - Math.abs(lx); // overlap on local x
  const oy = hh - Math.abs(ly); // overlap on local y
  let pushLx = 0, pushLy = 0;
  if (ox < oy) {
    pushLx = lx < 0 ? -ox : ox;
  } else {
    pushLy = ly < 0 ? -oy : oy;
  }
  // Rotate push vector back to world space
  const cosFwd = Math.cos(wall.angle ?? 0), sinFwd = Math.sin(wall.angle ?? 0);
  e.x += cosFwd * pushLx - sinFwd * pushLy;
  e.y += sinFwd * pushLx + cosFwd * pushLy;
}

// ─── Market income ────────────────────────────────────────────────────────────

// Call every tick from the protector (gold owner). Returns gold to add.
// Income starts only after wave 1 begins (waveNumber >= 1).
export function updateMarketIncome(buildings, dt, waveNumber) {
  if ((waveNumber ?? 0) < 1) return 0;
  let income = 0;
  buildings.forEach(b => {
    if (b.type !== "market" || b.hp <= 0) return;
    const tier = effectiveTier(b);
    const rate = BUILDING_TYPES.market.goldPerSec + tier * MARKET_TIER_GOLD;
    income += rate * dt;
  });
  return income;
}

// ─── Player movement ──────────────────────────────────────────────────────────

export function movePlayer(ox, oy, vx, vy, dt, speed) {
  const len = Math.sqrt(vx * vx + vy * vy);
  if (len === 0) return { x: ox, y: oy };
  const nx = ox + (vx / len) * speed * dt;
  const ny = oy + (vy / len) * speed * dt;
  return {
    x: Math.max(20, Math.min(WORLD - 20, nx)),
    y: Math.max(20, Math.min(WORLD - 20, ny)),
  };
}

// ─── Protector melee attack ───────────────────────────────────────────────────

export function updateProtectorAttack(state, dt) {
  state.attackCooldown = Math.max(0, (state.attackCooldown ?? 0) - dt);
  if (state.attackCooldown > 0) return;

  const upgrades  = state.upgrades ?? [];
  const maxHp     = getProtectorMaxHp(upgrades);
  const range     = PROTECTOR_ATTACK_RANGE + upgradeCount(upgrades, "atk_range") * 20;
  const damage    = PROTECTOR_ATTACK_DAMAGE + upgradeCount(upgrades, "atk_damage") * 10;
  const rate      = PROTECTOR_ATTACK_RATE + upgradeCount(upgrades, "atk_speed") * 0.3;
  const lifesteal = upgradeCount(upgrades, "lifesteal") * 3; // hp per kill per tier

  let target = null, bestDist = Infinity;
  state.enemies.forEach(e => {
    if (e.dead) return;
    const d = dist(state.player.x, state.player.y, e.x, e.y);
    if (d < range && d < bestDist) { bestDist = d; target = e; }
  });
  if (!target) return;

  target.hp -= damage;
  state.attackCooldown = 1 / rate;

  // Spawn projectile for visual feedback
  if (!state.projectiles) state.projectiles = [];
  state.projectiles.push({
    id:  Date.now() + Math.random(),
    x:   state.player.x,
    y:   state.player.y,
    tx:  target.x,
    ty:  target.y,
    age: 0,
    ttl: 0.18,
    color: "rgba(255,180,60,0.9)",
  });

  if (target.hp <= 0) {
    target.dead = true;
    const waveNumber = state.waveNumber ?? 1;
    const waveBonus  = Math.floor(waveNumber * KILL_GOLD_WAVE_SCALE_PROTECTOR);
    const demoBonus  = target.type === "demolisher" ? KILL_GOLD_DEMOLISHER_BONUS : 0;
    const goldDrop = 20 + waveBonus + demoBonus + Math.floor(Math.random() * 11);
    target._goldDrop = goldDrop;
    target._goldAwardedByProtector = true;
    state.gold = (state.gold ?? 0) + goldDrop;
    if (lifesteal > 0) state.playerHp = Math.min(maxHp, (state.playerHp ?? maxHp) + lifesteal);
  }
}

// ─── Projectile animation ─────────────────────────────────────────────────────

export function updateProjectiles(state, dt) {
  if (!state.projectiles) return;
  state.projectiles.forEach(p => { p.age += dt; });
  state.projectiles = state.projectiles.filter(p => p.age < p.ttl);
}

// ─── Protector healing at town center ────────────────────────────────────────

export function updateProtectorHeal(state, dt) {
  const tc = state.buildings.find(b => b.type === "town_center" && b.hp > 0);
  if (!tc) return;
  const inRange = dist(state.player.x, state.player.y, tc.x, tc.y) < BUILDING_TYPES.town_center.radius + 24;
  if (!inRange) return;
  const maxHp = getProtectorMaxHp(state.upgrades ?? []);
  state.playerHp = Math.min(maxHp, (state.playerHp ?? maxHp) + PROTECTOR_HEAL_RATE * dt);

  // Also heal builder if tc_heal upgrade active
  if ((state.upgrades ?? []).includes("tc_heal") && state.builderHp !== undefined) {
    const builderMax = getBuilderTotalMaxHp(state.upgrades ?? []);
    state.builderHp = Math.min(builderMax, state.builderHp + PROTECTOR_HEAL_RATE * 0.5 * dt);
  }
}

// ─── Builder danger — enemies notice builder when close ───────────────────────

const BUILDER_NOTICE_RADIUS = 90;
const BUILDER_CHASE_SPEED_MULT = 0.7; // enemies that peel off are slightly slower

export function updateBuilderDanger(builderX, builderY, enemies, dt) {
  if (builderX === null || builderY === null) return;
  let chasingCount = 0;
  enemies.forEach(e => {
    if (e.dead) return;
    const d = dist(builderX, builderY, e.x, e.y);
    if (d < BUILDER_NOTICE_RADIUS && chasingCount < 2) {
      e.chasingBuilder = true;
      chasingCount++;
    } else if (d > BUILDER_NOTICE_RADIUS * 1.5) {
      e.chasingBuilder = false;
    }
  });
}

export function updateBuilderHealth(builderX, builderY, enemies, builderHp, dt) {
  let hp = builderHp;
  enemies.forEach(e => {
    if (e.dead || !e.chasingBuilder) return;
    const d = dist(builderX, builderY, e.x, e.y);
    if (d < 14) {
      hp = Math.max(0, hp - 6 * dt);
    }
  });
  return hp;
}

// ─── Builder shield regen ─────────────────────────────────────────────────────
// Shield is the top 50 hp (101–150 total). It regens out of combat.
// builderHp goes 0–150: 0–100 is base, 100–150 is shield.
export const BUILDER_TOTAL_MAX_HP = PROTECTOR_MAX_HP + BUILDER_SHIELD_MAX; // 150 base

export function getBuilderTotalMaxHp(upgrades = []) {
  const shieldBonus = upgradeCount(upgrades, "builder_shield_up") * 30;
  return PROTECTOR_MAX_HP + BUILDER_SHIELD_MAX + shieldBonus;
}

export function updateBuilderShield(state, dt) {
  if (state.phase !== "wave") return;
  const totalMax = getBuilderTotalMaxHp(state.upgrades ?? []);
  const builderDown = (state.builderHp ?? totalMax) <= 0;
  if (builderDown) return;

  const inCombat = state.enemies.some(e => !e.dead && e.chasingBuilder);
  if (inCombat) return;

  const current = state.builderHp ?? totalMax;
  if (current < totalMax) {
    state.builderHp = Math.min(totalMax, current + BUILDER_SHIELD_REGEN * dt);
  }
}

// ─── Enemy spawning ───────────────────────────────────────────────────────────

export function spawnWave(waveNumber, seed) {
  const rand  = seededRand(seed + waveNumber * 1000);
  // Easier early waves: base 7, +4 per wave, slow ramp after wave 5
  const base  = 7;
  const count = waveNumber <= 4
    ? base + (waveNumber - 1) * 4                          // 7, 11, 15, 19
    : base + 12 + Math.floor((waveNumber - 4) * 3);       // 22, 25, 28 ... (slower ramp)
  const enemies = [];

  // Demolishers: linear ramp early, then accelerates quadratically after wave 10.
  // No cap — by wave 50+ they're the majority; wave 60 is ~70% demolishers.
  const demolisherCount = waveNumber >= 3
    ? Math.min(count, Math.floor((waveNumber - 2) / 2) +
        (waveNumber >= 10 ? Math.floor(Math.pow((waveNumber - 10) / 5, 2)) : 0))
    : 0;

  for (let i = 0; i < count; i++) {
    // First N enemies are demolishers
    const isDemolisher = i < demolisherCount;
    const isRaider     = !isDemolisher && rand() > 0.4;
    const edge = Math.floor(rand() * 4);
    let x, y;
    if (edge === 0)      { x = rand() * WORLD; y = -20; }
    else if (edge === 1) { x = WORLD + 20;     y = rand() * WORLD; }
    else if (edge === 2) { x = rand() * WORLD; y = WORLD + 20; }
    else                 { x = -20;            y = rand() * WORLD; }

    if (isDemolisher) {
      enemies.push({
        id:     i,
        x, y,
        hp:     120 + waveNumber * 25,
        maxHp:  120 + waveNumber * 25,
        speed:  Math.min(ENEMY_SPEED_CAP.demolisher, 22 + waveNumber * 3),
        radius: 13,
        type:   "demolisher",
        dead:   false,
        chasingBuilder: false,
        chasingProtector: false,
        attackCooldown: 0,
        // demolishers never chase players — flag to prevent it
        ignoresPlayers: true,
      });
    } else {
      enemies.push({
        id:     i,
        x, y,
        hp:     isRaider ? 24 + waveNumber * 8 : 70 + waveNumber * 18,
        maxHp:  isRaider ? 24 + waveNumber * 8 : 70 + waveNumber * 18,
        speed:  isRaider
          ? Math.min(ENEMY_SPEED_CAP.raider, 58 + waveNumber * 8 + rand() * 16)
          : Math.min(ENEMY_SPEED_CAP.brute,  32 + waveNumber * 7),
        radius: isRaider ? 6 : 10,
        type:   isRaider ? "raider" : "brute",
        dead:   false,
        chasingBuilder: false,
        attackCooldown: 0,
      });
    }
  }
  return enemies;
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

const PROTECTOR_NOTICE_RADIUS = 80;  // reduced — enemies stay on buildings longer, protector must actively engage
const PROTECTOR_LEASH_RADIUS  = 250; // if protector runs further than this, enemy reverts to buildings
const PROTECTOR_CHASE_SPEED_MULT = 1.0; // protector chasers move at full speed

export function updateEnemies(enemies, buildings, builderX, builderY, dt, slowZones, protectorX, protectorY, tauntActive = false) {
  const protectorAlive = protectorX !== null && protectorX !== undefined;
  const builderAlive   = builderX   !== null && builderX   !== undefined;

  // Pre-cache living buildings and walls once per tick (not inside per-enemy loop)
  const livingBuildings = buildings.filter(b => b.hp > 0);
  const livingWalls     = livingBuildings.filter(b => b.isWall);

  enemies.forEach(e => {
    if (e.dead) return;

    // Demolishers ignore players entirely — straight to buildings
    // Demolishers prioritise walls (they're building destroyers)
    // Exception: taunt overrides even demolishers — they temporarily chase the protector.
    if (e.ignoresPlayers && !(tauntActive && protectorAlive)) {
      let target = null, bestDist = Infinity;
      // Demolishers prefer walls if any block their path to the TC, otherwise nearest building
      livingBuildings.forEach(b => {
        const d = dist(e.x, e.y, b.x, b.y);
        // Prefer walls: give them a 0.6× weight so they beat equivalent non-wall buildings
        const weighted = (b.isWall ? 0.6 : 1.0) * d;
        if (weighted < bestDist) { bestDist = weighted; target = b; }
      });
      if (!target) return;
      // If path to target crosses a wall that isn't our target, attack the wall first
      const blockingWall = livingWalls.find(w => w !== target && segmentCrossesWall(e.x, e.y, target.x, target.y, w));
      const actualTarget = blockingWall ?? target;
      let speedMult = 1;
      slowZones.forEach(z => {
        if (dist(e.x, e.y, z.x, z.y) < z.radius) speedMult = Math.min(speedMult, z.factor);
      });
      const dx = actualTarget.x - e.x, dy = actualTarget.y - e.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) return;
      e.x += (dx / d) * e.speed * speedMult * dt;
      e.y += (dy / d) * e.speed * speedMult * dt;
      return;
    }

    // If protector just died, release any chasing enemies
    if (!protectorAlive && e.chasingProtector) e.chasingProtector = false;
    // If builder just died, release any chasing enemies
    if (!builderAlive   && e.chasingBuilder)   e.chasingBuilder   = false;

    // Priority 1: protector, if within notice range (or already chasing and within leash)
    const dProtector = protectorAlive
      ? dist(e.x, e.y, protectorX, protectorY) : Infinity;

    if (tauntActive && protectorAlive) {
      // Taunt overrides leash — all enemies (including destroyers) forced to chase protector
      e.chasingProtector = true;
    } else if (e.chasingProtector) {
      if (dProtector > PROTECTOR_LEASH_RADIUS) {
        e.chasingProtector = false; // leash broken — fall through to building/builder targeting
      }
    } else if (protectorAlive && dProtector < PROTECTOR_NOTICE_RADIUS) {
      e.chasingProtector = true;
    }

    let tx, ty, speedMult;

    if (e.chasingProtector && protectorAlive) {
      tx = protectorX; ty = protectorY;
      speedMult = PROTECTOR_CHASE_SPEED_MULT;
    } else if (e.chasingBuilder && builderAlive) {
      tx = builderX; ty = builderY;
      speedMult = BUILDER_CHASE_SPEED_MULT;
    } else {
      let target = null, bestDist = Infinity;
      livingBuildings.forEach(b => {
        const d = dist(e.x, e.y, b.x, b.y);
        if (d < bestDist) { bestDist = d; target = b; }
      });
      if (!target) return;
      tx = target.x; ty = target.y;
      speedMult = 1;
    }

    slowZones.forEach(z => {
      if (dist(e.x, e.y, z.x, z.y) < z.radius) speedMult = Math.min(speedMult, z.factor);
    });

    // ── Wall blocking ─────────────────────────────────────────────────────
    // Walls block ALL enemies regardless of chase target (protector, builder, or building).
    // Raiders try to skirt around; brutes smash through. Chasing enemies still get redirected.
    if (livingWalls.length > 0) {
      const blockingWall = livingWalls.find(w => segmentCrossesWall(e.x, e.y, tx, ty, w));
      if (blockingWall) {
        // Raiders try to skirt around one of the wall's ends (+14px clearance)
        if (e.type === "raider") {
          const angle = blockingWall.angle ?? 0;
          const cos = Math.cos(angle), sin = Math.sin(angle);
          let wentAround = false;
          for (const side of [1, -1]) {
            const endX = blockingWall.x + cos * (blockingWall.halfW + 14) * side;
            const endY = blockingWall.y + sin * (blockingWall.halfW + 14) * side;
            // Only go around if that path is also clear
            const pathClear = !livingWalls.some(w => w !== blockingWall && segmentCrossesWall(e.x, e.y, endX, endY, w));
            if (pathClear) {
              e._wallAroundX = endX; e._wallAroundY = endY;
              tx = endX; ty = endY;
              wentAround = true;
              break;
            }
          }
          if (!wentAround) {
            // Trapped — smash through
            e._wallAroundX = undefined;
            tx = blockingWall.x; ty = blockingWall.y;
          }
        } else {
          // Brutes, demolisher-lite and others: always attack through
          e._wallAroundX = undefined;
          tx = blockingWall.x; ty = blockingWall.y;
        }
      } else {
        // Clear path — if we were skirting around a wall, check if we've passed it
        if (e._wallAroundX !== undefined) {
          const dWaypoint = dist(e.x, e.y, e._wallAroundX, e._wallAroundY);
          if (dWaypoint < 12) e._wallAroundX = undefined; // reached waypoint, resume normal targeting
          else { tx = e._wallAroundX; ty = e._wallAroundY; } // keep going to waypoint
        }
      }
    } else {
      e._wallAroundX = undefined;
    }

    const dx = tx - e.x, dy = ty - e.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return;
    e.x += (dx / d) * e.speed * speedMult * dt;
    e.y += (dy / d) * e.speed * speedMult * dt;
  });

  // ── Enemy separation — prevent blob stacking ──────────────────────────────
  const living = enemies.filter(e => !e.dead);
  const SEPARATION_ITERS = 2; // reduced from 3 — still good separation
  for (let iter = 0; iter < SEPARATION_ITERS; iter++) {
    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      for (let j = i + 1; j < living.length; j++) {
        const b = living[j];
        const ex = a.x - b.x;
        const ey = a.y - b.y;
        const minDist = (a.radius ?? 6) + (b.radius ?? 6);
        const d2 = ex * ex + ey * ey;
        if (d2 < minDist * minDist && d2 > 0.0001) {
          const d   = Math.sqrt(d2);
          const overlap = (minDist - d) * 0.5;
          const nx  = ex / d, ny = ey / d;
          a.x += nx * overlap;
          a.y += ny * overlap;
          b.x -= nx * overlap;
          b.y -= ny * overlap;
        }
      }
    }
  }

  // ── Wall depenetration — push any enemy that clipped inside a wall back out ──
  // Runs after movement AND separation so enemies can't tunnel through on fast frames.
  if (livingWalls.length > 0) {
    living.forEach(e => {
      livingWalls.forEach(w => pushEnemyOutOfWall(e, w));
    });
  }
}

// ─── Combat: units attack enemies ─────────────────────────────────────────────

export function updateUnitCombat(units, enemies, dt, upgrades = [], waveNumber = 1) {
  const baseDamage = 18 + upgradeCount(upgrades, "soldier_dmg") * 5;
  const RATE = 1.2;
  const RANGE = 55;

  units.forEach(u => {
    u.attackCooldown = Math.max(0, (u.attackCooldown ?? 0) - dt);
    if (u.attackCooldown > 0) return;

    let target = null, bestDist = Infinity;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = dist(u.x, u.y, e.x, e.y);
      if (d < RANGE && d < bestDist) { bestDist = d; target = e; }
    });
    if (!target) return;

    target.hp -= baseDamage;
    u.attackCooldown = 1 / RATE;

    // Unit projectile
    if (!u.projectiles) u.projectiles = [];
    u.projectiles.push({ id: Date.now() + Math.random(), x: u.x, y: u.y, tx: target.x, ty: target.y, age: 0, ttl: 0.14, color: "rgba(255,140,80,0.7)" });

    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      // Store gold drop on enemy so ProtectorView can award it and show the floater
      const waveBonus = Math.floor(waveNumber * KILL_GOLD_WAVE_SCALE_UNIT);
      const demoBonus = target.type === "demolisher" ? KILL_GOLD_DEMOLISHER_BONUS : 0;
      target._goldDrop = 10 + waveBonus + demoBonus + Math.floor(Math.random() * 6);
    }
  });

  units.forEach(u => {
    if (!u.projectiles) return;
    u.projectiles.forEach(p => { p.age += dt; });
    u.projectiles = u.projectiles.filter(p => p.age < p.ttl);
  });
}

// ─── Turret combat ────────────────────────────────────────────────────────────

export function updateTurrets(buildings, enemies, dt, waveNumber = 1) {
  buildings.forEach(b => {
    if (b.type !== "turret" || b.hp <= 0) return;
    const def = BUILDING_TYPES.turret;
    // Effective tier stacks workers + cash upgrades — both contribute equally
    const tier = effectiveTier(b);
    const attackDamage = def.attackDamage + tier * TURRET_TIER_DAMAGE;
    const attackRange  = def.attackRange  + tier * TURRET_TIER_RANGE;
    const attackRate   = def.attackRate   + tier * TURRET_TIER_RATE;
    b.turretCooldown = Math.max(0, (b.turretCooldown ?? 0) - dt);
    if (b.turretCooldown > 0) return;

    // Find nearest living enemy in range
    let target = null, bestDist = Infinity;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = dist(b.x, b.y, e.x, e.y);
      if (d < attackRange && d < bestDist) { bestDist = d; target = e; }
    });
    if (!target) return;

    target.hp -= attackDamage;
    b.turretCooldown = 1 / attackRate;
    // Store effective range on building so draw loop can show correct ring
    b._effectiveRange = attackRange;

    if (!b.turretProjectiles) b.turretProjectiles = [];
    b.turretProjectiles.push({
      id: Date.now() + Math.random(),
      x: b.x, y: b.y,
      tx: target.x, ty: target.y,
      age: 0, ttl: 0.12,
    });

    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      const waveBonus = Math.floor(waveNumber * KILL_GOLD_WAVE_SCALE_UNIT);
      const demoBonus = target.type === "demolisher" ? KILL_GOLD_DEMOLISHER_BONUS : 0;
      target._goldDrop = 10 + waveBonus + demoBonus + Math.floor(Math.random() * 6);
    }
  });

  // Tick projectile animations
  buildings.forEach(b => {
    if (!b.turretProjectiles) return;
    b.turretProjectiles.forEach(p => { p.age += dt; });
    b.turretProjectiles = b.turretProjectiles.filter(p => p.age < p.ttl);
  });
}

// ─── Fire Trap AOE ────────────────────────────────────────────────────────────

export function updateFireTraps(buildings, enemies, dt, waveNumber = 1) {
  const livingEnemies = enemies.filter(e => !e.dead);
  if (livingEnemies.length === 0) return;

  buildings.forEach(b => {
    if (b.type !== "fire_trap" || b.hp <= 0) return;
    const def = BUILDING_TYPES.fire_trap;
    const tier = effectiveTier(b);
    const aoeRange   = def.aoeRange  + tier * FIRE_TRAP_TIER_RANGE;
    const aoeDamage  = def.aoeDamage + tier * FIRE_TRAP_TIER_DAMAGE;
    const aoeRate    = def.aoeRate;

    b.fireCooldown = Math.max(0, (b.fireCooldown ?? 0) - dt);
    if (b.fireCooldown > 0) return;

    // Check if any enemy is in range before firing
    let anyInRange = false;
    for (const e of livingEnemies) {
      if (dist(b.x, b.y, e.x, e.y) < aoeRange) { anyInRange = true; break; }
    }
    if (!anyInRange) return;

    // AOE burst — damage ALL enemies in range
    b.fireCooldown = 1 / aoeRate;
    b._fireFlash = 0.35; // visual flash duration (seconds)
    b._aoeRange = aoeRange;

    livingEnemies.forEach(e => {
      if (dist(b.x, b.y, e.x, e.y) < aoeRange) {
        e.hp -= aoeDamage;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          const waveBonus = Math.floor(waveNumber * KILL_GOLD_WAVE_SCALE_UNIT);
          const demoBonus = e.type === "demolisher" ? KILL_GOLD_DEMOLISHER_BONUS : 0;
          e._goldDrop = 10 + waveBonus + demoBonus + Math.floor(Math.random() * 6);
        }
      }
    });
  });

  // Tick flash animation
  buildings.forEach(b => {
    if (b.type !== "fire_trap") return;
    if ((b._fireFlash ?? 0) > 0) b._fireFlash = Math.max(0, b._fireFlash - dt);
  });
}

// ─── Burn Aura — passive AOE fire ring around the protector ──────────────────
export const BURN_AURA_BASE_DAMAGE = 8;   // dmg/sec per tier
export const BURN_AURA_BASE_RADIUS = 65;  // base radius (tier 1)
export const BURN_AURA_RADIUS_PER_TIER = 15; // +15 radius per additional tier

export function getBurnAuraStats(upgrades = []) {
  const tiers = upgradeCount(upgrades, "burn_aura");
  if (tiers === 0) return null;
  return {
    damage: BURN_AURA_BASE_DAMAGE * tiers,
    radius: BURN_AURA_BASE_RADIUS + BURN_AURA_RADIUS_PER_TIER * (tiers - 1),
    tiers,
  };
}

export function updateBurnAura(state, dt) {
  const aura = getBurnAuraStats(state.upgrades ?? []);
  if (!aura) return;
  const { damage, radius } = aura;
  const px = state.player.x, py = state.player.y;
  state.enemies.forEach(e => {
    if (e.dead) return;
    if (dist(px, py, e.x, e.y) < radius + e.radius) {
      e.hp -= damage * dt;
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        const waveNumber = state.waveNumber ?? 1;
        const waveBonus  = Math.floor(waveNumber * KILL_GOLD_WAVE_SCALE_PROTECTOR);
        const demoBonus  = e.type === "demolisher" ? KILL_GOLD_DEMOLISHER_BONUS : 0;
        e._goldDrop = 20 + waveBonus + demoBonus + Math.floor(Math.random() * 11);
        e._goldAwardedByBurnAura = true;
        state.gold = (state.gold ?? 0) + e._goldDrop;
      }
    }
  });
}

// ─── Protector abilities ──────────────────────────────────────────────────────

// Taunt: forces ALL enemies on the map to chase the protector for a duration
export const TAUNT_DURATION = 5.0;   // seconds enemies are forced to chase protector
export const TAUNT_COOLDOWN = 10.0;  // seconds before taunt can be used again

// Shield Wall: brief damage reduction for the protector
export const SHIELD_WALL_DURATION    = 3.5;  // seconds of protection
export const SHIELD_WALL_COOLDOWN    = 18.0; // seconds before reuse
export const SHIELD_WALL_REDUCTION   = 0.25; // incoming damage multiplier (75% reduction)

// Rally Flag: protector clicks to plant a flag; soldiers rush to hold that position
// Soldiers still break formation to attack nearby enemies as normal
export const RALLY_DURATION = 20.0; // seconds flag persists before auto-expiring

export function updateTaunt(state, dt) {
  // Tick taunt cooldown
  state.tauntCooldown = Math.max(0, (state.tauntCooldown ?? 0) - dt);

  // Tick active duration
  if ((state.tauntActive ?? 0) > 0) {
    state.tauntActive -= dt;
    // Enemy chasing is enforced each tick by updateEnemies via the tauntActive param
  }
}

export function activateTaunt(state) {
  if ((state.tauntCooldown ?? 0) > 0) return false;
  if ((state.playerHp ?? 0) <= 0) return false;
  // Force ALL enemies on the map to chase the protector
  state.enemies.forEach(e => {
    if (e.dead || e.ignoresPlayers) return;
    e.chasingProtector = true;
  });
  state.tauntActive   = TAUNT_DURATION;
  state.tauntCooldown = TAUNT_COOLDOWN;
  return true;
}

export function updateShieldWall(state, dt) {
  state.shieldWallCooldown = Math.max(0, (state.shieldWallCooldown ?? 0) - dt);
  if ((state.shieldWallActive ?? 0) > 0) {
    state.shieldWallActive -= dt;
  }
}

export function activateShieldWall(state) {
  if ((state.shieldWallCooldown ?? 0) > 0) return false;
  if ((state.playerHp ?? 0) <= 0) return false;
  state.shieldWallActive   = SHIELD_WALL_DURATION;
  state.shieldWallCooldown = SHIELD_WALL_COOLDOWN;
  return true;
}

// Rally flag: stored as state.rallyFlag = { x, y, timeLeft } | null
export function activateRallyFlag(state, worldX, worldY) {
  // Flag persists indefinitely — must be removed by clicking near it in rally mode
  state.rallyFlag = { x: worldX, y: worldY };
}

export function updateRallyFlag(state, dt) {
  // No-op: flag is permanent until explicitly removed by the player
}

const ENEMY_ATTACK_RANGE  = 14;
const ENEMY_ATTACK_DAMAGE = 9;   // base; scales with wave (see getEnemyAttackDamage)
const ENEMY_ATTACK_RATE   = 2.0; // brutes hit frequently — builder cannot out-repair solo
const DEMOLISHER_ATTACK_DAMAGE = 40; // massive — shreds buildings in seconds if uncontested
const DEMOLISHER_ATTACK_RATE   = 0.875; // ~35 DPS base, kills a barracks in ~2s

// Enemy attack scales aggressively with wave: +1.0 dmg/wave for regular enemies,
// +2.0/wave for demolishers — no cap, late waves are supposed to be brutal.
export function getEnemyAttackDamage(waveNumber = 1) {
  return ENEMY_ATTACK_DAMAGE + waveNumber * 1.0;
}
export function getDemolisherAttackDamage(waveNumber = 1) {
  return DEMOLISHER_ATTACK_DAMAGE + waveNumber * 2.0;
}

// Returns the new protector hp (caller must write it back to state)
export function updateEnemyAttacks(enemies, buildings, dt, protectorX, protectorY, protectorHp, state = null, waveNumber = 1) {
  let newProtectorHp = protectorHp ?? PROTECTOR_MAX_HP;
  const livingBuildings = buildings.filter(b => b.hp > 0);
  const scaledDmg       = getEnemyAttackDamage(waveNumber);
  const scaledDemoDmg   = getDemolisherAttackDamage(waveNumber);

  enemies.forEach(e => {
    if (e.dead) return;
    e.attackCooldown = Math.max(0, (e.attackCooldown ?? 0) - dt);
    if (e.attackCooldown > 0) return;

    // Melee protector if chasing them
    if (e.chasingProtector && protectorX !== undefined) {
      if (dist(e.x, e.y, protectorX, protectorY) < ENEMY_ATTACK_RANGE + 8) {
        const shieldMult = (state?.shieldWallActive ?? 0) > 0 ? SHIELD_WALL_REDUCTION : 1;
        newProtectorHp = Math.max(0, newProtectorHp - scaledDmg * 1.5 * shieldMult);
        e.attackCooldown = 1 / ENEMY_ATTACK_RATE;
      }
      return; // protector chasers don't also hit buildings
    }

    if (e.chasingBuilder) return; // builder damage handled separately

    // Demolishers deal heavy damage to buildings
    const dmg  = e.type === "demolisher" ? scaledDemoDmg : scaledDmg;
    const rate = e.type === "demolisher" ? DEMOLISHER_ATTACK_RATE   : ENEMY_ATTACK_RATE;

    livingBuildings.forEach(b => {
      const bDef = BUILDING_TYPES[b.type];
      // Walls use rotated-rect distance; all others use circle distance
      const inRange = bDef.isWall
        ? distToWall(e.x, e.y, b) < ENEMY_ATTACK_RANGE
        : dist(e.x, e.y, b.x, b.y) < ENEMY_ATTACK_RANGE + bDef.radius;
      if (inRange) {
        b.hp = Math.max(0, b.hp - dmg);
        e.attackCooldown = 1 / rate;
        // Kill workers in a building that falls
        if (b.hp <= 0 && b.workers > 0) {
          b.deadWorkers = b.workers;
          // Homes are counted by calcTownspeople (standing-home census), so
          // only subtract from state.townspeople for non-home buildings.
          // This keeps the pool accurate so clampWorkers at breather-time
          // doesn't over-clamp workers on surviving buildings.
          if (state && b.type !== "home") {
            state.townspeople = Math.max(0, (state.townspeople ?? 0) - b.workers);
          }
          b.workers = 0;
        }
      }
    });
  });

  return newProtectorHp;
}

// ─── Combat: enemies attack units (soldiers) ──────────────────────────────────

const ENEMY_UNIT_ATTACK_RANGE  = 14; // slightly tighter than building attack
const ENEMY_UNIT_ATTACK_DAMAGE = 10; // soldiers are beefier now (50 hp base)
const ENEMY_UNIT_ATTACK_RATE   = 1.0; // a bit slower than building attacks so soldiers can kite

// Returns { survivors, casualties }
// casualties: array of { barracksId } for each soldier that just died this tick.
export function updateEnemyAttackUnits(enemies, units, dt) {
  enemies.forEach(e => {
    if (e.dead) return;
    // Only attack units if not already locked onto protector/builder/building this tick
    // Use a separate cooldown slot so unit attacks don't block building attacks
    e.unitAttackCooldown = Math.max(0, (e.unitAttackCooldown ?? 0) - dt);
    if (e.unitAttackCooldown > 0) return;

    let target = null, bestDist = Infinity;
    units.forEach(u => {
      if (u.hp <= 0) return;
      const d = dist(e.x, e.y, u.x, u.y);
      if (d < ENEMY_UNIT_ATTACK_RANGE + (u.radius ?? 6) && d < bestDist) {
        bestDist = d; target = u;
      }
    });
    if (!target) return;

    target.hp = Math.max(0, target.hp - ENEMY_UNIT_ATTACK_DAMAGE);
    e.unitAttackCooldown = 1 / ENEMY_UNIT_ATTACK_RATE;
  });

  const casualties = units
    .filter(u => u.hp <= 0)
    .map(u => ({ barracksId: u.barracksId }));

  return { survivors: units.filter(u => u.hp > 0), casualties };
}

// ─── Units follow hero ────────────────────────────────────────────────────────

const UNIT_SPEED          = 140;
const UNIT_FOLLOW_RADIUS  = 55;
const UNIT_ENGAGE_RADIUS  = 100; // soldiers break formation to attack enemies within this range

// heroX/heroY = protector position; builderX/builderY = builder position (may be null)
export function updateUnitMovement(units, heroX, heroY, dt, enemies = [], rallyX, rallyY, builderX, builderY) {
  // If heroX/heroY are null (protector dead), protector-following units rally to town center
  const protectorAlive = heroX !== null && heroY !== null;
  const builderAlive   = builderX !== null && builderX !== undefined;

  const anchorX = protectorAlive ? heroX : (rallyX ?? heroX);
  const anchorY = protectorAlive ? heroY : (rallyY ?? heroY);

  // Separate index counters so fan-out angles look right per group
  let protIdx = 0, builderIdx = 0;
  const protUnits    = units.filter(u => (u.follows ?? "protector") === "protector");
  const builderUnits = units.filter(u => u.follows === "builder");

  units.forEach(u => {
    const isBuilderUnit = u.follows === "builder";
    const groupLen   = isBuilderUnit ? builderUnits.length : protUnits.length;
    const groupIdx   = isBuilderUnit ? builderIdx++ : protIdx++;

    // Anchor for this soldier
    const ax = isBuilderUnit
      ? (builderAlive ? builderX : (rallyX ?? heroX))
      : anchorX;
    const ay = isBuilderUnit
      ? (builderAlive ? builderY : (rallyY ?? heroY))
      : anchorY;

    // Find nearest living enemy within engage range
    let nearestEnemy = null, nearestDist = Infinity;
    enemies.forEach(e => {
      if (e.dead) return;
      const d = dist(u.x, u.y, e.x, e.y);
      if (d < UNIT_ENGAGE_RADIUS && d < nearestDist) { nearestDist = d; nearestEnemy = e; }
    });

    let targetX, targetY;
    if (nearestEnemy) {
      targetX = nearestEnemy.x;
      targetY = nearestEnemy.y;
    } else {
      const angle = (groupIdx / Math.max(groupLen, 1)) * Math.PI * 2 + Math.PI / 6;
      targetX = ax + Math.cos(angle) * UNIT_FOLLOW_RADIUS;
      targetY = ay + Math.sin(angle) * UNIT_FOLLOW_RADIUS;
    }

    const dx = targetX - u.x, dy = targetY - u.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 4) return;
    const step = Math.min(d, UNIT_SPEED * dt);
    u.x += (dx / d) * step;
    u.y += (dy / d) * step;
  });
}

// ─── Builder repair ───────────────────────────────────────────────────────────

export const BUILDER_DIRECT_REPAIR_RADIUS = 30; // how close builder must be to directly repair
export const BUILDER_DIRECT_REPAIR_RATE   = 6;  // hp/sec for direct repair — intentionally can't out-rep heavy enemy pressure
export const BUILDER_PLACE_RANGE_BONUS    = 30; // added to PLACE_RANGE with place_range upgrade

export function updateBuilderRepair(builderX, builderY, buildings, dt, upgrades = []) {
  const autoRepair  = upgrades.includes("shop_auto");
  const repairBonus = upgrades.includes("repair_speed") ? 1.5 : 1.0;
  // Clear all repair flags first; re-set below.
  buildings.forEach(b => { b._beingRepaired = false; });

  // ── Direct repair (no shop needed) ───────────────────────────────────────
  // Builder heals the single CLOSEST damaged building in melee range.
  // With builder_aura upgrades, can overheal: 125%/150%/175%/200% of maxHp.
  const overhealCap = getBuilderOverhealCap(upgrades);
  let directTarget = null, closestDist = Infinity;
  buildings.forEach(target => {
    if (target.hp <= 0 || target.hp >= target.maxHp * overhealCap) return;
    const def = BUILDING_TYPES[target.type];
    const d = dist(builderX, builderY, target.x, target.y);
    if (d < def.radius + BUILDER_DIRECT_REPAIR_RADIUS && d < closestDist) {
      closestDist = d; directTarget = target;
    }
  });
  if (directTarget) {
    directTarget.hp = Math.min(directTarget.maxHp * overhealCap, directTarget.hp + BUILDER_DIRECT_REPAIR_RATE * repairBonus * dt);
    directTarget._beingRepaired = true;
  }

  // ── Repair shop ───────────────────────────────────────────────────────────
  // When the builder is inside a repair shop (or shop_auto is active), the shop
  // triages the single LOWEST-HP building in range and heals it at 2× base rate.
  // Focused and faster than direct repair, but still one building at a time.
  buildings.forEach(shop => {
    if (shop.type !== "repair_shop" || shop.hp <= 0) return;
    const def     = BUILDING_TYPES.repair_shop;
    const tier    = effectiveTier(shop);
    const builderIn = dist(builderX, builderY, shop.x, shop.y) < def.radius + 20;
    if (!builderIn && !autoRepair) return;

    const rate   = (builderIn ? def.repairRate * 2 : def.repairRate * 0.6) + tier * REPAIR_SHOP_TIER_RATE;
    const radius = def.repairRadius + tier * REPAIR_SHOP_TIER_RADIUS;

    // Triage: pick the single most-damaged building in range
    let shopTarget = null, lowestHpPct = Infinity;
    buildings.forEach(target => {
      if (target.hp <= 0 || target.hp >= target.maxHp) return;
      if (dist(shop.x, shop.y, target.x, target.y) >= radius) return;
      const pct = target.hp / target.maxHp;
      if (pct < lowestHpPct) { lowestHpPct = pct; shopTarget = target; }
    });
    if (shopTarget) {
      shopTarget.hp = Math.min(shopTarget.maxHp, shopTarget.hp + rate * dt);
      shopTarget._beingRepaired = true;
    }
  });
}

// ─── Garden slow zones ────────────────────────────────────────────────────────

export function getSlowZones(buildings, upgrades = []) {
  const globalBonus = upgradeCount(upgrades, "garden_size") * 30;
  return buildings
    .filter(b => b.type === "garden" && b.hp > 0)
    .map(b => {
      const tier = effectiveTier(b);
      return {
        x:      b.x,
        y:      b.y,
        radius: BUILDING_TYPES.garden.slowRadius + globalBonus + tier * GARDEN_TIER_RADIUS,
        factor: Math.max(0.25, BUILDING_TYPES.garden.slowFactor - tier * GARDEN_TIER_SLOW),
      };
    });
}

// ─── Wave end: calculate gold bonus ──────────────────────────────────────────

export function calcWaveEndGold(buildings, waveNumber = 1) {
  const bonusPerBuilding = BUILDING_SURVIVAL_BONUS + BUILDING_SURVIVAL_BONUS_WAVE_SCALE * waveNumber;
  return buildings.filter(b => b.hp >= b.maxHp && b.type !== "town_center").length * Math.round(bonusPerBuilding);
}

// ─── Townspeople: recalculate from standing homes ─────────────────────────────
// Call this at the start of each build/breather phase.

export function calcTownspeople(buildings) {
  // Each standing home grants workersGranted base pop + HOME_TIER_WORKERS per cash upgrade tier.
  // The upgradeTier (cash upgrades) must be included here or enterBreather will strip
  // those extra people every wave-clear.
  const homePop = buildings
    .filter(b => b.type === "home" && b.hp > 0)
    .reduce((sum, b) => {
      const base  = BUILDING_TYPES.home.workersGranted ?? 2;
      const extra = (b.upgradeTier ?? 0) * HOME_TIER_WORKERS;
      return sum + base + extra;
    }, 0);
  return TOWNSPEOPLE_START + homePop;
}

// Workers assigned to destroyed buildings must be clamped after recalc.
export function clampWorkers(buildings, totalPeople) {
  let assigned = 0;
  buildings.forEach(b => {
    if (b.hp <= 0) { b.workers = 0; return; }
    const max = Math.max(0, totalPeople - assigned);
    b.workers = Math.min(b.workers ?? 0, max);
    assigned += b.workers;
  });
}

// ─── Barracks: canonical soldier count ───────────────────────────────────────
// Total soldiers a barracks should field = 1 (base) + workers + upgradeTier + soldier_cnt upgrades.
// This single function is the source of truth; both spawnSoldiers and onWorkerAssign use it.
export function barracksSoldierTarget(building, upgrades = []) {
  const extra = upgradeCount(upgrades, "soldier_cnt");
  return 1 + (building.workers ?? 0) + (building.upgradeTier ?? 0) + extra;
}

// ─── Scout helper ─────────────────────────────────────────────────────────────
// Returns how many enemies will spawn from each edge for a given wave.
// edge 0=top, 1=right, 2=bottom, 3=left — matches spawnWave logic.
export function scoutWave(waveNumber, seed) {
  const rand  = seededRand(seed + waveNumber * 1000);
  const base  = 7;
  const count = waveNumber <= 4
    ? base + (waveNumber - 1) * 4
    : base + 12 + Math.floor((waveNumber - 4) * 3);
  const demolisherCount = waveNumber >= 3
    ? Math.min(count, Math.floor((waveNumber - 2) / 2) +
        (waveNumber >= 10 ? Math.floor(Math.pow((waveNumber - 10) / 5, 2)) : 0))
    : 0;

  const perSide = [0, 0, 0, 0];
  const demolishersPerSide = [0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    const isDemolisher = i < demolisherCount;
    const isRaider = !isDemolisher && rand() > 0.4; // consume same rng
    const edge = Math.floor(rand() * 4);
    perSide[edge]++;
    if (isDemolisher) demolishersPerSide[edge]++;
  }
  return { perSide, demolishersPerSide, total: count, demolisherCount };
}
// With builder_aura upgrade, direct repair can push buildings above their maxHp.
// 4 purchasable tiers: 125% / 150% / 175% / 200% — fully upgraded doubles a building's HP.
// Overhealed hp is shown as a gold bar above the normal hp arc.
export const BUILDER_OVERHEAL_CAP = 1.15; // legacy — use getBuilderOverhealCap(upgrades) instead
export function getBuilderOverhealCap(upgrades = []) {
  const tiers = Math.min(upgradeCount(upgrades, "builder_aura"), 4);
  if (tiers === 0) return 1.0;
  return 1.0 + tiers * 0.25; // 1.25 / 1.50 / 1.75 / 2.00
}

// No longer used as a placement bonus — upgrade now boosts direct repair to overheal
export function applyConstructionAura() {} // no-op kept for import compat

// ─── Sell building ────────────────────────────────────────────────────────────
export function sellBuilding(buildingId, buildings, gold, upgrades = []) {
  const idx = buildings.findIndex(b => b.id === buildingId);
  if (idx === -1) return { buildings, gold };
  const b = buildings[idx];
  if (b.type === "town_center") return { buildings, gold }; // can't sell TC
  const refundRate = upgrades.includes("sell_refund") ? 0.75 : 0.5;
  const hpFrac = b.maxHp > 0 ? Math.max(0, b.hp / b.maxHp) : 0;
  const refund = Math.floor((BUILDING_TYPES[b.type]?.cost ?? 0) * refundRate * hpFrac);
  const newBuildings = buildings.filter((_, i) => i !== idx);
  return { buildings: newBuildings, gold: gold + refund, refund };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

// Score includes wave number, flawless wave bonuses, and a "no downs" streak bonus.
export function calculateScore(buildings, enemiesKilled, waveNumber, flawlessWaves = 0, totalDowns = 0) {
  const standing = buildings.filter(b => b.hp > 0).length;
  const total    = buildings.length;
  const flawlessBonus = flawlessWaves * 50;
  return { waveReached: waveNumber, standing, total, score: waveNumber, flawlessWaves, flawlessBonus, totalDowns, enemiesKilled };
}

// Call at end of each wave to determine if it was flawless
// Flawless = no building lost HP AND neither player went down during the wave
export function wasWaveFlawless(buildingDamageThisWave, downsThisWave) {
  return buildingDamageThisWave === 0 && downsThisWave === 0;
}

// ─── Lerp helper ─────────────────────────────────────────────────────────────

export function lerp(a, b, t) { return a + (b - a) * t; }