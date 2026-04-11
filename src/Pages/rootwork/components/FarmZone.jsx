// src/Pages/rootwork/components/FarmZone.jsx
 
import React, { useState } from "react";
import { CROPS } from "../gameConstants";
import { isFarmAutomated } from "../gameEngine";
import FarmGrid from "./FarmGrid";
import WorkerPanel from "./WorkerPanel";
import UpgradePanel from "./UpgradePanel";
 
function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: open ? "1rem" : 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.85rem 0",
          color: "var(--text)",
          fontWeight: 600,
          fontSize: "0.85rem",
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
  farm,
  game,
  onPlant,
  onHarvest,
  onTend,
  onBuyPlot,
  onHireWorker,
  onSellWorker,
  onUpgradeGear,
  onSetSpecialization,
}) {
  const [tendMode, setTendMode] = useState(false);
 
  const crop = CROPS[farm.crop];
  const automated = isFarmAutomated(farm, game.workers);
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const readyCount = farm.plots.filter((p) => p.state === "ready").length;
  const plantedCount = farm.plots.filter((p) => p.state === "planted").length;
  const emptyCount = farm.plots.filter((p) => p.state === "empty").length;
 
  function handleTend(farmId, plotId) {
    onTend(farmId, plotId);
    // Keep tend mode active so player can tend multiple plots in one session
  }
 
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
            {automated && (
              <span style={{ marginLeft: "0.5rem", color: "#4ade80", fontWeight: 600 }}>· Automated ✓</span>
            )}
          </p>
        </div>
 
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            padding: "0.25rem 0.65rem",
            borderRadius: "999px",
            background: automated
              ? "color-mix(in oklab, #4ade80 15%, var(--bg-elev))"
              : "color-mix(in oklab, var(--accent) 10%, var(--bg-elev))",
            border: `1px solid ${automated ? "#4ade80" : "color-mix(in oklab, var(--accent) 30%, var(--border))"}`,
            color: automated ? "#166534" : "var(--accent)",
          }}
        >
          {automated ? "Running" : "Manual"}
        </div>
      </div>
 
      {/* Stats + Tend button row */}
      <div
        className="card p-3"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.75rem",
          color: "var(--muted)",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span><strong style={{ color: "#f59e0b" }}>{readyCount}</strong> ready</span>
        <span><strong style={{ color: "#4ade80" }}>{plantedCount}</strong> growing</span>
        <span><strong style={{ color: "var(--muted)" }}>{emptyCount}</strong> empty</span>
        <span style={{ marginLeft: "auto", marginRight: "0.5rem" }}>
          <strong style={{ color: "var(--text)" }}>{game.crops[farm.crop] ?? 0}</strong> {crop.emoji}
        </span>
 
        {/* Tend tool button */}
        <button
          onClick={() => setTendMode((v) => !v)}
          style={{
            background: tendMode
              ? "color-mix(in oklab, #a3e635 20%, var(--bg-elev))"
              : "var(--bg)",
            border: `1px solid ${tendMode ? "#a3e635" : "var(--border)"}`,
            borderRadius: "999px",
            padding: "0.25rem 0.7rem",
            fontSize: "0.7rem",
            fontWeight: tendMode ? 700 : 400,
            cursor: "pointer",
            color: tendMode ? "#365314" : "var(--muted)",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          🌿 {tendMode ? "Tending..." : "Tend"}
        </button>
      </div>
 
      {/* Tend mode hint */}
      {tendMode && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "#365314",
            background: "color-mix(in oklab, #a3e635 12%, var(--bg-elev))",
            border: "1px solid #a3e635",
            borderRadius: "8px",
            padding: "0.4rem 0.75rem",
            marginBottom: "0.75rem",
            textAlign: "center",
          }}
        >
          Tap a growing plot to tend it (-{3}s grow time). Tap Tend again to stop.
        </div>
      )}
 
      {/* Plots */}
      <Section title="🌱 Plots" defaultOpen>
        <div style={{ paddingTop: "0.5rem" }}>
          <FarmGrid
            farm={farm}
            game={game}
            onPlant={onPlant}
            onHarvest={onHarvest}
            onTend={handleTend}
            tendMode={tendMode}
          />
          {farmWorkers.length === 0 && !tendMode && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginTop: "0.75rem", fontStyle: "italic" }}>
              Tap {crop.emoji} to plant · tap again when ready to harvest · use 🌿 Tend to speed up growth
            </p>
          )}
        </div>
      </Section>
 
      {/* Workers */}
      <Section title="👷 Workers" defaultOpen={farmWorkers.length > 0}>
        <div style={{ paddingTop: "0.5rem" }}>
          <WorkerPanel
            farm={farm}
            game={game}
            onHireWorker={onHireWorker}
            onSellWorker={onSellWorker}
            onUpgradeGear={onUpgradeGear}
            onSetSpecialization={onSetSpecialization}
          />
        </div>
      </Section>
 
      {/* Upgrades */}
      <Section title="⬆️ Upgrades" defaultOpen={false}>
        <div style={{ paddingTop: "0.5rem" }}>
          <UpgradePanel farm={farm} game={game} onBuyPlot={onBuyPlot} />
        </div>
      </Section>
 
    </div>
  );
}