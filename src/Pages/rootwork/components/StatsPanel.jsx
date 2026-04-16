// src/Pages/rootwork/components/StatsPanel.jsx
 
import React from "react";
import { CROPS, SEASON_FARMS, FIRST_EXTRA_FARM_SEASON } from "../gameConstants";
import {
  getWorkerHarvestRate, getEffectiveGrowTime, getStatPerMinute,
  getTreasuryGrowBonus, getBankPriceBonus, getSellRate,
} from "../gameEngine";
 
function StatRow({ label, value, sub, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.3rem 0", borderBottom: "0.5px solid var(--border)" }}>
      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: valueColor ?? "var(--text)" }}>{value}</span>
        {sub && <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: "0.3rem" }}>{sub}</span>}
      </div>
    </div>
  );
}
 
function FarmStatsCard({ farm, game }) {
  const crop = CROPS[farm.crop];
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
 
  const growTime = getEffectiveGrowTime(
    farm, game.workers, farm.crop, null,
    game.feastBonusPercent ?? 0,
    game.town?.growthBonusPercent ?? 0,
    getTreasuryGrowBonus(game)
  );
  const demandRate = farm.unlockedPlots / growTime;
  const supplyRate = farmWorkers.reduce((sum, w) => sum + getWorkerHarvestRate(w), 0);
  const covered = supplyRate >= demandRate;
 
  const perMinActual = getStatPerMinute(game.stats?.farmCrops?.[farm.id]);
 
  return (
    <div className="card p-4" style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{crop.emoji} {crop.name} Farm</div>
        <span style={{
          fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px",
          background: covered ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)",
          border: `1px solid ${covered ? "#4ade80" : "#f59e0b"}`,
          color: covered ? "#166534" : "#92400e",
        }}>
          {covered ? "\u2713 Keeping up" : "Falling behind"}
        </span>
      </div>
 
      <StatRow label="Plots unlocked" value={farm.unlockedPlots} sub={`/ ${farm.plots.length} placed`} />
      <StatRow label="Workers" value={farmWorkers.length} />
      <StatRow label="Grow time" value={`${growTime}s`} sub="per plot" />
      <StatRow label="Demand rate" value={`${demandRate.toFixed(3)}`} sub="plots/sec needed" valueColor="#f59e0b" />
      <StatRow label="Supply rate" value={`${supplyRate.toFixed(3)}`} sub="plots/sec workers provide" valueColor={covered ? "#4ade80" : "#ef4444"} />
      <StatRow label="Output/min" value={perMinActual} sub={`${crop.emoji} actual (last 60s)`} valueColor="#4ade80" />
    </div>
  );
}
 
export default function StatsPanel({ game }) {
  const isExtraFarmSeason = game.season >= FIRST_EXTRA_FARM_SEASON;
  const visibleFarms = isExtraFarmSeason
    ? game.farms
    : game.farms.filter((f) => (SEASON_FARMS[Math.min(game.season, 3)] ?? []).includes(f.crop));
 
  const bankPriceBonus = getBankPriceBonus(game);
  const treasuryGrowBonus = getTreasuryGrowBonus(game);
 
  const kitchenItems = [
    { key: "bread", label: "Bread", emoji: "🍞" },
    { key: "jam",   label: "Jam",   emoji: "🍯" },
    { key: "sauce", label: "Sauce", emoji: "🥫" },
  ];
 
  const marketCashPerMin = getStatPerMinute(game.stats?.marketCash);
  const marketWorkers = game.marketWorkers ?? [];
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>📊 Stats</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Live output rates and efficiency. All rates use the last 60 seconds.
        </p>
      </div>
 
      {/* Active bonuses summary */}
      {(treasuryGrowBonus > 0 || bankPriceBonus > 0) && (
        <div className="card p-3" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {treasuryGrowBonus > 0 && (
            <div style={{ fontSize: "0.72rem", color: "#f59e0b" }}>
              🏦 +{treasuryGrowBonus}% grow speed (treasury)
            </div>
          )}
          {bankPriceBonus > 0 && (
            <div style={{ fontSize: "0.72rem", color: "#60a5fa" }}>
              🏦 +{bankPriceBonus}% sell prices (bank)
            </div>
          )}
        </div>
      )}
 
      {/* Per-farm stats */}
      {visibleFarms.length === 0 && (
        <div className="card p-4" style={{ marginBottom: "1rem", fontSize: "0.78rem", color: "var(--muted)", textAlign: "center" }}>
          No farms yet.
        </div>
      )}
      {visibleFarms.map((farm) => (
        <FarmStatsCard key={farm.id} farm={farm} game={game} />
      ))}
 
      {/* Kitchen stats */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.6rem" }}>🏭 Kitchen</div>
        {game.kitchenWorkers.length === 0 ? (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>No kitchen workers hired.</div>
        ) : (
          <>
            <StatRow label="Workers" value={game.kitchenWorkers.length} />
            <StatRow label="Busy" value={game.kitchenWorkers.filter((w) => w.busy).length} />
            {kitchenItems.map(({ key, label, emoji }) => {
              const perMin = getStatPerMinute(game.stats?.kitchenGoods?.[key]);
              return <StatRow key={key} label={`${emoji} ${label}/min`} value={perMin} valueColor={perMin > 0 ? "#4ade80" : "var(--muted)"} />;
            })}
          </>
        )}
      </div>
 
      {/* Market stats */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.6rem" }}>💰 Market</div>
        {marketWorkers.length === 0 ? (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>No market workers hired.</div>
        ) : (
          <>
            <StatRow label="Workers" value={marketWorkers.length} />
            <StatRow label="Cash/min (last 60s)" value={`$${marketCashPerMin.toLocaleString()}`} valueColor="#4ade80" />
            <StatRow label="Cash/hr estimate" value={`$${(marketCashPerMin * 60).toLocaleString()}`} sub="based on last minute" />
            {bankPriceBonus > 0 && (
              <StatRow label="Bank price bonus" value={`+${bankPriceBonus}%`} valueColor="#60a5fa" />
            )}
            <div style={{ marginTop: "0.5rem", paddingTop: "0.3rem", borderTop: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>Current sell rates</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {[
                  { type: "wheat", emoji: "🌾" }, { type: "berries", emoji: "🫐" }, { type: "tomatoes", emoji: "🍅" },
                  { type: "bread", emoji: "🍞" }, { type: "jam", emoji: "🍯" }, { type: "sauce", emoji: "🥫" },
                ].map(({ type, emoji }) => {
                  const rate = getSellRate(type, game.prestigeBonuses ?? [], bankPriceBonus);
                  return (
                    <div key={type} style={{ fontSize: "0.68rem", background: "var(--bg)", borderRadius: "6px", padding: "0.2rem 0.45rem" }}>
                      {emoji} <strong style={{ color: "var(--text)" }}>${rate.toFixed(2)}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
 
      {/* Town snapshot */}
      <div className="card p-4">
        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.6rem" }}>🏘️ Town Snapshot</div>
        <StatRow label="Population" value={`${Math.floor(game.town?.people ?? 0)} / ${game.town?.capacity ?? 0}`} />
        <StatRow label="Satisfaction" value={`${game.town?.satisfaction ?? 100}%`} valueColor={
          (game.town?.satisfaction ?? 100) >= 100 ? "#4ade80" : (game.town?.satisfaction ?? 100) >= 75 ? "#f59e0b" : "#ef4444"
        } />
        <StatRow label="Treasury balance" value={`$${Math.floor(game.town?.treasuryBalance ?? 0).toLocaleString()}`} valueColor="#4ade80" />
        <StatRow label="Grow speed bonus" value={
          (() => {
            const feast = game.feastBonusPercent ?? 0;
            const town = game.town?.growthBonusPercent ?? 0;
            const treasury = getTreasuryGrowBonus(game);
            const total = feast + town + treasury;
            return total > 0 ? `+${total}%` : "None";
          })()
        } valueColor="#4ade80" />
        <StatRow label="Pulse interval" value={`${(() => {
          const base = 30;
          let extra = 0;
          if (game.town?.bakeryOn && game.town?.bakeryLevel >= 1) extra += 10;
          if (game.town?.pantryOn && game.town?.jamBuildingOwned) extra += 10;
          if (game.town?.canneryOn && game.town?.sauceBuildingOwned) extra += 10;
          return base + extra;
        })()}s`} />
      </div>
    </div>
  );
}