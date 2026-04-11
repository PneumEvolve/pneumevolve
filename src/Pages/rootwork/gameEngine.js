// src/Pages/rootwork/gameEngine.js
 
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  PLOT_COSTS,
  MAX_PLOTS,
  WORKER_HIRE_COST,
  SPECIALIZATIONS,
  SEASON_FARMS,
  AUTOMATION_THRESHOLD,
  MAX_OFFLINE_SECONDS,
  PROCESSING_RECIPES,
  GEAR_CROP_COSTS,
} from "./gameConstants";
 
// ─── ID generator ─────────────────────────────────────────────────────────────
let _idCounter = 0;
function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${++_idCounter}`;
}
 
// ─── Plot factory ─────────────────────────────────────────────────────────────
export function makePlot(id) {
  return {
    id: id ?? genId("plot"),
    state: "empty",
    growthTick: 0,
  };
}
 
// ─── Farm factory ─────────────────────────────────────────────────────────────
export function makeFarm(cropId) {
  return {
    id: genId("farm"),
    crop: cropId,
    plots: [makePlot()],
    unlockedPlots: 1,
  };
}
 
// ─── Worker factory ───────────────────────────────────────────────────────────
export function makeWorker(farmId) {
  return {
    id: genId("worker"),
    farmId,
    gear: "bare_hands",
    specialization: "none",
    cycleProgress: 0,
    cycleCount: 0,
  };
}
 
// ─── Initial state ────────────────────────────────────────────────────────────
export function createInitialState() {
  const firstFarm = makeFarm("wheat");
  return {
    season: 1,
    prestigeBonuses: [],
    farms: [firstFarm],
    workers: [],
    crops: { wheat: 0, berries: 0, tomatoes: 0 },
    processed: { jam: 0, sauce: 0, feast: 0 },
    processingQueue: [],
    lastSavedTime: Date.now(),
    totalPlayTime: 0,
  };
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
export function getFarmCrop(farm) {
  return CROPS[farm.crop];
}
 
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
  const assigned = workers.filter((w) => w.farmId === farm.id);
  return assigned.length >= AUTOMATION_THRESHOLD;
}
 
export function getAvailableFarms(season) {
  return SEASON_FARMS[season] ?? SEASON_FARMS[1];
}
 
export function applyYieldBonuses(baseYield, prestigeBonuses) {
  let multiplier = 1;
  const yieldBoosts = prestigeBonuses.filter((b) => b === "yield_boost").length;
  multiplier += yieldBoosts * 0.1;
  return Math.floor(baseYield * multiplier);
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
  const restEvery = SPECIALIZATIONS.sprinter.restEvery;
  return (worker.cycleCount ?? 0) % restEvery === restEvery - 1;
}
 
export function getEffectiveGrowTime(farm, workers, cropId) {
  const crop = CROPS[cropId];
  const growers = workers.filter(
    (w) => w.farmId === farm.id && w.specialization === "grower"
  );
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
            const yield_ = applyYieldBonuses(crop.workerYield, next.prestigeBonuses);
            next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + yield_;
            plot.state = "empty";
            plot.growthTick = 0;
            harvested++;
          }
        }
 
        for (const plot of farm.plots) {
          if (plot.state === "empty") {
            plot.state = "planted";
            plot.growthTick = 0;
          }
        }
      }
    }
  }
 
  for (const item of next.processingQueue) {
    if (!item.done) {
      item.elapsedSeconds = Math.min(
        (item.elapsedSeconds ?? 0) + seconds,
        item.totalSeconds
      );
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
              const yield_ = applyYieldBonuses(crop.workerYield, next.prestigeBonuses);
              next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + yield_;
              plot.state = "empty";
              plot.growthTick = 0;
              harvested++;
            }
          }
 
          for (const plot of farm.plots) {
            if (plot.state === "empty") {
              plot.state = "planted";
              plot.growthTick = 0;
            }
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
  const yield_ = applyYieldBonuses(crop.manualYield, next.prestigeBonuses);
  next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + yield_;
  plot.state = "empty";
  plot.growthTick = 0;
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
  const hasFreeWorker =
    next.prestigeBonuses.includes("free_worker") &&
    next.workers.filter((w) => w.farmId === farmId).length === 0;
  const cost = hasFreeWorker ? 0 : WORKER_HIRE_COST;
  if ((next.crops[cropId] ?? 0) < cost) return state;
  next.crops[cropId] -= cost;
  next.workers.push(makeWorker(farmId));
  return next;
}
 
// Sell a worker — refunds 50% of hire cost in that farm's crop
export function sellWorker(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  const farm = next.farms.find((f) => f.id === worker.farmId);
  if (!farm) return state;
  const refund = Math.floor(WORKER_HIRE_COST * 0.5);
  next.crops[farm.crop] = (next.crops[farm.crop] ?? 0) + refund;
  next.workers = next.workers.filter((w) => w.id !== workerId);
  return next;
}
 
export function upgradeWorkerGear(state, workerId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
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
 
export function setWorkerSpecialization(state, workerId, specializationId) {
  const next = deepCloneState(state);
  const worker = next.workers.find((w) => w.id === workerId);
  if (!worker) return state;
  if (!SPECIALIZATIONS[specializationId]) return state;
  worker.specialization = specializationId;
  worker.cycleCount = 0;
  return next;
}
 
export function startProcessing(state, recipeId) {
  const next = deepCloneState(state);
  const recipe = PROCESSING_RECIPES[recipeId];
  if (!recipe) return state;
  if (recipe.season > next.season) return state;
  const maxSlots =
    1 + next.prestigeBonuses.filter((b) => b === "processing_slot").length;
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
 
export function prestige(state, chosenBonusId) {
  const next = deepCloneState(state);
  const newSeason = next.season + 1;
  const hasGearCarry = next.prestigeBonuses.includes("gear_carry");
 
  for (const worker of next.workers) {
    if (!hasGearCarry) {
      worker.gear = "bare_hands";
    } else {
      const idx = GEAR_ORDER.indexOf(worker.gear);
      worker.gear = GEAR_ORDER[Math.max(0, idx - 1)];
    }
    worker.cycleProgress = 0;
    worker.cycleCount = 0;
    worker.specialization = "none";
  }
 
  if (chosenBonusId) next.prestigeBonuses.push(chosenBonusId);
 
  for (const cropId of Object.keys(next.crops)) {
    next.crops[cropId] = Math.floor((next.crops[cropId] ?? 0) * 0.1);
  }
 
  next.processed = { jam: 0, sauce: 0, feast: 0 };
  next.processingQueue = [];
 
  const newFarmCrops = SEASON_FARMS[newSeason] ?? [];
  const existingCropIds = next.farms.map((f) => f.crop);
  for (const cropId of newFarmCrops) {
    if (!existingCropIds.includes(cropId)) {
      next.farms.push(makeFarm(cropId));
    }
  }
 
  for (const farm of next.farms) {
    farm.plots = farm.plots.map(() => makePlot());
  }
 
  next.season = newSeason;
  next.lastSavedTime = Date.now();
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
    return parsed;
  } catch {
    return null;
  }
}
 
function deepCloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
 