// src/Pages/Firefly/index.jsx
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import FireflyLobby from "./FireflyLobby";
import PlayerOneView from "./PlayerOneView";
import PlayerTwoView from "./PlayerTwoView";
import { useFireflyRoom } from "./useFireflyRoom";

function WaitingForPlayer2({ joinCode }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <main className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        waiting for player 2
      </p>
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>share this code</p>
        <div className="text-5xl font-mono font-light tracking-widest"
          style={{ color: "rgba(200,255,150,0.9)" }}>
          {joinCode}
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

function GameOver({ score, onPlayAgain }) {
  return (
    <main className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center gap-6">
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
      <button onClick={onPlayAgain}
        className="text-sm px-6 py-3 rounded-xl border transition-all"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.5)",
          background: "rgba(255,255,255,0.04)",
        }}>
        play again
      </button>
    </main>
  );
}

export default function FireflyGame() {
  const { userId } = useAuth();

  const [phase, setPhase]           = useState("lobby");
  const [room, setRoom]             = useState(null);
  const [role, setRole]             = useState(null);
  const [finalScore, setFinalScore] = useState(0);

  const phaseRef = useRef(phase);
  const roleRef  = useRef(role);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roleRef.current  = role;  }, [role]);

  const handlers = useRef({
    onPlayerReady: () => {
      if (phaseRef.current === "waiting" && roleRef.current === "p1") {
        setPhase("playing");
      }
    },
    onGameOver: ({ final_score }) => {
      setFinalScore(final_score);
      setPhase("gameover");
    },
  }).current;

  const { sendPlayerReady, sendGameOver } = useFireflyRoom(room?.id ?? null, handlers);

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

  async function handleGameOver(score) {
    setFinalScore(score);
    setPhase("gameover");
    sendGameOver(score);
    try {
      await api.patch(`/firefly/rooms/${room.id}`, { final_score: score });
    } catch { /* non-critical */ }
  }

  function handlePlayAgain() {
    setPhase("lobby");
    setRoom(null);
    setRole(null);
    setFinalScore(0);
  }

  if (phase === "lobby")    return <FireflyLobby onRoomReady={handleRoomReady} />;
  if (phase === "waiting")  return <WaitingForPlayer2 joinCode={room?.join_code} />;
  if (phase === "gameover") return <GameOver score={finalScore} onPlayAgain={handlePlayAgain} />;

  if (phase === "playing") {
    if (role === "p1") return <PlayerOneView room={room} onGameOver={handleGameOver} />;
    return <PlayerTwoView room={room} onGameOver={handleGameOver} />;
  }

  return null;
}