// src/Pages/Firefly/index.jsx
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import FireflyLobby from "./FireflyLobby";
import PlayerOneView from "./PlayerOneView";
import PlayerTwoView from "./PlayerTwoView";
import { useFireflyRoom } from "./useFireflyRoom";

// ── Waiting screen — polls backend until room.status === "active" ─────────────
function WaitingForPlayer2({ room, onPlayer2Joined }) {
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
        const { data } = await api.get(`/firefly/rooms/${room.id}`);
        if (data.status === "active") {
          clearInterval(interval);
          onPlayer2Joined(data);
        }
      } catch { /* wait for next tick */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        waiting for player 2
      </p>
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>share this code</p>
        <div className="text-5xl font-mono font-light tracking-widest"
          style={{ color: "rgba(200,255,150,0.9)" }}>
          {room.join_code}
        </div>
      </div>
      <button onClick={copy}
        className="text-xs px-4 py-2 rounded-lg border transition-all"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
        {copied ? "copied ✓" : "copy code"}
      </button>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
        both players need to be on this page
      </p>
    </main>
  );
}

function GameOver({ score, role, onRestart }) {
  const isP1 = role === "p1";
  return (
    <main className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        time's up
      </p>
      <div className="text-center">
        <div className="text-6xl font-light" style={{ color: "rgba(200,255,150,0.9)" }}>
          {score}
        </div>
        <div className="text-xs mt-2 tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          fireflies collected
        </div>
      </div>
      {isP1 ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
            play again?
          </p>
          <button
            onClick={() => onRestart(false)}
            className="w-full py-3 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(200,255,150,0.08)",
              border: "1px solid rgba(200,255,150,0.2)",
              color: "rgba(200,255,150,0.85)",
            }}
          >
            same roles
          </button>
          <button
            onClick={() => onRestart(true)}
            className="w-full py-3 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            swap roles
          </button>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
          waiting for player 1 to restart…
        </p>
      )}
    </main>
  );
}

export default function FireflyGame() {
  const { userId } = useAuth();

  const [phase,      setPhase]      = useState("lobby");
  const [room,       setRoom]       = useState(null);
  const [role,       setRole]       = useState(null);
  const [finalScore, setFinalScore] = useState(0);

  const phaseRef = useRef(phase);
  const roleRef  = useRef(role);
  const roomRef  = useRef(room);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roleRef.current  = role;  }, [role]);
  useEffect(() => { roomRef.current  = room;  }, [room]);

  // ── IMPORTANT: only subscribe to the channel when NOT playing ────────────
  // While a game view (PlayerOneView / PlayerTwoView) is mounted it holds the
  // one active subscription for this room. A second subscription from index.jsx
  // on the same channel name causes Supabase to conflict and drop events —
  // that's why P1's position wasn't showing on P2's screen.
  // We pass null during "playing" so index.jsx's hook is a no-op then.
  const activeRoomId = phase === "playing" ? null : room?.id ?? null;

  const handlers = useRef({
    // Backup: fires if P2's broadcast arrives before polling catches it
    onPlayerReady: () => {
      if (phaseRef.current === "waiting" && roleRef.current === "p1") {
        setPhase("playing");
      }
    },

    // P2 receives this when P1's timer hits zero
    onGameOver: ({ final_score }) => {
      if (phaseRef.current !== "gameover") {
        setFinalScore(final_score);
        setPhase("gameover");
      }
    },

    // Either player receives this when P1 picks a restart option
    onRestart: ({ seed, swap }) => {
      const newRole = swap
        ? (roleRef.current === "p1" ? "p2" : "p1")
        : roleRef.current;
      setRoom(prev => prev ? { ...prev, map_seed: seed } : prev);
      setRole(newRole);
      setFinalScore(0);
      setPhase("playing");
    },
  }).current;

  const { sendPlayerReady, sendGameOver, sendRestart } =
    useFireflyRoom(activeRoomId, handlers);

  // P2 announces readiness so the backup onPlayerReady fires on P1
  useEffect(() => {
    if (role === "p2" && room?.id) {
      sendPlayerReady();
    }
  }, [role, room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    setPhase(assignedRole === "p1" ? "waiting" : "playing");
  }

  function handlePlayer2Joined(updatedRoom) {
    setRoom(updatedRoom);
    setPhase("playing");
  }

  // P1 owns game-over — broadcasts score to P2, patches the backend
  async function handleP1GameOver(score) {
    setFinalScore(score);
    setPhase("gameover");
    sendGameOver(score);
    try {
      await api.patch(`/firefly/rooms/${room.id}`, { final_score: score });
    } catch { /* non-critical */ }
  }

  // P2 just transitions locally — does NOT re-broadcast
  function handleP2GameOver(score) {
    setFinalScore(score);
    setPhase("gameover");
  }

  // P1 picks a restart — generates fresh seed, updates self, tells P2
  function handleRestart(swap) {
    const newSeed = Date.now() & 0x7fffffff;
    const newRole = swap ? "p2" : "p1";
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : prev);
    setRole(newRole);
    setFinalScore(0);
    setPhase("playing");
    sendRestart(newSeed, swap);
  }

  if (phase === "lobby") return <FireflyLobby onRoomReady={handleRoomReady} />;

  if (phase === "waiting") return (
    <WaitingForPlayer2
      room={room}
      onPlayer2Joined={handlePlayer2Joined}
    />
  );

  if (phase === "gameover") return (
    <GameOver
      score={finalScore}
      role={role}
      onRestart={handleRestart}
    />
  );

  if (phase === "playing") {
    if (role === "p1") return (
      <PlayerOneView
        key={room?.map_seed}
        room={room}
        onGameOver={handleP1GameOver}
      />
    );
    return (
      <PlayerTwoView
        key={room?.map_seed}
        room={room}
        onGameOver={handleP2GameOver}
      />
    );
  }

  return null;
}