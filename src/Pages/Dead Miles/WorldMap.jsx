// src/Pages/DeadMiles/WorldMap.jsx
// (Full file with upgrade tree removed)

import React, { useState, useEffect } from "react";
import { getThreatTierInfo, THREAT_TIERS, VEHICLE_TYPES } from "./deadMilesEngine";
import { ROSTER_STATUS } from "./survivorRoster";

const LEVEL_LAYOUT = [
  { id: 0,  label: "Home Base",       x: 0.50, y: 0.93, type: "homebase" },
  { id: 1,  label: "Hamlet",         x: 0.50, y: 0.78, type: "town"     },
  { id: 2,  label: "Highway Mile 1", x: 0.38, y: 0.62, type: "road"     },
  { id: 3,  label: "Truck Stop",     x: 0.28, y: 0.50, type: "outpost"  },
  { id: 4,  label: "Overpass",       x: 0.40, y: 0.38, type: "road"     },
  { id: 5,  label: "River Bridge",   x: 0.55, y: 0.28, type: "danger"   },
  { id: 6,  label: "City Outskirts", x: 0.68, y: 0.40, type: "town"     },
  { id: 7,  label: "Downtown Core",  x: 0.72, y: 0.22, type: "boss"     },
];

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 7], [4, 6], [6, 7],
];

const STATUS_COLOR = {
  unexplored:   "rgba(255,255,255,0.18)",
  active:       "rgba(255,200,80,0.85)",
  cleared:      "rgba(80,220,120,0.85)",   // completed run — lootable again
  secured:      "rgba(80,220,120,0.85)",   // legacy alias for cleared
  under_attack: "rgba(255,80,80,0.9)",
};

const STATUS_LABEL = {
  unexplored:   "UNEXPLORED",
  active:       "IN PROGRESS",
  cleared:      "CLEARED",
  secured:      "CLEARED",               // legacy alias
  under_attack: "⚠ HOME UNDER ATTACK",
};

const TYPE_ICON = {
  homebase: "🏠",
  town:    "🏘",
  road:    "🛣",
  outpost: "⛽",
  danger:  "💀",
  boss:    "☠",
};

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

function LevelNode({ layout, level, isSelected, onClick }) {
  const color = STATUS_COLOR[level.status] ?? STATUS_COLOR.unexplored;
  const isAttacked = level.status === "under_attack";
  const tierInfo = (level.status === "secured" || level.status === "cleared" || level.status === "under_attack")
    ? getThreatTierInfo(level.threatTier ?? 1)
    : null;

  const glow = isSelected
    ? `0 0 0 3px rgba(255,200,80,0.3), 0 0 18px rgba(255,200,80,0.2)`
    : isAttacked
    ? `0 0 0 3px rgba(255,80,80,0.4), 0 0 12px rgba(255,80,80,0.3)`
    : tierInfo && tierInfo.tier >= 3
    ? `0 0 0 2px ${tierInfo.color}44, 0 0 10px ${tierInfo.color}22`
    : "none";

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
        flexDirection: "column",
        boxShadow: glow,
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        outline: "none",
        zIndex: isSelected ? 2 : 1,
      }}
    >
      {level.status === "unexplored" ? "?" : TYPE_ICON[layout.type] ?? "📍"}
      {tierInfo && tierInfo.tier >= 2 && (
        <div style={{
          position: "absolute",
          bottom: -2,
          right: -2,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: tierInfo.color,
          border: "1px solid rgba(0,0,0,0.5)",
        }} />
      )}
    </button>
  );
}

function ThreatTierBadge({ tier }) {
  const info = getThreatTierInfo(tier ?? 1);
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 8px",
      borderRadius: 6,
      background: `${info.color}18`,
      border: `1px solid ${info.color}55`,
      fontSize: 11,
      color: info.color,
      letterSpacing: "0.05em",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: info.color, flexShrink: 0,
      }} />
      {info.label}
    </div>
  );
}

function LevelDetail({ layout, level, onDeploy, onPlanDeploy, currentLevel, isPlaying, isLocked, onEnterHome }) {
  if (!layout || !level) {
    return (
      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 24 }}>
        Select a node to see details.
      </div>
    );
  }

  const canDeploy = !isLocked;
  const isActive  = level.id === currentLevel && isPlaying;
  const isHomeBase = layout.id === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

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

      {/* Home base: show threat tier + defense status */}
      {isHomeBase && (level.status === "secured" || level.status === "under_attack") && (
        <>
          <ThreatTierBadge tier={level.threatTier} />
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
              HOME BASE
            </div>
            <div>🛡 Walls: {level.baseHp ?? 100}/100 HP</div>
          </div>
        </>
      )}

      {/* Home under attack warning */}
      {isHomeBase && level.status === "under_attack" && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(255,80,80,0.07)",
          border: "1px solid rgba(255,80,80,0.25)",
          borderRadius: 10,
          fontSize: 12,
          color: "rgba(255,150,150,0.9)",
        }}>
          🚨 Home base under attack! Return to defend it.
        </div>
      )}

      {/* Run destination info */}
      {!isHomeBase && (level.status === "cleared" || level.status === "secured") && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(80,220,120,0.04)",
          border: "1px solid rgba(80,220,120,0.12)",
          borderRadius: 10,
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          lineHeight: 1.6,
        }}>
          <span style={{ color: "rgba(80,220,120,0.7)" }}>Cleared.</span> Loot resets each run — worth revisiting for materials.
        </div>
      )}

      {isLocked && (
        <div style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.25)",
          padding: "10px 12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10,
        }}>
          Complete the previous zone to unlock this region.
        </div>
      )}

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

      {canDeploy && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {isHomeBase ? (
            <button
              onClick={onEnterHome}
              style={{
                padding: "11px 0",
                borderRadius: 10,
                background: "rgba(255,200,80,0.12)",
                border: "1px solid rgba(255,200,80,0.3)",
                color: "rgba(255,200,80,0.95)",
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              🏠 Enter Base
            </button>
          ) : (
            <>
              <button
                onClick={() => onPlanDeploy(level.id)}
                style={{
                  padding: "11px 0",
                  borderRadius: 10,
                  background: "rgba(255,200,80,0.12)",
                  border: "1px solid rgba(255,200,80,0.3)",
                  color: "rgba(255,200,80,0.95)",
                  fontSize: 13,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                {level.status === "cleared" || level.status === "secured" ? "↩ Run Again" : "▶ Send Crew"}
              </button>

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
                🤖 Autorun
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Deploy Planning Modal ─────────────────────────────────────────────────────
// Three-tab modal: Party (who goes), Loadout (vehicles + resource transfer)
// Confirm returns { selectedIds, vehicleAssignments, stashTransfer }
function DeployPlanningModal({ levelLayout, level, worldState, onConfirm, onCancel }) {
  const tierInfo = getThreatTierInfo(level?.threatTier ?? 1);

  const deployable = (worldState.roster ?? []).filter(r =>
    r.rosterStatus === ROSTER_STATUS.AT_BASE
  );
  const garage     = worldState.homeBase?.garage ?? [];
  const stockpile  = worldState.totalResources ?? {};

  const [tab, setTab]         = useState("party");   // "party" | "loadout"
  const [selectedIds, setSelectedIds] = useState(() => new Set(deployable.map(r => r.id)));
  // vehicleAssignments: { survivorId | "player" → vehicleId }
  const [vehicleAssignments, setVehicleAssignments] = useState({});
  // resource amounts to transfer from stockpile → run stash
  const TRANSFER_KEYS = ["food", "water", "medicine", "fuel", "ammo"];
  const [stashTransfer, setStashTransfer] = useState(() => {
    const t = {};
    TRANSFER_KEYS.forEach(k => { t[k] = 0; });
    return t;
  });

  function toggle(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll()  { setSelectedIds(new Set(deployable.map(r => r.id))); }
  function selectNone() { setSelectedIds(new Set()); }

  const deploying = deployable.filter(r => selectedIds.has(r.id));
  const guarding  = deployable.filter(r => !selectedIds.has(r.id));
  const noRoster  = deployable.length === 0;

  // Which vehicles are still unassigned
  const assignedVehicleIds = new Set(Object.values(vehicleAssignments));
  const unassignedVehicles = garage.filter(v => !assignedVehicleIds.has(v.id) && v.hp > 0);

  function assignVehicle(survivorOrPlayer, vehicleId) {
    setVehicleAssignments(prev => {
      const next = { ...prev };
      // Remove any previous assignment of this vehicle
      for (const k of Object.keys(next)) {
        if (next[k] === vehicleId) delete next[k];
      }
      if (vehicleId) next[survivorOrPlayer] = vehicleId;
      else delete next[survivorOrPlayer];
      return next;
    });
  }

  function setTransfer(key, val) {
    const max = stockpile[key] ?? 0;
    setStashTransfer(prev => ({ ...prev, [key]: Math.max(0, Math.min(max, Math.round(Number(val) || 0))) }));
  }

  const missionLabel = level?.status === "cleared" || level?.status === "secured"
    ? "↩ Run Again"
    : "▶ Deploy";

  const partySlots = [{ id: "player", name: "You", role: "player" }, ...deploying];

  const VEHICLE_ICONS = { car: "🚗", bike: "🚲", minivan: "🚐", monster_truck: "🚛" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        width: "100%", maxWidth: 480,
        background: "#0d1215",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        display: "flex", flexDirection: "column",
        maxHeight: "92vh",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 17, color: "rgba(255,255,255,0.9)", letterSpacing: "0.03em" }}>
                {levelLayout?.label ?? "Mission"}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase", color: tierInfo.color }}>
                {tierInfo.label} — {tierInfo.description}
              </div>
            </div>
            <div style={{ padding: "4px 10px", borderRadius: 6, background: `${tierInfo.color}18`, border: `1px solid ${tierInfo.color}44`, fontSize: 11, color: tierInfo.color, flexShrink: 0 }}>
              Tier {level?.threatTier ?? 1}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {[
              { id: "party",   label: "👥 Party" },
              { id: "loadout", label: "🚗 Vehicles & Stash" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "5px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                background: tab === t.id ? "rgba(255,200,80,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${tab === t.id ? "rgba(255,200,80,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: tab === t.id ? "rgba(255,200,80,0.9)" : "rgba(255,255,255,0.35)",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        <div style={{ padding: "16px 22px", flex: 1, overflowY: "auto" }}>

          {/* ── PARTY tab ── */}
          {tab === "party" && (
            noRoster ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: 1.6 }}>
                No survivors at base.<br />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Recruit survivors during missions to build your roster.</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Choose who deploys
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={selectAll} style={quickSelectStyle}>All</button>
                    <button onClick={selectNone} style={quickSelectStyle}>None</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {deployable.map(r => {
                    const selected = selectedIds.has(r.id);
                    const hpPct    = Math.round(((r.hp ?? r.maxHp ?? 80) / (r.maxHp ?? 80)) * 100);
                    const hpColor  = hpPct > 60 ? "rgba(80,220,120,0.8)" : hpPct > 30 ? "rgba(255,200,80,0.8)" : "rgba(255,80,80,0.85)";
                    const moraleColor = (r.morale ?? 100) > 60 ? "rgba(120,200,255,0.7)" : (r.morale ?? 100) > 30 ? "rgba(255,200,80,0.7)" : "rgba(255,80,80,0.8)";
                    return (
                      <button key={r.id} onClick={() => toggle(r.id)} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10,
                        background: selected ? "rgba(255,200,80,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selected ? "rgba(255,200,80,0.3)" : "rgba(255,255,255,0.08)"}`,
                        cursor: "pointer", textAlign: "left", transition: "background 0.1s, border-color 0.1s",
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: selected ? "rgba(255,200,80,0.25)" : "rgba(255,255,255,0.07)", border: `1.5px solid ${selected ? "rgba(255,200,80,0.7)" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,200,80,0.9)" }}>
                          {selected ? "✓" : ""}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                            <span style={{ fontSize: 13, color: selected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)", fontWeight: 500 }}>{r.name}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{r.role}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,200,80,0.5)", marginLeft: "auto" }}>Lv {r.level ?? 1}</span>
                          </div>
                          <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)" }}>
                              <div style={{ width: `${hpPct}%`, height: "100%", borderRadius: 2, background: hpColor, transition: "width 0.2s" }} />
                            </div>
                            <span style={{ fontSize: 9, color: hpColor, minWidth: 28 }}>{r.hp ?? r.maxHp ?? 80} hp</span>
                            <span style={{ fontSize: 9, color: moraleColor }}>{r.morale ?? 100}% morale</span>
                          </div>
                          {r.traits?.length > 0 && (
                            <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {r.traits.slice(0, 3).map(t2 => (
                                <span key={t2} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
                                  {t2.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )
          )}

          {/* ── LOADOUT tab ── */}
          {tab === "loadout" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Vehicle assignments */}
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Vehicle Assignment
                </div>
                {garage.filter(v => v.hp > 0).length === 0 ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "8px 0" }}>
                    No vehicles in garage. Extract vehicles on runs to stock the fleet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {partySlots.map(member => {
                      const assigned = vehicleAssignments[member.id];
                      const assignedV = assigned ? garage.find(v => v.id === assigned) : null;
                      const assignedType = assignedV ? (VEHICLE_TYPES[assignedV.vehicleType] ?? {}) : null;
                      const opts = [
                        { id: "", label: "On foot" },
                        ...garage.filter(v => v.hp > 0).map(v => {
                          const cfg = VEHICLE_TYPES[v.vehicleType] ?? {};
                          const takenBy = Object.entries(vehicleAssignments).find(([k, vid]) => vid === v.id && k !== member.id)?.[0];
                          const takenByName = takenBy === "player" ? "You" : deployable.find(r => r.id === takenBy)?.name;
                          return {
                            id: v.id,
                            label: `${VEHICLE_ICONS[v.vehicleType] ?? "🚗"} ${cfg.label ?? v.vehicleType} — ${Math.round(v.hp / (v.maxHp || v.hp) * 100)}% HP · ${Math.round(v.fuel ?? 0)} fuel`,
                            disabled: !!takenBy,
                            takenBy: takenByName,
                          };
                        }),
                      ];
                      return (
                        <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", minWidth: 70, flexShrink: 0 }}>
                            {member.id === "player" ? "👤 You" : `👤 ${member.name}`}
                          </div>
                          <select
                            value={assigned ?? ""}
                            onChange={e => assignVehicle(member.id, e.target.value || null)}
                            style={{
                              flex: 1, background: "#111820", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
                              color: "rgba(255,255,255,0.75)", fontSize: 11, padding: "4px 6px", cursor: "pointer",
                            }}
                          >
                            {opts.map(o => (
                              <option key={o.id} value={o.id} disabled={o.disabled}>
                                {o.label}{o.takenBy ? ` (taken by ${o.takenBy})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resource stash transfer */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Mission Stash
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    Transfer from home stockpile
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { key: "food",     icon: "🍖", label: "Food" },
                    { key: "water",    icon: "💧", label: "Water" },
                    { key: "medicine", icon: "💊", label: "Medicine" },
                    { key: "fuel",     icon: "⛽", label: "Fuel" },
                    { key: "ammo",     icon: "🔫", label: "Ammo" },
                  ].map(({ key, icon, label }) => {
                    const available = Math.floor(stockpile[key] ?? 0);
                    const val = stashTransfer[key] ?? 0;
                    if (available === 0 && val === 0) return null;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 13, width: 20, textAlign: "center" }}>{icon}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", minWidth: 58 }}>{label}</div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="range" min={0} max={available} value={val}
                            onChange={e => setTransfer(key, e.target.value)}
                            style={{ flex: 1, accentColor: "rgba(255,200,80,0.8)" }}
                          />
                          <span style={{ fontSize: 11, minWidth: 48, color: "rgba(255,200,80,0.8)", textAlign: "right" }}>
                            {val} / {available}
                          </span>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                  {TRANSFER_KEYS.every(k => (stockpile[k] ?? 0) === 0) && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                      Home stockpile is empty. Go on a run first.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {!noRoster && (
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              <span style={{ color: deploying.length > 0 ? "rgba(255,200,80,0.7)" : "rgba(255,255,255,0.2)" }}>▶ {deploying.length} deploying</span>
              <span>🏠 {guarding.length} guarding home</span>
              {Object.keys(vehicleAssignments).length > 0 && (
                <span style={{ color: "rgba(120,200,255,0.6)" }}>🚗 {Object.keys(vehicleAssignments).length} vehicles assigned</span>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={() => onConfirm({
                selectedIds: deploying.length > 0 ? deploying.map(r => r.id) : null,
                vehicleAssignments,
                stashTransfer,
              })}
              style={{
                flex: 2, padding: "11px 0", borderRadius: 10,
                background: level?.status === "under_attack" ? "rgba(255,80,80,0.15)" : "rgba(255,200,80,0.12)",
                border: `1px solid ${level?.status === "under_attack" ? "rgba(255,80,80,0.35)" : "rgba(255,200,80,0.3)"}`,
                color: level?.status === "under_attack" ? "rgba(255,150,150,0.95)" : "rgba(255,200,80,0.95)",
                fontSize: 13, cursor: "pointer", letterSpacing: "0.05em",
              }}>
              {missionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const quickSelectStyle = {
  padding: "3px 10px",
  borderRadius: 5,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.4)",
  fontSize: 11,
  cursor: "pointer",
};

function ResourceBar({ worldState }) {
  const total = worldState.totalResources ?? {};
  const secured = worldState.levels.filter(l => l.status === "secured").length;

  const securedLevels = worldState.levels.filter(l => l.status === "secured");
  const foodPerMin  = securedLevels.reduce((acc, l) => acc + (l.gardenPlots ?? 0) * 5, 0);
  const scrapPerMin = securedLevels.reduce((acc, l) => acc + (l.turretPlaced ? 3 : 0), 0);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "10px 20px",
      background: "rgba(0,0,0,0.4)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      fontSize: 12,
      color: "rgba(255,255,255,0.45)",
      flexShrink: 0,
      flexWrap: "wrap",
    }}>
      <span style={{ color: "rgba(255,200,80,0.8)", letterSpacing: "0.1em", fontSize: 11 }}>
        WORLD MAP
      </span>
      <span style={{ marginLeft: "auto" }}>🏠 {secured} secured</span>
      <span>
        🌽 {Math.floor(total.food ?? 0)}
        {foodPerMin > 0 && <span style={{ color: "rgba(120,210,80,0.55)", fontSize: 10, marginLeft: 4 }}>+{foodPerMin}/min</span>}
      </span>
      <span>
        ⚙️ {Math.floor(total.scrap ?? 0)}
        {scrapPerMin > 0 && <span style={{ color: "rgba(120,210,80,0.55)", fontSize: 10, marginLeft: 4 }}>+{scrapPerMin}/min</span>}
      </span>
      {(total.medicine ?? 0) > 0 && <span>💊 {Math.floor(total.medicine)}</span>}
      {(total.fuel     ?? 0) > 0 && <span>⛽ {Math.floor(total.fuel)}</span>}
      {(total.ammo     ?? 0) > 0 && <span>🔫 {Math.floor(total.ammo)}</span>}
    </div>
  );
}

function EventsTicker({ events }) {
  if (!events || events.length === 0) return null;

  function timeAgo(ts) {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60)   return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  }

  const typeColor = {
    attack:       "rgba(255,100,80,0.85)",
    route_cut:    "rgba(255,140,60,0.85)",
    route_active: "rgba(120,200,255,0.8)",
    threat_up:    "rgba(255,160,40,0.85)",
    threat_down:  "rgba(120,210,80,0.8)",
    base_secured: "rgba(80,220,120,0.85)",
    resource_gen: "rgba(200,200,200,0.5)",
  };

  return (
    <div style={{
      width: 210,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: "14px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      maxHeight: 400,
      overflowY: "auto",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
        World Events
      </div>
      {events.slice(0, 15).map((ev, i) => (
        <div key={ev.id ?? i} style={{
          padding: "6px 0",
          borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          opacity: Math.max(0.3, 1 - i * 0.05),
        }}>
          <div style={{ fontSize: 11, color: typeColor[ev.type] ?? "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
            {ev.text}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)" }}>
            {timeAgo(ev.ts)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorldMap({ worldState, currentLevel, isPlaying, onDeploy, onMenu, worldEvents, onEnterHome, embeddedMode }) {
  const [selectedId, setSelectedId] = useState(currentLevel ?? 1);
  const [planningNode, setPlanningNode] = useState(null);

  function handleOpenPlanning(levelId) {
    setPlanningNode(levelId);
  }

  function handleConfirmDeploy({ selectedIds, vehicleAssignments, stashTransfer }) {
    const id = planningNode;
    setPlanningNode(null);
    onDeploy(id, false, selectedIds, vehicleAssignments, stashTransfer);
  }

  useEffect(() => {
    if (currentLevel) setSelectedId(currentLevel);
  }, [currentLevel]);

  const selectedLayout = LEVEL_LAYOUT.find(n => n.id === selectedId);
  const selectedLevel  = worldState.levels.find(l => l.id === selectedId);

  function isLevelLocked(levelId) {
    if (levelId <= 0) return false;
    const prev = worldState.levels.find(l => l.id === levelId - 1);
    return !prev || prev.status === "unexplored";
  }

  const selectedIsLocked = selectedLevel ? isLevelLocked(selectedLevel.id) : false;

  function handleNodeClick(id) {
    setSelectedId(id);
  }

  const MAP_W = 600;
  const MAP_H = 420;

  return (
    <main style={{
      minHeight: embeddedMode ? "unset" : "100vh",
      background: embeddedMode ? "transparent" : "#080b0d",
      color: "white",
      display: "flex",
      flexDirection: "column",
    }}>
      {!embeddedMode && <ResourceBar worldState={worldState} />}

      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 24,
        padding: "24px 16px",
        flexWrap: "wrap",
      }}>

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
          cursor: "default",
        }}>
          <svg style={{ position: "absolute", inset: 0, opacity: 0.07 }} width={MAP_W} height={MAP_H}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>

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
                onClick={() => handleNodeClick(layout.id)}
              />
            );
          })}

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

          <div style={{
            position: "absolute",
            bottom: 10,
            left: 12,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}>
            {Object.entries(THREAT_TIERS).filter(([k]) => parseInt(k) >= 1).map(([tier, info]) => (
              <div key={tier} style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 9, color: info.color,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: info.color }} />
                {info.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "0 0 auto" }}>

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
              onPlanDeploy={handleOpenPlanning}
              currentLevel={currentLevel}
              isPlaying={isPlaying}
              isLocked={selectedIsLocked}
              onEnterHome={onEnterHome}
            />

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

          <EventsTicker events={worldEvents ?? []} />
        </div>

      </div>

      {planningNode != null && (() => {
        const planLayout = LEVEL_LAYOUT.find(n => n.id === planningNode);
        const planLevel  = worldState.levels.find(l => l.id === planningNode);
        return (
          <DeployPlanningModal
            levelLayout={planLayout}
            level={planLevel}
            worldState={worldState}
            onConfirm={handleConfirmDeploy}
            onCancel={() => setPlanningNode(null)}
          />
        );
      })()}
    </main>
  );
}