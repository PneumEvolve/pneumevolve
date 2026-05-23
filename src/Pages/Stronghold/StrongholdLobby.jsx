// src/Pages/Stronghold/StrongholdLobby.jsx
import React, { useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

const DIFF_OPTIONS = [
  { id: "easy",   label: "Easy",   desc: "Infinite time — both ready up between waves." },
  { id: "normal", label: "Normal", desc: "Timed breather between waves." },
  { id: "hard",   label: "Hard",   desc: "No rest — waves follow immediately." },
];

function formatSaveAge(savedAt) {
  const mins = Math.floor((Date.now() - savedAt) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StrongholdLobby({ onRoomReady, savedGames = [], onResume, onDeleteSave }) {
  const [joinCode,    setJoinCode]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [difficulty,  setDifficulty]  = useState("normal");

  async function handleCreate() {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/stronghold/rooms", { difficulty });
      onRoomReady({ ...data, difficulty }, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create room.");
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/stronghold/rooms/join", { join_code: code });
      // Carry over difficulty from room if it was set by creator; fall back to normal
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found or already started.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-widest" style={{ color: "rgba(255,210,80,0.95)" }}>
            stronghold
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            a co-op town defense
          </p>
        </div>

        {/* How to play */}
        <div className="rounded-xl border p-4 space-y-3 text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          <p>
            <span style={{ color: "rgba(255,210,80,0.8)" }}>The Protector</span> defends the town.
            Move your hero, command your army, hold the line.
          </p>
          <p>
            <span style={{ color: "rgba(120,200,255,0.8)" }}>The Builder</span> constructs and maintains it.
            Place buildings, run to repair them, keep the town alive.
          </p>
          <p style={{ color: "rgba(255,255,255,0.2)" }}>
            If the Town Center falls, you both lose.
          </p>
        </div>

        {/* Saved games */}
        {savedGames.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>saved games</p>
            {savedGames.map(save => (
              <div key={save.roomId} className="rounded-xl p-3 flex items-center justify-between gap-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <div className="text-xs" style={{ color: "rgba(255,210,80,0.8)" }}>
                    after wave {save.waveNumber} · {save.difficulty ?? "normal"}
                  </div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                    {formatSaveAge(save.savedAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onResume(save)}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                    style={{ background: "rgba(255,210,80,0.1)", border: "1px solid rgba(255,210,80,0.25)", color: "rgba(255,210,80,0.85)" }}
                  >
                    resume
                  </button>
                  <button
                    onClick={() => onDeleteSave(save.roomId)}
                    className="px-3 py-2 rounded-lg text-xs transition-all"
                    style={{ background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.15)", color: "rgba(255,80,80,0.5)" }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Difficulty picker */}
        <div className="space-y-2">
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>difficulty</p>
          <div className="flex gap-2">
            {DIFF_OPTIONS.map(d => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className="flex-1 py-3 rounded-xl text-xs font-medium tracking-wide transition-all"
                style={{
                  background:  difficulty === d.id ? "rgba(255,210,80,0.1)" : "rgba(255,255,255,0.03)",
                  border:      `1px solid ${difficulty === d.id ? "rgba(255,210,80,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color:       difficulty === d.id ? "rgba(255,210,80,0.9)" : "rgba(255,255,255,0.35)",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            {DIFF_OPTIONS.find(d => d.id === difficulty)?.desc}
          </p>
        </div>

        {/* Create */}
        <div className="space-y-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all disabled:opacity-40"
            style={{
              background:   "rgba(255,210,80,0.1)",
              border:       "1px solid rgba(255,210,80,0.25)",
              color:        "rgba(255,210,80,0.9)",
            }}
          >
            {loading ? "Creating…" : "Create Room — Protector"}
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
                border:     "1px solid rgba(255,255,255,0.1)",
                color:      "rgba(255,255,255,0.8)",
              }}
            />
            <button
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              className="px-5 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: "rgba(120,200,255,0.08)",
                border:     "1px solid rgba(120,200,255,0.2)",
                color:      "rgba(120,200,255,0.8)",
              }}
            >
              Join — Builder
            </button>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs" style={{ color: "rgba(255,100,100,0.8)" }}>
            {error}
          </p>
        )}

        <Link to="/" className="block text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          ← home
        </Link>
      </div>
    </main>
  );
}