// src/Pages/rootwork/components/DungeonZone.jsx
// Battleheart-style dungeon — freeform battlefield, real-time, tap to move/attack

import { useState, useEffect, useRef } from "react";

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
    ability: { name: "Blade Rush", emoji: "⚡", cooldown: 6, desc: "Next attack deals 3× damage" },
  },
  ranger: {
    label: "Ranger", emoji: "🏹", color: "#fbbf24", bg: "#451a03",
    hpMult: 0.9, atkMult: 1.2, defBonus: 1,
    attackSpeed: 1.0, attackRange: ATTACK_RANGE * 1.8,
    ability: { name: "Volley", emoji: "🏹", cooldown: 7, desc: "Next attack deals 3× damage" },
  },
};

// ─── Enemy types ──────────────────────────────────────────────────────────────

const ENEMY_TYPES = {
  goblin:   { name:"Goblin",   emoji:"👺", color:"#dc2626", bg:"#450a0a", hp:35,  atk:7,  def:1, speed:ENEMY_SPEED*1.2, attackSpeed:0.9, attackRange:ENEMY_ATTACK_RANGE, xp:8,  loot:{iron_ore:[2,5]} },
  skeleton: { name:"Skeleton", emoji:"💀", color:"#9ca3af", bg:"#111827", hp:45,  atk:9,  def:2, speed:ENEMY_SPEED,     attackSpeed:0.7, attackRange:ENEMY_ATTACK_RANGE, xp:12, loot:{lumber:[2,4]} },
  orc:      { name:"Orc",      emoji:"👹", color:"#f97316", bg:"#431407", hp:80,  atk:14, def:4, speed:ENEMY_SPEED*0.7, attackSpeed:0.5, attackRange:ENEMY_ATTACK_RANGE*1.1, xp:22, loot:{iron_fitting:[1,2]} },
  troll:    { name:"Troll",    emoji:"🧌", color:"#84cc16", bg:"#1a2e05", hp:140, atk:20, def:6, speed:ENEMY_SPEED*0.5, attackSpeed:0.4, attackRange:ENEMY_ATTACK_RANGE*1.2, xp:40, loot:{rare_gem:[1,2]} },
};

const ENEMY_POOL = [["goblin"],["goblin","skeleton"],["skeleton","orc"],["orc","troll"]];

// ─── Utility ──────────────────────────────────────────────────────────────────

let _uid = 0;
function uid(p="u") { return `${p}_${++_uid}_${Date.now()}`; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function dist(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b-a)*t; }
function moveToward(pos, target, speed, dt) {
  const d = dist(pos, target);
  if (d < 1) return { ...target };
  const t = Math.min(1, (speed * dt) / d);
  return { x: lerp(pos.x, target.x, t), y: lerp(pos.y, target.y, t) };
}

// ─── Unit factory ─────────────────────────────────────────────────────────────

function makeHero(adv, index) {
  const cls = DUNGEON_CLASS[adv.heroClass ?? adv.class ?? "fighter"] ?? DUNGEON_CLASS.fighter;
  const baseHp = adv.maxHp ?? 40;
  const baseAtk = 8 + (adv.level ?? 1) * 2 + (adv.gear ?? 0) * 3;
  const startX = 45 + (index % 2) * 60;
  const startY = 80 + Math.floor(index / 2) * 110;
  return {
    id: adv.id, kind: "hero", name: adv.name,
    heroClass: adv.heroClass ?? adv.class ?? "fighter",
    emoji: cls.emoji, color: cls.color, bg: cls.bg, label: cls.label,
    x: startX, y: startY, targetX: startX, targetY: startY,
    attackTarget: null,
    hp: Math.floor(baseHp * cls.hpMult), maxHp: Math.floor(baseHp * cls.hpMult),
    atk: Math.floor(baseAtk * cls.atkMult), def: cls.defBonus + Math.floor((adv.gear ?? 0) * 0.5),
    attackSpeed: cls.attackSpeed, attackRange: cls.attackRange,
    attackCooldown: 0,
    ability: { ...cls.ability, cooldownLeft: 0 },
    abilityCharged: false, tauntActive: false,
    dead: false, flashHit: false,
  };
}

function makeEnemy(typeId, index, depth) {
  const def = ENEMY_TYPES[typeId];
  const scale = 1 + depth * 0.12;
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    id: uid("e"), kind: "enemy", typeId,
    name: def.name, emoji: def.emoji, color: def.color, bg: def.bg,
    x: clamp(BF_W - 55 - col*65 + randInt(-10,10), UNIT_R+5, BF_W-UNIT_R-5),
    y: clamp(60 + row*80 + randInt(-10,10), UNIT_R+5, BF_H-UNIT_R-5),
    hp: Math.floor(def.hp*scale), maxHp: Math.floor(def.hp*scale),
    atk: Math.floor(def.atk*scale), def: def.def,
    speed: def.speed, attackSpeed: def.attackSpeed, attackRange: def.attackRange,
    attackCooldown: randInt(0,15)/10,
    taunted: false, dead: false, flashHit: false,
  };
}

// ─── Map generation ───────────────────────────────────────────────────────────

function generateMap() {
  const cx = Math.floor(MAP_W/2), cy = Math.floor(MAP_H/2);
  const cells = [];
  for (let y=0; y<MAP_H; y++) {
    for (let x=0; x<MAP_W; x++) {
      let type = "empty";
      if (x===cx && y===cy) type = "start";
      else if (x===cx && y===0) type = "exit";
      else {
        const d = Math.abs(x-cx)+Math.abs(y-cy), r = Math.random();
        if (d===1)     type = r<0.3  ? "enemy" : "empty";
        else if (d<=3) type = r<0.5  ? "enemy" : r<0.65 ? "treasure" : "empty";
        else           type = r<0.55 ? "enemy" : r<0.7  ? "treasure" : r<0.8 ? "rest" : "empty";
      }
      cells.push({ x, y, type, visited: x===cx && y===cy, cleared: false });
    }
  }
  return cells;
}

// ─── HpBar ───────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, height=4 }) {
  const pct = clamp(hp/maxHp, 0, 1);
  const col = pct>0.55 ? "#4ade80" : pct>0.25 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ height, background:"rgba(255,255,255,0.1)", borderRadius:height, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${pct*100}%`, background:col, transition:"width 0.2s" }} />
    </div>
  );
}

// ─── FloatingText ─────────────────────────────────────────────────────────────

function FloatingText({ items }) {
  return <>
    {items.map(item => (
      <div key={item.id} style={{
        position:"absolute", left:item.x, top:item.y,
        fontSize:"0.72rem", fontWeight:800, color:item.color,
        pointerEvents:"none", whiteSpace:"nowrap",
        animation:"floatUp 1s ease-out forwards",
        textShadow:"0 1px 3px rgba(0,0,0,0.8)",
        transform:"translateX(-50%)", zIndex:20,
      }}>{item.text}</div>
    ))}
  </>;
}

// ─── UnitCircle ──────────────────────────────────────────────────────────────

function UnitCircle({ unit, selected, onClick }) {
  const pct = clamp(unit.hp/unit.maxHp, 0, 1);
  const barCol = pct>0.55 ? "#4ade80" : pct>0.25 ? "#fbbf24" : "#ef4444";
  const size = UNIT_R*2;
  return (
    <div
      style={{
      position:"absolute", left:unit.x-UNIT_R, top:unit.y-UNIT_R,
      width:size, height:size, borderRadius:"50%",
      background:unit.bg,
      border:`2px solid ${selected ? "#fff" : unit.color}`,
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer", fontSize:"1rem", userSelect:"none",
      transition:"left 0.08s linear, top 0.08s linear",
      boxShadow: selected ? `0 0 0 3px ${unit.color}, 0 0 14px ${unit.color}88`
        : unit.flashHit ? "0 0 12px #ef444488"
        : "0 2px 8px rgba(0,0,0,0.6)",
      opacity: unit.dead ? 0 : 1,
      zIndex: selected ? 10 : unit.kind==="hero" ? 5 : 4,
    }}>
      {unit.emoji}
      <div style={{ position:"absolute", bottom:-6, left:-2, right:-2, height:3,
        background:"rgba(0,0,0,0.5)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${pct*100}%`, height:"100%", background:barCol, transition:"width 0.2s" }} />
      </div>
      {selected && (
        <div style={{ position:"absolute", inset:-5, borderRadius:"50%",
          border:`2px solid ${unit.color}`,
          animation:"ringPulse 1s ease-in-out infinite",
          pointerEvents:"none" }} />
      )}
      {unit.taunted && (
        <div style={{ position:"absolute", top:-10, fontSize:"0.6rem" }}>📢</div>
      )}
    </div>
  );
}

// ─── AbilityButton ────────────────────────────────────────────────────────────

function AbilityButton({ hero, isSelected, onUse }) {
  const ab = hero.ability;
  const ready = ab.cooldownLeft <= 0 && !hero.dead;
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, opacity:hero.dead?0.3:1 }}>
      <div style={{ fontSize:"0.58rem", color: isSelected ? hero.color : "var(--muted)", fontWeight: isSelected?700:400, whiteSpace:"nowrap", overflow:"hidden", maxWidth:"100%", textOverflow:"ellipsis" }}>
        {hero.name}
      </div>
      <HpBar hp={hero.hp} maxHp={hero.maxHp} height={3} />
      <button onClick={() => ready && onUse(hero.id)} disabled={!ready} style={{
        width:"100%", padding:"0.28rem 0.2rem", borderRadius:8,
        background: ready ? `${hero.color}22` : "rgba(255,255,255,0.04)",
        border:`1px solid ${ready ? hero.color+"88" : "rgba(255,255,255,0.1)"}`,
        color: ready ? hero.color : "var(--muted)",
        fontSize:"0.58rem", fontWeight:700, cursor: ready?"pointer":"default",
        display:"flex", flexDirection:"column", alignItems:"center", gap:1,
        boxShadow: ready && isSelected ? `0 0 8px ${hero.color}44` : "none",
        position:"relative", overflow:"hidden",
      }}>
        <span style={{ fontSize:"0.85rem" }}>{ab.emoji}</span>
        <span style={{ fontSize:"0.52rem", letterSpacing:"0.02em" }}>{ab.name}</span>
        {ab.cooldownLeft > 0 && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(0,0,0,0.65)", borderRadius:8, fontSize:"0.68rem", fontWeight:800, color:"#fff" }}>
            {Math.ceil(ab.cooldownLeft)}s
          </div>
        )}
        {hero.abilityCharged && (
          <div style={{ position:"absolute", top:2, right:3, width:5, height:5, borderRadius:"50%", background:"#fbbf24" }} />
        )}
      </button>
    </div>
  );
}

// ─── BATTLEFIELD ──────────────────────────────────────────────────────────────

function Battlefield({ game, enemies: initEnemies, onCombatEnd }) {
  const initHeroes = (game?.adventurers ?? [])
    .filter(a => (a.hp ?? a.maxHp ?? 40) > 0)
    .slice(0, 4)
    .map((adv, i) => makeHero(adv, i));

  const [heroes, setHeroes] = useState(initHeroes);
  const [enemies, setEnemies] = useState(initEnemies);
  const [selected, setSelected] = useState(null);
  const [floats, setFloats] = useState([]);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState("prep");
  const [countdown, setCountdown] = useState(5);
  const [result, setResult] = useState(null);

  const heroesRef = useRef(initHeroes);
  const enemiesRef = useRef(initEnemies);
  const selectedRef = useRef(null);
  const phaseRef = useRef("prep");
  const floatIdRef = useRef(0);

  useEffect(() => { heroesRef.current = heroes; }, [heroes]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Prep countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "prep") return;
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

  function addLog(text, color="var(--muted)") {
    setLog(prev => [...prev.slice(-12), { id: Date.now()+Math.random(), text, color }]);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let last = performance.now();
    const loop = setInterval(() => {
      const currentPhase = phaseRef.current;
      if (currentPhase === "prep") {
        // During prep: heroes can move to their targets, enemies stay still
        const hs = heroesRef.current.map(h => ({ ...h }));
        const dt = Math.min((performance.now() - last) / 1000, 0.15);
        last = performance.now();
        hs.forEach(hero => {
          if (hero.dead) return;
          const newPos = moveToward({ x:hero.x, y:hero.y }, { x:hero.targetX, y:hero.targetY }, HERO_SPEED, dt);
          hero.x = clamp(newPos.x, UNIT_R, BF_W-UNIT_R);
          hero.y = clamp(newPos.y, UNIT_R, BF_H-UNIT_R);
        });
        heroesRef.current = hs;
        setHeroes([...hs]);
        return;
      }
      if (currentPhase !== "fighting") return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.15);
      last = now;

      const hs = heroesRef.current.map(h => ({ ...h, ability: { ...h.ability } }));
      const es = enemiesRef.current.map(e => ({ ...e }));
      const aliveHeroes = hs.filter(h => !h.dead);
      const aliveEnemies = es.filter(e => !e.dead);

      if (aliveHeroes.length === 0) {
        setPhase("defeat"); setResult({ victory: false }); return;
      }
      if (aliveEnemies.length === 0) {
        const loot = {};
        es.forEach(e => {
          const def = ENEMY_TYPES[e.typeId];
          if (!def?.loot) return;
          Object.entries(def.loot).forEach(([k,[mn,mx]]) => { loot[k] = (loot[k]??0) + randInt(mn,mx); });
        });
        const xp = es.reduce((s,e) => s + (ENEMY_TYPES[e.typeId]?.xp??0), 0);
        setPhase("victory"); setResult({ victory:true, loot, xp }); return;
      }

      // Heroes
      hs.forEach(hero => {
        if (hero.dead) return;
        // Move
        const newPos = moveToward({ x:hero.x, y:hero.y }, { x:hero.targetX, y:hero.targetY }, HERO_SPEED, dt);
        hero.x = clamp(newPos.x, UNIT_R, BF_W-UNIT_R);
        hero.y = clamp(newPos.y, UNIT_R, BF_H-UNIT_R);
        // Chase attack target
        if (hero.attackTarget) {
          const tgt = aliveEnemies.find(e => e.id === hero.attackTarget);
          if (!tgt) { hero.attackTarget = null; }
          else if (dist(hero, tgt) > hero.attackRange) {
            hero.targetX = tgt.x; hero.targetY = tgt.y;
          }
        }
        // Auto-attack
        if (hero.attackCooldown > 0) { hero.attackCooldown -= dt; }
        else {
          let atk = null;
          if (hero.attackTarget) {
            const t = aliveEnemies.find(e => e.id === hero.attackTarget);
            if (t && dist(hero,t) <= hero.attackRange) atk = t;
          }
          if (!atk) {
            const inRange = aliveEnemies.filter(e => dist(hero,e) <= hero.attackRange);
            if (inRange.length > 0) atk = inRange.reduce((a,b) => dist(hero,a)<dist(hero,b)?a:b);
          }
          if (atk) {
            const baseDmg = Math.max(1, hero.atk - atk.def + randInt(-2,3));
            const dmg = hero.abilityCharged ? baseDmg*3 : baseDmg;
            if (hero.abilityCharged) { hero.abilityCharged = false; addLog(`⚡ ${hero.name} blade rush! ${dmg}!`, "#fbbf24"); }
            const ei = es.findIndex(e => e.id === atk.id);
            if (ei >= 0) {
              es[ei].hp = Math.max(0, es[ei].hp - dmg);
              if (es[ei].hp <= 0) { es[ei].dead = true; addLog(`${atk.emoji} ${atk.name} defeated!`, "#4ade80"); }
              addFloat(atk.x, atk.y-10, `-${dmg}`, "#f87171");
            }
            hero.attackCooldown = 1/hero.attackSpeed;
          }
        }
        // Ability cooldown
        if (hero.ability.cooldownLeft > 0) hero.ability.cooldownLeft = Math.max(0, hero.ability.cooldownLeft - dt);
        hero.flashHit = false;
      });

      // Enemies
      es.forEach(enemy => {
        if (enemy.dead) return;
        const tauntHero = hs.find(h => !h.dead && h.tauntActive);
        const tgt = tauntHero ?? (aliveHeroes.length ? aliveHeroes.reduce((a,b) => dist(enemy,a)<dist(enemy,b)?a:b) : null);
        enemy.taunted = !!tauntHero;
        if (!tgt) return;
        const d = dist(enemy, tgt);
        if (d > enemy.attackRange) {
          const np = moveToward({ x:enemy.x, y:enemy.y }, tgt, enemy.speed, dt);
          enemy.x = clamp(np.x, UNIT_R, BF_W-UNIT_R);
          enemy.y = clamp(np.y, UNIT_R, BF_H-UNIT_R);
        }
        if (enemy.attackCooldown > 0) { enemy.attackCooldown -= dt; }
        else if (d <= enemy.attackRange) {
          const hi = hs.findIndex(h => h.id === tgt.id);
          if (hi >= 0 && !hs[hi].dead) {
            const dmg = Math.max(1, enemy.atk - hs[hi].def + randInt(-1,3));
            hs[hi].hp = Math.max(0, hs[hi].hp - dmg);
            if (hs[hi].hp <= 0) { hs[hi].dead = true; addLog(`💀 ${hs[hi].name} fallen!`, "#ef4444"); }
            addFloat(tgt.x, tgt.y-10, `-${dmg}`, "#a78bfa");
            enemy.attackCooldown = 1/enemy.attackSpeed;
          }
        }
        enemy.flashHit = false;
      });

      setHeroes([...hs]);
      setEnemies([...es]);
    }, TICK_MS);

    return () => clearInterval(loop);
  }, []);

  // ── Tap handler — works on both mouse and touch ────────────────────────
  function handleTap(e) {
    if (phase !== "fighting" && phase !== "prep") return;
    // pointerdown gives clientX/Y for both mouse and touch
    const rect = e.currentTarget.getBoundingClientRect();
    // support both pointer/mouse events (clientX) and legacy touch events (touches[0])
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;
    // scale: battlefield may render at a different visual size than BF_W/BF_H
    const scaleX = BF_W / rect.width;
    const scaleY = BF_H / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const tappedEnemy = enemiesRef.current.find(en => !en.dead && dist({x,y},en) < UNIT_R*1.5);
    if (tappedEnemy) {
      if (selectedRef.current && phase === "fighting") {
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

    const tappedHero = heroesRef.current.find(h => !h.dead && dist({x,y},h) < UNIT_R*1.5);
    if (tappedHero) {
      setSelected(prev => prev === tappedHero.id ? null : tappedHero.id);
      selectedRef.current = tappedHero.id === selectedRef.current ? null : tappedHero.id;
      return;
    }

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

  // ── Ability use ────────────────────────────────────────────────────────────
  function useAbility(heroId) {
    const hero = heroesRef.current.find(h => h.id === heroId);
    if (!hero || hero.ability.cooldownLeft > 0 || hero.dead) return;

    if (hero.heroClass === "fighter") {
      addLog(`📢 ${hero.name} taunts! Enemies focus Fighter!`, "#f87171");
      setHeroes(prev => prev.map(h => {
        if (h.id !== heroId) return h;
        return { ...h, tauntActive: true, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } };
      }));
      setTimeout(() => setHeroes(prev => prev.map(h => h.id === heroId ? { ...h, tauntActive: false } : h)), 4000);
    } else if (hero.heroClass === "mage") {
      setHeroes(prev => {
        const alive = prev.filter(h => !h.dead);
        if (!alive.length) return prev;
        const lowest = alive.reduce((a,b) => (a.hp/a.maxHp)<(b.hp/b.maxHp)?a:b);
        const healAmt = Math.floor(lowest.maxHp * 0.35);
        addLog(`💚 ${hero.name} heals ${lowest.name} for ${healAmt}!`, "#4ade80");
        addFloat(lowest.x, lowest.y-15, `+${healAmt}`, "#4ade80");
        return prev.map(h => {
          if (h.id === heroId) return { ...h, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } };
          if (h.id === lowest.id) return { ...h, hp: Math.min(h.maxHp, h.hp + healAmt) };
          return h;
        });
      });
    } else {
      // Scavenger / ranger — charge blade rush
      addLog(`⚡ ${hero.name} charging blade rush!`, "#34d399");
      setHeroes(prev => prev.map(h => h.id === heroId
        ? { ...h, abilityCharged: true, ability: { ...h.ability, cooldownLeft: h.ability.cooldown } }
        : h));
    }
  }

  const selHero = heroes.find(h => h.id === selected && !h.dead) ?? null;

  return (
    <div style={{ padding:"0.6rem" }}>
      <style>{`
        @keyframes ringPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes floatUp { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-32px)} }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
        <div style={{ fontSize:"0.85rem", fontWeight:800 }}>⚔️ Combat</div>
        <div style={{ fontSize:"0.65rem", fontWeight:700, padding:"0.18rem 0.55rem", borderRadius:20,
          background: phase==="prep"?"rgba(251,191,36,0.12)":phase==="fighting"?"rgba(74,222,128,0.12)":phase==="victory"?"rgba(251,191,36,0.15)":"rgba(239,68,68,0.12)",
          border:`1px solid ${phase==="prep"?"rgba(251,191,36,0.4)":phase==="fighting"?"rgba(74,222,128,0.35)":phase==="victory"?"rgba(251,191,36,0.4)":"rgba(239,68,68,0.35)"}`,
          color: phase==="prep"?"#fbbf24":phase==="fighting"?"#4ade80":phase==="victory"?"#fbbf24":"#f87171",
        }}>
          {phase==="prep"?`⏳ ${countdown}s`:phase==="fighting"?"LIVE":phase==="victory"?"VICTORY":"DEFEAT"}
        </div>
      </div>

      {/* Hint */}
      <div style={{ fontSize:"0.6rem", color:"var(--muted)", marginBottom:"0.4rem" }}>
        {phase === "prep"
          ? (selHero ? `${selHero.emoji} ${selHero.name} · tap to position before battle` : "Tap a hero to select and position them")
          : selHero ? `${selHero.emoji} ${selHero.name} · tap to move · tap enemy to attack` : "Tap a hero to select"}
      </div>

      {/* Battlefield */}
      <div
        onPointerDown={handleTap}
        style={{
        position:"relative", width:"100%", maxWidth:BF_W, height:BF_H,
        background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        borderRadius:12, border:"1px solid rgba(255,255,255,0.1)",
        overflow:"hidden", cursor:"crosshair", marginBottom:"0.55rem",
        boxShadow:"inset 0 2px 20px rgba(0,0,0,0.5)",
        userSelect:"none", touchAction:"none",
      }}>
        {/* Grid texture */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.018) 39px,rgba(255,255,255,0.018) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.018) 39px,rgba(255,255,255,0.018) 40px)" }} />
        {/* Centre divider */}
        <div style={{ position:"absolute", left:BF_W/2-1, top:"8%", bottom:"8%", width:1, pointerEvents:"none",
          background:"linear-gradient(to bottom,transparent,rgba(255,255,255,0.07),transparent)" }} />
        {/* Floats */}
        <FloatingText items={floats} />
        {/* Units */}
        {enemies.map(e => (
          <UnitCircle key={e.id} unit={e} selected={false} onClick={() => {}} />
        ))}
        {heroes.map(h => (
          <UnitCircle key={h.id} unit={h} selected={selected===h.id} onClick={() => {}} />
        ))}
        {/* Victory/Defeat overlay */}
        {phase !== "fighting" && phase !== "prep" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(0,0,0,0.6)", flexDirection:"column", gap:"0.5rem" }}>
            <div style={{ fontSize:"2.5rem" }}>{phase==="victory"?"🏆":"💀"}</div>
            <div style={{ fontSize:"1rem", fontWeight:800, color:phase==="victory"?"#fbbf24":"#ef4444" }}>
              {phase==="victory"?"Victory!":"Defeated"}
            </div>
          </div>
        )}
        {/* Prep countdown overlay */}
        {phase === "prep" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(0,0,0,0.45)", flexDirection:"column", gap:"0.35rem", pointerEvents:"none" }}>
            <div style={{ fontSize:"0.65rem", fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
              Battle starts in
            </div>
            <div style={{
              fontSize:"3.5rem", fontWeight:900, lineHeight:1,
              color: countdown <= 2 ? "#ef4444" : countdown <= 3 ? "#fbbf24" : "#4ade80",
              textShadow:`0 0 30px ${countdown <= 2 ? "#ef4444" : countdown <= 3 ? "#fbbf24" : "#4ade80"}`,
              animation:"ringPulse 0.9s ease-in-out infinite",
            }}>
              {countdown}
            </div>
            <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.45)" }}>
              Position your heroes
            </div>
          </div>
        )}
      </div>

      {/* Ability bar */}
      <div style={{ display:"flex", gap:6, marginBottom:"0.5rem" }}>
        {heroes.map(h => (
          <AbilityButton key={h.id} hero={h} isSelected={selected===h.id} onUse={useAbility} />
        ))}
      </div>

      {/* Log */}
      <div style={{ height:52, overflowY:"auto", background:"rgba(0,0,0,0.25)", borderRadius:8,
        padding:"0.28rem 0.5rem", fontSize:"0.62rem", color:"var(--muted)", fontFamily:"monospace",
        border:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", gap:1 }}>
        {log.map(e => <div key={e.id} style={{ color:e.color }}>{e.text}</div>)}
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop:"0.5rem", padding:"0.7rem", borderRadius:12, textAlign:"center",
          background:result.victory?"rgba(74,222,128,0.08)":"rgba(239,68,68,0.08)",
          border:`1px solid ${result.victory?"rgba(74,222,128,0.3)":"rgba(239,68,68,0.3)"}` }}>
          {result.victory && Object.entries(result.loot??{}).map(([k,v]) => (
            <div key={k} style={{ fontSize:"0.75rem", color:"var(--text)" }}>🎒 +{v} {k.replace(/_/g," ")}</div>
          ))}
          {result.victory && <div style={{ fontSize:"0.7rem", color:"#a78bfa", marginTop:"0.2rem" }}>✨ +{result.xp} XP</div>}
          <button onClick={() => onCombatEnd(result)} style={{
            marginTop:"0.5rem", padding:"0.45rem 1.5rem", borderRadius:8, fontWeight:700, fontSize:"0.78rem",
            background:result.victory?"rgba(74,222,128,0.2)":"rgba(239,68,68,0.12)",
            border:`1px solid ${result.victory?"rgba(74,222,128,0.5)":"rgba(239,68,68,0.4)"}`,
            color:result.victory?"#4ade80":"#ef4444", cursor:"pointer",
          }}>
            {result.victory?"Continue →":"Retreat"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EXPLORE MODE ─────────────────────────────────────────────────────────────

function ExploreMode({ game, cells, setCells, pos, setPos, depth, onEnterCombat, onCollectTreasure, onRest, onRetreat, onExit, lootTotal }) {
  const CELL = 40;
  function getCell(x,y) { return cells.find(c=>c.x===x&&c.y===y)??null; }
  function adj() {
    return [[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy])=>getCell(pos.x+dx,pos.y+dy)).filter(Boolean);
  }
  function moveToCell(x,y) {
    const target = getCell(x,y); if (!target) return;
    setCells(prev=>prev.map(c=>c.x===x&&c.y===y?{...c,visited:true}:c));
    setPos({x,y});
    if (!target.cleared) {
      if (target.type==="enemy")    onEnterCombat(x,y);
      if (target.type==="treasure") onCollectTreasure(x,y);
      if (target.type==="rest")     onRest(x,y);
      if (target.type==="exit")     onExit();
    }
  }
  const adjacent = adj();
  const roomColor = { start:"#4ade8020",empty:"#ffffff08",enemy:"#ef444420",treasure:"#fbbf2420",rest:"#4ade8015",exit:"#a78bfa25" };
  const roomEmoji = { start:"🏠",empty:"",enemy:"👹",treasure:"💰",rest:"🏕️",exit:"🚪" };
  const heroes = (game?.adventurers??[]).filter(a=>(a.hp??a.maxHp??40)>0).slice(0,4);

  return (
    <div style={{ padding:"0.65rem" }}>
      <div style={{ display:"flex", gap:6, marginBottom:"0.6rem" }}>
        {[
          { label:"Explored", value:`${cells.filter(c=>c.visited).length}/${cells.length}`, color:"#a78bfa" },
          { label:"Enemies",  value:cells.filter(c=>c.type==="enemy"&&!c.cleared).length, color:"#f87171" },
          { label:"Depth",    value:depth, color:"#fbbf24" },
        ].map(s=>(
          <div key={s.label} style={{ flex:1,textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"0.3rem" }}>
            <div style={{ fontSize:"0.85rem",fontWeight:700,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:"0.55rem",color:"var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${MAP_W},${CELL}px)`, gap:3,
        justifyContent:"center", background:"#0d0d12", borderRadius:12, padding:"0.45rem",
        border:"1px solid rgba(255,255,255,0.08)", marginBottom:"0.6rem" }}>
        {cells.map(cell=>{
          const isParty=cell.x===pos.x&&cell.y===pos.y;
          const isAdj=adjacent.some(a=>a.x===cell.x&&a.y===cell.y);
          const visible=cell.visited||isAdj;
          const canMove=isAdj&&!isParty;
          return (
            <div key={`${cell.x},${cell.y}`} onClick={()=>canMove&&moveToCell(cell.x,cell.y)} style={{
              width:CELL,height:CELL,borderRadius:7,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:isParty?"1.2rem":"0.95rem",
              background:!visible?"rgba(0,0,0,0.7)":isParty?"rgba(99,102,241,0.28)":roomColor[cell.type]??"#ffffff08",
              border:isParty?"2px solid rgba(99,102,241,0.75)":canMove?"1px solid rgba(255,255,255,0.3)":cell.visited?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(255,255,255,0.03)",
              cursor:canMove?"pointer":"default", opacity:!visible?0.2:1, transition:"all 0.12s",
            }}>
              {isParty?"🧭":!visible?null:cell.visited?(cell.cleared&&cell.type!=="start"?<span style={{fontSize:"0.65rem",color:"#4ade80"}}>✓</span>:roomEmoji[cell.type]):<span style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.25)"}}>?</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:"0.5rem" }}>
        {[["🧭","Party"],["👹","Enemy"],["💰","Treasure"],["🏕️","Rest"],["🚪","Exit"]].map(([e,l])=>(
          <span key={l} style={{fontSize:"0.6rem",color:"var(--muted)",display:"flex",gap:3,alignItems:"center"}}><span>{e}</span>{l}</span>
        ))}
      </div>
      <div style={{ display:"flex",gap:4,marginBottom:"0.5rem" }}>
        {heroes.map(h=>{
          const cls=DUNGEON_CLASS[h.heroClass??h.class??"fighter"]??DUNGEON_CLASS.fighter;
          return (
            <div key={h.id} style={{flex:1,background:"rgba(255,255,255,0.04)",borderRadius:7,padding:"0.3rem 0.35rem",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{fontSize:"0.8rem",textAlign:"center"}}>{cls.emoji}</div>
              <HpBar hp={h.hp??h.maxHp} maxHp={h.maxHp} />
              <div style={{fontSize:"0.52rem",color:"var(--muted)",textAlign:"center",marginTop:2}}>{Math.floor(h.hp??h.maxHp)}/{h.maxHp}</div>
            </div>
          );
        })}
      </div>
      {Object.keys(lootTotal).length>0&&(
        <div style={{marginBottom:"0.5rem",padding:"0.4rem 0.6rem",borderRadius:8,background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.18)",fontSize:"0.65rem",color:"#4ade80"}}>
          🎒 {Object.entries(lootTotal).map(([k,v])=>`${v} ${k.replace(/_/g," ")}`).join(" · ")}
        </div>
      )}
      <button onClick={onRetreat} style={{width:"100%",padding:"0.45rem",borderRadius:8,fontSize:"0.72rem",fontWeight:600,
        background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.28)",color:"#f87171",cursor:"pointer"}}>
        🏳️ Retreat and keep loot
      </button>
    </div>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function Lobby({ game, lastRun, onStart }) {
  const adventurers = (game?.adventurers??[]).filter(a=>(a.hp??a.maxHp??40)>0);
  return (
    <div style={{ padding:"1rem" }}>
      <div style={{ marginBottom:"0.85rem" }}>
        <h3 style={{fontSize:"1rem",fontWeight:700,marginBottom:"0.15rem"}}>⚔️ Dungeon</h3>
        <p style={{fontSize:"0.72rem",color:"var(--muted)"}}>Real-time battle. Tap a hero to select, tap to move, tap an enemy to attack. Use abilities to turn the tide.</p>
      </div>
      {lastRun&&(
        <div style={{marginBottom:"0.75rem",padding:"0.6rem 0.75rem",borderRadius:10,
          background:lastRun.victory?"rgba(74,222,128,0.08)":"rgba(239,68,68,0.07)",
          border:`1px solid ${lastRun.victory?"rgba(74,222,128,0.25)":"rgba(239,68,68,0.2)"}`}}>
          <div style={{fontSize:"0.7rem",fontWeight:700,color:lastRun.victory?"#4ade80":"#f87171",marginBottom:"0.25rem"}}>
            {lastRun.victory?"✅ Last run: Victory":"💀 Last run: Defeated"}
          </div>
          {Object.entries(lastRun.loot??{}).map(([k,v])=>(
            <div key={k} style={{fontSize:"0.68rem",color:"var(--text)"}}>+{v} {k.replace(/_/g," ")}</div>
          ))}
        </div>
      )}
      <div style={{marginBottom:"0.85rem"}}>
        <div style={{fontSize:"0.68rem",color:"var(--muted)",marginBottom:"0.4rem",fontWeight:600}}>YOUR PARTY</div>
        {adventurers.length===0?(
          <div style={{fontSize:"0.72rem",color:"var(--muted)",padding:"0.6rem",background:"rgba(255,255,255,0.03)",borderRadius:8}}>No available heroes. Hire heroes in the Heroes tab.</div>
        ):(
          <div style={{display:"flex",gap:6}}>
            {adventurers.slice(0,4).map(adv=>{
              const cls=DUNGEON_CLASS[adv.heroClass??adv.class??"fighter"]??DUNGEON_CLASS.fighter;
              return (
                <div key={adv.id} style={{flex:1,padding:"0.45rem 0.35rem",borderRadius:9,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",textAlign:"center"}}>
                  <div style={{fontSize:"1.1rem"}}>{cls.emoji}</div>
                  <div style={{fontSize:"0.6rem",fontWeight:700,color:cls.color,marginTop:2}}>{cls.label}</div>
                  <div style={{fontSize:"0.55rem",color:"var(--muted)"}}>Lv{adv.level}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{marginBottom:"0.85rem",padding:"0.55rem 0.7rem",borderRadius:9,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{fontSize:"0.65rem",color:"var(--muted)",fontWeight:600,marginBottom:"0.35rem"}}>ABILITIES</div>
        {[DUNGEON_CLASS.fighter,DUNGEON_CLASS.mage,DUNGEON_CLASS.scavenger].map(cls=>(
          <div key={cls.label} style={{display:"flex",gap:6,fontSize:"0.63rem",alignItems:"flex-start",marginBottom:5}}>
            <span style={{fontSize:"0.9rem",minWidth:20}}>{cls.ability.emoji}</span>
            <div>
              <span style={{color:cls.color,fontWeight:700}}>{cls.label} — {cls.ability.name}:</span>
              <span style={{color:"var(--muted)",marginLeft:4}}>{cls.ability.desc}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onStart} disabled={!adventurers.length} style={{
        width:"100%",padding:"0.75rem",borderRadius:10,fontWeight:700,fontSize:"0.88rem",
        background:adventurers.length?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",
        border:`2px solid ${adventurers.length?"rgba(99,102,241,0.55)":"rgba(255,255,255,0.08)"}`,
        color:adventurers.length?"#a5b4fc":"var(--muted)",
        cursor:adventurers.length?"pointer":"default",
      }}>⚔️ Enter Dungeon</button>
      <p style={{fontSize:"0.58rem",color:"var(--muted)",textAlign:"center",marginTop:"0.5rem",opacity:0.6}}>⚠️ Prototype — loot not yet delivered to game state</p>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function DungeonZone({ game }) {
  const [mode, setMode] = useState("lobby");
  const [cells, setCells] = useState([]);
  const [pos, setPos] = useState({ x:3, y:3 });
  const [depth, setDepth] = useState(1);
  const [combatEnemies, setCombatEnemies] = useState([]);
  const [combatPos, setCombatPos] = useState(null);
  const [lootTotal, setLootTotal] = useState({});
  const [lastRun, setLastRun] = useState(null);

  function startRun() {
    setCells(generateMap());
    setPos({ x:3, y:3 });
    setLootTotal({});
    setMode("explore");
  }

  function enterCombat(x,y) {
    setCombatPos({ x, y });
    const pool = ENEMY_POOL[Math.min(depth-1, ENEMY_POOL.length-1)];
    const count = clamp(1 + Math.floor(depth*0.7), 1, 4);
    setCombatEnemies(Array.from({length:count}, (_,i) => makeEnemy(pool[Math.floor(Math.random()*pool.length)], i, depth)));
    setMode("combat");
  }

  function onCombatEnd(result) {
    if (result.victory) {
      setLootTotal(prev => {
        const next={...prev};
        Object.entries(result.loot??{}).forEach(([k,v])=>{ next[k]=(next[k]??0)+v; });
        return next;
      });
      if (combatPos) setCells(prev=>prev.map(c=>c.x===combatPos.x&&c.y===combatPos.y?{...c,cleared:true}:c));
      setCombatPos(null);
      setMode("explore");
    } else {
      endRun(false);
    }
  }

  function collectTreasure(x,y) {
    const amt = randInt(3,8) + depth*2;
    setLootTotal(prev=>({...prev,iron_ore:(prev.iron_ore??0)+amt}));
    setCells(prev=>prev.map(c=>c.x===x&&c.y===y?{...c,cleared:true}:c));
  }

  function endRun(victory) {
    setLastRun({ victory, loot:lootTotal });
    setMode("lobby");
  }

  if (mode==="lobby") return <Lobby game={game} lastRun={lastRun} onStart={startRun} />;
  if (mode==="explore") return (
    <ExploreMode game={game} cells={cells} setCells={setCells} pos={pos} setPos={setPos}
      depth={depth} onEnterCombat={enterCombat} onCollectTreasure={collectTreasure}
      onRest={(x,y)=>setCells(prev=>prev.map(c=>c.x===x&&c.y===y?{...c,cleared:true}:c))}
      onRetreat={()=>endRun(false)}
      onExit={()=>{ setDepth(d=>d+1); endRun(true); }}
      lootTotal={lootTotal} />
  );
  if (mode==="combat") return (
    <Battlefield game={game} enemies={combatEnemies} onCombatEnd={onCombatEnd} />
  );
  return null;
}