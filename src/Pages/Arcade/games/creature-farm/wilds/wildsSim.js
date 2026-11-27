// src/Pages/Arcade/games/creature-farm/wilds/wildsSim.js
//
// The Wilds — a co-op squad trip. Pure rules, no drawing. The device that
// started the trip ("trip host") owns the state, applies everyone's intents
// and runs the fights; the partner gets snapshots (see WildsRun.jsx).
//
// Phases:
//   lobby   pick the squad (co-op: 2 creatures each, solo: 4) and pack rations
//   map     a branching route; either player picks the next stop
//   fight   an auto-battle with a shared pause. Creatures pick targets and fight
//           on their own; you choose when to use their special moves, can drag a
//           creature to steer it, tap a goop to focus it, and feed rations.
//   event   spoils after a fight, gathering, a camp, a shrine, a wild creature
//   end     home: coins, goods, wild crystals, new friends and Fight XP
//
// Nobody dies: knocked-out creatures get back up after the fight (and come
// home tired). If the whole squad is knocked out, the trip ends early and you
// keep what you found.

import { SPECIES } from "../species";

// ── Tuning ────────────────────────────────────────────────────────────────────
export const ARENA = { W: 960, H: 540 };
export const LAYERS = 7;                         // start, 5 layers of stops, the Goop King (a 6-8 minute trip)
export const SQUAD = 4;
export const PACK_MAX = 8;                        // rations you can bring
export const RATIONS = { berry: 0.14, carrot: 0.2, jam: 0.35, juice: 0.4, cake: 0.7 };   // share of max HP healed
export const FEED_CD = 4;                         // seconds between feedings in a fight (per creature)
export const GET_READY = 1.5;
// Route tiers: tougher goop, better loot and eggs. "fight" = the Fight level it's meant for.
export const TIERS = [
  { name: "Meadow Trail",  fight: 1, hp: 1,   dmg: 1,    loot: 1,   egg: { uncommon: 40, rare: 35, epic: 20, legendary: 5 } },
  { name: "Deep Woods",    fight: 3, hp: 2.2, dmg: 1.6,  loot: 1.7, egg: { uncommon: 20, rare: 40, epic: 30, legendary: 10 } },
  { name: "Goop Marsh",    fight: 5, hp: 3.0, dmg: 2.0,  loot: 2.6, egg: { rare: 35, epic: 45, legendary: 20 } },
  { name: "The Wild Heart",fight: 8, hp: 5.0, dmg: 2.95, loot: 4,   egg: { epic: 55, legendary: 45 } },
];                     // seconds before a fight starts moving
export const HOLD_AFTER_MOVE = 1.5;               // after you steer a creature it waits this long, then fights on its own

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
// Every type has 4 moves. ai = when "auto" fires it: near2 (2+ enemies close), any
// (an enemy around), hurt (an ally under 55%), ko (someone knocked out or hurt), fight (any time).
export const ABILITIES = {
  // Pebblet
  shell:   { name: "Shell Up",      cd: 14, ai: "near2", desc: "Pulls nearby enemies onto itself and takes 60% less damage for 4s." },
  rock:    { name: "Rock Toss",     cd: 8,  ai: "any",   desc: "Throws a rock at its target: good damage and a 1.2s stun." },
  stone:   { name: "Stone Skin",    cd: 18, ai: "fight", desc: "The whole squad shrugs off 5 damage from every hit for 6s." },
  avalanche:{ name: "Avalanche",    cd: 24, ai: "near2", desc: "Huge rockslide around itself: heavy damage and a 1.5s stun." },
  // Mossling
  snare:   { name: "Root Snare",    cd: 12, ai: "any",   desc: "Roots enemies around its target for 3s." },
  thorns:  { name: "Thorn Coat",    cd: 16, ai: "near2", desc: "For 6s, anything that hits it takes 40% of the damage back." },
  bloom:   { name: "Overgrowth",    cd: 18, ai: "hurt",  desc: "Heals itself 35% and the squad regrows health for 6s." },
  grove:   { name: "Ancient Grove", cd: 26, ai: "near2", desc: "Roots every enemy for 3s and hurts them all." },
  // Emberpup
  burst:   { name: "Flame Burst",   cd: 10, ai: "near2", desc: "Big fire blast around itself; enemies keep burning." },
  dash:    { name: "Blaze Dash",    cd: 9,  ai: "any",   desc: "Dashes through to the farthest goop nearby, burning everything on the way." },
  kindle:  { name: "Kindle",        cd: 16, ai: "any",   desc: "Attacks 60% faster for 6s." },
  inferno: { name: "Inferno",       cd: 26, ai: "near2", desc: "A wall of fire around it: massive damage and burning." },
  // Puddlet
  splash:  { name: "Splash Heal",   cd: 12, ai: "hurt",  desc: "Heals every ally nearby by a third." },
  bubble:  { name: "Bubble Shield", cd: 10, ai: "hurt",  desc: "Wraps the most hurt ally in a bubble: 60% less damage for 5s." },
  rain:    { name: "Gentle Rain",   cd: 18, ai: "hurt",  desc: "Heals the whole squad 20%, wherever they are, and puts out burns." },
  tide:    { name: "Tidal Wave",    cd: 30, ai: "ko",    desc: "Gets a knocked-out ally back up at 40% (or heals everyone 35%)." },
  // Fluffwing
  gust:    { name: "Gust",          cd: 9,  ai: "near2", desc: "Blows nearby enemies back and stuns them briefly." },
  volley:  { name: "Feather Volley",cd: 8,  ai: "any",   desc: "Feathers rain on up to 5 enemies." },
  tailwind:{ name: "Tailwind",      cd: 18, ai: "fight", desc: "The squad moves and attacks 30% faster for 6s." },
  cyclone: { name: "Cyclone",       cd: 24, ai: "near2", desc: "Sucks enemies into a whirlwind and stuns them for 2s." },
  // Glowmoth
  glow:    { name: "Glow Up",       cd: 16, ai: "fight", desc: "Whole squad attacks 40% faster and hits 20% harder for 6s." },
  dazzle:  { name: "Dazzle",        cd: 12, ai: "near2", desc: "A flash that stuns enemies nearby for 1s and weakens them (-30% damage) for 5s." },
  moon:    { name: "Moonbeam",      cd: 10, ai: "hurt",  desc: "Heals the most hurt ally by half." },
  starfall:{ name: "Starfall",      cd: 28, ai: "near2", desc: "Stars hit every enemy on the field." },
  // Zapling
  chain:   { name: "Chain Zap",     cd: 9,  ai: "any",   desc: "Lightning that jumps between up to 4 enemies." },
  static:  { name: "Static Field",  cd: 12, ai: "any",   desc: "Charges the air around its target: enemies there keep getting zapped for 5s." },
  overcharge:{ name: "Overcharge",  cd: 16, ai: "any",   desc: "Hits 80% harder for 6s." },
  storm:   { name: "Thunderstorm",  cd: 26, ai: "near2", desc: "8 lightning bolts strike random enemies and stun them." },
};
// Each type's moves in the order they unlock.
export const TYPE_MOVES = {
  pebblet: ["shell", "rock", "stone", "avalanche"],
  mossling: ["snare", "thorns", "bloom", "grove"],
  emberpup: ["burst", "dash", "kindle", "inferno"],
  puddlet: ["splash", "bubble", "rain", "tide"],
  fluffwing: ["gust", "volley", "tailwind", "cyclone"],
  glowmoth: ["glow", "dazzle", "moon", "starfall"],
  zapling: ["chain", "static", "overcharge", "storm"],
};
// Move slots open at these Fight levels.
export const SLOT_UNLOCK = [1, 3, 5, 8];
// A creature's 4 move slots, filled from its genes: a purebred gets all 4 of its
// type's moves; Mossling ×2 · Emberpup ×2 gets the first 2 of each (taking turns,
// so a hybrid gets both types' first moves early). [{ k, type, unlock, open }]
export function movesFor(c) {
  const genes = Array.isArray(c.genes) && c.genes.length === 4 ? c.genes : [c.species, c.species, c.species, c.species];
  const counts = {};
  for (const g of genes) counts[g] = (counts[g] || 0) + 1;
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || (a === c.species ? -1 : b === c.species ? 1 : 0));
  const order = [];
  for (let r = 0; r < 4; r++) for (const t of types) if (counts[t] > r && TYPE_MOVES[t]) order.push({ k: TYPE_MOVES[t][r], type: t });
  const lvl = c.skills?.fight || 1;
  return order.slice(0, 4).map((m, i) => ({ ...m, unlock: SLOT_UNLOCK[i], open: lvl >= SLOT_UNLOCK[i] }));
}
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
  boss:    { name: "Goop King",  hp: 1500, dmg: 20, range: 64, spd: 40, cd: 1.8, armor: 4, look: "boss",    cost: 0 },
};
export const BOSS_SLAM = { every: 7, wind: 1.3, radius: 115, dmg: 60 };
export const FOE_HP = 1.15, FOE_DMG = 1.38;   // overall enemy toughness
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
// ── Defend the Farm ───────────────────────────────────────────────────────────
// Same fights, at home: 5 waves of goop march on the farm. Most go straight for
// the Barn (lose it and the night is lost; only a taunt pulls them off), the rest
// go for your creatures. Lanterns
// you pack become towers that zap goop. Wave 3 is big, wave 5 is the Goop King.
export const DEFEND_WAVES = ["fight", "fight", "elite", "fight", "boss"];
export const LANTERN_MAX = 4;
export const TOWER = { range: 220, every: 1.2, dmg: 16 };
export const BARN_HP = 750;
const TOWER_SPOTS = [{ x: 210, y: 150 }, { x: 210, y: 390 }, { x: 280, y: 230 }, { x: 280, y: 310 }];

export function newTrip(seed, mode = "wilds") {
  return {
    v: 1, phase: "lobby", rng: (seed >>> 0) || 1, coop: false, tier: 0, mode, lanterns: 0, wave: 0, base: null, towers: [],
    picks: [[], []], rations: {}, ready: [false, false],
    squad: [], map: null, depth: 0, enemies: [], fx: [], t: 0, paused: false, nextId: 1,
    event: null, loot: { coins: 0, goods: {}, friends: [], eggs: [] }, bless: { claws: 0, fur: 0, paws: 0, luck: 0 },
    result: null, log: [], fights: 0,
  };
}

// Creatures a player may bring: theirs (or ones that trust them), not already away.
export function eligible(world, userId) {
  return Object.values(world?.creatures || {}).filter(c => !c.away && c.grow == null && !c.nest && (c.owner === String(userId) || (c.bond?.[String(userId)] || 0) >= 50));   // no babies, no nesting parents
}
// Defend the Farm: every Defender (farm job) comes along on top of the picks, up to GUARD_MAX.
export const GUARD_MAX = 6;
export function guardsFor(st, world, users) {
  if (st.mode !== "defend") return [];
  const picked = new Set([...st.picks[0], ...st.picks[1]]), out = [];
  for (const slot of st.coop ? [0, 1] : [0]) {
    for (const c of eligible(world, users?.[slot])) {
      if (c.job === "defender" && !picked.has(c.id) && !out.some(g => g.c.id === c.id) && out.length < GUARD_MAX) out.push({ c, slot });
    }
  }
  return out;
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
    lvl, role: R.role, ab: R.ab, abs: movesFor(c).filter(m => m.open).map(m => ({ k: m.k, t: 0, auto: false })), healer: !!R.healer, regen: R.regen || 0,
    maxHp, hp: Math.round(maxHp * tired),
    dmg: R.dmg * (1 + 0.1 * (lvl - 1)) * (P.dmg || 1) * gold,
    range: R.range * (R.range > 100 ? (P.range || 1) : 1), spd: R.spd * (P.spd || 1), cd: R.cd * (P.cd || 1), armor: R.armor,
    luck: P.luck || 1,
    x: 0, y: 0, face: 1, atkT: 0, feedT: 0, ko: false, order: null, tgt: null,
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
    if (k === "lantern" && st.mode === "defend") {
      const have = Math.floor(ctx.world?.food?.lantern || 0);
      const next = (st.lanterns || 0) + (i.d > 0 ? 1 : -1);
      if (next < 0 || next > Math.min(have, LANTERN_MAX)) return false;
      st.lanterns = next; return true;
    }
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
    if (k === "tier" && slot === 0 && TIERS[i.v]) { st.tier = i.v; st.ready = [false, false]; return true; }
    if (k === "go" && slot === 0) return setOff(st, ctx);
    return false;
  }

  if (st.phase === "map" && k === "node") return enterNode(st, i.id);
  if (k === "feed") return feed(st, slot, i.u, i.item, ctx);

  if (st.phase === "fight") {
    const u = st.squad.find(x => x.id === i.u);
    if (k === "order" && canControl(st, u, slot, ctx) && !u.ko) {
      if (i.target) { const e = st.enemies.find(x => x.id === i.target && x.hp > 0); if (e) { u.order = { type: "attack", target: e.id }; u.tgt = e.id; } }
      // move: "live" while you're still dragging; on release it walks there, waits a moment, then fights on its own
      else if (Number.isFinite(i.x)) u.order = { type: "move", x: clamp(i.x, 20, ARENA.W - 20), y: clamp(i.y, 60, ARENA.H - 20), live: !!i.live, hold: HOLD_AFTER_MOVE };
      else u.order = null;
      return true;
    }
    if (k === "ability" && canControl(st, u, slot, ctx)) return cast(st, u, i.n || 0);
    if (k === "auto" && canControl(st, u, slot, ctx)) { const on = !u.abs.every(a => a.auto); for (const a of u.abs) a.auto = on; return true; }   // one switch for all its moves
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
      st.event = null;
      if (st.mode === "defend") { startWave(st); return true; }
      st.phase = "map"; return true;
    }
  }
  if (st.phase === "end") return false;
  return false;
}

function setOff(st, ctx) {
  const ids = [...st.picks[0], ...st.picks[1], ...guardsFor(st, ctx.world, ctx.users).map(g => g.c.id)];
  if (!ids.length || (st.coop && (!st.ready[1] || !st.picks[1].length))) return false;
  st.squad = [];
  for (const slot of [0, 1]) for (const cid of st.picks[slot]) {
    const c = ctx.world?.creatures?.[cid];
    if (c) st.squad.push(makeUnit(st, c, slot));
  }
  if (st.mode === "defend") for (const g of guardsFor(st, ctx.world, ctx.users)) st.squad.push(makeUnit(st, g.c, g.slot));
  if (!st.squad.length) return false;
  if (st.mode === "defend") {
    st.base = { id: "barn", isBase: true, side: 0, x: 80, y: 270, hp: BARN_HP, maxHp: BARN_HP, armor: 2, st: {} };
    st.towers = TOWER_SPOTS.slice(0, st.lanterns || 0).map((p, i) => ({ id: `t${i}`, ...p, cd: i * 0.3 }));
    st.wave = 0;
    say(st, "Goop at the fence! Defend the farm!");
    startWave(st);
    return true;
  }
  st.map = makeMap(st);
  st.phase = "map";
  say(st, "Into the Wilds!");
  return true;
}

function startWave(st) {
  const type = DEFEND_WAVES[st.wave] || "fight";
  st.depth = st.wave;
  startFight(st, type);
  // goop come at the farm from the far side, a little more spread out
  if (type === "boss") for (const e of st.enemies) if (e.kind === "boss") { e.maxHp = Math.round(e.maxHp * 0.55); e.hp = e.maxHp; }   // no camp before him at home
  const extra = Math.max(0, st.squad.length - SQUAD);                 // Defenders make the squad bigger: a little more goop
  if (extra) for (const e of st.enemies) { e.maxHp = Math.round(e.maxHp * (1 + 0.32 * extra)); e.hp = e.maxHp; if (e.dmg) e.dmg *= 1 + 0.06 * extra; }
  for (const e of st.enemies) { e.x = Math.max(e.x, 620); e.goesForBarn = e.kind !== "bulb" && rand(st) < (e.kind === "boss" ? 0.5 : 0.65); }
  say(st, `Wave ${st.wave + 1} of ${DEFEND_WAVES.length}${type === "boss" ? ": the Goop King!" : type === "elite" ? ": something big!" : ""}`);
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
  const T = TIERS[st.tier || 0];
  const hpMul = FOE_HP * T.hp * (kind === "boss" ? 1 : 1 + 0.16 * d), dmgMul = FOE_DMG * T.dmg * (kind === "boss" ? 1 : 1 + 0.11 * d);
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
  st.phase = "fight"; st.enemies = []; st.fx = []; st.t = 0; st.paused = false; st.wait = GET_READY; st.fightType = type;
  // squad on the left
  const alive = st.squad;
  alive.forEach((u, i) => {
    u.x = 150 + (u.range > 100 ? -40 : 30); u.y = alive.length > 1 ? 160 + i * (240 / (alive.length - 1)) : 270;
    u.order = null; u.tgt = null; u.atkT = 0; u.st = {}; u.face = 1;
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
  if (src?.st?.weak > 0) a *= 0.7;                                   // dazzled goop hits softer
  if (target.st.shield > 0 || target.st.bubble > 0) a *= 0.4;
  a = Math.max(1, a - (target.armor || 0) - (target.st.stone > 0 ? 5 : 0));
  if (target.st.thorns > 0 && src && src.side !== target.side && src.hp > 0) {   // thorns hit back (never loops)
    src.hp -= a * 0.4; src.flash = 0.12;
    if (src.hp <= 0) { src.hp = 0; if (src.side === 1) fx(st, { k: "pop", x: src.x, y: src.y, r: 20 }); else { src.ko = true; src.order = null; } }
  }
  target.hp -= a;
  target.flash = 0.12;
  fx(st, { k: "num", x: target.x + (rand(st) - 0.5) * 10, y: target.y - 34, n: Math.round(a), col: target.side === 0 ? "#ff8a8a" : "#fff" });
  if (target.hp <= 0) {
    target.hp = 0;
    if (target.isBase) { /* the Barn falls: stepTrip ends the night */ }
    else if (target.side === 0) { target.ko = true; target.order = null; say(st, `${target.name} is knocked out!`); }
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
const dmgMul = (st, u) => (1 + 0.15 * (st.bless.claws || 0)) * (u.st.glow > 0 ? 1.2 : 1) * (u.st.power > 0 ? 1.8 : 1) * (1 + 0.03 * tired(st));
const healMul = (st) => Math.max(0.2, 1 - 0.02 * tired(st));
const spdMul = (st, u) => (1 + 0.15 * (st.bless.paws || 0)) * (u.st.glow > 0 ? 1.4 : 1) * (u.st.haste > 0 ? 1.6 : 1) * (u.st.wind > 0 ? 1.3 : 1);

export function cast(st, u, n = 0) {
  const slot = u?.abs?.[n];
  if (!u || !slot || u.ko || slot.t > 0 || st.phase !== "fight" || st.wait > 0) return false;
  const ab = slot.k;
  const foes = living(st.enemies), allies = living(st.squad);
  const power = u.dmg / (ROLES[u.species]?.dmg || 10) * dmgMul(st, u);        // scales with level/personality/blessings
  const tgt = (u.order?.type === "attack" && st.enemies.find(e => e.id === u.order.target && e.hp > 0)) || nearest(u, foes);
  const AB = ABILITIES[ab];
  if (ab === "shell") {
    u.st.shield = 4;
    for (const e of foes) if (dist(e, u) < 190) { e.st.taunt = 4; e.st.tauntBy = u.id; }
    fx(st, { k: "ring", x: u.x, y: u.y, r: 190, col: "#d9c9a8" });
  } else if (ab === "snare") {
    if (!tgt) return false;
    for (const e of foes) if (dist(e, tgt) < 85) { e.st.root = 3; damage(st, e, 25 * power, u); }
    fx(st, { k: "ring", x: tgt.x, y: tgt.y, r: 85, col: "#6fbf4a" });
  } else if (ab === "burst") {
    if (!foes.some(e => dist(e, u) < 120)) return false;
    for (const e of foes) if (dist(e, u) < 85) { damage(st, e, 75 * power, u); e.st.burn = 3; e.st.burnDmg = 11 * power; }
    fx(st, { k: "boom", x: u.x, y: u.y, r: 85, col: "#ff7a2e" });
  } else if (ab === "splash") {
    for (const a of allies) if (dist(a, u) < 160) heal(st, a, a.maxHp * 0.33 * Math.min(1.6, power));
    fx(st, { k: "ring", x: u.x, y: u.y, r: 160, col: "#7fd4ff" });
  } else if (ab === "gust") {
    if (!foes.some(e => dist(e, u) < 140)) return false;
    for (const e of foes) if (dist(e, u) < 110) {
      const d = Math.max(1, dist(e, u)), push = e.kind === "boss" ? 20 : 120;
      e.x = clamp(e.x + ((e.x - u.x) / d) * push, 20, ARENA.W - 20); e.y = clamp(e.y + ((e.y - u.y) / d) * push, 60, ARENA.H - 20);
      e.st.stun = e.kind === "boss" ? 0.3 : 0.9; damage(st, e, 22 * power, u);
    }
    fx(st, { k: "ring", x: u.x, y: u.y, r: 110, col: "#ffffff" });
  } else if (ab === "glow") {
    for (const a of allies) a.st.glow = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 260, col: "#ffe36b" });
  } else if (ab === "chain") {
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
  } else if (ab === "rock") {
    if (!tgt) return false;
    damage(st, tgt, 40 * power, u); tgt.st.stun = Math.max(tgt.st.stun || 0, tgt.kind === "boss" ? 0.4 : 1.2);
    fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: tgt.x, y2: tgt.y - 14, col: "#b9a27a" });
  } else if (ab === "stone") {
    for (const a of allies) a.st.stone = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 240, col: "#b9a27a" });
  } else if (ab === "avalanche") {
    if (!foes.some(e => dist(e, u) < 150)) return false;
    for (const e of foes) if (dist(e, u) < 140) { damage(st, e, 95 * power, u); e.st.stun = Math.max(e.st.stun || 0, e.kind === "boss" ? 0.5 : 1.5); }
    fx(st, { k: "boom", x: u.x, y: u.y, r: 140, col: "#9a8460" });
  } else if (ab === "thorns") {
    u.st.thorns = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 40, col: "#6fbf4a" });
  } else if (ab === "bloom") {
    heal(st, u, u.maxHp * 0.35);
    for (const a of allies) a.st.bloom = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 220, col: "#9cff7a" });
  } else if (ab === "grove") {
    for (const e of foes) { e.st.root = 3; damage(st, e, 40 * power, u); }
    fx(st, { k: "ring", x: ARENA.W / 2, y: ARENA.H / 2, r: 420, col: "#4a9a3a" });
  } else if (ab === "dash") {
    const far = foes.filter(e => dist(e, u) < 280).sort((a, b) => dist(b, u) - dist(a, u))[0];
    if (!far) return false;
    const x0 = u.x, y0 = u.y;
    for (const e of foes) {                                    // everything near the line gets singed
      const t = clamp(((e.x - x0) * (far.x - x0) + (e.y - y0) * (far.y - y0)) / Math.max(1, dist({ x: x0, y: y0 }, far) ** 2), 0, 1);
      if (Math.hypot(e.x - (x0 + (far.x - x0) * t), e.y - (y0 + (far.y - y0) * t)) < 40) { damage(st, e, 45 * power, u); e.st.burn = 3; e.st.burnDmg = 9 * power; }
    }
    u.x = clamp(far.x - 24, 20, ARENA.W - 20); u.y = far.y; u.tgt = far.id;
    fx(st, { k: "zap", x: x0, y: y0 - 14, x2: u.x, y2: u.y - 14 });
  } else if (ab === "kindle") {
    u.st.haste = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 36, col: "#ff9a3a" });
  } else if (ab === "inferno") {
    if (!foes.some(e => dist(e, u) < 180)) return false;
    for (const e of foes) if (dist(e, u) < 170) { damage(st, e, 120 * power, u); e.st.burn = 4; e.st.burnDmg = 14 * power; }
    fx(st, { k: "boom", x: u.x, y: u.y, r: 170, col: "#ff5a1e" });
  } else if (ab === "bubble") {
    const a = allies.slice().sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
    if (!a) return false;
    a.st.bubble = 5;
    fx(st, { k: "ring", x: a.x, y: a.y - 14, r: 30, col: "#9fe0ff" });
  } else if (ab === "rain") {
    for (const a of allies) { heal(st, a, a.maxHp * 0.2 * Math.min(1.6, power)); a.st.burn = 0; }
    fx(st, { k: "ring", x: ARENA.W / 2, y: ARENA.H / 2, r: 420, col: "#7fd4ff" });
  } else if (ab === "tide") {
    const down = st.squad.find(a => a.ko);
    if (down) { down.ko = false; down.hp = Math.round(down.maxHp * 0.4); fx(st, { k: "heal", x: down.x, y: down.y - 34, n: down.hp }); }
    else for (const a of allies) heal(st, a, a.maxHp * 0.35);
    fx(st, { k: "ring", x: u.x, y: u.y, r: 300, col: "#4ab0ff" });
  } else if (ab === "volley") {
    if (!foes.length) return false;
    const hit = foes.slice().sort((a, b) => dist(a, u) - dist(b, u)).slice(0, 5);
    for (const e of hit) { damage(st, e, 30 * power, u); fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: e.x, y2: e.y - 14, col: "#ffffff" }); }
  } else if (ab === "tailwind") {
    for (const a of allies) a.st.wind = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 260, col: "#e6f4ff" });
  } else if (ab === "cyclone") {
    if (!foes.length) return false;
    const c = foes.reduce((best, e) => { const n = foes.filter(f => dist(f, e) < 120).length; return n > best.n ? { e, n } : best; }, { e: foes[0], n: 0 }).e;
    const cx = c.x, cy = c.y;
    for (const e of foes) if (dist(e, { x: cx, y: cy }) < 220) {
      if (e.kind !== "boss") { e.x += (cx - e.x) * 0.7; e.y += (cy - e.y) * 0.7; }
      e.st.stun = Math.max(e.st.stun || 0, e.kind === "boss" ? 0.5 : 2); damage(st, e, 40 * power, u);
    }
    fx(st, { k: "ring", x: cx, y: cy, r: 90, col: "#ffffff" });
  } else if (ab === "dazzle") {
    if (!foes.some(e => dist(e, u) < 210)) return false;
    for (const e of foes) if (dist(e, u) < 200) { e.st.stun = Math.max(e.st.stun || 0, e.kind === "boss" ? 0.3 : 1); e.st.weak = 5; }
    fx(st, { k: "ring", x: u.x, y: u.y, r: 200, col: "#fff6a8" });
  } else if (ab === "moon") {
    const a = allies.slice().sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
    if (!a) return false;
    heal(st, a, a.maxHp * 0.5 * Math.min(1.6, power));
    fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: a.x, y2: a.y - 14, col: "#fff6a8" });
  } else if (ab === "starfall") {
    if (!foes.length) return false;
    for (const e of foes) { damage(st, e, 70 * power, u); fx(st, { k: "boom", x: e.x, y: e.y, r: 26, col: "#ffe36b" }); }
  } else if (ab === "static") {
    if (!tgt) return false;
    for (const e of foes) if (dist(e, tgt) < 120) { e.st.shock = 5; e.st.shockDmg = 10 * power; }
    fx(st, { k: "ring", x: tgt.x, y: tgt.y, r: 120, col: "#c49bff" });
  } else if (ab === "overcharge") {
    u.st.power = 6;
    fx(st, { k: "ring", x: u.x, y: u.y, r: 36, col: "#c49bff" });
  } else if (ab === "storm") {
    if (!foes.length) return false;
    for (let i = 0; i < 8; i++) {
      const e = pickOne(st, foes);
      damage(st, e, 45 * power, u); e.st.stun = Math.max(e.st.stun || 0, 0.5);
      fx(st, { k: "zap", x: e.x + (rand(st) - 0.5) * 30, y: 60, x2: e.x, y2: e.y - 14 });
    }
  }
  slot.t = AB.cd;
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

// When a special move set to "auto" fires by itself.
function wantsToCast(st, u, ab, foes) {
  const ai = ABILITIES[ab]?.ai || "any";
  const hurt = living(st.squad).some(a => a.hp < a.maxHp * 0.55);
  if (ai === "hurt") return hurt;
  if (ai === "ko") return st.squad.some(a => a.ko) || living(st.squad).filter(a => a.hp < a.maxHp * 0.5).length >= 2;
  if (ai === "fight") return foes.length >= 2;
  const near = foes.filter(e => dist(e, u) < (u.range > 100 ? u.range : 130)).length;
  return ai === "near2" ? near >= 2 : near >= 1 || foes.length > 0 && ["dash", "volley", "storm", "starfall"].includes(ab);
}

// One step of the fight (dt seconds). Does nothing while paused.
export function stepTrip(st, dt) {
  for (const f of st.fx) f.t += dt;
  st.fx = st.fx.filter(f => f.t < (f.k === "num" || f.k === "heal" ? 0.9 : f.k === "label" ? 1.2 : 0.5));
  if (st.phase !== "fight" || st.paused) return;
  if (st.wait > 0) { st.wait = Math.max(0, st.wait - dt); return; }   // "get ready" moment at the start
  st.t += dt;
  if (st.t - dt < TIRE_AFTER && st.t >= TIRE_AFTER) say(st, "Everyone's getting tired: hits land harder, healing fades");
  const squad = living(st.squad), foes = living(st.enemies);
  const all = [...squad, ...foes];

  for (const u of all) {
    const s = u.st;
    for (const key of ["root", "stun", "shield", "taunt", "glow", "burn", "bubble", "stone", "thorns", "bloom", "haste", "wind", "weak", "power", "shock"]) if (s[key] > 0) s[key] = Math.max(0, s[key] - dt);
    if (s.shock > 0 && u.hp > 0) {                             // static field: steady zaps
      u.hp -= (s.shockDmg || 8) * dt;
      if (u.hp <= 0) { u.hp = 0; if (u.side === 1) fx(st, { k: "pop", x: u.x, y: u.y, r: 20 }); }
    }
    if (s.bloom > 0 && u.side === 0) heal(st, u, u.maxHp * 0.03 * dt);
    if (s.burn > 0 && u.hp > 0) {                              // burning: steady damage, ignores armour
      u.hp -= (s.burnDmg || 4) * dt;
      if (u.hp <= 0) { u.hp = 0; if (u.side === 0) u.ko = true; else fx(st, { k: "pop", x: u.x, y: u.y, r: 20 }); }
    }
    u.atkT -= dt; if (u.flash) u.flash = Math.max(0, u.flash - dt);
    if (u.side === 0) { for (const a of u.abs) a.t = Math.max(0, a.t - dt); u.feedT = Math.max(0, u.feedT - dt); if (u.regen) heal(st, u, u.regen * dt); }
  }

  // creatures: an auto-battle. Each keeps its target until it drops (or you
  // give it a new one); anything in range gets hit while it walks.
  for (const u of living(st.squad)) {
    const foesNow = living(st.enemies);
    if (!foesNow.length) break;
    u.abs.forEach((a, n) => { if (a.auto && a.t <= 0 && wantsToCast(st, u, a.k, foesNow)) cast(st, u, n); });

    let target = null, moveTo = null, healing = false;
    if (u.order?.type === "attack") { target = st.enemies.find(e => e.id === u.order.target && e.hp > 0) || null; if (!target) u.order = null; }
    if (u.order?.type === "move") {
      if (!u.order.live) u.order.ttl = (u.order.ttl ?? 8) - dt;          // never steer forever (someone may be standing on the spot)
      if (dist(u, u.order) > 14 && !(u.order.ttl <= 0)) moveTo = u.order;
      else if (!u.order.live) { u.order.hold -= dt; if (u.order.hold <= 0 || u.order.ttl <= -HOLD_AFTER_MOVE) u.order = null; }   // waited a moment: back to fighting
    }
    if (!u.order || u.order.type === "move") {
      if (u.healer && !moveTo) {
        const hurt = living(st.squad).filter(a => a.hp < a.maxHp * 0.8).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (hurt) { target = hurt; healing = true; }
      }
      if (!target && !u.order) {
        let t = u.tgt && st.enemies.find(e => e.id === u.tgt && e.hp > 0);
        if (!t) { t = nearest(u, foesNow); u.tgt = t?.id || null; }
        target = t;
      }
    }
    const s = u.st, stuck = s.root > 0 || s.stun > 0;
    if (moveTo && !stuck) step(u, moveTo, u.spd * (s.wind > 0 ? 1.3 : 1), dt);
    else if (target && !stuck && !u.order) {
      const d = dist(u, target);
      if (d > u.range + 10) step(u, target, u.spd * (s.wind > 0 ? 1.3 : 1), dt);
      else if (!healing && u.range > 100) {                 // ranged creatures back off from anything in their face
        const close = nearest(u, foesNow);
        if (close && dist(close, u) < 60) step(u, { x: u.x - (close.x - u.x), y: u.y - (close.y - u.y) }, u.spd * 0.7, dt);
      }
    } else if (target && !stuck && u.order?.type === "attack" && dist(u, target) > u.range + 10) step(u, target, u.spd, dt);

    // swing at the target if it's in reach, otherwise at whatever IS in reach
    let hit = target && dist(u, target) <= u.range + 16 ? target : null;
    if (!hit && !healing) hit = nearest(u, foesNow.filter(e => dist(e, u) <= u.range + 16));
    if (!hit && healing) { const e = nearest(u, foesNow.filter(f => dist(f, u) <= u.range + 16)); if (e) { hit = e; healing = false; } }
    if (hit) u.face = hit.x >= u.x ? 1 : -1;
    else if (target) u.face = target.x >= u.x ? 1 : -1;
    if (hit && !s.stun && u.atkT <= 0) {
      u.atkT = u.cd / spdMul(st, u);
      if (healing) { heal(st, hit, u.dmg * 4 * dmgMul(st, u)); fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: hit.x, y2: hit.y - 14, col: "#7fd4ff" }); }
      else {
        damage(st, hit, u.dmg * dmgMul(st, u), u);
        if (u.range > 100) fx(st, { k: "shot", x: u.x, y: u.y - 18, x2: hit.x, y2: hit.y - 14, col: u.species === "zapling" ? "#c49bff" : u.species === "glowmoth" ? "#ffe36b" : u.species === "puddlet" ? "#7fd4ff" : "#ffffff" });
        else fx(st, { k: "hit", x: hit.x, y: hit.y - 14 });
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
      if (hurt && dist(hurt, e) <= e.range && e.atkT <= 0) {
        e.atkT = e.cd; heal(st, hurt, e.heals); fx(st, { k: "shot", x: e.x, y: e.y - 18, x2: hurt.x, y2: hurt.y - 14, col: "#9cff7a" });
        // whoever was hitting that goop notices the healer and goes after it (once a fight each)
        for (const u of living(st.squad)) if (u.tgt === hurt.id && !u.order && !u.healer && !u.st.sawBulb) {
          u.tgt = e.id; u.st.sawBulb = true;
          fx(st, { k: "label", x: u.x, y: u.y - 58, text: "Get the healer!" });
        }
      }
      continue;
    }
    if (!target) target = nearest(e, targets);
    // Defend the Farm: barn-goers march on the Barn unless a creature is right in their face
    if (st.base && st.base.hp > 0 && e.goesForBarn && !(s.taunt > 0)) target = st.base;   // only a taunt (Shell Up) pulls them off
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
  // lantern towers zap the nearest goop in range
  for (const t of st.towers || []) {
    t.cd -= dt;
    if (t.cd > 0) continue;
    const e = nearest(t, living(st.enemies).filter(f => dist(f, t) <= TOWER.range));
    if (!e) { t.cd = 0.2; continue; }
    t.cd = TOWER.every;
    damage(st, e, TOWER.dmg * (1 + 0.5 * (st.tier || 0)), null);
    fx(st, { k: "shot", x: t.x, y: t.y - 30, x2: e.x, y2: e.y - 14, col: "#ffe36b" });
  }
  if (st.base && st.base.hp <= 0) { endFight(st, false, "The goop got into the Barn…"); return; }
  if (!living(st.squad).length) { endFight(st, false); return; }
  if (!living(st.enemies).length) endFight(st, true);
}
function step(u, to, spd, dt) {
  const dx = to.x - u.x, dy = to.y - u.y, d = Math.hypot(dx, dy);
  if (d < 1) return;
  const m = Math.min(d, spd * dt);
  u.x += (dx / d) * m; u.y += (dy / d) * m;
}

function endFight(st, won, why) {
  st.fights++;
  const type = st.fightType;
  for (const u of st.squad) u.xp += (won ? 700 : 350) + 140 * st.depth + (type === "elite" ? 400 : type === "boss" ? 900 : 0);
  if (!won) {
    st.phase = "event";
    st.event = { type: "defeat", final: true, won: false };
    say(st, why || "The squad is all knocked out…");
    return;
  }
  const luck = luckOf(st) * TIERS[st.tier || 0].loot;
  if (st.mode === "defend") return defendSpoils(st, type, luck);
  const coins = Math.round((type === "boss" ? 160 : (16 + st.depth * 8) * (type === "elite" ? 1.8 : 1)) * luck);   // shorter trips, so each fight pays a bit more
  const goods = {};
  addRoll(st, goods, 2, 4);
  if (type !== "fight") addRoll(st, goods, 3, 6);
  const crystals = type === "boss" ? 3 : type === "elite" ? (rand(st) < 0.6 ? 1 + (rand(st) < 0.3 ? 1 : 0) : 0) : rand(st) < 0.12 ? 1 : 0;
  if (crystals) goods.crystal = crystals;
  st.loot.coins += coins;
  addGoods(st.loot.goods, goods);
  // eggs: the Goop King always guards one, big goop sometimes has one
  let egg = null;
  if (type === "boss") egg = weighted(st, TIERS[st.tier || 0].egg);
  else if (type === "elite" && rand(st) < 0.3 + 0.1 * (st.tier || 0)) egg = weighted(st, st.tier ? { uncommon: 30, rare: 45, epic: 25 } : { common: 40, uncommon: 40, rare: 20 });
  if (egg) { st.loot.eggs = [...(st.loot.eggs || []), { rarity: egg }]; say(st, `Found ${egg === "uncommon" || egg === "epic" ? "an" : "a"} ${egg} egg!`); }
  for (const u of st.squad) {                               // everyone catches their breath after a win
    if (u.ko) { u.ko = false; u.hp = Math.max(1, Math.round(u.maxHp * 0.2)); }
    else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * (st.mode === "defend" ? 0.45 : BREATHER));   // at home there's no camp, so a longer breather
  }
  st.phase = "event";
  const final = st.mode === "defend" ? st.wave >= DEFEND_WAVES.length - 1 : type === "boss";
  if (st.mode === "defend") { st.wave++; if (st.base) st.base.hp = Math.min(st.base.maxHp, st.base.hp + st.base.maxHp * 0.15); }   // patch the Barn between waves
  st.event = { type: "spoils", coins, goods, egg, boss: type === "boss", final, won: true, wave: st.mode === "defend" ? st.wave : null };
  say(st, type === "boss" ? "The Goop King is beaten!" : "Victory!");
}

// Defending pays in farm things: building stuff and lanterns from the grateful neighbours, a
// little coin, and (once you win) a Peaceful Night on the farm. The Goop King still drops his egg.
export const DEFEND_GOODS = [
  { brick: [1, 2], blanket: [0, 1], lantern: [0, 1] },
  { brick: [2, 4], blanket: [1, 2], lantern: [1, 1] },
  { brick: [3, 6], blanket: [2, 3], lantern: [1, 2] },
  { brick: [5, 9], blanket: [3, 5], lantern: [2, 3] },
];
function defendSpoils(st, type, luck) {
  const T = st.tier || 0, G = DEFEND_GOODS[T], goods = {};
  const k = type === "boss" ? 2 : type === "elite" ? 1.5 : 1;
  for (const [item, [lo, hi]] of Object.entries(G)) { const n = Math.round((lo + Math.floor(rand(st) * (hi - lo + 1))) * k); if (n > 0) goods[item] = n; }
  if (type === "boss") goods.crystal = 1 + T;
  const coins = Math.round((type === "boss" ? 60 : 10 + 4 * st.wave) * luck);
  st.loot.coins += coins;
  addGoods(st.loot.goods, goods);
  let egg = null;
  if (type === "boss") egg = weighted(st, TIERS[T].egg);
  if (egg) { st.loot.eggs = [...(st.loot.eggs || []), { rarity: egg }]; say(st, `The Goop King dropped ${egg === "uncommon" || egg === "epic" ? "an" : "a"} ${egg} egg!`); }
  for (const u of st.squad) {
    if (u.ko) { u.ko = false; u.hp = Math.max(1, Math.round(u.maxHp * 0.2)); }
    else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.45);
  }
  st.phase = "event";
  const final = st.wave >= DEFEND_WAVES.length - 1;
  st.wave++;
  if (st.base) st.base.hp = Math.min(st.base.maxHp, st.base.hp + st.base.maxHp * 0.15);   // patch the Barn between waves
  st.event = { type: "spoils", coins, goods, egg, boss: type === "boss", final, won: true, wave: st.wave };
  say(st, type === "boss" ? "The Goop King is beaten!" : "Wave cleared!");
}

function finish(st, won) {
  st.phase = "end";
  st.result = {
    won,
    squad: st.squad.map(u => ({ cid: u.cid, name: u.name, hp: u.ko ? 0 : Math.max(0, u.hp / u.maxHp), xp: Math.round(u.xp) })),
    mode: st.mode, tier: st.tier || 0,
    coins: Math.round(st.loot.coins * (won ? 1 : 0.6)), goods: st.loot.goods, friends: st.loot.friends, eggs: st.loot.eggs || [], rations: st.rations,
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