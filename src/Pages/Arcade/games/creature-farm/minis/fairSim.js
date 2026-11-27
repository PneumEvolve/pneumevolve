// Creature Fair: show off one creature in front of the judges.
//   1. Scrub   (15s) tap the mud spots off your creature
//   2. Trick   5 taps: stop the hoop in the green zone (higher Care = bigger zone)
//   3. Judging the judges add it up with how the creature is doing and what makes it special
// Three neighbours' creatures enter too (they get better the more fairs you win).
// Everyone gets a ribbon: 1st gold, 2nd silver, 3rd bronze, otherwise a green "good try".
// Extra ribbons: Best Purebred, Most Unusual Mix (3+ types), Shiniest (golden).
import { SPECIES } from "../species";
import { typeCounts } from "../eggs";
import { mulberry } from "./rng";

export const SCRUB_SECS = 15, TRICK_SECS = 20, JUDGE_SECS = 7;
export const SCRUB_SPOTS = 24, SCRUB_FULL = 20, TRICKS = 5;
export const PLACE_COINS = [120, 70, 40, 15];
export const EXTRA_COINS = 25;
export const RIBBON_NAMES = { gold: "1st place", silver: "2nd place", bronze: "3rd place", green: "Good try", blue: "Best Purebred", purple: "Most Unusual Mix", pink: "Shiniest" };
const NPC_NAMES = ["Duchess", "Sir Fluff", "Pumpkin", "Bramble", "Twinkle", "Nugget", "Clover", "Biscotti", "Mochi", "Rusty"];
const RARITY_BONUS = { common: 0, uncommon: 2, rare: 4, epic: 7, legendary: 10 };

export const zoneFor = (care = 1) => Math.min(0.34, 0.14 + 0.022 * (care - 1));       // width of the green zone (0-1)

export function newFair(seed, wins = 0) {
  const rng = mulberry(seed);
  const sp = Object.keys(SPECIES);
  const rivals = [0, 1, 2].map(i => ({
    npc: true, name: NPC_NAMES[Math.floor(rng() * NPC_NAMES.length)] + (i ? "" : ""), species: sp[Math.floor(rng() * sp.length)], hue: Math.floor(rng() * 360),
    score: Math.round(40 + i * 11 + Math.min(25, wins * 4) + (rng() - 0.5) * 10),
  }));
  return { v: 1, phase: "lobby", seed, t: 0, players: [blank(), null], rivals, wins };
}
const blank = () => ({ cid: null, round: 0, scrub: 0, tricks: [] });

// Score one entry. c = the farm creature, p = the player's results.
export function scoreOf(c, p) {
  const tc = typeCounts(c);
  const parts = {
    scrub: Math.round(20 * Math.min(1, (p.scrub || 0) / SCRUB_FULL)),
    trick: Math.round(25 * (p.tricks || []).slice(0, TRICKS).reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0) / TRICKS),
    happy: Math.round(15 * (c.happy ?? 50) / 100),
    care: Math.round(10 * ((c.skills?.care || 1) - 1) / 9),
    special: (c.traits?.rare ? 8 : 0) + (tc.length === 1 ? 8 : tc.length === 3 ? 6 : tc.length >= 4 ? 10 : 0) + (RARITY_BONUS[c.rarity] || 0),
  };
  return { parts, total: Object.values(parts).reduce((a, b) => a + b, 0) };
}
export function extraRibbons(c) {
  const tc = typeCounts(c), out = [];
  if (tc.length === 1) out.push("blue");
  if (tc.length >= 3) out.push("purple");
  if (c.traits?.rare) out.push("pink");
  return out;
}

export function fairAct(st, slot, i, world) {
  if (i.k === "join") { if (st.players[1]) return false; st.players[1] = blank(); return true; }
  const p = st.players[slot];
  if (!p) return false;
  if (i.k === "pick" && st.phase === "lobby") {
    const other = st.players[1 - slot];
    if (other && other.cid === i.cid) return false;
    st.players[slot] = { ...p, cid: i.cid }; return true;
  }
  if (i.k === "start" && slot === 0 && st.phase === "lobby" && st.players.every(x => !x || x.cid)) { st.phase = "scrub"; st.t = 0; return true; }
  if (i.k === "quit" && slot === 0) { st.phase = "end"; st.result = { entries: [], quit: true }; return true; }
  return false;
}

export function fairTick(st, dt, world) {
  if (st.phase === "lobby" || st.phase === "end") return false;
  st.t += dt;
  const players = st.players.filter(Boolean);
  if (st.phase === "scrub" && st.t >= SCRUB_SECS) { st.phase = "trick"; st.t = 0; return true; }
  if (st.phase === "trick" && (st.t >= TRICK_SECS || players.every(p => (p.tricks || []).length >= TRICKS))) { judge(st, world); st.phase = "judge"; st.t = 0; return true; }
  if (st.phase === "judge" && st.t >= JUDGE_SECS) { st.phase = "end"; return true; }
  return false;
}

function judge(st, world) {
  const entries = [];
  st.players.forEach((p, slot) => {
    const c = p && world.creatures?.[p.cid];
    if (!c) return;
    const s = scoreOf(c, p);
    entries.push({ slot, cid: c.id, name: c.name, species: c.species, traits: c.traits, score: s.total, parts: s.parts, extras: extraRibbons(c) });
  });
  for (const r of st.rivals) entries.push({ npc: true, name: r.name, species: r.species, traits: { hue: r.hue, size: 1 }, score: r.score, extras: [] });
  entries.sort((a, b) => b.score - a.score || (a.npc ? 1 : -1));
  entries.forEach((e, i) => { e.place = i + 1; e.ribbon = ["gold", "silver", "bronze"][i] || "green"; e.coins = e.npc ? 0 : PLACE_COINS[Math.min(3, i)] + EXTRA_COINS * e.extras.length; });
  st.result = { entries };
}