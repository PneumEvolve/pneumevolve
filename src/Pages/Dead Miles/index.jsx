// src/Pages/DeadMiles/index.jsx
// Main orchestrator — lobby → waiting → worldmap → playing → gameover
// Supports level progression: Level 1 (hamlet) → Level 2+ (procedural highway)

import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import GameView from "./GameView";
import BaseView from "./BaseView";
import WorldMap from "./WorldMap";
import { useDeadMilesRoom } from "./useDeadMilesRoom";
import {
  applyOfflineBaseTick,
  pushActivity,
  craftItem,
  tickBaseAttacks,
  tickBaseResources,
  applyDeployCarry,
  mergeCollectedResources,
  DEFEND_BASE_HP_RESTORE,
} from "./deadMilesEngine";
import { saveWorldState, loadWorldState, deleteWorldStateSave } from "./saveSystem";

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

function GameOver({ score, level, room, role, onRestart, onMenu, onReadyUp, partnerReady }) {
  const isVictory    = score?.survived;
  const isDefend     = score?.missionType === "defend";
  const isCoopDeath  = !!(room && score?.coopBothDowned);
  const [myReady, setMyReady] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  function handleReadyUp() {
    setMyReady(true);
    onReadyUp?.();
  }

  const showReadyUp = isCoopDeath && !isVictory;

  // Victory label varies by mission type
  const victoryLabel = isDefend ? "base defended" : "region mapped";

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}>

      <p className="text-xs tracking-widest uppercase" style={{ color: isVictory ? "rgba(120,255,150,0.7)" : "rgba(255,80,80,0.7)" }}>
        {isVictory ? victoryLabel : "didn't make it"}
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

      {/* Death recap */}
      {score?.deathRecap && !isVictory && (
        <div className="text-center text-xs px-4 py-3 rounded-xl max-w-sm"
          style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,150,150,0.85)" }}>
          {score.deathRecap}
        </div>
      )}

      {score && (
        <div className="text-center text-xs space-y-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {(score.settlementsCleared ?? 0) > 0 && <div>{score.settlementsCleared} settlements explored</div>}
          {(score.zombiesKilled      ?? 0) > 0 && <div>{score.zombiesKilled} zombies killed</div>}
          {(score.buildingsSearched  ?? 0) > 0 && <div>{score.buildingsSearched} buildings searched</div>}
          {(score.survivorsFound     ?? 0) > 0 && <div>{score.survivorsFound} survivors found</div>}
          {/* Step 7: show resources carried back */}
          {((score.resourcesCollected?.food ?? 0) > 0 || (score.resourcesCollected?.scrap ?? 0) > 0) && (
            <div style={{ color: "rgba(120,210,80,0.7)" }}>
              hauled back: 🍖 {score.resourcesCollected.food ?? 0} food
              {" · "}🔩 {score.resourcesCollected.scrap ?? 0} scrap
            </div>
          )}
        </div>
      )}

      {isVictory && (
        <div className="text-center text-xs px-6 py-3 rounded-xl"
          style={{ background: "rgba(120,255,150,0.07)", border: "1px solid rgba(120,255,150,0.2)", color: "rgba(120,255,150,0.85)", maxWidth: 280 }}>
          {isDefend
            ? `Base HP restored by ${DEFEND_BASE_HP_RESTORE}. The horde was driven back.`
            : "You explored the whole region. Everyone you found made it out."}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {showReadyUp ? (
          <>
            <div className="flex gap-4 text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span style={{ color: myReady ? "rgba(120,255,150,0.9)" : "rgba(255,80,80,0.6)" }}>
                {myReady ? "✓ you" : "○ you"}
              </span>
              <span style={{ color: partnerReady ? "rgba(120,255,150,0.9)" : "rgba(255,255,255,0.3)" }}>
                {partnerReady ? "✓ partner" : "○ partner"}
              </span>
            </div>
            {!myReady ? (
              <button onClick={handleReadyUp}
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,200,80,0.08)", border: "1px solid rgba(255,200,80,0.2)", color: "rgba(255,200,80,0.85)" }}>
                ready up
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl text-sm text-center"
                style={{ background: "rgba(120,255,150,0.06)", border: "1px solid rgba(120,255,150,0.2)", color: "rgba(120,255,150,0.6)" }}>
                {partnerReady ? "starting…" : "waiting for partner…"}
              </div>
            )}
            <button onClick={onMenu}
              className="w-full py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              main menu
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}

// ─── Default world state ──────────────────────────────────────────────────────

function makeDefaultWorldState() {
  return {
    levels: [
      { id: 1, status: "active",     seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
      { id: 2, status: "unexplored", seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
      { id: 3, status: "unexplored", seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
      { id: 4, status: "unexplored", seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
      { id: 5, status: "unexplored", seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
      { id: 6, status: "unexplored", seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
      { id: 7, status: "unexplored", seed: null, baseHp: 100, turretPlaced: false, gardenPlots: 0, resources: { food: 0, scrap: 0 }, lastAttack: null },
    ],
    totalResources: { food: 0, scrap: 0 },
  };
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export default function DeadMilesGame() {
  const [phase,      setPhase]      = useState("lobby");
  const [room,       setRoom]       = useState(null);
  const [role,       setRole]       = useState("p1");
  const [finalScore, setFinalScore] = useState(null);
  const [level,      setLevel]      = useState(1);
  const [autoPlay,   setAutoPlay]   = useState(false);
  const [myReadyUp,      setMyReadyUp]      = useState(false);
  const [partnerReadyUp, setPartnerReadyUp] = useState(false);

  const [worldState, setWorldState] = useState(() => loadWorldState() ?? makeDefaultWorldState());

  // ── Step 7: carry resources — pre-stock inventory built just before deploy ─
  // Stored as a ref so it's available synchronously in handleDeploy without a
  // render cycle.  GameView reads it via the `deployInventory` prop.
  const deployInventoryRef = useRef(null);

  // Phase 2: base screen
  const [screen,       setScreen]      = useState("play");
  const stateSnapshotRef               = useRef(null);
  const activityLogRef                 = useRef([]);
  const baseOpenedAtRef                = useRef(null);
  const [awaySummary, setAwaySummary]  = useState(null);

  const phaseRef = useRef(phase);
  const roleRef  = useRef(role);
  const levelRef = useRef(level);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roleRef.current  = role;  }, [role]);
  useEffect(() => { levelRef.current = level; }, [level]);

  // ── Auto-save worldState whenever it changes ───────────────────────────────
  useEffect(() => {
    saveWorldState(worldState);
  }, [worldState]);

  // ── Base attack interval (Step 4) ─────────────────────────────────────────
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      setWorldState(prev => {
        const { worldState: next } = tickBaseAttacks(prev, levelRef.current);
        return next;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Passive resource generation interval (Step 6) ─────────────────────────
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      setWorldState(prev => tickBaseResources(prev));
    }, 60_000);
    return () => clearInterval(id);
  }, [phase]);

  const activeRoomId = (phase === "lobby" || phase === "waiting") ? null : room?.id ?? null;

  const handlers = useRef({
    onGameOver: ({ score }) => {
      if (phaseRef.current !== "gameover") {
        setFinalScore(score);
        setMyReadyUp(false);
        setPartnerReadyUp(false);
        if (score?.survived) {
          setPhase("worldmap");
        } else {
          setPhase("gameover");
        }
      }
    },
    onRoomSeedUpdate: ({ seed, level: newLevel }) => {
      setRoom(prev => prev ? { ...prev, map_seed: seed } : null);
      if (newLevel != null) setLevel(newLevel);
    },
    onRestartRequest: ({ seed, level: newLevel }) => {
      if (phaseRef.current !== "gameover") return;
      setRoom(prev => prev ? { ...prev, map_seed: seed } : null);
      if (newLevel != null) setLevel(newLevel);
      setFinalScore(null);
      setMyReadyUp(false);
      setPartnerReadyUp(false);
      setPhase("playing");
    },
    onReadyUp: () => {
      setPartnerReadyUp(true);
    },
  }).current;

  const { sendRoomSeedUpdate, sendRestartRequest, sendReadyUp } = useDeadMilesRoom(activeRoomId, handlers);

  // ── World state helpers ────────────────────────────────────────────────────

  function markLevelActive(levelId) {
    setWorldState(prev => {
      const levels = prev.levels.map(l =>
        l.id === levelId && l.status === "unexplored"
          ? { ...l, status: "active" }
          : l
      );
      return { ...prev, levels };
    });
  }

  // After a level is completed, mark it secured and merge collected resources
  // back into the world pool (Step 7).
  // For defend missions, restore baseHp (Step 8).
  function markLevelSecured(levelId, score) {
    setWorldState(prev => {
      const levels = prev.levels.map(l => {
        if (l.id !== levelId) return l;

        // Step 8: restore base HP on successful defence
        const baseHpAfter = score?.defended
          ? Math.min(100, (l.baseHp ?? 0) + (score.baseHpRestored ?? DEFEND_BASE_HP_RESTORE))
          : (l.baseHp ?? 100);

        return {
          ...l,
          status:       "secured",
          turretPlaced: score?.turretPlaced ?? false,
          gardenPlots:  score?.gardenPlots  ?? 0,
          baseHp:       baseHpAfter,
          resources: {
            food:  l.resources?.food  ?? 0,
            scrap: l.resources?.scrap ?? 0,
          },
        };
      });

      // Unlock next level
      const unlocked = levels.map(l =>
        l.id === levelId + 1 && l.status === "unexplored"
          ? { ...l, status: "unexplored" }
          : l
      );

      // Step 7: merge collected resources back into total pool
      const updatedTotal = mergeCollectedResources(
        prev.totalResources,
        score?.resourcesCollected,
        unlocked
      );

      return { ...prev, levels: unlocked, totalResources: updatedTotal };
    });
  }

  // ── Entry points ───────────────────────────────────────────────────────────

  function handleSolo() {
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setLevel(1);
    const fresh = makeDefaultWorldState();
    setWorldState(fresh);
    saveWorldState(fresh);
    setPhase("worldmap");
  }

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    setFinalScore(null);
    setLevel(1);
    const fresh = makeDefaultWorldState();
    setWorldState(fresh);
    saveWorldState(fresh);
    setPhase(assignedRole === "p1" ? "waiting" : "playing");
  }

  function handleP2Joined(updatedRoom) {
    if (updatedRoom) setRoom(prev => ({ ...prev, ...updatedRoom }));
    setPhase("worldmap");
  }

  // Called by GameView when level ends (death or victory)
  function handleGameOver(score) {
    setFinalScore(score);
    setAutoPlay(false);
    setMyReadyUp(false);
    setPartnerReadyUp(false);
    if (score?.survived) {
      markLevelSecured(levelRef.current, score);
      setPhase("worldmap");
    } else {
      setPhase("gameover");
    }
  }

  // Called from WorldMap "Deploy" or "Send on Run" buttons
  // Step 7: compute carry inventory from world pool before mounting GameView
  // Step 8: derive missionType from level status
  function handleDeploy(levelId, auto = false) {
    const newSeed = Date.now() & 0x7fffffff;

    // Step 7 — pre-stock carry inventory
    setWorldState(prev => {
      const { inventory: carryInv, worldResources } = applyDeployCarry(
        {},
        prev.totalResources
      );
      deployInventoryRef.current = carryInv;

      // Deduct carry from totalResources; recompute per-level totals remain intact
      return { ...prev, totalResources: worldResources };
    });

    setLevel(levelId);
    setAutoPlay(auto);
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : null);
    if (room?.id) sendRoomSeedUpdate(newSeed, levelId);
    setFinalScore(null);
    markLevelActive(levelId);
    setPhase("playing");
  }

  // Derive the mission type for the level being deployed to
  function getMissionType(levelId) {
    const lvl = worldState.levels.find(l => l.id === levelId);
    return lvl?.status === "under_attack" ? "defend" : "clear";
  }

  function handleReadyUp() {
    setMyReadyUp(true);
    if (room?.id) sendReadyUp(role);
  }

  function handleRestart() {
    const newSeed = Date.now() & 0x7fffffff;
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : null);
    if (room?.id) sendRestartRequest(newSeed, levelRef.current);
    setFinalScore(null);
    setAutoPlay(false);
    setMyReadyUp(false);
    setPartnerReadyUp(false);
    setPhase("playing");
  }

  // Co-op ready-up: when both players are ready, the host fires the restart
  useEffect(() => {
    if (phase !== "gameover") return;
    if (!room?.id) return;
    if (!myReadyUp || !partnerReadyUp) return;
    if (role === "p1") handleRestart();
  }, [myReadyUp, partnerReadyUp, phase, room?.id, role]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMenu() {
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setLevel(1);
    deleteWorldStateSave();
    setPhase("lobby");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "lobby")    return <Lobby onSolo={handleSolo} onRoomReady={handleRoomReady} />;
  if (phase === "waiting")  return <WaitingForP2 room={room} onP2Joined={handleP2Joined} />;
  if (phase === "gameover") return (
    <GameOver
      score={finalScore}
      level={level}
      room={room}
      role={role}
      onRestart={handleRestart}
      onMenu={handleMenu}
      onReadyUp={handleReadyUp}
      partnerReady={partnerReadyUp}
    />
  );

  if (phase === "worldmap") return (
    <WorldMap
      worldState={worldState}
      currentLevel={level}
      isPlaying={false}
      onDeploy={handleDeploy}
      onMenu={handleMenu}
    />
  );

  if (phase === "playing") {
    // Step 8: mission type drives defend wave in GameView
    const missionType = getMissionType(level);

    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        {/* GameView always mounted — canvas loop keeps running in background */}
        <div style={{ display: screen === "play" ? "block" : "none", position: "absolute", inset: 0 }}>
          <GameView
            key={`${room?.map_seed ?? "solo"}-${level}`}
            room={room}
            role={role}
            level={level}
            missionType={missionType}
            deployInventory={deployInventoryRef.current}
            onGameOver={handleGameOver}
            onStateSnapshot={snap => { stateSnapshotRef.current = snap; }}
            onOpenBase={() => {
              baseOpenedAtRef.current = Date.now();
              setScreen("base");
            }}
            activityLog={activityLogRef.current}
            autoPlay={autoPlay}
            onDropIn={() => setAutoPlay(false)}
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
                  sv.state   = "idle";
                  sv._castTimer = 0; sv._castType = null;
                  if (action.command !== "assign") { sv.assignedTo = null; sv.barricaded = false; }
                }
              }
              if (action.type === "craft") {
                const result = craftItem(s, action.recipeId, activityLogRef.current);
                if (result.success) {
                  pushActivity(activityLogRef.current, `🔨 Crafted ${result.recipe.label}`);
                }
              }
              if (action.type === "assignWorkstation") {
                const sv = s.survivors?.find(sv2 => sv2.id === action.survivorId);
                if (sv) {
                  sv.workstation = action.workstation ?? null;
                  const wsLabel = action.workstation ? action.workstation.replace("_", " ") : null;
                  pushActivity(
                    activityLogRef.current,
                    wsLabel
                      ? `${sv.name} assigned to ${wsLabel}`
                      : `${sv.name} unassigned from workstation`
                  );
                }
              }
              if (action.type === "deposit") {
                const { key, amount } = action;
                const have = Math.floor(s.player?.inventory?.[key] ?? 0);
                const qty  = Math.min(amount, have);
                if (qty > 0 && s.player?.inventory) {
                  s.player.inventory[key] = Math.max(0, have - qty);
                  if (!s.baseStorage) s.baseStorage = {};
                  s.baseStorage[key] = (s.baseStorage[key] ?? 0) + qty;
                  pushActivity(activityLogRef.current, `📦 Deposited ${qty} ${key} to base stockpile`);
                }
              }
              if (action.type === "withdraw") {
                const { key, amount } = action;
                const have = Math.floor(s.baseStorage?.[key] ?? 0);
                const qty  = Math.min(amount, have);
                if (qty > 0) {
                  s.baseStorage[key] = Math.max(0, have - qty);
                  if (!s.player.inventory) s.player.inventory = {};
                  s.player.inventory[key] = (s.player.inventory[key] ?? 0) + qty;
                  pushActivity(activityLogRef.current, `📤 Withdrew ${qty} ${key} from base stockpile`);
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
                const { harvested, damaged, produced } = applyOfflineBaseTick(s, activityLogRef.current);
                if (harvested.length > 0 || damaged.length > 0 || produced.length > 0) {
                  summary = { harvested, damaged, produced, netResources: {} };
                  if (harvested.length > 0)
                    summary.netResources.food = harvested.reduce((acc, h) => acc + h.amount, 0);
                  for (const p of produced) {
                    summary.netResources[p.resource] =
                      (summary.netResources[p.resource] ?? 0) + p.amount;
                  }
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