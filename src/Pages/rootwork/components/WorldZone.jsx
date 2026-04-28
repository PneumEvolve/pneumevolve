// src/Pages/rootwork/components/WorldZone.jsx
import React, { useState, useEffect, useRef } from "react";
import { WORLD_ZONES, ADVENTURER_CLASSES, FORGE_RECIPES, ARTISAN_FOOD_HEAL, ARTISAN_FOOD_LIST, ADVENTURER_BUFF_ITEMS, ADVENTURER_BUFF_LIST, WORLD_RESOURCES, HERO_SKILLS, HERO_SKILL_TREES, HERO_CLASS_META, HERO_PRESTIGE_COST_BASE, HERO_DIP_TREE_PRESTIGE_TIER1, HERO_DIP_TREE_PRESTIGE_TIER2, BOSS_DEFS, BOSS_ABILITIES, BOSS_UNLOCK_LEVEL, BOSS_TICK_INTERVAL, generateInfiniteBoss } from "../gameConstants";
import { getAdventurerSlotCost, getAdventurerSlotUnlocked, setHeroFillFood } from "../gameEngine";

// ─── Constants ────────────────────────────────────────────────────────────────

// Items that should NEVER appear as adventurer gear (components, consumables, non-equip)
const EXCLUDED_GEAR_CATEGORIES = new Set(["consumable", "component"]);

// Slot → forge category mapping
const SLOT_CATEGORIES = {
  weapon: "weapon",
  armour: "armour",
  body: "body", // reserved for future items
};

// Slot display config
const SLOT_META = {
  weapon: { label: "Weapon", emoji: "⚔️" },
  armour: { label: "Armour", emoji: "🛡️" },
  body:   { label: "Body",   emoji: "👕" },
};

// Prestige skill config (values imported from gameConstants)
// HERO_PRESTIGE_SKILL_COST = 3, HERO_PRESTIGE_REVIVE_BASE = 100

// Adventurer name pool — cycle through, no repeats until exhausted
const ADVENTURER_NAME_POOL = [
  "Aldric", "Brynn", "Caelum", "Dara", "Eamon", "Fionn", "Gwyneth", "Hadley",
  "Isolde", "Jorvik", "Kira", "Lorne", "Maren", "Nesta", "Oryn", "Petra",
  "Quillan", "Rhea", "Soren", "Tilda", "Uric", "Vesper", "Wren", "Xander",
  "Ysolde", "Zephyr", "Aine", "Brennan", "Cass", "Dunstan",
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getAdventurerMaxHp(adventurer) {
  return 40 + ((adventurer.level ?? 1) - 1) * 8;
}

function getMissionDuration(adventurer, zone) {
  const base = zone.baseDuration ?? 30;
  const totalGear = getTotalGearTier(adventurer);
  const gearBonus = totalGear * 0.15;
  const lvlBonus = ((adventurer.level ?? 1) - 1) * 0.08;
  return Math.round(base * (1 - Math.min(gearBonus + lvlBonus, 0.75)));
}

function getFailChance(adventurer, zone) {
  const totalGear = getTotalGearTier(adventurer);
  const gearScore = totalGear + (adventurer.level ?? 1);
  const required = zone.gearRequired ?? 0;
  if (gearScore >= required + 2) return 0;
  if (gearScore >= required) return 5;
  if (gearScore >= required - 1) return 30;
  return 65;
}

function getXpNeeded(level) {
  return Math.floor(10 * Math.pow(1.4, level - 1));
}

function isZoneUnlocked(zone, adventurer, worldZoneClears) {
  // Hero-level gate (per-hero)
  const heroLevel = adventurer?.level ?? 1;
  if (zone.heroLevelRequired && heroLevel < zone.heroLevelRequired) return false;
  // Clears-based chain unlock (global)
  if (!zone.unlockRequiresZone) return true;
  return (worldZoneClears?.[zone.unlockRequiresZone] ?? 0) >= zone.unlockAfterClears;
}

// Returns sum of gear tiers across all 3 slots
function getTotalGearTier(adventurer) {
  const gear = adventurer.equippedGear ?? {};
  let total = 0;
  for (const slot of ["weapon", "armour", "body"]) {
    const key = gear[slot];
    if (key) {
      const recipe = FORGE_RECIPES[key];
      total += recipe?.gearTier ?? 0;
    }
  }
  // Legacy: also count old equippedItem if present
  if (adventurer.equippedItem && !gear.weapon && !gear.armour && !gear.body) {
    const recipe = FORGE_RECIPES[adventurer.equippedItem];
    total += recipe?.gearTier ?? 0;
  }
  return total;
}

// Returns equipped recipe for a given slot
function getEquippedRecipe(adventurer, slot) {
  const gear = adventurer.equippedGear ?? {};
  const key = gear[slot];
  return key ? (Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === key) ?? null) : null;
}

// Returns all equippable recipes for a slot (in stock, right category, not excluded)
const INSTANCED_ITEM_KEYS = new Set(["master_sword", "tower_shield", "plate_armor"]);

function getEquippableForSlot(slot, forgeGoods) {
  const cat = SLOT_CATEGORIES[slot];
  return Object.values(FORGE_RECIPES).filter(
    (r) =>
      !EXCLUDED_GEAR_CATEGORIES.has(r.category) &&
      !INSTANCED_ITEM_KEYS.has(r.output.resourceKey) &&
      r.category === cat &&
      ((forgeGoods ?? {})[r.output.resourceKey] ?? 0) > 0
  );
}

function getHeroPrestigeLevel(adventurer) {
  return adventurer.prestigeLevel ?? 0;
}

function getBeltCapacity(adventurer) {
  const gear = adventurer.equippedGear ?? {};
  let cap = 3;
  // Body armor adds food slots
  const bodyKey = gear.body;
  if (bodyKey) {
    const bodyRecipe = Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === bodyKey);
    cap += bodyRecipe?.foodSlotBonus ?? 0;
  }
  // Each prestige adds +1 food slot
  cap += getHeroPrestigeLevel(adventurer);
  // Food slot skills: Provisioner (fighter_t4b) / Abundance (mage_t4b) / Pack Rat (scavenger_t4b)
  const skillMap = (() => { const s = adventurer.skills ?? {}; return Array.isArray(s) ? Object.fromEntries(s.map((id) => [id, 1])) : s; })();
  cap += skillMap["fighter_t4b"] ?? 0;
  cap += skillMap["mage_t4b"] ?? 0;
  cap += skillMap["scavenger_t4b"] ?? 0;
  return cap;
}

function isDead(adventurer) {
  const hp = adventurer.hp ?? getAdventurerMaxHp(adventurer);
  return hp <= 0;
}

function getReviveCost(adventurer) {
  const prestige = Math.max(1, getHeroPrestigeLevel(adventurer));
  return 100 * prestige; // HERO_PRESTIGE_REVIVE_BASE × prestigeLevel
}

function getPrestigeCost(adventurer) {
  const nextLevel = getHeroPrestigeLevel(adventurer) + 1;
  return HERO_PRESTIGE_COST_BASE * nextLevel;
}

// Returns stat summary line for a gear recipe
function getGearStatLine(recipe) {
  if (!recipe) return null;
  const parts = [];
  if (recipe.missionTimeReduction) parts.push(`⏱ −${Math.round(recipe.missionTimeReduction * 100)}% mission time`);
  if (recipe.damageReduction)       parts.push(`🛡 −${Math.round(recipe.damageReduction * 100)}% damage`);
  if (recipe.foodSlotBonus)         parts.push(`🍞 +${recipe.foodSlotBonus} food slot${recipe.foodSlotBonus > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : null;
}

// Compute mission duration showing before/after for a hypothetical equip/unequip
function getMissionDurationWithSlot(adventurer, zone, slotOverride) {
  // slotOverride: { slot, key } — temporarily set that slot
  const base = zone.baseDuration ?? 30;
  const gear = { ...(adventurer.equippedGear ?? {}), ...(slotOverride ?? {}) };
  let totalGear = 0;
  for (const s of ["weapon", "armour", "body"]) {
    const key = gear[s];
    if (key) totalGear += FORGE_RECIPES[key]?.gearTier ?? 0;
  }
  const gearBonus = totalGear * 0.15;
  const lvlBonus = ((adventurer.level ?? 1) - 1) * 0.08;
  return Math.round(base * (1 - Math.min(gearBonus + lvlBonus, 0.75)));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, height = 6 }) {
  const pct = Math.max(0, Math.min(100, ((hp ?? maxHp) / maxHp) * 100));
  const color = pct > 60 ? "#4ade80" : pct > 30 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ height, background: "rgba(255,255,255,0.08)", borderRadius: height / 2, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: height / 2, transition: "width 0.4s" }} />
    </div>
  );
}

// ─── Loot Modal ────────────────────────────────────────────────────────────────
function LootModal({ result, onDismiss }) {
  if (!result) return null;
  const hpLost = result.hpLost ?? 0;
  const hpRemaining = result.hpRemaining ?? result.maxHp ?? 40;
  const maxHp = result.maxHp ?? 40;
  const isAutoBattle = result.autoBattle;
  const ranOutOfFood = result.ranOutOfFood;
  const stoppedByPlayer = result.stoppedByPlayer;
  const diedDuringAuto = result.diedDuringAuto;
  const diedOnNormal = result.died && !isAutoBattle; // died on a normal non-auto run
  const successfulRuns = result.successfulRuns ?? 0;

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-elev)",
        border: `1px solid ${result.failed ? "rgba(239,68,68,0.4)" : result.zoneCleared ? "rgba(251,191,36,0.4)" : "rgba(74,222,128,0.3)"}`,
        borderRadius: "18px", padding: "1.5rem", maxWidth: "320px", width: "100%",
        boxShadow: result.zoneCleared ? "0 0 40px rgba(251,191,36,0.2)" : "none",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.4rem" }}>
            {diedDuringAuto ? "💀" : diedOnNormal ? "💀" : ranOutOfFood ? "🍞" : stoppedByPlayer ? "🏳️" : result.failed ? "❌" : result.zoneCleared ? "🏆" : isAutoBattle ? "⚔️" : "🎒"}
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
            {diedDuringAuto ? "Fell in Battle" : diedOnNormal ? "Hero Fallen" : ranOutOfFood ? "Out of Food!" : stoppedByPlayer ? "Battle Recalled" : result.failed ? "Mission Failed" : result.zoneCleared ? "Zone Cleared!" : isAutoBattle ? "Auto Battle Done" : "Mission Complete"}
          </div>
          {diedOnNormal && (
            <div style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "0.3rem", fontWeight: 600 }}>
              No rewards. Revive your hero to continue.
            </div>
          )}
          {isAutoBattle && (
            <div style={{ fontSize: "0.72rem", color: "#a78bfa", marginTop: "0.2rem", fontWeight: 600 }}>
              {ranOutOfFood
  ? stoppedByPlayer
    ? `Recalled after ${successfulRuns} run${successfulRuns !== 1 ? "s" : ""}`
    : `Ran out of food · ${successfulRuns} successful run${successfulRuns !== 1 ? "s" : ""}`
                : diedDuringAuto
                ? `Fell on run ${successfulRuns + 1} · ${successfulRuns} run${successfulRuns !== 1 ? "s" : ""} counted · 50% loot`
                : `${successfulRuns} run${successfulRuns !== 1 ? "s" : ""} completed`}
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>{result.zoneName}</div>
        </div>

        {/* HP */}
        <div style={{ background: hpLost > 0 ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.06)", border: `1px solid ${hpLost > 0 ? "rgba(239,68,68,0.2)" : "rgba(74,222,128,0.15)"}`, borderRadius: "10px", padding: "0.6rem 0.75rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted)" }}>❤️ HEALTH</span>
            <span style={{ fontSize: "0.68rem", color: hpLost > 0 ? "#ef4444" : "#4ade80", fontWeight: 700 }}>{hpLost > 0 ? `−${hpLost} HP taken` : "No damage"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <HpBar hp={hpRemaining} maxHp={maxHp} height={8} />
            <span style={{ fontSize: "0.65rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{Math.floor(hpRemaining)}/{maxHp}</span>
          </div>
        </div>

        {/* Loot — hidden on normal death */}
        {!diedOnNormal && (result.loot?.length ?? 0) > 0 && (
          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.35rem", letterSpacing: "0.05em" }}>
              LOOT {diedDuringAuto ? "(50%)" : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {result.loot.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                  <span>{l.emoji}</span><span style={{ fontWeight: 700 }}>+{l.amount}</span><span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* XP — hidden on normal death */}
        {!diedOnNormal && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.72rem" }}>
            <span style={{ color: "#a78bfa" }}>✨ +{result.xpGained ?? 0} XP</span>
            {result.leveledUp && <span style={{ color: "#fbbf24", fontWeight: 700 }}>⬆️ LEVEL UP!</span>}
          </div>
        )}

        <button onClick={onDismiss} style={{ width: "100%", padding: "0.65rem", background: result.failed ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)", border: `1px solid ${result.failed ? "rgba(239,68,68,0.4)" : "rgba(74,222,128,0.4)"}`, borderRadius: "10px", color: result.failed ? "#ef4444" : "#4ade80", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
          {diedOnNormal ? "Close" : result.failed ? "Try Again" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Dead Hero Overlay ────────────────────────────────────────────────────────
function DeadHeroOverlay({ adventurer, game, onRevive }) {
  const cost = getReviveCost(adventurer);
  const canAfford = (game.cash ?? 0) >= cost;
  const prestige = getHeroPrestigeLevel(adventurer);
  return (
    <div style={{
      padding: "0.75rem 0.9rem",
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: "10px",
      margin: "0 0.9rem 0.75rem",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>💀</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ef4444", marginBottom: "0.1rem" }}>Hero Fallen</div>
      <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
        {prestige > 0 ? `Prestige Lv.${prestige} · Revive cost increases` : "This hero needs to be revived before going on another mission."}
      </div>
      <button
        onClick={() => onRevive(adventurer.id)}
        disabled={!canAfford}
        style={{
          padding: "0.5rem 1.25rem",
          background: canAfford ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${canAfford ? "rgba(239,68,68,0.6)" : "var(--border)"}`,
          borderRadius: "8px",
          color: canAfford ? "#ef4444" : "var(--muted)",
          fontWeight: 700,
          fontSize: "0.78rem",
          cursor: canAfford ? "pointer" : "default",
        }}
      >
        ❤️ Revive · ${cost.toLocaleString()}
      </button>
      {!canAfford && (
        <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: "0.35rem" }}>
          Need ${(cost - (game.cash ?? 0)).toLocaleString()} more
        </div>
      )}
    </div>
  );
}

// ─── Equipment Slots Panel ────────────────────────────────────────────────────
const INSTANCED_SLOT_MAP = { master_sword: "weapon", tower_shield: "armour", plate_armor: "body" };

function EquipmentPanel({ adventurer, game, onEquip, onUnequip }) {
  const forgeGoods = game.forgeGoods ?? {};
  const allInstanced = game.forgeGoodsInstanced ?? [];
  const equippedInstanceId = adventurer.equippedInstanceId ?? {};

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>⚔️ EQUIPMENT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {(["weapon", "armour", "body"]).map((slot) => {
          const meta = SLOT_META[slot];
          const equipped = getEquippedRecipe(adventurer, slot);
          const equippedInstId = equippedInstanceId[slot];
          const equippedInst = equippedInstId ? allInstanced.find((i) => i.id === equippedInstId) : null;

          // Flat items available for this slot (non-instanced)
          const available = getEquippableForSlot(slot, forgeGoods);
          // Instanced items available for this slot (in stock, not equipped by anyone)
          const availableInstanced = allInstanced.filter(
            (i) => INSTANCED_SLOT_MAP[i.key] === slot && !i._equippedBy
          );

          const hasAnything = available.length > 0 || availableInstanced.length > 0;

          return (
            <div key={slot} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem 0.65rem" }}>
              {/* Slot label */}
              <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginBottom: "0.3rem", letterSpacing: "0.05em", fontWeight: 600 }}>
                {meta.emoji} {meta.label.toUpperCase()}
              </div>

              {/* Equipped item */}
              {equipped ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{equipped.emoji}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#fbbf24" }}>{equipped.name}</span>
                        {equippedInst && (
                          <span style={{
                            fontSize: "0.55rem", fontWeight: 700,
                            background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)",
                            color: "#a78bfa", borderRadius: "4px", padding: "1px 5px",
                          }}>T{equippedInst.upgradeTier ?? 3}</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>{equipped.description}</div>
                      {getGearStatLine(equipped) && (
                        <div style={{ fontSize: "0.57rem", color: "#a78bfa", marginTop: "1px", fontWeight: 600 }}>
                          {getGearStatLine(equipped)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onUnequip(adventurer.id, slot)}
                    style={{ fontSize: "0.58rem", padding: "2px 8px", borderRadius: "5px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer", flexShrink: 0 }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontStyle: "italic", marginBottom: hasAnything ? "0.3rem" : 0 }}>
                  Empty
                </div>
              )}

              {/* Available to equip — flat items */}
              {!equipped && available.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.25rem" }}>
                  {available.map((r) => {
                    const qty = forgeGoods[r.output.resourceKey] ?? 0;
                    const statLine = getGearStatLine(r);
                    return (
                      <button
                        key={r.output.resourceKey}
                        onClick={() => onEquip(adventurer.id, slot, r.output.resourceKey, null)}
                        style={{ fontSize: "0.65rem", padding: "4px 9px", borderRadius: "6px", cursor: "pointer", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24", textAlign: "left" }}
                      >
                        <div>{r.emoji} {r.name} ×{qty}</div>
                        {statLine && <div style={{ fontSize: "0.57rem", color: "#a78bfa", marginTop: "1px" }}>{statLine}</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Available to equip — instanced items */}
              {!equipped && availableInstanced.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.25rem" }}>
                  {availableInstanced.map((inst) => {
                    const r = Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === inst.key);
                    return (
                      <button
                        key={inst.id}
                        onClick={() => onEquip(adventurer.id, slot, inst.key, inst.id)}
                        style={{ fontSize: "0.65rem", padding: "2px 9px", borderRadius: "6px", cursor: "pointer", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd", display: "flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <span>{r?.output.emoji ?? "⚔️"}</span>
                        <span>{r?.output.name ?? inst.key}</span>
                        <span style={{
                          fontSize: "0.55rem", fontWeight: 700,
                          background: "rgba(139,92,246,0.2)", borderRadius: "3px", padding: "1px 4px",
                        }}>T{inst.upgradeTier ?? 3}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No items available and empty */}
              {!equipped && !hasAnything && (
                <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", marginTop: "0.15rem" }}>
                  No {meta.label.toLowerCase()} in forge stock
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skill Tree ────────────────────────────────────────────────────────────────
function SkillTree({ adventurer, game, onSpendSkillPoint, onPrestige, onShowPrestigeBanner }) {
  const skillMap = (() => {
    const s = adventurer.skills ?? {};
    if (Array.isArray(s)) return Object.fromEntries(s.map((id) => [id, 1]));
    return s;
  })();
  const skillPoints = adventurer.skillPoints ?? 0;
  const level = adventurer.level ?? 1;
  const heroClass = adventurer.heroClass ?? null;
  const prestigeLevel = adventurer.prestigeLevel ?? 0;

  // Prestige gate: level 15+ and cash
  const prestigeCost = HERO_PRESTIGE_COST_BASE * (prestigeLevel + 1);
  const canAffordPrestige = (game.cash ?? 0) >= prestigeCost;
  const canPrestige = level >= 15 && canAffordPrestige;

  function getSkillRank(id) { return skillMap[id] ?? 0; }
  function hasSkill(id) { return getSkillRank(id) > 0; }

  // Cost to buy the next rank: rank 1 costs 1pt, rank 2 costs 2pts, rank 3 costs 3pts
  function nextRankCost(skillDef) {
    const rank = getSkillRank(skillDef.id);
    return rank + 1;
  }

  function canBuy(skillDef) {
    const rank = getSkillRank(skillDef.id);
    if (rank >= skillDef.maxRank) return false;

    const cost = nextRankCost(skillDef);
    if (skillPoints < cost) return false;

    const skillTree = Object.entries(HERO_SKILL_TREES).find(([, skills]) =>
      skills.some((s) => s.id === skillDef.id)
    )?.[0];

    // Tier-1: rank 1 unlocks class; ranks 2-3 continue as normal if it's your own class
    if (skillDef.tier === 1) {
      if (!heroClass) return true; // no class yet — allow first purchase (class unlock)
      if (skillTree !== heroClass) return false; // can't rank up another class's tier-1
      // own class tier-1 ranks 2-3 fall through to normal tree check below
    }

    if (skillTree === heroClass) {
      const treeDefs = HERO_SKILL_TREES[heroClass];
      const prevDef = treeDefs.find((s) => s.tier === skillDef.tier - 1);
      // Gate: need at least rank 1 in previous tier
      if (prevDef && getSkillRank(prevDef.id) === 0) return false;
      return true;
    }
    // Dip tree
    if (heroClass && skillTree !== heroClass) {
      if (prestigeLevel < 5) return false;
      if (skillDef.tier === 1) return true;
      if (skillDef.tier === 2 && prestigeLevel >= 10) return true;
      return false;
    }
    return false;
  }

  const CLASS_COLORS = {
    fighter:   { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.4)",   text: "#ef4444"  },
    mage:      { bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.4)", text: "#a78bfa"  },
    scavenger: { bg: "rgba(74,222,128,0.1)",   border: "rgba(74,222,128,0.4)",  text: "#4ade80"  },
  };
  const activeColor = heroClass ? CLASS_COLORS[heroClass] : { bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.3)", text: "#fbbf24" };

  // Which trees to show: primary (if chosen), or all 3 if classless
  const treesToShow = heroClass
    ? [heroClass, ...Object.keys(HERO_SKILL_TREES).filter((t) => t !== heroClass)]
    : Object.keys(HERO_SKILL_TREES);

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em" }}>
          🌟 SKILL TREE
          {heroClass && (
            <span style={{ marginLeft: "0.4rem", color: activeColor.text, fontSize: "0.6rem", fontWeight: 600, textTransform: "capitalize" }}>
              · {HERO_CLASS_META[heroClass]?.emoji} {HERO_CLASS_META[heroClass]?.name}
            </span>
          )}
        </div>
        <div style={{
          fontSize: "0.62rem", fontWeight: 700,
          padding: "2px 8px", borderRadius: "999px",
          background: skillPoints > 0 ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${skillPoints > 0 ? "rgba(251,191,36,0.5)" : "var(--border)"}`,
          color: skillPoints > 0 ? "#fbbf24" : "var(--muted)",
        }}>
          {skillPoints} pt{skillPoints !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Class choice prompt */}
      {!heroClass && (
        <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.4rem", padding: "0.35rem 0.5rem", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "7px" }}>
          ✨ Choose your class by spending your first skill point
        </div>
      )}

      {/* Trees */}
      {treesToShow.map((treeId) => {
        const treeDefs = HERO_SKILL_TREES[treeId];
        const meta = HERO_CLASS_META[treeId];
        const isPrimary = treeId === heroClass;
        const isDip = heroClass && treeId !== heroClass;
        const isClassless = !heroClass;
        const color = CLASS_COLORS[treeId];

        // For dip trees, only show up to tier 2 if P10+, tier 1 if P5+
        const maxVisibleTier = isDip
          ? (prestigeLevel >= 10 ? 2 : prestigeLevel >= 5 ? 1 : 0)
          : 6;
        if (isDip && maxVisibleTier === 0) return null;

        const visibleSkills = treeDefs.filter((s) => s.tier <= maxVisibleTier);

        return (
          <div key={treeId} style={{
            marginBottom: "0.5rem",
            background: isPrimary ? color.bg : "rgba(255,255,255,0.02)",
            border: `1px solid ${isPrimary ? color.border : "var(--border)"}`,
            borderRadius: "10px",
            overflow: "hidden",
            opacity: isDip ? 0.85 : 1,
          }}>
            {/* Tree header */}
            <div style={{ padding: "0.35rem 0.6rem", borderBottom: `1px solid ${isPrimary ? color.border : "var(--border)"}`, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.85rem" }}>{meta.emoji}</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isPrimary ? color.text : "var(--muted)" }}>{meta.name}</span>
              {isDip && <span style={{ fontSize: "0.52rem", color: "var(--muted)", marginLeft: "auto" }}>Dip tree · P{prestigeLevel >= 10 ? "10" : "5"}+</span>}
              {isClassless && <span style={{ fontSize: "0.52rem", color: "var(--muted)", marginLeft: "auto" }}>{meta.description}</span>}
            </div>

            {/* Skills */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {visibleSkills.map((skillDef) => {
                const rank = getSkillRank(skillDef.id);
                const owned = rank > 0;
                const maxed = rank >= skillDef.maxRank;
                const buyable = canBuy(skillDef);
                const locked = !owned && !buyable;

                // Rank dots: ●●○ style for all 3-rank skills
                const rankDots = skillDef.maxRank > 1
                  ? Array.from({ length: skillDef.maxRank }, (_, i) => i < rank ? "●" : "○").join("")
                  : null;

                return (
                  <div key={skillDef.id} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.4rem 0.6rem",
                    background: owned
                      ? (isPrimary ? `${color.bg}` : "rgba(99,102,241,0.08)")
                      : buyable ? "rgba(251,191,36,0.04)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    opacity: locked ? 0.4 : 1,
                  }}>
                    <div style={{ fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}>{skillDef.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: owned ? (isPrimary ? color.text : "#a78bfa") : buyable ? "#fbbf24" : "var(--text)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        {skillDef.name}
                        {rankDots && (
                          <span style={{ fontSize: "0.6rem", letterSpacing: "0.05em", color: rank >= skillDef.maxRank ? (isPrimary ? color.text : "#4ade80") : rank > 0 ? "#fbbf24" : "var(--muted)", fontWeight: 400 }}>
                            {rankDots}
                          </span>
                        )}
                        {skillDef.crossSystemEffect && <span style={{ fontSize: "0.5rem", background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", borderRadius: "4px", padding: "1px 4px" }}>FARM</span>}
                        {skillDef.grantsAutoBattle && <span style={{ fontSize: "0.5rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "4px", padding: "1px 4px" }}>AUTO</span>}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "var(--muted)", lineHeight: 1.3 }}>
                        {skillDef.description}
                      </div>
                    </div>
                    {maxed ? (
                      <div style={{ fontSize: "0.65rem", color: isPrimary ? color.text : "#4ade80", flexShrink: 0, fontWeight: 700 }}>MAX</div>
                    ) : buyable ? (
                      <button
                        onClick={() => onSpendSkillPoint(adventurer.id, skillDef.id)}
                        style={{ fontSize: "0.58rem", padding: "3px 8px", borderRadius: "6px", cursor: "pointer", flexShrink: 0, background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24", fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        {skillDef.tier === 1 && rank === 0 ? "Choose" : `+1 rank · ${nextRankCost(skillDef)}pt`}
                      </button>
                    ) : !maxed && rank > 0 ? (
                      <div style={{ fontSize: "0.55rem", color: "var(--muted)", flexShrink: 0 }}>
                        {`need ${nextRankCost(skillDef)}pt`}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)", flexShrink: 0 }}>🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Prestige row */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.55rem 0.65rem", borderRadius: "8px",
        background: canPrestige ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${canPrestige ? "rgba(251,191,36,0.4)" : "var(--border)"}`,
        marginTop: "0.25rem",
      }}>
        <div style={{ fontSize: "1.15rem", flexShrink: 0 }}>⭐</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: canPrestige ? "#fbbf24" : "var(--text)" }}>
            Prestige
            {prestigeLevel > 0 && <span style={{ marginLeft: "0.4rem", fontSize: "0.58rem", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24", borderRadius: "4px", padding: "1px 5px" }}>Lv.{prestigeLevel}</span>}
          </div>
          <div style={{ fontSize: "0.58rem", color: "var(--muted)", lineHeight: 1.4 }}>
            Reset to Lv.1 · Keep gear · Respec class · +1 skill point · +1 food slot · Costs $${prestigeCost.toLocaleString()}
            {level < 15 && <span style={{ color: "#ef4444", marginLeft: "0.3rem" }}>· Requires level 15</span>}
          </div>
        </div>
        {canPrestige ? (
          <button
            onClick={() => { onPrestige(adventurer.id); onShowPrestigeBanner && onShowPrestigeBanner(); }}
            style={{ fontSize: "0.6rem", padding: "3px 9px", borderRadius: "6px", cursor: "pointer", flexShrink: 0, background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24", fontWeight: 700 }}
          >
            ⭐ Prestige!
          </button>
        ) : (
          <div style={{ fontSize: "0.6rem", color: "var(--muted)", flexShrink: 0, textAlign: "right" }}>
            {level < 15 ? `Lv${level}/15` : !canAffordPrestige ? `$${prestigeCost.toLocaleString()}` : "🔒"}
          </div>
        )}
      </div>

      {/* Dip tree unlock hint */}
      {heroClass && prestigeLevel < 5 && (
        <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: "0.35rem", textAlign: "center" }}>
          🌿 Prestige 5 times to unlock a second tree for dipping
        </div>
      )}
    </div>
  );
}

// ─── Hero Modal ────────────────────────────────────────────────────────────────
function HeroModal({ adventurer, game, onClose, onEquip, onUnequip, onGiveArtisanFood, onRemoveArtisanFood, onUseArtisanFood, onGiveBuffItem, onRemoveBuffItem, onSpendSkillPoint, onPrestige, onRevive }) {
  const [prestigeBanner, setPrestigeBanner] = React.useState(false);
  const _heroClass = adventurer.heroClass ?? null;
  const cls = _heroClass
    ? (HERO_CLASS_META[_heroClass] ?? { name: "Adventurer", emoji: "🧭" })
    : { name: "Adventurer", emoji: "🧭" };
  const maxHp = adventurer.maxHp ?? getAdventurerMaxHp(adventurer);
  const hp = adventurer.hp ?? maxHp;
  const xpNeeded = getXpNeeded(adventurer.level ?? 1);
  const xpPct = ((adventurer.xp ?? 0) / xpNeeded) * 100;
  const dead = isDead(adventurer);
  const beltCapacity = getBeltCapacity(adventurer);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "18px 18px 0 0", padding: "1.25rem 1rem 2.5rem", width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "2.2rem", background: dead ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)", border: `1px solid ${dead ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.25)"}`, borderRadius: "10px", padding: "0.3rem 0.45rem" }}>
            {dead ? "💀" : cls.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>{adventurer.name}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{cls.name} · Lv.{adventurer.level ?? 1}{getHeroPrestigeLevel(adventurer) > 0 ? ` · ⭐ P${getHeroPrestigeLevel(adventurer)}` : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0.25rem 0.5rem" }}>✕</button>
        </div>

        {/* Prestige banner */}
        {prestigeBanner && (
          <div style={{ textAlign: "center", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.5)", borderRadius: "12px", padding: "0.75rem", marginBottom: "0.85rem", animation: "pulse 1.2s ease-in-out 3" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.2rem" }}>⭐</div>
            <div style={{ fontWeight: 800, color: "#fbbf24", fontSize: "1rem" }}>Prestige!</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>Back to Lv.1 · Gear kept · +1 skill point · +1 food slot · Respec class</div>
          </div>
        )}

        {/* Dead banner */}
        {dead && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "0.65rem 0.75rem", marginBottom: "0.85rem", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "#ef4444", fontSize: "0.82rem", marginBottom: "0.3rem" }}>💀 Hero Fallen</div>
            <button
              onClick={() => onRevive(adventurer.id)}
              disabled={(game.cash ?? 0) < getReviveCost(adventurer)}
              style={{ padding: "0.4rem 1rem", background: (game.cash ?? 0) >= getReviveCost(adventurer) ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${(game.cash ?? 0) >= getReviveCost(adventurer) ? "rgba(239,68,68,0.6)" : "var(--border)"}`, borderRadius: "8px", color: (game.cash ?? 0) >= getReviveCost(adventurer) ? "#ef4444" : "var(--muted)", fontWeight: 700, fontSize: "0.78rem", cursor: (game.cash ?? 0) >= getReviveCost(adventurer) ? "pointer" : "default" }}
            >
              ❤️ Revive · ${getReviveCost(adventurer).toLocaleString()}
            </button>
          </div>
        )}

        {/* HP */}
        <div style={{ padding: "0.65rem 0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)" }}>❤️ HEALTH</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: dead ? "#ef4444" : hp / maxHp > 0.6 ? "#4ade80" : hp / maxHp > 0.3 ? "#fbbf24" : "#ef4444" }}>{dead ? "DEAD" : `${Math.floor(hp)}/${maxHp}`}</span>
          </div>
          <HpBar hp={dead ? 0 : hp} maxHp={maxHp} height={10} />
          {!dead && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.35rem", fontSize: "0.58rem", color: "var(--muted)" }}>
              <span>XP: {adventurer.xp ?? 0}/{xpNeeded}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: "70px", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${xpPct}%`, background: "#a78bfa", borderRadius: "2px" }} />
                </div>
                <span style={{ color: "#a78bfa" }}>Lv.{adventurer.level ?? 1}</span>
              </div>
            </div>
          )}
        </div>

        {/* Equipment */}
        <EquipmentPanel adventurer={adventurer} game={game} onEquip={onEquip} onUnequip={onUnequip} />

        {/* Buff Slot */}
        <div style={{ padding: "0.6rem 0.75rem", background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "10px", marginBottom: "0.65rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--muted)", fontSize: "0.6rem", letterSpacing: "0.05em" }}>✨ BUFF SLOT <span style={{ color: "var(--muted)", fontWeight: 400 }}>(1 slot · consumed on mission complete)</span></div>
          {adventurer.buffSlot ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {(() => {
                const def = ADVENTURER_BUFF_ITEMS[adventurer.buffSlot];
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: "8px", padding: "4px 10px", flex: 1 }}>
                    <span style={{ fontSize: "1.1rem" }}>{def?.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa" }}>{def?.name}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{def?.description}</div>
                    </div>
                    <button onClick={() => onRemoveBuffItem(adventurer.id)} style={{ fontSize: "0.58rem", padding: "2px 7px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer" }}>Remove</button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontStyle: "italic", marginBottom: "0.4rem" }}>No buff active.</div>
          )}
          {!adventurer.buffSlot && (() => {
            const available = ADVENTURER_BUFF_LIST.filter((id) => ((game.animalGoods ?? {})[id] ?? 0) > 0);
            if (!available.length) return <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>No buff items in stock (craft omelettes/cheese in kitchen).</div>;
            return (
              <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                {available.map((id) => {
                  const def = ADVENTURER_BUFF_ITEMS[id];
                  const qty = (game.animalGoods ?? {})[id] ?? 0;
                  return (
                    <button key={id} onClick={() => onGiveBuffItem(adventurer.id, id)} style={{ fontSize: "0.65rem", padding: "3px 10px", borderRadius: "6px", cursor: "pointer", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.35)", color: "#a78bfa" }}>
                      {def.emoji} {def.name} ×{qty}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Food Belt */}
        <div style={{ padding: "0.6rem 0.75rem", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", marginBottom: "0.65rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--muted)", fontSize: "0.6rem", letterSpacing: "0.05em" }}>
            🍞 FOOD BELT <span style={{ color: "var(--muted)", fontWeight: 400 }}>({beltCapacity} slots · auto-used on level up)</span>
          </div>
          {(() => {
            const foodBelt = adventurer.foodBelt ?? {};
            const beltItems = ARTISAN_FOOD_LIST.filter((id) => (foodBelt[id] ?? 0) > 0);
            const beltTotal = Object.values(foodBelt).reduce((s, v) => s + v, 0);
            const stockFood = ARTISAN_FOOD_LIST.filter((id) => ((game.artisan ?? {})[id] ?? 0) > 0);
            // Last food type used on belt (for replenish — first belt item, or first in stock)
            const lastBeltType = beltItems[0] ?? stockFood[0] ?? null;
            const canReplenish = lastBeltType && beltTotal < beltCapacity && ((game.artisan ?? {})[lastBeltType] ?? 0) > 0;
            const replenishAmount = lastBeltType ? Math.min(
              beltCapacity - beltTotal,
              (game.artisan ?? {})[lastBeltType] ?? 0
            ) : 0;

            return (
              <>
                {/* Current belt items */}
                {beltTotal === 0 ? (
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.4rem", fontStyle: "italic" }}>No food on belt.</div>
                ) : (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                    {beltItems.map((id) => {
                      const def = ARTISAN_FOOD_HEAL[id];
                      return (
                        <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "7px", padding: "3px 8px" }}>
                          <span style={{ fontSize: "0.85rem" }}>{def.emoji}</span>
                          <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>×{foodBelt[id]}</span>
                          <span style={{ fontSize: "0.58rem", color: "#4ade80" }}>+{def.healAmount}hp</span>
                          <button onClick={() => onUseArtisanFood(adventurer.id, id)} style={{ fontSize: "0.55rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", cursor: "pointer", marginLeft: "2px" }}>Use</button>
                          <button onClick={() => onRemoveArtisanFood(adventurer.id, id)} style={{ fontSize: "0.55rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", cursor: "pointer" }}>−</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Replenish button — always visible when applicable */}
                {canReplenish && (
                  <div style={{ marginBottom: "0.35rem" }}>
                    <button
                      onClick={() => {
                        for (let i = 0; i < replenishAmount; i++) {
                          onGiveArtisanFood(adventurer.id, lastBeltType);
                        }
                      }}
                      style={{ fontSize: "0.65rem", padding: "3px 10px", borderRadius: "6px", cursor: "pointer", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.45)", color: "#fbbf24", fontWeight: 700 }}
                    >
                      {ARTISAN_FOOD_HEAL[lastBeltType]?.emoji} Replenish ×{replenishAmount} ({beltTotal}/{beltCapacity} slots used)
                    </button>
                  </div>
                )}

                {/* Add from stock — shown when belt not full and other types available */}
                {stockFood.length > 0 && beltTotal < beltCapacity && (
                  <div>
                    <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginBottom: "0.25rem" }}>Add from stock:</div>
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      {stockFood.map((id) => {
                        const def = ARTISAN_FOOD_HEAL[id];
                        const qty = (game.artisan ?? {})[id] ?? 0;
                        return (
                          <button key={id} onClick={() => onGiveArtisanFood(adventurer.id, id)} style={{ fontSize: "0.65rem", padding: "2px 9px", borderRadius: "6px", cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
                            {def.emoji} {def.name} ×{qty}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Skill Tree */}
        <SkillTree adventurer={adventurer} game={game} onSpendSkillPoint={onSpendSkillPoint} onPrestige={onPrestige} onShowPrestigeBanner={() => { setPrestigeBanner(true); setTimeout(() => setPrestigeBanner(false), 4000); }} />

        {/* Stats */}
        <div style={{ padding: "0.55rem 0.7rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "0.68rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.35rem", color: "var(--muted)", fontSize: "0.6rem", letterSpacing: "0.05em" }}>📊 COMBAT STATS</div>
          {(() => {
            const lvl = adventurer.level ?? 1;
            const gear = adventurer.equippedGear ?? {};
            const weaponKey = gear.weapon;
            const armourKey = gear.armour;
            const bodyKey = gear.body;
            const weaponR = weaponKey ? FORGE_RECIPES[weaponKey] : null;
            const armourR = armourKey ? FORGE_RECIPES[armourKey] : null;
            const bodyR = bodyKey ? Object.values(FORGE_RECIPES).find(r => r.output.resourceKey === bodyKey) : null;
            const lvlSpeedPct = Math.round((lvl - 1) * 8);
            const weaponPct = weaponR?.missionTimeReduction ? Math.round(weaponR.missionTimeReduction * 100) : 0;
            const totalSpeedPct = Math.min(75, lvlSpeedPct + weaponPct + getTotalGearTier(adventurer) * 15);
            const armourPct = armourR?.damageReduction ? Math.round(armourR.damageReduction * 100) : 0;
            const foodSlots = getBeltCapacity(adventurer);
            return (
              <div style={{ display: "flex", gap: "0.5rem 1rem", flexWrap: "wrap" }}>
                <span>⏱ Missions: <strong>−{totalSpeedPct}% faster</strong></span>
                {armourPct > 0 && <span>🛡 Damage: <strong>−{armourPct}%</strong></span>}
                <span>🍞 Belt: <strong>{foodSlots} slots</strong></span>
                {getHeroPrestigeLevel(adventurer) > 0 && <span>⭐ Prestige: <strong>Lv.{getHeroPrestigeLevel(adventurer)}</strong></span>}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Auto Battle Panel (shown in AdventurerCard when skill unlocked) ──────────
function AutoBattlePanel({ adventurer, game, onStartAutoBattle, onReturnAutoBattle, onRequestStop }) {
  const isOnMission = !!adventurer.mission;
  const isAutoBattle = adventurer.mission?.autoBattle;
  const mission = adventurer.mission;
  const elapsed = isOnMission ? Math.min((Date.now() - mission.startTime) / 1000, mission.duration) : 0;
  const progress = isOnMission ? elapsed / mission.duration : 0;
  const done = isOnMission && elapsed >= mission.duration;

  const foodBelt = adventurer.foodBelt ?? {};
  const potionCount = (game.forgeGoods?.health_potion ?? 0);
  const beltFoodTotal = Object.values(foodBelt).reduce((s, v) => s + v, 0);
  const hasResources = potionCount > 0 || beltFoodTotal > 0;

  if (isOnMission && isAutoBattle) {
    return (
      <div style={{ padding: "0.65rem 0.9rem", borderTop: "1px solid var(--border)", background: "rgba(239,68,68,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ef4444" }}>
            {done ? "⚔️ Run complete!" : `⚔️ Auto Battle · ${mission.zoneName}`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.58rem", color: "var(--muted)" }}>
              {mission.autoBattleRuns ?? 0} run{(mission.autoBattleRuns ?? 0) !== 1 ? "s" : ""}
            </span>
            {mission.autoBattleStopRequested ? (
              <span style={{ fontSize: "0.55rem", color: "#fbbf24", fontWeight: 700, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: "999px", padding: "1px 7px" }}>
                ⏳ Stopping…
              </span>
            ) : (
              <button
                onClick={() => onRequestStop(adventurer.id)}
                style={{ fontSize: "0.55rem", padding: "1px 8px", borderRadius: "999px", cursor: "pointer", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171", fontWeight: 700 }}
              >
                ⏹ Stop
              </button>
            )}
          </div>
        </div>
        <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "0.4rem" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "#ef4444", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>
        {done && (mission.autoBattleStopRequested || beltFoodTotal === 0) && (
          <button
            onClick={() => onReturnAutoBattle(adventurer.id)}
            style={{ width: "100%", padding: "0.45rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", color: "#ef4444", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
          >
            🎒 Collect Auto Loot
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ─── Adventurer Card ──────────────────────────────────────────────────────────
function AdventurerCard({ adventurer, zones, game, onSend, onReturn, onOpenHero, onGiveArtisanFood, onUseArtisanFood, onGiveBuffItem, onRevive, onStartAutoBattle, onReturnAutoBattle, onRequestStop, onAssignTavern, onRemoveTavern, onSetFillFood }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [zonesOpen, setZonesOpen] = useState(true);
  const [autoBattleMode, setAutoBattleMode] = useState(false);

  // Seed from persisted lastFillFoodId so the chosen food survives re-renders
  const stockFood = ARTISAN_FOOD_LIST.filter((id) => ((game.artisan ?? {})[id] ?? 0) > 0);
  const savedIdx = adventurer.lastFillFoodId
    ? Math.max(0, stockFood.indexOf(adventurer.lastFillFoodId))
    : 0;
  const [fillFoodIdx, setFillFoodIdx] = useState(savedIdx);
  const [fillHolding, setFillHolding] = useState(false);
  const fillHoldTimer = useRef(null);
  const fillHoldFired = useRef(false);

  const heroClass = adventurer.heroClass ?? null;
  const cls = heroClass
    ? (HERO_CLASS_META[heroClass] ?? ADVENTURER_CLASSES[adventurer.class] ?? { name: "Adventurer", emoji: "🧭" })
    : { name: "Adventurer", emoji: "🧭" };
  const isOnMission = !!adventurer.mission;
  const mission = adventurer.mission;
  const elapsed = isOnMission ? Math.min((Date.now() - mission.startTime) / 1000, mission.duration) : 0;
  const progress = isOnMission ? elapsed / mission.duration : 0;
  const done = isOnMission && elapsed >= mission.duration;
  const xpNeeded = getXpNeeded(adventurer.level ?? 1);
  const xpPct = ((adventurer.xp ?? 0) / xpNeeded) * 100;
  const maxHp = adventurer.maxHp ?? getAdventurerMaxHp(adventurer);
  const hp = adventurer.hp ?? maxHp;
  const dead = isDead(adventurer);
  const _skillMap = (() => { const s = adventurer.skills ?? {}; return Array.isArray(s) ? Object.fromEntries(s.map((id) => [id, 1])) : s; })();
  const hasAutoBattle = !!(_skillMap["fighter_t1"] || _skillMap["mage_t1"] || _skillMap["scavenger_t1"]);
  const availableZones = zones.filter((z) => isZoneUnlocked(z, adventurer, game.worldZoneClears));
  const lockedZones = zones.filter((z) => !isZoneUnlocked(z, adventurer, game.worldZoneClears));
  const selectedZone = selectedZoneId ? WORLD_ZONES[selectedZoneId] : null;

  // Food belt quick info
  const foodBelt = adventurer.foodBelt ?? {};
  const beltCapacity = getBeltCapacity(adventurer);
  const beltFoodTotal = Object.values(foodBelt).reduce((s, v) => s + v, 0);
  const firstBeltFood = ARTISAN_FOOD_LIST.find((id) => (foodBelt[id] ?? 0) > 0) ?? null;
  const canReplenish = stockFood.length > 0 && beltFoodTotal < beltCapacity;

  // Buff slot
  const buffSlot = adventurer.buffSlot ?? null;
  const availableBuffs = ADVENTURER_BUFF_LIST.filter((id) => ((game.animalGoods ?? {})[id] ?? 0) > 0);

  // Tavern rest
  const tavernBuilt = game.town?.townBuildings?.tavern?.built === true;
  const isResting = !!adventurer.tavernResting;
  const tavernBuff = adventurer.tavernBuff ?? null;
  const tavernMode = game.town?.townBuildings?.tavern?.mode ?? "jam";
  const tavernStocked = game.town?.townBuildings?.tavern?.stocked !== false;
  const tavernWorkers = game.town?.townBuildings?.tavern?.workers ?? 0;

  // Auto battle potion check
  const potionCount = game.forgeGoods?.health_potion ?? 0;
  const canStartAutoBattle = hasAutoBattle && selectedZone && beltFoodTotal > 0 && !dead;

  return (
    <div style={{ background: "var(--bg-elev)", border: `1px solid ${dead ? "rgba(239,68,68,0.35)" : "var(--border)"}`, borderRadius: "14px", overflow: "hidden", marginBottom: "0.75rem" }}>
      {/* Header */}
      <button onClick={() => !isOnMission && !dead && onOpenHero(adventurer)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0.9rem 0.6rem", background: "none", border: "none", cursor: (isOnMission || dead) ? "default" : "pointer", textAlign: "left" }}>
        <div style={{ fontSize: "2rem", lineHeight: 1, background: dead ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)", border: `1px solid ${dead ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.25)"}`, borderRadius: "10px", padding: "0.3rem 0.45rem" }}>
          {dead ? "💀" : cls.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{adventurer.name}</span>
            <span style={{ fontSize: "0.62rem", color: "var(--muted)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "999px" }}>{cls.name}</span>
            {dead && <span style={{ fontSize: "0.58rem", color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>FALLEN</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem" }}>
            <span style={{ fontSize: "0.6rem", color: "#a78bfa", fontWeight: 700 }}>Lv.{adventurer.level ?? 1}</span>
            <div style={{ width: "50px", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}><div style={{ height: "100%", width: `${xpPct}%`, background: "#a78bfa" }} /></div>
            {getHeroPrestigeLevel(adventurer) > 0 && <span style={{ fontSize: "0.55rem", color: "#fbbf24" }}>⭐P{getHeroPrestigeLevel(adventurer)}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.2rem" }}>
            <span style={{ fontSize: "0.55rem", color: "#ef4444" }}>❤️</span>
            <HpBar hp={dead ? 0 : hp} maxHp={maxHp} height={4} />
            <span style={{ fontSize: "0.55rem", color: dead ? "#ef4444" : "var(--muted)", whiteSpace: "nowrap" }}>{dead ? "DEAD" : `${Math.floor(hp)}/${maxHp}`}</span>
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "0.52rem", color: "var(--muted)", marginBottom: "1px" }}>GEAR</div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: getTotalGearTier(adventurer) === 0 ? "var(--muted)" : "#fbbf24", background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px 7px" }}>
            {getTotalGearTier(adventurer) === 0 ? "None" : `T${getTotalGearTier(adventurer)}`}
          </div>
          {!isOnMission && !dead && <div style={{ fontSize: "0.48rem", color: "var(--muted)", marginTop: "2px" }}>tap to manage</div>}
          {isOnMission && <div style={{ fontSize: "0.48rem", color: "rgba(251,191,36,0.7)", marginTop: "2px" }}>on mission</div>}
          {(adventurer.skillPoints ?? 0) > 0 && (() => {
            const pts = adventurer.skillPoints;
            const heroClass = adventurer.heroClass ?? null;
            const skillMap = (() => { const s = adventurer.skills ?? {}; return Array.isArray(s) ? Object.fromEntries(s.map((id) => [id, 1])) : s; })();
            const canPrestigeNow = (adventurer.level ?? 1) >= 15 && (game.cash ?? 0) >= (HERO_PRESTIGE_COST_BASE * ((adventurer.prestigeLevel ?? 0) + 1));
            const noClass = !heroClass && (adventurer.level ?? 1) >= 2;
            const label = canPrestigeNow ? "⭐ Prestige ready!" : noClass ? "✨ Choose class!" : `✨ ${pts} pt${pts !== 1 ? "s" : ""} · open hero`;
            return (
              <div style={{
                marginTop: "3px",
                fontSize: "0.52rem", fontWeight: 800,
                background: canPrestigeNow ? "rgba(251,191,36,0.35)" : "rgba(251,191,36,0.25)",
                border: `1px solid ${canPrestigeNow ? "rgba(251,191,36,0.8)" : "rgba(251,191,36,0.6)"}`,
                color: "#fbbf24",
                borderRadius: "999px",
                padding: "1px 6px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}>
                {label}
              </div>
            );
          })()}
        </div>
      </button>

      {/* Dead overlay */}
      {dead && !isOnMission && !adventurer.pendingAutoCollect && (
        <DeadHeroOverlay adventurer={adventurer} game={game} onRevive={onRevive} />
      )}

      {/* Mission progress */}
      {isOnMission && !mission?.autoBattle && (
        <div style={{ padding: "0.65rem 0.9rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{done ? "✅ Mission complete!" : `⚔️ ${mission.zoneName}`}</span>
            {!done && <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{Math.ceil(mission.duration - elapsed)}s</span>}
          </div>
          <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.5rem" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: done ? "#4ade80" : "var(--accent)", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          {done && <button onClick={() => onReturn(adventurer.id)} style={{ width: "100%", padding: "0.5rem", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: "8px", color: "#4ade80", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>🎒 Collect Loot</button>}
        </div>
      )}

      {/* Auto Battle progress */}
      {isOnMission && mission?.autoBattle && (
        <AutoBattlePanel
          adventurer={adventurer}
          game={game}
          onReturnAutoBattle={onReturnAutoBattle}
          onRequestStop={onRequestStop}
        />
      )}

      {/* Pending auto-collect button — shown when auto battle ended and is waiting for collection */}
      {!isOnMission && adventurer.pendingAutoCollect && (
        <div style={{ padding: "0.65rem 0.9rem", borderTop: "1px solid var(--border)", background: "rgba(239,68,68,0.04)" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
            {adventurer.pendingAutoCollect.diedDuringAuto
              ? `💀 Fell in battle · ${adventurer.pendingAutoCollect.successfulRuns} run${adventurer.pendingAutoCollect.successfulRuns !== 1 ? "s" : ""} · 50% loot`
              : adventurer.pendingAutoCollect.stoppedByPlayer
              ? `🏳️ Recalled · ${adventurer.pendingAutoCollect.successfulRuns} run${adventurer.pendingAutoCollect.successfulRuns !== 1 ? "s" : ""} completed`
              : `🍞 Out of food · ${adventurer.pendingAutoCollect.successfulRuns} run${adventurer.pendingAutoCollect.successfulRuns !== 1 ? "s" : ""} completed`}
          </div>
          <button
            onClick={() => onReturnAutoBattle(adventurer.id)}
            style={{ width: "100%", padding: "0.5rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", color: "#ef4444", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
          >
            🎒 Collect Auto Loot
          </button>
        </div>
      )}

      {/* Zone picker — hidden when on mission or dead or awaiting auto-collect */}
      {!isOnMission && !dead && !adventurer.pendingAutoCollect && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {/* Auto battle mode toggle — only show if skill unlocked */}
          {hasAutoBattle && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.9rem", background: autoBattleMode ? "rgba(239,68,68,0.05)" : "transparent", borderBottom: "1px solid var(--border)" }}>
              <div>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: autoBattleMode ? "#ef4444" : "var(--muted)" }}>⚔️ Auto Battle</span>
                <span style={{ fontSize: "0.58rem", color: "var(--muted)", marginLeft: "0.4rem" }}>uses food · runs until empty</span>
              </div>
              <button
                onClick={() => setAutoBattleMode((v) => !v)}
                style={{
                  fontSize: "0.6rem", padding: "2px 10px", borderRadius: "999px",
                  background: autoBattleMode ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${autoBattleMode ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                  color: autoBattleMode ? "#ef4444" : "var(--muted)",
                  cursor: "pointer", fontWeight: 700,
                }}
              >
                {autoBattleMode ? "ON" : "OFF"}
              </button>
            </div>
          )}

          {/* Action row */}
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.6rem 0.9rem", borderBottom: zonesOpen ? "1px solid var(--border)" : "none" }}>
            {/* GO button */}
            <button
              onClick={() => {
                if (selectedZone) {
                  if (autoBattleMode) {
                    onStartAutoBattle(adventurer.id, selectedZone.id);
                  } else {
                    onSend(adventurer.id, selectedZone.id);
                  }
                }
              }}
              disabled={!selectedZone || (autoBattleMode && !canStartAutoBattle)}
              style={{
                flex: 2, padding: "0.65rem 0.5rem",
                background: selectedZone
                  ? autoBattleMode
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(99,102,241,0.25)"
                  : "rgba(255,255,255,0.04)",
                border: `2px solid ${selectedZone
                  ? autoBattleMode
                    ? "rgba(239,68,68,0.6)"
                    : "rgba(99,102,241,0.7)"
                  : "var(--border)"}`,
                borderRadius: "10px",
                color: selectedZone
                  ? autoBattleMode ? "#ef4444" : "var(--accent)"
                  : "var(--muted)",
                fontWeight: 800, fontSize: "1rem",
                cursor: (selectedZone && (!autoBattleMode || canStartAutoBattle)) ? "pointer" : "default",
                letterSpacing: "0.04em", transition: "all 0.15s",
              }}
            >
              {selectedZone
                ? autoBattleMode
                  ? `⚔️ Auto! · ${getMissionDuration(adventurer, selectedZone)}s`
                  : `⚔️ Go! · ${getMissionDuration(adventurer, selectedZone)}s`
                : "⚔️ Go!"}
            </button>

            {/* Heal button — tap to instantly consume one belt food */}
            {(() => {
              const hasBeltFood = firstBeltFood !== null;
              const def = hasBeltFood ? ARTISAN_FOOD_HEAL[firstBeltFood] : null;
              const atFullHp = hp >= maxHp;
              const canUse = hasBeltFood && !atFullHp && !dead;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canUse) onUseArtisanFood(adventurer.id, firstBeltFood);
                  }}
                  disabled={!canUse}
                  style={{
                    flex: 1, padding: "0.65rem 0.4rem",
                    background: canUse ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${canUse ? "rgba(74,222,128,0.35)" : "var(--border)"}`,
                    borderRadius: "10px",
                    color: canUse ? "#4ade80" : "var(--muted)",
                    fontWeight: 700, fontSize: "0.72rem",
                    cursor: canUse ? "pointer" : "default",
                    opacity: hasBeltFood ? 1 : 0.4,
                  }}
                >
                  {def?.emoji ?? "🍞"} Heal
                  <div style={{ fontSize: "0.55rem", marginTop: "1px", opacity: 0.8 }}>
                    {hasBeltFood
                      ? atFullHp ? `×${beltFoodTotal} · full` : `+${def?.healAmount ?? "?"}hp · ×${beltFoodTotal}`
                      : "belt empty"}
                  </div>
                </button>
              );
            })()}

            {/* Fill button — tap to fill, hold 1s to swap food type */}
            {(() => {
              const safeIdx = stockFood.length > 0 ? fillFoodIdx % stockFood.length : 0;
              const topStock = stockFood[safeIdx] ?? null;
              const def = topStock ? ARTISAN_FOOD_HEAL[topStock] : null;
              const stockQty = topStock ? ((game.artisan ?? {})[topStock] ?? 0) : 0;
              const fillAmt = topStock ? Math.min(beltCapacity - beltFoodTotal, stockQty) : 0;
              const canFill = topStock !== null && fillAmt > 0;
              const multiStock = stockFood.length > 1;

              function startHold(e) {
                e.stopPropagation();
                if (!multiStock) return;
                fillHoldFired.current = false;
                setFillHolding(true);
                fillHoldTimer.current = setTimeout(() => {
                  fillHoldFired.current = true;
                  setFillHolding(false);
                  setFillFoodIdx((prev) => {
                    const nextIdx = (prev + 1) % stockFood.length;
                    const nextFoodId = stockFood[nextIdx];
                    if (nextFoodId) onSetFillFood?.(adventurer.id, nextFoodId);
                    return nextIdx;
                  });
                }, 900);
              }
              function cancelHold(e) {
                e.stopPropagation();
                clearTimeout(fillHoldTimer.current);
                setFillHolding(false);
                // If the hold didn't fire, treat as a normal tap fill
                if (!fillHoldFired.current && canFill) {
                  for (let i = 0; i < fillAmt; i++) onGiveArtisanFood(adventurer.id, topStock);
                }
                fillHoldFired.current = false;
              }

              return (
                <button
                  onPointerDown={startHold}
                  onPointerUp={cancelHold}
                  onPointerLeave={(e) => { clearTimeout(fillHoldTimer.current); setFillHolding(false); fillHoldFired.current = false; e.stopPropagation(); }}
                  disabled={!canFill && stockFood.length === 0}
                  style={{
                    flex: 1, padding: "0.65rem 0.4rem",
                    position: "relative", overflow: "hidden",
                    background: fillHolding
                      ? "rgba(251,191,36,0.22)"
                      : canFill ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${fillHolding ? "rgba(251,191,36,0.7)" : canFill ? "rgba(251,191,36,0.35)" : "var(--border)"}`,
                    borderRadius: "10px",
                    color: canFill ? "#fbbf24" : "var(--muted)",
                    fontWeight: 700, fontSize: "0.72rem",
                    cursor: canFill || multiStock ? "pointer" : "default",
                    opacity: (canFill || multiStock) ? 1 : 0.4,
                    userSelect: "none", WebkitUserSelect: "none",
                    transition: "background 0.1s, border-color 0.1s",
                  }}
                >
                  {/* Hold-progress sweep overlay */}
                  {fillHolding && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(251,191,36,0.15)",
                      animation: "fillHoldSweep 0.9s linear forwards",
                      transformOrigin: "left center",
                      borderRadius: "10px",
                      pointerEvents: "none",
                    }} />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {def?.emoji ?? "🍞"} Fill
                    {multiStock && (
                      <span style={{ fontSize: "0.5rem", marginLeft: "3px", opacity: 0.65 }}>⇄</span>
                    )}
                  </span>
                  <div style={{ fontSize: "0.55rem", marginTop: "1px", opacity: 0.8, position: "relative", zIndex: 1 }}>
                    {fillHolding
                      ? `hold to swap…`
                      : canFill
                        ? `+${fillAmt} (${beltFoodTotal}/${beltCapacity})`
                        : beltFoodTotal >= beltCapacity ? `${beltFoodTotal}/${beltCapacity} full` : "no stock"}
                  </div>
                </button>
              );
            })()}

            {/* Buff slot button */}
            {buffSlot ? (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenHero(adventurer); }}
                style={{ flex: 1, padding: "0.65rem 0.4rem", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.5)", borderRadius: "10px", color: "#a78bfa", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}
              >
                {ADVENTURER_BUFF_ITEMS[buffSlot]?.emoji} Buffed
                <div style={{ fontSize: "0.55rem", color: "rgba(139,92,246,0.7)", marginTop: "1px" }}>{ADVENTURER_BUFF_ITEMS[buffSlot]?.name}</div>
              </button>
            ) : availableBuffs.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onGiveBuffItem(adventurer.id, availableBuffs[0]); }}
                style={{ flex: 1, padding: "0.65rem 0.4rem", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "10px", color: "#a78bfa", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}
              >
                {ADVENTURER_BUFF_ITEMS[availableBuffs[0]]?.emoji} Buff
                <div style={{ fontSize: "0.55rem", color: "rgba(139,92,246,0.5)", marginTop: "1px" }}>×{(game.animalGoods ?? {})[availableBuffs[0]] ?? 0} stock</div>
              </button>
            )}
          </div>

          {/* Tavern rest button */}
          {tavernBuilt && !isResting && (
            <button
              onClick={(e) => { e.stopPropagation(); onAssignTavern?.(adventurer.id); }}
              style={{
                margin: "0 0.9rem 0.5rem",
                padding: "0.45rem 0.5rem",
                background: "rgba(234,179,8,0.08)",
                border: "1px solid rgba(234,179,8,0.25)",
                borderRadius: "8px",
                color: "#fbbf24",
                fontWeight: 600,
                fontSize: "0.65rem",
                cursor: "pointer",
                width: "calc(100% - 1.8rem)",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>🍺</span>
              <span>Rest at Tavern</span>
              <span style={{ marginLeft: "auto", fontSize: "0.58rem", color: "rgba(234,179,8,0.6)" }}>
                {tavernWorkers === 0 ? "HP regen" : tavernMode === "jam" && tavernStocked ? "HP + XP" : tavernMode === "fish_pie" && tavernStocked ? "HP + Buff" : "HP regen"}
              </span>
            </button>
          )}
          {tavernBuilt && isResting && (
            <div style={{
              margin: "0 0.9rem 0.5rem",
              padding: "0.45rem 0.7rem",
              background: "rgba(234,179,8,0.12)",
              border: "1px solid rgba(234,179,8,0.4)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{ fontSize: "0.85rem" }}>🍺</span>
              <div style={{ flex: 1, fontSize: "0.62rem" }}>
                <span style={{ fontWeight: 700, color: "#fbbf24" }}>Resting at Tavern</span>
                {tavernBuff && (
                  <span style={{ marginLeft: "0.4rem", fontSize: "0.58rem", color: "#a78bfa" }}>· buff ready!</span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveTavern?.(adventurer.id); }}
                style={{ fontSize: "0.6rem", padding: "0.15rem 0.5rem", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--muted)", cursor: "pointer" }}
              >
                Leave
              </button>
            </div>
          )}

          {/* Potion count row for auto battle */}
          {autoBattleMode && (
  <div style={{ padding: "0.3rem 0.9rem", borderBottom: "1px solid var(--border)", display: "flex", gap: "0.75rem", fontSize: "0.62rem", color: "var(--muted)" }}>
    <span>🍞 Belt food: <strong style={{ color: beltFoodTotal > 0 ? "#4ade80" : "#ef4444" }}>{beltFoodTotal}</strong></span>
    {beltFoodTotal === 0 && <span style={{ color: "#ef4444" }}>⚠ Need belt food to auto battle</span>}
  </div>
)}

          {/* Collapsible zone header */}
          <button
            onClick={() => setZonesOpen((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.9rem", background: "none", border: "none", cursor: "pointer", borderBottom: zonesOpen ? "1px solid var(--border)" : "none" }}
          >
            <span style={{ fontSize: "0.62rem", color: "var(--muted)", letterSpacing: "0.06em", fontWeight: 600 }}>
              ZONES {selectedZone ? `· ${selectedZone.emoji} ${selectedZone.name}` : ""}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{zonesOpen ? "▲" : "▼"}</span>
          </button>

          {zonesOpen && (
            <div style={{ padding: "0.65rem 0.9rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {availableZones.map((zone) => {
                  const clears = game.worldZoneClears?.[zone.id] ?? 0;
                  const cleared = clears >= zone.clearsNeeded;
                  const failPct = getFailChance(adventurer, zone);
                  const dur = getMissionDuration(adventurer, zone);
                  const isSelected = selectedZoneId === zone.id;
                  return (
                    <button key={zone.id} onClick={() => setSelectedZoneId(isSelected ? null : zone.id)} style={{ textAlign: "left", padding: "0.45rem 0.6rem", background: isSelected ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)", border: isSelected ? "1px solid rgba(99,102,241,0.5)" : "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{zone.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{zone.name}</span>
                          {cleared && <span style={{ fontSize: "0.55rem", color: "#4ade80", fontWeight: 700 }}>✓</span>}
                          <span style={{ fontSize: "0.58rem", color: "#a78bfa", fontWeight: 600 }}>{dur}s</span>
                        </div>
                        <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>
                          {cleared ? "Cleared" : `${clears}/${zone.clearsNeeded} clears`}
                          {zone.enemyName && <span style={{ color: "#ef4444", marginLeft: "0.35rem" }}>vs {zone.enemyName}</span>}
                        </div>
                        {zone.loot && zone.loot.length > 0 && (
                          <div style={{ fontSize: "0.55rem", color: "var(--muted)", marginTop: "1px" }}>
                            🎒 {zone.loot.slice(0, 3).map(l => `${l.emoji ?? ""} ${l.name ?? l.resourceKey}`).join(", ")}{zone.loot.length > 3 ? ` +${zone.loot.length - 3} more` : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                        {Array.from({ length: Math.min(zone.clearsNeeded, 8) }).map((_, i) => (
                          <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: i < clears ? "#4ade80" : "rgba(255,255,255,0.12)" }} />
                        ))}
                      </div>
                      {failPct > 0 && <span style={{ fontSize: "0.58rem", fontWeight: 700, flexShrink: 0, color: failPct >= 50 ? "#ef4444" : "#fbbf24" }}>{failPct}%✗</span>}
                    </button>
                  );
                })}
                {lockedZones.map((zone) => {
                  const heroLevel = adventurer?.level ?? 1;
                  const levelLocked = zone.heroLevelRequired && heroLevel < zone.heroLevelRequired;
                  const prereqZone = WORLD_ZONES[zone.unlockRequiresZone];
                  const prereqClears = game.worldZoneClears?.[zone.unlockRequiresZone] ?? 0;
                  const lockLabel = levelLocked
                    ? `Reach level ${zone.heroLevelRequired} to unlock (you are ${heroLevel})`
                    : prereqZone
                    ? `${prereqZone.name}: ${prereqClears}/${zone.unlockAfterClears} clears`
                    : "Locked";
                  return (
                    <div key={zone.id} style={{ padding: "0.45rem 0.6rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px", opacity: 0.5, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", filter: "grayscale(1)" }}>{zone.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)" }}>{zone.name}</div>
                        <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>🔒 {lockLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main WorldZone ────────────────────────────────────────────────────────────

// ─── Boss Tab ─────────────────────────────────────────────────────────────────

function BossHpBar({ hp, maxHp }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct > 60 ? "#ef4444" : pct > 30 ? "#f97316" : "#fbbf24";
  return (
    <div style={{ height: "14px", background: "rgba(255,255,255,0.08)", borderRadius: "7px", overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "7px", transition: "width 0.4s" }} />
    </div>
  );
}

function BossHeroSlot({ adventurer, game, onUnassign, onUseAbility, onRevive, onUseArtisanFood }) {
  const cls = adventurer.heroClass ?? adventurer.class ?? null;
  const classMeta = (cls ? HERO_CLASS_META[cls] : null) ?? { name: "Adventurer", emoji: "🧭", color: "#94a3b8" };
  const abilityDef = BOSS_ABILITIES[cls] ?? null;
  const ability = adventurer.bossFightAbility ?? {};
  const cooldownLeft = Math.max(0, Math.ceil(ability.cooldownRemaining ?? 0));
  const abilityReady = cooldownLeft === 0;
  const maxHp = adventurer.maxHp ?? (40 + ((adventurer.level ?? 1) - 1) * 8);
  const hp = adventurer.hp ?? maxHp;
  const dead = hp <= 0;
  const reviveCost = Math.max(1, adventurer.prestigeLevel ?? 0) * 100;
  const canAffordRevive = (game.cash ?? 0) >= reviveCost;

  return (
    <div style={{
      background: dead ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${dead ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
      borderRadius: "12px",
      padding: "0.65rem 0.75rem",
      marginBottom: "0.5rem",
    }}>
      {/* Hero header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
        <span style={{ fontSize: "1.3rem" }}>{dead ? "💀" : classMeta.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{adventurer.name}</div>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
            {classMeta.name ?? cls} · Lv.{adventurer.level ?? 1}
          </div>
        </div>
        <button
          onClick={() => onUnassign(adventurer.id)}
          style={{ fontSize: "0.62rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--muted)", cursor: "pointer" }}
        >
          Leave
        </button>
      </div>

      {/* HP bar */}
      {!dead ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.45rem" }}>
          <span style={{ fontSize: "0.6rem", color: "var(--muted)", whiteSpace: "nowrap" }}>❤️ {Math.floor(hp)}/{maxHp}</span>
          <HpBar hp={hp} maxHp={maxHp} height={6} />
        </div>
      ) : (
        <div style={{ marginBottom: "0.45rem" }}>
          <button
            onClick={() => onRevive(adventurer.id)}
            disabled={!canAffordRevive}
            style={{
              width: "100%", padding: "0.3rem 0.5rem",
              background: canAffordRevive ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${canAffordRevive ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
              borderRadius: "7px", color: canAffordRevive ? "#ef4444" : "var(--muted)",
              fontWeight: 700, fontSize: "0.72rem", cursor: canAffordRevive ? "pointer" : "default",
            }}
          >
            ❤️ Revive · ${reviveCost}
          </button>
        </div>
      )}

      {/* Ability button */}
      {abilityDef && !dead && (
        <button
          onClick={() => abilityReady && onUseAbility(adventurer.id)}
          disabled={!abilityReady}
          style={{
            width: "100%", padding: "0.35rem 0.5rem",
            background: abilityReady ? `${classMeta.color}22` : "rgba(255,255,255,0.04)",
            border: `1px solid ${abilityReady ? classMeta.color + "80" : "var(--border)"}`,
            borderRadius: "8px",
            color: abilityReady ? classMeta.color : "var(--muted)",
            fontWeight: 700, fontSize: "0.7rem",
            cursor: abilityReady ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>{abilityDef.emoji} {abilityDef.name}</span>
          {!abilityReady
            ? <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{cooldownLeft}s</span>
            : <span style={{ fontSize: "0.6rem" }}>READY</span>
          }
        </button>
      )}

      {/* Food belt — compact heal row */}
      {!dead && (() => {
        const foodBelt = adventurer.foodBelt ?? {};
        const beltItems = ARTISAN_FOOD_LIST.filter((id) => (foodBelt[id] ?? 0) > 0);
        const beltTotal = Object.values(foodBelt).reduce((s, v) => s + v, 0);
        const firstBeltFood = beltItems[0] ?? null;
        const firstBeltDef = firstBeltFood ? ARTISAN_FOOD_HEAL[firstBeltFood] : null;
        const atFullHp = hp >= maxHp;
        const canHeal = firstBeltFood !== null && !atFullHp;
        return (
          <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
            {/* Belt summary */}
            <span style={{ fontSize: "0.58rem", color: "var(--muted)" }}>
              🍞 {beltTotal > 0 ? `×${beltTotal}` : "empty"}
            </span>
            {/* Heal button */}
            <button
              onClick={() => canHeal && onUseArtisanFood(adventurer.id, firstBeltFood)}
              disabled={!canHeal}
              style={{
                fontSize: "0.6rem", padding: "2px 7px", borderRadius: "5px", cursor: canHeal ? "pointer" : "default",
                background: canHeal ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${canHeal ? "rgba(74,222,128,0.35)" : "var(--border)"}`,
                color: canHeal ? "#4ade80" : "var(--muted)",
              }}
            >
              {firstBeltDef?.emoji ?? "🍞"} Heal {firstBeltDef ? `+${firstBeltDef.healAmount}` : ""}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function BossVictoryOverlay({ result, bossDef, onAcknowledge }) {
  if (!result) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{
        background: "var(--bg-elev)",
        border: "1px solid rgba(251,191,36,0.5)",
        borderRadius: "20px", padding: "2rem 1.5rem",
        maxWidth: "320px", width: "100%",
        textAlign: "center",
        boxShadow: "0 0 60px rgba(251,191,36,0.2)",
      }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🏆</div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fbbf24", marginBottom: "0.25rem" }}>Boss Defeated!</div>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.25rem" }}>{bossDef?.name ?? "Boss"}</div>

        <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "12px", padding: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: "0.35rem", letterSpacing: "0.05em" }}>DROPS</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "0.9rem", fontWeight: 700, color: "#fbbf24" }}>
            <span>💠</span>
            <span>+{result.dropAmount} Titan Core</span>
          </div>
        </div>

        {/* Hero XP results */}
        {result.heroResults && result.heroResults.length > 0 && (
          <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "12px", padding: "0.6rem 0.75rem", marginBottom: "0.75rem", textAlign: "left" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>HERO XP</div>
            {result.heroResults.map((r) => (
              <div key={r.heroId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <div style={{ fontSize: "0.75rem", color: r.qualified ? "var(--fg)" : "var(--muted)", fontWeight: 600 }}>
                  {r.heroName}
                  {r.leveledUp && <span style={{ marginLeft: "0.3rem", color: "#fbbf24", fontSize: "0.65rem" }}>⬆️ Lv.{r.newLevel}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {r.qualified ? (
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80" }}>+{r.xpGained} XP</span>
                  ) : (
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontStyle: "italic" }}>no XP ({r.participationPct}%)</span>
                  )}
                  <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, r.participationPct)}%`, background: r.qualified ? "#4ade80" : "#ef4444", borderRadius: "2px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: "0.72rem", color: "#4ade80", marginBottom: "1rem" }}>
          🏘️ +10% town satisfaction for 2 pulses
        </div>

        {result.nextBossId ? (() => {
          // For infinite bosses, generate the def on the fly for the name
          const nextDef = BOSS_DEFS[result.nextBossId] ?? (() => {
            const m = /^infinite_(\d+)$/.exec(result.nextBossId);
            return m ? generateInfiniteBoss(parseInt(m[1], 10)) : null;
          })();
          const waveLabel = nextDef?.infiniteWave ? ` (Wave ${nextDef.infiniteWave})` : "";
          return (
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "1rem" }}>
              Next boss: <strong style={{ color: nextDef?.color ?? "var(--fg)" }}>{nextDef?.emoji} {nextDef?.name}{waveLabel}</strong>
            </div>
          );
        })() : (
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "1rem" }}>More bosses coming soon.</div>
        )}

        <button
          onClick={onAcknowledge}
          style={{ width: "100%", padding: "0.7rem", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.5)", borderRadius: "12px", color: "#fbbf24", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function BossTab({ game, adventurers, bossFight, bossDef, onAssign, onUnassign, onUseAbility, onAcknowledge, onRevive, onGiveArtisanFood, onUseArtisanFood }) {
  if (!bossFight) {
    // Boss not yet unlocked
    const maxLevel = Math.max(...adventurers.map((a) => a.level ?? 1), 0);
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>👹</div>
        <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--fg)" }}>Boss Fights Locked</div>
        <div style={{ fontSize: "0.78rem" }}>
          Get a hero to level {BOSS_UNLOCK_LEVEL} to summon the first boss.
        </div>
        <div style={{ marginTop: "0.75rem", fontSize: "0.72rem" }}>
          Highest hero: <strong style={{ color: "var(--fg)" }}>Lv.{maxLevel}</strong> / {BOSS_UNLOCK_LEVEL}
        </div>
        <div style={{ marginTop: "0.5rem", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", maxWidth: "200px", margin: "0.5rem auto 0" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (maxLevel / BOSS_UNLOCK_LEVEL) * 100)}%`, background: "var(--accent)", borderRadius: "3px" }} />
        </div>
      </div>
    );
  }

  const assignedIds = bossFight.assignedHeroIds ?? [];
  const assignedHeroes = adventurers.filter((a) => assignedIds.includes(a.id));
  const availableHeroes = adventurers.filter((a) => !a.bossAssigned && !a.mission && (a.hp ?? a.maxHp ?? 40) > 0);
  const deadUnassigned = adventurers.filter((a) => !a.bossAssigned && !a.mission && (a.hp ?? a.maxHp ?? 40) <= 0);

  const phase = bossFight.phase; // "idle" | "fighting" | "defeated"
  const bossHp = bossFight.bossHp ?? 0;
  const bossMaxHp = bossFight.bossMaxHp ?? 1;
  const bossHpPct = Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100));

  const livingAssigned = assignedHeroes.filter((a) => (a.hp ?? 0) > 0);
  const deadAssigned = assignedHeroes.filter((a) => (a.hp ?? 0) <= 0);

  // Tick progress bar (resets every BOSS_TICK_INTERVAL seconds)
  const tickAccum = bossFight.tickAccum ?? 0;
  const tickPct = (tickAccum / BOSS_TICK_INTERVAL) * 100;

  return (
    <div>
      {/* Boss victory overlay */}
      {phase === "defeated" && bossFight.pendingResult && (
        <BossVictoryOverlay result={bossFight.pendingResult} bossDef={bossDef} onAcknowledge={onAcknowledge} />
      )}

      {/* ── Boss card ── */}
      <div style={{
        background: "rgba(239,68,68,0.05)",
        border: `2px solid ${phase === "fighting" ? "rgba(239,68,68,0.45)" : phase === "defeated" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "16px",
        padding: "1.25rem",
        marginBottom: "1rem",
        textAlign: "center",
      }}>
        {/* Boss emoji */}
        <div style={{
          fontSize: "4rem", marginBottom: "0.4rem", lineHeight: 1,
          animation: phase === "fighting" && livingAssigned.length > 0 ? "bossShake 0.5s ease-in-out infinite" : "none",
        }}>
          {phase === "defeated" ? "💀" : (bossDef?.emoji ?? "👹")}
        </div>

        <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.1rem" }}>
          {phase === "defeated" ? "Defeated" : (bossDef?.name ?? "Boss")}
          {bossDef?.infiniteWave ? <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 500, marginLeft: "0.35rem" }}>Wave {bossDef.infiniteWave}</span> : null}
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.85rem" }}>
          {phase === "idle" ? "Waiting for heroes…" : phase === "fighting" ? `${Math.floor(bossHp).toLocaleString()} / ${bossMaxHp.toLocaleString()} HP` : "Boss has been slain"}
        </div>

        {/* Boss HP bar */}
        {phase !== "defeated" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.6rem", color: "#ef4444", fontWeight: 700 }}>HP</span>
            <BossHpBar hp={bossHp} maxHp={bossMaxHp} />
            <span style={{ fontSize: "0.6rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{Math.round(bossHpPct)}%</span>
          </div>
        )}

        {/* Attack tick progress */}
        {phase === "fighting" && livingAssigned.length > 0 && (
          <div style={{ marginBottom: "0.3rem" }}>
            <div style={{ fontSize: "0.55rem", color: "var(--muted)", marginBottom: "0.2rem" }}>Next exchange in {Math.max(0, Math.ceil(BOSS_TICK_INTERVAL - (bossFight.tickAccum ?? 0)))}s</div>
            <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${tickPct}%`, background: "#ef4444", borderRadius: "2px", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Boss description */}
        {phase === "idle" && (
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontStyle: "italic" }}>
            {bossDef?.description ?? ""}
          </div>
        )}

        {/* Drops preview */}
        {phase !== "defeated" && bossDef && (
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.75rem", fontSize: "0.65rem", color: "var(--muted)" }}>
            <span>💠 Drops {bossDef.dropAmount}× Titan Core</span>
            <span>🏘️ +{bossDef.townSatisfactionBonus}% sat ({bossDef.townSatBonusPulses} pulses)</span>
          </div>
        )}
      </div>

      {/* ── Assigned heroes ── */}
      {assignedHeroes.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
            ⚔️ IN BATTLE ({assignedHeroes.length})
          </div>
          {assignedHeroes.map((adv) => (
            <BossHeroSlot
              key={adv.id}
              adventurer={adv}
              game={game}
              onUnassign={onUnassign}
              onUseAbility={onUseAbility}
              onRevive={onRevive}
              onGiveArtisanFood={onGiveArtisanFood}
              onUseArtisanFood={onUseArtisanFood}
            />
          ))}
        </div>
      )}

      {/* ── Ability legend ── */}
      {assignedHeroes.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.6rem 0.75rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>ABILITIES</div>
          {Object.values(BOSS_ABILITIES).map((ab) => (
            <div key={ab.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem", fontSize: "0.65rem" }}>
              <span>{ab.emoji}</span>
              <span><strong>{ab.name}</strong> — {ab.description} <span style={{ color: "var(--muted)" }}>({ab.cooldown}s cd)</span></span>
            </div>
          ))}
        </div>
      )}

      {/* ── Available heroes to send ── */}
      {phase !== "defeated" && availableHeroes.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em" }}>
              SEND TO BATTLE
            </div>
            {availableHeroes.length > 1 && (
              <button
                onClick={() => availableHeroes.forEach((a) => onAssign(a.id))}
                style={{
                  fontSize: "0.62rem", padding: "2px 10px", borderRadius: "8px", cursor: "pointer",
                  background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.45)",
                  color: "var(--accent)", fontWeight: 700,
                }}
              >
                ⚔️ Join All
              </button>
            )}
          </div>
          {availableHeroes.map((adv) => {
            const cls = adv.heroClass ?? adv.class ?? null;
            const classMeta = (cls ? HERO_CLASS_META[cls] : null) ?? { emoji: "🧭", name: "Adventurer" };
            const maxHp = adv.maxHp ?? (40 + ((adv.level ?? 1) - 1) * 8);
            const hp = adv.hp ?? maxHp;
            return (
              <button
                key={adv.id}
                onClick={() => onAssign(adv.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "0.65rem",
                  padding: "0.6rem 0.75rem", marginBottom: "0.4rem",
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: "12px", cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{classMeta.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{adv.name}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
                    {classMeta.name} · Lv.{adv.level ?? 1} · ❤️ {Math.floor(hp)}/{maxHp}
                  </div>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700 }}>+ Join</span>
              </button>
            );
          })}
        </div>
      )}

      {/* No heroes available message */}
      {phase !== "defeated" && availableHeroes.length === 0 && assignedHeroes.length === 0 && (
        <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)", fontSize: "0.78rem" }}>
          No heroes available. Heroes on missions or dead cannot join.
        </div>
      )}

      {/* Titan Core count */}
      {(game.worldResources?.titan_core ?? 0) > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "10px", fontSize: "0.72rem" }}>
          <span>💠</span>
          <span>Titan Core: <strong>{game.worldResources.titan_core}</strong></span>
          <span style={{ color: "var(--muted)", fontSize: "0.6rem" }}>· Used in T3 Forge recipes</span>
        </div>
      )}
    </div>
  );
}


export default function WorldZone({
  game,
  onSendAdventurer,
  onReturnAdventurer,
  onEquipAdventurer,
  onUnequipAdventurer,
  onGiveArtisanFood,
  onRemoveArtisanFood,
  onUseArtisanFood,
  onGiveBuffItem,
  onRemoveBuffItem,
  onHireAdventurer,
  onSpendSkillPoint,
  onReviveAdventurer,
  onPrestigeAdventurer,
  onStartAutoBattle,
  onReturnAutoBattle,
  onRequestAutoBattleStop,
  autoBattleLootResult,
  onDismissAutoBattleLoot,
  onAssignHeroToBoss,
  onUnassignHeroFromBoss,
  onUseBossAbility,
  onAcknowledgeBossVictory,
  onReviveHeroInBossFight,
  onAssignHeroToTavern,
  onRemoveHeroFromTavern,
  onSetHeroFillFood,
}) {
  const [lootResult, setLootResult] = useState(null);
  const [heroModal, setHeroModal] = useState(null);
  const [worldTab, setWorldTab] = useState("heroes"); // "heroes" | "boss"

  const adventurers = game.adventurers ?? [];
  const zones = Object.values(WORLD_ZONES);

  // Population cap check
  const maxPop = game.maxPopulation ?? Infinity;
  const currentPop = (game.farmWorkers?.length ?? 0) + (game.townWorkers?.length ?? 0) + (game.adventurers?.length ?? 0);
  const popFull = currentPop >= maxPop;

  function handleReturn(adventurerId) {
    const result = onReturnAdventurer(adventurerId);
    if (result) setLootResult(result);
  }

  function handleReturnAutoBattle(adventurerId) {
    const result = onReturnAutoBattle?.(adventurerId);
    if (result) setLootResult(result);
  }

  const heroModalAdv = heroModal ? (adventurers.find((a) => a.id === heroModal.id) ?? null) : null;

  // Get used adventurer names to avoid repeats
  const usedNames = new Set(adventurers.map((a) => a.name));


  const bossFight = game.bossFight ?? null;
  const bossUnlocked = !!bossFight;
  const bossDef = bossFight ? (BOSS_DEFS[bossFight.bossId] ?? (() => {
    const m = /^infinite_(\d+)$/.exec(bossFight.bossId ?? "");
    return m ? generateInfiniteBoss(parseInt(m[1], 10)) : null;
  })()) : null;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } } @keyframes bossShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} } @keyframes fillHoldSweep { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: "0.85rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.15rem" }}>⚔️ World</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Send adventurers on missions or challenge a boss together.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem" }}>
        {["heroes", "boss"].map((tab) => {
          const labels = { heroes: "⚔️ Heroes", boss: bossUnlocked ? `👹 Boss` : "👹 Boss" };
          const active = worldTab === tab;
          const isBossLocked = tab === "boss" && !bossUnlocked;
          return (
            <button
              key={tab}
              onClick={() => !isBossLocked && setWorldTab(tab)}
              style={{
                flex: 1, padding: "0.45rem 0.5rem",
                background: active ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(99,102,241,0.55)" : "var(--border)"}`,
                borderRadius: "10px",
                color: isBossLocked ? "var(--muted)" : active ? "var(--accent)" : "var(--fg)",
                fontWeight: active ? 700 : 500,
                fontSize: "0.78rem",
                cursor: isBossLocked ? "default" : "pointer",
              }}
            >
              {labels[tab]}
              {tab === "boss" && !bossUnlocked && (
                <span style={{ fontSize: "0.6rem", marginLeft: "0.3rem", color: "var(--muted)" }}>· Lv{BOSS_UNLOCK_LEVEL}</span>
              )}
              {tab === "boss" && bossUnlocked && bossFight.phase === "fighting" && (
                <span style={{ fontSize: "0.6rem", marginLeft: "0.3rem", color: "#ef4444", animation: "pulse 1.5s ease-in-out infinite" }}>● LIVE</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── HEROES TAB ── */}
      {worldTab === "heroes" && (
        <>
          {[...adventurers].reverse().map((adv) => (
            <AdventurerCard
              key={adv.id}
              adventurer={adv}
              zones={zones}
              game={game}
              onSend={onSendAdventurer}
              onReturn={handleReturn}
              onOpenHero={setHeroModal}
              onGiveArtisanFood={onGiveArtisanFood}
              onUseArtisanFood={onUseArtisanFood}
              onGiveBuffItem={onGiveBuffItem}
              onRevive={onReviveAdventurer}
              onAssignTavern={onAssignHeroToTavern}
              onRemoveTavern={onRemoveHeroFromTavern}
              onStartAutoBattle={onStartAutoBattle}
              onReturnAutoBattle={handleReturnAutoBattle}
              onRequestStop={onRequestAutoBattleStop}
              onSetFillFood={onSetHeroFillFood}
            />
          ))}

          {/* Hire adventurer slot */}
          {(() => {
            const slotUnlocked = getAdventurerSlotUnlocked(game);
            const cost = getAdventurerSlotCost(game);
            const canAfford = (game.cash ?? 0) >= (cost ?? 0);
            const nextSeason = (game.adventurers ?? []).length + 1;
            if (cost === null) return null;
            if (!slotUnlocked) {
              return (
                <div style={{ width: "100%", marginTop: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", borderRadius: "12px", color: "var(--muted)", fontWeight: 600, fontSize: "0.82rem", textAlign: "center" }}>
                  🔒 Next hero slot unlocks Season {nextSeason} · ${cost?.toLocaleString()}
                </div>
              );
            }
            if (popFull) {
              return (
                <div style={{ width: "100%", marginTop: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(239,68,68,0.3)", borderRadius: "12px", color: "#ef4444", fontWeight: 600, fontSize: "0.82rem", textAlign: "center" }}>
                  🏘️ Population full · Build housing to hire more
                </div>
              );
            }
            return (
              <button
                onClick={() => onHireAdventurer(usedNames)}
                disabled={!canAfford}
                style={{
                  width: "100%", marginTop: "0.75rem", padding: "0.75rem",
                  background: canAfford ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${canAfford ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
                  borderRadius: "12px", color: canAfford ? "var(--accent)" : "var(--muted)",
                  fontWeight: 700, fontSize: "0.85rem", cursor: canAfford ? "pointer" : "default",
                }}
              >
                ⚔️ Hire Adventurer · ${cost?.toLocaleString()}
              </button>
            );
          })()}
        </>
      )}

      {/* ── BOSS TAB ── */}
      {worldTab === "boss" && (
        <BossTab
          game={game}
          adventurers={adventurers}
          bossFight={bossFight}
          bossDef={bossDef}
          onAssign={onAssignHeroToBoss}
          onUnassign={onUnassignHeroFromBoss}
          onUseAbility={onUseBossAbility}
          onAcknowledge={onAcknowledgeBossVictory}
          onRevive={onReviveHeroInBossFight}
          onGiveArtisanFood={onGiveArtisanFood}
          onUseArtisanFood={onUseArtisanFood}
        />
      )}

      <LootModal result={lootResult} onDismiss={() => setLootResult(null)} />

      {heroModalAdv && (
        <HeroModal
          adventurer={heroModalAdv}
          game={game}
          onClose={() => setHeroModal(null)}
          onEquip={onEquipAdventurer}
          onUnequip={onUnequipAdventurer}
          onGiveArtisanFood={onGiveArtisanFood}
          onRemoveArtisanFood={onRemoveArtisanFood}
          onUseArtisanFood={onUseArtisanFood}
          onGiveBuffItem={onGiveBuffItem}
          onRemoveBuffItem={onRemoveBuffItem}
          onSpendSkillPoint={onSpendSkillPoint}
          onPrestige={onPrestigeAdventurer}
          onRevive={onReviveAdventurer}
        />
      )}
    </div>
  );
}