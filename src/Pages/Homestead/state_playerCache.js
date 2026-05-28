// src/Pages/Homestead/state_playerCache.js
// Write-through localStorage cache for per-player state.
// The server is the source of truth on load; localStorage is written on every
// change and read only as a fast cache (so saves feel instant) and as a fallback
// during the one-time migration off legacy per-role keys.
//
// Extracted from index.jsx so the root file stays focused on game-state orchestration.

import {
  emptyPlayerInventory, emptyHotbar,
  HOTBAR_BASE_SLOTS,
} from "./Items";
import { defaultCharacter } from "./gameEngine";

function playerCacheKey(roomId, suffix) {
  return `hearthroot_r${roomId}_${suffix}`;
}

export function writePlayerCache(roomId, field, value) {
  try {
    localStorage.setItem(playerCacheKey(roomId, field), JSON.stringify(value));
  } catch {}
}

export function readPlayerCache(roomId) {
  try {
    const inv  = localStorage.getItem(playerCacheKey(roomId, "inventory"));
    const hb   = localStorage.getItem(playerCacheKey(roomId, "hotbar"));
    const hbs  = localStorage.getItem(playerCacheKey(roomId, "hotbar_slots"));
    const eq   = localStorage.getItem(playerCacheKey(roomId, "equipment"));
    const char = localStorage.getItem(playerCacheKey(roomId, "character"));
    const lrd  = localStorage.getItem(playerCacheKey(roomId, "last_run_day"));
    if (!inv && !hb && !eq && !char) return null;
    return {
      inventory:   inv  ? JSON.parse(inv)  : emptyPlayerInventory(),
      hotbar:      hb   ? JSON.parse(hb)   : emptyHotbar(),
      hotbarSlots: hbs  ? JSON.parse(hbs)  : HOTBAR_BASE_SLOTS,
      equipment:   eq   ? JSON.parse(eq)   : { weapon: null, armor: null, accessory: null },
      character:   char ? JSON.parse(char) : defaultCharacter(),
      lastRunDay:  lrd  ? JSON.parse(lrd)  : -1,
    };
  } catch { return null; }
}

// Legacy per-role keys — used for the one-time migration off the old scheme.
export function readLegacyPlayerCache(role) {
  try {
    const inv  = localStorage.getItem(`hearthroot_${role}_inventory`);
    const hb   = localStorage.getItem(`hearthroot_${role}_hotbar`);
    const hbs  = localStorage.getItem(`hearthroot_${role}_hotbar_slots`);
    const eq   = localStorage.getItem(`hearthroot_${role}_equipment`);
    const char = localStorage.getItem(`hearthroot_${role}_character`);
    if (!inv && !hb && !eq && !char) return null;
    return {
      inventory:   inv  ? JSON.parse(inv)  : emptyPlayerInventory(),
      hotbar:      hb   ? JSON.parse(hb)   : emptyHotbar(),
      hotbarSlots: hbs  ? JSON.parse(hbs)  : HOTBAR_BASE_SLOTS,
      equipment:   eq   ? JSON.parse(eq)   : { weapon: null, armor: null, accessory: null },
      character:   char ? JSON.parse(char) : defaultCharacter(),
    };
  } catch { return null; }
}

// Clears legacy role-scoped keys after migration so they never bleed into a new room.
export function clearLegacyPlayerCache(role) {
  try {
    localStorage.removeItem(`hearthroot_${role}_inventory`);
    localStorage.removeItem(`hearthroot_${role}_hotbar`);
    localStorage.removeItem(`hearthroot_${role}_hotbar_slots`);
    localStorage.removeItem(`hearthroot_${role}_equipment`);
    localStorage.removeItem(`hearthroot_${role}_character`);
  } catch {}
}
