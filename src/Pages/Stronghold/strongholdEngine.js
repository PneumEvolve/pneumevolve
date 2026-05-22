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

export const BUILDING_SURVIVAL_BONUS = 25; // gold per building at full hp after wave

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

// ─── Inter-wave timers ────────────────────────────────────────────────────────

// Breather grows with wave number: base 30s + 4s per wave, capped at 60s.
// Early waves get a head-start so players have breathing room to get set up.
export function getBreatherDuration(waveNumber) {
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
    description: "Erupts in flames periodically, dealing AOE damage to all enemies in range. Workers increase damage (+6) and range (+15) each.",
  },
};

export const PLACEABLE_BUILDINGS = Object.values(BUILDING_TYPES).filter(b => b.placeable);

// ─── Building upgrade costs ───────────────────────────────────────────────────
// Turret upgrades: infinite tiers via repeatableCost(TURRET_UPGRADE_BASE_COST, tier).
export const TURRET_UPGRADE_BASE_COST = 80; // base cost; scales ×1.6 per tier
// Per tier: +12 damage, +30 range, +0.5 fire rate, +30 HP
export const TURRET_TIER_DAMAGE   = 12;
export const TURRET_TIER_RANGE    = 30;
export const TURRET_TIER_RATE     = 0.5;
export const TURRET_TIER_HP       = 30;

// Home upgrades: infinite tiers via repeatableCost(HOME_UPGRADE_BASE_COST, tier).
export const HOME_UPGRADE_BASE_COST = 60; // base cost; scales ×1.6 per tier
// Per tier: +1 townsperson immediately, +20 max HP
export const HOME_TIER_WORKERS    = 1;
export const HOME_TIER_HP         = 20;

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
  { id: "builder_aura",       label: "Master crafts",   desc: "Direct repair can overheal buildings to 115% HP", cost: 70,  tree: "workshop", tier: 1 },
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

// ─── Market income ────────────────────────────────────────────────────────────

// Call every tick from the protector (gold owner). Returns gold to add.
// Income starts only after wave 1 begins (waveNumber >= 1).
export function updateMarketIncome(buildings, dt, waveNumber) {
  if ((waveNumber ?? 0) < 1) return 0;
  let income = 0;
  buildings.forEach(b => {
    if (b.type !== "market" || b.hp <= 0) return;
    const workers = Math.min(b.workers ?? 0, 3); // cap at 3 workers
    const rate = BUILDING_TYPES.market.goldPerSec + workers * 0.5;
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
    const goldDrop = 20 + Math.floor(Math.random() * 11);
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

  // Demolishers appear from wave 3 onward — 1 per 2 waves, max 3
  const demolisherCount = waveNumber >= 3 ? Math.min(Math.floor((waveNumber - 2) / 2), 3) : 0;

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

const PROTECTOR_NOTICE_RADIUS = 120; // enemies peel off to chase protector within this range
const PROTECTOR_LEASH_RADIUS  = 250; // if protector runs further than this, enemy reverts to buildings
const PROTECTOR_CHASE_SPEED_MULT = 1.0; // protector chasers move at full speed

export function updateEnemies(enemies, buildings, builderX, builderY, dt, slowZones, protectorX, protectorY) {
  const protectorAlive = protectorX !== null && protectorX !== undefined;
  const builderAlive   = builderX   !== null && builderX   !== undefined;

  // Pre-cache living buildings and walls once per tick (not inside per-enemy loop)
  const livingBuildings = buildings.filter(b => b.hp > 0);
  const livingWalls     = livingBuildings.filter(b => b.isWall);

  enemies.forEach(e => {
    if (e.dead) return;

    // Demolishers ignore players entirely — straight to buildings
    // Demolishers prioritise walls (they're building destroyers)
    if (e.ignoresPlayers) {
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

    if (e.chasingProtector) {
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
    // If the straight path to the target crosses a living wall, decide: go around or smash.
    if (livingWalls.length > 0 && !e.chasingProtector && !e.chasingBuilder) {
      const blockingWall = livingWalls.find(w => segmentCrossesWall(e.x, e.y, tx, ty, w));
      if (blockingWall) {
        // Raiders try to skirt around one of the wall's ends (+12px clearance)
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
          // Brutes and others: always attack through
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
}

// ─── Combat: units attack enemies ─────────────────────────────────────────────

export function updateUnitCombat(units, enemies, dt, upgrades = []) {
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
      target._goldDrop = 10 + Math.floor(Math.random() * 6);
    }
  });

  units.forEach(u => {
    if (!u.projectiles) return;
    u.projectiles.forEach(p => { p.age += dt; });
    u.projectiles = u.projectiles.filter(p => p.age < p.ttl);
  });
}

// ─── Turret combat ────────────────────────────────────────────────────────────

export function updateTurrets(buildings, enemies, dt) {
  buildings.forEach(b => {
    if (b.type !== "turret" || b.hp <= 0) return;
    const def = BUILDING_TYPES.turret;
    const workers = b.workers ?? 0;
    // Each worker boosts: +4 damage, +20 range, +0.3 fire rate
    const attackDamage = def.attackDamage + workers * 4;
    const attackRange  = def.attackRange  + workers * 20;
    const attackRate   = def.attackRate   + workers * 0.3;
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
      target._goldDrop = 10 + Math.floor(Math.random() * 6);
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

export function updateFireTraps(buildings, enemies, dt) {
  const livingEnemies = enemies.filter(e => !e.dead);
  if (livingEnemies.length === 0) return;

  buildings.forEach(b => {
    if (b.type !== "fire_trap" || b.hp <= 0) return;
    const def = BUILDING_TYPES.fire_trap;
    const workers = b.workers ?? 0;
    const aoeRange   = def.aoeRange  + workers * 15;
    const aoeDamage  = def.aoeDamage + workers * 6;
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
          e._goldDrop = 10 + Math.floor(Math.random() * 6);
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
        e._goldDrop = 20 + Math.floor(Math.random() * 11);
        e._goldAwardedByBurnAura = true;
        state.gold = (state.gold ?? 0) + e._goldDrop;
      }
    }
  });
}

const ENEMY_ATTACK_RANGE  = 14;
const ENEMY_ATTACK_DAMAGE = 5;
const ENEMY_ATTACK_RATE   = 1.4;
const DEMOLISHER_ATTACK_DAMAGE = 18; // ~3.6× brute — punishing
const DEMOLISHER_ATTACK_RATE   = 0.6; // slower swing but huge hits

// Returns the new protector hp (caller must write it back to state)
export function updateEnemyAttacks(enemies, buildings, dt, protectorX, protectorY, protectorHp) {
  let newProtectorHp = protectorHp ?? PROTECTOR_MAX_HP;
  const livingBuildings = buildings.filter(b => b.hp > 0);

  enemies.forEach(e => {
    if (e.dead) return;
    e.attackCooldown = Math.max(0, (e.attackCooldown ?? 0) - dt);
    if (e.attackCooldown > 0) return;

    // Melee protector if chasing them
    if (e.chasingProtector && protectorX !== undefined) {
      if (dist(e.x, e.y, protectorX, protectorY) < ENEMY_ATTACK_RANGE + 8) {
        newProtectorHp = Math.max(0, newProtectorHp - ENEMY_ATTACK_DAMAGE * 1.5);
        e.attackCooldown = 1 / ENEMY_ATTACK_RATE;
      }
      return; // protector chasers don't also hit buildings
    }

    if (e.chasingBuilder) return; // builder damage handled separately

    // Demolishers deal heavy damage to buildings
    const dmg  = e.type === "demolisher" ? DEMOLISHER_ATTACK_DAMAGE : ENEMY_ATTACK_DAMAGE;
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
export const BUILDER_DIRECT_REPAIR_RATE   = 8;  // hp/sec for direct repair
export const BUILDER_PLACE_RANGE_BONUS    = 30; // added to PLACE_RANGE with place_range upgrade

export function updateBuilderRepair(builderX, builderY, buildings, dt, upgrades = []) {
  const autoRepair  = upgrades.includes("shop_auto");
  const repairBonus = upgrades.includes("repair_speed") ? 1.5 : 1.0;
  const canOverheal = upgrades.includes("builder_aura");

  // Clear all repair flags first; re-set below.
  buildings.forEach(b => { b._beingRepaired = false; });

  // ── Direct repair (no shop needed) ───────────────────────────────────────
  // Builder heals the single CLOSEST damaged building in melee range.
  // With builder_aura upgrade, can overheal up to 115% maxHp.
  const overhealCap = canOverheal ? BUILDER_OVERHEAL_CAP : 1.0;
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
    const workers = shop.workers ?? 0;
    const builderIn = dist(builderX, builderY, shop.x, shop.y) < def.radius + 20;
    if (!builderIn && !autoRepair) return;

    const rate   = (builderIn ? def.repairRate * 2 : def.repairRate * 0.6) + workers * 4;
    const radius = def.repairRadius + workers * 20;

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
  const bonus = upgradeCount(upgrades, "garden_size") * 30;
  return buildings
    .filter(b => b.type === "garden" && b.hp > 0)
    .map(b => ({
      x:      b.x,
      y:      b.y,
      radius: BUILDING_TYPES.garden.slowRadius + bonus + (b.workers ?? 0) * 10,
      factor: Math.max(0.25, BUILDING_TYPES.garden.slowFactor - (b.workers ?? 0) * 0.05),
    }));
}

// ─── Wave end: calculate gold bonus ──────────────────────────────────────────

export function calcWaveEndGold(buildings) {
  return buildings.filter(b => b.hp >= b.maxHp && b.type !== "town_center").length * BUILDING_SURVIVAL_BONUS;
}

// ─── Townspeople: recalculate from standing homes ─────────────────────────────
// Call this at the start of each build/breather phase.

export function calcTownspeople(buildings) {
  const standingHomes = buildings.filter(b => b.type === "home" && b.hp > 0).length;
  return TOWNSPEOPLE_START + standingHomes * (BUILDING_TYPES.home.workersGranted);
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

// ─── Scout helper ─────────────────────────────────────────────────────────────
// Returns how many enemies will spawn from each edge for a given wave.
// edge 0=top, 1=right, 2=bottom, 3=left — matches spawnWave logic.
export function scoutWave(waveNumber, seed) {
  const rand  = seededRand(seed + waveNumber * 1000);
  const base  = 7;
  const count = waveNumber <= 4
    ? base + (waveNumber - 1) * 4
    : base + 12 + Math.floor((waveNumber - 4) * 3);
  const demolisherCount = waveNumber >= 3 ? Math.min(Math.floor((waveNumber - 2) / 2), 3) : 0;

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
// With builder_aura upgrade, direct repair can push building hp up to 115% maxHp.
// Overhealed hp is shown as a gold bar above the normal hp arc.
export const BUILDER_OVERHEAL_CAP = 1.15; // 115% of maxHp

// No longer used as a placement bonus — upgrade now boosts direct repair to overheal
export function applyConstructionAura() {} // no-op kept for import compat

// ─── Sell building ────────────────────────────────────────────────────────────
export function sellBuilding(buildingId, buildings, gold, upgrades = []) {
  const idx = buildings.findIndex(b => b.id === buildingId);
  if (idx === -1) return { buildings, gold };
  const b = buildings[idx];
  if (b.type === "town_center") return { buildings, gold }; // can't sell TC
  const refundRate = upgrades.includes("sell_refund") ? 0.75 : 0.5;
  const refund = Math.floor((b.maxHp > 0 ? b.hp / b.maxHp : 0) * (b.maxHp > 0 ? 1 : 0) * 0 +
    ((BUILDING_TYPES[b.type]?.cost ?? 0) * refundRate));
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