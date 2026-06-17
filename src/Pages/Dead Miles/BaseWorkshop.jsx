// BaseWorkshop.jsx — Workshop zone
// Covers: built structures, blueprint queue, buildable structures, crafting.
// Receives all needed state as props — no direct engine calls.

import React, { useState, useEffect, useRef } from "react";
import { CRAFTING_RECIPES, WORKSTATION_DEFS, WORKSHOP_BLUEPRINT_COSTS } from "./deadMilesEngine";
import Section from "./Section";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESOURCE_ICONS = {
  food: "🌽", water: "💧", wood: "🪵", scrap: "⚙️",
  nails: "📌", seeds: "🌱", fuel: "⛽", car_parts: "🔩",
  barricade_kit: "🪵", turret_kit: "🗼",
};

function costLabel(cost) {
  return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(" + ");
}

// ─── CraftingPanel ────────────────────────────────────────────────────────────

function CraftingPanel({ baseStorage, onCraft }) {
  const [crafting, setCrafting] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function canAfford(recipe) {
    return Object.entries(recipe.inputs).every(([k, qty]) => (baseStorage[k] ?? 0) >= qty);
  }

  function startCraft(recipe) {
    if (crafting) return;
    if (!canAfford(recipe)) return;
    setCrafting({ recipeId: recipe.id, elapsed: 0, total: recipe.seconds });
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 0.1;
      setCrafting(prev => prev ? { ...prev, elapsed } : null);
      if (elapsed >= recipe.seconds) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCrafting(null);
        onCraft?.({ type: "craft", recipeId: recipe.id });
      }
    }, 100);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
        Outputs go to base stockpile
      </div>
      {CRAFTING_RECIPES.map(recipe => {
        const affordable = canAfford(recipe);
        const isCrafting = crafting?.recipeId === recipe.id;
        const pct        = isCrafting ? Math.min(1, crafting.elapsed / crafting.total) : 0;

        return (
          <div key={recipe.id} style={{
            background:   isCrafting ? "rgba(255,200,60,0.06)" : "rgba(255,255,255,0.03)",
            border:       `1px solid ${isCrafting ? "rgba(255,200,60,0.25)" : affordable ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
            borderRadius: 12,
            padding:      "14px 16px",
            display:      "flex",
            flexDirection:"column",
            gap:          10,
            opacity:      !affordable && !isCrafting ? 0.55 : 1,
            transition:   "opacity 0.2s, border-color 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{recipe.icon}</span>
                <div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{recipe.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{recipe.desc}</div>
                </div>
              </div>
              {!isCrafting && (
                <button
                  onClick={() => startCraft(recipe)}
                  disabled={!affordable || !!crafting}
                  style={{
                    flexShrink: 0,
                    padding:    "6px 14px",
                    background: affordable && !crafting ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.04)",
                    border:     `1px solid ${affordable && !crafting ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8,
                    color:      affordable && !crafting ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.25)",
                    fontSize:   12,
                    cursor:     affordable && !crafting ? "pointer" : "default",
                    letterSpacing: "0.04em",
                  }}>
                  {crafting && crafting.recipeId !== recipe.id ? "Busy…" : "Craft"}
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(recipe.inputs).map(([k, qty]) => {
                const have = baseStorage[k] ?? 0;
                const ok   = have >= qty;
                return (
                  <span key={k} style={{
                    fontSize: 11,
                    color:    ok ? "rgba(255,255,255,0.5)" : "rgba(255,100,80,0.85)",
                    background: ok ? "rgba(255,255,255,0.05)" : "rgba(255,80,60,0.08)",
                    border:   `1px solid ${ok ? "rgba(255,255,255,0.08)" : "rgba(255,80,60,0.2)"}`,
                    borderRadius: 6, padding: "2px 8px",
                  }}>
                    {RESOURCE_ICONS[k] ?? "●"} {qty} {k}
                    {!ok && <span style={{ marginLeft: 4, opacity: 0.6 }}>({have}/{qty})</span>}
                  </span>
                );
              })}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>→</span>
              {Object.entries(recipe.outputs).map(([k, qty]) => (
                <span key={k} style={{
                  fontSize: 11, color: "rgba(120,210,80,0.85)",
                  background: "rgba(120,210,80,0.06)", border: "1px solid rgba(120,210,80,0.15)",
                  borderRadius: 6, padding: "2px 8px",
                }}>
                  {RESOURCE_ICONS[k] ?? "●"} +{qty} {k}
                </span>
              ))}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>{recipe.seconds}s</span>
            </div>

            {isCrafting && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${pct * 100}%`, height: "100%", background: "rgba(255,200,60,0.7)", borderRadius: 2, transition: "width 0.1s linear" }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,200,60,0.6)", textAlign: "right" }}>
                  {Math.ceil(crafting.total - crafting.elapsed)}s remaining…
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── BaseWorkshop ─────────────────────────────────────────────────────────────

export default function BaseWorkshop({ snapshot, baseStorage, onHarvest }) {
  const builtStructures   = snapshot?.builtStructures ?? [];
  const blueprints        = snapshot?.blueprints ?? [];
  const pendingBlueprints = blueprints.filter(bp => bp.category === "workshop" || WORKSHOP_BLUEPRINT_COSTS[bp.type]);
  const BUILDABLE         = WORKSTATION_DEFS.filter(ws => ws.buildable);

  function canAffordCost(cost) {
    return Object.entries(cost).every(([k, v]) => (baseStorage[k] ?? 0) >= v);
  }

  const turretCost  = { scrap: 4, nails: 8 };
  const plotCost    = { seeds: 1 };
  const turretPend  = blueprints.some(bp => bp.type === "turret");
  const plotPend    = blueprints.some(bp => bp.type === "crop_plot");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Built structures ── */}
      {builtStructures.length > 0 && (
        <Section title="✅ Built Structures" defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {builtStructures.map(st => {
              const def = WORKSTATION_DEFS.find(w => w.id === st.type);
              return (
                <div key={st.id} style={{
                  padding: "10px 12px",
                  background: "rgba(80,220,120,0.06)",
                  border:   "1px solid rgba(80,220,120,0.2)",
                  borderRadius: 10,
                  display:  "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 18 }}>{def?.icon ?? "🏗"}</span>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{def?.label ?? st.type}</div>
                    <div style={{ fontSize: 10, color: "rgba(80,220,120,0.7)" }}>Built · staffable</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Queued blueprints ── */}
      {pendingBlueprints.length > 0 && (
        <Section title="📐 Queued Blueprints" defaultOpen={true}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendingBlueprints.map(bp => {
              const def = WORKSTATION_DEFS.find(w => w.id === bp.type);
              return (
                <div key={bp.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8,
                  background: "rgba(255,200,80,0.06)", border: "1px solid rgba(255,200,80,0.2)",
                }}>
                  <span style={{ fontSize: 16 }}>{def?.icon ?? "🏗"}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                    {def?.label ?? bp.type} — walk up and press [F] to build
                  </span>
                  <button
                    onClick={() => onHarvest?.({ type: "cancel_blueprint", blueprintId: bp.id })}
                    style={{
                      padding: "2px 8px", borderRadius: 5, fontSize: 10, cursor: "pointer",
                      background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)",
                      color: "rgba(255,120,120,0.8)",
                    }}>
                    Cancel
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Buildable workshops ── */}
      <Section title="🏭 Workshop Structures" defaultOpen={true}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BUILDABLE.map(ws => {
            const cost      = WORKSHOP_BLUEPRINT_COSTS[ws.id];
            const isBuilt   = builtStructures.some(st => st.type === ws.id);
            const isPending = pendingBlueprints.some(bp => bp.type === ws.id);
            const canBuild  = !isBuilt && !isPending && canAffordCost(cost);
            return (
              <div key={ws.id} style={{
                padding:  "12px 14px",
                background: isBuilt ? "rgba(80,220,120,0.04)" : isPending ? "rgba(255,200,80,0.04)" : "rgba(255,255,255,0.03)",
                border:   `1px solid ${isBuilt ? "rgba(80,220,120,0.2)" : isPending ? "rgba(255,200,80,0.2)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 12,
                display:  "flex", alignItems: "center", gap: 12,
                opacity:  isBuilt ? 0.7 : 1,
              }}>
                <span style={{ fontSize: 22 }}>{ws.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    {ws.label}
                    {isBuilt   && <span style={{ fontSize: 10, color: "rgba(80,220,120,0.8)", background: "rgba(80,220,120,0.1)", border: "1px solid rgba(80,220,120,0.25)", borderRadius: 4, padding: "1px 5px" }}>BUILT</span>}
                    {isPending && <span style={{ fontSize: 10, color: "rgba(255,200,80,0.8)", background: "rgba(255,200,80,0.1)", border: "1px solid rgba(255,200,80,0.25)", borderRadius: 4, padding: "1px 5px" }}>QUEUED</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{ws.desc}</div>
                  {!isBuilt && (
                    <div style={{ fontSize: 10, color: canBuild ? "rgba(255,200,60,0.6)" : "rgba(255,80,60,0.5)", marginTop: 3 }}>
                      Cost: {costLabel(cost)}
                    </div>
                  )}
                </div>
                {!isBuilt && !isPending && (
                  <button
                    onClick={() => canBuild && onHarvest?.({ type: "queue_blueprint", blueprintType: ws.id })}
                    disabled={!canBuild}
                    style={{
                      padding: "7px 14px", borderRadius: 8, fontSize: 12,
                      background: canBuild ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.03)",
                      border:   `1px solid ${canBuild ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.07)"}`,
                      color:    canBuild ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.2)",
                      cursor:   canBuild ? "pointer" : "default", flexShrink: 0,
                    }}>
                    Queue
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Defenses & Farming blueprints ── */}
      <Section title="🛡 Defenses & Farming" defaultOpen={true}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { type: "turret",    icon: "🗼", label: "Auto Turret",  cost: turretCost, isPending: turretPend },
            { type: "crop_plot", icon: "🌱", label: "Garden Plot",  cost: plotCost,   isPending: plotPend   },
          ].map(item => {
            const canBuild = canAffordCost(item.cost);
            return (
              <div key={item.type} style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ fontSize: 20 }}>{item.icon}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{item.label}</div>
                <div style={{ fontSize: 10, color: canBuild ? "rgba(255,200,60,0.6)" : "rgba(255,80,60,0.5)" }}>
                  {costLabel(item.cost)}
                </div>
                <button
                  onClick={() => canBuild && !item.isPending && onHarvest?.({ type: "queue_blueprint", blueprintType: item.type })}
                  disabled={!canBuild || item.isPending}
                  style={{
                    padding: "6px 0", borderRadius: 7, fontSize: 11,
                    background: canBuild && !item.isPending ? "rgba(255,200,60,0.1)" : "rgba(255,255,255,0.02)",
                    border:   `1px solid ${canBuild && !item.isPending ? "rgba(255,200,60,0.3)" : "rgba(255,255,255,0.06)"}`,
                    color:    canBuild && !item.isPending ? "rgba(255,200,60,0.9)" : "rgba(255,255,255,0.18)",
                    cursor:   canBuild && !item.isPending ? "pointer" : "default",
                  }}>
                  {item.isPending ? "Queued ✓" : "Queue"}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", lineHeight: 1.6 }}>
          Queued blueprints appear as ghosts on the home base map. Walk up and press [F] to build,
          or assign a survivor to the Builder workstation for auto-construction.
        </div>
      </Section>

      {/* ── Crafting ── */}
      <Section title="⚙️ Crafting" defaultOpen={false}>
        <CraftingPanel baseStorage={baseStorage} onCraft={onHarvest} />
      </Section>
    </div>
  );
}