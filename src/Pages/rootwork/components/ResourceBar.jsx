import React from "react";
import { CROPS, SEASON_FARMS } from "../gameConstants";
import { getTotalWorkersHired, getAvailableWorkerSlots, getEffectivePulseSeconds, getTreasuryGrowBonus, getSchoolGrowBonus, getFishMealGrowBonus, getTownFoodReserve } from "../gameEngine";

export default function ResourceBar({ game }) {
  const availableCropIds = game.season >= 4
    ? [...new Set(game.farms.map((f) => f.crop))]
    : SEASON_FARMS[game.season] ?? ["wheat"];
  const cash = game.cash ?? 0;
  const artisan = game.artisan ?? {};
  const hasArtisan = Object.values(artisan).some((v) => v > 0);
  const animalGoods = game.animalGoods ?? {};
  const hasAnimalGoods = Object.values(animalGoods).some((v) => v > 0);

  // ── Fixed: reads from fishing.fish not pond.fish ──
  const fishGoods = game.fishing?.fish ?? {};
  const hasFish = Object.values(fishGoods).some((v) => v > 0);

  const feast = game.feastBonusPercent ?? 0;
  const townGrowth = game.town?.growthBonusPercent ?? 0;
  const treasuryGrow = getTreasuryGrowBonus(game);
  const schoolGrow = getSchoolGrowBonus(game);
  const fishMealGrow = getFishMealGrowBonus(game);
  const totalGrowBonus = feast + townGrowth + treasuryGrow + schoolGrow + fishMealGrow;
  const starving = game.town?.starving === true;
  const people = Math.floor(game.town?.people ?? 0);
  const satisfaction = game.town?.satisfaction ?? 100;
  const totalWorkers = getTotalWorkersHired(game);
  const atCap = people > 0 && totalWorkers >= people;

  // ── Pulse timer ──
  const effectivePulse = getEffectivePulseSeconds(game);
  const pulseSecondsLeft = Math.ceil(Math.max(0, game.town?.pulseSeconds ?? effectivePulse));
  const pulsePct = Math.min(100, (1 - pulseSecondsLeft / effectivePulse) * 100);
  const bakeryOn = game.town?.bakeryOn === true && (game.town?.bakeryLevel ?? 0) >= 1;
  const foodEmoji = bakeryOn ? "🍞" : "🌾";
  const foodNeeded = getTownFoodReserve(game);
  const foodHave = bakeryOn
    ? Math.floor(game.artisan?.bread ?? 0)
    : Math.floor(game.crops?.wheat ?? 0);
  const canFeed = foodHave >= foodNeeded;

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

      {/* Artisan goods */}
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

      {/* Animal goods */}
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

      {/* Fish inventory — fixed emojis and source */}
      {hasFish && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { key: "minnow", emoji: "🎣" },
            { key: "bass",   emoji: "🐠" },
            { key: "perch",  emoji: "🐡" },
            { key: "rare",   emoji: "✨" },
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>

        <div style={{
          display: "flex", alignItems: "center", gap: "0.25rem",
          fontSize: "0.85rem", fontWeight: 600, color: "#4ade80",
        }}>
          <span>💰</span>
          <span>${Math.floor(cash)}</span>
        </div>

        {totalGrowBonus > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.72rem", fontWeight: 600, color: "#86efac", background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.1rem 0.4rem" }}>
            🌱 +{totalGrowBonus.toFixed(totalGrowBonus % 1 === 0 ? 0 : 1)}%
          </div>
        )}

        {/* Pulse timer — compact */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.35rem",
          background: canFeed ? "rgba(74,222,128,0.07)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${canFeed ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.25)"}`,
          borderRadius: "6px", padding: "0.15rem 0.45rem",
          fontSize: "0.68rem", fontWeight: 600,
          color: canFeed ? "var(--muted)" : "#ef4444",
        }}>
          <span>{foodEmoji}</span>
          <span style={{ color: canFeed ? "var(--text)" : "#ef4444" }}>
            {foodHave}/{foodNeeded}
          </span>
          {/* Mini progress bar */}
          <div style={{ width: "28px", height: "3px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${pulsePct}%`,
              background: canFeed ? "#4ade80" : "#ef4444",
              borderRadius: "999px",
              transition: "width 1s linear",
            }} />
          </div>
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>{pulseSecondsLeft}s</span>
        </div>

        {/* Workers + satisfaction */}
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