// src/Pages/rootwork/components/ResourceBar.jsx
 
import React from "react";
import { CROPS, SEASON_FARMS } from "../gameConstants";
 
export default function ResourceBar({ game }) {
  const availableCropIds = SEASON_FARMS[game.season] ?? ["wheat"];
 
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        borderBottom: "1px solid var(--border)",
        padding: "0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      {/* Crops */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {availableCropIds.map((cropId) => {
          const crop = CROPS[cropId];
          const amount = game.crops[cropId] ?? 0;
          return (
            <div
              key={cropId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              <span>{crop.emoji}</span>
              <span>{amount}</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  fontWeight: 400,
                }}
              >
                {crop.name}
              </span>
            </div>
          );
        })}
      </div>
 
      {/* Processed goods — only show if any exist */}
      {Object.entries(game.processed).some(([, v]) => v > 0) && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {Object.entries(game.processed).map(([id, amount]) => {
            if (amount <= 0) return null;
            const labels = { jam: "🍯", sauce: "🥫", feast: "🍽️" };
            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                <span>{labels[id]}</span>
                <span>{amount}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                    fontWeight: 400,
                    textTransform: "capitalize",
                  }}
                >
                  {id}
                </span>
              </div>
            );
          })}
        </div>
      )}
 
      {/* Season badge */}
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--muted)",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        Season {game.season}
      </div>
    </div>
  );
}