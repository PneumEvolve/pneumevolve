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
  gloves:      { id: "gloves",      name: "Gloves",      emoji: "🧤", plotsPerCycle: 1, cycleSeconds: 10, upgradeCost: 40,   upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "Harvests and replants 1 plot every 10s. 33% faster." },
  hoe:         { id: "hoe",         name: "Hoe",         emoji: "🪓", plotsPerCycle: 1, cycleSeconds: 6,  upgradeCost: 180,   upgradeTier: 1, upgradeRequires: { iron_ore: 15, lumber: 10 }, description: "Harvests and replants 1 plot every 6s. 40% faster than gloves." },
  wheelbarrow: { id: "wheelbarrow", name: "Wheelbarrow", emoji: "🛻", plotsPerCycle: 2, cycleSeconds: 6,  upgradeCost: 600,  upgradeTier: 2, upgradeRequires: { iron_ore: 80, lumber: 60 }, description: "Harvests and replants 2 plots every 6s. Double the coverage." },
  tractor:     { id: "tractor",     name: "Tractor",     emoji: "🚜", plotsPerCycle: 5, cycleSeconds: 6,  upgradeCost: 2000,  upgradeTier: 3, upgradeRequires: { iron_fitting: 5, iron_ore: 40, lumber: 30 }, description: "Harvests and replants 5 plots every 6s. Near full automation." },
};
 
export const GEAR_ORDER = ["bare_hands", "gloves", "hoe", "wheelbarrow", "tractor"];
export const GEAR_CROP_COSTS = {};
 
// ─── Specialization ───────────────────────────────────────────────────────────
export const SPECIALIZE_COST = 100;
export const SPECIALIZE_CROP = null;
export const SPECIALIZE_REQUIRES = { iron_fitting: 1 };
 
// ─── Plot unlock costs ────────────────────────────────────────────────────────
export const PLOT_BASE_COST = 3;
export const PLOT_COST_MULTIPLIER = 1.4;
export const MAX_PLOTS = 9;
 
// ─── Farm investments ─────────────────────────────────────────────────────────
export const FARM_INVESTMENT_PLOT_CAP = [
  { id: "plots_4x4", name: "Expand to 4×4", maxPlots: 16, cost: 1500,    upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "Unlock up to 16 plots on this farm." },
  { id: "plots_5x5", name: "Expand to 5×5", maxPlots: 25, cost: 15000,   upgradeTier: 2, upgradeRequires: { iron_ore: 100, lumber: 80 }, description: "Unlock up to 25 plots on this farm." },
  { id: "plots_6x6", name: "Expand to 6×6", maxPlots: 36, cost: 80000,  upgradeTier: 3, upgradeRequires: { iron_fitting: 5, iron_ore: 60, lumber: 50 }, description: "Unlock up to 36 plots on this farm." },
  { id: "plots_7x7", name: "Expand to 7×7", maxPlots: 49, cost: 400000, upgradeTier: 4, upgradeRequires: { iron_fitting: 20, iron_ore: 150, lumber: 100 }, description: "Unlock up to 49 plots on this farm." },
];
 
export const FARM_INVESTMENT_YIELD = [
  { id: "yield_1", name: "Fertilizer I",   bonusYield: 1, cost: 3000,  upgradeTier: 2, upgradeRequires: { iron_ore: 80, lumber: 60 }, description: "+1 crop per worker harvest." },
  { id: "yield_2", name: "Fertilizer II",  bonusYield: 2, cost: 10000,  upgradeTier: 2, upgradeRequires: { iron_ore: 120, lumber: 100 }, description: "+2 crops per worker harvest." },
  { id: "yield_3", name: "Fertilizer III", bonusYield: 3, cost: 35000, upgradeTier: 3, upgradeRequires: { iron_fitting: 5, iron_ore: 50 }, description: "+3 crops per worker harvest." },
  { id: "yield_4", name: "Fertilizer IV",  bonusYield: 4, cost: 120000, upgradeTier: 3, upgradeRequires: { iron_fitting: 8, fine_tools: 8, iron_ore: 80 }, description: "+4 crops per worker harvest." },
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
  bread: { id: "bread", name: "Bread", emoji: "🍞", inputCrop: "wheat",    inputAmount: 30, outputGood: "bread", outputAmount: 1, seconds: 60,  description: "Bake bread from wheat.", healAmount: 30 },
  jam:   { id: "jam",   name: "Jam",   emoji: "🍯", inputCrop: "berries",  inputAmount: 30, outputGood: "jam",   outputAmount: 1, seconds: 120, description: "Craft jam from berries.", healAmount: 50 },
  sauce: { id: "sauce", name: "Sauce", emoji: "🥫", inputCrop: "tomatoes", inputAmount: 20, outputGood: "sauce", outputAmount: 1, seconds: 150, description: "Make sauce from tomatoes.", healAmount: 100 },
  omelette:      { id: "omelette",      name: "Omelette",      emoji: "🍳", inputCrop: "egg",    inputAmount: 3,  outputGood: "omelette",      outputAmount: 1, seconds: 60,  description: "Hearty meal. Crafted from eggs." },
  cheese:        { id: "cheese",        name: "Cheese",        emoji: "🧀", inputCrop: "milk",   inputAmount: 4,  outputGood: "cheese",        outputAmount: 1, seconds: 90,  description: "Aged to perfection." },
  knitted_goods: { id: "knitted_goods", name: "Knitted Goods", emoji: "🧥", inputCrop: "wool",   inputAmount: 3,  outputGood: "knitted_goods", outputAmount: 1, seconds: 120, description: "Warm and valuable." },
  fish_pie:      { id: "fish_pie",      name: "Fish Pie",      emoji: "🥧", inputCrop: "bass",   inputAmount: 2,  outputGood: "fish_pie",      outputAmount: 1, seconds: 90,  description: "Tasty and filling." },
  smoked_fish:   { id: "smoked_fish",   name: "Smoked Fish",   emoji: "🐟", inputCrop: "perch",  inputAmount: 2,  outputGood: "smoked_fish",   outputAmount: 1, seconds: 75,  description: "Smoky and delicious." },
  fish_meal:      { id: "fish_meal",      name: "Fish Meal",      emoji: "🌿", inputCrop: "minnow", inputAmount: 5, outputGood: "fish_meal", outputAmount: 1, seconds: 45,  description: "Fertilizer. Boosts grow speed." },
  fish_meal_bass: { id: "fish_meal_bass", name: "Fish Meal (Bass)", emoji: "🌿", inputCrop: "bass",   inputAmount: 3, outputGood: "fish_meal", outputAmount: 1, seconds: 60,  description: "Fertilizer from bass. For when minnows are scarce." },
};
 
// ─── Feast tiers ──────────────────────────────────────────────────────────────
export const FEAST_TIERS = [
  { cost: 30,   bonusPercent: 1  },
  { cost: 75,   bonusPercent: 2  },
  { cost: 150,  bonusPercent: 3  },
  { cost: 300,  bonusPercent: 5  },
  { cost: 600,  bonusPercent: 8  },
  { cost: 1050, bonusPercent: 12 },
  { cost: 1500, bonusPercent: 19 },
];
export const FEAST_MAX_BONUS = 50;
 
// ─── Market ───────────────────────────────────────────────────────────────────
export const MARKET_SELL_RATES = {
  wheat: 0.5, berries: 1.25, tomatoes: 3,
  bread: 30,  jam: 75,       sauce: 135,
  egg: 5, milk: 15, wool: 25,
  omelette: 40, cheese: 70, knitted_goods: 90,
  minnow: 2, bass: 8, perch: 12, rare: 35,
  fish_pie: 45, smoked_fish: 35, fish_meal: 20,
  // World loot
  iron_ore: 2, lumber: 4, herbs: 3, rare_gem: 50, mana_crystal: 100,
  // Forge goods
  iron_sword: 120, iron_shield: 110, leather_armor: 100, hunting_bow: 200,
  steel_sword: 300, master_sword: 800, steel_shield: 320, tower_shield: 850, chainmail: 350,
  plate_armor: 900,
  // Upgrade components
  iron_fitting: 150, reinforced_crate: 175, fine_tools: 160,
  // Boss drop
  titan_core: 500,
};
 
// ─── Market workers ───────────────────────────────────────────────────────────
// Worker 1 is always free (MarketZone.jsx bypasses cost for isFirstWorker).
// This cost applies from worker 2 onward: worker2=$150, worker3=$450, worker4=$1350...
export const MARKET_WORKER_HIRE_COST = 150;
export const MARKET_WORKER_HIRE_MULTIPLIER = 3.0;
 
export const MARKET_WORKER_GEAR = {
  cart:       { id: "cart",       name: "Cart",       emoji: "🛒", itemsPerSecond: 1,  upgradeCost: null  },
  wagon:      { id: "wagon",      name: "Wagon",      emoji: "🪵", itemsPerSecond: 2,  upgradeCost: 400,   upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 } },
  truck:      { id: "truck",      name: "Truck",      emoji: "🚚", itemsPerSecond: 4,  upgradeCost: 1500,   upgradeTier: 2, upgradeRequires: { iron_ore: 80, lumber: 60 } },
  freight:    { id: "freight",    name: "Freight",    emoji: "🚛", itemsPerSecond: 10, upgradeCost: 8000,  upgradeTier: 2, upgradeRequires: { iron_ore: 100, lumber: 80 } },
  export_hub: { id: "export_hub", name: "Export Hub", emoji: "🏗️", itemsPerSecond: 20, upgradeCost: 30000, upgradeTier: 3, upgradeRequires: { iron_fitting: 5, iron_ore: 50, lumber: 40 } },
};
 
export const MARKET_WORKER_GEAR_ORDER = ["cart", "wagon", "truck", "freight", "export_hub"];
export const MARKET_WORKER_STANDING_ORDER_COST = 1500;
 
// ─── Kitchen workers ──────────────────────────────────────────────────────────
// First kitchen worker intentionally cheap ($15) so player can cook quickly.
// Workers 2+ scale at 3.0× so the kitchen still creates meaningful pressure.
export const KITCHEN_WORKER_HIRE_COST = 15;
export const KITCHEN_WORKER_HIRE_MULTIPLIER = 3.0;
 
export const KITCHEN_WORKER_UPGRADES = {
  speed_1:      { id: "speed_1",      name: "Sharp Knife",  emoji: "🔪",     cost: 250,   upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "+25% processing speed.",                      speedMultiplier: 0.75, tree: "speed" },
  auto_restart: { id: "auto_restart", name: "Auto-Restart", emoji: "🔄",     cost: 500,  upgradeTier: 1, description: "Auto restarts recipe when finished.",           requires: "speed_1",   tree: "speed" },
  speed_2:      { id: "speed_2",      name: "Prep Station", emoji: "🍳",     cost: 1000,  upgradeTier: 2, upgradeRequires: { iron_ore: 80, lumber: 60 }, description: "50% faster crafting (replaces Sharp Knife).",  speedMultiplier: 0.5,  requires: "auto_restart", tree: "speed" },
  batch_2:      { id: "batch_2",      name: "Batch ×2",     emoji: "📦",     cost: 2000,  upgradeTier: 2, upgradeRequires: { iron_ore: 80, lumber: 60 }, description: "Double input, double output per run.",          batchSize: 2,          tree: "batch" },
  batch_5:      { id: "batch_5",      name: "Batch ×5",     emoji: "📦📦",   cost: 8000, upgradeTier: 3, upgradeRequires: { reinforced_crate: 5, iron_ore: 30 }, description: "5× input, 5× output per run.",                  batchSize: 5,  requires: "batch_2", tree: "batch" },
  batch_10:     { id: "batch_10",     name: "Batch ×10",    emoji: "📦📦📦", cost: 25000, upgradeTier: 3, upgradeRequires: { reinforced_crate: 8, iron_ore: 50 }, description: "10× input, 10× output per run.",                batchSize: 10, requires: "batch_5", tree: "batch" },
};
 
export const KITCHEN_WORKER_UPGRADE_ORDER = ["speed_1", "auto_restart", "speed_2", "batch_2", "batch_5", "batch_10"];
 
export const KITCHEN_BASE_COST = 20;
export const KITCHEN_SLOT_COSTS = [50, 150];
export const KITCHEN_SLOT_UPGRADES = { speed_1: { speedMultiplier: 0.75 }, speed_2: { speedMultiplier: 0.5 } };
 
// ─── Barn worker constants ────────────────────────────────────────────────────
export const BARN_WORKER_HIRE_BASE_COST = 120;
export const BARN_WORKER_HIRE_MULTIPLIER = 2.0;
export const BARN_WORKER_UPGRADES = {
  speed_1:    { id: "speed_1",    name: "Quick Rounds",  emoji: "⚡", cost: 500, upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "Collect every 50s",     requires: null,         tree: "speed" },
  speed_2:    { id: "speed_2",    name: "Sprint Rounds", emoji: "⚡", cost: 1200, upgradeTier: 2, upgradeRequires: { iron_ore: 100, lumber: 80 }, description: "Collect every 40s",     requires: "speed_1",    tree: "speed" },
  capacity_1: { id: "capacity_1", name: "Big Basket",    emoji: "📦", cost: 600, upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "Collect 3 at once",     requires: null,         tree: "capacity" },
  capacity_2: { id: "capacity_2", name: "Cargo Basket",  emoji: "📦", cost: 1500, upgradeTier: 2, upgradeRequires: { iron_ore: 100, lumber: 80 }, description: "Collect 6 at once",     requires: "capacity_1", tree: "capacity" },
  care_1:     { id: "care_1",     name: "Gentle Hands",  emoji: "💝", cost: 400, upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "+25 mood to neediest animal every 2min", requires: null,      tree: "care" },
  care_2:     { id: "care_2",     name: "Animal Bond",   emoji: "💝", cost: 900, upgradeTier: 2, upgradeRequires: { iron_ore: 100, lumber: 80 }, description: "+35 mood to neediest animal every 90s",  requires: "care_1",  tree: "care" },
};
export const ANIMAL_STORAGE_UPGRADES = [
  { level: 1, cost: 400, maxStock: 15, label: "Bigger Nest" },
  { level: 2, cost: 1200, maxStock: 25, label: "Deluxe Nest" },
];
export const ANIMAL_YIELD_UPGRADES = [
  { level: 1, cost: 600, bonusYield: 1, upgradeTier: 1, label: "Well Fed"    },
  { level: 2, cost: 1800, bonusYield: 2, upgradeTier: 2, upgradeRequires: { iron_ore: 100, lumber: 80 }, label: "Pampered"    },
  { level: 3, cost: 5000, bonusYield: 3, upgradeTier: 3, upgradeRequires: { fine_tools: 5, iron_ore: 30 }, label: "Prize Animal" },
];
export const BARN_WORKER_BASE_INTERVAL = 60;  // seconds between collect actions
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
    description: "Permanently +5% grow speed. Stacks.",
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
    description: "Fishermen never catch minnows — bass or better minimum. Manual fishing still catches minnows.",
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
    description: "All recipes consume 25% fewer resources.",
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
export const PRESTIGE_CASH_THRESHOLD_BASE_S4 = 2000;
export const PRESTIGE_CASH_THRESHOLD_MULTIPLIER = 1.6;
 
export function getPrestigeCashThreshold(currentSeason) {
  if (currentSeason <= 3) return PRESTIGE_CASH_THRESHOLDS[currentSeason - 1];
  return Math.round(PRESTIGE_CASH_THRESHOLD_BASE_S4 * Math.pow(PRESTIGE_CASH_THRESHOLD_MULTIPLIER, currentSeason - 4));
}
 
// ─── Extra farm unlocks (season 4+) ──────────────────────────────────────────
export const FARM_UNLOCK_BASE_COST = 300;
export const FARM_UNLOCK_COST_INCREMENT = 200;
 
export function getFarmUnlockCost(extraFarmIndex) {
  return FARM_UNLOCK_BASE_COST + extraFarmIndex * FARM_UNLOCK_COST_INCREMENT;
}
 
export const EXTRA_FARM_CROPS = ["wheat", "berries", "tomatoes"];
 
// ─── Town ─────────────────────────────────────────────────────────────────────

// ── Population & Homes ────────────────────────────────────────────────────────
export const TOWN_STARTING_PEOPLE      = 1;
export const TOWN_HOME_CAPACITY        = 4;   // people per home
export const TOWN_HOME_SECOND_COST     = 50;
export const TOWN_HOME_COST_MULTIPLIER = 1.6;
export const TOWN_HOME_INSTANT_POPULATION = 1;
export const TOWN_GROWTH_PER_PULSE     = 1;
export const TOWN_DECLINE_PER_PULSE    = 1;

// ── Pulse system ──────────────────────────────────────────────────────────────
export const TOWN_PULSE_SECONDS        = 45;

// ── Food costs per pulse ──────────────────────────────────────────────────────
export const ANIMAL_FOOD_COSTS         = { chicken: 2, cow: 3, sheep: 4 };
export const PET_FOOD_COST             = 2;
export const BREAD_FOOD_UNITS          = 30;  // 1 bread feeds this many food units
export const PERSON_IDLE_FOOD_COST     = 1;
export const PERSON_WORKING_FOOD_COST  = 3;

// ── Satisfaction ──────────────────────────────────────────────────────────────
// Starts at 80 so there is immediate pressure even before Food Hall is built.
// Satisfaction multiplies all worker speed (floor 25%, ceiling per food tier).
export const TOWN_SATISFACTION_DEFAULT     = 80;
export const TOWN_SATISFACTION_FLOOR       = 25;
export const TOWN_SATISFACTION_STEP        = 5;   // drift per pulse toward target
export const TOWN_SATISFACTION_STARVE_STEP = 10;  // drop per pulse when starving
export const TOWN_PEOPLE_PER_GROWTH_BONUS  = 5;
export const TOWN_GROWTH_BONUS_PER_STEP    = 1;
export const TOWN_MAX_GROWTH_BONUS_PERCENT = 25;

// ── Food Hall — satisfaction ceilings per tier ────────────────────────────────
// tier 0 = no Food Hall (wheat only), 1 = bread, 2 = jam, 3 = sauce
export const FOOD_HALL_SAT_CEILING = [80, 100, 125, 150];
export const FOOD_HALL_FOOD_MODE   = ["wheat", "bread", "jam", "sauce"];

// ── Town Hall ─────────────────────────────────────────────────────────────────
export const TOWN_HALL_MAX_LEVEL   = 3;
export const TOWN_HALL_LEVEL_COSTS = [100, 1_500, 4_000];
export const TOWN_HALL_L1_IRON     = 0;
export const TOWN_HALL_L1_LUMBER   = 0;
export const TOWN_HALL_L2_IRON     = 50;
export const TOWN_HALL_L2_LUMBER   = 50;
export const TOWN_HALL_L3_IRON     = 100;
export const TOWN_HALL_L3_LUMBER   = 80;
export const TOWN_HALL_L3_FITTING  = 8;
export const TOWN_HALL_L4_FITTING  = 0; // L4 removed
export const TOWN_HALL_L4_CRATE    = 0; // L4 removed
// TH 0: Homes, Clinic, Warehouse, Food Hall
// TH 1: Kitchen Hall, Market Hall, Tavern
// TH 2: Guild Hall, School
// TH 3+: Recreation Hall; all level 2+ building upgrades
export const TOWN_HALL_BUILDING_GATES = {
  homes: 0, clinic: 0, warehouse: 0, food_hall: 0,
  kitchen_hall: 1, market_hall: 1, tavern: 1, forge_hall: 1,
  guild_hall: 2, school: 2,
  barn_hall: 3,
  recreation_hall: 2,
};

// ── Pond / Forge build costs (unchanged) ─────────────────────────────────────
export const POND_IRON        = 10;
export const POND_LUMBER      = 5;
export const FORGE_BUILD_COST = 50;
export const FORGE_IRON       = 10;
export const FORGE_LUMBER     = 5;

// ── Clinic ────────────────────────────────────────────────────────────────────
// Hard-caps population. Nobody new moves in past CLINIC_BASE_CAP without medics.
export const TOWN_CLINIC_COST     = 1_500;
export const CLINIC_BASE_CAP      = 8;
export const CLINIC_CAP_PER_MEDIC = 4;

// ── Food Hall ─────────────────────────────────────────────────────────────────
// One building, three upgrade tiers. Each tier raises sat ceiling + switches food mode.
export const TOWN_FOOD_HALL_COST           = 800;
export const TOWN_FOOD_HALL_TIER2_COST     = 2_000;
export const TOWN_FOOD_HALL_TIER3_COST     = 4_000;
export const TOWN_FOOD_HALL_TIER2_REQUIRES = { iron_ore: 60, lumber: 40 };
export const TOWN_FOOD_HALL_TIER3_REQUIRES = { iron_fitting: 3, iron_ore: 100, lumber: 80 };

// ── Warehouse ─────────────────────────────────────────────────────────────────
// Per-crop storage cap (wheat, berries, tomatoes independently).
// Warehouse: infinite level scaling. Cap = base + workers * perWorker (per level).
// Overflow is lost — waste pressure enforces warehouse investment.
export const WAREHOUSE_NO_BUILDING_CAP = 150; // hard cap per crop before warehouse is built
export const TOWN_WAREHOUSE_COST       = 500;
// First 3 levels use these fixed costs; level 4+ scales exponentially
export const WAREHOUSE_LEVEL_COSTS     = [1_500, 5_000, 15_000];  // levels 1→2, 2→3, 3→4
export const WAREHOUSE_LEVEL_REQUIRES  = [
  { iron_ore: 60, lumber: 40 },
  { iron_fitting: 3, iron_ore: 60, lumber: 80 },
  { iron_fitting: 8, iron_ore: 120, lumber: 100 },
];
// Per-level stats (index = level-1). Level 4+ extrapolates from these.
export const WAREHOUSE_LEVEL_BASE_CAP      = [500, 1_500, 4_000, 10_000]; // base cap per level
export const WAREHOUSE_LEVEL_CAP_PER_WORKER = [200,  600,  1_500,  4_000]; // per worker per level
export const WAREHOUSE_LEVEL_MAX_WORKERS    = [3, 5, 8, 12];               // worker slots per level
export const WAREHOUSE_LEVEL_NAMES          = ["Basic Shelving", "Forklifts", "Conveyor Belts", "Automated Sorting"];

// ── Kitchen Hall ──────────────────────────────────────────────────────────────
// Gates kitchen worker count + upgrades. Level 2 = retain 1st worker on prestige.
export const TOWN_KITCHEN_HALL_COST      = 300;
export const KITCHEN_HALL_LEVEL_COSTS    = [1_500, 6_000];
export const KITCHEN_HALL_LEVEL_REQUIRES = [
  { iron_ore: 80, lumber: 60 },
  { iron_ore: 120, lumber: 100, iron_fitting: 5 },
];
export const KITCHEN_HALL_MAX_WORKERS  = [2, 4, 6]; // per level (1, 2, 3)
export const KITCHEN_HALL_RETAIN_COUNT = [0, 1, 2]; // auto-retain on prestige per level

// ── Market Hall ───────────────────────────────────────────────────────────────
// Gates market worker count + sell price bonus (absorbs old Bank role).
export const TOWN_MARKET_HALL_COST      = 400;
export const MARKET_HALL_LEVEL_COSTS    = [2_000, 8_000];
export const MARKET_HALL_LEVEL_REQUIRES = [
  { iron_ore: 80, lumber: 60 },
  { iron_ore: 150, lumber: 120, iron_fitting: 6 },
];
export const MARKET_HALL_MAX_WORKERS  = [2, 4, 6];   // per level
export const MARKET_HALL_PRICE_BONUS  = [0, 10, 25]; // % sell price bonus per level
export const MARKET_HALL_RETAIN_COUNT = [0, 1, 2];   // auto-retain on prestige per level

// ── Barn Hall ─────────────────────────────────────────────────────────────────
// Gates barn worker count per building. TH2 required.
// Level N = N workers per barn building, retain floor(N/2) on prestige
export const TOWN_BARN_HALL_COST       = 1_500;
export const BARN_HALL_LEVEL_COSTS     = [3_000, 7_000]; // L2, L3 costs (L4+ scales)
export const BARN_HALL_LEVEL_REQUIRES  = [
  { iron_ore: 100, lumber: 80 },                         // L2
  { iron_ore: 150, lumber: 120, iron_fitting: 8 },         // L3
];
// Workers per building = hall level. Retain = floor(level / 2)

// ── Forge Hall ────────────────────────────────────────────────────────────────
// Gates total forge workers, recipe tiers, and arcane machine. TH1 required.
// Level N = N*2 max workers, N retain on prestige
// L2 unlocks T2 recipes, L3 unlocks T3 recipes, L4 unlocks Arcane Upgrade Machine
export const TOWN_FORGE_HALL_COST       = 500;
export const FORGE_HALL_LEVEL_COSTS     = [2_000, 6_000, 15_000]; // L2, L3, L4
export const FORGE_HALL_LEVEL_REQUIRES  = [
  { iron_ore: 100, lumber: 80 },                                         // L2
  { iron_ore: 150, lumber: 120, iron_fitting: 8 },                         // L3
  { iron_fitting: 10, reinforced_crate: 6, fine_tools: 4, iron_ore: 80 },  // L4
];
// Max workers = level * 2; retain = level per prestige; T2 at L2, T3 at L3, Arcane at L4

// ── Guild Hall ────────────────────────────────────────────────────────────────
// Gates quest tiers (world zone availability) and max hero count.
export const TOWN_GUILD_HALL_COST = 2_000;

// Guild Hall scales infinitely. Use getGuildHallUpgradeCost(level) and
// getGuildHallUpgradeRequires(level) for the upgrade from level -> level+1.
export function getGuildHallUpgradeCost(level) {
  return Math.round(5000 * Math.pow(1.8, level - 1) / 100) * 100;
}
export function getGuildHallUpgradeRequires(level) {
  const iron   = Math.round(15 * Math.pow(1.5, level - 1) / 5) * 5;
  const lumber = iron;
  const fittings = level >= 3 ? Math.round(2 * Math.pow(1.6, level - 3)) : 0;
  const crates   = level >= 6 ? Math.round(2 * Math.pow(1.6, level - 6)) : 0;
  const req = { iron_ore: iron, lumber };
  if (fittings > 0) req.iron_fitting = fittings;
  if (crates   > 0) req.reinforced_crate = crates;
  return req;
}
// maxHeroes = guildHallLevel + 1  (computed inline, no array needed)
export const GUILD_HALL_QUEST_TIER = [1, 2, 3, 4]; // legacy — kept for WorldZone compat

// ── Tavern ────────────────────────────────────────────────────────────────────
// Heroes auto-rest here when idle until full HP. Level increases regen rate.
export const TAVERN_LEVEL_COSTS  = [50, 500, 2_000, 8_000];
export const TAVERN_LEVEL_IRON   = [10,  60,   100,    120];
export const TAVERN_LEVEL_LUMBER = [ 5,  40,    80,      0];
export const TAVERN_LEVEL_REGEN  = [0.7, 1.0,  1.5,    2.5]; // HP/s per level

// ── School ────────────────────────────────────────────────────────────────────
// Research unlocks gated upgrades. Costs mana crystals (competing with selling).
export const TOWN_SCHOOL_COST           = 2_500;
export const SCHOOL_RESEARCH_TIME_FLOOR = 0.05;
export const SCHOOL_GROW_PER_RESEARCHER = 0.2;

// ── Recreation Hall ─────────────────────────────────────────────────────────
// Workers push satisfaction past the Food Hall ceiling. Cash drain per second.
export const TOWN_REC_HALL_COST             = 4_000;
export const TOWN_REC_HALL_REQUIRES         = { iron_fitting: 3, lumber: 20 };
export const REC_HALL_SAT_PER_WORKER        = 0.5;  // % sat bonus per worker
export const REC_HALL_CASH_PER_WORKER       = 0.05; // $/second/worker
export const REC_HALL_MAX_WORKERS_BASE      = 10;
export const REC_HALL_MAX_WORKERS_PER_TIER  = 10;
export const REC_HALL_UPGRADE_COSTS         = [8_000, 18_000];
export const REC_HALL_UPGRADE_REQUIRES      = [
  { iron_fitting: 5, reinforced_crate: 2 },
  { iron_fitting: 8, reinforced_crate: 4 },
];

// ── Legacy constants — kept for save-file compat, no longer drive new logic ──
export const TOWN_SATISFACTION_CEILING           = 150;
export const TOWN_SAT_WHEAT                      = 80;
export const TOWN_SAT_BAKERY                     = 100;
export const TOWN_SAT_BAKERY_JAM                 = 125;
export const TOWN_SAT_BAKERY_SAUCE               = 140;
export const TOWN_SAT_ALL_BUILDINGS              = 150;
export const TREASURY_TIERS                      = [];
export const BANK_BUILD_COST                     = 0;
export const BANK_LEVEL_COSTS                    = [];
export const BANK_TIERS                          = [];
export const BANK_MAX_LEVEL                      = 0;
export const BUILDING_WORKERS_DIVISOR            = 6;
export const BUILDING_PULSE_EXTRA_SECONDS        = 10;
export const BUILDING_UPGRADE_COST               = 1000;
export const INVEST_NOW_PCT                      = 0.10;
export const INVEST_NOW_CD_SECONDS               = 30;
export const TOWN_BAKERY_BASE_COST               = 800;
export const TOWN_BAKERY_COST_MULTIPLIER         = 1.5;
export const TOWN_JAM_BUILDING_COST              = 2_000;
export const TOWN_SAUCE_BUILDING_COST            = 4_000;
export const CLINIC_SAT_PER_MEDIC                = 0;
// CLINIC_CAP_PER_MEDIC defined above in new Clinic section
export const TAVERN_SAT_PER_BARTENDER            = 0;
export const RESTAURANT_SAT_PER_CHEF             = 0;
export const CLOTHIER_CASH_PER_CLERK             = 0;
export const RESTAURANT_OMELETTE_PER_PULSE_DIVISOR = 3;
export const RESTAURANT_CHEESE_PER_PULSE_DIVISOR   = 3;
export const TAVERN_GOODS_PER_PULSE_DIVISOR      = 4;
export const CLOTHIER_GOODS_PER_PULSE_DIVISOR    = 3;
export const RESTAURANT_SAT_BONUS_MAX            = 0;
export const TAVERN_SAT_BONUS_MAX                = 0;
export const TOWN_TAVERN_COST                    = 3_000;
export const TOWN_RESTAURANT_COST                = 0;
export const TOWN_CLOTHIER_COST                  = 0;
export const SCHOOL_GROW_PER_RESEARCHER_OLD      = 0.2;
 
// ─── Season structure ─────────────────────────────────────────────────────────
export const SEASON_FARMS = { 1: ["wheat"], 2: ["wheat", "berries"], 3: ["wheat", "berries", "tomatoes"] };
export const SEASON_BARNS = { 4: "chicken_coop", 5: "dairy", 6: "wool_shed" };
export const FIRST_EXTRA_FARM_SEASON = 4;
export const FIRST_CHOICE_SEASON = 7; // season 7+ player picks farm or barn each prestige
export const PRESTIGE_MIN_BARN_WORKERS = 1; // each built barn needs at least this many workers
export const PRESTIGE_MIN_BARN_ANIMALS = 2; // each built barn needs at least this many animals
export const MAX_SEASON = 999;
 
// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 10_000;
export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;
 
// ─── Pond ─────────────────────────────────────────────────────────────────────

export const FISHING_BODIES = {
  pond:  { id: "pond",  name: "Pond",  emoji: "🏊", unlockCost: 0,     maxWorkers: 1 },
  lake:  { id: "lake",  name: "Lake",  emoji: "🏞️", unlockCost: 2000,  maxWorkers: 2, materialCost: { lumber: 15, iron_ore: 10 } },
  river: { id: "river", name: "River", emoji: "🏔️", unlockCost: 8000,  maxWorkers: 4, materialCost: { lumber: 30, iron_fitting: 3 } },
  ocean: { id: "ocean", name: "Ocean", emoji: "🌊", unlockCost: 25000, maxWorkers: 8, materialCost: { iron_fitting: 5, fine_tools: 3 } },
};
export const FISHING_BODY_ORDER = ["pond", "lake", "river", "ocean"];

export const FISHING_FISH = {
  minnow: { id: "minnow", name: "Minnow",   emoji: "🎣", rawValue: 2  },
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
  speed_1: { id: "speed_1", name: "Quick Cast",  emoji: "⚡", cost: 600, upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "Fish every 40s",   tree: "speed",    requires: null        },
  speed_2: { id: "speed_2", name: "Sprint Cast", emoji: "⚡", cost: 1500, upgradeTier: 2, upgradeRequires: { iron_ore: 20, lumber: 15 }, description: "Fish every 20s",   tree: "speed",    requires: "speed_1"   },
  haul_1:  { id: "haul_1",  name: "Big Net",     emoji: "📦", cost: 800, upgradeTier: 1, upgradeRequires: { iron_ore: 5, lumber: 4 }, description: "Catch 2 at once",  tree: "haul",     requires: null        },
  haul_2:  { id: "haul_2",  name: "Trawl Net",   emoji: "📦", cost: 4000, upgradeTier: 2, upgradeRequires: { iron_ore: 20, lumber: 15 }, description: "Catch 5 at once",  tree: "haul",     requires: "haul_1"    },
  gear_good:   { id: "gear_good",   name: "Good Rod",   emoji: "🎣", cost: 800, upgradeTier: 2, upgradeRequires: { iron_ore: 20, lumber: 15 }, description: "Unlocks perch",    tree: "gear",     requires: null        },
  gear_expert: { id: "gear_expert", name: "Expert Rod",  emoji: "🎣", cost: 1000, upgradeTier: 3, upgradeRequires: { fine_tools: 5 }, description: "Best rare odds",  tree: "gear",     requires: "gear_good" },
};

export const FISHING_WORKER_HIRE_COSTS = {
  pond:  75,
  lake:  300,
  river: 1000,
  ocean: 3000,
};
export const FISHING_WORKER_BASE_INTERVAL = 60;
export const POND_COST = 0; // cash cost (materials now required — see POND_IRON / POND_LUMBER)

// ─── Player fishing upgrades (manual minigame) ────────────────────────────────
// These are one-time cash purchases that persist across the session.
// Stored in state.fishing.playerUpgrades as an array of upgrade IDs.
export const FISHING_PLAYER_UPGRADES = {
  // 🪝 Rod — widens the needle sweet spot
  rod_1: { id: "rod_1", name: "Birch Rod",    emoji: "🪝", cost: 150,  tree: "rod",  requires: null,    description: "+10% wider sweet spot." },
  rod_2: { id: "rod_2", name: "Oak Rod",      emoji: "🪝", cost: 350,  tree: "rod",  requires: "rod_1", description: "+10% wider sweet spot." },
  rod_3: { id: "rod_3", name: "Carbon Rod",   emoji: "🪝", cost: 800,  tree: "rod",  requires: "rod_2", description: "+10% wider sweet spot." },
  // ⏱️ Reel — more progress per tap
  reel_1: { id: "reel_1", name: "Smooth Drag",   emoji: "⏱️", cost: 200,  tree: "reel", requires: null,     description: "+20% reel per tap." },
  reel_2: { id: "reel_2", name: "Power Reel",    emoji: "⏱️", cost: 500,  tree: "reel", requires: "reel_1", description: "+20% reel per tap." },
  // 🐢 Patience — slower needle sweep speed
  patience_1: { id: "patience_1", name: "Weighted Float", emoji: "🐢", cost: 175,  tree: "patience", requires: null,          description: "-15% needle sweep speed." },
  patience_2: { id: "patience_2", name: "Anchor Rig",     emoji: "🐢", cost: 450,  tree: "patience", requires: "patience_1", description: "-15% needle sweep speed." },
  // 🧺 Haul — catch multiple fish per successful reel (OP endgame scaling)
  haul_2:  { id: "haul_2",  name: "Creel Basket",  emoji: "🧺", cost: 1500,  tree: "haul", requires: null,     description: "Catch 2 fish per successful reel." },
  haul_5:  { id: "haul_5",  name: "Cast Net",       emoji: "🕸️", cost: 6000, tree: "haul", requires: "haul_2", description: "Catch 5 fish per successful reel." },
  haul_10: { id: "haul_10", name: "Deep Net",       emoji: "🌊", cost: 25000, tree: "haul", requires: "haul_5", description: "Catch 10 fish per successful reel." },
};
export const FISHING_PLAYER_UPGRADE_ORDER = {
  rod:      ["rod_1", "rod_2", "rod_3"],
  reel:     ["reel_1", "reel_2"],
  patience: ["patience_1", "patience_2"],
  haul:     ["haul_2", "haul_5", "haul_10"],
};

 

 
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
    upkeepPerAnimalPerSec: 0.15,
    unlockSeason: 4,
  },
  dairy: {
    id: "dairy", name: "Dairy", emoji: "🐄",
    animalType: "cow",
    buildCost: 2000,
    upkeepPerAnimalPerSec: 0.25,
    unlockSeason: 5,
  },
  wool_shed: {
    id: "wool_shed", name: "Wool Shed", emoji: "🐑",
    animalType: "sheep",
    buildCost: 5000,
    upkeepPerAnimalPerSec: 0.30,
    unlockSeason: 6,
  },
};

export const BARN_BUILDING_ORDER = ["chicken_coop", "dairy", "wool_shed"];

// tier 0 = not built yet; tiers 1-4 = built and upgraded
export const BARN_BUILDING_TIERS = [
  { tier: 1, name: "Basic",    animalSlots: 3,  upgradeCost: 0,    upgradeMaterialCost: {} },
  { tier: 2, name: "Improved", animalSlots: 5,  upgradeCost: 1500, upgradeMaterialCost: { iron_ore: 15, lumber: 15 } },
  { tier: 3, name: "Advanced", animalSlots: 8,  upgradeCost: 4000, upgradeMaterialCost: { iron_ore: 25, lumber: 25, iron_fitting: 2 } },
  { tier: 4, name: "Premium",  animalSlots: 12, upgradeCost: 9000, upgradeMaterialCost: { iron_ore: 40, lumber: 40, iron_fitting: 4, fine_tools: 2 } },
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
  fish_meal:     { id: "fish_meal",      name: "Fish Meal",         emoji: "🌿", inputCrop: "minnow", inputAmount: 5, outputGood: "fish_meal", outputAmount: 1, seconds: 45,  description: "Fertilizer. Gives a 10min grow speed boost." },
  fish_meal_bass: { id: "fish_meal_bass", name: "Fish Meal (Bass)",  emoji: "🌿", inputCrop: "bass",   inputAmount: 3, outputGood: "fish_meal", outputAmount: 1, seconds: 60,  description: "Fertilizer from bass. For when minnows are scarce." },
};
 
export const ANIMAL_SELL_RATES = {
  egg: 5, milk: 15, wool: 25,
  omelette: 40, cheese: 60, knitted_goods: 90,
  fish_pie: 45, smoked_fish: 35, fish_meal: 20,
  minnow: 2, bass: 8, perch: 12, rare: 35,
};

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

// ─── World / Adventurer System ────────────────────────────────────────────────

export const ADVENTURER_CLASSES = {
  fighter: { id: "fighter", name: "Fighter", emoji: "⚔️", description: "Balanced. Good all-around." },
  ranger:  { id: "ranger",  name: "Ranger",  emoji: "🏹", description: "Fast missions, lower loot." },
  mage:    { id: "mage",    name: "Mage",    emoji: "🧙", description: "Slower but higher XP gain." },
};

// ─── Hero Skill Trees ────────────────────────────────────────────────────────
// skills is now stored as { skillId: rank } on adventurer (rank >= 1 = owned).
// Tier 1 (class choice) locks the tree until first prestige.
// Skills 5-6 in each tree are repeatable up to maxRank times.
// auto_battle unlocked at tier 4 of any tree.
// Cross-tree dipping: P5+ can buy tier 1 of a second tree; P10+ can buy tier 2.

export const HERO_CLASS_META = {
  fighter:   { id: "fighter",   name: "Fighter",   emoji: "⚔️",  color: "#ef4444", description: "Sustain & auto-battle. Load up and walk away." },
  mage:      { id: "mage",      name: "Mage",      emoji: "🧙",  color: "#a78bfa", description: "Speed & XP. Fast runs, active play." },
  scavenger: { id: "scavenger", name: "Scavenger", emoji: "🌿",  color: "#4ade80", description: "Loot & evasion. High risk, high reward." },
};

export const HERO_SKILL_TREES = {
  // ─── FIGHTER ───────────────────────────────────────────────────────────────
  // Each skill has 3 ranks. Cost to buy rank N = N skill points (1, 2, 3).
  // Tier unlocks when you have at least rank 1 in the previous tier.
  fighter: [
    {
      id: "fighter_t1",
      name: "Iron Stance",
      emoji: "🛡️",
      tier: 1,
      classUnlock: "fighter",
      description: "+10/+20/+30 max HP. Unlocks Fighter tree & auto-battle.",
      requiredLevel: 2,
      maxRank: 3,
      hpPerRank: 10,
      grantsAutoBattle: true,
    },
    {
      id: "fighter_t2",
      name: "Iron Rations",
      emoji: "🍖",
      tier: 2,
      description: "Food heals +5 HP per rank (up to +15 bonus healing).",
      requiredLevel: 4,
      maxRank: 3,
      healBonusPerRank: 5,
    },
    {
      id: "fighter_t3",
      name: "Hearth Guardian",
      emoji: "🍞",
      tier: 3,
      description: "🌾 Bread bakes 15%/30%/50% faster globally per rank. (Only the highest rank among all heroes applies — does not stack.)",
      requiredLevel: 6,
      maxRank: 3,
      crossSystemEffect: "bread_speed",
      breadSpeedPerRank: [0.15, 0.30, 0.50],
    },
    {
      id: "fighter_t4",
      name: "Relentless",
      emoji: "🔄",
      tier: 4,
      description: "Rank 1: skip food if HP ≥ 70% (barely hurt). Rank 2: skip food if HP ≥ 50%. Rank 3: skip food if HP ≥ 30% (trust the belt).",
      requiredLevel: 8,
      maxRank: 3,
    },
    {
      id: "fighter_t4b",
      name: "Provisioner",
      emoji: "🎒",
      tier: 4,
      description: "+1/+2/+3 food belt slots per rank.",
      requiredLevel: 8,
      maxRank: 3,
      foodSlotsPerRank: 1,
    },
    {
      id: "fighter_t5",
      name: "Fortitude",
      emoji: "❤️",
      tier: 5,
      description: "+10 max HP per rank (up to +30).",
      requiredLevel: 10,
      maxRank: 3,
      repeatable: true,
      hpPerRank: 10,
    },
    {
      id: "fighter_t6",
      name: "Resilience",
      emoji: "💪",
      tier: 6,
      description: "Healing from food/items +10%/+20%/+30% per rank.",
      requiredLevel: 12,
      maxRank: 3,
      repeatable: true,
      healMultPerRank: 0.10,
    },
  ],

  // ─── MAGE ──────────────────────────────────────────────────────────────────
  mage: [
    {
      id: "mage_t1",
      name: "Flicker Step",
      emoji: "💨",
      tier: 1,
      classUnlock: "mage",
      description: "-8%/-15%/-22% mission duration per rank. Unlocks Mage tree & auto-battle.",
      requiredLevel: 2,
      maxRank: 3,
      durationPerRank: [0.08, 0.15, 0.22],
      grantsAutoBattle: true,
    },
    {
      id: "mage_t2",
      name: "Spell Surge",
      emoji: "✨",
      tier: 2,
      description: "+8%/+15%/+22% XP from missions per rank.",
      requiredLevel: 4,
      maxRank: 3,
      xpPerRank: [0.08, 0.15, 0.22],
    },
    {
      id: "mage_t3",
      name: "Arcane Focus",
      emoji: "🍳",
      tier: 3,
      description: "🌾 Kitchen bonus output chance 10%/20%/30% per rank. (Only the highest rank among all heroes applies — does not stack.)",
      requiredLevel: 6,
      maxRank: 3,
      crossSystemEffect: "kitchen_bonus",
      kitchenChancePerRank: 0.10,
    },
    {
      id: "mage_t4",
      name: "Blink",
      emoji: "⚡",
      tier: 4,
      description: "Rank 1: -5% run duration. Rank 2: -10% run duration. Rank 3: -15% run duration.",
      requiredLevel: 8,
      maxRank: 3,
      blinkBonusPerRank: [0, 0.05, 0.10, 0.15],
    },
    {
      id: "mage_t4b",
      name: "Abundance",
      emoji: "🌽",
      tier: 4,
      description: "+1/+2/+3 food belt slots per rank.",
      requiredLevel: 8,
      maxRank: 3,
      foodSlotsPerRank: 1,
    },
    {
      id: "mage_t5",
      name: "Swiftness",
      emoji: "🏃",
      tier: 5,
      description: "-5% mission duration per rank (up to -15%).",
      requiredLevel: 10,
      maxRank: 3,
      repeatable: true,
      durationReductionPerRank: 0.05,
    },
    {
      id: "mage_t6",
      name: "Mind Over Matter",
      emoji: "🧠",
      tier: 6,
      description: "+15% XP per rank (up to +45% more XP).",
      requiredLevel: 12,
      maxRank: 3,
      repeatable: true,
      xpBonusPerRank: 0.15,
    },
  ],

  // ─── SCAVENGER ─────────────────────────────────────────────────────────────
  scavenger: [
    {
      id: "scavenger_t1",
      name: "Sharp Eyes",
      emoji: "👁️",
      tier: 1,
      classUnlock: "scavenger",
      description: "+1/+2/+3 minimum loot per rank. Unlocks Scavenger tree & auto-battle.",
      requiredLevel: 2,
      maxRank: 3,
      minLootPerRank: 1,
      grantsAutoBattle: true,
    },
    {
      id: "scavenger_t2",
      name: "Ghost Step",
      emoji: "👻",
      tier: 2,
      description: "10%/20%/30% chance to take 0 damage each tick per rank.",
      requiredLevel: 4,
      maxRank: 3,
      evasionPerRank: 0.10,
    },
    {
      id: "scavenger_t3",
      name: "Fence Network",
      emoji: "💰",
      tier: 3,
      description: "🌾 Market sell prices +5%/+10%/+15% per rank. (Only the highest rank among all heroes applies — does not stack.)",
      requiredLevel: 6,
      maxRank: 3,
      crossSystemEffect: "market_bonus",
      marketBonusPerRank: 0.05,
    },
    {
      id: "scavenger_t4",
      name: "Scavenger",
      emoji: "🌿",
      tier: 4,
      description: "Rank 1: 15% find food per run. Rank 2: 30% find food per run. Rank 3: 60% find food per run.",
      requiredLevel: 8,
      maxRank: 3,
      foodFindPerRank: [0, 0.15, 0.30, 0.60],
    },
    {
      id: "scavenger_t4b",
      name: "Pack Rat",
      emoji: "🎽",
      tier: 4,
      description: "+1/+2/+3 food belt slots per rank.",
      requiredLevel: 8,
      maxRank: 3,
      foodSlotsPerRank: 1,
    },
    {
      id: "scavenger_t5",
      name: "Keen Eye",
      emoji: "🎯",
      tier: 5,
      description: "+1 min loot per rank (up to +3 more minimum loot).",
      requiredLevel: 10,
      maxRank: 3,
      repeatable: true,
      minLootPerRank: 1,
    },
    {
      id: "scavenger_t6",
      name: "Phantom",
      emoji: "🌫️",
      tier: 6,
      description: "+5% evasion per rank (up to +15%, stacks with Ghost Step).",
      requiredLevel: 12,
      maxRank: 3,
      repeatable: true,
      evasionPerRank: 0.05,
    },
  ],
};

// Flat list of all skill defs keyed by id — for easy lookup
export const HERO_SKILL_DEFS = Object.fromEntries(
  Object.values(HERO_SKILL_TREES).flat().map((s) => [s.id, s])
);

// Legacy HERO_SKILLS kept as empty array so old imports don't crash
export const HERO_SKILLS = [];

// Prestige constants for hero skill tree
export const HERO_PRESTIGE_COST_BASE = 10000; // × (prestigeLevel + 1) in cash
export const HERO_PRESTIGE_SKILL_COST = 3;    // skill points required to unlock prestige ability (legacy — no longer used as gate)
export const HERO_PRESTIGE_MIN_LEVEL = 15;    // minimum level required to prestige
export const HERO_PRESTIGE_REVIVE_BASE = 100; // × max(1, prestigeLevel) in cash

// Cross-tree dip unlock thresholds
export const HERO_DIP_TREE_PRESTIGE_TIER1 = 5;  // P5: can buy tier 1 of second tree
export const HERO_DIP_TREE_PRESTIGE_TIER2 = 10; // P10: can buy tier 2 of second tree

export const ADVENTURER_NAMES = [
  "Aldric", "Brynn", "Cassia", "Dorin", "Elowen", "Fenn",
  "Gala",   "Hazel", "Idris",  "Jora",  "Kael",   "Lyra",
  "Maren",  "Niall", "Orin",   "Petra", "Quinn",  "Rowe",
  "Sable",  "Thorn", "Ulara",  "Vex",   "Wren",   "Xan",
];

export const WORLD_ZONES = {
  old_mine: {
    id: "old_mine",
    name: "Old Mine",
    emoji: "⛏️",
    description: "A collapsed mine on the edge of your land. Rattlesnakes and cave-ins.",
    baseDuration: 45,
    clearsNeeded: 4,
    heroLevelRequired: 1,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 1,
    xpReward: 4,
    enemyName: "Mine Crawlers",
    damagePerTick: 6,
    maxEnemyHp: 12,
    loot: [{ resourceKey: "iron_ore", emoji: "🪨", name: "Iron Ore", min: 2, max: 5 }],
    workerResource: "Iron Ore",
    workerEmoji: "🪨",
    workerYieldPerMinute: 3,
  },
  birch_forest: {
    id: "birch_forest",
    name: "Birch Forest",
    emoji: "🌲",
    description: "A quiet forest with plenty of lumber. Also home to wolves.",
    baseDuration: 60,
    clearsNeeded: 5,
    heroLevelRequired: 2,
    unlockAfterClears: 2,
    unlockRequiresZone: "old_mine",
    gearRequired: 2,
    xpReward: 7,
    enemyName: "Forest Wolves",
    damagePerTick: 8,
    maxEnemyHp: 30,
    loot: [
      { resourceKey: "lumber", emoji: "🪵", name: "Lumber", min: 3, max: 6 },
      { resourceKey: "herbs",  emoji: "🌿", name: "Herbs",  min: 1, max: 3 },
    ],
    workerResource: "Lumber",
    workerEmoji: "🪵",
    workerYieldPerMinute: 2,
  },
  damp_cave: {
    id: "damp_cave",
    name: "Damp Cave",
    emoji: "🧪",
    description: "Dripping walls, strange fungi, and things that have never seen sunlight.",
    baseDuration: 75,
    clearsNeeded: 6,
    heroLevelRequired: 4,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 4,
    xpReward: 12,
    enemyName: "Cave Horrors",
    damagePerTick: 9,
    maxEnemyHp: 45,
    loot: [
      { resourceKey: "herbs",    emoji: "🌿", name: "Herbs",    min: 4, max: 8 },
      { resourceKey: "iron_ore", emoji: "🪨", name: "Iron Ore", min: 1, max: 3 },
      { resourceKey: "rare_gem", emoji: "💎", name: "Rare Gem", min: 0, max: 1 },
    ],
    workerResource: "Herbs",
    workerEmoji: "🌿",
    workerYieldPerMinute: 4,
  },
  deep_mine: {
    id: "deep_mine",
    name: "Deep Mine",
    emoji: "⛰️",
    description: "A deeper shaft beneath the old mine. Rich iron deposits, real danger.",
    baseDuration: 70,
    clearsNeeded: 5,
    heroLevelRequired: 5,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 5,
    xpReward: 15,
    enemyName: "Rock Golems",
    damagePerTick: 11,
    maxEnemyHp: 55,
    loot: [
      { resourceKey: "iron_ore", emoji: "🪨", name: "Iron Ore", min: 6, max: 12 },
      { resourceKey: "rare_gem", emoji: "💎", name: "Rare Gem", min: 0, max: 2 },
    ],
    workerResource: "Iron Ore",
    workerEmoji: "🪨",
    workerYieldPerMinute: 6,
  },
  ancient_forest: {
    id: "ancient_forest",
    name: "Ancient Forest",
    emoji: "🌳",
    description: "Old growth trees with premium lumber. The treants are ancient and furious.",
    baseDuration: 85,
    clearsNeeded: 6,
    heroLevelRequired: 7,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 8,
    xpReward: 28,
    enemyName: "Treants",
    damagePerTick: 14,
    maxEnemyHp: 80,
    loot: [
      { resourceKey: "lumber",   emoji: "🪵", name: "Lumber",   min: 6, max: 14 },
      { resourceKey: "herbs",    emoji: "🌿", name: "Herbs",    min: 3, max: 6 },
      { resourceKey: "rare_gem", emoji: "💎", name: "Rare Gem", min: 0, max: 2 },
    ],
    workerResource: "Lumber",
    workerEmoji: "🪵",
    workerYieldPerMinute: 5,
  },
  iron_vein: {
    id: "iron_vein",
    name: "Iron Vein",
    emoji: "🔩",
    description: "A legendary vein of pure iron deep in the mountains. Stone Titans guard every passage.",
    baseDuration: 100,
    clearsNeeded: 7,
    heroLevelRequired: 9,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 10,
    xpReward: 35,
    enemyName: "Stone Titans",
    damagePerTick: 16,
    maxEnemyHp: 110,
    loot: [
      { resourceKey: "iron_ore", emoji: "🪨", name: "Iron Ore", min: 10, max: 22 },
      { resourceKey: "rare_gem", emoji: "💎", name: "Rare Gem", min: 0, max: 3 },
      { resourceKey: "lumber",   emoji: "🪵", name: "Lumber",   min: 3, max: 7 },
    ],
    workerResource: "Iron Ore",
    workerEmoji: "🪨",
    workerYieldPerMinute: 12,
  },
  sunken_ruins: {
    id: "sunken_ruins",
    name: "Sunken Ruins",
    emoji: "🏚️",
    description: "A submerged city swallowed by the earth. Crawling with cursed soldiers who never knew they lost.",
    baseDuration: 120,
    clearsNeeded: 8,
    heroLevelRequired: 12,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 14,
    xpReward: 50,
    enemyName: "Cursed Legions",
    damagePerTick: 20,
    maxEnemyHp: 160,
    loot: [
      { resourceKey: "rare_gem",     emoji: "💎", name: "Rare Gem",     min: 1, max: 4 },
      { resourceKey: "mana_crystal", emoji: "🔮", name: "Mana Crystal", min: 1, max: 3 },
      { resourceKey: "iron_ore",     emoji: "🪨", name: "Iron Ore",     min: 5, max: 12 },
    ],
    workerResource: "Mana Crystal",
    workerEmoji: "🔮",
    workerYieldPerMinute: 2,
  },
  titans_maw: {
    id: "titans_maw",
    name: "Titan's Maw",
    emoji: "🌋",
    description: "A volcanic rift at the edge of the known world. Ash giants haunt the caldera. Only the best-equipped heroes survive.",
    baseDuration: 140,
    clearsNeeded: 10,
    heroLevelRequired: 14,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 22,
    xpReward: 75,
    enemyName: "Ash Giants",
    damagePerTick: 26,
    maxEnemyHp: 220,
    loot: [
      { resourceKey: "mana_crystal", emoji: "🔮", name: "Mana Crystal", min: 2, max: 5 },
      { resourceKey: "rare_gem",     emoji: "💎", name: "Rare Gem",     min: 2, max: 6 },
      { resourceKey: "iron_ore",     emoji: "🪨", name: "Iron Ore",     min: 8, max: 18 },
      { resourceKey: "lumber",       emoji: "🪵", name: "Lumber",       min: 5, max: 12 },
    ],
    workerResource: "Mana Crystal",
    workerEmoji: "🔮",
    workerYieldPerMinute: 1,
  },
};

export const WORLD_RESOURCES = {
  iron_ore:     { name: "Iron Ore",     emoji: "🪨" },
  lumber:       { name: "Lumber",       emoji: "🪵" },
  herbs:        { name: "Herbs",        emoji: "🌿" },
  rare_gem:     { name: "Rare Gem",     emoji: "💎" },
  mana_crystal: { name: "Mana Crystal", emoji: "🔮" },
  titan_core:   { name: "Titan Core",    emoji: "💠" },
};

// ─── Adventurer Stats ─────────────────────────────────────────────────────────

export const ADVENTURER_BASE_HP = 40;
export const ADVENTURER_HP_PER_LEVEL = 8;
export const ADVENTURER_REGEN_PER_SECOND = 0; // passive regen removed — heal via bread or tavern only
// Tavern regen is now level-based via TAVERN_LEVEL_REGEN array
export const TAVERN_REGEN_BONUS = 0.10; // legacy kept for save compat - use getTavernRegenRate()



// ─── Artisan Food as Heal Items ───────────────────────────────────────────────

export const ARTISAN_FOOD_HEAL = {
  bread:       { id: "bread",       emoji: "🍞", name: "Bread",       healAmount: 30,  source: "artisan" },
  jam:         { id: "jam",         emoji: "🍯", name: "Jam",         healAmount: 50,  source: "artisan" },
  sauce:       { id: "sauce",       emoji: "🥫", name: "Sauce",       healAmount: 100, source: "artisan" },
  fish_pie:    { id: "fish_pie",    emoji: "🥧", name: "Fish Pie",    healAmount: 125, source: "animalGoods" },
  smoked_fish: { id: "smoked_fish", emoji: "🐟", name: "Smoked Fish", healAmount: 150, source: "animalGoods" },
};
export const ARTISAN_FOOD_LIST = ["bread", "jam", "sauce", "fish_pie", "smoked_fish"];

// ─── Adventurer Buff Items (separate slot, not food belt) ────────────────────
export const ADVENTURER_BUFF_ITEMS = {
  smoked_fish: { id: "smoked_fish", emoji: "🐟", name: "Smoked Fish", buffType: "hp_boost",   buffValue: 0.10, description: "+10% max HP for the run (damage soak).", source: "artisan" },
  fish_pie:    { id: "fish_pie",    emoji: "🥧", name: "Fish Pie",    buffType: "min_loot",   buffValue: 1,    description: "+1 to min loot rolls this run.", source: "artisan" },
  omelette:    { id: "omelette",    emoji: "🍳", name: "Omelette",    buffType: "xp_boost",   buffValue: 0.25, description: "+25% XP this run.", source: "animalGoods" },
  cheese:      { id: "cheese",      emoji: "🧀", name: "Cheese",      buffType: "loot_boost", buffValue: 0.25, description: "+25% loot this run.", source: "animalGoods" },
};
export const ADVENTURER_BUFF_LIST = ["smoked_fish", "fish_pie", "omelette", "cheese"];

// World Worker constants
export const WORLD_WORKER_HIRE_COST = 200; // cash cost to hire a world zone worker

// ─── Boss Fight System ────────────────────────────────────────────────────────

export const BOSS_UNLOCK_LEVEL = 10; // any hero hitting this level spawns the first boss

// Boss definitions
export const BOSS_DEFS = {
  forest_titan: {
    id: "forest_titan",
    name: "Forest Titan",
    emoji: "🌲",
    description: "An ancient spirit of the deep woods, twisted by corruption. Hits hard but slow.",
    maxHp: 1200,
    // Damage the boss deals to each hero per tick (before hero count scaling)
    damagePerTick: 18,
    // How much damage a hero deals per tick (base — scaled by level + gear)
    heroDamageBase: 8,
    // Heroes take sqrt-scaled damage: boss dmg / sqrt(assignedCount)
    // Solo: full damage. 2 heroes: ~71%. 3 heroes: ~58%. 4 heroes: ~50%.
    dropResource: "titan_core",
    dropAmount: 3,
    townSatisfactionBonus: 10,   // flat sat added on kill
    townSatBonusPulses: 2,        // how many pulses the bonus lasts
    xpReward: 50,                 // XP each surviving assigned hero gets
    color: "#4ade80",
  },
  stone_colossus: {
    id: "stone_colossus",
    name: "Stone Colossus",
    emoji: "🪨",
    description: "A towering sentinel of ancient granite. Nearly impervious — but slow.",
    maxHp: 2500,
    damagePerTick: 28,
    heroDamageBase: 10,
    dropResource: "titan_core",
    dropAmount: 6,
    townSatisfactionBonus: 15,
    townSatBonusPulses: 2,
    xpReward: 80,
    color: "#94a3b8",
  },
};

export const BOSS_ORDER = ["forest_titan", "stone_colossus"]; // progression order

// Infinite boss pool — cycles after BOSS_ORDER is exhausted
// wave = 1-indexed number of the infinite boss (wave 1 = 3rd boss overall, etc.)
export const BOSS_INFINITE_POOL = [
  { name: "Shadow Behemoth",  emoji: "🌑", color: "#a78bfa", description: "A creature born of pure darkness. Its hunger is endless." },
  { name: "Frost Leviathan",  emoji: "❄️",  color: "#7dd3fc", description: "An ancient sea-serpent now encased in glacial armor." },
  { name: "Inferno Drake",    emoji: "🔥", color: "#fb923c", description: "A dragon whose scales have fused with volcanic rock." },
  { name: "Void Stalker",     emoji: "🌀", color: "#818cf8", description: "It steps between dimensions. You can never predict its strikes." },
  { name: "Iron Juggernaut",  emoji: "⚙️",  color: "#71717a", description: "A war machine left over from a forgotten civilization." },
  { name: "Storm Colossus",   emoji: "⛈️",  color: "#38bdf8", description: "Calls lightning from clear skies. The thunder is just the warning." },
  { name: "Plague Shambler",  emoji: "☠️",  color: "#a3e635", description: "Slow, relentless, and impossibly hard to kill." },
  { name: "Magma Titan",      emoji: "🌋", color: "#f97316", description: "The earth itself seems to bleed when it walks." },
  { name: "Spectral Hydra",   emoji: "👁️",  color: "#e879f9", description: "Cut off one head and two more eyes open in the dark." },
  { name: "Runic Golem",      emoji: "🔮", color: "#6ee7b7", description: "Ancient runes pulse across its body. Each one a spell waiting to fire." },
];

// Generate a procedural boss def for infinite wave N (1-indexed)
// HP, damage, and drops scale with wave number
export function generateInfiniteBoss(wave) {
  const pool = BOSS_INFINITE_POOL;
  const template = pool[(wave - 1) % pool.length];
  // Exponential HP scaling: starts around 4000 at wave 1, roughly doubles every 5 waves
  const maxHp = Math.round(4000 * Math.pow(1.18, wave - 1));
  // Damage scales more gently — otherwise heroes get one-shot early
  const damagePerTick = Math.round(35 * Math.pow(1.08, wave - 1));
  // Base hero damage scales up a little so fights don't become impossibly long
  const heroDamageBase = Math.round(12 + wave * 1.5);
  // Drops scale with wave
  const dropAmount = 3 + Math.floor(wave * 1.5);
  const xpReward = 100 + wave * 25;
  const satBonus = 15 + wave * 2;

  return {
    id: `infinite_${wave}`,
    name: `${template.name} ${wave > pool.length ? `Mk.${Math.floor((wave - 1) / pool.length) + 1}` : ""}`.trim(),
    emoji: template.emoji,
    description: template.description,
    color: template.color,
    maxHp,
    damagePerTick,
    heroDamageBase,
    dropResource: "titan_core",
    dropAmount,
    townSatisfactionBonus: satBonus,
    townSatBonusPulses: 2,
    xpReward,
    infiniteWave: wave,
  };
}

// Boss tick interval — how often damage fires (seconds)
export const BOSS_TICK_INTERVAL = 5;

// Hero damage formula per tick:
//   base + (level - 1) * levelScale + gearTier * gearScale
export const BOSS_HERO_DAMAGE_LEVEL_SCALE = 1.5;
export const BOSS_HERO_DAMAGE_GEAR_SCALE  = 4;

// Class abilities — one per hero class, usable during boss fight
export const BOSS_ABILITIES = {
  fighter: {
    id: "fighter",
    name: "War Cry",
    emoji: "⚔️",
    description: "Next attack deals 3× damage.",
    cooldown: 30, // seconds
    effect: "triple_damage", // tag read by tick engine
  },
  mage: {
    id: "mage",
    name: "Mend",
    emoji: "💚",
    description: "Immediately heals all assigned heroes for 25 HP.",
    cooldown: 45,
    effect: "heal_party",
    healAmount: 25,
  },
  scavenger: {
    id: "scavenger",
    name: "Blind",
    emoji: "🌫️",
    description: "Next boss attack deals 50% less damage to all heroes.",
    cooldown: 40,
    effect: "blind_boss",
  },
};

// The drop resource — goes into worldResources like iron_ore / lumber
export const TITAN_CORE = {
  id: "titan_core",
  name: "Titan Core",
  emoji: "💠",
  description: "Crystallized essence of a defeated boss. Used to forge T3 gear.",
};




// ─── Forge System ─────────────────────────────────────────────────────────────

export const FORGE_RECIPES = {
  // ─── Swords (weapon slot) — reduce mission time ──────────────────────────
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    emoji: "⚔️",
    description: "Equip an adventurer. −10% mission time.",
    inputs: { iron_ore: 10, lumber: 6 },
    output: { resourceKey: "iron_sword", emoji: "⚔️", name: "Iron Sword" },
    seconds: 35,
    gearTier: 1,
    category: "weapon",
    missionTimeReduction: 0.10,
  },
  steel_sword: {
    id: "steel_sword",
    name: "Steel Sword",
    emoji: "🗡️",
    description: "Equip an adventurer. −25% mission time.",
    inputs: { iron_sword: 1, iron_ore: 20, lumber: 14 },
    output: { resourceKey: "steel_sword", emoji: "🗡️", name: "Steel Sword" },
    seconds: 65,
    gearTier: 2,
    category: "weapon",
    missionTimeReduction: 0.25,
  },
  master_sword: {
    id: "master_sword",
    name: "Master Sword",
    emoji: "🔱",
    description: "Equip an adventurer. −40% mission time.",
    inputs: { steel_sword: 1, iron_ore: 35, lumber: 24, iron_fitting: 3, rare_gem: 2 },
    output: { resourceKey: "master_sword", emoji: "🔱", name: "Master Sword" },
    seconds: 130,
    gearTier: 3,
    category: "weapon",
    missionTimeReduction: 0.40,
  },
  // ─── Shields (armour slot) — reduce damage taken ──────────────────────────
  iron_shield: {
    id: "iron_shield",
    name: "Iron Shield",
    emoji: "🛡️",
    description: "Equip an adventurer. −10% damage taken.",
    inputs: { iron_ore: 12, lumber: 6 },
    output: { resourceKey: "iron_shield", emoji: "🛡️", name: "Iron Shield" },
    seconds: 40,
    gearTier: 1,
    category: "armour",
    damageReduction: 0.10,
  },
  steel_shield: {
    id: "steel_shield",
    name: "Steel Shield",
    emoji: "🔰",
    description: "Equip an adventurer. −25% damage taken.",
    inputs: { iron_shield: 1, iron_ore: 26, lumber: 12 },
    output: { resourceKey: "steel_shield", emoji: "🔰", name: "Steel Shield" },
    seconds: 80,
    gearTier: 2,
    category: "armour",
    damageReduction: 0.25,
  },
  tower_shield: {
    id: "tower_shield",
    name: "Tower Shield",
    emoji: "🏰",
    description: "Equip an adventurer. −40% damage taken.",
    inputs: { steel_shield: 1, iron_ore: 42, lumber: 20, reinforced_crate: 3, rare_gem: 2, titan_core: 1 },
    output: { resourceKey: "tower_shield", emoji: "🏰", name: "Tower Shield" },
    seconds: 150,
    gearTier: 3,
    category: "armour",
    damageReduction: 0.40,
  },
  // ─── Body Armor (body slot) — increase food belt slots ───────────────────
  leather_armor: {
    id: "leather_armor",
    name: "Leather Armor",
    emoji: "🥋",
    description: "Equip an adventurer. +1 food belt slot.",
    inputs: { iron_ore: 8, lumber: 10 },
    output: { resourceKey: "leather_armor", emoji: "🥋", name: "Leather Armor" },
    seconds: 30,
    gearTier: 1,
    category: "body",
    foodSlotBonus: 1,
  },
  chainmail: {
    id: "chainmail",
    name: "Chainmail",
    emoji: "⛓️",
    description: "Equip an adventurer. +3 food belt slots.",
    inputs: { leather_armor: 1, iron_ore: 24, lumber: 16 },
    output: { resourceKey: "chainmail", emoji: "⛓️", name: "Chainmail" },
    seconds: 75,
    gearTier: 2,
    category: "body",
    foodSlotBonus: 3,
  },
  plate_armor: {
    id: "plate_armor",
    name: "Plate Armor",
    emoji: "🪖",
    description: "Equip an adventurer. +5 food belt slots.",
    inputs: { chainmail: 1, iron_ore: 40, lumber: 28, reinforced_crate: 2, iron_fitting: 3, titan_core: 1 },
    output: { resourceKey: "plate_armor", emoji: "🪖", name: "Plate Armor" },
    seconds: 160,
    gearTier: 3,
    category: "body",
    foodSlotBonus: 5,
  },
  hunting_bow: {
    id: "hunting_bow",
    name: "Hunting Bow",
    emoji: "🏹",
    description: "Equip a ranger. Bonus loot from forest zones.",
    inputs: { lumber: 16, iron_ore: 10 },
    output: { resourceKey: "hunting_bow", emoji: "🏹", name: "Hunting Bow" },
    seconds: 60,
    gearTier: 2,
    category: "weapon",
    requires: "iron_sword",
  },
  // ─── Upgrade Components (T3 upgrade materials) ──────────────────────────────
  iron_fitting: {
    id: "iron_fitting",
    name: "Iron Fitting",
    emoji: "🔩",
    description: "Component. Required for T3 farm and plot upgrades.",
    inputs: { iron_ore: 20, lumber: 12 },
    output: { resourceKey: "iron_fitting", emoji: "🔩", name: "Iron Fitting" },
    seconds: 90,
    gearTier: 0,
    category: "component",
  },
  reinforced_crate: {
    id: "reinforced_crate",
    name: "Reinforced Crate",
    emoji: "📦",
    description: "Component. Required for T3 kitchen batch upgrades.",
    inputs: { iron_ore: 14, lumber: 18 },
    output: { resourceKey: "reinforced_crate", emoji: "📦", name: "Reinforced Crate" },
    seconds: 80,
    gearTier: 0,
    category: "component",
  },
  fine_tools: {
    id: "fine_tools",
    name: "Fine Tools",
    emoji: "🛠️",
    description: "Component. Required for T3 fishing and barn upgrades.",
    inputs: { iron_ore: 18, lumber: 14 },
    output: { resourceKey: "fine_tools", emoji: "🛠️", name: "Fine Tools" },
    seconds: 90,
    gearTier: 0,
    category: "component",
  },
};

export const FORGE_RECIPE_LIST = ["iron_sword", "steel_sword", "master_sword", "iron_shield", "steel_shield", "tower_shield", "leather_armor", "chainmail", "plate_armor", "hunting_bow", "iron_fitting", "reinforced_crate", "fine_tools"];

export const FORGE_WORKER_HIRE_COST = 50;
export const FORGE_WORKER_HIRE_MULTIPLIER = 1.6;

export const FORGE_WORKER_UPGRADES = {
  forge_speed_1: { id: "forge_speed_1", name: "Bellows",      emoji: "💨", description: "Craft 30% faster.", cost: 500, requires: null },
  forge_auto:    { id: "forge_auto",    name: "Auto-Craft",   emoji: "🔄", description: "Auto-restarts last recipe.", cost: 1200, requires: "forge_speed_1" },
  forge_speed_2: { id: "forge_speed_2", name: "Master Forge", emoji: "🔥", description: "Craft 50% faster.", cost: 2000, requires: "forge_auto", upgradeRequires: { iron_ore: 20, lumber: 15 } },
};

export const FORGE_WORKER_UPGRADE_ORDER = ["forge_speed_1", "forge_auto", "forge_speed_2"];
// ─── Seasonal Quests ──────────────────────────────────────────────────────────
// condition types:
//   counter        — questProgress[key] >= value
//   live_check     — evaluated dynamically in evaluateQuestCondition()
//   hero_level     — any adventurer has level >= value
//   hero_prestige  — any adventurer has prestiged (heroPrestigeCount >= value)

export const SEASONAL_QUESTS = {
  1: {
    requiredCount: 0, // optional
    quests: [
      { id: "s1_harvest",  emoji: "🌾", title: "First Harvest",  description: "Manually harvest 25 plots",         condition: { type: "counter", key: "manualHarvestCount", value: 25 } },
      { id: "s1_hero",     emoji: "⚔️", title: "Adventurer",     description: "Have a hero complete a quest and return", condition: { type: "counter", key: "heroQuestsCompleted", value: 1 } },
      { id: "s1_fish",     emoji: "🎣", title: "First Cast",     description: "Catch 5 fish",                      condition: { type: "counter", key: "fishCaughtCount", value: 5 } },
      { id: "s1_craft",    emoji: "🍞", title: "Baker",          description: "Craft 5 bread",                     condition: { type: "counter", key: "breadCrafted", value: 5 } },
    ],
  },
  2: {
    requiredCount: 0,
    quests: [
      { id: "s2_harvest",  emoji: "🫐", title: "Berry Picker",   description: "Harvest 100 berries",               condition: { type: "counter", key: "berriesHarvested", value: 100 } },
      { id: "s2_hero",     emoji: "⚔️", title: "Leveling",       description: "Have a hero reach level 5",         condition: { type: "hero_level", value: 5 } },
      { id: "s2_fish",     emoji: "🎣", title: "Fisherman",      description: "Catch 20 fish",                     condition: { type: "counter", key: "fishCaughtCount", value: 20 } },
      { id: "s2_craft",    emoji: "🍓", title: "Jam Session",    description: "Produce 5 jam",                     condition: { type: "counter", key: "jamCrafted", value: 5 } },
    ],
  },
  3: {
    requiredCount: 0,
    quests: [
      { id: "s3_harvest",  emoji: "🍅", title: "Red Harvest",    description: "Harvest 150 tomatoes",              condition: { type: "counter", key: "tomatoesHarvested", value: 150 } },
      { id: "s3_hero",     emoji: "⚔️", title: "Level Up",       description: "Have a hero reach level 10",        condition: { type: "hero_level", value: 10 } },
      { id: "s3_fish",     emoji: "🎣", title: "Good Catch",     description: "Catch 3 bass or better",            condition: { type: "counter", key: "qualityFishCount", value: 3 } },
      { id: "s3_craft",    emoji: "🍅", title: "Sauce Run",      description: "Produce 5 sauce",                  condition: { type: "counter", key: "sauceCrafted", value: 5 } },
    ],
  },
  4: {
    requiredCount: 2,
    quests: [
      { id: "s4_barn",     emoji: "🐔", title: "Egg Collector",  description: "Collect 30 eggs",                   condition: { type: "counter", key: "eggsCollected", value: 30 } },
      { id: "s4_hero",     emoji: "⚔️", title: "Seasoned",       description: "Have a hero reach level 15",        condition: { type: "hero_level", value: 15 } },
      { id: "s4_fish",     emoji: "🎣", title: "Deep Waters",    description: "Catch 5 bass or better",            condition: { type: "counter", key: "qualityFishCount", value: 5 } },
      { id: "s4_craft",    emoji: "🧀", title: "Dairy Crafter",  description: "Produce 5 omelettes",              condition: { type: "counter", key: "omelettesCrafted", value: 5 } },
    ],
  },
  5: {
    requiredCount: 2,
    quests: [
      { id: "s5_barn",     emoji: "🐄", title: "Dairy Farmer",   description: "Collect 50 milk",                   condition: { type: "counter", key: "milkCollected", value: 50 } },
      { id: "s5_hero",     emoji: "⚔️", title: "Guild Expansion", description: "Recruit a second hero",             condition: { type: "live_check", check: "two_heroes" } },
      { id: "s5_fish",     emoji: "🎣", title: "Trophy Fish",    description: "Catch a rare fish",                 condition: { type: "counter", key: "rareFishCount", value: 1 } },
      { id: "s5_craft",    emoji: "🔩", title: "Forged",         description: "Craft any item in the Forge",       condition: { type: "counter", key: "forgeItemsCrafted", value: 1 } },
    ],
  },
  6: {
    requiredCount: 3,
    quests: [
      { id: "s6_barn",     emoji: "🐑", title: "Wool Baron",     description: "Collect 80 wool",                   condition: { type: "counter", key: "woolCollected", value: 80 } },
      { id: "s6_hero",     emoji: "⚔️", title: "Geared Up",      description: "Have a hero equipped with a crafted weapon", condition: { type: "live_check", check: "hero_has_crafted_weapon" } },
      { id: "s6_fish",     emoji: "🎣", title: "Fleet Fisher",   description: "Have 3 fishing workers active simultaneously", condition: { type: "live_check", check: "fishing_workers_active", value: 3 } },
      { id: "s6_craft",    emoji: "⛓️", title: "Armorer",        description: "Craft chainmail or better",         condition: { type: "live_check", check: "chainmail_or_better_crafted" } },
    ],
  },
  7: {
    requiredCount: 3,
    quests: [
      { id: "s7_farm",     emoji: "🌾", title: "Expanded Fields", description: "Purchase 5×5 expansion on any farm",           condition: { type: "live_check", check: "farm_expanded_5x5" } },
      { id: "s7_hero",     emoji: "⚔️", title: "Boss Hunter",    description: "Defeat a boss",                     condition: { type: "counter", key: "bossFightsWon", value: 1 } },
      { id: "s7_fish",     emoji: "🎣", title: "Rare Haul",      description: "Catch 3 rare fish in one season",   condition: { type: "counter", key: "rareFishCount", value: 3 } },
      { id: "s7_craft",    emoji: "🍳", title: "Full Kitchen",   description: "Have 3 kitchen workers all running recipes simultaneously", condition: { type: "live_check", check: "kitchen_workers_active", value: 3 } },
    ],
  },
  8: {
    requiredCount: 3,
    quests: [
      { id: "s8_barn",     emoji: "🐄", title: "Ranch Baron",    description: "Upgrade a barn to tier 2 and fill it with animals", condition: { type: "live_check", check: "barn_upgraded_and_full" } },
      { id: "s8_hero",     emoji: "⚔️", title: "Quest Runner",   description: "Have a prestiged hero",             condition: { type: "live_check", check: "has_prestiged_hero" } },
      { id: "s8_fish",     emoji: "🎣", title: "Master Angler",  description: "Catch 5 rare fish in one season",   condition: { type: "counter", key: "rareFishCount", value: 5 } },
      { id: "s8_craft",    emoji: "🪖", title: "Full Arsenal",   description: "Craft a T3 item",                   condition: { type: "live_check", check: "t3_item_crafted" } },
    ],
  },
  9: {
    requiredCount: 3,
    quests: [
      { id: "s9_farm",     emoji: "🌾", title: "Abundance",      description: "Stockpile 10,000 of any single crop", condition: { type: "live_check", check: "crop_stockpile_10k" } },
      { id: "s9_hero",     emoji: "🧠", title: "Legend",         description: "Have 2 heroes at level 15",          condition: { type: "live_check", check: "two_heroes_level_15" } },
      { id: "s9_fish",     emoji: "🎣", title: "Legend of the Lake", description: "Catch 10 rare fish in one season", condition: { type: "counter", key: "rareFishCount", value: 10 } },
      { id: "s9_craft",    emoji: "🍳", title: "Processing Line", description: "Have 4 kitchen workers all running simultaneously", condition: { type: "live_check", check: "kitchen_workers_active", value: 4 } },
    ],
  },
  10: {
    requiredCount: 4,
    quests: [
      { id: "s10_farm",    emoji: "🌾", title: "Mechanized",     description: "Have at least 2 tractor workers on farms", condition: { type: "live_check", check: "tractor_workers", value: 2 } },
      { id: "s10_hero",    emoji: "⚔️", title: "Elite",          description: "Have 2 prestiged heroes",            condition: { type: "live_check", check: "two_prestiged_heroes" } },
      { id: "s10_fish",    emoji: "🎣", title: "Legendary Catch", description: "Catch 15 rare fish in one season",  condition: { type: "counter", key: "rareFishCount", value: 15 } },
      { id: "s10_craft",   emoji: "🪖", title: "Outfitted",      description: "Have a hero at Tier 9 gear or higher", condition: { type: "live_check", check: "hero_gear_tier_9" } },
    ],
  },
  11: {
    requiredCount: 4,
    quests: [
      { id: "s11_farm",    emoji: "🌾", title: "Vast Fields",      description: "Purchase 6×6 expansion on any farm",           condition: { type: "live_check", check: "farm_expanded_6x6" } },
      { id: "s11_hero",    emoji: "⭐", title: "Veteran",          description: "Prestige a hero 2 times",                      condition: { type: "live_check", check: "hero_prestige_level", value: 2 } },
      { id: "s11_fish",    emoji: "🎣", title: "Rare Bounty",      description: "Catch 20 rare fish in one season",             condition: { type: "counter", key: "rareFishCount", value: 20 } },
      { id: "s11_craft",   emoji: "🍳", title: "Bustling Kitchen", description: "Have 5 kitchen workers all running simultaneously", condition: { type: "live_check", check: "kitchen_workers_active", value: 5 } },
      { id: "s11_boss",    emoji: "👹", title: "Warbands", description: "Defeat a boss, have 3 heroes auto-battling, and reach a 10-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 3 }, { type: "live_check", check: "longest_auto_run", value: 10 } ] } },
    ],
  },
  12: {
    requiredCount: 4,
    quests: [
      { id: "s12_farm",    emoji: "🌽", title: "Surplus",          description: "Stockpile 25,000 of any single crop",          condition: { type: "live_check", check: "crop_stockpile_25k" } },
      { id: "s12_hero",    emoji: "🪖", title: "Warlord",          description: "Have a hero at Tier 12 gear or higher",        condition: { type: "live_check", check: "hero_gear_tier", value: 12 } },
      { id: "s12_fish",    emoji: "🎣", title: "Four Waters",      description: "Have 4 fishing workers active simultaneously", condition: { type: "live_check", check: "fishing_workers_active", value: 4 } },
      { id: "s12_hero2",   emoji: "⭐", title: "Twice Reborn",     description: "Prestige a hero 3 times",                      condition: { type: "live_check", check: "hero_prestige_level", value: 3 } },
      { id: "s12_craft",   emoji: "🔥", title: "Forge Master",     description: "Craft 10 T3 items total",                      condition: { type: "counter", key: "t3ItemsCrafted", value: 10 } },
    ],
  },
  13: {
    requiredCount: 4,
    quests: [
      { id: "s13_barn",    emoji: "🐑", title: "Wool Empire",      description: "Collect 200 wool in one season",               condition: { type: "counter", key: "woolCollected", value: 200 } },
      { id: "s13_hero",    emoji: "⭐", title: "Triple Threat",    description: "Have 3 prestiged heroes",                      condition: { type: "live_check", check: "three_prestiged_heroes" } },
      { id: "s13_boss",    emoji: "👹", title: "Warlord", description: "Defeat a boss, have 4 heroes auto-battling, and reach a 12-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 4 }, { type: "live_check", check: "longest_auto_run", value: 12 } ] } },
      { id: "s13_farm",    emoji: "🫙", title: "Stocked Kitchen",  description: "Stockpile 500 of every artisan good",          condition: { type: "live_check", check: "artisan_goods_500_each" } },
      { id: "s13_craft",   emoji: "🪖", title: "Arsenal",          description: "Craft 20 T3 items total",                      condition: { type: "counter", key: "t3ItemsCrafted", value: 20 } },
    ],
  },
  14: {
    requiredCount: 4,
    quests: [
      { id: "s14_farm",    emoji: "🚜", title: "Tractor Army",     description: "Have at least 4 tractor workers on farms",     condition: { type: "live_check", check: "tractor_workers", value: 4 } },
      { id: "s14_hero",    emoji: "⭐", title: "Phoenix",          description: "Prestige a hero 5 times",                      condition: { type: "live_check", check: "hero_prestige_level", value: 5 } },
      { id: "s14_barn",    emoji: "🐄", title: "All Upgraded",     description: "Have all barns at tier 2 or higher",           condition: { type: "live_check", check: "all_barns_tier2" } },
      { id: "s14_fish",    emoji: "🎣", title: "Trophy Wall",      description: "Catch 30 rare fish in one season",             condition: { type: "counter", key: "rareFishCount", value: 30 } },
      { id: "s14_hero2",   emoji: "🧠", title: "Legends Three",    description: "Have 3 heroes at level 15",                    condition: { type: "live_check", check: "three_heroes_level_15" } },
    ],
  },
  15: {
    requiredCount: 5,
    quests: [
      { id: "s15_farm",    emoji: "🌽", title: "Overflow",         description: "Stockpile 50,000 of any single crop",          condition: { type: "live_check", check: "crop_stockpile_50k" } },
      { id: "s15_farm2",   emoji: "🚜", title: "Full Mechanized",  description: "Have at least 5 tractor workers on farms",     condition: { type: "live_check", check: "tractor_workers", value: 5 } },
      { id: "s15_hero",    emoji: "⭐", title: "Reborn Again",     description: "Prestige a hero 7 times",                      condition: { type: "live_check", check: "hero_prestige_level", value: 7 } },
      { id: "s15_boss",    emoji: "👹", title: "Champion", description: "Defeat a boss, have 5 heroes auto-battling, and reach a 15-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 5 }, { type: "live_check", check: "longest_auto_run", value: 15 } ] } },
      { id: "s15_craft",   emoji: "🍳", title: "Full Operation",   description: "Have 5 fishing workers active simultaneously", condition: { type: "live_check", check: "fishing_workers_active", value: 5 } },
    ],
  },
  16: {
    requiredCount: 5,
    quests: [
      { id: "s16_farm",    emoji: "🌾", title: "Vast Fields",      description: "Purchase 7×7 expansion on any farm",           condition: { type: "live_check", check: "farm_expanded_7x7" } },
      { id: "s16_barn",    emoji: "🐄", title: "All Maxed",        description: "Have all barns at tier 3",                     condition: { type: "live_check", check: "all_barns_tier3" } },
      { id: "s16_hero",    emoji: "⭐", title: "Ascendant",        description: "Have 2 heroes prestiged 3+ times",             condition: { type: "live_check", check: "two_heroes_prestige_3" } },
      { id: "s16_fish",    emoji: "🎣", title: "Deep Haul",        description: "Catch 40 rare fish in one season",             condition: { type: "counter", key: "rareFishCount", value: 40 } },
      { id: "s16_craft",   emoji: "🪖", title: "Armory",           description: "Craft 40 T3 items total",                      condition: { type: "counter", key: "t3ItemsCrafted", value: 40 } },
    ],
  },
  17: {
    requiredCount: 5,
    quests: [
      { id: "s17_farm",    emoji: "🌽", title: "Legendary Harvest", description: "Stockpile 100,000 of any single crop",        condition: { type: "live_check", check: "crop_stockpile_100k" } },
      { id: "s17_hero",    emoji: "⭐", title: "Immortal",          description: "Prestige a hero 10 times",                    condition: { type: "live_check", check: "hero_prestige_level", value: 10 } },
      { id: "s17_boss",    emoji: "👹", title: "Warbringer", description: "Defeat a boss, have 6 heroes auto-battling, and reach an 18-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 6 }, { type: "live_check", check: "longest_auto_run", value: 18 } ] } },
      { id: "s17_hero2",   emoji: "🧠", title: "Elite Force",       description: "Have 3 heroes all at prestige 3+",            condition: { type: "live_check", check: "three_heroes_prestige_3" } },
      { id: "s17_craft",   emoji: "🔥", title: "Legendary Forge",   description: "Have a hero at Tier 15 gear or higher",       condition: { type: "live_check", check: "hero_gear_tier", value: 15 } },
    ],
  },
  18: {
    requiredCount: 5,
    quests: [
      { id: "s18_farm",    emoji: "🌾", title: "Full Fields",        description: "Have all 3 farms fully expanded to 5×5 plots", condition: { type: "live_check", check: "all_farms_5x5_plots" } },
      { id: "s18_farm2",   emoji: "🚜", title: "Iron Fleet",        description: "Have at least 6 tractor workers on farms",    condition: { type: "live_check", check: "tractor_workers", value: 6 } },
      { id: "s18_hero",    emoji: "⭐", title: "Undying",           description: "Have 3 heroes prestiged 5+ times",            condition: { type: "live_check", check: "three_heroes_prestige_5" } },
      { id: "s18_fish",    emoji: "🎣", title: "Sea Legend",        description: "Catch 50 rare fish in one season",            condition: { type: "counter", key: "rareFishCount", value: 50 } },
      { id: "s18_boss",    emoji: "👹", title: "Colossus", description: "Defeat a boss, have 6 heroes auto-battling, and reach a 20-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 6 }, { type: "live_check", check: "longest_auto_run", value: 20 } ] } },
    ],
  },
  19: {
    requiredCount: 5,
    quests: [
      { id: "s19_farm",    emoji: "🌽", title: "Mythic Surplus",    description: "Stockpile 250,000 of any single crop",        condition: { type: "live_check", check: "crop_stockpile_250k" } },
      { id: "s19_hero",    emoji: "⭐", title: "Transcendent",      description: "Have 2 heroes prestiged 10+ times",           condition: { type: "live_check", check: "two_heroes_prestige_10" } },
      { id: "s19_craft",   emoji: "🪖", title: "Forge Legend",      description: "Craft 100 T3 items total",                    condition: { type: "counter", key: "t3ItemsCrafted", value: 100 } },
      { id: "s19_boss",    emoji: "👹", title: "Titan", description: "Defeat a boss, have 7 heroes auto-battling, and reach a 22-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 7 }, { type: "live_check", check: "longest_auto_run", value: 22 } ] } },
      { id: "s19_hero2",   emoji: "🧠", title: "Godlike",           description: "Have a hero at Tier 18 gear or higher",       condition: { type: "live_check", check: "hero_gear_tier", value: 18 } },
    ],
  },
  20: {
    requiredCount: 5,
    quests: [
      { id: "s20_farm",    emoji: "🌾", title: "World Farm",        description: "Stockpile 500,000 of any single crop",        condition: { type: "live_check", check: "crop_stockpile_500k" } },
      { id: "s20_hero",    emoji: "⭐", title: "Eternal",           description: "Have 3 heroes prestiged 10+ times",           condition: { type: "live_check", check: "three_heroes_prestige_10" } },
      { id: "s20_boss",    emoji: "👹", title: "Apocalypse", description: "Defeat a boss, have 7 heroes auto-battling, and reach a 25-run auto-battle session", condition: { type: "and", conditions: [ { type: "counter", key: "bossFightsWon", value: 1 }, { type: "live_check", check: "heroes_auto_battling", value: 7 }, { type: "live_check", check: "longest_auto_run", value: 25 } ] } },
      { id: "s20_craft",   emoji: "🔥", title: "Grand Arsenal",     description: "Have a hero at Tier 20 gear or higher",       condition: { type: "live_check", check: "hero_gear_tier", value: 20 } },
      { id: "s20_fish",    emoji: "🎣", title: "Ocean Sovereign",   description: "Catch 75 rare fish in one season",            condition: { type: "counter", key: "rareFishCount", value: 75 } },
    ],
  },
};


// --- Roads -------------------------------------------------------------------
export const ROAD_TIERS = [
  {
    level: 1,
    name: "Dirt Road",
    emoji: "\u{1F6E4}\uFE0F",
    buildCost: 2000,
    buildRequires: { lumber: 20, iron_ore: 10 },
    upkeepPerTick: { iron_ore: 1, lumber: 1 },
    unlocksTowns: ["thornwick", "crestfall"],
    unlocksExpedition: "scout",
  },
  {
    level: 2,
    name: "Gravel Road",
    emoji: "\u{1F6E3}\uFE0F",
    buildCost: 8000,
    buildRequires: { lumber: 40, iron_ore: 20, iron_fitting: 3 },
    upkeepPerTick: { iron_ore: 2, lumber: 1 },
    unlocksTowns: ["millhaven", "ironfeld"],
    unlocksExpedition: "dungeon",
  },
  {
    level: 3,
    name: "Stone Road",
    emoji: "\u{1F3D7}\uFE0F",
    buildCost: 25000,
    buildRequires: { lumber: 60, iron_ore: 40, iron_fitting: 8 },
    upkeepPerTick: { iron_ore: 3, lumber: 2 },
    unlocksTowns: ["glenhollow", "ashport"],
    unlocksExpedition: "dragon",
  },
  {
    level: 4,
    name: "Royal Road",
    emoji: "\u{1F451}",
    buildCost: 80000,
    buildRequires: { iron_fitting: 30, fine_tools: 10 },
    upkeepPerTick: { iron_ore: 4, lumber: 3 },
    unlocksTowns: ["velmoor"],
    unlocksExpedition: "legendary",
  },
];

// --- Trade Towns -------------------------------------------------------------
export const TRADE_TOWNS = {
  // ── Road 1 ───────────────────────────────────────────────────────────────────────────
  thornwick: {
    id: "thornwick",
    name: "Thornwick",
    emoji: "🌾",
    flavor: "A modest market village. They buy raw harvests and pay in kind.",
    roadLevel: 1,
    routes: [
      { id: "t1", label: "Wheat Route",  itemKey: "wheat",    source: "crops", drainPerTick: 0.5, bonus: { type: "crop_grow_speed", value: 0.15 }, description: "+15% crop grow speed" },
      { id: "t2", label: "Berry Route",  itemKey: "berries",  source: "crops", drainPerTick: 0.3, bonus: { type: "crop_grow_speed", value: 0.25 }, description: "+25% crop grow speed" },
      { id: "t3", label: "Tomato Route", itemKey: "tomatoes", source: "crops", drainPerTick: 0.2, bonus: { type: "crop_grow_speed", value: 0.45 }, description: "+45% crop grow speed" },
    ],
  },
  crestfall: {
    id: "crestfall",
    name: "Crestfall",
    emoji: "🎣",
    flavor: "A riverside town. Fresh fish are their lifeblood.",
    roadLevel: 1,
    routes: [
      { id: "t1", label: "Minnow Route", itemKey: "minnow", source: "pond", drainPerTick: 0.3, bonus: { type: "fishing_rate", value: 0.15 }, description: "+15% fishing rate" },
      { id: "t2", label: "Bass Route",   itemKey: "bass",   source: "pond", drainPerTick: 0.15, bonus: { type: "fishing_rate", value: 0.30 }, description: "+30% fishing rate" },
      { id: "t3", label: "Perch Route",  itemKey: "perch",  source: "pond", drainPerTick: 0.1, bonus: { type: "fishing_rate", value: 0.50 }, description: "+50% fishing rate" },
    ],
  },
  // ── Road 2 ───────────────────────────────────────────────────────────────────────────
  millhaven: {
    id: "millhaven",
    name: "Millhaven",
    emoji: "🍞",
    flavor: "A hungry town that can't get enough processed food. They repay with efficiency.",
    roadLevel: 2,
    routes: [
      { id: "t1", label: "Bread Route", itemKey: "bread", source: "artisan", drainPerTick: 0.2, bonus: { type: "crafting_material_reduction", value: 0.15 }, description: "-15% crafting materials" },
      { id: "t2", label: "Jam Route",   itemKey: "jam",   source: "artisan", drainPerTick: 0.15, bonus: { type: "crafting_material_reduction", value: 0.25 }, description: "-25% crafting materials" },
      { id: "t3", label: "Sauce Route", itemKey: "sauce", source: "artisan", drainPerTick: 0.1, bonus: { type: "crafting_material_reduction", value: 0.40 }, description: "-40% crafting materials" },
    ],
  },
  ironfeld: {
    id: "ironfeld",
    name: "Ironfeld",
    emoji: "⚒️",
    flavor: "A mining settlement. Resource-rich but food-poor.",
    roadLevel: 2,
    routes: [
      { id: "t1", label: "Smoked Fish Route",    itemKey: "smoked_fish", source: "animalGoods", drainPerTick: 0.05, bonus: { type: "iron_trickle",       iron_ore: 4 },            description: "+4 iron ore/sec" },
      { id: "t2", label: "Fish Pie Route",       itemKey: "fish_pie",    source: "animalGoods", drainPerTick: 0.05, bonus: { type: "lumber_trickle",     lumber: 4 },              description: "+4 lumber/sec" },
      { id: "t3", label: "Legendary Fish Route", itemKey: "rare",        source: "pond",        drainPerTick: 0.02, bonus: { type: "full_upkeep_cover", iron_ore: 8, lumber: 6 }, description: "Covers road upkeep (+8 iron +6 lumber/sec)" },
    ],
  },
  // ── Road 3 ───────────────────────────────────────────────────────────────────────────
  glenhollow: {
    id: "glenhollow",
    name: "Glenhollow",
    emoji: "🐄",
    flavor: "A pastoral settlement. They depend on animal farmers to survive the winters.",
    roadLevel: 3,
    routes: [
      { id: "t1", label: "Egg Route",  itemKey: "egg",  source: "animalGoods", drainPerTick: 0.05, bonus: { type: "barn_cycle_speed", value: 0.15 }, description: "+15% barn cycle speed" },
      { id: "t2", label: "Milk Route", itemKey: "milk", source: "animalGoods", drainPerTick: 0.03, bonus: { type: "barn_cycle_speed", value: 0.30 }, description: "+30% barn cycle speed" },
      { id: "t3", label: "Wool Route", itemKey: "wool", source: "animalGoods", drainPerTick: 0.02, bonus: { type: "barn_cycle_speed", value: 0.50 }, description: "+50% barn cycle speed" },
    ],
  },
  ashport: {
    id: "ashport",
    name: "Ashport",
    emoji: "⚓",
    flavor: "A coastal fishing town. Artisan goods keep their crews working faster.",
    roadLevel: 3,
    routes: [
      { id: "t1", label: "Omelette Route",      itemKey: "omelette",      source: "animalGoods", drainPerTick: 0.1,  bonus: { type: "crafting_time_reduction", value: 0.15 }, description: "-15% crafting time" },
      { id: "t2", label: "Cheese Route",        itemKey: "cheese",        source: "animalGoods", drainPerTick: 0.07, bonus: { type: "crafting_time_reduction", value: 0.30 }, description: "-30% crafting time" },
      { id: "t3", label: "Knitted Goods Route", itemKey: "knitted_goods", source: "animalGoods", drainPerTick: 0.05, bonus: { type: "crafting_time_reduction", value: 0.50 }, description: "-50% crafting time" },
    ],
  },
  // ── Road 4 ───────────────────────────────────────────────────────────────────────────
  velmoor: {
    id: "velmoor",
    name: "Velmoor",
    emoji: "🔮",
    flavor: "A distant arcane city. Mysterious and hungry for rare specimens.",
    roadLevel: 4,
    routes: [
      { id: "t1", label: "Gem Route",     itemKey: "rare_gem",     source: "worldResources", drainPerTick: 0.01, bonus: { type: "hero_xp",                xpBonus: 0.20 },                        description: "+20% hero XP" },
      { id: "t2", label: "Crystal Route", itemKey: "mana_crystal", source: "worldResources", drainPerTick: 0.008, bonus: { type: "expedition_loot",       expeditionBonus: 0.20 },                description: "+20% expedition loot" },
      { id: "t3", label: "Arcane Route",  itemKey: "rare_gem",     source: "worldResources", drainPerTick: 0.01, bonus: { type: "hero_xp_and_expedition", xpBonus: 0.40, expeditionBonus: 0.30 }, description: "+40% hero XP & +30% expedition loot" },
    ],
  },
};
export const TRADE_TOWN_ORDER = ["thornwick", "crestfall", "millhaven", "ironfeld", "glenhollow", "ashport", "velmoor"];

// --- Expeditions -------------------------------------------------------------
// Expeditions are now persistent: heroes stay until food belt is empty or recalled.
// damagePerTick: HP drained each tick from every hero on the expedition.
// rewardPerHeroPerTick: world resources yielded per hero per tick (matches road upkeep at 1 hero).
// rareLootRollIntervalTicks: how often a rare drop is rolled per hero.
export const EXPEDITION_TIERS = {
  scout: {
    id: "scout", name: "Scout Run", emoji: "\u{1F5FA}\uFE0F",
    ghLevel: 1, roadLevel: 1,
    maxHeroes: 4,
    damagePerTick: 0.2,
    xpPerHeroPerTick: 0.3,
    rewardPerHeroPerTick: { iron_ore: 1, lumber: 1 },
    rareLootRollIntervalTicks: 60,
    rareLoot: { iron_ore: [5, 20], lumber: [5, 20] },
    description: "A short scouting run through nearby woods. 1 hero covers road upkeep.",
  },
  dungeon: {
    id: "dungeon", name: "Dungeon Raid", emoji: "\u2694\uFE0F",
    ghLevel: 2, roadLevel: 2,
    maxHeroes: 4,
    damagePerTick: 0.4,
    xpPerHeroPerTick: 0.6,
    rewardPerHeroPerTick: { iron_ore: 2, lumber: 1 },
    rareLootRollIntervalTicks: 60,
    rareLoot: { rare_gem: [1, 4], iron_fitting: [2, 8] },
    description: "Delve into a dangerous dungeon. 1 hero covers road upkeep.",
  },
  dragon: {
    id: "dragon", name: "Dragon\'s Lair", emoji: "\u{1F409}",
    ghLevel: 3, roadLevel: 3,
    maxHeroes: 4,
    damagePerTick: 0.6,
    xpPerHeroPerTick: 1.0,
    rewardPerHeroPerTick: { iron_ore: 3, lumber: 2 },
    rareLootRollIntervalTicks: 60,
    rareLoot: { mana_crystal: [2, 8], iron_fitting: [3, 12] },
    description: "Face the dragon and claim its hoard. 1 hero covers road upkeep.",
  },
  legendary: {
    id: "legendary", name: "Legendary Vault", emoji: "\u{1F3DB}\uFE0F",
    ghLevel: 4, roadLevel: 4,
    maxHeroes: 4,
    damagePerTick: 0.9,
    xpPerHeroPerTick: 1.5,
    rewardPerHeroPerTick: { iron_ore: 4, lumber: 3 },
    rareLootRollIntervalTicks: 60,
    rareLoot: { rare_gem: [3, 10], mana_crystal: [1, 4] },
    description: "A mythic heist into a vault of ancient treasures. 1 hero covers road upkeep.",
  },
};
export const EXPEDITION_TIER_ORDER = ["scout", "dungeon", "dragon", "legendary"];

// Class-specific expedition bonuses
// fighter: damage reduction per (level + gearTier), capped at 40%
// mage:    +XP bonus flat, + small chance to find mana_crystal on any tier
// scavenger: +rare loot roll chance per expedition tier index, +minLoot on rare drops
export const EXPEDITION_CLASS_BONUSES = {
  fighter: {
    // dmgReductionPerStatPoint: applied to (level + gearTier) combined
    dmgReductionPerStatPoint: 0.015, // 1.5% per point, capped at maxDmgReduction
    maxDmgReduction: 0.40,           // hard cap: 40% max damage reduction
  },
  mage: {
    xpBonus: 0.25,                   // flat +25% XP on top of existing multipliers
    manaCrystalChancePerRoll: 0.05,  // 5% chance per rare-loot roll to find a mana_crystal
    manaCrystalAmount: [1, 2],       // [min, max] crystals found
  },
  scavenger: {
    // +10% rare loot roll chance per expedition tier index (0=scout,1=dungeon,2=dragon,3=legendary)
    rareLootChancePerTierIndex: 0.10,
    // min loot bonus on rare drops = getHeroMinLootBonus(hero) (reuses existing stat)
  },
};

export const QUEST_GATE_STARTS_SEASON = 4;