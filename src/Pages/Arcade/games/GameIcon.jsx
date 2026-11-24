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

// 3D Tester: a little shaded cube (top, left and right faces) with a blob on top.
const drawWalk3DIcon = (ctx) => {
  const cx = 32, cy = 34, w = 24, h = 13, d = 15;
  const face = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.fill(); };
  face([[cx, cy - h], [cx + w, cy], [cx, cy + h], [cx - w, cy]], "#7ee081");                    // top (grass)
  face([[cx - w, cy], [cx, cy + h], [cx, cy + h + d], [cx - w, cy + d]], "#8a5a34");             // left side
  face([[cx + w, cy], [cx, cy + h], [cx, cy + h + d], [cx + w, cy + d]], "#6b4426");             // right side
  // blob on top
  ctx.fillStyle = "#6fd3ff"; ctx.beginPath(); ctx.ellipse(cx, cy - 9, 10, 9.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e04848"; ctx.beginPath(); ctx.ellipse(cx, cy - 16, 8, 4.5, 0, Math.PI, 0); ctx.fill();   // cap
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 3.5, cy - 10, 2.5, 0, Math.PI * 2); ctx.arc(cx + 3.5, cy - 10, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1b1530"; ctx.beginPath(); ctx.arc(cx - 3.5, cy - 9.6, 1.3, 0, Math.PI * 2); ctx.arc(cx + 3.5, cy - 9.6, 1.3, 0, Math.PI * 2); ctx.fill();
};
export function Walk3DIcon({ size = 34 }) { return <CanvasIcon size={size} draw={drawWalk3DIcon} />; }