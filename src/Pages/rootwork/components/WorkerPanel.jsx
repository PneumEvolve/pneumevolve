// src/Pages/rootwork/components/WorkerPanel.jsx
 
import React, { useState } from "react";
import {
  CROPS,
  GEAR,
  GEAR_ORDER,
  SPECIALIZATIONS,
  GEAR_CROP_COSTS,
  SPECIALIZE_COST,
  SPECIALIZE_CROP,
} from "../gameConstants";
import { getNextGear, getEffectiveCycleSeconds, needsSpecialization, getWorkerHireCost } from "../gameEngine";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
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
 
// ─── Worker card ──────────────────────────────────────────────────────────────
 
function WorkerCard({ worker, farm, game, onUpgradeGear, onSpecialize, onSellWorker }) {
  const [showSpecChoices, setShowSpecChoices] = useState(false);
  const [confirmSell, setConfirmSell] = useState(false);
 
  const gear = GEAR[worker.gear];
  const nextGearId = getNextGear(worker.gear);
  const nextGear = nextGearId ? GEAR[nextGearId] : null;
  const farmCrop = CROPS[farm.crop];
  const specCrop = CROPS[SPECIALIZE_CROP];
 
  const mustSpecialize = needsSpecialization(worker);
  const canAffordSpec = (game.crops[SPECIALIZE_CROP] ?? 0) >= SPECIALIZE_COST;
 
  const upgradeCropId = nextGearId ? GEAR_CROP_COSTS[nextGearId] : null;
  const upgradeCrop = upgradeCropId ? CROPS[upgradeCropId] : null;
  const upgradeAmount = nextGear?.upgradeCost ?? 0;
  const canUpgrade = !mustSpecialize && nextGear && upgradeCropId &&
    (game.crops[upgradeCropId] ?? 0) >= upgradeAmount;
 
  // Sell refund — approximate based on farm worker count
  const workersOnFarm = game.workers.filter((w) => w.farmId === farm.id).length;
  const prevCount = Math.max(0, workersOnFarm - 1);
  const hireCostWhenBought = Math.round(
    (10 * Math.pow(1.5, prevCount)) / 5
  ) * 5;
  const sellRefund = Math.floor(hireCostWhenBought * 0.5);
 
  return (
    <div className="card p-4 space-y-3" style={{ fontSize: "0.85rem" }}>
 
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600 }}>👷 Worker</div>
        <div style={{
          fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg)",
          border: "1px solid var(--border)", borderRadius: "999px", padding: "0.2rem 0.6rem",
        }}>
          {gear.emoji} {gear.name}
          {worker.specialization !== "none" && (
            <span style={{ marginLeft: "0.4rem" }}>
              · {SPECIALIZATIONS[worker.specialization]?.emoji} {SPECIALIZATIONS[worker.specialization]?.name}
            </span>
          )}
        </div>
      </div>
 
      {/* Stats */}
      <div style={{
        fontSize: "0.75rem", color: "var(--muted)", background: "var(--bg)",
        border: "1px solid var(--border)", borderRadius: "8px",
        padding: "0.4rem 0.65rem", lineHeight: 1.6,
      }}>
        <div>⚡ {statLine(worker)}</div>
      </div>
 
      {/* Upgrade path */}
      {mustSpecialize ? (
        <div>
          <button
            onClick={() => setShowSpecChoices((v) => !v)}
            disabled={!canAffordSpec}
            className="btn btn-secondary w-full"
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
          >
            {canAffordSpec
              ? `✨ Specialize — ${SPECIALIZE_COST} ${specCrop.emoji} ${specCrop.name}`
              : `✨ Specialize — need ${SPECIALIZE_COST} ${specCrop.emoji} ${specCrop.name}`}
          </button>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.3rem", textAlign: "center" }}>
            Choose a specialization to unlock Wheelbarrow upgrades
          </div>
          {showSpecChoices && canAffordSpec && (
            <div className="space-y-1 mt-2">
              {Object.values(SPECIALIZATIONS)
                .filter((s) => s.id !== "none")
                .map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => { onSpecialize(worker.id, spec.id); setShowSpecChoices(false); }}
                    className="w-full text-left card p-3"
                    style={{ fontSize: "0.72rem", cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>
                      {spec.emoji} {spec.name}
                    </div>
                    <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>{spec.description}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : nextGear ? (
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
 
      {/* Sell */}
      {!confirmSell ? (
        <button
          onClick={() => setConfirmSell(true)}
          className="btn btn-secondary w-full"
          style={{ fontSize: "0.72rem", padding: "0.35rem 0.75rem", color: "#ef4444", borderColor: "#ef4444" }}
        >
          Sell worker (+{sellRefund} {farmCrop.emoji} {farmCrop.name})
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
 
// ─── Main panel ───────────────────────────────────────────────────────────────
 
export default function WorkerPanel({
  farm, game,
  onHireWorker, onUpgradeGear, onSpecialize, onSellWorker,
}) {
  const farmWorkers = game.workers.filter((w) => w.farmId === farm.id);
  const farmCrop = CROPS[farm.crop];
 
  // Dynamic hire cost based on how many workers are already on this farm
  const nextHireCost = getWorkerHireCost(game, farm.id);
  const canAffordHire = (game.crops[farm.crop] ?? 0) >= nextHireCost;
 
  const hasHeadStart = game.prestigeBonuses.includes("head_start");
  const isFirstWorker = farmWorkers.length === 0;
  const hireCost = hasHeadStart && isFirstWorker ? 0 : nextHireCost;
  const canHire = hasHeadStart && isFirstWorker ? true : canAffordHire;
 
  return (
    <div className="space-y-3">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontWeight: 600, fontSize: "0.9rem" }}>Workers ({farmWorkers.length})</h3>
        <button
          onClick={() => onHireWorker(farm.id)}
          disabled={!canHire}
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
              onSpecialize={onSpecialize}
              onSellWorker={onSellWorker}
            />
          ))}
        </div>
      )}
    </div>
  );
}