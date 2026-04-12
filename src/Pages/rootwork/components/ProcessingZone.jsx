// src/Pages/rootwork/components/ProcessingZone.jsx
 
import React from "react";
import {
  PROCESSING_RECIPES,
  CROPS,
  CROP_ARTISAN,
  PLOT_UPGRADE_COST,
  FEAST_TIERS,
  FEAST_MAX_BONUS,
  KITCHEN_BASE_COST,
  KITCHEN_SLOT_COSTS,
  KITCHEN_SLOT_UPGRADES,
} from "../gameConstants";
import {
  getNextFeastTier,
  getSellRate,
  getKitchenSlotUpgrades,
  getSlotSpeedMultiplier,
  canBuyKitchen,
  canBuyKitchenSlot,
} from "../gameEngine";
 
// ─── Kitchen shop (pre-purchase) ──────────────────────────────────────────────
 
function KitchenShop({ game, onPurchaseKitchen }) {
  const cash = game.cash ?? 0;
  const canAfford = cash >= KITCHEN_BASE_COST;
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏭 Kitchen</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Process crops into artisan goods for plot upgrades and feast bonuses.
        </p>
      </div>
 
      <div className="card p-5 space-y-4" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem" }}>🏭</div>
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>Build a Kitchen</div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7 }}>
          Purchase a kitchen to start processing crops into artisan goods.
          Expand it with additional queue slots and per-slot upgrades using cash.
        </p>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          You have: <strong style={{ color: canAfford ? "#4ade80" : "#ef4444" }}>${Math.floor(cash)}</strong>
          {" / "}
          <strong>${KITCHEN_BASE_COST}</strong>
        </div>
        <button
          onClick={onPurchaseKitchen}
          disabled={!canAfford}
          className="btn w-full"
          style={{ fontSize: "0.9rem", padding: "0.6rem" }}
        >
          {canAfford ? `🏭 Build Kitchen — $${KITCHEN_BASE_COST}` : `Need $${KITCHEN_BASE_COST} cash`}
        </button>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
          Earn cash by selling crops at the Market tab
        </div>
      </div>
    </div>
  );
}
 
// ─── Slot upgrade card ────────────────────────────────────────────────────────
 
function SlotUpgradeCard({ game, slotIndex, onPurchaseSlotUpgrade }) {
  const upgrades = getKitchenSlotUpgrades(game, slotIndex);
  const cash = game.cash ?? 0;
 
  return (
    <div className="card p-3 space-y-2" style={{ fontSize: "0.78rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>Slot {slotIndex + 1} Upgrades</div>
      {Object.values(KITCHEN_SLOT_UPGRADES).map((upg) => {
        const owned = upgrades.includes(upg.id);
        const prereqMet = !upg.requires || upgrades.includes(upg.requires);
        const canAfford = cash >= upg.cost;
        const disabled = owned || !prereqMet || !canAfford;
 
        return (
          <div key={upg.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "0.5rem",
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 500 }}>{upg.emoji} {upg.name}</span>
              {owned && <span style={{ marginLeft: "0.4rem", color: "#4ade80", fontSize: "0.68rem" }}>✓</span>}
              {!prereqMet && <span style={{ marginLeft: "0.4rem", color: "var(--muted)", fontSize: "0.65rem" }}>Needs Speed I</span>}
              <div style={{ color: "var(--muted)", fontSize: "0.68rem", marginTop: "0.1rem" }}>{upg.description}</div>
            </div>
            {!owned && (
              <button
                onClick={() => onPurchaseSlotUpgrade(slotIndex, upg.id)}
                disabled={disabled}
                className="btn btn-secondary"
                style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem", whiteSpace: "nowrap" }}
              >
                ${upg.cost}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
 
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
        {item.slotIndex !== undefined && (
          <span style={{ marginLeft: "0.5rem" }}>· Slot {item.slotIndex + 1}</span>
        )}
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
 
// ─── Plot upgrade section ─────────────────────────────────────────────────────
 
function PlotUpgradeSection({ game, onUpgradePlot }) {
  return (
    <div className="space-y-3">
      <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>⭐ Plot Upgrades</h3>
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
        Spend artisan goods to permanently upgrade individual plots — 50% faster grow time.
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
                {upgradedCount}/{totalPlots} upgraded
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              {artisanEmoji} {have} {artisanName} · {PLOT_UPGRADE_COST} per plot
            </div>
            {unupgradedPlots.length === 0 ? (
              <div style={{ fontSize: "0.72rem", color: "#4ade80", fontStyle: "italic" }}>✓ All plots upgraded!</div>
            ) : (
              <button
                onClick={() => onUpgradePlot(farm.id, unupgradedPlots[0].id)}
                disabled={!canAfford}
                className="btn w-full"
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}
              >
                {canAfford
                  ? `Upgrade next plot (${PLOT_UPGRADE_COST} ${artisanEmoji})`
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
        Permanently increase grow speed across all farms. Stacks up to {FEAST_MAX_BONUS}%.
      </p>
      <div className="card p-4 space-y-3">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ fontWeight: 600 }}>Current bonus</span>
          <span style={{ color: currentBonus > 0 ? "#4ade80" : "var(--muted)", fontWeight: 700 }}>
            +{currentBonus}% faster
          </span>
        </div>
        <div style={{ height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${(currentBonus / FEAST_MAX_BONUS) * 100}%`,
            background: "#4ade80", borderRadius: "999px", transition: "width 0.4s ease",
          }} />
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center" }}>
          {currentBonus}/{FEAST_MAX_BONUS}% maximum
        </div>
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
              Have: 🍞{game.artisan.bread ?? 0} · 🍯{game.artisan.jam ?? 0} · 🥫{game.artisan.sauce ?? 0}
            </div>
            <button
              onClick={onBuyFeast}
              disabled={!canAfford}
              className="btn w-full"
              style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem" }}
            >
              {canAfford ? `Buy Feast — +${nextTier.bonusPercent}% speed` : `Need ${perGood} of each`}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function ProcessingZone({
  game,
  onStartProcessing,
  onUpgradePlot,
  onBuyFeast,
  onPurchaseKitchen,
  onPurchaseKitchenSlot,
  onPurchaseSlotUpgrade,
}) {
  // Not yet purchased — show shop
  if (!game.kitchenPurchased) {
    return <KitchenShop game={game} onPurchaseKitchen={onPurchaseKitchen} />;
  }
 
  const maxSlots = game.kitchenSlotCount ?? 1;
  const activeQueue = (game.processingQueue ?? []).filter((i) => !i.done);
  const queueFull = activeQueue.length >= maxSlots;
  const cash = game.cash ?? 0;
 
  const availableRecipes = Object.values(PROCESSING_RECIPES).filter((r) => r.inputCrop);
 
  // Next slot cost
  const nextSlotCost = KITCHEN_SLOT_COSTS[maxSlots - 1];
  const canAffordSlot = nextSlotCost !== undefined && cash >= nextSlotCost;
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
 
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏭 Kitchen</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Queue: {activeQueue.length}/{maxSlots} slots · Cash: ${Math.floor(cash)}
        </p>
      </div>
 
      {/* Artisan goods summary */}
      <div className="card p-3" style={{
        display: "flex", gap: "1rem", flexWrap: "wrap",
        fontSize: "0.82rem", marginBottom: "1.25rem",
      }}>
        <span>🍞 {game.artisan?.bread ?? 0}</span>
        <span>🍯 {game.artisan?.jam ?? 0}</span>
        <span>🥫 {game.artisan?.sauce ?? 0}</span>
      </div>
 
      {/* Expand queue slot */}
      {nextSlotCost !== undefined && (
        <div className="card p-3" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>🔧 Expand Kitchen</div>
          <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: "0.5rem" }}>
            Add queue slot {maxSlots + 1} — process more recipes simultaneously.
          </div>
          <button
            onClick={onPurchaseKitchenSlot}
            disabled={!canAffordSlot}
            className="btn w-full"
            style={{ fontSize: "0.78rem", padding: "0.4rem" }}
          >
            {canAffordSlot
              ? `Add Slot ${maxSlots + 1} — $${nextSlotCost}`
              : `Need $${nextSlotCost} (have $${Math.floor(cash)})`}
          </button>
        </div>
      )}
 
      {/* Slot upgrades */}
      {maxSlots > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.6rem" }}>🔩 Slot Upgrades</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {Array.from({ length: maxSlots }).map((_, i) => (
              <SlotUpgradeCard
                key={i}
                game={game}
                slotIndex={i}
                onPurchaseSlotUpgrade={onPurchaseSlotUpgrade}
              />
            ))}
          </div>
        </div>
      )}
 
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