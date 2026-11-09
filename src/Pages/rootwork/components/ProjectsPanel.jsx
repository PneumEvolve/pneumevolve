// src/Pages/rootwork/components/ProjectsPanel.jsx — Town Projects (Town → Projects tab)

import React from "react";
import { PROJECT_ORDER, getProjectView } from "../gameEngine";

function fmt(n) {
  const v = Math.floor(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`;
  return `${v}`;
}

function pctLabel(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

function ProjectCard({ view, onDeposit }) {
  const { def, stage, unlocked, inputs, pct, currentBonus, nextBonus, canDepositAny } = view;

  if (!unlocked) {
    return (
      <div className="card p-4" style={{ marginBottom: "0.75rem", opacity: 0.55 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>🔒</span>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{def.emoji} {def.name}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{def.unlockText}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              Each stage: +{pctLabel(def.bonusPerStage)} {def.bonusLabel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4" style={{ marginBottom: "0.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{def.emoji} {def.name}</div>
          <div style={{ fontSize: "0.66rem", color: "var(--muted)", fontStyle: "italic", marginTop: "0.1rem" }}>{def.flavor}</div>
        </div>
        <span style={{
          flexShrink: 0, fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px",
          background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa",
        }}>
          Stage {stage + 1}
        </span>
      </div>

      {/* Bonus line */}
      <div style={{ fontSize: "0.72rem", marginTop: "0.5rem", display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <span style={{ color: currentBonus > 0 ? "#4ade80" : "var(--muted)" }}>
          Now: {currentBonus > 0 ? `+${pctLabel(currentBonus)}` : "—"} {def.bonusLabel}
        </span>
        <span style={{ color: "var(--muted)" }}>Next: +{pctLabel(nextBonus)}</span>
      </div>

      {/* Stage progress bar */}
      <div style={{ marginTop: "0.45rem", height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(100, pct * 100)}%`, borderRadius: "999px",
          background: pct >= 1 ? "#4ade80" : "#a78bfa", transition: "width 0.3s ease",
        }} />
      </div>
      <div style={{ fontSize: "0.62rem", color: "var(--muted)", textAlign: "right", marginTop: "0.15rem" }}>
        Stage {stage + 1} · {pctLabel(pct)} built
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.4rem" }}>
        {inputs.map((input) => {
          const fill = input.need > 0 ? input.deposited / input.need : 0;
          const canAdd = !input.done && input.have > 0;
          const addAmount = Math.min(input.have, input.remaining);
          return (
            <div key={input.key} style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.35rem 0.5rem", borderRadius: "7px",
              background: input.done ? "rgba(74,222,128,0.08)" : "var(--bg)",
              border: `1px solid ${input.done ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
            }}>
              <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{input.done ? "✅" : input.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
                  <span style={{ fontWeight: 600 }}>{input.name}</span>
                  <span style={{ color: input.done ? "#4ade80" : "var(--text)" }}>
                    {fmt(input.deposited)} / {fmt(input.need)}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginTop: "0.2rem" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, fill * 100)}%`, background: input.done ? "#4ade80" : "#60a5fa" }} />
                </div>
                {!input.done && (
                  <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                    You have {fmt(input.have)}
                  </div>
                )}
              </div>
              {!input.done && (
                <button
                  onClick={() => onDeposit(def.id, input.key)}
                  disabled={!canAdd}
                  className="btn"
                  style={{
                    flexShrink: 0, fontSize: "0.65rem", padding: "0.25rem 0.5rem", minWidth: "3.6rem",
                    opacity: canAdd ? 1 : 0.4,
                  }}>
                  {canAdd ? `+${fmt(addAmount)}` : "—"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onDeposit(def.id, null)}
        disabled={!canDepositAny}
        className="btn w-full"
        style={{ marginTop: "0.6rem", fontSize: "0.78rem", padding: "0.5rem", opacity: canDepositAny ? 1 : 0.5 }}>
        {canDepositAny ? "Deposit everything I can" : "Nothing to deposit yet"}
      </button>
    </div>
  );
}

export default function ProjectsPanel({ game, onDeposit }) {
  const views = PROJECT_ORDER.map((id) => getProjectView(game, id)).filter(Boolean);
  const unlockedCount = views.filter((v) => v.unlocked).length;

  return (
    <div>
      <div className="card p-4" style={{ marginBottom: "0.75rem", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>🏗️ Town Projects</div>
        Big builds that never reset. Chip in whenever you have spare goods — progress is saved, and every
        finished stage is a permanent bonus that carries through every new season. Each stage costs 1.5× the last.
        {unlockedCount === 0 && (
          <div style={{ marginTop: "0.35rem", color: "#f59e0b" }}>
            No projects unlocked yet — the first one opens with your tomato farm.
          </div>
        )}
      </div>
      {views.map((view) => (
        <ProjectCard key={view.def.id} view={view} onDeposit={onDeposit} />
      ))}
    </div>
  );
}