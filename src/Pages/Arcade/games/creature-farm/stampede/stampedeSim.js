// src/Pages/Arcade/games/creature-farm/stampede/stampedeSim.js
//
// Critter Stampede (a Creature Farm run) — the simulation. The HOST runs this; the guest just draws
// snapshots of it. Each player's own leader position comes from their device
// (instant controls); everything else is decided here.
//
//   • Wild critters wander the endless field. Run circles around one to tame it
//     (the lasso is worked out on each player's own device — see lassoStep).
//   • Tamed critters join your HERD: they swarm around you and pile onto
//     whatever goop you (or they) are fighting.
//   • Goop baddies chase leaders and get tougher over time. Your leader zaps
//     the nearest one automatically.
//   • Leaders can be knocked down; a partner standing close revives them.
//     Everyone down = run over.
//
// Uses the farm's species.js, so Bash's designs show up here too.

import { SPECIES } from "../species";

export const SPECIES_IDS = Object.keys(SPECIES);
export const STARTERS = SPECIES_IDS.filter(k => SPECIES[k].starter);

// ── Tuning ────────────────────────────────────────────────────────────────────
export const T = {
  LEADER_SPEED: 190,
  LEADER_HP: 100,
  LEADER_INV: 0.7,            // seconds of invincibility after a hit
  ZAP_EVERY: 0.55, ZAP_RANGE: 230, ZAP_DMG: 10,
  HERD_MAX: 30,
  HERD_SPEED: 270, HERD_ATTACK_SPEED: 310,
  HERD_HP: 40, HERD_DMG: 5, HERD_ATK_EVERY: 0.5,
  HERD_REGEN: 5, HERD_REGEN_DELAY: 2,   // herd heals 5 hp/s after 2s without being hit
  HERD_ENGAGE: 150, HERD_LEASH: 320,
  WILD_MAX: 10, WILD_SPAWN_EVERY: 1.4,
  BADDIE_MAX: 80,
  GOOP_DMG: 8, GOOP_HIT_HERD: 4, GOOP_HIT_EVERY: 0.7,
  REVIVE_TIME: 3, REVIVE_RANGE: 55, REVIVE_HP: 50,
  LASSO_MIN: 25, LASSO_MAX: 150, LASSO_PICK: 130,
  TAME_RANGE: 220,
  DESPAWN: 1600,
  LEASH: 1000,                // players can't get further apart than this
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function mulberry(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Element flavour for herd attacks (damage multiplier, attack-speed multiplier).
const ELEMENT = {
  fire: [1.4, 1], earth: [1.8, 0.7], water: [1, 1.2], plant: [1, 1],
  air: [0.8, 1.5], light: [1.1, 1.1], storm: [1.3, 1.2],
};

// ── Run ───────────────────────────────────────────────────────────────────────
export function createRun(seed = Date.now()) {
  return {
    t: 0, state: "play", nextId: 1, rng: mulberry(seed),
    players: [null, null],           // slot 0 = host, slot 1 = guest
    critters: [], baddies: [], fx: [], fxOut: [],
    wildCd: 0, badCd: 2,
  };
}

export function addPlayer(run, slot, species, x = slot * 80, y = 0, hue = null) {
  if (run.players[slot]) {
    run.players[slot].species = species; run.players[slot].active = true;
    if (hue != null) run.players[slot].hue = hue;
    return;
  }
  run.players[slot] = {
    slot, species, x, y, hp: T.LEADER_HP, down: false, rev: 0, inv: 0,
    zapCd: 0.5, focus: null, kills: 0, tamed: 0, active: true, seenAt: run.t,
    hue: hue ?? SPECIES[species]?.hue ?? 0,
  };
}

const activePlayers = (run) => run.players.filter(p => p && p.active);
const upPlayers = (run) => run.players.filter(p => p && p.active && !p.down);

function fx(run, f) { run.fx.push({ ...f, age: 0 }); run.fxOut.push(f); }

function rollWild(run, near) {
  const r = run.rng;
  const species = SPECIES_IDS[Math.floor(r() * SPECIES_IDS.length)];
  const a = r() * TAU, d = 450 + r() * 320;
  return {
    id: run.nextId++, species, hue: (SPECIES[species].hue + Math.round((r() - 0.5) * 50) + 360) % 360,
    size: Math.round((0.85 + r() * 0.35) * 100) / 100,
    x: near.x + Math.cos(a) * d, y: near.y + Math.sin(a) * d, vx: 0, vy: 0,
    owner: -1, hp: T.HERD_HP, maxHp: T.HERD_HP, atkCd: 0, wa: r() * TAU, k: 0,
  };
}

function rollBaddie(run, near) {
  const r = run.rng;
  const big = run.t > 90 && r() < Math.min(0.35, 0.15 + run.t / 1200);
  const a = r() * TAU, d = 650 + r() * 160;
  const hp = big ? 60 + run.t * 0.12 : 14 + run.t * 0.05;
  return {
    id: run.nextId++, kind: big ? "big" : "goop",
    x: near.x + Math.cos(a) * d, y: near.y + Math.sin(a) * d,
    hp, maxHp: hp, speed: big ? 62 : Math.min(140, 92 + run.t * 0.15),
    hitCd: 0, lastBy: -1,
  };
}

// Herd members are critters with owner = slot. Their place in the herd (k) is
// renumbered each step so the swarm stays tidy.
function herdOf(run, slot) { return run.critters.filter(c => c.owner === slot); }

export function tryTame(run, slot, cid) {
  const p = run.players[slot];
  const c = run.critters.find(x => x.id === cid);
  if (!p || p.down || !c || c.owner !== -1) return false;
  if (dist(p, c) > T.TAME_RANGE) return false;
  if (herdOf(run, slot).length >= T.HERD_MAX) return false;
  c.owner = slot; c.hp = c.maxHp; p.tamed += 1;
  fx(run, { k: "tame", x: c.x, y: c.y, s: slot });
  return true;
}

// Called when the player's device reports where its leader is.
export function setLeaderPos(run, slot, x, y) {
  const p = run.players[slot];
  if (!p) return;
  p.x = x; p.y = y; p.seenAt = run.t; p.active = true;
}

// ── Step (host only) ──────────────────────────────────────────────────────────
// hurt(slot, kx, ky) is called when a leader takes a hit, so its device can do the knockback.
export function stepRun(run, dt, hurt = () => {}) {
  if (run.state !== "play") return;
  run.t += dt;
  const r = run.rng;

  for (const p of run.players) if (p && run.t - p.seenAt > 4) p.active = false;   // partner went quiet
  const ups = upPlayers(run), act = activePlayers(run);
  if (!act.length) return;

  // ── Wild critters: keep a few around each player, wander, despawn far away
  run.wildCd -= dt;
  const wild = run.critters.filter(c => c.owner === -1);
  if (run.wildCd <= 0 && wild.length < T.WILD_MAX) {
    run.critters.push(rollWild(run, act[Math.floor(r() * act.length)]));
    run.wildCd = T.WILD_SPAWN_EVERY;
  }
  for (const c of wild) {
    c.wa += (r() - 0.5) * 2 * dt;
    c.vx = Math.cos(c.wa) * 28; c.vy = Math.sin(c.wa) * 28;
    c.x += c.vx * dt; c.y += c.vy * dt;
  }
  run.critters = run.critters.filter(c => c.owner !== -1 || act.some(p => dist(p, c) < T.DESPAWN));

  // ── Baddies: spawn faster as time goes on
  run.badCd -= dt;
  const rate = run.t < 15 ? 0.5 : Math.min(5, 0.6 + run.t / 55);    // per second
  if (run.badCd <= 0 && run.baddies.length < T.BADDIE_MAX && ups.length) {
    run.baddies.push(rollBaddie(run, ups[Math.floor(r() * ups.length)]));
    run.badCd = 1 / rate;
  }

  // ── Leaders: auto-zap the nearest baddie
  for (const p of ups) {
    p.inv = Math.max(0, p.inv - dt);
    p.zapCd -= dt;
    if (p.zapCd <= 0) {
      let best = null, bd = T.ZAP_RANGE;
      for (const b of run.baddies) { const d = dist(p, b); if (d < bd) { bd = d; best = b; } }
      if (best) {
        best.hp -= T.ZAP_DMG; best.lastBy = p.slot; best.hitT = 0.15;
        p.focus = best.id;
        fx(run, { k: "zap", x: p.x, y: p.y, x2: best.x, y2: best.y, s: p.slot });
        p.zapCd = T.ZAP_EVERY;
      } else p.zapCd = 0.1;
    }
  }

  // ── Herds: swarm around the leader, attack nearby goop
  for (const p of run.players) {
    if (!p) continue;
    const herd = herdOf(run, p.slot);
    const focus = run.baddies.find(b => b.id === p.focus);
    herd.forEach((c, k) => {
      c.k = k;
      c.atkCd = Math.max(0, c.atkCd - dt);
      if (run.t - (c.hitAt || 0) > T.HERD_REGEN_DELAY) c.hp = Math.min(c.maxHp, c.hp + T.HERD_REGEN * dt);
      let target = null;
      if (!p.down && p.active) {
        if (focus && dist(c, focus) < T.HERD_LEASH && dist(p, focus) < T.HERD_LEASH) target = focus;
        else {
          let bd = T.HERD_ENGAGE;
          for (const b of run.baddies) { const d = dist(c, b); if (d < bd && dist(p, b) < T.HERD_LEASH) { bd = d; target = b; } }
        }
      }
      let gx, gy, speed;
      if (target) { gx = target.x; gy = target.y; speed = T.HERD_ATTACK_SPEED; }
      else {
        // sunflower packing around the leader — a tidy blob that grows with the herd
        const a = k * 2.39996 + run.t * 0.25, rad = 34 + 13 * Math.sqrt(k);
        gx = p.x + Math.cos(a) * rad; gy = p.y + Math.sin(a) * rad; speed = T.HERD_SPEED;
      }
      const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy);
      const step = Math.min(d, speed * dt * (d > 300 ? 1.6 : 1));
      if (d > 1) { c.vx = dx / d * speed; c.vy = dy / d * speed; c.x += dx / d * step; c.y += dy / d * step; }
      else { c.vx = 0; c.vy = 0; }
      if (target && d < 24 && c.atkCd <= 0) {
        const [dm, sp] = ELEMENT[SPECIES[c.species]?.element] || [1, 1];
        target.hp -= T.HERD_DMG * dm * c.size; target.lastBy = p.slot; target.hitT = 0.12;
        c.atkCd = T.HERD_ATK_EVERY / sp;
        c.bump = 0.15;
      }
      c.bump = Math.max(0, (c.bump || 0) - dt);
    });
  }
  // keep herd members from stacking on one spot
  const herdAll = run.critters.filter(c => c.owner !== -1);
  for (let i = 0; i < herdAll.length; i++) for (let j = i + 1; j < herdAll.length; j++) {
    const a = herdAll[i], b = herdAll[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 20) { const push = (20 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Baddies chase the nearest standing leader, hurt leaders + herd
  for (const b of run.baddies) {
    b.hitCd = Math.max(0, b.hitCd - dt);
    b.hitT = Math.max(0, (b.hitT || 0) - dt);
    let tgt = null, bd = Infinity;
    for (const p of ups) { const d = dist(p, b); if (d < bd) { bd = d; tgt = p; } }
    if (tgt) {
      const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.x += dx / d * b.speed * dt; b.y += dy / d * b.speed * dt;
      const reach = b.kind === "big" ? 34 : 24;
      if (d < reach && tgt.inv <= 0 && b.hitCd <= 0) {
        tgt.hp -= T.GOOP_DMG * (b.kind === "big" ? 2 : 1);
        tgt.inv = T.LEADER_INV; b.hitCd = T.GOOP_HIT_EVERY;
        hurt(tgt.slot, dx / d * 260, dy / d * 260);
        if (tgt.hp <= 0) { tgt.hp = 0; tgt.down = true; tgt.rev = 0; fx(run, { k: "down", x: tgt.x, y: tgt.y, s: tgt.slot }); }
      }
    }
    if (b.hitCd <= 0) {
      for (const c of herdAll) {
        if (Math.hypot(c.x - b.x, c.y - b.y) < (b.kind === "big" ? 32 : 22)) {
          c.hp -= T.GOOP_HIT_HERD * (b.kind === "big" ? 2 : 1); b.hitCd = T.GOOP_HIT_EVERY; c.hitAt = run.t;
          break;
        }
      }
    }
  }
  // goop push each other apart a bit
  for (let i = 0; i < run.baddies.length; i++) for (let j = i + 1; j < run.baddies.length; j++) {
    const a = run.baddies[i], b = run.baddies[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.kind === "big" || b.kind === "big") ? 40 : 26;
    if (d > 0 && d < min) { const push = (min - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Deaths
  run.baddies = run.baddies.filter(b => {
    if (b.hp > 0) return act.some(p => dist(p, b) < T.DESPAWN);
    const p = run.players[b.lastBy];
    if (p) p.kills += 1;
    fx(run, { k: "pop", x: b.x, y: b.y, big: b.kind === "big" ? 1 : 0 });
    return false;
  });
  run.critters = run.critters.filter(c => {
    if (c.owner === -1 || c.hp > 0) return true;
    fx(run, { k: "flee", x: c.x, y: c.y });             // fainted and ran off
    return false;
  });

  // ── Revives + game over
  for (const p of act) {
    if (!p.down) continue;
    const helper = ups.find(o => o !== p && dist(o, p) < T.REVIVE_RANGE);
    p.rev = helper ? p.rev + dt : Math.max(0, p.rev - dt * 0.5);
    if (p.rev >= T.REVIVE_TIME) { p.down = false; p.hp = T.REVIVE_HP; p.inv = 1.5; p.rev = 0; fx(run, { k: "revive", x: p.x, y: p.y, s: p.slot }); }
  }
  if (!upPlayers(run).length) run.state = "over";

  for (const f of run.fx) f.age += dt;
  run.fx = run.fx.filter(f => f.age < 0.6);
}

// ── Snapshots (host → guest, ~10/s) ──────────────────────────────────────────
const R = Math.round;
export function makeSnapshot(run) {
  const snap = {
    t: Math.round(run.t * 10) / 10, st: run.state,
    p: run.players.map(p => p && [R(p.x), R(p.y), R(p.hp), p.down ? 1 : 0, Math.round(p.rev * 10) / 10, p.kills, p.tamed, SPECIES_IDS.indexOf(p.species), p.active ? 1 : 0, p.hue]),
    c: run.critters.map(c => [c.id, SPECIES_IDS.indexOf(c.species), R(c.x), R(c.y), c.hue, R(c.size * 100), c.owner, R(c.hp / c.maxHp * 100), c.bump > 0 ? 1 : 0]),
    b: run.baddies.map(b => [b.id, b.kind === "big" ? 1 : 0, R(b.x), R(b.y), R(b.hp / b.maxHp * 100), b.hitT > 0 ? 1 : 0]),
    fx: run.fxOut,
  };
  run.fxOut = [];
  return snap;
}

export function readSnapshotPlayers(snap) {
  return (snap.p || []).map((a, slot) => a && {
    slot, x: a[0], y: a[1], hp: a[2], down: !!a[3], rev: a[4], kills: a[5], tamed: a[6],
    species: SPECIES_IDS[a[7]], active: !!a[8], hue: a[9],
  });
}

// ── Lasso (runs on each player's own device) ─────────────────────────────────
// Circle a wild critter to tame it: 1 loop for small ones, 2 for big ones.
export const loopsFor = (size) => (size >= 1.08 ? 2 : 1);

// state: { cid, acc, last } or null. Returns { state, tame: cid|null }.
export function lassoStep(state, me, wildCritters, moving) {
  if (state) {
    const c = wildCritters.find(w => w.id === state.cid);
    const d = c ? Math.hypot(me.x - c.x, me.y - c.y) : Infinity;
    if (!c || d > T.LASSO_MAX) return { state: null, tame: null };
    if (d < T.LASSO_MIN) return { state, tame: null };          // too close — no progress, no reset
    const ang = Math.atan2(me.y - c.y, me.x - c.x);
    let delta = ang - state.last;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    const acc = state.acc + delta;
    const need = TAU * loopsFor(c.size);
    if (Math.abs(acc) >= need) return { state: null, tame: c.id };
    return { state: { cid: c.id, acc, last: ang, frac: Math.abs(acc) / need }, tame: null };
  }
  if (!moving) return { state: null, tame: null };
  let best = null, bd = T.LASSO_PICK;
  for (const c of wildCritters) { const d = Math.hypot(me.x - c.x, me.y - c.y); if (d < bd && d > 10) { bd = d; best = c; } }
  if (!best) return { state: null, tame: null };
  return { state: { cid: best.id, acc: 0, last: Math.atan2(me.y - best.y, me.x - best.x), frac: 0 }, tame: null };
}