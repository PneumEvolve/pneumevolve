import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BAIT_TYPES, NEEDLE_SWEEP_SPEED, REEL_DURATION,
  REEL_DRAIN_RATE, REEL_TAP_AMOUNT,
  FISHING_BODIES, FISHING_BODY_ORDER, FISHING_FISH,
  FISHING_CATCH_RATES, FISHING_BAIT_BONUS,
  FISHING_WORKER_UPGRADES, POND_COST, POND_IRON, POND_LUMBER, FISHING_WORKER_HIRE_COSTS,
  FISHING_PLAYER_UPGRADES, FISHING_PLAYER_UPGRADE_ORDER,
} from "../gameConstants";
import {
  getFishingWorkerInterval, getFishingWorkerHaul,
  getFishingWorkerGearTier, rollFishForBody, getTotalWorkersHired,
  isTownBuildingBuilt, hasPrestigeSkill,
  getPlayerFishingSweetSpotBonus, getPlayerFishingReelBonus, getPlayerFishingPatienceBonus, getPlayerFishingHaul,
} from "../gameEngine";

const SPEED_UPGRADES = ["speed_1", "speed_2"];
const HAUL_UPGRADES  = ["haul_1",  "haul_2"];
const GEAR_UPGRADES  = ["gear_good", "gear_expert"];

const POND_STYLES = `
  @keyframes ripple { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes bobber-idle { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
  @keyframes bobber-bite { 0% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(8px) rotate(-10deg); } 75% { transform: translateY(7px) rotate(-7deg); } 100% { transform: translateY(0) rotate(0deg); } }
  @keyframes slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

// ─── Needle bar ───────────────────────────────────────────────────────────────

function NeedleBar({ position, sweetSpotStart, sweetSpotWidth, onTap }) {
  const inZone = position >= sweetSpotStart && position <= sweetSpotStart + sweetSpotWidth;
  const center = sweetSpotStart + sweetSpotWidth / 2;
  const quality = Math.max(0, 1 - Math.abs(position - center) / (sweetSpotWidth / 2));
  return (
    <div onPointerDown={onTap} style={{ width: "100%", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      <div style={{
        position: "relative", height: "60px", background: "rgba(0,0,0,0.6)",
        borderRadius: "14px", overflow: "hidden",
        border: `2px solid ${inZone ? "rgba(74,222,128,0.7)" : "rgba(255,255,255,0.15)"}`,
        boxShadow: inZone ? "0 0 20px rgba(74,222,128,0.2)" : "none",
        transition: "border-color 0.08s, box-shadow 0.08s",
      }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${sweetSpotStart * 100}%`, width: `${sweetSpotWidth * 100}%`,
          background: inZone ? `rgba(74,222,128,${0.2 + quality * 0.4})` : "rgba(74,222,128,0.12)",
          borderLeft: "2px solid rgba(74,222,128,0.5)", borderRight: "2px solid rgba(74,222,128,0.5)",
          transition: "background 0.08s",
        }} />
        <div style={{
          position: "absolute", top: "20%", bottom: "20%",
          left: `${center * 100}%`, width: "2px",
          background: "rgba(74,222,128,0.7)", transform: "translateX(-50%)",
        }} />
        <div style={{
          position: "absolute", top: "8px", bottom: "8px",
          left: `${position * 100}%`, width: "3px", borderRadius: "2px",
          transform: "translateX(-50%)",
          background: inZone ? "#fbbf24" : "#f87171",
          boxShadow: inZone ? "0 0 12px #fbbf24" : "0 0 8px #f87171",
          transition: "background 0.06s, box-shadow 0.06s",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "0.78rem", fontWeight: 800,
          letterSpacing: "0.1em",
          color: inZone ? "rgba(74,222,128,0.95)" : "rgba(255,255,255,0.35)",
          pointerEvents: "none",
          textShadow: inZone ? "0 0 10px rgba(74,222,128,0.6)" : "none",
          transition: "color 0.08s",
        }}>
          {inZone ? `STOP! (${Math.round(quality * 100)}%)` : "TAP TO STOP"}
        </div>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: "0.58rem", color: "rgba(255,255,255,0.35)",
        marginTop: "0.2rem", padding: "0 4px",
      }}>
        <span>← miss</span>
        <span style={{ color: "rgba(74,222,128,0.5)" }}>● sweet spot</span>
        <span>miss →</span>
      </div>
    </div>
  );
}

// ─── Reel bar ─────────────────────────────────────────────────────────────────

function ReelBar({ progress, timeLeft, onTap }) {
  const pct = Math.max(0, Math.min(100, progress * 100));
  const urgent = timeLeft < 1.5;
  const color = pct > 60 ? "#4ade80" : pct > 30 ? "#f59e0b" : "#ef4444";
  return (
    <div onPointerDown={onTap} style={{ width: "100%", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "0.4rem", padding: "0 2px",
      }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em" }}>REEL IT IN</span>
        <span style={{
          fontSize: "0.75rem", fontWeight: 700,
          color: urgent ? "#ef4444" : "rgba(255,255,255,0.5)",
          animation: urgent ? "rw-pulse 0.5s ease-in-out infinite" : "none",
        }}>{timeLeft.toFixed(1)}s</span>
      </div>
      <div style={{
        position: "relative", height: "64px", background: "rgba(0,0,0,0.6)",
        borderRadius: "14px", overflow: "hidden",
        border: `2px solid ${urgent ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)"}`,
        transition: "border-color 0.2s",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}55, ${color}cc)`,
          borderRadius: "12px", transition: "background 0.2s", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "1.1rem", fontWeight: 900,
          letterSpacing: "0.18em", color: "#fff",
          textShadow: "0 2px 10px rgba(0,0,0,0.7)", pointerEvents: "none",
        }}>TAP TAP TAP!</div>
      </div>
    </div>
  );
}

// ─── Catch result card ────────────────────────────────────────────────────────

function CatchResultCard({ result, onDismiss }) {
  const fish = FISHING_FISH[result.fishId];
  const isRare = result.fishId === "rare";
  const escaped = !result.caught;
  const count = result.count ?? 1;
  const totalValue = (fish?.rawValue ?? 0) * count;
  return (
    <div style={{ animation: "slide-up 0.25s ease forwards" }}>
      <div style={{
        borderRadius: "14px", overflow: "hidden",
        border: `2px solid ${isRare ? "#fbbf24" : escaped ? "#ef4444" : "#4ade80"}`,
        background: isRare
          ? "linear-gradient(135deg, #3d2000, #5c3300)"
          : escaped
            ? "linear-gradient(135deg, #2d0a0a, #3d1010)"
            : "linear-gradient(135deg, #0a2d1a, #0f3d22)",
        boxShadow: isRare ? "0 0 40px rgba(251,191,36,0.4), inset 0 1px 0 rgba(251,191,36,0.2)" : "none",
      }}>
        <div style={{ padding: "1.1rem 1.1rem 0.9rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            fontSize: isRare ? "3.5rem" : escaped ? "2rem" : "2.4rem",
            lineHeight: 1, flexShrink: 0,
            filter: isRare ? "drop-shadow(0 0 16px #fbbf24)" : "none",
            opacity: escaped ? 0.5 : 1,
            position: "relative",
          }}>
            {escaped ? "💨" : fish?.emoji ?? "🐟"}
            {!escaped && count > 1 && (
              <span style={{
                position: "absolute", top: "-6px", right: "-10px",
                fontSize: "0.72rem", fontWeight: 900,
                background: isRare ? "#fbbf24" : "#4ade80",
                color: "#000", borderRadius: "999px",
                padding: "0.05rem 0.35rem", lineHeight: 1.4,
              }}>×{count}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isRare ? "1.05rem" : "0.9rem", fontWeight: 900,
              letterSpacing: "0.04em",
              color: isRare ? "#fbbf24" : escaped ? "#fca5a5" : "#86efac",
              marginBottom: "0.2rem",
              textShadow: isRare ? "0 0 12px rgba(251,191,36,0.5)" : "none",
            }}>
              {escaped
                ? "It got away!"
                : isRare
                  ? count > 1 ? `✨ ${count}× Rare catch!` : "✨ Rare catch!"
                  : count > 1
                    ? `${count}× ${fish?.name ?? "fish"} caught!`
                    : `Caught a ${fish?.name ?? "fish"}!`}
            </div>
            {!escaped && (
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                {fish?.name}{count > 1 ? ` ×${count}` : ""} · <span style={{ color: "#4ade80" }}>${totalValue}</span> raw value · added to inventory
              </div>
            )}
            {escaped && <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>Better luck next time</div>}
          </div>
        </div>
        <button onClick={onDismiss} style={{
          width: "100%", padding: "0.75rem",
          background: escaped ? "rgba(239,68,68,0.2)" : isRare ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.15)",
          border: "none",
          borderTop: `1px solid ${escaped ? "rgba(239,68,68,0.3)" : isRare ? "rgba(251,191,36,0.3)" : "rgba(74,222,128,0.2)"}`,
          color: escaped ? "#fca5a5" : isRare ? "#fbbf24" : "#86efac",
          fontSize: "0.82rem", fontWeight: 800, cursor: "pointer", letterSpacing: "0.08em",
        }}>
          {escaped ? "Try again →" : "🎣 Cast again →"}
        </button>
      </div>
    </div>
  );
}

// ─── Fish inventory ───────────────────────────────────────────────────────────

function FishInventory({ fish }) {
  const entries = Object.entries(fish ?? {}).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      {entries.map(([key, count]) => {
        const f = FISHING_FISH[key];
        const isRare = key === "rare";
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: isRare ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.1)",
            border: `1px solid ${isRare ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: "8px", padding: "0.28rem 0.6rem",
          }}>
            <span style={{ fontSize: "0.95rem" }}>{f?.emoji ?? "🐟"}</span>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.8rem" }}>{count}</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.62rem" }}>{f?.name}</span>
            {f?.rawValue > 0 && <span style={{ color: "#4ade80", fontSize: "0.58rem" }}>${f.rawValue}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bait row (minigame) ──────────────────────────────────────────────────────

function BaitRow({ game, selectedBait, onSelect }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", flexShrink: 0 }}>BAIT</span>
      <button
        onClick={() => onSelect(null)}
        style={{
          fontSize: "0.65rem", padding: "0.18rem 0.5rem", borderRadius: "6px", cursor: "pointer",
          background: !selectedBait ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${!selectedBait ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`,
          color: !selectedBait ? "#fff" : "rgba(255,255,255,0.4)",
          fontWeight: !selectedBait ? 700 : 400,
        }}
      >None</button>
      {Object.values(BAIT_TYPES).map((bait) => {
        const have = game.bait?.[bait.id] ?? 0;
        const bonus = FISHING_BAIT_BONUS[bait.id];
        const sel = selectedBait === bait.id;
        return (
          <button
            key={bait.id}
            onClick={() => have > 0 && onSelect(sel ? null : bait.id)}
            disabled={have <= 0}
            style={{
              fontSize: "0.65rem", padding: "0.18rem 0.5rem", borderRadius: "6px",
              cursor: have > 0 ? "pointer" : "default",
              background: sel ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${sel ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.12)"}`,
              color: sel ? "#fff" : have > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
              fontWeight: sel ? 700 : 400, opacity: have <= 0 ? 0.4 : 1,
            }}
          >
            {bait.emoji} {bait.name} ({have})
            {bonus && <span style={{ marginLeft: "0.25rem", color: "#fbbf24", fontSize: "0.58rem" }}>+{bonus.rarePct}%</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Recent catches ───────────────────────────────────────────────────────────

function RecentCatches({ catches }) {
  if (!catches.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>RECENT</span>
      {catches.map((c, i) => (
        <span key={c.id} style={{ fontSize: "1rem", opacity: 1 - i * 0.12, position: "relative" }}>
          {c.emoji}
          {(c.count ?? 1) > 1 && (
            <span style={{
              position: "absolute", top: "-4px", right: "-6px",
              fontSize: "0.48rem", fontWeight: 900, color: "#4ade80",
              background: "rgba(0,0,0,0.7)", borderRadius: "999px",
              padding: "0.02rem 0.22rem", lineHeight: 1.4,
            }}>×{c.count}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function matCostLabel(upgradeRequires) {
  if (!upgradeRequires) return null;
  const NAMES = {
    iron_ore: "Iron Ore", lumber: "Lumber",
    iron_fitting: "Iron Fitting", reinforced_crate: "Reinforced Crate", fine_tools: "Fine Tools",
  };
  return Object.entries(upgradeRequires).map(([k, v]) => `${v} ${NAMES[k] ?? k}`).join(" + ");
}
function canAffordMats(upgradeRequires, worldResources, forgeGoods) {
  if (!upgradeRequires) return true;
  for (const [k, qty] of Object.entries(upgradeRequires)) {
    const have = (worldResources?.[k] ?? 0) + (forgeGoods?.[k] ?? 0);
    if (have < qty) return false;
  }
  return true;
}

// ─── Worker upgrade tree ──────────────────────────────────────────────────────

function WorkerUpgradeTree({ label, upgradeIds, worker, game, bodyId, onUpgrade }) {
  const upgrades = worker.upgrades ?? [];
  const schoolBuilt = isTownBuildingBuilt(game, "school");
  const SCHOOL_GATED = ["haul_2", "gear_expert"];
  return (
    <div>
      <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "0.3rem", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {upgradeIds.map((uid) => {
          const u = FISHING_WORKER_UPGRADES[uid];
          const owned = upgrades.includes(uid);
          const requiresMet = !u.requires || upgrades.includes(u.requires);
          const schoolLocked = SCHOOL_GATED.includes(uid) && !schoolBuilt;
          const canAfford = (game.cash ?? 0) >= u.cost;
          const matsOk = canAffordMats(u.upgradeRequires, game.worldResources, game.forgeGoods);
          const canBuy = !owned && requiresMet && canAfford && matsOk && !schoolLocked;
          const locked = !owned && !requiresMet;
          const matLabel = matCostLabel(u.upgradeRequires);
          return (
            <div key={uid} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.28rem 0.45rem", borderRadius: "6px",
              background: owned ? "rgba(74,222,128,0.08)" : "rgba(0,0,0,0.3)",
              border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : schoolLocked && requiresMet ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.1)"}`,
              opacity: locked ? 0.4 : 1,
            }}>
              <div style={{ fontSize: "0.68rem" }}>
                <span style={{ fontWeight: 600, color: owned ? "#4ade80" : schoolLocked && requiresMet ? "#a78bfa" : "#fff" }}>
                  {owned ? "✓" : schoolLocked && requiresMet ? "🏫" : locked ? "🔒" : u.emoji} {u.name}
                </span>
                <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>
                  {schoolLocked && requiresMet ? "Requires School" : u.description}
                </span>
                {!owned && requiresMet && !schoolLocked && matLabel && (
                  <span style={{ display: "block", fontSize: "0.58rem", color: matsOk ? "#fbbf24" : "#ef4444", fontWeight: 600, marginTop: "0.1rem" }}>
                    {matLabel}
                  </span>
                )}
              </div>
              {!owned && !schoolLocked && (
                <button
                  onClick={() => canBuy && onUpgrade(bodyId, uid)}
                  disabled={!canBuy}
                  style={{
                    fontSize: "0.62rem", padding: "0.15rem 0.4rem", borderRadius: "6px",
                    cursor: canBuy ? "pointer" : "default", marginLeft: "0.4rem", flexShrink: 0,
                    background: canBuy ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${canBuy ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`,
                    color: canBuy ? "#fff" : "rgba(255,255,255,0.3)",
                    opacity: canBuy ? 1 : 0.6,
                  }}
                >
                  ${u.cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fishing worker card ──────────────────────────────────────────────────────

function FishingWorkerCard({ bodyId, worker, game, onUpgrade, onSetBait, onToggleAllowedFish }) {
  const [showUpgrades, setShowUpgrades] = useState(false);
  const interval = getFishingWorkerInterval(worker, game);
  const haul = getFishingWorkerHaul(worker);
  const gear = getFishingWorkerGearTier(worker);
  const timerPct = Math.min(100, ((worker.timer ?? 0) / interval) * 100);
  const assignedBait = worker.assignedBait;
  const baitHave = assignedBait ? (game.bait?.[assignedBait] ?? 0) : 0;
  const hasSelectiveHaul = hasPrestigeSkill(game, "selective_haul");
  const hasDeepWaters = hasPrestigeSkill(game, "deep_waters");
  const allFishIds = ["minnow", "bass", "perch", "rare"];
  const allowedFish = worker.allowedFish ?? allFishIds;

  return (
    <div style={{
      background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "12px", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "0.6rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>
            🎣 Fisher
            <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
              {gear} rod · {haul} fish/{interval}s
            </span>
          </div>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>
            {assignedBait
              ? `${BAIT_TYPES[assignedBait]?.emoji} ${BAIT_TYPES[assignedBait]?.name} (${baitHave} left)`
              : "No bait assigned"}
          </div>
        </div>
        <button
          onClick={() => setShowUpgrades((v) => !v)}
          style={{
            fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "6px", cursor: "pointer",
            background: showUpgrades ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${showUpgrades ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.15)"}`,
            color: "#fff",
          }}
        >
          ⚡ Upgrades
        </button>
      </div>

      {/* Timer bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          height: "100%", width: `${timerPct}%`,
          background: "#4ade80", transition: "width 1s linear",
        }} />
      </div>

      {/* Bait assignment */}
      <div style={{
        padding: "0.5rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>BAIT</span>
        <button
          onClick={() => onSetBait(bodyId, null)}
          style={{
            fontSize: "0.62rem", padding: "0.15rem 0.4rem", borderRadius: "6px", cursor: "pointer",
            background: !assignedBait ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${!assignedBait ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: !assignedBait ? "#fff" : "rgba(255,255,255,0.4)",
            fontWeight: !assignedBait ? 700 : 400,
          }}
        >None</button>
        {Object.values(BAIT_TYPES).map((bait) => {
          const have = game.bait?.[bait.id] ?? 0;
          const sel = assignedBait === bait.id;
          const bonus = FISHING_BAIT_BONUS[bait.id];
          return (
            <button
              key={bait.id}
              onClick={() => onSetBait(bodyId, bait.id)}
              style={{
                fontSize: "0.62rem", padding: "0.15rem 0.4rem", borderRadius: "6px", cursor: "pointer",
                background: sel ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${sel ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`,
                color: sel ? "#fff" : have > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                fontWeight: sel ? 700 : 400,
              }}
            >
              {bait.emoji} {bait.name} ({have}){bonus && ` +${bonus.rarePct}%`}
            </button>
          );
        })}
      </div>

      {/* Selective Haul — only visible with the skill */}
      {hasSelectiveHaul && (
        <div style={{
          padding: "0.5rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.6rem", color: "#a78bfa", letterSpacing: "0.06em", fontWeight: 700 }}>🎯 HAUL</span>
          {allFishIds.map((fishId) => {
            const fish = FISHING_FISH[fishId];
            const isAllowed = allowedFish.includes(fishId);
            const isMinnow = fishId === "minnow";
            // deep_waters auto-skips minnows regardless of toggle
            const effectivelyBlocked = isMinnow && hasDeepWaters;
            return (
              <button
                key={fishId}
                onClick={() => !effectivelyBlocked && onToggleAllowedFish(bodyId, fishId)}
                style={{
                  fontSize: "0.62rem", padding: "0.15rem 0.45rem", borderRadius: "6px",
                  cursor: effectivelyBlocked ? "default" : "pointer",
                  background: effectivelyBlocked
                    ? "rgba(255,255,255,0.03)"
                    : isAllowed ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${effectivelyBlocked ? "rgba(255,255,255,0.07)" : isAllowed ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.1)"}`,
                  color: effectivelyBlocked ? "rgba(255,255,255,0.2)" : isAllowed ? "#fff" : "rgba(255,255,255,0.35)",
                  fontWeight: isAllowed && !effectivelyBlocked ? 700 : 400,
                  textDecoration: effectivelyBlocked ? "line-through" : "none",
                }}
              >
                {fish.emoji} {fish.name}
                {effectivelyBlocked && <span style={{ marginLeft: "0.2rem", fontSize: "0.55rem" }}>⛔</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Upgrade trees */}
      {showUpgrades && (
        <div style={{
          padding: "0.6rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: "0.6rem",
        }}>
          <WorkerUpgradeTree label="⚡ SPEED"    upgradeIds={SPEED_UPGRADES} worker={worker} game={game} bodyId={bodyId} onUpgrade={onUpgrade} />
          <WorkerUpgradeTree label="📦 HAUL"     upgradeIds={HAUL_UPGRADES}  worker={worker} game={game} bodyId={bodyId} onUpgrade={onUpgrade} />
          <WorkerUpgradeTree label="🎣 GEAR"     upgradeIds={GEAR_UPGRADES}  worker={worker} game={game} bodyId={bodyId} onUpgrade={onUpgrade} />
        </div>
      )}
    </div>
  );
}

// ─── Fishing bodies panel ─────────────────────────────────────────────────────

function FishingBodiesPanel({ game, onUnlockBody, onHireWorker, onUpgradeWorker, onSetWorkerBait, onFireWorker, onToggleAllowedFish }) {
  const fishing = game.fishing ?? {};
  const bodies = fishing.bodies ?? {};
  const totalHired = getTotalWorkersHired(game);
  const atWorkerCap = totalHired >= Math.floor(game.town?.people ?? 0);

  return (
    <div style={{
      background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "12px", overflow: "hidden",
    }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
          🎣 Fishing Workers
        </div>
        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", marginTop: "0.1rem" }}>
          One passive fisher per water body · uses a town worker slot
        </div>
      </div>

      <div style={{ padding: "0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {FISHING_BODY_ORDER.map((bodyId, idx) => {
          const bodyDef = FISHING_BODIES[bodyId];
          const bodyState = bodies[bodyId] ?? { unlocked: false, worker: null };
          const unlocked = bodyState.unlocked;
          const worker = bodyState.worker;
          const workerHired = worker?.hired === true;
          const prevBodyId = idx > 0 ? FISHING_BODY_ORDER[idx - 1] : null;
          const prevUnlocked = !prevBodyId || bodies[prevBodyId]?.unlocked;
          const matCost = bodyDef.materialCost ?? {};
          const canAffordMats = Object.entries(matCost).every(([key, needed]) => {
            const have = (game.worldResources?.[key] ?? 0) + (game.forgeGoods?.[key] ?? 0);
            return have >= needed;
          });
          const canAffordCash = (game.cash ?? 0) >= bodyDef.unlockCost;
          const canAffordUnlock = canAffordCash && canAffordMats;
          const canUnlock = !unlocked && prevUnlocked && canAffordUnlock && bodyDef.unlockCost > 0;
          const HIRE_COST = FISHING_WORKER_HIRE_COSTS[bodyId] ?? 75;
          const canAffordHire = (game.cash ?? 0) >= HIRE_COST;
          const canHire = unlocked && !workerHired && !atWorkerCap && canAffordHire;

          return (
            <div key={bodyId}>
              {/* Body header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: (unlocked && workerHired) ? "0.5rem" : "0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>{bodyDef.emoji}</span>
                  <div>
                    <div style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      color: unlocked ? "#fff" : "rgba(255,255,255,0.3)",
                    }}>
                      {bodyDef.name}
                    </div>
                    <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>
                      {unlocked
                        ? workerHired ? "Fisher assigned" : "No fisher yet"
                        : bodyDef.unlockCost === 0 ? "Starter" : (() => {
                            const matCost = bodyDef.materialCost ?? {};
                            const matStr = Object.entries(matCost).map(([k, v]) => {
                              const labels = { iron_ore: "🪨", lumber: "🪵", iron_fitting: "🔩", reinforced_crate: "📦" };
                              return `${labels[k] ?? k}×${v}`;
                            }).join(" ");
                            return `$${bodyDef.unlockCost.toLocaleString()} + ${matStr}`;
                          })()}
                    </div>
                  </div>
                </div>

                {/* Unlock button */}
                {!unlocked && bodyDef.unlockCost > 0 && (
                  <button
                    onClick={() => onUnlockBody(bodyId)}
                    disabled={!canUnlock}
                    style={{
                      fontSize: "0.68rem", padding: "0.22rem 0.6rem", borderRadius: "8px",
                      cursor: canUnlock ? "pointer" : "default",
                      background: canUnlock ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${canUnlock ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`,
                      color: canUnlock ? "#fff" : "rgba(255,255,255,0.25)",
                      fontWeight: 600, opacity: prevUnlocked ? 1 : 0.4,
                    }}
                  >
                    {!prevUnlocked ? "🔒 Locked" : (() => {
                      const matCost = bodyDef.materialCost ?? {};
                      const labels = { iron_ore: "🪨", lumber: "🪵", iron_fitting: "🔩", reinforced_crate: "📦" };
                      const matStr = Object.entries(matCost).map(([k, v]) => {
                        const have = Math.floor((game.worldResources?.[k] ?? 0) + (game.forgeGoods?.[k] ?? 0));
                        const ok = have >= v;
                        return `${labels[k] ?? k}×${v}${ok ? "✓" : ` (${have})`}`;
                      }).join(" ");
                      const cashOk = (game.cash ?? 0) >= bodyDef.unlockCost;
                      return `Unlock — $${bodyDef.unlockCost.toLocaleString()}${cashOk ? "✓" : ""} ${matStr}`;
                    })()}
                  </button>
                )}

                {/* Hire button — shown when unlocked but no worker yet */}
                {unlocked && !workerHired && (
                  <button
                    onClick={() => canHire && onHireWorker(bodyId)}
                    disabled={!canHire}
                    style={{
                      fontSize: "0.68rem", padding: "0.22rem 0.6rem", borderRadius: "8px",
                      cursor: canHire ? "pointer" : "default",
                      background: canHire ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${canHire ? "rgba(74,222,128,0.6)" : "rgba(255,255,255,0.1)"}`,
                      color: canHire ? "#fff" : "rgba(255,255,255,0.25)",
                      fontWeight: 600,
                    }}
                  >
                    {atWorkerCap ? "👥 Town full" : canAffordHire ? `Hire Fisher $${HIRE_COST}` : `Need $${HIRE_COST}`}
                  </button>
                )}

                {/* Active badge */}
                {/* Active badge + fire button */}
{unlocked && workerHired && (
  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
    <span style={{ fontSize: "0.62rem", color: "#4ade80", fontWeight: 600 }}>✓ Fishing</span>
    <button
      onClick={() => onFireWorker(bodyId)}
      style={{
        fontSize: "0.6rem", padding: "0.15rem 0.4rem", borderRadius: "6px", cursor: "pointer",
        background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
        color: "#ef4444", fontWeight: 600,
      }}
    >
      Fire
    </button>
  </div>
)}
              </div>

              {/* Worker card */}
              {unlocked && workerHired && worker && (
                <FishingWorkerCard
                  bodyId={bodyId}
                  worker={worker}
                  game={game}
                  onUpgrade={onUpgradeWorker}
                  onSetBait={onSetWorkerBait}
                  onToggleAllowedFish={onToggleAllowedFish}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main PondZone ────────────────────────────────────────────────────────────

// ─── Player upgrades panel ────────────────────────────────────────────────────

function PlayerUpgradesPanel({ game, onBuyUpgrade }) {
  const [open, setOpen] = useState(false);
  const owned = game.fishing?.playerUpgrades ?? [];
  const cash = game.cash ?? 0;

  const TREE_META = {
    rod:      { label: "🪝 Rod",      subtitle: "Wider sweet spot" },
    reel:     { label: "⏱️ Reel",     subtitle: "More progress per tap" },
    patience: { label: "🐢 Patience", subtitle: "Slower needle sweep" },
    haul:     { label: "🧺 Haul",     subtitle: "Catch multiple fish per reel" },
  };

  return (
    <div style={{
      background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "12px", overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", padding: "0.6rem 0.85rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", color: "#fff",
        }}
      >
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em", textAlign: "left" }}>
            🪝 Your Gear Upgrades
          </div>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", marginTop: "0.1rem", textAlign: "left" }}>
            Improve your personal fishing minigame
          </div>
        </div>
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          padding: "0.5rem 0.85rem 0.75rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          {Object.entries(FISHING_PLAYER_UPGRADE_ORDER).map(([tree, ids]) => {
            const meta = TREE_META[tree];
            return (
              <div key={tree}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem", letterSpacing: "0.06em" }}>
                  {meta.label} <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>— {meta.subtitle}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {ids.map((uid) => {
                    const u = FISHING_PLAYER_UPGRADES[uid];
                    const isOwned = owned.includes(uid);
                    const requiresMet = !u.requires || owned.includes(u.requires);
                    const canAfford = cash >= u.cost;
                    const canBuy = !isOwned && requiresMet && canAfford;
                    const locked = !isOwned && !requiresMet;
                    return (
                      <div key={uid} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.28rem 0.45rem", borderRadius: "6px",
                        background: isOwned ? "rgba(74,222,128,0.08)" : "rgba(0,0,0,0.3)",
                        border: `1px solid ${isOwned ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`,
                        opacity: locked ? 0.4 : 1,
                      }}>
                        <div style={{ fontSize: "0.68rem" }}>
                          <span style={{ fontWeight: 600, color: isOwned ? "#4ade80" : "#fff" }}>
                            {isOwned ? "✓" : locked ? "🔒" : u.emoji} {u.name}
                          </span>
                          <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>
                            {u.description}
                          </span>
                        </div>
                        {!isOwned && requiresMet && (
                          <button
                            onClick={() => canBuy && onBuyUpgrade(uid)}
                            disabled={!canBuy}
                            style={{
                              fontSize: "0.62rem", padding: "0.15rem 0.4rem", borderRadius: "6px",
                              cursor: canBuy ? "pointer" : "default", marginLeft: "0.4rem", flexShrink: 0,
                              background: canBuy ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)",
                              border: `1px solid ${canBuy ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`,
                              color: canBuy ? "#fff" : "rgba(255,255,255,0.3)",
                            }}
                          >
                            ${u.cost}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main PondZone ────────────────────────────────────────────────────────────

export default function PondZone({
  game,
  onBuyPond,
  onCatchFish,
  onUnlockFishingBody,
  onSetFishingActiveBody,
  onHireFishingWorker,
  onUpgradeFishingWorker,
  onSetFishingWorkerBait,
  onFireFishingWorker,
  onToggleFishingWorkerAllowedFish,
  onBuyFishingPlayerUpgrade,
}) {
  const fishing = game.fishing ?? {};
  const pondOwned = fishing.bodies?.pond?.unlocked === true;
  const activeBody = fishing.activeBody ?? "pond";
  const activeBodyDef = FISHING_BODIES[activeBody] ?? FISHING_BODIES.pond;

  const [phase, setPhase] = useState("idle");
  const [needlePos, setNeedlePos] = useState(0.1);
  const [needleDir, setNeedleDir] = useState(1);
  const [sweetSpotStart, setSweetSpotStart] = useState(0.3);
  const [needleQuality, setNeedleQuality] = useState(0);
  const [reelProgress, setReelProgress] = useState(0);
  const [reelTimeLeft, setReelTimeLeft] = useState(REEL_DURATION);
  const [catchResult, setCatchResult] = useState(null);
  const [selectedBait, setSelectedBait] = useState(null);
  const [lastCatches, setLastCatches] = useState([]);

  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const phaseRef = useRef(phase);
  const needleDirRef = useRef(needleDir);
  const needlePosRef = useRef(needlePos);
  const biteTimerRef = useRef(null);
  const reelProgressRef = useRef(0);

  const catBonus = (game.pets?.cat?.mood ?? 0) >= 50 ? 0.20 : 0;
  const playerSweetSpotBonus = getPlayerFishingSweetSpotBonus(game);
  const playerReelBonus = getPlayerFishingReelBonus(game);
  const playerPatienceBonus = getPlayerFishingPatienceBonus(game);
  const playerHaul = getPlayerFishingHaul(game);

  const baseSweetSpot = 0.25;
  const effectiveSweetSpotWidth = Math.min(0.6, baseSweetSpot * (1 + catBonus + playerSweetSpotBonus));
  const effectiveReelTapAmount = REEL_TAP_AMOUNT * (1 + playerReelBonus);
  const effectiveNeedleSpeed = NEEDLE_SWEEP_SPEED * (1 - playerPatienceBonus);

  const effectiveNeedleSpeedRef = useRef(effectiveNeedleSpeed);
  effectiveNeedleSpeedRef.current = effectiveNeedleSpeed;
  const effectiveReelTapAmountRef = useRef(effectiveReelTapAmount);
  effectiveReelTapAmountRef.current = effectiveReelTapAmount;

  phaseRef.current = phase;
  needleDirRef.current = needleDir;
  needlePosRef.current = needlePos;

  const BITE_MIN = 1500;
  const BITE_MAX = 4000;

  const runLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;
    const p = phaseRef.current;

    if (p === "needle") {
      const dir = needleDirRef.current;
      let next = needlePosRef.current + effectiveNeedleSpeedRef.current * dt * dir;
      let newDir = dir;
      if (next >= 1) { next = 1; newDir = -1; }
      if (next <= 0) { next = 0; newDir = 1; }
      needlePosRef.current = next; setNeedlePos(next);
      if (newDir !== dir) { needleDirRef.current = newDir; setNeedleDir(newDir); }
    }

    if (p === "reel") {
      const newProgress = Math.max(0, reelProgressRef.current - REEL_DRAIN_RATE * dt);
      reelProgressRef.current = newProgress;
      setReelProgress(newProgress);
      setReelTimeLeft((prev) => {
        const next = prev - dt;
        if (next <= 0) {
          setCatchResult({ caught: false, fishId: "bass" });
          setPhase("result"); phaseRef.current = "result";
          return 0;
        }
        return next;
      });
    }

    animRef.current = requestAnimationFrame(runLoop);
  }, []);

  useEffect(() => {
    if (phase === "needle" || phase === "reel") {
      lastTimeRef.current = null;
      animRef.current = requestAnimationFrame(runLoop);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, runLoop]);

  function handleCast() {
    if (phase !== "idle") return;
    setPhase("waiting"); phaseRef.current = "waiting";
    const biteMs = BITE_MIN + Math.random() * (BITE_MAX - BITE_MIN);
    biteTimerRef.current = setTimeout(() => {
      const margin = 0.05;
      const maxStart = 1 - effectiveSweetSpotWidth - margin;
      const newStart = margin + Math.random() * (maxStart - margin);
      setSweetSpotStart(newStart);
      const startPos = Math.random() < 0.5 ? 0.02 : 0.98;
      needlePosRef.current = startPos; setNeedlePos(startPos);
      const newDir = startPos < 0.5 ? 1 : -1;
      needleDirRef.current = newDir; setNeedleDir(newDir);
      setPhase("needle"); phaseRef.current = "needle";
    }, biteMs);
  }

  function handleNeedleTap(e) {
    e?.preventDefault();
    if (phase !== "needle") return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const pos = needlePosRef.current;
    const inZone = pos >= sweetSpotStart && pos <= sweetSpotStart + effectiveSweetSpotWidth;
    if (!inZone) {
      setCatchResult({ caught: false, fishId: "minnow" });
      setPhase("result"); phaseRef.current = "result";
      return;
    }
    const center = sweetSpotStart + effectiveSweetSpotWidth / 2;
    const quality = Math.max(0, 1 - Math.abs(pos - center) / (effectiveSweetSpotWidth / 2));
    const initialProgress = 0.15 + quality * 0.2;
    setNeedleQuality(quality);
    reelProgressRef.current = initialProgress;
    setReelProgress(initialProgress);
    setReelTimeLeft(REEL_DURATION);
    lastTimeRef.current = null;
    setPhase("reel"); phaseRef.current = "reel";
  }

  function handleReelTap(e) {
    e?.preventDefault();
    if (phaseRef.current !== "reel") return;
    const next = reelProgressRef.current + effectiveReelTapAmountRef.current;
    if (next >= 1) {
      reelProgressRef.current = 1;
      setReelProgress(1);
      const gearTier = needleQuality > 0.85 ? "expert" : needleQuality > 0.5 ? "good" : "basic";
      const fishId = rollFishForBody(activeBody, gearTier, selectedBait);
      const fish = FISHING_FISH[fishId];
      onCatchFish?.(fishId, selectedBait, playerHaul);
      setCatchResult({ caught: true, fishId, count: playerHaul });
      setLastCatches((p) => [
        { fishId, emoji: fish?.emoji ?? "🐟", id: Date.now() + Math.random(), count: playerHaul },
        ...p,
      ].slice(0, 6));
      setPhase("result"); phaseRef.current = "result";
    } else {
      reelProgressRef.current = next;
      setReelProgress(next);
    }
  }

  function handleDismiss() {
    setCatchResult(null); setPhase("idle"); phaseRef.current = "idle";
    needlePosRef.current = 0.1; setNeedlePos(0.1); setNeedleDir(1);
    reelProgressRef.current = 0; setReelProgress(0); setNeedleQuality(0);
  }

  // ── Buy pond screen ────────────────────────────────────────────────────────
  if (!pondOwned) {
    const hasIron = (game.worldResources?.iron_ore ?? 0) >= POND_IRON;
    const hasLumber = (game.worldResources?.lumber ?? 0) >= POND_LUMBER;
    const canAfford = hasIron && hasLumber;
    return (
      <div style={{
        background: "linear-gradient(135deg, #071929, #0c3356)",
        borderRadius: "16px", padding: "2.5rem 1.5rem",
        textAlign: "center", border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🎣</div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", marginBottom: "0.4rem", letterSpacing: "0.04em" }}>
          Build a Pond
        </h3>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: "250px", margin: "0 auto 1.5rem" }}>
          Fish manually for rare catches. Hire a worker for passive income. Unlock lake, river and ocean for better fish.
        </p>
        <button
          onClick={onBuyPond}
          disabled={!canAfford}
          style={{
            background: canAfford ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${canAfford ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: "12px", padding: "0.7rem 1.75rem",
            fontSize: "0.82rem", fontWeight: 700,
            color: canAfford ? "#fff" : "rgba(255,255,255,0.25)",
            cursor: canAfford ? "pointer" : "default", letterSpacing: "0.04em",
          }}
        >
          {canAfford
            ? `🎣 Build Pond — 🪨×${POND_IRON} 🪵×${POND_LUMBER}`
            : `Need 🪨 Iron Ore ×${POND_IRON}${hasIron ? " ✓" : ` (have ${Math.floor(game.worldResources?.iron_ore ?? 0)})`} 🪵 Lumber ×${POND_LUMBER}${hasLumber ? " ✓" : ` (have ${Math.floor(game.worldResources?.lumber ?? 0)})`}`}
        </button>
      </div>
    );
  }

  const fishInventory = fishing.fish ?? {};
  const hasFish = Object.values(fishInventory).some((v) => v > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", colorScheme: "dark", color: "#fff" }}>
      <style>{POND_STYLES}</style>

      {/* Body selector tabs */}
<div style={{
  display: "flex", gap: "0.35rem",
  background: "#0a1628",
  padding: "0.5rem",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
}}>
  {FISHING_BODY_ORDER.map((bodyId) => {
    const def = FISHING_BODIES[bodyId];
    const unlocked = fishing.bodies?.[bodyId]?.unlocked ?? false;
    const active = activeBody === bodyId;
    const workerHired = fishing.bodies?.[bodyId]?.worker?.hired === true;
    return (
      <button
        key={bodyId}
        onClick={() => unlocked && onSetFishingActiveBody(bodyId)}
        disabled={!unlocked}
        style={{
          flex: 1, padding: "0.5rem 0.2rem", borderRadius: "8px",
          cursor: unlocked ? "pointer" : "default", textAlign: "center",
          background: active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${active ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.08)"}`,
          opacity: unlocked ? 1 : 0.35,
          transition: "all 0.15s ease",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: "1.1rem", lineHeight: 1, marginBottom: "0.15rem" }}>
          {def.emoji}
        </div>
        <div style={{
          fontSize: "0.65rem",
          fontWeight: active ? 700 : 400,
          color: active ? "#fff" : unlocked ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
          marginBottom: "0.1rem",
        }}>
          {def.name}
        </div>
        <div style={{
          fontSize: "0.55rem",
          color: !unlocked
            ? "rgba(255,255,255,0.2)"
            : workerHired
              ? "#4ade80"
              : "rgba(255,255,255,0.35)",
        }}>
          {!unlocked ? "🔒 locked" : workerHired ? "✓ fishing" : "no fisher"}
        </div>
      </button>
    );
  })}
</div>

      {/* Main fishing card */}
      <div style={{
        background: "linear-gradient(180deg, #071929 0%, #0d3050 100%)",
        borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden",
      }}>
        {/* Bait + recent catches */}
        <div style={{
          padding: "0.75rem 0.85rem 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.4rem",
        }}>
          <RecentCatches catches={lastCatches} />
          <BaitRow game={game} selectedBait={selectedBait} onSelect={setSelectedBait} />
        </div>

        {/* Active body label */}
        <div style={{ padding: "0.4rem 0.85rem 0", fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
          Fishing in: <strong style={{ color: "rgba(255,255,255,0.7)" }}>{activeBodyDef.emoji} {activeBodyDef.name}</strong>
          <span style={{ marginLeft: "0.5rem", color: "rgba(255,255,255,0.25)" }}>· needle quality = gear tier</span>
        </div>

        {/* Water scene */}
        <div style={{
          position: "relative", minHeight: "190px",
          background: "linear-gradient(180deg, #071a2e 0%, #0c3356 55%, #1a5c8a 100%)",
          margin: "0.5rem 0.85rem 0.85rem", borderRadius: "12px", overflow: "hidden",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "0.75rem", padding: "1rem",
        }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50px", background: "linear-gradient(to top, rgba(10,30,60,0.8), transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "12px", left: "8%", fontSize: "1.1rem", opacity: 0.45, pointerEvents: "none" }}>🌿</div>
          <div style={{ position: "absolute", bottom: "16px", right: "12%", fontSize: "0.85rem", opacity: 0.3, pointerEvents: "none" }}>🌿</div>

          {phase === "idle" && (
            <>
              <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>🎣</div>
              <button
                onClick={handleCast}
                style={{
                  padding: "0.65rem 2rem",
                  background: "rgba(99,102,241,0.35)", border: "2px solid rgba(99,102,241,0.7)",
                  borderRadius: "12px", fontSize: "0.88rem", fontWeight: 800, color: "#fff",
                  cursor: "pointer", letterSpacing: "0.08em", boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                }}
              >
                Cast Line{playerHaul > 1 ? ` ×${playerHaul}` : ""}
              </button>
              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                center the needle for expert-tier catch rates
                {playerHaul > 1 && <span style={{ color: "#4ade80", marginLeft: "0.4rem" }}>· {playerHaul} fish per catch</span>}
              </div>
            </>
          )}

          {phase === "waiting" && (
            <>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "2.2rem", animation: "bobber-idle 2s ease-in-out infinite" }}>🪝</div>
                {[0, 0.6, 1.2].map((d, i) => (
                  <div key={i} style={{
                    position: "absolute", top: "50%", left: "50%",
                    width: "50px", height: "18px",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%",
                    transform: "translate(-50%, 60%)",
                    animation: `ripple 2.4s ease-out ${d}s infinite`,
                    pointerEvents: "none",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", fontWeight: 600 }}>
                Waiting for a bite...
              </div>
            </>
          )}

          {phase === "needle" && (
            <>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.08em", animation: "bobber-bite 0.5s ease-in-out infinite" }}>
                🐟 FISH ON THE LINE!
              </div>
              <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
                <NeedleBar
                  position={needlePos}
                  sweetSpotStart={sweetSpotStart}
                  sweetSpotWidth={effectiveSweetSpotWidth}
                  onTap={handleNeedleTap}
                />
              </div>
            </>
          )}

          {phase === "reel" && (
            <>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#4ade80", letterSpacing: "0.08em" }}>
                💪 KEEP TAPPING!
              </div>
              <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
                <ReelBar progress={reelProgress} timeLeft={reelTimeLeft} onTap={handleReelTap} />
              </div>
            </>
          )}
        </div>

        {/* Catch result */}
        {phase === "result" && catchResult && (
          <div style={{ padding: "0 0.85rem 0.85rem" }}>
            <CatchResultCard result={catchResult} onDismiss={handleDismiss} />
          </div>
        )}
      </div>

      {/* Fish inventory */}
      {hasFish && (
        <div style={{
          background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "12px", padding: "0.7rem 0.85rem",
        }}>
          <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.45rem" }}>
            FISH INVENTORY
          </div>
          <FishInventory fish={fishInventory} />
        </div>
      )}

      {/* Catch rate reference */}
      <div style={{
        background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px", padding: "0.65rem 0.85rem",
      }}>
        <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          CATCH RATES — {activeBodyDef.emoji} {activeBodyDef.name.toUpperCase()}
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[
  { id: "minnow", color: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.12)", textColor: "#fff" },
  { id: "bass",   color: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)",  textColor: "#a5b4fc" },
  { id: "perch",  color: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)",  textColor: "#a5b4fc" },
  { id: "rare",   color: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)",  textColor: "#fbbf24" },
].map(({ id, color, border, textColor }, i) => {
  const fish = FISHING_FISH[id]; // ← pulls emoji/name/value from constants
  const rates = FISHING_CATCH_RATES[activeBody];
  const pcts = rates ? [rates.basic[i], rates.good[i], rates.expert[i]] : [0, 0, 0];
  return (
    <div key={id} style={{
      flex: 1, textAlign: "center", background: color,
      border: `1px solid ${border}`, borderRadius: "10px", padding: "0.5rem 0.2rem",
    }}>
      <div style={{ fontSize: "1.2rem", lineHeight: 1, marginBottom: "0.2rem" }}>{fish.emoji}</div>
      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: textColor }}>${fish.rawValue}</div>
      <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.4)", marginTop: "0.15rem", lineHeight: 1.6 }}>
        <div>B: {pcts[0]}%</div>
        <div>G: {pcts[1]}%</div>
        <div>E: {pcts[2]}%</div>
      </div>
    </div>
  );
})}
        </div>
        <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.25)", marginTop: "0.35rem" }}>
          B=Basic · G=Good · E=Expert (rod upgrades) · needle center = expert tier when fishing manually
        </div>
      </div>

      {/* Player gear upgrades */}
      <PlayerUpgradesPanel game={game} onBuyUpgrade={onBuyFishingPlayerUpgrade} />

      {/* Fishing workers panel */}
      <FishingBodiesPanel
        game={game}
        onUnlockBody={onUnlockFishingBody}
        onHireWorker={onHireFishingWorker}
        onUpgradeWorker={onUpgradeFishingWorker}
        onSetWorkerBait={onSetFishingWorkerBait}
        onFireWorker={onFireFishingWorker}
        onToggleAllowedFish={onToggleFishingWorkerAllowedFish}
      />

      {/* Tips */}
      <div style={{
        background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px", padding: "0.65rem 0.85rem",
        fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.8,
      }}>
        <div>🎯 <strong style={{ color: "rgba(255,255,255,0.8)" }}>Needle:</strong> Hit the center for expert gear tier — best rare odds</div>
        <div>🎣 <strong style={{ color: "rgba(255,255,255,0.8)" }}>Reel:</strong> Tap fast before the timer runs out</div>
        <div>🌊 <strong style={{ color: "#a5b4fc" }}>Deeper water</strong> = better base catch rates for your worker</div>
        <div>🪱 <strong style={{ color: "#86efac" }}>Bait</strong> boosts rare chance and haul — assign to workers too</div>
        <div>✨ <strong style={{ color: "#fbbf24" }}>Rare fish</strong> appear at expert gear tier or in deeper water</div>
      </div>
    </div>
  );
}