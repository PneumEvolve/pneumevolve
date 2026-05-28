// src/Pages/Homestead/player_StatPill.jsx
// Tiny labelled stat chip used in TabMenu / RunTabMenu equipment summary.
// Single source of truth — previously duplicated across HomesteadView,
// ForestRun, MiningRun, and FruitRun.

import React from "react";

export function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 9px",
      borderRadius: 6,
      background: "rgba(200,230,120,0.06)",
      border: "1px solid rgba(200,230,120,0.15)",
    }}>
      <span style={{
        fontSize: 9,
        color: "rgba(200,230,160,0.45)",
        letterSpacing: "0.1em",
      }}>{label}</span>
      <span style={{
        fontSize: 12,
        color: color ?? "rgba(200,230,120,0.9)",
      }}>{value}</span>
    </div>
  );
}
