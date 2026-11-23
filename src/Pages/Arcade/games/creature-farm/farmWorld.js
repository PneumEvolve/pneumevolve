// src/Pages/Arcade/games/creature-farm/farmWorld.js
//
// The farm's saved world + every rule that changes it, in one PURE reducer
// (runs identically on both devices — see useArcadeWorld). No drawing here.
//
// Time:
//   • The day clock + hunger/happiness only move while someone is playing:
//     the host sends a "tick" action once a second. Nothing decays offline.
//   • Crops grow on real time (timestamps), so they're ready when you come back.
//
// Randomness: actions carry `r` (a random number picked by whoever sent it),
// and the reducer seeds a tiny PRNG from it — so both devices roll the same dice.

import { SPECIES, CROPS, PERSONALITIES, NAMES } from "./species";

// ── Map (world units; the canvas scales to fit) ──────────────────────────────
export const WORLD_W = 960;
export const WORLD_H = 600;
export const MAP = {
  wildEdge: 74,                                   // trees above this line; visitors come from here
  house: { x: 70,  y: 120, w: 150, h: 110 },
  store: { x: 145, y: 300 },                      // the shared food crate
  field: { x: 560, y: 140, cols: 4, rows: 3, size: 58, gap: 12 },
  pen:   { x: 330, y: 400, w: 440, h: 170 },
  spawn: [{ x: 230, y: 320 }, { x: 270, y: 345 }],
};
export const PLOT_COUNT = MAP.field.cols * MAP.field.rows;
export const REACH = 50;                          // how close you need to be to interact

export function plotRect(i) {
  const f = MAP.field;
  const c = i % f.cols, r = Math.floor(i / f.cols);
  const x = f.x + c * (f.size + f.gap), y = f.y + r * (f.size + f.gap);
  return { x, y, w: f.size, h: f.size, cx: x + f.size / 2, cy: y + f.size / 2 };
}

// ── Tuning ────────────────────────────────────────────────────────────────────
export const DAY_LEN         = 600;               // seconds of PLAY per in-game day
export const HUNGER_PER_SEC  = 100 / 900;         // full → empty in 1.5 days of play
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

function makeVisitor(species, rng, n, near) {
  // Somewhere in the open grass, pulled toward the crop that lured it.
  const tx = clamp((280 + rng() * 640) * 0.5 + near.x * 0.5, 260, WORLD_W - 50);
  const ty = clamp(110 + rng() * 260, 110, 370);
  return {
    id: `v${n}`, species, name: pick(rng, NAMES), traits: rollTraits(species, rng),
    sx: clamp(tx + (rng() - 0.5) * 240, 40, WORLD_W - 40), tx, ty, seed: r2(rng() * 6.28),
    age: 0, trust: 0, helpers: {},
  };
}

// ── World ─────────────────────────────────────────────────────────────────────
export function initFarm() {
  return {
    v: 1,
    day: 1,
    dayTime: 0,
    nextId: 1,
    food: { berry: 2, carrot: 2 },                // a little to start, so the first befriend works
    plots: Array(PLOT_COUNT).fill(null),          // { kind, at, by } | null
    creatures: {},                                // id → creature
    visitors: [],                                 // wild creatures on the farm right now
    starters: {},                                 // userId → creature id
    log: [],
  };
}

// ── Rules ─────────────────────────────────────────────────────────────────────
export function farmReducer(w, a) {
  const by = a.by != null ? String(a.by) : null;

  switch (a.type) {
    // Host sends this every second of play.
    case "tick": {
      const dt = clamp(Number(a.dt) || 0, 0, 5);
      if (!dt) return w;
      const rng = rngFrom(a.r);
      let { day, dayTime, nextId, log } = w;

      dayTime += dt;
      if (dayTime >= DAY_LEN) { dayTime -= DAY_LEN; day += 1; log = addLog(log, a, `Day ${day} begins`, "day"); }

      const creatures = {};
      for (const c of Object.values(w.creatures)) {
        const p = c.traits.personality;
        const hunger = Math.max(0, c.hunger - HUNGER_PER_SEC * dt * (p === "greedy" ? 1.35 : 1));
        let happy = c.happy;
        if (hunger < 25)      happy -= 0.1 * dt * (p === "grumpy" ? 1.3 : 1);
        else if (hunger > 60) happy += 0.02 * dt;
        creatures[c.id] = { ...c, hunger: r2(hunger), happy: r2(clamp(happy, 0, 100)) };
      }

      const visitors = [];
      for (const v of w.visitors) {
        const age = r2(v.age + dt);
        if (age > VISIT_MAX) { log = addLog(log, a, `${v.name} the ${SPECIES[v.species].name} wandered off`, "flee"); continue; }
        visitors.push({ ...v, age });
      }

      // Ripe lure crops pull visitors in ONE at a time, after a random wait,
      // and only while there's room (MAX_VISITORS) — so they trickle in.
      const plots = w.plots.slice();
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
        const v = makeVisitor(pick(rng, options), rng, nextId++, { x: pr.cx, y: pr.cy });
        visitors.push(v);
        plots[i] = null;
        log = addLog(log, a, `${v.name} the ${SPECIES[v.species].name} smelled the ${CROPS[crop.kind].name.toLowerCase()}`, "visit");
      }

      // Now and then something wanders in on its own (the only way to meet some creatures).
      if (visitors.length === 0 && rng() < dt / 240) {
        const wild = Object.keys(SPECIES).filter(k => !SPECIES[k].starter);
        const v = makeVisitor(pick(rng, wild), rng, nextId++, { x: 300 + rng() * 500, y: 120 + rng() * 200 });
        visitors.push(v);
        log = addLog(log, a, `A wild ${SPECIES[v.species].name} wandered in!`, "visit");
      }

      return { ...w, day, dayTime: r2(dayTime), nextId, creatures, visitors, plots, log };
    }

    case "choose_starter": {
      if (!by || w.starters[by] || !SPECIES[a.species]?.starter) return w;
      const rng = rngFrom(a.r);
      const id = `c${w.nextId}`;
      const c = {
        id, species: a.species, name: pick(rng, NAMES), traits: rollTraits(a.species, rng),
        hunger: 90, happy: 70, bond: { [by]: 30 }, owner: by, follow: by, born: a.t, petAt: 0,
      };
      return {
        ...w, nextId: w.nextId + 1,
        creatures: { ...w.creatures, [id]: c },
        starters: { ...w.starters, [by]: id },
        log: addLog(w.log, a, `picked ${c.name} the ${SPECIES[c.species].name}`, "starter"),
      };
    }

    case "plant": {
      if (!(a.i >= 0 && a.i < PLOT_COUNT) || w.plots[a.i] || !CROPS[a.kind]) return w;
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
        creatures: { ...w.creatures, [id]: c },
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
      let foodKey = (w.food[fav] || 0) > 0 ? fav : Object.keys(w.food).find(k => w.food[k] > 0);
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