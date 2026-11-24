// src/Pages/Arcade/RoomGate.jsx
//
// Owns the one WebSocket for a play session and mounts the game with:
//   <Game net room role isHost solo onLeave />
//
// Two kinds of game (set in games/registry.js):
//   • Match games (default): show the join code and wait for the partner (or
//     "play solo"). isHost = seat p1, or you when solo.
//   • persistentWorld games (farm-style): go straight in — you can always play
//     solo and the world is saved on the room. isHost = the LIVE host from the
//     server (whoever got there first), and it can change mid-game.
// Once started, the game stays mounted through partner drops / reconnects.

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useArcadeRoom } from "./net/useArcadeRoom";
import { S, C } from "./ui";
import GameIcon from "./games/GameIcon";

export default function RoomGate({ room, game, onLeave }) {
  const net    = useArcadeRoom(room.id);
  const role   = room.role;
  const seatP1 = role === "p1";
  const partnerName = seatP1 ? room.player2_name : room.player1_name;
  const worldGame = !!game.persistentWorld;

  const [started, setStarted] = useState(false);
  const [solo,    setSolo]    = useState(false);

  // Start as soon as both players are connected. If you were playing solo,
  // the partner arriving switches you into co-op without a restart.
  useEffect(() => {
    if (net.partnerOnline) { setStarted(true); setSolo(false); }
  }, [net.partnerOnline]);

  // World games start the moment we're connected (host or not).
  useEffect(() => {
    if (worldGame && net.connId) setStarted(true);
  }, [worldGame, net.connId]);

  // Leaving just goes back to the room list — the room stays saved on both
  // accounts. Deleting happens from the list.
  const leave = useCallback(() => onLeave(), [onLeave]);

  // ── Connection failed for good ────────────────────────────────────────────
  if (net.status === "failed") {
    return (
      <main style={S.screen}>
        <div style={{ fontSize: 48 }}>🔌</div>
        <p style={{ ...S.error, fontSize: 16 }}>{net.error}</p>
        <div style={S.col}>
          <button style={S.btn("primary")} onClick={net.retry}>Try again</button>
          <button style={S.btn("ghost")} onClick={leave}>← back to rooms</button>
        </div>
      </main>
    );
  }

  // ── World game: just connecting ───────────────────────────────────────────
  if (worldGame && !started) {
    return (
      <main style={S.screen}>
        <p style={{ ...S.eyebrow, display: "flex", alignItems: "center", gap: 8 }}><GameIcon icon={game.icon} size={22} /> {game.name}</p>
        <h1 style={S.title}>Room {room.join_code}</h1>
        <Pulse />
        <p style={{ color: C.dim, margin: 0 }}>opening your world…</p>
        <button style={{ ...S.btn("ghost"), border: "none", maxWidth: 340 }} onClick={leave}>← back to rooms</button>
      </main>
    );
  }

  // ── Waiting for the other player ──────────────────────────────────────────
  if (!started) {
    return (
      <main style={S.screen}>
        <p style={{ ...S.eyebrow, display: "flex", alignItems: "center", gap: 8 }}><GameIcon icon={game.icon} size={22} /> {game.name}</p>

        {seatP1 && !partnerName ? (
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
          <>
            <h1 style={S.title}>Room {room.join_code}</h1>
            <p style={{ color: C.dim, margin: 0 }}>with {partnerName || "your partner"}</p>
          </>
        )}

        <Pulse />
        <p style={{ color: C.dim, margin: 0, textAlign: "center" }}>
          {net.status !== "open"
            ? "connecting to the server…"
            : partnerName
              ? `waiting for ${partnerName} to open this room…`
              : "waiting for your partner…"}
        </p>

        <div style={S.col}>
          {game.allowSolo && (
            <button style={S.btn("ghost")} onClick={() => { setSolo(true); setStarted(true); }}>
              Play solo for now
            </button>
          )}
          <button style={{ ...S.btn("ghost"), border: "none" }} onClick={leave}>← back to rooms</button>
        </div>
      </main>
    );
  }

  // ── In game ───────────────────────────────────────────────────────────────
  const Game = game.component;
  const showBanner = worldGame
    ? net.status !== "open"                                 // partner being away is normal here
    : !solo && (!net.partnerOnline || net.status !== "open");
  const gameIsHost = worldGame ? net.amHost : (seatP1 || solo);
  const gameSolo   = worldGame ? !net.partnerOnline : solo;

  return (
    <div style={{ position: "relative", minHeight: "100svh", background: C.bg }}>
      {/* Room code + connection status, top-centre, for every game */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 50,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        fontFamily: "system-ui, sans-serif", pointerEvents: "none",
      }}>
        <div style={{
          padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`, color: C.dim,
        }}>
          room <span style={{ fontFamily: "monospace", fontSize: 14, letterSpacing: "0.15em", color: C.accent }}>{room.join_code}</span>
        </div>
        {showBanner && (
          <div style={{
            padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
            background: "rgba(255,122,107,0.15)", border: `1px solid ${C.bad}`, color: C.bad,
          }}>
            {net.status !== "open" ? "reconnecting…" : "partner disconnected — waiting…"}
          </div>
        )}
      </div>
      <GameCrashCatcher onLeave={leave}>
        <Suspense fallback={<main style={S.screen}><Pulse /></main>}>
          <Game net={net} room={room} role={role} isHost={gameIsHost} solo={gameSolo} onLeave={leave} />
        </Suspense>
      </GameCrashCatcher>
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


// If a game crashes (or its code can't be downloaded), show a card with a
// Reload button and the error, instead of a blank white screen.
class GameCrashCatcher extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[arcade] game crashed:", error, info?.componentStack); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main style={S.screen}>
        <div style={{ ...S.col, textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ ...S.title, fontSize: 24 }}>Something broke</h1>
          <p style={{ color: C.dim, margin: 0 }}>
            Reloading usually fixes it (especially right after an update).
          </p>
          <button style={S.btn("primary")} onClick={() => window.location.reload()}>Reload</button>
          <button style={S.btn("ghost")} onClick={() => { this.setState({ error: null }); this.props.onLeave?.(); }}>Back to rooms</button>
          <code style={{ fontSize: 11, color: C.faint, wordBreak: "break-word" }}>{String(error?.message || error).slice(0, 200)}</code>
        </div>
      </main>
    );
  }
}