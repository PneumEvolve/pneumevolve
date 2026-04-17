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
  { id: "plots_4x4", name: "Expand to 4×4", maxPlots: 16, cost: 500,  description: "Unlock up to 16 plots on this farm." },
  { id: "plots_5x5", name: "Expand to 5×5", maxPlots: 25, cost: 1200, description: "Unlock up to 25 plots on this farm." },
  { id: "plots_6x6", name: "Expand to 6×6", maxPlots: 36, cost: 3000, description: "Unlock up to 36 plots on this farm." },
];
 
export const FARM_INVESTMENT_YIELD = [
  { id: "yield_1", name: "Fertilizer I",   bonusYield: 1, cost: 300,  description: "+1 crop per worker harvest." },
  { id: "yield_2", name: "Fertilizer II",  bonusYield: 2, cost: 1500, description: "+2 crops per worker harvest." },
  { id: "yield_3", name: "Fertilizer III", bonusYield: 3, cost: 3500, description: "+3 crops per worker harvest." },
  { id: "yield_4", name: "Fertilizer IV",  bonusYield: 4, cost: 8000, description: "+4 crops per worker harvest." },
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
  minnow: 2, bass: 8, perch: 12, pike: 35,
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
 
// ─── Prestige bonuses ─────────────────────────────────────────────────────────
export const PRESTIGE_BONUSES = {
  bumper_crop:  { id: "bumper_crop",  name: "Bumper Crop",  emoji: "📈", description: "+10% yield on all harvests. Fractional yield accumulates." },
  head_start:   { id: "head_start",   name: "Head Start",   emoji: "🙋", description: "Start each season with 1 free worker on every available farm." },
  fast_hands:   { id: "fast_hands",   name: "Fast Hands",   emoji: "🧤", description: "All newly hired workers start with Gloves instead of Bare Hands." },
  market_savvy: { id: "market_savvy", name: "Market Savvy", emoji: "💹", description: "All market sell prices permanently +25%. Stacks." },
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
export const TOWN_HALL_LEVEL_COSTS = [50, 600, 1500]; // cash cost per level
 
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
export const BUILDING_UPGRADE_COST = 200; // treasury cost
 
// ─── Pulse system ─────────────────────────────────────────────────────────────
export const TOWN_PULSE_SECONDS = 45;
export const TOWN_WHEAT_PER_PERSON = 1;
export const TOWN_WHEAT_PER_WORKER = 1;
export const TOWN_BREAD_FEEDS = 10;
export const TOWN_GROWTH_PER_PULSE = 1;
export const TOWN_DECLINE_PER_PULSE = 1;
export const TOWN_HOME_INSTANT_POPULATION = 1;
 
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
export const FIRST_EXTRA_FARM_SEASON = 4;
export const MAX_SEASON = 999;
 
// ─── Save config ──────────────────────────────────────────────────────────────
export const SAVE_KEY = "rootwork_save";
export const SAVE_INTERVAL_MS = 30_000;
export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;
 
// ─── Pond ─────────────────────────────────────────────────────────────────────
export const POND_COST = 200; // Reduced from 500 to be accessible early-game
 
export const FISH_TYPES = {
  minnow:      { id: "minnow",      name: "Minnow",      emoji: "🐟", rarity: "common",    rawValue: 2,  craftable: true,  manualOnly: false },
  bass:        { id: "bass",        name: "Bass",         emoji: "🎣", rarity: "uncommon",  rawValue: 8,  craftable: true,  manualOnly: false },
  perch:       { id: "perch",       name: "Perch",        emoji: "🐠", rarity: "uncommon",  rawValue: 12, craftable: true,  manualOnly: false },
  pike:        { id: "pike",        name: "Pike",         emoji: "🦈", rarity: "rare",      rawValue: 35, craftable: false, manualOnly: true  },
  golden_fish: { id: "golden_fish", name: "Golden Fish",  emoji: "✨", rarity: "legendary", rawValue: 0,  craftable: false, manualOnly: true  },
};
 
// Needle sweet spot width by rod tier (fraction of bar, 0-1)
// Better rod = wider sweet spot
export const ROD_TIERS = [
  { id: "twig",    name: "Twig Rod",    emoji: "🌿", sweetSpotWidth: 0.18, biteTimeMin: 3, biteTimeMax: 7, upgradeCost: null, description: "A basic stick. Gets the job done." },
  { id: "bamboo",  name: "Bamboo Rod",  emoji: "🎋", sweetSpotWidth: 0.24, biteTimeMin: 2, biteTimeMax: 6, upgradeCost: 150,  description: "Wider sweet spot, faster bites." },
  { id: "carbon",  name: "Carbon Rod",  emoji: "🎣", sweetSpotWidth: 0.30, biteTimeMin: 1, biteTimeMax: 5, upgradeCost: 500,  description: "Professional grade. Much easier to nail." },
  { id: "pro",     name: "Pro Rod",     emoji: "⚡", sweetSpotWidth: 0.38, biteTimeMin: 1, biteTimeMax: 4, upgradeCost: 1500, description: "The best. Huge sweet spot, lightning bites." },
];
export const ROD_ORDER = ["twig", "bamboo", "carbon", "pro"];
 
// Fish trap automation
export const FISH_TRAP_COST = 300;
export const FISH_TRAP_CATCH_INTERVAL = 30; // seconds between catches
export const FISH_TRAP_FISH = ["minnow", "bass"]; // only common/uncommon
 
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
 
// Catch probability tables [no bait, with matching bait]
// Needle quality multiplies rare/legendary chances
export const FISH_CATCH_RATES = {
  // [common%, uncommon%, rare%, legendary%]
  none:        { common: 0.65, uncommon: 0.30, rare: 0.04, legendary: 0.01 },
  wheat_bait:  { common: 0.80, uncommon: 0.18, rare: 0.02, legendary: 0.00 },
  berry_bait:  { common: 0.40, uncommon: 0.54, rare: 0.05, legendary: 0.01 },
  tomato_bait: { common: 0.30, uncommon: 0.35, rare: 0.30, legendary: 0.05 },
};
 
// Golden fish bonus pool — pick one at random
export const GOLDEN_FISH_BONUSES = [
  { id: "treasury_inject", description: "Injects $500 directly into your treasury", emoji: "💰" },
  { id: "feast_boost",     description: "Doubles your feast grow bonus for 5 minutes", emoji: "🍽️" },
  { id: "free_plot",       description: "Upgrades a random unupgraded plot for free", emoji: "⭐" },
  { id: "town_sat",        description: "Instantly maxes town satisfaction", emoji: "😄" },
];
 
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
 
export const MAX_ANIMALS_PER_TYPE = 5;
 
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
  minnow: 2, bass: 8, perch: 12, pike: 35,
};