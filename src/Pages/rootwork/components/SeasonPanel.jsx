// src/Pages/rootwork/components/SeasonPanel.jsx
 
import React from "react";
import { CROPS, SEASON_FARMS, PRESTIGE_BONUSES, MAX_SEASON, GEAR } from "../gameConstants";
import { isFarmAutomated } from "../gameEngine";
 
// ─── Farm automation status row ───────────────────────────────────────────────
 
function FarmStatusRow({ farm, game }) {
  const crop = CROPS[farm.crop];
  const automated = isFarmAutomated(farm, game.workers);
  const workers = game.workers.filter((w) => w.farmId === farm.id);
 
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.6rem 0",
        borderBottom: "1px solid var(--border)",
        fontSize: "0.82rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>{crop.emoji}</span>
        <span style={{ fontWeight: 500 }}>{crop.name} Farm</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
          {workers.length} worker{workers.length !== 1 ? "s" : ""}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.2rem 0.55rem",
            borderRadius: "999px",
            background: automated
              ? "color-mix(in oklab, #4ade80 15%, var(--bg-elev))"
              : "color-mix(in oklab, #f59e0b 15%, var(--bg-elev))",
            border: `1px solid ${automated ? "#4ade80" : "#f59e0b"}`,
            color: automated ? "#166534" : "#92400e",
          }}
        >
          {automated ? "✓ Automated" : "Manual"}
        </span>
      </div>
    </div>
  );
}
 
// ─── Prestige bonus tag ───────────────────────────────────────────────────────
 
function BonusTag({ bonusId }) {
  const bonus = PRESTIGE_BONUSES[bonusId];
  if (!bonus) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "0.72rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "999px",
        background: "color-mix(in oklab, var(--accent) 10%, var(--bg-elev))",
        border: "1px solid color-mix(in oklab, var(--accent) 25%, var(--border))",
        color: "var(--text)",
      }}
    >
      <span>{bonus.emoji}</span>
      <span>{bonus.name}</span>
    </div>
  );
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function SeasonPanel({ game, prestigeReady, onPrestige, onReset }) {
  const availableCropIds = SEASON_FARMS[game.season] ?? ["wheat"];
  const availableFarms = game.farms.filter((f) =>
    availableCropIds.includes(f.crop)
  );
  const allAutomated = availableFarms.every((f) =>
    isFarmAutomated(f, game.workers)
  );
  const atMaxSeason = game.season >= MAX_SEASON;
 
  // Worker summary
  const totalWorkers = game.workers.length;
  const workerGearSummary = game.workers.reduce((acc, w) => {
    acc[w.gear] = (acc[w.gear] ?? 0) + 1;
    return acc;
  }, {});
 
  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "1rem 1rem 4rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
          🌱 Season {game.season}
        </h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          {atMaxSeason
            ? "You've reached the final season. Keep optimizing!"
            : allAutomated
            ? "All farms automated — ready to begin a new season!"
            : "Automate all farms to unlock the next season."}
        </p>
      </div>
 
      {/* Farm automation status */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Farm Status
        </h3>
        {availableFarms.map((farm) => (
          <FarmStatusRow key={farm.id} farm={farm} game={game} />
        ))}
      </div>
 
      {/* Worker summary */}
      {totalWorkers > 0 && (
        <div className="card p-4" style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Workers ({totalWorkers})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {Object.entries(workerGearSummary).map(([gearId, count]) => {
              const gear = GEAR[gearId];
              return (
                <div
                  key={gearId}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "999px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {gear.emoji} {gear.name} × {count}
                </div>
              );
            })}
          </div>
        </div>
      )}
 
      {/* Prestige bonuses earned so far */}
      {game.prestigeBonuses.length > 0 && (
        <div className="card p-4" style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Bonuses Active
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {game.prestigeBonuses.map((bonusId, idx) => (
              <BonusTag key={`${bonusId}_${idx}`} bonusId={bonusId} />
            ))}
          </div>
        </div>
      )}
 
      {/* What carries over info */}
      {!atMaxSeason && (
        <div
          className="card p-4"
          style={{
            marginBottom: "1rem",
            fontSize: "0.78rem",
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          <h3
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "0.4rem",
            }}
          >
            New season — what carries over
          </h3>
          <ul style={{ paddingLeft: "1rem", margin: 0 }}>
            <li>✅ All workers (with gear adjusted)</li>
            <li>✅ 10% of your current crops</li>
            <li>✅ All prestige bonuses</li>
            <li>✅ One new farm unlocks</li>
            <li>❌ Plots reset to empty</li>
            <li>❌ Processing queue clears</li>
            <li>❌ Processed goods reset</li>
          </ul>
        </div>
      )}
 
      {/* Prestige button */}
      {!atMaxSeason && (
        <button
          onClick={onPrestige}
          disabled={!prestigeReady}
          className="btn w-full"
          style={{
            fontSize: "0.9rem",
            padding: "0.75rem",
            marginBottom: "1rem",
            opacity: prestigeReady ? 1 : 0.5,
          }}
        >
          {prestigeReady
            ? "🌱 Begin New Season →"
            : "Automate all farms to continue"}
        </button>
      )}
 
      {/* Danger zone */}
      <div
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--muted)",
            marginBottom: "0.5rem",
          }}
        >
          Danger zone
        </p>
        <button
          onClick={onReset}
          className="btn btn-secondary w-full"
          style={{
            fontSize: "0.78rem",
            padding: "0.5rem",
            color: "#ef4444",
            borderColor: "#ef4444",
          }}
        >
          Reset all progress
        </button>
      </div>
    </div>
  );
}