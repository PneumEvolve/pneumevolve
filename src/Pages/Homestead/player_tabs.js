// src/Pages/Homestead/player_tabs.js
// Shared tab definitions used by both the homestead TabMenu and the in-run
// RunTabMenu. The "tabs" each menu shows is just a filter on this list.

export const ALL_TABS = [
  { id: "inventory",  label: "My Bag",    icon: "🎒" },
  { id: "chest",      label: "Chest",     icon: "📦" },
  { id: "crafting",   label: "Crafting",  icon: "🔨" },
  { id: "equipment",  label: "Equipment", icon: "⚔️" },
  { id: "farming",    label: "Farming",   icon: "🌱" },
  { id: "character",  label: "Character", icon: "🧑" },
];

export const HOMESTEAD_TAB_IDS = ["inventory", "chest", "crafting", "equipment", "farming", "character"];
export const RUN_TAB_IDS       = ["inventory", "chest", "crafting", "equipment"];

export function pickTabs(ids) {
  return ids.map(id => ALL_TABS.find(t => t.id === id)).filter(Boolean);
}
