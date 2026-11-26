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
} from "./ranch";

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
  workshops: {                                    // each appears once it's built
    kitchen: { x: 900, y: 185 },
    juicer:  { x: 205, y: 545 },
    bakery:  { x: 900, y: 300 },
    kiln:    { x: 872, y: 432 },
    loom:    { x: 872, y: 540 },
    lantern: { x: 110, y: 545 },
  },
  spawn: [{ x: 230, y: 320 }, { x: 270, y: 345 }],
};
export const PLOT_COUNT = MAP.field.cols * MAP.field.rows;   // the home field (16); land keeps going east after that
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
    return { x: ws.x - 30 + ((n * 23) % 60) + Math.sin(tSec * 1.3 + ph) * 6, y: ws.y + 34, face: Math.sin(tSec * 0.5 + ph) >= 0 ? 1 : -1, moving: true };
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
    v: 3,
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

// Old saves (before the Ranch, or before Phase 2) get the new fields filled in.
function ensureRanch(w, a) {
  if (w.v >= 3 && w.simAt != null && Object.values(w.creatures).every(c => c.skills && SKILLS.every(s => c.skills[s] != null))) return w;
  const rng = rngFrom(a.r ?? 0.42);
  const creatures = {};
  for (const c of Object.values(w.creatures)) creatures[c.id] = ranchify(c, rng);
  const d = ranchDefaults();
  return {
    ...d, ...w, v: 3, creatures,
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
      };
      const report = simulateRanch(sim, dt, a.t, !live && dt > 120);
      const creatures = {};
      for (const c of Object.values(sim.creatures)) creatures[c.id] = { ...c, hunger: r2(c.hunger), happy: r2(c.happy), energy: r2(c.energy) };
      for (const msg of sim._levelUps || []) log = addLog(log, a, msg, "catch");
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
        creatures: { ...w.creatures, [id]: ranchify(c, rngFrom(((Number(a.r) || 0.5) * 7.31) % 1)) },
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
        creatures: { ...w.creatures, [id]: ranchify(c, rngFrom(((Number(a.r) || 0.5) * 7.31) % 1)) },
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
        creatures: { ...w.creatures, [id]: ranchify(c, rngFrom(((Number(a.r) || 0.5) * 7.31) % 1)) },
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

    // ── Ranch actions ────────────────────────────────────────────────────────
    // Give a creature a job (or none). Your own creatures, or ones that trust you.
    case "set_job": {
      const c = w.creatures[a.cid];
      if (!c || !by || !canManage(c, by)) return w;
      const job = a.job && JOBS[a.job] ? a.job : null;
      const station = job === "crafter" ? (w.workshops?.[a.station]?.level ? a.station : c.station && w.workshops?.[c.station]?.level ? c.station : Object.keys(w.workshops || {}).find(k => w.workshops[k].level)) : null;
      if (job === "crafter" && !station) return w;                 // no workshop to work at yet
      if (c.job === job && (c.station || null) === (station || null)) return w;
      const next = { ...c, job, station, follow: job ? null : c.follow, work: 0 };
      return {
        ...w, creatures: { ...w.creatures, [c.id]: next },
        log: addLog(w.log, a, job === "crafter" ? `put ${c.name} to work at the ${WORKSHOPS[station].name}` : job ? `made ${c.name} a ${JOBS[job].name}` : `gave ${c.name} the day off`, "info"),
      };
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
    // Sell items at today's market price (selling a lot at once pushes the price down).
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