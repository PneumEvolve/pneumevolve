// src/Pages/rootwork/components/Plot.jsx
 
import React from "react";
import { CROPS } from "../gameConstants";
import { getEffectiveGrowTime } from "../gameEngine";
 
function getGrowPercent(plot, growTime) {
  if (plot.state !== "planted") return 0;
  return Math.min(100, Math.floor((plot.growthTick / growTime) * 100));
}
 
export default function Plot({ plot, farm, game, onPlant, onHarvest, onTend, tendMode, onUpgrade }) {
  const crop = CROPS[farm.crop];
  const feast = game.feastBonusPercent ?? 0;
  const growTime = getEffectiveGrowTime(farm, game.workers, farm.crop, plot, feast);
 
  const growPercent = getGrowPercent(plot, growTime);
  const isReady = plot.state === "ready";
  const isPlanted = plot.state === "planted";
  const isEmpty = plot.state === "empty";
  const isUpgraded = plot.upgraded === true;
 
  function handleTap() {
    if (tendMode) {
      if (isPlanted) onTend(farm.id, plot.id);
      return;
    }
    if (isEmpty) onPlant(farm.id, plot.id);
    else if (isReady) onHarvest(farm.id, plot.id);
  }
 
  const isTendable = tendMode && isPlanted;
  const isClickable = isTendable || (!tendMode && (isEmpty || isReady));
 
  // Visual state
  let bg = "var(--bg)";
  let borderColor = isUpgraded ? "#f59e0b" : "var(--border)";
  let label = null;
  let sublabel = null;
 
  if (tendMode) {
    if (isPlanted) {
      bg = "color-mix(in oklab, #a3e635 20%, var(--bg-elev))";
      borderColor = "#a3e635";
      label = "🌿";
      sublabel = "Tend";
    } else if (isReady) {
      bg = "color-mix(in oklab, #fbbf24 20%, var(--bg-elev))";
      borderColor = "#fbbf24";
      label = crop.emoji;
      sublabel = "Ready";
    } else {
      label = crop.emoji;
      sublabel = "Empty";
    }
  } else {
    if (isEmpty) {
      label = crop.emoji;
      sublabel = "Plant";
    } else if (isPlanted) {
      bg = isUpgraded
        ? "color-mix(in oklab, #fde68a 20%, var(--bg-elev))"
        : "color-mix(in oklab, #86efac 15%, var(--bg-elev))";
      borderColor = isUpgraded ? "#f59e0b" : "#86efac";
      label = "⏳";
      sublabel = `${growPercent}%`;
    } else if (isReady) {
      bg = "color-mix(in oklab, #fbbf24 20%, var(--bg-elev))";
      borderColor = "#fbbf24";
      label = crop.emoji;
      sublabel = "Harvest!";
    }
  }
 
  return (
    <button
      onClick={handleTap}
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        background: bg,
        border: `2px solid ${borderColor}`,
        borderRadius: "10px",
        cursor: isClickable ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        padding: "4px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.1s ease, background 0.2s ease, border-color 0.2s ease",
      }}
      onPointerDown={(e) => { if (isClickable) e.currentTarget.style.transform = "scale(0.94)"; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      aria-label={
        tendMode && isPlanted ? `Tend ${crop.name}`
        : isEmpty ? `Plant ${crop.name}`
        : isReady ? `Harvest ${crop.name}`
        : `${crop.name} growing — ${growPercent}%`
      }
    >
      {/* Growth progress bar */}
      {isPlanted && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, height: "3px",
          width: `${growPercent}%`,
          background: tendMode ? "#a3e635" : isUpgraded ? "#f59e0b" : "#4ade80",
          borderRadius: "0 0 0 8px",
          transition: "width 0.5s linear",
        }} />
      )}
 
      {/* Ready pulse */}
      {isReady && !tendMode && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "8px",
          border: "2px solid #fbbf24",
          animation: "rw-pulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
 
      {/* Tend mode pulse */}
      {tendMode && isPlanted && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "8px",
          border: "2px solid #a3e635",
          animation: "rw-pulse 1s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
 
      {/* Upgraded star badge */}
      {isUpgraded && !tendMode && (
        <div style={{
          position: "absolute", top: "2px", right: "3px",
          fontSize: "0.55rem", lineHeight: 1,
        }}>⭐</div>
      )}
 
      <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{label}</span>
      <span style={{
        fontSize: "0.6rem",
        color: isReady ? "#92400e" : tendMode && isPlanted ? "#365314" : "var(--muted)",
        fontWeight: (isReady || (tendMode && isPlanted)) ? 700 : 400,
        lineHeight: 1,
      }}>
        {sublabel}
      </span>
    </button>
  );
}