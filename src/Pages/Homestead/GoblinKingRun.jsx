// src/Pages/Homestead/GoblinKingRun.jsx
//
// Turn-based boss battle: the Goblin King's Throne Room.
// No canvas, no game loop. Pure React state machine.
//
// Phases:
//   1 — HP 100–60%  → basic attacks, taunts
//   2 — HP 60–30%   → summons 2 goblin guards; guards must die before king takes damage
//   3 — HP 30–0%    → enrage, double attack, can steal hotbar item
//
// Props mirror every other run (equipment, hotbar, playerInventory, etc.)
// Calls onRunComplete({ loot, kills }) on victory or defeat.

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ITEMS, ITEM_ICONS,
  getEquipStats,
  addToPlayerInventory, spendFromPlayerInventory,
} from "./Items";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOSS_MAX_HP = 60;
const GUARD_MAX_HP = 10;

const PLAYER_BASE_HP = 10;

// Dialogue per phase (king talks trash)
const PHASE_LINES = {
  1: [
    "\"You DARE enter my throne room?!\"",
    "\"My goblins will feast on your boots!\"",
    "\"I've squashed adventurers tougher than you.\"",
    "\"Do you even own a real sword?\"",
    "\"I'll hang your portrait in the dungeon. Upside down.\"",
  ],
  2: [
    "\"Enough games! GUARDS!\"",
    "\"You'll have to get through them first, fool!\"",
    "\"I don't fight peasants directly. That's what guards are for.\"",
    "\"Kill them! Kill them now! I'll give you extra gruel!\"",
  ],
  3: [
    "\"FINE. You want ME?! COME GET ME!\"",
    "\"No one has ever made me this angry. NO ONE!\"",
    "\"I'll tear this crown off your cold dead hands!\"",
    "\"RAAAAGH — you'll regret this!\"",
  ],
};

const VICTORY_LINES = [
  "\"I... yield. This is... undignified.\"",
  "\"Take the crown! TAKE IT! Just stop hitting me!\"",
  "\"You fight like a very angry farmer. I respect that.\"",
];

const FLEE_FAIL_LINES = [
  "\"Ha! Did you really think you could outrun my guards?!\"",
  "\"Running away? In MY throne room? Bold strategy.\"",
  "\"Nice try, coward. Back to fighting!\"",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rollD(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPhase(hpPct) {
  if (hpPct > 0.60) return 1;
  if (hpPct > 0.30) return 2;
  return 3;
}

function randomLine(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Items that can be used in battle (have useEffect.heal or strengthDuration) */
function getBattleUsableItems(hotbar, playerInventory) {
  const items = playerInventory?.items ?? {};
  const usable = [];
  (hotbar ?? []).forEach((slot) => {
    if (!slot?.item) return;
    const def = ITEMS[slot.item];
    if (!def?.useEffect) return;
    const qty = items[slot.item] ?? 0;
    if (qty <= 0) return;
    usable.push({ id: slot.item, label: def.label, icon: def.icon, heal: def.useEffect.heal ?? 0, strengthDuration: def.useEffect.strengthDuration ?? 0, qty });
  });
  return usable;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoblinKingRun({
  onRunComplete,
  equipment,
  hotbar,
  playerInventory,
  onPlayerInventoryUpdate,
}) {
  const equipStats = getEquipStats(equipment ?? {});
  const playerMaxHp = PLAYER_BASE_HP + (equipStats.maxHpBonus ?? 0);

  // ── Battle state ────────────────────────────────────────────────────────────
  const [bossHp,    setBossHp]    = useState(BOSS_MAX_HP);
  const [guards,    setGuards]    = useState([]); // [{ id, hp, maxHp }]
  const [playerHp,  setPlayerHp]  = useState(playerMaxHp);
  const [log,       setLog]       = useState([
    { text: "You descend into the Throne Room. A massive goblin sits atop a pile of stolen loot.", type: "story" },
    { text: "The Goblin King locks eyes with you.", type: "story" },
    { text: "\"You DARE enter my throne room?!\"", type: "boss" },
    { text: "Your turn — choose your action.", type: "system" },
  ]);
  const [phase,        setPhase]        = useState(1);
  const [guardsSummoned, setGuardsSummoned] = useState(false);
  const [turn,         setTurn]         = useState("player"); // "player" | "boss" | "victory" | "defeat"
  const [kills,        setKills]        = useState(0);
  const [strengthTurns, setStrengthTurns] = useState(0);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [invRef,       setInvRef]       = useState(playerInventory);
  const [pendingAction, setPendingAction] = useState(null); // resolves after brief animation delay
  const [isAnimating,   setIsAnimating]  = useState(false);
  const [lootAwarded,   setLootAwarded]  = useState(false);

  // Keep a live ref to inventory so async closures see latest
  const invLive = useRef(playerInventory);
  useEffect(() => { invLive.current = invRef; }, [invRef]);

  // Push an entry to the battle log
  const pushLog = useCallback((text, type = "normal") => {
    setLog(prev => [...prev.slice(-40), { text, type, id: Date.now() + Math.random() }]);
  }, []);

  // ── Phase transitions ───────────────────────────────────────────────────────
  useEffect(() => {
    const pct = bossHp / BOSS_MAX_HP;
    const newPhase = getPhase(pct);
    if (newPhase !== phase) {
      setPhase(newPhase);
      if (newPhase === 2 && !guardsSummoned) {
        setGuardsSummoned(true);
        setGuards([
          { id: "guard_a", hp: GUARD_MAX_HP, maxHp: GUARD_MAX_HP, name: "Goblin Guard α" },
          { id: "guard_b", hp: GUARD_MAX_HP, maxHp: GUARD_MAX_HP, name: "Goblin Guard β" },
        ]);
        pushLog("── PHASE 2 ──", "phase");
        pushLog(randomLine(PHASE_LINES[2]), "boss");
        pushLog("Two goblin guards leap from the shadows! Defeat them before you can reach the king.", "story");
      }
      if (newPhase === 3) {
        pushLog("── PHASE 3: ENRAGE ──", "phase");
        pushLog(randomLine(PHASE_LINES[3]), "boss");
        pushLog("The Goblin King is desperate — he's attacking twice per turn now!", "story");
      }
    }
  }, [bossHp, phase, guardsSummoned, pushLog]);

  // ── Victory check ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (bossHp <= 0 && turn !== "victory" && turn !== "defeat" && !lootAwarded) {
      setLootAwarded(true);
      setTurn("victory");
      pushLog(randomLine(VICTORY_LINES), "boss");
      pushLog("The Goblin King collapses! His crown tumbles to the floor.", "story");
      pushLog("Victory! Collect your spoils.", "system");
    }
  }, [bossHp, turn, lootAwarded, pushLog]);

  // ── Player defeat ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (playerHp <= 0 && turn !== "defeat" && turn !== "victory") {
      setTurn("defeat");
      pushLog("You have been defeated by the Goblin King.", "damage");
      pushLog("\"Ha! Next time, bring more friends. And better armor.\"", "boss");
    }
  }, [playerHp, turn, pushLog]);

  // ─── Boss turn logic ────────────────────────────────────────────────────────
  const doBossTurn = useCallback((defendBonus = 0) => {
    const pct = bossHp / BOSS_MAX_HP;
    const currentPhase = getPhase(pct);
    const defense = (equipStats.defense ?? 0) + defendBonus;

    const doOneAttack = (prevHp) => {
      // Phase 3: occasionally steal a hotbar item
      if (currentPhase === 3 && Math.random() < 0.25) {
        const usable = getBattleUsableItems(hotbar, invLive.current);
        if (usable.length > 0) {
          const stolen = usable[Math.floor(Math.random() * usable.length)];
          const newInv = spendFromPlayerInventory(invLive.current, { [stolen.id]: 1 });
          if (newInv) {
            setInvRef(newInv);
            onPlayerInventoryUpdate?.(newInv);
            pushLog(`The Goblin King snatches your ${stolen.icon} ${stolen.label}!`, "damage");
            return prevHp; // steal instead of damage
          }
        }
      }
      const baseDmg = currentPhase === 1 ? rollD(1, 3) : currentPhase === 2 ? rollD(2, 4) : rollD(3, 6);
      const dmg = Math.max(0, baseDmg - defense);
      if (dmg === 0) {
        pushLog(`The Goblin King swings but your defense absorbs all of it!`, "heal");
      } else {
        pushLog(`The Goblin King hits you for ${dmg} damage! (${baseDmg} - ${defense} defense)`, "damage");
      }
      return Math.max(0, prevHp - dmg);
    };

    setPlayerHp(prev => {
      let hp = doOneAttack(prev);
      if (currentPhase === 3) {
        // Double attack in phase 3
        pushLog("ENRAGE — the king attacks again!", "phase");
        hp = doOneAttack(hp);
      }
      // Occasional trash talk
      if (Math.random() < 0.4) pushLog(randomLine(PHASE_LINES[currentPhase] ?? PHASE_LINES[1]), "boss");
      return hp;
    });

    setStrengthTurns(prev => Math.max(0, prev - 1));
    setTurn("player");
  }, [bossHp, equipStats, hotbar, onPlayerInventoryUpdate, pushLog]);

  // ─── Resolve a player action ────────────────────────────────────────────────
  const resolveAction = useCallback((action) => {
    if (turn !== "player" || isAnimating) return;
    setIsAnimating(true);
    setShowItemPicker(false);

    setTimeout(() => {
      let defendBonus = 0;

      if (action.type === "attack") {
        const atk = (equipStats.attackBonus ?? 0) + (strengthTurns > 0 ? 3 : 0);
        const roll = rollD(1, 6);
        const dmg = atk + roll;
        const aliveGuards = guards.filter(g => g.hp > 0);

        if (aliveGuards.length > 0) {
          // Must kill guards first
          const target = aliveGuards[0];
          const newHp = Math.max(0, target.hp - dmg);
          pushLog(`You attack ${target.name} for ${dmg} damage! (${atk} atk + ${roll} roll)${newHp <= 0 ? " — guard down!" : ""}`, "normal");
          setGuards(prev => prev.map(g =>
            g.id === target.id ? { ...g, hp: newHp } : g
          ));
          if (newHp <= 0) {
            pushLog(`${target.name} is defeated!`, "heal");
            setKills(k => k + 1);
          }
        } else {
          pushLog(`You strike the Goblin King for ${dmg} damage! (${atk} atk + ${roll} roll)`, "normal");
          setBossHp(prev => Math.max(0, prev - dmg));
        }
      }

      else if (action.type === "use_item") {
        const def = ITEMS[action.itemId];
        const heal = (def?.useEffect?.heal ?? 0) + (equipStats.herbBonus ?? 0 ? 1 : 0);
        const strength = def?.useEffect?.strengthDuration ?? 0;
        const newInv = spendFromPlayerInventory(invLive.current, { [action.itemId]: 1 });
        if (!newInv) {
          pushLog("You fumble for the item — it's gone!", "damage");
        } else {
          setInvRef(newInv);
          onPlayerInventoryUpdate?.(newInv);
          if (heal > 0) {
            setPlayerHp(prev => Math.min(playerMaxHp, prev + heal));
            pushLog(`You use ${def.icon} ${def.label} and recover ${heal} HP!`, "heal");
          }
          if (strength > 0) {
            setStrengthTurns(strength);
            pushLog(`You feel a surge of strength! +3 attack for ${strength} turns.`, "heal");
          }
        }
      }

      else if (action.type === "defend") {
        defendBonus = 3;
        pushLog("You raise your guard! Incoming damage reduced by 3 this turn.", "heal");
        // Counter-attack: if you defended successfully, chance to counter
        const counterRoll = Math.random();
        if (counterRoll < 0.35) {
          const counterDmg = rollD(1, 4) + Math.floor((equipStats.attackBonus ?? 0) / 2);
          const aliveGuards = guards.filter(g => g.hp > 0);
          if (aliveGuards.length === 0) {
            pushLog(`Counter-attack! You deal ${counterDmg} bonus damage to the king!`, "normal");
            setBossHp(prev => Math.max(0, prev - counterDmg));
          } else {
            pushLog(`Counter-attack! You deal ${counterDmg} damage to a guard!`, "normal");
            const g = aliveGuards[0];
            setGuards(prev => prev.map(gg => gg.id === g.id ? { ...gg, hp: Math.max(0, gg.hp - counterDmg) } : gg));
          }
        }
      }

      else if (action.type === "flee") {
        const success = Math.random() < 0.5;
        if (success) {
          pushLog("You sprint for the exit and make it out! No loot, but alive.", "heal");
          setTurn("defeat"); // treated as retreat — same flow, different UI
          setIsAnimating(false);
          // Call onRunComplete with empty loot immediately
          setTimeout(() => {
            onRunComplete?.({ loot: {}, kills: 0 });
          }, 1800);
          return;
        } else {
          pushLog(randomLine(FLEE_FAIL_LINES), "boss");
          pushLog("You failed to escape! The king gets a free hit.", "damage");
          // king gets free hit, no defend bonus
          doBossTurn(0);
          setIsAnimating(false);
          return;
        }
      }

      // Boss takes their turn after player acts (unless victory/defeat already triggered)
      setTurn(prev => {
        if (prev === "victory" || prev === "defeat") return prev;
        return "boss_pending";
      });
      setIsAnimating(false);

      // Slight delay so log reads naturally
      setTimeout(() => {
        setTurn(prev => {
          if (prev === "boss_pending") {
            doBossTurn(defendBonus);
            return "player";
          }
          return prev;
        });
      }, 600);

    }, 350);
  }, [turn, isAnimating, equipStats, strengthTurns, guards, invLive, onPlayerInventoryUpdate, playerMaxHp, doBossTurn, pushLog, onRunComplete]);

  // ─── Compute loot on victory ────────────────────────────────────────────────
  function computeLoot() {
    const guardsKilled = guards.filter(g => g.hp <= 0).length;
    return {
      goblin_crown: 1,
      gems: rollD(3, 8),
      iron_ingot: guardsKilled > 0 ? rollD(2, 5) : rollD(1, 2),
      gold: rollD(50, 120),
      leather: rollD(1, 3),
    };
  }

  function handleVictoryCollect() {
    const loot = computeLoot();
    onRunComplete?.({ loot, kills: kills + 1 });
  }

  // ─── Derived UI values ──────────────────────────────────────────────────────
  const bossHpPct  = Math.max(0, bossHp / BOSS_MAX_HP);
  const playerHpPct = Math.max(0, playerHp / playerMaxHp);
  const aliveGuards = guards.filter(g => g.hp > 0);
  const usableItems = getBattleUsableItems(hotbar, invRef ?? playerInventory);

  const bossHpColor = bossHpPct > 0.5 ? "#e05050" : bossHpPct > 0.25 ? "#e08030" : "#e0c030";
  const playerHpColor = playerHpPct > 0.5 ? "#60d880" : playerHpPct > 0.25 ? "#e0c030" : "#e05050";

  // ─── Render ─────────────────────────────────────────────────────────────────

  const S = {
    root: {
      minHeight: "100svh", background: "#0d0808", color: "#f5e6c8",
      display: "flex", flexDirection: "column", fontFamily: "monospace",
      overflow: "hidden",
    },
    topBar: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px",
      borderBottom: "1px solid rgba(200,80,80,0.18)",
      background: "rgba(0,0,0,0.4)",
      flexShrink: 0,
    },
    label: { fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,200,200,0.35)", marginBottom: 4 },
    hpBar: (pct, color) => ({
      width: "100%", height: 8, borderRadius: 4,
      background: "rgba(255,255,255,0.08)",
      position: "relative", overflow: "hidden",
    }),
    hpFill: (pct, color) => ({
      position: "absolute", top: 0, left: 0, bottom: 0,
      width: `${pct * 100}%`, background: color,
      borderRadius: 4, transition: "width 0.4s ease",
    }),
    arena: {
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "16px", gap: 12, position: "relative",
    },
    bossCard: {
      width: "100%", maxWidth: 420,
      background: "rgba(180,40,40,0.08)",
      border: "1px solid rgba(180,40,40,0.25)",
      borderRadius: 14, padding: "16px 20px",
    },
    bossNameRow: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 10,
    },
    bossEmoji: { fontSize: 48, lineHeight: 1, filter: phase === 3 ? "drop-shadow(0 0 8px rgba(255,100,0,0.5))" : "none", transition: "filter 0.5s" },
    guardRow: { display: "flex", gap: 8, marginTop: 10 },
    guardCard: {
      flex: 1, background: "rgba(200,80,30,0.1)",
      border: "1px solid rgba(200,80,30,0.3)",
      borderRadius: 10, padding: "10px 12px",
    },
    logBox: {
      width: "100%", maxWidth: 420,
      height: 140, overflowY: "auto",
      background: "rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "10px 14px",
      display: "flex", flexDirection: "column", gap: 3,
      flexShrink: 0,
    },
    actions: {
      width: "100%", maxWidth: 420,
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gap: 8, flexShrink: 0,
    },
    btn: (color = "rgba(245,230,200,0.7)", bg = "rgba(255,255,255,0.04)", border = "rgba(255,255,255,0.12)") => ({
      padding: "12px 10px", borderRadius: 10, cursor: "pointer",
      background: bg, border: `1px solid ${border}`,
      color, fontFamily: "monospace", fontSize: 13,
      transition: "all 0.12s ease",
    }),
  };

  const logColor = { normal: "rgba(245,230,200,0.8)", damage: "rgba(255,120,100,0.9)", heal: "rgba(100,220,140,0.9)", boss: "rgba(255,160,80,0.85)", system: "rgba(180,200,255,0.6)", story: "rgba(245,230,200,0.45)", phase: "rgba(255,200,60,0.9)" };

  // ─── Scroll log to bottom ───────────────────────────────────────────────────
  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // ─── Victory screen ─────────────────────────────────────────────────────────
  if (turn === "victory") {
    const loot = computeLoot();
    return (
      <main style={{ ...S.root, alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>👑</div>
          <h1 style={{ fontSize: 26, fontWeight: 400, color: "rgba(255,210,60,0.95)", letterSpacing: "0.06em", marginBottom: 6 }}>
            Victory!
          </h1>
          <p style={{ fontSize: 13, color: "rgba(245,230,200,0.5)", lineHeight: 1.7 }}>
            The Goblin King has been defeated.<br />
            {randomLine(VICTORY_LINES)}
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: 360, background: "rgba(255,210,60,0.05)", border: "1px solid rgba(255,210,60,0.2)", borderRadius: 14, padding: "18px 20px" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,210,60,0.4)", textTransform: "uppercase", marginBottom: 12 }}>spoils of battle</p>
          {Object.entries(loot).map(([id, qty]) => {
            const def = ITEMS[id];
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 14, color: "rgba(245,230,200,0.85)" }}>{def?.icon ?? "📦"} {def?.label ?? id}</span>
                <span style={{ fontSize: 13, color: "rgba(255,210,60,0.8)" }}>×{qty}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleVictoryCollect}
          style={{ ...S.btn("rgba(255,210,60,0.9)", "rgba(255,210,60,0.08)", "rgba(255,210,60,0.3)"), width: "100%", maxWidth: 360, padding: "15px" }}
        >
          collect loot & head home →
        </button>
      </main>
    );
  }

  // ─── Retreat screen ─────────────────────────────────────────────────────────
  if (turn === "defeat" && playerHp <= 0) {
    return (
      <main style={{ ...S.root, alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>💀</div>
          <h1 style={{ fontSize: 26, fontWeight: 400, color: "rgba(255,100,80,0.9)", letterSpacing: "0.06em", marginBottom: 6 }}>Defeated</h1>
          <p style={{ fontSize: 13, color: "rgba(245,230,200,0.5)", lineHeight: 1.7, maxWidth: 280 }}>
            The Goblin King laughs as you crumple to the floor.<br />You wake up outside with no loot.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,160,80,0.6)", marginTop: 12 }}>
            "Come back when you're actually prepared."
          </p>
        </div>
        <button
          onClick={() => onRunComplete?.({ loot: {}, kills })}
          style={{ ...S.btn("rgba(245,230,200,0.6)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.1)"), padding: "14px 28px" }}
        >
          ← limp home
        </button>
      </main>
    );
  }

  // ─── Main battle screen ─────────────────────────────────────────────────────
  return (
    <main style={S.root}>

      {/* Top: player HP */}
      <div style={S.topBar}>
        <div style={{ flex: 1, maxWidth: 200 }}>
          <div style={S.label}>your HP — {playerHp}/{playerMaxHp}</div>
          <div style={S.hpBar()}>
            <div style={S.hpFill(playerHpPct, playerHpColor)} />
          </div>
        </div>
        <div style={{ padding: "0 16px", fontSize: 11, color: "rgba(245,230,200,0.25)" }}>
          {phase === 1 ? "👑 throne room" : phase === 2 ? "🛡️ guards active" : "⚡ enrage"}
        </div>
        {strengthTurns > 0 && (
          <div style={{ fontSize: 11, color: "rgba(100,220,200,0.8)", padding: "4px 10px", border: "1px solid rgba(100,220,200,0.25)", borderRadius: 8 }}>
            ⚗️ +3 atk × {strengthTurns}
          </div>
        )}
      </div>

      {/* Arena */}
      <div style={S.arena}>

        {/* Boss card */}
        <div style={S.bossCard}>
          <div style={S.bossNameRow}>
            <div>
              <div style={{ fontSize: 15, color: "rgba(255,140,100,0.9)", marginBottom: 2 }}>
                👑 Goblin King
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,200,200,0.35)" }}>
                {bossHp}/{BOSS_MAX_HP} HP — Phase {phase}
              </div>
            </div>
            <div style={S.bossEmoji}>
              {phase === 1 ? "👺" : phase === 2 ? "😡" : "🤬"}
            </div>
          </div>
          <div style={S.hpBar()}>
            <div style={S.hpFill(bossHpPct, bossHpColor)} />
          </div>

          {/* Guards */}
          {guards.length > 0 && (
            <div style={S.guardRow}>
              {guards.map(g => (
                <div key={g.id} style={{ ...S.guardCard, opacity: g.hp <= 0 ? 0.3 : 1 }}>
                  <div style={{ fontSize: 11, color: g.hp <= 0 ? "rgba(255,255,255,0.3)" : "rgba(255,160,80,0.8)", marginBottom: 4 }}>
                    {g.hp <= 0 ? "💀" : "👺"} {g.name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(245,200,200,0.4)", marginBottom: 5 }}>
                    {g.hp}/{g.maxHp} HP
                  </div>
                  <div style={S.hpBar()}>
                    <div style={S.hpFill(g.hp / g.maxHp, "#e07030")} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Battle log */}
        <div ref={logRef} style={S.logBox}>
          {log.map((entry, i) => (
            <div key={entry.id ?? i} style={{ fontSize: 12, color: logColor[entry.type] ?? logColor.normal, lineHeight: 1.5 }}>
              {entry.text}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {turn === "player" && !showItemPicker && (
          <div style={S.actions}>
            <button
              style={S.btn("rgba(245,230,200,0.8)", "rgba(255,80,80,0.06)", "rgba(255,80,80,0.25)")}
              disabled={isAnimating}
              onClick={() => resolveAction({ type: "attack" })}
            >
              ⚔️ Attack
              <div style={{ fontSize: 10, color: "rgba(245,230,200,0.4)", marginTop: 3 }}>
                {(equipStats.attackBonus ?? 0) + (strengthTurns > 0 ? 3 : 0)} atk + d6
              </div>
            </button>

            <button
              style={S.btn("rgba(200,230,245,0.8)", "rgba(80,150,255,0.06)", "rgba(80,150,255,0.25)")}
              disabled={isAnimating}
              onClick={() => resolveAction({ type: "defend" })}
            >
              🛡️ Defend
              <div style={{ fontSize: 10, color: "rgba(200,230,245,0.4)", marginTop: 3 }}>
                -{(equipStats.defense ?? 0) + 3} dmg · chance to counter
              </div>
            </button>

            <button
              style={{
                ...S.btn(
                  usableItems.length > 0 ? "rgba(100,220,160,0.85)" : "rgba(255,255,255,0.2)",
                  "rgba(100,220,80,0.04)",
                  usableItems.length > 0 ? "rgba(100,220,80,0.3)" : "rgba(255,255,255,0.08)"
                ),
              }}
              disabled={isAnimating || usableItems.length === 0}
              onClick={() => setShowItemPicker(true)}
            >
              🧪 Use Item
              <div style={{ fontSize: 10, color: "rgba(100,220,160,0.4)", marginTop: 3 }}>
                {usableItems.length > 0 ? `${usableItems.length} available` : "hotbar empty"}
              </div>
            </button>

            <button
              style={S.btn("rgba(245,200,200,0.4)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0.08)")}
              disabled={isAnimating}
              onClick={() => resolveAction({ type: "flee" })}
            >
              🏃 Flee
              <div style={{ fontSize: 10, color: "rgba(245,200,200,0.3)", marginTop: 3 }}>
                50% chance · no loot
              </div>
            </button>
          </div>
        )}

        {/* Item picker overlay */}
        {turn === "player" && showItemPicker && (
          <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(245,230,200,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>choose item to use</div>
            {usableItems.map(it => (
              <button
                key={it.id}
                disabled={isAnimating}
                onClick={() => resolveAction({ type: "use_item", itemId: it.id })}
                style={S.btn("rgba(100,220,160,0.85)", "rgba(100,220,80,0.06)", "rgba(100,220,80,0.25)")}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{it.icon} {it.label}</span>
                  <span style={{ fontSize: 11, color: "rgba(245,230,200,0.4)" }}>
                    {it.heal > 0 ? `+${it.heal} HP` : ""}{it.strengthDuration > 0 ? ` +str×${it.strengthDuration}` : ""}  ×{it.qty}
                  </span>
                </span>
              </button>
            ))}
            <button
              onClick={() => setShowItemPicker(false)}
              style={S.btn("rgba(245,230,200,0.3)", "transparent", "rgba(255,255,255,0.07)")}
            >
              ← back
            </button>
          </div>
        )}

        {/* Boss turn indicator */}
        {(turn === "boss_pending" || isAnimating) && turn !== "player" && (
          <div style={{ fontSize: 13, color: "rgba(255,160,80,0.7)", letterSpacing: "0.1em" }}>
            The Goblin King is thinking…
          </div>
        )}
      </div>
    </main>
  );
}