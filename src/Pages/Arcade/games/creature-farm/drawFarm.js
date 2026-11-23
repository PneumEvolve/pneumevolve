// src/Pages/Arcade/games/creature-farm/drawFarm.js
//
// All the drawing for Creature Farm, done with code (no image files):
//   drawCreature  — builds a creature from its parts in species.js
//   drawFarmer    — the two players
//   drawMap       — trees, house, food crate, field, pen
// Each creature is drawn at (x, y) = the spot under its feet.

import { SPECIES, CROPS } from "./species";
import { MAP, WORLD_W, WORLD_H, PLOT_COUNT, plotRect, growth } from "./farmWorld";

const TAU = Math.PI * 2;

export function creatureColor(species, traits, dl = 0) {
  const sp = SPECIES[species];
  return `hsl(${traits.hue}, ${sp.sat}%, ${Math.max(5, Math.min(95, sp.light + dl))}%)`;
}

// opts: { face: 1|-1, t: seconds, moving, scale, sleepy, alpha }
export function drawCreature(ctx, x, y, species, traits, opts = {}) {
  const sp = SPECIES[species];
  if (!sp) return;
  const { face = 1, t = 0, moving = false, scale = 1, alpha = 1 } = opts;
  const s = (traits.size || 1) * scale;
  const body = creatureColor(species, traits);
  const dark = creatureColor(species, traits, -18);
  const light = creatureColor(species, traits, 16);
  const bob = moving ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2.2) * 1.2;
  const squash = moving ? 1 + Math.sin(t * 20) * 0.04 : 1;

  // body dimensions per shape (half-width, half-height)
  const dims = { round: [15, 14], blob: [19, 12], long: [21, 11], tall: [12, 18] }[sp.body] || [15, 14];
  const bw = dims[0], bh = dims[1];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(0, 0, bw * 0.95, 4.5, 0, 0, TAU); ctx.fill();

  ctx.translate(0, -bh - 2 - bob);
  ctx.scale(face * squash, 2 - squash);   // flip to face direction

  // wings (behind body)
  if (sp.extra === "wings") {
    const flap = Math.sin(t * (moving ? 18 : 5)) * 0.35;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * (0.5 + flap));
      ctx.beginPath(); ctx.ellipse(-4, -bh * 0.4, 6, bh * 0.9, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // tail (behind body, at the back = -x)
  const tx = -bw + 2, ty = bh * 0.25;
  if (sp.tail === "flame") {
    const fl = 1 + Math.sin(t * 14) * 0.15;
    ctx.fillStyle = "#ffb13b";
    ctx.beginPath(); ctx.moveTo(tx, ty - 3); ctx.quadraticCurveTo(tx - 16 * fl, ty - 10, tx - 10, ty - 22 * fl); ctx.quadraticCurveTo(tx - 4, ty - 8, tx, ty + 3); ctx.fill();
    ctx.fillStyle = "#ffe36b";
    ctx.beginPath(); ctx.moveTo(tx, ty - 2); ctx.quadraticCurveTo(tx - 9 * fl, ty - 8, tx - 6, ty - 14 * fl); ctx.quadraticCurveTo(tx - 2, ty - 6, tx, ty + 2); ctx.fill();
  } else if (sp.tail === "fin") {
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(tx + 2, ty); ctx.lineTo(tx - 12, ty - 9 + Math.sin(t * 6) * 2); ctx.lineTo(tx - 10, ty + 8); ctx.closePath(); ctx.fill();
  } else if (sp.tail === "fluffy") {
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(tx - 3, ty - 2, 7, 0, TAU); ctx.fill();
  } else if (sp.tail === "stinger") {
    ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx + 2, ty); ctx.quadraticCurveTo(tx - 14, ty - 2, tx - 10, ty - 16); ctx.stroke();
    ctx.fillStyle = "#ffe36b";
    ctx.beginPath(); ctx.moveTo(tx - 10, ty - 22); ctx.lineTo(tx - 6, ty - 14); ctx.lineTo(tx - 14, ty - 14); ctx.closePath(); ctx.fill();
  }

  // ears / head things (behind the body edge, on top)
  const ex = bw * 0.35, ey = -bh + 2;
  if (sp.ears === "pointy") {
    ctx.fillStyle = dark;
    for (const dx of [-ex, ex]) { ctx.beginPath(); ctx.moveTo(dx - 5, ey + 3); ctx.lineTo(dx + 1, ey - 11); ctx.lineTo(dx + 6, ey + 3); ctx.closePath(); ctx.fill(); }
  } else if (sp.ears === "round") {
    ctx.fillStyle = dark;
    for (const dx of [-ex, ex]) { ctx.beginPath(); ctx.arc(dx, ey, 5.5, 0, TAU); ctx.fill(); }
  } else if (sp.ears === "leaf") {
    ctx.fillStyle = "hsl(115, 55%, 40%)";
    for (const [dx, rot] of [[-ex, -0.5], [ex, 0.5]]) { ctx.save(); ctx.translate(dx, ey - 3); ctx.rotate(rot); ctx.beginPath(); ctx.ellipse(0, -5, 4, 9, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  } else if (sp.ears === "antenna") {
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
    for (const dx of [-ex * 0.7, ex * 0.7]) {
      const wob = Math.sin(t * 4 + dx) * 2;
      ctx.beginPath(); ctx.moveTo(dx, ey + 2); ctx.quadraticCurveTo(dx * 1.6, ey - 8, dx * 1.5 + wob, ey - 14); ctx.stroke();
      ctx.fillStyle = "#fff6a8"; ctx.beginPath(); ctx.arc(dx * 1.5 + wob, ey - 14, 2.6, 0, TAU); ctx.fill();
    }
  } else if (sp.ears === "horns") {
    ctx.fillStyle = "#efe6d2";
    for (const dx of [-ex, ex]) { ctx.beginPath(); ctx.moveTo(dx - 3, ey + 3); ctx.quadraticCurveTo(dx + Math.sign(dx) * 6, ey - 4, dx + Math.sign(dx) * 4, ey - 10); ctx.lineTo(dx + 3, ey + 3); ctx.closePath(); ctx.fill(); }
  }

  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  if (sp.body === "blob") {
    ctx.moveTo(-bw, bh); ctx.quadraticCurveTo(-bw - 2, -bh, 0, -bh); ctx.quadraticCurveTo(bw + 2, -bh, bw, bh); ctx.closePath();
  } else {
    ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
  }
  ctx.fill();
  if (sp.body === "long") {                                 // head bump at the front
    ctx.beginPath(); ctx.arc(bw * 0.6, -bh * 0.45, bh * 0.85, 0, TAU); ctx.fill();
  }
  // belly
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.ellipse(bw * 0.1, bh * 0.35, bw * 0.55, bh * 0.45, 0, 0, TAU); ctx.fill();

  // shell / spots
  if (sp.extra === "shell") {
    ctx.fillStyle = "hsl(30, 25%, 38%)";
    ctx.beginPath(); ctx.ellipse(-bw * 0.25, -bh * 0.35, bw * 0.7, bh * 0.65, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-bw * 0.6, -bh * 0.4); ctx.lineTo(-bw * 0.1, -bh * 0.9); ctx.moveTo(-bw * 0.25, -bh * 0.35); ctx.lineTo(bw * 0.2, -bh * 0.85); ctx.stroke();
  } else if (sp.extra === "spots") {
    ctx.fillStyle = light;
    for (const [sx, sy, r] of [[-bw * 0.5, -bh * 0.3, 2.6], [-bw * 0.1, -bh * 0.6, 2], [-bw * 0.65, bh * 0.1, 1.8]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); }
  }

  // eyes (toward the front)
  const eyeX = sp.body === "long" ? bw * 0.7 : bw * 0.32;
  const eyeY = sp.body === "long" ? -bh * 0.6 : -bh * 0.25;
  const sleepy = opts.sleepy || traits.personality === "sleepy";
  const blink = (Math.sin(t * 1.3 + traits.hue) > 0.985);
  for (const dx of [-4.5, 4.5]) {
    const cx = eyeX + dx * 0.9 - 2;
    if (sleepy || blink) {
      ctx.strokeStyle = "#1b1530"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx - 2.6, eyeY); ctx.lineTo(cx + 2.6, eyeY); ctx.stroke();
    } else {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, eyeY, 3.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#1b1530"; ctx.beginPath(); ctx.arc(cx + 1.1, eyeY + 0.3, 2, 0, TAU); ctx.fill();
    }
  }
  // grumpy brows
  if (traits.personality === "grumpy") {
    ctx.strokeStyle = "#1b1530"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(eyeX - 8, eyeY - 6); ctx.lineTo(eyeX - 3, eyeY - 4); ctx.moveTo(eyeX + 6, eyeY - 6); ctx.lineTo(eyeX + 1, eyeY - 4); ctx.stroke();
  }

  ctx.restore();
}

// ── Farmer ────────────────────────────────────────────────────────────────────
export function drawFarmer(ctx, x, y, color, face, t, moving, label) {
  const bob = moving ? Math.abs(Math.sin(t * 11)) * 2.5 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 4.5, 0, 0, TAU); ctx.fill();
  // feet
  const step = moving ? Math.sin(t * 11) * 3 : 0;
  ctx.fillStyle = "#3b2c25";
  ctx.beginPath(); ctx.ellipse(-5 + step, -1, 4, 2.6, 0, 0, TAU); ctx.ellipse(5 - step, -1, 4, 2.6, 0, 0, TAU); ctx.fill();
  ctx.translate(0, -bob);
  // body
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, -14, 10, 12, 0, 0, TAU); ctx.fill();
  // head
  ctx.fillStyle = "#f2c9a0";
  ctx.beginPath(); ctx.arc(0, -31, 8.5, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1b1530";
  ctx.beginPath(); ctx.arc(face * 3.5 - 1.5, -31, 1.4, 0, TAU); ctx.arc(face * 3.5 + 2.5, -31, 1.4, 0, TAU); ctx.fill();
  // straw hat
  ctx.fillStyle = "#e9c46a";
  ctx.beginPath(); ctx.ellipse(0, -37, 13, 4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -40, 7, 5, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(-7, -40, 14, 2);
  ctx.restore();
  if (label) {
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(label, x, y + 16);
  }
}

// ── Map ───────────────────────────────────────────────────────────────────────
function tree(ctx, x, y, s, t) {
  const sway = Math.sin(t * 0.8 + x) * 1.5;
  ctx.fillStyle = "#4a3426"; ctx.fillRect(x - 3 * s, y - 10 * s, 6 * s, 12 * s);
  ctx.fillStyle = "#2f6b3a";
  ctx.beginPath(); ctx.arc(x + sway, y - 22 * s, 16 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3b8247";
  ctx.beginPath(); ctx.arc(x - 6 * s + sway, y - 27 * s, 9 * s, 0, TAU); ctx.fill();
}

export function drawMap(ctx, world, now, t) {
  // grass
  ctx.fillStyle = "#5c9e4c";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 90; i++) {
    const gx = (i * 137) % WORLD_W, gy = MAP.wildEdge + ((i * 263) % (WORLD_H - MAP.wildEdge));
    ctx.fillRect(gx, gy, 2, 5);
  }

  // wild edge
  ctx.fillStyle = "#2b5a33";
  ctx.fillRect(0, 0, WORLD_W, MAP.wildEdge - 10);
  for (let x = 10; x < WORLD_W; x += 34) tree(ctx, x + ((x * 7) % 13), MAP.wildEdge - 2 + ((x * 3) % 9), 1, t);

  // path from house to field
  ctx.fillStyle = "#b99a6b";
  ctx.beginPath(); ctx.roundRect(200, 255, 360, 22, 11); ctx.fill();
  ctx.beginPath(); ctx.roundRect(MAP.pen.x + 84, 255, 22, MAP.pen.y - 250, 11); ctx.fill();   // to the pen gate

  // house
  const hs = MAP.house;
  ctx.fillStyle = "#c97b4a"; ctx.fillRect(hs.x, hs.y + 30, hs.w, hs.h - 30);
  ctx.fillStyle = "#8c3b2e";
  ctx.beginPath(); ctx.moveTo(hs.x - 12, hs.y + 34); ctx.lineTo(hs.x + hs.w / 2, hs.y - 8); ctx.lineTo(hs.x + hs.w + 12, hs.y + 34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a3a28"; ctx.fillRect(hs.x + hs.w / 2 - 13, hs.y + hs.h - 38, 26, 38);
  ctx.fillStyle = "#ffe9a8"; ctx.fillRect(hs.x + 18, hs.y + 50, 24, 20); ctx.fillRect(hs.x + hs.w - 42, hs.y + 50, 24, 20);

  // food crate
  const st = MAP.store;
  ctx.fillStyle = "#a5753f"; ctx.fillRect(st.x - 26, st.y - 22, 52, 34);
  ctx.strokeStyle = "#6e4a24"; ctx.lineWidth = 3; ctx.strokeRect(st.x - 26, st.y - 22, 52, 34);
  ctx.beginPath(); ctx.moveTo(st.x - 26, st.y - 5); ctx.lineTo(st.x + 26, st.y - 5); ctx.stroke();
  ctx.font = "13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  ctx.fillText(Object.keys(world.food).map(k => `${CROPS[k]?.icon ?? ""}${world.food[k]}`).join(" "), st.x, st.y + 30);

  // field
  for (let i = 0; i < PLOT_COUNT; i++) {
    const r = plotRect(i);
    ctx.fillStyle = "#6b4a32";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(r.x + 6, r.y + k * r.h / 4); ctx.lineTo(r.x + r.w - 6, r.y + k * r.h / 4); ctx.stroke(); }
    const crop = world.plots[i];
    if (crop) {
      const g = growth(crop, now);
      const ripe = g >= 1;
      ctx.font = `${Math.round(14 + g * 18)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(g < 0.4 ? "🌱" : CROPS[crop.kind].icon, r.cx, r.cy + (ripe ? Math.sin(t * 4 + i) * 2 : 0));
      ctx.textBaseline = "alphabetic";
      if (!ripe) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(r.x + 6, r.y + r.h - 8, r.w - 12, 4);
        ctx.fillStyle = CROPS[crop.kind].type === "lure" ? "#ffb3e6" : "#b7f07a"; ctx.fillRect(r.x + 6, r.y + r.h - 8, (r.w - 12) * g, 4);
      } else {
        ctx.strokeStyle = "rgba(255,230,120,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 6); ctx.stroke();
      }
    }
  }

  // pen
  const p = MAP.pen;
  ctx.fillStyle = "rgba(120,170,80,0.5)";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = "#8a6034"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x + 60, p.y); ctx.lineTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.lineTo(p.x + p.w, p.y); ctx.lineTo(p.x + 130, p.y);
  ctx.stroke();
  ctx.fillStyle = "#8a6034";
  for (let x = p.x; x <= p.x + p.w; x += 30) { if (x > p.x + 60 && x < p.x + 130) continue; ctx.fillRect(x - 2, p.y - 6, 4, 10); ctx.fillRect(x - 2, p.y + p.h - 6, 4, 10); }
  for (let y = p.y; y <= p.y + p.h; y += 30) { ctx.fillRect(p.x - 2, y - 4, 4, 10); ctx.fillRect(p.x + p.w - 2, y - 4, 4, 10); }
  ctx.font = "bold 12px system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textAlign = "left";
  ctx.fillText("PEN", p.x + 8, p.y + 18);
}

// Little bar drawn over a creature/visitor
export function drawBar(ctx, x, y, frac, color, w = 34) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 6, 3); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x - w / 2 + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), 4, 2); ctx.fill();
}