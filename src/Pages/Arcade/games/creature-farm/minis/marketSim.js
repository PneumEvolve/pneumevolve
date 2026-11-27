// Market Rush: two minutes behind the stall on a busy market day.
// Customers walk up wanting a few things from your real storage. Tap a bin to hand one over
// (to the customer you picked, or whoever needs it most). Fill an order before they run out
// of patience and they pay 1.5× the stall price, plus a tip for being quick and for a streak.
// Haulers working on the farm come and help: they hand over an item every few seconds.
import { ITEMS } from "../ranch";
import { SPECIES } from "../species";
import { mulberry } from "./rng";

export const MR_SECS = 120;
export const MR_STOCK = 12;          // most of each item put out on the counter
export const MR_KINDS = 8;           // most different items
export const MR_MARKUP = 1.5;
const SPECIES_IDS = Object.keys(SPECIES);

// Building stuff stays home unless you put it out yourself.
export const MR_KEEP = ["brick", "blanket", "lantern", "cake", "crystal"];
export const sellable = (world) => Object.entries(world.food || {}).filter(([k, n]) => ITEMS[k] && Math.floor(n) >= 1).map(([k]) => k);
// What goes on the counter: the items you have most of (up to 8 kinds, 12 each).
export function pickStock(world) {
  const have = Object.entries(world.food || {}).filter(([k, n]) => ITEMS[k] && Math.floor(n) >= 1 && !MR_KEEP.includes(k));
  have.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(have.slice(0, MR_KINDS).map(([k, n]) => [k, Math.min(MR_STOCK, Math.floor(n))]));
}
// Haulers help at the counter. haul skill → how quick they are.
export function helpersFrom(world) {
  return Object.values(world.creatures || {}).filter(c => c.job === "hauler" && !c.away && c.housed && !c.resting).slice(0, 3)
    .map(c => ({ cid: c.id, name: c.name, species: c.species, hue: c.traits?.hue ?? 0, every: Math.max(2.5, 7 / (1 + 0.15 * ((c.skills?.haul || 1) - 1))), t: 3 }));
}

export function newMarket(world, seed) {
  return {
    v: 1, phase: "lobby", seed, t: 0, left: MR_SECS,
    players: [{ sel: null, served: 0, round: 0 }, null],
    stock: pickStock(world), sold: {}, coins: 0, tips: 0, served: 0, angry: 0, streak: 0, best: 0,
    customers: [], nextId: 1, spawnIn: 0.6, helpers: helpersFrom(world), fx: [],
  };
}

const rngOf = (st) => { const r = mulberry(st.seed + st.nextId * 7919); return r; };
const progress = (st) => Math.min(1, st.t / MR_SECS);
const outstanding = (st, k) => st.customers.reduce((n, c) => n + Math.max(0, (c.order[k] || 0) - (c.got[k] || 0)), 0);

function spawn(st) {
  const rng = rngOf(st);
  const p = progress(st);
  const free = Object.entries(st.stock).filter(([k, n]) => n - outstanding(st, k) > 0).map(([k]) => k);
  if (!free.length) return;
  const units = 1 + Math.floor(rng() * (2 + p * 3));                       // 1-2 early, up to 5 late
  const kinds = Math.min(free.length, 1 + (rng() < 0.35 + p * 0.4 ? 1 : 0) + (p > 0.5 && rng() < 0.3 ? 1 : 0));
  const pick = [];
  const pool = free.slice();
  for (let i = 0; i < kinds; i++) pick.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const order = {};
  for (let u = 0; u < units; u++) {
    const k = pick[u % pick.length];
    if ((order[k] || 0) + 1 + outstanding(st, k) <= st.stock[k]) order[k] = (order[k] || 0) + 1;
  }
  if (!Object.keys(order).length) return;
  const spots = [0, 1, 2, 3, 4].filter(s => !st.customers.some(c => c.spot === s));
  const max = 24 - 9 * p + Object.values(order).reduce((a, b) => a + b, 0) * 2;
  st.customers.push({
    id: st.nextId++, spot: spots[Math.floor(rng() * spots.length)], species: SPECIES_IDS[Math.floor(rng() * SPECIES_IDS.length)],
    hue: Math.floor(rng() * 360), order, got: {}, patience: max, max, born: st.t,
  });
}

function pay(st, c, by) {
  const value = Object.entries(c.order).reduce((n, [k, q]) => n + (ITEMS[k]?.price || 0) * q, 0);
  st.streak += 1; st.best = Math.max(st.best, st.streak);
  const quick = c.patience / c.max;
  const tip = Math.round(value * MR_MARKUP * 0.35 * quick) + Math.min(10, st.streak);
  const earned = Math.round(value * MR_MARKUP) + tip;
  st.coins += earned; st.tips += tip; st.served += 1;
  if (by != null && st.players[by]) st.players[by] = { ...st.players[by], served: (st.players[by].served || 0) + 1 };
  st.fx.push({ id: st.nextId++, kind: "paid", spot: c.spot, n: earned, at: st.t });
  st.customers = st.customers.filter(x => x.id !== c.id);
  for (const p of st.players) if (p && p.sel === c.id) p.sel = null;
}

// Hand one item over. To: the picked customer if they want it, otherwise whoever's most impatient for it.
export function give(st, k, toId, by) {
  if (!(st.stock[k] > 0)) return false;
  const needs = (c) => (c.order[k] || 0) > (c.got[k] || 0);
  let c = st.customers.find(x => x.id === toId && needs(x));
  if (!c) c = st.customers.filter(needs).sort((a, b) => a.patience / a.max - b.patience / b.max)[0];
  if (!c) { st.fx.push({ id: st.nextId++, kind: "nope", item: k, by, at: st.t }); return true; }
  c.got = { ...c.got, [k]: (c.got[k] || 0) + 1 };
  st.stock[k] -= 1; st.sold[k] = (st.sold[k] || 0) + 1;
  if (Object.entries(c.order).every(([kk, q]) => (c.got[kk] || 0) >= q)) pay(st, c, by);
  return true;
}

export function marketAct(st, slot, i) {
  if (i.k === "join") { if (st.players[1]) return false; st.players[1] = { sel: null, served: 0, round: 0 }; return true; }
  if (i.k === "start" && slot === 0 && st.phase === "lobby" && Object.values(st.stock).some(n => n > 0)) { st.phase = "play"; st.t = 0; return true; }
  // lobby: put an item out or take it off the counter (n = how many you have)
  if (i.k === "stock" && slot === 0 && st.phase === "lobby" && ITEMS[i.item]) {
    if (st.stock[i.item] != null) { const { [i.item]: _, ...rest } = st.stock; st.stock = rest; return true; }
    if (Object.keys(st.stock).length >= MR_KINDS) return false;
    const n = Math.min(MR_STOCK, Math.floor(Number(i.n) || 0));
    if (n < 1) return false;
    st.stock = { ...st.stock, [i.item]: n }; return true;
  }
  if (st.phase !== "play") return false;
  if (i.k === "sel") { const p = st.players[slot]; if (!p) return false; st.players[slot] = { ...p, sel: p.sel === i.id ? null : i.id }; return true; }
  if (i.k === "give" && ITEMS[i.item]) return give(st, i.item, st.players[slot]?.sel, slot);
  if (i.k === "quit" && slot === 0) { finishMarket(st); return true; }
  return false;
}

export function marketTick(st, dt) {
  if (st.phase !== "play") return false;
  st.t += dt; st.left = Math.max(0, MR_SECS - st.t);
  const p = progress(st);
  // customers lose patience; the ones who run out go home grumpy
  for (const c of st.customers) c.patience -= dt;
  const gone = st.customers.filter(c => c.patience <= 0);
  if (gone.length) {
    st.angry += gone.length; st.streak = 0;
    for (const c of gone) st.fx.push({ id: st.nextId++, kind: "huff", spot: c.spot, at: st.t });
    st.customers = st.customers.filter(c => c.patience > 0);
    for (const pl of st.players) if (pl && gone.some(c => c.id === pl.sel)) pl.sel = null;
  }
  // new customers
  const cap = st.players[1] ? 5 : 4;
  st.spawnIn -= dt;
  if (st.spawnIn <= 0) { if (st.customers.length < cap) spawn(st); st.spawnIn = (4.6 - 2.2 * p) * (st.players[1] ? 0.8 : 1); }
  // haulers lend a hand
  for (const h of st.helpers) {
    h.t -= dt;
    if (h.t > 0) continue;
    h.t = h.every;
    const c = st.customers.slice().sort((a, b) => a.patience / a.max - b.patience / b.max).find(x => Object.entries(x.order).some(([k, q]) => (x.got[k] || 0) < q && st.stock[k] > 0));
    if (c) { const k = Object.keys(c.order).find(kk => (c.got[kk] || 0) < c.order[kk] && st.stock[kk] > 0); give(st, k, c.id, null); st.fx.push({ id: st.nextId++, kind: "help", cid: h.cid, at: st.t }); }
  }
  st.fx = st.fx.filter(f => st.t - f.at < 1.4);
  const soldOut = Object.values(st.stock).every(n => n <= 0);
  if (st.t >= MR_SECS || (soldOut && !st.customers.length)) { finishMarket(st); return true; }
  return false;
}

export function finishMarket(st) {
  st.phase = "end";
  const ratio = st.served / Math.max(1, st.served + st.angry);
  const stars = st.served >= 6 && ratio >= 0.9 ? 3 : st.served >= 4 && ratio >= 0.7 ? 2 : st.served >= 2 ? 1 : 0;
  st.result = { coins: st.coins, tips: st.tips, sold: st.sold, served: st.served, angry: st.angry, best: st.best, stars };
}