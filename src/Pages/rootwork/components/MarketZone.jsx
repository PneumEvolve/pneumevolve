// src/Pages/rootwork/components/MarketZone.jsx
 
import React, { useState } from "react";
import { CROPS, PROCESSING_RECIPES, MARKET_SELL_RATES } from "../gameConstants";
import { getSellRate } from "../gameEngine";
 
const SELLABLE_ITEMS = [
  { type: "wheat",    label: "Wheat",    emoji: "🌾", isCrop: true },
  { type: "berries",  label: "Berries",  emoji: "🫐", isCrop: true },
  { type: "tomatoes", label: "Tomatoes", emoji: "🍅", isCrop: true },
  { type: "bread",    label: "Bread",    emoji: "🍞", isCrop: false },
  { type: "jam",      label: "Jam",      emoji: "🍯", isCrop: false },
  { type: "sauce",    label: "Sauce",    emoji: "🥫", isCrop: false },
];
 
const SELL_AMOUNTS = [1, 10, 50, "All"];
 
function SellCard({ item, game, onSell }) {
  const have = item.isCrop
    ? (game.crops[item.type] ?? 0)
    : (game.artisan[item.type] ?? 0);
 
  const rate = getSellRate(item.type, game.prestigeBonuses ?? []);
  const baseRate = MARKET_SELL_RATES[item.type] ?? 0;
  const hasSavvy = rate > baseRate;
 
  return (
    <div className="card p-3" style={{ fontSize: "0.82rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontWeight: 600 }}>{item.emoji} {item.label}</span>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          {hasSavvy ? (
            <>
              <span style={{ textDecoration: "line-through", marginRight: "0.3rem", color: "var(--border)" }}>
                ${baseRate}
              </span>
              <span style={{ color: "#4ade80", fontWeight: 600 }}>${rate.toFixed(2)}</span>
            </>
          ) : (
            <span>${rate} each</span>
          )}
        </span>
      </div>
 
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
        You have: <strong style={{ color: "var(--text)" }}>{have}</strong>
      </div>
 
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {SELL_AMOUNTS.map((amt) => {
          const quantity = amt === "All" ? have : amt;
          const disabled = have < quantity || quantity <= 0;
          const earnings = (quantity * rate).toFixed(2);
          return (
            <button
              key={amt}
              onClick={() => onSell(item.type, quantity)}
              disabled={disabled}
              className="btn btn-secondary"
              style={{
                fontSize: "0.7rem",
                padding: "0.3rem 0.6rem",
                flex: "1 1 auto",
                opacity: disabled ? 0.4 : 1,
              }}
              title={!disabled ? `Earn $${earnings}` : undefined}
            >
              {amt === "All" ? `All (${have})` : `×${amt}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
 
function SellQueue({ marketQueue, prestigeBonuses }) {
  if (!marketQueue || marketQueue.length === 0) return null;
 
  const totalItems = marketQueue.reduce((s, o) => s + o.quantity, 0);
 
  return (
    <div className="card p-3" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>📦 Sell Queue</span>
        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{totalItems} items · 1/sec</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {marketQueue.map((order) => {
          const item = SELLABLE_ITEMS.find((i) => i.type === order.itemType);
          const rate = getSellRate(order.itemType, prestigeBonuses ?? []);
          const worth = (order.quantity * rate).toFixed(2);
          return (
            <div key={order.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: "0.72rem", color: "var(--muted)",
            }}>
              <span>{item?.emoji ?? "📦"} {item?.label ?? order.itemType} ×{order.quantity}</span>
              <span style={{ color: "#4ade80" }}>≈ ${worth}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
export default function MarketZone({ game, onSell }) {
  const cash = game.cash ?? 0;
  const lifetimeCash = game.lifetimeCash ?? 0;
  const hasSavvy = (game.prestigeBonuses ?? []).includes("market_savvy");
 
  // Filter to items that exist in the current game (don't show tomatoes in season 1)
  const availableItems = SELLABLE_ITEMS.filter((item) => {
    if (item.isCrop) return item.type in game.crops;
    return item.type in game.artisan;
  });
 
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
 
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>💰 Market</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Sell crops and artisan goods for cash. Items sell 1 per second from the queue.
        </p>
      </div>
 
      {/* Cash summary */}
      <div className="card p-4" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#4ade80" }}>
              ${Math.floor(cash).toLocaleString()}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>
              spendable cash
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--muted)" }}>
              ${Math.floor(lifetimeCash).toLocaleString()}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>
              lifetime earned
            </div>
          </div>
        </div>
        {hasSavvy && (
          <div style={{
            marginTop: "0.75rem", fontSize: "0.7rem", color: "#4ade80",
            background: "rgba(74, 222, 128, 0.1)", borderRadius: "6px",
            padding: "0.3rem 0.6rem", textAlign: "center",
          }}>
            💹 Market Savvy active — sell prices boosted
          </div>
        )}
      </div>
 
      {/* Active sell queue */}
      <SellQueue marketQueue={game.marketQueue ?? []} prestigeBonuses={game.prestigeBonuses} />
 
      {/* Sell cards */}
      <div style={{ marginBottom: "0.5rem" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem" }}>Sell Items</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {availableItems.map((item) => (
            <SellCard
              key={item.type}
              item={item}
              game={game}
              onSell={onSell}
            />
          ))}
        </div>
      </div>
 
    </div>
  );
}