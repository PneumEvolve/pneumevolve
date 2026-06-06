// src/Pages/DeadMiles/BaseView.jsx
// Full-screen base management panel — toggled by Tab key.
// Reads a live snapshot of stateRef.current pushed up from GameView.
// No canvas — pure React UI.

import React, { useState, useEffect, useRef } from "react";
import { CRAFTING_RECIPES, WORKSTATION_DEFS, SURVIVOR_TRAITS, getBlockedCommands, SURVIVOR_MORALE_LOW_THRESHOLD, SURVIVOR_MORALE_CRIT_THRESHOLD, WORKSHOP_BLUEPRINT_COSTS } from "./deadMilesEngine";
import WorldMap from "./WorldMap";

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

function SurvivorCard({ survivor, onReassign, onHeal, medicine }) {
  const [expanded, setExpanded] = useState(false);
  const roleColor = ROLE_COLOR[survivor.role] ?? "rgba(255,255,255,0.6)";
  const taskLabel = survivor.workstation
    ? `🏭 ${survivor.workstation.replace("_", " ")}`
    : survivor.assignedTo
    ? `Assigned → ${survivor.assignedTo.structureType}`
    : survivor.command === "follow" ? "Following you"
    : survivor.command === "stay_safe" ? "Sheltering"
    : survivor.command === "fight" ? "On guard"
    : "Idle";

  const level  = survivor.level ?? 1;
  const xp     = survivor.xp   ?? 0;
  const xpNext = level * 100;
  const xpPct  = Math.min(1, xp / xpNext);

  const morale      = survivor.morale ?? 100;
  const moraleLow   = morale < SURVIVOR_MORALE_LOW_THRESHOLD;
  const moraleCrit  = morale < SURVIVOR_MORALE_CRIT_THRESHOLD;
  const moraleColor = moraleCrit
    ? "rgba(255,60,60,0.85)"
    : moraleLow
    ? "rgba(255,160,40,0.85)"
    : "rgba(120,210,80,0.7)";

  const hunger      = survivor.hunger ?? 0;
  const isHungry    = hunger > 0;

  const traits = (survivor.traits ?? []).map(tid => SURVIVOR_TRAITS[tid]).filter(Boolean);

  return (
    <div style={{
      background: moraleCrit ? "rgba(255,40,40,0.04)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${moraleCrit ? "rgba(255,60,60,0.25)" : moraleLow ? "rgba(255,160,40,0.18)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "border-color 0.3s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {survivor.name}
            </span>
            {level > 1 && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                padding: "1px 5px", borderRadius: 4,
                background: "rgba(255,200,60,0.12)", border: "1px solid rgba(255,200,60,0.25)",
                color: "rgba(255,200,60,0.85)",
              }}>
                Lv{level}
              </span>
            )}
            {isHungry && (
              <span style={{ fontSize: 10, color: "rgba(255,140,40,0.9)" }} title="Hungry — consuming from base food">🍽</span>
            )}
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

      {/* Traits */}
      {traits.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {traits.map(trait => (
            <span key={trait.id} title={trait.desc} style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${trait.color}44`,
              color: trait.color,
              cursor: "help",
              letterSpacing: "0.03em",
            }}>
              {trait.emoji} {trait.label}
            </span>
          ))}
        </div>
      )}

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
          {Math.floor(survivor.hp)}/{survivor.maxHp}
        </span>
      </div>

      {/* Morale bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", width: 18 }}>😊</span>
        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${Math.max(0, Math.min(100, morale))}%`,
            height: "100%",
            background: moraleColor,
            borderRadius: 2,
            transition: "width 0.5s ease, background 0.3s",
          }} />
        </div>
        <span style={{ fontSize: 10, color: moraleCrit ? "rgba(255,60,60,0.9)" : "rgba(255,255,255,0.25)", fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>
          {Math.floor(morale)}
        </span>
      </div>

      {/* XP bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "rgba(255,200,60,0.3)", width: 18 }}>XP</span>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${xpPct * 100}%`,
            height: "100%",
            background: "rgba(255,200,60,0.5)",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontVariantNumeric: "tabular-nums", width: 36, textAlign: "right" }}>
          {xp}/{xpNext}
        </span>
      </div>

      {/* Morale warning */}
      {moraleCrit && (
        <div style={{
          fontSize: 11,
          color: "rgba(255,80,60,0.9)",
          background: "rgba(255,60,60,0.07)",
          border: "1px solid rgba(255,60,60,0.2)",
          borderRadius: 6,
          padding: "4px 8px",
        }}>
          ⚠ Rock bottom — may leave soon
        </div>
      )}

      {/* Action row */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onReassign(survivor)}
          style={{
            flex: 1,
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
        {/* Step 4b: Heal button — visible when wounded */}
        {survivor.hp < survivor.maxHp && (
          <button
            onClick={() => onHeal?.(survivor.id)}
            disabled={!onHeal || (medicine ?? 0) < 2}
            title={`Spend 2 medicine to restore 40 HP (have ${medicine ?? 0})`}
            style={{
              padding: "5px 10px",
              background: (medicine ?? 0) >= 2 ? "rgba(80,220,160,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${(medicine ?? 0) >= 2 ? "rgba(80,220,160,0.3)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 8,
              color: (medicine ?? 0) >= 2 ? "rgba(80,220,160,0.85)" : "rgba(255,255,255,0.2)",
              fontSize: 11,
              cursor: (medicine ?? 0) >= 2 ? "pointer" : "default",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}>
            💊 Heal
          </button>
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            padding: "5px 10px",
            background: expanded ? "rgba(255,200,80,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${expanded ? "rgba(255,200,80,0.25)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 8,
            color: expanded ? "rgba(255,200,80,0.8)" : "rgba(255,255,255,0.3)",
            fontSize: 11,
            cursor: "pointer",
          }}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded: backstory + story log */}
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {survivor.backstory && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, fontStyle: "italic" }}>
              "{survivor.backstory}"
            </div>
          )}
          {(survivor.storyLog ?? []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
                Story
              </div>
              {(survivor.storyLog ?? []).slice(0, 5).map((entry, i) => (
                <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "flex", gap: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>›</span>
                  <span>{entry.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TurretCard({ turret, onRepair, scrap }) {
  const pct = turret.hp / (turret.maxHp ?? 150);
  const isDamaged = turret.hp < (turret.maxHp ?? 150);
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
      {/* Step 4d: Repair button */}
      {isDamaged && (
        <button
          onClick={() => onRepair?.(turret.id)}
          disabled={!onRepair || (scrap ?? 0) < 2}
          title={`Spend 2 scrap to repair +40 HP (have ${scrap ?? 0} scrap)`}
          style={{
            marginTop: 2,
            padding: "5px 0",
            background: (scrap ?? 0) >= 2 ? "rgba(255,200,60,0.08)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${(scrap ?? 0) >= 2 ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 7,
            color: (scrap ?? 0) >= 2 ? "rgba(255,200,60,0.85)" : "rgba(255,255,255,0.2)",
            fontSize: 11,
            cursor: (scrap ?? 0) >= 2 ? "pointer" : "default",
            letterSpacing: "0.03em",
          }}>
          🔧 Repair (2 scrap)
        </button>
      )}
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

        {/* FIX 2/4: show workstation production in the away summary */}
        {summary.produced?.length > 0 && (() => {
          // Group by workstation for a clean summary
          const byStation = {};
          for (const p of summary.produced) {
            if (!byStation[p.workstation]) byStation[p.workstation] = {};
            byStation[p.workstation][p.resource] = (byStation[p.workstation][p.resource] ?? 0) + p.amount;
          }
          return Object.entries(byStation).map(([ws, res]) => (
            <div key={ws} style={{ fontSize: 12, color: "rgba(160,200,255,0.85)" }}>
              🏭 {ws.replace("_", " ")}: {Object.entries(res).map(([r, a]) => `+${Math.floor(a)} ${r}`).join(", ")}
            </div>
          ));
        })()}

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

// ─── CraftingTab ──────────────────────────────────────────────────────────────

function CraftingTab({ baseStorage, onCraft }) {
  const [crafting, setCrafting] = useState(null); // { recipeId, elapsed, total }
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCraft(recipe) {
    if (crafting) return;
    const missing = {};
    for (const [k, qty] of Object.entries(recipe.inputs)) {
      const have = (baseStorage[k] ?? 0);
      if (have < qty) missing[k] = qty - have;
    }
    if (Object.keys(missing).length > 0) return;

    setCrafting({ recipeId: recipe.id, elapsed: 0, total: recipe.seconds });

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 0.1;
      setCrafting(prev => prev ? { ...prev, elapsed } : null);
      if (elapsed >= recipe.seconds) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCrafting(null);
        onCraft?.({ type: "craft", recipeId: recipe.id });
      }
    }, 100);
  }

  function canAfford(recipe) {
    for (const [k, qty] of Object.entries(recipe.inputs)) {
      if ((baseStorage[k] ?? 0) < qty) return false;
    }
    return true;
  }

  const RESOURCE_ICONS_LOCAL = {
    food: "🌽", water: "💧", wood: "🪵", scrap: "⚙️",
    nails: "📌", seeds: "🌱", fuel: "⛽", car_parts: "🔩",
    barricade_kit: "🪵", turret_kit: "🗼",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em",
        textTransform: "uppercase", marginBottom: 4,
      }}>
        Craft from Base Stockpile — outputs go back to Storage
      </div>

      {CRAFTING_RECIPES.map(recipe => {
        const affordable = canAfford(recipe);
        const isCrafting = crafting?.recipeId === recipe.id;
        const pct = isCrafting ? Math.min(1, crafting.elapsed / crafting.total) : 0;

        return (
          <div key={recipe.id} style={{
            background: isCrafting ? "rgba(255,200,60,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isCrafting ? "rgba(255,200,60,0.25)" : affordable ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            opacity: !affordable && !isCrafting ? 0.55 : 1,
            transition: "opacity 0.2s, border-color 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{recipe.icon}</span>
                <div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                    {recipe.label}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    {recipe.desc}
                  </div>
                </div>
              </div>
              {!isCrafting && (
                <button
                  onClick={() => startCraft(recipe)}
                  disabled={!affordable || !!crafting}
                  style={{
                    flexShrink: 0,
                    padding: "6px 14px",
                    background: affordable && !crafting ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${affordable && !crafting ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8,
                    color: affordable && !crafting ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.25)",
                    fontSize: 12,
                    cursor: affordable && !crafting ? "pointer" : "default",
                    letterSpacing: "0.04em",
                  }}>
                  {crafting && crafting.recipeId !== recipe.id ? "Busy…" : "Craft"}
                </button>
              )}
            </div>

            {/* Inputs / Outputs */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(recipe.inputs).map(([k, qty]) => {
                const have = baseStorage[k] ?? 0;
                const ok = have >= qty;
                return (
                  <span key={k} style={{
                    fontSize: 11,
                    color: ok ? "rgba(255,255,255,0.5)" : "rgba(255,100,80,0.85)",
                    background: ok ? "rgba(255,255,255,0.05)" : "rgba(255,80,60,0.08)",
                    border: `1px solid ${ok ? "rgba(255,255,255,0.08)" : "rgba(255,80,60,0.2)"}`,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}>
                    {RESOURCE_ICONS_LOCAL[k] ?? "●"} {qty} {k}
                    {!ok && <span style={{ marginLeft: 4, opacity: 0.6 }}>({have} / {qty})</span>}
                  </span>
                );
              })}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>→</span>
              {Object.entries(recipe.outputs).map(([k, qty]) => (
                <span key={k} style={{
                  fontSize: 11,
                  color: "rgba(120,210,80,0.85)",
                  background: "rgba(120,210,80,0.06)",
                  border: "1px solid rgba(120,210,80,0.15)",
                  borderRadius: 6,
                  padding: "2px 8px",
                }}>
                  {RESOURCE_ICONS_LOCAL[k] ?? "●"} +{qty} {k}
                </span>
              ))}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>
                {recipe.seconds}s
              </span>
            </div>

            {/* Progress bar */}
            {isCrafting && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct * 100}%`,
                    height: "100%",
                    background: "rgba(255,200,60,0.7)",
                    borderRadius: 2,
                    transition: "width 0.1s linear",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,200,60,0.6)", textAlign: "right" }}>
                  {Math.ceil(crafting.total - crafting.elapsed)}s remaining…
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── WorkstationPicker ────────────────────────────────────────────────────────

function WorkstationPicker({ survivor, builtStructures, onAssign, onClose }) {
  const assigned = survivor?.workstation ?? null;
  // Derive which workstation types are physically built at home
  const builtTypes = new Set((builtStructures ?? []).map(s => s.type));

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
      zIndex: 10,
    }}>
      <div style={{
        background: "#0e1214",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "24px 28px",
        maxWidth: 320,
        width: "90%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
          Assign <strong style={{ color: "rgba(255,255,255,0.85)" }}>{survivor?.name}</strong> to workstation
        </div>

        {WORKSTATION_DEFS.map(ws => {
          const isActive  = assigned === ws.id;
          const isBuilt   = builtTypes.has(ws.id);
          const isDisabled = !isBuilt && !isActive;

          return (
            <button
              key={ws.id}
              onClick={() => isBuilt && onAssign(ws.id)}
              disabled={isDisabled}
              style={{
                padding: "10px 14px",
                background: isActive
                  ? "rgba(255,200,60,0.08)"
                  : isBuilt
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.015)",
                border: `1px solid ${isActive ? "rgba(255,200,60,0.3)" : isBuilt ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
                borderRadius: 10,
                color: isActive
                  ? "rgba(255,200,60,0.9)"
                  : isBuilt
                  ? "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.2)",
                fontSize: 13,
                cursor: isBuilt ? "pointer" : "not-allowed",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                opacity: isDisabled ? 0.5 : 1,
              }}>
              <span style={{ fontSize: 18 }}>{ws.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  {ws.label} {isActive ? "✓" : ""}
                  {!isBuilt && (
                    <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,120,60,0.7)", background: "rgba(255,120,60,0.1)", border: "1px solid rgba(255,120,60,0.2)", borderRadius: 4, padding: "1px 5px" }}>
                      NOT BUILT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {isBuilt ? ws.desc : "Build this structure first — queue a blueprint from the Build tab"}
                </div>
              </div>
            </button>
          );
        })}

        {/* Builder workstation — always available, no building needed */}
        {(() => {
          const isActive = assigned === "builder";
          return (
            <button
              onClick={() => onAssign("builder")}
              style={{
                padding: "10px 14px",
                background: isActive ? "rgba(120,200,80,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? "rgba(120,200,80,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10,
                color: isActive ? "rgba(180,255,120,0.9)" : "rgba(255,255,255,0.65)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}>
              <span style={{ fontSize: 18 }}>🔨</span>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>Builder {isActive ? "✓" : ""}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Walks to queued blueprints and constructs them automatically</div>
              </div>
            </button>
          );
        })()}

        {assigned && (
          <button
            onClick={() => onAssign(null)}
            style={{
              padding: "8px 0",
              background: "transparent",
              border: "1px solid rgba(255,80,60,0.2)",
              borderRadius: 10,
              color: "rgba(255,100,80,0.6)",
              fontSize: 12,
              cursor: "pointer",
            }}>
            Unassign from workstation
          </button>
        )}

        <button
          onClick={onClose}
          style={{
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
  );
}

// ─── Crisis Events Panel ──────────────────────────────────────────────────────

function CrisisPanel({ crisisEvents, onResolveCrisis, baseStorage }) {
  const pending = (crisisEvents ?? []).filter(e => !e.resolved);
  if (pending.length === 0) return null;

  function canAfford(cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([k, qty]) => (baseStorage?.[k] ?? 0) >= qty);
  }

  return (
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: 320,
      maxHeight: "100%",
      overflowY: "auto",
      padding: "14px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      zIndex: 20,
      pointerEvents: "none",
    }}>
      {pending.map(crisis => (
        <div key={crisis.id} style={{
          background: "#0e1214",
          border: "1px solid rgba(255,160,40,0.35)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,160,40,0.15)",
          pointerEvents: "all",
          animation: "crisisSlideIn 0.25s ease",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,200,80,0.95)", fontWeight: 600, marginBottom: 3 }}>
                {crisis.title}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
                {crisis.body}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(crisis.options ?? []).map(opt => {
              const hasCost    = opt.cost && Object.keys(opt.cost).length > 0;
              const affordable = canAfford(opt.cost);
              return (
                <button
                  key={opt.id}
                  onClick={() => onResolveCrisis?.(crisis.id, opt.id)}
                  disabled={!affordable}
                  title={!affordable ? "Not enough resources" : undefined}
                  style={{
                    padding: "8px 12px",
                    background: affordable ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
                    border: `1px solid ${affordable ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 8,
                    color: affordable ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                    fontSize: 12,
                    cursor: affordable ? "pointer" : "not-allowed",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    letterSpacing: "0.03em",
                  }}>
                  <span>{opt.label}</span>
                  {hasCost && (
                    <span style={{ fontSize: 10, color: affordable ? "rgba(255,160,40,0.8)" : "rgba(255,80,60,0.7)" }}>
                      {Object.entries(opt.cost).map(([k, v]) => `${v} ${k}`).join(", ")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <style>{`@keyframes crisisSlideIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}

// ─── BaseView ─────────────────────────────────────────────────────────────────

export default function BaseView({ stateSnapshot, activityLog, onHarvest, onClose, awaySummary, onDismissAway, crisisEvents, onResolveCrisis, worldState, worldEvents, onDeploy, onAddRoute, onRemoveRoute, onEnterHome, defaultTab }) {
  // FIX 4/5: "storage" tab shows baseStorage separately from player field inventory
  const [tab, setTab] = useState(defaultTab ?? "build"); // "build" | "survivors" | "turrets" | "crops" | "storage" | "crafting" | "activity"
  const [reassignTarget, setReassignTarget] = useState(null);
  const [workstationTarget, setWorkstationTarget] = useState(null); // survivor being assigned to a workstation

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

  const crops       = s.crops     ?? [];
  const survivors   = s.survivors ?? [];
  const turrets     = (s.turrets  ?? []).filter(t => !t.destroyed);
  const inv         = s.player?.inventory ?? {};
  // FIX 5: baseStorage is the persistent base stockpile, separate from player field inventory
  const baseStorage = s.baseStorage ?? {};
  const homedId     = s.homesettlementId ?? null;
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

  // FIX 5: include storage tab count so the player knows what's in the stockpile
  const storageTotalItems = Object.values(baseStorage).filter(v => v > 0).length;

  const TABS = [
    { id: "build",     label: "🏗 Build" },
    { id: "survivors", label: `Survivors (${survivors.length})` },
    { id: "turrets",   label: `Defense (${turrets.length})` },
    { id: "crops",     label: `Crops${readyCrops > 0 ? ` (${readyCrops}✓)` : ""}` },
    { id: "storage",   label: `Storage${storageTotalItems > 0 ? ` (${storageTotalItems})` : ""}` },
    { id: "garage",    label: `Garage (${(worldState?.homeBase?.garage ?? s.garage ?? []).length})` },
    { id: "crafting",  label: "Crafting" },
    { id: "activity",  label: "Activity" },
    ...(worldState ? [{ id: "map", label: "🗺️ Deploy" }] : []),
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
        {tab === "build" && (() => {
          const builtStructures = s.builtStructures ?? [];
          const pendingBlueprints = (s.blueprints ?? []).filter(bp => bp.category === "workshop" || WORKSHOP_BLUEPRINT_COSTS[bp.type]);
          const bs = baseStorage;

          // Workshop structure defs with their build cost
          const BUILDABLE_STRUCTURES = WORKSTATION_DEFS.filter(ws => ws.buildable);
          const turretCost = { scrap: 4, nails: 8 };
          const plotCost   = { seeds: 1 };

          function canAffordCost(cost) {
            return Object.entries(cost).every(([k, v]) => (bs[k] ?? 0) >= v);
          }

          function costLabel(cost) {
            return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(" + ");
          }

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Built structures status */}
              {builtStructures.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                    ✅ Built Structures
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                    {builtStructures.map(st => {
                      const def = WORKSTATION_DEFS.find(w => w.id === st.type);
                      return (
                        <div key={st.id} style={{
                          padding: "10px 12px",
                          background: "rgba(80,220,120,0.06)",
                          border: "1px solid rgba(80,220,120,0.2)",
                          borderRadius: 10,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: 18 }}>{def?.icon ?? "🏗"}</span>
                          <div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{def?.label ?? st.type}</div>
                            <div style={{ fontSize: 10, color: "rgba(80,220,120,0.7)" }}>Built · staffable</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Blueprints waiting to be built */}
              {pendingBlueprints.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                    📐 Queued — Head to Home Base to Build
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {pendingBlueprints.map(bp => {
                      const def = WORKSTATION_DEFS.find(w => w.id === bp.type);
                      return (
                        <div key={bp.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: 8,
                          background: "rgba(255,200,80,0.06)", border: "1px solid rgba(255,200,80,0.2)",
                        }}>
                          <span style={{ fontSize: 16 }}>{def?.icon ?? "🏗"}</span>
                          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                            {def?.label ?? bp.type} — walk up and press [F] to build
                          </span>
                          <button
                            onClick={() => onHarvest?.({ type: "cancel_blueprint", blueprintId: bp.id })}
                            style={{
                              padding: "2px 8px", borderRadius: 5, fontSize: 10, cursor: "pointer",
                              background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)",
                              color: "rgba(255,120,120,0.8)",
                            }}>
                            Cancel
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buildable workshop structures */}
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  🏭 Workshops — unlocks workstation slots
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {BUILDABLE_STRUCTURES.map(ws => {
                    const cost    = WORKSHOP_BLUEPRINT_COSTS[ws.id];
                    const isBuilt = builtStructures.some(st => st.type === ws.id);
                    const isPending = pendingBlueprints.some(bp => bp.type === ws.id);
                    const canBuild = !isBuilt && !isPending && canAffordCost(cost);

                    return (
                      <div key={ws.id} style={{
                        padding: "12px 14px",
                        background: isBuilt ? "rgba(80,220,120,0.04)" : isPending ? "rgba(255,200,80,0.04)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isBuilt ? "rgba(80,220,120,0.2)" : isPending ? "rgba(255,200,80,0.2)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius: 12,
                        display: "flex", alignItems: "center", gap: 12,
                        opacity: isBuilt ? 0.7 : 1,
                      }}>
                        <span style={{ fontSize: 22 }}>{ws.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                            {ws.label}
                            {isBuilt && <span style={{ fontSize: 10, color: "rgba(80,220,120,0.8)", background: "rgba(80,220,120,0.1)", border: "1px solid rgba(80,220,120,0.25)", borderRadius: 4, padding: "1px 5px" }}>BUILT</span>}
                            {isPending && <span style={{ fontSize: 10, color: "rgba(255,200,80,0.8)", background: "rgba(255,200,80,0.1)", border: "1px solid rgba(255,200,80,0.25)", borderRadius: 4, padding: "1px 5px" }}>QUEUED</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{ws.desc}</div>
                          {!isBuilt && (
                            <div style={{ fontSize: 10, color: canBuild ? "rgba(255,200,60,0.6)" : "rgba(255,80,60,0.5)", marginTop: 3 }}>
                              Cost: {costLabel(cost)}
                            </div>
                          )}
                        </div>
                        {!isBuilt && !isPending && (
                          <button
                            onClick={() => canBuild && onHarvest?.({ type: "queue_blueprint", blueprintType: ws.id })}
                            disabled={!canBuild}
                            style={{
                              padding: "7px 14px", borderRadius: 8, fontSize: 12,
                              background: canBuild ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${canBuild ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.07)"}`,
                              color: canBuild ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.2)",
                              cursor: canBuild ? "pointer" : "default",
                              flexShrink: 0,
                            }}>
                            Queue
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Turret and garden plot */}
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  🛡 Defenses &amp; Farming
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { type: "turret",    icon: "🗼", label: "Auto Turret",  cost: turretCost },
                    { type: "crop_plot", icon: "🌱", label: "Garden Plot",  cost: plotCost },
                  ].map(item => {
                    const canBuild = canAffordCost(item.cost);
                    const isPending = (s.blueprints ?? []).some(bp => bp.type === item.type);
                    return (
                      <div key={item.type} style={{
                        flex: 1, padding: "10px 12px", borderRadius: 10,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                        display: "flex", flexDirection: "column", gap: 6,
                      }}>
                        <div style={{ fontSize: 20 }}>{item.icon}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: canBuild ? "rgba(255,200,60,0.6)" : "rgba(255,80,60,0.5)" }}>
                          {costLabel(item.cost)}
                        </div>
                        <button
                          onClick={() => canBuild && !isPending && onHarvest?.({ type: "queue_blueprint", blueprintType: item.type })}
                          disabled={!canBuild || isPending}
                          style={{
                            padding: "6px 0", borderRadius: 7, fontSize: 11,
                            background: canBuild && !isPending ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${canBuild && !isPending ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.06)"}`,
                            color: canBuild && !isPending ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.18)",
                            cursor: canBuild && !isPending ? "pointer" : "default",
                          }}>
                          {isPending ? "Queued ✓" : "Queue"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", lineHeight: 1.6 }}>
                Queued blueprints appear as ghosts on the home base map. Walk up and press [F] to build,
                or assign a survivor to the <em>Builder</em> workstation for auto-construction.
              </div>
            </div>
          );
        })()}

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
                  <SurvivorCard
                    key={sv.id}
                    survivor={sv}
                    onReassign={handleReassign}
                    onHeal={s.isHome ? (survivorId => onHarvest?.({ type: "heal", survivorId })) : null}
                    medicine={s.isHome ? (baseStorage.medicine ?? 0) : 0}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "turrets" && (
          <>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Placed Turrets
            </div>
            {turrets.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No turrets built yet.
                <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
                  Queue a turret blueprint from the Build tab, then head to the base map.
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {turrets.map((t, i) => (
                  <TurretCard
                    key={t.id ?? i}
                    turret={t}
                    onRepair={s.isHome ? (turretId => onHarvest?.({ type: "repair_turret", turretId })) : null}
                    scrap={s.isHome ? (baseStorage.scrap ?? 0) : 0}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* FIX 5: base storage tab — shows persistent stockpile separate from field inventory */}
        {tab === "storage" && (
          <div>
            {/* Header row with column labels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                🎒 Field Inventory
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                🏚 Base Stockpile
              </div>
            </div>

            {/* Per-resource rows */}
            {(() => {
              const allKeys = Array.from(new Set([
                ...Object.keys(RESOURCE_ICONS),
                ...Object.keys(baseStorage).filter(k => (baseStorage[k] ?? 0) > 0),
                ...Object.keys(inv).filter(k => (inv[k] ?? 0) > 0),
              ])).filter(k => k !== "turret_kit" && k !== "barricade_kit" && k !== "car_parts");
              const rows = allKeys.filter(k => (inv[k] ?? 0) > 0 || (baseStorage[k] ?? 0) > 0);

              if (rows.length === 0) {
                return (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                    Nothing to transfer yet.<br />
                    <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
                      Loot buildings to fill your field inventory. Assign survivors to workstations to fill the stockpile.
                    </span>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rows.map(key => {
                    const icon    = RESOURCE_ICONS[key] ?? "●";
                    const inField = Math.floor(inv[key] ?? 0);
                    const inBase  = Math.floor(baseStorage[key] ?? 0);
                    const canDeposit  = inField > 0;
                    const canWithdraw = inBase  > 0;

                    return (
                      <div key={key} style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 10,
                      }}>
                        {/* Field side */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{icon}</span>
                          <div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{key}</div>
                            <div style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>{inField}</div>
                          </div>
                        </div>

                        {/* Transfer arrows */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                          {/* Deposit: field → base */}
                          <button
                            disabled={!canDeposit}
                            onClick={() => onHarvest?.({ type: "deposit", key, amount: inField })}
                            title={`Deposit all ${key} to base`}
                            style={{
                              padding: "3px 10px",
                              background: canDeposit ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${canDeposit ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.06)"}`,
                              borderRadius: 6,
                              color: canDeposit ? "rgba(255,200,60,0.85)" : "rgba(255,255,255,0.12)",
                              fontSize: 11,
                              cursor: canDeposit ? "pointer" : "default",
                              whiteSpace: "nowrap",
                            }}>
                            deposit →
                          </button>
                          {/* Withdraw: base → field */}
                          <button
                            disabled={!canWithdraw}
                            onClick={() => onHarvest?.({ type: "withdraw", key, amount: inBase })}
                            title={`Withdraw all ${key} to field`}
                            style={{
                              padding: "3px 10px",
                              background: canWithdraw ? "rgba(120,200,255,0.08)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${canWithdraw ? "rgba(120,200,255,0.25)" : "rgba(255,255,255,0.06)"}`,
                              borderRadius: 6,
                              color: canWithdraw ? "rgba(120,200,255,0.8)" : "rgba(255,255,255,0.12)",
                              fontSize: 11,
                              cursor: canWithdraw ? "pointer" : "default",
                              whiteSpace: "nowrap",
                            }}>
                            ← withdraw
                          </button>
                        </div>

                        {/* Base side */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>stockpile</div>
                            <div style={{ fontSize: 17, color: inBase > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)", fontVariantNumeric: "tabular-nums" }}>{inBase}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Crafted items in base storage (turret kits, barricade kits, car parts) */}
            {(() => {
              const craftedKeys = ["turret_kit", "barricade_kit", "car_parts"].filter(k => (baseStorage[k] ?? 0) > 0 || (inv[k] ?? 0) > 0);
              if (craftedKeys.length === 0) return null;
              const craftIcons = { turret_kit: "🗼", barricade_kit: "🪵", car_parts: "🔩" };
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    Crafted items
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {craftedKeys.map(key => (
                      <div key={key} style={{
                        padding: "8px 14px",
                        background: "rgba(255,200,60,0.06)",
                        border: "1px solid rgba(255,200,60,0.18)",
                        borderRadius: 10,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 18 }}>{craftIcons[key] ?? "●"}</span>
                        <div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{key.replace("_", " ")}</div>
                          <div style={{ fontSize: 15, color: "rgba(255,200,60,0.9)", fontVariantNumeric: "tabular-nums" }}>
                            {Math.floor((baseStorage[key] ?? 0) + (inv[key] ?? 0))} total
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "garage" && (() => {
          const garage = worldState?.homeBase?.garage ?? [];
          const VEHICLE_ICONS = {
            monster_truck: "🚛",
            minivan:       "🚐",
            car:           "🚗",
            bike:          "🏍️",
          };
          const VEHICLE_LABELS = {
            monster_truck: "Monster Truck",
            minivan:       "Minivan",
            car:           "Car",
            bike:          "Bike",
          };
          if (garage.length === 0) {
            return (
              <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                Garage is empty.<br />
                <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
                  Vehicles you drive out of runs are automatically recovered here.
                </span>
              </div>
            );
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {garage.map((v, i) => {
                const icon     = VEHICLE_ICONS[v.vehicleType]  ?? "🚗";
                const label    = VEHICLE_LABELS[v.vehicleType] ?? v.vehicleType ?? "Vehicle";
                const hpPct    = Math.round((v.hp  / (v.maxHp  || v.hp  || 1)) * 100);
                const fuelPct  = Math.round((v.fuel / (v.maxFuel || v.fuel || 1)) * 100);
                const hpColor  = hpPct >= 70 ? "rgba(80,220,120,0.85)"
                               : hpPct >= 35 ? "rgba(255,200,60,0.85)"
                               : "rgba(255,80,80,0.85)";
                const fuelColor = fuelPct >= 40 ? "rgba(100,180,255,0.85)"
                                : fuelPct >= 15 ? "rgba(255,200,60,0.85)"
                                : "rgba(255,80,80,0.85)";
                return (
                  <div key={v.id ?? i} style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}>
                    {/* Icon */}
                    <span style={{ fontSize: 32, flexShrink: 0 }}>{icon}</span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>
                        {label}
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>
                          #{(v.id ?? "").slice(-4) || i + 1}
                        </span>
                      </div>
                      {/* HP bar */}
                      <div style={{ marginBottom: 5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>HP</span>
                          <span style={{ fontSize: 10, color: hpColor, fontVariantNumeric: "tabular-nums" }}>
                            {v.hp} / {v.maxHp ?? v.hp}
                          </span>
                        </div>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor, borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      {/* Fuel bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>FUEL</span>
                          <span style={{ fontSize: 10, color: fuelColor, fontVariantNumeric: "tabular-nums" }}>
                            {v.fuel} / {v.maxFuel ?? v.fuel}
                          </span>
                        </div>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${fuelPct}%`, height: "100%", background: fuelColor, borderRadius: 3, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    </div>

                    {/* Upgrades badge */}
                    {(v.upgrades ?? []).length > 0 && (
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {v.upgrades.map(u => (
                          <span key={u} style={{
                            fontSize: 10, padding: "2px 7px",
                            background: "rgba(255,200,60,0.1)",
                            border: "1px solid rgba(255,200,60,0.3)",
                            borderRadius: 6, color: "rgba(255,200,60,0.8)",
                            textTransform: "capitalize",
                          }}>{u}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {tab === "activity" && (
          <ActivityFeed events={activityLog} />
        )}

        {tab === "crafting" && (
          <CraftingTab
            baseStorage={baseStorage}
            onCraft={action => onHarvest?.(action)}
          />
        )}

        {tab === "map" && worldState && (
          <div style={{ margin: "-20px", position: "relative" }}>
            <WorldMap
              worldState={worldState}
              currentLevel={null}
              isPlaying={false}
              onDeploy={onDeploy}
              onMenu={onClose}
              worldEvents={worldEvents ?? []}
              onAddRoute={onAddRoute}
              onRemoveRoute={onRemoveRoute}
              onEnterHome={onEnterHome ?? onClose}
              embeddedMode={true}
            />
          </div>
        )}
      </div>

      {/* ── Crisis events panel ── */}
      <CrisisPanel crisisEvents={crisisEvents} onResolveCrisis={onResolveCrisis} baseStorage={baseStorage} />

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
            {/* Trait reminder */}
            {(reassignTarget.traits ?? []).length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
                {(reassignTarget.traits ?? []).map(tid => {
                  const t = SURVIVOR_TRAITS[tid];
                  if (!t) return null;
                  return (
                    <span key={tid} title={t.desc} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 5,
                      background: "rgba(255,255,255,0.04)", border: `1px solid ${t.color}44`,
                      color: t.color, cursor: "help",
                    }}>
                      {t.emoji} {t.label}
                    </span>
                  );
                })}
              </div>
            )}
            {(() => {
              const blocked = getBlockedCommands(reassignTarget);
              return [
                { cmd: "follow",    label: "Follow me" },
                { cmd: "stay_safe", label: "Stay & shelter" },
                { cmd: "fight",     label: "Guard this area" },
                { cmd: "assign",    label: "Work (crop/turret)" },
              ].map(({ cmd, label }) => {
                const isBlocked = blocked.includes(cmd);
                const blockTrait = isBlocked
                  ? (reassignTarget.traits ?? [])
                      .map(tid => SURVIVOR_TRAITS[tid])
                      .find(t => t && getBlockedCommands({ traits: [t.id] }).includes(cmd))
                  : null;
                return (
                  <button
                    key={cmd}
                    disabled={isBlocked}
                    onClick={() => !isBlocked && handleAssignCommand(cmd)}
                    title={isBlocked && blockTrait ? `Blocked by trait: ${blockTrait.label} — ${blockTrait.desc}` : undefined}
                    style={{
                      padding: "10px 14px",
                      background: isBlocked ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isBlocked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10,
                      color: isBlocked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                      fontSize: 13,
                      cursor: isBlocked ? "not-allowed" : "pointer",
                      textAlign: "left",
                      letterSpacing: "0.03em",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                    <span>{label}</span>
                    {isBlocked && blockTrait && (
                      <span style={{ fontSize: 10, color: blockTrait.color, opacity: 0.85 }}>
                        {blockTrait.emoji} Blocked
                      </span>
                    )}
                  </button>
                );
              });
            })()}
            <button
              onClick={() => {
                setWorkstationTarget(reassignTarget);
                setReassignTarget(null);
              }}
              style={{
                padding: "10px 14px",
                background: "rgba(255,200,60,0.06)",
                border: "1px solid rgba(255,200,60,0.2)",
                borderRadius: 10,
                color: "rgba(255,200,60,0.8)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                letterSpacing: "0.03em",
              }}>
              🏭 Assign to Workstation…
              {reassignTarget?.workstation && (
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>
                  (currently: {reassignTarget.workstation})
                </span>
              )}
            </button>
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

      {/* ── Workstation picker modal ── */}
      {workstationTarget && (
        <WorkstationPicker
          survivor={workstationTarget}
          builtStructures={s.builtStructures ?? []}
          onAssign={wsId => {
            onHarvest?.({ type: "assignWorkstation", survivorId: workstationTarget.id, workstation: wsId });
            setWorkstationTarget(null);
          }}
          onClose={() => setWorkstationTarget(null)}
        />
      )}

      {/* ── While-you-were-away overlay ── */}
      <AwayModal summary={awaySummary} onDismiss={onDismissAway} />
    </div>
  );
}