// src/Pages/rootwork/gameConstants.js

// ─── Crops ────────────────────────────────────────────────────────────────────
export const CROPS = {
  wheat: {
    id: "wheat",
    name: "Wheat",
    emoji: "🌾",
    growTime: 12,       // slightly faster — season 1 should feel productive
    manualYield: 3,
    workerYield: 2,
    season: 1,
  },
  berries: {
    id: "berries",
    name: "Berries",
    emoji: "🫐",
    growTime: 25,       // slightly faster
    manualYield: 3,
    workerYield: 2,
    season: 2,
  },
  tomatoes: {
    id: "tomatoes",
    name: "Tomatoes",
    emoji: "🍅",
    growTime: 60,       // stays slow — season 3 luxury crop
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
    description: "Harvests and replants 1 plot every 15s.",
  },
  gloves: {
    id: "gloves",
    name: "Gloves",
    emoji: "🧤",
    plotsPerCycle: 1,
    cycleSeconds: 10,
    upgradeCost: 15,       // cash
    description: "Harvests and replants 1 plot every 10s. 33% faster.",
  },
  hoe: {
    id: "hoe",
    name: "Hoe",
    emoji: "🪓",
    plotsPerCycle: 1,
    cycleSeconds: 6,
    upgradeCost: 60,       // cash
    description: "Harvests and replants 1 plot every 6s. 40% faster than gloves.",
  },
  wheelbarrow: {
    id: "wheelbarrow",
    name: "Wheelbarrow",
    emoji: "🛻",
    plotsPerCycle: 2,
    cycleSeconds: 6,
    upgradeCost: 150,      // cash
    description: "Harvests and replants 2 plots every 6s. Double the coverage.",
  },
  tractor: {
    id: "tractor",
    name: "Tractor",
    emoji: "🚜",
    plotsPerCycle: 5,
    cycleSeconds: 6,
    upgradeCost: 400,      // cash
    description: "Harvests and replants 5 plots every 6s. Near full automation.",
  },
};

export const GEAR_ORDER = ["bare_hands", "gloves", "hoe", "wheelbarrow", "tractor"];

// All gear now costs cash — crop costs removed
export const GEAR_CROP_COSTS = {};

// ─── Specialization ───────────────────────────────────────────────────────────
export const SPECIALIZE_COST = 100;       // cash
export const SPECIALIZE_CROP = null;      // no longer crop-based

// ─── Plot unlock costs ────────────────────────────────────────────────────────
export const PLOT_BASE_COST = 5;
export const PLOT_COST_MULTIPLIER = 1.4;
export const MAX_PLOTS = 9;

// ─── Farm investments ─────────────────────────────────────────────────────────
// Per-farm upgrades purchased with cash

export const FARM_INVESTMENT_PLOT_CAP = [
  { id: "plots_4x4", name: "Expand to 4×4", maxPlots: 16, cost: 500,  description: "Unlock up to 16 plots on this farm." },
  { id: "plots_5x5", name: "Expand to 5×5", maxPlots: 25, cost: 1200, description: "Unlock up to 25 plots on this farm." },
];

export const FARM_INVESTMENT_YIELD = [
  { id: "yield_1", name: "Fertilizer I",   bonusYield: 1, cost: 300,  description: "+1 crop per worker harvest." },
  { id: "yield_2", name: "Fertilizer II",  bonusYield: 2, cost: 700,  description: "+2 crops per worker harvest." },
  { id: "yield_3", name: "Fertilizer III", bonusYield: 3, cost: 1500, description: "+3 crops per worker harvest." },
  { id: "yield_4", name: "Fertilizer IV",  bonusYield: 4, cost: 3000, description: "+4 crops per worker harvest." },
];

// ─── Plot upgrade ─────────────────────────────────────────────────────────────
export const PLOT_UPGRADE_COST = 1;
export const PLOT_UPGRADE_BASE_COST = 1;
export const PLOT_UPGRADE_GROW_MULTIPLIER = 0.5;

export const CROP_ARTISAN = {
  wheat: "bread",
  berries: "jam",
  tomatoes: "sauce",
};

// ─── Worker hire cost ─────────────────────────────────────────────────────────
export const WORKER_HIRE_BASE_COST = 10;
export const WORKER_HIRE_MULTIPLIER = 1.5;

// ─── Automation requirements ──────────────────────────────────────────────────
export const AUTOMATION_THRESHOLD = 4;
export const MIN_PLOTS_FOR_AUTOMATION = 4;

// ─── Worker specializations ───────────────────────────────────────────────────
export const SPECIALIZATIONS = {
  none: { id: "none", name: "General", description: "No specialization." },
  harvester: {
    id: "harvester", name: "Harvester", emoji: "⚡",
    description: "Harvests 25% faster. Cycle time reduced by 25%.",
    cycleMultiplier: 0.75,
  },
  sprinter: {
    id: "sprinter", name: "Sprinter", emoji: "💨",
    description: "Harvests 2x plots per cycle but rests every 3rd cycle.",
    plotsMultiplier: 2, restEvery: 3,
  },
  grower: {
    id: "grower", name: "Grower", emoji: "🌱",
    description: "Reduces grow time for ALL plots on this farm by 20%. Stacks.",
    growMultiplier: 0.8,
  },
};

// ─── Tend tool ────────────────────────────────────────────────────────────────
export const TEND_SECONDS = 3;

// ─── Processing recipes ───────────────────────────────────────────────────────
export const PROCESSING_RECIPES = {
  bread: {
    id: "bread", name: "Bread", emoji: "🍞",
    inputCrop: "wheat", inputAmount: 40,    // was 200 — 4-5 workers can feed this
    outputGood: "bread", outputAmount: 1, seconds: 90,  // slightly faster
    description: "Bake bread from wheat. Used for plot upgrades and feasts.",
  },
  jam: {
    id: "jam", name: "Jam", emoji: "🍯",
    inputCrop: "berries", inputAmount: 30,  // was 150
    outputGood: "jam", outputAmount: 1, seconds: 120,
    description: "Craft jam from berries. Used for plot upgrades and feasts.",
  },
  sauce: {
    id: "sauce", name: "Sauce", emoji: "🥫",
    inputCrop: "tomatoes", inputAmount: 20, // was 100
    outputGood: "sauce", outputAmount: 1, seconds: 150,
    description: "Make sauce from tomatoes. Used for plot upgrades and feasts.",
  },
};

// ─── Feast tiers ──────────────────────────────────────────────────────────────
export const FEAST_TIERS = [
  { cost: 3,   bonusPercent: 1  },
  { cost: 6,   bonusPercent: 2  },
  { cost: 12,  bonusPercent: 3  },
  { cost: 25,  bonusPercent: 5  },
  { cost: 50,  bonusPercent: 8  },
  { cost: 100, bonusPercent: 12 },
  { cost: 200, bonusPercent: 19 },
];
export const FEAST_MAX_BONUS = 50;

// ─── Market ───────────────────────────────────────────────────────────────────
export const MARKET_SELL_RATES = {
  wheat: 0.5,
  berries: 1,
  tomatoes: 2,
  bread: 30,
  jam: 50,
  sauce: 80,
};

// ─── Market workers ───────────────────────────────────────────────────────────
export const MARKET_WORKER_HIRE_COST = 25;
export const MARKET_WORKER_HIRE_MULTIPLIER = 2.5;

export const MARKET_WORKER_GEAR = {
  cart: {
    id: "cart",
    name: "Cart",
    emoji: "🛒",
    itemsPerSecond: 1,
    upgradeCost: null,
    description: "Sells 1 item per second.",
  },
  wagon: {
    id: "wagon",
    name: "Wagon",
    emoji: "🪵",
    itemsPerSecond: 2,
    upgradeCost: 120,
    description: "Sells 2 items per second.",
  },
  truck: {
    id: "truck",
    name: "Truck",
    emoji: "🚚",
    itemsPerSecond: 4,
    upgradeCost: 400,
    description: "Sells 4 items per second.",
  },
};
export const MARKET_WORKER_GEAR_ORDER = ["cart", "wagon", "truck"];

export const MARKET_WORKER_STANDING_ORDER_COST = 250;  // cash

// ─── Kitchen workers ──────────────────────────────────────────────────────────
export const KITCHEN_WORKER_HIRE_COST = 30;
export const KITCHEN_WORKER_HIRE_MULTIPLIER = 2.5;

export const KITCHEN_WORKER_UPGRADES = {
  speed_1: {
    id: "speed_1",
    name: "Sharp Knife",
    emoji: "🔪",
    cost: 80,
    description: "+25% processing speed.",
    speedMultiplier: 0.75,
    tree: "speed",
  },
  speed_2: {
    id: "speed_2",
    name: "Prep Station",
    emoji: "🍳",
    cost: 250,
    description: "+50% processing speed (replaces Sharp Knife).",
    speedMultiplier: 0.5,
    requires: "speed_1",
    tree: "speed",
  },
  auto_restart: {
    id: "auto_restart",
    name: "Auto-Restart",
    emoji: "🔄",
    cost: 600,
    description: "Automatically restarts recipe when finished.",
    requires: "speed_2",
    tree: "speed",
  },
  batch_2: {
    id: "batch_2",
    name: "Batch ×2",
    emoji: "📦",
    cost: 800,
    description: "Double input, double output per run.",
    batchSize: 2,
    tree: "batch",
  },
  batch_5: {
    id: "batch_5",
    name: "Batch ×5",
    emoji: "📦📦",
    cost: 2000,
    description: "5× input, 5× output per run.",
    batchSize: 5,
    requires: "batch_2",
    tree: "batch",
  },
  batch_10: {
    id: "batch_10",
    name: "Batch ×10",
    emoji: "📦📦📦",
    cost: 5000,
    description: "10× input, 10× output per run.",
    batchSize: 10,
    requires: "batch_5",
    tree: "batch",
  },
};

export const KITCHEN_WORKER_UPGRADE_ORDER = [
  "speed_1", "speed_2", "auto_restart",
  "batch_2", "batch_5", "batch_10",
];

// ─── Legacy kitchen constants (kept for migration in deserializeState) ────────
export const KITCHEN_BASE_COST = 20;
export const KITCHEN_SLOT_COSTS = [50, 150];
export const KITCHEN_SLOT_UPGRADES = {
  speed_1: { speedMultiplier: 0.75 },
  speed_2: { speedMultiplier: 0.5 },
};

// ─── Prestige bonuses ─────────────────────────────────────────────────────────
export const PRESTIGE_BONUSES = {
  bumper_crop: {
    id: "bumper_crop", name: "Bumper Crop", emoji: "📈",
    description: "+10% yield on all harvests. Fractional yield accumulates.",
  },
  head_start: {
    id: "head_start", name: "Head Start", emoji: "🙋",
    description: "Start each season with 1 free worker on every available farm.",
  },
  fast_hands: {
    id: "fast_hands", name: "Fast Hands", emoji: "🧤",
    description: "All newly hired workers start with Gloves instead of Bare Hands.",
  },
  market_savvy: {
    id: "market_savvy", name: "Market Savvy", emoji: "💹",
    description: "All market sell prices permanently +25%. Stacks.",
  },
};

// ─── Prestige cash thresholds ─────────────────────────────────────────────────
export const PRESTIGE_CASH_THRESHOLDS = [150, 400, 800];
export const PRESTIGE_CASH_THRESHOLD_INCREMENT = 400;

export function getPrestigeCashThreshold(currentSeason) {
  if (currentSeason <= 3) return PRESTIGE_CASH_THRESHOLDS[currentSeason - 1];
  return 400 + (currentSeason - 3) * PRESTIGE_CASH_THRESHOLD_INCREMENT;
}

// ─── Extra farm unlocks (season 4+) ──────────────────────────────────────────
export const FARM_UNLOCK_BASE_COST = 300;
export const FARM_UNLOCK_COST_INCREMENT = 200;

export function getFarmUnlockCost(extraFarmIndex) {
  return FARM_UNLOCK_BASE_COST + extraFarmIndex * FARM_UNLOCK_COST_INCREMENT;
}

export const EXTRA_FARM_CROPS = ["wheat", "berries", "tomatoes"];

// ─── Season structure ─────────────────────────────────────────────────────────
export const SEASON_FARMS = {
  1: ["wheat"],
  2: ["wheat", "berries"],
  3: ["wheat", "berries", "tomatoes"],
};

export const FIRST_EXTRA_FARM_SEASON = 4;
export const MAX_SEASON = 999;

// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 30_000;
export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;