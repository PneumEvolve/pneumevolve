// src/Pages/Arcade/games/creature-farm/ranch.js
//
// The Ranch: creatures as a workforce. Pure rules only — no drawing.
// farmWorld.js calls simulateRanch() from its "tick" and handles the player
// actions (jobs, buddies, upgrades, selling, buying, contracts).
//
// Phase 1 — colony core
//   • Needs: hunger, happiness, energy. Hungry (< 10) or sad (< 20) creatures
//     stop working. Tired ones (< 15 energy) rest until they're back to 80.
//     Nobody ever dies or leaves — they just get sad and stop working.
//   • Skills (1–10) grow with XP from doing the job (level n → n+1 takes n²
//     hours of work — a slow grind).
//   • Jobs: Forager, Feeder, Groomer, Farmhand.
//   • Buddies: pairs. A forager/feeder buddy brings food when the trough is
//     empty; a caring buddy keeps the other happy; some pairs click, some clash.
//   • Buildings: Trough, Storage Shed, Beds, Market Stall, Warehouse.
//   • Real time. Coming back catches up (up to 24h) with a report.
//
// Phase 2 — production & overflow
//   • Creature goods: every happy creature slowly makes its species' item
//     (Mosslings → moss, Emberpups → embers, ...). Golden ones make double.
//   • Workshops turn goods into better goods (Jam Kitchen, Kiln, Loom, Bakery,
//     Lantern Workshop, Juice Press). A Crafter works one; you can also help by hand.
//   • Higher building levels cost bricks or blankets, not just coins.
//   • Market: prices drift up and down every hour, and drop when you sell a
//     lot of one thing (they recover over a couple of hours). You can buy
//     food and creature goods (at double price) for species you don't have.
//   • Haulers take goods to the Market Stall: they fill contracts first, then
//     sell, but only ever from what's above the "keep" amount you set. They never touch items
//     you've marked "hands off".
//   • Contracts board: "Deliver 6 bricks within 12 hours — pays 260".

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

export const PRODUCE_SECS = 30 * 60;        // a happy creature makes 1 of its item every 30 min
export const PRODUCE_HAPPY = 50;            // ...but only while happiness is at least this
export const HAND_CRAFT = 0.2;              // one "help craft" by hand = 20% of an item
export const CONTRACT_MAX = 3;
export const PEN_START = 4;                 // pen spots a new farm starts with (shared by both players)
export const CONTRACT_GAP = 20 * 60;        // seconds before a new contract shows up

export const SKILLS = ["forage", "care", "farm", "craft", "haul"];
export const SKILL_NAMES = { forage: "Forage", care: "Care", farm: "Farm", craft: "Craft", haul: "Haul" };
export const JOBS = {
  forager:  { name: "Forager",  skill: "forage", desc: "Finds wild berries and carrots and brings them to storage." },
  feeder:   { name: "Feeder",   skill: "care",   desc: "Keeps the feeding trough topped up from storage." },
  groomer:  { name: "Groomer",  skill: "care",   desc: "Cheers up the saddest creatures on the farm." },
  farmhand: { name: "Farmhand", skill: "farm",   desc: "Plants empty plots, harvests ripe food crops and replants them. 1 plot per Farm level." },
  crafter:  { name: "Crafter",  skill: "craft",  desc: "Works a workshop, turning goods into better goods.", needs: "workshop" },
  hauler:   { name: "Hauler",   skill: "haul",   desc: "Takes goods to the Market Stall: fills contracts, then sells what's above your keep amounts.", needs: "stall" },
};
const FORAGE_RATE = 1 / 360;                // food per second at skill 1 (10 an hour)
const FEED_RATE = 2 / 60;                   // food moved to the trough per second at skill 1
const GROOM_RATE = 100 / (90 * 60);         // happiness per second given at skill 1
const HAUL_RATE = 6 / 60;                   // items carried to market per second at skill 1
export const skillFactor = (lvl) => 1 + 0.15 * (lvl - 1);
export const xpForNext = (lvl) => lvl * lvl * H;  // seconds of work to reach the next level

// Starting skills by species (then personality + a little luck).
const SPECIES_SKILLS = {
  mossling:  { forage: 2, care: 1, farm: 3, craft: 1, haul: 2 },
  emberpup:  { forage: 3, care: 1, farm: 2, craft: 3, haul: 1 },
  puddlet:   { forage: 1, care: 3, farm: 2, craft: 2, haul: 2 },
  fluffwing: { forage: 2, care: 3, farm: 1, craft: 1, haul: 3 },
  glowmoth:  { forage: 1, care: 2, farm: 3, craft: 3, haul: 1 },
  pebblet:   { forage: 2, care: 1, farm: 3, craft: 2, haul: 3 },
  zapling:   { forage: 4, care: 1, farm: 1, craft: 2, haul: 2 },
};
const PERSONALITY_SKILLS = {
  playful: { care: 1 }, greedy: { forage: 1, haul: 1 }, shy: { farm: 1, craft: 1 }, bold: { forage: 1, haul: 1 }, sleepy: {}, grumpy: { care: -1, craft: 1 },
};
export const PERSONALITY_WORK = {        // how personality changes needs
  greedy: { hunger: 1.3 }, sleepy: { energy: 1.25 }, grumpy: { happy: 1.3 },
};

export const plotsPerFarmhand = (c) => c.skills?.farm || 1;   // 1 plot per Farm level

// Personality chemistry between buddies.
const CLICK = [["shy", "bold"], ["playful", "sleepy"], ["greedy", "playful"], ["sleepy", "shy"]];
const CLASH = [["grumpy", "playful"], ["grumpy", "grumpy"], ["bold", "bold"], ["greedy", "greedy"]];
export function chemistry(a, b) {
  if (!a || !b) return 0;
  const pa = a.traits.personality, pb = b.traits.personality;
  const has = (list) => list.some(([x, y]) => (x === pa && y === pb) || (x === pb && y === pa));
  return has(CLICK) ? 1 : has(CLASH) ? -1 : 0;
}

// ── Items ─────────────────────────────────────────────────────────────────────
// group: food (creatures eat it), goods (creatures make it), made (workshops make it).
// price = base market price; the real price drifts around it (see priceOf).
export const ITEMS = {
  berry:   { name: "Berries",     group: "food",  price: 1,  color: "#5b6ff0" },
  carrot:  { name: "Carrots",     group: "food",  price: 2,  color: "#f08a24" },
  moss:    { name: "Moss",        group: "goods", price: 2,  color: "#6fbf4a", from: "mossling" },
  ember:   { name: "Embers",      group: "goods", price: 3,  color: "#ff7a2e", from: "emberpup" },
  bubble:  { name: "Bubbles",     group: "goods", price: 3,  color: "#7fd4ff", from: "puddlet" },
  fluff:   { name: "Fluff",       group: "goods", price: 3,  color: "#ffc4e6", from: "fluffwing" },
  glow:    { name: "Glow dust",   group: "goods", price: 4,  color: "#ffe36b", from: "glowmoth" },
  pebble:  { name: "Pebbles",     group: "goods", price: 2,  color: "#a89a8a", from: "pebblet" },
  spark:   { name: "Sparks",      group: "goods", price: 4,  color: "#c49bff", from: "zapling" },
  jam:     { name: "Berry jam",   group: "made",  price: 7,  color: "#8a4be0" },
  juice:   { name: "Carrot juice", group: "made", price: 12, color: "#ff9a3c" },
  brick:   { name: "Bricks",      group: "made",  price: 20, color: "#c4573a" },
  blanket: { name: "Blankets",    group: "made",  price: 22, color: "#ff9ad0" },
  cake:    { name: "Carrot cake", group: "made",  price: 24, color: "#f0b060" },
  lantern: { name: "Lanterns",    group: "made",  price: 40, color: "#ffd65a" },
};
export const ITEM_KEYS = Object.keys(ITEMS);
export const ITEM_GROUPS = [["food", "Food"], ["goods", "Creature goods"], ["made", "Made in workshops"]];
export const STORE_ITEMS = ["berry", "carrot"];          // what goes in the trough
export const PRODUCT_OF = Object.fromEntries(Object.entries(ITEMS).filter(([, it]) => it.from).map(([k, it]) => [it.from, k]));
export const PRICES = Object.fromEntries(ITEM_KEYS.map(k => [k, ITEMS[k].price]));   // base prices
const SATURATE = { food: 0.003, goods: 0.012, made: 0.025 };   // price drop per item sold
export const canBuy = (k) => ITEMS[k]?.group !== "made";

// ── Workshops ─────────────────────────────────────────────────────────────────
export const WORKSHOPS = {
  kitchen: { name: "Jam Kitchen",      makes: "jam",     needs: { berry: 4 },                      secs: 5 * 60,  cost: 100 },
  juicer:  { name: "Juice Press",      makes: "juice",   needs: { carrot: 4 },                     secs: 6 * 60,  cost: 120 },
  kiln:    { name: "Kiln",             makes: "brick",   needs: { pebble: 2, ember: 1 },           secs: 10 * 60, cost: 250 },
  loom:    { name: "Loom",             makes: "blanket", needs: { fluff: 3, moss: 1 },             secs: 12 * 60, cost: 250 },
  bakery:  { name: "Bakery",           makes: "cake",    needs: { carrot: 3, jam: 1 },             secs: 10 * 60, cost: 350 },
  lantern: { name: "Lantern Workshop", makes: "lantern", needs: { glow: 2, spark: 1, bubble: 1 },  secs: 15 * 60, cost: 500 },
};
export const WS_MAX = 5;
export const wsSpeed = (lvl) => 1 + 0.3 * ((lvl || 1) - 1);
const WS_BRICKS = [0, 0, 0, 4, 10, 25];       // bricks needed to reach level n
export function nextWorkshop(w, key) {
  const ws = WORKSHOPS[key], lvl = w.workshops?.[key]?.level || 0;
  if (lvl >= WS_MAX) return null;
  const level = lvl + 1;
  return { level, cost: lvl ? Math.round(ws.cost * Math.pow(2.4, lvl)) : ws.cost, goods: WS_BRICKS[level] ? { brick: WS_BRICKS[level] } : null };
}

// ── Buildings ─────────────────────────────────────────────────────────────────
export const BUILDINGS = {
  trough:    { name: "Feeding Trough", desc: "Creatures eat from it on their own.", max: 5,
               caps: [12, 30, 75, 180, 450], cost: (lvl) => Math.round(30 * Math.pow(2.6, lvl)),
               goods: { 4: { brick: 5 }, 5: { brick: 15 } } },
  shed:      { name: "Storage Shed", desc: "How much food and creature goods you can keep (of each).", max: 6,
               caps: [40, 100, 250, 600, 1500, 4000], cost: (lvl) => Math.round(40 * Math.pow(2.6, lvl)),
               goods: { 4: { brick: 6 }, 5: { brick: 20 }, 6: { brick: 50 } } },
  warehouse: { name: "Warehouse", desc: "How many workshop-made goods you can keep (of each).", max: 5,
               caps: [10, 25, 60, 150, 400], cost: (lvl) => Math.round(80 * Math.pow(2.6, lvl)),
               goods: { 3: { brick: 4 }, 4: { brick: 12 }, 5: { brick: 30 } } },
  beds:      { name: "Comfy Beds", desc: "Tired creatures recharge faster.", max: 3,
               cost: (lvl) => Math.round(120 * Math.pow(3, lvl)),
               goods: { 2: { blanket: 3 }, 3: { blanket: 8 } } },
  stall:     { name: "Market Stall", desc: "Auto-sells anything that won't fit in storage, at the market price. Haulers sell here too.", max: 1,
               cost: () => 150 },
};

export const troughCap = (w) => BUILDINGS.trough.caps[(w.buildings?.trough || 1) - 1];
export const storageCap = (w) => BUILDINGS.shed.caps[(w.buildings?.shed || 1) - 1];
export const warehouseCap = (w) => BUILDINGS.warehouse.caps[(w.buildings?.warehouse || 1) - 1];
export const capFor = (w, k) => (ITEMS[k]?.group === "made" ? warehouseCap(w) : storageCap(w));
export const bedsBoost = (w) => 1 + 0.5 * (w.buildings?.beds || 0);

// Next upgrade for a building: { level, cost, goods } or null when maxed.
export function nextUpgrade(w, key) {
  const b = BUILDINGS[key], lvl = w.buildings?.[key] || 0;
  if (lvl >= b.max) return null;
  return { level: lvl + 1, cost: b.cost(lvl), goods: b.goods?.[lvl + 1] || null };
}
export const hasGoods = (w, goods) => !goods || Object.entries(goods).every(([k, n]) => (w.food?.[k] || 0) >= n);

// ── Market ────────────────────────────────────────────────────────────────────
// Each item's price multiplier drifts toward a target that changes every hour
// (the same on both devices: it's worked out from the hour + the item), and
// selling a lot pushes it down. Prices recover toward the target over ~2 hours.
function hash01(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const marketTarget = (k, tMs) => 0.65 + hash01(Math.floor(tMs / 3600000), ITEM_KEYS.indexOf(k) + 1) * 0.85;
export const priceOf = (w, k) => (ITEMS[k]?.price || 0) * (w.market?.[k] ?? 1);
export const buyPriceOf = (w, k) => Math.ceil(priceOf(w, k) * 2 * 10) / 10;
export const trendOf = (w, k, tMs) => { const d = marketTarget(k, tMs) - (w.market?.[k] ?? 1); return d > 0.04 ? 1 : d < -0.04 ? -1 : 0; };
export const fmtCoins = (n) => (n >= 10 || Number.isInteger(n) ? String(Math.floor(n)) : n.toFixed(1));
function stepMarket(w, dt, tMs) {
  const m = w.market;
  const k = Math.min(1, dt / (2 * H));
  for (const key of ITEM_KEYS) { const cur = m[key] ?? 1; m[key] = cur + (marketTarget(key, tMs) - cur) * k; }
}
// Sell n of item k right now: coins in, price nudged down. Returns coins earned.
export function sellNow(w, k, n, factor = 1) {
  let coins = 0;
  for (let i = 0; i < n; i++) {
    coins += priceOf(w, k) * factor;
    w.market[k] = Math.max(0.35, (w.market[k] ?? 1) - SATURATE[ITEMS[k].group]);
  }
  w.coins += coins;
  return coins;
}

// ── Contracts ─────────────────────────────────────────────────────────────────
// What the farm could make right now: food, goods of species you own, and
// whatever your workshops make.
export function contractPool(w) {
  const owned = new Set(Object.values(w.creatures || {}).map(c => c.species));
  const pool = [...STORE_ITEMS];
  for (const [sp, k] of Object.entries(PRODUCT_OF)) if (owned.has(sp)) pool.push(k);
  for (const [key, ws] of Object.entries(WORKSHOPS)) if (w.workshops?.[key]?.level) pool.push(ws.makes);
  return pool;
}
export function makeContract(w, rng, tMs, id) {
  const pool = contractPool(w);
  const k = pool[Math.floor(rng() * pool.length) % pool.length];
  const g = ITEMS[k].group;
  const n = g === "food" ? 5 * (6 + Math.floor(rng() * 11)) : g === "goods" ? 6 + Math.floor(rng() * 15) : 2 + Math.floor(rng() * 7);
  return { id, item: k, n, got: 0, reward: Math.round(n * ITEMS[k].price * (1.8 + rng() * 0.8)), until: tMs + Math.round((8 + rng() * 16) * H) * 1000 };
}
// Hand over what we have toward a contract. Returns { given, done }.
export function giveToContract(w, ct, maxGive) {
  const need = ct.n - ct.got;
  const given = Math.max(0, Math.min(need, Math.floor(w.food[ct.item] || 0), maxGive));
  w.food[ct.item] = (w.food[ct.item] || 0) - given;
  ct.got += given;
  const done = ct.got >= ct.n;
  if (done) w.coins += ct.reward;
  return { given, done };
}

// ── Creatures ─────────────────────────────────────────────────────────────────
export function rollSkills(species, personality, rng, have = {}) {
  const base = SPECIES_SKILLS[species] || {};
  const mod = PERSONALITY_SKILLS[personality] || {};
  const out = { ...have };
  for (const s of SKILLS) if (out[s] == null) out[s] = Math.max(1, Math.min(10, (base[s] || 1) + (mod[s] || 0) + (rng() < 0.35 ? 1 : 0)));
  return out;
}

// Fill in ranch fields on a creature that doesn't have them yet (old saves, new arrivals).
export function ranchify(c, rng) {
  const needSkills = !c.skills || SKILLS.some(s => c.skills[s] == null);
  return {
    energy: 100, job: null, buddy: null, resting: false,
    ...c,
    xp: { forage: 0, care: 0, farm: 0, craft: 0, haul: 0, ...(c.xp || {}) },
    skills: needSkills ? rollSkills(c.species, c.traits.personality, rng, c.skills || {}) : c.skills,
  };
}

// What a creature is doing right now (for the UI and the map).
// Pen spots: only creatures with a spot (or following someone) eat from the
// trough, rest, work, get groomed and make goods. The rest wait in the meadow,
// still getting hungry and sad, until they get a spot or are fed by hand.
export const inMeadow = (c) => !c.housed && !c.follow;
export const housedCount = (w) => Object.values(w.creatures || {}).filter(c => c.housed).length;
export const penSlots = (w) => w.penSlots || PEN_START;
export const penCost = (n) => Math.round(20 * Math.pow(1.35, n - PEN_START - 1));     // price of pen spot number n
// "Find a new home": coins for a creature (more for good skills; golden ones are worth a lot).
export function rehomePrice(c) {
  const skills = SKILLS.reduce((n, s) => n + (c.skills?.[s] || 1), 0);
  return Math.round((12 + skills * 1.6) * (c.traits?.rare ? 6 : 1));
}
export function stateOf(c) {
  if (c.follow) return "following";
  if (!c.housed) return "meadow";
  if (c.hunger < STOP_HUNGER) return "starving";
  if (c.happy < STOP_HAPPY) return "sad";
  if (c.resting) return "resting";
  if (!c.job) return "idle";
  return "working";
}
export const STATE_TEXT = {
  following: "following someone", meadow: "waiting in the meadow (no pen spot)", starving: "too hungry to work", sad: "too sad to work",
  resting: "resting", idle: "no job", working: "working",
};
export const makesGoods = (c) => !inMeadow(c) && c.hunger >= STOP_HUNGER && c.happy >= PRODUCE_HAPPY;

// Can this player give this creature jobs / buddies? (Your own, or ones that trust you.)
export const canManage = (c, by) => c.owner === String(by) || (c.bond?.[String(by)] || 0) >= 50;

// Hauler rules: keep[item] = how many to keep (the rest gets sold); missing = hands off.
export const DEFAULT_KEEP = { berry: 40, carrot: 40 };

// ── World fields ──────────────────────────────────────────────────────────────
export function ranchDefaults() {
  return {
    coins: 25,                                   // enough for your first few plots
    penSlots: PEN_START,
    buildings: { trough: 1, shed: 1, warehouse: 1, beds: 0, stall: 0 }, trough: { berry: 0, carrot: 0 },
    workshops: {}, market: {}, keep: { ...DEFAULT_KEEP }, contracts: [], contractAt: 0, nextContract: 1,
    simAt: null, report: null,
  };
}

const add = (obj, k, n) => { obj[k] = (obj[k] || 0) + n; };

// Put items into storage, respecting the cap. Overflow is auto-sold at the market price (stall) or wasted.
export function store(w, kind, n, rep) {
  const cap = capFor(w, kind);
  const have = w.food[kind] || 0;
  const fits = Math.max(0, Math.min(n, cap - have));
  w.food[kind] = have + fits;
  if (rep) { add(rep.gained, kind, fits); add(rep.produced, kind, n); }
  const extra = n - fits;
  if (extra > 0) {
    if (w.buildings.stall) { const c = sellNow(w, kind, Math.round(extra)); if (rep) { rep.autoSold += c; add(rep.sold, kind, Math.round(extra)); } }
    else if (rep) add(rep.wasted, kind, extra);
  }
}

// Workshops never use the last FOOD_RESERVE berries/carrots: creatures eat first.
export const FOOD_RESERVE = 10;
export const usable = (w, k) => Math.max(0, Math.floor(w.food?.[k] || 0) - (ITEMS[k]?.group === "food" ? FOOD_RESERVE : 0));
export const missingInputs = (w, needs) => Object.entries(needs).filter(([k, n]) => usable(w, k) < n);
const hasInputs = (w, needs) => missingInputs(w, needs).length === 0;

// Finish as many items as the workshop has progress + inputs for.
export function finishCrafts(w, key, rep) {
  const st = w.workshops[key], ws = WORKSHOPS[key];
  while (st.progress >= 1) {
    if (!hasInputs(w, ws.needs)) { st.progress = 1; st.stalled = true; return; }
    for (const [k, n] of Object.entries(ws.needs)) { w.food[k] -= n; if (rep) add(rep.used, k, n); }
    st.progress -= 1;
    store(w, ws.makes, 1, rep);
    if (rep) add(rep.made, ws.makes, 1);
  }
  st.stalled = !hasInputs(w, ws.needs);
}

// ── The simulation (one step of dt seconds at world time tMs) ─────────────────
// Mutates a copied world `w` (farmWorld clones before calling).
// rep: report counters (or null for live ticks).
export function stepRanch(w, dt, tMs, rep) {
  const list = Object.values(w.creatures);
  const byId = w.creatures;
  const tcap = troughCap(w);
  stepMarket(w, dt, tMs);
  // Storage limits are hard: nothing sits above the cap (hand harvests, old
  // saves). With the Market Stall the extra gets sold; without it, it's lost.
  for (const k of ITEM_KEYS) {
    const extra = Math.floor((w.food[k] || 0) - capFor(w, k));
    if (extra <= 0) continue;
    w.food[k] -= extra;
    if (w.buildings.stall) { const c = sellNow(w, k, extra); if (rep) { rep.autoSold += c; add(rep.sold, k, extra); } }
    else if (rep) add(rep.wasted, k, extra);
  }
  const crafting = {};                                    // workshop → total crafting speed this step
  const crewed = {};                                      // workshops with a Crafter on shift this step

  for (const c of list) {
    const pw = PERSONALITY_WORK[c.traits.personality] || {};
    const st = stateOf(c);
    const working = st === "working";
    const meadow = st === "meadow";
    const buddy = c.buddy && !meadow ? byId[c.buddy] : null;    // buddies only help each other in the pen
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
    if (c.hunger < EAT_BELOW && !meadow) {                 // followers eat too; meadow creatures can't reach the trough
      const loved = SPECIES[c.species].food;
      const pickFrom = (pool) => ((pool[loved] || 0) >= 1 ? loved : STORE_ITEMS.find(k => (pool[k] || 0) >= 1));
      let k = pickFrom(w.trough), from = "trough";
      // trough empty → a buddy who forages or feeds brings something from storage
      if (!k && buddy && (buddy.job === "forager" || buddy.job === "feeder") && stateOf(buddy) === "working") { k = pickFrom(w.food); from = "buddy"; }
      if (k) {
        if (from === "trough") w.trough[k] -= 1; else { w.food[k] -= 1; if (rep) add(rep.eaten, k, 1); }
        const yum = k === loved;
        c.hunger = Math.min(100, c.hunger + (yum ? LOVED_MEAL : MEAL));
        if (yum) c.happy = Math.min(100, c.happy + 6);
        if (rep) { rep.meals += 1; if (from === "buddy") rep.buddyMeals += 1; }
      }
    }

    // ── making its species' goods (happy creatures only; golden ones make double)
    const product = PRODUCT_OF[c.species];
    if (product && makesGoods(c)) {
      c.made = (c.made || 0) + (dt / PRODUCE_SECS) * (c.happy / 100) * (c.traits.rare ? 2 : 1);
      if (c.made >= 1) { const n = Math.floor(c.made); c.made -= n; store(w, product, n, rep); }
    }

    // ── working
    if (working) {
      const job = JOBS[c.job];
      const lvl = c.skills[job.skill] || 1;
      const f = skillFactor(lvl) * speed;
      let learning = true;                                  // XP only while actually getting something done
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
          if (rep) add(rep.toTrough, k, 1);
        }
      } else if (c.job === "groomer") {
        const n = 1 + Math.floor(lvl / 3);
        const sad = list.filter(o => o.id !== c.id && o.happy < 95 && !inMeadow(o)).sort((a, b) => a.happy - b.happy).slice(0, n);
        for (const o of sad) o.happy = Math.min(100, o.happy + GROOM_RATE * f * dt);
      } else if (c.job === "crafter") {
        const ws = c.station && w.workshops[c.station];
        if (ws?.level) crewed[c.station] = true;
        if (ws?.level && ws.on !== false && hasInputs(w, WORKSHOPS[c.station].needs)) crafting[c.station] = (crafting[c.station] || 0) + f;
        else learning = false;
      } else if (c.job === "hauler") {
        if (!w.buildings.stall) learning = false;
        else {
          c.work += HAUL_RATE * f * dt;
          const carried = haul(w, Math.floor(c.work), tMs, rep);
          c.work = carried < Math.floor(c.work) ? Math.min(c.work - carried, 1) : c.work - carried;
          if (!carried) learning = false;
        }
      }
      // XP → skill levels
      if (learning) {
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
  }

  // ── workshops: crafters push progress along; finished items need their inputs
  for (const [key, st] of Object.entries(w.workshops)) {
    if (!st.level) continue;
    const sp = crafting[key] || 0;
    if (sp > 0) st.progress = (st.progress || 0) + (dt * sp * wsSpeed(st.level)) / WORKSHOPS[key].secs;
    if (rep && crewed[key] && st.on !== false) { if (sp > 0) add(rep.busy, key, dt); else add(rep.waiting, key, dt); }
    finishCrafts(w, key, rep);
  }

  // ── farmhands tend the field: each looks after 1 plot per Farm level.
  //    They plant empty plots too (whichever food you have less of in storage).
  const hands = list.filter(c => c.job === "farmhand" && stateOf(c) === "working");
  if (hands.length) {
    let slots = hands.reduce((n, c) => n + plotsPerFarmhand(c), 0);
    const plots = w.plots;
    for (let i = 0; i < plots.length && slots > 0; i++) {
      const crop = plots[i];
      if (!crop) {
        slots--;
        const kind = (w.food.berry || 0) <= (w.food.carrot || 0) ? "berry" : "carrot";
        plots[i] = { kind, at: tMs, by: null };
        continue;
      }
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

// A Hauler carries up to n items to the stall, only ever from the extra above
// each keep amount: contracts first, then selling, best value first.
// Returns how many it carried.
function haul(w, n, tMs, rep) {
  let carried = 0;
  const allowed = (k) => w.keep?.[k] != null;
  const spare = (k) => Math.floor(w.food[k] || 0) - (w.keep?.[k] ?? Infinity);
  while (carried < n) {
    const ct = w.contracts.find(c => c.got < c.n && c.until > tMs && allowed(c.item) && spare(c.item) >= 1);
    if (ct) {
      const { given, done } = giveToContract(w, ct, Math.min(n - carried, spare(ct.item)));
      carried += given;
      if (rep) add(rep.delivered, ct.item, given);
      if (done) {
        if (rep) { rep.contracts += 1; rep.contractCoins += ct.reward; }
        else w._contractsDone = [...(w._contractsDone || []), ct];
      }
      continue;
    }
    let best = null, bestV = 0;
    for (const k of ITEM_KEYS) if (allowed(k) && spare(k) >= 1) { const v = priceOf(w, k); if (v > bestV) { bestV = v; best = k; } }
    if (!best) break;
    const take = Math.min(n - carried, spare(best));
    w.food[best] -= take;
    const coins = sellNow(w, best, take);
    if (rep) { rep.hauled += coins; add(rep.sold, best, take); }
    carried += take;
  }
  if (w.contracts.some(c => c.got >= c.n)) w.contracts = w.contracts.filter(c => c.got < c.n);
  return carried;
}

// Run the farm forward by `secs` seconds ending at world time `endMs`, in chunks.
// Returns the report (or null for short live ticks).
export function simulateRanch(w, secs, endMs, withReport) {
  const rep = withReport ? newReport() : null;
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

function newReport() {
  return {
    gained: {}, produced: {}, wasted: {}, made: {}, used: {}, sold: {}, eaten: {}, toTrough: {}, delivered: {}, busy: {}, waiting: {},
    meals: 0, buddyMeals: 0, harvests: 0, autoSold: 0, hauled: 0, contracts: 0, contractCoins: 0, levelUps: [],
  };
}

// ── Forecast ──────────────────────────────────────────────────────────────────
// "If nothing changes, where will the farm be in N seconds?" Runs the real
// simulation on a copy of the world (it has no randomness, so it's a fair
// preview; only market prices are guesses about the future).
export function cloneRanch(w) {
  return {
    ...w,
    creatures: Object.fromEntries(Object.values(w.creatures || {}).map(c => [c.id, { ...c, skills: { ...c.skills }, xp: { ...(c.xp || {}) } }])),
    food: { ...w.food }, trough: { ...w.trough }, plots: (w.plots || []).slice(), buildings: { ...w.buildings },
    market: { ...(w.market || {}) }, keep: { ...(w.keep || {}) },
    workshops: Object.fromEntries(Object.entries(w.workshops || {}).map(([k, v]) => [k, { ...v }])),
    contracts: (w.contracts || []).map(c => ({ ...c })),
    _levelUps: [], _contractsDone: [],
  };
}
export function forecast(w, secs, nowMs) {
  const sim = cloneRanch(w);
  const coins0 = sim.coins || 0;
  const rep = simulateRanch(sim, secs, nowMs + secs * 1000, true);
  return { sim, rep, coins: (sim.coins || 0) - coins0 };
}

// How fast a creature does its job right now (for the creature cards).
export function jobRate(w, c) {
  if (!c.job) return null;
  const lvl = c.skills?.[JOBS[c.job].skill] || 1;
  const buddy = c.buddy ? w.creatures?.[c.buddy] : null;
  const f = skillFactor(lvl) * (buddy && chemistry(c, buddy) > 0 ? 1.15 : 1);
  if (c.job === "forager") return { every: 1 / (FORAGE_RATE * f), what: "brings back a berry or carrot", perHour: 3600 * FORAGE_RATE * f };
  if (c.job === "feeder") return { every: 1 / (FEED_RATE * f), what: "moves 1 food from storage to the trough", perHour: 3600 * FEED_RATE * f };
  if (c.job === "groomer") return { text: `cheers up the ${1 + Math.floor(lvl / 3)} saddest creature${lvl >= 3 ? "s" : ""} at once, +${Math.round(GROOM_RATE * f * 3600)} happiness an hour each` };
  if (c.job === "hauler") return { every: 1 / (HAUL_RATE * f), what: "carries 1 item to the stall", perHour: 3600 * HAUL_RATE * f };
  if (c.job === "farmhand") return { text: `looks after ${plotsPerFarmhand(c)} plot${plotsPerFarmhand(c) > 1 ? "s" : ""}: plants empty ones, harvests and replants the moment they're ripe` };
  if (c.job === "crafter") return { text: `works at Craft ${lvl} (${Math.round(f * 100)}% speed${f > skillFactor(lvl) ? ", buddy bonus" : ""})` };
  return null;
}