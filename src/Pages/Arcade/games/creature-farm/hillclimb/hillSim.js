// Hill Climb Rally: drive a little cart over the hills to the finish line.
//
// Physics (hand-written, no library): a rigid cart body with two springy wheels and two bumper
// points that push off a smooth heightfield. Gas drives the wheels; in the air (and a little on
// the ground) gas tips the nose up and brake tips it down, so you can line up your landings.
// If your creature's head hits the ground you CRASH: after a short pause you're put back on the
// track a little way behind, upright. No one is ever knocked out of the race.
//
// World units: x right, y UP. 1 unit ≈ 1 screen px at zoom 1.
import { mulberry } from "../minis/rng";
import { SPECIES } from "../species";

export const DT = 1 / 120;                 // physics step
export const G = 540;                      // gravity
export const STEP = 10;                    // terrain sample spacing
export const RESPAWN_SECS = 1.3, RESPAWN_BACK = 260;
export const RACE_MAX = 180, COUNTDOWN = 3;

// ── Maps ──────────────────────────────────────────────────────────────────────
// A map: length, rolling hills, and "kickers" (a smooth ramp up, then a long gentle slope down to land on).
export const MAPS = [
  {
    id: "meadow", name: "Meadow Hills", len: 12000, sky: ["#7ec8f0", "#d8f1ff"], grass: "#6fbf4a", dirt: "#8a5a34",
    desc: "Easy rolling hills with some fun jumps.",
    roll: [[38, 420, 0], [22, 190, 1.3], [10, 90, 2.1]],
    kickers: [[1400, 90], [2700, 120], [3900, 100], [5200, 150], [6600, 120], [7900, 160], [9300, 130], [10700, 175]],
    climbs: [[3300, 130, 500], [6100, 160, 600], [8600, 120, 450]],            // [x, height, width]: steady hills that need momentum
    npc: [185, 212, 236],                                    // neighbours' average speeds
    coinsPer: 1,
  },
];

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export function makeTerrain(mapIdx = 0) {
  const M = MAPS[mapIdx];
  const n = Math.ceil((M.len + 1600) / STEP) + 1;
  const h = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * STEP - 400;                                // the track starts at x = 0; 400 of flat before it
    const ramp = smooth((x - 300) / 900) * (1 - smooth((x - (M.len - 500)) / 400));   // flat start and finish
    let y = 0;
    let calm = 1;                                            // no rolling hills right around a jump, so every lip is a clean launch
    for (const [kx] of M.kickers) calm = Math.min(calm, smooth((Math.abs(x - kx) - 450) / 300));
    for (const [amp, wl, ph] of M.roll) y += amp * Math.sin(x / wl + ph) * ramp * (0.25 + 0.75 * calm);
    for (const [cx, hh, w] of M.climbs) { const u = (x - cx) / w; if (u > -1 && u < 1) y += hh * 0.5 * (1 + Math.cos(u * Math.PI)); }
    for (const [kx, hh] of M.kickers) {
      // ramp up (gentle at the bottom, steepest at the lip: about 30°), a drop to fly over, then a gentle slope to land on
      const rise = Math.max(160, 2.3 * hh);
      if (x > kx - rise && x <= kx) y += hh * (1 - Math.cos(((x - (kx - rise)) / rise) * Math.PI / 2));
      else if (x > kx && x <= kx + 200) y += hh * (1 - 0.85 * smooth((x - kx) / 200));      // the drop you fly over
      else if (x > kx + 200 && x < kx + 720) y += hh * 0.15 * (1 - smooth((x - kx - 200) / 520));   // gentle landing slope
    }
    h[i] = y;
  }
  // soften any sharp corners
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < n) { s += h[j]; c++; } } out[i] = s / c; }
  return { h: out, x0: -400, len: M.len, map: mapIdx };
}
export function groundY(T, x) {
  const f = (x - T.x0) / STEP, i = Math.floor(f);
  if (i < 0) return T.h[0];
  if (i >= T.h.length - 1) return T.h[T.h.length - 1];
  const u = f - i;
  return T.h[i] * (1 - u) + T.h[i + 1] * u;
}
export function slopeAt(T, x) { return (groundY(T, x + 6) - groundY(T, x - 6)) / 12; }
export function normalAt(T, x) { const s = slopeAt(T, x), l = Math.hypot(1, s); return { x: -s / l, y: 1 / l }; }

// Coins to grab along the way (same on both screens).
export function makeCoins(mapIdx, seed) {
  const M = MAPS[mapIdx], T = makeTerrain(mapIdx), r = mulberry(seed * 5 + 11), out = [];
  for (let x = 700; x < M.len - 400; x += 260 + r() * 340) {
    const n = 3 + Math.floor(r() * 3), air = r() < 0.35;
    for (let i = 0; i < n; i++) { const cx = x + i * 34; out.push({ id: out.length, x: cx, y: groundY(T, cx) + (air ? 70 + Math.sin(i / (n - 1 || 1) * Math.PI) * 40 : 26) }); }
    x += n * 34;
  }
  return out;
}

// ── The cart ──────────────────────────────────────────────────────────────────
// Body frame: x forward, y up. Wheel anchors, bumpers and the driver's head.
const WHEELS = [{ x: -25, y: -8 }, { x: 25, y: -8 }];
const BUMPERS = [{ x: -36, y: 2 }, { x: 36, y: 2 }, { x: -30, y: 14 }, { x: 30, y: 14 }];
export const HEAD = { x: 2, y: 38 };
export const WHEEL_R = 12, REST = 12;

// How a creature drives (its main type and a couple of skills).
export function cartStats(c) {
  const sp = c?.species || "mossling", sk = c?.skills || {};
  const s = {
    species: sp, mass: 1, inertia: 420, engine: 340, vmax: 290, grip: 1.25, air: 3300, gravity: G, magnet: 0, k: 160, damp: 15,
  };
  s.engine *= 1 + 0.03 * ((sk.haul || 1) - 1);
  s.vmax *= 1 + 0.015 * ((sk.forage || 1) - 1);
  if (c?.traits?.rare) s.vmax *= 1.03;
  if (sp === "mossling") s.grip *= 1.35;                   // grippy tyres: climbs better
  if (sp === "emberpup") s.engine *= 1.15;                 // hot engine
  if (sp === "puddlet") s.air *= 1.4;                      // easy to steer in the air
  if (sp === "fluffwing") s.gravity *= 0.8;                // floaty jumps
  if (sp === "glowmoth") s.magnet = 70;                    // pulls coins in
  if (sp === "pebblet") { s.mass = 1.25; s.inertia *= 1.5; s.engine *= 1.2; }   // heavy and steady
  if (sp === "zapling") s.vmax *= 1.12;                    // top speed
  return s;
}
export const CART_TRAIT = {
  mossling: "grippy tyres (climbs better)", emberpup: "hot engine (+15% power)", puddlet: "easy to tip in the air",
  fluffwing: "floaty jumps", glowmoth: "pulls coins in", pebblet: "heavy and steady", zapling: "higher top speed",
};

export function newCart(T, x = 60) {
  const a = Math.atan(slopeAt(T, x));
  return { x, y: groundY(T, x) + WHEEL_R + REST + 10, a, vx: 0, vy: 0, w: 0, spin: 0, comp: [0, 0], onGround: false, crashed: 0, crashes: 0, done: false, time: null, coins: 0, got: {}, airT: 0, flips: 0, lastA: a, rot: 0, fx: [] };
}
const rot = (a, p) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

// One physics step. input = { gas, brake } (held). t = race clock (for effects).
export function stepCart(c, s, T, input, t, coins) {
  if (c.done) return;
  c.lastT = t;
  if (c.crashed > 0) {
    c.crashed -= DT;
    if (c.crashed <= 0) respawn(c, T);
    return;
  }
  let fx = 0, fy = -s.gravity * s.mass, tq = 0;
  let grounded = 0;
  const contact = (p, wheel, idx) => {
    // p in body frame; wheels hang REST below their anchor
    const r = rot(c.a, p);
    const down = rot(c.a, { x: 0, y: -1 });
    const cx = c.x + r.x + (wheel ? down.x * REST : 0), cy = c.y + r.y + (wheel ? down.y * REST : 0);
    const rad = wheel ? WHEEL_R : 3;
    const n = normalAt(T, cx);
    const dist = (cy - groundY(T, cx)) * n.y;
    const pen = rad - dist;
    if (wheel) c.comp[idx] = Math.max(0, Math.min(REST, pen));
    if (pen <= 0) return;
    const px = cx - n.x * rad, py = cy - n.y * rad;
    const rx = px - c.x, ry = py - c.y;
    const vxp = c.vx - c.w * ry, vyp = c.vy + c.w * rx;
    const vn = vxp * n.x + vyp * n.y;
    const N = Math.max(0, s.k * s.mass * pen - s.damp * s.mass * vn);
    const tx = n.y, ty = -n.x;                              // along the ground, forward
    const vt = vxp * tx + vyp * ty;
    let Ft;
    if (wheel) {
      grounded++;
      if (input.gas) Ft = s.engine * s.mass * Math.max(0, 1 - (Math.max(0, vt) / s.vmax) ** 2);
      else if (input.brake) Ft = vt > 20 ? -s.engine * 1.4 * s.mass : -s.engine * 0.5 * s.mass * Math.max(0, 1 + vt / 120);
      else Ft = -vt * 0.4 * s.mass;                         // rolling resistance
      const lim = s.grip * N;
      Ft = Math.max(-lim, Math.min(lim, Ft));
    } else Ft = -Math.sign(vt) * Math.min(Math.abs(vt) * 4, 0.8 * N);   // bumpers scrape
    const Fx = N * n.x + Ft * tx, Fy = N * n.y + Ft * ty;
    fx += Fx; fy += Fy;
    // the ground's push acts at the contact point; the wheel's drive acts at the axle (keeps wheelies tame)
    const ax = wheel ? cx - c.x : rx, ay = wheel ? cy - c.y : ry;
    tq += rx * (N * n.y) - ry * (N * n.x) + ax * (Ft * ty) - ay * (Ft * tx);
  };
  contact(WHEELS[0], true, 0); contact(WHEELS[1], true, 1);
  for (const b of BUMPERS) contact(b, false);
  c.onGround = grounded > 0;
  // tip the cart: strong in the air, gentle on the ground (wheelies)
  const ctl = c.onGround ? 0.06 : 1;
  if (input.gas) tq += s.air * ctl;
  if (input.brake) tq -= s.air * ctl;
  const sp2 = Math.hypot(c.vx, c.vy);                           // air drag keeps downhill speed sane
  if (sp2 > 200) { const d = 0.0022 * (sp2 - 200) * s.mass; fx -= d * c.vx; fy -= d * c.vy; }
  c.vx += (fx / s.mass) * DT; c.vy += (fy / s.mass) * DT; c.w += (tq / s.inertia) * DT;
  c.w *= 1 - (c.onGround ? 1.2 : 0.5) * DT;
  c.x += c.vx * DT; c.y += c.vy * DT; c.a += c.w * DT;
  c.spin += (c.onGround ? c.vx : c.vx * 0.98) * DT / WHEEL_R;
  // flips (for fun): count full turns made in the air
  if (!c.onGround) { c.airT += DT; c.rot += c.a - c.lastA; } else { if (Math.abs(c.rot) > Math.PI * 1.7) { c.flips++; c.fx.push({ k: "flip", at: t, n: Math.round(Math.abs(c.rot) / (Math.PI * 2)) || 1 }); } c.rot = 0; c.airT = 0; }
  c.lastA = c.a;
  // crash: the driver's head touches the ground (or the cart sinks in)
  const hd = rot(c.a, HEAD);
  if (c.y + hd.y < groundY(T, c.x + hd.x) + 3 || c.y < groundY(T, c.x) - 8) crash(c, t);
  // stuck standing on its tail or lying on its back → counts as a crash after a moment
  const tilt = Math.abs(Math.atan2(Math.sin(c.a - Math.atan(slopeAt(T, c.x))), Math.cos(c.a - Math.atan(slopeAt(T, c.x)))));
  if (tilt > 1.25 && Math.hypot(c.vx, c.vy) < 45) { c.stuck = (c.stuck || 0) + DT; if (c.stuck > 1) crash(c, t); } else c.stuck = 0;
  // coins
  if (coins) for (const k of coins) {
    if (c.got[k.id] || Math.abs(k.x - c.x) > 80 + s.magnet) continue;
    if (Math.hypot(k.x - c.x, k.y - (c.y + 14)) < 34 + s.magnet) { c.got[k.id] = true; c.coins++; }
  }
  c.fx = c.fx.filter(f => t - f.at < 1.5);
  if (c.x >= T.len) { c.done = true; c.time = t; }
}

function crash(c, t) {
  c.crashed = RESPAWN_SECS; c.crashes++; c.stuck = 0; c.crashX = c.x; c.fx.push({ k: "crash", at: t });
  // third crash at the same spot: the neighbours give you a push past it (so nobody gets stuck watching)
  c.spots = [...(c.spots || []), c.x].slice(-3);
  c.push = c.spots.length === 3 && c.spots.every(x => Math.abs(x - c.x) < 350);
  if (c.push) c.spots = [];
  c.vx = 0; c.vy = 0; c.w = 0;
}
function respawn(c, T) {
  const x = c.push ? Math.min(T.len - 50, (c.crashX ?? c.x) + 280) : Math.max(60, (c.crashX ?? c.x) - RESPAWN_BACK);
  if (c.push) c.fx.push({ k: "push", at: c.lastT || 0 });
  c.push = false;
  c.x = x; c.a = Math.atan(slopeAt(T, x)); c.y = groundY(T, x) + WHEEL_R + REST + 8;
  c.vx = Math.cos(c.a) * 40; c.vy = 0; c.w = 0; c.rot = 0; c.lastA = c.a; c.crashed = 0;
}

// Body-frame helpers for drawing.
export const cartParts = { WHEELS, BUMPERS, HEAD };
export const wheelCenters = (c) => WHEELS.map((p, i) => {
  const r = rot(c.a, p), d = rot(c.a, { x: 0, y: -1 }), k = REST - (c.comp?.[i] || 0);
  return { x: c.x + r.x + d.x * k, y: c.y + r.y + d.y * k };
});

// ── Neighbours' racers: a steady pace that slows on climbs (same on both screens) ──
const NPC_NAMES = ["Rusty", "Clover", "Turbo", "Maple", "Bolt", "Pip", "Biscuit", "Nova"];
export function makeNpcs(seed, mapIdx) {
  const r = mulberry(seed * 17 + 5), sp = Object.keys(SPECIES);
  return MAPS[mapIdx].npc.map(v => ({ npc: true, name: NPC_NAMES[Math.floor(r() * NPC_NAMES.length)], species: sp[Math.floor(r() * sp.length)], hue: Math.floor(r() * 360), v: v * (0.97 + r() * 0.06), ph: r() * 6 }));
}
// distance after t seconds: starts a little slow, wobbles
export const npcX = (n, t) => (t <= 0 ? 0 : n.v * (t - 1.2 * (1 - Math.exp(-t / 1.2))) + 40 * Math.sin(t * 0.21 + n.ph) - 40 * Math.sin(n.ph));
export function npcTime(n, len) { let lo = 0, hi = RACE_MAX * 3; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (npcX(n, m) >= len) hi = m; else lo = m; } return hi; }

// ── Race flow (host) ──────────────────────────────────────────────────────────
export const PLACE_COINS = [90, 50, 30, 12];
export function newHill(seed) {
  return { v: 1, phase: "lobby", seed, map: 0, t: 0, players: [blank(), null], npcs: makeNpcs(seed, 0) };
}
const blank = () => ({ cid: null, round: 0, x: 0, y: 0, a: 0, done: false, time: null, crashes: 0, coins: 0, crashed: 0 });
export function hillAct(st, slot, i) {
  if (i.k === "join") { if (st.players[1]) return false; st.players[1] = blank(); return true; }
  const p = st.players[slot];
  if (!p) return false;
  if (i.k === "pick" && st.phase === "lobby") { if (st.players[1 - slot]?.cid === i.cid) return false; st.players[slot] = { ...p, cid: i.cid }; return true; }
  if (i.k === "start" && slot === 0 && st.phase === "lobby" && st.players.every(x => !x || x.cid)) { st.phase = "count"; st.t = 0; return true; }
  if (i.k === "quit" && slot === 0) { st.phase = "end"; st.result = { quit: true, entries: [] }; return true; }
  return false;
}
export function hillTick(st, dt, world) {
  if (st.phase === "count") { st.t += dt; if (st.t >= COUNTDOWN) { st.phase = "race"; st.t = 0; return true; } return false; }
  if (st.phase !== "race") return false;
  st.t += dt;
  if (st.players.filter(Boolean).every(p => p.done) || st.t >= RACE_MAX) { finishHill(st, world); return true; }
  return false;
}
function finishHill(st, world) {
  st.phase = "end";
  const len = MAPS[st.map].len, entries = [];
  st.players.forEach((p, slot) => {
    if (!p) return;
    const c = world?.creatures?.[p.cid];
    entries.push({ slot, cid: p.cid, name: c?.name || "?", species: c?.species || "mossling", traits: c?.traits || { hue: 0 }, time: p.done ? p.time : null, x: p.x, crashes: p.crashes || 0, coins: p.coins || 0 });
  });
  for (const n of st.npcs) entries.push({ npc: true, name: n.name, species: n.species, traits: { hue: n.hue, size: 1 }, time: npcTime(n, len) });
  entries.sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9) || (b.x || 0) - (a.x || 0));
  entries.forEach((e, i) => { e.place = i + 1; e.ribbon = ["gold", "silver", "bronze"][i] || "green"; if (!e.npc) { e.prize = PLACE_COINS[Math.min(3, i)] + e.coins * MAPS[st.map].coinsPer; } });
  st.result = { entries, map: st.map };
}