// src/Pages/Homestead/player_Hotbar.jsx
//
// ONE Hotbar for the whole game. Replaces four near-identical copies that
// previously lived in HomesteadView, ForestRun, MiningRun, and FruitRun.
//
// FishingRun keeps a simpler local variant for now — the fishing UI is
// intentionally minimal — but should switch to this with `theme="fishing"`
// once you're happy with feature parity.
//
// Differences between the old copies, now consolidated:
//   - HomesteadView + ForestRun rendered a tool-durability bar; MiningRun and
//     FruitRun didn't. This component ALWAYS renders durability when the
//     hotbar item has a maxDurability — closing that drift.
//   - Slot-click semantics: homestead called onUseSlot directly; runs called
//     onSelectIdx then onUseSlot. The unified behavior is "select then use",
//     which matches what the runs already did and reads more obviously.
//   - Per-scene background tint is now a theme prop.

import React from "react";
import {
  ITEMS, ITEM_ICONS, EQUIPPABLE, HOTBAR_BASE_SLOTS, HOTBAR_SIZE,
} from "./Items";
import { ItemIcon } from "./ItemIcon";

export const HOTBAR_THEMES = {
  homestead: {
    bottom:   26,
    slotBg:   "rgba(10,18,6,0.92)",
    emptyBg:  "rgba(10,18,6,0.55)",
    menuBg:   "rgba(10,18,6,0.7)",
    border:   "rgba(200,230,120,0.2)",
  },
  forest: {
    bottom:   36,
    slotBg:   "rgba(10,18,6,0.92)",
    emptyBg:  "rgba(10,18,6,0.55)",
    menuBg:   "rgba(10,18,6,0.7)",
    border:   "rgba(200,230,120,0.2)",
  },
  mining: {
    bottom:   36,
    slotBg:   "rgba(10,8,4,0.92)",
    emptyBg:  "rgba(10,8,4,0.55)",
    menuBg:   "rgba(10,8,4,0.7)",
    border:   "rgba(200,230,120,0.2)",
  },
  fruit: {
    bottom:   36,
    slotBg:   "rgba(10,18,6,0.92)",
    emptyBg:  "rgba(10,18,6,0.55)",
    menuBg:   "rgba(10,18,6,0.7)",
    border:   "rgba(200,230,120,0.2)",
  },
};

// What the floating label above a selected slot says, by category/state.
// Homestead historically said "⚔ equip" for equippables; runs said "⚡ use".
// Pick "⚔ equip" everywhere for consistency — that's the actual semantics
// (clicking a sword equips it, it doesn't "use" it).
function hintForSlot(slot) {
  if (!slot) return "";
  const it = ITEMS[slot.item];
  const cat = it?.category;
  if (cat === "food")      return "🍴 eat";
  if (cat === "placeable") return "🏗 place";
  if (EQUIPPABLE[slot.item]) return "⚔ equip";
  if (cat === "tool")      return "⚡ use";
  return "";
}

export function Hotbar({
  hotbar,
  hotbarSlots,
  equipment,
  selectedIdx,
  onSelectIdx,
  onOpenMenu,
  onUseSlot,
  theme = "homestead",
}) {
  const t = HOTBAR_THEMES[theme] ?? HOTBAR_THEMES.homestead;
  const visible = Math.min(hotbarSlots ?? HOTBAR_BASE_SLOTS, HOTBAR_SIZE);

  return (
    <div style={{
      position: "absolute",
      bottom: t.bottom,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: 3,
      zIndex: 5,
      pointerEvents: "auto",
    }}>
      {Array.from({ length: visible }).map((_, idx) => {
        const slot = (hotbar ?? [])[idx];
        const isEquipped = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot] === slot?.item;
        const isSelected = idx === selectedIdx;
        const maxDur = slot ? (ITEMS[slot.item]?.maxDurability ?? null) : null;
        const curDur = (slot && maxDur != null)
          ? (equipment?.durability?.[slot.item] ?? maxDur)
          : null;

        let borderColor = "rgba(255,255,255,0.1)";
        if (isSelected)       borderColor = "rgba(255,220,60,0.85)";
        else if (isEquipped)  borderColor = "rgba(100,200,255,0.6)";
        else if (slot)        borderColor = "rgba(200,230,120,0.35)";

        return (
          <div key={idx}
            onClick={() => {
              if (slot) {
                onSelectIdx?.(idx);
                onUseSlot?.(idx);
              } else {
                onOpenMenu?.("inventory");
              }
            }}
            style={{
              width: 44,
              height: 52,
              borderRadius: 8,
              cursor: "pointer",
              background: slot ? t.slotBg : t.emptyBg,
              border: `2px solid ${borderColor}`,
              boxShadow: isSelected ? "0 0 10px rgba(255,210,40,0.35), inset 0 0 6px rgba(255,210,40,0.08)" : "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              gap: 1,
              transform: isSelected ? "translateY(-3px)" : "none",
              transition: "transform 0.1s, box-shadow 0.1s, border-color 0.1s",
            }}>
            {isSelected && slot && (
              <div style={{
                position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
                fontSize: 8, color: "rgba(255,220,60,0.8)",
                whiteSpace: "nowrap", fontFamily: "monospace",
                letterSpacing: "0.06em", pointerEvents: "none",
              }}>
                {hintForSlot(slot)}
              </div>
            )}
            {slot ? (
              <>
                <ItemIcon id={slot.item} size={22} />
                <span style={{
                  fontSize: 8, color: "rgba(200,230,120,0.65)", lineHeight: 1,
                  fontFamily: "monospace", maxWidth: 40,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ITEMS[slot.item]?.label?.toLowerCase().slice(0, 6) ?? slot.item}
                </span>
                {slot.qty != null && maxDur == null && (
                  <span style={{ fontSize: 9, color: "rgba(200,230,120,0.8)", lineHeight: 1, marginTop: 1 }}>{slot.qty}</span>
                )}
                {curDur != null && (
                  <div style={{
                    position: "absolute", bottom: 2, left: 3, right: 3, height: 3,
                    background: "rgba(0,0,0,0.45)", borderRadius: 2, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${(curDur / maxDur) * 100}%`,
                      height: "100%",
                      background:
                        (curDur / maxDur) > 0.5 ? "#80d860" :
                        (curDur / maxDur) > 0.25 ? "#e8c840" : "#e04840",
                    }} />
                  </div>
                )}
                {isEquipped && (
                  <div style={{
                    position: "absolute", top: 2, right: 2,
                    width: 6, height: 6, borderRadius: "50%",
                    background: "rgba(100,200,255,0.95)",
                  }} />
                )}
              </>
            ) : (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", fontFamily: "monospace" }}>
                {idx + 1}
              </span>
            )}
          </div>
        );
      })}

      {/* Open-menu button */}
      <div
        onClick={() => onOpenMenu?.("inventory")}
        title="Open menu (Tab)"
        style={{
          marginLeft: 8,
          width: 36, height: 36,
          borderRadius: 8,
          cursor: "pointer",
          background: t.menuBg,
          border: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(200,230,120,0.5)",
          fontSize: 10,
          fontFamily: "monospace",
        }}>⊞</div>
    </div>
  );
}
