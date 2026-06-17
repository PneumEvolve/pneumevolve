// BaseCommand.jsx — Command zone
// Survivors, storage transfer, activity feed, world map / deploy.
// Modals (reassign, workstation picker) are still managed in BaseView and passed as props.

import React, { useState } from "react";
import { SURVIVOR_TRAITS, WORKSTATION_OUTPUT, SURVIVOR_MORALE_LOW_THRESHOLD, SURVIVOR_MORALE_CRIT_THRESHOLD } from "./deadMilesEngine";
import WorldMap from "./WorldMap";
import Section from "./Section";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAgo(ms) {
  if (!ms) return "";
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const RESOURCE_ICONS = {
  food: "🌽", water: "💧", wood: "🪵",
  scrap: "⚙️", nails: "📌", seeds: "🌱", fuel: "⛽",
};

const ROLE_COLOR = {
  farmer:   "rgba(120,210,80,0.9)",
  guard:    "rgba(255,100,80,0.9)",
  medic:    "rgba(80,180,255,0.9)",
  engineer: "rgba(255,200,60,0.9)",
};

// ─── SurvivorCard ─────────────────────────────────────────────────────────────

function SurvivorCard({ survivor, onReassign, onHeal, medicine }) {
  const [expanded, setExpanded] = useState(false);
  const roleColor  = ROLE_COLOR[survivor.role] ?? "rgba(255,255,255,0.6)";
  const taskLabel  = survivor.workstation
    ? `🏭 ${survivor.workstation.replace("_", " ")}`
    : survivor.assignedTo
    ? `Assigned → ${survivor.assignedTo.structureType}`
    : survivor.command === "follow"     ? "Following you"
    : survivor.command === "stay_safe"  ? "Sheltering"
    : survivor.command === "fight"      ? "On guard"
    : "Idle";

  const level  = survivor.level ?? 1;
  const xp     = survivor.xp   ?? 0;
  const xpNext = level * 100;
  const xpPct  = Math.min(1, xp / xpNext);

  const morale     = survivor.morale ?? 100;
  const moraleLow  = morale < SURVIVOR_MORALE_LOW_THRESHOLD;
  const moraleCrit = morale < SURVIVOR_MORALE_CRIT_THRESHOLD;
  const moraleColor= moraleCrit ? "rgba(255,60,60,0.85)" : moraleLow ? "rgba(255,160,40,0.85)" : "rgba(120,210,80,0.7)";

  const traits = (survivor.traits ?? []).map(tid => SURVIVOR_TRAITS[tid]).filter(Boolean);

  return (
    <div style={{
      background:   moraleCrit ? "rgba(255,40,40,0.04)" : "rgba(255,255,255,0.03)",
      border:       `1px solid ${moraleCrit ? "rgba(255,60,60,0.25)" : moraleLow ? "rgba(255,160,40,0.18)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12,
      padding:      "12px 14px",
      display:      "flex",
      flexDirection:"column",
      gap:          8,
      transition:   "border-color 0.3s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{survivor.name}</span>
            {level > 1 && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                padding: "1px 5px", borderRadius: 4,
                background: "rgba(255,200,60,0.12)", border: "1px solid rgba(255,200,60,0.25)",
                color: "rgba(255,200,60,0.85)",
              }}>Lv{level}</span>
            )}
            {(survivor.hunger ?? 0) > 0 && (
              <span style={{ fontSize: 10, color: "rgba(255,140,40,0.9)" }} title="Hungry">🍽</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: roleColor, textTransform: "capitalize", marginTop: 1 }}>{survivor.role}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{taskLabel}</div>
          {survivor.workstation && WORKSTATION_OUTPUT?.[survivor.workstation] && (() => {
            const rates   = WORKSTATION_OUTPUT[survivor.workstation];
            const entries = Object.entries(rates).filter(([, r]) => r > 0);
            if (!entries.length) return null;
            const ICONS = { food: "🌽", scrap: "⚙️", seeds: "🌱", nails: "📌", water: "💧", medicine: "💊" };
            return (
              <div style={{ fontSize: 10, color: "rgba(120,210,80,0.7)", marginTop: 2 }}>
                {entries.map(([res, rps]) => `${ICONS[res] ?? "●"} +${(rps * 3600).toFixed(0)}/hr`).join(" · ")}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Traits */}
      {traits.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {traits.map(trait => (
            <span key={trait.id} title={trait.desc} style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 5,
              background: "rgba(255,255,255,0.04)", border: `1px solid ${trait.color}44`,
              color: trait.color, cursor: "help", letterSpacing: "0.03em",
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
            width: `${(survivor.hp / survivor.maxHp) * 100}%`, height: "100%",
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
            width: `${Math.max(0, Math.min(100, morale))}%`, height: "100%",
            background: moraleColor, borderRadius: 2,
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
          <div style={{ width: `${xpPct * 100}%`, height: "100%", background: "rgba(255,200,60,0.5)", borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontVariantNumeric: "tabular-nums", width: 36, textAlign: "right" }}>
          {xp}/{xpNext}
        </span>
      </div>

      {/* Morale warning */}
      {moraleCrit && (
        <div style={{
          fontSize: 11, color: "rgba(255,80,60,0.9)",
          background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.2)",
          borderRadius: 6, padding: "4px 8px",
        }}>
          ⚠ Rock bottom — may leave soon
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onReassign(survivor)}
          style={{
            flex: 1, padding: "5px 0",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", letterSpacing: "0.04em",
          }}>
          Reassign…
        </button>
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
              fontSize: 11, cursor: (medicine ?? 0) >= 2 ? "pointer" : "default",
              letterSpacing: "0.03em", whiteSpace: "nowrap",
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
            fontSize: 11, cursor: "pointer",
          }}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded: backstory + story log */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {survivor.backstory && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, fontStyle: "italic" }}>
              "{survivor.backstory}"
            </div>
          )}
          {(survivor.storyLog ?? []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Story</div>
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

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

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
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "6px 0", borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          opacity: 1 - i * 0.07,
        }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", flex: 1 }}>{ev.text}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 12, flexShrink: 0 }}>{fmtAgo(ev.ts)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── StoragePanel ─────────────────────────────────────────────────────────────
// At homebase, player.inventory === baseStorage (same object, aliased in GameView).
// So we just show the unified stockpile — no deposit/withdraw needed.
// On an away-run peek (isHome=false), we show the field ↔ stockpile transfer UI.

function StoragePanel({ baseStorage, inv, onHarvest, isHome }) {
  const DISPLAY_KEYS = [
    "food","water","scrap","wood","nails","seeds","fuel","medicine","ammo","tools","car_parts","bat",
  ];
  const RESOURCE_ICONS_ALL = {
    food: "🌽", water: "💧", wood: "🪵", scrap: "⚙️", nails: "📌",
    seeds: "🌱", fuel: "⛽", medicine: "💊", ammo: "🔫", tools: "🛠",
    car_parts: "🔩", bat: "🪓",
  };

  // At homebase: show the one unified pile (baseStorage is the pile)
  if (isHome) {
    const rows = DISPLAY_KEYS.filter(k => (baseStorage[k] ?? 0) > 0);
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
          Stockpile is empty.<br />
          <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
            Go on a run to bring back supplies.
          </span>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
          🏚 Base Stockpile
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {rows.map(key => (
            <div key={key} style={{
              padding: "8px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              display: "flex", alignItems: "center", gap: 8, minWidth: 90,
            }}>
              <span style={{ fontSize: 18 }}>{RESOURCE_ICONS_ALL[key] ?? "●"}</span>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "capitalize" }}>{key.replace("_"," ")}</div>
                <div style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>
                  {Math.floor(baseStorage[key] ?? 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Away-run peek: show field ↔ stockpile transfer UI
  const allKeys = Array.from(new Set([
    ...Object.keys(RESOURCE_ICONS_ALL),
    ...Object.keys(baseStorage).filter(k => (baseStorage[k] ?? 0) > 0),
    ...Object.keys(inv).filter(k => (inv[k] ?? 0) > 0),
  ]));
  const rows = allKeys.filter(k => (inv[k] ?? 0) > 0 || (baseStorage[k] ?? 0) > 0);

  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
        Nothing to transfer yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🎒 Field</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🏚 Stockpile</div>
      </div>
      {rows.map(key => {
        const icon       = RESOURCE_ICONS_ALL[key] ?? "●";
        const inField    = Math.floor(inv[key] ?? 0);
        const inBase     = Math.floor(baseStorage[key] ?? 0);
        const canDeposit = inField > 0;
        const canWithdraw= inBase  > 0;
        return (
          <div key={key} style={{
            display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8,
            padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{key}</div>
                <div style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>{inField}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <button disabled={!canDeposit} onClick={() => onHarvest?.({ type: "deposit", key, amount: inField })}
                style={{ padding: "3px 10px", background: canDeposit ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${canDeposit ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 6, color: canDeposit ? "rgba(255,200,60,0.85)" : "rgba(255,255,255,0.12)", fontSize: 11, cursor: canDeposit ? "pointer" : "default", whiteSpace: "nowrap" }}>
                deposit →
              </button>
              <button disabled={!canWithdraw} onClick={() => onHarvest?.({ type: "withdraw", key, amount: inBase })}
                style={{ padding: "3px 10px", background: canWithdraw ? "rgba(120,200,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${canWithdraw ? "rgba(120,200,255,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: 6, color: canWithdraw ? "rgba(120,200,255,0.8)" : "rgba(255,255,255,0.12)", fontSize: 11, cursor: canWithdraw ? "pointer" : "default", whiteSpace: "nowrap" }}>
                ← withdraw
              </button>
            </div>
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
}

// ─── BaseCommand ──────────────────────────────────────────────────────────────

export default function BaseCommand({
  snapshot,
  baseStorage,
  activityLog,
  worldState,
  worldEvents,
  onHarvest,
  onDeploy,
  onAddRoute,
  onRemoveRoute,
  onEnterHome,
  onClose,
  onReassign,
  onWorkstationAssign,
}) {
  const [subTab, setSubTab] = useState("survivors");

  const survivors = snapshot?.survivors ?? [];
  const inv       = snapshot?.player?.inventory ?? {};
  const isHome    = snapshot?.isHome ?? false;
  const medicine  = isHome ? (baseStorage?.medicine ?? 0) : 0;

  const SUB_TABS = [
    { id: "survivors", label: `👥 Survivors (${survivors.length})` },
    { id: "storage",   label: "📦 Storage" },
    { id: "activity",  label: "📋 Activity" },
    ...(worldState ? [{ id: "map", label: "🗺️ Deploy" }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, flexShrink: 0 }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "6px 12px",
              background: subTab === t.id ? "rgba(255,200,80,0.1)" : "transparent",
              border: "none",
              borderBottom: subTab === t.id ? "2px solid rgba(255,200,80,0.7)" : "2px solid transparent",
              color: subTab === t.id ? "rgba(255,200,80,0.9)" : "rgba(255,255,255,0.35)",
              fontSize: 11, cursor: "pointer", letterSpacing: "0.04em",
              transition: "color 0.15s, border-color 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Survivors */}
      {subTab === "survivors" && (
        survivors.length === 0 ? (
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
                onReassign={onReassign}
                onHeal={isHome ? (id => onHarvest?.({ type: "heal", survivorId: id })) : null}
                medicine={medicine}
              />
            ))}
          </div>
        )
      )}

      {/* Storage */}
      {subTab === "storage" && (
        <StoragePanel baseStorage={baseStorage} inv={inv} onHarvest={onHarvest} isHome={isHome} />
      )}

      {/* Activity */}
      {subTab === "activity" && (
        <ActivityFeed events={activityLog} />
      )}

      {/* Deploy / Map */}
      {subTab === "map" && worldState && (
        <div style={{ margin: "-20px", position: "relative", flex: 1 }}>
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
  );
}