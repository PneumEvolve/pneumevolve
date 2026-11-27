// Market Rush: sell everything you put on the counter before the stall gets too busy.
//
// No clock: the day goes until you're SOLD OUT (bonus!) or three customers have walked off
// in a huff (the stall closes early; you keep what you earned). The more of the counter is
// sold, the busier it gets (level 1 → 10): customers come faster, want more, and wait less.
//   Combo   every full order in a row adds to the combo; ×1.25 at 3, ×1.5 at 6, ×1.75 at 9
//   VIPs    golden customers pay double and give back a lost heart
//   Rush    every 10 happy customers a crowd shows up at once
// Tap a bin to hand one over: to the customer you tapped, or whoever needs it most.
// Haulers working on the farm come and help at the counter.
import { ITEMS } from "../ranch";
import { SPECIES } from "../species";
import { mulberry } from "./rng";

export const MR_STOCK = 40;          // most of each item you can put out
export const MR_KINDS = 8;           // most different items
export const MR_MARKUP = 1.1;
export const MR_HEARTS = 3;
const SPECIES_IDS = Object.keys(SPECIES);

// Building stuff stays home unless you put it out yourself.
export const MR_KEEP = ["brick", "blanket", "lantern", "cake", "crystal"];
export const sellable = (world) => Object.entries(world.food || {}).filter(([k, n]) => ITEMS[k] && Math.floor(n) >= 1).map(([k]) => k);
export function pickStock(world) {
  const have = Object.entries(world.food || {}).filter(([k, n]) => ITEMS[k] && Math.floor(n) >= 1 && !MR_KEEP.includes(k));
  have.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(have.slice(0, MR_KINDS).map(([k, n]) => [k, Math.min(MR_STOCK, Math.floor(n))]));
}
export function helpersFrom(world) {
  return Object.values(world.creatures || {}).filter(c => c.job === "hauler" && !c.away && c.housed && !c.resting).slice(0, 3)
    .map(c => ({ cid: c.id, name: c.name, species: c.species, hue: c.traits?.hue ?? 0, every: Math.max(2.5, 7 / (1 + 0.15 * ((c.skills?.haul || 1) - 1))), t: 3 }));
}

export function newMarket(world, seed) {
  return {
    v: 2, phase: "lobby", seed, t: 0,
    players: [{ sel: null, served: 0, round: 0 }, null],
    stock: pickStock(world), start: {}, sold: {}, coins: 0, tips: 0, served: 0, angry: 0,
    hearts: MR_HEARTS, level: 1, combo: 0, best: 0, rush: 0, vips: 0,
    customers: [], nextId: 1, spawnIn: 0.4, helpers: helpersFrom(world), fx: [],
  };
}

export const comboMul = (n) => 1 + 0.25 * Math.min(3, Math.floor(n / 3));
export const spawnGap = (st) => Math.max(0.85, 3.4 * Math.pow(0.86, st.level - 1)) * (st.players[1] ? 0.8 : 1);
const spotsFor = (st) => Math.min(6, 3 + Math.floor(st.level / 2) + (st.players[1] ? 1 : 0));
export const leftToSell = (st) => Object.values(st.stock).reduce((a, b) => a + b, 0);
const outstanding = (st, k) => st.customers.reduce((n, c) => n + Math.max(0, (c.order[k] || 0) - (c.got[k] || 0)), 0);
const fx = (st, f) => st.fx.push({ id: st.nextId++, at: st.t, ...f });

function spawn(st) {
  const rng = mulberry(st.seed + st.nextId * 7919);
  const free = Object.entries(st.stock).filter(([k, n]) => n - outstanding(st, k) > 0).map(([k]) => k);
  const spots = [0, 1, 2, 3, 4, 5].slice(0, spotsFor(st)).filter(s => !st.customers.some(c => c.spot === s));
  if (!free.length || !spots.length) return false;
  const L = st.level;
  const units = 1 + Math.floor(rng() * Math.min(6, 1 + L));                         // more items as it gets busy
  const kinds = Math.min(free.length, 1 + (rng() < 0.3 + 0.08 * L ? 1 : 0) + (L >= 4 && rng() < 0.35 ? 1 : 0));
  const pool = free.slice(), pick = [];
  for (let i = 0; i < kinds; i++) pick.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const order = {};
  for (let u = 0; u < units; u++) {
    const k = pick[u % pick.length];
    if ((order[k] || 0) + 1 + outstanding(st, k) <= st.stock[k]) order[k] = (order[k] || 0) + 1;
  }
  if (!Object.keys(order).length) return false;
  const n = Object.values(order).reduce((a, b) => a + b, 0);
  const vip = L >= 2 && rng() < 0.12;
  const max = (Math.max(4.5, 15 - 1.2 * (L - 1)) + 1.1 * n) * (vip ? 0.8 : 1);
  st.customers.push({
    id: st.nextId++, spot: spots[Math.floor(rng() * spots.length)], species: SPECIES_IDS[Math.floor(rng() * SPECIES_IDS.length)],
    hue: Math.floor(rng() * 360), order, got: {}, patience: max, max, vip,
  });
  if (vip) fx(st, { kind: "banner", text: "VIP!", color: "#ffd65a" });
  return true;
}

function pay(st, c, by) {
  const value = Object.entries(c.order).reduce((n, [k, q]) => n + (ITEMS[k]?.price || 0) * q, 0);
  st.combo += 1; st.best = Math.max(st.best, st.combo);
  const mul = comboMul(st.combo) * (c.vip ? 2 : 1);
  const tip = Math.round(value * 0.25 * (c.patience / c.max));
  const earned = Math.max(1, Math.round(value * MR_MARKUP * mul)) + tip;
  st.coins += earned; st.tips += tip; st.served += 1;
  if (by != null && st.players[by]) st.players[by] = { ...st.players[by], served: (st.players[by].served || 0) + 1 };
  fx(st, { kind: "paid", spot: c.spot, n: earned, vip: c.vip });
  if (st.combo % 3 === 0 && st.combo <= 9) fx(st, { kind: "banner", text: `COMBO ×${comboMul(st.combo)}!`, color: "#ff8a3c" });
  if (c.vip) { st.vips += 1; if (st.hearts < MR_HEARTS) { st.hearts += 1; fx(st, { kind: "heart" }); } }
  st.customers = st.customers.filter(x => x.id !== c.id);
  for (const p of st.players) if (p && p.sel === c.id) p.sel = null;
  // busier and busier: the level follows how much of the counter is sold (so it peaks near the end, however much you put out)
  const total = Object.values(st.start).reduce((a, b) => a + b, 0) || 1;
  const lvl = Math.min(10, 1 + Math.floor(9 * (total - leftToSell(st)) / total));
  if (lvl > st.level) { st.level = lvl; fx(st, { kind: "banner", text: `BUSIER! Level ${lvl}`, color: "#6fd3ff" }); }
  if (st.served % 10 === 0) { st.rush = 3; st.spawnIn = 0.2; fx(st, { kind: "banner", text: "RUSH HOUR!", color: "#ff5d73" }); }
}

// Hand one item over. To: the picked customer if they want it, otherwise whoever's most impatient for it.
export function give(st, k, toId, by) {
  if (!(st.stock[k] > 0)) return false;
  const needs = (c) => (c.order[k] || 0) > (c.got[k] || 0);
  let c = st.customers.find(x => x.id === toId && needs(x));
  if (!c) c = st.customers.filter(needs).sort((a, b) => a.patience / a.max - b.patience / b.max)[0];
  if (!c) { fx(st, { kind: "nope", item: k, by }); return true; }
  c.got = { ...c.got, [k]: (c.got[k] || 0) + 1 };
  st.stock[k] -= 1; st.sold[k] = (st.sold[k] || 0) + 1;
  fx(st, { kind: "gave", item: k, spot: c.spot });
  if (Object.entries(c.order).every(([kk, q]) => (c.got[kk] || 0) >= q)) pay(st, c, by);
  return true;
}

export function marketAct(st, slot, i) {
  if (i.k === "join") { if (st.players[1]) return false; st.players[1] = { sel: null, served: 0, round: 0 }; return true; }
  if (st.phase === "lobby" && slot === 0) {
    if (i.k === "start" && leftToSell(st) > 0) { st.phase = "play"; st.t = 0; st.start = { ...st.stock }; return true; }
    // put an item out / take it back (have = how many are in storage)
    if (i.k === "stock" && ITEMS[i.item]) {
      if (st.stock[i.item] != null) { const { [i.item]: _, ...rest } = st.stock; st.stock = rest; return true; }
      if (Object.keys(st.stock).length >= MR_KINDS) return false;
      const n = Math.min(MR_STOCK, Math.floor(Number(i.have) || 0));
      if (n < 1) return false;
      st.stock = { ...st.stock, [i.item]: n }; return true;
    }
    // more or fewer of one item
    if (i.k === "amount" && st.stock[i.item] != null) {
      const n = Math.max(1, Math.min(MR_STOCK, Math.floor(Number(i.have) || 0), st.stock[i.item] + (Number(i.d) || 0)));
      st.stock = { ...st.stock, [i.item]: n }; return true;
    }
    return false;
  }
  if (st.phase !== "play") return false;
  if (i.k === "sel") { const p = st.players[slot]; if (!p) return false; st.players[slot] = { ...p, sel: p.sel === i.id ? null : i.id }; return true; }
  if (i.k === "give" && ITEMS[i.item]) return give(st, i.item, st.players[slot]?.sel, slot);
  if (i.k === "quit" && slot === 0) { finishMarket(st, "quit"); return true; }
  return false;
}

export function marketTick(st, dt) {
  if (st.phase !== "play") return false;
  st.t += dt;
  // patience runs out → they leave in a huff, a heart is lost
  for (const c of st.customers) c.patience -= dt;
  const gone = st.customers.filter(c => c.patience <= 0);
  if (gone.length) {
    st.angry += gone.length; st.combo = 0;
    st.hearts = Math.max(0, st.hearts - gone.length);
    for (const c of gone) fx(st, { kind: "huff", spot: c.spot });
    st.customers = st.customers.filter(c => c.patience > 0);
    for (const pl of st.players) if (pl && gone.some(c => c.id === pl.sel)) pl.sel = null;
    if (st.hearts <= 0) { finishMarket(st, "closed"); return true; }
  }
  // new customers (a rush brings a crowd at once)
  st.spawnIn -= dt;
  if (st.spawnIn <= 0) {
    spawn(st);
    if (st.rush > 0) { st.rush -= 1; st.spawnIn = 0.35; } else st.spawnIn = spawnGap(st);
  }
  // haulers lend a hand
  for (const h of st.helpers) {
    h.t -= dt;
    if (h.t > 0) continue;
    h.t = h.every;
    const c = st.customers.slice().sort((a, b) => a.patience / a.max - b.patience / b.max).find(x => Object.entries(x.order).some(([k, q]) => (x.got[k] || 0) < q && st.stock[k] > 0));
    if (c) { const k = Object.keys(c.order).find(kk => (c.got[kk] || 0) < c.order[kk] && st.stock[kk] > 0); give(st, k, c.id, null); fx(st, { kind: "help", cid: h.cid }); }
  }
  st.fx = st.fx.filter(f => st.t - f.at < 1.6);
  if (leftToSell(st) <= 0 && !st.customers.length) { finishMarket(st, "soldout"); return true; }
  // nothing left anyone could order and nobody waiting → done
  if (!st.customers.length && st.t > 2 && !Object.entries(st.stock).some(([, n]) => n > 0)) { finishMarket(st, "soldout"); return true; }
  return false;
}

export function finishMarket(st, why) {
  st.phase = "end";
  const bonus = why === "soldout" ? Math.round(st.coins * 0.2) : 0;
  st.coins += bonus;
  const stars = why === "soldout" ? (st.hearts >= MR_HEARTS ? 3 : 2) : st.served >= 5 ? 1 : 0;
  st.result = { why, coins: st.coins, bonus, tips: st.tips, sold: st.sold, served: st.served, angry: st.angry, best: st.best, level: st.level, vips: st.vips, stars, secs: Math.round(st.t) };
}