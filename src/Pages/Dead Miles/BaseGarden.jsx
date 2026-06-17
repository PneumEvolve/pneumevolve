// BaseGarden.jsx — Garden zone
// Crop plot grid. CropCard moved here from BaseView.

import React from "react";
import Section from "./Section";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(seconds) {
  if (seconds <= 0) return "ready";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── CropCard ─────────────────────────────────────────────────────────────────

function CropCard({ crop, onHarvest }) {
  const pct       = Math.min(1, crop.growTimer / crop.growTime);
  const isReady   = crop.stage === "ready";
  const remaining = Math.max(0, crop.growTime - crop.growTimer);

  return (
    <div style={{
      background:   isReady ? "rgba(120,210,80,0.08)" : "rgba(255,255,255,0.03)",
      border:       `1px solid ${isReady ? "rgba(120,210,80,0.3)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12,
      padding:      "12px 14px",
      display:      "flex",
      flexDirection:"column",
      gap:          8,
      transition:   "border-color 0.3s, background 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textTransform: "capitalize" }}>
          {crop.type}
        </span>
        <span style={{
          fontSize:           11,
          color:              isReady ? "rgba(120,210,80,0.9)" : "rgba(255,255,255,0.3)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {isReady ? "● READY" : fmtTime(remaining)}
        </span>
      </div>

      <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width:      `${pct * 100}%`,
          height:     "100%",
          background: isReady ? "rgba(120,210,80,0.7)" : "rgba(255,200,60,0.5)",
          borderRadius: 2,
          transition: "width 0.5s ease",
        }} />
      </div>

      {isReady && (
        <button
          onClick={() => onHarvest(crop.id)}
          style={{
            marginTop: 2,
            padding:   "5px 0",
            background:"rgba(120,210,80,0.12)",
            border:    "1px solid rgba(120,210,80,0.3)",
            borderRadius: 8,
            color:     "rgba(120,210,80,0.9)",
            fontSize:  12,
            cursor:    "pointer",
            letterSpacing: "0.05em",
          }}>
          Harvest
        </button>
      )}
    </div>
  );
}

// ─── BaseGarden ───────────────────────────────────────────────────────────────

export default function BaseGarden({ snapshot, baseStorage, onHarvest }) {
  const crops      = snapshot?.crops ?? [];
  const readyCrops = crops.filter(c => c.stage === "ready");
  const growing    = crops.filter(c => c.stage !== "ready");
  const seeds      = Math.floor(baseStorage?.seeds ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Ready to harvest ── */}
      {readyCrops.length > 0 && (
        <Section title={`🌾 Ready to Harvest (${readyCrops.length})`} defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {readyCrops.map(crop => (
              <CropCard
                key={crop.id}
                crop={crop}
                onHarvest={id => onHarvest?.({ type: "harvest", cropId: id })}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── Growing ── */}
      <Section title="🌱 Growing" defaultOpen={true} badge={growing.length > 0 ? growing.length : undefined}>
        {growing.length === 0 && readyCrops.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            No crops planted yet.<br />
            <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
              Press G in-game to open the build menu → plant a crop plot.
            </span>
          </div>
        ) : growing.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "12px 0" }}>
            Nothing growing right now.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {growing.map(crop => (
              <CropCard
                key={crop.id}
                crop={crop}
                onHarvest={id => onHarvest?.({ type: "harvest", cropId: id })}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Resource summary ── */}
      <Section title="📊 Garden Resources" defaultOpen={false}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{
            flex: 1, padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>SEEDS</div>
            <div style={{ fontSize: 22, color: "rgba(120,210,80,0.9)", fontVariantNumeric: "tabular-nums" }}>{seeds}</div>
          </div>
          <div style={{
            flex: 1, padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>PLOTS</div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>
              {crops.length}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}