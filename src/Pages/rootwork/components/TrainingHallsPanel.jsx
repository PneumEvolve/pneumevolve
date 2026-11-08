// src/Pages/rootwork/components/TrainingHallsPanel.jsx
// Training Halls + Roster Blueprint UI.
//   <TrainingSection type="farm" ... />  — drops into any hall card
//   <CrewRosterCard ... />               — "Rebuy whole crew" summary at the top of Town

import React, { useState } from "react";
import { SPECIALIZATIONS } from "../gameConstants";
import {
  TRAINING_HALLS, TRAINING_TYPE_ORDER,
  getTrainingLevel, getTrainingMaxLevel, getTrainingTierInfo, getTrainingCost,
  canBuyTrainingLevel, getTrainingHallAccess, getFarmTrainingSpec, getRosterStatus,
} from "../gameEngine";

function fmt(n) { return Math.floor(n).toLocaleString(); }

const MAT_NAMES = {
  iron_ore: "Iron Ore", lumber: "Lumber",
  iron_fitting: "Iron Fitting", reinforced_crate: "Reinforced Crate", fine_tools: "Fine Tools",
};

function have(game, key) {
  return (game.worldResources?.[key] ?? 0) + (game.forgeGoods?.[key] ?? 0);
}

function CostLine({ game, cost }) {
  if (!cost) return null;
  const cash = game.cash ?? 0;
  return (
    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.3rem" }}>
      <span style={{ color: cash >= cost.cash ? "var(--muted)" : "#ef4444" }}>${fmt(cost.cash)}</span>
      {Object.entries(cost.requires ?? {}).map(([k, v]) => (
        <span key={k} style={{ marginLeft: "0.45rem", color: have(game, k) >= v ? "var(--muted)" : "#ef4444" }}>
          {fmt(v)} {MAT_NAMES[k] ?? k}
        </span>
      ))}
    </div>
  );
}

// ─── Per-hall training + rebuy section ────────────────────────────────────────

export function TrainingSection({ game, type, onBuyTraining, onRebuyRoster, onSetFarmTrainingSpec, showDivider = true }) {
  const def = TRAINING_HALLS[type];
  if (!def) return null;
  const level = getTrainingLevel(game, type);
  const max = getTrainingMaxLevel(type);
  const tiers = getTrainingTierInfo(game, type);
  const access = getTrainingHallAccess(game, type);
  const nextCost = level < max ? getTrainingCost(type, level) : null;
  const buyCheck = canBuyTrainingLevel(game, type);
  const nextTier = level < max ? tiers[level] : null;
  const roster = getRosterStatus(game, type);
  const farmSpec = type === "farm" ? getFarmTrainingSpec(game) : null;

  const missing = roster ? Math.max(0, roster.want - roster.have) : 0;

  return (
    <div style={{
      marginTop: showDivider ? "0.7rem" : 0,
      paddingTop: showDivider ? "0.6rem" : 0,
      borderTop: showDivider ? "1px solid var(--border)" : "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>🎓 Training</span>
        <span style={{
          fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 999,
          background: level >= max ? "rgba(74,222,128,0.15)" : "rgba(167,139,250,0.15)",
          border: `1px solid ${level >= max ? "#4ade80" : "#a78bfa"}`,
          color: level >= max ? "#4ade80" : "#a78bfa",
        }}>
          Level {level}/{max}
        </span>
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.4rem", lineHeight: 1.5 }}>
        New {def.noun}s arrive with every upgrade below already done — no taps, no cost.
      </div>

      {/* Tier ladder */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.45rem" }}>
        {tiers.map((t) => (
          <div key={t.level} style={{
            display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem",
            padding: "0.25rem 0.45rem", borderRadius: 6,
            background: t.owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
            border: `1px solid ${t.owned ? "rgba(74,222,128,0.35)" : "var(--border)"}`,
            opacity: t.owned || t.level === level + 1 ? 1 : 0.55,
          }}>
            <span style={{ width: 16, fontWeight: 700, color: t.owned ? "#4ade80" : "var(--muted)" }}>{t.owned ? "✓" : t.level}</span>
            <span style={{ flex: 1, color: t.owned ? "var(--text)" : "var(--muted)" }}>{t.labels.join(" + ")}</span>
            {!t.owned && t.missingResearch.length > 0 && (
              <span style={{ fontSize: "0.6rem", color: "#f59e0b" }}>📚 {t.missingResearch.join(", ")}</span>
            )}
          </div>
        ))}
      </div>

      {/* Farm: which specialization trained farmers get */}
      {type === "farm" && level >= 3 && (
        <div style={{ marginBottom: "0.45rem" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            New farmers specialize as:
          </div>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {Object.values(SPECIALIZATIONS).filter((s) => s.id !== "none").map((s) => {
              const active = farmSpec === s.id;
              return (
                <button key={s.id} onClick={() => !active && onSetFarmTrainingSpec?.(s.id)} style={{
                  flex: 1, fontSize: "0.65rem", padding: "0.3rem 0.2rem", borderRadius: 6, cursor: active ? "default" : "pointer",
                  background: active ? "rgba(74,222,128,0.12)" : "var(--bg)",
                  border: `1px solid ${active ? "#4ade80" : "var(--border)"}`,
                  color: active ? "#4ade80" : "var(--text)", fontWeight: active ? 700 : 500,
                }}>
                  {s.emoji} {s.name}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.2rem" }}>
            Roster rebuys keep each farmer's specialization from last season.
          </div>
        </div>
      )}

      {/* Next training level */}
      {!access.ok ? (
        <div style={{ fontSize: "0.7rem", color: "#f59e0b" }}>🔒 {access.reason}</div>
      ) : nextTier ? (
        <>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Level {level + 1}: <strong style={{ color: "var(--text)" }}>{nextTier.labels.join(" + ")}</strong>
          </div>
          <CostLine game={game} cost={nextCost} />
          <button
            onClick={() => onBuyTraining?.(type)}
            disabled={!buyCheck.ok}
            className="btn w-full"
            style={{ marginTop: "0.4rem", opacity: buyCheck.ok ? 1 : 0.5, fontSize: "0.75rem" }}
          >
            {level === 0 ? `Start ${def.noun} training` : `Train to Level ${level + 1}`} — ${fmt(nextCost?.cash ?? 0)}
          </button>
          {!buyCheck.ok && buyCheck.reason && (
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.2rem", textAlign: "center" }}>{buyCheck.reason}</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: "0.72rem", color: "#4ade80" }}>✓ Fully trained — every new {def.noun} arrives maxed</div>
      )}

      {/* Roster blueprint */}
      <div style={{
        marginTop: "0.55rem", padding: "0.45rem 0.55rem", borderRadius: 8,
        background: "var(--bg)", border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
          <span style={{ fontWeight: 600 }}>📋 Roster</span>
          <span style={{ color: "var(--muted)" }}>
            {!roster ? "no blueprint yet"
              : roster.want === 0 ? `none last season`
              : <><strong style={{ color: missing === 0 ? "#4ade80" : "var(--text)" }}>{roster.have}</strong> / {roster.want} {def.noun}s</>}
          </span>
        </div>
        {roster && roster.want > 0 && (
          <button
            onClick={() => onRebuyRoster?.(type)}
            disabled={missing === 0}
            className="btn btn-secondary w-full"
            style={{ marginTop: "0.35rem", fontSize: "0.72rem", padding: "0.35rem", opacity: missing === 0 ? 0.5 : 1 }}
          >
            {missing === 0 ? "✓ Roster complete" : `🔁 Rebuy ${missing} ${def.noun}${missing !== 1 ? "s" : ""}`}
          </button>
        )}
        {!roster && (
          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.2rem" }}>
            Your crew is saved automatically when a new season starts.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Whole-crew card (top of Town) ────────────────────────────────────────────

export function CrewRosterCard({ game, onRebuyAll, onSaveRosterBlueprint }) {
  const [confirmSave, setConfirmSave] = useState(false);
  const snap = game.lastRoster;
  const rows = TRAINING_TYPE_ORDER
    .map((t) => ({ t, def: TRAINING_HALLS[t], st: getRosterStatus(game, t), lvl: getTrainingLevel(game, t), max: getTrainingMaxLevel(t) }))
    .filter((r) => r.st && r.st.want > 0);
  const totalWant = rows.reduce((s, r) => s + r.st.want, 0);
  const totalHave = rows.reduce((s, r) => s + r.st.have, 0);
  const missing = totalWant - totalHave;

  return (
    <div className="card p-4" style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>👷 Season Crew</span>
        {snap && (
          <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
            blueprint from season {snap.season}
          </span>
        )}
      </div>

      {!snap ? (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>
          When you start a new season, the crew you ended with is saved here so you can rehire all of them in one tap.
          Training Halls make them arrive already upgraded.
        </div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Your blueprint has no workers in it.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.35rem", marginBottom: "0.5rem" }}>
            {rows.map(({ t, def, st, lvl, max }) => (
              <div key={t} style={{ background: "var(--bg)", borderRadius: 8, padding: "0.35rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.9rem" }}>{def.emoji}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: st.have >= st.want ? "#4ade80" : "var(--text)" }}>
                  {st.have}/{st.want}
                </div>
                <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>🎓 {lvl}/{max}</div>
              </div>
            ))}
          </div>
          <button
            onClick={onRebuyAll}
            disabled={missing === 0}
            className="btn w-full"
            style={{ opacity: missing === 0 ? 0.5 : 1, fontSize: "0.8rem" }}
          >
            {missing === 0 ? "✓ Crew complete" : `🔁 Rebuy whole crew (${missing} worker${missing !== 1 ? "s" : ""})`}
          </button>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.25rem", textAlign: "center" }}>
            Pays normal hire costs · restores recipes, standing orders and bait · stops if the town is full
          </div>
        </>
      )}

      <button
        onClick={() => {
          if (!confirmSave) { setConfirmSave(true); return; }
          setConfirmSave(false);
          onSaveRosterBlueprint?.();
        }}
        className="btn btn-secondary w-full"
        style={{ marginTop: "0.5rem", fontSize: "0.68rem", padding: "0.3rem" }}
      >
        {confirmSave ? "Tap again — replace blueprint with current crew" : "📋 Save current crew as blueprint"}
      </button>
    </div>
  );
}