// ResourceBar.jsx — always-visible top bar for the base layer
// Shows per-resource amounts + cap warnings. Separate from any run HUD.

import React from "react";

const RESOURCE_DEFS = [
  { key: "food",      icon: "🌽", label: "Food"      },
  { key: "scrap",     icon: "⚙️",  label: "Scrap"     },
  { key: "nails",     icon: "📌", label: "Nails"     },
  { key: "medicine",  icon: "💊", label: "Medicine"  },
  { key: "ammo",      icon: "🔫", label: "Ammo"      },
  { key: "fuel",      icon: "⛽", label: "Fuel"      },
  { key: "seeds",     icon: "🌱", label: "Seeds"     },
  { key: "car_parts", icon: "🔩", label: "Parts"     },
];

// Rough resource caps — Phase 3 will pull from engine_constants
const RESOURCE_CAPS = {
  food: 200, scrap: 200, nails: 150, medicine: 100,
  ammo: 100, fuel: 150, seeds: 50, car_parts: 50,
};

export default function ResourceBar({ baseStorage = {}, runReady = false }) {
  const resources = RESOURCE_DEFS.filter(r => (baseStorage[r.key] ?? 0) > 0 || r.key === "food" || r.key === "scrap");

  return (
    <div style={{
      background: "rgba(8,11,13,0.97)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      flexShrink: 0,
    }}>
      {/* Run readiness pill */}
      {runReady && (
        <div style={{
          padding: "3px 10px",
          background: "rgba(120,210,80,0.12)",
          border: "1px solid rgba(120,210,80,0.3)",
          borderRadius: 20,
          fontSize: 10,
          color: "rgba(120,210,80,0.9)",
          letterSpacing: "0.06em",
          marginRight: 4,
          flexShrink: 0,
        }}>
          ● DEPLOY READY
        </div>
      )}

      {/* Resource pills */}
      {RESOURCE_DEFS.map(({ key, icon }) => {
        const amount = Math.floor(baseStorage[key] ?? 0);
        const cap    = RESOURCE_CAPS[key] ?? 200;
        const pct    = amount / cap;
        const nearCap = pct >= 0.9;
        if (amount === 0) return null;

        return (
          <div
            key={key}
            title={`${key}: ${amount} / ${cap}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 20,
              background: nearCap
                ? "rgba(255,160,40,0.1)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${nearCap ? "rgba(255,160,40,0.3)" : "rgba(255,255,255,0.07)"}`,
              transition: "border-color 0.3s, background 0.3s",
            }}
          >
            <span style={{ fontSize: 12 }}>{icon}</span>
            <span style={{
              fontSize: 11,
              color: nearCap ? "rgba(255,160,40,0.9)" : "rgba(255,255,255,0.65)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {amount}
            </span>
            {nearCap && (
              <span style={{ fontSize: 9, color: "rgba(255,160,40,0.7)" }}>⚠</span>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {RESOURCE_DEFS.every(r => (baseStorage[r.key] ?? 0) === 0) && (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
          No resources in stockpile yet
        </span>
      )}
    </div>
  );
}