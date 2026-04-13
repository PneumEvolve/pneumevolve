// src/Pages/rootwork/gameEngine.js
 
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  PLOT_BASE_COST,
  PLOT_COST_MULTIPLIER,
  MAX_PLOTS,
  WORKER_HIRE_BASE_COST,
  WORKER_HIRE_MULTIPLIER,
  SPECIALIZATIONS,
  SEASON_FARMS,
  FIRST_EXTRA_FARM_SEASON,
  AUTOMATION_THRESHOLD,
  MIN_PLOTS_FOR_AUTOMATION,
  MAX_OFFLINE_SECONDS,
  PROCESSING_RECIPES,
  GEAR_CROP_COSTS,
  TEND_SECONDS,
  SPECIALIZE_COST,
  SPECIALIZE_CROP,
  PLOT_UPGRADE_COST,
  PLOT_UPGRADE_GROW_MULTIPLIER,
  CROP_ARTISAN,
  FEAST_TIERS,
  FEAST_MAX_BONUS,
  MARKET_SELL_RATES,
  KITCHEN_BASE_COST,
  KITCHEN_SLOT_COSTS,
  KITCHEN_SLOT_UPGRADES,
  getPrestigeCashThreshold,
  getFarmUnlockCost,
  EXTRA_FARM_CROPS,
} from "./gameConstants";
 
let _idCounter = 0;
function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}
 
// ─── Factories ────────────────────────────────────────────────────────────────
 
export function makePlot(id, halfGrown = false, growTime = 15) {
  return {
    id: id ?? genId("plot"),
    state: halfGrown ? "planted" : "empty",
    growthTick: halfGrown ? Math.floor(growTime / 2) : 0,
    upgraded: false,
  };
}
 
export function makeFarm(cropId, isFirst = false) {
  const crop = CROPS[cropId];
  return {
    id: genId("farm"),
    crop: cropId,
    plots: [makePlot(undefined, isFirst, crop?.growTime ?? 15)],
    unlockedPlots: 1,
  };
}
 
export function makeWorker(farmId, startWithGloves = false) {
  return {
    id: genId("worker"),
    farmId,
    gear: startWithGloves ? "gloves" : "bare_hands",
    specialization: "none",
    cycleProgress: 0,
    cycleCount: 0,
  };
}
 
function makeKitchenSlot(slotIndex) {
  return { slotIndex, upgrades: [] };
}
 
// ─── Initial state ────────────────────────────────────────────────────────────
 
export function createInitialState() {
  const firstFarm = makeFarm("wheat", true);
  return {
    season: 1,
    prestigeBonuses: [],
    keptWorkers: [],
    yieldPool: 0,
    feastBonusPercent: 0,
    feastTierIndex: 0,
    farms: [firstFarm],
    workers: [],
    crops: { wheat: 0, berries: 0, tomatoes: 0 },
    artisan: { bread: 0, jam: 0, sauce: 0 },
    processingQueue: [],
    kitchenPurchased: false,
    kitchenSlotCount: 1,
    kitchenSlots: [makeKitchenSlot(0)],
    marketUnlocked: false,
    marketQueue: [],
    cash: 0,
    lifetimeCash: 0,
    // Extra farm unlock (season 4+)
    extraFarmsUnlocked: 0,       // how many extra farms bought so far (ever)
    pendingFarmUnlock: false,    // true after prestige if player needs to pick a crop
    lastSavedTime: Date.now(),
    totalPlayTime: 0,
    pendingWorkerAssignments: false,
  };
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
export function getFarmCrop(farm) { return CROPS[farm.crop]; }
 
export function getNextGear(currentGear) {
  const idx = GEAR_ORDER.indexOf(currentGear);
  if (idx === -1 || idx === GEAR_ORDER.length - 1) return null;
  return GEAR_ORDER[idx + 1];
}
 
export function getPlotUnlockCost(currentPlotCount) {
  if (currentPlotCount >= MAX_PLOTS) return null;
  const purchaseIndex = currentPlotCount - 1;
  const raw = PLOT_BASE_COST * Math.pow(PLOT_COST_MULTIPLIER, purchaseIndex);
  return Math.max(5, Math.round(raw / 5) * 5);
}
 
export function isFarmAutomated(farm, workers) {
  const workerCount = workers.filter((w) => w.farmId === farm.id).length;
  return workerCount >= AUTOMATION_THRESHOLD && farm.unlockedPlots >= MIN_PLOTS_FOR_AUTOMATION;
}
 
export function isMarketUnlocked(state) {
  if (state.marketUnlocked) return true;
  return state.farms.some((f) => isFarmAutomated(f, state.workers));
}
 
export function isKitchenUnlocked(state) {
  return state.kitchenPurchased === true;
}
 
export function getAvailableFarms(season) {
  return SEASON_FARMS[Math.min(season, 3)] ?? SEASON_FARMS[3];
}
 
export function needsSpecialization(worker) {
  return worker.gear === "hoe" && worker.specialization === "none";
}
 
export function getWorkerHireCost(state, farmId) {
  const workersOnFarm = state.workers.filter((w) => w.farmId === farmId).length;
  const raw = WORKER_HIRE_BASE_COST * Math.pow(WORKER_HIRE_MULTIPLIER, workersOnFarm);
  return Math.round(raw / 5) * 5;
}
 
export function applyYieldBonuses(baseYield, prestigeBonuses, currentPool = 0) {
  const bumperCount = prestigeBonuses.filter((b) => b === "bumper_crop").length;
  if (bumperCount === 0) return { crops: baseYield, newPool: currentPool };
  const multiplier = 1 + bumperCount * 0.1;
  const exact = baseYield * multiplier;
  const whole = Math.floor(exact);
  const fraction = exact - whole;
  const newPool = currentPool + fraction;
  const bonus = Math.floor(newPool);
  return { crops: whole + bonus, newPool: newPool - bonus };
}
 
export function getEffectiveCycleSeconds(worker) {
  const gear = GEAR[worker.gear];
  let seconds = gear.cycleSeconds;
  if (worker.specialization === "harvester") {
    seconds = Math.max(1, Math.floor(seconds * SPECIALIZATIONS.harvester.cycleMultiplier));
  }
  return seconds;
}
 
export function getEffectivePlotsPerCycle(worker) {
  const gear = GEAR[worker.gear];
  if (worker.specialization === "sprinter") {
    return gear.plotsPerCycle * SPECIALIZATIONS.sprinter.plotsMultiplier;
  }
  return gear.plotsPerCycle;
}
 
export function isSprinterResting(worker) {
  if (worker.specialization !== "sprinter") return false;
  return (worker.cycleCount ?? 0) % SPECIALIZATIONS.sprinter.restEvery === SPECIALIZATIONS.sprinter.restEvery - 1;
}
 
export function getEffectiveGrowTime(farm, workers, cropId, plot = null, feastBonusPercent = 0) {
  const crop = CROPS[cropId];
  let time = crop.growTime;
  const growers = workers.filter((w) => w.farmId === farm.id && w.specialization === "grower");
  for (let i = 0; i < growers.length; i++) {
    time = Math.floor(time * SPECIALIZATIONS.grower.growMultiplier);
  }
  if (plot?.upgraded) {
    time = Math.floor(time * PLOT_UPGRADE_GROW_MULTIPLIER);
  }
  if (feastBonusPercent > 0) {
    const speedMultiplier = 1 + feastBonusPercent / 100;
    time = Math.floor(time / speedMultiplier);
  }
  return Math.max(3, time);
}
 
export function getFarmGrowTime(farm, workers, cropId, feastBonusPercent = 0) {
  return getEffectiveGrowTime(farm, workers, cropId, null, feastBonusPercent);
}
 
export function getNextFeastTier(state) {
  const idx = state.feastTierIndex ?? 0;
  return FEAST_TIERS[idx] ?? null;
}
 
// ─── Market helpers ───────────────────────────────────────────────────────────
 
export function getSellRate(itemType, prestigeBonuses = []) {
  const base = MARKET_SELL_RATES[itemType] ?? 0;
  const savvyCount = prestigeBonuses.filter((b) => b === "market_savvy").length;
  if (savvyCount === 0) return base;
  return Math.round(base * Math.pow(1.25, savvyCount) * 100) / 100;
}
 
export function getMarketQueueLength(state) {
  return (state.marketQueue ?? []).reduce((sum, item) => sum + item.quantity, 0);
}
 
// ─── Kitchen helpers ──────────────────────────────────────────────────────────
 
export function getKitchenSlotUpgrades(state, slotIndex) {
  const slot = (state.kitchenSlots ?? [])[slotIndex];
  return slot?.upgrades ?? [];
}
 
export function getSlotSpeedMultiplier(state, slotIndex) {
  const upgrades = getKitchenSlotUpgrades(state, slotIndex);
  if (upgrades.includes("speed_2")) return KITCHEN_SLOT_UPGRADES.speed_2.speedMultiplier;
  if (upgrades.includes("speed_1")) return KITCHEN_SLOT_UPGRADES.speed_1.speedMultiplier;
  return 1;
}
 
export function getEffectiveRecipeSeconds(state, slotIndex, baseSeconds) {
  const mult = getSlotSpeedMultiplier(state, slotIndex);
  return Math.max(5, Math.floor(baseSeconds * mult));
}
 
export function canBuyKitchen(state) {
  return !state.kitchenPurchased && (state.cash ?? 0) >= KITCHEN_BASE_COST && isMarketUnlocked(state);
}
 
export function canBuyKitchenSlot(state) {
  const current = state.kitchenSlotCount ?? 1;
  const cost = KITCHEN_SLOT_COSTS[current - 1];
  if (cost === undefined) return false;
  return (state.cash ?? 0) >= cost;
}
 
// ─── Farm unlock helpers ──────────────────────────────────────────────────────
 
export function getNextFarmUnlockCost(state) {
  return getFarmUnlockCost(state.extraFarmsUnlocked ?? 0);
}
 
export function canUnlockFarm(state) {
  if (!state.pendingFarmUnlock) return false;
  return (state.cash ?? 0) >= getNextFarmUnlockCost(state);
}
 
// ─── Offline progress ─────────────────────────────────────────────────────────
// Key fix: run worker cycles tick-by-tick within the offline window so that
// harvested plots get replanted and can grow again within the same session.
// Without this, plots harvested offline stay empty for the rest of the window.
 
export function calculateOfflineProgress(state, nowMs) {
  const lastSaved = state.lastSavedTime ?? nowMs;
  const rawSeconds = Math.floor((nowMs - lastSaved) / 1000);
  const seconds = Math.min(rawSeconds, MAX_OFFLINE_SECONDS);
  if (seconds <= 0) return { state, offlineSeconds: 0 };
 
  let next = deepCloneState(state);
 
  if (!next.marketUnlocked && isMarketUnlocked(next)) {
    next.marketUnlocked = true;
  }
 
  const feast = next.feastBonusPercent ?? 0;
 
  // ── Simulate second-by-second for farms ──────────────────────────────────
  // We batch grow ticks but simulate worker cycles properly so replanting works.
  for (const farm of next.farms) {
    const crop = CROPS[farm.crop];
    const farmWorkers = next.workers.filter((w) => w.farmId === farm.id);
 
    // Advance all plot growth ticks in one batch first
    for (const plot of farm.plots) {
      if (plot.state === "planted") {
        const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop, plot, feast);
        plot.growthTick = Math.min(plot.growthTick + seconds, growTime);
        if (plot.growthTick >= growTime) plot.state = "ready";
      }
    }
 
    // Simulate each worker's cycles, replanting after each harvest so newly
    // empty plots can be counted as ready-to-plant in subsequent cycles.
    for (const worker of farmWorkers) {
      const cycleSeconds = getEffectiveCycleSeconds(worker);
      const totalWorkerTime = seconds + worker.cycleProgress;
      const completedCycles = Math.floor(totalWorkerTime / cycleSeconds);
      worker.cycleProgress = totalWorkerTime % cycleSeconds;
      if (completedCycles === 0) continue;
 
      // Estimate seconds per cycle to advance grow ticks between cycles
      const secondsPerCycle = cycleSeconds;
 
      for (let c = 0; c < completedCycles; c++) {
        const resting = isSprinterResting(worker);
        worker.cycleCount = (worker.cycleCount ?? 0) + 1;
        if (resting) continue;
 
        const plotsPerCycle = getEffectivePlotsPerCycle(worker);
        let harvested = 0;
 
        for (const plot of farm.plots) {
          if (harvested >= plotsPerCycle) break;
          if (plot.state === "ready") {
            const { crops, newPool } = applyYieldBonuses(crop.workerYield, next.prestigeBonuses, next.yieldPool ?? 0);
            next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + crops;
            next.yieldPool = newPool;
            plot.state = "empty";
            plot.growthTick = 0;
            harvested++;
          }
        }
 
        // Replant empty plots
        let replanted = 0;
        for (const plot of farm.plots) {
          if (replanted >= plotsPerCycle) break;
          if (plot.state === "empty") {
            plot.state = "planted";
            plot.growthTick = 0;
            replanted++;
          }
        }
 
        // Advance newly planted plots by the time remaining in this offline window
        // after this cycle fires. Approximate: remaining = seconds - (c+1)*cycleSeconds
        const secondsElapsedSoFar = (c + 1) * secondsPerCycle;
        const secondsRemaining = Math.max(0, seconds - secondsElapsedSoFar);
        for (const plot of farm.plots) {
          if (plot.state === "planted" && plot.growthTick === 0) {
            const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop, plot, feast);
            plot.growthTick = Math.min(secondsRemaining, growTime);
            if (plot.growthTick >= growTime) plot.state = "ready";
          }
        }
      }
    }
  }
 
  // ── Kitchen queue ─────────────────────────────────────────────────────────
  // Simulate full cycles so auto-restart fires as many times as crops allow,
  // and players get all the goods they earned while offline.
  for (const item of next.processingQueue) {
    if (item.done) continue;
 
    let timeLeft = seconds;
    let currentItem = item;
 
    while (timeLeft > 0) {
      const remaining = currentItem.totalSeconds - (currentItem.elapsedSeconds ?? 0);
 
      if (timeLeft < remaining) {
        // Doesn't finish — just advance
        currentItem.elapsedSeconds = (currentItem.elapsedSeconds ?? 0) + timeLeft;
        timeLeft = 0;
      } else {
        // Finishes this cycle
        timeLeft -= remaining;
        currentItem.done = true;
        next.artisan[currentItem.outputGood] = (next.artisan[currentItem.outputGood] ?? 0) + currentItem.outputAmount;
 
        // Auto-restart: keep looping if crops available and time remains
        const canRestart = (
          currentItem.slotIndex !== undefined &&
          !currentItem.cancelAutoRestart &&
          timeLeft > 0
        );
        if (canRestart) {
          const slotUpgrades = getKitchenSlotUpgrades(next, currentItem.slotIndex);
          if (slotUpgrades.includes("auto_restart") && currentItem.recipeId) {
            const recipe = PROCESSING_RECIPES[currentItem.recipeId];
            if (recipe?.inputCrop && (next.crops[recipe.inputCrop] ?? 0) >= recipe.inputAmount) {
              next.crops[recipe.inputCrop] -= recipe.inputAmount;
              const effectiveSeconds = getEffectiveRecipeSeconds(next, currentItem.slotIndex, recipe.seconds);
              // Create next run and continue the while loop with it
              const nextItem = {
                id: genId("proc"),
                recipeId: recipe.id,
                outputGood: recipe.outputGood,
                totalSeconds: effectiveSeconds,
                elapsedSeconds: 0,
                outputAmount: recipe.outputAmount,
                slotIndex: currentItem.slotIndex,
                done: false,
              };
              next.processingQueue.push(nextItem);
              currentItem = nextItem;
              continue;
            }
          }
        }
        // No restart or out of time — stop
        break;
      }
    }
  }
  next.processingQueue = next.processingQueue.filter((i) => !i.done);
 
  // ── Market sell queue ─────────────────────────────────────────────────────
  let sellTicks = seconds;
  while (sellTicks > 0 && (next.marketQueue ?? []).length > 0) {
    const order = next.marketQueue[0];
    const toSell = Math.min(sellTicks, order.quantity);
    const rate = getSellRate(order.itemType, next.prestigeBonuses);
    order.quantity -= toSell;
    next.cash = (next.cash ?? 0) + toSell * rate;
    next.lifetimeCash = (next.lifetimeCash ?? 0) + toSell * rate;
    sellTicks -= toSell;
    if (order.quantity <= 0) next.marketQueue.shift();
  }
 
  next.lastSavedTime = nowMs;
  next.totalPlayTime = (next.totalPlayTime ?? 0) + seconds;
  return { state: next, offlineSeconds: seconds };
}
 
// ─── Tick ─────────────────────────────────────────────────────────────────────
 
export function tick(state) {
  let next = deepCloneState(state);
  const feast = next.feastBonusPercent ?? 0;
 
  if (!next.marketUnlocked && isMarketUnlocked(next)) {
    next.marketUnlocked = true;
  }
 
  for (const farm of next.farms) {
    const farmWorkers = next.workers.filter((w) => w.farmId === farm.id);
 
    for (const plot of farm.plots) {
      if (plot.state === "planted") {
        const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop, plot, feast);
        plot.growthTick += 1;
        if (plot.growthTick >= growTime) plot.state = "ready";
      }
    }
 
    for (const worker of farmWorkers) {
      const workerRef = next.workers.find((w) => w.id === worker.id);
      if (!workerRef) continue;
      workerRef.cycleProgress += 1;
      const cycleSeconds = getEffectiveCycleSeconds(workerRef);
 
      if (workerRef.cycleProgress >= cycleSeconds) {
        workerRef.cycleProgress = 0;
        const resting = isSprinterResting(workerRef);
        workerRef.cycleCount = (workerRef.cycleCount ?? 0) + 1;
 
        if (!resting) {
          const crop = CROPS[farm.crop];
          const plotsPerCycle = getEffectivePlotsPerCycle(workerRef);
          let harvested = 0;
 
          for (const plot of farm.plots) {
            if (harvested >= plotsPerCycle) break;
            if (plot.state === "ready") {
              const { crops, newPool } = applyYieldBonuses(crop.workerYield, next.prestigeBonuses, next.yieldPool ?? 0);
              next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + crops;
              next.yieldPool = newPool;
              plot.state = "empty";
              plot.growthTick = 0;
              harvested++;
            }
          }
 
          let replanted = 0;
          for (const plot of farm.plots) {
            if (replanted >= plotsPerCycle) break;
            if (plot.state === "empty") {
              plot.state = "planted";
              plot.growthTick = 0;
              replanted++;
            }
          }
        }
      }
    }
  }
 
  // Kitchen queue tick
  for (const item of next.processingQueue) {
    if (!item.done) {
      item.elapsedSeconds = (item.elapsedSeconds ?? 0) + 1;
      if (item.elapsedSeconds >= item.totalSeconds) {
        item.done = true;
        next.artisan[item.outputGood] = (next.artisan[item.outputGood] ?? 0) + item.outputAmount;
        // Auto-restart
        if (item.slotIndex !== undefined && !item.cancelAutoRestart) {
          const slotUpgrades = getKitchenSlotUpgrades(next, item.slotIndex);
          if (slotUpgrades.includes("auto_restart") && item.recipeId) {
            const recipe = PROCESSING_RECIPES[item.recipeId];
            if (recipe?.inputCrop && (next.crops[recipe.inputCrop] ?? 0) >= recipe.inputAmount) {
              next.crops[recipe.inputCrop] -= recipe.inputAmount;
              const effectiveSeconds = getEffectiveRecipeSeconds(next, item.slotIndex, recipe.seconds);
              next.processingQueue.push({
                id: genId("proc"),
                recipeId: recipe.id,
                outputGood: recipe.outputGood,
                totalSeconds: effectiveSeconds,
                elapsedSeconds: 0,
                outputAmount: recipe.outputAmount,
                slotIndex: item.slotIndex,
                done: false,
              });
            }
          }
        }
      }
    }
  }
  next.processingQueue = next.processingQueue.filter((i) => !i.done);
 
  // Market sell queue — 1 item per second
  if ((next.marketQueue ?? []).length > 0) {
    const order = next.marketQueue[0];
    const rate = getSellRate(order.itemType, next.prestigeBonuses);
    order.quantity -= 1;
    next.cash = (next.cash ?? 0) + rate;
    next.lifetimeCash = (next.lifetimeCash ?? 0) + rate;
    if (order.quantity <= 0) next.marketQueue.shift();
  }
 
  next.totalPlayTime = (next.totalPlayTime ?? 0) + 1;
  return next;
}
 
// ─── Actions ──────────────────────────────────────────────────────────────────
 
export function plantPlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot || plot.state !== "empty") return state;
  plot.state = "planted";
  plot.growthTick = 0;
  return next;
}
 
export function harvestPlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot || plot.state !== "ready") return state;
  const crop = CROPS[farm.crop];
  const { crops, newPool } = applyYieldBonuses(crop.manualYield, next.prestigeBonuses, next.yieldPool ?? 0);
  next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + crops;
  next.yieldPool = newPool;
  plot.state = "empty";
  plot.growthTick = 0;
  return next;
}
 
export function tendPlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot || plot.state !== "planted") return state;
  const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop, plot, next.feastBonusPercent ?? 0);
  plot.growthTick = Math.min(plot.growthTick + TEND_SECONDS, growTime);
  if (plot.growthTick >= growTime) plot.state = "ready";
  return next;
}
 
export function upgradePlot(state, farmId, plotId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const plot = farm.plots.find((p) => p.id === plotId);
  if (!plot || plot.upgraded) return state;
  const artisanGood = CROP_ARTISAN[farm.crop];
  if (!artisanGood) return state;
  if ((next.artisan[artisanGood] ?? 0) < PLOT_UPGRADE_COST) return state;
  next.artisan[artisanGood] -= PLOT_UPGRADE_COST;
  plot.upgraded = true;
  return next;
}
 
export function buyPlot(state, farmId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const current = farm.unlockedPlots;
  if (current >= MAX_PLOTS) return state;
  const cost = getPlotUnlockCost(current);
  if (cost === null) return state;
  const cropId = farm.crop;
  if ((next.crops[cropId] ?? 0) < cost) return state;
  next.crops[cropId] -= cost;
  farm.unlockedPlots += 1;
  farm.plots.push(makePlot());
  return next;
}
 
export function hireWorker(state, farmId) {
  const next = deepCloneState(state);
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const cropId = farm.crop;
  const workersOnFarm = next.workers.filter((w) => w.farmId === farmId).length;
  const hasHeadStart = next.prestigeBonuses.includes("head_start") && workersOnFarm === 0;
  const cost = hasHeadStart ? 0 : getWorkerHireCost(next, farmId);
  if ((next.crops[cropId] ?? 0) < cost) return state;
  next.crops[cropId] -= cost;
  const startWithGloves = next.prestigeBonuses.includes("fast_hands");
  const newWorker = makeWorker(farmId, startWithGloves);
  const cycleSeconds = getEffectiveCycleSeconds(newWorker);
  newWorker.cycleProgress = cycleSeconds - 1;
  next.workers.push(newWorker);
  if (!next.marketUnlocked && isMarketUnlocked(next)) next.marketUnlocked = true;
  return next;
}
 
export function sellWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  const farm = next.farms.find((f) => f.id === worker.farmId);
  if (!farm) return state;
  const workersOnFarm = next.workers.filter((w) => w.farmId === worker.farmId).length;
  const previousCount = Math.max(0, workersOnFarm - 1);
  const hireCostWhenBought = Math.round(
    (WORKER_HIRE_BASE_COST * Math.pow(WORKER_HIRE_MULTIPLIER, previousCount)) / 5
  ) * 5;
  const refund = Math.floor(hireCostWhenBought * 0.5);
  next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + refund;
  next.workers = next.workers.filter((w) => w.id !== workerId);
  return next;
}
 
export function upgradeWorkerGear(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  if (needsSpecialization(worker)) return state;
  const nextGearId = getNextGear(worker.gear);
  if (!nextGearId) return state;
  const cost = GEAR[nextGearId].upgradeCost;
  const cropId = GEAR_CROP_COSTS[nextGearId];
  if (!cropId) return state;
  if ((next.crops[cropId] ?? 0) < cost) return state;
  next.crops[cropId] -= cost;
  worker.gear = nextGearId;
  return next;
}
 
export function specializeWorker(state, workerId, specializationId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  if (worker.gear !== "hoe") return state;
  if (worker.specialization !== "none") return state;
  if (!SPECIALIZATIONS[specializationId] || specializationId === "none") return state;
  if ((next.crops[SPECIALIZE_CROP] ?? 0) < SPECIALIZE_COST) return state;
  next.crops[SPECIALIZE_CROP] -= SPECIALIZE_COST;
  worker.specialization = specializationId;
  worker.cycleCount = 0;
  return next;
}
 
// ─── Market actions ───────────────────────────────────────────────────────────
 
export function sellItems(state, itemType, quantity) {
  if (!isMarketUnlocked(state)) return state;
  if (quantity <= 0) return state;
  const next = deepCloneState(state);
  const isCrop = itemType in (next.crops ?? {});
  const isArtisan = itemType in (next.artisan ?? {});
  if (isCrop) {
    if ((next.crops[itemType] ?? 0) < quantity) return state;
    next.crops[itemType] -= quantity;
  } else if (isArtisan) {
    if ((next.artisan[itemType] ?? 0) < quantity) return state;
    next.artisan[itemType] -= quantity;
  } else {
    return state;
  }
  const queue = next.marketQueue ?? [];
  const last = queue[queue.length - 1];
  if (last && last.itemType === itemType) {
    last.quantity += quantity;
  } else {
    queue.push({ id: genId("sale"), itemType, quantity });
    next.marketQueue = queue;
  }
  return next;
}
 
// ─── Kitchen actions ──────────────────────────────────────────────────────────
 
export function purchaseKitchen(state) {
  if (state.kitchenPurchased) return state;
  if (!isMarketUnlocked(state)) return state;
  if ((state.cash ?? 0) < KITCHEN_BASE_COST) return state;
  const next = deepCloneState(state);
  next.cash -= KITCHEN_BASE_COST;
  next.kitchenPurchased = true;
  next.kitchenSlotCount = 1;
  next.kitchenSlots = [makeKitchenSlot(0)];
  return next;
}
 
export function purchaseKitchenSlot(state) {
  const current = state.kitchenSlotCount ?? 1;
  const cost = KITCHEN_SLOT_COSTS[current - 1];
  if (cost === undefined) return state;
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  next.kitchenSlotCount = current + 1;
  if (!next.kitchenSlots) next.kitchenSlots = [];
  next.kitchenSlots.push(makeKitchenSlot(current));
  return next;
}
 
export function purchaseSlotUpgrade(state, slotIndex, upgradeId) {
  if (!state.kitchenPurchased) return state;
  const upgrade = KITCHEN_SLOT_UPGRADES[upgradeId];
  if (!upgrade) return state;
  if (slotIndex >= (state.kitchenSlotCount ?? 1)) return state;
  const slotUpgrades = getKitchenSlotUpgrades(state, slotIndex);
  if (slotUpgrades.includes(upgradeId)) return state;
  if (upgrade.requires && !slotUpgrades.includes(upgrade.requires)) return state;
  if ((state.cash ?? 0) < upgrade.cost) return state;
  const next = deepCloneState(state);
  next.cash -= upgrade.cost;
  next.kitchenSlots[slotIndex].upgrades.push(upgradeId);
  return next;
}
 
export function cancelProcessing(state, itemId) {
  const next = deepCloneState(state);
  const idx = next.processingQueue.findIndex((i) => i.id === itemId);
  if (idx === -1) return state;
  const item = next.processingQueue[idx];
  const recipe = PROCESSING_RECIPES[item.recipeId];
  // Refund 50% of input crops
  if (recipe?.inputCrop) {
    const refund = Math.floor(recipe.inputAmount * 0.5);
    next.crops[recipe.inputCrop] = (next.crops[recipe.inputCrop] ?? 0) + refund;
  }
  next.processingQueue.splice(idx, 1);
  return next;
}
 
// ─── Processing ───────────────────────────────────────────────────────────────
 
export function startProcessing(state, recipeId, slotIndex = 0) {
  const next = deepCloneState(state);
  const recipe = PROCESSING_RECIPES[recipeId];
  if (!recipe || !recipe.inputCrop) return state;
  if (!isKitchenUnlocked(next)) return state;
  const maxSlots = next.kitchenSlotCount ?? 1;
  const activeItems = next.processingQueue.filter((i) => !i.done);
  if (activeItems.length >= maxSlots) return state;
  const cropId = recipe.inputCrop;
  if ((next.crops[cropId] ?? 0) < recipe.inputAmount) return state;
  next.crops[cropId] -= recipe.inputAmount;
  const effectiveSeconds = getEffectiveRecipeSeconds(next, slotIndex, recipe.seconds);
  next.processingQueue.push({
    id: genId("proc"),
    recipeId,
    outputGood: recipe.outputGood,
    totalSeconds: effectiveSeconds,
    elapsedSeconds: 0,
    outputAmount: recipe.outputAmount,
    slotIndex,
    done: false,
  });
  return next;
}
 
export function buyFeast(state) {
  const next = deepCloneState(state);
  const tierIdx = next.feastTierIndex ?? 0;
  const tier = FEAST_TIERS[tierIdx];
  if (!tier) return state;
  const perGood = Math.ceil(tier.cost / 3);
  if (
    (next.artisan.bread ?? 0) < perGood ||
    (next.artisan.jam ?? 0) < perGood ||
    (next.artisan.sauce ?? 0) < perGood
  ) return state;
  next.artisan.bread -= perGood;
  next.artisan.jam -= perGood;
  next.artisan.sauce -= perGood;
  const newBonus = Math.min(FEAST_MAX_BONUS, (next.feastBonusPercent ?? 0) + tier.bonusPercent);
  next.feastBonusPercent = newBonus;
  next.feastTierIndex = tierIdx + 1;
  return next;
}
 
// ─── Farm unlock (season 4+) ──────────────────────────────────────────────────
 
export function unlockExtraFarm(state, cropId) {
  if (!state.pendingFarmUnlock) return state;
  if (!EXTRA_FARM_CROPS.includes(cropId)) return state;
  const cost = getNextFarmUnlockCost(state);
  if ((state.cash ?? 0) < cost) return state;
  const next = deepCloneState(state);
  next.cash -= cost;
  next.extraFarmsUnlocked = (next.extraFarmsUnlocked ?? 0) + 1;
  next.pendingFarmUnlock = false;
  next.farms.push(makeFarm(cropId, true));
  return next;
}
 
// ─── Prestige ─────────────────────────────────────────────────────────────────
 
export function beginPrestige(state, chosenBonusId, keptWorkerId) {
  const next = deepCloneState(state);
  const newSeason = next.season + 1;
 
  if (chosenBonusId) next.prestigeBonuses.push(chosenBonusId);
 
  const keptWorkers = [...(next.keptWorkers ?? [])];
  if (keptWorkerId) {
    const worker = next.workers.find((w) => w.id === keptWorkerId);
    if (worker) keptWorkers.push({ ...worker, farmId: null });
  }
  next.keptWorkers = keptWorkers;
  next.workers = [];
 
  // Keep 10% of crops
  for (const cropId of Object.keys(next.crops)) {
    next.crops[cropId] = Math.floor((next.crops[cropId] ?? 0) * 0.1);
  }
 
  // Reset artisan goods and kitchen
  next.artisan = { bread: 0, jam: 0, sauce: 0 };
  next.processingQueue = [];
  next.yieldPool = 0;
  next.kitchenPurchased = false;
  next.kitchenSlotCount = 1;
  next.kitchenSlots = [makeKitchenSlot(0)];
  next.marketQueue = [];
 
  // Season 4+: offer a new farm slot instead of auto-adding one
  if (newSeason >= FIRST_EXTRA_FARM_SEASON) {
    next.pendingFarmUnlock = true;
  } else {
    // Seasons 2 and 3: auto-add the fixed farm
    const newFarmCrops = SEASON_FARMS[newSeason] ?? [];
    const existingCropIds = next.farms.map((f) => f.crop);
    for (const cropId of newFarmCrops) {
      if (!existingCropIds.includes(cropId)) {
        next.farms.push(makeFarm(cropId, true));
      }
    }
  }
 
  // Reset plot states, keep unlockedPlots + upgraded
  for (const farm of next.farms) {
    farm.plots = farm.plots.map((plot, idx) => ({
      ...plot,
      state: idx === 0 ? "planted" : "empty",
      growthTick: idx === 0 ? Math.floor(CROPS[farm.crop].growTime / 2) : 0,
    }));
  }
 
  // head_start: auto-hire one free worker per farm
  if (next.prestigeBonuses.includes("head_start")) {
    const startWithGloves = next.prestigeBonuses.includes("fast_hands");
    const farmsForNewSeason = newSeason >= FIRST_EXTRA_FARM_SEASON
      ? next.farms  // all existing farms
      : next.farms.filter((f) => (SEASON_FARMS[newSeason] ?? []).includes(f.crop));
    for (const farm of farmsForNewSeason) {
      const w = makeWorker(farm.id, startWithGloves);
      const cs = getEffectiveCycleSeconds(w);
      w.cycleProgress = cs - 1;
      next.workers.push(w);
    }
  }
 
  next.season = newSeason;
  next.lastSavedTime = Date.now();
  next.pendingWorkerAssignments = keptWorkers.length > 0;
 
  return next;
}
 
export function assignKeptWorker(state, keptWorkerId, farmId) {
  const next = deepCloneState(state);
  const workerIdx = next.keptWorkers.findIndex((w) => w.id === keptWorkerId);
  if (workerIdx === -1) return state;
  const farm = next.farms.find((f) => f.id === farmId);
  if (!farm) return state;
  const cs = getEffectiveCycleSeconds(next.keptWorkers[workerIdx]);
  const worker = {
    ...next.keptWorkers[workerIdx],
    farmId,
    cycleProgress: cs - 1,
    cycleCount: 0,
  };
  next.workers.push(worker);
  next.keptWorkers.splice(workerIdx, 1);
  if (next.keptWorkers.length === 0) next.pendingWorkerAssignments = false;
  return next;
}
 
export function canPrestige(state) {
  const farmsToCheck = state.season >= FIRST_EXTRA_FARM_SEASON
    ? state.farms
    : state.farms.filter((f) => (SEASON_FARMS[Math.min(state.season, 3)] ?? []).includes(f.crop));
  for (const farm of farmsToCheck) {
    if (!isFarmAutomated(farm, state.workers)) return false;
  }
  const threshold = getPrestigeCashThreshold(state.season);
  if ((state.cash ?? 0) < threshold) return false;
  return true;
}
 
export function getPrestigeBlockers(state) {
  const blockers = [];
  const farmsToCheck = state.season >= FIRST_EXTRA_FARM_SEASON
    ? state.farms
    : state.farms.filter((f) => (SEASON_FARMS[Math.min(state.season, 3)] ?? []).includes(f.crop));
  for (const farm of farmsToCheck) {
    if (!isFarmAutomated(farm, state.workers)) {
      const crop = CROPS[farm.crop];
      blockers.push(`${crop.emoji} ${crop.name} farm not automated`);
    }
  }
  const threshold = getPrestigeCashThreshold(state.season);
  const cash = state.cash ?? 0;
  if (cash < threshold) {
    blockers.push(`Need $${threshold} cash (have $${Math.floor(cash)})`);
  }
  return blockers;
}
 
export function serializeState(state) {
  return JSON.stringify({ ...state, lastSavedTime: Date.now() });
}
 
export function deserializeState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.farms) || !Array.isArray(parsed.workers)) return null;
 
    // Legacy migrations
    if (parsed.kitchenUnlocked !== undefined && parsed.kitchenPurchased === undefined) {
      parsed.kitchenPurchased = parsed.kitchenUnlocked;
    }
    for (const worker of parsed.workers ?? []) {
      if (worker.cycleCount === undefined) worker.cycleCount = 0;
    }
    for (const farm of parsed.farms ?? []) {
      for (const plot of farm.plots ?? []) {
        if (plot.upgraded === undefined) plot.upgraded = false;
      }
    }
    if (parsed.yieldPool === undefined) parsed.yieldPool = 0;
    if (parsed.keptWorkers === undefined) parsed.keptWorkers = [];
    if (parsed.pendingWorkerAssignments === undefined) parsed.pendingWorkerAssignments = false;
    if (parsed.artisan === undefined) parsed.artisan = { bread: 0, jam: 0, sauce: 0 };
    if (parsed.kitchenPurchased === undefined) parsed.kitchenPurchased = false;
    if (parsed.kitchenSlotCount === undefined) parsed.kitchenSlotCount = 1;
    if (parsed.kitchenSlots === undefined) parsed.kitchenSlots = [makeKitchenSlot(0)];
    if (parsed.feastBonusPercent === undefined) parsed.feastBonusPercent = 0;
    if (parsed.feastTierIndex === undefined) parsed.feastTierIndex = 0;
    if (parsed.marketUnlocked === undefined) parsed.marketUnlocked = false;
    if (parsed.marketQueue === undefined) parsed.marketQueue = [];
    if (parsed.cash === undefined) parsed.cash = 0;
    if (parsed.lifetimeCash === undefined) parsed.lifetimeCash = 0;
    if (parsed.extraFarmsUnlocked === undefined) parsed.extraFarmsUnlocked = 0;
    if (parsed.pendingFarmUnlock === undefined) parsed.pendingFarmUnlock = false;
 
    if (Array.isArray(parsed.prestigeBonuses)) {
      parsed.prestigeBonuses = parsed.prestigeBonuses.map((b) =>
        b === "bigger_kitchen" ? "market_savvy" : b
      );
    }
 
    return parsed;
  } catch { return null; }
}
 
function deepCloneState(state) {
  return JSON.parse(JSON.stringify(state));
}