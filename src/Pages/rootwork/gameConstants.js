// src/Pages/rootwork/gameConstants.js
 
// ─── Crops ────────────────────────────────────────────────────────────────────
// growTime: seconds for a plot to go from planted → ready
// manualYield: crops gained from a manual harvest
// workerYield: crops gained from a worker harvest
// season: which season unlocks this crop
 
export const CROPS = {
  wheat: {
    id: "wheat",
    name: "Wheat",
    emoji: "🌾",
    growTime: 15,
    manualYield: 3,   // +1 bonus for active play
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
// plotsPerCycle: how many plots a worker harvests per cycle
// cycleSeconds: how long one harvest cycle takes
// upgradeCost: cost in that farm's crop to upgrade to this tier (null = starting gear)
 
export const GEAR = {
  bare_hands: {
    id: "bare_hands",
    name: "Bare Hands",
    emoji: "🤲",
    plotsPerCycle: 1,
    cycleSeconds: 15,
    upgradeCost: null,
  },
  gloves: {
    id: "gloves",
    name: "Gloves",
    emoji: "🧤",
    plotsPerCycle: 1,
    cycleSeconds: 10,
    upgradeCost: 80,
  },
  hoe: {
    id: "hoe",
    name: "Hoe",
    emoji: "🪓",
    plotsPerCycle: 1,
    cycleSeconds: 6,
    upgradeCost: 200,
  },
  wheelbarrow: {
    id: "wheelbarrow",
    name: "Wheelbarrow",
    emoji: "🛻",
    plotsPerCycle: 2,
    cycleSeconds: 6,
    upgradeCost: 500,
  },
  tractor: {
    id: "tractor",
    name: "Tractor",
    emoji: "🚜",
    plotsPerCycle: 5,
    cycleSeconds: 6,
    upgradeCost: 1500,
  },
};
 
export const GEAR_ORDER = ["bare_hands", "gloves", "hoe", "wheelbarrow", "tractor"];
 
// ─── Plot unlock costs ────────────────────────────────────────────────────────
// Cost in that farm's crop to unlock one additional plot
// plotNumber is 1-indexed (plot 1 is free, buying plot 2 costs PLOT_COSTS[0] etc.)
 
export const PLOT_COSTS = [
  { upTo: 4,  cost: 20  },  // plots 2–4
  { upTo: 9,  cost: 50  },  // plots 5–9
  { upTo: 16, cost: 120 },  // plots 10–16
  { upTo: 25, cost: 300 },  // plots 17–25
];
 
export const MAX_PLOTS = 25;
 
// ─── Workers ──────────────────────────────────────────────────────────────────
export const WORKER_HIRE_COST = 30; // in that farm's crop
 
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
    description: "Harvests 25% faster.",
    cycleMultiplier: 0.75, // multiply cycleSeconds by this
  },
  planter: {
    id: "planter",
    name: "Planter",
    description: "Replants immediately after harvesting.",
    instantReplant: true,
  },
  tender: {
    id: "tender",
    name: "Tender",
    description: "Reduces grow time on assigned plots by 20%.",
    growMultiplier: 0.8,
  },
};
 
// ─── Processing recipes ───────────────────────────────────────────────────────
// inputs: crop amounts consumed
// outputAmount: processed goods produced
// seconds: real time to complete
// season: which season unlocks this recipe
 
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
// Picked once per prestige, stack across seasons
 
export const PRESTIGE_BONUSES = {
  yield_boost: {
    id: "yield_boost",
    name: "Bumper Crop",
    emoji: "📈",
    description: "+10% yield on all farms forever.",
  },
  gear_carry: {
    id: "gear_carry",
    name: "Well Worn Tools",
    emoji: "🧤",
    description: "Workers keep 50% of their gear progress on prestige.",
  },
  processing_slot: {
    id: "processing_slot",
    name: "Bigger Kitchen",
    emoji: "🏭",
    description: "Processing queue holds one extra item.",
  },
  free_worker: {
    id: "free_worker",
    name: "Helping Hand",
    emoji: "🙋",
    description: "Start each season with one free worker.",
  },
};
 
// ─── Season structure ─────────────────────────────────────────────────────────
// Which farms are available each season
 
export const SEASON_FARMS = {
  1: ["wheat"],
  2: ["wheat", "berries"],
  3: ["wheat", "berries", "tomatoes"],
  4: ["wheat", "berries", "tomatoes"], // processing + specializations unlock
};
 
// How many seasons before the game loops (can extend later)
export const MAX_SEASON = 4;
 
// ─── Automation threshold ─────────────────────────────────────────────────────
// A farm is considered "automated" when it has at least this many workers
export const AUTOMATION_THRESHOLD = 1;
 
// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 30_000; // autosave every 30 seconds
 
// ─── Offline progress ─────────────────────────────────────────────────────────
// Max seconds of offline progress to calculate (24 hours)
export const MAX_OFFLINE_SECONDS = 86_400;