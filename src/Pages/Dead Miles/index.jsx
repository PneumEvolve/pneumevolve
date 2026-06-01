// src/Pages/DeadMiles/index.jsx
// Main orchestrator — lobby → waiting → playing → gameover
// Supports level progression: Level 1 (hamlet) → Level 2+ (procedural highway)

import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import GameView from "./GameView";
import BaseView from "./BaseView";
import { useDeadMilesRoom } from "./useDeadMilesRoom";
import { applyOfflineBaseTick, pushActivity } from "./deadMilesEngine";

// ─── Lobby ────────────────────────────────────────────────────────────────────

function Lobby({ onSolo, onRoomReady }) {
  const [joinCode, setJoinCode] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleCreate() {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/deadmiles/rooms");
      onRoomReady({ ...data }, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create room.");
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/deadmiles/rooms/join", { join_code: code });
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-widest" style={{ color: "rgba(255,200,80,0.95)" }}>
            dead miles
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            survive. scavenge. keep moving.
          </p>
        </div>

        {/* How to play */}
        <div className="rounded-xl border p-4 space-y-2 text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          <p>You start in a small settlement. The world is huge — and overrun.</p>
          <p>Follow the <span style={{ color: "rgba(255,220,80,0.8)" }}>compass</span> to find other settlements, collect map fragments, and rescue survivors.</p>
          <p>Between settlements is the zombie sea. Drive fast.</p>
          <p style={{ color: "rgba(255,255,255,0.2)" }}>
            A second player can join mid-session as your co-driver.
          </p>
        </div>

        {/* Solo */}
        <button
          onClick={onSolo}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{
            background: "rgba(255,200,80,0.1)",
            border: "1px solid rgba(255,200,80,0.25)",
            color: "rgba(255,200,80,0.9)",
          }}>
          play solo
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>co-op</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Create room */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
            opacity: loading ? 0.5 : 1,
          }}>
          {loading ? "creating…" : "create room"}
        </button>

        {/* Join room */}
        <div className="space-y-2">
          <input
            className="w-full py-3 px-4 rounded-xl text-center text-sm font-mono tracking-widest uppercase"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              outline: "none",
            }}
            placeholder="ENTER CODE"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim() || loading}
            className="w-full py-3 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: joinCode.trim() ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
              opacity: loading ? 0.5 : 1,
            }}>
            join room
          </button>
        </div>

        {error && (
          <p className="text-xs text-center" style={{ color: "rgba(255,100,100,0.8)" }}>{error}</p>
        )}
      </div>
    </main>
  );
}

// ─── Waiting screen (P1 waits for P2) ────────────────────────────────────────

function WaitingForP2({ room, onP2Joined }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(room.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!room?.id) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/deadmiles/rooms/${room.id}`);
        if (data.status === "active") { clearInterval(interval); onP2Joined(data); }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [room?.id]); // eslint-disable-line

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        waiting for player 2
      </p>
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>share this code</p>
        <div className="text-5xl font-mono font-light tracking-widest" style={{ color: "rgba(255,200,80,0.9)" }}>
          {room.join_code}
        </div>
      </div>
      <button
        onClick={copy}
        className="text-xs px-4 py-2 rounded-lg border transition-all"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
        {copied ? "copied ✓" : "copy code"}
      </button>
      <button
        onClick={() => onP2Joined(null)}
        className="text-xs"
        style={{ color: "rgba(255,255,255,0.2)" }}>
        play solo for now →
      </button>
    </main>
  );
}

// ─── Game over screen ─────────────────────────────────────────────────────────

function GameOver({ score, level, onRestart, onMenu }) {
  const isVictory = score?.survived;
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}>

      <p className="text-xs tracking-widest uppercase" style={{ color: isVictory ? "rgba(120,255,150,0.7)" : "rgba(255,80,80,0.7)" }}>
        {isVictory ? "region mapped" : "didn't make it"}
      </p>

      <div className="text-center space-y-1">
        <div className="text-6xl font-light" style={{
          color: isVictory ? "rgba(120,255,150,0.9)" : "rgba(255,80,80,0.7)"
        }}>
          {score?.dayssurvived ?? 0}
        </div>
        <div className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          days survived
        </div>
      </div>

      {/* Death Recap Message - NEW */}
      {score?.deathRecap && !isVictory && (
        <div className="text-center text-xs px-4 py-3 rounded-xl max-w-sm"
          style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,150,150,0.85)" }}>
          {score.deathRecap}
        </div>
      )}

      {score && (
        <div className="text-center text-xs space-y-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {(score.settlementsCleared ?? 0) > 0 && <div>{score.settlementsCleared} settlements explored</div>}
          {(score.zombiesKilled ?? 0) > 0 && <div>{score.zombiesKilled} zombies killed</div>}
          {(score.buildingsSearched ?? 0) > 0 && <div>{score.buildingsSearched} buildings searched</div>}
          {(score.survivorsFound ?? 0) > 0 && <div>{score.survivorsFound} survivors found</div>}
        </div>
      )}

      {isVictory && (
        <div className="text-center text-xs px-6 py-3 rounded-xl"
          style={{ background: "rgba(120,255,150,0.07)", border: "1px solid rgba(120,255,150,0.2)", color: "rgba(120,255,150,0.85)", maxWidth: 280 }}>
          You explored the whole region. Everyone you found made it out.
        </div>
      )}

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button onClick={onRestart}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{ background: "rgba(255,200,80,0.08)", border: "1px solid rgba(255,200,80,0.2)", color: "rgba(255,200,80,0.85)" }}>
          {isVictory ? "play again" : "try again"}
        </button>
        <button onClick={onMenu}
          className="w-full py-3 rounded-xl text-sm"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
          main menu
        </button>
      </div>
    </main>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export default function DeadMilesGame() {
  const [phase,      setPhase]      = useState("lobby");   // lobby | waiting | playing | gameover
  const [room,       setRoom]       = useState(null);
  const [role,       setRole]       = useState("p1");
  const [finalScore, setFinalScore] = useState(null);
  const [level,      setLevel]      = useState(1);

  // Phase 2: base screen
  const [screen,       setScreen]      = useState("play");  // "play" | "base"
  const stateSnapshotRef               = useRef(null);      // live stateRef.current from GameView
  const activityLogRef                 = useRef([]);         // shared mutable activity log
  const baseOpenedAtRef                = useRef(null);       // timestamp when base was opened
  const [awaySummary, setAwaySummary]  = useState(null);    // "while you were away" modal data

  const phaseRef = useRef(phase);
  const roleRef  = useRef(role);
  const levelRef = useRef(level);
  useEffect(() => { phaseRef.current = phase;   }, [phase]);
  useEffect(() => { roleRef.current  = role;    }, [role]);
  useEffect(() => { levelRef.current = level;   }, [level]);

  // Websocket for meta-events (game_over) — only when not playing
  const activeRoomId = phase === "playing" ? null : room?.id ?? null;

  const handlers = useRef({
    onGameOver: ({ score }) => {
      if (phaseRef.current !== "gameover") {
        setFinalScore(score);
        setPhase("gameover");
      }
    },
    // P1 broadcasts a new seed when restarting or advancing a level.
    // P2 receives this and updates its room so the next GameView mount uses the same world.
    onRoomSeedUpdate: ({ seed, level: newLevel }) => {
      setRoom(prev => prev ? { ...prev, map_seed: seed } : null);
      if (newLevel != null) setLevel(newLevel);
    },
  }).current;

  const { sendRoomSeedUpdate } = useDeadMilesRoom(activeRoomId, handlers);

  // ── Entry points ───────────────────────────────────────────────────────────

  function handleSolo() {
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setLevel(1);
    setPhase("playing");
  }

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    setFinalScore(null);
    setLevel(1);
    setPhase(assignedRole === "p1" ? "waiting" : "playing");
  }

  function handleP2Joined(updatedRoom) {
    if (updatedRoom) setRoom(prev => ({ ...prev, ...updatedRoom }));
    setPhase("playing");
  }

  function handleGameOver(score) {
    setFinalScore(score);
    setPhase("gameover");
  }

  function handleRestart() {
    const newSeed = Date.now() & 0x7fffffff;
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : null);
    // Tell P2 to use the same seed before they remount GameView
    if (room?.id) sendRoomSeedUpdate(newSeed, levelRef.current);
    setFinalScore(null);
    setPhase("playing");
  }

  function handleNextLevel() {
    const newLevel = levelRef.current + 1;
    const newSeed  = Date.now() & 0x7fffffff;
    setLevel(newLevel);
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : null);
    // Tell P2 to use the same seed and level before they remount GameView
    if (room?.id) sendRoomSeedUpdate(newSeed, newLevel);
    setFinalScore(null);
    setPhase("playing");
  }

  function handleMenu() {
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setLevel(1);
    setPhase("lobby");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "lobby")    return <Lobby onSolo={handleSolo} onRoomReady={handleRoomReady} />;
  if (phase === "waiting")  return <WaitingForP2 room={room} onP2Joined={handleP2Joined} />;
  if (phase === "gameover") return (
    <GameOver
      score={finalScore}
      level={level}
      onRestart={handleRestart}
      onMenu={handleMenu}
    />
  );

  if (phase === "playing") {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        {/* GameView always mounted — canvas loop keeps running in background */}
        <div style={{ display: screen === "play" ? "block" : "none", position: "absolute", inset: 0 }}>
          <GameView
            key={`${room?.map_seed ?? "solo"}`}
            room={room}
            role={role}
            level={level}
            onGameOver={handleGameOver}
            onStateSnapshot={snap => { stateSnapshotRef.current = snap; }}
            onOpenBase={() => {
              baseOpenedAtRef.current = Date.now();
              setScreen("base");
            }}
            activityLog={activityLogRef.current}
          />
        </div>

        {screen === "base" && (
          <BaseView
            stateSnapshot={stateSnapshotRef.current}
            activityLog={activityLogRef.current}
            awaySummary={awaySummary}
            onDismissAway={() => setAwaySummary(null)}
            onHarvest={action => {
              const s = stateSnapshotRef.current;
              if (!s) return;
              if (action.type === "harvest") {
                const crop = s.crops?.find(c => c.id === action.cropId);
                if (crop) {
                  crop.stage = "harvested";
                  s.player.inventory = s.player.inventory ?? {};
                  s.player.inventory.food = (s.player.inventory.food ?? 0) + (crop.type === "potato" ? 4 : 3);
                  pushActivity(activityLogRef.current, `You harvested a ${crop.type}`);
                }
              }
              if (action.type === "reassign") {
                const sv = s.survivors?.find(sv2 => sv2.id === action.survivorId);
                if (sv) {
                  sv.command = action.command;
                  sv.state = "idle";
                  sv._castTimer = 0; sv._castType = null;
                  if (action.command !== "assign") { sv.assignedTo = null; sv.barricaded = false; }
                }
              }
            }}
            onClose={() => {
              const s = stateSnapshotRef.current;
              const openedFor = baseOpenedAtRef.current
                ? (Date.now() - baseOpenedAtRef.current) / 1000
                : 0;

              let summary = null;
              if (openedFor > 5 && s) {
                const { harvested, damaged } = applyOfflineBaseTick(s, activityLogRef.current);
                if (harvested.length > 0 || damaged.length > 0) {
                  summary = { harvested, damaged, netResources: {} };
                  if (harvested.length > 0)
                    summary.netResources.food = harvested.reduce((acc, h) => acc + h.amount, 0);
                }
              }

              setAwaySummary(summary);
              baseOpenedAtRef.current = null;
              setScreen("play");
            }}
          />
        )}
      </div>
    );
  }

  return null;
}