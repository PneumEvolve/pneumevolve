// src/Pages/Homestead/useHomesteadState.js
// Manages all mutable homestead world state:
//   - Tilled soil patches and planted crops (farming)
//   - Resource node state (ore respawn, tree respawn, fishing cooldowns)
//
// This hook owns the "world" state that isn't persisted to the server
// (or could be if you add backend calls).  The canvas loop reads refs
// from this hook so it never re-renders on every tick.

import { useRef, useState, useCallback, useEffect } from "react";
import { T } from "./gameEngine";
import { SEEDS, ITEMS, rollLoot, addToInventory } from "./Items";
import { seededRand } from "./gameEngine";

// ─── Farming constants ────────────────────────────────────────────────────────
// How long (seconds) a watered plot enjoys the growth-rate bonus.
const WATER_BOOST_SECONDS = 120; // 2 minutes of boosted growth
const WATER_GROWTH_MULT   = 1.5;

const FISH_LOOT_TABLE = [
  { item: "fish",      min:1, max:2, chance:0.50 },
  { item: "big_fish",  min:1, max:1, chance:0.25 },
  { item: "rare_fish", min:1, max:1, chance:0.15 },
  { item: "gems",      min:1, max:2, chance:0.05 },
  { item: "sticks",    min:1, max:2, chance:0.05 },
];

const ORE_LOOT_TABLE = [
  { item: "stone", min:1, max:3 },
  { item: "coal",  min:0, max:2, chance:0.4 },
];

const TREE_LOOT_TABLE = [
  { item: "wood",   min:2, max:4 },
  { item: "sticks", min:0, max:2, chance:0.5 },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────
// roomId scopes all localStorage keys so different rooms never share farm/node state.
export function useHomesteadState(roomId) {
  // Derive stable storage keys from the room.  When roomId is absent (shouldn't
  // happen in normal flow) we fall back to empty state rather than a global key,
  // so stale data from a previous room can never bleed in.
  const farmKey  = roomId ? `hearthroot_farm_${roomId}`  : null;
  const nodesKey = roomId ? `hearthroot_nodes_${roomId}` : null;

  // ── Tilled soil & crops ──────────────────────────────────────────────────
  // Map key: `${col},${row}`  →  { seedId, plantedAt, stage, ready }
  // stage is computed from elapsed time each frame (no interval needed)
  const [farmPlots, setFarmPlots] = useState(() => {
    if (!farmKey) return {};
    try {
      const s = localStorage.getItem(farmKey);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });
  const farmPlotsRef = useRef(farmPlots);

  // Persist farm state
  const saveFarm = useCallback((plots) => {
    farmPlotsRef.current = plots;
    setFarmPlots(plots);
    if (farmKey) {
      try { localStorage.setItem(farmKey, JSON.stringify(plots)); } catch {}
    }
  }, [farmKey]);

  // Advance all growing crops by one in-game day.
  // Called by HomesteadView when the player sleeps (incrementDay fires).
  // Each plot tracks daysGrown; a crop is ready when daysGrown >= def.growthDays.
  // Legacy plots that still have plantedAt (old saves) are migrated on the fly.
  const advanceCropsOneDay = useCallback(() => {
    const plots = farmPlotsRef.current;
    let changed = false;
    const next = { ...plots };
    for (const [key, plot] of Object.entries(plots)) {
      if (!plot.seedId || plot.ready) continue;
      const def = SEEDS[plot.seedId];
      if (!def) continue;

      // Migrate legacy time-based plots: treat them as 0 days grown so far.
      const daysGrown = (plot.daysGrown ?? 0) + 1;
      const totalDays = def.growthDays ?? 2;
      const newStage  = Math.min(def.growthStages - 1, Math.floor((daysGrown / totalDays) * def.growthStages));
      const newReady  = daysGrown >= totalDays;
      next[key] = { ...plot, daysGrown, stage: newStage, ready: newReady, plantedAt: plot.plantedAt ?? null };
      changed = true;
    }
    if (changed) saveFarm(next);
  }, [saveFarm]);

  // Tick crops — legacy stub kept so the game loop call in HomesteadView doesn't break.
  // Growth now advances via advanceCropsOneDay() on sleep, not via real-time ticks.
  const tickCrops = useCallback((_nowMs) => {
    return farmPlotsRef.current;
  }, []);

  // Till a tile (player uses hoe on a grass tile)
  const tillTile = useCallback((col, row, tileMap) => {
    if (tileMap[row]?.[col] !== T.GRASS) return false;
    tileMap[row][col] = T.TILLED;
    const key = `${col},${row}`;
    const plots = { ...farmPlotsRef.current, [key]: { seedId: null, plantedAt: null, stage: 0, ready: false, wateredAt: null } };
    saveFarm(plots);
    return true;
  }, [saveFarm]);

  // Untill a tilled tile (hoe on empty tilled soil → revert to grass)
  const untillTile = useCallback((col, row, tileMap) => {
    if (tileMap[row]?.[col] !== T.TILLED) return false;
    const key = `${col},${row}`;
    const plot = farmPlotsRef.current[key];
    if (plot?.seedId) return false; // don't revert if a crop is planted
    tileMap[row][col] = T.GRASS;
    const plots = { ...farmPlotsRef.current };
    delete plots[key];
    saveFarm(plots);
    return true;
  }, [saveFarm]);

  // Plant a seed on a tilled tile
  const plantSeed = useCallback((col, row, seedId, tileMap, inventory) => {
    const key = `${col},${row}`;
    const plot = farmPlotsRef.current[key];
    if (!plot || plot.seedId) return null; // not tilled, or already planted
    if ((inventory?.[seedId] ?? 0) < 1) return null;
    tileMap[row][col] = T.PLANTED;
    const newPlot = { seedId, plantedAt: Date.now(), daysGrown: 0, stage: 0, ready: false, wateredAt: null };
    saveFarm({ ...farmPlotsRef.current, [key]: newPlot });
    const newInv = { ...inventory, [seedId]: inventory[seedId] - 1 };
    return newInv;
  }, [saveFarm]);

  // Harvest a ready crop
  const harvestCrop = useCallback((col, row, tileMap, inventory) => {
    const key = `${col},${row}`;
    const plot = farmPlotsRef.current[key];
    if (!plot?.ready) return null;
    const def = SEEDS[plot.seedId];
    if (!def) return null;
    // Roll yields
    const rand = seededRand(col * 1000 + row + Date.now());
    let newInv = { ...inventory };
    for (const entry of (def.harvestYields ?? [])) {
      const amt = entry.min + Math.floor(rand() * (entry.max - entry.min + 1));
      if (amt > 0) newInv = addToInventory(newInv, entry.item, amt);
    }
    // Reset tile to tilled (ready to plant again)
    tileMap[row][col] = T.TILLED;
    saveFarm({ ...farmPlotsRef.current, [key]: { seedId: null, plantedAt: null, stage: 0, ready: false, wateredAt: null } });
    return { inventory: newInv, yields: def.harvestYields };
  }, [saveFarm]);

  // Water a tilled or planted plot (watering can required)
  // Sets wateredAt = Date.now() so tickCrops can apply the growth bonus.
  // Returns true if the plot exists and was watered, false otherwise.
  const waterPlot = useCallback((col, row) => {
    const key = `${col},${row}`;
    const plot = farmPlotsRef.current[key];
    if (!plot) return false; // not a tilled/planted tile we track
    saveFarm({ ...farmPlotsRef.current, [key]: { ...plot, wateredAt: Date.now() } });
    return true;
  }, [saveFarm]);

  // ── Resource nodes ────────────────────────────────────────────────────────
  // Stored as a map: nodeId → { depleted, depletedAt, hp }
  // The base definitions live in defaultObjects(); this tracks runtime state.
  const [nodeState, setNodeState] = useState(() => {
    if (!nodesKey) return {};
    try {
      const s = localStorage.getItem(nodesKey);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });
  const nodeStateRef = useRef(nodeState);

  const saveNodes = useCallback((ns) => {
    nodeStateRef.current = ns;
    setNodeState(ns);
    if (nodesKey) {
      try { localStorage.setItem(nodesKey, JSON.stringify(ns)); } catch {}
    }
  }, [nodesKey]);

  // Tick node respawns — called by game loop
  const tickNodes = useCallback((objects, nowMs) => {
    const ns = nodeStateRef.current;
    let changed = false;
    const next = { ...ns };
    for (const obj of objects) {
      const st = ns[obj.id];
      if (!st?.depleted) continue;
      const respawnMs = (obj.respawnTime ?? 120) * 1000;
      if (nowMs - st.depletedAt >= respawnMs) {
        next[obj.id] = { depleted: false, hp: obj.maxHp ?? 3 };
        changed = true;
      }
    }
    if (changed) saveNodes(next);
    // Return merged view: object with depleted/hp from nodeState overlaid
    return nodeStateRef.current;
  }, [saveNodes]);

  // Get effective node state (merges defaults with saved state)
  const getNodeState = useCallback((nodeId, defaultHp = 3) => {
    const st = nodeStateRef.current[nodeId];
    if (!st) return { depleted: false, hp: defaultHp };
    return st;
  }, []);

  // Hit an ore node (pickaxe required)
  const hitOreNode = useCallback((node, equipStats, inventory) => {
    const ns  = nodeStateRef.current;
    const st  = ns[node.id] ?? { depleted: false, hp: node.maxHp ?? 3 };
    if (st.depleted) return null;
    const newHp = st.hp - 1;
    const rand  = seededRand(node.id.charCodeAt(4) + Date.now());
    let newInv = { ...inventory };
    let yields = [];
    // Drop some ore each hit
    const hitDrops = rollLoot(ORE_LOOT_TABLE, rand);
    for (const d of hitDrops) {
      newInv = addToInventory(newInv, d.item, d.qty);
      yields.push(d);
    }
    const depleted = newHp <= 0;
    saveNodes({ ...ns, [node.id]: { depleted, depletedAt: depleted ? Date.now() : null, hp: newHp } });
    return { inventory: newInv, yields, depleted };
  }, [saveNodes]);

  // Hit a homestead tree (axe required)
  const hitTree = useCallback((nodeId, objects, inventory, setObjects) => {
    const obj = objects.find(o => o.id === nodeId);
    if (!obj || obj.chopped) return null;
    const newHp = (obj.hp ?? 3) - 1;
    const rand  = seededRand(nodeId.charCodeAt(5) + Date.now());
    let newInv  = { ...inventory };
    let yields  = [];
    const hitDrops = rollLoot(TREE_LOOT_TABLE, rand);
    for (const d of hitDrops) {
      newInv = addToInventory(newInv, d.item, d.qty);
      yields.push(d);
    }
    const chopped = newHp <= 0;
    const newObjects = objects.map(o => o.id === nodeId
      ? { ...o, hp: newHp, chopped, solid: !chopped }
      : o
    );
    setObjects(newObjects);
    if (chopped) {
      // Schedule respawn via nodeState
      saveNodes({ ...nodeStateRef.current, [nodeId]: { depleted: true, depletedAt: Date.now(), hp: 0, respawnTime: 300 } });
    }
    return { inventory: newInv, yields };
  }, [saveNodes]);

  // Tick tree respawns
  const tickTreeRespawns = useCallback((objects, nowMs, setObjects) => {
    const ns = nodeStateRef.current;
    let anyRestored = false;
    const newObjects = objects.map(obj => {
      if (!obj.choppable || !obj.chopped) return obj;
      const st = ns[obj.id];
      if (!st?.depleted) return obj;
      const respawnMs = (st.respawnTime ?? 300) * 1000;
      if (nowMs - st.depletedAt >= respawnMs) {
        anyRestored = true;
        saveNodes({ ...nodeStateRef.current, [obj.id]: { depleted: false, hp: obj.maxHp ?? 3 } });
        return { ...obj, hp: obj.maxHp ?? 3, chopped: false, solid: true };
      }
      return obj;
    });
    if (anyRestored) setObjects(newObjects);
  }, [saveNodes]);

  // Fish at a spot
  const fishAtSpot = useCallback((inventory) => {
    const rand = seededRand(Date.now());
    let newInv = { ...inventory };
    const yields = [];
    // Roll one catch
    let roll = rand();
    for (const entry of FISH_LOOT_TABLE) {
      if (roll < entry.chance) {
        const amt = entry.min + Math.floor(rand() * (entry.max - entry.min + 1));
        newInv = addToInventory(newInv, entry.item, amt);
        yields.push({ item: entry.item, qty: amt });
        break;
      }
      roll -= entry.chance;
    }
    return { inventory: newInv, yields };
  }, []);

  return {
    // Farming
    farmPlots: farmPlotsRef,
    tickCrops,
    advanceCropsOneDay,
    tillTile,
    untillTile,
    plantSeed,
    harvestCrop,
    waterPlot,
    WATER_BOOST_SECONDS,
    // Nodes
    nodeState: nodeStateRef,
    tickNodes,
    getNodeState,
    hitOreNode,
    hitTree,
    tickTreeRespawns,
    fishAtSpot,
  };
}