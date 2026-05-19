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

export const PROTECTOR_MAX_HP    = 100;
export const PROTECTOR_HEAL_RATE = 8;    // hp/sec when inside town center
export const PROTECTOR_ATTACK_RANGE  = 80;
export const PROTECTOR_ATTACK_DAMAGE = 18;
export const PROTECTOR_ATTACK_RATE   = 1.4; // attacks/sec base

// ─── Inter-wave timers ────────────────────────────────────────────────────────

export const BREATHER_DURATION = { 1: 45, 2: 45 }; // seconds after wave N clears

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
    description: "Spawns soldiers. Workers here speed up training.",
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
    description: "Builder repairs buildings here. Workers extend its reach.",
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
    description: "Houses townspeople. Each home grants +2 workers at the start of the next wave. Losing a home permanently removes those workers.",
    placeable:   true,
    cost:        80,
    workersGranted: 2,
  },
};

export const PLACEABLE_BUILDINGS = Object.values(BUILDING_TYPES).filter(b => b.placeable);

// ─── Upgrades ─────────────────────────────────────────────────────────────────

export const UPGRADES = [
  // Personal
  { id: "atk_speed",   label: "Sharper blade",    desc: "+25% attack speed",         cost: 60,  tree: "personal", tier: 1 },
  { id: "atk_range",   label: "Longer reach",     desc: "+20 attack range",           cost: 60,  tree: "personal", tier: 1 },
  { id: "lifesteal",   label: "Warrior's blood",  desc: "Heal 3 hp per kill",         cost: 80,  tree: "personal", tier: 2 },
  { id: "atk_damage",  label: "Heavy strikes",    desc: "+10 attack damage",          cost: 100, tree: "personal", tier: 2 },
  // Army
  { id: "soldier_hp",  label: "Toughen up",       desc: "+20 soldier hp",             cost: 60,  tree: "army",     tier: 1, needs: "barracks" },
  { id: "soldier_cnt", label: "Draft more",       desc: "+1 soldier per barracks",    cost: 80,  tree: "army",     tier: 1, needs: "barracks" },
  { id: "soldier_dmg", label: "Battle-hardened",  desc: "+5 soldier damage",          cost: 100, tree: "army",     tier: 2, needs: "barracks" },
  // Town
  { id: "tc_heal",     label: "Warm hearth",      desc: "Town center heals builder too", cost: 80, tree: "town",  tier: 1 },
  { id: "garden_size", label: "Wild growth",      desc: "+30 garden slow radius",     cost: 70,  tree: "town",     tier: 1, needs: "garden" },
  { id: "shop_auto",   label: "Steady hands",     desc: "Repair shop works at 40% without builder", cost: 100, tree: "town", tier: 2, needs: "repair_shop" },
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

export function circlesOverlap(ax, ay, ar, bx, by, br) {
  return dist(ax, ay, bx, by) < ar + br;
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

  const upgrades = state.upgrades ?? [];
  const range  = PROTECTOR_ATTACK_RANGE + (upgrades.includes("atk_range")  ? 20 : 0);
  const damage = PROTECTOR_ATTACK_DAMAGE + (upgrades.includes("atk_damage") ? 10 : 0);
  const rate   = PROTECTOR_ATTACK_RATE  * (upgrades.includes("atk_speed")   ? 1.25 : 1);
  const lifesteal = upgrades.includes("lifesteal");

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
    // Gold drop — 8-14 per kill
    state.gold = (state.gold ?? 0) + 8 + Math.floor(Math.random() * 7);
    if (lifesteal) state.playerHp = Math.min(PROTECTOR_MAX_HP, (state.playerHp ?? PROTECTOR_MAX_HP) + 3);
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
  state.playerHp = Math.min(PROTECTOR_MAX_HP, (state.playerHp ?? PROTECTOR_MAX_HP) + PROTECTOR_HEAL_RATE * dt);

  // Also heal builder if tc_heal upgrade active
  if ((state.upgrades ?? []).includes("tc_heal") && state.builderHp !== undefined) {
    state.builderHp = Math.min(PROTECTOR_MAX_HP, state.builderHp + PROTECTOR_HEAL_RATE * 0.5 * dt);
  }
}

// ─── Builder danger — enemies notice builder when close ───────────────────────

const BUILDER_NOTICE_RADIUS = 90;
const BUILDER_CHASE_SPEED_MULT = 0.7; // enemies that peel off are slightly slower

export function updateBuilderDanger(builderX, builderY, enemies, dt) {
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

// ─── Enemy spawning ───────────────────────────────────────────────────────────

export function spawnWave(waveNumber, seed) {
  const rand  = seededRand(seed + waveNumber * 1000);
  // Gentler scaling: wave 1: 6 enemies, wave 2: 10, wave 3: 15
  const count = [0, 6, 10, 15][waveNumber] ?? 6;
  const enemies = [];

  for (let i = 0; i < count; i++) {
    const isRaider = rand() > 0.35;
    const edge = Math.floor(rand() * 4);
    let x, y;
    if (edge === 0)      { x = rand() * WORLD; y = -20; }
    else if (edge === 1) { x = WORLD + 20;     y = rand() * WORLD; }
    else if (edge === 2) { x = rand() * WORLD; y = WORLD + 20; }
    else                 { x = -20;            y = rand() * WORLD; }

    enemies.push({
      id:     i,
      x, y,
      hp:     isRaider ? 18 + waveNumber * 4 : 50 + waveNumber * 12,
      maxHp:  isRaider ? 18 + waveNumber * 4 : 50 + waveNumber * 12,
      speed:  isRaider ? 48 + waveNumber * 6 + rand() * 12 : 26 + waveNumber * 4,
      radius: isRaider ? 6 : 10,
      type:   isRaider ? "raider" : "brute",
      dead:   false,
      chasingBuilder: false,
      attackCooldown: 0,
    });
  }
  return enemies;
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

export function updateEnemies(enemies, buildings, builderX, builderY, dt, slowZones) {
  enemies.forEach(e => {
    if (e.dead) return;

    let tx, ty;
    if (e.chasingBuilder) {
      tx = builderX; ty = builderY;
    } else {
      let target = null, bestDist = Infinity;
      buildings.forEach(b => {
        if (b.hp <= 0) return;
        const d = dist(e.x, e.y, b.x, b.y);
        if (d < bestDist) { bestDist = d; target = b; }
      });
      if (!target) return;
      tx = target.x; ty = target.y;
    }

    let speedMult = e.chasingBuilder ? BUILDER_CHASE_SPEED_MULT : 1;
    slowZones.forEach(z => {
      if (dist(e.x, e.y, z.x, z.y) < z.radius) speedMult = Math.min(speedMult, z.factor);
    });

    const dx = tx - e.x, dy = ty - e.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return;
    e.x += (dx / d) * e.speed * speedMult * dt;
    e.y += (dy / d) * e.speed * speedMult * dt;
  });
}

// ─── Combat: units attack enemies ─────────────────────────────────────────────

export function updateUnitCombat(units, enemies, dt, upgrades = []) {
  const baseDamage = 8 + (upgrades.includes("soldier_dmg") ? 5 : 0);
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

    if (target.hp <= 0) target.dead = true;
  });

  units.forEach(u => {
    if (!u.projectiles) return;
    u.projectiles.forEach(p => { p.age += dt; });
    u.projectiles = u.projectiles.filter(p => p.age < p.ttl);
  });
}

// ─── Combat: enemies attack buildings ─────────────────────────────────────────

const ENEMY_ATTACK_RANGE  = 18;
const ENEMY_ATTACK_DAMAGE = 3;
const ENEMY_ATTACK_RATE   = 1;

export function updateEnemyAttacks(enemies, buildings, dt) {
  enemies.forEach(e => {
    if (e.dead || e.chasingBuilder) return;
    e.attackCooldown = Math.max(0, (e.attackCooldown ?? 0) - dt);
    if (e.attackCooldown > 0) return;

    buildings.forEach(b => {
      if (b.hp <= 0) return;
      const bDef = BUILDING_TYPES[b.type];
      if (dist(e.x, e.y, b.x, b.y) < ENEMY_ATTACK_RANGE + bDef.radius) {
        b.hp = Math.max(0, b.hp - ENEMY_ATTACK_DAMAGE);
        e.attackCooldown = 1 / ENEMY_ATTACK_RATE;
        // Kill workers in a building that falls
        if (b.hp <= 0 && b.workers > 0) {
          b.deadWorkers = b.workers;
          b.workers = 0;
        }
      }
    });
  });
}

// ─── Units follow hero ────────────────────────────────────────────────────────

const UNIT_SPEED         = 120;
const UNIT_FOLLOW_RADIUS = 60;

export function updateUnitMovement(units, heroX, heroY, dt) {
  units.forEach((u, i) => {
    const angle   = (i / Math.max(units.length, 1)) * Math.PI * 2;
    const targetX = heroX + Math.cos(angle) * UNIT_FOLLOW_RADIUS;
    const targetY = heroY + Math.sin(angle) * UNIT_FOLLOW_RADIUS;
    const dx = targetX - u.x, dy = targetY - u.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 4) return;
    const step = Math.min(d, UNIT_SPEED * dt);
    u.x += (dx / d) * step;
    u.y += (dy / d) * step;
  });
}

// ─── Builder repair ───────────────────────────────────────────────────────────

export function updateBuilderRepair(builderX, builderY, buildings, dt, upgrades = []) {
  const autoRepair = upgrades.includes("shop_auto");
  buildings.forEach(b => {
    if (b.type !== "repair_shop" || b.hp <= 0) return;
    const def = BUILDING_TYPES.repair_shop;
    const workers = b.workers ?? 0;
    const builderIn = dist(builderX, builderY, b.x, b.y) < def.radius + 20;
    if (!builderIn && !autoRepair) return;

    const rate = builderIn ? def.repairRate + workers * 3 : def.repairRate * 0.4;
    const radius = def.repairRadius + workers * 20;

    buildings.forEach(target => {
      if (target.hp <= 0 || target.hp >= target.maxHp) return;
      if (dist(b.x, b.y, target.x, target.y) < radius) {
        target.hp = Math.min(target.maxHp, target.hp + rate * dt);
      }
    });
  });
}

// ─── Garden slow zones ────────────────────────────────────────────────────────

export function getSlowZones(buildings, upgrades = []) {
  const bonus = upgrades.includes("garden_size") ? 30 : 0;
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

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calculateScore(buildings, enemiesKilled, totalWaves) {
  const standing    = buildings.filter(b => b.hp > 0).length;
  const total       = buildings.length;
  const buildingPts = standing * 100;
  const killPts     = enemiesKilled * 10;
  return { buildingPts, killPts, standing, total, score: buildingPts + killPts };
}

// ─── Lerp helper ─────────────────────────────────────────────────────────────

export function lerp(a, b, t) { return a + (b - a) * t; }