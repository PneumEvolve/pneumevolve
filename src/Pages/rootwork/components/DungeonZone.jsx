// src/Pages/rootwork/components/DungeonZone.jsx
// Dungeon minigame — explore mode + telegraphed ATB combat
// Prototype: heroes/loot not yet wired to game state

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Dungeon Map Constants ────────────────────────────────────────────────────

const MAP_W = 7;
const MAP_H = 7;

// ─── Combat Constants ─────────────────────────────────────────────────────────

const COMBAT_W = 8;
const COMBAT_H = 6;
const MAX_STEPS = 2;

// ─── Class definitions for dungeon combat ─────────────────────────────────────
// These are separate from the world mission system — dungeon-specific stats

const DUNGEON_CLASS = {
  fighter: {
    label: "Fighter", emoji: "⚔️", color: "#f87171",
    hpMult: 1.4, atkMult: 0.85, defBonus: 4,
    attackShape: "cross_1",   // adjacent 4 cells
    specialShape: "cross_2",  // wider cross
    specialName: "Shield Bash", specialDesc: "Hits all adjacent cells",
    healMult: 1.0,
  },
  mage: {
    label: "Mage", emoji: "🧙", color: "#a78bfa",
    hpMult: 0.75, atkMult: 1.3, defBonus: 0,
    attackShape: "line_4",    // straight line up to 4 cells
    specialShape: "aoe_3",    // 3x3 centered on self
    specialName: "Arcane Burst", specialDesc: "Blasts all enemies in 3×3 area",
    healMult: 1.5,            // mage heals more from food (arcane alchemy)
  },
  scavenger: {
    label: "Scavenger", emoji: "🌿", color: "#4ade80",
    hpMult: 0.9, atkMult: 1.5, defBonus: 1,
    attackShape: "adjacent_1", // single adjacent cell, high dmg
    specialShape: "dash_attack", // move + hit
    specialName: "Backstab", specialDesc: "Teleport adjacent to any enemy and deal double damage",
    healMult: 1.0,
  },
  // Default for heroes with no heroClass yet
  ranger: {
    label: "Ranger", emoji: "🏹", color: "#fbbf24",
    hpMult: 0.9, atkMult: 1.1, defBonus: 1,
    attackShape: "line_4",
    specialShape: "cross_2",
    specialName: "Volley", specialDesc: "Arrow hits in a wide cross",
    healMult: 1.0,
  },
};

// ─── Enemy Types ──────────────────────────────────────────────────────────────

const ENEMY_TYPES = {
  goblin: {
    id: "goblin", name: "Goblin", emoji: "👺",
    hp: 28, atk: 6, def: 1, steps: 2,
    xp: 8, loot: { iron_ore: [2, 5] },
    attacks: [
      { id: "lunge",  name: "Lunge",  shape: "single_toward", dmg: 7,  color: "#ef4444", desc: "Lunges at nearest hero" },
    ],
  },
  skeleton: {
    id: "skeleton", name: "Skeleton", emoji: "💀",
    hp: 35, atk: 8, def: 2, steps: 1,
    xp: 12, loot: { lumber: [2, 4] },
    attacks: [
      { id: "slash", name: "Slash", shape: "single_toward", dmg: 8,  color: "#ef4444", desc: "Slashes nearest hero" },
      { id: "arrow", name: "Arrow", shape: "ray_toward",    dmg: 6,  color: "#f97316", desc: "Fires arrow in a line" },
    ],
  },
  orc: {
    id: "orc", name: "Orc", emoji: "👹",
    hp: 55, atk: 11, def: 3, steps: 1,
    xp: 20, loot: { iron_fitting: [1, 2] },
    attacks: [
      { id: "sweep",  name: "Sweep",  shape: "row_3_toward",  dmg: 10, color: "#ef4444", desc: "Sweeps a 3-wide row" },
      { id: "slam",   name: "Ground Slam", shape: "cross_1",  dmg: 13, color: "#dc2626", desc: "Slams ground in a cross" },
    ],
  },
  troll: {
    id: "troll", name: "Troll", emoji: "🧌",
    hp: 90, atk: 15, def: 5, steps: 1,
    xp: 40, loot: { rare_gem: [1, 2] },
    attacks: [
      { id: "stomp",  name: "Stomp",   shape: "square_2x2",  dmg: 16, color: "#ef4444", desc: "Stomps a 2×2 area" },
      { id: "roar",   name: "Roar",    shape: "full_row",    dmg: 9,  color: "#f97316", desc: "Roar hits entire row" },
      { id: "smash",  name: "Smash",   shape: "cross_2",     dmg: 13, color: "#dc2626", desc: "Cross smash pattern" },
    ],
  },
};

const ENEMY_POOL_BY_DEPTH = [
  ["goblin"],
  ["goblin", "skeleton"],
  ["skeleton", "orc"],
  ["orc", "troll"],
];

// ─── Pattern resolver ─────────────────────────────────────────────────────────
// Returns array of [x, y] cells that are in the attack zone

function resolvePattern(shape, ex, ey, tx, ty) {
  const cells = [];
  // direction from enemy toward target
  const rdx = tx !== undefined ? Math.sign(tx - ex) : 0;
  const rdy = ty !== undefined ? Math.sign(ty - ey) : 0;

  function push(x, y) {
    if (x >= 0 && x < COMBAT_W && y >= 0 && y < COMBAT_H) cells.push([x, y]);
  }

  switch (shape) {
    case "single_toward":
      push(ex + rdx, ey + rdy);
      break;
    case "ray_toward":
      for (let i = 1; i <= 5; i++) push(ex + rdx * i, ey + rdy * i);
      break;
    case "row_3_toward": {
      // 3-wide sweep perpendicular to facing, 1 step toward target
      const fx = ex + rdx;
      const fy = ey + rdy;
      if (rdx !== 0) { push(fx, fy - 1); push(fx, fy); push(fx, fy + 1); }
      else           { push(fx - 1, fy); push(fx, fy); push(fx + 1, fy); }
      break;
    }
    case "cross_1":
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([ox,oy]) => push(ex+ox, ey+oy));
      break;
    case "cross_2":
      for (let r = 1; r <= 2; r++) {
        [[-r,0],[r,0],[0,-r],[0,r]].forEach(([ox,oy]) => push(ex+ox, ey+oy));
      }
      break;
    case "square_2x2":
      for (let ox = 0; ox <= 1; ox++) for (let oy = 0; oy <= 1; oy++) push(ex+rdx+ox*(rdx===0?1:0), ey+rdy+oy*(rdy===0?1:0));
      // simpler: stomp in the direction of target, 2x2
      push(ex + rdx, ey + rdy);
      push(ex + rdx + (rdx === 0 ? 1 : 0), ey + rdy + (rdy === 0 ? 1 : 0));
      push(ex + rdx, ey + rdy + (rdy === 0 ? 1 : 0));
      push(ex + rdx + (rdx === 0 ? 1 : 0), ey + rdy);
      break;
    case "full_row":
      for (let x = 0; x < COMBAT_W; x++) push(x, ey);
      break;
    case "line_4":
      for (let i = 1; i <= 4; i++) push(ex + rdx * i, ey + rdy * i);
      break;
    case "aoe_3":
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) push(ex+ox, ey+oy);
      break;
    case "single_adjacent":
      push(ex + rdx, ey + rdy);
      break;
    default:
      push(ex + rdx, ey + rdy);
  }
  return cells;
}

// Hero attack zone resolver
function resolveHeroAttack(shape, hx, hy) {
  const cells = [];
  function push(x, y) {
    if (x >= 0 && x < COMBAT_W && y >= 0 && y < COMBAT_H) cells.push([x, y]);
  }
  switch (shape) {
    case "cross_1":
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([ox,oy]) => push(hx+ox, hy+oy));
      break;
    case "cross_2":
      for (let r = 1; r <= 2; r++) [[-r,0],[r,0],[0,-r],[0,r]].forEach(([ox,oy]) => push(hx+ox, hy+oy));
      break;
    case "line_4":
      // All 4 directions, up to 4 tiles
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]])
        for (let r = 1; r <= 4; r++) push(hx + dx*r, hy + dy*r);
      break;
    case "adjacent_1":
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([ox,oy]) => push(hx+ox, hy+oy));
      break;
    case "aoe_3":
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) if (ox!==0||oy!==0) push(hx+ox, hy+oy);
      break;
    default:
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([ox,oy]) => push(hx+ox, hy+oy));
  }
  return cells;
}

// ─── Dungeon Map Generation ───────────────────────────────────────────────────

function generateMap(depth = 1) {
  const cells = [];
  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let type = "empty";
      if (x === cx && y === cy) { type = "start"; }
      else if (x === cx && y === 0) { type = "exit"; }
      else {
        const dist = Math.abs(x - cx) + Math.abs(y - cy);
        const r = Math.random();
        if (dist === 1)       type = r < 0.25 ? "enemy" : "empty";
        else if (dist <= 3)   type = r < 0.45 ? "enemy" : r < 0.6 ? "treasure" : "empty";
        else                  type = r < 0.5  ? "enemy" : r < 0.65 ? "treasure" : r < 0.78 ? "rest" : "empty";
      }
      cells.push({ x, y, type, visited: (x === cx && y === cy), cleared: false, depth });
    }
  }
  return cells;
}

function getCell(cells, x, y) {
  return cells.find(c => c.x === x && c.y === y) ?? null;
}

function adjacentCells(cells, x, y) {
  return [[0,-1],[0,1],[-1,0],[1,0]]
    .map(([dx,dy]) => getCell(cells, x+dx, y+dy))
    .filter(Boolean);
}

// ─── Build hero combat state from adventurer ──────────────────────────────────

function buildCombatHero(adv, index) {
  const cls = DUNGEON_CLASS[adv.heroClass ?? adv.class ?? "fighter"] ?? DUNGEON_CLASS.fighter;
  const baseHp = adv.maxHp ?? 40;
  const baseAtk = 8 + (adv.level ?? 1) * 2 + (adv.gear ?? 0) * 3;
  return {
    id: adv.id,
    name: adv.name,
    heroClass: adv.heroClass ?? adv.class ?? "fighter",
    emoji: cls.emoji,
    color: cls.color,
    label: cls.label,
    hp: Math.floor(baseHp * cls.hpMult),
    maxHp: Math.floor(baseHp * cls.hpMult),
    atk: Math.floor(baseAtk * cls.atkMult),
    def: cls.defBonus + Math.floor((adv.gear ?? 0) * 0.5),
    attackShape: cls.attackShape,
    specialShape: cls.specialShape,
    specialName: cls.specialName,
    specialDesc: cls.specialDesc,
    healMult: cls.healMult,
    stepsLeft: MAX_STEPS,
    actionUsed: false,
    specialUsed: false, // once per combat
    defending: false,
    foodBelt: { ...(adv.foodBelt ?? {}) },
    // starting position — heroes on left half
    gx: index % 2 === 0 ? 1 : 2,
    gy: Math.floor(index / 2) * 2 + 1,
  };
}

function buildCombatEnemy(type, index, depth) {
  const def = ENEMY_TYPES[type];
  const scale = 1 + depth * 0.15;
  const cols = [COMBAT_W - 2, COMBAT_W - 3, COMBAT_W - 2, COMBAT_W - 3];
  const rows = [1, 1, 3, 3];
  return {
    id: `enemy_${index}_${Date.now()}`,
    typeId: type,
    name: def.name,
    emoji: def.emoji,
    hp: Math.floor(def.hp * scale),
    maxHp: Math.floor(def.hp * scale),
    atk: Math.floor(def.atk * scale),
    def: def.def,
    steps: def.steps,
    attacks: def.attacks,
    xp: def.xp,
    loot: def.loot,
    gx: cols[index] ?? COMBAT_W - 2,
    gy: rows[index] ?? 2,
    intent: null, // { attackDef, cells } — set during enemy intent phase
    stepsLeft: def.steps,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function dist(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// ─── Sub-components ───────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, height = 4 }) {
  const pct = clamp((hp / maxHp) * 100, 0, 100);
  const col = pct > 55 ? "#4ade80" : pct > 25 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ height, background: "rgba(255,255,255,0.1)", borderRadius: height, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: col, transition: "width 0.25s" }} />
    </div>
  );
}

function CombatLog({ entries }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);
  return (
    <div ref={ref} style={{
      height: 64, overflowY: "auto", background: "rgba(0,0,0,0.35)",
      borderRadius: 8, padding: "0.3rem 0.55rem", fontSize: "0.66rem",
      color: "var(--muted)", display: "flex", flexDirection: "column", gap: 2,
      border: "1px solid rgba(255,255,255,0.07)", fontFamily: "monospace",
    }}>
      {entries.map((e, i) => (
        <div key={i} style={{ color: e.color ?? "var(--muted)", lineHeight: 1.35 }}>{e.text}</div>
      ))}
    </div>
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({ hero, onChoose, onClose, hasEnemiesInRange, canHeal }) {
  const actions = [
    { id: "attack",  emoji: "⚔️",  label: "Attack",  desc: "Hit enemies in attack zone", disabled: !hasEnemiesInRange, color: "#f87171" },
    { id: "special", emoji: "✨",  label: hero.specialName, desc: hero.specialDesc,        disabled: hero.specialUsed, color: "#a78bfa" },
    { id: "defend",  emoji: "🛡️",  label: "Defend",  desc: "Halve incoming damage this turn", disabled: false, color: "#60a5fa" },
    { id: "potion",  emoji: "🍞",  label: "Use Food", desc: canHeal ? "Consume food from belt to heal" : "Food belt empty", disabled: !canHeal, color: "#4ade80" },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 80,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "1rem",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-elev, #1a1a2e)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16, padding: "1rem", width: "100%", maxWidth: 380,
        marginBottom: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.2rem" }}>{hero.emoji}</span>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: hero.color }}>{hero.name}</div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{hero.label} — choose action</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {actions.map(a => (
            <button
              key={a.id}
              disabled={a.disabled}
              onClick={() => !a.disabled && onChoose(a.id)}
              style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.55rem 0.75rem", borderRadius: 10,
                background: a.disabled ? "rgba(255,255,255,0.03)" : `${a.color}18`,
                border: `1px solid ${a.disabled ? "rgba(255,255,255,0.06)" : `${a.color}44`}`,
                color: a.disabled ? "var(--muted)" : a.color,
                cursor: a.disabled ? "default" : "pointer",
                textAlign: "left", opacity: a.disabled ? 0.45 : 1,
              }}>
              <span style={{ fontSize: "1.1rem", minWidth: 24 }}>{a.emoji}</span>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>{a.label}</div>
                <div style={{ fontSize: "0.62rem", color: a.disabled ? "var(--muted)" : "rgba(255,255,255,0.55)" }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{
          width: "100%", marginTop: "0.6rem", padding: "0.4rem",
          borderRadius: 8, fontSize: "0.72rem", color: "var(--muted)",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── COMBAT MODE ─────────────────────────────────────────────────────────────

function CombatMode({ heroes: initialHeroes, enemies: initialEnemies, depth, onCombatEnd }) {
  const [heroes, setHeroes] = useState(initialHeroes);
  const [enemies, setEnemies] = useState(initialEnemies);
  const [phase, setPhase] = useState("enemy_intent"); // enemy_intent | hero_act | resolve | done
  const [selected, setSelected] = useState(null); // heroId
  const [actionModal, setActionModal] = useState(null); // heroId
  const [heroActions, setHeroActions] = useState({}); // { heroId: actionId }
  const [log, setLog] = useState([{ text: "⚔️ Enemies spotted! Study their movements.", color: "#f87171" }]);
  const [turn, setTurn] = useState(1);
  const [result, setResult] = useState(null);
  const [flashCells, setFlashCells] = useState({}); // { "x,y": color } for hit flash
  const [selectedEnemy, setSelectedEnemy] = useState(null); // enemyId — tap to reveal intent
  const [pendingAction, setPendingAction] = useState(null); // { heroId, actionId, cells } — attack preview before confirm

  function addLog(text, color) {
    setLog(prev => [...prev, { text, color }]);
  }

  // ── Enemy intent phase: compute where enemies move + which attack they'll use ──
  useEffect(() => {
    if (phase !== "enemy_intent") return;
    const timer = setTimeout(() => {
      setEnemies(prev => prev.map(enemy => {
        // Pick target hero (nearest alive)
        const aliveHeroes = heroes.filter(h => h.hp > 0);
        if (aliveHeroes.length === 0) return enemy;
        const target = aliveHeroes.reduce((a, b) =>
          dist(enemy.gx, enemy.gy, a.gx, a.gy) < dist(enemy.gx, enemy.gy, b.gx, b.gy) ? a : b
        );
        // Pick attack (random from type)
        const attackDef = enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)];
        // Compute attack cells from enemy's CURRENT position toward target
        const cells = resolvePattern(attackDef.shape, enemy.gx, enemy.gy, target.gx, target.gy);
        return { ...enemy, intent: { attackDef, cells, targetId: target.id } };
      }));
      setPhase("hero_act");
      addLog(`── Turn ${turn}: your move ──`, "#555");
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, turn]);

  // ── Check win/loss ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "done") return;
    if (enemies.every(e => e.hp <= 0)) {
      const loot = {};
      enemies.forEach(e => {
        Object.entries(e.loot ?? {}).forEach(([k, [min, max]]) => {
          loot[k] = (loot[k] ?? 0) + randInt(min, max);
        });
      });
      const xp = enemies.reduce((s, e) => s + e.xp, 0);
      setResult({ victory: true, loot, xp });
      setPhase("done");
      addLog("✨ Victory!", "#4ade80");
    } else if (heroes.every(h => h.hp <= 0)) {
      setResult({ victory: false });
      setPhase("done");
      addLog("💀 Party wiped...", "#ef4444");
    }
  }, [heroes, enemies, phase]);

  // ── Cell data ─────────────────────────────────────────────────────────────────
  const heroByPos = {};
  heroes.forEach(h => { if (h.hp > 0) heroByPos[`${h.gx},${h.gy}`] = h; });
  const enemyByPos = {};
  enemies.forEach(e => { if (e.hp > 0) enemyByPos[`${e.gx},${e.gy}`] = e; });



  // Valid moves for selected hero
  const sel = selected ? heroes.find(h => h.id === selected) : null;
  const validMoves = {};
  if (sel && sel.stepsLeft > 0 && phase === "hero_act") {
    for (let gx = 0; gx < COMBAT_W; gx++) {
      for (let gy = 0; gy < COMBAT_H; gy++) {
        const key = `${gx},${gy}`;
        if (!heroByPos[key] && !enemyByPos[key] && dist(sel.gx, sel.gy, gx, gy) === 1) {
          validMoves[key] = true;
        }
      }
    }
  }

  // Hero attack preview cells — only set when player has picked an action and is confirming
  const heroAttackCells = {};
  if (pendingAction) {
    pendingAction.cells.forEach(([gx, gy]) => {
      if (enemyByPos[`${gx},${gy}`]) heroAttackCells[`${gx},${gy}`] = true;
    });
  }

  // Enemy danger cells — only for the tapped enemy (selectedEnemy), or all during enemy_intent phase
  const dangerCells = {};
  if (phase === "enemy_intent") {
    enemies.forEach(e => {
      if (!e.intent) return;
      e.intent.cells.forEach(([cx, cy]) => {
        dangerCells[`${cx},${cy}`] = e.intent.attackDef.color ?? "#ef4444";
      });
    });
  } else if (selectedEnemy) {
    const se = enemies.find(e => e.id === selectedEnemy);
    if (se?.intent) {
      se.intent.cells.forEach(([cx, cy]) => {
        dangerCells[`${cx},${cy}`] = se.intent.attackDef.color ?? "#ef4444";
      });
    }
  }

  function handleCellClick(gx, gy) {
    const key = `${gx},${gy}`;
    const clickedHero = heroByPos[key];
    const clickedEnemy = enemyByPos[key];

    // Tapping an enemy always shows its intent zone (works in any phase)
    if (clickedEnemy) {
      setSelectedEnemy(prev => prev === clickedEnemy.id ? null : clickedEnemy.id);
      setSelected(null);
      setPendingAction(null);
      return;
    }

    if (phase !== "hero_act") return;

    // If there's a pending action preview, clicking elsewhere cancels it
    if (pendingAction) {
      setPendingAction(null);
      return;
    }

    // Click on a hero: select it, or open action modal if already selected + tapped again
    if (clickedHero) {
      if (sel?.id === clickedHero.id) {
        // Second tap on selected hero → open action modal
        setActionModal(clickedHero.id);
      } else {
        setSelected(clickedHero.id);
        setSelectedEnemy(null);
      }
      return;
    }

    if (!sel) return;

    // Move
    if (validMoves[key]) {
      setHeroes(prev => prev.map(h => h.id === sel.id
        ? { ...h, gx, gy, stepsLeft: h.stepsLeft - 1 }
        : h
      ));
      setSelected(null);
      return;
    }

    setSelected(null);
  }

  function handleChooseAction(heroId, actionId) {
    setActionModal(null);
    const hero = heroes.find(h => h.id === heroId);
    if (!hero) return;

    if (actionId === "attack" || actionId === "special") {
      // Show attack preview on grid — player must confirm
      const shape = actionId === "special" ? hero.specialShape : hero.attackShape;
      const cells = resolveHeroAttack(shape, hero.gx, hero.gy);
      setPendingAction({ heroId, actionId, cells });
      return;
    }

    // Defend and potion commit immediately
    commitAction(heroId, actionId);
  }

  function commitAction(heroId, actionId) {
    setPendingAction(null);
    setHeroActions(prev => ({ ...prev, [heroId]: actionId }));
    setHeroes(prev => prev.map(h => h.id === heroId
      ? { ...h, actionUsed: true, defending: actionId === "defend", stepsLeft: 0 }
      : h
    ));
    const hero = heroes.find(h => h.id === heroId);
    addLog(`${hero?.name ?? "Hero"}: ${actionId}`, "#888");
  }

  // ── End hero turn → resolve ───────────────────────────────────────────────────
  function resolve() {
    if (phase !== "hero_act") return;
    setPhase("resolve");

    const newHeroes = heroes.map(h => ({ ...h }));
    const newEnemies = enemies.map(e => ({ ...e }));
    const flashes = {};

    // Hero actions
    newHeroes.forEach(hero => {
      if (hero.hp <= 0) return;
      const action = heroActions[hero.id] ?? "attack";
      const shape = action === "special" ? hero.specialShape : hero.attackShape;

      if (action === "attack" || action === "special") {
        const zone = resolveHeroAttack(shape, hero.gx, hero.gy);

        if (action === "special" && shape === "dash_attack") {
          // Scavenger backstab: teleport to nearest enemy and hit hard
          const aliveEnemies = newEnemies.filter(e => e.hp > 0);
          if (aliveEnemies.length > 0) {
            const target = aliveEnemies.reduce((a, b) =>
              dist(hero.gx, hero.gy, a.gx, a.gy) < dist(hero.gx, hero.gy, b.gx, b.gy) ? a : b
            );
            const dmg = Math.max(1, hero.atk * 2 - target.def + randInt(-2, 2));
            target.hp = Math.max(0, target.hp - dmg);
            flashes[`${target.gx},${target.gy}`] = "#ef4444";
            addLog(`🌿 ${hero.name} backstabs ${target.emoji} ${target.name} for ${dmg}!`, "#34d399");
            const ei = newEnemies.findIndex(e => e.id === target.id);
            if (ei >= 0) { newEnemies[ei] = target; if (target.hp <= 0) addLog(`${target.emoji} ${target.name} defeated!`, "#4ade80"); }
          }
          // mark special used
          const hi = newHeroes.findIndex(h => h.id === hero.id);
          if (hi >= 0) newHeroes[hi].specialUsed = true;
        } else {
          zone.forEach(([zx, zy]) => {
            const enemy = newEnemies.find(e => e.gx === zx && e.gy === zy && e.hp > 0);
            if (!enemy) return;
            const dmg = Math.max(1, hero.atk - enemy.def + randInt(-2, 3));
            enemy.hp = Math.max(0, enemy.hp - dmg);
            flashes[`${zx},${zy}`] = "#ef4444";
            addLog(`${hero.emoji} ${hero.name} hits ${enemy.emoji} for ${dmg}!`, "#fbbf24");
            if (enemy.hp <= 0) addLog(`${enemy.emoji} ${enemy.name} defeated!`, "#4ade80");
          });
          if (action === "special") {
            const hi = newHeroes.findIndex(h => h.id === hero.id);
            if (hi >= 0) newHeroes[hi].specialUsed = true;
          }
        }
      }

      if (action === "potion") {
        // consume first food item from belt
        const belt = { ...hero.foodBelt };
        const key = Object.keys(belt).find(k => (belt[k] ?? 0) > 0);
        if (key) {
          belt[key]--;
          if (belt[key] <= 0) delete belt[key];
          const healAmt = Math.floor(12 * hero.healMult);
          const hi = newHeroes.findIndex(h => h.id === hero.id);
          if (hi >= 0) {
            newHeroes[hi].hp = Math.min(newHeroes[hi].maxHp, newHeroes[hi].hp + healAmt);
            newHeroes[hi].foodBelt = belt;
          }
          addLog(`${hero.emoji} ${hero.name} uses food, heals ${healAmt} HP`, "#4ade80");
        }
      }
    });

    // Enemy attacks — hit heroes in their intent zone
    newEnemies.forEach(enemy => {
      if (enemy.hp <= 0 || !enemy.intent) return;
      const { attackDef, cells } = enemy.intent;
      cells.forEach(([cx, cy]) => {
        const hero = newHeroes.find(h => h.gx === cx && h.gy === cy && h.hp > 0);
        if (!hero) return;
        const dmgReduction = hero.defending ? 0.5 : 1.0;
        const raw = Math.max(1, enemy.atk - hero.def + randInt(-1, 3));
        const dmg = Math.floor(raw * dmgReduction);
        hero.hp = Math.max(0, hero.hp - dmg);
        flashes[`${cx},${cy}`] = "#a78bfa";
        addLog(`${enemy.emoji} ${enemy.name} hits ${hero.emoji} ${hero.name} for ${dmg}${hero.defending ? " (blocked)" : ""}!`, "#f87171");
        if (hero.hp <= 0) addLog(`💀 ${hero.name} has fallen!`, "#ef4444");
      });
    });

    setFlashCells(flashes);
    setTimeout(() => {
      setHeroes(newHeroes.map(h => ({ ...h, stepsLeft: MAX_STEPS, actionUsed: false, defending: false })));
      setEnemies(newEnemies.map(e => ({ ...e, intent: null, stepsLeft: e.steps })));
      setHeroActions({});
      setSelected(null);
      setFlashCells({});
      setTurn(t => t + 1);
      setPhase("enemy_intent");
    }, 700);
  }

  // ── Cell size calculation ─────────────────────────────────────────────────────
  const CELL = 38; // px

  const allActed = heroes.filter(h => h.hp > 0).every(h => h.actionUsed);

  return (
    <div style={{ padding: "0.6rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text)", letterSpacing: "0.01em" }}>
          ⚔️ Turn {turn}
        </div>
        <div style={{
          fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em",
          padding: "0.2rem 0.6rem", borderRadius: 20,
          background: phase === "hero_act" ? "rgba(74,222,128,0.15)" : phase === "resolve" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${phase === "hero_act" ? "rgba(74,222,128,0.4)" : phase === "resolve" ? "rgba(251,191,36,0.4)" : "rgba(239,68,68,0.35)"}`,
          color: phase === "hero_act" ? "#4ade80" : phase === "resolve" ? "#fbbf24" : "#f87171",
        }}>
          {phase === "enemy_intent" ? "👁 ENEMIES MOVE" : phase === "hero_act" ? "YOUR TURN" : phase === "resolve" ? "RESOLVING" : result?.victory ? "VICTORY" : "DEFEAT"}
        </div>
      </div>

      {/* Phase hint */}
      <div style={{ fontSize: "0.62rem", marginBottom: "0.45rem", padding: "0.28rem 0.6rem", borderRadius: 20,
        background: phase === "enemy_intent" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
        border: phase === "enemy_intent" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.07)",
        color: phase === "enemy_intent" ? "#f87171" : "var(--muted)",
      }}>
        {phase === "enemy_intent" ? "🔴 Tap an enemy to see where it attacks. Move your heroes clear." :
         phase === "hero_act" ? (sel ? `${sel.name} selected · tap to move · tap again to act` : "Tap a hero · move 2 steps · tap again to choose action") :
         "Resolving..."}
      </div>

      {/* Combat Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COMBAT_W}, ${CELL}px)`,
        gridTemplateRows: `repeat(${COMBAT_H}, ${CELL}px)`,
        gap: 3, marginBottom: "0.5rem",
        background: "#0d0d12", borderRadius: 12, padding: "0.5rem",
        border: "1px solid rgba(255,255,255,0.1)",
        overflowX: "auto",
        boxShadow: "inset 0 2px 12px rgba(0,0,0,0.6)",
      }}>
        {Array.from({ length: COMBAT_H }, (_, gy) =>
          Array.from({ length: COMBAT_W }, (_, gx) => {
            const key = `${gx},${gy}`;
            const hero = heroByPos[key];
            const enemy = enemyByPos[key];
            const inDanger = dangerCells[key];
            const isValidMove = validMoves[key];
            const isHeroAttack = heroAttackCells[key];
            const isSelected = hero && sel?.id === hero.id;
            const isFlash = flashCells[key];
            const isMidLine = gx === 3 || gx === 4;

            let bg = "rgba(255,255,255,0.04)";
            if (isFlash)      bg = `${isFlash}55`;
            else if (inDanger) bg = `${inDanger}45`;
            else if (isSelected) bg = "rgba(99,102,241,0.3)";
            else if (isValidMove) bg = "rgba(74,222,128,0.18)";
            else if (isHeroAttack) bg = "rgba(251,191,36,0.15)";
            else if (hero)    bg = "rgba(99,102,241,0.18)";
            else if (enemy)   bg = "rgba(239,68,68,0.18)";
            else if (isMidLine) bg = "rgba(255,255,255,0.015)";

            let border = "1px solid rgba(255,255,255,0.05)";
            if (isFlash)      border = `1px solid ${isFlash}88`;
            else if (inDanger) border = `2px solid ${inDanger}cc`;
            else if (isSelected) border = "2px solid rgba(99,102,241,0.7)";
            else if (isValidMove) border = "1px solid rgba(74,222,128,0.5)";
            else if (isHeroAttack) border = "1px solid rgba(251,191,36,0.45)";

            return (
              <div
                key={key}
                onClick={() => handleCellClick(gx, gy)}
                style={{
                  width: CELL, height: CELL, borderRadius: 5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", background: bg, border,
                  cursor: (hero || enemy || isValidMove) ? "pointer" : "default",
                  transition: "background 0.15s, border 0.15s",
                  position: "relative", flexShrink: 0,
                  boxShadow: (hero || enemy) ? "inset 0 0 0 1px rgba(255,255,255,0.06)" : "none",
                }}
              >
                {hero && (
                  <>
                    <span style={{ fontSize: "1.3rem", lineHeight: 1, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}>{hero.emoji}</span>
                    <div style={{ position: "absolute", bottom: 2, left: 3, right: 3 }}>
                      <HpBar hp={hero.hp} maxHp={hero.maxHp} height={3} />
                    </div>
                    {hero.actionUsed && (
                      <div style={{ position: "absolute", top: 1, right: 2, fontSize: "0.45rem", color: "#4ade80" }}>✓</div>
                    )}
                    {hero.defending && (
                      <div style={{ position: "absolute", top: 1, left: 2, fontSize: "0.45rem", color: "#60a5fa" }}>🛡</div>
                    )}
                  </>
                )}
                {enemy && (
                  <>
                    <span style={{ fontSize: "1.3rem", lineHeight: 1, filter: "drop-shadow(0 1px 4px rgba(239,68,68,0.5))" }}>{enemy.emoji}</span>
                    <div style={{ position: "absolute", bottom: 2, left: 3, right: 3 }}>
                      <HpBar hp={enemy.hp} maxHp={enemy.maxHp} height={3} />
                    </div>
                    {enemy.intent && (
                      <div style={{ position: "absolute", top: 1, left: 2, fontSize: "0.42rem", color: "#f87171" }}>
                        {enemy.intent.attackDef.name}
                      </div>
                    )}
                    {selectedEnemy === enemy.id && (
                      <div style={{ position: "absolute", inset: 0, borderRadius: 6, border: "2px solid #f87171", pointerEvents: "none" }} />
                    )}
                  </>
                )}
                {/* Battle line separator */}
                {gx === 3 && !hero && !enemy && (
                  <div style={{ position: "absolute", right: -2, top: 0, bottom: 0, width: 2,
                    background: "linear-gradient(to bottom, transparent, rgba(255,80,80,0.25), rgba(100,100,255,0.25), transparent)" }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Hero status strip */}
      <div style={{ display: "flex", gap: 4, marginBottom: "0.5rem" }}>
        {heroes.map(hero => (
          <div
            key={hero.id}
            onClick={() => { if (phase === "hero_act" && hero.hp > 0) { setSelected(hero.id); } }}
            style={{
              flex: 1, padding: "0.35rem 0.35rem", borderRadius: 9,
              background: sel?.id === hero.id ? "rgba(99,102,241,0.22)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${sel?.id === hero.id ? "rgba(99,102,241,0.6)" : hero.hp <= 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
              opacity: hero.hp <= 0 ? 0.3 : 1,
              cursor: phase === "hero_act" && hero.hp > 0 ? "pointer" : "default",
              boxShadow: sel?.id === hero.id ? "0 0 8px rgba(99,102,241,0.3)" : "none",
            }}>
            <div style={{ textAlign: "center", fontSize: "1rem", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>{hero.emoji}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, margin: "2px 0" }}>
              <HpBar hp={hero.hp} maxHp={hero.maxHp} height={3} />
            </div>
            <div style={{ fontSize: "0.55rem", fontWeight: 600, color: hero.actionUsed ? "#4ade80" : "var(--muted)", textAlign: "center", marginTop: 2 }}>
              {hero.actionUsed ? "✓" : `${hero.stepsLeft}ap`}
            </div>
          </div>
        ))}
      </div>

      {/* Enemy intent list */}
      {(phase === "enemy_intent" || phase === "hero_act") && enemies.some(e => e.hp > 0 && e.intent) && (
        <div style={{ marginBottom: "0.45rem", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {enemies.filter(e => e.hp > 0 && e.intent).map(e => (
            <div key={e.id} onClick={() => setSelectedEnemy(prev => prev === e.id ? null : e.id)}
              style={{ fontSize: "0.62rem", padding: "0.2rem 0.55rem", borderRadius: 20, cursor: "pointer",
                background: selectedEnemy === e.id ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${selectedEnemy === e.id ? "rgba(239,68,68,0.6)" : "rgba(239,68,68,0.25)"}`,
                color: "#f87171", fontWeight: selectedEnemy === e.id ? 700 : 400 }}>
              {e.emoji} {e.name}: {e.intent.attackDef.name}
            </div>
          ))}
        </div>
      )}

      <CombatLog entries={log} />

      {/* Attack confirm bar */}
      {pendingAction && (() => {
        const hero = heroes.find(h => h.id === pendingAction.heroId);
        const hitsCount = pendingAction.cells.filter(([gx,gy]) => enemyByPos[`${gx},${gy}`]).length;
        return (
          <div style={{ marginTop: "0.45rem", display: "flex", gap: 6 }}>
            <div style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: 8, fontSize: "0.7rem",
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
              {hero?.emoji} {hero?.name}: {pendingAction.actionId} · {hitsCount} target{hitsCount !== 1 ? "s" : ""} in range
            </div>
            <button onClick={() => commitAction(pendingAction.heroId, pendingAction.actionId)}
              style={{ padding: "0.4rem 0.9rem", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem",
                background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24", cursor: "pointer" }}>
              Confirm ✓
            </button>
            <button onClick={() => setPendingAction(null)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: 8, fontSize: "0.75rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)", cursor: "pointer" }}>
              ✕
            </button>
          </div>
        );
      })()}

      {/* End turn button */}
      {phase === "hero_act" && !result && !pendingAction && (
        <button
          onClick={resolve}
          style={{
            width: "100%", marginTop: "0.45rem", padding: "0.55rem",
            borderRadius: 8, fontWeight: 700, fontSize: "0.8rem",
            background: allActed ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${allActed ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
            color: allActed ? "#a5b4fc" : "var(--muted)", cursor: "pointer",
          }}>
          {allActed ? "Resolve Turn →" : "End Turn (not all heroes acted) →"}
        </button>
      )}

      {/* Result */}
      {result && (
        <div style={{
          marginTop: "0.5rem", padding: "0.75rem", borderRadius: 12, textAlign: "center",
          background: result.victory ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${result.victory ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          <div style={{ fontSize: "1.8rem", marginBottom: "0.2rem" }}>{result.victory ? "🏆" : "💀"}</div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: result.victory ? "#4ade80" : "#ef4444", marginBottom: "0.4rem" }}>
            {result.victory ? "Victory!" : "Defeated"}
          </div>
          {result.victory && Object.entries(result.loot ?? {}).map(([k, v]) => (
            <div key={k} style={{ fontSize: "0.75rem", color: "var(--text)" }}>🎒 +{v} {k.replace(/_/g, " ")}</div>
          ))}
          {result.victory && <div style={{ fontSize: "0.7rem", color: "#a78bfa", marginTop: "0.2rem" }}>✨ +{result.xp} XP</div>}
          <button
            onClick={() => onCombatEnd(result)}
            style={{
              marginTop: "0.65rem", padding: "0.45rem 1.5rem", borderRadius: 8,
              fontWeight: 700, fontSize: "0.78rem",
              background: result.victory ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${result.victory ? "rgba(74,222,128,0.5)" : "rgba(239,68,68,0.4)"}`,
              color: result.victory ? "#4ade80" : "#ef4444", cursor: "pointer",
            }}>
            {result.victory ? "Continue →" : "Retreat"}
          </button>
        </div>
      )}

      {/* Action modal */}
      {actionModal && (() => {
        const hero = heroes.find(h => h.id === actionModal);
        if (!hero) return null;
        const attackZone = resolveHeroAttack(hero.attackShape, hero.gx, hero.gy);
        const hasEnemiesInRange = attackZone.some(([gx,gy]) => enemyByPos[`${gx},${gy}`]);
        const canHeal = Object.values(hero.foodBelt ?? {}).some(v => v > 0);
        return (
          <ActionModal
            hero={hero}
            hasEnemiesInRange={hasEnemiesInRange}
            canHeal={canHeal}
            onChoose={id => handleChooseAction(actionModal, id)}
            onClose={() => setActionModal(null)}
          />
        );
      })()}
    </div>
  );
}

// ─── EXPLORE MODE ─────────────────────────────────────────────────────────────

function ExploreMode({ heroes, cells, setCells, pos, setPos, depth, onEnterCombat, onCollectTreasure, onRest, onRetreat, onExit, lootTotal }) {
  const currentCell = getCell(cells, pos.x, pos.y);
  const adj = adjacentCells(cells, pos.x, pos.y);
  const CELL = 40;

  const visitedCount = cells.filter(c => c.visited).length;
  const enemyCount = cells.filter(c => c.type === "enemy" && !c.cleared).length;
  const clearedCount = cells.filter(c => c.cleared).length;

  function moveToCell(x, y) {
    const target = getCell(cells, x, y);
    if (!target) return;
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, visited: true } : c));
    setPos({ x, y });
    if (!target.cleared) {
      if (target.type === "enemy")    onEnterCombat(x, y);
      if (target.type === "treasure") onCollectTreasure(x, y);
      if (target.type === "rest")     onRest(x, y);
      if (target.type === "exit")     onExit();
    }
  }

  const roomColor = { start: "#4ade8020", empty: "#ffffff08", enemy: "#ef444420", treasure: "#fbbf2420", rest: "#4ade8015", exit: "#a78bfa25" };
  const roomEmoji = { start: "🏠", empty: "", enemy: "👹", treasure: "💰", rest: "🏕️", exit: "🚪" };

  return (
    <div style={{ padding: "0.65rem" }}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 6, marginBottom: "0.6rem" }}>
        {[
          { label: "Explored", value: `${visitedCount}/${cells.length}`, color: "#a78bfa" },
          { label: "Enemies",  value: enemyCount,    color: "#f87171" },
          { label: "Cleared",  value: clearedCount,  color: "#4ade80" },
          { label: "Depth",    value: depth,         color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.3rem 0.2rem" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${MAP_W}, ${CELL}px)`,
        gap: 3, justifyContent: "center",
        background: "rgba(0,0,0,0.45)", borderRadius: 12, padding: "0.45rem",
        border: "1px solid rgba(255,255,255,0.07)", marginBottom: "0.6rem",
      }}>
        {cells.map(cell => {
          const isParty = cell.x === pos.x && cell.y === pos.y;
          const isAdj = adj.some(a => a.x === cell.x && a.y === cell.y);
          const visible = cell.visited || isAdj;
          const canMove = isAdj && !isParty;
          const showContent = cell.visited && !isParty;

          return (
            <div
              key={`${cell.x},${cell.y}`}
              onClick={() => canMove && moveToCell(cell.x, cell.y)}
              style={{
                width: CELL, height: CELL, borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column",
                fontSize: isParty ? "1.2rem" : "0.95rem",
                background: !visible ? "rgba(0,0,0,0.7)"
                  : isParty ? "rgba(99,102,241,0.28)"
                  : roomColor[cell.type] ?? "#ffffff08",
                border: isParty ? "2px solid rgba(99,102,241,0.75)"
                  : canMove ? "1px solid rgba(255,255,255,0.3)"
                  : cell.visited ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(255,255,255,0.03)",
                cursor: canMove ? "pointer" : "default",
                opacity: !visible ? 0.2 : 1,
                transition: "all 0.12s",
                position: "relative",
              }}>
              {isParty ? "🧭" : !visible ? null : showContent ? (
                cell.cleared && cell.type !== "start" ? (
                  <span style={{ fontSize: "0.65rem", color: "#4ade80" }}>✓</span>
                ) : roomEmoji[cell.type]
              ) : (
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>?</span>
              )}
              {canMove && !cell.cleared && cell.type !== "empty" && cell.type !== "start" && (
                <div style={{ position: "absolute", bottom: 1, fontSize: "0.4rem", color: "rgba(255,255,255,0.4)" }}>tap</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "0.55rem" }}>
        {[["🧭","Party"],["👹","Enemy"],["💰","Treasure"],["🏕️","Rest"],["🚪","Exit"]].map(([e,l]) => (
          <span key={l} style={{ fontSize: "0.6rem", color: "var(--muted)", display: "flex", gap: 3, alignItems: "center" }}>
            <span>{e}</span>{l}
          </span>
        ))}
      </div>

      {/* Party HP */}
      <div style={{ display: "flex", gap: 4, marginBottom: "0.5rem" }}>
        {heroes.map(h => (
          <div key={h.id} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "0.3rem 0.35rem", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: "0.8rem", textAlign: "center" }}>{h.emoji}</div>
            <HpBar hp={h.hp} maxHp={h.maxHp} />
            <div style={{ fontSize: "0.52rem", color: "var(--muted)", textAlign: "center", marginTop: 2 }}>{Math.floor(h.hp)}/{h.maxHp}</div>
          </div>
        ))}
      </div>

      {/* Loot so far */}
      {Object.keys(lootTotal).length > 0 && (
        <div style={{ marginBottom: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: 8, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)", fontSize: "0.65rem", color: "#4ade80" }}>
          🎒 {Object.entries(lootTotal).map(([k,v]) => `${v} ${k.replace(/_/g," ")}`).join(" · ")}
        </div>
      )}

      <button onClick={onRetreat} style={{
        width: "100%", padding: "0.45rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600,
        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", color: "#f87171", cursor: "pointer",
      }}>🏳️ Retreat and keep loot</button>
    </div>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function Lobby({ adventurers, lastRun, onStart }) {
  const eligible = adventurers.filter(a => a.hp > 0);
  const hasHeroes = eligible.length > 0;

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "0.85rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.15rem" }}>⚔️ Dungeon</h3>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          Explore a procedural dungeon with your party. Read enemy telegraphs. Move your heroes clear. Strike when the moment is right.
        </p>
      </div>

      {lastRun && (
        <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: 10,
          background: lastRun.victory ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.07)",
          border: `1px solid ${lastRun.victory ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.2)"}` }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: lastRun.victory ? "#4ade80" : "#f87171", marginBottom: "0.25rem" }}>
            {lastRun.victory ? "✅ Last run: Victory" : "💀 Last run: Defeated"}
          </div>
          {Object.entries(lastRun.loot ?? {}).map(([k,v]) => (
            <div key={k} style={{ fontSize: "0.68rem", color: "var(--text)" }}>+{v} {k.replace(/_/g," ")}</div>
          ))}
        </div>
      )}

      {/* Party preview — real heroes */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>YOUR PARTY</div>
        {eligible.length === 0 ? (
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", padding: "0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            No available heroes. Revive fallen heroes to enter.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            {eligible.slice(0, 4).map(adv => {
              const cls = DUNGEON_CLASS[adv.heroClass ?? adv.class ?? "fighter"] ?? DUNGEON_CLASS.fighter;
              return (
                <div key={adv.id} style={{ flex: 1, padding: "0.45rem 0.35rem", borderRadius: 9,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", textAlign: "center" }}>
                  <div style={{ fontSize: "1.1rem" }}>{cls.emoji}</div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: cls.color, marginTop: 2 }}>{cls.label}</div>
                  <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>Lv{adv.level}</div>
                  <div style={{ marginTop: 3 }}><HpBar hp={adv.hp ?? adv.maxHp} maxHp={adv.maxHp} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Class guide */}
      <div style={{ marginBottom: "0.85rem", padding: "0.55rem 0.7rem", borderRadius: 9,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.35rem" }}>HOW IT WORKS</div>
        <div style={{ fontSize: "0.65rem", color: "var(--text)", lineHeight: 1.6 }}>
          Enemies telegraph their attacks — red zones show where they'll strike. Move your heroes clear, then pick their action. Everything resolves simultaneously at end of turn.
        </div>
        <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: 3 }}>
          {Object.entries(DUNGEON_CLASS).slice(0, 3).map(([cls, meta]) => (
            <div key={cls} style={{ display: "flex", gap: 6, fontSize: "0.63rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", minWidth: 20 }}>{meta.emoji}</span>
              <span style={{ color: meta.color, fontWeight: 600, minWidth: 60 }}>{meta.label}</span>
              <span style={{ color: "var(--muted)" }}>{meta.description}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={!hasHeroes}
        style={{
          width: "100%", padding: "0.75rem", borderRadius: 10,
          fontWeight: 700, fontSize: "0.88rem",
          background: hasHeroes ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
          border: `2px solid ${hasHeroes ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.08)"}`,
          color: hasHeroes ? "#a5b4fc" : "var(--muted)",
          cursor: hasHeroes ? "pointer" : "default",
        }}>
        ⚔️ Enter Dungeon
      </button>
      {!hasHeroes && (
        <div style={{ fontSize: "0.62rem", color: "var(--muted)", textAlign: "center", marginTop: "0.4rem" }}>
          Hire heroes in the Heroes tab first
        </div>
      )}
      <p style={{ fontSize: "0.58rem", color: "var(--muted)", textAlign: "center", marginTop: "0.5rem", opacity: 0.6 }}>
        ⚠️ Prototype — loot not yet delivered to game state
      </p>
    </div>
  );
}

// ─── MAIN DUNGEON ZONE ────────────────────────────────────────────────────────

export default function DungeonZone({ game }) {
  const [mode, setMode] = useState("lobby");   // lobby | explore | combat
  const [cells, setCells] = useState([]);
  const [pos, setPos] = useState({ x: 3, y: 3 });
  const [depth, setDepth] = useState(1);
  const [combatPos, setCombatPos] = useState(null);
  const [combatEnemies, setCombatEnemies] = useState([]);
  const [heroes, setHeroes] = useState([]); // combat-ready hero states
  const [lootTotal, setLootTotal] = useState({});
  const [lastRun, setLastRun] = useState(null);

  const adventurers = (game?.adventurers ?? []).filter(a => (a.hp ?? a.maxHp ?? 40) > 0);

  function buildHeroes() {
    return adventurers.slice(0, 4).map((adv, i) => buildCombatHero(adv, i));
  }

  function startRun() {
    const newCells = generateMap(depth);
    setCells(newCells);
    setPos({ x: 3, y: 3 });
    setHeroes(buildHeroes());
    setLootTotal({});
    setMode("explore");
  }

  function enterCombat(x, y) {
    setCombatPos({ x, y });
    // Pick enemy types based on depth
    const pool = ENEMY_POOL_BY_DEPTH[Math.min(depth - 1, ENEMY_POOL_BY_DEPTH.length - 1)];
    const count = Math.min(2 + Math.floor(depth / 2), 4);
    const enemyList = Array.from({ length: count }, (_, i) => {
      const type = pool[Math.floor(Math.random() * pool.length)];
      return buildCombatEnemy(type, i, depth);
    });
    setCombatEnemies(enemyList);
    setMode("combat");
  }

  function onCombatEnd(result) {
    if (result.victory) {
      // Merge loot
      setLootTotal(prev => {
        const next = { ...prev };
        Object.entries(result.loot ?? {}).forEach(([k, v]) => { next[k] = (next[k] ?? 0) + v; });
        return next;
      });
      // Mark cell cleared
      if (combatPos) {
        setCells(prev => prev.map(c =>
          c.x === combatPos.x && c.y === combatPos.y ? { ...c, cleared: true } : c
        ));
      }
      // Carry hero HP forward
      setHeroes(result.survivingHeroes ?? heroes);
    } else {
      endRun(false);
      return;
    }
    setCombatPos(null);
    setMode("explore");
  }

  function collectTreasure(x, y) {
    const loot = { iron_ore: randInt(3, 8) + depth * 2 };
    setLootTotal(prev => {
      const next = { ...prev };
      Object.entries(loot).forEach(([k,v]) => { next[k] = (next[k] ?? 0) + v; });
      return next;
    });
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, cleared: true } : c));
  }

  function onRest(x, y) {
    setHeroes(prev => prev.map(h => ({ ...h, hp: Math.min(h.maxHp, h.hp + Math.floor(h.maxHp * 0.3)) })));
    setCells(prev => prev.map(c => c.x === x && c.y === y ? { ...c, cleared: true } : c));
  }

  function onExit() {
    setDepth(d => d + 1);
    endRun(true);
  }

  function endRun(victory) {
    setLastRun({ victory, loot: lootTotal });
    setMode("lobby");
  }

  if (mode === "lobby") {
    return <Lobby adventurers={adventurers} lastRun={lastRun} onStart={startRun} />;
  }

  if (mode === "explore") {
    return (
      <ExploreMode
        heroes={heroes}
        cells={cells}
        setCells={setCells}
        pos={pos}
        setPos={setPos}
        depth={depth}
        onEnterCombat={enterCombat}
        onCollectTreasure={collectTreasure}
        onRest={onRest}
        onRetreat={() => endRun(false)}
        onExit={onExit}
        lootTotal={lootTotal}
      />
    );
  }

  if (mode === "combat") {
    return (
      <CombatMode
        heroes={heroes}
        enemies={combatEnemies}
        depth={depth}
        onCombatEnd={onCombatEnd}
      />
    );
  }

  return null;
}