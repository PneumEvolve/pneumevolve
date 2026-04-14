// src/Pages/rootwork/components/MarketZone.jsx

import React, { useState } from "react";
import { MARKET_SELL_RATES, MARKET_WORKER_GEAR, MARKET_WORKER_GEAR_ORDER } from "../gameConstants";
import {
  getSellRate,
  getMarketWorkerHireCost,
  getMarketWorkerNextGear,
  getMarketWorkerItemsPerSecond,
  getMarketWorkerQueueTotal,
} from "../gameEngine";

const SELLABLE_ITEMS = [
  { type: "wheat",    label: "Wheat",    emoji: "🌾", isCrop: true },
  { type: "berries",  label: "Berries",  emoji: "🫐", isCrop: true },
  { type: "tomatoes", label: "Tomatoes", emoji: "🍅", isCrop: true },
  { type: "bread",    label: "Bread",    emoji: "🍞", isCrop: false },
  { type: "jam",      label: "Jam",      emoji: "🍯", isCrop: false },
  { type: "sauce",    label: "Sauce",    emoji: "🥫", isCrop: false },
];

const SELL_AMOUNTS = [1, 10, 50, 100, "All"];

// ─── Worker card ──────────────────────────────────────────────────────────────

function MarketWorkerCard({ worker, game, onAssign, onUpgrade, onFire }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(10);

  const gear = MARKET_WORKER_GEAR[worker.gear];
  const nextGearId = getMarketWorkerNextGear(worker.gear);
  const nextGear = nextGearId ? MARKET_WORKER_GEAR[nextGearId] : null;
  const queueTotal = getMarketWorkerQueueTotal(worker);
  const ips = getMarketWorkerItemsPerSecond(worker);

  const availableItems = SELLABLE_ITEMS.filter((item) => {
    const have = item.isCrop ? (game.crops[item.type] ?? 0) : (game.artisan[item.type] ?? 0);
    return have > 0;
  });

  function handleAssign() {
    if (!selectedItem) return;
    const item = SELLABLE_ITEMS.find((i) => i.type === selectedItem);
    const have = item.isCrop ? (game.crops[item.type] ?? 0) : (game.artisan[item.type] ?? 0);
    const qty = selectedAmount === "All" ? have : Math.min(selectedAmount, have);
    if (qty <= 0) return;
    onAssign(worker.id, selectedItem, qty);
    setSelectedItem(null);
  }

  return (
    <div className="card p-4" style={{ fontSize: "0.82rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "1.1rem" }}>{gear.emoji}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{gear.name}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
              {ips} item{ips !== 1 ? "s" : ""}/sec
            </div>
          </div>
        </div>
        <button
          onClick={() => onFire(worker.id)}
          style={{
            fontSize: "0.65rem", color: "var(--muted)",
            background: "none", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "0.2rem 0.5rem", cursor: "pointer",
          }}
        >
          Fire
        </button>
      </div>

      {/* Queue status */}
      <div style={{
        background: "var(--bg)", borderRadius: "6px",
        padding: "0.4rem 0.6rem", marginBottom: "0.75rem",
        fontSize: "0.72rem", color: "var(--muted)",
      }}>
        {queueTotal > 0 ? (
          <div>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{queueTotal}</span> items queued
            {worker.queue.map((order) => {
              const item = SELLABLE_ITEMS.find((i) => i.type === order.itemType);
              const rate = getSellRate(order.itemType, game.prestigeBonuses ?? []);
              return (
                <div key={order.id} style={{ marginTop: "0.2rem", display: "flex", justifyContent: "space-between" }}>
                  <span>{item?.emoji} {item?.label} ×{order.quantity}</span>
                  <span style={{ color: "#4ade80" }}>≈${(order.quantity * rate).toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <span>Queue empty — assign items below</span>
        )}
      </div>

      {/* Assign items */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
          Assign to queue
        </div>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          {SELLABLE_ITEMS.map((item) => {
            const have = item.isCrop ? (game.crops[item.type] ?? 0) : (game.artisan[item.type] ?? 0);
            const isSelected = selectedItem === item.type;
            return (
              <button
                key={item.type}
                onClick={() => setSelectedItem(isSelected ? null : item.type)}
                disabled={have <= 0}
                style={{
                  fontSize: "0.7rem", padding: "0.25rem 0.5rem",
                  borderRadius: "6px", cursor: have > 0 ? "pointer" : "default",
                  background: isSelected ? "var(--accent)" : "var(--bg)",
                  color: isSelected ? "#fff" : have > 0 ? "var(--text)" : "var(--border)",
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                  transition: "all 0.1s",
                }}
              >
                {item.emoji} {have > 0 ? have : "0"}
              </button>
            );
          })}
        </div>

        {selectedItem && (
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
            {SELL_AMOUNTS.map((amt) => {
              const item = SELLABLE_ITEMS.find((i) => i.type === selectedItem);
              const have = item
                ? item.isCrop ? (game.crops[item.type] ?? 0) : (game.artisan[item.type] ?? 0)
                : 0;
              const qty = amt === "All" ? have : amt;
              const disabled = have < qty || qty <= 0;
              return (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  disabled={disabled}
                  style={{
                    fontSize: "0.7rem", padding: "0.25rem 0.5rem",
                    borderRadius: "6px", cursor: disabled ? "default" : "pointer",
                    background: selectedAmount === amt ? "var(--accent)" : "var(--bg)",
                    color: selectedAmount === amt ? "#fff" : disabled ? "var(--border)" : "var(--text)",
                    border: `1px solid ${selectedAmount === amt ? "var(--accent)" : "var(--border)"}`,
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  {amt === "All" ? `All (${have})` : `×${amt}`}
                </button>
              );
            })}
            <button
              onClick={handleAssign}
              className="btn"
              style={{ fontSize: "0.7rem", padding: "0.25rem 0.75rem", marginLeft: "auto" }}
            >
              Assign →
            </button>
          </div>
        )}
      </div>

      {/* Gear upgrade */}
      {nextGear && (
        <div style={{
          borderTop: "1px solid var(--border)", paddingTop: "0.6rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Upgrade to {nextGear.emoji} {nextGear.name}
            <span style={{ marginLeft: "0.3rem", color: "var(--text)" }}>
              ({nextGear.itemsPerSecond}/sec)
            </span>
          </div>
          <button
            onClick={() => onUpgrade(worker.id)}
            disabled={(game.cash ?? 0) < nextGear.upgradeCost}
            className="btn btn-secondary"
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.6rem" }}
          >
            ${nextGear.upgradeCost}
          </button>
        </div>
      )}
      {!nextGear && (
        <div style={{
          borderTop: "1px solid var(--border)", paddingTop: "0.6rem",
          fontSize: "0.68rem", color: "#4ade80", textAlign: "center",
        }}>
          ✓ Max gear
        </div>
      )}
    </div>
  );
}

// ─── Main zone ────────────────────────────────────────────────────────────────

export default function MarketZone({ game, onHireMarketWorker, onAssignItem, onUpgradeMarketWorker, onFireMarketWorker }) {
  const cash = game.cash ?? 0;
  const lifetimeCash = game.lifetimeCash ?? 0;
  const hireCost = getMarketWorkerHireCost(game);
  const canHire = cash >= hireCost;
  const hasSavvy = (game.prestigeBonuses ?? []).includes("market_savvy");

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>💰 Market</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Hire market workers to sell your crops and artisan goods for cash.
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

      {/* Sell rates reference */}
      <div className="card p-3" style={{ marginBottom: "1.25rem", fontSize: "0.72rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--muted)" }}>
          Sell rates
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {SELLABLE_ITEMS.map((item) => {
            const rate = getSellRate(item.type, game.prestigeBonuses ?? []);
            const base = MARKET_SELL_RATES[item.type];
            const boosted = rate > base;
            return (
              <div key={item.type} style={{
                background: "var(--bg)", borderRadius: "6px",
                padding: "0.2rem 0.5rem", fontSize: "0.68rem",
              }}>
                {item.emoji} {boosted ? (
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>${rate.toFixed(2)}</span>
                ) : (
                  <span>${rate}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hire worker */}
      <div style={{ marginBottom: "1.25rem" }}>
        <button
          onClick={onHireMarketWorker}
          disabled={!canHire}
          className="btn w-full"
          style={{ opacity: canHire ? 1 : 0.5 }}
        >
          🛒 Hire Market Worker — ${hireCost}
        </button>
        {(game.marketWorkers ?? []).length === 0 && (
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", textAlign: "center" }}>
            Hire a worker to start selling. Each worker manages their own sell queue.
          </p>
        )}
      </div>

      {/* Worker cards */}
      {(game.marketWorkers ?? []).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {game.marketWorkers.map((worker) => (
            <MarketWorkerCard
              key={worker.id}
              worker={worker}
              game={game}
              onAssign={onAssignItem}
              onUpgrade={onUpgradeMarketWorker}
              onFire={onFireMarketWorker}
            />
          ))}
        </div>
      )}

    </div>
  );
}