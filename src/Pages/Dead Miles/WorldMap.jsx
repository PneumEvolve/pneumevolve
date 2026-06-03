// src/Pages/DeadMiles/WorldMap.jsx
// World map phase — shows all level nodes, lets player deploy or continue
// Step 1: wire the phase, Deploy button, level status display

import React, { useState, useEffect } from "react";

// ─── Level node layout ────────────────────────────────────────────────────────
// Positions as % of the map container (600×420 design area)
const LEVEL_LAYOUT = [
  { id: 1,  label: "Hamlet",         x: 0.50, y: 0.78, type: "town"     },
  { id: 2,  label: "Highway Mile 1", x: 0.38, y: 0.62, type: "road"     },
  { id: 3,  label: "Truck Stop",     x: 0.28, y: 0.50, type: "outpost"  },
  { id: 4,  label: "Overpass",       x: 0.40, y: 0.38, type: "road"     },
  { id: 5,  label: "River Bridge",   x: 0.55, y: 0.28, type: "danger"   },
  { id: 6,  label: "City Outskirts", x: 0.68, y: 0.40, type: "town"     },
  { id: 7,  label: "Downtown Core",  x: 0.72, y: 0.22, type: "boss"     },
];

// Which nodes connect to which (for drawing edges)
const EDGES = [
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 7], [4, 6], [6, 7],
];

const STATUS_COLOR = {
  unexplored:   "rgba(255,255,255,0.18)",
  active:       "rgba(255,200,80,0.85)",
  secured:      "rgba(80,220,120,0.85)",
  under_attack: "rgba(255,80,80,0.9)",
};

const STATUS_LABEL = {
  unexplored:   "UNEXPLORED",
  active:       "IN PROGRESS",
  secured:      "SECURED",
  under_attack: "⚠ UNDER ATTACK",
};

const TYPE_ICON = {
  town:    "🏘",
  road:    "🛣",
  outpost: "⛽",
  danger:  "💀",
  boss:    "☠",
};

// ─── SVG connector lines ──────────────────────────────────────────────────────
function MapEdges({ levels, W, H }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
    >
      {EDGES.map(([aId, bId]) => {
        const a = LEVEL_LAYOUT.find(n => n.id === aId);
        const b = LEVEL_LAYOUT.find(n => n.id === bId);
        if (!a || !b) return null;
        const la = levels.find(l => l.id === aId);
        const lb = levels.find(l => l.id === bId);
        const aKnown = la && la.status !== "unexplored";
        const bKnown = lb && lb.status !== "unexplored";
        return (
          <line
            key={`${aId}-${bId}`}
            x1={a.x * W} y1={a.y * H}
            x2={b.x * W} y2={b.y * H}
            stroke={aKnown && bKnown ? "rgba(255,200,80,0.25)" : "rgba(255,255,255,0.07)"}
            strokeWidth={aKnown && bKnown ? 1.5 : 1}
            strokeDasharray={aKnown && bKnown ? "none" : "4 4"}
          />
        );
      })}
    </svg>
  );
}

// ─── Single level node ────────────────────────────────────────────────────────
function LevelNode({ layout, level, isSelected, onClick }) {
  const color = STATUS_COLOR[level.status] ?? STATUS_COLOR.unexplored;
  const isAttacked = level.status === "under_attack";

  return (
    <button
      onClick={onClick}
      title={layout.label}
      style={{
        position: "absolute",
        left:   layout.x * 100 + "%",
        top:    layout.y * 100 + "%",
        transform: "translate(-50%, -50%)",
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: isSelected
          ? "rgba(255,200,80,0.18)"
          : level.status === "unexplored"
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.55)",
        border: `2px solid ${color}`,
        color,
        fontSize: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isSelected
          ? `0 0 0 3px rgba(255,200,80,0.3), 0 0 18px rgba(255,200,80,0.2)`
          : isAttacked
            ? `0 0 0 3px rgba(255,80,80,0.4), 0 0 12px rgba(255,80,80,0.3)`
            : "none",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        outline: "none",
        zIndex: isSelected ? 2 : 1,
      }}
    >
      {level.status === "unexplored" ? "?" : TYPE_ICON[layout.type] ?? "📍"}
    </button>
  );
}

// ─── Detail panel (right side) ────────────────────────────────────────────────
function LevelDetail({ layout, level, onDeploy, currentLevel, isPlaying, isLocked }) {
  if (!layout || !level) {
    return (
      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 24 }}>
        Select a node to see details.
      </div>
    );
  }

  const canDeploy = !isLocked;
  const isActive  = level.id === currentLevel && isPlaying;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.9)", letterSpacing: "0.03em" }}>
          {layout.label}
        </div>
        <div style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginTop: 3,
          color: STATUS_COLOR[level.status],
        }}>
          {STATUS_LABEL[level.status]}
        </div>
      </div>

      {/* Stats (secured only) */}
      {level.status === "secured" && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(80,220,120,0.06)",
          border: "1px solid rgba(80,220,120,0.15)",
          borderRadius: 10,
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <div style={{ color: "rgba(80,220,120,0.8)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>
            BASE STATUS
          </div>
          <div>🛡 Base HP: {level.baseHp ?? 100}/100</div>
          {level.turretPlaced && <div>🔫 Turret: active</div>}
          {(level.gardenPlots ?? 0) > 0 && <div>🌱 Garden plots: {level.gardenPlots}</div>}
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.3)" }}>
            Resources: food {level.resources?.food ?? 0} · scrap {level.resources?.scrap ?? 0}
          </div>
        </div>
      )}

      {/* Under attack warning */}
      {level.status === "under_attack" && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(255,80,80,0.07)",
          border: "1px solid rgba(255,80,80,0.25)",
          borderRadius: 10,
          fontSize: 12,
          color: "rgba(255,150,150,0.9)",
        }}>
          Your base is under attack! Drop in to defend it before you lose base HP.
        </div>
      )}

      {/* Locked message */}
      {isLocked && (
        <div style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.25)",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10,
        }}>
          Complete the previous level to unlock this region.
        </div>
      )}

      {/* Currently active badge */}
      {isActive && (
        <div style={{
          fontSize: 12,
          color: "rgba(255,200,80,0.8)",
          padding: "8px 12px",
          background: "rgba(255,200,80,0.07)",
          border: "1px solid rgba(255,200,80,0.2)",
          borderRadius: 10,
        }}>
          ▶ Currently running
        </div>
      )}

      {/* Action buttons */}
      {canDeploy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>

          {/* Primary action */}
          <button
            onClick={() => onDeploy(level.id, false)}
            style={{
              padding: "11px 0",
              borderRadius: 10,
              background: level.status === "under_attack"
                ? "rgba(255,80,80,0.15)"
                : "rgba(255,200,80,0.12)",
              border: `1px solid ${level.status === "under_attack" ? "rgba(255,80,80,0.35)" : "rgba(255,200,80,0.3)"}`,
              color: level.status === "under_attack"
                ? "rgba(255,150,150,0.95)"
                : "rgba(255,200,80,0.95)",
              fontSize: 13,
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            {level.status === "under_attack" ? "⚔ Drop In — Defend Base" : "▶ Deploy"}
          </button>

          {/* Send on Run — autopilot, not available for under_attack */}
          {level.status !== "under_attack" && (
            <button
              onClick={() => onDeploy(level.id, true)}
              style={{
                padding: "9px 0",
                borderRadius: 10,
                background: "rgba(120,200,255,0.07)",
                border: "1px solid rgba(120,200,255,0.2)",
                color: "rgba(120,200,255,0.75)",
                fontSize: 12,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              🤖 Send on Run
            </button>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Resource bar (top strip) ─────────────────────────────────────────────────
function ResourceBar({ worldState }) {
  const total = worldState.totalResources ?? {};
  const secured = worldState.levels.filter(l => l.status === "secured").length;

  // Compute generation rates so the player can see what their bases are producing
  const securedLevels = worldState.levels.filter(l => l.status === "secured");
  const foodPerMin  = securedLevels.reduce((acc, l) => acc + (l.gardenPlots ?? 0) * 5, 0); // 5 food/plot/tick × 1 tick/min
  const scrapPerMin = securedLevels.reduce((acc, l) => acc + (l.turretPlaced ? 3 : 0), 0); // 3 scrap/tick × 1 tick/min

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "10px 20px",
      background: "rgba(0,0,0,0.4)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      fontSize: 12,
      color: "rgba(255,255,255,0.45)",
      flexShrink: 0,
    }}>
      <span style={{ color: "rgba(255,200,80,0.8)", letterSpacing: "0.1em", fontSize: 11 }}>
        WORLD MAP
      </span>
      <span style={{ marginLeft: "auto" }}>
        🏠 {secured} secured
      </span>
      <span>
        🍖 {Math.floor(total.food ?? 0)} food
        {foodPerMin > 0 && (
          <span style={{ color: "rgba(120,210,80,0.55)", fontSize: 10, marginLeft: 4 }}>
            +{foodPerMin}/min
          </span>
        )}
      </span>
      <span>
        🔩 {Math.floor(total.scrap ?? 0)} scrap
        {scrapPerMin > 0 && (
          <span style={{ color: "rgba(120,210,80,0.55)", fontSize: 10, marginLeft: 4 }}>
            +{scrapPerMin}/min
          </span>
        )}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorldMap({ worldState, currentLevel, isPlaying, onDeploy, onMenu }) {
  const [selectedId, setSelectedId] = useState(currentLevel ?? 1);

  // Auto-select current level on mount / when it changes
  useEffect(() => {
    if (currentLevel) setSelectedId(currentLevel);
  }, [currentLevel]);

  const selectedLayout = LEVEL_LAYOUT.find(n => n.id === selectedId);
  const selectedLevel  = worldState.levels.find(l => l.id === selectedId);

  // A level is locked if it's unexplored AND the previous level hasn't been visited yet.
  // Level 1 is never locked. Level N requires level N-1 to be at least "active".
  function isLevelLocked(levelId) {
    if (levelId <= 1) return false;
    const prev = worldState.levels.find(l => l.id === levelId - 1);
    return !prev || prev.status === "unexplored";
  }

  const selectedIsLocked = selectedLevel ? isLevelLocked(selectedLevel.id) : false;

  // Map container sizing — responsive but capped
  const MAP_W = 600;
  const MAP_H = 420;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#080b0d",
      color: "white",
      display: "flex",
      flexDirection: "column",
    }}>

      <ResourceBar worldState={worldState} />

      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "24px 16px",
        flexWrap: "wrap",
      }}>

        {/* Map panel */}
        <div style={{
          position: "relative",
          width: MAP_W,
          height: MAP_H,
          maxWidth: "100vw",
          background: "radial-gradient(ellipse at 50% 60%, rgba(40,60,40,0.18) 0%, rgba(0,0,0,0) 70%), #0e1410",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          overflow: "hidden",
          flexShrink: 0,
        }}>

          {/* Subtle grid */}
          <svg style={{ position: "absolute", inset: 0, opacity: 0.07 }} width={MAP_W} height={MAP_H}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>

          {/* "NORTH" label */}
          <div style={{
            position: "absolute",
            top: 10, left: "50%", transform: "translateX(-50%)",
            fontSize: 10, letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.15)",
          }}>▲ NORTH</div>

          <MapEdges levels={worldState.levels} W={MAP_W} H={MAP_H} />

          {LEVEL_LAYOUT.map(layout => {
            const lvl = worldState.levels.find(l => l.id === layout.id);
            if (!lvl) return null;
            return (
              <LevelNode
                key={layout.id}
                layout={layout}
                level={lvl}
                isSelected={selectedId === layout.id}
                onClick={() => setSelectedId(layout.id)}
              />
            );
          })}

          {/* Node labels */}
          {LEVEL_LAYOUT.map(layout => {
            const lvl = worldState.levels.find(l => l.id === layout.id);
            if (!lvl || lvl.status === "unexplored") return null;
            return (
              <div
                key={`label-${layout.id}`}
                style={{
                  position: "absolute",
                  left:  layout.x * MAP_W,
                  top:   layout.y * MAP_H + 26,
                  transform: "translateX(-50%)",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {layout.label}
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        <div style={{
          width: 220,
          minHeight: 280,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}>
          <LevelDetail
            layout={selectedLayout}
            level={selectedLevel}
            onDeploy={onDeploy}
            currentLevel={currentLevel}
            isPlaying={isPlaying}
            isLocked={selectedIsLocked}
          />

          {/* Menu link */}
          <button
            onClick={onMenu}
            style={{
              marginTop: "auto",
              paddingTop: 20,
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.18)",
              fontSize: 11,
              cursor: "pointer",
              textAlign: "left",
              letterSpacing: "0.05em",
            }}
          >
            ← main menu
          </button>
        </div>

      </div>
    </main>
  );
}