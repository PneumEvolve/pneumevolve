// src/Pages/rootwork/components/SeasonPanel.jsx
 
import React from "react";
import {
  CROPS, SEASON_FARMS, PRESTIGE_SKILL_TREE,
  FIRST_EXTRA_FARM_SEASON, FIRST_CHOICE_SEASON,
  getPrestigeCashThreshold, PRESTIGE_MIN_PLOTS, PRESTIGE_MIN_BARN_WORKERS, PRESTIGE_MIN_BARN_ANIMALS,
  BARN_BUILDINGS, BARN_BUILDING_ORDER, BARN_BUILDING_TIERS,
  TOWN_HALL_LEVEL_COSTS, SEASONAL_QUESTS, QUEST_GATE_STARTS_SEASON
} from "../gameConstants";
import {
  isFarmPrestigeReady, getPrestigeBlockers, getNextFarmUnlockCost,
  getTownHallLevel, getEffectiveGrowTime, getWorkerHarvestRate,
  getTreasuryGrowBonus, getFishMealGrowBonus, getSchoolGrowBonus,
  getAvailablePrestigePoints, getBarnPrestigeReady,
  getBarnInstanceSupplyRate, getBarnInstanceDemandRate, getCompletedQuestIds,
  evaluateQuestCondition, getFarmAverageGrowTime,
} from "../gameEngine";
 
function FarmChecklist({ farm, game }) {
  const crop = CROPS[farm.crop];
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const plotsOk = farm.unlockedPlots >= PRESTIGE_MIN_PLOTS;
 
  const growTime = getFarmAverageGrowTime(
  farm, game.workers, farm.crop,
  game.feastBonusPercent ?? 0,
  (game.town?.growthBonusPercent ?? 0) + getSchoolGrowBonus(game),
  getTreasuryGrowBonus(game),
  getFishMealGrowBonus(game)
);
  const demandRate = farm.unlockedPlots / growTime;
  const supplyRate = farmWorkers.reduce((sum, w) => sum + getWorkerHarvestRate(w), 0);
  const workersOk = farmWorkers.length > 0 && supplyRate >= demandRate;
  const ready = plotsOk && workersOk;
 
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontWeight: 600 }}>{crop.emoji} {crop.name} Farm</span>
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px",
          background: ready ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)",
          border: `1px solid ${ready ? "#4ade80" : "#f59e0b"}`,
          color: ready ? "#166534" : "#92400e",
        }}>
          {ready ? "✓ Ready" : "Needs work"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: plotsOk ? "#4ade80" : "var(--muted)" }}>
          <span>{plotsOk ? "☑" : "☐"}</span>
          <span>3×3 plots unlocked <span style={{ opacity: 0.7 }}>({farm.unlockedPlots}/{PRESTIGE_MIN_PLOTS})</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: workersOk ? "#4ade80" : "var(--muted)" }}>
          <span>{workersOk ? "☑" : "☐"}</span>
          <span>
            Workers keeping up
            {farmWorkers.length > 0 && (
              <span style={{ opacity: 0.7, marginLeft: "0.4rem" }}>
                ({supplyRate.toFixed(2)} plots/s ≥ {demandRate.toFixed(2)} needed)
              </span>
            )}
            {farmWorkers.length === 0 && <span style={{ opacity: 0.7, marginLeft: "0.4rem" }}>(no workers)</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
 
function BarnChecklist({ barnInstance, game, label }) {
  const def = BARN_BUILDINGS[barnInstance.buildingType];
  const workers = (barnInstance.barnWorkers ?? []).length;
  const hasWorker = workers >= PRESTIGE_MIN_BARN_WORKERS;
  const animals = (barnInstance.animals ?? []).length;
  const hasAnimals = animals >= PRESTIGE_MIN_BARN_ANIMALS;
  const supplyRate = getBarnInstanceSupplyRate(barnInstance);
  const demandRate = getBarnInstanceDemandRate(barnInstance, game);
  const workerKeepsUp = hasWorker && hasAnimals && supplyRate >= demandRate;
  const ready = hasWorker && hasAnimals && workerKeepsUp;
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontWeight: 600 }}>{def?.emoji} {label}</span>
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px",
          background: ready ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)",
          border: `1px solid ${ready ? "#4ade80" : "#f59e0b"}`,
          color: ready ? "#166534" : "#92400e",
        }}>
          {ready ? "✓ Ready" : "Not ready"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: hasWorker ? "#4ade80" : "var(--muted)" }}>
          <span>{hasWorker ? "☑" : "☐"}</span>
          <span>At least 1 barn worker assigned <span style={{ opacity: 0.7 }}>({workers}/{PRESTIGE_MIN_BARN_WORKERS})</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: hasAnimals ? "#4ade80" : "var(--muted)" }}>
          <span>{hasAnimals ? "☑" : "☐"}</span>
          <span>At least {PRESTIGE_MIN_BARN_ANIMALS} animals in barn <span style={{ opacity: 0.7 }}>({animals}/{PRESTIGE_MIN_BARN_ANIMALS})</span></span>
        </div>
        {hasWorker && hasAnimals && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: workerKeepsUp ? "#4ade80" : "var(--muted)" }}>
            <span>{workerKeepsUp ? "☑" : "☐"}</span>
            <span>
              Workers keeping up
              <span style={{ opacity: 0.7, marginLeft: "0.4rem" }}>
                ({supplyRate.toFixed(3)} collects/s ≥ {demandRate.toFixed(3)} needed)
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
 
function SkillTag({ skillId, count }) {
  const node = PRESTIGE_SKILL_TREE[skillId];
  if (!node) return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "999px",
      background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "var(--text)",
    }}>
      <span>{node.emoji}</span>
      <span>{node.name}</span>
      {count > 1 && <span style={{ color: "#a78bfa", fontWeight: 700 }}>×{count}</span>}
    </div>
  );
}
 
// ─── Quest Progress Tracker ────────────────────────────────────────────────────

// Returns a tracker for a single bare condition object (not the full quest wrapper).
function getConditionTracker(game, c) {
  const qp = game.questProgress ?? {};
  if (c.type === "counter") {
    return { current: Math.min(qp[c.key] ?? 0, c.value), target: c.value };
  }
  if (c.type === "hero_level") {
    const best = Math.max(0, ...(game.adventurers ?? []).map(a => a.level ?? 1));
    return { current: Math.min(best, c.value), target: c.value, label: `Best hero: Lv ${best}` };
  }
  if (c.type === "hero_prestige") {
    const cur = qp.heroPrestiges ?? 0;
    return { current: Math.min(cur, c.value), target: c.value };
  }
  if (c.type === "live_check") {
    // Synthesise a minimal quest wrapper so we can reuse evaluateQuestCondition
    const fakeQuest = { condition: c };
    switch (c.check) {
      case "crop_stockpile_10k": {
        const best = Math.max(0, ...Object.values(game.crops ?? {}).map(v => Number(v) || 0));
        return { current: Math.min(best, 10000), target: 10000, label: `Best crop: ${Math.floor(best).toLocaleString()} / 10,000` };
      }
      case "two_heroes_level_15": {
        const count = (game.adventurers ?? []).filter(a => (a.level ?? 1) >= 15).length;
        return { current: Math.min(count, 2), target: 2, label: `Heroes at Lv 15: ${count} / 2` };
      }
      case "tractor_workers": {
        const req = c.value ?? 2;
        const count = (game.workers ?? []).filter(w => w.gear === "tractor").length;
        return { current: Math.min(count, req), target: req, label: `Tractor workers: ${count} / ${req}` };
      }
      case "kitchen_workers_active": {
        const req = c.value ?? 1;
        const count = (game.kitchenWorkers ?? []).filter(w => w.recipeId && w.busy).length;
        return { current: Math.min(count, req), target: req, label: `Active kitchen workers: ${count} / ${req}` };
      }
      case "fishing_workers_active": {
        const req = c.value ?? 1;
        const count = Object.values(game.fishing?.bodies ?? {}).filter(b => b.worker).length;
        return { current: Math.min(count, req), target: req, label: `Fishing workers: ${count} / ${req}` };
      }
      case "two_prestiged_heroes": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 1).length;
        return { current: Math.min(count, 2), target: 2, label: `Prestiged heroes: ${count} / 2` };
      }
      case "farm_expanded_5x5": {
        const done = (game.farms ?? []).some(farm => ((game.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 2);
        return { boolean: true, done };
      }
      case "barn_upgraded_and_full": {
        const bestInst = (game.barnInstances ?? []).find(inst => (inst.tier ?? 1) >= 2);
        if (bestInst) {
          const animalCount = (bestInst.animals ?? []).length;
          const tierData = BARN_BUILDING_TIERS[(bestInst.tier ?? 1) - 1] ?? BARN_BUILDING_TIERS[0];
          const cap = tierData.animalSlots;
          return { boolean: false, current: animalCount, target: cap, label: `Barn animals: ${animalCount} / ${cap} (upgraded ✓)` };
        }
        const done = evaluateQuestCondition(game, fakeQuest);
        return { boolean: true, done };
      }
      case "farm_expanded_6x6": {
        const done = (game.farms ?? []).some(farm => ((game.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 3);
        return { boolean: true, done };
      }
      case "farm_expanded_7x7": {
        const done = (game.farms ?? []).some(farm => ((game.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 4);
        return { boolean: true, done };
      }
      case "all_farms_expanded_7x7": {
        const total = (game.farms ?? []).length;
        const done_count = (game.farms ?? []).filter(farm => ((game.farmInvestments ?? {})[farm.id]?.plotCapIndex ?? 0) >= 4).length;
        return { current: done_count, target: total, label: `Farms at 7×7: ${done_count} / ${total}` };
      }
      case "hero_prestige_level": {
        const req = c.value ?? 1;
        const best = Math.max(0, ...(game.adventurers ?? []).map(a => a.prestigeLevel ?? 0));
        return { current: Math.min(best, req), target: req, label: `Best hero prestige: P${best}` };
      }
      case "hero_gear_tier": {
        const done = evaluateQuestCondition(game, fakeQuest);
        return { boolean: true, done };
      }
      case "heroes_auto_battling": {
        const req = c.value ?? 1;
        const cur = qp.maxSimultaneousAutoBattlers ?? 0;
        return { current: Math.min(cur, req), target: req, label: `Max simultaneous auto-battlers: ${cur} / ${req}` };
      }
      case "longest_auto_run": {
        const req = c.value ?? 1;
        const cur = qp.maxAutoBattleRun ?? 0;
        return { current: Math.min(cur, req), target: req, label: `Longest auto-battle run: ${cur} / ${req}` };
      }
      case "crop_stockpile_25k": {
        const best = Math.max(0, ...Object.values(game.crops ?? {}).map(v => Number(v) || 0));
        return { current: Math.min(best, 25000), target: 25000, label: `Best crop: ${Math.floor(best).toLocaleString()} / 25,000` };
      }
      case "crop_stockpile_50k": {
        const best = Math.max(0, ...Object.values(game.crops ?? {}).map(v => Number(v) || 0));
        return { current: Math.min(best, 50000), target: 50000, label: `Best crop: ${Math.floor(best).toLocaleString()} / 50,000` };
      }
      case "crop_stockpile_100k": {
        const best = Math.max(0, ...Object.values(game.crops ?? {}).map(v => Number(v) || 0));
        return { current: Math.min(best, 100000), target: 100000, label: `Best crop: ${Math.floor(best).toLocaleString()} / 100,000` };
      }
      case "crop_stockpile_250k": {
        const best = Math.max(0, ...Object.values(game.crops ?? {}).map(v => Number(v) || 0));
        return { current: Math.min(best, 250000), target: 250000, label: `Best crop: ${Math.floor(best).toLocaleString()} / 250,000` };
      }
      case "crop_stockpile_500k": {
        const best = Math.max(0, ...Object.values(game.crops ?? {}).map(v => Number(v) || 0));
        return { current: Math.min(best, 500000), target: 500000, label: `Best crop: ${Math.floor(best).toLocaleString()} / 500,000` };
      }
      case "crop_diversity_5": {
        const count = Object.values(game.crops ?? {}).filter(v => v >= 1000).length;
        return { current: Math.min(count, 5), target: 5, label: `Crops at 1k+: ${count} / 5` };
      }
      case "crop_diversity_5_10k": {
        const count = Object.values(game.crops ?? {}).filter(v => v >= 10000).length;
        return { current: Math.min(count, 5), target: 5, label: `Crops at 10k+: ${count} / 5` };
      }
      case "three_prestiged_heroes": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 1).length;
        return { current: Math.min(count, 3), target: 3, label: `Prestiged heroes: ${count} / 3` };
      }
      case "three_heroes_level_15": {
        const count = (game.adventurers ?? []).filter(a => (a.level ?? 1) >= 15).length;
        return { current: Math.min(count, 3), target: 3, label: `Heroes at Lv 15: ${count} / 3` };
      }
      case "all_barns_tier2": {
        const total = (game.barnInstances ?? []).length;
        const done_count = (game.barnInstances ?? []).filter(inst => (inst.tier ?? 1) >= 2).length;
        return { current: done_count, target: total, label: `Barns at tier 2+: ${done_count} / ${total}` };
      }
      case "all_barns_tier3": {
        const total = (game.barnInstances ?? []).length;
        const done_count = (game.barnInstances ?? []).filter(inst => (inst.tier ?? 1) >= 3).length;
        return { current: done_count, target: total, label: `Barns at tier 3: ${done_count} / ${total}` };
      }
      case "two_heroes_prestige_3": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 3).length;
        return { current: Math.min(count, 2), target: 2, label: `Heroes at P3+: ${count} / 2` };
      }
      case "three_heroes_prestige_3": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 3).length;
        return { current: Math.min(count, 3), target: 3, label: `Heroes at P3+: ${count} / 3` };
      }
      case "three_heroes_prestige_5": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 5).length;
        return { current: Math.min(count, 3), target: 3, label: `Heroes at P5+: ${count} / 3` };
      }
      case "two_heroes_prestige_10": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 10).length;
        return { current: Math.min(count, 2), target: 2, label: `Heroes at P10+: ${count} / 2` };
      }
      case "three_heroes_prestige_10": {
        const count = (game.adventurers ?? []).filter(a => (a.prestigeLevel ?? 0) >= 10).length;
        return { current: Math.min(count, 3), target: 3, label: `Heroes at P10+: ${count} / 3` };
      }
      default: {
        const done = evaluateQuestCondition(game, fakeQuest);
        return { boolean: true, done };
      }
    }
  }
  return null;
}

// Wraps getConditionTracker for a full quest object; handles "and" type by returning sub-trackers.
function getQuestTracker(game, quest) {
  const c = quest.condition;
  if (c.type === "and") {
    const parts = (c.conditions ?? []).map(sub => {
      const t = getConditionTracker(game, sub);
      // Attach a human-readable label for each sub-condition if not already set
      if (t && !t.label) {
        if (sub.type === "counter") t.label = sub.key.replace(/([A-Z])/g, ' $1').trim() + `: ${Math.min(game.questProgress?.[sub.key] ?? 0, sub.value)} / ${sub.value}`;
      }
      return t;
    });
    return { type: "and", parts };
  }
  return getConditionTracker(game, c);
}

function QuestProgressBar({ tracker, done }) {
  if (!tracker || done) return null;

  // "and" quest — render each sub-condition as its own row
  if (tracker.type === "and") {
    return (
      <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {(tracker.parts ?? []).map((part, i) => {
          if (!part) return null;
          const partDone = part.boolean ? part.done : part.current >= part.target;
          if (part.boolean) {
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.6rem" }}>
                <span style={{ color: partDone ? "#4ade80" : "var(--muted)", flexShrink: 0 }}>{partDone ? "✓" : "✗"}</span>
                <span style={{ color: partDone ? "#4ade80" : "var(--muted)" }}>{part.label ?? (partDone ? "Complete" : "Not yet")}</span>
              </div>
            );
          }
          const pct = Math.min(100, (part.current / part.target) * 100);
          const label = part.label ?? `${part.current.toLocaleString()} / ${part.target.toLocaleString()}`;
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: partDone ? "#4ade80" : "var(--muted)", marginBottom: "0.1rem" }}>
                <span>{label}</span>
                <span>{Math.floor(pct)}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${pct}%`,
                  background: pct >= 100 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#60a5fa",
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (tracker.boolean) {
    return (
      <div style={{ fontSize: "0.6rem", color: tracker.done ? "#4ade80" : "var(--muted)", marginTop: "0.25rem" }}>
        {tracker.done ? "✓ Complete" : "✗ Not yet"}
      </div>
    );
  }
  const pct = Math.min(100, (tracker.current / tracker.target) * 100);
  const label = tracker.label ?? `${tracker.current.toLocaleString()} / ${tracker.target.toLocaleString()}`;
  return (
    <div style={{ marginTop: "0.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--muted)", marginBottom: "0.15rem" }}>
        <span>{label}</span>
        <span style={{ color: pct >= 100 ? "#4ade80" : "var(--muted)" }}>{Math.floor(pct)}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          width: `${pct}%`,
          background: pct >= 100 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#60a5fa",
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}


export default function SeasonPanel({ game, prestigeReady, onPrestige, onReset, onClaimQuestReward }) {
  const isExtraFarmSeason = game.season >= FIRST_EXTRA_FARM_SEASON;
  const farmsToCheck = isExtraFarmSeason
    ? game.farms
    : game.farms.filter((f) => (SEASON_FARMS[Math.min(game.season, 3)] ?? []).includes(f.crop));
 
  const totalWorkers = game.workers.length;
  const cashThreshold = getPrestigeCashThreshold(game.season);
  const cash = game.cash ?? 0;
  const cashOk = cash >= cashThreshold;
  const requiredTHLevel = game.season <= 3 ? game.season : null;
  const thOk = requiredTHLevel === null || getTownHallLevel(game) >= requiredTHLevel;
  const blockers = getPrestigeBlockers(game);
  const nextFarmCost = getNextFarmUnlockCost(game);
 
  const prestigeSkills = game.prestigeSkills ?? {};
  const totalPoints = game.prestigePoints ?? 0;
  const availablePoints = getAvailablePrestigePoints(game);
  const ownedSkillEntries = Object.entries(prestigeSkills).filter(([, count]) => count > 0);
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 4rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🌱 Season {game.season}</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          {prestigeReady ? "All conditions met — ready to begin a new season!" : "Complete all requirements below to unlock the next season."}
        </p>
      </div>
 
      {/* Quest board — full for S1-3, compact summary for S4+ */}
      {(() => {
        const season = game.season ?? 1;
        const questData = SEASONAL_QUESTS[Math.min(season, 20)];
        if (!questData) return null;
        const completedIds = getCompletedQuestIds(game);
        const claimedIds = new Set(game.questProgress?.claimedQuestIds ?? []);
        const completedCount = questData.quests.filter(q => completedIds.has(q.id)).length;
        const requiredCount = questData.requiredCount ?? 0;
        const reward = season * 100;
        const isGated = season >= QUEST_GATE_STARTS_SEASON;

        return (
          <div className="card p-4" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>📋 Season {season} Quests</h3>
              {isGated ? (
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px",
                  background: completedCount >= requiredCount ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)",
                  border: `1px solid ${completedCount >= requiredCount ? "#4ade80" : "#f59e0b"}`,
                  color: completedCount >= requiredCount ? "#166534" : "#92400e",
                }}>
                  {completedCount}/{requiredCount} required
                </span>
              ) : (
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontStyle: "italic" }}>Optional</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {questData.quests.map(quest => {
                const done = completedIds.has(quest.id);
                const claimed = claimedIds.has(quest.id);
                const claimable = done && !claimed;
                return (
                  <div key={quest.id} style={{
                    display: "flex", alignItems: "flex-start", gap: "0.5rem",
                    padding: "0.4rem 0.55rem", borderRadius: "7px",
                    background: claimed ? "rgba(74,222,128,0.08)" : claimable ? "rgba(250,204,21,0.08)" : "var(--bg)",
                    border: `1px solid ${claimed ? "rgba(74,222,128,0.3)" : claimable ? "rgba(250,204,21,0.5)" : "var(--border)"}`,
                  }}>
                    <span style={{ fontSize: "0.8rem", flexShrink: 0, marginTop: "0.05rem" }}>
                      {claimed ? "✅" : claimable ? "🎁" : quest.emoji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: claimed ? "#4ade80" : claimable ? "#fbbf24" : "var(--text)" }}>
                        {quest.title}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem", lineHeight: 1.4 }}>
                        {quest.description}
                      </div>
                      {claimed && (
                        <div style={{ fontSize: "0.6rem", color: "#4ade80", marginTop: "0.15rem", fontWeight: 600 }}>
                          💰 Cash claimed
                        </div>
                      )}
                      <QuestProgressBar tracker={getQuestTracker(game, quest)} done={done} />
                    </div>
                    {claimable && (
                      <button
                        onClick={() => onClaimQuestReward && onClaimQuestReward(quest.id)}
                        style={{
                          flexShrink: 0, fontSize: "0.65rem", fontWeight: 700,
                          padding: "0.2rem 0.5rem", borderRadius: "6px", cursor: "pointer",
                          background: "rgba(250,204,21,0.2)", border: "1px solid #fbbf24",
                          color: "#92400e", whiteSpace: "nowrap",
                        }}>
                        Claim ${reward}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {!isGated && (
              <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.4rem", fontStyle: "italic", textAlign: "center" }}>
                Quests become required for prestige starting Season {QUEST_GATE_STARTS_SEASON}
              </p>
            )}
          </div>
        );
      })()}


      {/* Town Hall requirement — only shown for seasons 1-3 */}
      {requiredTHLevel !== null && (
        <div className="card p-4" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>🏛️ Town Hall</h3>
            <span style={{
              fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px",
              background: thOk ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)",
              border: `1px solid ${thOk ? "#4ade80" : "#f59e0b"}`,
              color: thOk ? "#166534" : "#92400e",
            }}>
              {thOk ? `✓ Level ${requiredTHLevel} reached` : `Level ${requiredTHLevel} required`}
            </span>
          </div>
          {!thOk && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.4rem" }}>
              Build Town Hall to level {requiredTHLevel} (costs ${TOWN_HALL_LEVEL_COSTS[requiredTHLevel - 1]}) to unlock prestige.
            </p>
          )}
        </div>
      )}
 
      {/* Farm automation checklist */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>Farm Readiness</h3>
        <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
          Each farm needs a full 3×3 grid and workers harvesting fast enough to keep up with growth.
        </p>
        {farmsToCheck.map((farm) => (
          <FarmChecklist key={farm.id} farm={farm} game={game} />
        ))}
      </div>
 
      {/* Barn readiness checklist — seasons 4-6 (season-specific barn) and season 7+ (all barns) */}
      {game.season >= 4 && (game.barnInstances ?? []).length > 0 && (
        <div className="card p-4" style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>Barn Readiness</h3>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
            {game.season >= FIRST_CHOICE_SEASON
              ? "Each built barn needs workers keeping up with animal production."
              : "Automate your barn — workers must keep pace with how fast animals produce."}
          </p>
          {(game.barnInstances ?? []).map((inst, idx) => {
            const sameTypeBefore = (game.barnInstances ?? []).slice(0, idx).filter(i => i.buildingType === inst.buildingType).length;
            const def = BARN_BUILDINGS[inst.buildingType];
            const typeInstances = (game.barnInstances ?? []).filter(i => i.buildingType === inst.buildingType);
            const label = typeInstances.length > 1 ? `${def?.name} ${sameTypeBefore + 1}` : def?.name;
            return <BarnChecklist key={inst.id} barnInstance={inst} game={game} label={label} />;
          })}
        </div>
      )}
 
      {/* Cash threshold */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>💰 Cash Requirement</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Required to prestige</span>
          <span style={{ fontWeight: 700, color: cashOk ? "#4ade80" : "#f59e0b" }}>${Math.floor(cash)} / ${cashThreshold}</span>
        </div>
        <div style={{ marginTop: "0.6rem", height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (cash / cashThreshold) * 100)}%`, background: cashOk ? "#4ade80" : "#f59e0b", borderRadius: "999px", transition: "width 0.4s ease" }} />
        </div>
        {cashOk
          ? <div style={{ fontSize: "0.7rem", color: "#4ade80", marginTop: "0.4rem" }}>✓ Cash requirement met</div>
          : <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem" }}>Sell crops at the Market to earn cash.</div>
        }
      </div>
 
      {/* Prestige skill tree summary */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>⭐ Skill Tree</h3>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
            {totalPoints} pt{totalPoints !== 1 ? "s" : ""} earned
            {availablePoints > 0 && ` · ${availablePoints} unspent`}
          </span>
        </div>
        {ownedSkillEntries.length === 0 ? (
          <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            No skills unlocked yet. Prestige to earn your first point — spend it in the New Season screen.
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {ownedSkillEntries.map(([skillId, count]) => (
              <SkillTag key={skillId} skillId={skillId} count={count} />
            ))}
          </div>
        )}
        {availablePoints > 0 && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "#a78bfa", fontWeight: 600 }}>
            💡 You have unspent points — open New Season to spend them!
          </div>
        )}
      </div>
 
      {/* What carries over */}
      <div className="card p-4" style={{ marginBottom: "1rem", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7 }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.4rem" }}>New season — what carries over</h3>
        <ul style={{ paddingLeft: "1rem", margin: 0 }}>
          <li>✅ 10% of your current crops</li>
          <li>✅ All artisan goods (bread, jam, sauce)</li>
          <li>✅ All cash and treasury balance</li>
          <li>✅ All prestige skills (permanent — earn +1 point per season)</li>
          <li>✅ All unlocked plots and ⭐ upgrades</li>
          <li>✅ Global Feast speed bonus</li>
          <li>✅ Town — homes, population, all buildings persist</li>
          <li>✅ 1 kept worker per season with full gear</li>
          {game.keptWorkers.length > 0 && <li>✅ {game.keptWorkers.length + 1} total kept workers returning</li>}
          {game.season >= FIRST_CHOICE_SEASON
            ? <li>✅ Season unlock — choose a new farm or barn</li>
            : game.season >= 4 && game.season <= 6
            ? <li>✅ New barn auto-unlocks (buy animals and hire workers yourself)</li>
            : <li>✅ A new farm unlocks automatically</li>}
          <li>❌ Plot states reset (first plot starts planted)</li>
          <li>❌ All non-kept workers reset — farm, kitchen, market, barn, fishing</li>
        </ul>
      </div>
 
      {/* Prestige button + blockers */}
      <div style={{ marginBottom: "1rem" }}>
        {!prestigeReady && blockers.length > 0 && (
          <div className="card p-3" style={{ marginBottom: "0.75rem", fontSize: "0.75rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--muted)" }}>Still needed:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {blockers.map((b, i) => (
                <div key={i} style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>⚠</span><span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onPrestige} disabled={!prestigeReady} className="btn w-full" style={{ fontSize: "0.9rem", padding: "0.75rem", opacity: prestigeReady ? 1 : 0.5 }}>
          {prestigeReady ? "🌱 Begin New Season →" : "Complete requirements above"}
        </button>
      </div>
 
      <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem" }}>Danger zone</p>
        <button onClick={onReset} className="btn btn-secondary w-full" style={{ fontSize: "0.78rem", padding: "0.5rem", color: "#ef4444", borderColor: "#ef4444" }}>
          Reset all progress
        </button>
      </div>
    </div>
  );
}