// src/Pages/rootwork/components/DungeonZone.jsx
// Battleheart-style dungeon — real-time, tap to move/attack, 3-hero party

import { useState, useEffect, useRef } from "react";
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
const BLADE_RUSH_DURATION = 2;      // seconds of speed boost
const BLADE_RUSH_ATTACK_COUNT = 3;  // rapid attacks after dash
const BLADE_RUSH_ATTACK_GAP = 0.12; // seconds between rapid attacks
const HOT_DURATION = 5;             // seconds for food HoT

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
    special: "revive", // rises once at 50% HP
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
    special: "teleport", // teleports to random hero every 4s
  },
  cultist: {
    name: "Cultist", emoji: "🔮", color: "#c084fc", bg: "#3b0764",
    hp: 50, atk: 18, def: 1, speed: ENEMY_SPEED * 0.8, attackSpeed: 0.3,
    attackRange: ENEMY_ATTACK_RANGE * 2.2, xp: 20,
    loot: { lumber: [1, 3] },
    special: "channel", // 2s channel before high-damage bolt, interruptable
  },
  stone_golem: {
    name: "Stone Golem", emoji: "🪨", color: "#78716c", bg: "#1c1917",
    hp: 120, atk: 16, def: 10, speed: ENEMY_SPEED * 0.4, attackSpeed: 0.35,
    attackRange: ENEMY_ATTACK_RANGE * 1.1, xp: 35,
    loot: { iron_ore: [3, 6], iron_fitting: [1, 2] },
    special: "armor_break", // DEF halved below 50% HP
  },
  banshee: {
    name: "Banshee", emoji: "👻", color: "#e879f9", bg: "#4a044e",
    hp: 65, atk: 13, def: 0, speed: ENEMY_SPEED * 1.1, attackSpeed: 0.8,
    attackRange: ENEMY_ATTACK_RANGE, xp: 28,
    loot: { lumber: [2, 4] },
    special: "death_curse", // on death: all living heroes take 25% maxHp damage
  },
};

// Enemy pool by depth — deeper = harder mix
const ENEMY_POOL = [
  ["goblin"],                          // depth 1
  ["goblin", "shadow"],                // depth 2
  ["skeleton", "cultist"],             // depth 3
  ["orc", "stone_golem"],             // depth 4
  ["troll", "banshee"],               // depth 5
  ["orc", "troll", "shadow", "banshee", "stone_golem", "cultist"], // depth 6+
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

// Get the next food item in a hero's belt (smallest healAmount first, matching engine order)
function getNextBeltItem(foodBelt) {
  const items = ARTISAN_FOOD_LIST
    .filter(id => (foodBelt?.[id] ?? 0) > 0)
    .map(id => ({ id, heal: ARTISAN_FOOD_HEAL?.[id]?.healAmount ?? 0 }))
    .sort((a, b) => a.heal - b.heal);
  return items[0] ?? null;
}

// ─── Unit factories ───────────────────────────────────────────────────────────

function makeHero(adv, index) {
  // No fallback to "fighter" -- classless heroes exist
  const resolvedClass = adv.heroClass ?? adv.class ?? null;
  const cls = (resolvedClass && DUNGEON_CLASS[resolvedClass]) ? DUNGEON_CLASS[resolvedClass] : {
    label: "Adventurer", emoji: "\U0001f9ed", color: "#94a3b8", bg: "#1e293b",
    hpMult: 1.0, atkMult: 1.0, defBonus: 0,
    attackSpeed: 1.0, attackRange: ATTACK_RANGE,
    ability: { name: "Focus", emoji: "\U0001f3af", cooldown: 12, desc: "Concentrate, dealing 1.5x damage on next attack" },
  };
  const baseHp = adv.maxHp ?? 40;
  const baseAtk = 5 + (adv.level ?? 1) * 1.5 + (adv.gear ?? 0) * 4;
  const startX = 45 + (index % 2) * 60;
  const startY = 80 + Math.floor(index / 2) * 110;
  // Preserve HP from previous combat this run (currentDungeonHp set by onCombatEnd)
  const maxHpVal = Math.floor(baseHp * cls.hpMult);
  const currentHp = adv.currentDungeonHp != null ? Math.min(adv.currentDungeonHp, maxHpVal) : maxHpVal;
  return {
    id: adv.id, kind: "hero", name: adv.name,
    heroClass: resolvedClass,
    emoji: cls.emoji, color: cls.color, bg: cls.bg, label: cls.label,
    x: startX, y: startY, targetX: startX, targetY: startY,
    attackTarget: null,
    hp: currentHp, maxHp: maxHpVal,
    atk: Math.floor(baseAtk * cls.atkMult), def: cls.defBonus + Math.floor((adv.gear ?? 0) * 0.5),
    attackSpeed: cls.attackSpeed, attackRange: cls.attackRange,
    attackCooldown: 0,
    ability: { ...cls.ability, cooldownLeft: 0 },
    tauntActive: false, dead: false, flashHit: false,
    // Blade Rush state
    bladeRushActive: false, bladeRushTimeLeft: 0,
    bladeRushAttacksLeft: 0, bladeRushAttackTimer: 0,
    // HoT state
    hotRemaining: 0, hotDuration: 0,
    // Food belt (local copy — deductions tracked separately)
    foodBelt: { ...(adv.foodBelt ?? {}) },
    foodUsed: {}, // tracks deductions for result payload
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
    // Special state
    revived: false,               // skeleton: has it already revived?
    teleportTimer: randInt(2, 4), // shadow: time until next teleport
    channelTimer: 0,              // cultist: channel progress
    channeling: false,            // cultist: currently channeling?
    interrupted: false,           // cultist: was channel interrupted?
    defReduced: false,            // stone_golem: DEF already halved?
  };
}

// ─── Map generation ───────────────────────────────────────────────────────────

function generateMap() {
  const cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2);
  const cells = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let type = "empty";
      if (x === cx && y === cy) type = "start";
      else if (x === cx && y === 0) type = "exit";
      else {
        const d = Math.abs(x - cx) + Math.abs(y - cy), r = Math.random();
        if (d === 1)     type = r < 0.3  ? "enemy" : "empty";
        else if (d <= 3) type = r < 0.5  ? "enemy" : r < 0.65 ? "treasure" : "empty";
        else             type = r < 0.55 ? "enemy" : r < 0.7  ? "treasure" : r < 0.8 ? "rest" : "empty";
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

// ─── UnitCircle ───────────────────────────────────────────────────────────────

function UnitCircle({ unit, selected }) {
  const pct = clamp(unit.hp / unit.maxHp, 0, 1);
  const barCol = pct > 0.55 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
  const size = UNIT_R * 2;
  const hasHot = unit.kind === "hero" && (unit.hotRemaining ?? 0) > 0;
  const isBladeRush = unit.kind === "hero" && unit.bladeRushActive;
  return (
    <div
      style={{
        position: "absolute", left: unit.x - UNIT_R, top: unit.y - UNIT_R,
        width: size, height: size, borderRadius: "50%",
        background: unit.bg,
        border: `2px solid ${selected ? "#fff" : unit.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: "1rem", userSelect: "none",
        transition: "left 0.08s linear, top 0.08s linear",
        boxShadow: selected
          ? `0 0 0 3px ${unit.color}, 0 0 14px ${unit.color}88`
          : unit.flashHit ? "0 0 12px #ef444488"
          : "0 2px 8px rgba(0,0,0,0.6)",
        opacity: unit.dead ? 0 : 1,
        zIndex: selected ? 10 : unit.kind === "hero" ? 5 : 4,
      }}>
      {unit.emoji}
      {/* HP bar */}
      <div style={{
        position: "absolute", bottom: -6, left: -2, right: -2, height: 3,
        background: "rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: barCol, transition: "width 0.2s" }} />
      </div>
      {/* Selected ring */}
      {selected && (
        <div style={{
          position: "absolute", inset: -5, borderRadius: "50%",
          border: `2px solid ${unit.color}`,
          animation: "ringPulse 1s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      {/* HoT glow */}
      {hasHot && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: "2px solid #4ade80",
          animation: "ringPulse 0.7s ease-in-out infinite",
          pointerEvents: "none", opacity: 0.8,
        }} />
      )}
      {/* Blade rush speed trail */}
      {isBladeRush && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: "50%",
          border: "2px solid #fbbf24",
          animation: "ringPulse 0.4s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      {/* Taunt indicator */}
      {unit.taunted && <div style={{ position: "absolute", top: -10, fontSize: "0.6rem" }}>📢</div>}
      {/* Cultist channel indicator */}
      {unit.channeling && <div style={{ position: "absolute", top: -12, fontSize: "0.65rem", animation: "ringPulse 0.5s infinite" }}>🔮</div>}
    </div>
  );
}

// ─── AbilityBar — shown only when a hero is selected ─────────────────────────

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
      {/* Class ability */}
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

      {/* Food belt */}
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
              +{foodDef?.healAmount ?? "?"} HP {foodDef?.healAmount ? "· HoT" : ""}
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

// ─── BATTLEFIELD ──────────────────────────────────────────────────────────────

function Battlefield({ party, enemies: initEnemies, onCombatEnd, depth }) {
  const initHeroes = party.slice(0, PARTY_SIZE).map((adv, i) => makeHero(adv, i));

  const [heroes, setHeroes] = useState(initHeroes);
  const [enemies, setEnemies] = useState(initEnemies);
  const [selected, setSelected] = useState(null);
  const [floats, setFloats] = useState([]);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState("initiative"); // initiative → prep/enemy_advance → fighting → victory/defeat
  const [initResult, setInitResult] = useState(null); // { playerRoll, enemyRoll, playerWins }
  const [countdown, setCountdown] = useState(5);
  const [result, setResult] = useState(null);

  const heroesRef = useRef(initHeroes);
  const enemiesRef = useRef(initEnemies);
  const selectedRef = useRef(null);
  const phaseRef = useRef("initiative");
  const floatIdRef = useRef(0);

  useEffect(() => { heroesRef.current = heroes; }, [heroes]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Initiative roll on mount ──────────────────────────────────────────────
  useEffect(() => {
    const playerRoll = randInt(1, 20);
    const enemyRoll = randInt(1, 20);
    const playerWins = playerRoll >= enemyRoll;
    setInitResult({ playerRoll, enemyRoll, playerWins });
    // Show result for 2.5s then enter appropriate phase
    const t = setTimeout(() => {
      const nextPhase = playerWins ? "prep" : "enemy_advance";
      setPhase(nextPhase);
      phaseRef.current = nextPhase;
      setCountdown(5);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  // ── Countdown (prep or enemy_advance) → fighting ──────────────────────────
  useEffect(() => {
    if (phase !== "prep" && phase !== "enemy_advance") return;
    if (countdown <= 0) {
      setPhase("fighting");
      phaseRef.current = "fighting";
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  function addFloat(x, y, text, color) {
    const id = ++floatIdRef.current;
    setFloats(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1000);
  }

  function addLog(text, color = "var(--muted)") {
    setLog(prev => [...prev.slice(-12), { id: Date.now() + Math.random(), text, color }]);
  }

  // ── Main game loop ────────────────────────────────────────────────────────
  useEffect(() => {
    let last = performance.now();

    const loop = setInterval(() => {
      const currentPhase = phaseRef.current;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.15);
      last = now;

      // Prep phase: heroes can position, enemies frozen
      if (currentPhase === "prep") {
        const hs = heroesRef.current.map(h => ({ ...h }));
        hs.forEach(hero => {
          if (hero.dead) return;
          const np = moveToward({ x: hero.x, y: hero.y }, { x: hero.targetX, y: hero.targetY }, HERO_SPEED, dt);
          hero.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
          hero.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);
        });
        heroesRef.current = hs;
        setHeroes([...hs]);
        return;
      }

      // Enemy advance: enemies move toward heroes, heroes frozen, enemies cannot attack
      if (currentPhase === "enemy_advance") {
        const hs = heroesRef.current;
        const es = enemiesRef.current.map(e => ({ ...e }));
        const aliveHeroes = hs.filter(h => !h.dead);
        es.forEach(enemy => {
          if (enemy.dead) return;
          const tgt = aliveHeroes.length
            ? aliveHeroes.reduce((a, b) => dist(enemy, a) < dist(enemy, b) ? a : b)
            : null;
          if (!tgt) return;
          if (dist(enemy, tgt) > enemy.attackRange) {
            const np = moveToward({ x: enemy.x, y: enemy.y }, tgt, enemy.speed, dt);
            enemy.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
            enemy.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);
          }
          // No attacking during enemy advance
        });
        enemiesRef.current = es;
        setEnemies([...es]);
        return;
      }

      if (currentPhase !== "fighting") return;

      const hs = heroesRef.current.map(h => ({ ...h, ability: { ...h.ability } }));
      const es = enemiesRef.current.map(e => ({ ...e }));
      const aliveHeroes = hs.filter(h => !h.dead);
      const aliveEnemies = es.filter(e => !e.dead);

      // Check win/loss
      if (aliveHeroes.length === 0) {
        // Build result from what was earned so far
        const foodBeltDeltas = {};
        hs.forEach(h => { if (Object.keys(h.foodUsed ?? {}).length > 0) foodBeltDeltas[h.id] = h.foodUsed; });
        const heroHpSnapshotDefeat = {};
        hs.forEach(h => { heroHpSnapshotDefeat[h.id] = Math.floor(h.hp); });
        setPhase("defeat");
        setResult({ victory: false, loot: {}, xpByHeroId: {}, foodBeltDeltas, heroHpSnapshot: heroHpSnapshotDefeat });
        return;
      }
      if (aliveEnemies.length === 0) {
        const loot = {};
        const totalXp = es.reduce((s, e) => s + (ENEMY_TYPES[e.typeId]?.xp ?? 0), 0);
        const xpEach = Math.floor(totalXp / Math.max(1, aliveHeroes.length));
        const xpByHeroId = {};
        aliveHeroes.forEach(h => { xpByHeroId[h.id] = xpEach; });
        es.forEach(e => {
          const def = ENEMY_TYPES[e.typeId];
          if (!def?.loot) return;
          Object.entries(def.loot).forEach(([k, [mn, mx]]) => { loot[k] = (loot[k] ?? 0) + randInt(mn, mx); });
        });
        const foodBeltDeltas = {};
        hs.forEach(h => { if (Object.keys(h.foodUsed ?? {}).length > 0) foodBeltDeltas[h.id] = h.foodUsed; });
        const heroHpSnapshot = {};
        hs.forEach(h => { heroHpSnapshot[h.id] = Math.floor(h.hp); });
        setPhase("victory");
        setResult({ victory: true, loot, xpByHeroId, foodBeltDeltas, totalXp, heroHpSnapshot });
        return;
      }

      // ── Heroes tick ────────────────────────────────────────────────────────
      hs.forEach(hero => {
        if (hero.dead) return;

        // HoT tick
        if (hero.hotRemaining > 0 && hero.hotDuration > 0) {
          const healThisTick = (hero.hotRemaining / hero.hotDuration) * dt;
          hero.hp = Math.min(hero.maxHp, hero.hp + healThisTick);
          hero.hotDuration = Math.max(0, hero.hotDuration - dt);
          hero.hotRemaining = hero.hotDuration <= 0 ? 0 : hero.hotRemaining - healThisTick;
        }

        // Blade Rush — speed boost phase
        if (hero.bladeRushActive) {
          hero.bladeRushTimeLeft = Math.max(0, hero.bladeRushTimeLeft - dt);
          if (hero.bladeRushTimeLeft <= 0) {
            hero.bladeRushActive = false;
            // Transition to rapid attack phase
            if (hero.bladeRushAttacksLeft <= 0) hero.bladeRushAttacksLeft = BLADE_RUSH_ATTACK_COUNT;
          }
        }

        // Blade Rush rapid attacks
        if (!hero.bladeRushActive && hero.bladeRushAttacksLeft > 0) {
          hero.bladeRushAttackTimer = Math.max(0, (hero.bladeRushAttackTimer ?? 0) - dt);
          if (hero.bladeRushAttackTimer <= 0) {
            // Find nearest enemy
            const nearest = aliveEnemies.reduce((best, e) => {
              const d = dist(hero, e);
              return (!best || d < dist(hero, best)) ? e : best;
            }, null);
            if (nearest && dist(hero, nearest) <= hero.attackRange) {
              const dmg = Math.max(1, hero.atk - nearest.def + randInt(-2, 3));
              const ei = es.findIndex(e => e.id === nearest.id);
              if (ei >= 0 && !es[ei].dead) {
                // Interrupt cultist channel
                if (es[ei].channeling) {
                  es[ei].channeling = false;
                  es[ei].channelTimer = 0;
                  es[ei].interrupted = true;
                  addLog(`⚡ ${hero.name} interrupts ${nearest.name}'s channel!`, "#fbbf24");
                }
                // Stone golem armor break
                if (es[ei].special === "armor_break" && !es[ei].defReduced && es[ei].hp / es[ei].maxHp < 0.5) {
                  es[ei].def = Math.floor(es[ei].def / 2);
                  es[ei].defReduced = true;
                  addLog(`🪨 ${nearest.name}'s armor cracks!`, "#fbbf24");
                }
                es[ei].hp = Math.max(0, es[ei].hp - dmg);
                if (es[ei].hp <= 0) {
                  es[ei].dead = true;
                  addLog(`${nearest.emoji} ${nearest.name} defeated!`, "#4ade80");
                  // Banshee death curse
                  if (es[ei].special === "death_curse") {
                    aliveHeroes.forEach(h => {
                      const curse = Math.floor(h.maxHp * 0.25);
                      const hi2 = hs.findIndex(hh => hh.id === h.id);
                      if (hi2 >= 0) {
                        hs[hi2].hp = Math.max(0, hs[hi2].hp - curse);
                        if (hs[hi2].hp <= 0) hs[hi2].dead = true;
                        addFloat(h.x, h.y - 15, `-${curse}💀`, "#e879f9");
                      }
                    });
                    addLog(`👻 ${nearest.name}'s death curse strikes all heroes!`, "#e879f9");
                  }
                }
                addFloat(nearest.x, nearest.y - 10, `-${dmg}⚡`, "#fbbf24");
              }
              hero.bladeRushAttacksLeft--;
              hero.bladeRushAttackTimer = BLADE_RUSH_ATTACK_GAP;
            } else {
              // Out of range — fizzle remaining attacks
              hero.bladeRushAttacksLeft = 0;
              addLog(`⚡ ${hero.name}'s rush fizzled — no target in range`, "var(--muted)");
            }
          }
          return; // Don't do normal attack during rapid attack sequence
        }

        // Normal movement
        const speed = hero.bladeRushActive ? HERO_SPEED * 1.5 : HERO_SPEED;
        const np = moveToward({ x: hero.x, y: hero.y }, { x: hero.targetX, y: hero.targetY }, speed, dt);
        hero.x = clamp(np.x, UNIT_R, BF_W - UNIT_R);
        hero.y = clamp(np.y, UNIT_R, BF_H - UNIT_R);

        // Chase attack target
        if (hero.attackTarget) {
          const tgt = aliveEnemies.find(e => e.id === hero.attackTarget);
          if (!tgt) { hero.attackTarget = null; }
          else if (dist(hero, tgt) > hero.attackRange) {
            hero.targetX = tgt.x; hero.targetY = tgt.y;
          }
        }

        // Normal auto-attack
        if (hero.attackCooldown > 0) {
          hero.attackCooldown -= dt;
        } else {
          let atk = null;
          if (hero.attackTarget) {
            const t = aliveEnemies.find(e => e.id === hero.attackTarget);
            if (t && dist(hero, t) <= hero.attackRange) atk = t;
          }
          if (!atk) {
            const inRange = aliveEnemies.filter(e => dist(hero, e) <= hero.attackRange);
            if (inRange.length > 0) atk = inRange.reduce((a, b) => dist(hero, a) < dist(hero, b) ? a : b);
          }
          if (atk) {
            const baseDmg = Math.max(1, hero.atk - atk.def + randInt(-2, 3));
            const ei = es.findIndex(e => e.id === atk.id);
            if (ei >= 0 && !es[ei].dead) {
              // Interrupt cultist channel on any hit
              if (es[ei].channeling) {
                es[ei].channeling = false;
                es[ei].channelTimer = 0;
                es[ei].interrupted = true;
                addLog(`${hero.emoji} ${hero.name} interrupts ${atk.name}'s channel!`, "#fbbf24");
              }
              // Stone golem armor break
              if (es[ei].special === "armor_break" && !es[ei].defReduced && es[ei].hp / es[ei].maxHp < 0.5) {
                es[ei].def = Math.floor(es[ei].def / 2);
                es[ei].defReduced = true;
                addLog(`🪨 ${atk.name}'s armor cracks! DEF halved.`, "#fbbf24");
              }
              es[ei].hp = Math.max(0, es[ei].hp - baseDmg);
              if (es[ei].hp <= 0) {
                es[ei].dead = true;
                addLog(`${atk.emoji} ${atk.name} defeated!`, "#4ade80");
                // Banshee death curse
                if (es[ei].special === "death_curse") {
                  aliveHeroes.forEach(h => {
                    const curse = Math.floor(h.maxHp * 0.25);
                    const hi2 = hs.findIndex(hh => hh.id === h.id);
                    if (hi2 >= 0) {
                      hs[hi2].hp = Math.max(0, hs[hi2].hp - curse);
                      if (hs[hi2].hp <= 0) hs[hi2].dead = true;
                      addFloat(h.x, h.y - 15, `-${curse}💀`, "#e879f9");
                    }
                  });
                  addLog(`👻 ${atk.name}'s death curse strikes all heroes!`, "#e879f9");
                }
              }
              addFloat(atk.x, atk.y - 10, `-${baseDmg}`, "#f87171");
            }
            hero.attackCooldown = 1 / hero.attackSpeed;
          }
        }

        // Ability cooldown tick
        if (hero.ability.cooldownLeft > 0) hero.ability.cooldownLeft = Math.max(0, hero.ability.cooldownLeft - dt);
        hero.flashHit = false;
      });

      // ── Enemies tick ──────────────────────────────────────────────────────
      es.forEach(enemy => {
        if (enemy.dead) return;

        // Special: Shadow teleport
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

        // Special: Cultist channel
        if (enemy.special === "channel") {
          if (!enemy.channeling && enemy.attackCooldown <= 0) {
            enemy.channeling = true;
            enemy.channelTimer = 2;
            enemy.interrupted = false;
            addLog(`🔮 ${enemy.name} begins channeling!`, "#c084fc");
          }
          if (enemy.channeling) {
            enemy.channelTimer -= dt;
            if (enemy.channelTimer <= 0 && !enemy.interrupted) {
              // Fire bolt at nearest hero
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
              enemy.channeling = false;
              enemy.channelTimer = 0;
            }
            // Don't move while channeling
            enemy.flashHit = false;
            return;
          }
        }

        // Skeleton revive
        if (enemy.special === "revive" && !enemy.revived && enemy.hp / enemy.maxHp <= 0.5) {
          enemy.revived = true;
          enemy.dead = false;
          enemy.hp = Math.floor(enemy.maxHp * 0.4);
          addFloat(enemy.x, enemy.y - 15, "Revived!", "#9ca3af");
          addLog(`💀 ${enemy.name} rises again!`, "#9ca3af");
        }

        const tauntHero = hs.find(h => !h.dead && h.tauntActive);
        const tgt = tauntHero ?? (aliveHeroes.length
          ? aliveHeroes.reduce((a, b) => dist(enemy, a) < dist(enemy, b) ? a : b)
          : null);
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

      // Separation push: prevent circles from overlapping
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

      setHeroes([...hs]);
      setEnemies([...es]);
    }, TICK_MS);

    return () => clearInterval(loop);
  }, []);

  // ── Tap handler ────────────────────────────────────────────────────────────────────────────────────
  // Single onPointerDown on the battlefield div handles ALL input.
  // Using phaseRef (not `phase`) avoids stale closure bugs.
  // No onClick on child circles -- that caused double-fire deselection on mobile.
  function handleTap(e) {
    e.preventDefault(); // prevent ghost clicks / scroll on mobile
    const currentPhase = phaseRef.current;
    if (currentPhase !== "fighting" && currentPhase !== "prep") return;

    const rect = e.currentTarget.getBoundingClientRect();
    // pointerdown always has .clientX/.clientY (mouse, touch, stylus)
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (clientX == null || clientY == null) return;

    const scaleX = BF_W / rect.width;
    const scaleY = BF_H / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Generous hit radius for mobile (finger-sized ~48px)
    const HIT_R = UNIT_R * 1.8;

    // 1. Enemy hit? Order selected hero to attack.
    const tappedEnemy = enemiesRef.current.find(en => !en.dead && dist({ x, y }, en) < HIT_R);
    if (tappedEnemy) {
      if (selectedRef.current && currentPhase === "fighting") {
        setHeroes(prev => {
          const next = prev.map(h => h.id === selectedRef.current
            ? { ...h, attackTarget: tappedEnemy.id, targetX: tappedEnemy.x, targetY: tappedEnemy.y }
            : h);
          heroesRef.current = next;
          return next;
        });
      }
      return;
    }

    // 2. Hero hit? Toggle selection.
    const tappedHero = heroesRef.current.find(h => !h.dead && dist({ x, y }, h) < HIT_R);
    if (tappedHero) {
      const newSel = tappedHero.id === selectedRef.current ? null : tappedHero.id;
      setSelected(newSel);
      selectedRef.current = newSel;
      return;
    }

    // 3. Empty ground? Move selected hero there.
    if (selectedRef.current) {
      setHeroes(prev => {
        const next = prev.map(h => h.id === selectedRef.current
          ? { ...h, targetX: x, targetY: y, attackTarget: null }
          : h);
        heroesRef.current = next;
        return next;
      });
    }
  }

  // ── Ability use ───────────────────────────────────────────────────────────
  function useAbility(heroId) {
    const hero = heroesRef.current.find(h => h.id === heroId);
    if (!hero || hero.ability.cooldownLeft > 0 || hero.dead || hero.bladeRushActive) return;

    if (hero.heroClass === "fighter") {
      addLog(`📢 ${hero.name} taunts! Enemies focus Fighter!`, "#f87171");
      setHeroes(prev => prev.map(h => {
        if (h.id !== heroId) return h;
        return { ...h, tauntActive: true, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } };
      }));
      heroesRef.current = heroesRef.current.map(h =>
        h.id !== heroId ? h : { ...h, tauntActive: true, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } }
      );
      setTimeout(() => {
        setHeroes(prev => prev.map(h => h.id === heroId ? { ...h, tauntActive: false } : h));
        heroesRef.current = heroesRef.current.map(h => h.id === heroId ? { ...h, tauntActive: false } : h);
      }, 4000);

    } else if (hero.heroClass === "mage") {
      setHeroes(prev => {
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

    } else {
      // Scavenger / Ranger — Blade Rush
      addLog(`⚡ ${hero.name} launches Blade Rush!`, "#34d399");
      setHeroes(prev => {
        const next = prev.map(h => h.id !== heroId ? h : {
          ...h,
          bladeRushActive: true,
          bladeRushTimeLeft: BLADE_RUSH_DURATION,
          bladeRushAttacksLeft: 0,
          bladeRushAttackTimer: 0,
          ability: { ...h.ability, cooldownLeft: h.ability.cooldown },
        });
        heroesRef.current = next;
        return next;
      });
    }
  }

  // ── Food belt use ─────────────────────────────────────────────────────────
  function useFood(heroId, itemId) {
    const foodEntry = ARTISAN_FOOD_HEAL?.[itemId];
    if (!foodEntry) return;

    setHeroes(prev => {
      const next = prev.map(h => {
        if (h.id !== heroId) return h;
        const belt = { ...(h.foodBelt ?? {}) };
        if ((belt[itemId] ?? 0) <= 0) return h;
        belt[itemId] = belt[itemId] - 1;
        if (belt[itemId] === 0) delete belt[itemId];

        const foodUsed = { ...(h.foodUsed ?? {}) };
        foodUsed[itemId] = (foodUsed[itemId] ?? 0) + 1;

        addLog(`${foodEntry.emoji ?? "🍞"} ${h.name} eats ${foodEntry.name} — healing over time!`, "#4ade80");
        addFloat(h.x, h.y - 20, `+${foodEntry.healAmount}🌿`, "#4ade80");

        return {
          ...h,
          foodBelt: belt,
          foodUsed,
          hotRemaining: (h.hotRemaining ?? 0) + foodEntry.healAmount,
          hotDuration: HOT_DURATION,
        };
      });
      heroesRef.current = next;
      return next;
    });
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
          background: phase === "prep" ? "rgba(74,222,128,0.12)" : phase === "enemy_advance" ? "rgba(239,68,68,0.12)" : phase === "fighting" ? "rgba(74,222,128,0.12)" : phase === "victory" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${phase === "prep" ? "rgba(74,222,128,0.35)" : phase === "enemy_advance" ? "rgba(239,68,68,0.35)" : phase === "fighting" ? "rgba(74,222,128,0.35)" : phase === "victory" ? "rgba(251,191,36,0.4)" : "rgba(239,68,68,0.35)"}`,
          color: phase === "prep" ? "#4ade80" : phase === "enemy_advance" ? "#f87171" : phase === "fighting" ? "#4ade80" : phase === "victory" ? "#fbbf24" : "#f87171",
        }}>
          {phase === "initiative" ? "⚄ INITIATIVE" : phase === "prep" ? `⏳ ${countdown}s` : phase === "enemy_advance" ? `⚠️ ${countdown}s` : phase === "fighting" ? "LIVE" : phase === "victory" ? "VICTORY" : "DEFEAT"}
        </div>
      </div>

      {/* Hint */}
      <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
        {phase === "prep"
          ? (selHero ? `${selHero.emoji} ${selHero.name} · tap to position` : "You go first — position your heroes")
          : phase === "enemy_advance"
          ? "⚠️ Enemies are advancing — brace yourself!"
          : selHero
          ? `${selHero.emoji} ${selHero.name} · tap to move · tap enemy to attack`
          : "Tap a hero to select"}
      </div>

      {/* Battlefield */}
      <div
        onPointerDown={handleTap}
        style={{
          position: "relative", width: "100%", maxWidth: BF_W, height: BF_H,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden", cursor: "crosshair", marginBottom: "0.55rem",
          boxShadow: "inset 0 2px 20px rgba(0,0,0,0.5)",
          userSelect: "none", touchAction: "none",
        }}>
        {/* Grid texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.018) 39px,rgba(255,255,255,0.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.018) 39px,rgba(255,255,255,0.018) 40px)",
        }} />
        <div style={{
          position: "absolute", left: BF_W / 2 - 1, top: "8%", bottom: "8%", width: 1,
          pointerEvents: "none",
          background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.07),transparent)",
        }} />

        <FloatingText items={floats} />
        {enemies.map(e => <UnitCircle key={e.id} unit={e} selected={false} />)}
        {heroes.map(h => <UnitCircle key={h.id} unit={h} selected={selected === h.id} />)}

        {/* Initiative overlay */}
        {phase === "initiative" && initResult && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.7)",
            flexDirection: "column", gap: "0.4rem",
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Initiative Roll
            </div>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: initResult.playerWins ? "#4ade80" : "#f87171" }}>
                  {initResult.playerRoll}
                </div>
                <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>Your Party</div>
              </div>
              <div style={{ fontSize: "1rem", color: "var(--muted)" }}>vs</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: initResult.playerWins ? "#f87171" : "#4ade80" }}>
                  {initResult.enemyRoll}
                </div>
                <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>Enemies</div>
              </div>
            </div>
            <div style={{
              fontSize: "0.75rem", fontWeight: 800,
              color: initResult.playerWins ? "#4ade80" : "#f87171",
              marginTop: "0.2rem",
            }}>
              {initResult.playerWins ? "⚡ You go first!" : "💀 Enemies advance!"}
            </div>
          </div>
        )}

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
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)" }}>
              Brace for impact
            </div>
          </div>
        )}

        {/* Victory/Defeat overlay */}
        {(phase === "victory" || phase === "defeat") && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(0,0,0,0.6)",
            flexDirection: "column", gap: "0.5rem",
          }}>
            <div style={{ fontSize: "2.5rem" }}>{phase === "victory" ? "🏆" : "💀"}</div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: phase === "victory" ? "#fbbf24" : "#ef4444" }}>
              {phase === "victory" ? "Victory!" : "Defeated"}
            </div>
          </div>
        )}
      </div>

      {/* Mini hero bars — always visible */}
      <div style={{ display: "flex", gap: 4, marginBottom: "0.4rem" }}>
        {heroes.map(h => (
          <div
            key={h.id}
            onClick={() => {
              if (h.dead) return;
              const newSel = h.id === selected ? null : h.id;
              setSelected(newSel);
              selectedRef.current = newSel;
            }}
            style={{
              flex: 1, padding: "0.3rem 0.35rem", borderRadius: 7, cursor: h.dead ? "default" : "pointer",
              background: selected === h.id ? `${h.color}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected === h.id ? h.color + "55" : "rgba(255,255,255,0.07)"}`,
              opacity: h.dead ? 0.35 : 1, transition: "all 0.15s",
            }}>
            <div style={{ fontSize: "0.75rem", textAlign: "center" }}>{h.emoji}</div>
            <HpBar hp={h.hp} maxHp={h.maxHp} height={3} />
            <div style={{ fontSize: "0.5rem", color: "var(--muted)", textAlign: "center", marginTop: 2 }}>
              {Math.floor(h.hp)}/{h.maxHp}
              {h.hotRemaining > 0 ? " 🌿" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Ability bar — only when hero selected */}
      <AbilityBar hero={selHero} onUseAbility={useAbility} onUseFood={useFood} />

      {/* Combat log */}
      <div style={{
        height: 52, overflowY: "auto", background: "rgba(0,0,0,0.25)", borderRadius: 8,
        padding: "0.28rem 0.5rem", fontSize: "0.62rem", color: "var(--muted)",
        fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        {log.map(e => <div key={e.id} style={{
          color: e.color === "#4ade80" ? "#b8f0cb" : e.color === "var(--muted)" ? "#9eb4cc" : e.color,
          textShadow: "0 1px 3px rgba(0,0,0,0.95)",
        }}>{e.text}</div>)}
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
            <div style={{ fontSize: "0.7rem", color: "#a78bfa", marginTop: "0.2rem" }}>
              ✨ +{result.totalXp} XP shared across party
            </div>
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

function ExploreMode({ party, cells, setCells, pos, setPos, depth, onEnterCombat, onCollectTreasure, onRest, onRetreat, onExit, onFinishRun, lootTotal }) {
  const CELL = 40;
  function getCell(x, y) { return cells.find(c => c.x === x && c.y === y) ?? null; }
  function adj() {
    return [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => getCell(pos.x + dx, pos.y + dy)).filter(Boolean);
  }
  function moveToCell(x, y) {
    const target = getCell(x, y); if (!target) return;
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, visited: true } : c));
    setPos({ x, y });
    if (!target.cleared) {
      if (target.type === "enemy")    onEnterCombat(x, y);
      if (target.type === "treasure") onCollectTreasure(x, y);
      if (target.type === "rest")     onRest(x, y);
      if (target.type === "exit")     onExit();
    }
  }
  const adjacent = adj();
  const roomColor = { start: "#4ade8025", empty: "#ffffff08", enemy: "#ef444445", treasure: "#fbbf2445", rest: "#4ade8035", exit: "#a78bfa50" };
  const roomEmoji = { start: "🏠", empty: "", enemy: "👹", treasure: "💰", rest: "🏕️", exit: "🚪" };

  return (
    <div style={{ padding: "0.65rem" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: "0.6rem" }}>
        {[
          { label: "Explored", value: `${cells.filter(c => c.visited).length}/${cells.length}`, color: "#a78bfa" },
          { label: "Enemies",  value: cells.filter(c => c.type === "enemy" && !c.cleared).length, color: "#f87171" },
          { label: "Depth",    value: depth, color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.3rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
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
              border: isParty ? "2px solid rgba(99,102,241,0.75)" : canMove ? `2px solid ${ cell.type === "enemy" ? "rgba(239,68,68,0.75)" : cell.type === "treasure" ? "rgba(251,191,36,0.75)" : cell.type === "exit" ? "rgba(167,139,250,0.75)" : "rgba(255,255,255,0.4)"}` : cell.visited ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.03)",
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

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.62rem", color: "#a78bfa", marginBottom: "0.25rem" }}>
        Depth {depth} — reach 🚪 Exit to go deeper · ✅ Finish Run to collect loot
      </div>
      {[["🧭", "Party"], ["👹", "Enemy"], ["💰", "Treasure"], ["🏕️", "Rest"], ["🚪", "Exit"]].map(([e, l]) => (
          <span key={l} style={{ fontSize: "0.6rem", color: "var(--muted)", display: "flex", gap: 3, alignItems: "center" }}>
            <span>{e}</span>{l}
          </span>
        ))}
      </div>

      {/* Party HP */}
      <div style={{ display: "flex", gap: 4, marginBottom: "0.5rem" }}>
        {party.map(h => {
          const cls = DUNGEON_CLASS[h.heroClass ?? h.class ?? "fighter"] ?? DUNGEON_CLASS.fighter;
          return (
            <div key={h.id} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "0.3rem 0.35rem", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: "0.8rem", textAlign: "center" }}>{cls.emoji}</div>
              <HpBar hp={h.hp ?? h.maxHp} maxHp={h.maxHp} />
              <div style={{ fontSize: "0.52rem", color: "var(--muted)", textAlign: "center", marginTop: 2 }}>
                {Math.floor(h.hp ?? h.maxHp)}/{h.maxHp}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loot so far */}
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
        }}>
          🏳️ Retreat
        </button>
        <button onClick={onFinishRun} style={{
          flex: 1, padding: "0.45rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700,
          background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)",
          color: "#4ade80", cursor: "pointer",
        }}>
          ✅ Finish Run
        </button>
      </div>
    </div>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function Lobby({ game, lastRun, pendingReward, onStart, onClaim }) {
  // When an active run exists, show those heroes; otherwise show available heroes
  const activeHeroIds = game?.dungeonRun?.heroIds ?? [];
  const party = activeHeroIds.length > 0
    ? (game?.adventurers ?? []).filter(a => activeHeroIds.includes(a.id))
    : getDungeonPartyLocal(game);
  const hasPending = !!pendingReward;

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.15rem" }}>⚔️ Dungeon</h3>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          Real-time battle. Select a hero, tap to move, tap an enemy to attack. Use abilities and food to survive.
        </p>
      </div>

      {/* Pending reward claim */}
      {hasPending && (
        <div style={{
          marginBottom: "0.85rem", padding: "0.7rem 0.85rem", borderRadius: 10,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.35rem" }}>
            🎒 Unclaimed Dungeon Reward
          </div>
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
          }}>
            ✅ Claim Reward
          </button>
        </div>
      )}

      {/* Last run summary (when no pending) */}
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

      {/* Party */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
          YOUR PARTY ({party.length}/{PARTY_SIZE})
        </div>
        {party.length === 0 ? (
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", padding: "0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            No idle heroes. Heroes must be free (not on missions, expeditions, or resting) to enter the dungeon.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            {party.map(adv => {
              const cls = DUNGEON_CLASS[adv.heroClass ?? adv.class ?? "fighter"] ?? DUNGEON_CLASS.fighter;
              const beltItems = ARTISAN_FOOD_LIST.filter(id => (adv.foodBelt?.[id] ?? 0) > 0);
              return (
                <div key={adv.id} style={{
                  flex: 1, padding: "0.45rem 0.35rem", borderRadius: 9,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "1.1rem" }}>{cls.emoji}</div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: cls.color, marginTop: 2 }}>{cls.label}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>Lv{adv.level ?? 1}</div>
                  {beltItems.length > 0 && (
                    <div style={{ fontSize: "0.55rem", color: "#4ade80", marginTop: 2 }}>
                      {beltItems.map(id => `${adv.foodBelt[id]}×${ARTISAN_FOOD_HEAL?.[id]?.emoji ?? "🍞"}`).join(" ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ability reference */}
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
        onClick={onStart}
        disabled={!party.length || hasPending}
        style={{
          width: "100%", padding: "0.75rem", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem",
          background: (party.length && !hasPending) ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
          border: `2px solid ${(party.length && !hasPending) ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.08)"}`,
          color: (party.length && !hasPending) ? "#a5b4fc" : "var(--muted)",
          cursor: (party.length && !hasPending) ? "pointer" : "default",
        }}>
        {hasPending ? "⏳ Claim reward before next run" : "⚔️ Enter Dungeon"}
      </button>
    </div>
  );
}

// Local helper mirrors engine getDungeonParty without importing (avoids circular dep)
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function DungeonZone({ game, onDungeonComplete, onClaimDungeon, onStartRun, onSaveRun }) {
  // Restore from game.dungeonRun if an active run exists
  const savedRun = game?.dungeonRun?.active ? game.dungeonRun : null;

  const [mode, setMode] = useState(savedRun?.mode ?? "lobby");
  const [cells, setCells] = useState(savedRun?.cells ?? []);
  const [pos, setPos] = useState(savedRun?.pos ?? { x: 3, y: 3 });
  const [depth, setDepth] = useState(savedRun?.depth ?? 1);
  const [combatEnemies, setCombatEnemies] = useState([]);
  const [combatPos, setCombatPos] = useState(null);
  const [lootTotal, setLootTotal] = useState(savedRun?.lootTotal ?? {});
  const [xpTotal, setXpTotal] = useState(savedRun?.xpTotal ?? {});
  const [foodUsedTotal, setFoodUsedTotal] = useState(savedRun?.foodUsedTotal ?? {});
  const [lastRun, setLastRun] = useState(null);
  const [party, setParty] = useState(() => {
    // Restore party from saved heroIds
    if (!savedRun?.heroIds?.length) return [];
    return (game?.adventurers ?? []).filter(a => savedRun.heroIds.includes(a.id));
  });

  const pendingReward = game?.pendingDungeonReward ?? null;

  // Persist run state to game whenever key state changes
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

  function startRun() {
    if (pendingReward) return;
    const currentParty = getDungeonPartyLocal(game);
    if (!currentParty.length) return;
    const heroIds = currentParty.map(a => a.id);
    const newCells = generateMap();
    const startPos = { x: 3, y: 3 };
    setParty(currentParty);
    setCells(newCells);
    setPos(startPos);
    setLootTotal({});
    setXpTotal({});
    setFoodUsedTotal({});
    setDepth(1);
    setMode("explore");
    // Lock heroes and persist initial run state
    if (onStartRun) onStartRun(heroIds);
    if (onSaveRun) onSaveRun({ mode: "explore", cells: newCells, pos: startPos, depth: 1, lootTotal: {}, xpTotal: {}, foodUsedTotal: {} });
  }

  function enterCombat(x, y) {
    setCombatPos({ x, y });
    const poolIndex = Math.min(depth - 1, ENEMY_POOL.length - 1);
    const pool = ENEMY_POOL[poolIndex];
    const count = clamp(1 + Math.floor(depth * 0.9), 1, 5);
    setCombatEnemies(Array.from({ length: count }, (_, i) =>
      makeEnemy(pool[Math.floor(Math.random() * pool.length)], i, depth)
    ));
    const newMode = "combat";
    setMode(newMode);
    saveRun({ mode: newMode });
  }

  function onCombatEnd(result) {
    if (result.foodBeltDeltas) {
      setFoodUsedTotal(prev => {
        const next = { ...prev };
        Object.entries(result.foodBeltDeltas).forEach(([heroId, deltas]) => {
          next[heroId] = next[heroId] ? { ...next[heroId] } : {};
          Object.entries(deltas).forEach(([itemId, used]) => {
            next[heroId][itemId] = (next[heroId][itemId] ?? 0) + used;
          });
        });
        return next;
      });
    }

    if (result.victory) {
      const newLoot = { ...lootTotal };
      Object.entries(result.loot ?? {}).forEach(([k, v]) => { newLoot[k] = (newLoot[k] ?? 0) + v; });
      const newXp = { ...xpTotal };
      Object.entries(result.xpByHeroId ?? {}).forEach(([heroId, xp]) => { newXp[heroId] = (newXp[heroId] ?? 0) + xp; });

      // Persist hero HP from this combat back into party for next room
      if (result.heroHpSnapshot) {
        setParty(prev => prev.map(h => {
          const snap = result.heroHpSnapshot[h.id];
          return snap != null ? { ...h, currentDungeonHp: snap } : h;
        }));
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
      hp: Math.min(h.maxHp ?? 40, Math.floor((h.hp ?? h.maxHp ?? 40) + (h.maxHp ?? 40) * 0.3)),
    })));
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, cleared: true } : c));
  }

  function endRun(victory, hpSnapshot = {}) {
    const totalXp = Object.values(xpTotal).reduce((s, v) => s + v, 0);
    const runResult = {
      victory,
      loot: lootTotal,
      xpByHeroId: xpTotal,
      foodBeltDeltas: foodUsedTotal,
      totalXp,
      hpSnapshot,
    };
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

  if (mode === "lobby") return (
    <Lobby
      game={game}
      lastRun={lastRun}
      pendingReward={pendingReward}
      onStart={startRun}
      onClaim={onClaimDungeon}
    />
  );

  if (mode === "explore") return (
    <ExploreMode
      party={party}
      cells={cells} setCells={(newCells) => { setCells(newCells); saveRun({ cells: newCells }); }}
      pos={pos} setPos={(newPos) => { setPos(newPos); saveRun({ pos: newPos }); }}
      depth={depth}
      onEnterCombat={enterCombat}
      onCollectTreasure={collectTreasure}
      onRest={doRest}
      onFinishRun={() => endRun(true)}
      onRetreat={() => endRun(false)}
      onExit={() => {
        // Advance to next depth: new map, keep loot/party
        const newDepth = depth + 1;
        const newCells = generateMap();
        const startPos = { x: 3, y: 3 };
        setDepth(newDepth);
        setCells(newCells);
        setPos(startPos);
        saveRun({ mode: "explore", depth: newDepth, cells: newCells, pos: startPos });
      }}
      lootTotal={lootTotal}
    />
  );

  if (mode === "combat") return (
    <Battlefield
      party={party}
      enemies={combatEnemies}
      onCombatEnd={onCombatEnd}
      depth={depth}
    />
  );

  return null;
}