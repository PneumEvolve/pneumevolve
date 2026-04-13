// src/Pages/rootwork/components/FarmUnlockModal.jsx
 
import React, { useState } from "react";
import { CROPS, EXTRA_FARM_CROPS } from "../gameConstants";
import { getNextFarmUnlockCost } from "../gameEngine";
 
export default function FarmUnlockModal({ game, onUnlock }) {
  const [selected, setSelected] = useState(null);
  const cost = getNextFarmUnlockCost(game);
  const cash = game.cash ?? 0;
  const canAfford = cash >= cost;
 
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div className="card p-6 w-full max-w-sm space-y-4" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div>
          <h2 className="text-xl font-bold text-center">🌾 New Farm Slot</h2>
          <p className="text-xs text-center mt-1" style={{ color: "var(--muted)" }}>
            Season {game.season} — choose a crop for your new farm
          </p>
        </div>
 
        <p className="text-sm text-center" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Pick a crop to grow on this farm. Plots, workers, and upgrades work the same as existing farms.
        </p>
 
        {/* Cost */}
        <div style={{
          textAlign: "center", fontSize: "0.82rem",
          color: canAfford ? "#4ade80" : "#ef4444", fontWeight: 600,
        }}>
          Cost: ${cost} cash · You have: ${Math.floor(cash)}
        </div>
 
        {/* Crop selection */}
        <div className="space-y-2">
          {EXTRA_FARM_CROPS.map((cropId) => {
            const crop = CROPS[cropId];
            const isSelected = selected === cropId;
            return (
              <button
                key={cropId}
                onClick={() => setSelected(cropId)}
                className="w-full text-left card p-3 transition"
                style={{
                  cursor: "pointer",
                  border: isSelected ? "2px solid var(--accent)" : "2px solid var(--border)",
                  background: isSelected ? "rgba(99,102,241,0.08)" : "var(--bg-elev)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {crop.emoji} {crop.name}
                  {isSelected && <span style={{ marginLeft: "0.5rem", color: "var(--accent)", fontSize: "0.75rem" }}>✓ Selected</span>}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                  Grows in {crop.growTime}s · {crop.workerYield} per worker harvest
                </div>
              </button>
            );
          })}
        </div>
 
        <button
          onClick={() => selected && onUnlock(selected)}
          disabled={!selected || !canAfford}
          className="btn w-full"
          style={{ fontSize: "0.9rem", padding: "0.65rem", opacity: selected && canAfford ? 1 : 0.5 }}
        >
          {!canAfford
            ? `Need $${cost} cash`
            : !selected
            ? "Select a crop first"
            : `🌱 Unlock ${CROPS[selected].name} Farm — $${cost}`}
        </button>
 
        {!canAfford && (
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
            Sell crops at the Market to earn cash, then come back to unlock your farm.
          </p>
        )}
      </div>
    </div>
  );
}