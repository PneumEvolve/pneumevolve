// src/Pages/Arcade/games/shared-garden/SharedGarden.jsx
//
// Test game for persistent worlds. Tap soil to plant, tap a grown plant to
// pick it for coins. Plants grow on real time, even when nobody is playing.
//
// Things to try:
//   • Plant a 🌳 (10 min), close the tab. Open the room on the other account
//     later — it's grown, and you can pick it.
//   • Both online: plant on one device, watch it appear on the other.
//   • Close the host's tab mid-game: the other player keeps going (the
//     "running the garden" label switches over) and nothing is lost.
//
// This file is also the template for a farm game: the world is plain data,
// every change goes through gardenReducer, and growth is timestamp-based.

import React, { useEffect, useRef, useState } from "react";
import { useArcadeWorld } from "../../net/useArcadeWorld";
import { C } from "../../ui";

const COLS = 8, ROWS = 6, PLOTS = COLS * ROWS;

export const KINDS = {
  tulip:     { icon: "🌷", name: "Tulip",     grow: 60_000,      coins: 1  },
  sunflower: { icon: "🌻", name: "Sunflower", grow: 3 * 60_000,  coins: 4  },
  tree:      { icon: "🌳", name: "Tree",      grow: 10 * 60_000, coins: 15 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const growth = (plot, now) => clamp((now - plot.at) / KINDS[plot.kind].grow, 0, 1);

// ── World ─────────────────────────────────────────────────────────────────────
export function initGarden() {
  return { plots: Array(PLOTS).fill(null), players: {}, log: [], createdAt: Date.now() };
}

const blankPlayer = { coins: 0, planted: 0, picked: 0 };
const addLog = (log, a, text) => [{ t: a.t, by: a.by, text }, ...(log || [])].slice(0, 8);

// Pure: same world + same action → same result on both devices.
// Use a.t (host's world clock) for time, never Date.now().
export function gardenReducer(w, a) {
  switch (a.type) {
    case "plant": {
      if (!KINDS[a.kind] || !(a.i >= 0 && a.i < PLOTS) || w.plots[a.i]) return w;
      const plots = w.plots.slice();
      plots[a.i] = { kind: a.kind, at: a.t, by: a.by };
      const me = w.players[a.by] || blankPlayer;
      return {
        ...w, plots,
        players: { ...w.players, [a.by]: { ...me, planted: me.planted + 1 } },
        log: addLog(w.log, a, `planted ${KINDS[a.kind].icon}`),
      };
    }
    case "pick": {
      const p = w.plots[a.i];
      if (!p || growth(p, a.t) < 1) return w;
      const k = KINDS[p.kind];
      const plots = w.plots.slice();
      plots[a.i] = null;
      const me = w.players[a.by] || blankPlayer;
      return {
        ...w, plots,
        players: { ...w.players, [a.by]: { ...me, coins: me.coins + k.coins, picked: me.picked + 1 } },
        log: addLog(w.log, a, `picked ${k.icon} +${k.coins}🪙`),
      };
    }
    default:
      return w;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ago(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5)     return "just now";
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function left(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 60 ? `${Math.ceil(s / 60)}m` : `${s}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SharedGarden({ net, room, solo, onLeave }) {
  const W = useArcadeWorld(net, room.id, { reducer: gardenReducer, initWorld: initGarden });
  const [seed, setSeed] = useState("tulip");

  // Re-render every second so growth bars move.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Pulse plots that just changed (so you see the partner's taps).
  const prevPlots = useRef(null);
  const [flash, setFlash] = useState({});
  useEffect(() => {
    const plots = W.world?.plots;
    if (!plots) return;
    const prev = prevPlots.current;
    prevPlots.current = plots;
    if (!prev) return;
    const changed = {};
    plots.forEach((p, i) => { if (p !== prev[i]) changed[i] = Date.now(); });
    if (Object.keys(changed).length) setFlash(f => ({ ...f, ...changed }));
  }, [W.world]);

  const names  = { [room.player1_id]: room.player1_name || "player 1", [room.player2_id]: room.player2_name || "player 2" };
  const colors = { [room.player1_id]: C.accent, [room.player2_id]: C.accent2 };
  const nameOf = (id) => (id != null && id === net.userId ? "you" : names[id] || "partner");
  const partnerId   = net.userId === room.player1_id ? room.player2_id : room.player1_id;
  const partnerName = partnerId ? (names[partnerId] || "partner") : "your partner";

  if (!W.ready) {
    return (
      <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, background: C.bg, fontFamily: "system-ui, sans-serif" }}>
        loading the garden…
      </main>
    );
  }

  const now = W.now();
  const world = W.world;

  function tapPlot(i) {
    if (!W.canAct) return;
    const p = world.plots[i];
    if (!p) W.dispatch({ type: "plant", i, kind: seed });
    else if (growth(p, now) >= 1) W.dispatch({ type: "pick", i });
  }

  const saveText =
    W.saveState === "saving" ? "saving…" :
    W.saveState === "error"  ? "save failed, retrying" :
    W.savedAt ? `saved ${ago(Date.now() - W.savedAt)}` : "not saved yet";

  const playerIds = [room.player1_id, room.player2_id].filter(id => id != null);

  return (
    <main style={{
      minHeight: "100svh", background: C.bg, color: C.text, boxSizing: "border-box",
      padding: "52px 14px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes gardenBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes gardenPulse { from { box-shadow: 0 0 0 4px rgba(255,255,255,0.55) } to { box-shadow: 0 0 0 0 rgba(255,255,255,0) } }
      `}</style>

      <button onClick={onLeave} style={{
        position: "absolute", top: 12, left: 12, zIndex: 25, padding: "8px 12px", borderRadius: 10,
        background: "transparent", border: `1px solid ${C.border}`, color: C.dim, cursor: "pointer", fontSize: 13,
      }}>← rooms</button>

      {/* Status */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
        <Chip color={solo ? C.dim : C.good}>{solo ? `⚪ ${partnerName} is away` : `🟢 ${partnerName} is here`}</Chip>
        <Chip color={W.isHost ? C.accent : C.accent2}>{W.isHost ? "you're running the garden" : `${partnerName} is running it`}</Chip>
        <Chip color={W.saveState === "error" ? C.bad : C.dim}>{saveText}</Chip>
      </div>

      {/* Garden */}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 5,
        width: "min(94vw, 560px)", padding: 8, borderRadius: 16, background: "#2a1f17",
        opacity: W.canAct ? 1 : 0.6,
      }}>
        {world.plots.map((p, i) => {
          const g = p ? growth(p, now) : 0;
          const ready = p && g >= 1;
          const k = p && KINDS[p.kind];
          const pulsing = flash[i] && Date.now() - flash[i] < 700;
          return (
            <button
              key={i}
              onClick={() => tapPlot(i)}
              aria-label={p ? `${k.name}${ready ? ", ready to pick" : ""}` : "empty soil"}
              style={{
                position: "relative", aspectRatio: "1", borderRadius: 8, padding: 0, cursor: W.canAct ? "pointer" : "default",
                background: p ? "#5b4030" : "#4a3427",
                border: `2px solid ${p ? (colors[p.by] || C.border) : "transparent"}`,
                boxShadow: ready ? "0 0 10px rgba(255,204,77,0.55)" : "none",
                animation: pulsing ? "gardenPulse 0.7s ease-out" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                fontSize: "clamp(16px, 5vw, 30px)", lineHeight: 1, WebkitTapHighlightColor: "transparent",
              }}
            >
              {!p && <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.6em" }}>+</span>}
              {p && (
                <span style={{
                  display: "inline-block",
                  transform: `scale(${ready ? 1 : 0.45 + 0.4 * g})`,
                  opacity: ready ? 1 : 0.55 + 0.4 * g,
                  animation: ready ? "gardenBob 1.4s ease-in-out infinite" : "none",
                }}>
                  {g < 0.35 ? "🌱" : k.icon}
                </span>
              )}
              {p && !ready && (
                <>
                  <span style={{ position: "absolute", left: 3, right: 3, bottom: 3, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.35)" }}>
                    <span style={{ display: "block", height: "100%", width: `${g * 100}%`, borderRadius: 2, background: colors[p.by] || C.good }} />
                  </span>
                  <span style={{ position: "absolute", top: 2, right: 4, fontSize: 9, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
                    {left(k.grow * (1 - g))}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Seeds */}
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(KINDS).map(([id, k]) => (
          <button key={id} onClick={() => setSeed(id)} style={{
            padding: "8px 12px", borderRadius: 12, cursor: "pointer", color: C.text, fontFamily: "inherit",
            background: seed === id ? "rgba(255,204,77,0.15)" : C.panel,
            border: `2px solid ${seed === id ? C.accent : C.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 74,
          }}>
            <span style={{ fontSize: 24 }}>{k.icon}</span>
            <span style={{ fontSize: 11, color: C.dim }}>{left(k.grow)} · {k.coins}🪙</span>
          </button>
        ))}
      </div>
      <div style={{ color: C.faint, fontSize: 12, textAlign: "center" }}>
        tap soil to plant · tap a bobbing plant to pick it · plants grow even while you're away
      </div>

      {/* Players + log */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", width: "min(94vw, 560px)" }}>
        <Panel title="coins">
          {playerIds.length === 0 && <span style={{ color: C.dim }}>—</span>}
          {playerIds.map(id => {
            const pl = world.players[id] || blankPlayer;
            return (
              <div key={id} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: colors[id] }}>{nameOf(id)}</span>
                <span>{pl.coins} 🪙</span>
              </div>
            );
          })}
        </Panel>
        <Panel title="what happened" grow>
          {(world.log || []).length === 0 && <span style={{ color: C.dim }}>nothing yet, plant something!</span>}
          {(world.log || []).slice(0, 5).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span><span style={{ color: colors[e.by] || C.text }}>{nameOf(e.by)}</span> {e.text}</span>
              <span style={{ color: C.faint }}>{ago(now - e.t)}</span>
            </div>
          ))}
        </Panel>
      </div>
    </main>
  );
}

function Chip({ color, children }) {
  return (
    <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(0,0,0,0.3)", border: `1px solid ${color}`, color }}>
      {children}
    </span>
  );
}

function Panel({ title, children, grow }) {
  return (
    <div style={{
      flex: grow ? "1 1 260px" : "0 1 180px", padding: "12px 14px", borderRadius: 14,
      background: C.panel, border: `1px solid ${C.border}`, fontSize: 13, display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: C.dim }}>{title}</div>
      {children}
    </div>
  );
}