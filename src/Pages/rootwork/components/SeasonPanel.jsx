// src/Pages/rootwork/components/SeasonPanel.jsx
 
import React from "react";
import {
  CROPS, SEASON_FARMS, PRESTIGE_SKILL_TREE,
  FIRST_EXTRA_FARM_SEASON, FIRST_CHOICE_SEASON,
  getPrestigeCashThreshold, PRESTIGE_MIN_PLOTS, PRESTIGE_MIN_BARN_WORKERS, PRESTIGE_MIN_BARN_ANIMALS,
  BARN_BUILDINGS, BARN_BUILDING_ORDER,
  TOWN_HALL_LEVEL_COSTS,
} from "../gameConstants";
import {
  isFarmPrestigeReady, getPrestigeBlockers, getNextFarmUnlockCost,
  getTownHallLevel, getEffectiveGrowTime, getWorkerHarvestRate,
  getTreasuryGrowBonus, getFishMealGrowBonus, getSchoolGrowBonus,
  getAvailablePrestigePoints, getBarnPrestigeReady,
} from "../gameEngine";
 
function FarmChecklist({ farm, game }) {
  const crop = CROPS[farm.crop];
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const plotsOk = farm.unlockedPlots >= PRESTIGE_MIN_PLOTS;
 
  const growTime = getEffectiveGrowTime(
    farm, game.workers, farm.crop, null,
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
  const ready = hasWorker && hasAnimals;
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
 
export default function SeasonPanel({ game, prestigeReady, onPrestige, onReset }) {
  const isExtraFarmSeason = game.season >= FIRST_EXTRA_FARM_SEASON;
  const farmsToCheck = isExtraFarmSeason
    ? game.farms
    : game.farms.filter((f) => (SEASON_FARMS[Math.min(game.season, 3)] ?? []).includes(f.crop));
 
  const totalWorkers = game.workers.length;
  const cashThreshold = getPrestigeCashThreshold(game.season);
  const cash = game.cash ?? 0;
  const cashOk = cash >= cashThreshold;
  const requiredTHLevel = Math.min(4, game.season);
  const thOk = getTownHallLevel(game) >= requiredTHLevel;
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
 
      {/* Town Hall requirement */}
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
              ? "Each built barn needs at least one worker assigned."
              : "Automate your barn by hiring at least one barn worker."}
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