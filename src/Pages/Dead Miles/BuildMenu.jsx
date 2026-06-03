// src/Pages/DeadMiles/BuildMenu.jsx
// Build menu modal — extracted from GameView.jsx

import React from "react";
import { TURRET_COST } from "./deadMilesEngine";

export default function BuildMenu({ inventory, onClose, onSelectTurret, onSelectCropPlot, onSetHomebase, nearSettlement }) {
  const scrap = inventory.scrap ?? 0;
  const nails = inventory.nails ?? 0;
  const canTurret = scrap >= TURRET_COST.scrap && nails >= TURRET_COST.nails;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl overflow-hidden" style={{ width: 340, background: "rgba(8,9,12,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(180,255,120,0.85)" }}>🏗️ Build</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>
            G / Esc
          </button>
        </div>

        <div className="px-4 py-2 text-xs" style={{ color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          Resources: <span style={{ color: "rgba(255,200,80,0.8)" }}>🔩 {scrap} scrap</span>
          {" · "}<span style={{ color: "rgba(255,200,80,0.8)" }}>📌 {nails} nails</span>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          {/* Turret */}
          <button
            onClick={canTurret ? onSelectTurret : undefined}
            className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
            style={{
              background: canTurret ? "rgba(100,180,60,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${canTurret ? "rgba(180,255,120,0.35)" : "rgba(255,255,255,0.07)"}`,
              cursor: canTurret ? "pointer" : "not-allowed",
              opacity: canTurret ? 1 : 0.5,
            }}
          >
            <span className="text-2xl mt-0.5">🗼</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: canTurret ? "rgba(180,255,120,0.9)" : "rgba(255,255,255,0.4)" }}>
                Auto-Turret
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                Shoots nearby zombies automatically. Attracts more from range. Needs manual repair.
              </div>
              <div className="text-xs mt-1.5 flex gap-3">
                <span style={{ color: scrap >= TURRET_COST.scrap ? "rgba(180,255,120,0.7)" : "rgba(255,100,100,0.8)" }}>
                  🔩 {TURRET_COST.scrap} scrap ({scrap} have)
                </span>
                <span style={{ color: nails >= TURRET_COST.nails ? "rgba(180,255,120,0.7)" : "rgba(255,100,100,0.8)" }}>
                  📌 {TURRET_COST.nails} nails ({nails} have)
                </span>
              </div>
            </div>
          </button>

          {/* Crop plot */}
          <button
            onClick={onSelectCropPlot}
            className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
            style={{
              background: "rgba(60,120,30,0.1)",
              border: "1px solid rgba(100,180,60,0.35)",
              cursor: "pointer",
            }}
          >
            <span className="text-2xl mt-0.5">🌱</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: "rgba(120,210,80,0.9)" }}>
                Garden Plot
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                Place a new plot anywhere on open ground. Needs seeds to plant (F near plot).
              </div>
              <div className="text-xs mt-1.5" style={{ color: "rgba(120,210,80,0.55)" }}>
                Free to place
              </div>
            </div>
          </button>

          {/* Set as Homebase — only shown when near a settlement */}
          {nearSettlement && (
            <button
              onClick={onSetHomebase}
              className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
              style={{
                background: nearSettlement.isHome ? "rgba(255,200,80,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${nearSettlement.isHome ? "rgba(255,200,80,0.3)" : "rgba(255,255,255,0.1)"}`,
                cursor: nearSettlement.isHome ? "default" : "pointer",
              }}
            >
              <span className="text-2xl mt-0.5">🏠</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: nearSettlement.isHome ? "rgba(255,200,80,0.7)" : "rgba(255,255,255,0.7)" }}>
                  {nearSettlement.isHome ? `✓ ${nearSettlement.name} is your homebase` : `Set ${nearSettlement.name} as Homebase`}
                </div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {nearSettlement.isHome
                    ? "Base screen shows crops & survivors here."
                    : "Designates this settlement as your base of operations."}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}