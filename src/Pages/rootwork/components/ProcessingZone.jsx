// src/Pages/rootwork/components/ProcessingZone.jsx

import React, { useState } from "react";
import {
  PROCESSING_RECIPES,
  KITCHEN_WORKER_UPGRADES,
  KITCHEN_WORKER_UPGRADE_ORDER,
  FEAST_TIERS,
} from "../gameConstants";
import {
  getKitchenWorkerHireCost,
  getEffectiveKitchenSeconds,
  isKitchenWorkerIdle,
  canUpgradeKitchenWorker,
  getNextFeastTier,
} from "../gameEngine";

const RECIPE_LIST = ["bread", "jam", "sauce"];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ elapsed, total, color = "var(--accent)" }) {
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  return (
    <div style={{
      height: "4px", borderRadius: "2px",
      background: "var(--border)", overflow: "hidden",
    }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: color, borderRadius: "2px",
        transition: "width 0.5s linear",
      }} />
    </div>
  );
}

// ─── Kitchen worker card ──────────────────────────────────────────────────────

function KitchenWorkerCard({ worker, game, onAssignRecipe, onUpgrade, onFire }) {
  const [showRecipes, setShowRecipes] = useState(false);
  const idle = isKitchenWorkerIdle(worker);
  const recipe = worker.recipeId ? PROCESSING_RECIPES[worker.recipeId] : null;
  const upgrades = worker.upgrades ?? [];
  const timeRemaining = worker.busy
    ? Math.max(0, worker.totalSeconds - worker.elapsedSeconds)
    : 0;

  // Figure out which upgrade is next
  const nextUpgradeId = KITCHEN_WORKER_UPGRADE_ORDER.find((id) =>
    canUpgradeKitchenWorker(game, worker.id, id)
  ) ?? null;
  const nextUpgrade = nextUpgradeId ? KITCHEN_WORKER_UPGRADES[nextUpgradeId] : null;

  return (
    <div className="card p-4" style={{ fontSize: "0.82rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "1.1rem" }}>👨‍🍳</span>
          <div>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              Kitchen Worker
              {upgrades.length > 0 && (
                <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                  {upgrades.map((u) => KITCHEN_WORKER_UPGRADES[u]?.emoji).join("")}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.68rem", color: idle ? "#ef4444" : "#4ade80" }}>
              {idle ? "⚠ Idle — assign a recipe" : worker.busy ? `Crafting ${recipe?.emoji} ${recipe?.name}` : `Ready — ${recipe?.emoji} ${recipe?.name} (waiting for crops)`}
            </div>
          </div>
        </div>
        <button
          onClick={() => onFire(worker.id)}
          style={{
            fontSize: "0.65rem", color: "var(--muted)",
            background: "none", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "0.2rem 0.5rem", cursor: "pointer",
          }}
        >
          Fire
        </button>
      </div>

      {/* Progress */}
      {worker.busy && recipe && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
            <span>{recipe.emoji} {recipe.name}</span>
            <span>{timeRemaining}s remaining</span>
          </div>
          <ProgressBar elapsed={worker.elapsedSeconds} total={worker.totalSeconds} />
        </div>
      )}

      {/* Not busy but has recipe — waiting for crops */}
      {!worker.busy && worker.recipeId && recipe && (
        <div style={{
          marginBottom: "0.75rem", fontSize: "0.72rem",
          color: "var(--muted)", background: "var(--bg)",
          borderRadius: "6px", padding: "0.4rem 0.6rem",
        }}>
          Waiting for {recipe.inputAmount}× {recipe.inputCrop} to restart
        </div>
      )}

      {/* Recipe selector */}
      <div style={{ marginBottom: "0.75rem" }}>
        <button
          onClick={() => setShowRecipes(!showRecipes)}
          style={{
            width: "100%", fontSize: "0.72rem",
            padding: "0.35rem 0.6rem", borderRadius: "6px",
            background: "var(--bg)", border: "1px solid var(--border)",
            color: "var(--muted)", cursor: "pointer", textAlign: "left",
          }}
        >
          {showRecipes ? "▲ Hide recipes" : `▼ ${worker.recipeId ? "Change recipe" : "Assign recipe"}`}
        </button>

        {showRecipes && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.4rem" }}>
            {RECIPE_LIST.map((recipeId) => {
              const r = PROCESSING_RECIPES[recipeId];
              const have = game.crops[r.inputCrop] ?? 0;
              const canStart = have >= r.inputAmount;
              const effectiveSeconds = getEffectiveKitchenSeconds(worker, r.seconds);
              return (
                <button
                  key={recipeId}
                  onClick={() => {
                    onAssignRecipe(worker.id, recipeId);
                    setShowRecipes(false);
                  }}
                  disabled={!canStart}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.6rem", borderRadius: "6px",
                    background: worker.recipeId === recipeId ? "rgba(99,102,241,0.1)" : "var(--bg)",
                    border: `1px solid ${worker.recipeId === recipeId ? "var(--accent)" : "var(--border)"}`,
                    cursor: canStart ? "pointer" : "default",
                    opacity: canStart ? 1 : 0.5,
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>{r.emoji}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                        {r.inputAmount}× {r.inputCrop} · {effectiveSeconds}s · have {have}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "right" }}>
                    → {r.emoji} {r.outputAmount}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrades */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
        {/* Current upgrades */}
        {upgrades.length > 0 && (
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            {upgrades.map((uid) => {
              const u = KITCHEN_WORKER_UPGRADES[uid];
              return (
                <div key={uid} style={{
                  fontSize: "0.65rem", padding: "0.15rem 0.4rem",
                  background: "rgba(74,222,128,0.1)", borderRadius: "4px",
                  color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)",
                }}>
                  {u.emoji} {u.name}
                </div>
              );
            })}
          </div>
        )}

        {/* Next upgrade available */}
        {nextUpgrade && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              {nextUpgrade.emoji} {nextUpgrade.name}
              <span style={{ fontSize: "0.65rem", display: "block", color: "var(--border)" }}>
                {nextUpgrade.description}
              </span>
            </div>
            <button
              onClick={() => onUpgrade(worker.id, nextUpgradeId)}
              disabled={(game.cash ?? 0) < nextUpgrade.cost}
              className="btn btn-secondary"
              style={{ fontSize: "0.7rem", padding: "0.25rem 0.6rem", marginLeft: "0.5rem", flexShrink: 0 }}
            >
              ${nextUpgrade.cost}
            </button>
          </div>
        )}

        {/* Fully upgraded */}
        {!nextUpgrade && upgrades.length === KITCHEN_WORKER_UPGRADE_ORDER.length && (
          <div style={{ fontSize: "0.68rem", color: "#4ade80", textAlign: "center" }}>
            ✓ Fully upgraded
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feast panel ──────────────────────────────────────────────────────────────

function FeastPanel({ game, onBuyFeast }) {
  const nextTier = getNextFeastTier(game);
  const currentBonus = game.feastBonusPercent ?? 0;

  if (!nextTier) {
    return (
      <div className="card p-4" style={{ fontSize: "0.82rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🍽️</div>
        <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Max Feast Bonus!</div>
        <div style={{ fontSize: "0.72rem", color: "#4ade80" }}>
          +{currentBonus}% grow speed on all farms
        </div>
      </div>
    );
  }

  const perGood = Math.ceil(nextTier.cost / 3);
  const hasBread = (game.artisan.bread ?? 0) >= perGood;
  const hasJam = (game.artisan.jam ?? 0) >= perGood;
  const hasSauce = (game.artisan.sauce ?? 0) >= perGood;
  const canFeast = hasBread && hasJam && hasSauce;

  return (
    <div className="card p-4" style={{ fontSize: "0.82rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <div>
          <div style={{ fontWeight: 600 }}>🍽️ Feast</div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
            {currentBonus > 0 ? `Current: +${currentBonus}% grow speed` : "Unlock a permanent grow speed bonus"}
          </div>
        </div>
        {currentBonus > 0 && (
          <div style={{
            fontSize: "0.72rem", color: "#4ade80", fontWeight: 700,
            background: "rgba(74,222,128,0.1)", borderRadius: "6px",
            padding: "0.2rem 0.5rem",
          }}>
            +{currentBonus}%
          </div>
        )}
      </div>

      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
        Next tier: <strong style={{ color: "var(--text)" }}>+{nextTier.bonusPercent}%</strong> grow speed
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
        {[
          { emoji: "🍞", label: "Bread", have: game.artisan.bread ?? 0, ok: hasBread },
          { emoji: "🍯", label: "Jam", have: game.artisan.jam ?? 0, ok: hasJam },
          { emoji: "🥫", label: "Sauce", have: game.artisan.sauce ?? 0, ok: hasSauce },
        ].map(({ emoji, label, have, ok }) => (
          <div key={label} style={{
            flex: 1, textAlign: "center", padding: "0.4rem",
            background: "var(--bg)", borderRadius: "6px",
            border: `1px solid ${ok ? "rgba(74,222,128,0.4)" : "var(--border)"}`,
          }}>
            <div style={{ fontSize: "1rem" }}>{emoji}</div>
            <div style={{ fontSize: "0.65rem", color: ok ? "#4ade80" : "var(--muted)" }}>
              {have}/{perGood}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onBuyFeast}
        disabled={!canFeast}
        className="btn w-full"
        style={{ opacity: canFeast ? 1 : 0.5 }}
      >
        Hold a Feast → +{nextTier.bonusPercent}% grow speed
      </button>
    </div>
  );
}

// ─── Artisan inventory ────────────────────────────────────────────────────────

function ArtisanInventory({ artisan }) {
  const items = [
    { key: "bread", emoji: "🍞", label: "Bread" },
    { key: "jam",   emoji: "🍯", label: "Jam" },
    { key: "sauce", emoji: "🥫", label: "Sauce" },
  ];
  return (
    <div className="card p-3" style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
        Artisan Goods
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {items.map(({ key, emoji, label }) => (
          <div key={key} style={{
            flex: 1, textAlign: "center", padding: "0.5rem",
            background: "var(--bg)", borderRadius: "8px",
          }}>
            <div style={{ fontSize: "1.2rem" }}>{emoji}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)" }}>
              {artisan[key] ?? 0}
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main zone ────────────────────────────────────────────────────────────────

export default function ProcessingZone({
  game,
  onHireKitchenWorker,
  onAssignKitchenWorkerRecipe,
  onUpgradeKitchenWorker,
  onFireKitchenWorker,
  onUpgradePlot,
  onBuyFeast,
}) {
  const hireCost = getKitchenWorkerHireCost(game);
  const canHire = (game.cash ?? 0) >= hireCost;
  const workers = game.kitchenWorkers ?? [];
  const isFirstWorker = (game.kitchenWorkers ?? []).length === 0;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏭 Kitchen</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Hire kitchen workers to craft artisan goods from your crops.
        </p>
      </div>

      {/* Artisan inventory */}
      <ArtisanInventory artisan={game.artisan} />

      {/* Hire worker */}
      <div style={{ marginBottom: "1.25rem" }}>
        <button
  onClick={onHireKitchenWorker}
  disabled={!isFirstWorker && !canHire}
  className="btn w-full"
  style={{ opacity: (isFirstWorker || canHire) ? 1 : 0.5 }}
>
  👨‍🍳 Hire Kitchen Worker — {isFirstWorker ? "Free!" : `$${hireCost}`}
</button>
        {workers.length === 0 && (
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", textAlign: "center" }}>
            Each worker crafts one recipe at a time. Upgrade them for speed and auto-restart.
          </p>
        )}
      </div>

      {/* Worker cards */}
      {workers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          {workers.map((worker) => (
            <KitchenWorkerCard
              key={worker.id}
              worker={worker}
              game={game}
              onAssignRecipe={onAssignKitchenWorkerRecipe}
              onUpgrade={onUpgradeKitchenWorker}
              onFire={onFireKitchenWorker}
            />
          ))}
        </div>
      )}

      {/* Feast */}
      <FeastPanel game={game} onBuyFeast={onBuyFeast} />

    </div>
  );
}