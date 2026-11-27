// src/Pages/Arcade/games/creature-farm/farmWorld.js
//
// The farm's saved world + every rule that changes it, in one PURE reducer
// (runs identically on both devices — see useArcadeWorld). No drawing here.
//
// Time (real time now — the Ranch keeps running):
//   • The host sends a "tick" once a second. The reducer works out how much
//     real time passed since the world's `simAt` and runs the farm forward.
//   • Coming back after a while: the first tick catches up (up to 24 hours,
//     see ranch.js) and leaves a "while you were away" report.
//   • Crops grow on real time (timestamps).
//   • Visitors only arrive while someone is actually playing.
//
// The Ranch (creatures as workers: needs, skills, jobs, buddies, buildings,
// coins) lives in ranch.js.
//
// Randomness: actions carry `r` (a random number picked by whoever sent it),
// and the reducer seeds a tiny PRNG from it — so both devices roll the same dice.

import { SPECIES, CROPS, PERSONALITIES, NAMES } from "./species";
import {
  ranchDefaults, ranchify, simulateRanch, CATCHUP_MAX, JOBS, canManage, nextUpgrade, troughCap, STORE_ITEMS,
  ITEMS, SKILLS, WORKSHOPS, BUILDINGS, nextWorkshop, hasGoods, capFor, priceOf, buyPriceOf, canBuy, sellNow, finishCrafts,
  makeContract, giveToContract, CONTRACT_MAX, CONTRACT_GAP, HAND_CRAFT, fmtCoins, missingInputs,
  housedCount, penSlots, penCost, rehomePrice, PEN_START, addSkillXp, store,
} from "./ranch";
import { wildEgg, hatcheryCost, HATCHERY_MAX, RARITY_INFO, RARITY, startEgg, hatcheryUpgrade } from "./eggs";

// ── Map (world units; the canvas scales to fit) ──────────────────────────────
export const WORLD_W = 960;
export const WORLD_H = 600;
export const MAP = {
  wildEdge: 74,                                   // trees above this line; visitors come from here
  house: { x: 70,  y: 120, w: 150, h: 110 },
  store: { x: 145, y: 300 },                      // the shared food crate
  field: { x: 560, y: 100, cols: 4, rows: 4, size: 58, gap: 12 },   // the first 16 plots
  east:  { x: 990, y: 100, rows: 6 },             // plot 17 onward: new land, column by column to the east
  pen:   { x: 330, y: 400, w: 440, h: 170 },
  sign:  { x: 470, y: 335 },                      // run board signpost (go on runs like Critter Stampede)
  trough: { x: 270, y: 470 },                     // feeding trough (creatures eat from it on their own)
  stall: { x: 60, y: 420 },                       // market stall (once built)
  meadow: { x: 250, y: 96, w: 290, h: 46 },       // creatures without a pen spot wait here, under the trees
  workshops: {                                    // each appears once it's built
    kitchen: { x: 900, y: 185 },
    juicer:  { x: 205, y: 545 },
    bakery:  { x: 900, y: 300 },
    kiln:    { x: 872, y: 432 },
    loom:    { x: 872, y: 540 },
    lantern: { x: 110, y: 545 },
  },
  spawn: [{ x: 230, y: 320 }, { x: 270, y: 345 }],
  hatcheries: [{ x: 300, y: 215 }, { x: 395, y: 215 }, { x: 300, y: 300 }, { x: 395, y: 300 }],   // one per hatchery you build
};
export const PLOT_COUNT = MAP.field.cols * MAP.field.rows;   // the home field (16); land keeps going east after that
// Little hutches along the back of the pen, one per pen spot (the first 20 are drawn).
export function hutchSpots() {
  const p = MAP.pen, out = [];
  for (const row of [0, 1]) for (let x = p.x + 22; x <= p.x + p.w - 20; x += 30) {
    if (x > p.x + 40 && x < p.x + 150) continue;           // keep the gate clear
    out.push({ x, y: p.y + 30 + row * 30 });
  }
  return out;
}

// Price of plot number n (you start with 1). The home field is cheap; new land gets pricier.
export const plotCost = (n) => (n <= PLOT_COUNT ? Math.round(3 * Math.pow(1.25, n - 2)) : Math.round(100 * Math.pow(1.1, n - PLOT_COUNT)));
// The farm's width: grows east as you buy land (room for the next plot for sale too).
export function worldWidth(w) {
  const n = (w?.plots?.length || 1) + 1;
  if (n <= PLOT_COUNT) return WORLD_W;
  const step = MAP.field.size + MAP.field.gap;
  return MAP.east.x + Math.ceil((n - PLOT_COUNT) / MAP.east.rows) * step + 50;
}
export const REACH = 50;                          // how close you need to be to interact

export function plotRect(i) {
  const f = MAP.field, step = f.size + f.gap;
  let x, y;
  if (i < PLOT_COUNT) { x = f.x + (i % f.cols) * step; y = f.y + Math.floor(i / f.cols) * step; }
  else { const k = i - PLOT_COUNT, e = MAP.east; x = e.x + Math.floor(k / e.rows) * step; y = e.y + (k % e.rows) * step; }
  return { x, y, w: f.size, h: f.size, cx: x + f.size / 2, cy: y + f.size / 2 };
}

// ── Tuning ────────────────────────────────────────────────────────────────────
export const DAY_LEN         = 1200;              // real seconds per in-game day (20 minutes)
export const VISIT_MAX       = 150;               // seconds a visitor hangs around
export const MAX_VISITORS    = 2;                 // at most this many wild visitors at once
export const LURE_WAIT       = 12;                // avg seconds a ripe lure waits before something shows up
export const BEFRIEND_SECS   = { withFood: 7, withoutFood: 14 };
export const PET_COOLDOWN_MS = 8000;
export const FOLLOW_BOND     = 50;                // bond needed to make someone else's creature follow you
export const FEED_BELOW      = 85;                // creatures refuse food when fuller than this

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;

function rngFrom(r) {                              // mulberry32
  let s = (Math.floor((Number(r) || 0.5) * 4294967296) >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
// a name nobody on the farm has yet (falls back to any name once they're all used)
function freshName(rng, w) {
  const used = new Set([...Object.values(w.creatures || {}), ...(w.visitors || [])].map(c => c.name));
  const free = NAMES.filter(n => !used.has(n));
  return pick(rng, free.length ? free : NAMES);
}

export const growth = (crop, now) => clamp((now - crop.at) / CROPS[crop.kind].grow, 0, 1);

function rollTraits(species, rng) {
  const sp = SPECIES[species];
  return {
    hue: (sp.hue + Math.round((rng() - 0.5) * 50) + 360) % 360,
    size: r2(0.85 + rng() * 0.35),
    personality: pick(rng, Object.keys(PERSONALITIES)),
  };
}

function addLog(log, a, text, kind = "info") {
  return [{ t: a.t, by: a.by != null ? String(a.by) : null, text, kind }, ...(log || [])].slice(0, 12);
}

// Where a visitor is, worked out from its age (no streaming needed).
export function visitorPos(v, age) {
  const ARRIVE = 5;
  if (age < ARRIVE) {
    const k = 1 - Math.pow(1 - age / ARRIVE, 2);
    return { x: v.sx + (v.tx - v.sx) * k, y: 30 + (v.ty - 30) * k, face: v.tx >= v.sx ? 1 : -1 };
  }
  const x = v.tx + Math.sin(age * 0.6 + v.seed) * 28;
  const y = v.ty + Math.cos(age * 0.45 + v.seed * 1.3) * 16;
  return { x, y, face: Math.cos(age * 0.6 + v.seed) >= 0 ? 1 : -1 };
}

// Where a creature wanders inside the pen (cosmetic, same on both devices).
// The pen is split into a 7×3 grid of home spots; creature number n gets spot
// (n × 8) mod 21, which scatters new arrivals across the pen instead of
// stacking them. Each one wanders a little around its spot.
const PEN_COLS = 7, PEN_ROWS = 3, PEN_SLOTS = PEN_COLS * PEN_ROWS;
export function penPos(c, tSec) {
  const n = parseInt(String(c.id).replace(/\D/g, ""), 10) || 1;
  const p = MAP.pen;
  const slot = (n * 8) % PEN_SLOTS;
  const lap = Math.floor(n / PEN_SLOTS);                 // 22nd+ creature: nudge so it doesn't sit exactly on another
  const col = slot % PEN_COLS, row = Math.floor(slot / PEN_COLS);
  const cellW = (p.w - 70) / PEN_COLS, cellH = (p.h - 48) / PEN_ROWS;
  const bx = p.x + 35 + cellW * (col + 0.5) + (lap % 2 ? cellW * 0.4 : 0);
  const by = p.y + 40 + cellH * (row + 0.5) + (lap % 2 ? cellH * 0.3 : 0);
  const ph = n * 1.7;
  const x = clamp(bx + Math.sin(tSec * 0.35 + ph) * 12, p.x + 25, p.x + p.w - 25);
  const y = clamp(by + Math.cos(tSec * 0.27 + ph * 1.3) * 4, p.y + 35, p.y + p.h - 10);
  return { x, y, face: Math.cos(tSec * 0.35 + ph) >= 0 ? 1 : -1 };
}

// Where a creature is this frame, based on what it's doing (cosmetic, same on both devices):
//   foragers roam the forest edge, farmhands work the field, feeders shuttle
//   between the food crate and the trough, groomers bustle around the pen,
//   tired creatures nap by the house, everyone else hangs out in the pen.
export function workerPos(c, tSec, state, plotCount = PLOT_COUNT) {
  const n = parseInt(String(c.id).replace(/\D/g, ""), 10) || 1;
  const ph = n * 1.7;
  if (state === "meadow") {                        // waiting for a pen spot: mooching about under the trees
    const m = MAP.meadow;
    const bx = m.x + ((n * 53) % m.w), by = m.y + ((n * 19) % m.h);
    return { x: clamp(bx + Math.sin(tSec * 0.25 + ph) * 18, m.x, m.x + m.w), y: by + Math.cos(tSec * 0.2 + ph) * 5, face: Math.cos(tSec * 0.25 + ph) >= 0 ? 1 : -1, moving: false };
  }
  const pingPong = (speed, off) => { const u = (tSec * speed + off) % 2; return u > 1 ? { u: 2 - u, dir: -1 } : { u, dir: 1 }; };
  if (state === "working" && c.job === "forager") {
    const { u, dir } = pingPong(0.035, n * 0.37);
    return { x: 290 + u * 620, y: MAP.wildEdge + 22 + Math.sin(tSec * 0.9 + ph) * 8, face: dir, moving: true };
  }
  if (state === "working" && c.job === "farmhand") {
    const r = plotRect((n * 5) % Math.max(1, plotCount));
    return { x: r.cx + Math.sin(tSec * 0.6 + ph) * 26, y: r.y + r.h + 4, face: Math.cos(tSec * 0.6 + ph) >= 0 ? 1 : -1, moving: true };
  }
  if (state === "working" && c.job === "feeder") {
    const { u, dir } = pingPong(0.09, n * 0.3);
    const a = MAP.store, b = MAP.trough;
    return { x: a.x + 30 + (b.x - a.x - 30) * u, y: a.y + 20 + (b.y - 10 - a.y - 20) * u, face: dir, moving: true };
  }
  if (state === "working" && c.job === "groomer") return { ...penPos(c, tSec * 3.5), moving: true };
  if (state === "working" && c.job === "crafter" && MAP.workshops[c.station]) {
    const ws = MAP.workshops[c.station];
    const side = n % 2 ? 1 : -1;                                   // beside the workshop, not in front of it
    return { x: ws.x + side * (46 + Math.sin(tSec * 1.3 + ph) * 4), y: ws.y + 18 + ((n * 7) % 10), face: -side, moving: true };
  }
  if ((state === "nesting" || (state === "working" && c.job === "carer")) && MAP.hatcheries.length) {
    const hid = state === "nesting" ? c.nest : c.station;
    const h = MAP.hatcheries[Math.max(0, (parseInt(String(hid).replace(/\D/g, ""), 10) || 1) - 1) % MAP.hatcheries.length];
    const side = state === "nesting" ? (n % 2 ? 1 : -1) : 0;
    return { x: h.x + side * 30 + Math.sin(tSec * 0.8 + ph) * 3, y: h.y + 26 + (side ? 0 : 6), face: side ? -side : 1, moving: false };
  }
  if (state === "working" && c.job === "hauler") {
    const { u, dir } = pingPong(0.07, n * 0.41);
    const a = MAP.store, b = MAP.stall;
    return { x: a.x - 20 + (b.x + 10 - a.x + 20) * u, y: a.y + 22 + (b.y + 30 - a.y - 22) * u, face: -dir, moving: true };
  }
  if (state === "resting") {
    const h = MAP.house;
    return { x: h.x + 14 + ((n * 37) % (h.w - 10)), y: h.y + h.h + 26 + ((n * 13) % 14), face: n % 2 ? 1 : -1, moving: false };
  }
  return { ...penPos(c, tSec), moving: false };
}

function makeVisitor(species, rng, n, near, w) {
  // Somewhere in the open grass, pulled toward the crop that lured it.
  const tx = clamp((280 + rng() * 640) * 0.5 + near.x * 0.5, 260, WORLD_W - 50);
  const ty = clamp(110 + rng() * 260, 110, 370);
  return {
    id: `v${n}`, species, name: w ? freshName(rng, w) : pick(rng, NAMES), traits: rollTraits(species, rng),
    sx: clamp(tx + (rng() - 0.5) * 240, 40, WORLD_W - 40), tx, ty, seed: r2(rng() * 6.28),
    age: 0, trust: 0, helpers: {},
  };
}

// ── World ─────────────────────────────────────────────────────────────────────
export function initFarm() {
  return {
    v: 4,
    ...ranchDefaults(),
    day: 1,
    dayTime: 0,
    nextId: 1,
    food: { berry: 2, carrot: 2 },                // a little to start, so the first befriend works
    plots: [null],                                // { kind, at, by } | null — you start with 1 plot and buy more
    creatures: {},                                // id → creature
    visitors: [],                                 // wild creatures on the farm right now
    starters: {},                                 // userId → creature id
    log: [],
  };
}

// A new creature joins: ranch fields, and a pen spot if one is free (otherwise it waits in the meadow).
function arrive(w, c, a) {
  return { ...ranchify(c, rngFrom(((Number(a.r) || 0.5) * 7.31) % 1)), housed: housedCount(w) < penSlots(w) };
}

// Old saves (before the Ranch, or before Phase 2) get the new fields filled in.
function ensureRanch(w, a) {
  if (w.v >= 5 && w.simAt != null && Object.values(w.creatures).every(c => c.skills && SKILLS.every(s => c.skills[s] != null))) return w;
  const rng = rngFrom(a.r ?? 0.42);
  const creatures = {};
  const before = (w.v || 1) < 4;                       // farms from before pen spots: everyone keeps a spot
  for (const c of Object.values(w.creatures)) creatures[c.id] = { ...ranchify(c, rng), ...(before ? { housed: true } : {}) };
  const d = ranchDefaults();
  return {
    ...d, ...w, v: 5, creatures,
    hatcheries: w.hatcheries?.length ? w.hatcheries : d.hatcheries,   // v5: every farm gets its first Hatchery free
    penSlots: before ? Math.max(PEN_START, Object.keys(w.creatures).length) : (w.penSlots || PEN_START),
    buildings: { ...d.buildings, ...(w.buildings || {}) },
    trough: { ...d.trough, ...(w.trough || {}) },
    keep: w.keep || d.keep,
    simAt: w.simAt ?? a.t,
  };
}

// ── Rules ─────────────────────────────────────────────────────────────────────
export function farmReducer(w0, a) {
  const w = ensureRanch(w0, a);
  const by = a.by != null ? String(a.by) : null;

  switch (a.type) {
    // Host sends this every second of play.
    case "tick": {
      const real = clamp((a.t - w.simAt) / 1000, 0, CATCHUP_MAX);
      if (real < 0.2) return w;
      if (w.stampede && a.t - w.stampede.at > 15 * 60 * 1000) {    // a Stampede crew that never got sent home (closed tab)
        const creatures = { ...w.creatures };
        for (const id of w.stampede.cids) if (creatures[id]?.away === "stampede") creatures[id] = { ...creatures[id], away: false };
        return farmReducer({ ...w, creatures, stampede: null, log: addLog(w.log, a, "The Stampede crew wandered home on their own", "day") }, a);
      }
      if (w.wilds && a.t - w.wilds.at > 40 * 60 * 1000) {        // a trip that never came back (closed tab): everyone walks home
        const creatures = { ...w.creatures };
        for (const id of w.wilds.squad) if (creatures[id]) creatures[id] = { ...creatures[id], away: false, energy: 30 };
        const food = { ...w.food };
        for (const [k, n] of Object.entries(w.wilds.rations || {})) food[k] = (food[k] || 0) + n;
        return farmReducer({ ...w, creatures, food, wilds: null, log: addLog(w.log, a, "The Wilds squad wandered home on their own", "day") }, a);
      }
      const live = real <= 5;
      const dt = real;
      const rng = rngFrom(a.r);
      let { day, dayTime, nextId, log } = w;

      dayTime += dt;
      if (dayTime >= DAY_LEN) {
        const passed = Math.floor(dayTime / DAY_LEN);
        dayTime -= passed * DAY_LEN; day += passed;
        if (live) log = addLog(log, a, `Day ${day} begins`, "day");
      }

      // the Ranch: needs, eating, jobs, skills, storage (works on copies)
      const sim = {
        ...w,
        creatures: Object.fromEntries(Object.values(w.creatures).map(c => [c.id, { ...c }])),
        food: { ...w.food }, trough: { ...w.trough }, plots: w.plots.slice(), buildings: { ...w.buildings },
        market: { ...w.market }, keep: { ...w.keep },
        workshops: Object.fromEntries(Object.entries(w.workshops || {}).map(([k, v]) => [k, { ...v }])),
        contracts: (w.contracts || []).map(c => ({ ...c })),
        hatcheries: (w.hatcheries || []).map(h => ({ ...h, egg: h.egg ? { ...h.egg } : null })),
      };
      const report = simulateRanch(sim, dt, a.t, !live && dt > 120);
      nextId = Math.max(nextId || 1, sim.nextId || 1);                // hatching babies take ids too
      const creatures = {};
      for (const c of Object.values(sim.creatures)) creatures[c.id] = { ...c, hunger: r2(c.hunger), happy: r2(c.happy), energy: r2(c.energy) };
      for (const msg of sim._levelUps || []) log = addLog(log, a, msg, "catch");
      for (const msg of sim._news || []) log = addLog(log, a, msg, "catch");
      for (const ct of sim._contractsDone || []) log = addLog(log, a, `A Hauler finished a contract: ${ct.n} ${ITEMS[ct.item].name.toLowerCase()} for ${ct.reward} coins`, "catch");

      // contracts: drop expired ones, post new ones now and then (all at once after being away)
      let contracts = sim.contracts.filter(ct => {
        if (ct.until > a.t) return true;
        if (live) log = addLog(log, a, `The contract for ${ct.n} ${ITEMS[ct.item].name.toLowerCase()} ran out of time`, "flee");
        return false;
      });
      let { contractAt = 0, nextContract = 1 } = w;
      if (Object.keys(w.creatures).length && contracts.length < CONTRACT_MAX && a.t >= contractAt) {
        const want = live ? 1 : CONTRACT_MAX - contracts.length;
        for (let i = 0; i < want; i++) contracts = [...contracts, makeContract(sim, rng, a.t, nextContract++)];
        contractAt = a.t + CONTRACT_GAP * 1000;
        if (live) log = addLog(log, a, `New contract: ${contracts[contracts.length - 1].n} ${ITEMS[contracts[contracts.length - 1].item].name.toLowerCase()}`, "visit");
      }

      const ranchOut = {
        food: sim.food, trough: sim.trough, coins: Math.round(sim.coins * 100) / 100, simAt: a.t,
        market: Object.fromEntries(Object.entries(sim.market).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
        workshops: sim.workshops, contracts, contractAt, nextContract,
        hatcheries: sim.hatcheries, dex: sim.dex || w.dex || {}, nextId,
        ...(report ? { report: { ...report, from: w.simAt, to: a.t } } : {}),
      };
      if (!live) {
        // came back after a while: no visitors pile up, just the farm's work
        const mins = Math.round(dt / 60);
        if (mins >= 1) log = addLog(log, a, mins >= 120 ? `The farm kept going for ${Math.round(mins / 60)} hours` : `The farm kept going for ${mins} minute${mins > 1 ? "s" : ""}`, "day");
        return { ...w, ...ranchOut, day, dayTime: r2(dayTime), creatures, plots: sim.plots, visitors: [], log };
      }

      const visitors = [];
      for (const v of w.visitors) {
        const age = r2(v.age + dt);
        if (age > VISIT_MAX) { log = addLog(log, a, `${v.name} the ${SPECIES[v.species].name} wandered off`, "flee"); continue; }
        visitors.push({ ...v, age });
      }

      // Ripe lure crops pull visitors in ONE at a time, after a random wait,
      // and only while there's room (MAX_VISITORS) — so they trickle in.
      const plots = sim.plots;
      const ripeLures = [];
      for (let i = 0; i < plots.length; i++) {
        const crop = plots[i];
        if (crop && CROPS[crop.kind].type === "lure" && growth(crop, a.t) >= 1 &&
            Object.keys(SPECIES).some(k => SPECIES[k].lure === crop.kind)) ripeLures.push(i);
      }
      if (ripeLures.length && visitors.length < MAX_VISITORS && rng() < dt / LURE_WAIT) {
        const i = ripeLures[Math.floor(rng() * ripeLures.length) % ripeLures.length];
        const crop = plots[i];
        const options = Object.keys(SPECIES).filter(k => SPECIES[k].lure === crop.kind);
        const pr = plotRect(i);
        const v = makeVisitor(pick(rng, options), rng, nextId++, { x: pr.cx, y: pr.cy }, { creatures, visitors });
        visitors.push(v);
        plots[i] = null;
        log = addLog(log, a, `${v.name} the ${SPECIES[v.species].name} smelled the ${CROPS[crop.kind].name.toLowerCase()}`, "visit");
      }

      // Now and then something wanders in on its own (the only way to meet some creatures).
      if (visitors.length === 0 && rng() < dt / 240) {
        const wild = Object.keys(SPECIES).filter(k => !SPECIES[k].starter);
        const v = makeVisitor(pick(rng, wild), rng, nextId++, { x: 300 + rng() * 500, y: 120 + rng() * 200 }, { creatures, visitors });
        visitors.push(v);
        log = addLog(log, a, `A wild ${SPECIES[v.species].name} wandered in!`, "visit");
      }

      return { ...w, ...ranchOut, day, dayTime: r2(dayTime), nextId, creatures, visitors, plots, log };
    }

    case "choose_starter": {
      if (!by || w.starters[by] || !SPECIES[a.species]?.starter) return w;
      const rng = rngFrom(a.r);
      const id = `c${w.nextId}`;
      const c = {
        id, species: a.species, name: freshName(rng, w), traits: rollTraits(a.species, rng),
        hunger: 90, happy: 70, bond: { [by]: 30 }, owner: by, follow: by, born: a.t, petAt: 0,
      };
      return {
        ...w, nextId: w.nextId + 1,
        creatures: { ...w.creatures, [id]: arrive(w, c, a) },
        starters: { ...w.starters, [by]: id },
        log: addLog(w.log, a, `picked ${c.name} the ${SPECIES[c.species].name}`, "starter"),
      };
    }

    case "plant": {
      if (!(a.i >= 0 && a.i < w.plots.length) || w.plots[a.i] || !CROPS[a.kind]) return w;
      const plots = w.plots.slice();
      plots[a.i] = { kind: a.kind, at: a.t, by };
      return { ...w, plots };
    }

    case "harvest": {
      const crop = w.plots[a.i];
      if (!crop || CROPS[crop.kind].type !== "food" || growth(crop, a.t) < 1) return w;
      const plots = w.plots.slice();
      plots[a.i] = null;
      const k = crop.kind;
      return { ...w, plots, food: { ...w.food, [k]: (w.food[k] || 0) + CROPS[k].yield } };
    }

    // Holding "offer" next to a visitor. s = seconds held since the last offer.
    case "offer": {
      const idx = w.visitors.findIndex(v => v.id === a.vid);
      if (idx < 0 || !by) return w;
      const v = w.visitors[idx];
      const sp = SPECIES[v.species];
      const hasFav = (w.food[sp.food] || 0) > 0;
      const pers = v.traits.personality;
      const mult = pers === "shy" ? 0.7 : pers === "bold" ? 1.4 : pers === "grumpy" ? 0.8 : 1;
      const add = (100 / (hasFav ? BEFRIEND_SECS.withFood : BEFRIEND_SECS.withoutFood)) * clamp(Number(a.s) || 0, 0, 1) * mult;
      const helpers = { ...v.helpers, [by]: r2((v.helpers[by] || 0) + add) };
      const trust = r2(v.trust + add);

      if (trust < 100) {
        const visitors = w.visitors.slice();
        visitors[idx] = { ...v, trust, helpers };
        return { ...w, visitors };
      }

      // Befriended! Whoever helped most becomes its person; every helper gets some bond.
      const total = Object.values(helpers).reduce((s, n) => s + n, 0) || 1;
      const owner = Object.entries(helpers).sort((x, y) => y[1] - x[1])[0][0];
      const bond = {};
      for (const [uid, amt] of Object.entries(helpers)) bond[uid] = Math.round(20 + 30 * (amt / total));
      const id = `c${w.nextId}`;
      const c = {
        id, species: v.species, name: v.name, traits: v.traits,
        hunger: 60, happy: 55, bond, owner, follow: null, born: a.t, petAt: 0,
      };
      const food = hasFav ? { ...w.food, [sp.food]: w.food[sp.food] - 1 } : w.food;
      return {
        ...w, food, nextId: w.nextId + 1,
        visitors: w.visitors.filter(x => x.id !== v.id),
        creatures: { ...w.creatures, [id]: arrive(w, c, a) },
        log: addLog(w.log, { ...a, by: owner }, `befriended ${c.name} the ${sp.name}!`, "catch"),
      };
    }

    // Rushing up to a visitor scares it.
    case "spook": {
      const idx = w.visitors.findIndex(v => v.id === a.vid);
      if (idx < 0) return w;
      const v = w.visitors[idx];
      if (v.traits.personality === "sleepy" || v.trust <= 0) return w;
      const visitors = w.visitors.slice();
      visitors[idx] = { ...v, trust: r2(Math.max(0, v.trust - 20)) };
      return { ...w, visitors };
    }

    case "feed": {
      const c = w.creatures[a.cid];
      if (!c || !by) return w;
      const fav = SPECIES[c.species].food;
      let foodKey = (w.food[fav] || 0) >= 1 ? fav : STORE_ITEMS.find(k => (w.food[k] || 0) >= 1);
      if (!foodKey || c.hunger >= FEED_BELOW) return w;          // not hungry → don't waste food
      const loved = foodKey === fav;
      const grumpy = c.traits.personality === "grumpy";
      const next = {
        ...c,
        hunger: r2(Math.min(100, c.hunger + (loved ? 45 : 30))),
        happy: r2(Math.min(100, c.happy + (loved ? 12 : 4) * (grumpy ? 0.6 : 1))),
        bond: { ...c.bond, [by]: Math.min(100, (c.bond[by] || 0) + 5) },
      };
      return { ...w, food: { ...w.food, [foodKey]: w.food[foodKey] - 1 }, creatures: { ...w.creatures, [c.id]: next } };
    }

    case "pet": {
      const c = w.creatures[a.cid];
      if (!c || !by || a.t - (c.petAt || 0) < PET_COOLDOWN_MS) return w;
      const playful = c.traits.personality === "playful";
      const next = {
        ...c, petAt: a.t,
        happy: r2(Math.min(100, c.happy + (playful ? 12 : 8))),
        bond: { ...c.bond, [by]: Math.min(100, (c.bond[by] || 0) + (playful ? 5 : 3)) },
      };
      return { ...w, creatures: { ...w.creatures, [c.id]: next } };
    }

    // Bring a creature home from a run (e.g. Critter Stampede). It joins the pen as yours.
    case "adopt": {
      if (!by || !SPECIES[a.species]) return w;
      const rng = rngFrom(a.r);
      const id = `c${w.nextId}`;
      const traits = {
        hue: Number.isFinite(a.hue) ? ((Math.round(a.hue) % 360) + 360) % 360 : SPECIES[a.species].hue,
        size: Number.isFinite(a.size) ? clamp(r2(a.size), 0.7, 1.4) : 1,
        personality: pick(rng, Object.keys(PERSONALITIES)),
        ...(a.rare ? { rare: true } : {}),
      };
      const c = {
        id, species: a.species, name: freshName(rng, w), traits,
        hunger: 70, happy: 70, bond: { [by]: 40 }, owner: by, follow: null, born: a.t, petAt: 0,
      };
      return {
        ...w, nextId: w.nextId + 1,
        creatures: { ...w.creatures, [id]: arrive(w, c, a) },
        log: addLog(w.log, a, `brought ${c.name} the ${a.rare ? "golden " : ""}${SPECIES[c.species].name} home from a run!`, "catch"),
      };
    }

    // Beat a Critter Stampede level — unlocks the next one for this farm (both players).
    case "run_won": {
      if (!["easy", "medium", "hard"].includes(a.level)) return w;
      const beaten = w.runsBeaten || {};
      if (beaten[a.level]) return w;
      return {
        ...w, runsBeaten: { ...beaten, [a.level]: true },
        log: addLog(w.log, a, `beat Critter Stampede on ${a.level}!`, "catch"),
      };
    }

    // Critter Stampede rewards (sent once by the run host): coins, the goods the
    // herd made, and the Goop King's egg.
    case "run_loot": {
      if (!by || !["easy", "medium", "hard"].includes(a.level)) return w;
      const x = { ...w, food: { ...w.food }, market: { ...w.market } };
      // the crew comes home with some Fight practice (3× the run time)
      const back = new Set([...(a.crew || []), ...(w.stampede?.cids || [])]);
      if (back.size) {
        x.creatures = { ...w.creatures };
        for (const id of back) {
          const c = x.creatures[id];
          if (!c || c.away !== "stampede") continue;
          const nc = { ...c, skills: { ...c.skills }, xp: { ...(c.xp || {}) }, away: false, resting: false };
          if ((a.crew || []).includes(id)) addSkillXp(nc, "fight", Math.min(3600, Math.max(0, Number(a.secs) || 0) * 3));
          x.creatures[id] = nc;
        }
        x.stampede = null;
      }
      if (!(Number(a.coins) > 0) && !Object.keys(a.goods || {}).length && !a.egg) return { ...x, log: addLog(w.log, a, "The Stampede crew came home", "info") };
      for (const [k, n] of Object.entries(a.goods || {})) if (ITEMS[k] && n > 0) store(x, k, Math.min(5000, Math.floor(n)), null);
      x.coins = Math.round((x.coins + Math.max(0, Math.min(5000, Number(a.coins) || 0))) * 100) / 100;
      let log = w.log, nextId = w.nextId;
      if (RARITY.includes(a.egg)) {
        const rng = rngFrom(((Number(a.r) || 0.5) * 6.1 + nextId * 0.19) % 1);
        x.eggs = [...(w.eggs || []), { id: `e${nextId++}`, ...wildEgg(a.egg, rng), by, name: freshName(rng, w) }];
        log = addLog(log, a, `brought home a ${RARITY_INFO[a.egg].name.toLowerCase()} egg from Critter Stampede! (put it in a Hatchery)`, "catch");
      }
      const goodsN = Object.values(a.goods || {}).reduce((s, n) => s + (Number(n) || 0), 0);
      log = addLog(log, a, `Critter Stampede paid out ${Math.round(Number(a.coins) || 0)} coins and ${goodsN} goods`, "catch");
      return { ...x, nextId, log };
    }

    // Your Stampede crew: up to 3 of your own grown-ups that start runs in your herd.
    case "set_crew": {
      if (!by) return w;
      const cids = (a.cids || []).filter(id => { const c = w.creatures[id]; return c && canManage(c, by) && c.grow == null; }).slice(0, 3);
      return { ...w, crew: { ...(w.crew || {}), [by]: cids } };
    }
    // A Stampede run started: the crew is out (no farm work) until run_loot brings them back.
    case "stampede_go": {
      if (!by) return w;
      const ids = (a.cids || []).filter(id => { const c = w.creatures[id]; return c && (!c.away || c.away === "stampede") && !c.nest && !c.follow && c.grow == null; });   // never the creature you run as
      if (!ids.length) return w;
      const creatures = { ...w.creatures };
      for (const id of ids) creatures[id] = { ...creatures[id], away: "stampede", resting: false };
      const cids = [...new Set([...(w.stampede?.cids || []), ...ids])];
      return { ...w, creatures, stampede: { at: a.t, cids } };
    }

    // ── Ranch actions ────────────────────────────────────────────────────────
    // Give a creature a job (or none). Your own creatures, or ones that trust you.
    case "set_job": {
      const c = w.creatures[a.cid];
      if (!c || !by || !canManage(c, by) || c.grow != null || c.nest) return w;     // babies can't work; nesting parents are busy
      const job = a.job && JOBS[a.job] && !JOBS[a.job].hidden ? a.job : null;
      const station = job === "crafter" ? (w.workshops?.[a.station]?.level ? a.station : c.station && w.workshops?.[c.station]?.level ? c.station : Object.keys(w.workshops || {}).find(k => w.workshops[k].level)) : null;
      if (job === "crafter" && !station) return w;                 // no workshop to work at yet
      if (c.job === job && (c.station || null) === (station || null)) return w;
      const next = { ...c, job, station, follow: job ? null : c.follow, work: 0 };
      return {
        ...w, creatures: { ...w.creatures, [c.id]: next },
        log: addLog(w.log, a, job === "crafter" ? `put ${c.name} to work at the ${WORKSHOPS[station].name}` : job ? `made ${c.name} a ${JOBS[job].name}` : `gave ${c.name} the day off`, "info"),
      };
    }

    // What a farmhand plants: "auto" (whichever food you have less of), "berry" or "carrot".
    case "set_plant": {
      const c = w.creatures[a.cid];
      if (!c || !by || !canManage(c, by) || !["auto", "berry", "carrot"].includes(a.plant)) return w;
      if ((c.plant || "auto") === a.plant) return w;
      return { ...w, creatures: { ...w.creatures, [c.id]: { ...c, plant: a.plant } } };
    }

    // Pair two creatures as buddies (or clear a pairing with buddy: null).
    case "set_buddy": {
      const c = w.creatures[a.cid];
      if (!c || !by || !canManage(c, by)) return w;
      const b = a.buddy ? w.creatures[a.buddy] : null;
      if (a.buddy && (!b || b.id === c.id)) return w;
      const creatures = { ...w.creatures };
      const unlink = (id) => { const x = creatures[id]; if (x?.buddy) { const o = creatures[x.buddy]; if (o?.buddy === id) creatures[o.id] = { ...o, buddy: null }; creatures[id] = { ...creatures[id], buddy: null }; } };
      unlink(c.id);
      if (b) {
        unlink(b.id);
        creatures[c.id] = { ...creatures[c.id], buddy: b.id };
        creatures[b.id] = { ...creatures[b.id], buddy: c.id };
      }
      return { ...w, creatures, log: addLog(w.log, a, b ? `made ${c.name} and ${b.name} buddies` : `split up ${c.name}'s buddy pair`, "info") };
    }

    // Top up the feeding trough from storage (by hand — Feeders do this automatically).
    case "fill_trough": {
      if (!by) return w;
      const cap = troughCap(w);
      const food = { ...w.food }, trough = { ...w.trough };
      let room = cap - STORE_ITEMS.reduce((n, k) => n + (trough[k] || 0), 0), moved = 0;
      while (room > 0) {
        const k = STORE_ITEMS.slice().sort((x, y) => (trough[x] || 0) - (trough[y] || 0)).find(x => (food[x] || 0) >= 1);
        if (!k) break;
        food[k] -= 1; trough[k] = (trough[k] || 0) + 1; room--; moved++;
      }
      if (!moved) return w;
      return { ...w, food, trough };
    }

    // Sell food for coins. n = -1 sells it all.
    // Sell items at their (fixed) price.
    case "sell": {
      const k = a.kind;
      if (!by || !ITEMS[k]) return w;
      const have = Math.floor(w.food[k] || 0);
      const n = a.n === -1 ? have : Math.max(0, Math.min(have, Math.floor(Number(a.n) || 0)));
      if (!n) return w;
      const x = { coins: w.coins, market: { ...w.market } };
      const got = sellNow(x, k, n);
      return {
        ...w, food: { ...w.food, [k]: (w.food[k] || 0) - n }, coins: Math.round(x.coins * 100) / 100, market: x.market,
        log: addLog(w.log, a, `sold ${n} ${ITEMS[k].name.toLowerCase()} for ${fmtCoins(got)} coins`, "info"),
      };
    }

    // Buy food or creature goods at double the market price (for things your creatures don't make).
    case "buy": {
      const k = a.kind;
      if (!by || !canBuy(k)) return w;
      const room = Math.floor(capFor(w, k) - (w.food[k] || 0));
      const price = buyPriceOf(w, k);
      const n = Math.max(0, Math.min(room, Math.floor(Number(a.n) || 0), Math.floor(w.coins / price)));
      if (!n) return w;
      return {
        ...w, food: { ...w.food, [k]: (w.food[k] || 0) + n }, coins: Math.round((w.coins - n * price) * 100) / 100,
        log: addLog(w.log, a, `bought ${n} ${ITEMS[k].name.toLowerCase()} for ${fmtCoins(n * price)} coins`, "info"),
      };
    }

    // Hauler rules: keep this many of an item (the rest gets sold), or keep: null = hands off.
    case "set_keep": {
      if (!by || !ITEMS[a.kind]) return w;
      const keep = { ...w.keep };
      if (a.keep == null) delete keep[a.kind];
      else keep[a.kind] = Math.max(0, Math.min(99999, Math.floor(Number(a.keep) || 0)));
      return { ...w, keep };
    }

    // Hand over items toward a contract (partial deliveries count).
    case "deliver": {
      const i = (w.contracts || []).findIndex(c => c.id === a.id);
      if (!by || i < 0 || w.contracts[i].until <= a.t) return w;
      const x = { food: { ...w.food }, coins: w.coins };
      const ct = { ...w.contracts[i] };
      const { given, done } = giveToContract(x, ct, Infinity);
      if (!given) return w;
      const contracts = w.contracts.slice();
      if (done) contracts.splice(i, 1); else contracts[i] = ct;
      return {
        ...w, food: x.food, coins: Math.round(x.coins * 100) / 100, contracts,
        contractAt: done ? Math.max(w.contractAt || 0, a.t + CONTRACT_GAP * 1000) : w.contractAt,
        log: addLog(w.log, a, done ? `finished a contract: ${ct.n} ${ITEMS[ct.item].name.toLowerCase()} for ${ct.reward} coins` : `delivered ${given} ${ITEMS[ct.item].name.toLowerCase()} (${ct.got}/${ct.n})`, done ? "catch" : "info"),
      };
    }

    // Build or upgrade a workshop (coins, plus bricks for the higher levels).
    case "ws_build": {
      const up = by && WORKSHOPS[a.key] ? nextWorkshop(w, a.key) : null;
      if (!up || w.coins < up.cost || !hasGoods(w, up.goods)) return w;
      const food = { ...w.food };
      for (const [k, n] of Object.entries(up.goods || {})) food[k] -= n;
      const cur = w.workshops?.[a.key] || { progress: 0, on: true };
      return {
        ...w, food, coins: Math.round((w.coins - up.cost) * 100) / 100,
        workshops: { ...w.workshops, [a.key]: { ...cur, level: up.level } },
        log: addLog(w.log, a, up.level === 1 ? `built the ${WORKSHOPS[a.key].name}` : `upgraded the ${WORKSHOPS[a.key].name} to level ${up.level}`, "catch"),
      };
    }

    // Pause / restart a workshop (so it stops using up its inputs).
    case "ws_toggle": {
      const st = w.workshops?.[a.key];
      if (!by || !st?.level) return w;
      return { ...w, workshops: { ...w.workshops, [a.key]: { ...st, on: st.on === false } } };
    }

    // Help out at a workshop by hand (walk mode) — anyone can, even with no Crafter.
    case "hand_craft": {
      const st = w.workshops?.[a.key];
      if (!by || !st?.level || st.progress >= 1) return w;
      if (missingInputs(w, WORKSHOPS[a.key].needs).length) return w;   // missing inputs (or only the creatures' food reserve left)
      const x = { ...w, food: { ...w.food }, coins: w.coins, market: { ...w.market }, workshops: { ...w.workshops, [a.key]: { ...st, progress: (st.progress || 0) + HAND_CRAFT } } };
      const before = x.food[WORKSHOPS[a.key].makes] || 0;
      finishCrafts(x, a.key, null);
      const made = (x.food[WORKSHOPS[a.key].makes] || 0) > before;
      return { ...x, coins: Math.round(x.coins * 100) / 100, log: made ? addLog(w.log, a, `made ${ITEMS[WORKSHOPS[a.key].makes].name.toLowerCase()} by hand`, "catch") : w.log };
    }

    // Upgrade (or build) a ranch building with coins.
    case "upgrade": {
      const up = by ? nextUpgrade(w, a.key) : null;
      if (!up || w.coins < up.cost || !hasGoods(w, up.goods)) return w;
      const food = { ...w.food };
      for (const [k, n] of Object.entries(up.goods || {})) food[k] -= n;
      return {
        ...w, food, coins: Math.round((w.coins - up.cost) * 100) / 100, buildings: { ...w.buildings, [a.key]: up.level },
        log: addLog(w.log, a, up.level === 1 ? `built the ${BUILDINGS[a.key].name}` : `upgraded the ${BUILDINGS[a.key].name} to level ${up.level}`, "catch"),
      };
    }

    // Buy the next plot of land (home field first, then new land to the east, forever).
    case "buy_plot": {
      const cost = plotCost(w.plots.length + 1);
      if (!by || w.coins < cost) return w;
      return {
        ...w, coins: Math.round((w.coins - cost) * 100) / 100, plots: [...w.plots, null],
        log: addLog(w.log, a, `bought plot ${w.plots.length + 1} for ${cost} coins`, w.plots.length + 1 === PLOT_COUNT + 1 ? "catch" : "info"),
      };
    }

    // ── The Wilds ────────────────────────────────────────────────────────────
    // Setting off: the squad leaves the farm (frozen while away), rations come out of storage.
    case "wilds_go": {
      if (!by || w.wilds) return w;
      const ids = (a.squad || []).filter(id => w.creatures[id] && !w.creatures[id].away).slice(0, 4);
      if (!ids.length) return w;
      const food = { ...w.food }, rations = {};
      for (const [k, n0] of Object.entries(a.rations || {})) {
        const n = Math.max(0, Math.min(Math.floor(Number(n0) || 0), Math.floor(food[k] || 0)));
        if (n && ITEMS[k]) { food[k] -= n; rations[k] = n; }
      }
      const creatures = { ...w.creatures };
      for (const id of ids) creatures[id] = { ...creatures[id], away: true, resting: false };
      return { ...w, food, creatures, wilds: { at: a.t, squad: ids, rations, by }, log: addLog(w.log, a, `set off into the Wilds with ${ids.map(id => creatures[id].name).join(", ")}`, "visit") };
    }
    // Coming home: loot, Fight XP, tired creatures, new friends.
    case "wilds_end": {
      if (!w.wilds) return w;
      const x = { ...w, food: { ...w.food }, coins: w.coins, market: { ...w.market }, buildings: w.buildings };
      const creatures = { ...w.creatures };
      let log = w.log;
      const res = new Map((a.squad || []).map(s => [s.cid, s]));
      for (const id of w.wilds.squad) {
        const c0 = creatures[id];
        if (!c0) continue;
        const r = res.get(id) || { hp: 0.3, xp: 0 };
        const c = { ...c0, away: false, energy: Math.round(Math.max(8, Math.min(100, 15 + 45 * (Number(r.hp) || 0))) * 100) / 100, happy: Math.max(0, Math.min(100, c0.happy + (a.won ? 8 : -6))) };
        for (const line of addSkillXp(c, "fight", Math.max(0, Math.min(6 * 3600, Number(r.xp) || 0)))) log = addLog(log, a, line, "catch");
        creatures[id] = c;
      }
      x.creatures = creatures;
      for (const [k, n] of Object.entries(a.rations || {})) if (ITEMS[k] && n > 0) store(x, k, Math.floor(n), null);      // uneaten rations come back
      for (const [k, n] of Object.entries(a.goods || {})) if (ITEMS[k] && n > 0) store(x, k, Math.floor(n), null);
      x.coins = Math.round((x.coins + Math.max(0, Math.min(5000, Number(a.coins) || 0))) * 100) / 100;
      let nextId = w.nextId;
      for (const f of (a.friends || []).slice(0, 4)) {
        if (!SPECIES[f.species]) continue;
        const rng = rngFrom(((Number(a.r) || 0.5) * 3.7 + nextId * 0.13) % 1);
        const id = `c${nextId++}`;
        const owner = f.by != null ? String(f.by) : by;
        const c = { id, species: f.species, name: freshName(rng, x), traits: { hue: Number.isFinite(f.hue) ? Math.round(f.hue) % 360 : SPECIES[f.species].hue, size: 1, personality: pick(rng, Object.keys(PERSONALITIES)), ...(f.rare ? { rare: true } : {}) },
          hunger: 60, happy: 70, bond: { [owner]: 40 }, owner, follow: null, born: a.t, petAt: 0 };
        x.creatures = { ...x.creatures, [id]: arrive(x, c, a) };
        log = addLog(log, a, `${c.name} the ${f.rare ? "golden " : ""}${SPECIES[f.species].name} came home from the Wilds!`, "catch");
      }
      const eggs = [...(x.eggs || [])];
      for (const e of (a.eggs || []).slice(0, 3)) {
        if (!RARITY.includes(e?.rarity)) continue;
        const rng = rngFrom(((Number(a.r) || 0.5) * 5.9 + nextId * 0.17) % 1);
        const egg = wildEgg(e.rarity, rng);
        eggs.push({ id: `e${nextId++}`, ...egg, by: e.by != null ? String(e.by) : by, name: freshName(rng, x) });
        log = addLog(log, a, `brought home a ${RARITY_INFO[e.rarity].name.toLowerCase()} wild egg! (put it in a Hatchery)`, "catch");
      }
      x.eggs = eggs;
      log = addLog(log, a, a.won ? `came home from the Wilds victorious! (+${Math.round(Number(a.coins) || 0)} coins)` : `limped home from the Wilds (+${Math.round(Number(a.coins) || 0)} coins)`, "catch");
      return { ...x, nextId, wilds: null, log };
    }

    // ── Pen spots ────────────────────────────────────────────────────────────
    // Give a creature a pen spot (if one is free) or send it out to the meadow.
    case "house": {
      const c = w.creatures[a.cid];
      if (!c || !by || !canManage(c, by)) return w;
      const want = a.on !== false;
      if (!!c.housed === want) return w;
      if (want && housedCount(w) >= penSlots(w)) return w;
      return {
        ...w, creatures: { ...w.creatures, [c.id]: { ...c, housed: want, resting: false } },
        log: addLog(w.log, a, want ? `gave ${c.name} a pen spot` : `moved ${c.name} out to the meadow`, "info"),
      };
    }
    // Buy one more pen spot (shared by both players).
    case "buy_pen": {
      const cost = penCost(penSlots(w) + 1);
      if (!by || w.coins < cost) return w;
      return { ...w, coins: Math.round((w.coins - cost) * 100) / 100, penSlots: penSlots(w) + 1, log: addLog(w.log, a, `built pen spot ${penSlots(w) + 1} for ${cost} coins`, "info") };
    }
    // "Find a new home": the owner says goodbye to a creature for coins. Starters stay forever.
    // ── Hatcheries & eggs ─────────────────────────────────────────────────────
    case "build_hatchery": {
      const n = (w.hatcheries || []).length;
      const cost = n < HATCHERY_MAX && hatcheryCost(n);
      if (!by || !cost || w.coins < cost.coins || (cost.brick && (w.food.brick || 0) < cost.brick)) return w;
      const food = { ...w.food };
      if (cost.brick) food.brick -= cost.brick;
      return {
        ...w, food, coins: Math.round((w.coins - cost.coins) * 100) / 100,
        hatcheries: [...(w.hatcheries || []), { id: `h${n + 1}`, egg: null }],
        log: addLog(w.log, a, `built ${n ? "another" : "a"} Hatchery`, "info"),
      };
    }
    // Two creatures make an egg together. Both nest (no work) until it's laid.
    case "make_egg": {
      const h = (w.hatcheries || []).find(x => x.id === a.hid);
      const A = w.creatures[a.a], B = w.creatures[a.b];
      if (!by || !h || !A || !B || ![A, B].every(c => canManage(c, by))) return w;
      const x = { ...w, creatures: { ...w.creatures, [A.id]: { ...A }, [B.id]: { ...B } }, hatcheries: w.hatcheries.map(y => ({ ...y })) };
      const hx = x.hatcheries.find(y => y.id === h.id);
      if (!startEgg(x, hx, x.creatures[A.id], x.creatures[B.id], rngFrom(a.r), by, !!a.repeat)) return w;
      const egg = hx.egg;
      return { ...x, log: addLog(w.log, a, `put ${A.name} and ${B.name} in a Hatchery together (${RARITY_INFO[egg.rarity].name.toLowerCase()} egg on the way)`, "info") };
    }
    // Keep making eggs from the same two parents (or stop).
    case "egg_repeat": {
      const h = (w.hatcheries || []).find(x => x.id === a.hid);
      if (!by || !h) return w;
      const e = h.egg;
      const pair = a.on ? (e && e.a ? { a: e.a, b: e.b, by } : h.lastPair || null) : null;
      return { ...w, hatcheries: w.hatcheries.map(x => (x.id === h.id ? { ...x, repeat: pair } : x)) };
    }
    // Hatchery levels: each one hatches eggs 25% faster.
    case "upgrade_hatchery": {
      const h = (w.hatcheries || []).find(x => x.id === a.hid);
      const up = h && hatcheryUpgrade(h.level || 1);
      if (!by || !up || w.coins < up.coins || !Object.entries(up.goods).every(([k, n]) => (w.food[k] || 0) >= n)) return w;
      const food = { ...w.food };
      for (const [k, n] of Object.entries(up.goods)) food[k] -= n;
      return {
        ...w, food, coins: Math.round((w.coins - up.coins) * 100) / 100,
        hatcheries: w.hatcheries.map(x => (x.id === h.id ? { ...x, level: (h.level || 1) + 1 } : x)),
        log: addLog(w.log, a, `upgraded Hatchery ${String(h.id).replace(/\D/g, "")} to level ${(h.level || 1) + 1}`, "info"),
      };
    }
    // Ranch Rules: per player, for their own creatures.
    case "set_rule": {
      if (!by || !["autoJob", "autoHouse"].includes(a.rule)) return w;
      const mine = { ...((w.rules || {})[by] || {}), [a.rule]: !!a.on };
      return { ...w, rules: { ...(w.rules || {}), [by]: mine }, log: addLog(w.log, a, `${a.on ? "turned on" : "turned off"} ${a.rule === "autoJob" ? "automatic jobs" : "automatic pen spots"}`, "info") };
    }
    // Change your mind before the egg is laid: parents go back to work, the food comes back.
    case "cancel_egg": {
      const h = (w.hatcheries || []).find(x => x.id === a.hid);
      if (!by || !h?.egg || h.egg.stage !== "laying") return w;
      const creatures = { ...w.creatures };
      for (const id of [h.egg.a, h.egg.b]) if (creatures[id]) creatures[id] = { ...creatures[id], nest: null };
      const food = { ...w.food };
      for (const [k, n] of Object.entries(h.egg.cost || {})) food[k] = (food[k] || 0) + n;
      return { ...w, food, creatures, coins: Math.round((w.coins + (h.egg.coins || 0)) * 100) / 100, hatcheries: w.hatcheries.map(x => (x.id === h.id ? { ...x, egg: null, repeat: null } : x)), log: addLog(w.log, a, "called off an egg", "info") };
    }
    // Who keeps an egg warm (any grown-up creature you can manage).
    case "set_carer": {
      const h = (w.hatcheries || []).find(x => x.id === a.hid);
      const c = w.creatures[a.cid];
      if (!by || !h || !c || !canManage(c, by) || c.grow != null || c.nest || c.away) return w;
      const creatures = { ...w.creatures };
      for (const o of Object.values(creatures)) if (o.job === "carer" && o.station === h.id && o.id !== c.id) creatures[o.id] = { ...o, job: null, station: null };
      creatures[c.id] = { ...c, job: "carer", station: h.id, follow: null, work: 0 };
      return { ...w, creatures, log: addLog(w.log, a, `asked ${c.name} to look after the Hatchery`, "info") };
    }
    // Put a wild egg (from the Wilds) into an empty Hatchery.
    case "place_egg": {
      const h = (w.hatcheries || []).find(x => x.id === a.hid);
      const e = (w.eggs || []).find(x => x.id === a.eid);
      if (!by || !h || h.egg || !e) return w;
      return {
        ...w, eggs: w.eggs.filter(x => x.id !== e.id),
        hatcheries: w.hatcheries.map(x => (x.id === h.id ? { ...x, egg: { ...e, stage: "hatching", progress: 0, by: e.by || by } } : x)),
        log: addLog(w.log, a, `put a ${RARITY_INFO[e.rarity].name.toLowerCase()} wild egg in a Hatchery`, "info"),
      };
    }

    case "rehome": {
      const c = w.creatures[a.cid];
      if (!c || !by || c.owner !== by || Object.values(w.starters || {}).includes(c.id)) return w;
      const price = rehomePrice(c);
      const creatures = { ...w.creatures };
      delete creatures[c.id];
      for (const o of Object.values(creatures)) if (o.buddy === c.id) creatures[o.id] = { ...o, buddy: null };
      return {
        ...w, creatures, coins: Math.round((w.coins + price) * 100) / 100,
        log: addLog(w.log, a, `found ${c.name} the ${c.traits.rare ? "golden " : ""}${SPECIES[c.species].name} a happy new home (+${price} coins)`, "catch"),
      };
    }

    // Make a creature follow you (or send it back to the pen if it already is).
    case "follow": {
      const c = w.creatures[a.cid];
      if (!c || !by) return w;
      const allowed = c.owner === by || (c.bond[by] || 0) >= FOLLOW_BOND;
      if (!allowed) return w;
      const creatures = { ...w.creatures };
      if (c.follow === by) {
        creatures[c.id] = { ...c, follow: null };
      } else {
        for (const o of Object.values(creatures)) if (o.follow === by) creatures[o.id] = { ...o, follow: null };
        creatures[c.id] = { ...creatures[c.id], follow: by };
      }
      return { ...w, creatures };
    }

    default:
      return w;
  }
}