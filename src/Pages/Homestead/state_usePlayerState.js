// src/Pages/Homestead/state_usePlayerState.js
//
// Owns all per-player state (inventory, hotbar, equipment, character, day-gate)
// and the write-through caching that keeps it persistent.
//
// Each save:
//   1. Updates the React state + matching ref (so other callbacks see fresh values)
//   2. Writes the relevant localStorage cache key (so reload is instant)
//   3. Schedules a debounced PUT to the server (so cross-device + multi-tab works)
//
// Previously these were six near-identical `saveX` callbacks inline in
// index.jsx, each ~25 lines of refs + setState + cache write + snapshot build.
// They now share one `persist()` helper.
//
// Public surface preserves the old names so call sites don't need to change.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  emptyPlayerInventory, emptyHotbar,
  HOTBAR_BASE_SLOTS, INVENTORY_BASE_SLOTS,
  migrateToToolInstances, reconcileToolInstances,
} from "./Items";
import { defaultCharacter } from "./gameEngine";
import {
  readPlayerCache, readLegacyPlayerCache, clearLegacyPlayerCache, writePlayerCache,
} from "./state_playerCache";

const EMPTY_EQUIPMENT = { weapon: null, armor: null, accessory: null };

// Item → equipment slot mapping. Used by handleEquipItem / handleForceEquip.
const SLOT_MAP = {
  axe: "weapon", pickaxe: "weapon", iron_axe: "weapon", iron_pickaxe: "weapon",
  iron_sword: "weapon", hoe: "weapon", iron_hoe: "weapon",
  fishing_rod: "weapon", watering_can: "weapon",
  leather_armor: "armor", potion_satchel: "accessory",
};

export function usePlayerState(room) {
  // Track the latest room so save() can stamp the right id on cache writes
  // and cloud snapshots, even from callbacks captured in older renders.
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; }, [room]);

  // ── State + matching refs ─────────────────────────────────────────────────
  const [playerInventory, setPlayerInventory] = useState(() => emptyPlayerInventory());
  const [hotbar,          setHotbar]          = useState(() => emptyHotbar());
  const [hotbarSlots,     setHotbarSlots]     = useState(HOTBAR_BASE_SLOTS);
  const [equipment,       setEquipment]       = useState(() => ({ ...EMPTY_EQUIPMENT }));
  const [character,       setCharacter]       = useState(() => defaultCharacter());
  const [lastRunDay,      setLastRunDay]      = useState(-1);

  const playerInvRef  = useRef(playerInventory);
  const hotbarRef     = useRef(hotbar);
  const hotbarSlotRef = useRef(hotbarSlots);
  const equipmentRef  = useRef(equipment);
  const characterRef  = useRef(character);
  const lastRunDayRef = useRef(lastRunDay);
  useEffect(() => { playerInvRef.current  = playerInventory; }, [playerInventory]);
  useEffect(() => { hotbarRef.current     = hotbar;          }, [hotbar]);
  useEffect(() => { hotbarSlotRef.current = hotbarSlots;     }, [hotbarSlots]);
  useEffect(() => { equipmentRef.current  = equipment;       }, [equipment]);
  useEffect(() => { characterRef.current  = character;       }, [character]);
  useEffect(() => { lastRunDayRef.current = lastRunDay;      }, [lastRunDay]);

  // ── Cloud save plumbing ───────────────────────────────────────────────────
  const cloudSaveTimer  = useRef(null);
  const pendingStateRef = useRef(null);

  const flushPlayerStateToCloud = useCallback(async () => {
    const pending = pendingStateRef.current;
    if (!pending?.snap || !pending?.roomId) return;
    pendingStateRef.current = null;
    try {
      await api.put(`/homestead/rooms/${pending.roomId}/player-state`, pending.snap);
    } catch (e) {
      console.warn("[Hearthroot] Failed to sync player state:", e);
    }
  }, []);

  const scheduleCloudSave = useCallback((snap) => {
    // Capture roomId at schedule time so a pending save from room A can never
    // be flushed into room B if the player switches rooms quickly.
    pendingStateRef.current = { snap, roomId: roomRef.current?.id };
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(flushPlayerStateToCloud, 2000);
  }, [flushPlayerStateToCloud]);

  // Flush on unmount so nothing in flight is lost
  useEffect(() => () => {
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    flushPlayerStateToCloud();
  }, [flushPlayerStateToCloud]);

  // ── Snapshot helper: builds the server-shaped payload, layered onto refs ──
  const buildSnap = useCallback((overrides = {}) => ({
    inventory:    overrides.inventory    ?? playerInvRef.current,
    hotbar:       overrides.hotbar       ?? hotbarRef.current,
    hotbar_slots: overrides.hotbar_slots ?? hotbarSlotRef.current,
    equipment:    overrides.equipment    ?? equipmentRef.current,
    character:    overrides.character    ?? characterRef.current,
    last_run_day: overrides.last_run_day ?? lastRunDayRef.current,
    farm_plots:   {},
    node_state:   {},
  }), []);

  // ── Single persist helper used by every save wrapper ──────────────────────
  const persist = useCallback((cacheField, cacheValue, overrides) => {
    const id = roomRef.current?.id;
    if (id) writePlayerCache(id, cacheField, cacheValue);
    scheduleCloudSave(buildSnap(overrides));
  }, [buildSnap, scheduleCloudSave]);

  // ── Save wrappers (same external API as before) ───────────────────────────
  const saveInventory = useCallback((inv) => {
    // Reconcile the per-instance tool registry against the plain items count on
    // every write. Most callers already keep these in sync (crafting mints
    // instances via addToPlayerInventory; assignToHotbarSlot moves them by hand),
    // but the chest-transfer and market-buy paths bump items[tool] directly
    // through the raw items map. Without this, a tool withdrawn from the chest
    // had a count but no instance — durability couldn't resolve and the tool
    // became effectively unbreakable. Reconciling here is a no-op when already
    // consistent and backfills/trims instances otherwise.
    const reconciled = reconcileToolInstances(inv) ?? inv;
    setPlayerInventory(reconciled); playerInvRef.current = reconciled;
    persist("inventory", reconciled, { inventory: reconciled });
  }, [persist]);

  const saveHotbar = useCallback((hb) => {
    setHotbar(hb); hotbarRef.current = hb;
    persist("hotbar", hb, { hotbar: hb });
  }, [persist]);

  const saveHotbarSlots = useCallback((n) => {
    setHotbarSlots(n); hotbarSlotRef.current = n;
    persist("hotbar_slots", n, { hotbar_slots: n });
  }, [persist]);

  const saveEquipment = useCallback((eqOrUpdater) => {
    const apply = (prev) => {
      const next = typeof eqOrUpdater === "function" ? eqOrUpdater(prev) : eqOrUpdater;
      equipmentRef.current = next;
      persist("equipment", next, { equipment: next });
      return next;
    };
    if (typeof eqOrUpdater === "function") setEquipment(prev => apply(prev));
    else                                   setEquipment(apply(eqOrUpdater));
  }, [persist]);

  const saveCharacter = useCallback((ch) => {
    setCharacter(ch); characterRef.current = ch;
    persist("character", ch, { character: ch });
  }, [persist]);

  // Burn the current in-game day as "run used". Idempotent.
  const saveLastRunDay = useCallback((day) => {
    if (day == null || day < 0) return;
    if (lastRunDayRef.current === day) return;
    lastRunDayRef.current = day;
    setLastRunDay(day);
    persist("last_run_day", day, { last_run_day: day });
  }, [persist]);

  // ── Equipment toggle helpers ──────────────────────────────────────────────
  const handleEquipItem = useCallback((itemId) => {
    saveEquipment(prev => {
      const slot = SLOT_MAP[itemId];
      if (!slot) return prev;
      return { ...prev, [slot]: prev[slot] === itemId ? null : itemId };
    });
  }, [saveEquipment]);

  const handleForceEquip = useCallback((itemId) => {
    saveEquipment(prev => {
      const slot = SLOT_MAP[itemId];
      if (!slot || prev[slot] === itemId) return prev;
      return { ...prev, [slot]: itemId };
    });
  }, [saveEquipment]);

  // Unconditionally clear the weapon slot (used when player switches to a
  // non-equippable hotbar slot so the hoe/axe doesn't stay "equipped").
  const handleUnequipWeapon = useCallback(() => {
    saveEquipment(prev => {
      if (!prev.weapon) return prev;
      return { ...prev, weapon: null, activeIid: null };
    });
  }, [saveEquipment]);

  // ── Lifecycle helpers used when entering / leaving a room ─────────────────
  const resetToEmpty = useCallback(() => {
    const emptyInv = emptyPlayerInventory();
    const emptyHb  = emptyHotbar();
    const emptyEq  = { ...EMPTY_EQUIPMENT };
    setPlayerInventory(emptyInv);
    setHotbar(emptyHb);
    setHotbarSlots(HOTBAR_BASE_SLOTS);
    setEquipment(emptyEq);
    playerInvRef.current  = emptyInv;
    hotbarRef.current     = emptyHb;
    hotbarSlotRef.current = HOTBAR_BASE_SLOTS;
    equipmentRef.current  = emptyEq;
  }, []);

  const applyPlayerState = useCallback((state, roomId) => {
    // Normalise: old saves (pre-slot system) lack a `slots` field.
    const inv = state.inventory ?? emptyPlayerInventory();
    const normInv0 = (typeof inv.slots === "number" && !isNaN(inv.slots))
      ? inv
      : { ...inv, slots: INVENTORY_BASE_SLOTS };

    // Migrate to the tool-instance model. This:
    //   • Builds inventory.toolInstances[itemId] = [{ iid, dur }, ...] for every
    //     non-stackable durability tool the player owns, preserving any legacy
    //     durability values from the old equipment.durability map.
    //   • Strips the now-obsolete equipment.durability map.
    //   • Sets equipment.activeIid to the equipped instance's iid.
    //   • Attaches an iid to every hotbar tool slot and MOVES that instance
    //     out of inventory.toolInstances so the hotbar slot owns it
    //     (preventing double-counting).
    //   • Splits any legacy stacked tool hotbar slots (qty > 1) — only one
    //     instance stays in the slot; the rest go back to inventory.
    //   • Idempotent: running it on already-migrated data is a no-op.
    const rawEq = state.equipment ?? { ...EMPTY_EQUIPMENT };
    const rawHotbar = state.hotbar ?? [];
    const migrated = migrateToToolInstances(normInv0, rawEq, rawHotbar);
    const normInv = migrated.inventory;
    const normEq  = migrated.equipment;
    const normHb  = migrated.hotbar;

    setPlayerInventory(normInv);
    setHotbar(normHb);
    setHotbarSlots(state.hotbarSlots);
    setEquipment(normEq);
    setCharacter(state.character);
    playerInvRef.current = normInv;
    hotbarRef.current    = normHb;
    equipmentRef.current = normEq;

    const lrd = state.lastRunDay ?? -1;
    setLastRunDay(lrd);
    lastRunDayRef.current = lrd;

    // Warm the local cache with the server state
    if (roomId) {
      writePlayerCache(roomId, "inventory",    normInv);
      writePlayerCache(roomId, "hotbar",       normHb);
      writePlayerCache(roomId, "hotbar_slots", state.hotbarSlots);
      writePlayerCache(roomId, "equipment",    normEq);
      writePlayerCache(roomId, "character",    state.character);
      writePlayerCache(roomId, "last_run_day", lrd);
    }
  }, []);

  // Load player state from server (with optimistic cache + legacy migration).
  const initPlayerState = useCallback(async (roomId, assignedRole) => {
    // 1. Optimistic: apply localStorage cache immediately
    const cached = readPlayerCache(roomId);
    if (cached) {
      // Run the tool-instance migration on cached data too — legacy caches may
      // still hold the pre-instance shape (no toolInstances, scalar/array
      // durability on equipment).
      const cachedMigrated = migrateToToolInstances(
        cached.inventory ?? emptyPlayerInventory(),
        cached.equipment ?? { ...EMPTY_EQUIPMENT },
        cached.hotbar ?? emptyHotbar(),
      );
      setPlayerInventory(cachedMigrated.inventory);
      setHotbar(cachedMigrated.hotbar);
      setHotbarSlots(cached.hotbarSlots);
      setEquipment(cachedMigrated.equipment);
      setCharacter(cached.character);
      playerInvRef.current = cachedMigrated.inventory;
      hotbarRef.current    = cachedMigrated.hotbar;
      equipmentRef.current = cachedMigrated.equipment;
      if (cached.lastRunDay != null) {
        setLastRunDay(cached.lastRunDay);
        lastRunDayRef.current = cached.lastRunDay;
      }
    }

    // 2. Authoritative: fetch server state
    try {
      const { data: ps } = await api.get(`/homestead/rooms/${roomId}/player-state`);

      // Migration: if server is empty but legacy localStorage has data, push it up.
      const isServerEmpty = !ps.updated_at &&
        Object.keys(ps.inventory?.items ?? ps.inventory ?? {}).length === 0 &&
        (ps.hotbar ?? []).length === 0;

      if (isServerEmpty) {
        const legacy = readLegacyPlayerCache(assignedRole);
        if (legacy) {
          applyPlayerState(legacy, roomId);
          clearLegacyPlayerCache(assignedRole);
          scheduleCloudSave({
            inventory:    legacy.inventory,
            hotbar:       legacy.hotbar,
            hotbar_slots: legacy.hotbarSlots,
            equipment:    legacy.equipment,
            character:    legacy.character,
            last_run_day: -1,
            farm_plots:   {},
            node_state:   {},
          });
          return;
        }
      }

      // Normal path
      applyPlayerState({
        inventory:   ps.inventory   ?? emptyPlayerInventory(),
        hotbar:      ps.hotbar      ?? emptyHotbar(),
        hotbarSlots: ps.hotbar_slots ?? HOTBAR_BASE_SLOTS,
        equipment:   ps.equipment   ?? { ...EMPTY_EQUIPMENT },
        character:   ps.character   ?? defaultCharacter(),
        lastRunDay:  ps.last_run_day ?? -1,
      }, roomId);
    } catch (e) {
      console.warn("[Hearthroot] Failed to load player state from server:", e);
      // Cache already applied above — just continue.
    }
  }, [applyPlayerState, scheduleCloudSave]);

  return {
    // State
    playerInventory, hotbar, hotbarSlots, equipment, character, lastRunDay,

    // Refs (exposed for read-only access in tick callbacks — same as before)
    playerInvRef, hotbarRef, hotbarSlotRef, equipmentRef, characterRef, lastRunDayRef,

    // Saves
    saveInventory, saveHotbar, saveHotbarSlots, saveEquipment, saveCharacter, saveLastRunDay,

    // Equipment helpers
    handleEquipItem, handleForceEquip, handleUnequipWeapon,

    // Lifecycle
    initPlayerState, applyPlayerState, resetToEmpty,
    flushPlayerStateToCloud,
  };
}