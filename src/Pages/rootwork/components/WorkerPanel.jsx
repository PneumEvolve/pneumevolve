// src/Pages/rootwork/components/WorkerPanel.jsx
 
import React, { useState } from "react";
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  WORKER_HIRE_COST,
  SPECIALIZATIONS,
} from "../gameConstants";
import { getNextGear, getEffectiveCycleSeconds } from "../gameEngine";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function getEffectivePlots(worker) {
  const gear = GEAR[worker.gear];
  if (worker.specialization === "sprinter") {
    return gear.plotsPerCycle * 2;
  }
  return gear.plotsPerCycle;
}
 
function statLine(worker) {
  const gear = GEAR[worker.gear];
  const cycleSeconds = getEffectiveCycleSeconds(worker);
  const plots = getEffectivePlots(worker);
  const spec = worker.specialization;
 
  let line = `${plots} plot${plots > 1 ? "s" : ""} every ${cycleSeconds}s`;
  if (spec === "sprinter") line += " (rests every 3rd cycle)";
  if (spec === "grower") line = "Reduces farm grow time by 20%";
  return line;
}
 
function previewStatLine(worker, nextGearId) {
  // Show what stats would be with next gear, keeping current specialization
  const previewWorker = { ...worker, gear: nextGearId };
  const cycleSeconds = getEffectiveCycleSeconds(previewWorker);
  const plots = getEffectivePlots(previewWorker);
  return `${plots} plot${plots > 1 ? "s" : ""} every ${cycleSeconds}s`;
}
 
// ─── Single worker card ───────────────────────────────────────────────────────
 
function WorkerCard({
  worker,
  farm,
  game,
  onUpgradeGear,
  onReassignWorker,
  onSetSpecialization,
}) {
  const [showReassign, setShowReassign] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
 
  const gear = GEAR[worker.gear];
  const nextGearId = getNextGear(worker.gear);
  const nextGear = nextGearId ? GEAR[nextGearId] : null;
  const cropAmount = game.crops[farm.crop] ?? 0;
  const canUpgrade = nextGear && cropAmount >= nextGear.upgradeCost;
  const availableFarms = game.farms.filter((f) => f.id !== worker.farmId);
  const canSpecialize = game.season >= 4;
 
  return (
    <div className="card p-4 space-y-3" style={{ fontSize: "0.85rem" }}>
 
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600 }}>👷 Worker</div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--muted)",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "0.2rem 0.6rem",
          }}
        >
          {gear.emoji} {gear.name}
        </div>
      </div>
 
      {/* Current stats */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--muted)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.4rem 0.65rem",
          lineHeight: 1.6,
        }}
      >
        <div>⚡ {statLine(worker)}</div>
        {worker.specialization !== "none" && (
          <div>🎯 {SPECIALIZATIONS[worker.specialization]?.name}</div>
        )}
      </div>
 
      {/* Gear upgrade */}
      {nextGear ? (
        <div>
          <button
            onClick={() => onUpgradeGear(worker.id)}
            disabled={!canUpgrade}
            className="btn btn-secondary w-full"
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
          >
            {canUpgrade
              ? `Upgrade to ${nextGear.emoji} ${nextGear.name} — ${nextGear.upgradeCost} crop`
              : `${nextGear.emoji} ${nextGear.name} — need ${nextGear.upgradeCost} crop`}
          </button>
          {/* Preview stats for next gear */}
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--muted)",
              marginTop: "0.3rem",
              textAlign: "center",
            }}
          >
            {nextGear.description}
            {" · "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>
              {previewStatLine(worker, nextGearId)}
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--muted)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          🚜 Max gear reached
        </div>
      )}
 
      {/* Specialization — Season 4+ */}
      {canSpecialize && (
        <div>
          <button
            onClick={() => setShowSpec((v) => !v)}
            className="btn btn-secondary w-full"
            style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem" }}
          >
            🎯 {showSpec ? "Hide" : "Set"} Specialization
          </button>
          {showSpec && (
            <div className="space-y-1 mt-2">
              {Object.values(SPECIALIZATIONS)
                .filter((s) => s.id !== "none")
                .map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => {
                      onSetSpecialization(worker.id, spec.id);
                      setShowSpec(false);
                    }}
                    className="w-full text-left card p-3"
                    style={{
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      border:
                        worker.specialization === spec.id
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>
                      {spec.name}
                      {worker.specialization === spec.id && (
                        <span style={{ color: "var(--accent)", marginLeft: "0.4rem" }}>✓ Active</span>
                      )}
                    </div>
                    <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                      {spec.description}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
 
      {/* Reassign */}
      {availableFarms.length > 0 && (
        <div>
          <button
            onClick={() => setShowReassign((v) => !v)}
            className="btn btn-secondary w-full"
            style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem" }}
          >
            🔄 {showReassign ? "Cancel" : "Reassign to another farm"}
          </button>
          {showReassign && (
            <div className="space-y-1 mt-2">
              {availableFarms.map((f) => {
                const crop = CROPS[f.crop];
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      onReassignWorker(worker.id, f.id);
                      setShowReassign(false);
                    }}
                    className="w-full text-left card p-2"
                    style={{ fontSize: "0.72rem", cursor: "pointer" }}
                  >
                    {crop.emoji} {crop.name} Farm
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 
// ─── Main panel ───────────────────────────────────────────────────────────────
 
export default function WorkerPanel({
  farm,
  game,
  onHireWorker,
  onUpgradeGear,
  onReassignWorker,
  onSetSpecialization,
}) {
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const cropAmount = game.crops[farm.crop] ?? 0;
  const canHire = cropAmount >= WORKER_HIRE_COST;
 
  const hasFreeWorkerBonus = game.prestigeBonuses.includes("free_worker");
  const isFirstWorker = farmWorkers.length === 0;
  const hireCost = hasFreeWorkerBonus && isFirstWorker ? 0 : WORKER_HIRE_COST;
  const canHireWithBonus = hasFreeWorkerBonus && isFirstWorker ? true : canHire;
 
  return (
    <div className="space-y-3">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>
          Workers ({farmWorkers.length})
        </h3>
        <button
          onClick={() => onHireWorker(farm.id)}
          disabled={!canHireWithBonus}
          className="btn"
          style={{ fontSize: "0.75rem", padding: "0.4rem 0.9rem" }}
        >
          {hasFreeWorkerBonus && isFirstWorker
            ? "🙋 Hire (Free!)"
            : `🙋 Hire (${hireCost} crop)`}
        </button>
      </div>
 
      {/* Hint */}
      {farmWorkers.length === 0 && (
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
          No workers yet. Hire one to start automating this farm.
        </p>
      )}
 
      {/* Worker cards */}
      {farmWorkers.length > 0 && (
        <div className="space-y-3">
          {farmWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              farm={farm}
              game={game}
              onUpgradeGear={onUpgradeGear}
              onReassignWorker={onReassignWorker}
              onSetSpecialization={onSetSpecialization}
            />
          ))}
        </div>
      )}
    </div>
  );
}