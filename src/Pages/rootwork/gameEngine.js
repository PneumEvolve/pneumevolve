// src/Pages/rootwork/gameEngine.js
 
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  PLOT_COSTS,
  MAX_PLOTS,
  WORKER_HIRE_BASE_COST,
  WORKER_HIRE_MULTIPLIER,
  SPECIALIZATIONS,
  SEASON_FARMS,
  AUTOMATION_THRESHOLD,
  MAX_OFFLINE_SECONDS,
  PROCESSING_RECIPES,
  GEAR_CROP_COSTS,
  TEND_SECONDS,
  SPECIALIZE_COST,
  SPECIALIZE_CROP,
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
 
// ─── Initial state ────────────────────────────────────────────────────────────
 
export function createInitialState() {
  const firstFarm = makeFarm("wheat", true);
  return {
    season: 1,
    prestigeBonuses: [],
    keptWorkers: [],
    yieldPool: 0,
    farms: [firstFarm],
    workers: [],
    crops: { wheat: 0, berries: 0, tomatoes: 0 },
    processed: { jam: 0, sauce: 0, feast: 0 },
    processingQueue: [],
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
  for (const tier of PLOT_COSTS) {
    if (currentPlotCount < tier.upTo) return tier.cost;
  }
  return null;
}
 
export function isFarmAutomated(farm, workers) {
  return workers.filter((w) => w.farmId === farm.id).length >= AUTOMATION_THRESHOLD;
}
 
export function getAvailableFarms(season) {
  return SEASON_FARMS[season] ?? SEASON_FARMS[1];
}
 
export function needsSpecialization(worker) {
  return worker.gear === "hoe" && worker.specialization === "none";
}
 
// Cost to hire the next worker on a farm — scales with how many workers are already there
export function getWorkerHireCost(state, farmId) {
  const workersOnFarm = state.workers.filter((w) => w.farmId === farmId).length;
  const raw = WORKER_HIRE_BASE_COST * Math.pow(WORKER_HIRE_MULTIPLIER, workersOnFarm);
  return Math.round(raw / 5) * 5; // round to nearest 5
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
  const remainingPool = newPool - bonus;
  return { crops: whole + bonus, newPool: remainingPool };
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
 
export function getEffectiveGrowTime(farm, workers, cropId) {
  const crop = CROPS[cropId];
  const growers = workers.filter((w) => w.farmId === farm.id && w.specialization === "grower");
  if (growers.length === 0) return crop.growTime;
  let time = crop.growTime;
  for (let i = 0; i < growers.length; i++) {
    time = Math.floor(time * SPECIALIZATIONS.grower.growMultiplier);
  }
  return Math.max(5, time);
}
 
// ─── Offline progress ─────────────────────────────────────────────────────────
 
export function calculateOfflineProgress(state, nowMs) {
  const lastSaved = state.lastSavedTime ?? nowMs;
  const rawSeconds = Math.floor((nowMs - lastSaved) / 1000);
  const seconds = Math.min(rawSeconds, MAX_OFFLINE_SECONDS);
  if (seconds <= 0) return { state, offlineSeconds: 0 };
 
  let next = deepCloneState(state);
 
  for (const farm of next.farms) {
    const crop = CROPS[farm.crop];
    const farmWorkers = next.workers.filter((w) => w.farmId === farm.id);
    const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop);
 
    for (const plot of farm.plots) {
      if (plot.state === "planted") {
        plot.growthTick = Math.min(plot.growthTick + seconds, growTime);
        if (plot.growthTick >= growTime) plot.state = "ready";
      }
    }
 
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
 
        for (const plot of farm.plots) {
          if (plot.state === "empty") { plot.state = "planted"; plot.growthTick = 0; }
        }
      }
    }
  }
 
  for (const item of next.processingQueue) {
    if (!item.done) {
      item.elapsedSeconds = Math.min((item.elapsedSeconds ?? 0) + seconds, item.totalSeconds);
      if (item.elapsedSeconds >= item.totalSeconds) {
        item.done = true;
        next.processed[item.recipeId] = (next.processed[item.recipeId] ?? 0) + item.outputAmount;
      }
    }
  }
 
  next.processingQueue = next.processingQueue.filter((i) => !i.done);
  next.lastSavedTime = nowMs;
  next.totalPlayTime = (next.totalPlayTime ?? 0) + seconds;
  return { state: next, offlineSeconds: seconds };
}
 
// ─── Tick ─────────────────────────────────────────────────────────────────────
 
export function tick(state) {
  let next = deepCloneState(state);
 
  for (const farm of next.farms) {
    const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop);
    const farmWorkers = next.workers.filter((w) => w.farmId === farm.id);
 
    for (const plot of farm.plots) {
      if (plot.state === "planted") {
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
 
          for (const plot of farm.plots) {
            if (plot.state === "empty") { plot.state = "planted"; plot.growthTick = 0; }
          }
        }
      }
    }
  }
 
  for (const item of next.processingQueue) {
    if (!item.done) {
      item.elapsedSeconds = (item.elapsedSeconds ?? 0) + 1;
      if (item.elapsedSeconds >= item.totalSeconds) {
        item.done = true;
        next.processed[item.recipeId] = (next.processed[item.recipeId] ?? 0) + item.outputAmount;
      }
    }
  }
 
  next.processingQueue = next.processingQueue.filter((i) => !i.done);
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
  const growTime = getEffectiveGrowTime(farm, next.workers, farm.crop);
  plot.growthTick = Math.min(plot.growthTick + TEND_SECONDS, growTime);
  if (plot.growthTick >= growTime) plot.state = "ready";
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
  next.workers.push(makeWorker(farmId, startWithGloves));
  return next;
}
 
export function sellWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  const farm = next.farms.find((f) => f.id === worker.farmId);
  if (!farm) return state;
  // Refund is based on what the previous worker cost (one step back in the curve)
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
 
export function startProcessing(state, recipeId) {
  const next = deepCloneState(state);
  const recipe = PROCESSING_RECIPES[recipeId];
  if (!recipe) return state;
  if (recipe.season > next.season) return state;
  const maxSlots = 1 + next.prestigeBonuses.filter((b) => b === "bigger_kitchen").length;
  const activeItems = next.processingQueue.filter((i) => !i.done);
  if (activeItems.length >= maxSlots) return state;
  for (const [cropId, amount] of Object.entries(recipe.inputs)) {
    if ((next.crops[cropId] ?? 0) < amount) return state;
  }
  for (const [cropId, amount] of Object.entries(recipe.inputs)) {
    next.crops[cropId] -= amount;
  }
  next.processingQueue.push({
    id: genId("proc"),
    recipeId,
    totalSeconds: recipe.seconds,
    elapsedSeconds: 0,
    outputAmount: recipe.outputAmount,
    done: false,
  });
  return next;
}
 
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
 
  for (const cropId of Object.keys(next.crops)) {
    next.crops[cropId] = Math.floor((next.crops[cropId] ?? 0) * 0.1);
  }
 
  next.processed = { jam: 0, sauce: 0, feast: 0 };
  next.processingQueue = [];
  next.yieldPool = 0;
 
  const newFarmCrops = SEASON_FARMS[newSeason] ?? [];
  const existingCropIds = next.farms.map((f) => f.crop);
  for (const cropId of newFarmCrops) {
    if (!existingCropIds.includes(cropId)) {
      next.farms.push(makeFarm(cropId, true));
    }
  }
 
  for (const farm of next.farms) {
    const crop = CROPS[farm.crop];
    farm.plots = farm.plots.map((_, idx) =>
      makePlot(undefined, idx === 0, crop.growTime)
    );
  }
 
  if (next.prestigeBonuses.includes("head_start")) {
    const startWithGloves = next.prestigeBonuses.includes("fast_hands");
    for (const farm of next.farms) {
      if ((SEASON_FARMS[newSeason] ?? []).includes(farm.crop)) {
        next.workers.push(makeWorker(farm.id, startWithGloves));
      }
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
 
  const worker = { ...next.keptWorkers[workerIdx], farmId, cycleProgress: 0, cycleCount: 0 };
  next.workers.push(worker);
  next.keptWorkers.splice(workerIdx, 1);
 
  if (next.keptWorkers.length === 0) next.pendingWorkerAssignments = false;
  return next;
}
 
export function canPrestige(state) {
  const availableCrops = SEASON_FARMS[state.season] ?? [];
  for (const cropId of availableCrops) {
    const farm = state.farms.find((f) => f.crop === cropId);
    if (!farm) return false;
    if (!isFarmAutomated(farm, state.workers)) return false;
  }
  return true;
}
 
export function serializeState(state) {
  return JSON.stringify({ ...state, lastSavedTime: Date.now() });
}
 
export function deserializeState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.farms) || !Array.isArray(parsed.workers)) return null;
    for (const worker of parsed.workers) {
      if (worker.cycleCount === undefined) worker.cycleCount = 0;
    }
    if (parsed.yieldPool === undefined) parsed.yieldPool = 0;
    if (parsed.keptWorkers === undefined) parsed.keptWorkers = [];
    if (parsed.pendingWorkerAssignments === undefined) parsed.pendingWorkerAssignments = false;
    return parsed;
  } catch { return null; }
}
 
function deepCloneState(state) {
  return JSON.parse(JSON.stringify(state));
}