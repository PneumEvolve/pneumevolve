// src/Pages/rootwork/components/TownZone.jsx
 
import React from "react";
import {
  TOWN_HOME_CAPACITY,
  TOWN_PULSE_SECONDS,
  TOWN_WHEAT_PER_PERSON,
  TOWN_WHEAT_PER_WORKER,
  TOWN_BREAD_FEEDS,
  TOWN_JAM_BUILDING_COST,
  TOWN_SAUCE_BUILDING_COST,
  TOWN_SAT_WHEAT,
  TOWN_SAT_BAKERY,
  TOWN_SAT_BAKERY_JAM,
  TOWN_SAT_ALL_BUILDINGS,
} from "../gameConstants";
import {
  getTownHomeCost,
  getTownBakeryCost,
  getTotalWorkersHired,
  getAvailableWorkerSlots,
  getSatisfactionTarget,
} from "../gameEngine";
 
function clampPct(value) {
  return Math.max(0, Math.min(100, value));
}
 
function SatisfactionBar({ satisfaction }) {
  const pct = clampPct((satisfaction / 150) * 100);
  const color = satisfaction >= 110 ? "#4ade80"
    : satisfaction >= 100 ? "#a3e635"
    : satisfaction >= 75 ? "#f59e0b"
    : "#ef4444";
  return (
    <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`,
        height: "100%",
        background: color,
        borderRadius: "999px",
        transition: "width 0.4s ease, background 0.4s ease",
      }} />
    </div>
  );
}
 
export default function TownZone({ game, onBuildHome, onBuyBakery, onToggleBakery, onBuyJamBuilding, onBuySauceBuilding }) {
  const town = game.town ?? {};
  const homes = town.homes ?? 0;
  const bakeryLevel = town.bakeryLevel ?? 0;
  const bakeryOn = town.bakeryOn === true && bakeryLevel >= 1;
  const jamOwned = town.jamBuildingOwned === true;
  const sauceOwned = town.sauceBuildingOwned === true;
  const people = Math.floor(town.people ?? 0);
  const capacity = town.capacity ?? homes * TOWN_HOME_CAPACITY;
  const satisfaction = town.satisfaction ?? 100;
  const satisfactionTarget = getSatisfactionTarget(game);
  const growthBonusPercent = town.growthBonusPercent ?? 0;
  const pulseSeconds = Math.ceil(Math.max(0, town.pulseSeconds ?? TOWN_PULSE_SECONDS));
  const starving = town.starving === true;
  const foodType = bakeryOn ? "bread" : "wheat";
 
  const cash = game.cash ?? 0;
  const totalWorkers = getTotalWorkersHired(game);
  const availableSlots = getAvailableWorkerSlots(game);
  const workerSlotsPct = clampPct(people > 0 ? (totalWorkers / people) * 100 : 0);
 
  const nextHomeCost = getTownHomeCost(game);
  const nextBakeryCost = getTownBakeryCost(game);
  const canBuildHome = cash >= nextHomeCost;
  const canBuyBakery = cash >= nextBakeryCost;
  const canBuyJam = bakeryLevel >= 1 && !jamOwned && cash >= TOWN_JAM_BUILDING_COST;
  const canBuySauce = jamOwned && !sauceOwned && cash >= TOWN_SAUCE_BUILDING_COST;
 
  const foodEmoji = foodType === "wheat" ? "🌾" : "🍞";
  const foodHave = foodType === "wheat"
    ? Math.floor(game.crops?.wheat ?? 0)
    : Math.floor(game.artisan?.bread ?? 0);
  const nextPulseCost = foodType === "wheat"
    ? (people * TOWN_WHEAT_PER_PERSON) + (totalWorkers * TOWN_WHEAT_PER_WORKER)
    : Math.max(1, Math.ceil((people + totalWorkers) / TOWN_BREAD_FEEDS));
  const foodFormula = foodType === "wheat"
    ? `(${people}×${TOWN_WHEAT_PER_PERSON} + ${totalWorkers}×${TOWN_WHEAT_PER_WORKER})`
    : `⌈(${people}+${totalWorkers}) ÷ ${TOWN_BREAD_FEEDS}⌉`;
 
  const populationPct = clampPct(capacity > 0 ? (people / capacity) * 100 : 0);
 
  const satColor = satisfaction >= 110 ? "#4ade80"
    : satisfaction >= 100 ? "#a3e635"
    : satisfaction >= 75 ? "#f59e0b"
    : "#ef4444";
  const satEmoji = satisfaction >= 110 ? "😄" : satisfaction >= 100 ? "😊" : satisfaction >= 75 ? "😐" : "😟";
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏘️ Town</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Feed your town to grow population. Satisfaction affects all worker speed.
        </p>
      </div>
 
      {/* Stats row */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>👥</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{people}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>of {capacity}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>👷</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: availableSlots === 0 ? "#f59e0b" : "var(--text)" }}>
              {totalWorkers}/{people}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
              {availableSlots === 0 ? "full" : `${availableSlots} open`}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>{satEmoji}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: satColor }}>{satisfaction}%</div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
              {satisfaction === satisfactionTarget ? "stable" : satisfaction < satisfactionTarget ? `↑${satisfactionTarget}%` : `↓${satisfactionTarget}%`}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>🌱</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>+{growthBonusPercent}%</div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>Grow</div>
          </div>
        </div>
 
        {/* Satisfaction bar */}
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.2rem" }}>
            <span>Satisfaction — multiplies all worker speed</span>
            <span style={{ color: satColor, fontWeight: 600 }}>{satisfaction}%</span>
          </div>
          <SatisfactionBar satisfaction={satisfaction} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "var(--muted)", marginTop: "0.15rem" }}>
            <span>25% floor</span>
            <span>100% neutral</span>
            <span>150% max</span>
          </div>
        </div>
 
        {/* Worker / population bars */}
        <div style={{ marginBottom: "0.35rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.15rem" }}>
            <span>Workers</span>
            <span style={{ color: availableSlots === 0 ? "#f59e0b" : "var(--text)", fontWeight: 600 }}>{totalWorkers}/{people}</span>
          </div>
          <div style={{ height: "5px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${workerSlotsPct}%`, height: "100%", background: availableSlots === 0 ? "#f59e0b" : "var(--accent)", borderRadius: "999px", transition: "width 0.3s ease" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.15rem" }}>
            <span>Housing</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{people}/{capacity}</span>
          </div>
          <div style={{ height: "5px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${populationPct}%`, height: "100%", background: "#4ade80", borderRadius: "999px", transition: "width 0.3s ease" }} />
          </div>
        </div>
      </div>
 
      {/* Food pulse */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          {foodEmoji} Food Pulse
          {bakeryOn && <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "#4ade80", fontWeight: 400 }}>Bakery active</span>}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.9 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Next pulse in</span>
            <strong style={{ color: "var(--text)" }}>{pulseSeconds}s</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{foodEmoji} needed</span>
            <strong style={{ color: "var(--text)" }}>
              {nextPulseCost} {foodEmoji}
              <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: "0.3rem", fontSize: "0.62rem" }}>
                {foodFormula}
              </span>
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{foodEmoji} in stock</span>
            <strong style={{ color: foodHave >= nextPulseCost ? "#4ade80" : "#ef4444" }}>
              {foodHave} {foodEmoji}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Status</span>
            <strong style={{ color: starving ? "#ef4444" : "#4ade80" }}>
              {starving ? "😟 Hungry" : "😊 Fed"}
            </strong>
          </div>
        </div>
      </div>
 
      {/* Build Homes */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>🏠 Build Homes</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          Each home holds {TOWN_HOME_CAPACITY} people. One resident moves in immediately on purchase.
          {homes} home{homes !== 1 ? "s" : ""} · {capacity} capacity.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Next: <strong style={{ color: "var(--text)" }}>
              {nextHomeCost === 0 ? "Free" : `$${nextHomeCost.toLocaleString()}`}
            </strong>
          </div>
          <button onClick={onBuildHome} disabled={!canBuildHome} className="btn" style={{ opacity: canBuildHome ? 1 : 0.5 }}>
            Build Home
          </button>
        </div>
      </div>
 
      {/* Bakery */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🥖 Bakery</div>
          {bakeryLevel >= 1 && (
            <button
              onClick={onToggleBakery}
              style={{
                fontSize: "0.7rem", fontWeight: 700,
                padding: "0.2rem 0.65rem", borderRadius: "999px",
                cursor: "pointer",
                background: bakeryOn ? "rgba(74,222,128,0.15)" : "var(--bg)",
                border: `1px solid ${bakeryOn ? "#4ade80" : "var(--border)"}`,
                color: bakeryOn ? "#4ade80" : "var(--muted)",
              }}
            >
              {bakeryOn ? "🟢 Bread mode" : "⚪ Wheat mode"}
            </button>
          )}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          {bakeryLevel === 0
            ? `No bakery. Town eats wheat per pulse. Buy a bakery to unlock bread mode — 1 bread feeds ${TOWN_BREAD_FEEDS} combined people+workers. Satisfaction rises to ${TOWN_SAT_BAKERY}%.`
            : bakeryOn
              ? `Bread mode active. 1 bread feeds ${TOWN_BREAD_FEEDS} combined. Satisfaction target: ${satisfactionTarget}%.`
              : `Bakery owned. Toggle to bread mode for higher satisfaction (${TOWN_SAT_BAKERY}%+).`
          }
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Level: <strong style={{ color: "var(--text)" }}>{bakeryLevel}</strong>
            {" · "}Next: <strong style={{ color: "var(--text)" }}>${nextBakeryCost.toLocaleString()}</strong>
          </div>
          <button onClick={onBuyBakery} disabled={!canBuyBakery} className="btn" style={{ opacity: canBuyBakery ? 1 : 0.5 }}>
            {bakeryLevel === 0 ? "Buy Bakery" : "Upgrade"}
          </button>
        </div>
      </div>
 
      {/* Jam Building — Pantry */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: bakeryLevel >= 1 ? 1 : 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🍯 Pantry</div>
          {jamOwned && <span style={{ fontSize: "0.65rem", color: "#4ade80", fontWeight: 700 }}>✓ Built</span>}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          {bakeryLevel < 1
            ? "Requires Bakery first."
            : jamOwned
              ? `Pantry active. Satisfaction target with bread: ${TOWN_SAT_BAKERY_JAM}%.`
              : `Stock the pantry with jam. Raises satisfaction target to ${TOWN_SAT_BAKERY_JAM}% when on bread mode.`
          }
        </div>
        {!jamOwned && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Cost: <strong style={{ color: "var(--text)" }}>${TOWN_JAM_BUILDING_COST.toLocaleString()}</strong>
            </div>
            <button onClick={onBuyJamBuilding} disabled={!canBuyJam} className="btn" style={{ opacity: canBuyJam ? 1 : 0.5 }}>
              Build Pantry
            </button>
          </div>
        )}
      </div>
 
      {/* Sauce Building — Cannery */}
      <div className="card p-4" style={{ marginBottom: "1rem", opacity: jamOwned ? 1 : 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <div style={{ fontWeight: 600 }}>🥫 Cannery</div>
          {sauceOwned && <span style={{ fontSize: "0.65rem", color: "#4ade80", fontWeight: 700 }}>✓ Built</span>}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          {!jamOwned
            ? "Requires Pantry first."
            : sauceOwned
              ? `Cannery active. All buildings online — satisfaction target: ${TOWN_SAT_ALL_BUILDINGS}%.`
              : `Preserve sauce for the town. With all buildings active, satisfaction target reaches ${TOWN_SAT_ALL_BUILDINGS}%.`
          }
        </div>
        {!sauceOwned && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Cost: <strong style={{ color: "var(--text)" }}>${TOWN_SAUCE_BUILDING_COST.toLocaleString()}</strong>
            </div>
            <button onClick={onBuySauceBuilding} disabled={!canBuySauce} className="btn" style={{ opacity: canBuySauce ? 1 : 0.5 }}>
              Build Cannery
            </button>
          </div>
        )}
      </div>
 
      {/* How it works */}
      <div className="card p-4">
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>📘 How Town Works</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.8 }}>
          <div>• <strong style={{ color: "var(--text)" }}>Population = worker slots.</strong> All workers across farms, kitchen, and market count against population.</div>
          <div>• First home is free. One resident moves in on each purchase.</div>
          <div>• Every {TOWN_PULSE_SECONDS}s: wheat mode needs <strong style={{ color: "var(--text)" }}>(people×{TOWN_WHEAT_PER_PERSON})+(workers×{TOWN_WHEAT_PER_WORKER})</strong> wheat. Bread mode needs <strong style={{ color: "var(--text)" }}>1 loaf per {TOWN_BREAD_FEEDS} combined</strong>.</div>
          <div>• Fed → population grows. Starving → population drops, last hired worker auto-fired.</div>
          <div>• <strong style={{ color: "var(--text)" }}>Satisfaction</strong> multiplies all worker speed. Floor 25% (starving), ceiling 150% (all buildings on bread).</div>
          <div>• Targets: Wheat {TOWN_SAT_WHEAT}% · Bakery {TOWN_SAT_BAKERY}% · +Pantry {TOWN_SAT_BAKERY_JAM}% · +Cannery {TOWN_SAT_ALL_BUILDINGS}%</div>
          <div>• Every 5 people: +1% farm grow speed (max +25%).</div>
        </div>
      </div>
    </div>
  );
}