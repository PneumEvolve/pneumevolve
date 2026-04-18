// src/Pages/rootwork/components/ProcessingZone.jsx
 
import React, { useState, useCallback } from "react";
import {
  PROCESSING_RECIPES,
  KITCHEN_WORKER_UPGRADES,
  KITCHEN_WORKER_UPGRADE_ORDER,
  BAIT_TYPES,
  BAIT_RECIPES,
} from "../gameConstants";
import {
  getKitchenWorkerHireCost,
  getEffectiveKitchenSeconds,
  isKitchenWorkerIdle,
  getNextFeastTier,
  getKitchenWorkerBatchSize,
  getAvailableWorkerSlots,
  getFishMealGrowBonus,
} from "../gameEngine";
 
const RECIPE_LIST = ["bread", "jam", "sauce", "omelette", "cheese", "knitted_goods", "fish_pie", "smoked_fish", "fish_meal"];
const BAIT_RECIPE_LIST = ["wheat_bait", "berry_bait", "tomato_bait"];
const SPEED_UPGRADES = ["speed_1", "speed_2", "auto_restart"];
const BATCH_UPGRADES = ["batch_2", "batch_5", "batch_10"];
 
// ─── Progress bar ─────────────────────────────────────────────────────────────
 
function ProgressBar({ elapsed, total, color = "var(--accent)" }) {
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  return (
    <div style={{ height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: color, borderRadius: "2px",
        transition: "width 0.5s linear",
      }} />
    </div>
  );
}
 
// ─── Upgrade tree ─────────────────────────────────────────────────────────────
 
function UpgradeTree({ label, upgradeIds, worker, game, onUpgrade }) {
  const upgrades = worker.upgrades ?? [];
  return (
    <div>
      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.3rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {upgradeIds.map((uid) => {
          const u = KITCHEN_WORKER_UPGRADES[uid];
          const owned = upgrades.includes(uid);
          const requiresMet = !u.requires || upgrades.includes(u.requires);
          const canAfford = (game.cash ?? 0) >= u.cost;
          const canBuy = !owned && requiresMet && canAfford;
          const locked = !owned && !requiresMet;
 
          return (
            <div key={uid} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.3rem 0.5rem", borderRadius: "6px",
              background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
              border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
              opacity: locked ? 0.4 : 1,
            }}>
              <div style={{ fontSize: "0.7rem" }}>
                <span style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>
                  {owned ? "✓" : locked ? "🔒" : u.emoji} {u.name}
                </span>
                <span style={{ marginLeft: "0.4rem", fontSize: "0.62rem", color: "var(--muted)" }}>
                  {u.description}
                </span>
              </div>
              {!owned && (
                <button
                  onClick={() => canBuy && onUpgrade(worker.id, uid)}
                  disabled={!canBuy}
                  className="btn btn-secondary"
                  style={{
                    fontSize: "0.62rem", padding: "0.15rem 0.4rem",
                    marginLeft: "0.4rem", flexShrink: 0,
                    opacity: canBuy ? 1 : 0.5,
                    cursor: canBuy ? "pointer" : "default",
                  }}
                >
                  ${u.cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
// ─── Kitchen worker card ──────────────────────────────────────────────────────
 
function KitchenWorkerCard({ worker, game, onAssignRecipe, onUpgrade, onFire, onCancel, onToggleAutoRestart, workerNumber, expanded, onToggle }) {
  const [showRecipes, setShowRecipes] = useState(false);
  const [confirmFire, setConfirmFire] = useState(false);
 
  const idle = isKitchenWorkerIdle(worker);
  const recipe = worker.recipeId ? (PROCESSING_RECIPES[worker.recipeId] ?? BAIT_RECIPES[worker.recipeId]) : null;
  const upgrades = worker.upgrades ?? [];
  const timeRemaining = worker.busy ? Math.max(0, Math.floor(worker.totalSeconds - worker.elapsedSeconds)) : 0;
  const batch = getKitchenWorkerBatchSize(worker);
  const hasAutoRestart = upgrades.includes("auto_restart");
 
  const statusText = idle
    ? "⚠ Idle"
    : worker.busy
      ? `Crafting ${recipe?.emoji} ${recipe?.name}${batch > 1 ? ` ×${batch}` : ""} · ${timeRemaining}s`
      : hasAutoRestart
        ? `⏳ Waiting for ${recipe?.emoji} ${recipe?.name}`
        : `✓ Done — ${recipe?.emoji} ${recipe?.name}`;
 
  const statusColor = idle ? "#ef4444" : worker.busy ? "#4ade80" : "var(--muted)";
 
  return (
    <div className="card" style={{ fontSize: "0.82rem", overflow: "hidden" }}>
 
      {/* Header row */}
      <div style={{
        width: "100%", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0.65rem 1rem",
        borderBottom: expanded ? "1px solid var(--border)" : "none",
      }}>
        {/* Left — expand/collapse toggle */}
        <button
          onClick={onToggle}
          style={{
            flex: 1, display: "flex", alignItems: "center",
            gap: "0.5rem", background: "none", border: "none",
            cursor: "pointer", textAlign: "left", minWidth: 0, padding: 0,
          }}
        >
          <span>👨‍🍳</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
              Chef {workerNumber}
              {upgrades.length > 0 && (
                <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", color: "var(--muted)" }}>
                  {upgrades.map((u) => KITCHEN_WORKER_UPGRADES[u]?.emoji).join("")}
                </span>
              )}
              {batch > 1 && (
                <span style={{ marginLeft: "0.35rem", fontSize: "0.65rem", color: "#f59e0b", fontWeight: 700 }}>
                  ×{batch}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.65rem", color: statusColor, marginTop: "0.1rem" }}>
              {statusText}
            </div>
          </div>
          <span style={{ color: "var(--muted)", fontSize: "0.65rem", marginLeft: "0.5rem", flexShrink: 0 }}>
            {expanded ? "▲" : "▼"}
          </span>
        </button>
 
 
        {/* Cancel button — show when busy */}
{worker.busy && (
  <button
    onClick={() => onCancel(worker.id)}
    style={{
      fontSize: "0.65rem", padding: "0.2rem 0.5rem",
      borderRadius: "6px", cursor: "pointer", flexShrink: 0,
      marginLeft: "0.5rem",
      background: "rgba(239,68,68,0.1)",
      border: "1px solid rgba(239,68,68,0.3)",
      color: "#ef4444", fontWeight: 600,
    }}
  >
    ✕
  </button>
)}
 
{/* Cook Again button — show when idle with previous recipe */}
{!worker.busy && !idle && recipe && (
  <button
    onClick={() => onAssignRecipe(worker.id, worker.recipeId)}
    style={{
      fontSize: "0.65rem", padding: "0.2rem 0.5rem",
      borderRadius: "6px", cursor: "pointer", flexShrink: 0,
      marginLeft: "0.5rem",
      background: "rgba(99,102,241,0.1)",
      border: "1px solid rgba(99,102,241,0.3)",
      color: "var(--accent)", fontWeight: 600,
    }}
  >
    🍳 Again
  </button>
)}
      </div>
 
      {/* Progress bar visible when busy and collapsed */}
      {worker.busy && !expanded && (
        <div style={{ padding: "0 1rem 0.5rem" }}>
          <ProgressBar elapsed={worker.elapsedSeconds} total={worker.totalSeconds} />
        </div>
      )}
 
      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
 
          {/* Progress */}
          {worker.busy && recipe && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                <span>
                  {recipe.emoji} {recipe.name}
                  {batch > 1 && (
                    <span style={{ marginLeft: "0.3rem", color: "#f59e0b", fontWeight: 600 }}>
                      ×{batch} batch
                    </span>
                  )}
                </span>
                <span>{timeRemaining}s remaining</span>
              </div>
              <ProgressBar elapsed={worker.elapsedSeconds} total={worker.totalSeconds} />
              <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                Produces {recipe.outputAmount * batch} {recipe.emoji} · consumes {recipe.inputAmount * batch}× {recipe.inputCrop}
              </div>
            </div>
          )}
 
          {/* Waiting / done state */}
          {!worker.busy && worker.recipeId && recipe && (
            <div style={{
              fontSize: "0.72rem", color: "var(--muted)",
              background: "var(--bg)", borderRadius: "6px", padding: "0.4rem 0.6rem",
            }}>
              {hasAutoRestart
                ? `Waiting for ${recipe.inputAmount * batch}× ${recipe.inputCrop} to restart`
                : `✓ Done — tap 🍳 Again or assign a new recipe below`}
            </div>
          )}
 
          {/* Recipe selector */}
          <div>
            <button
              onClick={() => setShowRecipes(!showRecipes)}
              style={{
                width: "100%", fontSize: "0.72rem", padding: "0.35rem 0.6rem",
                borderRadius: "6px", background: "var(--bg)",
                border: "1px solid var(--border)", color: "var(--muted)",
                cursor: "pointer", textAlign: "left",
              }}
            >
              {showRecipes ? "▲ Hide recipes" : `▼ ${worker.recipeId ? "Change recipe" : "Assign recipe"}`}
            </button>
 
            {showRecipes && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.4rem" }}>
                {/* Standard recipes */}
                {RECIPE_LIST.map((recipeId) => {
                  const r = PROCESSING_RECIPES[recipeId];
                  const have = (game.crops[r.inputCrop] ?? 0)
                    || (game.animalGoods?.[r.inputCrop] ?? 0)
                    || (game.pond?.fish?.[r.inputCrop] ?? 0);
                  const totalInput = r.inputAmount * batch;
                  const canStart = have >= totalInput;
                  const effectiveSeconds = getEffectiveKitchenSeconds(worker, r.seconds);
                  return (
                    <button
                      key={recipeId}
                      onClick={() => { onAssignRecipe(worker.id, recipeId); setShowRecipes(false); }}
                      disabled={!canStart}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.5rem 0.6rem", borderRadius: "6px",
                        background: worker.recipeId === recipeId ? "rgba(99,102,241,0.1)" : "var(--bg)",
                        border: `1px solid ${worker.recipeId === recipeId ? "var(--accent)" : "var(--border)"}`,
                        cursor: canStart ? "pointer" : "default",
                        opacity: canStart ? 1 : 0.5, fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span>{r.emoji}</span>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
                          <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
                            {totalInput}× {r.inputCrop} · {effectiveSeconds}s · have {have}
                            {batch > 1 && <span style={{ marginLeft: "0.3rem", color: "#f59e0b" }}>· ×{batch} batch</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "right" }}>
                        → {r.outputAmount * batch} {r.emoji}
                      </div>
                    </button>
                  );
                })}

                {/* Bait recipes */}
                <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--muted)", marginTop: "0.25rem", paddingTop: "0.35rem", borderTop: "1px solid var(--border)", letterSpacing: "0.06em" }}>
                  🪱 BAIT
                </div>
                {BAIT_RECIPE_LIST.map((recipeId) => {
                  const r = BAIT_RECIPES[recipeId];
                  const have = game.crops[r.inputCrop] ?? 0;
                  const totalInput = r.inputAmount * batch;
                  const canStart = have >= totalInput;
                  const effectiveSeconds = getEffectiveKitchenSeconds(worker, r.seconds);
                  const inStock = game.bait?.[recipeId] ?? 0;
                  return (
                    <button
                      key={recipeId}
                      onClick={() => { onAssignRecipe(worker.id, recipeId); setShowRecipes(false); }}
                      disabled={!canStart}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.5rem 0.6rem", borderRadius: "6px",
                        background: worker.recipeId === recipeId ? "rgba(99,102,241,0.1)" : "var(--bg)",
                        border: `1px solid ${worker.recipeId === recipeId ? "var(--accent)" : "var(--border)"}`,
                        cursor: canStart ? "pointer" : "default",
                        opacity: canStart ? 1 : 0.5, fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span>{r.emoji}</span>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
                          <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
                            {totalInput}× {r.inputCrop} · {effectiveSeconds}s · have {have}
                            {batch > 1 && <span style={{ marginLeft: "0.3rem", color: "#f59e0b" }}>· ×{batch} batch</span>}
                            {inStock > 0 && <span style={{ marginLeft: "0.3rem", color: "#60a5fa" }}>· {inStock} in stock</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "right" }}>
                        → {r.outputAmount * batch} {r.emoji}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
 
          {/* Auto-restart toggle */}
          {upgrades.includes("auto_restart") && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0.5rem", background: "var(--bg)", borderRadius: "6px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.68rem" }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>🔄 Auto-Restart</span>
                <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>Automatically restart recipe when done</span>
              </div>
              <button
                onClick={() => onToggleAutoRestart(worker.id)}
                style={{
                  fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                  cursor: "pointer", fontWeight: 700, flexShrink: 0, marginLeft: "0.5rem",
                  background: (worker.autoRestartEnabled ?? true) ? "rgba(74,222,128,0.15)" : "var(--bg)",
                  border: `1px solid ${(worker.autoRestartEnabled ?? true) ? "#4ade80" : "var(--border)"}`,
                  color: (worker.autoRestartEnabled ?? true) ? "#4ade80" : "var(--muted)",
                }}
              >
                {(worker.autoRestartEnabled ?? true) ? "🟢 On" : "⚪ Off"}
              </button>
            </div>
          )}
 
          {/* Upgrade trees */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <UpgradeTree
              label="⚡ Speed"
              upgradeIds={SPEED_UPGRADES}
              worker={worker}
              game={game}
              onUpgrade={onUpgrade}
            />
            <UpgradeTree
              label="📦 Batch"
              upgradeIds={BATCH_UPGRADES}
              worker={worker}
              game={game}
              onUpgrade={onUpgrade}
            />
          </div>
 
          {/* Fire */}
{!confirmFire ? (
  <button
    onClick={() => setConfirmFire(true)}
    style={{
      fontSize: "0.65rem", color: "var(--muted)",
      background: "none", border: "1px solid var(--border)",
      borderRadius: "6px", padding: "0.25rem 0.6rem",
      cursor: "pointer", alignSelf: "flex-end",
    }}
  >
    Fire worker
  </button>
) : (
  <div style={{ display: "flex", gap: "0.3rem", alignSelf: "flex-end" }}>
    <button
      onClick={() => { onFire(worker.id); setConfirmFire(false); }}
      style={{
        fontSize: "0.65rem", color: "#fff",
        background: "#ef4444", border: "none",
        borderRadius: "6px", padding: "0.25rem 0.6rem", cursor: "pointer",
      }}
    >
      Confirm fire
    </button>
    <button
      onClick={() => setConfirmFire(false)}
      style={{
        fontSize: "0.65rem", color: "var(--muted)",
        background: "none", border: "1px solid var(--border)",
        borderRadius: "6px", padding: "0.25rem 0.6rem", cursor: "pointer",
      }}
    >
      Cancel
    </button>
  </div>
)}
 
        </div>
      )}
    </div>
  );
}
 
// ─── Fish Meal panel ─────────────────────────────────────────────────────────
 
function FishMealPanel({ game }) {
  const fishMealCount = Math.floor(game.animalGoods?.fish_meal ?? 0);
  const stacks = game.fishMealStacks ?? [];
  const activeBonus = stacks.reduce((s, st) => s + (st.secondsLeft > 0 ? st.bonus : 0), 0);
  if (fishMealCount === 0 && stacks.length === 0) return null;
  return (
    <div className="card p-4" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <div>
          <div style={{ fontWeight: 600 }}>🌿 Fish Meal Fertilizer</div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Crafted from minnows. Auto-activates +10% grow speed for 10 min per batch.</div>
        </div>
        {activeBonus > 0 && (
          <div style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 700, background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.2rem 0.5rem", flexShrink: 0, marginLeft: "0.5rem" }}>
            +{activeBonus}% active
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>In stock: <strong style={{ color: fishMealCount > 0 ? "var(--text)" : "var(--muted)" }}>{fishMealCount} 🌿</strong></div>
        {stacks.map((s, i) => (
          <div key={i} style={{ fontSize: "0.62rem", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "6px", padding: "0.15rem 0.4rem", color: "#4ade80" }}>
            +{s.bonus}% · {Math.ceil(s.secondsLeft / 60)}min left
          </div>
        ))}
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
        <div style={{ fontSize: "0.72rem", color: "#4ade80" }}>+{currentBonus}% grow speed on all farms</div>
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
            background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.2rem 0.5rem",
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
          { emoji: "🍯", label: "Jam",   have: game.artisan.jam ?? 0,   ok: hasJam },
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
 
// ─── Bait inventory ───────────────────────────────────────────────────────────
 
function BaitInventory({ bait }) {
  const items = Object.values(BAIT_RECIPES);
  const hasAny = items.some(({ id }) => (bait?.[id] ?? 0) > 0);
  if (!hasAny) return null;
  return (
    <div className="card p-3" style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>
        🪱 Bait Stock
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {items.map(({ id, emoji, name }) => {
          const count = bait?.[id] ?? 0;
          return (
            <div key={id} style={{
              flex: 1, textAlign: "center", padding: "0.5rem",
              background: "var(--bg)", borderRadius: "8px",
              border: `1px solid ${count > 0 ? "rgba(96,165,250,0.3)" : "var(--border)"}`,
            }}>
              <div style={{ fontSize: "1.2rem" }}>{emoji}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: count > 0 ? "#60a5fa" : "var(--muted)" }}>
                {count}
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{name.replace(" Bait", "")}</div>
            </div>
          );
        })}
      </div>
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
  onCancelKitchenWorkerRecipe,
  onToggleKitchenWorkerAutoRestart,
  onBuyFeast,
}) {
  const [expandedWorkers, setExpandedWorkers] = useState({});
 
  const toggleWorker = useCallback((workerId) => {
    setExpandedWorkers((prev) => ({ ...prev, [workerId]: !prev[workerId] }));
  }, []);
 
  const hireCost = getKitchenWorkerHireCost(game);
const atCap = getAvailableWorkerSlots(game) <= 0;
const canAffordCash = (game.cash ?? 0) >= hireCost;
const canHire = !atCap && canAffordCash;
const workers = game.kitchenWorkers ?? [];
const isFirstWorker = workers.length === 0;
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
 
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏭 Crafting</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Hire kitchen workers to craft artisan goods from your crops.
        </p>
      </div>
 
      <ArtisanInventory artisan={game.artisan} />
      <BaitInventory bait={game.bait} />
 
      <div style={{ marginBottom: "1.25rem" }}>
        <button
  onClick={onHireKitchenWorker}
  disabled={!canHire}
  className="btn w-full"
  style={{ opacity: canHire ? 1 : 0.5 }}
>
  {atCap
    ? "👥 Town full — grow population to hire"
    : `👨‍🍳 Hire Kitchen Worker — $${hireCost}`
  }
</button>
{isFirstWorker && !atCap && (
  <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", textAlign: "center" }}>
    Each worker crafts one recipe at a time. Two upgrade paths: speed or batch size.
  </p>
)}
      </div>
 
      {workers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {workers.map((worker, idx) => (
            <KitchenWorkerCard
              key={worker.id}
              worker={worker}
              game={game}
              workerNumber={idx + 1}
              expanded={expandedWorkers[worker.id] ?? false}
              onToggle={() => toggleWorker(worker.id)}
              onAssignRecipe={onAssignKitchenWorkerRecipe}
              onUpgrade={onUpgradeKitchenWorker}
              onFire={onFireKitchenWorker}
              onCancel={onCancelKitchenWorkerRecipe}
              onToggleAutoRestart={onToggleKitchenWorkerAutoRestart}
            />
          ))}
        </div>
      )}
 
      <FishMealPanel game={game} />
      <FeastPanel game={game} onBuyFeast={onBuyFeast} />
 
    </div>
  );
}