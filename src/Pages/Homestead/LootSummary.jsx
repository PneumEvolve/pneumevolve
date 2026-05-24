// src/Pages/Homestead/LootSummary.jsx
// End-of-run screen. Shows what was collected, dumps to shared chest.

import React, { useEffect, useRef, useState } from "react";
import { useHearthroom } from "./useHearthroom";
import { mergeInventory } from "./gameEngine";

const ITEM_ICONS = {
  wood:    "🪵",
  stone:   "🪨",
  sticks:  "🪹",
  herbs:   "🌿",
  leather: "🦴",
  meat:    "🥩",
  silk:    "🕸",
  // Mining
  coal:    "⚫",
  gems:    "💎",
  crystal: "🔷",
  // Fruit / fishing
  apples:   "🍎",
  berries:  "🫐",
  mushrooms:"🍄",
  fish:     "🐟",
  big_fish: "🐠",
  rare_fish:"🐡",
};

const ITEM_LABELS = {
  // Resources
  wood:     "wood",
  stone:    "stone",
  sticks:   "sticks",
  herbs:    "herbs",
  leather:  "leather",
  meat:     "meat",
  silk:     "silk",
  // Mining
  coal:     "coal",
  gems:     "gems",
  crystal:  "crystal",
  // Fruit / fishing
  apples:   "apples",
  berries:  "berries",
  mushrooms:"mushrooms",
  fish:     "fish",
  big_fish: "big fish",
  rare_fish:"rare fish",
  // Gear
  axe:             "axe",
  pickaxe:         "pickaxe",
  fishing_rod:     "fishing rod",
  crafting_station:"crafting station",
  leather_armor:   "leather armor",
  cooked_meat:     "cooked meat",
  potion_table:    "potion table",
};

function LootRow({ item, qty, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "7px 14px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      <span style={{ fontSize: 22 }}>{ITEM_ICONS[item] ?? "📦"}</span>
      <span style={{ flex: 1, fontSize: 13, color: "rgba(245,230,200,0.7)", fontFamily: "monospace" }}>
        {ITEM_LABELS[item] ?? item}
      </span>
      <span style={{ fontSize: 18, fontWeight: 400, color: "rgba(200,230,120,0.9)", fontFamily: "monospace" }}>
        +{qty}
      </span>
    </div>
  );
}

export default function LootSummary({ room, runLoot, kills, chestInventory, onReturnHome, onChestUpdate }) {
  const [deposited, setDeposited] = useState(false);
  const [newChest,  setNewChest]  = useState(null);
  const depositedRef = useRef(false);

  const handlers = useRef({
    onChestUpdated: ({ inventory }) => {
      setNewChest(inventory);
    },
  }).current;

  const { sendChestUpdated } = useHearthroom(room?.id ?? null, handlers);

  useEffect(() => {
    if (depositedRef.current) return;
    depositedRef.current = true;
    // Merge run loot into the shared chest, persist to DB, and broadcast
    const updated = mergeInventory(chestInventory ?? {}, runLoot ?? {});
    setNewChest(updated);
    // Persist to DB (via parent) + broadcast to partner
    onChestUpdate?.(updated);
    sendChestUpdated(updated);
    setDeposited(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Items that actually dropped this run
  const lootEntries = Object.entries(runLoot ?? {}).filter(([k, v]) => v > 0 && k !== "kills");

  return (
    <main style={{
      height: "100svh",
      maxHeight: "100svh",
      background: "#0a120a",
      color: "#f5e6c8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      fontFamily: "monospace",
      padding: "20px 24px",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center" }}>
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

      {/* Loot list */}
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 6, maxHeight: "38vh", overflowY: "auto", paddingRight: 4 }}>
        {lootEntries.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(245,230,200,0.25)" }}>
            nothing collected this run
          </p>
        ) : (
          lootEntries.map(([item, qty], i) => (
            <LootRow key={item} item={item} qty={qty} delay={i * 120} />
          ))
        )}
      </div>

      {/* Chest deposit confirmation */}
      {deposited && (
        <div style={{
          textAlign: "center",
          fontSize: 11,
          color: "rgba(200,230,160,0.5)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 16,
          width: "100%",
          maxWidth: 320,
        }}>
          <p>✓ deposited into shared chest</p>
          {newChest && (
            <p style={{ marginTop: 6, color: "rgba(245,230,200,0.25)", fontSize: 10 }}>
              chest now: {
                Object.entries(newChest)
                  .filter(([,v]) => v > 0)
                  .map(([k,v]) => `${ITEM_ICONS[k] ?? ""}${v} ${k}`)
                  .join("  ·  ")
              }
            </p>
          )}
        </div>
      )}

      {/* Return button */}
      <button
        onClick={onReturnHome}
        style={{
          marginTop: 8,
          padding: "14px 40px",
          borderRadius: 10,
          border: "1px solid rgba(200,230,120,0.3)",
          background: "rgba(200,230,120,0.08)",
          color: "rgba(200,230,120,0.9)",
          fontSize: 13,
          fontFamily: "monospace",
          cursor: "pointer",
          letterSpacing: "0.04em",
        }}
      >
        return to homestead →
      </button>
    </main>
  );
}