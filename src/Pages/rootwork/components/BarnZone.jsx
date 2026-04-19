import React, { useState } from "react";
import {
  BARN_WORKER_UPGRADES, ANIMAL_STORAGE_UPGRADES,
  BARN_WORKER_BASE_INTERVAL, ANIMAL_BASE_STOCK_MAX, ANIMAL_YIELD_UPGRADES
} from "../gameConstants";
import {
  getBarnWorkerHireCost, getBarnWorkerInterval,
  getBarnWorkerCapacity, getBarnWorkerCareInterval,
  getBarnWorkerCareMood, getAnimalStockMax,
  getAnimalStorageUpgradeCost,
} from "../gameEngine";

const ANIMAL_DEFS = {
  chicken: { id: "chicken", name: "Chicken", emoji: "🐔", baseCost: 300, costMultiplier: 1.8, produces: "egg",  produceName: "Egg",  produceEmoji: "🥚", cycleSeconds: 60,  foodPulseCost: 1, moodDecayPerMinute: 2,   description: "Lays eggs every minute.", unlockSeason: 1 },
  cow:     { id: "cow",     name: "Cow",     emoji: "🐄", baseCost: 800, costMultiplier: 1.6, produces: "milk", produceName: "Milk", produceEmoji: "🥛", cycleSeconds: 120, foodPulseCost: 2, moodDecayPerMinute: 1.5, description: "Produces milk every 2 minutes.", unlockSeason: 2 },
  sheep:   { id: "sheep",   name: "Sheep",   emoji: "🐑", baseCost: 1500, costMultiplier: 1.5, produces: "wool", produceName: "Wool", produceEmoji: "🧶", cycleSeconds: 180, foodPulseCost: 2, moodDecayPerMinute: 1,   description: "Produces wool every 3 minutes.", unlockSeason: 3 },
};

const PET_DEFS = {
  dog:    { id: "dog",    name: "Dog",    emoji: "🐕", cost: 400, bonus: "Slows mood decay on all barn animals by 30%.", foodCostPerPulse: 1 },
  cat:    { id: "cat",    name: "Cat",    emoji: "🐈", cost: 400, bonus: "Widens the fishing needle sweet spot by 20%.", foodCostPerPulse: 1 },
  rabbit: { id: "rabbit", name: "Rabbit", emoji: "🐇", cost: 400, bonus: "+5% town satisfaction while happy.",          foodCostPerPulse: 1 },
};

const MAX_PER_TYPE = 5;
const ANIMAL_TYPE_ORDER = ["chicken", "cow", "sheep"];
const SPEED_UPGRADES   = ["speed_1", "speed_2"];
const CAPACITY_UPGRADES = ["capacity_1", "capacity_2"];
const CARE_UPGRADES    = ["care_1", "care_2"];

function moodColor(mood) {
  if (mood >= 80) return "#4ade80";
  if (mood >= 50) return "#f59e0b";
  return "#ef4444";
}
function moodEmoji(mood) {
  if (mood >= 80) return "😊";
  if (mood >= 50) return "😐";
  return "😟";
}
function getAnimalCost(animalId, owned) {
  const type = ANIMAL_DEFS[animalId];
  return Math.round(type.baseCost * Math.pow(type.costMultiplier, owned));
}

// ─── Animal card ──────────────────────────────────────────────────────────────

function AnimalCard({ animal, animalType, index, game, onCollect, onInteract, onUpgradeStorage, onUpgradeYield }) {
  const [showUpgrades, setShowUpgrades] = useState(false);
  const mood = animal.mood ?? 100;
  const stock = animal.stock ?? 0;
  const stockMax = getAnimalStockMax(animal);
  const isFull = stock >= stockMax;
  const nextUpgrade = getAnimalStorageUpgradeCost(animal);
  const canAffordUpgrade = nextUpgrade && (game.cash ?? 0) >= nextUpgrade.cost;
  const cooldown = animal.interactCooldown ?? 0;
  const canInteract = cooldown <= 0;
  const stockPct = Math.min(100, (stock / stockMax) * 100);
  const progressPct = Math.min(100, ((animal.readyTick ?? 0) / animalType.cycleSeconds) * 100);

  return (
    <div style={{
      background: "var(--bg)", borderRadius: "12px", padding: "0.75rem",
      border: `1px solid ${isFull ? "rgba(239,68,68,0.4)" : stock > 0 ? "rgba(251,191,36,0.4)" : "var(--border)"}`,
      position: "relative",
    }}>
      {isFull && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "12px",
          border: "2px solid #ef4444",
          animation: "rw-pulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
        <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{animalType.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
              {animalType.name} #{index + 1}
              {(animal.storageLevel ?? 0) > 0 && (
  <span style={{ marginLeft: "0.3rem", fontSize: "0.6rem", color: "#f59e0b" }}>
    {"⭐".repeat(animal.storageLevel)}
  </span>
)}
{(animal.yieldLevel ?? 0) > 0 && (
  <span style={{ marginLeft: "0.3rem", fontSize: "0.6rem", color: "#a6e3a1" }}>
    {"🥚".repeat(animal.yieldLevel)}
  </span>
)}
            </span>
            <span style={{ fontSize: "0.68rem", color: moodColor(mood), fontWeight: 600 }}>
              {moodEmoji(mood)} {Math.round(mood)}%
            </span>
          </div>
          <div style={{ fontSize: "0.62rem", color: isFull ? "#ef4444" : "var(--muted)", marginTop: "0.1rem", fontWeight: isFull ? 600 : 400 }}>
            {isFull
              ? "⚠ Full! Mood draining fast"
              : stock > 0
                ? `${animalType.produceEmoji} ${stock} ready · next in ${Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s`
                : `${animalType.produceEmoji} next in ${Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s`}
          </div>
        </div>
      </div>

      {/* Mood bar */}
      <div style={{ height: "3px", background: "var(--border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.25rem" }}>
        <div style={{ height: "100%", width: `${mood}%`, background: moodColor(mood), borderRadius: "999px", transition: "width 0.5s" }} />
      </div>

      {/* Stock bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
        <div style={{ flex: 1, height: "5px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${stockPct}%`,
            background: isFull ? "#ef4444" : stock > 0 ? "#f59e0b" : "rgba(99,102,241,0.4)",
            borderRadius: "999px", transition: "width 0.5s",
          }} />
        </div>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", flexShrink: 0 }}>{stock}/{stockMax}</span>
      </div>

      {/* Production progress (when stock empty) */}
      {/* Production countdown bar — always visible */}
<div style={{ marginBottom: "0.35rem" }}>
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "var(--muted)", marginBottom: "0.15rem" }}>
    <span>⏱ Next {animalType.produceName}</span>
    <span>{Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s</span>
  </div>
  <div style={{ height: "3px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
    <div style={{
      height: "100%",
      width: `${Math.min(100, ((animal.readyTick ?? 0) / animalType.cycleSeconds) * 100)}%`,
      background: isFull ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.5)",
      borderRadius: "999px",
      transition: "width 1s linear",
    }} />
  </div>
</div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "0.35rem" }}>
        {stock > 0 && (
          <button
            onClick={() => onCollect(animal.id)}
            style={{
              flex: 2, fontSize: "0.7rem", fontWeight: 700,
              padding: "0.28rem 0.4rem", borderRadius: "8px", cursor: "pointer",
              background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24",
            }}
          >
            {animalType.produceEmoji} Collect {stock}
          </button>
        )}
        <button
          onClick={() => canInteract && onInteract(animal.id)}
          disabled={!canInteract}
          style={{
            flex: 1, fontSize: "0.68rem", padding: "0.28rem 0.4rem", borderRadius: "8px",
            background: canInteract ? "rgba(99,102,241,0.1)" : "var(--bg)",
            border: `1px solid ${canInteract ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
            color: canInteract ? "var(--accent)" : "var(--muted)",
            cursor: canInteract ? "pointer" : "default", opacity: canInteract ? 1 : 0.5,
          }}
        >
          {canInteract ? "💝 +25%" : `💝 ${Math.ceil(cooldown)}s`}
        </button>
        <button
          onClick={() => setShowUpgrades((v) => !v)}
          style={{
            fontSize: "0.68rem", padding: "0.28rem 0.45rem", borderRadius: "8px", cursor: "pointer",
            background: showUpgrades ? "var(--accent)" : "var(--bg)",
            border: `1px solid ${showUpgrades ? "var(--accent)" : "var(--border)"}`,
            color: showUpgrades ? "#fff" : "var(--muted)",
          }}
        >
          ⭐
        </button>
      </div>

      {/* Storage upgrades */}
      {showUpgrades && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
          
          {/* Storage */}
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
            📦 Storage Upgrades
          </div>
          {ANIMAL_STORAGE_UPGRADES.map((upgrade) => {
            const owned = (animal.storageLevel ?? 0) >= upgrade.level;
            const isNext = (animal.storageLevel ?? 0) === upgrade.level - 1;
            const canAfford = (game.cash ?? 0) >= upgrade.cost;
            return (
              <div key={upgrade.level} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.3rem 0.45rem", borderRadius: "6px", marginBottom: "0.25rem",
                background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
                border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                opacity: !owned && !isNext ? 0.4 : 1,
              }}>
                <div style={{ fontSize: "0.68rem" }}>
                  <span style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>
                    {owned ? "✓" : "📦"} {upgrade.label}
                  </span>
                  <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>
                    max {upgrade.maxStock} items
                  </span>
                </div>
                {!owned && isNext && (
                  <button
                    onClick={() => canAfford && onUpgradeStorage(animal.id)}
                    disabled={!canAfford}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", opacity: canAfford ? 1 : 0.5 }}
                  >
                    ${upgrade.cost}
                  </button>
                )}
              </div>
            );
          })}

          {/* Yield */}
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem", marginTop: "0.5rem" }}>
            🥚 Yield Upgrades
          </div>
          {ANIMAL_YIELD_UPGRADES.map((upgrade) => {
            const owned = (animal.yieldLevel ?? 0) >= upgrade.level;
            const isNext = (animal.yieldLevel ?? 0) === upgrade.level - 1;
            const canAfford = (game.cash ?? 0) >= upgrade.cost;
            return (
              <div key={upgrade.level} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.3rem 0.45rem", borderRadius: "6px", marginBottom: "0.25rem",
                background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
                border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                opacity: !owned && !isNext ? 0.4 : 1,
              }}>
                <div style={{ fontSize: "0.68rem" }}>
                  <span style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>
                    {owned ? "✓" : "🥚"} {upgrade.label}
                  </span>
                  <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>
  +{upgrade.bonusYield} per {animalType.produceName.toLowerCase()}
</span>
                </div>
                {!owned && isNext && (
                  <button
                    onClick={() => canAfford && onUpgradeYield(animal.id)}
                    disabled={!canAfford}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", opacity: canAfford ? 1 : 0.5 }}
                  >
                    ${upgrade.cost}
                   </button>
                )}
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}       
// ─── Animal section ───────────────────────────────────────────────────────────

function AnimalSection({ animalId, game, onBuyAnimal, onCollect, onInteract, onUpgradeStorage, onUpgradeYield }) {
  const [open, setOpen] = useState(true);
  const type = ANIMAL_DEFS[animalId];
  const owned = game.animals?.[animalId] ?? [];
  const count = owned.length;
  const nextCost = getAnimalCost(animalId, count);
  const atMax = count >= MAX_PER_TYPE;
  const canAfford = (game.cash ?? 0) >= nextCost;
  const seasonOk = (game.season ?? 1) >= type.unlockSeason;

  if (!seasonOk) {
    return (
      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem", opacity: 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>{type.emoji}</span>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>🔒 {type.name}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>Unlocks Season {type.unlockSeason}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 0.85rem", background: "none", border: "none", cursor: "pointer",
          borderBottom: open ? "1px solid var(--border)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.4rem" }}>{type.emoji}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
              {type.name}s
              <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 400 }}>
                ({count}/{MAX_PER_TYPE})
              </span>
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
              {type.produceEmoji} {type.produceName} · +{type.foodPulseCost} food/pulse each
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {!atMax && (
            <button
              onClick={(e) => { e.stopPropagation(); onBuyAnimal(animalId); }}
              disabled={!canAfford}
              style={{
                fontSize: "0.68rem", padding: "0.2rem 0.55rem", borderRadius: "8px",
                cursor: canAfford ? "pointer" : "default",
                background: canAfford ? "var(--accent)" : "var(--bg)",
                border: `1px solid ${canAfford ? "var(--accent)" : "var(--border)"}`,
                color: canAfford ? "#fff" : "var(--muted)", fontWeight: 600,
              }}
            >
              +${nextCost}
            </button>
          )}
          {atMax && <span style={{ fontSize: "0.62rem", color: "#4ade80" }}>Max</span>}
          <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0.75rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {count === 0 ? (
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>{type.description}</div>
              <button onClick={() => onBuyAnimal(animalId)} disabled={!canAfford} className="btn" style={{ fontSize: "0.75rem", opacity: canAfford ? 1 : 0.5 }}>
                {canAfford ? `Buy first ${type.name} — $${nextCost}` : `Need $${nextCost}`}
              </button>
            </div>
          ) : (
            <>
              {owned.map((animal, idx) => (
                <AnimalCard
                  key={animal.id}
                  animal={animal}
                  animalType={type}
                  index={idx}
                  game={game}
                  onCollect={(instanceId) => onCollect(animalId, instanceId)}
                  onInteract={(instanceId) => onInteract(animalId, instanceId)}
                  onUpgradeStorage={(instanceId) => onUpgradeStorage(animalId, instanceId)}
                  onUpgradeYield={(instanceId) => onUpgradeYield(animalId, instanceId)}
                />
              ))}
              <div style={{
                fontSize: "0.65rem", color: "var(--muted)",
                background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "6px", padding: "0.35rem 0.6rem",
              }}>
                🍞 These {count} {type.name.toLowerCase()}s add <strong style={{ color: "var(--text)" }}>+{count * type.foodPulseCost}</strong> to your town food pulse cost
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Barn worker upgrade tree ─────────────────────────────────────────────────

function BarnWorkerUpgradeTree({ label, upgradeIds, worker, game, onUpgrade }) {
  const upgrades = worker.upgrades ?? [];
  return (
    <div>
      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.3rem" }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {upgradeIds.map((uid) => {
          const u = BARN_WORKER_UPGRADES[uid];
          const owned = upgrades.includes(uid);
          const requiresMet = !u.requires || upgrades.includes(u.requires);
          const canAfford = (game.cash ?? 0) >= u.cost;
          const canBuy = !owned && requiresMet && canAfford;
          const locked = !owned && !requiresMet;
          return (
            <div key={uid} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.28rem 0.45rem", borderRadius: "6px",
              background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
              border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
              opacity: locked ? 0.4 : 1,
            }}>
              <div style={{ fontSize: "0.68rem" }}>
                <span style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>
                  {owned ? "✓" : locked ? "🔒" : u.emoji} {u.name}
                </span>
                <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>{u.description}</span>
              </div>
              {!owned && (
                <button
                  onClick={() => canBuy && onUpgrade(worker.id, uid)}
                  disabled={!canBuy}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", marginLeft: "0.4rem", flexShrink: 0, opacity: canBuy ? 1 : 0.5 }}
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

// ─── Barn worker card ─────────────────────────────────────────────────────────

function BarnWorkerCard({ worker, game, index, onFire, onReassign, onUpgrade }) {
  const [confirmFire, setConfirmFire] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const type = ANIMAL_DEFS[worker.animalType];
  const animals = game.animals?.[worker.animalType] ?? [];
  const totalStock = animals.reduce((s, a) => s + (a.stock ?? 0), 0);
  const avgMood = animals.length > 0
    ? Math.round(animals.reduce((s, a) => s + (a.mood ?? 100), 0) / animals.length)
    : null;
  const interval = getBarnWorkerInterval(worker);
  const capacity = getBarnWorkerCapacity(worker);
  const careInterval = getBarnWorkerCareInterval(worker);
  const hireCost = getBarnWorkerHireCost(game);
  const upgrades = worker.upgrades ?? [];

  return (
    <div style={{
      background: "var(--bg-elev)", border: "1px solid var(--border)",
      borderRadius: "12px", fontSize: "0.82rem", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "0.65rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🧑‍🌾</span>
          <div>
            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.78rem" }}>
              Farmhand {index + 1}
              {upgrades.length > 0 && (
                <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", color: "var(--muted)" }}>
                  {upgrades.map((u) => BARN_WORKER_UPGRADES[u]?.emoji).join("")}
                </span>
              )}
              <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 400 }}>
                → {type?.emoji} {type?.name}s
              </span>
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>
              Collects {capacity} every {interval}s
              {careInterval && ` · boosts mood every ${careInterval}s`}
              {animals.length > 0 && ` · ${totalStock} in stock · avg mood ${avgMood}%`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button
            onClick={() => setShowUpgrades((v) => !v)}
            style={{
              fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "6px", cursor: "pointer",
              background: showUpgrades ? "var(--accent)" : "var(--bg)",
              border: `1px solid ${showUpgrades ? "var(--accent)" : "var(--border)"}`,
              color: showUpgrades ? "#fff" : "var(--muted)",
            }}
          >
            ⚡ Upgrades
          </button>
        </div>
      </div>

      {/* Upgrade trees */}
      {showUpgrades && (
        <div style={{ padding: "0.6rem 0.85rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.6rem", background: "var(--bg)" }}>
          <BarnWorkerUpgradeTree label="⚡ Speed"    upgradeIds={SPEED_UPGRADES}    worker={worker} game={game} onUpgrade={onUpgrade} />
          <BarnWorkerUpgradeTree label="📦 Capacity" upgradeIds={CAPACITY_UPGRADES} worker={worker} game={game} onUpgrade={onUpgrade} />
          <BarnWorkerUpgradeTree label="💝 Care"     upgradeIds={CARE_UPGRADES}     worker={worker} game={game} onUpgrade={onUpgrade} />
        </div>
      )}

      {/* Reassign / fire */}
      <div style={{ padding: "0.5rem 0.85rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.4rem" }}>
        <button
          onClick={() => setShowReassign((v) => !v)}
          style={{
            flex: 1, fontSize: "0.68rem", padding: "0.25rem 0.5rem", borderRadius: "8px", cursor: "pointer",
            background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)",
          }}
        >
          {showReassign ? "▲ Cancel" : "↔ Reassign"}
        </button>
        {!confirmFire ? (
          <button
            onClick={() => setConfirmFire(true)}
            style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem", borderRadius: "8px", cursor: "pointer", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            Fire
          </button>
        ) : (
          <>
            <button onClick={() => { onFire(worker.id); setConfirmFire(false); }} style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem", borderRadius: "8px", cursor: "pointer", background: "#ef4444", border: "none", color: "#fff", fontWeight: 600 }}>Confirm</button>
            <button onClick={() => setConfirmFire(false)} style={{ fontSize: "0.68rem", padding: "0.25rem 0.5rem", borderRadius: "8px", cursor: "pointer", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>Cancel</button>
          </>
        )}
      </div>

      {/* Reassign picker */}
      {showReassign && (
        <div style={{ padding: "0.5rem 0.85rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.35rem" }}>
          {ANIMAL_TYPE_ORDER.map((id) => {
            const def = ANIMAL_DEFS[id];
            const active = worker.animalType === id;
            return (
              <button key={id} onClick={() => { onReassign(worker.id, id); setShowReassign(false); }} style={{ flex: 1, padding: "0.3rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: active ? 700 : 400, background: active ? "var(--accent)" : "var(--bg)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, color: active ? "#fff" : "var(--text)" }}>
                {def.emoji} {def.name}s
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Barn workers section ─────────────────────────────────────────────────────

function BarnWorkersSection({ game, onHireBarnWorker, onFireBarnWorker, onReassignBarnWorker, onUpgradeBarnWorker }) {
  const [open, setOpen] = useState(true);
  const [showHire, setShowHire] = useState(false);
  const barnWorkers = game.barnWorkers ?? [];
  const hireCost = getBarnWorkerHireCost(game);
  const atCap = Math.floor(game.town?.people ?? 0) <= (
    (game.workers ?? []).length + (game.kitchenWorkers ?? []).length +
    (game.marketWorkers ?? []).length + barnWorkers.length
  );
  const canAfford = (game.cash ?? 0) >= hireCost;
  const canHire = !atCap && canAfford;

  return (
  <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "0.65rem" }}>
    <button
      onClick={() => setOpen((v) => !v)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.65rem 0.85rem", background: "none", border: "none", cursor: "pointer",
        borderBottom: open ? "1px solid var(--border)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
              🧑‍🌾 Farmhands
              <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 400 }}>({barnWorkers.length})</span>
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>Auto-collect produce · upgradeable</div>
          </div>
          <button
  onClick={(e) => { e.stopPropagation(); canHire && setShowHire((v) => !v); }}
            style={{
              fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "8px",
              cursor: canHire ? "pointer" : "default",
              background: canHire ? "var(--accent)" : "var(--bg)",
              border: `1px solid ${canHire ? "var(--accent)" : "var(--border)"}`,
              color: canHire ? "#fff" : "var(--muted)",
              opacity: atCap ? 0.5 : 1,
            }}
          >
            {atCap ? "Town full" : `+ Hire $${hireCost}`}
          </button>
        </div>
      <span style={{ fontSize: "0.62rem", color: "var(--muted)", marginLeft: "0.5rem" }}>{open ? "▲" : "▼"}</span>
    </button>

      {open && showHire && !atCap && (
        <div style={{ padding: "0.65rem 0.85rem", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.4rem" }}>Assign to which animal type?</div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {ANIMAL_TYPE_ORDER.map((id) => {
              const def = ANIMAL_DEFS[id];
              const seasonOk = (game.season ?? 1) >= def.unlockSeason;
              const animalCount = (game.animals?.[id] ?? []).length;
              return (
                <button
                  key={id}
                  onClick={() => { if (canAfford && seasonOk) { onHireBarnWorker(id); setShowHire(false); } }}
                  disabled={!canAfford || !seasonOk}
                  style={{
                    flex: 1, padding: "0.5rem 0.3rem", borderRadius: "8px",
                    cursor: canAfford && seasonOk ? "pointer" : "default",
                    background: canAfford && seasonOk ? "rgba(99,102,241,0.1)" : "var(--bg)",
                    border: `1px solid ${canAfford && seasonOk ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                    color: canAfford && seasonOk ? "var(--accent)" : "var(--muted)",
                    opacity: seasonOk ? 1 : 0.4, fontSize: "0.72rem", textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.2rem" }}>{def.emoji}</div>
                  <div style={{ fontWeight: 600 }}>{def.name}s</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{!seasonOk ? `S${def.unlockSeason}` : `${animalCount} owned`}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {open && barnWorkers.length > 0 && (
        <div style={{ padding: "0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {barnWorkers.map((w, idx) => (
            <BarnWorkerCard
              key={w.id} worker={w} game={game} index={idx}
              onFire={onFireBarnWorker} onReassign={onReassignBarnWorker} onUpgrade={onUpgradeBarnWorker}
            />
          ))}
        </div>
      )}

      {open && barnWorkers.length === 0 && !showHire && (
        <div style={{ padding: "0.5rem 0.85rem 0.65rem", fontSize: "0.72rem", color: "var(--muted)" }}>
          No farmhands hired. They auto-collect produce and can be upgraded.
        </div>
      )}
    </div>
  );
}

// ─── Pet card ─────────────────────────────────────────────────────────────────

function PetCard({ petId, game, onBuyPet, onInteractPet }) {
  const type = PET_DEFS[petId];
  const pet = game.pets?.[petId];
  const owned = !!pet;
  const mood = pet?.mood ?? 0;
  const cooldown = pet?.interactCooldown ?? 0;
  const canInteract = owned && cooldown <= 0;
  const canAfford = (game.cash ?? 0) >= type.cost;
  const bonusActive = owned && mood >= 50;

  return (
    <div style={{ background: "var(--bg-elev)", border: `1px solid ${bonusActive ? "rgba(74,222,128,0.3)" : "var(--border)"}`, borderRadius: "12px", padding: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{ fontSize: "2rem", lineHeight: 1 }}>{type.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{type.name}</div>
            {owned && <div style={{ fontSize: "0.65rem", color: moodColor(mood), fontWeight: 600 }}>{moodEmoji(mood)} {Math.round(mood)}%</div>}
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem", lineHeight: 1.4 }}>{type.bonus}</div>
          {owned && <div style={{ fontSize: "0.62rem", marginTop: "0.2rem", color: bonusActive ? "#4ade80" : "#f59e0b" }}>{bonusActive ? "✓ Bonus active" : "⚠ Unhappy — bonus paused"}</div>}
        </div>
      </div>
      {owned && (
        <div style={{ marginTop: "0.5rem" }}>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.4rem" }}>
            <div style={{ height: "100%", width: `${mood}%`, background: moodColor(mood), borderRadius: "999px", transition: "width 0.5s" }} />
          </div>
          <button onClick={() => canInteract && onInteractPet(petId)} disabled={!canInteract} style={{ width: "100%", fontSize: "0.7rem", padding: "0.28rem 0.5rem", borderRadius: "8px", background: canInteract ? "rgba(99,102,241,0.1)" : "var(--bg)", border: `1px solid ${canInteract ? "rgba(99,102,241,0.4)" : "var(--border)"}`, color: canInteract ? "var(--accent)" : "var(--muted)", cursor: canInteract ? "pointer" : "default", opacity: canInteract ? 1 : 0.5 }}>
            {canInteract ? "💝 Play (+30% mood)" : `💝 ${Math.ceil(cooldown)}s`}
          </button>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.25rem" }}>Eats 🌾{type.foodCostPerPulse} per town pulse</div>
        </div>
      )}
      {!owned && (
        <button onClick={() => onBuyPet(petId)} disabled={!canAfford} className="btn w-full" style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", marginTop: "0.5rem", opacity: canAfford ? 1 : 0.5 }}>
          {canAfford ? `Adopt ${type.name} — $${type.cost}` : `Need $${type.cost}`}
        </button>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BarnZone({
  game, onBuyAnimal, onCollectAnimal, onCollectAll, onInteractAnimal,
  onBuyPet, onInteractPet, onHireBarnWorker, onFireBarnWorker,
  onReassignBarnWorker, onUpgradeBarnWorker, onUpgradeAnimalStorage,
  onUpgradeAnimalYield,
}) {
  const [subTab, setSubTab] = useState("barn");

  const totalAnimalFood = Object.entries(game.animals ?? {}).reduce((sum, [id, arr]) => sum + (ANIMAL_DEFS[id] ? arr.length * ANIMAL_DEFS[id].foodPulseCost : 0), 0);
  const totalPetFood = Object.keys(game.pets ?? {}).reduce((sum, id) => sum + (PET_DEFS[id] ? PET_DEFS[id].foodCostPerPulse : 0), 0);
  const totalFood = totalAnimalFood + totalPetFood;
  const totalStock = Object.values(game.animals ?? {}).reduce((s, arr) => s + arr.reduce((a, an) => a + (an.stock ?? 0), 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "flex", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg)" }}>
        {[{ id: "barn", label: "🐔 Animals" }, { id: "pets", label: "🐾 Pets" }].map((tab) => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{ flex: 1, padding: "0.5rem", fontSize: "0.78rem", fontWeight: subTab === tab.id ? 700 : 400, background: subTab === tab.id ? "var(--accent)" : "none", border: "none", cursor: "pointer", color: subTab === tab.id ? "#fff" : "var(--muted)" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {totalFood > 0 && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "0.6rem 0.85rem", fontSize: "0.72rem" }}>
          🍞 Animals & pets add <strong style={{ color: "#ef4444" }}>+{totalFood}</strong> to town food pulse cost
        </div>
      )}

      {subTab === "barn" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <BarnWorkersSection
            game={game}
            onHireBarnWorker={onHireBarnWorker}
            onFireBarnWorker={onFireBarnWorker}
            onReassignBarnWorker={onReassignBarnWorker}
            onUpgradeBarnWorker={onUpgradeBarnWorker}
          />
          {totalStock > 1 && (
            <button onClick={onCollectAll} style={{ width: "100%", padding: "0.5rem", borderRadius: "10px", cursor: "pointer", background: "rgba(251,191,36,0.15)", border: "2px solid rgba(251,191,36,0.5)", color: "#fbbf24", fontSize: "0.8rem", fontWeight: 700 }}>
              🧺 Collect All ({totalStock} items ready)
            </button>
          )}
          {ANIMAL_TYPE_ORDER.map((animalId) => (
            <AnimalSection
              key={animalId} animalId={animalId} game={game}
              onBuyAnimal={onBuyAnimal} onCollect={onCollectAnimal}
              onInteract={onInteractAnimal} onUpgradeStorage={onUpgradeAnimalStorage} onUpgradeYield={onUpgradeAnimalYield}
            />
          ))}
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.65rem 0.85rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.4rem" }}>RAW SELL RATES</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[{ e: "🥚", l: "Egg", v: 5 }, { e: "🥛", l: "Milk", v: 15 }, { e: "🧶", l: "Wool", v: 25 }].map(({ e, l, v }) => (
                <div key={l} style={{ fontSize: "0.7rem", background: "var(--bg-elev)", borderRadius: "6px", padding: "0.2rem 0.5rem", border: "1px solid var(--border)" }}>
                  {e} <strong>${v}</strong> <span style={{ color: "var(--muted)", fontSize: "0.62rem" }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.35rem" }}>
              Craft in Crafting for more: 🥚→🍳 $40 · 🥛→🧀 $60 · 🧶→🧥 $90
            </div>
          </div>
        </div>
      )}

      {subTab === "pets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>Pets give passive bonuses when mood is above 50%. Play with them to keep them happy.</div>
          {Object.keys(PET_DEFS).map((petId) => (
            <PetCard key={petId} petId={petId} game={game} onBuyPet={onBuyPet} onInteractPet={onInteractPet} />
          ))}
        </div>
      )}
    </div>
  );
}