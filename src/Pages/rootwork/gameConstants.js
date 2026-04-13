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
    upgradeCost: 100,
    description: "Harvests 2 plots every 6s. Double the coverage.",
  },
  tractor: {
    id: "tractor",
    name: "Tractor",
    emoji: "🚜",
    plotsPerCycle: 5,
    cycleSeconds: 6,
    upgradeCost: 100,
    description: "Harvests 5 plots every 6s. Near full automation.",
  },
};
 
export const GEAR_ORDER = ["bare_hands", "gloves", "hoe", "wheelbarrow", "tractor"];
 
export const GEAR_CROP_COSTS = {
  bare_hands: null,
  gloves: "wheat",
  hoe: "wheat",
  wheelbarrow: "berries",
  tractor: "tomatoes",
};
 
// ─── Specialization ───────────────────────────────────────────────────────────
export const SPECIALIZE_COST = 50;
export const SPECIALIZE_CROP = "berries";
 
// ─── Plot unlock costs ────────────────────────────────────────────────────────
export const PLOT_BASE_COST = 5;
export const PLOT_COST_MULTIPLIER = 1.4;
export const MAX_PLOTS = 25;
 
// ─── Plot upgrade ─────────────────────────────────────────────────────────────
export const PLOT_UPGRADE_COST = 1;
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
    inputCrop: "wheat", inputAmount: 20,
    outputGood: "bread", outputAmount: 1, seconds: 120,
    description: "Upgrade a Wheat plot — 50% faster grow time.",
  },
  jam: {
    id: "jam", name: "Jam", emoji: "🍯",
    inputCrop: "berries", inputAmount: 15,
    outputGood: "jam", outputAmount: 1, seconds: 180,
    description: "Upgrade a Berry plot — 50% faster grow time.",
  },
  sauce: {
    id: "sauce", name: "Sauce", emoji: "🥫",
    inputCrop: "tomatoes", inputAmount: 10,
    outputGood: "sauce", outputAmount: 1, seconds: 240,
    description: "Upgrade a Tomato plot — 50% faster grow time.",
  },
  feast: {
    id: "feast", name: "Feast", emoji: "🍽️",
    inputCrop: null,
    description: "Permanent global grow speed bonus for all farms. Stackable.",
  },
};
 
// ─── Feast tiers ──────────────────────────────────────────────────────────────
export const FEAST_TIERS = [
  { cost: 5,    bonusPercent: 1  },
  { cost: 15,   bonusPercent: 2  },
  { cost: 40,   bonusPercent: 3  },
  { cost: 100,  bonusPercent: 5  },
  { cost: 250,  bonusPercent: 8  },
  { cost: 600,  bonusPercent: 12 },
  { cost: 1000, bonusPercent: 19 },
];
export const FEAST_MAX_BONUS = 50;
 
// ─── Market ───────────────────────────────────────────────────────────────────
export const MARKET_SELL_RATES = {
  wheat: 1, berries: 2, tomatoes: 3,
  bread: 4, jam: 6, sauce: 8, feast: 15,
};
export const MARKET_SELL_RATE_PER_SECOND = 1;
 
// ─── Kitchen purchase ─────────────────────────────────────────────────────────
export const KITCHEN_BASE_COST = 20;
export const KITCHEN_SLOT_COSTS = [50, 150]; // slot 2, slot 3
 
// Ordered: speed first, auto-restart last (best)
export const KITCHEN_SLOT_UPGRADES = {
  speed_1: {
    id: "speed_1", name: "Speed Boost I", emoji: "⚡",
    cost: 30,
    description: "+25% processing speed for this slot.",
    speedMultiplier: 0.75,
  },
  speed_2: {
    id: "speed_2", name: "Speed Boost II", emoji: "⚡⚡",
    cost: 50,
    description: "+50% processing speed for this slot (replaces Speed I).",
    speedMultiplier: 0.5,
    requires: "speed_1",
  },
  auto_restart: {
    id: "auto_restart", name: "Auto-Restart", emoji: "🔄",
    cost: 100,
    description: "Automatically restarts this recipe when it finishes.",
  },
};
export const KITCHEN_UPGRADE_ORDER = ["speed_1", "speed_2", "auto_restart"];
 
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
export const PRESTIGE_CASH_THRESHOLDS = [100, 200, 400]; // seasons 1→2, 2→3, 3→4
export const PRESTIGE_CASH_THRESHOLD_INCREMENT = 200;
 
export function getPrestigeCashThreshold(currentSeason) {
  if (currentSeason <= 3) return PRESTIGE_CASH_THRESHOLDS[currentSeason - 1];
  return 400 + (currentSeason - 3) * PRESTIGE_CASH_THRESHOLD_INCREMENT;
}
 
// ─── Extra farm unlocks (season 4+) ──────────────────────────────────────────
// Each prestige from season 4 onward offers a new farm slot purchased with cash.
// extraFarmIndex 0 = first extra farm, 1 = second, etc.
export const FARM_UNLOCK_BASE_COST = 300;
export const FARM_UNLOCK_COST_INCREMENT = 200;
 
export function getFarmUnlockCost(extraFarmIndex) {
  return FARM_UNLOCK_BASE_COST + extraFarmIndex * FARM_UNLOCK_COST_INCREMENT;
}
 
export const EXTRA_FARM_CROPS = ["wheat", "berries", "tomatoes"];
 
// ─── Season structure ─────────────────────────────────────────────────────────
// Fixed farms for seasons 1-3. Season 4+ gets extra farms via cash unlock.
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
export const MAX_OFFLINE_SECONDS = 86_400;