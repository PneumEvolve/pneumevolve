// src/Pages/DeadMiles/BuildMenu.jsx
// Build menu modal — includes turret, crop plot, and base upgrades (home only)

import React from "react";
import { TURRET_COST, BASE_UPGRADE_TREE, WORKSTATION_DEFS, WORKSHOP_BLUEPRINT_COSTS } from "./deadMilesEngine";

export default function BuildMenu({
  inventory,
  homeBase,
  isHomeBase,
  onClose,
  onSelectTurret,
  onSelectCropPlot,
  onSetHomebase,
  nearSettlement,
  onUpgradeBase,
  onQueueBlueprint,
}) {
  const scrap = inventory.scrap ?? 0;
  const nails = inventory.nails ?? 0;
  const canTurret = scrap >= TURRET_COST.scrap && nails >= TURRET_COST.nails;

  const builtUpgrades = homeBase?.upgrades ?? [];
  const baseStorage = homeBase?.baseStorage ?? {};
  const builtStructures = homeBase?.builtStructures ?? [];
  const pendingBlueprints = homeBase?.blueprints ?? [];

  // Can the player afford a blueprint cost from baseStorage?
  function canAfford(cost) {
    return Object.entries(cost).every(([k, v]) => (baseStorage[k] ?? 0) >= v);
  }
  function costLabel(cost) {
    return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(" · ");
  }

  // Workshop structures that are placeable
  const BUILDABLE = WORKSTATION_DEFS.filter(ws => ws.buildable);

  // Helper: check if a tree upgrade is available to build
  const isUpgradeAvailable = (upgrade) => {
    if (builtUpgrades.includes(upgrade.id)) return false;
    if (upgrade.requires && !builtUpgrades.includes(upgrade.requires)) return false;
    return Object.entries(upgrade.cost).every(([res, qty]) => (baseStorage[res] ?? 0) >= qty);
  };

  // Filter upgrades that are available (not built, prerequisites met, can afford)
  const availableUpgrades = Object.values(BASE_UPGRADE_TREE).filter(isUpgradeAvailable);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl flex flex-col" style={{ width: 340, maxHeight: "85vh", background: "rgba(8,9,12,0.97)", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(180,255,120,0.85)" }}>🏗️ Build</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>
            G / Esc
          </button>
        </div>

        <div className="px-4 py-2 text-xs" style={{ color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          Inventory: <span style={{ color: "rgba(255,200,80,0.8)" }}>🔩 {scrap}</span>
          {" · "}<span style={{ color: "rgba(255,200,80,0.8)" }}>📌 {nails}</span>
          {isHomeBase && (
            <>
              {" · "}<span style={{ color: "rgba(255,200,80,0.8)" }}>🪵 {baseStorage.wood ?? 0} wood</span>
              {" · "}<span style={{ color: "rgba(255,200,80,0.8)" }}>🌱 {baseStorage.seeds ?? 0} seeds</span>
            </>
          )}
        </div>

        <div className="px-4 py-4 flex flex-col gap-3" style={{ overflowY: "auto", overflowX: "hidden" }}>
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

          {/* Workshop structures — only on home base */}
          {isHomeBase && (
            <div>
              <div className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                🏭 Structures
              </div>
              <div className="flex flex-col gap-2">
                {BUILDABLE.map(ws => {
                  const cost = WORKSHOP_BLUEPRINT_COSTS[ws.id];
                  const isBuilt = builtStructures.some(st => st.type === ws.id);
                  const isPending = pendingBlueprints.some(bp => bp.type === ws.id);
                  const affordable = !isBuilt && !isPending && canAfford(cost);

                  return (
                    <button
                      key={ws.id}
                      onClick={affordable ? () => { onQueueBlueprint?.(ws.id); onClose(); } : undefined}
                      className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
                      style={{
                        background: isBuilt
                          ? "rgba(80,220,120,0.06)"
                          : isPending
                          ? "rgba(255,200,80,0.06)"
                          : affordable
                          ? "rgba(255,160,60,0.08)"
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isBuilt ? "rgba(80,220,120,0.25)" : isPending ? "rgba(255,200,80,0.25)" : affordable ? "rgba(255,160,60,0.3)" : "rgba(255,255,255,0.07)"}`,
                        cursor: affordable ? "pointer" : "default",
                        opacity: isBuilt ? 0.6 : 1,
                      }}
                    >
                      <span className="text-2xl mt-0.5">{ws.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2" style={{ color: isBuilt ? "rgba(80,220,120,0.8)" : isPending ? "rgba(255,200,80,0.8)" : affordable ? "rgba(255,160,60,0.9)" : "rgba(255,255,255,0.4)" }}>
                          {ws.label}
                          {isBuilt && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(80,220,120,0.1)", border: "1px solid rgba(80,220,120,0.2)", color: "rgba(80,220,120,0.8)" }}>BUILT</span>}
                          {isPending && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,200,80,0.1)", border: "1px solid rgba(255,200,80,0.2)", color: "rgba(255,200,80,0.8)" }}>QUEUED</span>}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{ws.desc}</div>
                        {!isBuilt && !isPending && cost && (
                          <div className="text-xs mt-1.5" style={{ color: affordable ? "rgba(255,160,60,0.7)" : "rgba(255,100,100,0.7)" }}>
                            {costLabel(cost)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}


          {isHomeBase && availableUpgrades.length > 0 && (
            <div className="mt-2">
              <div className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                🏛️ Base Upgrades
              </div>
              <div className="flex flex-col gap-2">
                {availableUpgrades.map(upgrade => {
                  const costStr = Object.entries(upgrade.cost)
                    .map(([r, q]) => `${q} ${r}`)
                    .join(", ");
                  return (
                    <button
                      key={upgrade.id}
                      onClick={() => onUpgradeBase?.(upgrade.id)}
                      className="flex items-start gap-3 p-3 rounded-xl text-left w-full"
                      style={{
                        background: "rgba(200,160,80,0.1)",
                        border: "1px solid rgba(200,160,80,0.35)",
                        cursor: "pointer",
                      }}
                    >
                      <span className="text-2xl mt-0.5">{upgrade.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "rgba(220,180,100,0.9)" }}>
                          {upgrade.label}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {upgrade.desc}
                        </div>
                        <div className="text-xs mt-1.5" style={{ color: "rgba(255,200,80,0.7)" }}>
                          {costStr}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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