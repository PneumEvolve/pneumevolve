// src/Pages/rootwork/components/ForgeZone.jsx
import React, { useState } from "react";
import {
  FORGE_RECIPES, FORGE_RECIPE_LIST,
  FORGE_WORKER_UPGRADES, FORGE_WORKER_UPGRADE_ORDER,
  WORLD_RESOURCES, FORGE_BUILD_COST, FORGE_IRON, FORGE_LUMBER,
} from "../gameConstants";
import {
  getForgeWorkerHireCost,
  getForgeEffectiveSeconds,
  isForgeWorkerIdle,
} from "../gameEngine";
 
 
// Plain-text resource name map — avoids emoji rendering gaps on desktop
const RESOURCE_DISPLAY_NAMES = {
  iron_ore: "Iron Ore", lumber: "Lumber", herbs: "Herbs", rare_gem: "Rare Gem",
  titan_core: "Titan Core",
  iron_sword: "Iron Sword", steel_sword: "Steel Sword",
  iron_shield: "Iron Shield", steel_shield: "Steel Shield",
  leather_armor: "Leather Armor", chainmail: "Chainmail",
  iron_fitting: "Iron Fitting", reinforced_crate: "Reinforced Crate"
};
 
// ─── Progress bar ─────────────────────────────────────────────────────────────
 
function ProgressBar({ elapsed, total, color = "#f59e0b" }) {
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
 
// ─── World Resource Inventory ─────────────────────────────────────────────────
 
function ResourceInventory({ worldResources }) {
  const entries = Object.entries(WORLD_RESOURCES).map(([key, def]) => ({
    key, ...def, amount: Math.floor(worldResources?.[key] ?? 0),
  })).filter((r) => r.amount > 0);
 
  if (!entries.length) {
    return (
      <div style={{
        padding: "0.6rem 0.75rem", marginBottom: "0.75rem",
        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
        borderRadius: "10px", fontSize: "0.72rem", color: "var(--muted)", textAlign: "center",
      }}>
        No resources yet — send your adventurer to gather materials.
      </div>
    );
  }
 
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.4rem",
      marginBottom: "0.75rem",
      padding: "0.55rem 0.65rem",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
    }}>
      {entries.map((r) => (
        <div key={r.key} style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          borderRadius: "6px", padding: "0.2rem 0.55rem",
          fontSize: "0.75rem",
        }}>
          <span>{r.emoji}</span>
          <span style={{ fontWeight: 700 }}>{r.amount}</span>
          <span style={{ color: "var(--muted)", fontSize: "0.62rem" }}>{r.name}</span>
        </div>
      ))}
    </div>
  );
}
 
// ─── Forge Goods Inventory ────────────────────────────────────────────────────
 
function ForgeGoodsInventory({ forgeGoods }) {
  const entries = Object.entries(forgeGoods ?? {}).filter(([, v]) => v > 0);
  if (!entries.length) return null;
 
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.4rem",
      marginBottom: "0.75rem",
      padding: "0.55rem 0.65rem",
      background: "rgba(245,158,11,0.06)",
      border: "1px solid rgba(245,158,11,0.2)",
      borderRadius: "10px",
    }}>
      <div style={{ width: "100%", fontSize: "0.6rem", color: "var(--muted)", marginBottom: "0.2rem", letterSpacing: "0.06em" }}>
        CRAFTED ITEMS
      </div>
      {entries.map(([key, count]) => {
        const recipe = Object.values(FORGE_RECIPES).find((r) => r.output.resourceKey === key);
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "6px", padding: "0.2rem 0.55rem",
            fontSize: "0.75rem",
          }}>
            <span>{recipe?.output.emoji ?? "📦"}</span>
            <span style={{ fontWeight: 700 }}>{count}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.62rem" }}>{recipe?.output.name ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}
 
// ─── Upgrade tree ─────────────────────────────────────────────────────────────
 
function ForgeUpgradeTree({ worker, game, onUpgrade }) {
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.3rem" }}>
        UPGRADES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {FORGE_WORKER_UPGRADE_ORDER.map((uid) => {
          const u = FORGE_WORKER_UPGRADES[uid];
          const owned = (worker.upgrades ?? []).includes(uid);
          const requiresMet = !u.requires || (worker.upgrades ?? []).includes(u.requires);
          const canAfford = (game.cash ?? 0) >= u.cost;
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
              {!owned && requiresMet && (
                <button
                  onClick={() => onUpgrade(worker.id, uid)}
                  disabled={!canAfford}
                  style={{
                    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "5px",
                    background: canAfford ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${canAfford ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                    color: canAfford ? "var(--accent)" : "var(--muted)",
                    cursor: canAfford ? "pointer" : "default",
                    whiteSpace: "nowrap", flexShrink: 0,
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
 
// ─── Recipe groups ────────────────────────────────────────────────────────────
 
const FORGE_RECIPE_GROUPS = [
  { id: "weapons",     label: "WEAPONS",    icon: "⚔️",  accentColor: "#f87171", ids: ["iron_sword", "steel_sword", "master_sword", "hunting_bow"] },
  { id: "armour",      label: "ARMOUR",     icon: "🛡️",  accentColor: "#60a5fa", ids: ["iron_shield", "steel_shield", "tower_shield", "leather_armor", "chainmail", "plate_armor"] },
  { id: "components",  label: "COMPONENTS", icon: "🔩",  accentColor: "#34d399", ids: ["iron_fitting", "reinforced_crate", "fine_tools"] },
  { id: "consumables", label: "CONSUMABLES",icon: "🧪",  accentColor: "#a78bfa", ids: ["health_potion"] },
];
 
function ForgeRecipeRow({ recipeId, worker, worldResources, forgeGoods, onAssign, onCancel }) {
  const recipe = FORGE_RECIPES[recipeId];
  if (!recipe) return null;
  const isActive = worker.recipeId === recipeId;
  const effectiveSecs = getForgeEffectiveSeconds(worker, recipe);
 
  // Inputs may come from worldResources (raw materials) OR forgeGoods (gear items)
  const canCraft = Object.entries(recipe.inputs).every(([key, needed]) => {
    const have = (worldResources[key] ?? 0) + (forgeGoods?.[key] ?? 0);
    return have >= needed;
  });
 
  return (
    <div style={{
      padding: "0.45rem 0.55rem", borderRadius: "8px",
      background: isActive ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isActive ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
            <span>{recipe.emoji}</span>
            <span>{recipe.name}</span>
            {recipe.gearTier > 0 && (
              <span style={{ fontSize: "0.58rem", color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "1px 5px", borderRadius: "4px" }}>
                T{recipe.gearTier}
              </span>
            )}
 
          </div>
          <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
            {Object.entries(recipe.inputs).map(([key, needed]) => {
              const have = Math.floor((worldResources[key] ?? 0) + (forgeGoods?.[key] ?? 0));
              const displayName = RESOURCE_DISPLAY_NAMES[key] ?? (WORLD_RESOURCES[key]?.name ?? key);
              const ok = have >= needed;
              return (
                <span key={key} style={{
                  fontSize: "0.62rem",
                  color: ok ? "var(--muted)" : "#ef4444",
                  fontWeight: ok ? 400 : 600,
                }}>
                  {displayName} {have}/{needed}
                </span>
              );
            })}
            <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>· {effectiveSecs}s</span>
          </div>
        </div>
 
        {isActive ? (
          <button
            onClick={() => onCancel(worker.id)}
            style={{
              fontSize: "0.65rem", padding: "2px 8px", borderRadius: "5px",
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => canCraft && onAssign(worker.id, recipeId)}
            disabled={!canCraft || worker.busy}
            style={{
              fontSize: "0.65rem", padding: "2px 8px", borderRadius: "5px",
              background: canCraft && !worker.busy ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${canCraft && !worker.busy ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
              color: canCraft && !worker.busy ? "#f59e0b" : "var(--muted)",
              cursor: canCraft && !worker.busy ? "pointer" : "default",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Craft
          </button>
        )}
      </div>
    </div>
  );
}
 
function ForgeRecipeSection({ group, worker, worldResources, forgeGoods, onAssign, onCancel, defaultOpen }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const hasActive = group.ids.includes(worker.recipeId);
 
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.4rem 0.6rem", background: open ? "rgba(255,255,255,0.03)" : "none",
          border: "none", cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: hasActive ? group.accentColor : "var(--muted)", letterSpacing: "0.05em" }}>
          {group.icon} {group.label}
          {hasActive && <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", color: group.accentColor }}>● active</span>}
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", padding: "0.35rem 0.5rem 0.5rem" }}>
          {group.ids.map((id) => (
            <ForgeRecipeRow
              key={id}
              recipeId={id}
              worker={worker}
              worldResources={worldResources}
              forgeGoods={forgeGoods}
              onAssign={onAssign}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
 
function RecipePicker({ worker, game, onAssign, onCancel }) {
  const worldResources = game.worldResources ?? {};
  const forgeGoods = game.forgeGoods ?? {};
 
  const activeGroupId = FORGE_RECIPE_GROUPS.find((g) => g.ids.includes(worker.recipeId))?.id ?? null;
 
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.3rem" }}>
        RECIPES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {FORGE_RECIPE_GROUPS.map((group) => (
          <ForgeRecipeSection
            key={group.id}
            group={group}
            worker={worker}
            worldResources={worldResources}
            forgeGoods={forgeGoods}
            onAssign={onAssign}
            onCancel={onCancel}
            defaultOpen={group.id === "components" || activeGroupId === group.id}
          />
        ))}
      </div>
    </div>
  );
}
 
// ─── Forge Worker Card ────────────────────────────────────────────────────────
 
function ForgeWorkerCard({ worker, workerNumber, game, expanded, onToggle, onAssign, onUpgrade, onFire, onCancel, onToggleAutoRestart }) {
  const idle = isForgeWorkerIdle(worker);
  const recipe = worker.recipeId ? FORGE_RECIPES[worker.recipeId] : null;
 
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden",
      background: "var(--bg-elev)",
    }}>
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.55rem 0.75rem", background: "none", border: "none", cursor: "pointer",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "1rem" }}>🔨</span>
          <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>
              Smith #{workerNumber}
              {(worker.upgrades ?? []).map((uid) => (
                <span key={uid} style={{ marginLeft: "0.25rem", fontSize: "0.7rem" }}>
                  {FORGE_WORKER_UPGRADES[uid]?.emoji}
                </span>
              ))}
            </div>
            <div style={{ fontSize: "0.62rem", color: idle ? "#fbbf24" : "#4ade80" }}>
              {idle ? "⏸ idle" : recipe ? `⚒️ ${recipe.name}` : "working"}
            </div>
          </div>
        </div>
        <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{expanded ? "▲" : "▼"}</span>
      </button>
 
      {/* Progress bar always visible when working */}
      {worker.busy && (
        <div style={{ padding: "0 0.75rem 0.4rem" }}>
          <ProgressBar elapsed={worker.elapsedSeconds ?? 0} total={worker.totalSeconds ?? 1} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
              {recipe?.emoji} {recipe?.name}
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
              {Math.ceil((worker.totalSeconds ?? 0) - (worker.elapsedSeconds ?? 0))}s
            </span>
          </div>
        </div>
      )}
 
      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: "0 0.75rem 0.75rem", borderTop: "1px solid var(--border)" }}>
          {/* Auto-restart toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Auto-restart last recipe</span>
            <button
              onClick={() => onToggleAutoRestart(worker.id)}
              style={{
                fontSize: "0.65rem", padding: "2px 10px", borderRadius: "5px", cursor: "pointer",
                background: worker.autoRestart ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${worker.autoRestart ? "rgba(74,222,128,0.4)" : "var(--border)"}`,
                color: worker.autoRestart ? "#4ade80" : "var(--muted)",
              }}
            >
              {worker.autoRestart ? "ON" : "OFF"}
            </button>
          </div>
 
          <RecipePicker worker={worker} game={game} onAssign={onAssign} onCancel={onCancel} />
          <ForgeUpgradeTree worker={worker} game={game} onUpgrade={onUpgrade} />
 
          <button
            onClick={() => onFire(worker.id)}
            style={{
              marginTop: "0.75rem", width: "100%", padding: "0.3rem",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "6px", color: "#ef4444", fontSize: "0.65rem", cursor: "pointer",
            }}
          >
            Dismiss Smith
          </button>
        </div>
      )}
    </div>
  );
}
 
// ─── Main ForgeZone ───────────────────────────────────────────────────────────
 
export default function ForgeZone({
  game,
  onHireForgeWorker,
  onAssignForgeWorkerRecipe,
  onUpgradeForgeWorker,
  onFireForgeWorker,
  onCancelForgeWorkerRecipe,
  onToggleForgeWorkerAutoRestart,
  onBuildForge,
}) {
  const [expandedWorkers, setExpandedWorkers] = useState({});
 
  const toggleWorker = (id) => setExpandedWorkers((prev) => ({ ...prev, [id]: !prev[id] }));
 
  // ── Locked splash ──────────────────────────────────────────────────────────
  if (!game.forgeBuilt) {
    const hasCash = (game.cash ?? 0) >= FORGE_BUILD_COST;
    const hasIron = (game.worldResources?.iron_ore ?? 0) >= FORGE_IRON;
    const hasLumber = (game.worldResources?.lumber ?? 0) >= FORGE_LUMBER;
    const canAfford = hasCash && hasIron && hasLumber;
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
        <div style={{
          background: "linear-gradient(135deg, #1a0f00, #3d2200)",
          borderRadius: "16px", padding: "2.5rem 1.5rem",
          textAlign: "center", border: "1px solid rgba(255,200,100,0.15)",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>⚒️</div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", marginBottom: "0.4rem", letterSpacing: "0.04em" }}>
            Build a Forge
          </h3>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: "250px", margin: "0 auto 1.5rem" }}>
            Smelt world resources into gear and consumables for your adventurers. Hire smiths to craft automatically.
          </p>
          <button
            onClick={onBuildForge}
            disabled={!canAfford}
            style={{
              background: canAfford ? "rgba(217,119,6,0.5)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${canAfford ? "rgba(217,119,6,0.8)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "12px", padding: "0.7rem 1.75rem",
              fontSize: "0.82rem", fontWeight: 700,
              color: canAfford ? "#fff" : "rgba(255,255,255,0.25)",
              cursor: canAfford ? "pointer" : "default", letterSpacing: "0.04em",
            }}
          >
            {canAfford
              ? `⚒️ Build Forge — $${FORGE_BUILD_COST} · ${FORGE_IRON} Iron Ore · ${FORGE_LUMBER} Lumber`
              : `Need $${FORGE_BUILD_COST}${hasCash ? " ✓" : ` (have $${Math.floor(game.cash ?? 0)})`} · Iron Ore ${FORGE_IRON}${hasIron ? " ✓" : ` (have ${Math.floor(game.worldResources?.iron_ore ?? 0)})`} · Lumber ${FORGE_LUMBER}${hasLumber ? " ✓" : ` (have ${Math.floor(game.worldResources?.lumber ?? 0)})`}`}
          </button>
        </div>
      </div>
    );
  }
  // ── End locked splash ──────────────────────────────────────────────────────
 
  const workers = game.forgeWorkers ?? [];
  const hireCost = getForgeWorkerHireCost(game);
  const canHire = (game.cash ?? 0) >= hireCost;
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>⚒️ Forge</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Smelt world resources into gear and consumables for your adventurers.
        </p>
      </div>
 
      <ResourceInventory worldResources={game.worldResources} />
      <ForgeGoodsInventory forgeGoods={game.forgeGoods} />
 
      <div style={{ marginBottom: "1.25rem" }}>
        <button
          onClick={onHireForgeWorker}
          disabled={!canHire}
          className="btn w-full"
          style={{ opacity: canHire ? 1 : 0.5 }}
        >
          🔨 Hire Smith — ${hireCost}
        </button>
        {workers.length === 0 && (
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", textAlign: "center" }}>
            Smiths craft gear from your adventurer's haul. Each works one recipe at a time.
          </p>
        )}
      </div>
 
      {workers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {workers.map((worker, idx) => (
            <ForgeWorkerCard
              key={worker.id}
              worker={worker}
              workerNumber={idx + 1}
              game={game}
              expanded={expandedWorkers[worker.id] ?? false}
              onToggle={() => toggleWorker(worker.id)}
              onAssign={onAssignForgeWorkerRecipe}
              onUpgrade={onUpgradeForgeWorker}
              onFire={onFireForgeWorker}
              onCancel={onCancelForgeWorkerRecipe}
              onToggleAutoRestart={onToggleForgeWorkerAutoRestart}
            />
          ))}
        </div>
      )}
    </div>
  );
}