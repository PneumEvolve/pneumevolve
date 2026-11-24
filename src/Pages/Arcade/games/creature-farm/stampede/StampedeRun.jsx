// src/Pages/Arcade/games/creature-farm/stampede/StampedeRun.jsx
//
// Critter Stampede — a run you start from the signpost on the farm.
// You play as your bonded creature on an endless field. Run circles around
// wild critters to tame them; they join your herd and swarm the goop.
// When the run ends, pick one creature from your herd to bring home to the pen.
//
// Props (from CreatureFarm):
//   net          the room socket (shared with the farm)
//   runHost      true on the device that started the run — it runs the simulation
//   species, hue your leader (the creature following you, or your starter)
//   onAdopt({ species, hue, size })   bring one tamed critter home
//   onExit()     back to the farm
//
// Netcode (only while in a run):
//   guest → host  me    { x, y, f, sp, hue }   ~20/s volatile
//   guest → host  tame  { cid } · again {}      reliable
//   host → guest  snap  {...} ~10/s volatile · hurt { kx, ky } · restart {}
//   (run_go / run_end / run_join are handled by CreatureFarm)
//
// Controls: joystick (touch) or WASD / arrows. Attacks are automatic.
// No emojis: everything is drawn in code.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../../net/useArcadeRoom";
import { useArcadeSave } from "../../../net/useArcadeSave";
import { C } from "../../../ui";
import { SPECIES } from "../species";
import { drawCreature, drawPaw, drawHeart } from "../drawFarm";
import {
  T, SPECIES_IDS, createRun, addPlayer, stepRun, setLeaderPos, tryTame,
  makeSnapshot, readSnapshotPlayers, lassoStep,
} from "./stampedeSim";
import {
  drawGround, drawGoop, drawLeaderRing, drawHerdDot, drawWildSparkle, drawTrail,
  drawLasso, drawFx, drawEdgeArrow, drawDowned,
} from "./drawStampede";

const SLOT_COLORS = [C.accent, C.accent2];
const SPAWN = [{ x: 0, y: 0 }, { x: 80, y: 0 }];
const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;
const KEYMAP = {
  ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
};
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function StampedeRun({ net, runHost, species, hue, onAdopt, onExit }) {
  const mySlot = runHost ? 0 : 1;
  const otherSlot = 1 - mySlot;
  // Best scores live with your Creature Farm save.
  const { data: save, update } = useArcadeSave("creature-farm", { stampedeBest: { time: 0, tamed: 0, kills: 0 } });

  const [hud, setHud] = useState({ t: 0, hp: 100, herd: 0, kills: 0, tamed: 0, down: false, st: "play", started: false, players: [], myHerd: [] });
  const [adopted, setAdopted] = useState(null);     // id of the critter brought home this run

  const live = useRef({});
  live.current = { net, runHost, mySlot, otherSlot, species, hue };

  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const stickRef = useRef({ x: 0, y: 0, active: false });
  const meRef = useRef({ ...SPAWN[mySlot], face: 1, moving: false, kx: 0, ky: 0, hurtAt: -9 });
  const trailRef = useRef({ 0: [], 1: [] });
  const lassoRef = useRef(null);
  const pendingTame = useRef(new Map());

  const runRef = useRef(null);
  const viewRef = useRef({ t: 0, st: "play", players: [null, null], critters: new Map(), baddies: new Map(), fx: [], got: false });
  const partnerRef = useRef(null);                 // { species, hue } of the run guest
  const recordedRef = useRef(false);

  // ── Host: start the run ────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    const L = live.current;
    const run = createRun(Math.floor(Math.random() * 1e9));
    addPlayer(run, 0, L.species, SPAWN[0].x, SPAWN[0].y, L.hue);
    if (partnerRef.current) addPlayer(run, 1, partnerRef.current.species, SPAWN[1].x, SPAWN[1].y, partnerRef.current.hue);
    runRef.current = run;
    meRef.current = { ...SPAWN[0], face: 1, moving: false, kx: 0, ky: 0, hurtAt: -9 };
    lassoRef.current = null;
    trailRef.current = { 0: [], 1: [] };
    recordedRef.current = false;
    setAdopted(null);
  }, []);

  useEffect(() => { if (runHost && !runRef.current) startRun(); }, [runHost, startRun]);

  const restart = useCallback(() => {
    const L = live.current;
    if (L.runHost) { startRun(); L.net.send("restart"); }
    else L.net.send("again");
  }, [startRun]);

  const applyHurt = useCallback((kx, ky) => {
    const me = meRef.current;
    me.kx += kx; me.ky += ky; me.hurtAt = performance.now();
    lassoRef.current = null;
  }, []);

  // ── Network ────────────────────────────────────────────────────────────────
  useArcadeEvent(net, "me", (m) => {
    const L = live.current, run = runRef.current;
    if (!L.runHost || !run) return;
    const sp = SPECIES_IDS[m.sp];
    if (!sp) return;
    partnerRef.current = { species: sp, hue: m.hue };
    if (!run.players[1] || run.players[1].species !== sp || run.players[1].hue !== m.hue) addPlayer(run, 1, sp, m.x, m.y, m.hue);
    setLeaderPos(run, 1, m.x, m.y);
    run.players[1].face = m.f;
  });
  useArcadeEvent(net, "tame", (m) => { if (live.current.runHost && runRef.current) tryTame(runRef.current, 1, m.cid); });
  useArcadeEvent(net, "again", () => { if (live.current.runHost && runRef.current?.state === "over") restart(); });
  useArcadeEvent(net, "hurt", (m) => { if (!live.current.runHost) applyHurt(m.kx, m.ky); });
  useArcadeEvent(net, "restart", () => {
    if (live.current.runHost) return;
    meRef.current = { ...SPAWN[1], face: 1, moving: false, kx: 0, ky: 0, hurtAt: -9 };
    lassoRef.current = null; trailRef.current = { 0: [], 1: [] }; recordedRef.current = false;
    viewRef.current = { t: 0, st: "play", players: [null, null], critters: new Map(), baddies: new Map(), fx: [], got: false };
    setAdopted(null);
  });
  useArcadeEvent(net, "snap", (m) => {
    if (live.current.runHost) return;
    const v = viewRef.current;
    v.got = true; v.t = m.t; v.st = m.st;
    readSnapshotPlayers(m).forEach((p, i) => {
      if (!p) { v.players[i] = null; return; }
      const old = v.players[i];
      v.players[i] = { ...p, x: old ? old.x : p.x, y: old ? old.y : p.y, tx: p.x, ty: p.y };
    });
    const seenC = new Set();
    for (const a of m.c || []) {
      const id = a[0]; seenC.add(id);
      const e = v.critters.get(id);
      const base = { id, species: SPECIES_IDS[a[1]], tx: a[2], ty: a[3], hue: a[4], size: a[5] / 100, owner: a[6], hpFrac: a[7] / 100, bump: a[8] };
      if (e) Object.assign(e, base); else v.critters.set(id, { ...base, x: a[2], y: a[3], face: 1 });
    }
    for (const id of [...v.critters.keys()]) if (!seenC.has(id)) v.critters.delete(id);
    const seenB = new Set();
    for (const a of m.b || []) {
      const id = a[0]; seenB.add(id);
      const e = v.baddies.get(id);
      const base = { id, kind: a[1] ? "big" : "goop", tx: a[2], ty: a[3], hpFrac: a[4] / 100, flash: a[5] };
      if (e) Object.assign(e, base); else v.baddies.set(id, { ...base, x: a[2], y: a[3] });
    }
    for (const id of [...v.baddies.keys()]) if (!seenB.has(id)) v.baddies.delete(id);
    for (const f of m.fx || []) v.fx.push({ ...f, age: 0 });
  });

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => { const k = KEYMAP[e.key]; if (k) { e.preventDefault(); keysRef.current[k] = true; } };
    const up = (e) => { const k = KEYMAP[e.key]; if (k) delete keysRef.current[k]; };
    const blur = () => { keysRef.current = {}; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), lastSend = 0, lastSnap = 0, lastHud = 0, acc = 0;
    if (window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__.stampede = { me: meRef, run: runRef, view: viewRef, lasso: lassoRef };

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current, me = meRef.current, tSec = now / 1000;
      const run = runRef.current, view = viewRef.current;

      let players, critters, baddies, fxList, runT, state;
      if (L.runHost) {
        if (!run) return;
        players = run.players; critters = run.critters; baddies = run.baddies; fxList = run.fx; runT = run.t; state = run.state;
      } else {
        const a = 1 - Math.exp(-dt * 12);
        for (const e of view.critters.values()) { const ox = e.x; e.x += (e.tx - e.x) * a; e.y += (e.ty - e.y) * a; if (Math.abs(e.x - ox) > 0.2) e.face = e.x > ox ? 1 : -1; }
        for (const e of view.baddies.values()) { e.x += (e.tx - e.x) * a; e.y += (e.ty - e.y) * a; }
        for (const p of view.players) if (p) { p.x += (p.tx - p.x) * a; p.y += (p.ty - p.y) * a; }
        for (const f of view.fx) f.age += dt;
        view.fx = view.fx.filter(f => f.age < 0.6);
        players = view.players; critters = [...view.critters.values()]; baddies = [...view.baddies.values()]; fxList = view.fx; runT = view.t; state = view.st;
      }
      const myP = players[L.mySlot];
      const iAmDown = !!myP?.down;
      const over = state === "over";
      const partner = players[L.otherSlot];
      const partnerIn = !!partner && partner.active !== false;

      // ── Move my leader ───────────────────────────────────────────────────
      const k = keysRef.current, st = stickRef.current;
      let dx, dy;
      if (st.active) { dx = st.x; dy = st.y; } else { dx = (k.right ? 1 : 0) - (k.left ? 1 : 0); dy = (k.down ? 1 : 0) - (k.up ? 1 : 0); }
      let mag = Math.hypot(dx, dy);
      if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }
      me.moving = !iAmDown && !over && mag > 0.05;
      if (me.moving) { me.x += dx * T.LEADER_SPEED * dt; me.y += dy * T.LEADER_SPEED * dt; if (Math.abs(dx) > 0.15) me.face = dx > 0 ? 1 : -1; }
      me.x += me.kx * dt; me.y += me.ky * dt;
      const decay = Math.exp(-dt * 8); me.kx *= decay; me.ky *= decay;
      if (partnerIn) {
        const pd = Math.hypot(me.x - partner.x, me.y - partner.y);
        if (pd > T.LEASH) { me.x = partner.x + (me.x - partner.x) / pd * T.LEASH; me.y = partner.y + (me.y - partner.y) / pd * T.LEASH; }
      }

      // ── Host steps the world; guest reports its leader ───────────────────
      if (L.runHost && run) {
        setLeaderPos(run, 0, me.x, me.y);
        acc += dt;
        while (acc >= 1 / 60) {
          stepRun(run, 1 / 60, (slot, kx, ky) => {
            if (slot === 0) applyHurt(kx, ky);
            else L.net.send("hurt", { kx: Math.round(kx), ky: Math.round(ky) });
          });
          acc -= 1 / 60;
        }
        if (L.net.partnerOnline && now - lastSnap > 100) { L.net.send("snap", makeSnapshot(run), { volatile: true }); lastSnap = now; }
        else if (!L.net.partnerOnline) run.fxOut = [];
      }
      if (!L.runHost && now - lastSend > 50) {
        L.net.send("me", { x: Math.round(me.x), y: Math.round(me.y), f: me.face, sp: SPECIES_IDS.indexOf(L.species), hue: L.hue }, { volatile: true });
        lastSend = now;
      }

      // ── Lasso (on my device) ─────────────────────────────────────────────
      for (const [cid, at] of pendingTame.current) if (now - at > 1500) pendingTame.current.delete(cid);
      const wild = critters.filter(c => c.owner === -1 && !pendingTame.current.has(c.id));
      if (!iAmDown && !over && myP) {
        const res = lassoStep(lassoRef.current, me, wild, me.moving);
        lassoRef.current = res.state;
        if (res.tame != null) {
          if (L.runHost) tryTame(run, 0, res.tame);
          else { L.net.send("tame", { cid: res.tame }); pendingTame.current.set(res.tame, now); }
        }
      } else lassoRef.current = null;

      const trails = trailRef.current;
      const pushTrail = (slot, x, y) => { const tr = trails[slot]; tr.push({ x, y, at: now }); while (tr.length && now - tr[0].at > 1100) tr.shift(); };
      pushTrail(L.mySlot, me.x, me.y);
      if (partnerIn) pushTrail(L.otherSlot, partner.x, partner.y);

      // ── Draw ─────────────────────────────────────────────────────────────
      const cw = canvas.width, ch = canvas.height;
      const scale = Math.max(Math.min(cw / 1000, ch / 620), Math.min(cw, ch) / 600);
      const camX = me.x, camY = me.y - 20;
      const viewW = cw / scale, viewH = ch / scale;
      const left = camX - viewW / 2, top = camY - viewH / 2;
      ctx.globalAlpha = 1;
      ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
      drawGround(ctx, left, top, viewW, viewH);

      if (trails[L.mySlot].length > 1) drawTrail(ctx, trails[L.mySlot], SLOT_COLORS[L.mySlot]);
      if (partnerIn && trails[L.otherSlot].length > 1) drawTrail(ctx, trails[L.otherSlot], SLOT_COLORS[L.otherSlot]);

      const onScreen = (o, pad = 80) => o.x > left - pad && o.x < left + viewW + pad && o.y > top - pad && o.y < top + viewH + pad;
      const items = [];
      for (const c of critters) if (onScreen(c)) items.push({ y: c.y, c });
      for (const b of baddies) if (onScreen(b)) items.push({ y: b.y, b });
      for (const slot of [0, 1]) {
        const pl = players[slot];
        if (!pl) continue;
        if (slot !== L.mySlot && pl.active === false) continue;
        const pos = slot === L.mySlot ? me : pl;
        items.push({ y: pos.y, leader: { ...pl, x: pos.x, y: pos.y, face: slot === L.mySlot ? me.face : (pl.face || 1) }, slot });
      }
      items.sort((a, b) => a.y - b.y);

      for (const it of items) {
        if (it.c) {
          const c = it.c;
          const herd = c.owner !== -1;
          const face = c.face ?? (c.vx > 0 ? 1 : c.vx < 0 ? -1 : 1);
          if (herd) drawHerdDot(ctx, c.x, c.y, SLOT_COLORS[c.owner]);
          drawCreature(ctx, c.x, c.y - (c.bump ? 4 : 0), c.species, { hue: c.hue, size: c.size, personality: "bold" },
            { face, t: tSec + c.id, moving: herd, scale: 0.75 });
          if (!herd) drawWildSparkle(ctx, c.x + 14, c.y - 34, tSec, c.id);
        } else if (it.b) {
          const b = it.b;
          drawGoop(ctx, { ...b, hpFrac: b.hpFrac ?? b.hp / b.maxHp, flash: b.flash ?? (b.hitT > 0) }, tSec);
        } else if (it.leader) {
          const p = it.leader;
          drawLeaderRing(ctx, p.x, p.y, SLOT_COLORS[it.slot], tSec, p.down);
          const hurtBlink = it.slot === L.mySlot && now - me.hurtAt < 600 && Math.floor(now / 80) % 2 === 0;
          if (!hurtBlink) drawCreature(ctx, p.x, p.y, p.species, { hue: p.hue ?? SPECIES[p.species]?.hue ?? 0, size: 1, personality: p.down ? "sleepy" : "bold" },
            { face: p.face, t: tSec, moving: it.slot === L.mySlot ? me.moving && !p.down : true, scale: 1.25, alpha: p.down ? 0.6 : 1 });
          if (p.down) drawDowned(ctx, p.x, p.y, (p.rev || 0) / T.REVIVE_TIME, tSec);
        }
      }

      const ls = lassoRef.current;
      if (ls) { const c = critters.find(x => x.id === ls.cid); if (c) drawLasso(ctx, me, c, ls.frac || 0, SLOT_COLORS[L.mySlot], tSec); }
      for (const f of fxList) drawFx(ctx, f, SLOT_COLORS);

      if (partnerIn && !onScreen(partner, -30)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const ang = Math.atan2(partner.y - camY, partner.x - camX);
        const r = Math.min(cw, ch) / 2 - 40;
        drawEdgeArrow(ctx, cw / 2 + Math.cos(ang) * r, ch / 2 + Math.sin(ang) * r, ang, SLOT_COLORS[L.otherSlot]);
      }

      // ── HUD (throttled) ──────────────────────────────────────────────────
      if (now - lastHud > 200) {
        lastHud = now;
        const mine = critters.filter(c => c.owner === L.mySlot);
        setHud({
          t: runT, hp: myP?.hp ?? 100, herd: mine.length, kills: myP?.kills ?? 0, tamed: myP?.tamed ?? 0, down: iAmDown,
          st: state, started: L.runHost ? !!run : view.got, partnerIn,
          other: partner ? { kills: partner.kills, tamed: partner.tamed } : null,
          myHerd: over ? mine.map(c => ({ id: c.id, species: c.species, hue: c.hue, size: c.size })) : [],
        });
      }
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [applyHurt]);

  // ── Save best run ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (hud.st !== "over" || recordedRef.current || !hud.started) return;
    recordedRef.current = true;
    update(prev => {
      const b = prev.stampedeBest || { time: 0, tamed: 0, kills: 0 };
      return { stampedeBest: { time: Math.max(b.time, Math.floor(hud.t)), tamed: Math.max(b.tamed, hud.tamed), kills: Math.max(b.kills, hud.kills) } };
    });
  }, [hud.st, hud.started, hud.t, hud.tamed, hud.kills, update]);

  const bringHome = (c) => {
    if (adopted) return;
    setAdopted(c.id);
    onAdopt?.({ species: c.species, hue: c.hue, size: c.size });
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  const best = save.stampedeBest || { time: 0, tamed: 0, kills: 0 };
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, overflow: "hidden", background: "#1d3b22", touchAction: "none", ...noSelect, fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", ...noSelect }} />

      <button onClick={onExit} style={{ ...smallBtn, position: "absolute", top: 10, left: 10, zIndex: 25 }}>← back to farm</button>

      <div style={{ position: "absolute", top: 46, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", zIndex: 20, pointerEvents: "none", fontSize: 13, fontWeight: 700 }}>
        <Chip>{fmtTime(hud.t)}</Chip>
        <Chip>
          <Icon draw={(ctx, s) => drawHeart(ctx, s / 2, s / 2, s, "#ff5d73")} size={14} />
          <span style={{ display: "inline-block", width: 70, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.max(0, hud.hp)}%`, background: hud.hp < 30 ? C.bad : "#7ee081" }} />
          </span>
        </Chip>
        <Chip><Icon draw={drawPaw} size={16} /> herd {hud.herd}</Chip>
        <Chip><GoopIcon /> {hud.kills}</Chip>
        <Chip color={hud.partnerIn ? C.good : C.dim}><Dot color={hud.partnerIn ? C.good : C.dim} /> {hud.partnerIn ? "partner in the run" : "solo run"}</Chip>
      </div>

      {hud.started && hud.herd === 0 && hud.t < 25 && !hud.down && <div style={hintStyle}>Run circles around a sparkly critter to tame it</div>}
      {hud.down && hud.st === "play" && <div style={{ ...hintStyle, color: C.bad }}>You're down! Your partner can revive you by standing next to you</div>}
      {!hud.started && <div style={{ ...hintStyle, top: "45%" }}>joining the run…</div>}

      {!isTouch() && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12, zIndex: 5, pointerEvents: "none" }}>
          WASD / arrows to move · attacks are automatic · circle critters to tame them
        </div>
      )}

      <TouchStick stickRef={stickRef} />

      {hud.st === "over" && (
        <Overlay>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim }}>run over</div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{fmtTime(hud.t)}</div>
          <div style={{ display: "flex", gap: 18, justifyContent: "center", fontSize: 14 }}>
            <Stat label="tamed" value={hud.tamed} />
            <Stat label="goop flattened" value={hud.kills} />
          </div>
          {hud.other && <div style={{ fontSize: 13, color: C.dim }}>partner: {hud.other.tamed} tamed · {hud.other.kills} flattened</div>}
          <div style={{ fontSize: 12, color: C.faint }}>best: {fmtTime(best.time)} · {best.tamed} tamed · {best.kills} flattened</div>

          {hud.myHerd.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
                {adopted ? "Coming home to your pen!" : "Bring one home to the farm"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxHeight: 150, overflowY: "auto" }}>
                {hud.myHerd.map(c => (
                  <button key={c.id} disabled={!!adopted} onClick={() => bringHome(c)} title={SPECIES[c.species]?.name} style={{
                    padding: 2, borderRadius: 10, cursor: adopted ? "default" : "pointer",
                    background: adopted === c.id ? "rgba(126,224,129,0.25)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${adopted === c.id ? C.good : "rgba(255,255,255,0.12)"}`,
                    opacity: adopted && adopted !== c.id ? 0.35 : 1,
                  }}>
                    <Portrait species={c.species} hue={c.hue} size={50} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={restart} style={menuBtn(true)}>Again!</button>
          <button onClick={onExit} style={menuBtn(false)}>Back to farm</button>
        </Overlay>
      )}
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Icon({ draw, size = 18 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
    if (draw.length >= 4) draw(ctx, size / 2, size / 2, size); else draw(ctx, size);
  });
  return <canvas ref={ref} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} />;
}
function GoopIcon() {
  return <Icon size={18} draw={(ctx, s) => { ctx.save(); ctx.translate(s / 2, s * 0.92); ctx.scale(s / 34, s / 34); drawGoop(ctx, { id: 1, kind: "goop", x: 0, y: 0, hpFrac: 1 }, 0); ctx.restore(); }} />;
}
function Portrait({ species, hue, size }) {
  return <Icon size={size} draw={(ctx, s) => { ctx.save(); ctx.translate(s / 2, s * 0.86); ctx.scale(s / 48, s / 48); drawCreature(ctx, 0, 0, species, { hue: hue ?? SPECIES[species]?.hue ?? 0, size: 1, personality: "bold" }, { face: 1, t: 1 }); ctx.restore(); }} />;
}
function Dot({ color }) { return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: color }} />; }
function Chip({ children, color = C.text }) {
  return <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(15,12,30,0.7)", border: "1px solid rgba(255,255,255,0.12)", color, display: "inline-flex", alignItems: "center", gap: 6 }}>{children}</span>;
}
function Stat({ label, value }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><span style={{ fontSize: 24, fontWeight: 800 }}>{value}</span><span style={{ color: C.dim, fontSize: 12 }}>{label}</span></div>;
}
function Overlay({ children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(5,4,12,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ width: "100%", maxWidth: 420, maxHeight: "calc(100svh - 24px)", overflowY: "auto", boxSizing: "border-box", background: "#1a1630", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "14px 18px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, color: C.text, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

function TouchStick({ stickRef }) {
  const zoneRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const R = 60;
  if (!isTouch()) return null;
  const setFrom = (e) => {
    const r = zoneRef.current.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / R, dy = (e.clientY - (r.top + r.height / 2)) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    stickRef.current = { x: m < 0.15 ? 0 : dx, y: m < 0.15 ? 0 : dy, active: true };
    setKnob({ x: dx * R, y: dy * R, on: true });
  };
  const end = () => { stickRef.current = { x: 0, y: 0, active: false }; setKnob({ x: 0, y: 0, on: false }); };
  return (
    <div
      ref={zoneRef}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); setFrom(e); }}
      onPointerMove={(e) => { if (knob.on || e.buttons) setFrom(e); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      style={{
        position: "absolute", left: 22, bottom: "calc(22px + env(safe-area-inset-bottom, 0px))", zIndex: 22,
        width: R * 2, height: R * 2, borderRadius: "50%", touchAction: "none", ...noSelect,
        background: "rgba(245,230,200,0.08)", border: "2px solid rgba(245,230,200,0.22)",
      }}
    >
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 48, borderRadius: "50%", background: knob.on ? "rgba(245,230,200,0.42)" : "rgba(245,230,200,0.22)", transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, pointerEvents: "none" }} />
    </div>
  );
}

const noSelect = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent" };
const smallBtn = {
  padding: "7px 11px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
  background: "rgba(15,12,30,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: C.text,
};
const hintStyle = {
  position: "absolute", top: 86, left: 0, right: 0, textAlign: "center", zIndex: 21, pointerEvents: "none",
  color: "#fff", fontWeight: 800, fontSize: 14, textShadow: "0 2px 6px rgba(0,0,0,0.6)", padding: "0 20px",
};
function menuBtn(primary) {
  return {
    padding: "10px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    ...(primary ? { background: C.accent, color: "#1a1300", border: "none" } : { background: "transparent", color: C.dim, border: "1px solid rgba(255,255,255,0.12)" }),
  };
}