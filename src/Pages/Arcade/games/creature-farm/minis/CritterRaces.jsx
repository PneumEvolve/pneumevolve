// Critter Races screen. See raceSim.js for the rules.
import React, { useEffect, useMemo, useRef } from "react";
import { C } from "../../../ui";
import { drawCreature, drawCropSprite } from "../drawFarm";
import { useMini } from "./useMini";
import {
  newRace, raceAct, raceTick, makeTrack, runnerStats, newRunner, stepRunner, npcX, OB, TRACK_LEN, COUNTDOWN, RACE_MAX,
  RACE_LEVELS, TRICK_TEXT,
} from "./raceSim";
import { Shell, btn, bigBtn, Section, Pic, CreaturePick, Ribbon, P_COLORS } from "./MiniShell";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th"];

export default function CritterRaces({ net, host, world, W, myId, partnerId, partnerHere, nameOf, onExit }) {
  const worldRef = useRef(world); worldRef.current = world;
  const m = useMini({
    net, host, prefix: "cr", partnerHere, hz: 15,
    make: () => newRace(Math.floor(Math.random() * 1e9)),
    onAct: raceAct,
    onTick: (st, dt) => raceTick(st, dt, worldRef.current),
    onEnd: (st) => { if (!st.result?.quit) W.dispatch({ type: "race_end", level: st.result.level, entries: st.result.entries.filter(e => !e.npc).map(e => ({ cid: e.cid, place: e.place, coins: e.coins, time: e.time, ribbon: e.ribbon })) }); },
  });
  const { st, mySlot, me, act, update } = m;
  const pName = cap(nameOf(partnerId));
  const leave = () => { if (host && st && st.phase !== "end" && st.phase !== "lobby") act({ k: "quit" }); onExit(); };

  if (!st) return <Shell title="Critter Races" onLeave={onExit}><div style={{ padding: 30, color: C.dim }}>Joining {pName} at the races…</div></Shell>;
  const other = st.players[1 - mySlot];
  const myC = me?.cid ? world.creatures[me.cid] : null;

  if (st.phase === "lobby") {
    const ready = st.players.every(p => !p || p.cid);
    return (
      <Shell title="Critter Races" onLeave={onExit} bg="#132018">
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 640 }}>
            Race one of your creatures to the finish. <b style={{ color: C.text }}>Jump</b> logs and rocks (tap, Space or Up), <b style={{ color: C.text }}>Dash</b> for a burst (button, Shift or D; a dash bursts through logs too), grab berries and yellow boost pads, and keep out of the mud. Forage and Haul make a creature a bit faster.
          </div>
          <Section title="Pick your racer">
            <CreaturePick world={world} userId={myId} picked={me?.cid} taken={other?.cid ? [other.cid] : []} onPick={(cid) => act({ k: "pick", cid })}
              sub={(c) => `${SP_NAME(c)} ${TRICK_TEXT[c.species] || ""}`} />
          </Section>
          <Section title="Track">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {RACE_LEVELS.map((L, i) => (
                <button key={L.id} disabled={!host} onClick={() => act({ k: "level", v: i })} style={btn(st.level === i, { padding: 8, width: 190, textAlign: "left", opacity: host || st.level === i ? 1 : 0.5 })}>
                  <span style={{ display: "block", fontWeight: 900 }}>{L.name}</span>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{L.desc}</span>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 600, opacity: 0.7 }}>1st place: {Math.round(80 * L.coins)} coins{world.raceBest?.[i] ? ` · best ${world.raceBest[i].toFixed(1)}s` : ""}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: C.dim, alignItems: "center" }}>Racing against: {st.npcs.map((n, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, color: C.text }}><Pic c={n} size={28} />{n.name}</span>)}</div>
          </Section>
          {st.players[1] && <div style={{ fontSize: 13, color: other?.cid ? C.good : C.dim }}>{pName} {other?.cid ? "is lined up and ready" : "is picking a racer…"}. Race each other!</div>}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", justifyContent: "flex-end", alignItems: "center" }}>
          {host ? <button data-go disabled={!ready} onClick={() => act({ k: "start" })} style={bigBtn(ready)}>Line up!</button>
            : <span style={{ fontSize: 13, color: C.dim }}>{me?.cid ? `Waiting for ${pName} to start…` : "Pick a racer!"}</span>}
        </div>
      </Shell>
    );
  }

  if (st.phase === "end") {
    const entries = st.result?.entries || [];
    const mine = entries.find(e => e.slot === mySlot);
    return (
      <Shell title="Critter Races" onLeave={onExit} bg="#132018">
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          {st.result?.quit ? <div style={{ fontSize: 20, fontWeight: 900 }}>Race called off.</div> : mine && (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ffd65a" }}>{mine.place === 1 ? `${mine.name} wins!` : `${mine.name} came ${ORD[mine.place]}!`}</div>
              <Ribbon color={mine.ribbon} size={48} />
              <div style={{ fontSize: 15 }}>{mine.time ? `${mine.time.toFixed(1)} seconds` : "Didn't make it to the finish in time"}{world.raceBest?.[st.result.level] && mine.time && mine.time <= world.raceBest[st.result.level] + 0.01 ? " · new best!" : ""}</div>
              <div style={{ color: "#ffd65a", fontWeight: 900, fontSize: 20 }}>+{mine.coins} coins</div>
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            {entries.map(e => (
              <div key={(e.cid || e.name) + e.place} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px", borderRadius: 12, width: "min(94vw, 420px)", boxSizing: "border-box", background: e.slot === mySlot ? "rgba(255,214,90,0.1)" : "rgba(255,255,255,0.04)", border: `2px solid ${e.slot === mySlot ? "#ffd65a" : "transparent"}` }}>
                <span style={{ fontWeight: 900, width: 30 }}>{ORD[e.place]}</span>
                <Ribbon color={e.ribbon} size={20} />
                <Pic c={e} size={32} />
                <span style={{ flex: 1, textAlign: "left", fontWeight: 900 }}>{e.name} <span style={{ fontSize: 11, color: e.npc ? C.dim : P_COLORS[e.slot] }}>{e.npc ? "neighbour" : e.slot === mySlot ? "you" : pName}</span></span>
                <span style={{ fontWeight: 800, color: C.dim }}>{e.time ? `${e.time.toFixed(1)}s` : "—"}</span>
              </div>
            ))}
          </div>
          <button onClick={onExit} style={bigBtn(true)}>Back to the farm</button>
        </div>
      </Shell>
    );
  }

  // countdown + race
  return <RaceView st={st} mySlot={mySlot} me={me} myC={myC} world={world} update={update} leave={leave} pName={pName} />;
}
const SP_NAME = (c) => (c.species ? c.species[0].toUpperCase() + c.species.slice(1) + ":" : "");

function RaceView({ st, mySlot, me, myC, world, update, leave, pName }) {
  const canvasRef = useRef(null);
  const track = useMemo(() => makeTrack(st.seed, st.level), [st.seed, st.level]);
  const stats = useMemo(() => (myC ? runnerStats(myC) : null), [myC?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const runner = useRef(newRunner());
  const input = useRef({ jump: false, dash: false });
  const clock = useRef({ t: 0, at: performance.now(), base: 0 });
  const live = useRef({});
  live.current = { st, update, myC, world };

  // race clock: follow the host's, run smoothly in between
  useEffect(() => { clock.current = { base: st.phase === "race" ? st.t : -(COUNTDOWN - st.t), at: performance.now() }; }, [st.t, st.phase]);
  const now = () => clock.current.base + (performance.now() - clock.current.at) / 1000;

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); input.current.jump = true; }
      if (e.key === "Shift" || e.key === "d" || e.key === "D" || e.key === "ArrowRight") { e.preventDefault(); input.current.dash = true; }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0, last = performance.now(), lastSend = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const L = live.current, r = runner.current;
      const tt = now();
      if (L.st.phase === "race" && stats && tt >= 0) {
        stepRunner(r, stats, track, dt, input.current, tt);
        if (t - lastSend > 66 || (r.done && !L.st.players[mySlot]?.done)) { lastSend = t; L.update({ x: Math.round(r.x), y: Math.round(r.y), done: r.done, time: r.time }); }
      }
      input.current.jump = false; input.current.dash = false;
      draw(canvasRef.current, L.st, mySlot, r, track, tt, L.myC, L.world);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [track, stats, mySlot]);   // eslint-disable-line react-hooks/exhaustive-deps

  const r = runner.current;
  const cd = stats ? r.dashCd / stats.dashCd : 0;
  const tt = now();
  return (
    <Shell title={`Critter Races · ${RACE_LEVELS[st.level].name}`} onLeave={leave} bg="#132018"
      right={<span style={{ fontWeight: 900, color: "#ffd65a" }}>{st.phase === "race" ? `${Math.max(0, tt).toFixed(1)}s` : ""}</span>}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} onPointerDown={(e) => { e.preventDefault(); input.current.jump = true; }} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
        {st.phase === "count" && <div style={{ position: "absolute", top: "35%", left: 0, right: 0, textAlign: "center", fontSize: 72, fontWeight: 900, color: "#ffd65a", textShadow: "0 4px 0 rgba(0,0,0,0.4)", pointerEvents: "none" }}>{Math.max(1, Math.ceil(COUNTDOWN - st.t))}</div>}
        {st.phase === "race" && tt < 1 && <div style={{ position: "absolute", top: "35%", left: 0, right: 0, textAlign: "center", fontSize: 72, fontWeight: 900, color: "#7fdc8a", textShadow: "0 4px 0 rgba(0,0,0,0.4)", pointerEvents: "none" }}>GO!</div>}
        {r.done && <div style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", fontSize: 40, fontWeight: 900, color: "#ffd65a", textShadow: "0 3px 0 rgba(0,0,0,0.4)", pointerEvents: "none" }}>Finished! {r.time?.toFixed(1)}s<div style={{ fontSize: 15, color: "#fff" }}>{st.players.some(p => p && !p.done) ? `waiting for ${pName}…` : ""}</div></div>}
        {!myC && <div style={{ position: "absolute", top: 12, left: 0, right: 0, textAlign: "center", color: "#fff", fontWeight: 800 }}>Watching the race</div>}
        {myC && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, display: "flex", justifyContent: "space-between", padding: "0 14px", pointerEvents: "none" }}>
            <button data-jump onPointerDown={(e) => { e.stopPropagation(); input.current.jump = true; }} style={{ ...btn(true, { width: 110, height: 70, fontSize: 20, borderRadius: 18 }), pointerEvents: "auto" }}>JUMP</button>
            <button data-dash onPointerDown={(e) => { e.stopPropagation(); input.current.dash = true; }} style={{ ...btn(cd <= 0, { width: 110, height: 70, fontSize: 20, borderRadius: 18, position: "relative", overflow: "hidden" }), pointerEvents: "auto", background: cd <= 0 ? "#ff8a3c" : "rgba(255,255,255,0.08)", color: cd <= 0 ? "#2a1000" : C.dim }}>
              <span style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: `${cd * 100}%`, background: "rgba(0,0,0,0.25)" }} />
              <span style={{ position: "relative" }}>DASH</span>
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw(cv, st, mySlot, r, track, t, myC, world) {
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = Math.max(0.6, Math.min(1.4, H / 380));
  const groundY = H * 0.72;
  const camX = r.x - (W / scale) * 0.3;
  // sky + hills
  const g = ctx.createLinearGradient(0, 0, 0, groundY); g.addColorStop(0, "#7ec8f0"); g.addColorStop(1, "#d6f0ff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const [k, col, hgt] of [[0.15, "#a8d8a0", 0.32], [0.35, "#86c47a", 0.22]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, groundY);
    for (let x = 0; x <= W + 20; x += 20) { const wx = (x / scale + camX * k); ctx.lineTo(x, groundY - H * hgt * (0.55 + 0.45 * Math.sin(wx * 0.004) * Math.sin(wx * 0.0017 + 1))); }
    ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
  }
  // ground
  ctx.fillStyle = "#6fae4f"; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = "#c9a26a"; ctx.fillRect(0, groundY, W, 18 * scale);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let wx = Math.floor(camX / 60) * 60; wx < camX + W / scale; wx += 60) ctx.fillRect((wx - camX) * scale, groundY + 4 * scale, 18 * scale, 3 * scale);
  ctx.save(); ctx.translate(0, groundY); ctx.scale(scale, scale);
  const sx = (wx) => wx - camX;
  // distance markers + finish
  for (let d = 1000; d < TRACK_LEN; d += 1000) if (sx(d) > -50 && sx(d) < W / scale + 50) { ctx.fillStyle = "#fff"; ctx.fillRect(sx(d), -60, 4, 60); ctx.font = "bold 14px system-ui"; ctx.textAlign = "center"; ctx.fillText(`${Math.round((TRACK_LEN - d) / 100)}`, sx(d) + 2, -66); }
  if (sx(TRACK_LEN) < W / scale + 60) {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? "#222" : "#fff"; ctx.fillRect(sx(TRACK_LEN) + j * 12, -i * 12 - 12, 12, 12); }
    ctx.fillStyle = "#e04848"; ctx.fillRect(sx(TRACK_LEN) - 6, -130, 6, 130); ctx.fillRect(sx(TRACK_LEN) + 24, -130, 6, 130);
    ctx.fillStyle = "#ffd65a"; ctx.fillRect(sx(TRACK_LEN) - 6, -138, 36, 14);
  }
  // obstacles
  for (const o of track) {
    const x = sx(o.x);
    if (x < -260 || x > W / scale + 60) continue;
    const got = r.got[o.id];
    if (o.kind === "mud") { ctx.fillStyle = "#5e4024"; ctx.beginPath(); ctx.ellipse(x + OB.mud.w / 2, 6, OB.mud.w / 2, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.ellipse(x + OB.mud.w * 0.35, 3, 20, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (o.kind === "pad") { if (!got) for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(255,214,90,${0.6 + 0.4 * Math.sin(t * 8 - i)})`; ctx.beginPath(); ctx.moveTo(x + i * 22, 2); ctx.lineTo(x + i * 22 + 14, 9); ctx.lineTo(x + i * 22, 16); ctx.lineTo(x + i * 22 + 6, 9); ctx.closePath(); ctx.fill(); } }
    else if (o.kind === "berry") { if (!got) drawCropSprite(ctx, "berry", x + 15, -o.y + Math.sin(t * 4 + o.id) * 3, 26, t); }
    else if (o.kind === "log") {
      ctx.fillStyle = "#8a5a34"; ctx.beginPath(); ctx.roundRect(x, -OB.log.h + 4, OB.log.w, OB.log.h - 4, 10); ctx.fill();
      ctx.fillStyle = "#c9955a"; ctx.beginPath(); ctx.ellipse(x + OB.log.w - 6, -OB.log.h / 2 + 2, 7, (OB.log.h - 6) / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8a5a34"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + OB.log.w - 6, -OB.log.h / 2 + 2, 3, 7, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (o.kind === "rock") {
      ctx.fillStyle = "#8f9aa6"; ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 6, -OB.rock.h + 12); ctx.lineTo(x + 22, -OB.rock.h); ctx.lineTo(x + 42, -OB.rock.h + 8); ctx.lineTo(x + OB.rock.w, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.moveTo(x + 10, -OB.rock.h + 14); ctx.lineTo(x + 22, -OB.rock.h + 4); ctx.lineTo(x + 26, -OB.rock.h + 14); ctx.closePath(); ctx.fill();
    }
  }
  // racers: neighbours and partner as ghosts behind, me in front
  const racers = [];
  for (const n of st.npcs) racers.push({ x: st.phase === "race" ? npcX(n, Math.max(0, t)) : 0, y: 0, species: n.species, traits: { hue: n.hue, size: 1 }, alpha: 0.55, lane: -14, name: n.name });
  st.players.forEach((p, slot) => {
    if (!p || slot === mySlot) return;
    const c = world.creatures[p.cid];
    if (c) racers.push({ x: p.x || 0, y: p.y || 0, species: c.species, traits: c.traits, alpha: 0.75, lane: -8, name: c.name, color: P_COLORS[slot] });
  });
  for (const q of racers) {
    const x = sx(q.x);
    if (x < -60 || x > W / scale + 60) continue;
    drawCreature(ctx, x, q.lane - q.y, q.species, q.traits, { face: 1, t, moving: true, scale: 0.85, alpha: q.alpha });
    ctx.font = "bold 11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = q.color || "rgba(255,255,255,0.85)"; ctx.fillText(q.name, x, q.lane - q.y - 52);
  }
  if (myC) {
    const x = sx(r.x), hop = r.y > 0 ? 0 : Math.abs(Math.sin(t * 12)) * 3;
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x, 4, 18 * (1 - Math.min(0.5, r.y / 300)), 5, 0, 0, Math.PI * 2); ctx.fill();
    if (r.dash > 0) { ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 30 - i * 10, -10 - i * 8 - r.y); ctx.lineTo(x - 60 - i * 12, -10 - i * 8 - r.y); ctx.stroke(); } }
    if (r.boost > 0) { ctx.fillStyle = "rgba(255,214,90,0.35)"; ctx.beginPath(); ctx.arc(x, -22 - r.y, 30, 0, Math.PI * 2); ctx.fill(); }
    ctx.save();
    if (r.stun > 0) { ctx.translate(x, -r.y); ctx.rotate(-0.4); ctx.translate(-x, r.y); }
    drawCreature(ctx, x, -r.y - hop, myC.species, myC.traits, { face: 1, t, moving: r.stun <= 0, scale: 1 });
    ctx.restore();
    if (r.stun > 0) { ctx.fillStyle = "#ffe14d"; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 16, -58 - r.y + Math.sin(a) * 5, 3, 0, Math.PI * 2); ctx.fill(); } }
    for (const f of r.fx) {
      const k = (t - f.at);
      if (f.k === "smash") { ctx.fillStyle = `rgba(160,140,120,${1 - k})`; for (let i = 0; i < 6; i++) ctx.fillRect(sx(f.x) + 20 + Math.cos(i) * k * 60, -20 - Math.sin(i * 1.7) * k * 50 + k * k * 60, 6, 6); }
      if (f.k === "berry" || f.k === "pad") { ctx.font = "bold 16px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = `rgba(255,214,90,${1 - k})`; ctx.fillText("zoom!", x, -70 - r.y - k * 30); }
    }
  }
  ctx.restore();
  // progress bar
  const bx = 16, bw = W - 32, by = 12;
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.roundRect(bx, by, bw, 10, 5); ctx.fill();
  const dot = (x, col, rad) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + bw * Math.min(1, x / TRACK_LEN), by + 5, rad, 0, Math.PI * 2); ctx.fill(); };
  for (const n of st.npcs) dot(st.phase === "race" ? npcX(n, Math.max(0, t)) : 0, "rgba(255,255,255,0.7)", 5);
  st.players.forEach((p, slot) => { if (p && slot !== mySlot) dot(p.x || 0, P_COLORS[slot], 6); });
  if (myC) dot(r.x, P_COLORS[mySlot], 8);
  ctx.fillStyle = "#222"; ctx.fillRect(bx + bw - 3, by - 3, 6, 16);
}