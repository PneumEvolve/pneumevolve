import React, { useState, useEffect, useRef } from "react";
import {
  BARN_WORKER_UPGRADES, ANIMAL_STORAGE_UPGRADES,
  BARN_WORKER_BASE_INTERVAL, ANIMAL_BASE_STOCK_MAX, ANIMAL_YIELD_UPGRADES,
  BARN_BUILDINGS, BARN_BUILDING_ORDER, BARN_BUILDING_TIERS,
} from "../gameConstants";
import {
  getBarnWorkerHireCost, getBarnWorkerInterval,
  getBarnWorkerCapacity, getBarnWorkerCareInterval,
  getBarnWorkerCareMood, getAnimalStockMax,
  getAnimalStorageUpgradeCost,
  getBarnBuilding, getBarnBuildingTierData,
  getBarnBuildingAnimalSlots, getBarnBuildingWorkerSlots,
  getBarnInstanceAnimalSlots, getBarnInstanceWorkerSlots,
  canBuildBarnBuilding, canUpgradeBarnBuilding,
  getAvailableWorkerSlots, isTownBuildingBuilt, hasSchoolResearch,
} from "../gameEngine";
 
const ANIMAL_DEFS = {
  chicken: { id: "chicken", name: "Chicken", emoji: "🐔", baseCost: 300, costMultiplier: 1.8, produces: "egg",  produceName: "Egg",  produceEmoji: "🥚", cycleSeconds: 60,  rawValue: 5  },
  cow:     { id: "cow",     name: "Cow",     emoji: "🐄", baseCost: 800, costMultiplier: 1.6, produces: "milk", produceName: "Milk", produceEmoji: "🥛", cycleSeconds: 120, rawValue: 15 },
  sheep:   { id: "sheep",   name: "Sheep",   emoji: "🐑", baseCost: 1500, costMultiplier: 1.5, produces: "wool", produceName: "Wool", produceEmoji: "🧶", cycleSeconds: 180, rawValue: 25 },
};
 
const PET_DEFS = {
  dog:    { id: "dog",    name: "Dog",    emoji: "🐕", cost: 400, bonus: "Slows mood decay on all barn animals by 30%.", foodCostPerPulse: 1 },
  cat:    { id: "cat",    name: "Cat",    emoji: "🐈", cost: 400, bonus: "Widens the fishing needle sweet spot by 20%.", foodCostPerPulse: 1 },
  rabbit: { id: "rabbit", name: "Rabbit", emoji: "🐇", cost: 400, bonus: "+5% town satisfaction while happy.",          foodCostPerPulse: 1 },
};
 
const SPEED_UPGRADES    = ["speed_1", "speed_2"];
const CAPACITY_UPGRADES = ["capacity_1", "capacity_2"];
const CARE_UPGRADES     = ["care_1", "care_2"];
 
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
    <div style={{
      background: "var(--bg)", border: `1px solid ${bonusActive ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
      borderRadius: "12px", padding: "0.75rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{ fontSize: "2rem", lineHeight: 1 }}>{type.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{type.name}</div>
            {owned && <div style={{ fontSize: "0.65rem", color: moodColor(mood), fontWeight: 600 }}>{moodEmoji(mood)} {Math.round(mood)}%</div>}
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem", lineHeight: 1.4 }}>{type.bonus}</div>
          {owned && (
            <div style={{ fontSize: "0.62rem", marginTop: "0.2rem", color: bonusActive ? "#4ade80" : "#f59e0b" }}>
              {bonusActive ? "✓ Bonus active" : "⚠ Unhappy — bonus paused"}
            </div>
          )}
        </div>
      </div>
      {owned && (
        <div style={{ marginTop: "0.5rem" }}>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.4rem" }}>
            <div style={{ height: "100%", width: `${mood}%`, background: moodColor(mood), borderRadius: "999px", transition: "width 0.5s" }} />
          </div>
          <button
            onClick={() => canInteract && onInteractPet(petId)}
            disabled={!canInteract}
            style={{
              width: "100%", fontSize: "0.7rem", padding: "0.28rem 0.5rem", borderRadius: "8px",
              background: canInteract ? "rgba(99,102,241,0.1)" : "var(--bg)",
              border: `1px solid ${canInteract ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
              color: canInteract ? "var(--accent)" : "var(--muted)",
              cursor: canInteract ? "pointer" : "default", opacity: canInteract ? 1 : 0.5,
            }}
          >
            {canInteract ? "💝 Play (+30% mood)" : `💝 ${Math.ceil(cooldown)}s`}
          </button>
          <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.25rem" }}>
            Eats 🌾{type.foodCostPerPulse} per town pulse
          </div>
        </div>
      )}
      {!owned && (
        <button onClick={() => onBuyPet(petId)} disabled={!canAfford} className="btn w-full"
          style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", marginTop: "0.5rem", opacity: canAfford ? 1 : 0.5 }}>
          {canAfford ? `Adopt ${type.name} — $${type.cost}` : `Need $${type.cost}`}
        </button>
      )}
    </div>
  );
}
 
// ─── Pets row (pinned above tabs) ─────────────────────────────────────────────
 
function PetsRow({ game, onBuyPet, onInteractPet }) {
  const [expanded, setExpanded] = useState(false);
  const ownedPets = Object.keys(game.pets ?? {});
  const petCount = ownedPets.length;
  const needyPets = ownedPets.filter((id) => (game.pets[id]?.mood ?? 0) < 50).length;
 
  return (
    <div style={{
      background: "var(--bg-elev)", border: `1px solid ${needyPets > 0 ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
      borderRadius: "12px", overflow: "hidden", marginBottom: "0.65rem",
    }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.6rem 0.85rem", background: "none", border: "none", cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.1rem" }}>🐾</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
              Pets
              {petCount > 0 && (
                <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 400 }}>
                  {petCount}/3 adopted
                </span>
              )}
              {needyPets > 0 && (
                <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "#f59e0b", fontWeight: 600 }}>
                  ⚠ {needyPets} unhappy
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
              {petCount === 0
                ? "Adopt pets for passive bonuses"
                : ownedPets.map((id) => PET_DEFS[id]?.emoji).join(" ")}
            </div>
          </div>
        </div>
        <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={{ padding: "0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.1rem" }}>
            Pets give passive bonuses when mood is above 50%. Play with them to keep them happy.
          </div>
          {Object.keys(PET_DEFS).map((petId) => (
            <PetCard key={petId} petId={petId} game={game} onBuyPet={onBuyPet} onInteractPet={onInteractPet} />
          ))}
        </div>
      )}
    </div>
  );
}
 
// ─── Animal card ──────────────────────────────────────────────────────────────
 
function AnimalCard({ animal, animalType, index, game, onCollect, onInteract, onUpgradeStorage, onUpgradeYield }) {
  const [showUpgrades, setShowUpgrades] = useState(false);
  const mood = animal.mood ?? 100;
  const stock = animal.stock ?? 0;
  const stockMax = getAnimalStockMax(animal);
  const isFull = stock >= stockMax;
  const cooldown = animal.interactCooldown ?? 0;
  const canInteract = cooldown <= 0;
  const stockPct = Math.min(100, (stock / stockMax) * 100);
 
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
        <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{animalType.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
              {animalType.name} #{index + 1}
              {(animal.storageLevel ?? 0) > 0 && (
                <span style={{ marginLeft: "0.3rem", fontSize: "0.6rem", color: "#f59e0b" }}>{"⭐".repeat(animal.storageLevel)}</span>
              )}
              {(animal.yieldLevel ?? 0) > 0 && (
                <span style={{ marginLeft: "0.3rem", fontSize: "0.6rem", color: "#a6e3a1" }}>{"🥚".repeat(animal.yieldLevel)}</span>
              )}
            </span>
            <span style={{ fontSize: "0.68rem", color: moodColor(mood), fontWeight: 600 }}>{mood <= 0 ? "💀 0%" : `${moodEmoji(mood)} ${Math.round(mood)}%`}</span>
          </div>
          <div style={{ fontSize: "0.62rem", color: isFull ? "#ef4444" : "var(--muted)", marginTop: "0.1rem", fontWeight: isFull ? 600 : 400 }}>
            {isFull ? "⚠ Full! Mood draining fast"
              : stock > 0 ? `${animalType.produceEmoji} ${stock} ready · next in ${Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s`
              : `${animalType.produceEmoji} next in ${Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s`}
          </div>
        </div>
      </div>
 
      {mood <= 0 ? (
        /* ── DYING countdown bar ── */
        (() => {
          const zeroTicks = animal.zeroMoodTicks ?? 0;
          const remaining = Math.max(0, 180 - zeroTicks);
          const pct = (remaining / 180) * 100;
          return (
            <div style={{ marginBottom: "0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#ef4444", animation: "rw-pulse 1s ease-in-out infinite", letterSpacing: "0.05em" }}>
                  💀 DYING
                </span>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#ef4444" }}>
                  {remaining}s left
                </span>
              </div>
              <div style={{ height: "6px", background: "rgba(239,68,68,0.15)", borderRadius: "999px", overflow: "hidden", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: "linear-gradient(90deg, #7f1d1d, #ef4444)",
                  borderRadius: "999px",
                  transition: "width 1s linear",
                  boxShadow: "0 0 6px rgba(239,68,68,0.6)",
                }} />
              </div>
            </div>
          );
        })()
      ) : (
        <div style={{ height: "3px", background: "var(--border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.25rem" }}>
          <div style={{ height: "100%", width: `${mood}%`, background: moodColor(mood), borderRadius: "999px", transition: "width 0.5s" }} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
        <div style={{ flex: 1, height: "5px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${stockPct}%`, background: isFull ? "#ef4444" : stock > 0 ? "#f59e0b" : "rgba(99,102,241,0.4)", borderRadius: "999px", transition: "width 0.5s" }} />
        </div>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", flexShrink: 0 }}>{stock}/{stockMax}</span>
      </div>
      <div style={{ marginBottom: "0.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "var(--muted)", marginBottom: "0.15rem" }}>
          <span>⏱ Next {animalType.produceName}</span>
          <span>{Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s</span>
        </div>
        <div style={{ height: "3px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, ((animal.readyTick ?? 0) / animalType.cycleSeconds) * 100)}%`, background: isFull ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.5)", borderRadius: "999px", transition: "width 1s linear" }} />
        </div>
      </div>
 
      <div style={{ display: "flex", gap: "0.35rem" }}>
        {stock > 0 && (
          <button onClick={() => onCollect(animal.id)} style={{ flex: 2, fontSize: "0.7rem", fontWeight: 700, padding: "0.28rem 0.4rem", borderRadius: "8px", cursor: "pointer", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24" }}>
            {animalType.produceEmoji} Collect {stock}
          </button>
        )}
        <button onClick={() => canInteract && onInteract(animal.id)} disabled={!canInteract} style={{ flex: 1, fontSize: "0.68rem", padding: "0.28rem 0.4rem", borderRadius: "8px", background: canInteract ? "rgba(99,102,241,0.1)" : "var(--bg)", border: `1px solid ${canInteract ? "rgba(99,102,241,0.4)" : "var(--border)"}`, color: canInteract ? "var(--accent)" : "var(--muted)", cursor: canInteract ? "pointer" : "default", opacity: canInteract ? 1 : 0.5 }}>
          {canInteract ? "💝 +25%" : `💝 ${Math.ceil(cooldown)}s`}
        </button>
        <button onClick={() => setShowUpgrades((v) => !v)} style={{ fontSize: "0.68rem", padding: "0.28rem 0.45rem", borderRadius: "8px", cursor: "pointer", background: showUpgrades ? "var(--accent)" : "var(--bg)", border: `1px solid ${showUpgrades ? "var(--accent)" : "var(--border)"}`, color: showUpgrades ? "#fff" : "var(--muted)" }}>⭐</button>
      </div>
 
      {showUpgrades && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>📦 Storage</div>
          {ANIMAL_STORAGE_UPGRADES.map((upgrade) => {
            const owned = (animal.storageLevel ?? 0) >= upgrade.level;
            const isNext = (animal.storageLevel ?? 0) === upgrade.level - 1;
            const canAfford = (game.cash ?? 0) >= upgrade.cost;
            return (
              <div key={upgrade.level} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0.45rem", borderRadius: "6px", marginBottom: "0.25rem", background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)", border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : "var(--border)"}`, opacity: !owned && !isNext ? 0.4 : 1 }}>
                <div style={{ fontSize: "0.68rem" }}>
                  <span style={{ fontWeight: 600, color: owned ? "#4ade80" : "var(--text)" }}>{owned ? "✓" : "📦"} {upgrade.label}</span>
                  <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>max {upgrade.maxStock}</span>
                </div>
                {!owned && isNext && (
                  <button onClick={() => canAfford && onUpgradeStorage(animal.id)} disabled={!canAfford} className="btn btn-secondary" style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", opacity: canAfford ? 1 : 0.5 }}>${upgrade.cost}</button>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem", marginTop: "0.5rem" }}>🥚 Yield</div>
          {ANIMAL_YIELD_UPGRADES.map((upgrade) => {
            const owned = (animal.yieldLevel ?? 0) >= upgrade.level;
            const isNext = (animal.yieldLevel ?? 0) === upgrade.level - 1;
            const canAfford = (game.cash ?? 0) >= upgrade.cost;
            const schoolLocked = upgrade.level >= 2 && !isTownBuildingBuilt(game, "school");
            const matsOk = canAffordMats(upgrade.upgradeRequires, game.worldResources, game.forgeGoods);
            const canBuy = isNext && canAfford && matsOk && !schoolLocked;
            const matLabel = matCostLabel(upgrade.upgradeRequires);
            return (
              <div key={upgrade.level} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.3rem 0.45rem", borderRadius: "6px", marginBottom: "0.25rem", background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)", border: `1px solid ${owned ? "rgba(74,222,128,0.3)" : schoolLocked && isNext ? "rgba(167,139,250,0.3)" : "var(--border)"}`, opacity: !owned && !isNext ? 0.4 : 1 }}>
                <div style={{ fontSize: "0.68rem" }}>
                  <span style={{ fontWeight: 600, color: owned ? "#4ade80" : schoolLocked && isNext ? "#a78bfa" : "var(--text)" }}>{owned ? "✓" : schoolLocked && isNext ? "🏫" : "🥚"} {upgrade.label}</span>
                  <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>{schoolLocked && isNext ? "Requires School" : `+${upgrade.bonusYield} per produce`}</span>
                  {!owned && isNext && !schoolLocked && matLabel && (
                    <span style={{ display: "block", fontSize: "0.6rem", color: matsOk ? "#fbbf24" : "#ef4444", fontWeight: 600, marginTop: "0.1rem" }}>{matLabel}</span>
                  )}
                </div>
                {!owned && isNext && !schoolLocked && (
                  <button onClick={() => canBuy && onUpgradeYield(animal.id)} disabled={!canBuy} className="btn btn-secondary" style={{ fontSize: "0.62rem", padding: "0.15rem 0.4rem", opacity: canBuy ? 1 : 0.5 }}>${upgrade.cost}</button>
                )}
              </div>
            );
          })}
        </div>
      )}
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
// ─── Barn worker upgrade tree ─────────────────────────────────────────────────
 
function BarnWorkerUpgradeTree({ label, upgradeIds, worker, game, onUpgrade }) {
  const upgrades = worker.upgrades ?? [];
 
  return (
    <div>
      <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.25rem" }}>
        {label}
      </div>
 
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {upgradeIds.map((uid) => {
          const u = BARN_WORKER_UPGRADES[uid];
          const owned = upgrades.includes(uid);
          const requiresMet = !u.requires || upgrades.includes(u.requires);
 
          const researchLocked =
            (uid === "capacity_2" && !hasSchoolResearch(game, "barn_capacity_2")) ||
            (uid === "care_2" && !hasSchoolResearch(game, "barn_care_2"));
 
          const canAfford = (game.cash ?? 0) >= u.cost;
          const canBuy = !owned && requiresMet && canAfford && !researchLocked;
          const locked = !owned && !requiresMet;
 
          return (
            <div
              key={uid}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.28rem 0.45rem",
                borderRadius: "6px",
                background: owned ? "rgba(74,222,128,0.08)" : "var(--bg)",
                border: `1px solid ${
                  owned
                    ? "rgba(74,222,128,0.3)"
                    : researchLocked && requiresMet
                    ? "rgba(167,139,250,0.3)"
                    : "var(--border)"
                }`,
                opacity: locked ? 0.4 : 1,
              }}
            >
              <div style={{ fontSize: "0.68rem" }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: owned
                      ? "#4ade80"
                      : researchLocked && requiresMet
                      ? "#a78bfa"
                      : "var(--text)",
                  }}
                >
                  {owned ? "✓" : researchLocked && requiresMet ? "🏫" : locked ? "🔒" : u.emoji} {u.name}
                </span>
 
                <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "var(--muted)" }}>
                  {researchLocked && requiresMet
                    ? "Requires School Research"
                    : u.description}
                </span>
              </div>
 
              {!owned && !researchLocked && (
                <button
                  onClick={() => canBuy && onUpgrade(worker.id, uid)}
                  disabled={!canBuy}
                  className="btn btn-secondary"
                  style={{
                    fontSize: "0.62rem",
                    padding: "0.15rem 0.4rem",
                    marginLeft: "0.4rem",
                    flexShrink: 0,
                    opacity: canBuy ? 1 : 0.5,
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
 
// ─── Barn worker card ─────────────────────────────────────────────────────────
 
function BarnWorkerCard({ worker, game, index, onFire, onUpgrade, instanceAnimals }) {
  const [confirmFire, setConfirmFire] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const animals = instanceAnimals ?? [];
  const totalStock = animals.reduce((s, a) => s + (a.stock ?? 0), 0);
  const avgMood = animals.length > 0
    ? Math.round(animals.reduce((s, a) => s + (a.mood ?? 100), 0) / animals.length)
    : null;
  const interval = getBarnWorkerInterval(worker);
  const capacity = getBarnWorkerCapacity(worker);
  const careInterval = getBarnWorkerCareInterval(worker);
  const upgrades = worker.upgrades ?? [];
 
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.75rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
            🧑‍🌾 Farmhand {index + 1}
            {upgrades.length > 0 && (
              <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", color: "var(--muted)" }}>
                {upgrades.map((u) => BARN_WORKER_UPGRADES[u]?.emoji).join("")}
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>
            Collects {capacity} every {interval}s
            {careInterval && ` · boosts mood every ${careInterval}s`}
            {animals.length > 0 && ` · ${totalStock} in stock`}
            {avgMood !== null && ` · avg mood ${avgMood}%`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button onClick={() => setShowUpgrades((v) => !v)} style={{ fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "6px", cursor: "pointer", background: showUpgrades ? "var(--accent)" : "var(--bg)", border: `1px solid ${showUpgrades ? "var(--accent)" : "var(--border)"}`, color: showUpgrades ? "#fff" : "var(--muted)" }}>⚡</button>
          {!confirmFire ? (
            <button onClick={() => setConfirmFire(true)} style={{ fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "6px", cursor: "pointer", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>Fire</button>
          ) : (
            <>
              <button onClick={() => { onFire(worker.id); setConfirmFire(false); }} style={{ fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "6px", cursor: "pointer", background: "#ef4444", border: "none", color: "#fff", fontWeight: 600 }}>✓</button>
              <button onClick={() => setConfirmFire(false)} style={{ fontSize: "0.65rem", padding: "0.2rem 0.45rem", borderRadius: "6px", cursor: "pointer", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>✕</button>
            </>
          )}
        </div>
      </div>
      {showUpgrades && (
        <div style={{ padding: "0.6rem 0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--bg-elev)" }}>
          <BarnWorkerUpgradeTree label="⚡ Speed"    upgradeIds={SPEED_UPGRADES}    worker={worker} game={game} onUpgrade={onUpgrade} />
          <BarnWorkerUpgradeTree label="📦 Capacity" upgradeIds={CAPACITY_UPGRADES} worker={worker} game={game} onUpgrade={onUpgrade} />
          <BarnWorkerUpgradeTree label="💝 Care"     upgradeIds={CARE_UPGRADES}     worker={worker} game={game} onUpgrade={onUpgrade} />
        </div>
      )}
    </div>
  );
}
 
// ─── Building tab content ─────────────────────────────────────────────────────
 
// ─── Building tab content ─────────────────────────────────────────────────────
 
function BuildingTab({
  barnInstance, game,
  onBuyAnimal, onCollectAnimal, onInteractAnimal, onUpgradeAnimalStorage, onUpgradeAnimalYield,
  onHireBarnWorker, onFireBarnWorker, onUpgradeBarnWorker,
  onBuildBarnBuilding, onUpgradeBarnBuilding, onCollectAll,
}) {
  const buildingId = barnInstance.buildingType;
  const instanceId = barnInstance.id;
  const def = BARN_BUILDINGS[buildingId];
  const animalTypeDef = ANIMAL_DEFS[def.animalType];
  const building = getBarnBuilding(game, buildingId);
  const inst = (game.barnInstances ?? []).find(i => i.id === instanceId);
  const animals = inst?.animals ?? [];
  const barnWorkers = inst?.barnWorkers ?? [];
  const animalSlots = getBarnInstanceAnimalSlots(game, instanceId);
  const workerSlots = getBarnInstanceWorkerSlots(game, instanceId);
  const totalStock = animals.reduce((s, a) => s + (a.stock ?? 0), 0);
  const cash = game.cash ?? 0;
  const seasonOk = (game.season ?? 1) >= def.unlockSeason;
 
  // ── Not built yet ──────────────────────────────────────────────────────────
  if (!building.built || !inst) {
    const canAfford = cash >= def.buildCost;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <div style={{
          background: "var(--bg-elev)", border: `1px solid ${!seasonOk ? "var(--border)" : canAfford ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
          borderRadius: "14px", padding: "1.5rem 1rem", textAlign: "center",
          opacity: !seasonOk ? 0.5 : 1,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{def.emoji}</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" }}>{def.name}</div>
          {!seasonOk ? (
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>🔒 Unlocks Season {def.unlockSeason}</div>
          ) : (
            <>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
                Houses up to 3 {animalTypeDef.name.toLowerCase()}s to start<br />
                ${def.upkeepPerAnimalPerSec.toFixed(2)}/sec per animal upkeep — paid from cash
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "1rem" }}>
                Tier 1: 3 animal slots · 1 worker slot
              </div>
              <button onClick={() => onBuildBarnBuilding(buildingId)} disabled={!canAfford} className="btn"
                style={{ opacity: canAfford ? 1 : 0.5, fontSize: "0.85rem", padding: "0.5rem 1.5rem" }}>
                {canAfford ? `🏗️ Build — $${def.buildCost.toLocaleString()}` : `Need $${def.buildCost.toLocaleString()}`}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
 
  // ── Built ──────────────────────────────────────────────────────────────────
  const instTier = inst.tier ?? 1;
  const tierData = BARN_BUILDING_TIERS[instTier - 1] ?? BARN_BUILDING_TIERS[0];
  const nextTierData = BARN_BUILDING_TIERS[instTier]; // instTier is 1-indexed
  const canUpgrade = canUpgradeBarnBuilding(game, buildingId, instanceId);
  const upkeepTotal = animals.length * def.upkeepPerAnimalPerSec;
  const atWorkerCap = getAvailableWorkerSlots(game) <= 0;
  const workerSlotsUsed = barnWorkers.length;
  const workerSlotsFull = workerSlotsUsed >= workerSlots;
  const animalSlotsFull = animals.length >= animalSlots;
  const allOwnedGlobally = (game.barnInstances ?? [])
    .filter(i => BARN_BUILDINGS[i.buildingType]?.animalType === def.animalType)
    .reduce((s, i) => s + (i.animals ?? []).length, 0);
  const nextAnimalCost = getAnimalCost(def.animalType, allOwnedGlobally);
  const canAffordAnimal = cash >= nextAnimalCost;
  const hireCost = getBarnWorkerHireCost(game);
  const canHireWorker = !atWorkerCap && !workerSlotsFull && cash >= hireCost;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
 
      {/* Building header */}
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem 0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: nextTierData ? "0.3rem" : 0 }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>
              {def.emoji} {def.name}
              <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600 }}>
                Tier {instTier} — {tierData?.name}
              </span>
            </div>
            <div style={{ fontSize: "0.65rem", marginTop: "0.15rem", color: upkeepTotal > 0 ? "#f59e0b" : "var(--muted)" }}>
              {upkeepTotal > 0
                ? `💸 $${upkeepTotal.toFixed(2)}/sec · ${animalSlots - animals.length} animal slots · ${workerSlots - workerSlotsUsed} worker slots free`
                : `${animalSlots} animal slots · ${workerSlots} worker slots`}
            </div>
          </div>
          {nextTierData ? (
            <button onClick={() => onUpgradeBarnBuilding(buildingId, instanceId)} disabled={!canUpgrade} className="btn btn-secondary"
              style={{ fontSize: "0.68rem", padding: "0.3rem 0.6rem", opacity: canUpgrade ? 1 : 0.5, flexShrink: 0, marginLeft: "0.5rem" }}>
              ↑ T{instTier + 1} ${nextTierData.upgradeCost.toLocaleString()}
            </button>
          ) : (
            <span style={{ fontSize: "0.65rem", color: "#4ade80", flexShrink: 0, marginLeft: "0.5rem" }}>✓ Max</span>
          )}
        </div>
        {nextTierData && (() => {
          const matCost = nextTierData.upgradeMaterialCost ?? {};
          const MAT_LABELS = { iron_ore: "🪨", lumber: "🪵", iron_fitting: "🔩", reinforced_crate: "📦", fine_tools: "🛠️" };
          const matEntries = Object.entries(matCost);
          return (
            <div style={{ fontSize: "0.6rem", color: "var(--muted)" }}>
              Next: {nextTierData.animalSlots} animal slots · {nextTierData.workerSlots} worker slots
              {matEntries.length > 0 && (
                <span style={{ marginLeft: "0.4rem" }}>
                  · {matEntries.map(([k, v]) => {
                    const have = Math.floor((game.worldResources?.[k] ?? 0) + (game.forgeGoods?.[k] ?? 0));
                    const ok = have >= v;
                    return (
                      <span key={k} style={{ color: ok ? "#4ade80" : "#ef4444", marginRight: "0.3rem" }}>
                        {MAT_LABELS[k] ?? k}×{v}{ok ? "✓" : ` (${have})`}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
          );
        })()}
      </div>
 
      {/* Collect all */}
      {totalStock > 1 && (
        <button onClick={onCollectAll} style={{ width: "100%", padding: "0.5rem", borderRadius: "10px", cursor: "pointer", background: "rgba(251,191,36,0.15)", border: "2px solid rgba(251,191,36,0.5)", color: "#fbbf24", fontSize: "0.8rem", fontWeight: 700 }}>
          🧺 Collect All ({totalStock} {animalTypeDef.produceName.toLowerCase()}s)
        </button>
      )}
 
      {/* Animal cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {animals.map((animal, idx) => (
          <AnimalCard
            key={animal.id} animal={animal} animalType={animalTypeDef} index={idx} game={game}
            onCollect={(id) => onCollectAnimal(def.animalType, id, instanceId)}
            onInteract={(id) => onInteractAnimal(def.animalType, id, instanceId)}
            onUpgradeStorage={(id) => onUpgradeAnimalStorage(def.animalType, id, instanceId)}
            onUpgradeYield={(id) => onUpgradeAnimalYield(def.animalType, id, instanceId)}
          />
        ))}
        {!animalSlotsFull ? (
          <button onClick={() => onBuyAnimal(def.animalType, instanceId)} disabled={!canAffordAnimal} className="btn w-full"
            style={{ opacity: canAffordAnimal ? 1 : 0.5, fontSize: "0.8rem" }}>
            {canAffordAnimal
              ? `${animalTypeDef.emoji} Buy ${animalTypeDef.name} — $${nextAnimalCost.toLocaleString()} (${animals.length}/${animalSlots})`
              : `Need $${nextAnimalCost.toLocaleString()} (${animals.length}/${animalSlots})`}
          </button>
        ) : (
          <div style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--muted)", padding: "0.5rem" }}>
            ✓ All {animalSlots} slots filled
          </div>
        )}
      </div>
 
      {/* Barn workers */}
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "0.65rem 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: barnWorkers.length > 0 ? "1px solid var(--border)" : "none" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>👷 Barn Workers ({workerSlotsUsed}/{workerSlots})</div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>Auto-collect produce · upgradeable</div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {barnWorkers.length > 0 && (() => {
              const ALL_UPGRADE_IDS = [...SPEED_UPGRADES, ...CAPACITY_UPGRADES, ...CARE_UPGRADES];
              const nextUpgrades = barnWorkers.map((w) => {
                const owned = w.upgrades ?? [];
                return ALL_UPGRADE_IDS.find((uid) => {
                  const u = BARN_WORKER_UPGRADES[uid];
                  return !owned.includes(uid) && (!u.requires || owned.includes(u.requires));
                });
              }).filter(Boolean);
              const totalCost = nextUpgrades.reduce((s, uid) => s + (BARN_WORKER_UPGRADES[uid]?.cost ?? 0), 0);
              const canAffordAll = nextUpgrades.length > 0 && (cash >= totalCost);
              if (nextUpgrades.length === 0) return null;
              return (
                <button
                  onClick={() => {
                    if (!canAffordAll) return;
                    barnWorkers.forEach((w) => {
                      const owned = w.upgrades ?? [];
                      const uid = ALL_UPGRADE_IDS.find((id) => {
                        const u = BARN_WORKER_UPGRADES[id];
                        return !owned.includes(id) && (!u.requires || owned.includes(u.requires));
                      });
                      if (uid) onUpgradeBarnWorker(w.id, uid);
                    });
                  }}
                  disabled={!canAffordAll}
                  style={{
                    fontSize: "0.65rem", fontWeight: 600, padding: "0.3rem 0.6rem", borderRadius: "8px",
                    cursor: canAffordAll ? "pointer" : "default",
                    background: canAffordAll ? "rgba(251,191,36,0.15)" : "var(--bg)",
                    border: `1px solid ${canAffordAll ? "rgba(251,191,36,0.5)" : "var(--border)"}`,
                    color: canAffordAll ? "#fbbf24" : "var(--muted)",
                  }}
                >
                  ⬆ All ${totalCost.toLocaleString()}
                </button>
              );
            })()}
            <button
              onClick={() => canHireWorker && onHireBarnWorker(def.animalType, instanceId)}
              disabled={!canHireWorker}
              style={{
                fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.75rem", borderRadius: "8px",
                cursor: canHireWorker ? "pointer" : "default",
                background: canHireWorker ? "var(--accent)" : "var(--bg)",
                border: `1px solid ${canHireWorker ? "var(--accent)" : "var(--border)"}`,
                color: canHireWorker ? "#fff" : "var(--muted)",
                opacity: workerSlotsFull || atWorkerCap ? 0.5 : 1,
              }}
            >
              {atWorkerCap ? "Town full" : workerSlotsFull ? "Slots full" : `+ Hire $${hireCost}`}
            </button>
          </div>
        </div>
        {barnWorkers.length > 0 && (
          <div style={{ padding: "0.65rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {barnWorkers.map((w, idx) => (
              <BarnWorkerCard key={w.id} worker={w} game={game} index={idx} onFire={onFireBarnWorker} onUpgrade={onUpgradeBarnWorker} instanceAnimals={animals} />
            ))}
          </div>
        )}
        {barnWorkers.length === 0 && (
          <div style={{ padding: "0.5rem 0.85rem 0.65rem", fontSize: "0.72rem", color: "var(--muted)" }}>
            No farmhands hired. They auto-collect produce and can be upgraded.
          </div>
        )}
      </div>
 
      {/* Upkeep info */}
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.65rem 0.85rem", fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.7 }}>
        <div>💸 ${def.upkeepPerAnimalPerSec.toFixed(2)}/sec per {animalTypeDef.name.toLowerCase()} · drained from cash each second</div>
        <div>📉 Can't afford → heavy mood drain → dies after 3 missed food pulses at 0% mood</div>
        <div>{animalTypeDef.produceEmoji} Raw: ${animalTypeDef.rawValue} · craft into processed goods in Kitchen for higher value</div>
      </div>
    </div>
  );
}
 
// ─── Barn instance sub-tab bar (mirrors FarmSubTabs) ─────────────────────────
 
function BarnSubTabs({ instances, activeInstanceId, onTabChange }) {
  if (instances.length <= 1) return null;
  return (
    <div style={{
      background: "var(--bg-elev)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      overflowX: "auto",
      scrollbarWidth: "none",
      marginBottom: "0.75rem",
    }}>
      {instances.map((inst) => {
        const def = BARN_BUILDINGS[inst.buildingType];
        const isActive = activeInstanceId === inst.id;
        return (
          <button
            key={inst.id}
            onClick={() => onTabChange(inst.id)}
            style={{
              position: "relative",
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.5rem 1rem",
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              color: isActive ? "var(--accent)" : "var(--muted)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "0.78rem",
              whiteSpace: "nowrap",
            }}
          >
            <span>{def.emoji}</span>
            <span>{inst.label}</span>
            {inst.readyCount > 0 && (
              <span style={{
                fontSize: "0.6rem", background: "#fbbf24", color: "#000",
                borderRadius: "999px", padding: "0.05rem 0.35rem", fontWeight: 700,
              }}>{inst.readyCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
 
// ─── Main export ──────────────────────────────────────────────────────────────
 
export default function BarnZone({
  game, onBuyAnimal, onCollectAnimal, onCollectAll, onInteractAnimal,
  onBuyPet, onInteractPet, onHireBarnWorker, onFireBarnWorker,
  onReassignBarnWorker, onUpgradeBarnWorker, onUpgradeAnimalStorage,
  onUpgradeAnimalYield, onBuildBarnBuilding, onUpgradeBarnBuilding,
}) {
  const [deathNotifs, setDeathNotifs] = useState([]);
  const prevDeathEventsRef = useRef([]);
 
  // Build flat list of all barn instances across all building types
  const allInstances = BARN_BUILDING_ORDER.flatMap((buildingId) => {
    const def = BARN_BUILDINGS[buildingId];
    const instList = (game.barnInstances ?? []).filter(i => i.buildingType === buildingId);
    return instList.map((inst, idx) => {
      const readyCount = (inst.animals ?? []).filter(a => a.ready).length;
      return {
        ...inst,
        label: instList.length > 1 ? `${def.name} ${idx + 1}` : def.name,
        readyCount,
      };
    });
  });
 
  // Include unbuilt barns available this season
  const unbuiltSlots = BARN_BUILDING_ORDER
    .filter((id) => !(game.barnBuildings?.[id]?.built) && (game.season ?? 1) >= BARN_BUILDINGS[id].unlockSeason)
    .map((id) => ({
      id: `${id}_unbuilt`,
      buildingType: id,
      label: BARN_BUILDINGS[id].name,
      tier: 0,
      readyCount: 0,
      unbuilt: true,
      animals: [],
      barnWorkers: [],
    }));
 
  const visibleInstances = [...allInstances, ...unbuiltSlots];
 
  const [activeInstanceId, setActiveInstanceId] = useState(() => visibleInstances[0]?.id ?? null);
 
  // Auto-switch to newest tab when a new barn is unlocked
  const prevCountRef = useRef(visibleInstances.length);
  useEffect(() => {
    if (visibleInstances.length > prevCountRef.current) {
      const newest = visibleInstances[visibleInstances.length - 1];
      if (newest) setActiveInstanceId(newest.id);
    }
    prevCountRef.current = visibleInstances.length;
  }, [visibleInstances.length]);
 
  const activeInstance = visibleInstances.find((i) => i.id === activeInstanceId) ?? visibleInstances[0] ?? null;
 
  useEffect(() => {
    const events = game.pendingDeathEvents ?? [];
    if (events.length === 0) return;
    const prev = prevDeathEventsRef.current;
    if (events === prev) return;
    prevDeathEventsRef.current = events;
    const newNotifs = events.map((evt) => ({
      id: `${evt.animalId}-${Date.now()}-${Math.random()}`,
      emoji: evt.emoji,
      animalType: evt.animalType,
    }));
    setDeathNotifs((prev) => [...prev, ...newNotifs]);
    newNotifs.forEach(({ id }) => {
      setTimeout(() => setDeathNotifs((prev) => prev.filter((n) => n.id !== id)), 5000);
    });
  }, [game.pendingDeathEvents]);
 
  const totalFood = Object.entries(game.animals ?? {}).reduce((sum, [id, arr]) => sum + arr.length * 2, 0)
    + Object.keys(game.pets ?? {}).length;
 
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
 
      {/* Death notifications */}
      {deathNotifs.map((notif) => (
        <div key={notif.id} style={{
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: "10px", padding: "0.6rem 0.9rem", marginBottom: "0.6rem",
          fontSize: "0.78rem", color: "#ef4444", fontWeight: 600,
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span style={{ fontSize: "1.1rem" }}>💀</span>
          {notif.emoji} 1 {notif.animalType} died from neglect!
        </div>
      ))}
 
      {/* Pets pinned at top */}
      <PetsRow game={game} onBuyPet={onBuyPet} onInteractPet={onInteractPet} />
 
      {/* Food cost notice */}
      {totalFood > 0 && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "0.5rem 0.85rem", fontSize: "0.7rem", marginBottom: "0.65rem" }}>
          🍞 Animals & pets add <strong style={{ color: "#ef4444" }}>+{totalFood}</strong> to town food pulse cost
        </div>
      )}
 
      {/* No barns unlocked yet — show locked preview */}
      {visibleInstances.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginBottom: "0.25rem" }}>
            🔒 Barns unlock starting Season 4
          </div>
          {BARN_BUILDING_ORDER.map((id) => {
            const def = BARN_BUILDINGS[id];
            return (
              <div key={id} style={{
                background: "var(--bg-elev)", border: "1px solid var(--border)",
                borderRadius: "14px", padding: "1.25rem 1rem", textAlign: "center", opacity: 0.5,
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.4rem" }}>{def.emoji}</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>{def.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>🔒 Next Barn Unlocks Season {def.unlockSeason}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Scrollable barn instance tab bar */}
          <BarnSubTabs
            instances={visibleInstances}
            activeInstanceId={activeInstance?.id}
            onTabChange={setActiveInstanceId}
          />

          {/* Active instance panel */}
          {activeInstance && (
            <BuildingTab
              key={activeInstance.id}
              barnInstance={activeInstance}
              game={game}
              onBuyAnimal={onBuyAnimal}
              onCollectAnimal={onCollectAnimal}
              onInteractAnimal={onInteractAnimal}
              onUpgradeAnimalStorage={onUpgradeAnimalStorage}
              onUpgradeAnimalYield={onUpgradeAnimalYield}
              onHireBarnWorker={onHireBarnWorker}
              onFireBarnWorker={onFireBarnWorker}
              onUpgradeBarnWorker={onUpgradeBarnWorker}
              onBuildBarnBuilding={onBuildBarnBuilding}
              onUpgradeBarnBuilding={onUpgradeBarnBuilding}
              onCollectAll={onCollectAll}
            />
          )}
        </>
      )}
    </div>
  );
}