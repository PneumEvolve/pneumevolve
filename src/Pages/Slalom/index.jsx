// src/Pages/Slalom/index.jsx
import React, { useState } from "react";
import SlalomLobby from "./SlalomLobby";
import FreeskateSlalom from "./FreeskateSlalom";
import SlalomLeaderboard from "./SlalomLeaderboard";

export default function SlalomPage() {
  const [room, setRoom]   = useState(null);
  const [role, setRole]   = useState(null);
  const [mode, setMode]   = useState("solo"); // "practice" | "solo" | "multiplayer"
  const [phase, setPhase] = useState("lobby"); // "lobby" | "game" | "leaderboard"

  function handleRoomReady(roomData, playerRole) {
    setRoom(roomData);
    setRole(playerRole);
    setMode("multiplayer");
    // Both P1 and P2 go straight into the game component.
    // P1 shows an in-canvas "waiting for P2" overlay until onPlayerReady fires via Supabase realtime.
    setPhase("game");
  }

  function handleSolo(selectedMode) {
    setMode(selectedMode);
    setRoom(null);
    setRole(null);
    setPhase("game");
  }

  if (phase === "lobby") {
    return (
      <SlalomLobby
        onRoomReady={handleRoomReady}
        onSolo={handleSolo}
        onLeaderboard={() => setPhase("leaderboard")}
      />
    );
  }

  if (phase === "leaderboard") {
    return <SlalomLeaderboard onBack={() => setPhase("lobby")} />;
  }

  return (
    <FreeskateSlalom
      roomId={room?.id ?? null}
      role={role}
      roomData={room}
      mode={mode}
    />
  );
}