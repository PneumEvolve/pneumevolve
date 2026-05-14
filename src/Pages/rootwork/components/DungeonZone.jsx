// src/Pages/rootwork/components/DungeonZone.jsx
// Battleheart-style dungeon — real-time, tap to move/attack, 3-hero party
// Combat state is lifted into DungeonZone so tab-switching doesn't reset it.

import { useState, useEffect, useRef, useCallback } from "react";
import { ARTISAN_FOOD_HEAL, ARTISAN_FOOD_LIST } from "../gameConstants";

// ─── Constants ────────────────────────────────────────────────────────────────

const BF_W = 340;
const BF_H = 280;
const UNIT_R = 22;
const TICK_MS = 80;
const HERO_SPEED = 55;
const ENEMY_SPEED = 38;
const ATTACK_RANGE = UNIT_R * 2.6;
const ENEMY_ATTACK_RANGE = UNIT_R * 2.4;
const MAP_W = 7;
const MAP_H = 7;
const PARTY_SIZE = 3;
const BLADE_RUSH_DURATION = 2;
const BLADE_RUSH_ATTACK_COUNT = 3;
const BLADE_RUSH_ATTACK_GAP = 0.12;
const HOT_DURATION = 5;

// ─── Class definitions ────────────────────────────────────────────────────────

const DUNGEON_CLASS = {
  fighter: {
    label: "Fighter", emoji: "⚔️", color: "#f87171", bg: "#7f1d1d",
    hpMult: 1.5, atkMult: 0.8, defBonus: 4,
    attackSpeed: 1.4, attackRange: ATTACK_RANGE,
    ability: { name: "Taunt", emoji: "📢", cooldown: 8, desc: "All enemies focus Fighter for 4s" },
  },
  mage: {
    label: "Mage", emoji: "🧙", color: "#a78bfa", bg: "#2e1065",
    hpMult: 0.8, atkMult: 1.1, defBonus: 0,
    attackSpeed: 0.7, attackRange: ATTACK_RANGE * 1.5,
    ability: { name: "Mend", emoji: "💚", cooldown: 10, desc: "Heals lowest HP ally" },
  },
  scavenger: {
    label: "Scavenger", emoji: "🌿", color: "#34d399", bg: "#064e3b",
    hpMult: 0.95, atkMult: 1.6, defBonus: 1,
    attackSpeed: 1.2, attackRange: ATTACK_RANGE,
    ability: { name: "Blade Rush", emoji: "⚡", cooldown: 6, desc: "+50% speed for 2s then 3 rapid attacks" },
  },
};

// ─── Enemy types ──────────────────────────────────────────────────────────────

const ENEMY_TYPES = {
  goblin: {
    name: "Goblin", emoji: "👺", color: "#dc2626", bg: "#450a0a",
    hp: 28, atk: 12, def: 1, speed: ENEMY_SPEED * 1.2, attackSpeed: 1.0,
    attackRange: ENEMY_ATTACK_RANGE, xp: 8,
    loot: { iron_ore: [1, 3], lumber: [1, 3] },
  },
  skeleton: {
    name: "Skeleton", emoji: "💀", color: "#9ca3af", bg: "#111827",
    hp: 45, atk: 9, def: 2, speed: ENEMY_SPEED, attackSpeed: 0.7,
    attackRange: ENEMY_ATTACK_RANGE, xp: 12,
    loot: { iron_ore: [1, 3], lumber: [1, 3] },
    special: "revive",
  },
  orc: {
    name: "Orc", emoji: "👹", color: "#f97316", bg: "#431407",
    hp: 80, atk: 14, def: 4, speed: ENEMY_SPEED * 0.7, attackSpeed: 0.5,
    attackRange: ENEMY_ATTACK_RANGE * 1.1, xp: 22,
    loot: { iron_fitting: [1, 2] },
  },
  troll: {
    name: "Troll", emoji: "🧌", color: "#84cc16", bg: "#1a2e05",
    hp: 140, atk: 20, def: 6, speed: ENEMY_SPEED * 0.5, attackSpeed: 0.4,
    attackRange: ENEMY_ATTACK_RANGE * 1.2, xp: 40,
    loot: { rare_gem: [1, 2] },
  },
  shadow: {
    name: "Shadow", emoji: "🌑", color: "#6366f1", bg: "#1e1b4b",
    hp: 55, atk: 11, def: 1, speed: ENEMY_SPEED * 1.4, attackSpeed: 1.0,
    attackRange: ENEMY_ATTACK_RANGE, xp: 18,
    loot: { iron_ore: [1, 3] },
    special: "teleport",
  },
  cultist: {
    name: "Cultist", emoji: "🔮", color: "#c084fc", bg: "#3b0764",
    hp: 50, atk: 18, def: 1, speed: ENEMY_SPEED * 0.8, attackSpeed: 0.3,
    attackRange: ENEMY_ATTACK_RANGE * 2.2, xp: 20,
    loot: { lumber: [1, 3] },
    special: "channel",
  },
  stone_golem: {
    name: "Stone Golem", emoji: "🪨", color: "#78716c", bg: "#1c1917",
    hp: 120, atk: 16, def: 10, speed: ENEMY_SPEED * 0.4, attackSpeed: 0.35,
    attackRange: ENEMY_ATTACK_RANGE * 1.1, xp: 35,
    loot: { iron_ore: [3, 6], iron_fitting: [1, 2] },
    special: "armor_break",
  },
  banshee: {
    name: "Banshee", emoji: "👻", color: "#e879f9", bg: "#4a044e",
    hp: 65, atk: 13, def: 0, speed: ENEMY_SPEED * 1.1, attackSpeed: 0.8,
    attackRange: ENEMY_ATTACK_RANGE, xp: 28,
    loot: { lumber: [2, 4] },
    special: "death_curse",
  },
};

const ENEMY_POOL = [
  ["goblin"],
  ["goblin", "shadow"],
  ["skeleton", "cultist"],
  ["orc", "stone_golem"],
  ["troll", "banshee"],
  ["orc", "troll", "shadow", "banshee", "stone_golem", "cultist"],
];

// ─── Utility ──────────────────────────────────────────────────────────────────

let _uid = 0;
function uid(p = "u") { return `${p}_${++_uid}_${Date.now()}`; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function moveToward(pos, target, speed, dt) {
  const d = dist(pos, target);
  if (d < 1) return { ...target };
  const t = Math.min(1, (speed * dt) / d);
  return { x: lerp(pos.x, target.x, t), y: lerp(pos.y, target.y, t) };
}

function getNextBeltItem(foodBelt) {
  const items = ARTISAN_FOOD_LIST
    .filter(id => (foodBelt?.[id] ?? 0) > 0)
    .map(id => ({ id, heal: ARTISAN_FOOD_HEAL?.[id]?.healAmount ?? 0 }))
    .sort((a, b) => a.heal - b.heal);
  return items[0] ?? null;
}

// ─── Unit factories ───────────────────────────────────────────────────────────

function makeHero(adv, index) {
  const resolvedClass = adv.heroClass ?? adv.class ?? null;
  const cls = (resolvedClass && DUNGEON_CLASS[resolvedClass]) ? DUNGEON_CLASS[resolvedClass] : {
    label: "Adventurer", emoji: "🧭", color: "#94a3b8", bg: "#1e293b",
    hpMult: 1.0, atkMult: 1.0, defBonus: 0,
    attackSpeed: 1.0, attackRange: ATTACK_RANGE,
    ability: { name: "Focus", emoji: "🎯", cooldown: 12, desc: "Deal 1.5x damage on next attack" },
  };
  const baseHp = adv.maxHp ?? 40;
  const baseAtk = 5 + (adv.level ?? 1) * 1.5 + (adv.gear ?? 0) * 4;
  // Heroes start unplaced (off the left edge); player positions them in placement phase
  const startX = -UNIT_R * 3;
  const startY = 60 + index * 70;
  const maxHpVal = Math.floor(baseHp * cls.hpMult);
  const currentHp = adv.currentDungeonHp != null ? Math.min(adv.currentDungeonHp, maxHpVal) : maxHpVal;
  return {
    id: adv.id, kind: "hero", name: adv.name,
    heroClass: resolvedClass,
    emoji: cls.emoji, color: cls.color, bg: cls.bg, label: cls.label,
    x: startX, y: startY, targetX: startX, targetY: startY,
    placed: false,
    attackTarget: null,
    hp: currentHp, maxHp: maxHpVal,
    atk: Math.floor(baseAtk * cls.atkMult), def: cls.defBonus + Math.floor((adv.gear ?? 0) * 0.5),
    attackSpeed: cls.attackSpeed, attackRange: cls.attackRange,
    attackCooldown: 0,
    ability: { ...cls.ability, cooldownLeft: 0 },
    tauntActive: false, dead: false, flashHit: false,
    bladeRushActive: false, bladeRushTimeLeft: 0,
    bladeRushAttacksLeft: 0, bladeRushAttackTimer: 0,
    hotRemaining: 0, hotDuration: 0,
    foodBelt: { ...(adv.foodBelt ?? {}) },
    foodUsed: {},
  };
}

function makeEnemy(typeId, index, depth) {
  const def = ENEMY_TYPES[typeId];
  const scale = 1 + depth * 0.28;
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    id: uid("e"), kind: "enemy", typeId,
    name: def.name, emoji: def.emoji, color: def.color, bg: def.bg,
    x: clamp(BF_W - 55 - col * 65 + randInt(-10, 10), UNIT_R + 5, BF_W - UNIT_R - 5),
    y: clamp(60 + row * 80 + randInt(-10, 10), UNIT_R + 5, BF_H - UNIT_R - 5),
    hp: Math.floor(def.hp * scale), maxHp: Math.floor(def.hp * scale),
    atk: Math.floor(def.atk * scale), def: def.def,
    speed: def.speed, attackSpeed: def.attackSpeed, attackRange: def.attackRange,
    attackCooldown: 0,
    taunted: false, dead: false, flashHit: false,
    special: def.special ?? null,
    revived: false,
    teleportTimer: randInt(2, 4),
    channelTimer: 0, channeling: false, interrupted: false,
    defReduced: false,
  };
}

// ─── Map generation ───────────────────────────────────────────────────────────

function generateMap() {
  const cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2);
  // Randomize exit: pick a random edge cell that isn't the start
  const edgeCells = [];
  for (let ex = 0; ex < MAP_W; ex++) { edgeCells.push({ x: ex, y: 0 }); edgeCells.push({ x: ex, y: MAP_H - 1 }); }
  for (let ey = 1; ey < MAP_H - 1; ey++) { edgeCells.push({ x: 0, y: ey }); edgeCells.push({ x: MAP_W - 1, y: ey }); }
  const validExits = edgeCells.filter(e => !(e.x === cx && e.y === cy));
  const exitCell = validExits[Math.floor(Math.random() * validExits.length)];
  const cells = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let type = "empty";
      if (x === cx && y === cy) type = "start";
      else if (x === exitCell.x && y === exitCell.y) type = "exit";
      else {
        const d = Math.abs(x - cx) + Math.abs(y - cy), r = Math.random();
        if (d === 1)     type = r < 0.2  ? "enemy" : r < 0.28 ? "trap" : "empty";
        else if (d <= 3) type = r < 0.35 ? "enemy" : r < 0.45 ? "trap" : r < 0.62 ? "treasure" : "empty";
        else             type = r < 0.38 ? "enemy" : r < 0.48 ? "trap" : r < 0.65 ? "treasure" : r < 0.78 ? "rest" : "empty";
      }
      cells.push({ x, y, type, visited: x === cx && y === cy, cleared: false });
    }
  }
  return cells;
}

// ─── HpBar ────────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, height = 4 }) {
  const pct = clamp(hp / maxHp, 0, 1);
  const col = pct > 0.55 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ height, background: "rgba(255,255,255,0.1)", borderRadius: height, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct * 100}%`, background: col, transition: "width 0.2s" }} />
    </div>
  );
}

// ─── FloatingText ─────────────────────────────────────────────────────────────

function FloatingText({ items }) {
  return <>
    {items.map(item => (
      <div key={item.id} style={{
        position: "absolute", left: item.x, top: item.y,
        fontSize: "0.72rem", fontWeight: 800, color: item.color,
        pointerEvents: "none", whiteSpace: "nowrap",
        animation: "floatUp 1s ease-out forwards",
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
        transform: "translateX(-50%)", zIndex: 20,
      }}>{item.text}</div>
    ))}
  </>;
}

// ─── UnitCircle — pure display, no event handlers ────────────────────────────

function UnitCircle({ unit, selected }) {
  const pct = clamp(unit.hp / unit.maxHp, 0, 1);
  const barCol = pct > 0.55 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
  const size = UNIT_R * 2;
  const hasHot = unit.kind === "hero" && (unit.hotRemaining ?? 0) > 0;
  const isBladeRush = unit.kind === "hero" && unit.bladeRushActive;
  return (
    <div style={{
      position: "absolute", left: unit.x - UNIT_R, top: unit.y - UNIT_R,
      width: size, height: size, borderRadius: "50%",
      background: unit.bg,
      border: `2px solid ${selected ? "#fff" : unit.color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1rem", userSelect: "none",
      transition: "left 0.08s linear, top 0.08s linear",
      boxShadow: selected
        ? `0 0 0 3px ${unit.color}, 0 0 14px ${unit.color}88`
        : unit.flashHit ? "0 0 12px #ef444488"
        : "0 2px 8px rgba(0,0,0,0.6)",
      opacity: unit.dead ? 0 : 1,
      zIndex: selected ? 10 : unit.kind === "hero" ? 5 : 4,
      pointerEvents: "none", // all input goes through the battlefield div
    }}>
      {unit.emoji}
      <div style={{
        position: "absolute", bottom: -6, left: -2, right: -2, height: 3,
        background: "rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: barCol, transition: "width 0.2s" }} />
      </div>
      {selected && (
        <div style={{
          position: "absolute", inset: -5, borderRadius: "50%",
          border: `2px solid ${unit.color}`,
          animation: "ringPulse 1s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      {hasHot && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: "2px solid #4ade80",
          animation: "ringPulse 0.7s ease-in-out infinite",
          pointerEvents: "none", opacity: 0.8,
        }} />
      )}
      {isBladeRush && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: "50%",
          border: "2px solid #fbbf24",
          animation: "ringPulse 0.4s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      {unit.taunted && <div style={{ position: "absolute", top: -10, fontSize: "0.6rem", pointerEvents: "none" }}>📢</div>}
      {unit.channeling && <div style={{ position: "absolute", top: -12, fontSize: "0.65rem", animation: "ringPulse 0.5s infinite", pointerEvents: "none" }}>🔮</div>}
    </div>
  );
}

// ─── AbilityBar ───────────────────────────────────────────────────────────────

function AbilityBar({ hero, onUseAbility, onUseFood }) {
  if (!hero) return null;
  const ab = hero.ability;
  const abilityReady = ab.cooldownLeft <= 0 && !hero.dead && !hero.bladeRushActive;
  const nextFood = getNextBeltItem(hero.foodBelt);
  const foodDef = nextFood ? ARTISAN_FOOD_HEAL?.[nextFood.id] : null;

  return (
    <div style={{
      display: "flex", gap: 8, marginBottom: "0.5rem",
      padding: "0.4rem 0.5rem",
      background: "rgba(255,255,255,0.03)",
      borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <button
        onClick={() => abilityReady && onUseAbility(hero.id)}
        disabled={!abilityReady}
        style={{
          flex: 1, padding: "0.35rem 0.25rem", borderRadius: 8,
          background: abilityReady ? `${hero.color}22` : "rgba(255,255,255,0.04)",
          border: `1px solid ${abilityReady ? hero.color + "88" : "rgba(255,255,255,0.1)"}`,
          color: abilityReady ? hero.color : "var(--muted)",
          fontSize: "0.6rem", fontWeight: 700, cursor: abilityReady ? "pointer" : "default",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          position: "relative", overflow: "hidden",
        }}>
        <span style={{ fontSize: "1rem" }}>{ab.emoji}</span>
        <span>{ab.name}</span>
        {ab.cooldownLeft > 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.65)", borderRadius: 8,
            fontSize: "0.75rem", fontWeight: 800, color: "#fff",
          }}>
            {Math.ceil(ab.cooldownLeft)}s
          </div>
        )}
      </button>
      <button
        onClick={() => nextFood && onUseFood(hero.id, nextFood.id)}
        disabled={!nextFood}
        style={{
          flex: 1, padding: "0.35rem 0.25rem", borderRadius: 8,
          background: nextFood ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${nextFood ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
          color: nextFood ? "#4ade80" : "var(--muted)",
          fontSize: "0.6rem", fontWeight: 700, cursor: nextFood ? "pointer" : "default",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}>
        {nextFood ? (
          <>
            <span style={{ fontSize: "1rem" }}>{foodDef?.emoji ?? "🍞"}</span>
            <span>{foodDef?.name ?? nextFood.id}</span>
            <span style={{ fontSize: "0.52rem", color: "rgba(74,222,128,0.7)" }}>
              +{foodDef?.healAmount ?? "?"} HP · HoT
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "1rem", opacity: 0.3 }}>🍽️</span>
            <span>Empty</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Battlefield — pure display + input, no game state ───────────────────────
// All state lives in DungeonZone above so tab-switching doesn't reset combat.

function Battlefield({
  heroes, enemies, selected, floats, log, phase, initResult, countdown, result,
  depth, onTap, onSelectHero, onUseAbility, onUseFood, onCombatEnd, onPlacementReady,
}) {
  const battlefieldRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  function handleTap(e) {
    // Deduplicate onTouchStart + onClick (both fire on mobile)
    const now = Date.now();
    if (now - lastTapTimeRef.current < 400) return;
    lastTapTimeRef.current = now;

    if (!battlefieldRef.current) return;
    const rect = battlefieldRef.current.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? e.clientY;
    if (clientX == null || clientY == null) return;

    const scaleX = BF_W / rect.width;
    const scaleY = BF_H / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    onTap(x, y, phase);
  }

  const selHero = heroes.find(h => h.id === selected && !h.dead) ?? null;

  return (
    <div style={{ padding: "0.6rem" }}>
      <style>{`
        @keyframes ringPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes floatUp { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-32px)} }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 800 }}>⚔️ Combat — Depth {depth}</div>
        <div style={{
          fontSize: "0.65rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: 20,
          background: phase === "placement" ? "rgba(99,102,241,0.15)" : phase === "prep" ? "rgba(74,222,128,0.12)" : phase === "enemy_advance" ? "rgba(239,68,68,0.12)" : phase === "fighting" ? "rgba(74,222,128,0.12)" : phase === "victory" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${phase === "placement" ? "rgba(99,102,241,0.45)" : phase === "prep" ? "rgba(74,222,128,0.35)" : phase === "enemy_advance" ? "rgba(239,68,68,0.35)" : phase === "fighting" ? "rgba(74,222,128,0.35)" : phase === "victory" ? "rgba(251,191,36,0.4)" : "rgba(239,68,68,0.35)"}`,
          color: phase === "placement" ? "#a5b4fc" : phase === "prep" ? "#4ade80" : phase === "enemy_advance" ? "#f87171" : phase === "fighting" ? "#4ade80" : phase === "victory" ? "#fbbf24" : "#f87171",
        }}>
          {phase === "placement" ? "📍 PLACE" : phase === "initiative" ? "⚄ INITIATIVE" : phase === "prep" ? `⏳ ${countdown}s` : phase === "enemy_advance" ? `⚠️ ${countdown}s` : phase === "fighting" ? "LIVE" : phase === "victory" ? "VICTORY" : "DEFEAT"}
        </div>
      </div>

      {/* Hint */}
      <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
        {phase === "placement"
          ? (() => {
              const unplaced = heroes.filter(h => !h.placed && !h.dead);
              const sel = heroes.find(h => h.id === selected);
              if (unplaced.length === 0) return "All heroes placed — tap Ready to begin!";
              return sel
                ? `📍 ${sel.emoji} ${sel.name} · tap left half to place (${unplaced.length} remaining)`
                : "Tap a hero below to select, then tap the left side to place";
            })()
          : phase === "prep"
          ? (selHero ? `${selHero.emoji} ${selHero.name} · tap to reposition` : "Adjust positions before battle!")
          : phase === "enemy_advance"
          ? "⚠️ Enemies are advancing — brace yourself!"
          : selHero
          ? `${selHero.emoji} ${selHero.name} · tap to move · tap enemy to attack`
          : "Tap a hero to select"}
      </div>

      {/* Battlefield canvas */}
      <div
        ref={battlefieldRef}
        onTouchStart={handleTap}
        onClick={handleTap}
        style={{
          position: "relative", width: "100%", maxWidth: BF_W, height: BF_H,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden", cursor: "crosshair", marginBottom: "0.55rem",
          boxShadow: "inset 0 2px 20px rgba(0,0,0,0.5)",
          userSelect: "none", touchAction: "none",
        }}>
        {/* Grid lines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.018) 39px,rgba(255,255,255,0.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.018) 39px,rgba(255,255,255,0.018) 40px)",
        }} />
        <div style={{
          position: "absolute", left: BF_W / 2 - 1, top: "8%", bottom: "8%", width: 1,
          pointerEvents: "none",
          background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.07),transparent)",
        }} />

        {/* Placement zone highlight */}
        {phase === "placement" && (
          <div style={{
            position: "absolute", left: 0, top: 0, width: BF_W / 2 - 2, bottom: 0,
            background: "rgba(99,102,241,0.07)", borderRight: "1px dashed rgba(99,102,241,0.35)",
            pointerEvents: "none",
          }}>
            <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: "0.55rem", color: "rgba(99,102,241,0.6)", fontWeight: 700, letterSpacing: "0.08em" }}>
              PLACE HEROES HERE
            </div>
          </div>
        )}

        <FloatingText items={floats} />
        {enemies.map(e => <UnitCircle key={e.id} unit={e} selected={false} />)}
        {heroes.map(h => (
          <div key={h.id} style={{ opacity: (!h.placed && phase === "placement") ? 0.45 : 1, transition: "opacity 0.2s" }}>
            <UnitCircle unit={h} selected={selected === h.id} />
          </div>
        ))}

        {/* Initiative overlay */}
        {phase === "initiative" && initResult && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.7)",
            flexDirection: "column", gap: "0.4rem", pointerEvents: "none",
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Initiative Roll
            </div>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: initResult.playerWins ? "#4ade80" : "#f87171" }}>{initResult.playerRoll}</div>
                <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>Your Party</div>
              </div>
              <div style={{ fontSize: "1rem", color: "var(--muted)" }}>vs</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: initResult.playerWins ? "#f87171" : "#4ade80" }}>{initResult.enemyRoll}</div>
                <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>Enemies</div>
              </div>
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: initResult.playerWins ? "#4ade80" : "#f87171", marginTop: "0.2rem" }}>
              {initResult.playerWins ? "⚡ You go first!" : "💀 Enemies advance!"}
            </div>
          </div>
        )}

        {/* Placement overlay — shows "READY" button when all placed */}
        {phase === "placement" && (() => {
          const allPlaced = heroes.every(h => h.placed || h.dead);
          if (!allPlaced) return null;
          return (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.45)",
              flexDirection: "column", gap: "0.5rem",
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>
                All heroes placed!
              </div>
              <button
                onClick={onPlacementReady}
                style={{
                  padding: "0.55rem 2rem", borderRadius: 10, fontWeight: 800, fontSize: "0.9rem",
                  background: "rgba(99,102,241,0.25)", border: "2px solid rgba(99,102,241,0.7)",
                  color: "#a5b4fc", cursor: "pointer",
                  boxShadow: "0 0 20px rgba(99,102,241,0.4)",
                  animation: "ringPulse 1s ease-in-out infinite",
                }}>
                ⚔️ Ready!
              </button>
            </div>
          );
        })()}

        {/* Prep overlay */}
        {phase === "prep" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.4)",
            flexDirection: "column", gap: "0.35rem", pointerEvents: "none",
          }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Battle starts in
            </div>
            <div style={{
              fontSize: "3.5rem", fontWeight: 900, lineHeight: 1,
              color: countdown <= 2 ? "#ef4444" : countdown <= 3 ? "#fbbf24" : "#4ade80",
              textShadow: `0 0 30px ${countdown <= 2 ? "#ef4444" : countdown <= 3 ? "#fbbf24" : "#4ade80"}`,
              animation: "ringPulse 0.9s ease-in-out infinite",
            }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Enemy advance overlay */}
        {phase === "enemy_advance" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.45)",
            flexDirection: "column", gap: "0.35rem", pointerEvents: "none",
          }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#f87171", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              ⚠️ Enemies Advance
            </div>
            <div style={{
              fontSize: "3.5rem", fontWeight: 900, lineHeight: 1, color: "#ef4444",
              textShadow: "0 0 30px #ef4444",
              animation: "ringPulse 0.9s ease-in-out infinite",
            }}>
              {countdown}
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)" }}>Brace for impact</div>
          </div>
        )}

        {/* Victory/Defeat overlay */}
        {(phase === "victory" || phase === "defeat") && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.6)",
            flexDirection: "column", gap: "0.5rem", pointerEvents: "none",
          }}>
            <div style={{ fontSize: "2.5rem" }}>{phase === "victory" ? "🏆" : "💀"}</div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: phase === "victory" ? "#fbbf24" : "#ef4444" }}>
              {phase === "victory" ? "Victory!" : "Defeated"}
            </div>
          </div>
        )}
      </div>

      {/* Mini hero bars — tap to select */}
      <div style={{ display: "flex", gap: 4, marginBottom: "0.4rem" }}>
        {heroes.map(h => (
          <div
            key={h.id}
            onTouchStart={() => !h.dead && onSelectHero(h.id)}
            onClick={() => !h.dead && onSelectHero(h.id)}
            style={{
              flex: 1, padding: "0.3rem 0.35rem", borderRadius: 7, cursor: h.dead ? "default" : "pointer",
              background: selected === h.id ? `${h.color}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected === h.id ? h.color + "55" : h.placed === false && phase === "placement" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.07)"}`,
              opacity: h.dead ? 0.35 : 1, transition: "all 0.15s",
            }}>
            <div style={{ fontSize: "0.75rem", textAlign: "center" }}>{h.emoji}</div>
            <HpBar hp={h.hp} maxHp={h.maxHp} height={3} />
            <div style={{ fontSize: "0.5rem", color: "var(--muted)", textAlign: "center", marginTop: 2 }}>
              {phase === "placement" && !h.placed ? "📍 place" : `${Math.floor(h.hp)}/${h.maxHp}${h.hotRemaining > 0 ? " 🌿" : ""}`}
            </div>
          </div>
        ))}
      </div>

      <AbilityBar hero={selHero} onUseAbility={onUseAbility} onUseFood={onUseFood} />

      {/* Combat log */}
      <div style={{
        height: 52, overflowY: "auto", background: "rgba(0,0,0,0.25)", borderRadius: 8,
        padding: "0.28rem 0.5rem", fontSize: "0.62rem",
        fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        {log.map(e => (
          <div key={e.id} style={{
            color: e.color === "#4ade80" ? "#b8f0cb" : e.color === "var(--muted)" ? "#9eb4cc" : e.color,
            textShadow: "0 1px 3px rgba(0,0,0,0.95)",
          }}>{e.text}</div>
        ))}
      </div>

      {/* Result panel */}
      {result && (
        <div style={{
          marginTop: "0.5rem", padding: "0.7rem", borderRadius: 12, textAlign: "center",
          background: result.victory ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${result.victory ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {result.victory && Object.entries(result.loot ?? {}).map(([k, v]) => (
            <div key={k} style={{ fontSize: "0.75rem", color: "var(--text)" }}>🎒 +{v} {k.replace(/_/g, " ")}</div>
          ))}
          {result.victory && result.totalXp > 0 && (
            <div style={{ fontSize: "0.7rem", color: "#a78bfa", marginTop: "0.2rem" }}>✨ +{result.totalXp} XP shared</div>
          )}
          <button
            onClick={() => onCombatEnd(result)}
            style={{
              marginTop: "0.5rem", padding: "0.45rem 1.5rem", borderRadius: 8,
              fontWeight: 700, fontSize: "0.78rem",
              background: result.victory ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${result.victory ? "rgba(74,222,128,0.5)" : "rgba(239,68,68,0.4)"}`,
              color: result.victory ? "#4ade80" : "#ef4444", cursor: "pointer",
            }}>
            {result.victory ? "Continue →" : "Retreat"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EXPLORE MODE ─────────────────────────────────────────────────────────────

const MIN_EXPLORE_PCT = 0.55; // must explore 55% before exit is usable

function ExploreMode({ party, cells, setCells, pos, setPos, depth, onEnterCombat, onCollectTreasure, onRest, onTrap, onRetreat, onExit, onFinishRun, lootTotal, onUseFood }) {
  const CELL = 40;
  function getCell(x, y) { return cells.find(c => c.x === x && c.y === y) ?? null; }
  function adj() {
    return [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => getCell(pos.x + dx, pos.y + dy)).filter(Boolean);
  }
  const explorePct = cells.length > 0 ? cells.filter(c => c.visited).length / cells.length : 0;
  const exitUnlocked = explorePct >= MIN_EXPLORE_PCT;
  function moveToCell(x, y) {
    const target = getCell(x, y); if (!target) return;
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, visited: true } : c));
    setPos({ x, y });
    if (!target.cleared) {
      if (target.type === "enemy")    onEnterCombat(x, y);
      if (target.type === "treasure") onCollectTreasure(x, y);
      if (target.type === "rest")     onRest(x, y);
      if (target.type === "trap")     onTrap(x, y);
      if (target.type === "exit" && exitUnlocked) onExit();
    }
  }
  const adjacent = adj();
  const roomColor = { start: "#4ade8025", empty: "#ffffff08", enemy: "#ef444445", trap: "#ef444430", treasure: "#fbbf2445", rest: "#4ade8035", exit: "#a78bfa50" };
  const roomEmoji = { start: "🏠", empty: "", enemy: "👹", trap: "⚠️", treasure: "💰", rest: "🏕️", exit: "🚪" };

  return (
    <div style={{ padding: "0.65rem" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: "0.6rem" }}>
        {[
          { label: "Explored", value: `${Math.round(explorePct * 100)}%${!exitUnlocked ? " 🔒" : ""}`, color: exitUnlocked ? "#a78bfa" : "#fbbf24" },
          { label: "Enemies",  value: cells.filter(c => c.type === "enemy" && !c.cleared).length, color: "#f87171" },
          { label: "Depth",    value: depth, color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.3rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${MAP_W},${CELL}px)`, gap: 3,
        justifyContent: "center", background: "#0d0d12", borderRadius: 12, padding: "0.45rem",
        border: "1px solid rgba(255,255,255,0.08)", marginBottom: "0.6rem",
      }}>
        {cells.map(cell => {
          const isParty = cell.x === pos.x && cell.y === pos.y;
          const isAdj = adjacent.some(a => a.x === cell.x && a.y === cell.y);
          const visible = cell.visited || isAdj;
          const canMove = isAdj && !isParty;
          return (
            <div key={`${cell.x},${cell.y}`} onClick={() => canMove && moveToCell(cell.x, cell.y)} style={{
              width: CELL, height: CELL, borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isParty ? "1.2rem" : "0.95rem",
              background: !visible ? "rgba(0,0,0,0.7)" : isParty ? "rgba(99,102,241,0.28)" : roomColor[cell.type] ?? "#ffffff08",
              border: isParty ? "2px solid rgba(99,102,241,0.75)" : canMove ? `2px solid ${cell.type === "enemy" ? "rgba(239,68,68,0.75)" : cell.type === "treasure" ? "rgba(251,191,36,0.75)" : cell.type === "exit" ? "rgba(167,139,250,0.75)" : "rgba(255,255,255,0.4)"}` : cell.visited ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.03)",
              cursor: canMove ? "pointer" : "default", opacity: !visible ? 0.2 : 1, transition: "all 0.12s",
            }}>
              {isParty ? "🧭" : !visible ? null : cell.visited ? (
                (cell.type === "empty" || cell.cleared) && cell.type !== "start" && cell.type !== "exit"
                  ? <span style={{ fontSize: "0.65rem", color: "#4ade80" }}>✓</span>
                  : (roomEmoji[cell.type] || null)
              ) : <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>?</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <div style={{ width: "100%", fontSize: "0.62rem", color: "#a78bfa", marginBottom: "0.1rem" }}>
          Depth {depth} — reach 🚪 Exit ({Math.round(MIN_EXPLORE_PCT * 100)}% explored needed{!exitUnlocked ? ` · ${Math.round(explorePct * 100)}% so far` : " ✓"}) · ✅ Finish Run to collect loot
        </div>
        {[["🧭", "Party"], ["👹", "Enemy"], ["⚠️", "Trap"], ["💰", "Treasure"], ["🏕️", "Rest"], ["🚪", "Exit"]].map(([e, l]) => (
          <span key={l} style={{ fontSize: "0.6rem", color: "var(--muted)", display: "flex", gap: 3, alignItems: "center" }}>
            <span>{e}</span>{l}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "0.5rem" }}>
        {party.map(h => {
          const cls = (h.heroClass && DUNGEON_CLASS[h.heroClass]) ? DUNGEON_CLASS[h.heroClass] : { emoji: "🧭" };
          const currentHp = h.currentDungeonHp ?? h.dungeonMaxHp ?? h.maxHp ?? 40;
          const nextFood = getNextBeltItem(h.foodBelt);
          const foodDef = nextFood ? ARTISAN_FOOD_HEAL?.[nextFood.id] : null;
          const isDead = currentHp <= 0;
          return (
            <div key={h.id} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "0.3rem 0.35rem", border: `1px solid ${isDead ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}`, opacity: isDead ? 0.5 : 1 }}>
              <div style={{ fontSize: "0.8rem", textAlign: "center" }}>{cls.emoji}</div>
              <HpBar hp={currentHp} maxHp={h.dungeonMaxHp ?? h.maxHp} />
              <div style={{ fontSize: "0.52rem", color: isDead ? "#ef4444" : "var(--muted)", textAlign: "center", marginTop: 2 }}>
                {isDead ? "💀 Dead" : `${Math.floor(currentHp)}/${h.dungeonMaxHp ?? h.maxHp}`}
              </div>
              {!isDead && nextFood && onUseFood && (
                <button
                  onClick={() => onUseFood(h.id, nextFood.id)}
                  style={{
                    marginTop: 3, width: "100%", padding: "0.15rem 0", borderRadius: 5,
                    background: "rgba(74,222,128,0.14)", border: "1px solid rgba(74,222,128,0.35)",
                    color: "#4ade80", fontSize: "0.48rem", fontWeight: 700, cursor: "pointer",
                  }}>
                  {foodDef?.emoji ?? "🍞"} +{foodDef?.healAmount ?? "?"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(lootTotal).length > 0 && (
        <div style={{
          marginBottom: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: 8,
          background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)",
          fontSize: "0.65rem", color: "#4ade80",
        }}>
          🎒 {Object.entries(lootTotal).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`).join(" · ")}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onRetreat} style={{
          flex: 1, padding: "0.45rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)",
          color: "#f87171", cursor: "pointer",
        }}>🏳️ Retreat</button>
        <button onClick={onFinishRun} style={{
          flex: 1, padding: "0.45rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
          background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)",
          color: "#4ade80", cursor: "pointer",
        }}>✅ Finish Run</button>
      </div>
    </div>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function Lobby({ game, lastRun, pendingReward, onStart, onClaim, selectedHeroIds, setSelectedHeroIds, startDepth, setStartDepth }) {
  const hasPending = !!pendingReward;
  const maxDepthUnlocked = game?.maxDungeonDepth ?? 1;

  // All available heroes (not busy)
  const expeditionHeroIds = new Set();
  const exps = game?.expeditions ?? {};
  Object.values(exps).forEach(exp => { (exp.heroIds ?? []).forEach(id => expeditionHeroIds.add(id)); });
  const dungeonHeroIds = new Set(game?.dungeonRun?.heroIds ?? []);
  const availableHeroes = (game?.adventurers ?? []).filter(a => {
    if ((a.hp ?? a.maxHp ?? 40) <= 0) return false;
    if (a.mission) return false;
    if (a.tavernResting) return false;
    if (expeditionHeroIds.has(a.id)) return false;
    if (dungeonHeroIds.has(a.id)) return false;
    return true;
  });

  function toggleHero(id) {
    setSelectedHeroIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= PARTY_SIZE) return prev; // cap at 3
      return [...prev, id];
    });
  }

  const selectedParty = availableHeroes.filter(h => selectedHeroIds.includes(h.id));
  const canEnter = selectedParty.length > 0 && !hasPending;

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.15rem" }}>⚔️ Dungeon</h3>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          Real-time battle. Select a hero, tap to move, tap an enemy to attack. Use abilities and food to survive.
        </p>
      </div>

      {hasPending && (
        <div style={{
          marginBottom: "0.85rem", padding: "0.7rem 0.85rem", borderRadius: 10,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.35rem" }}>🎒 Unclaimed Dungeon Reward</div>
          {Object.entries(pendingReward.loot ?? {}).map(([k, v]) => (
            <div key={k} style={{ fontSize: "0.68rem", color: "var(--text)" }}>+{v} {k.replace(/_/g, " ")}</div>
          ))}
          {pendingReward.totalXp > 0 && (
            <div style={{ fontSize: "0.68rem", color: "#a78bfa" }}>✨ +{pendingReward.totalXp} XP shared</div>
          )}
          <button onClick={onClaim} style={{
            marginTop: "0.5rem", width: "100%", padding: "0.45rem", borderRadius: 8,
            fontWeight: 700, fontSize: "0.75rem",
            background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.45)",
            color: "#fbbf24", cursor: "pointer",
          }}>✅ Claim Reward</button>
        </div>
      )}

      {!hasPending && lastRun && (
        <div style={{
          marginBottom: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: 10,
          background: lastRun.victory ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.07)",
          border: `1px solid ${lastRun.victory ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.2)"}`,
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: lastRun.victory ? "#4ade80" : "#f87171", marginBottom: "0.15rem" }}>
            {lastRun.victory ? "✅ Last run: Victory" : `🏳️ Last run: ${lastRun.label ?? "Defeated"}`}
          </div>
          {Object.entries(lastRun.loot ?? {}).map(([k, v]) => (
            <div key={k} style={{ fontSize: "0.63rem", color: "var(--text)" }}>+{v} {k.replace(/_/g, " ")}</div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
          SELECT PARTY ({selectedParty.length}/{PARTY_SIZE}) — tap to add/remove
        </div>
        {availableHeroes.length === 0 ? (
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", padding: "0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            No idle heroes. Heroes must be free (not on missions, expeditions, or resting) to enter the dungeon.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableHeroes.map(adv => {
              const cls = (adv.heroClass && DUNGEON_CLASS[adv.heroClass]) ? DUNGEON_CLASS[adv.heroClass] : { emoji: "🧭", label: "Adventurer", color: "#94a3b8" };
              const beltItems = ARTISAN_FOOD_LIST.filter(id => (adv.foodBelt?.[id] ?? 0) > 0);
              const isSelected = selectedHeroIds.includes(adv.id);
              const isDisabled = !isSelected && selectedParty.length >= PARTY_SIZE;
              return (
                <div key={adv.id}
                  onClick={() => !isDisabled && toggleHero(adv.id)}
                  style={{
                    width: "calc(33% - 4px)", minWidth: 80, padding: "0.45rem 0.35rem", borderRadius: 9,
                    background: isSelected ? `${cls.color}22` : "rgba(255,255,255,0.05)",
                    border: `2px solid ${isSelected ? cls.color + "88" : "rgba(255,255,255,0.09)"}`,
                    textAlign: "center", cursor: isDisabled ? "default" : "pointer",
                    opacity: isDisabled ? 0.4 : 1, transition: "all 0.15s",
                    boxShadow: isSelected ? `0 0 8px ${cls.color}44` : "none",
                  }}>
                  <div style={{ fontSize: "1.1rem" }}>{cls.emoji}</div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: cls.color, marginTop: 2 }}>{cls.label}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>Lv{adv.level ?? 1}</div>
                  {beltItems.length > 0 && (
                    <div style={{ fontSize: "0.55rem", color: "#4ade80", marginTop: 2 }}>
                      {beltItems.map(id => `${adv.foodBelt[id]}×${ARTISAN_FOOD_HEAL?.[id]?.emoji ?? "🍞"}`).join(" ")}
                    </div>
                  )}
                  {isSelected && <div style={{ fontSize: "0.5rem", color: cls.color, marginTop: 2, fontWeight: 800 }}>✓ In Party</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Starting depth selector */}
      {maxDepthUnlocked > 1 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.35rem", fontWeight: 600 }}>
            START DEPTH (max unlocked: {maxDepthUnlocked})
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: maxDepthUnlocked }, (_, i) => i + 1).map(d => (
              <button key={d} onClick={() => setStartDepth(d)} style={{
                flex: 1, padding: "0.3rem", borderRadius: 7, fontSize: "0.7rem", fontWeight: 700,
                background: startDepth === d ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${startDepth === d ? "rgba(251,191,36,0.55)" : "rgba(255,255,255,0.08)"}`,
                color: startDepth === d ? "#fbbf24" : "var(--muted)", cursor: "pointer",
              }}>{d}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "0.85rem", padding: "0.55rem 0.7rem", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.35rem" }}>ABILITIES</div>
        {[DUNGEON_CLASS.fighter, DUNGEON_CLASS.mage, DUNGEON_CLASS.scavenger].map(cls => (
          <div key={cls.label} style={{ display: "flex", gap: 6, fontSize: "0.63rem", alignItems: "flex-start", marginBottom: 5 }}>
            <span style={{ fontSize: "0.9rem", minWidth: 20 }}>{cls.ability.emoji}</span>
            <div>
              <span style={{ color: cls.color, fontWeight: 700 }}>{cls.label} — {cls.ability.name}:</span>
              <span style={{ color: "var(--muted)", marginLeft: 4 }}>{cls.ability.desc}</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop: "0.35rem", fontSize: "0.6rem", color: "var(--muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.35rem" }}>
          🍞 Food heals over {HOT_DURATION}s in the dungeon. Select a hero to use their food belt.
        </div>
      </div>

      <button
        onClick={canEnter ? onStart : undefined}
        disabled={!canEnter}
        style={{
          width: "100%", padding: "0.75rem", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem",
          background: canEnter ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
          border: `2px solid ${canEnter ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.08)"}`,
          color: canEnter ? "#a5b4fc" : "var(--muted)",
          cursor: canEnter ? "pointer" : "default",
        }}>
        {hasPending ? "⏳ Claim reward before next run" : selectedParty.length === 0 ? "Select heroes to enter" : `⚔️ Enter Dungeon (${selectedParty.length} hero${selectedParty.length > 1 ? "s" : ""})`}
      </button>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDungeonPartyLocal(game) {
  const expeditionHeroIds = new Set();
  const exps = game?.expeditions ?? {};
  Object.values(exps).forEach(exp => {
    (exp.heroIds ?? []).forEach(id => expeditionHeroIds.add(id));
  });
  const dungeonHeroIds = new Set(game?.dungeonRun?.heroIds ?? []);
  return (game?.adventurers ?? []).filter(a => {
    if ((a.hp ?? a.maxHp ?? 40) <= 0) return false;
    if (a.mission) return false;
    if (a.tavernResting) return false;
    if (expeditionHeroIds.has(a.id)) return false;
    if (dungeonHeroIds.has(a.id)) return false;
    return true;
  }).slice(0, PARTY_SIZE);
}

// ─── MAIN — owns ALL combat state so tab-switching doesn't reset it ───────────

export default function DungeonZone({ game, onDungeonComplete, onClaimDungeon, onStartRun, onSaveRun }) {
  const savedRun = game?.dungeonRun?.active ? game.dungeonRun : null;

  // ── Explore/lobby state ──────────────────────────────────────────────────
  const [mode, setMode] = useState(savedRun?.mode ?? "lobby");
  const [cells, setCells] = useState(savedRun?.cells ?? []);
  const [pos, setPos] = useState(savedRun?.pos ?? { x: 3, y: 3 });
  const [depth, setDepth] = useState(savedRun?.depth ?? 1);
  const [selectedHeroIds, setSelectedHeroIds] = useState([]);
  const [startDepth, setStartDepth] = useState(1);
  const [combatPos, setCombatPos] = useState(null);
  const [lootTotal, setLootTotal] = useState(savedRun?.lootTotal ?? {});
  const [xpTotal, setXpTotal] = useState(savedRun?.xpTotal ?? {});
  const [foodUsedTotal, setFoodUsedTotal] = useState(savedRun?.foodUsedTotal ?? {});
  const [lastRun, setLastRun] = useState(null);
  const [party, setParty] = useState(() => {
    if (!savedRun?.heroIds?.length) return [];
    return (game?.adventurers ?? []).filter(a => savedRun.heroIds.includes(a.id));
  });

  // ── Combat state — lives here so tab-switching doesn't reset it ──────────
  const [combatHeroes, setCombatHeroes] = useState([]);
  const [combatEnemies, setCombatEnemies] = useState([]);
  const [combatSelected, setCombatSelected] = useState(null);
  const [combatFloats, setCombatFloats] = useState([]);
  const [combatLog, setCombatLog] = useState([]);
  const [combatPhase, setCombatPhase] = useState("initiative");
  const [combatInitResult, setCombatInitResult] = useState(null);
  const [combatCountdown, setCombatCountdown] = useState(5);
  const [combatResult, setCombatResult] = useState(null);

  // Refs for use inside the game loop interval (avoid stale closures)
  const heroesRef = useRef([]);
  const enemiesRef = useRef([]);
  const selectedRef = useRef(null);
  const phaseRef = useRef("initiative");
  const floatIdRef = useRef(0);

  useEffect(() => { heroesRef.current = combatHeroes; }, [combatHeroes]);
  useEffect(() => { enemiesRef.current = combatEnemies; }, [combatEnemies]);
  useEffect(() => { selectedRef.current = combatSelected; }, [combatSelected]);
  useEffect(() => { phaseRef.current = combatPhase; }, [combatPhase]);

  const pendingReward = game?.pendingDungeonReward ?? null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function saveRun(overrides = {}) {
    if (!onSaveRun) return;
    onSaveRun({
      mode: overrides.mode ?? mode,
      cells: overrides.cells ?? cells,
      pos: overrides.pos ?? pos,
      depth: overrides.depth ?? depth,
      lootTotal: overrides.lootTotal ?? lootTotal,
      xpTotal: overrides.xpTotal ?? xpTotal,
      foodUsedTotal: overrides.foodUsedTotal ?? foodUsedTotal,
    });
  }

  function addFloat(x, y, text, color) {
    const id = ++floatIdRef.current;
    setCombatFloats(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setCombatFloats(prev => prev.filter(f => f.id !== id)), 1000);
  }

  function addLog(text, color = "var(--muted)") {
    setCombatLog(prev => [...prev.slice(-12), { id: Date.now() + Math.random(), text, color }]);
  }

  // ── Initiative roll — runs once when combat is entered ────────────────────
  // Tracked with a ref so it doesn't re-fire on re-render
  const initiativeRolledRef = useRef(false);
  useEffect(() => {
    if (combatPhase !== "initiative" || initiativeRolledRef.current || combatHeroes.length === 0) return;
    initiativeRolledRef.current = true;
    const playerRoll = randInt(1, 20);
    const enemyRoll = randInt(1, 20);
    const playerWins = playerRoll >= enemyRoll;
    setCombatInitResult({ playerRoll, enemyRoll, playerWins });
    const t = setTimeout(() => {
      if (playerWins) {
        // Player goes first: enter placement phase so they can position heroes
        setCombatPhase("placement");
        phaseRef.current = "placement";
      } else {
        // Enemies go first: auto-place heroes (mage closest to enemies, scav middle, fighter furthest)
        setCombatHeroes(prev => {
          const sorted = [...prev].sort((a, b) => {
            const order = { mage: 0, scavenger: 1, fighter: 2 };
            return (order[a.heroClass] ?? 1) - (order[b.heroClass] ?? 1);
          });
          // mage=rightmost (closest to enemies), scav=mid, fighter=leftmost
          const xPositions = [BF_W / 2 - 60, BF_W / 2 - 115, BF_W / 2 - 170];
          const yPositions = [BF_H * 0.5, BF_H * 0.3, BF_H * 0.7];
          const next = prev.map(h => {
            const rank = sorted.findIndex(s => s.id === h.id);
            const px = xPositions[rank] ?? (60 + rank * 50);
            const py = yPositions[rank] ?? (BF_H / 2);
            return { ...h, x: px, y: py, targetX: px, targetY: py, placed: true };
          });
          heroesRef.current = next;
          return next;
        });
        setCombatPhase("enemy_advance");
        phaseRef.current = "enemy_advance";
        setCombatCountdown(3);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [combatPhase, combatHeroes.length]);

  // ── Countdown → fighting ──────────────────────────────────────────────────
  useEffect(() => {
    if (combatPhase !== "prep" && combatPhase !== "enemy_advance") return;
    if (combatCountdown <= 0) {
      setCombatPhase("fighting");
      phaseRef.current = "fighting";
      return;
    }
    const t = setTimeout(() => setCombatCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [combatPhase, combatCountdown]);

  // ── Main game loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "combat") return; // only run when in combat

    let last = performance.now();
    const loop = setInterval(() => {
      const currentPhase = phaseRef.current;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.15);
      last = now;

      if (currentPhase === "placement") {
        // No movement during placement — heroes are static until placed by player
        return;
      }

      if (currentPhase === "prep") {
        const hs = heroesRef.current.map(h => ({ ...h }));
        hs.forEach(hero => {
          if (hero.dead || !hero.placed) return;
          const np = moveToward({ x: hero.x, y: hero.y }, { x: hero.targetX, y: hero.targetY }, HERO_SPEED, dt);
          hero.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
          hero.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);
        });
        heroesRef.current = hs;
        setCombatHeroes([...hs]);
        return;
      }

      if (currentPhase === "enemy_advance") {
        const hs = heroesRef.current;
        const es = enemiesRef.current.map(e => ({ ...e }));
        const aliveHeroes = hs.filter(h => !h.dead);
        es.forEach(enemy => {
          if (enemy.dead) return;
          const tgt = aliveHeroes.length ? aliveHeroes.reduce((a, b) => dist(enemy, a) < dist(enemy, b) ? a : b) : null;
          if (!tgt) return;
          if (dist(enemy, tgt) > enemy.attackRange) {
            const np = moveToward({ x: enemy.x, y: enemy.y }, tgt, enemy.speed, dt);
            enemy.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
            enemy.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);
          }
        });
        enemiesRef.current = es;
        setCombatEnemies([...es]);
        return;
      }

      if (currentPhase !== "fighting") return;

      const hs = heroesRef.current.map(h => ({ ...h, ability: { ...h.ability } }));
      const es = enemiesRef.current.map(e => ({ ...e }));
      const aliveHeroes = hs.filter(h => !h.dead);
      const aliveEnemies = es.filter(e => !e.dead);

      if (aliveHeroes.length === 0) {
        const foodBeltDeltas = {};
        hs.forEach(h => { if (Object.keys(h.foodUsed ?? {}).length > 0) foodBeltDeltas[h.id] = h.foodUsed; });
        const heroHpSnapshot = {};
        hs.forEach(h => { heroHpSnapshot[h.id] = Math.floor(h.hp); });
        phaseRef.current = "defeat";
        setCombatPhase("defeat");
        setCombatResult({ victory: false, loot: {}, xpByHeroId: {}, foodBeltDeltas, heroHpSnapshot });
        return;
      }

      if (aliveEnemies.length === 0) {
        // Let any active HoT finish ticking before declaring victory
        const anyHot = aliveHeroes.some(h => (h.hotRemaining ?? 0) > 0);
        if (anyHot) {
          aliveHeroes.forEach(hero => {
            if ((hero.hotRemaining ?? 0) > 0 && (hero.hotDuration ?? 0) > 0) {
              const healThisTick = (hero.hotRemaining / hero.hotDuration) * dt;
              hero.hp = Math.min(hero.maxHp, hero.hp + healThisTick);
              hero.hotDuration = Math.max(0, hero.hotDuration - dt);
              hero.hotRemaining = hero.hotDuration <= 0 ? 0 : hero.hotRemaining - healThisTick;
            }
          });
          heroesRef.current = hs;
          setCombatHeroes([...hs]);
          return;
        }
        const loot = {};
        const totalXp = es.reduce((s, e) => s + (ENEMY_TYPES[e.typeId]?.xp ?? 0), 0);
        const xpEach = Math.floor(totalXp / Math.max(1, aliveHeroes.length));
        const xpByHeroId = {};
        aliveHeroes.forEach(h => { xpByHeroId[h.id] = xpEach; });
        const lootScale = 1 + (depth - 1) * 0.3; // +30% per depth level
        es.forEach(e => {
          const def = ENEMY_TYPES[e.typeId];
          if (!def?.loot) return;
          Object.entries(def.loot).forEach(([k, [mn, mx]]) => {
            const scaled = Math.round(randInt(mn, mx) * lootScale);
            loot[k] = (loot[k] ?? 0) + Math.max(mn, scaled);
          });
        });
        const foodBeltDeltas = {};
        hs.forEach(h => { if (Object.keys(h.foodUsed ?? {}).length > 0) foodBeltDeltas[h.id] = h.foodUsed; });
        const heroHpSnapshot = {};
        const heroMaxHpSnapshot = {};
        hs.forEach(h => { heroHpSnapshot[h.id] = Math.floor(h.hp); heroMaxHpSnapshot[h.id] = h.maxHp; });
        phaseRef.current = "victory";
        setCombatPhase("victory");
        setCombatResult({ victory: true, loot, xpByHeroId, foodBeltDeltas, totalXp, heroHpSnapshot, heroMaxHpSnapshot });
        return;
      }

      // ── Heroes tick ──────────────────────────────────────────────────────
      hs.forEach(hero => {
        if (hero.dead) return;

        if (hero.hotRemaining > 0 && hero.hotDuration > 0) {
          const healThisTick = (hero.hotRemaining / hero.hotDuration) * dt;
          hero.hp = Math.min(hero.maxHp, hero.hp + healThisTick);
          hero.hotDuration = Math.max(0, hero.hotDuration - dt);
          hero.hotRemaining = hero.hotDuration <= 0 ? 0 : hero.hotRemaining - healThisTick;
        }

        if (hero.bladeRushActive) {
          hero.bladeRushTimeLeft = Math.max(0, hero.bladeRushTimeLeft - dt);
          if (hero.bladeRushTimeLeft <= 0) {
            hero.bladeRushActive = false;
            if (hero.bladeRushAttacksLeft <= 0) hero.bladeRushAttacksLeft = BLADE_RUSH_ATTACK_COUNT;
          }
        }

        if (!hero.bladeRushActive && hero.bladeRushAttacksLeft > 0) {
          hero.bladeRushAttackTimer = Math.max(0, (hero.bladeRushAttackTimer ?? 0) - dt);
          if (hero.bladeRushAttackTimer <= 0) {
            const nearest = aliveEnemies.reduce((best, e) => (!best || dist(hero, e) < dist(hero, best)) ? e : best, null);
            if (nearest && dist(hero, nearest) <= hero.attackRange) {
              const dmg = Math.max(1, hero.atk - nearest.def + randInt(-2, 3));
              const ei = es.findIndex(e => e.id === nearest.id);
              if (ei >= 0 && !es[ei].dead) {
                if (es[ei].channeling) { es[ei].channeling = false; es[ei].channelTimer = 0; es[ei].interrupted = true; addLog(`⚡ ${hero.name} interrupts ${nearest.name}'s channel!`, "#fbbf24"); }
                if (es[ei].special === "armor_break" && !es[ei].defReduced && es[ei].hp / es[ei].maxHp < 0.5) { es[ei].def = Math.floor(es[ei].def / 2); es[ei].defReduced = true; addLog(`🪨 ${nearest.name}'s armor cracks!`, "#fbbf24"); }
                es[ei].hp = Math.max(0, es[ei].hp - dmg);
                if (es[ei].hp <= 0) {
                  es[ei].dead = true;
                  addLog(`${nearest.emoji} ${nearest.name} defeated!`, "#4ade80");
                  if (es[ei].special === "death_curse") {
                    aliveHeroes.forEach(h => { const curse = Math.floor(h.maxHp * 0.25); const hi2 = hs.findIndex(hh => hh.id === h.id); if (hi2 >= 0) { hs[hi2].hp = Math.max(0, hs[hi2].hp - curse); if (hs[hi2].hp <= 0) hs[hi2].dead = true; addFloat(h.x, h.y - 15, `-${curse}💀`, "#e879f9"); } });
                    addLog(`👻 ${nearest.name}'s death curse strikes all heroes!`, "#e879f9");
                  }
                }
                addFloat(nearest.x, nearest.y - 10, `-${dmg}⚡`, "#fbbf24");
              }
              hero.bladeRushAttacksLeft--;
              hero.bladeRushAttackTimer = BLADE_RUSH_ATTACK_GAP;
            } else {
              hero.bladeRushAttacksLeft = 0;
              addLog(`⚡ ${hero.name}'s rush fizzled`, "var(--muted)");
            }
          }
          return;
        }

        const speed = HERO_SPEED;
        const np = moveToward({ x: hero.x, y: hero.y }, { x: hero.targetX, y: hero.targetY }, speed, dt);
        hero.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
        hero.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);

        if (hero.attackTarget) {
          const tgt = aliveEnemies.find(e => e.id === hero.attackTarget);
          if (!tgt) { hero.attackTarget = null; }
          else if (dist(hero, tgt) > hero.attackRange) { hero.targetX = tgt.x; hero.targetY = tgt.y; }
        }

        if (hero.attackCooldown > 0) {
          hero.attackCooldown -= dt;
        } else {
          let atk = null;
          if (hero.attackTarget) { const t = aliveEnemies.find(e => e.id === hero.attackTarget); if (t && dist(hero, t) <= hero.attackRange) atk = t; }
          if (!atk) { const inRange = aliveEnemies.filter(e => dist(hero, e) <= hero.attackRange); if (inRange.length > 0) atk = inRange.reduce((a, b) => dist(hero, a) < dist(hero, b) ? a : b); }
          if (atk) {
            const baseDmg = Math.max(1, hero.atk - atk.def + randInt(-2, 3));
            const ei = es.findIndex(e => e.id === atk.id);
            if (ei >= 0 && !es[ei].dead) {
              if (es[ei].channeling) { es[ei].channeling = false; es[ei].channelTimer = 0; es[ei].interrupted = true; addLog(`${hero.emoji} ${hero.name} interrupts ${atk.name}'s channel!`, "#fbbf24"); }
              if (es[ei].special === "armor_break" && !es[ei].defReduced && es[ei].hp / es[ei].maxHp < 0.5) { es[ei].def = Math.floor(es[ei].def / 2); es[ei].defReduced = true; addLog(`🪨 ${atk.name}'s armor cracks! DEF halved.`, "#fbbf24"); }
              es[ei].hp = Math.max(0, es[ei].hp - baseDmg);
              if (es[ei].hp <= 0) {
                es[ei].dead = true;
                addLog(`${atk.emoji} ${atk.name} defeated!`, "#4ade80");
                if (es[ei].special === "death_curse") {
                  aliveHeroes.forEach(h => { const curse = Math.floor(h.maxHp * 0.25); const hi2 = hs.findIndex(hh => hh.id === h.id); if (hi2 >= 0) { hs[hi2].hp = Math.max(0, hs[hi2].hp - curse); if (hs[hi2].hp <= 0) hs[hi2].dead = true; addFloat(h.x, h.y - 15, `-${curse}💀`, "#e879f9"); } });
                  addLog(`👻 ${atk.name}'s death curse strikes all heroes!`, "#e879f9");
                }
              }
              addFloat(atk.x, atk.y - 10, `-${baseDmg}`, "#f87171");
            }
            hero.attackCooldown = 1 / hero.attackSpeed;
          }
        }

        if (hero.ability.cooldownLeft > 0) hero.ability.cooldownLeft = Math.max(0, hero.ability.cooldownLeft - dt);
        hero.flashHit = false;
      });

      // ── Enemies tick ────────────────────────────────────────────────────
      es.forEach(enemy => {
        if (enemy.dead) return;

        if (enemy.special === "teleport") {
          enemy.teleportTimer = (enemy.teleportTimer ?? 4) - dt;
          if (enemy.teleportTimer <= 0) {
            const targets = aliveHeroes.filter(h => !h.dead);
            if (targets.length > 0) {
              const tgt = targets[randInt(0, targets.length - 1)];
              enemy.x = clamp(tgt.x + randInt(-30, 30), UNIT_R, BF_W - UNIT_R);
              enemy.y = clamp(tgt.y + randInt(-30, 30), UNIT_R, BF_H - UNIT_R);
              addFloat(enemy.x, enemy.y - 15, "💨 Teleport!", "#6366f1");
            }
            enemy.teleportTimer = 4;
          }
        }

        if (enemy.special === "channel") {
          if (!enemy.channeling && enemy.attackCooldown <= 0) {
            enemy.channeling = true; enemy.channelTimer = 2; enemy.interrupted = false;
            addLog(`🔮 ${enemy.name} begins channeling!`, "#c084fc");
          }
          if (enemy.channeling) {
            enemy.channelTimer -= dt;
            if (enemy.channelTimer <= 0 && !enemy.interrupted) {
              const tgt = aliveHeroes.reduce((a, b) => dist(enemy, a) < dist(enemy, b) ? a : b, aliveHeroes[0]);
              if (tgt) {
                const hi = hs.findIndex(h => h.id === tgt.id);
                if (hi >= 0 && !hs[hi].dead) {
                  const bolt = Math.floor(enemy.atk * 2);
                  hs[hi].hp = Math.max(0, hs[hi].hp - bolt);
                  if (hs[hi].hp <= 0) { hs[hi].dead = true; addLog(`💀 ${hs[hi].name} fallen!`, "#ef4444"); }
                  addFloat(tgt.x, tgt.y - 10, `-${bolt}🔮`, "#c084fc");
                  addLog(`🔮 ${enemy.name} fires a bolt for ${bolt}!`, "#c084fc");
                }
              }
              enemy.attackCooldown = 1 / enemy.attackSpeed;
              enemy.channeling = false; enemy.channelTimer = 0;
            }
            enemy.flashHit = false;
            return;
          }
        }

        if (enemy.special === "revive" && !enemy.revived && enemy.hp / enemy.maxHp <= 0.5) {
          enemy.revived = true; enemy.dead = false; enemy.hp = Math.floor(enemy.maxHp * 0.4);
          addFloat(enemy.x, enemy.y - 15, "Revived!", "#9ca3af");
          addLog(`💀 ${enemy.name} rises again!`, "#9ca3af");
        }

        const tauntHero = hs.find(h => !h.dead && h.tauntActive);
        const tgt = tauntHero ?? (aliveHeroes.length ? aliveHeroes.reduce((a, b) => dist(enemy, a) < dist(enemy, b) ? a : b) : null);
        enemy.taunted = !!tauntHero;
        if (!tgt) return;

        const d = dist(enemy, tgt);
        if (d > enemy.attackRange) {
          const np = moveToward({ x: enemy.x, y: enemy.y }, tgt, enemy.speed, dt);
          enemy.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
          enemy.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);
        }
        if (enemy.attackCooldown > 0) {
          enemy.attackCooldown -= dt;
        } else if (d <= enemy.attackRange) {
          const hi = hs.findIndex(h => h.id === tgt.id);
          if (hi >= 0 && !hs[hi].dead) {
            const dmg = Math.max(1, enemy.atk - hs[hi].def + randInt(-1, 3));
            hs[hi].hp = Math.max(0, hs[hi].hp - dmg);
            if (hs[hi].hp <= 0) { hs[hi].dead = true; addLog(`💀 ${hs[hi].name} fallen!`, "#ef4444"); }
            addFloat(tgt.x, tgt.y - 10, `-${dmg}`, "#a78bfa");
            enemy.attackCooldown = 1 / enemy.attackSpeed;
          }
        }
        enemy.flashHit = false;
      });

      // Separation push
      const allUnits = [...hs.filter(h => !h.dead), ...es.filter(e => !e.dead)];
      const SEP = UNIT_R * 2 + 3;
      for (let i = 0; i < allUnits.length; i++) {
        for (let j = i + 1; j < allUnits.length; j++) {
          const a = allUnits[i], b = allUnits[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < SEP && d > 0.01) {
            const push = (SEP - d) / 2;
            const nx = dx / d, ny = dy / d;
            a.x = clamp(a.x - nx * push, UNIT_R, BF_W - UNIT_R);
            a.y = clamp(a.y - ny * push, UNIT_R, BF_H - UNIT_R);
            b.x = clamp(b.x + nx * push, UNIT_R, BF_W - UNIT_R);
            b.y = clamp(b.y + ny * push, UNIT_R, BF_H - UNIT_R);
          }
        }
      }

      heroesRef.current = hs;
      enemiesRef.current = es;
      setCombatHeroes([...hs]);
      setCombatEnemies([...es]);
    }, TICK_MS);

    return () => clearInterval(loop);
  }, [mode]); // only restarts when mode changes (combat ↔ explore)

  // ── Tap handler (passed to Battlefield) ──────────────────────────────────
  // Called by Battlefield when player taps "Ready" during placement
  const handlePlacementReady = useCallback(() => {
    // Place any still-unplaced heroes at default left-side positions
    setCombatHeroes(prev => {
      const next = prev.map((h, i) => {
        if (h.placed) return h;
        const dx = 40 + (i % 2) * 55;
        const dy = 70 + Math.floor(i / 2) * 100;
        return { ...h, x: dx, y: dy, targetX: dx, targetY: dy, placed: true };
      });
      heroesRef.current = next;
      return next;
    });
    // Initiative already rolled — go straight to prep (short countdown before fighting)
    setCombatPhase("prep");
    phaseRef.current = "prep";
    setCombatCountdown(2);
  }, []);

  const handleBattlefieldTap = useCallback((x, y, phase) => {
    const currentPhase = phaseRef.current;

    // ── Placement phase: tap left half to place selected hero ──────────────
    if (currentPhase === "placement") {
      const heroId = selectedRef.current;
      if (!heroId) return;
      // Restrict to left half only
      if (x > BF_W / 2 - UNIT_R) return;
      const clampedX = clamp(x, UNIT_R + 2, BF_W / 2 - UNIT_R - 4);
      const clampedY = clamp(y, UNIT_R + 2, BF_H - UNIT_R - 2);
      setCombatHeroes(prev => {
        const next = prev.map(h => h.id !== heroId ? h : {
          ...h, x: clampedX, y: clampedY, targetX: clampedX, targetY: clampedY, placed: true,
        });
        heroesRef.current = next;
        // Auto-select next unplaced hero
        const nextUnplaced = next.find(h => !h.placed && !h.dead);
        if (nextUnplaced) {
          setCombatSelected(nextUnplaced.id);
          selectedRef.current = nextUnplaced.id;
        } else {
          setCombatSelected(null);
          selectedRef.current = null;
        }
        return next;
      });
      return;
    }

    if (currentPhase !== "fighting" && currentPhase !== "prep") return;
    const HIT_R = UNIT_R * 1.8;

    const tappedEnemy = enemiesRef.current.find(en => !en.dead && dist({ x, y }, en) < HIT_R);
    if (tappedEnemy) {
      if (selectedRef.current && currentPhase === "fighting") {
        setCombatHeroes(prev => {
          const next = prev.map(h => h.id === selectedRef.current
            ? { ...h, attackTarget: tappedEnemy.id, targetX: tappedEnemy.x, targetY: tappedEnemy.y }
            : h);
          heroesRef.current = next;
          return next;
        });
      }
      return;
    }

    const tappedHero = heroesRef.current.find(h => !h.dead && dist({ x, y }, h) < HIT_R);
    if (tappedHero) {
      const newSel = tappedHero.id === selectedRef.current ? null : tappedHero.id;
      setCombatSelected(newSel);
      selectedRef.current = newSel;
      return;
    }

    if (selectedRef.current) {
      // If tapping near an enemy (slightly past attack range), auto-target instead of walk-through
      const nearbyEnemy = enemiesRef.current
        .filter(en => !en.dead)
        .find(en => dist({ x, y }, en) < ATTACK_RANGE * 2.5);
      if (nearbyEnemy) {
        // redirect to attack that enemy
        setCombatHeroes(prev => {
          const next = prev.map(h => h.id === selectedRef.current
            ? { ...h, attackTarget: nearbyEnemy.id, targetX: nearbyEnemy.x, targetY: nearbyEnemy.y }
            : h);
          heroesRef.current = next;
          return next;
        });
      } else {
        setCombatHeroes(prev => {
          const next = prev.map(h => h.id === selectedRef.current
            ? { ...h, targetX: x, targetY: y, attackTarget: null }
            : h);
          heroesRef.current = next;
          return next;
        });
      }
    }
  }, []);

  const handleSelectHero = useCallback((heroId) => {
    const newSel = heroId === selectedRef.current ? null : heroId;
    setCombatSelected(newSel);
    selectedRef.current = newSel;
  }, []);

  // ── Ability use ───────────────────────────────────────────────────────────
  const handleUseAbility = useCallback((heroId) => {
    const hero = heroesRef.current.find(h => h.id === heroId);
    if (!hero || hero.ability.cooldownLeft > 0 || hero.dead || hero.bladeRushActive) return;

    if (hero.heroClass === "fighter") {
      addLog(`📢 ${hero.name} taunts! Enemies focus Fighter!`, "#f87171");
      setCombatHeroes(prev => {
        const next = prev.map(h => h.id !== heroId ? h : { ...h, tauntActive: true, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } });
        heroesRef.current = next;
        return next;
      });
      setTimeout(() => {
        setCombatHeroes(prev => { const next = prev.map(h => h.id === heroId ? { ...h, tauntActive: false } : h); heroesRef.current = next; return next; });
      }, 4000);
    } else if (hero.heroClass === "mage") {
      setCombatHeroes(prev => {
        const alive = prev.filter(h => !h.dead);
        if (!alive.length) return prev;
        const lowest = alive.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
        const healAmt = Math.floor(lowest.maxHp * 0.35);
        addLog(`💚 ${hero.name} heals ${lowest.name} for ${healAmt}!`, "#4ade80");
        addFloat(lowest.x, lowest.y - 15, `+${healAmt}`, "#4ade80");
        const next = prev.map(h => {
          if (h.id === heroId) return { ...h, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } };
          if (h.id === lowest.id) return { ...h, hp: Math.min(h.maxHp, h.hp + healAmt) };
          return h;
        });
        heroesRef.current = next;
        return next;
      });
    } else if (hero.heroClass === "scavenger") {
      addLog(`⚡ ${hero.name} launches Blade Rush!`, "#34d399");
      setCombatHeroes(prev => {
        const next = prev.map(h => h.id !== heroId ? h : { ...h, bladeRushActive: true, bladeRushTimeLeft: BLADE_RUSH_DURATION, bladeRushAttacksLeft: 0, bladeRushAttackTimer: 0, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } });
        heroesRef.current = next;
        return next;
      });
    }
    // No-op for classless Adventurer (no ability defined)
  }, []);

  // ── Food use ──────────────────────────────────────────────────────────────
  const handleUseFood = useCallback((heroId, itemId) => {
    const foodEntry = ARTISAN_FOOD_HEAL?.[itemId];
    if (!foodEntry) return;
    setCombatHeroes(prev => {
      const next = prev.map(h => {
        if (h.id !== heroId) return h;
        const belt = { ...(h.foodBelt ?? {}) };
        if ((belt[itemId] ?? 0) <= 0) return h;
        belt[itemId] = belt[itemId] - 1;
        if (belt[itemId] === 0) delete belt[itemId];
        const foodUsed = { ...(h.foodUsed ?? {}) };
        foodUsed[itemId] = (foodUsed[itemId] ?? 0) + 1;
        addLog(`${foodEntry.emoji ?? "🍞"} ${h.name} eats ${foodEntry.name}!`, "#4ade80");
        addFloat(h.x, h.y - 20, `+${foodEntry.healAmount}🌿`, "#4ade80");
        return { ...h, foodBelt: belt, foodUsed, hotRemaining: (h.hotRemaining ?? 0) + foodEntry.healAmount, hotDuration: HOT_DURATION };
      });
      heroesRef.current = next;
      return next;
    });
  }, []);

  // ── Run management ────────────────────────────────────────────────────────

  function startRun() {
    if (pendingReward) return;
    // Use manually selected heroes; fall back to auto-pick if none selected
    const allAvailable = getDungeonPartyLocal(game);
    const manualParty = selectedHeroIds.length > 0
      ? allAvailable.filter(a => selectedHeroIds.includes(a.id))
      : [];
    const currentParty = manualParty.length > 0 ? manualParty : allAvailable;
    if (!currentParty.length) return;
    const heroIds = currentParty.map(a => a.id);
    const chosenDepth = Math.max(1, Math.min(startDepth, game?.maxDungeonDepth ?? 1));
    const newCells = generateMap();
    const startPos = { x: 3, y: 3 };
    // Pre-seed dungeonMaxHp so explore screen shows correct HP bar from the start
    const seededParty = currentParty.map((adv, i) => {
      const tmpHero = makeHero(adv, i);
      return { ...adv, dungeonMaxHp: tmpHero.maxHp, currentDungeonHp: adv.currentDungeonHp ?? tmpHero.maxHp };
    });
    setParty(seededParty);
    setCells(newCells);
    setPos(startPos);
    setLootTotal({});
    setXpTotal({});
    setFoodUsedTotal({});
    setDepth(chosenDepth);
    setSelectedHeroIds([]);
    setMode("explore");
    if (onStartRun) onStartRun(heroIds);
    if (onSaveRun) onSaveRun({ mode: "explore", cells: newCells, pos: startPos, depth: chosenDepth, lootTotal: {}, xpTotal: {}, foodUsedTotal: {} });
  }

  function enterCombat(x, y) {
    const poolIndex = Math.min(depth - 1, ENEMY_POOL.length - 1);
    const pool = ENEMY_POOL[poolIndex];
    const count = clamp(1 + Math.floor(depth * 0.6), 1, 4);
    const newEnemies = Array.from({ length: count }, (_, i) => makeEnemy(pool[Math.floor(Math.random() * pool.length)], i, depth));
    const newHeroes = party.slice(0, PARTY_SIZE).map((adv, i) => makeHero(adv, i));
    // Seed dungeonMaxHp on party so explore mode shows correct HP scale from first combat
    setParty(prev => prev.map(h => {
      const combatHero = newHeroes.find(ch => ch.id === h.id);
      return combatHero ? { ...h, dungeonMaxHp: combatHero.maxHp } : h;
    }));

    // Reset all combat state fresh
    setCombatPos({ x, y });
    setCombatHeroes(newHeroes);
    setCombatEnemies(newEnemies);
    setCombatSelected(newHeroes[0]?.id ?? null); // auto-select first hero for placement
    setCombatFloats([]);
    setCombatLog([]);
    setCombatPhase("initiative");
    setCombatInitResult(null);
    setCombatCountdown(5);
    setCombatResult(null);
    heroesRef.current = newHeroes;
    enemiesRef.current = newEnemies;
    selectedRef.current = newHeroes[0]?.id ?? null;
    phaseRef.current = "initiative";
    initiativeRolledRef.current = false; // allow initiative to re-roll

    setMode("combat");
    saveRun({ mode: "combat" });
  }

  function onCombatEnd(result) {
    if (result.foodBeltDeltas) {
      setFoodUsedTotal(prev => {
        const next = { ...prev };
        Object.entries(result.foodBeltDeltas).forEach(([heroId, deltas]) => {
          next[heroId] = next[heroId] ? { ...next[heroId] } : {};
          Object.entries(deltas).forEach(([itemId, used]) => { next[heroId][itemId] = (next[heroId][itemId] ?? 0) + used; });
        });
        return next;
      });
    }

    if (result.victory) {
      const newLoot = { ...lootTotal };
      Object.entries(result.loot ?? {}).forEach(([k, v]) => { newLoot[k] = (newLoot[k] ?? 0) + v; });
      const newXp = { ...xpTotal };
      Object.entries(result.xpByHeroId ?? {}).forEach(([heroId, xp]) => { newXp[heroId] = (newXp[heroId] ?? 0) + xp; });

      if (result.heroHpSnapshot) {
        setParty(prev => prev
          .map(h => {
            const snap = result.heroHpSnapshot[h.id];
            const maxSnap = result.heroMaxHpSnapshot?.[h.id];
            const updates = snap != null ? { currentDungeonHp: snap } : {};
            if (maxSnap != null) updates.dungeonMaxHp = maxSnap;
            return { ...h, ...updates };
          })
          .filter(h => (h.currentDungeonHp ?? h.maxHp ?? 40) > 0) // dead heroes leave party
        );
      }

      setLootTotal(newLoot);
      setXpTotal(newXp);
      if (combatPos) setCells(prev => prev.map(c => c.x === combatPos.x && c.y === combatPos.y ? { ...c, cleared: true } : c));
      setCombatPos(null);
      setMode("explore");
      saveRun({ mode: "explore", lootTotal: newLoot, xpTotal: newXp });
    } else {
      endRun(false, result.heroHpSnapshot ?? {});
    }
  }

  function collectTreasure(x, y) {
    const amt = randInt(3, 8) + depth * 2;
    const newLoot = { ...lootTotal, iron_ore: (lootTotal.iron_ore ?? 0) + amt };
    setLootTotal(newLoot);
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, cleared: true } : c));
    saveRun({ lootTotal: newLoot });
  }

  function doRest(x, y) {
    setParty(prev => prev.map(h => ({
      ...h,
      currentDungeonHp: Math.min(h.dungeonMaxHp ?? h.maxHp ?? 40, Math.floor((h.currentDungeonHp ?? h.dungeonMaxHp ?? h.maxHp ?? 40) + (h.dungeonMaxHp ?? h.maxHp ?? 40) * 0.3)),
    })));
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, cleared: true } : c));
  }

  function doTrap(x, y) {
    setParty(prev => prev.map(h => {
      const maxHp = h.dungeonMaxHp ?? h.maxHp ?? 40;
      const dmg = Math.max(1, Math.floor(maxHp * 0.10));
      const currentHp = h.currentDungeonHp ?? maxHp;
      return { ...h, currentDungeonHp: Math.max(0, currentHp - dmg) };
    }));
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, cleared: true } : c));
  }

  function endRun(victory, hpSnapshot = {}) {
    const totalXp = Object.values(xpTotal).reduce((s, v) => s + v, 0);
    // Build hpSnapshot from current party state so post-dungeon HP persists on adventurers
    const partyHpSnapshot = {};
    party.forEach(h => { partyHpSnapshot[h.id] = h.currentDungeonHp ?? h.maxHp ?? 40; });
    const mergedHpSnapshot = { ...partyHpSnapshot, ...hpSnapshot }; // explicit overrides win
    const runResult = { victory, loot: lootTotal, xpByHeroId: xpTotal, foodBeltDeltas: foodUsedTotal, totalXp, hpSnapshot: mergedHpSnapshot, depth };
    const label = victory ? "Victory" : `Retreated at depth ${depth}`;
    setLastRun({ victory, label, loot: lootTotal, depth });
    onDungeonComplete(runResult);
    setMode("lobby");
    setCells([]);
    setPos({ x: 3, y: 3 });
    setDepth(1);
    setLootTotal({});
    setXpTotal({});
    setFoodUsedTotal({});
    setParty([]);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (mode === "lobby") return (
    <Lobby game={game} lastRun={lastRun} pendingReward={pendingReward} onStart={startRun} onClaim={onClaimDungeon}
      selectedHeroIds={selectedHeroIds} setSelectedHeroIds={setSelectedHeroIds}
      startDepth={startDepth} setStartDepth={setStartDepth} />
  );

  // Between-battle food healing (applied directly to party HP)
  function handleExploreFoodUse(heroId, itemId) {
    const foodEntry = ARTISAN_FOOD_HEAL?.[itemId];
    if (!foodEntry) return;
    setParty(prev => prev.map(h => {
      if (h.id !== heroId) return h;
      const belt = { ...(h.foodBelt ?? {}) };
      if ((belt[itemId] ?? 0) <= 0) return h;
      belt[itemId] = belt[itemId] - 1;
      if (belt[itemId] === 0) delete belt[itemId];
      const foodUsedDelta = { [itemId]: 1 };
      setFoodUsedTotal(prev2 => {
        const next = { ...prev2 };
        next[heroId] = { ...(next[heroId] ?? {}), [itemId]: (next[heroId]?.[itemId] ?? 0) + 1 };
        return next;
      });
      const currentHp = h.currentDungeonHp ?? h.maxHp ?? 40;
      const newHp = Math.min(h.dungeonMaxHp ?? h.maxHp ?? 40, currentHp + foodEntry.healAmount);
      return { ...h, foodBelt: belt, currentDungeonHp: newHp };
    }));
  }

  if (mode === "explore") return (
    <ExploreMode
      party={party}
      cells={cells} setCells={(newCells) => { setCells(newCells); saveRun({ cells: newCells }); }}
      pos={pos} setPos={(newPos) => { setPos(newPos); saveRun({ pos: newPos }); }}
      depth={depth}
      onEnterCombat={enterCombat}
      onCollectTreasure={collectTreasure}
      onRest={doRest}
      onTrap={doTrap}
      onFinishRun={() => endRun(true)}
      onRetreat={() => endRun(false)}
      onExit={() => {
        const newDepth = depth + 1;
        const maxSeen = game?.maxDungeonDepth ?? 1;
        if (newDepth > maxSeen && onSaveRun) {
          // notify parent to persist new max depth via the run save (engine picks it up)
        }
        const newCells = generateMap();
        const startPos = { x: 3, y: 3 };
        setDepth(newDepth);
        setCells(newCells);
        setPos(startPos);
        saveRun({ mode: "explore", depth: newDepth, cells: newCells, pos: startPos });
      }}
      lootTotal={lootTotal}
      onUseFood={handleExploreFoodUse}
    />
  );

  if (mode === "combat") return (
    <Battlefield
      heroes={combatHeroes}
      enemies={combatEnemies}
      selected={combatSelected}
      floats={combatFloats}
      log={combatLog}
      phase={combatPhase}
      initResult={combatInitResult}
      countdown={combatCountdown}
      result={combatResult}
      depth={depth}
      onTap={handleBattlefieldTap}
      onSelectHero={handleSelectHero}
      onUseAbility={handleUseAbility}
      onUseFood={handleUseFood}
      onCombatEnd={onCombatEnd}
      onPlacementReady={handlePlacementReady}
    />
  );

  return null;
}