// src/Pages/DeadMiles/index.jsx
// Main orchestrator — lobby → waiting → worldmap → playing → gameover
// Supports level progression: Level 1 (hamlet) → Level 2+ (procedural highway)

import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import GameView from "./GameView";
import BaseView from "./BaseView";
import WorldMap from "./WorldMap";
import { useDeadMilesRoom } from "./useDeadMilesRoom";
import {
  applyOfflineBaseTick,
  pushActivity,
  craftItem,
  tickBaseAttacks,
  tickBaseResources,
  applyDeployCarry,
  DEFEND_BASE_HP_RESTORE,
  tickThreatTiers,
  tickSupplyRoutes,
  pushWorldEvent,
  maybeGenerateCrisis,
  DEPLOY_FUEL_PER_VEHICLE,
  DEPLOY_FOOD_PER_SURVIVOR,
} from "./deadMilesEngine";
import { saveWorldState, loadWorldState, deleteWorldStateSave } from "./saveSystem";
import {
  getDeployableRoster,
  markPartyDeployed,
  hydrateDeployParty,
  mergeSurvivorsToRoster,
} from "./survivorRoster";
import {
  makeDefaultHomeBase,
  homeBaseToSnapshot,
  applyHomeBaseAction,
  applyOfflineHomeBaseTick,
  homeRoster,
  mergeRunIntoHomeBase,
} from "./engine_homebase";
import { BASE_UPGRADE_TREE } from "./engine_constants"

// ─── Lobby ────────────────────────────────────────────────────────────────────

function Lobby({ onSolo, onResume, onRoomReady, hasSave }) {
  const [joinCode, setJoinCode] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleCreate() {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/deadmiles/rooms");
      onRoomReady({ ...data }, "p1");
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't create room.");
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/deadmiles/rooms/join", { join_code: code });
      onRoomReady(data, "p2");
    } catch (e) {
      setError(e?.response?.data?.detail || "Room not found.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-widest" style={{ color: "rgba(255,200,80,0.95)" }}>
            dead miles
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            survive. scavenge. keep moving.
          </p>
        </div>

        {/* How to play */}
        <div className="rounded-xl border p-4 space-y-2 text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          <p>You start in a small settlement. The world is huge — and overrun.</p>
          <p>Follow the <span style={{ color: "rgba(255,220,80,0.8)" }}>compass</span> to find other settlements, collect map fragments, and rescue survivors.</p>
          <p>Between settlements is the zombie sea. Drive fast.</p>
          <p style={{ color: "rgba(255,255,255,0.2)" }}>
            A second player can join mid-session as your co-driver.
          </p>
        </div>

        {/* Resume saved game */}
        {hasSave && (
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{
              background: "rgba(255,200,80,0.15)",
              border: "1px solid rgba(255,200,80,0.4)",
              color: "rgba(255,200,80,0.95)",
            }}>
            ▶ resume game
          </button>
        )}

        {/* Solo / New Game */}
        <button
          onClick={onSolo}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{
            background: hasSave ? "rgba(255,255,255,0.03)" : "rgba(255,200,80,0.1)",
            border: hasSave ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,200,80,0.25)",
            color: hasSave ? "rgba(255,255,255,0.4)" : "rgba(255,200,80,0.9)",
          }}>
          {hasSave ? "new game" : "play solo"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>co-op</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Create room */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
            opacity: loading ? 0.5 : 1,
          }}>
          {loading ? "creating…" : "create room"}
        </button>

        {/* Join room */}
        <div className="space-y-2">
          <input
            className="w-full py-3 px-4 rounded-xl text-center text-sm font-mono tracking-widest uppercase"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              outline: "none",
            }}
            placeholder="ENTER CODE"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim() || loading}
            className="w-full py-3 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: joinCode.trim() ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
              opacity: loading ? 0.5 : 1,
            }}>
            join room
          </button>
        </div>

        {error && (
          <p className="text-xs text-center" style={{ color: "rgba(255,100,100,0.8)" }}>{error}</p>
        )}
      </div>
    </main>
  );
}

// ─── Waiting screen (P1 waits for P2) ────────────────────────────────────────

function WaitingForP2({ room, onP2Joined }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(room.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!room?.id) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/deadmiles/rooms/${room.id}`);
        if (data.status === "active") { clearInterval(interval); onP2Joined(data); }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [room?.id]); // eslint-disable-line

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        waiting for player 2
      </p>
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>share this code</p>
        <div className="text-5xl font-mono font-light tracking-widest" style={{ color: "rgba(255,200,80,0.9)" }}>
          {room.join_code}
        </div>
      </div>
      <button
        onClick={copy}
        className="text-xs px-4 py-2 rounded-lg border transition-all"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
        {copied ? "copied ✓" : "copy code"}
      </button>
      <button
        onClick={() => onP2Joined(null)}
        className="text-xs"
        style={{ color: "rgba(255,255,255,0.2)" }}>
        play solo for now →
      </button>
    </main>
  );
}

// ─── Game over screen ─────────────────────────────────────────────────────────

function GameOver({ score, level, room, role, onRestart, onMenu, onReadyUp, partnerReady }) {
  const isVictory    = score?.survived;
  const isDefend     = score?.missionType === "defend";
  const isCoopDeath  = !!(room && score?.coopBothDowned);
  const [myReady, setMyReady] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  function handleReadyUp() {
    setMyReady(true);
    onReadyUp?.();
  }

  const showReadyUp = isCoopDeath && !isVictory;

  // Victory label varies by mission type
  const victoryLabel = isDefend ? "base defended" : "region mapped";

  return (
    <main className="min-h-screen bg-[#0a0d0f] text-white flex flex-col items-center justify-center gap-6 px-4"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}>

      <p className="text-xs tracking-widest uppercase" style={{ color: isVictory ? "rgba(120,255,150,0.7)" : "rgba(255,80,80,0.7)" }}>
        {isVictory ? victoryLabel : "didn't make it"}
      </p>

      <div className="text-center space-y-1">
        <div className="text-6xl font-light" style={{
          color: isVictory ? "rgba(120,255,150,0.9)" : "rgba(255,80,80,0.7)"
        }}>
          {score?.dayssurvived ?? 0}
        </div>
        <div className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          days survived
        </div>
      </div>

      {/* Death recap */}
      {score?.deathRecap && !isVictory && (
        <div className="text-center text-xs px-4 py-3 rounded-xl max-w-sm"
          style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "rgba(255,150,150,0.85)" }}>
          {score.deathRecap}
        </div>
      )}

      {score && (
        <div className="text-center text-xs space-y-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {(score.settlementsCleared ?? 0) > 0 && <div>{score.settlementsCleared} settlements explored</div>}
          {(score.zombiesKilled      ?? 0) > 0 && <div>{score.zombiesKilled} zombies killed</div>}
          {(score.buildingsSearched  ?? 0) > 0 && <div>{score.buildingsSearched} buildings searched</div>}
          {(score.survivorsFound     ?? 0) > 0 && <div>{score.survivorsFound} survivors found</div>}
          {/* Step 7: show resources carried back */}
          {((score.resourcesCollected?.food ?? 0) > 0 || (score.resourcesCollected?.scrap ?? 0) > 0) && (
            <div style={{ color: "rgba(120,210,80,0.7)" }}>
              hauled back: 🍖 {score.resourcesCollected.food ?? 0} food
              {" · "}🔩 {score.resourcesCollected.scrap ?? 0} scrap
            </div>
          )}
        </div>
      )}

      {isVictory && (
        <div className="text-center text-xs px-6 py-3 rounded-xl"
          style={{ background: "rgba(120,255,150,0.07)", border: "1px solid rgba(120,255,150,0.2)", color: "rgba(120,255,150,0.85)", maxWidth: 280 }}>
          {isDefend
            ? `Base HP restored by ${DEFEND_BASE_HP_RESTORE}. The horde was driven back.`
            : "You explored the whole region. Everyone you found made it out."}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {showReadyUp ? (
          <>
            <div className="flex gap-4 text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span style={{ color: myReady ? "rgba(120,255,150,0.9)" : "rgba(255,80,80,0.6)" }}>
                {myReady ? "✓ you" : "○ you"}
              </span>
              <span style={{ color: partnerReady ? "rgba(120,255,150,0.9)" : "rgba(255,255,255,0.3)" }}>
                {partnerReady ? "✓ partner" : "○ partner"}
              </span>
            </div>
            {!myReady ? (
              <button onClick={handleReadyUp}
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,200,80,0.08)", border: "1px solid rgba(255,200,80,0.2)", color: "rgba(255,200,80,0.85)" }}>
                ready up
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl text-sm text-center"
                style={{ background: "rgba(120,255,150,0.06)", border: "1px solid rgba(120,255,150,0.2)", color: "rgba(120,255,150,0.6)" }}>
                {partnerReady ? "starting…" : "waiting for partner…"}
              </div>
            )}
            <button onClick={onMenu}
              className="w-full py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              main menu
            </button>
          </>
        ) : (
          <>
            <button onClick={onRestart}
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{ background: "rgba(255,200,80,0.08)", border: "1px solid rgba(255,200,80,0.2)", color: "rgba(255,200,80,0.85)" }}>
              {isVictory ? "play again" : "try again"}
            </button>
            <button onClick={onMenu}
              className="w-full py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              main menu
            </button>
          </>
        )}
      </div>
    </main>
  );
}

// ─── Mission Return Card ──────────────────────────────────────────────────────
// Full debrief overlay shown when the player returns from a run.
// Shows: what loot landed in storage, vehicles extracted, survivor changes,
// then prompts player to manage the base.

function MissionReturnCard({ summary, onDismiss }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  if (!summary) return null;
  const { updated = [], died = [], recruited = [], missionWon, loot, vehicles, garageCount } = summary;
  const hasAnything = updated.length > 0 || died.length > 0 || recruited.length > 0 || loot || (vehicles ?? []).length > 0;
  if (!hasAnything) return null;

  const accent = missionWon ? "rgba(80,220,120," : "rgba(255,200,80,";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.7)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: "100%", maxWidth: 380,
          background: "#0d1215",
          border: `1px solid ${accent}0.25)`,
          borderRadius: 18,
          padding: "24px 22px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div style={{
            fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
            color: `${accent}0.65)`, marginBottom: 4,
          }}>
            {missionWon ? "Run Complete" : "Crew Returned"}
          </div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.9)", fontWeight: 300, letterSpacing: "0.02em" }}>
            Back at Home Base
          </div>
        </div>

        {/* Loot hauled */}
        {loot && Object.values(loot).some(v => v > 0) && (
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              📦 Added to Storage
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(loot).filter(([,v]) => v > 0).map(([k, v]) => {
                const icons = { food:"🌽", scrap:"⚙️", medicine:"💊", fuel:"⛽", ammo:"🔫", nails:"📌", wood:"🪵", seeds:"🌱", water:"💧", car_parts:"🔩" };
                return (
                  <div key={k} style={{
                    padding: "5px 10px", borderRadius: 7,
                    background: `${accent}0.07)`,
                    border: `1px solid ${accent}0.2)`,
                    fontSize: 12, color: `${accent}0.9)`,
                  }}>
                    {icons[k] ?? "●"} +{Math.floor(v)} {k.replace("_", " ")}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vehicles extracted */}
        {(vehicles ?? []).length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              🚗 Garage (+{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {vehicles.map((v, i) => {
                const icons = { car: "🚗", bike: "🚲", minivan: "🚐", monster_truck: "🚛" };
                const hpPct = Math.round((v.hp / (v.maxHp || v.hp)) * 100);
                return (
                  <div key={v.id ?? i} style={{
                    padding: "5px 10px", borderRadius: 7,
                    background: "rgba(120,200,255,0.07)",
                    border: "1px solid rgba(120,200,255,0.2)",
                    fontSize: 12, color: "rgba(120,200,255,0.85)",
                  }}>
                    {icons[v.vehicleType] ?? "🚗"} {(v.vehicleType ?? "vehicle").replace("_", " ")} {hpPct}% HP
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New survivors */}
        {recruited.length > 0 && (
          <SummarySection label="Recruited" names={recruited} color="rgba(120,200,255,0.85)" icon="➕" />
        )}

        {/* Returning crew */}
        {updated.length > 0 && (
          <SummarySection
            label={missionWon ? "Back safe" : "Returned wounded"}
            names={updated}
            color={missionWon ? `${accent}0.8)` : "rgba(255,200,80,0.8)"}
            icon={missionWon ? "✓" : "↩"}
          />
        )}

        {died.length > 0 && (
          <SummarySection label="Killed in action" names={died} color="rgba(255,80,80,0.85)" icon="✗" />
        )}

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5 }}>
            {recruited.length > 0
              ? `${recruited.length} new survivor${recruited.length !== 1 ? "s" : ""} need assignments. Head to the base.`
              : "Assign survivors to workstations to put your loot to work."}
          </div>
          <button
            onClick={onDismiss}
            style={{
              padding: "11px 0",
              borderRadius: 11,
              background: `${accent}0.12)`,
              border: `1px solid ${accent}0.3)`,
              color: `${accent}0.95)`,
              fontSize: 13,
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}>
            Manage Base →
          </button>
        </div>
      </div>
    </div>
  );
}

function SummarySection({ label, names, color, icon }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6,
      }}>
        {icon} {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {names.map(name => (
          <span key={name} style={{
            padding: "3px 9px",
            borderRadius: 5,
            background: `${color.replace("0.8", "0.1").replace("0.85", "0.1")}`,
            border: `1px solid ${color.replace("0.8", "0.25").replace("0.85", "0.25")}`,
            fontSize: 12,
            color,
          }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Home base hub (base-first reframe) ───────────────────────────────────────
// Renders BaseView from a snapshot synthesized off persistent worldState.homeBase
// + roster (see engine_homebase.homeBaseToSnapshot). BaseView is unchanged — it
// just receives home state instead of a live run snapshot. A floating toolbar
// adds the "send a team out" launch step and a menu exit.

function HomeBaseScreen({
  snapshot, activityLog, onAction,
  mode = "hub",            // "hub" = home (send a team out) | "peek" = mid-run glance home
  onGoRun, onMenu, onBack,
  crisisEvents, onResolveCrisis, awaySummary, onDismissAway,
  worldState, worldEvents, onDeploy, onAddRoute, onRemoveRoute,
  defaultTab,
  spectatorCam, onSpectatorCamChange, gameStateRef,
}) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <BaseView
        stateSnapshot={snapshot}
        activityLog={activityLog}
        onHarvest={onAction}
        onClose={mode === "peek" ? onBack : (onBack ?? onGoRun)}
        onEnterHome={onBack}
        defaultTab={defaultTab}
        crisisEvents={crisisEvents}
        onResolveCrisis={onResolveCrisis}
        awaySummary={awaySummary}
        onDismissAway={onDismissAway}
        worldState={mode === "hub" ? worldState : undefined}
        worldEvents={mode === "hub" ? worldEvents : undefined}
        onDeploy={mode === "hub" ? onDeploy : undefined}
        onAddRoute={mode === "hub" ? onAddRoute : undefined}
        onRemoveRoute={mode === "hub" ? onRemoveRoute : undefined}
        spectatorCam={spectatorCam}
        onSpectatorCamChange={onSpectatorCamChange}
        gameStateRef={gameStateRef}
      />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        display: "flex", gap: 10, justifyContent: "center",
        padding: 14, pointerEvents: "none", zIndex: 60,
      }}>
        {mode === "peek" ? (
          <button onClick={onBack} style={{
            pointerEvents: "auto", padding: "12px 22px", borderRadius: 12,
            background: "rgba(120,200,255,0.12)", border: "1px solid rgba(120,200,255,0.3)",
            color: "rgba(160,210,255,0.95)", fontSize: 13, letterSpacing: "0.05em", cursor: "pointer",
          }}>← Back to the run</button>
        ) : (
          <>
            <button onClick={onMenu} style={{
              pointerEvents: "auto", padding: "12px 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer",
            }}>⏻ Menu</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Default world state ──────────────────────────────────────────────────────

function makeDefaultWorldState() {
  return {
    levels: [
      { id: 0, status: "secured",    seed: null, baseHp: 100, threatTier: 0, isHomeBase: true },
      { id: 1, status: "unexplored", seed: null, threatTier: 1 },
      { id: 2, status: "unexplored", seed: null, threatTier: 2 },
      { id: 3, status: "unexplored", seed: null, threatTier: 2 },
      { id: 4, status: "unexplored", seed: null, threatTier: 3 },
      { id: 5, status: "unexplored", seed: null, threatTier: 3 },
      { id: 6, status: "unexplored", seed: null, threatTier: 3 },
      { id: 7, status: "unexplored", seed: null, threatTier: 4 },
    ],
    totalResources: { food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 },
    supplyRoutes: [],  // kept for save compatibility, unused
    roster: [],
    _survivorSeq: 0,
    homeBase: makeDefaultHomeBase(),
  };
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export default function DeadMilesGame() {
  const [phase,      setPhase]      = useState("lobby");
  const [room,       setRoom]       = useState(null);
  const [role,       setRole]       = useState("p1");
  const [finalScore, setFinalScore] = useState(null);
  const [level,      setLevel]      = useState(0);
  const [autoPlay,   setAutoPlay]   = useState(false);
  const [myReadyUp,      setMyReadyUp]      = useState(false);
  const [partnerReadyUp, setPartnerReadyUp] = useState(false);

  const [worldState, setWorldState] = useState(() => {
    const loaded = loadWorldState();
    if (loaded) {
      // Older saves predate the home base — seed a default so the hub always exists.
      if (!loaded.homeBase) loaded.homeBase = makeDefaultHomeBase();
      return loaded;
    }
    return makeDefaultWorldState();
  });

  // ── World events ticker (WorldMap sidebar) ─────────────────────────────────
  const [worldEvents, setWorldEvents] = useState([]);
  const worldEventsRef = useRef([]);
  // Keep ref in sync so interval callbacks can read latest without closure issues
  useEffect(() => { worldEventsRef.current = worldEvents; }, [worldEvents]);

  // ── Crisis events (BaseView notification panel) ────────────────────────────
  const [crisisEvents, setCrisisEvents] = useState([]);

  // ── Step 7: carry resources — pre-stock inventory built just before deploy ─
  // Stored as a ref so it's available synchronously in handleDeploy without a
  // render cycle.  GameView reads it via the `deployInventory` prop.
  const deployInventoryRef = useRef(null);
  const deployPartyRef     = useRef(null);   // Phase 0.3 — hydrated roster survivors for this mission

  // Phase 2: base screen
  const [screen,       setScreen]      = useState("play");
  const [spectatorCam, setSpectatorCam] = useState(null); // null = follow player; {x,y} = director free-cam
  const stateSnapshotRef               = useRef(null);
  const activityLogRef                 = useRef([]);
  const baseOpenedAtRef                = useRef(null);
  const [awaySummary, setAwaySummary]  = useState(null);
  const [homeAwaySummary, setHomeAwaySummary] = useState(null); // home production while you were out
  const [missionSummary, setMissionSummary] = useState(null); // Phase 4 return card

  // Task 2.2: ref to GameView's live stateRef — forwarded via onGetStateRef prop.
  // Used by the heartbeat interval to tick the run while the player is in base.
  const gameStateRefRef = useRef(null); // gameStateRefRef.current = stateRef (a ref of a ref)

  // ── Task 2.2: Heartbeat simulation ──────────────────────────────────────────
  // While the player is browsing base mid-run (screen === "base"), tick the run
  // in the background at a coarse 3-second interval so the autoplay doesn't freeze.
  // We write directly into GameView's stateRef (forwarded via onGetStateRef) so the
  // canvas loop picks up the updated state the instant the player drops back in.
  // Only active during non-homebase runs — the homebase map already lives in GameView.
  useEffect(() => {
    if (screen !== "base" || phase !== "playing" || level === 0) return;
    const HEARTBEAT_MS = 3000;
    const DT_SEC = HEARTBEAT_MS / 1000;

    const id = setInterval(() => {
      const stateRef = gameStateRefRef.current;
      const s = stateRef?.current;
      if (!s || !s.player || s.player.isDowned) return;

      // Move player toward compass target (simplified, no collision)
      const target = s.compassTarget ?? s._goHomeNow ? { x: s.hamletCx ?? s.player.x, y: 100 } : null;
      if (target) {
        const dx = target.x - s.player.x;
        const dy = target.y - s.player.y;
        const d  = Math.hypot(dx, dy);
        if (d > 50) {
          const spd = s.player.inVehicle ? 300 : 160;
          const move = Math.min(spd * DT_SEC, d - 50);
          s.player.x += (dx / d) * move;
          s.player.y += (dy / d) * move;
          // Move vehicle with player if driving
          if (s.player.inVehicle && s.vehicle) {
            s.vehicle.x = s.player.x;
            s.vehicle.y = s.player.y;
          }
        }
      }

      // Simplified zombie attrition — zombies close to player deal damage, some die
      const playerX = s.player.inVehicle ? (s.vehicle?.x ?? s.player.x) : s.player.x;
      const playerY = s.player.inVehicle ? (s.vehicle?.y ?? s.player.y) : s.player.y;
      for (const z of s.zombies ?? []) {
        if (z.dead) continue;
        const dz = Math.hypot(z.x - playerX, z.y - playerY);
        if (dz < 30 && !s.player.inVehicle) {
          // Zombie lands a hit — light damage per heartbeat
          s.player.hp = Math.max(0, (s.player.hp ?? 100) - 5);
          if (s.player.hp <= 0) {
            s.player.isDowned = true;
            clearInterval(id);
          }
        }
        // Zombies drift toward player slowly
        if (dz < 600) {
          const angle = Math.atan2(playerY - z.y, playerX - z.x);
          z.x += Math.cos(angle) * 32 * DT_SEC;
          z.y += Math.sin(angle) * 32 * DT_SEC;
        }
      }
    }, HEARTBEAT_MS);

    return () => clearInterval(id);
  }, [screen, phase, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseRef  = useRef(phase);
  const roleRef   = useRef(role);
  const levelRef  = useRef(level);
  const rosterRef = useRef(worldState.roster);
  useEffect(() => { phaseRef.current  = phase;  }, [phase]);
  useEffect(() => { roleRef.current   = role;   }, [role]);
  useEffect(() => { levelRef.current  = level;  }, [level]);
  useEffect(() => { rosterRef.current = worldState.roster; }, [worldState.roster]);

  // ── Auto-save worldState whenever it changes ───────────────────────────────
  useEffect(() => {
    saveWorldState(worldState);
  }, [worldState]);

  // ── Base-first: accrue home production for time spent away, on return home ──
  useEffect(() => {
    if (phase !== "home") return;
    const hb = worldState.homeBase ?? makeDefaultHomeBase();
    const res = applyOfflineHomeBaseTick(hb, worldState.roster, activityLogRef.current);
    const produced  = res.produced  ?? [];
    const harvested = res.harvested ?? [];
    const needs     = res.needs ?? { hungry: [], lowMorale: [] };
    if (produced.length || harvested.length || needs.hungry.length) {
      const net = {};
      for (const p of produced) net[p.resource] = (net[p.resource] ?? 0) + p.amount;
      if (harvested.length) net.food = (net.food ?? 0) + harvested.reduce((a, h) => a + h.amount, 0);
      setHomeAwaySummary({ produced, harvested, netResources: net, hungry: needs.hungry, lowMorale: needs.lowMorale });
    }
    // Bump ref so the adapter re-reads the mutated home state.
    setWorldState(prev => ({ ...prev, homeBase: { ...(prev.homeBase ?? hb) } }));
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Base attack interval (threat-tier-aware) ──────────────────────────────
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      let raid = null;
      setWorldState(prev => {
        // Step 3: home is raidable while you're away (not while present in the hub).
        const homeVulnerable = phaseRef.current !== "home";
        const { worldState: next, homeRaid } = tickBaseAttacks(prev, levelRef.current, worldEventsRef, homeVulnerable);
        raid = homeRaid;
        return next;
      });
      if (raid) {
        const bits = [];
        if (raid.woundedName) bits.push(`${raid.woundedName} was hurt`);
        if (raid.turretHit)   bits.push(`a turret took damage`);
        const detail = bits.length ? ` (${bits.join(", ")})` : "";
        pushActivity(activityLogRef.current, `⚔ Home base raided — ${raid.damage} damage${detail}`);
        if (raid.fell) {
          worldEventsRef.current = pushWorldEvent(
            worldEventsRef.current, "generic",
            { text: `🚨 Home base overrun — defenses are down, get back there` }
          );
          pushActivity(activityLogRef.current, `🚨 Home base overrun — raiders took supplies`);
        }
      }
      // Flush world events ref → state (done outside setWorldState to avoid batching issues)
      setWorldEvents([...worldEventsRef.current]);
    }, 30_000);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1: live home heartbeat - base ages in real time, everywhere.
  // Food depletes and survivors get hungry whether you're in the hub, on the
  // map, or out on a run.
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      setWorldState(prev => {
        const hb = prev.homeBase ?? makeDefaultHomeBase();
        const res = applyOfflineHomeBaseTick(hb, prev.roster, activityLogRef.current);
        const hungry = res?.needs?.hungry ?? [];
        if (hungry.length) {
          worldEventsRef.current = pushWorldEvent(
            worldEventsRef.current, "generic",
            { text: `🍽 ${hungry.length} at home went hungry — stores are short` }
          );
        }
        return { ...prev, homeBase: { ...hb }, roster: prev.roster ? [...prev.roster] : [] };
      });
      setWorldEvents([...worldEventsRef.current]);
    }, 15_000);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Threat tier escalation interval (every 60s) ────────────────────────────
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      setWorldState(prev => tickThreatTiers(prev));
    }, 60_000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Supply route tick (every 60s alongside resource gen) ──────────────────
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      setWorldState(prev => tickSupplyRoutes(prev));
    }, 60_000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Passive resource generation interval (Step 6) ─────────────────────────
  useEffect(() => {
    if (phase === "lobby" || phase === "waiting" || phase === "gameover") return;
    const id = setInterval(() => {
      setWorldState(prev => tickBaseResources(prev));

      // Step 2: crises fire on the persistent home roster (living, at base).
      const home = homeRoster(rosterRef.current ?? []).filter(r => (r.hp ?? 0) > 0);
      if (home.length) {
        const crisis = maybeGenerateCrisis(null, home);
        if (crisis) {
          setCrisisEvents(prev => [crisis, ...prev].slice(0, 5)); // max 5 pending at once
        }
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRoomId = (phase === "lobby" || phase === "waiting") ? null : room?.id ?? null;

  const handlers = useRef({
    onGameOver: ({ score }) => {
      if (phaseRef.current !== "gameover") {
        setFinalScore(score);
        setMyReadyUp(false);
        setPartnerReadyUp(false);
        if (score?.survived) {
          setPhase("home");
        } else {
          setPhase("gameover");
        }
      }
    },
    onRoomSeedUpdate: ({ seed, level: newLevel }) => {
      setRoom(prev => prev ? { ...prev, map_seed: seed } : null);
      if (newLevel != null) setLevel(newLevel);
    },
    onRestartRequest: ({ seed, level: newLevel }) => {
      if (phaseRef.current !== "gameover") return;
      setRoom(prev => prev ? { ...prev, map_seed: seed } : null);
      if (newLevel != null) setLevel(newLevel);
      setFinalScore(null);
      setMyReadyUp(false);
      setPartnerReadyUp(false);
      setPhase("playing");
    },
    onReadyUp: () => {
      setPartnerReadyUp(true);
    },
  }).current;

  const { sendRoomSeedUpdate, sendRestartRequest, sendReadyUp } = useDeadMilesRoom(activeRoomId, handlers);

  // ── World state helpers ────────────────────────────────────────────────────

  function markLevelActive(levelId) {
    setWorldState(prev => {
      const levels = prev.levels.map(l =>
        l.id === levelId && l.status === "unexplored"
          ? { ...l, status: "active" }
          : l
      );
      return { ...prev, levels };
    });
  }

  // After a run is completed, mark it cleared. Resources the player brought
  // back are already in homeBase.baseStorage via handleGameOver — no per-node pool.
  function markLevelCleared(levelId, score) {
    setWorldState(prev => {
      const levels = prev.levels.map(l => {
        if (l.id !== levelId) return l;
        if (l.id === 0) {
          // Home base: restore HP on successful defence
          const baseHpAfter = score?.defended
            ? Math.min(100, (l.baseHp ?? 0) + (score.baseHpRestored ?? DEFEND_BASE_HP_RESTORE))
            : (l.baseHp ?? 100);
          return { ...l, status: "secured", baseHp: baseHpAfter };
        }
        // Regular run destination — just mark cleared
        return { ...l, status: "cleared" };
      });

      // Unlock the next node in the chain
      const unlocked = levels.map(l =>
        l.id === levelId + 1 && l.status === "unexplored"
          ? { ...l, status: "unexplored" }
          : l
      );

      return { ...prev, levels: unlocked };
    });
  }

  // Keep markLevelSecured as an alias so any remaining call sites still work
  function markLevelSecured(levelId, score) {
    markLevelCleared(levelId, score);
  }

  // Supply routes removed — stubs kept so WorldMap prop references don't crash
  function handleAddRoute() {}
  function handleRemoveRoute() {}

  // ── Crisis event resolution ────────────────────────────────────────────────

  function handleResolveCrisis(crisisId, optionId) {
    // Step 2: resolve against the persistent roster + home stockpile (not a run snapshot).
    const crisis = crisisEvents.find(c => c.id === crisisId);
    const opt = crisis ? (crisis.options ?? []).find(o => o.id === optionId) : null;

    if (crisis && opt) {
      let canAfford = true;
      setWorldState(prev => {
        const hb = prev.homeBase ?? makeDefaultHomeBase();
        if (!hb.baseStorage) hb.baseStorage = { food: 0, scrap: 0, medicine: 0, fuel: 0, ammo: 0 };

        // ── Step 4a: Affordability gate — leave crisis pending if can't pay ──
        const affordable = Object.entries(opt.cost ?? {}).every(
          ([key, qty]) => (hb.baseStorage[key] ?? 0) >= qty
        );
        if (!affordable) { canAfford = false; return prev; }

        const roster = prev.roster ? [...prev.roster] : [];
        const rec = crisis.survivorId ? roster.find(r => r.id === crisis.survivorId) : null;

        // Pay the option's cost from the home stockpile.
        if (opt.cost) {
          for (const [key, qty] of Object.entries(opt.cost)) {
            hb.baseStorage[key] = Math.max(0, (hb.baseStorage[key] ?? 0) - qty);
          }
        }

        switch (opt.effect) {
          case "reassign":
            if (rec) {
              rec.morale = Math.min(100, (rec.morale ?? 50) + 25);
              pushActivity(activityLogRef.current, `${rec.name} reassigned — morale boosted`);
            }
            break;
          case "cure":
            if (rec) {
              rec.hp = Math.min(rec.maxHp ?? 80, (rec.hp ?? 0) + 30);
              rec.morale = Math.min(100, (rec.morale ?? 50) + 15);
              pushActivity(activityLogRef.current, `${rec.name} treated and recovering`);
            }
            break;
          case "penalty":
            if (rec) {
              rec.morale = Math.max(0, (rec.morale ?? 50) - 10);
              pushActivity(activityLogRef.current, `${rec.name}'s illness ran its course — morale suffered`);
            }
            break;
          case "dismiss":
            if (rec) {
              pushActivity(activityLogRef.current, `${rec.name} left the group`);
              const i = roster.findIndex(r => r.id === rec.id);
              if (i !== -1) roster.splice(i, 1);
            }
            break;
          case "investigate":
            for (const r of roster) {
              if (r.rosterStatus !== "dead") r.morale = Math.max(0, (r.morale ?? 50) - 5);
            }
            pushActivity(activityLogRef.current, `Investigation rattled the group — morale dipped`);
            break;
          case "absorb":
            pushActivity(activityLogRef.current, `Wrote off the missing supplies`);
            break;
          default:
            break;
        }

        return { ...prev, homeBase: { ...hb }, roster };
      });

      // Only mark resolved if we could afford it (canAfford set inside updater).
      // We use a timeout so the state update runs first.
      if (canAfford) {
        setCrisisEvents(prev => prev.map(c => (c.id === crisisId ? { ...c, resolved: true } : c)));
      }
    }
  }

  // ── Entry points ───────────────────────────────────────────────────────────

  // Home base away-production summary (surfaced on return home)
  // and the action handler that routes BaseView mutations to persistent state.
  // In index.jsx, inside handleHomeAction:
function handleHomeAction(action) {
  setWorldState(prev => {
    const hb = prev.homeBase ?? makeDefaultHomeBase();
    if (action?.type === "upgrade") {
      const upgrade = BASE_UPGRADE_TREE[action.upgradeId];
      if (!upgrade) return prev;
      // Check if already built
      if (hb.upgrades?.includes(action.upgradeId)) return prev;
      // Check prerequisite
      if (upgrade.requires && !hb.upgrades?.includes(upgrade.requires)) return prev;
      // Check cost
      for (const [res, qty] of Object.entries(upgrade.cost)) {
        if ((hb.baseStorage[res] ?? 0) < qty) return prev;
      }
      // Deduct cost
      for (const [res, qty] of Object.entries(upgrade.cost)) {
        hb.baseStorage[res] = Math.max(0, (hb.baseStorage[res] ?? 0) - qty);
      }
      // Add upgrade
      if (!hb.upgrades) hb.upgrades = [];
      hb.upgrades.push(action.upgradeId);
      pushActivity(activityLogRef.current, `🏛️ Built ${upgrade.label}`);
      return { ...prev, homeBase: { ...hb } };
    }
    // place_blueprint: GameView already placed the ghost and deducted cost from
    // live stateRef.baseStorage — we just sync the blueprint record to worldState
    // so it survives a reload or base-screen open.
    if (action?.type === "place_blueprint" && action.blueprint) {
      if (!hb.blueprints) hb.blueprints = [];
      // Avoid duplicates if this fires more than once
      if (!hb.blueprints.some(b => b.id === action.blueprint.id)) {
        hb.blueprints.push(action.blueprint);
      }
      // Also sync the baseStorage deduction — GameView already mutated stateRef,
      // so snapshot the live baseStorage back into worldState.
      const liveStorage = gameStateRefRef.current?.current?.baseStorage;
      if (liveStorage) hb.baseStorage = { ...liveStorage };
      return { ...prev, homeBase: { ...hb } };
    }
    // complete_blueprint: called when player finishes [F] building a workshop structure.
    // GameView passes the full builtStructure in the action to avoid a React batching race
    // where hb.blueprints may not yet contain the entry from place_blueprint.
    if (action?.type === "complete_blueprint") {
      // Remove the ghost blueprint from worldState (best-effort — may already be absent)
      if (hb.blueprints && action.blueprintId) {
        const idx = hb.blueprints.findIndex(bp => bp.id === action.blueprintId);
        if (idx !== -1) hb.blueprints.splice(idx, 1);
      }
      // Register the built structure directly from payload — no dependency on hb.blueprints
      if (action.builtStructure) {
        if (!hb.builtStructures) hb.builtStructures = [];
        const alreadyThere = hb.builtStructures.some(s => s.id === action.builtStructure.id);
        if (!alreadyThere) {
          hb.builtStructures.push(action.builtStructure);
          pushActivity(activityLogRef.current, `🏗 ${action.builtStructure.type} built! Assign a survivor to staff it.`);
        }
      }
      return { ...prev, homeBase: { ...hb }, roster: prev.roster ? [...prev.roster] : [] };
    }
    // All other actions — route through applyHomeBaseAction.
    const result = applyHomeBaseAction(hb, prev.roster, action, activityLogRef.current);
    return { ...prev, homeBase: { ...hb }, roster: prev.roster ? [...prev.roster] : [] };
  });
}

  function handleResume() {
    // worldState is already loaded from localStorage at init — just go to home base
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setWorldEvents([]);
    setCrisisEvents([]);
    setAutoPlay(false);
    setPhase("home");
  }

  function handleSolo() {
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setLevel(0);
    const fresh = makeDefaultWorldState();
    setWorldState(fresh);
    saveWorldState(fresh);
    setWorldEvents([]);
    setCrisisEvents([]);
    // Skip the hub tab menu — go straight into the homebase run with autoplayer.
    // Use fresh directly (worldState hasn't updated yet in this render cycle).
    deployInventoryRef.current = null;
    deployPartyRef.current = null;
    deployVehiclesRef.current = null;
    deployBlueprintsRef.current = fresh.homeBase?.blueprints ?? [];
    setAutoPlay(true);
    setFinalScore(null);
    setPhase("playing");
  }

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    setFinalScore(null);
    setLevel(0);
    const fresh = makeDefaultWorldState();
    setWorldState(fresh);
    saveWorldState(fresh);
    setWorldEvents([]);
    setCrisisEvents([]);
    setPhase(assignedRole === "p1" ? "waiting" : "playing");
  }

  function handleP2Joined(updatedRoom) {
    if (updatedRoom) setRoom(prev => ({ ...prev, ...updatedRoom }));
    setPhase("worldmap");  // CHANGED: P2 joins directly to world map
  }

  // Called by GameView when level ends (death or victory)
  function handleGameOver(score) {
    setFinalScore(score);
    setAutoPlay(false);
    setMyReadyUp(false);
    setPartnerReadyUp(false);

    // Phase 0.3 (d) — write survivors back to the roster on BOTH win and loss.
    // All worldState mutations are done in ONE atomic setWorldState call so that
    // no updater reads stale state from a sibling updater that hasn't flushed yet.
    const snap = stateSnapshotRef.current;

    setWorldState(prev => {
      // ── 1. Clone roster for mutation ────────────────────────────────────────
      const next = { ...prev, roster: prev.roster ? [...prev.roster] : [] };

      // ── 2. Merge live survivors back into persistent roster ──────────────────
      // Always run this, even if snap.survivors is empty — it's a no-op then and
      // ensures newly-found survivors (rosterStatus: DEPLOYED) get set to AT_BASE.
      const liveSurvivors = snap?.survivors ?? [];
      const summary = mergeSurvivorsToRoster(
        next,
        liveSurvivors,
        { missionWon: !!score?.survived, homeBaseId: levelRef.current }
      );

      // Also ensure any AT_BASE roster members that weren't in snap.survivors
      // (e.g. they wandered off screen on a homebase run) are reset to AT_BASE.
      if (levelRef.current === 0) {
        for (const r of next.roster) {
          if (r.rosterStatus === "deployed") r.rosterStatus = "at_base";
        }
      }

      // ── 3. Merge homeBase changes ────────────────────────────────────────────
      let hb = { ...(next.homeBase ?? makeDefaultHomeBase()) };

      if (snap && score?.survived) {
        if (levelRef.current === 0) {
          // Homebase run: fold structures, crops, turrets back in.
          // mergeRunIntoHomeBase now merges (rather than replaces) baseStorage.
          hb = mergeRunIntoHomeBase(hb, snap);
        } else {
          // Non-homebase run: add collected loot to baseStorage.
          const bs = { ...(hb.baseStorage ?? {}) };
          // score.resourcesCollected only has food+scrap; pick up everything else
          // from the full player inventory snapshot.
          const fullLoot = { ...(snap.player?.inventory ?? {}), ...(score?.resourcesCollected ?? {}) };
          for (const [key, qty] of Object.entries(fullLoot)) {
            const n = typeof qty === "number" ? qty : 0;
            if (n > 0) bs[key] = (bs[key] ?? 0) + n;
          }
          hb.baseStorage = bs;
          pushActivity(activityLogRef.current, `📦 Run loot stored — check your stockpile`);
        }
      }

      // ── 4. Extract vehicles from the run into the garage ────────────────────
      if (snap && score?.survived) {
        const allV = snap.vehicles ?? (snap.vehicle ? [snap.vehicle] : []);
        const extractedVehicles = allV.filter(v => {
          if (!v || v.hp <= 0) return false;
          return v.driver === "p1" || v.passenger === "p1" || v.occupied;
        });
        if (extractedVehicles.length > 0) {
          const existing = hb.garage ?? [];
          const existingIds = new Set(existing.map(v => v.id));
          const toAdd = extractedVehicles
            .filter(v => !existingIds.has(v.id))
            .map(v => ({
              id: v.id,
              vehicleType: v.vehicleType ?? "car",
              hp: Math.round(v.hp),
              maxHp: v.maxHp ?? v.hp,
              fuel: Math.round(v.fuel ?? 0),
              maxFuel: v.maxFuel ?? v.fuel ?? 100,
              upgrades: v.upgrades ?? [],
            }));
          const updated = existing.map(gv => {
            const runV = extractedVehicles.find(v => v.id === gv.id);
            if (!runV) return gv;
            return { ...gv, hp: Math.round(runV.hp), fuel: Math.round(runV.fuel ?? gv.fuel) };
          });
          hb.garage = [...updated, ...toAdd];
          console.log(`[garage] +${toAdd.length} new vehicles, ${updated.length} updated`);
        }
      }

      next.homeBase = hb;

      // ── 5. Build mission-return card payload ─────────────────────────────────
      const allV = snap?.vehicles ?? (snap?.vehicle ? [snap.vehicle] : []);
      const extractedV = allV.filter(v => v && v.hp > 0 && (
        v.driver === "p1" || v.passenger === "p1" || v.occupied
      ));
      const lootHauled = score?.resourcesCollected ? { ...score.resourcesCollected } : null;
      setMissionSummary({
        ...summary,
        missionWon: !!score?.survived,
        loot: lootHauled,
        vehicles: extractedV,
      });
      console.log("[roster] mission return:", summary);

      return next;
    });

    if (score?.survived) {
      markLevelSecured(levelRef.current, score);
      setWorldEvents(evts => pushWorldEvent(evts, "base_secured", { levelId: levelRef.current }));
      // Land player on the home hub where they can see the MissionReturnCard,
      // manage their base, assign survivors, and plan the next run.
      setLevel(0);
      setPhase("home");
    } else {
      setPhase("gameover");
    }
  }

  // ── Task 2.1/2.3: deploy vehicles and blueprints refs ────────────────────
  const deployVehiclesRef    = useRef(null);  // { "player"|survivorId → garageVehicle }
  const deployBlueprintsRef  = useRef(null);  // blueprint[] from homeBase

  // Called from WorldMap "Deploy" or "Send on Run" buttons
  // Step 7: compute carry inventory from world pool before mounting GameView
  // Step 8: derive missionType from level status
  // Task 2.1: vehicleAssignments = { "player"|survivorId → vehicleId }, stashTransfer = { food, water, ... }
  function handleDeploy(levelId, auto = false, selectedIds = null, vehicleAssignments = null, stashTransfer = null) {
    const newSeed = Date.now() & 0x7fffffff;
    const isHomeBase = levelId === 0;
    // Homebase always starts in manager (autoplay) mode — player is the director.
    // They can drop in any time via the Drop In button.
    const effectiveAuto = isHomeBase ? true : auto;

    // Step 7 — pre-stock carry inventory + Phase 0.3 — seed deploy party
    // Skip carry for homebase (player is already home)
    if (!isHomeBase) {
      setWorldState(prev => {
        const { inventory: carryInv, worldResources } = applyDeployCarry(
          {},
          prev.totalResources
        );
        // Task 2.1: merge stashTransfer into carry inventory and deduct from world pool
        let finalWorldResources = { ...worldResources };
        let finalCarryInv = { ...carryInv };
        if (stashTransfer) {
          for (const [k, qty] of Object.entries(stashTransfer)) {
            if (qty > 0) {
              finalCarryInv[k] = (finalCarryInv[k] ?? 0) + qty;
              finalWorldResources[k] = Math.max(0, (finalWorldResources[k] ?? 0) - qty);
            }
          }
        }
        deployInventoryRef.current = finalCarryInv;

        // Phase 0.3 (b) — build the deploy party from the roster for this base
        // If selectedIds provided (manual deploy via planning screen), filter to those only.
        let party = getDeployableRoster(prev, levelId);
        if (selectedIds && selectedIds.length > 0) {
          const idSet = new Set(selectedIds);
          party = party.filter(r => idSet.has(r.id));
        }
        if (party.length > 0) {
          markPartyDeployed(prev, party.map(r => r.id));
          deployPartyRef.current = hydrateDeployParty(party, 0, 0);
        } else {
          deployPartyRef.current = null;
        }

        // Task 2.1: resolve vehicle assignments from garage
        if (vehicleAssignments && Object.keys(vehicleAssignments).length > 0) {
          const garage = prev.homeBase?.garage ?? [];
          const resolved = {};
          for (const [assigneeId, vehicleId] of Object.entries(vehicleAssignments)) {
            if (!vehicleId) continue;
            const garageV = garage.find(v => v.id === vehicleId);
            if (garageV) resolved[assigneeId] = garageV;
          }
          deployVehiclesRef.current = Object.keys(resolved).length > 0 ? resolved : null;
        } else {
          deployVehiclesRef.current = null;
        }

        // Deduct carry from totalResources; recompute per-level totals remain intact
        // ── Step 4c: Deduct provisioning costs (fuel per vehicle, food per survivor) ──
        const partySize    = party.length;
        // Only count vehicles not being deployed via vehicleAssignments
        const assignedVehicleIds = new Set(Object.values(vehicleAssignments ?? {}));
        const garageVehicles = (prev.homeBase?.garage ?? []).filter(v => !v.destroyed && !assignedVehicleIds.has(v.id));
        const vehicleCount = Math.min(garageVehicles.length, Math.ceil(partySize / 2));
        const fuelCost     = vehicleCount * DEPLOY_FUEL_PER_VEHICLE;
        const foodCost     = partySize * DEPLOY_FOOD_PER_SURVIVOR;
        const provisionedResources = {
          ...finalWorldResources,
          fuel: Math.max(0, (finalWorldResources.fuel ?? 0) - fuelCost),
          food: Math.max(0, (finalWorldResources.food ?? 0) - foodCost),
        };
        if (fuelCost > 0 || foodCost > 0) {
          const parts = [];
          if (foodCost > 0) parts.push(`${foodCost} food`);
          if (fuelCost > 0) parts.push(`${fuelCost} fuel`);
          worldEventsRef.current = pushWorldEvent(
            worldEventsRef.current, "generic",
            { text: `🎒 Deploy provisioned: ${parts.join(", ")} deducted` }
          );
        }
        return { ...prev, totalResources: provisionedResources };
      });
    } else {
      deployInventoryRef.current = null;
      // Hydrate AT_BASE roster members so they wander around home base as live survivors.
      // deployPartyRef is consumed by GameView on mount to populate stateRef.current.survivors.
      // Use rosterRef.current instead of worldState.roster — handleDeploy captures worldState
      // as a closure value and may run before setWorldState (from handleGameOver) has flushed.
      const freshRoster = rosterRef.current ?? worldState.roster ?? [];
      const atBase = freshRoster.filter(r => r.rosterStatus === "at_base");
      if (atBase.length > 0) {
        // Spawn positions are re-anchored to actual player position inside GameView,
        // so (0,0) here is just a placeholder that gets overwritten on mount.
        deployPartyRef.current = hydrateDeployParty(atBase, 0, 0);
      } else {
        deployPartyRef.current = null;
      }
      deployVehiclesRef.current = null;
      // Task 2.3: pass blueprints into the homebase run so they appear in-game
      deployBlueprintsRef.current = worldState.homeBase?.blueprints ?? [];
    }

    setLevel(levelId);
    setAutoPlay(effectiveAuto);
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : null);
    if (room?.id) sendRoomSeedUpdate(newSeed, levelId);
    setFinalScore(null);
    if (!isHomeBase) markLevelActive(levelId);
    setPhase("playing");
  }

  // Derive the mission type for the level being deployed to
  function getMissionType(levelId) {
    if (levelId === 0) return "homebase";
    const lvl = worldState.levels.find(l => l.id === levelId);
    return lvl?.status === "under_attack" ? "defend" : "clear";
  }

  function handleReadyUp() {
    setMyReadyUp(true);
    if (room?.id) sendReadyUp(role);
  }

  function handleRestart() {
    const newSeed = Date.now() & 0x7fffffff;
    setRoom(prev => prev ? { ...prev, map_seed: newSeed } : null);
    if (room?.id) sendRestartRequest(newSeed, levelRef.current);
    setFinalScore(null);
    setAutoPlay(false);
    setMyReadyUp(false);
    setPartnerReadyUp(false);
    setPhase("playing");
  }

  // Co-op ready-up: when both players are ready, the host fires the restart
  useEffect(() => {
    if (phase !== "gameover") return;
    if (!room?.id) return;
    if (!myReadyUp || !partnerReadyUp) return;
    if (role === "p1") handleRestart();
  }, [myReadyUp, partnerReadyUp, phase, room?.id, role]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMenu() {
    setRoom(null);
    setRole("p1");
    setFinalScore(null);
    setLevel(1);
    setWorldEvents([]);
    setCrisisEvents([]);
    setPhase("lobby");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "lobby")    return <Lobby onSolo={handleSolo} onResume={handleResume} onRoomReady={handleRoomReady} hasSave={!!loadWorldState()} />;
  if (phase === "waiting")  return <WaitingForP2 room={room} onP2Joined={handleP2Joined} />;
  if (phase === "gameover") return (
    <GameOver
      score={finalScore}
      level={level}
      room={room}
      role={role}
      onRestart={handleRestart}
      onMenu={handleMenu}
      onReadyUp={handleReadyUp}
      partnerReady={partnerReadyUp}
    />
  );

  if (phase === "home") {
    const homeSnap = homeBaseToSnapshot(worldState.homeBase, worldState.roster);
    return (
      <>
        <HomeBaseScreen
          snapshot={homeSnap}
          mode="hub"
          activityLog={activityLogRef.current}
          onAction={handleHomeAction}
          onBack={() => handleDeploy(0)}
          onGoRun={() => setPhase("worldmap")}
          onMenu={handleMenu}
          crisisEvents={crisisEvents}
          onResolveCrisis={handleResolveCrisis}
          awaySummary={homeAwaySummary}
          onDismissAway={() => setHomeAwaySummary(null)}
          worldState={worldState}
          worldEvents={worldEvents}
          onDeploy={handleDeploy}
          onAddRoute={handleAddRoute}
          onRemoveRoute={handleRemoveRoute}
        />
        <MissionReturnCard
          summary={missionSummary}
          onDismiss={() => setMissionSummary(null)}
        />
      </>
    );
  }

  if (phase === "worldmap") {
    // WorldMap is now only accessible via the Deploy tab in BaseView.
    // Show home base BaseView with the Deploy tab pre-selected.
    const homeSnap = homeBaseToSnapshot(worldState.homeBase, worldState.roster);
    return (
      <>
        <HomeBaseScreen
          snapshot={homeSnap}
          mode="hub"
          activityLog={activityLogRef.current}
          onAction={handleHomeAction}
          onBack={() => handleDeploy(0)}
          onGoRun={null}
          onMenu={handleMenu}
          crisisEvents={crisisEvents}
          onResolveCrisis={handleResolveCrisis}
          awaySummary={homeAwaySummary}
          onDismissAway={() => setHomeAwaySummary(null)}
          worldState={worldState}
          worldEvents={worldEvents}
          onDeploy={handleDeploy}
          onAddRoute={handleAddRoute}
          onRemoveRoute={handleRemoveRoute}
          defaultTab="map"
        />
        <MissionReturnCard
          summary={missionSummary}
          onDismiss={() => setMissionSummary(null)}
        />
      </>
    );
  }

  if (phase === "playing") {
  const missionType = getMissionType(level);
  const isHomeBaseMission = level === 0;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {/* GameView always rendered — hidden behind BaseView when base is open,
          but stays alive so the sim keeps ticking and spectator cam works. */}
      <div style={{
        position: "absolute", inset: 0,
        // Dim slightly when base panel is open so the overlay reads better
        filter: screen === "base" ? "brightness(0.45)" : "none",
        transition: "filter 0.2s",
      }}>
        <GameView
          key={`${room?.map_seed ?? "solo"}-${level}`}
          room={room}
          role={role}
          level={level}
          missionType={missionType}
          deployInventory={deployInventoryRef.current}
          deploySurvivors={deployPartyRef.current}
          deployVehicles={deployVehiclesRef.current}
          deployBlueprints={deployBlueprintsRef.current}
          deployHomeBase={level === 0 ? worldState.homeBase : null}
          onGetStateRef={ref => { gameStateRefRef.current = ref; }}
          onGameOver={handleGameOver}
          onStateSnapshot={snap => { stateSnapshotRef.current = snap; }}
          onOpenBase={() => {
            baseOpenedAtRef.current = Date.now();
            setScreen("base");
          }}
          activityLog={activityLogRef.current}
          autoPlay={autoPlay}
          onDropIn={() => setAutoPlay(false)}
           onAutoplay={() => setAutoPlay(true)}
          spectatorCam={spectatorCam}
          onUpgradeBase={isHomeBaseMission ? (upgradeId) => {
            // Apply upgrade directly to homeBase
            setWorldState(prev => {
              const hb = prev.homeBase ?? makeDefaultHomeBase();
              const upgrade = BASE_UPGRADE_TREE[upgradeId];
              if (!upgrade) return prev;
              if (hb.upgrades?.includes(upgradeId)) return prev;
              if (upgrade.requires && !hb.upgrades?.includes(upgrade.requires)) return prev;
              // Check cost
              for (const [res, qty] of Object.entries(upgrade.cost)) {
                if ((hb.baseStorage[res] ?? 0) < qty) return prev;
              }
              // Deduct cost
              for (const [res, qty] of Object.entries(upgrade.cost)) {
                hb.baseStorage[res] = Math.max(0, (hb.baseStorage[res] ?? 0) - qty);
              }
              // Add upgrade
              if (!hb.upgrades) hb.upgrades = [];
              hb.upgrades.push(upgradeId);
              pushActivity(activityLogRef.current, `🏛️ Built ${upgrade.label}`);
              return { ...prev, homeBase: hb };
            });
          } : undefined}
          onHomeAction={isHomeBaseMission ? (action) => {
            handleHomeAction(action);
          } : undefined}
        />
      </div>

        {/* One base = home. Mid-run, [Tab] peeks home (run stays alive behind).
            At level 0 (homebase), show hub mode so the Deploy tab is available. */}
        {screen === "base" && (
          <HomeBaseScreen
            mode={isHomeBaseMission ? "hub" : "peek"}
            snapshot={homeBaseToSnapshot(worldState.homeBase, worldState.roster)}
            activityLog={activityLogRef.current}
            onAction={handleHomeAction}
            onBack={() => {
              baseOpenedAtRef.current = null;
              setSpectatorCam(null); // reset cam when returning to play
              setScreen("play");
            }}
            onMenu={isHomeBaseMission ? handleMenu : undefined}
            crisisEvents={[]}
            onResolveCrisis={handleResolveCrisis}
            awaySummary={null}
            onDismissAway={() => {}}
            worldState={isHomeBaseMission ? worldState : undefined}
            worldEvents={isHomeBaseMission ? worldEvents : undefined}
            onDeploy={isHomeBaseMission ? handleDeploy : undefined}
            onAddRoute={isHomeBaseMission ? handleAddRoute : undefined}
            onRemoveRoute={isHomeBaseMission ? handleRemoveRoute : undefined}
            spectatorCam={spectatorCam}
            onSpectatorCamChange={setSpectatorCam}
            gameStateRef={gameStateRefRef}
          />
        )}
      </div>
    );
  }

  return null;
}