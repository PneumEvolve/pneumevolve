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

const MAX_OWNED_ROOMS = 3;

// ─── localStorage helpers (write-through cache only) ──────────────────────────
// These are used as a fast local cache so saves feel instant.
// The server is the source of truth on load; localStorage is written on every
// change and read only as a fallback during the one-time migration.

function playerCacheKey(roomId, suffix) {
  return `hearthroot_r${roomId}_${suffix}`;
}

function writePlayerCache(roomId, field, value) {
  try { localStorage.setItem(playerCacheKey(roomId, field), JSON.stringify(value)); } catch {}
}

function readPlayerCache(roomId) {
  try {
    const inv  = localStorage.getItem(playerCacheKey(roomId, "inventory"));
    const hb   = localStorage.getItem(playerCacheKey(roomId, "hotbar"));
    const hbs  = localStorage.getItem(playerCacheKey(roomId, "hotbar_slots"));
    const eq   = localStorage.getItem(playerCacheKey(roomId, "equipment"));
    const char = localStorage.getItem(playerCacheKey(roomId, "character"));
    if (!inv && !hb && !eq && !char) return null; // nothing cached for this room
    return {
      inventory:   inv  ? JSON.parse(inv)  : emptyPlayerInventory(),
      hotbar:      hb   ? JSON.parse(hb)   : emptyHotbar(),
      hotbarSlots: hbs  ? JSON.parse(hbs)  : HOTBAR_BASE_SLOTS,
      equipment:   eq   ? JSON.parse(eq)   : { weapon: null, armor: null, accessory: null },
      character:   char ? JSON.parse(char) : defaultCharacter(),
    };
  } catch { return null; }
}

// Legacy per-role keys (used one-time migration only)
function readLegacyPlayerCache(role) {
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

// Clears legacy role-scoped keys after one-time migration so they never
// bleed into a new room again.
function clearLegacyPlayerCache(role) {
  try {
    localStorage.removeItem(`hearthroot_${role}_inventory`);
    localStorage.removeItem(`hearthroot_${role}_hotbar`);
    localStorage.removeItem(`hearthroot_${role}_hotbar_slots`);
    localStorage.removeItem(`hearthroot_${role}_equipment`);
    localStorage.removeItem(`hearthroot_${role}_character`);
  } catch {}
}

// ─── Audio ────────────────────────────────────────────────────────────────────
const AUDIO_HOMESTEAD  = "/audio/homestead.mp3";
const AUDIO_RUN_TRACKS = { default: "/audio/run.mp3" };
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
    const inStart  = incoming.gainNode.gain.value;
    const outStart = outgoing?.gainNode.gain.value ?? 0;
    const t0 = performance.now();
    function tick() {
      const p    = Math.min((performance.now() - t0) / 1000 / FADE_S, 1);
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

// ─── Time helper ──────────────────────────────────────────────────────────────
function timeSince(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Lobby styles ─────────────────────────────────────────────────────────────
const S = {
  root: {
    height: "100svh",
    background: "#0a120a",
    color: "#f5e6c8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    fontFamily: "monospace",
    padding: "0 24px",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  header: { textAlign: "center", marginBottom: 4 },
  eyebrow: { fontSize: 11, letterSpacing: "0.2em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 10 },
  title:   { fontSize: 28, fontWeight: 400, color: "rgba(200,230,160,0.9)", letterSpacing: "0.05em", margin: 0 },
  panel:   { width: "100%", maxWidth: 320 },
  card: {
    borderRadius: 12,
    border: "1px solid rgba(200,230,120,0.15)",
    background: "rgba(200,230,120,0.04)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
  },
  cardHover: {
    border: "1px solid rgba(200,230,120,0.35)",
    background: "rgba(200,230,120,0.08)",
  },
  sectionLabel: { fontSize: 10, letterSpacing: "0.16em", color: "rgba(200,230,160,0.35)", textTransform: "uppercase", marginBottom: 10 },
  joinCode: { fontSize: 20, letterSpacing: "0.14em", color: "rgba(200,230,120,0.9)", fontFamily: "monospace" },
  meta:     { fontSize: 10, color: "rgba(245,230,200,0.35)", marginTop: 2 },
  btn: (variant = "primary") => ({
    padding: "14px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "monospace",
    width: "100%",
    boxSizing: "border-box",
    transition: "opacity 0.15s",
    ...(variant === "primary"  ? { background: "rgba(200,230,120,0.08)", border: "1px solid rgba(200,230,120,0.25)", color: "rgba(200,230,120,0.9)" } : {}),
    ...(variant === "ghost"    ? { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(245,230,200,0.35)", fontSize: 11 } : {}),
    ...(variant === "danger"   ? { background: "transparent", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,100,80,0.7)", fontSize: 11 } : {}),
    ...(variant === "subtle"   ? { background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(245,230,200,0.25)", fontSize: 10 } : {}),
  }),
  input: {
    flex: 1,
    padding: "14px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f5e6c8",
    fontSize: 13,
    fontFamily: "monospace",
    letterSpacing: "0.12em",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  error: { fontSize: 11, color: "rgba(255,120,80,0.8)", textAlign: "center" },
  divider: { width: "100%", maxWidth: 320, display: "flex", alignItems: "center", gap: 10, margin: "4px 0" },
  dividerLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.06)" },
  dividerText: { fontSize: 10, color: "rgba(245,230,200,0.2)", letterSpacing: "0.1em" },
};

// ─── SaveSlot card ────────────────────────────────────────────────────────────
function SaveSlotCard({ room, onResume, onDelete, disabled }) {
  const [hovered,    setHovered]    = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{ ...S.card, ...(hovered && !confirming ? S.cardHover : {}), opacity: disabled ? 0.5 : 1 }}
        onClick={() => { if (!disabled && !confirming) onResume(room); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon */}
        <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🏡</div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "rgba(200,230,120,0.9)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {room.name || "My Homestead"}
          </div>
          <div style={S.meta}>
            <span style={{ letterSpacing: "0.1em" }}>{room.join_code}</span>
            {" · "}
            <span>{room.role === "p1" ? "host" : "guest"}</span>
            {room.last_played_at && <span>{" · "}{timeSince(room.last_played_at)}</span>}
          </div>
        </div>

        {/* Delete button */}
        {room.role === "p1" && (
          <button
            onClick={e => { e.stopPropagation(); setConfirming(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,100,80,0.4)", fontSize: 14, padding: "4px", flexShrink: 0, lineHeight: 1 }}
            title="Delete homestead"
          >
            ✕
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {confirming && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "#0d1a0d", border: "1px solid rgba(255,80,80,0.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, zIndex: 2 }}>
          <p style={{ fontSize: 11, color: "rgba(245,230,200,0.6)", textAlign: "center", margin: 0 }}>
            Delete <strong style={{ color: "rgba(200,230,120,0.8)" }}>{room.name}</strong>? This can't be undone.
          </p>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button onClick={() => setConfirming(false)} style={{ ...S.btn("ghost"), flex: 1, padding: "10px" }}>cancel</button>
            <button onClick={() => { setConfirming(false); onDelete(room.id); }} style={{ ...S.btn("danger"), flex: 1, padding: "10px" }}>delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HomesteadLobby ───────────────────────────────────────────────────────────
function HomesteadLobby({ onRoomReady }) {
  const [rooms,    setRooms]    = useState([]);       // all rooms from server
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [mode,     setMode]     = useState("list");   // "list" | "new" | "join"
  const [newName,  setNewName]  = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Load all rooms on mount
  useEffect(() => {
    setLoadingRooms(true);
    api.get("/homestead/rooms/mine")
      .then(({ data }) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, []);

  async function handleResume(room) {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get(`/homestead/rooms/${room.id}`);
      onRoomReady(data, data.role ?? room.role);
    } catch {
      setError("Couldn't connect. The room may have expired.");
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    const name = newName.trim() || "My Homestead";
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/homestead/rooms", { name });
      onRoomReady(data, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create homestead.");
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/homestead/rooms/join", { join_code: code });
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found.");
    } finally { setLoading(false); }
  }

  async function handleDelete(roomId) {
    try {
      await api.delete(`/homestead/rooms/${roomId}`);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't delete homestead.");
    }
  }

  const ownedCount = rooms.filter(r => r.role === "p1").length;
  const atLimit    = ownedCount >= MAX_OWNED_ROOMS;

  return (
    <main style={S.root}>
      <div style={S.header}>
        <p style={S.eyebrow}>hearthroot</p>
        <h1 style={S.title}>your homestead</h1>
      </div>

      {/* ── Saved rooms list ── */}
      {mode === "list" && (
        <div style={{ ...S.panel, display: "flex", flexDirection: "column", gap: 10 }}>
          {loadingRooms ? (
            <p style={{ ...S.meta, textAlign: "center", padding: "20px 0" }}>loading…</p>
          ) : rooms.length > 0 ? (
            <>
              <p style={S.sectionLabel}>saved homesteads</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rooms.map(room => (
                  <SaveSlotCard
                    key={room.id}
                    room={room}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    disabled={loading}
                  />
                ))}
              </div>
            </>
          ) : (
            <p style={{ ...S.meta, textAlign: "center", padding: "12px 0" }}>no homesteads yet</p>
          )}

          {error && <p style={S.error}>{error}</p>}

          {/* ── Actions ── */}
          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerText}>or</span>
            <div style={S.dividerLine} />
          </div>

          {!atLimit ? (
            <button
              onClick={() => { setMode("new"); setError(null); }}
              disabled={loading}
              style={{ ...S.btn("primary"), opacity: loading ? 0.4 : 1 }}
            >
              + new homestead
            </button>
          ) : (
            <p style={{ ...S.meta, textAlign: "center" }}>
              save limit reached ({MAX_OWNED_ROOMS}/{MAX_OWNED_ROOMS}) — delete one to create another
            </p>
          )}

          <button
            onClick={() => { setMode("join"); setError(null); }}
            disabled={loading}
            style={{ ...S.btn("ghost"), opacity: loading ? 0.4 : 1 }}
          >
            join with code
          </button>
        </div>
      )}

      {/* ── New homestead form ── */}
      {mode === "new" && (
        <div style={{ ...S.panel, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={S.sectionLabel}>new homestead</p>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="name it (optional)"
            maxLength={64}
            autoFocus
            style={S.input}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{ ...S.btn("primary"), opacity: loading ? 0.4 : 1 }}
          >
            {loading ? "creating…" : "create homestead →"}
          </button>
          <button
            onClick={() => { setMode("list"); setError(null); setNewName(""); }}
            disabled={loading}
            style={{ ...S.btn("subtle"), opacity: loading ? 0.4 : 1 }}
          >
            ← back
          </button>
          {error && <p style={S.error}>{error}</p>}
        </div>
      )}

      {/* ── Join with code form ── */}
      {mode === "join" && (
        <div style={{ ...S.panel, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={S.sectionLabel}>join a homestead</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="JOIN CODE"
              maxLength={8}
              autoFocus
              style={{ ...S.input, letterSpacing: "0.2em" }}
            />
            <button
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              style={{ ...S.btn("primary"), width: "auto", padding: "14px 18px", opacity: (loading || !joinCode.trim()) ? 0.4 : 1 }}
            >
              join
            </button>
          </div>
          <button
            onClick={() => { setMode("list"); setError(null); setJoinCode(""); }}
            disabled={loading}
            style={{ ...S.btn("subtle"), opacity: loading ? 0.4 : 1 }}
          >
            ← back
          </button>
          {error && <p style={S.error}>{error}</p>}
        </div>
      )}
    </main>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomesteadGame() {
  const [phase, setPhase] = useState("lobby");
  const [room,  setRoom]  = useState(null);
  const [role,  setRole]  = useState(null);
  const roleRef = useRef(null);
  const roomRef = useRef(null);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { roleRef.current = role; }, [role]);

  // ── Shared chest ───────────────────────────────────────────────────────────
  const [chest,    setChest]    = useState(() => emptyChest());
  const chestRef = useRef(chest);
  useEffect(() => { chestRef.current = chest; }, [chest]);

  // ── Per-player state ───────────────────────────────────────────────────────
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
  const [runType,     setRunType]     = useState("forest");
  const [runSeed,     setRunSeed]     = useState(null);
  const [runCoOp,     setRunCoOp]     = useState(false);
  const [runLoot,     setRunLoot]     = useState(null);
  const [runKills,    setRunKills]    = useState(0);
  const [runOverflow, setRunOverflow] = useState({});

  const [isJoiningRun, setIsJoiningRun] = useState(false);
  const [joinRunSeed,  setJoinRunSeed]  = useState(null);
  const [joinRunType,  setJoinRunType]  = useState(null);

  // Per-player run gate: one run per in-game day (day advances on sleep, not on run).
  // Intentionally NOT persisted to localStorage — resets on page load so the player
  // always gets their run on the current day. The gate only blocks a second run
  // within the same session (before sleeping).
  const [lastRunDay, setLastRunDay] = useState(-1);

  const [placedObjects, setPlacedObjects] = useState(() => defaultObjects());
  const [chestOpen,     setChestOpen]     = useState(false);

  // ── Town state ─────────────────────────────────────────────────────────────
  const town = useTownState(room, placedObjects);

  // ── Cloud player-state debounce ────────────────────────────────────────────
  // We write to localStorage immediately (cache) and debounce a PUT to the
  // server ~2s after any change. The ref always holds the latest full state
  // so the debounced flush sends a consistent snapshot.
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
    // be flushed into room B if the player navigates between rooms quickly.
    pendingStateRef.current = { snap, roomId: roomRef.current?.id };
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(flushPlayerStateToCloud, 2000);
  }, [flushPlayerStateToCloud]);

  // Flush on unmount / room exit so nothing is lost
  useEffect(() => {
    return () => {
      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
      flushPlayerStateToCloud();
    };
  }, [flushPlayerStateToCloud]);

  // ── Load player state from server when entering a room ────────────────────
  async function initPlayerState(roomId, assignedRole) {
    roleRef.current = assignedRole;

    // Optimistically apply localStorage cache so the game shows instantly
    const cached = readPlayerCache(roomId);
    if (cached) {
      setPlayerInventory(cached.inventory);
      setHotbar(cached.hotbar);
      setHotbarSlots(cached.hotbarSlots);
      setEquipment(cached.equipment);
      setCharacter(cached.character);
      playerInvRef.current = cached.inventory;
    }

    // Then fetch the authoritative server state
    try {
      const { data: ps } = await api.get(`/homestead/rooms/${roomId}/player-state`);

      // Migration: if server has empty defaults but localStorage (legacy keys) has data,
      // push the legacy data up to the server now and use it.
      const isServerEmpty = !ps.updated_at &&
        Object.keys(ps.inventory?.items ?? ps.inventory ?? {}).length === 0 &&
        (ps.hotbar ?? []).length === 0;

      if (isServerEmpty) {
        const legacy = readLegacyPlayerCache(assignedRole);
        if (legacy) {
          // Use legacy data and push it to the server immediately
          applyPlayerState(legacy, roomId);
          clearLegacyPlayerCache(assignedRole); // ensure this only runs once per device
          scheduleCloudSave({
            inventory:    legacy.inventory,
            hotbar:       legacy.hotbar,
            hotbar_slots: legacy.hotbarSlots,
            equipment:    legacy.equipment,
            character:    legacy.character,
            farm_plots:   {},
            node_state:   {},
          });
          return;
        }
      }

      // Normal path: apply server state
      const state = {
        inventory:   ps.inventory   ?? emptyPlayerInventory(),
        hotbar:      ps.hotbar      ?? emptyHotbar(),
        hotbarSlots: ps.hotbar_slots ?? HOTBAR_BASE_SLOTS,
        equipment:   ps.equipment   ?? { weapon: null, armor: null, accessory: null },
        character:   ps.character   ?? defaultCharacter(),
      };
      applyPlayerState(state, roomId);
    } catch (e) {
      console.warn("[Hearthroot] Failed to load player state from server:", e);
      // Already applied cache above — just continue
    }
  }

  function applyPlayerState(state, roomId) {
    setPlayerInventory(state.inventory);
    setHotbar(state.hotbar);
    setHotbarSlots(state.hotbarSlots);
    setEquipment(state.equipment);
    setCharacter(state.character);
    playerInvRef.current = state.inventory;
    // Warm the local cache with the server state
    if (roomId) {
      writePlayerCache(roomId, "inventory",    state.inventory);
      writePlayerCache(roomId, "hotbar",       state.hotbar);
      writePlayerCache(roomId, "hotbar_slots", state.hotbarSlots);
      writePlayerCache(roomId, "equipment",    state.equipment);
      writePlayerCache(roomId, "character",    state.character);
    }
  }

  // ── Persist helpers ────────────────────────────────────────────────────────
  // Every save: update React state → write localStorage cache → schedule cloud save

  const buildStateSnap = useCallback((overrides = {}) => ({
    inventory:    overrides.inventory    ?? playerInvRef.current,
    hotbar:       overrides.hotbar       ?? hotbarRef.current,
    hotbar_slots: overrides.hotbar_slots ?? hotbarSlotRef.current,
    equipment:    overrides.equipment    ?? null, // filled below via ref
    character:    overrides.character    ?? null,
    farm_plots:   {},
    node_state:   {},
  }), []);

  // We need equipment and character refs too for the snap
  const equipmentRef = useRef(equipment);
  const characterRef = useRef(character);
  useEffect(() => { equipmentRef.current = equipment; }, [equipment]);
  useEffect(() => { characterRef.current = character; }, [character]);

  const saveInventory = useCallback((inv) => {
    setPlayerInventory(inv);
    playerInvRef.current = inv;
    if (roomRef.current?.id) writePlayerCache(roomRef.current.id, "inventory", inv);
    scheduleCloudSave({
      inventory:    inv,
      hotbar:       hotbarRef.current,
      hotbar_slots: hotbarSlotRef.current,
      equipment:    equipmentRef.current,
      character:    characterRef.current,
      farm_plots:   {},
      node_state:   {},
    });
  }, [scheduleCloudSave]);

  const saveHotbar = useCallback((hb) => {
    setHotbar(hb);
    hotbarRef.current = hb;
    if (roomRef.current?.id) writePlayerCache(roomRef.current.id, "hotbar", hb);
    scheduleCloudSave({
      inventory:    playerInvRef.current,
      hotbar:       hb,
      hotbar_slots: hotbarSlotRef.current,
      equipment:    equipmentRef.current,
      character:    characterRef.current,
      farm_plots:   {},
      node_state:   {},
    });
  }, [scheduleCloudSave]);

  const saveHotbarSlots = useCallback((n) => {
    setHotbarSlots(n);
    hotbarSlotRef.current = n;
    if (roomRef.current?.id) writePlayerCache(roomRef.current.id, "hotbar_slots", n);
    scheduleCloudSave({
      inventory:    playerInvRef.current,
      hotbar:       hotbarRef.current,
      hotbar_slots: n,
      equipment:    equipmentRef.current,
      character:    characterRef.current,
      farm_plots:   {},
      node_state:   {},
    });
  }, [scheduleCloudSave]);

  const saveEquipment = useCallback((eqOrUpdater) => {
    const apply = (prev) => {
      const next = typeof eqOrUpdater === "function" ? eqOrUpdater(prev) : eqOrUpdater;
      equipmentRef.current = next;
      if (roomRef.current?.id) writePlayerCache(roomRef.current.id, "equipment", next);
      scheduleCloudSave({
        inventory:    playerInvRef.current,
        hotbar:       hotbarRef.current,
        hotbar_slots: hotbarSlotRef.current,
        equipment:    next,
        character:    characterRef.current,
        farm_plots:   {},
        node_state:   {},
      });
      return next;
    };
    if (typeof eqOrUpdater === "function") {
      setEquipment(prev => apply(prev));
    } else {
      setEquipment(apply(eqOrUpdater));
    }
  }, [scheduleCloudSave]);

  const saveCharacter = useCallback((ch) => {
    setCharacter(ch);
    characterRef.current = ch;
    if (roomRef.current?.id) writePlayerCache(roomRef.current.id, "character", ch);
    scheduleCloudSave({
      inventory:    playerInvRef.current,
      hotbar:       hotbarRef.current,
      hotbar_slots: hotbarSlotRef.current,
      equipment:    equipmentRef.current,
      character:    ch,
      farm_plots:   {},
      node_state:   {},
    });
  }, [scheduleCloudSave]);

  // ── Equipment handlers ─────────────────────────────────────────────────────
  const SLOT_MAP = {
    axe:"weapon", pickaxe:"weapon", iron_axe:"weapon", iron_pickaxe:"weapon",
    iron_sword:"weapon", hoe:"weapon", iron_hoe:"weapon",
    fishing_rod:"weapon", watering_can:"weapon",
    leather_armor:"armor", potion_satchel:"accessory",
  };

  const handleEquipItem = useCallback((itemId) => {
    saveEquipment(prev => {
      const slot = SLOT_MAP[itemId];
      if (!slot) return prev;
      return { ...prev, [slot]: prev[slot] === itemId ? null : itemId };
    });
  }, [saveEquipment]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleForceEquip = useCallback((itemId) => {
    saveEquipment(prev => {
      const slot = SLOT_MAP[itemId];
      if (!slot || prev[slot] === itemId) return prev;
      return { ...prev, [slot]: itemId };
    });
  }, [saveEquipment]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Room ready ─────────────────────────────────────────────────────────────
  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    roomRef.current = roomData;

    // Reset all per-player state to defaults immediately so stale values from
    // a previous room never show while initPlayerState is fetching from the server.
    const emptyInv = emptyPlayerInventory();
    const emptyHb  = emptyHotbar();
    const emptyEq  = { weapon: null, armor: null, accessory: null };
    setPlayerInventory(emptyInv);
    setHotbar(emptyHb);
    setHotbarSlots(HOTBAR_BASE_SLOTS);
    setEquipment(emptyEq);
    playerInvRef.current  = emptyInv;
    hotbarRef.current     = emptyHb;
    hotbarSlotRef.current = HOTBAR_BASE_SLOTS;
    equipmentRef.current  = emptyEq;

    // Load chest from room
    if (roomData.chest_inventory && (
      Array.isArray(roomData.chest_inventory)
        ? roomData.chest_inventory.some(Boolean)
        : Object.keys(roomData.chest_inventory).length > 0
    )) {
      setChest(normalizeChest(roomData.chest_inventory));
    }

    // Load placed objects, normalizing stale labels
    // Also strip any objects that have been removed from defaultObjects
    const REMOVED_OBJECT_IDS = new Set(['tree_test', 'ore_test']);
    if (roomData.placed_objects?.length > 0) {
      const normalized = roomData.placed_objects
        .filter(obj => !REMOVED_OBJECT_IDS.has(obj.id))
        .map(obj => {
          // Migrate house_0: older saves have interact:false — fix it in place
          if (obj.id === 'house_0') return { ...obj, interact: true, label: '[F] Sleep' };
          if (obj.isPlaceable && obj.interact) {
            const info = PLACEABLES[obj.type];
            if (info) return { ...obj, label: info.interactLabel ?? `[F] ${info.label}` };
          }
          return obj;
        });
      setPlacedObjects(normalized);
    }

    // Load player state from server (async, non-blocking)
    initPlayerState(roomData.id, assignedRole);

    // Reset run gate — player gets one fresh run when entering a room
    setLastRunDay(-1);

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
    // Mark this player as having used their run for the current in-game day.
    // Day only increments on sleep, not on run completion.
    const usedDay = town?.townState?.inGameDay ?? 0;
    setLastRunDay(usedDay);

    if (loot?._alreadyApplied) {
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
  }, [saveInventory]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loot / chest / objects ─────────────────────────────────────────────────
  const handlePlayerInventoryUpdate = useCallback((inv) => {
    saveInventory(inv);
  }, [saveInventory]);

  const handleChestUpdate = useCallback(async (newChest) => {
    setChest(newChest); chestRef.current = newChest;
    try { await api.patch(`/homestead/rooms/${roomRef.current?.id}/chest`, { chest_inventory: chestToMap(newChest) }); }
    catch (e) { console.warn("[Hearthroot] Failed to save chest:", e); }
  }, []);

  const handleReturnHome = useCallback(() => setPhase("homestead"), []);

  const handleObjectsUpdate = useCallback(async (newObjects) => {
    setPlacedObjects(newObjects);
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