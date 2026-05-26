// src/Pages/Homestead/index.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import HomesteadView from "./HomesteadView";
import RunLobby      from "./RunLobby";
import ForestRun     from "./ForestRun";
import MiningRun     from "./MiningRun";
import FruitRun      from "./FruitRun";
import FishingRun    from "./FishingRun";
import LootSummary   from "./LootSummary";
import {
  emptyChest, mergeIntoChest, normalizeChest, chestToMap,
  emptyPlayerInventory, mergeLootIntoPlayerInventory,
  HOTBAR_BASE_SLOTS, HOTBAR_MAX_SLOTS, emptyHotbar,
  PLACEABLES,
} from "./Items";
import { defaultObjects, defaultCharacter } from "./gameEngine";
import { useTownState } from "./useTownState";

const SAVE_KEY = "hearthroot_room";

// ─── Per-player localStorage keys ─────────────────────────────────────────────
// We key everything by role ("p1" | "p2") so two players on the same device
// keep independent data without collisions.
function playerKey(role, suffix) {
  return `hearthroot_${role}_${suffix}`;
}

function loadPlayerState(role) {
  try {
    const inv  = localStorage.getItem(playerKey(role, "inventory"));
    const hb   = localStorage.getItem(playerKey(role, "hotbar"));
    const hbs  = localStorage.getItem(playerKey(role, "hotbar_slots"));
    const eq   = localStorage.getItem(playerKey(role, "equipment"));
    const char = localStorage.getItem(playerKey(role, "character"));
    return {
      inventory:   inv  ? JSON.parse(inv)  : emptyPlayerInventory(),
      hotbar:      hb   ? JSON.parse(hb)   : emptyHotbar(),
      hotbarSlots: hbs  ? JSON.parse(hbs)  : HOTBAR_BASE_SLOTS,
      equipment:   eq   ? JSON.parse(eq)   : { weapon: null, armor: null, accessory: null },
      character:   char ? JSON.parse(char) : defaultCharacter(),
    };
  } catch {
    return {
      inventory:   emptyPlayerInventory(),
      hotbar:      emptyHotbar(),
      hotbarSlots: HOTBAR_BASE_SLOTS,
      equipment:   { weapon: null, armor: null, accessory: null },
      character:   defaultCharacter(),
    };
  }
}

function savePlayerField(role, suffix, value) {
  try { localStorage.setItem(playerKey(role, suffix), JSON.stringify(value)); } catch {}
}

// ─── Audio ────────────────────────────────────────────────────────────────────
const AUDIO_HOMESTEAD  = "/audio/homestead.mp3";
const AUDIO_RUN_TRACKS = {
  default: "/audio/run.mp3",
};
const FADE_S = 1.5;

function useGameAudio(phase, runType) {
  const ctxRef    = useRef(null);
  const tracksRef = useRef({});
  const activeRef = useRef(null);
  const fadeRef   = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);

  const loadTrack = useCallback(async (url) => {
    const existing = tracksRef.current[url];
    if (existing) return existing;
    const ctx   = getCtx();
    const entry = { buffer: null, gainNode: ctx.createGain(), sourceNode: null };
    entry.gainNode.gain.value = 0;
    entry.gainNode.connect(ctx.destination);
    tracksRef.current[url] = entry;
    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      entry.buffer = await ctx.decodeAudioData(ab);
    } catch (e) { console.warn("[audio] failed to load", url, e); }
    return entry;
  }, [getCtx]);

  const playTrack = useCallback((entry, ctx) => {
    if (!entry.buffer) return;
    if (entry.sourceNode) { try { entry.sourceNode.stop(); } catch {} entry.sourceNode.disconnect(); }
    const src = ctx.createBufferSource();
    src.buffer = entry.buffer; src.loop = true;
    src.connect(entry.gainNode); src.start(0);
    entry.sourceNode = src;
  }, []);

  const crossfadeTo = useCallback(async (targetUrl) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") return;
    const [incoming, outgoing] = await Promise.all([
      loadTrack(targetUrl),
      activeRef.current ? loadTrack(activeRef.current) : Promise.resolve(null),
    ]);
    if (!incoming.buffer) return;
    if (!incoming.sourceNode) playTrack(incoming, ctx);
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const inStart = incoming.gainNode.gain.value;
    const outStart = outgoing?.gainNode.gain.value ?? 0;
    const t0 = performance.now();
    function tick() {
      const p = Math.min((performance.now() - t0) / 1000 / FADE_S, 1);
      const ease = p * p * (3 - 2 * p);
      incoming.gainNode.gain.value = inStart + (1 - inStart) * ease;
      if (outgoing) outgoing.gainNode.gain.value = outStart * (1 - ease);
      if (p < 1) { fadeRef.current = requestAnimationFrame(tick); }
      else {
        incoming.gainNode.gain.value = 1;
        if (outgoing) { outgoing.gainNode.gain.value = 0; try { outgoing.sourceNode?.stop(); } catch {} outgoing.sourceNode = null; }
        fadeRef.current = null;
      }
    }
    fadeRef.current = requestAnimationFrame(tick);
    activeRef.current = targetUrl;
  }, [getCtx, loadTrack, playTrack]);

  useEffect(() => {
    const isRun = phase === "run" || phase === "run_lobby";
    const target = isRun ? (AUDIO_RUN_TRACKS[runType] ?? AUDIO_RUN_TRACKS.default) : AUDIO_HOMESTEAD;
    loadTrack(AUDIO_HOMESTEAD);
    loadTrack(AUDIO_RUN_TRACKS[runType] ?? AUDIO_RUN_TRACKS.default);
    crossfadeTo(target);
  }, [phase, runType, crossfadeTo, loadTrack]);

  useEffect(() => () => {
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    Object.values(tracksRef.current).forEach(t => { try { t.sourceNode?.stop(); } catch {} });
    ctxRef.current?.close();
  }, []);

  const unlockAudio = useCallback(async () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
      if (activeRef.current) {
        const entry = tracksRef.current[activeRef.current];
        if (entry?.buffer && !entry.sourceNode) { playTrack(entry, ctx); entry.gainNode.gain.value = 1; }
      }
    }
  }, [getCtx, playTrack]);

  return { unlockAudio };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeSave(room, role) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ id: room.id, join_code: room.join_code, role, savedAt: Date.now() })); } catch {}
}
function timeSince(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Entry lobby ──────────────────────────────────────────────────────────────
function HomesteadLobby({ onRoomReady }) {
  const [save]     = useState(() => loadSave());
  const [mode,     setMode]    = useState(save ? "saved" : "fresh");
  const [joinCode, setJoinCode]= useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(null);

  useEffect(() => {
    if (save) return;
    api.get("/homestead/rooms/mine")
      .then(({ data }) => { writeSave(data, data.role); setMode("saved"); })
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setLoading(true); setError(null);
    try { const { data } = await api.post("/homestead/rooms"); onRoomReady(data, "p1", true); }
    catch (e) { setError(e?.response?.data?.detail || "Couldn't create room."); }
    finally { setLoading(false); }
  }
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try { const { data } = await api.post("/homestead/rooms/join", { join_code: code }); onRoomReady(data, "p2", true); }
    catch (e) { setError(e?.response?.data?.detail || "Room not found."); }
    finally { setLoading(false); }
  }
  async function handleResume() {
    if (!save) return;
    setLoading(true); setError(null);
    try { const { data } = await api.get(`/homestead/rooms/${save.id}`); onRoomReady(data, save.role, false); }
    catch { setError("Couldn't reconnect. The room may have expired."); setMode("fresh"); }
    finally { setLoading(false); }
  }

  const btnBase = { padding: "16px", borderRadius: 12, cursor: "pointer", fontSize: 13, fontFamily: "monospace", opacity: loading ? 0.4 : 1 };

  return (
    <main style={{ height: "100svh", background: "#0a120a", color: "#f5e6c8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, fontFamily: "monospace", padding: "0 24px", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 10 }}>hearthroot</p>
        <h1 style={{ fontSize: 28, fontWeight: 400, color: "rgba(200,230,160,0.9)", letterSpacing: "0.05em" }}>your homestead</h1>
      </div>

      {mode === "saved" && save && (
        <>
          <div style={{ borderRadius: 12, border: "1px solid rgba(200,230,120,0.15)", padding: "18px 20px", background: "rgba(200,230,120,0.04)", width: "100%", maxWidth: 300 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.16em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 10 }}>saved homestead</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22, letterSpacing: "0.14em", color: "rgba(200,230,120,0.9)" }}>{save.join_code}</span>
              <span style={{ fontSize: 10, color: "rgba(245,230,200,0.3)" }}>· {save.role === "p1" ? "host" : "guest"}{save.savedAt ? ` · ${timeSince(save.savedAt)}` : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
            <button onClick={handleResume} disabled={loading} style={{ ...btnBase, background: "rgba(200,230,120,0.08)", border: "1px solid rgba(200,230,120,0.25)", color: "rgba(200,230,120,0.9)" }}>
              {loading ? "connecting…" : "resume homestead →"}
            </button>
            <button onClick={() => setMode("fresh")} disabled={loading} style={{ ...btnBase, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(245,230,200,0.35)", fontSize: 11 }}>
              start fresh
            </button>
          </div>
        </>
      )}

      {mode === "fresh" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
          <button onClick={handleCreate} disabled={loading} style={{ ...btnBase, background: "rgba(200,230,120,0.08)", border: "1px solid rgba(200,230,120,0.25)", color: "rgba(200,230,120,0.9)" }}>
            {loading ? "creating…" : "create homestead"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="JOIN CODE"
              style={{ flex: 1, padding: "14px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f5e6c8", fontSize: 13, fontFamily: "monospace", letterSpacing: "0.12em", outline: "none" }}
            />
            <button onClick={handleJoin} disabled={loading || !joinCode.trim()} style={{ ...btnBase, padding: "14px 18px", background: "rgba(200,230,120,0.06)", border: "1px solid rgba(200,230,120,0.2)", color: "rgba(200,230,120,0.8)" }}>
              join
            </button>
          </div>
          {save && (
            <button onClick={() => setMode("saved")} style={{ ...btnBase, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(245,230,200,0.25)", fontSize: 10 }}>
              ← back to saved room
            </button>
          )}
          {error && <p style={{ fontSize: 11, color: "rgba(255,120,80,0.8)", textAlign: "center" }}>{error}</p>}
        </div>
      )}
    </main>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomesteadGame() {
  const [phase,   setPhase]  = useState("lobby");
  const [room,    setRoom]   = useState(null);
  const [role,    setRole]   = useState(null);
  const roleRef = useRef(null);
  const roomRef = useRef(null);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { roleRef.current = role; }, [role]);

  // ── Shared chest (no slot cap, synced to DB + partner) ─────────────────────
  const [chest,    setChest]   = useState(() => emptyChest());
  const chestRef = useRef(chest);
  useEffect(() => { chestRef.current = chest; }, [chest]);

  // ── Per-player state ───────────────────────────────────────────────────────
  // Loaded from localStorage keyed by role once the player enters their room.
  const [playerInventory, setPlayerInventory] = useState(() => emptyPlayerInventory());
  const [hotbar,          setHotbar]          = useState(() => emptyHotbar());
  const [hotbarSlots,     setHotbarSlots]     = useState(HOTBAR_BASE_SLOTS);
  const [equipment,       setEquipment]       = useState(() => ({ weapon: null, armor: null, accessory: null }));
  const [character,       setCharacter]       = useState(() => defaultCharacter());

  const playerInvRef  = useRef(playerInventory);
  const hotbarRef     = useRef(hotbar);
  const hotbarSlotRef = useRef(hotbarSlots);
  useEffect(() => { playerInvRef.current  = playerInventory; }, [playerInventory]);
  useEffect(() => { hotbarRef.current     = hotbar; }, [hotbar]);
  useEffect(() => { hotbarSlotRef.current = hotbarSlots; }, [hotbarSlots]);

  // ── Run state ──────────────────────────────────────────────────────────────
  const [runType,   setRunType]  = useState("forest");
  const [runSeed,   setRunSeed]  = useState(null);
  const [runCoOp,   setRunCoOp]  = useState(false);
  const [runLoot,   setRunLoot]  = useState(null);    // raw { [id]: qty }
  const [runKills,  setRunKills] = useState(0);
  const [runOverflow, setRunOverflow] = useState({}); // items that didn't fit

  const [isJoiningRun, setIsJoiningRun] = useState(false);
  const [joinRunSeed,  setJoinRunSeed]  = useState(null);
  const [joinRunType,  setJoinRunType]  = useState(null);

  const [placedObjects, setPlacedObjects] = useState(() => defaultObjects());
  const [chestOpen,     setChestOpen]     = useState(false);

  // ── Town state ─────────────────────────────────────────────────────────────
  // Owns NPC list, treasury, Mayor assignment, building unlocks.
  // Persisted to Supabase under room.town_state so both players share it.
  const town = useTownState(room, placedObjects);

  // ── Load player state when role is known ───────────────────────────────────
  function initPlayerState(r) {
    roleRef.current = r; // set ref immediately so save callbacks work before re-render
    const saved = loadPlayerState(r);
    setPlayerInventory(saved.inventory);
    setHotbar(saved.hotbar);
    setHotbarSlots(saved.hotbarSlots);
    setEquipment(saved.equipment);
    setCharacter(saved.character);
  }

  // ── Persist helpers ────────────────────────────────────────────────────────
  const saveInventory = useCallback((inv) => {
    setPlayerInventory(inv);
    if (roleRef.current) savePlayerField(roleRef.current, "inventory", inv);
  }, []);

  const saveHotbar = useCallback((hb) => {
    setHotbar(hb);
    if (roleRef.current) savePlayerField(roleRef.current, "hotbar", hb);
  }, []);

  const saveHotbarSlots = useCallback((n) => {
    setHotbarSlots(n);
    if (roleRef.current) savePlayerField(roleRef.current, "hotbar_slots", n);
  }, []);

  const saveEquipment = useCallback((eqOrUpdater) => {
    if (typeof eqOrUpdater === "function") {
      setEquipment(prev => {
        const next = eqOrUpdater(prev);
        if (roleRef.current) savePlayerField(roleRef.current, "equipment", next);
        return next;
      });
    } else {
      setEquipment(eqOrUpdater);
      if (roleRef.current) savePlayerField(roleRef.current, "equipment", eqOrUpdater);
    }
  }, []);

  const saveCharacter = useCallback((ch) => {
    setCharacter(ch);
    if (roleRef.current) savePlayerField(roleRef.current, "character", ch);
  }, []);

  // ── Equipment handlers ─────────────────────────────────────────────────────
  const handleEquipItem = useCallback((itemId) => {
    saveEquipment(prev => {
      const slotMap = { axe:"weapon", pickaxe:"weapon", iron_axe:"weapon", iron_pickaxe:"weapon",
                        iron_sword:"weapon", hoe:"weapon", iron_hoe:"weapon",
                        fishing_rod:"weapon", watering_can:"weapon",
                        leather_armor:"armor", potion_satchel:"accessory" };
      const slot = slotMap[itemId];
      if (!slot) return prev;
      return { ...prev, [slot]: prev[slot] === itemId ? null : itemId };
    });
  }, [saveEquipment]);

  const handleForceEquip = useCallback((itemId) => {
    saveEquipment(prev => {
      const slotMap = { axe:"weapon", pickaxe:"weapon", iron_axe:"weapon", iron_pickaxe:"weapon",
                        iron_sword:"weapon", hoe:"weapon", iron_hoe:"weapon",
                        fishing_rod:"weapon", watering_can:"weapon",
                        leather_armor:"armor", potion_satchel:"accessory" };
      const slot = slotMap[itemId];
      if (!slot || prev[slot] === itemId) return prev;
      return { ...prev, [slot]: itemId };
    });
  }, [saveEquipment]);

  // ── Room ready ─────────────────────────────────────────────────────────────
  function handleRoomReady(roomData, assignedRole, isFresh = false) {
    setRoom(roomData);
    setRole(assignedRole);
    writeSave(roomData, assignedRole);
    initPlayerState(assignedRole);

    if (roomData.chest_inventory && (Array.isArray(roomData.chest_inventory) ? roomData.chest_inventory.some(Boolean) : Object.keys(roomData.chest_inventory).length > 0)) {
      setChest(normalizeChest(roomData.chest_inventory));
    }
    if (roomData.placed_objects?.length > 0) {
      // Normalize labels against current Items.js definitions so stale saved
      // labels (e.g. "[E] to Craft" from an older build) are always corrected.
      const normalized = roomData.placed_objects.map(obj => {
        if (obj.isPlaceable && obj.interact) {
          const info = PLACEABLES[obj.type];
          if (info) {
            return { ...obj, label: info.interactLabel ?? `[F] ${info.label}` };
          }
        }
        return obj;
      });
      setPlacedObjects(normalized);
    }
    setPhase("homestead");
  }

  // ── Run flow ───────────────────────────────────────────────────────────────
  const handleStartRun = useCallback(() => {
    setIsJoiningRun(false); setJoinRunSeed(null); setJoinRunType(null);
    setPhase("run_lobby");
  }, []);

  const handleJoinRun = useCallback((seed, rtype) => {
    setIsJoiningRun(true); setJoinRunSeed(seed ?? null); setJoinRunType(rtype ?? "forest");
    setPhase("run_lobby");
  }, []);

  const handleRunStart = useCallback(({ seed, coOp = false, runType: rt = "forest" }) => {
    setRunSeed(seed); setRunCoOp(coOp); setRunType(rt);
    setPhase("run");
  }, []);

  const handleRunComplete = useCallback((loot) => {
  // Each completed run counts as an in-game day passing.
  // Also re-check NPC arrivals — a new day might trigger someone moving in.
  town.incrementDay();
  town.checkArrivals();

  if (loot?._alreadyApplied) {
    // ForestRun already called onPlayerInventoryUpdate live during the run,
    // which wrote every pickup to both React state and localStorage as it happened.
    // Nothing to re-save here — just show the summary screen.
    setRunLoot(loot._delta ?? {});
    setRunKills(loot.kills ?? 0);
    setRunOverflow({});
    setPhase("loot");
    return;
  }
  const { next, overflow } = mergeLootIntoPlayerInventory(playerInvRef.current, loot);
  saveInventory(next);
  setRunLoot(loot);
  setRunKills(loot.kills ?? 0);
  setRunOverflow(overflow);
  setPhase("loot");
}, [saveInventory]);


  // ── Loot summary callbacks ─────────────────────────────────────────────────
  const handlePlayerInventoryUpdate = useCallback((inv) => {
    saveInventory(inv);
  }, [saveInventory]);

  const handleChestUpdate = useCallback(async (newChest) => {
    setChest(newChest); chestRef.current = newChest;
    try { await api.patch(`/homestead/rooms/${roomRef.current?.id}/chest`, { chest_inventory: chestToMap(newChest) }); }
    catch (e) { console.warn("[Hearthroot] Failed to save chest:", e); }
  }, []);

  const handleReturnHome = useCallback(() => setPhase("homestead"), []);

  // ── Objects ────────────────────────────────────────────────────────────────
  const handleObjectsUpdate = useCallback(async (newObjects) => {
    setPlacedObjects(newObjects);
    // A new building may have satisfied an NPC's arrival condition.
    // checkArrivals reads placedObjects from its closure but we pass the
    // latest snapshot directly so it doesn't lag one render behind.
    setTimeout(() => town.checkArrivals(), 0);
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
      // Player's personal inventory
      playerInventory={playerInventory}
      onPlayerInventoryUpdate={saveInventory}
      hotbarSlots={hotbarSlots}
      onHotbarSlotsUpdate={saveHotbarSlots}
      // Shared chest
      chest={chest} chestOpen={chestOpen}
      onOpenChest={() => setChestOpen(true)}
      onCloseChest={() => setChestOpen(false)}
      onChestUpdate={handleChestUpdate}
      // Equipment & character
      equipment={equipment}
      onEquipItem={handleForceEquip}
      character={character}
      onCharacterUpdate={saveCharacter}
      // Hotbar
      hotbar={hotbar}
      onHotbarChange={saveHotbar}
      // World
      placedObjects={placedObjects}
      onObjectsUpdate={handleObjectsUpdate}
      // Town system
      town={town}
      // Navigation
      onStartRun={handleStartRun}
      onJoinRun={handleJoinRun}
    />
  );

  if (phase === "run_lobby") return (
    <RunLobby
      room={room} role={role}
      joining={isJoiningRun} joinSeed={joinRunSeed} runType={joinRunType}
      equipment={equipment}
      onRunStart={handleRunStart} onCancel={handleLobbyCancel}
    />
  );

  if (phase === "run") {
  const runKey = `run_${runSeed}`;
  const sharedProps = {
    room, seed: runSeed, coOp: runCoOp,
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