// src/Pages/DeadMiles/UpgradeMenu.jsx
// Upgrade selection modal for home base

import React from "react";
import { BASE_UPGRADE_TREE } from "./deadMilesEngine";

export default function UpgradeMenu({ homeBase, totalResources, onSelect, onClose }) {
  const builtUpgrades = homeBase?.upgrades ?? [];

  // Group upgrades by chain
  const foodChain = ["kitchen", "smokehouse", "preservation_lab"];
  const militaryChain = ["workshop", "armory"];

  const renderUpgrade = (upgradeId) => {
    const upgrade = BASE_UPGRADE_TREE[upgradeId];
    if (!upgrade) return null;

    const isBuilt = builtUpgrades.includes(upgradeId);
    const prereqMet = !upgrade.requires || builtUpgrades.includes(upgrade.requires);
    const canAfford = prereqMet && !isBuilt &&
      Object.entries(upgrade.cost).every(([res, qty]) => (totalResources?.[res] ?? 0) >= qty);
    const isLocked = !isBuilt && !prereqMet;

    const borderColor = isBuilt
      ? "rgba(80,220,120,0.3)"
      : isLocked
      ? "rgba(255,255,255,0.06)"
      : canAfford
      ? "rgba(255,200,80,0.25)"
      : "rgba(255,255,255,0.1)";

    const textColor = isBuilt
      ? "rgba(80,220,120,0.85)"
      : isLocked
      ? "rgba(255,255,255,0.2)"
      : canAfford
      ? "rgba(255,200,80,0.9)"
      : "rgba(255,255,255,0.4)";

    const costStr = Object.entries(upgrade.cost)
      .map(([r, q]) => `${q} ${r}`)
      .join(", ");

    return (
      <button
        key={upgradeId}
        disabled={!canAfford}
        onClick={() => canAfford && onSelect(upgradeId)}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: isBuilt
            ? "rgba(80,220,120,0.06)"
            : isLocked
            ? "rgba(255,255,255,0.02)"
            : canAfford
            ? "rgba(255,200,80,0.07)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${borderColor}`,
          cursor: canAfford ? "pointer" : "default",
          textAlign: "left",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: textColor }}>
            {upgrade.icon} {upgrade.label}
          </span>
          {isBuilt
            ? <span style={{ fontSize: 10, color: "rgba(80,220,120,0.6)" }}>✓ Built</span>
            : isLocked
            ? <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>🔒 Locked</span>
            : <span style={{ fontSize: 10, color: canAfford ? "rgba(255,200,80,0.6)" : "rgba(255,255,255,0.2)" }}>
                {costStr}
              </span>
          }
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
          {upgrade.desc}
        </div>
      </button>
    );
  };

  const anyAvailable = Object.keys(BASE_UPGRADE_TREE).some(id => {
    const u = BASE_UPGRADE_TREE[id];
    const built = builtUpgrades.includes(id);
    const prereq = !u.requires || builtUpgrades.includes(u.requires);
    return !built && prereq;
  });

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-40"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl overflow-hidden" style={{ width: 340, background: "rgba(8,9,12,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "rgba(220,180,100,0.85)" }}>🏛️ Base Upgrades</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)" }}>
            Esc
          </button>
        </div>

        <div className="px-4 py-2 text-xs" style={{ color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          🍽️ Food Chain
        </div>
        <div className="px-4 py-3 flex flex-col gap-2">
          {foodChain.map(id => renderUpgrade(id))}
        </div>

        <div className="px-4 py-2 text-xs" style={{ color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          ⚔️ Military Chain
        </div>
        <div className="px-4 py-3 flex flex-col gap-2">
          {militaryChain.map(id => renderUpgrade(id))}
        </div>

        {!anyAvailable && (
          <div className="px-5 py-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            No upgrades available. Build prerequisite upgrades first.
          </div>
        )}

        <div className="px-4 py-3">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-xs"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}