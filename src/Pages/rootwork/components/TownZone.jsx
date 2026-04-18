// src/Pages/rootwork/components/TownZone.jsx
 
import React, { useState } from "react";
import {
  TOWN_HOME_CAPACITY, TOWN_PULSE_SECONDS, TOWN_JAM_BUILDING_COST,
  TOWN_SAUCE_BUILDING_COST, TOWN_SAT_WHEAT, TOWN_SAT_BAKERY,
  TOWN_SAT_BAKERY_JAM, TOWN_SAT_ALL_BUILDINGS, TOWN_HALL_MAX_LEVEL,
  TOWN_HALL_LEVEL_COSTS, TREASURY_TIERS, BUILDING_UPGRADE_COST,
  BUILDING_PULSE_EXTRA_SECONDS, BANK_BUILD_COST, BANK_LEVEL_COSTS,
  BANK_TIERS, BANK_MAX_LEVEL,
  ANIMAL_FOOD_COSTS, PET_FOOD_COST, BREAD_FOOD_UNITS,
  PERSON_IDLE_FOOD_COST, PERSON_WORKING_FOOD_COST,
} from "../gameConstants";
import {
  getTownHomeCost, getTownBakeryCost, getTotalWorkersHired,
  getAvailableWorkerSlots, getSatisfactionTarget, getTownHallLevel,
  getTreasuryBalance, getActiveTreasuryTier, getMaxTreasuryTier,
  getBuildingEffectivePulseCost, getBuildingUpgradeLevel,
  canUpgradeBuilding, getEffectivePulseSeconds, getBankLevel,
  isBankBuilt, canBuildBank, getActiveBankTier, getTreasuryGrowBonus,
  getBankPriceBonus,
} from "../gameEngine";
import SeasonPanel from "./SeasonPanel";
import StatsPanel from "./StatsPanel";
 
function clampPct(v) { return Math.max(0, Math.min(100, v)); }
 
function SatisfactionBar({ satisfaction }) {
  const pct = clampPct((satisfaction / 150) * 100);
  const color = satisfaction >= 110 ? "#4ade80" : satisfaction >= 100 ? "#a3e635" : satisfaction >= 75 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 0.4s ease" }} />
    </div>
  );
}
 
function ToggleButton({ on, onToggle, labelOn, labelOff }) {
  return (
    <button onClick={onToggle} style={{
      fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: "999px", cursor: "pointer",
      background: on ? "rgba(74,222,128,0.15)" : "var(--bg)",
      border: `1px solid ${on ? "#4ade80" : "var(--border)"}`,
      color: on ? "#4ade80" : "var(--muted)",
    }}>
      {on ? `🟢 ${labelOn}` : `⚪ ${labelOff ?? labelOn}`}
    </button>
  );
}
 
function TierPicker({ tiers, activeTier, maxTier, onSelect, colorActive = "#f59e0b", label }) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      <button onClick={() => onSelect(0)} style={{
        fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "6px", cursor: "pointer",
        background: activeTier === 0 ? "var(--bg-elev)" : "var(--bg)",
        border: `1px solid ${activeTier === 0 ? "var(--border)" : "var(--border)"}`,
        color: activeTier === 0 ? "var(--text)" : "var(--muted)",
        fontWeight: activeTier === 0 ? 600 : 400,
      }}>Off</button>
      {tiers.map((t) => {
        const locked = t.tier > maxTier;
        const active = activeTier === t.tier;
        return (
          <button key={t.tier} onClick={() => !locked && onSelect(t.tier)} disabled={locked} style={{
            fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "6px",
            cursor: locked ? "default" : "pointer",
            background: active ? `rgba(245,158,11,0.15)` : "var(--bg)",
            border: `1px solid ${active ? colorActive : locked ? "var(--border)" : "var(--border)"}`,
            color: active ? colorActive : locked ? "var(--muted)" : "var(--text)",
            fontWeight: active ? 700 : 400,
            opacity: locked ? 0.4 : 1,
          }}>
            {t.label} (−${t.drainRate}/s · {label === "grow" ? `+${t.growBonus}% grow` : `+${t.priceBonus}% prices`})
          </button>
        );
      })}
    </div>
  );
}
 
export default function TownZone({
  game, onBuildHome, onBuyBakery, onToggleBakery, onTogglePantry, onToggleCannery,
  onUpgradeTownBuilding, onBuyJamBuilding, onBuySauceBuilding,
  onUpgradeTownHall, onSetTreasuryTier, onBuildBank, onUpgradeBank, onSetActiveBankTier,
  prestigeReady, onPrestige, onReset,
}) {
  const [subTab, setSubTab] = useState("town");
  const town = game.town ?? {};
  const homes = town.homes ?? 0;
  const bakeryLevel = town.bakeryLevel ?? 0;
  const bakeryOn = town.bakeryOn === true && bakeryLevel >= 1;
  const pantryOn = town.pantryOn === true && town.jamBuildingOwned === true;
  const canneryOn = town.canneryOn === true && town.sauceBuildingOwned === true;
  const jamOwned = town.jamBuildingOwned === true;
  const sauceOwned = town.sauceBuildingOwned === true;
  const people = Math.floor(town.people ?? 0);
  const capacity = town.capacity ?? homes * TOWN_HOME_CAPACITY;
  const satisfaction = town.satisfaction ?? 100;
  const satisfactionTarget = getSatisfactionTarget(game);
  const growthBonusPercent = town.growthBonusPercent ?? 0;
  const starving = town.starving === true;
  const foodType = bakeryOn ? "bread" : "wheat";
 
  const thLevel = getTownHallLevel(game);
  const treasury = getTreasuryBalance(game);
  const activeTreasuryTier = (getActiveTreasuryTier(game)?.tier ?? 0);
  const maxTreasuryTier = getMaxTreasuryTier(game);
  const treasuryGrowBonus = getTreasuryGrowBonus(game);
  const thNextCost = thLevel < TOWN_HALL_MAX_LEVEL ? TOWN_HALL_LEVEL_COSTS[thLevel] : null;
  const canUpgradeTownHall = thNextCost !== null && (game.cash ?? 0) >= thNextCost;
 
  const bankBuilt = isBankBuilt(game);
  const bankLevel = getBankLevel(game);
  const activeBankTier = (getActiveBankTier(game)?.tier ?? 0);
  const bankPriceBonus = getBankPriceBonus(game);
  const bankNextLevelCost = bankBuilt && bankLevel < BANK_MAX_LEVEL ? BANK_LEVEL_COSTS[bankLevel] : null;
  const canUpgradeBankBuilding = bankNextLevelCost !== null && treasury >= bankNextLevelCost;
 
  const effectivePulse = getEffectivePulseSeconds(game);
  const pulseSeconds = Math.ceil(Math.max(0, town.pulseSeconds ?? effectivePulse));
 
  const totalWorkers = getTotalWorkersHired(game);
  const availableSlots = getAvailableWorkerSlots(game);
  const nextHomeCost = getTownHomeCost(game);
  const nextBakeryCost = getTownBakeryCost(game);
  const canBuildHome = treasury >= nextHomeCost || nextHomeCost === 0;
  const canBuyBakery = thLevel >= 1 && treasury >= nextBakeryCost;
  const canBuyJam = thLevel >= 2 && bakeryLevel >= 1 && !jamOwned && treasury >= TOWN_JAM_BUILDING_COST;
  const canBuySauce = thLevel >= 3 && jamOwned && !sauceOwned && treasury >= TOWN_SAUCE_BUILDING_COST;
 
  const foodEmoji = foodType === "wheat" ? "🌾" : "🍞";
  const foodHave = foodType === "wheat" ? Math.floor(game.crops?.wheat ?? 0) : Math.floor(game.artisan?.bread ?? 0);
  
  const idlePeople = Math.max(0, people - totalWorkers);
  const peopleFoodUnits = (idlePeople * PERSON_IDLE_FOOD_COST) + (totalWorkers * PERSON_WORKING_FOOD_COST);
  const animalFoodUnits = Object.entries(game.animals ?? {}).reduce((sum, [id, arr]) => {
    return sum + arr.length * (ANIMAL_FOOD_COSTS[id] ?? 0);
  }, 0);
  const petFoodUnits = Object.keys(game.pets ?? {}).length * PET_FOOD_COST;
  const totalFoodUnits = peopleFoodUnits + animalFoodUnits + petFoodUnits;
  const nextPulseFoodCost = totalFoodUnits === 0 ? 0
    : bakeryOn
      ? Math.max(1, Math.ceil(totalFoodUnits / BREAD_FOOD_UNITS))
      : totalFoodUnits;

  const jamPulseCost = pantryOn ? getBuildingEffectivePulseCost(game, "pantry") : 0;
  const saucePulseCost = canneryOn ? getBuildingEffectivePulseCost(game, "cannery") : 0;
  const jamHave = Math.floor(game.artisan?.jam ?? 0);
  const sauceHave = Math.floor(game.artisan?.sauce ?? 0);
 
  const satColor = satisfaction >= 110 ? "#4ade80" : satisfaction >= 100 ? "#a3e635" : satisfaction >= 75 ? "#f59e0b" : "#ef4444";
  const satEmoji = satisfaction >= 110 ? "😄" : satisfaction >= 100 ? "😊" : satisfaction >= 75 ? "😐" : "😟";
  const populationPct = clampPct(capacity > 0 ? (people / capacity) * 100 : 0);
  const workerSlotsPct = clampPct(people > 0 ? (totalWorkers / people) * 100 : 0);
 
  const bakeryUpgradeLevel = getBuildingUpgradeLevel(game, "bakery");
  const pantryUpgradeLevel = getBuildingUpgradeLevel(game, "pantry");
  const canneryUpgradeLevel = getBuildingUpgradeLevel(game, "cannery");


 
  const row = (label, value, valueColor) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 2 }}>
      <span>{label}</span>
      <strong style={{ color: valueColor ?? "var(--text)" }}>{value}</strong>
    </div>
  );
 
  const subTabs = [
    { id: "town", label: "🏘️ Town" },
    { id: "season", label: "🌱 Season" },
    { id: "stats", label: "📊 Stats" },
  ];

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 0 5rem" }}>
      {/* Sub-tab bar */}
      <div style={{
        display: "flex", borderBottom: "1px solid var(--border)",
        background: "var(--bg-elev)", position: "sticky", top: 0, zIndex: 10,
      }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: "0.6rem 0.25rem", background: "none", border: "none",
            borderBottom: subTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
            color: subTab === t.id ? "var(--accent)" : "var(--muted)",
            fontWeight: subTab === t.id ? 700 : 400, fontSize: "0.78rem", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>
      {subTab === "season" && (
        <SeasonPanel game={game} prestigeReady={prestigeReady} onPrestige={onPrestige} onReset={onReset} />
      )}
      {subTab === "stats" && (
        <StatsPanel game={game} />
      )}
      {subTab === "town" && (
      <div style={{ padding: "1rem 1rem 0" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏘️ Town</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>Feed your town to grow population. All town purchases use the treasury.</p>
      </div>
 
      {/* Stats row */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {[
            { emoji: "👥", value: people, sub: `of ${capacity}` },
            { emoji: "👷", value: `${totalWorkers}/${people}`, sub: availableSlots === 0 ? "full" : `${availableSlots} open`, color: availableSlots === 0 ? "#f59e0b" : undefined },
            { emoji: satEmoji, value: `${satisfaction}%`, sub: satisfaction === satisfactionTarget ? "stable" : satisfaction < satisfactionTarget ? `↑${satisfactionTarget}%` : `↓${satisfactionTarget}%`, color: satColor },
            { emoji: "🌱", value: `+${growthBonusPercent}%`, sub: "grow", color: "#4ade80" },
          ].map(({ emoji, value, sub, color }, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
              <div style={{ fontSize: "1rem" }}>{emoji}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.2rem" }}>
            <span>Satisfaction — multiplies worker speed</span>
            <span style={{ color: satColor, fontWeight: 600 }}>{satisfaction}%</span>
          </div>
          <SatisfactionBar satisfaction={satisfaction} />
        </div>
        {[
          { label: "Workers", value: `${totalWorkers}/${people}`, pct: workerSlotsPct, color: availableSlots === 0 ? "#f59e0b" : "var(--accent)" },
          { label: "Housing", value: `${people}/${capacity}`, pct: populationPct, color: "#4ade80" },
        ].map(({ label, value, pct, color }) => (
          <div key={label} style={{ marginTop: "0.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.15rem" }}>
              <span>{label}</span><span style={{ color: "var(--text)", fontWeight: 600 }}>{value}</span>
            </div>
            <div style={{ height: "5px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        ))}
      </div>
 
      {/* Treasury */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🏦 Treasury</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80" }}>${Math.floor(treasury).toLocaleString()}</div>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
          Drain cash into the treasury to fund town purchases and earn a grow speed bonus. All town buildings are paid from here.
          {treasuryGrowBonus > 0 && <span style={{ color: "#4ade80", marginLeft: "0.3rem", fontWeight: 600 }}>+{treasuryGrowBonus}% grow speed active</span>}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
          Drain rate {thLevel === 0 ? "(unlock Town Hall first)" : `(max tier ${maxTreasuryTier})`}:
        </div>
        <TierPicker
          tiers={TREASURY_TIERS}
          activeTier={activeTreasuryTier}
          maxTier={maxTreasuryTier}
          onSelect={onSetTreasuryTier}
          colorActive="#f59e0b"
          label="grow"
        />
      </div>
 
      {/* Town Hall */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🏛️ Town Hall</div>
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px",
            background: thLevel > 0 ? "rgba(74,222,128,0.15)" : "var(--bg)",
            border: `1px solid ${thLevel > 0 ? "#4ade80" : "var(--border)"}`,
            color: thLevel > 0 ? "#4ade80" : "var(--muted)",
          }}>Level {thLevel}/{TOWN_HALL_MAX_LEVEL}</span>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
          {thLevel === 0 && "Build the Town Hall with cash to unlock the treasury, treasury drain tiers, prestige, and the Bakery."}
          {thLevel === 1 && "Level 2 unlocks the Pantry and treasury tier 2."}
          {thLevel === 2 && "Level 3 unlocks the Cannery, treasury tier 3, and the Bank."}
          {thLevel >= 3 && "Fully upgraded. All buildings and treasury tiers available."}
        </div>
        {thNextCost && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Cost: <strong style={{ color: canUpgradeTownHall ? "#4ade80" : "var(--text)" }}>${thNextCost.toLocaleString()} cash</strong>
            </div>
            <button onClick={onUpgradeTownHall} disabled={!canUpgradeTownHall} className="btn" style={{ opacity: canUpgradeTownHall ? 1 : 0.5, fontSize: "0.75rem" }}>
              Upgrade →
            </button>
          </div>
        )}
        {thLevel >= TOWN_HALL_MAX_LEVEL && (
          <div style={{ fontSize: "0.7rem", color: "#4ade80", textAlign: "center" }}>✓ Max level</div>
        )}
      </div>
 
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          {foodEmoji} Food Pulse
          <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 400, marginLeft: "0.5rem" }}>
            every {effectivePulse}s
            {effectivePulse > TOWN_PULSE_SECONDS && (
              <span style={{ color: "#4ade80", marginLeft: "0.3rem" }}>
                (+{effectivePulse - TOWN_PULSE_SECONDS}s from buildings)
              </span>
            )}
          </span>
        </div>

        {/* Food units breakdown */}
        <div style={{
          background: "var(--bg)", borderRadius: "8px", padding: "0.5rem 0.65rem",
          marginBottom: "0.5rem", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.9,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>🧍 Idle people ({idlePeople} × {PERSON_IDLE_FOOD_COST})</span>
            <strong style={{ color: "var(--text)" }}>{idlePeople * PERSON_IDLE_FOOD_COST} units</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>👷 Workers ({totalWorkers} × {PERSON_WORKING_FOOD_COST})</span>
            <strong style={{ color: "var(--text)" }}>{totalWorkers * PERSON_WORKING_FOOD_COST} units</strong>
          </div>
          {animalFoodUnits > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>🐾 Animals</span>
              <strong style={{ color: "#f59e0b" }}>{animalFoodUnits} units</strong>
            </div>
          )}
          {animalFoodUnits > 0 && (
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", paddingLeft: "0.5rem" }}>
              {Object.entries(game.animals ?? {}).filter(([, arr]) => arr.length > 0).map(([id, arr]) => (
                <span key={id} style={{ marginRight: "0.5rem" }}>
                  {id === "chicken" ? "🐔" : id === "cow" ? "🐄" : "🐑"} {arr.length} × {ANIMAL_FOOD_COSTS[id]} = {arr.length * ANIMAL_FOOD_COSTS[id]}
                </span>
              ))}
            </div>
          )}
          {petFoodUnits > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>🐾 Pets ({Object.keys(game.pets ?? {}).length} × {PET_FOOD_COST})</span>
              <strong style={{ color: "#f59e0b" }}>{petFoodUnits} units</strong>
            </div>
          )}
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: "0.2rem",
            paddingTop: "0.3rem", borderTop: "1px solid var(--border)",
          }}>
            <span>Total food units needed</span>
            <strong style={{ color: "var(--text)" }}>{totalFoodUnits}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {bakeryOn
                ? `→ bread (${totalFoodUnits} ÷ ${BREAD_FOOD_UNITS} = ${nextPulseFoodCost} 🍞)`
                : `→ wheat (1 unit = 1 🌾)`}
            </span>
            <strong style={{ color: foodHave >= nextPulseFoodCost ? "#4ade80" : "#ef4444" }}>
              {nextPulseFoodCost} {foodEmoji}
            </strong>
          </div>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 2 }}>
          {row("Next pulse in", `${pulseSeconds}s`)}
          {row(`${foodEmoji} in stock`, `${foodHave}`, foodHave >= nextPulseFoodCost ? "#4ade80" : "#ef4444")}
          {jamOwned && row("🍯 jam/pulse", pantryOn ? `${jamPulseCost} (have ${jamHave})` : `${getBuildingEffectivePulseCost(game, "pantry")} (off · ${jamHave} in stock)`, pantryOn ? (jamHave >= jamPulseCost ? "#4ade80" : "#ef4444") : "var(--muted)")}
          {sauceOwned && row("🥫 sauce/pulse", canneryOn ? `${saucePulseCost} (have ${sauceHave})` : `${getBuildingEffectivePulseCost(game, "cannery")} (off · ${sauceHave} in stock)`, canneryOn ? (sauceHave >= saucePulseCost ? "#4ade80" : "#ef4444") : "var(--muted)")}
          {row("Status", starving ? "😟 Hungry" : "😊 Fed", starving ? "#ef4444" : "#4ade80")}
        </div>
      </div>
 
      {/* Build Homes */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>🏠 Build Homes</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          Each home holds {TOWN_HOME_CAPACITY} people. One resident moves in immediately. {homes} home{homes !== 1 ? "s" : ""} · {capacity} capacity. <strong style={{ color: "#f59e0b" }}>Paid from treasury.</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Next: <strong style={{ color: "var(--text)" }}>{nextHomeCost === 0 ? "Free" : `$${nextHomeCost.toLocaleString()}`}</strong>
          </div>
          <button onClick={onBuildHome} disabled={!canBuildHome} className="btn" style={{ opacity: canBuildHome ? 1 : 0.5 }}>Build Home</button>
        </div>
      </div>
 
      {/* Bakery */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: thLevel >= 1 ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🥖 Bakery</div>
          {bakeryLevel >= 1 && <ToggleButton on={bakeryOn} onToggle={onToggleBakery} labelOn="Bread mode" labelOff="Bread mode" />}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {thLevel < 1 ? "Requires Town Hall level 1." : bakeryLevel === 0 ? `Buy to enable bread mode — 1 bread = ${BREAD_FOOD_UNITS} food units. Sat target: ${TOWN_SAT_BAKERY}%.` : bakeryOn ? `Bread mode active. +${BUILDING_PULSE_EXTRA_SECONDS}s pulse. Sat: ${satisfactionTarget}%.` : "Toggle for higher satisfaction. Paid from treasury."}
        </div>
        {bakeryLevel >= 1 && (
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
            Upgrade level: {bakeryUpgradeLevel} · reduces bread cost by {bakeryUpgradeLevel}/pulse
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {bakeryLevel === 0 ? <>${nextBakeryCost.toLocaleString()} treasury</> : <>Level {bakeryLevel}</>}
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {bakeryLevel >= 1 && canUpgradeBuilding(game, "bakery") && (
              <button onClick={() => onUpgradeTownBuilding("bakery")} className="btn" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>
                Upgrade −${BUILDING_UPGRADE_COST}
              </button>
            )}
            {bakeryLevel === 0 && <button onClick={onBuyBakery} disabled={!canBuyBakery} className="btn" style={{ opacity: canBuyBakery ? 1 : 0.5 }}>Buy Bakery</button>}
          </div>
        </div>
      </div>
 
      {/* Pantry */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: thLevel >= 2 ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🍯 Pantry</div>
          {jamOwned && <ToggleButton on={pantryOn} onToggle={onTogglePantry} labelOn="Jam mode" />}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {thLevel < 2 ? "Requires Town Hall level 2." : !jamOwned ? `Toggle on to consume ${getBuildingEffectivePulseCost(game, "pantry")} jam/pulse (+${BUILDING_PULSE_EXTRA_SECONDS}s, sat ${TOWN_SAT_BAKERY_JAM}%).` : pantryOn ? `Jam mode active. Consumes ${jamPulseCost} 🍯/pulse. Sat: ${satisfactionTarget}%.` : "Toggle for higher satisfaction."}
        </div>
        {jamOwned && (
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
            Upgrade level: {pantryUpgradeLevel} · reduces jam cost by {pantryUpgradeLevel}/pulse
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {!jamOwned ? <>${TOWN_JAM_BUILDING_COST.toLocaleString()} treasury</> : <span style={{ color: "#4ade80", fontSize: "0.65rem", fontWeight: 700 }}>✓ Built</span>}
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {jamOwned && canUpgradeBuilding(game, "pantry") && <button onClick={() => onUpgradeTownBuilding("pantry")} className="btn" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>Upgrade −${BUILDING_UPGRADE_COST}</button>}
            {!jamOwned && <button onClick={onBuyJamBuilding} disabled={!canBuyJam} className="btn" style={{ opacity: canBuyJam ? 1 : 0.5 }}>Build Pantry</button>}
          </div>
        </div>
      </div>
 
      {/* Cannery */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: thLevel >= 3 ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🥫 Cannery</div>
          {sauceOwned && <ToggleButton on={canneryOn} onToggle={onToggleCannery} labelOn="Sauce mode" />}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {thLevel < 3 ? "Requires Town Hall level 3." : !sauceOwned ? `Toggle on to consume ${getBuildingEffectivePulseCost(game, "cannery")} sauce/pulse (+${BUILDING_PULSE_EXTRA_SECONDS}s, sat ${TOWN_SAT_ALL_BUILDINGS}%).` : canneryOn ? `Sauce mode active. Consumes ${saucePulseCost} 🥫/pulse. Sat: ${satisfactionTarget}%.` : "Toggle for max satisfaction."}
        </div>
        {sauceOwned && (
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
            Upgrade level: {canneryUpgradeLevel} · reduces sauce cost by {canneryUpgradeLevel}/pulse
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {!sauceOwned ? <>${TOWN_SAUCE_BUILDING_COST.toLocaleString()} treasury</> : <span style={{ color: "#4ade80", fontSize: "0.65rem", fontWeight: 700 }}>✓ Built</span>}
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {sauceOwned && canUpgradeBuilding(game, "cannery") && <button onClick={() => onUpgradeTownBuilding("cannery")} className="btn" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>Upgrade −${BUILDING_UPGRADE_COST}</button>}
            {!sauceOwned && <button onClick={onBuySauceBuilding} disabled={!canBuySauce} className="btn" style={{ opacity: canBuySauce ? 1 : 0.5 }}>Build Cannery</button>}
          </div>
        </div>
      </div>
 
      {/* Bank */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: thLevel >= TOWN_HALL_MAX_LEVEL && jamOwned && sauceOwned && bakeryLevel >= 1 ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🏦 Bank</div>
          {bankBuilt && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>Level {bankLevel}/{BANK_MAX_LEVEL}</span>}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {thLevel < TOWN_HALL_MAX_LEVEL || !jamOwned || !sauceOwned || bakeryLevel < 1
            ? "Requires Town Hall level 3, Bakery, Pantry, and Cannery."
            : !bankBuilt
              ? `Build to unlock sell price bonuses. Drain treasury to run. Build cost: $${BANK_BUILD_COST.toLocaleString()}.`
              : bankPriceBonus > 0 ? `Running. +${bankPriceBonus}% sell prices active.` : "Built. Choose a tier to activate price bonus."
          }
        </div>
        {bankBuilt && (
          <>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem", fontWeight: 600 }}>Active tier (drains treasury):</div>
            <TierPicker
              tiers={BANK_TIERS}
              activeTier={activeBankTier}
              maxTier={bankLevel}
              onSelect={onSetActiveBankTier}
              colorActive="#60a5fa"
              label="price"
            />
            {bankNextLevelCost && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  Upgrade: <strong style={{ color: canUpgradeBankBuilding ? "#4ade80" : "var(--text)" }}>${bankNextLevelCost.toLocaleString()} treasury</strong>
                </div>
                <button onClick={onUpgradeBank} disabled={!canUpgradeBankBuilding} className="btn" style={{ opacity: canUpgradeBankBuilding ? 1 : 0.5, fontSize: "0.75rem" }}>Upgrade →</button>
              </div>
            )}
            {bankLevel >= BANK_MAX_LEVEL && <div style={{ fontSize: "0.7rem", color: "#4ade80", marginTop: "0.4rem", textAlign: "center" }}>✓ Max level</div>}
          </>
        )}
        {!bankBuilt && canBuildBank(game) && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" }}>
            <button onClick={onBuildBank} className="btn">Build Bank</button>
          </div>
        )}
      </div>
 
      {/* How it works */}
      <div className="card p-4">
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>📘 How Town Works</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.8 }}>
          <div>• <strong style={{ color: "var(--text)" }}>Treasury</strong> fills from your cash at your chosen drain rate. All town buildings are paid from it. Carries over on prestige.</div>
          <div>• <strong style={{ color: "var(--text)" }}>Town Hall</strong> is built with cash and unlocks the treasury system. Each level gates more buildings and higher treasury drain tiers.</div>
          <div>• <strong style={{ color: "var(--text)" }}>Treasury drain</strong> gives a grow speed bonus while active. Higher tiers cost more but give a bigger boost.</div>
          <div>• <strong style={{ color: "var(--text)" }}>Bank</strong> drains treasury to boost sell prices. Bigger tier = higher cost + bigger bonus.</div>
          <div>• Every {TOWN_PULSE_SECONDS}s base: food costs are unified units. Idle people cost {PERSON_IDLE_FOOD_COST}/pulse, workers cost {PERSON_WORKING_FOOD_COST}/pulse, chickens {ANIMAL_FOOD_COSTS.chicken}, cows {ANIMAL_FOOD_COSTS.cow}, sheep {ANIMAL_FOOD_COSTS.sheep}. Wheat mode: 1 unit = 1 🌾. Bread mode: 1 🍞 = {BREAD_FOOD_UNITS} units.</div>
          <div>• Toggling Bakery/Pantry/Cannery adds +{BUILDING_PULSE_EXTRA_SECONDS}s to pulse and costs food per pulse. Upgrades reduce cost.</div>
          <div>• <strong style={{ color: "var(--text)" }}>Satisfaction</strong> multiplies all worker speed. Floor 25%, ceiling 150%.</div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}