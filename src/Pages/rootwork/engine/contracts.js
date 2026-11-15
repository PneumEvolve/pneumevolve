// src/Pages/rootwork/engine/contracts.js — Contracts board, Charter Seals, Seal Shop
//
// State shape (all optional — missing = defaults):
//   state.contracts = {
//     slots:   [contract | null, ...],   // one entry per board slot
//     refill:  [seconds, ...],           // countdown until an empty slot gets a new contract
//     seals:   12,                       // 🏅 Charter Seals to spend
//     sealsEarned: 40,                   // lifetime, for stats
//     completed: 18,                     // lifetime contracts delivered
//     shop:    { extra_slot: 1, bonus_prestige: 0, ... },  // times each shop item was bought
//     boosts:  [{ key, value, label, emoji, secondsLeft }],
//     world:   { last: { iron_ore, lumber, rare_gem }, gain: { ... } },  // smoothed world-resource income
//   }
// A contract: { id, tier, stretch, category, requester, requesterEmoji,
//               items: [{ key, name, emoji, source, amount }], seals, cash, secondsLeft, totalSeconds }
// Contracts, seals, shop purchases and boosts all survive season prestige.
//
// SMART CONTRACTS: getContractItemRates() works out how much of each item you are making per
// second RIGHT NOW from your actual workers (farms, cooks, barns, fishers, smiths) and your
// measured world-resource income. Contracts only ask for things with a real rate, sized in
// minutes of that rate (see CONTRACT_TIERS in contractsData.js).

import {
  TRADE_TOWNS, CROPS, PROCESSING_RECIPES, BAIT_RECIPES, FORGE_RECIPES,
  FISHING_CATCH_RATES, FISHING_BAIT_BONUS, FISHING_BODY_ORDER, ROAD_TIERS,
  BARN_BUILDINGS, ANIMAL_TYPES, PLOT_UPGRADE_BONUS_YIELD,
} from "../gameConstants";
import {
  CONTRACT_SLOTS_BASE, CONTRACT_SLOTS_MAX, CONTRACT_REFILL_SECONDS, CONTRACT_SEASON_SCALE,
  CONTRACT_CROP_WAREHOUSE_FRACTION, CONTRACT_BOOST_SECONDS, CONTRACT_BOOST_MAX_SECONDS,
  CONTRACT_TIERS, CONTRACT_TIER_ORDER, CONTRACT_REQUESTERS, CONTRACT_ITEMS, CONTRACT_BOOSTS,
  SEAL_SHOP_ITEMS, SEAL_SHOP_ORDER, BLUEPRINT_FILL_FRACTION,
  CONTRACT_MIN_FRACTION_OF_BASE, CONTRACT_STOCK_BUFFER_SECONDS, CONTRACT_WORLD_SMOOTHING_SECONDS,
  CONTRACT_WORLD_KEYS, CONTRACT_STRETCH_CHANCE, CONTRACT_STRETCH_AMOUNT_MULT,
} from "./contractsData.js";
import { getGlobalBonus, getBoostBonus } from "./bonuses.js";

export { getBoostBonus as getContractBoostBonus };
import { getProjectStock, takeProjectStock, grantProjectProgress, isProjectUnlocked } from "./projects.js";
import { getWarehouseCropCap, getTownSatisfactionMultiplier, getSchoolGrowBonus } from "./town.js";
import { deepCloneState, getFarmAverageGrowTime } from "./save.js";
import { getWorkerHarvestRate, getFarmBonusYield, getTreasuryGrowBonus, getBankPriceBonus, getPrestigeSkillCount, hasPrestigeSkill } from "./core.js";
import { getFishMealGrowBonus, getFishingWorkerInterval, getFishingWorkerHaul, getFishingWorkerGearTier } from "./setup.js";
import { getMillhavenGrowBonus, getThornwickGrowBonus, getAshportFishBonus } from "./roads.js";
import { isRoadActive } from "./roadsV2.js";
import { getBarnInstanceSupplyRate, getBarnInstanceDemandRate } from "./season.js";
import { getSellRate } from "./workers.js";

export {
  CONTRACT_SLOTS_BASE, CONTRACT_SLOTS_MAX, CONTRACT_REFILL_SECONDS, CONTRACT_TIERS, CONTRACT_TIER_ORDER,
  CONTRACT_ITEMS, CONTRACT_BOOSTS, SEAL_SHOP_ITEMS, SEAL_SHOP_ORDER, BLUEPRINT_FILL_FRACTION,
};

// ─── Basics ───────────────────────────────────────────────────────────────────

export function isContractsUnlocked(state) {
  return !!state.town?.buildings?.market_hall?.built;
}

export function getSeals(state) {
  return state.contracts?.seals ?? 0;
}

export function getContractSlotCount(state) {
  const extra = state.contracts?.shop?.extra_slot ?? 0;
  return Math.min(CONTRACT_SLOTS_MAX, CONTRACT_SLOTS_BASE + extra);
}

export function getActiveContractBoosts(state) {
  return (state.contracts?.boosts ?? []).filter((b) => (b.secondsLeft ?? 0) > 0);
}

function roundNice(n) {
  if (n < 20) return Math.max(1, Math.round(n));
  if (n < 100) return Math.round(n / 5) * 5;
  if (n < 1000) return Math.round(n / 10) * 10;
  return Math.round(n / 50) * 50;
}

function contractId() {
  return `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Production rates (items per second, right now) ──────────────────────────

const add = (map, key, v) => { if (v > 0) map[key] = (map[key] ?? 0) + v; };

// Raw crops per second from each farm: harvests are capped by whichever is slower —
// your workers, or how fast the plots grow. Yield bonuses are approximated.
function cropRates(state, sat) {
  const out = {};
  const growArgs = [
    state.feastBonusPercent ?? 0,
    (state.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(state) + (getMillhavenGrowBonus(state) + getThornwickGrowBonus(state)) * 100,
    getTreasuryGrowBonus(state),
    getFishMealGrowBonus(state),
  ];
  const yieldMult = (1 + getGlobalBonus(state, "cropYield")) * (1 + 0.15 * getPrestigeSkillCount(state, "bumper_crop"));
  for (const farm of state.farms ?? []) {
    const crop = CROPS[farm.crop];
    if (!crop) continue;
    const workers = (state.workers ?? []).filter((w) => w.farmId === farm.id);
    if (workers.length === 0) continue;
    const supply = workers.reduce((s, w) => s + getWorkerHarvestRate(w), 0) * sat;
    const grow = getFarmAverageGrowTime(farm, state.workers ?? [], farm.crop, ...growArgs);
    const plots = farm.unlockedPlots ?? 0;
    const harvestsPerSec = Math.min(supply, plots / Math.max(3, grow));
    const upgradedShare = plots > 0 ? farm.plots.slice(0, plots).filter((p) => p.upgraded).length / plots : 0;
    const perHarvest = (crop.workerYield + getFarmBonusYield(state, farm.id) + upgradedShare * PLOT_UPGRADE_BONUS_YIELD) * yieldMult;
    add(out, farm.crop, harvestsPerSec * perHarvest);
  }
  return out;
}

// Eggs / milk / wool per second — only what barn workers collect (manual collecting doesn't count)
function barnRates(state) {
  const out = {};
  for (const inst of state.barnInstances ?? []) {
    const type = ANIMAL_TYPES[BARN_BUILDINGS[inst.buildingType]?.animalType];
    if (!type || (inst.animals ?? []).length === 0 || (inst.barnWorkers ?? []).length === 0) continue;
    const supply = getBarnInstanceSupplyRate(inst, state);
    const demand = getBarnInstanceDemandRate(inst, state) * 0.75; // peak assumes 100% mood — use a typical day
    add(out, type.produces, Math.min(supply, demand));
  }
  return out;
}

// Fish per second from fishing workers, split by catch odds for their rod, bait and water
function fishRates(state, sat) {
  const out = {};
  const fishSpeed = Math.max(0.1, 1 + getAshportFishBonus(state) + getGlobalBonus(state, "fishingSpeed"));
  const noMinnows = hasPrestigeSkill(state, "deep_waters");
  const selective = hasPrestigeSkill(state, "selective_haul");
  const names = ["minnow", "bass", "perch", "rare"];
  for (const bodyId of FISHING_BODY_ORDER) {
    const body = state.fishing?.bodies?.[bodyId];
    if (!body?.unlocked) continue;
    for (const w of body.workers ?? []) {
      if (!w?.hired) continue;
      const interval = Math.max(1, Math.round(getFishingWorkerInterval(w, state) / fishSpeed));
      const fishPerSec = (getFishingWorkerHaul(w) * sat) / interval;
      const rates = [...(FISHING_CATCH_RATES[bodyId]?.[getFishingWorkerGearTier(w)] ?? [80, 20, 0, 0])];
      const bait = w.assignedBait && (state.bait?.[w.assignedBait] ?? 0) > 0 ? FISHING_BAIT_BONUS[w.assignedBait] : null;
      if (bait) {
        let left = bait.rarePct;
        const a = Math.min(left, rates[0]); rates[0] -= a; rates[3] += a; left -= a;
        const b = Math.min(left, rates[1]); rates[1] -= b; rates[3] += b;
      }
      if (noMinnows) { rates[1] += rates[0]; rates[0] = 0; }
      const allowed = selective ? w.allowedFish ?? null : null;
      names.forEach((fish, i) => {
        if (allowed && !allowed.includes(fish)) return;
        add(out, fish, fishPerSec * (rates[i] / 100));
      });
    }
  }
  return out;
}

// Cooks: what each one makes and eats per second (only cooks that are busy or auto-restart)
function kitchenFlows(state, sat) {
  const inputScale = hasPrestigeSkill(state, "efficient_process") ? 0.75 : 1;
  const flows = [];
  for (const w of state.kitchenWorkers ?? []) {
    if (!w.recipeId) continue;
    const autoOn = (w.upgrades ?? []).includes("auto_restart") && (w.autoRestartEnabled ?? true);
    if (!w.busy && !autoOn) continue;
    const recipe = PROCESSING_RECIPES[w.recipeId] ?? BAIT_RECIPES[w.recipeId];
    if (!recipe) continue;
    const runSeconds = Math.max(1, w.totalSeconds || recipe.seconds);
    const batch = Math.max(1, w.batchSize ?? 1);
    flows.push({
      input: recipe.inputCrop,
      inPerSec: (recipe.inputAmount * batch * inputScale * sat) / runSeconds,
      output: recipe.isBait ? null : recipe.outputGood,
      outPerSec: (recipe.outputAmount * batch * sat) / runSeconds,
    });
  }
  return flows;
}

function inputStock(state, key) {
  if (key in (state.crops ?? {})) return state.crops[key] ?? 0;
  if (key in (state.fishing?.fish ?? {})) return state.fishing.fish[key] ?? 0;
  return state.animalGoods?.[key] ?? 0;
}

// Smiths making components (iron fittings, crates, fine tools)
function forgeRates(state, sat) {
  const out = {};
  const speed = sat * Math.max(0.1, 1 + getGlobalBonus(state, "forgeSpeed"));
  for (const w of state.forgeWorkers ?? []) {
    const recipeId = w.recipeId ?? (w.autoRestart ? w.lastRecipeId : null);
    const recipe = recipeId ? FORGE_RECIPES[recipeId] : null;
    if (!recipe || recipe.category !== "component") continue;
    if (!w.busy && !w.autoRestart) continue;
    add(out, recipe.output.resourceKey, speed / Math.max(1, w.totalSeconds || recipe.seconds));
  }
  return out;
}

function roadUpkeep(state) {
  const up = { iron_ore: 0, lumber: 0 };
  for (const rt of ROAD_TIERS) {
    if (!isRoadActive(state, rt.level)) continue;
    up.iron_ore += rt.upkeepPerTick.iron_ore ?? 0;
    up.lumber += rt.upkeepPerTick.lumber ?? 0;
  }
  return up;
}

/**
 * Items per second you're producing right now, keyed by contract item key.
 * Raw goods (crops, eggs/milk/wool, fish) are what's LEFT after your cooks take their share.
 */
export function getContractItemRates(state) {
  const sat = getTownSatisfactionMultiplier(state);
  const gross = { ...cropRates(state, sat) };
  for (const [k, v] of Object.entries(barnRates(state))) add(gross, k, v);
  for (const [k, v] of Object.entries(fishRates(state, sat))) add(gross, k, v);

  // How much each input the cooks want vs. what's actually available (production + a stock buffer)
  const flows = kitchenFlows(state, sat);
  const demand = {};
  for (const f of flows) add(demand, f.input, f.inPerSec);
  const scale = {};
  for (const [input, want] of Object.entries(demand)) {
    const avail = (gross[input] ?? 0) + inputStock(state, input) / CONTRACT_STOCK_BUFFER_SECONDS;
    scale[input] = want > 0 ? Math.min(1, avail / want) : 1;
  }

  const rates = {};
  for (const [k, v] of Object.entries(gross)) {
    const used = Math.min(demand[k] ?? 0, (demand[k] ?? 0) * (scale[k] ?? 1));
    add(rates, k, v - used);
  }
  for (const f of flows) if (f.output) add(rates, f.output, f.outPerSec * (scale[f.input] ?? 1));
  for (const [k, v] of Object.entries(forgeRates(state, sat))) add(rates, k, v);

  // World resources: smoothed measured income, minus what your roads eat
  const up = roadUpkeep(state);
  for (const key of CONTRACT_WORLD_KEYS) {
    const gain = state.contracts?.world?.gain?.[key] ?? 0;
    add(rates, key, gain - (up[key] ?? 0));
  }
  return rates;
}

// ─── What can be asked for ────────────────────────────────────────────────────

// Kept for older callers: "is this being produced right now?"
export function isContractItemAvailable(state, item, rates = null) {
  return ((rates ?? getContractItemRates(state))[item.key] ?? 0) > 0;
}

function getRequester(state, category) {
  const req = CONTRACT_REQUESTERS[category] ?? CONTRACT_REQUESTERS.crops;
  const roadLevel = state.roads?.level ?? 0;
  const townRoad = TRADE_TOWNS?.[req.town]?.roadLevel ?? 99;
  return { name: roadLevel >= townRoad ? req.townName : req.local, emoji: req.emoji };
}

function pickWeighted(entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function capCrops(state, item, amount) {
  if (item.source !== "crops") return amount;
  return Math.min(amount, getWarehouseCropCap(state) * CONTRACT_CROP_WAREHOUSE_FRACTION);
}

function rateAmount(state, item, rate, minutes) {
  return roundNice(capCrops(state, item, rate * minutes * 60));
}

// Items with enough real production to fill at least a modest Easy ask
function eligibleItems(state, rates) {
  const easy = CONTRACT_TIERS.easy;
  return Object.values(CONTRACT_ITEMS).filter((item) => {
    const rate = rates[item.key] ?? 0;
    if (rate <= 0) return false;
    const floor = Math.max(1, item.base * CONTRACT_MIN_FRACTION_OF_BASE);
    return rateAmount(state, item, rate, easy.minutes) >= floor;
  });
}

// Stretch: you own the building/input for it, but nothing is making it yet
function isStretchCandidate(state, item, rates) {
  if (!item.stretch || (rates[item.key] ?? 0) > 0) return false;
  const [kind, arg] = item.stretch.split(":");
  const hasKitchen = (state.kitchenWorkers ?? []).length > 0 || !!state.town?.buildings?.kitchen_hall?.built;
  if (kind === "kitchen_crop") return hasKitchen && (state.farms ?? []).some((f) => f.crop === arg);
  if (kind === "kitchen_input") return hasKitchen && (rates[arg] ?? 0) > 0;
  if (kind === "barn_idle") return (state.barnInstances ?? []).some((i) => i.buildingType === arg && (i.animals ?? []).length > 0);
  if (kind === "water_idle") return !!state.fishing?.bodies?.[arg]?.unlocked;
  if (kind === "forge_idle") return !!state.forgeBuilt;
  return false;
}

function marketValue(state, key, amount) {
  try {
    const rate = getSellRate(key, state.prestigeBonuses, getBankPriceBonus(state), state) ?? 0;
    return amount * rate * Math.max(0, 1 + getGlobalBonus(state, "sellPrice"));
  } catch {
    return 0;
  }
}

function buildContract(state, tier, chosen, amounts, stretch) {
  const first = chosen[0];
  const requester = getRequester(state, first.category);
  const items = chosen.map((item, i) => ({
    key: item.key, name: item.name, emoji: item.emoji, source: item.source, amount: amounts[i],
  }));
  const value = items.reduce((s, it) => s + marketValue(state, it.key, it.amount), 0);
  return {
    id: contractId(),
    tier: tier.id,
    stretch: !!stretch,
    category: first.category,
    requester: requester.name,
    requesterEmoji: requester.emoji,
    items,
    seals: tier.seals,
    cash: Math.round(value * tier.cashPremium),
    secondsLeft: tier.seconds,
    totalSeconds: tier.seconds,
  };
}

// Builds one contract from what you're producing right now, or null if nothing qualifies yet
export function generateContract(state, rates = null) {
  const r = rates ?? getContractItemRates(state);
  const onBoard = (state.contracts?.slots ?? []).filter(Boolean);
  const keysOnBoard = new Set(onBoard.flatMap((ct) => ct.items.map((i) => i.key)));

  // Stretch contract — rare, never more than one on the board
  if (!onBoard.some((ct) => ct.stretch) && Math.random() < CONTRACT_STRETCH_CHANCE) {
    const candidates = Object.values(CONTRACT_ITEMS).filter((i) => isStretchCandidate(state, i, r) && !keysOnBoard.has(i.key));
    if (candidates.length > 0) {
      const item = candidates[Math.floor(Math.random() * candidates.length)];
      const season = state.season ?? 1;
      const amount = roundNice(capCrops(state, item, item.base * (1 + CONTRACT_SEASON_SCALE * (season - 1)) * CONTRACT_STRETCH_AMOUNT_MULT));
      return buildContract(state, CONTRACT_TIERS.stretch, [item], [amount], true);
    }
  }

  let available = eligibleItems(state, r);
  if (available.length === 0) return null;
  // Prefer things that aren't already on another contract, as long as that leaves something to ask for
  const fresh = available.filter((i) => !keysOnBoard.has(i.key));
  if (fresh.length > 0) available = fresh;

  const tierId = pickWeighted(
    CONTRACT_TIER_ORDER
      .filter((id) => CONTRACT_TIERS[id].items <= available.length)
      .map((id) => [id, CONTRACT_TIERS[id].weight])
  );
  const tier = CONTRACT_TIERS[tierId];

  // First item picks the requester; the rest prefer the same category so contracts feel themed
  const pool = [...available];
  const first = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  const chosen = [first];
  while (chosen.length < tier.items && pool.length > 0) {
    const sameCat = pool.filter((i) => i.category === first.category);
    const from = sameCat.length > 0 && Math.random() < 0.6 ? sameCat : pool;
    const pick = from[Math.floor(Math.random() * from.length)];
    pool.splice(pool.indexOf(pick), 1);
    chosen.push(pick);
  }

  const amounts = chosen.map((item) => rateAmount(state, item, r[item.key] ?? 0, tier.minutes));
  return buildContract(state, tier, chosen, amounts, false);
}

// ─── Tick ─────────────────────────────────────────────────────────────────────
// tick() only shallow-clones state, so this always builds a fresh contracts object.

// Smoothed world-resource income. Road upkeep is added back so it doesn't hide real gains;
// getContractItemRates subtracts it again to get what you can actually stockpile.
function trackWorld(state, prev, dt) {
  const wr = state.worldResources ?? {};
  const up = roadUpkeep(state);
  const last = { ...(prev?.last ?? {}) };
  const gain = { ...(prev?.gain ?? {}) };
  const k = Math.min(1, dt / CONTRACT_WORLD_SMOOTHING_SECONDS);
  for (const key of CONTRACT_WORLD_KEYS) {
    const now = wr[key] ?? 0;
    if (last[key] != null) {
      const sample = Math.max(0, (now - last[key]) / dt + (up[key] ?? 0));
      gain[key] = (gain[key] ?? 0) + (sample - (gain[key] ?? 0)) * k;
    }
    last[key] = now;
  }
  return { last, gain };
}

export function tickContracts(state, dt = 1) {
  const c = state.contracts;
  const unlocked = isContractsUnlocked(state);
  if (!c && !unlocked) return state;

  const boosts = (c?.boosts ?? [])
    .map((b) => ({ ...b, secondsLeft: (b.secondsLeft ?? 0) - dt }))
    .filter((b) => b.secondsLeft > 0);

  if (!unlocked) {
    if ((c?.boosts ?? []).length === 0) return state;
    return { ...state, contracts: { ...c, boosts } };
  }

  const world = trackWorld(state, c?.world, dt);
  const slotCount = getContractSlotCount(state);
  const refillSpeed = Math.max(0.1, 1 + getGlobalBonus(state, "contractRefillSpeed"));
  const slots = [];
  const refill = [];
  let rates = null; // only worked out if a slot actually needs a new contract
  for (let i = 0; i < slotCount; i++) {
    const existing = c?.slots?.[i] ?? null;
    if (existing) {
      const secondsLeft = (existing.secondsLeft ?? 0) - dt;
      if (secondsLeft > 0) {
        slots.push({ ...existing, secondsLeft });
        refill.push(0);
      } else {
        slots.push(null);                         // expired
        refill.push(CONTRACT_REFILL_SECONDS);
      }
      continue;
    }
    const wait = (c?.refill?.[i] ?? 0) - dt * refillSpeed;
    if (wait <= 0) {
      const view = { ...state, contracts: { ...(c ?? {}), slots: [...slots, ...(c?.slots ?? []).slice(i + 1)], world } };
      if (!rates) rates = getContractItemRates(view);
      const fresh = generateContract(view, rates);
      slots.push(fresh);
      refill.push(fresh ? 0 : 30);                // nothing to ask for yet — check again in 30s
    } else {
      slots.push(null);
      refill.push(wait);
    }
  }

  return { ...state, contracts: { ...(c ?? {}), slots, refill, boosts, world } };
}

// ─── View for the UI ──────────────────────────────────────────────────────────

function canDeliverContract(state, contract) {
  return contract.items.every((item) => getProjectStock(state, item) >= item.amount);
}

// Pass `rates` (from getContractItemRates) when rendering several contracts so it's worked out once
export function getContractView(state, contract, rates = null) {
  if (!contract) return null;
  const r = rates ?? getContractItemRates(state);
  const items = contract.items.map((item) => {
    const have = getProjectStock(state, item);
    const rate = r[item.key] ?? 0;
    const short = Math.max(0, item.amount - have);
    return {
      ...item,
      have,
      enough: have >= item.amount,
      perMin: rate * 60,
      etaSeconds: short === 0 ? 0 : rate > 0 ? short / rate : null, // null = nothing is making it
    };
  });
  const tier = CONTRACT_TIERS[contract.tier] ?? CONTRACT_TIERS.easy;
  const bonusSeals = Math.round(getGlobalBonus(state, "contractSeals"));
  return {
    ...contract,
    tierDef: tier,
    items,
    canDeliver: items.every((i) => i.enough),
    totalSeals: contract.seals + bonusSeals,
    totalCash: contract.cash ?? 0,
    givesBoost: !!tier.boost,
    stretch: !!contract.stretch,
  };
}

export function getDeliverableContractCount(state) {
  if (!isContractsUnlocked(state)) return 0;
  return (state.contracts?.slots ?? []).filter((ct) => ct && canDeliverContract(state, ct)).length;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Deliver a contract. Returns { state, ok, sealsGained, cashGained, boost } */
export function deliverContract(state, slotIndex) {
  const contract = state.contracts?.slots?.[slotIndex];
  if (!contract) return { state, ok: false };
  if (!canDeliverContract(state, contract)) return { state, ok: false };

  const next = deepCloneState(state);
  for (const item of contract.items) takeProjectStock(next, item, item.amount);

  const c = next.contracts;
  const sealsGained = (contract.seals ?? 0) + Math.round(getGlobalBonus(state, "contractSeals"));
  const cashGained = contract.cash ?? 0;
  c.seals = (c.seals ?? 0) + sealsGained;
  c.sealsEarned = (c.sealsEarned ?? 0) + sealsGained;
  c.completed = (c.completed ?? 0) + 1;
  c.slots[slotIndex] = null;
  if (!c.refill) c.refill = [];
  c.refill[slotIndex] = CONTRACT_REFILL_SECONDS;

  if (cashGained > 0) {
    next.cash = (next.cash ?? 0) + cashGained;
    next.lifetimeCash = (next.lifetimeCash ?? 0) + cashGained;
  }

  let boost = null;
  const tier = CONTRACT_TIERS[contract.tier];
  if (tier?.boost) {
    boost = CONTRACT_BOOSTS[Math.floor(Math.random() * CONTRACT_BOOSTS.length)];
    if (!c.boosts) c.boosts = [];
    const existing = c.boosts.find((b) => b.key === boost.key && b.value === boost.value);
    if (existing) {
      existing.secondsLeft = Math.min(CONTRACT_BOOST_MAX_SECONDS, (existing.secondsLeft ?? 0) + CONTRACT_BOOST_SECONDS);
    } else {
      c.boosts.push({ ...boost, secondsLeft: CONTRACT_BOOST_SECONDS });
    }
  }

  // Season quest counters (questProgress resets every season)
  if (!next.questProgress) next.questProgress = {};
  const qp = next.questProgress;
  qp.contractsCompleted = (qp.contractsCompleted ?? 0) + 1;
  if (contract.tier === "standard" || contract.tier === "rush") qp.contractsStandardPlus = (qp.contractsStandardPlus ?? 0) + 1;
  if (contract.tier === "rush") qp.contractsRush = (qp.contractsRush ?? 0) + 1;
  if (contract.stretch) qp.contractsStretch = (qp.contractsStretch ?? 0) + 1;

  return { state: next, ok: true, sealsGained, cashGained, boost };
}

/** Tear up a contract. The slot refills after the usual wait. */
export function abandonContract(state, slotIndex) {
  if (!state.contracts?.slots?.[slotIndex]) return state;
  const next = deepCloneState(state);
  next.contracts.slots[slotIndex] = null;
  if (!next.contracts.refill) next.contracts.refill = [];
  next.contracts.refill[slotIndex] = CONTRACT_REFILL_SECONDS;
  return next;
}

// ─── Seal Shop ────────────────────────────────────────────────────────────────

export function getSealShopTimesBought(state, itemId) {
  return state.contracts?.shop?.[itemId] ?? 0;
}

export function getSealShopCost(state, itemId) {
  const def = SEAL_SHOP_ITEMS[itemId];
  if (!def) return null;
  return def.cost(getSealShopTimesBought(state, itemId));
}

export function canBuySealShopItem(state, itemId, projectId = null) {
  const def = SEAL_SHOP_ITEMS[itemId];
  if (!def) return { ok: false, reason: "Unknown item" };
  const cost = getSealShopCost(state, itemId);
  if (cost == null) return { ok: false, reason: "Sold out" };
  if (getSeals(state) < cost) return { ok: false, reason: `Need ${cost} 🏅` };
  if (def.needsProject) {
    if (!projectId) return { ok: false, reason: "Pick a project" };
    if (!isProjectUnlocked(state, projectId)) return { ok: false, reason: "Project locked" };
  }
  return { ok: true, cost };
}

/** Returns { state, ok, message } */
export function buySealShopItem(state, itemId, projectId = null) {
  const check = canBuySealShopItem(state, itemId, projectId);
  if (!check.ok) return { state, ok: false, message: check.reason };

  let next = deepCloneState(state);
  let message = "";

  switch (itemId) {
    case "titan_core":
      next.worldResources = { ...(next.worldResources ?? {}) };
      next.worldResources.titan_core = (next.worldResources.titan_core ?? 0) + 1;
      message = "💠 +1 Titan Core";
      break;
    case "mana_crystals":
      next.worldResources = { ...(next.worldResources ?? {}) };
      next.worldResources.mana_crystal = (next.worldResources.mana_crystal ?? 0) + 5;
      message = "🔮 +5 Mana Crystals";
      break;
    case "blueprint": {
      const r = grantProjectProgress(next, projectId, BLUEPRINT_FILL_FRACTION);
      next = r.state;
      message = r.completedStage ? "📐 Blueprint used — stage complete!" : "📐 Blueprint used — 25% added";
      break;
    }
    case "extra_slot":
      message = "📜 New contract slot added";
      break;
    case "bonus_prestige":
      next.prestigePoints = (next.prestigePoints ?? 0) + 1;
      message = "⭐ +1 prestige skill point";
      break;
    default:
      return { state, ok: false, message: "Unknown item" };
  }

  if (!next.contracts) next.contracts = {};
  next.contracts.seals = (next.contracts.seals ?? 0) - check.cost;
  next.contracts.shop = { ...(next.contracts.shop ?? {}) };
  next.contracts.shop[itemId] = (next.contracts.shop[itemId] ?? 0) + 1;
  return { state: next, ok: true, message };
}