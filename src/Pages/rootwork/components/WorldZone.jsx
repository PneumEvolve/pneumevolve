// src/Pages/rootwork/components/WorldZone.jsx
import React, { useState } from "react";
import { WORLD_ZONES, ADVENTURER_CLASSES, FORGE_RECIPES, CROP_POTION_RECIPES, CROP_POTION_LIST, ARTISAN_FOOD_HEAL, ARTISAN_FOOD_LIST, WORLD_RESOURCES, WORLD_WORKER_HIRE_COST, HERO_SKILLS } from "../gameConstants";
import { getAdventurerSlotCost, getAdventurerSlotUnlocked } from "../gameEngine";

function getAdventurerMaxHp(adventurer) {
  return 40 + ((adventurer.level ?? 1) - 1) * 8;
}
function getMissionDuration(adventurer, zone) {
  const base = zone.baseDuration ?? 30;
  const gearBonus = (adventurer.gear ?? 0) * 0.15;
  const lvlBonus = ((adventurer.level ?? 1) - 1) * 0.08;
  return Math.round(base * (1 - Math.min(gearBonus + lvlBonus, 0.75)));
}
function getFailChance(adventurer, zone) {
  const gearScore = (adventurer.gear ?? 0) + (adventurer.level ?? 1);
  const required = zone.gearRequired ?? 0;
  if (gearScore >= required + 2) return 0;
  if (gearScore >= required) return 5;
  if (gearScore >= required - 1) return 30;
  return 65;
}
function getXpNeeded(level) { return Math.floor(10 * Math.pow(1.4, level - 1)); }
function isZoneUnlocked(zone, worldZoneClears) {
  if (!zone.unlockRequiresZone) return true;
  return (worldZoneClears?.[zone.unlockRequiresZone] ?? 0) >= zone.unlockAfterClears;
}

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
  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-elev)", border: `1px solid ${result.failed ? "rgba(239,68,68,0.4)" : result.zoneCleared ? "rgba(251,191,36,0.4)" : "rgba(74,222,128,0.3)"}`,
        borderRadius: "18px", padding: "1.5rem", maxWidth: "320px", width: "100%",
        boxShadow: result.zoneCleared ? "0 0 40px rgba(251,191,36,0.2)" : "none",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.4rem" }}>{result.failed ? "💀" : result.zoneCleared ? "🏆" : "🎒"}</div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{result.failed ? "Mission Failed" : result.zoneCleared ? "Zone Cleared!" : "Mission Complete"}</div>
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
        {/* Loot */}
        {!result.failed && (result.loot?.length ?? 0) > 0 && (
          <div style={{ marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.35rem", letterSpacing: "0.05em" }}>LOOT</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {result.loot.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                  <span>{l.emoji}</span><span style={{ fontWeight: 700 }}>+{l.amount}</span><span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.72rem" }}>
          <span style={{ color: "#a78bfa" }}>✨ +{result.xpGained ?? 0} XP</span>
          {result.leveledUp && <span style={{ color: "#fbbf24", fontWeight: 700 }}>⬆️ LEVEL UP!</span>}
          {result.zoneCleared && <span style={{ color: "#fbbf24", fontSize: "0.65rem" }}>Worker slot unlocked!</span>}
        </div>
        <button onClick={onDismiss} style={{ width: "100%", padding: "0.65rem", background: result.failed ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)", border: `1px solid ${result.failed ? "rgba(239,68,68,0.4)" : "rgba(74,222,128,0.4)"}`, borderRadius: "10px", color: result.failed ? "#ef4444" : "#4ade80", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
          {result.failed ? "Try Again" : "Continue"}
        </button>
      </div>
    </div>
  );
}


// ─── Skill Tree ───────────────────────────────────────────────────────────────
function SkillTree({ adventurer, onSpendSkillPoint }) {
  const skills = adventurer.skills ?? [];
  const skillPoints = adventurer.skillPoints ?? 0;
  const level = adventurer.level ?? 1;

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em" }}>🌟 SKILL TREE</div>
        <div style={{
          fontSize: "0.62rem", fontWeight: 700,
          padding: "2px 8px", borderRadius: "999px",
          background: skillPoints > 0 ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${skillPoints > 0 ? "rgba(251,191,36,0.5)" : "var(--border)"}`,
          color: skillPoints > 0 ? "#fbbf24" : "var(--muted)",
        }}>
          {skillPoints} point{skillPoints !== 1 ? "s" : ""} available
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {HERO_SKILLS.map((skill, idx) => {
          const unlocked = skills.includes(skill.id);
          const prevUnlocked = idx === 0 || skills.includes(HERO_SKILLS[idx - 1].id);
          const meetsLevel = level >= skill.requiredLevel;
          const canBuy = !unlocked && prevUnlocked && skillPoints > 0 && meetsLevel;
          const locked = !unlocked && (!prevUnlocked || !meetsLevel);

          return (
            <div key={skill.id} style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.45rem 0.65rem", borderRadius: "8px",
              background: unlocked ? "rgba(99,102,241,0.12)" : canBuy ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${unlocked ? "rgba(99,102,241,0.4)" : canBuy ? "rgba(251,191,36,0.3)" : "var(--border)"}`,
              opacity: locked ? 0.45 : 1,
            }}>
              <div style={{ fontSize: "1.15rem", lineHeight: 1, flexShrink: 0 }}>{skill.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: unlocked ? "#a78bfa" : canBuy ? "#fbbf24" : "var(--text)" }}>
                  {skill.name}
                  {skill.id === "auto_battle" && <span style={{ fontSize: "0.58rem", marginLeft: "0.35rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "4px", padding: "1px 5px" }}>KEY</span>}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--muted)", lineHeight: 1.4 }}>{skill.description} · Req. Lv.{skill.requiredLevel}</div>
              </div>
              {unlocked ? (
                <div style={{ fontSize: "0.75rem", color: "#4ade80", flexShrink: 0 }}>✓</div>
              ) : canBuy ? (
                <button
                  onClick={() => onSpendSkillPoint(adventurer.id, skill.id)}
                  style={{ fontSize: "0.6rem", padding: "3px 9px", borderRadius: "6px", cursor: "pointer", flexShrink: 0, background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24", fontWeight: 700 }}
                >
                  Unlock
                </button>
              ) : (
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", flexShrink: 0 }}>
                  {!meetsLevel ? `Lv.${skill.requiredLevel}` : "🔒"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hero Modal ────────────────────────────────────────────────────────────────
function HeroModal({ adventurer, game, onClose, onEquip, onUnequip, onUsePotion, onGivePotion, onRemovePotion, onGiveArtisanFood, onRemoveArtisanFood, onUseArtisanFood, onSpendSkillPoint }) {
  const cls = ADVENTURER_CLASSES[adventurer.class] ?? ADVENTURER_CLASSES.fighter;
  const maxHp = adventurer.maxHp ?? getAdventurerMaxHp(adventurer);
  const hp = adventurer.hp ?? maxHp;
  const xpNeeded = getXpNeeded(adventurer.level ?? 1);
  const xpPct = ((adventurer.xp ?? 0) / xpNeeded) * 100;

  const equippable = Object.values(FORGE_RECIPES).filter(
    (r) => r.category !== "consumable" && ((game.forgeGoods ?? {})[r.output.resourceKey] ?? 0) > 0
  );
  const equippedRecipe = adventurer.equippedItem
    ? Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === adventurer.equippedItem)
    : null;

  const beltPotions = Object.entries(adventurer.potions ?? {}).filter(([, qty]) => qty > 0);
  const stockPotions = CROP_POTION_LIST.filter((id) => (game.cropPotions ?? {})[id] > 0);
  const beltTotal = beltPotions.reduce((s, [, qty]) => s + qty, 0);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "18px 18px 0 0", padding: "1.25rem 1rem 2.5rem", width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "2.2rem", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "10px", padding: "0.3rem 0.45rem" }}>{cls.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>{adventurer.name}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{cls.name} · Lv.{adventurer.level ?? 1}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0.25rem 0.5rem" }}>✕</button>
        </div>

        {/* HP */}
        <div style={{ padding: "0.65rem 0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)" }}>❤️ HEALTH</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: hp / maxHp > 0.6 ? "#4ade80" : hp / maxHp > 0.3 ? "#fbbf24" : "#ef4444" }}>{Math.floor(hp)}/{maxHp}</span>
          </div>
          <HpBar hp={hp} maxHp={maxHp} height={10} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.35rem", fontSize: "0.58rem", color: "var(--muted)" }}>
            <span>XP: {adventurer.xp ?? 0}/{xpNeeded}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: "70px", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${xpPct}%`, background: "#a78bfa", borderRadius: "2px" }} />
              </div>
              <span style={{ color: "#a78bfa" }}>Lv.{adventurer.level ?? 1}</span>
            </div>
          </div>
        </div>

        {/* Gear */}
        <div style={{ marginBottom: "0.85rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>⚔️ EQUIPPED GEAR</div>
          {equippedRecipe ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.65rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{equippedRecipe.emoji}</span>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>{equippedRecipe.name}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{equippedRecipe.description}</div>
                </div>
              </div>
              <button onClick={() => onUnequip(adventurer.id)} style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: "5px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer" }}>Remove</button>
            </div>
          ) : (
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", padding: "0.5rem 0.65rem", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", borderRadius: "8px" }}>No gear equipped.</div>
          )}
          {equippable.length > 0 && (
            <div style={{ marginTop: "0.4rem" }}>
              <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginBottom: "0.3rem" }}>AVAILABLE FROM FORGE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {equippable.map((r) => {
                  const key = r.output.resourceKey;
                  const qty = (game.forgeGoods ?? {})[key] ?? 0;
                  const isOn = adventurer.equippedItem === key;
                  return (
                    <button key={key} onClick={() => !isOn && onEquip(adventurer.id, key)} style={{ fontSize: "0.67rem", padding: "2px 9px", borderRadius: "6px", cursor: isOn ? "default" : "pointer", background: isOn ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${isOn ? "rgba(251,191,36,0.5)" : "var(--border)"}`, color: isOn ? "#fbbf24" : "var(--text)", fontWeight: isOn ? 700 : 400 }}>
                      {r.emoji} {r.name} ×{qty}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Potion belt */}
        <div style={{ marginBottom: "0.85rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>🧪 POTION BELT ({beltTotal}/3)</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", minHeight: "32px", marginBottom: "0.35rem" }}>
            {beltPotions.length === 0 && <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Belt empty — add potions from stock.</span>}
            {beltPotions.map(([key, qty]) => {
              const recipe = CROP_POTION_RECIPES[key];
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "8px", padding: "0.2rem 0.5rem" }}>
                  <span style={{ fontSize: "0.9rem" }}>{recipe?.emoji}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>×{qty}</span>
                  <button onClick={() => onUsePotion(adventurer.id, key)} style={{ fontSize: "0.58rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", cursor: "pointer" }}>Use</button>
                  <button onClick={() => onRemovePotion(adventurer.id, key)} style={{ fontSize: "0.58rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer" }}>−</button>
                </div>
              );
            })}
          </div>
          {stockPotions.length > 0 && beltTotal < 3 && (
            <div>
              <div style={{ fontSize: "0.58rem", color: "var(--muted)", marginBottom: "0.3rem" }}>ADD FROM STOCK</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {stockPotions.map((id) => {
                  const recipe = CROP_POTION_RECIPES[id];
                  const qty = (game.cropPotions ?? {})[id] ?? 0;
                  return (
                    <button key={id} onClick={() => onGivePotion(adventurer.id, id)} style={{ fontSize: "0.67rem", padding: "2px 9px", borderRadius: "6px", cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
                      {recipe?.emoji} {recipe?.name} ×{qty}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Food Belt */}
        <div style={{ padding: "0.6rem 0.75rem", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "10px", marginBottom: "0.65rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--muted)", fontSize: "0.6rem", letterSpacing: "0.05em" }}>🍞 FOOD BELT <span style={{ color: "var(--muted)", fontWeight: 400 }}>(max 3 · auto-used on level up or tap)</span></div>
          {/* Equipped food */}
          {(() => {
            const foodBelt = adventurer.foodBelt ?? {};
            const beltItems = ARTISAN_FOOD_LIST.filter((id) => (foodBelt[id] ?? 0) > 0);
            const beltTotal = Object.values(foodBelt).reduce((s, v) => s + v, 0);
            const stockFood = ARTISAN_FOOD_LIST.filter((id) => ((game.artisan ?? {})[id] ?? 0) > 0);
            return (
              <>
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
                {stockFood.length > 0 && beltTotal < 3 && (
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
        <SkillTree adventurer={adventurer} onSpendSkillPoint={onSpendSkillPoint} />

        {/* Stats */}
        <div style={{ padding: "0.55rem 0.7rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "0.68rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.35rem", color: "var(--muted)", fontSize: "0.6rem", letterSpacing: "0.05em" }}>📊 COMBAT STATS</div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <span>⚔️ Gear Tier: <strong>{adventurer.gear ?? 0}</strong></span>
            <span>⏱ Speed Bonus: <strong>−{Math.round(((adventurer.level ?? 1) - 1) * 8)}%</strong></span>
            <span>❤️ Regen: <strong>+3 HP/min</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Cleared Zones ─────────────────────────────────────────────────────────────
function ClearedZones({ game, onHireWorldWorker, onFireWorldWorker }) {
  const zones = Object.values(WORLD_ZONES);
  const cleared = zones.filter((z) => (game.worldZoneClears?.[z.id] ?? 0) >= z.clearsNeeded);
  if (cleared.length === 0) return null;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>CLEARED ZONES — PASSIVE WORKERS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {cleared.map((zone) => {
          const assigned = (game.worldWorkers ?? []).find((w) => w.zoneId === zone.id);
          const resourceKey = Object.keys(WORLD_RESOURCES).find(
            (k) => WORLD_RESOURCES[k].name.toLowerCase() === zone.workerResource?.toLowerCase()
          ) ?? zone.loot?.[0]?.resourceKey;
          const stockpile = resourceKey ? ((game.worldResources ?? {})[resourceKey] ?? 0) : 0;
          const canAfford = (game.cash ?? 0) >= WORLD_WORKER_HIRE_COST;
          return (
            <div key={zone.id} style={{ padding: "0.6rem 0.75rem", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{zone.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>{zone.name}</div>
                  {assigned ? (
                    <div style={{ fontSize: "0.6rem", color: "#4ade80" }}>
                      ✓ Worker producing {zone.workerEmoji} {zone.workerResource} · {zone.workerYieldPerMinute}/min
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
                      No worker · hire for ${WORLD_WORKER_HIRE_COST}
                    </div>
                  )}
                </div>
                {assigned ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fbbf24" }}>{zone.workerEmoji} ×{stockpile}</div>
                    <button onClick={() => onFireWorldWorker(zone.id)} style={{ fontSize: "0.55rem", padding: "2px 7px", borderRadius: "5px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", cursor: "pointer" }}>
                      Fire
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onHireWorldWorker(zone.id)}
                    disabled={!canAfford}
                    style={{ fontSize: "0.65rem", padding: "0.3rem 0.6rem", borderRadius: "7px", background: canAfford ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${canAfford ? "rgba(74,222,128,0.4)" : "var(--border)"}`, color: canAfford ? "#4ade80" : "var(--muted)", cursor: canAfford ? "pointer" : "default", fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    Hire $200
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Adventurer Card ──────────────────────────────────────────────────────────
function AdventurerCard({ adventurer, zones, game, onSend, onReturn, onOpenHero }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const cls = ADVENTURER_CLASSES[adventurer.class] ?? ADVENTURER_CLASSES.fighter;
  const isOnMission = !!adventurer.mission;
  const mission = adventurer.mission;
  const elapsed = isOnMission ? Math.min((Date.now() - mission.startTime) / 1000, mission.duration) : 0;
  const progress = isOnMission ? elapsed / mission.duration : 0;
  const done = isOnMission && elapsed >= mission.duration;
  const xpNeeded = getXpNeeded(adventurer.level ?? 1);
  const xpPct = ((adventurer.xp ?? 0) / xpNeeded) * 100;
  const maxHp = adventurer.maxHp ?? getAdventurerMaxHp(adventurer);
  const hp = adventurer.hp ?? maxHp;
  const availableZones = zones.filter((z) => isZoneUnlocked(z, game.worldZoneClears));
  const lockedZones = zones.filter((z) => !isZoneUnlocked(z, game.worldZoneClears));

  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", marginBottom: "0.75rem" }}>
      {/* Header — tap to open hero modal */}
      <button onClick={() => onOpenHero(adventurer)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0.9rem 0.6rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ fontSize: "2rem", lineHeight: 1, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "10px", padding: "0.3rem 0.45rem" }}>{cls.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{adventurer.name}</span>
            <span style={{ fontSize: "0.62rem", color: "var(--muted)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "999px" }}>{cls.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem" }}>
            <span style={{ fontSize: "0.6rem", color: "#a78bfa", fontWeight: 700 }}>Lv.{adventurer.level ?? 1}</span>
            <div style={{ width: "50px", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}><div style={{ height: "100%", width: `${xpPct}%`, background: "#a78bfa" }} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.2rem" }}>
            <span style={{ fontSize: "0.55rem", color: "#ef4444" }}>❤️</span>
            <HpBar hp={hp} maxHp={maxHp} height={4} />
            <span style={{ fontSize: "0.55rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{Math.floor(hp)}/{maxHp}</span>
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "0.52rem", color: "var(--muted)", marginBottom: "1px" }}>GEAR</div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: (adventurer.gear ?? 0) === 0 ? "var(--muted)" : "#fbbf24", background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px 7px" }}>{(adventurer.gear ?? 0) === 0 ? "None" : `T${adventurer.gear}`}</div>
          <div style={{ fontSize: "0.48rem", color: "var(--muted)", marginTop: "2px" }}>tap to manage</div>
        </div>
      </button>

      {/* Mission progress */}
      {isOnMission && (
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

      {/* Zone picker */}
      {!isOnMission && (
        <div style={{ padding: "0.65rem 0.9rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.4rem", letterSpacing: "0.06em" }}>SELECT ZONE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.55rem" }}>
            {availableZones.map((zone) => {
              const clears = game.worldZoneClears?.[zone.id] ?? 0;
              const cleared = clears >= zone.clearsNeeded;
              const failPct = getFailChance(adventurer, zone);
              const dur = getMissionDuration(adventurer, zone);
              const isSelected = selectedZone?.id === zone.id;
              return (
                <button key={zone.id} onClick={() => setSelectedZone(isSelected ? null : zone)} style={{ textAlign: "left", padding: "0.45rem 0.6rem", background: isSelected ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)", border: isSelected ? "1px solid rgba(99,102,241,0.5)" : "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>{zone.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{zone.name}</span>
                      {cleared && <span style={{ fontSize: "0.55rem", color: "#4ade80", fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>
                      {cleared ? `Cleared · ${dur}s` : `${clears}/${zone.clearsNeeded} clears · ${dur}s`}
                      {zone.enemyName && <span style={{ color: "#ef4444", marginLeft: "0.35rem" }}>vs {zone.enemyName}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                    {Array.from({ length: Math.min(zone.clearsNeeded, 6) }).map((_, i) => (
                      <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: i < clears ? "#4ade80" : "rgba(255,255,255,0.12)" }} />
                    ))}
                  </div>
                  {failPct > 0 && <span style={{ fontSize: "0.58rem", fontWeight: 700, flexShrink: 0, color: failPct >= 50 ? "#ef4444" : "#fbbf24" }}>{failPct}%</span>}
                </button>
              );
            })}
            {lockedZones.map((zone) => {
              const prereqZone = WORLD_ZONES[zone.unlockRequiresZone];
              const prereqClears = game.worldZoneClears?.[zone.unlockRequiresZone] ?? 0;
              return (
                <div key={zone.id} style={{ padding: "0.45rem 0.6rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px", opacity: 0.5, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", filter: "grayscale(1)" }}>{zone.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)" }}>{zone.name}</div>
                    <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>🔒 {prereqZone?.name} {prereqClears}/{zone.unlockAfterClears} clears to unlock</div>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedZone && (
            <button onClick={() => { onSend(adventurer.id, selectedZone.id); setSelectedZone(null); }} style={{ width: "100%", padding: "0.55rem", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", borderRadius: "8px", color: "var(--accent)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
              ⚔️ Send to {selectedZone.name} ({getMissionDuration(adventurer, selectedZone)}s)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main WorldZone ────────────────────────────────────────────────────────────
export default function WorldZone({ game, onSendAdventurer, onReturnAdventurer, onEquipAdventurer, onUnequipAdventurer, onUsePotionOnAdventurer, onGivePotion, onRemovePotion, onHireWorldWorker, onFireWorldWorker, onGiveArtisanFood, onRemoveArtisanFood, onUseArtisanFood, onHireAdventurer, onSpendSkillPoint }) {
  const [lootResult, setLootResult] = useState(null);
  const [heroModal, setHeroModal] = useState(null);

  const adventurers = game.adventurers ?? [];
  const zones = Object.values(WORLD_ZONES);

  function handleReturn(adventurerId) {
    const result = onReturnAdventurer(adventurerId);
    if (result) setLootResult(result);
  }

  const heroModalAdv = heroModal ? (adventurers.find((a) => a.id === heroModal.id) ?? null) : null;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.15rem" }}>⚔️ World</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Send adventurers to explore zones and gather resources.</p>
      </div>

      <ClearedZones game={game} onHireWorldWorker={onHireWorldWorker} onFireWorldWorker={onFireWorldWorker} />

      {adventurers.map((adv) => (
        <AdventurerCard key={adv.id} adventurer={adv} zones={zones} game={game} onSend={onSendAdventurer} onReturn={handleReturn} onOpenHero={setHeroModal} />
      ))}

      {/* Hire adventurer slot */}
      {(() => {
        const slotUnlocked = getAdventurerSlotUnlocked(game);
        const cost = getAdventurerSlotCost(game);
        const canAfford = (game.cash ?? 0) >= (cost ?? 0);
        const nextSeason = (game.adventurers ?? []).length + 1;
        if (cost === null) return null; // all slots filled
        if (!slotUnlocked) {
          return (
            <div style={{
              width: "100%", marginTop: "0.75rem", padding: "0.75rem",
              background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)",
              borderRadius: "12px", color: "var(--muted)", fontWeight: 600,
              fontSize: "0.82rem", textAlign: "center",
            }}>
              🔒 Next hero slot unlocks Season {nextSeason} · ${cost?.toLocaleString()}
            </div>
          );
        }
        return (
          <button
            onClick={() => onHireAdventurer()}
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

      <LootModal result={lootResult} onDismiss={() => setLootResult(null)} />

      {heroModalAdv && (
        <HeroModal adventurer={heroModalAdv} game={game} onClose={() => setHeroModal(null)}
          onEquip={onEquipAdventurer} onUnequip={onUnequipAdventurer}
          onUsePotion={onUsePotionOnAdventurer} onGivePotion={onGivePotion} onRemovePotion={onRemovePotion}
          onGiveArtisanFood={onGiveArtisanFood} onRemoveArtisanFood={onRemoveArtisanFood} onUseArtisanFood={onUseArtisanFood}
          onSpendSkillPoint={onSpendSkillPoint}
        />
      )}
    </div>
  );
}