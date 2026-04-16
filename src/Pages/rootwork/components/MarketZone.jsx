// src/Pages/rootwork/components/MarketZone.jsx

import React, { useState, useCallback } from "react";
import {
  MARKET_SELL_RATES,
  MARKET_WORKER_GEAR,
  MARKET_WORKER_STANDING_ORDER_COST,
} from "../gameConstants";
import {
  getSellRate,
  getMarketWorkerHireCost,
  getMarketWorkerNextGear,
  getMarketWorkerItemsPerSecond,
  getMarketWorkerQueueTotal,
  getAvailableWorkerSlots,
  getSmartSellAmount,       
  getTownFoodReserve,
} from "../gameEngine";

const SELLABLE_ITEMS = [
  { type: "wheat", label: "Wheat", emoji: "🌾", isCrop: true },
  { type: "berries", label: "Berries", emoji: "🫐", isCrop: true },
  { type: "tomatoes", label: "Tomatoes", emoji: "🍅", isCrop: true },
  { type: "bread", label: "Bread", emoji: "🍞", isCrop: false },
  { type: "jam", label: "Jam", emoji: "🍯", isCrop: false },
  { type: "sauce", label: "Sauce", emoji: "🥫", isCrop: false },
];

const SELL_AMOUNTS = [1, 10, 50, 100, "All"];

function SmartSellButton({ game, itemType, onAssign }) {
  const smartQty = getSmartSellAmount(game, itemType);
  const item = SELLABLE_ITEMS.find((i) => i.type === itemType);
  const have = item
    ? item.isCrop ? (game.crops[item.type] ?? 0) : (game.artisan[item.type] ?? 0)
    : 0;
  const reserve = have - smartQty;
  const bakeryOn = game.town?.bakeryOn === true && (game.town?.bakeryLevel ?? 0) >= 1;
  const foodItem = bakeryOn ? "bread" : "wheat";
  const isFood = itemType === foodItem;
  const label = isFood && reserve > 0 ? `Smart (keep ${reserve})` : "Smart (all)";

  return (
    <button
      onClick={() => smartQty > 0 && onAssign(smartQty)}
      disabled={smartQty <= 0}
      style={{
        fontSize: "0.7rem",
        padding: "0.25rem 0.5rem",
        borderRadius: "6px",
        cursor: smartQty <= 0 ? "default" : "pointer",
        background: "rgba(99,102,241,0.12)",
        color: smartQty <= 0 ? "var(--border)" : "var(--accent)",
        border: `1px solid ${smartQty <= 0 ? "var(--border)" : "var(--accent)"}`,
        opacity: smartQty <= 0 ? 0.4 : 1,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

function MarketWorkerCard({
  worker,
  game,
  onAssign,
  onUpgrade,
  onFire,
  onBuyStandingOrder,
  onSetStandingOrder,
  onCancelQueue,
  expanded,
  onToggle,
  workerNumber,
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [showStandingOrderPicker, setShowStandingOrderPicker] = useState(false);
  const [confirmFire, setConfirmFire] = useState(false);

  const gear = MARKET_WORKER_GEAR[worker.gear];
  const nextGearId = getMarketWorkerNextGear(worker.gear);
  const nextGear = nextGearId ? MARKET_WORKER_GEAR[nextGearId] : null;
  const queueTotal = getMarketWorkerQueueTotal(worker);
  const ips = getMarketWorkerItemsPerSecond(worker);
  const canAffordStandingOrder = (game.cash ?? 0) >= MARKET_WORKER_STANDING_ORDER_COST;

  const estimatedQueueValue = (worker.queue ?? []).reduce((sum, order) => {
    const rate = getSellRate(order.itemType, game.prestigeBonuses ?? []);
    return sum + order.quantity * rate;
  }, 0);

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
    <div className="card" style={{ fontSize: "0.82rem", overflow: "hidden" }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.65rem 1rem",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
        }}
      >
        <button
          onClick={onToggle}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            minWidth: 0,
            padding: 0,
          }}
        >
          <span style={{ fontSize: "1rem" }}>{gear.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
              Seller {workerNumber} · {gear.name}
              {worker.hasStandingOrder && worker.standingOrder && (
                <span style={{ marginLeft: "0.35rem", fontSize: "0.62rem", color: "#4ade80" }}>
                  🔄 {SELLABLE_ITEMS.find((i) => i.type === worker.standingOrder)?.emoji}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>
              {ips} item{ips !== 1 ? "s" : ""}/sec
              {queueTotal > 0
                ? ` · ${queueTotal} queued · ≈$${estimatedQueueValue.toFixed(0)}`
                : worker.hasStandingOrder && worker.standingOrder
                  ? " · auto-selling"
                  : " · queue empty"}
            </div>
          </div>
          <span style={{ color: "var(--muted)", fontSize: "0.65rem", marginLeft: "0.5rem", flexShrink: 0 }}>
            {expanded ? "▲" : "▼"}
          </span>
        </button>
      </div>

      {!expanded && queueTotal > 0 && (
        <div style={{ padding: "0 1rem 0.6rem", fontSize: "0.68rem", color: "var(--muted)" }}>
          Top queue item:{" "}
          <span style={{ color: "var(--text)", fontWeight: 600 }}>
            {(() => {
              const first = worker.queue?.[0];
              const item = SELLABLE_ITEMS.find((i) => i.type === first?.itemType);
              return first ? `${item?.emoji} ${item?.label} ×${first.quantity}` : "None";
            })()}
          </span>
        </div>
      )}

      {expanded && (
        <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {worker.hasStandingOrder && (
            <div
              style={{
                padding: "0.4rem 0.6rem",
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: "6px",
                fontSize: "0.72rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>🔄 Standing Order</span>
                  {worker.standingOrder ? (
                    <span style={{ marginLeft: "0.4rem", color: "var(--text)" }}>
                      {SELLABLE_ITEMS.find((i) => i.type === worker.standingOrder)?.emoji}{" "}
                      {SELLABLE_ITEMS.find((i) => i.type === worker.standingOrder)?.label}
                      <span style={{ color: "var(--muted)", marginLeft: "0.3rem" }}>
                        · pulls {ips}/sec
                      </span>
                    </span>
                  ) : (
                    <span style={{ marginLeft: "0.4rem", color: "var(--muted)" }}>not set</span>
                  )}
                </div>
                <button
                  onClick={() => setShowStandingOrderPicker(!showStandingOrderPicker)}
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.15rem 0.4rem",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "var(--muted)",
                  }}
                >
                  {showStandingOrderPicker ? "▲" : "▼ Change"}
                </button>
              </div>

              {showStandingOrderPicker && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
                  {SELLABLE_ITEMS.map((item) => {
                    const have = item.isCrop ? (game.crops[item.type] ?? 0) : (game.artisan[item.type] ?? 0);
                    const isSelected = worker.standingOrder === item.type;
                    return (
                      <button
                        key={item.type}
                        onClick={() => {
                          onSetStandingOrder(worker.id, item.type);
                          setShowStandingOrderPicker(false);
                        }}
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: isSelected ? "var(--accent)" : "var(--bg)",
                          color: isSelected ? "#fff" : "var(--text)",
                          border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        {item.emoji} {item.label}
                        <span
                          style={{
                            marginLeft: "0.25rem",
                            color: isSelected ? "rgba(255,255,255,0.7)" : "var(--muted)",
                            fontSize: "0.62rem",
                          }}
                        >
                          ({have})
                        </span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      onSetStandingOrder(worker.id, null);
                      setShowStandingOrderPicker(false);
                    }}
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: !worker.standingOrder ? "var(--accent)" : "var(--bg)",
                      color: !worker.standingOrder ? "#fff" : "var(--muted)",
                      border: `1px solid ${!worker.standingOrder ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    ✕ Clear
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              background: "var(--bg)",
              borderRadius: "6px",
              padding: "0.4rem 0.6rem",
              fontSize: "0.72rem",
              color: "var(--muted)",
            }}
          >
            {queueTotal > 0 ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.3rem",
                  }}
                >
                  <span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{queueTotal}</span> items queued
                  </span>
                  <button
                    onClick={() => onCancelQueue(worker.id)}
                    style={{
                      fontSize: "0.62rem",
                      padding: "0.1rem 0.4rem",
                      background: "none",
                      border: "1px solid #ef4444",
                      borderRadius: "4px",
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    Clear queue
                  </button>
                </div>
                {worker.queue.map((order) => {
                  const item = SELLABLE_ITEMS.find((i) => i.type === order.itemType);
                  const rate = getSellRate(order.itemType, game.prestigeBonuses ?? []);
                  return (
                    <div key={order.id} style={{ marginTop: "0.2rem", display: "flex", justifyContent: "space-between" }}>
                      <span>
                        {item?.emoji} {item?.label} ×{order.quantity}
                      </span>
                      <span style={{ color: "#4ade80" }}>≈${(order.quantity * rate).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span>
                {worker.hasStandingOrder && worker.standingOrder
                  ? "Queue empty — will auto-fill from inventory"
                  : "Queue empty — assign items below"}
              </span>
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                marginBottom: "0.4rem",
                fontWeight: 600,
              }}
            >
              Assign to queue manually
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
                      fontSize: "0.7rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      cursor: have > 0 ? "pointer" : "default",
                      background: isSelected ? "var(--accent)" : "var(--bg)",
                      color: isSelected ? "#fff" : have > 0 ? "var(--text)" : "var(--border)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      transition: "all 0.1s",
                    }}
                  >
                    {item.emoji} {have}
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
            fontSize: "0.7rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "6px",
            cursor: disabled ? "default" : "pointer",
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

    <SmartSellButton
      game={game}
      itemType={selectedItem}
      onAssign={(qty) => {
        onAssign(worker.id, selectedItem, qty);
        setSelectedItem(null);
      }}
    />

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

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "0.6rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {!worker.hasStandingOrder && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "0.72rem" }}>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>🔄 Standing Order</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                    Auto-pulls {ips} item{ips !== 1 ? "s" : ""}/sec from inventory to sell queue.
                  </div>
                </div>
                <button
                  onClick={() => onBuyStandingOrder(worker.id)}
                  disabled={!canAffordStandingOrder}
                  className="btn btn-secondary"
                  style={{
                    fontSize: "0.68rem",
                    padding: "0.2rem 0.5rem",
                    marginLeft: "0.5rem",
                    flexShrink: 0,
                    opacity: canAffordStandingOrder ? 1 : 0.5,
                  }}
                >
                  ${MARKET_WORKER_STANDING_ORDER_COST}
                </button>
              </div>
            )}

            {nextGear ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.6rem",
                    marginLeft: "0.5rem",
                    flexShrink: 0,
                  }}
                >
                  ${nextGear.upgradeCost}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: "0.68rem", color: "#4ade80", textAlign: "center" }}>
                ✓ Max gear
              </div>
            )}

            {!confirmFire ? (
              <button
                onClick={() => setConfirmFire(true)}
                style={{
                  fontSize: "0.65rem",
                  color: "var(--muted)",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "0.2rem 0.5rem",
                  cursor: "pointer",
                  alignSelf: "flex-end",
                }}
              >
                Fire
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.3rem", alignSelf: "flex-end" }}>
                <button
                  onClick={() => {
                    onFire(worker.id);
                    setConfirmFire(false);
                  }}
                  style={{
                    fontSize: "0.65rem",
                    color: "#fff",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.2rem 0.5rem",
                    cursor: "pointer",
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmFire(false)}
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--muted)",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "0.2rem 0.5rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketZone({
  game,
  onHireMarketWorker,
  onAssignItem,
  onUpgradeMarketWorker,
  onFireMarketWorker,
  onBuyMarketWorkerStandingOrder,
  onSetMarketWorkerStandingOrder,
  onCancelQueue,
}) {
  const [expandedWorkers, setExpandedWorkers] = useState({});

  const toggleWorker = useCallback((workerId) => {
    setExpandedWorkers((prev) => ({ ...prev, [workerId]: !prev[workerId] }));
  }, []);
const cash = game.cash ?? 0;
const lifetimeCash = game.lifetimeCash ?? 0;
  const atCap = getAvailableWorkerSlots(game) <= 0;
const hireCost = getMarketWorkerHireCost(game);
const isFirstWorker = (game.marketWorkers ?? []).length === 0;
const canAffordCash = isFirstWorker || cash >= hireCost;
const canHire = !atCap && canAffordCash;
  const hasSavvy = (game.prestigeBonuses ?? []).includes("market_savvy");

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem 1rem 5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>💰 Market</h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem" }}>
          Hire market workers to sell your crops and artisan goods for cash.
        </p>
      </div>

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
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.7rem",
              color: "#4ade80",
              background: "rgba(74, 222, 128, 0.1)",
              borderRadius: "6px",
              padding: "0.3rem 0.6rem",
              textAlign: "center",
            }}
          >
            💹 Market Savvy active — sell prices boosted
          </div>
        )}
      </div>

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
              <div
                key={item.type}
                style={{
                  background: "var(--bg)",
                  borderRadius: "6px",
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.68rem",
                }}
              >
                {item.emoji}{" "}
                {boosted ? (
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>${rate.toFixed(2)}</span>
                ) : (
                  <span>${rate}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
  <button
    onClick={onHireMarketWorker}
    disabled={!canHire}
    className="btn w-full"
    style={{ opacity: canHire ? 1 : 0.5 }}
  >
    {atCap
      ? "👥 Town full — grow population to hire"
      : `🛒 Hire Market Worker — ${isFirstWorker ? "Free!" : `$${hireCost}`}`
    }
  </button>
  {isFirstWorker && !atCap && (
    <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", textAlign: "center" }}>
      Each worker manages their own sell queue. Upgrade with Standing Orders to sell automatically.
    </p>
  )}
</div>

      {(game.marketWorkers ?? []).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {game.marketWorkers.map((worker, idx) => (
            <MarketWorkerCard
              key={worker.id}
              worker={worker}
              game={game}
              workerNumber={idx + 1}
              expanded={expandedWorkers[worker.id] ?? false}
              onToggle={() => toggleWorker(worker.id)}
              onAssign={onAssignItem}
              onUpgrade={onUpgradeMarketWorker}
              onFire={onFireMarketWorker}
              onBuyStandingOrder={onBuyMarketWorkerStandingOrder}
              onSetStandingOrder={onSetMarketWorkerStandingOrder}
              onCancelQueue={onCancelQueue}
            />
          ))}
        </div>
      )}
    </div>
  );
}