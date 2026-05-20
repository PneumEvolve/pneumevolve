// src/Pages/Slalom/SlalomLobby.jsx
import React, { useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
}

export default function SlalomLobby({ onRoomReady, onSolo }) {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [showMulti, setShowMulti] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      await ensureSession();
      const { data } = await api.post("/slalom/rooms");
      onRoomReady(data, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create room.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSession();
      const { data } = await api.post("/slalom/rooms/join", { join_code: code });
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found or already started.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#060610] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-light tracking-widest" style={{ color: "rgba(100,180,255,0.9)" }}>
            freeskate slalom
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            two skates · one run
          </p>
        </div>

        {!showMulti ? (
          <>
            {/* How to play */}
            <div
              className="rounded-xl border p-4 space-y-2 text-xs leading-relaxed"
              style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
            >
              <p>
                Control both skates together — <span style={{ color: "rgba(100,180,255,0.8)" }}>top skate A/D</span>,{" "}
                <span style={{ color: "rgba(255,80,100,0.8)" }}>bottom skate ←/→</span>.
                Carve through gates, collect gems. Spread too far and you wipeout.
              </p>
            </div>

            {/* Mode buttons */}
            <div className="space-y-3">
              {/* Practice */}
              <button
                onClick={() => onSolo("practice")}
                className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all"
                style={{
                  background: "rgba(255,200,50,0.07)",
                  border: "1px solid rgba(255,200,50,0.2)",
                  color: "rgba(255,200,50,0.85)",
                }}
              >
                <div className="font-semibold">Practice</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,200,50,0.45)" }}>
                  no penalties · skate forever · learn the flow
                </div>
              </button>

              {/* Solo */}
              <button
                onClick={() => onSolo("solo")}
                className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all"
                style={{
                  background: "rgba(100,180,255,0.08)",
                  border: "1px solid rgba(100,180,255,0.22)",
                  color: "rgba(100,180,255,0.9)",
                }}
              >
                <div className="font-semibold">Solo</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(100,180,255,0.4)" }}>
                  3 misses and it's over · beat your best
                </div>
              </button>

              {/* Multiplayer */}
              <button
                onClick={() => setShowMulti(true)}
                className="w-full py-3 rounded-xl text-sm font-medium tracking-wide transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                2-Player Co-op →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Multiplayer panel */}
            <div
              className="rounded-xl border p-4 space-y-2 text-xs leading-relaxed"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
            >
              <p>
                <span style={{ color: "rgba(100,180,255,0.8)" }}>Player 1</span> controls the top skate (A / D).{" "}
                <span style={{ color: "rgba(255,80,100,0.8)" }}>Player 2</span> controls the bottom skate (← / →).
                Miss 3 gates together and the run ends.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all disabled:opacity-40"
                style={{
                  background: "rgba(100,180,255,0.08)",
                  border: "1px solid rgba(100,180,255,0.25)",
                  color: "rgba(100,180,255,0.9)",
                }}
              >
                {loading ? "Creating…" : "Create Room — Player 1"}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or join</span>
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

              <button
                onClick={() => { setShowMulti(false); setError(null); }}
                className="w-full py-2 text-xs"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                ← back
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="text-center text-xs" style={{ color: "rgba(255,100,100,0.8)" }}>
            {error}
          </p>
        )}

        <Link to="/" className="block text-center text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>
          ← home
        </Link>
      </div>
    </main>
  );
}