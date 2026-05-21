// src/Pages/InkRun/index.jsx
import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import InkRunLobby from "./InkRunLobby";
import RunnerView from "./RunnerView";
import PainterView from "./PainterView";
import { useInkRunRoom } from "./useInkRunRoom";

// ── Waiting screen ─────────────────────────────────────────────────────────────
function WaitingForPlayer2({ room, onPlayer2Joined }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(room.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Listen for player_ready via realtime instead of polling REST every 2s
  const handlers = useRef({
    onPlayerReady: () => { onPlayer2Joined(room); },
  }).current;
  useInkRunRoom(room?.id ?? null, handlers);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        waiting for painter
      </p>
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>share this code</p>
        <div className="text-5xl font-mono font-light tracking-widest"
          style={{ color: "rgba(180,140,255,0.9)" }}>
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

// ── Game over screen — shows stats + timelapse hint ───────────────────────────
function GameOver({ stats, role, strokeHistory, onRestart }) {
  const isP1 = role === "p1";
  const canvasRef = useRef(null);

  // Timelapse playback of painter strokes
  useEffect(() => {
    if (!strokeHistory?.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    let frameIndex = 0;
    const allPoints = strokeHistory.flatMap(s =>
      s.points.map(p => ({ ...p, color: s.color, strokeId: s.id }))
    );
    const totalFrames = allPoints.length;
    if (totalFrames === 0) return;

    // Find bounding box of all strokes to fit them in the canvas (loop to avoid spread stack overflow)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const rangeX = Math.max(1, maxX - minX), rangeY = Math.max(1, maxY - minY);
    const scale  = Math.min((W - 40) / rangeX, (H - 40) / rangeY) * 0.85;
    const offX   = W / 2 - (minX + rangeX / 2) * scale;
    const offY   = H / 2 - (minY + rangeY / 2) * scale;

    function toCanvas(x, y) {
      return { cx: x * scale + offX, cy: y * scale + offY };
    }

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Draw a faint ground reference line so strokes have spatial context
    const { cy: groundCY } = toCanvas(0, 640); // GROUND_Y ≈ 640 in world coords
    ctx.strokeStyle = "rgba(74,74,122,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundCY);
    ctx.lineTo(W, groundCY);
    ctx.stroke();

    // Draw POINTS_PER_FRAME points per animation frame for smooth but quick playback
    const POINTS_PER_FRAME = Math.max(1, Math.ceil(totalFrames / 120));
    let lastStrokeId = null;

    function tick() {
      for (let i = 0; i < POINTS_PER_FRAME && frameIndex < totalFrames; i++, frameIndex++) {
        const pt   = allPoints[frameIndex];
        const { cx, cy } = toCanvas(pt.x, pt.y);
        ctx.strokeStyle = pt.color === "red" ? "rgba(255,80,80,0.85)" : "rgba(220,230,255,0.75)";
        ctx.lineWidth   = 3;
        ctx.lineCap     = "round";
        ctx.lineJoin    = "round";
        if (pt.strokeId !== lastStrokeId) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          lastStrokeId = pt.strokeId;
        } else {
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
      }
      if (frameIndex < totalFrames) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [strokeHistory]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-5 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        run over
      </p>

      {/* Stats */}
      <div className="flex gap-8 text-center">
        <div>
          <div className="text-4xl font-light" style={{ color: "rgba(180,140,255,0.9)" }}>
            {stats?.distance ?? 0}
          </div>
          <div className="text-xs mt-1 tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
            metres
          </div>
        </div>
        <div>
          <div className="text-4xl font-light" style={{ color: "rgba(255,100,100,0.9)" }}>
            {stats?.kills ?? 0}
          </div>
          <div className="text-xs mt-1 tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
            kills
          </div>
        </div>
        <div>
          <div className="text-4xl font-light" style={{ color: "rgba(220,230,255,0.7)" }}>
            {stats?.strokes ?? 0}
          </div>
          <div className="text-xs mt-1 tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
            strokes
          </div>
        </div>
      </div>

      {/* Timelapse canvas */}
      {strokeHistory?.length > 0 && (
        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            style={{
              borderRadius: 12,
              border: "0.5px solid rgba(255,255,255,0.08)",
              display: "block",
            }}
          />
          <p className="text-xs text-center mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
            your run, painted
          </p>
        </div>
      )}

      {isP1 ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
            play again?
          </p>
          <button
            onClick={() => onRestart(false)}
            className="w-full py-3 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(180,140,255,0.08)",
              border: "1px solid rgba(180,140,255,0.2)",
              color: "rgba(180,140,255,0.85)",
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
          waiting for runner to restart…
        </p>
      )}
    </main>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function InkRunGame() {
  const [phase,         setPhase]         = useState("lobby");
  const [room,          setRoom]          = useState(null);
  const [role,          setRole]          = useState(null);
  const [finalStats,    setFinalStats]    = useState(null);
  const [strokeHistory, setStrokeHistory] = useState([]);
  const [restartCount,  setRestartCount]  = useState(0);

  const phaseRef = useRef(phase);
  const roleRef  = useRef(role);
  const roomRef  = useRef(room);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roleRef.current  = role;  }, [role]);
  useEffect(() => { roomRef.current  = room;  }, [room]);

  // Only subscribe at index level when not playing — game events during playing
  // are handled by RunnerView/PainterView's own :game channel subscriptions.
  const activeRoomId = phase === "playing" ? null : room?.id ?? null;

  const handlers = useRef({
    onPlayerReady: () => {
      if (phaseRef.current === "waiting" && roleRef.current === "p1") {
        setPhase("playing");
      }
    },
    // game_over is broadcast by p1 (runner) and received here only by p2 (painter).
    // p1 transitions via handleP1GameOver directly without a broadcast round-trip.
    // The PainterView also has its own guarded handler — this root handler is the
    // fallback for when PainterView has already unmounted or not yet subscribed.
    onGameOver: (stats) => {
      if (phaseRef.current === "playing" && roleRef.current === "p2") {
        setFinalStats(stats);
        setPhase("gameover");
      }
    },
    onRestart: ({ seed, swap }) => {
      const newRole = swap
        ? (roleRef.current === "p1" ? "p2" : "p1")
        : roleRef.current;
      setRoom(prev => prev ? { ...prev, map_seed: seed } : prev);
      setRole(newRole);
      setFinalStats(null);
      setStrokeHistory([]);
      setRestartCount(c => c + 1);
      setPhase("playing");
    },
  }).current;

  const { sendRestart } =
    useInkRunRoom(activeRoomId, handlers);

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    setPhase(assignedRole === "p1" ? "waiting" : "playing");
  }

  function handlePlayer2Joined(updatedRoom) {
    setRoom(updatedRoom);
    setPhase("playing");
  }

  // P1 (runner) owns game-over
  async function handleP1GameOver(stats, strokes) {
    setFinalStats(stats);
    setStrokeHistory(strokes);
    setPhase("gameover");
    try {
      await api.patch(`/inkrun/rooms/${room.id}`, { final_score: stats.distance });
    } catch { /* non-critical */ }
  }

  // P2 (painter) just transitions — runner's broadcast triggers P2's gameover
  function handleP2GameOver(stats, strokes) {
    setFinalStats(stats);
    setStrokeHistory(strokes);
    setPhase("gameover");
  }

  function handleRestart(swap) {
    const newSeed = Date.now() & 0x7fffffff;
    const currentRole = role;
    const newRole = swap
      ? (currentRole === "p1" ? "p2" : "p1")
      : currentRole;
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : prev);
    setRole(newRole);
    setFinalStats(null);
    setStrokeHistory([]);
    setRestartCount(c => c + 1);
    setPhase("playing");
    sendRestart(newSeed, swap);
  }

  if (phase === "lobby") return <InkRunLobby onRoomReady={handleRoomReady} />;

  if (phase === "waiting") return (
    <WaitingForPlayer2 room={room} onPlayer2Joined={handlePlayer2Joined} />
  );

  if (phase === "gameover") return (
    <GameOver
      stats={finalStats}
      role={role}
      strokeHistory={strokeHistory}
      onRestart={handleRestart}
    />
  );

  if (phase === "playing") {
    if (role === "p1") return (
      <RunnerView
        key={`${restartCount}-${room?.map_seed}`}
        room={room}
        onGameOver={handleP1GameOver}
      />
    );
    return (
      <PainterView
        key={`${restartCount}-${room?.map_seed}`}
        room={room}
        onGameOver={handleP2GameOver}
      />
    );
  }

  return null;
}