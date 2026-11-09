// src/Pages/rootwork/engine/modifiersData.js — Season modifiers
// Kept out of gameConstants.js (CRLF) on purpose. Tune numbers here.
//
// After each prestige (from Season MODIFIER_FIRST_SEASON on) the game rolls MODIFIER_CHOICE_COUNT
// modifiers and the player picks one. It lasts the whole season.
//
// `effects` are read through engine/bonuses.js → getGlobalBonus(state, key). Values are ADDITIVE
// fractions unless noted:
//   growTime            +0.30 = crops take 30% longer to grow, -0.20 = 20% less time   (tick.js)
//   fishingSpeed        fishing worker speed                                           (tick.js)
//   rareFish            +1.0 = roughly double rare fish odds for workers               (tick.js)
//   cropYield           harvest yield                                                  (actions.js)
//   sellPrice           market worker sale price                                       (tick.js)
//   marketSpeed         market worker items/sec                                        (tick.js)
//   forgeSpeed          +1.0 = forge crafts 2× as fast                                 (tick.js)
//   workerSpeed         every worker that runs on satisfaction (farm, kitchen, barn, fishing, forge…) (tick.js)
//   foodCost            +1.0 = town eats twice the food each pulse                     (tick.js)
//   animalMoodDrain     +1.0 = animal mood drains twice as fast                        (tick.js)
//   satCap              FLAT satisfaction points added to target + ceiling            (core.js, town.js)
//   heroXp              all hero XP                                                    (heroes/roads/dungeon/boss)
//   missionDamage       damage heroes take on zone missions                            (heroes.js)
//   contractRefillSpeed +1.0 = empty contract slots refill twice as fast               (contracts.js)
//   contractSeals       FLAT extra seals per delivered contract                        (contracts.js)

export const MODIFIER_FIRST_SEASON = 4;
export const MODIFIER_CHOICE_COUNT = 3;
export const MODIFIER_REROLL_COST = 8; // seals

export const SEASON_MODIFIERS = {
  drought: {
    id: "drought", name: "Drought", emoji: "🌵",
    upside: "Fishing workers +50% speed",
    downside: "Crops take 30% longer to grow",
    effects: { fishingSpeed: 0.5, growTime: 0.3 },
  },
  monsoon: {
    id: "monsoon", name: "Monsoon", emoji: "🌧️",
    upside: "Crops grow 25% faster",
    downside: "Animal mood drains 2× as fast",
    effects: { growTime: -0.2, animalMoodDrain: 1.0 },
  },
  iron_rush: {
    id: "iron_rush", name: "Iron Rush", emoji: "⛏️",
    upside: "Forge crafts 2× as fast",
    downside: "Market sell prices −20%",
    effects: { forgeSpeed: 1.0, sellPrice: -0.2 },
  },
  festival: {
    id: "festival", name: "Festival", emoji: "🎪",
    upside: "+25 satisfaction cap · sell prices +15%",
    downside: "The town eats 2× food",
    effects: { satCap: 25, sellPrice: 0.15, foodCost: 1.0 },
  },
  spawning_run: {
    id: "spawning_run", name: "Spawning Run", emoji: "🐟",
    upside: "Rare fish odds ×2 for fishing workers",
    downside: "Crop yield −20%",
    effects: { rareFish: 1.0, cropYield: -0.2 },
  },
  monster_season: {
    id: "monster_season", name: "Monster Season", emoji: "🛡️",
    upside: "All hero XP +50%",
    downside: "Heroes take 30% more mission damage",
    effects: { heroXp: 0.5, missionDamage: 0.3 },
  },
  merchant_fair: {
    id: "merchant_fair", name: "Merchant Fair", emoji: "📜",
    upside: "Contracts refill 2× faster · +1 seal per contract",
    downside: "Market workers sell 30% slower",
    effects: { contractRefillSpeed: 1.0, contractSeals: 1, marketSpeed: -0.3 },
  },
  long_winter: {
    id: "long_winter", name: "Long Winter", emoji: "❄️",
    upside: "+1 prestige point right now",
    downside: "All workers −20% speed",
    effects: { workerSpeed: -0.2 },
    hard: true,
    bonusPrestigePoints: 1,
  },
};

export const SEASON_MODIFIER_ORDER = [
  "drought", "monsoon", "iron_rush", "festival", "spawning_run", "monster_season", "merchant_fair", "long_winter",
];