// src/Pages/Arcade/games/creature-farm/CreatureFarm.jsx
//
// Creature Farm — walk around, grow food + lure crops, befriend the creatures
// your lures attract, keep everyone fed and happy — and walk up to the RUNS
// signpost to head out on a run (Critter Stampede for now).
//
// Files:
//   species.js   ← the creatures + crops (Bash's file — edit freely)
//   farmWorld.js ← map layout + every rule (the saved world)
//   drawFarm.js  ← all the drawing
//   stampede/    ← the Critter Stampede run (started from the signpost)
//   this file    ← screen, controls, syncing player positions, the run board
//
// Controls
//   Move:    joystick (touch) · WASD / arrows
//   Action:  ACTION button · E or Space  (plant, harvest, feed — HOLD to befriend)
//   Pet:     PET button · Q
//   Seeds:   tap the seed bar · 1–4
//   Roster:  paw button · R or Tab
//
// No emojis anywhere: every icon is drawn in drawFarm.js (they don't render
// the same — or at all — on every computer).
//
// Network (besides the shared world): "pos" { x, y, f, m } ~12/s, volatile.
// Runs: "run_go" { kind } when someone heads out (partner gets a Join button),
//       "run_end" {} when the run's host leaves (everyone in it comes home).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../net/useArcadeRoom";
import { useArcadeWorld } from "../../net/useArcadeWorld";
import { C } from "../../ui";
import { SPECIES, CROPS, PERSONALITIES } from "./species";
import {
  WORLD_W, WORLD_H, MAP, REACH, DAY_LEN, PLOT_COUNT, FOLLOW_BOND, FEED_BELOW,
  initFarm, farmReducer, plotRect, growth, visitorPos, penPos,
} from "./farmWorld";
import {
  drawCreature, drawFarmer, drawMap, drawBar,
  drawCropSprite, drawHeart, drawBowl, drawSun, drawPaw, drawQuestion,
} from "./drawFarm";
import StampedeRun from "./stampede/StampedeRun";

// Runs you can pick at the signpost. Add more here as they're built.
const RUNS = [
  { id: "stampede", name: "Critter Stampede", ready: true,
    desc: "Endless field. Run circles around critters to tame them, build a herd, flatten the goop. Bring one home." },
  { id: "wilds", name: "Wilds", ready: false, desc: "You and a partner creature vs wild packs." },
  { id: "defend", name: "Defend the Farm", ready: false, desc: "Goop raids the farm at night." },
];

const WALK = 170, SNEAK = 55, SPOOK_SPEED = 120, SPOOK_RADIUS = 75;
const SEND_MS = 80;
const OFFER_EVERY = 0.4;
const CREATURE_SCALE = 0.9;
const SEEDS = Object.keys(CROPS);
const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;

const KEYMAP = {
  ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
};

export default function CreatureFarm({ net, room, role, solo, onLeave }) {
  const W = useArcadeWorld(net, room.id, { reducer: farmReducer, initWorld: initFarm });
  const myId = net.userId != null ? String(net.userId) : null;
  const p1 = String(room.player1_id), p2 = room.player2_id != null ? String(room.player2_id) : null;
  const colorOf = useCallback((uid) => (uid === p1 ? C.accent : uid === p2 ? C.accent2 : "#ccc"), [p1, p2]);
  const nameOf  = useCallback((uid) => {
    if (uid != null && uid === myId) return "you";
    if (uid === p1) return room.player1_name || "player 1";
    if (uid === p2) return room.player2_name || "player 2";
    return "someone";
  }, [myId, p1, p2, room.player1_name, room.player2_name]);
  const partnerId = myId === p1 ? p2 : p1;

  const [seed,      setSeed]      = useState("berry");
  const [roster,    setRoster]    = useState(false);
  const [toasts,    setToasts]    = useState([]);
  const [target,    setTarget]    = useState(null);   // what's in reach (for the buttons)
  const [portrait,  setPortrait]  = useState(false);
  const [board,     setBoard]     = useState(false);   // run board open
  const [myRun,     setMyRun]     = useState(null);    // { kind, host } while I'm on a run
  const [partnerRun, setPartnerRun] = useState(null);  // { kind } — partner is out on a run I could join

  // Everything the loop/handlers need, always fresh.
  const live = useRef({});
  live.current = { W, world: W.world, myId, partnerId, seed, solo, net, colorOf, nameOf, role, inRun: !!myRun, myRun, partnerRun };

  const canvasRef = useRef(null);
  const keysRef   = useRef({});
  const stickRef  = useRef({ x: 0, y: 0, active: false });
  const actionRef = useRef({ held: false, acc: 0 });
  const spookRef  = useRef({});
  const lastTickRef = useRef({ dayTime: -1, at: performance.now() });
  const currentTarget = useRef(null);   // what's in reach right now (read by handlers)

  const meRef = useRef(null);
  if (!meRef.current) {
    const sp = MAP.spawn[role === "p2" ? 1 : 0];
    meRef.current = { x: sp.x, y: sp.y, face: 1, moving: false, speed: 0 };
  }
  const partnerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, face: 1, moving: false, seen: false, at: 0 });
  const followRef  = useRef({});   // userId -> { x, y, face, moving }
  const posCache   = useRef({});   // creature/visitor id -> { x, y }

  // ── Host runs the clock (only while someone is playing) ────────────────────
  useEffect(() => {
    if (!W.isHost || !W.ready) return;
    let last = performance.now();
    const id = setInterval(() => {
      const n = performance.now();
      const dt = Math.min(5, (n - last) / 1000);
      last = n;
      live.current.W.dispatch({ type: "tick", dt: Math.round(dt * 100) / 100, r: Math.random() });
    }, 1000);
    return () => clearInterval(id);
  }, [W.isHost, W.ready]);

  // ── Partner position ───────────────────────────────────────────────────────
  useArcadeEvent(net, "pos", (m) => {
    const p = partnerRef.current;
    if (!p.seen || performance.now() - p.at > 3000) { p.x = m.x; p.y = m.y; }
    p.tx = m.x; p.ty = m.y; p.face = m.f || 1; p.moving = !!m.m; p.seen = true; p.at = performance.now();
  });
  useArcadeEvent(net, "partner_disconnected", () => {
    partnerRef.current.seen = false;
    setPartnerRun(null);
    if (live.current.myRun && !live.current.myRun.host) { setMyRun(null); toast("Your partner left the run"); }
  });

  // ── Runs (signpost) ────────────────────────────────────────────────────────
  useArcadeEvent(net, "run_go", (m) => {
    if (live.current.myRun) return;
    setPartnerRun({ kind: m.kind });
    toast(`${cap(live.current.nameOf(live.current.partnerId))} headed out on a run`);
  });
  useArcadeEvent(net, "run_end", () => {
    setPartnerRun(null);
    if (live.current.myRun && !live.current.myRun.host) { setMyRun(null); toast("The run ended"); }
  });
  // If my partner (re)connects while I'm out, let them know they can join.
  const announceRun = useCallback(() => { const r = live.current.myRun; if (r?.host) live.current.net.send("run_go", { kind: r.kind }); }, []);
  useArcadeEvent(net, "hello", announceRun);
  useArcadeEvent(net, "partner_connected", announceRun);

  const myLeader = () => {
    const L = live.current, w = L.world;
    if (!w || !L.myId) return null;
    return Object.values(w.creatures).find(c => c.follow === L.myId) || w.creatures[w.starters[L.myId]] || null;
  };
  const startRun = (kind) => {
    if (!myLeader()) return;
    setBoard(false);
    setMyRun({ kind, host: true });
    setPartnerRun(null);
    net.send("run_go", { kind });
  };
  const joinRun = () => {
    if (!partnerRun || !myLeader()) return;
    setBoard(false);
    setMyRun({ kind: partnerRun.kind, host: false });
    setPartnerRun(null);
  };
  const exitRun = () => {
    if (myRun?.host) net.send("run_end");
    setMyRun(null);
    keysRef.current = {};
  };

  const toast = useCallback((text, kind = "info") => {
    const id = Math.random();
    setToasts(ts => [...ts.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3500);
  }, []);

  // ── Toasts from the shared log (catches, visitors, new days) ───────────────
  const lastLogKey = useRef(null);
  useEffect(() => {
    if (!W.world) return;
    const top = W.world.log?.[0];
    const key = top ? `${top.t}|${top.text}` : "";
    if (lastLogKey.current === null) { lastLogKey.current = key; return; }   // don't replay old news on load
    if (!top || key === lastLogKey.current) return;
    lastLogKey.current = key;
    if (!["catch", "visit", "day", "flee", "starter"].includes(top.kind)) return;
    const who = top.by && top.kind !== "visit" && top.kind !== "day" && top.kind !== "flee" ? `${live.current.nameOf(top.by)} ` : "";
    const text = who ? `${who[0].toUpperCase()}${who.slice(1)}${top.text}` : top.text;
    const id = Math.random();
    setToasts(ts => [...ts.slice(-2), { id, text, kind: top.kind }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), top.kind === "catch" ? 4000 : 3000);
  }, [W.world?.log]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const doAction = useCallback(() => {
    const L = live.current, t = currentTarget.current;
    if (!t || !L.W.canAct) return;
    if (t.kind === "sign") { setBoard(true); return; }
    if (t.kind === "plot") {
      const crop = L.world.plots[t.i];
      if (!crop) L.W.dispatch({ type: "plant", i: t.i, kind: L.seed });
      else if (CROPS[crop.kind].type === "food" && growth(crop, L.W.now()) >= 1) L.W.dispatch({ type: "harvest", i: t.i });
    } else if (t.kind === "creature") {
      L.W.dispatch({ type: "feed", cid: t.id });
    }
  }, []);
  const doPet = useCallback(() => {
    const L = live.current, t = currentTarget.current;
    if (t?.kind === "creature" && L.W.canAct) L.W.dispatch({ type: "pet", cid: t.id });
  }, []);
  const pressAction = useCallback(() => {
    if (actionRef.current.held) return;
    actionRef.current.held = true;
    actionRef.current.acc = 0;
    doAction();
  }, [doAction]);
  const releaseAction = useCallback(() => {
    const a = actionRef.current, L = live.current, t = currentTarget.current;
    if (a.held && t?.kind === "visitor" && a.acc > 0.05) L.W.dispatch({ type: "offer", vid: t.id, s: Math.round(a.acc * 100) / 100 });
    a.held = false; a.acc = 0;
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.target?.tagName === "INPUT" || live.current.inRun) return;
      const k = KEYMAP[e.key];
      if (k) { e.preventDefault(); keysRef.current[k] = true; return; }
      if (e.key === "e" || e.key === "E" || e.key === " ") { e.preventDefault(); if (!e.repeat) pressAction(); return; }
      if (e.key === "q" || e.key === "Q") { if (!e.repeat) doPet(); return; }
      if (e.key === "r" || e.key === "R" || e.key === "Tab") { e.preventDefault(); setRoster(o => !o); return; }
      if (e.key === "Escape") { setRoster(false); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= SEEDS.length) setSeed(SEEDS[n - 1]);
    };
    const up = (e) => {
      const k = KEYMAP[e.key];
      if (k) delete keysRef.current[k];
      if (e.key === "e" || e.key === "E" || e.key === " ") releaseAction();
    };
    const blur = () => { keysRef.current = {}; releaseAction(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [pressAction, releaseAction, doPet]);

  // Phones treat a long-press as "select this", which greys out the whole canvas.
  // Block selection while the game is open and clear any that sneaks through.
  useEffect(() => {
    const b = document.body.style;
    const prev = [b.userSelect, b.webkitUserSelect, b.webkitTouchCallout];
    b.userSelect = "none"; b.webkitUserSelect = "none"; b.webkitTouchCallout = "none";
    const clear = () => { const sel = window.getSelection?.(); if (sel && sel.rangeCount) sel.removeAllRanges(); };
    const noMenu = (e) => e.preventDefault();
    document.addEventListener("selectionchange", clear);
    document.addEventListener("contextmenu", noMenu);
    return () => {
      [b.userSelect, b.webkitUserSelect, b.webkitTouchCallout] = prev;
      document.removeEventListener("selectionchange", clear);
      document.removeEventListener("contextmenu", noMenu);
    };
  }, []);

  useEffect(() => {
    const check = () => setPortrait(isTouch() && window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Game loop (starts once the farm has loaded and the canvas exists) ─────
  const hasWorld = W.ready && !!W.world;
  useEffect(() => {
    if (!hasWorld) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0, last = performance.now(), lastSend = 0, lastTargetKey = "";

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width  = Math.round(canvas.clientWidth  * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);
    if (window.__ARCADE_DEBUG__) window.__ARCADE_DEBUG__.farm = { me: meRef.current, pos: posCache, target: currentTarget };

    function frame(nowMs) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      const L = live.current, world = L.world;
      if (!world || L.inRun) return;                     // out on a run: the farm waits behind it
      const me = meRef.current, partner = partnerRef.current;
      const worldNow = L.W.now();
      const tSec = worldNow / 1000;

      if (world.dayTime !== lastTickRef.current.dayTime) lastTickRef.current = { dayTime: world.dayTime, at: nowMs };
      const tickFrac = Math.min(1.2, (nowMs - lastTickRef.current.at) / 1000);

      // ── Move me ───────────────────────────────────────────────────────────
      const k = keysRef.current, st = stickRef.current;
      let dx = 0, dy = 0;
      if (st.active) { dx = st.x; dy = st.y; }
      else { dx = (k.right ? 1 : 0) - (k.left ? 1 : 0); dy = (k.down ? 1 : 0) - (k.up ? 1 : 0); }
      let mag = Math.hypot(dx, dy);
      if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }
      const t0 = currentTarget.current;
      const offering = actionRef.current.held && t0?.kind === "visitor";
      const speed = (offering ? SNEAK : WALK) * mag;
      if (mag > 0.05) {
        me.x = Math.max(18, Math.min(WORLD_W - 18, me.x + (dx / (mag || 1)) * speed * dt));
        me.y = Math.max(MAP.wildEdge + 14, Math.min(WORLD_H - 12, me.y + (dy / (mag || 1)) * speed * dt));
        if (Math.abs(dx) > 0.15) me.face = dx > 0 ? 1 : -1;
      }
      me.moving = mag > 0.05;
      me.speed = me.moving ? speed : 0;

      // ── Partner smoothing ────────────────────────────────────────────────
      const partnerHere = !L.solo && partner.seen && nowMs - partner.at < 4000;
      if (partnerHere) {
        const a = 1 - Math.exp(-dt * 14);
        partner.x += (partner.tx - partner.x) * a;
        partner.y += (partner.ty - partner.y) * a;
      }

      // ── Send my position ─────────────────────────────────────────────────
      if (!L.solo && nowMs - lastSend > SEND_MS) {
        L.net.send("pos", { x: Math.round(me.x), y: Math.round(me.y), f: me.face, m: me.moving ? 1 : 0 }, { volatile: true });
        lastSend = nowMs;
      }

      // ── Where everything is this frame ───────────────────────────────────
      const people = { [L.myId]: me };
      if (partnerHere && L.partnerId) people[L.partnerId] = partner;
      const cache = {};
      const drawables = [];

      for (const c of Object.values(world.creatures)) {
        const leader = c.follow ? people[c.follow] : null;
        let pos;
        if (leader) {
          const f = followRef.current[c.id] || (followRef.current[c.id] = { x: leader.x - 30, y: leader.y + 6, face: 1, moving: false });
          const gx = leader.x - leader.face * 32, gy = leader.y + 8;
          const ddx = gx - f.x, ddy = gy - f.y, dist = Math.hypot(ddx, ddy);
          f.moving = dist > 6;
          if (dist > 4) { const step = Math.min(dist, Math.max(WALK * 1.05, dist * 3) * dt); f.x += (ddx / dist) * step; f.y += (ddy / dist) * step; }
          if (Math.abs(ddx) > 2) f.face = ddx > 0 ? 1 : -1;
          pos = { x: f.x, y: f.y, face: f.face, moving: f.moving };
        } else {
          delete followRef.current[c.id];
          const p = penPos(c, tSec);
          pos = { ...p, moving: false };
        }
        cache[c.id] = pos;
        drawables.push({ y: pos.y, kind: "creature", c, pos });
      }
      for (const v of world.visitors) {
        const p = visitorPos(v, v.age + tickFrac);
        cache[v.id] = p;
        drawables.push({ y: p.y, kind: "visitor", v, pos: p });
      }
      drawables.push({ y: me.y, kind: "farmer", who: L.myId, p: me });
      if (partnerHere) drawables.push({ y: partner.y, kind: "farmer", who: L.partnerId, p: partner });
      posCache.current = cache;

      // ── What's in reach? visitor > creature > plot > your own follower ───
      // (your follower is always right beside you, so it only counts when
      //  nothing else is in reach — otherwise you could never plant)
      let best = null, bestD = REACH;
      for (const v of world.visitors) { const p = cache[v.id]; const d = Math.hypot(p.x - me.x, p.y - me.y); if (d < bestD + 10) { best = { kind: "visitor", id: v.id }; bestD = d - 10; } }
      if (!best) for (const c of Object.values(world.creatures)) { if (c.follow === L.myId) continue; const p = cache[c.id]; const d = Math.hypot(p.x - me.x, p.y - me.y); if (d < bestD) { best = { kind: "creature", id: c.id }; bestD = d; } }
      if (!best && Math.hypot(MAP.sign.x - me.x, MAP.sign.y - 18 - me.y) < REACH + 10) best = { kind: "sign" };
      if (!best) for (let i = 0; i < PLOT_COUNT; i++) { const r = plotRect(i); const d = Math.hypot(r.cx - me.x, r.cy - me.y); if (d < bestD + 8) { best = { kind: "plot", i }; bestD = d - 8; } }
      if (!best) for (const c of Object.values(world.creatures)) { if (c.follow !== L.myId) continue; const p = cache[c.id]; if (Math.hypot(p.x - me.x, p.y - me.y) < REACH) best = { kind: "creature", id: c.id }; }
      currentTarget.current = best;
      const key = best ? `${best.kind}:${best.id ?? best.i}` : "";
      if (key !== lastTargetKey) { lastTargetKey = key; setTarget(best); }

      // ── Befriending (hold) ───────────────────────────────────────────────
      const act = actionRef.current;
      if (act.held && best?.kind === "visitor") {
        act.acc += dt;
        if (act.acc >= OFFER_EVERY) { L.W.dispatch({ type: "offer", vid: best.id, s: Math.round(act.acc * 100) / 100 }); act.acc = 0; }
      } else if (act.held) {
        act.acc = 0;
      }

      // ── Rushing at visitors spooks them ──────────────────────────────────
      if (me.speed > SPOOK_SPEED && !offering) {
        for (const v of world.visitors) {
          const p = cache[v.id];
          if (Math.hypot(p.x - me.x, p.y - me.y) < SPOOK_RADIUS && v.trust > 0 && nowMs - (spookRef.current[v.id] || 0) > 2000) {
            spookRef.current[v.id] = nowMs;
            L.W.dispatch({ type: "spook", vid: v.id });
          }
        }
      }

      // ── Draw ─────────────────────────────────────────────────────────────
      const cw = canvas.width, ch = canvas.height;
      // Wide screen: fit the farm above the seed bar so nothing hides under it.
      const dprNow = cw / (canvas.clientWidth || cw);
      const seedStrip = 92 * dprNow, topStrip = 80 * dprNow;      // keep clear of the seed bar + top chips
      let scale = Math.min(cw / WORLD_W, (ch - seedStrip - topStrip) / WORLD_H);
      let ox = (cw - WORLD_W * scale) / 2, oy = topStrip + Math.max(0, (ch - seedStrip - topStrip - WORLD_H * scale) / 2);
      if (ch < 520 * dprNow && ch <= cw * 1.15) {
        // Short landscape (phone on its side): zoom in to fill the height and
        // let the camera follow you up/down, so the bars never hide where you are.
        scale = ch / (WORLD_H * 0.8);
        const worldW = WORLD_W * scale, worldH = WORLD_H * scale;
        ox = worldW <= cw ? (cw - worldW) / 2 : Math.max(cw - worldW, Math.min(0, cw / 2 - me.x * scale));
        oy = Math.max(ch - worldH - seedStrip, Math.min(topStrip, ch / 2 - me.y * scale));   // can scroll past the edges so the bars never cover the farm's edge
      } else if (ch > cw * 1.15) {
        // Tall (portrait) screen: zoom the farm to fill the space between the
        // top bar and the controls, and scroll sideways to follow you.
        const dpr = cw / (canvas.clientWidth || cw);
        const top = 150 * dpr, bottom = 240 * dpr;
        const band = Math.max(ch * 0.4, ch - top - bottom);
        scale = band / WORLD_H;
        oy = top + (band - WORLD_H * scale) / 2;
        const worldPx = WORLD_W * scale;
        ox = Math.max(cw - worldPx, Math.min(0, cw / 2 - me.x * scale));
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;   // always start a frame fully opaque, so a hiccup can never leave the farm faded
      ctx.fillStyle = "#1d3b22";
      ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);

      drawMap(ctx, world, worldNow, tSec);

      // highlight target
      if (best?.kind === "plot") {
        const r = plotRect(best.i);
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8); ctx.stroke();
      } else if (best?.kind === "sign") {
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(MAP.sign.x, MAP.sign.y, 24, 8, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (best && cache[best.id]) {
        const p = cache[best.id];
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
      }

      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) {
        if (d.kind === "farmer") {
          drawFarmer(ctx, d.p.x, d.p.y, L.colorOf(d.who), d.p.face, tSec, d.p.moving, d.who === L.myId ? "you" : L.nameOf(d.who));
        } else if (d.kind === "creature") {
          const c = d.c;
          drawCreature(ctx, d.pos.x, d.pos.y, c.species, c.traits, { face: d.pos.face, t: tSec, moving: d.pos.moving, scale: CREATURE_SCALE });
          // owner heart + hunger warning
          if (c.owner) drawHeart(ctx, d.pos.x + 15, d.pos.y - 10, 9, L.colorOf(c.owner));
          if (c.hunger < 25) drawBowl(ctx, d.pos.x, d.pos.y - 46 + Math.sin(tSec * 4) * 2, 16);
          if (best?.id === c.id) {
            drawBar(ctx, d.pos.x, d.pos.y - 56, c.hunger / 100, "#ffb347");
            drawBar(ctx, d.pos.x, d.pos.y - 48, c.happy / 100, "#ff7ac8");
          }
        } else if (d.kind === "visitor") {
          const v = d.v;
          drawCreature(ctx, d.pos.x, d.pos.y, v.species, v.traits, { face: d.pos.face, t: tSec, moving: v.age + tickFrac < 5, scale: CREATURE_SCALE, alpha: 0.95 });
          drawQuestion(ctx, d.pos.x, d.pos.y - 48 + Math.sin(tSec * 3) * 2, 18);
          if (v.trust > 0) drawBar(ctx, d.pos.x, d.pos.y - 58, v.trust / 100, "#ff9ad5", 40);
          if (VISITOR_WARN(v)) { ctx.font = "bold 10px system-ui, sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText("leaving soon!", d.pos.x, d.pos.y + 14); }
        }
      }

      // hearts drifting toward the visitor while offering
      // (the visitor can be befriended mid-frame and vanish, so check it's still here)
      const heartTarget = offering && best?.kind === "visitor" ? cache[best.id] : null;
      if (heartTarget) {
        const p = heartTarget;
        for (let i = 0; i < 3; i++) {
          const k2 = ((tSec * 1.4 + i / 3) % 1);
          ctx.globalAlpha = 1 - k2;
          drawHeart(ctx, me.x + (p.x - me.x) * k2, me.y - 30 + (p.y - me.y) * k2 - Math.sin(k2 * Math.PI) * 14, 12, "#ff7ac8");
        }
        ctx.globalAlpha = 1;
      }

      // prompt bubble over me
      const prompt = promptFor(best, world, worldNow, L.seed, offering);
      if (prompt) {
        ctx.font = "bold 12px system-ui, sans-serif";
        const w2 = ctx.measureText(prompt).width + 16;
        const bx = Math.max(w2 / 2 + 4, Math.min(WORLD_W - w2 / 2 - 4, me.x)), by = me.y - 62;
        ctx.fillStyle = "rgba(15,12,30,0.8)";
        ctx.beginPath(); ctx.roundRect(bx - w2 / 2, by - 15, w2, 22, 8); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.fillText(prompt, bx, by);
      }
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [hasWorld]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!W.ready || !W.world) {
    return (
      <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, background: "#1d3b22", fontFamily: "system-ui, sans-serif" }}>
        waking up the farm…
      </main>
    );
  }

  const world = W.world;
  const needsStarter = myId && !world.starters[myId];
  const dayLeft = Math.max(0, DAY_LEN - world.dayTime);
  const targetCreature = target?.kind === "creature" ? world.creatures[target.id] : null;
  const actionLabel = buttonLabel(target, world, W.now(), seed);

  return (
    <div style={{ position: "relative", height: "100svh", overflow: "hidden", background: "#1d3b22", touchAction: "none", ...noSelect, fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", ...noSelect }} />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 46, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", zIndex: 20, pointerEvents: "none", fontSize: 13, fontWeight: 700 }}>
        <Chip><Icon draw={drawSun} /> Day {world.day} · {Math.floor(dayLeft / 60)}:{String(Math.floor(dayLeft % 60)).padStart(2, "0")} left</Chip>
        <Chip>{Object.keys(world.food).map(k => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginRight: 8 }}><CropIcon kind={k} /> {world.food[k]}</span>
        ))}</Chip>
        <Chip color={solo ? C.dim : C.good}><Dot color={solo ? C.dim : C.good} /> {solo ? "playing solo" : `${nameOf(partnerId)} is here`}</Chip>
        {W.saveState === "error" && <Chip color={C.bad}>save failed, retrying</Chip>}
      </div>

      <button onClick={onLeave} style={{ ...smallBtn, position: "absolute", top: 10, left: 10, zIndex: 25 }}>← rooms</button>
      <button onClick={() => setRoster(true)} style={{ ...smallBtn, position: "absolute", top: 10, right: 10, zIndex: 25, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}><Icon draw={drawPaw} size={20} /> {Object.keys(world.creatures).length}</button>

      {/* Toasts */}
      <div style={{ position: "absolute", top: 84, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 30, pointerEvents: "none" }}>
        {toasts.map(tst => (
          <div key={tst.id} style={{
            padding: "8px 14px", borderRadius: 12, fontWeight: 800, fontSize: tst.kind === "catch" ? 16 : 13,
            background: tst.kind === "catch" ? "rgba(255,204,77,0.95)" : "rgba(15,12,30,0.85)",
            color: tst.kind === "catch" ? "#2a1d00" : C.text, boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          }}>{tst.text}</div>
        ))}
      </div>

      {/* Seed bar */}
      <div style={{ position: "absolute", bottom: portrait ? 172 : 22, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 20 }}>
        {SEEDS.map((id, i) => (
          <button key={id} onClick={() => setSeed(id)} style={{
            padding: "6px 9px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", color: C.text,
            background: seed === id ? "rgba(255,204,77,0.25)" : "rgba(15,12,30,0.65)",
            border: `2px solid ${seed === id ? C.accent : "rgba(255,255,255,0.15)"}`,
            display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56,
          }}>
            <CropIcon kind={id} size={26} />
            <span style={{ fontSize: 10, color: CROPS[id].type === "lure" ? "#ffb3e6" : "#c8f59a" }}>
              {!isTouch() && `${i + 1} · `}{CROPS[id].type}
            </span>
          </button>
        ))}
      </div>

      {!isTouch() && (
        <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 11, zIndex: 5, pointerEvents: "none" }}>
          WASD move · E action (hold to befriend) · Q pet · R creatures · 1–4 seeds
        </div>
      )}

      <TouchControls stickRef={stickRef} onAction={pressAction} onActionEnd={releaseAction} onPet={doPet}
        actionLabel={actionLabel} showPet={!!targetCreature} />

      {partnerRun && !myRun && (
        <div style={{ position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)", zIndex: 35, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 14px", borderRadius: 14, background: "rgba(15,12,30,0.9)", border: `1px solid ${C.accent2}`, color: C.text, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
          {cap(nameOf(partnerId))} is on a {RUNS.find(r => r.id === partnerRun.kind)?.name ?? "run"} run
          <button onClick={joinRun} style={{ ...smallBtn, background: C.accent2, color: "#06202a", border: "none" }}>Join</button>
          <button onClick={() => setPartnerRun(null)} style={{ ...smallBtn, padding: "7px 9px" }} aria-label="dismiss">x</button>
        </div>
      )}

      {board && (
        <RunBoard leader={myLeader()} partnerRun={partnerRun} partnerName={cap(nameOf(partnerId))}
          onStart={startRun} onJoin={joinRun} onClose={() => setBoard(false)} canAct={W.canAct} />
      )}

      {myRun?.kind === "stampede" && (() => {
        const leader = myLeader();
        return leader && (
          <StampedeRun net={net} runHost={myRun.host} species={leader.species} hue={leader.traits.hue}
            onAdopt={(c) => W.dispatch({ type: "adopt", species: c.species, hue: c.hue, size: c.size, r: Math.random() })}
            onExit={exitRun} />
        );
      })()}

      {roster && (
        <Roster world={world} myId={myId} colorOf={colorOf} nameOf={nameOf}
          onFollow={(cid) => W.dispatch({ type: "follow", cid })} onClose={() => setRoster(false)} canAct={W.canAct} />
      )}

      {needsStarter && (
        <StarterPicker taken={world.starters} onPick={(species) => W.dispatch({ type: "choose_starter", species, r: Math.random() })} canAct={W.canAct} />
      )}
    </div>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────
const VISITOR_WARN = (v) => v.age > 120;

function promptFor(t, world, now, seed, offering) {
  if (!t) return null;
  if (t.kind === "sign") return "Go on a run";
  if (t.kind === "plot") {
    const crop = world.plots[t.i];
    if (!crop) return `Plant ${CROPS[seed].name}`;
    const g = growth(crop, now);
    if (g < 1) return `${CROPS[crop.kind].name} ready in ${Math.ceil((1 - g) * CROPS[crop.kind].grow / 1000)}s`;
    return CROPS[crop.kind].type === "food" ? `Harvest ${CROPS[crop.kind].name}` : "Luring... something will come";
  }
  if (t.kind === "visitor") {
    const v = world.visitors.find(x => x.id === t.id);
    if (!v) return null;
    const sp = SPECIES[v.species];
    const has = (world.food[sp.food] || 0) > 0;
    if (offering) return `Befriending… ${Math.floor(v.trust)}%`;
    return `Hold to befriend · loves ${CROPS[sp.food].name}${has ? "" : " (you have none, slower)"}`;
  }
  if (t.kind === "creature") {
    const c = world.creatures[t.id];
    if (!c) return null;
    const anyFood = Object.values(world.food).some(n => n > 0);
    const feed = c.hunger >= FEED_BELOW ? "not hungry" : anyFood ? "Feed" : "no food!";
    return `${c.name} · ${feed} · Pet`;
  }
  return null;
}

function buttonLabel(t, world, now, seed) {
  if (!t) return "";
  if (t.kind === "sign") return "RUNS";
  if (t.kind === "plot") {
    const crop = world.plots[t.i];
    if (!crop) return "PLANT";
    return CROPS[crop.kind].type === "food" && growth(crop, now) >= 1 ? "HARVEST" : "";
  }
  if (t.kind === "visitor") return "HOLD";
  if (t.kind === "creature") return world.creatures[t.id]?.hunger < FEED_BELOW ? "FEED" : "";
  return "";
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ── Run board (the signpost) ──────────────────────────────────────────────────
function RunBoard({ leader, partnerRun, partnerName, onStart, onJoin, onClose, canAct }) {
  const sp = leader && SPECIES[leader.species];
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...panelStyle, maxWidth: 480, maxHeight: "calc(100svh - 24px)", overflowY: "auto", alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Runs</div>
          <button onClick={onClose} style={smallBtn}>close</button>
        </div>
        {leader ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.dim }}>
            <Portrait species={leader.species} traits={leader.traits} size={48} />
            <span>You'll head out as <b style={{ color: C.text }}>{leader.name} the {sp.name}</b>. Make a different creature follow you (paw menu) to switch.</span>
          </div>
        ) : (
          <div style={{ color: C.bad, fontSize: 13 }}>Pick your first creature before heading out.</div>
        )}
        {partnerRun && (
          <button disabled={!leader || !canAct} onClick={onJoin} style={{ ...smallBtn, padding: 12, background: C.accent2, color: "#06202a", border: "none", fontSize: 15 }}>
            Join {partnerName}'s {RUNS.find(r => r.id === partnerRun.kind)?.name ?? ""} run
          </button>
        )}
        {RUNS.map(r => (
          <div key={r.id} style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", opacity: r.ready ? 1 : 0.45, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{r.name}</span>
              {r.ready
                ? <button disabled={!leader || !canAct} onClick={() => onStart(r.id)} style={{ ...smallBtn, background: C.accent, color: "#1a1300", border: "none" }}>Head out</button>
                : <span style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>SOON</span>}
            </div>
            <span style={{ fontSize: 12, color: C.dim }}>{r.desc}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: C.faint }}>The farm keeps going while you're out. Your partner gets a Join button.</div>
      </div>
    </div>
  );
}

// ── Starter picker ────────────────────────────────────────────────────────────
function StarterPicker({ onPick, canAct }) {
  const starters = Object.keys(SPECIES).filter(k => SPECIES[k].starter);
  return (
    <div style={overlayStyle}>
      <div style={{ ...panelStyle, maxWidth: 560 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim }}>welcome to the farm</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Pick your first creature</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {starters.map(id => {
            const sp = SPECIES[id];
            return (
              <button key={id} disabled={!canAct} onClick={() => onPick(id)} style={{
                width: 150, padding: 12, borderRadius: 16, cursor: canAct ? "pointer" : "default", fontFamily: "inherit", color: C.text,
                background: "rgba(255,255,255,0.05)", border: `2px solid hsl(${sp.hue}, 60%, 55%)`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <Portrait species={id} traits={{ hue: sp.hue, size: 1, personality: "bold" }} size={96} />
                <span style={{ fontWeight: 800, fontSize: 16 }}>{sp.name}</span>
                <span style={{ fontSize: 12, color: C.dim, display: "flex", alignItems: "center", gap: 4 }}>{sp.element} · loves <CropIcon kind={sp.food} size={16} /></span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: C.faint }}>it'll follow you around and bond with you</div>
      </div>
    </div>
  );
}

// ── Roster ────────────────────────────────────────────────────────────────────
function Roster({ world, myId, colorOf, nameOf, onFollow, onClose, canAct }) {
  const list = Object.values(world.creatures).sort((a, b) => {
    const am = a.owner === myId ? 0 : 1, bm = b.owner === myId ? 0 : 1;
    return am - bm || (a.born || 0) - (b.born || 0);
  });
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...panelStyle, maxWidth: 520, maxHeight: "80svh", overflowY: "auto", alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}><Icon draw={drawPaw} size={22} /> Creatures ({list.length})</div>
          <button onClick={onClose} style={smallBtn}>close</button>
        </div>
        {list.length === 0 && <div style={{ color: C.dim }}>No creatures yet. Plant a lure crop (Sweetroot or Glowcap) to attract one!</div>}
        {list.map(c => {
          const sp = SPECIES[c.species];
          const mine = c.owner === myId;
          const canFollow = mine || (c.bond[myId] || 0) >= FOLLOW_BOND;
          const following = c.follow === myId;
          return (
            <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${mine ? colorOf(myId) : "rgba(255,255,255,0.08)"}` }}>
              <Portrait species={c.species} traits={c.traits} size={64} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 800 }}>
                  {c.name} <span style={{ color: C.dim, fontWeight: 600, fontSize: 12 }}>the {sp.name} · {c.traits.personality}</span>
                </div>
                <div style={{ fontSize: 11, color: C.faint, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>{PERSONALITIES[c.traits.personality]} · loves <CropIcon kind={sp.food} size={14} /> · {mine ? "yours" : `${nameOf(c.owner)}'s`}</div>
                <Meter label="food" value={c.hunger} color="#ffb347" />
                <Meter label="happy" value={c.happy} color="#ff7ac8" />
                <div style={{ fontSize: 11, display: "flex", gap: 10 }}>
                  {Object.entries(c.bond).map(([uid, b]) => (
                    <span key={uid} style={{ color: colorOf(uid), display: "inline-flex", alignItems: "center", gap: 3 }}><Icon draw={(ctx, s) => drawHeart(ctx, s / 2, s / 2, s, colorOf(uid))} size={12} deps={[uid]} /> {nameOf(uid)} {Math.round(b)}</span>
                  ))}
                </div>
              </div>
              <button disabled={!canFollow || !canAct} onClick={() => onFollow(c.id)} title={canFollow ? "" : `needs ${FOLLOW_BOND} bond with you`} style={{
                ...smallBtn, opacity: canFollow ? 1 : 0.35, minWidth: 82,
                background: following ? "rgba(126,224,129,0.2)" : smallBtn.background,
              }}>
                {following ? "Back to pen" : "Walk with me"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Meter({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.dim }}>
      <span style={{ width: 34 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.4)" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", borderRadius: 3, background: value < 25 ? C.bad : color }} />
      </div>
    </div>
  );
}

// Small static drawing of a creature
function Portrait({ species, traits, size = 64 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const s = size / 48;
    ctx.save();
    ctx.translate(size / 2, size * 0.86);
    ctx.scale(s, s);
    drawCreature(ctx, 0, 0, species, traits, { face: 1, t: 1 });
    ctx.restore();
  }, [species, traits, size]);
  return <canvas ref={ref} style={{ width: size, height: size, flexShrink: 0 }} />;
}

// ── Touch controls ────────────────────────────────────────────────────────────
function TouchControls({ stickRef, onAction, onActionEnd, onPet, actionLabel, showPet }) {
  const zoneRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const R = 56;
  if (!isTouch()) return null;

  const setFromEvent = (e) => {
    const r = zoneRef.current.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / R, dy = (e.clientY - (r.top + r.height / 2)) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    const dead = m < 0.18;
    stickRef.current = { x: dead ? 0 : dx, y: dead ? 0 : dy, active: true };
    setKnob({ x: dx * R, y: dy * R, on: true });
  };
  const end = () => { stickRef.current = { x: 0, y: 0, active: false }; setKnob({ x: 0, y: 0, on: false }); };

  const btn = (size, accent) => ({
    width: size, height: size, borderRadius: "50%", touchAction: "none", WebkitTapHighlightColor: "transparent",
    display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
    fontWeight: 800, fontSize: 12, lineHeight: 1.1, padding: 4, boxSizing: "border-box",
    background: accent ? "rgba(255,204,77,0.22)" : "rgba(245,230,200,0.14)",
    border: `2px solid ${accent ? "rgba(255,204,77,0.6)" : "rgba(245,230,200,0.3)"}`,
    color: accent ? C.accent : "rgba(245,230,200,0.85)",
  });

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 22, pointerEvents: "none", display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 18px calc(18px + env(safe-area-inset-bottom, 0px))", ...noSelect }}>
      <div
        ref={zoneRef}
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); setFromEvent(e); }}
        onPointerMove={(e) => { if (knob.on || e.buttons) setFromEvent(e); }}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
        style={{ pointerEvents: "auto", width: R * 2, height: R * 2, borderRadius: "50%", position: "relative", touchAction: "none", background: "rgba(245,230,200,0.08)", border: "2px solid rgba(245,230,200,0.2)" }}
      >
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, borderRadius: "50%", background: knob.on ? "rgba(245,230,200,0.4)" : "rgba(245,230,200,0.22)", transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", pointerEvents: "auto" }}>
        {showPet && (
          <div style={btn(60, false)}
            onPointerDown={(e) => { e.preventDefault(); onPet(); }} onContextMenu={e => e.preventDefault()}>
            PET
          </div>
        )}
        <div style={{ ...btn(88, true), opacity: actionLabel ? 1 : 0.4 }}
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); onAction(); }}
          onPointerUp={onActionEnd} onPointerCancel={onActionEnd} onLostPointerCapture={onActionEnd}
          onContextMenu={e => e.preventDefault()}>
          {actionLabel || "ACTION"}
        </div>
      </div>
    </div>
  );
}

// ── Icons (drawn with code, no emojis) ───────────────────────────────────────
// draw(ctx, size) — or pass one of the drawFarm sprite functions, which take (ctx, cx, cy, size)
function Icon({ draw, size = 18, deps = [] }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (draw.length >= 4) draw(ctx, size / 2, size / 2, size);   // sprite fn (ctx, cx, cy, size)
    else draw(ctx, size);
  }, [draw, size, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} />;
}
function CropIcon({ kind, size = 18 }) {
  return <Icon draw={(ctx, s) => drawCropSprite(ctx, kind, s / 2, s / 2, s, 1)} size={size} deps={[kind]} />;
}
function Dot({ color }) {
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: color, verticalAlign: "middle" }} />;
}

// ── Little UI bits ────────────────────────────────────────────────────────────
const noSelect = {
  userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent",
};
function Chip({ children, color = C.text }) {
  return <span style={{ padding: "5px 10px", borderRadius: 999, background: "rgba(15,12,30,0.7)", border: "1px solid rgba(255,255,255,0.12)", color, display: "inline-flex", alignItems: "center", gap: 5 }}>{children}</span>;
}
const smallBtn = {
  padding: "7px 11px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
  background: "rgba(15,12,30,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: C.text,
};
const overlayStyle = {
  position: "absolute", inset: 0, zIndex: 60, background: "rgba(5,4,12,0.72)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const panelStyle = {
  width: "100%", background: "#1a1630", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18,
  padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: C.text, textAlign: "left",
  boxSizing: "border-box",
};