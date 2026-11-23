// src/Pages/Arcade/index.jsx
//
// Bash & Dad's Arcade. Phases: home (pick a game) → lobby (host/join) → room.
// Mounted in main.jsx behind <RequireAuth>, so everyone here is signed in
// and their saves load from their own account on any device.

import React, { useState } from "react";
import ArcadeLobby from "./ArcadeLobby";
import RoomGate    from "./RoomGate";
import { GAMES, getGame } from "./games/registry";
import { S, C } from "./ui";

export default function ArcadeGame() {
  const [phase,  setPhase]  = useState("home"); // home | lobby | room
  const [gameId, setGameId] = useState(null);
  const [room,   setRoom]   = useState(null);
  const game = getGame(gameId);

  if (phase === "lobby" && game) {
    return (
      <ArcadeLobby
        game={game}
        onRoomReady={(r) => { setRoom(r); setPhase("room"); }}
        onBack={() => setPhase("home")}
      />
    );
  }

  if (phase === "room" && room && game) {
    return (
      <RoomGate
        key={room.id}
        room={room}
        game={game}
        onLeave={() => { setRoom(null); setPhase("lobby"); }}
      />
    );
  }

  return (
    <main style={S.screen}>
      <div style={{ textAlign: "center" }}>
        <p style={S.eyebrow}>welcome to</p>
        <h1 style={{ ...S.title, fontSize: 34 }}>Bash &amp; Dad’s Arcade</h1>
      </div>

      <div style={S.col}>
        {GAMES.map(g => {
          const ready = g.status === "ready" && g.component;
          return (
            <button
              key={g.id}
              disabled={!ready}
              onClick={() => { setGameId(g.id); setPhase("lobby"); }}
              style={{ ...S.card, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "default" }}
            >
              <span style={{ fontSize: 34, lineHeight: 1 }}>{g.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 17 }}>{g.name}</span>
                <span style={{ display: "block", color: C.dim, fontSize: 13, marginTop: 3 }}>{g.blurb}</span>
              </span>
              {!ready && <span style={{ fontSize: 11, color: C.accent, fontWeight: 800 }}>SOON</span>}
            </button>
          );
        })}
      </div>
    </main>
  );
}
