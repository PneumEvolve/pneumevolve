// src/Pages/Arcade/games/creature-farm/stampede/drawStampede.js
// Drawing for the Critter Stampede run (creatures themselves come from ../drawFarm.js).
// Everything is drawn in code — no emojis, no image files.

const TAU = Math.PI * 2;

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Endless grass: tiles around the camera, each decorated from a hash of its
// position so the same spot always looks the same.
export function drawGround(ctx, left, top, w, h) {
  const TILE = 96;
  ctx.fillStyle = "#4f8f43";
  ctx.fillRect(left, top, w, h);
  const x0 = Math.floor(left / TILE), y0 = Math.floor(top / TILE);
  const x1 = Math.ceil((left + w) / TILE), y1 = Math.ceil((top + h) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const r = hash2(tx, ty), r2 = hash2(tx + 999, ty - 777);
    const bx = tx * TILE, by = ty * TILE;
    if (r < 0.22) {                                     // darker patch
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.beginPath(); ctx.ellipse(bx + 48, by + 48, 40 + r2 * 20, 26, r * 3, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 3; i++) {                       // grass tufts
      const gx = bx + hash2(tx * 7 + i, ty) * TILE, gy = by + hash2(tx, ty * 7 + i) * TILE;
      ctx.strokeStyle = "rgba(160,220,120,0.35)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(gx - 3, gy); ctx.lineTo(gx - 4, gy - 6); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 8); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 5, gy - 6); ctx.stroke();
    }
    if (r2 > 0.86) {                                    // little flowers
      const fx = bx + r * TILE, fy = by + r2 * TILE * 0.8;
      const col = r > 0.5 ? "#ffe066" : "#ff9ad5";
      for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, TAU); ctx.fill();
    } else if (r2 < 0.06) {                             // pebble
      ctx.fillStyle = "#8d8f86"; ctx.beginPath(); ctx.ellipse(bx + r * TILE, by + 60, 6, 4, 0, 0, TAU); ctx.fill();
    }
  }
}

// Goop baddie. kind "goop" (small, quick) or "big" (slow, tanky, horns).
// Goop of every kind. b: { id, kind, x, y, hpFrac, flash }
//   goop     purple blob           big       dark, horned, 1.7x
//   splitter green, cracked down the middle (pops into 2 minis)
//   mini     small and quick       spitter   orange with a spout on top
//   snatcher teal with two grabby arms
//   boss     the Goop King: huge, with a gold crown
const GOOP_LOOK = {
  goop:     { s: 1,    body: "#5a2a78" },
  big:      { s: 1.7,  body: "#3b1d52" },
  splitter: { s: 1.15, body: "#2f7a4f" },
  mini:     { s: 0.65, body: "#7a3a9a" },
  spitter:  { s: 1.05, body: "#b5562a" },
  snatcher: { s: 1.05, body: "#1f5f6b" },
  boss:     { s: 3.2,  body: "#4a1670" },
};
export function drawGoop(ctx, b, t) {
  const look = GOOP_LOOK[b.kind] || GOOP_LOOK.goop;
  const s = look.s;
  const wob = Math.sin(t * (b.kind === "boss" ? 4 : 9) + b.id) * 0.08;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 0, 14 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
  ctx.scale(s * (1 + wob), s * (1 - wob));

  // snatcher arms (behind the body), reaching up
  if (b.kind === "snatcher") {
    ctx.strokeStyle = look.body; ctx.lineWidth = 4; ctx.lineCap = "round";
    const reach = Math.sin(t * 8 + b.id) * 3;
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-20, -20, -16, -30 - reach); ctx.moveTo(10, -12); ctx.quadraticCurveTo(20, -20, 16, -30 + reach); ctx.stroke();
    ctx.fillStyle = "#9fe3ee";
    ctx.beginPath(); ctx.arc(-16, -31 - reach, 3, 0, TAU); ctx.arc(16, -31 + reach, 3, 0, TAU); ctx.fill();
  }

  // body
  ctx.fillStyle = b.flash ? "#ffffff" : look.body;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(-16, -22, 0, -24);
  ctx.quadraticCurveTo(16, -22, 14, 0);
  for (let i = 0; i <= 4; i++) { const x = 14 - i * 7; ctx.quadraticCurveTo(x - 3.5, 4 + (i % 2) * 2, x - 7, 0); }
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.ellipse(-5, -15, 4, 6, -0.5, 0, TAU); ctx.fill();

  if (b.kind === "big") {                               // horns
    ctx.fillStyle = "#c9b6e0";
    ctx.beginPath(); ctx.moveTo(-9, -19); ctx.lineTo(-13, -31); ctx.lineTo(-4, -22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -19); ctx.lineTo(13, -31); ctx.lineTo(4, -22); ctx.fill();
  } else if (b.kind === "splitter") {                   // crack down the middle
    ctx.strokeStyle = "#0f2e1c"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-2, -18); ctx.lineTo(2, -13); ctx.lineTo(-1, -7); ctx.lineTo(1, 0); ctx.stroke();
  } else if (b.kind === "spitter") {                    // spout on top
    ctx.fillStyle = b.flash ? "#ffffff" : "#d9773f";
    ctx.beginPath(); ctx.roundRect(-4, -31, 8, 9, 2); ctx.fill();
    ctx.fillStyle = "#3a1608"; ctx.beginPath(); ctx.ellipse(0, -31, 3, 1.4, 0, 0, TAU); ctx.fill();
  } else if (b.kind === "boss") {                       // gold crown
    ctx.fillStyle = "#ffd65a";
    ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(-11, -33); ctx.lineTo(-5, -27); ctx.lineTo(0, -35); ctx.lineTo(5, -27); ctx.lineTo(11, -33); ctx.lineTo(10, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff5d73"; ctx.beginPath(); ctx.arc(0, -27, 1.6, 0, TAU); ctx.fill();
  }

  // glowing angry eyes
  ctx.fillStyle = b.kind === "snatcher" ? "#9fe3ee" : "#ffe14d";
  ctx.beginPath(); ctx.ellipse(-5, -12, 3, 2.4, 0.3, 0, TAU); ctx.ellipse(5, -12, 3, 2.4, -0.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#1a0b26"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(-2, -14.5); ctx.moveTo(9, -17); ctx.lineTo(2, -14.5); ctx.stroke();
  ctx.restore();

  if (b.kind !== "boss" && b.hpFrac < 1 && b.hpFrac > 0) {
    const w = 26 * Math.max(0.8, s);
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(b.x - w / 2, b.y - 32 * s - 6, w, 4);
    ctx.fillStyle = "#ff5d73"; ctx.fillRect(b.x - w / 2, b.y - 32 * s - 6, w * b.hpFrac, 4);
  }
}

// The Goop King winding up a slam: red circle that fills in — get out of it!
export function drawSlamWarning(ctx, x, y, radius, frac, t) {
  ctx.save();
  ctx.fillStyle = `rgba(255,60,80,${0.12 + frac * 0.25})`;
  ctx.beginPath(); ctx.arc(x, y, radius * frac, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(255,80,100,${0.6 + Math.sin(t * 20) * 0.3})`; ctx.lineWidth = 4; ctx.setLineDash([12, 8]);
  ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke();
  ctx.restore();
}

// A spitter blob in the air: a shadow where it will land, and the blob arcing over.
export function drawShot(ctx, sh) {
  const f = Math.min(1, sh.frac);
  ctx.save();
  ctx.fillStyle = `rgba(181,86,42,${0.15 + f * 0.3})`;
  ctx.beginPath(); ctx.ellipse(sh.tx, sh.ty, 30, 11, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,140,80,0.7)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(sh.tx, sh.ty, 30, 11, 0, 0, TAU); ctx.stroke();
  const x = sh.x + (sh.tx - sh.x) * f, y = sh.y + (sh.ty - sh.y) * f - Math.sin(Math.PI * f) * 90;
  ctx.fillStyle = "#d9773f";
  ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(x - 2, y - 2, 2.5, 0, TAU); ctx.fill();
  ctx.restore();
}

// "!" over a critter being carried off by a snatcher.
export function drawGrabbed(ctx, x, y, color, t) {
  ctx.save();
  ctx.font = "bold 18px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = color; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3;
  const by = y - 46 - Math.abs(Math.sin(t * 10)) * 4;
  ctx.strokeText("!", x, by); ctx.fillText("!", x, by);
  ctx.restore();
}

// Hard mode: darkness closing in around your leader (screen space).
export function drawDarkness(ctx, cw, ch, cx, cy, amount, scale) {
  if (amount <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const r0 = 170 * scale, r1 = 420 * scale;
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, "rgba(5,8,22,0)");
  g.addColorStop(1, `rgba(5,8,22,${amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// Coloured ring under a leader so you can tell who's who.
export function drawLeaderRing(ctx, x, y, color, t, down) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = down ? 0.5 : 0.9;
  ctx.beginPath(); ctx.ellipse(x, y, 26, 9, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.25; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, 26 + Math.sin(t * 4) * 2, 9, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// Small owner dot under herd members.
export function drawHerdDot(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y + 2, 5, 2, 0, 0, TAU); ctx.fill();
}

// Sparkle above wild critters so you know they can be tamed.
export function drawWildSparkle(ctx, x, y, t, id) {
  const a = 0.5 + 0.5 * Math.sin(t * 3 + id);
  ctx.save();
  ctx.globalAlpha = 0.35 + a * 0.5;
  ctx.fillStyle = "#ffffff";
  const s = 3 + a * 2;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.4, y - s * 0.4); ctx.lineTo(x + s * 1.6, y);
  ctx.lineTo(x + s * 0.4, y + s * 0.4); ctx.lineTo(x, y + s * 1.6); ctx.lineTo(x - s * 0.4, y + s * 0.4);
  ctx.lineTo(x - s * 1.6, y); ctx.lineTo(x - s * 0.4, y - s * 0.4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The fading path you've run — makes the "run circles" lasso visible.
export function drawTrail(ctx, pts, color) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    ctx.globalAlpha = (i / pts.length) * 0.55;
    ctx.strokeStyle = color; ctx.lineWidth = 3 + (i / pts.length) * 3;
    ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
  }
  ctx.restore();
}

// Rope from leader to the critter being lassoed + a progress ring around it.
export function drawLasso(ctx, from, c, frac, color, t) {
  ctx.save();
  ctx.strokeStyle = "rgba(240,220,170,0.9)"; ctx.lineWidth = 2;
  const mx = (from.x + c.x) / 2, my = (from.y + c.y) / 2 + 10 + Math.sin(t * 8) * 4;
  ctx.beginPath(); ctx.moveTo(from.x, from.y - 16); ctx.quadraticCurveTo(mx, my, c.x, c.y - 14); ctx.stroke();
  ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.arc(c.x, c.y - 14, 30, 0, TAU); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath(); ctx.arc(c.x, c.y - 14, 30, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
  ctx.restore();
}

// Effects: zap, pop, tame, flee, down, revive.
export function drawFx(ctx, f, colors) {
  const a = Math.max(0, 1 - f.age / 0.6);
  ctx.save();
  if (f.k === "zap") {
    const k = Math.min(1, f.age / 0.12);
    ctx.globalAlpha = Math.max(0, 1 - f.age / 0.2);
    ctx.strokeStyle = colors[f.s] || "#fff"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(f.x, f.y - 20); ctx.lineTo(f.x + (f.x2 - f.x) * k, f.y - 20 + (f.y2 - 12 - f.y + 20) * k); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(f.x, f.y - 20); ctx.lineTo(f.x + (f.x2 - f.x) * k, f.y - 20 + (f.y2 - 12 - f.y + 20) * k); ctx.stroke();
  } else if (f.k === "ability") {                     // a herd ability went off: a big ring in the player's colour
    ctx.globalAlpha = a; ctx.strokeStyle = colors[f.s] || "#fff"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(f.x, f.y - 10, 30 + f.age * 420, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y - 10, 20 + f.age * 360, 0, TAU); ctx.stroke();
  } else if (f.k === "pop") {
    const r = (f.big === 2 ? 90 : f.big ? 30 : 16) + f.age * (f.big === 2 ? 160 : 70);
    ctx.globalAlpha = a; ctx.strokeStyle = "#b07ad6"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y - 10, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#7a3fa8";
    for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU; ctx.beginPath(); ctx.arc(f.x + Math.cos(ang) * r, f.y - 10 + Math.sin(ang) * r, 3, 0, TAU); ctx.fill(); }
  } else if (f.k === "tame") {
    ctx.globalAlpha = a;
    const col = colors[f.s] || "#fff";
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * TAU, r = 10 + f.age * 90;
      ctx.fillStyle = i % 2 ? col : "#fff";
      ctx.beginPath(); ctx.arc(f.x + Math.cos(ang) * r, f.y - 16 + Math.sin(ang) * r, 3.5, 0, TAU); ctx.fill();
    }
  } else if (f.k === "flee") {
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = "#d9cfb8";
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(f.x + (i - 1.5) * 8, f.y - 6 - f.age * 30, 6 + f.age * 10, 0, TAU); ctx.fill(); }
  } else if (f.k === "slam") {
    ctx.globalAlpha = a; ctx.strokeStyle = "#ff5d73"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(f.x, f.y, 60 + f.age * 200, 0, Math.PI * 2); ctx.stroke();
  } else if (f.k === "splat") {
    ctx.globalAlpha = a; ctx.fillStyle = "#d9773f";
    for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; const r = 8 + f.age * 50; ctx.beginPath(); ctx.arc(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r * 0.4, 3.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (f.k === "snatch" || f.k === "rescue" || f.k === "stolen") {
    ctx.globalAlpha = a; ctx.strokeStyle = f.k === "rescue" ? "#7ee081" : "#ff5d73"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y - 16, 14 + f.age * 50, 0, Math.PI * 2); ctx.stroke();
  } else if (f.k === "levelup") {
    // purple ring bursting outward from the leader
    ctx.globalAlpha = a; ctx.strokeStyle = "#c9a7ff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(f.x, f.y - 20, 20 + f.age * 140, 0, Math.PI * 2); ctx.stroke();
  } else if (f.k === "heal") {
    ctx.globalAlpha = a; ctx.fillStyle = "#7ee081";
    for (let i = 0; i < 6; i++) {
      const px = f.x + (i - 2.5) * 10, py = f.y - 20 - f.age * 60 - (i % 2) * 8;
      ctx.fillRect(px - 1.5, py - 5, 3, 10); ctx.fillRect(px - 5, py - 1.5, 10, 3);   // little plus signs
    }
  } else if (f.k === "down" || f.k === "revive") {
    ctx.globalAlpha = a; ctx.strokeStyle = f.k === "down" ? "#ff5d73" : "#7ee081"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y - 14, 20 + f.age * 80, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// Arrow at the screen edge pointing to your partner when they're off-screen.
export function drawEdgeArrow(ctx, cx, cy, ang, color) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.fillStyle = color; ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// "Help" bubble + revive ring over a downed leader.
export function drawDowned(ctx, x, y, revFrac, t) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.roundRect(x - 22, y - 70 + Math.sin(t * 4) * 2, 44, 18, 8); ctx.fill();
  ctx.fillStyle = "#c0392b"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("HELP!", x, y - 57 + Math.sin(t * 4) * 2);
  if (revFrac > 0) {
    ctx.strokeStyle = "#7ee081"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y - 14, 34, -Math.PI / 2, -Math.PI / 2 + TAU * revFrac); ctx.stroke();
  }
  ctx.restore();
}