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
  getBankPriceBonus,
  getPrestigeSkillCount,
  hasPrestigeSkill,
} from "../gameEngine";
 
const SELLABLE_ITEMS = [
  { type: "wheat",         label: "Wheat",         emoji: "🌾", isCrop: true,   isAnimal: false, isFish: false },
  { type: "berries",       label: "Berries",        emoji: "🫐", isCrop: true,   isAnimal: false, isFish: false },
  { type: "tomatoes",      label: "Tomatoes",       emoji: "🍅", isCrop: true,   isAnimal: false, isFish: false },
  { type: "bread",         label: "Bread",          emoji: "🍞", isCrop: false,  isAnimal: false, isFish: false },
  { type: "jam",           label: "Jam",            emoji: "🍯", isCrop: false,  isAnimal: false, isFish: false },
  { type: "sauce",         label: "Sauce",          emoji: "🥫", isCrop: false,  isAnimal: false, isFish: false },
  { type: "egg",           label: "Egg",            emoji: "🥚", isCrop: false,  isAnimal: true,  isFish: false },
  { type: "milk",          label: "Milk",           emoji: "🥛", isCrop: false,  isAnimal: true,  isFish: false },
  { type: "wool",          label: "Wool",           emoji: "🧶", isCrop: false,  isAnimal: true,  isFish: false },
  { type: "omelette",      label: "Omelette",       emoji: "🍳", isCrop: false,  isAnimal: true,  isFish: false },
  { type: "cheese",        label: "Cheese",         emoji: "🧀", isCrop: false,  isAnimal: true,  isFish: false },
  { type: "knitted_goods", label: "Knitted Goods",  emoji: "🧥", isCrop: false,  isAnimal: true,  isFish: false },
  { type: "minnow", label: "Minnow",    emoji: "🎣", isCrop: false, isAnimal: false, isFish: true },
  { type: "bass",   label: "Bass",      emoji: "🐠", isCrop: false, isAnimal: false, isFish: true },
  { type: "perch",  label: "Perch",     emoji: "🐡", isCrop: false, isAnimal: false, isFish: true },
  { type: "rare",   label: "Rare Fish", emoji: "✨", isCrop: false, isAnimal: false, isFish: true },
  { type: "fish_pie",      label: "Fish Pie",       emoji: "🥧", isCrop: false,  isAnimal: true, isFish: false  },
  { type: "smoked_fish",   label: "Smoked Fish",    emoji: "🐟", isCrop: false,  isAnimal: true, isFish: false  },
  { type: "fish_meal",     label: "Fish Meal",      emoji: "🌿", isCrop: false,  isAnimal: true,  isFish: false },
  // World loot — raw materials from zones
  { type: "iron_ore",      label: "Iron Ore",       emoji: "🪨", isCrop: false,  isAnimal: false, isFish: false, isWorld: true },
  { type: "lumber",        label: "Lumber",         emoji: "🪵", isCrop: false,  isAnimal: false, isFish: false, isWorld: true },
  { type: "herbs",         label: "Herbs",          emoji: "🌿", isCrop: false,  isAnimal: false, isFish: false, isWorld: true },
  { type: "rare_gem",      label: "Rare Gem",       emoji: "💎", isCrop: false,  isAnimal: false, isFish: false, isWorld: true },
  { type: "mana_crystal",   label: "Mana Crystal",   emoji: "🔮", isCrop: false,  isAnimal: false, isFish: false, isWorld: true },
  { type: "titan_core",     label: "Titan Core",     emoji: "💠", isCrop: false,  isAnimal: false, isFish: false, isWorld: true },
  // Forge goods — swords
  { type: "iron_sword",    label: "Iron Sword",     emoji: "⚔️",  isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "steel_sword",   label: "Steel Sword",    emoji: "🗡️",  isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "master_sword",  label: "Master Sword",   emoji: "🔱", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  // Forge goods — shields
  { type: "iron_shield",   label: "Iron Shield",    emoji: "🛡️",  isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "steel_shield",  label: "Steel Shield",   emoji: "🔰", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "tower_shield",  label: "Tower Shield",   emoji: "🏰", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  // Forge goods — body armor
  { type: "leather_armor", label: "Leather Armor",  emoji: "🥋", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "chainmail",     label: "Chainmail",      emoji: "⛓️", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "plate_armor",   label: "Plate Armor",    emoji: "🪖", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  { type: "hunting_bow",   label: "Hunting Bow",    emoji: "🏹", isCrop: false,  isAnimal: false, isFish: false, isForge: true },
  // Upgrade components — craftable in forge, sellable if surplus
  { type: "iron_fitting",      label: "Iron Fitting",      emoji: "🔩", isCrop: false, isAnimal: false, isFish: false, isForge: true },
  { type: "reinforced_crate",  label: "Reinforced Crate",  emoji: "📦", isCrop: false, isAnimal: false, isFish: false, isForge: true },
  { type: "fine_tools",        label: "Fine Tools",        emoji: "🛠️", isCrop: false, isAnimal: false, isFish: false, isForge: true },
];
 
// ─── Shared stock helper ──────────────────────────────────────────────────────
function getItemStock(game, item) {
  if (item.isCrop)   return Math.floor(game.crops?.[item.type] ?? 0);
  if (item.isAnimal) return Math.floor(game.animalGoods?.[item.type] ?? 0);
  if (item.isFish)   return Math.floor(game.fishing?.fish?.[item.type] ?? 0);
  if (item.isForge)  return Math.floor(game.forgeGoods?.[item.type] ?? 0);
  if (item.isWorld)  return Math.floor(game.worldResources?.[item.type] ?? 0);
  return Math.floor(game.artisan?.[item.type] ?? 0);
}

// ─── Inventory categories for the panel ──────────────────────────────────────
const INVENTORY_CATEGORIES = [
  { id: "crops",   label: "🌾 Crops",   types: ["wheat", "berries", "tomatoes"] },
  { id: "artisan", label: "🍞 Artisan",  types: ["bread", "jam", "sauce"] },
  { id: "animal",  label: "🐄 Animal",   types: ["egg", "milk", "wool", "omelette", "cheese", "knitted_goods", "fish_pie", "smoked_fish", "fish_meal"] },
  { id: "fish",    label: "🎣 Fish",     types: ["minnow", "bass", "perch", "rare"] },
  { id: "world",   label: "🪨 World",    types: ["iron_ore", "lumber", "herbs", "rare_gem", "mana_crystal", "titan_core"] },
  { id: "forge",   label: "⚒️ Forge",   types: ["iron_sword", "steel_sword", "master_sword", "iron_shield", "steel_shield", "tower_shield", "leather_armor", "chainmail", "plate_armor", "hunting_bow", "iron_fitting", "reinforced_crate", "fine_tools"] },
];

// ─── Sell Assign Modal ────────────────────────────────────────────────────────
function SellAssignModal({ game, item, onClose, onAssign, onSetStandingOrder }) {
  const [selectedQtyMode, setSelectedQtyMode] = React.useState(10);
  const [customInput, setCustomInput] = React.useState("");
  const [selectedWorkerId, setSelectedWorkerId] = React.useState(
    (game.marketWorkers ?? [])[0]?.id ?? null
  );

  const workers = game.marketWorkers ?? [];
  const have = getItemStock(game, item);
  const bankBonus = getBankPriceBonus(game);
  const rate = getSellRate(item.type, game.prestigeBonuses ?? [], bankBonus, game);

  function resolveQty() {
    if (selectedQtyMode === "All") return have;
    if (selectedQtyMode === "Custom") return Math.min(Math.max(1, parseInt(customInput, 10) || 0), have);
    if (selectedQtyMode === "smart") return Math.min(getSmartSellAmount(game, item.type), have);
    return Math.min(selectedQtyMode, have);
  }

  const finalQty = resolveQty();
  const estValue = (finalQty * rate).toFixed(0);
  const worker = workers.find((w) => w.id === selectedWorkerId);
  const workerHasStanding = worker?.hasStandingOrder;
  const isCurrentStanding = worker?.standingOrder === item.type;

  function handleConfirm() {
    if (!selectedWorkerId || finalQty <= 0) return;
    onAssign(selectedWorkerId, item.type, finalQty);
    onClose();
  }

  function handleSetStanding() {
    if (!selectedWorkerId || !workerHasStanding) return;
    onSetStandingOrder(selectedWorkerId, item.type);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elev)",
          borderTop: "1px solid var(--border)",
          borderRadius: "16px 16px 0 0",
          width: "100%", maxWidth: "480px",
          padding: "1.25rem 1rem 2rem",
          display: "flex", flexDirection: "column", gap: "0.85rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>{item.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                {have.toLocaleString()} in stock ·{" "}
                <span style={{ color: "#4ade80" }}>${rate.toFixed(2)}/ea</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0.2rem 0.4rem" }}
          >✕</button>
        </div>

        {workers.length === 0 ? (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", padding: "0.5rem" }}>
            No market workers hired yet. Hire one below.
          </div>
        ) : (
          <>
            {/* Worker picker */}
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.4rem" }}>Assign to worker</div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {workers.map((w, idx) => {
                  const gear = MARKET_WORKER_GEAR[w.gear];
                  const isSelected = w.id === selectedWorkerId;
                  const qTotal = w.queue?.reduce((s, o) => s + o.quantity, 0) ?? 0;
                  const isTheirStanding = w.hasStandingOrder && w.standingOrder === item.type;
                  return (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      style={{
                        fontSize: "0.7rem", padding: "0.3rem 0.6rem",
                        borderRadius: "8px", cursor: "pointer",
                        background: isSelected ? "var(--accent)" : "var(--bg)",
                        color: isSelected ? "#fff" : "var(--text)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1rem",
                        minWidth: "52px",
                      }}
                    >
                      <span>{gear.emoji}</span>
                      <span style={{ fontWeight: 600 }}>#{idx + 1}</span>
                      {isTheirStanding && (
                        <span style={{ fontSize: "0.56rem", color: isSelected ? "rgba(255,255,255,0.85)" : "#4ade80" }}>🔄 SO</span>
                      )}
                      {qTotal > 0 && (
                        <span style={{ fontSize: "0.56rem", color: isSelected ? "rgba(255,255,255,0.6)" : "var(--muted)" }}>{qTotal} q</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity picker */}
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.4rem" }}>Quantity</div>
              <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                {[1, 10, 50, 100, "All", "Custom"].map((amt) => {
                  if (amt === "Custom") {
                    return (
                      <button key="Custom" onClick={() => setSelectedQtyMode("Custom")}
                        style={{
                          fontSize: "0.7rem", padding: "0.25rem 0.5rem", borderRadius: "6px", cursor: "pointer",
                          background: selectedQtyMode === "Custom" ? "var(--accent)" : "var(--bg)",
                          color: selectedQtyMode === "Custom" ? "#fff" : "var(--text)",
                          border: `1px solid ${selectedQtyMode === "Custom" ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >Custom</button>
                    );
                  }
                  const q = amt === "All" ? have : amt;
                  const disabled = q > have || q <= 0;
                  return (
                    <button key={amt} onClick={() => !disabled && setSelectedQtyMode(amt)} disabled={disabled}
                      style={{
                        fontSize: "0.7rem", padding: "0.25rem 0.5rem", borderRadius: "6px",
                        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
                        background: selectedQtyMode === amt ? "var(--accent)" : "var(--bg)",
                        color: selectedQtyMode === amt ? "#fff" : disabled ? "var(--border)" : "var(--text)",
                        border: `1px solid ${selectedQtyMode === amt ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      {amt === "All" ? `All (${have})` : `×${amt}`}
                    </button>
                  );
                })}
                {/* Smart button — mirrors SmartSellButton but inline in the modal */}
                {(() => {
                  const smartQty = getSmartSellAmount(game, item.type);
                  const bakeryOn = game.town?.bakeryOn === true && (game.town?.bakeryLevel ?? 0) >= 1;
                  const foodItem = bakeryOn ? "bread" : "wheat";
                  const isFood = item.type === foodItem;
                  const reserve = have - smartQty;
                  const label = isFood && reserve > 0 ? `Smart (keep ${reserve})` : "Smart (all)";
                  const isSelected = selectedQtyMode === "smart";
                  return (
                    <button
                      key="smart"
                      onClick={() => smartQty > 0 && setSelectedQtyMode("smart")}
                      disabled={smartQty <= 0}
                      style={{
                        fontSize: "0.7rem", padding: "0.25rem 0.5rem", borderRadius: "6px",
                        cursor: smartQty <= 0 ? "default" : "pointer",
                        background: isSelected ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)",
                        color: smartQty <= 0 ? "var(--border)" : isSelected ? "#fff" : "var(--accent)",
                        border: `1px solid ${smartQty <= 0 ? "var(--border)" : isSelected ? "var(--accent)" : "var(--accent)"}`,
                        opacity: smartQty <= 0 ? 0.4 : 1,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </button>
                  );
                })()}
              </div>
              {selectedQtyMode === "Custom" && (
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.4rem" }}>
                  <input
                    type="number" min={1} max={have}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder={`1–${have}`}
                    style={{
                      width: "90px", fontSize: "0.72rem", padding: "0.2rem 0.4rem",
                      borderRadius: "6px", border: "1px solid var(--border)",
                      background: "var(--bg)", color: "var(--text)",
                    }}
                  />
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>of {have}</span>
                </div>
              )}
            </div>

            {/* Value preview */}
            {finalQty > 0 && (
              <div style={{
                background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)",
                borderRadius: "8px", padding: "0.4rem 0.65rem",
                fontSize: "0.72rem", color: "var(--muted)",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{item.emoji} {item.label} ×{finalQty.toLocaleString()}</span>
                <span style={{ color: "#4ade80", fontWeight: 700 }}>≈${estValue}</span>
              </div>
            )}

            {/* Standing order — only if worker has upgrade */}
            {workerHasStanding && (
              <button
                onClick={handleSetStanding}
                style={{
                  fontSize: "0.72rem", padding: "0.4rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                  background: isCurrentStanding ? "rgba(74,222,128,0.15)" : "var(--bg)",
                  color: isCurrentStanding ? "#4ade80" : "var(--muted)",
                  border: `1px solid ${isCurrentStanding ? "rgba(74,222,128,0.4)" : "var(--border)"}`,
                  fontWeight: 600, textAlign: "left",
                }}
              >
                {isCurrentStanding ? "🔄 Standing Order set — tap to refresh" : "🔄 Set as Standing Order instead"}
              </button>
            )}

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              disabled={finalQty <= 0 || !selectedWorkerId}
              className="btn w-full"
              style={{ opacity: finalQty > 0 && selectedWorkerId ? 1 : 0.5, fontSize: "0.82rem", padding: "0.6rem" }}
            >
              Add to Queue →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Inventory Sell Panel ─────────────────────────────────────────────────────
function InventorySellPanel({ game, onAssignItem, onSetMarketWorkerStandingOrder }) {
  const [open, setOpen] = React.useState(true);
  const [activeCategory, setActiveCategory] = React.useState("crops");
  const [selectedItem, setSelectedItem] = React.useState(null);
  const bankBonus = getBankPriceBonus(game);

  const allItemsByType = Object.fromEntries(SELLABLE_ITEMS.map((i) => [i.type, i]));
  const totalStock = SELLABLE_ITEMS.reduce((s, item) => s + getItemStock(game, item), 0);

  const category = INVENTORY_CATEGORIES.find((c) => c.id === activeCategory);
  const categoryItems = (category?.types ?? []).map((t) => allItemsByType[t]).filter(Boolean);

  return (
    <>
      {selectedItem && (
        <SellAssignModal
          game={game}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAssign={onAssignItem}
          onSetStandingOrder={onSetMarketWorkerStandingOrder}
        />
      )}

      <div className="card" style={{ marginBottom: "1.25rem", overflow: "hidden" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.55rem 0.75rem", background: "none", border: "none", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)" }}>
            Inventory
            {totalStock > 0 && (
              <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "var(--text)", fontWeight: 700 }}>
                ({totalStock.toLocaleString()})
              </span>
            )}
          </span>
          <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <>
            {/* Category pill tabs */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "0.3rem",
              padding: "0 0.65rem 0.5rem",
            }}>
              {INVENTORY_CATEGORIES.map((cat) => {
                const catTotal = cat.types.reduce((s, t) => {
                  const item = allItemsByType[t];
                  return item ? s + getItemStock(game, item) : s;
                }, 0);
                const isActive = cat.id === activeCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      flexShrink: 0, fontSize: "0.67rem", fontWeight: 600,
                      padding: "0.22rem 0.55rem", borderRadius: "20px", cursor: "pointer",
                      background: isActive ? "var(--accent)" : "var(--bg)",
                      color: isActive ? "#fff" : catTotal > 0 ? "var(--text)" : "var(--muted)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      opacity: catTotal === 0 && !isActive ? 0.4 : 1,
                    }}
                  >
                    {cat.label}
                    {catTotal > 0 && (
                      <span style={{ marginLeft: "0.3rem", fontWeight: 400, opacity: 0.8 }}>
                        {catTotal.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Item grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0 0.65rem 0.65rem" }}>
              {categoryItems.map((item) => {
                const stock = getItemStock(game, item);
                const rate = getSellRate(item.type, game.prestigeBonuses ?? [], bankBonus, game);
                const hasStock = stock > 0;
                const onStandingOrder = (game.marketWorkers ?? []).some(
                  (w) => w.hasStandingOrder && w.standingOrder === item.type
                );
                return (
                  <button
                    key={item.type}
                    onClick={() => hasStock && setSelectedItem(item)}
                    style={{
                      minWidth: "62px", flex: "1 1 62px", textAlign: "center",
                      padding: "0.45rem 0.3rem", borderRadius: "8px",
                      cursor: hasStock ? "pointer" : "default",
                      background: "var(--bg)",
                      border: `1px solid ${onStandingOrder ? "rgba(74,222,128,0.4)" : hasStock ? "rgba(255,255,255,0.07)" : "var(--border)"}`,
                      opacity: hasStock ? 1 : 0.3,
                      position: "relative",
                    }}
                  >
                    {onStandingOrder && (
                      <span style={{
                        position: "absolute", top: "3px", right: "4px",
                        fontSize: "0.5rem", color: "#4ade80",
                      }}>🔄</span>
                    )}
                    <div style={{ fontSize: "1.1rem" }}>{item.emoji}</div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: hasStock ? "var(--text)" : "var(--muted)" }}>
                      {stock.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.55rem", color: "var(--muted)", marginTop: "0.05rem" }}>
                      ${rate.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>

            {(game.marketWorkers ?? []).length === 0 && (
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center", padding: "0 0.65rem 0.65rem" }}>
                Hire a market worker below to assign items.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}


const SELL_AMOUNTS = [1, 10, 50, 100, "All", "Custom"];
 
function SmartSellButton({ game, itemType, onAssign }) {
  const smartQty = getSmartSellAmount(game, itemType);
  const item = SELLABLE_ITEMS.find((i) => i.type === itemType);
  const have = item
  ? item.isCrop
    ? (game.crops[item.type] ?? 0)
    : item.isAnimal
      ? (game.animalGoods?.[item.type] ?? 0)
      : item.isFish
        ? (game.fishing?.fish?.[item.type] ?? 0)
        : item.isForge
          ? (game.forgeGoods?.[item.type] ?? 0)
          : item.isWorld
            ? (game.worldResources?.[item.type] ?? 0)
            : (game.artisan[item.type] ?? 0)
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
  onSetRateLimit,
  expanded,
  onToggle,
  workerNumber,
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [showStandingOrderPicker, setShowStandingOrderPicker] = useState(false);
  const [confirmFire, setConfirmFire] = useState(false);
 
  const gear = MARKET_WORKER_GEAR[worker.gear];
  const nextGearId = getMarketWorkerNextGear(worker.gear);
  const nextGear = nextGearId ? MARKET_WORKER_GEAR[nextGearId] : null;
  const queueTotal = getMarketWorkerQueueTotal(worker);
  const ips = getMarketWorkerItemsPerSecond(worker);
  const canAffordStandingOrder = (game.cash ?? 0) >= MARKET_WORKER_STANDING_ORDER_COST;
 
  const estimatedQueueValue = (worker.queue ?? []).reduce((sum, order) => {
    const rate = getSellRate(order.itemType, game.prestigeBonuses ?? [], getBankPriceBonus(game), game);
    return sum + order.quantity * rate;
  }, 0);
 
  function handleAssign() {
    if (!selectedItem) return;
    const item = SELLABLE_ITEMS.find((i) => i.type === selectedItem);
    const have = item.isCrop
  ? (game.crops[item.type] ?? 0)
  : item.isAnimal
    ? (game.animalGoods[item.type] ?? 0)
    : item.isFish
      ? (game.fishing?.fish?.[item.type] ?? 0)
      : item.isForge
        ? (game.forgeGoods?.[item.type] ?? 0)
        : item.isWorld
          ? (game.worldResources?.[item.type] ?? 0)
          : (game.artisan[item.type] ?? 0);
    let qty;
    if (selectedAmount === "All") {
      qty = have;
    } else if (selectedAmount === "Custom") {
      qty = Math.min(Math.max(1, parseInt(customAmount, 10) || 0), have);
    } else {
      qty = Math.min(selectedAmount, have);
    }
    if (qty <= 0) return;
    onAssign(worker.id, selectedItem, qty);
    setSelectedItem(null);
    setCustomAmount("");
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
                    const have = item.isCrop
  ? (game.crops[item.type] ?? 0)
  : item.isAnimal
    ? (game.animalGoods[item.type] ?? 0)
    : item.isFish
      ? (game.fishing?.fish?.[item.type] ?? 0)
      : item.isForge
        ? (game.forgeGoods?.[item.type] ?? 0)
        : item.isWorld
          ? (game.worldResources?.[item.type] ?? 0)
          : (game.artisan[item.type] ?? 0);
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

              {/* Pull speed limit — only relevant for standing orders */}
              <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(74,222,128,0.2)" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.3rem" }}>
                  ⚡ Pull speed limit
                  <span style={{ marginLeft: "0.3rem", fontWeight: 400 }}>Gear max: {ips}/sec</span>
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {[1, 2, 4, 10, 20].filter((n) => n <= ips).map((n) => (
                    <button
                      key={n}
                      onClick={() => onSetRateLimit(worker.id, n)}
                      style={{
                        fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: "6px",
                        cursor: "pointer", fontWeight: 700,
                        background: (worker.sellRateLimit ?? ips) === n ? "rgba(99,102,241,0.2)" : "var(--bg)",
                        border: `1px solid ${(worker.sellRateLimit ?? ips) === n ? "var(--accent)" : "var(--border)"}`,
                        color: (worker.sellRateLimit ?? ips) === n ? "var(--accent)" : "var(--muted)",
                      }}
                    >
                      {n}/sec
                    </button>
                  ))}
                  <button
                    onClick={() => onSetRateLimit(worker.id, null)}
                    style={{
                      fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: "6px",
                      cursor: "pointer", fontWeight: 700,
                      background: worker.sellRateLimit == null ? "rgba(99,102,241,0.2)" : "var(--bg)",
                      border: `1px solid ${worker.sellRateLimit == null ? "var(--accent)" : "var(--border)"}`,
                      color: worker.sellRateLimit == null ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    Max
                  </button>
                </div>
              </div>
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
                  const rate = getSellRate(order.itemType, game.prestigeBonuses ?? [], getBankPriceBonus(game), game);
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
                const have = item.isCrop
  ? (game.crops[item.type] ?? 0)
  : item.isAnimal
    ? (game.animalGoods[item.type] ?? 0)
    : item.isFish
      ? (game.fishing?.fish?.[item.type] ?? 0)
      : item.isForge
        ? (game.forgeGoods?.[item.type] ?? 0)
        : item.isWorld
          ? (game.worldResources?.[item.type] ?? 0)
          : (game.artisan[item.type] ?? 0);
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
 
            {selectedItem && (() => {
  const item = SELLABLE_ITEMS.find((i) => i.type === selectedItem);
  const have = item
    ? item.isCrop
      ? (game.crops[item.type] ?? 0)
      : item.isAnimal
        ? (game.animalGoods?.[item.type] ?? 0)
        : item.isFish
          ? (game.fishing?.fish?.[item.type] ?? 0)
          : item.isForge
            ? (game.forgeGoods?.[item.type] ?? 0)
            : item.isWorld
              ? (game.worldResources?.[item.type] ?? 0)
              : (game.artisan[item.type] ?? 0)
    : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
        {SELL_AMOUNTS.map((amt) => {
          if (amt === "Custom") {
            const isSelected = selectedAmount === "Custom";
            return (
              <button
                key="Custom"
                onClick={() => setSelectedAmount("Custom")}
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
                Custom
              </button>
            );
          }
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

      {selectedAmount === "Custom" && (() => {
        const parsed = parseInt(customAmount, 10) || 0;
        const clamped = Math.min(Math.max(0, parsed), have);
        const valid = clamped > 0;
        return (
          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={have}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`1–${have}`}
              style={{
                width: "90px",
                fontSize: "0.72rem",
                padding: "0.2rem 0.4rem",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
              of {have}
              {valid && (
                <span style={{ color: "#4ade80", marginLeft: "0.3rem" }}>
                  ≈${(clamped * getSellRate(selectedItem, game.prestigeBonuses ?? [], getBankPriceBonus(game), game)).toFixed(0)}
                </span>
              )}
            </span>
          </div>
        );
      })()}
    </div>
  );
})()}
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
 
            {nextGear ? (() => {
              const matsOk = canAffordMats(nextGear.upgradeRequires, game.worldResources, game.forgeGoods);
              const canUpgrade = (game.cash ?? 0) >= nextGear.upgradeCost && matsOk;
              const matLabel = matCostLabel(nextGear.upgradeRequires);
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Upgrade to {nextGear.emoji} {nextGear.name}
                      <span style={{ marginLeft: "0.3rem", color: "var(--text)" }}>
                        ({nextGear.itemsPerSecond}/sec)
                      </span>
                      {matLabel && (
                        <span style={{ display: "block", fontSize: "0.62rem", color: matsOk ? "#fbbf24" : "#ef4444", fontWeight: 600, marginTop: "0.1rem" }}>
                          {matLabel}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onUpgrade(worker.id)}
                      disabled={!canUpgrade}
                      className="btn btn-secondary"
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.25rem 0.6rem",
                        marginLeft: "0.5rem",
                        flexShrink: 0,
                        opacity: canUpgrade ? 1 : 0.5,
                      }}
                    >
                      ${nextGear.upgradeCost}
                    </button>
                  </div>
                </div>
              );
            })() : (
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
export default function MarketZone({
  game,
  onHireMarketWorker,
  onAssignItem,
  onUpgradeMarketWorker,
  onFireMarketWorker,
  onBuyMarketWorkerStandingOrder,
  onSetMarketWorkerStandingOrder,
  onCancelQueue,
  onSetMarketWorkerRateLimit,
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
  const sharpEyeCount = getPrestigeSkillCount(game, "sharp_eye");
  const hasSavvy = hasPrestigeSkill(game, "market_savvy") || (game.prestigeBonuses ?? []).includes("market_savvy");
  const hasBulkDealer = hasPrestigeSkill(game, "bulk_dealer");
  const anyPriceSkill = sharpEyeCount > 0 || hasSavvy;
  const bankBonus = getBankPriceBonus(game);

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
        {anyPriceSkill && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {sharpEyeCount > 0 && (
              <div style={{ fontSize: "0.7rem", color: "#4ade80", background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.3rem 0.6rem", textAlign: "center" }}>
                👁️ Sharp Eye active — +{sharpEyeCount * 10}% sales{sharpEyeCount > 1 ? ` (×${sharpEyeCount})` : ""}
              </div>
            )}
            {hasSavvy && (
              <div style={{ fontSize: "0.7rem", color: "#4ade80", background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.3rem 0.6rem", textAlign: "center" }}>
                💹 Market Savvy active — +25% sales
              </div>
            )}
            {hasBulkDealer && (
              <div style={{ fontSize: "0.7rem", color: "#4ade80", background: "rgba(74,222,128,0.1)", borderRadius: "6px", padding: "0.3rem 0.6rem", textAlign: "center" }}>
                📦 Bulk Dealer active — sell speed +20%
              </div>
            )}
          </div>
        )}
      </div>
 
      <div className="card p-3" style={{ marginBottom: "1.25rem", fontSize: "0.72rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--muted)" }}>
          Sell rates
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {SELLABLE_ITEMS.map((item) => {
            const rate = getSellRate(item.type, game.prestigeBonuses ?? [], bankBonus, game);
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
 
      <InventorySellPanel
        game={game}
        onAssignItem={onAssignItem}
        onSetMarketWorkerStandingOrder={onSetMarketWorkerStandingOrder}
      />

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
              onSetRateLimit={onSetMarketWorkerRateLimit}
            />
          ))}
        </div>
      )}
    </div>
  );
}