import React, { useState, useRef, useEffect } from "react";
import { CROPS, SEASON_FARMS, SEASONAL_QUESTS } from "../gameConstants";
import { isFarmAutomated, isFarmPrestigeReady, getAvailableWorkerSlots, getCompletedQuestIds } from "../gameEngine";
 
export const MAIN_TABS = ["farms", "market", "kitchen", "town", "world", "view"];

const CROP_ORDER = ["wheat", "berries", "tomatoes"];

export function FarmSubTabs({ game, activeFarmIndex, onFarmChange }) {
  const [openCrop, setOpenCrop] = useState(null);
  const dropdownRef = useRef(null);

  const visibleFarms =
    game.season >= 4
      ? game.farms
      : game.farms.filter((f) =>
          (SEASON_FARMS[game.season] ?? ["wheat"]).includes(f.crop)
        );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openCrop) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenCrop(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openCrop]);

  if (visibleFarms.length <= 1) return null;

  // Group farms by crop type
  const cropTypes = CROP_ORDER.filter((cropId) =>
    visibleFarms.some((f) => f.crop === cropId)
  );

  // Find which crop type the active farm belongs to
  const activeFarm = visibleFarms[activeFarmIndex];
  const activeCropType = activeFarm?.crop ?? null;

  return (
    <div
      ref={dropdownRef}
      style={{
        background: "var(--bg-elev)",
        borderBottom: "1px solid var(--border)",
        padding: "0.4rem 0.75rem",
        display: "flex",
        gap: "0.4rem",
        flexWrap: "wrap",
        position: "relative",
        zIndex: 20,
      }}
    >
      {cropTypes.map((cropId) => {
        const crop = CROPS[cropId];
        const farmsOfType = visibleFarms.filter((f) => f.crop === cropId);
        const isActiveCrop = activeCropType === cropId;
        const isOpen = openCrop === cropId;

        const anyNeedsAttention = farmsOfType.some((farm) => {
          const hasWorkers = (game.workers ?? []).some((w) => w.farmId === farm.id);
          const hasReady = (farm.plots ?? []).some((p) => p.state === "ready");
          return !hasWorkers && hasReady;
        });
        const anyPrestigeReady = farmsOfType.some((farm) =>
          isFarmPrestigeReady(farm, game.workers, game)
        );

        return (
          <div key={cropId} style={{ position: "relative" }}>
            <button
              onClick={() => {
                if (farmsOfType.length === 1) {
                  const idx = visibleFarms.indexOf(farmsOfType[0]);
                  onFarmChange(idx);
                  setOpenCrop(null);
                } else {
                  setOpenCrop(isOpen ? null : cropId);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.28rem 0.65rem",
                borderRadius: "999px",
                border: `1px solid ${isActiveCrop ? "var(--accent)" : "var(--border)"}`,
                background: isActiveCrop
                  ? "rgba(99,102,241,0.15)"
                  : "var(--bg)",
                color: isActiveCrop ? "var(--accent)" : "var(--muted)",
                fontWeight: isActiveCrop ? 600 : 400,
                fontSize: "0.75rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>{crop.emoji}</span>
              <span>{crop.name}</span>
              {farmsOfType.length > 1 && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: isActiveCrop
                      ? "rgba(99,102,241,0.25)"
                      : "rgba(255,255,255,0.08)",
                    borderRadius: "999px",
                    padding: "0 0.3rem",
                    fontWeight: 700,
                    color: isActiveCrop ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {farmsOfType.length}
                </span>
              )}
              {anyPrestigeReady && (
                <span style={{ fontSize: "0.6rem", color: "#4ade80", fontWeight: 700 }}>\u2713</span>
              )}
              {anyNeedsAttention && (
                <span style={{
                  fontSize: "0.55rem", fontWeight: 700,
                  background: "#ef4444", color: "#fff",
                  borderRadius: "999px", padding: "1px 4px",
                }}>!</span>
              )}
              {farmsOfType.length > 1 && (
                <span style={{ fontSize: "0.6rem", color: "var(--muted)", marginLeft: "1px" }}>
                  {isOpen ? "\u25b2" : "\u25bc"}
                </span>
              )}
            </button>

            {isOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  minWidth: "150px",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {farmsOfType.map((farm, i) => {
                  const globalIdx = visibleFarms.indexOf(farm);
                  const isSelected = activeFarmIndex === globalIdx;
                  const hasWorkers = (game.workers ?? []).some((w) => w.farmId === farm.id);
                  const hasReady = (farm.plots ?? []).some((p) => p.state === "ready");
                  const needsAttention = !hasWorkers && hasReady;
                  const prestigeReady = isFarmPrestigeReady(farm, game.workers, game);

                  return (
                    <button
                      key={farm.id}
                      onClick={() => {
                        onFarmChange(globalIdx);
                        setOpenCrop(null);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 0.75rem",
                        background: isSelected ? "rgba(99,102,241,0.15)" : "none",
                        border: "none",
                        borderBottom: i < farmsOfType.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                        cursor: "pointer",
                        color: isSelected ? "var(--accent)" : "var(--text)",
                        fontSize: "0.78rem",
                        fontWeight: isSelected ? 600 : 400,
                        textAlign: "left",
                      }}
                    >
                      <span>{crop.emoji}</span>
                      <span style={{ flex: 1 }}>
                        {crop.name} Farm {i + 1}
                      </span>
                      {prestigeReady && (
                        <span style={{ fontSize: "0.6rem", color: "#4ade80", fontWeight: 700 }}>\u2713</span>
                      )}
                      {needsAttention && (
                        <span style={{
                          fontSize: "0.55rem", fontWeight: 700,
                          background: "#ef4444", color: "#fff",
                          borderRadius: "999px", padding: "1px 4px",
                        }}>!</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
 
export default function GameNav({
  game,
  activeMainTab,
  onMainTabChange,
  prestigeReady,
}) {
  const idleKitchenWorkers = (game.kitchenWorkers ?? []).filter(
    (w) => !w.busy
  ).length;

  const idleSmithWorkers = (game.forgeWorkers ?? []).filter(
    (w) => !w.busy
  ).length;
  const totalIdleCrafters = idleKitchenWorkers + idleSmithWorkers;
 
  const marketQueueTotal = (game.marketWorkers ?? []).reduce(
    (s, w) => s + (w.queue ?? []).reduce((qs, o) => qs + o.quantity, 0),
    0
  );
 
  const townUnlocked = game?.town?.unlocked === true;
  const starvingTown = game?.town?.starving === true;
  const townPeople = Math.floor(game?.town?.people ?? 0);
 
  const readyAnimals = Object.values(game.animals ?? {}).reduce(
    (sum, arr) => sum + arr.filter((a) => a.ready).length, 0
  );
 
  const unhappyAnimals = Object.values(game.animals ?? {}).reduce(
    (sum, arr) => sum + arr.filter((a) => (a.mood ?? 100) < 50).length, 0
  );
 
  const availableWorkerSlots = getAvailableWorkerSlots(game);

  // Quest badge: any quest done but not yet claimed
  const _season = game?.season ?? 1;
  const _questData = SEASONAL_QUESTS[Math.min(_season, 20)];
  const _completedIds = _questData ? getCompletedQuestIds(game) : new Set();
  const _claimedIds = new Set(game?.questProgress?.claimedQuestIds ?? []);
  const questClaimableCount = _questData
    ? _questData.quests.filter(q => _completedIds.has(q.id) && !_claimedIds.has(q.id)).length
    : 0;

 
  // World badge: red > yellow > green priority
  const adventurers = game.adventurers ?? [];
  const anyAdventurerDead = adventurers.some((adv) => (adv.hp ?? 1) <= 0);
  const adventurerLootReady = adventurers.some((adv) => {
    if (adv.pendingAutoCollect) return true;
    if (!adv.mission) return false;
    const elapsed = (Date.now() - adv.mission.startTime) / 1000;
    return elapsed >= adv.mission.duration;
  });
  const adventurerReadyToGo = adventurers.some((adv) =>
    !adv.mission && !adv.tavernResting && (adv.hp ?? 0) >= (adv.maxHp ?? adv.hp ?? 1)
  );
  const worldBadge = anyAdventurerDead ? "💀"
    : adventurerLootReady ? "!"
    : adventurerReadyToGo ? "●"
    : null;
  const worldBadgeColor = anyAdventurerDead ? "#ef4444"
    : adventurerLootReady ? "#fbbf24"
    : "#4ade80";
 
  // Farm badge: any farm with no workers but ready plots
  const farms = game.farms ?? [];
  const farmNeedsAttention = farms.some((farm) => {
    const hasWorkers = (game.workers ?? []).some((w) => w.farmId === farm.id);
    const hasReady = (farm.plots ?? []).some((p) => p.state === "ready");
    return !hasWorkers && hasReady;
  });

  const tabs = [
    { id: "farms",    label: "Farms",    emoji: "🌱", badge: farmNeedsAttention ? "!" : null, badgeColor: "#ef4444" },
    { id: "market",   label: "Market",   emoji: "💰", badge: marketQueueTotal > 0 ? marketQueueTotal : null, badgeColor: "#4ade80" },
    { id: "crafting", label: "Crafting", emoji: "🏭", badge: totalIdleCrafters > 0 ? totalIdleCrafters : null, badgeColor: "#ef4444" },
    { id: "animals",  label: "Animals",  emoji: "🐾", badge: unhappyAnimals > 0 ? "⚠" : readyAnimals > 0 ? readyAnimals : null, badgeColor: unhappyAnimals > 0 ? "#ef4444" : "#fbbf24" },
    { id: "town",     label: "Town",     emoji: "🏘️", badge: townUnlocked ? starvingTown ? "!" : prestigeReady ? "🌱" : availableWorkerSlots > 0 ? `+${availableWorkerSlots}` : questClaimableCount > 0 ? "!" : null : null, badgeColor: starvingTown ? "#ef4444" : prestigeReady ? "#f59e0b" : questClaimableCount > 0 && !availableWorkerSlots ? "#fbbf24" : "#4ade80" },
    { id: "world",    label: "World",    emoji: "⚔️", badge: worldBadge, badgeColor: worldBadgeColor },
    { id: "view",     label: "Live",     emoji: "🗺️", badge: null },
  ];
 
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--bg-elev)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeMainTab === tab.id;
 
        return (
          <button
            key={tab.id}
            onClick={() => onMainTabChange(tab.id)}
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              padding: "0.6rem 0.25rem",
              background: "none",
              border: "none",
              borderTop: isActive
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              cursor: "pointer",
              color: isActive ? "var(--accent)" : "var(--muted)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "0.68rem",
              transition: "color 0.15s ease",
            }}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>
              {tab.emoji}
            </span>
            <span>{tab.label}</span>
 
            {tab.badge && (
              <span
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "calc(50% - 18px)",
                  background: tab.badgeColor,
                  color: "#fff",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  borderRadius: "999px",
                  padding: "1px 4px",
                  lineHeight: 1.4,
                  minWidth: "14px",
                  textAlign: "center",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}