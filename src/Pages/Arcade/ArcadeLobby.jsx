// src/Pages/Arcade/ArcadeLobby.jsx
// Host a room (get a 4-letter code) or join one with a code.

import React, { useState } from "react";
import { api } from "@/lib/api";
import { S, C } from "./ui";

export default function ArcadeLobby({ game, onRoomReady, onBack }) {
  const [mode,    setMode]    = useState("choose"); // choose | join
  const [code,    setCode]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);

  async function host() {
    setBusy(true); setError(null);
    try {
      const { data } = await api.post("/arcade/rooms", { game_id: game.id });
      onRoomReady(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't start a room. Is the server awake?");
    } finally { setBusy(false); }
  }

  async function join() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post("/arcade/rooms/join", { join_code: c });
      onRoomReady(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "No room with that code.");
    } finally { setBusy(false); }
  }

  return (
    <main style={S.screen}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>{game.icon}</div>
        <h1 style={{ ...S.title, marginTop: 10 }}>{game.name}</h1>
        <p style={{ color: C.dim, marginTop: 6, maxWidth: 300 }}>{game.blurb}</p>
      </div>

      {mode === "choose" && (
        <div style={S.col}>
          <button style={{ ...S.btn("primary"), opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={host}>
            {busy ? "starting…" : "Host a game"}
          </button>
          <button style={S.btn("ghost")} disabled={busy} onClick={() => { setMode("join"); setError(null); }}>
            Join with a code
          </button>
          <button style={{ ...S.btn("ghost"), border: "none" }} onClick={onBack}>← back to arcade</button>
        </div>
      )}

      {mode === "join" && (
        <div style={S.col}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={code}
              maxLength={4}
              placeholder="CODE"
              autoCapitalize="characters"
              autoComplete="off"
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              onKeyDown={e => e.key === "Enter" && join()}
              style={S.input}
            />
          </div>
          <button
            style={{ ...S.btn("primary"), opacity: busy || code.length < 4 ? 0.5 : 1 }}
            disabled={busy || code.length < 4}
            onClick={join}
          >
            {busy ? "joining…" : "Join"}
          </button>
          <button style={S.btn("ghost")} disabled={busy} onClick={() => { setMode("choose"); setError(null); setCode(""); }}>
            ← back
          </button>
        </div>
      )}

      {error && <p style={S.error}>{error}</p>}
    </main>
  );
}
