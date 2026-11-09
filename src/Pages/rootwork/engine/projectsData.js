// src/Pages/rootwork/engine/projectsData.js — Town Projects definitions
// Kept out of gameConstants.js (CRLF) on purpose. Tune numbers here.
//
// Each project has unlimited stages. Stage N (0-indexed) costs base × PROJECT_STAGE_COST_GROWTH^N.
// Every completed stage adds bonusPerStage to its bonus key (read through engine/bonuses.js).
// Deposits are partial — progress is saved, so warehouse caps never block a stage.
//
// Input "source" says where the item lives in state:
//   crops        → state.crops
//   artisan      → state.artisan          (bread, jam, sauce)
//   animalGoods  → state.animalGoods      (cheese, omelette, knitted_goods…)
//   fish         → state.fishing.fish     (bass, perch, rare)
//   component    → state.worldResources first, then state.forgeGoods (fittings/crates/tools can be in either)
//   world        → state.worldResources   (rare_gem, titan_core)

export const PROJECT_STAGE_COST_GROWTH = 1.5;

export const PROJECTS = {
  granary: {
    id: "granary",
    name: "Granary",
    emoji: "🌾",
    flavor: "Silos the size of hills. The farms never go hungry again.",
    unlockText: "Unlocks with your tomato farm (Season 3)",
    bonusKey: "cropYield",
    bonusPerStage: 0.03,
    bonusLabel: "crop yield",
    inputs: [
      { key: "wheat",        source: "crops",     base: 4000, name: "Wheat",        emoji: "🌾" },
      { key: "berries",      source: "crops",     base: 2000, name: "Berries",      emoji: "🫐" },
      { key: "tomatoes",     source: "crops",     base: 1000, name: "Tomatoes",     emoji: "🍅" },
      { key: "iron_fitting", source: "component", base: 10,   name: "Iron Fittings", emoji: "🔩" },
    ],
  },
  lighthouse: {
    id: "lighthouse",
    name: "Lighthouse",
    emoji: "🏮",
    flavor: "A beacon on the far shore. Every boat comes home full.",
    unlockText: "Unlocks when you open the Lake",
    bonusKey: "fishingSpeed",
    bonusPerStage: 0.04,
    bonusLabel: "fishing speed",
    inputs: [
      { key: "bass",       source: "fish",      base: 150, name: "Bass",       emoji: "🐠" },
      { key: "perch",      source: "fish",      base: 100, name: "Perch",      emoji: "🐡" },
      { key: "rare",       source: "fish",      base: 10,  name: "Rare Fish",  emoji: "✨" },
      { key: "fine_tools", source: "component", base: 8,   name: "Fine Tools", emoji: "🛠️" },
    ],
  },
  grand_hall: {
    id: "grand_hall",
    name: "Grand Hall",
    emoji: "🏛️",
    flavor: "Merchants travel for days just to trade under its roof.",
    unlockText: "Unlocks when you build the Dairy",
    bonusKey: "sellPrice",
    bonusPerStage: 0.02,
    bonusLabel: "market sell prices",
    inputs: [
      { key: "bread",            source: "artisan",     base: 100, name: "Bread",             emoji: "🍞" },
      { key: "jam",              source: "artisan",     base: 60,  name: "Jam",               emoji: "🍯" },
      { key: "sauce",            source: "artisan",     base: 40,  name: "Sauce",             emoji: "🥫" },
      { key: "cheese",           source: "animalGoods", base: 20,  name: "Cheese",            emoji: "🧀" },
      { key: "reinforced_crate", source: "component",   base: 10,  name: "Reinforced Crates", emoji: "📦" },
    ],
  },
  monument: {
    id: "monument",
    name: "Hero's Monument",
    emoji: "🗿",
    flavor: "Carved from the bones of the first titan. Heroes train harder in its shadow.",
    unlockText: "Unlocks after your first boss kill",
    bonusKey: "heroXp",
    bonusPerStage: 0.05,
    bonusLabel: "hero mission XP",
    inputs: [
      { key: "iron_fitting",     source: "component", base: 10, name: "Iron Fittings",     emoji: "🔩" },
      { key: "reinforced_crate", source: "component", base: 10, name: "Reinforced Crates", emoji: "📦" },
      { key: "fine_tools",       source: "component", base: 10, name: "Fine Tools",        emoji: "🛠️" },
      { key: "rare_gem",         source: "world",     base: 5,  name: "Rare Gems",         emoji: "💎" },
      { key: "titan_core",       source: "world",     base: 1,  name: "Titan Core",        emoji: "💠" },
    ],
  },
};

export const PROJECT_ORDER = ["granary", "lighthouse", "grand_hall", "monument"];