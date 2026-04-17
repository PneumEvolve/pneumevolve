// src/Pages/rootwork/components/ResourceBar.jsx
 
import React from "react";
import { CROPS, SEASON_FARMS } from "../gameConstants";
import { getTotalWorkersHired, getAvailableWorkerSlots } from "../gameEngine";
 
export default function ResourceBar({ game }) {
  const availableCropIds = game.season >= 4
    ? [...new Set(game.farms.map((f) => f.crop))]
    : SEASON_FARMS[game.season] ?? ["wheat"];
  const cash = game.cash ?? 0;
  const artisan = game.artisan ?? {};
  const hasArtisan = Object.values(artisan).some((v) => v > 0);
 
  const animalGoods = game.animalGoods ?? {};
  const hasAnimalGoods = Object.values(animalGoods).some((v) => v > 0);
  const fishGoods = game.pond?.fish ?? {};
  const hasFish = Object.values(fishGoods).some((v) => v > 0);
  const fishMealBonus = (game.fishMealStacks ?? []).reduce((s, st) => s + (st.secondsLeft > 0 ? st.bonus : 0), 0);
  const townUnlocked = game.town?.unlocked === true;
  const starving = game.town?.starving === true;
  const people = Math.floor(game.town?.people ?? 0);
  const growthBonusPercent = game.town?.growthBonusPercent ?? 0;
  const satisfaction = game.town?.satisfaction ?? 100;
  const totalWorkers = getTotalWorkersHired(game);
  const atCap = people > 0 && totalWorkers >= people;
 
  const satColor = satisfaction >= 110 ? "#4ade80"
    : satisfaction >= 100 ? "#a3e635"
    : satisfaction >= 75 ? "#f59e0b"
    : "#ef4444";
  const satEmoji = satisfaction >= 110 ? "😄" : satisfaction >= 100 ? "😊" : satisfaction >= 75 ? "😐" : "😟";
 
  return (
    <div style={{
      background: "var(--bg-elev)",
      borderBottom: "1px solid var(--border)",
      padding: "0.5rem 1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "0.5rem",
    }}>
 
      {/* Crops */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {availableCropIds.map((cropId) => {
          const crop = CROPS[cropId];
          const amount = game.crops[cropId] ?? 0;
          return (
            <div key={cropId} style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.85rem", fontWeight: 500,
            }}>
              <span>{crop.emoji}</span>
              <span>{Math.floor(amount)}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 400 }}>
                {crop.name}
              </span>
            </div>
          );
        })}
      </div>
 
      {/* Artisan goods — only show if any exist */}
      {hasArtisan && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {Object.entries(artisan).map(([id, amount]) => {
            if (amount <= 0) return null;
            const labels = { bread: "🍞", jam: "🍯", sauce: "🥫" };
            const names = { bread: "Bread", jam: "Jam", sauce: "Sauce" };
            if (!labels[id]) return null;
            return (
              <div key={id} style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                fontSize: "0.85rem", fontWeight: 500,
              }}>
                <span>{labels[id]}</span>
                <span>{Math.floor(amount)}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 400 }}>
                  {names[id]}
                </span>
              </div>
            );
          })}
        </div>
      )}
 
      {/* Animal goods — only show if any exist */}
      {hasAnimalGoods && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { key: "egg", emoji: "🥚" }, { key: "milk", emoji: "🥛" }, { key: "wool", emoji: "🧶" },
            { key: "omelette", emoji: "🍳" }, { key: "cheese", emoji: "🧀" }, { key: "knitted_goods", emoji: "🧥" },
            { key: "fish_pie", emoji: "🥧" }, { key: "smoked_fish", emoji: "🐟" }, { key: "fish_meal", emoji: "🌿" },
          ].map(({ key, emoji }) => {
            const amt = animalGoods[key] ?? 0;
            if (amt <= 0) return null;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                <span>{emoji}</span><span>{Math.floor(amt)}</span>
              </div>
            );
          })}
        </div>
      )}
 
      {/* Fish inventory — only show if any exist */}
      {hasFish && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { key: "minnow", emoji: "🐟" }, { key: "bass", emoji: "🎣" },
            { key: "perch", emoji: "🐠" }, { key: "pike", emoji: "🦈" },
          ].map(({ key, emoji }) => {
            const amt = fishGoods[key] ?? 0;
            if (amt <= 0) return null;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem", fontWeight: 500 }}>
                <span>{emoji}</span><span>{Math.floor(amt)}</span>
              </div>
            );
          })}
        </div>
      )}
 
      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.25rem",
          fontSize: "0.85rem", fontWeight: 600, color: "#4ade80",
        }}>
          <span>💰</span>
          <span>${Math.floor(cash)}</span>
        </div>
        {fishMealBonus > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.72rem", fontWeight: 600, color: "#86efac", background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.1rem 0.4rem" }}>
            🌿 +{fishMealBonus}%
          </div>
        )}
 
        {/* Town status — always shown */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          fontSize: "0.7rem", fontWeight: 600,
          whiteSpace: "nowrap",
        }}>
          <span style={{ color: atCap ? "#f59e0b" : starving ? "#ef4444" : "var(--muted)" }}>
            👥 {totalWorkers}/{people}
          </span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: satColor }}>
            {satEmoji} {satisfaction}%
          </span>
          {growthBonusPercent > 0 && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ color: "#4ade80" }}>+{growthBonusPercent}%</span>
            </>
          )}
        </div>
 
        <div style={{
          fontSize: "0.7rem", color: "var(--muted)", fontWeight: 500,
          letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          Season {game.season}
        </div>
      </div>
 
    </div>
  );
}