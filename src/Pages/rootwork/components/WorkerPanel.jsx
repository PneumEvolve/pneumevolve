// src/Pages/rootwork/components/WorkerPanel.jsx
 
import React, { useState } from "react";
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  WORKER_HIRE_COST,
  SPECIALIZATIONS,
  SEASON_FARMS,
} from "../gameConstants";
import { getNextGear } from "../gameEngine";
 
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
    <div
      className="card p-4 space-y-3"
      style={{ fontSize: "0.85rem" }}
    >
      {/* Worker header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600 }}>
          👷 Worker
        </div>
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
 
      {/* Gear stats */}
      <div style={{ color: "var(--muted)", fontSize: "0.75rem", lineHeight: 1.6 }}>
        <div>⚡ {gear.plotsPerCycle} plot{gear.plotsPerCycle > 1 ? "s" : ""} per {gear.cycleSeconds}s</div>
        {worker.specialization !== "none" && (
          <div>🎯 {SPECIALIZATIONS[worker.specialization]?.name}</div>
        )}
      </div>
 
      {/* Gear upgrade */}
      {nextGear ? (
        <button
          onClick={() => onUpgradeGear(worker.id)}
          disabled={!canUpgrade}
          className="btn btn-secondary w-full"
          style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
        >
          {canUpgrade
            ? `Upgrade to ${nextGear.emoji} ${nextGear.name} (${nextGear.upgradeCost} ${GEAR[GEAR_ORDER[0]].emoji})`
            : `${nextGear.emoji} ${nextGear.name} — need ${nextGear.upgradeCost} crop`}
        </button>
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
                    className="w-full text-left card p-2"
                    style={{
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      border:
                        worker.specialization === spec.id
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{spec.name}</div>
                    <div style={{ color: "var(--muted)" }}>{spec.description}</div>
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
 
  // Check if first worker on this farm is free (free_worker prestige bonus)
  const hasFreeWorkerBonus = game.prestigeBonuses.includes("free_worker");
  const isFirstWorker = farmWorkers.length === 0;
  const hireCost = hasFreeWorkerBonus && isFirstWorker ? 0 : WORKER_HIRE_COST;
  const canHireWithBonus = hasFreeWorkerBonus && isFirstWorker ? true : canHire;
 
  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>
          Workers ({farmWorkers.length})
        </h3>
 
        {/* Hire button */}
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
 
      {/* Worker cards */}
      {farmWorkers.length === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
          No workers yet. Hire one to start automating this farm.
        </p>
      ) : (
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