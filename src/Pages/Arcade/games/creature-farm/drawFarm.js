// src/Pages/Arcade/games/creature-farm/drawFarm.js
//
// All the drawing for Creature Farm, done with code (no image files):
//   drawCreature  — builds a creature from its parts in species.js
//   drawFarmer    — the two players
//   drawMap       — trees, house, food crate, field, pen, trough, stall, workshops
//   drawItemIcon  — every item (food, creature goods, workshop goods)
// Each creature is drawn at (x, y) = the spot under its feet.

import { SPECIES, CROPS } from "./species";
import { MAP, WORLD_W, WORLD_H, PLOT_COUNT, plotRect, growth } from "./farmWorld";
import { WORKSHOPS, ITEMS, STORE_ITEMS, troughCap } from "./ranch";

const TAU = Math.PI * 2;

export function creatureColor(species, traits, dl = 0) {
  const sp = SPECIES[species];
  // rare (golden) critters: rich gold body whatever their species
  if (traits.rare) return `hsl(46, 92%, ${Math.max(5, Math.min(95, 58 + dl))}%)`;
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

  // rare: soft golden glow on the ground
  if (traits.rare) {
    ctx.fillStyle = `rgba(255,214,90,${0.22 + Math.sin(t * 3) * 0.08})`;
    ctx.beginPath(); ctx.ellipse(0, -bh * 0.8, bw * 1.6, bh * 1.5, 0, 0, TAU); ctx.fill();
  }

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

  // rare: twinkling sparkles around it
  if (traits.rare) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.3 + i * 2.1, tw = (Math.sin(t * 5 + i * 1.7) + 1) / 2;
      const px = x + Math.cos(a) * (bw + 8) * s, py = y - (bh + 4) * s + Math.sin(a) * (bh + 6) * s;
      drawTwinkle(ctx, px, py, (2 + tw * 3) * s, `rgba(255,240,170,${0.4 + tw * 0.6})`);
    }
    ctx.restore();
  }
}

function drawTwinkle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y - r * 0.3); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.3, y + r * 0.3);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y + r * 0.3); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r * 0.3);
  ctx.closePath(); ctx.fill();
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
  ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  STORE_ITEMS.forEach((k, i) => {
    const fx = st.x - 30 + i * 32;
    drawCropSprite(ctx, k, fx, st.y + 26, 14, t);
    ctx.fillText(String(Math.floor(world.food[k])), fx + 8, st.y + 31);
  });

  // feeding trough: wooden box, food heaped by how full it is
  if (MAP.trough) {
    const tr = MAP.trough;
    const capN = troughCap(world);
    const have = (world.trough?.berry || 0) + (world.trough?.carrot || 0);
    const frac = Math.min(1, have / capN);
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(tr.x, tr.y + 12, 38, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a5a34"; ctx.fillRect(tr.x - 34, tr.y - 10, 68, 20);
    ctx.fillStyle = "#5a3418"; ctx.fillRect(tr.x - 30, tr.y - 8, 60, 6);
    if (frac > 0) {
      ctx.fillStyle = "#e0a050";
      ctx.beginPath(); ctx.ellipse(tr.x, tr.y - 8, 29 * Math.max(0.3, frac), 3 + frac * 6, 0, Math.PI, 0); ctx.fill();
      for (let i = 0; i < Math.min(8, Math.ceil(frac * 8)); i++) drawCropSprite(ctx, i % 2 ? "carrot" : "berry", tr.x - 22 + i * 6.5, tr.y - 11 - (i % 3) * 2, 9, t);
    }
    ctx.strokeStyle = "#5a3418"; ctx.lineWidth = 2; ctx.strokeRect(tr.x - 34, tr.y - 10, 68, 20);
    ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = frac === 0 ? "#ffb0b0" : "rgba(255,255,255,0.85)";
    ctx.fillText(frac === 0 ? "EMPTY" : `${have}/${capN}`, tr.x, tr.y + 24);
  }

  // market stall (once it's built)
  if (world.buildings?.stall && MAP.stall) {
    const sl = MAP.stall;
    ctx.fillStyle = "#8a5a34"; ctx.fillRect(sl.x - 26, sl.y - 6, 52, 24);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#ffffff" : "#e04848"; ctx.fillRect(sl.x - 30 + i * 15, sl.y - 22, 15, 14); }
    ctx.fillStyle = "#6b4426"; ctx.fillRect(sl.x - 28, sl.y - 22, 3, 40); ctx.fillRect(sl.x + 25, sl.y - 22, 3, 40);
    drawCropSprite(ctx, "berry", sl.x - 10, sl.y + 2, 12, t); drawCropSprite(ctx, "carrot", sl.x + 10, sl.y + 2, 12, t);
  }

  // workshops (once built)
  for (const [key, st] of Object.entries(world.workshops || {})) {
    const pos = MAP.workshops?.[key];
    if (st?.level && pos) drawWorkshop(ctx, key, pos.x, pos.y, st, world, t);
  }

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
      const bobY = r.cy + (ripe ? Math.sin(t * 4 + i) * 2 : 0);
      if (g < 0.4) drawSprout(ctx, r.cx, bobY, 18 + g * 20);
      else drawCropSprite(ctx, crop.kind, r.cx, bobY, 18 + g * 22, t);
      if (!ripe) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(r.x + 6, r.y + r.h - 8, r.w - 12, 4);
        ctx.fillStyle = CROPS[crop.kind].color || "#b7f07a"; ctx.fillRect(r.x + 6, r.y + r.h - 8, (r.w - 12) * g, 4);
      } else {
        ctx.strokeStyle = "rgba(255,230,120,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 6); ctx.stroke();
      }
    }
  }

  drawSignpost(ctx, MAP.sign.x, MAP.sign.y, t);

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

// ── Sprites (no emojis — they render differently, or not at all, on some
//    computers). Each draws centred on (cx, cy) inside a size×size box. ──────

function inBox(ctx, cx, cy, size, fn) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 32, size / 32);   // draw in a 32×32 box centred on 0,0
  fn();
  ctx.restore();
}

export function drawSprout(ctx, cx, cy, size) {
  inBox(ctx, cx, cy, size, () => {
    ctx.strokeStyle = "#3f8f3a"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.quadraticCurveTo(1, 4, 0, -2); ctx.stroke();
    ctx.fillStyle = "#6cc24a";
    ctx.beginPath(); ctx.ellipse(-6, -4, 7, 3.5, -0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -6, 7, 3.5, 0.5, 0, TAU); ctx.fill();
  });
}

export function drawCropSprite(ctx, kind, cx, cy, size, t = 0) {
  inBox(ctx, cx, cy, size, () => {
    if (kind === "berry") {
      ctx.fillStyle = "#3f8f3a";
      ctx.beginPath(); ctx.ellipse(-4, -12, 5, 2.5, -0.6, 0, TAU); ctx.ellipse(4, -12, 5, 2.5, 0.6, 0, TAU); ctx.fill();
      for (const [x, y] of [[0, -5], [-6, 4], [6, 4], [0, 11]]) {
        ctx.fillStyle = "#3d4fc9"; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#6b7ff0"; ctx.beginPath(); ctx.arc(x - 2, y - 2, 2.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#26307a"; ctx.beginPath(); ctx.arc(x + 1.5, y + 2.5, 1.2, 0, TAU); ctx.fill();
      }
    } else if (kind === "carrot") {
      ctx.strokeStyle = "#3f8f3a"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-5, -15); ctx.moveTo(0, -8); ctx.lineTo(0, -16); ctx.moveTo(0, -8); ctx.lineTo(5, -15); ctx.stroke();
      ctx.fillStyle = "#f08a24";
      ctx.beginPath(); ctx.moveTo(-7, -8); ctx.quadraticCurveTo(0, -11, 7, -8); ctx.lineTo(1, 15); ctx.lineTo(-1, 15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#c2610f"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(0, -1); ctx.moveTo(3, 4); ctx.lineTo(-1, 5); ctx.moveTo(-2, 9); ctx.lineTo(1, 10); ctx.stroke();
    } else if (kind === "sweetroot") {
      ctx.fillStyle = "#3f8f3a";
      ctx.beginPath(); ctx.ellipse(-3, -12, 6, 2.5, -0.7, 0, TAU); ctx.ellipse(4, -13, 5, 2.2, 0.5, 0, TAU); ctx.fill();
      ctx.save(); ctx.rotate(-0.5);
      ctx.fillStyle = "#c2457a"; ctx.beginPath(); ctx.ellipse(0, 2, 8.5, 13, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#e88ab0"; ctx.lineWidth = 1.5;
      for (const y of [-5, 1, 7]) { ctx.beginPath(); ctx.ellipse(0, y, 7, 2, 0, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-3, -3, 2, 4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (kind === "glowcap") {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      const glow = ctx.createRadialGradient(0, -4, 2, 0, -4, 18);
      glow.addColorStop(0, `rgba(255,170,230,${0.35 + pulse * 0.25})`); glow.addColorStop(1, "rgba(255,170,230,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -4, 18, 0, TAU); ctx.fill();
      ctx.fillStyle = "#f3e6cf"; ctx.beginPath(); ctx.roundRect(-4, -2, 8, 15, 3); ctx.fill();
      ctx.fillStyle = "#e0407a"; ctx.beginPath(); ctx.ellipse(0, -3, 13, 10, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff";
      for (const [x, y, r] of [[-6, -7, 2.2], [2, -10, 2], [7, -5, 1.8], [-1, -5, 1.4]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    }
  });
}

export function drawHeart(ctx, cx, cy, size, color) {
  inBox(ctx, cx, cy, size, () => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-18, 0, -12, -16, 0, -6);
    ctx.bezierCurveTo(12, -16, 18, 0, 0, 12);
    ctx.fill();
  });
}

export function drawBowl(ctx, cx, cy, size) {
  inBox(ctx, cx, cy, size, () => {
    ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.ellipse(0, -2, 11, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(-13, -2); ctx.quadraticCurveTo(0, 22, 13, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-8, 1, 5, 2);
  });
}

export function drawSun(ctx, cx, cy, size) {
  inBox(ctx, cx, cy, size, () => {
    ctx.strokeStyle = "#ffcc4d"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke();
    }
    ctx.fillStyle = "#ffcc4d"; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, TAU); ctx.fill();
  });
}

export function drawPaw(ctx, cx, cy, size, color = "#f3ecff") {
  inBox(ctx, cx, cy, size, () => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 5, 8, 6.5, 0, 0, TAU); ctx.fill();
    for (const [x, y] of [[-9, -3], [-3.5, -9], [3.5, -9], [9, -3]]) { ctx.beginPath(); ctx.ellipse(x, y, 3.2, 4, 0, 0, TAU); ctx.fill(); }
  });
}

export function drawQuestion(ctx, cx, cy, size) {
  inBox(ctx, cx, cy, size, () => {
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(-8, 15); ctx.lineTo(2, 11); ctx.fill();
    ctx.fillStyle = "#3d2b6b"; ctx.font = "bold 17px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 1);
    ctx.textBaseline = "alphabetic";
  });
}

// The run board signpost: a wooden post with a board showing a little goop
// and an arrow — walk up to it to go on a run.
export function drawSignpost(ctx, x, y, t = 0) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#7a5230"; ctx.fillRect(x - 3, y - 44, 6, 44);
  // board (gently swinging)
  ctx.translate(x, y - 44);
  ctx.rotate(Math.sin(t * 1.5) * 0.03);
  ctx.fillStyle = "#c9955a";
  ctx.beginPath(); ctx.roundRect(-26, -22, 52, 26, 4); ctx.fill();
  ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 2; ctx.stroke();
  // arrow
  ctx.fillStyle = "#4a2f18";
  ctx.beginPath(); ctx.moveTo(4, -15); ctx.lineTo(18, -9); ctx.lineTo(4, -3); ctx.lineTo(4, -7); ctx.lineTo(-4, -7); ctx.lineTo(-4, -11); ctx.lineTo(4, -11); ctx.closePath(); ctx.fill();
  // tiny goop on the left
  ctx.fillStyle = "#5a2a78";
  ctx.beginPath(); ctx.moveTo(-20, -4); ctx.quadraticCurveTo(-21, -17, -14, -18); ctx.quadraticCurveTo(-7, -17, -8, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffe14d";
  ctx.beginPath(); ctx.arc(-16, -12, 1.4, 0, TAU); ctx.arc(-12, -12, 1.4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("RUNS", x, y + 14);
}

// Little icon over a creature showing what it's doing (no emojis — drawn shapes).
//   forager: basket · farmhand: sprout · feeder: bowl · groomer: heart
//   resting: z's · sad: grey raincloud · starving: empty bowl
export function drawWorkIcon(ctx, x, y, kind, t) {
  ctx.save();
  if (kind === "forager") {
    ctx.fillStyle = "#c9955a"; ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 4, y + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - 3, 5, Math.PI, 0); ctx.stroke();
    drawCropSprite(ctx, "berry", x, y - 4, 7, t);
  } else if (kind === "farmhand") drawSprout(ctx, x, y, 14);
  else if (kind === "feeder") drawBowl(ctx, x, y, 14);
  else if (kind === "groomer") drawHeart(ctx, x, y, 11, "#ff7aa8");
  else if (kind === "crafter") {
    const sw = Math.sin(t * 7) * 0.5;
    ctx.translate(x, y); ctx.rotate(-0.4 + sw);
    ctx.fillStyle = "#8a5a34"; ctx.fillRect(-1.2, -2, 2.4, 10);
    ctx.fillStyle = "#9aa3b0"; ctx.fillRect(-5, -5, 10, 4);
  } else if (kind === "hauler") {
    ctx.fillStyle = "#c9a26a"; ctx.beginPath(); ctx.ellipse(x, y + 1, 6, 5.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#a8834e"; ctx.beginPath(); ctx.moveTo(x - 3, y - 4); ctx.lineTo(x + 3, y - 4); ctx.lineTo(x + 1.5, y - 7); ctx.lineTo(x - 1.5, y - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(x, y + 1.5, 2, 0, TAU); ctx.fill();
  }
  else if (kind === "resting") {
    ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#cfe8ff";
    const b = (t * 0.8) % 1;
    ctx.globalAlpha = 1 - b; ctx.fillText("z", x + b * 6, y - b * 8);
    ctx.globalAlpha = 1; ctx.fillText("z", x - 4, y + 2);
  } else if (kind === "sad") {
    ctx.fillStyle = "#9aa3b0";
    ctx.beginPath(); ctx.arc(x - 4, y, 4, 0, Math.PI * 2); ctx.arc(x + 2, y - 2, 5, 0, Math.PI * 2); ctx.arc(x + 6, y + 1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6fb0ff"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const d = ((t * 1.5 + i * 0.33) % 1) * 7; ctx.beginPath(); ctx.moveTo(x - 4 + i * 4, y + 5 + d); ctx.lineTo(x - 5 + i * 4, y + 8 + d); ctx.stroke(); }
  } else if (kind === "starving") drawBowl(ctx, x, y + Math.sin(t * 4) * 2, 16);
  ctx.restore();
}

// ── Items ─────────────────────────────────────────────────────────────────────
// Every item, drawn in code (size = box size in px).
export function drawItemIcon(ctx, kind, cx, cy, size, t = 0) {
  if (kind === "berry" || kind === "carrot") return drawCropSprite(ctx, kind, cx, cy, size, t);
  inBox(ctx, cx, cy, size, () => {
    if (kind === "moss") {
      ctx.fillStyle = "#3f7f2e"; ctx.beginPath(); ctx.ellipse(0, 8, 14, 6, 0, 0, TAU); ctx.fill();
      for (const [x, y, r, c] of [[-7, 2, 7, "#5aa83e"], [5, 0, 8, "#6fbf4a"], [-1, -6, 7, "#86d65c"], [9, 6, 5, "#5aa83e"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(-3, -8, 2.5, 0, TAU); ctx.fill();
    } else if (kind === "ember") {
      const f = Math.sin(t * 8) * 1.5;
      ctx.fillStyle = "#ff5a1f"; ctx.beginPath(); ctx.moveTo(0, -15 - f); ctx.quadraticCurveTo(13, 0, 8, 10); ctx.quadraticCurveTo(0, 16, -8, 10); ctx.quadraticCurveTo(-13, 0, 0, -15 - f); ctx.fill();
      ctx.fillStyle = "#ffb02e"; ctx.beginPath(); ctx.moveTo(0, -6 - f); ctx.quadraticCurveTo(7, 3, 4, 9); ctx.quadraticCurveTo(0, 12, -4, 9); ctx.quadraticCurveTo(-7, 3, 0, -6 - f); ctx.fill();
      ctx.fillStyle = "#fff1b0"; ctx.beginPath(); ctx.ellipse(0, 7, 2.5, 3.5, 0, 0, TAU); ctx.fill();
    } else if (kind === "bubble") {
      for (const [x, y, r] of [[-4, 3, 10], [8, -7, 6], [9, 9, 4]]) {
        ctx.fillStyle = "rgba(127,212,255,0.45)"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#7fd4ff"; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); ctx.fill();
      }
    } else if (kind === "fluff") {
      ctx.fillStyle = "#ffc4e6";
      for (const [x, y, r] of [[-8, 3, 7], [0, -3, 9], [8, 3, 7], [0, 7, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = "#fff0f8"; ctx.beginPath(); ctx.arc(-2, -5, 3.5, 0, TAU); ctx.fill();
    } else if (kind === "glow") {
      const p = 0.6 + 0.4 * Math.sin(t * 3);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 15); g.addColorStop(0, `rgba(255,236,120,${0.55 * p})`); g.addColorStop(1, "rgba(255,236,120,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffe36b";
      for (const [x, y, r] of [[0, 0, 4], [-8, -5, 2.5], [7, -7, 2], [6, 7, 2.5], [-6, 8, 1.8], [10, 1, 1.5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
    } else if (kind === "pebble") {
      for (const [x, y, rx, ry, c] of [[-6, 5, 8, 6, "#8f8476"], [6, 6, 7, 5, "#a89a8a"], [0, -4, 7, 6, "#bdb0a0"]]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, rx * 0.35, ry * 0.3, 0, 0, TAU); ctx.fill();
      }
    } else if (kind === "spark") {
      ctx.fillStyle = "#c49bff"; ctx.strokeStyle = "#7a4fd0"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(3, -15); ctx.lineTo(-8, 2); ctx.lineTo(-1, 2); ctx.lineTo(-4, 15); ctx.lineTo(9, -3); ctx.lineTo(2, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f3e6ff"; ctx.beginPath(); ctx.arc(-10 + Math.sin(t * 6) * 1.5, -8, 1.8, 0, TAU); ctx.arc(11, 9, 1.5, 0, TAU); ctx.fill();
    } else if (kind === "jam") {
      ctx.fillStyle = "#8a4be0"; ctx.beginPath(); ctx.roundRect(-10, -6, 20, 20, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-7, -3, 3, 12);
      ctx.fillStyle = "#f3ecff"; ctx.fillRect(-11, -11, 22, 6);
      ctx.fillStyle = "#e04848"; ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(11, -11); ctx.lineTo(9, -14); ctx.lineTo(-9, -14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(-6, 1, 12, 7, 2); ctx.fill();
      ctx.fillStyle = "#3d4fc9"; ctx.beginPath(); ctx.arc(0, 4.5, 2.2, 0, TAU); ctx.fill();
    } else if (kind === "brick") {
      ctx.fillStyle = "#9a3f28"; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-6, -9); ctx.lineTo(14, -9); ctx.lineTo(14, 5); ctx.lineTo(6, 12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#c4573a"; ctx.fillRect(-14, -2, 20, 14);
      ctx.fillStyle = "#d9775a"; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-6, -9); ctx.lineTo(14, -9); ctx.lineTo(6, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(-4, 5, 2.5, 2, 0, 0, TAU); ctx.ellipse(2, 5, 2.5, 2, 0, 0, TAU); ctx.fill();
    } else if (kind === "blanket") {
      ctx.fillStyle = "#ff9ad0"; ctx.beginPath(); ctx.roundRect(-14, -8, 28, 20, 4); ctx.fill();
      ctx.fillStyle = "#ffffff"; for (let i = 0; i < 3; i++) ctx.fillRect(-14, -4 + i * 6, 28, 2);
      ctx.fillStyle = "#e86fb0"; ctx.beginPath(); ctx.roundRect(-14, -12, 28, 7, 3); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(-11, -11, 10, 2);
    } else if (kind === "cake") {
      ctx.fillStyle = "#c98a3e"; ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(14, 12); ctx.lineTo(14, -2); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff4e0"; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(14, -2); ctx.lineTo(14, 2); ctx.lineTo(-14, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff4e0"; ctx.beginPath(); ctx.moveTo(-15, 5); ctx.lineTo(14, -4); ctx.lineTo(14, -7); ctx.lineTo(-15, 2); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(7, -9); ctx.scale(0.45, 0.45); ctx.fillStyle = "#f08a24"; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.quadraticCurveTo(0, -11, 7, -8); ctx.lineTo(1, 15); ctx.lineTo(-1, 15); ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (kind === "lantern") {
      const p = 0.7 + 0.3 * Math.sin(t * 4);
      const g = ctx.createRadialGradient(0, 3, 1, 0, 3, 16); g.addColorStop(0, `rgba(255,214,90,${0.6 * p})`); g.addColorStop(1, "rgba(255,214,90,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 3, 16, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -12, 4, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = "#5a4630"; ctx.fillRect(-8, -12, 16, 4); ctx.fillRect(-8, 11, 16, 4);
      ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.roundRect(-7, -8, 14, 19, 3); ctx.fill();
      ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.ellipse(0, 3, 3, 5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7, 1); ctx.lineTo(7, 1); ctx.stroke();
    }
  });
}

// A workshop on the map: a little building in its own colours, a sign with
// what it makes, smoke while it's busy, a progress bar, and a note when it's
// waiting for something.
const WS_LOOK = {
  kitchen: { wall: "#e8c08a", roof: "#8a4be0" },
  kiln:    { wall: "#b8865a", roof: "#7a3420" },
  loom:    { wall: "#f0d6e6", roof: "#c0569a" },
  bakery:  { wall: "#f2d9a6", roof: "#c9822e" },
  lantern: { wall: "#c7c0e8", roof: "#4a3a8a" },
};
export function drawWorkshop(ctx, key, x, y, st, world, t) {
  const look = WS_LOOK[key] || WS_LOOK.kitchen, ws = WORKSHOPS[key];
  const busy = st.on !== false && !st.stalled && (st.progress || 0) > 0;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x, y + 22, 40, 7, 0, 0, TAU); ctx.fill();
  // chimney + smoke
  ctx.fillStyle = "#6b5444"; ctx.fillRect(x + 14, y - 34, 9, 16);
  if (busy) for (let i = 0; i < 3; i++) {
    const k = ((t * 0.5 + i / 3) % 1);
    ctx.fillStyle = `rgba(235,235,235,${0.5 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(x + 18 + Math.sin(k * 6 + i) * 4, y - 38 - k * 22, 4 + k * 5, 0, TAU); ctx.fill();
  }
  // walls + roof
  ctx.fillStyle = look.wall; ctx.fillRect(x - 32, y - 14, 64, 36);
  ctx.fillStyle = look.roof; ctx.beginPath(); ctx.moveTo(x - 38, y - 12); ctx.lineTo(x, y - 36); ctx.lineTo(x + 38, y - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a3a28"; ctx.fillRect(x - 24, y + 2, 14, 20);
  // sign with what it makes
  ctx.fillStyle = "#fff8e8"; ctx.beginPath(); ctx.roundRect(x - 4, y - 8, 30, 24, 5); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
  drawItemIcon(ctx, ws.makes, x + 11, y + 4, 20, t);
  // level pips
  for (let i = 0; i < (st.level || 1); i++) { ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(x - 22 + i * 8, y - 18, 2.5, 0, TAU); ctx.fill(); }
  // progress bar
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(x - 30, y + 26, 60, 5);
  ctx.fillStyle = st.stalled ? "#ff9a5d" : "#8ee06a"; ctx.fillRect(x - 30, y + 26, 60 * Math.min(1, st.progress || 0), 5);
  // note
  let note = null;
  if (st.on === false) note = "PAUSED";
  else if (st.stalled) {
    const miss = Object.entries(ws.needs).find(([k, n]) => (world.food?.[k] || 0) < n);
    note = miss ? `NEEDS ${ITEMS[miss[0]].name.toUpperCase()}` : null;
  }
  if (note) {
    ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center";
    const w = ctx.measureText(note).width + 8;
    ctx.fillStyle = "rgba(20,14,34,0.8)"; ctx.beginPath(); ctx.roundRect(x - w / 2, y + 33, w, 13, 4); ctx.fill();
    ctx.fillStyle = st.on === false ? "#cfc6e8" : "#ffcf8a"; ctx.fillText(note, x, y + 43);
  }
  ctx.restore();
}