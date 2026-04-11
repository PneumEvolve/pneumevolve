// src/Pages/rootwork/components/FarmZone.jsx
 
import React, { useState } from "react";
import { CROPS } from "../gameConstants";
import { isFarmAutomated } from "../gameEngine";
import FarmGrid from "./FarmGrid";
import WorkerPanel from "./WorkerPanel";
import UpgradePanel from "./UpgradePanel";
 
// ─── Collapsible section ──────────────────────────────────────────────────────
 
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
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function FarmZone({
  farm,
  game,
  onPlant,
  onHarvest,
  onBuyPlot,
  onHireWorker,
  onSellWorker,
  onUpgradeGear,
  onSetSpecialization,
}) {
  const crop = CROPS[farm.crop];
  const automated = isFarmAutomated(farm, game.workers);
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const readyCount = farm.plots.filter((p) => p.state === "ready").length;
  const plantedCount = farm.plots.filter((p) => p.state === "planted").length;
  const emptyCount = farm.plots.filter((p) => p.state === "empty").length;
 
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
              <span style={{ marginLeft: "0.5rem", color: "#4ade80", fontWeight: 600 }}>
                · Automated ✓
              </span>
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
 
      {/* Plot stats bar */}
      <div
        className="card p-3"
        style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1rem" }}
      >
        <span><strong style={{ color: "#f59e0b" }}>{readyCount}</strong> ready</span>
        <span><strong style={{ color: "#4ade80" }}>{plantedCount}</strong> growing</span>
        <span><strong style={{ color: "var(--muted)" }}>{emptyCount}</strong> empty</span>
        <span style={{ marginLeft: "auto" }}>
          <strong style={{ color: "var(--text)" }}>{game.crops[farm.crop] ?? 0}</strong> {crop.emoji} total
        </span>
      </div>
 
      {/* Plots */}
      <Section title="🌱 Plots" defaultOpen>
        <div style={{ paddingTop: "0.5rem" }}>
          <FarmGrid
            farm={farm}
            game={game}
            onPlant={onPlant}
            onHarvest={onHarvest}
          />
          {farmWorkers.length === 0 && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginTop: "0.75rem", fontStyle: "italic" }}>
              Tap {crop.emoji} to plant · tap again when ready to harvest
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