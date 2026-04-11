// src/Pages/rootwork/components/WorkerPanel.jsx
 
import React, { useState } from "react";
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  WORKER_HIRE_COST,
  SPECIALIZATIONS,
  GEAR_CROP_COSTS,
} from "../gameConstants";
import { getNextGear, getEffectiveCycleSeconds } from "../gameEngine";
 
const SELL_REFUND = Math.floor(WORKER_HIRE_COST * 0.5);
 
function getEffectivePlots(worker) {
  const gear = GEAR[worker.gear];
  if (worker.specialization === "sprinter") return gear.plotsPerCycle * 2;
  return gear.plotsPerCycle;
}
 
function statLine(worker) {
  const cycleSeconds = getEffectiveCycleSeconds(worker);
  const plots = getEffectivePlots(worker);
  const spec = worker.specialization;
  if (spec === "grower") return "Reduces farm grow time by 20%";
  let line = `${plots} plot${plots > 1 ? "s" : ""} every ${cycleSeconds}s`;
  if (spec === "sprinter") line += " (rests every 3rd cycle)";
  return line;
}
 
function previewStatLine(worker, nextGearId) {
  const previewWorker = { ...worker, gear: nextGearId };
  const cycleSeconds = getEffectiveCycleSeconds(previewWorker);
  const plots = getEffectivePlots(previewWorker);
  return `${plots} plot${plots > 1 ? "s" : ""} every ${cycleSeconds}s`;
}
 
function WorkerCard({ worker, farm, game, onUpgradeGear, onSellWorker, onSetSpecialization }) {
  const [showSpec, setShowSpec] = useState(false);
  const [confirmSell, setConfirmSell] = useState(false);
 
  const gear = GEAR[worker.gear];
  const nextGearId = getNextGear(worker.gear);
  const nextGear = nextGearId ? GEAR[nextGearId] : null;
  const canSpecialize = game.season >= 4;
 
  const upgradeCropId = nextGearId ? GEAR_CROP_COSTS[nextGearId] : null;
  const upgradeCrop = upgradeCropId ? CROPS[upgradeCropId] : null;
  const upgradeAmount = nextGear?.upgradeCost ?? 0;
  const canUpgrade = nextGear && upgradeCropId &&
    (game.crops[upgradeCropId] ?? 0) >= upgradeAmount;
 
  const farmCrop = CROPS[farm.crop];
 
  // Show Fast Hands badge if worker started with gloves via bonus
  const hasFastHands = game.prestigeBonuses.includes("fast_hands");
 
  return (
    <div className="card p-4 space-y-3" style={{ fontSize: "0.85rem" }}>
 
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          👷 Worker
          {hasFastHands && worker.gear !== "bare_hands" && (
            <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 400 }}>
              (Fast Hands)
            </span>
          )}
        </div>
        <div style={{
          fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg)",
          border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem 0.6rem",
        }}>
          {gear.emoji} {gear.name}
        </div>
      </div>
 
      {/* Stats */}
      <div style={{
        fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg)",
        border: "1px solid var(--border)", borderRadius: "8px",
        padding: "0.4rem 0.65rem", lineHeight: 1.6,
      }}>
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
              ? `Upgrade to ${nextGear.emoji} ${nextGear.name} — ${upgradeAmount} ${upgradeCrop?.emoji} ${upgradeCrop?.name}`
              : `${nextGear.emoji} ${nextGear.name} — need ${upgradeAmount} ${upgradeCrop?.emoji} ${upgradeCrop?.name}`}
          </button>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.3rem", textAlign: "center" }}>
            {nextGear.description}
            {" · "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>
              {previewStatLine(worker, nextGearId)}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", fontStyle: "italic" }}>
          🚜 Max gear reached
        </div>
      )}
 
      {/* Specialization */}
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
                    onClick={() => { onSetSpecialization(worker.id, spec.id); setShowSpec(false); }}
                    className="w-full text-left card p-3"
                    style={{
                      fontSize: "0.72rem", cursor: "pointer",
                      border: worker.specialization === spec.id
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
                    <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>{spec.description}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
 
      {/* Sell */}
      {!confirmSell ? (
        <button
          onClick={() => setConfirmSell(true)}
          className="btn btn-secondary w-full"
          style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem", color: "#ef4444", borderColor: "#ef4444" }}
        >
          Sell worker (+{SELL_REFUND} {farmCrop.emoji} {farmCrop.name})
        </button>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => { onSellWorker(worker.id); setConfirmSell(false); }}
            className="btn w-full"
            style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem", background: "#ef4444", color: "#fff", border: "none" }}
          >
            Confirm sell
          </button>
          <button
            onClick={() => setConfirmSell(false)}
            className="btn btn-secondary w-full"
            style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
 
export default function WorkerPanel({
  farm,
  game,
  onHireWorker,
  onUpgradeGear,
  onSellWorker,
  onSetSpecialization,
}) {
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const cropAmount = game.crops[farm.crop] ?? 0;
  const canHire = cropAmount >= WORKER_HIRE_COST;
 
  const hasHeadStart = game.prestigeBonuses.includes("head_start");
  const isFirstWorker = farmWorkers.length === 0;
  const hireCost = hasHeadStart && isFirstWorker ? 0 : WORKER_HIRE_COST;
  const canHireWithBonus = hasHeadStart && isFirstWorker ? true : canHire;
  const farmCrop = CROPS[farm.crop];
 
  return (
    <div className="space-y-3">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>Workers ({farmWorkers.length})</h3>
        <button
          onClick={() => onHireWorker(farm.id)}
          disabled={!canHireWithBonus}
          className="btn"
          style={{ fontSize: "0.75rem", padding: "0.4rem 0.9rem" }}
        >
          {hasHeadStart && isFirstWorker
            ? "🙋 Hire (Free!)"
            : `🙋 Hire (${hireCost} ${farmCrop.emoji} ${farmCrop.name})`}
        </button>
      </div>
 
      {farmWorkers.length === 0 && (
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
          No workers yet. Hire one to start automating this farm.
        </p>
      )}
 
      {farmWorkers.length > 0 && (
        <div className="space-y-3">
          {farmWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              farm={farm}
              game={game}
              onUpgradeGear={onUpgradeGear}
              onSellWorker={onSellWorker}
              onSetSpecialization={onSetSpecialization}
            />
          ))}
        </div>
      )}
    </div>
  );
}