// src/Pages/Homestead/lobby_HomesteadLobby.jsx
// The room-picker screen shown before the player chooses a homestead.
// Lists saved rooms, lets you create a new one (up to MAX_OWNED_ROOMS), or
// join a friend's room by code.
//
// Extracted from index.jsx.

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

const MAX_OWNED_ROOMS = 3;

function timeSince(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const S = {
  root: {
    height: "100svh",
    background: "#0a120a",
    color: "#f5e6c8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    fontFamily: "monospace",
    padding: "0 24px",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  header: { textAlign: "center", marginBottom: 4 },
  eyebrow: { fontSize: 11, letterSpacing: "0.2em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 10 },
  title:   { fontSize: 28, fontWeight: 400, color: "rgba(200,230,160,0.9)", letterSpacing: "0.05em", margin: 0 },
  panel:   { width: "100%", maxWidth: 320 },
  card: {
    borderRadius: 12,
    border: "1px solid rgba(200,230,120,0.15)",
    background: "rgba(200,230,120,0.04)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
  },
  cardHover: {
    border: "1px solid rgba(200,230,120,0.35)",
    background: "rgba(200,230,120,0.08)",
  },
  sectionLabel: { fontSize: 10, letterSpacing: "0.16em", color: "rgba(200,230,160,0.35)", textTransform: "uppercase", marginBottom: 10 },
  joinCode: { fontSize: 20, letterSpacing: "0.14em", color: "rgba(200,230,120,0.9)", fontFamily: "monospace" },
  meta:     { fontSize: 10, color: "rgba(245,230,200,0.35)", marginTop: 2 },
  btn: (variant = "primary") => ({
    padding: "14px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "monospace",
    width: "100%",
    boxSizing: "border-box",
    transition: "opacity 0.15s",
    ...(variant === "primary"  ? { background: "rgba(200,230,120,0.08)", border: "1px solid rgba(200,230,120,0.25)", color: "rgba(200,230,120,0.9)" } : {}),
    ...(variant === "ghost"    ? { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(245,230,200,0.35)", fontSize: 11 } : {}),
    ...(variant === "danger"   ? { background: "transparent", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,100,80,0.7)", fontSize: 11 } : {}),
    ...(variant === "subtle"   ? { background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(245,230,200,0.25)", fontSize: 10 } : {}),
  }),
  input: {
    flex: 1,
    padding: "14px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f5e6c8",
    fontSize: 13,
    fontFamily: "monospace",
    letterSpacing: "0.12em",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  error: { fontSize: 11, color: "rgba(255,120,80,0.8)", textAlign: "center" },
  divider: { width: "100%", maxWidth: 320, display: "flex", alignItems: "center", gap: 10, margin: "4px 0" },
  dividerLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.06)" },
  dividerText: { fontSize: 10, color: "rgba(245,230,200,0.2)", letterSpacing: "0.1em" },
};

function SaveSlotCard({ room, onResume, onDelete, disabled }) {
  const [hovered,    setHovered]    = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{ ...S.card, ...(hovered && !confirming ? S.cardHover : {}), opacity: disabled ? 0.5 : 1 }}
        onClick={() => { if (!disabled && !confirming) onResume(room); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🏡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "rgba(200,230,120,0.9)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {room.name || "My Homestead"}
          </div>
          <div style={S.meta}>
            <span style={{ letterSpacing: "0.1em" }}>{room.join_code}</span>
            {" · "}
            <span>{room.role === "p1" ? "host" : "guest"}</span>
            {room.last_played_at && <span>{" · "}{timeSince(room.last_played_at)}</span>}
          </div>
        </div>
        {room.role === "p1" && (
          <button
            onClick={e => { e.stopPropagation(); setConfirming(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,100,80,0.4)", fontSize: 14, padding: "4px", flexShrink: 0, lineHeight: 1 }}
            title="Delete homestead"
          >
            ✕
          </button>
        )}
      </div>
      {confirming && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "#0d1a0d", border: "1px solid rgba(255,80,80,0.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, zIndex: 2 }}>
          <p style={{ fontSize: 11, color: "rgba(245,230,200,0.6)", textAlign: "center", margin: 0 }}>
            Delete <strong style={{ color: "rgba(200,230,120,0.8)" }}>{room.name}</strong>? This can't be undone.
          </p>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button onClick={() => setConfirming(false)} style={{ ...S.btn("ghost"), flex: 1, padding: "10px" }}>cancel</button>
            <button onClick={() => { setConfirming(false); onDelete(room.id); }} style={{ ...S.btn("danger"), flex: 1, padding: "10px" }}>delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HomesteadLobby({ onRoomReady }) {
  const [rooms,        setRooms]        = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [mode,         setMode]         = useState("list");
  const [newName,      setNewName]      = useState("");
  const [joinCode,     setJoinCode]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    setLoadingRooms(true);
    api.get("/homestead/rooms/mine")
      .then(({ data }) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, []);

  async function handleResume(room) {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get(`/homestead/rooms/${room.id}`);
      onRoomReady(data, data.role ?? room.role);
    } catch {
      setError("Couldn't connect. The room may have expired.");
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    const name = newName.trim() || "My Homestead";
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/homestead/rooms", { name });
      onRoomReady(data, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create homestead.");
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/homestead/rooms/join", { join_code: code });
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found.");
    } finally { setLoading(false); }
  }

  async function handleDelete(roomId) {
    try {
      await api.delete(`/homestead/rooms/${roomId}`);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't delete homestead.");
    }
  }

  const ownedCount = rooms.filter(r => r.role === "p1").length;
  const atLimit    = ownedCount >= MAX_OWNED_ROOMS;

  return (
    <main style={S.root}>
      <div style={S.header}>
        <p style={S.eyebrow}>hearthroot</p>
        <h1 style={S.title}>your homestead</h1>
      </div>

      {mode === "list" && (
        <div style={{ ...S.panel, display: "flex", flexDirection: "column", gap: 10 }}>
          {loadingRooms ? (
            <p style={{ ...S.meta, textAlign: "center", padding: "20px 0" }}>loading…</p>
          ) : rooms.length > 0 ? (
            <>
              <p style={S.sectionLabel}>saved homesteads</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rooms.map(room => (
                  <SaveSlotCard
                    key={room.id}
                    room={room}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    disabled={loading}
                  />
                ))}
              </div>
            </>
          ) : (
            <p style={{ ...S.meta, textAlign: "center", padding: "12px 0" }}>no homesteads yet</p>
          )}

          {error && <p style={S.error}>{error}</p>}

          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerText}>or</span>
            <div style={S.dividerLine} />
          </div>

          {!atLimit ? (
            <button
              onClick={() => { setMode("new"); setError(null); }}
              disabled={loading}
              style={{ ...S.btn("primary"), opacity: loading ? 0.4 : 1 }}
            >
              + new homestead
            </button>
          ) : (
            <p style={{ ...S.meta, textAlign: "center" }}>
              save limit reached ({MAX_OWNED_ROOMS}/{MAX_OWNED_ROOMS}) — delete one to create another
            </p>
          )}

          <button
            onClick={() => { setMode("join"); setError(null); }}
            disabled={loading}
            style={{ ...S.btn("ghost"), opacity: loading ? 0.4 : 1 }}
          >
            join with code
          </button>
        </div>
      )}

      {mode === "new" && (
        <div style={{ ...S.panel, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={S.sectionLabel}>new homestead</p>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="name it (optional)"
            maxLength={64}
            autoFocus
            style={S.input}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{ ...S.btn("primary"), opacity: loading ? 0.4 : 1 }}
          >
            {loading ? "creating…" : "create homestead →"}
          </button>
          <button
            onClick={() => { setMode("list"); setError(null); setNewName(""); }}
            disabled={loading}
            style={{ ...S.btn("subtle"), opacity: loading ? 0.4 : 1 }}
          >
            ← back
          </button>
          {error && <p style={S.error}>{error}</p>}
        </div>
      )}

      {mode === "join" && (
        <div style={{ ...S.panel, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={S.sectionLabel}>join a homestead</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="JOIN CODE"
              maxLength={8}
              autoFocus
              style={{ ...S.input, letterSpacing: "0.2em" }}
            />
            <button
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              style={{ ...S.btn("primary"), width: "auto", padding: "14px 18px", opacity: (loading || !joinCode.trim()) ? 0.4 : 1 }}
            >
              join
            </button>
          </div>
          <button
            onClick={() => { setMode("list"); setError(null); setJoinCode(""); }}
            disabled={loading}
            style={{ ...S.btn("subtle"), opacity: loading ? 0.4 : 1 }}
          >
            ← back
          </button>
          {error && <p style={S.error}>{error}</p>}
        </div>
      )}
    </main>
  );
}
