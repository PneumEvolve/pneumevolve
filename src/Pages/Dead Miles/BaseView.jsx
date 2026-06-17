// src/Pages/DeadMiles/BaseView.jsx
// Full-screen base management panel — toggled by Tab key.
// Phase 1 refactor: monolithic tabs → 6 zone components + ResourceBar + BaseNav.
// All existing callbacks preserved. Modal state (reassign, workstation picker) stays here.

import React, { useState, useRef, useEffect } from "react";
import { SURVIVOR_TRAITS, WORKSTATION_DEFS, getBlockedCommands } from "./deadMilesEngine";

import ResourceBar    from "./Resourcebar";
import BaseNav        from "./BaseNav";
import BaseWorkshop   from "./BaseWorkshop";
import BaseKitchen    from "./BaseKitchen";
import BaseMedical    from "./BaseMedical";
import BaseGarden     from "./BaseGarden";
import BaseGarage     from "./BaseGarage";
import BaseCommand    from "./BaseCommand";
import BaseMapView    from "./BaseMapView";

// ─── CSS custom property definitions ─────────────────────────────────────────
// Applied to root div; zone components can reference as fallback vars.
const CSS_VARS = {
  "--bg":          "#080b0d",
  "--bg-elev":     "#0e1214",
  "--border":      "rgba(255,255,255,0.07)",
  "--accent":      "rgba(255,200,80,0.9)",
  "--text":        "rgba(255,255,255,0.85)",
  "--muted":       "rgba(255,255,255,0.3)",
  "--green":       "rgba(120,210,80,0.9)",
  "--red":         "rgba(255,80,60,0.9)",
  "--blue":        "rgba(80,180,255,0.9)",
};

// ─── WorkstationPicker (modal — stays in BaseView) ────────────────────────────

function WorkstationPicker({ survivor, builtStructures, onAssign, onClose }) {
  const assigned   = survivor?.workstation ?? null;
  const builtTypes = new Set((builtStructures ?? []).map(s => s.type));

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", zIndex: 10,
    }}>
      <div style={{
        background: "#0e1214", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: "24px 28px", maxWidth: 320, width: "90%",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
          Assign <strong style={{ color: "rgba(255,255,255,0.85)" }}>{survivor?.name}</strong> to workstation
        </div>

        {WORKSTATION_DEFS.map(ws => {
          const isActive   = assigned === ws.id;
          const isBuilt    = builtTypes.has(ws.id);
          const isDisabled = !isBuilt && !isActive;
          return (
            <button
              key={ws.id}
              onClick={() => isBuilt && onAssign(ws.id)}
              disabled={isDisabled}
              style={{
                padding: "10px 14px",
                background: isActive ? "rgba(255,200,60,0.08)" : isBuilt ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${isActive ? "rgba(255,200,60,0.3)" : isBuilt ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
                borderRadius: 10,
                color: isActive ? "rgba(255,200,60,0.9)" : isBuilt ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)",
                fontSize: 13, cursor: isBuilt ? "pointer" : "not-allowed",
                textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10,
                opacity: isDisabled ? 0.5 : 1,
              }}>
              <span style={{ fontSize: 18 }}>{ws.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  {ws.label} {isActive ? "✓" : ""}
                  {!isBuilt && (
                    <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,120,60,0.7)", background: "rgba(255,120,60,0.1)", border: "1px solid rgba(255,120,60,0.2)", borderRadius: 4, padding: "1px 5px" }}>
                      NOT BUILT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {isBuilt ? ws.desc : "Build this structure first — queue a blueprint from Workshop"}
                </div>
              </div>
            </button>
          );
        })}

        {/* Builder — always available */}
        {(() => {
          const isActive = assigned === "builder";
          return (
            <button
              onClick={() => onAssign("builder")}
              style={{
                padding: "10px 14px",
                background: isActive ? "rgba(120,200,80,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? "rgba(120,200,80,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10,
                color: isActive ? "rgba(180,255,120,0.9)" : "rgba(255,255,255,0.65)",
                fontSize: 13, cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10,
              }}>
              <span style={{ fontSize: 18 }}>🔨</span>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>Builder {isActive ? "✓" : ""}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Walks to queued blueprints and constructs them automatically</div>
              </div>
            </button>
          );
        })()}

        {assigned && (
          <button
            onClick={() => onAssign(null)}
            style={{
              padding: "8px 0", background: "transparent", border: "1px solid rgba(255,80,60,0.2)",
              borderRadius: 10, color: "rgba(255,100,80,0.6)", fontSize: 12, cursor: "pointer",
            }}>
            Unassign from workstation
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            padding: "8px 0", background: "transparent", border: "none",
            color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer",
          }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── CrisisPanel (modal — stays in BaseView) ──────────────────────────────────

function CrisisPanel({ crisisEvents, onResolveCrisis, baseStorage }) {
  const pending = (crisisEvents ?? []).filter(e => !e.resolved);
  if (pending.length === 0) return null;

  function canAfford(cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([k, qty]) => (baseStorage?.[k] ?? 0) >= qty);
  }

  return (
    <div style={{
      position: "absolute", top: 0, right: 0,
      width: 320, maxHeight: "100%", overflowY: "auto",
      padding: "14px", display: "flex", flexDirection: "column", gap: 10,
      zIndex: 20, pointerEvents: "none",
    }}>
      {pending.map(crisis => (
        <div key={crisis.id} style={{
          background: "#0e1214", border: "1px solid rgba(255,160,40,0.35)",
          borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,160,40,0.15)",
          pointerEvents: "all", animation: "crisisSlideIn 0.25s ease",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, color: "rgba(255,200,80,0.95)", fontWeight: 600, marginBottom: 3 }}>{crisis.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{crisis.body}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(crisis.options ?? []).map(opt => {
              const hasCost    = opt.cost && Object.keys(opt.cost).length > 0;
              const affordable = canAfford(opt.cost);
              return (
                <button
                  key={opt.id}
                  onClick={() => onResolveCrisis?.(crisis.id, opt.id)}
                  disabled={!affordable}
                  style={{
                    padding: "8px 12px",
                    background: affordable ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
                    border: `1px solid ${affordable ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 8, color: affordable ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                    fontSize: 12, cursor: affordable ? "pointer" : "not-allowed",
                    textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", letterSpacing: "0.03em",
                  }}>
                  <span>{opt.label}</span>
                  {hasCost && (
                    <span style={{ fontSize: 10, color: affordable ? "rgba(255,160,40,0.8)" : "rgba(255,80,60,0.7)" }}>
                      {Object.entries(opt.cost).map(([k, v]) => `${v} ${k}`).join(", ")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <style>{`@keyframes crisisSlideIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}

// ─── AwayModal (modal — stays in BaseView) ────────────────────────────────────

const RESOURCE_ICONS_AWAY = {
  food: "🌽", water: "💧", wood: "🪵",
  scrap: "⚙️", nails: "📌", seeds: "🌱", fuel: "⛽",
};

function AwayModal({ summary, onDismiss }) {
  if (!summary) return null;
  const { harvested, damaged, netResources } = summary;
  const hasNews = (harvested && harvested.length > 0) || (damaged && damaged.length > 0);

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#0e1214", border: "1px solid rgba(255,200,80,0.2)",
        borderRadius: 16, padding: "24px 28px", maxWidth: 340, width: "90%",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,200,80,0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          While you were away…
        </div>

        {!hasNews && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Nothing notable happened at the base.</div>
        )}

        {harvested?.map((h, i) => (
          <div key={i} style={{ fontSize: 13, color: "rgba(120,210,80,0.85)" }}>🌽 {h.name} harvested {h.amount} {h.type}</div>
        ))}
        {damaged?.map((d, i) => (
          <div key={i} style={{ fontSize: 13, color: "rgba(255,120,60,0.85)" }}>⚡ Turret took {d.damage} damage</div>
        ))}

        {summary.produced?.length > 0 && (() => {
          const byStation = {};
          for (const p of summary.produced) {
            if (!byStation[p.workstation]) byStation[p.workstation] = {};
            byStation[p.workstation][p.resource] = (byStation[p.workstation][p.resource] ?? 0) + p.amount;
          }
          return Object.entries(byStation).map(([ws, res]) => (
            <div key={ws} style={{ fontSize: 12, color: "rgba(160,200,255,0.85)" }}>
              🏭 {ws.replace("_", " ")}: {Object.entries(res).map(([r, a]) => `+${Math.floor(a)} ${r}`).join(", ")}
            </div>
          ));
        })()}

        {netResources && Object.keys(netResources).length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 10,
          }}>
            {Object.entries(netResources).map(([k, v]) => v !== 0 && (
              <span key={k} style={{ fontSize: 12, color: v > 0 ? "rgba(120,210,80,0.8)" : "rgba(255,100,80,0.8)" }}>
                {RESOURCE_ICONS_AWAY[k] ?? "●"} {v > 0 ? "+" : ""}{v} {k}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onDismiss}
          style={{
            marginTop: 4, padding: "10px 0",
            background: "rgba(255,200,80,0.08)", border: "1px solid rgba(255,200,80,0.25)",
            borderRadius: 10, color: "rgba(255,200,80,0.9)", fontSize: 13, cursor: "pointer", letterSpacing: "0.06em",
          }}>
          Back to the action
        </button>
      </div>
    </div>
  );
}

// ─── ReassignModal ────────────────────────────────────────────────────────────

function ReassignModal({ survivor, onCommand, onOpenWorkstation, onClose }) {
  const blocked = getBlockedCommands(survivor);
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#0e1214", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: "24px 28px", maxWidth: 300, width: "90%",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
          Reassign <strong style={{ color: "rgba(255,255,255,0.85)" }}>{survivor.name}</strong>
        </div>

        {/* Trait reminder */}
        {(survivor.traits ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
            {(survivor.traits ?? []).map(tid => {
              const t = SURVIVOR_TRAITS[tid];
              if (!t) return null;
              return (
                <span key={tid} title={t.desc} style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 5,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${t.color}44`,
                  color: t.color, cursor: "help",
                }}>
                  {t.emoji} {t.label}
                </span>
              );
            })}
          </div>
        )}

        {[
          { cmd: "follow",    label: "Follow me" },
          { cmd: "stay_safe", label: "Stay & shelter" },
          { cmd: "fight",     label: "Guard this area" },
          { cmd: "assign",    label: "Work (crop/turret)" },
        ].map(({ cmd, label }) => {
          const isBlocked  = blocked.includes(cmd);
          const blockTrait = isBlocked
            ? (survivor.traits ?? []).map(tid => SURVIVOR_TRAITS[tid]).find(t => t && getBlockedCommands({ traits: [t.id] }).includes(cmd))
            : null;
          return (
            <button
              key={cmd}
              disabled={isBlocked}
              onClick={() => !isBlocked && onCommand(cmd)}
              title={isBlocked && blockTrait ? `Blocked by trait: ${blockTrait.label} — ${blockTrait.desc}` : undefined}
              style={{
                padding: "10px 14px",
                background: isBlocked ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isBlocked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10,
                color: isBlocked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                fontSize: 13, cursor: isBlocked ? "not-allowed" : "pointer",
                textAlign: "left", letterSpacing: "0.03em",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
              <span>{label}</span>
              {isBlocked && blockTrait && (
                <span style={{ fontSize: 10, color: blockTrait.color, opacity: 0.85 }}>{blockTrait.emoji} Blocked</span>
              )}
            </button>
          );
        })}

        <button
          onClick={onOpenWorkstation}
          style={{
            padding: "10px 14px", background: "rgba(255,200,60,0.06)",
            border: "1px solid rgba(255,200,60,0.2)", borderRadius: 10,
            color: "rgba(255,200,60,0.8)", fontSize: 13, cursor: "pointer",
            textAlign: "left", letterSpacing: "0.03em",
          }}>
          🏭 Assign to Workstation…
          {survivor?.workstation && (
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>(currently: {survivor.workstation})</span>
          )}
        </button>

        <button
          onClick={onClose}
          style={{
            marginTop: 4, padding: "8px 0", background: "transparent", border: "none",
            color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer",
          }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── BaseView ─────────────────────────────────────────────────────────────────

export default function BaseView({
  stateSnapshot, activityLog, onHarvest, onClose, awaySummary, onDismissAway,
  crisisEvents, onResolveCrisis, worldState, worldEvents, onDeploy,
  onAddRoute, onRemoveRoute, onEnterHome, defaultTab,
  spectatorCam, onSpectatorCamChange, gameStateRef,
}) {
  const [activeZone,       setActiveZone]       = useState(defaultTab ?? "command");
  const [reassignTarget,   setReassignTarget]   = useState(null);
  const [workstationTarget,setWorkstationTarget]= useState(null);
  const [directorMode,     setDirectorMode]     = useState(false);

  // ── Director free-cam WASD listener ──────────────────────────────────────
  const directorCamRef = useRef(null);
  const keysHeld       = useRef({});

  useEffect(() => {
    if (!directorMode) {
      onSpectatorCamChange?.(null);
      directorCamRef.current = null;
      keysHeld.current = {};
      return;
    }
    // Seed cam from current game state so we don't jump
    const s = gameStateRef?.current?.current;
    const initX = s?.cam?.x ?? (s?.player?.x ? s.player.x - 500 : 0);
    const initY = s?.cam?.y ?? (s?.player?.y ? s.player.y - 300 : 0);
    directorCamRef.current = { x: initX, y: initY };
    onSpectatorCamChange?.({ ...directorCamRef.current });

    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      keysHeld.current[e.key.toLowerCase()] = true;
    }
    function onKeyUp(e) { keysHeld.current[e.key.toLowerCase()] = false; }

    let rafId;
    const SPEED = 420;
    let last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const k = keysHeld.current;
      let moved = false;
      if (k["w"] || k["arrowup"])    { directorCamRef.current.y -= SPEED * dt; moved = true; }
      if (k["s"] || k["arrowdown"])  { directorCamRef.current.y += SPEED * dt; moved = true; }
      if (k["a"] || k["arrowleft"])  { directorCamRef.current.x -= SPEED * dt; moved = true; }
      if (k["d"] || k["arrowright"]) { directorCamRef.current.x += SPEED * dt; moved = true; }
      if (moved) onSpectatorCamChange?.({ ...directorCamRef.current });
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      cancelAnimationFrame(rafId);
    };
  }, [directorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = stateSnapshot;
  if (!s) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#080b0d",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.3)", fontSize: 14,
      }}>
        Loading base…
      </div>
    );
  }

  const baseStorage = s.baseStorage ?? {};
  const homesettlementId = s.homesettlementId ?? null;
  const homeName  = homesettlementId !== null
    ? (s.settlements?.[homesettlementId]?.name ?? `Settlement ${homesettlementId}`)
    : null;

  function handleReassignCommand(cmd) {
    onHarvest?.({ type: "reassign", survivorId: reassignTarget.id, command: cmd });
    setReassignTarget(null);
  }

  // Resolve defaultTab to a zone id — old tab names map to new zone names
  // (callers may still pass "survivors", "garage", etc.)
  function resolveDefaultZone(tab) {
    const MAP = {
      build: "workshop", crafting: "workshop",
      crops: "garden",
      turrets: "medical",
      garage: "garage",
      survivors: "command", storage: "command", activity: "command", map: "overview",
      overview: "overview",
    };
    return MAP[tab] ?? tab ?? "command";
  }

  // Zone switcher: translate old defaultTab on first render
  const [_init] = useState(() => {
    if (defaultTab && defaultTab !== activeZone) {
      const resolved = resolveDefaultZone(defaultTab);
      if (resolved !== "command") setActiveZone(resolved);
    }
  });

  // Render active zone
  function renderZone() {
    const commonProps = { snapshot: s, baseStorage, onHarvest };
    switch (activeZone) {
      case "overview":  return (
        <BaseMapView
          snapshot={s}
          worldState={worldState}
          onAction={(type, payload) => onHarvest?.({ type, ...payload })}
          onZoneChange={setActiveZone}
        />
      );
      case "workshop": return <BaseWorkshop {...commonProps} />;
      case "kitchen":  return <BaseKitchen  {...commonProps} />;
      case "medical":  return <BaseMedical  {...commonProps} />;
      case "garden":   return <BaseGarden   {...commonProps} />;
      case "garage":   return <BaseGarage   snapshot={s} worldState={worldState} />;
      case "command":  return (
        <BaseCommand
          {...commonProps}
          activityLog={activityLog}
          worldState={worldState}
          worldEvents={worldEvents}
          onDeploy={onDeploy}
          onAddRoute={onAddRoute}
          onRemoveRoute={onRemoveRoute}
          onEnterHome={onEnterHome}
          onClose={onClose}
          onReassign={setReassignTarget}
          onWorkstationAssign={id => {
            onHarvest?.({ type: "assignWorkstation", survivorId: workstationTarget?.id, workstation: id });
            setWorkstationTarget(null);
          }}
        />
      );
      default: return null;
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        // Semi-transparent so the dimmed GameView shows through in director mode
        background: directorMode ? "rgba(8,11,13,0.82)" : "#080b0d",
        color: "rgba(255,255,255,0.8)",
        fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "auto",
        transition: "background 0.2s",
        ...CSS_VARS,
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding:      "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        flexShrink:   0,
        pointerEvents: "auto",
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
            Base Command
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,200,80,0.9)", marginTop: 1, fontWeight: 600 }}>
            {homeName ?? "No homebase set"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Watch / Director toggle — only when spectatorCam feature is available */}
          {onSpectatorCamChange && (
            <button
              onClick={() => setDirectorMode(m => !m)}
              title={directorMode ? "Switch to Follow mode (tracks survivor 1)" : "Switch to Director mode (WASD free-cam)"}
              style={{
                padding: "6px 12px",
                background: directorMode ? "rgba(255,200,80,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${directorMode ? "rgba(255,200,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8,
                color: directorMode ? "rgba(255,200,80,0.9)" : "rgba(255,255,255,0.35)",
                fontSize: 11,
                cursor: "pointer",
                letterSpacing: "0.05em",
                display: "flex", alignItems: "center", gap: 5,
              }}>
              <span>{directorMode ? "🎬" : "👁"}</span>
              <span>{directorMode ? "Director" : "Watch"}</span>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 12,
              cursor: "pointer", letterSpacing: "0.05em",
            }}>
            ↩ Back [Tab]
          </button>
        </div>
      </div>

      {/* ── Resource bar ── */}
      <ResourceBar baseStorage={baseStorage} />

      {/* ── Director mode hint ── */}
      {directorMode && (
        <div style={{
          padding: "5px 20px",
          background: "rgba(255,200,80,0.06)",
          borderBottom: "1px solid rgba(255,200,80,0.12)",
          fontSize: 10,
          color: "rgba(255,200,80,0.55)",
          letterSpacing: "0.08em",
          flexShrink: 0,
        }}>
          🎬 DIRECTOR — WASD or ↑↓←→ to pan camera · click Watch to follow survivor
        </div>
      )}

      {/* ── Zone content ── */}
      <div style={{
        flex:      1,
        overflowY: activeZone === "overview" ? "hidden" : "auto",
        padding:   activeZone === "overview" ? 0 : "20px",
        display:   "flex",
        flexDirection: "column",
        gap:       activeZone === "overview" ? 0 : 10,
      }}>
        {renderZone()}
      </div>

      {/* ── Bottom nav ── */}
      <BaseNav
        activeZone={activeZone}
        onZoneChange={setActiveZone}
        snapshot={s}
        baseStorage={baseStorage}
      />

      {/* ── Floating overlays ── */}
      <CrisisPanel crisisEvents={crisisEvents} onResolveCrisis={onResolveCrisis} baseStorage={baseStorage} />

      {reassignTarget && (
        <ReassignModal
          survivor={reassignTarget}
          onCommand={handleReassignCommand}
          onOpenWorkstation={() => {
            setWorkstationTarget(reassignTarget);
            setReassignTarget(null);
          }}
          onClose={() => setReassignTarget(null)}
        />
      )}

      {workstationTarget && (
        <WorkstationPicker
          survivor={workstationTarget}
          builtStructures={s.builtStructures ?? []}
          onAssign={wsId => {
            onHarvest?.({ type: "assignWorkstation", survivorId: workstationTarget.id, workstation: wsId });
            setWorkstationTarget(null);
          }}
          onClose={() => setWorkstationTarget(null)}
        />
      )}

      <AwayModal summary={awaySummary} onDismiss={onDismissAway} />
    </div>
  );
}