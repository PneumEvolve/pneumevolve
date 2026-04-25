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
  gloves:      { id: "gloves",      name: "Gloves",      emoji: "🧤", plotsPerCycle: 1, cycleSeconds: 10, upgradeCost: 15,   upgradeTier: 1, description: "Harvests and replants 1 plot every 10s. 33% faster." },
  hoe:         { id: "hoe",         name: "Hoe",         emoji: "🪓", plotsPerCycle: 1, cycleSeconds: 6,  upgradeCost: 60,   upgradeTier: 1, description: "Harvests and replants 1 plot every 6s. 40% faster than gloves." },
  wheelbarrow: { id: "wheelbarrow", name: "Wheelbarrow", emoji: "🛻", plotsPerCycle: 2, cycleSeconds: 6,  upgradeCost: 150,  upgradeTier: 2, upgradeRequires: { iron_ore: 5, lumber: 3 }, description: "Harvests and replants 2 plots every 6s. Double the coverage." },
  tractor:     { id: "tractor",     name: "Tractor",     emoji: "🚜", plotsPerCycle: 5, cycleSeconds: 6,  upgradeCost: 500,  upgradeTier: 3, upgradeRequires: { iron_fitting: 1 }, description: "Harvests and replants 5 plots every 6s. Near full automation." },
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
  { id: "plots_4x4", name: "Expand to 4×4", maxPlots: 16, cost: 500,    upgradeTier: 1, description: "Unlock up to 16 plots on this farm." },
  { id: "plots_5x5", name: "Expand to 5×5", maxPlots: 25, cost: 6000,   upgradeTier: 2, upgradeRequires: { iron_ore: 8, lumber: 5 }, description: "Unlock up to 25 plots on this farm." },
  { id: "plots_6x6", name: "Expand to 6×6", maxPlots: 36, cost: 30000,  upgradeTier: 3, upgradeRequires: { iron_fitting: 1 }, description: "Unlock up to 36 plots on this farm." },
];
 
export const FARM_INVESTMENT_YIELD = [
  { id: "yield_1", name: "Fertilizer I",   bonusYield: 1, cost: 1500,  upgradeTier: 2, upgradeRequires: { iron_ore: 3, lumber: 2 }, description: "+1 crop per worker harvest." },
  { id: "yield_2", name: "Fertilizer II",  bonusYield: 2, cost: 5000,  upgradeTier: 2, upgradeRequires: { iron_ore: 8, lumber: 5 }, description: "+2 crops per worker harvest." },
  { id: "yield_3", name: "Fertilizer III", bonusYield: 3, cost: 15000, upgradeTier: 3, upgradeRequires: { iron_fitting: 1 }, description: "+3 crops per worker harvest." },
  { id: "yield_4", name: "Fertilizer IV",  bonusYield: 4, cost: 50000, upgradeTier: 3, upgradeRequires: { iron_fitting: 2 }, description: "+4 crops per worker harvest." },
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
  bread: { id: "bread", name: "Bread", emoji: "🍞", inputCrop: "wheat",    inputAmount: 30, outputGood: "bread", outputAmount: 1, seconds: 90,  description: "Bake bread from wheat.", healAmount: 15 },
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
  // World loot
  iron_ore: 2, lumber: 4, herbs: 3, rare_gem: 100,
  // Forge goods
  health_potion: 25, iron_sword: 80, iron_shield: 90, leather_armor: 60, hunting_bow: 150,
  steel_sword: 180, master_sword: 340, steel_shield: 200, tower_shield: 380, chainmail: 140 ,
  plate_armor: 260,
  // Upgrade components (not intended for sale but assign a value)
  iron_fitting: 30, reinforced_crate: 30, fine_tools: 30,
};
 
// ─── Market workers ───────────────────────────────────────────────────────────
export const MARKET_WORKER_HIRE_COST = 25;
export const MARKET_WORKER_HIRE_MULTIPLIER = 2.5;
 
export const MARKET_WORKER_GEAR = {
  cart:       { id: "cart",       name: "Cart",       emoji: "🛒", itemsPerSecond: 1,  upgradeCost: null  },
  wagon:      { id: "wagon",      name: "Wagon",      emoji: "🪵", itemsPerSecond: 2,  upgradeCost: 120,   upgradeTier: 1 },
  truck:      { id: "truck",      name: "Truck",      emoji: "🚚", itemsPerSecond: 4,  upgradeCost: 400,   upgradeTier: 2, upgradeRequires: { iron_ore: 6, lumber: 3 } },
  freight:    { id: "freight",    name: "Freight",    emoji: "🚛", itemsPerSecond: 10, upgradeCost: 3000,  upgradeTier: 2, upgradeRequires: { iron_ore: 10, lumber: 6 } },
  export_hub: { id: "export_hub", name: "Export Hub", emoji: "🏗️", itemsPerSecond: 20, upgradeCost: 10000, upgradeTier: 3, upgradeRequires: { iron_fitting: 1 } },
};
 
export const MARKET_WORKER_GEAR_ORDER = ["cart", "wagon", "truck", "freight", "export_hub"];
export const MARKET_WORKER_STANDING_ORDER_COST = 250;
 
// ─── Kitchen workers ──────────────────────────────────────────────────────────
export const KITCHEN_WORKER_HIRE_COST = 15;
export const KITCHEN_WORKER_HIRE_MULTIPLIER = 2.5;
 
export const KITCHEN_WORKER_UPGRADES = {
  speed_1:      { id: "speed_1",      name: "Sharp Knife",  emoji: "🔪",     cost: 80,   upgradeTier: 1, description: "+25% processing speed.",                      speedMultiplier: 0.75, tree: "speed" },
  auto_restart: { id: "auto_restart", name: "Auto-Restart", emoji: "🔄",     cost: 200,  upgradeTier: 1, description: "Auto restarts recipe when finished.",           requires: "speed_1",   tree: "speed" },
  speed_2:      { id: "speed_2",      name: "Prep Station", emoji: "🍳",     cost: 500,  upgradeTier: 2, upgradeRequires: { iron_ore: 5, lumber: 3 }, description: "50% faster crafting (replaces Sharp Knife).",  speedMultiplier: 0.5,  requires: "auto_restart", tree: "speed" },
  batch_2:      { id: "batch_2",      name: "Batch ×2",     emoji: "📦",     cost: 800,  upgradeTier: 2, upgradeRequires: { iron_ore: 3, lumber: 2 }, description: "Double input, double output per run.",          batchSize: 2,          tree: "batch" },
  batch_5:      { id: "batch_5",      name: "Batch ×5",     emoji: "📦📦",   cost: 2500, upgradeTier: 3, upgradeRequires: { reinforced_crate: 1 }, description: "5× input, 5× output per run.",                  batchSize: 5,  requires: "batch_2", tree: "batch" },
  batch_10:     { id: "batch_10",     name: "Batch ×10",    emoji: "📦📦📦", cost: 8000, upgradeTier: 3, upgradeRequires: { reinforced_crate: 1 }, description: "10× input, 10× output per run.",                batchSize: 10, requires: "batch_5", tree: "batch" },
};
 
export const KITCHEN_WORKER_UPGRADE_ORDER = ["speed_1", "auto_restart", "speed_2", "batch_2", "batch_5", "batch_10"];
 
export const KITCHEN_BASE_COST = 20;
export const KITCHEN_SLOT_COSTS = [50, 150];
export const KITCHEN_SLOT_UPGRADES = { speed_1: { speedMultiplier: 0.75 }, speed_2: { speedMultiplier: 0.5 } };
 
// ─── Barn worker constants ────────────────────────────────────────────────────
export const BARN_WORKER_HIRE_BASE_COST = 50;
export const BARN_WORKER_HIRE_MULTIPLIER = 1.6;
export const BARN_WORKER_UPGRADES = {
  speed_1:    { id: "speed_1",    name: "Quick Rounds",  emoji: "⚡", cost: 150, upgradeTier: 1, description: "Collect every 25s",     requires: null,         tree: "speed" },
  speed_2:    { id: "speed_2",    name: "Sprint Rounds", emoji: "⚡", cost: 350, upgradeTier: 2, upgradeRequires: { iron_ore: 8, lumber: 4 }, description: "Collect every 20s",     requires: "speed_1",    tree: "speed" },
  capacity_1: { id: "capacity_1", name: "Big Basket",    emoji: "📦", cost: 200, upgradeTier: 1, description: "Collect 3 at once",     requires: null,         tree: "capacity" },
  capacity_2: { id: "capacity_2", name: "Cargo Basket",  emoji: "📦", cost: 400, upgradeTier: 2, upgradeRequires: { iron_ore: 6, lumber: 4 }, description: "Collect 6 at once",     requires: "capacity_1", tree: "capacity" },
  care_1:     { id: "care_1",     name: "Gentle Hands",  emoji: "💝", cost: 150, upgradeTier: 1, description: "+25 mood to neediest animal every 2min", requires: null,      tree: "care" },
  care_2:     { id: "care_2",     name: "Animal Bond",   emoji: "💝", cost: 300, upgradeTier: 2, upgradeRequires: { iron_ore: 4, lumber: 5 }, description: "+35 mood to neediest animal every 90s",  requires: "care_1",  tree: "care" },
};
export const ANIMAL_STORAGE_UPGRADES = [
  { level: 1, cost: 100, maxStock: 15, label: "Bigger Nest" },
  { level: 2, cost: 250, maxStock: 25, label: "Deluxe Nest" },
];
export const ANIMAL_YIELD_UPGRADES = [
  { level: 1, cost: 150, bonusYield: 1, upgradeTier: 1, label: "Well Fed"    },
  { level: 2, cost: 350, bonusYield: 2, upgradeTier: 2, upgradeRequires: { iron_ore: 4, lumber: 3 }, label: "Pampered"    },
  { level: 3, cost: 1200, bonusYield: 3, upgradeTier: 3, upgradeRequires: { fine_tools: 1 }, label: "Prize Animal" },
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
export const TOWN_HALL_MAX_LEVEL = 4;
export const TOWN_HALL_LEVEL_COSTS = [500, 1000, 3000, 8000]; // cash cost per level
export const TOWN_HALL_L1_IRON = 5;   // iron ore required to build level 1
export const TOWN_HALL_L1_LUMBER = 5; // lumber required to build level 1
export const POND_IRON = 10;          // iron ore required to build pond
export const POND_LUMBER = 5;         // lumber required to build pond
export const FORGE_BUILD_COST = 50;  // cash required to build forge
export const FORGE_IRON = 10;         // iron ore required to build forge
export const FORGE_LUMBER = 5;        // lumber required to build forge
 
// Treasury drain tiers — player picks which tier is active
// Each tier drains cash→treasury at drainRate/sec and gives grow speed bonus
export const TREASURY_TIERS = [
  { tier: 1, drainRate: 4,  growBonus: 10, label: "Slow"   },
  { tier: 2, drainRate: 15, growBonus: 20, label: "Steady" },
  { tier: 3, drainRate: 35, growBonus: 35, label: "Fast"   },
];
// Max drain tier available = min(Town Hall level, 3)
// Town Hall 4 unlocks Invest Now (lump sum), not a new drain tier

// ─── Invest Now ───────────────────────────────────────────────────────────────
export const INVEST_NOW_PCT = 0.10;        // fraction of cash transferred instantly
export const INVEST_NOW_CD_SECONDS = 30;   // cooldown between uses
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
export const BREAD_FOOD_UNITS = 30;
export const PERSON_IDLE_FOOD_COST = 1;
export const PERSON_WORKING_FOOD_COST = 3;
 
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
export const PRESTIGE_MIN_BARN_ANIMALS = 2; // each built barn needs at least this many animals
export const MAX_SEASON = 999;
 
// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 10_000;
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
  speed_1: { id: "speed_1", name: "Quick Cast",  emoji: "⚡", cost: 200, upgradeTier: 1, description: "Fish every 40s",   tree: "speed",    requires: null        },
  speed_2: { id: "speed_2", name: "Sprint Cast", emoji: "⚡", cost: 400, upgradeTier: 2, upgradeRequires: { iron_ore: 6, lumber: 4 }, description: "Fish every 20s",   tree: "speed",    requires: "speed_1"   },
  haul_1:  { id: "haul_1",  name: "Big Net",     emoji: "📦", cost: 250, upgradeTier: 1, description: "Catch 2 at once",  tree: "haul",     requires: null        },
  haul_2:  { id: "haul_2",  name: "Trawl Net",   emoji: "📦", cost: 500, upgradeTier: 2, upgradeRequires: { iron_ore: 6, lumber: 4 }, description: "Catch 5 at once",  tree: "haul",     requires: "haul_1"    },
  gear_good:   { id: "gear_good",   name: "Good Rod",   emoji: "🎣", cost: 300, upgradeTier: 2, upgradeRequires: { iron_ore: 5, lumber: 3 }, description: "Unlocks perch",    tree: "gear",     requires: null        },
  gear_expert: { id: "gear_expert", name: "Expert Rod",  emoji: "🎣", cost: 1000, upgradeTier: 3, upgradeRequires: { fine_tools: 1 }, description: "Best rare odds",  tree: "gear",     requires: "gear_good" },
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
  haul_2:  { id: "haul_2",  name: "Creel Basket",  emoji: "🧺", cost: 500,  tree: "haul", requires: null,     description: "Catch 2 fish per successful reel." },
  haul_5:  { id: "haul_5",  name: "Cast Net",       emoji: "🕸️", cost: 2000, tree: "haul", requires: "haul_2", description: "Catch 5 fish per successful reel." },
  haul_10: { id: "haul_10", name: "Deep Net",       emoji: "🌊", cost: 8000, tree: "haul", requires: "haul_5", description: "Catch 10 fish per successful reel." },
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
    upkeepPerAnimalPerSec: 0.50,
    unlockSeason: 4,
  },
  dairy: {
    id: "dairy", name: "Dairy", emoji: "🐄",
    animalType: "cow",
    buildCost: 2000,
    upkeepPerAnimalPerSec: 0.20,
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
  fish_meal:     { id: "fish_meal",      name: "Fish Meal",         emoji: "🌿", inputCrop: "minnow", inputAmount: 5, outputGood: "fish_meal", outputAmount: 1, seconds: 45,  description: "Fertilizer. Gives a 10min grow speed boost." },
  fish_meal_bass: { id: "fish_meal_bass", name: "Fish Meal (Bass)",  emoji: "🌿", inputCrop: "bass",   inputAmount: 3, outputGood: "fish_meal", outputAmount: 1, seconds: 60,  description: "Fertilizer from bass. For when minnows are scarce." },
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
export const TOWN_CLOTHIER_COST      = 5_500;
 
// Per-worker bonuses
export const CLINIC_CAP_PER_MEDIC        = 0.5;  // +0.5 pop cap per medic
export const CLINIC_SAT_PER_MEDIC        = 0.3;  // +0.3% sat per medic
export const SCHOOL_GROW_PER_RESEARCHER  = 0.2;  // +0.2% grow speed per researcher
export const TAVERN_SAT_PER_BARTENDER    = 0.5;  // +0.5% sat per bartender
export const RESTAURANT_SAT_PER_CHEF     = 0.8;  // +0.8% sat per chef
export const CLOTHIER_CASH_PER_CLERK     = 40;   // +$X cash income per pulse per clerk (~33% premium over $90 market rate for 3 clerks/good)
 
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
  fighter: [
    {
      id: "fighter_t1",
      name: "Iron Stance",
      emoji: "🛡️",
      tier: 1,
      classUnlock: "fighter",
      description: "+20 max HP. Unlocks Fighter tree.",
      requiredLevel: 2,
      maxRank: 1,
    },
    {
      id: "fighter_t2",
      name: "Resilience",
      emoji: "💪",
      tier: 2,
      description: "Healing from all food/items +20%.",
      requiredLevel: 4,
      maxRank: 1,
    },
    {
      id: "fighter_t3",
      name: "Hearth Guardian",
      emoji: "🍞",
      tier: 3,
      description: "🌾 Bread bakes 30% faster globally.",
      requiredLevel: 6,
      maxRank: 1,
      crossSystemEffect: "bread_speed",
    },
    {
      id: "fighter_t4",
      name: "Relentless",
      emoji: "🔄",
      tier: 4,
      description: "Auto-battle: heal to 60% HP between runs even without food.",
      requiredLevel: 8,
      maxRank: 1,
      grantsAutoBattle: true,
    },
    {
      id: "fighter_t5",
      name: "Fortitude",
      emoji: "❤️",
      tier: 5,
      description: "+8 max HP per rank (up to +40).",
      requiredLevel: 10,
      maxRank: 5,
      repeatable: true,
      hpPerRank: 8,
    },
    {
      id: "fighter_t6",
      name: "Iron Rations",
      emoji: "🍖",
      tier: 6,
      description: "Food heals +3 HP per rank (up to +15 bonus healing).",
      requiredLevel: 12,
      maxRank: 5,
      repeatable: true,
      healBonusPerRank: 3,
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
      description: "-15% mission duration. Unlocks Mage tree.",
      requiredLevel: 2,
      maxRank: 1,
    },
    {
      id: "mage_t2",
      name: "Spell Surge",
      emoji: "✨",
      tier: 2,
      description: "+15% XP gained from all missions.",
      requiredLevel: 4,
      maxRank: 1,
    },
    {
      id: "mage_t3",
      name: "Arcane Focus",
      emoji: "🍳",
      tier: 3,
      description: "🌾 Kitchen workers have 20% chance of bonus output per craft.",
      requiredLevel: 6,
      maxRank: 1,
      crossSystemEffect: "kitchen_bonus",
    },
    {
      id: "mage_t4",
      name: "Blink",
      emoji: "⚡",
      tier: 4,
      description: "Auto-battle: -20% mission duration per run (stacks with Flicker Step).",
      requiredLevel: 8,
      maxRank: 1,
      grantsAutoBattle: true,
    },
    {
      id: "mage_t5",
      name: "Swiftness",
      emoji: "🏃",
      tier: 5,
      description: "-3% mission duration per rank (up to -15% more).",
      requiredLevel: 10,
      maxRank: 5,
      repeatable: true,
      durationReductionPerRank: 0.03,
    },
    {
      id: "mage_t6",
      name: "Mind Over Matter",
      emoji: "🧠",
      tier: 6,
      description: "+10% XP per rank (up to +50% more XP).",
      requiredLevel: 12,
      maxRank: 5,
      repeatable: true,
      xpBonusPerRank: 0.10,
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
      description: "+1 minimum loot on all drops. Unlocks Scavenger tree.",
      requiredLevel: 2,
      maxRank: 1,
    },
    {
      id: "scavenger_t2",
      name: "Ghost Step",
      emoji: "👻",
      tier: 2,
      description: "20% chance to take 0 damage each damage tick.",
      requiredLevel: 4,
      maxRank: 1,
    },
    {
      id: "scavenger_t3",
      name: "Fence Network",
      emoji: "💰",
      tier: 3,
      description: "🌾 Market sell prices +10% globally.",
      requiredLevel: 6,
      maxRank: 1,
      crossSystemEffect: "market_bonus",
    },
    {
      id: "scavenger_t4",
      name: "Jackpot",
      emoji: "🎰",
      tier: 4,
      description: "Auto-battle: 15% chance of double loot per run.",
      requiredLevel: 8,
      maxRank: 1,
      grantsAutoBattle: true,
    },
    {
      id: "scavenger_t5",
      name: "Keen Eye",
      emoji: "🎯",
      tier: 5,
      description: "+1 min loot per rank (up to +5 more minimum loot).",
      requiredLevel: 10,
      maxRank: 5,
      repeatable: true,
      minLootPerRank: 1,
    },
    {
      id: "scavenger_t6",
      name: "Phantom",
      emoji: "🌫️",
      tier: 6,
      description: "+4% evasion per rank (up to +20% more, stacks with Ghost Step).",
      requiredLevel: 12,
      maxRank: 5,
      repeatable: true,
      evasionPerRank: 0.04,
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
export const HERO_PRESTIGE_COST_BASE = 1000;  // × (prestigeLevel + 1) in cash
export const HERO_PRESTIGE_SKILL_COST = 3;    // skill points required to unlock prestige ability
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
    description: "A collapsed mine on the edge of your land. Might have iron ore.",
    baseDuration: 50,
    clearsNeeded: 4,
    unlockAfterClears: 0,
    unlockRequiresZone: null,
    gearRequired: 0,
    xpReward: 8,
    enemyName: "Mine Crawlers",
    damagePerTick: 7,
    maxEnemyHp: 15,
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
    baseDuration: 65,
    clearsNeeded: 5,
    unlockAfterClears: 2,
    unlockRequiresZone: "old_mine",
    gearRequired: 1,
    xpReward: 12,
    enemyName: "Forest Wolves",
    damagePerTick: 7,
    maxEnemyHp: 35,
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
    description: "Dripping walls, strange fungi. Herbalists would love this place.",
    baseDuration: 80,
    clearsNeeded: 6,
    unlockAfterClears: 5,
    unlockRequiresZone: "birch_forest",
    gearRequired: 2,
    xpReward: 18,
    enemyName: "Cave Horrors",
    damagePerTick: 6,
    maxEnemyHp: 50,
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
    description: "A deeper shaft beneath the old mine. Rich iron deposits, but dangerous.",
    baseDuration: 70,
    clearsNeeded: 5,
    unlockAfterClears: 4,
    unlockRequiresZone: "old_mine",
    gearRequired: 1,
    xpReward: 14,
    enemyName: "Rock Golems",
    damagePerTick: 7,
    maxEnemyHp: 40,
    loot: [
      { resourceKey: "iron_ore", emoji: "🪨", name: "Iron Ore", min: 5, max: 10 },
      { resourceKey: "rare_gem", emoji: "💎", name: "Rare Gem", min: 0, max: 1 },
    ],
    workerResource: "Iron Ore",
    workerEmoji: "🪨",
    workerYieldPerMinute: 6,
  },
  ancient_forest: {
    id: "ancient_forest",
    name: "Ancient Forest",
    emoji: "🌳",
    description: "Old growth trees with premium lumber. The treants are not friendly.",
    baseDuration: 85,
    clearsNeeded: 6,
    unlockAfterClears: 5,
    unlockRequiresZone: "birch_forest",
    gearRequired: 2,
    xpReward: 20,
    enemyName: "Treants",
    damagePerTick: 7,
    maxEnemyHp: 55,
    loot: [
      { resourceKey: "lumber", emoji: "🪵", name: "Lumber", min: 6, max: 12 },
      { resourceKey: "herbs",  emoji: "🌿", name: "Herbs",  min: 2, max: 5 },
    ],
    workerResource: "Lumber",
    workerEmoji: "🪵",
    workerYieldPerMinute: 5,
  },
  iron_vein: {
    id: "iron_vein",
    name: "Iron Vein",
    emoji: "🔩",
    description: "A legendary vein of pure iron deep in the mountains. Guarded by Stone Titans.",
    baseDuration: 110,
    clearsNeeded: 8,
    unlockAfterClears: 5,
    unlockRequiresZone: "deep_mine",
    gearRequired: 3,
    xpReward: 30,
    enemyName: "Stone Titans",
    damagePerTick: 5,
    maxEnemyHp: 80,
    loot: [
      { resourceKey: "iron_ore", emoji: "🪨", name: "Iron Ore", min: 10, max: 20 },
      { resourceKey: "rare_gem", emoji: "💎", name: "Rare Gem", min: 0, max: 2 },
      { resourceKey: "lumber",   emoji: "🪵", name: "Lumber",   min: 2, max: 5 },
    ],
    workerResource: "Iron Ore",
    workerEmoji: "🪨",
    workerYieldPerMinute: 12,
  }
};

export const WORLD_RESOURCES = {
  iron_ore: { name: "Iron Ore",  emoji: "🪨" },
  lumber:   { name: "Lumber",    emoji: "🪵" },
  herbs:    { name: "Herbs",     emoji: "🌿" },
  rare_gem: { name: "Rare Gem",  emoji: "💎" },
};

// ─── Adventurer Stats ─────────────────────────────────────────────────────────

export const ADVENTURER_BASE_HP = 40;
export const ADVENTURER_HP_PER_LEVEL = 8;
export const ADVENTURER_REGEN_PER_SECOND = 0.05; // passive regen while not on mission



// ─── Artisan Food as Heal Items ───────────────────────────────────────────────

export const ARTISAN_FOOD_HEAL = {
  bread: { id: "bread", emoji: "🍞", name: "Bread", healAmount: 30 },
  jam:   { id: "jam",   emoji: "🍯", name: "Jam",   healAmount: 50 },
  sauce: { id: "sauce", emoji: "🥫", name: "Sauce", healAmount: 100 },
};
export const ARTISAN_FOOD_LIST = ["bread", "jam", "sauce"];

// ─── Adventurer Buff Items (separate slot, not food belt) ────────────────────
export const ADVENTURER_BUFF_ITEMS = {
  omelette: { id: "omelette", emoji: "🍳", name: "Omelette", buffType: "run_time", buffValue: 0.5, description: "−50% mission run time for one mission." },
  cheese:   { id: "cheese",   emoji: "🧀", name: "Cheese",   buffType: "double_loot", buffValue: 2,   description: "Double all loot for one mission." },
};
export const ADVENTURER_BUFF_LIST = ["omelette", "cheese"];

// World Worker constants
export const WORLD_WORKER_HIRE_COST = 200; // cash cost to hire a world zone worker


// ─── Forge System ─────────────────────────────────────────────────────────────

export const FORGE_RECIPES = {
  // ─── Swords (weapon slot) — reduce mission time ──────────────────────────
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    emoji: "⚔️",
    description: "Equip an adventurer. −10% mission time.",
    inputs: { iron_ore: 6, lumber: 4 },
    output: { resourceKey: "iron_sword", emoji: "⚔️", name: "Iron Sword" },
    seconds: 20,
    gearTier: 1,
    category: "weapon",
    missionTimeReduction: 0.10,
  },
  steel_sword: {
    id: "steel_sword",
    name: "Steel Sword",
    emoji: "🗡️",
    description: "Equip an adventurer. −25% mission time.",
    inputs: { iron_ore: 14, lumber: 10 },
    output: { resourceKey: "steel_sword", emoji: "🗡️", name: "Steel Sword" },
    seconds: 40,
    gearTier: 2,
    category: "weapon",
    missionTimeReduction: 0.25,
    requires: "iron_sword",
  },
  master_sword: {
    id: "master_sword",
    name: "Master Sword",
    emoji: "🔱",
    description: "Equip an adventurer. −40% mission time.",
    inputs: { iron_ore: 25, lumber: 18, iron_fitting: 2, rare_gem: 1 },
    output: { resourceKey: "master_sword", emoji: "🔱", name: "Master Sword" },
    seconds: 80,
    gearTier: 3,
    category: "weapon",
    missionTimeReduction: 0.40,
    requires: "steel_sword",
  },
  // ─── Shields (armour slot) — reduce damage taken ──────────────────────────
  iron_shield: {
    id: "iron_shield",
    name: "Iron Shield",
    emoji: "🛡️",
    description: "Equip an adventurer. −10% damage taken.",
    inputs: { iron_ore: 8, lumber: 4 },
    output: { resourceKey: "iron_shield", emoji: "🛡️", name: "Iron Shield" },
    seconds: 25,
    gearTier: 1,
    category: "armour",
    damageReduction: 0.10,
  },
  steel_shield: {
    id: "steel_shield",
    name: "Steel Shield",
    emoji: "🔰",
    description: "Equip an adventurer. −25% damage taken.",
    inputs: { iron_ore: 18, lumber: 8 },
    output: { resourceKey: "steel_shield", emoji: "🔰", name: "Steel Shield" },
    seconds: 50,
    gearTier: 2,
    category: "armour",
    damageReduction: 0.25,
    requires: "iron_shield",
  },
  tower_shield: {
    id: "tower_shield",
    name: "Tower Shield",
    emoji: "🏰",
    description: "Equip an adventurer. −40% damage taken.",
    inputs: { iron_ore: 30, lumber: 14, reinforced_crate: 2, rare_gem: 1 },
    output: { resourceKey: "tower_shield", emoji: "🏰", name: "Tower Shield" },
    seconds: 90,
    gearTier: 3,
    category: "armour",
    damageReduction: 0.40,
    requires: "steel_shield",
  },
  // ─── Body Armor (body slot) — increase food belt slots ───────────────────
  leather_armor: {
    id: "leather_armor",
    name: "Leather Armor",
    emoji: "🥋",
    description: "Equip an adventurer. +1 food belt slot.",
    inputs: { iron_ore: 4, lumber: 8 },
    output: { resourceKey: "leather_armor", emoji: "🥋", name: "Leather Armor" },
    seconds: 18,
    gearTier: 1,
    category: "body",
    foodSlotBonus: 1,
  },
  chainmail: {
    id: "chainmail",
    name: "Chainmail",
    emoji: "⛓️",
    description: "Equip an adventurer. +3 food belt slots.",
    inputs: { iron_ore: 16, lumber: 12 },
    output: { resourceKey: "chainmail", emoji: "⛓️", name: "Chainmail" },
    seconds: 45,
    gearTier: 2,
    category: "body",
    foodSlotBonus: 3,
    requires: "leather_armor",
  },
  plate_armor: {
    id: "plate_armor",
    name: "Plate Armor",
    emoji: "🪖",
    description: "Equip an adventurer. +5 food belt slots.",
    inputs: { iron_ore: 28, lumber: 20, reinforced_crate: 1, iron_fitting: 2 },
    output: { resourceKey: "plate_armor", emoji: "🪖", name: "Plate Armor" },
    seconds: 100,
    gearTier: 3,
    category: "body",
    foodSlotBonus: 5,
    requires: "chainmail",
  },
  hunting_bow: {
    id: "hunting_bow",
    name: "Hunting Bow",
    emoji: "🏹",
    description: "Equip a ranger. Bonus loot from forest zones.",
    inputs: { lumber: 10, iron_ore: 4 },
    output: { resourceKey: "hunting_bow", emoji: "🏹", name: "Hunting Bow" },
    seconds: 35,
    gearTier: 2,
    category: "weapon",
    requires: "iron_sword",
  },
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    emoji: "🧪",
    description: "Consumable. Adventurer auto-uses on near-fail.",
    inputs: { herbs: 6 },
    output: { resourceKey: "health_potion", emoji: "🧪", name: "Health Potion" },
    seconds: 12,
    gearTier: 0,
    category: "consumable",
  },
  // ─── Upgrade Components (T3 upgrade materials) ──────────────────────────────
  iron_fitting: {
    id: "iron_fitting",
    name: "Iron Fitting",
    emoji: "🔩",
    description: "Component. Required for T3 farm and plot upgrades.",
    inputs: { iron_ore: 15, lumber: 8 },
    output: { resourceKey: "iron_fitting", emoji: "🔩", name: "Iron Fitting" },
    seconds: 60,
    gearTier: 0,
    category: "component",
  },
  reinforced_crate: {
    id: "reinforced_crate",
    name: "Reinforced Crate",
    emoji: "📦",
    description: "Component. Required for T3 kitchen batch upgrades.",
    inputs: { iron_ore: 10, lumber: 12 },
    output: { resourceKey: "reinforced_crate", emoji: "📦", name: "Reinforced Crate" },
    seconds: 50,
    gearTier: 0,
    category: "component",
  },
  fine_tools: {
    id: "fine_tools",
    name: "Fine Tools",
    emoji: "🛠️",
    description: "Component. Required for T3 fishing and barn upgrades.",
    inputs: { iron_ore: 12, lumber: 10 },
    output: { resourceKey: "fine_tools", emoji: "🛠️", name: "Fine Tools" },
    seconds: 60,
    gearTier: 0,
    category: "component",
  },
};

export const FORGE_RECIPE_LIST = ["health_potion", "iron_sword", "steel_sword", "master_sword", "iron_shield", "steel_shield", "tower_shield", "leather_armor", "chainmail", "plate_armor", "hunting_bow", "iron_fitting", "reinforced_crate", "fine_tools"];

export const FORGE_WORKER_HIRE_COST = 50;
export const FORGE_WORKER_HIRE_MULTIPLIER = 1.6;

export const FORGE_WORKER_UPGRADES = {
  forge_speed_1: { id: "forge_speed_1", name: "Bellows",      emoji: "💨", description: "Craft 30% faster.", cost: 200, requires: null },
  forge_auto:    { id: "forge_auto",    name: "Auto-Craft",   emoji: "🔄", description: "Auto-restarts last recipe.", cost: 300, requires: "forge_speed_1" },
  forge_speed_2: { id: "forge_speed_2", name: "Master Forge", emoji: "🔥", description: "Craft 50% faster.", cost: 500, requires: "forge_auto", upgradeRequires: { iron_ore: 5, lumber: 3 } },
};

export const FORGE_WORKER_UPGRADE_ORDER = ["forge_speed_1", "forge_auto", "forge_speed_2"];