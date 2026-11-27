// Critter Races: ride one of your creatures down a side-on track.
// Jump (tap / Space / Up) over logs and rocks, Dash (button / Shift / D) for a burst of speed,
// grab berries and boost pads, and stay out of the mud. Every type has a trick:
//   Pebblet smashes through rocks · Puddlet splashes through mud · Mossling bounces back fast
//   Fluffwing floats (longer jumps) · Glowmoth pulls berries in · Zapling dashes more often
//   Emberpup dashes harder
// Each player runs their own creature on their own screen (same track from the seed); the
// neighbours' racers follow a fixed pace both screens can work out from the race clock.
import { SPECIES } from "../species";
import { mulberry } from "./rng";

export const TRACK_LEN = 11000;
export const RACE_MAX = 100;               // seconds before the race is called
export const COUNTDOWN = 3;
export const RACE_LEVELS = [
  { id: "paddock", name: "Paddock Dash", npc: [196, 208, 220], coins: 1, desc: "Gentle track, friendly racers." },
  { id: "county", name: "County Cup", npc: [232, 242, 252], coins: 1.6, desc: "More logs and mud. Use your dash!" },
  { id: "champ", name: "Champion's Run", npc: [252, 262, 272], coins: 2.4, desc: "The fastest critters around." },
];
export const PLACE_COINS = [80, 45, 25, 10];
const NPC_NAMES = ["Zippy", "Pickles", "Thunder", "Daisy", "Rocket", "Bean", "Comet", "Waffles"];

export const OB = { log: { h: 34, w: 46 }, rock: { h: 40, w: 50 }, mud: { w: 220 }, berry: { w: 30 }, pad: { w: 70 } };

export function makeTrack(seed, level = 0) {
  const r = mulberry(seed * 13 + 7);
  const out = [];
  let x = 900;
  const dense = [1, 0.8, 0.65][level] || 1;
  while (x < TRACK_LEN - 500) {
    const roll = r();
    const kind = roll < 0.3 ? "log" : roll < 0.48 ? "rock" : roll < 0.64 ? "mud" : roll < 0.86 ? "berry" : "pad";
    if (kind === "berry") { const n = 2 + Math.floor(r() * 3), high = r() < 0.4; for (let i = 0; i < n; i++) out.push({ id: out.length, kind, x: x + i * 46, y: high ? 95 : 25 }); x += n * 46; }
    else out.push({ id: out.length, kind, x });
    x += (330 + r() * 420) * dense;
  }
  return out;
}

// How a creature runs. c = farm creature.
export function runnerStats(c) {
  const sp = c.species;
  const sk = c.skills || {};
  const speed = 228 * (1 + 0.02 * ((sk.forage || 1) - 1) + 0.015 * ((sk.haul || 1) - 1)) * (c.traits?.rare ? 1.04 : 1) * (0.92 + 0.08 * (c.happy ?? 80) / 100);
  return {
    species: sp, speed,
    dashCd: sp === "zapling" ? 3.2 : 5, dashMul: sp === "emberpup" ? 2.1 : 1.75,
    gravity: sp === "fluffwing" ? 1050 : 1500,
    recover: sp === "mossling" ? 0.32 : 0.65,
    rockProof: sp === "pebblet", mudProof: sp === "puddlet", magnet: sp === "glowmoth",
  };
}
export const TRICK_TEXT = {
  pebblet: "smashes through rocks", puddlet: "splashes through mud", mossling: "bounces back fast after a stumble",
  fluffwing: "floats: longer jumps", glowmoth: "pulls berries in", zapling: "dashes more often", emberpup: "dashes harder",
};

export function newRunner() { return { x: 0, y: 0, vy: 0, stun: 0, dash: 0, dashCd: 0, boost: 0, boostMul: 1, got: {}, done: false, time: null, fx: [] }; }

// One step of my own runner. input = { jump: bool (pressed this frame), dash: bool }
export function stepRunner(r, s, track, dt, input, t) {
  if (r.done) return;
  if (input.jump && r.y <= 0.5 && r.stun <= 0) { r.vy = 540; r.fx.push({ k: "jump", at: t }); }
  if (input.dash && r.dashCd <= 0 && r.stun <= 0) { r.dash = 0.7; r.dashCd = s.dashCd; r.fx.push({ k: "dash", at: t }); }
  r.dashCd = Math.max(0, r.dashCd - dt);
  r.dash = Math.max(0, r.dash - dt);
  r.boost = Math.max(0, r.boost - dt);
  // air
  if (r.y > 0 || r.vy > 0) { r.vy -= s.gravity * dt; r.y = Math.max(0, r.y + r.vy * dt); if (r.y === 0) r.vy = 0; }
  let v = s.speed * (r.dash > 0 ? s.dashMul : 1) * (r.boost > 0 ? r.boostMul : 1);
  if (r.stun > 0) { r.stun -= dt; v = r.stun > 0 ? 0 : v * 0.5; }
  // what's under me
  for (const o of track) {
    if (o.x > r.x + 60) break;
    if (r.got[o.id]) continue;
    const w = OB[o.kind].w;
    if (o.kind === "mud") {
      if (r.x >= o.x && r.x <= o.x + w && r.y < 4 && !s.mudProof) v *= 0.5;
      continue;
    }
    const near = Math.abs(r.x - (o.x + w / 2)) < w / 2 + 14;
    if (!near) continue;
    if (o.kind === "log" || o.kind === "rock") {
      if (r.y < OB[o.kind].h) {
        r.got[o.id] = true;
        if (o.kind === "rock" && s.rockProof) { r.fx.push({ k: "smash", at: t, x: o.x }); v *= 0.85; }
        else if (r.dash > 0 && o.kind === "log") { r.fx.push({ k: "smash", at: t, x: o.x }); }      // dashing bursts through logs
        else { r.stun = s.recover; r.x = Math.max(0, r.x - 24); r.fx.push({ k: "bonk", at: t }); }
      } else r.got[o.id] = true;                                                                     // cleared it
    } else if (o.kind === "berry") {
      if (s.magnet || Math.abs(r.y + 20 - o.y) < 44) { r.got[o.id] = true; r.boost = 1.4; r.boostMul = 1.3; r.fx.push({ k: "berry", at: t }); }
    } else if (o.kind === "pad") {
      if (r.y < 6) { r.got[o.id] = true; r.boost = 1.2; r.boostMul = 1.55; r.fx.push({ k: "pad", at: t }); }
    }
  }
  r.x += v * dt;
  r.fx = r.fx.filter(f => t - f.at < 1);
  if (r.x >= TRACK_LEN) { r.x = TRACK_LEN; r.done = true; r.time = t; }
}

// The neighbours' racers: a steady pace with a little wobble (same on both screens).
export function makeNpcs(seed, level) {
  const r = mulberry(seed * 31 + 3), sp = Object.keys(SPECIES);
  return RACE_LEVELS[level].npc.map((v, i) => ({ npc: true, name: NPC_NAMES[Math.floor(r() * NPC_NAMES.length)], species: sp[Math.floor(r() * sp.length)], hue: Math.floor(r() * 360), v: v + (r() - 0.5) * 8, ph: r() * 6 }));
}
export const npcX = (n, t) => Math.min(TRACK_LEN, n.v * (t + 0.9 * Math.sin(t * 0.33 + n.ph) - 0.9 * Math.sin(n.ph)));
export function npcTime(n) { let lo = 0, hi = RACE_MAX * 2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (npcX(n, m) >= TRACK_LEN) hi = m; else lo = m; } return hi; }

// ── Host flow (lobby → countdown → race → end) ────────────────────────────────
export function newRace(seed) {
  return { v: 1, phase: "lobby", seed, level: 0, t: 0, players: [blank(), null], npcs: makeNpcs(seed, 0) };
}
const blank = () => ({ cid: null, round: 0, x: 0, y: 0, done: false, time: null });

export function raceAct(st, slot, i) {
  if (i.k === "join") { if (st.players[1]) return false; st.players[1] = blank(); return true; }
  const p = st.players[slot];
  if (!p) return false;
  if (i.k === "pick" && st.phase === "lobby") { if (st.players[1 - slot]?.cid === i.cid) return false; st.players[slot] = { ...p, cid: i.cid }; return true; }
  if (i.k === "level" && slot === 0 && st.phase === "lobby" && RACE_LEVELS[i.v]) { st.level = i.v; st.npcs = makeNpcs(st.seed, i.v); return true; }
  if (i.k === "start" && slot === 0 && st.phase === "lobby" && st.players.every(x => !x || x.cid)) { st.phase = "count"; st.t = 0; return true; }
  if (i.k === "quit" && slot === 0) { st.phase = "end"; st.result = { quit: true, entries: [] }; return true; }
  return false;
}
export function raceTick(st, dt, world) {
  if (st.phase === "count") { st.t += dt; if (st.t >= COUNTDOWN) { st.phase = "race"; st.t = 0; return true; } return false; }
  if (st.phase !== "race") return false;
  st.t += dt;
  const players = st.players.filter(Boolean);
  if (players.every(p => p.done) || st.t >= RACE_MAX) { finishRace(st, world); return true; }
  return false;
}
function finishRace(st, world) {
  st.phase = "end";
  const L = RACE_LEVELS[st.level];
  const entries = [];
  st.players.forEach((p, slot) => {
    if (!p) return;
    const c = world?.creatures?.[p.cid];
    entries.push({ slot, cid: p.cid, name: c?.name || "?", species: c?.species || "mossling", traits: c?.traits || { hue: 0 }, time: p.done ? p.time : null, x: p.x });
  });
  for (const n of st.npcs) entries.push({ npc: true, name: n.name, species: n.species, traits: { hue: n.hue, size: 1 }, time: npcTime(n) });
  entries.sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9) || (b.x || 0) - (a.x || 0));
  entries.forEach((e, i) => { e.place = i + 1; e.ribbon = ["gold", "silver", "bronze"][i] || "green"; e.coins = e.npc ? 0 : Math.round(PLACE_COINS[Math.min(3, i)] * L.coins); });
  st.result = { entries, level: st.level };
}