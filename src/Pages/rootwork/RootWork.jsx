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
  buyPlot,
  hireWorker,
  sellWorker,
  upgradeWorkerGear,
  setWorkerSpecialization,
  startProcessing,
  prestige,
  canPrestige,
} from "./gameEngine";
import { SAVE_KEY, SAVE_INTERVAL_MS, PRESTIGE_BONUSES } from "./gameConstants";
import GameNav from "./components/GameNav";
import ResourceBar from "./components/ResourceBar";
import FarmZone from "./components/FarmZone";
import ProcessingZone from "./components/ProcessingZone";
import SeasonPanel from "./components/SeasonPanel";
 
// ─── Save / Load helpers ──────────────────────────────────────────────────────
 
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return deserializeState(raw);
  } catch {
    return null;
  }
}
 
function saveToLocalStorage(state) {
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state));
  } catch {}
}
 
// ─── Component ────────────────────────────────────────────────────────────────
 
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
 
  useEffect(() => {
    if (game) gameRef.current = game;
  }, [game]);
 
  const notify = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);
 
  // ── Load ─────────────────────────────────────────────────────────────────────
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
        api.post(
          "/rootwork/state",
          { data: serializeState(state) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).catch(() => {});
      }
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(saveIntervalRef.current);
  }, [loaded, accessToken, userId]);
 
  // ── Save on unmount ───────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const state = gameRef.current;
      if (state) saveToLocalStorage(state);
    };
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
 
  const handlePlant = useCallback((farmId, plotId) => {
    update((s) => plantPlot(s, farmId, plotId));
  }, [update]);
 
  const handleHarvest = useCallback((farmId, plotId) => {
    update((s) => harvestPlot(s, farmId, plotId));
    notify("+crops! 🌾");
  }, [update, notify]);
 
  const handleBuyPlot = useCallback((farmId) => {
    update((s) => {
      const next = buyPlot(s, farmId);
      if (next === s) notify("Not enough crops to buy a plot.");
      return next;
    });
  }, [update, notify]);
 
  const handleHireWorker = useCallback((farmId) => {
    update((s) => {
      const next = hireWorker(s, farmId);
      if (next === s) notify("Not enough crops to hire a worker.");
      return next;
    });
  }, [update, notify]);
 
  const handleSellWorker = useCallback((workerId) => {
    update((s) => sellWorker(s, workerId));
    notify("Worker sold.");
  }, [update, notify]);
 
  const handleUpgradeGear = useCallback((workerId) => {
    update((s) => {
      const next = upgradeWorkerGear(s, workerId);
      if (next === s) notify("Not enough crops to upgrade gear.");
      return next;
    });
  }, [update, notify]);
 
  const handleSetSpecialization = useCallback((workerId, specId) => {
    update((s) => setWorkerSpecialization(s, workerId, specId));
  }, [update]);
 
  const handleStartProcessing = useCallback((recipeId) => {
    update((s) => {
      const next = startProcessing(s, recipeId);
      if (next === s) notify("Not enough resources or queue is full.");
      return next;
    });
  }, [update, notify]);
 
  const handlePrestige = useCallback((bonusId) => {
    update((s) => prestige(s, bonusId));
    setShowPrestigeModal(false);
    setActiveTab("farm_0");
    notify("🌱 New season begun!");
  }, [update, notify]);
 
  const handleResetGame = useCallback(() => {
    if (!window.confirm("Reset all progress? This cannot be undone.")) return;
    localStorage.removeItem(SAVE_KEY);
    const fresh = createInitialState();
    setGame(fresh);
    gameRef.current = fresh;
    setActiveTab("farm_0");
    notify("Game reset.");
  }, [notify]);
 
  // ── Derived ───────────────────────────────────────────────────────────────────
  const prestigeReady = game ? canPrestige(game) : false;
 
  // ── Render ────────────────────────────────────────────────────────────────────
  if (!loaded || !game) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--muted)" }}
      >
        <p className="text-sm">Loading RootWork…</p>
      </div>
    );
  }
 
  const activeFarmIndex = activeTab.startsWith("farm_")
    ? parseInt(activeTab.replace("farm_", ""), 10)
    : null;
  const activeFarm = activeFarmIndex !== null ? game.farms[activeFarmIndex] ?? null : null;
 
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
 
      {/* Offline message */}
      {offlineMessage && (
        <div
          className="text-center text-sm py-2 px-4"
          style={{
            background: "color-mix(in oklab, var(--accent) 12%, var(--bg-elev))",
            borderBottom: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {offlineMessage}
        </div>
      )}
 
      {/* Toast */}
      {notification && (
        <div
          className="fixed top-4 left-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
          style={{
            transform: "translateX(-50%)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {notification}
        </div>
      )}
 
      <ResourceBar game={game} />
 
      <GameNav
        game={game}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        prestigeReady={prestigeReady}
      />
 
      <div className="flex-1 overflow-auto">
        {activeFarm && (
          <FarmZone
            key={activeFarm.id}
            farm={activeFarm}
            game={game}
            onPlant={handlePlant}
            onHarvest={handleHarvest}
            onBuyPlot={handleBuyPlot}
            onHireWorker={handleHireWorker}
            onSellWorker={handleSellWorker}
            onUpgradeGear={handleUpgradeGear}
            onSetSpecialization={handleSetSpecialization}
          />
        )}
 
        {activeTab === "processing" && (
          <ProcessingZone game={game} onStartProcessing={handleStartProcessing} />
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
 
      {/* Prestige modal */}
      {showPrestigeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="card p-6 w-full max-w-sm space-y-4"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <h2 className="text-xl font-bold text-center">🌱 Begin New Season</h2>
            <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Your farms reset but your workers carry on.
              10% of your crops carry over.
              Choose a permanent bonus:
            </p>
            <div className="space-y-2">
              {Object.values(PRESTIGE_BONUSES).map((bonus) => (
                <button
                  key={bonus.id}
                  onClick={() => handlePrestige(bonus.id)}
                  className="w-full text-left card p-3 hover:shadow-md transition"
                  style={{ cursor: "pointer" }}
                >
                  <div className="font-medium text-sm">{bonus.emoji} {bonus.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {bonus.description}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPrestigeModal(false)}
              className="btn btn-secondary w-full text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}