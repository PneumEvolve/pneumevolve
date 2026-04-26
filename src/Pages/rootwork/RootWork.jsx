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
  investNow, canInvestNow, getInvestNowCooldownRemaining,
  buildBank, upgradeBank, setActiveBankTier, buyPond, buildForge, catchFish, unlockFishingBody, setFishingActiveBody,
  upgradeFishingWorker, setFishingWorkerBait,
  buyAnimal, collectAnimal, collectAllAnimals, interactAnimal, buyPet, interactPet, toggleKitchenWorkerAutoRestart,
  setKitchenWorkerBatchOverride,
  setMarketWorkerRateLimit,
  hireBarnWorker, fireBarnWorker, reassignBarnWorker, applyFishMeal, upgradeBarnWorker, upgradeAnimalStorage, getBarnWorkerHireCost,
  hireFishingWorker, fireFishingWorker, setTreasuryCap, upgradeAnimalYield,
  buildBarnBuilding, upgradeBarnBuilding,
  buildTownBuilding, setTavernMode, assignTownBuildingWorker,
  startSchoolResearch, unlockPrestigeSkill, toggleFishingWorkerAllowedFish,
  unlockSeasonFarm, unlockSeasonBarn, skipSeasonUnlock, getAvailableBarnUnlocks,
  buyFishingPlayerUpgrade, getPlayerFishingHaul,
  initWorldState, sendAdventurer, returnAdventurer, equipAdventurer, unequipAdventurer,
  giveBuffItem, removeBuffItem, tickAdventurerRegen,
  hireForgeWorker, fireForgeWorker, assignForgeWorkerRecipe, cancelForgeWorkerRecipe,
  upgradeForgeWorker, toggleForgeWorkerAutoRestart, tickForgeWorkers, upgradeForgeInstance,
  hireWorldWorker, fireWorldWorker, tickWorldWorkers,
  giveArtisanFood, removeArtisanFood, useArtisanFood,
  tickAdventurerMissions,
  hireAdventurer, spendSkillPoint, getAdventurerSlotCost, getAdventurerSlotUnlocked, isAtWorkerCap,
  // New adventurer functions
  reviveAdventurer, prestigeAdventurer, requestAutoBattleStop,
  tickBossFight, checkBossUnlock,
  assignHeroToBoss, unassignHeroFromBoss, useBossAbility,
  acknowledgeBossVictory, reviveHeroInBossFight,
} from "./gameEngine";
import {
  SAVE_KEY, SAVE_INTERVAL_MS,
  PRESTIGE_SKILL_TREE, PRESTIGE_SKILL_BRANCHES, PRESTIGE_BRANCH_META,
  CROPS, GEAR, SPECIALIZATIONS, KITCHEN_WORKER_UPGRADES, MARKET_WORKER_GEAR,
  FISHING_FISH, FISHING_BODIES, FISHING_WORKER_HIRE_COSTS,
  BARN_BUILDINGS, BARN_BUILDING_ORDER, EXTRA_FARM_CROPS,
} from "./gameConstants";
import GameNav, { FarmSubTabs } from "./components/GameNav";
import ResourceBar from "./components/ResourceBar";
import FarmZone from "./components/FarmZone";
import ProcessingZone from "./components/ProcessingZone";
import MarketZone from "./components/MarketZone";
import FarmUnlockModal from "./components/FarmUnlockModal";
import TownZone from "./components/TownZone";
import AnimalsZone from "./components/AnimalsZone";
import WorldZone from "./components/WorldZone";
import ForgeZone from "./components/ForgeZone";
 
function loadFromLocalStorage() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; return deserializeState(raw); } catch { return null; }
}
function saveToLocalStorage(state) {
  try { localStorage.setItem(SAVE_KEY, serializeState(state)); } catch {}
}
 
// ─── Prestige Skill Tree Modal ────────────────────────────────────────────────

function WorkerGroup({ label, color, workers, chosenIds, atLimit, onToggle, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (workers.length === 0) return null;
  return (
    <div style={{ marginBottom: "0.4rem", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.45rem 0.65rem", background: "var(--bg-elev)", border: "none", cursor: "pointer",
      }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color }}>{label} ({workers.length})</span>
        <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {workers.map((worker) => {
            const isSelected = chosenIds.includes(worker._keepId);
            return (
              <button key={worker._keepId} onClick={() => onToggle(worker._keepId, isSelected, atLimit)} style={{
                textAlign: "left", padding: "0.4rem 0.5rem", borderRadius: "6px",
                cursor: isSelected || !atLimit ? "pointer" : "default",
                opacity: !isSelected && atLimit ? 0.4 : 1,
                border: isSelected ? `2px solid ${color}` : "2px solid var(--border)",
                background: isSelected ? `${color}11` : "var(--bg)",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{isSelected ? "✓ " : ""}{worker._title}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>{worker._subtitle}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PrestigeModal({ game, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [chosenWorkerIds, setChosenWorkerIds] = useState([]);
  const [pendingSkills, setPendingSkills] = useState({});

  const spentPoints = Object.values(game.prestigeSkills ?? {}).reduce((s, v) => s + v, 0);
  const pendingSpent = Object.values(pendingSkills).reduce((s, v) => s + v, 0);
  const availablePoints = (game.prestigePoints ?? 0) + 1 - spentPoints - pendingSpent;

  const farmerWorkers = game.workers.map((w) => {
    const gear = GEAR[w.gear]; const spec = SPECIALIZATIONS[w.specialization];
    const farm = game.farms.find((f) => f.id === w.farmId); const crop = farm ? CROPS[farm.crop] : null;
    return { _keepId: w.id, _title: `${gear.emoji} ${gear.name}${spec?.id !== "none" ? ` · ${spec.emoji} ${spec.name}` : ""}`, _subtitle: crop ? `${crop.emoji} ${crop.name} Farm` : "Farm" };
  });
  const crafterWorkers = game.kitchenWorkers.map((w) => {
    const ups = (w.upgrades ?? []).map((u) => KITCHEN_WORKER_UPGRADES[u]?.emoji).filter(Boolean).join(" ");
    return { _keepId: w.id, _title: `👨‍🍳 Crafter${ups ? ` ${ups}` : ""}`, _subtitle: (w.upgrades ?? []).map((u) => KITCHEN_WORKER_UPGRADES[u]?.name).filter(Boolean).join(", ") || "No upgrades" };
  });
  const merchantWorkers = game.marketWorkers.map((w) => {
    const gear = MARKET_WORKER_GEAR[w.gear];
    return { _keepId: w.id, _title: `🛒 ${gear.emoji} ${gear.name}`, _subtitle: `${gear.itemsPerSecond} items/sec${w.hasStandingOrder ? " · standing order" : ""}` };
  });
  const fisherWorkers = Object.entries(game.fishing?.bodies ?? {})
    .filter(([, b]) => b?.worker?.hired)
    .map(([bodyId]) => {
      const body = FISHING_BODIES[bodyId]; const cost = FISHING_WORKER_HIRE_COSTS[bodyId] ?? 75;
      return { _keepId: `fisher_${bodyId}`, _title: `🎣 ${body?.emoji ?? ""} ${body?.name ?? bodyId} Fisher`, _subtitle: `Rehire cost $${cost}` };
    });
  const barnWorkersList = (game.barnWorkers ?? []).map((w) => {
    const animalType = w.animalType;
    const barnEntry = Object.values(BARN_BUILDINGS).find(b => b.animalType === animalType);
    return { _keepId: w.id, _title: `${barnEntry?.emoji ?? "🐾"} ${barnEntry?.name ?? animalType} Worker`, _subtitle: `${(w.upgrades ?? []).length} upgrade${(w.upgrades ?? []).length !== 1 ? "s" : ""}` };
  });

  const allCount = farmerWorkers.length + crafterWorkers.length + merchantWorkers.length + fisherWorkers.length + barnWorkersList.length;
  const atLimit = chosenWorkerIds.length >= game.season;

  function toggleWorker(keepId, isSelected) {
    if (isSelected) setChosenWorkerIds(ids => ids.filter(id => id !== keepId));
    else if (!atLimit) setChosenWorkerIds(ids => [...ids, keepId]);
  }

  const branchNodes = (branch) => Object.values(PRESTIGE_SKILL_TREE).filter((n) => n.branch === branch).sort((a, b) => a.tier - b.tier);
  const isOwned = (id) => (game.prestigeSkills?.[id] ?? 0) + (pendingSkills[id] ?? 0) > 0;
  const isUnlockable = (node) => {
    if (availablePoints < 1) return false;
    if (node.unique && isOwned(node.id)) return false;
    if (node.requires && !isOwned(node.requires)) return false;
    return true;
  };
  function handleUnlock(nodeId) {
    const node = PRESTIGE_SKILL_TREE[nodeId];
    if (!node || !isUnlockable(node)) return;
    setPendingSkills((prev) => ({ ...prev, [nodeId]: (prev[nodeId] ?? 0) + 1 }));
  }
  function handleComplete(workerIds) { onComplete(pendingSkills, workerIds); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="card p-5 w-full max-w-sm" style={{ maxHeight: "90vh", overflowY: "auto" }}>

        {step === 1 && (
          <>
            <div style={{ marginBottom: "1rem", textAlign: "center" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🌱 New Season</h2>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                Prestige awards <strong style={{ color: "#a78bfa" }}>+1 skill point</strong> — spend it before you begin
              </p>
              <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa" }}>
                {availablePoints} point{availablePoints !== 1 ? "s" : ""} to spend
              </div>
            </div>
            {PRESTIGE_SKILL_BRANCHES.map((branch) => {
              const meta = PRESTIGE_BRANCH_META[branch];
              const nodes = branchNodes(branch);
              return (
                <div key={branch} style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.4rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {meta.emoji} {meta.label}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {nodes.map((node, idx) => {
                      const owned = isOwned(node.id); const unlockable = isUnlockable(node);
                      const parentOwned = !node.requires || isOwned(node.requires);
                      const locked = !owned && !parentOwned;
                      return (
                        <div key={node.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.45rem 0.6rem", borderRadius: "8px",
                          background: owned ? "rgba(167,139,250,0.12)" : "var(--bg)",
                          border: `1px solid ${owned ? "rgba(167,139,250,0.4)" : unlockable ? "rgba(167,139,250,0.25)" : "var(--border)"}`,
                          opacity: locked ? 0.35 : 1,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: owned ? "#a78bfa" : "var(--text)" }}>
                              {owned ? "✓ " : idx > 0 ? "→ " : ""}{node.emoji} {node.name}
                              {node.unique && owned && <span style={{ fontSize: "0.6rem", color: "var(--muted)", marginLeft: "0.3rem" }}>(max)</span>}
                            </div>
                            <div style={{ fontSize: "0.63rem", color: "var(--muted)", marginTop: "0.1rem" }}>{node.description}</div>
                          </div>
                          {!owned && unlockable && (
                            <button onClick={() => handleUnlock(node.id)} style={{
                              marginLeft: "0.5rem", flexShrink: 0, fontSize: "0.65rem", fontWeight: 700,
                              padding: "0.2rem 0.55rem", borderRadius: "6px",
                              background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.5)",
                              color: "#a78bfa", cursor: "pointer",
                            }}>Unlock</button>
                          )}
                          {!owned && !unlockable && parentOwned && availablePoints === 0 && (
                            <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", color: "var(--muted)", flexShrink: 0 }}>No pts</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button onClick={onCancel} className="btn btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>Cancel</button>
              <button onClick={() => setStep(2)} className="btn" style={{ flex: 1, fontSize: "0.8rem" }}>Keep Workers →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ marginBottom: "1rem", textAlign: "center" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>👷 Keep Workers</h2>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                Pick up to {game.season} worker{game.season !== 1 ? "s" : ""} to carry over
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, marginTop: "0.15rem" }}>
                {chosenWorkerIds.length}/{game.season} selected
              </p>
            </div>
            {allCount === 0 ? (
              <p style={{ fontSize: "0.8rem", textAlign: "center", color: "var(--muted)", marginBottom: "1rem" }}>No workers to keep. You'll start fresh.</p>
            ) : (
              <div style={{ marginBottom: "1rem" }}>
                <WorkerGroup label="🌾 Farmers" color="#4ade80" workers={farmerWorkers} chosenIds={chosenWorkerIds} atLimit={atLimit} onToggle={toggleWorker} defaultOpen={farmerWorkers.length > 0} />
                <WorkerGroup label="💹 Merchants" color="#60a5fa" workers={merchantWorkers} chosenIds={chosenWorkerIds} atLimit={atLimit} onToggle={toggleWorker} />
                <WorkerGroup label="🍳 Crafters" color="#f59e0b" workers={crafterWorkers} chosenIds={chosenWorkerIds} atLimit={atLimit} onToggle={toggleWorker} />
                <WorkerGroup label="🎣 Fishers" color="#22d3ee" workers={fisherWorkers} chosenIds={chosenWorkerIds} atLimit={atLimit} onToggle={toggleWorker} />
                <WorkerGroup label="🐄 Barn Workers" color="#a78bfa" workers={barnWorkersList} chosenIds={chosenWorkerIds} atLimit={atLimit} onToggle={toggleWorker} />
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>← Back</button>
              <button onClick={() => handleComplete(chosenWorkerIds)} className="btn" style={{ flex: 1, fontSize: "0.8rem" }}>
                {chosenWorkerIds.length > 0 ? `✓ Keep ${chosenWorkerIds.length} & Begin` : "Begin Season →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Season Unlock Modal (season 7+) ─────────────────────────────────────────

function SeasonUnlockModal({ game, onUnlockFarm, onUnlockBarn, onSkipUnlock }) {
  const [choice, setChoice] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedBarn, setSelectedBarn] = useState(null);

  const farmCost = 300 + (game.extraFarmsUnlocked ?? 0) * 200;
  const cash = game.cash ?? 0;
  const canAffordFarm = cash >= farmCost;

  const availableBarns = BARN_BUILDING_ORDER;
  const availableCrops = EXTRA_FARM_CROPS;
  const canConfirm = choice === "farm" ? (selectedCrop && canAffordFarm) : choice === "barn" ? selectedBarn != null : false;

  function handleConfirm() {
    if (choice === "farm" && selectedCrop) onUnlockFarm(selectedCrop);
    else if (choice === "barn" && selectedBarn) onUnlockBarn(selectedBarn);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="card p-6 w-full max-w-sm" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, textAlign: "center", marginBottom: "0.25rem" }}>🌱 Season Unlock</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginBottom: "1rem" }}>
          Season {game.season} — expand your farm or unlock a new barn
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {["farm", "barn"].map((opt) => {
            const disabled = opt === "farm" ? availableCrops.length === 0 : availableBarns.length === 0;
            return (
              <button key={opt} onClick={() => !disabled && setChoice(opt)} disabled={disabled} style={{
                flex: 1, padding: "0.65rem", borderRadius: "8px", cursor: disabled ? "default" : "pointer",
                background: choice === opt ? "rgba(99,102,241,0.15)" : "var(--bg)",
                border: `2px solid ${choice === opt ? "var(--accent)" : "var(--border)"}`,
                color: disabled ? "var(--muted)" : "var(--text)",
                fontWeight: choice === opt ? 700 : 400, fontSize: "0.82rem", opacity: disabled ? 0.4 : 1,
              }}>
                {opt === "farm" ? "🌾 New Farm" : "🐄 New Barn"}
                {disabled && <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>Unavailable</div>}
              </button>
            );
          })}
        </div>
        {choice === "farm" && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.72rem", color: canAffordFarm ? "#4ade80" : "#ef4444", fontWeight: 600, marginBottom: "0.5rem", textAlign: "center" }}>
              Cost: ${farmCost} · Have: ${Math.floor(cash)}
            </div>
            {availableCrops.map((cropId) => {
              const crop = CROPS[cropId]; const sel = selectedCrop === cropId;
              return (
                <button key={cropId} onClick={() => setSelectedCrop(cropId)} style={{
                  width: "100%", textAlign: "left", padding: "0.5rem 0.65rem", borderRadius: "8px",
                  marginBottom: "0.35rem", cursor: "pointer",
                  background: sel ? "rgba(99,102,241,0.08)" : "var(--bg-elev)",
                  border: `2px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{crop.emoji} {crop.name}{sel && <span style={{ marginLeft: "0.5rem", color: "var(--accent)", fontSize: "0.72rem" }}>✓</span>}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>Grows in {crop.growTime}s · {crop.workerYield} per worker harvest · adds another {crop.name.toLowerCase()} farm</div>
                </button>
              );
            })}
          </div>
        )}
        {choice === "barn" && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.5rem", textAlign: "center" }}>Free — you buy animals and hire workers yourself</div>
            {availableBarns.map((buildingId) => {
              const def = BARN_BUILDINGS[buildingId]; const sel = selectedBarn === buildingId;
              return (
                <button key={buildingId} onClick={() => setSelectedBarn(buildingId)} style={{
                  width: "100%", textAlign: "left", padding: "0.5rem 0.65rem", borderRadius: "8px",
                  marginBottom: "0.35rem", cursor: "pointer",
                  background: sel ? "rgba(99,102,241,0.08)" : "var(--bg-elev)",
                  border: `2px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{def.emoji} {def.name}{sel && <span style={{ marginLeft: "0.5rem", color: "var(--accent)", fontSize: "0.72rem" }}>✓</span>}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>Raises {def.animalType}s · $${def.upkeepPerAnimalPerSec}/animal/s upkeep · builds a new instance even if one already exists</div>
                </button>
              );
            })}
          </div>
        )}
        <button onClick={handleConfirm} disabled={!canConfirm} className="btn w-full" style={{ opacity: canConfirm ? 1 : 0.5, fontSize: "0.85rem" }}>
          {!choice ? "Choose an option above" : choice === "farm" && !canAffordFarm ? `Need $${farmCost}` : !canConfirm ? "Select one above" : choice === "farm" ? `🌾 Unlock ${CROPS[selectedCrop]?.name} Farm — $${farmCost}` : `🐄 Build ${BARN_BUILDINGS[selectedBarn]?.name}`}
        </button>
        {choice === "farm" && !canAffordFarm && (
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center", marginTop: "0.5rem" }}>Earn more cash at the Market, then come back.</p>
        )}
        <button
          onClick={onSkipUnlock}
          style={{ width: "100%", marginTop: "0.5rem", padding: "0.4rem", background: "none", border: "none", color: "var(--muted)", fontSize: "0.68rem", cursor: "pointer", textDecoration: "underline" }}
        >
          Decide later
        </button>
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
  const [activeCraftingTab, setActiveCraftingTab] = useState("kitchen");
  const [offlineMessage, setOfflineMessage] = useState(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const gameRef = useRef(null);
  const [autoBattleLootResult, setAutoBattleLootResult] = useState(null);
 
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
        const withWorld = initWorldState(withOffline);
        setGame(withWorld); gameRef.current = withWorld;
        if (offlineSeconds > 60) {
          const mins = Math.floor(offlineSeconds / 60);
          setOfflineMessage(`Welcome back! ${mins} minute${mins !== 1 ? "s" : ""} of progress collected.`);
          setTimeout(() => setOfflineMessage(null), 5000);
        }
      } else {
        const fresh = initWorldState(createInitialState());
        setGame(fresh); gameRef.current = fresh;
      }
      setLoaded(true);
    }
    load();
  }, [accessToken, userId]);
 
  useEffect(() => {
    if (!loaded) return;
    if (showPrestigeModal) return;
    const interval = setInterval(() => {
  setGame((prev) => {
    if (!prev) return prev;
    let next = tick(prev);
    next = tickForgeWorkers(next, 1);
    next = tickAdventurerRegen(next, 1);
    next = tickWorldWorkers(next, 1);
    next = tickAdventurerMissions(next);
    next = tickBossFight(next, 1);
    next = checkBossUnlock(next);
    // Surface any completed auto battle result
    if (next.pendingAutoBattleResult) {
      const result = next.pendingAutoBattleResult;
      next = { ...next, pendingAutoBattleResult: null };
      // Schedule modal outside of setState
      setTimeout(() => setAutoBattleLootResult(result), 0);
    }
    gameRef.current = next;
    return next;
  });
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
  const handleSetKitchenBatchOverride = useCallback((workerId, batchSize) => update((s) => setKitchenWorkerBatchOverride(s, workerId, batchSize)), [update]);
  const handleSetMarketWorkerRateLimit = useCallback((workerId, limit) => update((s) => setMarketWorkerRateLimit(s, workerId, limit)), [update]);
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
  const handleSetTreasuryCap = useCallback((cap) => update((s) => setTreasuryCap(s, cap)), [update]);
  const handleInvestNow = useCallback(() => update((s) => investNow(s)), [update]);
  const handleBuildBank = useCallback(() => update((s) => { const n = buildBank(s); if (n === s) notify("Can't build bank yet."); return n; }), [update, notify]);
  const handleUpgradeBank = useCallback(() => update((s) => { const n = upgradeBank(s); if (n === s) notify("Not enough treasury funds."); return n; }), [update, notify]);
  const handleSetActiveBankTier = useCallback((tier) => update((s) => setActiveBankTier(s, tier)), [update]);
  const handleBuildTownBuilding = useCallback((key) => update((s) => { const n = buildTownBuilding(s, key); if (n === s) notify("Can't build yet — check requirements and treasury."); return n; }), [update, notify]);
  const handleAssignTownBuildingWorker = useCallback((key, delta) => update((s) => { const n = assignTownBuildingWorker(s, key, delta); if (n === s && delta > 0) notify("No free people available."); return n; }), [update, notify]);
  const handleToggleTavernMode = useCallback((mode) => update((s) => setTavernMode(s, mode)), [update]);
  const handleStartSchoolResearch = useCallback((researchId) => update((s) => {
    const n = startSchoolResearch(s, researchId);
    if (n === s) notify("Can't start that research yet.");
    return n;
  }), [update, notify]);

  // Animals & Pond
  const handleBuyPond = useCallback(() => update((s) => { const n = buyPond(s); if (n === s) notify("Need $500 cash."); return n; }), [update, notify]);
  const handleBuildForge = useCallback(() => {
    update((s) => { const n = buildForge(s); if (n === s) notify("Need 🪨×10 🪵×5 to build Forge."); return n; });
  }, [update, notify]);
  const handleBuyAnimal = useCallback((animalId, barnInstanceId) => update((s) => { const n = buyAnimal(s, animalId, barnInstanceId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleCollectAnimal = useCallback((animalId, instanceId, barnInstanceId) => update((s) => collectAnimal(s, animalId, instanceId, barnInstanceId)), [update]);
  const handleCollectAllAnimals = useCallback(() => { update((s) => collectAllAnimals(s)); notify("🧺 All products collected!"); }, [update, notify]);
  const handleInteractAnimal = useCallback((animalId, instanceId, barnInstanceId) => update((s) => interactAnimal(s, animalId, instanceId, barnInstanceId)), [update]);
  const handleBuyPet = useCallback((petId) => update((s) => { const n = buyPet(s, petId); if (n === s) notify("Not enough cash."); return n; }), [update, notify]);
  const handleInteractPet = useCallback((petId) => update((s) => interactPet(s, petId)), [update]);
  const handleHireBarnWorker = useCallback((animalType, instanceId) => update((s) => {
    const n = hireBarnWorker(s, animalType, instanceId);
    if (n === s) notify("Can't hire — check cash or worker cap.");
    return n;
  }), [update, notify]);
  const handleFireBarnWorker = useCallback((workerId) => update((s) => fireBarnWorker(s, workerId)), [update]);
  const handleReassignBarnWorker = useCallback((workerId, animalType) => update((s) => reassignBarnWorker(s, workerId, animalType)), [update]);
  const handleUpgradeBarnWorker = useCallback((workerId, upgradeId) => update((s) => {
    const n = upgradeBarnWorker(s, workerId, upgradeId);
    if (n === s) notify("Can't upgrade — check cash or requirements.");
    return n;
  }), [update, notify]);
  const handleUnlockFishingBody = useCallback((bodyId) => update((s) => {
    const n = unlockFishingBody(s, bodyId);
    if (n === s) notify("Can't unlock — check cash or order.");
    return n;
  }), [update, notify]);
  const handleSetFishingActiveBody = useCallback((bodyId) => update((s) => setFishingActiveBody(s, bodyId)), [update]);
  const handleHireFishingWorker = useCallback((bodyId) => update((s) => {
    const n = hireFishingWorker(s, bodyId);
    if (n === s) notify("Can't hire — check cash or worker cap.");
    return n;
  }), [update, notify]);
  const handleFireFishingWorker = useCallback((bodyId) => {
    update((s) => fireFishingWorker(s, bodyId));
    notify("Fisher dismissed.");
  }, [update, notify]);
  const handleUpgradeFishingWorker = useCallback((bodyId, upgradeId) => update((s) => {
    const n = upgradeFishingWorker(s, bodyId, upgradeId);
    if (n === s) notify("Can't upgrade — check cash or requirements.");
    return n;
  }), [update, notify]);
  const handleSetFishingWorkerBait = useCallback((bodyId, baitId) => update((s) => setFishingWorkerBait(s, bodyId, baitId)), [update]);
  const handleCatchFish = useCallback((fishId, baitId, count) => update((s) =>
    catchFish(s, fishId, baitId, s.fishing?.activeBody ?? "pond", count)
  ), [update]);
  const handleUpgradeAnimalStorage = useCallback((animalId, instanceId, barnInstanceId) => update((s) => {
    const n = upgradeAnimalStorage(s, animalId, instanceId, barnInstanceId);
    if (n === s) notify("Not enough cash.");
    return n;
  }), [update, notify]);
  const handleUpgradeAnimalYield = useCallback((animalId, instanceId, barnInstanceId) => update((s) => {
    const n = upgradeAnimalYield(s, animalId, instanceId, barnInstanceId);
    if (n === s) notify("Not enough cash.");
    return n;
  }), [update, notify]);
  const handleBuildBarnBuilding = useCallback((buildingId) => update((s) => {
    const n = buildBarnBuilding(s, buildingId);
    if (n === s) notify("Not enough cash.");
    return n;
  }), [update, notify]);
  const handleUpgradeBarnBuilding = useCallback((buildingId, instanceId) => update((s) => {
    const n = upgradeBarnBuilding(s, buildingId, instanceId);
    if (n === s) notify("Not enough cash.");
    return n;
  }), [update, notify]);

  // Forge
  const handleHireForgeWorker = useCallback(() => {
    update((s) => { const n = hireForgeWorker(s); if (n === s) notify("Not enough cash."); return n; });
  }, [update, notify]);
  const handleFireForgeWorker = useCallback((id) => update((s) => fireForgeWorker(s, id)), [update]);
  const handleAssignForgeWorkerRecipe = useCallback((workerId, recipeId) => {
    update((s) => { const n = assignForgeWorkerRecipe(s, workerId, recipeId); if (n === s) notify("Not enough resources."); return n; });
  }, [update, notify]);
  const handleCancelForgeWorkerRecipe = useCallback((workerId) => update((s) => cancelForgeWorkerRecipe(s, workerId)), [update]);
  const handleUpgradeForgeWorker = useCallback((workerId, upgradeId) => {
    update((s) => { const n = upgradeForgeWorker(s, workerId, upgradeId); if (n === s) notify("Not enough cash."); return n; });
  }, [update, notify]);
  const handleToggleForgeWorkerAutoRestart = useCallback((workerId) => update((s) => toggleForgeWorkerAutoRestart(s, workerId)), [update]);

  // ─── World / Adventurer handlers ────────────────────────────────────────────

  const handleSendAdventurer = useCallback((adventurerId, zoneId) => {
    update((s) => sendAdventurer(s, adventurerId, zoneId));
  }, [update]);

  const handleReturnAdventurer = useCallback((adventurerId) => {
    const { state: next, result } = returnAdventurer(gameRef.current, adventurerId);
    if (next !== gameRef.current) {
      gameRef.current = next;
      saveToLocalStorage(next);
      setGame(next);
    }
    return result;
  }, []);

  // 3-slot equipment: takes (adventurerId, slot, itemKey, instanceId?)
  const handleEquipAdventurer = useCallback((adventurerId, slot, itemKey, instanceId = null) => {
    update((s) => { const n = equipAdventurer(s, adventurerId, slot, itemKey, instanceId); if (n === s) notify("No gear available."); return n; });
  }, [update, notify]);

  // 3-slot unequip: takes (adventurerId, slot)
  const handleUnequipAdventurer = useCallback((adventurerId, slot) => {
    update((s) => unequipAdventurer(s, adventurerId, slot));
  }, [update]);

  const handleUpgradeForgeInstance = useCallback((instanceId) => {
    update((s) => {
      const n = upgradeForgeInstance(s, instanceId);
      if (n === s) notify("Cannot upgrade — check crystals, cash, or unequip first.");
      return n;
    });
  }, [update, notify]);

  const handleGiveBuffItem = useCallback((adventurerId, buffId) => {
    update((s) => { const n = giveBuffItem(s, adventurerId, buffId); if (n === s) notify("No buff item in stock or slot already filled."); return n; });
  }, [update, notify]);

  const handleRemoveBuffItem = useCallback((adventurerId) => update((s) => removeBuffItem(s, adventurerId)), [update]);

  // Hire: passes usedNames Set so engine can avoid repeating names
  const handleHireAdventurer = useCallback((usedNames) => {
    update((s) => {
      const n = hireAdventurer(s, usedNames ?? new Set());
      if (n === s) {
        if (!getAdventurerSlotUnlocked(s)) notify("Next hero slot unlocks next season.");
        else if (isAtWorkerCap(s)) notify("Population full · Build more housing first.");
        else {
          const cost = getAdventurerSlotCost(s);
          notify(cost ? `Not enough cash ($${cost}).` : "All hero slots filled.");
        }
      }
      return n;
    });
  }, [update, notify]);

  const handleSpendSkillPoint = useCallback((adventurerId, skillId) => {
    update((s) => { const n = spendSkillPoint(s, adventurerId, skillId); if (n === s) notify("No skill points available."); return n; });
  }, [update, notify]);

  const handleGiveArtisanFood = useCallback((adventurerId, foodId) => {
    update((s) => { const n = giveArtisanFood(s, adventurerId, foodId); if (n === s) notify("No food available or belt full."); return n; });
  }, [update, notify]);

  const handleRemoveArtisanFood = useCallback((adventurerId, foodId) => update((s) => removeArtisanFood(s, adventurerId, foodId)), [update]);

  const handleUseArtisanFood = useCallback((adventurerId, foodId) => {
    update((s) => { const n = useArtisanFood(s, adventurerId, foodId); if (n === s) notify("Already full or no food on belt."); return n; });
  }, [update, notify]);

  // Revive dead hero — cost scales with hero prestige level
  const handleReviveAdventurer = useCallback((adventurerId) => {
    update((s) => { const n = reviveAdventurer(s, adventurerId); if (n === s) notify("Not enough cash to revive."); return n; });
  }, [update, notify]);

  // ─── Boss Fight handlers ──────────────────────────────────────────────────
  const handleAssignHeroToBoss = useCallback((heroId) => {
    update((s) => { const n = assignHeroToBoss(s, heroId); if (n === s) notify("Hero can't join — check HP or mission status."); return n; });
  }, [update, notify]);

  const handleUnassignHeroFromBoss = useCallback((heroId) => {
    update((s) => unassignHeroFromBoss(s, heroId));
  }, [update]);

  const handleUseBossAbility = useCallback((heroId) => {
    update((s) => { const n = useBossAbility(s, heroId); if (n === s) notify("Ability on cooldown."); return n; });
  }, [update, notify]);

  const handleAcknowledgeBossVictory = useCallback(() => {
    update((s) => acknowledgeBossVictory(s));
  }, [update]);

  const handleReviveHeroInBossFight = useCallback((heroId) => {
    update((s) => { const n = reviveHeroInBossFight(s, heroId); if (n === s) notify("Not enough cash to revive."); return n; });
  }, [update, notify]);

  // Prestige a hero (costs 3 skill pts + cash, resets to level 1, grants +1 permanent skill pt)
  const handlePrestigeAdventurer = useCallback((adventurerId) => {
    update((s) => { const n = prestigeAdventurer(s, adventurerId); if (n === s) notify("Can't prestige — check skill points, cash, or hero must be alive."); return n; });
  }, [update, notify]);

  // Auto battle: sends with autoBattle=true flag
  const handleStartAutoBattle = useCallback((adventurerId, zoneId) => {
    update((s) => sendAdventurer(s, adventurerId, zoneId, true));
  }, [update]);

  const handleRequestAutoBattleStop = useCallback((adventurerId) => {
    update((s) => requestAutoBattleStop(s, adventurerId));
  }, [update]);

  // Auto battle collect: same as returnAdventurer but result has autoBattle=true
  const handleReturnAutoBattle = useCallback((adventurerId) => {
    const { state: next, result } = returnAdventurer(gameRef.current, adventurerId);
    if (next !== gameRef.current) {
      gameRef.current = next;
      saveToLocalStorage(next);
      setGame(next);
    }
    return result;
  }, []);

  const handleHireWorldWorker = useCallback((zoneId) => {
    update((s) => { const n = hireWorldWorker(s, zoneId); if (n === s) notify("Not enough cash ($200) or zone not cleared."); return n; });
  }, [update, notify]);
  const handleFireWorldWorker = useCallback((zoneId) => update((s) => fireWorldWorker(s, zoneId)), [update]);

  // Feast / prestige / misc
  const handleBuyFeast = useCallback(() => { update((s) => { const n = buyFeast(s); if (n === s) notify("Not enough artisan goods."); return n; }); notify("🍽️ Feast held! Grow speed increased."); }, [update, notify]);
  const handlePrestigeComplete = useCallback((pendingSkills, workerIds) => {
  update((s) => {
    // Commit pending skills BEFORE beginPrestige so advanceSeason (warm_welcome,
    // grand_opening, etc.) can see them immediately.
    // beginPrestige itself awards +1 prestigePoints, so we pre-add +1 here as a
    // temporary credit that lets unlockPrestigeSkill spend the incoming point,
    // then beginPrestige's own +1 restores the balance.
    let next = { ...s, prestigePoints: (s.prestigePoints ?? 0) + 1 };
    for (const [skillId, count] of Object.entries(pendingSkills ?? {})) {
      for (let i = 0; i < count; i++) {
        next = unlockPrestigeSkill(next, skillId);
      }
    }
    // Now advance the season — prestige skills are already in prestigeSkills
    // beginPrestige will award the real +1 point (net effect: +0 since we pre-added one)
    next = beginPrestige({ ...next, prestigePoints: (next.prestigePoints ?? 1) - 1 }, null, workerIds);
    return next;
  });
  setShowPrestigeModal(false); setActiveMainTab("farms"); setActiveFarmIndex(0); notify("🌱 New season begun!");
}, [update, notify]);
  const handleUnlockPrestigeSkill = useCallback((skillId) => { update((s) => unlockPrestigeSkill(s, skillId)); }, [update]);
  const handleToggleFishingWorkerAllowedFish = useCallback((bodyId, fishId) => update((s) => toggleFishingWorkerAllowedFish(s, bodyId, fishId)), [update]);
  const handleBuyFishingPlayerUpgrade = useCallback((upgradeId) => update((s) => {
    const n = buyFishingPlayerUpgrade(s, upgradeId);
    if (n === s) notify("Can't buy — check cash or requirements.");
    return n;
  }), [update, notify]);
  const handleAssignWorker = useCallback((keptWorkerId, farmId) => update((s) => assignKeptWorker(s, keptWorkerId, farmId)), [update]);
  const handleUnlockFarm = useCallback((cropId) => { update((s) => { const n = unlockExtraFarm(s, cropId); if (n === s) notify("Not enough cash."); return n; }); notify("🌾 New farm unlocked!"); }, [update, notify]);
  const handleUnlockSeasonFarm = useCallback((cropId) => { update((s) => { const n = unlockSeasonFarm(s, cropId); if (n === s) notify("Not enough cash."); return n; }); notify("🌾 New farm unlocked!"); }, [update, notify]);
  const handleUnlockSeasonBarn = useCallback((buildingId) => { update((s) => unlockSeasonBarn(s, buildingId)); notify("🐄 New barn unlocked!"); }, [update, notify]);
  const handleSkipSeasonUnlock = useCallback(() => { update((s) => skipSeasonUnlock(s)); }, [update]);
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
  const hasPendingSeasonUnlock = game?.pendingSeasonUnlock === true;
 
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
          <MarketZone game={game} onHireMarketWorker={handleHireMarketWorker} onAssignItem={handleAssignItem} onUpgradeMarketWorker={handleUpgradeMarketWorker} onFireMarketWorker={handleFireMarketWorker} onBuyMarketWorkerStandingOrder={handleBuyMarketWorkerStandingOrder} onSetMarketWorkerStandingOrder={handleSetMarketWorkerStandingOrder} onCancelQueue={handleCancelMarketWorkerQueue} onSetMarketWorkerRateLimit={handleSetMarketWorkerRateLimit} />
        )}
        {activeMainTab === "crafting" && (
          <>
            <div style={{ background: "var(--bg-elev)", borderBottom: "1px solid var(--border)", display: "flex" }}>
              {[
                { id: "kitchen", label: "Kitchen", emoji: "🏭" },
                { id: "forge",   label: "Forge",   emoji: "⚒️" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveCraftingTab(t.id)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "0.35rem", padding: "0.55rem 1rem",
                    background: "none", border: "none",
                    borderBottom: activeCraftingTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                    cursor: "pointer",
                    color: activeCraftingTab === t.id ? "var(--accent)" : "var(--muted)",
                    fontWeight: activeCraftingTab === t.id ? 600 : 400,
                    fontSize: "0.8rem",
                  }}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            {activeCraftingTab === "kitchen" && (
              <ProcessingZone game={game} onHireKitchenWorker={handleHireKitchenWorker} onAssignKitchenWorkerRecipe={handleAssignKitchenWorkerRecipe} onUpgradeKitchenWorker={handleUpgradeKitchenWorker} onFireKitchenWorker={handleFireKitchenWorker} onUpgradePlot={handleUpgradePlot} onBuyFeast={handleBuyFeast} onCancelKitchenWorkerRecipe={handleCancelKitchenWorkerRecipe} onToggleKitchenWorkerAutoRestart={handleToggleKitchenAutoRestart} onSetBatchOverride={handleSetKitchenBatchOverride} onApplyFishMeal={handleApplyFishMeal} />
            )}
            {activeCraftingTab === "forge" && (
              <ForgeZone
                game={game}
                onBuildForge={handleBuildForge}
                onHireForgeWorker={handleHireForgeWorker}
                onAssignForgeWorkerRecipe={handleAssignForgeWorkerRecipe}
                onUpgradeForgeWorker={handleUpgradeForgeWorker}
                onFireForgeWorker={handleFireForgeWorker}
                onCancelForgeWorkerRecipe={handleCancelForgeWorkerRecipe}
                onToggleForgeWorkerAutoRestart={handleToggleForgeWorkerAutoRestart}
                onUpgradeForgeInstance={handleUpgradeForgeInstance}
              />
            )}
          </>
        )}
        {activeMainTab === "town" && (
          <TownZone game={game} onBuildHome={handleBuildTownHome} onBuyBakery={handleBuyTownBakery} onToggleBakery={handleToggleBakery} onTogglePantry={handleTogglePantry} onToggleCannery={handleToggleCannery} onUpgradeTownBuilding={handleUpgradeTownBuilding} onBuyJamBuilding={handleBuyJamBuilding} onBuySauceBuilding={handleBuySauceBuilding} onUpgradeTownHall={handleUpgradeTownHall} onSetTreasuryTier={handleSetTreasuryTier} onBuildBank={handleBuildBank} onUpgradeBank={handleUpgradeBank} onSetActiveBankTier={handleSetActiveBankTier} prestigeReady={prestigeReady} onPrestige={() => setShowPrestigeModal(true)} onReset={handleResetGame} onSetTreasuryCap={handleSetTreasuryCap} onBuildTownBuilding={handleBuildTownBuilding} onAssignTownBuildingWorker={handleAssignTownBuildingWorker} onToggleTavernMode={handleToggleTavernMode} onStartSchoolResearch={handleStartSchoolResearch} onInvestNow={handleInvestNow}/>
        )}
        {activeMainTab === "world" && (
          <WorldZone
            game={game}
            onSendAdventurer={handleSendAdventurer}
            onReturnAdventurer={handleReturnAdventurer}
            onEquipAdventurer={handleEquipAdventurer}
            onUnequipAdventurer={handleUnequipAdventurer}
            onHireWorldWorker={handleHireWorldWorker}
            onFireWorldWorker={handleFireWorldWorker}
            onGiveArtisanFood={handleGiveArtisanFood}
            onRemoveArtisanFood={handleRemoveArtisanFood}
            onUseArtisanFood={handleUseArtisanFood}
            onSpendSkillPoint={handleSpendSkillPoint}
            onGiveBuffItem={handleGiveBuffItem}
            onRemoveBuffItem={handleRemoveBuffItem}
            onHireAdventurer={handleHireAdventurer}
            onReviveAdventurer={handleReviveAdventurer}
            onPrestigeAdventurer={handlePrestigeAdventurer}
            onStartAutoBattle={handleStartAutoBattle}
            onReturnAutoBattle={handleReturnAutoBattle}
            onRequestAutoBattleStop={handleRequestAutoBattleStop}
            autoBattleLootResult={autoBattleLootResult}
            onDismissAutoBattleLoot={() => setAutoBattleLootResult(null)}
            onAssignHeroToBoss={handleAssignHeroToBoss}
            onUnassignHeroFromBoss={handleUnassignHeroFromBoss}
            onUseBossAbility={handleUseBossAbility}
            onAcknowledgeBossVictory={handleAcknowledgeBossVictory}
            onReviveHeroInBossFight={handleReviveHeroInBossFight}
          />
        )}
        {activeMainTab === "animals" && (
          <AnimalsZone
            game={game}
            onBuyPond={handleBuyPond}
            onCatchFish={handleCatchFish}
            onBuyAnimal={handleBuyAnimal}
            onCollectAnimal={handleCollectAnimal}
            onCollectAll={handleCollectAllAnimals}
            onInteractAnimal={handleInteractAnimal}
            onBuyPet={handleBuyPet}
            onInteractPet={handleInteractPet}
            onHireBarnWorker={handleHireBarnWorker}
            onFireBarnWorker={handleFireBarnWorker}
            onReassignBarnWorker={handleReassignBarnWorker}
            onUpgradeBarnWorker={handleUpgradeBarnWorker}
            onUpgradeAnimalStorage={handleUpgradeAnimalStorage}
            onUnlockFishingBody={handleUnlockFishingBody}
            onSetFishingActiveBody={handleSetFishingActiveBody}
            onUpgradeFishingWorker={handleUpgradeFishingWorker}
            onSetFishingWorkerBait={handleSetFishingWorkerBait}
            onHireFishingWorker={handleHireFishingWorker}
            onFireFishingWorker={handleFireFishingWorker}
            onUpgradeAnimalYield={handleUpgradeAnimalYield}
            onBuildBarnBuilding={handleBuildBarnBuilding}
            onUpgradeBarnBuilding={handleUpgradeBarnBuilding}
            onToggleFishingWorkerAllowedFish={handleToggleFishingWorkerAllowedFish}
            onBuyFishingPlayerUpgrade={handleBuyFishingPlayerUpgrade}
          />
        )}
      </div>
      <GameNav game={game} activeMainTab={activeMainTab} onMainTabChange={setActiveMainTab} prestigeReady={prestigeReady} />
      {hasPendingFarmUnlock && !hasPendingAssignments && <FarmUnlockModal game={game} onUnlock={handleUnlockFarm} />}
      {hasPendingSeasonUnlock && !hasPendingAssignments && <SeasonUnlockModal game={game} onUnlockFarm={handleUnlockSeasonFarm} onUnlockBarn={handleUnlockSeasonBarn} onSkipUnlock={handleSkipSeasonUnlock} />}
      {hasPendingAssignments && <FarmAssignmentScreen game={game} onAssign={handleAssignWorker} />}
      {showPrestigeModal && <PrestigeModal game={game} onComplete={handlePrestigeComplete} onCancel={() => setShowPrestigeModal(false)} />}
    </div>
  );
}