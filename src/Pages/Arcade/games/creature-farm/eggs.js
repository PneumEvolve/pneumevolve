// src/Pages/Arcade/games/creature-farm/eggs.js
//
// Eggs, babies and genetics. Pure rules, no drawing, no world changes
// (ranch.js runs the hatcheries, farmWorld.js has the actions).
//
// Genes: every creature has 4 gene slots, each one a species ("type").
//   A starter or wild Mossling is [moss, moss, moss, moss]: a purebred.
//   Each parent passes on 2 of its 4 genes at random, so:
//     purebred Mossling × purebred Emberpup → always [moss, moss, ember, ember]
//     two 2-type parents with 4 types between them → often 4 types, sometimes fewer
//     parents with lots of types → random mixes
//   The type with the most genes is the DOMINANT one: it decides the body, the
//   goods it makes and its Wilds role (it's what c.species holds). The other
//   types show up as ears, tails, wings or shells.
//   How many genes a type has = its "purity": 4 = purebred. In the Wilds a type
//   with more genes unlocks more of that type's moves (coming next).
//
// Skills: the parents' average, rounded, then a small chance of +1 (better with a
// caring Carer) or -1, never more than 1 above the better parent.
// Rarity (how long an egg takes, and what it costs) comes from the number of
// types and how skilled the baby will be.

import { SPECIES, PERSONALITIES, NAMES } from "./species";

export const GENE_SLOTS = 4;
export const SKILL_KEYS = ["forage", "care", "farm", "craft", "haul", "fight"];

export const RARITY = ["common", "uncommon", "rare", "epic", "legendary"];
export const RARITY_INFO = {
  common:    { name: "Common",    color: "#d9d4c4", lay: 15 * 60,  hatch: 30 * 60,  coins: 0,   cost: { berry: 10, carrot: 10 } },
  uncommon:  { name: "Uncommon",  color: "#7fd67a", lay: 30 * 60,  hatch: 60 * 60,  coins: 25,  cost: { berry: 20, carrot: 20 } },
  rare:      { name: "Rare",      color: "#6fb4ff", lay: 60 * 60,  hatch: 2 * 3600, coins: 100, cost: { berry: 30, carrot: 30, jam: 3 } },
  epic:      { name: "Epic",      color: "#c08aff", lay: 2 * 3600, hatch: 4 * 3600, coins: 300, cost: { berry: 40, carrot: 40, cake: 2 } },
  legendary: { name: "Legendary", color: "#ffd65a", lay: 4 * 3600, hatch: 8 * 3600, coins: 800, cost: { berry: 60, carrot: 60, cake: 3, blanket: 2 } },
};

// Babies grow up in about 3 hours when well looked after (fed and happy),
// closer to 5 when they're not.
export const GROW_SECS = 3 * 3600;
export const growRate = (c) => Math.max(0.35, 0.3 + 0.4 * (c.happy / 100) + 0.3 * (c.hunger / 100));   // 1.0 at 100/100

// Hatchery levels 1-5: each level hatches 25% faster. Upgrades cost coins and goods.
export const HATCHERY_LEVELS = 5;
export const hatcherySpeed = (lvl = 1) => 1 + 0.25 * ((lvl || 1) - 1);
export const hatcheryUpgrade = (lvl = 1) => (lvl >= HATCHERY_LEVELS ? null : [
  null, { coins: 400, goods: { brick: 4 } }, { coins: 1000, goods: { brick: 10, blanket: 3 } },
  { coins: 2500, goods: { brick: 20, blanket: 8 } }, { coins: 6000, goods: { brick: 40, lantern: 6 } },
][lvl || 1]);

// Hatcheries: up to 4, each holds one egg.
export const HATCHERY_MAX = 4;
export const hatcheryCost = (n) => [
  { coins: 200 },
  { coins: 600, brick: 6 },
  { coins: 1500, brick: 20 },
  { coins: 4000, brick: 50 },
][n] || null;

// ── Genes ─────────────────────────────────────────────────────────────────────
export const genesOf = (c) => (Array.isArray(c?.genes) && c.genes.length === GENE_SLOTS ? c.genes : Array(GENE_SLOTS).fill(c?.species));

// [{ type, n }] most genes first; the creature's own species (dominant) wins ties.
export function typeCounts(c) {
  const genes = genesOf(c), counts = {};
  for (const g of genes) counts[g] = (counts[g] || 0) + 1;
  return Object.entries(counts).map(([type, n]) => ({ type, n }))
    .sort((a, b) => b.n - a.n || (a.type === c.species ? -1 : b.type === c.species ? 1 : 0));
}
export const typesOf = (c) => typeCounts(c).map(t => t.type);
export const purityOf = (c) => typeCounts(c)[0]?.n || GENE_SLOTS;

// The 6 ways to pass 2 of 4 genes on.
function pairsOf(genes) {
  const out = [];
  for (let i = 0; i < genes.length; i++) for (let j = i + 1; j < genes.length; j++) out.push([genes[i], genes[j]]);
  return out;
}
function dominantOf(genes, prefer = []) {
  const counts = {};
  for (const g of genes) counts[g] = (counts[g] || 0) + 1;
  const top = Math.max(...Object.values(counts));
  const tied = Object.keys(counts).filter(k => counts[k] === top);
  // a tie (2+2) goes to one of the parents' own dominant types when it can
  const pool = tied.filter(t => prefer.includes(t)).length ? tied.filter(t => prefer.includes(t)) : tied;
  return { tied, pick: (r) => pool[Math.floor(r * pool.length) % pool.length] };
}
const sortGenes = (genes, dom) => genes.slice().sort((a, b) => (a === dom ? -1 : b === dom ? 1 : a < b ? -1 : a > b ? 1 : 0));

// Every possible baby type mix with its chance (for the preview before you breed).
// [{ types: [dominant-first], counts: {type: n}, chance }]
export function breedOdds(a, b) {
  const pa = pairsOf(genesOf(a)), pb = pairsOf(genesOf(b));
  const out = new Map();
  for (const x of pa) for (const y of pb) {
    const genes = [...x, ...y];
    const counts = {};
    for (const g of genes) counts[g] = (counts[g] || 0) + 1;
    const key = Object.keys(counts).sort().map(k => `${k}:${counts[k]}`).join(",");
    const cur = out.get(key) || { counts, chance: 0 };
    cur.chance += 1 / (pa.length * pb.length);
    out.set(key, cur);
  }
  return [...out.values()]
    .map(o => ({ ...o, types: Object.keys(o.counts).sort((p, q) => o.counts[q] - o.counts[p]) }))
    .sort((p, q) => q.chance - p.chance);
}

// ── Breeding ──────────────────────────────────────────────────────────────────
// Rolls the baby when the egg is made (the hatch itself has no randomness, so
// the farm's catch-up and Forecast stay exact). rng: () => [0,1)
export function breed(a, b, rng) {
  const pa = pairsOf(genesOf(a)), pb = pairsOf(genesOf(b));
  const genes0 = [...pa[Math.floor(rng() * pa.length) % pa.length], ...pb[Math.floor(rng() * pb.length) % pb.length]];
  const dom = dominantOf(genes0, [a.species, b.species]).pick(rng());
  const genes = sortGenes(genes0, dom);
  // skills: average, rounded; the +1/-1 roll is kept as a number and settled at hatch time
  const skills = {}, rolls = {};
  for (const s of SKILL_KEYS) {
    const x = a.skills?.[s] || 1, y = b.skills?.[s] || 1;
    skills[s] = Math.round((x + y) / 2);
    rolls[s] = Math.round(rng() * 1000) / 1000;
  }
  const best = {};
  for (const s of SKILL_KEYS) best[s] = Math.max(a.skills?.[s] || 1, b.skills?.[s] || 1);
  // looks: hue between the parents (the short way round the colour wheel), a little wobble
  const ha = a.traits?.hue ?? SPECIES[a.species]?.hue ?? 0, hb = b.traits?.hue ?? SPECIES[b.species]?.hue ?? 0;
  let d = ((hb - ha + 540) % 360) - 180;
  const hue = Math.round((ha + d * (0.3 + rng() * 0.4) + (rng() - 0.5) * 24 + 360) % 360);
  const size = Math.round((((a.traits?.size || 1) + (b.traits?.size || 1)) / 2 + (rng() - 0.5) * 0.12) * 100) / 100;
  const personality = rng() < 0.2 ? Object.keys(PERSONALITIES)[Math.floor(rng() * Object.keys(PERSONALITIES).length)] : (rng() < 0.5 ? a : b).traits?.personality || "playful";
  const goldOdds = (a.traits?.rare ? 0.15 : 0) + (b.traits?.rare ? 0.15 : 0) || 0.03;
  const rare = rng() < goldOdds;
  const baby = { species: dom, genes, skills, rolls, best, traits: { hue, size: Math.max(0.8, Math.min(1.25, size)), personality, ...(rare ? { rare: true } : {}) } };
  return { baby, rarity: rarityOf(baby) };
}

// Rarity from the number of types and the skills it'll have.
export function rarityOf(baby) {
  const types = new Set(baby.genes).size;
  const avg = SKILL_KEYS.reduce((n, s) => n + (baby.skills[s] || 1), 0) / SKILL_KEYS.length;
  const score = (types - 1) + Math.max(0, Math.floor((avg - 1.5) / 1.5));   // (gold doesn't change it, so the cost is known up front)
  return RARITY[Math.max(0, Math.min(RARITY.length - 1, score))];
}

// Final skills at hatch time. The Carer's Care level makes a +1 more likely.
export function settleSkills(baby, carerCare = 1) {
  const up = 0.15 + 0.02 * carerCare, down = 0.1;
  const out = {};
  for (const s of SKILL_KEYS) {
    const r = baby.rolls?.[s] ?? 0.5;
    let v = baby.skills[s] || 1;
    if (r < up) v += 1; else if (r > 1 - down) v -= 1;
    out[s] = Math.max(1, Math.min(10, Math.min(v, (baby.best?.[s] || 10) + 1)));
  }
  return out;
}

// ── Wild eggs (found in the Wilds, later in Stampede) ─────────────────────────
const WILD_SKILLS = { common: [1, 2], uncommon: [2, 3], rare: [3, 5], epic: [5, 7], legendary: [7, 9] };
const WILD_TYPES = { common: [1, 1], uncommon: [1, 2], rare: [2, 2], epic: [2, 3], legendary: [3, 4] };
export function wildEgg(rarity, rng) {
  const R = RARITY.includes(rarity) ? rarity : "common";
  const all = Object.keys(SPECIES);
  const [t0, t1] = WILD_TYPES[R];
  const nTypes = t0 + Math.floor(rng() * (t1 - t0 + 1));
  const types = [];
  while (types.length < nTypes) { const t = all[Math.floor(rng() * all.length) % all.length]; if (!types.includes(t)) types.push(t); }
  // spread 4 genes over the types; the first one gets the extras
  const genes = [];
  for (let i = 0; i < GENE_SLOTS; i++) genes.push(types[i < types.length ? i : 0]);
  const dom = types[0];
  const [lo, hi] = WILD_SKILLS[R];
  const skills = {}, rolls = {}, best = {};
  for (const s of SKILL_KEYS) { skills[s] = lo + Math.floor(rng() * (hi - lo + 1)); rolls[s] = 0.5; best[s] = 10; }
  const personalities = Object.keys(PERSONALITIES);
  const rare = rng() < (R === "legendary" ? 0.25 : R === "epic" ? 0.1 : 0.03);
  const baby = {
    species: dom, genes: sortGenes(genes, dom), skills, rolls, best,
    traits: { hue: (SPECIES[dom].hue + Math.round((rng() - 0.5) * 50) + 360) % 360, size: Math.round((0.85 + rng() * 0.35) * 100) / 100, personality: personalities[Math.floor(rng() * personalities.length) % personalities.length], ...(rare ? { rare: true } : {}) },
  };
  return { baby, rarity: R, wild: true };
}

// ── Looks ─────────────────────────────────────────────────────────────────────
// A hybrid keeps its dominant type's body and borrows ears, a tail or wings from
// its other types (most genes first). Stored on the creature as traits.look.
export function lookFor(genes, dominant) {
  const base = SPECIES[dominant];
  if (!base) return null;
  const counts = {};
  for (const g of genes) counts[g] = (counts[g] || 0) + 1;
  const others = Object.keys(counts).filter(t => t !== dominant).sort((a, b) => counts[b] - counts[a]);
  if (!others.length) return null;
  const look = {};
  for (const t of others) {
    const sp = SPECIES[t];
    if (!sp) continue;
    const slot = ["tail", "ears", "extra"].find(k => sp[k] && sp[k] !== "none" && look[k] == null && sp[k] !== base[k]);
    if (slot) look[slot] = sp[slot];
  }
  return Object.keys(look).length ? look : null;
}

// Short label like "Mossling ×2 · Emberpup ×2" (or "purebred Mossling").
export function typeLabel(c) {
  const tc = typeCounts(c);
  if (tc.length === 1) return `purebred ${SPECIES[tc[0].type]?.name || tc[0].type}`;
  return tc.map(t => `${SPECIES[t.type]?.name || t.type} ×${t.n}`).join(" · ");
}
export const comboKey = (genes) => [...new Set(genes)].sort().join("+");

// What making an egg from these two could give: each possible type mix with its
// chance and rarity (skills are the parents' average, so they're known up front).
export function eggPreview(a, b) {
  const skills = {};
  for (const s of SKILL_KEYS) skills[s] = Math.round(((a.skills?.[s] || 1) + (b.skills?.[s] || 1)) / 2);
  return breedOdds(a, b).map(o => {
    const genes = [];
    for (const [t, n] of Object.entries(o.counts)) for (let i = 0; i < n; i++) genes.push(t);
    return { ...o, rarity: rarityOf({ genes, skills, traits: {} }) };
  });
}

// Can the farm pay for an egg of this rarity? (coins + food/goods)
export const canAfford = (w, rarity) => (w.coins || 0) >= RARITY_INFO[rarity].coins && Object.entries(RARITY_INFO[rarity].cost).every(([k, n]) => (w.food?.[k] || 0) >= n);
// Put two creatures in a Hatchery together. MUTATES w (a copy): pays, sets both
// parents nesting and creates the egg. Returns false (changing nothing) if it
// can't happen. Used by the make_egg action and by "repeat this pairing".
export function startEgg(w, h, A, B, rng, by, repeat = false) {
  // Changes w, w.food, h and the two parent objects IN PLACE (the caller hands in copies).
  if (!h || h.egg || !A || !B || A.id === B.id) return false;
  if (![A, B].every(c => c.housed && !c.away && c.grow == null && !c.nest)) return false;
  if (!eggPreview(A, B).every(o => canAfford(w, o.rarity))) return false;   // enough for the priciest outcome
  const { baby, rarity } = breed(A, B, rng);
  const R = RARITY_INFO[rarity];
  w.coins = Math.round(((w.coins || 0) - R.coins) * 100) / 100;
  w.food = { ...w.food };
  for (const [k, n] of Object.entries(R.cost)) w.food[k] -= n;
  for (const c of [A, B]) { c.nest = h.id; c.follow = null; if (c.job === "carer") { c.job = null; c.station = null; } }
  const used = new Set(Object.values(w.creatures || {}).map(c => c.name));
  const free = NAMES.filter(n => !used.has(n));
  const pool = free.length ? free : NAMES;
  const name = pool[Math.floor(rng() * pool.length) % pool.length];
  const id = `e${w.nextId || 1}`;
  w.nextId = (w.nextId || 1) + 1;
  h.egg = { id, stage: "laying", progress: 0, a: A.id, b: B.id, baby, rarity, cost: R.cost, coins: R.coins, by, name };
  h.repeat = repeat ? { a: A.id, b: B.id, by } : null;
  return true;
}
// A repeatable random number source from a string (for "repeat this pairing",
// so the farm's catch-up and Forecast stay exact).
export function seededRng(str) {
  let s = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { s ^= str.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; }
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}