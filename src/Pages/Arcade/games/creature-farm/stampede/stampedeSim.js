// src/Pages/Arcade/games/creature-farm/stampede/stampedeSim.js
//
// Critter Stampede (a Creature Farm run) — the simulation. The HOST runs this; the guest just draws
// snapshots of it. Each player's own leader position comes from their device
// (instant controls); everything else is decided here.
//
//   • Three levels: Easy (3 min), Medium (7 min), Hard (10 min). See LEVELS.
//   • Wild critters wander the endless field, more of them (and in little
//     packs) as the run goes on. Run ONE circle around critters to tame them —
//     everything inside your loop comes along. (The lasso is worked out on each
//     player's own device — see lassoStep.)
//   • Golden RARE critters show up on Medium and Hard. They're tougher, and they
//     run away from you, so you have to herd them.
//   • Tamed critters join your HERD: they swarm around you and pile onto
//     whatever goop you (or they) are fighting. When one gets hurt (below 30%)
//     it runs back to your side to rest, heals up, then jumps back in.
//   • Berries (dropped by goop, or growing in the grass) heal you + your herd.
//   • Flattening goop and taming critters fills the team's XP bar. When it's
//     full the game PAUSES for both players and each picks 1 of 3 upgrade
//     cards (10 seconds, then a random one is picked for you). See CARDS.
//   • Goop baddies chase leaders and get tougher over time. Your leader zaps
//     the nearest one automatically. Special goop join in as the run goes on:
//       splitter  pops into 2 little goop when flattened
//       spitter   hangs back and lobs blobs (watch for the shadow where it lands)
//       snatcher  grabs one of your herd and runs off — flatten it to rescue them
//   • Swarm rings: every so often a ring of goop closes in around someone.
//   • The Goop King (boss) shows up near the end. You have to beat it to win.
//     It slams the ground (red circle = get out!) and calls in more goop.
//   • Medium/Hard: some wild critters are skittish and scoot away from you.
//   • Hard: it slowly gets dark after 5 minutes (drawn in StampedeRun).
//   • Leaders can be knocked down; a partner standing close revives them.
//     Everyone down = run over. Survive to the end of the level to win.
//
// Uses the farm's species.js, so Bash's designs show up here too.

import { SPECIES } from "../species";

export const SPECIES_IDS = Object.keys(SPECIES);
export const STARTERS = SPECIES_IDS.filter(k => SPECIES[k].starter);

// ── Levels ────────────────────────────────────────────────────────────────────
//   len        seconds to survive          home   critters you can bring home
//   rareHome   rares come home free (on top of `home`)
//   rare       chance a new wild spawn is a golden rare
//   rate       goop per second = min(cap, base + t / per)
//   tough      goop health multiplier      speedCap  fastest small goop
export const LEVELS = {
  easy: {
    id: "easy", name: "Easy", len: 180, home: 2, rareHome: false, rare: 0, herdCap: 15,
    rate: { base: 0.5, per: 60, cap: 3.6 }, tough: 1, speedCap: 125, bigFrom: 80, bigMax: 0.25,
    berryEvery: 18, baddieMax: 75,
    mix: { splitter: [50, 0.14], snatcher: [70, 0.05], spitter: [110, 0.06] },   // [from second, chance]
    caps: { spitter: 2, snatcher: 1 },                                             // most alive at once
    ring: { from: 60, every: 60, n: 10 },
    boss: { at: 150, hp: 700, summonEvery: 9, summonN: 3, slamDmg: 20, ringAtHalf: false },
    skittish: 0, dark: null,
    desc: "3 minutes. Learn the ropes, beat the Goop King. Bring 2 critters home.",
  },
  medium: {
    id: "medium", name: "Medium", len: 420, home: 3, rareHome: false, rare: 0.05, herdCap: 15,
    rate: { base: 0.6, per: 62, cap: 5 }, tough: 1.15, speedCap: 135, bigFrom: 60, bigMax: 0.3,
    berryEvery: 22, baddieMax: 95,
    mix: { splitter: [40, 0.16], snatcher: [45, 0.06], spitter: [70, 0.08] },
    caps: { spitter: 4, snatcher: 2 },
    ring: { from: 55, every: 65, n: 10 },
    boss: { at: 390, hp: 1800, summonEvery: 8, summonN: 4, slamDmg: 25, ringAtHalf: false },
    skittish: 0.3, dark: null,
    desc: "7 minutes. Golden critters, sneaky goop, a bigger Goop King. Bring 3 home.",
  },
  hard: {
    id: "hard", name: "Hard", len: 600, home: 3, rareHome: true, rare: 0.08, herdCap: 15,
    rate: { base: 0.7, per: 54, cap: 6.5 }, tough: 1.3, speedCap: 145, bigFrom: 45, bigMax: 0.35,
    berryEvery: 28, baddieMax: 115,
    mix: { splitter: [30, 0.18], snatcher: [30, 0.08], spitter: [50, 0.1] },
    caps: { spitter: 6, snatcher: 3 },
    ring: { from: 45, every: 55, n: 14 },
    boss: { at: 540, hp: 3200, summonEvery: 7, summonN: 5, slamDmg: 30, ringAtHalf: true },
    skittish: 0.6, dark: { from: 300, full: 480 },
    desc: "10 minutes. It gets dark. The biggest Goop King. Bring 3 home, plus every golden one.",
  },
};
export const LEVEL_ORDER = ["easy", "medium", "hard"];

// ── Tuning ────────────────────────────────────────────────────────────────────
export const T = {
  LEADER_SPEED: 190,
  LEADER_HP: 100,
  LEADER_INV: 0.7,            // seconds of invincibility after a hit
  ZAP_EVERY: 0.55, ZAP_RANGE: 230, ZAP_DMG: 10, CHAIN_RANGE: 150,
  HERD_CAP_MAX: 45,
  HERD_SPEED: 270, HERD_ATTACK_SPEED: 310,
  HERD_HP: 50, HERD_DMG: 5, HERD_ATK_EVERY: 0.5,
  HERD_REGEN: 5, HERD_REGEN_DELAY: 2,   // fighting herd heals 5 hp/s after 2s without being hit
  HERD_REST_BELOW: 0.3,                 // hurt below 30% → run back to the leader and rest
  HERD_REST_REGEN: 9,                   // resting herd heals 9 hp/s
  HERD_ENGAGE: 150, HERD_LEASH: 320,
  RARE_MULT: 1.5,                       // rares: 50% more health and damage
  RARE_FLEE: 150, RARE_FLEE_SPEED: 80,
  WILD_START: 12, WILD_END: 24, WILD_SPAWN_EVERY: 1.0,
  BERRY_HEAL: 30, BERRY_HERD: 0.5, BERRY_LIFE: 30, BERRY_REACH: 30,
  GOOP_DMG: 8, GOOP_HIT_HERD: 4, GOOP_HIT_EVERY: 0.7,
  REVIVE_TIME: 3, REVIVE_RANGE: 55, REVIVE_HP: 50,
  LASSO_MIN: 25, LASSO_MAX: 150, LASSO_PICK: 130,
  TAME_RANGE: 420,           // generous: a big loop can include critters far from you
  DESPAWN: 1600,
  LEASH: 1000,                // players can't get further apart than this
  XP_GOOP: 1, XP_BIG: 5, XP_TAME: 2,
  PICK_TIME: 10,              // seconds to choose an upgrade
};
// ── Goop kinds ────────────────────────────────────────────────────────────────
// Index in this list is what goes over the network.
export const GOOP_KINDS = ["goop", "big", "splitter", "mini", "spitter", "snatcher", "boss"];
const KIND = {
  goop:     { hp: (t) => 14 + t * 0.06, reach: 24, dmg: 1,   herd: 1,   xp: 1, size: 26 },
  big:      { hp: (t) => 55 + t * 0.15, reach: 34, dmg: 2,   herd: 2,   xp: 5, size: 40 },
  splitter: { hp: (t) => 22 + t * 0.08, reach: 26, dmg: 1,   herd: 1,   xp: 2, size: 30 },
  mini:     { hp: (t) => 7 + t * 0.03,  reach: 18, dmg: 0.6, herd: 0.6, xp: 1, size: 18 },
  spitter:  { hp: (t) => 20 + t * 0.07, reach: 24, dmg: 1,   herd: 1,   xp: 3, size: 28 },
  snatcher: { hp: (t) => 26 + t * 0.08, reach: 22, dmg: 0.5, herd: 0.5, xp: 4, size: 28 },
  boss:     { hp: () => 0,              reach: 62, dmg: 2.5, herd: 2.5, xp: 60, size: 80 },
};
export const BOSS = { SPEED: 55, SLAM_EVERY: 5, SLAM_WIND: 1.2, SLAM_RADIUS: 130, KNOCK: 420 };
const SHOT = { EVERY: 2.6, RANGE: 380, FLY: 1.0, RADIUS: 30, DMG_LEADER: 10, DMG_HERD: 8 };
const SNATCH = { LOOK: 600, FLEE_SPEED: 105, ESCAPE: 900 };

// XP needed for the next level-up (the team shares one bar).
export const xpNeed = (lvl) => Math.round(38 + lvl * 50 + lvl * lvl);   // ≈4 level-ups on Easy, 9 on Medium, 13 on Hard

// ── Upgrade cards ─────────────────────────────────────────────────────────────
// icon: zap | you | herd | tame | berry  (drawn in StampedeRun, no emojis)
export const CARDS = {
  zap_fast:    { name: "Quick Zap",    desc: "Zap 25% faster",                         icon: "zap",   max: 3, apply: (p) => { p.mods.zapRate *= 1.25; } },
  zap_power:   { name: "Big Zap",      desc: "Zaps hit 40% harder",                    icon: "zap",   max: 3, apply: (p) => { p.mods.zapDmg *= 1.4; } },
  zap_chain:   { name: "Chain Zap",    desc: "Your zap jumps to one more goop",        icon: "zap",   max: 2, apply: (p) => { p.mods.chain += 1; } },
  swift:       { name: "Zoomies",      desc: "Run 12% faster",                         icon: "you",   max: 3, apply: (p) => { p.mods.speed *= 1.12; } },
  tough:       { name: "Thick Fur",    desc: "+25 max health (and heal 25)",           icon: "you",   max: 3, apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  long_rope:   { name: "Long Rope",    desc: "Lasso critters from farther away",       icon: "tame",  max: 2, apply: (p) => { p.mods.lasso *= 1.35; } },
  warm_welcome:{ name: "Warm Welcome", desc: "New critters are safe for 5s, and each tame heals your herd", icon: "tame", max: 1, apply: (p) => { p.mods.joinSafe = 5; p.mods.tameHeal = 0.2; } },
  herd_cap:    { name: "Bigger Herd",  desc: "+5 herd size",                           icon: "herd",  max: 4, apply: (p) => { p.mods.herdCap += 5; } },
  herd_tough:  { name: "Sturdy Herd",  desc: "Your herd has 30% more health",          icon: "herd",  max: 3, apply: (p, run) => { p.mods.herdHp *= 1.3; for (const c of herdOf(run, p.slot)) { c.maxHp *= 1.3; c.hp *= 1.3; } } },
  herd_fierce: { name: "Fierce Herd",  desc: "Your herd hits 30% harder",              icon: "herd",  max: 3, apply: (p) => { p.mods.herdDmg *= 1.3; } },
  power_naps:  { name: "Power Naps",   desc: "Resting critters heal 60% faster",       icon: "herd",  max: 2, apply: (p) => { p.mods.restRegen *= 1.6; } },
  berry_lover: { name: "Berry Lover",  desc: "Berries heal more and fly to you",       icon: "berry", max: 2, apply: (p) => { p.mods.berryHeal *= 1.5; p.mods.magnet += 70; } },
  berry_bush:  { name: "Berry Bushes", desc: "Berries grow more often (for both of you)", icon: "berry", max: 2, apply: (p, run) => { run.berryMul *= 0.7; } },
};
export const CARD_IDS = Object.keys(CARDS);

const TAU = Math.PI * 2;
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

const freshMods = () => ({
  zapRate: 1, zapDmg: 1, chain: 0, speed: 1, lasso: 1, joinSafe: 2, tameHeal: 0,
  herdCap: 0, herdHp: 1, herdDmg: 1, restRegen: 1, berryHeal: 1, magnet: 0,
});

// ── Run ───────────────────────────────────────────────────────────────────────
export function createRun(seed = Date.now(), level = "easy") {
  return {
    t: 0, state: "play", nextId: 1, rng: mulberry(seed),
    level: LEVELS[level] ? level : "easy",
    players: [null, null],           // slot 0 = host, slot 1 = guest
    critters: [], baddies: [], items: [], fx: [], fxOut: [],
    wildCd: 0, badCd: 2, berryCd: 12, nextGroup: 1, berryMul: 1,
    xp: 0, lvl: 0, pick: null,       // pick = { t, offers: {slot: [cardIds]}, chosen: {slot: cardId|null} }
    shots: [],                       // spitter blobs in the air
    lastRing: 0, bossSpawned: false, bossDown: false,
    alert: null,                     // { text, until } — big banner on screen
  };
}
const levelOf = (run) => LEVELS[run.level] || LEVELS.easy;

export function addPlayer(run, slot, species, x = slot * 80, y = 0, hue = null) {
  if (run.players[slot]) {
    run.players[slot].species = species; run.players[slot].active = true;
    if (hue != null) run.players[slot].hue = hue;
    return;
  }
  run.players[slot] = {
    slot, species, x, y, hp: T.LEADER_HP, maxHp: T.LEADER_HP, down: false, rev: 0, inv: 0,
    zapCd: 0.5, focus: null, kills: 0, tamed: 0, active: true, seenAt: run.t,
    hue: hue ?? SPECIES[species]?.hue ?? 0,
    mods: freshMods(), cards: {},
  };
}

const activePlayers = (run) => run.players.filter(p => p && p.active);
const upPlayers = (run) => run.players.filter(p => p && p.active && !p.down);

function fx(run, f) { run.fx.push({ ...f, age: 0 }); run.fxOut.push(f); }

export const herdCapOf = (run, p) => Math.min(T.HERD_CAP_MAX, levelOf(run).herdCap + (p?.mods?.herdCap || 0));

// Wild critters arrive alone early on, then in little packs of 2–4 you can
// lasso all at once. On Medium/Hard some arrive as golden rares (always alone).
function rollWildPack(run, near) {
  const r = run.rng, L = levelOf(run);
  const a = r() * TAU, d = 380 + r() * 260;
  const cx = near.x + Math.cos(a) * d, cy = near.y + Math.sin(a) * d;
  const g = run.nextGroup++, wa = r() * TAU;
  const make = (sp, x, y, rare) => {
    const hp = T.HERD_HP * (rare ? T.RARE_MULT : 1);
    return {
      id: run.nextId++, species: sp, hue: (SPECIES[sp].hue + Math.round((r() - 0.5) * 50) + 360) % 360,
      size: Math.round((0.85 + r() * 0.35) * 100) / 100,
      x, y, vx: 0, vy: 0, owner: -1, hp, maxHp: hp, atkCd: 0, wa, g, k: 0, rest: false, rare,
    };
  };
  if (L.rare && run.t > 20 && r() < L.rare) {
    return [make(SPECIES_IDS[Math.floor(r() * SPECIES_IDS.length)], cx, cy, true)];
  }
  const skittish = r() < (L.skittish || 0);
  const species = SPECIES_IDS[Math.floor(r() * SPECIES_IDS.length)];
  const packChance = Math.min(0.7, Math.max(0, (run.t - 25) / 150));
  const n = r() < packChance ? 2 + Math.floor(r() * (run.t > 120 ? 3 : 2)) : 1;
  const pack = [];
  for (let i = 0; i < n; i++) {
    const sp = r() < 0.75 ? species : SPECIES_IDS[Math.floor(r() * SPECIES_IDS.length)];
    const oa = i / n * TAU, od = n > 1 ? 22 + r() * 10 : 0;
    const c = make(sp, cx + Math.cos(oa) * od, cy + Math.sin(oa) * od, false);
    c.skittish = skittish;
    pack.push(c);
  }
  return pack;
}

function pickKind(run) {
  const r = run.rng, L = levelOf(run);
  for (const k of ["snatcher", "spitter", "splitter"]) {
    const [from, chance] = L.mix[k];
    const cap = L.caps[k];
    if (cap != null && run.baddies.filter(b => b.kind === k).length >= cap) continue;
    if (run.t > from && r() < chance) return k;
  }
  return run.t > L.bigFrom && r() < Math.min(L.bigMax, 0.1 + run.t / 1500) ? "big" : "goop";
}
function makeBaddie(run, kind, x, y) {
  const L = levelOf(run), t = run.t;
  const hp = KIND[kind].hp(t) * L.tough;
  const speed = {
    goop: Math.min(L.speedCap, 88 + t * 0.1), big: 60, splitter: Math.min(L.speedCap, 80 + t * 0.08),
    mini: Math.min(L.speedCap + 15, 105 + t * 0.1), spitter: 75, snatcher: 125, boss: BOSS.SPEED,
  }[kind];
  return { id: run.nextId++, kind, x, y, hp, maxHp: hp, speed, hitCd: 0, lastBy: -1, shootCd: 1.5, carry: null };
}
function rollBaddie(run, near) {
  const r = run.rng;
  const a = r() * TAU, d = 650 + r() * 160;
  return makeBaddie(run, pickKind(run), near.x + Math.cos(a) * d, near.y + Math.sin(a) * d);
}
// A ring of goop closing in around one player.
function spawnRing(run, n) {
  const ups = upPlayers(run);
  if (!ups.length) return;
  const p = ups[Math.floor(run.rng() * ups.length)], L = levelOf(run);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const kind = L.id === "hard" && i % 5 === 0 ? "splitter" : "goop";
    run.baddies.push(makeBaddie(run, kind, p.x + Math.cos(a) * 430, p.y + Math.sin(a) * 430));
  }
  run.alert = { text: "Swarm incoming!", until: run.t + 2.5 };
}
function spawnBoss(run) {
  const ups = upPlayers(run), L = levelOf(run);
  if (!ups.length) return;
  const cx = ups.reduce((a, p) => a + p.x, 0) / ups.length, cy = ups.reduce((a, p) => a + p.y, 0) / ups.length;
  const a = run.rng() * TAU;
  const b = makeBaddie(run, "boss", cx + Math.cos(a) * 520, cy + Math.sin(a) * 520);
  b.hp = b.maxHp = L.boss.hp * L.tough * (activePlayers(run).length > 1 ? 1 : 0.7);   // a bit less for a solo run
  b.slamCd = 3; b.sumCd = L.boss.summonEvery; b.charge = 0;
  run.baddies.push(b);
  run.bossSpawned = true;
  run.alert = { text: "The Goop King is here!", until: run.t + 3 };
}
const bossOf = (run) => run.baddies.find(b => b.kind === "boss");

// Herd members are critters with owner = slot. Their place in the herd (k) is
// renumbered each step so the swarm stays tidy.
function herdOf(run, slot) { return run.critters.filter(c => c.owner === slot); }

function gainXp(run, n) { if (run.state === "play") run.xp += n; }

export function tryTame(run, slot, cid) {
  const p = run.players[slot];
  const c = run.critters.find(x => x.id === cid);
  if (!p || p.down || !c || c.owner !== -1) return false;
  if (dist(p, c) > T.TAME_RANGE) return false;
  if (herdOf(run, slot).length >= herdCapOf(run, p)) return false;
  c.maxHp = T.HERD_HP * (c.rare ? T.RARE_MULT : 1) * p.mods.herdHp;
  c.owner = slot; c.hp = c.maxHp; c.rest = false; c.safe = p.mods.joinSafe; p.tamed += 1;
  if (p.mods.tameHeal) for (const h of herdOf(run, slot)) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * p.mods.tameHeal);
  gainXp(run, T.XP_TAME);
  fx(run, { k: "tame", x: c.x, y: c.y, s: slot });
  return true;
}

// Called when the player's device reports where its leader is.
export function setLeaderPos(run, slot, x, y) {
  const p = run.players[slot];
  if (!p) return;
  p.x = x; p.y = y; p.seenAt = run.t; p.active = true;
}

// ── Upgrade picking ───────────────────────────────────────────────────────────
function offerCards(run, p) {
  const r = run.rng;
  const pool = CARD_IDS.filter(id => (p.cards[id] || 0) < CARDS[id].max);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
function startPick(run) {
  run.lvl += 1;
  run.state = "pick";
  const offers = {}, chosen = {};
  for (const p of activePlayers(run)) { offers[p.slot] = offerCards(run, p); chosen[p.slot] = null; }
  run.pick = { t: T.PICK_TIME, offers, chosen };
}
function applyCard(run, slot, id) {
  const p = run.players[slot];
  if (!p || !CARDS[id]) return;
  p.cards[id] = (p.cards[id] || 0) + 1;
  CARDS[id].apply(p, run);
}
// A player picks a card (host calls this for both players).
export function choosePick(run, slot, id) {
  const pk = run.pick;
  if (run.state !== "pick" || !pk || !pk.offers[slot] || pk.chosen[slot]) return false;
  if (!pk.offers[slot].includes(id)) return false;
  pk.chosen[slot] = id;
  return true;
}
function stepPick(run, dt) {
  const pk = run.pick;
  pk.t -= dt;
  const slots = Object.keys(pk.offers).map(Number);
  const allIn = slots.every(s => pk.chosen[s] || !run.players[s]?.active);
  if (!allIn && pk.t > 0) return;
  for (const s of slots) {
    let id = pk.chosen[s];
    if (!id && pk.offers[s].length) id = pk.offers[s][Math.floor(run.rng() * pk.offers[s].length)];
    if (id) { applyCard(run, s, id); fx(run, { k: "levelup", x: run.players[s].x, y: run.players[s].y, s }); }
  }
  run.xp -= xpNeed(run.lvl - 1);
  run.pick = null;
  run.state = "play";
}

// ── Step (host only) ──────────────────────────────────────────────────────────
// hurt(slot, kx, ky) is called when a leader takes a hit, so its device can do the knockback.
export function stepRun(run, dt, hurt = () => {}) {
  if (run.state === "pick") { stepPick(run, dt); return; }
  if (run.state !== "play") return;
  const L = levelOf(run);
  run.t += dt;
  // win at the end of the clock — but the Goop King has to be beaten first
  if (run.t >= L.len && (run.bossDown || !run.bossSpawned)) { run.state = "won"; return; }
  const r = run.rng;

  for (const p of run.players) if (p && run.t - p.seenAt > 4) p.active = false;   // partner went quiet
  const ups = upPlayers(run), act = activePlayers(run);
  if (!act.length) return;

  // ── Wild critters: keep a few around each player, wander, despawn far away
  run.wildCd -= dt;
  const wild = run.critters.filter(c => c.owner === -1);
  const wildMax = Math.round(T.WILD_START + (T.WILD_END - T.WILD_START) * Math.min(1, run.t / 180));
  if (run.wildCd <= 0 && wild.length < wildMax) {
    run.critters.push(...rollWildPack(run, act[Math.floor(r() * act.length)]));
    run.wildCd = T.WILD_SPAWN_EVERY;
  }
  // packs wander together (shared heading + a gentle pull to the pack's middle)
  const packs = new Map();
  for (const c of wild) {
    const pk = packs.get(c.g) || { x: 0, y: 0, n: 0, wa: c.wa };
    pk.x += c.x; pk.y += c.y; pk.n++; packs.set(c.g, pk);
  }
  for (const pk of packs.values()) { pk.x /= pk.n; pk.y /= pk.n; pk.wa += (r() - 0.5) * 2 * dt; }
  for (const c of wild) {
    const pk = packs.get(c.g);
    c.wa = pk.wa;
    c.vx = Math.cos(c.wa) * 24; c.vy = Math.sin(c.wa) * 24;
    if (pk.n > 1) { const dx = pk.x - c.x, dy = pk.y - c.y, d = Math.hypot(dx, dy); if (d > 30) { c.vx += dx / d * 20; c.vy += dy / d * 20; } }
    if (c.rare || c.skittish) {
      // golden critters scurry away from nearby leaders; skittish ones scoot off a little
      const range = c.rare ? T.RARE_FLEE : 100, speed = c.rare ? T.RARE_FLEE_SPEED : 50;
      let near = null, nd = range;
      for (const p of ups) { const d = dist(p, c); if (d < nd) { nd = d; near = p; } }
      if (near) { const dx = c.x - near.x, dy = c.y - near.y, d = Math.hypot(dx, dy) || 1; c.vx = dx / d * speed; c.vy = dy / d * speed; }
    }
    c.x += c.vx * dt; c.y += c.vy * dt;
  }
  for (let i = 0; i < wild.length; i++) for (let j = i + 1; j < wild.length; j++) {
    const a = wild[i], b = wild[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 24) { const push = (24 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Berries: one grows nearby every so often; they spoil after a while
  run.berryCd -= dt;
  if (run.berryCd <= 0 && ups.length) {
    const p = ups[Math.floor(r() * ups.length)], a = r() * TAU, d = 160 + r() * 200;
    run.items.push({ id: run.nextId++, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, born: run.t });
    run.berryCd = L.berryEvery * run.berryMul;
  }
  run.items = run.items.filter(it => {
    if (run.t - it.born > T.BERRY_LIFE) return false;
    // Berry Lover pulls berries toward you
    for (const q of ups) {
      if (!q.mods.magnet) continue;
      const d = dist(q, it);
      if (d < T.BERRY_REACH + q.mods.magnet && d > 1) { it.x += (q.x - it.x) / d * 260 * dt; it.y += (q.y - it.y) / d * 260 * dt; }
    }
    const p = ups.find(q => dist(q, it) < T.BERRY_REACH);
    if (!p) return true;
    p.hp = Math.min(p.maxHp, p.hp + T.BERRY_HEAL * p.mods.berryHeal);
    for (const c of herdOf(run, p.slot)) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * T.BERRY_HERD * p.mods.berryHeal);
    fx(run, { k: "heal", x: p.x, y: p.y, s: p.slot });
    return false;
  });
  run.critters = run.critters.filter(c => c.owner !== -1 || act.some(p => dist(p, c) < T.DESPAWN));

  // ── Baddies: spawn faster as time goes on
  run.badCd -= dt;
  const rate = run.t < 15 ? 0.45 : Math.min(L.rate.cap, L.rate.base + run.t / L.rate.per);   // per second
  if (run.badCd <= 0 && run.baddies.length < L.baddieMax && ups.length) {
    run.baddies.push(rollBaddie(run, ups[Math.floor(r() * ups.length)]));
    run.badCd = 1 / rate;
  }

  // ── Swarm rings + the Goop King
  const boss = bossOf(run);
  if (!run.bossSpawned && run.t >= L.boss.at) spawnBoss(run);
  if (!boss && run.t >= L.ring.from && run.t - run.lastRing >= L.ring.every && run.t < L.boss.at - 10) {
    spawnRing(run, L.ring.n); run.lastRing = run.t;
  }

  // ── Leaders: auto-zap the nearest baddie (Chain Zap jumps to more)
  for (const p of ups) {
    p.inv = Math.max(0, p.inv - dt);
    p.zapCd -= dt;
    if (p.zapCd <= 0) {
      let best = null, bd = T.ZAP_RANGE;
      for (const b of run.baddies) { const d = dist(p, b); if (d < bd) { bd = d; best = b; } }
      // a snatcher running off with one of my herd gets zapped first
      for (const b of run.baddies) {
        if (b.kind !== "snatcher" || b.carry == null) continue;
        const held = run.critters.find(c => c.id === b.carry);
        if (held?.owner === p.slot && dist(p, b) < T.ZAP_RANGE * 1.3) { best = b; break; }
      }
      if (best) {
        const dmg = T.ZAP_DMG * p.mods.zapDmg;
        best.hp -= dmg; best.lastBy = p.slot; best.hitT = 0.15;
        p.focus = best.id;
        fx(run, { k: "zap", x: p.x, y: p.y, x2: best.x, y2: best.y, s: p.slot });
        const hit = new Set([best.id]);
        let from = best;
        for (let n = 0; n < p.mods.chain; n++) {
          let next = null, nd = T.CHAIN_RANGE;
          for (const b of run.baddies) { if (hit.has(b.id)) continue; const d = dist(from, b); if (d < nd) { nd = d; next = b; } }
          if (!next) break;
          next.hp -= dmg * 0.7; next.lastBy = p.slot; next.hitT = 0.15; hit.add(next.id);
          fx(run, { k: "zap", x: from.x, y: from.y, x2: next.x, y2: next.y, s: p.slot });
          from = next;
        }
        p.zapCd = T.ZAP_EVERY / p.mods.zapRate;
      } else p.zapCd = 0.1;
    }
  }

  // ── Herds: swarm around the leader, attack nearby goop
  for (const p of run.players) {
    if (!p) continue;
    const herd = herdOf(run, p.slot);
    const focus = run.baddies.find(b => b.id === p.focus);
    // nearest goop to the leader — resting critters hide on the other side of the leader
    let threat = null, td = 400;
    for (const b of run.baddies) { const d = dist(p, b); if (d < td) { td = d; threat = b; } }
    let restK = 0;
    herd.forEach((c, k) => {
      c.k = k;
      if (c.grabbedBy != null) return;                 // being carried off by a snatcher
      c.atkCd = Math.max(0, c.atkCd - dt);
      c.safe = Math.max(0, (c.safe || 0) - dt);
      // hurt → rest; fully healed → fight again
      if (!c.rest && c.hp < c.maxHp * T.HERD_REST_BELOW) c.rest = true;
      else if (c.rest && c.hp >= c.maxHp) c.rest = false;
      if (c.rest) c.hp = Math.min(c.maxHp, c.hp + T.HERD_REST_REGEN * p.mods.restRegen * p.mods.herdHp * dt);
      else if (run.t - (c.hitAt || 0) > T.HERD_REGEN_DELAY) c.hp = Math.min(c.maxHp, c.hp + T.HERD_REGEN * dt);
      let target = null;
      if (c.rest) {
        // tuck in close behind the leader, away from the goop
        const away = threat ? Math.atan2(p.y - threat.y, p.x - threat.x) : Math.PI / 2;
        const spread = ((restK % 5) - 2) * 0.45, row = Math.floor(restK / 5);
        restK++;
        const gx = p.x + Math.cos(away + spread) * (30 + row * 18), gy = p.y + Math.sin(away + spread) * (30 + row * 18);
        const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy);
        const step = Math.min(d, T.HERD_ATTACK_SPEED * dt);
        if (d > 1) { c.vx = dx / d * T.HERD_SPEED; c.vy = dy / d * T.HERD_SPEED; c.x += dx / d * step; c.y += dy / d * step; } else { c.vx = 0; c.vy = 0; }
        c.bump = 0;
        return;
      }
      if (!p.down && p.active) {
        if (focus && dist(c, focus) < T.HERD_LEASH && dist(p, focus) < T.HERD_LEASH) target = focus;
        else {
          let bd = T.HERD_ENGAGE;
          for (const b of run.baddies) {
            const d = dist(c, b) - (b.kind === "spitter" || b.kind === "snatcher" ? 110 : 0);   // herd goes after spitters/snatchers from farther away
            if (d < bd && dist(p, b) < T.HERD_LEASH) { bd = d; target = b; }
          }
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
        target.hp -= T.HERD_DMG * dm * c.size * p.mods.herdDmg * (c.rare ? T.RARE_MULT : 1); target.lastBy = p.slot; target.hitT = 0.12;
        c.atkCd = T.HERD_ATK_EVERY / sp;
        c.bump = 0.15;
      }
      c.bump = Math.max(0, (c.bump || 0) - dt);
    });
  }
  // keep herd members from stacking on one spot
  const herdAll = run.critters.filter(c => c.owner !== -1 && c.grabbedBy == null);
  for (let i = 0; i < herdAll.length; i++) for (let j = i + 1; j < herdAll.length; j++) {
    const a = herdAll[i], b = herdAll[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 20) { const push = (20 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }

  // ── Baddies chase the nearest standing leader, hurt leaders + herd
  const hitLeader = (tgt, amount, kx, ky) => {
    if (tgt.inv > 0 || tgt.down) return;
    tgt.hp -= amount; tgt.inv = T.LEADER_INV;
    hurt(tgt.slot, kx, ky);
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.down = true; tgt.rev = 0; fx(run, { k: "down", x: tgt.x, y: tgt.y, s: tgt.slot }); }
  };
  const hitHerd = (c, amount) => { if (c.safe > 0) return; c.hp -= amount * (c.rest ? 0.5 : 1); c.hitAt = run.t; };
  for (const b of run.baddies) {
    const K = KIND[b.kind];
    b.hitCd = Math.max(0, b.hitCd - dt);
    b.hitT = Math.max(0, (b.hitT || 0) - dt);
    let tgt = null, bd = Infinity;
    for (const p of ups) { const d = dist(p, b); if (d < bd) { bd = d; tgt = p; } }
    let gx = tgt?.x, gy = tgt?.y, speed = b.speed, canBite = true;

    if (b.kind === "spitter" && tgt) {
      // keep its distance and lob blobs at your herd (or you)
      const away = bd < 150, near = bd > 210;            // hovers inside zap range so you can fight back
      if (away) { gx = b.x - (tgt.x - b.x); gy = b.y - (tgt.y - b.y); }
      else if (!near) { gx = b.x; gy = b.y; }
      b.shootCd -= dt;
      if (b.shootCd <= 0 && bd < SHOT.RANGE) {
        const herd = herdOf(run, tgt.slot).filter(c => c.grabbedBy == null && dist(c, b) < SHOT.RANGE);
        const aim = herd.length && r() < 0.6 ? herd[Math.floor(r() * herd.length)] : tgt;
        run.shots.push({ id: run.nextId++, x: b.x, y: b.y - 20, tx: aim.x, ty: aim.y, t: 0, dur: SHOT.FLY });
        b.shootCd = SHOT.EVERY;
      }
      canBite = bd < 40;
    } else if (b.kind === "snatcher") {
      if (b.carry == null) {
        // hunt the nearest herd critter
        let prey = null, pd = SNATCH.LOOK;
        for (const c of herdAll) { if (c.safe > 0) continue; const d = dist(c, b); if (d < pd) { pd = d; prey = c; } }
        if (prey) {
          gx = prey.x; gy = prey.y;
          if (pd < 20) {
            prey.grabbedBy = b.id; prey.rest = false; b.carry = prey.id;
            fx(run, { k: "snatch", x: prey.x, y: prey.y, s: prey.owner });
          }
        }
      } else {
        // run away from the nearest leader with the critter
        if (tgt) { gx = b.x - (tgt.x - b.x); gy = b.y - (tgt.y - b.y); }
        speed = SNATCH.FLEE_SPEED; canBite = false;
      }
    } else if (b.kind === "boss") {
      b.slamCd -= dt; b.sumCd -= dt;
      if (b.charge > 0) {
        speed = 0;                                       // winding up: red circle grows
        b.charge -= dt;
        if (b.charge <= 0) {
          for (const p of ups) {
            const d = dist(p, b);
            if (d < BOSS.SLAM_RADIUS) hitLeader(p, L.boss.slamDmg, (p.x - b.x) / (d || 1) * BOSS.KNOCK, (p.y - b.y) / (d || 1) * BOSS.KNOCK);
          }
          for (const c of herdAll) if (dist(c, b) < BOSS.SLAM_RADIUS) hitHerd(c, L.boss.slamDmg * 0.8);
          fx(run, { k: "slam", x: b.x, y: b.y });
          b.slamCd = BOSS.SLAM_EVERY;
        }
      } else if (b.slamCd <= 0 && bd < 300) b.charge = BOSS.SLAM_WIND;
      if (b.sumCd <= 0) {
        for (let i = 0; i < L.boss.summonN; i++) {
          const a = i / L.boss.summonN * TAU + r();
          run.baddies.push(makeBaddie(run, "goop", b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 70));
        }
        b.sumCd = L.boss.summonEvery;
      }
      if (L.boss.ringAtHalf && !b.ringed && b.hp < b.maxHp / 2) { b.ringed = true; spawnRing(run, L.ring.n); run.alert = { text: "The Goop King calls the swarm!", until: run.t + 2.5 }; }
    }

    if (gx != null) {
      const dx = gx - b.x, dy = gy - b.y, d = Math.hypot(dx, dy);
      if (d > 2 && speed > 0) { b.x += dx / d * speed * dt; b.y += dy / d * speed * dt; }
    }
    if (b.carry != null) {
      const held = run.critters.find(c => c.id === b.carry);
      if (held) { held.x = b.x; held.y = b.y - 4; } else b.carry = null;
    }
    if (tgt && canBite) {
      const d = dist(tgt, b) || 1;
      if (d < K.reach && b.hitCd <= 0 && tgt.inv <= 0) {
        hitLeader(tgt, T.GOOP_DMG * K.dmg, (tgt.x - b.x) / d * 260, (tgt.y - b.y) / d * 260);
        b.hitCd = T.GOOP_HIT_EVERY;
      }
    }
    if (b.hitCd <= 0 && b.kind !== "snatcher") {
      const herdReach = K.reach - 2;
      for (const c of herdAll) {
        if (c.safe > 0) continue;
        if (Math.hypot(c.x - b.x, c.y - b.y) < herdReach) {
          hitHerd(c, T.GOOP_HIT_HERD * K.herd * L.tough); b.hitCd = T.GOOP_HIT_EVERY;
          if (b.kind !== "boss") break;
        }
      }
    }
  }

  // ── Spitter blobs land: splash anyone in the circle
  run.shots = run.shots.filter(sh => {
    sh.t += dt;
    if (sh.t < sh.dur) return true;
    for (const p of ups) {
      const d = Math.hypot(p.x - sh.tx, p.y - sh.ty);
      if (d < SHOT.RADIUS) hitLeader(p, SHOT.DMG_LEADER * L.tough, (p.x - sh.tx) / (d || 1) * 200, (p.y - sh.ty) / (d || 1) * 200);
    }
    for (const c of herdAll) if (Math.hypot(c.x - sh.tx, c.y - sh.ty) < SHOT.RADIUS) hitHerd(c, SHOT.DMG_HERD * L.tough);
    fx(run, { k: "splat", x: sh.tx, y: sh.ty });
    return false;
  });

  // ── Snatchers that got away keep the critter
  for (const b of run.baddies) {
    if (b.carry == null || act.some(p => dist(p, b) < SNATCH.ESCAPE)) continue;
    const held = run.critters.find(c => c.id === b.carry);
    if (held) { held.hp = 0; held.stolen = true; }
    b.hp = 0; b.escaped = true;
  }
  // goop push each other apart a bit
  for (let i = 0; i < run.baddies.length; i++) for (let j = i + 1; j < run.baddies.length; j++) {
    const a = run.baddies[i], b = run.baddies[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (KIND[a.kind].size + KIND[b.kind].size) / 2;
    if (d > 0 && d < min) {
      const push = min - d;
      if (a.kind === "boss") { b.x += dx / d * push; b.y += dy / d * push; }          // the King shoves, never gets shoved
      else if (b.kind === "boss") { a.x -= dx / d * push; a.y -= dy / d * push; }
      else { a.x -= dx / d * push / 2; a.y -= dy / d * push / 2; b.x += dx / d * push / 2; b.y += dy / d * push / 2; }
    }
  }

  // ── Deaths
  const born = [];
  run.baddies = run.baddies.filter(b => {
    if (b.hp > 0) return b.kind === "boss" || b.carry != null || act.some(p => dist(p, b) < T.DESPAWN);
    if (b.escaped) return false;
    // a flattened snatcher drops the critter it was carrying
    if (b.carry != null) {
      const held = run.critters.find(c => c.id === b.carry);
      if (held) { held.grabbedBy = null; held.rest = true; held.safe = 1.5; fx(run, { k: "rescue", x: held.x, y: held.y, s: held.owner }); }
    }
    const p = run.players[b.lastBy];
    if (p) p.kills += 1;
    gainXp(run, KIND[b.kind].xp);
    if (b.kind === "boss") {
      run.bossDown = true;
      run.alert = { text: "The Goop King is flattened!", until: run.t + 3 };
      fx(run, { k: "pop", x: b.x, y: b.y, big: 2 });
      for (let i = 0; i < 4; i++) run.items.push({ id: run.nextId++, x: b.x + (i - 1.5) * 30, y: b.y + (i % 2) * 20, born: run.t });
      return false;
    }
    fx(run, { k: "pop", x: b.x, y: b.y, big: b.kind === "big" ? 1 : 0 });
    if (b.kind === "splitter") for (const off of [-14, 14]) born.push(makeBaddie(run, "mini", b.x + off, b.y));
    if (r() < (b.kind === "big" ? 0.35 : 0.03)) run.items.push({ id: run.nextId++, x: b.x, y: b.y, born: run.t });
    return false;
  });
  run.baddies.push(...born);
  run.critters = run.critters.filter(c => {
    if (c.owner === -1 || c.hp > 0) return true;
    fx(run, { k: c.stolen ? "stolen" : "flee", x: c.x, y: c.y, s: c.owner });   // fainted and ran off (or carried away)
    return false;
  });

  // ── Revives + game over
  for (const p of act) {
    if (!p.down) continue;
    const helper = ups.find(o => o !== p && dist(o, p) < T.REVIVE_RANGE);
    p.rev = helper ? p.rev + dt : Math.max(0, p.rev - dt * 0.5);
    if (p.rev >= T.REVIVE_TIME) { p.down = false; p.hp = T.REVIVE_HP; p.inv = 1.5; p.rev = 0; fx(run, { k: "revive", x: p.x, y: p.y, s: p.slot }); }
  }
  if (!upPlayers(run).length) { run.state = "over"; return; }

  for (const f of run.fx) f.age += dt;
  run.fx = run.fx.filter(f => f.age < 0.6);

  // ── Level up? Pause for upgrade cards.
  const finished = run.t >= L.len && (run.bossDown || !run.bossSpawned);   // won next step: no pointless pick
  if (!finished && run.xp >= xpNeed(run.lvl)) startPick(run);
}

// ── Snapshots (host → guest, ~10/s) ──────────────────────────────────────────
const R = Math.round;
export function makeSnapshot(run) {
  const pk = run.pick;
  const snap = {
    t: Math.round(run.t * 10) / 10, st: run.state, lv: run.level,
    p: run.players.map(p => p && [R(p.x), R(p.y), R(p.hp), p.down ? 1 : 0, Math.round(p.rev * 10) / 10, p.kills, p.tamed, SPECIES_IDS.indexOf(p.species), p.active ? 1 : 0, p.hue, p.maxHp,
      Math.round(p.mods.speed * 100) / 100, Math.round(p.mods.lasso * 100) / 100, herdCapOf(run, p)]),
    c: run.critters.map(c => [c.id, SPECIES_IDS.indexOf(c.species), R(c.x), R(c.y), c.hue, R(c.size * 100), c.owner, R(c.hp / c.maxHp * 100), c.bump > 0 ? 1 : 0, c.rest ? 1 : 0, run.t - (c.hitAt ?? -9) < 0.2 ? 1 : 0, c.rare ? 1 : 0, c.grabbedBy != null ? 1 : 0]),
    k: run.items.map(it => [it.id, R(it.x), R(it.y)]),
    b: run.baddies.map(b => [b.id, GOOP_KINDS.indexOf(b.kind), R(b.x), R(b.y), R(b.hp / b.maxHp * 100), b.hitT > 0 ? 1 : 0, b.charge > 0 ? R((1 - b.charge / BOSS.SLAM_WIND) * 100) : 0, b.carry != null ? 1 : 0]),
    s: run.shots.map(sh => [sh.id, R(sh.x), R(sh.y), R(sh.tx), R(sh.ty), R(sh.t / sh.dur * 100)]),
    al: run.alert && run.t < run.alert.until ? run.alert.text : null,
    bk: [run.bossSpawned ? 1 : 0, run.bossDown ? 1 : 0],
    xp: [Math.floor(run.xp), xpNeed(run.lvl), run.lvl],
    pk: pk ? { t: Math.ceil(pk.t), o: pk.offers, c: pk.chosen } : null,
    fx: run.fxOut,
  };
  run.fxOut = [];
  return snap;
}

export function readSnapshotPlayers(snap) {
  return (snap.p || []).map((a, slot) => a && {
    slot, x: a[0], y: a[1], hp: a[2], down: !!a[3], rev: a[4], kills: a[5], tamed: a[6],
    species: SPECIES_IDS[a[7]], active: !!a[8], hue: a[9], maxHp: a[10] ?? T.LEADER_HP,
    mods: { speed: a[11] ?? 1, lasso: a[12] ?? 1 }, herdCap: a[13] ?? 15,
  });
}

// ── Lasso (runs on each player's own device) ─────────────────────────────────
// Run ONE circle around a wild critter to tame it. Every wild critter inside
// the loop you actually ran comes along too (point-in-loop test on your path).
export const loopsFor = () => 1;

function insideLoop(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// state: { cid, acc, last, pts, frac } or null. Returns { state, tame: [cids] | null }.
// reach: lasso range multiplier (Long Rope upgrade).
export function lassoStep(state, me, wildCritters, moving, reach = 1) {
  const maxR = T.LASSO_MAX * reach, pickR = T.LASSO_PICK * reach;
  if (state) {
    const c = wildCritters.find(w => w.id === state.cid);
    const d = c ? Math.hypot(me.x - c.x, me.y - c.y) : Infinity;
    if (!c || d > maxR) return { state: null, tame: null };
    if (d < T.LASSO_MIN) return { state, tame: null };          // too close — no progress, no reset
    const ang = Math.atan2(me.y - c.y, me.x - c.x);
    let delta = ang - state.last;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    const acc = state.acc + delta;
    let pts = state.pts;
    const lp = pts[pts.length - 1];
    if (!lp || Math.hypot(me.x - lp.x, me.y - lp.y) > 8) { pts = [...pts, { x: me.x, y: me.y }]; if (pts.length > 240) pts = pts.slice(-240); }
    const need = TAU * loopsFor(c.size);
    if (Math.abs(acc) >= need) {
      const inside = pts.length > 4
        ? wildCritters.filter(w => w.id !== c.id && insideLoop(pts, w.x, w.y)).map(w => w.id)
        : [];
      return { state: null, tame: [c.id, ...inside] };
    }
    return { state: { cid: c.id, acc, last: ang, pts, frac: Math.abs(acc) / need }, tame: null };
  }
  if (!moving) return { state: null, tame: null };
  let best = null, bd = pickR;
  for (const c of wildCritters) { const d = Math.hypot(me.x - c.x, me.y - c.y); if (d < bd && d > 10) { bd = d; best = c; } }
  if (!best) return { state: null, tame: null };
  return { state: { cid: best.id, acc: 0, last: Math.atan2(me.y - best.y, me.x - best.x), pts: [{ x: me.x, y: me.y }], frac: 0 }, tame: null };
}