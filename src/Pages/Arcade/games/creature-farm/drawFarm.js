// src/Pages/Arcade/games/creature-farm/drawFarm.js
//
// All the drawing for Creature Farm, done with code (no image files):
//   drawCreature  — builds a creature from its parts in species.js
//   drawFarmer    — the two players
//   drawMap       — trees, house, food crate, field, pen, trough, stall, workshops
//   drawItemIcon  — every item (food, creature goods, workshop goods)
// Each creature is drawn at (x, y) = the spot under its feet.

import { SPECIES, CROPS } from "./species";
import { MAP, WORLD_W, WORLD_H, PLOT_COUNT, plotRect, growth, worldWidth, plotCost, hutchSpots, worldHeight, penRect } from "./farmWorld";
import { WORKSHOPS, ITEMS, STORE_ITEMS, troughCap, missingInputs, housedCount, penSlots, penCost } from "./ranch";
import { sceneryCanvas } from "./drawScenery";

const TAU = Math.PI * 2;

export function creatureColor(species, traits, dl = 0) {
  const sp = SPECIES[species];
  // rare (golden) critters: rich gold body whatever their species
  if (traits.rare) return `hsl(46, 92%, ${Math.max(5, Math.min(95, 58 + dl))}%)`;
  return `hsl(${traits.hue}, ${sp.sat}%, ${Math.max(5, Math.min(95, sp.light + dl))}%)`;
}

// opts: { face: 1|-1, t: seconds, moving, scale, sleepy, alpha }
// Every part gets a soft dark outline (drawn as a thick stroke UNDER the fill,
// so overlapping parts don't show seams), the body gets light from the top-left,
// and the face gets highlights, cheeks and a little mouth.
export function drawCreature(ctx, x, y, species, traits, opts = {}) {
  const base = SPECIES[species];
  if (!base) return;
  const sp = traits.look ? { ...base, ...traits.look } : base;     // hybrids borrow ears, tails and wings from their other types
  const { face = 1, t = 0, moving = false, scale = 1, alpha = 1 } = opts;
  const s = (traits.size || 1) * scale;
  const body = creatureColor(species, traits);
  const dark = creatureColor(species, traits, -18);
  const light = creatureColor(species, traits, 16);
  const line = creatureColor(species, traits, -38);
  const bob = moving ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2.2) * 1.2;
  const squash = moving ? 1 + Math.sin(t * 20) * 0.04 : 1 + Math.sin(t * 2.2) * 0.015;
  const LW = 2.4;                                            // outline width (in creature units)
  const outlined = (path, fill, lw = LW) => { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round"; path(); ctx.stroke(); ctx.fillStyle = fill; path(); ctx.fill(); };

  // body dimensions per shape (half-width, half-height)
  const dims = { round: [15, 14], blob: [19, 12], long: [21, 11], tall: [12, 18] }[sp.body] || [15, 14];
  const bw = dims[0], bh = dims[1];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);

  // rare: soft golden glow on the ground
  if (traits.rare) {
    const gg = ctx.createRadialGradient(0, -bh * 0.8, 2, 0, -bh * 0.8, bw * 1.8);
    gg.addColorStop(0, `rgba(255,214,90,${0.35 + Math.sin(t * 3) * 0.1})`); gg.addColorStop(1, "rgba(255,214,90,0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, -bh * 0.8, bw * 1.8, bh * 1.7, 0, 0, TAU); ctx.fill();
  }

  // shadow (shrinks a little as it hops)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 0, bw * (0.95 - bob * 0.03), 4.5, 0, 0, TAU); ctx.fill();

  // little feet (not for blobs)
  if (sp.body !== "blob") {
    const step = moving ? Math.sin(t * 20) * 2 : 0;
    for (const [fx, ph] of [[-bw * 0.45, 1], [bw * 0.45, -1]]) outlined(() => { ctx.beginPath(); ctx.ellipse(fx + step * ph, -2, 4.2, 3, 0, 0, TAU); }, dark, 2);
  }

  ctx.translate(0, -bh - 2 - bob);
  ctx.scale(face * squash, 2 - squash);   // flip to face direction

  // wings (behind body)
  if (sp.extra === "wings") {
    const flap = Math.sin(t * (moving ? 18 : 5)) * 0.35;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * (0.5 + flap));
      ctx.strokeStyle = "rgba(90,90,140,0.45)"; ctx.lineWidth = 1.4;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.beginPath(); ctx.ellipse(-4, -bh * 0.4, 6.5, bh * 0.95, -0.4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(150,170,220,0.5)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-2, bh * 0.2); ctx.lineTo(-6, -bh * 0.9); ctx.stroke();
      ctx.restore();
    }
  }

  // tail (behind body, at the back = -x)
  const tx = -bw + 2, ty = bh * 0.25;
  if (sp.tail === "flame") {
    const fl = 1 + Math.sin(t * 14) * 0.15;
    const fg = ctx.createLinearGradient(tx, ty, tx - 10, ty - 22);
    fg.addColorStop(0, "#ff7a1f"); fg.addColorStop(1, "#ffcf3b");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(tx, ty - 3); ctx.quadraticCurveTo(tx - 16 * fl, ty - 10, tx - 10, ty - 22 * fl); ctx.quadraticCurveTo(tx - 4, ty - 8, tx, ty + 3); ctx.fill();
    ctx.fillStyle = "#fff1a0";
    ctx.beginPath(); ctx.moveTo(tx, ty - 2); ctx.quadraticCurveTo(tx - 8 * fl, ty - 7, tx - 6, ty - 13 * fl); ctx.quadraticCurveTo(tx - 2, ty - 5, tx, ty + 2); ctx.fill();
  } else if (sp.tail === "fin") {
    outlined(() => { ctx.beginPath(); ctx.moveTo(tx + 2, ty); ctx.lineTo(tx - 12, ty - 9 + Math.sin(t * 6) * 2); ctx.quadraticCurveTo(tx - 7, ty, tx - 10, ty + 8); ctx.closePath(); }, dark);
  } else if (sp.tail === "fluffy") {
    outlined(() => { ctx.beginPath(); ctx.arc(tx - 3, ty - 2, 7, 0, TAU); }, light);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(tx - 5, ty - 4, 2.5, 0, TAU); ctx.fill();
  } else if (sp.tail === "stinger") {
    ctx.strokeStyle = line; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx + 2, ty); ctx.quadraticCurveTo(tx - 14, ty - 2, tx - 10, ty - 16); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx + 2, ty); ctx.quadraticCurveTo(tx - 14, ty - 2, tx - 10, ty - 16); ctx.stroke();
    outlined(() => { ctx.beginPath(); ctx.moveTo(tx - 10, ty - 23); ctx.lineTo(tx - 5.5, ty - 14); ctx.lineTo(tx - 14.5, ty - 14); ctx.closePath(); }, "#ffe36b", 1.8);
  }

  // ears / head things (behind the body edge, on top)
  const ex = bw * 0.35, ey = -bh + 2;
  if (sp.ears === "pointy") {
    for (const dx of [-ex, ex]) {
      outlined(() => { ctx.beginPath(); ctx.moveTo(dx - 5, ey + 3); ctx.lineTo(dx + 1, ey - 11); ctx.lineTo(dx + 6, ey + 3); ctx.closePath(); }, dark);
      ctx.fillStyle = "rgba(255,170,190,0.6)"; ctx.beginPath(); ctx.moveTo(dx - 2, ey + 2); ctx.lineTo(dx + 1, ey - 6); ctx.lineTo(dx + 3.5, ey + 2); ctx.closePath(); ctx.fill();
    }
  } else if (sp.ears === "round") {
    for (const dx of [-ex, ex]) {
      outlined(() => { ctx.beginPath(); ctx.arc(dx, ey, 5.5, 0, TAU); }, dark);
      ctx.fillStyle = "rgba(255,180,200,0.55)"; ctx.beginPath(); ctx.arc(dx, ey + 0.5, 2.8, 0, TAU); ctx.fill();
    }
  } else if (sp.ears === "leaf") {
    for (const [dx, rot] of [[-ex, -0.5], [ex, 0.5]]) {
      ctx.save(); ctx.translate(dx, ey - 3); ctx.rotate(rot);
      ctx.strokeStyle = "hsl(115, 50%, 24%)"; ctx.lineWidth = LW; ctx.beginPath(); ctx.ellipse(0, -5, 4, 9, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = "hsl(115, 55%, 42%)"; ctx.beginPath(); ctx.ellipse(0, -5, 4, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "hsl(115, 55%, 60%)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -12); ctx.stroke();
      ctx.restore();
    }
  } else if (sp.ears === "antenna") {
    for (const dx of [-ex * 0.7, ex * 0.7]) {
      const wob = Math.sin(t * 4 + dx) * 2;
      ctx.strokeStyle = line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx, ey + 2); ctx.quadraticCurveTo(dx * 1.6, ey - 8, dx * 1.5 + wob, ey - 14); ctx.stroke();
      const ag = ctx.createRadialGradient(dx * 1.5 + wob, ey - 14, 0, dx * 1.5 + wob, ey - 14, 6);
      ag.addColorStop(0, "rgba(255,246,168,0.7)"); ag.addColorStop(1, "rgba(255,246,168,0)");
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(dx * 1.5 + wob, ey - 14, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff6a8"; ctx.beginPath(); ctx.arc(dx * 1.5 + wob, ey - 14, 2.6, 0, TAU); ctx.fill();
    }
  } else if (sp.ears === "horns") {
    for (const dx of [-ex, ex]) outlined(() => { ctx.beginPath(); ctx.moveTo(dx - 3, ey + 3); ctx.quadraticCurveTo(dx + Math.sign(dx) * 6, ey - 4, dx + Math.sign(dx) * 4, ey - 10); ctx.lineTo(dx + 3, ey + 3); ctx.closePath(); }, "#efe6d2", 2);
  }

  // body: outline first, then fill, then light + shade clipped to the body
  const bodyPath = () => {
    ctx.beginPath();
    if (sp.body === "blob") { ctx.moveTo(-bw, bh); ctx.quadraticCurveTo(-bw - 2, -bh, 0, -bh); ctx.quadraticCurveTo(bw + 2, -bh, bw, bh); ctx.closePath(); }
    else ctx.ellipse(0, 0, bw, bh, 0, 0, TAU);
    if (sp.body === "long") { ctx.moveTo(bw * 0.6 + bh * 0.85, -bh * 0.45); ctx.arc(bw * 0.6, -bh * 0.45, bh * 0.85, 0, TAU); }
  };
  ctx.strokeStyle = line; ctx.lineWidth = LW * 1.6; ctx.lineJoin = "round"; bodyPath(); ctx.stroke();
  ctx.fillStyle = body; bodyPath(); ctx.fill("nonzero");
  ctx.save();
  bodyPath(); ctx.clip("nonzero");
  const shade = ctx.createRadialGradient(-bw * 0.35, -bh * 0.6, 1, 0, 0, Math.max(bw, bh) * 1.35);
  shade.addColorStop(0, "rgba(255,255,255,0.30)"); shade.addColorStop(0.45, "rgba(255,255,255,0)"); shade.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = shade; ctx.fillRect(-bw * 2, -bh * 2, bw * 4, bh * 4);
  // belly
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.ellipse(bw * 0.1, bh * 0.45, bw * 0.55, bh * 0.45, 0, 0, TAU); ctx.fill();
  // shell / spots
  if (sp.extra === "shell") {
    ctx.fillStyle = "hsl(30, 28%, 40%)";
    ctx.beginPath(); ctx.ellipse(-bw * 0.25, -bh * 0.35, bw * 0.72, bh * 0.68, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = "hsl(30, 30%, 52%)";
    ctx.beginPath(); ctx.ellipse(-bw * 0.35, -bh * 0.55, bw * 0.35, bh * 0.25, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-bw * 0.6, -bh * 0.4); ctx.lineTo(-bw * 0.1, -bh * 0.9); ctx.moveTo(-bw * 0.25, -bh * 0.35); ctx.lineTo(bw * 0.2, -bh * 0.85); ctx.stroke();
  } else if (sp.extra === "spots") {
    ctx.fillStyle = light;
    for (const [sx, sy, r] of [[-bw * 0.5, -bh * 0.3, 2.6], [-bw * 0.1, -bh * 0.6, 2], [-bw * 0.65, bh * 0.1, 1.8]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  // top shine
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.ellipse(-bw * 0.35, -bh * 0.62, bw * 0.22, bh * 0.12, -0.5, 0, TAU); ctx.fill();

  // face (toward the front)
  const eyeX = sp.body === "long" ? bw * 0.7 : bw * 0.32;
  const eyeY = sp.body === "long" ? -bh * 0.6 : -bh * 0.25;
  const sleepy = opts.sleepy || traits.personality === "sleepy";
  const blink = (Math.sin(t * 1.3 + traits.hue) > 0.985);
  for (const dx of [-4.5, 4.5]) {
    const cx = eyeX + dx * 0.9 - 2;
    if (sleepy || blink) {
      ctx.strokeStyle = "#1b1530"; ctx.lineWidth = 1.7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, eyeY - 1, 2.6, 0.2, Math.PI - 0.2); ctx.stroke();
    } else {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(cx, eyeY, 3.6, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(27,21,48,0.35)"; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = "#1b1530"; ctx.beginPath(); ctx.ellipse(cx + 1.1, eyeY + 0.4, 2.2, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + 1.8, eyeY - 0.7, 0.9, 0, TAU); ctx.fill();
    }
  }
  // cheeks + mouth
  ctx.fillStyle = "rgba(255,120,150,0.35)";
  ctx.beginPath(); ctx.ellipse(eyeX - 8.5, eyeY + 4.5, 2.6, 1.6, 0, 0, TAU); ctx.ellipse(eyeX + 5.5, eyeY + 4.5, 2.6, 1.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#1b1530"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  ctx.beginPath();
  const mx = eyeX - 1.5, my = eyeY + 5;
  if (traits.personality === "grumpy") { ctx.moveTo(mx - 2, my + 1.2); ctx.quadraticCurveTo(mx, my - 0.6, mx + 2, my + 1.2); }
  else if (traits.personality === "playful" || traits.personality === "greedy") { ctx.moveTo(mx - 2.4, my); ctx.quadraticCurveTo(mx - 1.2, my + 1.8, mx, my); ctx.quadraticCurveTo(mx + 1.2, my + 1.8, mx + 2.4, my); }
  else { ctx.moveTo(mx - 1.8, my); ctx.quadraticCurveTo(mx, my + 1.6, mx + 1.8, my); }
  ctx.stroke();
  // grumpy brows
  if (traits.personality === "grumpy") {
    ctx.strokeStyle = "#1b1530"; ctx.lineWidth = 1.5;
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
  const bob = moving ? Math.abs(Math.sin(t * 11)) * 2.5 : Math.sin(t * 2) * 0.6;
  const step = moving ? Math.sin(t * 11) : 0;
  const LINE = "#2a1d2e";
  const ol = (path, fill, lw = 2.2) => { ctx.strokeStyle = LINE; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round"; path(); ctx.stroke(); ctx.fillStyle = fill; path(); ctx.fill(); };
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 4.5, 0, 0, TAU); ctx.fill();
  // boots
  for (const ph of [-1, 1]) ol(() => { ctx.beginPath(); ctx.ellipse(ph * 4.5 + step * 3 * ph, -2, 4.2, 2.8, 0, 0, TAU); }, "#4a3328", 1.8);
  ctx.translate(0, -bob);
  // arms (behind the body when walking)
  const swing = moving ? Math.sin(t * 11) * 0.6 : 0.1;
  for (const ph of [-1, 1]) {
    ctx.save(); ctx.translate(ph * 8, -20); ctx.rotate(ph * 0.25 + swing * ph);
    ol(() => { ctx.beginPath(); ctx.roundRect(-2.6, 0, 5.2, 11, 2.6); }, color, 1.8);
    ol(() => { ctx.beginPath(); ctx.arc(0, 11.5, 2.6, 0, TAU); }, "#f2c9a0", 1.5);
    ctx.restore();
  }
  // shirt + overalls
  ol(() => { ctx.beginPath(); ctx.ellipse(0, -14, 9.5, 11.5, 0, 0, TAU); }, color);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -14, 9.5, 11.5, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = "#3f6fb5"; ctx.fillRect(-10, -14, 20, 16);
  ctx.fillStyle = "#355f9e"; ctx.fillRect(-5, -16, 10, 6);
  ctx.fillStyle = "#3f6fb5"; ctx.fillRect(-6, -20, 2.5, 8); ctx.fillRect(3.5, -20, 2.5, 8);
  ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(-4.7, -13, 1, 0, TAU); ctx.arc(4.7, -13, 1, 0, TAU); ctx.fill();
  const sh = ctx.createLinearGradient(-9, -24, 9, -2);
  sh.addColorStop(0, "rgba(255,255,255,0.2)"); sh.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = sh; ctx.fillRect(-10, -26, 20, 24);
  ctx.restore();
  // head
  ol(() => { ctx.beginPath(); ctx.arc(0, -31, 8.5, 0, TAU); }, "#f2c9a0");
  ctx.fillStyle = "#7a4a2a"; ctx.beginPath(); ctx.ellipse(-face * 5, -31, 3.5, 5, 0, 0, TAU); ctx.fill();     // hair at the back
  ctx.fillStyle = "#1b1530";
  ctx.beginPath(); ctx.ellipse(face * 3.5 - 1.2, -31, 1.2, 1.6, 0, 0, TAU); ctx.ellipse(face * 3.5 + 2.6, -31, 1.2, 1.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,120,120,0.35)"; ctx.beginPath(); ctx.ellipse(face * 5.5, -27.5, 2, 1.3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#7a3b2a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(face * 2.6, -28, 1.6, 0.2, Math.PI - 0.2); ctx.stroke();
  // straw hat with a band in the player's colour
  ol(() => { ctx.beginPath(); ctx.ellipse(0, -37, 13.5, 4, 0, 0, TAU); }, "#e9c46a", 1.8);
  ol(() => { ctx.beginPath(); ctx.ellipse(0, -39.5, 7.5, 5.5, 0, Math.PI, TAU); ctx.closePath(); }, "#f0cf7a", 1.8);
  ctx.fillStyle = color; ctx.fillRect(-7.3, -41, 14.6, 2.4);
  ctx.strokeStyle = "rgba(160,120,40,0.5)"; ctx.lineWidth = 0.8;
  for (let k = -10; k <= 10; k += 4) { ctx.beginPath(); ctx.moveTo(k, -38.5); ctx.lineTo(k * 1.15, -35.5); ctx.stroke(); }
  ctx.restore();
  if (label) {
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    const w = ctx.measureText(label).width + 10;
    ctx.fillStyle = "rgba(20,14,34,0.55)"; ctx.beginPath(); ctx.roundRect(x - w / 2, y + 6, w, 15, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, y + 17);
  }
}

// ── Map ───────────────────────────────────────────────────────────────────────

export function drawMap(ctx, world, now, t) {
  const WW = worldWidth(world);                   // the farm grows east as you buy land
  // the still background (grass, paths, house, forest, pen) is painted once and reused
  const WH = worldHeight(world);                  // and south as the pen grows
  const bg = sceneryCanvas(WW, WH, penRect(world));
  if (bg) ctx.drawImage(bg, 0, 0, WW, WH);
  else { ctx.fillStyle = "#5c9e4c"; ctx.fillRect(0, 0, WW, WH); }

  drawHutches(ctx, world, t);
  drawCrate(ctx, world, t);
  drawTrough(ctx, world, t);
  if (world.buildings?.stall && MAP.stall) drawStall(ctx, MAP.stall.x, MAP.stall.y, t);

  // workshops (once built)
  for (const [key, st] of Object.entries(world.workshops || {})) {
    const pos = MAP.workshops?.[key];
    if (st?.level && pos) drawWorkshop(ctx, key, pos.x, pos.y, st, world, t);
  }
  (world.hatcheries || []).forEach((h, i) => { const pos = MAP.hatcheries[i]; if (pos) drawHatchery(ctx, pos.x, pos.y, h, t); });

  // field: the next plot for sale, then every plot you own
  drawForSale(ctx, plotRect(world.plots.length), plotCost(world.plots.length + 1), t);
  for (let i = 0; i < world.plots.length; i++) drawPlot(ctx, plotRect(i), world.plots[i], now, t, i);

  drawSignpost(ctx, MAP.sign.x, MAP.sign.y, t);
  drawButterflies(ctx, WW, t);
}

// One little hutch per pen spot (filled ones have a straw bed and a heart),
// plus a dashed "for sale" hutch for the next spot.
function drawHutches(ctx, world, t) {
  const spots = hutchSpots(world), slots = penSlots(world), used = housedCount(world);   // every spot gets a hutch, however many
  const n = Math.min(slots, spots.length);
  for (let i = 0; i < n; i++) hutch(ctx, spots[i].x, spots[i].y, i < used);
  if (slots < spots.length) {
    const s = spots[slots];
    ctx.save();
    ctx.setLineDash([4, 3]); ctx.lineDashOffset = -t * 5; ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x - 12, s.y); ctx.lineTo(s.x - 12, s.y - 14); ctx.lineTo(s.x, s.y - 22); ctx.lineTo(s.x + 12, s.y - 14); ctx.lineTo(s.x + 12, s.y); ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.font = "bold 8px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(20,14,34,0.7)"; ctx.beginPath(); ctx.roundRect(s.x - 15, s.y - 12, 30, 11, 5); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.fillText(String(penCost(slots + 1)), s.x, s.y - 3.5);
  }
}
function hutch(ctx, x, y, used) {
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(x + 1, y + 1, 13, 3.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#b07a46"; ctx.fillRect(x - 11, y - 14, 22, 14);
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(x - 11, y - 9, 22, 1); ctx.fillRect(x - 11, y - 4, 22, 1);
  ctx.fillStyle = "#8a3f2f"; ctx.beginPath(); ctx.moveTo(x - 14, y - 13); ctx.lineTo(x, y - 23); ctx.lineTo(x + 14, y - 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.beginPath(); ctx.moveTo(x - 14, y - 13); ctx.lineTo(x, y - 23); ctx.lineTo(x, y - 20); ctx.lineTo(x - 10, y - 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#3a2516"; ctx.beginPath(); ctx.arc(x, y - 6, 6, Math.PI, TAU); ctx.lineTo(x + 6, y); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
  if (used) {
    ctx.fillStyle = "#e8c860"; ctx.beginPath(); ctx.ellipse(x, y - 1, 5.5, 2, 0, 0, TAU); ctx.fill();
    drawHeart(ctx, x + 8, y - 15, 7, "#ff7aa8");
  }
}

// A raised wooden garden bed with tilled soil.
function drawPlot(ctx, r, crop, now, t, i) {
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.roundRect(r.x + 1, r.y + 4, r.w, r.h, 7); ctx.fill();
  ctx.fillStyle = "#7d5333"; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 7); ctx.fill();
  ctx.fillStyle = "#9b6a40"; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h - 3, 7); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(r.x + r.w / 2 - 0.5, r.y + 1, 1, 4); ctx.fillRect(r.x + r.w / 2 - 0.5, r.y + r.h - 6, 1, 4);
  // soil
  const sx = r.x + 5, sy = r.y + 5, sw = r.w - 10, sh = r.h - 12;
  ctx.fillStyle = crop ? "#4f3424" : "#5c3e2a"; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 4); ctx.fill();
  for (let k = 0; k < 4; k++) {
    const y = sy + 5 + k * (sh - 8) / 3;
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(sx + 3, y + 1.5, sw - 6, 2);
    ctx.fillStyle = crop ? "rgba(140,100,65,0.55)" : "rgba(150,110,72,0.6)"; ctx.fillRect(sx + 3, y - 1, sw - 6, 2);
  }
  if (!crop) return;
  const g = growth(crop, now);
  const ripe = g >= 1;
  const bobY = r.cy - 2 + (ripe ? Math.sin(t * 4 + i) * 1.5 : 0);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(r.cx, r.cy + 10, 8 + g * 6, 3, 0, 0, TAU); ctx.fill();
  if (ripe) {
    const glow = ctx.createRadialGradient(r.cx, bobY, 2, r.cx, bobY, 26);
    glow.addColorStop(0, "rgba(255,240,150,0.35)"); glow.addColorStop(1, "rgba(255,240,150,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(r.cx, bobY, 26, 0, TAU); ctx.fill();
  }
  if (g < 0.4) drawSprout(ctx, r.cx, bobY + 4, 18 + g * 20);
  else drawCropSprite(ctx, crop.kind, r.cx, bobY, 18 + g * 22, t);
  if (!ripe) {
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(r.x + 8, r.y + r.h - 9, r.w - 16, 4, 2); ctx.fill();
    ctx.fillStyle = CROPS[crop.kind].color || "#b7f07a"; ctx.beginPath(); ctx.roundRect(r.x + 8, r.y + r.h - 9, Math.max(2, (r.w - 16) * g), 4, 2); ctx.fill();
  } else {
    const tw = (Math.sin(t * 3 + i * 1.3) + 1) / 2;
    drawTwinkle(ctx, r.x + r.w - 10, r.y + 10, 2 + tw * 2.5, `rgba(255,248,200,${0.5 + tw * 0.5})`);
  }
}

function drawForSale(ctx, r, cost, t) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 7); ctx.fill();
  ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 6; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 7); ctx.stroke();
  ctx.setLineDash([]);
  // a little wooden sign on a stake
  ctx.fillStyle = "#6e4628"; ctx.fillRect(r.cx - 1.5, r.cy - 2, 3, 18);
  ctx.fillStyle = "#e9d2a8"; ctx.beginPath(); ctx.roundRect(r.cx - 25, r.cy - 20, 50, 26, 5); ctx.fill();
  ctx.strokeStyle = "#8a5a34"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#5a3418";
  ctx.fillText("FOR SALE", r.cx, r.cy - 9);
  ctx.fillStyle = "#b7791f"; ctx.font = "bold 10px system-ui, sans-serif"; ctx.fillText(`${cost} coins`, r.cx, r.cy + 2);
  ctx.restore();
}

// The shared food crate, with what's in it heaped on top and the counts below.
function drawCrate(ctx, world, t) {
  const st = MAP.store, x = st.x, y = st.y;
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 13, 32, 6, 0, 0, TAU); ctx.fill();
  const have = (k) => Math.floor(world.food?.[k] || 0);
  // produce peeking over the top
  const nB = Math.min(5, Math.ceil(have("berry") / 8)), nC = Math.min(4, Math.ceil(have("carrot") / 8));
  for (let k = 0; k < nC; k++) drawCropSprite(ctx, "carrot", x + 4 + k * 6, y - 22 - (k % 2) * 2, 13, t);
  for (let k = 0; k < nB; k++) drawCropSprite(ctx, "berry", x - 18 + k * 5, y - 21 - (k % 2) * 2, 11, t);
  // box
  ctx.fillStyle = "#a8743f"; ctx.fillRect(x - 27, y - 22, 54, 34);
  ctx.fillStyle = "#c08a50"; for (let k = 0; k < 3; k++) ctx.fillRect(x - 27, y - 21 + k * 11, 54, 9);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; for (let k = 0; k < 3; k++) ctx.fillRect(x - 27, y - 13 + k * 11, 54, 2);
  ctx.fillStyle = "#7a4e2c"; ctx.fillRect(x - 27, y - 22, 5, 34); ctx.fillRect(x + 22, y - 22, 5, 34);
  ctx.fillStyle = "#d9cfc2"; for (const nx of [x - 24.5, x + 24.5]) for (const ny of [y - 17, y + 7]) { ctx.beginPath(); ctx.arc(nx, ny, 1, 0, TAU); ctx.fill(); }
  // counts on a little chip
  ctx.fillStyle = "rgba(20,14,34,0.72)"; ctx.beginPath(); ctx.roundRect(x - 32, y + 18, 64, 17, 8); ctx.fill();
  ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  STORE_ITEMS.forEach((k, i) => {
    const fx = x - 22 + i * 32;
    drawCropSprite(ctx, k, fx, y + 26, 12, t);
    ctx.fillText(String(have(k)), fx + 7, y + 30.5);
  });
}

function drawTrough(ctx, world, t) {
  const tr = MAP.trough; if (!tr) return;
  const capN = troughCap(world);
  const have = (world.trough?.berry || 0) + (world.trough?.carrot || 0);
  const frac = Math.min(1, have / capN);
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(tr.x, tr.y + 13, 40, 7, 0, 0, TAU); ctx.fill();
  // legs
  ctx.fillStyle = "#6e4628";
  for (const lx of [tr.x - 28, tr.x + 24]) { ctx.fillRect(lx, tr.y + 2, 4, 11); }
  // body (slanted planks)
  ctx.fillStyle = "#8f5f37"; ctx.beginPath(); ctx.moveTo(tr.x - 36, tr.y - 10); ctx.lineTo(tr.x + 36, tr.y - 10); ctx.lineTo(tr.x + 30, tr.y + 8); ctx.lineTo(tr.x - 30, tr.y + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(tr.x - 34, tr.y - 4, 68, 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(tr.x - 32, tr.y + 2, 64, 1.5);
  // inside
  ctx.fillStyle = "#4a2c16"; ctx.beginPath(); ctx.ellipse(tr.x, tr.y - 10, 33, 4.5, 0, 0, TAU); ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = "#d9a050";
    ctx.beginPath(); ctx.ellipse(tr.x, tr.y - 10, 31 * Math.max(0.35, frac), 3 + frac * 6, 0, Math.PI, TAU); ctx.fill();
    for (let i = 0; i < Math.min(9, Math.ceil(frac * 9)); i++) drawCropSprite(ctx, i % 2 ? "carrot" : "berry", tr.x - 24 + i * 6, tr.y - 13 - (i % 3) * 2 - frac * 2, 9, t);
  }
  ctx.strokeStyle = "#5e3a20"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(tr.x, tr.y - 10, 36, 5, 0, 0, TAU); ctx.stroke();
  const label = frac === 0 ? "EMPTY" : `${have}/${capN}`;
  ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center";
  const lw = ctx.measureText(label).width + 12;
  ctx.fillStyle = frac === 0 ? "rgba(140,30,40,0.8)" : "rgba(20,14,34,0.65)"; ctx.beginPath(); ctx.roundRect(tr.x - lw / 2, tr.y + 15, lw, 14, 7); ctx.fill();
  ctx.fillStyle = frac === 0 ? "#ffd0d0" : "#fff"; ctx.fillText(label, tr.x, tr.y + 25.5);
}

function drawStall(ctx, x, y, t) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 20, 36, 6, 0, 0, TAU); ctx.fill();
  // posts
  ctx.fillStyle = "#6b4426"; ctx.fillRect(x - 30, y - 30, 4, 50); ctx.fillRect(x + 26, y - 30, 4, 50);
  // counter
  ctx.fillStyle = "#9b6a40"; ctx.fillRect(x - 30, y - 4, 60, 22);
  ctx.fillStyle = "rgba(0,0,0,0.15)"; for (let k = 1; k < 4; k++) ctx.fillRect(x - 30 + k * 15, y - 2, 1.5, 20);
  ctx.fillStyle = "#c08a50"; ctx.fillRect(x - 33, y - 7, 66, 5);
  // baskets of goods
  for (const [bx, kind] of [[x - 16, "berry"], [x, "jam"], [x + 16, "carrot"]]) {
    ctx.fillStyle = "#c9955a"; ctx.beginPath(); ctx.roundRect(bx - 7, y - 9, 14, 6, 2); ctx.fill();
    drawItemIcon(ctx, kind, bx, y - 13, 12, t);
  }
  // scalloped awning
  ctx.fillStyle = "#b8392f"; ctx.beginPath(); ctx.moveTo(x - 36, y - 26); ctx.lineTo(x - 28, y - 40); ctx.lineTo(x + 28, y - 40); ctx.lineTo(x + 36, y - 26); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 6; k++) {
    const sx = x - 36 + k * 12;
    ctx.fillStyle = k % 2 ? "#fff6ea" : "#e04848";
    ctx.beginPath(); ctx.moveTo(sx, y - 26); ctx.lineTo(sx + 2 + k * 0, y - 40); ctx.lineTo(sx + 12, y - 40); ctx.lineTo(sx + 12, y - 26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 6, y - 26, 6, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(x - 36, y - 27, 72, 2);
}

// A few butterflies drifting over the grass (pure decoration).
function drawButterflies(ctx, WW, t) {
  const cols = ["#ffffff", "#ffe36b", "#ffb3d1", "#bfe3ff"];
  for (let i = 0; i < 4; i++) {
    const bx = ((i * 263 + t * (8 + i * 3)) % (WW + 200)) - 100;
    const x = bx + Math.sin(t * 0.7 + i * 2) * 30, y = 130 + i * 70 + Math.sin(t * 1.3 + i) * 22;
    const f = Math.abs(Math.sin(t * 14 + i));
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.ellipse(x - 2.5 * f, y, 3 * f + 0.6, 2.4, -0.4, 0, TAU); ctx.ellipse(x + 2.5 * f, y, 3 * f + 0.6, 2.4, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3a2a20"; ctx.fillRect(x - 0.5, y - 2, 1, 4);
  }
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
  ctx.fillStyle = "#a8743f"; ctx.fillRect(x - 3, y - 44, 2, 44);
  // board (gently swinging)
  ctx.translate(x, y - 44);
  ctx.rotate(Math.sin(t * 1.5) * 0.03);
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.roundRect(-25, -19, 52, 26, 4); ctx.fill();
  ctx.fillStyle = "#c9955a";
  ctx.beginPath(); ctx.roundRect(-26, -22, 52, 26, 4); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(-24, -14, 48, 1); ctx.fillRect(-24, -6, 48, 1);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-24, -21, 48, 2);
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
  ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "rgba(20,14,34,0.6)"; ctx.beginPath(); ctx.roundRect(x - 19, y + 5, 38, 14, 7); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText("RUNS", x, y + 15.5);
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
  else if (kind === "meadow") {                       // waiting for a pen spot: a little dashed house
    ctx.setLineDash([2, 2]); ctx.strokeStyle = "#f3ecff"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 5); ctx.lineTo(x - 6, y - 1); ctx.lineTo(x, y - 7); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x + 6, y + 5); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
  }
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
    } else if (kind === "juice") {
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(7, 14); ctx.lineTo(-7, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff9a3c"; ctx.beginPath(); ctx.moveTo(-8.3, -4); ctx.lineTo(8.3, -4); ctx.lineTo(7, 14); ctx.lineTo(-7, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(-6, -2, 2.5, 13);
      ctx.strokeStyle = "#e04848"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(5, -14); ctx.lineTo(10, -15); ctx.stroke();
      ctx.fillStyle = "#3f8f3a"; ctx.beginPath(); ctx.ellipse(-4, -12, 4, 2, -0.5, 0, TAU); ctx.fill();
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
  juicer:  { wall: "#f5e3c4", roof: "#e07a1f" },
  loom:    { wall: "#f0d6e6", roof: "#c0569a" },
  bakery:  { wall: "#f2d9a6", roof: "#c9822e" },
  lantern: { wall: "#c7c0e8", roof: "#4a3a8a" },
};
export function drawWorkshop(ctx, key, x, y, st, world, t) {
  const look = WS_LOOK[key] || WS_LOOK.kitchen, ws = WORKSHOPS[key];
  const busy = st.on !== false && !st.stalled && (st.progress || 0) > 0;
  ctx.save();
  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 23, 42, 7, 0, 0, TAU); ctx.fill();
  // chimney (behind the roof) + smoke while busy
  ctx.fillStyle = "#8a4b3a"; ctx.fillRect(x + 14, y - 36, 10, 18);
  ctx.fillStyle = "rgba(0,0,0,0.22)"; for (let yy = y - 32; yy < y - 18; yy += 4) ctx.fillRect(x + 14, yy, 10, 1);
  ctx.fillStyle = "#5e3226"; ctx.fillRect(x + 12, y - 38, 14, 3);
  if (busy) for (let i = 0; i < 3; i++) {
    const k = ((t * 0.5 + i / 3) % 1);
    ctx.fillStyle = `rgba(240,240,240,${0.55 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(x + 19 + Math.sin(k * 6 + i) * 4, y - 42 - k * 22, 3.5 + k * 5, 0, TAU); ctx.fill();
  }
  // walls: planks, darker corner posts
  ctx.fillStyle = look.wall; ctx.fillRect(x - 32, y - 14, 64, 36);
  ctx.fillStyle = "rgba(0,0,0,0.09)"; for (let yy = y - 8; yy < y + 22; yy += 6) ctx.fillRect(x - 32, yy, 64, 1);
  ctx.fillStyle = "rgba(255,255,255,0.12)"; for (let yy = y - 13; yy < y + 22; yy += 6) ctx.fillRect(x - 32, yy, 64, 1);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x - 32, y - 14, 3, 36); ctx.fillRect(x + 29, y - 14, 3, 36);
  // stone foundation
  ctx.fillStyle = "#8c8781"; ctx.fillRect(x - 34, y + 17, 68, 6);
  ctx.fillStyle = "#a39e98"; for (let xx = x - 33; xx < x + 32; xx += 11) { ctx.beginPath(); ctx.roundRect(xx, y + 18, 9, 4, 1.5); ctx.fill(); }
  // roof with shingle rows
  const rl = x - 39, rr = x + 39, ry = y - 11, apex = y - 37;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(rl, ry); ctx.lineTo(x, apex); ctx.lineTo(rr, ry); ctx.closePath();
  ctx.fillStyle = look.roof; ctx.fill(); ctx.clip();
  for (let row = 0, yy = ry; yy > apex - 4; yy -= 5, row++) {
    ctx.fillStyle = row % 2 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    for (let xx = rl - 6 + (row % 2) * 4; xx < rr + 6; xx += 8) { ctx.beginPath(); ctx.arc(xx, yy, 4.2, 0, Math.PI); ctx.fill(); }
  }
  const shine = ctx.createLinearGradient(rl, apex, x, ry);
  shine.addColorStop(0, "rgba(255,255,255,0.22)"); shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine; ctx.fillRect(rl, apex, x - rl, ry - apex);
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(rl, ry); ctx.lineTo(x, apex); ctx.lineTo(rr, ry); ctx.stroke();
  const rs = ctx.createLinearGradient(0, y - 14, 0, y - 6);
  rs.addColorStop(0, "rgba(0,0,0,0.28)"); rs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rs; ctx.fillRect(x - 32, y - 12, 64, 8);
  // door
  ctx.fillStyle = "#f4ead8"; ctx.beginPath(); ctx.roundRect(x - 26, y - 1, 16, 19, [5, 5, 0, 0]); ctx.fill();
  ctx.fillStyle = "#6b4429"; ctx.beginPath(); ctx.roundRect(x - 24, y + 1, 12, 17, [4, 4, 0, 0]); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(x - 18.5, y + 2, 1, 16);
  ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(x - 14.5, y + 10, 1.1, 0, TAU); ctx.fill();
  // window: glows warmer while working
  const glow = busy ? 1 : 0.35;
  ctx.fillStyle = "#f4ead8"; ctx.fillRect(x - 6, y - 7, 13, 11);
  const gl = ctx.createLinearGradient(0, y - 6, 0, y + 3);
  gl.addColorStop(0, `rgba(255,244,194,${0.55 + glow * 0.45})`); gl.addColorStop(1, `rgba(255,190,90,${0.4 + glow * 0.6})`);
  ctx.fillStyle = gl; ctx.fillRect(x - 5, y - 6, 11, 9);
  ctx.fillStyle = "#f4ead8"; ctx.fillRect(x - 0.5, y - 6, 1, 9); ctx.fillRect(x - 5, y - 2, 11, 1);
  if (busy) {
    const wg = ctx.createRadialGradient(x, y - 2, 1, x, y - 2, 16);
    wg.addColorStop(0, "rgba(255,210,120,0.3)"); wg.addColorStop(1, "rgba(255,210,120,0)");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(x, y - 2, 16, 0, TAU); ctx.fill();
  }
  // hanging sign with what it makes
  ctx.strokeStyle = "#4a3426"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x + 31, y - 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 13, y - 9); ctx.lineTo(x + 13, y - 5); ctx.moveTo(x + 27, y - 9); ctx.lineTo(x + 27, y - 5); ctx.stroke();
  const swing = Math.sin(t * 1.6 + x) * 0.04;
  ctx.save(); ctx.translate(x + 20, y - 5); ctx.rotate(swing);
  ctx.fillStyle = "#fff8e8"; ctx.beginPath(); ctx.roundRect(-11, 0, 22, 20, 4); ctx.fill();
  ctx.strokeStyle = "#8a5a34"; ctx.lineWidth = 1.5; ctx.stroke();
  drawItemIcon(ctx, ws.makes, 0, 10, 16, t);
  ctx.restore();
  // level pips on the roof
  for (let i = 0; i < (st.level || 1); i++) {
    const px = x - 4 * ((st.level || 1) - 1) + i * 8, py = y - 22;
    ctx.fillStyle = "#5a3a10"; ctx.beginPath(); ctx.arc(px, py + 0.6, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffd65a"; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill();
  }
  // progress bar
  ctx.fillStyle = "rgba(20,14,34,0.6)"; ctx.beginPath(); ctx.roundRect(x - 30, y + 27, 60, 6, 3); ctx.fill();
  ctx.fillStyle = st.stalled ? "#ff9a5d" : "#8ee06a"; ctx.beginPath(); ctx.roundRect(x - 29, y + 28, Math.max(0, 58 * Math.min(1, st.progress || 0)), 4, 2); ctx.fill();
  // note
  let note = null;
  if (st.on === false) note = "PAUSED";
  else if (st.stalled) {
    const miss = missingInputs(world, ws.needs)[0];
    note = miss ? `NEEDS ${ITEMS[miss[0]].name.toUpperCase()}` : null;
  }
  if (note) {
    ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center";
    const w = ctx.measureText(note).width + 10;
    ctx.fillStyle = "rgba(20,14,34,0.82)"; ctx.beginPath(); ctx.roundRect(x - w / 2, y + 36, w, 14, 7); ctx.fill();
    ctx.fillStyle = st.on === false ? "#cfc6e8" : "#ffcf8a"; ctx.fillText(note, x, y + 46);
  }
  ctx.restore();
}

// ── Hatchery: a little straw-roofed coop with a nest; the egg sits in it ───────
const RARITY_COL = { common: "#e9e3cf", uncommon: "#9be08f", rare: "#8cc4ff", epic: "#cfa3ff", legendary: "#ffd65a" };
export function drawEgg(ctx, x, y, size, rarity, t = 0, crack = 0) {
  const col = RARITY_COL[rarity] || RARITY_COL.common;
  const wob = crack > 0.7 ? Math.sin(t * 18) * 0.12 * (crack - 0.7) * 3 : 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(wob);
  if (rarity === "legendary" || rarity === "epic") {
    const g = ctx.createRadialGradient(0, -size * 0.6, 1, 0, -size * 0.6, size * 1.4);
    g.addColorStop(0, rarity === "legendary" ? "rgba(255,214,90,0.45)" : "rgba(200,150,255,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -size * 0.6, size * 1.4, 0, TAU); ctx.fill();
  }
  const path = () => { ctx.beginPath(); ctx.moveTo(0, -size * 1.25); ctx.bezierCurveTo(size * 0.85, -size * 1.2, size * 0.8, 0, 0, 0); ctx.bezierCurveTo(-size * 0.8, 0, -size * 0.85, -size * 1.2, 0, -size * 1.25); ctx.closePath(); };
  ctx.strokeStyle = "rgba(60,40,30,0.7)"; ctx.lineWidth = Math.max(1, size * 0.12); path(); ctx.stroke();
  ctx.fillStyle = col; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(size * 0.35, -size * 0.35, size * 0.7, size * 0.9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (const [sx, sy, r] of [[-0.3, -0.85, 0.1], [0.2, -0.6, 0.08], [-0.15, -0.35, 0.07], [0.3, -1.0, 0.06]]) { ctx.beginPath(); ctx.arc(sx * size, sy * size, r * size, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(-size * 0.28, -size * 0.85, size * 0.12, size * 0.22, -0.4, 0, TAU); ctx.fill();
  if (crack > 0.35) {                              // cracks appear as it gets close to hatching
    ctx.strokeStyle = "rgba(60,40,30,0.8)"; ctx.lineWidth = Math.max(0.8, size * 0.08); ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-size * 0.5, -size * 0.6); ctx.lineTo(-size * 0.2, -size * 0.75); ctx.lineTo(0, -size * 0.55); ctx.lineTo(size * 0.2, -size * 0.75);
    if (crack > 0.7) { ctx.lineTo(size * 0.5, -size * 0.6); ctx.moveTo(0, -size * 0.55); ctx.lineTo(size * 0.05, -size * 0.35); }
    ctx.stroke();
  }
  ctx.restore();
}
export function drawHatchery(ctx, x, y, h, t) {
  const e = h.egg;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0, 22, 40, 8, 0, 0, TAU); ctx.fill();
  // posts + back wall
  ctx.fillStyle = "#8a5a34"; ctx.fillRect(-30, -12, 6, 34); ctx.fillRect(24, -12, 6, 34);
  ctx.fillStyle = "#c79a64"; ctx.fillRect(-26, -8, 52, 26);
  ctx.strokeStyle = "rgba(90,55,30,0.5)"; ctx.lineWidth = 1;
  for (let yy = -2; yy < 18; yy += 6) { ctx.beginPath(); ctx.moveTo(-26, yy); ctx.lineTo(26, yy); ctx.stroke(); }
  // straw roof
  ctx.fillStyle = "#e3b94f"; ctx.strokeStyle = "#a07a26"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(0, -34); ctx.lineTo(40, -6); ctx.quadraticCurveTo(0, -12, -40, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(160,120,40,0.6)"; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -30 + Math.abs(i) * 3); ctx.lineTo(i * 12, -8); ctx.stroke(); }
  // nest
  ctx.fillStyle = "#b8873f"; ctx.beginPath(); ctx.ellipse(0, 16, 22, 7, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#7a5524"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const a0 = (i / 9) * Math.PI; ctx.beginPath(); ctx.moveTo(-20 + i * 5, 14 + Math.sin(a0) * 2); ctx.lineTo(-16 + i * 5, 19); ctx.stroke(); }
  if (e && e.stage === "hatching") drawEgg(ctx, 0, 16, 11, e.rarity, t, e.progress || 0);
  else if (e && e.stage === "laying") {                 // little hearts floating up while the parents nest
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.5 + i * 0.5) % 1);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = "#ff8ab8";
      const hx = (i ? 6 : -6) + Math.sin(t * 2 + i) * 3, hy = 6 - k * 26;
      ctx.beginPath(); ctx.moveTo(hx, hy + 3); ctx.bezierCurveTo(hx - 6, hy - 2, hx - 3, hy - 7, hx, hy - 3); ctx.bezierCurveTo(hx + 3, hy - 7, hx + 6, hy - 2, hx, hy + 3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // progress bar
  if (e) {
    const p = Math.max(0, Math.min(1, e.progress || 0));
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(-22, -44, 44, 5);
    ctx.fillStyle = e.stage === "laying" ? "#ff8ab8" : RARITY_COL[e.rarity] || "#fff"; ctx.fillRect(-22, -44, 44 * p, 5);
  }
  ctx.restore();
}