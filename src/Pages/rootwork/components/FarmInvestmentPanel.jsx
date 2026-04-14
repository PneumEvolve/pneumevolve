// src/Pages/rootwork/components/FarmInvestmentPanel.jsx

import React from "react";
import { FARM_INVESTMENT_PLOT_CAP, FARM_INVESTMENT_YIELD } from "../gameConstants";
import {
  getFarmInvestment,
  getFarmMaxPlots,
  getFarmBonusYield,
  getNextPlotCapUpgrade,
  getNextYieldUpgrade,
} from "../gameEngine";

export default function FarmInvestmentPanel({ farm, game, onBuyPlotCap, onBuyYield }) {
  const inv = getFarmInvestment(game, farm.id);
  const maxPlots = getFarmMaxPlots(game, farm.id);
  const bonusYield = getFarmBonusYield(game, farm.id);
  const nextPlotCap = getNextPlotCapUpgrade(game, farm.id);
  const nextYield = getNextYieldUpgrade(game, farm.id);
  const cash = game.cash ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* Plot capacity */}
      <div className="card p-3">
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
          🟫 Plot Capacity
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {FARM_INVESTMENT_PLOT_CAP.map((tier, idx) => {
            const owned = inv.plotCapIndex > idx;
            const isNext = inv.plotCapIndex === idx;
            const canAfford = cash >= tier.cost;
            return (
              <div key={tier.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.4rem 0.6rem", borderRadius: "6px",
                background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
                border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                opacity: !owned && !isNext ? 0.4 : 1,
              }}>
                <div style={{ fontSize: "0.72rem" }}>
                  <div style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>
                    {owned ? "✓" : isNext ? "🟫" : "🔒"} {tier.name}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                    {tier.description}
                    {owned && (
                      <span style={{ marginLeft: "0.3rem", color: "#4ade80" }}>
                        · Active ({maxPlots} max plots)
                      </span>
                    )}
                  </div>
                </div>
                {!owned && isNext && (
                  <button
                    onClick={() => onBuyPlotCap(farm.id)}
                    disabled={!canAfford}
                    className="btn btn-secondary"
                    style={{
                      fontSize: "0.68rem", padding: "0.2rem 0.5rem",
                      marginLeft: "0.5rem", flexShrink: 0,
                      opacity: canAfford ? 1 : 0.5,
                    }}
                  >
                    ${tier.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Yield upgrades */}
      <div className="card p-3">
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
          🌿 Yield Upgrades
          {bonusYield > 0 && (
            <span style={{ marginLeft: "0.5rem", color: "#4ade80", fontWeight: 700 }}>
              +{bonusYield} per harvest
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {FARM_INVESTMENT_YIELD.map((tier, idx) => {
            const owned = inv.yieldIndex > idx;
            const isNext = inv.yieldIndex === idx;
            const canAfford = cash >= tier.cost;
            return (
              <div key={tier.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.4rem 0.6rem", borderRadius: "6px",
                background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
                border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                opacity: !owned && !isNext ? 0.4 : 1,
              }}>
                <div style={{ fontSize: "0.72rem" }}>
                  <div style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>
                    {owned ? "✓" : isNext ? "🌿" : "🔒"} {tier.name}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                    {tier.description}
                  </div>
                </div>
                {!owned && isNext && (
                  <button
                    onClick={() => onBuyYield(farm.id)}
                    disabled={!canAfford}
                    className="btn btn-secondary"
                    style={{
                      fontSize: "0.68rem", padding: "0.2rem 0.5rem",
                      marginLeft: "0.5rem", flexShrink: 0,
                      opacity: canAfford ? 1 : 0.5,
                    }}
                  >
                    ${tier.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}