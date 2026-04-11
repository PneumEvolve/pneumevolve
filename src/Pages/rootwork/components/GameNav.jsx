// src/Pages/rootwork/components/GameNav.jsx
 
import React from "react";
import { CROPS, SEASON_FARMS } from "../gameConstants";
import { isFarmAutomated } from "../gameEngine";
 
export default function GameNav({ game, activeTab, onTabChange, prestigeReady }) {
  const availableCropIds = SEASON_FARMS[game.season] ?? ["wheat"];
 
  const tabs = [
    // Farm tabs
    ...game.farms
      .filter((f) => availableCropIds.includes(f.crop))
      .map((farm, idx) => {
        const crop = CROPS[farm.crop];
        const automated = isFarmAutomated(farm, game.workers);
        return {
          id: `farm_${idx}`,
          label: crop.name,
          emoji: crop.emoji,
          badge: automated ? "✓" : null,
          badgeColor: "#4ade80",
        };
      }),
 
    // Kitchen — unlocks when any farm is automated
    ...(game.kitchenUnlocked
      ? [{
          id: "processing",
          label: "Kitchen",
          emoji: "🏭",
          badge: (game.processingQueue ?? []).filter((i) => !i.done).length > 0
            ? (game.processingQueue ?? []).filter((i) => !i.done).length
            : null,
          badgeColor: "var(--accent)",
        }]
      : []),
 
    // Season tab
    {
      id: "season",
      label: "Season",
      emoji: "🌱",
      badge: prestigeReady ? "!" : null,
      badgeColor: "#f59e0b",
    },
  ];
 
  return (
    <div style={{
      background: "var(--bg-elev)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      overflowX: "auto",
      scrollbarWidth: "none",
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              position: "relative",
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "0.6rem 1.1rem",
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              color: isActive ? "var(--accent)" : "var(--muted)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "0.72rem",
              transition: "color 0.15s ease, border-color 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{tab.emoji}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{
                position: "absolute", top: "4px", right: "6px",
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