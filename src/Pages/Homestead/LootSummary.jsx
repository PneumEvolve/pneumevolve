// src/Pages/Homestead/LootSummary.jsx
// End-of-run screen. Shows collected loot, lets player keep it in their
// personal inventory or deposit some/all into the shared chest.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHearthroom } from "./useHearthroom";
import { ITEM_ICONS, ITEM_LABELS, mergeIntoChest, normalizeChest } from "./Items";

// ─── Loot row (animated entry) ────────────────────────────────────────────────
function LootRow({ item, qty, delay, selected, onToggle, overflow }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      onClick={overflow ? undefined : onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 8,
        background: overflow
          ? "rgba(255,80,80,0.05)"
          : selected
            ? "rgba(200,230,120,0.08)"
            : "rgba(255,255,255,0.04)",
        border: overflow
          ? "1px solid rgba(255,80,80,0.2)"
          : selected
            ? "1px solid rgba(200,230,120,0.3)"
            : "1px solid rgba(255,255,255,0.07)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.3s ease, transform 0.3s ease, background 0.15s ease",
        cursor: overflow ? "default" : "pointer",
      }}
    >
      <span style={{ fontSize: 22 }}>{ITEM_ICONS[item] ?? "📦"}</span>
      <span style={{ flex: 1, fontSize: 13, color: overflow ? "rgba(255,140,120,0.7)" : "rgba(245,230,200,0.7)", fontFamily: "monospace" }}>
        {ITEM_LABELS[item] ?? item}
        {overflow && <span style={{ fontSize: 10, color: "rgba(255,120,100,0.6)", marginLeft: 6 }}>· didn't fit</span>}
      </span>
      <span style={{ fontSize: 18, fontWeight: 400, color: overflow ? "rgba(255,120,100,0.6)" : "rgba(200,230,120,0.9)", fontFamily: "monospace" }}>
        +{qty}
      </span>
      {!overflow && (
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1px solid ${selected ? "rgba(200,230,120,0.6)" : "rgba(255,255,255,0.2)"}`,
          background: selected ? "rgba(200,230,120,0.2)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "rgba(200,230,120,0.9)", flexShrink: 0,
        }}>
          {selected ? "✓" : ""}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LootSummary({
  room,
  runLoot,        // plain { [itemId]: qty } from the run
  kills,
  overflow,       // { [itemId]: qty } that couldn't fit in player inventory
  playerInventory,// current PlayerInventory after loot was added
  chest,          // current shared chest { [itemId]: qty }
  onReturnHome,
  onPlayerInventoryUpdate,
  onChestUpdate,
}) {
  const { sendChestUpdated } = useHearthroom(room?.id ?? null, useRef({}).current);

  // Items that landed in player inventory (not overflow)
  const keptEntries = Object.entries(runLoot ?? {})
    .filter(([k, v]) => v > 0 && k !== "kills" && !(overflow?.[k] > 0));
  const overflowEntries = Object.entries(overflow ?? {}).filter(([, v]) => v > 0);

  // Which kept items the player wants to move to chest
  const [toDeposit, setToDeposit] = useState(new Set());

  const toggleDeposit = useCallback((itemId) => {
    setToDeposit(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAll   = () => setToDeposit(new Set(keptEntries.map(([k]) => k)));
  const selectNone  = () => setToDeposit(new Set());

  // Overflow items always go to chest (can't carry them)
  const handleConfirm = useCallback(() => {
    // Build what goes to chest: selected kept items + all overflow
    let newChest = normalizeChest(chest);
    const nextPlayerItems = { ...(playerInventory?.items ?? {}) };

    // Move selected kept items from player inventory to chest
    for (const itemId of toDeposit) {
      const qty = runLoot?.[itemId] ?? 0;
      if (!qty) continue;
      // Remove from player inventory
      const have = nextPlayerItems[itemId] ?? 0;
      const remove = Math.min(qty, have);
      if (remove > 0) {
        nextPlayerItems[itemId] = have - remove;
        if (nextPlayerItems[itemId] <= 0) delete nextPlayerItems[itemId];
        newChest = mergeIntoChest(newChest, { [itemId]: remove });
      }
    }

    // Overflow goes straight to chest
    for (const [itemId, qty] of overflowEntries) {
      newChest = mergeIntoChest(newChest, { [itemId]: qty });
    }

    const nextPlayerInv = { ...playerInventory, items: nextPlayerItems };
    onPlayerInventoryUpdate?.(nextPlayerInv);
    onChestUpdate?.(newChest);
    sendChestUpdated(newChest);
    onReturnHome?.();
  }, [toDeposit, runLoot, overflowEntries, playerInventory, chest, onPlayerInventoryUpdate, onChestUpdate, sendChestUpdated, onReturnHome]);

  const hasAnything = keptEntries.length > 0 || overflowEntries.length > 0;

  return (
    <main style={{
      height: "100svh",
      maxHeight: "100svh",
      background: "#0a120a",
      color: "#f5e6c8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 0,
      fontFamily: "monospace",
      padding: "28px 24px 20px",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
          run complete
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 400, color: "rgba(200,230,160,0.9)", letterSpacing: "0.05em" }}>
          back home
        </h1>
        {kills > 0 && (
          <p style={{ fontSize: 12, color: "rgba(255,160,80,0.7)", marginTop: 6 }}>
            {kills} {kills === 1 ? "kill" : "kills"}
          </p>
        )}
      </div>

      {!hasAnything && (
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(245,230,200,0.25)", marginBottom: 24 }}>
          nothing collected this run
        </p>
      )}

      {hasAnything && (
        <>
          {/* Instructions */}
          <div style={{ width: "100%", maxWidth: 340, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.1em" }}>
              TAP TO DEPOSIT INTO CHEST
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{ fontSize: 9, color: "rgba(200,230,120,0.6)", background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}>ALL</button>
              <button onClick={selectNone} style={{ fontSize: 9, color: "rgba(245,230,200,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}>NONE</button>
            </div>
          </div>

          {/* Loot list */}
          <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 6, maxHeight: "46vh", overflowY: "auto", paddingRight: 4, marginBottom: 16 }}>
            {keptEntries.map(([item, qty], i) => (
              <LootRow
                key={item} item={item} qty={qty} delay={i * 100}
                selected={toDeposit.has(item)}
                onToggle={() => toggleDeposit(item)}
                overflow={false}
              />
            ))}
            {overflowEntries.map(([item, qty], i) => (
              <LootRow
                key={`ov_${item}`} item={item} qty={qty}
                delay={(keptEntries.length + i) * 100}
                selected={false} overflow={true}
              />
            ))}
          </div>

          {/* Summary note */}
          {(toDeposit.size > 0 || overflowEntries.length > 0) && (
            <div style={{ width: "100%", maxWidth: 340, fontSize: 10, color: "rgba(200,230,120,0.4)", textAlign: "center", marginBottom: 12, lineHeight: 1.7 }}>
              {toDeposit.size > 0 && <div>→ {toDeposit.size} item type{toDeposit.size !== 1 ? "s" : ""} moving to shared chest</div>}
              {overflowEntries.length > 0 && <div>→ {overflowEntries.length} item type{overflowEntries.length !== 1 ? "s" : ""} auto-deposited (inventory full)</div>}
            </div>
          )}
        </>
      )}

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        style={{
          marginTop: "auto",
          padding: "14px 40px",
          borderRadius: 10,
          border: "1px solid rgba(200,230,120,0.3)",
          background: "rgba(200,230,120,0.08)",
          color: "rgba(200,230,120,0.9)",
          fontSize: 13,
          fontFamily: "monospace",
          cursor: "pointer",
          letterSpacing: "0.04em",
          width: "100%",
          maxWidth: 340,
        }}
      >
        {toDeposit.size > 0 || overflowEntries.length > 0 ? "deposit & return home →" : "return to homestead →"}
      </button>
    </main>
  );
}