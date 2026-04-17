// src/Pages/rootwork/components/BarnZone.jsx
import React, { useState } from "react";
 
const ANIMAL_DEFS = {
  chicken: { id: "chicken", name: "Chicken", emoji: "🐔", baseCost: 300, costMultiplier: 1.8, produces: "egg", produceName: "Egg", produceEmoji: "🥚", cycleSeconds: 60, foodPulseCost: 1, moodDecayPerMinute: 2, description: "Lays eggs every minute.", unlockSeason: 1 },
  cow:     { id: "cow",     name: "Cow",     emoji: "🐄", baseCost: 800, costMultiplier: 1.6, produces: "milk", produceName: "Milk", produceEmoji: "🥛", cycleSeconds: 120, foodPulseCost: 2, moodDecayPerMinute: 1.5, description: "Produces milk every 2 minutes.", unlockSeason: 2 },
  sheep:   { id: "sheep",   name: "Sheep",   emoji: "🐑", baseCost: 1500, costMultiplier: 1.5, produces: "wool", produceName: "Wool", produceEmoji: "🧶", cycleSeconds: 180, foodPulseCost: 2, moodDecayPerMinute: 1, description: "Produces wool every 3 minutes.", unlockSeason: 3 },
};
 
const PET_DEFS = {
  dog:    { id: "dog",    name: "Dog",    emoji: "🐕", cost: 400, bonus: "Slows mood decay on all barn animals by 30%.", foodCostPerPulse: 1 },
  cat:    { id: "cat",    name: "Cat",    emoji: "🐈", cost: 400, bonus: "Widens the fishing needle sweet spot by 20%.", foodCostPerPulse: 1 },
  rabbit: { id: "rabbit", name: "Rabbit", emoji: "🐇", cost: 400, bonus: "+5% town satisfaction while happy.", foodCostPerPulse: 1 },
};
 
const MAX_PER_TYPE = 5;
const INTERACT_BOOST = 25;
 
function getAnimalCost(animalId, owned) {
  const type = ANIMAL_DEFS[animalId];
  return Math.round(type.baseCost * Math.pow(type.costMultiplier, owned));
}
 
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
 
function AnimalCard({ animal, animalType, onCollect, onInteract, index }) {
  const mood = animal.mood ?? 100;
  const isReady = animal.ready === true;
  const cooldown = animal.interactCooldown ?? 0;
  const canInteract = cooldown <= 0;
  const progressPct = Math.min(100, ((animal.readyTick ?? 0) / animalType.cycleSeconds) * 100);
 
  return (
    <div style={{
      background: "var(--bg)",
      border: `1px solid ${isReady ? "rgba(251,191,36,0.5)" : "var(--border)"}`,
      borderRadius: "12px", padding: "0.75rem",
      position: "relative",
    }}>
      {isReady && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "12px",
          border: "2px solid #fbbf24",
          animation: "rw-pulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
 
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "1.8rem", lineHeight: 1 }}>{animalType.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
              {animalType.name} #{index + 1}
            </div>
            <div style={{ fontSize: "0.68rem", color: moodColor(mood), fontWeight: 600 }}>
              {moodEmoji(mood)} {Math.round(mood)}%
            </div>
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>
            {isReady
              ? `${animalType.produceEmoji} Ready to collect!`
              : `${animalType.produceEmoji} ${animalType.produceName} in ${Math.ceil(animalType.cycleSeconds - (animal.readyTick ?? 0))}s`}
          </div>
        </div>
      </div>
 
      {/* Mood bar */}
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.3rem" }}>
        <div style={{ height: "100%", width: `${mood}%`, background: moodColor(mood), borderRadius: "999px", transition: "width 0.5s" }} />
      </div>
 
      {/* Progress bar */}
      {!isReady && (
        <div style={{ height: "3px", background: "var(--border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.45rem" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "rgba(99,102,241,0.6)", borderRadius: "999px", transition: "width 0.5s" }} />
        </div>
      )}
 
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {isReady && (
          <button
            onClick={() => onCollect(animal.id)}
            style={{
              flex: 1, fontSize: "0.72rem", fontWeight: 700,
              padding: "0.3rem 0.5rem", borderRadius: "8px",
              background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.5)",
              color: "#fbbf24", cursor: "pointer",
            }}
          >
            {animalType.produceEmoji} Collect
          </button>
        )}
        <button
          onClick={() => canInteract && onInteract(animal.id)}
          disabled={!canInteract}
          style={{
            flex: 1, fontSize: "0.7rem",
            padding: "0.3rem 0.5rem", borderRadius: "8px",
            background: canInteract ? "rgba(99,102,241,0.1)" : "var(--bg)",
            border: `1px solid ${canInteract ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
            color: canInteract ? "var(--accent)" : "var(--muted)",
            cursor: canInteract ? "pointer" : "default",
            opacity: canInteract ? 1 : 0.5,
          }}
        >
          {canInteract ? `💝 +${INTERACT_BOOST}% mood` : `💝 ${Math.ceil(cooldown)}s`}
        </button>
      </div>
    </div>
  );
}
 
function AnimalSection({ animalId, game, onBuyAnimal, onCollect, onInteract }) {
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
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0.75rem 0.85rem",
          background: "none", border: "none", cursor: "pointer",
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
              <button
                onClick={() => onBuyAnimal(animalId)}
                disabled={!canAfford}
                className="btn"
                style={{ fontSize: "0.75rem", opacity: canAfford ? 1 : 0.5 }}
              >
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
                  onCollect={(instanceId) => onCollect(animalId, instanceId)}
                  onInteract={(instanceId) => onInteract(animalId, instanceId)}
                  index={idx}
                />
              ))}
              <div style={{
                fontSize: "0.65rem", color: "var(--muted)",
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.15)",
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
      background: "var(--bg-elev)",
      border: `1px solid ${bonusActive ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
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
              width: "100%", fontSize: "0.7rem",
              padding: "0.28rem 0.5rem", borderRadius: "8px",
              background: canInteract ? "rgba(99,102,241,0.1)" : "var(--bg)",
              border: `1px solid ${canInteract ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
              color: canInteract ? "var(--accent)" : "var(--muted)",
              cursor: canInteract ? "pointer" : "default",
              opacity: canInteract ? 1 : 0.5,
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
        <button
          onClick={() => onBuyPet(petId)}
          disabled={!canAfford}
          className="btn w-full"
          style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", marginTop: "0.5rem", opacity: canAfford ? 1 : 0.5 }}
        >
          {canAfford ? `Adopt ${type.name} — $${type.cost}` : `Need $${type.cost}`}
        </button>
      )}
    </div>
  );
}
 
export default function BarnZone({ game, onBuyAnimal, onCollectAnimal, onCollectAll, onInteractAnimal, onBuyPet, onInteractPet }) {
  const [subTab, setSubTab] = useState("barn");
 
  const totalAnimalFood = Object.entries(game.animals ?? {}).reduce((sum, [id, arr]) => {
    return sum + (ANIMAL_DEFS[id] ? arr.length * ANIMAL_DEFS[id].foodPulseCost : 0);
  }, 0);
  const totalPetFood = Object.keys(game.pets ?? {}).reduce((sum, id) => {
    return sum + (PET_DEFS[id] ? PET_DEFS[id].foodCostPerPulse : 0);
  }, 0);
  const totalFood = totalAnimalFood + totalPetFood;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
 
      <div style={{ display: "flex", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg)" }}>
        {[{ id: "barn", label: "🐔 Animals" }, { id: "pets", label: "🐾 Pets" }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              flex: 1, padding: "0.5rem", fontSize: "0.78rem",
              fontWeight: subTab === tab.id ? 700 : 400,
              background: subTab === tab.id ? "var(--accent)" : "none",
              border: "none", cursor: "pointer",
              color: subTab === tab.id ? "#fff" : "var(--muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
 
      {totalFood > 0 && (
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "10px", padding: "0.6rem 0.85rem", fontSize: "0.72rem",
        }}>
          🍞 Animals & pets add <strong style={{ color: "#ef4444" }}>+{totalFood}</strong> to town food pulse cost
          <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>
            Visible in Town → Food Pulse section
          </div>
        </div>
      )}
 
      {subTab === "barn" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {(() => {
            const totalReady = Object.values(game.animals ?? {}).reduce((s, arr) => s + arr.filter(a => a.ready).length, 0);
            return totalReady > 1 ? (
              <button
                onClick={onCollectAll}
                style={{
                  width: "100%", padding: "0.5rem", borderRadius: "10px", cursor: "pointer",
                  background: "rgba(251,191,36,0.15)", border: "2px solid rgba(251,191,36,0.5)",
                  color: "#fbbf24", fontSize: "0.8rem", fontWeight: 700,
                }}
              >
                🧺 Collect All ({totalReady} ready)
              </button>
            ) : null;
          })()}
          {Object.keys(ANIMAL_DEFS).map((animalId) => (
            <AnimalSection
              key={animalId}
              animalId={animalId}
              game={game}
              onBuyAnimal={onBuyAnimal}
              onCollect={onCollectAnimal}
              onInteract={onInteractAnimal}
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
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6 }}>
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