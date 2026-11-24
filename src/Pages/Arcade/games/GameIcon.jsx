// src/Pages/Arcade/games/GameIcon.jsx
// A game's icon in the menus. `icon` in the registry can be a plain string
// (old emoji icons) or a component that draws itself — prefer drawn icons,
// emojis don't render the same on every computer.
import React, { useEffect, useRef } from "react";
import { drawCreature } from "./creature-farm/drawFarm";
import { drawSignpost } from "./creature-farm/drawFarm";

export default function GameIcon({ icon, size = 34 }) {
  if (!icon) return null;
  if (typeof icon === "string") return <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
  const Comp = icon;
  return <Comp size={size} />;
}

function CanvasIcon({ size, draw }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.scale(size / 64, size / 64); draw(ctx); ctx.restore();
  }, [size, draw]);
  return <canvas ref={ref} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} />;
}

// Creature Farm: two starters by the RUNS signpost.
const drawFarmIcon = (ctx) => {
  ctx.save(); ctx.translate(50, 40); ctx.scale(0.55, 0.55); drawSignpost(ctx, 0, 30, 0); ctx.restore();
  drawCreature(ctx, 20, 58, "mossling", { hue: 105, size: 0.75, personality: "bold" }, { face: 1, t: 1 });
  drawCreature(ctx, 40, 60, "emberpup", { hue: 18, size: 0.6, personality: "bold" }, { face: -1, t: 2 });
};
export function CreatureFarmIcon({ size = 34 }) { return <CanvasIcon size={size} draw={drawFarmIcon} />; }