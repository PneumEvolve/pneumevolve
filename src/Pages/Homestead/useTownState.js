// src/Pages/Homestead/useTownState.js
// ─────────────────────────────────────────────────────────────────────────────
// Owns all town state:
//   - NPC list (who lives here, where they are, assignments, mood)
//   - Treasury contents (food items stocked by the player)
//   - Town flags (mayorAssigned, buildingsUnlocked)
//   - Arrival logic (checks conditions and moves NPCs in)
//
// Persistence: town state lives in the Supabase room under `town_state`.
// Both players load from and write to the same room, so changes are shared.
//
// The canvas game loop reads refs (npcListRef, treasuryRef) so it never
// triggers a re-render on every tick — same pattern as useHomesteadState.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import {
  OBJ,
  NPC_ROSTER,
  NPC_BORDER_X,
  NPC_BORDER_Y,
  TILE,
  createNPC,
} from "./gameEngine";
import { ITEMS } from "./Items";

// ─── Constants ────────────────────────────────────────────────────────────────

// How long food must be in the treasury before the first generic resident arrives.
// In real seconds (not in-game time), since we have no offline ticking.
export const TREASURY_FOOD_WAIT_MS = 60 * 1000; // 1 minute — tweak freely

// Food categories accepted by the treasury (anything with useEffect.heal)
export function isTreasuryFood(itemId) {
  return !!(ITEMS[itemId]?.useEffect?.heal);
}

// ─── Empty / default shapes ───────────────────────────────────────────────────

function emptyTownState() {
  return {
    npcs:             [],     // array of NPC data objects (see gameEngine.js)
    treasury:         {},     // { [itemId]: qty } — food stocked in the treasury
    treasuryFoodSince: null,  // timestamp (ms) when food was first placed — triggers arrival
    mayorAssigned:    false,  // true once first resident is assigned to town_hall
    buildingsUnlocked: false, // true once Mayor is assigned (gates market_stall etc.)
    inGameDay:        0,      // increments each time the player returns from a run (future use)
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count resident_home objects that have no NPC assigned to them */
function countFreeHomes(placedObjects, npcs) {
  const assignedHomeIds = new Set(npcs.map(n => n.homeObjectId).filter(Boolean));
  return placedObjects.filter(
    o => o.type === OBJ.RESIDENT_HOME && !assignedHomeIds.has(o.id)
  ).length;
}

/** Find a free home object and return it, or null */
function findFreeHome(placedObjects, npcs) {
  const assignedHomeIds = new Set(npcs.map(n => n.homeObjectId).filter(Boolean));
  return placedObjects.find(
    o => o.type === OBJ.RESIDENT_HOME && !assignedHomeIds.has(o.id)
  ) ?? null;
}

/** Get the world-pixel centre of a placed object */
function objectCentre(obj) {
  return {
    x: (obj.tx + (obj.w ?? 1) * 0.5) * TILE,
    y: (obj.ty + (obj.h ?? 1) * 0.5) * TILE,
  };
}

/** Check whether a given named NPC's trigger building exists in placedObjects */
function hasTriggerBuilding(npcId, placedObjects) {
  const roster = NPC_ROSTER[npcId];
  if (!roster?.triggerBuilding) return true; // no trigger required (bex, generic)
  return placedObjects.some(o => o.type === roster.triggerBuilding);
}

/** Check whether the named NPC is already present in the NPC list */
function npcAlreadyPresent(npcId, npcs) {
  return npcs.some(n => n.npcId === npcId);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useTownState(room, placedObjects)
 *
 * @param {object|null} room           — the Supabase room object (has room.id)
 * @param {Array}       placedObjects  — current world objects array (react state from index.jsx)
 */
export function useTownState(room, placedObjects, sendTownStateUpdated) {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [townState, setTownState] = useState(() => emptyTownState());
  const townRef = useRef(townState);

  // Allow late-wiring of the broadcast function (set by HomesteadView after
  // useHearthroom resolves, since both hooks live in different components).
  const sendBroadcastRef = useRef(sendTownStateUpdated ?? null);
  useEffect(() => { sendBroadcastRef.current = sendTownStateUpdated ?? null; }, [sendTownStateUpdated]);
  const setSendBroadcast = useCallback((fn) => { sendBroadcastRef.current = fn; }, []);

  // Keep ref in sync so game loop can read without stale closure
  useEffect(() => { townRef.current = townState; }, [townState]);

  // ── Dirty-save debounce ────────────────────────────────────────────────────
  // We don't want to hit Supabase on every NPC step tick.
  // Mark dirty and flush on a 2-second debounce.
  const saveTimerRef = useRef(null);
  const pendingRef   = useRef(null);

  const flushSave = useCallback(async () => {
    const state = pendingRef.current;
    if (!state || !room?.id) return;
    pendingRef.current = null;
    try {
      await api.patch(`/homestead/rooms/${room.id}/town`, { town_state: state });
    } catch (e) {
      console.warn("[Town] Failed to save town state:", e);
    }
  }, [room?.id]);

  const scheduleSave = useCallback((state) => {
    pendingRef.current = state;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 2000);
  }, [flushSave]);

  // Immediate save — use for important mutations (NPC arrives, Mayor assigned)
  const saveNow = useCallback(async (state) => {
    if (!room?.id) return;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    pendingRef.current = null;
    try {
      await api.patch(`/homestead/rooms/${room.id}/town`, { town_state: state });
    } catch (e) {
      console.warn("[Town] Failed to save town state:", e);
    }
  }, [room?.id]);

  // ── Load from room on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.town_state) return;
    const loaded = { ...emptyTownState(), ...room.town_state };
    setTownState(loaded);
    townRef.current = loaded;
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Internal mutator ──────────────────────────────────────────────────────
  // All mutations go through here so ref + state + persistence stay in sync.
  // Pass broadcastTown=true to push the new state to the partner over WebSocket.
  const applyUpdate = useCallback((updater, immediate = false, broadcastTown = false) => {
    let next;
    setTownState(prev => {
      next = typeof updater === "function" ? updater(prev) : updater;
      townRef.current = next;
      return next;
    });
    // Schedule persist (setTimeout so next is definitely set)
    setTimeout(() => {
      if (next) {
        if (immediate) saveNow(next);
        else scheduleSave(next);
        if (broadcastTown) sendBroadcastRef.current?.(next);
      }
    }, 0);
  }, [saveNow, scheduleSave]);

  // ── Treasury ───────────────────────────────────────────────────────────────

  /**
   * Add food items to the treasury.
   * Called when the player F-interacts with the treasury chest and deposits food.
   * @param {{ [itemId]: qty }} items — items to add
   */
  const depositToTreasury = useCallback((items) => {
    applyUpdate(prev => {
      const next = { ...prev, treasury: { ...prev.treasury } };
      let addedFood = false;
      for (const [id, qty] of Object.entries(items)) {
        if (!isTreasuryFood(id) || qty <= 0) continue;
        next.treasury[id] = (next.treasury[id] ?? 0) + qty;
        addedFood = true;
      }
      // Record when food was first stocked (triggers first-resident arrival timer)
      if (addedFood && !next.treasuryFoodSince) {
        next.treasuryFoodSince = Date.now();
      }
      return next;
    }, true); // immediate save — player action
  }, [applyUpdate]);

  /**
   * Remove food items from the treasury (player takes items back out).
   * @param {{ [itemId]: qty }} items
   */
  const withdrawFromTreasury = useCallback((items) => {
    applyUpdate(prev => {
      const next = { ...prev, treasury: { ...prev.treasury } };
      for (const [id, qty] of Object.entries(items)) {
        if (!next.treasury[id]) continue;
        next.treasury[id] = Math.max(0, next.treasury[id] - qty);
        if (next.treasury[id] === 0) delete next.treasury[id];
      }
      // If treasury is now empty, reset the food timer
      const hasFood = Object.values(next.treasury).some(q => q > 0);
      if (!hasFood) next.treasuryFoodSince = null;
      return next;
    }, true);
  }, [applyUpdate]);

  /** Total food units currently in the treasury */
  const treasuryFoodCount = useCallback(() => {
    return Object.values(townRef.current.treasury).reduce((s, q) => s + q, 0);
  }, []);

  // ── NPC arrival logic ──────────────────────────────────────────────────────

  /**
   * Check arrival conditions and move any eligible NPCs in.
   * Called from the game loop or after any state mutation that might trigger arrival.
   * Pure logic — does not access DOM or trigger effects directly.
   *
   * Conditions for generic resident:
   *   1. Treasury has food AND treasuryFoodSince is at least TREASURY_FOOD_WAIT_MS ago
   *   2. At least one free home exists
   *   3. No generic NPC already present without a home (don't spawn infinitely)
   *
   * Conditions for named NPCs (maren, finn, etc.):
   *   1. Mayor is assigned (buildingsUnlocked = true), OR npcId has no triggerBuilding (bex)
   *   2. Their trigger building exists in placedObjects
   *   3. At least one free home exists
   *   4. They're not already present
   */
  const checkArrivals = useCallback(() => {
    const state = townRef.current;
    const now   = Date.now();
    const objs  = placedObjects; // current snapshot from parent

    let changed = false;
    let next = { ...state, npcs: [...state.npcs] };

    // ── Generic resident ────────────────────────────────────────────────────
    const genericPresent = next.npcs.some(n => n.npcId === "generic");
    const hasTreasury    = objs.some(o => o.type === OBJ.TREASURY_CHEST);
    const hasFood        = next.treasuryFoodSince !== null &&
                           (now - next.treasuryFoodSince) >= TREASURY_FOOD_WAIT_MS;
    const freeHome       = findFreeHome(objs, next.npcs);

    if (!genericPresent && hasTreasury && hasFood && freeHome) {
      const { x, y } = objectCentre(freeHome);
      const npc = createNPC("generic", x, y, {
        id:           "npc_generic_0",
        homeObjectId: freeHome.id,
        mood:         "neutral",
      });
      next.npcs.push(npc);
      changed = true;
    }

    // ── Named NPCs ──────────────────────────────────────────────────────────
    // Only check if Mayor is assigned OR the NPC has no triggerBuilding (bex)
    if (next.buildingsUnlocked || next.npcs.some(n => n.npcId === "generic")) {
      for (const npcId of Object.keys(NPC_ROSTER)) {
        if (npcId === "generic") continue;

        const roster = NPC_ROSTER[npcId];
        const alreadyPresent = npcAlreadyPresent(npcId, next.npcs);
        if (alreadyPresent) continue;

        // Bex has no trigger building — just needs a free home
        const triggerMet = !roster.triggerBuilding ||
          (next.buildingsUnlocked && hasTriggerBuilding(npcId, objs));
        if (!triggerMet) continue;

        const freeHomeForNPC = findFreeHome(objs, next.npcs);
        if (!freeHomeForNPC) {
          // Trigger building exists but no home — NPC waits at border
          const alreadyWaiting = next.npcs.some(
            n => n.npcId === npcId && n.waitingAtBorder
          );
          if (!alreadyWaiting && hasTriggerBuilding(npcId, objs) && next.buildingsUnlocked) {
            const waitingNPC = createNPC(npcId, NPC_BORDER_X, NPC_BORDER_Y, {
              id:              `npc_${npcId}`,
              waitingAtBorder: true,
              mood:            "neutral",
            });
            next.npcs.push(waitingNPC);
            changed = true;
          }
          continue;
        }

        // Home available — move in
        const { x, y } = objectCentre(freeHomeForNPC);
        const npc = createNPC(npcId, x, y, {
          id:              `npc_${npcId}`,
          homeObjectId:    freeHomeForNPC.id,
          waitingAtBorder: false,
          mood:            "happy",
        });
        // If they were waiting at the border, remove the waiting version
        next.npcs = next.npcs.filter(
          n => !(n.npcId === npcId && n.waitingAtBorder)
        );
        next.npcs.push(npc);
        changed = true;
      }
    }

    if (changed) {
      applyUpdate(next, true, true); // immediate save + broadcast to partner
    }
  }, [placedObjects, applyUpdate]);

  // ── Mayor assignment ───────────────────────────────────────────────────────

  /**
   * Assign an NPC to the Town Hall as Mayor.
   * This flips buildingsUnlocked = true, unlocking all named NPC trigger buildings.
   * @param {string} npcId  — the npc's id field (not npcId), e.g. "npc_generic_0"
   */
  const assignMayor = useCallback((npcInstanceId) => {
    applyUpdate(prev => {
      const npc = prev.npcs.find(n => n.id === npcInstanceId);
      if (!npc) return prev;
      const townHall = placedObjects.find(o => o.type === OBJ.TOWN_HALL);
      if (!townHall) return prev;

      const updatedNPCs = prev.npcs.map(n =>
        n.id === npcInstanceId
          ? { ...n, assignment: OBJ.TOWN_HALL }
          : n
      );
      return {
        ...prev,
        npcs:             updatedNPCs,
        mayorAssigned:    true,
        buildingsUnlocked: true,
      };
    }, true); // immediate — important milestone
  }, [placedObjects, applyUpdate]);

  // ── General NPC assignment ─────────────────────────────────────────────────

  /**
   * Assign any NPC to any building.
   * @param {string} npcInstanceId  — npc.id
   * @param {string|null} buildingType — OBJ type string, or null to unassign
   */
  const assignNPC = useCallback((npcInstanceId, buildingType) => {
    applyUpdate(prev => ({
      ...prev,
      npcs: prev.npcs.map(n =>
        n.id === npcInstanceId
          ? { ...n, assignment: buildingType }
          : n
      ),
    }), true);
  }, [applyUpdate]);

  // ── NPC rename ─────────────────────────────────────────────────────────────

  /**
   * Rename any NPC. Either player can rename at any time.
   * @param {string} npcInstanceId
   * @param {string} newName
   */
  const renameNPC = useCallback((npcInstanceId, newName) => {
    if (!newName?.trim()) return;
    applyUpdate(prev => ({
      ...prev,
      npcs: prev.npcs.map(n =>
        n.id === npcInstanceId
          ? { ...n, name: newName.trim() }
          : n
      ),
    }), true);
  }, [applyUpdate]);

  // ── Quest progress ─────────────────────────────────────────────────────────

  /**
   * Deliver a quest item to an NPC.
   * Called when the player talks to an NPC and chooses "give item".
   * @param {string} npcInstanceId
   * @param {number} qty  — how many quest items are being delivered
   * @returns {{ questComplete: boolean, newProgress: number } | null}
   */
  const deliverQuestItem = useCallback((npcInstanceId, qty = 1) => {
    let result = null;
    applyUpdate(prev => {
      const npc = prev.npcs.find(n => n.id === npcInstanceId);
      if (!npc || npc.questComplete) return prev;

      const roster = NPC_ROSTER[npc.npcId];
      if (!roster?.questItem || !roster.questQty) return prev;

      const newProgress = Math.min(
        (npc.questProgress ?? 0) + qty,
        roster.questQty
      );
      const questComplete = newProgress >= roster.questQty;
      result = { questComplete, newProgress };

      return {
        ...prev,
        npcs: prev.npcs.map(n =>
          n.id === npcInstanceId
            ? { ...n, questProgress: newProgress, questComplete, mood: questComplete ? "happy" : n.mood }
            : n
        ),
      };
    }, true);
    return result;
  }, [applyUpdate]);

  // ── NPC position update (called by game loop) ──────────────────────────────

  /**
   * Sync NPC positions back to state after the game loop moves them.
   * Called at a low frequency (every ~500ms) to avoid flooding state updates.
   * The game loop reads from townRef directly for rendering; this just persists.
   * @param {Array} npcs — the mutated NPC array from updateNPCs()
   */
  const syncNPCPositions = useCallback((npcs) => {
    // Update ref immediately (no re-render needed — canvas reads ref)
    townRef.current = { ...townRef.current, npcs };
    // Debounced persist
    scheduleSave(townRef.current);
  }, [scheduleSave]);

  // ── Increment in-game day (call when player returns from a run) ───────────

  const incrementDay = useCallback(() => {
    applyUpdate(prev => ({ ...prev, inGameDay: (prev.inGameDay ?? 0) + 1 }));
  }, [applyUpdate]);

  // ── Derived read-only values ───────────────────────────────────────────────

  /** True if the treasury has any food right now */
  const treasuryHasFood = townState.treasuryFoodSince !== null &&
    Object.values(townState.treasury).some(q => q > 0);

  /** How many NPCs are currently in town (not waiting at border) */
  const residentCount = townState.npcs.filter(n => !n.waitingAtBorder).length;

  /** Free homes available */
  const freeHomeCount = countFreeHomes(placedObjects, townState.npcs);

  /** Whether the Mayor slot is filled */
  const { mayorAssigned, buildingsUnlocked } = townState;

  // ── Remote town state sync (called when partner broadcasts town_state_updated) ─

  /**
   * Apply a town state received from the partner over WebSocket.
   * Merges with the empty shape so missing fields get defaults.
   * Does NOT save or re-broadcast — the sender already persisted it.
   */
  const applyRemoteTownState = useCallback((incoming) => {
    const merged = { ...emptyTownState(), ...incoming };
    setTownState(merged);
    townRef.current = merged;
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Flush any pending save
      if (pendingRef.current && room?.id) {
        api.patch(`/homestead/rooms/${room.id}/town`, { town_state: pendingRef.current })
          .catch(() => {});
      }
    };
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  return {
    // State (for React rendering)
    townState,
    townRef,           // ref for game loop reads (no re-render cost)

    // Treasury
    depositToTreasury,
    withdrawFromTreasury,
    treasuryFoodCount,
    treasuryHasFood,

    // NPC management
    checkArrivals,
    assignMayor,
    assignNPC,
    renameNPC,
    deliverQuestItem,
    syncNPCPositions,
    applyRemoteTownState,
    setSendBroadcast,

    // Day counter
    incrementDay,

    // Derived helpers
    residentCount,
    freeHomeCount,
    mayorAssigned,
    buildingsUnlocked,
  };
}