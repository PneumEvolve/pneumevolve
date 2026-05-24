// src/Pages/Stronghold/index.jsx
import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import StrongholdLobby   from "./StrongholdLobby";
import ProtectorView     from "./ProtectorView";
import BuilderView       from "./BuilderView";
import { useStrongholdRoom } from "./useStrongholdRoom";

// ── High-score helpers ────────────────────────────────────────────────────────
const HS_KEY = "stronghold_high_score";
function getHighScore() {
  try { return parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0; } catch { return 0; }
}
function maybeUpdateHighScore(waves) {
  try {
    const prev = getHighScore();
    if (waves > prev) { localStorage.setItem(HS_KEY, String(waves)); return waves; }
    return prev;
  } catch { return waves; }
}

// ── Save state helpers ────────────────────────────────────────────────────────
const SAVE_KEY_PREFIX = "stronghold_save_";

function getSavedGames() {
  const saves = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(SAVE_KEY_PREFIX)) continue;
      try {
        const s = JSON.parse(localStorage.getItem(key));
        if (s?.roomId && s?.joinCode && s?.waveNumber !== undefined) saves.push(s);
      } catch {}
    }
    saves.sort((a, b) => b.savedAt - a.savedAt);
  } catch {}
  return saves;
}

function deleteSave(roomId) {
  try { localStorage.removeItem(`${SAVE_KEY_PREFIX}${roomId}`); } catch {}
}

// ── Waiting screen ────────────────────────────────────────────────────────────
function WaitingForBuilder({ room, onBuilderJoined }) {
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
        const { data } = await api.get(`/stronghold/rooms/${room.id}`);
        if (data.status === "active") { clearInterval(interval); onBuilderJoined(data); }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [room?.id]); // eslint-disable-line

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        {room?._resumeWave ? `resuming from wave ${room._resumeWave}` : "waiting for the builder"}
      </p>
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          {room?._resumeWave ? "share this code to resume together" : "share this code"}
        </p>
        <div className="text-5xl font-mono font-light tracking-widest" style={{ color: "rgba(255,210,80,0.9)" }}>
          {room.join_code}
        </div>
      </div>
      <button onClick={copy}
        className="text-xs px-4 py-2 rounded-lg border transition-all"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
        {copied ? "copied ✓" : "copy code"}
      </button>
    </main>
  );
}

// ── Game over screen ──────────────────────────────────────────────────────────
function GameOver({ score, role, highScore, onRestart }) {
  const isP1 = role === "p1";
  const waveReached = score?.waveReached ?? 0;
  const isNewBest = waveReached > 0 && waveReached >= highScore;

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        {score?.won ? "stronghold held" : "stronghold fell"}
      </p>

      <div className="text-center space-y-1">
        <div className="text-6xl font-light" style={{ color: score?.won ? "rgba(255,210,80,0.9)" : "rgba(255,100,100,0.7)" }}>
          {waveReached}
        </div>
        <div className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>waves survived</div>
        {isNewBest ? (
          <div className="text-xs tracking-widest" style={{ color: "rgba(255,210,80,0.6)" }}>✦ new best ✦</div>
        ) : highScore > 0 ? (
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>best: {highScore}</div>
        ) : null}
      </div>

      <div className="text-center space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        <div>{score?.standing ?? 0} / {score?.total ?? 0} buildings standing</div>
        <div>{score?.enemiesKilled ?? 0} enemies defeated</div>
      </div>

      {isP1 ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>play again?</p>
          <button onClick={() => onRestart(false)}
            className="w-full py-3 rounded-xl text-sm"
            style={{ background: "rgba(255,210,80,0.08)", border: "1px solid rgba(255,210,80,0.2)", color: "rgba(255,210,80,0.85)" }}>
            same roles
          </button>
          <button onClick={() => onRestart(true)}
            className="w-full py-3 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
            swap roles
          </button>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          waiting for protector to restart…
        </p>
      )}
    </main>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
export default function StrongholdGame() {
  const [phase,      setPhase]      = useState("lobby");
  const [room,       setRoom]       = useState(null);
  const [role,       setRole]       = useState(null);
  const [finalScore, setFinalScore] = useState(null);
  const [highScore,  setHighScore]  = useState(getHighScore);
  // Saved state to resume — passed into ProtectorView/BuilderView
  const [resumeState, setResumeState] = useState(null);
  const [savedGames,  setSavedGames]  = useState(() => getSavedGames());
  // Builder sees a brief "game saved" notice when the Protector saves
  const [builderSaveNotice, setBuilderSaveNotice] = useState(false);

  const phaseRef = useRef(phase);
  const roleRef  = useRef(role);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roleRef.current  = role;  }, [role]);

  // Only subscribe when NOT playing — same pattern as Firefly to avoid
  // double-subscription conflicts while a game view is mounted.
  const activeRoomId = phase === "playing" ? null : room?.id ?? null;

  const handlers = useRef({
    onPlayerReady: () => {
      if (phaseRef.current === "waiting" && roleRef.current === "p1") setPhase("playing");
    },
    onGameOver: ({ score }) => {
      if (phaseRef.current !== "gameover") { setFinalScore(score); setPhase("gameover"); }
    },
    onRestart: ({ seed, swap }) => {
      const newRole = swap ? (roleRef.current === "p1" ? "p2" : "p1") : roleRef.current;
      setRoom(prev => prev ? { ...prev, map_seed: seed } : prev);
      setRole(newRole);
      setFinalScore(null);
      setResumeState(null);
      setPhase("playing");
    },
    // Builder receives save_state broadcast from protector so it can show a notice
    onSaveState: ({ state }) => {
      // Show a brief confirmation banner on the Builder's screen
      setBuilderSaveNotice(true);
      setTimeout(() => setBuilderSaveNotice(false), 3000);
    },
  }).current;

  const { sendPlayerReady, sendGameOver, sendRestart } =
    useStrongholdRoom(activeRoomId, handlers);

  useEffect(() => {
    if (role === "p2" && room?.id) sendPlayerReady("p2");
  }, [role, room?.id]); // eslint-disable-line

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    setResumeState(null);
    setPhase(assignedRole === "p1" ? "waiting" : "playing");
  }

  async function handleResume(save) {
    try {
      const { data } = await api.post("/stronghold/rooms", { difficulty: save.difficulty ?? "normal" });
      const roomWithResume = { ...data, difficulty: save.difficulty ?? "normal", _resumeWave: save.waveNumber };
      setRoom(roomWithResume);
      setRole("p1");
      setResumeState(save);
      setPhase("waiting");
    } catch (e) { console.error("Resume failed:", e); }
  }

  function handleDeleteSave(roomId) {
    deleteSave(roomId);
    setSavedGames(getSavedGames());
  }

  function handleBuilderJoined(updatedRoom) {
    setRoom(prev => ({ ...prev, ...updatedRoom }));
    setPhase("playing");
  }

  function recordScore(waves) {
    const best = maybeUpdateHighScore(waves);
    setHighScore(best);
  }

  async function handleP1GameOver(score) {
    recordScore(score?.waveReached ?? 0);
    setFinalScore(score);
    setPhase("gameover");
    sendGameOver(score);
    if (room?.id) { deleteSave(room.id); setSavedGames(getSavedGames()); }
    try { await api.patch(`/stronghold/rooms/${room.id}`, { final_score: score.waveReached ?? 0 }); } catch {}
  }

  function handleP2GameOver(score) {
    if (score?._restart) {
      const newRole = score._swap ? "p1" : "p2";
      setRoom(prev => prev ? { ...prev, map_seed: score._seed } : prev);
      setRole(newRole);
      setFinalScore(null);
      setResumeState(null);
      setPhase("playing");
      return;
    }
    recordScore(score?.waveReached ?? 0);
    setFinalScore(score);
    setPhase("gameover");
  }

  function handleRestart(swap) {
    const newSeed = Date.now() & 0x7fffffff;
    const newRole = swap ? "p2" : "p1";
    sendRestart(newSeed, swap);
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : prev);
    setRole(newRole);
    setFinalScore(null);
    setResumeState(null);
    setPhase("playing");
  }

  // Refresh saved games list when returning to lobby
  useEffect(() => {
    if (phase === "lobby") setSavedGames(getSavedGames());
  }, [phase]);

  if (phase === "lobby") return (
    <StrongholdLobby
      onRoomReady={handleRoomReady}
      savedGames={savedGames}
      onResume={handleResume}
      onDeleteSave={handleDeleteSave}
    />
  );
  if (phase === "waiting") return <WaitingForBuilder room={room} onBuilderJoined={handleBuilderJoined} />;
  if (phase === "gameover") return <GameOver score={finalScore} role={role} highScore={highScore} onRestart={handleRestart} />;

  if (phase === "playing") {
    if (role === "p1") return <ProtectorView key={room?.map_seed ?? room?.id} room={room} resumeState={resumeState} onGameOver={handleP1GameOver} />;
    return <BuilderView key={room?.map_seed ?? room?.id} room={room} resumeState={resumeState} onGameOver={handleP2GameOver} saveNotice={builderSaveNotice} />;
  }

  return null;
}