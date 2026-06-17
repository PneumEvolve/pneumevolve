// BaseNav.jsx — fixed bottom navigation bar
// 6 zone tabs with badge system. Badge logic reads from state snapshot.

import React from "react";

const ZONES = [
  { id: "overview",  label: "Overview",  emoji: "🗺" },
  { id: "workshop",  label: "Workshop",  emoji: "🏭" },
  { id: "kitchen",   label: "Kitchen",   emoji: "🍳" },
  { id: "medical",   label: "Medical",   emoji: "🏥" },
  { id: "garden",    label: "Garden",    emoji: "🌱" },
  { id: "garage",    label: "Garage",    emoji: "🚗" },
  { id: "command",   label: "Command",   emoji: "📡" },
];

// Badge priority: 💀 > ! > ▲ > ⚠ > ● > null
function getBadge(zoneId, snapshot, baseStorage) {
  const survivors = snapshot?.survivors ?? [];
  const crops     = snapshot?.crops     ?? [];
  const turrets   = (snapshot?.turrets  ?? []).filter(t => !t.destroyed);
  const garage    = snapshot?.homeBase?.garage ?? snapshot?.garage ?? [];

  switch (zoneId) {
    case "workshop": {
      // ▲ if crafting queue has finished items (Phase 3 hook)
      return null;
    }
    case "kitchen": {
      const kitchenWorker = survivors.find(s => s.workstation === "kitchen");
      if (kitchenWorker && !kitchenWorker.command) return "!";
      return null;
    }
    case "medical": {
      const crit = survivors.find(s => s.hp < s.maxHp * 0.3);
      if (crit) return "💀";
      const low  = survivors.find(s => s.hp < s.maxHp * 0.6 && s.hp < s.maxHp);
      if (low) return "!";
      const turretDamaged = turrets.find(t => t.hp < (t.maxHp ?? 150) * 0.5);
      if (turretDamaged) return "⚠";
      return null;
    }
    case "garden": {
      const readyCrops = crops.filter(c => c.stage === "ready").length;
      if (readyCrops > 0) return "▲";
      return null;
    }
    case "garage": {
      const lowFuel = garage.find(v => v.fuel < (v.maxFuel ?? 80) * 0.2);
      if (lowFuel) return "⚠";
      return null;
    }
    case "command": {
      const idle = survivors.filter(s =>
        !s.workstation && !s.assignedTo &&
        s.command !== "follow" && s.command !== "fight" && s.command !== "stay_safe"
      );
      if (idle.length > 0) return "!";
      return null;
    }
    default:
      return null;
  }
}

const BADGE_STYLE = {
  "💀": { bg: "rgba(255,40,40,0.2)",  border: "rgba(255,60,60,0.5)",  color: "rgba(255,80,80,0.95)"  },
  "!":  { bg: "rgba(255,40,40,0.15)", border: "rgba(255,60,60,0.4)",  color: "rgba(255,100,80,0.95)" },
  "▲":  { bg: "rgba(255,200,40,0.15)",border: "rgba(255,200,60,0.4)", color: "rgba(255,210,60,0.95)" },
  "⚠":  { bg: "rgba(255,140,40,0.15)",border: "rgba(255,160,60,0.4)", color: "rgba(255,160,60,0.95)" },
  "●":  { bg: "rgba(80,210,80,0.1)",  border: "rgba(80,210,80,0.3)",  color: "rgba(100,220,80,0.9)"  },
};

export default function BaseNav({ activeZone, onZoneChange, snapshot, baseStorage }) {
  return (
    <div style={{
      borderTop:  "1px solid rgba(255,255,255,0.06)",
      background: "rgba(8,11,13,0.97)",
      display:    "flex",
      flexShrink: 0,
    }}>
      {ZONES.map(zone => {
        const isActive = zone.id === activeZone;
        const badge    = getBadge(zone.id, snapshot, baseStorage);
        const bs       = badge ? BADGE_STYLE[badge] : null;

        return (
          <button
            key={zone.id}
            onClick={() => onZoneChange(zone.id)}
            style={{
              flex: 1,
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              gap:            3,
              padding:        "10px 4px 8px",
              background:     isActive ? "rgba(255,200,80,0.07)" : "transparent",
              border:         "none",
              borderTop:      isActive ? "2px solid rgba(255,200,80,0.7)" : "2px solid transparent",
              cursor:         "pointer",
              position:       "relative",
              transition:     "background 0.15s, border-color 0.15s",
            }}
          >
            {/* Badge */}
            {badge && (
              <div style={{
                position:   "absolute",
                top:        4,
                right:      "calc(50% - 16px)",
                padding:    "1px 5px",
                borderRadius: 8,
                background: bs.bg,
                border:     `1px solid ${bs.border}`,
                color:      bs.color,
                fontSize:   9,
                fontWeight: 700,
                letterSpacing: "0.02em",
                pointerEvents: "none",
              }}>
                {badge}
              </div>
            )}

            <span style={{ fontSize: 18, lineHeight: 1 }}>{zone.emoji}</span>
            <span style={{
              fontSize:      9,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color:         isActive ? "rgba(255,200,80,0.9)" : "rgba(255,255,255,0.3)",
              transition:    "color 0.15s",
            }}>
              {zone.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}