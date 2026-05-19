// src/Pages/Slalom/index.jsx
import React, { useState, useEffect, useRef } from "react";
import SlalomLobby from "./SlalomLobby";
import FreeskateSlalom from "./FreeskateSlalom";
import { api } from "@/lib/api";

function WaitingRoom({ room, onP2Joined }) {
  const intervalRef = useRef(null);

  useEffect(() => {
    // Poll GET /slalom/rooms/:id every 1.5s until status === "active"
    intervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/slalom/rooms/${room.id}`);
        if (data.status === "active") {
          clearInterval(intervalRef.current);
          onP2Joined();
        }
      } catch (e) {
        // silently ignore transient errors, keep polling
      }
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [room.id, onP2Joined]);

  return (
    <main className="min-h-screen bg-[#060610] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <h1 className="text-2xl font-light tracking-widest" style={{ color: "rgba(100,180,255,0.9)" }}>
          room created
        </h1>

        <div className="space-y-2">
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            share this code with player 2
          </p>
          <div
            className="text-5xl font-mono tracking-[0.3em] py-6 rounded-xl"
            style={{
              background: "rgba(100,180,255,0.06)",
              border: "1px solid rgba(100,180,255,0.15)",
              color: "rgba(100,180,255,0.95)",
            }}
          >
            {room.join_code}
          </div>
        </div>

        <p className="text-xs animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>
          waiting for player 2 to join…
        </p>
      </div>
    </main>
  );
}

export default function SlalomPage() {
  const [room, setRoom]   = useState(null);
  const [role, setRole]   = useState(null);
  const [phase, setPhase] = useState("lobby"); // "lobby" | "waiting" | "game"

  function handleRoomReady(roomData, playerRole) {
    setRoom(roomData);
    setRole(playerRole);
    // P1 waits for P2; P2 goes straight into the game
    setPhase(playerRole === "p1" ? "waiting" : "game");
  }

  if (phase === "lobby")   return <SlalomLobby onRoomReady={handleRoomReady} />;
  if (phase === "waiting") return <WaitingRoom room={room} onP2Joined={() => setPhase("game")} />;
  return <FreeskateSlalom roomId={room.id} role={role} roomData={room} />;
}