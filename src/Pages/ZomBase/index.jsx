import React, { useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const WORLD_W = 3200;
const WORLD_H = 2400;
const W = WORLD_W; // compat alias
const H = WORLD_H; // compat alias
const PLAYER_SPEED  = 200;
const PLAYER_RADIUS = 8;

const SHELTER = { x: W / 2, y: H / 2, w: 80, h: 60 };

const SHELTER_TIERS = [
  { level: 1, buildRadius: 280, maxHp: 200, label: "Shelter" },
  { level: 2, buildRadius: 420, maxHp: 350, label: "Fortified Shelter" },
  { level: 3, buildRadius: 600, maxHp: 500, label: "Stronghold" },
];

function getBuildRadius(lvl) { return SHELTER_TIERS[Math.min((lvl||1)-1, SHELTER_TIERS.length-1)].buildRadius; }

const DAY_DURATION   = 40;
const NIGHT_DURATION = 35;
const DAWN_DURATION  = 3;
const DUSK_DURATION  = 3;

const ZOMBIE_SPEED        = 48;
const ZOMBIE_RADIUS       = 7;
const ZOMBIE_SPAWN_COUNT  = 8; // used only for compatibility; actual=day count
const ZOMBIE_ATTACK_RANGE = 44;
const ZOMBIE_ATTACK_RATE  = 1.2;
const ZOMBIE_DAMAGE       = 4;
const ZOMBIE_CHASE_RANGE  = 150;
const ZOMBIE_HP           = 30;

const SHELTER_MAX_HP   = 200;
const BUILDING_MAX_HP  = 80;   // each placeable building has its own HP
const BUILDING_DAMAGE  = 2;    // zombie damage per hit to a building

const PLAYER_MAX_HP      = 100;
const PLAYER_DAMAGE      = 8;
const UNARMED_DAMAGE     = 6;
const UNARMED_RANGE      = 36;
const UNARMED_RATE       = 1.8;
const UNARMED_ARC        = Math.PI * 0.65;
const UNARMED_FLASH_DUR  = 0.1;
const PLAYER_ATTACK_RATE = 0.8;
const PLAYER_IFRAMES     = 0.4;
const PLAYER_REGEN_RATE  = 2;

const PLACE_RANGE      = 9999; // build zone enforces boundary
const WALL_HP          = 120;
const WALL_THICKNESS   = 10;
const WALL_BUILD_TIME  = 2;
const MIN_BUILDING_SEP = 70;
const BUILD_TIME       = 3;
const BUILD_RADIUS     = 50;

const SURVIVOR_SPEED         = 55;
const SURVIVOR_RADIUS        = 6;
const SURVIVOR_WANDER_RADIUS = 60;
const SURVIVOR_ARRIVE_TIME   = 8;
const SURVIVOR_HP            = 60;
const SURVIVOR_NAMES         = ["Alex","River","Sam","Jordan","Casey","Morgan","Quinn","Sage","Blake","Avery"];

// Survivor combat
const SURVIVOR_ATTACK_RANGE  = 55;
const SURVIVOR_ATTACK_RATE   = 1.0;
const SURVIVOR_UNARMED_DMG   = 6;
const SURVIVOR_BAT_DAMAGE    = 20;
const SURVIVOR_FLEE_HP_FRAC  = 0.30; // flee to shelter below 30% HP
const SURVIVOR_COMBAT_RANGE  = 160;  // engage zombies within this range

// Work cast times (seconds)
const GARDEN_CAST_TIME  = 8;
const KITCHEN_CAST_TIME = 10;
const CRAFT_CAST_TIME   = 3;

// Resources produced per cycle
const GARDEN_YIELD      = 2;
const KITCHEN_YIELD     = 1;
const KITCHEN_CROP_COST = 2;

// Water condenser
const CONDENSER_RATE = 0.04; // water units per second per condenser (fixed drip)

// HP drain when a need hits 0 — multiplied per unmet need
const NEED_HP_DRAIN_RATE = 3; // HP/sec per unmet need

// Building repair: occupants slowly restore the building's HP while inside
// Rate chosen so 1 person can fully repair SHELTER_MAX_HP (200) in one day (40s) → 5 HP/s
const BUILDING_REPAIR_RATE = 5; // HP/sec per occupant inside a building

// Guard post
const GUARD_POST_RANGE     = 280;
const GUARD_POST_DAMAGE    = 22;
const GUARD_POST_FIRE_RATE = 1.2;

// Carpenter behavior
const CARPENTER_REPAIR_RATE = 8; // HP/sec when actively repairing (faster than passive)

// Bat / Gun
const BAT_RANGE     = 44;
const BAT_RATE      = 1.4;
const BAT_DAMAGE    = 25;
const BAT_ARC       = Math.PI * 0.7;
const BAT_FLASH_DUR = 0.12;
const GUN_RANGE     = 240;
const GUN_RATE      = 0.9;
const GUN_DAMAGE    = 40;
const BULLET_SPEED  = 420;
const BULLET_RADIUS = 3;

// Flamethrower
const FLAME_RANGE     = 130;
const FLAME_RATE      = 0.55; // fast repeat
const FLAME_DAMAGE    = 55;   // high damage per tick
const FLAME_ARC       = Math.PI * 0.55; // cone angle
const FLAME_FLASH_DUR = 0.14;

// ─── Needs constants ──────────────────────────────────────────────────────────
// All needs are 0–100. They drain over time. At 0 = critical.
const NEEDS_MAX       = 100;
const RUN_NEEDS_MIN   = NEEDS_MAX * 0.5; // every need must be above this to be sent on a run
const HUNGER_DRAIN    = 0.6;   // per second
const THIRST_DRAIN    = 0.9;   // per second (faster)
const SLEEP_DRAIN     = 0.35;  // per second
const HUNGER_CRIT     = 20;
const THIRST_CRIT     = 20;
const SLEEP_CRIT      = 15;
const MEAL_RESTORE    = 35;    // hunger restored by 1 meal
const CROP_RESTORE    = 15;    // hunger restored by eating a raw crop (less than a cooked meal)
const WATER_RESTORE   = 40;    // thirst restored by 1 water unit
const SLEEP_RATE      = 8;     // per second while sleeping
const SLEEP_TRIGGER   = 30;    // survivors auto-seek sleep below this
const WATER_PER_DRINK = 1;     // units of water consumed per drink

// ─── Building definitions ─────────────────────────────────────────────────────
// Cost keys: scrap, wood, fuel, seeds
// Design: a focused Block Sweep gives ~5scrap+8wood → one cheap building
//         Strip Mall focused gives ~9scrap → mid buildings
//         Higher runs enable stronger buildings
const BUILDING_TYPES = {
  weaponsmith: {
    id: "weaponsmith", label: "Weapon Smith", color: "#cc9944",
    radius: 22, buildTime: BUILD_TIME, icon: "⚒",
    description: "Craft weapons here. Stand near to craft.",
    cost: { scrap: 8, wood: 6 },
  },
  gearmaker: {
    id: "gearmaker", label: "Gear Maker", color: "#aa7744",
    radius: 22, buildTime: BUILD_TIME, icon: "🧰",
    description: "Craft tools and gear here. Stand near to craft.",
    cost: { scrap: 6, wood: 8 },
  },
  house: {
    id: "house", label: "House", color: "#6699cc",
    radius: 22, buildTime: BUILD_TIME, icon: "🏠",
    description: "A home for a survivor. They arrive after 8s.",
    cost: { wood: 12, scrap: 4 },
  },
  garden: {
    id: "garden", label: "Garden Plot", color: "#44aa55",
    radius: 22, buildTime: BUILD_TIME, icon: "🌱",
    description: "Grow crops. Stand nearby to work. Gardening Gloves give 2× speed.",
    cost: { wood: 6, seeds: 4 },
  },
  kitchen: {
    id: "kitchen", label: "Kitchen", color: "#cc6633",
    radius: 22, buildTime: BUILD_TIME, icon: "🍳",
    description: "Cook meals. Stand nearby to work. Chef's Knife gives 2× speed.",
    cost: { wood: 8, scrap: 4, fuel: 2 },
  },
  condenser: {
    id: "condenser", label: "Water Condenser", color: "#44aacc",
    radius: 22, buildTime: BUILD_TIME, icon: "💧",
    description: "Drips water into storage passively.",
    cost: { scrap: 10, fuel: 3 },
  },
  guard_post: {
    id: "guard_post", label: "Guard Post", color: "#dd7722",
    radius: 22, buildTime: BUILD_TIME, icon: "🗼",
    description: "Survivors with Body Armour garrison here and shoot zombies. You can also occupy it.",
    cost: { wood: 10, scrap: 8 },
  },
  wall: {
    id: "wall", label: "Wall Section", color: "#887755",
    radius: 16, buildTime: 2, icon: "🧱",
    description: "Blocks zombies. Click two points to place.",
    cost: { wood: 5, scrap: 3 },   // per segment
  },
};

const PLACEABLE_BUILDINGS = [
  BUILDING_TYPES.house,
  BUILDING_TYPES.weaponsmith,
  BUILDING_TYPES.gearmaker,
  BUILDING_TYPES.garden,
  BUILDING_TYPES.kitchen,
  BUILDING_TYPES.condenser,
];

const DEFENSE_BUILDINGS = [
  BUILDING_TYPES.guard_post,
  BUILDING_TYPES.wall,
];

// ─── Craftable items ──────────────────────────────────────────────────────────
// Each crafted item goes into storage.inventory as a count.
// Equipping consumes 1 from inventory; unequipping returns 1.
const CRAFTABLES = {
  bat: {
    id: "bat", label: "Baseball Bat", icon: "🏏", color: "#bb8833",
    station: "weaponsmith", cost: { wood: 4, scrap: 2 }, castTime: 5,
    slot: "weapon",
    description: "Melee weapon. Auto-swings at zombies in arc.",
  },
  gun: {
    id: "gun", label: "Pistol", icon: "🔫", color: "#8899aa",
    station: "weaponsmith", cost: { scrap: 8, fuel: 2 }, castTime: 8,
    slot: "weapon",
    description: "Ranged weapon. Auto-fires at zombies up to 240px.",
  },
  flamethrower: {
    id: "flamethrower", label: "Flamethrower", icon: "🔥", color: "#ff6622",
    station: "weaponsmith", cost: { scrap: 16, fuel: 12, wood: 4 }, castTime: 14,
    slot: "weapon",
    description: "Short-range cone of fire. Hits all zombies in arc. Devastating but expensive.",
  },
  gardening_gloves: {
    id: "gardening_gloves", label: "Gardening Gloves", icon: "🧤", color: "#55aa66",
    station: "gearmaker", cost: { wood: 3, seeds: 2 }, castTime: 4,
    slot: "tool",
    description: "2× garden speed. Each survivor needs their own pair.",
  },
  chefs_knife: {
    id: "chefs_knife", label: "Chef's Knife", icon: "🔪", color: "#cc7755",
    station: "gearmaker", cost: { scrap: 4, wood: 2 }, castTime: 4,
    slot: "tool",
    description: "2× kitchen speed. Each survivor needs their own.",
  },
  body_armour: {
    id: "body_armour", label: "Body Armour", icon: "🦺", color: "#cc8833",
    station: "gearmaker", cost: { scrap: 10, fuel: 2 }, castTime: 8,
    slot: "armor",
    description: "Survivor garrisons a Guard Post and shoots zombies from safety.",
  },
  carpenters_gloves: {
    id: "carpenters_gloves", label: "Carpenter's Gloves", icon: "🪚", color: "#aa8855",
    station: "gearmaker", cost: { wood: 5, scrap: 3 }, castTime: 5,
    slot: "tool",
    description: "Survivor repairs all damaged buildings. Idles in shelter when done.",
  },
  ration_pack: {
    id: "ration_pack", label: "Ration Pack", icon: "🥫", color: "#cc9933",
    station: "kitchen", cost: { meals: 2 }, castTime: 3,
    slot: "food",
    description: "Auto-consumed on runs. Restores 50 hunger mid-run. Stackable.",
    restoreHunger: 50,
    consumable: true,
  },
  water_canteen: {
    id: "water_canteen", label: "Water Canteen", icon: "🧴", color: "#33aacc",
    station: "kitchen", cost: { water: 3 }, castTime: 3,
    slot: "water",
    description: "Auto-consumed on runs. Restores 60 thirst mid-run. Stackable.",
    restoreThirst: 60,
    consumable: true,
  },
};

const CRAFTABLES_BY_STATION = {};
Object.values(CRAFTABLES).forEach(c => {
  if (!CRAFTABLES_BY_STATION[c.station]) CRAFTABLES_BY_STATION[c.station] = [];
  CRAFTABLES_BY_STATION[c.station].push(c);
});

// ─── Run definitions ──────────────────────────────────────────────────────────
const RUN_LOOT_TYPES = [
  { id: "fuel",  icon: "⛽", label: "Fuel",   color: "#ffaa33" },
  { id: "seeds", icon: "🌾", label: "Seeds",  color: "#88dd55" },
  { id: "scrap", icon: "🔩", label: "Scrap",  color: "#aabbcc" },
  { id: "wood",  icon: "🪵", label: "Wood",   color: "#cc8844" },
];

// Gear bonuses to run success chance
const RUN_GEAR_BONUSES = {
  weapon: { bat: 0.08, gun: 0.15, flamethrower: 0.20 },
  armor:  { body_armour: 0.10 },
};
// Per-survivor gear bonus (additive, capped at +0.35 total)
function calcRunGearBonus(gearList) {
  let bonus = 0;
  for (const gear of gearList) {
    if (!gear) continue;
    bonus += RUN_GEAR_BONUSES.weapon[gear.weapon] ?? 0;
    bonus += RUN_GEAR_BONUSES.armor[gear.armor]   ?? 0;
  }
  return Math.min(0.35, bonus);
}

// Building costs range from 8-18 resources total
// Block Sweep (safe, fast): 3-6 each → ~4 avg per type → 1 focused type gives 6-9 (hits cheap buildings)
// Strip Mall: 6-10 → 1 focused type gives 9-15 (hits most mid buildings)
// Higher runs: ~12-20 → enables expensive structures
const RUNS = [
  { id:1, name:"Block Sweep",    subtitle:"Close to home",   icon:"🏘️", danger:0, dangerLabel:"CLEAR",   dangerColor:"#44cc66", duration:15,  successChance:1.0,  unlockDay:1,
    description:"A quick sweep of the block. Safe during daylight — good place to start.",
    baseLoot:{fuel:[1,3],seeds:[2,4],scrap:[3,6],wood:[4,7]}, focusBonus:0.6 },
  { id:2, name:"Strip Mall",     subtitle:"2 blocks east",   icon:"🏪", danger:1, dangerLabel:"LOW",     dangerColor:"#aadd44", duration:30,  successChance:0.9,  unlockDay:2,
    description:"Pharmacy, dollar store, gas station. A few stragglers but manageable.",
    baseLoot:{fuel:[3,6],seeds:[2,4],scrap:[5,9],wood:[3,6]}, focusBonus:0.6 },
  { id:3, name:"High School",    subtitle:"North campus",    icon:"🏫", danger:2, dangerLabel:"MEDIUM",  dangerColor:"#ddaa22", duration:45,  successChance:0.75, unlockDay:3,
    description:"Cafeteria, maintenance rooms. Lots of dark hallways and more zombies.",
    baseLoot:{fuel:[2,5],seeds:[5,9],scrap:[5,9],wood:[5,9]}, focusBonus:0.6 },
  { id:4, name:"Fire Station",   subtitle:"Downtown",        icon:"🚒", danger:2, dangerLabel:"MEDIUM",  dangerColor:"#ddaa22", duration:60,  successChance:0.7,  unlockDay:4,
    description:"Heavy equipment. Fuel reserves. Worth the risk if you need to power up.",
    baseLoot:{fuel:[8,15],seeds:[1,2],scrap:[6,11],wood:[2,5]}, focusBonus:0.6 },
  { id:5, name:"Supermarket",    subtitle:"Greenfield Ave",  icon:"🛒", danger:3, dangerLabel:"HIGH",    dangerColor:"#ee6622", duration:90,  successChance:0.55, unlockDay:5,
    description:"The big one. Overrun, but the stockroom is worth dying for.",
    baseLoot:{fuel:[2,4],seeds:[10,18],scrap:[5,9],wood:[4,8]}, focusBonus:0.6 },
  { id:6, name:"Police Armoury", subtitle:"Civic centre",    icon:"🔫", danger:4, dangerLabel:"EXTREME", dangerColor:"#cc2222", duration:120, successChance:0.4,  unlockDay:6,
    description:"Fortified. Crawling with them. But if you get through, you're set for weapons.",
    baseLoot:{fuel:[4,8],seeds:[1,3],scrap:[14,22],wood:[2,5]}, focusBonus:0.6 },
  { id:7, name:"City Hospital",  subtitle:"Emergency wing",  icon:"🏥", danger:4, dangerLabel:"EXTREME", dangerColor:"#cc2222", duration:150, successChance:0.35, unlockDay:7,
    description:"Nobody who went in week one came back. Basement supposedly still has power.",
    baseLoot:{fuel:[5,9],seeds:[7,13],scrap:[9,16],wood:[4,8]}, focusBonus:0.6 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) { return c1.map((v, i) => lerp(v, c2[i], t)); }
function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2); }
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}
function needColor(v) { return v > 60 ? "#44cc66" : v > 30 ? "#ddaa22" : "#cc3333"; }

// Check if storage has enough of all resources in cost object
function canAfford(storage, cost) {
  return Object.entries(cost).every(([k, v]) => (storage[k] ?? 0) >= v);
}
// Deduct cost from storage (mutates)
function spendResources(storage, cost) {
  Object.entries(cost).forEach(([k, v]) => { storage[k] = Math.max(0, (storage[k] ?? 0) - v); });
}
// Readable cost string e.g. "🔩8 🪵6"
const RESOURCE_ICONS = { scrap:"🔩", wood:"🪵", fuel:"⛽", seeds:"🌾", crops:"🌽", meals:"🍱", water:"💧" };
function costLabel(cost) {
  return Object.entries(cost).map(([k,v]) => `${RESOURCE_ICONS[k]??k}${v}`).join(" ");
}

const SKY = {
  day:   [0,  0,  0,  0   ],
  dusk:  [40, 10, 0,  0.45],
  night: [0,  0,  20, 0.72],
  dawn:  [10, 5,  30, 0.3 ],
};

let _namePool = [...SURVIVOR_NAMES];
function pickName() {
  if (!_namePool.length) _namePool = [...SURVIVOR_NAMES];
  return _namePool.splice(Math.floor(Math.random() * _namePool.length), 1)[0];
}

function spawnZombie(id) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if      (edge === 0) { x = Math.random() * W; y = -20; }
  else if (edge === 1) { x = W + 20;            y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H + 20; }
  else                 { x = -20;               y = Math.random() * H; }
  return { id, x, y, hp: ZOMBIE_HP, maxHp: ZOMBIE_HP, dead: false,
           attackCd: Math.random() / ZOMBIE_ATTACK_RATE, chasing: false };
}

// Spawn a zombie at a random angle outside the build zone perimeter
function spawnZombieEdge(id, cx, cy, buildRadius) {
  const angle = Math.random() * Math.PI * 2;
  const r = buildRadius + 80 + Math.random() * 200;
  const x = Math.max(20, Math.min(WORLD_W - 20, cx + Math.cos(angle) * r));
  const y = Math.max(20, Math.min(WORLD_H - 20, cy + Math.sin(angle) * r));
  return { id, x, y, hp: ZOMBIE_HP, maxHp: ZOMBIE_HP, dead: false,
           attackCd: Math.random() / ZOMBIE_ATTACK_RATE, chasing: false,
           dayPatroller: false, patrolAngle: angle + Math.PI };
}

function getToolBehavior(sv) {
  const tool   = sv.gear?.tool;
  const armor  = sv.gear?.armor;
  if (tool === "gardening_gloves")   return "garden";
  if (tool === "chefs_knife")        return "kitchen";
  if (tool === "carpenters_gloves")  return "carpenter";
  if (armor === "body_armour")       return "guard";
  return "wander";
}

function nearestBuilding(s, type, excludeSurvivorId) {
  // A workstation is "occupied" when another survivor is already inside it
  const occupiedIds = new Set(
    s.survivors
      .filter(sv => sv.insideBuilding && (!excludeSurvivorId || sv.id !== excludeSurvivorId))
      .map(sv => sv.insideBuilding)
  );
  return s.buildings
    .filter(b => b.built && (b.hp ?? BUILDING_MAX_HP) > 0 && b.type === type && !occupiedIds.has(b.id))
    .sort((a, b) => dist(0, 0, a.x, a.y) - dist(0, 0, b.x, b.y))[0] ?? null;
}

function isInsideBuilding(x, y, building) {
  const def = BUILDING_TYPES[building.type];
  return dist(x, y, building.x, building.y) < def.radius + 4;
}

function initNeeds() {
  return { hunger: NEEDS_MAX, thirst: NEEDS_MAX, sleep: NEEDS_MAX };
}
// All three needs must be above RUN_NEEDS_MIN for someone to be eligible for a run.
function needsReady(n) {
  if (!n) return false;
  return n.hunger > RUN_NEEDS_MIN && n.thirst > RUN_NEEDS_MIN && n.sleep > RUN_NEEDS_MIN;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ZomBase() {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const rafRef      = useRef(null);
  const lastRef     = useRef(null);
  const joystickRef = useRef({ active: false, ox: 0, oy: 0, dx: 0, dy: 0, id: null });
  const cameraRef   = useRef({ x: WORLD_W / 2, y: WORLD_H / 2 });
  const wallPlacingRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const weaponRef           = useRef(null);
  const playerGearRef       = useRef({ weapon: null, tool: null, armor: null });
  const selectedBuildingRef = useRef(null);
  const craftingQueueRef    = useRef(null);
  const playerOnRunRef      = useRef(false);
  const activeRunsRef       = useRef([]); // mirror of activeRuns so save paths (esp. autosave in RAF loop) read current value
  const uiUpdateAccumRef    = useRef(0); // accumulates dt; triggers forceUpdate every ~0.15s
  const autosaveFlashRef    = useRef(0); // countdown timer for autosave toast (seconds)

  const [playerGear,       setPlayerGearRaw]      = useState({ weapon: null, tool: null, armor: null });
  const [selectedBuilding, setSelectedBuildingRaw]= useState(null);
  const [craftingQueue,    setCraftingQueueRaw]   = useState(null);
  const [activePanel,      setActivePanel]        = useState(null);
  const [survivorPanel,    setSurvivorPanel]      = useState(null);
  const [playerGearOpen,   setPlayerGearOpen]     = useState(false);
  const [shelterOpen,      setShelterOpen]        = useState(false);
  const [bottomTab,        setBottomTab]          = useState("build");
  const [bottomTabsVisible, setBottomTabsVisible] = useState(true);
  const [wallPlacing, setWallPlacing] = useState(null);
  const [pendingPlacement, setPendingPlacement] = useState(null); // { x, y, type } — awaiting confirm
  const pendingPlacementRef = useRef(null);
  const [, forceUpdate]               = useState(0);
  const [saveModal,        setSaveModal]          = useState(false);
  const [saveSlots,        setSaveSlots]          = useState(() => {
    try { return JSON.parse(localStorage.getItem("zbSaveSlots") || "{}"); } catch { return {}; }
  });

  // Title screen
  const [gameScreen, setGameScreen] = useState("menu"); // "menu" | "playing"
  const [menuTab,    setMenuTab]    = useState("main"); // "main" | "load"

  // Run system
  const [runModal,   setRunModal]   = useState(null);
  const [runFocus,   setRunFocus]   = useState([]);
  const [activeRun,  setActiveRun]  = useState(null);  // kept for compat (player run)
  const [activeRuns, setActiveRuns] = useState([]);     // all concurrent runs (player + survivor parties)
  const [runResult,  setRunResult]  = useState(null);

  const setPlayerGear = v => {
    playerGearRef.current = v;
    weaponRef.current = v.weapon;
    setPlayerGearRaw(v);
  };
  const setSelectedBuilding = v => {
    selectedBuildingRef.current = v;
    setSelectedBuildingRaw(v);
    if (!v) { setPendingPlacement(null); pendingPlacementRef.current = null; }
  };
  const setCraftingQueue    = v => { craftingQueueRef.current = v;    setCraftingQueueRaw(v); };

  // ── Init ───────────────────────────────────────────────────────────────────
  function initState() {
    _namePool = [...SURVIVOR_NAMES];
    return {
      player:           { x: W / 2, y: H / 2 + 140, facing: 0 },
      playerHp:         PLAYER_MAX_HP,
      playerFlash:      0,
      playerNeeds:      initNeeds(),
      playerSleeping:   false,
      playerOnRun:      false,
      playerInBuilding: null,
      playerInShelter:  false,
      phase:            "day",  phaseT: 0,  day: 1,
      shelterHp:        SHELTER_MAX_HP,  shelterFlash: 0,
      shelterLevel:     1,
      gameOver:         false,
      zombies:          [], nextZombieId:   1, zombiesSpawned: false,
      buildings:        [], nextBuildingId: 1,
      walls:            [], nextWallId:     1,
      survivors:        [], nextSurvivorId: 1,
      bullets:          [], nextBulletId:   1,
      attackCd:         0,
      batFlash:         null,
      unarmedFlash:     null,
      // Raw materials (gathered from runs)
      storage: { crops: 0, meals: 0, fuel: 2, seeds: 4, scrap: 6, wood: 8, water: 3 },
      // Crafted item inventory: { bat: 0, gun: 0, gardening_gloves: 0, ... }
      inventory: Object.fromEntries(Object.keys(CRAFTABLES).map(k => [k, 0])),
      playerCraft:      null,
      condenserAccum:   0,
    };
  }

  // ── Tick ───────────────────────────────────────────────────────────────────
  function tick(s, dt) {
    const phaseDurs = { day: DAY_DURATION, dusk: DUSK_DURATION, night: NIGHT_DURATION, dawn: DAWN_DURATION };

    s.phaseT += dt;
    if (s.phaseT >= phaseDurs[s.phase]) {
      s.phaseT = 0;
      if      (s.phase === "day")   s.phase = "dusk";
      else if (s.phase === "dusk")  { s.phase = "night"; s.nightZombiesSpawned = false; }
      else if (s.phase === "night") { s.phase = "dawn";  s.zombies = s.zombies.filter(z=>z.dead); s.bullets = []; }
      else if (s.phase === "dawn")  { s.phase = "day";   s.day++;  s.dayZombiesSpawned = false; s._pendingAutosave = true; }
    }

    // Day zombies: 1 per day number, patrolling outside build zone
    const _buildRadius = getBuildRadius(s.shelterLevel);
    if (s.phase === "day" && !s.dayZombiesSpawned) {
      s.dayZombiesSpawned = true;
      for (let i = 0; i < s.day; i++) {
        const z = spawnZombieEdge(s.nextZombieId++, SHELTER.x, SHELTER.y, _buildRadius);
        z.dayPatroller = true;
        s.zombies.push(z);
      }
    }
    // Night: day patrollers go full aggro
    if (s.phase === "night" && !s.nightZombiesSpawned) {
      s.nightZombiesSpawned = true;
      s.zombies.forEach(z => { z.dayPatroller = false; });
    }

    // ── Water condenser ───────────────────────────────────────────────────────
    const condensers = s.buildings.filter(b => b.built && (b.hp ?? BUILDING_MAX_HP) > 0 && b.type === "condenser");
    if (condensers.length > 0) {
      s.condenserAccum = (s.condenserAccum ?? 0) + CONDENSER_RATE * condensers.length * dt;
      while (s.condenserAccum >= 1) {
        s.storage.water = (s.storage.water ?? 0) + 1;
        s.condenserAccum -= 1;
        forceUpdate(n => n + 1);
      }
    }

    // ── Player needs ──────────────────────────────────────────────────────────
    const pn = s.playerNeeds;
    {
      if (s.playerSleeping) {
        // Sleeping — restore sleep, still drain hunger/thirst slowly
        pn.sleep  = Math.min(NEEDS_MAX, pn.sleep + SLEEP_RATE * dt);
        pn.hunger = Math.max(0, pn.hunger - HUNGER_DRAIN * 0.2 * dt);
        pn.thirst = Math.max(0, pn.thirst - THIRST_DRAIN * 0.2 * dt);
        // Wake up when fully rested
        if (pn.sleep >= NEEDS_MAX) s.playerSleeping = false;
      } else {
        pn.hunger = Math.max(0, pn.hunger - HUNGER_DRAIN * dt);
        pn.thirst = Math.max(0, pn.thirst - THIRST_DRAIN * dt);
        if (!s.playerOnRun) pn.sleep = Math.max(0, pn.sleep - SLEEP_DRAIN * dt);
      }
      // Auto-consume food/water from gear while on run
      if (s.playerOnRun) {
        const pg = playerGearRef.current;
        if (pn.hunger < 30 && pg?.food && (s.inventory[pg.food] ?? 0) > 0) {
          const item = CRAFTABLES[pg.food];
          s.inventory[pg.food] = Math.max(0, (s.inventory[pg.food] ?? 0) - 1);
          pn.hunger = Math.min(NEEDS_MAX, pn.hunger + (item?.restoreHunger ?? 50));
        }
        if (pn.thirst < 30 && pg?.water && (s.inventory[pg.water] ?? 0) > 0) {
          const item = CRAFTABLES[pg.water];
          s.inventory[pg.water] = Math.max(0, (s.inventory[pg.water] ?? 0) - 1);
          pn.thirst = Math.min(NEEDS_MAX, pn.thirst + (item?.restoreThirst ?? 60));
        }
      }
      // HP drain per unmet need at 0
      let unmetCount = 0;
      if (pn.hunger === 0) unmetCount++;
      if (pn.thirst === 0) unmetCount++;
      if (pn.sleep  === 0 && !s.playerOnRun) unmetCount++;
      if (unmetCount > 0 && s.playerHp > 0) {
        s.playerHp = Math.max(0, s.playerHp - NEED_HP_DRAIN_RATE * unmetCount * dt);
        if (s.playerHp <= 0) s.gameOver = true;
      }
    }

    // ── Player inside building / shelter check ────────────────────────────────
    if (!s.playerOnRun && !s.playerSleeping) {
      let inBldId = null;
      for (const b of s.buildings) {
        if (b.built && (b.hp ?? BUILDING_MAX_HP) > 0 && isInsideBuilding(s.player.x, s.player.y, b)) {
          inBldId = b.id; break;
        }
      }
      s.playerInBuilding = inBldId;
      // Shelter: enter/exit automatically by proximity
      s.playerInShelter = Math.abs(s.player.x - SHELTER.x) < SHELTER.w / 2 &&
                          Math.abs(s.player.y - SHELTER.y) < SHELTER.h / 2;
    }

    // ── Player movement (disabled while sleeping or on run) ───────────────────
    if (!s.playerSleeping && !s.playerOnRun) {
      const keys = keysRef.current;
      const joy  = joystickRef.current;
      let vx = 0, vy = 0;
      if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) vx -= 1;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) vx += 1;
      if (keys["ArrowUp"]    || keys["w"] || keys["W"]) vy -= 1;
      if (keys["ArrowDown"]  || keys["s"] || keys["S"]) vy += 1;
      if (joy.active) { vx += joy.dx; vy += joy.dy; }
      const mlen = Math.sqrt(vx * vx + vy * vy);
      if (mlen > 0) {
        s.player.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS,
          s.player.x + (vx / mlen) * PLAYER_SPEED * dt));
        s.player.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS,
          s.player.y + (vy / mlen) * PLAYER_SPEED * dt));
        s.player.facing = Math.atan2(vy, vx);
      }
    }

    // ── Camera smooth follow ─────────────────────────────────────────────────
    const _cam = cameraRef.current;
    _cam.x = lerp(_cam.x, s.player.x, Math.min(1, 8*dt));
    _cam.y = lerp(_cam.y, s.player.y, Math.min(1, 8*dt));

    // ── Building construction ─────────────────────────────────────────────────
    s.buildings.forEach(b => {
      if (b.hp     === undefined) b.hp     = BUILDING_MAX_HP;
      if (b.maxHp  === undefined) b.maxHp  = BUILDING_MAX_HP;
      if (b.flashTimer === undefined) b.flashTimer = 0;
      if (b.flashTimer > 0) b.flashTimer = Math.max(0, b.flashTimer - dt);

      if (b.built) {
        // Guard post: fire when player or armoured survivor is garrisoned inside
        if (b.type === "guard_post" && b.hp > 0) {
          const hasPlayer = s.playerInBuilding === b.id && !s.playerOnRun;
          const guardSurv = s.survivors.find(sv => sv.insideBuilding === b.id && !sv.sleeping && !sv.onRun);
          if (hasPlayer || guardSurv) {
            b.fireCd = Math.max(0, (b.fireCd??0) - dt);
            if (b.fireCd <= 0) {
              const lz = s.zombies.filter(z=>!z.dead);
              let nearest=null, nearestD=Infinity;
              lz.forEach(z => { const d=dist(b.x,b.y,z.x,z.y); if(d<GUARD_POST_RANGE&&d<nearestD){nearest=z;nearestD=d;} });
              if (nearest) {
                b.fireCd = 1/GUARD_POST_FIRE_RATE;
                const angle=Math.atan2(nearest.y-b.y,nearest.x-b.x);
                s.bullets.push({ id:s.nextBulletId++, x:b.x, y:b.y,
                  vx:Math.cos(angle)*BULLET_SPEED, vy:Math.sin(angle)*BULLET_SPEED,
                  life:GUARD_POST_RANGE/BULLET_SPEED, fromGuardPost:true });
              }
            }
          }
          return;
        }
        if (b.type === "house" && b.arrivalTimer > 0) {
          b.arrivalTimer -= dt;
          if (b.arrivalTimer <= 0) {
            b.arrivalTimer = 0;
            if (!s.survivors.some(sv => sv.homeId === b.id)) {
              s.survivors.push({
                id: s.nextSurvivorId++, name: pickName(), homeId: b.id,
                x: b.x + 20, y: b.y + 20, hp: SURVIVOR_HP, maxHp: SURVIVOR_HP,
                wx: b.x, wy: b.y, wanderT: 0,
                gear: { weapon: null, tool: null, armor: null },
                needs: initNeeds(),
                sleeping: false,
                onRun: false,
                sleepTarget: null,
                workTarget: null,
                castProgress: 0,
                castTotal: 0,
                casting: false,
              });
            }
          }
        }
        return;
      }
      if (!s.playerOnRun && dist(s.player.x, s.player.y, b.x, b.y) <= BUILD_RADIUS) {
        b.buildProgress = Math.min(b.buildTime, (b.buildProgress ?? 0) + dt);
        if (b.buildProgress >= b.buildTime) {
          b.built = true;
          b.hp    = BUILDING_MAX_HP;
          b.maxHp = BUILDING_MAX_HP;
          if (b.type === "house") b.arrivalTimer = SURVIVOR_ARRIVE_TIME;
        }
      }
    });

    // ── Wall construction ─────────────────────────────────────────────────────
    (s.walls||[]).forEach(w => {
      if (w.flashTimer === undefined) w.flashTimer = 0;
      if (w.flashTimer > 0) w.flashTimer = Math.max(0, w.flashTimer - dt);
      if (w.built) return;
      const mx=(w.x1+w.x2)/2, my=(w.y1+w.y2)/2;
      const nearEnd1 = !s.playerOnRun && dist(s.player.x,s.player.y,w.x1,w.y1)<=BUILD_RADIUS;
      const nearEnd2 = !s.playerOnRun && dist(s.player.x,s.player.y,w.x2,w.y2)<=BUILD_RADIUS;
      if (nearEnd1||nearEnd2) {
        w.buildProgress = Math.min(w.buildTime, (w.buildProgress??0)+dt);
        if (w.buildProgress >= w.buildTime) { w.built=true; w.hp=WALL_HP; w.maxHp=WALL_HP; }
      }
    });

    // ── Player crafting ───────────────────────────────────────────────────────
    const pq = craftingQueueRef.current;
    if (pq && !s.playerOnRun && !s.playerSleeping) {
      const station = s.buildings.find(b => b.id === pq.stationId && b.built);
      const item    = CRAFTABLES[pq.itemId];
      if (station && item) {
        const near = dist(s.player.x, s.player.y, station.x, station.y) <= BUILD_RADIUS;
        if (near) {
          if (!s.playerCraft || s.playerCraft.itemId !== pq.itemId || s.playerCraft.stationId !== pq.stationId) {
            // No existing cast for this item/station — start fresh (spend resources)
            if (!canAfford(s.storage, item.cost)) {
              setCraftingQueue(null);
            } else {
              spendResources(s.storage, item.cost);
              s.playerCraft = { stationId: pq.stationId, itemId: pq.itemId, progress: 0, castTime: item.castTime };
              forceUpdate(n => n + 1);
            }
          } else {
            // Resume from where we left off (was paused while away)
            s.playerCraft.paused = false;
          }
          if (s.playerCraft) {
            s.playerCraft.progress += dt;
            if (s.playerCraft.progress >= s.playerCraft.castTime) {
              // Add to inventory
              s.inventory[pq.itemId] = (s.inventory[pq.itemId] ?? 0) + 1;
              s.playerCraft = null;
              setCraftingQueue(null);
              forceUpdate(n => n + 1);
            }
          }
        } else {
          // Player walked away — pause but keep progress
          if (s.playerCraft) s.playerCraft.paused = true;
        }
      } else {
        s.playerCraft = null;
      }
    } else if (!pq) {
      s.playerCraft = null;
    }

    // ── Player gardening / cooking (no gear required; gear gives 2x speed) ──
    const playerTool = playerGearRef.current?.tool;
    const nearGarden  = !s.playerOnRun && !s.playerSleeping &&
      s.buildings.find(b => b.built && (b.hp ?? 0) > 0 && b.type === "garden"  && dist(s.player.x, s.player.y, b.x, b.y) <= BUILD_RADIUS);
    const nearKitchen = !s.playerOnRun && !s.playerSleeping &&
      s.buildings.find(b => b.built && (b.hp ?? 0) > 0 && b.type === "kitchen" && dist(s.player.x, s.player.y, b.x, b.y) <= BUILD_RADIUS);
    const workTarget = nearGarden || nearKitchen || null;
    if (workTarget) {
      const isGarden = workTarget.type === "garden";
      const hasGloves = playerTool === "gardening_gloves";
      const hasKnife  = playerTool === "chefs_knife";
      const gearBonus = (isGarden && hasGloves) || (!isGarden && hasKnife) ? 2 : 1;
      const castTime = (isGarden ? GARDEN_CAST_TIME : KITCHEN_CAST_TIME) / gearBonus;
      if (!s.playerWorkCast || s.playerWorkCast.buildingId !== workTarget.id) {
        // Different building — check if this building has saved progress
        const savedProg = workTarget.playerWorkProgress ?? 0;
        s.playerWorkCast = { buildingId: workTarget.id, progress: savedProg, castTime, isGarden, gearBonus, paused: false };
      } else {
        // Same building — resume
        s.playerWorkCast.castTime = castTime;
        s.playerWorkCast.gearBonus = gearBonus;
        s.playerWorkCast.paused = false;
      }
      s.playerWorkCast.progress += dt;
      // Keep progress synced on the building so survivors returning here can also benefit
      workTarget.playerWorkProgress = s.playerWorkCast.progress;
      if (s.playerWorkCast.progress >= s.playerWorkCast.castTime) {
        workTarget.playerWorkProgress = 0;
        s.playerWorkCast.progress = 0;
        if (isGarden) {
          if ((s.storage.seeds ?? 0) >= 1) {
            s.storage.seeds -= 1;
            s.storage.crops = (s.storage.crops ?? 0) + GARDEN_YIELD;
          } else {
            // No seeds — flash building and do nothing
            workTarget.flashTimer = 0.5;
          }
        } else {
          if ((s.storage.crops ?? 0) >= KITCHEN_CROP_COST) {
            s.storage.crops -= KITCHEN_CROP_COST;
            s.storage.meals  = (s.storage.meals ?? 0) + KITCHEN_YIELD;
          } else {
            // No crops — flash building and do nothing
            workTarget.flashTimer = 0.5;
          }
        }
        forceUpdate(n => n + 1);
      }
    } else if (s.playerWorkCast && !s.playerWorkCast.paused) {
      // Player walked away — pause and save progress to building
      s.playerWorkCast.paused = true;
      const pausedBuilding = s.buildings.find(b => b.id === s.playerWorkCast.buildingId);
      if (pausedBuilding) pausedBuilding.playerWorkProgress = s.playerWorkCast.progress;
    }

    // ── Zombie AI ─────────────────────────────────────────────────────────────
    const liveZombies = s.zombies.filter(z => !z.dead);
    const playerVisible = !s.playerOnRun && !s.playerSleeping && !s.playerInBuilding && !s.playerInShelter;
    const _br = getBuildRadius(s.shelterLevel);
    liveZombies.forEach(z => {
      const dToPlayer = playerVisible ? dist(z.x, z.y, s.player.x, s.player.y) : Infinity;
      z.chasing = dToPlayer < ZOMBIE_CHASE_RANGE;

      // Day patroller: approach perimeter, patrol outside build zone
      if (z.dayPatroller && s.phase === "day") {
        const patrolRadius = _br + 80;
        const dToCenter = dist(z.x, z.y, SHELTER.x, SHELTER.y);
        if (dToCenter > patrolRadius + 20) {
          const adx = SHELTER.x - z.x, ady = SHELTER.y - z.y;
          const ad = Math.sqrt(adx*adx + ady*ady);
          z.x += (adx/ad)*ZOMBIE_SPEED*0.6*dt;
          z.y += (ady/ad)*ZOMBIE_SPEED*0.6*dt;
        } else {
          if (!z.patrolAngle) z.patrolAngle = Math.atan2(z.y-SHELTER.y, z.x-SHELTER.x);
          z.patrolAngle += (z.id%2===0?1:-1)*0.4*dt;
          z.x = SHELTER.x + Math.cos(z.patrolAngle)*patrolRadius;
          z.y = SHELTER.y + Math.sin(z.patrolAngle)*patrolRadius;
        }
        return;
      }

      // Normal zombie: chase player or attack structures
      let tx = SHELTER.x, ty = SHELTER.y, targetBuilding = null, targetWall = null;
      if (!z.chasing) {
        let bestD = dist(z.x, z.y, SHELTER.x, SHELTER.y);
        s.buildings.forEach(b => {
          if (!b.built || (b.hp ?? 0) <= 0) return;
          const d = dist(z.x, z.y, b.x, b.y);
          if (d < bestD) { bestD = d; tx = b.x; ty = b.y; targetBuilding = b; targetWall = null; }
        });
        s.walls.forEach(w => {
          if (!w.built || (w.hp ?? 0) <= 0) return;
          const mx = (w.x1+w.x2)/2, my = (w.y1+w.y2)/2;
          const d = dist(z.x, z.y, mx, my);
          if (d < bestD-20) { bestD = d; tx = mx; ty = my; targetWall = w; targetBuilding = null; }
        });
      } else { tx = s.player.x; ty = s.player.y; }

      const dx = tx - z.x, dy = ty - z.y, d = Math.sqrt(dx*dx + dy*dy);
      const stopDist = z.chasing ? (PLAYER_RADIUS+ZOMBIE_RADIUS+2) : ZOMBIE_ATTACK_RANGE;
      if (d > stopDist) {
        z.x += (dx/d)*ZOMBIE_SPEED*dt; z.y += (dy/d)*ZOMBIE_SPEED*dt;
      } else {
        z.attackCd = (z.attackCd??0) - dt;
        if (z.attackCd <= 0) {
          z.attackCd = 1/ZOMBIE_ATTACK_RATE;
          if (z.chasing && playerVisible && s.playerFlash <= 0) {
            s.playerHp = Math.max(0, s.playerHp - ZOMBIE_DAMAGE);
            s.playerFlash = PLAYER_IFRAMES;
            if (s.playerHp <= 0) s.gameOver = true;
          } else if (!z.chasing) {
            if (targetWall) {
              targetWall.hp = Math.max(0, (targetWall.hp??WALL_HP) - BUILDING_DAMAGE*2);
              targetWall.flashTimer = 0.2;
            } else if (targetBuilding) {
              targetBuilding.hp = Math.max(0, (targetBuilding.hp??BUILDING_MAX_HP) - BUILDING_DAMAGE);
              targetBuilding.flashTimer = 0.25;
              if (targetBuilding.hp <= 0) {
                s.survivors.forEach(sv => { if (sv.insideBuilding===targetBuilding.id){sv.insideBuilding=null;sv.fleeing=true;} });
              }
            } else {
              s.shelterHp = Math.max(0, s.shelterHp - ZOMBIE_DAMAGE);
              s.shelterFlash = 0.25;
              if (s.shelterHp <= 0) s.gameOver = true;
            }
          }
        }
      }
    });

    if (s.shelterFlash > 0) s.shelterFlash = Math.max(0, s.shelterFlash - dt);
    if (s.playerFlash  > 0) s.playerFlash  = Math.max(0, s.playerFlash  - dt);
    if (s.playerHp > 0) {
      const pn = s.playerNeeds;
      const lowestNeedPct = Math.min(pn.hunger, pn.thirst, pn.sleep) / NEEDS_MAX;
      const regenCap = lowestNeedPct * PLAYER_MAX_HP;
      if (s.playerHp < regenCap)
        s.playerHp = Math.min(regenCap, s.playerHp + PLAYER_REGEN_RATE * dt);
    }

    // ── Building repair: occupants restore HP while inside ────────────────────
    // Player repairs the shelter when inside it, or a placed building when inside one
    if (!s.playerOnRun && !s.playerSleeping) {
      if (s.playerInShelter && s.shelterHp > 0 && s.shelterHp < SHELTER_TIERS[Math.min((s.shelterLevel||1)-1,SHELTER_TIERS.length-1)].maxHp) {
        s.shelterHp = Math.min(
          SHELTER_TIERS[Math.min((s.shelterLevel||1)-1,SHELTER_TIERS.length-1)].maxHp,
          s.shelterHp + BUILDING_REPAIR_RATE * dt
        );
      }
      if (s.playerInBuilding) {
        const repairB = s.buildings.find(b => b.id === s.playerInBuilding);
        if (repairB && repairB.hp > 0 && repairB.hp < repairB.maxHp) {
          repairB.hp = Math.min(repairB.maxHp, repairB.hp + BUILDING_REPAIR_RATE * dt);
        }
      }
    }
    // Survivors repair buildings they're inside (also counts toward shelter if sv uses it as home)
    s.survivors.forEach(sv => {
      if (sv.onRun || sv.sleeping) return;
      if (sv.insideBuilding) {
        const repairB = s.buildings.find(b => b.id === sv.insideBuilding);
        if (repairB && repairB.hp > 0 && repairB.hp < repairB.maxHp) {
          repairB.hp = Math.min(repairB.maxHp, repairB.hp + BUILDING_REPAIR_RATE * dt);
        }
      }
    });
    s.attackCd = Math.max(0, s.attackCd - dt);
    const currentWeapon = weaponRef.current;
    if (liveZombies.length > 0 && s.attackCd <= 0 && playerVisible) {
      const range = currentWeapon === "bat" ? BAT_RANGE
                  : currentWeapon === "gun" ? GUN_RANGE
                  : currentWeapon === "flamethrower" ? FLAME_RANGE
                  : UNARMED_RANGE;
      let nearest = null, nearestD = Infinity;
      liveZombies.forEach(z => {
        const d = dist(s.player.x, s.player.y, z.x, z.y);
        if (d <= range && d < nearestD) { nearest = z; nearestD = d; }
      });
      if (nearest) {
        const angle = Math.atan2(nearest.y - s.player.y, nearest.x - s.player.x);
        if (currentWeapon === "bat") {
          s.attackCd = 1 / BAT_RATE;
          s.batFlash = { angle, timer: BAT_FLASH_DUR };
          liveZombies.forEach(z => {
            const za = Math.atan2(z.y - s.player.y, z.x - s.player.x);
            const da = Math.abs(((angle - za) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (da < BAT_ARC / 2 && dist(s.player.x, s.player.y, z.x, z.y) <= BAT_RANGE) {
              z.hp -= BAT_DAMAGE; if (z.hp <= 0) z.dead = true;
            }
          });
        } else if (currentWeapon === "gun") {
          s.attackCd = 1 / GUN_RATE;
          s.bullets.push({ id: s.nextBulletId++, x: s.player.x, y: s.player.y,
            vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED,
            life: GUN_RANGE / BULLET_SPEED });
          s.player.facing = angle;
        } else if (currentWeapon === "flamethrower") {
          s.attackCd = 1 / FLAME_RATE;
          s.flameFlash = { angle, timer: FLAME_FLASH_DUR };
          s.player.facing = angle;
          liveZombies.forEach(z => {
            const za = Math.atan2(z.y - s.player.y, z.x - s.player.x);
            const da = Math.abs(((angle - za) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (da < FLAME_ARC / 2 && dist(s.player.x, s.player.y, z.x, z.y) <= FLAME_RANGE) {
              z.hp -= FLAME_DAMAGE; if (z.hp <= 0) z.dead = true;
            }
          });
        } else {
          // Unarmed punch — weak but better than nothing
          s.attackCd = 1 / UNARMED_RATE;
          s.unarmedFlash = { angle, timer: UNARMED_FLASH_DUR };
          liveZombies.forEach(z => {
            const za = Math.atan2(z.y - s.player.y, z.x - s.player.x);
            const da = Math.abs(((angle - za) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (da < UNARMED_ARC / 2 && dist(s.player.x, s.player.y, z.x, z.y) <= UNARMED_RANGE) {
              z.hp -= UNARMED_DAMAGE; if (z.hp <= 0) z.dead = true;
            }
          });
        }
      }
    }
    if (s.batFlash)    { s.batFlash.timer    -= dt; if (s.batFlash.timer    <= 0) s.batFlash    = null; }
    if (s.flameFlash)  { s.flameFlash.timer  -= dt; if (s.flameFlash.timer  <= 0) s.flameFlash  = null; }
    if (s.unarmedFlash){ s.unarmedFlash.timer -= dt; if (s.unarmedFlash.timer <= 0) s.unarmedFlash = null; }

    // ── Bullets ───────────────────────────────────────────────────────────────
    s.bullets = s.bullets.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) return false;
      for (const z of liveZombies) {
        if (z.dead) continue;
        if (dist(b.x, b.y, z.x, z.y) < ZOMBIE_RADIUS + BULLET_RADIUS) {
          const dmg = b.fromGuardPost ? GUARD_POST_DAMAGE : GUN_DAMAGE;
          z.hp -= dmg; if (z.hp <= 0) z.dead = true; return false;
        }
      }
      return true;
    });

    // ── Survivor AI ───────────────────────────────────────────────────────────
    s.survivors.forEach(sv => {
      if (sv.onRun) {
        // Needs tick even on run; auto-consume from gear
        const sn = sv.needs ?? (sv.needs = initNeeds());
        sn.hunger = Math.max(0, sn.hunger - HUNGER_DRAIN * dt);
        sn.thirst = Math.max(0, sn.thirst - THIRST_DRAIN * dt);
        if (sn.hunger < 30 && sv.gear?.food && (s.inventory[sv.gear.food] ?? 0) > 0) {
          const item = CRAFTABLES[sv.gear.food];
          s.inventory[sv.gear.food] = Math.max(0, (s.inventory[sv.gear.food] ?? 0) - 1);
          sn.hunger = Math.min(NEEDS_MAX, sn.hunger + (item?.restoreHunger ?? 50));
        }
        if (sn.thirst < 30 && sv.gear?.water && (s.inventory[sv.gear.water] ?? 0) > 0) {
          const item = CRAFTABLES[sv.gear.water];
          s.inventory[sv.gear.water] = Math.max(0, (s.inventory[sv.gear.water] ?? 0) - 1);
          sn.thirst = Math.min(NEEDS_MAX, sn.thirst + (item?.restoreThirst ?? 60));
        }
        return;
      }
      if (sv.combatCd   === undefined) sv.combatCd   = 0;
      if (sv.insideBuilding === undefined) sv.insideBuilding = null;
      if (sv.fleeing    === undefined) sv.fleeing    = false;
      sv.combatCd = Math.max(0, sv.combatCd - dt);

      // Validate insideBuilding (eject if destroyed)
      if (sv.insideBuilding) {
        const b = s.buildings.find(b => b.id === sv.insideBuilding);
        if (!b || !b.built || (b.hp ?? 0) <= 0) { sv.insideBuilding = null; sv.fleeing = true; }
      }

      // Drain needs
      const sn = sv.needs;
      if (sv.sleeping) {
        sn.sleep  = Math.min(NEEDS_MAX, sn.sleep + SLEEP_RATE * dt);
        sn.hunger = Math.max(0, sn.hunger - HUNGER_DRAIN * 0.2 * dt);
        sn.thirst = Math.max(0, sn.thirst - THIRST_DRAIN * 0.2 * dt);
        if (sn.sleep >= NEEDS_MAX) sv.sleeping = false;
        return;
      } else {
        sn.hunger = Math.max(0, sn.hunger - HUNGER_DRAIN * dt);
        sn.thirst = Math.max(0, sn.thirst - THIRST_DRAIN * dt);
        sn.sleep  = Math.max(0, sn.sleep  - SLEEP_DRAIN  * dt);
      }
      // HP drain from unmet needs
      let svUnmet = 0;
      if (sn.hunger === 0) svUnmet++;
      if (sn.thirst === 0) svUnmet++;
      if (sn.sleep  === 0) svUnmet++;
      if (svUnmet > 0) sv.hp = Math.max(0, sv.hp - NEED_HP_DRAIN_RATE * svUnmet * dt);

      const svHpFrac = sv.hp / sv.maxHp;

      // ── Combat: engage nearby zombies if healthy enough and outside ───────────
      if (!sv.insideBuilding && !sv.fleeing) {
        const nearbyZombie = liveZombies.find(z => !z.dead && dist(sv.x, sv.y, z.x, z.y) < SURVIVOR_COMBAT_RANGE);
        if (nearbyZombie && svHpFrac > SURVIVOR_FLEE_HP_FRAC) {
          sv.casting = false;
          const weapon = sv.gear?.weapon;
          const attackRange = weapon === "bat" ? BAT_RANGE
                            : weapon === "gun" ? GUN_RANGE
                            : weapon === "flamethrower" ? FLAME_RANGE
                            : SURVIVOR_ATTACK_RANGE;
          const dz = dist(sv.x, sv.y, nearbyZombie.x, nearbyZombie.y);
          if (dz > attackRange) {
            const dx = nearbyZombie.x - sv.x, dy = nearbyZombie.y - sv.y;
            const d = Math.sqrt(dx*dx + dy*dy);
            sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt;
          } else if (sv.combatCd <= 0) {
            sv.combatCd = 1 / SURVIVOR_ATTACK_RATE;
            if (weapon === "gun") {
              const angle = Math.atan2(nearbyZombie.y - sv.y, nearbyZombie.x - sv.x);
              s.bullets.push({ id: s.nextBulletId++, x: sv.x, y: sv.y,
                vx: Math.cos(angle)*BULLET_SPEED, vy: Math.sin(angle)*BULLET_SPEED,
                life: GUN_RANGE/BULLET_SPEED, fromSurvivor: true });
            } else if (weapon === "flamethrower") {
              sv.combatCd = 1 / FLAME_RATE;
              const angle = Math.atan2(nearbyZombie.y - sv.y, nearbyZombie.x - sv.x);
              liveZombies.forEach(z => {
                const za = Math.atan2(z.y - sv.y, z.x - sv.x);
                const da = Math.abs(((angle - za) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
                if (da < FLAME_ARC / 2 && dist(sv.x, sv.y, z.x, z.y) <= FLAME_RANGE) {
                  z.hp -= FLAME_DAMAGE; if (z.hp <= 0) z.dead = true;
                }
              });
            } else {
              const dmg = weapon === "bat" ? SURVIVOR_BAT_DAMAGE : SURVIVOR_UNARMED_DMG;
              nearbyZombie.hp -= dmg;
              if (nearbyZombie.hp <= 0) nearbyZombie.dead = true;
            }
          }
          return; // combat is the priority
        }
        // Trigger flee if low HP and zombies near
        if (nearbyZombie && svHpFrac <= SURVIVOR_FLEE_HP_FRAC) {
          sv.fleeing = true; sv.casting = false;
        }
      }

      // ── Flee: run to shelter at speed boost ───────────────────────────────────
      if (sv.fleeing) {
        const dx = SHELTER.x - sv.x, dy = SHELTER.y - sv.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d > 18) {
          sv.x += (dx/d)*SURVIVOR_SPEED*1.4*dt; sv.y += (dy/d)*SURVIVOR_SPEED*1.4*dt;
        } else {
          sv.fleeing = false;
          // Once safe, stop fleeing (no insideBuilding for shelter)
        }
        return;
      }

      // ── Sleep priority ────────────────────────────────────────────────────────
      if (sn.sleep <= SLEEP_TRIGGER) {
        sv.casting = false; sv.castProgress = 0; sv.insideBuilding = null;
        const home = s.buildings.find(b => b.id === sv.homeId && b.built && (b.hp ?? 0) > 0);
        const tx = home ? home.x : SHELTER.x, ty = home ? home.y : SHELTER.y;
        const dx = tx - sv.x, dy = ty - sv.y, d = Math.sqrt(dx*dx + dy*dy);
        if (d > 15) {
          sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt;
        } else {
          sv.sleeping = true;
          if (home) sv.insideBuilding = home.id;
        }
        return;
      }

      // ── Critical needs: interrupt work immediately ────────────────────────────
      const needsHunger = sn.hunger <= HUNGER_CRIT && (s.storage.meals ?? 0) > 0;
      const needsThirst = sn.thirst <= THIRST_CRIT && (s.storage.water ?? 0) >= WATER_PER_DRINK;
      if (needsHunger || needsThirst) {
        // Eject from building if inside working — progress stays on the building
        if (sv.insideBuilding) { sv.insideBuilding = null; sv.casting = false; sv.castProgress = 0; }
        if (needsHunger) {
          const dx = SHELTER.x - sv.x, dy = SHELTER.y - sv.y, d = Math.sqrt(dx*dx + dy*dy);
          if (d > 20) { sv.x += (dx/d)*SURVIVOR_SPEED*1.2*dt; sv.y += (dy/d)*SURVIVOR_SPEED*1.2*dt; }
          else if (s.storage.meals > 0) {
            s.storage.meals = Math.max(0, s.storage.meals - 1);
            sn.hunger = Math.min(NEEDS_MAX, sn.hunger + MEAL_RESTORE);
            forceUpdate(n => n + 1);
          }
          return;
        }
        if (needsThirst) {
          const dx = SHELTER.x - sv.x, dy = SHELTER.y - sv.y, d = Math.sqrt(dx*dx + dy*dy);
          if (d > 20) { sv.x += (dx/d)*SURVIVOR_SPEED*1.2*dt; sv.y += (dy/d)*SURVIVOR_SPEED*1.2*dt; }
          else if (s.storage.water >= WATER_PER_DRINK) {
            s.storage.water = Math.max(0, s.storage.water - WATER_PER_DRINK);
            sn.thirst = Math.min(NEEDS_MAX, sn.thirst + WATER_RESTORE);
            forceUpdate(n => n + 1);
          }
          return;
        }
      }

      // ── Inside a building: do work ────────────────────────────────────────────
      if (sv.insideBuilding) {
        const b = s.buildings.find(b => b.id === sv.insideBuilding);
        if (b && b.built && (b.hp ?? 0) > 0) {
          const behavior = getToolBehavior(sv);
          if (behavior === "guard" && b.type === "guard_post") {
            // Just garrison — firing handled in building tick
            sv.casting = false;
            return;
          }
          if (behavior !== "wander" && behavior !== "guard" && behavior !== "carpenter" && b.type === (behavior === "garden" ? "garden" : "kitchen")) {
            const castTime = behavior === "garden" ? GARDEN_CAST_TIME : KITCHEN_CAST_TIME;
            // Gear speed bonus (gloves for garden, knife for kitchen)
            const svTool = sv.gear?.tool;
            const svGearBonus = (behavior === "garden" && svTool === "gardening_gloves") ||
                                (behavior === "kitchen" && svTool === "chefs_knife") ? 2 : 1;
            const effectiveCastTime = castTime / svGearBonus;
            // Progress stored on building so any survivor (or player) can resume it
            if (b.workCastTime === undefined) b.workCastTime = effectiveCastTime;
            b.workProgress = (b.workProgress ?? 0) + dt;
            // Mirror onto survivor for arc rendering
            sv.casting = true; sv.castTotal = effectiveCastTime; sv.castProgress = b.workProgress;
            if (b.workProgress >= effectiveCastTime) {
              b.workProgress = 0;
              sv.castProgress = 0;
              if (behavior === "garden") {
                if ((s.storage.seeds ?? 0) >= 1) {
                  s.storage.seeds -= 1;
                  s.storage.crops = (s.storage.crops ?? 0) + GARDEN_YIELD;
                } else {
                  b.flashTimer = 0.5;
                }
              } else {
                if ((s.storage.crops ?? 0) >= KITCHEN_CROP_COST) {
                  s.storage.crops -= KITCHEN_CROP_COST;
                  s.storage.meals  = (s.storage.meals ?? 0) + KITCHEN_YIELD;
                } else {
                  b.flashTimer = 0.5;
                }
              }
              forceUpdate(n => n + 1);
            }
          }
          return; // stay inside
        }
        sv.insideBuilding = null; // building gone
      }

      // ── Normal work: wander or move to building and enter it ─────────────────
      const behavior = getToolBehavior(sv);

      // ── CARPENTER: find most damaged building and repair it ───────────────────
      if (behavior === "carpenter") {
        sv.casting = false; sv.castProgress = 0;
        // Find most damaged building (or shelter — but we can't "enter" shelter, so just approach it)
        let worstBuilding = null, worstHpFrac = 1;
        s.buildings.forEach(b => {
          if (!b.built || (b.hp ?? 0) <= 0) return;
          const frac = (b.hp ?? b.maxHp) / (b.maxHp || BUILDING_MAX_HP);
          if (frac < worstHpFrac) { worstHpFrac = frac; worstBuilding = b; }
        });
        if (worstBuilding && worstHpFrac < 1) {
          const def = BUILDING_TYPES[worstBuilding.type];
          const enterDist = def.radius + 2;
          const dTarget = dist(sv.x, sv.y, worstBuilding.x, worstBuilding.y);
          if (dTarget > enterDist) {
            const dx = worstBuilding.x - sv.x, dy = worstBuilding.y - sv.y, d = Math.sqrt(dx*dx+dy*dy);
            sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt;
          } else {
            // Inside — actively repair at boosted rate
            sv.insideBuilding = worstBuilding.id;
            sv.x = worstBuilding.x; sv.y = worstBuilding.y;
            worstBuilding.hp = Math.min(worstBuilding.maxHp, (worstBuilding.hp??0) + CARPENTER_REPAIR_RATE * dt);
          }
        } else {
          // All healed — idle near shelter
          sv.insideBuilding = null;
          const dx = SHELTER.x - sv.x, dy = SHELTER.y - sv.y, d = Math.sqrt(dx*dx+dy*dy);
          if (d > 30) { sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt; }
        }
        return;
      }

      // ── GUARD: find a guard post and garrison it ──────────────────────────────
      if (behavior === "guard") {
        sv.casting = false; sv.castProgress = 0;
        const post = s.buildings.find(b => b.built && (b.hp??0)>0 && b.type==="guard_post" &&
          !s.survivors.some(other => other.id !== sv.id && other.insideBuilding === b.id));
        if (post) {
          const def = BUILDING_TYPES.guard_post;
          const enterDist = def.radius + 2;
          const dPost = dist(sv.x, sv.y, post.x, post.y);
          if (dPost > enterDist) {
            const dx = post.x - sv.x, dy = post.y - sv.y, d = Math.sqrt(dx*dx+dy*dy);
            sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt;
          } else {
            sv.insideBuilding = post.id;
            sv.x = post.x; sv.y = post.y;
          }
        } else {
          // No free post — patrol near shelter
          sv.insideBuilding = null;
          sv.wanderT = (sv.wanderT ?? 0) - dt;
          if (sv.wanderT <= 0) {
            const angle = Math.random() * Math.PI * 2, r = 30 + Math.random() * 40;
            sv.wx = Math.max(20, Math.min(W-20, SHELTER.x + Math.cos(angle)*r));
            sv.wy = Math.max(20, Math.min(H-20, SHELTER.y + Math.sin(angle)*r));
            sv.wanderT = 2 + Math.random() * 3;
          }
          const dx = sv.wx - sv.x, dy = sv.wy - sv.y, d = Math.sqrt(dx*dx+dy*dy);
          if (d > 4) { sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt; }
        }
        return;
      }

      if (behavior === "wander") {
        sv.casting = false; sv.castProgress = 0;
        sv.wanderT = (sv.wanderT ?? 0) - dt;
        if (sv.wanderT <= 0) {
          const home = s.buildings.find(b => b.id === sv.homeId);
          const hx = home ? home.x : W / 2, hy = home ? home.y : H / 2;
          const angle = Math.random() * Math.PI * 2, r = Math.random() * SURVIVOR_WANDER_RADIUS;
          sv.wx = Math.max(20, Math.min(W - 20, hx + Math.cos(angle) * r));
          sv.wy = Math.max(20, Math.min(H - 20, hy + Math.sin(angle) * r));
          sv.wanderT = 2 + Math.random() * 3;
        }
        const dx = sv.wx - sv.x, dy = sv.wy - sv.y, d = Math.sqrt(dx*dx + dy*dy);
        if (d > 4) { sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt; }
        return;
      }

      const targetType = behavior === "garden" ? "garden" : "kitchen";
      const target = nearestBuilding(s, targetType, sv.id);
      if (!target) {
        // No free workstation available — idle/wait near shelter until one opens up
        sv.casting = false; sv.castProgress = 0;
        sv.wanderT = (sv.wanderT ?? 0) - dt;
        if (sv.wanderT <= 0) {
          const angle = Math.random() * Math.PI * 2, r = 20 + Math.random() * 30;
          sv.wx = Math.max(20, Math.min(W - 20, SHELTER.x + Math.cos(angle) * r));
          sv.wy = Math.max(20, Math.min(H - 20, SHELTER.y + Math.sin(angle) * r));
          sv.wanderT = 1.5 + Math.random() * 2;
        }
        const idx = sv.wx - sv.x, idy = sv.wy - sv.y, idd = Math.sqrt(idx*idx + idy*idy);
        if (idd > 4) { sv.x += (idx/idd)*SURVIVOR_SPEED*dt; sv.y += (idy/idd)*SURVIVOR_SPEED*dt; }
        return;
      }

      const enterDist = BUILDING_TYPES[targetType].radius + 2;
      const dTarget = dist(sv.x, sv.y, target.x, target.y);
      if (dTarget > enterDist) {
        sv.casting = false;
        const dx = target.x - sv.x, dy = target.y - sv.y, d = Math.sqrt(dx*dx + dy*dy);
        sv.x += (dx/d)*SURVIVOR_SPEED*dt; sv.y += (dy/d)*SURVIVOR_SPEED*dt;
      } else {
        // Enter building — snap inside
        sv.insideBuilding = target.id;
        sv.x = target.x; sv.y = target.y;
      }
    });
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  function draw(canvas, s, t) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W2  = canvas.width  / dpr;
    const H2  = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = "#0d1a0d"; ctx.fillRect(0, 0, W2, H2);

    // Sky overlay (day/night color)
    const phaseDurs = { day: DAY_DURATION, dusk: DUSK_DURATION, night: NIGHT_DURATION, dawn: DAWN_DURATION };
    const tFrac = s.phaseT / phaseDurs[s.phase];
    let oc = s.phase === "day" ? SKY.day : s.phase === "dusk" ? lerpColor(SKY.day, SKY.night, tFrac)
           : s.phase === "night" ? SKY.night : lerpColor(SKY.night, SKY.day, tFrac);
    if (oc[3] > 0.01) {
      ctx.save(); ctx.globalAlpha = oc[3];
      ctx.fillStyle = `rgb(${Math.round(oc[0])},${Math.round(oc[1])},${Math.round(oc[2])})`;
      ctx.fillRect(0, 0, W2, H2); ctx.restore();
    }

    // Camera transform
    const cam = cameraRef.current;
    const offX = W2/2 - cam.x;
    const offY = H2/2 - cam.y;
    const buildRadius = getBuildRadius(s.shelterLevel);

    ctx.save();
    ctx.translate(offX, offY);

    // ── World border ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = "rgba(255,80,80,0.35)"; ctx.lineWidth = 4;
    ctx.setLineDash([12,8]); ctx.strokeRect(0, 0, WORLD_W, WORLD_H); ctx.setLineDash([]);
    ctx.restore();

    // ── World grid ───────────────────────────────────────────────────────────
    ctx.save(); ctx.globalAlpha = 0.04; ctx.strokeStyle = "#4a7a4a"; ctx.lineWidth = 1;
    const gStep = 40;
    const gx0 = Math.floor(-offX/gStep)*gStep, gy0 = Math.floor(-offY/gStep)*gStep;
    for (let gx = gx0; gx < gx0+W2+gStep; gx+=gStep) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,WORLD_H); ctx.stroke(); }
    for (let gy = gy0; gy < gy0+H2+gStep; gy+=gStep) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(WORLD_W,gy); ctx.stroke(); }
    ctx.restore();

    // ── Build zone ring ───────────────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.beginPath(); ctx.arc(SHELTER.x, SHELTER.y, buildRadius, 0, Math.PI*2);
    ctx.fillStyle = "#44cc66"; ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(SHELTER.x, SHELTER.y, buildRadius, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(80,220,120,0.6)"; ctx.lineWidth = 2;
    ctx.setLineDash([8,6]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    // Build placement overlay (in world space) — brightened build zone ring while placing
    if (selectedBuildingRef.current && selectedBuildingRef.current !== "wall") {
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.beginPath(); ctx.arc(SHELTER.x, SHELTER.y, buildRadius, 0, Math.PI*2);
      ctx.fillStyle = "#44ff88"; ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(SHELTER.x, SHELTER.y, buildRadius, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(80,255,150,0.8)"; ctx.lineWidth = 2;
      ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Shelter ───────────────────────────────────────────────────────────────
    const sx = SHELTER.x - SHELTER.w/2, sy = SHELTER.y - SHELTER.h/2;
    const shpF = s.shelterHp / SHELTER_MAX_HP, flash = s.shelterFlash > 0;
    const shelterTier = SHELTER_TIERS[Math.min((s.shelterLevel||1)-1, SHELTER_TIERS.length-1)];
    ctx.save();
    ctx.globalAlpha=0.25; ctx.fillStyle="#000"; ctx.fillRect(sx+4,sy+4,SHELTER.w,SHELTER.h);
    ctx.globalAlpha=1;
    ctx.fillStyle   = flash?"#6b2a2a":shpF>0.6?"#2a3d2a":shpF>0.3?"#3d3020":"#3d2020";
    ctx.strokeStyle = flash?"#cc4444":shpF>0.6?"#4a6b4a":shpF>0.3?"#6b5a30":"#6b3030";
    ctx.lineWidth=2; ctx.fillRect(sx,sy,SHELTER.w,SHELTER.h); ctx.strokeRect(sx,sy,SHELTER.w,SHELTER.h);
    if (flash){ctx.globalAlpha=(s.shelterFlash/0.25)*0.35;ctx.fillStyle="#ff4444";ctx.fillRect(sx,sy,SHELTER.w,SHELTER.h);ctx.globalAlpha=1;}
    ctx.globalAlpha=0.3;ctx.fillStyle=flash?"#7a4a4a":"#5a7a5a";ctx.fillRect(sx,sy,SHELTER.w,10);
    ctx.globalAlpha=1;ctx.fillStyle="#1a2a1a";ctx.fillRect(SHELTER.x-8,SHELTER.y+SHELTER.h/2-16,16,16);
    ctx.globalAlpha=0.45;ctx.font="10px monospace";ctx.textAlign="center";
    ctx.fillStyle=shpF>0.5?"#8ab88a":"#cc8888";
    ctx.fillText(shelterTier.label,SHELTER.x,SHELTER.y+4);
    const sleepingCount = s.survivors.filter(sv=>sv.sleeping).length + (s.playerSleeping?1:0);
    if (sleepingCount > 0) {
      ctx.globalAlpha=0.6; ctx.font="9px monospace"; ctx.fillStyle="#aaddff";
      ctx.fillText(`💤 ${sleepingCount}`, SHELTER.x, SHELTER.y-SHELTER.h/2-6);
    }
    // Tap hint
    if (!s.playerOnRun) {
      ctx.globalAlpha=0.35; ctx.font="9px monospace";
      ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.textAlign="center";
      ctx.fillText(s.playerInShelter?"inside":"tap to enter", SHELTER.x, SHELTER.y+SHELTER.h/2+18);
    }
    ctx.restore();
    { const bW=SHELTER.w+16,bH=5,bx=SHELTER.x-bW/2,by=sy-14;
      ctx.save();ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(bx,by,bW,bH);
      ctx.fillStyle=shpF>0.6?"#44cc44":shpF>0.3?"#ccaa22":"#cc2222";
      ctx.fillRect(bx,by,bW*shpF,bH);ctx.restore(); }

    // ── Walls ─────────────────────────────────────────────────────────────────
    (s.walls||[]).forEach(w => {
      ctx.save();
      const wHpFrac = Math.max(0,(w.hp??WALL_HP)/WALL_HP);
      const wFlash = (w.flashTimer??0) > 0;
      if (!w.built) {
        // ghost / under construction
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(w.x1,w.y1); ctx.lineTo(w.x2,w.y2);
        ctx.strokeStyle = "#887755"; ctx.lineWidth = WALL_THICKNESS;
        ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.6; ctx.font="8px monospace"; ctx.textAlign="center"; ctx.fillStyle="#aa9966";
        const mx=(w.x1+w.x2)/2, my=(w.y1+w.y2)/2;
        ctx.fillText("building…", mx, my-10);
      } else {
        ctx.globalAlpha = wFlash ? 0.5 : 0.9;
        ctx.beginPath(); ctx.moveTo(w.x1,w.y1); ctx.lineTo(w.x2,w.y2);
        ctx.strokeStyle = wFlash?"#ff6644":wHpFrac>0.6?"#887755":wHpFrac>0.3?"#665533":"#443322";
        ctx.lineWidth = WALL_THICKNESS; ctx.lineCap="square"; ctx.stroke();
        // HP bar at midpoint
        if (wHpFrac < 1) {
          const mx=(w.x1+w.x2)/2, my=(w.y1+w.y2)/2;
          ctx.globalAlpha=0.8; ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(mx-18,my-18,36,4);
          ctx.fillStyle=wHpFrac>0.5?"#88cc44":"#cc4422"; ctx.fillRect(mx-18,my-18,36*wHpFrac,4);
        }
      }
      ctx.restore();
    });

    // ── Buildings ─────────────────────────────────────────────────────────────
    s.buildings.forEach(b => {
      if (b.hp === undefined) b.hp = BUILDING_MAX_HP;
      const def = BUILDING_TYPES[b.type];
      const hpFrac = b.hp / (b.maxHp || BUILDING_MAX_HP);
      const bFlash = (b.flashTimer ?? 0) > 0;
      ctx.save();
      if (!b.built) {
        const prog = (b.buildProgress??0)/b.buildTime;
        const near = !s.playerOnRun && dist(s.player.x,s.player.y,b.x,b.y)<=BUILD_RADIUS;
        ctx.globalAlpha=0.35;
        ctx.beginPath();ctx.arc(b.x,b.y,def.radius,0,Math.PI*2);
        ctx.fillStyle="#1a1a1a";ctx.fill();
        ctx.setLineDash([4,4]);ctx.strokeStyle=def.color;ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
        ctx.globalAlpha=0.25;ctx.font="16px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillStyle=def.color;ctx.fillText(def.icon,b.x,b.y);ctx.textBaseline="alphabetic";
        if (prog>0){ctx.globalAlpha=0.9;ctx.beginPath();
          ctx.arc(b.x,b.y,def.radius+5,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
          ctx.strokeStyle=def.color;ctx.lineWidth=3;ctx.stroke();}
        ctx.globalAlpha=near?0.7:0.4;ctx.font="9px monospace";
        ctx.fillStyle=near?def.color:"rgba(255,255,255,0.4)";ctx.textAlign="center";
        ctx.fillText(near?"building…":"walk here to build",b.x,b.y+def.radius+14);
      } else if (b.hp <= 0) {
        ctx.globalAlpha=0.3;
        ctx.beginPath();ctx.arc(b.x,b.y,def.radius,0,Math.PI*2);
        ctx.fillStyle="#331111";ctx.fill();
        ctx.strokeStyle="#552222";ctx.lineWidth=1;ctx.stroke();
        ctx.globalAlpha=0.25;ctx.font="18px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText("💥",b.x,b.y);ctx.textBaseline="alphabetic";
        ctx.globalAlpha=0.2;ctx.font="8px monospace";ctx.fillStyle="#cc3333";ctx.textAlign="center";
        ctx.fillText("DESTROYED",b.x,b.y+def.radius+13);
      } else {
        const occupants = s.survivors.filter(sv => sv.insideBuilding === b.id && !sv.sleeping).length;
        const sleepers  = s.survivors.filter(sv => sv.insideBuilding === b.id && sv.sleeping).length;
        const playerInside = s.playerInBuilding === b.id;
        const totalInside = occupants + sleepers + (playerInside ? 1 : 0);
        if (b.type==="house"&&b.arrivalTimer>0){
          const prog=1-b.arrivalTimer/SURVIVOR_ARRIVE_TIME;
          ctx.globalAlpha=0.6;ctx.beginPath();
          ctx.arc(b.x,b.y,def.radius+5,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
          ctx.strokeStyle="#aaddff";ctx.lineWidth=2;ctx.stroke();
          ctx.globalAlpha=0.45;ctx.font="9px monospace";ctx.fillStyle="#aaddff";ctx.textAlign="center";
          ctx.fillText("arriving…",b.x,b.y+def.radius+14);}
        if (b.type==="condenser") {
          const drip = (t * 1.2 + b.id * 0.7) % 1;
          ctx.globalAlpha=0.4*drip;ctx.beginPath();
          ctx.arc(b.x, b.y+def.radius+drip*10, 2, 0, Math.PI*2);
          ctx.fillStyle="#44aacc";ctx.fill();}
        // Guard post: show range ring when garrisoned, pulsing fire crosshair
        if (b.type==="guard_post") {
          const garrisoned = totalInside > 0;
          if (garrisoned) {
            ctx.globalAlpha=0.07+0.03*Math.sin(t*2.5);
            ctx.beginPath(); ctx.arc(b.x, b.y, GUARD_POST_RANGE, 0, Math.PI*2);
            ctx.fillStyle="#dd7722"; ctx.fill();
            ctx.globalAlpha=0.3+0.1*Math.sin(t*3);
            ctx.beginPath(); ctx.arc(b.x, b.y, GUARD_POST_RANGE, 0, Math.PI*2);
            ctx.strokeStyle="#ff9944"; ctx.lineWidth=1.5;
            ctx.setLineDash([6,5]); ctx.stroke(); ctx.setLineDash([]);
          } else {
            ctx.globalAlpha=0.12;
            ctx.beginPath(); ctx.arc(b.x, b.y, GUARD_POST_RANGE, 0, Math.PI*2);
            ctx.strokeStyle="#dd7722"; ctx.lineWidth=1;
            ctx.setLineDash([3,8]); ctx.stroke(); ctx.setLineDash([]);
          }
        }
        if (s.playerCraft&&s.playerCraft.stationId===b.id){
          const prog=s.playerCraft.progress/s.playerCraft.castTime;
          const isPaused=!!s.playerCraft.paused;
          const arcColor=isPaused?"#aaaaaa":"#ffdd88";
          ctx.globalAlpha=isPaused?0.45:0.9;ctx.beginPath();
          ctx.arc(b.x,b.y,def.radius+5,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
          if(isPaused){ctx.setLineDash([4,4]);}
          ctx.strokeStyle=arcColor;ctx.lineWidth=3;ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha=isPaused?0.4:0.6;ctx.font="9px monospace";ctx.fillStyle=arcColor;ctx.textAlign="center";
          const item=CRAFTABLES[s.playerCraft.itemId];
          ctx.fillText(isPaused?`paused ${item?.icon??""} ${Math.round(prog*100)}%`:`crafting ${item?.icon??""} ${item?.label??""}…`,b.x,b.y+def.radius+14);}
        if (s.playerWorkCast&&s.playerWorkCast.buildingId===b.id){
          const prog=s.playerWorkCast.progress/s.playerWorkCast.castTime;
          const bonus=s.playerWorkCast.gearBonus>1;
          const isPaused=!!s.playerWorkCast.paused;
          const noSeeds = b.type==="garden"  && (s.storage.seeds??0)<1;
          const noCrops = b.type==="kitchen" && (s.storage.crops??0)<KITCHEN_CROP_COST;
          const blocked = !isPaused && (noSeeds||noCrops);
          // flash between red and dim when blocked
          const flashOn = blocked && Math.floor(t*4)%2===0;
          ctx.globalAlpha=isPaused?0.45:blocked?(flashOn?0.95:0.3):0.9;ctx.beginPath();
          ctx.arc(b.x,b.y,def.radius+5,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
          if(isPaused){ctx.setLineDash([4,4]);}
          ctx.strokeStyle=isPaused?"#aaaaaa":blocked?'#ff3333':bonus?'#aaff88':def.color;ctx.lineWidth=3;ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha=isPaused?0.4:blocked?(flashOn?0.85:0.25):0.55;ctx.font='9px monospace';
          ctx.fillStyle=isPaused?"#aaaaaa":blocked?'#ff5555':bonus?'#aaff88':def.color;ctx.textAlign='center';
          ctx.fillText(isPaused?`paused ${Math.round(prog*100)}%`:blocked?(noSeeds?'NO SEEDS':'NO CROPS'):bonus?'working ⚡2×':'working…',b.x,b.y+def.radius+25);}
        const workingSv = s.survivors.find(sv => sv.insideBuilding === b.id && sv.casting && sv.castProgress > 0);
        if (workingSv) {
          const effectiveCastTime = workingSv.castTotal || 1;
          const prog = Math.min(1, (b.workProgress ?? workingSv.castProgress) / effectiveCastTime);
          ctx.globalAlpha=0.8;ctx.beginPath();
          ctx.arc(b.x,b.y,def.radius+6,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
          const tool = workingSv.gear?.tool;
          ctx.strokeStyle=tool==="gardening_gloves"?"#44aa55":tool==="chefs_knife"?"#cc6633":"#aaddff";
          ctx.lineWidth=2.5;ctx.stroke();
        } else if ((b.workProgress ?? 0) > 0) {
          // Progress saved on building but no survivor currently working — show paused arc
          const savedCastTime = b.workCastTime || (b.type === "garden" ? GARDEN_CAST_TIME : KITCHEN_CAST_TIME);
          const prog = Math.min(1, b.workProgress / savedCastTime);
          ctx.globalAlpha=0.35;ctx.beginPath();
          ctx.arc(b.x,b.y,def.radius+6,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
          ctx.setLineDash([3,4]);
          ctx.strokeStyle=b.type==="garden"?"#44aa55":"#cc6633";
          ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
        }
        ctx.globalAlpha=1;
        ctx.beginPath();ctx.arc(b.x,b.y,def.radius,0,Math.PI*2);
        ctx.fillStyle=bFlash?"#3a1010":(totalInside>0?"#141c14":"#1a1410");
        ctx.fill();
        ctx.strokeStyle=bFlash?"#ff4444":def.color;ctx.lineWidth=bFlash?2.5:2;ctx.stroke();
        if (bFlash){
          ctx.globalAlpha=(b.flashTimer/0.25)*0.4;
          ctx.beginPath();ctx.arc(b.x,b.y,def.radius,0,Math.PI*2);
          ctx.fillStyle="#ff3333";ctx.fill();ctx.globalAlpha=1;}
        ctx.globalAlpha=0.65;ctx.font="16px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillStyle=def.color;ctx.fillText(def.icon,b.x,b.y);ctx.textBaseline="alphabetic";
        ctx.globalAlpha=0.5;ctx.font="9px monospace";ctx.fillStyle=def.color;ctx.textAlign="center";
        ctx.fillText(def.label,b.x,b.y+def.radius+13);
        if (hpFrac < 1) {
          const bW=36,bH=3,bx=b.x-bW/2,by=b.y-def.radius-11;
          ctx.globalAlpha=0.7;ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(bx,by,bW,bH);
          ctx.fillStyle=hpFrac>0.6?"#44cc44":hpFrac>0.3?"#ccaa22":"#cc2222";
          ctx.fillRect(bx,by,bW*hpFrac,bH);}
        if (totalInside > 0) {
          ctx.globalAlpha=0.75;ctx.font="8px monospace";ctx.textAlign="center";ctx.fillStyle="#aaddff";
          const icon = sleepers > 0 ? "💤" : "👤";
          ctx.fillText(`${icon}${totalInside}`,b.x,b.y-def.radius-13);}
        if(!s.playerOnRun&&dist(s.player.x,s.player.y,b.x,b.y)<def.radius+50&&b.type!=="house"){
          ctx.globalAlpha=0.4;ctx.font="9px monospace";
          ctx.fillStyle="rgba(255,255,255,0.4)";ctx.textAlign="center";
          const hint = b.type==="guard_post" ? (s.playerInBuilding===b.id?"tap to leave post":"tap to man post") : "tap to open";
          ctx.fillText(hint,b.x,b.y+def.radius+25);}
      }
      ctx.restore();
    });

    // ── Survivors ─────────────────────────────────────────────────────────────
    s.survivors.forEach(sv => {
      if (sv.onRun) return;
      if (sv.insideBuilding) return;
      ctx.save();
      if (sv.sleeping) {
        ctx.globalAlpha=0.4+0.2*Math.sin(t*2+sv.id); ctx.font="10px sans-serif";
        ctx.textAlign="center"; ctx.fillStyle="#aaddff";
        ctx.fillText("💤", SHELTER.x + (sv.id%3-1)*14, SHELTER.y - 8 - (sv.id%2)*12);
        ctx.restore(); return;
      }
      if (sv.casting && sv.castProgress > 0) {
        const prog = sv.castProgress / sv.castTotal;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, SURVIVOR_RADIUS + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*prog);
        const tool = sv.gear?.tool;
        ctx.strokeStyle = tool==="gardening_gloves"?"#44aa55":tool==="chefs_knife"?"#cc6633":"#aaddff";
        ctx.lineWidth = 2.5; ctx.stroke();
      }
      const sn = sv.needs ?? {};
      if ((sn.hunger??100) <= HUNGER_CRIT || (sn.thirst??100) <= THIRST_CRIT || (sn.sleep??100) <= SLEEP_CRIT) {
        ctx.globalAlpha=0.3+0.2*Math.sin(t*4);
        ctx.beginPath(); ctx.arc(sv.x, sv.y, SURVIVOR_RADIUS+10, 0, Math.PI*2);
        ctx.strokeStyle="#dd8822"; ctx.lineWidth=1.5; ctx.stroke();
      }
      if (sv.fleeing) {
        ctx.globalAlpha=0.5+0.3*Math.sin(t*8);
        ctx.beginPath(); ctx.arc(sv.x, sv.y, SURVIVOR_RADIUS+12, 0, Math.PI*2);
        ctx.strokeStyle="#ff4444"; ctx.lineWidth=1.8; ctx.stroke();
      }
      const pulse = 0.1 + 0.05 * Math.sin(t * 2.2 + sv.id * 1.1);
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(sv.x, sv.y, SURVIVOR_RADIUS+7, 0, Math.PI*2);
      ctx.fillStyle=sv.fleeing?"#ff6622":"#aaddff"; ctx.fill();
      ctx.globalAlpha=1;
      ctx.beginPath(); ctx.arc(sv.x, sv.y, SURVIVOR_RADIUS, 0, Math.PI*2);
      ctx.fillStyle=sv.fleeing?"#772200":"#4488bb"; ctx.fill();
      ctx.strokeStyle=sv.fleeing?"#ff5522":"#88ccff"; ctx.lineWidth=1.2; ctx.stroke();
      const tool = sv.gear?.tool;
      const weapon = sv.gear?.weapon;
      let iconY = sv.y - SURVIVOR_RADIUS - 10;
      if (weapon) { ctx.globalAlpha=0.85; ctx.font="9px sans-serif"; ctx.textAlign="center"; ctx.fillText(CRAFTABLES[weapon]?.icon??"", sv.x, iconY); }
      if (tool)   { ctx.globalAlpha=0.85; ctx.font="9px sans-serif"; ctx.textAlign="center"; ctx.fillText(CRAFTABLES[tool]?.icon??"", sv.x + (weapon ? 8 : 0), iconY); }
      ctx.globalAlpha=0.5; ctx.font="8px monospace"; ctx.textAlign="center";
      ctx.fillStyle="#aaddff"; ctx.fillText(sv.name, sv.x, sv.y-SURVIVOR_RADIUS-3+(tool||weapon?-7:0));
      ctx.restore();
    });

    // ── Bullets ───────────────────────────────────────────────────────────────
    s.bullets.forEach(b => {
      ctx.save();
      ctx.beginPath(); ctx.arc(b.x,b.y,BULLET_RADIUS,0,Math.PI*2);
      ctx.fillStyle=b.fromGuardPost?"#ff9944":b.fromSurvivor?"#88ffaa":"#ffdd88"; ctx.fill();
      ctx.globalAlpha=0.4; ctx.beginPath(); ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x-b.vx*0.04,b.y-b.vy*0.04);
      ctx.strokeStyle=b.fromGuardPost?"#ff6622":b.fromSurvivor?"#44dd66":"#ffcc44"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.restore();
    });

    // ── Zombies ───────────────────────────────────────────────────────────────
    s.zombies.forEach(z => {
      if (z.dead) return;
      ctx.save();
      const isPatroller = z.dayPatroller && s.phase === "day";
      const pulse = 0.08 + 0.06 * Math.sin(t*3.5 + z.id*1.7);
      // Patrollers glow orange, night zombies glow red
      ctx.globalAlpha=isPatroller?pulse*1.5:z.chasing?pulse*2.5:pulse;
      ctx.beginPath(); ctx.arc(z.x,z.y,ZOMBIE_RADIUS+6,0,Math.PI*2);
      ctx.fillStyle=isPatroller?"#cc8800":z.chasing?"#ff6622":"#cc2222"; ctx.fill();
      ctx.globalAlpha=1;
      ctx.beginPath(); ctx.arc(z.x,z.y,ZOMBIE_RADIUS,0,Math.PI*2);
      ctx.fillStyle=isPatroller?"#664400":z.chasing?"#882200":"#661111"; ctx.fill();
      ctx.strokeStyle=isPatroller?"#ffaa22":z.chasing?"#ff4400":"#aa3333"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle="rgba(255,60,60,0.9)";
      ctx.beginPath(); ctx.arc(z.x-2.5,z.y-2,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(z.x+2.5,z.y-2,1.5,0,Math.PI*2); ctx.fill();
      // Patroller indicator
      if (isPatroller) {
        ctx.globalAlpha=0.6; ctx.font="7px monospace"; ctx.textAlign="center"; ctx.fillStyle="#ffaa44";
        ctx.fillText("DAY", z.x, z.y-ZOMBIE_RADIUS-8);
      }
      if (z.hp<z.maxHp){
        const f=Math.max(0,z.hp/z.maxHp);
        ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(z.x-8,z.y-ZOMBIE_RADIUS-7,16,2.5);
        ctx.fillStyle=f>0.5?"#88dd44":"#dd4444"; ctx.fillRect(z.x-8,z.y-ZOMBIE_RADIUS-7,16*f,2.5);}
      ctx.restore();
    });

    // ── Attack flashes ────────────────────────────────────────────────────────
    if (s.batFlash) {
      const prog = 1 - s.batFlash.timer/BAT_FLASH_DUR;
      ctx.save(); ctx.globalAlpha=0.55*(1-prog);
      ctx.beginPath(); ctx.moveTo(s.player.x,s.player.y);
      ctx.arc(s.player.x,s.player.y,BAT_RANGE,s.batFlash.angle-BAT_ARC/2,s.batFlash.angle+BAT_ARC/2);
      ctx.closePath(); ctx.fillStyle="#ffcc44"; ctx.fill(); ctx.restore();
    }
    if (s.unarmedFlash) {
      const prog = 1 - s.unarmedFlash.timer/UNARMED_FLASH_DUR;
      ctx.save(); ctx.globalAlpha=0.5*(1-prog);
      ctx.beginPath(); ctx.moveTo(s.player.x,s.player.y);
      ctx.arc(s.player.x,s.player.y,UNARMED_RANGE,s.unarmedFlash.angle-UNARMED_ARC/2,s.unarmedFlash.angle+UNARMED_ARC/2);
      ctx.closePath(); ctx.fillStyle="#ffddbb"; ctx.fill(); ctx.restore();
    }
    if (s.flameFlash) {
      const prog = 1 - s.flameFlash.timer/FLAME_FLASH_DUR;
      ctx.save();
      // Outer fire cone — orange
      ctx.globalAlpha = 0.65*(1-prog*0.5);
      ctx.beginPath(); ctx.moveTo(s.player.x,s.player.y);
      ctx.arc(s.player.x,s.player.y,FLAME_RANGE,s.flameFlash.angle-FLAME_ARC/2,s.flameFlash.angle+FLAME_ARC/2);
      ctx.closePath();
      const grad = ctx.createRadialGradient(s.player.x,s.player.y,4,s.player.x,s.player.y,FLAME_RANGE);
      grad.addColorStop(0,"#ffffff"); grad.addColorStop(0.15,"#ffee44"); grad.addColorStop(0.5,"#ff6622"); grad.addColorStop(1,"rgba(200,40,0,0)");
      ctx.fillStyle=grad; ctx.fill();
      // Inner heat shimmer
      ctx.globalAlpha = 0.35*(1-prog);
      ctx.beginPath(); ctx.moveTo(s.player.x,s.player.y);
      ctx.arc(s.player.x,s.player.y,FLAME_RANGE*0.55,s.flameFlash.angle-FLAME_ARC*0.4,s.flameFlash.angle+FLAME_ARC*0.4);
      ctx.closePath(); ctx.fillStyle="#ffffff"; ctx.fill();
      ctx.restore();
    }

    // ── Player ────────────────────────────────────────────────────────────────
    if (!s.playerOnRun) {
      const { x: px, y: py, facing } = s.player;
      const isHurt = s.playerFlash > 0;
      ctx.save();
      if (s.playerSleeping) {
        ctx.globalAlpha=0.45+0.15*Math.sin(t*1.5); ctx.font="14px sans-serif";
        ctx.textAlign="center"; ctx.fillStyle="#aaddff";
        ctx.fillText("💤", SHELTER.x, SHELTER.y+22);
        ctx.restore();
      } else if (s.playerInShelter) {
        ctx.globalAlpha=0.5+0.2*Math.sin(t*3);
        ctx.font="8px monospace"; ctx.textAlign="center"; ctx.fillStyle="#88ddff";
        ctx.fillText("YOU",SHELTER.x,SHELTER.y+SHELTER.h/2+14);
        ctx.restore();
      } else if (s.playerInBuilding) {
        const b = s.buildings.find(b => b.id === s.playerInBuilding);
        if (b) {
          const def = BUILDING_TYPES[b.type];
          ctx.globalAlpha=0.5+0.2*Math.sin(t*3);
          ctx.font="8px monospace"; ctx.textAlign="center"; ctx.fillStyle="#88ddff";
          ctx.fillText("YOU",b.x,b.y+def.radius+26);
        }
        ctx.restore();
      } else {
        // Weapon range indicator
        const hasWeapon = !!weaponRef.current;
        const rangeColor = weaponRef.current==="bat"?"#ffcc44":weaponRef.current==="gun"?"#88aaff":"#ffddbb";
        const rangeVal = weaponRef.current==="bat"?BAT_RANGE:weaponRef.current==="gun"?GUN_RANGE:UNARMED_RANGE;
        ctx.globalAlpha=0.06; ctx.beginPath(); ctx.arc(px,py,rangeVal,0,Math.PI*2);
        ctx.strokeStyle=rangeColor; ctx.lineWidth=1; ctx.setLineDash([3,4]); ctx.stroke(); ctx.setLineDash([]);
        if (isHurt){ctx.globalAlpha=0.3+0.25*Math.sin(t*40);ctx.beginPath();ctx.arc(px,py,PLAYER_RADIUS+8,0,Math.PI*2);ctx.fillStyle="#ff3333";ctx.fill();}
        ctx.globalAlpha=isHurt?0.5+0.5*Math.sin(t*40):0.12+0.06*Math.sin(t*2.5);
        ctx.beginPath();ctx.arc(px,py,PLAYER_RADIUS+10,0,Math.PI*2);
        ctx.fillStyle=isHurt?"#ff4444":"#88ccff";ctx.fill();
        ctx.globalAlpha=1;ctx.beginPath();ctx.arc(px,py,PLAYER_RADIUS,0,Math.PI*2);
        ctx.fillStyle=isHurt?"#cc2222":"#3a8aee";ctx.fill();
        ctx.strokeStyle=isHurt?"#ff6666":"#88ccff";ctx.lineWidth=1.5;ctx.stroke();
        ctx.globalAlpha=0.6;ctx.beginPath();
        ctx.moveTo(px+Math.cos(facing)*PLAYER_RADIUS,py+Math.sin(facing)*PLAYER_RADIUS);
        ctx.lineTo(px+Math.cos(facing)*(PLAYER_RADIUS+5),py+Math.sin(facing)*(PLAYER_RADIUS+5));
        ctx.strokeStyle="#aaddff";ctx.lineWidth=2;ctx.stroke();
        if (weaponRef.current){ctx.globalAlpha=0.9;ctx.font="12px sans-serif";ctx.textAlign="center";
          ctx.fillText(weaponRef.current==="bat"?"🏏":"🔫",px,py-PLAYER_RADIUS-6);}
        else {
          ctx.globalAlpha=0.55;ctx.font="10px sans-serif";ctx.textAlign="center";
          ctx.fillText("👊",px,py-PLAYER_RADIUS-6);
        }
        ctx.restore();
      }
    } else {
      ctx.save();
      ctx.globalAlpha=0.35+0.15*Math.sin(t*2);
      ctx.font="8px monospace"; ctx.textAlign="center"; ctx.fillStyle="#ffaa44";
      ctx.fillText("PLAYER OUT", SHELTER.x, SHELTER.y + SHELTER.h/2 + 14);
      ctx.restore();
    }

    // ── Building ghost preview (follows mouse in placement mode) ─────────────
    if (selectedBuildingRef.current && selectedBuildingRef.current !== "wall") {
      const pending = pendingPlacementRef.current;
      const def = BUILDING_TYPES[selectedBuildingRef.current];
      if (def) {
        const drawGhost = (gwx, gwy, isPending) => {
          const inZone    = dist(gwx, gwy, SHELTER.x, SHELTER.y) <= buildRadius;
          const notCenter = dist(gwx, gwy, SHELTER.x, SHELTER.y) >= MIN_BUILDING_SEP;
          const noCollide = !s.buildings.some(b => dist(gwx, gwy, b.x, b.y) < MIN_BUILDING_SEP);
          const affordable = canAfford(s.storage, def.cost);
          const canPlace  = inZone && notCenter && noCollide && affordable;
          const ghostColor = canPlace ? (isPending ? "#44ffaa" : "#44ff88") : "#ff4444";
          const ghostRgb   = canPlace ? (isPending ? "68,255,170" : "68,255,136") : "255,68,68";
          ctx.save();
          if (isPending) {
            ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 6);
            ctx.beginPath(); ctx.arc(gwx, gwy, def.radius + 18, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${ghostRgb},1)`; ctx.fill();
          }
          ctx.globalAlpha = isPending ? 0.28 : 0.18 + 0.06 * Math.sin(t * 4);
          ctx.beginPath(); ctx.arc(gwx, gwy, def.radius + 10, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ghostRgb},1)`; ctx.fill();
          ctx.globalAlpha = isPending ? 0.5 : 0.32;
          ctx.beginPath(); ctx.arc(gwx, gwy, def.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ghostRgb},1)`; ctx.fill();
          ctx.globalAlpha = isPending ? 1 : 0.85;
          ctx.beginPath(); ctx.arc(gwx, gwy, def.radius, 0, Math.PI * 2);
          ctx.strokeStyle = ghostColor; ctx.lineWidth = isPending ? 2.5 : 2;
          ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = canPlace ? 0.9 : 0.45;
          ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = ghostColor; ctx.fillText(def.icon, gwx, gwy);
          ctx.textBaseline = "alphabetic";
          if (!isPending) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath(); ctx.arc(gwx, gwy, MIN_BUILDING_SEP, 0, Math.PI * 2);
            ctx.strokeStyle = ghostColor; ctx.lineWidth = 1;
            ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
            ctx.globalAlpha = 0.8;
            ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
            ctx.fillStyle = ghostColor;
            const label = !affordable ? `need: ${costLabel(def.cost)}` : !inZone ? "out of range" : !notCenter ? "too close to shelter" : !noCollide ? "too close to building" : "tap to preview";
            ctx.fillText(label, gwx, gwy + def.radius + 14);
          } else {
            ctx.globalAlpha = canPlace ? 0.9 : 0.6;
            ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
            ctx.fillStyle = canPlace ? ghostColor : "#ff6666";
            ctx.fillText(canPlace ? "✓ tap ✓ to confirm" : "invalid position", gwx, gwy - def.radius - 8);
          }
          ctx.restore();
        };

        const mouse = mousePosRef.current;
        const cam2  = cameraRef.current;
        const mwx   = mouse.x + cam2.x - W2/2;
        const mwy   = mouse.y + cam2.y - H2/2;

        if (!pending) {
          drawGhost(mwx, mwy, false);
        } else {
          drawGhost(pending.x, pending.y, true);
          if (dist(mwx, mwy, pending.x, pending.y) > 40) {
            ctx.save(); ctx.globalAlpha = 0.3; drawGhost(mwx, mwy, false); ctx.restore();
          }
        }
      }
    }

    // Wall ghost preview (first point set, showing live preview to mouse)
    if (wallPlacing) {
      const mouse = mousePosRef.current;
      const cam2 = cameraRef.current;
      const mwx = mouse.x + cam2.x - W2/2;
      const mwy = mouse.y + cam2.y - H2/2;
      const MAX_LEN = 200;
      const ddx = mwx - wallPlacing.x1, ddy = mwy - wallPlacing.y1;
      const dd = Math.sqrt(ddx*ddx + ddy*ddy);
      const ex = dd > MAX_LEN ? wallPlacing.x1 + (ddx/dd)*MAX_LEN : mwx;
      const ey = dd > MAX_LEN ? wallPlacing.y1 + (ddy/dd)*MAX_LEN : mwy;
      ctx.save();
      // Ghost wall line
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(wallPlacing.x1, wallPlacing.y1); ctx.lineTo(ex, ey);
      ctx.strokeStyle = "#ffcc44"; ctx.lineWidth = WALL_THICKNESS;
      ctx.setLineDash([8, 5]); ctx.lineCap = "square"; ctx.stroke(); ctx.setLineDash([]);
      // Start point dot
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(wallPlacing.x1, wallPlacing.y1, 5, 0, Math.PI*2);
      ctx.fillStyle = "#ffcc44"; ctx.fill();
      // End point dot
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI*2);
      ctx.fillStyle = "#ffee88"; ctx.fill();
      // Length label
      const wallLen = Math.round(Math.min(dd, MAX_LEN));
      ctx.globalAlpha = 0.6; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#ffcc88";
      ctx.fillText(`${wallLen}px — click to place`, (wallPlacing.x1+ex)/2, (wallPlacing.y1+ey)/2 - 10);
      ctx.restore();
    }

    ctx.restore(); // end camera transform

    // ── Minimap (screen-space) ────────────────────────────────────────────────
    const MM_W=120, MM_H=90, MM_X=W2-MM_W-8, MM_Y=8;
    const scaleX=MM_W/WORLD_W, scaleY=MM_H/WORLD_H;
    ctx.save();
    ctx.globalAlpha=0.8; ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(MM_X,MM_Y,MM_W,MM_H);
    ctx.strokeStyle="rgba(100,200,100,0.4)"; ctx.lineWidth=1; ctx.strokeRect(MM_X,MM_Y,MM_W,MM_H);
    // Build zone ring on minimap
    ctx.globalAlpha=0.25;
    ctx.beginPath(); ctx.arc(MM_X+SHELTER.x*scaleX, MM_Y+SHELTER.y*scaleY, buildRadius*scaleX, 0, Math.PI*2);
    ctx.strokeStyle="#44cc66"; ctx.lineWidth=1; ctx.stroke();
    // Shelter dot
    ctx.globalAlpha=0.9; ctx.fillStyle="#4a6b4a";
    ctx.fillRect(MM_X+SHELTER.x*scaleX-3, MM_Y+SHELTER.y*scaleY-2, 6, 4);
    // Buildings
    ctx.globalAlpha=0.7;
    s.buildings.filter(b=>b.built&&(b.hp??0)>0).forEach(b=>{
      ctx.fillStyle=BUILDING_TYPES[b.type]?.color??"#888";
      ctx.fillRect(MM_X+b.x*scaleX-1.5,MM_Y+b.y*scaleY-1.5,3,3);
    });
    // Walls
    ctx.globalAlpha=0.5; ctx.strokeStyle="#887755"; ctx.lineWidth=1.5;
    (s.walls||[]).filter(w=>w.built&&(w.hp??0)>0).forEach(w=>{
      ctx.beginPath(); ctx.moveTo(MM_X+w.x1*scaleX,MM_Y+w.y1*scaleY);
      ctx.lineTo(MM_X+w.x2*scaleX,MM_Y+w.y2*scaleY); ctx.stroke();
    });
    // Zombies
    s.zombies.filter(z=>!z.dead).forEach(z=>{
      ctx.globalAlpha=0.85;
      ctx.fillStyle=(z.dayPatroller&&s.phase==="day")?"#ffaa22":"#cc3333";
      ctx.beginPath(); ctx.arc(MM_X+z.x*scaleX,MM_Y+z.y*scaleY,2,0,Math.PI*2); ctx.fill();
    });
    // Player
    if (!s.playerOnRun) {
      ctx.globalAlpha=1; ctx.fillStyle="#3a8aee";
      ctx.beginPath(); ctx.arc(MM_X+s.player.x*scaleX,MM_Y+s.player.y*scaleY,2.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#88ccff"; ctx.lineWidth=1; ctx.stroke();
    }
    // Camera viewport rect
    ctx.globalAlpha=0.2; ctx.strokeStyle="#ffffff"; ctx.lineWidth=0.8;
    ctx.strokeRect(MM_X+(cam.x-W2/2)*scaleX, MM_Y+(cam.y-H2/2)*scaleY, W2*scaleX, H2*scaleY);
    ctx.restore();

    // ── Player avatar tap zone (bottom-right, screen space) ───────────────────
    { const ax=W2-46, ay=H2-46;
      ctx.save();
      ctx.globalAlpha=0.55;
      ctx.fillStyle="#0d1820";
      ctx.strokeStyle="rgba(120,200,255,0.3)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.roundRect(ax,ay,36,36,8); ctx.fill(); ctx.stroke();
      ctx.font="18px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("🧑",ax+18,ay+18);
      ctx.textBaseline="alphabetic";
      ctx.restore(); }

    // ── HUD ───────────────────────────────────────────────────────────────────
    ctx.save();
    ctx.font="12px monospace"; ctx.textAlign="left";
    ctx.fillStyle="rgba(180,220,180,0.55)"; ctx.fillText(`Day ${s.day}`,14,24);
    const phaseColor={day:"rgba(200,230,200,0.45)",dusk:"rgba(255,160,60,0.7)",
      night:"rgba(120,140,255,0.8)",dawn:"rgba(200,160,255,0.65)"}[s.phase];
    const timeLeft=Math.ceil(phaseDurs[s.phase]-s.phaseT);
    ctx.fillStyle=phaseColor;ctx.textAlign="right";
    ctx.fillText(`${s.phase.toUpperCase()}  ${timeLeft}s`,W2-MM_W-16,24);
    // Row 1: raw materials
    ctx.fillStyle="rgba(180,220,180,0.5)";ctx.font="10px monospace";ctx.textAlign="left";
    ctx.fillText(`🌽${s.storage.crops??0} 🍱${s.storage.meals??0} 💧${Math.floor(s.storage.water??0)} ⛽${s.storage.fuel??0} 🔩${s.storage.scrap??0} 🪵${s.storage.wood??0} 🌾${s.storage.seeds??0}`,14,42);
    // Row 2: crafted inventory (only show items with >0 stock or equipped)
    const inv = s.inventory ?? {};
    const invParts = Object.values(CRAFTABLES).map(c => {
      const inStock = inv[c.id] ?? 0;
      // Count how many are equipped (player + survivors)
      const playerHas = playerGearRef.current?.[c.slot] === c.id ? 1 : 0;
      const survHas = (s.survivors||[]).filter(sv=>sv.gear?.[c.slot]===c.id).length;
      const total = inStock + playerHas + survHas;
      if (total === 0) return null;
      return `${c.icon}${inStock}${(playerHas+survHas)>0?"("+((playerHas+survHas)>0?playerHas+survHas:"")+")":""}`;
    }).filter(Boolean);
    if (invParts.length > 0) {
      ctx.fillStyle="rgba(180,180,140,0.4)";ctx.font="9px monospace";ctx.textAlign="left";
      ctx.fillText(invParts.join(" "),14,57);
    }
    // ── Bottom-left HUD: survivors / HP / needs ─────────────────────────────
    // Layout (bottom up): needs bar row @ H2-14, HP bar @ H2-34, survivors text @ H2-54
    { const bx=14;
      // Survivors line
      ctx.fillStyle="rgba(170,220,255,0.35)";ctx.font="9px monospace";ctx.textAlign="left";
      ctx.fillText(`${s.survivors.filter(sv=>!sv.onRun).length} home · ${s.survivors.filter(sv=>sv.onRun).length} out`,bx,H2-54);
      // HP bar
      const hpBy=H2-38; const bW=90; const hpBH=6;
      const hf=Math.max(0,s.playerHp/PLAYER_MAX_HP);
      ctx.globalAlpha=0.6; ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.roundRect(bx,hpBy,bW,hpBH,3); ctx.fill();
      ctx.globalAlpha=1; ctx.fillStyle=hf>0.5?"#44cc66":hf>0.25?"#ddaa22":"#cc3333";
      ctx.roundRect(bx,hpBy,bW*hf,hpBH,3); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillText(`${Math.ceil(s.playerHp)} / ${PLAYER_MAX_HP} hp`,bx,hpBy-4);
      // Needs bars
      const pn=s.playerNeeds;
      const needDefs=[
        {label:"🍽",v:pn.hunger,color:"#ddaa44"},
        {label:"💧",v:pn.thirst,color:"#44aacc"},
        {label:"😴",v:pn.sleep, color:"#9988dd"},
      ];
      const needsBy=H2-18; const segW=56; const needBH=5;
      needDefs.forEach((nd,i)=>{
        const nx=bx+i*(segW+6);
        const frac=Math.max(0,Math.min(1,nd.v/NEEDS_MAX));
        const col=frac>0.4?nd.color:"#cc3333";
        ctx.beginPath(); ctx.globalAlpha=0.5; ctx.fillStyle="rgba(0,0,0,0.4)"; ctx.roundRect(nx,needsBy,segW,needBH,2); ctx.fill();
        ctx.beginPath(); ctx.globalAlpha=frac<=0.2?0.8+0.2*Math.sin(t*8):0.75;
        ctx.fillStyle=col; ctx.roundRect(nx,needsBy,segW*frac,needBH,2); ctx.fill();
        ctx.globalAlpha=0.5; ctx.font="7px monospace"; ctx.textAlign="left"; ctx.fillStyle="#fff";
        ctx.fillText(nd.label,nx,needsBy-2);
        // Numeric value so player can see it draining
        ctx.globalAlpha=frac<=0.2?0.9:0.45; ctx.font="7px monospace"; ctx.textAlign="right";
        ctx.fillStyle=col; ctx.fillText(`${Math.floor(nd.v)}`,nx+segW,needsBy-2);
      });
      ctx.globalAlpha=1;
    }
    // Wall placement hint
    if (wallPlacing) {
      ctx.globalAlpha=0.9; ctx.fillStyle="#ffcc66"; ctx.font="11px monospace"; ctx.textAlign="center";
      ctx.fillText("🧱 Tap 2nd point to complete wall (or ESC to cancel)", W2/2, H2-60);
    } else if (selectedBuildingRef.current === "wall") {
      ctx.globalAlpha=0.9; ctx.fillStyle="#aa9966"; ctx.font="11px monospace"; ctx.textAlign="center";
      ctx.fillText("🧱 Tap inside build zone for 1st wall point", W2/2, H2-60);
    }
    // Day zombie warning
    const dayPatrollers = s.zombies.filter(z=>!z.dead && z.dayPatroller && s.phase==="day");
    if (dayPatrollers.length > 0 && Math.sin(t*3)>0) {
      ctx.globalAlpha=0.85; ctx.fillStyle="#ffaa22"; ctx.font="10px monospace"; ctx.textAlign="center";
      ctx.fillText(`⚠ ${dayPatrollers.length} zombie${dayPatrollers.length!==1?"s":""} patrolling — deal with them before night!`, W2/2, H2-50);
    } else {
      const pnw = s.playerNeeds;
      const unmetWarnings = [];
      if (pnw.hunger===0) unmetWarnings.push("starving");
      if (pnw.thirst===0) unmetWarnings.push("dehydrated");
      if (pnw.sleep===0)  unmetWarnings.push("exhausted");
      if (unmetWarnings.length>0 && Math.sin(t*5)>0) {
        ctx.globalAlpha=0.9; ctx.fillStyle="#ff3333"; ctx.font="10px monospace"; ctx.textAlign="center";
        ctx.fillText(`⚠ ${unmetWarnings.join(" · ")} — losing HP×${unmetWarnings.length}`, W2/2, H2-50);
      } else {
        if(s.phase==="dusk"&&Math.sin(t*6)>0){ctx.globalAlpha=0.75;ctx.fillStyle="#ff6622";ctx.font="13px monospace";ctx.textAlign="center";ctx.fillText("NIGHT INCOMING",W2/2,H2-50);}
        if(s.phase==="night"){ctx.globalAlpha=0.35;ctx.fillStyle="#ff4444";ctx.font="11px monospace";ctx.textAlign="center";ctx.fillText(`${s.zombies.filter(z=>!z.dead).length} zombies`,W2/2,H2-50);}
      }
    }
    ctx.restore();

    const joy=joystickRef.current;
    if(joy.active){ctx.save();
      ctx.globalAlpha=0.18;ctx.beginPath();ctx.arc(joy.ox,joy.oy,44,0,Math.PI*2);ctx.fillStyle="#88ccff";ctx.fill();
      ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(joy.ox,joy.oy,44,0,Math.PI*2);ctx.strokeStyle="#88ccff";ctx.lineWidth=1.5;ctx.stroke();
      ctx.globalAlpha=0.55;ctx.beginPath();ctx.arc(joy.ox+joy.dx*28,joy.oy+joy.dy*28,18,0,Math.PI*2);ctx.fillStyle="#aaddff";ctx.fill();
      ctx.restore();}



    // ── Autosave toast ────────────────────────────────────────────────────────
    const asf = autosaveFlashRef.current;
    if (asf > 0) {
      const fade = asf > 2.5 ? 1 : asf / 2.5; // fade out in last 2.5s
      ctx.save();
      ctx.globalAlpha = fade * 0.88;
      const tw = 148, th = 28, tx = W2/2 - tw/2, ty = H2 - 58;
      ctx.fillStyle = "rgba(10,28,18,0.92)";
      ctx.strokeStyle = "rgba(68,220,120,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#66ffaa";
      ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`💾  autosaved · day ${s.day}`, W2/2, ty + th/2);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }
  }


  // ── Loop ──────────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!lastRef.current) lastRef.current = ts;
    const dt = Math.min((ts - lastRef.current)/1000, 0.05);
    lastRef.current = ts;
    const s=stateRef.current, canvas=canvasRef.current;
    if (!canvas||!s){rafRef.current=requestAnimationFrame(loop);return;}
    if (!s.gameOver) tick(s, dt);
    // Autosave at each new dawn
    if (s._pendingAutosave) {
  s._pendingAutosave = false;
  autosaveFlashRef.current = 3.5; // show toast immediately (no stall)
  const stateCopy = JSON.parse(JSON.stringify(s)); // still on main thread but...
  const gearCopy  = playerGearRef.current;
  const runsCopy  = JSON.parse(JSON.stringify(activeRunsRef.current ?? []));
  const day       = s.day;
  setTimeout(() => {                               // ...write + setState deferred
    try {
      const snapshot = { state: stateCopy, playerGear: gearCopy, activeRuns: runsCopy, savedAt: Date.now(), day, phase: stateCopy.phase };
      const existing = JSON.parse(localStorage.getItem("zbSaveSlots") || "{}");
      existing["autosave"] = snapshot;
      localStorage.setItem("zbSaveSlots", JSON.stringify(existing));
      setSaveSlots(existing);
    } catch(_) {}
  }, 0);
}
    if (autosaveFlashRef.current > 0) autosaveFlashRef.current = Math.max(0, autosaveFlashRef.current - dt);
    draw(canvas, s, ts/1000);
    // Throttle React re-renders to ~6-7fps so needs bars (and other HUD) stay live
    uiUpdateAccumRef.current += dt;
    if (uiUpdateAccumRef.current >= 0.15) {
      uiUpdateAccumRef.current = 0;
      forceUpdate(n => n + 1);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Canvas click ──────────────────────────────────────────────────────────
  function handleCanvasClick(e) {
    const s = stateRef.current;
    if (!s||s.gameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const W2 = canvasRef.current.width/(window.devicePixelRatio||1);
    const H2 = canvasRef.current.height/(window.devicePixelRatio||1);

    // Screen-space UI elements first
    if (cx >= W2-50 && cy >= H2-50) {
      setPlayerGearOpen(v => !v);
      setActivePanel(null); setSurvivorPanel(null); setShelterOpen(false);
      return;
    }

    // Convert screen click to world coordinates
    const cam = cameraRef.current;
    const wx = cx + cam.x - W2/2;
    const wy = cy + cam.y - H2/2;
    const buildRadius = getBuildRadius(s.shelterLevel);

    // Shelter click (world coords) — just opens the panel; entry is automatic by proximity
    if (wx >= SHELTER.x-SHELTER.w/2-10 && wx <= SHELTER.x+SHELTER.w/2+10 &&
        wy >= SHELTER.y-SHELTER.h/2-10 && wy <= SHELTER.y+SHELTER.h/2+10) {
      setShelterOpen(v => !v);
      setActivePanel(null); setPlayerGearOpen(false); setSurvivorPanel(null);
      return;
    }

    // Wall placement (two-click system)
    if (selectedBuildingRef.current === "wall") {
      if (dist(wx, wy, SHELTER.x, SHELTER.y) > buildRadius) return;
      const wallCost = BUILDING_TYPES.wall.cost;
      if (!wallPlacing) {
        // First click — check can afford before committing
        if (!canAfford(s.storage, wallCost)) return; // can't afford
        setWallPlacing({ x1: wx, y1: wy });
        wallPlacingRef.current = { x1: wx, y1: wy };
      } else {
        const { x1, y1 } = wallPlacing;
        const MAX_LEN = 200;
        const dx = wx-x1, dy = wy-y1, d = Math.sqrt(dx*dx+dy*dy);
        const x2 = d > MAX_LEN ? x1 + (dx/d)*MAX_LEN : wx;
        const y2 = d > MAX_LEN ? y1 + (dy/d)*MAX_LEN : wy;
        spendResources(s.storage, wallCost);
        s.walls.push({ id: s.nextWallId++, x1, y1, x2, y2,
          built: false, buildProgress: 0, buildTime: WALL_BUILD_TIME,
          hp: WALL_HP, maxHp: WALL_HP, flashTimer: 0 });
        setWallPlacing(null);
        wallPlacingRef.current = null;
        setSelectedBuilding(null);
        forceUpdate(n=>n+1);
      }
      return;
    }

    if (!selectedBuildingRef.current) {
      // Cancel any pending placement on tap-away
      if (pendingPlacementRef.current) {
        setPendingPlacement(null);
        pendingPlacementRef.current = null;
        return;
      }
      for (const b of s.buildings) {
        if (!b.built) continue;
        const def = BUILDING_TYPES[b.type];
        if (dist(wx,wy,b.x,b.y)<def.radius+14) {
          if (b.type === "guard_post") {
            if (s.playerInBuilding === b.id) {
              s.playerInBuilding = null;
            } else {
              s.player.x = b.x; s.player.y = b.y;
              s.playerInBuilding = b.id;
            }
            setActivePanel(null); setPlayerGearOpen(false); setSurvivorPanel(null); setShelterOpen(false);
            forceUpdate(n=>n+1);
            return;
          }
          if (b.type!=="house") {
            setActivePanel(prev => prev?.id===b.id ? null : { type:b.type, id:b.id });
            setPlayerGearOpen(false); setSurvivorPanel(null); setShelterOpen(false);
            return;
          }
        }
      }
      setActivePanel(null); return;
    }

    setActivePanel(null);
    if (dist(wx, wy, SHELTER.x, SHELTER.y) > buildRadius) return;
    if (dist(wx,wy,SHELTER.x,SHELTER.y)<MIN_BUILDING_SEP) return;
    if (s.buildings.some(b=>dist(wx,wy,b.x,b.y)<MIN_BUILDING_SEP)) return;
    const def = BUILDING_TYPES[selectedBuildingRef.current];
    if (!canAfford(s.storage, def.cost)) return;

    // Tap sets/moves the ghost preview — confirm button actually places it
    const placement = { x: wx, y: wy, type: selectedBuildingRef.current };
    setPendingPlacement(placement);
    pendingPlacementRef.current = placement;
  }

  function confirmPlacement() {
    const s = stateRef.current; if (!s) return;
    const p = pendingPlacementRef.current; if (!p) return;
    const def = BUILDING_TYPES[p.type];
    if (!canAfford(s.storage, def.cost)) { setPendingPlacement(null); pendingPlacementRef.current = null; return; }
    spendResources(s.storage, def.cost);
    s.buildings.push({ id:s.nextBuildingId++, type:p.type,
      x:p.x, y:p.y, built:false, buildProgress:0, buildTime:def.buildTime,
      hp:BUILDING_MAX_HP, maxHp:BUILDING_MAX_HP, flashTimer:0 });
    setPendingPlacement(null);
    pendingPlacementRef.current = null;
    setSelectedBuilding(null);
    forceUpdate(n=>n+1);
  }

  function cancelPlacement() {
    setPendingPlacement(null);
    pendingPlacementRef.current = null;
    setSelectedBuilding(null);
    setWallPlacing(null);
    wallPlacingRef.current = null;
  }

  // equip/unequip: consumes from inventory when equipping, returns to inventory when unequipping
  function equipSurvivor(svId, itemId) {
    const s = stateRef.current; if (!s) return;
    const sv = s.survivors.find(sv=>sv.id===svId); if (!sv) return;
    const item = CRAFTABLES[itemId];
    if (!item) return;
    const currentlyEquipped = sv.gear[item.slot];
    if (currentlyEquipped === itemId) {
      // Unequip → return to inventory
      sv.gear[item.slot] = null;
      s.inventory[itemId] = (s.inventory[itemId] ?? 0) + 1;
    } else {
      // Check inventory
      if ((s.inventory[itemId] ?? 0) < 1) return; // none available
      // Unequip whatever was in the slot first → return it
      if (currentlyEquipped) {
        s.inventory[currentlyEquipped] = (s.inventory[currentlyEquipped] ?? 0) + 1;
      }
      sv.gear[item.slot] = itemId;
      s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1);
    }
    sv.casting=false; sv.castProgress=0;
    forceUpdate(n=>n+1);
  }

  // ── Player actions (eat / drink / sleep) ──────────────────────────────────
  function playerEat() {
    const s = stateRef.current; if (!s) return;
    if ((s.storage.meals ?? 0) < 1) return;
    s.storage.meals = Math.max(0, s.storage.meals - 1);
    s.playerNeeds.hunger = Math.min(NEEDS_MAX, s.playerNeeds.hunger + MEAL_RESTORE);
    forceUpdate(n => n + 1);
  }
  function playerEatCrop() {
    const s = stateRef.current; if (!s) return;
    if ((s.storage.crops ?? 0) < 1) return;
    s.storage.crops = Math.max(0, s.storage.crops - 1);
    s.playerNeeds.hunger = Math.min(NEEDS_MAX, s.playerNeeds.hunger + CROP_RESTORE);
    forceUpdate(n => n + 1);
  }
  function playerDrink() {
    const s = stateRef.current; if (!s) return;
    if ((s.storage.water ?? 0) < WATER_PER_DRINK) return;
    s.storage.water = Math.max(0, s.storage.water - WATER_PER_DRINK);
    s.playerNeeds.thirst = Math.min(NEEDS_MAX, s.playerNeeds.thirst + WATER_RESTORE);
    forceUpdate(n => n + 1);
  }
  function playerSleep() {
    const s = stateRef.current; if (!s) return;
    s.playerSleeping = true;
    setShelterOpen(false);
    forceUpdate(n => n + 1);
  }
  function playerWake() {
    const s = stateRef.current; if (!s) return;
    s.playerSleeping = false;
    forceUpdate(n => n + 1);
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  const MAX_SAVE_SLOTS = 5;

  // Rebuild in-flight runs from a snapshot and free any stranded party members.
  // - startTime is recomputed from saved elapsed so the run resumes its remaining
  //   time (the game doesn't advance while closed, so we don't burn real time).
  // - Any survivor/player flagged onRun but NOT in a restored run is freed. This
  //   repairs the legacy stuck-forever bug AND old saves that never stored runs.
  function restoreRuns(s, snap) {
    const now = Date.now();
    const restored = (snap.activeRuns ?? []).map(ar => ({
      ...ar,
      startTime: now - (ar.elapsed ?? 0) * 1000,
    }));
    const runningIds = new Set(restored.flatMap(ar => ar.partyIds ?? []));
    const playerStillOut = restored.some(ar => ar.includesPlayer);
    if (s.survivors) s.survivors.forEach(sv => { if (sv.onRun && !runningIds.has(sv.id)) sv.onRun = false; });
    if (s.playerOnRun && !playerStillOut) s.playerOnRun = false;
    return restored;
  }

  function saveGame(slotKey) {
    const s = stateRef.current; if (!s) return;
    const snapshot = {
      state: JSON.parse(JSON.stringify(s)),
      playerGear: playerGearRef.current,
      activeRuns: JSON.parse(JSON.stringify(activeRunsRef.current ?? [])),
      savedAt: Date.now(),
      day: s.day,
      phase: s.phase,
    };
    const next = { ...saveSlots, [slotKey]: snapshot };
    localStorage.setItem("zbSaveSlots", JSON.stringify(next));
    setSaveSlots(next);
  }

  function loadGame(slotKey) {
    const snap = saveSlots[slotKey]; if (!snap) return;
    const s = snap.state;
    _namePool = [...SURVIVOR_NAMES];
    lastRef.current = null;
    stateRef.current = s;
    const gear = snap.playerGear ?? { weapon: null, tool: null, armor: null };
    setPlayerGear(gear);
    weaponRef.current = gear.weapon;
    setSelectedBuilding(null); setCraftingQueue(null); setActivePanel(null);
    setSurvivorPanel(null); setPlayerGearOpen(false); setShelterOpen(false);
    const restoredRuns = restoreRuns(s, snap);
    setActiveRun(restoredRuns.find(ar => ar.includesPlayer) ?? null);
    setActiveRuns(restoredRuns);
    setRunResult(null); setRunModal(null);
    playerOnRunRef.current = s.playerOnRun ?? false;
    forceUpdate(n => n + 1);
    setSaveModal(false);
  }

  function deleteSlot(slotKey) {
    const next = { ...saveSlots };
    delete next[slotKey];
    localStorage.setItem("zbSaveSlots", JSON.stringify(next));
    setSaveSlots(next);
  }

  // ── Run system ────────────────────────────────────────────────────────────
  // activeRuns = array of { id, run, startTime, elapsed, focus, partyIds, includesPlayer, gearBonus }
  // Mirror activeRuns into a ref so save paths (especially the autosave inside the RAF loop)
  // always persist the current in-flight runs rather than a stale closure value.
  useEffect(()=>{ activeRunsRef.current = activeRuns; },[activeRuns]);
  useEffect(()=>{
    if (activeRuns.length === 0) return;
    const interval = setInterval(()=>{
      setActiveRuns(prev => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        const completed = [];
        const remaining = prev.map(ar => {
          const elapsed = (now - ar.startTime) / 1000;
          if (elapsed >= ar.run.duration) { completed.push({ ...ar, elapsed }); return null; }
          return { ...ar, elapsed };
        }).filter(Boolean);

        completed.forEach(ar => {
          const run = ar.run;
          const effectiveChance = Math.min(0.98, run.successChance + (ar.gearBonus ?? 0));
          const success = Math.random() <= effectiveChance;
          const s = stateRef.current;
          if (success) {
            const loot = {};
            RUN_LOOT_TYPES.forEach(lt=>{
              const [min,max]=run.baseLoot[lt.id];
              let qty = Math.floor(Math.random()*(max-min+1))+min;
              if (ar.focus.includes(lt.id)) qty = Math.round(qty*(1+run.focusBonus));
              // Bonus loot for larger parties
              if (ar.partyIds.length > 1) qty = Math.round(qty * (1 + (ar.partyIds.length - 1) * 0.3));
              loot[lt.id]=qty;
            });
            if (s) {
              Object.entries(loot).forEach(([k,v])=>{ s.storage[k]=(s.storage[k]??0)+v; });
            }
            // Return party members
            if (s && ar.includesPlayer) { s.playerOnRun = false; playerOnRunRef.current = false; }
            if (s) ar.partyIds.forEach(id => { const sv = s.survivors.find(sv=>sv.id===id); if(sv) sv.onRun=false; });
            setRunResult(r => {
              const next = { loot, run, success:true, partyIds: ar.partyIds, includesPlayer: ar.includesPlayer, gearBonus: ar.gearBonus };
              return r ? { ...r, queue: [...(r.queue??[]), next] } : next;
            });
          } else {
            if (s && ar.includesPlayer) { s.playerOnRun = false; playerOnRunRef.current = false; }
            if (s) ar.partyIds.forEach(id => { const sv = s.survivors.find(sv=>sv.id===id); if(sv) sv.onRun=false; });
            setRunResult(r => {
              const next = { loot:null, run, success:false, partyIds: ar.partyIds, includesPlayer: ar.includesPlayer, gearBonus: ar.gearBonus };
              return r ? { ...r, queue: [...(r.queue??[]), next] } : next;
            });
          }
        });

        // Keep activeRun in sync (player's run, if any)
        const playerRun = remaining.find(ar => ar.includesPlayer) ?? null;
        setActiveRun(playerRun);
        return remaining;
      });
    }, 250);
    return ()=>clearInterval(interval);
  },[activeRuns.length]);

  // runParty: set of survivor ids + bool for player inclusion
  const [runParty, setRunParty] = useState({ survivorIds: [], includesPlayer: true });

  function toggleRunPartyMember(svId) {
    setRunParty(prev => ({
      ...prev,
      survivorIds: prev.survivorIds.includes(svId)
        ? prev.survivorIds.filter(id => id !== svId)
        : [...prev.survivorIds, svId],
    }));
  }
  function toggleRunPartyPlayer() {
    setRunParty(prev => ({ ...prev, includesPlayer: !prev.includesPlayer }));
  }

  function startRun(run) {
    const s = stateRef.current; if (!s) return;
    const partyIds = runParty.survivorIds.filter(id => {
      const sv = s.survivors.find(sv => sv.id === id);
      return sv && !sv.onRun && needsReady(sv.needs);
    });
    const includesPlayer = runParty.includesPlayer && !s.playerOnRun && needsReady(s.playerNeeds);
    if (!includesPlayer && partyIds.length === 0) return; // nobody eligible to send

    // Mark everyone as on run
    if (includesPlayer) { s.playerOnRun = true; playerOnRunRef.current = true; }
    partyIds.forEach(id => { const sv = s.survivors.find(sv=>sv.id===id); if(sv) sv.onRun=true; });

    // Collect all gear for bonus calc
    const gearList = [];
    if (includesPlayer) gearList.push(playerGearRef.current);
    partyIds.forEach(id => { const sv = s.survivors.find(sv=>sv.id===id); if(sv) gearList.push(sv.gear); });
    const gearBonus = calcRunGearBonus(gearList);

    const newRun = { id: Date.now(), run, startTime: Date.now(), elapsed:0,
      focus: runFocus, focusBonus: run.focusBonus,
      partyIds, includesPlayer, gearBonus };
    setActiveRuns(prev => [...prev, newRun]);
    if (includesPlayer) setActiveRun(newRun);
    setRunModal(null);
    setRunParty({ survivorIds: [], includesPlayer: true });
  }

  function toggleFocus(id) {
    setRunFocus(prev=> prev.includes(id) ? prev.filter(x=>x!==id) : prev.length<2 ? [...prev,id] : [prev[1],id]);
  }

  // ── Landscape / fullscreen lock ───────────────────────────────────────────
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Inject viewport + fullscreen meta overrides once
    const existing = document.getElementById("__zb_meta");
    if (!existing) {
      const meta = document.createElement("meta");
      meta.id = "__zb_meta";
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
      document.head.appendChild(meta);
    }

    const checkOrientation = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      setIsPortrait(portrait);
    };
    checkOrientation();
    window.addEventListener("orientationchange", checkOrientation);
    window.addEventListener("resize", checkOrientation);

    // Request landscape lock via Screen Orientation API (supported on Android Chrome)
    const tryLock = async () => {
      try {
        if (screen?.orientation?.lock) {
          await screen.orientation.lock("landscape");
        }
      } catch (_) {
        // Not supported or denied — we show the rotate overlay instead
      }
    };
    // Only try locking when user interacts (Safari/Chrome policy requirement)
    const onFirstTouch = () => { tryLock(); document.removeEventListener("touchstart", onFirstTouch); };
    document.addEventListener("touchstart", onFirstTouch, { once: true });

    return () => {
      window.removeEventListener("orientationchange", checkOrientation);
      window.removeEventListener("resize", checkOrientation);
      try { screen?.orientation?.unlock?.(); } catch (_) {}
    };
  }, []);

  // ── Setup ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current; if (!canvas) return;
    if (gameScreen !== "playing") return; // don't start loop until game is active
    const resize=()=>{const dpr=window.devicePixelRatio||1;const w=canvas.offsetWidth;const h=canvas.offsetHeight;if(w>0&&h>0&&(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr))){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}};
    resize();
    const ro=new ResizeObserver(()=>resize());
    ro.observe(canvas);
    window.addEventListener("resize",resize);
    if (!stateRef.current) stateRef.current=initState(); rafRef.current=requestAnimationFrame(loop);
    const onDown=e=>{
      keysRef.current[e.key]=true;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
      if((e.key==="r"||e.key==="R")&&stateRef.current?.gameOver){ handleRestart(); }
      if(e.key==="Escape"){setSelectedBuilding(null);setActivePanel(null);setSurvivorPanel(null);setPlayerGearOpen(false);setCraftingQueue(null);setShelterOpen(false);setPendingPlacement(null);pendingPlacementRef.current=null;}
    };
    const onUp=e=>{keysRef.current[e.key]=false;};
    window.addEventListener("keydown",onDown); window.addEventListener("keyup",onUp);
    const onTouchStart=e=>{const joy=joystickRef.current;if(joy.active)return;const touch=e.changedTouches[0];const rect=canvas.getBoundingClientRect();joy.active=true;joy.id=touch.identifier;joy.ox=touch.clientX-rect.left;joy.oy=touch.clientY-rect.top;joy.dx=0;joy.dy=0;};
    const onTouchMove=e=>{e.preventDefault();const joy=joystickRef.current;for(const touch of e.changedTouches){if(touch.identifier!==joy.id)continue;const rect=canvas.getBoundingClientRect();const rx=touch.clientX-rect.left-joy.ox,ry=touch.clientY-rect.top-joy.oy,d=Math.sqrt(rx*rx+ry*ry);joy.dx=d<8?0:rx/d;joy.dy=d<8?0:ry/d;}};
    const onTouchEnd=e=>{const joy=joystickRef.current;for(const touch of e.changedTouches)if(touch.identifier===joy.id){joy.active=false;joy.dx=0;joy.dy=0;}};
    canvas.addEventListener("touchstart",onTouchStart,{passive:true});
    canvas.addEventListener("touchmove",onTouchMove,{passive:false});
    canvas.addEventListener("touchend",onTouchEnd,{passive:true});
    canvas.addEventListener("touchcancel",onTouchEnd,{passive:true});
    const onMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMouseMove);
    return()=>{cancelAnimationFrame(rafRef.current);ro.disconnect();window.removeEventListener("resize",resize);window.removeEventListener("keydown",onDown);window.removeEventListener("keyup",onUp);canvas.removeEventListener("touchstart",onTouchStart);canvas.removeEventListener("touchmove",onTouchMove);canvas.removeEventListener("touchend",onTouchEnd);canvas.removeEventListener("touchcancel",onTouchEnd);canvas.removeEventListener("mousemove",onMouseMove);};
  },[gameScreen]);

  function handleRestart() {
    lastRef.current = null; stateRef.current = initState();
    setPlayerGear({ weapon: null, tool: null, armor: null });
    setSelectedBuilding(null); setCraftingQueue(null); setActivePanel(null);
    setSurvivorPanel(null); setPlayerGearOpen(false); setShelterOpen(false);
    setActiveRun(null); setActiveRuns([]); setRunResult(null); setRunModal(null);
    playerOnRunRef.current = false; forceUpdate(n => n + 1);
  }

  function startNewGame() {
    lastRef.current = null;
    stateRef.current = initState();
    setPlayerGear({ weapon: null, tool: null, armor: null });
    setSelectedBuilding(null); setCraftingQueue(null); setActivePanel(null);
    setSurvivorPanel(null); setPlayerGearOpen(false); setShelterOpen(false);
    setActiveRun(null); setActiveRuns([]); setRunResult(null); setRunModal(null);
    playerOnRunRef.current = false;
    setGameScreen("playing");
    setMenuTab("main");
  }

  function loadGameFromMenu(slotKey) {
    const snap = saveSlots[slotKey]; if (!snap) return;
    const s = snap.state;
    _namePool = [...SURVIVOR_NAMES];
    lastRef.current = null;
    stateRef.current = s;
    const gear = snap.playerGear ?? { weapon: null, tool: null, armor: null };
    setPlayerGear(gear);
    weaponRef.current = gear.weapon;
    setSelectedBuilding(null); setCraftingQueue(null); setActivePanel(null);
    setSurvivorPanel(null); setPlayerGearOpen(false); setShelterOpen(false);
    const restoredRuns = restoreRuns(s, snap);
    setActiveRun(restoredRuns.find(ar => ar.includesPlayer) ?? null);
    setActiveRuns(restoredRuns);
    setRunResult(null); setRunModal(null);
    playerOnRunRef.current = s.playerOnRun ?? false;
    forceUpdate(n => n + 1);
    setGameScreen("playing");
    setMenuTab("main");
  }

  const s        = stateRef.current;
  const canBuild = !s?.gameOver;
  const survivors= s?.survivors ?? [];
  const pNeeds   = s?.playerNeeds ?? initNeeds();
  const storage  = s?.storage ?? {};
  const isSleeping = s?.playerSleeping ?? false;
  const isOnRun    = s?.playerOnRun   ?? false;

  const tabBtn = active => ({
    flex:1, padding:"9px 0", fontSize:10, letterSpacing:"0.06em",
    background:active?"rgba(255,255,255,0.06)":"transparent",
    border:"none", borderBottom:`1.5px solid ${active?"rgba(255,255,255,0.25)":"transparent"}`,
    color:active?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.3)",
    cursor:"pointer", transition:"all 0.15s",
  });

  const panelItems = activePanel ? (CRAFTABLES_BY_STATION[activePanel.type]??[]) : [];
  const SLOT_ICONS = { weapon:"⚔️", tool:"🔧", armor:"🛡️", food:"🥫", water:"🧴" };

  // Need bar component (inline style)
  function NeedBar({ label, icon, value, color }) {
    const pct = Math.max(0, Math.min(100, value));
    const barColor = pct > 60 ? color : pct > 25 ? "#ddaa22" : "#cc3333";
    return (
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:"0.05em"}}>{icon} {label}</span>
          <span style={{fontSize:9,color:barColor}}>{Math.round(pct)}%{pct===0?" ⚠ HP drain!":""}</span>
        </div>
        <div style={{background:"rgba(0,0,0,0.4)",borderRadius:3,height:4}}>
          <div style={{height:"100%",borderRadius:3,background:barColor,width:`${pct}%`,transition:"width 0.3s"}}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{position:"fixed",inset:0,background:"#0d1a0d",overflow:"hidden"}}>
    {/* Global CSS: force full viewport, hide browser chrome on mobile */}
    <style>{`
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#0d1a0d; }
      * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
      @media (max-width:900px) and (orientation:portrait) {
        #__zb_rotate_overlay { display:flex !important; }
      }
    `}</style>

    {/* Portrait rotation overlay */}
    <div id="__zb_rotate_overlay" style={{
      display: isPortrait ? "flex" : "none",
      position:"fixed", inset:0, zIndex:9999,
      background:"#060d06",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:20,
    }}>
      <div style={{fontSize:64, animation:"rotateHint 1.5s ease-in-out infinite alternate", transformOrigin:"center"}}>📱</div>
      <style>{`@keyframes rotateHint { from{transform:rotate(0deg)} to{transform:rotate(90deg)} }`}</style>
      <div style={{color:"rgba(100,200,120,0.9)", fontSize:15, fontFamily:"monospace", letterSpacing:"0.1em", textAlign:"center", lineHeight:1.7}}>
        ROTATE TO PLAY<br/>
        <span style={{fontSize:11, opacity:0.45}}>landscape mode required</span>
      </div>
    </div>

    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── Title / Menu Screen ────────────────────────────────────────────── */}
      {gameScreen === "menu" && (
        <div style={{
          position:"absolute", inset:0, zIndex:100,
          background:"#060e06",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          fontFamily:"monospace",
          overflow:"hidden",
        }}>
          {/* Animated grid background */}
          <style>{`
            @keyframes gridPan { from{background-position:0 0} to{background-position:60px 60px} }
            @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
            @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 94%{opacity:1} }
            @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
            .zb-menu-btn {
              transition: background 0.15s, border-color 0.15s, transform 0.1s;
            }
            .zb-menu-btn:hover { transform: translateX(4px); }
            .zb-menu-btn:active { transform: scale(0.97); }
            .zb-slot-btn { transition: background 0.15s, border-color 0.15s; }
            .zb-slot-btn:hover { background: rgba(68,204,102,0.08) !important; border-color: rgba(68,204,102,0.4) !important; }
          `}</style>
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"linear-gradient(rgba(40,80,40,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(40,80,40,0.08) 1px, transparent 1px)",
            backgroundSize:"60px 60px",
            animation:"gridPan 8s linear infinite",
            pointerEvents:"none",
          }}/>
          {/* Vignette */}
          <div style={{
            position:"absolute", inset:0,
            background:"radial-gradient(ellipse at center, transparent 30%, #060e06 85%)",
            pointerEvents:"none",
          }}/>

          <div style={{
            position:"relative", zIndex:1,
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:0, animation:"slideUp 0.5s ease both",
            width:"min(380px, calc(100vw - 32px))",
          }}>
            {/* Title block */}
            <div style={{textAlign:"center", marginBottom:36}}>
              <div style={{
                fontSize:11, letterSpacing:"0.35em", color:"rgba(68,204,102,0.5)",
                marginBottom:12, textTransform:"uppercase",
              }}>— survive the outbreak —</div>
              <div style={{
                fontSize:48, fontWeight:900, letterSpacing:"-0.01em",
                color:"#e8f5e0",
                lineHeight:1, marginBottom:4,
                textShadow:"0 0 40px rgba(68,204,102,0.3)",
                animation:"flicker 6s infinite",
              }}>ZomBase</div>
              <div style={{
                fontSize:10, color:"rgba(255,255,255,0.18)", letterSpacing:"0.12em",
              }}>build · scavenge · defend</div>
            </div>

            {menuTab === "main" && (
              <div style={{width:"100%", display:"flex", flexDirection:"column", gap:10}}>
                <button className="zb-menu-btn" onClick={startNewGame} style={{
                  width:"100%", padding:"16px 24px",
                  background:"rgba(68,204,102,0.1)",
                  border:"1.5px solid rgba(68,204,102,0.45)",
                  borderRadius:10, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:14,
                  color:"#e8f5e0",
                }}>
                  <span style={{fontSize:22}}>🏕️</span>
                  <div style={{textAlign:"left", flex:1}}>
                    <div style={{fontSize:13, fontWeight:700, letterSpacing:"0.08em", color:"#88ee99"}}>NEW GAME</div>
                    <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2}}>start fresh from day 1</div>
                  </div>
                  <span style={{fontSize:14, color:"rgba(68,204,102,0.4)"}}>›</span>
                </button>

                <button className="zb-menu-btn" onClick={() => setMenuTab("load")} style={{
                  width:"100%", padding:"16px 24px",
                  background: Object.keys(saveSlots).length > 0 ? "rgba(100,160,255,0.07)" : "rgba(255,255,255,0.02)",
                  border:`1.5px solid ${Object.keys(saveSlots).length > 0 ? "rgba(100,160,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius:10, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:14,
                  color: Object.keys(saveSlots).length > 0 ? "#e8f5e0" : "rgba(255,255,255,0.25)",
                }}>
                  <span style={{fontSize:22, opacity: Object.keys(saveSlots).length > 0 ? 1 : 0.3}}>💾</span>
                  <div style={{textAlign:"left", flex:1}}>
                    <div style={{fontSize:13, fontWeight:700, letterSpacing:"0.08em", color: Object.keys(saveSlots).length > 0 ? "#88aaff" : "rgba(255,255,255,0.2)"}}>LOAD GAME</div>
                    <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2}}>
                      {Object.keys(saveSlots).length > 0 ? `${Object.keys(saveSlots).length} save${Object.keys(saveSlots).length !== 1 ? "s" : ""} available` : "no saves found"}
                    </div>
                  </div>
                  <span style={{fontSize:14, color:"rgba(100,160,255,0.4)", opacity: Object.keys(saveSlots).length > 0 ? 1 : 0}}>›</span>
                </button>

                <div style={{textAlign:"center", marginTop:20, fontSize:9, color:"rgba(255,255,255,0.1)", letterSpacing:"0.1em"}}>
                  WASD / ARROW KEYS · TOUCH JOYSTICK ON MOBILE
                </div>
              </div>
            )}

            {menuTab === "load" && (
              <div style={{width:"100%"}}>
                <button onClick={() => setMenuTab("main")} style={{
                  background:"none", border:"none", color:"rgba(255,255,255,0.3)",
                  cursor:"pointer", fontSize:11, letterSpacing:"0.1em", marginBottom:16,
                  padding:"4px 0", display:"flex", alignItems:"center", gap:6,
                }}>‹ BACK</button>

                <div style={{fontSize:10, color:"rgba(255,255,255,0.2)", letterSpacing:"0.1em", marginBottom:12}}>SELECT SAVE SLOT</div>

                {Object.keys(saveSlots).length === 0 && (
                  <div style={{
                    padding:"28px 16px", textAlign:"center",
                    border:"1px dashed rgba(255,255,255,0.07)", borderRadius:10,
                    color:"rgba(255,255,255,0.2)", fontSize:11,
                  }}>No saves yet.<br/><span style={{fontSize:9, opacity:0.6}}>Start a new game and save from the shelter menu.</span></div>
                )}

                <div style={{display:"flex", flexDirection:"column", gap:8}}>
                  {Object.entries(saveSlots).sort(([ka],[kb]) => ka==="autosave"?-1:kb==="autosave"?1:0).sort(([ka,a],[kb,b]) => ka==="autosave"||kb==="autosave"?0:(b.savedAt||0)-(a.savedAt||0)).map(([key, snap]) => {
                    const isAuto = key === "autosave";
                    const d = new Date(snap.savedAt || 0);
                    const dateStr = d.toLocaleDateString(undefined, {month:"short", day:"numeric"}) + " " + d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
                    return (
                      <div key={key} style={{
                        display:"flex", alignItems:"center", gap:10,
                        background: isAuto ? "rgba(68,204,102,0.04)" : "rgba(255,255,255,0.02)",
                        border: isAuto ? "1px solid rgba(68,204,102,0.22)" : "1px solid rgba(255,255,255,0.07)",
                        borderRadius:10, padding:"12px 14px",
                      }}>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{display:"flex", alignItems:"center", gap:6, marginBottom: isAuto ? 3 : 0}}>
                            {isAuto && <span style={{fontSize:8, padding:"1px 5px", borderRadius:4, background:"rgba(68,204,102,0.15)", border:"0.5px solid rgba(68,204,102,0.35)", color:"#66dd88", letterSpacing:"0.08em"}}>AUTO</span>}
                            <div style={{fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600}}>
                              Day {snap.day} · <span style={{color:"rgba(180,200,255,0.5)", fontSize:11, fontWeight:400, textTransform:"capitalize"}}>{snap.phase}</span>
                            </div>
                          </div>
                          <div style={{fontSize:9, color:"rgba(255,255,255,0.2)", marginTop:isAuto?0:3}}>{isAuto ? `💾 autosaved · ${dateStr}` : dateStr}</div>
                        </div>
                        <button className="zb-slot-btn" onClick={() => loadGameFromMenu(key)} style={{
                          padding:"8px 14px", borderRadius:8, fontSize:11, fontWeight:600,
                          background:"rgba(68,204,102,0.1)", border:"1px solid rgba(68,204,102,0.3)",
                          color:"#88ee99", cursor:"pointer", letterSpacing:"0.06em", flexShrink:0,
                        }}>LOAD</button>
                        <button onClick={() => { deleteSlot(key); }} style={{
                          width:30, height:30, borderRadius:7, fontSize:14,
                          background:"rgba(255,60,60,0.07)", border:"1px solid rgba(255,60,60,0.2)",
                          color:"rgba(255,80,80,0.5)", cursor:"pointer", flexShrink:0,
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef}
        style={{flex:1,width:"100%",minHeight:0,display:"block",touchAction:"none",cursor:selectedBuilding?"crosshair":"default"}}
        onClick={handleCanvasClick}/>

      {/* ── Game Over Overlay ──────────────────────────────────────────────── */}
      {s?.gameOver && (
        <div style={{
          position:"absolute", inset:0, zIndex:50,
          background:"rgba(0,0,0,0.78)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          fontFamily:"monospace",
        }}>
          <div style={{fontSize:32,fontWeight:700,color:"#cc3333",letterSpacing:"0.06em",marginBottom:10}}>
            {s.playerHp<=0?"YOU DIED":"SHELTER DESTROYED"}
          </div>
          <div style={{fontSize:14,color:"rgba(180,180,180,0.65)",marginBottom:32}}>
            Survived {s.day} day{s.day!==1?"s":""}
          </div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={handleRestart} style={{
              padding:"12px 28px", borderRadius:10, fontSize:13, fontWeight:700,
              letterSpacing:"0.07em", cursor:"pointer",
              background:"linear-gradient(135deg,rgba(204,51,51,0.25),rgba(204,51,51,0.12))",
              border:"1px solid rgba(204,51,51,0.6)", color:"#ff6666",
            }}>
              ↺ RESTART
            </button>
            <button onClick={()=>{
              setSaveModal(false); setSelectedBuilding(null); setActivePanel(null);
              setSurvivorPanel(null); setPlayerGearOpen(false); setShelterOpen(false);
              setActiveRun(null); setRunResult(null); setRunModal(null);
              stateRef.current = null;
              setGameScreen("menu"); setMenuTab("main");
            }} style={{
              padding:"12px 28px", borderRadius:10, fontSize:13, fontWeight:700,
              letterSpacing:"0.07em", cursor:"pointer",
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.18)", color:"rgba(255,255,255,0.55)",
            }}>
              ← MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      {canBuild&&(
        <div style={{background:"rgba(10,13,10,0.97)",borderTop:"0.5px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          {/* Toggle row */}
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"2px 8px",gap:6,borderBottom:"0.5px solid rgba(255,255,255,0.04)"}}>
            <button onClick={()=>setBottomTabsVisible(v=>!v)} style={{
              flex:1, padding:"3px 0", fontSize:9, letterSpacing:"0.08em",
              background:"transparent", border:"none",
              color:"rgba(255,255,255,0.2)", cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5,
            }}>
              <span style={{fontSize:11,lineHeight:1}}>{bottomTabsVisible?"▼":"▲"}</span>
              {bottomTabsVisible?"HIDE PANEL":"SHOW PANEL"}
            </button>
          </div>

          {bottomTabsVisible&&(<>
          <div style={{display:"flex",borderBottom:"0.5px solid rgba(255,255,255,0.06)"}}>
            <button style={tabBtn(bottomTab==="build")} onClick={()=>{setBottomTab("build");setSurvivorPanel(null);}}>BUILDINGS</button>
            <button style={tabBtn(bottomTab==="defenses")} onClick={()=>{setBottomTab("defenses");setSurvivorPanel(null);}}>
              DEFENSES
            </button>
            <button style={tabBtn(bottomTab==="survivors")} onClick={()=>{setBottomTab("survivors");setSelectedBuilding(null);setActivePanel(null);}}>
              SURVIVORS ({survivors.filter(sv=>!sv.onRun).length})
            </button>
            <button style={tabBtn(bottomTab==="runs")} onClick={()=>{setBottomTab("runs");setSelectedBuilding(null);setActivePanel(null);setSurvivorPanel(null);}}>
              RUNS {activeRun&&<span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:"#44cc66",marginLeft:4,verticalAlign:"middle"}}/>}
            </button>
            <button style={tabBtn(bottomTab==="save")} onClick={()=>{setBottomTab("save");setSelectedBuilding(null);setActivePanel(null);setSurvivorPanel(null);}}>
              💾
            </button>
          </div>

          {/* Build tab */}
          {bottomTab==="build"&&(
            <div style={{padding:"8px 0 env(safe-area-inset-bottom,8px)"}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"0 10px",justifyContent:"center"}}>
                {PLACEABLE_BUILDINGS.map(bDef=>{
                  const isSel=selectedBuilding===bDef.id;
                  const affordable = canAfford(storage, bDef.cost);
                  return(<button key={bDef.id}
                    onClick={()=>{if(affordable||isSel){setSelectedBuilding(isSel?null:bDef.id);setActivePanel(null);}}}
                    style={{flexShrink:0,
                      background:isSel?`rgba(${hexToRgb(bDef.color)},0.15)`:affordable?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.15)",
                      border:`1px solid ${isSel?bDef.color:affordable?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,
                      borderRadius:10,
                      color:isSel?bDef.color:affordable?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.25)",
                      fontSize:10,padding:"6px 10px",
                      minHeight:52,minWidth:72,cursor:affordable?"pointer":"default",whiteSpace:"nowrap",transition:"all 0.12s",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:18,lineHeight:1}}>{bDef.icon}</span>
                    <span>{bDef.label}</span>
                    <span style={{fontSize:8,color:affordable?(isSel?bDef.color:"rgba(255,255,255,0.3)"):"#cc4444",lineHeight:1.3}}>
                      {costLabel(bDef.cost)}
                    </span>
                  </button>);})}
              </div>
              {selectedBuilding&&!pendingPlacement&&(<div style={{textAlign:"center",fontSize:10,color:"rgba(120,200,120,0.5)",marginTop:4,paddingBottom:4}}>tap the map to preview placement · Esc to cancel</div>)}
              {selectedBuilding&&pendingPlacement&&(<div style={{textAlign:"center",fontSize:10,color:"rgba(68,255,136,0.6)",marginTop:4,paddingBottom:4}}>tap map to reposition · hit ✓ to confirm</div>)}
            </div>)}

          {/* Defenses tab */}
          {bottomTab==="defenses"&&(
            <div style={{padding:"8px 0 env(safe-area-inset-bottom,8px)"}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"0 10px",justifyContent:"center"}}>
                {DEFENSE_BUILDINGS.map(bDef=>{
                  const isSel=selectedBuilding===bDef.id;
                  const isWall=bDef.id==="wall";
                  const wallActive=wallPlacing&&isWall;
                  const affordable = canAfford(storage, bDef.cost);
                  return(<button key={bDef.id}
                    onClick={()=>{
                      if (!affordable && !isSel && !wallActive) return;
                      if (isWall) {
                        if (isSel||wallActive) { setSelectedBuilding(null); setWallPlacing(null); wallPlacingRef.current=null; }
                        else { setSelectedBuilding(bDef.id); setActivePanel(null); }
                      } else {
                        setSelectedBuilding(isSel?null:bDef.id); setActivePanel(null);
                      }
                    }}
                    style={{flexShrink:0,
                      background:(isSel||wallActive)?`rgba(${hexToRgb(bDef.color)},0.15)`:affordable?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.15)",
                      border:`1px solid ${(isSel||wallActive)?bDef.color:affordable?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,
                      borderRadius:10,
                      color:(isSel||wallActive)?bDef.color:affordable?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.25)",
                      fontSize:10,padding:"6px 10px",
                      minHeight:52,minWidth:72,cursor:affordable?"pointer":"default",whiteSpace:"nowrap",transition:"all 0.12s",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:18,lineHeight:1}}>{bDef.icon}</span>
                    <span>{bDef.label}</span>
                    <span style={{fontSize:8,color:affordable?(isSel||wallActive?bDef.color:"rgba(255,255,255,0.3)"):"#cc4444",lineHeight:1.3}}>
                      {costLabel(bDef.cost)}{isWall?" /seg":""}
                    </span>
                  </button>);})}
              </div>
              {selectedBuilding&&selectedBuilding!=="wall"&&!pendingPlacement&&(<div style={{textAlign:"center",fontSize:10,color:"rgba(200,150,80,0.5)",marginTop:4,paddingBottom:4}}>tap within build zone to preview · Esc to cancel</div>)}
              {selectedBuilding&&selectedBuilding!=="wall"&&pendingPlacement&&(<div style={{textAlign:"center",fontSize:10,color:"rgba(68,255,136,0.6)",marginTop:4,paddingBottom:4}}>tap map to reposition · hit ✓ to confirm</div>)}
              {(selectedBuilding==="wall"||wallPlacing)&&(<div style={{textAlign:"center",fontSize:10,color:"rgba(200,180,80,0.6)",marginTop:4,paddingBottom:4}}>{wallPlacing?"tap 2nd point to finish wall":"tap first point inside build zone"} · Esc to cancel</div>)}
              {!selectedBuilding&&!wallPlacing&&(
                <div style={{padding:"6px 14px 2px",display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                  {[{icon:"🗼",label:"Guard Post",desc:"Survivor with 🦺 Body Armour garrisons it · shoots "+GUARD_POST_RANGE+"px"},
                    {icon:"🔥",label:"Flamethrower",desc:"Craft at Weapon Smith · cone AoE · "+FLAME_RANGE+"px range · high damage"},
                    {icon:"🧱",label:"Wall",desc:"Blocks zombies · "+WALL_HP+" HP · 2-click to place"}].map(tip=>(
                    <div key={tip.label} style={{fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center",maxWidth:100}}>
                      <span style={{fontSize:13}}>{tip.icon}</span><br/>
                      <span style={{color:"rgba(255,255,255,0.35)"}}>{tip.label}</span><br/>
                      {tip.desc}
                    </div>))}
                </div>)}</div>)}

          {/* Survivors tab */}
          {bottomTab==="survivors"&&(
            <div style={{padding:"8px 10px env(safe-area-inset-bottom,8px)",overflowX:"auto",display:"flex",gap:8,alignItems:"flex-start"}}>
              {survivors.length===0
                ?<div style={{fontSize:10,color:"rgba(255,255,255,0.2)",width:"100%",textAlign:"center",paddingTop:8}}>No survivors yet — build a House</div>
                :survivors.map(sv=>{
                  const isSel=survivorPanel===sv.id;
                  const hf=sv.hp/sv.maxHp;
                  const sn=sv.needs??{};
                  const needWarn=(sn.hunger??100)<=HUNGER_CRIT||(sn.thirst??100)<=THIRST_CRIT||(sn.sleep??100)<=SLEEP_CRIT;
                  return(<button key={sv.id} onClick={()=>setSurvivorPanel(isSel?null:sv.id)}
                    style={{flexShrink:0,width:68,padding:"8px 6px",borderRadius:12,
                      background:isSel?"rgba(100,180,255,0.1)":sv.onRun?"rgba(255,170,50,0.07)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isSel?"#6699cc":sv.onRun?"rgba(255,170,50,0.3)":"rgba(255,255,255,0.1)"}`,
                      color:"rgba(255,255,255,0.7)",cursor:"pointer",transition:"all 0.12s",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative"}}>
                    {needWarn&&!sv.onRun&&<div style={{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",background:"#dd8822"}}/>}
                    <div style={{width:28,height:28,borderRadius:"50%",background:sv.onRun?"#2a1a08":"#1a3a55",border:`1.5px solid ${sv.onRun?"#cc8833":"#4488bb"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                      {sv.onRun?"🏃":"🧑"}
                    </div>
                    <div style={{fontSize:9,opacity:0.7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:56}}>{sv.name}</div>
                    {sv.onRun&&<div style={{fontSize:8,color:"#ffaa44"}}>on run</div>}
                    {sv.sleeping&&!sv.onRun&&<div style={{fontSize:8,color:"#9988dd"}}>💤 sleeping</div>}
                    {sv.fleeing&&!sv.onRun&&!sv.sleeping&&<div style={{fontSize:8,color:"#ff6644"}}>😱 fleeing!</div>}
                    {sv.insideBuilding&&!sv.onRun&&!sv.sleeping&&!sv.fleeing&&
                      <div style={{fontSize:8,color:getToolBehavior(sv)==="guard"?"#dd7722":getToolBehavior(sv)==="carpenter"?"#aa8855":"#88ccff"}}>
                        {getToolBehavior(sv)==="guard"?"🗼 on post":getToolBehavior(sv)==="carpenter"?"🪚 repairing":"🏠 inside"}
                      </div>}
                    {!sv.onRun&&!sv.sleeping&&!sv.fleeing&&!sv.insideBuilding&&<div style={{display:"flex",gap:2,fontSize:10}}>
                      {sv.gear?.weapon&&<span>{CRAFTABLES[sv.gear.weapon]?.icon}</span>}
                      {sv.gear?.tool&&<span>{CRAFTABLES[sv.gear.tool]?.icon}</span>}
                      {sv.gear?.armor&&<span>{CRAFTABLES[sv.gear.armor]?.icon}</span>}
                    </div>}
                    <div style={{width:"100%",height:3,background:"rgba(0,0,0,0.4)",borderRadius:2}}>
                      <div style={{height:"100%",borderRadius:2,background:hf>0.5?"#44cc66":hf>0.25?"#ddaa22":"#cc3333",width:`${hf*100}%`}}/>
                    </div>
                  </button>);})}
            </div>)}

          {/* Runs tab */}
          {bottomTab==="runs"&&(
            <div style={{padding:"8px 10px env(safe-area-inset-bottom,8px)"}}>
              {/* Active runs panel */}
              {activeRuns.length>0&&(
                <div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:5}}>
                  {activeRuns.map(ar=>{
                    const members = [];
                    if (ar.includesPlayer) members.push("You");
                    if (s) ar.partyIds.forEach(id=>{const sv=s.survivors.find(sv=>sv.id===id);if(sv)members.push(sv.name);});
                    const pct = Math.min(100, ((ar.elapsed??0)/ar.run.duration)*100);
                    const remaining = Math.max(0, Math.ceil(ar.run.duration-(ar.elapsed??0)));
                    return(
                      <div key={ar.id} style={{padding:"7px 10px",borderRadius:10,background:"rgba(68,204,102,0.07)",border:"0.5px solid rgba(68,204,102,0.2)",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:14,flexShrink:0}}>{ar.run.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:9,color:"rgba(68,204,102,0.8)",letterSpacing:"0.06em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {ar.run.name} · {members.join(", ")}
                            {ar.gearBonus>0&&<span style={{color:"#ffcc66",marginLeft:4}}>+{Math.round(ar.gearBonus*100)}% gear</span>}
                          </div>
                          <div style={{marginTop:4,background:"rgba(0,0,0,0.4)",borderRadius:3,height:3}}>
                            <div style={{height:"100%",borderRadius:3,background:"#44cc66",width:`${pct}%`,transition:"width 0.25s linear"}}/>
                          </div>
                          <div style={{fontSize:8,color:"rgba(68,204,102,0.35)",marginTop:2}}>returning in {remaining}s</div>
                        </div>
                      </div>
                    );
                  })}
                </div>)}
              {/* Party selector */}
              {survivors.filter(sv=>!sv.onRun).length>0&&(
                <div style={{marginBottom:8,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.02)",border:"0.5px solid rgba(255,255,255,0.07)"}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginBottom:5,letterSpacing:"0.06em"}}>SELECT PARTY FOR NEXT RUN</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    {/* Player toggle */}
                    {!isOnRun&&(
                      <button onClick={toggleRunPartyPlayer}
                        style={{padding:"4px 8px",borderRadius:6,fontSize:9,cursor:"pointer",
                          background:runParty.includesPlayer?"rgba(68,136,204,0.2)":"rgba(255,255,255,0.03)",
                          border:`0.5px solid ${runParty.includesPlayer?"#4488cc":"rgba(255,255,255,0.1)"}`,
                          color:runParty.includesPlayer?"#88ccff":"rgba(255,255,255,0.35)"}}>
                        🧑 You{runParty.includesPlayer?" ✓":""}
                      </button>)}
                    {survivors.filter(sv=>!sv.onRun).map(sv=>(
                      <button key={sv.id} onClick={()=>toggleRunPartyMember(sv.id)}
                        style={{padding:"4px 8px",borderRadius:6,fontSize:9,cursor:"pointer",
                          background:runParty.survivorIds.includes(sv.id)?"rgba(68,136,204,0.2)":"rgba(255,255,255,0.03)",
                          border:`0.5px solid ${runParty.survivorIds.includes(sv.id)?"#4488cc":"rgba(255,255,255,0.1)"}`,
                          color:runParty.survivorIds.includes(sv.id)?"#88ccff":"rgba(255,255,255,0.35)"}}>
                        🧑 {sv.name}{runParty.survivorIds.includes(sv.id)?" ✓":""}
                      </button>))}
                  </div>
                </div>)}
              <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4}}>
                {RUNS.map(run=>{
                  const existingRun = activeRuns.find(ar=>ar.run.id===run.id);
                  const currentDay = s?.day ?? 1;
                  const locked = currentDay < run.unlockDay;
                  // Compute gear bonus preview
                  const gearList = [];
                  if (runParty.includesPlayer && !isOnRun) gearList.push(playerGearRef.current);
                  runParty.survivorIds.forEach(id=>{const sv=s?.survivors.find(sv=>sv.id===id);if(sv)gearList.push(sv.gear);});
                  const previewBonus = calcRunGearBonus(gearList);
                  const effectiveChance = Math.min(0.98, run.successChance + previewBonus);
                  const canSend = !locked && (runParty.includesPlayer && !isOnRun || runParty.survivorIds.some(id=>!s?.survivors.find(sv=>sv.id===id)?.onRun));
                  return(
                    <button key={run.id} onClick={()=>{if(canSend){setRunModal(run);setRunFocus([]);}}}
                      style={{flexShrink:0,width:86,padding:"8px 6px 10px",borderRadius:12,
                        background:existingRun?"rgba(68,204,102,0.08)":locked?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)",
                        border:`1px solid ${existingRun?"rgba(68,204,102,0.3)":locked?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.1)"}`,
                        color:locked?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.7)",
                        cursor:locked||!canSend?"default":"pointer",transition:"all 0.12s",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative",overflow:"hidden"}}>
                      {locked&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,background:"rgba(0,0,0,0.55)",zIndex:2}}>
                        <span style={{fontSize:14}}>🔒</span>
                        <span style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>Day {run.unlockDay}</span>
                      </div>}
                      <span style={{fontSize:20,lineHeight:1}}>{run.icon}</span>
                      <span style={{fontSize:9,fontWeight:500,letterSpacing:"0.03em",textAlign:"center",lineHeight:1.2}}>{run.name}</span>
                      <span style={{fontSize:8,opacity:0.4,textAlign:"center"}}>{run.subtitle}</span>
                      <div style={{marginTop:2,padding:"1px 5px",borderRadius:4,background:`${run.dangerColor}18`,border:`0.5px solid ${run.dangerColor}44`,fontSize:8,color:run.dangerColor,letterSpacing:"0.05em"}}>{run.dangerLabel}</div>
                      <div style={{fontSize:8,opacity:0.3}}>{run.duration}s</div>
                      <div style={{fontSize:8,color:previewBonus>0?"#ffcc66":"rgba(255,255,255,0.3)"}}>
                        {Math.round(effectiveChance*100)}%{previewBonus>0?` (+${Math.round(previewBonus*100)})`:""}
                      </div>
                    </button>);})}
              </div>
            </div>)}

          {/* Save tab */}
          {bottomTab==="save"&&(
            <div style={{padding:"8px 10px env(safe-area-inset-bottom,8px)"}}>
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
                {Array.from({length:MAX_SAVE_SLOTS},(_,i)=>`slot${i+1}`).map(slotKey=>{
                  const snap = saveSlots[slotKey];
                  const savedDate = snap ? new Date(snap.savedAt) : null;
                  const label = savedDate
                    ? `${savedDate.toLocaleDateString(undefined,{month:"short",day:"numeric"})} ${savedDate.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}`
                    : null;
                  return(
                    <div key={slotKey} style={{flexShrink:0,width:100,display:"flex",flexDirection:"column",gap:4}}>
                      <div style={{padding:"8px 8px 6px",borderRadius:10,background:snap?"rgba(80,160,80,0.07)":"rgba(255,255,255,0.02)",border:`0.5px solid ${snap?"rgba(80,200,80,0.2)":"rgba(255,255,255,0.08)"}`,display:"flex",flexDirection:"column",alignItems:"center",gap:3,minHeight:70,justifyContent:"center"}}>
                        <span style={{fontSize:18,lineHeight:1}}>{snap?"💾":"📂"}</span>
                        {snap
                          ? <>
                              <div style={{fontSize:9,color:"rgba(100,220,100,0.8)",fontWeight:600,textAlign:"center"}}>Day {snap.day}</div>
                              <div style={{fontSize:7.5,color:"rgba(255,255,255,0.25)",textAlign:"center",lineHeight:1.3}}>{label}</div>
                            </>
                          : <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>Empty</div>
                        }
                      </div>
                      <button onClick={()=>saveGame(slotKey)} style={{width:"100%",padding:"5px 0",borderRadius:7,fontSize:9,cursor:"pointer",background:"rgba(68,180,68,0.1)",border:"0.5px solid rgba(68,180,68,0.3)",color:"rgba(100,220,100,0.7)",letterSpacing:"0.05em"}}>
                        SAVE
                      </button>
                      {snap&&<button onClick={()=>loadGame(slotKey)} style={{width:"100%",padding:"5px 0",borderRadius:7,fontSize:9,cursor:"pointer",background:"rgba(80,120,200,0.1)",border:"0.5px solid rgba(80,140,220,0.3)",color:"rgba(120,170,255,0.7)",letterSpacing:"0.05em"}}>
                        LOAD
                      </button>}
                      {snap&&<button onClick={()=>deleteSlot(slotKey)} style={{width:"100%",padding:"4px 0",borderRadius:7,fontSize:8,cursor:"pointer",background:"transparent",border:"0.5px solid rgba(200,50,50,0.2)",color:"rgba(200,80,80,0.4)",letterSpacing:"0.04em"}}>
                        DELETE
                      </button>}
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:8,color:"rgba(255,255,255,0.15)",textAlign:"center",marginTop:6}}>saves persist in your browser · up to {MAX_SAVE_SLOTS} slots</div>
              <button onClick={()=>{
                setSaveModal(false); setSelectedBuilding(null); setActivePanel(null);
                setSurvivorPanel(null); setPlayerGearOpen(false); setShelterOpen(false);
                setActiveRun(null); setRunResult(null); setRunModal(null);
                stateRef.current = null;
                setGameScreen("menu"); setMenuTab("main");
              }} style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,fontSize:9,cursor:"pointer",background:"rgba(255,255,255,0.02)",border:"0.5px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.25)",letterSpacing:"0.08em"}}>
                ← RETURN TO MAIN MENU
              </button>
            </div>)}

          </>)}
        </div>)}

      {/* ── Shelter modal ──────────────────────────────────────────────────── */}
      {shelterOpen&&(
        <div onClick={()=>setShelterOpen(false)} style={{position:"absolute",inset:0,zIndex:20,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(300px,calc(100vw - 24px))",background:"#0a1410",border:"0.5px solid rgba(100,180,100,0.2)",borderRadius:18,padding:"20px 18px 18px",position:"relative",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(140,200,140,0.6)",marginBottom:14}}>
              🏚 {SHELTER_TIERS[Math.min((s?.shelterLevel||1)-1,2)].label} <span style={{opacity:0.4,fontSize:9}}>Lv{s?.shelterLevel||1}</span>
            </div>

            {/* Shelter Upgrade */}
            {(s?.shelterLevel??1) < SHELTER_TIERS.length && (() => {
              const nextTier = SHELTER_TIERS[(s?.shelterLevel||1)];
              const upgradeCost = { scrap: 20 * (s?.shelterLevel||1), wood: 15 * (s?.shelterLevel||1) };
              const canUpgrade = (storage.scrap??0)>=upgradeCost.scrap && (storage.wood??0)>=upgradeCost.wood;
              return (
                <div style={{marginBottom:14,padding:"10px",borderRadius:10,background:"rgba(80,180,80,0.05)",border:"0.5px solid rgba(80,180,80,0.15)"}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4}}>Upgrade to {nextTier.label}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.22)",marginBottom:4}}>Build radius: {getBuildRadius(s?.shelterLevel||1)}→{nextTier.buildRadius}px</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.22)",marginBottom:8}}>Cost: 🔩{upgradeCost.scrap} 🪵{upgradeCost.wood}</div>
                  <button disabled={!canUpgrade} onClick={()=>{
                    const st=stateRef.current; if(!st)return;
                    const cost={scrap:20*(st.shelterLevel||1),wood:15*(st.shelterLevel||1)};
                    if((st.storage.scrap??0)<cost.scrap||(st.storage.wood??0)<cost.wood)return;
                    st.storage.scrap-=cost.scrap; st.storage.wood-=cost.wood;
                    st.shelterLevel=(st.shelterLevel||1)+1;
                    st.shelterHp=Math.min(SHELTER_TIERS[st.shelterLevel-1].maxHp,st.shelterHp+50);
                    forceUpdate(n=>n+1);
                  }} style={{width:"100%",padding:"7px",borderRadius:8,fontSize:10,cursor:canUpgrade?"pointer":"default",
                    background:canUpgrade?"rgba(80,180,80,0.15)":"rgba(255,255,255,0.02)",
                    border:`0.5px solid ${canUpgrade?"rgba(80,200,80,0.5)":"rgba(255,255,255,0.07)"}`,
                    color:canUpgrade?"#66dd66":"rgba(255,255,255,0.2)"}}>
                    ⬆ Upgrade Shelter
                  </button>
                </div>
              );
            })()}

            {/* Shelter HP */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>Structure</span>
                <span style={{fontSize:10,color:(s?.shelterHp??0)>60?"#44cc66":(s?.shelterHp??0)>30?"#ddaa22":"#cc3333"}}>{Math.ceil(s?.shelterHp??0)} / {SHELTER_MAX_HP}</span>
              </div>
              <div style={{background:"rgba(0,0,0,0.4)",borderRadius:3,height:5}}>
                <div style={{height:"100%",borderRadius:3,background:(s?.shelterHp??0)/SHELTER_MAX_HP>0.6?"#44cc66":(s?.shelterHp??0)/SHELTER_MAX_HP>0.3?"#ddaa22":"#cc3333",width:`${((s?.shelterHp??0)/SHELTER_MAX_HP)*100}%`}}/>
              </div>
            </div>

            {/* Your needs */}
            <div style={{marginBottom:14,paddingBottom:14,borderBottom:"0.5px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:10,letterSpacing:"0.05em"}}>YOUR STATUS</div>
              <NeedBar label="Hunger" icon="🍽" value={pNeeds.hunger} color="#ddaa44"/>
              <NeedBar label="Thirst" icon="💧" value={pNeeds.thirst} color="#44aacc"/>
              <NeedBar label="Sleep"  icon="😴" value={pNeeds.sleep}  color="#9988dd"/>
              {/* Actions */}
              <div style={{display:"flex",gap:6,marginTop:10}}>
                <button onClick={playerEat}
                  disabled={(storage.meals??0)<1}
                  style={{flex:1,padding:"8px 6px",borderRadius:8,fontSize:10,cursor:(storage.meals??0)>=1?"pointer":"default",
                    background:(storage.meals??0)>=1?"rgba(221,170,68,0.12)":"rgba(255,255,255,0.02)",
                    border:`0.5px solid ${(storage.meals??0)>=1?"rgba(221,170,68,0.4)":"rgba(255,255,255,0.07)"}`,
                    color:(storage.meals??0)>=1?"#ddaa44":"rgba(255,255,255,0.2)"}}>
                  🍱 Meal{(storage.meals??0)>0?` (${storage.meals??0})`:""}<br/>
                  <span style={{fontSize:8,opacity:0.5}}>+{MEAL_RESTORE} hunger</span>
                </button>
                <button onClick={playerEatCrop}
                  disabled={(storage.crops??0)<1}
                  style={{flex:1,padding:"8px 6px",borderRadius:8,fontSize:10,cursor:(storage.crops??0)>=1?"pointer":"default",
                    background:(storage.crops??0)>=1?"rgba(100,180,80,0.12)":"rgba(255,255,255,0.02)",
                    border:`0.5px solid ${(storage.crops??0)>=1?"rgba(100,180,80,0.35)":"rgba(255,255,255,0.07)"}`,
                    color:(storage.crops??0)>=1?"#88cc55":"rgba(255,255,255,0.2)"}}>
                  🌽 Crop{(storage.crops??0)>0?` (${storage.crops??0})`:""}<br/>
                  <span style={{fontSize:8,opacity:0.5}}>+{CROP_RESTORE} hunger</span>
                </button>
                <button onClick={playerDrink}
                  disabled={(storage.water??0)<WATER_PER_DRINK}
                  style={{flex:1,padding:"8px 6px",borderRadius:8,fontSize:10,cursor:(storage.water??0)>=WATER_PER_DRINK?"pointer":"default",
                    background:(storage.water??0)>=WATER_PER_DRINK?"rgba(68,170,204,0.12)":"rgba(255,255,255,0.02)",
                    border:`0.5px solid ${(storage.water??0)>=WATER_PER_DRINK?"rgba(68,170,204,0.4)":"rgba(255,255,255,0.07)"}`,
                    color:(storage.water??0)>=WATER_PER_DRINK?"#44aacc":"rgba(255,255,255,0.2)"}}>
                  💧 Drink{(storage.water??0)>0?` (${Math.floor(storage.water??0)})`:""}<br/>
                  <span style={{fontSize:8,opacity:0.5}}>+{WATER_RESTORE} thirst</span>
                </button>
                {isSleeping
                  ? <button onClick={playerWake}
                      style={{flex:1,padding:"8px 6px",borderRadius:8,fontSize:10,cursor:"pointer",
                        background:"rgba(153,136,221,0.15)",border:"0.5px solid rgba(153,136,221,0.5)",color:"#9988dd"}}>
                      💤 Wake up
                    </button>
                  : <button onClick={playerSleep}
                      style={{flex:1,padding:"8px 6px",borderRadius:8,fontSize:10,cursor:"pointer",
                        background:"rgba(153,136,221,0.08)",border:"0.5px solid rgba(153,136,221,0.3)",color:"rgba(153,136,221,0.7)"}}>
                      😴 Sleep<br/>
                      <span style={{fontSize:8,opacity:0.5}}>restore rest</span>
                    </button>}
              </div>
            </div>

            {/* Survivors inside */}
            <div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:8,letterSpacing:"0.05em"}}>RESIDENTS</div>
              {survivors.length===0
                ?<div style={{fontSize:10,color:"rgba(255,255,255,0.12)"}}>None yet</div>
                :survivors.map(sv=>{
                  const sn=sv.needs??{};
                  return(
                    <div key={sv.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,0.02)"}}>
                      <span style={{fontSize:13}}>{sv.onRun?"🏃":sv.sleeping?"💤":"🧑"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sv.name}</div>
                        <div style={{fontSize:8,color:"rgba(255,255,255,0.2)"}}>{sv.onRun?"out on run":sv.sleeping?"sleeping":"awake"}</div>
                      </div>
                      {!sv.onRun&&(
                        <div style={{display:"flex",gap:3}}>
                          {[{v:sn.hunger??100,c:"#ddaa44"},{v:sn.thirst??100,c:"#44aacc"},{v:sn.sleep??100,c:"#9988dd"}].map((nb,i)=>(
                            <div key={i} style={{width:4,height:16,background:"rgba(0,0,0,0.4)",borderRadius:2,overflow:"hidden",display:"flex",flexDirection:"column-reverse"}}>
                              <div style={{height:`${nb.v}%`,background:nb.v>40?nb.c:"#cc3333",borderRadius:2}}/>
                            </div>))}
                        </div>)}
                    </div>);})}
            </div>

            <div onClick={()=>setShelterOpen(false)} style={{position:"absolute",top:12,right:14,fontSize:20,color:"rgba(255,255,255,0.2)",cursor:"pointer",lineHeight:1}}>×</div>
          </div>
        </div>)}

      {/* ── Survivor detail panel ──────────────────────────────────────────── */}
      {survivorPanel!==null&&(()=>{
        const sv=survivors.find(s=>s.id===survivorPanel); if(!sv)return null;
        const hf=sv.hp/sv.maxHp;
        const sn=sv.needs??{};
        const allItems = Object.values(CRAFTABLES);
        return(
          <div onClick={()=>setSurvivorPanel(null)} style={{position:"absolute",inset:0,zIndex:10}}>
            <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"min(285px,calc(100vw - 24px))",background:"#0d1820",border:"0.5px solid rgba(100,180,255,0.2)",borderRadius:16,padding:"18px 18px 16px",maxHeight:"85vh",overflowY:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:sv.onRun?"#1a1008":"#1a3a55",border:`2px solid ${sv.onRun?"#cc8833":"#4488bb"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{sv.onRun?"🏃":"🧑"}</div>
                <div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",fontWeight:500}}>{sv.name}</div>
                  <div style={{fontSize:10,color:"rgba(170,220,255,0.45)",marginTop:2}}>
                    {sv.onRun?"out on a run":sv.sleeping?"💤 sleeping":
                     getToolBehavior(sv)==="wander"?"idle":
                     getToolBehavior(sv)==="garden"?"🌱 gardening":
                     getToolBehavior(sv)==="kitchen"?"🍳 cooking":
                     getToolBehavior(sv)==="guard"?"🗼 guarding post":
                     getToolBehavior(sv)==="carpenter"?"🪚 repairing buildings":"idle"}
                  </div>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:5}}>health</div>
                <div style={{background:"rgba(0,0,0,0.4)",borderRadius:4,height:6}}>
                  <div style={{height:"100%",borderRadius:4,background:hf>0.5?"#44cc66":hf>0.25?"#ddaa22":"#cc3333",width:`${hf*100}%`}}/>
                </div>
              </div>
              {!sv.onRun&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:6}}>needs</div>
                  <NeedBar label="Hunger" icon="🍽" value={sn.hunger??100} color="#ddaa44"/>
                  <NeedBar label="Thirst" icon="💧" value={sn.thirst??100} color="#44aacc"/>
                  <NeedBar label="Sleep"  icon="😴" value={sn.sleep??100}  color="#9988dd"/>
                </div>)}
              {!sv.onRun&&["weapon","tool","armor","food","water"].map(slot=>{
                const equipped = sv.gear?.[slot];
                const slotItems = allItems.filter(i=>i.slot===slot);
                const inv = s?.inventory ?? {};
                return(
                  <div key={slot} style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:6}}>{SLOT_ICONS[slot]} {slot.toUpperCase()}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {slotItems.length===0
                        ?<div style={{fontSize:9,color:"rgba(255,255,255,0.12)"}}>nothing craftable yet</div>
                        :slotItems.map(item=>{
                          const isEq=equipped===item.id;
                          const available = inv[item.id] ?? 0;
                          const canEquip = isEq || available > 0;
                          const totalOwned = available + (isEq ? 1 : 0);
                          return(
                            <button key={item.id} onClick={()=>{ if(canEquip) equipSurvivor(sv.id,item.id); }}
                              style={{padding:"7px 10px",borderRadius:8,fontSize:10,
                                cursor:canEquip?"pointer":"default",
                                background:isEq?`rgba(${hexToRgb(item.color)},0.15)`:canEquip?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.15)",
                                border:`0.5px solid ${isEq?item.color:canEquip?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)"}`,
                                color:isEq?item.color:canEquip?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.2)",
                                display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                              <span style={{fontSize:14}}>{item.icon}</span>
                              <span>{item.label}</span>
                              <span style={{fontSize:8,opacity:0.55}}>
                                {isEq?"equipped · tap to remove":available===0?"none in stock":available+" avail"}
                              </span>
                            </button>);})}
                    </div>
                  </div>);})}
              <div onClick={()=>setSurvivorPanel(null)} style={{position:"absolute",top:10,right:12,fontSize:20,color:"rgba(255,255,255,0.2)",cursor:"pointer",lineHeight:1}}>×</div>
            </div>
          </div>);})()} 

      {/* ── Station panel ─────────────────────────────────────────────────── */}
      {activePanel!==null&&panelItems.length>0&&(()=>{
        const def=BUILDING_TYPES[activePanel.type];
        const inv = s?.inventory ?? {};
        const stor = s?.storage ?? {};
        return(
          <div onClick={()=>setActivePanel(null)} style={{position:"absolute",inset:0,zIndex:10}}>
            <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"min(300px,calc(100vw - 24px))",background:"#0f1610",border:`0.5px solid ${def.color}44`,borderRadius:16,padding:"18px 18px 16px",maxHeight:"85vh",overflowY:"auto"}}>
              <div style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:def.color,marginBottom:4}}>{def.icon} {def.label}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:14,lineHeight:1.5}}>{def.description}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {panelItems.map(item=>{
                  const isCrafting=craftingQueue?.itemId===item.id&&craftingQueue?.stationId===activePanel.id;
                  const progress=isCrafting&&s?.playerCraft?.progress?s.playerCraft.progress/item.castTime:0;
                  const affordable = canAfford(stor, item.cost);
                  const inStock = inv[item.id] ?? 0;
                  return(
                    <button key={item.id}
                      onClick={()=>{
                        if (isCrafting) { setCraftingQueue(null); return; }
                        if (!affordable) return;
                        setCraftingQueue({stationId:activePanel.id,itemId:item.id});
                      }}
                      style={{width:"100%",padding:"10px 12px",borderRadius:10,textAlign:"left",
                        cursor:isCrafting||affordable?"pointer":"default",
                        background:isCrafting?`rgba(${hexToRgb(item.color)},0.12)`:affordable?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.2)",
                        border:`0.5px solid ${isCrafting?item.color:affordable?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,
                        color:isCrafting?item.color:affordable?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.3)",
                        position:"relative",overflow:"hidden"}}>
                      {isCrafting&&<div style={{position:"absolute",inset:0,background:`rgba(${hexToRgb(item.color)},0.08)`,width:`${progress*100}%`,transition:"width 0.1s"}}/>}
                      <div style={{position:"relative",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:500,marginBottom:2}}>
                            {item.icon} {item.label}
                            {inStock>0&&<span style={{fontSize:9,marginLeft:6,opacity:0.55,color:"#88ccaa"}}>in stock: {inStock}</span>}
                            {isCrafting&&<span style={{fontSize:9,marginLeft:8,opacity:0.6}}>crafting… {Math.round(progress*100)}%</span>}
                          </div>
                          <div style={{fontSize:9,opacity:0.45,lineHeight:1.4,marginBottom:3}}>{item.description}</div>
                          <div style={{fontSize:9,color:affordable?"rgba(255,255,255,0.35)":"#cc4444"}}>
                            {isCrafting?"tap to cancel":costLabel(item.cost)+" · "+item.castTime+"s"}
                            {!affordable&&!isCrafting&&<span style={{marginLeft:4,opacity:0.7}}> — can't afford</span>}
                          </div>
                        </div>
                      </div>
                    </button>);})}
              </div>
              <div onClick={()=>setActivePanel(null)} style={{position:"absolute",top:10,right:12,fontSize:20,color:"rgba(255,255,255,0.2)",cursor:"pointer",lineHeight:1}}>×</div>
            </div>
          </div>);})()} 

      {/* ── Player gear panel ─────────────────────────────────────────────── */}
      {playerGearOpen&&(()=>{
        const inv = s?.inventory ?? {};
        const allItems = Object.values(CRAFTABLES);
        function playerEquip(itemId) {
          const st = stateRef.current; if (!st) return;
          const item = CRAFTABLES[itemId]; if (!item) return;
          const currentlyEquipped = playerGearRef.current[item.slot];
          if (currentlyEquipped === itemId) {
            // Unequip → return to inventory
            const newGear = { ...playerGearRef.current, [item.slot]: null };
            setPlayerGear(newGear);
            st.inventory[itemId] = (st.inventory[itemId] ?? 0) + 1;
          } else {
            if ((st.inventory[itemId] ?? 0) < 1) return;
            if (currentlyEquipped) {
              st.inventory[currentlyEquipped] = (st.inventory[currentlyEquipped] ?? 0) + 1;
            }
            const newGear = { ...playerGearRef.current, [item.slot]: itemId };
            setPlayerGear(newGear);
            st.inventory[itemId] = Math.max(0, (st.inventory[itemId] ?? 0) - 1);
          }
          forceUpdate(n => n + 1);
        }
        return (
        <div onClick={()=>setPlayerGearOpen(false)} style={{position:"absolute",inset:0,zIndex:10}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:12,bottom:80,width:"min(280px,calc(100vw - 24px))",background:"#0d1820",border:"0.5px solid rgba(120,200,255,0.2)",borderRadius:16,padding:"16px 16px 14px",maxHeight:"70vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#1a3060",border:"2px solid #4488bb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🧑</div>
              <div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:500}}>You</div>
                <div style={{fontSize:9,color:"rgba(170,220,255,0.4)"}}>tap item to equip · tap again to unequip</div>
              </div>
            </div>
            {["weapon","tool","armor","food","water"].map(slot=>{
              const equipped = playerGear[slot];
              const slotItems = allItems.filter(i => i.slot === slot);
              return (
                <div key={slot} style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:6}}>{SLOT_ICONS[slot]} {slot.toUpperCase()}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {slotItems.map(item => {
                      const isEq = equipped === item.id;
                      const count = (inv[item.id] ?? 0) + (isEq ? 1 : 0); // total owned (equipped + in stock)
                      const available = inv[item.id] ?? 0;
                      const canEquip = isEq || available > 0;
                      return (
                        <button key={item.id} onClick={() => playerEquip(item.id)}
                          disabled={!canEquip}
                          style={{padding:"7px 10px",borderRadius:9,fontSize:10,cursor:canEquip?"pointer":"default",
                            background:isEq?`rgba(${hexToRgb(item.color)},0.18)`:"rgba(255,255,255,0.03)",
                            border:`0.5px solid ${isEq?item.color:canEquip?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)"}`,
                            color:isEq?item.color:canEquip?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)",
                            display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:60}}>
                          <span style={{fontSize:15}}>{item.icon}</span>
                          <span>{item.label}</span>
                          <span style={{fontSize:8,opacity:0.55}}>
                            {isEq?"equipped":count===0?"none":available===0?"last one":available+" avail"}
                          </span>
                        </button>);
                    })}
                    {slotItems.length === 0 && <div style={{fontSize:9,color:"rgba(255,255,255,0.12)"}}>nothing craftable</div>}
                  </div>
                </div>);
            })}
            <div onClick={()=>setPlayerGearOpen(false)} style={{position:"absolute",top:10,right:12,fontSize:20,color:"rgba(255,255,255,0.2)",cursor:"pointer",lineHeight:1}}>×</div>
          </div>
        </div>);
      })()}

      {/* ── Placement confirm overlay ──────────────────────────────────────── */}
      {pendingPlacement && selectedBuilding && selectedBuilding !== "wall" && (() => {
        const def = BUILDING_TYPES[pendingPlacement.type];
        const s2 = stateRef.current;
        const buildRadius2 = getBuildRadius(s2?.shelterLevel ?? 1);
        const inZone    = dist(pendingPlacement.x, pendingPlacement.y, SHELTER.x, SHELTER.y) <= buildRadius2;
        const notCenter = dist(pendingPlacement.x, pendingPlacement.y, SHELTER.x, SHELTER.y) >= MIN_BUILDING_SEP;
        const noCollide = !(s2?.buildings ?? []).some(b => dist(pendingPlacement.x, pendingPlacement.y, b.x, b.y) < MIN_BUILDING_SEP);
        const affordable = canAfford(storage, def.cost);
        const canConfirm = inZone && notCenter && noCollide && affordable;
        return (
          <div style={{
            position:"absolute", left:"50%", transform:"translateX(-50%)",
            bottom:8, zIndex:30,
            display:"flex", alignItems:"center", gap:10,
            background:"rgba(8,14,8,0.95)",
            border:`1.5px solid ${canConfirm ? "rgba(68,255,136,0.5)" : "rgba(255,80,80,0.4)"}`,
            borderRadius:16, padding:"10px 14px",
            boxShadow:"0 4px 24px rgba(0,0,0,0.6)",
            pointerEvents:"all",
          }}>
            <span style={{fontSize:20}}>{def.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:500}}>{def.label}</div>
              <div style={{fontSize:9,color:canConfirm?"rgba(68,255,136,0.6)":"#ff6666",marginTop:1}}>
                {canConfirm ? `Cost: ${costLabel(def.cost)}` :
                  !affordable ? `Need: ${costLabel(def.cost)}` :
                  !inZone ? "Out of build zone" :
                  !notCenter ? "Too close to shelter" : "Too close to a building"}
              </div>
            </div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",textAlign:"center",lineHeight:1.4,marginRight:4}}>tap map<br/>to move</div>
            <button onClick={cancelPlacement} style={{
              width:42,height:42,borderRadius:12,fontSize:20,
              background:"rgba(255,60,60,0.12)",border:"1px solid rgba(255,60,60,0.35)",
              color:"#ff6666",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
            }}>✕</button>
            <button onClick={confirmPlacement} disabled={!canConfirm} style={{
              width:52,height:42,borderRadius:12,fontSize:22,
              background:canConfirm?"rgba(68,255,136,0.18)":"rgba(255,255,255,0.03)",
              border:`1.5px solid ${canConfirm?"rgba(68,255,136,0.6)":"rgba(255,255,255,0.08)"}`,
              color:canConfirm?"#44ff88":"rgba(255,255,255,0.15)",
              cursor:canConfirm?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
            }}>✓</button>
          </div>
        );
      })()}

      {/* ── Run modal ─────────────────────────────────────────────────────── */}
      {runModal&&(()=>{
        const playerReady = runParty.includesPlayer && !isOnRun && needsReady(s?.playerNeeds);
        const gearList = [];
        if (playerReady) gearList.push(playerGearRef.current);
        runParty.survivorIds.forEach(id=>{const sv=s?.survivors.find(sv=>sv.id===id);if(sv&&!sv.onRun&&needsReady(sv.needs))gearList.push(sv.gear);});
        const gearBonus = calcRunGearBonus(gearList);
        const effectiveChance = Math.min(0.98, runModal.successChance + gearBonus);
        const partyNames = [];
        if (playerReady) partyNames.push("You");
        runParty.survivorIds.forEach(id=>{const sv=s?.survivors.find(sv=>sv.id===id);if(sv&&!sv.onRun&&needsReady(sv.needs))partyNames.push(sv.name);});
        // Selected but blocked by low needs (all needs must be above 50%)
        const blockedNames = [];
        if (runParty.includesPlayer && !isOnRun && !needsReady(s?.playerNeeds)) blockedNames.push("You");
        runParty.survivorIds.forEach(id=>{const sv=s?.survivors.find(sv=>sv.id===id);if(sv&&!sv.onRun&&!needsReady(sv.needs))blockedNames.push(sv.name);});
        const partySize = partyNames.length;
        return(
        <div onClick={()=>setRunModal(null)} style={{position:"absolute",inset:0,zIndex:20,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(300px,calc(100vw - 24px))",background:"#0b1410",border:`0.5px solid ${runModal.dangerColor}33`,borderRadius:18,padding:"20px 18px 18px",position:"relative",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
              <div style={{fontSize:30,lineHeight:1,flexShrink:0}}>{runModal.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:"rgba(255,255,255,0.9)",fontWeight:600}}>{runModal.name}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2}}>{runModal.subtitle}</div>
                <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{padding:"2px 7px",borderRadius:5,background:`${runModal.dangerColor}18`,border:`0.5px solid ${runModal.dangerColor}55`,fontSize:9,color:runModal.dangerColor,letterSpacing:"0.07em"}}>{runModal.dangerLabel}</div>
                  <div style={{fontSize:9,color:gearBonus>0?"#ffcc66":"rgba(255,255,255,0.25)"}}>
                    {runModal.duration}s · {Math.round(effectiveChance*100)}%{gearBonus>0?` (+${Math.round(gearBonus*100)}% gear)`:""}
                  </div>
                </div>
              </div>
            </div>
            {partySize > 0 && (
              <div style={{marginBottom:10,padding:"6px 10px",borderRadius:8,background:"rgba(68,136,204,0.08)",border:"0.5px solid rgba(68,136,204,0.2)",fontSize:9,color:"rgba(136,204,255,0.7)"}}>
                👥 {partyNames.join(", ")}
                {partySize > 1 && <span style={{color:"#ffcc66",marginLeft:6}}>+{Math.round((partySize-1)*30)}% loot</span>}
              </div>)}
            {partySize === 0 && (
              <div style={{marginBottom:10,padding:"6px 10px",borderRadius:8,background:"rgba(255,80,80,0.06)",border:"0.5px solid rgba(255,80,80,0.2)",fontSize:9,color:"rgba(255,100,100,0.7)"}}>
                ⚠ Select a party in the Runs tab before sending
              </div>)}
            {blockedNames.length > 0 && (
              <div style={{marginBottom:10,padding:"6px 10px",borderRadius:8,background:"rgba(255,180,60,0.07)",border:"0.5px solid rgba(255,180,60,0.25)",fontSize:9,color:"rgba(255,200,110,0.8)"}}>
                😴 Too worn down to scavenge: {blockedNames.join(", ")}. All needs must be above 50% — rest, eat & drink first.
              </div>)}
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",lineHeight:1.65,marginBottom:10,borderLeft:"2px solid rgba(255,255,255,0.06)",paddingLeft:10}}>{runModal.description}</div>
            <div style={{fontSize:9,color:"rgba(255,170,80,0.6)",marginBottom:14,padding:"6px 8px",borderRadius:6,background:"rgba(255,120,0,0.06)",border:"0.5px solid rgba(255,120,0,0.15)"}}>
              ⚠ Party members leave the map. Shelter defends itself. Needs still drain — equip 🥫🧴 to auto-sustain.
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:8,letterSpacing:"0.06em"}}>FOCUS — pick up to 2 for +50% yield</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RUN_LOOT_TYPES.map(lt=>{
                  const isFocused=runFocus.includes(lt.id);
                  return(
                    <button key={lt.id} onClick={()=>toggleFocus(lt.id)}
                      style={{padding:"6px 10px",borderRadius:8,fontSize:11,cursor:"pointer",
                        background:isFocused?`rgba(${hexToRgb(lt.color)},0.15)`:"rgba(255,255,255,0.03)",
                        border:`0.5px solid ${isFocused?lt.color:"rgba(255,255,255,0.1)"}`,
                        color:isFocused?lt.color:"rgba(255,255,255,0.45)"}}>
                      {lt.icon} {lt.label}{isFocused&&<span style={{fontSize:8,marginLeft:4,opacity:0.6}}>+50%</span>}
                    </button>);})}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:8,letterSpacing:"0.06em"}}>EXPECTED LOOT</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RUN_LOOT_TYPES.map(lt=>{
                  const [min,max]=runModal.baseLoot[lt.id];
                  const focused=runFocus.includes(lt.id);
                  let fmin=focused?Math.round(min*(1+runModal.focusBonus)):min;
                  let fmax=focused?Math.round(max*(1+runModal.focusBonus)):max;
                  if(partySize>1){fmin=Math.round(fmin*(1+(partySize-1)*0.3));fmax=Math.round(fmax*(1+(partySize-1)*0.3));}
                  return(
                    <div key={lt.id} style={{padding:"5px 9px",borderRadius:7,background:"rgba(255,255,255,0.03)",border:`0.5px solid ${focused?lt.color+"55":"rgba(255,255,255,0.07)"}`,fontSize:10,color:focused?lt.color:"rgba(255,255,255,0.4)"}}>
                      {lt.icon} {fmin}–{fmax}
                    </div>);})}
              </div>
            </div>
            <button onClick={()=>startRun(runModal)} disabled={partySize===0}
              style={{width:"100%",padding:"12px",borderRadius:10,fontSize:12,fontWeight:600,letterSpacing:"0.06em",
                cursor:partySize>0?"pointer":"default",
                background:partySize>0?`linear-gradient(135deg,${runModal.dangerColor}22,${runModal.dangerColor}11)`:"rgba(255,255,255,0.03)",
                border:`1px solid ${partySize>0?runModal.dangerColor+"66":"rgba(255,255,255,0.08)"}`,
                color:partySize>0?runModal.dangerColor:"rgba(255,255,255,0.2)"}}>
              {partySize>0?`SEND · ${partyNames.join("+")} · ${runModal.duration}s`:"SELECT A PARTY FIRST"}
            </button>
            <div onClick={()=>setRunModal(null)} style={{position:"absolute",top:12,right:14,fontSize:20,color:"rgba(255,255,255,0.2)",cursor:"pointer",lineHeight:1}}>×</div>
          </div>
        </div>);
      })()}

      {/* ── Run result ────────────────────────────────────────────────────── */}
      {runResult&&(
        <div onClick={()=>setRunResult(null)} style={{position:"absolute",inset:0,zIndex:20,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(290px,calc(100vw - 24px))",background:"#0b1410",border:`0.5px solid ${runResult.success?"rgba(68,204,102,0.3)":"rgba(204,50,50,0.3)"}`,borderRadius:18,padding:"22px 18px 18px",position:"relative",textAlign:"center",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{fontSize:28,marginBottom:8}}>{runResult.success?"✅":"💀"}</div>
            <div style={{fontSize:16,color:runResult.success?"#44cc66":"#cc3333",fontWeight:700,letterSpacing:"0.04em",marginBottom:4}}>
              {runResult.success?"BACK SAFE":"DIDN'T MAKE IT"}
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:4}}>{runResult.run.icon} {runResult.run.name}</div>
            {runResult.gearBonus>0&&<div style={{fontSize:9,color:"#ffcc66",marginBottom:12}}>gear bonus: +{Math.round(runResult.gearBonus*100)}% success</div>}
            {runResult.success&&runResult.loot&&(
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:10,letterSpacing:"0.06em"}}>LOOT COLLECTED</div>
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:18}}>
                  {RUN_LOOT_TYPES.map(lt=>{
                    const qty=runResult.loot[lt.id]??0;
                    if(!qty)return null;
                    return(
                      <div key={lt.id} style={{padding:"8px 12px",borderRadius:10,background:`rgba(${hexToRgb(lt.color)},0.1)`,border:`0.5px solid ${lt.color}44`,textAlign:"center"}}>
                        <div style={{fontSize:18,lineHeight:1}}>{lt.icon}</div>
                        <div style={{fontSize:13,color:lt.color,fontWeight:600,marginTop:3}}>+{qty}</div>
                        <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",marginTop:1}}>{lt.label}</div>
                      </div>);})}
                </div>
              </div>)}
            {!runResult.success&&<div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:18}}>Nothing recovered. Gear up before going back.</div>}
            <div style={{display:"flex",gap:8,marginBottom:0}}>
              <button onClick={()=>setRunResult(null)}
                style={{flex:1,padding:"10px",borderRadius:10,fontSize:11,cursor:"pointer",
                  background:"rgba(255,255,255,0.04)",border:"0.5px solid rgba(255,255,255,0.12)",
                  color:"rgba(255,255,255,0.5)",letterSpacing:"0.05em"}}>
                CLOSE
              </button>
              <button onClick={()=>{ const run=runResult.run; const prevPartyIds=runResult.partyIds; const prevIncludesPlayer=runResult.includesPlayer; setRunResult(null); setRunModal(run); setRunFocus([]); setRunParty({ survivorIds: prevPartyIds??[], includesPlayer: prevIncludesPlayer??false }); }}
                style={{flex:1,padding:"10px",borderRadius:10,fontSize:11,cursor:"pointer",fontWeight:600,
                  background:`linear-gradient(135deg,${runResult.run.dangerColor}22,${runResult.run.dangerColor}11)`,
                  border:`1px solid ${runResult.run.dangerColor}66`,
                  color:runResult.run.dangerColor,letterSpacing:"0.05em"}}>
                🔁 RUN AGAIN
              </button>
            </div>
            <div onClick={()=>setRunResult(null)} style={{position:"absolute",top:12,right:14,fontSize:20,color:"rgba(255,255,255,0.2)",cursor:"pointer",lineHeight:1}}>×</div>
          </div>
        </div>)}
    </div>{/* inner flex column */}
    </div>/* outer fixed */
  );
}