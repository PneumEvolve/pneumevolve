// src/Pages/InkRun/InkRunLobby.jsx
import React, { useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

export default function GameTestLobby({ onRoomReady }) {
  const [joinCode, setJoinCode] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleCreate() {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/game-test/rooms");
      onRoomReady(data, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create room.");
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/game-test/rooms/join", { join_code: code });
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found or already started.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-widest" style={{ color: "rgba(180,140,255,0.9)" }}>
            Game Test
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            a place to test and learn
          </p>
        </div>

        <div className="rounded-xl border p-4 space-y-2 text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          <p>
            <span style={{ color: "rgba(180,140,255,0.8)" }}>Player One View</span> 
          </p>
          <p>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>Player Two View</span> 
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all disabled:opacity-40"
            style={{
              background: "rgba(180,140,255,0.1)",
              border: "1px solid rgba(180,140,255,0.25)",
              color: "rgba(180,140,255,0.9)",
            }}
          >
            {loading ? "Creating…" : "Create Room — Player One"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="JOIN CODE"
              maxLength={6}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-center outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
              }}
            />
            <button
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              className="px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Join
            </button>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs" style={{ color: "rgba(255,100,100,0.8)" }}>{error}</p>
        )}

        <Link to="/" className="block text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          ← home
        </Link>
      </div>
    </main>
  );
}