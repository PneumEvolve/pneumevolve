// src/Pages/rootwork/components/Plot.jsx
 
import React from "react";
import { CROPS, GEAR } from "../gameConstants";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function getGrowPercent(plot, growTime) {
  if (plot.state !== "planted") return 0;
  return Math.min(100, Math.floor((plot.growthTick / growTime) * 100));
}
 
// ─── Component ────────────────────────────────────────────────────────────────
 
export default function Plot({ plot, farm, game, onPlant, onHarvest }) {
  const crop = CROPS[farm.crop];
 
  // Effective grow time accounting for tender workers
  const tenders = game.workers.filter(
    (w) => w.farmId === farm.id && w.specialization === "tender"
  );
  const growTime =
    tenders.length > 0
      ? Math.max(5, Math.floor(crop.growTime * 0.8))
      : crop.growTime;
 
  const growPercent = getGrowPercent(plot, growTime);
  const isReady = plot.state === "ready";
  const isPlanted = plot.state === "planted";
  const isEmpty = plot.state === "empty";
 
  function handleTap() {
    if (isEmpty) onPlant(farm.id, plot.id);
    else if (isReady) onHarvest(farm.id, plot.id);
    // if planted and growing — no action, just show progress
  }
 
  // ── Visual state ─────────────────────────────────────────────────────────────
  let bg = "var(--bg)";
  let borderColor = "var(--border)";
  let cursor = "default";
  let label = null;
  let sublabel = null;
 
  if (isEmpty) {
    bg = "var(--bg)";
    borderColor = "var(--border)";
    cursor = "pointer";
    label = crop.emoji;
    sublabel = "Plant";
  } else if (isPlanted) {
    bg = "color-mix(in oklab, #86efac 15%, var(--bg-elev))";
    borderColor = "#86efac";
    cursor = "default";
    label = "⏳";
    sublabel = `${growPercent}%`;
  } else if (isReady) {
    bg = "color-mix(in oklab, #fbbf24 20%, var(--bg-elev))";
    borderColor = "#fbbf24";
    cursor = "pointer";
    label = crop.emoji;
    sublabel = "Harvest!";
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
        cursor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        padding: "4px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.1s ease, box-shadow 0.1s ease",
      }}
      onPointerDown={(e) => {
        if (isEmpty || isReady) {
          e.currentTarget.style.transform = "scale(0.94)";
        }
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      aria-label={
        isEmpty
          ? `Plant ${crop.name}`
          : isReady
          ? `Harvest ${crop.name}`
          : `${crop.name} growing — ${growPercent}%`
      }
    >
      {/* Growth progress bar */}
      {isPlanted && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "3px",
            width: `${growPercent}%`,
            background: "#4ade80",
            borderRadius: "0 0 0 8px",
            transition: "width 0.5s linear",
          }}
        />
      )}
 
      {/* Ready pulse ring */}
      {isReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "8px",
            border: "2px solid #fbbf24",
            animation: "rw-pulse 1.5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
 
      <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{label}</span>
      <span
        style={{
          fontSize: "0.6rem",
          color: isReady ? "#92400e" : "var(--muted)",
          fontWeight: isReady ? 700 : 400,
          lineHeight: 1,
        }}
      >
        {sublabel}
      </span>
    </button>
  );
}