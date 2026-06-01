// src/Pages/Homestead/index.jsx
//
// Root orchestrator. State machine for which phase we're in (lobby /
// homestead / run_lobby / run / loot) and the shared chest + placed objects
// for the room. Per-player state (inventory, hotbar, equipment, …) lives in
// usePlayerState; the lobby UI lives in lobby/HomesteadLobby; audio lives in
// audio/useGameAudio.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

import HomesteadView from "./HomesteadView";
import RunLobby      from "./RunLobby";
import ForestRun     from "./ForestRun";
import MiningRun     from "./MiningRun";
import FruitRun      from "./FruitRun";
import FishingRun    from "./FishingRun";
import GoblinKingRun from "./GoblinKingRun";
import LootSummary   from "./LootSummary";

import {
  emptyChest, normalizeChest, chestToMap,
  mergeLootIntoPlayerInventory,
  PLACEABLES,
  hasAnySword,
} from "./Items";
import { defaultObjects } from "./gameEngine";
import { useTownState } from "./useTownState";

import { useGameAudio }     from "./audio_useGameAudio";
import { HomesteadLobby }   from "./lobby_HomesteadLobby";
import { usePlayerState }   from "./state_usePlayerState";

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomesteadGame() {
  // ── Phase / room / role ────────────────────────────────────────────────────
  const [phase, setPhase] = useState("lobby");
  const [room,  setRoom]  = useState(null);
  const [role,  setRole]  = useState(null);
  const roomRef = useRef(null);
  useEffect(() => { roomRef.current = room; }, [room]);

  // ── Per-player state (inventory, hotbar, equipment, character, day-gate) ──
  const ps = usePlayerState(room);
  const {
    playerInventory, hotbar, hotbarSlots, equipment, character, lastRunDay,
    playerInvRef,
    saveInventory, saveHotbar, saveHotbarSlots, saveEquipment, saveCharacter, saveLastRunDay,
    handleForceEquip, handleUnequipWeapon,
    initPlayerState, resetToEmpty, flushPlayerStateToCloud,
  } = ps;

  // ── Shared chest ───────────────────────────────────────────────────────────
  const [chest,     setChest]     = useState(() => emptyChest());
  const [chestOpen, setChestOpen] = useState(false);
  const chestRef = useRef(chest);
  useEffect(() => { chestRef.current = chest; }, [chest]);

  // ── Placed objects ─────────────────────────────────────────────────────────
  const [placedObjects, setPlacedObjects] = useState(() => defaultObjects());

  // ── Run flow state ─────────────────────────────────────────────────────────
  const [runType,     setRunType]     = useState("forest");
  const [runSeed,     setRunSeed]     = useState(null);
  const [runCoOp,     setRunCoOp]     = useState(false);
  const [runLoot,     setRunLoot]     = useState(null);
  const [runKills,    setRunKills]    = useState(0);
  const [runOverflow, setRunOverflow] = useState({});
  const [isJoiningRun, setIsJoiningRun] = useState(false);
  const [joinRunSeed,  setJoinRunSeed]  = useState(null);
  const [joinRunType,  setJoinRunType]  = useState(null);

  // ── Town state ─────────────────────────────────────────────────────────────
  const town = useTownState(room, placedObjects);

  // Flush any pending player-state save when we leave (room change / unmount)
  useEffect(() => () => flushPlayerStateToCloud(), [flushPlayerStateToCloud]);

  // ── Room ready ─────────────────────────────────────────────────────────────
  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    roomRef.current = roomData;

    // Reset per-player state immediately so stale values from a previous
    // room don't flash while initPlayerState is fetching from the server.
    resetToEmpty();

    // Load chest from room
    if (roomData.chest_inventory && (
      Array.isArray(roomData.chest_inventory)
        ? roomData.chest_inventory.some(Boolean)
        : Object.keys(roomData.chest_inventory).length > 0
    )) {
      setChest(normalizeChest(roomData.chest_inventory));
    }

    // Load placed objects, normalising stale labels and stripping objects
    // that have been removed from defaultObjects since the save was written.
    const REMOVED_OBJECT_IDS = new Set(["tree_test", "ore_test"]);
    if (roomData.placed_objects?.length > 0) {
      const normalized = roomData.placed_objects
        .filter(obj => !REMOVED_OBJECT_IDS.has(obj.id))
        .map(obj => {
          // Migrate house_0: older saves have interact:false — fix it in place
          if (obj.id === "house_0") return { ...obj, interact: true, label: "[F] Sleep" };
          if (obj.isPlaceable && obj.interact) {
            const info = PLACEABLES[obj.type];
            if (info) return { ...obj, label: info.interactLabel ?? `[F] ${info.label}` };
          }
          return obj;
        });
      setPlacedObjects(normalized);
    }

    // Load player state from server (async, non-blocking).
    // This restores the persisted run gate (last_run_day) — do NOT reset it
    // here, or reloading the room would hand the player a free extra run.
    initPlayerState(roomData.id, assignedRole);

    setPhase("homestead");
  }

  // ── Run flow ───────────────────────────────────────────────────────────────
  const handleStartRun = useCallback(() => {
    setIsJoiningRun(false); setJoinRunSeed(null); setJoinRunType(null);
    setPhase("run_lobby");
  }, []);

  const handleJoinRun = useCallback((seed, rtype) => {
    // Joining a partner's co-op run counts as this player's one run for the
    // day. If already used, RunLobby will show the "already ran today" lock.
    setIsJoiningRun(true); setJoinRunSeed(seed ?? null); setJoinRunType(rtype ?? "forest");
    setPhase("run_lobby");
  }, []);

  const handleRunStart = useCallback(({ seed, coOp = false, runType: rt = "forest" }) => {
    // Burn this player's daily run the moment any run starts (solo / co-op
    // host / co-op join all funnel through here). Burning on START — not on
    // completion — means quitting and retrying can't farm extra runs.
    saveLastRunDay(town?.townState?.inGameDay ?? 0);
    setRunSeed(seed); setRunCoOp(coOp); setRunType(rt);
    setPhase("run");
  }, [saveLastRunDay, town]);

  const handleRunComplete = useCallback((loot) => {
    // Note: the daily run was already burned on START (see handleRunStart).
    // This handler only applies loot + final equipment durability.
    if (loot?._alreadyApplied) {
      if (loot._finalEquipment) saveEquipment(loot._finalEquipment);
      setRunLoot(loot._delta ?? {});
      setRunKills(loot.kills ?? 0);
      setRunOverflow({});
      setPhase("loot");
      return;
    }
    if (loot?._finalEquipment) saveEquipment(loot._finalEquipment);
    const { next, overflow } = mergeLootIntoPlayerInventory(playerInvRef.current, loot);
    saveInventory(next);
    setRunLoot(loot);
    setRunKills(loot.kills ?? 0);
    setRunOverflow(overflow);
    setPhase("loot");
  }, [playerInvRef, saveInventory, saveEquipment]);

  // ── Loot / chest / objects ─────────────────────────────────────────────────
  const handlePlayerInventoryUpdate = useCallback((inv) => saveInventory(inv), [saveInventory]);

  const handleChestUpdate = useCallback(async (newChest) => {
    setChest(newChest); chestRef.current = newChest;
    try { await api.patch(`/homestead/rooms/${roomRef.current?.id}/chest`, { chest_inventory: chestToMap(newChest) }); }
    catch (e) { console.warn("[Hearthroot] Failed to save chest:", e); }
  }, []);

  const handleReturnHome = useCallback(() => setPhase("homestead"), []);

  const handleObjectsUpdate = useCallback(async (newObjects) => {
    setPlacedObjects(newObjects);
    town.checkArrivals(newObjects);
    try { await api.patch(`/homestead/rooms/${roomRef.current?.id}/objects`, { placed_objects: newObjects }); }
    catch (e) { console.warn("[Hearthroot] Failed to save objects:", e); }
  }, [town.checkArrivals]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLobbyCancel = useCallback(() => setPhase("homestead"), []);

  // ── Audio ──────────────────────────────────────────────────────────────────
  const { unlockAudio } = useGameAudio(phase, runType);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown",     unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown",     unlock);
    };
  }, [unlockAudio]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === "lobby") return <HomesteadLobby onRoomReady={handleRoomReady} />;

  if (phase === "homestead") return (
    <HomesteadView
      key={room?.id}
      room={room} role={role}
      playerInventory={playerInventory}
      onPlayerInventoryUpdate={saveInventory}
      hotbarSlots={hotbarSlots}
      onHotbarSlotsUpdate={saveHotbarSlots}
      chest={chest} chestOpen={chestOpen}
      onOpenChest={() => setChestOpen(true)}
      onCloseChest={() => setChestOpen(false)}
      onChestUpdate={handleChestUpdate}
      equipment={equipment}
      onEquipItem={handleForceEquip}
      onUnequipWeapon={handleUnequipWeapon}
      onEquipmentUpdate={saveEquipment}
      character={character}
      onCharacterUpdate={saveCharacter}
      hotbar={hotbar}
      onHotbarChange={saveHotbar}
      placedObjects={placedObjects}
      onObjectsUpdate={handleObjectsUpdate}
      town={town}
      canStartRun={lastRunDay < (town?.townState?.inGameDay ?? 0)}
      onStartRun={handleStartRun}
      onJoinRun={handleJoinRun}
    />
  );

  if (phase === "run_lobby") return (
    <RunLobby
      room={room} role={role}
      joining={isJoiningRun} joinSeed={joinRunSeed} runType={joinRunType}
      equipment={equipment}
      canStartRun={lastRunDay < (town?.townState?.inGameDay ?? 0)}
      hasSword={hasAnySword(playerInventory, equipment)}
      onRunStart={handleRunStart} onCancel={handleLobbyCancel}
    />
  );

  if (phase === "run") {
    const runKey = `run_${runSeed}`;
    const sharedProps = {
      room, seed: runSeed, coOp: runCoOp,
      isHost: runCoOp ? !isJoiningRun : true,
      onRunComplete: handleRunComplete,
      character, equipment, onEquipItem: handleForceEquip,
      onEquipmentUpdate: saveEquipment,
      hotbar, onHotbarChange: saveHotbar,
      hotbarSlots, onHotbarSlotsUpdate: saveHotbarSlots,
      playerInventory, onPlayerInventoryUpdate: saveInventory,
      chest,
    };
    if (runType === "mining")  return <MiningRun  key={runKey} {...sharedProps} />;
    if (runType === "fruit")   return <FruitRun   key={runKey} {...sharedProps} />;
    if (runType === "fishing") return <FishingRun key={runKey} {...sharedProps} />;
    if (runType === "goblin")  return <GoblinKingRun key={runKey} {...sharedProps} />;
    return <ForestRun key={runKey} {...sharedProps} />;
  }

  if (phase === "loot") return (
    <LootSummary
      room={room}
      runLoot={runLoot}
      kills={runKills}
      overflow={runOverflow}
      playerInventory={playerInventory}
      chest={chest}
      onReturnHome={handleReturnHome}
      onPlayerInventoryUpdate={handlePlayerInventoryUpdate}
      onChestUpdate={handleChestUpdate}
    />
  );

  return null;
}