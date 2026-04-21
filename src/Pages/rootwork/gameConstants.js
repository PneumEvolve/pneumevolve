// src/Pages/rootwork/gameConstants.js
 
// ─── Crops ────────────────────────────────────────────────────────────────────
export const CROPS = {
  wheat:    { id: "wheat",    name: "Wheat",    emoji: "🌾", growTime: 12, manualYield: 3, workerYield: 2, season: 1 },
  berries:  { id: "berries",  name: "Berries",  emoji: "🫐", growTime: 25, manualYield: 3, workerYield: 2, season: 2 },
  tomatoes: { id: "tomatoes", name: "Tomatoes", emoji: "🍅", growTime: 60, manualYield: 3, workerYield: 2, season: 3 },
};
 
// ─── Gear ─────────────────────────────────────────────────────────────────────
export const GEAR = {
  bare_hands:  { id: "bare_hands",  name: "Bare Hands",  emoji: "🤲", plotsPerCycle: 1, cycleSeconds: 15, upgradeCost: null, description: "Harvests and replants 1 plot every 15s." },
  gloves:      { id: "gloves",      name: "Gloves",      emoji: "🧤", plotsPerCycle: 1, cycleSeconds: 10, upgradeCost: 15,   description: "Harvests and replants 1 plot every 10s. 33% faster." },
  hoe:         { id: "hoe",         name: "Hoe",         emoji: "🪓", plotsPerCycle: 1, cycleSeconds: 6,  upgradeCost: 60,   description: "Harvests and replants 1 plot every 6s. 40% faster than gloves." },
  wheelbarrow: { id: "wheelbarrow", name: "Wheelbarrow", emoji: "🛻", plotsPerCycle: 2, cycleSeconds: 6,  upgradeCost: 150,  description: "Harvests and replants 2 plots every 6s. Double the coverage." },
  tractor:     { id: "tractor",     name: "Tractor",     emoji: "🚜", plotsPerCycle: 5, cycleSeconds: 6,  upgradeCost: 500,  description: "Harvests and replants 5 plots every 6s. Near full automation." },
};
 
export const GEAR_ORDER = ["bare_hands", "gloves", "hoe", "wheelbarrow", "tractor"];
export const GEAR_CROP_COSTS = {};
 
// ─── Specialization ───────────────────────────────────────────────────────────
export const SPECIALIZE_COST = 100;
export const SPECIALIZE_CROP = null;
 
// ─── Plot unlock costs ────────────────────────────────────────────────────────
export const PLOT_BASE_COST = 3;
export const PLOT_COST_MULTIPLIER = 1.4;
export const MAX_PLOTS = 9;
 
// ─── Farm investments ─────────────────────────────────────────────────────────
export const FARM_INVESTMENT_PLOT_CAP = [
  { id: "plots_4x4", name: "Expand to 4×4", maxPlots: 16, cost: 500,    description: "Unlock up to 16 plots on this farm." },
  { id: "plots_5x5", name: "Expand to 5×5", maxPlots: 25, cost: 5000,   description: "Unlock up to 25 plots on this farm." },
  { id: "plots_6x6", name: "Expand to 6×6", maxPlots: 36, cost: 20000,  description: "Unlock up to 36 plots on this farm." },
];
 
export const FARM_INVESTMENT_YIELD = [
  { id: "yield_1", name: "Fertilizer I",   bonusYield: 1, cost: 1000,  description: "+1 crop per worker harvest." },
  { id: "yield_2", name: "Fertilizer II",  bonusYield: 2, cost: 5000,  description: "+2 crops per worker harvest." },
  { id: "yield_3", name: "Fertilizer III", bonusYield: 3, cost: 15000, description: "+3 crops per worker harvest." },
  { id: "yield_4", name: "Fertilizer IV",  bonusYield: 4, cost: 40000, description: "+4 crops per worker harvest." },
];
 
// ─── Plot upgrade ─────────────────────────────────────────────────────────────
export const PLOT_UPGRADE_COST = 1;
export const PLOT_UPGRADE_BASE_COST = 1;
export const PLOT_UPGRADE_GROW_MULTIPLIER = 0.5;
export const CROP_ARTISAN = { wheat: "bread", berries: "jam", tomatoes: "sauce" };
 
// ─── Worker hire cost ─────────────────────────────────────────────────────────
export const WORKER_HIRE_BASE_COST = 8;
export const WORKER_HIRE_MULTIPLIER = 1.5;
 
// ─── Automation ───────────────────────────────────────────────────────────────
export const AUTOMATION_THRESHOLD = 4;
export const MIN_PLOTS_FOR_AUTOMATION = 4;
export const PRESTIGE_MIN_PLOTS = 9; // 3×3 minimum to prestige
 
// ─── Worker specializations ───────────────────────────────────────────────────
export const SPECIALIZATIONS = {
  none:      { id: "none",      name: "General",   description: "No specialization." },
  harvester: { id: "harvester", name: "Harvester", emoji: "⚡", description: "Harvests 25% faster. Cycle time reduced by 25%.", cycleMultiplier: 0.75 },
  sprinter:  { id: "sprinter",  name: "Sprinter",  emoji: "💨", description: "Harvests 2x plots per cycle but rests every 3rd cycle.", plotsMultiplier: 2, restEvery: 3 },
  grower:    { id: "grower",    name: "Grower",    emoji: "🌱", description: "Reduces grow time for ALL plots on this farm by 20%. Stacks.", growMultiplier: 0.8 },
};
 
// ─── Tend tool ────────────────────────────────────────────────────────────────
export const TEND_SECONDS = 3;
 
// ─── Processing recipes ───────────────────────────────────────────────────────
export const PROCESSING_RECIPES = {
  bread: { id: "bread", name: "Bread", emoji: "🍞", inputCrop: "wheat",    inputAmount: 40, outputGood: "bread", outputAmount: 1, seconds: 90,  description: "Bake bread from wheat." },
  jam:   { id: "jam",   name: "Jam",   emoji: "🍯", inputCrop: "berries",  inputAmount: 30, outputGood: "jam",   outputAmount: 1, seconds: 120, description: "Craft jam from berries." },
  sauce: { id: "sauce", name: "Sauce", emoji: "🥫", inputCrop: "tomatoes", inputAmount: 20, outputGood: "sauce", outputAmount: 1, seconds: 150, description: "Make sauce from tomatoes." },
  omelette:      { id: "omelette",      name: "Omelette",      emoji: "🍳", inputCrop: "egg",    inputAmount: 3,  outputGood: "omelette",      outputAmount: 1, seconds: 60,  description: "Hearty meal. Crafted from eggs." },
  cheese:        { id: "cheese",        name: "Cheese",        emoji: "🧀", inputCrop: "milk",   inputAmount: 4,  outputGood: "cheese",        outputAmount: 1, seconds: 90,  description: "Aged to perfection." },
  knitted_goods: { id: "knitted_goods", name: "Knitted Goods", emoji: "🧥", inputCrop: "wool",   inputAmount: 3,  outputGood: "knitted_goods", outputAmount: 1, seconds: 120, description: "Warm and valuable." },
  fish_pie:      { id: "fish_pie",      name: "Fish Pie",      emoji: "🥧", inputCrop: "bass",   inputAmount: 2,  outputGood: "fish_pie",      outputAmount: 1, seconds: 90,  description: "Tasty and filling." },
  smoked_fish:   { id: "smoked_fish",   name: "Smoked Fish",   emoji: "🐟", inputCrop: "perch",  inputAmount: 2,  outputGood: "smoked_fish",   outputAmount: 1, seconds: 75,  description: "Smoky and delicious." },
  fish_meal:     { id: "fish_meal",     name: "Fish Meal",     emoji: "🌿", inputCrop: "minnow", inputAmount: 5,  outputGood: "fish_meal",     outputAmount: 1, seconds: 45,  description: "Fertilizer. Boosts grow speed." },
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
  wheat: 0.5, berries: 1.25, tomatoes: 3,
  bread: 30,  jam: 50,       sauce: 80,
  egg: 5, milk: 15, wool: 25,
  omelette: 40, cheese: 60, knitted_goods: 90,
  minnow: 2, bass: 8, perch: 12, rare: 35,
  fish_pie: 45, smoked_fish: 35, fish_meal: 20,
};
 
// ─── Market workers ───────────────────────────────────────────────────────────
export const MARKET_WORKER_HIRE_COST = 25;
export const MARKET_WORKER_HIRE_MULTIPLIER = 2.5;
 
export const MARKET_WORKER_GEAR = {
  cart:       { id: "cart",       name: "Cart",       emoji: "🛒", itemsPerSecond: 1,  upgradeCost: null  },
  wagon:      { id: "wagon",      name: "Wagon",      emoji: "🪵", itemsPerSecond: 2,  upgradeCost: 120   },
  truck:      { id: "truck",      name: "Truck",      emoji: "🚚", itemsPerSecond: 4,  upgradeCost: 400   },
  freight:    { id: "freight",    name: "Freight",    emoji: "🚛", itemsPerSecond: 10, upgradeCost: 2200  },
  export_hub: { id: "export_hub", name: "Export Hub", emoji: "🏗️", itemsPerSecond: 20, upgradeCost: 10000 },
};
 
export const MARKET_WORKER_GEAR_ORDER = ["cart", "wagon", "truck", "freight", "export_hub"];
export const MARKET_WORKER_STANDING_ORDER_COST = 250;
 
// ─── Kitchen workers ──────────────────────────────────────────────────────────
export const KITCHEN_WORKER_HIRE_COST = 15;
export const KITCHEN_WORKER_HIRE_MULTIPLIER = 2.5;
 
export const KITCHEN_WORKER_UPGRADES = {
  speed_1:      { id: "speed_1",      name: "Sharp Knife",  emoji: "🔪",     cost: 80,   description: "+25% processing speed.",                      speedMultiplier: 0.75, tree: "speed" },
  speed_2:      { id: "speed_2",      name: "Prep Station", emoji: "🍳",     cost: 250,  description: "+50% processing speed (replaces Sharp Knife).", speedMultiplier: 0.5,  requires: "speed_1", tree: "speed" },
  auto_restart: { id: "auto_restart", name: "Auto-Restart", emoji: "🔄",     cost: 600,  description: "Auto restarts recipe when finished.",           requires: "speed_2",   tree: "speed" },
  batch_2:      { id: "batch_2",      name: "Batch ×2",     emoji: "📦",     cost: 800,  description: "Double input, double output per run.",          batchSize: 2,          tree: "batch" },
  batch_5:      { id: "batch_5",      name: "Batch ×5",     emoji: "📦📦",   cost: 2000, description: "5× input, 5× output per run.",                  batchSize: 5,  requires: "batch_2", tree: "batch" },
  batch_10:     { id: "batch_10",     name: "Batch ×10",    emoji: "📦📦📦", cost: 8000, description: "10× input, 10× output per run.",                batchSize: 10, requires: "batch_5", tree: "batch" },
};
 
export const KITCHEN_WORKER_UPGRADE_ORDER = ["speed_1", "speed_2", "auto_restart", "batch_2", "batch_5", "batch_10"];
 
export const KITCHEN_BASE_COST = 20;
export const KITCHEN_SLOT_COSTS = [50, 150];
export const KITCHEN_SLOT_UPGRADES = { speed_1: { speedMultiplier: 0.75 }, speed_2: { speedMultiplier: 0.5 } };
 
// ─── Barn worker constants ────────────────────────────────────────────────────
export const BARN_WORKER_HIRE_BASE_COST = 50;
export const BARN_WORKER_HIRE_MULTIPLIER = 1.6;
export const BARN_WORKER_UPGRADES = {
  speed_1:    { id: "speed_1",    name: "Quick Rounds",  emoji: "⚡", cost: 150, description: "Collect every 25s",     requires: null,         tree: "speed" },
  speed_2:    { id: "speed_2",    name: "Sprint Rounds", emoji: "⚡", cost: 300, description: "Collect every 20s",     requires: "speed_1",    tree: "speed" },
  capacity_1: { id: "capacity_1", name: "Big Basket",    emoji: "📦", cost: 200, description: "Collect 2 at once",     requires: null,         tree: "capacity" },
  capacity_2: { id: "capacity_2", name: "Cargo Basket",  emoji: "📦", cost: 400, description: "Collect 3 at once",     requires: "capacity_1", tree: "capacity" },
  care_1:     { id: "care_1",     name: "Gentle Hands",  emoji: "💝", cost: 150, description: "+20 mood to neediest animal every 90s",  requires: null,      tree: "care" },
  care_2:     { id: "care_2",     name: "Animal Bond",   emoji: "💝", cost: 300, description: "+35 mood to neediest animal every 60s",  requires: "care_1",  tree: "care" },
};
export const ANIMAL_STORAGE_UPGRADES = [
  { level: 1, cost: 100, maxStock: 15, label: "Bigger Nest" },
  { level: 2, cost: 250, maxStock: 25, label: "Deluxe Nest" },
];
export const ANIMAL_YIELD_UPGRADES = [
  { level: 1, cost: 150, bonusYield: 1, label: "Well Fed"    },
  { level: 2, cost: 350, bonusYield: 2, label: "Pampered"    },
  { level: 3, cost: 750, bonusYield: 3, label: "Prize Animal" },
];
export const BARN_WORKER_BASE_INTERVAL = 30;  // seconds between collect actions
export const BARN_WORKER_BASE_CAPACITY = 1;
export const ANIMAL_BASE_STOCK_MAX = 10;
export const ANIMAL_OVERFULL_MOOD_DRAIN = 15; // multiplier on normal drain when full

// ─── Prestige bonuses ─────────────────────────────────────────────────────────
// ─── Prestige Skill Tree ──────────────────────────────────────────────────────
// Each prestige awards 1 skill point. Nodes are permanent — never reset.
// Each tier requires the previous tier in the same branch to be unlocked first.
// market_savvy may only be purchased once.

export const PRESTIGE_SKILL_TREE = {
  // 🌾 Farmer branch
  fertile_soil: {
    id: "fertile_soil", branch: "farmer", tier: 1,
    name: "Fertile Soil", emoji: "🌾",
    description: "Treasury grow bonus permanently +5%.",
    requires: null,
  },
  bargain_soil: {
    id: "bargain_soil", branch: "farmer", tier: 2,
    name: "Bargain Soil", emoji: "💰",
    description: "Plot upgrade costs reduced by 50%.",
    requires: "fertile_soil",
  },
  bumper_crop: {
    id: "bumper_crop", branch: "farmer", tier: 3,
    name: "Bumper Crop", emoji: "📈",
    description: "+15% yield on all harvests. Stacks.",
    requires: "bargain_soil",
  },

  // 💹 Merchant branch
  sharp_eye: {
    id: "sharp_eye", branch: "merchant", tier: 1,
    name: "Sharp Eye", emoji: "👁️",
    description: "All market sell prices +10%. Stacks.",
    requires: null,
  },
  bulk_dealer: {
    id: "bulk_dealer", branch: "merchant", tier: 2,
    name: "Bulk Dealer", emoji: "📦",
    description: "Market worker sell speed +20%. Stacks.",
    requires: "sharp_eye",
  },
  market_savvy: {
    id: "market_savvy", branch: "merchant", tier: 3,
    name: "Market Savvy", emoji: "💹",
    description: "All market sell prices +25%. One time only.",
    requires: "bulk_dealer",
    unique: true, // can only be purchased once
  },

  // 🏘️ Mayor branch
  warm_welcome: {
    id: "warm_welcome", branch: "mayor", tier: 1,
    name: "Warm Welcome", emoji: "🏠",
    description: "Start each season with 1 extra home already built.",
    requires: null,
  },
  grand_opening: {
    id: "grand_opening", branch: "mayor", tier: 2,
    name: "Grand Opening", emoji: "🎉",
    description: "Satisfaction starts at 150% for the first 3 town pulses of a new season.",
    requires: "warm_welcome",
  },
  town_pride: {
    id: "town_pride", branch: "mayor", tier: 3,
    name: "Town Pride", emoji: "🏆",
    description: "Satisfaction ceiling raised to 200%.",
    requires: "grand_opening",
  },

  // 🎣 Fisher branch
  sea_legs: {
    id: "sea_legs", branch: "fisher", tier: 1,
    name: "Sea Legs", emoji: "⚓",
    description: "Fishermen work 20% faster. Stacks.",
    requires: null,
  },
  deep_waters: {
    id: "deep_waters", branch: "fisher", tier: 2,
    name: "Deep Waters", emoji: "🌊",
    description: "Fishermen never catch minnows — bass or better minimum.",
    requires: "sea_legs",
    unique: true,
  },
  selective_haul: {
    id: "selective_haul", branch: "fisher", tier: 3,
    name: "Selective Haul", emoji: "🎯",
    description: "Toggle which fish types each fisherman is allowed to catch.",
    requires: "deep_waters",
    unique: true,
  },

  // 🐄 Rancher branch
  fast_hands: {
    id: "fast_hands", branch: "rancher", tier: 1,
    name: "Fast Hands", emoji: "🧤",
    description: "Newly hired barn workers start with Big Basket (capacity_1) already equipped.",
    requires: null,
  },
  sturdy_stock: {
    id: "sturdy_stock", branch: "rancher", tier: 2,
    name: "Sturdy Stock", emoji: "💪",
    description: "Animals produce 20% more goods. Stacks.",
    requires: "fast_hands",
  },
  breeding_program: {
    id: "breeding_program", branch: "rancher", tier: 3,
    name: "Breeding Program", emoji: "🐣",
    description: "Animal slot cap +2 per barn building.",
    requires: "sturdy_stock",
  },

  // 🍳 Crafter branch
  clean_switch: {
    id: "clean_switch", branch: "crafter", tier: 1,
    name: "Clean Switch", emoji: "🔄",
    description: "No resource loss when switching recipes.",
    requires: null,
    unique: true,
  },
  swift_craft: {
    id: "swift_craft", branch: "crafter", tier: 2,
    name: "Swift Craft", emoji: "⚡",
    description: "All craft times reduced by 25%. Stacks.",
    requires: "clean_switch",
  },
  efficient_process: {
    id: "efficient_process", branch: "crafter", tier: 3,
    name: "Efficient Process", emoji: "♻️",
    description: "All recipes consume 50% of resources.",
    requires: "swift_craft",
    unique: true,
  },
};

export const PRESTIGE_SKILL_BRANCHES = ["farmer", "merchant", "mayor", "fisher", "rancher", "crafter"];

export const PRESTIGE_BRANCH_META = {
  farmer:   { label: "Farmer",   emoji: "🌾" },
  merchant: { label: "Merchant", emoji: "💹" },
  mayor:    { label: "Mayor",    emoji: "🏘️" },
  fisher:   { label: "Fisher",   emoji: "🎣" },
  rancher:  { label: "Rancher",  emoji: "🐄" },
  crafter:  { label: "Crafter",  emoji: "🍳" },
};

// Legacy flat map — kept so old save references don't hard-crash
export const PRESTIGE_BONUSES = {
  bumper_crop:  PRESTIGE_SKILL_TREE.bumper_crop,
  head_start:   { id: "head_start", name: "Head Start", emoji: "🙋", description: "Legacy — replaced by skill tree." },
  fast_hands:   PRESTIGE_SKILL_TREE.fast_hands,
  market_savvy: PRESTIGE_SKILL_TREE.market_savvy,
};
 
// ─── Prestige cash thresholds ─────────────────────────────────────────────────
export const PRESTIGE_CASH_THRESHOLDS = [120, 400, 800];
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
 
// ─── Town ─────────────────────────────────────────────────────────────────────
export const TOWN_STARTING_PEOPLE = 1;
export const TOWN_HOME_CAPACITY = 4;
export const TOWN_HOME_SECOND_COST = 50;
export const TOWN_HOME_COST_MULTIPLIER = 1.6;
export const TOWN_BAKERY_BASE_COST = 800;
export const TOWN_BAKERY_COST_MULTIPLIER = 1.5;
export const TOWN_JAM_BUILDING_COST = 2_000;
export const TOWN_SAUCE_BUILDING_COST = 4_000;
 
// ─── Town Hall ────────────────────────────────────────────────────────────────
export const TOWN_HALL_MAX_LEVEL = 3;
export const TOWN_HALL_LEVEL_COSTS = [75, 1000, 3000]; // cash cost per level
 
// Treasury drain tiers — player picks which tier is active
// Each tier drains cash→treasury at drainRate/sec and gives grow speed bonus
export const TREASURY_TIERS = [
  { tier: 1, drainRate: 2,  growBonus: 10, label: "Slow"   },
  { tier: 2, drainRate: 5,  growBonus: 20, label: "Steady" },
  { tier: 3, drainRate: 10, growBonus: 35, label: "Fast"   },
];
// Max drain tier available = Town Hall level
// e.g. Town Hall 1 → can only use tier 1; Town Hall 3 → can use tiers 1/2/3
 
// ─── Bank ─────────────────────────────────────────────────────────────────────
// Gated: Town Hall level 3 + all food buildings (bakery, pantry, cannery)
// Levels upgrade the bank; each level unlocks the next drain tier
// All costs paid from treasury
export const BANK_BUILD_COST = 5_000;
export const BANK_LEVEL_COSTS = [1_000, 2_500, 6_000];
// Bank drain rates are intentionally capped at or below the matching treasury tier's
// fill rate so the bank can never drain treasury faster than cash can replenish it.
// Treasury tiers fill at 2 / 5 / 10 per second — bank tiers drain at 1 / 4 / 9.
export const BANK_TIERS = [
  { tier: 1, drainRate: 1,  priceBonus: 10, label: "Branch"  },
  { tier: 2, drainRate: 4,  priceBonus: 20, label: "Regional"},
  { tier: 3, drainRate: 9,  priceBonus: 35, label: "Central" },
];
export const BANK_MAX_LEVEL = 3;
 
// ─── Building pulse costs ─────────────────────────────────────────────────────
export const BUILDING_WORKERS_DIVISOR = 6;
export const BUILDING_PULSE_EXTRA_SECONDS = 10;
export const BUILDING_UPGRADE_COST = 1000; // treasury cost
 
// ─── Pulse system ─────────────────────────────────────────────────────────────
export const TOWN_PULSE_SECONDS = 45;



export const TOWN_GROWTH_PER_PULSE = 1;
export const TOWN_DECLINE_PER_PULSE = 1;
export const TOWN_HOME_INSTANT_POPULATION = 1;

export const ANIMAL_FOOD_COSTS = { chicken: 2, cow: 3, sheep: 4 };
export const PET_FOOD_COST = 2;
export const BREAD_FOOD_UNITS = 10;
export const PERSON_IDLE_FOOD_COST = 1;
export const PERSON_WORKING_FOOD_COST = 2;
 
// ─── Satisfaction ─────────────────────────────────────────────────────────────
export const TOWN_SATISFACTION_DEFAULT = 100;
export const TOWN_SATISFACTION_FLOOR = 25;
export const TOWN_SATISFACTION_CEILING = 150;
export const TOWN_SATISFACTION_STEP = 5;
export const TOWN_SATISFACTION_STARVE_STEP = 10;
export const TOWN_SAT_WHEAT = 100;
export const TOWN_SAT_BAKERY = 110;
export const TOWN_SAT_BAKERY_JAM = 125;
export const TOWN_SAT_BAKERY_SAUCE = 140;
export const TOWN_SAT_ALL_BUILDINGS = 150;
export const TOWN_PEOPLE_PER_GROWTH_BONUS = 5;
export const TOWN_GROWTH_BONUS_PER_STEP = 1;
export const TOWN_MAX_GROWTH_BONUS_PERCENT = 25;
 
// ─── Season structure ─────────────────────────────────────────────────────────
export const SEASON_FARMS = { 1: ["wheat"], 2: ["wheat", "berries"], 3: ["wheat", "berries", "tomatoes"] };
export const SEASON_BARNS = { 4: "chicken_coop", 5: "dairy", 6: "wool_shed" };
export const FIRST_EXTRA_FARM_SEASON = 4;
export const FIRST_CHOICE_SEASON = 7; // season 7+ player picks farm or barn each prestige
export const PRESTIGE_MIN_BARN_WORKERS = 1; // each built barn needs at least this many workers
export const MAX_SEASON = 999;
 
// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 30_000;
export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;
 
// ─── Pond ─────────────────────────────────────────────────────────────────────

export const FISHING_BODIES = {
  pond:  { id: "pond",  name: "Pond",  emoji: "🏊", unlockCost: 0     },
  lake:  { id: "lake",  name: "Lake",  emoji: "🏞️", unlockCost: 2000  },
  river: { id: "river", name: "River", emoji: "🏔️", unlockCost: 8000  },
  ocean: { id: "ocean", name: "Ocean", emoji: "🌊", unlockCost: 25000 },
};
export const FISHING_BODY_ORDER = ["pond", "lake", "river", "ocean"];

export const FISHING_FISH = {
  minnow: { id: "minnow", name: "Minnow",   emoji: "🐟", rawValue: 2  },
  bass:   { id: "bass",   name: "Bass",     emoji: "🐠", rawValue: 8  },
  perch:  { id: "perch",  name: "Perch",    emoji: "🐡", rawValue: 12 },
  rare:   { id: "rare",   name: "Rare Fish", emoji: "✨", rawValue: 35 },
};

// [minnow%, bass%, perch%, rare%] — must sum to 100
export const FISHING_CATCH_RATES = {
  pond:  { basic: [80,20,0,0],   good: [60,35,5,0],   expert: [40,40,18,2]  },
  lake:  { basic: [50,35,14,1],  good: [30,35,30,5],  expert: [15,30,45,10] },
  river: { basic: [20,35,40,5],  good: [10,25,45,20], expert: [5,20,45,30]  },
  ocean: { basic: [10,25,40,25], good: [5,15,40,40],  expert: [0,10,40,50]  },
};

export const FISHING_BAIT_BONUS = {
  wheat_bait:  { rarePct: 10, haulBonus: 1 },
  berry_bait:  { rarePct: 15, haulBonus: 2 },
  tomato_bait: { rarePct: 20, haulBonus: 3 },
};

export const FISHING_WORKER_UPGRADES = {
  speed_1: { id: "speed_1", name: "Quick Cast",  emoji: "⚡", cost: 200, description: "Fish every 40s",   tree: "speed",    requires: null        },
  speed_2: { id: "speed_2", name: "Sprint Cast", emoji: "⚡", cost: 400, description: "Fish every 20s",   tree: "speed",    requires: "speed_1"   },
  haul_1:  { id: "haul_1",  name: "Big Net",     emoji: "📦", cost: 250, description: "Catch 2 at once",  tree: "haul",     requires: null        },
  haul_2:  { id: "haul_2",  name: "Trawl Net",   emoji: "📦", cost: 500, description: "Catch 5 at once",  tree: "haul",     requires: "haul_1"    },
  gear_good:   { id: "gear_good",   name: "Good Rod",   emoji: "🎣", cost: 300, description: "Unlocks perch",    tree: "gear",     requires: null        },
  gear_expert: { id: "gear_expert", name: "Expert Rod",  emoji: "🎣", cost: 600, description: "Best rare odds",  tree: "gear",     requires: "gear_good" },
};

export const FISHING_WORKER_HIRE_COSTS = {
  pond:  75,
  lake:  300,
  river: 1000,
  ocean: 3000,
};
export const FISHING_WORKER_BASE_INTERVAL = 60;
export const POND_COST = 200; // keep existing value

 

 
// Bait types — crafted in Kitchen from crops, boosts certain fish
export const BAIT_TYPES = {
  wheat_bait:   { id: "wheat_bait",   name: "Wheat Bait",   emoji: "🌾", inputCrop: "wheat",    inputAmount: 5,  boosts: "common",    description: "More minnows." },
  berry_bait:   { id: "berry_bait",   name: "Berry Bait",   emoji: "🫐", inputCrop: "berries",  inputAmount: 4,  boosts: "uncommon",  description: "More bass & perch." },
  tomato_bait:  { id: "tomato_bait",  name: "Tomato Bait",  emoji: "🍅", inputCrop: "tomatoes", inputAmount: 3,  boosts: "rare",      description: "Rare fish chance up." },
};
 
// Bait recipes — added to PROCESSING_RECIPES so kitchen workers can craft them
// inputCrop/inputAmount match BAIT_TYPES; output goes into state.bait[id]
 
// Bait recipes — these are valid kitchen worker recipes, output goes to state.bait
export const BAIT_RECIPES = {
  wheat_bait:  { id: "wheat_bait",  name: "Wheat Bait",  emoji: "🌾", inputCrop: "wheat",    inputAmount: 5, outputGood: "wheat_bait",  outputAmount: 3, seconds: 20, description: "Craft wheat bait. More minnows.", isBait: true },
  berry_bait:  { id: "berry_bait",  name: "Berry Bait",  emoji: "🫐", inputCrop: "berries",  inputAmount: 4, outputGood: "berry_bait",  outputAmount: 3, seconds: 30, description: "Craft berry bait. More bass & perch.", isBait: true },
  tomato_bait: { id: "tomato_bait", name: "Tomato Bait", emoji: "🍅", inputCrop: "tomatoes", inputAmount: 3, outputGood: "tomato_bait", outputAmount: 3, seconds: 45, description: "Craft tomato bait. Rare fish chance up.", isBait: true },
};
 

 
 
// Needle sweep speed (degrees/sec or normalized units per second)
export const NEEDLE_SWEEP_SPEED = 0.6; // 0-1 bar units per second, bounces
export const REEL_DURATION = 4; // seconds to reel in
export const REEL_DRAIN_RATE = 0.08; // progress drained per second (fish fighting)
export const REEL_TAP_AMOUNT = 0.12; // progress per tap
 
// ─── Barn / Animals ───────────────────────────────────────────────────────────
export const ANIMAL_TYPES = {
  chicken: {
    id: "chicken", name: "Chicken", emoji: "🐔",
    baseCost: 300, costMultiplier: 1.8,
    produces: "egg", produceName: "Egg", produceEmoji: "🥚",
    cycleSeconds: 60,
    foodPulseCost: 1, // extra wheat/bread per pulse per animal
    moodDecayPerMinute: 2, // mood % lost per minute
    baseYield: 1, bonusYieldMood: 100, // at 100% mood, chance of +1 bonus
    description: "Lays eggs every minute. Low maintenance.",
    unlockSeason: 1,
  },
  cow: {
    id: "cow", name: "Cow", emoji: "🐄",
    baseCost: 800, costMultiplier: 1.6,
    produces: "milk", produceName: "Milk", produceEmoji: "🥛",
    cycleSeconds: 120,
    foodPulseCost: 2,
    moodDecayPerMinute: 1.5,
    baseYield: 1, bonusYieldMood: 80,
    description: "Produces milk every 2 minutes. Needs more food.",
    unlockSeason: 2,
  },
  sheep: {
    id: "sheep", name: "Sheep", emoji: "🐑",
    baseCost: 1500, costMultiplier: 1.5,
    produces: "wool", produceName: "Wool", produceEmoji: "🧶",
    cycleSeconds: 180,
    foodPulseCost: 2,
    moodDecayPerMinute: 1,
    baseYield: 1, bonusYieldMood: 60,
    description: "Produces wool every 3 minutes. Very chill.",
    unlockSeason: 3,
  },
};
 
export const ANIMAL_RAW_VALUES = {
  egg:  5,
  milk: 15,
  wool: 25,
};
 
export const MAX_ANIMALS_PER_TYPE = 5; // legacy — slot cap now comes from barn building tier

// ─── Barn Buildings ───────────────────────────────────────────────────────────
export const BARN_BUILDINGS = {
  chicken_coop: {
    id: "chicken_coop", name: "Chicken Coop", emoji: "🐔",
    animalType: "chicken",
    buildCost: 500,
    upkeepPerAnimalPerSec: 0.05,
    unlockSeason: 4,
  },
  dairy: {
    id: "dairy", name: "Dairy", emoji: "🐄",
    animalType: "cow",
    buildCost: 2000,
    upkeepPerAnimalPerSec: 0.10,
    unlockSeason: 5,
  },
  wool_shed: {
    id: "wool_shed", name: "Wool Shed", emoji: "🐑",
    animalType: "sheep",
    buildCost: 5000,
    upkeepPerAnimalPerSec: 0.20,
    unlockSeason: 6,
  },
};

export const BARN_BUILDING_ORDER = ["chicken_coop", "dairy", "wool_shed"];

// tier 0 = not built yet; tiers 1-4 = built and upgraded
export const BARN_BUILDING_TIERS = [
  { tier: 1, name: "Basic",    animalSlots: 3,  workerSlots: 3,  upgradeCost: 0    },
  { tier: 2, name: "Improved", animalSlots: 5,  workerSlots: 5,  upgradeCost: 1500 },
  { tier: 3, name: "Advanced", animalSlots: 8,  workerSlots: 8,  upgradeCost: 4000 },
  { tier: 4, name: "Premium",  animalSlots: 12, workerSlots: 12, upgradeCost: 9000 },
];

// Extra mood drain per second per animal when owner can't afford upkeep
export const BARN_UPKEEP_DEBT_MOOD_DRAIN = 0.5;

// Interact (pet/play) restores this much mood
export const ANIMAL_INTERACT_MOOD_BOOST = 25;
export const ANIMAL_INTERACT_COOLDOWN = 30; // seconds between interactions
 
// ─── Pets ─────────────────────────────────────────────────────────────────────
export const PET_TYPES = {
  dog: {
    id: "dog", name: "Dog", emoji: "🐕",
    cost: 400,
    bonus: "Slows mood decay on all barn animals by 30%.",
    bonusType: "barn_mood_decay",
    bonusValue: 0.30,
    foodCostPerPulse: 1, // wheat
    moodDecayPerMinute: 1.5,
    description: "Loyal companion. Keeps the barn animals happy.",
  },
  cat: {
    id: "cat", name: "Cat", emoji: "🐈",
    cost: 400,
    bonus: "Widens the fishing needle sweet spot by 20%.",
    bonusType: "fishing_sweet_spot",
    bonusValue: 0.20,
    foodCostPerPulse: 1,
    moodDecayPerMinute: 1,
    description: "Independent hunter. Hangs around the pond.",
  },
  rabbit: {
    id: "rabbit", name: "Rabbit", emoji: "🐇",
    cost: 400,
    bonus: "+5% town satisfaction permanently while happy.",
    bonusType: "town_satisfaction",
    bonusValue: 5,
    foodCostPerPulse: 1,
    moodDecayPerMinute: 2,
    description: "Town mascot. Everyone loves it.",
  },
};
 
export const PET_INTERACT_MOOD_BOOST = 30;
export const PET_INTERACT_COOLDOWN = 60;
 
// ─── Crafting recipes (additions) ────────────────────────────────────────────
// These get merged into PROCESSING_RECIPES in gameConstants.js
export const ANIMAL_CRAFTING_RECIPES = {
  omelette:      { id: "omelette",      name: "Omelette",       emoji: "🍳", inputCrop: "egg",    inputAmount: 3,  outputGood: "omelette",      outputAmount: 1, seconds: 60,  description: "Hearty breakfast. Boosts town satisfaction." },
  cheese:        { id: "cheese",        name: "Cheese",          emoji: "🧀", inputCrop: "milk",   inputAmount: 4,  outputGood: "cheese",        outputAmount: 1, seconds: 90,  description: "Aged to perfection." },
  knitted_goods: { id: "knitted_goods", name: "Knitted Goods",   emoji: "🧥", inputCrop: "wool",   inputAmount: 3,  outputGood: "knitted_goods", outputAmount: 1, seconds: 120, description: "Warm and valuable." },
  fish_pie:      { id: "fish_pie",      name: "Fish Pie",        emoji: "🥧", inputCrop: "bass",   inputAmount: 2,  outputGood: "fish_pie",      outputAmount: 1, seconds: 90,  description: "Tasty and filling." },
  smoked_fish:   { id: "smoked_fish",   name: "Smoked Fish",     emoji: "🐟", inputCrop: "perch",  inputAmount: 2,  outputGood: "smoked_fish",   outputAmount: 1, seconds: 75,  description: "Smoky and delicious." },
  fish_meal:     { id: "fish_meal",     name: "Fish Meal",       emoji: "🌿", inputCrop: "minnow", inputAmount: 5,  outputGood: "fish_meal",     outputAmount: 1, seconds: 45,  description: "Fertilizer. Gives a 10min grow speed boost." },
};
 
export const ANIMAL_SELL_RATES = {
  egg: 5, milk: 15, wool: 25,
  omelette: 40, cheese: 60, knitted_goods: 90,
  fish_pie: 45, smoked_fish: 35, fish_meal: 20,
  minnow: 2, bass: 8, perch: 12, rare: 35,
};
// ─── Town Buildings (new) ─────────────────────────────────────────────────────
 
// Build costs (from treasury)
export const TOWN_CLINIC_COST        = 1_500;
export const TOWN_SCHOOL_COST        = 2_500;
export const TOWN_TAVERN_COST        = 3_000;
export const TOWN_RESTAURANT_COST    = 5_000;
export const TOWN_CLOTHIER_COST      = 4_000;
 
// Per-worker bonuses
export const CLINIC_CAP_PER_MEDIC        = 0.5;  // +0.5 pop cap per medic
export const CLINIC_SAT_PER_MEDIC        = 0.3;  // +0.3% sat per medic
export const SCHOOL_GROW_PER_RESEARCHER  = 0.2;  // +0.2% grow speed per researcher
export const TAVERN_SAT_PER_BARTENDER    = 0.5;  // +0.5% sat per bartender
export const RESTAURANT_SAT_PER_CHEF     = 0.8;  // +0.8% sat per chef
export const CLOTHIER_CASH_PER_CLERK     = 8;    // +$X cash income per pulse per clerk
 
// Pulse consumption (scales with workers assigned)
// Restaurant: consumes 1 omelette + 1 cheese per N chefs each pulse
export const RESTAURANT_OMELETTE_PER_PULSE_DIVISOR = 3; // 1 omelette per 3 chefs
export const RESTAURANT_CHEESE_PER_PULSE_DIVISOR   = 3; // 1 cheese per 3 chefs
// Tavern: consumes jam OR fish_pie
export const TAVERN_GOODS_PER_PULSE_DIVISOR = 4; // 1 good per 4 bartenders
// Clothier: consumes knitted_goods
export const CLOTHIER_GOODS_PER_PULSE_DIVISOR = 3; // 1 knitted_goods per 3 clerks
 
// Satisfaction cap from buildings (stacks on top of food sat)
// Restaurant pushes sat target above TOWN_SAT_ALL_BUILDINGS ceiling
export const RESTAURANT_SAT_BONUS_MAX = 20; // up to +20% sat target bonus
export const TAVERN_SAT_BONUS_MAX     = 10;
 
// School research time multiplier floor
export const SCHOOL_RESEARCH_TIME_FLOOR = 0.05; // 5% of base — 95% max reduction

export const SCHOOL_RESEARCH = {
  fertilizer_iii: {
    id: "fertilizer_iii",
    name: "Fertilizer Theory",
    emoji: "🧪",
    description: "Unlock Fertilizer III for farms.",
    seconds: 180,
    requires: [],
  },
  fertilizer_iv: {
    id: "fertilizer_iv",
    name: "Advanced Fertilizer",
    emoji: "🌿",
    description: "Unlock Fertilizer IV for farms.",
    seconds: 300,
    requires: ["fertilizer_iii"],
  },

  kitchen_batch_5: {
    id: "kitchen_batch_5",
    name: "Bulk Cooking",
    emoji: "📦",
    description: "Unlock Batch ×5 for kitchen workers.",
    seconds: 240,
    requires: [],
  },
  kitchen_batch_10: {
    id: "kitchen_batch_10",
    name: "Industrial Kitchen",
    emoji: "🏭",
    description: "Unlock Batch ×10 for kitchen workers.",
    seconds: 420,
    requires: ["kitchen_batch_5"],
  },

  barn_capacity_2: {
    id: "barn_capacity_2",
    name: "Barn Logistics",
    emoji: "📚",
    description: "Unlock Capacity II for barn workers.",
    seconds: 240,
    requires: [],
  },
  barn_care_2: {
    id: "barn_care_2",
    name: "Animal Care Studies",
    emoji: "❤️",
    description: "Unlock Care II for barn workers.",
    seconds: 240,
    requires: [],
  },
  animal_yield_2: {
    id: "animal_yield_2",
    name: "Selective Breeding",
    emoji: "🥚",
    description: "Unlock higher animal yield upgrades.",
    seconds: 300,
    requires: [],
  },

  fishing_haul_2: {
    id: "fishing_haul_2",
    name: "Net Design",
    emoji: "🎣",
    description: "Unlock Haul II for fishing workers.",
    seconds: 240,
    requires: [],
  },
  fishing_gear_expert: {
    id: "fishing_gear_expert",
    name: "Master Tackle",
    emoji: "🪝",
    description: "Unlock Expert Gear for fishing workers.",
    seconds: 300,
    requires: ["fishing_haul_2"],
  },
};