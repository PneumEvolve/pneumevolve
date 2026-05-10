// src/Pages/rootwork/components/TownZone.jsx

import React, { useState } from "react";
import {
  TOWN_HOME_CAPACITY, TOWN_PULSE_SECONDS, TOWN_HALL_MAX_LEVEL,
  TOWN_HALL_LEVEL_COSTS, TOWN_HALL_L1_IRON, TOWN_HALL_L1_LUMBER,
  TOWN_HALL_L2_IRON, TOWN_HALL_L2_LUMBER,
  TOWN_HALL_L3_IRON, TOWN_HALL_L3_LUMBER, TOWN_HALL_L3_FITTING,
  TOWN_HALL_L4_FITTING, TOWN_HALL_L4_CRATE,
  PERSON_IDLE_FOOD_COST, PERSON_WORKING_FOOD_COST, BREAD_FOOD_UNITS,
  TOWN_SCHOOL_COST,
  TAVERN_LEVEL_COSTS, TAVERN_LEVEL_IRON, TAVERN_LEVEL_LUMBER, TAVERN_LEVEL_REGEN,
  FOOD_HALL_SAT_CEILING, FOOD_HALL_FOOD_MODE,
  TOWN_FOOD_HALL_COST, TOWN_FOOD_HALL_TIER2_COST, TOWN_FOOD_HALL_TIER3_COST,
  TOWN_FOOD_HALL_TIER2_REQUIRES, TOWN_FOOD_HALL_TIER3_REQUIRES,
  TOWN_WAREHOUSE_COST,
  TOWN_KITCHEN_HALL_COST, KITCHEN_HALL_LEVEL_COSTS, KITCHEN_HALL_LEVEL_REQUIRES,
  KITCHEN_HALL_MAX_WORKERS, KITCHEN_HALL_RETAIN_COUNT,
  TOWN_MARKET_HALL_COST, MARKET_HALL_LEVEL_COSTS, MARKET_HALL_LEVEL_REQUIRES,
  MARKET_HALL_MAX_WORKERS, MARKET_HALL_PRICE_BONUS, MARKET_HALL_RETAIN_COUNT,
  TOWN_BARN_HALL_COST, BARN_HALL_LEVEL_COSTS, BARN_HALL_LEVEL_REQUIRES,
  TOWN_FORGE_HALL_COST, FORGE_HALL_LEVEL_COSTS, FORGE_HALL_LEVEL_REQUIRES,
  TOWN_GUILD_HALL_COST, getGuildHallUpgradeCost, getGuildHallUpgradeRequires,
  GUILD_HALL_QUEST_TIER,
  TOWN_REC_HALL_COST,
  ROAD_TIERS, TOWN_REC_HALL_REQUIRES, REC_HALL_UPGRADE_COSTS, REC_HALL_UPGRADE_REQUIRES,
  REC_HALL_CASH_PER_WORKER,
  SCHOOL_RESEARCH,
} from "../gameConstants";
import {
  getTownHomeCost, getTotalWorkersHired, getAvailableWorkerSlots,
  getSatisfactionTarget, getTownHallLevel, getEffectivePulseSeconds,
  isTownBuildingBuilt, getTownBuildingWorkers, getFreePeople,
  getSchoolGrowBonus, getSchoolResearchMultiplier,
  getTavernLevel, getTavernRegenRate,
  getTownCapacity, getSchoolData, getActiveSchoolResearch, getAvailableSchoolResearch,
  getWarehouseCropCap, getWarehouseUpgradeCost, getWarehouseUpgradeRequires,
  getWarehouseLevelBaseCap, getWarehouseLevelCapPerWorker, getWarehouseLevelMaxWorkers, getWarehouseLevelName,
  getMaxKitchenWorkers, getMaxMarketWorkers, getMaxBarnWorkersPerBuilding, getBarnHallRetainCount,
  getMaxForgeWorkers, getForgeHallRecipeTier, getForgeHallRetainCount,
  getMaxHeroes, getGuildHallQuestTier, getSatisfactionCeiling,
  getBankPriceBonus, getRecHallSatBonus, getRecHallMaxWorkers,
  getRoadLevel, getRoadNextTier, canAffordRoad,
} from "../gameEngine";
import SeasonPanel from "./SeasonPanel";
import StatsPanel from "./StatsPanel";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function fmt(n) { return Math.floor(n).toLocaleString(); }

// ─── Sub-components ────────────────────────────────────────────────────────────

function WorkerAssigner({ workers, maxWorkers, freePeople, onAdd, onRemove }) {
  const atMax = workers >= maxWorkers;
  const atMin = workers <= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <button onClick={onRemove} disabled={atMin} className="btn"
        style={{ width: 28, height: 28, padding: 0, fontSize: "1rem", opacity: atMin ? 0.3 : 1 }}>−</button>
      <span style={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>{workers}</span>
      <button onClick={onAdd} disabled={atMax || freePeople <= 0} className="btn"
        style={{ width: 28, height: 28, padding: 0, fontSize: "1rem", opacity: (atMax || freePeople <= 0) ? 0.3 : 1 }}>+</button>
      <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>/ {maxWorkers} max</span>
    </div>
  );
}

function SatBar({ satisfaction, ceiling }) {
  const pct = clamp((satisfaction / ceiling) * 100, 0, 100);
  const color = satisfaction >= 125 ? "#4ade80"
    : satisfaction >= 100 ? "#a3e635"
    : satisfaction >= 80  ? "#f59e0b"
    : "#ef4444";
  return (
    <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
    </div>
  );
}

// A collapsible building card
function BuildingCard({ emoji, title, badge, badgeColor = "#4ade80", locked, lockedMsg, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 12,
      overflow: "hidden", opacity: locked ? 0.5 : 1,
      marginBottom: "0.6rem",
    }}>
      <button
        onClick={() => !locked && setOpen(o => !o)}
        style={{
          width: "100%", background: "var(--card)", border: "none", cursor: locked ? "default" : "pointer",
          padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>{emoji}</span>
        <span style={{ fontWeight: 700, fontSize: "0.88rem", flex: 1 }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: "0.62rem", fontWeight: 700, padding: "0.15rem 0.5rem",
            borderRadius: 999, background: `${badgeColor}22`, border: `1px solid ${badgeColor}`,
            color: badgeColor,
          }}>{badge}</span>
        )}
        {locked
          ? <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>🔒 {lockedMsg}</span>
          : <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
        }
      </button>
      {open && !locked && (
        <div style={{ padding: "0 1rem 1rem", background: "var(--card)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, sub, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.78rem", marginBottom: "0.25rem" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor ?? "var(--text)" }}>
        {value}{sub && <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.7rem" }}> {sub}</span>}
      </span>
    </div>
  );
}

function CostLine({ cash, cashCost, materials, have }) {
  const canAfford = (cash ?? 0) >= (cashCost ?? 0);
  return (
    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.4rem" }}>
      {cashCost != null && (
        <span style={{ color: canAfford ? "var(--muted)" : "#ef4444" }}>${fmt(cashCost)}</span>
      )}
      {materials && Object.entries(materials).map(([k, v]) => {
        const h = have?.[k] ?? 0;
        return (
          <span key={k} style={{ marginLeft: "0.4rem", color: h >= v ? "var(--muted)" : "#ef4444" }}>
            {v} {k.replace("_", " ")}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────



// ─── Quest Progress Tracker ────────────────────────────────────────────────────


export default function TownZone({
  game,
  onBuildHome,
  onUpgradeTownHall,
  onBuildTownBuilding,
  onAssignTownBuildingWorker,
  onUpgradeTavern,
  onStartSchoolResearch,
  prestigeReady,
  onPrestige,
  onReset,
  // New building actions — wired up in RootWork
  onBuildFoodHall,
  onUpgradeFoodHall,
  onSetFoodMode,
  onBuildWarehouse,
  onUpgradeWarehouse,
  onBuildKitchenHall,
  onUpgradeKitchenHall,
  onBuildMarketHall,
  onUpgradeMarketHall,
  onBuildGuildHall,
  onUpgradeGuildHall,
  onBuildBarnHall,
  onUpgradeBarnHall,
  onBuildForgeHall,
  onUpgradeForgeHall,
  onBuildRecHall,
  onUpgradeRecHall,
  onBuildOrUpgradeRoad,
  // Legacy props kept so RootWork doesn't need changes yet — ignored
  onBuyBakery, onToggleBakery, onTogglePantry, onToggleCannery,
  onUpgradeTownBuilding, onBuyJamBuilding, onBuySauceBuilding,
  onSetTreasuryTier, onBuildBank, onUpgradeBank, onSetActiveBankTier,
  onSetTreasuryCap, onInvestNow, onToggleTavernMode, onClaimQuestReward,
}) {
  const [subTab, setSubTab] = useState("town");

  const town        = game.town ?? {};
  const buildings   = town.buildings ?? {};
  const cash        = game.cash ?? 0;
  const worldRes    = game.worldResources ?? {};
  const forgeGoods  = game.forgeGoods ?? {};

  // Helper to get material amounts from worldRes + forgeGoods
  function have(key) {
    return (worldRes[key] ?? 0) + (forgeGoods[key] ?? 0);
  }

  // Core town stats
  const people       = Math.floor(town.people ?? 0);
  const capacity     = getTownCapacity(game);
  const totalWorkers = getTotalWorkersHired(game);
  const freePeople   = getFreePeople(game);
  const satisfaction = town.satisfaction ?? 80;
  const satCeiling   = getSatisfactionCeiling(game);
  const satTarget    = getSatisfactionTarget(game);
  const starving     = town.starving === true;
  const foodMode     = town.foodMode ?? "wheat";
  const pulseLeft    = Math.ceil(Math.max(0, town.pulseSeconds ?? TOWN_PULSE_SECONDS));

  const thLevel      = getTownHallLevel(game);
  const thNextCost   = thLevel < TOWN_HALL_MAX_LEVEL ? TOWN_HALL_LEVEL_COSTS[thLevel] : null;
  const canUpgradeTH = thNextCost !== null && cash >= thNextCost && (() => {
    if (thLevel === 1) return (worldRes.iron_ore ?? 0) >= TOWN_HALL_L2_IRON && (worldRes.lumber ?? 0) >= TOWN_HALL_L2_LUMBER;
    if (thLevel === 2) return (worldRes.iron_ore ?? 0) >= TOWN_HALL_L3_IRON && (worldRes.lumber ?? 0) >= TOWN_HALL_L3_LUMBER && have("iron_fitting") >= TOWN_HALL_L3_FITTING;
    if (thLevel === 3) return have("iron_fitting") >= TOWN_HALL_L4_FITTING && have("reinforced_crate") >= TOWN_HALL_L4_CRATE;
    return cash >= thNextCost;
  })();

  // Building state shortcuts
  const foodHallTier  = buildings.food_hall?.tier ?? 0;
  const foodHallBuilt = foodHallTier > 0;
  const warehouseBuilt = buildings.warehouse?.built === true;
  const warehouseLevel   = buildings.warehouse?.level ?? ((buildings.warehouse?.tier ?? 0) + 1);
  const warehouseWorkers = buildings.warehouse?.workers ?? 0;
  const kitchenHallBuilt = buildings.kitchen_hall?.built === true;
  const kitchenHallLevel = buildings.kitchen_hall?.level ?? 0;
  const marketHallBuilt  = buildings.market_hall?.built === true;
  const marketHallLevel  = buildings.market_hall?.level ?? 0;
  const guildHallBuilt   = buildings.guild_hall?.built === true;
  const guildHallLevel   = buildings.guild_hall?.level ?? 0;
  const barnHallBuilt    = buildings.barn_hall?.built === true;
  const barnHallLevel    = buildings.barn_hall?.level ?? 0;
  const forgeHallBuilt   = buildings.forge_hall?.built === true;
  const forgeHallLevel   = buildings.forge_hall?.level ?? 0;
  const tavernLevel      = getTavernLevel(game);
  const tavernBuilt      = tavernLevel > 0;
  const schoolBuilt      = buildings.school?.built === true;

  const schoolWorkers = buildings.school?.workers ?? 0;

  const recHallBuilt   = buildings.recreation_hall?.built === true;
  const recHallTier    = buildings.recreation_hall?.tier ?? 1;
  const recHallWorkers = buildings.recreation_hall?.workers ?? 0;
  const th3            = thLevel >= 3;

  const homeCost    = getTownHomeCost(game);
  const canBuyHome  = cash >= homeCost;

  // TH gates
  const th0 = thLevel >= 0; // always available
  const th1 = thLevel >= 1;
  const th2 = thLevel >= 2;

  // Food mode display
  const foodModeEmoji = { wheat: "🌾", bread: "🍞", jam: "🍯", sauce: "🥫" }[foodMode] ?? "🌾";
  const foodModeLabel = { wheat: "Wheat", bread: "Bread", jam: "Jam", sauce: "Sauce" }[foodMode] ?? "Wheat";

  // Sat color
  const satColor = satisfaction >= 125 ? "#4ade80" : satisfaction >= 100 ? "#a3e635" : satisfaction >= 80 ? "#f59e0b" : "#ef4444";
  const satEmoji = satisfaction >= 125 ? "😄" : satisfaction >= 100 ? "😊" : satisfaction >= 80 ? "😐" : "😟";

  // School
  const schoolData           = getSchoolData(game);
  const activeResearch       = getActiveSchoolResearch(game);
  const availableResearch    = getAvailableSchoolResearch(game);
  const unlockedResearch     = schoolData?.unlockedResearch ?? [];

  return (
    <div style={{ paddingBottom: "5rem" }}>
      {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
        {[["town", "🏘️ Town"], ["stats", "📊 Stats"], ["season", "🌿 Season"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} className="btn"
            style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem", position: "relative",
              background: subTab === id ? "var(--accent)" : "var(--card)",
              color: subTab === id ? "#fff" : "var(--text)",
              border: `1px solid ${subTab === id ? "var(--accent)" : "var(--border)"}`,
            }}>
            {label}
            {id === "season" && prestigeReady && (
              <span style={{
                position: "absolute", top: "3px", right: "5px",
                background: "#f59e0b", color: "#fff",
                fontSize: "0.5rem", fontWeight: 700,
                borderRadius: "999px", padding: "1px 4px",
                lineHeight: 1.4,
              }}>🌱</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stats tab ────────────────────────────────────────────────────── */}
      {subTab === "stats" && <StatsPanel game={game} />}

      {/* ── Season tab ───────────────────────────────────────────────────── */}
      {subTab === "season" && (
        <SeasonPanel game={game} prestigeReady={prestigeReady} onPrestige={onPrestige} onReset={onReset} onClaimQuestReward={onClaimQuestReward} />
      )}

      {/* ── Town tab ─────────────────────────────────────────────────────── */}
      {subTab === "town" && (
        <div>

          {/* ── Town overview card ─────────────────────────────────────── */}
          <div className="card p-4" style={{ marginBottom: "1rem" }}>
            {/* Stat grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[
                { emoji: "👥", value: `${people}/${capacity}`, sub: "people" },
                { emoji: "💼", value: `${totalWorkers}`, sub: `${freePeople} free` },
                { emoji: satEmoji, value: `${satisfaction}%`, sub: "sat", color: satColor },
                { emoji: foodModeEmoji, value: foodModeLabel, sub: `${pulseLeft}s`, color: "var(--text)" },
              ].map(({ emoji, value, sub, color }, i) => (
                <div key={i} style={{ background: "var(--bg)", borderRadius: 8, padding: "0.5rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1rem" }}>{emoji}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>
                  <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Satisfaction bar */}
            <div style={{ marginBottom: "0.3rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.2rem" }}>
                <span>Satisfaction → worker speed</span>
                <span style={{ color: satColor }}>{satisfaction}% / {satCeiling}% ceiling</span>
              </div>
              <SatBar satisfaction={satisfaction} ceiling={satCeiling} />
            </div>
            {starving && (
              <div style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "#ef4444", fontWeight: 600 }}>
                ⚠️ Town is starving — people are leaving
              </div>
            )}
          </div>

          {/* ── Town Hall ──────────────────────────────────────────────── */}
          <BuildingCard
            emoji="🏛️" title="Town Hall"
            badge={thLevel > 0 ? `Level ${thLevel}` : "Not built"}
            badgeColor={thLevel > 0 ? "#4ade80" : "#f59e0b"}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Gates all buildings and is required to prestige each season.
              {thLevel >= TOWN_HALL_MAX_LEVEL && " Fully upgraded."}
            </div>
            <Row label="Current level" value={thLevel} />
            <Row label="Unlocks at TH1" value="Kitchen Hall, Market Hall, Forge Hall, Tavern" />
            <Row label="Unlocks at TH2" value="Guild Hall, Barn Hall, School" />
            {thLevel < TOWN_HALL_MAX_LEVEL && (
              <>
                <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>Upgrade to level {thLevel + 1}</div>
                  <CostLine cash={cash} cashCost={thNextCost}
                    materials={
                      thLevel === 1 ? { iron_ore: TOWN_HALL_L2_IRON, lumber: TOWN_HALL_L2_LUMBER }
                      : thLevel === 2 ? { iron_ore: TOWN_HALL_L3_IRON, lumber: TOWN_HALL_L3_LUMBER, iron_fitting: TOWN_HALL_L3_FITTING }
                      : thLevel === 3 ? { iron_fitting: TOWN_HALL_L4_FITTING, reinforced_crate: TOWN_HALL_L4_CRATE }
                      : null
                    }
                    have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting"), reinforced_crate: have("reinforced_crate") }}
                  />
                </div>
                <button onClick={onUpgradeTownHall} disabled={!canUpgradeTH} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: canUpgradeTH ? 1 : 0.5 }}>
                  Upgrade Town Hall → Level {thLevel + 1}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Homes ──────────────────────────────────────────────────── */}
          <BuildingCard emoji="🏠" title="Homes"
            badge={`${town.homes ?? 0} built · ${people}/${capacity} people`}
            badgeColor="#60a5fa"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Each home adds {TOWN_HOME_CAPACITY} population capacity. Workers and adventurers
              each require one population slot.
            </div>
            <Row label="Homes built" value={town.homes ?? 0} />
            <Row label="Capacity" value={`${people} / ${capacity}`} sub="(clinic-capped)" />
            <Row label="Next home cost" value={`$${fmt(homeCost)}`} />
            <button onClick={onBuildHome} disabled={!canBuyHome} className="btn w-full"
              style={{ marginTop: "0.5rem", opacity: canBuyHome ? 1 : 0.5 }}>
              Build Home — ${fmt(homeCost)}
            </button>
          </BuildingCard>

          {/* ── Food Hall ──────────────────────────────────────────────── */}
          <BuildingCard emoji="🍽️" title="Food Hall"
            badge={foodHallBuilt ? `Tier ${foodHallTier} · ${foodModeLabel} mode` : "Not built"}
            badgeColor={foodHallBuilt ? "#4ade80" : "#f59e0b"}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Sets the satisfaction ceiling and what food the town consumes each pulse.
              Bread always feeds — jam and sauce match the bread cost for the sat bonus.
            </div>

            {/* Tier grid — click any unlocked mode to switch */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem", marginBottom: "0.6rem" }}>
              {FOOD_HALL_FOOD_MODE.map((mode, tier) => {
                const emoji = { wheat: "🌾", bread: "🍞", jam: "🍯", sauce: "🥫" }[mode];
                // "wheat" (tier 0) is always selectable once the Food Hall is built; others require foodHallTier >= tier
                const selectable = foodHallBuilt && (tier === 0 || foodHallTier >= tier);
                const active = foodMode === mode;
                const unlocked = foodHallTier >= tier;
                return (
                  <div key={tier}
                    onClick={selectable && !active ? () => onSetFoodMode(mode) : undefined}
                    style={{
                      textAlign: "center", padding: "0.4rem 0.2rem", borderRadius: 8,
                      border: `1px solid ${active ? "#4ade80" : selectable ? "var(--border)" : "var(--border)"}`,
                      background: active ? "rgba(74,222,128,0.1)" : unlocked ? "var(--bg)" : "transparent",
                      opacity: unlocked ? 1 : 0.4,
                      cursor: selectable && !active ? "pointer" : "default",
                      transition: "border-color 0.15s, background 0.15s",
                    }}>
                    <div style={{ fontSize: "1rem" }}>{emoji}</div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: active ? "#4ade80" : "var(--text)" }}>{mode}</div>
                    <div style={{ fontSize: "0.58rem", color: active ? "#4ade80" : "#a3e635" }}>{FOOD_HALL_SAT_CEILING[tier]}% ceil</div>
                  </div>
                );
              })}
            </div>

            {/* Live food cost breakdown */}
            {(() => {
              const idlePpl = Math.max(0, people - totalWorkers);
              const foodUnits = (idlePpl * PERSON_IDLE_FOOD_COST) + (totalWorkers * PERSON_WORKING_FOOD_COST);
              const breadCost = foodUnits === 0 ? 0 : Math.max(1, Math.ceil(foodUnits / BREAD_FOOD_UNITS));
              const wheatCost = foodUnits;
              const modeEmoji = { wheat: "🌾", bread: "🍞", jam: "🍯", sauce: "🥫" }[foodMode] ?? "🌾";
              const breadHave  = Math.floor(game.artisan?.bread ?? 0);
              const jamHave    = Math.floor(game.artisan?.jam   ?? 0);
              const sauceHave  = Math.floor(game.artisan?.sauce ?? 0);
              const wheatHave  = Math.floor(game.crops?.wheat   ?? 0);

              const rows = [];
              if (foodMode === "wheat") {
                rows.push({ emoji: "🌾", label: "Wheat / pulse", cost: wheatCost, have: wheatHave });
              } else {
                rows.push({ emoji: "🍞", label: "Bread / pulse", cost: breadCost, have: breadHave });
                if (foodMode === "jam" || foodMode === "sauce") {
                  rows.push({ emoji: "🍯", label: "Jam / pulse", cost: breadCost, have: jamHave });
                }
                if (foodMode === "sauce") {
                  rows.push({ emoji: "🥫", label: "Sauce / pulse", cost: breadCost, have: sauceHave });
                }
              }

              return (
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: "0.5rem 0.6rem", marginBottom: "0.6rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.35rem", fontWeight: 600 }}>
                    {modeEmoji} Next pulse cost — {people} people, {totalWorkers} working
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                    Food units needed: <strong style={{ color: "var(--text)" }}>{foodUnits}</strong>
                    <span style={{ fontSize: "0.62rem" }}> ({idlePpl} idle ×{PERSON_IDLE_FOOD_COST} + {totalWorkers} working ×{PERSON_WORKING_FOOD_COST})</span>
                  </div>
                  {rows.map(({ emoji, label, cost, have }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.15rem" }}>
                      <span style={{ color: "var(--muted)" }}>{emoji} {label}</span>
                      <span style={{ fontWeight: 700, color: have >= cost ? "#4ade80" : "#ef4444" }}>
                        {cost} <span style={{ fontWeight: 400, fontSize: "0.65rem", color: "var(--muted)" }}>({have} on hand)</span>
                      </span>
                    </div>
                  ))}
                  {starving && (
                    <div style={{ marginTop: "0.3rem", fontSize: "0.68rem", color: "#ef4444", fontWeight: 700 }}>⚠ Town is starving!</div>
                  )}
                </div>
              );
            })()}
            {!foodHallBuilt ? (
              <>
                <CostLine cash={cash} cashCost={TOWN_FOOD_HALL_COST} />
                <button onClick={onBuildFoodHall} disabled={cash < TOWN_FOOD_HALL_COST} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_FOOD_HALL_COST ? 1 : 0.5 }}>
                  Build Food Hall — ${fmt(TOWN_FOOD_HALL_COST)}
                </button>
              </>
            ) : foodHallTier < 3 ? (
              <>
                <div style={{ marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                    Upgrade to Tier {foodHallTier + 1} — {FOOD_HALL_FOOD_MODE[foodHallTier + 1]} mode ({FOOD_HALL_SAT_CEILING[foodHallTier + 1]}% ceiling)
                  </div>
                  <CostLine
                    cash={cash}
                    cashCost={foodHallTier === 1 ? TOWN_FOOD_HALL_TIER2_COST : TOWN_FOOD_HALL_TIER3_COST}
                    materials={foodHallTier === 1 ? TOWN_FOOD_HALL_TIER2_REQUIRES : TOWN_FOOD_HALL_TIER3_REQUIRES}
                    have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting") }}
                  />
                </div>
                <button onClick={onUpgradeFoodHall} className="btn w-full" style={{ marginTop: "0.5rem" }}>
                  Upgrade Food Hall → Tier {foodHallTier + 1}
                </button>
              </>
            ) : (
              <div style={{ fontSize: "0.72rem", color: "#4ade80", marginTop: "0.4rem" }}>✓ Fully upgraded — sauce mode active</div>
            )}
          </BuildingCard>

          {/* ── Warehouse ──────────────────────────────────────────────── */}
          {(() => {
            const upgradeCost = warehouseBuilt ? getWarehouseUpgradeCost(warehouseLevel) : 0;
            const upgradeReqs = warehouseBuilt ? getWarehouseUpgradeRequires(warehouseLevel) : {};
            const maxW = warehouseBuilt ? getWarehouseLevelMaxWorkers(warehouseLevel) : 0;
            const baseCap = warehouseBuilt ? getWarehouseLevelBaseCap(warehouseLevel) : 0;
            const perWorker = warehouseBuilt ? getWarehouseLevelCapPerWorker(warehouseLevel) : 0;
            const levelName = warehouseBuilt ? getWarehouseLevelName(warehouseLevel) : "";
            const canUpgrade = warehouseBuilt && (cash >= upgradeCost) && Object.entries(upgradeReqs).every(([k, v]) => have(k) >= v);
            return (
              <BuildingCard emoji="🏗️" title="Warehouse"
                badge={warehouseBuilt ? `Level ${warehouseLevel} · ${warehouseWorkers}/${maxW} workers` : "Not built"}
                badgeColor={warehouseBuilt ? "#4ade80" : "#f59e0b"}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
                  Caps crop storage. Overflow is lost — upgrade the warehouse to raise the cap.
                  Workers multiply the cap per level.
                </div>
                {warehouseBuilt ? (
                  <>
                    <Row label="Level" value={`${warehouseLevel} — ${levelName}`} />
                    <Row label="Base cap" value={fmt(baseCap)} sub="per crop" />
                    <Row label="Per worker" value={`+${fmt(perWorker)}`} />
                    <Row label="Current cap" value={fmt(getWarehouseCropCap(game))} sub="per crop" valueColor="#4ade80" />
                    <div style={{ marginTop: "0.5rem" }}>
                      <WorkerAssigner
                        workers={warehouseWorkers}
                        maxWorkers={maxW}
                        freePeople={freePeople}
                        onAdd={() => onAssignTownBuildingWorker("warehouse", 1)}
                        onRemove={() => onAssignTownBuildingWorker("warehouse", -1)}
                      />
                    </div>
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                        Upgrade to Level {warehouseLevel + 1} — {getWarehouseLevelName(warehouseLevel + 1)}
                      </div>
                      <CostLine
                        cash={cash}
                        cashCost={upgradeCost}
                        materials={upgradeReqs}
                        have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting") }}
                      />
                    </div>
                    <button onClick={onUpgradeWarehouse} disabled={!canUpgrade} className="btn w-full"
                      style={{ marginTop: "0.5rem", opacity: canUpgrade ? 1 : 0.5 }}>
                      Upgrade Warehouse → Level {warehouseLevel + 1}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ background: "var(--bg)", borderRadius: 8, padding: "0.5rem 0.6rem", marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
                        📦 Storage without warehouse
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#ef4444", marginBottom: "0.2rem" }}>150 per crop</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                        After building: <strong style={{ color: "var(--text)" }}>500</strong> base per crop (+ 200 per worker)
                      </div>
                    </div>
                    <CostLine cash={cash} cashCost={TOWN_WAREHOUSE_COST} />
                    <button onClick={onBuildWarehouse} disabled={cash < TOWN_WAREHOUSE_COST} className="btn w-full"
                      style={{ marginTop: "0.5rem", opacity: cash >= TOWN_WAREHOUSE_COST ? 1 : 0.5 }}>
                      Build Warehouse — ${fmt(TOWN_WAREHOUSE_COST)}
                    </button>
                  </>
                )}
              </BuildingCard>
            );
          })()}

          {/* ── Kitchen Hall ───────────────────────────────────────────── */}
          <BuildingCard emoji="🍳" title="Kitchen Hall"
            badge={kitchenHallBuilt ? `Level ${kitchenHallLevel}` : "Not built"}
            badgeColor={kitchenHallBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th1} lockedMsg="Requires Town Hall level 1"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Gates how many kitchen workers you can hire and unlocks batch upgrades.
              Higher levels also retain workers across season prestige.
            </div>
            {kitchenHallBuilt ? (
              <>
                <Row label="Max kitchen workers" value={getMaxKitchenWorkers(game)} />
                <Row label="Auto-retain on prestige" value={`${kitchenHallLevel <= KITCHEN_HALL_RETAIN_COUNT.length ? KITCHEN_HALL_RETAIN_COUNT[kitchenHallLevel - 1] : kitchenHallLevel - 1} workers`} />
                {(() => {
                  const nextCost = kitchenHallLevel <= 2
                    ? KITCHEN_HALL_LEVEL_COSTS[kitchenHallLevel - 1]
                    : Math.round(6_000 * Math.pow(2, kitchenHallLevel - 3));
                  const nextRequires = kitchenHallLevel <= 2
                    ? KITCHEN_HALL_LEVEL_REQUIRES[kitchenHallLevel - 1]
                    : { iron_fitting: 2 + (kitchenHallLevel - 3) * 2, iron_ore: 20 + (kitchenHallLevel - 3) * 10, lumber: 15 + (kitchenHallLevel - 3) * 8 };
                  const nextMaxWorkers = kitchenHallLevel < 3
                    ? KITCHEN_HALL_MAX_WORKERS[kitchenHallLevel]
                    : 4 + (kitchenHallLevel - 2) * 2;
                  return (
                    <>
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                          Upgrade to Level {kitchenHallLevel + 1} — {nextMaxWorkers} workers max · {kitchenHallLevel <= KITCHEN_HALL_RETAIN_COUNT.length ? KITCHEN_HALL_RETAIN_COUNT[kitchenHallLevel] ?? kitchenHallLevel : kitchenHallLevel} retain on prestige
                        </div>
                        <CostLine
                          cash={cash}
                          cashCost={nextCost}
                          materials={nextRequires}
                          have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting") }}
                        />
                      </div>
                      <button onClick={onUpgradeKitchenHall} className="btn w-full" style={{ marginTop: "0.5rem" }}>
                        Upgrade Kitchen Hall
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TOWN_KITCHEN_HALL_COST} />
                <button onClick={onBuildKitchenHall} disabled={cash < TOWN_KITCHEN_HALL_COST} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_KITCHEN_HALL_COST ? 1 : 0.5 }}>
                  Build Kitchen Hall — ${fmt(TOWN_KITCHEN_HALL_COST)}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Market Hall ────────────────────────────────────────────── */}
          <BuildingCard emoji="🛒" title="Market Hall"
            badge={marketHallBuilt ? `Level ${marketHallLevel}` : "Not built"}
            badgeColor={marketHallBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th1} lockedMsg="Requires Town Hall level 1"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Gates market worker count and unlocks sell price bonuses.
              Level 2 gives +10% sell prices. Level 3 gives +25%. Also retains workers across prestige.
            </div>
            {marketHallBuilt ? (
              <>
                <Row label="Max market workers" value={getMaxMarketWorkers(game)} />
                <Row label="Sell price bonus" value={`+${MARKET_HALL_PRICE_BONUS[Math.min(marketHallLevel - 1, MARKET_HALL_PRICE_BONUS.length - 1)]}%`} valueColor="#4ade80" />
                <Row label="Auto-retain on prestige" value={`${MARKET_HALL_RETAIN_COUNT[Math.min(marketHallLevel - 1, MARKET_HALL_RETAIN_COUNT.length - 1)]} workers`} />
                {(() => {
                  const nextCost = marketHallLevel <= 2
                    ? MARKET_HALL_LEVEL_COSTS[marketHallLevel - 1]
                    : Math.round(8_000 * Math.pow(2, marketHallLevel - 3));
                  const nextRequires = marketHallLevel <= 2
                    ? MARKET_HALL_LEVEL_REQUIRES[marketHallLevel - 1]
                    : { iron_fitting: 3 + (marketHallLevel - 3) * 2, iron_ore: 25 + (marketHallLevel - 3) * 10, lumber: 20 + (marketHallLevel - 3) * 8 };
                  const nextMaxWorkers = marketHallLevel < 3
                    ? MARKET_HALL_MAX_WORKERS[marketHallLevel]
                    : 4 + (marketHallLevel - 2) * 2;
                  const nextPriceBonus = MARKET_HALL_PRICE_BONUS[Math.min(marketHallLevel, MARKET_HALL_PRICE_BONUS.length - 1)];
                  return (
                    <>
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                          Upgrade to Level {marketHallLevel + 1} — {nextMaxWorkers} workers max{marketHallLevel < 3 ? ` · +${nextPriceBonus}% sell prices` : ""}
                        </div>
                        <CostLine
                          cash={cash}
                          cashCost={nextCost}
                          materials={nextRequires}
                          have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting") }}
                        />
                      </div>
                      <button onClick={onUpgradeMarketHall} className="btn w-full" style={{ marginTop: "0.5rem" }}>
                        Upgrade Market Hall
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TOWN_MARKET_HALL_COST} />
                <button onClick={onBuildMarketHall} disabled={cash < TOWN_MARKET_HALL_COST} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_MARKET_HALL_COST ? 1 : 0.5 }}>
                  Build Market Hall — ${fmt(TOWN_MARKET_HALL_COST)}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Forge Hall ────────────────────────────── */}
          <BuildingCard emoji="⚒️" title="Forge Hall"
            badge={forgeHallBuilt ? `Level ${forgeHallLevel}` : "Not built"}
            badgeColor={forgeHallBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th1} lockedMsg="Requires Town Hall level 1"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Gates how many smiths you can hire. L2 unlocks T2 recipes, L3 unlocks T3 recipes, L4 unlocks the Arcane Upgrade Machine.
              Higher levels also retain smiths across season prestige.
            </div>
            {forgeHallBuilt ? (
              <>
                <Row label="Max smiths" value={getMaxForgeWorkers(game)} />
                <Row label="Recipe tier" value={`T${getForgeHallRecipeTier(game)} unlocked`} />
                <Row label="Arcane Machine" value={forgeHallLevel >= 4 ? "✓ Unlocked" : `Unlocks at L4`} valueColor={forgeHallLevel >= 4 ? "#4ade80" : "var(--muted)"} />
                <Row label="Auto-retain on prestige" value={`${getForgeHallRetainCount(game)} smiths`} />
                {(() => {
                  const nextCost = forgeHallLevel <= 3
                    ? FORGE_HALL_LEVEL_COSTS[forgeHallLevel - 1]
                    : Math.round(15_000 * Math.pow(2, forgeHallLevel - 4));
                  const nextRequires = forgeHallLevel <= 3
                    ? FORGE_HALL_LEVEL_REQUIRES[forgeHallLevel - 1]
                    : { iron_fitting: 6 + (forgeHallLevel - 4) * 2, reinforced_crate: 3 + (forgeHallLevel - 4), fine_tools: 2 + (forgeHallLevel - 4) };
                  const nextMaxWorkers = (forgeHallLevel + 1) * 2;
                  return (
                    <>
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                          Upgrade to Level {forgeHallLevel + 1} — {nextMaxWorkers} smiths max
                          {forgeHallLevel + 1 === 2 ? " · unlocks T2 recipes" : forgeHallLevel + 1 === 3 ? " · unlocks T3 recipes" : forgeHallLevel + 1 === 4 ? " · unlocks Arcane Machine" : ""}
                        </div>
                        <CostLine
                          cash={cash}
                          cashCost={nextCost}
                          materials={nextRequires}
                          have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting"), reinforced_crate: have("reinforced_crate"), fine_tools: have("fine_tools") }}
                        />
                      </div>
                      <button onClick={onUpgradeForgeHall} className="btn w-full" style={{ marginTop: "0.5rem" }}>
                        Upgrade Forge Hall
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TOWN_FORGE_HALL_COST} />
                <button onClick={onBuildForgeHall} disabled={cash < TOWN_FORGE_HALL_COST} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_FORGE_HALL_COST ? 1 : 0.5 }}>
                  Build Forge Hall — ${fmt(TOWN_FORGE_HALL_COST)}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Tavern ─────────────────────────────────────────────────── */}
          <BuildingCard emoji="🍺" title="Tavern"
            badge={tavernBuilt ? `Level ${tavernLevel} · ${TAVERN_LEVEL_REGEN[tavernLevel - 1]} HP/s regen` : "Not built"}
            badgeColor={tavernBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th1} lockedMsg="Requires Town Hall level 1"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Idle heroes auto-rest here and regen HP each town pulse. Higher levels regen faster.
            </div>
            {tavernBuilt ? (
              <>
                <Row label="Regen rate" value={`${TAVERN_LEVEL_REGEN[tavernLevel - 1]} HP/s`} valueColor="#4ade80" />
                <Row label="HP per pulse" value={`+${(TAVERN_LEVEL_REGEN[tavernLevel - 1] * TOWN_PULSE_SECONDS).toFixed(0)}`} />
                {tavernLevel < 4 && (() => {
                  const nextCost = TAVERN_LEVEL_COSTS[tavernLevel];
                  const nextIron = TAVERN_LEVEL_IRON[tavernLevel];
                  const nextLumber = TAVERN_LEVEL_LUMBER[tavernLevel];
                  return (
                    <>
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                          Upgrade to Level {tavernLevel + 1} — {TAVERN_LEVEL_REGEN[tavernLevel]} HP/s
                        </div>
                        <CostLine
                          cash={cash} cashCost={nextCost}
                          materials={nextIron || nextLumber ? {
                            ...(nextIron ? { iron_ore: nextIron } : {}),
                            ...(nextLumber ? { lumber: nextLumber } : {}),
                          } : null}
                          have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0 }}
                        />
                      </div>
                      <button onClick={onUpgradeTavern} disabled={cash < nextCost} className="btn w-full"
                        style={{ marginTop: "0.5rem", opacity: cash >= nextCost ? 1 : 0.5 }}>
                        Upgrade Tavern
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TAVERN_LEVEL_COSTS[0]}
                  materials={{ iron_ore: TAVERN_LEVEL_IRON[0], lumber: TAVERN_LEVEL_LUMBER[0] }}
                  have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0 }}
                />
                <button onClick={onUpgradeTavern}
                  disabled={cash < TAVERN_LEVEL_COSTS[0] || (worldRes.iron_ore ?? 0) < TAVERN_LEVEL_IRON[0]}
                  className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TAVERN_LEVEL_COSTS[0] ? 1 : 0.5 }}>
                  Build Tavern — ${fmt(TAVERN_LEVEL_COSTS[0])}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Guild Hall ─────────────────────────────────────────────── */}
          <BuildingCard emoji="⚔️" title="Guild Hall"
            badge={guildHallBuilt ? `Level ${guildHallLevel}` : "Not built"}
            badgeColor={guildHallBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th2} lockedMsg="Requires Town Hall level 2"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Each level unlocks an additional hero slot. Without the Guild Hall only your starter hero is available.
            </div>
            {guildHallBuilt ? (
              <>
                <Row label="Max heroes" value={guildHallLevel + 1} />
                <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                    Upgrade to Level {guildHallLevel + 1} — {guildHallLevel + 2} heroes
                  </div>
                  <CostLine
                    cash={cash}
                    cashCost={getGuildHallUpgradeCost(guildHallLevel)}
                    materials={getGuildHallUpgradeRequires(guildHallLevel)}
                    have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting"), reinforced_crate: have("reinforced_crate") }}
                  />
                </div>
                <button onClick={onUpgradeGuildHall} className="btn w-full" style={{ marginTop: "0.5rem" }}>
                  Upgrade Guild Hall
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                  Level 1 unlocks a second hero slot
                </div>
                <CostLine cash={cash} cashCost={TOWN_GUILD_HALL_COST}
                  materials={getGuildHallUpgradeRequires(0)}
                  have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0 }}
                />
                <button onClick={onBuildGuildHall}
                  disabled={cash < TOWN_GUILD_HALL_COST}
                  className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_GUILD_HALL_COST ? 1 : 0.5 }}>
                  Build Guild Hall — ${fmt(TOWN_GUILD_HALL_COST)}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Barn Hall ───────────────────────────── */}
          <BuildingCard emoji="🐄" title="Barn Hall"
            badge={barnHallBuilt ? `Level ${barnHallLevel}` : "Not built"}
            badgeColor={barnHallBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th2} lockedMsg="Requires Town Hall level 2"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Gates how many barn workers you can hire per barn building. Each level adds 1 worker slot per building.
              Higher levels retain workers across prestige.
            </div>
            {barnHallBuilt ? (
              <>
                <Row label="Workers per barn" value={getMaxBarnWorkersPerBuilding(game)} />
                <Row label="Auto-retain on prestige" value={`${getBarnHallRetainCount(game)} per barn`} />
                {(() => {
                  const nextCost = barnHallLevel <= 2
                    ? BARN_HALL_LEVEL_COSTS[barnHallLevel - 1]
                    : Math.round(7_000 * Math.pow(2, barnHallLevel - 3));
                  const nextRequires = barnHallLevel <= 2
                    ? BARN_HALL_LEVEL_REQUIRES[barnHallLevel - 1]
                    : { iron_fitting: 3 + (barnHallLevel - 3) * 2, iron_ore: 25 + (barnHallLevel - 3) * 10, lumber: 20 + (barnHallLevel - 3) * 8 };
                  const nextWorkers = barnHallLevel + 1;
                  const nextRetain = Math.floor((barnHallLevel + 1) / 2);
                  return (
                    <>
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                          Upgrade to Level {barnHallLevel + 1} — {nextWorkers} workers per barn · {nextRetain} retain on prestige
                        </div>
                        <CostLine
                          cash={cash}
                          cashCost={nextCost}
                          materials={nextRequires}
                          have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting") }}
                        />
                      </div>
                      <button onClick={onUpgradeBarnHall} className="btn w-full" style={{ marginTop: "0.5rem" }}>
                        Upgrade Barn Hall
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TOWN_BARN_HALL_COST} />
                <button onClick={onBuildBarnHall} disabled={cash < TOWN_BARN_HALL_COST} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_BARN_HALL_COST ? 1 : 0.5 }}>
                  Build Barn Hall — ${fmt(TOWN_BARN_HALL_COST)}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── School ─────────────────────────────────────────────────── */}
          <BuildingCard emoji="📚" title="School"
            badge={schoolBuilt ? `${schoolWorkers} researchers` : "Not built"}
            badgeColor={schoolBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th2} lockedMsg="Requires Town Hall level 2"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Researchers unlock gated upgrades across all systems. Research costs mana crystals
              — the same ones you'd sell for cash, so it's a real trade-off.
            </div>
            {schoolBuilt ? (
              <>
                <Row label="Researchers" value={schoolWorkers} />
                <Row label="Grow speed bonus" value={`+${getSchoolGrowBonus(game).toFixed(1)}%`} valueColor="#4ade80" />
                <WorkerAssigner
                  workers={schoolWorkers} maxWorkers={8} freePeople={freePeople}
                  onAdd={() => onAssignTownBuildingWorker("school", 1)}
                  onRemove={() => onAssignTownBuildingWorker("school", -1)}
                />
                {/* Active research */}
                {activeResearch ? (
                  <div style={{ marginTop: "0.6rem", padding: "0.5rem", background: "var(--bg)", borderRadius: 8, fontSize: "0.75rem" }}>
                    <div style={{ fontWeight: 600 }}>🔬 {activeResearch.name}</div>
                    <div style={{ color: "var(--muted)", marginTop: "0.2rem" }}>
                      {Math.floor(schoolData?.researchProgress ?? 0)}s / {schoolData?.researchNeeded ?? "?"}s
                    </div>
                  </div>
                ) : availableResearch.length > 0 ? (
                  <div style={{ marginTop: "0.6rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.4rem" }}>Available research:</div>
                    {availableResearch.map((r) => (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.75rem" }}>{r.emoji} {r.name}</span>
                        <button onClick={() => onStartSchoolResearch(r.id)} className="btn"
                          style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem" }}>
                          Start
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#4ade80" }}>✓ All research complete</div>
                )}
                {/* Unlocked research */}
                {unlockedResearch.length > 0 && (
                  <div style={{ marginTop: "0.6rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.3rem" }}>Completed:</div>
                    {unlockedResearch.map((id) => {
                      const r = SCHOOL_RESEARCH[id];
                      return r ? (
                        <div key={id} style={{ fontSize: "0.68rem", color: "#4ade80", marginBottom: "0.15rem" }}>
                          ✓ {r.emoji} {r.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TOWN_SCHOOL_COST} />
                <button onClick={() => onBuildTownBuilding("school")} disabled={cash < TOWN_SCHOOL_COST} className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_SCHOOL_COST ? 1 : 0.5 }}>
                  Build School — ${fmt(TOWN_SCHOOL_COST)}
                </button>
              </>
            )}
          </BuildingCard>

          {/* ── Recreation Hall ─────────────────────────────────────────── */}
          <BuildingCard emoji="🎪" title="Recreation Hall"
            badge={recHallBuilt ? `Tier ${recHallTier} · ${recHallWorkers} workers · +${getRecHallSatBonus(game).toFixed(1)}% sat` : "Not built"}
            badgeColor={recHallBuilt ? "#4ade80" : "#f59e0b"}
            locked={!th3} lockedMsg="Requires Town Hall level 3"
          >
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.6rem", lineHeight: 1.6 }}>
              Each worker pushes satisfaction past the Food Hall ceiling by +0.5%.
              Costs ${REC_HALL_CASH_PER_WORKER}/worker/second to run.
            </div>
            {recHallBuilt ? (
              <>
                <Row label="Sat bonus" value={`+${getRecHallSatBonus(game).toFixed(1)}%`} valueColor="#4ade80" />
                <Row label="Effective ceiling" value={`${getSatisfactionCeiling(game).toFixed(1)}`} />
                <Row label="Cash drain" value={`$${(recHallWorkers * REC_HALL_CASH_PER_WORKER).toFixed(2)}/s`} valueColor="#f59e0b" />
                <WorkerAssigner
                  workers={recHallWorkers} maxWorkers={getRecHallMaxWorkers(game)} freePeople={freePeople}
                  onAdd={() => onAssignTownBuildingWorker("recreation_hall", 1)}
                  onRemove={() => onAssignTownBuildingWorker("recreation_hall", -1)}
                />
                {(() => {
                  const idx = recHallTier - 1;
                  const nextCost = idx < REC_HALL_UPGRADE_COSTS.length
                    ? REC_HALL_UPGRADE_COSTS[idx]
                    : Math.round(18_000 * Math.pow(2, idx - 1));
                  const nextReq = idx < REC_HALL_UPGRADE_REQUIRES.length
                    ? REC_HALL_UPGRADE_REQUIRES[idx]
                    : { iron_fitting: 8 + (idx - 1) * 4, reinforced_crate: 4 + (idx - 1) * 2 };
                  const canUpgrade = cash >= nextCost &&
                    Object.entries(nextReq).every(([k, v]) => have(k) >= v);
                  return (
                    <>
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                          Upgrade to Tier {recHallTier + 1} — {getRecHallMaxWorkers(game) + 10} workers max
                        </div>
                        <CostLine cash={cash} cashCost={nextCost} materials={nextReq}
                          have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting"), reinforced_crate: have("reinforced_crate") }}
                        />
                      </div>
                      <button onClick={onUpgradeRecHall} disabled={!canUpgrade} className="btn w-full"
                        style={{ marginTop: "0.5rem", opacity: canUpgrade ? 1 : 0.5 }}>
                        Upgrade Recreation Hall
                      </button>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <CostLine cash={cash} cashCost={TOWN_REC_HALL_COST}
                  materials={TOWN_REC_HALL_REQUIRES}
                  have={{ iron_ore: worldRes.iron_ore ?? 0, lumber: worldRes.lumber ?? 0, iron_fitting: have("iron_fitting"), reinforced_crate: have("reinforced_crate") }}
                />
                <button onClick={onBuildRecHall}
                  disabled={cash < TOWN_REC_HALL_COST}
                  className="btn w-full"
                  style={{ marginTop: "0.5rem", opacity: cash >= TOWN_REC_HALL_COST ? 1 : 0.5 }}>
                  Build Recreation Hall — ${fmt(TOWN_REC_HALL_COST)}
                </button>
              </>
            )}
          </BuildingCard>


          {/* ── Roads ──────────────────────────────────────────────────── */}
          {(() => {
            const roadLevel = getRoadLevel(game);
            const currentTier = ROAD_TIERS[roadLevel - 1] ?? null;
            const nextTier = getRoadNextTier(game);
            const affordable = canAffordRoad(game);
            const worldRes = game.worldResources ?? {};
            const disrupted = game.roads?.disrupted ?? false;

            const upkeepStr = currentTier
              ? Object.entries(currentTier.upkeepPerTick).map(([k,v]) => `${v} ${k}/s`).join(' + ')
              : null;

            return (
              <BuildingCard
                emoji="🛤️"
                title="Roads"
                badge={roadLevel === 0 ? "Not built" : `${currentTier?.name} · Level ${roadLevel}${disrupted ? " · ⚠️ Disrupted" : ""}`}
              >
                {roadLevel > 0 && (
                  <div style={{ marginBottom: "0.5rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                    <div>Upkeep: <span style={{ color: disrupted ? "#ef4444" : "var(--text)" }}>{upkeepStr}</span></div>
                    <div style={{ marginTop: "0.25rem" }}>Unlocks: <span style={{ color: "#a78bfa" }}>{currentTier?.unlocksTown} · {currentTier?.unlocksExpedition} expedition</span></div>
                  </div>
                )}
                {nextTier ? (
                  <>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.35rem" }}>
                      Next: <strong style={{ color: "var(--text)" }}>{nextTier.name}</strong> — unlocks {nextTier.unlocksTown} & {nextTier.unlocksExpedition} expedition
                    </div>
                    <CostLine
                      cash={game.cash ?? 0}
                      cashCost={nextTier.buildCost}
                      materials={nextTier.buildRequires}
                      have={Object.fromEntries(Object.keys(nextTier.buildRequires).map(k => [k, worldRes[k] ?? 0]))}
                    />
                    <button
                      onClick={onBuildOrUpgradeRoad}
                      disabled={!affordable}
                      className="btn w-full"
                      style={{ marginTop: "0.5rem", opacity: affordable ? 1 : 0.5 }}
                    >
                      {roadLevel === 0 ? "Build Roads" : `Upgrade to ${nextTier.name}`} — ${fmt(nextTier.buildCost)}
                    </button>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.35rem" }}>
                      Upkeep: {Object.entries(nextTier.upkeepPerTick).map(([k,v]) => `${v} ${k}/s`).join(' + ')}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "#4ade80" }}>All road tiers built. Max connectivity reached.</div>
                )}
              </BuildingCard>
            );
          })()}

          {/* ── How Town Works reference ────────────────────────────────── */}
          <details style={{ marginTop: "0.5rem" }}>
            <summary style={{ fontSize: "0.72rem", color: "var(--muted)", cursor: "pointer", padding: "0.4rem 0" }}>
              📘 How Town Works
            </summary>
            <div className="card p-3" style={{ marginTop: "0.4rem", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.8 }}>
              <div>• <strong style={{ color: "var(--text)" }}>Satisfaction</strong> multiplies all worker speed. Floor 25%. Ceiling set by Food Hall tier.</div>
              <div>• <strong style={{ color: "var(--text)" }}>Warehouse</strong> caps crop storage. Overflow is lost — workers increase the cap.</div>
              <div>• <strong style={{ color: "var(--text)" }}>Kitchen/Market Halls</strong> gate worker counts. Upgrade to hire more.</div>
              <div>• <strong style={{ color: "var(--text)" }}>Forge Hall</strong> gates smiths, recipe tiers (T2 at L2, T3 at L3), and Arcane Machine (L4).</div>
              <div>• <strong style={{ color: "var(--text)" }}>Barn Hall</strong> gates barn workers per building. Level N = N workers per barn.</div>
              <div>• <strong style={{ color: "var(--text)" }}>Guild Hall</strong> gates hero count — each level unlocks one more hero slot.</div>
              <div>• <strong style={{ color: "var(--text)" }}>Tavern</strong> auto-regens idle heroes. No manual feeding needed when they're resting.</div>
              <div>• <strong style={{ color: "var(--text)" }}>School</strong> unlocks upgrades using mana crystals instead of cash.</div>
              <div>• <strong style={{ color: "var(--text)" }}>Recreation Hall</strong> pushes satisfaction past the Food Hall ceiling. Costs $0.05/worker/second.</div>
              <div>• Idle people cost {PERSON_IDLE_FOOD_COST} food/pulse. Workers cost {PERSON_WORKING_FOOD_COST} food/pulse.</div>
              <div>• 1 bread feeds {BREAD_FOOD_UNITS} food units. Jam + sauce must match bread quantity each pulse — they earn the satisfaction ceiling, not extra food.</div>
            </div>
          </details>

        </div>
      )}
    </div>
  );
}