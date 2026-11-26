// src/Pages/Arcade/games/creature-farm/wilds/WildsRun.jsx
//
// The Wilds: a co-op squad trip started from the farm's signpost.
//   Lobby  each player picks creatures (co-op: 2 each, solo: 4) and you pack rations
//   Map    either player picks the next stop on the route
//   Fight  real-time; EITHER player can pause and it pauses for both. Fights start
//          paused so you can plan. Tap your creature, then tap a goop to focus it
//          or tap the ground to move/hold there. Special moves and food on the cards.
//   End    loot, Fight XP and any new friends go home to the farm.
//
// Props (from CreatureFarm): net, tripHost, world, W (farm world: dispatch/canAct),
//   myId, partnerId, partnerHere, nameOf, onExit
//
// Netcode (only during a trip):
//   guest → host  w_in   { i: intent }                    reliable
//   host  → guest w_snap { s: state }  ~10/s in fights (volatile) + reliable on every change
// The trip host also dispatches wilds_go / wilds_end to the farm world.
// No emojis: everything is drawn in code.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../../net/useArcadeRoom";
import { C } from "../../../ui";
import { SPECIES } from "../species";
import { drawCreature } from "../drawFarm";
import { ITEMS } from "../ranch";
import { ItemIcon } from "../RanchPanel";
import {
  ARENA, ROLES, ABILITIES, BLESSINGS, RATIONS, PACK_MAX, NODE_NAMES, LAYERS,
  newTrip, applyIntent, stepTrip, snapshot, eligible, pickLimit, reachable, nodeById, canControl, retreat,
} from "./wildsSim";
import { drawFight, drawBossBar, SLOT_COLORS } from "./drawWilds";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function WildsRun({ net, tripHost, world, W, myId, partnerId, partnerHere, nameOf, onExit }) {
  const mySlot = tripHost ? 0 : 1;
  const stRef = useRef(null);                       // host: the real state · guest: latest snapshot
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(n => (n + 1) % 1e9), []);
  const [selected, setSelected] = useState(null);
  const sentGo = useRef(false), sentEnd = useRef(false);
  const live = useRef({});
  live.current = { net, tripHost, world, W, myId, partnerId, partnerHere, mySlot };

  const ctx = () => {
    const L = live.current;
    return { world: L.world, users: [L.tripHost ? L.myId : L.partnerId, L.tripHost ? L.partnerId : L.myId], partnerHere: L.partnerHere };
  };

  // ── Host: create the trip, broadcast changes ────────────────────────────────
  if (tripHost && !stRef.current) stRef.current = newTrip(Math.floor(Math.random() * 1e9));
  const broadcast = useCallback((volatile = false) => {
    const L = live.current;
    if (!L.tripHost || !stRef.current) return;
    L.net.send("w_snap", { s: snapshot(stRef.current) }, { volatile });
  }, []);
  const afterChange = useCallback(() => {
    const L = live.current, st = stRef.current;
    if (!L.tripHost || !st) return;
    // farm hooks: leaving and coming home
    if (st.phase !== "lobby" && !sentGo.current) {
      sentGo.current = true;
      L.W.dispatch({ type: "wilds_go", squad: st.squad.map(u => u.cid), rations: st.rations });
    }
    if (st.phase === "end" && !sentEnd.current) {
      sentEnd.current = true;
      const r = st.result;
      L.W.dispatch({ type: "wilds_end", won: r.won, squad: r.squad, coins: r.coins, goods: r.goods, friends: r.friends, rations: r.rations, r: Math.random() });
    }
    broadcast(false);
    rerender();
  }, [broadcast, rerender]);

  const intent = useCallback((i) => {
    const L = live.current;
    if (L.tripHost) { if (applyIntent(stRef.current, 0, i, ctx())) afterChange(); }
    else L.net.send("w_in", { i });
  }, [afterChange]);

  useArcadeEvent(net, "w_in", (m) => {
    if (!live.current.tripHost || !stRef.current) return;
    if (applyIntent(stRef.current, 1, m.i, ctx())) afterChange();
    else broadcast(false);                          // let them see it didn't go through
  });
  useArcadeEvent(net, "w_snap", (m) => {
    if (live.current.tripHost) return;
    stRef.current = m.s;
    rerender();
  });
  // guest: say hello so the host switches to co-op (keep asking until it shows up)
  useEffect(() => {
    if (tripHost) return;
    net.send("w_in", { i: { k: "join" } });
    const id = setInterval(() => { const st = stRef.current; if (!st || (st.phase === "lobby" && !st.coop)) net.send("w_in", { i: { k: "join" } }); }, 1500);
    return () => { clearInterval(id); };
  }, [tripHost, net]);
  // host: if the partner drops during the lobby, go back to solo
  useEffect(() => {
    const st = stRef.current;
    if (tripHost && st && !partnerHere && st.phase === "lobby" && st.coop) { applyIntent(st, 1, { k: "leave" }, ctx()); afterChange(); }
  }, [partnerHere, tripHost, afterChange]);
  useEffect(() => { if (tripHost) broadcast(false); }, [tripHost, broadcast]);

  // ── Host loop: run fights, ~10 snapshots a second ───────────────────────────
  const canvasRef = useRef(null);
  useEffect(() => {
    let raf = 0, last = performance.now(), lastSnap = 0, lastHud = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const L = live.current, st = stRef.current;
      if (!st) return;
      if (L.tripHost) {
        const before = st.phase;
        stepTrip(st, dt);
        if (st.phase !== before) afterChange();
        else if (st.phase === "fight" && now - lastSnap > 100) { lastSnap = now; broadcast(true); }
      }
      if (st.phase === "fight") {
        drawCanvas(canvasRef.current, st, now / 1000, { selected: selRef.current, canControl: (u) => canControl(st, u, L.mySlot, ctx()) });
        if (now - lastHud > 120) { lastHud = now; rerender(); }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [afterChange, broadcast, rerender]);
  const selRef = useRef(null);
  selRef.current = selected;
  if (typeof window !== "undefined" && window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__.wilds = { st: stRef, intent };

  const st = stRef.current;
  const mineCan = (u) => st && canControl(st, u, mySlot, ctx());

  // keyboard: Space pause, 1-4 pick a creature, Q special move, Esc back to auto
  useEffect(() => {
    const down = (e) => {
      const s = stRef.current;
      if (!s || s.phase !== "fight") return;
      if (e.code === "Space") { e.preventDefault(); intent({ k: "pause" }); return; }
      const mine = s.squad.filter(u => canControl(s, u, live.current.mySlot, ctx()));
      if (/^Digit[1-4]$/.test(e.code)) { const u = mine[Number(e.code.slice(5)) - 1]; if (u) setSelected(u.id); }
      if (e.key === "q" || e.key === "Q") { const u = s.squad.find(x => x.id === selRef.current); if (u) intent({ k: "ability", u: u.id }); }
      if (e.key === "Escape") { const u = s.squad.find(x => x.id === selRef.current); if (u) intent({ k: "order", u: u.id }); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [intent]);

  // canvas taps: select my creature / focus a goop / move here
  const onCanvasDown = (e) => {
    const s = stRef.current, cv = canvasRef.current;
    if (!s || s.phase !== "fight" || !cv) return;
    const rect = cv.getBoundingClientRect();
    const { scale, ox, oy } = fitArena(rect.width, rect.height);
    const x = (e.clientX - rect.left - ox) / scale, y = (e.clientY - rect.top - oy) / scale;
    const myUnit = s.squad.find(u => !u.ko && mineCan(u) && Math.hypot(u.x - x, u.y - 16 - y) < 28);
    if (myUnit) { setSelected(myUnit.id === selected ? null : myUnit.id); return; }
    const sel = s.squad.find(u => u.id === selected);
    if (!sel || sel.ko) return;
    const foe = s.enemies.find(f => f.hp > 0 && Math.hypot(f.x - x, f.y - (f.kind === "boss" ? 40 : 14) - y) < (f.kind === "boss" ? 60 : 26));
    if (foe) intent({ k: "order", u: sel.id, target: foe.id });
    else intent({ k: "order", u: sel.id, x, y });
  };

  const leave = () => {
    const s = stRef.current;
    if (tripHost && s && s.phase !== "end" && s.phase !== "lobby") { retreat(s); afterChange(); }
    onExit();
  };

  // ── Screens ─────────────────────────────────────────────────────────────────
  if (!st) {
    return <Shell onLeave={onExit} title="The Wilds"><div style={{ color: C.dim, padding: 30 }}>Joining {cap(nameOf(partnerId))}'s trip…</div></Shell>;
  }
  const pName = cap(nameOf(partnerId));
  if (st.phase === "lobby") return <Lobby st={st} world={world} myId={myId} partnerId={partnerId} mySlot={mySlot} tripHost={tripHost} partnerName={pName} partnerHere={partnerHere} intent={intent} onLeave={leave} />;
  if (st.phase === "end") return <EndScreen st={st} onLeave={onExit} tripHost={tripHost} />;

  return (
    <Shell onLeave={leave} title="The Wilds" right={<LootChip st={st} />}>
      {st.phase === "fight" ? (
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <canvas ref={canvasRef} onPointerDown={onCanvasDown} style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }} />
          <PauseButton paused={st.paused} onClick={() => intent({ k: "pause" })} />
          {st.paused && (
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", padding: "6px 14px", borderRadius: 12, background: "rgba(15,10,30,0.85)", color: "#ffe08a", fontWeight: 900, fontSize: 13, pointerEvents: "none", textAlign: "center" }}>
              PAUSED · plan your moves<div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>tap your creature, then a goop (focus) or the ground (move) · Space or the button to go</div>
            </div>
          )}
          {st.log[0] && !st.paused && <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 800, color: "#fff", background: "rgba(15,10,30,0.6)", padding: "4px 10px", borderRadius: 10, pointerEvents: "none" }}>{st.log[0]}</div>}
        </div>
      ) : (
        <MapView st={st} intent={intent} />
      )}
      <SquadBar st={st} mySlot={mySlot} canCtl={mineCan} selected={selected} setSelected={setSelected} intent={intent} partnerName={pName} />
      {st.phase === "event" && <EventCard st={st} intent={intent} nameOf={nameOf} />}
    </Shell>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function fitArena(w, h) {
  const scale = Math.min(w / ARENA.W, h / ARENA.H);
  return { scale, ox: (w - ARENA.W * scale) / 2, oy: (h - ARENA.H * scale) / 2 };
}
function drawCanvas(cv, st, t, ui) {
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#14261a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const { scale, ox, oy } = fitArena(w, h);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
  drawFight(ctx, st, t, ui);
  drawBossBar(ctx, st.enemies.find(e => e.kind === "boss" && e.hp > 0));
  if (st.paused) { ctx.fillStyle = "rgba(10,10,30,0.18)"; ctx.fillRect(0, 0, ARENA.W, ARENA.H); }
}

// ── Pieces ────────────────────────────────────────────────────────────────────
function Shell({ title, onLeave, right, children }) {
  const short = useShort();
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "#0f1a14", color: C.text, display: "flex", flexDirection: "column", fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: short ? "3px 8px" : "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onLeave} style={btn(false, short ? { padding: "4px 10px", fontSize: 12 } : {})}>← farm</button>
        <div style={{ fontWeight: 900, fontSize: 17, flex: 1 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
function PauseButton({ paused, onClick }) {
  return (
    <button onClick={onClick} style={{ position: "absolute", top: 10, right: 10, ...btn(paused, { padding: "10px 16px", fontSize: 14 }) }}>
      {paused ? "Go" : "Pause"}
    </button>
  );
}
function LootChip({ st }) {
  const goods = Object.entries(st.loot.goods).filter(([, n]) => n > 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <span style={{ color: "#ffd65a" }}>{st.loot.coins} coins</span>
      {goods.slice(0, 5).map(([k, n]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><ItemIcon kind={k} size={14} />{n}</span>)}
      {st.loot.friends.length > 0 && <span style={{ color: C.good }}>+{st.loot.friends.length} friend{st.loot.friends.length > 1 ? "s" : ""}</span>}
    </div>
  );
}
function Portrait({ c, size = 44, dim }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.translate(size / 2, size * 0.88); ctx.scale(size / 64, size / 64);
    if (dim) ctx.globalAlpha = 0.45;
    drawCreature(ctx, 0, 0, c.species, { hue: c.hue ?? c.traits?.hue, size: 1, rare: c.rare ?? c.traits?.rare, personality: c.personality ?? c.traits?.personality }, { face: 1, t: 1 });
    ctx.restore();
  }, [c.species, c.hue, c.rare, size, dim]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} style={{ width: size, height: size, flexShrink: 0 }} />;
}

// Squad cards: health, special move (with cooldown), auto toggle, rations.
function useShort() {
  const [short, setShort] = useState(() => typeof window !== "undefined" && window.innerHeight < 520);
  useEffect(() => { const f = () => setShort(window.innerHeight < 520); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return short;
}
function SquadBar({ st, mySlot, canCtl, selected, setSelected, intent, partnerName }) {
  const rations = Object.entries(st.rations).filter(([, n]) => n > 0);
  const short = useShort();                          // phone on its side: slimmer cards so the arena gets the room
  return (
    <div style={{ display: "flex", gap: short ? 5 : 8, padding: short ? 4 : 8, overflowX: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)" }}>
      {st.squad.map(u => {
        const mine = canCtl(u), ab = ABILITIES[u.ab];
        const ready = u.abT <= 0, frac = ready ? 1 : 1 - u.abT / ab.cd;
        return (
          <div key={u.id} onClick={() => mine && !u.ko && setSelected(u.id === selected ? null : u.id)}
            style={{ minWidth: short ? 150 : 170, flex: short ? "1 0 150px" : "1 0 170px", maxWidth: 260, padding: short ? 4 : 8, borderRadius: 12, background: u.id === selected ? "rgba(255,204,77,0.14)" : "rgba(255,255,255,0.04)", border: `2px solid ${u.id === selected ? SLOT_COLORS[u.slot] : "rgba(255,255,255,0.08)"}`, display: "flex", flexDirection: "column", gap: 5, cursor: mine ? "pointer" : "default", opacity: u.ko ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Portrait c={u} size={short ? 22 : 34} dim={u.ko} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name} <span style={{ color: SLOT_COLORS[u.slot], fontSize: 10 }}>{st.coop ? (u.slot === mySlot ? "you" : partnerName) : ""}</span></div>
                <div style={{ fontSize: 10, color: C.dim, display: short ? "none" : "block" }}>{u.role} · Fight {u.lvl}{u.ko ? " · knocked out" : u.order ? (u.order.type === "attack" ? " · focusing" : " · holding") : ""}</div>
              </div>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, (u.hp / u.maxHp) * 100)}%`, background: u.hp / u.maxHp < 0.3 ? C.bad : C.good }} />
            </div>
            {st.phase === "fight" && (
              <div style={{ display: "flex", gap: 4 }}>
                <button disabled={!mine || !ready || u.ko} title={ab.desc} onClick={(e) => { e.stopPropagation(); intent({ k: "ability", u: u.id }); }}
                  style={{ ...btn(ready && mine && !u.ko, { padding: "5px 6px", fontSize: 11, flex: 1, position: "relative", overflow: "hidden", opacity: mine ? 1 : 0.5 }) }}>
                  {!ready && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${frac * 100}%`, background: "rgba(255,255,255,0.12)" }} />}
                  <span style={{ position: "relative" }}>{ab.name}{ready ? "" : ` ${Math.ceil(u.abT)}s`}</span>
                </button>
                <button disabled={!mine} title="Use the special move by itself when it's ready" onClick={(e) => { e.stopPropagation(); intent({ k: "auto", u: u.id }); }} style={btn(u.auto, { padding: "5px 7px", fontSize: 11, opacity: mine ? 1 : 0.5 })}>auto</button>
              </div>
            )}
            {rations.length > 0 && (mine || st.phase !== "fight") && !(short && st.phase === "fight" && u.id !== selected) && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {rations.map(([k, n]) => (
                  <button key={k} title={`Feed ${ITEMS[k].name.toLowerCase()} (heals ${Math.round(RATIONS[k] * 100)}%${k === "cake" ? ", gets a knocked-out creature back up" : ""})`}
                    disabled={(u.ko && k !== "cake") || (!u.ko && u.hp >= u.maxHp) || (st.phase === "fight" && u.feedT > 0)}
                    onClick={(e) => { e.stopPropagation(); intent({ k: "feed", u: u.id, item: k }); }}
                    style={{ ...btn(false, { padding: "2px 5px", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 2 }) }}>
                    <ItemIcon kind={k} size={13} />{n}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The route: nodes in columns, lines between them. Reachable stops glow.
function MapView({ st, intent }) {
  const map = st.map, next = new Set(reachable(st));
  const nodes = map.layers.flat();
  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
      <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <radialGradient id="wmapbg" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#2c5a33" /><stop offset="100%" stopColor="#13281a" /></radialGradient>
        </defs>
        <rect x="0" y="0" width="1000" height="560" fill="url(#wmapbg)" />
        {nodes.map(n => n.next.map(id => {
          const b = nodeById(map, id), a = pos(n), c = pos(b);
          const walked = map.visited.includes(n.id) && map.visited.includes(id);
          const open = n.id === map.cur && next.has(id);
          return <line key={n.id + id} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={walked ? "#ffd65a" : open ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.18)"} strokeWidth={walked ? 5 : open ? 3 : 2} strokeDasharray={open ? "8 6" : walked ? "" : "4 6"} />;
        }))}
        {nodes.map(n => {
          const p = pos(n), here = n.id === map.cur, can = next.has(n.id), done = map.visited.includes(n.id);
          const big = n.type === "boss";
          return (
            <g key={n.id} onClick={() => can && intent({ k: "node", id: n.id })} style={{ cursor: can ? "pointer" : "default" }}>
              {can && <circle cx={p.x} cy={p.y} r={big ? 44 : 34} fill="rgba(255,214,90,0.18)"><animate attributeName="r" values={`${big ? 40 : 30};${big ? 48 : 38};${big ? 40 : 30}`} dur="1.4s" repeatCount="indefinite" /></circle>}
              <circle cx={p.x} cy={p.y} r={big ? 34 : 25} fill={done ? "#3a3550" : NODE_COLOR[n.type]} stroke={here ? "#ffd65a" : can ? "#fff" : "rgba(0,0,0,0.4)"} strokeWidth={here ? 5 : can ? 3 : 2} opacity={done && !here ? 0.6 : 1} />
              <NodeGlyph type={n.type} x={p.x} y={p.y} big={big} />
              {(can || here) && <text x={p.x} y={p.y + (big ? 52 : 42)} textAnchor="middle" fontSize="14" fontWeight="800" fill={can ? "#fff" : "#ffd65a"} style={{ fontFamily: "system-ui, sans-serif" }}>{here ? "you are here" : NODE_NAMES[n.type]}</text>}
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 12, bottom: 10, fontSize: 12, color: C.dim, background: "rgba(0,0,0,0.35)", padding: "6px 10px", borderRadius: 10 }}>
        Pick the next stop (either of you can). Stop {Math.max(0, nodeById(map, map.cur).layer)} of {LAYERS - 1}. Feed hurt creatures with your rations on their cards.
      </div>
    </div>
  );
}
const pos = (n) => ({ x: 70 + n.x * 860, y: 50 + n.y * 460 });
const NODE_COLOR = { start: "#6b5a3a", fight: "#7a3a9a", elite: "#a8324a", forage: "#3f8a3e", camp: "#b8742e", shrine: "#3a6ab8", creature: "#c0569a", boss: "#4a1670" };
function NodeGlyph({ type, x, y, big }) {
  const s = big ? 1.4 : 1;
  if (type === "fight" || type === "elite" || type === "boss") return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-11,8 Q-13,-10 0,-12 Q13,-10 11,8 Q5,11 0,8 Q-5,11 -11,8Z" fill={type === "boss" ? "#2a0b40" : "#3a1050"} />
      <ellipse cx="-4" cy="-2" rx="2.4" ry="2" fill="#ffe14d" /><ellipse cx="4" cy="-2" rx="2.4" ry="2" fill="#ffe14d" />
      {type === "elite" && <path d="M-8,-9 L-11,-17 L-4,-11 M8,-9 L11,-17 L4,-11" stroke="#e9d6ff" strokeWidth="2.4" fill="none" />}
      {type === "boss" && <path d="M-8,-11 L-9,-19 L-4,-14 L0,-21 L4,-14 L9,-19 L8,-11Z" fill="#ffd65a" />}
    </g>
  );
  if (type === "forage") return <g transform={`translate(${x},${y})`}><path d="M-10,-2 L10,-2 L7,10 L-7,10Z" fill="#c9955a" /><path d="M-7,-2 A7,7 0 0 1 7,-2" stroke="#7a5230" strokeWidth="2.4" fill="none" /><circle cx="-3" cy="-5" r="3.5" fill="#3d4fc9" /><circle cx="3" cy="-6" r="3.5" fill="#f08a24" /></g>;
  if (type === "camp") return <g transform={`translate(${x},${y})`}><path d="M-12,9 L0,-12 L12,9Z" fill="#e9d2a8" /><path d="M-3,9 L0,2 L3,9Z" fill="#6b4429" /><path d="M-14,11 L14,11" stroke="#6b4429" strokeWidth="2.4" /></g>;
  if (type === "shrine") return <g transform={`translate(${x},${y})`}><rect x="-9" y="-3" width="18" height="12" fill="#b9c3d6" /><path d="M-12,-3 L0,-13 L12,-3Z" fill="#8a96b0" /><circle cx="0" cy="3" r="3" fill="#ffe36b" /></g>;
  if (type === "creature") return <g transform={`translate(${x},${y})`}><path d="M0,9 C-14,0 -9,-12 0,-5 C9,-12 14,0 0,9Z" fill="#ff9ad0" /></g>;
  return <g transform={`translate(${x},${y})`}><path d="M-8,8 L-8,-10 L8,-4 L-8,2" fill="#ffd65a" stroke="#6b4429" strokeWidth="2" /></g>;
}

// Event pop-ups on the map: spoils, gathering, camp, shrine, a wild creature, defeat.
function EventCard({ st, intent, nameOf }) {
  const ev = st.event;
  if (!ev) return null;
  const goodsList = (g) => Object.entries(g || {}).filter(([, n]) => n > 0).map(([k, n]) => (
    <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)" }}><ItemIcon kind={k} size={16} /> {n} {ITEMS[k]?.name.toLowerCase()}</span>
  ));
  let title = "", body = null, actions = <button onClick={() => intent({ k: "next" })} style={btn(true)}>Continue</button>;
  if (ev.type === "spoils") {
    title = ev.boss ? "The Goop King is beaten!" : "Victory!";
    body = <><div style={{ color: "#ffd65a", fontWeight: 900 }}>+{ev.coins} coins</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>{goodsList(ev.goods)}</div><div style={{ fontSize: 12, color: C.dim }}>Everyone caught their breath (+25% health). Knocked-out creatures are back up.</div></>;
    if (ev.final) actions = <button onClick={() => intent({ k: "next" })} style={btn(true)}>Head home with the loot</button>;
  } else if (ev.type === "defeat") {
    title = "The squad is all knocked out";
    body = <div style={{ fontSize: 13, color: C.dim }}>Everyone limps home. You keep what you found (coins at 60%). Nobody is hurt for long.</div>;
    actions = <button onClick={() => intent({ k: "next" })} style={btn(true)}>Head home</button>;
  } else if (ev.type === "forage") {
    title = "A good gathering spot";
    body = <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>{goodsList(ev.goods)}</div>;
  } else if (ev.type === "camp") {
    title = "Camp";
    body = <div style={{ fontSize: 13, color: C.dim }}>A warm fire and a nap. Everyone heals half their health, and knocked-out creatures are back on their feet.</div>;
  } else if (ev.type === "shrine") {
    title = "An old shrine";
    body = <div style={{ fontSize: 13, color: C.dim }}>Choose one blessing (either of you can).</div>;
    actions = <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>{ev.options.map(id => (
      <button key={id} onClick={() => intent({ k: "bless", id })} style={{ ...btn(false, { padding: 12, width: 180, textAlign: "left" }) }}>
        <div style={{ fontWeight: 900, color: "#ffe08a" }}>{BLESSINGS[id].name}</div><div style={{ fontSize: 11, color: C.dim, fontWeight: 600, marginTop: 3 }}>{BLESSINGS[id].desc}</div>
      </button>
    ))}</div>;
  } else if (ev.type === "creature") {
    title = ev.rare ? "A golden creature!" : "A wild creature";
    body = <>
      <Portrait c={{ species: ev.species, hue: ev.hue, rare: ev.rare, personality: "playful" }} size={90} />
      <div style={{ fontSize: 13 }}>A {ev.rare ? "golden " : ""}{SPECIES[ev.species].name} ({ROLES[ev.species]?.role}) is curious about your squad.</div>
      {ev.taken ? <div style={{ color: C.good, fontWeight: 800 }}>It's coming home with you!</div> : <div style={{ fontSize: 12, color: C.dim }}>Befriend it and it comes home after the trip (it'll need a pen spot).</div>}
    </>;
    actions = <div style={{ display: "flex", gap: 8 }}>{!ev.taken && <button onClick={() => intent({ k: "befriend" })} style={btn(true)}>Befriend</button>}<button onClick={() => intent({ k: "next" })} style={btn(false)}>{ev.taken ? "Continue" : "Leave it"}</button></div>;
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,8,0.6)", display: "grid", placeItems: "center", zIndex: 5 }}>
      <div style={{ width: "min(92%, 460px)", padding: 18, borderRadius: 18, background: "#1b1630", border: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
        <div style={{ fontWeight: 900, fontSize: 20 }}>{title}</div>
        {body}
        {actions}
      </div>
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function Lobby({ st, world, myId, partnerId, mySlot, tripHost, partnerName, partnerHere, intent, onLeave }) {
  const myList = eligible(world, myId);
  const limit = pickLimit(st, mySlot);
  const myPicks = st.picks[mySlot], otherPicks = st.picks[1 - mySlot];
  const packed = Object.values(st.rations).reduce((a, b) => a + b, 0);
  const canGo = tripHost && (st.picks[0].length + st.picks[1].length) > 0 && (!st.coop || (st.ready[1] && st.picks[1].length > 0));
  const cr = (id) => world.creatures[id];
  return (
    <Shell onLeave={onLeave} title="The Wilds · plan your trip">
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: C.dim }}>
          {st.coop ? `Co-op with ${partnerName}: you each bring 2 creatures and control them in fights.` : partnerHere ? `Playing solo for now: bring 4. If ${partnerName} joins, you each bring 2.` : "Solo trip: bring 4 creatures."}
          {" "}Fights are real-time, and either of you can pause. Mix roles: a Tank (Pebblet) holds the line, a Healer (Puddlet) keeps everyone up, Strikers and Casters do the damage. Creatures on the trip don't work at home until they're back.
        </div>
        <Section title={`Your creatures · ${myPicks.length}/${limit} picked`}>
          {limit === 0 && <div style={{ fontSize: 12, color: C.dim }}>You joined after the squad was picked. You can watch.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {myList.map(c => {
              const picked = myPicks.includes(c.id), taken = otherPicks.includes(c.id);
              const R = ROLES[c.species];
              return (
                <button key={c.id} disabled={taken || (!picked && myPicks.length >= limit)} onClick={() => intent({ k: picked ? "unpick" : "pick", cid: c.id })}
                  style={{ ...btn(picked, { padding: 8, width: 168, display: "flex", alignItems: "center", gap: 8, textAlign: "left", opacity: taken ? 0.35 : 1 }) }}>
                  <Portrait c={c} size={40} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 900, fontSize: 13 }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{R?.role} · Fight {c.skills?.fight || 1}</span>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{ABILITIES[R?.ab]?.name}{(c.energy ?? 100) < 30 ? " · tired" : ""}</span>
                  </span>
                </button>
              );
            })}
            {myList.length === 0 && <div style={{ fontSize: 12, color: C.dim }}>No creatures free right now.</div>}
          </div>
        </Section>
        {st.coop && (
          <Section title={`${partnerName}'s picks · ${otherPicks.length}/2 ${st.ready[1 - mySlot] ? "· ready" : ""}`}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {otherPicks.map(id => cr(id) && <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, padding: 6, borderRadius: 10, background: "rgba(255,255,255,0.05)" }}><Portrait c={cr(id)} size={32} /><span style={{ fontSize: 12, fontWeight: 800 }}>{cr(id).name}<span style={{ display: "block", fontSize: 10, color: C.dim }}>{ROLES[cr(id).species]?.role}</span></span></div>)}
              {!otherPicks.length && <span style={{ fontSize: 12, color: C.dim }}>choosing…</span>}
            </div>
          </Section>
        )}
        <Section title={`Rations · ${packed}/${PACK_MAX} packed (shared)`}>
          <div style={{ fontSize: 12, color: C.dim }}>Feed them to hurt creatures during the trip. Carrot cake even gets a knocked-out creature back up. Anything you don't eat comes home.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.keys(RATIONS).map(k => {
              const have = Math.floor(world.food?.[k] || 0), n = st.rations[k] || 0;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", opacity: have || n ? 1 : 0.4 }}>
                  <ItemIcon kind={k} size={22} />
                  <span style={{ fontSize: 12, fontWeight: 800, minWidth: 70 }}>{ITEMS[k].name}<span style={{ display: "block", fontSize: 10, color: C.dim, fontWeight: 600 }}>heals {Math.round(RATIONS[k] * 100)}% · have {have}</span></span>
                  <button disabled={!n} onClick={() => intent({ k: "ration", item: k, d: -1 })} style={btn(false, { padding: "3px 9px" })}>-</button>
                  <span style={{ fontWeight: 900, minWidth: 14, textAlign: "center" }}>{n}</span>
                  <button disabled={n >= have || packed >= PACK_MAX} onClick={() => intent({ k: "ration", item: k, d: 1 })} style={btn(false, { padding: "3px 9px" })}>+</button>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", justifyContent: "flex-end", alignItems: "center" }}>
        {!tripHost && <button disabled={!myPicks.length} onClick={() => intent({ k: "ready", v: !st.ready[mySlot] })} style={btn(st.ready[mySlot], { padding: "10px 18px", fontSize: 15 })}>{st.ready[mySlot] ? "Ready!" : "I'm ready"}</button>}
        {tripHost && st.coop && !st.ready[1] && <span style={{ fontSize: 12, color: C.dim }}>Waiting for {partnerName} to be ready…</span>}
        {tripHost && <button disabled={!canGo} onClick={() => intent({ k: "go" })} style={btn(canGo, { padding: "10px 18px", fontSize: 15, opacity: canGo ? 1 : 0.5 })}>Set off</button>}
      </div>
    </Shell>
  );
}
function Section({ title, children }) {
  return <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 8 }}><div style={{ fontWeight: 900 }}>{title}</div>{children}</div>;
}

// ── End ───────────────────────────────────────────────────────────────────────
function EndScreen({ st, onLeave }) {
  const r = st.result;
  const goods = Object.entries(r.goods || {}).filter(([, n]) => n > 0);
  return (
    <Shell onLeave={onLeave} title="The Wilds">
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: r.won ? "#ffd65a" : C.text }}>{r.won ? "Back home victorious!" : "Back home"}</div>
        <div style={{ color: "#ffd65a", fontWeight: 900, fontSize: 18 }}>+{r.coins} coins</div>
        {goods.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>{goods.map(([k, n]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", fontSize: 13 }}><ItemIcon kind={k} size={18} /> {n} {ITEMS[k]?.name.toLowerCase()}</span>)}</div>}
        {r.friends?.length > 0 && <div style={{ color: C.good, fontWeight: 800 }}>{r.friends.length} new friend{r.friends.length > 1 ? "s" : ""} coming to the farm{r.friends.some(f => f.rare) ? " (one is golden!)" : ""}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {r.squad.map(s => {
            const u = st.squad.find(x => x.cid === s.cid);
            return u && <div key={s.cid} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
              <Portrait c={u} size={40} />
              <span style={{ textAlign: "left", fontSize: 12 }}><b>{u.name}</b><span style={{ display: "block", color: C.dim }}>+{Math.round(s.xp / 60)} min of Fight practice</span><span style={{ display: "block", color: C.dim }}>{s.hp > 0.5 ? "a bit tired" : "worn out, needs rest"}</span></span>
            </div>;
          })}
        </div>
        <div style={{ fontSize: 12, color: C.dim, maxWidth: 420 }}>Everything above has gone into your farm's storage (anything that doesn't fit is sold by the stall, or lost without one). The squad is home and will rest before getting back to work.</div>
        <button onClick={onLeave} style={btn(true, { padding: "10px 20px", fontSize: 15 })}>Back to the farm</button>
      </div>
    </Shell>
  );
}

function btn(active = false, extra = {}) {
  return {
    padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
    background: active ? C.accent : "rgba(255,255,255,0.06)", color: active ? "#1a1300" : C.text,
    border: active ? "none" : "1px solid rgba(255,255,255,0.15)", ...extra,
  };
}