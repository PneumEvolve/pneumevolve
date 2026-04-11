// src/Pages/rootwork/components/ProcessingZone.jsx
 
import React from "react";
import {
  PROCESSING_RECIPES,
  CROPS,
  CROP_ARTISAN,
  PLOT_UPGRADE_COST,
  FEAST_TIERS,
  FEAST_MAX_BONUS,
} from "../gameConstants";
import { getNextFeastTier } from "../gameEngine";
 
// ─── Active queue item ────────────────────────────────────────────────────────
 
function QueueItem({ item }) {
  const recipe = PROCESSING_RECIPES[item.recipeId];
  if (!recipe) return null;
  const percent = Math.min(100, Math.floor((item.elapsedSeconds / item.totalSeconds) * 100));
  const remaining = item.totalSeconds - item.elapsedSeconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
 
  return (
    <div className="card p-4 space-y-2">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
        <span style={{ fontWeight: 600 }}>{recipe.emoji} {recipe.name}</span>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
          {mins > 0 ? `${mins}m ` : ""}{secs}s left
        </span>
      </div>
      <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${percent}%`, background: "var(--accent)",
          borderRadius: "999px", transition: "width 1s linear",
        }} />
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
        {percent}% complete · yields {item.outputAmount} {recipe.emoji}
      </div>
    </div>
  );
}
 
// ─── Recipe card ──────────────────────────────────────────────────────────────
 
function RecipeCard({ recipe, game, onStartProcessing, queueFull }) {
  const crop = recipe.inputCrop ? CROPS[recipe.inputCrop] : null;
  const have = crop ? (game.crops[recipe.inputCrop] ?? 0) : 0;
  const canAfford = crop ? have >= recipe.inputAmount : false;
  const disabled = queueFull || !canAfford;
 
  return (
    <div className="card p-4 space-y-2" style={{ fontSize: "0.85rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600 }}>{recipe.emoji} {recipe.name}</span>
        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
          {Math.floor(recipe.seconds / 60)}m · yields {recipe.outputAmount}
        </span>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{recipe.description}</div>
      {crop && (
        <div style={{ fontSize: "0.75rem" }}>
          <span style={{ color: canAfford ? "var(--text)" : "#ef4444", fontWeight: canAfford ? 400 : 600 }}>
            {crop.emoji} {have}/{recipe.inputAmount} {crop.name}
          </span>
        </div>
      )}
      <button
        onClick={() => onStartProcessing(recipe.id)}
        disabled={disabled}
        className="btn w-full"
        style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem" }}
      >
        {queueFull ? "Queue full" : !canAfford ? `Need ${recipe.inputAmount} ${crop?.name}` : `Start ${recipe.name}`}
      </button>
    </div>
  );
}
 
// ─── Plot upgrade section ──────────────────────────────────────────────────────
 
function PlotUpgradeSection({ game, onUpgradePlot }) {
  return (
    <div className="space-y-3">
      <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>⭐ Plot Upgrades</h3>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
        Spend artisan goods to permanently upgrade individual plots — 50% faster grow time per upgraded plot.
      </p>
      {game.farms.map((farm) => {
        const crop = CROPS[farm.crop];
        const artisanGood = CROP_ARTISAN[farm.crop];
        if (!artisanGood) return null;
        const artisanEmoji = PROCESSING_RECIPES[artisanGood]?.emoji ?? "📦";
        const artisanName = PROCESSING_RECIPES[artisanGood]?.name ?? artisanGood;
        const have = game.artisan[artisanGood] ?? 0;
        const upgradedCount = farm.plots.filter((p) => p.upgraded).length;
        const totalPlots = farm.plots.length;
        const unupgradedPlots = farm.plots.filter((p) => !p.upgraded);
        const canAfford = have >= PLOT_UPGRADE_COST;
 
        return (
          <div key={farm.id} className="card p-4 space-y-2" style={{ fontSize: "0.82rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{crop.emoji} {crop.name} Farm</span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {upgradedCount}/{totalPlots} plots upgraded
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              {artisanEmoji} {have} {artisanName} available · {PLOT_UPGRADE_COST} per plot
            </div>
            {unupgradedPlots.length === 0 ? (
              <div style={{ fontSize: "0.72rem", color: "#4ade80", fontStyle: "italic" }}>
                ✓ All plots upgraded!
              </div>
            ) : (
              <button
                onClick={() => onUpgradePlot(farm.id, unupgradedPlots[0].id)}
                disabled={!canAfford}
                className="btn w-full"
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}
              >
                {canAfford
                  ? `Upgrade next plot (${PLOT_UPGRADE_COST} ${artisanEmoji} ${artisanName})`
                  : `Need ${PLOT_UPGRADE_COST} ${artisanEmoji} ${artisanName}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
 
// ─── Feast section ────────────────────────────────────────────────────────────
 
function FeastSection({ game, onBuyFeast }) {
  const nextTier = getNextFeastTier(game);
  const currentBonus = game.feastBonusPercent ?? 0;
  const atMax = currentBonus >= FEAST_MAX_BONUS;
 
  const perGood = nextTier ? Math.ceil(nextTier.cost / 3) : 0;
  const canAfford = nextTier &&
    (game.artisan.bread ?? 0) >= perGood &&
    (game.artisan.jam ?? 0) >= perGood &&
    (game.artisan.sauce ?? 0) >= perGood;
 
  return (
    <div className="space-y-3">
      <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>🍽️ Feast — Global Speed</h3>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
        Spend artisan goods to permanently increase grow speed across ALL farms. Stacks up to {FEAST_MAX_BONUS}%.
      </p>
 
      <div className="card p-4 space-y-3">
        {/* Current bonus */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ fontWeight: 600 }}>Current bonus</span>
          <span style={{ color: currentBonus > 0 ? "#4ade80" : "var(--muted)", fontWeight: 700 }}>
            +{currentBonus}% faster
          </span>
        </div>
 
        {/* Progress bar to max */}
        <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${(currentBonus / FEAST_MAX_BONUS) * 100}%`,
            background: "#4ade80",
            borderRadius: "999px",
            transition: "width 0.4s ease",
          }} />
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center" }}>
          {currentBonus}/{FEAST_MAX_BONUS}% maximum bonus
        </div>
 
        {/* Next tier */}
        {atMax ? (
          <div style={{ fontSize: "0.78rem", color: "#4ade80", textAlign: "center", fontStyle: "italic" }}>
            ✓ Maximum feast bonus reached!
          </div>
        ) : nextTier ? (
          <>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Next: +{nextTier.bonusPercent}% for {perGood} each of 🍞🍯🥫
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              You have: 🍞{game.artisan.bread ?? 0} · 🍯{game.artisan.jam ?? 0} · 🥫{game.artisan.sauce ?? 0}
            </div>
            <button
              onClick={onBuyFeast}
              disabled={!canAfford}
              className="btn w-full"
              style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem" }}
            >
              {canAfford
                ? `Buy Feast tier — +${nextTier.bonusPercent}% speed`
                : `Need ${perGood} of each artisan good`}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function ProcessingZone({ game, onStartProcessing, onUpgradePlot, onBuyFeast }) {
  const maxSlots = 1 + (game.prestigeBonuses ?? []).filter((b) => b === "bigger_kitchen").length;
  const activeQueue = (game.processingQueue ?? []).filter((i) => !i.done);
  const queueFull = activeQueue.length >= maxSlots;
 
  const availableRecipes = Object.values(PROCESSING_RECIPES).filter(
    (r) => r.inputCrop // only show craftable recipes (not feast)
  );
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 4rem" }}>
 
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏭 Kitchen</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Process crops into artisan goods. Use goods to upgrade plots or buy Feast bonuses.
          Queue: {activeQueue.length}/{maxSlots}
        </p>
      </div>
 
      {/* Artisan goods summary */}
      <div className="card p-3" style={{
        display: "flex", gap: "1rem", flexWrap: "wrap",
        fontSize: "0.82rem", marginBottom: "1.5rem",
      }}>
        <span>🍞 {game.artisan?.bread ?? 0} Bread</span>
        <span>🍯 {game.artisan?.jam ?? 0} Jam</span>
        <span>🥫 {game.artisan?.sauce ?? 0} Sauce</span>
      </div>
 
      {/* Active queue */}
      {activeQueue.length > 0 && (
        <div className="space-y-3" style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>In progress</h3>
          {activeQueue.map((item) => <QueueItem key={item.id} item={item} />)}
        </div>
      )}
 
      {/* Recipes */}
      <div className="space-y-3" style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>Recipes</h3>
        {availableRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            game={game}
            onStartProcessing={onStartProcessing}
            queueFull={queueFull}
          />
        ))}
      </div>
 
      {/* Plot upgrades */}
      <div style={{ marginBottom: "2rem" }}>
        <PlotUpgradeSection game={game} onUpgradePlot={onUpgradePlot} />
      </div>
 
      {/* Feast */}
      <FeastSection game={game} onBuyFeast={onBuyFeast} />
 
    </div>
  );
}