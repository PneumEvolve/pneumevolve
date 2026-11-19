// Shared state: the save file, HUD and controls, plus rules that read the save.
import { BLD, FAV, LAB_BONUS, NEIGHBORS, RCP_COST, SP, T, TL, recipeOf } from './tuning';
import { DISTRICTS } from './maps';

export const SAVE = {};
// (re)load the save from this browser and bring old saves up to date
export function loadSave() {
  const loaded = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s.scrap === 'number') {
        const out = Object.assign(freshSave(), s);
        out.creatures = Object.assign({ hound: 1 }, s.creatures);
        if (!Array.isArray(out.buildings)) out.buildings = [];
        return out;
      }
    } catch (e) {}
    return freshSave();
  })();
  Object.keys(SAVE).forEach(k => delete SAVE[k]);
  Object.assign(SAVE, loaded);
  // creatures: every pet you own, and your ordered squad of up to 4
  if (!Array.isArray(SAVE.pets)) {
    SAVE.pets = []; SAVE.nextPetId = 1;
    const add = (sp) => SAVE.pets.push({ id: SAVE.nextPetId++, sp, lvl: 1 });
    add('hound');
    for (let i = 0; i < (SAVE.creatures.crow || 0); i++) add('crow');
  }
  SAVE.pets = SAVE.pets.filter(pt => SP[pt.sp]);
  if (!SAVE.nextPetId) SAVE.nextPetId = SAVE.pets.reduce((m, pt) => Math.max(m, pt.id), 0) + 1;
  if (!Array.isArray(SAVE.squad)) SAVE.squad = SAVE.pets.slice(0, 4).map(pt => pt.id);
  SAVE.squad = SAVE.squad.filter(id => SAVE.pets.some(pt => pt.id === id)).slice(0, 4);
  if (!SAVE.hero) SAVE.hero = { lvl: 1, xp: 0, perks: [], picks: 0 };
  SAVE.pets.forEach(pt => { pt.lvl = pt.lvl || 1; pt.xp = pt.xp || 0; pt.ar = pt.ar || 1; pt.pr = pt.pr || 1; pt.picks = pt.picks || 0; });
  if (!SAVE.stash) SAVE.stash = { cage: 0, medkit: 0, treat: 0, lure: 0 };
  if (!SAVE.recipes) SAVE.recipes = { workbench: 'cage', kitchen: 'medkit' };
  if (SAVE.stash.ammo == null) SAVE.stash.ammo = 0;
  if (!SAVE.prodV2) { SAVE.food = (SAVE.food || 0) + (SAVE.buildings.length ? 8 : 0); SAVE.parts = (SAVE.parts || 0) + (SAVE.buildings.length ? 4 : 0); SAVE.prodV2 = true; }
  SAVE.food = SAVE.food || 0; SAVE.parts = SAVE.parts || 0;
  if (!SAVE.research) SAVE.research = {};
  if (!SAVE.camps) { SAVE.camps = {}; for (let i = 0; i < (SAVE.campsCleared || 0); i++) SAVE.camps[i] = true; }
  if (!SAVE.reclaimed) SAVE.reclaimed = {};
  if (SAVE.recipes && !SAVE.recipesMigrated) { SAVE.buildings.forEach(b => { if (!b.rcp && SAVE.recipes[b.t]) b.rcp = SAVE.recipes[b.t]; }); SAVE.recipesMigrated = true; }
}

export const GAME = { onExit: null };
// each civic building type: as many as your Town Hall level
export const typeCap = (t) => (t === 'lab' ? 1 : BLD[t] && BLD[t].cat === 'civ' ? SAVE.townLevel : 0);

export const campDone = (i) => !!(SAVE.camps || {})[i];
export const campsBeaten = () => Object.keys(SAVE.camps || {}).length;
// districts
export const reclaimed = (i) => !!(SAVE.reclaimed || {})[DISTRICTS[i].key];
export const reclaimedCount = () => DISTRICTS.filter((d, i) => reclaimed(i)).length;
export const bossBeaten = (d) => !!(d.dungeon && SAVE[`${d.dungeon}Cleared`]);
export const districtDone = (i) => { const d = DISTRICTS[i]; return d.ready && bossBeaten(d) && d.camps.every(campDone); };
// a gate opens when the district before it is reclaimed, or at its Town Hall level
export const gateOpen = (i) => i === 0 || (DISTRICTS[i].ready && (reclaimed(i - 1) || SAVE.townLevel >= DISTRICTS[i].th));
export const districtOfCamp = (ci) => DISTRICTS.findIndex(d => d.camps.includes(ci));
export const campOpen = (ci) => { const di = districtOfCamp(ci); if (di < 0 || !gateOpen(di)) return false; const k = DISTRICTS[di].camps.indexOf(ci); return k === 0 || campDone(DISTRICTS[di].camps[k - 1]); };
export const civCap = () => TL[SAVE.townLevel].civ + 2 * reclaimedCount();

// ===================================================================
//  SAVE (this browser only, for now)
// ===================================================================
export const SAVE_KEY = 'dungeonTown.v1';

export const freshSave = () => ({ scrap: 0, food: 0, parts: 0, creatures: { hound: 1 }, runs: 0, bestRoom: 0, townLevel: 1, day: 1, runsToday: 0, buildings: [], seenIntro: false });

export const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

export const petById = (id) => SAVE.pets.find(pt => pt.id === id);

// ---- levels: cap = Town Hall level x 5; every 5th level = an upgrade pick
export const levelCap = () => SAVE.townLevel * 5;

export const xpNeed = (lvl) => 8 + lvl * 6;

export const isMilestone = (lvl) => lvl % 5 === 0;

export function addXp(obj, amt) {
  const cap = levelCap(), ups = [];
  if (obj.lvl >= cap) { obj.xp = 0; return ups; }
  obj.xp += amt;
  if (obj.peak == null) obj.peak = obj.lvl;
  while (obj.lvl < cap && obj.xp >= xpNeed(obj.lvl)) {
    obj.xp -= xpNeed(obj.lvl); obj.lvl++;
    // upgrade picks only the first time a level is reached (levels spent in the Lab don't give them again)
    if (isMilestone(obj.lvl) && obj.lvl > obj.peak) obj.picks = (obj.picks || 0) + 1;
    obj.peak = Math.max(obj.peak, obj.lvl);
    ups.push(obj.lvl);
  }
  if (obj.lvl >= cap) obj.xp = 0;
  return ups;
}

export const perk = (k) => SAVE.hero.perks.includes(k);

export const ammoMax = () => T.ammoMax + (perk('quick') ? 1 : 0);

export const reloadTime = () => T.reloadTime * (perk('quick') ? 0.75 : 1);

export const gunDmg = () => T.gunDmg + (perk('gunner') ? 1 : 0);

export const swordDmg = () => T.swordDmg + (perk('blade') ? 1 : 0);

export const dashCd = () => T.dashCd * (perk('fleet') ? 0.7 : 1);

export const petMaxHp = (pt) => (studied('hound') ? 1 : 0) + SP[pt.sp].hearts + Math.floor(((pt.lvl || 1) - 1) / 5) + (pt.sp === 'beetle' && (pt.pr || 1) >= 2 ? 1 : 0);

export const petLvlDmg = (lvl) => Math.floor(((lvl || 1) - 1) / 10);

export const jobOf = (petId) => SAVE.buildings.find(b => b.w === petId) || null;

export const isFav = (b) => { const pt = b.w && petById(b.w); return !!pt && FAV[b.t] === pt.sp; };

export const staffed = (t) => SAVE.buildings.filter(b => b.t === t && b.w && petById(b.w));


export const stashCap = () => (studied('rat') ? 2 : 0) + T.stashBase + SAVE.buildings.filter(b => b.t === 'storehouse').reduce((m, b) => m + T.stashPerStorehouse + 3 * ((b.lvl || 1) - 1), 0);
// production: neighbours, levels, and what each building makes every morning
export const nextTo = (b, t) => SAVE.buildings.some(o => o !== b && o.t === t && Math.abs(o.c - b.c) <= 1 && Math.abs(o.r - b.r) <= 1);
export const bonusesOf = (b) => NEIGHBORS.filter(nb => nb.a === b.t && nextTo(b, nb.b));
// ---- Lab + feeding
export const studied = (sp) => ((SAVE.research || {})[sp] || 0) >= 100;
export const labOf = (id) => SAVE.buildings.find(b => b.t === 'lab' && (b.lab || []).includes(id)) || null;
export const labActive = (sp) => SAVE.buildings.some(b => b.t === 'lab' && (b.lab || []).some(id => { const pt = petById(id); return pt && pt.sp === sp; }));
export const cureNeeded = () => Object.keys(LAB_BONUS);
export const curePct = () => Math.round(cureNeeded().reduce((m, sp) => m + Math.min(100, (SAVE.research || {})[sp] || 0), 0) / cureNeeded().length);
// every Kitchen seats 4 creatures (+2 per level). No Kitchen = nobody eats.
export const seats = () => SAVE.buildings.filter(b => b.t === 'kitchen').reduce((m, b) => m + T.kitchenSeats + T.seatsPerLvl * ((b.lvl || 1) - 1), 0);
// who eats each morning, in order: Lab first (they leave if hungry), then workers, then your squad. The pen hibernates.
export const eaters = () => {
  const ids = [];
  const add = (id) => { if (id != null && petById(id) && !ids.includes(id)) ids.push(id); };
  SAVE.buildings.filter(b => b.t === 'lab').forEach(b => (b.lab || []).forEach(add));
  SAVE.buildings.forEach(b => add(b.w));
  SAVE.squad.forEach(add);
  return ids;
};
// tomorrow morning's food, step by step
export const foodForecast = () => {
  const grow = SAVE.buildings.filter(b => b.t === 'farm' && recipeOf(b) === 'food').reduce((m, b) => m + outputOf(b).n, 0);
  const mouths = eaters().length, st = seats();
  let left = (SAVE.food || 0) + grow;
  const eat = Math.min(mouths, st, left); left -= eat;
  let cook = 0;
  SAVE.buildings.filter(b => b.t === 'kitchen').forEach(b => { const o = outputOf(b), per = o.cost.food; const n = Math.min(o.n, Math.floor(left / per)); cook += n * per; left -= n * per; });
  return { grow, eat, cook, mouths, seats: st, net: grow - eat - cook, hungry: mouths - eat };
};
export function outputOf(b) {
  const k = recipeOf(b), lv = b.lvl || 1, job = prodMult(b);
  if (b.t === 'farm') return { k, n: Math.round((k === 'food' ? T.farmFood : T.farmScrap) * [1, 1.5, 2][job - 1] * (1 + 0.5 * (lv - 1)) * (nextTo(b, 'farm') ? 1.25 : 1) * ((SAVE.reclaimed || {}).ruins ? 1.25 : 1)) };
  if (b.t === 'salvage') return { k: 'parts', n: Math.round((T.salvageParts + (job - 1) * 2) * (1 + 0.5 * (lv - 1))) + (nextTo(b, 'workbench') ? 1 : 0) + ((SAVE.reclaimed || {}).subway ? 2 : 0) };
  if (b.t === 'kitchen') return { k, n: job + (lv - 1) + (nextTo(b, 'farm') ? 1 : 0), cost: RCP_COST[k] };
  if (b.t === 'workbench') return { k, n: job + (lv - 1) + (nextTo(b, 'storehouse') ? 1 : 0), cost: RCP_COST[k] };
  return null;
}

export const stashTotal = () => Object.values(SAVE.stash).reduce((a, b) => a + b, 0);

// a hungry worker (missed its last meal) doesn't work
export const prodMult = (b) => { const pt = b.w && petById(b.w); return pt && !(pt.hungry > 0) ? (isFav(b) ? 3 : 2) : 1; };

export const protectAmt = () => SAVE.buildings.filter(b => b.t === 'storehouse').reduce((m, b) => m + T.storehouseProtects * (b.lvl || 1), 0) + staffed('storehouse').reduce((m, b) => m + (isFav(b) ? 100 : 50), 0);

export const squadRank = (passive) => SAVE.squad.reduce((m, id) => { const pt = petById(id); return pt && SP[pt.sp].passive === passive ? Math.max(m, pt.pr || 1) : m; }, 0);

export const addPet = (sp) => { const pt = { id: SAVE.nextPetId++, sp, lvl: 1, xp: 0, ar: 1, pr: 1, picks: 0 }; SAVE.pets.push(pt); if (SAVE.squad.length < 4) SAVE.squad.push(pt.id); return pt; };

export const countB = (t) => SAVE.buildings.filter(b => b.t === t).length;

export const maxHearts = () => T.heroHp + [0, 1, 1, 2][squadRank('tough')] + (perk('tough') ? 1 : 0) + Math.floor(SAVE.hero.lvl / 4);

export const bCost = (b) => { const d = BLD[b.t]; return d.upg ? d.upg[(b.lvl || 1) - 1] : d.cost; };

export const pointsUsed = (cat) => SAVE.buildings.reduce((s, b) => s + (BLD[b.t].cat === cat ? bCost(b) : 0), 0);

// Shared state between scenes
export const Ctl = { move: { x: 0, y: 0 }, mode: 'brawl', queue: [], aim: null, aimAbility: null, twin: null, blocked: false };

export const HUD = { scene: 'town' };

// fresh HUD + controls each time the game is created
export function resetShared() {
  Object.keys(HUD).forEach(k => delete HUD[k]); HUD.scene = 'town';
  Object.assign(Ctl, { move: { x: 0, y: 0 }, mode: 'brawl', queue: [], aim: null, aimAbility: null, twin: null, blocked: false });
}