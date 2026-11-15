// src/Pages/rootwork/engine/contractsData.js — Contracts board + Seal Shop definitions
// Kept out of gameConstants.js (CRLF) on purpose. Tune numbers here.
//
// SMART CONTRACTS (Nov 2026 rebuild)
// Contracts ask for what you are ACTUALLY producing right now, sized in minutes of your
// current output — not a flat number that grows with the season.
//   • Each tier has `minutes`: an item's ask = (your production per second) × minutes × 60.
//   • Raw goods only count what's left over after your cooks take their share, so if all
//     your wheat goes into bread you'll get asked for bread, not wheat.
//   • Pays seals + cash at a premium over what the market would give you for the same goods.
//   • "Stretch" contracts (rare, max one on the board) ask for something you have the
//     building for but nothing is making yet — e.g. lake unlocked but no fisher on it.

import { SEASONAL_QUESTS } from "../gameConstants";

export const CONTRACT_SLOTS_BASE = 3;
export const CONTRACT_SLOTS_MAX = 5;
export const CONTRACT_REFILL_SECONDS = 300;          // empty slot refills after 5 min
export const CONTRACT_SEASON_SCALE = 0.35;           // stretch contracts only: amount × (1 + 0.35 × (season − 1))
export const CONTRACT_CROP_WAREHOUSE_FRACTION = 0.6; // crop asks never exceed 60% of warehouse cap
export const CONTRACT_BOOST_SECONDS = 900;           // Rush boosts last 15 min
export const CONTRACT_BOOST_MAX_SECONDS = 3600;      // stacking the same boost extends it, up to 1 hour

// An item can be asked for once an Easy ask would be at least this fraction of its `base`
// (stops "deliver 1 wheat" contracts from a farm that barely runs)
export const CONTRACT_MIN_FRACTION_OF_BASE = 0.1;
// Cooks can run on stockpile for a while — input stock counts as this many seconds of extra supply
export const CONTRACT_STOCK_BUFFER_SECONDS = 1800;
// World resources (iron, lumber, gems) come in lumps from heroes — smoothed over ~10 min
export const CONTRACT_WORLD_SMOOTHING_SECONDS = 600;

// Stretch contracts
export const CONTRACT_STRETCH_CHANCE = 0.15;          // chance a new contract is a stretch (when one is possible)
export const CONTRACT_STRETCH_AMOUNT_MULT = 0.5;      // amount = base × season scale × this

//   minutes      — minutes of your current production per item
//   seconds      — deadline
//   cashPremium  — paid on top of seals: market value of the goods × this
export const CONTRACT_TIERS = {
  easy:     { id: "easy",     name: "Easy",     emoji: "🟢", items: 1, minutes: 8,  seconds: 1800, seals: 1, cashPremium: 1.25, weight: 45 },
  standard: { id: "standard", name: "Standard", emoji: "🟡", items: 2, minutes: 12, seconds: 1800, seals: 2, cashPremium: 1.4,  weight: 35 },
  rush:     { id: "rush",     name: "Rush",     emoji: "🔴", items: 3, minutes: 15, seconds: 1500, seals: 4, cashPremium: 1.6,  weight: 20, boost: true },
  // Not rolled like the others — see CONTRACT_STRETCH_CHANCE
  stretch:  { id: "stretch",  name: "Stretch",  emoji: "🧭", items: 1, minutes: 0,  seconds: 3600, seals: 3, cashPremium: 2.0,  weight: 0 },
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
//   base     — used for stretch amounts and the minimum-ask floor
//   category — picks the requester
//   stretch  — what you must OWN for this to show up as a stretch contract (see contracts.js)
export const CONTRACT_ITEMS = {
  wheat:            { key: "wheat",            name: "Wheat",             emoji: "🌾", source: "crops",       category: "crops",   base: 1000 },
  berries:          { key: "berries",          name: "Berries",           emoji: "🫐", source: "crops",       category: "crops",   base: 500 },
  tomatoes:         { key: "tomatoes",         name: "Tomatoes",          emoji: "🍅", source: "crops",       category: "crops",   base: 250 },
  bread:            { key: "bread",            name: "Bread",             emoji: "🍞", source: "artisan",     category: "artisan", base: 25,  stretch: "kitchen_crop:wheat" },
  jam:              { key: "jam",              name: "Jam",               emoji: "🍯", source: "artisan",     category: "artisan", base: 15,  stretch: "kitchen_crop:berries" },
  sauce:            { key: "sauce",            name: "Sauce",             emoji: "🥫", source: "artisan",     category: "artisan", base: 10,  stretch: "kitchen_crop:tomatoes" },
  egg:              { key: "egg",              name: "Eggs",              emoji: "🥚", source: "animalGoods", category: "animal",  base: 60,  stretch: "barn_idle:chicken_coop" },
  milk:             { key: "milk",             name: "Milk",              emoji: "🥛", source: "animalGoods", category: "animal",  base: 30,  stretch: "barn_idle:dairy" },
  wool:             { key: "wool",             name: "Wool",              emoji: "🧶", source: "animalGoods", category: "animal",  base: 20,  stretch: "barn_idle:wool_shed" },
  omelette:         { key: "omelette",         name: "Omelettes",         emoji: "🍳", source: "animalGoods", category: "animal",  base: 10,  stretch: "kitchen_input:egg" },
  cheese:           { key: "cheese",           name: "Cheese",            emoji: "🧀", source: "animalGoods", category: "animal",  base: 8,   stretch: "kitchen_input:milk" },
  knitted_goods:    { key: "knitted_goods",    name: "Knitted Goods",     emoji: "🧥", source: "animalGoods", category: "animal",  base: 6,   stretch: "kitchen_input:wool" },
  fish_pie:         { key: "fish_pie",         name: "Fish Pie",          emoji: "🥧", source: "animalGoods", category: "fish",    base: 6,   stretch: "kitchen_input:bass" },
  smoked_fish:      { key: "smoked_fish",      name: "Smoked Fish",       emoji: "🐟", source: "animalGoods", category: "fish",    base: 5,   stretch: "kitchen_input:perch" },
  minnow:           { key: "minnow",           name: "Minnows",           emoji: "🎣", source: "fish",        category: "fish",    base: 60,  stretch: "water_idle:pond" },
  bass:             { key: "bass",             name: "Bass",              emoji: "🐠", source: "fish",        category: "fish",    base: 30,  stretch: "water_idle:pond" },
  perch:            { key: "perch",            name: "Perch",             emoji: "🐡", source: "fish",        category: "fish",    base: 20,  stretch: "water_idle:lake" },
  rare:             { key: "rare",             name: "Rare Fish",         emoji: "✨", source: "fish",        category: "fish",    base: 4 },
  iron_fitting:     { key: "iron_fitting",     name: "Iron Fittings",     emoji: "🔩", source: "component",   category: "forge",   base: 5,   stretch: "forge_idle" },
  reinforced_crate: { key: "reinforced_crate", name: "Reinforced Crates", emoji: "📦", source: "component",   category: "forge",   base: 5,   stretch: "forge_idle" },
  fine_tools:       { key: "fine_tools",       name: "Fine Tools",        emoji: "🛠️", source: "component",   category: "forge",   base: 4,   stretch: "forge_idle" },
  iron_ore:         { key: "iron_ore",         name: "Iron Ore",          emoji: "🪨", source: "world",       category: "forge",   base: 150 },
  lumber:           { key: "lumber",           name: "Lumber",            emoji: "🪵", source: "world",       category: "forge",   base: 150 },
  rare_gem:         { key: "rare_gem",         name: "Rare Gems",         emoji: "💎", source: "world",       category: "forge",   base: 3 },
};

// World resources measured from your actual gains (heroes, expeditions, trade routes)
export const CONTRACT_WORLD_KEYS = ["iron_ore", "lumber", "rare_gem"];

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

// ─── Contract quests ──────────────────────────────────────────────────────────
// Added to SEASONAL_QUESTS as EXTRA options — requiredCount is unchanged, so each season
// you can do contracts instead of one of the slower "wait for it" quests.
// Counters live in questProgress (reset every season by beginPrestige) and are bumped in
// deliverContract: contractsCompleted, contractsStandardPlus, contractsRush, contractsStretch.
// Kept here instead of gameConstants.js (CRLF) — merged in once when this module loads.

const cq = (key, value) => ({ type: "counter", key, value });
const and = (...conditions) => ({ type: "and", conditions });

export const CONTRACT_QUESTS = {
  4:  { id: "s4_contract",  emoji: "📜", title: "First Order",       description: "Deliver 1 contract",                                    condition: cq("contractsCompleted", 1) },
  5:  { id: "s5_contract",  emoji: "📜", title: "Supplier",          description: "Deliver 2 contracts",                                   condition: cq("contractsCompleted", 2) },
  6:  { id: "s6_contract",  emoji: "📜", title: "Steady Supplier",   description: "Deliver 3 contracts",                                   condition: cq("contractsCompleted", 3) },
  7:  { id: "s7_contract",  emoji: "🟡", title: "Big Order",         description: "Deliver a Standard or Rush contract",                   condition: cq("contractsStandardPlus", 1) },
  8:  { id: "s8_contract",  emoji: "🔴", title: "Rush Job",          description: "Deliver a Rush contract",                               condition: cq("contractsRush", 1) },
  9:  { id: "s9_contract",  emoji: "📜", title: "Reliable",          description: "Deliver 5 contracts",                                   condition: cq("contractsCompleted", 5) },
  10: { id: "s10_contract", emoji: "🧭", title: "Stretch Goal",      description: "Deliver a Stretch contract",                            condition: cq("contractsStretch", 1) },
  11: { id: "s11_contract", emoji: "📜", title: "Trusted Supplier",  description: "Deliver 6 contracts, including 1 Rush",                  condition: and(cq("contractsCompleted", 6), cq("contractsRush", 1)) },
  12: { id: "s12_contract", emoji: "📜", title: "Order Book",        description: "Deliver 8 contracts",                                   condition: cq("contractsCompleted", 8) },
  13: { id: "s13_contract", emoji: "🔴", title: "Under Pressure",    description: "Deliver 8 contracts, including 2 Rush",                 condition: and(cq("contractsCompleted", 8), cq("contractsRush", 2)) },
  14: { id: "s14_contract", emoji: "🧭", title: "Branching Out",     description: "Deliver 6 contracts, including 1 Stretch",              condition: and(cq("contractsCompleted", 6), cq("contractsStretch", 1)) },
  15: { id: "s15_contract", emoji: "📜", title: "Trade Partner",     description: "Deliver 10 contracts, including 2 Rush",                condition: and(cq("contractsCompleted", 10), cq("contractsRush", 2)) },
  16: { id: "s16_contract", emoji: "📜", title: "Regional Supplier", description: "Deliver 12 contracts",                                  condition: cq("contractsCompleted", 12) },
  17: { id: "s17_contract", emoji: "🔴", title: "Crunch Time",       description: "Deliver 12 contracts, including 3 Rush",                condition: and(cq("contractsCompleted", 12), cq("contractsRush", 3)) },
  18: { id: "s18_contract", emoji: "📜", title: "Merchant Prince",   description: "Deliver 15 contracts",                                  condition: cq("contractsCompleted", 15) },
  19: { id: "s19_contract", emoji: "🔴", title: "Never Late",        description: "Deliver 15 contracts, including 3 Rush",                condition: and(cq("contractsCompleted", 15), cq("contractsRush", 3)) },
  20: { id: "s20_contract", emoji: "👑", title: "Kingdom's Supplier", description: "Deliver 20 contracts, including 4 Rush",               condition: and(cq("contractsCompleted", 20), cq("contractsRush", 4)) },
};

(function mergeContractQuests() {
  for (const [season, quest] of Object.entries(CONTRACT_QUESTS)) {
    const data = SEASONAL_QUESTS?.[season];
    if (!data?.quests) continue;
    if (!data.quests.some((q) => q.id === quest.id)) data.quests.push(quest);
  }
})();