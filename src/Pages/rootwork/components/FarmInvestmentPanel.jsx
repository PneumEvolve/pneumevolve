// src/Pages/rootwork/components/FarmInvestmentPanel.jsx

import React from "react";
import { FARM_INVESTMENT_PLOT_CAP, FARM_INVESTMENT_YIELD, CROP_ARTISAN } from "../gameConstants";
import {
  getFarmInvestment,
  getFarmMaxPlots,
  getFarmBonusYield,
  getNextPlotCapUpgrade,
  getNextYieldUpgrade,
  getPlotUpgradeCost,
  hasSchoolResearch,
} from "../gameEngine";

export default function FarmInvestmentPanel({ farm, game, onBuyPlotCap, onBuyYield, onUpgradePlot }) {
  const inv = getFarmInvestment(game, farm.id);
  const maxPlots = getFarmMaxPlots(game, farm.id);
  const bonusYield = getFarmBonusYield(game, farm.id);
  const cash = game.cash ?? 0;

  const artisanGood = CROP_ARTISAN[farm.crop];
  const artisanHave = artisanGood ? (game.artisan[artisanGood] ?? 0) : 0;
  const upgradablePlots = farm.plots.filter((p) => !p.upgraded);
  const upgradedPlots = farm.plots.filter((p) => p.upgraded);
  const nextUpgradeCost = getPlotUpgradeCost(farm, game);
  const canAffordUpgrade = artisanHave >= nextUpgradeCost;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* Plot upgrades */}
{artisanGood && (
  <div className="card p-3">
    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.25rem" }}>
      ⭐ Plot Upgrades
    </div>
    <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
      Each upgrade costs 1 more {artisanGood} than the last — 50% faster grow time per plot
    </div>

    {upgradablePlots.length === 0 ? (
      <div style={{ fontSize: "0.72rem", color: "#4ade80", textAlign: "center", padding: "0.25rem 0" }}>
        ✓ All plots upgraded
      </div>
    ) : (
      <>
        <div style={{
          fontSize: "0.72rem", color: "var(--muted)",
          marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span>
            <strong style={{ color: canAffordUpgrade ? "#f59e0b" : "var(--text)" }}>
              {artisanHave}
            </strong> / {nextUpgradeCost} {artisanGood} available
          </span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span>{upgradedPlots.length}/{farm.plots.length} upgraded</span>
        </div>
        <button
          onClick={() => onUpgradePlot(farm.id)}
          disabled={!canAffordUpgrade}
          className="btn w-full"
          style={{
            fontSize: "0.75rem", padding: "0.4rem 0.75rem",
            opacity: canAffordUpgrade ? 1 : 0.5,
          }}
        >
          {canAffordUpgrade
            ? `⭐ Upgrade plot ${upgradedPlots.length + 1} — ${nextUpgradeCost} ${artisanGood}`
            : `Need ${nextUpgradeCost} ${artisanGood} to upgrade`}
        </button>
      </>
    )}
  </div>
)}

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
            // School research gate: Fertilizer III needs "fertilizer_iii" research, IV needs "fertilizer_iv"
            const researchId = idx === 2 ? "fertilizer_iii" : idx === 3 ? "fertilizer_iv" : null;
            const researchLocked = researchId !== null && !hasSchoolResearch(game, researchId);
            const canBuy = isNext && canAfford && !researchLocked;
            return (
              <div key={tier.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.4rem 0.6rem", borderRadius: "6px",
                background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
                border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : researchLocked && isNext ? "rgba(167,139,250,0.3)" : "var(--border)"}`,
                opacity: !owned && !isNext ? 0.4 : 1,
              }}>
                <div style={{ fontSize: "0.72rem" }}>
                  <div style={{ fontWeight: 600, color: owned ? "#4ade80" : researchLocked && isNext ? "#a78bfa" : "var(--text)" }}>
                    {owned ? "✓" : researchLocked && isNext ? "🏫" : isNext ? "🌿" : "🔒"} {tier.name}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                    {researchLocked && isNext ? "Requires School Research" : tier.description}
                  </div>
                </div>
                {!owned && isNext && !researchLocked && (
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