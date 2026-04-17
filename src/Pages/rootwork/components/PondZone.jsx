// src/Pages/rootwork/components/PondZone.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ROD_TIERS, ROD_ORDER, FISH_TYPES, FISH_TRAP_COST, BAIT_TYPES,
  FISH_CATCH_RATES, NEEDLE_SWEEP_SPEED, REEL_DURATION,
  REEL_DRAIN_RATE, REEL_TAP_AMOUNT, GOLDEN_FISH_BONUSES,
  FISH_TRAP_CATCH_INTERVAL, POND_COST,
} from "../gameConstants";
 
function getRodTier(rodId) { return ROD_TIERS.find((r) => r.id === rodId) ?? ROD_TIERS[0]; }
function getNextRod(rodId) { const idx = ROD_ORDER.indexOf(rodId); if (idx === -1 || idx === ROD_ORDER.length - 1) return null; return ROD_TIERS[idx + 1]; }
function rollFish(baitId, needleQuality) {
  const rates = FISH_CATCH_RATES[baitId] ?? FISH_CATCH_RATES.none;
  const canCatchRare = needleQuality > 0.85;
  let { common, uncommon, rare, legendary } = rates;
  if (!canCatchRare) { const lost = rare + legendary; common += lost * 0.7; uncommon += lost * 0.3; rare = 0; legendary = 0; }
  const roll = Math.random();
  if (roll < legendary) return "golden_fish";
  if (roll < legendary + rare) return "pike";
  if (roll < legendary + rare + uncommon) return Math.random() < 0.5 ? "bass" : "perch";
  return "minnow";
}
 
const POND_STYLES = `
  @keyframes ripple { 0% { transform: scale(0.8); opacity: 0.6; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes bobber-idle { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
  @keyframes bobber-bite { 0% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(8px) rotate(-10deg); } 75% { transform: translateY(7px) rotate(-7deg); } 100% { transform: translateY(0) rotate(0deg); } }
  @keyframes slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
 
function NeedleBar({ position, sweetSpotStart, sweetSpotWidth, onTap }) {
  const inZone = position >= sweetSpotStart && position <= sweetSpotStart + sweetSpotWidth;
  const center = sweetSpotStart + sweetSpotWidth / 2;
  const quality = Math.max(0, 1 - Math.abs(position - center) / (sweetSpotWidth / 2));
  return (
    <div onPointerDown={onTap} style={{ width: "100%", cursor: "pointer", userSelect: "none" }}>
      <div style={{ position: "relative", height: "60px", background: "rgba(0,0,0,0.6)", borderRadius: "14px", overflow: "hidden", border: `2px solid ${inZone ? "rgba(74,222,128,0.7)" : "rgba(255,255,255,0.15)"}`, boxShadow: inZone ? "0 0 20px rgba(74,222,128,0.2)" : "none", transition: "border-color 0.08s, box-shadow 0.08s" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sweetSpotStart * 100}%`, width: `${sweetSpotWidth * 100}%`, background: inZone ? `rgba(74,222,128,${0.2 + quality * 0.4})` : "rgba(74,222,128,0.12)", borderLeft: "2px solid rgba(74,222,128,0.5)", borderRight: "2px solid rgba(74,222,128,0.5)", transition: "background 0.08s" }} />
        <div style={{ position: "absolute", top: "20%", bottom: "20%", left: `${center * 100}%`, width: "2px", background: "rgba(74,222,128,0.7)", transform: "translateX(-50%)" }} />
        <div style={{ position: "absolute", top: "8px", bottom: "8px", left: `${position * 100}%`, width: "3px", borderRadius: "2px", transform: "translateX(-50%)", background: inZone ? "#fbbf24" : "#f87171", boxShadow: inZone ? "0 0 12px #fbbf24" : "0 0 8px #f87171", transition: "background 0.06s, box-shadow 0.06s" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.1em", color: inZone ? "rgba(74,222,128,0.95)" : "rgba(255,255,255,0.35)", pointerEvents: "none", textShadow: inZone ? "0 0 10px rgba(74,222,128,0.6)" : "none", transition: "color 0.08s" }}>
          {inZone ? `STOP! (${Math.round(quality * 100)}%)` : "TAP TO STOP"}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", marginTop: "0.2rem", padding: "0 4px" }}>
        <span>← miss</span><span style={{ color: "rgba(74,222,128,0.5)" }}>● sweet spot</span><span>miss →</span>
      </div>
    </div>
  );
}
 
function ReelBar({ progress, timeLeft, onTap }) {
  const pct = Math.max(0, Math.min(100, progress * 100));
  const urgent = timeLeft < 1.5;
  const color = pct > 60 ? "#4ade80" : pct > 30 ? "#f59e0b" : "#ef4444";
  return (
    <div onPointerDown={onTap} style={{ width: "100%", cursor: "pointer", userSelect: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", padding: "0 2px" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: "0.08em" }}>REEL IT IN</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: urgent ? "#ef4444" : "rgba(255,255,255,0.5)", animation: urgent ? "rw-pulse 0.5s ease-in-out infinite" : "none" }}>{timeLeft.toFixed(1)}s</span>
      </div>
      <div style={{ position: "relative", height: "64px", background: "rgba(0,0,0,0.6)", borderRadius: "14px", overflow: "hidden", border: `2px solid ${urgent ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)"}`, transition: "border-color 0.2s" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}55, ${color}cc)`, borderRadius: "12px", transition: "background 0.2s", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.18em", color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.7)", pointerEvents: "none" }}>TAP TAP TAP!</div>
      </div>
    </div>
  );
}
 
function CatchResultCard({ result, onDismiss }) {
  const fish = FISH_TYPES[result.fishId];
  const isLegendary = result.fishId === "golden_fish";
  const isRare = result.fishId === "pike";
  const escaped = !result.caught;
  return (
    <div style={{ animation: "slide-up 0.25s ease forwards" }}>
      <div style={{
        borderRadius: "14px", overflow: "hidden",
        border: `2px solid ${isLegendary ? "#fbbf24" : isRare ? "#f59e0b" : escaped ? "#ef4444" : "#4ade80"}`,
        background: isLegendary ? "linear-gradient(135deg, #3d2000, #5c3300)" : isRare ? "linear-gradient(135deg, #2d1a00, #4a2d00)" : escaped ? "linear-gradient(135deg, #2d0a0a, #3d1010)" : "linear-gradient(135deg, #0a2d1a, #0f3d22)",
        boxShadow: isLegendary ? "0 0 40px rgba(251,191,36,0.4), inset 0 1px 0 rgba(251,191,36,0.2)" : isRare ? "0 0 20px rgba(245,158,11,0.25)" : "none",
      }}>
        <div style={{ padding: "1.1rem 1.1rem 0.9rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: isLegendary ? "3.5rem" : isRare ? "2.8rem" : escaped ? "2rem" : "2.4rem", lineHeight: 1, flexShrink: 0, filter: isLegendary ? "drop-shadow(0 0 16px #fbbf24)" : isRare ? "drop-shadow(0 0 8px #f59e0b)" : "none", opacity: escaped ? 0.5 : 1 }}>
            {escaped ? "💨" : fish.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isLegendary ? "1.05rem" : "0.9rem", fontWeight: 900, letterSpacing: "0.04em", color: isLegendary ? "#fbbf24" : isRare ? "#fcd34d" : escaped ? "#fca5a5" : "#86efac", marginBottom: "0.2rem", textShadow: isLegendary ? "0 0 12px rgba(251,191,36,0.5)" : "none" }}>
              {escaped ? "It got away!" : isLegendary ? "✨ LEGENDARY!" : isRare ? "🎉 Rare catch!" : `Caught a ${fish.name}!`}
            </div>
            {!escaped && <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{fish.name} · <span style={{ color: "#4ade80" }}>${fish.rawValue}</span> raw · added to inventory</div>}
            {escaped && <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>Better luck next time</div>}
            {result.bonus && (
              <div style={{ fontSize: "0.78rem", color: "#fbbf24", marginTop: "0.4rem", fontWeight: 700, padding: "0.25rem 0.5rem", background: "rgba(251,191,36,0.15)", borderRadius: "6px", display: "inline-block" }}>
                {result.bonus.emoji} {result.bonus.description}
              </div>
            )}
          </div>
        </div>
        <button onClick={onDismiss} style={{ width: "100%", padding: "0.75rem", background: escaped ? "rgba(239,68,68,0.2)" : isLegendary ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.15)", border: "none", borderTop: `1px solid ${escaped ? "rgba(239,68,68,0.3)" : isLegendary ? "rgba(251,191,36,0.3)" : "rgba(74,222,128,0.2)"}`, color: escaped ? "#fca5a5" : isLegendary ? "#fbbf24" : "#86efac", fontSize: "0.82rem", fontWeight: 800, cursor: "pointer", letterSpacing: "0.08em" }}>
          {escaped ? "Try again →" : "🎣 Cast again →"}
        </button>
      </div>
    </div>
  );
}
 
function FishInventory({ pond }) {
  const keys = ["minnow", "bass", "perch", "pike", "golden_fish"];
  const entries = keys.filter((k) => (pond.fish?.[k] ?? 0) > 0);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      {entries.map((key) => {
        const fish = FISH_TYPES[key];
        const isSpecial = fish.rarity === "rare" || fish.rarity === "legendary";
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: isSpecial ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.1)", border: `1px solid ${isSpecial ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: "8px", padding: "0.28rem 0.6rem" }}>
            <span style={{ fontSize: "0.95rem" }}>{fish.emoji}</span>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.8rem" }}>{pond.fish[key]}</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.62rem" }}>{fish.name}</span>
            {fish.rawValue > 0 && <span style={{ color: "#4ade80", fontSize: "0.58rem" }}>${fish.rawValue}</span>}
          </div>
        );
      })}
    </div>
  );
}
 
function BaitRow({ game, selectedBait, onSelect }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", flexShrink: 0 }}>BAIT</span>
      <button onClick={() => onSelect(null)} style={{ fontSize: "0.65rem", padding: "0.18rem 0.5rem", borderRadius: "6px", cursor: "pointer", background: !selectedBait ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${!selectedBait ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`, color: !selectedBait ? "#fff" : "rgba(255,255,255,0.4)", fontWeight: !selectedBait ? 700 : 400 }}>None</button>
      {Object.values(BAIT_TYPES).map((bait) => {
        const have = game.bait?.[bait.id] ?? 0;
        const sel = selectedBait === bait.id;
        return (
          <button key={bait.id} onClick={() => have > 0 && onSelect(sel ? null : bait.id)} disabled={have <= 0} style={{ fontSize: "0.65rem", padding: "0.18rem 0.5rem", borderRadius: "6px", cursor: have > 0 ? "pointer" : "default", background: sel ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)", border: `1px solid ${sel ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.12)"}`, color: sel ? "#fff" : have > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", fontWeight: sel ? 700 : 400, opacity: have <= 0 ? 0.4 : 1 }}>
            {bait.emoji} {bait.name} ({have})
          </button>
        );
      })}
    </div>
  );
}
 
function RecentCatches({ catches }) {
  if (!catches.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>RECENT</span>
      {catches.map((c, i) => <span key={c.id} style={{ fontSize: "1rem", opacity: 1 - i * 0.12 }}>{c.emoji}</span>)}
    </div>
  );
}
 
function UpgradesPanel({ pond, game, onUpgradeRod, onBuyTrap }) {
  const [open, setOpen] = useState(false);
  const rod = getRodTier(pond.rodTier ?? "twig");
  const nextRod = getNextRod(pond.rodTier ?? "twig");
  const canAffordRod = nextRod && (game.cash ?? 0) >= nextRod.upgradeCost;
  const trapOwned = pond.trapOwned === true;
  const canAffordTrap = (game.cash ?? 0) >= FISH_TRAP_COST;
  const trapPct = Math.min(100, ((pond.trapTimer ?? 0) / FISH_TRAP_CATCH_INTERVAL) * 100);
  return (
    <div style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.85rem", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>⚙ Upgrades</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>{rod.emoji} {rod.name} · {trapOwned ? "🪤 active" : "no trap"}</span>
          <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "0.75rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(0,0,0,0.4)" }}>
          {/* Rod */}
          <div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>ROD</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>{rod.emoji} {rod.name}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>Sweet spot {Math.round(rod.sweetSpotWidth * 100)}% · Bite {rod.biteTimeMin}–{rod.biteTimeMax}s</div>
              </div>
              {nextRod
                ? <button onClick={onUpgradeRod} disabled={!canAffordRod} style={{ fontSize: "0.68rem", padding: "0.25rem 0.6rem", borderRadius: "8px", cursor: canAffordRod ? "pointer" : "default", marginLeft: "0.5rem", flexShrink: 0, background: canAffordRod ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)", border: `1px solid ${canAffordRod ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`, color: canAffordRod ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 600 }}>{nextRod.emoji} ${nextRod.upgradeCost}</button>
                : <span style={{ fontSize: "0.62rem", color: "#4ade80" }}>✓ Max rod</span>
              }
            </div>
          </div>
          {/* Trap */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>FISH TRAP</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>🪤 {trapOwned ? "Active" : "Fish Trap"}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>Catches minnow & bass passively. No rare fish ever.</div>
                {trapOwned && (
                  <div style={{ marginTop: "0.4rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.15rem" }}>
                      <span>Next catch</span><span>{Math.ceil(FISH_TRAP_CATCH_INTERVAL - (pond.trapTimer ?? 0))}s</span>
                    </div>
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${trapPct}%`, background: "#4ade80", transition: "width 0.5s linear" }} />
                    </div>
                  </div>
                )}
              </div>
              {!trapOwned && <button onClick={onBuyTrap} disabled={!canAffordTrap} style={{ fontSize: "0.68rem", padding: "0.25rem 0.6rem", borderRadius: "8px", cursor: canAffordTrap ? "pointer" : "default", marginLeft: "0.5rem", flexShrink: 0, background: canAffordTrap ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)", border: `1px solid ${canAffordTrap ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`, color: canAffordTrap ? "#fff" : "rgba(255,255,255,0.25)", fontWeight: 600 }}>$300</button>}
            </div>
          </div>
          {/* Sell rates */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>RAW SELL RATES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {["minnow", "bass", "perch", "pike"].map((id) => { const fish = FISH_TYPES[id]; return <div key={id} style={{ fontSize: "0.62rem", background: "rgba(255,255,255,0.08)", borderRadius: "6px", padding: "0.15rem 0.4rem", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>{fish.emoji} <strong style={{ color: "#fff" }}>${fish.rawValue}</strong></div>; })}
              <div style={{ fontSize: "0.62rem", background: "rgba(251,191,36,0.12)", borderRadius: "6px", padding: "0.15rem 0.4rem", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>✨ Priceless</div>
            </div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", marginTop: "0.3rem" }}>Sell via market workers · craft in Crafting for more value</div>
          </div>
        </div>
      )}
    </div>
  );
}
 
export default function PondZone({ game, onBuyPond, onUpgradeRod, onBuyTrap, onCatchFish, onApplyGoldenBonus }) {
  const pond = game.pond ?? {};
  const pondOwned = pond.owned === true;
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
  phaseRef.current = phase; needleDirRef.current = needleDir; needlePosRef.current = needlePos;
 
  const rod = getRodTier(pond.rodTier ?? "twig");
  const catBonus = (game.pets?.cat?.mood ?? 0) >= 50 ? 0.20 : 0;
  const effectiveSweetSpotWidth = Math.min(0.6, rod.sweetSpotWidth * (1 + catBonus));
 
  const runLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;
    const p = phaseRef.current;
    if (p === "needle") {
      const dir = needleDirRef.current;
      let next = needlePosRef.current + NEEDLE_SWEEP_SPEED * dt * dir;
      let newDir = dir;
      if (next >= 1) { next = 1; newDir = -1; } if (next <= 0) { next = 0; newDir = 1; }
      needlePosRef.current = next; setNeedlePos(next);
      if (newDir !== dir) { needleDirRef.current = newDir; setNeedleDir(newDir); }
    }
    if (p === "reel") {
      // Use ref for progress to avoid stale closure in tap handler
      const newProgress = Math.max(0, reelProgressRef.current - REEL_DRAIN_RATE * dt);
      reelProgressRef.current = newProgress;
      setReelProgress(newProgress);
      setReelTimeLeft((prev) => {
        const next = prev - dt;
        if (next <= 0) { setCatchResult({ caught: false, fishId: "bass" }); setPhase("result"); phaseRef.current = "result"; return 0; }
        return next;
      });
    }
    animRef.current = requestAnimationFrame(runLoop);
  }, []);
 
  useEffect(() => {
    if (phase === "needle" || phase === "reel") { lastTimeRef.current = null; animRef.current = requestAnimationFrame(runLoop); }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, runLoop]);
 
  function handleCast() {
    if (phase !== "idle") return;
    setPhase("waiting"); phaseRef.current = "waiting";
    const biteMs = (rod.biteTimeMin + Math.random() * (rod.biteTimeMax - rod.biteTimeMin)) * 1000;
    biteTimerRef.current = setTimeout(() => {
      const margin = 0.05; const maxStart = 1 - effectiveSweetSpotWidth - margin;
      const newStart = margin + Math.random() * (maxStart - margin); setSweetSpotStart(newStart);
      const startPos = Math.random() < 0.5 ? 0.02 : 0.98; needlePosRef.current = startPos; setNeedlePos(startPos);
      const newDir = startPos < 0.5 ? 1 : -1; needleDirRef.current = newDir; setNeedleDir(newDir);
      setPhase("needle"); phaseRef.current = "needle";
    }, biteMs);
  }
 
  function handleNeedleTap() {
    if (phase !== "needle") return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const pos = needlePosRef.current;
    const inZone = pos >= sweetSpotStart && pos <= sweetSpotStart + effectiveSweetSpotWidth;
    if (!inZone) { setCatchResult({ caught: false, fishId: "minnow" }); setPhase("result"); phaseRef.current = "result"; return; }
    const center = sweetSpotStart + effectiveSweetSpotWidth / 2;
    const quality = Math.max(0, 1 - Math.abs(pos - center) / (effectiveSweetSpotWidth / 2));
    const initialProgress = 0.15 + quality * 0.2;
    setNeedleQuality(quality); reelProgressRef.current = initialProgress; setReelProgress(initialProgress); setReelTimeLeft(REEL_DURATION);
    lastTimeRef.current = null; setPhase("reel"); phaseRef.current = "reel";
  }
 
  function handleReelTap() {
    if (phaseRef.current !== "reel") return;
    // Apply tap directly to ref so it's never stale vs the rAF drain
    const next = reelProgressRef.current + REEL_TAP_AMOUNT;
    if (next >= 1) {
      reelProgressRef.current = 1;
      setReelProgress(1);
      const fishId = rollFish(selectedBait ?? "none", needleQuality);
      const fish = FISH_TYPES[fishId]; let bonus = null;
      if (fishId === "golden_fish") { bonus = GOLDEN_FISH_BONUSES[Math.floor(Math.random() * GOLDEN_FISH_BONUSES.length)]; onApplyGoldenBonus?.(bonus.id); }
      else { onCatchFish?.(fishId, selectedBait); }
      setCatchResult({ caught: true, fishId, bonus });
      setLastCatches((p) => [{ fishId, emoji: fish.emoji, id: Date.now() + Math.random() }, ...p].slice(0, 6));
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
 
  // ── Buy pond screen ──────────────────────────────────────────────────────
  if (!pondOwned) {
    const canAfford = (game.cash ?? 0) >= POND_COST;
    return (
      <div style={{ background: "linear-gradient(135deg, #071929, #0c3356)", borderRadius: "16px", padding: "2.5rem 1.5rem", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🎣</div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", marginBottom: "0.4rem", letterSpacing: "0.04em" }}>Build a Pond</h3>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: "250px", margin: "0 auto 1.5rem" }}>
          Fish manually for rare catches, or set a trap for passive income. Rare fish only appear when you're actively playing.
        </p>
        <button onClick={onBuyPond} disabled={!canAfford} style={{ background: canAfford ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.06)", border: `1px solid ${canAfford ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.12)"}`, borderRadius: "12px", padding: "0.7rem 1.75rem", fontSize: "0.82rem", fontWeight: 700, color: canAfford ? "#fff" : "rgba(255,255,255,0.25)", cursor: canAfford ? "pointer" : "default", letterSpacing: "0.04em" }}>
          {canAfford ? `🎣 Build Pond — $${POND_COST}` : `Need $500 (have $${Math.floor(game.cash ?? 0)})`}
        </button>
      </div>
    );
  }
 
  // ── Main pond UI — forced dark theme throughout ──────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", colorScheme: "dark", color: "#fff" }}>
      <style>{POND_STYLES}</style>
 
      {/* Main pond card */}
      <div style={{ background: "linear-gradient(180deg, #071929 0%, #0d3050 100%)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
 
        {/* Bait + recent catches row */}
        <div style={{ padding: "0.75rem 0.85rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
          <RecentCatches catches={lastCatches} />
          <BaitRow game={game} selectedBait={selectedBait} onSelect={setSelectedBait} />
        </div>
 
        {/* Water scene — game mechanics live inside here */}
        <div style={{
          position: "relative", minHeight: "190px",
          background: "linear-gradient(180deg, #071a2e 0%, #0c3356 55%, #1a5c8a 100%)",
          margin: "0.5rem 0.85rem 0.85rem",
          borderRadius: "12px", overflow: "hidden",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "0.75rem", padding: "1rem",
        }}>
          {/* Water shimmer */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50px", background: "linear-gradient(to top, rgba(10,30,60,0.8), transparent)", pointerEvents: "none" }} />
          {/* Lily pads */}
          <div style={{ position: "absolute", bottom: "12px", left: "8%", fontSize: "1.1rem", opacity: 0.45, pointerEvents: "none" }}>🌿</div>
          <div style={{ position: "absolute", bottom: "16px", right: "12%", fontSize: "0.85rem", opacity: 0.3, pointerEvents: "none" }}>🌿</div>
 
          {/* Idle */}
          {phase === "idle" && (
            <>
              <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>🎣</div>
              <button onClick={handleCast} style={{ padding: "0.65rem 2rem", background: "rgba(99,102,241,0.35)", border: "2px solid rgba(99,102,241,0.7)", borderRadius: "12px", fontSize: "0.88rem", fontWeight: 800, color: "#fff", cursor: "pointer", letterSpacing: "0.08em", boxShadow: "0 0 20px rgba(99,102,241,0.25)" }}>
                Cast Line
              </button>
              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                rare fish only appear while playing
              </div>
            </>
          )}
 
          {/* Waiting */}
          {phase === "waiting" && (
            <>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "2.2rem", animation: "bobber-idle 2s ease-in-out infinite" }}>🪝</div>
                {[0, 0.6, 1.2].map((d, i) => (
                  <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: "50px", height: "18px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%", transform: "translate(-50%, 60%)", animation: `ripple 2.4s ease-out ${d}s infinite`, pointerEvents: "none" }} />
                ))}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", fontWeight: 600 }}>Waiting for a bite...</div>
            </>
          )}
 
          {/* Needle */}
          {phase === "needle" && (
            <>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.08em", animation: "bobber-bite 0.5s ease-in-out infinite" }}>
                🐟 FISH ON THE LINE!
              </div>
              <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
                <NeedleBar position={needlePos} sweetSpotStart={sweetSpotStart} sweetSpotWidth={effectiveSweetSpotWidth} onTap={handleNeedleTap} />
              </div>
            </>
          )}
 
          {/* Reel */}
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
 
        {/* Catch result — always BELOW the water scene */}
        {phase === "result" && catchResult && (
          <div style={{ padding: "0 0.85rem 0.85rem" }}>
            <CatchResultCard result={catchResult} onDismiss={handleDismiss} />
          </div>
        )}
      </div>
 
      {/* Fish inventory — only shown when there are fish */}
      {Object.values(pond.fish ?? {}).some((v) => v > 0) && (
        <div style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "0.7rem 0.85rem" }}>
          <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.45rem" }}>FISH INVENTORY</div>
          <FishInventory pond={pond} />
        </div>
      )}
 
      {/* Fish rarity reference — always visible */}
      <div style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "0.65rem 0.85rem" }}>
        <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>FISH & REWARDS</div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[
            { emoji: "🐟", label: "Minnow", value: "$2",    sub: "Common",     color: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.12)", textColor: "#fff" },
            { emoji: "🎣", label: "Bass",   value: "$8",    sub: "Uncommon",   color: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)",  textColor: "#a5b4fc" },
            { emoji: "🐠", label: "Perch",  value: "$12",   sub: "Uncommon",   color: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.2)",  textColor: "#a5b4fc" },
            { emoji: "🦈", label: "Pike",   value: "$35",   sub: "Rare ✦",     color: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", textColor: "#fcd34d" },
            { emoji: "✨", label: "Golden", value: "Bonus", sub: "Legend ✦✦",  color: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)",  textColor: "#fbbf24" },
          ].map(({ emoji, label, value, sub, color, border, textColor }) => (
            <div key={label} style={{ flex: 1, textAlign: "center", background: color, border: `1px solid ${border}`, borderRadius: "10px", padding: "0.5rem 0.2rem" }}>
              <div style={{ fontSize: "1.2rem", lineHeight: 1, marginBottom: "0.25rem" }}>{emoji}</div>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: textColor }}>{value}</div>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)", marginTop: "0.1rem", lineHeight: 1.3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
 
      {/* Tips */}
      <div style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "0.65rem 0.85rem", fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
        <div>🎯 <strong style={{ color: "rgba(255,255,255,0.8)" }}>Needle:</strong> Stop in the green zone — center = better rare odds</div>
        <div>🎣 <strong style={{ color: "rgba(255,255,255,0.8)" }}>Reel:</strong> Tap fast — the bar drains while you hesitate</div>
        <div>✨ <strong style={{ color: "#fbbf24" }}>Rare & legendary fish only appear when you play manually</strong></div>
      </div>
 
      {/* Upgrades — collapsed by default */}
      <UpgradesPanel pond={pond} game={game} onUpgradeRod={onUpgradeRod} onBuyTrap={onBuyTrap} />
    </div>
  );
}