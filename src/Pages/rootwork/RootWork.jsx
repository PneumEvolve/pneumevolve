// src/Pages/rootwork/RootWork.jsx
 
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  createInitialState, tick, calculateOfflineProgress,
  serializeState, deserializeState,
  plantPlot, harvestPlot, tendPlot, upgradePlot, buyPlot,
  hireWorker, sellWorker, upgradeWorkerGear, specializeWorker,
  buyFeast, beginPrestige, assignKeptWorker, canPrestige, getPrestigeBlockers,
  hireMarketWorker, upgradeMarketWorkerGear, assignItemToMarketWorker,
  fireMarketWorker, hireKitchenWorker, assignKitchenWorkerRecipe,
  upgradeKitchenWorker, fireKitchenWorker, unlockExtraFarm,
  buyPlotCapUpgrade, buyYieldUpgrade, buyMarketWorkerStandingOrder,
  setMarketWorkerStandingOrder, cancelMarketWorkerQueue,
  cancelKitchenWorkerRecipe, buildTownHome, buyTownBakery,
  buyJamBuilding, buySauceBuilding, toggleBakery, togglePantry,
  toggleCannery, upgradeTownBuilding, upgradeTownHall, setTreasuryTier,
  buildBank, upgradeBank, setActiveBankTier, buyPond, upgradeRod, buyFishTrap, catchFish, applyGoldenBonus,
  buyAnimal, collectAnimal, collectAllAnimals, interactAnimal, buyPet, interactPet, toggleKitchenWorkerAutoRestart,
  hireBarnWorker, fireBarnWorker, reassignBarnWorker, applyFishMeal
} from "./gameEngine";
import {
  SAVE_KEY, SAVE_INTERVAL_MS, PRESTIGE_BONUSES,
  CROPS, GEAR, SPECIALIZATIONS, KITCHEN_WORKER_UPGRADES, MARKET_WORKER_GEAR,
} from "./gameConstants";
import GameNav, { FarmSubTabs } from "./components/GameNav";
import ResourceBar from "./components/ResourceBar";
import FarmZone from "./components/FarmZone";
import ProcessingZone from "./components/ProcessingZone";
import MarketZone from "./components/MarketZone";
import FarmUnlockModal from "./components/FarmUnlockModal";
import TownZone from "./components/TownZone";
import AnimalsZone from "./components/AnimalsZone";
 
function loadFromLocalStorage() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; return deserializeState(raw); } catch { return null; }
}
function saveToLocalStorage(state) {
  try { localStorage.setItem(SAVE_KEY, serializeState(state)); } catch {}
}
 
// ─── Prestige modal ───────────────────────────────────────────────────────────
 
function PrestigeModal({ game, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [chosenBonus, setChosenBonus] = useState(null);
  const [chosenWorkerIds, setChosenWorkerIds] = useState([]);
 
  const allWorkers = [
    ...game.workers.map((w) => ({ ...w, _type: "farm" })),
    ...game.kitchenWorkers.map((w) => ({ ...w, _type: "kitchen" })),
    ...game.marketWorkers.map((w) => ({ ...w, _type: "market" })),
  ];
 
  function workerLabel(worker) {
    if (worker._type === "farm") {
      const gear = GEAR[worker.gear];
      const spec = SPECIALIZATIONS[worker.specialization];
      const farm = game.farms.find((f) => f.id === worker.farmId);
      const farmCrop = farm ? CROPS[farm.crop] : null;
      return { title: `👷 ${gear.emoji} ${gear.name}${spec && spec.id !== "none" ? ` · ${spec.emoji} ${spec.name}` : ""}`, subtitle: farmCrop ? `${farmCrop.emoji} ${farmCrop.name} Farm` : "Farm worker", typeLabel: "Farm", typeColor: "#4ade80" };
    }
    if (worker._type === "kitchen") {
      const upgrades = worker.upgrades ?? [];
      const upgradeNames = upgrades.map((u) => KITCHEN_WORKER_UPGRADES[u]?.emoji).filter(Boolean).join(" ");
      return { title: `👨‍🍳 Chef${upgradeNames ? ` ${upgradeNames}` : ""}`, subtitle: upgrades.length > 0 ? upgrades.map((u) => KITCHEN_WORKER_UPGRADES[u]?.name).filter(Boolean).join(", ") : "No upgrades", typeLabel: "Kitchen", typeColor: "#f59e0b" };
    }
    if (worker._type === "market") {
      const gear = MARKET_WORKER_GEAR[worker.gear];
      return { title: `🛒 ${gear.emoji} ${gear.name}`, subtitle: `${gear.itemsPerSecond} item${gear.itemsPerSecond !== 1 ? "s" : ""}/sec${worker.hasStandingOrder ? " · has standing order" : ""}`, typeLabel: "Market", typeColor: "#60a5fa" };
    }
    return { title: "Worker", subtitle: "", typeLabel: "Unknown", typeColor: "var(--muted)" };
  }
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="card p-6 w-full max-w-sm space-y-4" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        {step === 1 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-center">🌱 New Season</h2>
              <p className="text-xs text-center mt-1" style={{ color: "var(--muted)" }}>Step 1 of 2 — Choose a permanent bonus</p>
            </div>
            <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.6 }}>Workers reset. 10% of crops carry over. Artisan goods, cash and treasury carry over fully. Town persists.</p>
            <div className="space-y-2">
              {Object.values(PRESTIGE_BONUSES).map((bonus) => (
                <button key={bonus.id} onClick={() => { setChosenBonus(bonus.id); setStep(2); }} className="w-full text-left card p-3 hover:shadow-md transition" style={{ cursor: "pointer" }}>
                  <div className="font-medium text-sm">{bonus.emoji} {bonus.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{bonus.description}</div>
                </button>
              ))}
            </div>
            <button onClick={onCancel} className="btn btn-secondary w-full text-sm">Cancel</button>
          </>
        )}
        {step === 2 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-center">👷 Keep Workers</h2>
              <p className="text-xs text-center mt-1" style={{ color: "var(--muted)" }}>
                Step 2 of 2 — Pick up to {game.season} worker{game.season !== 1 ? "s" : ""} to carry over
              </p>
            </div>
            <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {chosenWorkerIds.length}/{game.season} selected
            </p>
            {allWorkers.length === 0 ? (
              <p className="text-sm text-center" style={{ color: "var(--muted)" }}>No workers to keep. You'll start fresh.</p>
            ) : (
              <div className="space-y-2">
                {allWorkers.map((worker) => {
                  const { title, subtitle, typeLabel, typeColor } = workerLabel(worker);
                  const isSelected = chosenWorkerIds.includes(worker.id);
                  const atLimit = chosenWorkerIds.length >= game.season;
                  return (
                    <button
                      key={worker.id}
                      onClick={() => {
                        if (isSelected) {
                          setChosenWorkerIds((ids) => ids.filter((id) => id !== worker.id));
                        } else if (!atLimit) {
                          setChosenWorkerIds((ids) => [...ids, worker.id]);
                        }
                      }}
                      className="w-full text-left card p-3 hover:shadow-md transition"
                      style={{
                        cursor: isSelected || !atLimit ? "pointer" : "default",
                        opacity: !isSelected && atLimit ? 0.4 : 1,
                        border: isSelected ? "2px solid var(--accent)" : "2px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="font-medium text-sm">{isSelected ? "✓ " : ""}{title}</div>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "999px", background: `${typeColor}22`, border: `1px solid ${typeColor}55`, color: typeColor }}>{typeLabel}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{subtitle}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => onComplete(chosenBonus, chosenWorkerIds)} className="btn w-full text-sm">
              {chosenWorkerIds.length > 0
                ? `✓ Keep ${chosenWorkerIds.length} worker${chosenWorkerIds.length !== 1 ? "s" : ""} →`
                : "Skip — start with no kept workers"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
 
// ─── Farm assignment screen ───────────────────────────────────────────────────
 
function FarmAssignmentScreen({ game, onAssign }) {
  const keptWorkers = game.keptWorkers ?? [];
  const [assigningWorker, setAssigningWorker] = useState(keptWorkers[0] ?? null);
  if (!assigningWorker) return null;
  const gear = GEAR[assigningWorker.gear];
  const spec = SPECIALIZATIONS[assigningWorker.specialization];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card p-6 w-full max-w-sm space-y-4" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2 className="text-xl font-bold text-center">📍 Assign Kept Workers</h2>
        <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Assigning: <strong>{gear.emoji} {gear.name}</strong>{spec && spec.id !== "none" && ` · ${spec.emoji} ${spec.name}`}
        </p>
        <div className="space-y-2">
          {game.farms.map((farm) => {
            const crop = CROPS[farm.crop];
            const workersHere = game.workers.filter((w) => w.farmId === farm.id).length;
            return (
              <button key={farm.id} onClick={() => { onAssign(assigningWorker.id, farm.id); setAssigningWorker((keptWorkers.filter((w) => w.id !== assigningWorker.id))[0] ?? null); }} className="w-full text-left card p-3 hover:shadow-md transition" style={{ cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{crop.emoji} {crop.name} Farm</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>{workersHere} worker{workersHere !== 1 ? "s" : ""} · Grows in {crop.growTime}s</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
 
// ─── Root component ───────────────────────────────────────────────────────────
 
export default function RootWork() {
  const { accessToken, userId } = useAuth();
  const [game, setGame] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("farms");
  const [activeFarmIndex, setActiveFarmIndex] = useState(0);
  const [offlineMessage, setOfflineMessage] = useState(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const gameRef = useRef(null);
 
  useEffect(() => { if (game) gameRef.current = game; }, [game]);
 
  const notify = useCallback((msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); }, []);
 
  const saveGame = useCallback((state) => {
    if (!state) return;
    saveToLocalStorage(state);
    if (accessToken && userId) {
      api.post("/rootwork/state", { data: serializeState(state) }, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
    }
  }, [accessToken, userId]);
 
  useEffect(() => {
    async function load() {
      let saved = null;
      if (accessToken && userId) {
        try {
          const res = await api.get("/rootwork/state", { headers: { Authorization: `Bearer ${accessToken}` } });
          if (res.data?.data) saved = deserializeState(res.data.data);
        } catch {}
      }
      if (!saved) saved = loadFromLocalStorage();
      if (saved) {
        const { state: withOffline, offlineSeconds } = calculateOfflineProgress(saved, Date.now());
        setGame(withOffline); gameRef.current = withOffline;
        if (offlineSeconds > 60) {
          const mins = Math.floor(offlineSeconds / 60);
          setOfflineMessage(`Welcome back! ${mins} minute${mins !== 1 ? "s" : ""} of progress collected.`);
          setTimeout(() => setOfflineMessage(null), 5000);
        }
      } else {
        const fresh = createInitialState();
        setGame(fresh); gameRef.current = fresh;
      }
      setLoaded(true);
    }
    load();
  }, [accessToken, userId]);
 
  useEffect(() => {
    if (!loaded) return;
    if (showPrestigeModal) return; // pause while modal open
    const interval = setInterval(() => {
      setGame((prev) => { if (!prev) return prev; const next = tick(prev); gameRef.current = next; return next; });
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded, showPrestigeModal]);
 
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => saveGame(gameRef.current), SAVE_INTERVAL_MS);
    const handleVisibilityChange = () => { if (document.visibilityState === "hidden") saveGame(gameRef.current); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", handleVisibilityChange); saveGame(gameRef.current); };
  }, [loaded, saveGame]);
 
  const update = useCallback((fn) => {
    setGame((prev) => { const next = fn(prev); gameRef.current = next; saveToLocalStorage(next); return next; });
  }, []);
 
  // Farm
  const handlePlant = useCallback((farmId, plotId) => update((s) => plantPlot(s, farmId, plotId)), [update]);
  const handleHarvest = useCallback((farmId, plotId) => { update((s) => harvestPlot(s, farmId, plotId)); notify("+crops! 🌾"); }, [update, notify]);
  const handleTend = useCallback((farmId, plotId) => update((s) => tendPlot(s, farmId, plotId)), [update]);
  const handleUpgradePlot = useCallback((farmId) => update((s) => { const n = upgradePlot(s, farmId); if (n === s) notify("Not enough artisan goods."); return n; }), [update, notify]);
  const handleBuyPlot = useCallback((farmId) => update((s) => { const n = buyPlot(s, farmId); if (n === s) notify("Not enough crops."); return n; }), [update, notify]);
  const handleHireWorker = useCallback((farmId) => update((s) => { const n = hireWorker(s, farmId); if (n === s) notify("Not enough crops."); return n; }), [update, notify]);
  const handleSellWorker = useCallback((workerId) => { update((s) => sellWorker(s, workerId)); notify("Worker sold."); }, [update, notify]);
  const handleUpgradeGear = useCallback((workerId) => update((s) => { const n = upgradeWorkerGear(s, workerId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleSpecialize = useCallback((workerId, specId) => update((s) => { const n = specializeWorker(s, workerId, specId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleBuyPlotCapUpgrade = useCallback((farmId) => update((s) => { const n = buyPlotCapUpgrade(s, farmId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleBuyYieldUpgrade = useCallback((farmId) => update((s) => { const n = buyYieldUpgrade(s, farmId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
 
  // Market
  const handleHireMarketWorker = useCallback(() => { update((s) => { const n = hireMarketWorker(s); if (n === s) notify("Not enough cash."); return n; }); notify("🛒 Market worker hired!"); }, [update, notify]);
  const handleUpgradeMarketWorker = useCallback((workerId) => update((s) => { const n = upgradeMarketWorkerGear(s, workerId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleAssignItem = useCallback((workerId, itemType, quantity) => update((s) => { const n = assignItemToMarketWorker(s, workerId, itemType, quantity); if (n === s) notify("Not enough to assign."); return n; }), [update, notify]);
  const handleFireMarketWorker = useCallback((workerId) => { update((s) => fireMarketWorker(s, workerId)); notify("Market worker fired. Items refunded."); }, [update, notify]);
  const handleCancelMarketWorkerQueue = useCallback((workerId) => { update((s) => cancelMarketWorkerQueue(s, workerId)); notify("Queue cleared. Items refunded."); }, [update, notify]);
  const handleBuyMarketWorkerStandingOrder = useCallback((workerId) => { update((s) => { const n = buyMarketWorkerStandingOrder(s, workerId); if (n === s) notify("Not enough cash."); return n; }); notify("🔄 Standing order unlocked!"); }, [update, notify]);
  const handleSetMarketWorkerStandingOrder = useCallback((workerId, itemType) => update((s) => setMarketWorkerStandingOrder(s, workerId, itemType)), [update]);
 
  // Kitchen
  const handleHireKitchenWorker = useCallback(() => { update((s) => { const n = hireKitchenWorker(s); if (n === s) notify("Not enough cash."); return n; }); notify("👨‍🍳 Kitchen worker hired!"); }, [update, notify]);
  const handleAssignKitchenWorkerRecipe = useCallback((workerId, recipeId) => update((s) => { const n = assignKitchenWorkerRecipe(s, workerId, recipeId); if (n === s) notify("Not enough crops to start."); return n; }), [update, notify]);
  const handleCancelKitchenWorkerRecipe = useCallback((workerId) => { update((s) => cancelKitchenWorkerRecipe(s, workerId)); notify("Recipe cancelled. 50% crops refunded."); }, [update, notify]);
  const handleUpgradeKitchenWorker = useCallback((workerId, upgradeId) => update((s) => { const n = upgradeKitchenWorker(s, workerId, upgradeId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleFireKitchenWorker = useCallback((workerId) => { update((s) => fireKitchenWorker(s, workerId)); notify("Kitchen worker fired."); }, [update, notify]);
  const handleToggleKitchenAutoRestart = useCallback((workerId) => update((s) => toggleKitchenWorkerAutoRestart(s, workerId)), [update]);
  const handleApplyFishMeal = useCallback(() => {
  update((s) => { const n = applyFishMeal(s); if (n === s) notify("No fish meal in stock."); return n; });
  notify("🌿 Fish meal applied! +10% grow speed.");
}, [update, notify]);

  // Town
  const handleBuildTownHome = useCallback(() => update((s) => { const n = buildTownHome(s); if (n === s) notify("Not enough treasury funds."); return n; }), [update, notify]);
  const handleBuyTownBakery = useCallback(() => update((s) => { const n = buyTownBakery(s); if (n === s) notify("Requires Town Hall level 1 and treasury funds."); return n; }), [update, notify]);
  const handleToggleBakery = useCallback(() => update((s) => toggleBakery(s)), [update]);
  const handleTogglePantry = useCallback(() => update((s) => togglePantry(s)), [update]);
  const handleToggleCannery = useCallback(() => update((s) => toggleCannery(s)), [update]);
  const handleUpgradeTownBuilding = useCallback((buildingKey) => update((s) => { const n = upgradeTownBuilding(s, buildingKey); if (n === s) notify("Can't upgrade — check Town Hall level and treasury."); return n; }), [update, notify]);
  const handleBuyJamBuilding = useCallback(() => { update((s) => { const n = buyJamBuilding(s); if (n === s) notify("Requires Town Hall level 2 and treasury funds."); return n; }); notify("🍯 Pantry built!"); }, [update, notify]);
  const handleBuySauceBuilding = useCallback(() => { update((s) => { const n = buySauceBuilding(s); if (n === s) notify("Requires Town Hall level 3 and treasury funds."); return n; }); notify("🥫 Cannery built!"); }, [update, notify]);
  const handleUpgradeTownHall = useCallback(() => update((s) => { const n = upgradeTownHall(s); if (n === s) notify("Not enough treasury funds."); return n; }), [update, notify]);
  const handleSetTreasuryTier = useCallback((tier) => update((s) => setTreasuryTier(s, tier)), [update]);
  const handleBuildBank = useCallback(() => update((s) => { const n = buildBank(s); if (n === s) notify("Can't build bank yet."); return n; }), [update, notify]);
  const handleUpgradeBank = useCallback(() => update((s) => { const n = upgradeBank(s); if (n === s) notify("Not enough treasury funds."); return n; }), [update, notify]);
  const handleSetActiveBankTier = useCallback((tier) => update((s) => setActiveBankTier(s, tier)), [update]);
 
  // Animals & Pond
  const handleBuyPond = useCallback(() => update((s) => { const n = buyPond(s); if (n === s) notify("Need $500 cash."); return n; }), [update, notify]);
  const handleUpgradeRod = useCallback(() => update((s) => { const n = upgradeRod(s); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleBuyTrap = useCallback(() => update((s) => { const n = buyFishTrap(s); if (n === s) notify("Need $300 cash."); return n; }), [update, notify]);
  const handleCatchFish = useCallback((fishId, baitId) => update((s) => catchFish(s, fishId, baitId)), [update]);
  const handleGoldenBonus = useCallback((bonusId) => { update((s) => applyGoldenBonus(s, bonusId)); notify("✨ Golden fish bonus!"); }, [update, notify]);
  const handleBuyAnimal = useCallback((animalId) => update((s) => { const n = buyAnimal(s, animalId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleCollectAnimal = useCallback((animalId, instanceId) => update((s) => collectAnimal(s, animalId, instanceId)), [update]);
  const handleCollectAllAnimals = useCallback(() => { update((s) => collectAllAnimals(s)); notify("🧺 All products collected!"); }, [update, notify]);
  const handleInteractAnimal = useCallback((animalId, instanceId) => update((s) => interactAnimal(s, animalId, instanceId)), [update]);
  const handleBuyPet = useCallback((petId) => update((s) => { const n = buyPet(s, petId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleInteractPet = useCallback((petId) => update((s) => interactPet(s, petId)), [update]);
  const handleHireBarnWorker = useCallback((animalType) => update((s) => { const n = hireBarnWorker(s, animalType); if (n === s) notify("Can't hire — check cash or worker cap."); return n; }), [update, notify]);
  const handleFireBarnWorker = useCallback((workerId) => update((s) => fireBarnWorker(s, workerId)), [update]);
  const handleReassignBarnWorker = useCallback((workerId, animalType) => update((s) => reassignBarnWorker(s, workerId, animalType)), [update]);
 
  // Feast / prestige / misc
  const handleBuyFeast = useCallback(() => { update((s) => { const n = buyFeast(s); if (n === s) notify("Not enough artisan goods."); return n; }); notify("🍽️ Feast held! Grow speed increased."); }, [update, notify]);
  const handlePrestigeComplete = useCallback((bonusId, workerIds) => { update((s) => beginPrestige(s, bonusId, workerIds)); setShowPrestigeModal(false); setActiveMainTab("farms"); setActiveFarmIndex(0); notify("🌱 New season begun!"); }, [update, notify]);
  const handleAssignWorker = useCallback((keptWorkerId, farmId) => update((s) => assignKeptWorker(s, keptWorkerId, farmId)), [update]);
  const handleUnlockFarm = useCallback((cropId) => { update((s) => { const n = unlockExtraFarm(s, cropId); if (n === s) notify("Not enough cash."); return n; }); notify("🌾 New farm unlocked!"); }, [update, notify]);
  const handleResetGame = useCallback(() => {
    if (!window.confirm("Reset all progress? This cannot be undone.")) return;
    localStorage.removeItem(SAVE_KEY);
    const fresh = createInitialState();
    setGame(fresh); gameRef.current = fresh;
    setActiveMainTab("farms"); setActiveFarmIndex(0);
    notify("Game reset.");
  }, [notify]);
 
  const prestigeReady = game ? canPrestige(game) : false;
  const hasPendingAssignments = game?.pendingWorkerAssignments && (game?.keptWorkers?.length ?? 0) > 0;
  const hasPendingFarmUnlock = game?.pendingFarmUnlock === true;
 
  if (!loaded || !game) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--muted)" }}><p className="text-sm">Loading RootWork…</p></div>;
  }
 
  const safeFarmIndex = Math.min(activeFarmIndex, game.farms.length - 1);
  const activeFarm = game.farms[safeFarmIndex] ?? null;
 
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {offlineMessage && (
        <div className="text-center text-sm py-2 px-4" style={{ background: "rgba(99, 102, 241, 0.12)", borderBottom: "1px solid var(--border)", color: "var(--text)" }}>{offlineMessage}</div>
      )}
      {notification && (
        <div className="fixed top-4 left-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg" style={{ transform: "translateX(-50%)", background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--text)", zIndex: 60 }}>{notification}</div>
      )}
      <ResourceBar game={game} />
      {activeMainTab === "farms" && <FarmSubTabs game={game} activeFarmIndex={safeFarmIndex} onFarmChange={setActiveFarmIndex} />}
      <div className="flex-1 overflow-auto" style={{ paddingBottom: "4rem" }}>
        {activeMainTab === "farms" && activeFarm && (
          <FarmZone key={activeFarm.id} farm={activeFarm} game={game} onPlant={handlePlant} onHarvest={handleHarvest} onTend={handleTend} onBuyPlot={handleBuyPlot} onHireWorker={handleHireWorker} onSellWorker={handleSellWorker} onUpgradeGear={handleUpgradeGear} onSpecialize={handleSpecialize} onBuyPlotCap={handleBuyPlotCapUpgrade} onBuyYield={handleBuyYieldUpgrade} onUpgradePlot={handleUpgradePlot} />
        )}
        {activeMainTab === "market" && (
          <MarketZone game={game} onHireMarketWorker={handleHireMarketWorker} onAssignItem={handleAssignItem} onUpgradeMarketWorker={handleUpgradeMarketWorker} onFireMarketWorker={handleFireMarketWorker} onBuyMarketWorkerStandingOrder={handleBuyMarketWorkerStandingOrder} onSetMarketWorkerStandingOrder={handleSetMarketWorkerStandingOrder} onCancelQueue={handleCancelMarketWorkerQueue} />
        )}
        {activeMainTab === "crafting" && (
          <ProcessingZone game={game} onHireKitchenWorker={handleHireKitchenWorker} onAssignKitchenWorkerRecipe={handleAssignKitchenWorkerRecipe} onUpgradeKitchenWorker={handleUpgradeKitchenWorker} onFireKitchenWorker={handleFireKitchenWorker} onUpgradePlot={handleUpgradePlot} onBuyFeast={handleBuyFeast} onCancelKitchenWorkerRecipe={handleCancelKitchenWorkerRecipe} onToggleKitchenWorkerAutoRestart={handleToggleKitchenAutoRestart} onApplyFishMeal={handleApplyFishMeal} />
        )}
        {activeMainTab === "town" && (
          <TownZone game={game} onBuildHome={handleBuildTownHome} onBuyBakery={handleBuyTownBakery} onToggleBakery={handleToggleBakery} onTogglePantry={handleTogglePantry} onToggleCannery={handleToggleCannery} onUpgradeTownBuilding={handleUpgradeTownBuilding} onBuyJamBuilding={handleBuyJamBuilding} onBuySauceBuilding={handleBuySauceBuilding} onUpgradeTownHall={handleUpgradeTownHall} onSetTreasuryTier={handleSetTreasuryTier} onBuildBank={handleBuildBank} onUpgradeBank={handleUpgradeBank} onSetActiveBankTier={handleSetActiveBankTier} prestigeReady={prestigeReady} onPrestige={() => setShowPrestigeModal(true)} onReset={handleResetGame} />
        )}
        {activeMainTab === "animals" && (
          <AnimalsZone
            game={game}
            onBuyPond={handleBuyPond}
            onUpgradeRod={handleUpgradeRod}
            onBuyTrap={handleBuyTrap}
            onCatchFish={handleCatchFish}
            onApplyGoldenBonus={handleGoldenBonus}
            onBuyAnimal={handleBuyAnimal}
            onCollectAnimal={handleCollectAnimal}
            onCollectAll={handleCollectAllAnimals}
            onInteractAnimal={handleInteractAnimal}
            onBuyPet={handleBuyPet}
            onInteractPet={handleInteractPet}
            onHireBarnWorker={handleHireBarnWorker}
            onFireBarnWorker={handleFireBarnWorker}
            onReassignBarnWorker={handleReassignBarnWorker}
          />
        )}
      </div>
      <GameNav game={game} activeMainTab={activeMainTab} onMainTabChange={setActiveMainTab} prestigeReady={prestigeReady} />
      {hasPendingFarmUnlock && !hasPendingAssignments && <FarmUnlockModal game={game} onUnlock={handleUnlockFarm} />}
      {hasPendingAssignments && <FarmAssignmentScreen game={game} onAssign={handleAssignWorker} />}
      {showPrestigeModal && <PrestigeModal game={game} onComplete={handlePrestigeComplete} onCancel={() => setShowPrestigeModal(false)} />}
    </div>
  );
}