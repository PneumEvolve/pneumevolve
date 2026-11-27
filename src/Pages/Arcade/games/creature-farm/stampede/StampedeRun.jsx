// src/Pages/Arcade/games/creature-farm/stampede/StampedeRun.jsx
//
// Critter Stampede — a run you start from the signpost on the farm.
// You play as your bonded creature on an endless field. Run one circle around
// wild critters to tame them (everything inside your loop comes along); they
// join your herd and swarm the goop. Hurt herd members rest at your side until
// they heal. Grab berries to heal. Survive the level (3 / 7 / 10 min) to win.
// When the XP bar fills, the game pauses for both players to pick an upgrade.
// When the run ends, pick critters from your herd to bring home to the pen
// (2 on Easy, 3 on Medium/Hard — and on Hard every golden one comes home too).
//
// Props (from CreatureFarm):
//   net          the room socket (shared with the farm)
//   runHost      true on the device that started the run — it runs the simulation
//   level        "easy" | "medium" | "hard"
//   species, hue your leader (the creature following you, or your starter)
//   partnerName  for the "Bash is choosing…" line
//   onAdopt({ species, hue, size, rare })   bring a tamed critter home
//   onWin(level) you survived — unlocks the next level on the farm
//   onLoot({ level, won, coins, goods, egg })   the run's rewards (run host only, once)
//
// Herd abilities: every species in your herd gives a button (keys 1-7). Pressing
// it makes all of that species act together (see HERD_ABILITIES in the sim).
// Your herd also makes its goods while you run; coins come from flattened goop.
//   onExit()     back to the farm
//
// Netcode (only while in a run):
//   guest → host  me    { x, y, f, sp, hue }   ~20/s volatile
//   guest → host  tame  { cids } · pick { id } · again {}   reliable
//   host → guest  snap  {...} ~10/s volatile · hurt { kx, ky } · restart {}
//   (run_go / run_end / run_join are handled by CreatureFarm)
//
// Special goop (splitter, spitter, snatcher), swarm rings and the Goop King come
// from the sim; this file draws them, the boss health bar, alert banners and
// the darkness on Hard.
//
// Controls: joystick (touch) or WASD / arrows. Attacks are automatic.
// No emojis: everything is drawn in code.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useArcadeEvent } from "../../../net/useArcadeRoom";
import { useArcadeSave } from "../../../net/useArcadeSave";
import { C } from "../../../ui";
import { SPECIES } from "../species";
import { drawCreature, drawPaw, drawHeart, drawCropSprite } from "../drawFarm";
import {
  T, LEVELS, CARDS, SPECIES_IDS, createRun, addPlayer, stepRun, setLeaderPos, tryTame,
  makeSnapshot, readSnapshotPlayers, lassoStep, choosePick, xpNeed, herdCapOf, GOOP_KINDS, BOSS,
  castHerdAbility, HERD_ABILITIES, lootOf, REWARD, GOODS_EVERY, addCrew,
} from "./stampedeSim";
import { ITEMS } from "../ranch";
import { ItemIcon, EggIcon } from "../RanchPanel";
import { RARITY_INFO } from "../eggs";
import {
  drawGround, drawGoop, drawLeaderRing, drawHerdDot, drawWildSparkle, drawTrail,
  drawLasso, drawFx, drawEdgeArrow, drawDowned, drawSlamWarning, drawShot, drawGrabbed, drawDarkness,
} from "./drawStampede";

const SLOT_COLORS = [C.accent, C.accent2];
const SPAWN = [{ x: 0, y: 0 }, { x: 80, y: 0 }];
const isTouch = () => typeof window !== "undefined" && "ontouchstart" in window;
const KEYMAP = {
  ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
};
const isEnd = (st) => st === "over" || st === "won";
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

//   crews     { 0: [...], 1: [...] } farm creatures each player brings (host's slot 0)
//   onCrewGo(cids)  the run host marks the crew as out on a run (farm side)
export default function StampedeRun({ net, runHost, level = "easy", species, hue, partnerName, pens = 5, crews = {}, onCrewGo, onAdopt, onWin, onLoot, onExit }) {
  const mySlot = runHost ? 0 : 1;
  const otherSlot = 1 - mySlot;
  const LV = LEVELS[level] || LEVELS.easy;
  // Best scores (per level) live with your Creature Farm save.
  const { data: save, update } = useArcadeSave("creature-farm", { stampedeBest: {} });

  const [hud, setHud] = useState({ t: 0, hp: 100, maxHp: 100, herd: 0, cap: LV.herdCap, kills: 0, tamed: 0, down: false, st: "play", started: false, players: [], myHerd: [], xp: [0, 1, 0], pick: null });
  const [adopted, setAdopted] = useState([]);       // ids of critters already sent home this run
  const [chosen, setChosen] = useState([]);         // ids picked to bring home, not sent yet (tap again to change your mind)
  const [myPick, setMyPick] = useState(null);       // card I just tapped (before the host confirms)

  const live = useRef({});
  live.current = { net, runHost, mySlot, otherSlot, species, hue, level, pens, crews, onCrewGo };

  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const stickRef = useRef({ x: 0, y: 0, active: false });
  const meRef = useRef({ ...SPAWN[mySlot], face: 1, moving: false, kx: 0, ky: 0, hurtAt: -9 });
  const trailRef = useRef({ 0: [], 1: [] });
  const lassoRef = useRef(null);
  const pendingTame = useRef(new Map());

  const runRef = useRef(null);
  const freshView = () => ({ t: 0, st: "play", players: [null, null], critters: new Map(), baddies: new Map(), items: [], shots: [], fx: [], got: false, xp: [0, 1, 0], pk: null, al: null, bk: [0, 0] });
  const viewRef = useRef(freshView());
  const partnerRef = useRef(null);                 // { species, hue } of the run guest
  const recordedRef = useRef(false);

  // ── Host: start the run ────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    const L = live.current;
    const run = createRun(Math.floor(Math.random() * 1e9), L.level, L.pens);
    addPlayer(run, 0, L.species, SPAWN[0].x, SPAWN[0].y, L.hue);
    addCrew(run, 0, L.crews[0]);
    if (partnerRef.current) { addPlayer(run, 1, partnerRef.current.species, SPAWN[1].x, SPAWN[1].y, partnerRef.current.hue); addCrew(run, 1, L.crews[1]); }
    L.onCrewGo?.([...(L.crews[0] || []), ...(partnerRef.current ? L.crews[1] || [] : [])].map(m => m.cid));
    runRef.current = run;
    meRef.current = { ...SPAWN[0], face: 1, moving: false, kx: 0, ky: 0, hurtAt: -9 };
    lassoRef.current = null;
    trailRef.current = { 0: [], 1: [] };
    recordedRef.current = false;
    setAdopted([]); setChosen([]); setMyPick(null);
  }, []);

  useEffect(() => { if (runHost && !runRef.current) startRun(); }, [runHost, startRun]);

  const restart = useCallback(() => {
    const L = live.current;
    if (L.runHost) { startRun(); L.net.send("restart"); }
    else L.net.send("again");
  }, [startRun]);

  const applyHurt = useCallback((kx, ky) => {
    const me = meRef.current;
    me.kx += kx; me.ky += ky; me.hurtAt = performance.now();   // getting hit no longer breaks your lasso
  }, []);

  // ── Network ────────────────────────────────────────────────────────────────
  useArcadeEvent(net, "me", (m) => {
    const L = live.current, run = runRef.current;
    if (!L.runHost || !run) return;
    const sp = SPECIES_IDS[m.sp];
    if (!sp) return;
    partnerRef.current = { species: sp, hue: m.hue };
    if (!run.players[1] || run.players[1].species !== sp || run.players[1].hue !== m.hue) {
      const fresh = !run.players[1];
      addPlayer(run, 1, sp, m.x, m.y, m.hue);
      if (fresh) { addCrew(run, 1, L.crews[1]); L.onCrewGo?.((L.crews[1] || []).map(c => c.cid)); }   // partner joined: their crew comes too
    }
    setLeaderPos(run, 1, m.x, m.y);
    run.players[1].face = m.f;
  });
  useArcadeEvent(net, "tame", (m) => {
    if (!live.current.runHost || !runRef.current) return;
    for (const cid of (m.cids || [m.cid])) tryTame(runRef.current, 1, cid);
  });
  useArcadeEvent(net, "ab", (m) => { if (live.current.runHost && runRef.current) castHerdAbility(runRef.current, 1, m.sp); });
  useArcadeEvent(net, "pick", (m) => { if (live.current.runHost && runRef.current) choosePick(runRef.current, 1, m.id); });
  useArcadeEvent(net, "again", () => { if (live.current.runHost && isEnd(runRef.current?.state)) restart(); });
  useArcadeEvent(net, "hurt", (m) => { if (!live.current.runHost) applyHurt(m.kx, m.ky); });
  useArcadeEvent(net, "restart", () => {
    if (live.current.runHost) return;
    meRef.current = { ...SPAWN[1], face: 1, moving: false, kx: 0, ky: 0, hurtAt: -9 };
    lassoRef.current = null; trailRef.current = { 0: [], 1: [] }; recordedRef.current = false;
    viewRef.current = freshView();
    setAdopted([]); setChosen([]); setMyPick(null);
  });
  useArcadeEvent(net, "snap", (m) => {
    if (live.current.runHost) return;
    const v = viewRef.current;
    v.ab = m.ab || v.ab; v.loot = m.loot || v.loot;
    v.got = true; v.t = m.t; v.st = m.st; v.xp = m.xp || v.xp; v.pk = m.pk || null; v.al = m.al || null; v.bk = m.bk || v.bk;
    v.shots = (m.s || []).map(a => ({ id: a[0], x: a[1], y: a[2], tx: a[3], ty: a[4], frac: a[5] / 100 }));
    readSnapshotPlayers(m).forEach((p, i) => {
      if (!p) { v.players[i] = null; return; }
      const old = v.players[i];
      v.players[i] = { ...p, x: old ? old.x : p.x, y: old ? old.y : p.y, tx: p.x, ty: p.y };
    });
    const seenC = new Set();
    for (const a of m.c || []) {
      const id = a[0]; seenC.add(id);
      const e = v.critters.get(id);
      const base = { id, species: SPECIES_IDS[a[1]], tx: a[2], ty: a[3], hue: a[4], size: a[5] / 100, owner: a[6], hpFrac: a[7] / 100, bump: a[8], rest: !!a[9], hit: !!a[10], rare: !!a[11], grabbed: !!a[12], crew: a[13] || 0 };
      if (e) Object.assign(e, base); else v.critters.set(id, { ...base, x: a[2], y: a[3], face: 1 });
    }
    for (const id of [...v.critters.keys()]) if (!seenC.has(id)) v.critters.delete(id);
    const seenB = new Set();
    for (const a of m.b || []) {
      const id = a[0]; seenB.add(id);
      const e = v.baddies.get(id);
      const base = { id, kind: GOOP_KINDS[a[1]] || "goop", tx: a[2], ty: a[3], hpFrac: a[4] / 100, flash: a[5], chargeFrac: (a[6] || 0) / 100, carrying: !!a[7] };
      if (e) Object.assign(e, base); else v.baddies.set(id, { ...base, x: a[2], y: a[3] });
    }
    for (const id of [...v.baddies.keys()]) if (!seenB.has(id)) v.baddies.delete(id);
    v.items = (m.k || []).map(a => ({ id: a[0], x: a[1], y: a[2] }));
    for (const f of m.fx || []) v.fx.push({ ...f, age: 0 });
  });

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (/^[1-7]$/.test(e.key)) { if (!pickRef.current?.(Number(e.key) - 1)) abRef.current?.(Number(e.key) - 1); return; }
      const k = KEYMAP[e.key]; if (k) { e.preventDefault(); keysRef.current[k] = true; }
    };
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

      let players, critters, baddies, berries, fxList, runT, state, xp, pk, shots, alert, bossFlags;
      if (L.runHost) {
        if (!run) return;
        players = run.players; critters = run.critters; baddies = run.baddies; berries = run.items; fxList = run.fx; runT = run.t; state = run.state;
        xp = [Math.floor(run.xp), xpNeed(run.lvl), run.lvl];
        pk = run.pick ? { t: Math.ceil(run.pick.t), o: run.pick.offers, c: run.pick.chosen } : null;
        shots = run.shots.map(sh => ({ ...sh, frac: sh.t / sh.dur }));
        alert = run.alert && run.t < run.alert.until ? run.alert.text : null;
        bossFlags = [run.bossSpawned ? 1 : 0, run.bossDown ? 1 : 0];
      } else {
        const a = 1 - Math.exp(-dt * 12);
        for (const e of view.critters.values()) { const ox = e.x; e.x += (e.tx - e.x) * a; e.y += (e.ty - e.y) * a; if (Math.abs(e.x - ox) > 0.2) e.face = e.x > ox ? 1 : -1; }
        for (const e of view.baddies.values()) { e.x += (e.tx - e.x) * a; e.y += (e.ty - e.y) * a; }
        for (const p of view.players) if (p) { p.x += (p.tx - p.x) * a; p.y += (p.ty - p.y) * a; }
        for (const f of view.fx) f.age += dt;
        view.fx = view.fx.filter(f => f.age < 0.6);
        players = view.players; critters = [...view.critters.values()]; baddies = [...view.baddies.values()]; berries = view.items; fxList = view.fx; runT = view.t; state = view.st;
        xp = view.xp; pk = view.pk; shots = view.shots; alert = view.al; bossFlags = view.bk;
      }
      const paused = state === "pick";
      const myP = players[L.mySlot];
      const iAmDown = !!myP?.down;
      const over = isEnd(state);
      const partner = players[L.otherSlot];
      const partnerIn = !!partner && partner.active !== false;

      // ── Move my leader ───────────────────────────────────────────────────
      const k = keysRef.current, st = stickRef.current;
      let dx, dy;
      if (st.active) { dx = st.x; dy = st.y; } else { dx = (k.right ? 1 : 0) - (k.left ? 1 : 0); dy = (k.down ? 1 : 0) - (k.up ? 1 : 0); }
      let mag = Math.hypot(dx, dy);
      if (mag > 1) { dx /= mag; dy /= mag; mag = 1; }
      me.moving = !iAmDown && !over && !paused && mag > 0.05;
      const mySpeed = T.LEADER_SPEED * (myP?.mods?.speed || 1);
      if (me.moving) { me.x += dx * mySpeed * dt; me.y += dy * mySpeed * dt; if (Math.abs(dx) > 0.15) me.face = dx > 0 ? 1 : -1; }
      if (!paused) { me.x += me.kx * dt; me.y += me.ky * dt; }
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
      if (!iAmDown && !over && !paused && myP) {
        const res = lassoStep(lassoRef.current, me, wild, me.moving, myP.mods?.lasso || 1, now - me.hurtAt < 900);
        lassoRef.current = res.state;
        if (res.tame) {
          if (L.runHost) for (const cid of res.tame) tryTame(run, 0, cid);
          else { L.net.send("tame", { cids: res.tame }); for (const cid of res.tame) pendingTame.current.set(cid, now); }
        }
      } else if (!paused) lassoRef.current = null;

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
      for (const it of berries) {
        if (!onScreen(it)) continue;
        const bob = Math.sin(tSec * 3 + it.id) * 3;
        ctx.fillStyle = "rgba(255,93,115,0.18)";
        ctx.beginPath(); ctx.arc(it.x, it.y - 8, 20 + Math.sin(tSec * 4 + it.id) * 3, 0, Math.PI * 2); ctx.fill();
        drawCropSprite(ctx, "berry", it.x, it.y - 10 + bob, 26, tSec);
      }
      const boss = baddies.find(b => b.kind === "boss");
      if (boss) {
        const frac = boss.chargeFrac ?? (boss.charge > 0 ? 1 - boss.charge / BOSS.SLAM_WIND : 0);
        if (frac > 0) drawSlamWarning(ctx, boss.x, boss.y, BOSS.SLAM_RADIUS, frac, tSec);
      }
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
          const hpFrac = c.hpFrac ?? c.hp / c.maxHp;
          const grabbed = c.grabbed ?? c.grabbedBy != null;
          const hit = c.hit ?? (runT - (c.hitAt ?? -9) < 0.2);
          if (herd && !grabbed) drawHerdDot(ctx, c.x, c.y, SLOT_COLORS[c.owner]);
          if (grabbed) {
            // carried off: drawn lifted above the snatcher, wriggling
            drawCreature(ctx, c.x + Math.sin(tSec * 18) * 2, c.y - 30, c.species, { hue: c.hue, size: c.size, personality: "sleepy", rare: c.rare },
              { face: Math.sin(tSec * 6) > 0 ? 1 : -1, t: tSec + c.id, moving: true, scale: 0.7 });
            drawGrabbed(ctx, c.x, c.y - 20, SLOT_COLORS[c.owner], tSec);
            continue;
          }
          drawCreature(ctx, c.x, c.y - (c.bump ? 4 : 0), c.species, { hue: c.hue, size: c.size, personality: c.rest ? "sleepy" : "bold", rare: c.rare },
            { face, t: tSec + c.id, moving: herd, scale: 0.75, alpha: c.rest ? 0.75 : 1 });
          if (!herd) drawWildSparkle(ctx, c.x + 14, c.y - 34, tSec, c.id);
          else if (hpFrac < 0.995) drawHerdHp(ctx, c.x, c.y - 36 * (c.size || 1), hpFrac, c.rest, hit);
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
      for (const sh of shots) if (onScreen({ x: sh.tx, y: sh.ty }, 200)) drawShot(ctx, sh);
      for (const f of fxList) drawFx(ctx, f, SLOT_COLORS);

      if (partnerIn && !onScreen(partner, -30)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const ang = Math.atan2(partner.y - camY, partner.x - camX);
        const r = Math.min(cw, ch) / 2 - 40;
        drawEdgeArrow(ctx, cw / 2 + Math.cos(ang) * r, ch / 2 + Math.sin(ang) * r, ang, SLOT_COLORS[L.otherSlot]);
      }
      if (boss && !onScreen(boss, -40)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const ang = Math.atan2(boss.y - camY, boss.x - camX);
        const r = Math.min(cw, ch) / 2 - 60;
        drawEdgeArrow(ctx, cw / 2 + Math.cos(ang) * r, ch / 2 + Math.sin(ang) * r, ang, "#ff5d73");
      }
      // Hard: it gets dark after 5 minutes
      const LVc = LEVELS[L.level];
      if (LVc?.dark) {
        const amount = Math.min(1, Math.max(0, (runT - LVc.dark.from) / (LVc.dark.full - LVc.dark.from))) * 0.82;
        drawDarkness(ctx, cw, ch, (me.x - left) * scale, (me.y - 20 - top) * scale, amount, scale);
      }

      // ── HUD (throttled) ──────────────────────────────────────────────────
      if (now - lastHud > 200) {
        lastHud = now;
        const mine = critters.filter(c => c.owner === L.mySlot);
        const cap = L.runHost ? herdCapOf(run, myP) : (myP?.herdCap ?? 15);
        const bossHp = boss ? (boss.hpFrac ?? boss.hp / boss.maxHp) : null;
        setHud({
          t: runT, hp: myP?.hp ?? 100, maxHp: myP?.maxHp ?? 100, herd: mine.length, cap, resting: mine.filter(c => c.rest).length, kills: myP?.kills ?? 0, tamed: myP?.tamed ?? 0, down: iAmDown,
          st: state, started: L.runHost ? !!run : view.got, partnerIn, xp, alert, bossHp,
          bossSpawned: !!bossFlags?.[0], bossDown: !!bossFlags?.[1],
          grabbed: mine.some(c => c.grabbed ?? c.grabbedBy != null),
          pick: pk ? { t: pk.t, offers: pk.o?.[L.mySlot] || [], chosen: pk.c?.[L.mySlot] || null, partnerPicking: pk.o?.[L.otherSlot] != null, partnerChosen: !!pk.c?.[L.otherSlot] } : null,
          other: partner ? { kills: partner.kills, tamed: partner.tamed } : null,
          myHerd: over ? mine.filter(c => !c.crew).map(c => ({ id: c.id, species: c.species, hue: c.hue, size: c.size, rare: !!c.rare })) : [],   // your crew comes home anyway
          myCrew: over ? mine.filter(c => c.crew).map(c => ({ id: c.id, species: c.species, hue: c.hue, rare: !!c.rare, name: c.name || (L.crews[L.mySlot] || []).find(m => m.species === c.species)?.name || SPECIES[c.species]?.name })) : [],
          abilities: (() => {
            const pow = {};
            for (const c of mine) if (!(c.grabbed ?? c.grabbedBy != null)) pow[c.species] = (pow[c.species] || 0) + (c.rare ? 2 : 1);
            const cds = L.runHost ? (run?.players[L.mySlot]?.abCd || {}) : (view.ab?.[L.mySlot]?.cd || {});
            return Object.keys(HERD_ABILITIES).filter(sp => pow[sp]).map(sp => ({ sp, n: pow[sp], cd: cds[sp] || 0 }));
          })(),
          loot: L.runHost ? (run ? { bag: { ...run.bag }, coins: Math.floor(run.coins), egg: run.egg } : null) : (view.loot || null),
        });
      }
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [applyHurt]);

  // ── Run end: save best (per level), unlock the next level, golden critters home on Hard
  useEffect(() => {
    if (!isEnd(hud.st) || recordedRef.current || !hud.started) return;
    recordedRef.current = true;
    update(prev => {
      const all = prev.stampedeBest && !("time" in prev.stampedeBest) ? prev.stampedeBest : {};
      const b = all[level] || { time: 0, tamed: 0, kills: 0 };
      return { stampedeBest: { ...all, [level]: { time: Math.max(b.time, Math.floor(hud.t)), tamed: Math.max(b.tamed, hud.tamed), kills: Math.max(b.kills, hud.kills) } } };
    });
    if (hud.st === "won") onWin?.(level);
    if (LV.rareHome) {
      const rares = hud.myHerd.filter(c => c.rare);
      for (const c of rares) onAdopt?.({ species: c.species, hue: c.hue, size: c.size, rare: true });
      if (rares.length) setAdopted(rares.map(c => c.id));
    }
  }, [hud.st, hud.started, hud.t, hud.tamed, hud.kills, hud.myHerd, level, LV.rareHome, update, onWin, onAdopt]);

  // how many regular picks you get (on Hard, golden ones came home free and don't count)
  const picksUsed = [...adopted, ...chosen].filter(id => !(LV.rareHome && hud.myHerd.find(c => c.id === id)?.rare)).length;
  const picksLeft = Math.max(0, LV.home - picksUsed);
  // Tap to pick, tap again to un-pick. They're only sent to the farm when you
  // press "Bring them home", "Again!" or "Back to farm".
  const togglePick = (c) => {
    if (adopted.includes(c.id)) return;
    if (chosen.includes(c.id)) { setChosen(a => a.filter(id => id !== c.id)); return; }
    if (picksLeft <= 0) return;
    setChosen(a => [...a, c.id]);
  };
  const sendHome = () => {
    if (!chosen.length) return;
    for (const id of chosen) { const c = hud.myHerd.find(x => x.id === id); if (c) onAdopt?.({ species: c.species, hue: c.hue, size: c.size, rare: c.rare }); }
    setAdopted(a => [...a, ...chosen]); setChosen([]);
  };
  const leave = () => {
    sendHome();
    // leaving mid-run: your crew still comes home (no rewards for an unfinished run)
    if (runHost && !lootSent.current && runRef.current && !isEnd(runRef.current.state)) {
      lootSent.current = true;
      const run = runRef.current;
      onLoot?.({ level, won: false, coins: 0, goods: {}, egg: null, crew: run.critters.filter(c => c.crew).map(c => c.crew), secs: Math.round(run.t) });
    }
    onExit();
  };
  const again = () => { sendHome(); restart(); };

  // ── Upgrade pick ───────────────────────────────────────────────────────────
  const choose = (id) => {
    if (!hud.pick || hud.pick.chosen || myPick) return;
    setMyPick(id);
    if (runHost) choosePick(runRef.current, 0, id);
    else net.send("pick", { id });
  };
  const pickRef = useRef(null);
  pickRef.current = (i) => { const id = hud.pick?.offers?.[i]; if (id) { choose(id); return true; } return !!hud.pick; };
  // ── Herd abilities ─────────────────────────────────────────────────────────
  const herdAbility = (sp) => {
    if (runHost) castHerdAbility(runRef.current, 0, sp);
    else net.send("ab", { sp });
  };
  const abRef = useRef(null);
  abRef.current = (i) => { const a = hud.abilities?.[i]; if (a && a.cd <= 0 && hud.st === "play") herdAbility(a.sp); };
  // ── Rewards: the run host sends them to the farm once
  const lootSent = useRef(false);
  const final = isEnd(hud.st) && hud.loot ? lootOf({ level, state: hud.st, bag: hud.loot.bag || {}, coins: hud.loot.coins || 0, egg: hud.loot.egg }) : null;
  useEffect(() => {
    if (!final || !runHost || lootSent.current || !hud.started) return;
    lootSent.current = true;
    const run = runRef.current;
    const crew = run ? run.critters.filter(c => c.crew).map(c => c.crew) : [];
    onLoot?.({ level, ...final, crew, secs: Math.round(run?.t || 0) });
  }, [final, runHost, hud.started, level, onLoot]);
  useEffect(() => { if (!isEnd(hud.st)) lootSent.current = false; }, [hud.st]);
  useEffect(() => { if (!hud.pick) setMyPick(null); }, [hud.pick]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const best = (save.stampedeBest && save.stampedeBest[level]) || { time: 0, tamed: 0, kills: 0 };
  const [xpNow, xpNeedNow, lvNow] = hud.xp || [0, 1, 0];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, overflow: "hidden", background: "#1d3b22", touchAction: "none", ...noSelect, fontFamily: "ui-rounded, 'Nunito', system-ui, sans-serif" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", ...noSelect }} />

      <button onClick={leave} style={{ ...smallBtn, position: "absolute", top: 10, left: 10, zIndex: 25 }}>← back to farm</button>

      <div style={{ position: "absolute", top: 46, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", zIndex: 20, pointerEvents: "none", fontSize: 13, fontWeight: 700 }}>
        <Chip color={C.dim}>{LV.name}</Chip>
        <Chip>{fmtTime(Math.max(0, LV.len - hud.t))} left</Chip>
        <Chip>
          <Icon draw={(ctx, s) => drawHeart(ctx, s / 2, s / 2, s, "#ff5d73")} size={14} />
          <span style={{ display: "inline-block", width: 70, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.max(0, hud.hp / hud.maxHp * 100)}%`, background: hud.hp / hud.maxHp < 0.3 ? C.bad : "#7ee081" }} />
          </span>
        </Chip>
        <Chip><Icon draw={drawPaw} size={16} /> herd {hud.herd}/{hud.cap}{hud.resting ? <span style={{ color: "#ffb347" }}>· {hud.resting} resting</span> : null}</Chip>
        <Chip><GoopIcon /> {hud.kills}</Chip>
        <Chip color={hud.partnerIn ? C.good : C.dim}><Dot color={hud.partnerIn ? C.good : C.dim} /> {hud.partnerIn ? "partner in the run" : "solo run"}</Chip>
      </div>

      {/* team XP bar: fills from flattening goop and taming; full = everyone picks an upgrade */}
      <div style={{ position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)", width: "min(360px, 70vw)", zIndex: 20, pointerEvents: "none", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#c9a7ff" }}>Lv {lvNow + 1}</span>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.45)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${Math.min(100, xpNow / xpNeedNow * 100)}%`, background: "linear-gradient(90deg, #8f6bff, #c9a7ff)" }} />
        </span>
      </div>

      {/* Goop King health */}
      {hud.bossHp != null && (
        <div style={{ position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)", width: "min(420px, 80vw)", zIndex: 20, pointerEvents: "none", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#ffd65a", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>THE GOOP KING</div>
          <div style={{ height: 10, borderRadius: 5, background: "rgba(0,0,0,0.5)", overflow: "hidden", border: "1px solid rgba(255,214,90,0.5)" }}>
            <div style={{ height: "100%", width: `${Math.max(0, hud.bossHp * 100)}%`, background: "linear-gradient(90deg, #ff5d73, #ff9a5d)" }} />
          </div>
        </div>
      )}
      {hud.alert && (
        <div style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", zIndex: 24, pointerEvents: "none", color: "#fff", fontWeight: 900, fontSize: "clamp(22px, 5vw, 38px)", textShadow: "0 3px 10px rgba(0,0,0,0.8)", padding: "0 16px" }}>
          {hud.alert}
        </div>
      )}
      {hud.grabbed && hud.st === "play" && <div style={{ ...hintStyle, top: hud.bossHp != null ? 140 : 100, color: "#ffb347" }}>A snatcher grabbed one of your herd! Flatten it to get them back</div>}
      {hud.st === "play" && hud.t >= LV.len && hud.bossSpawned && !hud.bossDown && <div style={{ ...hintStyle, top: 140, color: "#ffd65a" }}>Time's up — beat the Goop King to win!</div>}

      {hud.started && hud.herd === 0 && hud.t < 25 && !hud.down && <div style={hintStyle}>Run one circle around sparkly critters to tame them</div>}
      {hud.started && hud.t > 30 && hud.t < 40 && <div style={hintStyle}>Grab berries to heal you and your herd</div>}
      {hud.down && hud.st === "play" && <div style={{ ...hintStyle, color: C.bad }}>You're down! Your partner can revive you by standing next to you</div>}
      {!hud.started && <div style={{ ...hintStyle, top: "45%" }}>joining the run…</div>}

      {!isTouch() && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12, zIndex: 5, pointerEvents: "none" }}>
          WASD / arrows to move · 1-7 herd abilities · circle critters to tame them · berries heal
        </div>
      )}

      {hud.st === "play" && hud.loot && (
        <div style={{ position: "absolute", top: hud.bossHp != null ? 134 : 100, right: 10, zIndex: 20, pointerEvents: "none", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 260, fontSize: 12, fontWeight: 800, background: "rgba(10,20,14,0.55)", padding: "4px 8px", borderRadius: 10 }}>
          <span style={{ color: "#ffd65a" }}>{hud.loot.coins} coins</span>
          {Object.entries(hud.loot.bag || {}).filter(([, n]) => n > 0).map(([k, n]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><ItemIcon kind={k} size={14} />{n}</span>)}
          {hud.loot.egg && <EggIcon rarity={hud.loot.egg} size={16} />}
        </div>
      )}
      {hud.st === "play" && hud.abilities?.length > 0 && (
        <div style={{ position: "absolute", zIndex: 22, display: "flex", gap: 6, ...(isTouch() ? { right: 10, bottom: 14, flexDirection: "column-reverse", alignItems: "flex-end" } : { bottom: 30, left: "50%", transform: "translateX(-50%)" }) }}>
          {hud.abilities.map((a, i) => {
            const H = HERD_ABILITIES[a.sp], ready = a.cd <= 0;
            return (
              <button key={a.sp} data-ab={a.sp} onPointerDown={(e) => { e.stopPropagation(); if (ready) herdAbility(a.sp); }} title={`${H.name}: ${H.desc}`}
                style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 6, padding: isTouch() ? "5px 9px" : "6px 10px", borderRadius: 12, fontFamily: "inherit", color: C.text, cursor: ready ? "pointer" : "default",
                  background: ready ? "rgba(255,204,77,0.25)" : "rgba(10,20,14,0.7)", border: `2px solid ${ready ? "#ffcc4d" : "rgba(255,255,255,0.15)"}`, touchAction: "none", ...noSelect }}>
                {!ready && <span style={{ position: "absolute", left: 0, bottom: 0, top: 0, width: `${(1 - a.cd / 14) * 100}%`, background: "rgba(255,255,255,0.08)" }} />}
                <Portrait species={a.sp} hue={SPECIES[a.sp].hue} size={26} />
                <span style={{ position: "relative", textAlign: "left", lineHeight: 1.1 }}>
                  <span style={{ display: "block", fontWeight: 900, fontSize: 12 }}>{H.name} <span style={{ color: "#ffd65a" }}>×{a.n}</span></span>
                  <span style={{ display: "block", fontSize: 10, color: C.dim }}>{ready ? (isTouch() ? "tap" : `key ${i + 1}`) : `${Math.ceil(a.cd)}s`}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <TouchStick stickRef={stickRef} />

      {hud.pick && !isEnd(hud.st) && (
        <Overlay>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#c9a7ff" }}>level up!</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{hud.pick.chosen || myPick ? "Nice pick!" : "Pick an upgrade"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hud.pick.offers.map((id, i) => {
              const card = CARDS[id], mine = (hud.pick.chosen || myPick) === id, done = !!(hud.pick.chosen || myPick);
              return (
                <button key={id} disabled={done} onClick={() => choose(id)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, textAlign: "left",
                  cursor: done ? "default" : "pointer", fontFamily: "inherit", color: C.text,
                  background: mine ? "rgba(143,107,255,0.3)" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${mine ? "#c9a7ff" : "rgba(255,255,255,0.12)"}`, opacity: done && !mine ? 0.4 : 1,
                }}>
                  <CardIcon kind={card.icon} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 800, fontSize: 15 }}>{card.name}</span>
                    <span style={{ display: "block", fontSize: 12, color: C.dim }}>{card.desc}</span>
                  </span>
                  {!isTouch() && !done && <span style={{ fontSize: 12, color: C.faint, fontWeight: 800 }}>{i + 1}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: C.dim }}>
            {hud.pick.partnerPicking ? (hud.pick.partnerChosen ? `${partnerName || "Partner"} is ready` : `${partnerName || "Partner"} is choosing…`) : "solo run"}
            {" · "}{Math.max(0, hud.pick.t)}s{hud.pick.chosen || myPick ? "" : " (then one is picked for you)"}
          </div>
        </Overlay>
      )}

      {isEnd(hud.st) && (
        <Overlay>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: hud.st === "won" ? C.good : C.dim }}>{hud.st === "won" ? "you survived!" : "run over"}</div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{fmtTime(hud.t)}</div>
          <div style={{ display: "flex", gap: 18, justifyContent: "center", fontSize: 14 }}>
            <Stat label="tamed" value={hud.tamed} />
            <Stat label="goop flattened" value={hud.kills} />
          </div>
          {final && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 12, color: C.dim }}>{final.won ? `Rewards (×${REWARD[level].mult} for ${LV.name}, +${REWARD[level].win} coins for winning)` : "You keep half of what your herd made"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", alignItems: "center", fontWeight: 800 }}>
                <span style={{ color: "#ffd65a" }}>+{final.coins} coins</span>
                {Object.entries(final.goods).map(([k, n]) => <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><ItemIcon kind={k} size={18} />{n} {ITEMS[k]?.name.toLowerCase()}</span>)}
              </div>
              {final.egg && <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, color: RARITY_INFO[final.egg].color }}><EggIcon rarity={final.egg} size={26} /> {RARITY_INFO[final.egg].name} egg from the Goop King!</div>}
              <div style={{ fontSize: 11, color: C.faint }}>Sent to the farm's storage (the stall sells what doesn't fit).</div>
            </div>
          )}
          {hud.other && <div style={{ fontSize: 13, color: C.dim }}>partner: {hud.other.tamed} tamed · {hud.other.kills} flattened</div>}
          <div style={{ fontSize: 12, color: C.faint }}>best: {fmtTime(best.time)} · {best.tamed} tamed · {best.kills} flattened</div>

          {hud.myCrew?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", flexWrap: "wrap", fontSize: 12, color: C.dim }}>
              Your crew heads home:{hud.myCrew.map(c => <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.text, fontWeight: 800 }}><Portrait species={c.species} hue={c.hue} rare={c.rare} size={24} />{c.name}</span>)}
              <span>(+Fight practice)</span>
            </div>
          )}
          {hud.myHerd.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
                {picksLeft > 0 ? `Pick ${picksLeft} more to bring home` : chosen.length ? "Tap one again to change your mind" : "Coming home to your pen!"}
              </div>
              {LV.rareHome && hud.myHerd.some(c => c.rare) && (
                <div style={{ fontSize: 12, color: "#ffd65a", marginBottom: 6 }}>Every golden critter comes home free!</div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxHeight: 150, overflowY: "auto" }}>
                {hud.myHerd.map(c => {
                  const sent = adopted.includes(c.id), picked = chosen.includes(c.id), home = sent || picked;
                  const can = !sent && (picked || picksLeft > 0);
                  return (
                    <button key={c.id} data-home={c.id} disabled={!can} onClick={() => togglePick(c)} title={sent ? "Already on its way home" : picked ? "Tap to change your mind" : SPECIES[c.species]?.name} style={{
                      padding: 2, borderRadius: 10, cursor: can ? "pointer" : "default",
                      background: home ? "rgba(126,224,129,0.25)" : "rgba(255,255,255,0.05)",
                      border: `2px solid ${home ? C.good : c.rare ? "#ffd65a" : "rgba(255,255,255,0.12)"}`,
                      opacity: !home && picksLeft <= 0 ? 0.35 : 1,
                    }}>
                      <Portrait species={c.species} hue={c.hue} rare={c.rare} size={50} />
                    </button>
                  );
                })}
              </div>
              {chosen.length > 0 && (
                <button data-sendhome onClick={sendHome} style={{ ...menuBtn(true), marginTop: 8, padding: "8px 14px", fontSize: 14 }}>
                  Bring {chosen.length === 1 ? "it" : `these ${chosen.length}`} home
                </button>
              )}
            </div>
          )}

          {hud.st === "won" && level !== "hard" && <div style={{ fontSize: 13, color: C.good, fontWeight: 800 }}>{LEVELS[level === "easy" ? "medium" : "hard"].name} is unlocked on the signpost!</div>}
          <button onClick={again} style={menuBtn(true)}>Again!</button>
          <button onClick={leave} style={menuBtn(false)}>Back to farm</button>
        </Overlay>
      )}
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
// Little health bar over a hurt herd member: green → orange → red, flashes white when hit,
// with a "z" when it's resting.
function drawHerdHp(ctx, x, y, frac, resting, hit) {
  const w = 22, h = 4;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = hit ? "#ffffff" : frac > 0.6 ? "#7ee081" : frac > 0.3 ? "#ffb347" : "#ff5d73";
  ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), h);
  if (resting) {
    ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "#cfe8ff";
    ctx.fillText("z", x + w / 2 + 3, y + 5);
  }
  ctx.restore();
}

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
function Portrait({ species, hue, rare, size }) {
  return <Icon size={size} draw={(ctx, s) => { ctx.save(); ctx.translate(s / 2, s * 0.86); ctx.scale(s / 48, s / 48); drawCreature(ctx, 0, 0, species, { hue: hue ?? SPECIES[species]?.hue ?? 0, size: 1, personality: "bold", rare }, { face: 1, t: 1 }); ctx.restore(); }} />;
}

// Upgrade card icons, drawn in code: zap bolt, heart (you), paw (herd), loop (taming), berry.
const CARD_TINT = { zap: "#ffe14d", you: "#ff5d73", herd: "#7ee081", tame: "#6fd3ff", berry: "#ff7aa8" };
function CardIcon({ kind }) {
  return (
    <span style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(0,0,0,0.35)", border: `1px solid ${CARD_TINT[kind]}55`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={30} draw={(ctx, s) => {
        const c = CARD_TINT[kind];
        if (kind === "zap") {
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.moveTo(s * 0.58, s * 0.06); ctx.lineTo(s * 0.22, s * 0.56); ctx.lineTo(s * 0.46, s * 0.56); ctx.lineTo(s * 0.38, s * 0.94); ctx.lineTo(s * 0.8, s * 0.4); ctx.lineTo(s * 0.54, s * 0.4); ctx.closePath(); ctx.fill();
        } else if (kind === "you") drawHeart(ctx, s / 2, s / 2, s * 0.85, c);
        else if (kind === "herd") { ctx.save(); ctx.scale(s / 18, s / 18); drawPaw(ctx, 18); ctx.restore(); }
        else if (kind === "tame") {
          ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.36, 0.3, Math.PI * 2 - 0.1); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.1, 0, Math.PI * 2); ctx.fill();
        } else drawCropSprite(ctx, "berry", s / 2, s / 2, s * 0.9, 0);
      }} />
    </span>
  );
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
  position: "absolute", top: 100, left: 0, right: 0, textAlign: "center", zIndex: 21, pointerEvents: "none",
  color: "#fff", fontWeight: 800, fontSize: 14, textShadow: "0 2px 6px rgba(0,0,0,0.6)", padding: "0 20px",
};
function menuBtn(primary) {
  return {
    padding: "10px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    ...(primary ? { background: C.accent, color: "#1a1300", border: "none" } : { background: "transparent", color: C.dim, border: "1px solid rgba(255,255,255,0.12)" }),
  };
}