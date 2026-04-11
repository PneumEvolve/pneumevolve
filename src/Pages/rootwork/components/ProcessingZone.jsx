// src/Pages/rootwork/components/ProcessingZone.jsx
 
import React from "react";
import { PROCESSING_RECIPES, CROPS } from "../gameConstants";
 
// ─── Progress bar ─────────────────────────────────────────────────────────────
 
function QueueItem({ item }) {
  const recipe = PROCESSING_RECIPES[item.recipeId];
  if (!recipe) return null;
  const percent = Math.min(100, Math.floor((item.elapsedSeconds / item.totalSeconds) * 100));
  const remaining = item.totalSeconds - item.elapsedSeconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
 
  return (
    <div className="card p-4 space-y-2">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.85rem",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {recipe.emoji} {recipe.name}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
          {mins}m {secs}s left
        </span>
      </div>
 
      {/* Progress bar */}
      <div
        style={{
          height: "6px",
          background: "var(--border)",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "var(--accent)",
            borderRadius: "999px",
            transition: "width 1s linear",
          }}
        />
      </div>
 
      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
        {percent}% complete · yields {item.outputAmount} {recipe.emoji}
      </div>
    </div>
  );
}
 
// ─── Recipe card ──────────────────────────────────────────────────────────────
 
function RecipeCard({ recipe, game, onStartProcessing, queueFull }) {
  const canAfford = Object.entries(recipe.inputs).every(
    ([cropId, amount]) => (game.crops[cropId] ?? 0) >= amount
  );
  const locked = recipe.season > game.season;
  const disabled = locked || queueFull || !canAfford;
 
  return (
    <div
      className="card p-4 space-y-3"
      style={{
        opacity: locked ? 0.4 : 1,
        fontSize: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {recipe.emoji} {recipe.name}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--muted)",
            fontStyle: "italic",
          }}
        >
          {Math.floor(recipe.seconds / 60)}m · yields {recipe.outputAmount}
        </span>
      </div>
 
      {/* Inputs */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          fontSize: "0.75rem",
          color: "var(--muted)",
        }}
      >
        {Object.entries(recipe.inputs).map(([cropId, amount]) => {
          const crop = CROPS[cropId];
          const have = game.crops[cropId] ?? 0;
          const enough = have >= amount;
          return (
            <span
              key={cropId}
              style={{ color: enough ? "var(--text)" : "#ef4444", fontWeight: enough ? 400 : 600 }}
            >
              {crop.emoji} {have}/{amount} {crop.name}
            </span>
          );
        })}
      </div>
 
      <button
        onClick={() => onStartProcessing(recipe.id)}
        disabled={disabled}
        className="btn w-full"
        style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem" }}
      >
        {locked
          ? `Unlocks Season ${recipe.season}`
          : queueFull
          ? "Queue full"
          : !canAfford
          ? "Not enough crops"
          : `Start ${recipe.name}`}
      </button>
    </div>
  );
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function ProcessingZone({ game, onStartProcessing }) {
  const maxSlots =
    1 + game.prestigeBonuses.filter((b) => b === "processing_slot").length;
  const activeQueue = game.processingQueue.filter((i) => !i.done);
  const queueFull = activeQueue.length >= maxSlots;
 
  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "1rem 1rem 4rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>🏭 Kitchen</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Combine crops into processed goods. Queue: {activeQueue.length}/{maxSlots}
        </p>
      </div>
 
      {/* Active queue */}
      {activeQueue.length > 0 && (
        <div className="space-y-3" style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>In progress</h3>
          {activeQueue.map((item) => (
            <QueueItem key={item.id} item={item} />
          ))}
        </div>
      )}
 
      {/* Recipes */}
      <div className="space-y-3">
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600 }}>Recipes</h3>
        {Object.values(PROCESSING_RECIPES).map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            game={game}
            onStartProcessing={onStartProcessing}
            queueFull={queueFull}
          />
        ))}
      </div>
    </div>
  );
}