// BaseKitchen.jsx — Kitchen zone
// Phase 1: Placeholder. Phase 2 adds kitchen workstation, cook worker cycles, and
// food processing chain (Food → Field Rations → Stim Shots).

import React from "react";
import Section from "./Section";

const WORKSTATION_OUTPUT = {
  kitchen: { food: 1.2 / 3600 },
};

export default function BaseKitchen({ snapshot, baseStorage }) {
  const survivors = snapshot?.survivors ?? [];
  const kitchenWorkers = survivors.filter(s => s.workstation === "kitchen");
  const food = Math.floor(baseStorage?.food ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="🍳 Kitchen" defaultOpen={true}>
        {/* Status summary */}
        <div style={{
          padding:    "14px 16px",
          background: "rgba(255,255,255,0.03)",
          border:     "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          display:    "flex",
          alignItems: "center",
          gap:        16,
        }}>
          <span style={{ fontSize: 32 }}>🍳</span>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>
              Kitchen Workstation
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {kitchenWorkers.length > 0
                ? `${kitchenWorkers.map(s => s.name).join(", ")} assigned — producing food`
                : "No workers assigned — assign a survivor from Command"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(120,210,80,0.7)", marginTop: 4 }}>
              🌽 Food stockpile: {food}
            </div>
          </div>
        </div>

        {/* Workers */}
        {kitchenWorkers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {kitchenWorkers.map(s => (
              <div key={s.id} style={{
                padding:    "10px 14px",
                background: "rgba(120,210,80,0.05)",
                border:     "1px solid rgba(120,210,80,0.15)",
                borderRadius: 10,
                display:    "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{s.name}</span>
                <span style={{ fontSize: 11, color: "rgba(120,210,80,0.7)" }}>+{(1.2).toFixed(0)}/hr food</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Phase 2 preview */}
      <Section title="🔮 Coming in Phase 2" defaultOpen={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Field Rations", desc: "Food → preserved food for runs", icon: "🥫" },
            { label: "Stim Shots",    desc: "Field Rations + Herbs → combat boost", icon: "💉" },
            { label: "Antidotes",     desc: "Food + Medicine → infection cure", icon: "🧪" },
          ].map(item => (
            <div key={item.label} style={{
              padding:    "10px 12px",
              background: "rgba(255,255,255,0.02)",
              border:     "1px dashed rgba(255,255,255,0.07)",
              borderRadius: 10,
              display:    "flex",
              alignItems: "center",
              gap:        10,
              opacity:    0.5,
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{item.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}