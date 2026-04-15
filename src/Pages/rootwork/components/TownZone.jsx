// src/Pages/rootwork/components/TownZone.jsx
 
import React from "react";
import {
  TOWN_HOME_CAPACITY,
  TOWN_PULSE_SECONDS,
} from "../gameConstants";
import {
  getTownHomeCost,
  getTownBakeryCost,
  getTotalWorkersHired,
  getAvailableWorkerSlots,
} from "../gameEngine";
 
function clampPct(value) {
  return Math.max(0, Math.min(100, value));
}
 
export default function TownZone({ game, onBuildHome, onBuyBakery }) {
  const town = game.town ?? {};
  const homes = town.homes ?? 0;
  const bakeryLevel = town.bakeryLevel ?? 0;
  const people = Math.floor(town.people ?? 0);
  const capacity = town.capacity ?? homes * TOWN_HOME_CAPACITY;
  const satisfaction = town.satisfaction ?? 1;
  const growthBonusPercent = town.growthBonusPercent ?? 0;
  const breadNeeded = town.breadNeeded ?? 0;
  const rawFoodNeeded = town.rawFoodNeeded ?? breadNeeded;
  const pulseSeconds = Math.ceil(Math.max(0, town.pulseSeconds ?? TOWN_PULSE_SECONDS));
  const starving = town.starving === true;
  const foodType = town.foodType ?? (bakeryLevel === 0 ? "wheat" : "bread");
 
  const cash = game.cash ?? 0;
  const totalWorkers = getTotalWorkersHired(game);
  const availableSlots = getAvailableWorkerSlots(game);
  const workerSlotsPct = clampPct(people > 0 ? (totalWorkers / people) * 100 : 0);
 
  const nextHomeCost = getTownHomeCost(game);
  const nextBakeryCost = getTownBakeryCost(game);
 
  const canBuildHome = cash >= nextHomeCost;
  const canBuyBakery = cash >= nextBakeryCost;
 
  const foodEmoji = foodType === "wheat" ? "🌾" : "🍞";
  const foodLabel = foodType === "wheat" ? "Wheat" : "Bread";
  const foodHave = foodType === "wheat"
    ? Math.floor(game.crops?.wheat ?? 0)
    : Math.floor(game.artisan?.bread ?? 0);
 
  const populationPct = clampPct(capacity > 0 ? (people / capacity) * 100 : 0);
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏘️ Town</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Your population determines how many workers you can hire across all systems.
        </p>
      </div>
 
      {/* Population & worker slots — the key card */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
 
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>👥</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{people}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>of {capacity} capacity</div>
          </div>
 
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>👷</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: availableSlots === 0 ? "#f59e0b" : "var(--text)" }}>
              {totalWorkers}/{people}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
              {availableSlots === 0 ? "slots full" : `${availableSlots} open`}
            </div>
          </div>
 
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>🌱</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>+{growthBonusPercent}%</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>Grow Bonus</div>
          </div>
        </div>
 
        {/* Worker slots bar */}
        <div style={{ marginBottom: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            <span>Worker slots used</span>
            <span style={{ color: availableSlots === 0 ? "#f59e0b" : "var(--text)", fontWeight: 600 }}>
              {totalWorkers} / {people}
            </span>
          </div>
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              width: `${workerSlotsPct}%`,
              height: "100%",
              background: availableSlots === 0 ? "#f59e0b" : "var(--accent)",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
 
        {/* Population bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            <span>Housing capacity</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{people} / {capacity}</span>
          </div>
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              width: `${populationPct}%`,
              height: "100%",
              background: "#4ade80",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      </div>
 
      {/* Food pulse status */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          {foodEmoji} Food Pulse
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.9 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Next pulse in</span>
            <strong style={{ color: "var(--text)" }}>{pulseSeconds}s</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Food type</span>
            <strong style={{ color: "var(--text)" }}>
              {foodEmoji} {foodLabel}
              {bakeryLevel === 0 && (
                <span style={{ marginLeft: "0.4rem", fontSize: "0.62rem", color: "var(--muted)", fontWeight: 400 }}>
                  (buy bakery to switch to bread)
                </span>
              )}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Needed next pulse</span>
            <strong style={{ color: "var(--text)" }}>
              {breadNeeded} {foodEmoji}
              {bakeryLevel > 0 && rawFoodNeeded !== breadNeeded && (
                <span style={{ marginLeft: "0.35rem", color: "#4ade80", fontWeight: 600, fontSize: "0.68rem" }}>
                  (down from {rawFoodNeeded})
                </span>
              )}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>You have</span>
            <strong style={{ color: foodHave >= breadNeeded ? "#4ade80" : "#ef4444" }}>
              {foodHave} {foodEmoji}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Status</span>
            <strong style={{ color: starving ? "#ef4444" : "#4ade80" }}>
              {starving ? "😟 Hungry" : "😊 Fed"}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Last satisfaction</span>
            <strong style={{ color: satisfaction >= 1 ? "#4ade80" : "#f59e0b" }}>
              {(satisfaction * 100).toFixed(0)}%
            </strong>
          </div>
        </div>
      </div>
 
      {/* Build Homes */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>🏠 Build Homes</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          Each home holds {TOWN_HOME_CAPACITY} people. More people means more worker slots.
          Currently {homes} home{homes !== 1 ? "s" : ""} · {capacity} total capacity.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Next home:{" "}
            <strong style={{ color: "var(--text)" }}>${nextHomeCost.toLocaleString()}</strong>
          </div>
          <button
            onClick={onBuildHome}
            disabled={!canBuildHome}
            className="btn"
            style={{ opacity: canBuildHome ? 1 : 0.5 }}
          >
            Build Home
          </button>
        </div>
      </div>
 
      {/* Bakery */}
      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>🥖 Bakery</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          {bakeryLevel === 0
            ? "Buy your first bakery to switch town food from wheat to bread and reduce demand by 1 per pulse."
            : `Level ${bakeryLevel} — reduces bread demand by ${bakeryLevel} per pulse, minimum 1.`
          }
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Bakery level: <strong style={{ color: "var(--text)" }}>{bakeryLevel}</strong>
            {" · "}Next: <strong style={{ color: "var(--text)" }}>${nextBakeryCost.toLocaleString()}</strong>
          </div>
          <button
            onClick={onBuyBakery}
            disabled={!canBuyBakery}
            className="btn"
            style={{ opacity: canBuyBakery ? 1 : 0.5 }}
          >
            {bakeryLevel === 0 ? "Buy Bakery" : "Upgrade Bakery"}
          </button>
        </div>
      </div>
 
      {/* How it works */}
      <div className="card p-4">
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>📘 How Town Works</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.8 }}>
          <div>• <strong style={{ color: "var(--text)" }}>Population = worker slots.</strong> Total workers hired across farms, kitchen, and market cannot exceed your population.</div>
          <div>• Every {TOWN_PULSE_SECONDS}s, the town checks for food.</div>
          <div>• No bakery: eats raw wheat (1 per 2 people). Bakery: eats bread instead.</div>
          <div>• If fed, population grows by 1 up to housing capacity.</div>
          <div>• If not fed, population drops by 1 — freeing a worker slot.</div>
          <div>• Every 5 people gives +1% farm grow speed, up to +25%.</div>
          <div>• Build more homes to increase capacity and allow more growth.</div>
        </div>
      </div>
    </div>
  );
}