// src/Pages/DeadMiles/BaseView.jsx
// Full-screen base management panel — toggled by Tab key.
// Reads a live snapshot of stateRef.current pushed up from GameView.
// No canvas — pure React UI.

import React, { useState, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(seconds) {
  if (seconds <= 0) return "ready";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtAgo(ms) {
  if (!ms) return "";
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const RESOURCE_ICONS = {
  food:  "🌽", water: "💧", wood: "🪵",
  scrap: "⚙️", nails: "📌", seeds: "🌱", fuel: "⛽",
};

// Survivor role colours
const ROLE_COLOR = {
  farmer:   "rgba(120,210,80,0.9)",
  guard:    "rgba(255,100,80,0.9)",
  medic:    "rgba(80,180,255,0.9)",
  engineer: "rgba(255,200,60,0.9)",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CropCard({ crop, onHarvest }) {
  const pct = Math.min(1, crop.growTimer / crop.growTime);
  const isReady = crop.stage === "ready";
  const remaining = Math.max(0, crop.growTime - crop.growTimer);

  return (
    <div style={{
      background: isReady ? "rgba(120,210,80,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${isReady ? "rgba(120,210,80,0.3)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "border-color 0.3s, background 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textTransform: "capitalize" }}>
          {crop.type}
        </span>
        <span style={{
          fontSize: 11,
          color: isReady ? "rgba(120,210,80,0.9)" : "rgba(255,255,255,0.3)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {isReady ? "● READY" : fmtTime(remaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct * 100}%`,
          height: "100%",
          background: isReady ? "rgba(120,210,80,0.7)" : "rgba(255,200,60,0.5)",
          borderRadius: 2,
          transition: "width 0.5s ease",
        }} />
      </div>

      {isReady && (
        <button
          onClick={() => onHarvest(crop.id)}
          style={{
            marginTop: 2,
            padding: "5px 0",
            background: "rgba(120,210,80,0.12)",
            border: "1px solid rgba(120,210,80,0.3)",
            borderRadius: 8,
            color: "rgba(120,210,80,0.9)",
            fontSize: 12,
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}>
          Harvest
        </button>
      )}
    </div>
  );
}

function SurvivorCard({ survivor, onReassign }) {
  const roleColor = ROLE_COLOR[survivor.role] ?? "rgba(255,255,255,0.6)";
  const taskLabel = survivor.assignedTo
    ? `Assigned → ${survivor.assignedTo.structureType}`
    : survivor.command === "follow" ? "Following you"
    : survivor.command === "stay_safe" ? "Sheltering"
    : survivor.command === "fight" ? "On guard"
    : "Idle";

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
            {survivor.name}
          </div>
          <div style={{ fontSize: 11, color: roleColor, textTransform: "capitalize", marginTop: 1 }}>
            {survivor.role}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{taskLabel}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
            {survivor.state}
          </div>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", width: 18 }}>HP</span>
        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${(survivor.hp / survivor.maxHp) * 100}%`,
            height: "100%",
            background: survivor.hp > 50 ? "rgba(120,210,80,0.6)" : survivor.hp > 25 ? "rgba(255,200,60,0.7)" : "rgba(255,80,60,0.8)",
            borderRadius: 2,
          }} />
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>
          {survivor.hp}/{survivor.maxHp}
        </span>
      </div>

      <button
        onClick={() => onReassign(survivor)}
        style={{
          padding: "5px 0",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          color: "rgba(255,255,255,0.4)",
          fontSize: 11,
          cursor: "pointer",
          letterSpacing: "0.04em",
        }}>
        Reassign…
      </button>
    </div>
  );
}

function TurretCard({ turret }) {
  const pct = turret.hp / (turret.maxHp ?? 150);
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${pct < 0.3 ? "rgba(255,80,60,0.3)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12,
      padding: "10px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>⚡ Turret</span>
        <span style={{ fontSize: 11, color: pct < 0.3 ? "rgba(255,80,60,0.9)" : "rgba(255,255,255,0.3)" }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct * 100}%`,
          height: "100%",
          background: pct > 0.6 ? "rgba(80,180,255,0.6)" : pct > 0.3 ? "rgba(255,200,60,0.7)" : "rgba(255,80,60,0.8)",
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function ActivityFeed({ events }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: "16px 0", textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 12 }}>
        No activity yet.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {events.slice(0, 10).map((ev, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "6px 0",
          borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          opacity: 1 - i * 0.07,
        }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", flex: 1 }}>{ev.text}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 12, flexShrink: 0 }}>
            {fmtAgo(ev.ts)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── While-you-were-away modal ─────────────────────────────────────────────────

function AwayModal({ summary, onDismiss }) {
  if (!summary) return null;
  const { harvested, damaged, netResources } = summary;
  const hasNews = (harvested && harvested.length > 0) || (damaged && damaged.length > 0);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#0e1214",
        border: "1px solid rgba(255,200,80,0.2)",
        borderRadius: 16,
        padding: "24px 28px",
        maxWidth: 340,
        width: "90%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,200,80,0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          While you were away…
        </div>

        {!hasNews && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Nothing notable happened at the base.
          </div>
        )}

        {harvested?.map((h, i) => (
          <div key={i} style={{ fontSize: 13, color: "rgba(120,210,80,0.85)" }}>
            🌽 {h.name} harvested {h.amount} {h.type}
          </div>
        ))}

        {damaged?.map((d, i) => (
          <div key={i} style={{ fontSize: 13, color: "rgba(255,120,60,0.85)" }}>
            ⚡ Turret took {d.damage} damage
          </div>
        ))}

        {netResources && Object.keys(netResources).length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}>
            {Object.entries(netResources).map(([k, v]) => v !== 0 && (
              <span key={k} style={{ fontSize: 12, color: v > 0 ? "rgba(120,210,80,0.8)" : "rgba(255,100,80,0.8)" }}>
                {RESOURCE_ICONS[k] ?? "●"} {v > 0 ? "+" : ""}{v} {k}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onDismiss}
          style={{
            marginTop: 4,
            padding: "10px 0",
            background: "rgba(255,200,80,0.08)",
            border: "1px solid rgba(255,200,80,0.25)",
            borderRadius: 10,
            color: "rgba(255,200,80,0.9)",
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.06em",
          }}>
          Back to the action
        </button>
      </div>
    </div>
  );
}

// ─── BaseView ─────────────────────────────────────────────────────────────────

export default function BaseView({ stateSnapshot, activityLog, onHarvest, onClose, awaySummary, onDismissAway }) {
  const [tab, setTab] = useState("crops"); // "crops" | "survivors" | "turrets" | "stockpile"
  const [reassignTarget, setReassignTarget] = useState(null);

  const s = stateSnapshot;
  if (!s) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "#080b0d",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.3)", fontSize: 14,
      }}>
        Loading base…
      </div>
    );
  }

  const crops     = s.crops     ?? [];
  const survivors = s.survivors ?? [];
  const turrets   = (s.turrets  ?? []).filter(t => !t.destroyed);
  const inv       = s.player?.inventory ?? {};
  const homedId   = s.homesettlementId ?? null;
  const homeName  = homedId !== null
    ? (s.settlements?.[homedId]?.name ?? `Settlement ${homedId}`)
    : null;

  const readyCrops = crops.filter(c => c.stage === "ready").length;

  function handleReassign(survivor) {
    setReassignTarget(survivor);
  }

  function handleAssignCommand(command) {
    // Bubble up — GameView owns the actual state mutation
    // For now we emit an event that GameView can respond to via the onHarvest-style callback
    onHarvest?.({ type: "reassign", survivorId: reassignTarget.id, command });
    setReassignTarget(null);
  }

  const TABS = [
    { id: "crops",     label: `Crops${readyCrops > 0 ? ` (${readyCrops}✓)` : ""}` },
    { id: "survivors", label: `Survivors (${survivors.length})` },
    { id: "turrets",   label: `Turrets (${turrets.length})` },
    { id: "activity",  label: "Activity" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#080b0d",
      color: "rgba(255,255,255,0.8)",
      fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "16px 20px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
              Base Command
            </div>
            <div style={{ fontSize: 16, color: "rgba(255,200,80,0.9)", marginTop: 2, fontWeight: 600 }}>
              {homeName ?? "No homebase set"}
            </div>
          </div>

          {/* Stockpile pill strip */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {Object.entries(RESOURCE_ICONS).map(([key, icon]) => {
              const val = inv[key] ?? 0;
              if (val === 0) return null;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <span>{icon}</span>
                  <span style={{ color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>{val}</span>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              marginLeft: 16,
              padding: "6px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}>
            ↩ Back [Tab]
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "7px 14px",
                background: tab === t.id ? "rgba(255,200,80,0.1)" : "transparent",
                border: "none",
                borderBottom: tab === t.id ? "2px solid rgba(255,200,80,0.7)" : "2px solid transparent",
                borderRadius: 0,
                color: tab === t.id ? "rgba(255,200,80,0.9)" : "rgba(255,255,255,0.3)",
                fontSize: 12,
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "color 0.15s, border-color 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {tab === "crops" && (
          <>
            {crops.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No crops planted yet.<br />
                <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
                  Press G in-game to open the build menu → plant a crop plot.
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {crops.map(crop => (
                  <CropCard
                    key={crop.id}
                    crop={crop}
                    onHarvest={id => onHarvest?.({ type: "harvest", cropId: id })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "survivors" && (
          <>
            {survivors.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No survivors rescued yet.<br />
                <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
                  Search buildings to find survivors.
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {survivors.map(sv => (
                  <SurvivorCard key={sv.id} survivor={sv} onReassign={handleReassign} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "turrets" && (
          <>
            {turrets.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No turrets placed.<br />
                <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
                  Press G → place turret (costs 4 scrap + 8 nails).
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {turrets.map((t, i) => <TurretCard key={t.id ?? i} turret={t} />)}
              </div>
            )}
          </>
        )}

        {tab === "activity" && (
          <ActivityFeed events={activityLog} />
        )}
      </div>

      {/* ── Reassign modal ── */}
      {reassignTarget && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#0e1214",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: "24px 28px",
            maxWidth: 300,
            width: "90%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
              Reassign <strong style={{ color: "rgba(255,255,255,0.85)" }}>{reassignTarget.name}</strong>
            </div>
            {[
              { cmd: "follow",    label: "Follow me" },
              { cmd: "stay_safe", label: "Stay & shelter" },
              { cmd: "fight",     label: "Guard this area" },
              { cmd: "assign",    label: "Work (crop/turret)" },
            ].map(({ cmd, label }) => (
              <button
                key={cmd}
                onClick={() => handleAssignCommand(cmd)}
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  letterSpacing: "0.03em",
                }}>
                {label}
              </button>
            ))}
            <button
              onClick={() => setReassignTarget(null)}
              style={{
                marginTop: 4,
                padding: "8px 0",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.2)",
                fontSize: 12,
                cursor: "pointer",
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── While-you-were-away overlay ── */}
      <AwayModal summary={awaySummary} onDismiss={onDismissAway} />
    </div>
  );
}