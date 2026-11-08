// src/Pages/rootwork/engine/training.js — Training Halls + Roster Blueprints
// Import from "../gameEngine" elsewhere, not from here.
//
// TRAINING: every worker type has a training level (0..max). New hires of that type
// start with every upgrade up to the trained tier — no extra taps, cash or materials.
//   farm    → Farmers Hall      (gloves → hoe → specialization → wheelbarrow → tractor)
//   kitchen → Kitchen Hall      (knife → auto-restart → prep station → batch ×2 → ×5 → ×10)
//   market  → Market Hall       (wagon → truck → freight + standing order → export hub)
//   barn    → Barn Hall         (quick rounds + big basket → care → sprint → cargo → bond)
//   fisher  → Fishermen's Hall  (quick cast + big net → good rod → sprint cast → trawl → expert)
//   forge   → Forge Hall        (bellows → auto-craft → master forge)
// Research-gated upgrades (batch ×5/×10, cargo basket, animal bond, trawl net, expert rod)
// need their School research before that training tier can be bought, and are skipped
// on a hire if the research is somehow missing.
//
// ROSTER BLUEPRINT: when a season starts, the crew you ended the season with is saved to
// state.lastRoster. Each hall's "Rebuy" re-hires up to that count (paying normal hire costs),
// trains them, and restores recipes / standing orders / bait / farm specializations.
// "Save current crew" overwrites the blueprint with whatever you have right now.

import {
  GEAR, GEAR_ORDER, SPECIALIZATIONS, SPECIALIZE_COST, SPECIALIZE_REQUIRES,
  KITCHEN_WORKER_UPGRADES, MARKET_WORKER_GEAR, MARKET_WORKER_GEAR_ORDER, MARKET_WORKER_STANDING_ORDER_COST,
  BARN_WORKER_UPGRADES, FISHING_WORKER_UPGRADES, FORGE_WORKER_UPGRADES,
  TOWN_HALL_BUILDING_GATES, BARN_BUILDINGS, SCHOOL_RESEARCH,
} from "../gameConstants";
import { canAffordUpgradeMaterials, consumeUpgradeMaterials, getTownHallLevel, isAtWorkerCap } from "./core.js";
import { hasSchoolResearch, getMaxKitchenWorkers, getMaxMarketWorkers, getMaxForgeWorkers } from "./town.js";
import { getBarnInstanceWorkerSlots } from "./setup.js";
import { deepCloneState } from "./save.js";
import {
  hireWorker, hireKitchenWorker, hireMarketWorker, hireBarnWorker, hireFishingWorker,
  assignKitchenWorkerRecipe, setFishingWorkerBait,
} from "./actions.js";
import { setMarketWorkerStandingOrder } from "./workers.js";
import { hireForgeWorker, assignForgeWorkerRecipe } from "./forge.js";

// ─── Tuning ───────────────────────────────────────────────────────────────────
// Price of training level L = (cash cost of every upgrade a hire receives at L) × priceMult,
// rounded to $100. priceMult ≈ typical late-game roster of that type × 3, so a level repays
// itself in ~3 seasons of rebuilding. Materials = (materials of those upgrades) × matMult.

const gear  = (id) => ({ kind: "gear", id });
const spec  = ()   => ({ kind: "spec", id: "specialization" });
const up    = (id) => ({ kind: "upgrade", id });
const stand = ()   => ({ kind: "standing", id: "standing_order" });

export const TRAINING_HALLS = {
  farm: {
    key: "farm", name: "Farmers Hall", emoji: "🌾", noun: "farmer", priceMult: 120, matMult: 20,
    tiers: [[gear("gloves")], [gear("hoe")], [spec()], [gear("wheelbarrow")], [gear("tractor")]],
  },
  kitchen: {
    key: "kitchen", name: "Kitchen Hall", emoji: "🍳", noun: "cook", priceMult: 18, matMult: 3,
    tiers: [[up("speed_1")], [up("auto_restart")], [up("speed_2")], [up("batch_2")], [up("batch_5")], [up("batch_10")]],
  },
  market: {
    key: "market", name: "Market Hall", emoji: "🛒", noun: "merchant", priceMult: 18, matMult: 3,
    tiers: [[gear("wagon")], [gear("truck")], [gear("freight"), stand()], [gear("export_hub")]],
  },
  barn: {
    key: "barn", name: "Barn Hall", emoji: "🐄", noun: "barn hand", priceMult: 30, matMult: 5,
    tiers: [[up("speed_1"), up("capacity_1")], [up("care_1")], [up("speed_2")], [up("capacity_2")], [up("care_2")]],
  },
  fisher: {
    key: "fisher", name: "Fishermen's Hall", emoji: "🎣", noun: "fisher", priceMult: 30, matMult: 5,
    tiers: [[up("speed_1"), up("haul_1")], [up("gear_good")], [up("speed_2")], [up("haul_2")], [up("gear_expert")]],
  },
  forge: {
    key: "forge", name: "Forge Hall", emoji: "⚒️", noun: "smith", priceMult: 15, matMult: 2.5,
    tiers: [[up("forge_speed_1")], [up("forge_auto")], [up("forge_speed_2")]],
  },
};

// Rebuy order for "Rebuy whole crew" — farms and barns first (they gate prestige)
export const TRAINING_TYPE_ORDER = ["farm", "barn", "kitchen", "market", "fisher", "forge"];

const RESEARCH_GATES = {
  kitchen: { batch_5: "kitchen_batch_5", batch_10: "kitchen_batch_10" },
  barn:    { capacity_2: "barn_capacity_2", care_2: "barn_care_2" },
  fisher:  { haul_2: "fishing_haul_2", gear_expert: "fishing_gear_expert" },
};

// ─── Step info (cost + label pulled from the real upgrade tables) ────────────

function upgradeTable(type) {
  if (type === "kitchen") return KITCHEN_WORKER_UPGRADES;
  if (type === "barn") return BARN_WORKER_UPGRADES;
  if (type === "fisher") return FISHING_WORKER_UPGRADES;
  if (type === "forge") return FORGE_WORKER_UPGRADES;
  return {};
}

function stepInfo(type, step) {
  if (type === "farm") {
    if (step.kind === "spec") return { cash: SPECIALIZE_COST, requires: SPECIALIZE_REQUIRES, label: "✨ Specialization", prereq: null };
    const g = GEAR[step.id];
    return { cash: g?.upgradeCost ?? 0, requires: g?.upgradeRequires ?? null, label: `${g?.emoji ?? ""} ${g?.name ?? step.id}`.trim(), prereq: null };
  }
  if (type === "market") {
    if (step.kind === "standing") return { cash: MARKET_WORKER_STANDING_ORDER_COST, requires: null, label: "🔄 Standing Order", prereq: null };
    const g = MARKET_WORKER_GEAR[step.id];
    return { cash: g?.upgradeCost ?? 0, requires: g?.upgradeRequires ?? null, label: `${g?.emoji ?? ""} ${g?.name ?? step.id}`.trim(), prereq: null };
  }
  const u = upgradeTable(type)[step.id];
  return { cash: u?.cost ?? 0, requires: u?.upgradeRequires ?? null, label: `${u?.emoji ?? ""} ${u?.name ?? step.id}`.trim(), prereq: u?.requires ?? null };
}

// ─── Levels ───────────────────────────────────────────────────────────────────

export function getTrainingMaxLevel(type) {
  return TRAINING_HALLS[type]?.tiers.length ?? 0;
}

export function getTrainingLevel(state, type) {
  const max = getTrainingMaxLevel(type);
  const stored = state.town?.training?.[type];
  if (stored != null) return Math.max(0, Math.min(max, stored));
  // Legacy saves: Farmers / Fishermen's Hall levels were retain levels — carry them over as training
  if (type === "farm") {
    const h = state.town?.buildings?.farmers_hall;
    return h?.built ? Math.min(max, h.level ?? 1) : 0;
  }
  if (type === "fisher") {
    const h = state.town?.buildings?.fishermens_hall;
    return h?.built ? Math.min(max, h.level ?? 1) : 0;
  }
  return 0;
}

export function getFarmTrainingSpec(state) {
  const s = state.town?.trainingFarmSpec;
  return s && SPECIALIZATIONS[s] && s !== "none" ? s : "harvester";
}

export function setFarmTrainingSpec(state, specId) {
  if (!SPECIALIZATIONS[specId] || specId === "none") return state;
  const next = deepCloneState(state);
  next.town.trainingFarmSpec = specId;
  return next;
}

// Is the hall that hosts this training track available?
export function getTrainingHallAccess(state, type) {
  const b = state.town?.buildings ?? {};
  const th = getTownHallLevel(state);
  if (type === "farm") {
    const gate = TOWN_HALL_BUILDING_GATES.farmers_hall ?? 1;
    return th >= gate ? { ok: true } : { ok: false, reason: `Requires Town Hall level ${gate}` };
  }
  if (type === "fisher") {
    const gate = TOWN_HALL_BUILDING_GATES.fishermens_hall ?? 1;
    return th >= gate ? { ok: true } : { ok: false, reason: `Requires Town Hall level ${gate}` };
  }
  const hallKey = { kitchen: "kitchen_hall", market: "market_hall", barn: "barn_hall", forge: "forge_hall" }[type];
  if (!hallKey) return { ok: false, reason: "Unknown hall" };
  return b[hallKey]?.built ? { ok: true } : { ok: false, reason: `Build the ${TRAINING_HALLS[type].name} first` };
}

// Steps of one tier with their labels and any missing research
export function getTrainingTierInfo(state, type) {
  const def = TRAINING_HALLS[type];
  if (!def) return [];
  const level = getTrainingLevel(state, type);
  return def.tiers.map((steps, i) => {
    const missingResearch = [];
    for (const step of steps) {
      const gate = RESEARCH_GATES[type]?.[step.id];
      if (gate && !hasSchoolResearch(state, gate)) missingResearch.push(SCHOOL_RESEARCH[gate]?.name ?? gate);
    }
    return {
      level: i + 1,
      labels: steps.map((s) => stepInfo(type, s).label),
      owned: i < level,
      missingResearch,
    };
  });
}

// Cost to go from currentLevel → currentLevel + 1 (null at max)
export function getTrainingCost(type, currentLevel) {
  const def = TRAINING_HALLS[type];
  if (!def || currentLevel >= def.tiers.length) return null;
  let cash = 0;
  const mats = {};
  for (const step of def.tiers.slice(0, currentLevel + 1).flat()) {
    const info = stepInfo(type, step);
    cash += info.cash;
    for (const [k, v] of Object.entries(info.requires ?? {})) mats[k] = (mats[k] ?? 0) + v;
  }
  const requires = Object.fromEntries(Object.entries(mats).map(([k, v]) => [k, Math.ceil(v * def.matMult)]));
  return { cash: Math.round((cash * def.priceMult) / 100) * 100, requires };
}

export function canBuyTrainingLevel(state, type) {
  const def = TRAINING_HALLS[type];
  if (!def) return { ok: false, reason: "Unknown hall" };
  const access = getTrainingHallAccess(state, type);
  if (!access.ok) return access;
  const level = getTrainingLevel(state, type);
  if (level >= def.tiers.length) return { ok: false, reason: "Training is maxed" };
  const tier = getTrainingTierInfo(state, type)[level];
  if (tier.missingResearch.length > 0) return { ok: false, reason: `Needs School research: ${tier.missingResearch.join(", ")}` };
  const cost = getTrainingCost(type, level);
  if ((state.cash ?? 0) < cost.cash) return { ok: false, reason: `Need $${cost.cash.toLocaleString()}` };
  if (!canAffordUpgradeMaterials(state, cost.requires)) return { ok: false, reason: "Not enough materials" };
  return { ok: true };
}

export function buyTrainingLevel(state, type) {
  if (!canBuyTrainingLevel(state, type).ok) return state;
  const level = getTrainingLevel(state, type);
  const cost = getTrainingCost(type, level);
  const next = deepCloneState(state);
  next.cash -= cost.cash;
  consumeUpgradeMaterials(next, cost.requires);
  // First write: lock in every type's current level (keeps legacy farm/fisher levels)
  const training = {};
  for (const t of Object.keys(TRAINING_HALLS)) training[t] = getTrainingLevel(state, t);
  training[type] = level + 1;
  next.town.training = training;
  // Farmers / Fishermen's Hall buildings exist only as training halls now — keep them in sync
  if (!next.town.buildings) next.town.buildings = {};
  if (type === "farm") next.town.buildings.farmers_hall = { built: true, level: level + 1 };
  if (type === "fisher") next.town.buildings.fishermens_hall = { built: true, level: level + 1 };
  return next;
}

// ─── Applying training to a worker ────────────────────────────────────────────
// `state` must already be a clone; `worker` is mutated in place.

function applyTrainingSteps(state, type, worker, level) {
  const def = TRAINING_HALLS[type];
  if (!def || level <= 0) return;
  const skipped = new Set();
  for (const step of def.tiers.slice(0, level).flat()) {
    const gate = RESEARCH_GATES[type]?.[step.id];
    const info = stepInfo(type, step);
    if ((gate && !hasSchoolResearch(state, gate)) || (info.prereq && skipped.has(info.prereq))) {
      skipped.add(step.id);
      continue;
    }
    if (type === "farm") {
      if (step.kind === "spec") {
        if ((worker.specialization ?? "none") === "none") { worker.specialization = getFarmTrainingSpec(state); worker.cycleCount = 0; }
      } else if (GEAR_ORDER.indexOf(step.id) > GEAR_ORDER.indexOf(worker.gear ?? "bare_hands")) {
        worker.gear = step.id;
      }
    } else if (type === "market") {
      if (step.kind === "standing") worker.hasStandingOrder = true;
      else if (MARKET_WORKER_GEAR_ORDER.indexOf(step.id) > MARKET_WORKER_GEAR_ORDER.indexOf(worker.gear ?? "cart")) worker.gear = step.id;
    } else {
      const ups = worker.upgrades ?? [];
      if (!ups.includes(step.id)) worker.upgrades = [...ups, step.id];
      if (type === "kitchen" && step.id === "auto_restart") worker.autoRestartEnabled = true;
      if (type === "forge" && step.id === "forge_auto") worker.autoRestart = true;
    }
  }
}

function newById(prevList, nextList) {
  const prevIds = new Set((prevList ?? []).map((w) => w.id));
  return (nextList ?? []).filter((w) => !prevIds.has(w.id));
}

/**
 * Call after any hire: trains whichever workers of `type` exist in `next` but not in `prev`.
 * Also stamps hiredAt (forge workers never had one, so starvation never fired them).
 */
export function trainNewHires(prev, next, type) {
  if (!next || next === prev) return next;
  const level = getTrainingLevel(next, type);
  const out = deepCloneState(next);
  const now = Date.now();
  const touch = (w) => {
    if (!w.hiredAt) w.hiredAt = now;
    if (level > 0) { applyTrainingSteps(out, type, w, level); w.trainedLevel = level; }
  };

  if (type === "farm") newById(prev.workers, out.workers).forEach(touch);
  else if (type === "kitchen") newById(prev.kitchenWorkers, out.kitchenWorkers).forEach(touch);
  else if (type === "market") newById(prev.marketWorkers, out.marketWorkers).forEach(touch);
  else if (type === "forge") newById(prev.forgeWorkers, out.forgeWorkers).forEach(touch);
  else if (type === "barn") {
    // Barn workers live in two places (root list + their barn instance) — keep both copies identical
    for (const w of newById(prev.barnWorkers, out.barnWorkers)) {
      touch(w);
      for (const inst of out.barnInstances ?? []) {
        const copy = (inst.barnWorkers ?? []).find((iw) => iw.id === w.id);
        if (copy) { copy.upgrades = [...(w.upgrades ?? [])]; copy.hiredAt = w.hiredAt; copy.trainedLevel = w.trainedLevel; }
      }
    }
  } else if (type === "fisher") {
    // Fishers have no ids — new ones are appended to their body's list
    for (const [bodyId, body] of Object.entries(out.fishing?.bodies ?? {})) {
      const prevLen = (prev.fishing?.bodies?.[bodyId]?.workers ?? []).length;
      (body?.workers ?? []).slice(prevLen).forEach(touch);
    }
  }
  return out;
}

// ─── Roster blueprint ─────────────────────────────────────────────────────────

export function snapshotRoster(state) {
  return {
    season: state.season ?? 1,
    takenAt: Date.now(),
    farm: (state.farms ?? [])
      .map((f) => ({
        farmId: f.id,
        crop: f.crop,
        specs: (state.workers ?? []).filter((w) => w.farmId === f.id).map((w) => w.specialization ?? "none"),
      }))
      .filter((e) => e.specs.length > 0),
    kitchen: (state.kitchenWorkers ?? []).map((w) => ({ recipeId: w.recipeId ?? null })),
    market: (state.marketWorkers ?? []).map((w) => ({ standingOrder: w.standingOrder ?? null })),
    barn: (state.barnInstances ?? [])
      .map((i) => ({
        instanceId: i.id,
        animalType: BARN_BUILDINGS[i.buildingType]?.animalType ?? null,
        count: (i.barnWorkers ?? []).length,
      }))
      .filter((e) => e.count > 0),
    fisher: Object.entries(state.fishing?.bodies ?? {})
      .map(([bodyId, b]) => ({
        bodyId,
        workers: (b?.workers ?? []).filter((w) => w?.hired).map((w) => ({ bait: w.assignedBait ?? null, allowedFish: w.allowedFish ?? null })),
      }))
      .filter((e) => e.workers.length > 0),
    forge: (state.forgeWorkers ?? []).map((w) => ({ recipeId: w.lastRecipeId ?? w.recipeId ?? null })),
  };
}

export function saveRosterBlueprint(state) {
  return { ...state, lastRoster: snapshotRoster(state) };
}

// { want, have } for one type against the saved blueprint, or null if there is no blueprint
export function getRosterStatus(state, type) {
  const snap = state.lastRoster;
  if (!snap) return null;
  let want = 0, have = 0;
  if (type === "farm") {
    const farmIds = new Set((state.farms ?? []).map((f) => f.id));
    for (const e of snap.farm ?? []) {
      if (!farmIds.has(e.farmId)) continue;
      const cur = (state.workers ?? []).filter((w) => w.farmId === e.farmId).length;
      want += e.specs.length;
      have += Math.min(e.specs.length, cur);
    }
  } else if (type === "kitchen" || type === "market" || type === "forge") {
    const list = type === "kitchen" ? state.kitchenWorkers : type === "market" ? state.marketWorkers : state.forgeWorkers;
    want = (snap[type] ?? []).length;
    have = Math.min(want, (list ?? []).length);
  } else if (type === "barn") {
    for (const e of snap.barn ?? []) {
      const inst = (state.barnInstances ?? []).find((i) => i.id === e.instanceId);
      if (!inst) continue;
      want += e.count;
      have += Math.min(e.count, (inst.barnWorkers ?? []).length);
    }
  } else if (type === "fisher") {
    for (const e of snap.fisher ?? []) {
      const body = state.fishing?.bodies?.[e.bodyId];
      if (!body?.unlocked) continue;
      want += e.workers.length;
      have += Math.min(e.workers.length, (body.workers ?? []).filter((w) => w?.hired).length);
    }
  }
  return { want, have };
}

function stopReason(state, type, ctx = {}) {
  if (isAtWorkerCap(state)) return "town is full — build more homes";
  if (type === "farm") return "not enough crops to hire";
  if (type === "kitchen") return (state.kitchenWorkers ?? []).length >= getMaxKitchenWorkers(state) ? "Kitchen Hall worker cap" : "not enough cash";
  if (type === "market") return (state.marketWorkers ?? []).length >= getMaxMarketWorkers(state) ? "Market Hall worker cap" : "not enough cash";
  if (type === "forge") return (state.forgeWorkers ?? []).length >= getMaxForgeWorkers(state) ? "Forge Hall smith cap" : "not enough cash";
  if (type === "barn") {
    const inst = (state.barnInstances ?? []).find((i) => i.id === ctx.instanceId);
    return inst && (inst.barnWorkers ?? []).length >= getBarnInstanceWorkerSlots(state, ctx.instanceId) ? "Barn Hall worker cap" : "not enough cash";
  }
  if (type === "fisher") return "fishing spot full or not enough cash";
  return "couldn't hire";
}

/**
 * Re-hire one worker type up to last season's count. Returns
 * { state, type, hired, restored, missing, reason }.
 * Also restores recipes / standing orders / bait on workers you already have.
 */
export function rebuyRoster(state, type) {
  const snap = state.lastRoster;
  const result = { state, type, hired: 0, restored: 0, missing: 0, reason: null };
  if (!snap) { result.reason = "no crew blueprint yet"; return result; }
  let s = state;
  let stopped = false;

  const tryHire = (hireFn, ctx) => {
    if (stopped) return false;
    const n = hireFn(s);
    if (n === s) { stopped = true; result.reason = stopReason(s, type, ctx); return false; }
    s = trainNewHires(s, n, type);
    result.hired += 1;
    return true;
  };

  if (type === "farm") {
    const trainedSpec = getTrainingLevel(s, "farm") >= 3;
    for (const e of snap.farm ?? []) {
      if (!(s.farms ?? []).some((f) => f.id === e.farmId)) continue;
      const cur = (s.workers ?? []).filter((w) => w.farmId === e.farmId).length;
      for (let i = cur; i < e.specs.length; i++) {
        if (!tryHire((st) => hireWorker(st, e.farmId))) { result.missing += e.specs.length - i; break; }
        const wanted = e.specs[i];
        if (trainedSpec && wanted && wanted !== "none" && SPECIALIZATIONS[wanted]) {
          const onFarm = s.workers.filter((w) => w.farmId === e.farmId);
          const w = onFarm[onFarm.length - 1];
          if (w) { w.specialization = wanted; w.cycleCount = 0; } // s is a fresh clone from trainNewHires
        }
      }
    }
  } else if (type === "kitchen") {
    const plan = snap.kitchen ?? [];
    const cur = (s.kitchenWorkers ?? []).length;
    for (let i = cur; i < plan.length; i++) {
      if (!tryHire((st) => hireKitchenWorker(st))) { result.missing += plan.length - i; break; }
    }
    // Restart idle cooks (new and kept) on last season's recipes
    for (let i = 0; i < Math.min(plan.length, (s.kitchenWorkers ?? []).length); i++) {
      const w = s.kitchenWorkers[i];
      const recipeId = plan[i]?.recipeId;
      if (!recipeId || w.recipeId) continue;
      const n = assignKitchenWorkerRecipe(s, w.id, recipeId);
      if (n !== s) { s = n; result.restored += 1; }
    }
  } else if (type === "market") {
    const plan = snap.market ?? [];
    const cur = (s.marketWorkers ?? []).length;
    for (let i = cur; i < plan.length; i++) {
      if (!tryHire((st) => hireMarketWorker(st))) { result.missing += plan.length - i; break; }
    }
    for (let i = 0; i < Math.min(plan.length, (s.marketWorkers ?? []).length); i++) {
      const w = s.marketWorkers[i];
      const order = plan[i]?.standingOrder;
      if (!order || !w.hasStandingOrder || w.standingOrder) continue;
      s = setMarketWorkerStandingOrder(s, w.id, order);
      result.restored += 1;
    }
  } else if (type === "barn") {
    for (const e of snap.barn ?? []) {
      const inst = (s.barnInstances ?? []).find((i) => i.id === e.instanceId);
      if (!inst) continue;
      const animalType = e.animalType ?? BARN_BUILDINGS[inst.buildingType]?.animalType;
      const cur = (inst.barnWorkers ?? []).length;
      for (let i = cur; i < e.count; i++) {
        if (!tryHire((st) => hireBarnWorker(st, animalType, e.instanceId), { instanceId: e.instanceId })) { result.missing += e.count - i; break; }
      }
    }
  } else if (type === "fisher") {
    for (const e of snap.fisher ?? []) {
      if (!s.fishing?.bodies?.[e.bodyId]?.unlocked) continue;
      const cur = (s.fishing.bodies[e.bodyId].workers ?? []).length;
      for (let i = cur; i < e.workers.length; i++) {
        if (!tryHire((st) => hireFishingWorker(st, e.bodyId))) { result.missing += e.workers.length - i; break; }
      }
      const list = s.fishing.bodies[e.bodyId].workers ?? [];
      for (let i = 0; i < Math.min(e.workers.length, list.length); i++) {
        const plan = e.workers[i];
        if (plan?.bait && !list[i].assignedBait) {
          s = setFishingWorkerBait(s, e.bodyId, plan.bait, i);
          result.restored += 1;
        }
        if (plan?.allowedFish && !s.fishing.bodies[e.bodyId].workers[i].allowedFish) {
          if (s === state) s = deepCloneState(s);
          s.fishing.bodies[e.bodyId].workers[i].allowedFish = [...plan.allowedFish];
        }
      }
    }
  } else if (type === "forge") {
    const plan = snap.forge ?? [];
    const cur = (s.forgeWorkers ?? []).length;
    for (let i = cur; i < plan.length; i++) {
      if (!tryHire((st) => hireForgeWorker(st))) { result.missing += plan.length - i; break; }
    }
    for (let i = 0; i < Math.min(plan.length, (s.forgeWorkers ?? []).length); i++) {
      const w = s.forgeWorkers[i];
      const recipeId = plan[i]?.recipeId;
      if (!recipeId || w.recipeId) continue;
      const n = assignForgeWorkerRecipe(s, w.id, recipeId);
      if (n !== s) { s = n; result.restored += 1; }
    }
  }

  result.state = s;
  return result;
}

export function rebuyAllRosters(state) {
  let s = state;
  const total = { state, hired: 0, restored: 0, missing: 0, reasons: [] };
  if (!state.lastRoster) { total.reasons.push("no crew blueprint yet"); return total; }
  for (const type of TRAINING_TYPE_ORDER) {
    const r = rebuyRoster(s, type);
    s = r.state;
    total.hired += r.hired;
    total.restored += r.restored;
    total.missing += r.missing;
    if (r.reason && !total.reasons.includes(r.reason)) total.reasons.push(r.reason);
  }
  total.state = s;
  return total;
}

export function describeRebuyResult(r) {
  if (!r) return "";
  const reasons = r.reasons ?? (r.reason ? [r.reason] : []);
  if (r.hired === 0 && r.restored === 0) {
    return reasons.length > 0 ? `Nothing to rebuy — ${reasons.join(", ")}` : "Crew already complete ✓";
  }
  let msg = `👷 Rehired ${r.hired} worker${r.hired !== 1 ? "s" : ""}`;
  if (r.restored > 0) msg += ` · restored ${r.restored} job${r.restored !== 1 ? "s" : ""}`;
  if (r.missing > 0) msg += ` · ${r.missing} short (${reasons.join(", ")})`;
  return msg;
}