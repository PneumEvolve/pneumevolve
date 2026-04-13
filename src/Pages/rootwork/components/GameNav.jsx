// src/Pages/rootwork/components/GameNav.jsx
 
import React from "react";
import { CROPS, SEASON_FARMS } from "../gameConstants";
import { isFarmAutomated } from "../gameEngine";
 
// ─── Bottom nav tab definition ────────────────────────────────────────────────
 
export const MAIN_TABS = ["farms", "market", "kitchen", "season"];
 
// ─── Farm sub-tabs (scrollable strip at top) ──────────────────────────────────
 
export function FarmSubTabs({ game, activeFarmIndex, onFarmChange }) {
  const availableCropIds = SEASON_FARMS[game.season] ?? ["wheat"];
  const farms = game.farms.filter((f) => availableCropIds.includes(f.crop));
 
  if (farms.length <= 1) return null;
 
  return (
    <div style={{
      background: "var(--bg-elev)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      overflowX: "auto",
      scrollbarWidth: "none",
    }}>
      {farms.map((farm, idx) => {
        const crop = CROPS[farm.crop];
        const automated = isFarmAutomated(farm, game.workers);
        const isActive = activeFarmIndex === idx;
        return (
          <button
            key={farm.id}
            onClick={() => onFarmChange(idx)}
            style={{
              position: "relative",
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.5rem 1rem",
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              color: isActive ? "var(--accent)" : "var(--muted)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "0.78rem",
              whiteSpace: "nowrap",
            }}
          >
            <span>{crop.emoji}</span>
            <span>{crop.name}</span>
            {automated && (
              <span style={{ fontSize: "0.6rem", color: "#4ade80", fontWeight: 700 }}>✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
 
// ─── Bottom nav ───────────────────────────────────────────────────────────────
 
export default function GameNav({ game, activeMainTab, onMainTabChange, prestigeReady }) {
  const marketUnlocked = game.marketUnlocked;
  const kitchenPurchased = game.kitchenPurchased;
 
  const processingCount = (game.processingQueue ?? []).filter((i) => !i.done).length;
  const marketQueueCount = (game.marketQueue ?? []).reduce((s, o) => s + o.quantity, 0);
 
  const tabs = [
    {
      id: "farms",
      label: "Farms",
      emoji: "🌱",
      badge: null,
    },
    {
      id: "market",
      label: "Market",
      emoji: "💰",
      badge: marketQueueCount > 0 ? marketQueueCount : null,
      badgeColor: "#4ade80",
      locked: !marketUnlocked,
    },
    {
      id: "kitchen",
      label: "Kitchen",
      emoji: "🏭",
      badge: processingCount > 0 ? processingCount : null,
      badgeColor: "var(--accent)",
      locked: false, // always visible; shows purchase prompt if not bought
    },
    {
      id: "season",
      label: "Season",
      emoji: "🌸",
      badge: prestigeReady ? "!" : null,
      badgeColor: "#f59e0b",
    },
  ];
 
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      background: "var(--bg-elev)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map((tab) => {
        const isActive = activeMainTab === tab.id;
        const isLocked = tab.locked;
        return (
          <button
            key={tab.id}
            onClick={() => onMainTabChange(tab.id)}
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              padding: "0.6rem 0.25rem",
              background: "none",
              border: "none",
              borderTop: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: isLocked ? "default" : "pointer",
              color: isLocked ? "var(--border)" : isActive ? "var(--accent)" : "var(--muted)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "0.68rem",
              transition: "color 0.15s ease",
            }}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1, opacity: isLocked ? 0.35 : 1 }}>
              {tab.emoji}
            </span>
            <span>{isLocked ? "🔒" : tab.label}</span>
            {tab.badge && !isLocked && (
              <span style={{
                position: "absolute", top: "4px", right: "calc(50% - 18px)",
                background: tab.badgeColor, color: "#fff",
                fontSize: "0.55rem", fontWeight: 700,
                borderRadius: "999px", padding: "1px 4px",
                lineHeight: 1.4, minWidth: "14px", textAlign: "center",
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}