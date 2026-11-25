// src/Pages/Arcade/games/creature-farm/ranch.js
//
// The Ranch: creatures as a workforce. (Phase 1 of the Creature Ranch plan.)
// Pure rules only — no drawing. farmWorld.js calls simulateRanch() from its
// "tick" and handles the player actions (jobs, buddies, upgrades, selling).
//
//   • Needs: hunger, happiness, energy. Hungry (< 10) or sad (< 20) creatures
//     stop working. Tired ones (< 15 energy) rest until they're back to 80.
//     Nobody ever dies or leaves — they just get sad and stop working.
//   • Skills (1–10): forage, care, farm. They grow with XP from doing the job
//     (level n → n+1 takes n² hours of work — a slow grind: weeks to reach 10).
//   • Jobs: Forager, Feeder, Groomer, Farmhand.
//   • Buddies: two creatures paired up. A hungry creature whose trough is empty
//     gets fed from storage by a buddy who forages or feeds. A buddy with good
//     Care keeps the other happy. Some personality pairs click (work faster),
//     some clash (get grumpy).
//   • Buildings: Feeding Trough, Storage Shed, Beds, Market Stall. All upgradable with coins.
//   • Storage has a cap per item. Overflow is wasted — unless you own the
//     Market Stall, which auto-sells it at half price.
//   • Time is real time. When nobody's been playing, the next visit catches up
//     (up to 24 hours) and leaves a "while you were away" report.

import { SPECIES, CROPS } from "./species";

// ── Tuning ────────────────────────────────────────────────────────────────────
export const H = 3600;
export const CATCHUP_MAX = 24 * H;          // the farm runs up to 24h without anyone
export const HUNGER_DRAIN = 100 / (3 * H);  // full → empty in 3 hours
export const ENERGY_WORK = 100 / (2 * H);   // a full battery lasts 2 hours of work
export const ENERGY_REST = 100 / (45 * 60); // recharges in 45 minutes (beds make it faster)
export const HAPPY_DECAY = 100 / (16 * H);
export const HAPPY_STARVING = 100 / H;      // very hungry creatures get sad fast
export const HAPPY_CONTENT = 100 / (8 * H); // fed + rested creatures slowly cheer up
export const EAT_BELOW = 55;                // creatures eat on their own when hunger drops below this
export const MEAL = 35, LOVED_MEAL = 45;
export const STOP_HUNGER = 10, STOP_HAPPY = 20, TIRED = 15, RESTED = 80;

export const SKILLS = ["forage", "care", "farm"];
export const SKILL_NAMES = { forage: "Forage", care: "Care", farm: "Farm" };
export const JOBS = {
  forager:  { name: "Forager",  skill: "forage", desc: "Finds wild berries and carrots and brings them to storage." },
  feeder:   { name: "Feeder",   skill: "care",   desc: "Keeps the feeding trough topped up from storage." },
  groomer:  { name: "Groomer",  skill: "care",   desc: "Cheers up the saddest creatures on the farm." },
  farmhand: { name: "Farmhand", skill: "farm",   desc: "Harvests ripe food crops and replants them." },
};
const FORAGE_RATE = 1 / 360;                // food per second at skill 1 (10 an hour)
const FEED_RATE = 2 / 60;                   // food moved to the trough per second at skill 1
const GROOM_RATE = 100 / (90 * 60);         // happiness per second given at skill 1
export const skillFactor = (lvl) => 1 + 0.15 * (lvl - 1);
export const xpForNext = (lvl) => lvl * lvl * H;  // seconds of work to reach the next level

// Starting skills by species (then personality + a little luck).
const SPECIES_SKILLS = {
  mossling:  { forage: 2, care: 1, farm: 3 },
  emberpup:  { forage: 3, care: 1, farm: 2 },
  puddlet:   { forage: 1, care: 3, farm: 2 },
  fluffwing: { forage: 2, care: 3, farm: 1 },
  glowmoth:  { forage: 1, care: 2, farm: 3 },
  pebblet:   { forage: 2, care: 1, farm: 3 },
  zapling:   { forage: 4, care: 1, farm: 1 },
};
const PERSONALITY_SKILLS = {
  playful: { care: 1 }, greedy: { forage: 1 }, shy: { farm: 1 }, bold: { forage: 1 }, sleepy: {}, grumpy: { care: -1 },
};
export const PERSONALITY_WORK = {        // how personality changes needs
  greedy: { hunger: 1.3 }, sleepy: { energy: 1.25 }, grumpy: { happy: 1.3 },
};

export const plotsPerFarmhand = (c) => 1 + Math.floor((c.skills?.farm || 1) / 4);

// Personality chemistry between buddies.
const CLICK = [["shy", "bold"], ["playful", "sleepy"], ["greedy", "playful"], ["sleepy", "shy"]];
const CLASH = [["grumpy", "playful"], ["grumpy", "grumpy"], ["bold", "bold"], ["greedy", "greedy"]];
export function chemistry(a, b) {
  if (!a || !b) return 0;
  const pa = a.traits.personality, pb = b.traits.personality;
  const has = (list) => list.some(([x, y]) => (x === pa && y === pb) || (x === pb && y === pa));
  return has(CLICK) ? 1 : has(CLASH) ? -1 : 0;
}

// ── Buildings ─────────────────────────────────────────────────────────────────
export const BUILDINGS = {
  trough: { name: "Feeding Trough", desc: "Creatures eat from it on their own.", max: 5,
            caps: [12, 30, 75, 180, 450], cost: (lvl) => Math.round(30 * Math.pow(2.6, lvl)) },
  shed:   { name: "Storage Shed", desc: "How much of each item you can keep.", max: 6,
            caps: [40, 100, 250, 600, 1500, 4000], cost: (lvl) => Math.round(40 * Math.pow(2.6, lvl)) },
  beds:   { name: "Comfy Beds", desc: "Tired creatures recharge faster.", max: 3,
            cost: (lvl) => Math.round(120 * Math.pow(3, lvl)) },
  stall:  { name: "Market Stall", desc: "Auto-sells anything that won't fit in storage (half price).", max: 1,
            cost: () => 150 },
};
export const PRICES = { berry: 1, carrot: 2 };
export const STORE_ITEMS = ["berry", "carrot"];

export const troughCap = (w) => BUILDINGS.trough.caps[(w.buildings?.trough || 1) - 1];
export const storageCap = (w) => BUILDINGS.shed.caps[(w.buildings?.shed || 1) - 1];
export const bedsBoost = (w) => 1 + 0.5 * (w.buildings?.beds || 0);

// Next upgrade for a building: { level, cost } or null when maxed.
export function nextUpgrade(w, key) {
  const b = BUILDINGS[key], lvl = w.buildings?.[key] || 0;
  if (lvl >= b.max) return null;
  return { level: lvl + 1, cost: b.cost(lvl) };
}

// ── Creatures ─────────────────────────────────────────────────────────────────
export function rollSkills(species, personality, rng) {
  const base = SPECIES_SKILLS[species] || { forage: 1, care: 1, farm: 1 };
  const mod = PERSONALITY_SKILLS[personality] || {};
  const out = {};
  for (const s of SKILLS) out[s] = Math.max(1, Math.min(10, (base[s] || 1) + (mod[s] || 0) + (rng() < 0.35 ? 1 : 0)));
  return out;
}

// Fill in ranch fields on a creature that doesn't have them yet (old saves, new arrivals).
export function ranchify(c, rng) {
  return {
    energy: 100, job: null, buddy: null, xp: { forage: 0, care: 0, farm: 0 }, resting: false,
    ...c,
    skills: c.skills || rollSkills(c.species, c.traits.personality, rng),
  };
}

// What a creature is doing right now (for the UI and the map).
export function stateOf(c) {
  if (c.follow) return "following";
  if (c.hunger < STOP_HUNGER) return "starving";
  if (c.happy < STOP_HAPPY) return "sad";
  if (c.resting) return "resting";
  if (!c.job) return "idle";
  return "working";
}
export const STATE_TEXT = {
  following: "following someone", starving: "too hungry to work", sad: "too sad to work",
  resting: "resting", idle: "no job", working: "working",
};

// Can this player give this creature jobs / buddies? (Your own, or ones that trust you.)
export const canManage = (c, by) => c.owner === String(by) || (c.bond?.[String(by)] || 0) >= 50;

// ── World fields ──────────────────────────────────────────────────────────────
export function ranchDefaults() {
  return { coins: 0, buildings: { trough: 1, shed: 1, beds: 0, stall: 0 }, trough: { berry: 0, carrot: 0 }, simAt: null, report: null };
}

const add = (obj, k, n) => { obj[k] = (obj[k] || 0) + n; };

// Put food into storage, respecting the cap. Overflow is auto-sold (stall) or wasted.
function store(w, kind, n, rep) {
  const cap = storageCap(w);
  const have = w.food[kind] || 0;
  const fits = Math.max(0, Math.min(n, cap - have));
  w.food[kind] = have + fits;
  if (rep) add(rep.gained, kind, fits);
  const extra = n - fits;
  if (extra > 0) {
    if (w.buildings.stall) { const c = extra * (PRICES[kind] || 1) * 0.5; w.coins += c; if (rep) rep.autoSold += c; }
    else if (rep) add(rep.wasted, kind, extra);
  }
}

// ── The simulation (one step of dt seconds at world time tMs) ─────────────────
// Mutates a shallow-copied world `w` (farmWorld clones before calling).
// rep: report counters (or null for live ticks).
export function stepRanch(w, dt, tMs, rep) {
  const list = Object.values(w.creatures);
  const byId = w.creatures;
  const tcap = troughCap(w);

  // creatures' fractional work carries over between steps
  for (const c of list) {
    const pw = PERSONALITY_WORK[c.traits.personality] || {};
    const st = stateOf(c);
    const working = st === "working";
    const buddy = c.buddy ? byId[c.buddy] : null;
    const chem = buddy ? chemistry(c, buddy) : 0;
    const speed = chem > 0 ? 1.15 : 1;

    // ── needs
    c.hunger = Math.max(0, c.hunger - HUNGER_DRAIN * dt * (pw.hunger || 1));
    if (working) c.energy = Math.max(0, c.energy - ENERGY_WORK * dt * (pw.energy || 1));
    else c.energy = Math.min(100, c.energy + ENERGY_REST * dt * bedsBoost(w) * (st === "resting" ? 1 : 0.5));
    if (c.resting && c.energy >= RESTED) c.resting = false;
    if (!c.resting && c.energy < TIRED && c.job) c.resting = true;

    let dh = -HAPPY_DECAY * (pw.happy || 1);
    if (c.hunger < 25) dh -= HAPPY_STARVING * (pw.happy || 1);
    else if (c.hunger > 60 && c.energy > 30) dh += HAPPY_CONTENT;
    if (chem < 0) dh -= HAPPY_DECAY * 2;                                    // clashing buddies grate on each other
    if (buddy && (buddy.skills?.care || 0) >= 5 && stateOf(buddy) !== "sad") dh += HAPPY_CONTENT;   // a caring buddy
    c.happy = Math.max(0, Math.min(100, c.happy + dh * dt));

    // ── eating on their own
    if (c.hunger < EAT_BELOW && !c.follow) {
      const loved = SPECIES[c.species].food;
      const pickFrom = (pool) => ((pool[loved] || 0) >= 1 ? loved : STORE_ITEMS.find(k => (pool[k] || 0) >= 1));
      let k = pickFrom(w.trough), from = "trough";
      // trough empty → a buddy who forages or feeds brings something from storage
      if (!k && buddy && (buddy.job === "forager" || buddy.job === "feeder") && stateOf(buddy) === "working") { k = pickFrom(w.food); from = "buddy"; }
      if (k) {
        if (from === "trough") w.trough[k] -= 1; else w.food[k] -= 1;
        const yum = k === loved;
        c.hunger = Math.min(100, c.hunger + (yum ? LOVED_MEAL : MEAL));
        if (yum) c.happy = Math.min(100, c.happy + 6);
        if (rep) { rep.meals += 1; if (from === "buddy") rep.buddyMeals += 1; }
      }
    }

    // ── working
    if (working) {
      const job = JOBS[c.job];
      const lvl = c.skills[job.skill];
      const f = skillFactor(lvl) * speed;
      c.work = (c.work || 0);
      if (c.job === "forager") {
        c.work += FORAGE_RATE * f * dt;
        while (c.work >= 1) { c.work -= 1; store(w, (c.forageFlip = !c.forageFlip) ? "berry" : "carrot", 1, rep); }
      } else if (c.job === "feeder") {
        c.work += FEED_RATE * f * dt;
        while (c.work >= 1) {
          const inTrough = (w.trough.berry || 0) + (w.trough.carrot || 0);
          const k = STORE_ITEMS.slice().sort((a, b) => (w.trough[a] || 0) - (w.trough[b] || 0)).find(x => (w.food[x] || 0) >= 1);
          if (inTrough >= tcap || !k) { c.work = Math.min(c.work, 1); break; }
          c.work -= 1; w.food[k] -= 1; w.trough[k] = (w.trough[k] || 0) + 1;
        }
      } else if (c.job === "groomer") {
        const n = 1 + Math.floor(lvl / 3);
        const sad = list.filter(o => o.id !== c.id && o.happy < 95).sort((a, b) => a.happy - b.happy).slice(0, n);
        for (const o of sad) o.happy = Math.min(100, o.happy + GROOM_RATE * f * dt);
      }
      // XP → skill levels
      const s = job.skill;
      c.xp = { ...(c.xp || {}) };
      c.xp[s] = (c.xp[s] || 0) + dt;
      if (c.skills[s] < 10 && c.xp[s] >= xpForNext(c.skills[s])) {
        c.xp[s] -= xpForNext(c.skills[s]);
        c.skills = { ...c.skills, [s]: c.skills[s] + 1 };
        if (rep) rep.levelUps.push(`${c.name}: ${SKILL_NAMES[s]} ${c.skills[s]}`);
        else w._levelUps = [...(w._levelUps || []), `${c.name}'s ${SKILL_NAMES[s]} went up to ${c.skills[s]}!`];
      }
    }
  }

  // ── farmhands tend the field: each looks after 1 + farm/4 plots
  const hands = list.filter(c => c.job === "farmhand" && stateOf(c) === "working");
  if (hands.length) {
    let slots = hands.reduce((n, c) => n + plotsPerFarmhand(c), 0);
    const plots = w.plots;
    for (let i = 0; i < plots.length && slots > 0; i++) {
      const crop = plots[i];
      if (!crop) continue;
      if (CROPS[crop.kind].type !== "food") continue;   // they leave lure crops alone
      slots--;
      if (tMs - crop.at >= CROPS[crop.kind].grow) {
        store(w, crop.kind, CROPS[crop.kind].yield, rep);
        if (rep) rep.harvests += 1;
        plots[i] = { kind: crop.kind, at: tMs, by: crop.by };
      }
    }
  }
}

// Run the farm forward by `secs` seconds ending at world time `endMs`, in chunks.
// Returns the report (or null for short live ticks).
export function simulateRanch(w, secs, endMs, withReport) {
  const rep = withReport ? { gained: {}, wasted: {}, meals: 0, buddyMeals: 0, harvests: 0, autoSold: 0, levelUps: [] } : null;
  const CHUNK = secs > 60 ? 30 : secs;
  let left = secs, t = endMs - secs * 1000;
  while (left > 0.0001) {
    const dt = Math.min(CHUNK, left);
    t += dt * 1000;
    stepRanch(w, dt, t, rep);
    left -= dt;
  }
  return rep;
}