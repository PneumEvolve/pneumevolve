// src/Pages/Homestead/index.jsx
// Root component — manages phase state machine.
// Phases: lobby → homestead → run_lobby → run → loot → homestead
//
// Save/resume: room id + join_code + role stored in localStorage under SAVE_KEY.
// On load, lobby checks for a saved room and offers to resume it.
// Resume hits GET /homestead/rooms/{id}; on 404 clears save and shows fresh lobby.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import HomesteadView from "./HomesteadView";
import RunLobby      from "./RunLobby";
import ForestRun     from "./ForestRun";
import LootSummary   from "./LootSummary";
import { emptyInventory, defaultObjects } from "./gameEngine";

const SAVE_KEY = "hearthroot_room"; // localStorage key

// ─── Save helpers ─────────────────────────────────────────────────────────────
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave(room, role) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      id:       room.id,
      join_code: room.join_code,
      role,
      savedAt:  Date.now(),
    }));
  } catch {}
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

// ─── Entry lobby ──────────────────────────────────────────────────────────────
// Three modes:
//   "fresh"   — no saved room; show new + join
//   "saved"   — saved room found; primary = resume, secondaries = join other / new
//   "loading" — API call in flight

function HomesteadLobby({ onRoomReady }) {
  const [save]     = useState(() => loadSave());   // read once on mount
  const [mode,     setMode]    = useState(save ? "saved" : "fresh");
  const [joinCode, setJoinCode] = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(null);
  const [lostMsg,  setLostMsg] = useState(false);  // shown after a failed resume

  // ── API calls ────────────────────────────────────────────────────────────

  async function handleCreate() {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/homestead/rooms");
      onRoomReady(data, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create room.");
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

  async function handleResume() {
    if (!save) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.get(`/homestead/rooms/${save.id}`);
      onRoomReady(data, save.role);
    } catch (e) {
      // Room gone — clear save and show fresh lobby with notice
      clearSave();
      setLostMsg(true);
      setMode("fresh");
    } finally { setLoading(false); }
  }

  function handleStartFresh() {
    clearSave();
    setMode("fresh");
    setLostMsg(false);
    setError(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: "100svh", background: "#0a120a", color: "#f5e6c8",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "0 24px", fontFamily: "monospace",
    }}>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 400, letterSpacing: "0.12em", color: "rgba(200,230,120,0.9)", marginBottom: 6 }}>
            🌿 hearthroot
          </h1>
          <p style={{ fontSize: 11, letterSpacing: "0.16em", color: "rgba(245,230,200,0.25)", textTransform: "uppercase" }}>
            a shared homestead
          </p>
        </div>

        {/* Lost-save notice */}
        {lostMsg && (
          <div style={{
            borderRadius: 10, border: "1px solid rgba(255,160,80,0.25)",
            padding: "10px 14px", fontSize: 11, lineHeight: 1.6,
            color: "rgba(255,180,100,0.7)", textAlign: "center",
          }}>
            your previous homestead couldn't be found — it may have expired.
          </div>
        )}

        {/* ── SAVED MODE ─────────────────────────────────────────────── */}
        {mode === "saved" && save && (
          <>
            <div style={{
              borderRadius: 12, border: "1px solid rgba(200,230,120,0.15)",
              padding: "18px 20px",
              background: "rgba(200,230,120,0.04)",
            }}>
              <p style={{ fontSize: 10, letterSpacing: "0.16em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 10 }}>
                saved homestead
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22, letterSpacing: "0.14em", color: "rgba(200,230,120,0.9)", fontWeight: 400 }}>
                  {save.join_code}
                </span>
                <span style={{ fontSize: 10, color: "rgba(245,230,200,0.3)" }}>
                  · {save.role === "p1" ? "host" : "guest"}
                  {save.savedAt ? ` · ${timeSince(save.savedAt)}` : ""}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleResume}
                disabled={loading}
                style={{
                  padding: "16px", borderRadius: 12, cursor: "pointer",
                  background: "rgba(200,230,120,0.08)",
                  border: "1px solid rgba(200,230,120,0.25)",
                  color: "rgba(200,230,120,0.9)",
                  fontSize: 13, fontFamily: "monospace", letterSpacing: "0.04em",
                  opacity: loading ? 0.4 : 1,
                }}
              >
                {loading ? "loading…" : "resume homestead →"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Join a different one */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  placeholder="JOIN CODE"
                  maxLength={6}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "11px 14px", borderRadius: 10, outline: "none",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 12, fontFamily: "monospace", letterSpacing: "0.14em", textAlign: "center",
                    opacity: loading ? 0.4 : 1,
                  }}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading || !joinCode.trim()}
                  style={{
                    padding: "11px 16px", borderRadius: 10, cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 12, fontFamily: "monospace",
                    opacity: loading || !joinCode.trim() ? 0.3 : 1,
                  }}
                >
                  join
                </button>
              </div>

              <button
                onClick={handleStartFresh}
                disabled={loading}
                style={{
                  padding: "8px", borderRadius: 8, cursor: "pointer",
                  background: "transparent", border: "none",
                  color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "monospace",
                  opacity: loading ? 0.4 : 1,
                }}
              >
                start a new homestead
              </button>
            </div>
          </>
        )}

        {/* ── FRESH MODE ─────────────────────────────────────────────── */}
        {mode === "fresh" && (
          <>
            {/* How-to blurb */}
            <div style={{
              borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)",
              padding: "14px 18px", fontSize: 12, lineHeight: 1.7,
              color: "rgba(245,230,200,0.38)",
            }}>
              <p style={{ marginBottom: 8 }}>
                <span style={{ color: "rgba(200,230,120,0.8)" }}>Build</span> a shared homestead
                together. Craft, farm, decorate.
              </p>
              <p>
                <span style={{ color: "rgba(255,180,80,0.8)" }}>Run</span> solo during the day —
                fight wolves, chop trees, forage herbs — and bring loot back to the shared chest
                for your partner to build with.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={handleCreate}
                disabled={loading}
                style={{
                  padding: "16px", borderRadius: 12, cursor: "pointer",
                  background: "rgba(200,230,120,0.08)",
                  border: "1px solid rgba(200,230,120,0.25)",
                  color: "rgba(200,230,120,0.9)",
                  fontSize: 13, fontFamily: "monospace", letterSpacing: "0.04em",
                  opacity: loading ? 0.4 : 1,
                }}
              >
                {loading ? "creating…" : "new homestead"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>or join</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  placeholder="JOIN CODE"
                  maxLength={6}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 10, outline: "none",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 13, fontFamily: "monospace", letterSpacing: "0.14em", textAlign: "center",
                  }}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading || !joinCode.trim()}
                  style={{
                    padding: "12px 18px", borderRadius: 10, cursor: "pointer",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13, fontFamily: "monospace",
                    opacity: loading || !joinCode.trim() ? 0.4 : 1,
                  }}
                >
                  join
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,100,100,0.8)" }}>{error}</p>
        )}

        <Link to="/" style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.18)", textDecoration: "none" }}>
          ← home
        </Link>
      </div>
    </main>
  );
}

// ─── Time-since helper (for saved room display) ───────────────────────────────
function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomesteadGame() {
  // phases: lobby | homestead | run_lobby | run | loot
  const [phase,    setPhase]    = useState("lobby");
  const [room,     setRoom]     = useState(null);
  const [role,     setRole]     = useState(null);   // "p1" | "p2"
  const [runSeed,  setRunSeed]  = useState(null);
  const [runLoot,  setRunLoot]  = useState(null);
  const [runKills, setRunKills] = useState(0);
  const [chestOpen, setChestOpen] = useState(false);

  // Chest + placed objects hydrated from DB on room load, kept in sync via broadcast
  const [chest,         setChest]         = useState(emptyInventory);
  const [placedObjects, setPlacedObjects] = useState(defaultObjects);

  const chestRef   = useRef(chest);
  const objectsRef = useRef(placedObjects);
  const roomRef    = useRef(room);

  useEffect(() => { chestRef.current   = chest;        }, [chest]);
  useEffect(() => { objectsRef.current = placedObjects; }, [placedObjects]);
  useEffect(() => { roomRef.current    = room;          }, [room]);

  // ── Room ready (created, joined, or resumed) ─────────────────────────────
  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    // Persist for next session
    writeSave(roomData, assignedRole);
    // Hydrate world state from DB
    if (roomData.chest_inventory && Object.keys(roomData.chest_inventory).length > 0) {
      setChest(roomData.chest_inventory);
    }
    if (roomData.placed_objects && roomData.placed_objects.length > 0) {
      setPlacedObjects(roomData.placed_objects);
    }
    // Always go straight to homestead — no waiting screen
    setPhase("homestead");
  }

  const [isJoiningRun, setIsJoiningRun] = useState(false);
  const [joinRunSeed,  setJoinRunSeed]  = useState(null);

  // ── Homestead actions ────────────────────────────────────────────────────
  const handleStartRun = useCallback(() => {
    setIsJoiningRun(false);
    setJoinRunSeed(null);
    setPhase("run_lobby");
  }, []);

  const handleJoinRun = useCallback((seed) => {
    setIsJoiningRun(true);
    setJoinRunSeed(seed ?? null);
    setPhase("run_lobby");
  }, []);

  const handleOpenChest = useCallback(() => {
    setChestOpen(true);
  }, []);

  const handleCloseChest = useCallback(() => {
    setChestOpen(false);
  }, []);

  // Persist chest to DB + update local state
  const handleChestUpdate = useCallback(async (newInv) => {
    setChest(newInv);
    chestRef.current = newInv;
    try {
      await api.patch(`/homestead/rooms/${roomRef.current?.id}/chest`, {
        chest_inventory: newInv,
      });
    } catch (e) {
      console.warn("[Hearthroot] Failed to save chest:", e);
    }
  }, []);

  // Persist placed objects to DB + update local state
  const handleObjectsUpdate = useCallback(async (newObjects) => {
    setPlacedObjects(newObjects);
    objectsRef.current = newObjects;
    try {
      await api.patch(`/homestead/rooms/${roomRef.current?.id}/objects`, {
        placed_objects: newObjects,
      });
    } catch (e) {
      console.warn("[Hearthroot] Failed to save objects:", e);
    }
  }, []);

  // ── Run lobby ────────────────────────────────────────────────────────────
  const handleRunStart = useCallback(({ seed }) => {
    setRunSeed(seed);
    setPhase("run");
  }, []);

  const handleLobbyCancel = useCallback(() => {
    setPhase("homestead");
  }, []);

  // ── Run complete ─────────────────────────────────────────────────────────
  const handleRunComplete = useCallback((loot) => {
    setRunLoot(loot);
    setRunKills(loot.kills ?? 0);
    setPhase("loot");
  }, []);

  // ── Return home from loot screen ─────────────────────────────────────────
  const handleReturnHome = useCallback(() => {
    setPhase("homestead");
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return <HomesteadLobby onRoomReady={handleRoomReady} />;
  }

  if (phase === "homestead") {
    return (
      <HomesteadView
        key={room?.id}
        room={room}
        role={role}
        chestInventory={chest}
        chestOpen={chestOpen}
        placedObjects={placedObjects}
        onStartRun={handleStartRun}
        onJoinRun={handleJoinRun}
        onOpenChest={handleOpenChest}
        onCloseChest={handleCloseChest}
        onChestUpdate={handleChestUpdate}
        onObjectsUpdate={handleObjectsUpdate}
      />
    );
  }

  if (phase === "run_lobby") {
    return (
      <RunLobby
        room={room}
        role={role}
        joining={isJoiningRun}
        joinSeed={joinRunSeed}
        onRunStart={handleRunStart}
        onCancel={handleLobbyCancel}
      />
    );
  }

  if (phase === "run") {
    return (
      <ForestRun
        key={`run_${runSeed}`}
        room={room}
        seed={runSeed}
        onRunComplete={handleRunComplete}
      />
    );
  }

  if (phase === "loot") {
    return (
      <LootSummary
        room={room}
        runLoot={runLoot}
        kills={runKills}
        chestInventory={chestRef.current}
        onReturnHome={handleReturnHome}
        onChestUpdate={handleChestUpdate}   // ← was missing, caused loot not saving
      />
    );
  }

  return null;
}