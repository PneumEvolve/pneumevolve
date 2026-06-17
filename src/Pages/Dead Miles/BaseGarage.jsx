// BaseGarage.jsx — Garage zone
// Vehicle fleet: HP, fuel, upgrades, repair queue (Phase 4).

import React from "react";
import Section from "./Section";

const VEHICLE_ICONS = {
  monster_truck: "🚛",
  minivan:       "🚐",
  car:           "🚗",
  bike:          "🏍️",
};
const VEHICLE_LABELS = {
  monster_truck: "Monster Truck",
  minivan:       "Minivan",
  car:           "Car",
  bike:          "Bike",
};

// ─── VehicleCard ──────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, index }) {
  const v        = vehicle;
  const icon     = VEHICLE_ICONS[v.vehicleType]  ?? "🚗";
  const label    = VEHICLE_LABELS[v.vehicleType] ?? v.vehicleType ?? "Vehicle";
  const hpPct    = Math.round((v.hp  / (v.maxHp  || v.hp  || 1)) * 100);
  const fuelPct  = Math.round((v.fuel / (v.maxFuel || v.fuel || 1)) * 100);
  const hpColor  = hpPct >= 70 ? "rgba(80,220,120,0.85)" : hpPct >= 35 ? "rgba(255,200,60,0.85)" : "rgba(255,80,80,0.85)";
  const fuelColor= fuelPct >= 40 ? "rgba(100,180,255,0.85)" : fuelPct >= 15 ? "rgba(255,200,60,0.85)" : "rgba(255,80,80,0.85)";

  return (
    <div style={{
      padding:    "14px 16px",
      background: "rgba(255,255,255,0.02)",
      border:     "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      display:    "flex",
      alignItems: "center",
      gap:        14,
    }}>
      <span style={{ fontSize: 32, flexShrink: 0 }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>
          {label}
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>
            #{(v.id ?? "").slice(-4) || index + 1}
          </span>
        </div>

        {/* HP bar */}
        <div style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>HP</span>
            <span style={{ fontSize: 10, color: hpColor, fontVariantNumeric: "tabular-nums" }}>{v.hp} / {v.maxHp ?? v.hp}</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Fuel bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>FUEL</span>
            <span style={{ fontSize: 10, color: fuelColor, fontVariantNumeric: "tabular-nums" }}>{v.fuel} / {v.maxFuel ?? v.fuel}</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${fuelPct}%`, height: "100%", background: fuelColor, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Upgrade badges */}
      {(v.upgrades ?? []).length > 0 && (
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {v.upgrades.map(u => (
            <span key={u} style={{
              fontSize: 10, padding: "2px 7px",
              background: "rgba(255,200,60,0.1)",
              border: "1px solid rgba(255,200,60,0.3)",
              borderRadius: 6, color: "rgba(255,200,60,0.8)",
              textTransform: "capitalize",
            }}>{u}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BaseGarage ───────────────────────────────────────────────────────────────

export default function BaseGarage({ worldState, snapshot }) {
  const garage = worldState?.homeBase?.garage ?? snapshot?.garage ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title={`🚗 Vehicle Fleet (${garage.length})`} defaultOpen={true}>
        {garage.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            Garage is empty.<br />
            <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
              Vehicles you drive out of runs are automatically recovered here.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {garage.map((v, i) => (
              <VehicleCard key={v.id ?? i} vehicle={v} index={i} />
            ))}
          </div>
        )}
      </Section>

      {/* Phase 4 preview: upgrades */}
      <Section title="🔧 Vehicle Upgrades" defaultOpen={false}>
        <div style={{
          padding:    "12px 16px",
          background: "rgba(255,255,255,0.02)",
          border:     "1px dashed rgba(255,255,255,0.07)",
          borderRadius: 10,
          opacity:    0.55,
        }}>
          <div style={{ fontSize: 12, color: "rgba(255,200,60,0.6)", marginBottom: 4 }}>Coming in Phase 4</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
            Vehicle Mods crafted at the Workshop can be pre-equipped here before runs:
            Plow, Armor, Turbo, Roof Rack, Reinforced Glass.
          </div>
        </div>
      </Section>
    </div>
  );
}