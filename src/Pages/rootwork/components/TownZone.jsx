import React from "react";
import {
  TOWN_UNLOCK_LIFETIME_CASH,
  TOWN_HOME_CAPACITY,
  TOWN_PULSE_SECONDS,
} from "../gameConstants";
import { getTownHomeCost, getTownBakeryCost } from "../gameEngine";

function clampPct(value) {
  return Math.max(0, Math.min(100, value));
}

export default function TownZone({ game, onBuildHome, onBuyBakery }) {
  const town = game.town ?? {};
  const unlocked = town.unlocked === true;
  const homes = town.homes ?? 0;
  const bakeryLevel = town.bakeryLevel ?? 0;
  const people = Math.floor(town.people ?? 0);
  const capacity = town.capacity ?? homes * TOWN_HOME_CAPACITY;
  const satisfaction = town.satisfaction ?? 1;
  const growthBonusPercent = town.growthBonusPercent ?? 0;
  const rawBreadNeeded = town.rawBreadNeeded ?? 0;
  const breadNeeded = town.breadNeeded ?? 0;
  const pulseSeconds = Math.ceil(Math.max(0, town.pulseSeconds ?? TOWN_PULSE_SECONDS));
  const starving = town.starving === true;

  const lifetimeCash = game.lifetimeCash ?? 0;
  const cash = game.cash ?? 0;

  const nextHomeCost = getTownHomeCost(game);
  const nextBakeryCost = getTownBakeryCost(game);

  const canBuildHome = unlocked && cash >= nextHomeCost;
  const canBuyBakery = unlocked && cash >= nextBakeryCost;

  if (!unlocked) {
    const progress = clampPct((lifetimeCash / TOWN_UNLOCK_LIFETIME_CASH) * 100);

    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏘️ Town</h2>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
            Grow your farm into a living town. Unlocks at ${TOWN_UNLOCK_LIFETIME_CASH.toLocaleString()} lifetime cash earned.
          </p>
        </div>

        <div className="card p-4">
          <div style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Town Locked</div>
            <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Earn more lifetime cash to unlock homes, population, bakery upgrades, bread upkeep, and town-wide farm bonuses.
            </div>
          </div>

          <div style={{ marginBottom: "0.6rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--muted)" }}>Progress</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              ${Math.floor(lifetimeCash).toLocaleString()} / ${TOWN_UNLOCK_LIFETIME_CASH.toLocaleString()}
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "8px",
              background: "var(--border)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: "999px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏘️ Town</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Build homes, feed your town every 30 seconds, and invest in Bakery upgrades to reduce bread demand.
        </p>
      </div>

      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>🏠</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{homes}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>Homes</div>
          </div>

          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>👥</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
              {people}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
              People / {capacity}
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: "8px", padding: "0.65rem" }}>
            <div style={{ fontSize: "1rem" }}>🌱</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>
              +{growthBonusPercent}%
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>Grow Bonus</div>
          </div>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.7 }}>
          <div>
            Next pulse in:{" "}
            <strong style={{ color: "var(--text)" }}>{pulseSeconds}s</strong>
          </div>
          <div>
            Bread next pulse:{" "}
            <strong style={{ color: "var(--text)" }}>
              {breadNeeded}
            </strong>
            {bakeryLevel > 0 && (
              <span style={{ marginLeft: "0.35rem", color: "#4ade80", fontWeight: 600 }}>
                (down from {rawBreadNeeded})
              </span>
            )}
          </div>
          <div>
            Status:{" "}
            <strong style={{ color: starving ? "#ef4444" : "#4ade80" }}>
              {starving ? "Hungry" : "Fed"}
            </strong>
          </div>
          <div>
            Last pulse satisfaction:{" "}
            <strong style={{ color: satisfaction >= 1 ? "#4ade80" : "#f59e0b" }}>
              {(satisfaction * 100).toFixed(0)}%
            </strong>
          </div>
        </div>
      </div>

      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>🏠 Build Homes</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          Each home holds up to {TOWN_HOME_CAPACITY} people. More homes means more room for growth.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Next home cost:{" "}
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

      <div className="card p-4" style={{ marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>🥖 Bakery</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          Bakery reduces town bread demand by 1 per pulse per level, to a minimum of 1.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Bakery level:{" "}
            <strong style={{ color: "var(--text)" }}>{bakeryLevel}</strong>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Next bakery cost:{" "}
            <strong style={{ color: "var(--text)" }}>${nextBakeryCost.toLocaleString()}</strong>
          </div>
        </div>

        <button
          onClick={onBuyBakery}
          disabled={!canBuyBakery}
          className="btn w-full"
          style={{ opacity: canBuyBakery ? 1 : 0.5 }}
        >
          Buy Bakery Upgrade
        </button>
      </div>

      <div className="card p-4">
        <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>📘 How Town Works</div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.7 }}>
          <div>• Every 30 seconds, the town checks if it has enough bread.</div>
          <div>• Raw bread demand is 1 bread per 2 people.</div>
          <div>• Bakery reduces bread demand by 1 per level, minimum 1 bread.</div>
          <div>• If fed, population grows by 1 up to housing capacity.</div>
          <div>• If not fed, population drops by 1.</div>
          <div>• Every 5 people gives +1% farm grow speed, up to a max of 25%.</div>
        </div>
      </div>
    </div>
  );
}