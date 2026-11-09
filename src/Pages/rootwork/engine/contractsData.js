// src/Pages/rootwork/engine/contractsData.js — Contracts board + Seal Shop definitions
// Kept out of gameConstants.js (CRLF) on purpose. Tune numbers here.

export const CONTRACT_SLOTS_BASE = 3;
export const CONTRACT_SLOTS_MAX = 5;
export const CONTRACT_REFILL_SECONDS = 300;          // empty slot refills after 5 min
export const CONTRACT_SEASON_SCALE = 0.35;           // amount × (1 + 0.35 × (season − 1))
export const CONTRACT_CROP_WAREHOUSE_FRACTION = 0.6; // crop asks never exceed 60% of warehouse cap
export const CONTRACT_BOOST_SECONDS = 900;           // Rush boosts last 15 min
export const CONTRACT_BOOST_MAX_SECONDS = 3600;      // stacking the same boost extends it, up to 1 hour

export const CONTRACT_TIERS = {
  easy:     { id: "easy",     name: "Easy",     emoji: "🟢", items: 1, mult: 1.0, seconds: 1800, seals: 1, weight: 45 },
  standard: { id: "standard", name: "Standard", emoji: "🟡", items: 2, mult: 1.5, seconds: 1200, seals: 2, weight: 40 },
  rush:     { id: "rush",     name: "Rush",     emoji: "🔴", items: 3, mult: 2.5, seconds: 900,  seals: 4, weight: 15, boost: true },
};
export const CONTRACT_TIER_ORDER = ["easy", "standard", "rush"];

// Who's asking — the trade town's name once your road reaches it, a local stand-in before that
export const CONTRACT_REQUESTERS = {
  crops:   { town: "thornwick",  townName: "Thornwick",  emoji: "🌾", local: "The village granary" },
  fish:    { town: "crestfall",  townName: "Crestfall",  emoji: "🎣", local: "A riverside cook" },
  artisan: { town: "millhaven",  townName: "Millhaven",  emoji: "🍞", local: "The town bakery" },
  animal:  { town: "glenhollow", townName: "Glenhollow", emoji: "🐄", local: "The local tavern" },
  forge:   { town: "ironfeld",   townName: "Ironfeld",   emoji: "⚒️", local: "The guild quartermaster" },
};

// Everything a contract can ask for.
//   base     — amount at Season 1 for an Easy contract
//   category — picks the requester
//   requires — see isContractItemAvailable in contracts.js
export const CONTRACT_ITEMS = {
  wheat:            { key: "wheat",            name: "Wheat",            emoji: "🌾", source: "crops",       category: "crops",   base: 1000, requires: "farm_wheat" },
  berries:          { key: "berries",          name: "Berries",          emoji: "🫐", source: "crops",       category: "crops",   base: 500,  requires: "farm_berries" },
  tomatoes:         { key: "tomatoes",         name: "Tomatoes",         emoji: "🍅", source: "crops",       category: "crops",   base: 250,  requires: "farm_tomatoes" },
  bread:            { key: "bread",            name: "Bread",            emoji: "🍞", source: "artisan",     category: "artisan", base: 25,   requires: "kitchen_wheat" },
  jam:              { key: "jam",              name: "Jam",              emoji: "🍯", source: "artisan",     category: "artisan", base: 15,   requires: "kitchen_berries" },
  sauce:            { key: "sauce",            name: "Sauce",            emoji: "🥫", source: "artisan",     category: "artisan", base: 10,   requires: "kitchen_tomatoes" },
  egg:              { key: "egg",              name: "Eggs",             emoji: "🥚", source: "animalGoods", category: "animal",  base: 60,   requires: "barn_chicken_coop" },
  milk:             { key: "milk",             name: "Milk",             emoji: "🥛", source: "animalGoods", category: "animal",  base: 30,   requires: "barn_dairy" },
  wool:             { key: "wool",             name: "Wool",             emoji: "🧶", source: "animalGoods", category: "animal",  base: 20,   requires: "barn_wool_shed" },
  omelette:         { key: "omelette",         name: "Omelettes",        emoji: "🍳", source: "animalGoods", category: "animal",  base: 10,   requires: "kitchen_barn_chicken_coop" },
  cheese:           { key: "cheese",           name: "Cheese",           emoji: "🧀", source: "animalGoods", category: "animal",  base: 8,    requires: "kitchen_barn_dairy" },
  knitted_goods:    { key: "knitted_goods",    name: "Knitted Goods",    emoji: "🧥", source: "animalGoods", category: "animal",  base: 6,    requires: "kitchen_barn_wool_shed" },
  minnow:           { key: "minnow",           name: "Minnows",          emoji: "🎣", source: "fish",        category: "fish",    base: 60,   requires: "water_pond" },
  bass:             { key: "bass",             name: "Bass",             emoji: "🐠", source: "fish",        category: "fish",    base: 30,   requires: "water_pond" },
  perch:            { key: "perch",            name: "Perch",            emoji: "🐡", source: "fish",        category: "fish",    base: 20,   requires: "water_lake" },
  rare:             { key: "rare",             name: "Rare Fish",        emoji: "✨", source: "fish",        category: "fish",    base: 4,    requires: "water_lake" },
  iron_fitting:     { key: "iron_fitting",     name: "Iron Fittings",    emoji: "🔩", source: "component",   category: "forge",   base: 5,    requires: "forge" },
  reinforced_crate: { key: "reinforced_crate", name: "Reinforced Crates", emoji: "📦", source: "component",  category: "forge",   base: 5,    requires: "forge" },
  fine_tools:       { key: "fine_tools",       name: "Fine Tools",       emoji: "🛠️", source: "component",   category: "forge",   base: 4,    requires: "forge" },
  iron_ore:         { key: "iron_ore",         name: "Iron Ore",         emoji: "🪨", source: "world",       category: "forge",   base: 150,  requires: "heroes" },
  lumber:           { key: "lumber",           name: "Lumber",           emoji: "🪵", source: "world",       category: "forge",   base: 150,  requires: "heroes" },
  rare_gem:         { key: "rare_gem",         name: "Rare Gems",        emoji: "💎", source: "world",       category: "forge",   base: 3,    requires: "gems" },
};

// Rush contracts also hand out one of these for CONTRACT_BOOST_SECONDS.
// Keys are read through engine/bonuses.js, same as Town Projects.
export const CONTRACT_BOOSTS = [
  { key: "cropYield",    value: 0.25, label: "+25% crop yield",    emoji: "🌾" },
  { key: "fishingSpeed", value: 0.50, label: "+50% fishing speed", emoji: "🎣" },
  { key: "sellPrice",    value: 0.15, label: "+15% sell prices",   emoji: "💰" },
  { key: "heroXp",       value: 0.50, label: "+50% hero XP",       emoji: "⭐" },
];

// ─── Seal Shop ────────────────────────────────────────────────────────────────
// cost(timesBought) → seals, or null when sold out
export const SEAL_SHOP_ITEMS = {
  titan_core: {
    id: "titan_core", name: "Titan Core", emoji: "💠",
    description: "One Titan Core, straight to your resources.",
    cost: () => 6,
  },
  mana_crystals: {
    id: "mana_crystals", name: "Mana Crystals ×5", emoji: "🔮",
    description: "Five mana crystals for research and arcane work.",
    cost: () => 4,
  },
  blueprint: {
    id: "blueprint", name: "Project Blueprint", emoji: "📐",
    description: "Fills 25% of every input on a Town Project's current stage.",
    cost: () => 10,
    needsProject: true,
  },
  extra_slot: {
    id: "extra_slot", name: "Extra Contract Slot", emoji: "📜",
    description: "Permanently adds one more contract to the board (max 5).",
    cost: (bought) => (bought === 0 ? 15 : bought === 1 ? 30 : null),
  },
  bonus_prestige: {
    id: "bonus_prestige", name: "Bonus Prestige Point", emoji: "⭐",
    description: "One extra skill point for the prestige tree. Costs 20 more each time.",
    cost: (bought) => 40 + bought * 20,
  },
};
export const SEAL_SHOP_ORDER = ["blueprint", "titan_core", "mana_crystals", "extra_slot", "bonus_prestige"];
export const BLUEPRINT_FILL_FRACTION = 0.25;