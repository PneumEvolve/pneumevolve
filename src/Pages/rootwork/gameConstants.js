// src/Pages/rootwork/gameConstants.js
 
// ─── Crops ────────────────────────────────────────────────────────────────────
export const CROPS = {
  wheat: {
    id: "wheat",
    name: "Wheat",
    emoji: "🌾",
    growTime: 15,
    manualYield: 3,
    workerYield: 2,
    season: 1,
  },
  berries: {
    id: "berries",
    name: "Berries",
    emoji: "🫐",
    growTime: 30,
    manualYield: 3,
    workerYield: 2,
    season: 2,
  },
  tomatoes: {
    id: "tomatoes",
    name: "Tomatoes",
    emoji: "🍅",
    growTime: 60,
    manualYield: 3,
    workerYield: 2,
    season: 3,
  },
};
 
// ─── Gear ─────────────────────────────────────────────────────────────────────
export const GEAR = {
  bare_hands: {
    id: "bare_hands",
    name: "Bare Hands",
    emoji: "🤲",
    plotsPerCycle: 1,
    cycleSeconds: 15,
    upgradeCost: null,
    description: "Harvests 1 plot every 15s.",
  },
  gloves: {
    id: "gloves",
    name: "Gloves",
    emoji: "🧤",
    plotsPerCycle: 1,
    cycleSeconds: 10,
    upgradeCost: 30,
    description: "Harvests 1 plot every 10s. 33% faster.",
  },
  hoe: {
    id: "hoe",
    name: "Hoe",
    emoji: "🪓",
    plotsPerCycle: 1,
    cycleSeconds: 6,
    upgradeCost: 200,
    description: "Harvests 1 plot every 6s. More than 2x faster than gloves.",
  },
  wheelbarrow: {
    id: "wheelbarrow",
    name: "Wheelbarrow",
    emoji: "🛻",
    plotsPerCycle: 2,
    cycleSeconds: 6,
    upgradeCost: 500,
    description: "Harvests 2 plots every 6s. Double the coverage.",
  },
  tractor: {
    id: "tractor",
    name: "Tractor",
    emoji: "🚜",
    plotsPerCycle: 5,
    cycleSeconds: 6,
    upgradeCost: 1500,
    description: "Harvests 5 plots every 6s. Near full automation.",
  },
};
 
export const GEAR_ORDER = ["bare_hands", "gloves", "hoe", "wheelbarrow", "tractor"];
 
// Which crop pays for each gear upgrade
export const GEAR_CROP_COSTS = {
  bare_hands: null,
  gloves: "wheat",
  hoe: "berries",
  wheelbarrow: "berries",
  tractor: "tomatoes",
};
 
// ─── Plot unlock costs ────────────────────────────────────────────────────────
export const PLOT_COSTS = [
  { upTo: 4,  cost: 20  },
  { upTo: 9,  cost: 50  },
  { upTo: 16, cost: 120 },
  { upTo: 25, cost: 300 },
];
 
export const MAX_PLOTS = 25;
 
// ─── Workers ──────────────────────────────────────────────────────────────────
export const WORKER_HIRE_COST = 30;
 
// Worker specializations unlock Season 4+
export const SPECIALIZATIONS = {
  none: {
    id: "none",
    name: "General",
    description: "No specialization.",
  },
  harvester: {
    id: "harvester",
    name: "Harvester",
    description: "Harvests 25% faster. Cycle time reduced by 25%.",
    cycleMultiplier: 0.75,
  },
  sprinter: {
    id: "sprinter",
    name: "Sprinter",
    description: "Harvests 2x plots per cycle but rests every 3rd cycle. Best for large farms.",
    plotsMultiplier: 2,
    restEvery: 3,
  },
  grower: {
    id: "grower",
    name: "Grower",
    description: "Reduces grow time for ALL plots on this farm by 20%. Stacks with multiple growers.",
    growMultiplier: 0.8,
  },
};
 
// ─── Tend tool ────────────────────────────────────────────────────────────────
// Tapping a growing plot in tend mode shaves this many seconds off grow time
export const TEND_SECONDS = 3;
 
// ─── Processing recipes ───────────────────────────────────────────────────────
export const PROCESSING_RECIPES = {
  jam: {
    id: "jam",
    name: "Jam",
    emoji: "🍯",
    inputs: { wheat: 50, berries: 20 },
    outputAmount: 10,
    seconds: 600,
    season: 3,
  },
  sauce: {
    id: "sauce",
    name: "Sauce",
    emoji: "🥫",
    inputs: { berries: 40, tomatoes: 15 },
    outputAmount: 8,
    seconds: 900,
    season: 3,
  },
  feast: {
    id: "feast",
    name: "Feast",
    emoji: "🍽️",
    inputs: { wheat: 30, berries: 30, tomatoes: 30 },
    outputAmount: 5,
    seconds: 1800,
    season: 4,
  },
};
 
// ─── Prestige bonuses ─────────────────────────────────────────────────────────
export const PRESTIGE_BONUSES = {
  bumper_crop: {
    id: "bumper_crop",
    name: "Bumper Crop",
    emoji: "📈",
    description: "+10% yield on all harvests. Fractional yield accumulates and pays out as whole crops.",
  },
  head_start: {
    id: "head_start",
    name: "Head Start",
    emoji: "🙋",
    description: "Start each season with 1 free worker already hired on every available farm.",
  },
  fast_hands: {
    id: "fast_hands",
    name: "Fast Hands",
    emoji: "🧤",
    description: "All newly hired workers start with Gloves instead of Bare Hands.",
  },
  bigger_kitchen: {
    id: "bigger_kitchen",
    name: "Bigger Kitchen",
    emoji: "🏭",
    description: "Processing queue holds one extra item.",
  },
};
 
// ─── Season structure ─────────────────────────────────────────────────────────
export const SEASON_FARMS = {
  1: ["wheat"],
  2: ["wheat", "berries"],
  3: ["wheat", "berries", "tomatoes"],
  4: ["wheat", "berries", "tomatoes"],
};
 
export const MAX_SEASON = 4;
 
// ─── Automation threshold ─────────────────────────────────────────────────────
export const AUTOMATION_THRESHOLD = 3;
 
// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 30_000;
 
// ─── Offline progress ─────────────────────────────────────────────────────────
export const MAX_OFFLINE_SECONDS = 86_400;