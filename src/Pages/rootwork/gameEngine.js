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
  MARKET_WORKER_HIRE_COST,
  MARKET_WORKER_HIRE_MULTIPLIER,
  MARKET_WORKER_GEAR,
  MARKET_WORKER_GEAR_ORDER,
  KITCHEN_WORKER_HIRE_COST,
  KITCHEN_WORKER_HIRE_MULTIPLIER,
  KITCHEN_WORKER_UPGRADES,
  KITCHEN_WORKER_UPGRADE_ORDER,
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

export function makeFarmWorker(farmId, startWithGloves = false) {
  return {
    id: genId("worker"),
    farmId,
    gear: startWithGloves ? "gloves" : "bare_hands",
    specialization: "none",
    cycleProgress: 0,
    cycleCount: 0,
  };
}

export function makeMarketWorker() {
  return {
    id: genId("mworker"),
    gear: "cart",
    queue: [],      // [{ itemType, quantity }]
  };
}

export function makeKitchenWorker() {
  return {
    id: genId("kworker"),
    upgrades: [],
    recipeId: null,       // currently assigned recipe
    elapsedSeconds: 0,
    totalSeconds: 0,
    busy: false,
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
    // Kitchen
    kitchenWorkers: [],
    // Market
    marketWorkers: [],
    cash: 0,
    lifetimeCash: 0,
    // Extra farm unlock (season 4+)
    extraFarmsUnlocked: 0,
    pendingFarmUnlock: false,
    lastSavedTime: Date.now(),
    totalPlayTime: 0,
    pendingWorkerAssignments: false,
  };
}

// ─── Farm helpers ─────────────────────────────────────────────────────────────

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

// ─── Market worker helpers ────────────────────────────────────────────────────

export function getSellRate(itemType, prestigeBonuses = []) {
  const base = MARKET_SELL_RATES[itemType] ?? 0;
  const savvyCount = prestigeBonuses.filter((b) => b === "market_savvy").length;
  if (savvyCount === 0) return base;
  return Math.round(base * Math.pow(1.25, savvyCount) * 100) / 100;
}

export function getMarketWorkerHireCost(state) {
  const count = (state.marketWorkers ?? []).length;
  const raw = MARKET_WORKER_HIRE_COST * Math.pow(MARKET_WORKER_HIRE_MULTIPLIER, count);
  return Math.round(raw / 5) * 5;
}

export function getMarketWorkerNextGear(currentGear) {
  const idx = MARKET_WORKER_GEAR_ORDER.indexOf(currentGear);
  if (idx === -1 || idx === MARKET_WORKER_GEAR_ORDER.length - 1) return null;
  return MARKET_WORKER_GEAR_ORDER[idx + 1];
}

export function getMarketWorkerItemsPerSecond(worker) {
  return MARKET_WORKER_GEAR[worker.gear]?.itemsPerSecond ?? 1;
}

export function getMarketWorkerQueueTotal(worker) {
  return (worker.queue ?? []).reduce((s, o) => s + o.quantity, 0);
}

export function getTotalMarketQueueLength(state) {
  return (state.marketWorkers ?? []).reduce((s, w) => s + getMarketWorkerQueueTotal(w), 0);
}

// ─── Kitchen worker helpers ───────────────────────────────────────────────────

export function getKitchenWorkerHireCost(state) {
  const count = (state.kitchenWorkers ?? []).length;
  const raw = KITCHEN_WORKER_HIRE_COST * Math.pow(KITCHEN_WORKER_HIRE_MULTIPLIER, count);
  return Math.round(raw / 5) * 5;
}

export function getKitchenWorkerSpeedMultiplier(worker) {
  const upgrades = worker.upgrades ?? [];
  if (upgrades.includes("speed_2")) return KITCHEN_WORKER_UPGRADES.speed_2.speedMultiplier;
  if (upgrades.includes("speed_1")) return KITCHEN_WORKER_UPGRADES.speed_1.speedMultiplier;
  return 1;
}

export function getEffectiveKitchenSeconds(worker, baseSeconds) {
  const mult = getKitchenWorkerSpeedMultiplier(worker);
  return Math.max(5, Math.floor(baseSeconds * mult));
}

export function isKitchenWorkerIdle(worker) {
  return !worker.busy && !worker.recipeId;
}

export function getIdleKitchenWorkerCount(state) {
  return (state.kitchenWorkers ?? []).filter(isKitchenWorkerIdle).length;
}

export function canUpgradeKitchenWorker(state, workerId, upgradeId) {
  const worker = (state.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return false;
  const upgrade = KITCHEN_WORKER_UPGRADES[upgradeId];
  if (!upgrade) return false;
  if ((worker.upgrades ?? []).includes(upgradeId)) return false;
  if (upgrade.requires && !(worker.upgrades ?? []).includes(upgrade.requires)) return false;
  if ((state.cash ?? 0) < upgrade.cost) return false;
  return true;
}

// ─── Kitchen worker: start recipe ─────────────────────────────────────────────

function _startKitchenWorkerRecipe(worker, recipeId, crops) {
  const recipe = PROCESSING_RECIPES[recipeId];
  if (!recipe?.inputCrop) return false;
  if ((crops[recipe.inputCrop] ?? 0) < recipe.inputAmount) return false;
  crops[recipe.inputCrop] -= recipe.inputAmount;
  worker.recipeId = recipeId;
  worker.elapsedSeconds = 0;
  worker.totalSeconds = getEffectiveKitchenSeconds(worker, recipe.seconds);
  worker.busy = true;
  return true;
}

// ─── Offline progress ─────────────────────────────────────────────────────────

export function calculateOfflineProgress(state, nowMs) {
  const lastSaved = state.lastSavedTime ?? nowMs;
  const rawSeconds = Math.floor((nowMs - lastSaved) / 1000);

  if (rawSeconds < 0 || rawSeconds > 7 * 24 * 60 * 60) {
    return { state: { ...state, lastSavedTime: nowMs }, offlineSeconds: 0 };
  }

  const seconds = Math.min(rawSeconds, MAX_OFFLINE_SECONDS);
  if (seconds <= 0) return { state, offlineSeconds: 0 };

  let next = deepCloneState(state);
  const feast = next.feastBonusPercent ?? 0;

  // ── Farms ─────────────────────────────────────────────────────────────────
  for (const farm of next.farms) {
    const crop = CROPS[farm.crop];
    const farmWorkers = next.workers.filter((w) => w.farmId === farm.id);

    // Advance pre-existing planted plots
    for (const plot of farm.plots) {
      if (plot.state === "planted" && plot.growthTick > 0) {
        const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop, plot, feast);
        plot.growthTick = Math.min(plot.growthTick + seconds, growTime);
        if (plot.growthTick >= growTime) plot.state = "ready";
      }
    }

    if (farmWorkers.length === 0) continue;

    for (const worker of farmWorkers) {
      const cycleSeconds = getEffectiveCycleSeconds(worker);
      const totalWorkerTime = seconds + worker.cycleProgress;
      const completedCycles = Math.floor(totalWorkerTime / cycleSeconds);
      worker.cycleProgress = totalWorkerTime % cycleSeconds;
      if (completedCycles === 0) continue;

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

        let replanted = 0;
        for (const plot of farm.plots) {
          if (replanted >= plotsPerCycle) break;
          if (plot.state === "empty") {
            plot.state = "planted";
            plot.growthTick = 0;
            replanted++;
          }
        }

        const secondsElapsedSoFar = (c + 1) * cycleSeconds;
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

  // ── Kitchen workers ───────────────────────────────────────────────────────
  for (const worker of next.kitchenWorkers ?? []) {
    if (!worker.busy || !worker.recipeId) continue;

    let timeLeft = seconds;
    let restartCount = 0;
    const maxRestarts = Math.floor(seconds / 5) + 1;

    while (timeLeft > 0 && worker.busy) {
      const remaining = worker.totalSeconds - (worker.elapsedSeconds ?? 0);

      if (timeLeft < remaining) {
        worker.elapsedSeconds += timeLeft;
        timeLeft = 0;
      } else {
        timeLeft -= remaining;
        const recipe = PROCESSING_RECIPES[worker.recipeId];
        next.artisan[recipe.outputGood] = (next.artisan[recipe.outputGood] ?? 0) + recipe.outputAmount;
        worker.elapsedSeconds = 0;
        worker.busy = false;

        // Auto-restart
        const hasAutoRestart = (worker.upgrades ?? []).includes("auto_restart");
        if (hasAutoRestart && timeLeft > 0 && restartCount < maxRestarts) {
          const started = _startKitchenWorkerRecipe(worker, worker.recipeId, next.crops);
          if (started) {
            restartCount++;
          }
          // if couldn't start (out of crops), worker stays idle with recipeId set
        }
      }
    }
  }

  // ── Market workers ────────────────────────────────────────────────────────
  for (const worker of next.marketWorkers ?? []) {
    const itemsPerSecond = getMarketWorkerItemsPerSecond(worker);
    let sellTicks = seconds * itemsPerSecond;

    while (sellTicks > 0 && (worker.queue ?? []).length > 0) {
      const order = worker.queue[0];
      const toSell = Math.min(sellTicks, order.quantity);
      const rate = getSellRate(order.itemType, next.prestigeBonuses);
      order.quantity -= toSell;
      next.cash = (next.cash ?? 0) + toSell * rate;
      next.lifetimeCash = (next.lifetimeCash ?? 0) + toSell * rate;
      sellTicks -= toSell;
      if (order.quantity <= 0) worker.queue.shift();
    }
  }

  next.lastSavedTime = nowMs;
  next.totalPlayTime = (next.totalPlayTime ?? 0) + seconds;
  return { state: next, offlineSeconds: seconds };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

export function tick(state) {
  let next = deepCloneState(state);
  const feast = next.feastBonusPercent ?? 0;

  // ── Farms ──────────────────────────────────────────────────────────────────
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

  // ── Kitchen workers ────────────────────────────────────────────────────────
  for (const worker of next.kitchenWorkers ?? []) {
    if (!worker.busy || !worker.recipeId) continue;

    worker.elapsedSeconds = (worker.elapsedSeconds ?? 0) + 1;
    if (worker.elapsedSeconds >= worker.totalSeconds) {
      const recipe = PROCESSING_RECIPES[worker.recipeId];
      next.artisan[recipe.outputGood] = (next.artisan[recipe.outputGood] ?? 0) + recipe.outputAmount;
      worker.elapsedSeconds = 0;
      worker.busy = false;

      // Auto-restart
      const hasAutoRestart = (worker.upgrades ?? []).includes("auto_restart");
      if (hasAutoRestart) {
        _startKitchenWorkerRecipe(worker, worker.recipeId, next.crops);
      }
    }
  }

  // ── Market workers ─────────────────────────────────────────────────────────
  for (const worker of next.marketWorkers ?? []) {
    const itemsPerSecond = getMarketWorkerItemsPerSecond(worker);
    let toSellThisTick = itemsPerSecond;

    while (toSellThisTick > 0 && (worker.queue ?? []).length > 0) {
      const order = worker.queue[0];
      const toSell = Math.min(toSellThisTick, order.quantity);
      const rate = getSellRate(order.itemType, next.prestigeBonuses);
      order.quantity -= toSell;
      next.cash = (next.cash ?? 0) + toSell * rate;
      next.lifetimeCash = (next.lifetimeCash ?? 0) + toSell * rate;
      toSellThisTick -= toSell;
      if (order.quantity <= 0) worker.queue.shift();
    }
  }

  next.totalPlayTime = (next.totalPlayTime ?? 0) + 1;
  return next;
}

// ─── Farm actions ─────────────────────────────────────────────────────────────

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
  const newWorker = makeFarmWorker(farmId, startWithGloves);
  const cycleSeconds = getEffectiveCycleSeconds(newWorker);
  newWorker.cycleProgress = cycleSeconds - 1;
  next.workers.push(newWorker);
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

// ─── Market worker actions ────────────────────────────────────────────────────

export function hireMarketWorker(state) {
  const next = deepCloneState(state);
  const cost = getMarketWorkerHireCost(next);
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  next.marketWorkers = [...(next.marketWorkers ?? []), makeMarketWorker()];
  return next;
}

export function upgradeMarketWorkerGear(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  const nextGear = getMarketWorkerNextGear(worker.gear);
  if (!nextGear) return state;
  const cost = MARKET_WORKER_GEAR[nextGear].upgradeCost;
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  worker.gear = nextGear;
  return next;
}

export function assignItemToMarketWorker(state, workerId, itemType, quantity) {
  if (quantity <= 0) return state;
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;

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

  const queue = worker.queue ?? [];
  const last = queue[queue.length - 1];
  if (last && last.itemType === itemType) {
    last.quantity += quantity;
  } else {
    queue.push({ id: genId("sale"), itemType, quantity });
    worker.queue = queue;
  }
  return next;
}

export function fireMarketWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.marketWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;

  // Refund any queued items back to inventory
  for (const order of worker.queue ?? []) {
    if (order.itemType in (next.crops ?? {})) {
      next.crops[order.itemType] = (next.crops[order.itemType] ?? 0) + order.quantity;
    } else if (order.itemType in (next.artisan ?? {})) {
      next.artisan[order.itemType] = (next.artisan[order.itemType] ?? 0) + order.quantity;
    }
  }
  next.marketWorkers = next.marketWorkers.filter((w) => w.id !== workerId);
  return next;
}

// ─── Kitchen worker actions ───────────────────────────────────────────────────

export function hireKitchenWorker(state) {
  const next = deepCloneState(state);
  const cost = getKitchenWorkerHireCost(next);
  if ((next.cash ?? 0) < cost) return state;
  next.cash -= cost;
  next.kitchenWorkers = [...(next.kitchenWorkers ?? []), makeKitchenWorker()];
  return next;
}

export function assignKitchenWorkerRecipe(state, workerId, recipeId) {
  const next = deepCloneState(state);
  const worker = (next.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  if (worker.busy) return state;
  const started = _startKitchenWorkerRecipe(worker, recipeId, next.crops);
  if (!started) return state;
  return next;
}

export function upgradeKitchenWorker(state, workerId, upgradeId) {
  if (!canUpgradeKitchenWorker(state, workerId, upgradeId)) return state;
  const next = deepCloneState(state);
  const worker = next.kitchenWorkers.find((w) => w.id === workerId);
  const upgrade = KITCHEN_WORKER_UPGRADES[upgradeId];
  next.cash -= upgrade.cost;
  worker.upgrades = [...(worker.upgrades ?? []), upgradeId];
  return next;
}

export function fireKitchenWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = (next.kitchenWorkers ?? []).find((w) => w.id === workerId);
  if (!worker) return state;
  // Refund 50% of current recipe input if mid-craft
  if (worker.busy && worker.recipeId) {
    const recipe = PROCESSING_RECIPES[worker.recipeId];
    if (recipe?.inputCrop) {
      next.crops[recipe.inputCrop] = (next.crops[recipe.inputCrop] ?? 0) + Math.floor(recipe.inputAmount * 0.5);
    }
  }
  next.kitchenWorkers = next.kitchenWorkers.filter((w) => w.id !== workerId);
  return next;
}

// ─── Feast ────────────────────────────────────────────────────────────────────

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

export function getNextFarmUnlockCost(state) {
  return getFarmUnlockCost(state.extraFarmsUnlocked ?? 0);
}

export function canUnlockFarm(state) {
  if (!state.pendingFarmUnlock) return false;
  return (state.cash ?? 0) >= getNextFarmUnlockCost(state);
}

// ─── Prestige ─────────────────────────────────────────────────────────────────

export function beginPrestige(state, chosenBonusId, keptWorkerId) {
  const next = deepCloneState(state);
  const newSeason = next.season + 1;

  if (chosenBonusId) next.prestigeBonuses.push(chosenBonusId);

  // Accumulate kept workers — all previous + new choice
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

  // Artisan goods fully carry over — no reset
  // Kitchen and market workers reset
  next.kitchenWorkers = [];
  next.marketWorkers = [];
  next.yieldPool = 0;

  // Season 4+: offer a new farm slot
  if (newSeason >= FIRST_EXTRA_FARM_SEASON) {
    next.pendingFarmUnlock = true;
  } else {
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
      ? next.farms
      : next.farms.filter((f) => (SEASON_FARMS[newSeason] ?? []).includes(f.crop));
    for (const farm of farmsForNewSeason) {
      const w = makeFarmWorker(farm.id, startWithGloves);
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

// ─── Serialization ────────────────────────────────────────────────────────────

export function serializeState(state) {
  return JSON.stringify({ ...state, lastSavedTime: Date.now() });
}

export function deserializeState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.farms) || !Array.isArray(parsed.workers)) return null;

    // ── Legacy migrations ──────────────────────────────────────────────────
    // Old kitchen slot system → new kitchen worker system
    if (parsed.kitchenWorkers === undefined) {
      parsed.kitchenWorkers = [];
      // Migrate old processing queue items into kitchen workers
      const oldQueue = parsed.processingQueue ?? [];
      const activeItems = oldQueue.filter((i) => !i.done);
      for (const item of activeItems) {
        const worker = makeKitchenWorker();
        worker.recipeId = item.recipeId;
        worker.elapsedSeconds = item.elapsedSeconds ?? 0;
        worker.totalSeconds = item.totalSeconds ?? 120;
        worker.busy = true;
        parsed.kitchenWorkers.push(worker);
      }
    }
    delete parsed.processingQueue;
    delete parsed.kitchenPurchased;
    delete parsed.kitchenSlotCount;
    delete parsed.kitchenSlots;

    // Old market queue → new market worker system
    if (parsed.marketWorkers === undefined) {
      parsed.marketWorkers = [];
      const oldQueue = parsed.marketQueue ?? [];
      if (oldQueue.length > 0) {
        const worker = makeMarketWorker();
        worker.queue = oldQueue.map((o) => ({ ...o }));
        parsed.marketWorkers.push(worker);
      }
    }
    delete parsed.marketQueue;
    delete parsed.marketUnlocked;

    // Worker rename: makeWorker → makeFarmWorker (id prefix changed)
    for (const worker of parsed.workers ?? []) {
      if (worker.cycleCount === undefined) worker.cycleCount = 0;
    }
    for (const farm of parsed.farms ?? []) {
      for (const plot of farm.plots ?? []) {
        if (plot.upgraded === undefined) plot.upgraded = false;
      }
    }

    // Standard defaults
    if (parsed.yieldPool === undefined) parsed.yieldPool = 0;
    if (parsed.keptWorkers === undefined) parsed.keptWorkers = [];
    if (parsed.pendingWorkerAssignments === undefined) parsed.pendingWorkerAssignments = false;
    if (parsed.artisan === undefined) parsed.artisan = { bread: 0, jam: 0, sauce: 0 };
    if (parsed.feastBonusPercent === undefined) parsed.feastBonusPercent = 0;
    if (parsed.feastTierIndex === undefined) parsed.feastTierIndex = 0;
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