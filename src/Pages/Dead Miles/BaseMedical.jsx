// BaseMedical.jsx — Medical zone
// Covers: turret status + repair, survivor healing, medical workstation.
// Phase 2 adds the medical workstation worker cycle and recipe chain.

import React from "react";
import Section from "./Section";

// ─── TurretCard ───────────────────────────────────────────────────────────────

function TurretCard({ turret, onRepair, scrap }) {
  const pct       = turret.hp / (turret.maxHp ?? 150);
  const isDamaged = turret.hp < (turret.maxHp ?? 150);

  return (
    <div style={{
      background:   "rgba(255,255,255,0.03)",
      border:       `1px solid ${pct < 0.3 ? "rgba(255,80,60,0.3)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12,
      padding:      "10px 14px",
      display:      "flex",
      flexDirection:"column",
      gap:          6,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>⚡ Turret</span>
        <span style={{ fontSize: 11, color: pct < 0.3 ? "rgba(255,80,60,0.9)" : "rgba(255,255,255,0.3)" }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width:      `${pct * 100}%`,
          height:     "100%",
          background: pct > 0.6 ? "rgba(80,180,255,0.6)" : pct > 0.3 ? "rgba(255,200,60,0.7)" : "rgba(255,80,60,0.8)",
          borderRadius: 2,
        }} />
      </div>
      {isDamaged && (
        <button
          onClick={() => onRepair?.(turret.id)}
          disabled={!onRepair || (scrap ?? 0) < 2}
          title={`Spend 2 scrap to repair +40 HP (have ${scrap ?? 0} scrap)`}
          style={{
            marginTop: 2,
            padding:   "5px 0",
            background: (scrap ?? 0) >= 2 ? "rgba(255,200,60,0.08)" : "rgba(255,255,255,0.02)",
            border:   `1px solid ${(scrap ?? 0) >= 2 ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 7,
            color:    (scrap ?? 0) >= 2 ? "rgba(255,200,60,0.85)" : "rgba(255,255,255,0.2)",
            fontSize: 11,
            cursor:   (scrap ?? 0) >= 2 ? "pointer" : "default",
            letterSpacing: "0.03em",
          }}>
          🔧 Repair (2 scrap)
        </button>
      )}
    </div>
  );
}

// ─── BaseMedical ──────────────────────────────────────────────────────────────

export default function BaseMedical({ snapshot, baseStorage, onHarvest }) {
  const turrets   = (snapshot?.turrets ?? []).filter(t => !t.destroyed);
  const survivors = snapshot?.survivors ?? [];
  const isHome    = snapshot?.isHome ?? false;
  const medicine  = baseStorage?.medicine ?? 0;
  const scrap     = baseStorage?.scrap ?? 0;

  const woundedSurvivors = survivors.filter(s => s.hp < s.maxHp);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Turrets ── */}
      <Section title="⚡ Turrets" defaultOpen={true} badge={turrets.length > 0 ? turrets.length : undefined}>
        {turrets.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            No turrets built yet.
            <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "rgba(255,255,255,0.12)" }}>
              Queue a turret blueprint from the Workshop, then head to the base map.
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {turrets.map((t, i) => (
              <TurretCard
                key={t.id ?? i}
                turret={t}
                onRepair={isHome ? (id => onHarvest?.({ type: "repair_turret", turretId: id })) : null}
                scrap={isHome ? scrap : 0}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Survivor Care ── */}
      <Section title="💊 Survivor Care" defaultOpen={true}>
        {woundedSurvivors.length === 0 ? (
          <div style={{
            padding:    "12px 16px",
            background: "rgba(120,210,80,0.05)",
            border:     "1px solid rgba(120,210,80,0.15)",
            borderRadius: 10,
            fontSize:   12,
            color:      "rgba(120,210,80,0.8)",
          }}>
            ✓ All survivors are healthy
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              Medicine stockpile: <strong style={{ color: medicine > 0 ? "rgba(80,220,160,0.85)" : "rgba(255,80,60,0.7)" }}>{medicine}</strong>
            </div>
            {woundedSurvivors.map(sv => {
              const hpPct     = sv.hp / sv.maxHp;
              const canHeal   = isHome && medicine >= 2;
              const hpColor   = hpPct > 0.6 ? "rgba(120,210,80,0.7)" : hpPct > 0.3 ? "rgba(255,200,60,0.8)" : "rgba(255,80,60,0.9)";

              return (
                <div key={sv.id} style={{
                  padding:    "10px 14px",
                  background: hpPct < 0.3 ? "rgba(255,40,40,0.04)" : "rgba(255,255,255,0.03)",
                  border:     `1px solid ${hpPct < 0.3 ? "rgba(255,60,60,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 10,
                  display:    "flex",
                  alignItems: "center",
                  gap:        12,
                }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{sv.name}</span>
                      <span style={{ fontSize: 11, color: hpColor, fontVariantNumeric: "tabular-nums" }}>
                        {Math.floor(sv.hp)}/{sv.maxHp} HP
                      </span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${hpPct * 100}%`, height: "100%", background: hpColor, borderRadius: 2 }} />
                    </div>
                  </div>
                  <button
                    onClick={() => canHeal && onHarvest?.({ type: "heal", survivorId: sv.id })}
                    disabled={!canHeal}
                    title={`Spend 2 medicine to restore 40 HP (have ${medicine})`}
                    style={{
                      padding:  "5px 12px",
                      background: canHeal ? "rgba(80,220,160,0.1)" : "rgba(255,255,255,0.03)",
                      border:   `1px solid ${canHeal ? "rgba(80,220,160,0.3)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 8,
                      color:    canHeal ? "rgba(80,220,160,0.85)" : "rgba(255,255,255,0.2)",
                      fontSize: 11,
                      cursor:   canHeal ? "pointer" : "default",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}>
                    💊 Heal (2)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Medical workstation placeholder ── */}
      <Section title="🏥 Medical Bay" defaultOpen={false}>
        <div style={{
          padding:    "14px 16px",
          background: "rgba(255,255,255,0.02)",
          border:     "1px dashed rgba(255,255,255,0.07)",
          borderRadius: 12,
          opacity:    0.6,
        }}>
          <div style={{ fontSize: 13, color: "rgba(80,180,255,0.7)", marginBottom: 6 }}>Medical Workstation</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
            Build the Medical Bay from Workshop to enable: Herbs → Medicine, Medicine → Med Kits.
            Assign a Medic-specialised survivor for +25% yield bonus (Phase 2).
          </div>
        </div>
      </Section>
    </div>
  );
}