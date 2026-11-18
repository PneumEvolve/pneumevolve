// Shared state: the save file, HUD and controls, plus rules that read the save.
import { BLD, FAV, SP, T } from './tuning';

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
  if (SAVE.recipes && !SAVE.recipesMigrated) { SAVE.buildings.forEach(b => { if (!b.rcp && SAVE.recipes[b.t]) b.rcp = SAVE.recipes[b.t]; }); SAVE.recipesMigrated = true; }
}

export const GAME = { onExit: null };
// each civic building type: as many as your Town Hall level
export const typeCap = (t) => (BLD[t] && BLD[t].cat === 'civ' ? SAVE.townLevel : 0);

export const campsBeaten = () => SAVE.campsCleared || 0;

// ===================================================================
//  SAVE (this browser only, for now)
// ===================================================================
export const SAVE_KEY = 'dungeonTown.v1';

export const freshSave = () => ({ scrap: 0, creatures: { hound: 1 }, runs: 0, bestRoom: 0, townLevel: 1, day: 1, runsToday: 0, buildings: [], seenIntro: false });

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
  while (obj.lvl < cap && obj.xp >= xpNeed(obj.lvl)) {
    obj.xp -= xpNeed(obj.lvl); obj.lvl++;
    if (isMilestone(obj.lvl)) obj.picks = (obj.picks || 0) + 1;
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

export const petMaxHp = (pt) => SP[pt.sp].hearts + Math.floor(((pt.lvl || 1) - 1) / 5);

export const petLvlDmg = (lvl) => Math.floor(((lvl || 1) - 1) / 10);

export const jobOf = (petId) => SAVE.buildings.find(b => b.w === petId) || null;

export const isFav = (b) => { const pt = b.w && petById(b.w); return !!pt && FAV[b.t] === pt.sp; };

export const staffed = (t) => SAVE.buildings.filter(b => b.t === t && b.w && petById(b.w));

export const farmScrap = () => countB('farm') * T.farmScrap + staffed('farm').reduce((m, b) => m + (isFav(b) ? 20 : 10), 0);

export const stashCap = () => T.stashBase + T.stashPerStorehouse * countB('storehouse');

export const stashTotal = () => Object.values(SAVE.stash).reduce((a, b) => a + b, 0);

export const prodMult = (b) => (b.w && petById(b.w) ? (isFav(b) ? 3 : 2) : 1);

export const protectAmt = () => countB('storehouse') * T.storehouseProtects + staffed('storehouse').reduce((m, b) => m + (isFav(b) ? 100 : 50), 0);

export const squadRank = (passive) => SAVE.squad.reduce((m, id) => { const pt = petById(id); return pt && SP[pt.sp].passive === passive ? Math.max(m, pt.pr || 1) : m; }, 0);

export const addPet = (sp) => { const pt = { id: SAVE.nextPetId++, sp, lvl: 1, xp: 0, ar: 1, pr: 1, picks: 0 }; SAVE.pets.push(pt); if (SAVE.squad.length < 4) SAVE.squad.push(pt.id); return pt; };

export const countB = (t) => SAVE.buildings.filter(b => b.t === t).length;

export const maxHearts = () => T.heroHp + squadRank('tough') + (perk('tough') ? 1 : 0) + Math.floor(SAVE.hero.lvl / 4);

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