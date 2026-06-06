// engine_constants.js — split from deadMilesEngine.js (pure functions, no React)

import { tickBaseResources } from "./engine_base";

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
export const WEATHER_TYPES = {
  clear: { name: "Clear", visibility: 1.0, zombieSpeed: 1.0, playerSpeed: 1.0, colorTint: null, spawnBonus: 0, icon: "☀️" },
  rain: { name: "Rain", visibility: 0.75, zombieSpeed: 0.92, playerSpeed: 0.92, colorTint: "rgba(80,100,140,0.15)", spawnBonus: 0.15, icon: "🌧️" },
  fog: { name: "Fog", visibility: 0.45, zombieSpeed: 0.85, playerSpeed: 0.95, colorTint: "rgba(140,140,150,0.2)", spawnBonus: -0.1, icon: "🌫️" },
  storm: { name: "Storm", visibility: 0.55, zombieSpeed: 0.75, playerSpeed: 0.85, colorTint: "rgba(60,60,80,0.25)", spawnBonus: 0.3, icon: "⛈️" }
};
export const NIGHT_DIFFICULTY = {
  day1: { spawnRate: 0.8, zombieSpeed: 0.9, specialChance: 0 },
  day2: { spawnRate: 1.0, zombieSpeed: 1.0, specialChance: 0.05 },
  day3: { spawnRate: 1.3, zombieSpeed: 1.1, specialChance: 0.1 },
  day4: { spawnRate: 1.6, zombieSpeed: 1.2, specialChance: 0.15 },
  day5: { spawnRate: 2.0, zombieSpeed: 1.3, specialChance: 0.25 },
  day7: { spawnRate: 2.5, zombieSpeed: 1.4, specialChance: 0.35 },
  day10: { spawnRate: 3.0, zombieSpeed: 1.5, specialChance: 0.5 }
};
export const CROP_GROW_TIME = { fast: 60 * 2, normal: 60 * 3 };
export const IN_GAME_DAY_SECS = 300;
export const CROP_TYPES = {
  potato: { growTime: CROP_GROW_TIME.fast, yield: 12, nutrition: 8, icon: "🥔", name: "Potato", season: "spring", seedsNeeded: 1 },
  corn: { growTime: CROP_GROW_TIME.normal, yield: 8, nutrition: 12, icon: "🌽", name: "Corn", season: "summer", seedsNeeded: 1 },
  wheat: { growTime: CROP_GROW_TIME.normal * 1.2, yield: 15, nutrition: 10, icon: "🌾", name: "Wheat", season: "fall", seedsNeeded: 1 },
  carrot: { growTime: CROP_GROW_TIME.fast * 0.8, yield: 10, nutrition: 6, icon: "🥕", name: "Carrot", season: "spring", seedsNeeded: 1 }
};
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
export const REPAIR_RANGE    = 50;
export const REPAIR_HP_GAIN  = 40;
export const AWAKENING_COUNT  = 55;
export const AWAKENING_INNER  = 130;
export const AWAKENING_OUTER  = 260;
export const BOSS_HP       = 500;
export const BOSS_RADIUS   = 22;
export const BOSS_SPEED    = 24;
export const BOSS_DAMAGE   = 22;
export const BOSS_ATTACK_RATE = 0.6;
export const DOOR_INTERACT_RANGE = 50;
export const DOOR_HEAR_RANGE = 55;
export const MELEE_RANGE  = 40;
export const MELEE_DAMAGE = 22;
export const MELEE_RATE   = 1.8;   // swings per second
export const MELEE_ARC    = Math.PI * 0.72; // ±65° cone (total 130°)
export const LOOT_RANGE = 40;
export const SEARCH_RANGE = 60;
export const FRAGMENT_PULSE_RANGE = 300;
export const EXIT_TARGET_X = WORLD_W / 2;
export const EXIT_TARGET_Y = 100;
export const EXIT_Y_THRESHOLD = 200;
export const CONVOY_CRUMB_SPACING    = 300;
export const CONVOY_SPEED_BASE       = 260;
export const CONVOY_SPEED_CATCH_UP   = 420;
export const CONVOY_SPEED_SLOW       = 120;
export const CONVOY_GAP_FAR          = 800;
export const CONVOY_GAP_NEAR         = 100;
export const CONVOY_EJECT_RANGE      = 45;
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
export const MAX_ACTIVITY = 40;
export const SURVIVOR_XP_PER_KILL      = 8;
export const SURVIVOR_XP_PER_HARVEST   = 3;
export const SURVIVOR_XP_PER_CRAFT     = 5;
export const SURVIVOR_XP_TABLE         = [0, 50, 120, 220, 360, 550, 800, 1100, 1500, 2000];
export const WORKSTATION_OUTPUT = {
  kitchen:    { food:  0.010 },  // ~36 food/hour
  workshop:   { scrap: 0.006, nails: 0.004 },  // ~22 scrap/hour
  farm:       { seeds: 0.004 },  // ~14 seeds/hour
  guard_post: {},                // guard_post grants defence (handled in combat), not resources
};

/** Helper: add resource to baseStorage, initialising if absent. */
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
export const WORKSTATION_DEFS = [
  {
    id:          "kitchen",
    label:       "Kitchen",
    icon:        "🍳",
    desc:        "Produces food passively. Enables cooking recipes.",
    color:       "rgba(255,160,60,0.9)",
    buildable:   true,   // can be placed as a physical blueprint
    blueprintId: "kitchen",
  },
  {
    id:          "workshop",
    label:       "Workshop",
    icon:        "🔧",
    desc:        "Produces scrap & nails. Enables fabrication recipes.",
    color:       "rgba(255,200,60,0.9)",
    buildable:   true,
    blueprintId: "workshop",
  },
  {
    id:          "farm",
    label:       "Farm",
    icon:        "🌾",
    desc:        "Produces seeds passively for replanting.",
    color:       "rgba(120,210,80,0.9)",
    buildable:   true,
    blueprintId: "farm",
  },
  {
    id:          "guard_post",
    label:       "Guard Post",
    icon:        "🛡️",
    desc:        "Boosts base defence. Reduces turret decay.",
    color:       "rgba(255,100,80,0.9)",
    buildable:   true,
    blueprintId: "guard_post",
  },
];

// ─── Workshop blueprint build costs ──────────────────────────────────────────
// These are the physical structures the player places and builds on the home base
// map. Once built, they unlock the corresponding workstation assignment slot.
export const WORKSHOP_BLUEPRINT_COSTS = {
  kitchen:    { wood: 6,  nails: 8,  scrap: 4  },
  workshop:   { scrap: 10, wood: 8,  nails: 12 },
  farm:       { wood: 4,  nails: 4,  seeds: 2  },
  guard_post: { scrap: 6, nails: 6,  wood: 4   },
};

// Human-readable labels for all blueprint types (used in activity log + UI)
export const BLUEPRINT_LABELS = {
  turret:     "Auto Turret",
  crop_plot:  "Garden Plot",
  kitchen:    "Kitchen",
  workshop:   "Workshop",
  farm:       "Farm",
  guard_post: "Guard Post",
};

// Category for each blueprint type (drives complete_blueprint logic)
export const BLUEPRINT_CATEGORY = {
  turret:     "defense",
  crop_plot:  "farm",
  kitchen:    "workshop",
  workshop:   "workshop",
  farm:       "workshop",
  guard_post: "workshop",
};
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
export const AUTO_SLEEP_SEEK_AT = 50; // sleep ≤ this → start seeking a safe sleep spot
export const AUTO_SLEEP_AT = 25;      // sleep ≤ this → sleep even if spot isn't ready yet
export const AUTO_SLEEP_UNTIL = 100;  // sleep until this level before waking
export const ATTACK_BASE_DAMAGE      = 15;     // HP lost per attack event (no turret) at tier 2
export const TURRET_DAMAGE_REDUCTION = 0.60;   // Turret blocks 60% of damage
export const GARDEN_HEAL_PER_TICK    = 3;      // HP healed per garden plot per tick
export const SURVIVOR_TRAITS = {
  // Positive
  efficient:    { id: "efficient",    label: "Efficient",    emoji: "⚡", color: "rgba(255,200,60,0.9)",  desc: "+20% workstation output",   effect: "workstation_boost",  value: 1.2 },
  resilient:    { id: "resilient",    label: "Resilient",    emoji: "🛡", color: "rgba(80,180,255,0.9)",  desc: "+25% max HP",               effect: "hp_boost",           value: 1.25 },
  green_thumb:  { id: "green_thumb",  label: "Green Thumb",  emoji: "🌿", color: "rgba(120,210,80,0.9)",  desc: "Crops grow 30% faster",     effect: "crop_speed",         value: 0.7 },
  scavenger:    { id: "scavenger",    label: "Scavenger",    emoji: "🔍", color: "rgba(200,160,80,0.9)",  desc: "+15% loot from buildings",  effect: "loot_boost",         value: 1.15 },
  medic:        { id: "medic",        label: "Field Medic",  emoji: "💊", color: "rgba(80,220,160,0.9)",  desc: "Heals nearby survivors",    effect: "heal_aura",          value: 2.0 },
  // Negative / complex
  cowardly:     { id: "cowardly",     label: "Cowardly",     emoji: "😨", color: "rgba(255,140,60,0.85)", desc: "Cannot be assigned to guard post", effect: "no_guard",    value: null },
  night_owl:    { id: "night_owl",    label: "Night Owl",    emoji: "🦉", color: "rgba(160,120,220,0.9)", desc: "+20% output at night, -10% by day", effect: "night_bonus", value: 0.2 },
  paranoid:     { id: "paranoid",     label: "Paranoid",     emoji: "👁",  color: "rgba(200,80,80,0.85)",  desc: "Morale drains 2× faster",  effect: "morale_drain",       value: 2.0 },
  loud:         { id: "loud",         label: "Loud",         emoji: "📢", color: "rgba(255,100,100,0.85)", desc: "Attracts zombies at workstation", effect: "noise",        value: 1.5 },
  stoic:        { id: "stoic",        label: "Stoic",        emoji: "🪨", color: "rgba(180,180,180,0.85)", desc: "Morale never drops below 40", effect: "morale_floor",    value: 40 },
};

// Trait pools: probability weights for random assignment
export const TRAIT_POOL_POSITIVE = ["efficient", "resilient", "green_thumb", "scavenger", "medic"];
export const TRAIT_POOL_NEGATIVE = ["cowardly", "night_owl", "paranoid", "loud", "stoic"];

/**
 * Assign 1–2 random traits to a survivor. Each survivor always gets 1 trait,
 * and has a 40% chance of a second trait from the other pool (positive/negative).
 * Uses a seeded RNG so traits are deterministic per survivor ID.
 */
export const BACKSTORY_POOL = [
  "Was a nurse before the outbreak. Still carries a first aid kit wherever she goes.",
  "Ran a small farm outside town. Knows every edible plant in the county.",
  "Former mechanic at the garage on Route 9. Can fix almost anything.",
  "Worked the night shift at a warehouse. Learned to move quiet and stay unseen.",
  "Ex-high school coach. Keeps people calm. Keeps people moving.",
  "Lived alone for two years before finding this group. Jumpy, but capable.",
  "Used to be a prepper. Knows more about survival than they let on.",
  "Has a photo of two kids in their jacket pocket. Never talks about it.",
  "Volunteered at the community centre. Knows how to organize and distribute.",
  "Was on a hunting trip when it all started. Never went home.",
  "Street medic during the early riots. Has seen too much.",
  "College student, agricultural science. The green thumb is real.",
  "Retired military. Very particular about noise discipline.",
  "Ran a bakery. Their bread kept morale high for three weeks straight.",
  "Former long-haul trucker. Can navigate anywhere, sleeps light.",
];
export const SURVIVOR_STORY_LOG_STARTERS = [
  "Arrived quietly. Didn't say much at first.",
  "Found hiding in a barricaded building.",
  "Walked out of the fog alone. Lucky to be alive.",
  "Came through the treeline carrying almost nothing.",
  "Joined the group after the highway ambush.",
];
export const SURVIVOR_MORALE_DRAIN_PER_TICK = 2;    // morale lost per base tick (30s) if no food
export const SURVIVOR_MORALE_FOOD_RESTORE   = 8;    // morale gained per food unit consumed
export const SURVIVOR_MORALE_LOW_THRESHOLD  = 40;   // below this, output penalty applies
export const SURVIVOR_MORALE_CRIT_THRESHOLD = 15;   // below this, may leave
export const SURVIVOR_FOOD_PER_TICK         = 1;    // food consumed per survivor per base tick
export const SURVIVOR_MORALE_OUTPUT_PENALTY = 0.6;  // output multiplier when morale is low

/**
 * Apply morale/hunger tick to a world-layer survivor record.
 * Called from tickBaseResources (world sim, not action layer).
 * Returns { fed: bool, moraleDelta: number }
 */
export const THREAT_TIERS = {
  0: { label: "Calm",      color: "rgba(80,220,120,0.8)",  attackChance: 0.05, damageMult: 0.5 },
  1: { label: "Stirring",  color: "rgba(200,200,80,0.85)", attackChance: 0.15, damageMult: 0.8 },
  2: { label: "Active",    color: "rgba(255,160,60,0.9)",  attackChance: 0.25, damageMult: 1.0 },
  3: { label: "Surging",   color: "rgba(255,100,60,0.9)",  attackChance: 0.4,  damageMult: 1.4 },
  4: { label: "Overrun",   color: "rgba(255,40,40,0.95)",  attackChance: 0.6,  damageMult: 2.0 },
};

// How much threat increases per tick for a secured base with unsecured adjacent nodes
export const THREAT_ESCALATION_PER_TICK     = 0.08;  // fractional tier per tick
export const THREAT_DECAY_ON_CLEAR_PER_TICK = 0.15;  // tier drops when all neighbors are secured

// World map edges (mirrors WorldMap.jsx EDGES — kept in sync manually)
export const WORLD_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,7],[4,6],[6,7]];
export const SUPPLY_ROUTE_TRANSFER_RATE = 0.15;  // 15% of source food/scrap per tick
export const SUPPLY_ROUTE_MIN_TRANSFER  = 2;     // minimum transferred per tick

/**
 * Tick all supply routes: transfer resources between connected nodes.
 * Routes are disrupted if either endpoint is under_attack.
 * Returns updated worldState.
 */
export const MAX_WORLD_EVENTS = 20;
export const CRISIS_EVENT_TYPES = [
  {
    id: "illness",
    weight: 3,
    generate: (sv) => ({
      id:       `crisis_${Date.now()}_illness`,
      type:     "illness",
      title:    `${sv.name} is sick`,
      body:     `${sv.name} has a fever and can barely work. Spend 2 medicine to treat them, or lose 40% of their output for the next 3 days.`,
      survivorId: sv.id,
      options: [
        { id: "treat",  label: "Treat (2 medicine)", cost: { medicine: 2 }, effect: "cure" },
        { id: "ignore", label: "Let it run its course", cost: {},          effect: "penalty" },
      ],
      resolved: false,
      ts: Date.now(),
    }),
  },
  {
    id: "morale_crisis",
    weight: 2,
    generate: (sv) => ({
      id:       `crisis_${Date.now()}_morale`,
      type:     "morale_crisis",
      title:    `${sv.name} wants to leave`,
      body:     `Morale has hit rock bottom. ${sv.name} is talking about striking out alone. Assign them somewhere meaningful, or they walk.`,
      survivorId: sv.id,
      options: [
        { id: "reassign", label: "Give them a purpose", cost: {}, effect: "reassign" },
        { id: "let_go",   label: "Let them go",         cost: {}, effect: "dismiss" },
      ],
      resolved: false,
      ts: Date.now(),
    }),
  },
  {
    id: "resource_theft",
    weight: 1,
    generate: (sv) => ({
      id:       `crisis_${Date.now()}_theft`,
      type:     "resource_theft",
      title:    "Supplies went missing",
      body:     `Someone has been eating more than their share. You're short 10 food. Investigate or let it slide — either way, someone's going to be unhappy.`,
      survivorId: null,
      options: [
        { id: "investigate", label: "Investigate (morale risk)", cost: {},            effect: "investigate" },
        { id: "absorb",      label: "Write it off",              cost: { food: 10 },  effect: "absorb" },
      ],
      resolved: false,
      ts: Date.now(),
    }),
  },
];

/**
 * Maybe generate a new crisis event. Called from the base tick interval.
 * Returns a crisis event object or null.
 * Chance per call: CRISIS_CHANCE (low — these should feel meaningful, not constant).
 */
export const CRISIS_CHANCE = 0.12; // 12% per tick (~every 4 minutes at 30s tick)
export const FOOD_PER_PLOT_PER_TICK  = 5;   // food generated per garden plot per tick
export const SCRAP_PER_TICK          = 3;   // scrap generated per secured base with a turret per tick
export const FOOD_CAP_PER_LEVEL      = 200; // maximum food stockpile per level
export const SCRAP_CAP_PER_LEVEL     = 100; // maximum scrap stockpile per level
export const CARRY_CAP = { food: 30, scrap: 20 };

/**
 * Pre-stock the player's inventory from worldState.totalResources when
 * deploying to a level. Called in handleDeploy (index.jsx) before GameView
 * mounts so the fresh state already has the items.
 *
 * Returns { inventory, worldResources } — pass worldResources back to
 * setWorldState so the carried amount is deducted from the global pool.
 */
export const BASE_UPGRADE_TREE = {
  // ── Kitchen chain ──────────────────────────────────────────────────────────
  kitchen: {
    id:       "kitchen",
    label:    "Kitchen",
    icon:     "🍳",
    chain:    "food",
    tier:     1,
    requires: null,
    cost:     { scrap: 8 },
    desc:     "+2 food/tick. Unlocks Smokehouse.",
    effects:  { foodBonusPerTick: 2 },
  },
  smokehouse: {
    id:       "smokehouse",
    label:    "Smokehouse",
    icon:     "🔥",
    chain:    "food",
    tier:     2,
    requires: "kitchen",
    cost:     { scrap: 14 },
    desc:     "Food cap ×2. Unlocks Preservation Lab.",
    effects:  { foodCapMultiplier: 2 },
  },
  preservation_lab: {
    id:       "preservation_lab",
    label:    "Preservation Lab",
    icon:     "🧪",
    chain:    "food",
    tier:     3,
    requires: "smokehouse",
    cost:     { scrap: 22 },
    desc:     "Food cap ×4. −15 morale drain on low food.",
    effects:  { foodCapMultiplier: 4, moraleShield: true },
  },
  // ── Workshop chain ─────────────────────────────────────────────────────────
  workshop: {
    id:       "workshop",
    label:    "Workshop",
    icon:     "🔧",
    chain:    "military",
    tier:     1,
    requires: null,
    cost:     { scrap: 10 },
    desc:     "+2 scrap/tick. Unlocks Armory.",
    effects:  { scrapBonusPerTick: 2 },
  },
  armory: {
    id:       "armory",
    label:    "Armory",
    icon:     "🛡",
    chain:    "military",
    tier:     2,
    requires: "workshop",
    cost:     { scrap: 20 },
    desc:     "+3 ammo/tick. Turret damage +50%.",
    effects:  { ammoBonusPerTick: 3, turretDamageBonus: 0.5 },
  },
};

/**
 * Apply a base upgrade to a single level. Pure function.
 *
 * Returns { ok: true, worldState: next }
 *      or { ok: false, reason: string, worldState: unchanged }
 *
 * Deducts cost from worldState.totalResources and adds upgradeId to
 * levels[n].baseUpgrades.
 */
export const DEFEND_WAVE_SIZE      = 20;  // zombies spawned in the defend ring
export const DEFEND_BASE_HP_RESTORE = 50; // base HP restored on successful defence

// ─── Step 4b: Heal action ─────────────────────────────────────────────────────
export const HEAL_MEDICINE_COST = 2;   // medicine spent to heal a survivor
export const HEAL_HP_RESTORE    = 40;  // HP restored per heal action

// ─── Step 4c: Deploy provisioning ────────────────────────────────────────────
export const DEPLOY_FUEL_PER_VEHICLE  = 5;  // fuel cost per vehicle in the deploy party
export const DEPLOY_FOOD_PER_SURVIVOR = 3;  // food cost per survivor in the deploy party