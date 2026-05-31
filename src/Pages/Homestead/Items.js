// src/Pages/Homestead/items.js
// ─────────────────────────────────────────────────────────────────────────────
// THE SINGLE ITEM REGISTRY
// Every item in the game is defined here exactly once.  All other systems
// (crafting, inventory, hotbar, shop, farming, rendering) read from this file.
//
// Adding a new item = adding one entry to ITEMS below.  Nothing else changes.
//
// FIELD REFERENCE:
//   icon         — emoji shown everywhere (required)
//   label        — human-readable name (required)
//   category     — "resource" | "tool" | "seed" | "crop" | "food" | "gear" | "placeable" | "upgrade"
//   stackable    — true if multiple can stack in one inventory/hotbar slot
//   description  — short flavour text shown in UI
//
//   // Crafting
//   craftRecipe   — { [ingredientId]: qty }  →  craftable BY HAND anywhere (no station needed)
//   stationRecipe — { [ingredientId]: qty }  →  craftable at the Crafting Station
//   craftStation  — "fire_pit"|"furnace"|"anvil"|"potion_stand"  →  requires specific station
//
//   // Equipment (weapon / armor / accessory slot)
//   equipSlot    — "weapon" | "armor" | "accessory"
//   equipStats   — { attackBonus, attackRange, defense, maxHpBonus,
//                    herbBonus, stoneYield, woodYield,
//                    canFish, canHoe, canChop, canMine, canWater }
//
//   // Hotbar / consumable
//   useEffect    — { heal: n }  →  item can be used from the hotbar
//
//   // Upgrades (consumed on use to expand inventory/hotbar)
//   upgradeEffect — { inventorySlots: n } | { hotbarSlots: n }
//
//   // Shop (Tiny Town market)
//   buyPrice     — gold to purchase
//   sellPrice    — gold earned when sold
//
//   // Farming seeds
//   growthDays   — in-game days to fully grow (advances on sleep)
//   growthStages — visual stages to show while growing
//   harvestYields— [{ item, min, max }]
//
//   // Placeable decoration
//   placeSize    — [w, h] in tiles
//   placeSolid   — blocks movement
//   placeInteract— shows [F] prompt
//   placeLabel   — "[F] ..." interact string
// ─────────────────────────────────────────────────────────────────────────────

import { drawCraftingStation, drawFirePit, drawFurnace, drawHoe, drawAxe, drawPickaxe, drawFishingRod, drawWateringCan,
  drawIronHoe, drawIronAxe, drawIronPickaxe, drawIronSword, drawHammer, } from "./drawArt";

export const ITEMS = {

  // ── Currency ─────────────────────────────────────────────────────────────────
  gold: {
    icon: "🪙", label: "Gold", category: "resource", stackable: true,
    description: "The town's currency. Spend it at the market.",
  },

  // ── Raw resources ─────────────────────────────────────────────────────────────
  wood: {
    icon: "🪵", label: "Wood", category: "resource", stackable: true,
    description: "Chopped from trees. Essential for building.",
    sellPrice: 2,
  },
  stone: {
    icon: "🪨", label: "Stone", category: "resource", stackable: true,
    description: "Mined from rock outcrops.",
    sellPrice: 2,
  },
  sticks: {
    icon: "🪹", label: "Sticks", category: "resource", stackable: true,
    description: "Found on the ground or snapped from branches.",
    sellPrice: 1,
  },
  herbs: {
    icon: "🌿", label: "Herbs", category: "resource", stackable: true,
    description: "Wild plants useful in potions and cooking.",
    sellPrice: 3,
  },
  leather: {
    icon: "🦴", label: "Leather", category: "resource", stackable: true,
    description: "Dropped by forest creatures.",
    sellPrice: 4,
  },
  meat: {
    icon: "🥩", label: "Meat", category: "resource", stackable: true,
    description: "Raw meat. Cook before eating.",
    sellPrice: 3,
  },
  silk: {
    icon: "🕸", label: "Silk", category: "resource", stackable: true,
    description: "Spun by giant spiders. Surprisingly useful.",
    sellPrice: 5,
  },
  coal: {
    icon: "🖤", label: "Coal", category: "resource", stackable: true,
    description: "Dark ore. Burns hot.",
    sellPrice: 3,
  },
  gems: {
    icon: "💎", label: "Gems", category: "resource", stackable: true,
    description: "Rare and valuable.",
    sellPrice: 15,
  },
  crystal: {
    icon: "🔮", label: "Crystal", category: "resource", stackable: true,
    description: "Magical mineral. Powerful in the right hands.",
    sellPrice: 12,
  },

  iron_ore: {
    icon: "🟫", label: "Iron Ore", category: "resource", stackable: true,
    description: "Raw ore from deep rock. Smelt it in a Furnace.",
    sellPrice: 4,
  },
  iron_ingot: {
    icon: "🔩", label: "Iron Ingot", category: "resource", stackable: true,
    description: "Smelted iron. Used to forge Tier 2 tools.",
    sellPrice: 8,
    stationRecipe: { iron_ore: 2, coal: 1 },
    craftStation: "furnace",
  },

  // ── Food / foraged ────────────────────────────────────────────────────────────
  apples: {
    icon: "🍎", label: "Apples", category: "food", stackable: true,
    description: "Fresh from the orchard.",
    useEffect: { heal: 1 }, sellPrice: 2,
  },
  berries: {
    icon: "🫐", label: "Berries", category: "food", stackable: true,
    description: "Sweet wild berries.",
    useEffect: { heal: 1 }, sellPrice: 2,
  },
  mushrooms: {
    icon: "🍄", label: "Mushrooms", category: "food", stackable: true,
    description: "Earthy forest mushrooms.",
    useEffect: { heal: 1 }, sellPrice: 2,
  },
  fish: {
    icon: "🐟", label: "Fish", category: "food", stackable: true,
    description: "Common catch from the lake.",
    useEffect: { heal: 1 }, sellPrice: 3,
  },
  big_fish: {
    icon: "🐠", label: "Big Fish", category: "food", stackable: true,
    description: "A fine catch.",
    useEffect: { heal: 2 }, sellPrice: 6,
  },
  rare_fish: {
    icon: "🐡", label: "Rare Fish", category: "food", stackable: true,
    description: "Beautiful and delicious.",
    useEffect: { heal: 3 }, sellPrice: 12,
  },
  cooked_meat: {
    icon: "🍖", label: "Cooked Meat", category: "food", stackable: true,
    description: "Roasted over the fire. Hearty.",
    useEffect: { heal: 3 }, sellPrice: 6,
    stationRecipe: { meat: 1 },
    craftStation: "fire_pit",
  },
  // ── Foraged Food Goods (hand-craftable from FruitRun pickups) ────────────────
  //
  // Simple tier — any 2 of the same foraged ingredient → "Trail Snack"
  // They all craft into the SAME item so they stack together in inventory.
  //   2× mushrooms  → trail_snack (+3 hp)
  //   2× berries    → trail_snack (+3 hp)
  //   2× apples     → trail_snack (+3 hp)
  //   2× herbs      → trail_snack (+3 hp)
  //
  // Hand-craftable anywhere — no station required.
  // The primary recipe (mushrooms) lives in craftRecipe; the three alternates
  // live in MULTI_HAND_RECIPES so they all show up in the hand-craft UI.

  trail_snack: {
    icon: "🍡", label: "Trail Snack", category: "food", stackable: true,
    description: "A quick bite made from whatever the forest offers. Restores a bit of health.",
    useEffect: { heal: 3 }, sellPrice: 5,
    // Primary recipe shown in UI — 2 mushrooms (hand-craftable, no station needed)
    craftRecipe: { mushrooms: 2 },
  },

  // ── Mixed food goods — 2-ingredient combos (+4 hp) ────────────────────────────
  fruit_salad: {
    icon: "🍓", label: "Fruit Salad", category: "food", stackable: true,
    description: "Apples and berries tossed together. Refreshing.",
    useEffect: { heal: 4 }, sellPrice: 8,
    stationRecipe: { apples: 2, berries: 2 },
    craftStation: "fire_pit",
    unlockedByNpc: "haas",   // Haas teaches these comforting mixed recipes
  },
  herb_tea: {
    icon: "🍵", label: "Herb Tea", category: "food", stackable: true,
    description: "Steeped wild herbs. Soothing and restorative.",
    useEffect: { heal: 4 }, sellPrice: 8,
    stationRecipe: { herbs: 2, mushrooms: 2 },
    craftStation: "fire_pit",
    unlockedByNpc: "haas",
  },
  mushroom_skewer: {
    icon: "🍢", label: "Mushroom Skewer", category: "food", stackable: true,
    description: "Grilled mushrooms on a stick. Earthy and filling.",
    useEffect: { heal: 4 }, sellPrice: 8,
    stationRecipe: { mushrooms: 2, meat: 1 },
    craftStation: "fire_pit",
    unlockedByNpc: "haas",
  },
  berry_jam: {
    icon: "🫙", label: "Berry Jam", category: "food", stackable: true,
    description: "Wild berries cooked down into a thick jam.",
    useEffect: { heal: 4 }, sellPrice: 8,
    stationRecipe: { berries: 3, apples: 1 },
    craftStation: "fire_pit",
    unlockedByNpc: "haas",
  },
  herb_roast: {
    icon: "🌿", label: "Herb Roast", category: "food", stackable: true,
    description: "Meat rubbed with wild herbs and roasted slowly.",
    useEffect: { heal: 4 }, sellPrice: 9,
    stationRecipe: { meat: 1, herbs: 2 },
    craftStation: "fire_pit",
    unlockedByNpc: "haas",
  },

  // ── Mixed food goods — 3-ingredient combos (+7 hp) ────────────────────────────
  forest_stew: {
    icon: "🍲", label: "Forest Stew", category: "food", stackable: true,
    description: "Mushrooms, berries, and meat slow-cooked into a hearty stew.",
    useEffect: { heal: 7 }, sellPrice: 18,
    stationRecipe: { mushrooms: 2, berries: 2, meat: 2 },
    craftStation: "fire_pit",
    unlockedByNpc: "clem",   // Clem teaches the hearty 3-ingredient meals
  },
  wild_broth: {
    icon: "🥣", label: "Wild Broth", category: "food", stackable: true,
    description: "Apples, herbs, and mushrooms simmered together. Deeply nourishing.",
    useEffect: { heal: 7 }, sellPrice: 18,
    stationRecipe: { apples: 2, herbs: 3, mushrooms: 2 },
    craftStation: "fire_pit",
    unlockedByNpc: "clem",
  },
  hunters_feast: {
    icon: "🍗", label: "Hunter's Feast", category: "food", stackable: true,
    description: "Meat roasted with berries and herbs. A meal worth coming home for.",
    useEffect: { heal: 7 }, sellPrice: 20,
    stationRecipe: { meat: 3, berries: 2, herbs: 2 },
    craftStation: "fire_pit",
    unlockedByNpc: "clem",
  },
  orchard_medley: {
    icon: "🧺", label: "Orchard Medley", category: "food", stackable: true,
    description: "Apples, berries, and mushrooms — a forager's pride.",
    useEffect: { heal: 7 }, sellPrice: 18,
    stationRecipe: { apples: 2, berries: 2, mushrooms: 2 },
    craftStation: "fire_pit",
  },

  healing_potion: {
    icon: "🧪", label: "Healing Potion", category: "food", stackable: true,
    description: "Brewed from herbs. Restores health on use.",
    useEffect: { heal: 5 }, sellPrice: 14,
    stationRecipe: { herbs: 3, cooked_meat: 1 },
    craftStation: "potion_stand",
    unlockedByNpc: "elda",   // Elda teaches potion brewing once she arrives
  },
  strength_potion: {
    icon: "⚗️", label: "Strength Potion", category: "food", stackable: true,
    description: "Brewed from rare herbs and crystals. Boosts attack.",
    useEffect: { heal: 2, strengthDuration: 15 }, sellPrice: 20,
    stationRecipe: { herbs: 4, crystal: 1 },
    craftStation: "potion_stand",
    unlockedByNpc: "elda",
  },

  // ── Crops (grown from seeds) ──────────────────────────────────────────────────
  carrot: {
    icon: "🥕", label: "Carrot", category: "crop", stackable: true,
    description: "Crunchy and sweet.",
    useEffect: { heal: 1 }, sellPrice: 5,
  },
  potato: {
    icon: "🥔", label: "Potato", category: "crop", stackable: true,
    description: "Filling and versatile.",
    useEffect: { heal: 2 }, sellPrice: 6,
  },
  pumpkin: {
    icon: "🎃", label: "Pumpkin", category: "crop", stackable: true,
    description: "Big and orange. Worth good coin.",
    useEffect: { heal: 3 }, sellPrice: 18,
  },

  // ── Seeds (bought from market, planted in tilled soil) ────────────────────────
  carrot_seed: {
    icon: "🫘", label: "Carrot Seeds", category: "seed", stackable: true,
    description: "Plant in tilled soil. Grows quickly.",
    buyPrice: 10,
    growthDays: 2, growthStages: 3,
    harvestYields: [{ item: "carrot", min: 2, max: 4 }],
    // Always available — no NPC required
  },
  potato_seed: {
    icon: "🫘", label: "Potato Seeds", category: "seed", stackable: true,
    description: "Hearty underground crop.",
    buyPrice: 12,
    growthDays: 3, growthStages: 3,
    harvestYields: [{ item: "potato", min: 2, max: 5 }],
    // Always available — no NPC required
  },
  herb_seed: {
    icon: "🌱", label: "Herb Seeds", category: "seed", stackable: true,
    description: "Grows wild herbs. Useful in potions.",
    buyPrice: 8,
    growthDays: 2, growthStages: 3,
    harvestYields: [{ item: "herbs", min: 2, max: 4 }],
    unlockedByNpc: "elda",   // Elda stocks herb seeds once she arrives
  },
  pumpkin_seed: {
    icon: "🌱", label: "Pumpkin Seeds", category: "seed", stackable: true,
    description: "A big slow-growing crop. Sells well.",
    buyPrice: 20,
    growthDays: 4, growthStages: 4,
    harvestYields: [{ item: "pumpkin", min: 1, max: 2 }],
    unlockedByNpc: "sable",  // Sable brings pumpkin seeds once she arrives
  },

  // ── Tier 1 Tools / Weapons (stone) ───────────────────────────────────────────
  hoe: {
    icon: "⚒️", label: "Hoe", category: "tool", stackable: false,
    description: "Tills grass into farm soil. Essential for growing crops.",
    craftRecipe: { sticks: 2, stone: 2 },
    equipSlot: "weapon",
    equipStats: { canHoe: true },
    maxDurability: 50,
    draw: drawHoe
  },
  axe: {
    icon: "🪓", label: "Axe", category: "tool", stackable: false,
    description: "Chops trees for wood. Also effective in a fight.",
    craftRecipe: { sticks: 2, stone: 3 },
    equipSlot: "weapon",
    equipStats: { attackBonus: 2, attackRange: 12, canChop: true },
    maxDurability: 50,
    draw: drawAxe
  },
  pickaxe: {
    icon: "⛏️", label: "Pickaxe", category: "tool", stackable: false,
    description: "Mines ore nodes.",
    craftRecipe: { sticks: 2, stone: 4 },
    equipSlot: "weapon",
    equipStats: { attackBonus: 1, stoneYield: 2, canMine: true },
    maxDurability: 50,
    draw: drawPickaxe
  },
  fishing_rod: {
    icon: "🎣", label: "Fishing Rod", category: "tool", stackable: false,
    description: "Required to fish at any fishing spot.",
    stationRecipe: { sticks: 3, silk: 2 },
    equipSlot: "weapon",
    equipStats: { canFish: true },
    maxDurability: 50,
    draw: drawFishingRod,
    unlockedByNpc: "finn",   // Finn teaches rod-making once he arrives
  },
  watering_can: {
    icon: "🪣", label: "Watering Can", category: "tool", stackable: false,
    description: "Waters planted crops to speed up growth.",
    buyPrice: 25,
    equipSlot: "weapon",
    equipStats: { canWater: true },
    maxDurability: 50,
    draw: drawWateringCan,
    unlockedByNpc: "maren",   // Maren stocks the watering can at her market stall
  },

  // ── Tier 2 Tools / Weapons (iron) ────────────────────────────────────────────
  iron_hoe: {
    icon: "⚒️", label: "Iron Hoe", category: "tool", stackable: false,
    description: "A sturdy iron hoe. Tills faster and lasts longer.",
    stationRecipe: { iron_ingot: 2, sticks: 2 },
    craftStation: "anvil",
    equipSlot: "weapon",
    equipStats: { canHoe: true, attackBonus: 1 },
    maxDurability: 100,
    draw: drawIronHoe,
    unlockedByNpc: "petra",   // Petra unlocks iron forging at the anvil
  },
  iron_axe: {
    icon: "🪓", label: "Iron Axe", category: "tool", stackable: false,
    description: "Heavy iron axe. More wood per chop.",
    stationRecipe: { iron_ingot: 3, sticks: 2 },
    craftStation: "anvil",
    equipSlot: "weapon",
    equipStats: { attackBonus: 4, attackRange: 14, canChop: true, woodYield: 2 },
    maxDurability: 100,
    draw: drawIronAxe,
    unlockedByNpc: "petra",
  },
  iron_pickaxe: {
    icon: "⛏️", label: "Iron Pickaxe", category: "tool", stackable: false,
    description: "Forged iron. Mines faster and yields more ore.",
    stationRecipe: { iron_ingot: 3, sticks: 2 },
    craftStation: "anvil",
    equipSlot: "weapon",
    equipStats: { attackBonus: 3, stoneYield: 4, canMine: true },
    maxDurability: 100,
    draw: drawIronPickaxe,
    unlockedByNpc: "petra",
  },
  iron_sword: {
    icon: "⚔️", label: "Iron Sword", category: "tool", stackable: false,
    description: "A proper blade. High attack and reach.",
    stationRecipe: { iron_ingot: 4, sticks: 1 },
    craftStation: "anvil",
    equipSlot: "weapon",
    equipStats: { attackBonus: 6, attackRange: 16 },
    maxDurability: 100,
    draw: drawIronSword,
    unlockedByNpc: "petra",
  },

  // ── Boss Loot ─────────────────────────────────────────────────────────────────
  goblin_crown: {
    icon: "👑", label: "Goblin Crown", category: "gear", stackable: false,
    description: "Stolen from the Goblin King himself. A trophy of your victory.",
    sellPrice: 80,
    equipSlot: "accessory",
    equipStats: {},  // cosmetic only — no stats
  },

  // ── Armor / Accessories ───────────────────────────────────────────────────────
  leather_armor: {
    icon: "🛡️", label: "Leather Armor", category: "gear", stackable: false,
    description: "Sturdy hide armor.",
    stationRecipe: { leather: 6 },
    equipSlot: "armor",
    equipStats: { defense: 1, maxHpBonus: 2 },
    unlockedByNpc: "bex",    // Bex brings crafting know-how for armor and accessories
  },
  potion_satchel: {
    icon: "🧳", label: "Potion Satchel", category: "gear", stackable: false,
    description: "Boosts herb gathering on runs.",
    stationRecipe: { wood: 6, herbs: 4, stone: 2 },
    equipSlot: "accessory",
    equipStats: { herbBonus: 2 },
    unlockedByNpc: "bex",
  },

  // ── Inventory & Hotbar Upgrades ───────────────────────────────────────────────
  // These are consumed on use (or auto-applied when crafted) to expand the
  // player's personal inventory slots or visible hotbar size.
  traveler_pouch: {
    icon: "👜", label: "Traveler's Pouch", category: "upgrade", stackable: false,
    description: "+4 inventory slots. Craft one to carry more home from runs.",
    upgradeEffect: { inventorySlots: 4 },
    stationRecipe: { leather: 3, sticks: 2 },
    craftStation: "crafting_station",
  },
  explorer_pack: {
    icon: "🎒", label: "Explorer's Pack", category: "upgrade", stackable: false,
    description: "+8 inventory slots. A proper adventurer's backpack.",
    stationRecipe: { leather: 8, silk: 2, wood: 3 },
    craftStation: "crafting_station",
    upgradeEffect: { inventorySlots: 8 },
    unlockedByNpc: "rowan",   // Rowan's knowledge reveals advanced packing techniques
  },
  belt_pouch: {
    icon: "🪢", label: "Belt Pouch", category: "upgrade", stackable: false,
    description: "+1 hotbar slot. Hang it on your belt for quick access.",
    stationRecipe: { leather: 2, sticks: 1 },
    craftStation: "crafting_station",
    upgradeEffect: { hotbarSlots: 1 },
  },
  tool_belt: {
    icon: "🔧", label: "Tool Belt", category: "upgrade", stackable: false,
    description: "+2 hotbar slots. A proper craftsperson's tool belt.",
    stationRecipe: { leather: 5, iron_ingot: 1 },
    craftStation: "crafting_station",   
    upgradeEffect: { hotbarSlots: 2 },
    unlockedByNpc: "rowan",
  },

  // ── Crafting Stations ─────────────────────────────────────────────────────────
  crafting_station: {
    icon: "🔨", label: "Crafting Station", category: "placeable", stackable: true,
    description: "A workbench. Build it by hand from sticks and stones. Unlocks all other recipes.",
    // Hand-craftable — only requires what you can pick up before any tools exist
    craftRecipe: { sticks: 4, stone: 2 },
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Craft",
    draw: drawCraftingStation,
  },
  fire_pit: {
    icon: "🔥", label: "Fire Pit", category: "placeable", stackable: true,
    description: "Cook raw food over an open flame.",
    stationRecipe: { stone: 6, wood: 3 },
    craftStation: "crafting_station",
    placeSize: [2, 2], placeSolid: false, placeInteract: true, placeLabel: "[F] Cook",
    draw: drawFirePit,
  },
  furnace: {
    icon: "🏭", label: "Furnace", category: "placeable", stackable: true,
    description: "Smelt iron ore into ingots using coal.",
    stationRecipe: { stone: 12, coal: 4 },
    craftStation: "crafting_station",
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Smelt",
    draw: drawFurnace,
  },
  anvil: {
    icon: "⚙️", label: "Anvil", category: "placeable", stackable: true,
    description: "Forge iron ingots into Tier 2 tools and weapons.",
    stationRecipe: { iron_ingot: 8, stone: 6 },
    craftStation: "crafting_station",
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Forge",
  },
  potion_stand: {
    icon: "⚗️", label: "Potion Stand", category: "placeable", stackable: true,
    description: "Brew potions from herbs and roasted food.",
    stationRecipe: { wood: 6, herbs: 4, stone: 2 },
    craftStation: "crafting_station",
    placeSize: [1, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Brew",
  },

  // ── Builder's Table ───────────────────────────────────────────────────────────
  // The dedicated town-building crafting station.
  // Craftable at the Crafting Station. All town structures are built here.
  builders_table: {
    icon: "📐", label: "Builder's Table", category: "placeable", stackable: true,
    description: "A planning table for constructing town buildings. Required to build homes, the treasury, and everything that makes a real community.",
    stationRecipe: { wood: 10, stone: 6, sticks: 4 },
    craftStation: "crafting_station",
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Build",
  },

  // ── Town Buildings (crafted at Builder's Table) ───────────────────────────────
  // These are the core structures that grow your town and attract NPCs.
  // Rules:
  //   - treasury_chest + food inside → first resident arrives after 1 in-game day
  //   - resident_home → provides housing for one NPC
  //   - town_hall → must be built and first resident assigned as Mayor to unlock
  //                 all other town buildings
  //   - All named NPCs require their trigger building + a free resident_home

  treasury_chest: {
    icon: "🏛️", label: "Treasury Chest", category: "placeable", stackable: true,
    description: "The heart of your town. Stock it with food and the community will grow. If it runs empty, residents will be unhappy.",
    stationRecipe: { wood: 12, stone: 8, iron_ingot: 2 },
    craftStation: "builders_table",
    townBuilding: true,
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Open Treasury",
  },
  resident_home: {
    icon: "🏠", label: "Home", category: "placeable", stackable: true,
    description: "A cozy home for a town resident. Build one and someone might just show up.",
    stationRecipe: { wood: 16, stone: 10, sticks: 6 },
    craftStation: "builders_table",
    townBuilding: true,
    placeSize: [3, 3], placeSolid: true, placeInteract: true, placeLabel: "[F] View Home",
  },
  town_hall: {
    icon: "🏰", label: "Town Hall", category: "placeable", stackable: true,
    description: "Every town needs somewhere to govern from. Assign your first resident as Mayor to unlock the full town building roster.",
    stationRecipe: { wood: 20, stone: 16, iron_ingot: 4 },
    craftStation: "builders_table",
    townBuilding: true,
    townHall: true,
    placeSize: [4, 3], placeSolid: true, placeInteract: true, placeLabel: "[F] Town Hall",
  },

  // ── Town Buildings — unlocked after Mayor is assigned ─────────────────────────
  market_stall: {
    icon: "🏪", label: "Market Stall", category: "placeable", stackable: true,
    description: "A place to buy and sell goods. Attracts Maren the Merchant once a free home is available.",
    stationRecipe: { wood: 14, stone: 6, sticks: 8 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "maren",
    placeSize: [3, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Market",
  },
  fishing_hut: {
    icon: "🎣", label: "Fishing Hut", category: "placeable", stackable: true,
    description: "A quiet hut by the water. Attracts Finn the Fisherman once a free home is available.",
    stationRecipe: { wood: 12, stone: 4, sticks: 6 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "finn",
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Fishing Hut",
  },
  blacksmith: {
    icon: "⚒️", label: "Blacksmith", category: "placeable", stackable: true,
    description: "A forge for crafting advanced gear. Attracts Petra the Blacksmith once a free home is available.",
    stationRecipe: { stone: 20, iron_ingot: 6, coal: 4 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "petra",
    placeSize: [3, 3], placeSolid: true, placeInteract: true, placeLabel: "[F] Blacksmith",
  },
  herb_garden_hut: {
    icon: "🌿", label: "Herb Garden", category: "placeable", stackable: true,
    description: "A tended garden of rare plants. Attracts Elda the Herbalist once a free home is available.",
    stationRecipe: { wood: 10, stone: 6, herbs: 8 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "elda",
    placeSize: [3, 2], placeSolid: false, placeInteract: true, placeLabel: "[F] Herb Garden",
  },
  farmhouse: {
    icon: "🌾", label: "Farmhouse", category: "placeable", stackable: true,
    description: "A proper farm dwelling. Attracts Sable the Farmer once a free home is available.",
    stationRecipe: { wood: 18, stone: 8, sticks: 6 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "sable",
    placeSize: [3, 3], placeSolid: true, placeInteract: true, placeLabel: "[F] Farmhouse",
  },
  town_kitchen: {
    icon: "🍳", label: "Town Kitchen", category: "placeable", stackable: true,
    description: "A communal kitchen for the town. Attracts Clem the Cook once a free home is available.",
    stationRecipe: { wood: 14, stone: 10, coal: 3 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "clem",
    placeSize: [3, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Kitchen",
  },
  library: {
    icon: "📚", label: "Library", category: "placeable", stackable: true,
    description: "A quiet place for study and discovery. Attracts Rowan the Scholar once a free home is available.",
    stationRecipe: { wood: 16, stone: 8, sticks: 4 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "rowan",
    placeSize: [3, 3], placeSolid: true, placeInteract: true, placeLabel: "[F] Library",
  },
  beekeeper_cottage: {
    icon: "🐝", label: "Beekeeper's Cottage", category: "placeable", stackable: true,
    description: "A small cottage surrounded by beehives. Attracts Old Haas once a free home is available.",
    stationRecipe: { wood: 12, stone: 4, herbs: 4 },
    craftStation: "builders_table",
    townBuilding: true,
    requiresMayor: true,
    npcTrigger: "haas",
    placeSize: [2, 2], placeSolid: true, placeInteract: true, placeLabel: "[F] Cottage",
  },

  // ── Storage ───────────────────────────────────────────────────────────────────
  storage_chest: {
    icon: "📦", label: "Storage Chest", category: "placeable", stackable: true,
    description: "A crafted chest for storing items. Place it at home and press [F] to open.",
    stationRecipe: { wood: 8, stone: 4 },
    craftStation: "crafting_station",
    placeSize: [1, 1], placeSolid: true, placeInteract: true, placeLabel: "[F] Open Chest",
  },

  // ── Decorative Placeables ─────────────────────────────────────────────────────
  bench: {
    icon: "🪑", label: "Bench", category: "placeable", stackable: true,
    description: "A nice place to rest.",
    placeSize: [2, 1], placeSolid: true,
    stationRecipe: { wood: 4 },
    craftStation: "crafting_station",
  },
  lantern: {
    icon: "🏮", label: "Lantern", category: "placeable", stackable: true,
    description: "Warm light for your homestead.",
    placeSize: [1, 1], placeSolid: false,
    stationRecipe: { stone: 2, wood: 1 },
    craftStation: "crafting_station",
  },
  flower_bed: {
    icon: "🌸", label: "Flower Bed", category: "placeable", stackable: true,
    description: "A burst of colour.",
    placeSize: [2, 1], placeSolid: false,
    stationRecipe: { sticks: 2, herbs: 3 },
    craftStation: "crafting_station",
  },
  mushroom_ring: {
    icon: "🍄", label: "Mushroom Ring", category: "placeable", stackable: true,
    description: "Mysteriously cosy.",
    placeSize: [2, 2], placeSolid: false,
    stationRecipe: { herbs: 2, wood: 1 },
    craftStation: "crafting_station",
  },
  garden_gate: {
    icon: "🚪", label: "Garden Gate", category: "placeable", stackable: true,
    description: "Marks your garden entrance.",
    placeSize: [1, 2], placeSolid: true,
    stationRecipe: { wood: 5 },
    craftStation: "crafting_station",
  },
  herb_garden: {
    icon: "🌿", label: "Herb Garden", category: "placeable", stackable: true,
    description: "A decorative herb patch.",
    placeSize: [2, 2], placeSolid: false,
    stationRecipe: { herbs: 4, stone: 2 },
    craftStation: "crafting_station",
  },
  potted_plant: {
    icon: "🪴", label: "Potted Plant", category: "placeable", stackable: true,
    description: "Brings life to any corner.",
    placeSize: [1, 1], placeSolid: false,
    stationRecipe: { herbs: 1, stone: 1 },
    craftStation: "crafting_station",
  },
  tool_shed: {
    icon: "🛖", label: "Tool Shed", category: "placeable", stackable: true,
    description: "Extra storage for tools.",
    placeSize: [2, 2], placeSolid: true,
    stationRecipe: { wood: 10, stone: 5 },
    craftStation: "crafting_station",
  },
  fountain: {
    icon: "⛲", label: "Fountain", category: "placeable", stackable: true,
    description: "A beautiful stone fountain.",
    placeSize: [2, 2], placeSolid: true,
    stationRecipe: { stone: 8 },
    craftStation: "crafting_station",
  },
  cozy_fire: {
    icon: "🕯️", label: "Cozy Fire", category: "placeable", stackable: true,
    description: "Warm and welcoming.",
    placeSize: [1, 1], placeSolid: false,
    stationRecipe: { wood: 3, stone: 4 },
    craftStation: "crafting_station",
  },
  scarecrow: {
    icon: "🕺", label: "Scarecrow", category: "placeable", stackable: true,
    description: "Guards the crops.",
    placeSize: [1, 2], placeSolid: false,
    stationRecipe: { sticks: 5, leather: 2 },
    craftStation: "crafting_station",
  },
  beehive: {
    icon: "🐝", label: "Beehive", category: "placeable", stackable: true,
    description: "Buzzing with life.",
    placeSize: [1, 1], placeSolid: false,
    stationRecipe: { wood: 4, herbs: 3 },
    craftStation: "crafting_station",
  },
  windmill: {
    icon: "🌀", label: "Windmill", category: "placeable", stackable: true,
    description: "A landmark for your homestead.",
    placeSize: [2, 3], placeSolid: true,
    stationRecipe: { wood: 8, stone: 6 },
    craftStation: "crafting_station",
  },

  // ── Demolition Tool ───────────────────────────────────────────────────────────
  hammer: {
    icon: "🔨", label: "Hammer", category: "tool", stackable: false,
    description: "Demolishes any crafted building. The full item is returned to your inventory.",
    stationRecipe: { sticks: 3, stone: 4 },
    craftStation: "crafting_station",
    equipSlot: "weapon",
    equipStats: { canDemolish: true },
    maxDurability: 75,
    draw: drawHammer
  },
};

// ─── Derived lookups (computed once at load time) ─────────────────────────────
// Import these wherever you need them; never maintain parallel icon/label maps.

export const ITEM_ICONS = Object.fromEntries(
  Object.entries(ITEMS).map(([id, it]) => [id, it.icon])
);

export const ITEM_LABELS = Object.fromEntries(
  Object.entries(ITEMS).map(([id, it]) => [id, it.label])
);

/** Items that can be equipped: { id → { slot, stats, icon, label } } */
export const EQUIPPABLE = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.equipSlot)
    .map(([id, it]) => [id, {
      slot: it.equipSlot, stats: it.equipStats ?? {},
      icon: it.icon, label: it.label,
    }])
);

/** Max durability per tool (only items with maxDurability set) */
export const TOOL_MAX_DURABILITY = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.maxDurability != null)
    .map(([id, it]) => [id, it.maxDurability])
);

// ─── Per-instance tool identity & durability ─────────────────────────────────
//
// PROBLEM THIS SOLVES:
//   Tools are non-stackable, but the inventory only stored a COUNT
//   (items.axe = 3). Three axes were indistinguishable, so "equip this axe"
//   and "keep two axes separate in the hotbar" were impossible — there was no
//   stable identity to point at. The old approach kept a parallel durability
//   ARRAY and addressed instances by index, which drifted out of sync.
//
// THE MODEL NOW:
//   inventory.toolInstances[itemId] = [ { iid, dur }, ... ]
//     • iid  — unique, stable id for ONE physical tool ("axe#k3f9a2")
//     • dur  — that tool's own durability
//   inventory.items[itemId]         — still a COUNT, kept === toolInstances
//                                     length, so all existing slot / craft /
//                                     chest / sell code keeps working unchanged.
//   equipment.weapon   — STILL a plain item-id string (combat / rendering /
//                        gates never need to know about instances).
//   equipment.activeIid — the iid of the instance currently equipped/swung.
//   (equipment.durability is GONE — durability lives on the instance.)
//
//   A hotbar slot for a tool is { item, iid }.  Two axes => two different iids
//   => they can never collapse into one stacked slot. Stacking is impossible
//   by construction, not by special-case code.

let __iidCounter = 0;
/** Generate a unique tool instance id. Stable for the life of the tool. */
export function newToolIid(itemId) {
  __iidCounter = (__iidCounter + 1) % 1e6;
  return `${itemId}#${Date.now().toString(36)}${__iidCounter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** True if this item is a tool tracked as individual instances. */
export function isInstancedTool(itemId) {
  return getToolMaxDurability(itemId) != null;
}

/** Read the instance array for a tool from an inventory (never null). */
export function getToolInstances(inv, itemId) {
  return inv?.toolInstances?.[itemId] ?? [];
}

/** Find one instance (and its index) by iid across all tool types. */
export function findToolInstance(inv, iid) {
  const all = inv?.toolInstances ?? {};
  for (const [itemId, arr] of Object.entries(all)) {
    const idx = arr.findIndex(t => t.iid === iid);
    if (idx >= 0) return { itemId, idx, instance: arr[idx] };
  }
  return null;
}

/**
 * Ensure inventory.toolInstances is consistent with inventory.items for every
 * instanced tool: exactly one instance per counted copy. Missing instances are
 * created at full durability; surplus instances (count shrank) are trimmed from
 * the end. Non-tool items are ignored. Returns a NEW inventory if anything
 * changed, otherwise the same object.
 *
 * This is the single reconciliation point — call it after any code path that
 * changes a tool's count via the plain items map (loot merge, craft, migration)
 * so identity is always backfilled without that code needing to know about iids.
 */
export function reconcileToolInstances(inv) {
  if (!inv) return inv;
  const items = inv.items ?? {};
  const prev = inv.toolInstances ?? {};
  const next = {};
  let changed = false;

  for (const [itemId, qty] of Object.entries(items)) {
    if (!isInstancedTool(itemId) || !qty || qty <= 0) continue;
    const max = getToolMaxDurability(itemId);
    const existing = prev[itemId] ?? [];
    let arr = existing.slice(0, qty);                 // trim surplus
    while (arr.length < qty) {                         // backfill missing
      arr = [...arr, { iid: newToolIid(itemId), dur: max }];
    }
    next[itemId] = arr;
    if (arr.length !== existing.length || arr.some((t, i) => t !== existing[i])) {
      changed = true;
    }
  }

  // Drop instance arrays for tools no longer owned.
  for (const itemId of Object.keys(prev)) {
    if (!next[itemId]) changed = true;
  }

  if (!changed) return inv;
  return { ...inv, toolInstances: next };
}

/** Max durability for a tool, or null for non-durability gear. */
export function getToolMaxDurability(itemId) {
  return TOOL_MAX_DURABILITY[itemId] ?? null;
}

/**
 * Durability of the currently-equipped weapon, resolved through its active
 * instance. Returns [current, max] or null if the weapon has no durability.
 *
 * The active instance can live in either the player's hotbar slot or the
 * inventory.toolInstances registry, so both are checked.
 */
export function getWeaponDurability(equipment, inv, hotbar) {
  const weaponId = equipment?.weapon;
  if (!weaponId) return null;
  const max = getToolMaxDurability(weaponId);
  if (max == null) return null;
  const iid = equipment?.activeIid;
  if (iid) {
    const hbSlot = (hotbar ?? []).find(s => s?.item === weaponId && s?.iid === iid);
    if (hbSlot) return [hbSlot.dur ?? max, max];
    const inst = getToolInstances(inv, weaponId).find(t => t.iid === iid);
    if (inst) return [inst.dur ?? max, max];
  }
  // Fallback: no active iid resolved — read the first existing instance.
  const hbAny = (hotbar ?? []).find(s => s?.item === weaponId && s?.iid);
  if (hbAny) return [hbAny.dur ?? max, max];
  const invAny = getToolInstances(inv, weaponId)[0];
  if (invAny) return [invAny.dur ?? max, max];
  return [max, max];
}

/**
 * Equip a SPECIFIC tool instance by iid: set equipment.weapon to its item id
 * and equipment.activeIid to the chosen iid. For non-instanced weapons (no
 * durability) iid may be null and we just set the weapon slot.
 * Returns updated equipment (or the same object if nothing changed).
 */
export function equipToolInstance(equipment, itemId, iid) {
  const slot = EQUIPPABLE[itemId]?.slot;
  if (slot !== "weapon") return equipment;
  if (equipment?.weapon === itemId && equipment?.activeIid === iid) return equipment;
  return { ...equipment, weapon: itemId, activeIid: iid ?? null };
}

/**
 * Drain 1 durability from the equipped weapon's active instance.
 *
 * Active instances live in ONE of two places:
 *   • a hotbar slot ({ item, iid, dur }) — if the player put the tool on the hotbar
 *   • inventory.toolInstances[itemId]    — if the tool is sitting in the bag
 *
 * We locate the iid in whichever holder owns it and drain there. If durability
 * hits zero the instance is destroyed, onBreak fires, and we either promote a
 * spare (from the OTHER instances of the same tool type, prefer-hotbar order)
 * or clear the weapon slot.
 *
 * Returns { equipment, inventory, hotbar } — new objects only if something
 * changed.
 */
export function drainWeaponDurability(equipment, inv, hotbar, onBreak) {
  const weaponId = equipment?.weapon;
  if (!weaponId) return { equipment, inventory: inv, hotbar };
  const max = getToolMaxDurability(weaponId);
  if (max == null) return { equipment, inventory: inv, hotbar }; // no durability

  const activeIid = equipment?.activeIid;
  if (!activeIid) return { equipment, inventory: inv, hotbar };

  // Locate the instance. Check hotbar first (most common — equipped weapon
  // typically lives there during play), then inventory.
  const hbIdx = (hotbar ?? []).findIndex(s => s?.item === weaponId && s?.iid === activeIid);
  const invArr = getToolInstances(inv, weaponId);
  const invIdx = invArr.findIndex(t => t.iid === activeIid);

  const inHotbar = hbIdx >= 0;
  const inInv    = !inHotbar && invIdx >= 0;
  if (!inHotbar && !inInv) {
    // Stale activeIid — try to recover by picking a fresh same-type instance.
    const fallback = (hotbar ?? []).find(s => s?.item === weaponId)?.iid
                  ?? invArr[0]?.iid ?? null;
    if (!fallback) return { equipment, inventory: inv, hotbar };
    return drainWeaponDurability(
      { ...equipment, activeIid: fallback }, inv, hotbar, onBreak
    );
  }

  const curDur = inHotbar ? (hotbar[hbIdx].dur ?? max) : (invArr[invIdx].dur ?? max);
  const nextDur = curDur - 1;

  // ─── Normal drain (no break) ────────────────────────────────────────────
  if (nextDur > 0) {
    if (inHotbar) {
      const newHotbar = hotbar.map((s, i) =>
        i === hbIdx ? { ...s, dur: nextDur } : s
      );
      return { equipment, inventory: inv, hotbar: newHotbar };
    }
    const newArr = invArr.map((t, i) => (i === invIdx ? { ...t, dur: nextDur } : t));
    const newInv = {
      ...inv,
      toolInstances: { ...(inv.toolInstances ?? {}), [weaponId]: newArr },
    };
    return { equipment, inventory: newInv, hotbar };
  }

  // ─── This instance breaks ───────────────────────────────────────────────
  onBreak?.(weaponId);

  // Remove the broken instance from whichever holder had it.
  let newHotbar = hotbar;
  let newInv    = inv;
  if (inHotbar) {
    newHotbar = hotbar.map((s, i) => (i === hbIdx ? null : s));
  } else {
    const newArr = invArr.filter((_, i) => i !== invIdx);
    const newToolInstances = { ...(inv.toolInstances ?? {}) };
    const newItems = { ...(inv.items ?? {}) };
    if (newArr.length === 0) {
      delete newToolInstances[weaponId];
      delete newItems[weaponId];
    } else {
      newToolInstances[weaponId] = newArr;
      newItems[weaponId] = newArr.length;
    }
    newInv = { ...inv, toolInstances: newToolInstances, items: newItems };
  }

  // Look for a spare instance of the same tool type to auto-promote: prefer
  // another hotbar slot (still "on the belt"), else fall back to inventory.
  const hotbarSpare = (newHotbar ?? []).find(s => s?.item === weaponId && s?.iid);
  const invSpare    = !hotbarSpare ? getToolInstances(newInv, weaponId)[0] : null;
  const spareIid    = hotbarSpare?.iid ?? invSpare?.iid ?? null;

  const newEq = spareIid
    ? { ...equipment, weapon: weaponId, activeIid: spareIid }
    : { ...equipment, weapon: null, activeIid: null };

  return { equipment: newEq, inventory: newInv, hotbar: newHotbar };
}

/**
 * Remove ONE instance of a tool from inventory by iid (used when selling /
 * dropping a specific copy). Keeps items count in sync and clears the weapon
 * slot if the removed instance was the equipped one and no spares remain.
 * Returns { inventory, equipment }.
 */
export function removeToolInstance(inv, equipment, itemId, iid) {
  const arr = getToolInstances(inv, itemId);
  if (arr.length === 0) return { inventory: inv, equipment };
  const remaining = iid != null ? arr.filter(t => t.iid !== iid) : arr.slice(1);
  const newToolInstances = { ...(inv.toolInstances ?? {}) };
  const newItems = { ...(inv.items ?? {}) };
  if (remaining.length === 0) {
    delete newToolInstances[itemId];
    delete newItems[itemId];
  } else {
    newToolInstances[itemId] = remaining;
    newItems[itemId] = remaining.length;
  }
  const newInv = { ...inv, toolInstances: newToolInstances, items: newItems };

  let newEq = equipment;
  if (equipment?.weapon === itemId) {
    const stillThere = remaining.some(t => t.iid === equipment?.activeIid);
    if (!stillThere) {
      newEq = remaining.length > 0
        ? { ...equipment, weapon: itemId, activeIid: remaining[0].iid }
        : { ...equipment, weapon: null, activeIid: null };
    }
  }
  return { inventory: newInv, equipment: newEq };
}

/**
 * Add ONE freshly-crafted tool instance to inventory (full durability) and
 * keep the items count in sync. Returns a new inventory (or same if not a
 * durability tool — caller's normal addToPlayerInventory handles the count).
 */
export function addToolInstanceToInventory(inv, itemId) {
  if (!isInstancedTool(itemId)) return inv;
  const max = getToolMaxDurability(itemId);
  const arr = getToolInstances(inv, itemId);
  const newArr = [...arr, { iid: newToolIid(itemId), dur: max }];
  return {
    ...inv,
    toolInstances: { ...(inv.toolInstances ?? {}), [itemId]: newArr },
  };
}

/**
 * MIGRATION: convert a legacy inventory/equipment pair to the instance model.
 *   • Legacy durability lived on equipment.durability[itemId] as a scalar OR an
 *     array (the previous "fix"). We map those values onto fresh instances so
 *     existing wear is preserved; any shortfall is padded to full durability.
 *   • equipment.weapon stays a string; we add equipment.activeIid (index-0
 *     instance) and strip equipment.durability.
 *   • Hotbar tool slots gain an `iid` referencing the matching instance.
 * Idempotent: running it on already-migrated data is a no-op.
 *
 * Returns { inventory, equipment, hotbar }.
 */
export function migrateToToolInstances(inv, equipment, hotbar) {
  const safeInv = inv ?? { items: {}, slots: INVENTORY_BASE_SLOTS };
  const legacyDur = equipment?.durability ?? {};
  const startingItems = safeInv.items ?? {};
  const existingInstances = safeInv.toolInstances ?? {};
  const safeHotbar = hotbar ?? [];

  // Fast path: already migrated. The marker is "no equipment.durability AND
  // every owned tool type has an instance count == items count AND every
  // hotbar tool slot already has an iid". When that's true, nothing to do.
  const looksMigrated = (() => {
    if (equipment?.durability) return false;
    for (const [itemId, qty] of Object.entries(startingItems)) {
      if (!isInstancedTool(itemId)) continue;
      if (!qty || qty <= 0) continue;
      const arr = existingInstances[itemId];
      if (!Array.isArray(arr) || arr.length !== qty) return false;
      if (arr.some(t => !t?.iid)) return false;
    }
    for (const slot of safeHotbar) {
      if (slot && isInstancedTool(slot.item) && !slot.iid) return false;
      if (slot && isInstancedTool(slot.item) && slot.qty != null) return false;
    }
    return true;
  })();
  if (looksMigrated) {
    // Still normalize the equipment shape (ensure activeIid exists).
    let eq = equipment ?? { weapon: null, armor: null, accessory: null };
    if (eq.activeIid === undefined) eq = { ...eq, activeIid: null };
    return { inventory: safeInv, equipment: eq, hotbar: safeHotbar };
  }

  // Step 1 — synthesize a complete instance set for every tool the player owns,
  // pulling durability values from the legacy scalar/array map where present.
  // Build a temporary "pool" per tool type that we'll then split between the
  // inventory and the hotbar.
  const pool = {};
  for (const [itemId, qty] of Object.entries(startingItems)) {
    if (!isInstancedTool(itemId) || !qty || qty <= 0) continue;
    const max = getToolMaxDurability(itemId);
    const existing = existingInstances[itemId] ?? [];
    const raw = legacyDur[itemId];
    const legacyDurVals = Array.isArray(raw)
      ? raw.slice()
      : (typeof raw === "number" && raw > 0 ? [raw] : []);
    const arr = [];
    for (let i = 0; i < qty; i++) {
      if (existing[i]?.iid) {
        arr.push({ iid: existing[i].iid, dur: existing[i].dur ?? legacyDurVals[i] ?? max });
      } else {
        const dur = legacyDurVals[i] != null ? legacyDurVals[i] : max;
        arr.push({ iid: newToolIid(itemId), dur });
      }
    }
    pool[itemId] = arr;
  }

  // Step 2 — for each hotbar slot that holds a tool:
  //   • If the slot already owns a real instance (has iid + dur, no qty), leave
  //     it alone — its instance is NOT part of inventory.toolInstances anyway.
  //   • Otherwise (legacy stacked slot, or slot with iid but no dur), pull ONE
  //     instance from the pool into the slot.
  const newHotbar = safeHotbar.map(slot => {
    if (!slot || !isInstancedTool(slot.item)) return slot;
    // Slot already owns a real instance — keep it as-is.
    if (slot.iid && typeof slot.dur === "number" && slot.qty == null) {
      return slot;
    }
    const arr = pool[slot.item] ?? [];
    if (arr.length === 0) return null; // referenced tool no longer in bag
    let takeIdx = 0;
    if (slot.iid) {
      const matched = arr.findIndex(t => t.iid === slot.iid);
      if (matched >= 0) takeIdx = matched;
    }
    const [taken] = arr.splice(takeIdx, 1);
    const { qty: _qty, ...rest } = slot;
    return { ...rest, item: slot.item, iid: taken.iid, dur: taken.dur };
  });

  // Step 3 — whatever remains in the pool stays in inventory.toolInstances,
  // and inventory.items[itemId] is rewritten to match (so the bag count never
  // double-counts copies that now live on the hotbar).
  const newToolInstances = {};
  const newItems = { ...startingItems };
  for (const [itemId, arr] of Object.entries(pool)) {
    if (arr.length === 0) {
      delete newItems[itemId];
    } else {
      newToolInstances[itemId] = arr;
      newItems[itemId] = arr.length;
    }
  }

  const newInv = { ...safeInv, items: newItems, toolInstances: newToolInstances };

  // Step 4 — equipment: keep weapon string, derive activeIid by looking in both
  // the hotbar and the inventory pool, drop the legacy durability map.
  let newEq = { ...(equipment ?? { weapon: null, armor: null, accessory: null }) };
  if (newEq.durability) delete newEq.durability;
  if (newEq.weapon && isInstancedTool(newEq.weapon)) {
    const fromHotbar = newHotbar.find(s => s?.item === newEq.weapon)?.iid;
    const fromInv    = newToolInstances[newEq.weapon]?.[0]?.iid;
    const wantedIid  = newEq.activeIid;
    const stillExists = wantedIid && (
      newHotbar.some(s => s?.iid === wantedIid) ||
      Object.values(newToolInstances).some(arr => arr.some(t => t.iid === wantedIid))
    );
    if (!stillExists) {
      newEq.activeIid = fromHotbar ?? fromInv ?? null;
      if (newEq.activeIid == null) newEq.weapon = null;
    }
  } else if (newEq.activeIid === undefined) {
    newEq.activeIid = null;
  }

  return { inventory: newInv, equipment: newEq, hotbar: newHotbar };
}

/** Items usable from the hotbar (have useEffect) */
export const HOTBAR_ITEMS = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.useEffect)
    .map(([id, it]) => [id, {
      icon: it.icon, label: it.label,
      useEffect: it.useEffect, stackable: it.stackable,
    }])
);

/** Crafting recipes: { itemId → { ingredientId: qty } } */
export const RECIPES = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.craftRecipe)
    .map(([id, it]) => [id, it.craftRecipe])
);

/** Station recipes (require Crafting Station): { itemId → { ingredientId: qty } } */
export const STATION_RECIPES = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.stationRecipe)
    .map(([id, it]) => [id, it.stationRecipe])
);

/**
 * Alternate hand-craft recipes that produce the same output item.
 * Format: { outputItemId: [ recipe, recipe, … ] }
 * The first recipe in ITEMS.craftRecipe is already in RECIPES;
 * these are additional ways to craft the same item by hand.
 */
export const MULTI_HAND_RECIPES = {
  trail_snack: [
    { berries: 2 },
    { apples:  2 },
    { herbs:   2 },
    // mushrooms: 2  is already the canonical recipe in RECIPES
  ],
};

/**
 * Returns an expanded list of [recipeKey, recipe] pairs for hand-craft UI display.
 * Items with alternate recipes get one entry per recipe; the recipeKey uses the
 * format "itemId__halt0", "itemId__halt1" etc. so handlers can strip the suffix
 * to recover the output item ID.
 */
export function expandedHandRecipes() {
  const entries = Object.entries(RECIPES);
  const result = [];
  for (const [id, recipe] of entries) {
    result.push([id, recipe]);
    const alts = MULTI_HAND_RECIPES[id];
    if (alts) {
      alts.forEach((altRecipe, i) => result.push([`${id}__halt${i}`, altRecipe]));
    }
  }
  return result;
}

/** Strip the __haltN suffix to get the real output item ID (hand-craft alts). */
export function resolveHandRecipeKey(key) {
  return key.includes("__halt") ? key.split("__halt")[0] : key;
}

/** Check if a hand-craft recipe (including alts) can be made from player inventory */
export function canCraftByKey(key, inv) {
  const itemId = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_HAND_RECIPES[itemId]?.[altIndex];
    if (!recipe) return false;
    const items = inv?.items ?? inv ?? {};
    return Object.entries(recipe).every(([item, qty]) => (items[item] ?? 0) >= qty);
  }
  return canCraft(key, inv);
}

/** Craft a hand-craft recipe by key (including alts) from player inventory */
export function craftItemByKey(key, inv) {
  const itemId = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_HAND_RECIPES[itemId]?.[altIndex];
    if (!recipe) return null;
    if (!canCraftByKey(key, inv)) return null;
    if (inv?.items !== undefined) {
      const spent = spendFromPlayerInventory(inv, recipe);
      if (!spent) return null;
      const { next, overflow } = addToPlayerInventory(spent, itemId, 1);
      if (overflow[itemId]) return null; // bag full
      return next;
    }
    const next = { ...inv };
    for (const [item, qty] of Object.entries(recipe)) next[item] = (next[item] ?? 0) - qty;
    next[itemId] = (next[itemId] ?? 0) + 1;
    return next;
  }
  return craftItem(key, inv);
}

/** Check if a hand-craft recipe (including alts) can be satisfied from the chest */
export function canCraftByKeyFromChest(key, chest) {
  const itemId = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_HAND_RECIPES[itemId]?.[altIndex];
    if (!recipe) return false;
    const map = chestToMap(normalizeChest(chest));
    return Object.entries(recipe).every(([item, qty]) => (map[item] ?? 0) >= qty);
  }
  return canCraftFromChest(key, chest);
}

/** Craft a hand-craft recipe by key (including alts) using chest materials */
export function craftItemByKeyFromChest(key, chest, inv) {
  const itemId = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_HAND_RECIPES[itemId]?.[altIndex];
    if (!recipe) return null;
    if (!canCraftByKeyFromChest(key, chest)) return null;
    const newChest = spendFromChest(chest, recipe);
    if (!newChest) return null;
    const { next: newInv, overflow } = addToPlayerInventory(inv, itemId, 1);
    if (overflow[itemId]) return null; // bag full
    return { newChest, newInv };
  }
  return craftItemFromChest(key, chest, inv);
}

/**
 * Alternate station recipes that produce the same output item.
 * Format: { outputItemId: [ recipe, recipe, … ] }
 * The first recipe in ITEMS.stationRecipe is already in STATION_RECIPES;
 * these are additional ways to craft the same item at a station.
 */
export const MULTI_STATION_RECIPES = {};

/**
 * Returns an expanded list of [recipeKey, recipe] pairs for station UI display.
 * Items with alternate recipes get one entry per recipe; the recipeKey uses the
 * format "itemId__alt0", "itemId__alt1" etc. so handlers can strip the suffix
 * to recover the output item ID.
 * Call resolveRecipeKey(key) → itemId to get the output item.
 */
export function expandedStationRecipes() {
  const entries = Object.entries(STATION_RECIPES);
  const result = [];
  for (const [id, recipe] of entries) {
    result.push([id, recipe]);
    const alts = MULTI_STATION_RECIPES[id];
    if (alts) {
      alts.forEach((altRecipe, i) => result.push([`${id}__alt${i}`, altRecipe]));
    }
  }
  return result;
}

/** Strip the __altN suffix to get the real output item ID. */
export function resolveRecipeKey(key) {
  return key.includes("__") ? key.split("__")[0] : key;
}

/** Check if a station recipe (including alt recipes) can be made from player inventory */
export function canCraftAtStationByKey(key, inv) {
  const itemId = resolveRecipeKey(key);
  const altIndex = key.includes("__alt") ? parseInt(key.split("__alt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_STATION_RECIPES[itemId]?.[altIndex];
    if (!recipe) return false;
    const items = inv?.items ?? inv ?? {};
    return Object.entries(recipe).every(([item, qty]) => (items[item] ?? 0) >= qty);
  }
  return canCraftAtStation(key, inv);
}

/** Craft a station recipe by key (including alt recipes) from player inventory */
export function craftItemAtStationByKey(key, inv) {
  const itemId = resolveRecipeKey(key);
  const altIndex = key.includes("__alt") ? parseInt(key.split("__alt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_STATION_RECIPES[itemId]?.[altIndex];
    if (!recipe) return null;
    if (!canCraftAtStationByKey(key, inv)) return null;
    if (inv?.items !== undefined) {
      const spent = spendFromPlayerInventory(inv, recipe);
      if (!spent) return null;
      const { next, overflow } = addToPlayerInventory(spent, itemId, 1);
      if (overflow[itemId]) return null; // bag full
      return next;
    }
    const next = { ...inv };
    for (const [item, qty] of Object.entries(recipe)) next[item] = (next[item] ?? 0) - qty;
    next[itemId] = (next[itemId] ?? 0) + 1;
    return next;
  }
  return craftItemAtStation(key, inv);
}

/** Check if an alt station recipe can be satisfied from the chest */
export function canCraftAtStationByKeyFromChest(key, chest) {
  const itemId = resolveRecipeKey(key);
  const altIndex = key.includes("__alt") ? parseInt(key.split("__alt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_STATION_RECIPES[itemId]?.[altIndex];
    if (!recipe) return false;
    const map = chestToMap(normalizeChest(chest));
    return Object.entries(recipe).every(([item, qty]) => (map[item] ?? 0) >= qty);
  }
  return canCraftAtStationFromChest(key, chest);
}

/** Craft an alt station recipe using chest materials */
export function craftItemAtStationByKeyFromChest(key, chest, inv) {
  const itemId = resolveRecipeKey(key);
  const altIndex = key.includes("__alt") ? parseInt(key.split("__alt")[1]) : -1;
  if (altIndex >= 0) {
    const recipe = MULTI_STATION_RECIPES[itemId]?.[altIndex];
    if (!recipe) return null;
    if (!canCraftAtStationByKeyFromChest(key, chest)) return null;
    const newChest = spendFromChest(chest, recipe);
    if (!newChest) return null;
    const { next: newInv, overflow } = addToPlayerInventory(inv, itemId, 1);
    if (overflow[itemId]) return null; // bag full
    return { newChest, newInv };
  }
  return craftItemAtStationFromChest(key, chest, inv);
}

/** Placeables catalog: { itemId → { icon, label, cost, w, h, solid, interact, interactLabel } } */
export const PLACEABLES = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.category === "placeable")
    .map(([id, it]) => [id, {
      icon: it.icon, label: it.label,
      cost: it.craftRecipe ?? it.stationRecipe ?? {},
      needsStation: !it.craftRecipe,
      w: it.placeSize?.[0] ?? 1,
      h: it.placeSize?.[1] ?? 1,
      solid: it.placeSolid ?? false,
      interact: it.placeInteract ?? false,
      interactLabel: it.placeLabel,
    }])
);

/** Seeds: { itemId → full item definition } */
export const SEEDS = Object.fromEntries(
  Object.entries(ITEMS).filter(([, it]) => it.category === "seed")
);

/** Upgrade items: { itemId → upgradeEffect } */
export const UPGRADES = Object.fromEntries(
  Object.entries(ITEMS)
    .filter(([, it]) => it.upgradeEffect)
    .map(([id, it]) => [id, it.upgradeEffect])
);

// ─── Inventory constants ───────────────────────────────────────────────────────

/** Number of item stacks in a fresh player inventory (very small on purpose) */
export const INVENTORY_BASE_SLOTS = 4;

/** Maximum inventory slots achievable through upgrades */
export const INVENTORY_MAX_SLOTS = 32;

/** Number of visible hotbar slots at game start */
export const HOTBAR_BASE_SLOTS = 2;

/** Maximum hotbar slots achievable through upgrades */
export const HOTBAR_MAX_SLOTS = 8;

// ─── Player inventory model ───────────────────────────────────────────────────
//
// A player inventory is: { items: { [itemId]: qty }, slots: number }
// where `slots` is the current max number of distinct item stacks the player
// can carry.  Stackable items of the same type share one slot.
//
// This is SEPARATE from the shared chest, which has no slot limit.

export function emptyPlayerInventory() {
  return { items: {}, slots: INVENTORY_BASE_SLOTS };
}

/**
 * Count how many inventory slots are currently occupied.
 * Stackable items count as 1 slot regardless of quantity.
 * Non-stackable items (tools/gear) count as qty slots — each instance is separate.
 */
export function usedSlots(inv) {
  let total = 0;
  for (const [itemId, qty] of Object.entries(inv.items ?? {})) {
    if (!qty || qty <= 0) continue;
    const item = ITEMS[itemId];
    if (item && item.stackable === false) {
      total += qty; // each instance takes its own slot
    } else {
      total += 1;   // all stackable qty shares one slot
    }
  }
  return total;
}

/** Check whether a new item can fit in the inventory. */
export function canFitItem(inv, itemId) {
  const item = ITEMS[itemId];
  if (item && item.stackable === false) {
    // Each non-stackable instance costs one slot; check if there's room
    return usedSlots(inv) < (inv.slots ?? INVENTORY_BASE_SLOTS);
  }
  // Stackable: already-present type costs nothing extra; new type needs one slot
  const already = (inv.items?.[itemId] ?? 0) > 0;
  if (already) return true;
  return usedSlots(inv) < (inv.slots ?? INVENTORY_BASE_SLOTS);
}

/**
 * Add items to a player inventory, respecting the slot cap.
 * Returns { next: PlayerInventory, overflow: { [itemId]: qty } }
 * where overflow contains whatever couldn't fit.
 */
export function addToPlayerInventory(inv, itemId, qty) {
  const item = ITEMS[itemId];
  const isNonStackable = item && item.stackable === false;
  const isInstanced = isInstancedTool(itemId);

  if (isNonStackable) {
    // Each non-stackable instance occupies one slot (usedSlots counts them by qty).
    // Add unit-by-unit, stopping if slots fill up. For durability tools we also
    // mint a fresh tool instance (iid + full dur) so identity exists from the
    // moment the tool enters the inventory.
    let current = inv;
    let dropped = 0;
    for (let i = 0; i < qty; i++) {
      if (usedSlots(current) >= (current.slots ?? INVENTORY_BASE_SLOTS)) {
        dropped += qty - i;
        break;
      }
      const currentCount = current.items?.[itemId] ?? 0;
      current = {
        ...current,
        items: { ...current.items, [itemId]: currentCount + 1 },
      };
      if (isInstanced) {
        current = addToolInstanceToInventory(current, itemId);
      }
    }
    return dropped > 0
      ? { next: current, overflow: { [itemId]: dropped } }
      : { next: current, overflow: {} };
  }

  // Stackable items: all qty shares one slot
  const already = (inv.items?.[itemId] ?? 0) > 0;
  if (!already && usedSlots(inv) >= (inv.slots ?? INVENTORY_BASE_SLOTS)) {
    return { next: inv, overflow: { [itemId]: qty } };
  }
  const next = {
    ...inv,
    items: { ...inv.items, [itemId]: (inv.items?.[itemId] ?? 0) + qty },
  };
  return { next, overflow: {} };
}

/**
 * Merge a raw { [itemId]: qty } loot bag into a player inventory.
 * Returns { next: PlayerInventory, overflow: { [itemId]: qty } }
 */
export function mergeLootIntoPlayerInventory(inv, loot) {
  let current = { ...inv, items: { ...(inv.items ?? {}) } };
  const overflow = {};
  for (const [itemId, qty] of Object.entries(loot)) {
    if (!qty || qty <= 0 || itemId === "kills") continue;
    const { next, overflow: ov } = addToPlayerInventory(current, itemId, qty);
    current = next;
    if (ov[itemId]) overflow[itemId] = (overflow[itemId] ?? 0) + ov[itemId];
  }
  return { next: current, overflow };
}

/**
 * Remove items from a player inventory to pay a crafting recipe.
 * Returns the next inventory, or null if insufficient.
 */
export function spendFromPlayerInventory(inv, recipe) {
  const items = { ...(inv.items ?? {}) };
  for (const [itemId, qty] of Object.entries(recipe)) {
    if ((items[itemId] ?? 0) < qty) return null;
    items[itemId] = items[itemId] - qty;
  }
  // Clean up zeros
  for (const k of Object.keys(items)) { if (items[k] <= 0) delete items[k]; }
  return { ...inv, items };
}

/**
 * Apply an upgrade item to a player inventory/hotbar config.
 * Returns { inv: PlayerInventory, hotbarSlots: number } with updates applied.
 */
export function applyUpgrade(inv, hotbarSlots, upgradeId) {
  const effect = UPGRADES[upgradeId];
  if (!effect) return { inv, hotbarSlots };
  // Remove the upgrade item from inventory
  const items = { ...(inv.items ?? {}) };
  if (items[upgradeId] > 1) items[upgradeId]--;
  else delete items[upgradeId];

  let newInv = { ...inv, items };
  let newHotbarSlots = hotbarSlots;

  if (effect.inventorySlots) {
    const currentSlots = (typeof newInv.slots === "number" && !isNaN(newInv.slots))
      ? newInv.slots
      : INVENTORY_BASE_SLOTS;
    newInv = { ...newInv, slots: Math.min(INVENTORY_MAX_SLOTS, currentSlots + effect.inventorySlots) };
}
  if (effect.hotbarSlots) {
    newHotbarSlots = Math.min(HOTBAR_MAX_SLOTS, hotbarSlots + effect.hotbarSlots);
  }
  return { inv: newInv, hotbarSlots: newHotbarSlots };
}

// ─── Shared chest (grid-based, Minecraft-style) ───────────────────────────────
//
// The chest is stored as an array of CHEST_SLOTS cells.
// Each cell is either null (empty) or { item: string, qty: number }.
// Stackable items of the same type share one cell (qty accumulates).
// Non-stackable items each take their own cell.
//
// For backwards-compat with crafting helpers that read chest[itemId],
// use chestToMap(chest) → { [itemId]: qty }.

export const CHEST_COLS = 9;
export const CHEST_ROWS = 3;
export const CHEST_SLOTS = CHEST_COLS * CHEST_ROWS; // 27

/** Create a fresh empty chest grid */
export function emptyChest() {
  return Array(CHEST_SLOTS).fill(null);
}

/**
 * Migrate an old object-format chest { [itemId]: qty } to the new grid array.
 * Also ensures any array chest is the right length.
 */
export function normalizeChest(chest) {
  if (!chest) return emptyChest();
  let grid;
  // Already an array → ensure correct length
  if (Array.isArray(chest)) {
    grid = chest.slice();
    while (grid.length < CHEST_SLOTS) grid.push(null);
    if (grid.length > CHEST_SLOTS) grid = grid.slice(0, CHEST_SLOTS);
  } else {
    // Old object format → migrate
    grid = Array(CHEST_SLOTS).fill(null);
    let idx = 0;
    for (const [itemId, qty] of Object.entries(chest)) {
      if (!qty || qty <= 0 || idx >= CHEST_SLOTS) continue;
      grid[idx++] = { item: itemId, qty };
    }
  }
  return splitNonStackableCells(grid);
}

/**
 * Enforce the invariant that every non-stackable item (tools/gear) occupies its
 * OWN cell with qty 1, and that instanced tools carry an { iid, dur }.
 *
 * Legacy chests stored two axes as a single stacked cell ({ axe, qty: 2 }) and
 * never carried per-instance durability. This repacks any such cell into one
 * cell per instance, minting full-durability instances where they're missing,
 * so "single instances in the chest" holds no matter how the data got there.
 *
 * Stackable cells and already-singular cells are left exactly where they are;
 * extra instances spill into the first free cells (dropped only if the chest is
 * physically full, which is the same loss the old stacked form risked anyway).
 */
function splitNonStackableCells(grid) {
  let needsWork = false;
  for (const c of grid) {
    if (!c) continue;
    if (ITEMS[c.item]?.stackable !== false) continue;
    if ((c.qty ?? 1) > 1) { needsWork = true; break; }
    if (isInstancedTool(c.item) && (c.iid == null || c.dur == null)) { needsWork = true; break; }
  }
  if (!needsWork) return grid;

  const out = Array(grid.length).fill(null);
  const extras = []; // instances that need a fresh cell
  for (let i = 0; i < grid.length; i++) {
    const c = grid[i];
    if (!c) continue;
    if (ITEMS[c.item]?.stackable !== false) { out[i] = c; continue; }

    const count = Math.max(1, c.qty ?? 1);
    const instanced = isInstancedTool(c.item);
    const max = instanced ? getToolMaxDurability(c.item) : null;
    const makeCell = (iid, dur) =>
      instanced ? { item: c.item, qty: 1, iid: iid ?? newToolIid(c.item), dur: dur ?? max }
                : { item: c.item, qty: 1 };

    out[i] = makeCell(c.iid, c.dur);            // first instance keeps its slot
    for (let n = 1; n < count; n++) extras.push(makeCell(null, null));
  }
  for (const cell of extras) {
    const free = out.findIndex(c => c === null);
    if (free < 0) break;
    out[free] = cell;
  }
  return out;
}

/** Convert grid chest to { [itemId]: totalQty } for crafting / selling checks */
export function chestToMap(chest) {
  const map = {};
  for (const cell of (chest ?? [])) {
    if (!cell) continue;
    map[cell.item] = (map[cell.item] ?? 0) + cell.qty;
  }
  return map;
}

/**
 * Add itemId/qty to the chest grid.
 * Stacks onto an existing cell of the same item if found; else fills first empty.
 * Returns new grid (or same if no room).
 */
export function addToChest(chest, itemId, qty) {
  const grid = normalizeChest(chest).slice();

  // Non-stackable items NEVER stack — one cell per instance.
  if (ITEMS[itemId]?.stackable === false) {
    const instanced = isInstancedTool(itemId);
    const max = instanced ? getToolMaxDurability(itemId) : null;
    for (let n = 0; n < qty; n++) {
      const emptyIdx = grid.findIndex(c => c === null);
      if (emptyIdx < 0) break;
      grid[emptyIdx] = instanced
        ? { item: itemId, qty: 1, iid: newToolIid(itemId), dur: max }
        : { item: itemId, qty: 1 };
    }
    return grid;
  }

  // Stackable: stack onto an existing cell, else first empty.
  const existIdx = grid.findIndex(c => c?.item === itemId);
  if (existIdx >= 0) {
    grid[existIdx] = { item: itemId, qty: grid[existIdx].qty + qty };
    return grid;
  }
  const emptyIdx = grid.findIndex(c => c === null);
  if (emptyIdx >= 0) {
    grid[emptyIdx] = { item: itemId, qty };
    return grid;
  }
  return grid; // chest full — item lost (caller should check first)
}

/**
 * Check if there is room for itemId in the chest.
 * Non-stackable items need a genuinely empty cell (they can't stack onto a peer).
 */
export function canFitInChest(chest, itemId) {
  const grid = normalizeChest(chest);
  if (ITEMS[itemId]?.stackable === false) return grid.some(c => c === null);
  return grid.some(c => c === null || c?.item === itemId);
}

/**
 * Merge a { [itemId]: qty } bag into the chest grid.
 *
 * Returns { grid, overflow } where:
 *   • grid     — the new chest grid with whatever fit
 *   • overflow — { [itemId]: qty } for anything that did NOT fit
 *
 * Callers MUST inspect overflow and decide what to do with the remainder
 * (keep it in the bag, refuse the action, etc.) — silently dropping it is how
 * items used to get destroyed when depositing into a full chest.
 *
 * Stackable items stack onto an existing same-item cell (unlimited per cell)
 * or take the first empty cell. Non-stackable items (tools/gear) NEVER stack —
 * each instance takes its own empty cell, matching moveItem's drag behaviour
 * so the two deposit paths can't disagree about chest layout.
 *
 * INSTANCE DATA:
 *   Pass opts.instances = { [itemId]: [{ iid, dur }, ...] } to deposit specific
 *   tool instances (so durability travels into the chest instead of resetting).
 *   Instances are consumed front-to-back; if fewer are supplied than deposited,
 *   the remainder are minted at full durability (correct for fresh/bought tools).
 *
 *   The return value gains `consumed` = { [itemId]: [{ iid, dur }, ...] } listing
 *   exactly which instances were placed, so callers can remove those — and only
 *   those — from their own toolInstances registry.
 */
export function mergeIntoChest(chest, items, opts = {}) {
  let grid = normalizeChest(chest).slice();
  const overflow = {};
  const consumed = {};
  const instancePool = opts.instances ?? {};

  for (const [itemId, qty] of Object.entries(items)) {
    if (!qty || qty <= 0) continue;
    const nonStackable = ITEMS[itemId]?.stackable === false;

    if (nonStackable) {
      const instanced = isInstancedTool(itemId);
      const max = instanced ? getToolMaxDurability(itemId) : null;
      const pool = (instancePool[itemId] ?? []).slice();
      let placed = 0;
      for (let n = 0; n < qty; n++) {
        const emptyIdx = grid.findIndex(c => c === null);
        if (emptyIdx < 0) break;
        if (instanced) {
          const inst = pool.shift() ?? { iid: newToolIid(itemId), dur: max };
          const dur = inst.dur ?? max;
          grid[emptyIdx] = { item: itemId, qty: 1, iid: inst.iid, dur };
          (consumed[itemId] ??= []).push({ iid: inst.iid, dur });
        } else {
          grid[emptyIdx] = { item: itemId, qty: 1 };
        }
        placed++;
      }
      if (placed < qty) overflow[itemId] = qty - placed;
      continue;
    }

    // Stackable — stack onto existing cell, else first empty cell.
    let remaining = qty;
    const existIdx = grid.findIndex(c => c?.item === itemId);
    if (existIdx >= 0) {
      grid[existIdx] = { item: itemId, qty: grid[existIdx].qty + remaining };
      remaining = 0;
    } else {
      const emptyIdx = grid.findIndex(c => c === null);
      if (emptyIdx >= 0) {
        grid[emptyIdx] = { item: itemId, qty: remaining };
        remaining = 0;
      }
    }
    if (remaining > 0) overflow[itemId] = remaining;
  }
  return { grid, overflow, consumed };
}

/**
 * Spend recipe materials from the chest grid.
 * Returns new grid or null if insufficient.
 */
export function spendFromChest(chest, recipe) {
  const map = chestToMap(chest);
  // Check we have enough
  for (const [itemId, qty] of Object.entries(recipe)) {
    if ((map[itemId] ?? 0) < qty) return null;
  }
  // Deduct from grid cells
  let grid = normalizeChest(chest).slice();
  for (const [itemId, qty] of Object.entries(recipe)) {
    let toRemove = qty;
    grid = grid.map(c => {
      if (!c || c.item !== itemId || toRemove <= 0) return c;
      const take = Math.min(c.qty, toRemove);
      toRemove -= take;
      return c.qty - take > 0 ? { item: c.item, qty: c.qty - take } : null;
    });
  }
  return grid;
}

// ─── Equipment helpers ─────────────────────────────────────────────────────────

export function emptyEquipment() {
  return { weapon: null, armor: null, accessory: null };
}

/**
 * Merges stat bonuses from all equipped items.
 * Booleans are OR'd, numbers are summed.
 */
export function getEquipStats(equipment) {
  const stats = {
    attackBonus: 0, attackRange: 0,
    defense: 0, maxHpBonus: 0,
    herbBonus: 0, stoneYield: 0, woodYield: 0,
    canFish: false, canHoe: false, canChop: false, canMine: false, canWater: false, canDemolish: false,
  };
  for (const slot of ["weapon", "armor", "accessory"]) {
    const id = equipment?.[slot];
    if (!id || !EQUIPPABLE[id]) continue;
    for (const [k, v] of Object.entries(EQUIPPABLE[id].stats ?? {})) {
      if (typeof v === "boolean") stats[k] = stats[k] || v;
      else stats[k] = (stats[k] ?? 0) + v;
    }
  }
  return stats;
}

// ─── Hotbar helpers ────────────────────────────────────────────────────────────

export const HOTBAR_SIZE = HOTBAR_MAX_SLOTS; // physical array length (always max size)
export function emptyHotbar() { return Array(HOTBAR_SIZE).fill(null); }

// ─── Legacy inventory helpers (used internally by run states) ─────────────────
// Runs still accumulate into a plain { [itemId]: qty } object during play.
// That bag is handed to LootSummary / index which then merges it into the
// player's inventory.

export function fullEmptyInventory() {
  return Object.fromEntries(Object.keys(ITEMS).map(id => [id, 0]));
}
export function emptyInventory() { return fullEmptyInventory(); }

export function addToInventory(inv, item, qty) {
  return { ...inv, [item]: (inv[item] ?? 0) + qty };
}

export function mergeInventory(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) out[k] = (out[k] ?? 0) + v;
  return out;
}

// ─── Crafting helpers ──────────────────────────────────────────────────────────

/** Check if a hand-craft recipe can be made from player inventory */
export function canCraft(recipeId, inv) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return false;
  // inv may be PlayerInventory or plain { [id]: qty }
  const items = inv?.items ?? inv ?? {};
  return Object.entries(recipe).every(([item, qty]) => (items[item] ?? 0) >= qty);
}

export function craftItem(recipeId, inv) {
  if (!canCraft(recipeId, inv)) return null;
  const recipe = RECIPES[recipeId];
  // Support both PlayerInventory and plain objects
  if (inv?.items !== undefined) {
    const spent = spendFromPlayerInventory(inv, recipe);
    if (!spent) return null;
    const { next, overflow } = addToPlayerInventory(spent, recipeId, 1);
    if (overflow[recipeId]) return null; // bag full — refuse to silently lose the item
    return next;
  }
  const next = { ...inv };
  for (const [item, qty] of Object.entries(recipe)) next[item] = (next[item] ?? 0) - qty;
  next[recipeId] = (next[recipeId] ?? 0) + 1;
  return next;
}

/** Check if a station recipe can be made from player inventory */
export function canCraftAtStation(recipeId, inv) {
  const recipe = STATION_RECIPES[recipeId];
  if (!recipe) return false;
  const items = inv?.items ?? inv ?? {};
  return Object.entries(recipe).every(([item, qty]) => (items[item] ?? 0) >= qty);
}

export function craftItemAtStation(recipeId, inv) {
  if (!canCraftAtStation(recipeId, inv)) return null;
  const recipe = STATION_RECIPES[recipeId];
  if (inv?.items !== undefined) {
    const spent = spendFromPlayerInventory(inv, recipe);
    if (!spent) return null;
    const { next, overflow } = addToPlayerInventory(spent, recipeId, 1);
    if (overflow[recipeId]) return null; // bag full — refuse to silently lose the item
    return next;
  }
  const next = { ...inv };
  for (const [item, qty] of Object.entries(recipe)) next[item] = (next[item] ?? 0) - qty;
  next[recipeId] = (next[recipeId] ?? 0) + 1;
  return next;
}

// ─── Chest-crafting helpers ────────────────────────────────────────────────────
// Spend materials from the chest; deliver the crafted item to player inventory.

/** Check if a hand-craft recipe can be satisfied from the chest */
export function canCraftFromChest(recipeId, chest) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return false;
  const map = chestToMap(normalizeChest(chest));
  return Object.entries(recipe).every(([item, qty]) => (map[item] ?? 0) >= qty);
}

/**
 * Craft a hand-craft recipe using chest materials.
 * Returns { newChest, newInv } or null if not craftable.
 */
export function craftItemFromChest(recipeId, chest, inv) {
  if (!canCraftFromChest(recipeId, chest)) return null;
  const recipe = RECIPES[recipeId];
  const newChest = spendFromChest(chest, recipe);
  if (!newChest) return null;
  const { next: newInv, overflow } = addToPlayerInventory(inv, recipeId, 1);
  if (overflow[recipeId]) return null; // bag full
  return { newChest, newInv };
}

/** Check if a station recipe can be satisfied from the chest */
export function canCraftAtStationFromChest(recipeId, chest) {
  const recipe = STATION_RECIPES[recipeId];
  if (!recipe) return false;
  const map = chestToMap(normalizeChest(chest));
  return Object.entries(recipe).every(([item, qty]) => (map[item] ?? 0) >= qty);
}

/**
 * Craft a station recipe using chest materials.
 * Returns { newChest, newInv } or null if not craftable.
 */
export function craftItemAtStationFromChest(recipeId, chest, inv) {
  if (!canCraftAtStationFromChest(recipeId, chest)) return null;
  const recipe = STATION_RECIPES[recipeId];
  const newChest = spendFromChest(chest, recipe);
  if (!newChest) return null;
  const { next: newInv, overflow } = addToPlayerInventory(inv, recipeId, 1);
  if (overflow[recipeId]) return null; // bag full
  return { newChest, newInv };
}

// ─── Combined inventory+chest crafting helpers ─────────────────────────────────
// Used when materials are split between the player bag and the shared chest.

/**
 * Resolve any recipe key — plain id, "__altN" (station) or "__haltN" (hand) —
 * to its recipe object. The plain-id family of helpers each did this resolution
 * inline; the combined helpers below skipped it, which silently broke bag+chest
 * crafting for every alternate recipe (e.g. the berries/apples/herbs → trail_snack
 * variants). Centralising it here keeps all sources in agreement.
 */
function recipeForCombinedKey(key) {
  const itemId = resolveRecipeKey(key);
  if (key.includes("__halt")) {
    const i = parseInt(key.split("__halt")[1]);
    return MULTI_HAND_RECIPES[itemId]?.[i] ?? null;
  }
  if (key.includes("__alt")) {
    const i = parseInt(key.split("__alt")[1]);
    return MULTI_STATION_RECIPES[itemId]?.[i] ?? null;
  }
  return RECIPES[itemId] ?? STATION_RECIPES[itemId] ?? null;
}

/** Check if a recipe can be satisfied by combining inventory + chest */
export function canCraftCombined(recipeId, inv, chest) {
  const recipe = recipeForCombinedKey(recipeId);
  if (!recipe) return false;
  const invItems  = inv?.items ?? {};
  const chestMap  = chestToMap(normalizeChest(chest));
  return Object.entries(recipe).every(
    ([item, qty]) => (invItems[item] ?? 0) + (chestMap[item] ?? 0) >= qty
  );
}

/**
 * Craft a recipe drawing from inventory first, then chest for any shortfall.
 * Covers both RECIPES (hand-craft) and STATION_RECIPES, including their
 * "__halt" / "__alt" alternates.
 * Returns { newInv, newChest } or null if insufficient materials or bag full.
 */
export function craftItemCombined(recipeId, inv, chest) {
  const recipe = recipeForCombinedKey(recipeId);
  if (!recipe || !canCraftCombined(recipeId, inv, chest)) return null;

  let newItems   = { ...(inv?.items ?? {}) };
  const chestSpend = {};

  for (const [item, qty] of Object.entries(recipe)) {
    const fromInv   = Math.min(qty, newItems[item] ?? 0);
    const fromChest = qty - fromInv;
    if (fromInv > 0) {
      newItems[item] = (newItems[item] ?? 0) - fromInv;
      if (newItems[item] <= 0) delete newItems[item];
    }
    if (fromChest > 0) chestSpend[item] = fromChest;
  }

  const updatedChest = Object.keys(chestSpend).length > 0
    ? spendFromChest(normalizeChest(chest), chestSpend)
    : normalizeChest(chest);
  if (!updatedChest) return null; // shouldn't happen given canCraftCombined check

  const tempInv = { ...(inv ?? {}), items: newItems };
  const outputId = resolveRecipeKey(recipeId);
  const { next: newInv, overflow } = addToPlayerInventory(tempInv, outputId, 1);
  if (overflow[outputId]) return null; // bag full
  return { newInv, newChest: updatedChest };
}

// ─── Hotbar-as-crafting-source helpers ────────────────────────────────────────
// Hotbar slots hold { item: string, qty: number } | null.
// These helpers let crafting treat the hotbar as a third material source
// (alongside inventory bag and shared chest).

/** Convert hotbar array → { [itemId]: totalQty } map */
export function hotbarToMap(hotbar) {
  const map = {};
  for (const slot of (hotbar ?? [])) {
    if (!slot) continue;
    map[slot.item] = (map[slot.item] ?? 0) + (slot.qty ?? 1);
  }
  return map;
}

/**
 * Deduct a recipe's cost from the hotbar.
 * Returns a new hotbar array or null if insufficient.
 */
export function spendFromHotbar(hotbar, recipe) {
  const slots = (hotbar ?? []).map(s => s ? { ...s } : null);
  for (const [itemId, needed] of Object.entries(recipe)) {
    let remaining = needed;
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const slot = slots[i];
      if (!slot || slot.item !== itemId) continue;
      const take = Math.min(remaining, slot.qty ?? 1);
      remaining -= take;
      const newQty = (slot.qty ?? 1) - take;
      slots[i] = newQty > 0 ? { ...slot, qty: newQty } : null;
    }
    if (remaining > 0) return null; // insufficient
  }
  return slots;
}

/**
 * Check if a recipe (by key, including alt recipes) can be fully satisfied
 * from the hotbar alone.
 */
export function canCraftByKeyFromHotbar(key, hotbar) {
  const itemId   = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  const recipe   = altIndex >= 0
    ? MULTI_HAND_RECIPES[itemId]?.[altIndex]
    : RECIPES[itemId];
  if (!recipe) return false;
  const map = hotbarToMap(hotbar);
  return Object.entries(recipe).every(([item, qty]) => (map[item] ?? 0) >= qty);
}

/**
 * Craft using hotbar materials only.
 * Returns { newHotbar, newInv } or null if insufficient / bag full.
 */
export function craftItemByKeyFromHotbar(key, hotbar, inv) {
  const itemId   = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  const recipe   = altIndex >= 0
    ? MULTI_HAND_RECIPES[itemId]?.[altIndex]
    : RECIPES[itemId];
  if (!recipe || !canCraftByKeyFromHotbar(key, hotbar)) return null;
  const newHotbar = spendFromHotbar(hotbar, recipe);
  if (!newHotbar) return null;
  const { next: newInv, overflow } = addToPlayerInventory(inv, itemId, 1);
  if (overflow[itemId]) return null; // bag full
  return { newHotbar, newInv };
}

/**
 * Check if a recipe can be satisfied by combining inventory bag + hotbar
 * (used when neither alone is enough).
 */
export function canCraftByKeyCombinedWithHotbar(key, inv, hotbar) {
  const itemId   = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  const recipe   = altIndex >= 0
    ? MULTI_HAND_RECIPES[itemId]?.[altIndex]
    : RECIPES[itemId];
  if (!recipe) return false;
  const invItems = inv?.items ?? {};
  const hbMap    = hotbarToMap(hotbar);
  return Object.entries(recipe).every(
    ([item, qty]) => (invItems[item] ?? 0) + (hbMap[item] ?? 0) >= qty
  );
}

/**
 * Craft a recipe drawing from inventory first, then hotbar for any shortfall.
 * Returns { newInv, newHotbar } or null if insufficient / bag full.
 */
export function craftItemByKeyCombinedWithHotbar(key, inv, hotbar) {
  if (!canCraftByKeyCombinedWithHotbar(key, inv, hotbar)) return null;
  const itemId   = resolveHandRecipeKey(key);
  const altIndex = key.includes("__halt") ? parseInt(key.split("__halt")[1]) : -1;
  const recipe   = altIndex >= 0
    ? MULTI_HAND_RECIPES[itemId]?.[altIndex]
    : RECIPES[itemId];
  if (!recipe) return null;

  let newItems  = { ...(inv?.items ?? {}) };
  const hbSpend = {};

  for (const [item, qty] of Object.entries(recipe)) {
    const fromInv = Math.min(qty, newItems[item] ?? 0);
    const fromHb  = qty - fromInv;
    if (fromInv > 0) {
      newItems[item] = (newItems[item] ?? 0) - fromInv;
      if (newItems[item] <= 0) delete newItems[item];
    }
    if (fromHb > 0) hbSpend[item] = fromHb;
  }

  const newHotbar = Object.keys(hbSpend).length > 0
    ? spendFromHotbar(hotbar, hbSpend)
    : [...(hotbar ?? [])];
  if (!newHotbar) return null;

  const tempInv = { ...(inv ?? {}), items: newItems };
  const { next: newInv, overflow } = addToPlayerInventory(tempInv, itemId, 1);
  if (overflow[itemId]) return null; // bag full
  return { newInv, newHotbar };
}

//
// Every questReward string from NPC_ROSTER maps to one entry here.
// `effect` is a plain descriptor consumed by helpers below — nothing mutates ITEMS.
//
// Effect types:
//   { type: "price_multiplier",  sellMult, buyMult }   — market sell/buy rate change
//   { type: "fish_loot_boost",   table }                — replaces homestead fish loot table
//   { type: "weapon_tier" }                             — unlocks iron weapon recipes (UI hint)
//   { type: "potion_boost",      healBonus }            — bonus heal on potions
//   { type: "crop_speed",        growthMult }           — multiplies growth time (< 1 = faster)
//   { type: "new_recipes",       recipes }              — array of recipe IDs now available
//   { type: "honey_crafting" }                          — unlocks honey items (UI hint)
//   { type: "lore_and_map" }                            — lore / map reveal (UI hint)
//   { type: "gold_bonus",        amount }               — one-time gold reward on complete

export const QUEST_REWARD_DEFS = {
  // Maren — gems × 5 → better_prices
  better_prices: {
    label:       "Better Prices",
    npcName:     "Maren",
    icon:        "📈",
    description: "Maren puts in a good word. Sell prices +20%, buy prices −15%.",
    effect:      { type: "price_multiplier", sellMult: 1.20, buyMult: 0.85 },
    goldBonus:   50, // one-time gold on completion
  },

  // Finn — rare_fish × 5 → better_fish_loot
  better_fish_loot: {
    label:       "Expert Fishing",
    npcName:     "Finn",
    icon:        "🎣",
    description: "Finn shares his secrets. Rare fish & gem catch rates roughly doubled.",
    effect: {
      type:  "fish_loot_boost",
      table: [
        { item: "fish",      min: 1, max: 2, chance: 0.35 },
        { item: "big_fish",  min: 1, max: 2, chance: 0.30 },
        { item: "rare_fish", min: 1, max: 1, chance: 0.25 },
        { item: "gems",      min: 1, max: 3, chance: 0.10 },
      ],
    },
    goldBonus: 30,
  },

  // Petra — iron_ingot × 10 → weapon_upgrades
  weapon_upgrades: {
    label:       "Weapon Upgrades",
    npcName:     "Petra",
    icon:        "⚔️",
    description: "Petra unlocks Tier 2 weapon blueprints at the Blacksmith.",
    effect:      { type: "weapon_tier" },
    goldBonus:   40,
  },

  // Elda — herbs × 15 → better_potions
  better_potions: {
    label:       "Potent Brews",
    npcName:     "Elda",
    icon:        "🧪",
    description: "Elda's knowledge improves all potions. +2 heal on every potion consumed.",
    effect:      { type: "potion_boost", healBonus: 2 },
    goldBonus:   35,
  },

  // Sable — carrot × 10 → faster_crops
  faster_crops: {
    label:       "Green Thumb",
    npcName:     "Sable",
    icon:        "🌱",
    description: "Sable shares farming tricks. All crops grow 30% faster.",
    effect:      { type: "crop_speed", growthMult: 0.70 },
    goldBonus:   25,
  },

  // Clem — mushrooms × 12 → new_recipes
  new_recipes: {
    label:       "New Recipes",
    npcName:     "Clem",
    icon:        "🍳",
    description: "Clem teaches two hearty new fire-pit recipes.",
    effect: {
      type:    "new_recipes",
      recipes: ["forest_stew", "hunters_feast"],
    },
    goldBonus: 30,
  },

  // Rowan — crystal × 3 → lore_and_map
  lore_and_map: {
    label:       "Ancient Knowledge",
    npcName:     "Rowan",
    icon:        "📚",
    description: "Rowan reveals hidden lore and marks rare resource nodes on the map.",
    effect:      { type: "lore_and_map" },
    goldBonus:   60,
  },

  // Haas — herbs × 8 → honey_crafting
  honey_crafting: {
    label:       "Honey Crafting",
    npcName:     "Old Haas",
    icon:        "🍯",
    description: "Haas teaches honey recipes. Honey items are now craftable at the Fire Pit.",
    effect:      { type: "honey_crafting" },
    goldBonus:   20,
  },
};

/**
 * Return the effective sell or buy price for an item, after applying any active
 * quest rewards.
 *
 * @param {string}   itemId        — item ID
 * @param {"sell"|"buy"} priceType
 * @param {string[]} activeRewards — array of reward IDs that have been unlocked
 * @returns {number|null}          — price in gold, or null if item has no such price
 */
export function getPriceWithRewards(itemId, priceType, activeRewards = []) {
  const item = ITEMS[itemId];
  if (!item) return null;
  const base = priceType === "sell" ? item.sellPrice : item.buyPrice;
  if (base == null) return null;

  let price = base;
  for (const rewardId of activeRewards) {
    const def = QUEST_REWARD_DEFS[rewardId];
    if (def?.effect?.type !== "price_multiplier") continue;
    if (priceType === "sell") price = Math.round(price * def.effect.sellMult);
    else                      price = Math.max(1, Math.round(price * def.effect.buyMult));
  }
  return price;
}

/**
 * Returns true when Maren's market-stall discount should be active:
 *   • An NPC whose npcId is "maren" is assigned to "market_stall"
 *   • AND that NPC has completed her quest (questComplete === true)
 *
 * The 10% discount this enables is applied on top of any quest-reward
 * price multipliers (better_prices etc.) already in effect.
 *
 * @param {{ npcs?: Array<{ npcId: string, assignment: string|null, questComplete?: boolean }> }} townState
 * @returns {boolean}
 */
export function getMarenDiscountActive(townState) {
  const npcs = townState?.npcs ?? [];
  return npcs.some(
    n => n.npcId === "maren" && n.assignment === "market_stall" && n.questComplete === true
  );
}

/**
 * Return the effective growth time (seconds per stage) for a seed, after
 * applying any active quest rewards.
 *
 * @param {string}   seedId
 * @param {string[]} activeRewards
 * @returns {number}
 */
/**
 * Return the effective growthDays for a seed after applying any active
 * quest rewards (e.g. faster_crops multiplier).
 * @param {string}   seedId
 * @param {string[]} activeRewards
 * @returns {number}
 */
export function getSeedGrowthDaysWithRewards(seedId, activeRewards = []) {
  const base = ITEMS[seedId]?.growthDays ?? 2;
  let mult = 1;
  for (const rewardId of activeRewards) {
    const def = QUEST_REWARD_DEFS[rewardId];
    if (def?.effect?.type === "crop_speed") mult *= def.effect.growthMult;
  }
  return Math.max(1, Math.round(base * mult));
}

/**
 * Return the boosted fish loot table if `better_fish_loot` is active,
 * otherwise return the default table passed in.
 *
 * @param {Array}    defaultTable
 * @param {string[]} activeRewards
 * @returns {Array}
 */
export function getFishLootTable(defaultTable, activeRewards = []) {
  for (const rewardId of activeRewards) {
    const def = QUEST_REWARD_DEFS[rewardId];
    if (def?.effect?.type === "fish_loot_boost") return def.effect.table;
  }
  return defaultTable;
}

/**
 * Return effective heal for a consumable, after applying any active rewards.
 * @param {string}   itemId
 * @param {string[]} activeRewards
 * @returns {number}
 */
export function getHealWithRewards(itemId, activeRewards = []) {
  const base = ITEMS[itemId]?.useEffect?.heal ?? 0;
  if (base === 0) return 0;
  const isPotion = ["healing_potion", "strength_potion"].includes(itemId);
  if (!isPotion) return base;
  let bonus = 0;
  for (const rewardId of activeRewards) {
    const def = QUEST_REWARD_DEFS[rewardId];
    if (def?.effect?.type === "potion_boost") bonus += def.effect.healBonus;
  }
  return base + bonus;
}

// ─── NPC unlock helpers ───────────────────────────────────────────────────────

/**
 * Return the set of npcIds that have fully arrived in town
 * (not waiting at border).  Pass the npcs array from townState.
 * @param {Array} npcs
 * @returns {Set<string>}
 */
export function getArrivedNpcIds(npcs) {
  const ids = new Set();
  for (const npc of (npcs ?? [])) {
    if (!npc.waitingAtBorder) ids.add(npc.npcId);
  }
  return ids;
}

/**
 * Return the set of item IDs that are currently unlocked based on which
 * NPCs have arrived.  Items with no unlockedByNpc are always unlocked.
 *
 * Usage:
 *   const unlocked = getUnlockedItemIds(townState?.npcs);
 *   const visibleRecipes = allRecipes.filter(([id]) => unlocked.has(id));
 *
 * @param {Array} npcs
 * @returns {Set<string>}
 */
export function getUnlockedItemIds(npcs) {
  const arrived = getArrivedNpcIds(npcs);
  const unlocked = new Set();
  for (const [id, item] of Object.entries(ITEMS)) {
    if (!item.unlockedByNpc || arrived.has(item.unlockedByNpc)) {
      unlocked.add(id);
    }
  }
  return unlocked;
}

// ─── Goblin King run gate ─────────────────────────────────────────────────────

/**
 * Returns true if the player has a sword (wood or iron) in their inventory
 * or currently equipped — gate for unlocking the Goblin King run.
 */
export function hasAnySword(playerInventory, equipment) {
  const SWORD_IDS = ["iron_sword"];
  // Check equipped weapon
  if (SWORD_IDS.includes(equipment?.weapon)) return true;
  // Check inventory
  const items = playerInventory?.items ?? {};
  return SWORD_IDS.some(id => (items[id] ?? 0) > 0);
}

// ─── Craft output routing ─────────────────────────────────────────────────────

/**
 * After spending ingredients for a craft, route the output item to the hotbar
 * first (if the item is already there), then to the inventory bag.
 *
 * @param {PlayerInventory} postSpendInv   - inventory after ingredients were spent
 * @param {Array}           postSpendHotbar - hotbar array after ingredients were spent
 * @param {string}          itemId          - the crafted item id
 * @param {number}          qty             - quantity crafted (usually 1)
 * @returns {{ newInv, newHotbar }} or null if neither hotbar nor bag can fit it
 */
export function addCraftOutputToHotbarOrInventory(postSpendInv, postSpendHotbar, itemId, qty) {
  const hotbar = postSpendHotbar ?? [];
  const item = ITEMS[itemId];
  const isNonStackable = item && item.stackable === false;

  // Non-stackable tools never stack on the hotbar — they always go to inventory.
  if (!isNonStackable) {
    // Try to stack onto an existing hotbar slot first
    const existingSlotIdx = hotbar.findIndex(s => s?.item === itemId);
    if (existingSlotIdx >= 0) {
      const newHotbar = hotbar.map((s, i) =>
        i === existingSlotIdx ? { ...s, qty: (s.qty ?? 1) + qty } : s
      );
      return { newInv: postSpendInv, newHotbar };
    }
  }

  // Otherwise land in the inventory bag
  const { next: newInv, overflow } = addToPlayerInventory(postSpendInv, itemId, qty);
  if (overflow[itemId]) return null; // bag full, nowhere to put it
  return { newInv, newHotbar: hotbar };
}

// ─── Loot roll (shared by run generation and world nodes) ─────────────────────

/** table: [{ item, min, max, chance? }]  — chance defaults to 1 */
export function rollLoot(table, rand) {
  const drops = [];
  for (const entry of table) {
    if (entry.chance != null && rand() > entry.chance) continue;
    const amt = entry.min + Math.floor(rand() * (entry.max - entry.min + 1));
    if (amt > 0) drops.push({ item: entry.item, qty: amt });
  }
  return drops;
}