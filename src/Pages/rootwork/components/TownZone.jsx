// src/Pages/rootwork/components/TownZone.jsx
 
import React, { useState } from "react";
import {
  TOWN_HOME_CAPACITY, TOWN_PULSE_SECONDS, TOWN_JAM_BUILDING_COST,
  TOWN_SAUCE_BUILDING_COST, TOWN_SAT_WHEAT, TOWN_SAT_BAKERY,
  TOWN_SAT_BAKERY_JAM, TOWN_SAT_ALL_BUILDINGS, TOWN_HALL_MAX_LEVEL,
  TOWN_HALL_LEVEL_COSTS, TOWN_HALL_L1_IRON, TOWN_HALL_L1_LUMBER, TREASURY_TIERS, BUILDING_UPGRADE_COST,
  INVEST_NOW_CD_SECONDS,
  BUILDING_PULSE_EXTRA_SECONDS, BANK_BUILD_COST, BANK_LEVEL_COSTS,
  BANK_TIERS, BANK_MAX_LEVEL,
  ANIMAL_FOOD_COSTS, PET_FOOD_COST, BREAD_FOOD_UNITS,
  PERSON_IDLE_FOOD_COST, PERSON_WORKING_FOOD_COST,
  TOWN_CLINIC_COST, TOWN_SCHOOL_COST, TOWN_TAVERN_COST,
  TOWN_RESTAURANT_COST, TOWN_CLOTHIER_COST,
  CLINIC_CAP_PER_MEDIC, CLINIC_SAT_PER_MEDIC,
  SCHOOL_GROW_PER_RESEARCHER,
  TAVERN_SAT_PER_BARTENDER, TAVERN_CLASS_BUFFS,
  RESTAURANT_SAT_PER_CHEF,
  CLOTHIER_CASH_PER_CLERK,
  SCHOOL_RESEARCH,
} from "../gameConstants";
import {
  getTownHomeCost, getTownBakeryCost, getTotalWorkersHired,
  getAvailableWorkerSlots, getSatisfactionTarget, getTownHallLevel,
  getTreasuryBalance, getActiveTreasuryTier, getMaxTreasuryTier,
  getBuildingEffectivePulseCost, getBuildingUpgradeLevel,
  canUpgradeBuilding, getEffectivePulseSeconds, getBankLevel,
  isBankBuilt, canBuildBank, getActiveBankTier, getTreasuryGrowBonus,
  getBankPriceBonus,
  isTownBuildingBuilt, getTownBuildingWorkers, getFreePeople,
  getClinicCapBonus, getClinicSatBonus,
  getSchoolGrowBonus, getSchoolResearchMultiplier,
  getTavernSatBonus, getTavernPulseCost,
  getRestaurantSatBonus, getRestaurantOmeletteCost, getRestaurantCheeseCost,
  getClothierCashPerPulse, getClothierPulseCost,
  getTownBuildingWorkerCount, getSchoolData, getActiveSchoolResearch, getAvailableSchoolResearch,
  canInvestNow, getInvestNowCooldownRemaining,
} from "../gameEngine";
import SeasonPanel from "./SeasonPanel";
import StatsPanel from "./StatsPanel";
 
function clampPct(v) { return Math.max(0, Math.min(100, v)); }
 
function WorkerAssigner({ workers, freePeople, onAdd, onRemove, label = "worker" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <button
        onClick={onRemove} disabled={workers <= 0}
        style={{
          width: "26px", height: "26px", borderRadius: "6px", border: "1px solid var(--border)",
          background: "var(--bg)", color: "var(--text)", fontSize: "1rem", cursor: workers <= 0 ? "default" : "pointer",
          opacity: workers <= 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >−</button>
      <div style={{ minWidth: "32px", textAlign: "center", fontWeight: 700, fontSize: "0.9rem" }}>{workers}</div>
      <button
        onClick={onAdd} disabled={freePeople <= 0}
        style={{
          width: "26px", height: "26px", borderRadius: "6px", border: "1px solid var(--border)",
          background: "var(--bg)", color: "var(--text)", fontSize: "1rem", cursor: freePeople <= 0 ? "default" : "pointer",
          opacity: freePeople <= 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >+</button>
      <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{label}s</span>
    </div>
  );
}
 
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

function ResearchBar({ progress, total }) {
  const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  return (
    <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "#a78bfa",
          borderRadius: "999px",
          transition: "width 0.35s ease",
        }}
      />
    </div>
  );
}

function CollapsibleCard({ title, subtitle, defaultOpen = true, right, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ marginBottom: "1rem", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.95rem 1rem",
          textAlign: "left",
          color: "var(--text)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "0.86rem", fontWeight: 700 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          {right ? <div>{right}</div> : null}
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700 }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>
      {open && <div style={{ padding: "0 1rem 1rem" }}>{children}</div>}
    </div>
  );
}
 
export default function TownZone({
  game,
  onBuildHome,
  onBuyBakery,
  onToggleBakery,
  onTogglePantry,
  onToggleCannery,
  onUpgradeTownBuilding,
  onBuyJamBuilding,
  onBuySauceBuilding,
  onUpgradeTownHall,
  onSetTreasuryTier,
  onBuildBank,
  onUpgradeBank,
  onSetActiveBankTier,
  prestigeReady,
  onPrestige,
  onReset,
  onSetTreasuryCap,
  onBuildTownBuilding,
  onAssignTownBuildingWorker,
  onToggleTavernMode,
  onStartSchoolResearch,
  onInvestNow,
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
  const canUpgradeTownHall = thNextCost !== null && (game.cash ?? 0) >= thNextCost &&
  (thLevel !== 0 || ((game.worldResources?.iron_ore ?? 0) >= TOWN_HALL_L1_IRON && (game.worldResources?.lumber ?? 0) >= TOWN_HALL_L1_LUMBER));
  const investNowUnlocked = canInvestNow(game);
  const investNowCdRemaining = Math.ceil(getInvestNowCooldownRemaining(game));
  const investNowReady = investNowUnlocked && investNowCdRemaining === 0;
 
  const bankBuilt = isBankBuilt(game);
  const bankLevel = getBankLevel(game);
  const activeBankTier = (getActiveBankTier(game)?.tier ?? 0);
  const bankPriceBonus = getBankPriceBonus(game);
  const bankNextLevelCost = bankBuilt && bankLevel < BANK_MAX_LEVEL ? BANK_LEVEL_COSTS[bankLevel] : null;
  const canUpgradeBankBuilding = bankNextLevelCost !== null && treasury >= bankNextLevelCost;
 
  const effectivePulse = getEffectivePulseSeconds(game);
  const pulseSeconds = Math.ceil(Math.max(0, town.pulseSeconds ?? effectivePulse));
  const growthAccumulator = town.growthAccumulator ?? 0;
  const growthSecondsLeft = Math.ceil(Math.max(0, TOWN_PULSE_SECONDS - growthAccumulator));
 
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

  const [capInput, setCapInput] = useState("");
  const treasuryCap = town.treasuryCap ?? 0;

  // ── New town buildings ──────────────────────────────────────────────────────
  const freePeople = getFreePeople(game);
  const townBuildingWorkerCount = getTownBuildingWorkerCount(game);

  const clinicBuilt    = isTownBuildingBuilt(game, "clinic");
  const schoolBuilt    = isTownBuildingBuilt(game, "school");
  const tavernBuilt    = isTownBuildingBuilt(game, "tavern");
  const restaurantBuilt = isTownBuildingBuilt(game, "restaurant");
  const clothierBuilt  = isTownBuildingBuilt(game, "clothier");

  const clinicWorkers    = getTownBuildingWorkers(game, "clinic");
  const schoolWorkers    = getTownBuildingWorkers(game, "school");
  const tavernWorkers    = getTownBuildingWorkers(game, "tavern");
  const restaurantWorkers = getTownBuildingWorkers(game, "restaurant");
  const clothierWorkers  = getTownBuildingWorkers(game, "clothier");

  const clinicCapBonus   = getClinicCapBonus(game);
  const clinicSatBonus   = getClinicSatBonus(game);
  const schoolGrowBonus  = getSchoolGrowBonus(game);
  const schoolResearchMult = getSchoolResearchMultiplier(game);
  const schoolData = getSchoolData(game);
  const activeSchoolResearch = getActiveSchoolResearch(game);
  const availableSchoolResearch = getAvailableSchoolResearch(game);
  const unlockedSchoolResearch = schoolData?.unlockedResearch ?? [];
  const tavernSatBonus   = getTavernSatBonus(game);
  const tavernCost       = getTavernPulseCost(game);
  const restaurantSatBonus = getRestaurantSatBonus(game);
  const restaurantOmeletteCost = getRestaurantOmeletteCost(game);
  const restaurantCheeseCost   = getRestaurantCheeseCost(game);
  const clothierCash     = getClothierCashPerPulse(game);
  const clothierCost     = getClothierPulseCost(game);

  const tavernMode = town.townBuildings?.tavern?.mode ?? "jam";
  const restaurantStocked = town.townBuildings?.restaurant?.stocked !== false;
  const tavernStocked     = town.townBuildings?.tavern?.stocked !== false;
  const clothierStocked   = town.townBuildings?.clothier?.stocked !== false;

  const woolShedBuilt = game.barnBuildings?.wool_shed?.built === true;

  // Gate checks
  const canBuildTavern     = thLevel >= 1 && !tavernBuilt && treasury >= TOWN_TAVERN_COST;
  const canBuildClinic     = tavernBuilt && !clinicBuilt && treasury >= TOWN_CLINIC_COST;
  const canBuildSchool     = clinicBuilt && !schoolBuilt && treasury >= TOWN_SCHOOL_COST;
  const canBuildRestaurant = schoolBuilt && bakeryLevel >= 1 && !restaurantBuilt && treasury >= TOWN_RESTAURANT_COST;
  const canBuildClothier   = schoolBuilt && woolShedBuilt && !clothierBuilt && treasury >= TOWN_CLOTHIER_COST;


 
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
 
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.6rem" }}>
          <div style={{ background: "var(--bg)", borderRadius: "10px", padding: "0.7rem" }}>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.2rem" }}>Overview</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>Town Hall {thLevel}/{TOWN_HALL_MAX_LEVEL}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              Treasury ${Math.floor(treasury).toLocaleString()} · {freePeople} free people
            </div>
          </div>
          <div style={{ background: "var(--bg)", borderRadius: "10px", padding: "0.7rem" }}>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.2rem" }}>Buildings</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              {[clinicBuilt, schoolBuilt, tavernBuilt, restaurantBuilt, clothierBuilt].filter(Boolean).length} civic · {[bakeryLevel >= 1, jamOwned, sauceOwned, bankBuilt].filter(Boolean).length} utility
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              {activeSchoolResearch ? `${activeSchoolResearch.emoji} ${activeSchoolResearch.name}` : schoolBuilt ? "No active research" : "School locked"}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {[
            { emoji: "👥", value: people, sub: `of ${capacity}` },
            { emoji: "👷", value: `${totalWorkers}/${people}`, sub: freePeople === 0 ? "no free" : `${freePeople} free`, color: freePeople === 0 ? "#f59e0b" : undefined },
            { emoji: satEmoji, value: `${satisfaction}%`, sub: satisfaction === satisfactionTarget ? "stable" : satisfaction < satisfactionTarget ? `↑${satisfactionTarget}%` : `↓${satisfactionTarget}%`, color: satColor },
            { emoji: "🌱", value: `+${(growthBonusPercent + schoolGrowBonus).toFixed(1)}%`, sub: "grow", color: "#4ade80" },
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
 
      <CollapsibleCard
        title="🏛️ Core systems"
        subtitle="Treasury, Town Hall, and Bank"
        defaultOpen={true}
        right={<span style={{ fontSize: "0.66rem", color: "#4ade80", fontWeight: 700 }}>${Math.floor(treasury).toLocaleString()}</span>}
      >
      {/* Treasury */}
<div className="card p-4" style={{ marginBottom: "1rem" }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
    <div style={{ fontWeight: 600 }}>🏦 Treasury</div>
    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80" }}>${Math.floor(treasury).toLocaleString()}</div>
  </div>
  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
    Drain cash into the treasury to fund town purchases and earn a grow speed bonus.
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
  {/* Invest Now */}
  <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)" }}>
        💰 Invest Now
        {investNowUnlocked && investNowCdRemaining > 0 && (
          <span style={{ marginLeft: "0.4rem", color: "var(--muted)", fontWeight: 400 }}>
            ({investNowCdRemaining}s)
          </span>
        )}
      </div>
      {!investNowUnlocked ? (
        <span style={{ fontSize: "0.65rem", color: "var(--muted)", opacity: 0.5 }}>🔒 Town Hall 4</span>
      ) : (
        <button
          onClick={onInvestNow}
          disabled={!investNowReady}
          style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.75rem",
            borderRadius: "8px", cursor: investNowReady ? "pointer" : "default",
            background: investNowReady ? "rgba(74,222,128,0.15)" : "var(--bg)",
            border: `1px solid ${investNowReady ? "#4ade80" : "var(--border)"}`,
            color: investNowReady ? "#4ade80" : "var(--muted)",
            opacity: investNowReady ? 1 : 0.5,
            transition: "all 0.2s ease",
          }}
        >
          {investNowReady ? `+${Math.floor((game.cash ?? 0) * 0.1).toLocaleString()} →` : `⏳ ${investNowCdRemaining}s`}
        </button>
      )}
    </div>
    <div style={{ fontSize: "0.65rem", color: "var(--muted)", lineHeight: 1.5 }}>
      {investNowUnlocked
        ? "Instantly move 10% of your current cash into treasury. 30s cooldown."
        : "Unlock at Town Hall level 4 to instantly dump 10% of cash into treasury with a 30s cooldown."}
    </div>
  </div>

  {/* Treasury cap */}
  {thLevel > 0 && (
    <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
        🛑 Auto-stop cap
        {treasuryCap > 0 && (
          <span style={{ marginLeft: "0.4rem", color: "#f59e0b", fontWeight: 700 }}>
            ${treasuryCap.toLocaleString()}
          </span>
        )}
      </div>
      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
        Drain pauses automatically when treasury reaches this amount. Set to 0 to disable.
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {/* Quick presets */}
        {[0, 500, 1000, 2500, 5000].map((preset) => (
          <button
            key={preset}
            onClick={() => { onSetTreasuryCap(preset); setCapInput(""); }}
            style={{
              fontSize: "0.65rem", padding: "0.2rem 0.5rem", borderRadius: "6px", cursor: "pointer",
              background: treasuryCap === preset ? "rgba(245,158,11,0.2)" : "var(--bg)",
              border: `1px solid ${treasuryCap === preset ? "#f59e0b" : "var(--border)"}`,
              color: treasuryCap === preset ? "#f59e0b" : "var(--muted)",
              fontWeight: treasuryCap === preset ? 700 : 400,
            }}
          >
            {preset === 0 ? "Off" : `$${preset.toLocaleString()}`}
          </button>
        ))}
        {/* Custom input */}
        <div style={{ display: "flex", gap: "0.3rem", flex: 1, minWidth: "120px" }}>
          <input
            type="number"
            min="0"
            placeholder="Custom…"
            value={capInput}
            onChange={(e) => setCapInput(e.target.value)}
            style={{
              flex: 1, fontSize: "0.68rem", padding: "0.2rem 0.4rem",
              borderRadius: "6px", border: "1px solid var(--border)",
              background: "var(--bg)", color: "var(--text)",
              minWidth: 0,
            }}
          />
          <button
            onClick={() => {
              const val = parseInt(capInput, 10);
              if (!isNaN(val) && val >= 0) { onSetTreasuryCap(val); setCapInput(""); }
            }}
            className="btn btn-secondary"
            style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem", flexShrink: 0 }}
          >
            Set
          </button>
        </div>
      </div>
      {treasuryCap > 0 && treasury >= treasuryCap && (
        <div style={{ marginTop: "0.4rem", fontSize: "0.65rem", color: "#f59e0b", fontWeight: 600 }}>
          ⏸ Cap reached — drain paused
        </div>
      )}
    </div>
  )}
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
          {thLevel === 3 && "Level 4 unlocks Invest Now — instantly move 10% of your cash into treasury with a 30s cooldown."}
          {thLevel >= 4 && "Fully upgraded. All systems unlocked including Invest Now."}
        </div>
        {thNextCost && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Cost: <strong style={{ color: canUpgradeTownHall ? "#4ade80" : "var(--text)" }}>${thNextCost.toLocaleString()}</strong>
              {thLevel === 0 && (
                <span style={{ marginLeft: "0.4rem" }}>
                  + <strong style={{ color: (game.worldResources?.iron_ore ?? 0) >= TOWN_HALL_L1_IRON ? "#4ade80" : "#f87171" }}>🪨×{TOWN_HALL_L1_IRON}</strong>
                  {" "}<strong style={{ color: (game.worldResources?.lumber ?? 0) >= TOWN_HALL_L1_LUMBER ? "#4ade80" : "#f87171" }}>🪵×{TOWN_HALL_L1_LUMBER}</strong>
                </span>
              )}
            </div>
            <button onClick={onUpgradeTownHall} disabled={!canUpgradeTownHall} className="btn" style={{ opacity: canUpgradeTownHall ? 1 : 0.5, fontSize: "0.75rem" }}>
              {thLevel === 0 ? "Build →" : "Upgrade →"}
            </button>
          </div>
        )}
        {thLevel >= TOWN_HALL_MAX_LEVEL && (
          <div style={{ fontSize: "0.7rem", color: "#4ade80", textAlign: "center" }}>✓ Max level — Invest Now unlocked</div>
        )}
      </div>

      {/* 🏦 Bank */}
      {(() => {
        const bankRequirementsMet = thLevel >= TOWN_HALL_MAX_LEVEL && bakeryLevel >= 1 && jamOwned && sauceOwned;
        const canAffordBank = treasury >= BANK_BUILD_COST;
        const canBuyBank = bankRequirementsMet && canAffordBank && !bankBuilt;
        return (
          <div className="card p-4" style={{ marginBottom: "1rem", opacity: bankRequirementsMet ? 1 : 0.4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <div style={{ fontWeight: 600 }}>🏦 Bank</div>
              {bankBuilt
                ? <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>Level {bankLevel}/{BANK_MAX_LEVEL}</span>
                : bankRequirementsMet
                  ? <span style={{ fontSize: "0.65rem", color: canAffordBank ? "#4ade80" : "var(--muted)", fontWeight: 600 }}>${Math.floor(treasury).toLocaleString()} / ${BANK_BUILD_COST.toLocaleString()}</span>
                  : null
              }
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
              {!bankRequirementsMet
                ? "Requires Town Hall level 4, Bakery, Pantry, and Cannery."
                : !bankBuilt
                  ? "Drains treasury to boost all sell prices. Each level unlocks a higher drain tier."
                  : bankPriceBonus > 0 ? `Running. +${bankPriceBonus}% sell prices active.` : "Built. Choose a tier to activate price bonus."
              }
            </div>
            {!bankBuilt && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  Cost: <strong style={{ color: canAffordBank && bankRequirementsMet ? "#4ade80" : "var(--text)" }}>${BANK_BUILD_COST.toLocaleString()} treasury</strong>
                </div>
                <button onClick={onBuildBank} disabled={!canBuyBank} className="btn" style={{ opacity: canBuyBank ? 1 : 0.5 }}>
                  Build Bank
                </button>
              </div>
            )}
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
          </div>
        );
      })()}

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
          {!starving && row("👥 Pop grows in", `${growthSecondsLeft}s`, "var(--muted)")}
          {row(`${foodEmoji} in stock`, `${foodHave}`, foodHave >= nextPulseFoodCost ? "#4ade80" : "#ef4444")}
          {jamOwned && row("🍯 jam/pulse", pantryOn ? `${jamPulseCost} (have ${jamHave})` : `${getBuildingEffectivePulseCost(game, "pantry")} (off · ${jamHave} in stock)`, pantryOn ? (jamHave >= jamPulseCost ? "#4ade80" : "#ef4444") : "var(--muted)")}
          {sauceOwned && row("🥫 sauce/pulse", canneryOn ? `${saucePulseCost} (have ${sauceHave})` : `${getBuildingEffectivePulseCost(game, "cannery")} (off · ${sauceHave} in stock)`, canneryOn ? (sauceHave >= saucePulseCost ? "#4ade80" : "#ef4444") : "var(--muted)")}
          {row("Status", starving ? "😟 Hungry" : "😊 Fed", starving ? "#ef4444" : "#4ade80")}
        </div>
      </div>
 
      </CollapsibleCard>

      <CollapsibleCard
        title="🍞 Food & housing"
        subtitle="Pulse costs, stock, and homes"
        defaultOpen={true}
        right={<span style={{ fontSize: "0.66rem", color: starving ? "#ef4444" : "#4ade80", fontWeight: 700 }}>{starving ? "Hungry" : "Fed"}</span>}
      >
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
 
      </CollapsibleCard>

      <CollapsibleCard
        title="🏭 Production buildings"
        subtitle="Bakery, Pantry, and Cannery"
        defaultOpen={false}
        right={<span style={{ fontSize: "0.66rem", color: "var(--muted)", fontWeight: 700 }}>{[bakeryLevel >= 1, jamOwned, sauceOwned].filter(Boolean).length}/3 built</span>}
      >
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
 
      </CollapsibleCard>
 
      <CollapsibleCard
        title="🏗️ Town buildings"
        subtitle="Clinic, School, Tavern, Restaurant, and Clothier"
        defaultOpen={false}
        right={<span style={{ fontSize: "0.66rem", color: freePeople > 0 ? "#4ade80" : "#f59e0b", fontWeight: 700 }}>{freePeople} free</span>}
      >
      {/* ── NEW TOWN BUILDINGS ──────────────────────────────────────── */}
 
      {/* Free people indicator */}
      {(tavernBuilt || clinicBuilt || schoolBuilt || restaurantBuilt || clothierBuilt) && (
        <div className="card p-4" style={{ marginBottom: "1rem", background: "var(--bg-elev)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>🏗️ Town Buildings</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              <span style={{ color: freePeople > 0 ? "#4ade80" : "#f59e0b", fontWeight: 700 }}>{freePeople} free</span>
              {" · "}{townBuildingWorkerCount} in buildings{" · "}{totalWorkers} total workers
            </div>
          </div>
        </div>
      )}
 
      {/* 🍺 Tavern */}
      {(() => {
        const restingHeroes = (game.adventurers ?? []).filter((a) => a.tavernResting);
        const activeTier = tavernWorkers === 0 ? 1 : tavernStocked ? (tavernMode === "fish_pie" ? 3 : 2) : 1;
        const tierColors = { 1: "#94a3b8", 2: "#60a5fa", 3: "#a78bfa" };
        const tierColor = tierColors[activeTier] ?? "#94a3b8";
        return (
          <div className="card p-4" style={{ marginBottom: "1rem", opacity: thLevel >= 1 ? 1 : 0.4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <div style={{ fontWeight: 600 }}>🍺 Tavern</div>
              {tavernBuilt && (
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>
                  Built · {tavernWorkers} bartenders
                </span>
              )}
            </div>

            {/* How it works — always visible once built */}
            {tavernBuilt ? (
              <>
                {/* Tier explanation */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" }}>
                  {[
                    { tier: 1, label: "Always active", icon: "❤️", desc: "Heroes resting here regen HP 3× faster. Free — no bartenders or items needed." },
                    { tier: 2, label: "With bartender + 🍯 Jam", icon: "⭐", desc: `Resting heroes also gain ${3} XP per town pulse. Jam consumed per pulse.` },
                    { tier: 3, label: "With bartender + 🥧 Fish Pie", icon: "✨", desc: "Resting heroes earn a class buff (Fighter: +HP · Mage: faster run · Scavenger: +loot) that fires on their next mission." },
                  ].map(({ tier, label, icon, desc }) => {
                    const isActive = tavernBuilt && activeTier >= tier;
                    return (
                      <div key={tier} style={{
                        display: "flex", gap: "0.5rem", alignItems: "flex-start",
                        padding: "0.35rem 0.5rem", borderRadius: "7px",
                        background: isActive ? `rgba(${tier === 1 ? "148,163,184" : tier === 2 ? "96,165,250" : "167,139,250"},0.08)` : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isActive ? `rgba(${tier === 1 ? "148,163,184" : tier === 2 ? "96,165,250" : "167,139,250"},0.25)` : "rgba(255,255,255,0.06)"}`,
                        opacity: isActive ? 1 : 0.45,
                      }}>
                        <span style={{ fontSize: "0.75rem", marginTop: "1px" }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: isActive ? tierColors[tier] : "var(--muted)", marginBottom: "1px" }}>
                            TIER {tier} · {label}
                          </div>
                          <div style={{ fontSize: "0.62rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
                        </div>
                        {isActive && tier === activeTier && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: tierColors[tier], background: `rgba(${tier === 1 ? "148,163,184" : tier === 2 ? "96,165,250" : "167,139,250"},0.15)`, border: `1px solid ${tierColors[tier]}`, padding: "1px 5px", borderRadius: "4px", whiteSpace: "nowrap", alignSelf: "center" }}>ACTIVE</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bartender workers + sat bonus */}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                  <WorkerAssigner
                    workers={tavernWorkers} freePeople={freePeople}
                    onAdd={() => onAssignTownBuildingWorker("tavern", 1)}
                    onRemove={() => onAssignTownBuildingWorker("tavern", -1)}
                  />
                  {tavernWorkers > 0 && (
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                      +<strong style={{ color: "#60a5fa" }}>{tavernSatBonus.toFixed(1)}%</strong> satisfaction · consumes <strong>{tavernCost}</strong>/pulse
                    </div>
                  )}
                  {tavernWorkers === 0 && (
                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontStyle: "italic" }}>
                      Add a bartender to unlock Tier 2 &amp; 3
                    </div>
                  )}
                </div>

                {/* Item toggle — visible always (greyed when no bartenders) */}
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.58rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.3rem", letterSpacing: "0.04em" }}>
                    ITEM MODE {tavernWorkers === 0 && <span style={{ fontWeight: 400, color: "var(--muted)", opacity: 0.6 }}>· needs bartender</span>}
                    {tavernWorkers > 0 && !tavernStocked && <span style={{ fontWeight: 400, color: "#f59e0b" }}> · ⚠ out of stock</span>}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[
                      { mode: "jam",      emoji: "🍯", label: "Jam",      subLabel: "XP gain",   stock: Math.floor(game.artisan?.jam ?? 0) },
                      { mode: "fish_pie", emoji: "🥧", label: "Fish Pie", subLabel: "Class buff", stock: Math.floor(game.animalGoods?.fish_pie ?? 0) },
                    ].map(({ mode, emoji, label, subLabel, stock }) => {
                      const active = tavernMode === mode;
                      const disabled = tavernWorkers === 0;
                      return (
                        <button
                          key={mode}
                          onClick={() => !disabled && onToggleTavernMode(mode)}
                          style={{
                            flex: 1, padding: "0.4rem 0.5rem",
                            borderRadius: "8px",
                            cursor: disabled ? "default" : "pointer",
                            background: active && !disabled ? `rgba(${mode === "jam" ? "96,165,250" : "167,139,250"},0.15)` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${active && !disabled ? (mode === "jam" ? "#60a5fa" : "#a78bfa") : "var(--border)"}`,
                            color: disabled ? "var(--muted)" : active ? (mode === "jam" ? "#60a5fa" : "#a78bfa") : "var(--muted)",
                            opacity: disabled ? 0.45 : 1,
                            textAlign: "left",
                          }}
                        >
                          <div style={{ fontSize: "0.68rem", fontWeight: 700 }}>{emoji} {label}</div>
                          <div style={{ fontSize: "0.55rem", marginTop: "1px", opacity: 0.8 }}>{subLabel} · {stock} in stock</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Resting heroes */}
                {restingHeroes.length > 0 && (
                  <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.35rem", letterSpacing: "0.05em" }}>
                      😴 RESTING ({restingHeroes.length}) · send them on a mission from the World tab
                    </div>
                    {restingHeroes.map((hero) => {
                      const maxHp = hero.maxHp ?? 40;
                      const hp = hero.hp ?? maxHp;
                      const hpPct = Math.min(100, (hp / maxHp) * 100);
                      const hasBuff = !!hero.tavernBuff;
                      const buffDef = hasBuff ? Object.values(TAVERN_CLASS_BUFFS).find((b) => b.id === hero.tavernBuff) : null;
                      const isFullHp = hp >= maxHp;
                      return (
                        <div key={hero.id} style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          marginBottom: "0.3rem", padding: "0.35rem 0.5rem",
                          background: hasBuff ? "rgba(167,139,250,0.08)" : "rgba(234,179,8,0.05)",
                          border: `1px solid ${hasBuff ? "rgba(167,139,250,0.3)" : "rgba(234,179,8,0.18)"}`,
                          borderRadius: "7px",
                        }}>
                          <span style={{ fontSize: "0.9rem" }}>{hasBuff ? "✨" : isFullHp ? "💤" : "😴"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "2px" }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>{hero.name}</span>
                              {hasBuff ? (
                                <span style={{ fontSize: "0.55rem", color: "#a78bfa", fontWeight: 700, background: "rgba(167,139,250,0.15)", padding: "1px 5px", borderRadius: "4px" }}>
                                  {buffDef?.emoji} {buffDef?.name} ready!
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.55rem", color: isFullHp ? "#4ade80" : "#fbbf24" }}>
                                  {isFullHp ? "✓ full HP" : `+HP regen${activeTier >= 2 ? " +XP" : ""}`}
                                </span>
                              )}
                            </div>
                            <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${hpPct}%`, background: hpPct > 60 ? "#4ade80" : hpPct > 30 ? "#fbbf24" : "#ef4444", borderRadius: "2px" }} />
                            </div>
                          </div>
                          <span style={{ fontSize: "0.58rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{Math.floor(hp)}/{maxHp}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {restingHeroes.length === 0 && (
                  <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontStyle: "italic", paddingTop: "0.3rem" }}>
                    No heroes resting. Use the "Rest at Tavern" button on any idle hero in the World tab.
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Pre-build teaser */}
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
                  {!clinicBuilt
                    ? "Requires Town Hall Level 1."
                    : "A place for heroes to rest between missions. Idle heroes regen HP 3× faster here. Add bartenders + jam for bonus XP, or fish pie for class-specific mission buffs."}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>${TOWN_TAVERN_COST.toLocaleString()} treasury</div>
                  <button onClick={() => onBuildTownBuilding("tavern")} disabled={!canBuildTavern} className="btn" style={{ opacity: canBuildTavern ? 1 : 0.5 }}>Build Tavern</button>
                </div>
              </>
            )}
          </div>
        );
      })()}
 
      {/* 🏥 Clinic */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: tavernBuilt ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🏥 Clinic</div>
          {clinicBuilt && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>
              Built · {clinicWorkers} doctors
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {!tavernBuilt
            ? "Requires Tavern."
            : "Assign doctors to increase your town's population cap (+2/doctor) and satisfaction (+0.5%/doctor). Each doctor more than pays for themselves — 5 doctors = +10 population slots."}
        </div>
        {clinicBuilt && (
          <>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              <WorkerAssigner
                workers={clinicWorkers} freePeople={freePeople}
                onAdd={() => onAssignTownBuildingWorker("clinic", 1)}
                onRemove={() => onAssignTownBuildingWorker("clinic", -1)}
              />
              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                {clinicWorkers > 0 && (
                  <span>+<strong style={{ color: "#4ade80" }}>{clinicCapBonus.toFixed(1)}</strong> pop cap · +<strong style={{ color: "#60a5fa" }}>{clinicSatBonus.toFixed(1)}%</strong> sat</span>
                )}
              </div>
            </div>
          </>
        )}
        {!clinicBuilt && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>${TOWN_CLINIC_COST.toLocaleString()} treasury</div>
            <button onClick={() => onBuildTownBuilding("clinic")} disabled={!canBuildClinic} className="btn" style={{ opacity: canBuildClinic ? 1 : 0.5 }}>Build Clinic</button>
          </div>
        )}
      </div>
 
     {/* 🏫 School */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: clinicBuilt ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🏫 School</div>
          {schoolBuilt && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>
              Built · {schoolWorkers} researchers
            </span>
          )}
        </div>

        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {!clinicBuilt
            ? "Requires Clinic."
            : !schoolBuilt
            ? "Build a School to assign researchers and unlock higher-tier upgrades."
            : "Assign researchers to speed up growth and complete research projects that unlock advanced systems."}
        </div>

        {schoolBuilt && (
          <>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap" }}>
              <WorkerAssigner
                workers={schoolWorkers}
                freePeople={freePeople}
                onAdd={() => onAssignTownBuildingWorker("school", 1)}
                onRemove={() => onAssignTownBuildingWorker("school", -1)}
                label="researcher"
              />
              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                {schoolWorkers > 0 && (
                  <span>
                    +<strong style={{ color: "#4ade80" }}>{schoolGrowBonus.toFixed(1)}%</strong> grow ·
                    research time <strong style={{ color: "#a78bfa" }}>{(schoolResearchMult * 100).toFixed(0)}%</strong> ·
                    consumes <strong style={{ color: "#c084fc" }}>{schoolWorkers}🔮</strong>/s
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: "auto" }}>
                🔮 <strong style={{ color: (game.worldResources?.mana_crystal ?? 0) > 0 ? "#c084fc" : "#ef4444" }}>
                  {Math.floor(game.worldResources?.mana_crystal ?? 0).toLocaleString()}
                </strong> crystals
              </div>
            </div>

            {activeSchoolResearch ? (
              <div className="card p-3" style={{ marginBottom: "0.75rem", background: "var(--bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    {activeSchoolResearch.emoji} {activeSchoolResearch.name}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#a78bfa", fontWeight: 700 }}>
                    {schoolData?.researchProgress ?? 0} / {schoolData?.researchNeeded ?? 0}
                  </div>
                </div>

                <ResearchBar
                  progress={schoolData?.researchProgress ?? 0}
                  total={schoolData?.researchNeeded ?? 0}
                />

                <div style={{ fontSize: "0.66rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                  {schoolWorkers > 0
                    ? `${schoolWorkers} researcher${schoolWorkers !== 1 ? "s" : ""} working`
                    : "Assign researchers to make progress"}
                </div>
                {schoolWorkers > 0 && (game.worldResources?.mana_crystal ?? 0) < schoolWorkers && (
                  <div style={{ fontSize: "0.65rem", color: "#f87171", marginTop: "0.25rem", fontWeight: 600 }}>
                    ⚠️ Not enough 🔮 crystals — research stalled! ({Math.floor(game.worldResources?.mana_crystal ?? 0)} / {schoolWorkers} needed/s)
                  </div>
                )}
              </div>
            ) : (
              <div
                className="card p-3"
                style={{
                  marginBottom: "0.75rem",
                  background: "var(--bg)",
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                }}
              >
                No active research selected.
              </div>
            )}

            <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              Available Research
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.75rem" }}>
              {availableSchoolResearch.length === 0 ? (
                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                  All available research completed.
                </div>
              ) : (
                availableSchoolResearch.map((research) => {
                  const isSwitching = !!activeSchoolResearch;
                  const savedProgress = schoolData?.researchProgressMap?.[research.id] ?? 0;
                  const savedNeeded = Math.max(1, Math.floor(research.seconds * schoolResearchMult));
                  const hasSaved = savedProgress > 0;
                  return (
                    <div
                      key={research.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        background: "var(--bg)",
                        border: `1px solid ${hasSaved ? "rgba(167,139,250,0.35)" : "var(--border)"}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.74rem", fontWeight: 600 }}>
                          {research.emoji} {research.name}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                          {research.description} · base {research.seconds}s
                        </div>
                        {hasSaved && (
                          <div style={{ fontSize: "0.63rem", color: "#a78bfa", marginTop: "0.1rem", fontWeight: 600 }}>
                            💾 {savedProgress} / {savedNeeded} progress saved
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => onStartSchoolResearch(research.id)}
                        className="btn btn-secondary"
                        style={{ flexShrink: 0 }}
                      >
                        {isSwitching ? "Switch" : "Research"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {unlockedSchoolResearch.length > 0 && (
              <>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Completed Research
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {unlockedSchoolResearch.map((id) => {
                    const research = SCHOOL_RESEARCH[id];
                    if (!research) return null;
                    return (
                      <span
                        key={id}
                        style={{
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          padding: "0.22rem 0.5rem",
                          borderRadius: "999px",
                          background: "rgba(74,222,128,0.12)",
                          border: "1px solid rgba(74,222,128,0.35)",
                          color: "#4ade80",
                        }}
                      >
                        ✓ {research.emoji} {research.name}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {!schoolBuilt && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              ${TOWN_SCHOOL_COST.toLocaleString()} treasury
            </div>
            <button
              onClick={() => onBuildTownBuilding("school")}
              disabled={!canBuildSchool}
              className="btn"
              style={{ opacity: canBuildSchool ? 1 : 0.5 }}
            >
              Build School
            </button>
          </div>
        )}
      </div>
 
      {/* 🍽️ Restaurant */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: schoolBuilt ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🍽️ Restaurant</div>
          {restaurantBuilt && (
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              {restaurantWorkers > 0 && (
                <span style={{ fontSize: "0.62rem", color: restaurantStocked ? "#4ade80" : "#f59e0b" }}>
                  {restaurantStocked ? "✓ stocked" : "⚠ needs omelette+cheese"}
                </span>
              )}
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>
                Built · {restaurantWorkers} chefs
              </span>
            </div>
          )}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {!schoolBuilt
            ? "Requires School."
            : !bakeryLevel
            ? "Requires Bakery."
            : `Chefs boost satisfaction (+${RESTAURANT_SAT_PER_CHEF}%/chef) — can push sat above the food ceiling. Consumes omelettes + cheese each pulse.`}
        </div>
        {restaurantBuilt && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <WorkerAssigner
              workers={restaurantWorkers} freePeople={freePeople}
              onAdd={() => onAssignTownBuildingWorker("restaurant", 1)}
              onRemove={() => onAssignTownBuildingWorker("restaurant", -1)}
            />
            {restaurantWorkers > 0 && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                +<strong style={{ color: "#60a5fa" }}>{restaurantSatBonus.toFixed(1)}%</strong> sat ·{" "}
                <strong>{restaurantOmeletteCost}</strong>🍳 + <strong>{restaurantCheeseCost}</strong>🧀/pulse
                {" · "}have: {Math.floor(game.animalGoods?.omelette ?? 0)}🍳 {Math.floor(game.animalGoods?.cheese ?? 0)}🧀
              </div>
            )}
          </div>
        )}
        {!restaurantBuilt && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>${TOWN_RESTAURANT_COST.toLocaleString()} treasury</div>
            <button onClick={() => onBuildTownBuilding("restaurant")} disabled={!canBuildRestaurant} className="btn" style={{ opacity: canBuildRestaurant ? 1 : 0.5 }}>Build Restaurant</button>
          </div>
        )}
      </div>
 
      {/* 👗 Clothier */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: schoolBuilt ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>👗 Clothier</div>
          {clothierBuilt && (
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              {clothierWorkers > 0 && (
                <span style={{ fontSize: "0.62rem", color: clothierStocked ? "#4ade80" : "#f59e0b" }}>
                  {clothierStocked ? "✓ selling" : "⚠ no wool goods"}
                </span>
              )}
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80" }}>
                Built · {clothierWorkers} clerks
              </span>
            </div>
          )}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
          {!schoolBuilt
            ? "Requires School."
            : !woolShedBuilt
            ? "Requires Wool Shed."
            : `Clerks sell knitted goods directly to town for a price premium ($${CLOTHIER_CASH_PER_CLERK}/clerk/pulse). Consumes knitted goods each pulse.`}
        </div>
        {clothierBuilt && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <WorkerAssigner
              workers={clothierWorkers} freePeople={freePeople}
              onAdd={() => onAssignTownBuildingWorker("clothier", 1)}
              onRemove={() => onAssignTownBuildingWorker("clothier", -1)}
            />
            {clothierWorkers > 0 && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                +<strong style={{ color: "#4ade80" }}>${clothierCash}</strong>/pulse ·{" "}
                <strong>{clothierCost}</strong>🧥/pulse · have: {Math.floor(game.animalGoods?.knitted_goods ?? 0)}
              </div>
            )}
          </div>
        )}
        {!clothierBuilt && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>${TOWN_CLOTHIER_COST.toLocaleString()} treasury</div>
            <button onClick={() => onBuildTownBuilding("clothier")} disabled={!canBuildClothier} className="btn" style={{ opacity: canBuildClothier ? 1 : 0.5 }}>Build Clothier</button>
          </div>
        )}
      </div>
 
      </CollapsibleCard>

      <CollapsibleCard
        title="📘 How Town Works"
        subtitle="Quick reference"
        defaultOpen={false}
      >
      {/* How it works */}
      <div className="card p-4" style={{ marginBottom: 0 }}>
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
      </CollapsibleCard>
      </div>
      )}
    </div>
  );
}