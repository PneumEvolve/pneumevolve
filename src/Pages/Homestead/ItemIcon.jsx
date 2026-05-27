// src/Pages/Homestead/ItemIcon.jsx
// ─────────────────────────────────────────────────────────────────────────────
// One-stop icon component for any item in the game.
//
//   <ItemIcon id="crafting_station" size={32} />
//
// If the item has a `draw` function (defined in drawArt.js and attached in
// Items.js), it renders to a canvas at the requested size. Otherwise it falls
// back to the emoji in `item.icon`. Either way, callers don't need to care
// which kind of art the item uses.
//
// This is the ONLY change needed in the JSX files — search/replace every
//   <span style={{ fontSize: 18 }}>{ITEM_ICONS[id] ?? "📦"}</span>
// with
//   <ItemIcon id={id} size={22} />
// and you're done.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from "react";
import { ITEMS } from "./Items";

export function ItemIcon({ id, size = 24, style, className, title }) {
  const item = ITEMS[id];
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!item?.draw || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    item.draw(ctx, 0, 0, size);
  }, [id, size, item]);

  if (item?.draw) {
    return (
      <canvas
        ref={canvasRef}
        className={className}
        title={title ?? item.label}
        style={{
          display: "inline-block",
          verticalAlign: "middle",
          ...style,
        }}
      />
    );
  }

  // Emoji fallback — matches the look of the existing spans.
  return (
    <span
      className={className}
      title={title ?? item?.label}
      style={{
        fontSize: Math.round(size * 0.8),
        lineHeight: 1,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {item?.icon ?? "📦"}
    </span>
  );
}
