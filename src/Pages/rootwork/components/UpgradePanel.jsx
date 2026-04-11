// src/Pages/rootwork/components/UpgradePanel.jsx
 
import React from "react";
import { CROPS, MAX_PLOTS } from "../gameConstants";
import { getPlotUnlockCost } from "../gameEngine";
 
export default function UpgradePanel({ farm, game, onBuyPlot }) {
  const crop = CROPS[farm.crop];
  const cropAmount = game.crops[farm.crop] ?? 0;
  const currentPlots = farm.unlockedPlots;
  const atMax = currentPlots >= MAX_PLOTS;
  const nextPlotCost = atMax ? null : getPlotUnlockCost(currentPlots);
  const canBuy = !atMax && nextPlotCost !== null && cropAmount >= nextPlotCost;
 
  // Preview next few plot costs
  const upcomingCosts = [];
  if (!atMax) {
    for (let i = 0; i < 4; i++) {
      const plotNum = currentPlots + i;
      if (plotNum >= MAX_PLOTS) break;
      const cost = getPlotUnlockCost(plotNum);
      if (cost !== null) upcomingCosts.push({ plotNum: plotNum + 1, cost });
    }
  }
 
  return (
    <div className="space-y-3">
      <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>Farm Upgrades</h3>
 
      {/* Plot count + progress */}
      <div className="card p-4 space-y-3" style={{ fontSize: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{crop.emoji} Plots</div>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
              {currentPlots} / {MAX_PLOTS} unlocked
            </div>
          </div>
          <div style={{
            width: "80px", height: "6px", background: "var(--border)",
            borderRadius: "999px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${(currentPlots / MAX_PLOTS) * 100}%`,
              background: "var(--accent)",
              borderRadius: "999px",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
 
        {/* Buy plot button */}
        {atMax ? (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", textAlign: "center" }}>
            🌱 Farm fully expanded — {MAX_PLOTS} plots
          </div>
        ) : (
          <button
            onClick={() => onBuyPlot(farm.id)}
            disabled={!canBuy}
            className="btn w-full"
            style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
          >
            {canBuy
              ? `Unlock plot ${currentPlots + 1} — ${nextPlotCost} ${crop.emoji}`
              : `Need ${nextPlotCost} ${crop.emoji} to unlock next plot`}
          </button>
        )}
      </div>
 
      {/* Upcoming plot costs */}
      {!atMax && upcomingCosts.length > 0 && (
        <div className="card p-4" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--text)" }}>
            Upcoming plot costs
          </div>
          <div className="space-y-1">
            {upcomingCosts.map(({ plotNum, cost }, idx) => (
              <div
                key={plotNum}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.2rem 0",
                  borderBottom: "1px solid var(--border)",
                  color: idx === 0 ? "var(--text)" : "var(--muted)",
                  fontWeight: idx === 0 ? 600 : 400,
                }}
              >
                <span>Plot {plotNum}</span>
                <span>{cost} {crop.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}