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
//   }
// A contract: { id, tier, category, requester, requesterEmoji, items: [{ key, name, emoji, source, amount }],
//               seals, secondsLeft, totalSeconds }
// Contracts, seals, shop purchases and boosts all survive season prestige.

import { TRADE_TOWNS } from "../gameConstants";
import {
  CONTRACT_SLOTS_BASE, CONTRACT_SLOTS_MAX, CONTRACT_REFILL_SECONDS, CONTRACT_SEASON_SCALE,
  CONTRACT_CROP_WAREHOUSE_FRACTION, CONTRACT_BOOST_SECONDS, CONTRACT_BOOST_MAX_SECONDS,
  CONTRACT_TIERS, CONTRACT_TIER_ORDER, CONTRACT_REQUESTERS, CONTRACT_ITEMS, CONTRACT_BOOSTS,
  SEAL_SHOP_ITEMS, SEAL_SHOP_ORDER, BLUEPRINT_FILL_FRACTION,
} from "./contractsData.js";
import { getGlobalBonus, getBoostBonus } from "./bonuses.js";

export { getBoostBonus as getContractBoostBonus };
import { getProjectStock, takeProjectStock, grantProjectProgress, isProjectUnlocked } from "./projects.js";
import { getWarehouseCropCap } from "./town.js";
import { deepCloneState } from "./save.js";

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

// ─── What can be asked for ────────────────────────────────────────────────────

function hasFarm(state, crop) {
  return (state.farms ?? []).some((f) => f.crop === crop);
}
function hasBarn(state, buildingType) {
  return (state.barnInstances ?? []).some((i) => i.buildingType === buildingType && (i.animals ?? []).length > 0);
}
function hasKitchen(state) {
  return (state.kitchenWorkers ?? []).length > 0;
}

export function isContractItemAvailable(state, item) {
  const r = item.requires ?? "";
  if (r.startsWith("farm_")) return hasFarm(state, r.slice(5));
  if (r.startsWith("kitchen_barn_")) return hasKitchen(state) && hasBarn(state, r.slice(13));
  if (r.startsWith("kitchen_")) return hasKitchen(state) && hasFarm(state, r.slice(8));
  if (r.startsWith("barn_")) return hasBarn(state, r.slice(5));
  if (r === "water_pond") return !!state.fishing?.bodies?.pond?.unlocked;
  if (r === "water_lake") return !!state.fishing?.bodies?.lake?.unlocked;
  if (r === "forge") return !!state.forgeBuilt;
  if (r === "heroes") return (state.adventurers ?? []).length > 0;
  if (r === "gems") return (state.worldZoneClears?.damp_cave ?? 0) > 0 || (state.worldResources?.rare_gem ?? 0) > 0;
  return false;
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

function getContractAmount(state, item, tier) {
  const season = state.season ?? 1;
  let amount = item.base * (1 + CONTRACT_SEASON_SCALE * (season - 1)) * tier.mult;
  if (item.source === "crops") {
    amount = Math.min(amount, getWarehouseCropCap(state) * CONTRACT_CROP_WAREHOUSE_FRACTION);
  }
  return roundNice(amount);
}

// Builds one random contract, or null if nothing can be asked for yet
export function generateContract(state) {
  const available = Object.values(CONTRACT_ITEMS).filter((item) => isContractItemAvailable(state, item));
  if (available.length === 0) return null;

  // Only offer tiers we can fill with distinct items
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

  const requester = getRequester(state, first.category);
  return {
    id: contractId(),
    tier: tier.id,
    category: first.category,
    requester: requester.name,
    requesterEmoji: requester.emoji,
    items: chosen.map((item) => ({
      key: item.key, name: item.name, emoji: item.emoji, source: item.source,
      amount: getContractAmount(state, item, tier),
    })),
    seals: tier.seals,
    secondsLeft: tier.seconds,
    totalSeconds: tier.seconds,
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────
// tick() only shallow-clones state, so this always builds a fresh contracts object.

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

  const slotCount = getContractSlotCount(state);
  const refillSpeed = Math.max(0.1, 1 + getGlobalBonus(state, "contractRefillSpeed"));
  const slots = [];
  const refill = [];
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
      const fresh = generateContract(state);
      slots.push(fresh);
      refill.push(fresh ? 0 : 30);                // nothing to ask for yet — check again in 30s
    } else {
      slots.push(null);
      refill.push(wait);
    }
  }

  return { ...state, contracts: { ...(c ?? {}), slots, refill, boosts } };
}

// ─── View for the UI ──────────────────────────────────────────────────────────

export function getContractView(state, contract) {
  if (!contract) return null;
  const items = contract.items.map((item) => {
    const have = getProjectStock(state, item);
    return { ...item, have, enough: have >= item.amount };
  });
  const tier = CONTRACT_TIERS[contract.tier] ?? CONTRACT_TIERS.easy;
  const bonusSeals = Math.round(getGlobalBonus(state, "contractSeals"));
  return {
    ...contract,
    tierDef: tier,
    items,
    canDeliver: items.every((i) => i.enough),
    totalSeals: contract.seals + bonusSeals,
    givesBoost: !!tier.boost,
  };
}

export function getDeliverableContractCount(state) {
  if (!isContractsUnlocked(state)) return 0;
  return (state.contracts?.slots ?? []).filter((ct) => ct && getContractView(state, ct).canDeliver).length;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Deliver a contract. Returns { state, ok, sealsGained, boost } */
export function deliverContract(state, slotIndex) {
  const contract = state.contracts?.slots?.[slotIndex];
  if (!contract) return { state, ok: false };
  const view = getContractView(state, contract);
  if (!view.canDeliver) return { state, ok: false };

  const next = deepCloneState(state);
  for (const item of contract.items) takeProjectStock(next, item, item.amount);

  const c = next.contracts;
  const sealsGained = view.totalSeals;
  c.seals = (c.seals ?? 0) + sealsGained;
  c.sealsEarned = (c.sealsEarned ?? 0) + sealsGained;
  c.completed = (c.completed ?? 0) + 1;
  c.slots[slotIndex] = null;
  if (!c.refill) c.refill = [];
  c.refill[slotIndex] = CONTRACT_REFILL_SECONDS;

  let boost = null;
  if (view.givesBoost) {
    boost = CONTRACT_BOOSTS[Math.floor(Math.random() * CONTRACT_BOOSTS.length)];
    if (!c.boosts) c.boosts = [];
    const existing = c.boosts.find((b) => b.key === boost.key && b.value === boost.value);
    if (existing) {
      existing.secondsLeft = Math.min(CONTRACT_BOOST_MAX_SECONDS, (existing.secondsLeft ?? 0) + CONTRACT_BOOST_SECONDS);
    } else {
      c.boosts.push({ ...boost, secondsLeft: CONTRACT_BOOST_SECONDS });
    }
  }

  if (!next.questProgress) next.questProgress = {};
  next.questProgress.contractsCompleted = (next.questProgress.contractsCompleted ?? 0) + 1;

  return { state: next, ok: true, sealsGained, boost };
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