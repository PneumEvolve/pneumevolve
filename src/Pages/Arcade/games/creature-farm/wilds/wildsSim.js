// src/Pages/Arcade/games/creature-farm/wilds/wildsSim.js
//
// The Wilds — a co-op squad trip. Pure rules, no drawing. The device that
// started the trip ("trip host") owns the state, applies everyone's intents
// and runs the fights; the partner gets snapshots (see WildsRun.jsx).
//
// Phases:
//   lobby   pick the squad (co-op: 2 creatures each, solo: 4) and pack rations
//   map     a branching route; either player picks the next stop
//   fight   real-time with a shared pause. Fights start paused so you can plan.
//           Your creatures fight on their own; you can focus a target, move/hold,
//           fire their special move and feed them a ration.
//   event   spoils after a fight, gathering, a camp, a shrine, a wild creature
//   end     home: coins, goods, wild crystals, new friends and Fight XP
//
// Nobody dies: knocked-out creatures get back up after the fight (and come
// home tired). If the whole squad is knocked out, the trip ends early and you
// keep what you found.

import { SPECIES } from "../species";

// ── Tuning ────────────────────────────────────────────────────────────────────
export const ARENA = { W: 960, H: 540 };
export const LAYERS = 8;                         // start, 6 layers of stops, the Goop King
export const SQUAD = 4;
export const PACK_MAX = 8;                        // rations you can bring
export const RATIONS = { berry: 0.14, carrot: 0.2, jam: 0.35, juice: 0.4, cake: 0.7 };   // share of max HP healed
export const FEED_CD = 4;                         // seconds between feedings in a fight (per creature)

// Each species has a role and a special move. Stats at Fight 1.
export const ROLES = {
  pebblet:   { role: "Tank",     hp: 374, dmg: 6,  range: 30,  spd: 55,  cd: 1.1, armor: 4, ab: "shell" },
  mossling:  { role: "Bruiser",  hp: 264, dmg: 9,  range: 30,  spd: 70,  cd: 1.0, armor: 2, ab: "snare", regen: 2.6 },
  emberpup:  { role: "Striker",  hp: 209,  dmg: 14, range: 30,  spd: 88,  cd: 0.9, armor: 1, ab: "burst" },
  puddlet:   { role: "Healer",   hp: 187,  dmg: 5,  range: 150, spd: 65,  cd: 1.2, armor: 0, ab: "splash", healer: true },
  fluffwing: { role: "Skirmisher", hp: 176, dmg: 8, range: 165, spd: 100, cd: 0.7, armor: 0, ab: "gust" },
  glowmoth:  { role: "Support",  hp: 187,  dmg: 7,  range: 170, spd: 72,  cd: 1.0, armor: 0, ab: "glow" },
  zapling:   { role: "Caster",   hp: 165,  dmg: 10, range: 180, spd: 78,  cd: 1.3, armor: 0, ab: "chain" },
};
export const ABILITIES = {
  shell: { name: "Shell Up",    cd: 14, desc: "Pulls nearby enemies onto itself and takes 60% less damage for 4s." },
  snare: { name: "Root Snare",  cd: 12, desc: "Roots enemies around its target for 3s." },
  burst: { name: "Flame Burst", cd: 10, desc: "Big fire blast around itself; enemies keep burning." },
  splash:{ name: "Splash Heal", cd: 12, desc: "Heals every ally nearby by a third." },
  gust:  { name: "Gust",        cd: 9,  desc: "Blows nearby enemies back and stuns them briefly." },
  glow:  { name: "Glow Up",     cd: 16, desc: "Whole squad attacks 40% faster and hits 20% harder for 6s." },
  chain: { name: "Chain Zap",   cd: 9,  desc: "Lightning that jumps between up to 4 enemies." },
};
const PERSONALITY = {
  bold: { dmg: 1.1, spd: 1.1 }, shy: { range: 1.15 }, grumpy: { hp: 1.15 }, playful: { cd: 0.92 },
  sleepy: { hp: 1.1, cd: 1.08 }, greedy: { luck: 1.1 },
};
// Enemies (stats at depth 0; deeper = tougher).
export const FOES = {
  goop:    { name: "Goop",       hp: 92,  dmg: 6,  range: 26,  spd: 62, cd: 1.0, armor: 0, look: "goop",    cost: 1 },
  swarm:   { name: "Goopling",   hp: 40,  dmg: 3,  range: 20,  spd: 88, cd: 0.7, armor: 0, look: "mini",    cost: 0.5 },
  brute:   { name: "Brute",      hp: 330, dmg: 14, range: 34,  spd: 46, cd: 1.6, armor: 3, look: "big",     cost: 3 },
  spitter: { name: "Spitter",    hp: 101,  dmg: 8,  range: 175, spd: 50, cd: 1.8, armor: 0, look: "spitter", cost: 1.5 },
  bulb:    { name: "Goop Bulb",  hp: 121,  dmg: 0,  range: 150, spd: 55, cd: 2.4, armor: 0, look: "bulb",    cost: 2, heals: 40 },
  boss:    { name: "Goop King",  hp: 1800, dmg: 20, range: 64, spd: 40, cd: 1.8, armor: 4, look: "boss",    cost: 0 },
};
export const BOSS_SLAM = { every: 7, wind: 1.3, radius: 115, dmg: 60 };
export const FOE_HP = 1.1, FOE_DMG = 1.35;   // overall enemy toughness
export const TIRE_AFTER = 70;
export const BREATHER = 0.25;                     // share of max HP everyone gets back after winning a fight                     // seconds; after this everyone hits harder and heals less (no endless fights)
export const BLESSINGS = {
  claws: { name: "Sharp Claws", desc: "+15% damage for the rest of the trip." },
  fur:   { name: "Thick Fur",   desc: "+15% max health for the rest of the trip (and heals that much)." },
  paws:  { name: "Quick Paws",  desc: "+15% attack speed for the rest of the trip." },
  luck:  { name: "Lucky Charm", desc: "+30% coins from now on." },
  wind:  { name: "Second Wind", desc: "Everyone gets up and heals 40% right now." },
};
const NODE_TYPES = {
  fight: "Wild goop", elite: "Big trouble", forage: "Gathering spot", camp: "Camp", shrine: "Old shrine", creature: "A wild creature", boss: "The Goop King", start: "Trailhead",
};
export const NODE_NAMES = NODE_TYPES;

// ── Helpers ───────────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function rand(st) {                                  // mulberry32 kept in the state (so the host can save/restore it)
  st.rng = (st.rng + 0x6D2B79F5) >>> 0;
  let t = st.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pickOne = (st, arr) => arr[Math.floor(rand(st) * arr.length) % arr.length];
function weighted(st, table) {
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  let r = rand(st) * total;
  for (const [k, w] of Object.entries(table)) { r -= w; if (r <= 0) return k; }
  return Object.keys(table)[0];
}

// ── Trip ──────────────────────────────────────────────────────────────────────
export function newTrip(seed) {
  return {
    v: 1, phase: "lobby", rng: (seed >>> 0) || 1, coop: false,
    picks: [[], []], rations: {}, ready: [false, false],
    squad: [], map: null, depth: 0, enemies: [], fx: [], t: 0, paused: false, nextId: 1,
    event: null, loot: { coins: 0, goods: {}, friends: [] }, bless: { claws: 0, fur: 0, paws: 0, luck: 0 },
    result: null, log: [], fights: 0,
  };
}

// Creatures a player may bring: theirs (or ones that trust them), not already away.
export function eligible(world, userId) {
  return Object.values(world?.creatures || {}).filter(c => !c.away && (c.owner === String(userId) || (c.bond?.[String(userId)] || 0) >= 50));
}
export const pickLimit = (st, slot) => (st.coop ? 2 : slot === 0 ? SQUAD : 0);

function say(st, text) { st.log = [text, ...st.log].slice(0, 6); }

// Build a fighting unit from a farm creature.
export function makeUnit(st, c, slot) {
  const R = ROLES[c.species] || ROLES.mossling;
  const P = PERSONALITY[c.traits?.personality] || {};
  const lvl = c.skills?.fight || 1;
  const gold = c.traits?.rare ? 1.2 : 1;
  const tired = (c.energy ?? 100) < 30 ? 0.75 : 1;              // tired creatures start a little worn out
  const maxHp = Math.round(R.hp * (1 + 0.12 * (lvl - 1)) * (P.hp || 1) * gold);
  return {
    id: `u${st.nextId++}`, cid: c.id, slot, side: 0, name: c.name, species: c.species,
    hue: c.traits?.hue ?? SPECIES[c.species]?.hue ?? 0, size: c.traits?.size || 1, rare: !!c.traits?.rare, personality: c.traits?.personality,
    lvl, role: R.role, ab: R.ab, healer: !!R.healer, regen: R.regen || 0,
    maxHp, hp: Math.round(maxHp * tired),
    dmg: R.dmg * (1 + 0.1 * (lvl - 1)) * (P.dmg || 1) * gold,
    range: R.range * (R.range > 100 ? (P.range || 1) : 1), spd: R.spd * (P.spd || 1), cd: R.cd * (P.cd || 1), armor: R.armor,
    luck: P.luck || 1,
    x: 0, y: 0, face: 1, atkT: 0, abT: 0, feedT: 0, ko: false, order: null, auto: false,
    st: {}, xp: 0,
  };
}

// ── Intents (from either player) ──────────────────────────────────────────────
// ctx: { world, users: [hostUserId, guestUserId], partnerHere }
export function canControl(st, u, slot, ctx) {
  return u && u.side === 0 && (u.slot === slot || (slot === 0 && !ctx.partnerHere) || (!st.coop && slot === 0));
}

export function applyIntent(st, slot, i, ctx) {
  if (!i || !i.k) return false;
  const k = i.k;
  if (k === "pause" && (st.phase === "fight")) { st.paused = !st.paused; say(st, st.paused ? "Paused" : "Go!"); return true; }

  if (st.phase === "lobby") {
    if (k === "join" && slot === 1) {
      if (!st.coop) { st.coop = true; st.picks[0] = st.picks[0].slice(0, 2); st.ready = [false, false]; }
      return true;
    }
    if (k === "leave" && slot === 1) { st.coop = false; st.picks[1] = []; st.ready = [false, false]; return true; }
    if (k === "pick") {
      const mine = eligible(ctx.world, ctx.users[slot]).some(c => c.id === i.cid);
      if (!mine || st.picks[0].includes(i.cid) || st.picks[1].includes(i.cid)) return false;
      if (st.picks[slot].length >= pickLimit(st, slot)) return false;
      st.picks[slot] = [...st.picks[slot], i.cid]; st.ready[slot] = false; return true;
    }
    if (k === "unpick") { st.picks[slot] = st.picks[slot].filter(id => id !== i.cid); st.ready[slot] = false; return true; }
    if (k === "ration") {
      if (!RATIONS[i.item]) return false;
      const have = Math.floor(ctx.world?.food?.[i.item] || 0), cur = st.rations[i.item] || 0;
      const total = Object.values(st.rations).reduce((a, b) => a + b, 0);
      const next = cur + (i.d > 0 ? 1 : -1);
      if (next < 0 || next > have || (i.d > 0 && total >= PACK_MAX)) return false;
      st.rations = { ...st.rations, [i.item]: next };
      if (!next) delete st.rations[i.item];
      return true;
    }
    if (k === "ready") { st.ready[slot] = !!i.v; return true; }
    if (k === "go" && slot === 0) return setOff(st, ctx);
    return false;
  }

  if (st.phase === "map" && k === "node") return enterNode(st, i.id);
  if (k === "feed") return feed(st, slot, i.u, i.item, ctx);

  if (st.phase === "fight") {
    const u = st.squad.find(x => x.id === i.u);
    if (k === "order" && canControl(st, u, slot, ctx) && !u.ko) {
      if (i.target) { const e = st.enemies.find(x => x.id === i.target && x.hp > 0); if (e) u.order = { type: "attack", target: e.id }; }
      else if (Number.isFinite(i.x)) u.order = { type: "move", x: clamp(i.x, 20, ARENA.W - 20), y: clamp(i.y, 60, ARENA.H - 20) };
      else u.order = null;
      return true;
    }
    if (k === "ability" && canControl(st, u, slot, ctx)) return cast(st, u);
    if (k === "auto" && canControl(st, u, slot, ctx)) { u.auto = !u.auto; return true; }
    return false;
  }

  if (st.phase === "event") {
    const ev = st.event;
    if (k === "bless" && ev?.type === "shrine" && ev.options.includes(i.id)) { bless(st, i.id); st.event = null; st.phase = "map"; return true; }
    if (k === "befriend" && ev?.type === "creature" && !ev.taken) {
      st.loot.friends.push({ species: ev.species, hue: ev.hue, rare: ev.rare, by: ctx.users[slot] });
      ev.taken = true; say(st, `${ev.rare ? "A golden " : "A "}${SPECIES[ev.species].name} wants to come home with you!`);
      return true;
    }
    if (k === "next") {
      if (st.event?.final) { finish(st, !!st.event.won); return true; }
      st.event = null; st.phase = "map"; return true;
    }
  }
  if (st.phase === "end") return false;
  return false;
}

function setOff(st, ctx) {
  const ids = [...st.picks[0], ...st.picks[1]];
  if (!ids.length || (st.coop && (!st.ready[1] || !st.picks[1].length))) return false;
  st.squad = [];
  for (const slot of [0, 1]) for (const cid of st.picks[slot]) {
    const c = ctx.world?.creatures?.[cid];
    if (c) st.squad.push(makeUnit(st, c, slot));
  }
  if (!st.squad.length) return false;
  st.map = makeMap(st);
  st.phase = "map";
  say(st, "Into the Wilds!");
  return true;
}

// ── Map ───────────────────────────────────────────────────────────────────────
export function makeMap(st) {
  const layers = [];
  for (let l = 0; l < LAYERS; l++) {
    const n = l === 0 || l === LAYERS - 1 ? 1 : l === LAYERS - 2 ? 2 : 2 + (rand(st) < 0.55 ? 1 : 0);
    const row = [];
    for (let i = 0; i < n; i++) {
      let type;
      if (l === 0) type = "start";
      else if (l === LAYERS - 1) type = "boss";
      else if (l === 1) type = "fight";
      else if (l === 2) type = weighted(st, { fight: 6, forage: 2, creature: 2 });
      else if (l === LAYERS - 2) type = i === 0 ? "camp" : "shrine";
      else type = weighted(st, { fight: 40, elite: 16, forage: 12, camp: 9, shrine: 13, creature: 10 });
      row.push({ id: `n${l}_${i}`, layer: l, i, type, next: [], x: l / (LAYERS - 1), y: (i + 1) / (n + 1) });
    }
    layers.push(row);
  }
  for (let l = 0; l < LAYERS - 1; l++) {
    const a = layers[l], b = layers[l + 1];
    for (const node of a) {
      const j = a.length === 1 ? null : Math.round((node.i * (b.length - 1)) / (a.length - 1));
      const targets = j == null ? b.map(x => x.i) : [j, ...(rand(st) < 0.5 && b[j + 1] ? [j + 1] : []), ...(rand(st) < 0.3 && b[j - 1] ? [j - 1] : [])];
      node.next = [...new Set(targets)].map(t => b[t].id);
    }
    for (const nb of b) if (!a.some(na => na.next.includes(nb.id))) { const na = a[Math.min(a.length - 1, Math.round((nb.i * (a.length - 1)) / Math.max(1, b.length - 1)))]; na.next.push(nb.id); }
  }
  return { layers, cur: layers[0][0].id, visited: [layers[0][0].id] };
}
export const nodeById = (map, id) => map?.layers.flat().find(n => n.id === id);
export const reachable = (st) => (nodeById(st.map, st.map?.cur)?.next || []);

function enterNode(st, id) {
  if (!reachable(st).includes(id)) return false;
  const node = nodeById(st.map, id);
  st.map.cur = id; st.map.visited = [...st.map.visited, id];
  st.depth = node.layer;
  if (node.type === "fight" || node.type === "elite" || node.type === "boss") { startFight(st, node.type); return true; }
  st.phase = "event";
  if (node.type === "forage") {
    const goods = {};
    for (let r = 0; r < 2; r++) addRoll(st, goods, 4, 8);
    goods[rand(st) < 0.5 ? "berry" : "carrot"] = (goods.berry || 0) + 6 + Math.floor(rand(st) * 5);
    if (rand(st) < 0.3) goods.crystal = (goods.crystal || 0) + 1;
    addGoods(st.loot.goods, goods);
    st.event = { type: "forage", goods };
  } else if (node.type === "camp") {
    for (const u of st.squad) { u.ko = false; u.hp = Math.min(u.maxHp, Math.max(u.hp, 0) + u.maxHp * 0.5); }
    st.event = { type: "camp" };
  } else if (node.type === "shrine") {
    const all = Object.keys(BLESSINGS), options = [];
    while (options.length < 3) { const b = pickOne(st, all); if (!options.includes(b)) options.push(b); }
    st.event = { type: "shrine", options };
  } else if (node.type === "creature") {
    const pool = Object.keys(SPECIES);
    const species = pickOne(st, pool);
    st.event = { type: "creature", species, hue: (SPECIES[species].hue + Math.floor((rand(st) - 0.5) * 50) + 360) % 360, rare: rand(st) < 0.12, taken: false };
  }
  return true;
}

function bless(st, id) {
  if (id === "wind") { for (const u of st.squad) { u.ko = false; u.hp = Math.min(u.maxHp, Math.max(0, u.hp) + u.maxHp * 0.4); } }
  else if (id === "fur") { st.bless.fur++; for (const u of st.squad) { const add = Math.round(u.maxHp * 0.15); u.maxHp += add; if (!u.ko) u.hp += add; } }
  else st.bless[id] = (st.bless[id] || 0) + 1;
  say(st, `${BLESSINGS[id].name}!`);
}

// ── Loot ──────────────────────────────────────────────────────────────────────
const GOODS = ["moss", "ember", "bubble", "fluff", "glow", "pebble", "spark"];
function addRoll(st, goods, lo, hi) { const k = pickOne(st, GOODS); goods[k] = (goods[k] || 0) + lo + Math.floor(rand(st) * (hi - lo + 1)); }
function addGoods(into, add) { for (const [k, n] of Object.entries(add)) into[k] = (into[k] || 0) + n; }
const luckOf = (st) => (1 + 0.3 * (st.bless.luck || 0)) * Math.max(1, ...st.squad.map(u => u.luck || 1));

// ── Fights ────────────────────────────────────────────────────────────────────
function spawnFoe(st, kind, x, y) {
  const F = FOES[kind], d = st.depth;
  const hpMul = FOE_HP * (kind === "boss" ? 1 : 1 + 0.15 * d), dmgMul = FOE_DMG * (kind === "boss" ? 1 : 1 + 0.10 * d);
  const e = {
    id: `e${st.nextId++}`, side: 1, kind, look: F.look, name: F.name,
    maxHp: Math.round(F.hp * hpMul), hp: Math.round(F.hp * hpMul), dmg: F.dmg * dmgMul, range: F.range, spd: F.spd, cd: F.cd, armor: F.armor, heals: (F.heals || 0) * dmgMul,
    x, y, face: -1, atkT: 0.5 + rand(st) * 0.8, st: {}, flash: 0,
  };
  if (kind === "boss") { e.slamT = BOSS_SLAM.every; e.summonT = 12; e.wind = 0; }
  st.enemies.push(e);
  return e;
}

export function startFight(st, type) {
  st.phase = "fight"; st.enemies = []; st.fx = []; st.t = 0; st.paused = true; st.fightType = type;
  // squad on the left
  const alive = st.squad;
  alive.forEach((u, i) => {
    u.x = 150 + (u.range > 100 ? -40 : 30); u.y = alive.length > 1 ? 160 + i * (240 / (alive.length - 1)) : 270;
    u.order = null; u.atkT = 0; u.st = {}; u.face = 1;
    if (u.ko) { u.ko = false; u.hp = Math.max(1, Math.round(u.maxHp * 0.2)); }
  });
  if (type === "boss") {
    spawnFoe(st, "boss", 780, 270);
    for (let i = 0; i < 4; i++) spawnFoe(st, "goop", 700, 140 + i * 85);
  } else {
    let budget = 3 + st.depth * 1.4;
    if (type === "elite") { budget = budget * 1.5 + 1; spawnFoe(st, "brute", 760, 270); budget -= 3; }
    const table = st.depth < 2 ? { goop: 6, swarm: 3, spitter: 1 } : { goop: 5, swarm: 3, spitter: 3, bulb: 1.5, brute: 1.5 };
    let guard = 0, bulbs = 0;
    while (budget > 0.4 && guard++ < 40) {
      let kind = weighted(st, table);
      if (kind === "bulb" && bulbs >= (type === "elite" ? 2 : 1)) kind = "goop";
      if (kind === "bulb") bulbs++;
      const n = kind === "swarm" ? 3 : 1;
      for (let k = 0; k < n; k++) spawnFoe(st, kind, 640 + rand(st) * 240, 90 + rand(st) * 400);
      budget -= FOES[kind].cost * n;
    }
  }
  say(st, type === "boss" ? "The Goop King blocks the way!" : type === "elite" ? "Something big is coming…" : "Wild goop!");
}

// Effects drawn by the UI (short-lived): { k, x, y, x2, y2, r, t, n, col }
function fx(st, f) { st.fx.push({ ...f, t: 0 }); if (st.fx.length > 80) st.fx.splice(0, st.fx.length - 80); }

function damage(st, target, amount, src) {
  if (!target || target.hp <= 0 || target.ko) return;
  let a = amount;
  if (target.st.shield > 0) a *= 0.4;
  a = Math.max(1, a - (target.armor || 0));
  target.hp -= a;
  target.flash = 0.12;
  fx(st, { k: "num", x: target.x + (rand(st) - 0.5) * 10, y: target.y - 34, n: Math.round(a), col: target.side === 0 ? "#ff8a8a" : "#fff" });
  if (target.hp <= 0) {
    target.hp = 0;
    if (target.side === 0) { target.ko = true; target.order = null; say(st, `${target.name} is knocked out!`); }
    else fx(st, { k: "pop", x: target.x, y: target.y, r: target.kind === "boss" ? 60 : target.kind === "brute" ? 30 : 20 });
  }
}
function heal(st, target, amount) {
  if (!target || target.ko || target.hp <= 0) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount * (st.phase === "fight" ? healMul(st) : 1));
  if (target.hp - before >= 1) fx(st, { k: "heal", x: target.x, y: target.y - 34, n: Math.round(target.hp - before) });
}
const living = (list) => list.filter(u => (u.side === 0 ? !u.ko : u.hp > 0));
const nearest = (from, list) => { let best = null, bd = Infinity; for (const u of list) { const d = dist(from, u); if (d < bd) { bd = d; best = u; } } return best; };
const tired = (st) => Math.max(0, st.t - TIRE_AFTER);                   // seconds past the fatigue mark
const dmgMul = (st, u) => (1 + 0.15 * (st.bless.claws || 0)) * (u.st.glow > 0 ? 1.2 : 1) * (1 + 0.03 * tired(st));
const healMul = (st) => Math.max(0.2, 1 - 0.02 * tired(st));
const spdMul = (st, u) => (1 + 0.15 * (st.bless.paws || 0)) * (u.st.glow > 0 ? 1.4 : 1);

export function cast(st, u) {
  if (!u || u.ko || u.abT > 0 || st.phase !== "fight") return false;
  const foes = living(st.enemies), allies = living(st.squad);
  const power = u.dmg / (ROLES[u.species]?.dmg || 10) * dmgMul(st, u);        // scales with level/personality/blessings
  const tgt = (u.order?.type === "attack" && st.enemies.find(e => e.id === u.order.target && e.hp > 0)) || nearest(u, foes);
  const AB = ABILITIES[u.ab];
  if (u.ab === "shell") {
    u.st.shield = 4;
    for (const e of foes) if (dist(e, u) < 190) { e.st.taunt = 4; e.st.tauntBy = u.id; }
    fx(st, { k: "ring", x: u.x, y: u.y, r: 190, col: "#d9c9a8" });
  } else if (u.ab === "snare") {
    if (!tgt) return false;
    for (const e of foes) if (dist(e, tgt) < 85) { e.st.root = 3; damage(st, e, 25 * power, u); }
    fx(st, { k: "ring", x: tgt.x, y: tgt.y, r: 85, col: "#6fbf4a" });
  } else if (u.ab === "burst") {
    if (!foes.some(e => dist(e, u) < 120)) return false;
    for (const e of foes) if (dist(e, u) < 85) { damage(st, e, 75 * power, u); e.st.burn = 3; e.st.burnDmg = 11 * power; }
    fx(st, { k: "boom", x: u.x, y: u.y, r: 85, col: "#ff7a2e" });
  } else if (u.ab === "splash") {
    for (const a of allies) if (dist(a, u) < 160) heal(st, a, a.maxHp * 0.33 * Math.min(1.6, power));
    fx(st, { k: "ring", x: u.x, y: u.y, r: 160, col: "#7fd4ff" });
  } else if (u.ab === "gust") {
    if (!foes.some(e => dist(e, u) < 140)) return false;
    for (const e of foes) if (dist(e, u) < 110) {
      const d = Math.max(1, dist(e, u)), push = e.kind === "boss" ? 20 : 120;
      e.x = clamp(e.x + ((e.x - u.x) / d) * push, 20, ARENA.W - 20); e.y = clamp(e.y + ((e.y - u.y) / d) * push, 60, ARENA.H - 20);
      e.st.stun = e.kind === "boss" ? 0.3 : 0.9; damage(st, e, 22 * power, u);
    }
    fx(st, { k: "ring", x: u.x, y: u.y, r: 110, col: "#ffffff" });
  } else if (u.ab === "glow") {
    for (const a of allies) a.st.glow = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 260, col: "#ffe36b" });
  } else if (u.ab === "chain") {
    if (!tgt) return false;
    let cur = tgt, hit = [tgt];
    damage(st, tgt, 50 * power, u);
    fx(st, { k: "zap", x: u.x, y: u.y - 20, x2: tgt.x, y2: tgt.y - 14 });
    for (let n = 0; n < 3; n++) {
      const nx = nearest(cur, foes.filter(e => !hit.includes(e) && dist(e, cur) < 170));
      if (!nx) break;
      fx(st, { k: "zap", x: cur.x, y: cur.y - 14, x2: nx.x, y2: nx.y - 14 });
      damage(st, nx, 50 * power, u); hit.push(nx); cur = nx;
    }
  }
  u.abT = AB.cd;
  fx(st, { k: "label", x: u.x, y: u.y - 58, text: AB.name });
  return true;
}

function feed(st, slot, uid, item, ctx) {
  const u = st.squad.find(x => x.id === uid);
  if (!u || !RATIONS[item] || !(st.rations[item] > 0)) return false;
  if (st.phase === "fight" && !canControl(st, u, slot, ctx) && st.coop) return false;
  if (u.ko && item !== "cake") return false;
  if (st.phase === "fight" && u.feedT > 0) return false;
  if (!u.ko && u.hp >= u.maxHp) return false;
  if (u.ko) { u.ko = false; u.hp = 1; }
  st.rations = { ...st.rations, [item]: st.rations[item] - 1 };
  if (!st.rations[item]) delete st.rations[item];
  u.feedT = FEED_CD;
  heal(st, u, u.maxHp * RATIONS[item]);
  if (st.phase !== "fight") u.hp = Math.min(u.maxHp, u.hp);
  return true;
}

// One step of the fight (dt seconds). Does nothing while paused.
export function stepTrip(st, dt) {
  for (const f of st.fx) f.t += dt;
  st.fx = st.fx.filter(f => f.t < (f.k === "num" || f.k === "heal" ? 0.9 : f.k === "label" ? 1.2 : 0.5));
  if (st.phase !== "fight" || st.paused) return;
  st.t += dt;
  if (st.t - dt < TIRE_AFTER && st.t >= TIRE_AFTER) say(st, "Everyone's getting tired: hits land harder, healing fades");
  const squad = living(st.squad), foes = living(st.enemies);
  const all = [...squad, ...foes];

  for (const u of all) {
    const s = u.st;
    for (const key of ["root", "stun", "shield", "taunt", "glow", "burn"]) if (s[key] > 0) s[key] = Math.max(0, s[key] - dt);
    if (s.burn > 0 && u.hp > 0) {                              // burning: steady damage, ignores armour
      u.hp -= (s.burnDmg || 4) * dt;
      if (u.hp <= 0) { u.hp = 0; if (u.side === 0) u.ko = true; else fx(st, { k: "pop", x: u.x, y: u.y, r: 20 }); }
    }
    u.atkT -= dt; if (u.flash) u.flash = Math.max(0, u.flash - dt);
    if (u.side === 0) { u.abT = Math.max(0, u.abT - dt); u.feedT = Math.max(0, u.feedT - dt); if (u.regen) heal(st, u, u.regen * dt); }
  }

  // creatures
  for (const u of living(st.squad)) {
    const foesNow = living(st.enemies);
    if (!foesNow.length) break;
    // automatic special moves
    if (u.auto && u.abT <= 0) {
      const near = foesNow.filter(e => dist(e, u) < (u.range > 100 ? u.range : 120)).length;
      const hurt = living(st.squad).some(a => a.hp < a.maxHp * 0.55 && dist(a, u) < 160);
      if ((u.ab === "splash" && hurt) || (u.ab !== "splash" && near >= (u.ab === "chain" || u.ab === "snare" ? 1 : 2))) cast(st, u);
    }
    let target = null, moveTo = null, healing = false;
    if (u.order?.type === "attack") { target = st.enemies.find(e => e.id === u.order.target && e.hp > 0) || null; if (!target) u.order = null; }
    if (u.order?.type === "move") {
      if (dist(u, u.order) > 6) moveTo = u.order;
      const inRange = foesNow.filter(e => dist(e, u) <= u.range + 18);
      target = nearest(u, inRange);
    }
    if (!u.order) {
      if (u.healer) {
        const hurt = living(st.squad).filter(a => a.hp < a.maxHp * 0.8).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (hurt) { target = hurt; healing = true; }
      }
      if (!target) target = nearest(u, foesNow);
    }
    const s = u.st, stuck = s.root > 0 || s.stun > 0;
    if (moveTo && !stuck) step(u, moveTo, u.spd, dt);
    else if (target && !stuck) {
      const d = dist(u, target);
      if (d > u.range + 10) step(u, target, u.spd, dt);
      else if (!healing && u.range > 100) {                 // ranged creatures back off from anything in their face
        const close = nearest(u, foesNow);
        if (close && dist(close, u) < 60) step(u, { x: u.x - (close.x - u.x), y: u.y - (close.y - u.y) }, u.spd * 0.7, dt);
      }
    }
    if (target) u.face = target.x >= u.x ? 1 : -1;
    if (target && !s.stun && dist(u, target) <= u.range + 16 && u.atkT <= 0) {
      u.atkT = u.cd / spdMul(st, u);
      if (healing) { heal(st, target, u.dmg * 4 * dmgMul(st, u)); fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: target.x, y2: target.y - 14, col: "#7fd4ff" }); }
      else {
        damage(st, target, u.dmg * dmgMul(st, u), u);
        if (u.range > 100) fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: target.x, y2: target.y - 14, col: u.species === "zapling" ? "#c49bff" : u.species === "glowmoth" ? "#ffe36b" : u.species === "puddlet" ? "#7fd4ff" : "#ffffff" });
        else fx(st, { k: "hit", x: target.x, y: target.y - 14 });
      }
    }
  }

  // enemies
  for (const e of living(st.enemies)) {
    const targets = living(st.squad);
    if (!targets.length) break;
    const s = e.st, stuck = s.root > 0 || s.stun > 0;
    let target = s.taunt > 0 ? st.squad.find(u => u.id === s.tauntBy && !u.ko) : null;
    if (e.kind === "bulb") {
      const hurt = living(st.enemies).filter(x => x !== e && x.hp < x.maxHp * 0.9).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const threat = nearest(e, targets);
      if (!stuck) {
        if (threat && dist(threat, e) < 170) step(e, { x: e.x + (e.x - threat.x), y: e.y + (e.y - threat.y) }, e.spd * 0.65, dt);   // slow enough to catch
        else if (hurt && dist(hurt, e) > e.range) step(e, hurt, e.spd, dt);
      }
      if (hurt && dist(hurt, e) <= e.range && e.atkT <= 0) { e.atkT = e.cd; heal(st, hurt, e.heals); fx(st, { k: "shot", x: e.x, y: e.y - 18, x2: hurt.x, y2: hurt.y - 14, col: "#9cff7a" }); }
      continue;
    }
    if (!target) target = nearest(e, targets);
    if (e.kind === "boss") {
      e.slamT -= dt; e.summonT -= dt;
      if (e.wind > 0) {
        e.wind -= dt;
        if (e.wind <= 0) {
          for (const u of living(st.squad)) if (dist(u, e.slam) < BOSS_SLAM.radius) damage(st, u, BOSS_SLAM.dmg, e);
          fx(st, { k: "boom", x: e.slam.x, y: e.slam.y, r: BOSS_SLAM.radius, col: "#8a3bd0" });
        }
        continue;                                          // stands still while winding up
      }
      if (e.slamT <= 0 && target && dist(target, e) < 260) { e.slamT = BOSS_SLAM.every; e.wind = BOSS_SLAM.wind; e.slam = { x: target.x, y: target.y }; continue; }
      if (e.summonT <= 0) { e.summonT = 14; for (let i = 0; i < 3; i++) spawnFoe(st, "goop", e.x - 40, e.y - 80 + i * 80); say(st, "The Goop King calls for help!"); }
    }
    if (!stuck && target) {
      const d = dist(e, target);
      if (e.kind === "spitter" && d < e.range * 0.6) step(e, { x: e.x + (e.x - target.x), y: e.y + (e.y - target.y) }, e.spd * 0.6, dt);
      else if (d > e.range + 8) step(e, target, e.spd, dt);
    }
    if (target) e.face = target.x >= e.x ? 1 : -1;
    if (target && !s.stun && dist(e, target) <= e.range + 16 && e.atkT <= 0) {
      e.atkT = e.cd;
      damage(st, target, e.dmg * (1 + 0.03 * tired(st)), e);
      fx(st, e.range > 100 ? { k: "shot", x: e.x, y: e.y - 20, x2: target.x, y2: target.y - 14, col: "#ff9a4a" } : { k: "hit", x: target.x, y: target.y - 14 });
    }
  }

  // keep units apart
  for (const list of [living(st.squad), living(st.enemies)]) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], d = dist(a, b), min = a.kind === "boss" || b.kind === "boss" ? 60 : 30;
    if (d > 0 && d < min) { const p = (min - d) / 2 / d; a.x -= (b.x - a.x) * p; a.y -= (b.y - a.y) * p; b.x += (b.x - a.x) * p; b.y += (b.y - a.y) * p; }
  }
  for (const u of all) { u.x = clamp(u.x, 20, ARENA.W - 20); u.y = clamp(u.y, 60, ARENA.H - 14); }
  st.enemies = st.enemies.filter(e => e.hp > 0 || false);

  // fight over?
  if (!living(st.squad).length) { endFight(st, false); return; }
  if (!living(st.enemies).length) endFight(st, true);
}
function step(u, to, spd, dt) {
  const dx = to.x - u.x, dy = to.y - u.y, d = Math.hypot(dx, dy);
  if (d < 1) return;
  const m = Math.min(d, spd * dt);
  u.x += (dx / d) * m; u.y += (dy / d) * m;
}

function endFight(st, won) {
  st.fights++;
  const type = st.fightType;
  for (const u of st.squad) u.xp += (won ? 700 : 350) + 140 * st.depth + (type === "elite" ? 400 : type === "boss" ? 900 : 0);
  if (!won) {
    st.phase = "event";
    st.event = { type: "defeat", final: true, won: false };
    say(st, "The squad is all knocked out…");
    return;
  }
  const luck = luckOf(st);
  const coins = Math.round((type === "boss" ? 140 : (12 + st.depth * 6) * (type === "elite" ? 1.8 : 1)) * luck);
  const goods = {};
  addRoll(st, goods, 2, 4);
  if (type !== "fight") addRoll(st, goods, 3, 6);
  const crystals = type === "boss" ? 3 : type === "elite" ? (rand(st) < 0.6 ? 1 + (rand(st) < 0.3 ? 1 : 0) : 0) : rand(st) < 0.12 ? 1 : 0;
  if (crystals) goods.crystal = crystals;
  st.loot.coins += coins;
  addGoods(st.loot.goods, goods);
  for (const u of st.squad) {                               // everyone catches their breath after a win
    if (u.ko) { u.ko = false; u.hp = Math.max(1, Math.round(u.maxHp * 0.2)); }
    else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * BREATHER);
  }
  st.phase = "event";
  st.event = { type: "spoils", coins, goods, boss: type === "boss", final: type === "boss", won: true };
  say(st, type === "boss" ? "The Goop King is beaten!" : "Victory!");
}

function finish(st, won) {
  st.phase = "end";
  st.result = {
    won,
    squad: st.squad.map(u => ({ cid: u.cid, name: u.name, hp: u.ko ? 0 : Math.max(0, u.hp / u.maxHp), xp: Math.round(u.xp) })),
    coins: Math.round(st.loot.coins * (won ? 1 : 0.6)), goods: st.loot.goods, friends: st.loot.friends, rations: st.rations,
  };
}
// Giving up early (Back to farm mid-trip): keep what you found, like a defeat.
export function retreat(st) { if (st.phase !== "end" && st.phase !== "lobby") finish(st, false); }

// What the partner needs to draw everything (the host's state is already this shape).
export function snapshot(st) {
  const r = (v) => Math.round(v);
  return {
    ...st,
    squad: st.squad.map(u => ({ ...u, x: r(u.x), y: r(u.y), hp: Math.round(u.hp * 10) / 10, st: { ...u.st } })),
    enemies: st.enemies.map(e => ({ ...e, x: r(e.x), y: r(e.y), hp: Math.round(e.hp * 10) / 10, st: { ...e.st } })),
  };
}