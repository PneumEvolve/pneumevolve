// src/Pages/rootwork/RootWork.jsx
 
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  createInitialState,
  tick,
  calculateOfflineProgress,
  serializeState,
  deserializeState,
  plantPlot,
  harvestPlot,
  tendPlot,
  upgradePlot,
  buyPlot,
  hireWorker,
  sellWorker,
  upgradeWorkerGear,
  specializeWorker,
  startProcessing,
  buyFeast,
  beginPrestige,
  assignKeptWorker,
  canPrestige,
} from "./gameEngine";
import { SAVE_KEY, SAVE_INTERVAL_MS, PRESTIGE_BONUSES, CROPS, GEAR, SPECIALIZATIONS } from "./gameConstants";
import GameNav from "./components/GameNav";
import ResourceBar from "./components/ResourceBar";
import FarmZone from "./components/FarmZone";
import ProcessingZone from "./components/ProcessingZone";
import SeasonPanel from "./components/SeasonPanel";
 
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return deserializeState(raw);
  } catch { return null; }
}
 
function saveToLocalStorage(state) {
  try { localStorage.setItem(SAVE_KEY, serializeState(state)); } catch {}
}
 
// ─── Prestige modal ───────────────────────────────────────────────────────────
 
function PrestigeModal({ game, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [chosenBonus, setChosenBonus] = useState(null);
 
  function handleBonusPick(bonusId) {
    setChosenBonus(bonusId);
    setStep(2);
  }
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="card p-6 w-full max-w-sm space-y-4" style={{ maxHeight: "90vh", overflowY: "auto" }}>
 
        {step === 1 && (
          <>
            <div>
              <h2 className="text-xl font-bold text-center">🌱 New Season</h2>
              <p className="text-xs text-center mt-1" style={{ color: "var(--muted)" }}>
                Step 1 of 2 — Choose a permanent bonus
              </p>
            </div>
            <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Workers reset. 10% of crops carry over. You keep one worker next step.
            </p>
            <div className="space-y-2">
              {Object.values(PRESTIGE_BONUSES).map((bonus) => (
                <button
                  key={bonus.id}
                  onClick={() => handleBonusPick(bonus.id)}
                  className="w-full text-left card p-3 hover:shadow-md transition"
                  style={{ cursor: "pointer" }}
                >
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
              <h2 className="text-xl font-bold text-center">👷 Keep a Worker</h2>
              <p className="text-xs text-center mt-1" style={{ color: "var(--muted)" }}>
                Step 2 of 2 — Choose one worker to carry into the new season
              </p>
            </div>
            {game.workers.length === 0 ? (
              <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
                No workers to keep. You'll start fresh.
              </p>
            ) : (
              <div className="space-y-2">
                {game.workers.map((worker) => {
                  const gear = GEAR[worker.gear];
                  const spec = SPECIALIZATIONS[worker.specialization];
                  const farm = game.farms.find((f) => f.id === worker.farmId);
                  const farmCrop = farm ? CROPS[farm.crop] : null;
                  return (
                    <button
                      key={worker.id}
                      onClick={() => onComplete(chosenBonus, worker.id)}
                      className="w-full text-left card p-3 hover:shadow-md transition"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="font-medium text-sm">
                        👷 {gear.emoji} {gear.name}
                        {spec && spec.id !== "none" && (
                          <span style={{ marginLeft: "0.4rem", color: "var(--muted)", fontWeight: 400 }}>
                            · {spec.emoji} {spec.name}
                          </span>
                        )}
                      </div>
                      {farmCrop && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          Currently on {farmCrop.emoji} {farmCrop.name} Farm
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => onComplete(chosenBonus, null)}
              className="btn btn-secondary w-full text-sm"
            >
              Skip — start with no kept worker
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card p-6 w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-center">📍 Assign Worker</h2>
        <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Where should your kept worker go this season?
        </p>
        <div className="card p-3" style={{ fontSize: "0.82rem" }}>
          <div style={{ fontWeight: 600 }}>
            👷 {gear.emoji} {gear.name}
            {spec && spec.id !== "none" && (
              <span style={{ marginLeft: "0.4rem", color: "var(--muted)", fontWeight: 400 }}>
                · {spec.emoji} {spec.name}
              </span>
            )}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: "0.2rem" }}>
            Full gear and specialization preserved
          </div>
        </div>
        <div className="space-y-2">
          {game.farms.map((farm) => {
            const crop = CROPS[farm.crop];
            const workersHere = game.workers.filter((w) => w.farmId === farm.id).length;
            return (
              <button
                key={farm.id}
                onClick={() => {
                  onAssign(assigningWorker.id, farm.id);
                  const remaining = (game.keptWorkers ?? []).filter((w) => w.id !== assigningWorker.id);
                  setAssigningWorker(remaining[0] ?? null);
                }}
                className="w-full text-left card p-3 hover:shadow-md transition"
                style={{ cursor: "pointer" }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{crop.emoji} {crop.name} Farm</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                  {workersHere} worker{workersHere !== 1 ? "s" : ""} · Grows in {crop.growTime}s
                </div>
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
  const [activeTab, setActiveTab] = useState("farm_0");
  const [offlineMessage, setOfflineMessage] = useState(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [notification, setNotification] = useState(null);
 
  const gameRef = useRef(null);
  const saveIntervalRef = useRef(null);
 
  useEffect(() => { if (game) gameRef.current = game; }, [game]);
 
  const notify = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);
 
  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      let saved = null;
      if (accessToken && userId) {
        try {
          const res = await api.get("/rootwork/state", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.data?.data) saved = deserializeState(res.data.data);
        } catch {}
      }
      if (!saved) saved = loadFromLocalStorage();
 
      if (saved) {
        const { state: withOffline, offlineSeconds } = calculateOfflineProgress(saved, Date.now());
        setGame(withOffline);
        gameRef.current = withOffline;
        if (offlineSeconds > 60) {
          const mins = Math.floor(offlineSeconds / 60);
          setOfflineMessage(`Welcome back! ${mins} minute${mins !== 1 ? "s" : ""} of progress collected.`);
          setTimeout(() => setOfflineMessage(null), 5000);
        }
      } else {
        const fresh = createInitialState();
        setGame(fresh);
        gameRef.current = fresh;
      }
      setLoaded(true);
    }
    load();
  }, [accessToken, userId]);
 
  // ── Tick ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setGame((prev) => {
        if (!prev) return prev;
        const next = tick(prev);
        gameRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loaded]);
 
  // ── Autosave ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    saveIntervalRef.current = setInterval(() => {
      const state = gameRef.current;
      if (!state) return;
      saveToLocalStorage(state);
      if (accessToken && userId) {
        api.post("/rootwork/state", { data: serializeState(state) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).catch(() => {});
      }
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(saveIntervalRef.current);
  }, [loaded, accessToken, userId]);
 
  useEffect(() => {
    return () => { const s = gameRef.current; if (s) saveToLocalStorage(s); };
  }, []);
 
  // ── Actions ───────────────────────────────────────────────────────────────────
  const update = useCallback((fn) => {
    setGame((prev) => {
      const next = fn(prev);
      gameRef.current = next;
      saveToLocalStorage(next);
      return next;
    });
  }, []);
 
  const handlePlant = useCallback((farmId, plotId) => update((s) => plantPlot(s, farmId, plotId)), [update]);
  const handleHarvest = useCallback((farmId, plotId) => {
    update((s) => harvestPlot(s, farmId, plotId));
    notify("+crops! 🌾");
  }, [update, notify]);
  const handleTend = useCallback((farmId, plotId) => update((s) => tendPlot(s, farmId, plotId)), [update]);
  const handleUpgradePlot = useCallback((farmId, plotId) => {
    update((s) => { const n = upgradePlot(s, farmId, plotId); if (n === s) notify("Not enough artisan goods."); return n; });
  }, [update, notify]);
  const handleBuyPlot = useCallback((farmId) => {
    update((s) => { const n = buyPlot(s, farmId); if (n === s) notify("Not enough crops."); return n; });
  }, [update, notify]);
  const handleHireWorker = useCallback((farmId) => {
    update((s) => { const n = hireWorker(s, farmId); if (n === s) notify("Not enough crops."); return n; });
  }, [update, notify]);
  const handleSellWorker = useCallback((workerId) => {
    update((s) => sellWorker(s, workerId));
    notify("Worker sold.");
  }, [update, notify]);
  const handleUpgradeGear = useCallback((workerId) => {
    update((s) => { const n = upgradeWorkerGear(s, workerId); if (n === s) notify("Not enough crops."); return n; });
  }, [update, notify]);
  const handleSpecialize = useCallback((workerId, specId) => {
    update((s) => { const n = specializeWorker(s, workerId, specId); if (n === s) notify("Not enough berries."); return n; });
  }, [update, notify]);
  const handleStartProcessing = useCallback((recipeId) => {
    update((s) => { const n = startProcessing(s, recipeId); if (n === s) notify("Not enough crops or queue full."); return n; });
  }, [update, notify]);
  const handleBuyFeast = useCallback(() => {
    update((s) => { const n = buyFeast(s); if (n === s) notify("Not enough artisan goods."); return n; });
    notify("🍽️ Feast bonus applied!");
  }, [update, notify]);
  const handlePrestigeComplete = useCallback((bonusId, workerId) => {
    update((s) => beginPrestige(s, bonusId, workerId));
    setShowPrestigeModal(false);
    setActiveTab("farm_0");
    notify("🌱 New season begun!");
  }, [update, notify]);
  const handleAssignWorker = useCallback((keptWorkerId, farmId) => {
    update((s) => assignKeptWorker(s, keptWorkerId, farmId));
  }, [update]);
  const handleResetGame = useCallback(() => {
    if (!window.confirm("Reset all progress? This cannot be undone.")) return;
    localStorage.removeItem(SAVE_KEY);
    const fresh = createInitialState();
    setGame(fresh);
    gameRef.current = fresh;
    setActiveTab("farm_0");
    notify("Game reset.");
  }, [notify]);
 
  const prestigeReady = game ? canPrestige(game) : false;
  const hasPendingAssignments = game?.pendingWorkerAssignments && (game?.keptWorkers?.length ?? 0) > 0;
 
  if (!loaded || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--muted)" }}>
        <p className="text-sm">Loading RootWork…</p>
      </div>
    );
  }
 
  const activeFarmIndex = activeTab.startsWith("farm_")
    ? parseInt(activeTab.replace("farm_", ""), 10) : null;
  const activeFarm = activeFarmIndex !== null ? game.farms[activeFarmIndex] ?? null : null;
 
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
 
      {offlineMessage && (
        <div className="text-center text-sm py-2 px-4" style={{
          background: "rgba(99, 102, 241, 0.12)",
          borderBottom: "1px solid var(--border)", color: "var(--text)",
        }}>
          {offlineMessage}
        </div>
      )}
 
      {notification && (
        <div className="fixed top-4 left-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
          style={{
            transform: "translateX(-50%)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}>
          {notification}
        </div>
      )}
 
      <ResourceBar game={game} />
      <GameNav game={game} activeTab={activeTab} onTabChange={setActiveTab} prestigeReady={prestigeReady} />
 
      <div className="flex-1 overflow-auto">
        {activeFarm && (
          <FarmZone
            key={activeFarm.id}
            farm={activeFarm}
            game={game}
            onPlant={handlePlant}
            onHarvest={handleHarvest}
            onTend={handleTend}
            onBuyPlot={handleBuyPlot}
            onHireWorker={handleHireWorker}
            onSellWorker={handleSellWorker}
            onUpgradeGear={handleUpgradeGear}
            onSpecialize={handleSpecialize}
          />
        )}
        {activeTab === "processing" && (
          <ProcessingZone
            game={game}
            onStartProcessing={handleStartProcessing}
            onUpgradePlot={handleUpgradePlot}
            onBuyFeast={handleBuyFeast}
          />
        )}
        {activeTab === "season" && (
          <SeasonPanel
            game={game}
            prestigeReady={prestigeReady}
            onPrestige={() => setShowPrestigeModal(true)}
            onReset={handleResetGame}
          />
        )}
      </div>
 
      {hasPendingAssignments && (
        <FarmAssignmentScreen game={game} onAssign={handleAssignWorker} />
      )}
 
      {showPrestigeModal && (
        <PrestigeModal
          game={game}
          onComplete={handlePrestigeComplete}
          onCancel={() => setShowPrestigeModal(false)}
        />
      )}
    </div>
  );
}