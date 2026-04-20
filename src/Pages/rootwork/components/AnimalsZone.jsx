// src/Pages/rootwork/components/AnimalsZone.jsx
import React, { useState } from "react";
import PondZone from "./PondZone";
import BarnZone from "./BarnZone";

export default function AnimalsZone({
  game,
  onBuyPond, onCatchFish,
  onBuyAnimal, onCollectAnimal, onCollectAll, onInteractAnimal,
  onBuyPet, onInteractPet,
  onHireBarnWorker, onFireBarnWorker, onReassignBarnWorker,
  onUpgradeBarnWorker, onUpgradeAnimalStorage, onUpgradeAnimalYield,
  onUnlockFishingBody, onSetFishingActiveBody,
  onHireFishingWorker, onFireFishingWorker,
  onUpgradeFishingWorker, onSetFishingWorkerBait,
  onBuildBarnBuilding, onUpgradeBarnBuilding,
  onToggleFishingWorkerAllowedFish,
}) {
  const [subTab, setSubTab] = useState("pond");

  const readyAnimals = Object.values(game.animals ?? {}).reduce(
    (sum, arr) => sum + arr.filter((a) => a.ready).length, 0
  );

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🐾 Animals</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Fish the pond for cash and rare finds. Raise animals for crafting goods.
        </p>
      </div>

      {/* Sub-tab bar */}
      <div style={{
        display: "flex", gap: "0.35rem", marginBottom: "1rem",
        borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem",
      }}>
        {[
          { id: "pond", label: "🎣 Pond" },
          { id: "barn", label: `🐔 Barn${readyAnimals > 0 ? ` (${readyAnimals})` : ""}` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              padding: "0.35rem 0.85rem", fontSize: "0.78rem",
              fontWeight: subTab === tab.id ? 700 : 400,
              background: "none", border: "none",
              borderBottom: subTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-0.5rem",
              color: subTab === tab.id ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "pond" && (
        <PondZone
          game={game}
          onBuyPond={onBuyPond}
          onCatchFish={onCatchFish}
          onUnlockFishingBody={onUnlockFishingBody}
          onSetFishingActiveBody={onSetFishingActiveBody}
          onHireFishingWorker={onHireFishingWorker}
          onFireFishingWorker={onFireFishingWorker}
          onUpgradeFishingWorker={onUpgradeFishingWorker}
          onSetFishingWorkerBait={onSetFishingWorkerBait}
          onToggleFishingWorkerAllowedFish={onToggleFishingWorkerAllowedFish}
        />
      )}

      {subTab === "barn" && (
        <BarnZone
          game={game}
          onBuyAnimal={onBuyAnimal}
          onCollectAnimal={onCollectAnimal}
          onCollectAll={onCollectAll}
          onInteractAnimal={onInteractAnimal}
          onBuyPet={onBuyPet}
          onInteractPet={onInteractPet}
          onHireBarnWorker={onHireBarnWorker}
          onFireBarnWorker={onFireBarnWorker}
          onReassignBarnWorker={onReassignBarnWorker}
          onUpgradeBarnWorker={onUpgradeBarnWorker}
          onUpgradeAnimalStorage={onUpgradeAnimalStorage}
          onUpgradeAnimalYield={onUpgradeAnimalYield}
          onBuildBarnBuilding={onBuildBarnBuilding}
          onUpgradeBarnBuilding={onUpgradeBarnBuilding}
        />
      )}
    </div>
  );
}