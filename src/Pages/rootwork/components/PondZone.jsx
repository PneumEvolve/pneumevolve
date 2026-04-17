// src/Pages/rootwork/components/PondZone.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ROD_TIERS, ROD_ORDER, FISH_TYPES, FISH_TRAP_COST, BAIT_TYPES,
  FISH_CATCH_RATES, NEEDLE_SWEEP_SPEED, REEL_DURATION,
  REEL_DRAIN_RATE, REEL_TAP_AMOUNT, GOLDEN_FISH_BONUSES,
  FISH_TRAP_CATCH_INTERVAL,
} from "../gameConstants";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function getRodTier(rodId) {
  return ROD_TIERS.find((r) => r.id === rodId) ?? ROD_TIERS[0];
}
 
function getNextRod(rodId) {
  const idx = ROD_ORDER.indexOf(rodId);
  if (idx === -1 || idx === ROD_ORDER.length - 1) return null;
  return ROD_TIERS[idx + 1];
}
 
function rollFish(baitId, needleQuality, catBonus = 0) {
  // needleQuality 0-1, 1 = perfect center hit
  const rates = FISH_CATCH_RATES[baitId] ?? FISH_CATCH_RATES.none;
 
  // Perfect needle (>0.85) unlocks rare/legendary, otherwise cap at uncommon
  const canCatchRare = needleQuality > 0.85;
 
  let { common, uncommon, rare, legendary } = rates;
  if (!canCatchRare) {
    // redistribute rare/legendary back to common/uncommon
    const lost = rare + legendary;
    common += lost * 0.7;
    uncommon += lost * 0.3;
    rare = 0;
    legendary = 0;
  }
 
  const roll = Math.random();
  if (roll < legendary) return "golden_fish";
  if (roll < legendary + rare) return "pike";
  if (roll < legendary + rare + uncommon) {
    return Math.random() < 0.5 ? "bass" : "perch";
  }
  return "minnow";
}
 
// ─── Needle component ─────────────────────────────────────────────────────────
 
function NeedleBar({ position, sweetSpotStart, sweetSpotWidth, onTap, disabled }) {
  const sweetSpotEnd = sweetSpotStart + sweetSpotWidth;
  const inZone = position >= sweetSpotStart && position <= sweetSpotEnd;
 
  // Quality = how close to center of sweet spot
  const center = sweetSpotStart + sweetSpotWidth / 2;
  const distFromCenter = Math.abs(position - center) / (sweetSpotWidth / 2);
  const quality = Math.max(0, 1 - distFromCenter);
 
  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <div
        style={{
          position: "relative",
          height: "48px",
          background: "rgba(0,0,0,0.3)",
          borderRadius: "12px",
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.1)",
          cursor: disabled ? "default" : "pointer",
        }}
        onClick={disabled ? undefined : onTap}
      >
        {/* Sweet spot zone */}
        <div style={{
          position: "absolute",
          top: 0, bottom: 0,
          left: `${sweetSpotStart * 100}%`,
          width: `${sweetSpotWidth * 100}%`,
          background: inZone
            ? `rgba(74,222,128,${0.3 + quality * 0.4})`
            : "rgba(74,222,128,0.15)",
          borderLeft: "2px solid rgba(74,222,128,0.6)",
          borderRight: "2px solid rgba(74,222,128,0.6)",
          transition: "background 0.1s",
        }} />
 
        {/* Center line of sweet spot */}
        <div style={{
          position: "absolute",
          top: "20%", bottom: "20%",
          left: `${(sweetSpotStart + sweetSpotWidth / 2) * 100}%`,
          width: "2px",
          background: "rgba(74,222,128,0.8)",
          transform: "translateX(-50%)",
        }} />
 
        {/* Needle */}
        <div style={{
          position: "absolute",
          top: "4px", bottom: "4px",
          left: `${position * 100}%`,
          width: "4px",
          background: inZone ? "#fbbf24" : "#ef4444",
          borderRadius: "2px",
          transform: "translateX(-50%)",
          boxShadow: inZone ? "0 0 8px #fbbf24" : "0 0 6px #ef4444",
          transition: "background 0.05s, box-shadow 0.05s",
        }} />
 
        {/* Labels */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", color: "rgba(255,255,255,0.5)",
          pointerEvents: "none",
        }}>
          {disabled ? "Waiting for bite..." : inZone ? "✓ STOP!" : "Tap to stop needle"}
        </div>
      </div>
 
      {/* Quality indicator */}
      {!disabled && (
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "0.65rem", color: "rgba(255,255,255,0.4)",
          marginTop: "0.25rem", padding: "0 2px",
        }}>
          <span>Miss</span>
          <span style={{ color: inZone ? "#4ade80" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>
            {inZone ? `${Math.round(quality * 100)}% quality` : "Sweet spot →"}
          </span>
          <span>Miss</span>
        </div>
      )}
    </div>
  );
}
 
// ─── Reel component ───────────────────────────────────────────────────────────
 
function ReelBar({ progress, timeLeft, onTap }) {
  const pct = Math.max(0, Math.min(100, progress * 100));
  const color = pct > 66 ? "#4ade80" : pct > 33 ? "#f59e0b" : "#ef4444";
 
  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: "0.7rem", marginBottom: "0.3rem",
        color: "rgba(255,255,255,0.6)",
      }}>
        <span>🎣 Reel it in!</span>
        <span style={{ color: timeLeft < 1.5 ? "#ef4444" : "rgba(255,255,255,0.6)" }}>
          {timeLeft.toFixed(1)}s
        </span>
      </div>
      <div
        style={{
          position: "relative", height: "56px",
          background: "rgba(0,0,0,0.3)", borderRadius: "12px",
          overflow: "hidden", border: "2px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
        }}
        onClick={onTap}
      >
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: "10px",
          transition: "width 0.05s, background 0.2s",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.85rem", fontWeight: 700, color: "#fff",
          letterSpacing: "0.1em",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}>
          TAP TAP TAP!
        </div>
      </div>
      <div style={{
        fontSize: "0.62rem", color: "rgba(255,255,255,0.35)",
        textAlign: "center", marginTop: "0.25rem",
      }}>
        Fill the bar before time runs out
      </div>
    </div>
  );
}
 
// ─── Fish inventory display ───────────────────────────────────────────────────
 
function FishInventory({ pond, sellRates }) {
  const fishKeys = ["minnow", "bass", "perch", "pike", "golden_fish"];
  const hasFish = fishKeys.some((k) => (pond.fish?.[k] ?? 0) > 0);
  if (!hasFish) return null;
 
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.4rem",
    }}>
      {fishKeys.map((key) => {
        const count = pond.fish?.[key] ?? 0;
        if (count <= 0) return null;
        const fish = FISH_TYPES[key];
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px", padding: "0.3rem 0.6rem",
            fontSize: "0.75rem",
          }}>
            <span>{fish.emoji}</span>
            <span style={{ fontWeight: 600, color: "#fff" }}>{count}</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem" }}>{fish.name}</span>
          </div>
        );
      })}
    </div>
  );
}
 
// ─── Bait selector ────────────────────────────────────────────────────────────
 
function BaitSelector({ game, selectedBait, onSelect }) {
  const baitList = Object.values(BAIT_TYPES);
  return (
    <div>
      <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.35rem", fontWeight: 600, letterSpacing: "0.05em" }}>
        BAIT
      </div>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            fontSize: "0.7rem", padding: "0.25rem 0.55rem",
            borderRadius: "8px", cursor: "pointer",
            background: !selectedBait ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${!selectedBait ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: !selectedBait ? "#fff" : "rgba(255,255,255,0.4)",
            fontWeight: !selectedBait ? 600 : 400,
          }}
        >
          None
        </button>
        {baitList.map((bait) => {
          const have = game.bait?.[bait.id] ?? 0;
          const isSelected = selectedBait === bait.id;
          return (
            <button
              key={bait.id}
              onClick={() => have > 0 && onSelect(isSelected ? null : bait.id)}
              disabled={have <= 0}
              style={{
                fontSize: "0.7rem", padding: "0.25rem 0.55rem",
                borderRadius: "8px", cursor: have > 0 ? "pointer" : "default",
                background: isSelected ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isSelected ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`,
                color: isSelected ? "#fff" : have > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                fontWeight: isSelected ? 600 : 400,
                opacity: have <= 0 ? 0.4 : 1,
              }}
            >
              {bait.emoji} {bait.name} ({have})
            </button>
          );
        })}
      </div>
    </div>
  );
}
 
// ─── Rod panel ────────────────────────────────────────────────────────────────
 
function RodPanel({ pond, game, onUpgradeRod }) {
  const currentRod = getRodTier(pond.rodTier ?? "twig");
  const nextRod = getNextRod(pond.rodTier ?? "twig");
  const canAfford = nextRod && (game.cash ?? 0) >= nextRod.upgradeCost;
 
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "0.65rem 0.85rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>
            {currentRod.emoji} {currentRod.name}
          </div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>
            Sweet spot: {Math.round(currentRod.sweetSpotWidth * 100)}% · Bite: {currentRod.biteTimeMin}–{currentRod.biteTimeMax}s
          </div>
        </div>
        {nextRod ? (
          <button
            onClick={onUpgradeRod}
            disabled={!canAfford}
            style={{
              fontSize: "0.68rem", padding: "0.25rem 0.6rem",
              borderRadius: "8px", cursor: canAfford ? "pointer" : "default",
              background: canAfford ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${canAfford ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
              color: canAfford ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 600, flexShrink: 0, marginLeft: "0.5rem",
            }}
          >
            → {nextRod.emoji} ${nextRod.upgradeCost}
          </button>
        ) : (
          <span style={{ fontSize: "0.65rem", color: "#4ade80" }}>✓ Max rod</span>
        )}
      </div>
    </div>
  );
}
 
// ─── Fish trap panel ──────────────────────────────────────────────────────────
 
function TrapPanel({ pond, game, onBuyTrap }) {
  const trapOwned = pond.trapOwned === true;
  const trapTimer = pond.trapTimer ?? 0;
  const pct = Math.min(100, (trapTimer / FISH_TRAP_CATCH_INTERVAL) * 100);
  const canAfford = (game.cash ?? 0) >= FISH_TRAP_COST;
 
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "0.65rem 0.85rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: trapOwned ? "0.4rem" : 0 }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>
            🪤 Fish Trap
          </div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>
            {trapOwned
              ? "Catches minnows & bass automatically. No rare fish."
              : "Passive catch — common fish only, no rare fish ever."}
          </div>
        </div>
        {!trapOwned && (
          <button
            onClick={onBuyTrap}
            disabled={!canAfford}
            style={{
              fontSize: "0.68rem", padding: "0.25rem 0.6rem",
              borderRadius: "8px", cursor: canAfford ? "pointer" : "default",
              background: canAfford ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${canAfford ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
              color: canAfford ? "#fff" : "rgba(255,255,255,0.3)",
              fontWeight: 600, flexShrink: 0, marginLeft: "0.5rem",
            }}
          >
            $300
          </button>
        )}
      </div>
      {trapOwned && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.2rem" }}>
            <span>Next catch</span>
            <span>{Math.ceil(FISH_TRAP_CATCH_INTERVAL - trapTimer)}s</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#4ade80", borderRadius: "999px", transition: "width 0.5s linear" }} />
          </div>
        </div>
      )}
    </div>
  );
}
 
// ─── Catch result overlay ─────────────────────────────────────────────────────
 
function CatchResult({ result, onDismiss }) {
  if (!result) return null;
  const fish = FISH_TYPES[result.fishId];
  const isLegendary = result.fishId === "golden_fish";
  const isRare = result.fishId === "pike";
 
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        borderRadius: "16px",
        cursor: "pointer",
      }}
      onClick={onDismiss}
    >
      <div style={{
        textAlign: "center", padding: "1.5rem",
        animation: "rw-pop 0.3s ease forwards",
      }}>
        <div style={{
          fontSize: isLegendary ? "4rem" : isRare ? "3.5rem" : "3rem",
          lineHeight: 1,
          filter: isLegendary ? "drop-shadow(0 0 20px #fbbf24)" : isRare ? "drop-shadow(0 0 12px #f59e0b)" : "none",
        }}>
          {fish.emoji}
        </div>
        <div style={{
          fontSize: isLegendary ? "1.1rem" : "0.9rem",
          fontWeight: 800, color: "#fff",
          marginTop: "0.5rem",
          color: isLegendary ? "#fbbf24" : isRare ? "#f59e0b" : "#fff",
        }}>
          {isLegendary ? "✨ LEGENDARY!" : isRare ? "🎉 RARE CATCH!" : "Caught!"}
        </div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: "0.2rem" }}>
          {fish.name}
        </div>
        {result.bonus && (
          <div style={{
            fontSize: "0.75rem", color: "#fbbf24",
            marginTop: "0.4rem", lineHeight: 1.5,
          }}>
            {result.bonus.emoji} {result.bonus.description}
          </div>
        )}
        {!result.caught && (
          <div style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 700, marginTop: "0.3rem" }}>
            It got away!
          </div>
        )}
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "0.75rem" }}>
          tap to continue
        </div>
      </div>
    </div>
  );
}
 
// ─── Main PondZone ────────────────────────────────────────────────────────────
 
export default function PondZone({ game, onBuyPond, onUpgradeRod, onBuyTrap, onCatchFish, onSelectBait, onApplyGoldenBonus }) {
  const pond = game.pond ?? {};
  const pondOwned = pond.owned === true;
 
  // Minigame state
  const [phase, setPhase] = useState("idle"); // idle | waiting | needle | reel | result
  const [needlePos, setNeedlePos] = useState(0.1);
  const [needleDir, setNeedleDir] = useState(1);
  const [sweetSpotStart, setSweetSpotStart] = useState(0.3);
  const [needleQuality, setNeedleQuality] = useState(0);
  const [reelProgress, setReelProgress] = useState(0);
  const [reelTimeLeft, setReelTimeLeft] = useState(REEL_DURATION);
  const [catchResult, setCatchResult] = useState(null);
  const [selectedBait, setSelectedBait] = useState(null);
  const [biteCountdown, setBiteCountdown] = useState(0);
  const [lastCatches, setLastCatches] = useState([]);
 
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
 
  const rod = getRodTier(pond.rodTier ?? "twig");
 
  // Cat pet bonus widens sweet spot
  const catBonus = game.pets?.cat?.mood > 50 ? 0.20 : 0;
  const effectiveSweetSpotWidth = Math.min(0.6, rod.sweetSpotWidth * (1 + catBonus));
 
  // ── Game loop ──────────────────────────────────────────────────────────────
 
  const runLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
 
    const currentPhase = phaseRef.current;
 
    if (currentPhase === "waiting") {
      setBiteCountdown((prev) => {
        const next = prev - dt;
        if (next <= 0) {
          // Fish bites! Randomize sweet spot position
          const margin = 0.05;
          const maxStart = 1 - effectiveSweetSpotWidth - margin;
          const newStart = margin + Math.random() * (maxStart - margin);
          setSweetSpotStart(newStart);
          setNeedlePos(Math.random() < 0.5 ? 0.02 : 0.98);
          setNeedleDir(Math.random() < 0.5 ? 1 : -1);
          setPhase("needle");
          phaseRef.current = "needle";
          return 0;
        }
        return next;
      });
    }
 
    if (currentPhase === "needle") {
      setNeedlePos((prev) => {
        let next = prev + NEEDLE_SWEEP_SPEED * dt * (needleDir > 0 ? 1 : -1);
        if (next >= 1) { next = 1; setNeedleDir(-1); }
        if (next <= 0) { next = 0; setNeedleDir(1); }
        return next;
      });
    }
 
    if (currentPhase === "reel") {
      setReelProgress((prev) => Math.max(0, prev - REEL_DRAIN_RATE * dt));
      setReelTimeLeft((prev) => {
        const next = prev - dt;
        if (next <= 0) {
          // Time ran out — fish escaped
          setCatchResult({ caught: false, fishId: "bass" });
          setPhase("result");
          phaseRef.current = "result";
          return 0;
        }
        return next;
      });
    }
 
    animFrameRef.current = requestAnimationFrame(runLoop);
  }, [needleDir, effectiveSweetSpotWidth]);
 
  useEffect(() => {
    if (phase === "waiting" || phase === "needle" || phase === "reel") {
      lastTimeRef.current = null;
      animFrameRef.current = requestAnimationFrame(runLoop);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [phase, runLoop]);
 
  // ── Actions ────────────────────────────────────────────────────────────────
 
  function handleCast() {
    if (phase !== "idle") return;
    const biteTime = rod.biteTimeMin + Math.random() * (rod.biteTimeMax - rod.biteTimeMin);
    setBiteCountdown(biteTime);
    setPhase("waiting");
  }
 
  function handleNeedleTap() {
    if (phase !== "needle") return;
    const sweetSpotEnd = sweetSpotStart + effectiveSweetSpotWidth;
    const inZone = needlePos >= sweetSpotStart && needlePos <= sweetSpotEnd;
 
    if (!inZone) {
      // Missed — fish spooked
      setCatchResult({ caught: false, fishId: "minnow" });
      setPhase("result");
      return;
    }
 
    // Calculate quality
    const center = sweetSpotStart + effectiveSweetSpotWidth / 2;
    const dist = Math.abs(needlePos - center) / (effectiveSweetSpotWidth / 2);
    const quality = Math.max(0, 1 - dist);
    setNeedleQuality(quality);
 
    // Start reel phase
    setReelProgress(0.15 + quality * 0.2); // head start based on quality
    setReelTimeLeft(REEL_DURATION);
    setPhase("reel");
  }
 
  function handleReelTap() {
    if (phase !== "reel") return;
    setReelProgress((prev) => {
      const next = prev + REEL_TAP_AMOUNT;
      if (next >= 1) {
        // Caught!
        const fishId = rollFish(selectedBait ?? "none", needleQuality, catBonus);
        const fish = FISH_TYPES[fishId];
        let bonus = null;
        if (fishId === "golden_fish") {
          bonus = GOLDEN_FISH_BONUSES[Math.floor(Math.random() * GOLDEN_FISH_BONUSES.length)];
          onApplyGoldenBonus?.(bonus.id);
        } else {
          onCatchFish?.(fishId, selectedBait);
        }
        const result = { caught: true, fishId, bonus };
        setCatchResult(result);
        setLastCatches((prev) => [{ fishId, emoji: fish.emoji, id: Date.now() }, ...prev].slice(0, 8));
        setPhase("result");
        // Consume bait
        if (selectedBait) setSelectedBait(null);
        return 1;
      }
      return next;
    });
  }
 
  function handleDismissResult() {
    setCatchResult(null);
    setPhase("idle");
    setNeedlePos(0.1);
    setNeedleDir(1);
    setReelProgress(0);
    setNeedleQuality(0);
  }
 
  // ── Buy pond screen ────────────────────────────────────────────────────────
 
  if (!pondOwned) {
    const canAfford = (game.cash ?? 0) >= 500;
    return (
      <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🎣</div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem" }}>
          Build a Pond
        </h3>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1.25rem", lineHeight: 1.6, maxWidth: "280px", margin: "0 auto 1.25rem" }}>
          Dig a pond on your farm. Fish manually for rare catches or set a trap for passive income.
        </p>
        <button
          onClick={onBuyPond}
          disabled={!canAfford}
          className="btn"
          style={{ fontSize: "0.85rem", padding: "0.6rem 1.5rem", opacity: canAfford ? 1 : 0.5 }}
        >
          {canAfford ? "🎣 Build Pond — $500" : `Need $500 (have $${Math.floor(game.cash ?? 0)})`}
        </button>
      </div>
    );
  }
 
  // ── Main pond UI ───────────────────────────────────────────────────────────
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
 
      {/* Pond visual + minigame */}
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, #0c2340 0%, #0a3d62 40%, #1a5276 100%)",
        borderRadius: "16px",
        padding: "1.25rem",
        overflow: "hidden",
        minHeight: "220px",
        display: "flex", flexDirection: "column", gap: "0.85rem",
      }}>
        {/* Water shimmer decoration */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "40px",
          background: "linear-gradient(to top, rgba(26,82,118,0.6), transparent)",
          pointerEvents: "none",
        }} />
 
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
            🎣 Fishing Pond
          </div>
          {lastCatches.length > 0 && (
            <div style={{ display: "flex", gap: "0.2rem" }}>
              {lastCatches.map((c) => (
                <span key={c.id} style={{ fontSize: "1rem", opacity: 0.7 }}>{c.emoji}</span>
              ))}
            </div>
          )}
        </div>
 
        {/* Phase UI */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <div style={{ fontSize: "2.5rem" }}>🎣</div>
            <button
              onClick={handleCast}
              style={{
                background: "rgba(99,102,241,0.4)",
                border: "2px solid rgba(99,102,241,0.7)",
                borderRadius: "12px",
                padding: "0.6rem 1.5rem",
                fontSize: "0.85rem", fontWeight: 700,
                color: "#fff", cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              🎣 Cast Line
            </button>
          </div>
        )}
 
        {phase === "waiting" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", paddingTop: "0.5rem" }}>
            <div style={{ fontSize: "2rem" }}>🪝</div>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              Waiting for a bite...
            </div>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.4)",
                  animation: `rw-pulse 1.2s ease-in-out ${i * 0.3}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
 
        {phase === "needle" && (
          <div style={{ paddingTop: "0.25rem" }}>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem", textAlign: "center" }}>
              🐟 Fish on the line!
            </div>
            <NeedleBar
              position={needlePos}
              sweetSpotStart={sweetSpotStart}
              sweetSpotWidth={effectiveSweetSpotWidth}
              onTap={handleNeedleTap}
              disabled={false}
            />
          </div>
        )}
 
        {phase === "reel" && (
          <ReelBar
            progress={reelProgress}
            timeLeft={reelTimeLeft}
            onTap={handleReelTap}
          />
        )}
 
        {/* Result overlay */}
        {phase === "result" && catchResult && (
          <CatchResult result={catchResult} onDismiss={handleDismissResult} />
        )}
      </div>
 
      {/* Bait selector */}
      <BaitSelector game={game} selectedBait={selectedBait} onSelect={setSelectedBait} />
 
      {/* Fish inventory */}
      <div>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.35rem", fontWeight: 600, letterSpacing: "0.05em" }}>
          FISH INVENTORY
        </div>
        <FishInventory pond={pond} />
        {!Object.values(pond.fish ?? {}).some(v => v > 0) && (
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic" }}>
            Nothing caught yet — cast a line!
          </div>
        )}
      </div>
 
      {/* Rod + Trap upgrades */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em" }}>
          UPGRADES
        </div>
        <RodPanel pond={pond} game={game} onUpgradeRod={onUpgradeRod} />
        <TrapPanel pond={pond} game={game} onBuyTrap={onBuyTrap} />
      </div>
 
      {/* Sell rates */}
      <div style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "10px", padding: "0.65rem 0.85rem",
      }}>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.4rem", letterSpacing: "0.05em" }}>
          RAW SELL RATES
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {["minnow","bass","perch","pike"].map((id) => {
            const fish = FISH_TYPES[id];
            return (
              <div key={id} style={{
                fontSize: "0.68rem", background: "var(--bg-elev)",
                borderRadius: "6px", padding: "0.2rem 0.5rem",
                border: "1px solid var(--border)",
              }}>
                {fish.emoji} <strong>${fish.rawValue}</strong>
              </div>
            );
          })}
          <div style={{
            fontSize: "0.68rem", background: "rgba(251,191,36,0.1)",
            borderRadius: "6px", padding: "0.2rem 0.5rem",
            border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24",
          }}>
            ✨ Priceless
          </div>
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.4rem" }}>
          Assign fish to a market worker queue to sell. Craft for higher value.
        </div>
      </div>
    </div>
  );
}