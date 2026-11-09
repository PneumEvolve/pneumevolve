// src/Pages/rootwork/components/ModifierPickModal.jsx — pick this season's modifier
// Shown right after prestige (Season 4+), before the farm/barn unlock and farmer placement.

import React, { useState } from "react";
import { SEASON_MODIFIERS, MODIFIER_REROLL_COST, canRerollSeasonModifiers, getSeals } from "../gameEngine";

export default function ModifierPickModal({ game, onPick, onReroll }) {
  const [selected, setSelected] = useState(null);
  const choices = (game.modifierChoices ?? []).map((id) => SEASON_MODIFIERS[id]).filter(Boolean);
  const canReroll = canRerollSeasonModifiers(game);
  const seals = getSeals(game);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="card p-6 w-full max-w-sm" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, textAlign: "center", marginBottom: "0.25rem" }}>🎴 Season {game.season} Conditions</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginBottom: "1rem" }}>
          Pick one. It lasts the whole season. Every option has an upside and a downside.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {choices.map((mod) => {
            const isSel = selected === mod.id;
            return (
              <button key={mod.id} onClick={() => setSelected(mod.id)} style={{
                textAlign: "left", padding: "0.7rem 0.8rem", borderRadius: "10px", cursor: "pointer",
                background: isSel ? "rgba(99,102,241,0.15)" : "var(--bg)",
                border: `2px solid ${isSel ? "var(--accent)" : mod.hard ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                color: "var(--text)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{mod.emoji} {mod.name}</span>
                  {mod.hard && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", borderRadius: "999px", padding: "0.1rem 0.4rem" }}>
                      ⚠️ HARD
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#4ade80", marginTop: "0.3rem" }}>▲ {mod.upside}</div>
                <div style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "0.1rem" }}>▼ {mod.downside}</div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => selected && onPick(selected)}
          disabled={!selected}
          className="btn w-full"
          style={{ marginTop: "1rem", fontSize: "0.85rem", padding: "0.65rem", opacity: selected ? 1 : 0.5 }}>
          {selected ? `Start the season with ${SEASON_MODIFIERS[selected]?.name}` : "Pick a condition"}
        </button>

        <button
          onClick={() => { setSelected(null); onReroll(); }}
          disabled={!canReroll}
          className="btn btn-secondary w-full"
          style={{ marginTop: "0.5rem", fontSize: "0.72rem", padding: "0.45rem", opacity: canReroll ? 1 : 0.5 }}>
          🎲 Reroll all three · 🏅 {MODIFIER_REROLL_COST} {canReroll ? "" : `(you have ${seals})`}
        </button>
      </div>
    </div>
  );
}