// src/Pages/Arcade/index.jsx
//
// Bash & Dad's Arcade. Phases: home (pick a game) → lobby (host/join) → room.
// Mounted in main.jsx behind <RequireAuth>, so everyone here is signed in
// and their saves load from their own account on any device.

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ArcadeLobby from "./ArcadeLobby";
import RoomGate    from "./RoomGate";
import { GAMES, getGame } from "./games/registry";
import GameIcon from "./games/GameIcon";
import { S, C } from "./ui";

// Remember which room you're in (this tab only), so if the page has to reload
// itself to pick up a new deploy (see lazyGame in registry.js) you land right
// back in that room instead of on the home screen.
const RESUME_KEY = "arcade_resume_room";
const RELOAD_KEY = "arcade_chunk_reload_at";
const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* blocked */ } },
};

export default function ArcadeGame() {
  const [phase,  setPhase]  = useState("home"); // home | lobby | room
  const [gameId, setGameId] = useState(null);
  const [room,   setRoom]   = useState(null);
  const game = getGame(gameId);

  // Just auto-reloaded? Go back into the room we were opening.
  useEffect(() => {
    const id = ss.get(RESUME_KEY);
    const reloadedAt = Number(ss.get(RELOAD_KEY)) || 0;
    if (!id || Date.now() - reloadedAt > 60_000) return;
    api.get(`/arcade/rooms/${id}`)
      .then(({ data }) => { setGameId(data.game_id); setRoom(data); setPhase("room"); })
      .catch(() => ss.set(RESUME_KEY, null));
  }, []);

  useEffect(() => { ss.set(RESUME_KEY, phase === "room" && room ? String(room.id) : null); }, [phase, room]);

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
              <GameIcon icon={g.icon} size={40} />
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