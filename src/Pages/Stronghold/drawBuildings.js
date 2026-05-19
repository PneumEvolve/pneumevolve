// src/Pages/Stronghold/drawBuildings.js
// All illustrated building drawing — pure canvas, no React.
// Each function takes (ctx, cx, cy, scale, t, hpPct, workers)

export function drawTownCenter(ctx, cx, cy, scale, t, hpPct) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);

  // Base platform shadow
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.ellipse(0, 18 * s, 36 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();

  // Outer wall ring
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, 30 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1608"; ctx.fill();
  ctx.strokeStyle = `rgba(255,215,0,${0.3 + 0.1 * Math.sin(t * 2)})`;
  ctx.lineWidth = 1 * s; ctx.stroke();

  // Four corner towers
  const towerAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  towerAngles.forEach(angle => {
    const tx = Math.cos(angle) * 20 * s;
    const ty = Math.sin(angle) * 20 * s;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(tx, ty, 7 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#221c08"; ctx.fill();
    ctx.strokeStyle = "rgba(255,215,0,0.25)"; ctx.lineWidth = 0.8 * s; ctx.stroke();
    // battlement nub
    ctx.beginPath();
    ctx.rect(tx - 3 * s, ty - 9 * s, 6 * s, 5 * s);
    ctx.fillStyle = "#221c08"; ctx.fill();
    ctx.strokeStyle = "rgba(255,215,0,0.2)"; ctx.lineWidth = 0.5 * s; ctx.stroke();
  });

  // Central keep
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#2a2010"; ctx.fill();
  ctx.strokeStyle = `rgba(255,215,0,${0.5 + 0.15 * Math.sin(t * 2)})`;
  ctx.lineWidth = 1.2 * s; ctx.stroke();

  // Battlements on keep — 5 nubs
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const bx = Math.cos(a) * 14 * s;
    const by = Math.sin(a) * 14 * s;
    ctx.beginPath();
    ctx.arc(bx, by, 3 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#2a2010"; ctx.fill();
    ctx.strokeStyle = "rgba(255,215,0,0.3)"; ctx.lineWidth = 0.6 * s; ctx.stroke();
  }

  // Gate archway
  ctx.beginPath();
  ctx.arc(0, 8 * s, 5 * s, Math.PI, 0);
  ctx.rect(-5 * s, 8 * s, 10 * s, 8 * s);
  ctx.fillStyle = "#0a0d0f"; ctx.fill();

  // Flag pole
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -14 * s); ctx.lineTo(0, -26 * s);
  ctx.strokeStyle = "rgba(255,215,0,0.5)"; ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Flag — waves with t
  const wave = Math.sin(t * 2.5) * 2 * s;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -26 * s);
  ctx.bezierCurveTo(6 * s, -26 * s + wave, 10 * s, -22 * s + wave, 12 * s, -20 * s);
  ctx.bezierCurveTo(10 * s, -20 * s + wave, 6 * s, -24 * s + wave, 0, -20 * s);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,215,0,${0.7 + 0.15 * Math.sin(t * 2)})`;
  ctx.fill();

  // Window glow
  ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 1.7);
  ctx.beginPath();
  ctx.arc(-4 * s, -2 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd700"; ctx.fill();
  ctx.beginPath();
  ctx.arc(4 * s, -2 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd700"; ctx.fill();

  ctx.restore();
}

export function drawBarracks(ctx, cx, cy, scale, t, hpPct) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);

  // Shadow
  ctx.globalAlpha = 0.1;
  ctx.beginPath(); ctx.ellipse(0, 14 * s, 24 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();

  // Building body
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.roundRect(-18 * s, -4 * s, 36 * s, 20 * s, 2 * s);
  ctx.fillStyle = "#1a0f0c"; ctx.fill();
  ctx.strokeStyle = "rgba(255,102,68,0.35)"; ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Roof
  ctx.beginPath();
  ctx.moveTo(-20 * s, -4 * s);
  ctx.lineTo(0, -18 * s);
  ctx.lineTo(20 * s, -4 * s);
  ctx.closePath();
  ctx.fillStyle = "#1a0f0c"; ctx.fill();
  ctx.strokeStyle = "rgba(255,102,68,0.3)"; ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Door
  ctx.beginPath();
  ctx.roundRect(-5 * s, 5 * s, 10 * s, 12 * s, [3 * s, 3 * s, 0, 0]);
  ctx.fillStyle = "#0a0d0f"; ctx.fill();

  // Windows
  ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.roundRect(-14 * s, -1 * s, 7 * s, 6 * s, 1 * s);
  ctx.fillStyle = "rgba(255,102,68,0.3)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,102,68,0.3)"; ctx.lineWidth = 0.5 * s; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(7 * s, -1 * s, 7 * s, 6 * s, 1 * s);
  ctx.fillStyle = "rgba(255,102,68,0.3)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,102,68,0.3)"; ctx.lineWidth = 0.5 * s; ctx.stroke();

  // Crossed swords on roof peak
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "rgba(255,102,68,0.7)"; ctx.lineWidth = 1.2 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5 * s, -13 * s); ctx.lineTo(5 * s, -7 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5 * s, -13 * s); ctx.lineTo(-5 * s, -7 * s); ctx.stroke();
  // hilt bars
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath(); ctx.moveTo(-7 * s, -11 * s); ctx.lineTo(-3 * s, -11 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3 * s, -11 * s); ctx.lineTo(7 * s, -11 * s); ctx.stroke();

  ctx.restore();
}

export function drawGarden(ctx, cx, cy, scale, t, hpPct) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);

  // Soil patch
  ctx.globalAlpha = 0.18;
  ctx.beginPath(); ctx.ellipse(0, 8 * s, 20 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3d2a10"; ctx.fill();

  // Fence posts — 4 corners
  [[-14, -4], [14, -4], [-14, 8], [14, 8]].forEach(([fx, fy]) => {
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.roundRect(fx * s - 1.5 * s, fy * s - 8 * s, 3 * s, 12 * s, 0.5 * s);
    ctx.fillStyle = "#3d2a10"; ctx.fill();
    ctx.strokeStyle = "rgba(102,221,136,0.2)"; ctx.lineWidth = 0.5 * s; ctx.stroke();
  });
  // Fence rails
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "rgba(102,221,136,0.3)"; ctx.lineWidth = 0.6 * s;
  ctx.beginPath(); ctx.moveTo(-14 * s, -6 * s); ctx.lineTo(14 * s, -6 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14 * s, 2 * s); ctx.lineTo(14 * s, 2 * s); ctx.stroke();

  // Three trees/bushes
  const trees = [[-7, -6], [0, -10], [7, -6]];
  trees.forEach(([tx, ty], i) => {
    const sway = Math.sin(t * 1.2 + i * 1.1) * 1.5 * s;
    // trunk
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(tx * s, ty * s + 8 * s);
    ctx.lineTo(tx * s + sway * 0.3, ty * s);
    ctx.strokeStyle = "#3d2a10"; ctx.lineWidth = 2 * s; ctx.stroke();
    // canopy
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(tx * s + sway * 0.3, ty * s - 2 * s, 7 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#0d1f12"; ctx.fill();
    ctx.strokeStyle = `rgba(102,221,136,${0.4 + 0.1 * Math.sin(t + i)})`;
    ctx.lineWidth = 0.8 * s; ctx.stroke();
    // highlight dot
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(tx * s + sway * 0.3 - 2 * s, ty * s - 4 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#66dd88"; ctx.fill();
  });

  // Flowers — 4 little dots, drift slightly
  const flowers = [[-10, 6, "#ffff80"], [10, 6, "#ffcc88"], [-4, 9, "#ccffaa"], [4, 8, "#ffaacc"]];
  flowers.forEach(([fx, fy, col], i) => {
    ctx.globalAlpha = 0.7 + 0.2 * Math.sin(t * 2 + i);
    ctx.beginPath();
    ctx.arc(fx * s, fy * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
  });

  ctx.restore();
}

export function drawRepairShop(ctx, cx, cy, scale, t, hpPct) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);

  // Shadow
  ctx.globalAlpha = 0.1;
  ctx.beginPath(); ctx.ellipse(0, 14 * s, 22 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();

  // Main building body
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.roundRect(-16 * s, -2 * s, 32 * s, 18 * s, 2 * s);
  ctx.fillStyle = "#0c1620"; ctx.fill();
  ctx.strokeStyle = "rgba(102,187,255,0.3)"; ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Lean-to roof (asymmetric)
  ctx.beginPath();
  ctx.moveTo(-18 * s, -2 * s);
  ctx.lineTo(-18 * s, -10 * s);
  ctx.lineTo(18 * s, -6 * s);
  ctx.lineTo(18 * s, -2 * s);
  ctx.closePath();
  ctx.fillStyle = "#0c1620"; ctx.fill();
  ctx.strokeStyle = "rgba(102,187,255,0.25)"; ctx.lineWidth = 0.7 * s; ctx.stroke();

  // Large garage opening
  ctx.beginPath();
  ctx.roundRect(-8 * s, 4 * s, 16 * s, 12 * s, [2 * s, 2 * s, 0, 0]);
  ctx.fillStyle = "#070a0c"; ctx.fill();
  ctx.strokeStyle = "rgba(102,187,255,0.2)"; ctx.lineWidth = 0.5 * s; ctx.stroke();
  // door panels
  ctx.globalAlpha = 0.2;
  ctx.beginPath(); ctx.moveTo(0, 4 * s); ctx.lineTo(0, 16 * s);
  ctx.strokeStyle = "rgba(102,187,255,0.3)"; ctx.lineWidth = 0.5 * s; ctx.stroke();

  // Side window
  ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 1.5);
  ctx.beginPath(); ctx.roundRect(-14 * s, 1 * s, 5 * s, 5 * s, 1 * s);
  ctx.fillStyle = "rgba(102,187,255,0.2)"; ctx.fill();
  ctx.strokeStyle = "rgba(102,187,255,0.3)"; ctx.lineWidth = 0.5 * s; ctx.stroke();

  // Wrench sign above door
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = "rgba(102,187,255,0.65)"; ctx.lineWidth = 1.8 * s; ctx.lineCap = "round";
  // handle
  ctx.beginPath(); ctx.moveTo(0, -8 * s); ctx.lineTo(0, -14 * s); ctx.stroke();
  // head caps
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath(); ctx.moveTo(-3 * s, -8 * s); ctx.lineTo(3 * s, -8 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3 * s, -14 * s); ctx.lineTo(3 * s, -14 * s); ctx.stroke();

  ctx.restore();
}

export function drawUpgradeShop(ctx, cx, cy, scale, t, hpPct) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);

  // Shadow
  ctx.globalAlpha = 0.1;
  ctx.beginPath(); ctx.ellipse(0, 15 * s, 24 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();

  // Body
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.roundRect(-17 * s, -2 * s, 34 * s, 20 * s, 3 * s);
  ctx.fillStyle = "#150d20"; ctx.fill();
  ctx.strokeStyle = `rgba(200,136,255,${0.3 + 0.1 * Math.sin(t * 1.8)})`;
  ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Pointed roof
  ctx.beginPath();
  ctx.moveTo(-19 * s, -2 * s);
  ctx.lineTo(0, -20 * s);
  ctx.lineTo(19 * s, -2 * s);
  ctx.closePath();
  ctx.fillStyle = "#150d20"; ctx.fill();
  ctx.strokeStyle = `rgba(200,136,255,${0.25 + 0.08 * Math.sin(t * 1.8)})`;
  ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Orb at peak — glows
  ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2.5);
  ctx.beginPath(); ctx.arc(0, -20 * s, 4 * s, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(200,136,255,0.6)"; ctx.fill();
  ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 2.5);
  ctx.beginPath(); ctx.arc(0, -20 * s, 9 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#cc88ff"; ctx.fill();

  // Door arch
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 8 * s, 6 * s, Math.PI, 0);
  ctx.rect(-6 * s, 8 * s, 12 * s, 8 * s);
  ctx.fillStyle = "#0a0d0f"; ctx.fill();

  // Windows — diamond shapes for mystique
  const drawDiamond = (wx, wy) => {
    ctx.beginPath();
    ctx.moveTo(wx, wy - 4 * s);
    ctx.lineTo(wx + 3 * s, wy);
    ctx.lineTo(wx, wy + 4 * s);
    ctx.lineTo(wx - 3 * s, wy);
    ctx.closePath();
    ctx.fillStyle = `rgba(200,136,255,${0.25 + 0.1 * Math.sin(t * 2)})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(200,136,255,0.3)"; ctx.lineWidth = 0.5 * s; ctx.stroke();
  };
  ctx.globalAlpha = 0.8;
  drawDiamond(-10 * s, 2 * s);
  drawDiamond(10 * s, 2 * s);

  ctx.restore();
}

export function drawHome(ctx, cx, cy, scale, t, hpPct) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);

  // Shadow
  ctx.globalAlpha = 0.1;
  ctx.beginPath(); ctx.ellipse(0, 12 * s, 18 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000"; ctx.fill();

  // Walls — cosy warm stone
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.roundRect(-13 * s, -2 * s, 26 * s, 16 * s, 2 * s);
  ctx.fillStyle = "#1a1208"; ctx.fill();
  ctx.strokeStyle = "rgba(255,170,68,0.3)"; ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Roof — simple triangle, warm amber
  ctx.beginPath();
  ctx.moveTo(-15 * s, -2 * s);
  ctx.lineTo(0, -16 * s);
  ctx.lineTo(15 * s, -2 * s);
  ctx.closePath();
  ctx.fillStyle = "#1f1408"; ctx.fill();
  ctx.strokeStyle = "rgba(255,170,68,0.35)"; ctx.lineWidth = 0.8 * s; ctx.stroke();

  // Chimney
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.roundRect(5 * s, -16 * s, 5 * s, 9 * s, 1 * s);
  ctx.fillStyle = "#1f1408"; ctx.fill();
  ctx.strokeStyle = "rgba(255,170,68,0.25)"; ctx.lineWidth = 0.5 * s; ctx.stroke();

  // Smoke puffs from chimney
  const smoke = [0, 1, 2].map(i => ({
    offset: (t * 0.4 + i * 0.33) % 1,
  }));
  smoke.forEach(({ offset }) => {
    const sy = -16 * s - offset * 14 * s;
    const sx = 7.5 * s + Math.sin(offset * Math.PI * 2) * 2 * s;
    const r  = (2 + offset * 3) * s;
    ctx.globalAlpha = (1 - offset) * 0.12;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#aaa"; ctx.fill();
  });

  // Door
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.roundRect(-4 * s, 3 * s, 8 * s, 11 * s, [3 * s, 3 * s, 0, 0]);
  ctx.fillStyle = "#0a0d0f"; ctx.fill();

  // Window — warm glow
  const glow = 0.3 + 0.1 * Math.sin(t * 1.3);
  ctx.globalAlpha = glow;
  ctx.beginPath(); ctx.roundRect(-11 * s, 0 * s, 6 * s, 5 * s, 1 * s);
  ctx.fillStyle = "rgba(255,200,80,0.4)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,180,60,0.4)"; ctx.lineWidth = 0.5 * s; ctx.stroke();

  ctx.restore();
}

export function drawRubble(ctx, cx, cy, scale) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.25;
  // Scattered debris chunks
  [[-6, 2], [4, -3], [-2, 6], [7, 4], [-5, -5]].forEach(([rx, ry], i) => {
    ctx.beginPath();
    ctx.roundRect(rx * s, ry * s, (3 + i % 3) * s, (2 + i % 2) * s, 1 * s);
    ctx.fillStyle = "#333"; ctx.fill();
  });
  ctx.restore();
}

// Master dispatcher — call this instead of drawing circles
export function drawBuilding(ctx, b, cx, cy, t) {
  const def = BUILDING_TYPES_RADII[b.type] ?? { radius: 20 };
  const scale = def.radius / 22; // normalize to design size
  const hpPct = b.hp / b.maxHp;

  if (b.hp <= 0) { drawRubble(ctx, cx, cy, scale); return; }

  ctx.save();

  switch (b.type) {
    case "town_center":   drawTownCenter(ctx, cx, cy, scale, t, hpPct); break;
    case "barracks":      drawBarracks(ctx, cx, cy, scale, t, hpPct); break;
    case "garden":        drawGarden(ctx, cx, cy, scale, t, hpPct); break;
    case "repair_shop":   drawRepairShop(ctx, cx, cy, scale, t, hpPct); break;
    case "upgrade_shop":  drawUpgradeShop(ctx, cx, cy, scale, t, hpPct); break;
    case "home":          drawHome(ctx, cx, cy, scale, t, hpPct); break;
    default: break;
  }

  // Damage tint — red overlay when very low hp
  if (hpPct < 0.3) {
    ctx.globalAlpha = (0.3 - hpPct) / 0.3 * 0.18;
    ctx.beginPath(); ctx.arc(cx, cy, def.radius * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff2200"; ctx.fill();
  }

  ctx.restore();
}

// Radii table — mirrors BUILDING_TYPES without importing React deps
const BUILDING_TYPES_RADII = {
  town_center:  { radius: 32 },
  barracks:     { radius: 22 },
  garden:       { radius: 20 },
  repair_shop:  { radius: 20 },
  upgrade_shop: { radius: 22 },
  home:         { radius: 18 },
};