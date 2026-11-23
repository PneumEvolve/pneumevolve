// src/Pages/Arcade/ArcadeLobby.jsx
// Your saved rooms for this game (tap to jump back in), plus host a new one
// or join with a code. Rooms stay on both accounts until the host deletes them.

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { S, C } from "./ui";

const MAX_HOSTED = 3; // keep in sync with MAX_ROOMS_PER_GAME in routers/arcade.py

function timeSince(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ArcadeLobby({ game, onRoomReady, onBack }) {
  const [rooms,        setRooms]        = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [mode,         setMode]         = useState("list"); // list | join
  const [code,         setCode]         = useState("");
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingRooms(true);
    api.get("/arcade/rooms/mine", { params: { game_id: game.id } })
      .then(({ data }) => { if (!cancelled) setRooms(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setRooms([]); })
      .finally(() => { if (!cancelled) setLoadingRooms(false); });
    return () => { cancelled = true; };
  }, [game.id]);

  const hostedCount = rooms.filter(r => r.role === "p1").length;
  const atLimit = hostedCount >= MAX_HOSTED;

  async function resume(room) {
    setBusy(true); setError(null);
    try {
      const { data } = await api.get(`/arcade/rooms/${room.id}`);
      onRoomReady(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't open that room.");
    } finally { setBusy(false); }
  }

  async function host() {
    setBusy(true); setError(null);
    try {
      const { data } = await api.post("/arcade/rooms", { game_id: game.id });
      onRoomReady(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't make a room. Is the server awake?");
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

  async function remove(room) {
    setError(null);
    try {
      await api.delete(`/arcade/rooms/${room.id}`);
      setRooms(prev => prev.filter(r => r.id !== room.id));
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't remove that room.");
    }
  }

  return (
    <main style={S.screen}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>{game.icon}</div>
        <h1 style={{ ...S.title, marginTop: 10 }}>{game.name}</h1>
        <p style={{ color: C.dim, marginTop: 6, maxWidth: 300 }}>{game.blurb}</p>
      </div>

      {mode === "list" && (
        <div style={S.col}>
          {loadingRooms ? (
            <p style={{ color: C.dim, textAlign: "center" }}>loading your rooms…</p>
          ) : rooms.length > 0 && (
            <>
              <p style={{ ...S.eyebrow, marginTop: 4 }}>your rooms</p>
              {rooms.map(room => (
                <RoomCard key={room.id} room={room} disabled={busy} onOpen={resume} onRemove={remove} />
              ))}
              <div style={{ height: 6 }} />
            </>
          )}

          {!atLimit ? (
            <button style={{ ...S.btn("primary"), opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={host}>
              {busy ? "…" : "+ New room"}
            </button>
          ) : (
            <p style={{ color: C.dim, fontSize: 13, textAlign: "center", margin: 0 }}>
              You're hosting {MAX_HOSTED} rooms. Delete one to make another.
            </p>
          )}
          <button style={S.btn("ghost")} disabled={busy} onClick={() => { setMode("join"); setError(null); }}>
            Join with a code
          </button>
          <button style={{ ...S.btn("ghost"), border: "none" }} onClick={onBack}>← back to arcade</button>
        </div>
      )}

      {mode === "join" && (
        <div style={S.col}>
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
          <button
            style={{ ...S.btn("primary"), opacity: busy || code.length < 4 ? 0.5 : 1 }}
            disabled={busy || code.length < 4}
            onClick={join}
          >
            {busy ? "joining…" : "Join"}
          </button>
          <button style={S.btn("ghost")} disabled={busy} onClick={() => { setMode("list"); setError(null); setCode(""); }}>
            ← back
          </button>
          <p style={{ color: C.faint, fontSize: 12, textAlign: "center", margin: 0 }}>
            You only need the code once. After that the room shows up in your list.
          </p>
        </div>
      )}

      {error && <p style={S.error}>{error}</p>}
    </main>
  );
}

function RoomCard({ room, disabled, onOpen, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const isHost  = room.role === "p1";
  const partner = isHost ? room.player2_name : room.player1_name;

  if (confirming) {
    return (
      <div style={{ ...S.card, cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <span style={{ fontSize: 14, color: C.dim, textAlign: "center" }}>
          {isHost
            ? <>Delete room <b style={{ color: C.text }}>{room.join_code}</b> for both players?</>
            : <>Leave room <b style={{ color: C.text }}>{room.join_code}</b>?</>}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.btn("ghost"), padding: 10 }} onClick={() => setConfirming(false)}>cancel</button>
          <button
            style={{ ...S.btn("ghost"), padding: 10, color: C.bad, borderColor: C.bad }}
            onClick={() => { setConfirming(false); onRemove(room); }}
          >
            {isHost ? "delete" : "leave"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && onOpen(room)}
      onKeyDown={e => e.key === "Enter" && !disabled && onOpen(room)}
      style={{ ...S.card, opacity: disabled ? 0.5 : 1 }}
    >
      <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: "0.15em", color: C.accent }}>
        {room.join_code}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {partner ? `with ${partner}` : "waiting for player 2"}
        </span>
        <span style={{ display: "block", color: C.dim, fontSize: 12, marginTop: 2 }}>
          {isHost ? "you host" : "you joined"}{room.last_played_at ? ` · ${timeSince(room.last_played_at)}` : ""}
        </span>
      </span>
      <button
        aria-label={isHost ? "Delete room" : "Leave room"}
        onClick={e => { e.stopPropagation(); setConfirming(true); }}
        style={{ background: "none", border: "none", color: C.faint, fontSize: 16, cursor: "pointer", padding: 6 }}
      >
        ✕
      </button>
    </div>
  );
}