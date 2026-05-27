// src/Pages/Homestead/drawWorld.js
// All canvas drawing functions for the homestead world.
// Pure functions — take a ctx and data, draw to it, return nothing.
// Imported by HomesteadView; never imports React.

import { TILE, T, OBJ, tileNoise, PLAYER_W, PLAYER_H } from "./gameEngine";
import { PLACEABLES, ITEM_ICONS, EQUIPPABLE, SEEDS, ITEMS } from "./Items";

// ─── Palette ──────────────────────────────────────────────────────────────────
export const PAL = {
  grass:     ["#7ec850","#6db840","#8ed860"],
  grassDark: "#5a9632",
  dirt:      "#c4a265",
  path:      "#b8956a",
  water:     ["#4a8abf","#3a7aaf","#5a9acf"],
  tallGrass: "#4a9820",
  stone:     ["#a0a090","#909080","#b0b0a0"],
  tilled:    "#8b6040",    // tilled soil
  tilledWet: "#6b4828",    // watered tilled soil
  treeTrunk: "#7a4f2a",
  treeTop:   ["#2d7a2d","#267326","#338a33"],
  houseWall: "#e8c48a",
  houseRoof: "#c0523a",
  houseDark: "#b8864a",
  chestBody: "#c4872a",
  chestLid:  "#d4972a",
  fence:     "#c4872a",
  well:      "#9a8a7a",
  board:     "#d4a855",
  boardPost: "#8b6020",
  flower:    ["#f9c74f","#ff8fab","#ffffff","#ff6b6b"],
  sign:      "#d4a855",
  ore:       ["#8a8878","#7a7868","#9a9888"],
  oreVein:   "#c4a870",
  fishSpot:  "#5aaad0",
};

// ─── Watering constants (kept in sync with useHomesteadState) ─────────────────
const WATER_BOOST_SECONDS = 120;

// ─── Water-drop overlay ───────────────────────────────────────────────────────
// Draws a small blue water-drop badge at the top-right corner of a tile.
// Called from the game loop for every watered plot (tilled or planted).
export function drawWaterDrop(ctx, sx, sy, tileSize, nowMs, wateredAt) {
  if (!wateredAt) return;
  const elapsedSec = (nowMs - wateredAt) / 1000;
  if (elapsedSec >= WATER_BOOST_SECONDS) return; // boost expired

  // Fade out gracefully in the last 20 s of the boost window
  const fadeStart = WATER_BOOST_SECONDS - 20;
  const alpha = elapsedSec > fadeStart
    ? Math.max(0, 1 - (elapsedSec - fadeStart) / 20)
    : 1;

  const ts = tileSize ?? TILE;
  const bx = sx + ts - 7;
  const by = sy + 3;

  ctx.save();
  ctx.globalAlpha = alpha * 0.92;

  // Drop body (teardrop shape)
  ctx.fillStyle = "#4ab0e8";
  ctx.beginPath();
  ctx.arc(bx, by + 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // pointed top
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.bezierCurveTo(bx - 2.5, by + 2, bx - 3.5, by + 3.5, bx, by + 4);
  ctx.bezierCurveTo(bx + 3.5, by + 3.5, bx + 2.5, by + 2, bx, by);
  ctx.fillStyle = "#6acaf0";
  ctx.fill();

  // Tiny shine
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(bx - 0.8, by + 2.2, 1, 1.5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Tile drawing ─────────────────────────────────────────────────────────────
// New signature: drawTile(ctx, tileValue, sx, sy, tileSize, noiseFn, r, c, t)
// Old signature: drawTile(ctx, r, c, sx, sy, t)   — kept for back-compat.
export function drawTile(ctx, a, b, c2, d, e, f, g, h) {
  // Detect old form: a=r (small int row), b=c (small int col), c2=sx, d=sy, e=t (tile value)
  // Detect new form: a=tileValue (T.*), b=sx, c2=sy, d=TILE, e=noiseFn (function), f=r, g=c, h=t
  let tileValue, sx, sy, tileSize, noiseFn, r, c, tNow;
  if (typeof e === "function") {
    tileValue = a; sx = b; sy = c2; tileSize = d; noiseFn = e; r = f; c = g; tNow = h;
  } else {
    r = a; c = b; sx = c2; sy = d; tileValue = e;
    tileSize = TILE; noiseFn = tileNoise; tNow = 0;
  }
  const t = tileValue;
  const size = tileSize ?? TILE;
  const n  = noiseFn(r, c);
  const n2 = noiseFn(r, c, 7);

  if (t === T.WATER) {
    ctx.fillStyle = PAL.water[Math.floor(n * 3)];
    ctx.fillRect(sx, sy, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx + 6 + n * 18, sy + 8 + n2 * 16, 5 + n * 4, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (t === T.STONE) {
    ctx.fillStyle = PAL.stone[Math.floor(n * 3)];
    ctx.fillRect(sx, sy, size, size);
    ctx.fillStyle = "rgba(80,80,70,0.25)";
    ctx.beginPath(); ctx.ellipse(sx+6+n*16, sy+8+n2*14, 5, 3, n*1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx+18+n2*8, sy+18+n*8, 4, 3, n2*2,  0, Math.PI*2); ctx.fill();
    return;
  }
  if (t === T.GRASS) {
    ctx.fillStyle = PAL.grass[Math.floor(n * 3)];
    ctx.fillRect(sx, sy, size, size);
    if (n > 0.65) {
      ctx.fillStyle = PAL.grassDark;
      ctx.fillRect(sx + Math.floor(n * 24), sy + Math.floor(n2 * 24), 2, 4);
      ctx.fillRect(sx + Math.floor(n2 * 20) + 6, sy + Math.floor(n * 20) + 6, 2, 4);
    }
    return;
  }
  if (t === T.TALL_GRASS) {
    ctx.fillStyle = "#6db840"; ctx.fillRect(sx, sy, size, size);
    ctx.fillStyle = "#2d7a2d";
    for (let i = 0; i < 6; i++) {
      const bx = sx + Math.floor(noiseFn(r, c, i * 7) * 26);
      const hh = 6 + Math.floor(noiseFn(r, c, i * 13) * 8);
      ctx.fillRect(bx, sy + size - hh, 2, hh);
    }
    return;
  }
  if (t === T.PATH || t === T.DIRT) {
    ctx.fillStyle = t === T.DIRT ? PAL.dirt : PAL.path;
    ctx.fillRect(sx, sy, size, size);
    if (n > 0.55) { ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(sx + n2*20, sy + n*20, 8, 6); }
    return;
  }
  if (t === T.TILLED) {
    ctx.fillStyle = PAL.tilled;
    ctx.fillRect(sx, sy, size, size);
    ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const fy = sy + 4 + i * 8;
      ctx.beginPath(); ctx.moveTo(sx + 2, fy); ctx.lineTo(sx + size - 2, fy); ctx.stroke();
    }
    return;
  }
  if (t === T.PLANTED) {
    ctx.fillStyle = PAL.tilledWet;
    ctx.fillRect(sx, sy, size, size);
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const fy = sy + 4 + i * 8;
      ctx.beginPath(); ctx.moveTo(sx + 2, fy); ctx.lineTo(sx + size - 2, fy); ctx.stroke();
    }
    return;
  }
  // fallback
  ctx.fillStyle = PAL.grass[0]; ctx.fillRect(sx, sy, size, size);
}

// ─── Crop stage drawing ───────────────────────────────────────────────────────
// stage 0 = just planted, stage max-1 = ready to harvest
// New signature: drawCrop(ctx, plot, sx, sy, tileSize, t)
//   plot = { seedId, stage, ready, plantedAt }
// Old signature: drawCrop(ctx, sx, sy, seedId, stage, totalStages) — kept for back-compat.
export function drawCrop(ctx, a, b, c, d, e, f) {
  let seedId, stage, totalStages, sx, sy, size;
  if (a && typeof a === "object") {
    // New form
    const plot = a;
    sx = b; sy = c; size = d ?? TILE;
    seedId = plot.seedId;
    stage  = plot.stage ?? 0;
    const def = SEEDS?.[seedId];
    totalStages = def?.growthStages ?? 3;
    if (plot.ready) stage = totalStages - 1;
  } else {
    // Old form
    sx = a; sy = b; seedId = c; stage = d; totalStages = e; size = TILE;
  }
  const progress = stage / Math.max(1, totalStages - 1);
  const cropSize = 4 + Math.floor(progress * 18);
  const cx = sx + size / 2;
  const stemH = Math.max(3, Math.floor(cropSize * 0.6));
  const stemY = sy + size - 4 - stemH;  // top of stem, draws downward within tile

  // Stem (draws downward from stemY, stays inside tile)
  ctx.fillStyle = "#4a8a20";
  ctx.fillRect(cx - 1, stemY, 2, stemH);

  // cy = top of stem, used as anchor for leaves/icon
  const cy = stemY;

  if (progress < 0.4) {
    ctx.fillStyle = "#6ab840";
    ctx.beginPath(); ctx.ellipse(cx, cy - 2, 4, 3, -0.3, 0, Math.PI*2); ctx.fill();
  } else if (progress < 0.8) {
    ctx.fillStyle = "#5a9a30";
    ctx.beginPath(); ctx.ellipse(cx - 5, cy - 3, 5, 3, -0.5, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5, cy - 3, 5, 3,  0.5, 0, Math.PI); ctx.fill();
  } else {
    const item = seedId?.replace("_seed", "");
    const icon = item ? (ITEM_ICONS[item] ?? "🌾") : "🌾";
    ctx.font = `${Math.round(cropSize * 1.2)}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(icon, cx, sy + size - 1);
    ctx.strokeStyle = "rgba(200,230,80,0.7)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([3,3]);
    ctx.strokeRect(sx+2, sy+2, size-4, size-4);
    ctx.setLineDash([]);
  }
}

// ─── Object drawing ───────────────────────────────────────────────────────────
function drawHouse(ctx, sx, sy, obj) {
  const pw = obj.w * TILE, ph = obj.h * TILE;
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(sx + 6, sy + ph - 4, pw - 4, 8);
  ctx.fillStyle = PAL.houseWall;
  ctx.fillRect(sx, sy + TILE, pw, ph - TILE);
  ctx.fillStyle = PAL.houseRoof;
  ctx.beginPath(); ctx.moveTo(sx-8, sy+TILE+4); ctx.lineTo(sx+pw/2, sy-6); ctx.lineTo(sx+pw+8, sy+TILE+4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d4644c";
  ctx.beginPath(); ctx.moveTo(sx, sy+TILE+2); ctx.lineTo(sx+pw/2, sy+2); ctx.lineTo(sx+pw, sy+TILE+2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#994433"; ctx.fillRect(sx+pw-30, sy-18, 14, 26);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(sx+pw-23, sy-22-i*8, 5-i, 0, Math.PI*2);
    ctx.fillStyle = `rgba(220,220,220,${0.5-i*0.12})`; ctx.fill();
  }
  ctx.fillStyle = "#7a4f2a"; ctx.fillRect(sx+pw/2-10, sy+ph-24, 20, 24);
  ctx.fillRect(sx+pw/2-11, sy+ph-25, 22, 4);
  ctx.fillStyle = "#f0c060"; ctx.beginPath(); ctx.arc(sx+pw/2+5, sy+ph-13, 3, 0, Math.PI*2); ctx.fill();
  [[sx+14, sy+TILE+12],[sx+pw-36, sy+TILE+12]].forEach(([wx,wy]) => {
    ctx.fillStyle = "#aed6f1"; ctx.fillRect(wx, wy, 20, 16);
    ctx.strokeStyle = "#7a4f2a"; ctx.lineWidth = 1.5; ctx.strokeRect(wx, wy, 20, 16);
    ctx.strokeStyle = "rgba(120,180,220,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wx+10,wy); ctx.lineTo(wx+10,wy+16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx,wy+8); ctx.lineTo(wx+20,wy+8); ctx.stroke();
  });
  ctx.strokeStyle = PAL.houseDark; ctx.lineWidth = 1.5; ctx.strokeRect(sx, sy+TILE, pw, ph-TILE);
}

function drawChest(ctx, sx, sy, isTarget) {
  const s = TILE;
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(sx+3, sy+s-6, s-2, 6);
  ctx.fillStyle = PAL.chestBody; ctx.fillRect(sx+2, sy+s*0.42, s-4, s*0.52);
  ctx.fillStyle = PAL.chestLid;  ctx.fillRect(sx+2, sy+s*0.26, s-4, s*0.2);
  ctx.fillStyle = "#5a3a0a"; ctx.fillRect(sx+s/2-4, sy+s*0.4, 8, 8);
  ctx.fillStyle = "#f0c060"; ctx.fillRect(sx+s/2-3, sy+s*0.41, 6, 6);
  ctx.strokeStyle = "#8b5e1a"; ctx.lineWidth = 1.5; ctx.strokeRect(sx+2, sy+s*0.26, s-4, s*0.68);
  if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy+s*0.22, s+4, s*0.76); }
}

function drawBoard(ctx, sx, sy, isTarget) {
  const s = TILE;
  ctx.fillStyle = PAL.boardPost; ctx.fillRect(sx+s/2-3, sy+s*0.2, 6, s*0.8);
  ctx.fillStyle = PAL.board;     ctx.fillRect(sx-2, sy, s+4, s*0.55);
  ctx.strokeStyle = PAL.boardPost; ctx.lineWidth = 1.5; ctx.strokeRect(sx-2, sy, s+4, s*0.55);
  ctx.strokeStyle = "rgba(90,58,16,0.5)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx+4, sy+8);  ctx.lineTo(sx+s-4, sy+8);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx+4, sy+14); ctx.lineTo(sx+s-8, sy+14); ctx.stroke();
  if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(sx-4, sy-4, s+8, s+8); }
}

function drawWell(ctx, sx, sy) {
  const s = TILE;
  ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(sx+4, sy+s-4, s-4, 6);
  ctx.fillStyle = PAL.well; ctx.fillRect(sx+2, sy+s*0.3, s-4, s*0.65);
  ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 1; ctx.strokeRect(sx+2, sy+s*0.3, s-4, s*0.65);
  ctx.fillStyle = "#4a8aaf"; ctx.fillRect(sx+6, sy+s*0.44, s-12, s*0.3);
  ctx.fillStyle = "#7a5a3a";
  ctx.fillRect(sx+4, sy+4, 5, s*0.35);
  ctx.fillRect(sx+s-9, sy+4, 5, s*0.35);
  ctx.fillRect(sx+2, sy+2, s-4, 6);
}

function drawTree(ctx, sx, sy, obj, chopped, isTarget) {
  if (chopped) {
    // Stump
    const s = TILE;
    ctx.fillStyle = PAL.treeTrunk; ctx.fillRect(sx+s/2-5, sy+s*0.6, 10, s*0.4);
    ctx.fillStyle = "#a07040"; ctx.beginPath(); ctx.ellipse(sx+s/2, sy+s*0.6, 7, 4, 0, 0, Math.PI*2); ctx.fill();
    return;
  }
  const s = TILE;
  const n = tileNoise(obj.tx, obj.ty);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(sx+s/2+4, sy+s-4, s*0.38, s*0.14, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PAL.treeTrunk; ctx.fillRect(sx+s/2-5, sy+s*0.48, 10, s*0.62);
  ctx.fillStyle = PAL.treeTop[Math.floor(n*3)];
  ctx.beginPath(); ctx.arc(sx+s/2, sy+s*0.28, s*0.52, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = PAL.treeTop[Math.floor(n*2)%3];
  ctx.beginPath(); ctx.arc(sx+s/2-4, sy+s*0.14, s*0.36, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+s/2+6, sy+s*0.19, s*0.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.arc(sx+s/2-6, sy+s*0.08, s*0.14, 0, Math.PI*2); ctx.fill();
  // Show HP nicks if damaged
  if (obj.choppable && obj.hp != null && obj.hp < obj.maxHp) {
    ctx.fillStyle = "rgba(200,100,50,0.8)";
    for (let i = 0; i < (obj.maxHp - obj.hp); i++) {
      ctx.fillRect(sx + s*0.3 + i*8, sy + s*0.55, 3, 8);
    }
  }
  if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy-2, s+4, s+4); }
}

function drawFlowers(ctx, sx, sy, obj) {
  const s = TILE;
  for (let i = 0; i < 4; i++) {
    const n  = tileNoise(obj.tx, obj.ty, i*11);
    const n2 = tileNoise(obj.tx, obj.ty, i*7);
    const fx = sx + 3 + n*22, fy = sy + 4 + n2*20;
    ctx.fillStyle = "#c8e68a"; ctx.fillRect(fx, fy, 2, 6);
    ctx.fillStyle = PAL.flower[i % PAL.flower.length];
    ctx.beginPath(); ctx.arc(fx+1, fy-2, 4, 0, Math.PI*2); ctx.fill();
  }
}

function drawSign(ctx, sx, sy, obj, isTarget) {
  const s = TILE;
  ctx.fillStyle = PAL.boardPost; ctx.fillRect(sx+s/2-2, sy+s*0.3, 4, s*0.7);
  ctx.fillStyle = PAL.sign;      ctx.fillRect(sx, sy+s*0.05, s, s*0.4);
  ctx.strokeStyle = PAL.boardPost; ctx.lineWidth = 1; ctx.strokeRect(sx, sy+s*0.05, s, s*0.4);
  if (obj.label) {
    ctx.fillStyle = "#5a3a10"; ctx.font = "bold 6px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const words = obj.label.replace("[F] ","").split(" ");
    words.forEach((w, i) => ctx.fillText(w, sx+s/2, sy+s*0.17+i*8));
  }
  if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy-2, s+4, s+4); }
}

function drawFenceH(ctx, sx, sy, obj) {
  const len = obj.w * TILE;
  ctx.strokeStyle = PAL.fence; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(sx, sy+4); ctx.lineTo(sx+len, sy+4); ctx.stroke();
  for (let i = 0; i <= obj.w; i += 1.25) {
    ctx.fillStyle = PAL.fence; ctx.fillRect(sx + i*TILE - 3, sy, 6, 14);
  }
}

function drawFenceV(ctx, sx, sy, obj) {
  const len = obj.h * TILE;
  ctx.strokeStyle = PAL.fence; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(sx+4, sy); ctx.lineTo(sx+4, sy+len); ctx.stroke();
  for (let i = 0; i <= obj.h; i += 1.25) {
    ctx.fillStyle = PAL.fence; ctx.fillRect(sx, sy+i*TILE-3, 14, 6);
  }
}

function drawOreNode(ctx, sx, sy, obj, isTarget, depletedOverride) {
  const s = TILE;
  const n = tileNoise(obj.tx, obj.ty);
  const isDepleted = depletedOverride ?? obj.depleted;
  if (isDepleted) {
    // Just rubble
    ctx.fillStyle = "rgba(120,110,90,0.4)";
    ctx.beginPath(); ctx.ellipse(sx+s/2, sy+s*0.75, s*0.35, s*0.12, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#8a8070"; ctx.font = "10px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("•••", sx+s/2, sy+s*0.75);
    return;
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(sx+s/2+3, sy+s-4, s*0.42, s*0.14, 0, 0, Math.PI*2); ctx.fill();
  // Rock body
  ctx.fillStyle = PAL.ore[Math.floor(n*3)];
  ctx.beginPath();
  ctx.moveTo(sx+s*0.15, sy+s*0.65);
  ctx.lineTo(sx+s*0.1,  sy+s*0.35);
  ctx.lineTo(sx+s*0.35, sy+s*0.1);
  ctx.lineTo(sx+s*0.7,  sy+s*0.08);
  ctx.lineTo(sx+s*0.9,  sy+s*0.3);
  ctx.lineTo(sx+s*0.85, sy+s*0.72);
  ctx.closePath(); ctx.fill();
  // Ore veins
  ctx.fillStyle = PAL.oreVein;
  ctx.fillRect(sx+s*0.3, sy+s*0.28, 6, 3);
  ctx.fillRect(sx+s*0.5, sy+s*0.42, 4, 4);
  ctx.fillRect(sx+s*0.4, sy+s*0.55, 5, 3);
  if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.9)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy-2, s+4, s+4); }
}

function drawFishSpot(ctx, sx, sy, isTarget, t) {
  const s = TILE;
  const bob = Math.sin(t * 2.2 + sx * 0.01) * 2;
  ctx.fillStyle = "rgba(100,180,220,0.35)";
  ctx.beginPath(); ctx.ellipse(sx+s/2, sy+s/2+bob, s*0.4, s*0.25, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(150,220,255,0.7)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(sx+s/2, sy+s/2+bob, s*0.38, s*0.23, 0, 0, Math.PI*2); ctx.stroke();
  // Ripple rings
  for (let i = 1; i <= 2; i++) {
    const rp = ((t * 0.8 + i * 0.4) % 1);
    ctx.strokeStyle = `rgba(150,220,255,${0.4*(1-rp)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx+s/2, sy+s/2+bob, s*(0.38+rp*0.25), s*(0.23+rp*0.15), 0, 0, Math.PI*2); ctx.stroke();
  }
  if (isTarget) { ctx.strokeStyle = "rgba(100,200,255,0.9)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy-2, s+4, s+4); }
}

function drawPlaceable(ctx, sx, sy, obj, info, isTarget) {
  const tileW = obj.w * TILE, tileH = obj.h * TILE;
  const cx = sx + tileW/2, cy = sy + tileH/2;
  const item = ITEMS[obj.type];

  if (item?.draw) {
    const size = Math.min(tileW, tileH) * 0.92;
    item.draw(ctx, cx - size/2, cy - size/2, size);
    if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy-2, tileW+4, tileH+4); }
    return;
  }

  // Wooden tile background + shadow only for emoji-rendered placeables
  ctx.fillStyle = "rgba(180,155,100,0.55)";
  ctx.beginPath(); ctx.roundRect(sx+2, sy+2, tileW-4, tileH-4, 6); ctx.fill();
  ctx.strokeStyle = "rgba(220,195,130,0.75)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(sx+2, sy+2, tileW-4, tileH-4, 6); ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(cx+2, sy+tileH-5, tileW*0.36, tileH*0.11, 0, 0, Math.PI*2); ctx.fill();
  const fontSize = Math.max(obj.w, obj.h) * TILE * 0.78;
  ctx.save(); ctx.globalAlpha = 1.0;
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(info.icon, cx, cy - 3);
  ctx.restore();
  if (isTarget) { ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(sx-2, sy-2, tileW+4, tileH+4); }
}

// ─── Town buildings (drawn at east edge) ─────────────────────────────────────
// New signature: drawTownArea(ctx, camX, camY, W, H, t)
// Old signature: drawTownArea(ctx, camX, camY, t)
export function drawTownArea(ctx, camX, camY, a, b, c) {
  // Disambiguate: if `b` is undefined (old form), `a` is `t`. Otherwise new form.
  let W, t;
  if (b === undefined && c === undefined) {
    W = ctx.canvas.width;
    t = a ?? 0;
  } else {
    W = a;
    t = c ?? 0;
  }
  // Simple market building at col ~70
  const bx = 70 * TILE - camX;
  const by = 6 * TILE - camY;
  if (bx > (W ?? ctx.canvas.width) + 64 || bx < -300) return;

  // Market building
  drawSimpleBuilding(ctx, bx, by, 5*TILE, 4*TILE, "#e8d4a0", "#8b6020", "🛒 Market");
  // Inn building
  drawSimpleBuilding(ctx, bx, by + 6*TILE, 4*TILE, 3*TILE, "#d4c8b0", "#704020", "🍺 Inn");
  // Blacksmith
  drawSimpleBuilding(ctx, bx + 6*TILE, by, 4*TILE, 3*TILE, "#c0b8a8", "#502010", "⚒️ Smith");

  // Town name banner
  ctx.fillStyle = "rgba(20,12,4,0.75)";
  ctx.beginPath(); ctx.roundRect(bx + 2*TILE - 4, by - 28, 9*TILE + 8, 22, 8); ctx.fill();
  ctx.fillStyle = "#f0d890"; ctx.font = "bold 13px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("✦ Millhaven ✦", bx + 6*TILE, by - 17);
}

function drawSimpleBuilding(ctx, bx, by, w, h, wallColor, roofColor, label) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(bx+8, by+h-4, w-4, 10);
  // Walls
  ctx.fillStyle = wallColor; ctx.fillRect(bx, by + h*0.3, w, h*0.7);
  // Roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(bx - 8, by + h*0.32);
  ctx.lineTo(bx + w/2, by);
  ctx.lineTo(bx + w + 8, by + h*0.32);
  ctx.closePath(); ctx.fill();
  // Door
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(bx + w/2 - 8, by + h - 18, 16, 18);
  ctx.fillStyle = "#f0c060"; ctx.beginPath(); ctx.arc(bx+w/2+4, by+h-9, 2.5, 0, Math.PI*2); ctx.fill();
  // Label
  ctx.fillStyle = "rgba(20,12,4,0.72)";
  ctx.beginPath(); ctx.roundRect(bx + w/2 - 44, by + h*0.34 + 4, 88, 16, 4); ctx.fill();
  ctx.fillStyle = "#f0d890"; ctx.font = "bold 10px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, bx + w/2, by + h*0.34 + 12);
}

// ─── Main drawObject dispatcher ───────────────────────────────────────────────
// New signature: drawObject(ctx, obj, sx, sy, tileSize, t, nodeState, interactTargetId)
// Old signature: drawObject(ctx, obj, sx, sy, isTarget, t)
export function drawObject(ctx, obj, sx, sy, a, b, c, d) {
  // New form if `a` is a tileSize number (typically 32) and `c` is an object/null/undefined.
  let isTarget, tNow, nodeState;
  if (typeof a === "number" && a > 4 && (c === undefined || c === null || typeof c === "object")) {
    // tileSize, t, nodeState, interactTargetId
    tNow      = b ?? 0;
    nodeState = c ?? null;
    isTarget  = d != null && obj.id === d;
  } else {
    // legacy: a=isTarget, b=t
    isTarget = !!a;
    tNow     = b ?? 0;
    nodeState = null;
  }

  // Visual depleted/chopped overrides (use nodeState if provided)
  const depleted = obj.depleted || nodeState?.depleted;
  const chopped  = obj.chopped  || (obj.choppable && depleted);

  if (obj.type === OBJ.HOUSE)      drawHouse(ctx, sx, sy, obj);
  if (obj.type === OBJ.CHEST)      drawChest(ctx, sx, sy, isTarget);
  if (obj.type === OBJ.BOARD)      drawBoard(ctx, sx, sy, isTarget);
  if (obj.type === OBJ.WELL)       drawWell(ctx, sx, sy);
  if (obj.type === OBJ.TREE)       drawTree(ctx, sx, sy, obj, chopped, isTarget && !chopped);
  if (obj.type === OBJ.FLOWERS)    drawFlowers(ctx, sx, sy, obj);
  if (obj.type === OBJ.SIGN)       drawSign(ctx, sx, sy, obj, isTarget);
  if (obj.type === OBJ.FENCE_H)    drawFenceH(ctx, sx, sy, obj);
  if (obj.type === OBJ.FENCE_V)    drawFenceV(ctx, sx, sy, obj);
  if (obj.type === OBJ.ORE_NODE)   drawOreNode(ctx, sx, sy, obj, isTarget && !depleted, depleted);
  if (obj.type === OBJ.FISH_SPOT)  drawFishSpot(ctx, sx, sy, isTarget, tNow);
  if (obj.type === OBJ.TOWN_ENTER) {
    if (isTarget) {
      ctx.strokeStyle = "rgba(255,220,80,0.6)"; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
      ctx.strokeRect(sx, sy, (obj.w??1)*TILE, (obj.h??1)*TILE);
      ctx.setLineDash([]);
    }
  }
  if (obj.isPlaceable) {
    const info = PLACEABLES[obj.type];
    if (info) drawPlaceable(ctx, sx, sy, obj, info, isTarget);
  }
}

// ─── Player drawing ───────────────────────────────────────────────────────────
// New signature: drawPlayer(ctx, px, py, facing, step, character, t, jumpZ, isPartner, heldItem)
// Old signature: drawPlayer(ctx, px, py, facing, step, invincible, t, character, weapon)
export function drawPlayer(ctx, px, py, facing, step, a, b, c, d, e) {
  let character, t, invincible, weapon, jumpZ, isPartner, heldItem;
  // Disambiguate: in new form, arg `a` is the character object; in old, arg `a` is `invincible` (number).
  if (a && typeof a === "object" && !Array.isArray(a)) {
    // New form
    character = a;
    t         = b ?? 0;
    jumpZ     = c ?? 0;
    isPartner = !!d;
    heldItem  = e ?? null;  // item id of whatever is in the active hotbar slot
    invincible = 0;
    weapon = null;
  } else {
    // Legacy form
    invincible = a ?? 0;
    t          = b ?? 0;
    character  = c ?? null;
    weapon     = d ?? null;
    jumpZ      = 0;
    isPartner  = false;
    heldItem   = null;
  }

  // Apply jump offset visually (jumpZ is negative when airborne in this engine's convention)
  const jumpY = jumpZ || 0;

  const bobY  = (step===1||step===3) ? -1 : 0;
  const legSw = (step===1||step===3) ?  3 : 0;
  const { skin='light', outfit='blue', hair='short', hat='none' } = character || {};
  const SKINS   = { light:'#f5c5a3', medium:'#d4956a', tan:'#c07840', brown:'#8b5a2b', dark:'#5a3018' };
  const OUTFITS = { blue:['#5b8dd9','#3a6abf'], green:['#5a9a4a','#3a7a2a'], red:['#c05040','#8a2820'],
                    purple:['#7a5ab0','#5a3a8a'], orange:['#d07830','#a05010'], teal:['#4a9a8a','#2a7a6a'] };
  const HAIRS   = { short:'#7a4f2a', long:'#3a2010', curly:'#c88040', braid:'#884020' };
  const HATS_C  = { cap:'#5a3a8a', straw:'#d4a855', beanie:'#c05040' };
  const skinCol = SKINS[skin] || '#f5c5a3';
  const [bodyCol, legCol] = OUTFITS[outfit] || ['#5b8dd9','#3a6abf'];
  const hairCol = HAIRS[hair] || '#7a4f2a';

  // Partner gets a subtle desaturation so they read as distinct
  if (isPartner) ctx.globalAlpha = 0.85;

  // Shadow stays on ground regardless of jump
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(px, py+12, 8 - Math.min(4, Math.abs(jumpY)*0.04), 3 - Math.min(1.5, Math.abs(jumpY)*0.015), 0, 0, Math.PI*2); ctx.fill();

  // Body is offset by jumpY
  const pyJ = py + jumpY;

  ctx.fillStyle = legCol;
  ctx.fillRect(px-6, pyJ+2, 5, 9+legSw);
  ctx.fillRect(px+1, pyJ+2, 5, 9-legSw);
  ctx.fillStyle = bodyCol; ctx.fillRect(px-7, pyJ-10+bobY, 14, 13);
  const armSw = (step===1||step===3)?2:0;
  ctx.fillStyle = bodyCol;
  ctx.fillRect(px-10, pyJ-9+bobY+armSw, 3, 8);
  ctx.fillRect(px+7,  pyJ-9+bobY-armSw, 3, 8);

  if (!(invincible > 0 && Math.floor(t*8)%2===0)) {
    ctx.fillStyle = skinCol; ctx.fillRect(px-7, pyJ-22+bobY, 14, 12);
    ctx.fillStyle = hairCol; ctx.fillRect(px-7, pyJ-22+bobY, 14, 5);
    if (hat !== 'none' && HATS_C[hat]) {
      ctx.fillStyle = HATS_C[hat];
      if (hat==='cap')    { ctx.fillRect(px-8, pyJ-27+bobY, 16, 6); ctx.fillRect(px-10, pyJ-28+bobY, 20, 3); }
      if (hat==='straw')  { ctx.beginPath(); ctx.ellipse(px, pyJ-27+bobY, 12, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px-6, pyJ-35+bobY, 12, 10); }
      if (hat==='beanie') { ctx.beginPath(); ctx.arc(px, pyJ-24+bobY, 8, Math.PI, 0); ctx.fill(); }
    }
    if (facing==="down") {
      ctx.fillStyle = "#2a1a0a";
      ctx.fillRect(px-4, pyJ-16+bobY, 3, 3); ctx.fillRect(px+1, pyJ-16+bobY, 3, 3);
      ctx.fillRect(px-2, pyJ-12+bobY, 4, 2);
    } else if (facing==="left") {
      ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px-5, pyJ-16+bobY, 3, 3);
    } else if (facing==="right") {
      ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px+2, pyJ-16+bobY, 3, 3);
    }
  }

  // Held item: either legacy weapon arg or the active hotbar item (any category)
  const displayItem = weapon || heldItem;
  if (displayItem) {
    const handX = facing==="left" ? px-14 : px+14;
    const handY = pyJ-8+bobY;
    const heldItemData = ITEMS[displayItem];
    const facingRight = facing === "right";
    ctx.save();
    if (heldItemData?.draw) {
      const size = 14;
      if (facingRight) {
        // Mirror horizontally around the hand centre
        ctx.translate(handX, handY);
        ctx.scale(-1, 1);
        ctx.translate(-handX, -handY);
      }
      heldItemData.draw(ctx, handX - size/2, handY - size/2, size);
    } else {
      if (facingRight) {
        ctx.translate(handX, handY);
        ctx.scale(-1, 1);
        ctx.translate(-handX, -handY);
      }
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const icon = ITEM_ICONS[displayItem] ?? EQUIPPABLE[displayItem]?.icon ?? "📦";
      ctx.fillText(icon, handX, handY);
    }
    ctx.restore();
  }

  if (isPartner) ctx.globalAlpha = 1;
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
export function drawHUD(ctx, W, H, inventory, interactTarget, t, gold = 0, inGameDay = 0) {
  ctx.fillStyle = "rgba(18,10,4,0.9)"; ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#c8e890"; ctx.font = "bold 13px monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText("🌿 Hearthroot", 12, 15);

  ctx.fillStyle = "#f5e6c8"; ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`Day ${(inGameDay ?? 0) + 1}  ·  ☀️`, W/2, 15);

  ctx.textAlign = "right"; ctx.fillStyle = "#d8eaa0"; ctx.font = "11px monospace";
  const inv = inventory ?? {};
  ctx.fillText(
    `🪙${gold}g  🪵${inv.wood??0}  🪨${inv.stone??0}  🌿${inv.herbs??0}  🦴${inv.leather??0}`,
    W - 14, 15
  );

  if (interactTarget) {
    const msg = interactTarget.label ?? "[F] Interact";
    ctx.font = "bold 11px monospace";
    const mw  = ctx.measureText(msg).width + 28;
    const mx  = (W - mw) / 2;
    const my  = H - 116; // sit just above the hotbar (bottom:26 + height:52 + gap:12 + prompt:26)
    ctx.fillStyle = "rgba(18,10,4,0.88)";
    ctx.beginPath(); ctx.roundRect(mx, my, mw, 26, 8); ctx.fill();
    ctx.strokeStyle = "rgba(200,220,120,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, 26, 8); ctx.stroke();
    ctx.fillStyle = "#f0e0a0";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(msg, W/2, my+13);
  }
}

// ─── Ghost placement preview ──────────────────────────────────────────────────
export function drawGhostPlacement(ctx, ghost, facing, playerTx, playerTy, camX, camY) {
  if (!ghost) return;
  const info = ghost.info;
  const PLACE_DIST = 2;
  const facingMap = { down:[0,1], up:[0,-1], left:[-1,0], right:[1,0] };
  const [fdx,fdy] = facingMap[facing] ?? [0,1];
  const gtx = playerTx + fdx*PLACE_DIST + (ghost.rotation%2===1?-Math.floor(info.h/2):-Math.floor(info.w/2));
  const gty = playerTy + fdy*PLACE_DIST + (ghost.rotation%2===1?-Math.floor(info.w/2):-Math.floor(info.h/2));
  const gw  = ghost.rotation%2===0 ? info.w : info.h;
  const gh  = ghost.rotation%2===0 ? info.h : info.w;
  const gsx = gtx*TILE - camX, gsy = gty*TILE - camY;

  ctx.fillStyle = "rgba(200,230,120,0.18)"; ctx.fillRect(gsx, gsy, gw*TILE, gh*TILE);
  ctx.strokeStyle = "rgba(200,230,120,0.7)"; ctx.lineWidth = 2;
  ctx.setLineDash([5,4]); ctx.strokeRect(gsx+1, gsy+1, gw*TILE-2, gh*TILE-2); ctx.setLineDash([]);

  ctx.save(); ctx.globalAlpha = 0.72;
  const gcx = gsx+(gw*TILE)/2, gcy = gsy+(gh*TILE)/2;
  if (ghost.rotation !== 0) { ctx.translate(gcx,gcy); ctx.rotate(ghost.rotation*Math.PI/2); ctx.translate(-gcx,-gcy); }

  const item = ITEMS[ghost.id ?? ghost.type];
  const size = Math.min(gw, gh) * TILE * 0.85;
  if (item?.draw) {
    item.draw(ctx, gcx - size/2, gcy - size/2, size);
  } else {
    const fontSize = Math.max(gw, gh) * TILE * 0.65;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(info.icon, gcx, gcy - 4);
  }

  ctx.restore();

  return { gtx, gty, gw, gh };
}