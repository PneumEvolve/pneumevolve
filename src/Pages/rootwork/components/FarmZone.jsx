// src/Pages/rootwork/components/FarmZone.jsx

import React, { useState } from "react";
import { CROPS } from "../gameConstants";
import { getPlotUnlockCost, getWorkerHireCost, isFarmAutomated, getFarmMaxPlots } from "../gameEngine";
import FarmGrid from "./FarmGrid";
import WorkerPanel from "./WorkerPanel";
import UpgradePanel from "./UpgradePanel";
import FarmInvestmentPanel from "./FarmInvestmentPanel";

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: open ? "1rem" : 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", padding: "0.85rem 0",
          color: "var(--text)", fontWeight: 600, fontSize: "0.85rem",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && children}
    </div>
  );
}

export default function FarmZone({
  farm, game,
  onPlant, onHarvest, onTend,
  onBuyPlot, onHireWorker, onSellWorker,
  onUpgradeGear, onSpecialize, onBuyPlotCap, onBuyYield,
}) {
  const [tendMode, setTendMode] = useState(false);

  const crop = CROPS[farm.crop];
  const automated = isFarmAutomated(farm, game.workers);
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const readyCount = farm.plots.filter((p) => p.state === "ready").length;
  const plantedCount = farm.plots.filter((p) => p.state === "planted").length;
  const emptyCount = farm.plots.filter((p) => p.state === "empty").length;
  const maxPlots = getFarmMaxPlots(game, farm.id);
  const atMax = farm.unlockedPlots >= maxPlots;

  // First-time hint: show when no workers and something is ready or growing
  const showWorkerHint = farmWorkers.length === 0;

  const automatedBg = "rgba(74, 222, 128, 0.15)";
  const automatedBorder = "#4ade80";
  const automatedColor = "#166534";
  const manualBg = "rgba(99, 102, 241, 0.10)";
  const manualBorder = "rgba(99, 102, 241, 0.3)";
  const manualColor = "var(--accent)";
  const tendActiveBg = "rgba(163, 230, 53, 0.20)";
  const tendActiveBorder = "#a3e635";
  const tendActiveColor = "#365314";
  const tendHintBg = "rgba(163, 230, 53, 0.12)";

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 4rem" }}>

      {/* Farm header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {crop.emoji} {crop.name} Farm
          </h2>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
            {farm.unlockedPlots} plot{farm.unlockedPlots !== 1 ? "s" : ""} ·{" "}
            {farmWorkers.length} worker{farmWorkers.length !== 1 ? "s" : ""}
            {automated && <span style={{ marginLeft: "0.5rem", color: "#4ade80", fontWeight: 600 }}>· Automated ✓</span>}
          </p>
        </div>
        <div style={{
          fontSize: "0.7rem", fontWeight: 600, padding: "0.25rem 0.65rem", borderRadius: "999px",
          background: automated ? automatedBg : manualBg,
          border: `1px solid ${automated ? automatedBorder : manualBorder}`,
          color: automated ? automatedColor : manualColor,
        }}>
          {automated ? "Running" : "Manual"}
        </div>
      </div>

      {/* Worker hint banner */}
      {showWorkerHint && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(99, 102, 241, 0.10)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "8px", padding: "0.5rem 0.75rem",
          fontSize: "0.75rem", color: "var(--accent)",
          marginBottom: "1rem", lineHeight: 1.5,
        }}>
          <span style={{ fontSize: "1rem" }}>💡</span>
          <span>
            Hire a worker below to harvest automatically — no more tapping every plot!
          </span>
        </div>
      )}

      {/* Stats + Tend button */}
<div className="card p-3" style={{
  fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1rem",
}}>
  {/* Top row: plot/crop counts + tend */}
  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
    <span><strong style={{ color: "#f59e0b" }}>{readyCount}</strong> ready</span>
    <span><strong style={{ color: "#4ade80" }}>{plantedCount}</strong> growing</span>
    <span><strong style={{ color: "var(--muted)" }}>{emptyCount}</strong> empty</span>
    <span style={{ marginLeft: "auto", marginRight: "0.5rem" }}>
      <strong style={{ color: "var(--text)" }}>{game.crops[farm.crop] ?? 0}</strong> {crop.emoji}
    </span>
    <button
      onClick={() => setTendMode((v) => !v)}
      style={{
        background: tendMode ? tendActiveBg : "var(--bg)",
        border: `1px solid ${tendMode ? tendActiveBorder : "var(--border)"}`,
        borderRadius: "999px", padding: "0.25rem 0.7rem", fontSize: "0.7rem",
        fontWeight: tendMode ? 700 : 400, cursor: "pointer",
        color: tendMode ? tendActiveColor : "var(--muted)",
        transition: "all 0.15s ease", whiteSpace: "nowrap",
      }}
    >
      🌿 {tendMode ? "Tending..." : "Tend"}
    </button>
  </div>

  {/* Bottom row: quick action buttons */}
  <div style={{ display: "flex", gap: "0.5rem" }}>
    {(() => {
  const plotCost = getPlotUnlockCost(game, farm.id, farm.unlockedPlots);
  const canBuy = plotCost !== null && (game.crops[farm.crop] ?? 0) >= plotCost;
  return (
    <button
      onClick={() => onBuyPlot(farm.id)}
      disabled={atMax || !canBuy}
          style={{
            flex: 1, fontSize: "0.72rem", padding: "0.35rem 0.5rem",
            borderRadius: "8px", cursor: canBuy && !atMax ? "pointer" : "default",
            background: canBuy && !atMax ? "var(--accent)" : "var(--bg)",
            color: canBuy && !atMax ? "#fff" : "var(--border)",
            border: `1px solid ${canBuy && !atMax ? "var(--accent)" : "var(--border)"}`,
            fontWeight: 600, transition: "all 0.15s",
          }}
        >
      {atMax ? "🟫 Max Plots" : `🟫 Buy Plot ${plotCost !== null ? `(${plotCost} ${crop.emoji})` : ""}`}
    </button>
  );
})()}

    {(() => {
      const hireCost = getWorkerHireCost(game, farm.id);
      const hasHeadStart = game.prestigeBonuses.includes("head_start");
      const isFirst = farmWorkers.length === 0;
      const effectiveCost = hasHeadStart && isFirst ? 0 : hireCost;
      const canHire = (game.crops[farm.crop] ?? 0) >= effectiveCost;
      return (
        <button
          onClick={() => onHireWorker(farm.id)}
          disabled={!canHire}
          style={{
            flex: 1, fontSize: "0.72rem", padding: "0.35rem 0.5rem",
            borderRadius: "8px", cursor: canHire ? "pointer" : "default",
            background: canHire ? "var(--accent)" : "var(--bg)",
            color: canHire ? "#fff" : "var(--border)",
            border: `1px solid ${canHire ? "var(--accent)" : "var(--border)"}`,
            fontWeight: 600, transition: "all 0.15s",
          }}
        >
          {hasHeadStart && isFirst
            ? "👷 Hire Worker (Free!)"
            : `👷 Hire Worker (${effectiveCost} ${crop.emoji})`}
        </button>
      );
    })()}
  </div>
</div>

      {tendMode && (
        <div style={{
          fontSize: "0.72rem", color: tendActiveColor,
          background: tendHintBg,
          border: `1px solid ${tendActiveBorder}`,
          borderRadius: "8px", padding: "0.4rem 0.75rem",
          marginBottom: "0.75rem", textAlign: "center",
        }}>
          Tap a growing plot to tend it (-3s grow time). Tap Tend again to stop.
        </div>
      )}

      <Section title="🌱 Plots" defaultOpen>
        <div style={{ paddingTop: "0.5rem" }}>
          <FarmGrid
            farm={farm} game={game}
            onPlant={onPlant} onHarvest={onHarvest}
            onTend={onTend} tendMode={tendMode}
          />
          {farmWorkers.length === 0 && !tendMode && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginTop: "0.75rem", fontStyle: "italic" }}>
              Tap {crop.emoji} to plant · tap again when ready to harvest · use 🌿 Tend to speed up growth
            </p>
          )}
        </div>
      </Section>

      {/* Workers always open so new players see the hire button immediately */}
      <Section title="👷 Workers" defaultOpen={true}>
        <div style={{ paddingTop: "0.5rem" }}>
          <WorkerPanel
            farm={farm} game={game}
            onHireWorker={onHireWorker}
            onSellWorker={onSellWorker}
            onUpgradeGear={onUpgradeGear}
            onSpecialize={onSpecialize}
          />
        </div>
      </Section>

      <Section title="🟫 Buy Plots" defaultOpen={false}>
  <div style={{ paddingTop: "0.5rem" }}>
    <UpgradePanel farm={farm} game={game} onBuyPlot={onBuyPlot} />
  </div>
</Section>

<Section title="💰 Farm Investments" defaultOpen={false}>
  <div style={{ paddingTop: "0.5rem" }}>
    <FarmInvestmentPanel
      farm={farm}
      game={game}
      onBuyPlotCap={onBuyPlotCap}
      onBuyYield={onBuyYield}
    />
  </div>
</Section>

    </div>
  );
}