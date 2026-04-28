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
  getKitchenWorkerMaxBatchSize,
  getAvailableWorkerSlots,
  getFishMealGrowBonus,
  isTownBuildingBuilt,
  hasSchoolResearch,
  hasPrestigeSkill,
} from "../gameEngine";
 
const RECIPE_LIST = ["bread", "jam", "sauce", "omelette", "cheese", "knitted_goods", "fish_pie", "smoked_fish", "fish_meal", "fish_meal_bass"];
const BAIT_RECIPE_LIST = ["wheat_bait", "berry_bait", "tomato_bait"];
const SPEED_UPGRADES = ["speed_1", "auto_restart", "speed_2" ];
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
 

// Material cost display helper — returns e.g. "5 Iron Ore + 3 Lumber"
function matCostLabel(upgradeRequires) {
  if (!upgradeRequires) return null;
  const NAMES = {
    iron_ore: "Iron Ore", lumber: "Lumber",
    iron_fitting: "Iron Fitting", reinforced_crate: "Reinforced Crate", fine_tools: "Fine Tools",
  };
  return Object.entries(upgradeRequires).map(([k, v]) => `${v} ${NAMES[k] ?? k}`).join(" + ");
}
function canAffordMats(upgradeRequires, worldResources, forgeGoods) {
  if (!upgradeRequires) return true;
  for (const [k, qty] of Object.entries(upgradeRequires)) {
    const have = (worldResources?.[k] ?? 0) + (forgeGoods?.[k] ?? 0);
    if (have < qty) return false;
  }
  return true;
}
// ─── Upgrade tree ─────────────────────────────────────────────────────────────
 
function UpgradeTree({ label, upgradeIds, worker, game, onUpgrade }) {
  const upgrades = worker.upgrades ?? [];
  const SCHOOL_RESEARCH_GATE = {
    batch_5:  "kitchen_batch_5",
    batch_10: "kitchen_batch_10",
  };
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
          const researchId = SCHOOL_RESEARCH_GATE[uid];
          const schoolLocked = researchId ? !hasSchoolResearch(game, researchId) : false;
          const canAfford = (game.cash ?? 0) >= u.cost;
          const matsOk = canAffordMats(u.upgradeRequires, game.worldResources, game.forgeGoods);
          const canBuy = !owned && requiresMet && canAfford && matsOk && !schoolLocked;
          const locked = !owned && !requiresMet;
          const matLabel = matCostLabel(u.upgradeRequires);

          return (
            <div key={uid} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.3rem 0.5rem", borderRadius: "6px",
              background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
              border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : schoolLocked && requiresMet ? "rgba(167,139,250,0.3)" : "var(--border)"}`,
              opacity: locked ? 0.4 : 1,
            }}>
              <div style={{ fontSize: "0.7rem" }}>
                <span style={{ fontWeight: 600, color: owned ? "#4ade80" : schoolLocked ? "#a78bfa" : "var(--text)" }}>
                  {owned ? "✓" : schoolLocked && requiresMet ? "🏫" : locked ? "🔒" : u.emoji} {u.name}
                </span>
                <span style={{ marginLeft: "0.4rem", fontSize: "0.62rem", color: "var(--muted)" }}>
                  {schoolLocked && requiresMet ? "Requires School Research" : u.description}
                </span>
                {!owned && requiresMet && !schoolLocked && matLabel && (
                  <span style={{ display: "block", fontSize: "0.6rem", color: matsOk ? "#fbbf24" : "#ef4444", fontWeight: 600, marginTop: "0.1rem" }}>
                    {matLabel}
                  </span>
                )}
              </div>
              {!owned && !schoolLocked && (
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
 
// ─── Recipe groups (collapsible sections inside assign recipe) ────────────────
 
const CROP_RECIPE_IDS = ["bread", "jam", "sauce"];
const FISH_RECIPE_IDS = ["fish_pie", "smoked_fish", "fish_meal", "fish_meal_bass"];
const ANIMAL_RECIPE_IDS = ["omelette", "cheese", "knitted_goods"];
 
function RecipeButton({ r, recipeId, worker, batch, onAssignRecipe, onClose, extraLabel }) {
  return (
    <button
      key={recipeId}
      onClick={() => { onAssignRecipe(worker.id, recipeId); onClose(); }}
      disabled={!r._canStart}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.5rem 0.6rem", borderRadius: "6px",
        background: worker.recipeId === recipeId ? "rgba(99,102,241,0.1)" : "var(--bg)",
        border: `1px solid ${worker.recipeId === recipeId ? "var(--accent)" : "var(--border)"}`,
        cursor: r._canStart ? "pointer" : "default",
        opacity: r._canStart ? 1 : 0.5, fontSize: "0.75rem", width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span>{r.emoji}</span>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
          <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
            {r._totalInput}× {r.inputCrop} · {r._effectiveSeconds}s · have {r._have}
            {batch > 1 && <span style={{ marginLeft: "0.3rem", color: "#f59e0b" }}>· ×{batch} batch</span>}
            {r._inStock > 0 && <span style={{ marginLeft: "0.3rem", color: extraLabel?.color ?? "var(--muted)" }}>· {r._inStock} in stock</span>}
          </div>
        </div>
      </div>
      <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "right" }}>
        {r._output}
      </div>
    </button>
  );
}
 
function RecipeSection({ title, icon, accentColor, recipeIds, recipes, worker, batch, onAssignRecipe, onClose, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const hasActive = recipeIds.some(id => worker.recipeId === id);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.4rem 0.6rem", background: open ? "rgba(255,255,255,0.03)" : "none",
          border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: hasActive ? accentColor : "var(--muted)", letterSpacing: "0.05em" }}>
          {icon} {title}
          {hasActive && <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", color: accentColor }}>● active</span>}
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", padding: "0.35rem 0.5rem 0.5rem" }}>
          {recipeIds.map(id => {
            const r = recipes[id];
            if (!r) return null;
            return <RecipeButton key={id} r={r} recipeId={id} worker={worker} batch={batch} onAssignRecipe={onAssignRecipe} onClose={onClose} extraLabel={{ color: accentColor }} />;
          })}
        </div>
      )}
    </div>
  );
}
 
function RecipeGroups({ worker, game, batch, onAssignRecipe, onClose }) {
  // Pre-compute recipe metadata for all categories
  function buildRecipe(recipeId, baseRecipe, haveVal, inStockVal, outputLabel) {
    const efficientMult = hasPrestigeSkill(game, "efficient_process") ? 0.75 : 1;
    const totalInput = Math.max(1, Math.floor(baseRecipe.inputAmount * batch * efficientMult));
    const effectiveSeconds = getEffectiveKitchenSeconds(worker, baseRecipe.seconds);
    const canStart = haveVal >= totalInput;
    return {
      ...baseRecipe,
      _have: haveVal,
      _inStock: inStockVal,
      _totalInput: totalInput,
      _effectiveSeconds: effectiveSeconds,
      _canStart: canStart,
      _output: outputLabel,
    };
  }
 
  const ARTISAN_HEAL = { bread: 30, jam: 50, sauce: 100 };
  const cropRecipes = {};
  CROP_RECIPE_IDS.forEach(id => {
    const r = PROCESSING_RECIPES[id];
    if (!r) return;
    const have = game.crops[r.inputCrop] ?? 0;
    const healAmt = ARTISAN_HEAL[id];
    const outputLabel = healAmt
      ? `→ ${r.outputAmount * batch} ${r.emoji} · ❤️+${healAmt}hp`
      : `→ ${r.outputAmount * batch} ${r.emoji}`;
    cropRecipes[id] = buildRecipe(id, r, have, 0, outputLabel);
  });
 
  const animalRecipes = {};
  ANIMAL_RECIPE_IDS.forEach(id => {
    const r = PROCESSING_RECIPES[id];
    if (!r) return;
    const have = game.animalGoods?.[r.inputCrop] ?? 0;
    animalRecipes[id] = buildRecipe(id, r, have, 0, `→ ${r.outputAmount * batch} ${r.emoji}`);
  });
 
  const fishRecipes = {};
  FISH_RECIPE_IDS.forEach(id => {
    const r = PROCESSING_RECIPES[id];
    if (!r) return;
    const have = (game.fishing?.fish?.[r.inputCrop] ?? 0) || (game.animalGoods?.[r.inputCrop] ?? 0);
    fishRecipes[id] = buildRecipe(id, r, have, 0, `→ ${r.outputAmount * batch} ${r.emoji}`);
  });
 
  const baitRecipes = {};
  BAIT_RECIPE_LIST.forEach(id => {
    const r = BAIT_RECIPES[id];
    if (!r) return;
    const have = game.crops[r.inputCrop] ?? 0;
    const inStock = game.bait?.[id] ?? 0;
    baitRecipes[id] = buildRecipe(id, r, have, inStock, `→ ${r.outputAmount * batch} ${r.emoji}`);
  });
 
 
  const activeCat =
    CROP_RECIPE_IDS.includes(worker.recipeId) ? "crop" :
    ANIMAL_RECIPE_IDS.includes(worker.recipeId) ? "animal" :
    FISH_RECIPE_IDS.includes(worker.recipeId) ? "fish" :
    BAIT_RECIPE_LIST.includes(worker.recipeId) ? "bait" :
    null;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.4rem" }}>
      <RecipeSection title="CROP GOODS" icon="🌾" accentColor="#86efac"
        recipeIds={CROP_RECIPE_IDS} recipes={cropRecipes}
        worker={worker} batch={batch} onAssignRecipe={onAssignRecipe} onClose={onClose}
        defaultOpen={!activeCat || activeCat === "crop"} />
      <RecipeSection title="BARN GOODS" icon="🐄" accentColor="#fbbf24"
        recipeIds={ANIMAL_RECIPE_IDS} recipes={animalRecipes}
        worker={worker} batch={batch} onAssignRecipe={onAssignRecipe} onClose={onClose}
        defaultOpen={activeCat === "animal"} />
      <RecipeSection title="FISH GOODS" icon="🐠" accentColor="#60a5fa"
        recipeIds={FISH_RECIPE_IDS} recipes={fishRecipes}
        worker={worker} batch={batch} onAssignRecipe={onAssignRecipe} onClose={onClose}
        defaultOpen={activeCat === "fish"} />
      <RecipeSection title="BAIT" icon="🪱" accentColor="#f97316"
        recipeIds={BAIT_RECIPE_LIST} recipes={baitRecipes}
        worker={worker} batch={batch} onAssignRecipe={onAssignRecipe} onClose={onClose}
        defaultOpen={activeCat === "bait"} />

    </div>
  );
}
 
// ─── Kitchen worker card ──────────────────────────────────────────────────────
 
function KitchenWorkerCard({ worker, game, onAssignRecipe, onUpgrade, onFire, onCancel, onToggleAutoRestart, onSetBatchOverride, workerNumber, expanded, onToggle }) {
  const [showRecipes, setShowRecipes] = useState(false);
  const [confirmFire, setConfirmFire] = useState(false);
 
  const idle = isKitchenWorkerIdle(worker);
  const recipe = worker.recipeId ? (PROCESSING_RECIPES[worker.recipeId] ?? BAIT_RECIPES[worker.recipeId]) : null;
  const upgrades = worker.upgrades ?? [];
  const satMultiplier = (game.town?.satisfaction ?? 100) / 100;
  const timeRemaining = worker.busy ? Math.max(0, Math.floor((worker.totalSeconds - worker.elapsedSeconds) / satMultiplier)) : 0;
  const batch = getKitchenWorkerBatchSize(worker);
  const maxBatch = getKitchenWorkerMaxBatchSize(worker);
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
                {(() => {
                  const efficientMult = hasPrestigeSkill(game, "efficient_process") ? 0.75 : 1;
                  const consumed = Math.max(1, Math.floor(recipe.inputAmount * batch * efficientMult));
                  return `Produces ${recipe.outputAmount * batch} ${recipe.emoji}${recipe.healAmount ? ` · ❤️+${recipe.healAmount}hp each` : ""} · consumes ${consumed}× ${recipe.inputCrop}`;
                })()}
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
                ? `Waiting for ${Math.max(1, Math.floor(recipe.inputAmount * batch * (hasPrestigeSkill(game, "efficient_process") ? 0.75 : 1)))}× ${recipe.inputCrop} to restart`
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
              <RecipeGroups
                worker={worker}
                game={game}
                batch={batch}
                onAssignRecipe={onAssignRecipe}
                onClose={() => setShowRecipes(false)}
              />
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
 
 
          {/* Batch size toggle */}
          {maxBatch > 1 && (
            <div style={{ padding: "0.35rem 0.5rem", background: "var(--bg)", borderRadius: "6px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.35rem" }}>
                📦 Batch Size
                <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)", fontWeight: 400 }}>Takes effect on next run</span>
              </div>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {[1, 2, 5, 10].filter((n) => n <= maxBatch).map((n) => (
                  <button
                    key={n}
                    onClick={() => onSetBatchOverride(worker.id, n)}
                    style={{
                      fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px",
                      cursor: "pointer", fontWeight: 700,
                      background: batch === n ? "rgba(245,158,11,0.2)" : "var(--surface)",
                      border: `1px solid ${batch === n ? "#f59e0b" : "var(--border)"}`,
                      color: batch === n ? "#f59e0b" : "var(--muted)",
                    }}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
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
 
function FishMealPanel({ game, onApplyFishMeal }) {
  const fishMealCount = Math.floor(game.animalGoods?.fish_meal ?? 0);
  const stack = (game.fishMealStacks ?? []).find((s) => s.bonus === 10 && s.secondsLeft > 0);
  const activeSeconds = stack?.secondsLeft ?? 0;
  const MAX_SECONDS = 4 * 60 * 60;

  const hoursLeft = Math.floor(activeSeconds / 3600);
  const minsLeft = Math.floor((activeSeconds % 3600) / 60);
  const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
  const pct = MAX_SECONDS > 0 ? Math.min(100, (activeSeconds / MAX_SECONDS) * 100) : 0;

  return (
    <div className="card p-4" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ fontWeight: 600 }}>🌿 Fish Meal Fertilizer</div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
            +10% grow speed per dose · stacks up to 4 hours
          </div>
        </div>
        {activeSeconds > 0 && (
          <div style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 700, background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.2rem 0.5rem", flexShrink: 0, marginLeft: "0.5rem" }}>
            +10% · {timeStr}
          </div>
        )}
      </div>

      {/* Timer bar */}
      {activeSeconds > 0 && (
        <div style={{ height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden", marginBottom: "0.6rem" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#4ade80", borderRadius: "2px", transition: "width 1s linear" }} />
        </div>
      )}

      {fishMealCount === 0 && !stack ? (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", padding: "0.3rem 0" }}>
          Craft Fish Meal in the recipe list above — minnows ×5 or bass ×3. Each dose adds +10% grow speed.
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            In stock: <strong style={{ color: fishMealCount > 0 ? "var(--text)" : "var(--muted)" }}>{fishMealCount} 🌿</strong>
          </div>
          <button
            onClick={onApplyFishMeal}
            disabled={fishMealCount < 1}
            className="btn btn-secondary"
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.7rem", opacity: fishMealCount >= 1 ? 1 : 0.4 }}
          >
            Apply dose
          </button>
        </div>
      )}
      {activeSeconds > 0 && (
        <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.35rem" }}>
          Each dose adds 10 min · max 4h stored
        </div>
      )}
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
 

// ─── Crafted Goods Inventory (single collapsible, starts closed) ─────────────

function CraftedGoodsInventory({ artisan, animalGoods, bait }) {
  const [open, setOpen] = React.useState(false);

  const allItems = [
    { key: "bread",         emoji: "🍞", label: "Bread",       count: artisan?.bread ?? 0 },
    { key: "jam",           emoji: "🍯", label: "Jam",         count: artisan?.jam ?? 0 },
    { key: "sauce",         emoji: "🥫", label: "Sauce",       count: artisan?.sauce ?? 0 },
    { key: "omelette",      emoji: "🍳", label: "Omelette",    count: animalGoods?.omelette ?? 0 },
    { key: "cheese",        emoji: "🧀", label: "Cheese",      count: animalGoods?.cheese ?? 0 },
    { key: "knitted_goods", emoji: "🧥", label: "Knitted",     count: animalGoods?.knitted_goods ?? 0 },
    { key: "fish_pie",      emoji: "🥧", label: "Fish Pie",    count: animalGoods?.fish_pie ?? 0 },
    { key: "smoked_fish",   emoji: "🐟", label: "Smoked Fish", count: animalGoods?.smoked_fish ?? 0 },
    { key: "fish_meal",     emoji: "🌿", label: "Fish Meal",   count: animalGoods?.fish_meal ?? 0 },

    { key: "wheat_bait",    emoji: "🌾", label: "Wheat Bait",  count: bait?.wheat_bait ?? 0 },
    { key: "berry_bait",    emoji: "🫐", label: "Berry Bait",  count: bait?.berry_bait ?? 0 },
    { key: "tomato_bait",   emoji: "🍅", label: "Tomato Bait", count: bait?.tomato_bait ?? 0 },
  ];

  const totalCount = allItems.reduce((s, i) => s + i.count, 0);

  return (
    <div className="card" style={{ marginBottom: "1.25rem", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.55rem 0.75rem", background: "none", border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)" }}>
          Crafted Goods
          {totalCount > 0 && (
            <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "var(--text)", fontWeight: 700 }}>
              ({totalCount})
            </span>
          )}
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0 0.65rem 0.65rem" }}>
          {allItems.map(({ key, emoji, label, count }) => (
            <div key={key} style={{
              minWidth: "56px", flex: "1 1 56px", textAlign: "center", padding: "0.4rem 0.3rem",
              background: "var(--bg)", borderRadius: "8px",
              border: `1px solid ${count > 0 ? "rgba(255,255,255,0.08)" : "var(--border)"}`,
              opacity: count > 0 ? 1 : 0.35,
            }}>
              <div style={{ fontSize: "1.1rem" }}>{emoji}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: count > 0 ? "var(--text)" : "var(--muted)" }}>
                {Math.floor(count)}
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
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
  onSetBatchOverride,
  onBuyFeast,
  onApplyFishMeal,
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
 
      <CraftedGoodsInventory artisan={game.artisan} animalGoods={game.animalGoods} bait={game.bait} />
 
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
              onSetBatchOverride={onSetBatchOverride}
            />
          ))}
        </div>
      )}
 
      <FishMealPanel game={game} onApplyFishMeal={onApplyFishMeal} />
      <FeastPanel game={game} onBuyFeast={onBuyFeast} />
 
    </div>
  );
}