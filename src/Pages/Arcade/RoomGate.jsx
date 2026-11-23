// src/Pages/Arcade/RoomGate.jsx
//
// Owns the one WebSocket for a play session. Shows the join code while
// waiting, then mounts the game and hands it everything it needs:
//   <Game net room role isHost solo onLeave />
// Once the game has started it stays mounted even if the partner drops,
// with a small banner while they reconnect.

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useArcadeRoom } from "./net/useArcadeRoom";
import { S, C } from "./ui";

export default function RoomGate({ room, game, onLeave }) {
  const net    = useArcadeRoom(room.id);
  const role   = room.role;
  const isHost = role === "p1";

  const [started, setStarted] = useState(false);
  const [solo,    setSolo]    = useState(false);

  // Start as soon as both players are connected. If you were playing solo,
  // the partner arriving switches you into co-op without a restart.
  useEffect(() => {
    if (net.partnerOnline) { setStarted(true); setSolo(false); }
  }, [net.partnerOnline]);

  const leave = useCallback(async () => {
    try { await api.post(`/arcade/rooms/${room.id}/leave`); } catch {}
    onLeave();
  }, [room.id, onLeave]);

  // ── Connection failed for good ────────────────────────────────────────────
  if (net.status === "failed") {
    return (
      <main style={S.screen}>
        <div style={{ fontSize: 48 }}>🔌</div>
        <p style={{ ...S.error, fontSize: 16 }}>{net.error}</p>
        <div style={S.col}>
          <button style={S.btn("primary")} onClick={net.retry}>Try again</button>
          <button style={S.btn("ghost")} onClick={leave}>← leave</button>
        </div>
      </main>
    );
  }

  // ── Waiting for the other player ──────────────────────────────────────────
  if (!started) {
    return (
      <main style={S.screen}>
        <p style={S.eyebrow}>{game.icon} {game.name}</p>

        {isHost ? (
          <>
            <p style={{ color: C.dim, margin: 0 }}>On the other device, tap “Join with a code” and enter:</p>
            <div style={{
              fontFamily: "monospace", fontSize: 64, fontWeight: 800, letterSpacing: "0.25em",
              color: C.accent, padding: "8px 0 8px 0.25em",
            }}>
              {room.join_code}
            </div>
          </>
        ) : (
          <h1 style={S.title}>Joined! 🎉</h1>
        )}

        <Pulse />
        <p style={{ color: C.dim, margin: 0 }}>
          {net.status === "open"
            ? (isHost ? "waiting for your partner…" : "connecting to the host…")
            : "connecting to the server…"}
        </p>

        <div style={S.col}>
          {game.allowSolo && (
            <button style={S.btn("ghost")} onClick={() => { setSolo(true); setStarted(true); }}>
              Play solo for now
            </button>
          )}
          <button style={{ ...S.btn("ghost"), border: "none" }} onClick={leave}>← leave</button>
        </div>
      </main>
    );
  }

  // ── In game ───────────────────────────────────────────────────────────────
  const Game = game.component;
  const showBanner = !solo && (!net.partnerOnline || net.status !== "open");

  return (
    <div style={{ position: "relative", minHeight: "100svh", background: C.bg }}>
      {showBanner && (
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 50,
          padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
          background: "rgba(255,122,107,0.15)", border: `1px solid ${C.bad}`, color: C.bad,
          fontFamily: "system-ui, sans-serif", pointerEvents: "none",
        }}>
          {net.status !== "open" ? "reconnecting…" : "partner disconnected — waiting…"}
        </div>
      )}
      <Suspense fallback={<main style={S.screen}><Pulse /></main>}>
        <Game net={net} room={room} role={role} isHost={isHost || solo} solo={solo} onLeave={leave} />
      </Suspense>
    </div>
  );
}

function Pulse() {
  return (
    <>
      <style>{`@keyframes arcadePulse { 0%,100% { transform: scale(0.8); opacity: .4 } 50% { transform: scale(1.1); opacity: 1 } }`}</style>
      <div style={{ display: "flex", gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%", background: C.accent2,
            animation: `arcadePulse 1.2s ${i * 0.18}s infinite ease-in-out`,
          }} />
        ))}
      </div>
    </>
  );
}
