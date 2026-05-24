// src/Pages/Homestead/HomesteadView.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  TILE, WORLD_COLS, WORLD_ROWS, WORLD_PX_W, WORLD_PX_H,
  T, OBJ,
  buildTileMap, defaultObjects, tileNoise,
  moveEntity, updateCamera, findInteractTarget,
  PLAYER_W, PLAYER_H,
  emptyInventory, fullEmptyInventory,
  RECIPES, canCraft, craftItem,
  EQUIPPABLE, getEquipStats,
  PLACEABLES,
  HAIR_STYLES, SKIN_TONES, OUTFIT_COLORS, HAT_STYLES,
  HOTBAR_ITEMS, HOTBAR_SIZE, emptyHotbar,
} from "./gameEngine";
import { useHearthroom } from "./useHearthroom";

// ─── Palette ──────────────────────────────────────────────────────────────────
const PAL = {
  grass:      ["#7ec850","#6db840","#8ed860"],
  grassDark:  "#5a9632",
  dirt:       "#c4a265",
  path:       "#b8956a",
  water:      ["#4a8abf","#3a7aaf","#5a9acf"],
  tallGrass:  "#4a9820",
  stone:      ["#a0a090","#909080","#b0b0a0"],
  treeTrunk:  "#7a4f2a",
  treeTop:    ["#2d7a2d","#267326","#338a33"],
  houseWall:  "#e8c48a",
  houseRoof:  "#c0523a",
  houseDark:  "#b8864a",
  chestBody:  "#c4872a",
  chestLid:   "#d4972a",
  fence:      "#c4872a",
  well:       "#9a8a7a",
  board:      "#d4a855",
  boardPost:  "#8b6020",
  flower:     ["#f9c74f","#ff8fab","#ffffff","#ff6b6b"],
  sign:       "#d4a855",
  pathEdge:   "#a07840",
};

// ─── Tile drawing ─────────────────────────────────────────────────────────────
function drawTile(ctx, r, c, sx, sy, t) {
  const n  = tileNoise(r, c);
  const n2 = tileNoise(r, c, 7);

  if (t === T.WATER) {
    ctx.fillStyle = PAL.water[Math.floor(n * 3)];
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx + 6 + n * 18, sy + 8 + n2 * 16, 5 + n * 4, 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (t === T.STONE) {
    ctx.fillStyle = PAL.stone[Math.floor(n * 3)];
    ctx.fillRect(sx, sy, TILE, TILE);
    // pebble shapes
    ctx.fillStyle = "rgba(80,80,70,0.25)";
    ctx.beginPath(); ctx.ellipse(sx + 6 + n * 16, sy + 8 + n2 * 14, 5, 3, n * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + 18 + n2 * 8, sy + 18 + n * 8,  4, 3, n2 * 2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (t === T.GRASS) {
    ctx.fillStyle = PAL.grass[Math.floor(n * 3)];
    ctx.fillRect(sx, sy, TILE, TILE);
    if (n > 0.65) {
      ctx.fillStyle = PAL.grassDark;
      ctx.fillRect(sx + Math.floor(n * 24), sy + Math.floor(n2 * 24), 2, 4);
      ctx.fillRect(sx + Math.floor(n2 * 20) + 6, sy + Math.floor(n * 20) + 6, 2, 4);
    }
    return;
  }
  if (t === T.TALL_GRASS) {
    ctx.fillStyle = "#6db840"; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = "#2d7a2d";
    for (let i = 0; i < 6; i++) {
      const bx = sx + Math.floor(tileNoise(r, c, i * 7) * 26);
      const h  = 6 + Math.floor(tileNoise(r, c, i * 13) * 8);
      ctx.fillRect(bx, sy + TILE - h, 2, h);
    }
    return;
  }
  if (t === T.PATH || t === T.DIRT) {
    ctx.fillStyle = PAL.path; ctx.fillRect(sx, sy, TILE, TILE);
    if (n > 0.55) { ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(sx + n2 * 20, sy + n * 20, 8, 6); }
    return;
  }
  // fallback
  ctx.fillStyle = PAL.grass[0]; ctx.fillRect(sx, sy, TILE, TILE);
}

// ─── Object drawing ───────────────────────────────────────────────────────────
function drawHouse(ctx, sx, sy, obj) {
  const pw = obj.w * TILE, ph = obj.h * TILE;
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(sx + 6, sy + ph - 4, pw - 4, 8);
  ctx.fillStyle = PAL.houseWall;
  ctx.fillRect(sx, sy + TILE, pw, ph - TILE);
  // roof
  ctx.fillStyle = PAL.houseRoof;
  ctx.beginPath(); ctx.moveTo(sx - 8, sy + TILE + 4); ctx.lineTo(sx + pw / 2, sy - 6); ctx.lineTo(sx + pw + 8, sy + TILE + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d4644c";
  ctx.beginPath(); ctx.moveTo(sx, sy + TILE + 2); ctx.lineTo(sx + pw / 2, sy + 2); ctx.lineTo(sx + pw, sy + TILE + 2); ctx.closePath(); ctx.fill();
  // chimney
  ctx.fillStyle = "#994433"; ctx.fillRect(sx + pw - 30, sy - 18, 14, 26);
  // smoke
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(sx + pw - 23, sy - 22 - i * 8, 5 - i, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,220,220,${0.5 - i * 0.12})`; ctx.fill();
  }
  // door
  ctx.fillStyle = "#7a4f2a"; ctx.fillRect(sx + pw / 2 - 10, sy + ph - 24, 20, 24);
  ctx.fillRect(sx + pw / 2 - 11, sy + ph - 25, 22, 4);
  ctx.fillStyle = "#f0c060";
  ctx.beginPath(); ctx.arc(sx + pw / 2 + 5, sy + ph - 13, 3, 0, Math.PI * 2); ctx.fill();
  // windows
  [[sx + 14, sy + TILE + 12], [sx + pw - 36, sy + TILE + 12]].forEach(([wx, wy]) => {
    ctx.fillStyle = "#aed6f1"; ctx.fillRect(wx, wy, 20, 16);
    ctx.strokeStyle = "#7a4f2a"; ctx.lineWidth = 1.5; ctx.strokeRect(wx, wy, 20, 16);
    ctx.strokeStyle = "rgba(120,180,220,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wx + 10, wy); ctx.lineTo(wx + 10, wy + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy + 8);  ctx.lineTo(wx + 20, wy + 8);  ctx.stroke();
  });
  ctx.strokeStyle = PAL.houseDark; ctx.lineWidth = 1.5;
  ctx.strokeRect(sx, sy + TILE, pw, ph - TILE);
}

function drawChest(ctx, sx, sy, isTarget) {
  const s = TILE;
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(sx + 3, sy + s - 6, s - 2, 6);
  ctx.fillStyle = PAL.chestBody; ctx.fillRect(sx + 2, sy + s * 0.42, s - 4, s * 0.52);
  ctx.fillStyle = PAL.chestLid;  ctx.fillRect(sx + 2, sy + s * 0.26, s - 4, s * 0.2);
  ctx.fillStyle = "#5a3a0a"; ctx.fillRect(sx + s / 2 - 4, sy + s * 0.4, 8, 8);
  ctx.fillStyle = "#f0c060"; ctx.fillRect(sx + s / 2 - 3, sy + s * 0.41, 6, 6);
  ctx.strokeStyle = "#8b5e1a"; ctx.lineWidth = 1.5;
  ctx.strokeRect(sx + 2, sy + s * 0.26, s - 4, s * 0.68);
  if (isTarget) {
    ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2;
    ctx.strokeRect(sx - 2, sy + s * 0.22, s + 4, s * 0.76);
  }
}

function drawBoard(ctx, sx, sy, isTarget) {
  const s = TILE;
  ctx.fillStyle = PAL.boardPost;  ctx.fillRect(sx + s / 2 - 3, sy + s * 0.2, 6, s * 0.8);
  ctx.fillStyle = PAL.board;      ctx.fillRect(sx - 2, sy, s + 4, s * 0.55);
  ctx.strokeStyle = PAL.boardPost; ctx.lineWidth = 1.5; ctx.strokeRect(sx - 2, sy, s + 4, s * 0.55);
  ctx.strokeStyle = "rgba(90,58,16,0.5)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx + 4, sy + 8);  ctx.lineTo(sx + s - 4, sy + 8);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + 4, sy + 14); ctx.lineTo(sx + s - 8, sy + 14); ctx.stroke();
  if (isTarget) {
    ctx.strokeStyle = "rgba(255,220,80,0.85)"; ctx.lineWidth = 2;
    ctx.strokeRect(sx - 4, sy - 4, s + 8, s + 8);
  }
}

function drawWell(ctx, sx, sy) {
  const s = TILE;
  ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(sx + 4, sy + s - 4, s - 4, 6);
  ctx.fillStyle = PAL.well;           ctx.fillRect(sx + 2, sy + s * 0.3, s - 4, s * 0.65);
  ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 1; ctx.strokeRect(sx + 2, sy + s * 0.3, s - 4, s * 0.65);
  ctx.fillStyle = "#4a8aaf"; ctx.fillRect(sx + 6, sy + s * 0.44, s - 12, s * 0.3);
  ctx.fillStyle = "#7a5a3a";
  ctx.fillRect(sx + 4, sy + 4, 5, s * 0.35);
  ctx.fillRect(sx + s - 9, sy + 4, 5, s * 0.35);
  ctx.fillRect(sx + 2, sy + 2, s - 4, 6);
}

function drawTree(ctx, sx, sy, obj) {
  const s = TILE;
  const n = tileNoise(obj.tx, obj.ty);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(sx + s / 2 + 4, sy + s - 4, s * 0.38, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.treeTrunk; ctx.fillRect(sx + s / 2 - 5, sy + s * 0.48, 10, s * 0.62);
  ctx.fillStyle = PAL.treeTop[Math.floor(n * 3)];
  ctx.beginPath(); ctx.arc(sx + s / 2, sy + s * 0.28, s * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.treeTop[Math.floor(n * 2) % 3];
  ctx.beginPath(); ctx.arc(sx + s / 2 - 4, sy + s * 0.14, s * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + s / 2 + 6, sy + s * 0.19, s * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.arc(sx + s / 2 - 6, sy + s * 0.08, s * 0.14, 0, Math.PI * 2); ctx.fill();
}

function drawFlowers(ctx, sx, sy, obj) {
  const s = TILE;
  for (let i = 0; i < 4; i++) {
    const n  = tileNoise(obj.tx, obj.ty, i * 11);
    const n2 = tileNoise(obj.tx, obj.ty, i * 7);
    const fx = sx + 3 + n * 22, fy = sy + 4 + n2 * 20;
    ctx.fillStyle = "#c8e68a"; ctx.fillRect(fx, fy, 2, 6);
    ctx.fillStyle = PAL.flower[i % PAL.flower.length];
    ctx.beginPath(); ctx.arc(fx + 1, fy - 2, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSign(ctx, sx, sy, obj) {
  const s = TILE;
  ctx.fillStyle = PAL.boardPost; ctx.fillRect(sx + s / 2 - 2, sy + s * 0.3, 4, s * 0.7);
  ctx.fillStyle = PAL.sign;      ctx.fillRect(sx, sy + s * 0.05, s, s * 0.4);
  ctx.strokeStyle = PAL.boardPost; ctx.lineWidth = 1; ctx.strokeRect(sx, sy + s * 0.05, s, s * 0.4);
  ctx.fillStyle = "#5a3a10"; ctx.font = "bold 7px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("Forest", sx + s / 2, sy + s * 0.2);
  ctx.fillText("→",      sx + s / 2, sy + s * 0.32);
}

function drawFenceH(ctx, sx, sy, obj) {
  const len = obj.w * TILE;
  ctx.strokeStyle = PAL.fence; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx + len, sy + 4); ctx.stroke();
  for (let i = 0; i <= obj.w; i += 1.25) {
    ctx.fillStyle = PAL.fence; ctx.fillRect(sx + i * TILE - 3, sy, 6, 14);
  }
}

function drawFenceV(ctx, sx, sy, obj) {
  const len = obj.h * TILE;
  ctx.strokeStyle = PAL.fence; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(sx + 4, sy); ctx.lineTo(sx + 4, sy + len); ctx.stroke();
  for (let i = 0; i <= obj.h; i += 1.25) {
    ctx.fillStyle = PAL.fence; ctx.fillRect(sx, sy + i * TILE - 3, 14, 6);
  }
}

function drawObject(ctx, obj, sx, sy, isTarget) {
  if (obj.type === OBJ.HOUSE)    drawHouse(ctx, sx, sy, obj);
  if (obj.type === OBJ.CHEST)    drawChest(ctx, sx, sy, isTarget);
  if (obj.type === OBJ.BOARD)    drawBoard(ctx, sx, sy, isTarget);
  if (obj.type === OBJ.WELL)     drawWell(ctx, sx, sy);
  if (obj.type === OBJ.TREE)     drawTree(ctx, sx, sy, obj);
  if (obj.type === OBJ.FLOWERS)  drawFlowers(ctx, sx, sy, obj);
  if (obj.type === OBJ.SIGN)     drawSign(ctx, sx, sy, obj);
  if (obj.type === OBJ.FENCE_H)  drawFenceH(ctx, sx, sy, obj);
  if (obj.type === OBJ.FENCE_V)  drawFenceV(ctx, sx, sy, obj);
  // Placeables (emoji-based rendering)
  if (obj.isPlaceable) {
    const info = PLACEABLES[obj.type];
    if (info) drawPlaceable(ctx, sx, sy, obj, info);
  }
}

function drawPlaceable(ctx, sx, sy, obj, info) {
  const cx = sx + (obj.w * TILE) / 2;
  const cy = sy + (obj.h * TILE) / 2;
  const tileW = obj.w * TILE;
  const tileH = obj.h * TILE;

  // Solid dirt-toned backing so decoration stands out against grass
  ctx.fillStyle = "rgba(180,155,100,0.55)";
  ctx.beginPath();
  ctx.roundRect(sx + 2, sy + 2, tileW - 4, tileH - 4, 6);
  ctx.fill();

  // Visible border
  ctx.strokeStyle = "rgba(220,195,130,0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(sx + 2, sy + 2, tileW - 4, tileH - 4, 6);
  ctx.stroke();

  // Drop shadow under emoji
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx + 2, sy + tileH - 5, tileW * 0.36, tileH * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Emoji — full opacity, large and centered
  const fontSize = Math.max(obj.w, obj.h) * TILE * 0.78;
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(info.icon, cx, cy - 3);
  ctx.restore();
}

// ─── Player drawing ───────────────────────────────────────────────────────────
function drawPlayer(ctx, px, py, facing, step, invincible, t, character, weapon) {
  const bobY  = (step === 1 || step === 3) ? -1 : 0;
  const legSw = (step === 1 || step === 3) ?  3 : 0;

  const { skin = 'light', outfit = 'blue', hair = 'short', hat = 'none' } = character || {};
  const SKINS   = { light:'#f5c5a3', medium:'#d4956a', tan:'#c07840', brown:'#8b5a2b', dark:'#5a3018' };
  const OUTFITS = { blue:['#5b8dd9','#3a6abf'], green:['#5a9a4a','#3a7a2a'], red:['#c05040','#8a2820'],
                    purple:['#7a5ab0','#5a3a8a'], orange:['#d07830','#a05010'], teal:['#4a9a8a','#2a7a6a'] };
  const HAIRS   = { short:'#7a4f2a', long:'#3a2010', curly:'#c88040', braid:'#884020' };
  const HATS_C  = { cap:'#5a3a8a', straw:'#d4a855', beanie:'#c05040' };

  const skinCol  = SKINS[skin]  || '#f5c5a3';
  const [bodyCol, legCol] = OUTFITS[outfit] || ['#5b8dd9','#3a6abf'];
  const hairCol  = HAIRS[hair]  || '#7a4f2a';

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, py + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, py + 2, 5, 9 - legSw);

  // Body
  ctx.fillStyle = bodyCol;
  ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);

  // Arms
  const armSw = (step === 1 || step === 3) ? 2 : 0;
  ctx.fillStyle = bodyCol;
  ctx.fillRect(px - 10, py - 9 + bobY + armSw, 3, 8);
  ctx.fillRect(px + 7,  py - 9 + bobY - armSw, 3, 8);

  // Head
  if (!(invincible > 0 && Math.floor(t * 8) % 2 === 0)) {
    ctx.fillStyle = skinCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
    ctx.fillStyle = hairCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);

    // Hat
    if (hat !== 'none' && HATS_C[hat]) {
      ctx.fillStyle = HATS_C[hat];
      if (hat === 'cap')    { ctx.fillRect(px - 8, py - 27 + bobY, 16, 6); ctx.fillRect(px - 10, py - 28 + bobY, 20, 3); }
      if (hat === 'straw')  { ctx.beginPath(); ctx.ellipse(px, py - 27 + bobY, 12, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px-6, py-35+bobY, 12, 10); }
      if (hat === 'beanie') { ctx.beginPath(); ctx.arc(px, py - 24 + bobY, 8, Math.PI, 0); ctx.fill(); }
    }

    if (facing === "down") {
      ctx.fillStyle = "#2a1a0a";
      ctx.fillRect(px - 4, py - 16 + bobY, 3, 3);
      ctx.fillRect(px + 1,  py - 16 + bobY, 3, 3);
      ctx.fillRect(px - 2,  py - 12 + bobY, 4, 2);
    } else if (facing === "left") {
      ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px - 5, py - 16 + bobY, 3, 3);
    } else if (facing === "right") {
      ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px + 2, py - 16 + bobY, 3, 3);
    }
  }

  // ── Held weapon ───────────────────────────────────────────────────────────
  if (weapon) {
    const handX = facing === "left" ? px - 14 : px + 14;
    const handY = py - 8 + bobY;
    ctx.font = "13px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const WEAPON_ICONS = { axe:"🪓", pickaxe:"⛏️", fishing_rod:"🎣" };
    const icon = WEAPON_ICONS[weapon];
    if (icon) ctx.fillText(icon, handX, handY);
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD(ctx, W, H, inventory, interactTarget, t) {
  // Top bar
  ctx.fillStyle = "rgba(18,10,4,0.9)"; ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#c8e890"; ctx.font = "bold 13px monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText("🌿 Hearthroot", 12, 15);

  // Day indicator
  ctx.fillStyle = "#f5e6c8"; ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Day 1  ·  Morning  ·  ☀️", W / 2, 15);

  // Resources in top bar
  ctx.textAlign = "right"; ctx.fillStyle = "#d8eaa0"; ctx.font = "11px monospace";
  const inv = inventory;
  ctx.fillText(
    `🪵wood:${inv.wood ?? 0}  🪨stone:${inv.stone ?? 0}  🌿herbs:${inv.herbs ?? 0}  🦴leathr:${inv.leather ?? 0}`,
    W - 14, 15
  );

  // Interact prompt — positioned above hotbar (hotbar is ~80px tall from bottom)
  if (interactTarget) {
    const msg   = interactTarget.label ?? "[E] Interact";
    ctx.font    = "bold 11px monospace";
    const mw    = ctx.measureText(msg).width + 28;
    const bx    = W / 2 - mw / 2, by = H - 110;
    ctx.fillStyle = "rgba(18,10,4,0.88)"; ctx.fillRect(bx, by, mw, 24);
    ctx.strokeStyle = "rgba(255,220,80,0.75)"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, mw, 24);
    ctx.fillStyle = "#f5e6b0"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(msg, W / 2, by + 12);
  }

  // Bottom hint bar
  ctx.fillStyle = "rgba(18,10,4,0.72)"; ctx.fillRect(0, H - 22, W, 22);
  ctx.fillStyle = "rgba(245,230,200,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD / arrows  ·  E interact  ·  Tab — menu  ·  Esc close", W / 2, H - 11);
}

// ─── Partner / join-code widget (DOM overlay, top-right corner) ───────────────
function PartnerWidget({ joinCode, partnerOnline }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(joinCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      position: "absolute", top: 38, right: 10,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
      fontFamily: "monospace", userSelect: "none",
      pointerEvents: "auto",
    }}>
      {/* Partner status dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: "rgba(220,200,160,0.4)" }}>
          {partnerOnline ? "partner online" : "partner offline"}
        </span>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: partnerOnline ? "rgba(80,200,120,0.8)" : "rgba(180,120,80,0.45)",
          boxShadow: partnerOnline ? "0 0 6px rgba(80,200,120,0.5)" : "none",
        }} />
      </div>
      {/* Join code — tap to copy */}
      <button
        onClick={copy}
        title="Copy join code"
        style={{
          background: "rgba(10,18,6,0.82)",
          border: "1px solid rgba(200,180,100,0.2)",
          borderRadius: 7, padding: "4px 10px",
          cursor: "pointer", color: "rgba(200,230,120,0.75)",
          fontSize: 12, fontFamily: "monospace", letterSpacing: "0.14em",
          lineHeight: 1,
        }}
      >
        {copied ? "copied ✓" : joinCode}
      </button>
    </div>
  );
}

// ─── Chest overlay ────────────────────────────────────────────────────────────
const ITEM_ICONS = {
  wood: "🪵", stone: "🪨", sticks: "🪹", herbs: "🌿",
  leather: "🦴", meat: "🥩", silk: "🕸",
  axe: "🪓", pickaxe: "⛏️", fishing_rod: "🎣",
  crafting_station: "🔨", leather_armor: "🛡️",
  cooked_meat: "🍖", potion_table: "🧪",
};


function ChestOverlay({ inventory, onClose }) {
  const resources = Object.entries(inventory ?? {}).filter(([item, v]) => v > 0 && !EQUIPPABLE[item]);
  const gear      = Object.entries(inventory ?? {}).filter(([item, v]) => v > 0 && EQUIPPABLE[item]);
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(4,10,4,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10,
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#16200e",
          border: "1px solid rgba(200,180,100,0.3)",
          borderRadius: 14,
          padding: "24px 28px",
          minWidth: 280,
          maxWidth: 360,
          fontFamily: "monospace",
          color: "#f5e6c8",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(200,230,160,0.45)", textTransform: "uppercase", marginBottom: 3 }}>
              shared chest
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 400, color: "rgba(200,230,120,0.9)" }}>contents</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.35)", fontSize: 13,
              fontFamily: "monospace", cursor: "pointer", padding: "4px 10px",
            }}
          >✕</button>
        </div>

        {/* Resources */}
        {resources.length === 0 && gear.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(245,230,200,0.22)", padding: "16px 0" }}>
            chest is empty
          </p>
        ) : (
          <>
            {resources.length > 0 && (
              <>
                <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>resources</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: gear.length > 0 ? 16 : 0 }}>
                  {resources.map(([item, qty]) => (
                    <div key={item} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: 18 }}>{ITEM_ICONS[item] ?? "📦"}</span>
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(245,230,200,0.45)" }}>{item.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: 16, color: "rgba(200,230,120,0.9)", fontWeight: 400 }}>{qty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {gear.length > 0 && (
              <>
                <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>gear</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {gear.map(([item, qty]) => {
                    const info = EQUIPPABLE[item];
                    return (
                      <div key={item} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "rgba(200,230,120,0.04)",
                        border: "1px solid rgba(200,230,120,0.12)",
                        borderRadius: 8, padding: "8px 12px",
                      }}>
                        <span style={{ fontSize: 20 }}>{ITEM_ICONS[item] ?? "📦"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: "rgba(200,230,120,0.85)" }}>{item.replace(/_/g, " ")}</div>
                          <div style={{ fontSize: 10, color: "rgba(200,230,160,0.4)" }}>{info?.slot} slot</div>
                        </div>
                        {qty > 1 && <div style={{ fontSize: 14, color: "rgba(200,230,120,0.7)", fontFamily: "monospace" }}>×{qty}</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(245,230,200,0.2)", marginTop: 18 }}>
          [E] or click outside to close
        </p>
      </div>
    </div>
  );
}

// ─── Run Join Prompt overlay ─────────────────────────────────────────────────
const RUN_TYPE_INFO = {
  forest:  { icon: "🌲", label: "Forest Run" },
  mining:  { icon: "⛏️", label: "Mining Run" },
  fruit:   { icon: "🍎", label: "Fruit Picking" },
  fishing: { icon: "🎣", label: "Fishing Trip" },
};

function RunJoinPrompt({ runType, onJoin, onDecline }) {
  const info = RUN_TYPE_INFO[runType] ?? RUN_TYPE_INFO.forest;
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(4,10,4,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 20,
    }}>
      <div style={{
        background: "#141e0e",
        border: "1px solid rgba(200,230,120,0.25)",
        borderRadius: 16,
        padding: "28px 32px",
        maxWidth: 300,
        width: "90%",
        fontFamily: "monospace",
        color: "#f5e6c8",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
            partner is heading out
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: "rgba(200,230,120,0.9)" }}>
            {info.icon} {info.label}
          </h2>
          <p style={{ fontSize: 12, color: "rgba(245,230,200,0.45)", marginTop: 8, lineHeight: 1.6 }}>
            Your partner just queued a {info.label.toLowerCase()}. Join them for a co-op run?
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onJoin}
            style={{
              padding: "13px",
              borderRadius: 10,
              border: "1px solid rgba(200,230,120,0.35)",
              background: "rgba(200,230,120,0.1)",
              color: "rgba(200,230,120,0.95)",
              fontSize: 13,
              fontFamily: "monospace",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            join the run →
          </button>
          <button
            onClick={onDecline}
            style={{
              padding: "9px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "rgba(255,255,255,0.3)",
              fontSize: 12,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            stay home
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Crafting overlay ─────────────────────────────────────────────────────────

const RECIPE_ICONS = {
  axe:              "🪓",
  pickaxe:          "⛏️",
  fishing_rod:      "🎣",
  crafting_station: "🔨",
  leather_armor:    "🛡️",
  cooked_meat:      "🍖",
  potion_table:     "🧪",
};

const RECIPE_LABELS = {
  axe:              "Axe",
  pickaxe:          "Pickaxe",
  fishing_rod:      "Fishing Rod",
  crafting_station: "Crafting Station",
  leather_armor:    "Leather Armor",
  cooked_meat:      "Cooked Meat",
  potion_table:     "Potion Table",
};

const ITEM_ICONS_CRAFT = {
  wood: "🪵", stone: "🪨", sticks: "🪹", herbs: "🌿",
  leather: "🦴", meat: "🥩", silk: "🕸",
  axe: "🪓", pickaxe: "⛏️", fishing_rod: "🎣",
  crafting_station: "🔨", leather_armor: "🛡️",
  cooked_meat: "🍖", potion_table: "🧪",
};

function CraftingOverlay({ inventory, onCraft, onClose }) {
  const [craftedMsg, setCraftedMsg] = useState(null);

  function handleCraft(recipeName) {
    const newInv = craftItem(recipeName, inventory);
    if (newInv) {
      onCraft(newInv, recipeName);
      setCraftedMsg(`Crafted ${RECIPE_LABELS[recipeName] ?? recipeName}!`);
      setTimeout(() => setCraftedMsg(null), 2000);
    }
  }

  return (
    <div
      style={{
        position: "absolute", inset: 0,
        background: "rgba(4,10,4,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 15,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#141e0e",
          border: "1px solid rgba(200,180,100,0.3)",
          borderRadius: 16,
          padding: "24px 28px",
          minWidth: 320,
          maxWidth: 420,
          maxHeight: "80vh",
          overflowY: "auto",
          fontFamily: "monospace",
          color: "#f5e6c8",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 3 }}>
              crafting
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 400, color: "rgba(200,230,120,0.9)" }}>workbench</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.35)", fontSize: 13,
              fontFamily: "monospace", cursor: "pointer", padding: "4px 10px",
            }}
          >✕</button>
        </div>

        {/* Success flash */}
        {craftedMsg && (
          <div style={{
            textAlign: "center", fontSize: 12, padding: "8px",
            marginBottom: 12, borderRadius: 8,
            background: "rgba(200,230,120,0.1)",
            border: "1px solid rgba(200,230,120,0.25)",
            color: "rgba(200,230,120,0.9)",
          }}>
            ✓ {craftedMsg}
          </div>
        )}

        {/* Your materials */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>
            your materials
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(inventory ?? {})
              .filter(([item, v]) => v > 0 && !EQUIPPABLE[item])
              .map(([item, qty]) => (
              <span key={item} style={{
                fontSize: 11, padding: "4px 8px", borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(245,230,200,0.7)",
              }}>
                {ITEM_ICONS_CRAFT[item] ?? "📦"} {qty} {item}
              </span>
            ))}
            {Object.entries(inventory ?? {}).filter(([item, v]) => v > 0 && !EQUIPPABLE[item]).length === 0 && (
              <span style={{ fontSize: 11, color: "rgba(245,230,200,0.2)" }}>nothing yet — go on a run first</span>
            )}
          </div>
        </div>

        {/* Recipes */}
        <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", marginBottom: 10, textTransform: "uppercase" }}>
          recipes
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(RECIPES).map(([name, recipe]) => {
            const craftable = canCraft(recipe, inventory ?? {});
            return (
              <div
                key={name}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: craftable ? "rgba(200,230,120,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${craftable ? "rgba(200,230,120,0.2)" : "rgba(255,255,255,0.06)"}`,
                  opacity: craftable ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: 22, minWidth: 30 }}>{RECIPE_ICONS[name] ?? "📦"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: craftable ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)", marginBottom: 3 }}>
                    {RECIPE_LABELS[name] ?? name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(recipe).map(([item, qty]) => {
                      const have = (inventory ?? {})[item] ?? 0;
                      const ok   = have >= qty;
                      return (
                        <span key={item} style={{ color: ok ? "rgba(200,230,120,0.6)" : "rgba(255,120,100,0.6)" }}>
                          {ITEM_ICONS_CRAFT[item] ?? "📦"} {have}/{qty} {item}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  disabled={!craftable}
                  onClick={() => handleCraft(name)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${craftable ? "rgba(200,230,120,0.3)" : "rgba(255,255,255,0.06)"}`,
                    background: craftable ? "rgba(200,230,120,0.1)" : "transparent",
                    color: craftable ? "rgba(200,230,120,0.9)" : "rgba(255,255,255,0.2)",
                    fontSize: 11,
                    fontFamily: "monospace",
                    cursor: craftable ? "pointer" : "default",
                  }}
                >
                  craft
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(245,230,200,0.2)", marginTop: 18 }}>
          [C] or click outside to close
        </p>
      </div>
    </div>
  );
}

// ─── Equipment overlay ────────────────────────────────────────────────────────
const EQUIP_SLOT_LABELS = { weapon: "⚔️ Weapon", armor: "🛡 Armor", accessory: "✨ Accessory" };

function EquipmentOverlay({ inventory, equipment, onEquip, onClose }) {
  const equippedItems = new Set(Object.values(equipment ?? {}).filter(Boolean));

  // Items in inventory that are equippable
  const equippableInInv = Object.keys(EQUIPPABLE).filter(name => {
    // crafted items that have been made: track via a "crafted" sub-inventory
    // For now: equippable if it appears in inventory as a key with value > 0
    // The chest inventory uses resource items; crafted gear needs its own tracking.
    // We expose them through chest inventory using special keys.
    return (inventory?.[name] ?? 0) > 0;
  });

  const stats = getEquipStats(equipment ?? {});

  return (
    <div
      style={{
        position: "absolute", inset: 0,
        background: "rgba(4,10,4,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#141e0e",
          border: "1px solid rgba(140,180,100,0.3)",
          borderRadius: 16,
          padding: "24px 28px",
          width: 380,
          maxWidth: "96vw",
          maxHeight: "84vh",
          overflowY: "auto",
          fontFamily: "monospace",
          color: "#f5e6c8",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(200,230,160,0.4)", textTransform: "uppercase", marginBottom: 3 }}>
              your gear
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 400, color: "rgba(200,230,120,0.9)" }}>equipment</h2>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "rgba(255,255,255,0.35)", fontSize: 13,
            fontFamily: "monospace", cursor: "pointer", padding: "4px 10px",
          }}>✕</button>
        </div>

        {/* Equipment slots */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
            equipped
          </p>
          {["weapon", "armor", "accessory"].map(slot => {
            const equipped = equipment?.[slot];
            const info = equipped ? EQUIPPABLE[equipped] : null;
            return (
              <div key={slot} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10,
                background: equipped ? "rgba(200,230,120,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${equipped ? "rgba(200,230,120,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <span style={{ fontSize: 22, minWidth: 32, opacity: equipped ? 1 : 0.3 }}>
                  {info?.icon ?? { weapon: "🗡", armor: "🫥", accessory: "○" }[slot]}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "rgba(200,230,160,0.4)", marginBottom: 2 }}>
                    {EQUIP_SLOT_LABELS[slot]}
                  </div>
                  <div style={{ fontSize: 13, color: equipped ? "rgba(200,230,120,0.9)" : "rgba(255,255,255,0.2)" }}>
                    {info?.label ?? "— empty —"}
                  </div>
                  {info && (
                    <div style={{ fontSize: 10, color: "rgba(200,230,160,0.5)", marginTop: 2 }}>
                      {Object.entries(info.stats).map(([k,v]) => `${k}: ${v}`).join("  ·  ")}
                    </div>
                  )}
                </div>
                {equipped && (
                  <button onClick={() => onEquip(equipped)} style={{
                    padding: "6px 10px", borderRadius: 7,
                    border: "1px solid rgba(255,100,100,0.25)",
                    background: "rgba(255,100,100,0.06)",
                    color: "rgba(255,140,120,0.7)", fontSize: 10,
                    fontFamily: "monospace", cursor: "pointer",
                  }}>unequip</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Active stat bonuses */}
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            active bonuses
          </p>
          {Object.entries(stats).filter(([,v]) => v && v !== 0 && v !== false).length === 0 ? (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>no bonuses active</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {stats.attackBonus > 0 && <StatPill label="ATK" value={`+${stats.attackBonus}`} />}
              {stats.defense > 0 && <StatPill label="DEF" value={`+${stats.defense}`} />}
              {stats.maxHpBonus > 0 && <StatPill label="HP" value={`+${stats.maxHpBonus}`} />}
              {stats.attackRange > 0 && <StatPill label="RANGE" value={`+${stats.attackRange}`} />}
              {stats.herbBonus > 0 && <StatPill label="HERB" value={`×${stats.herbBonus}`} />}
              {stats.stoneYield > 0 && <StatPill label="STONE" value={`×${stats.stoneYield}`} />}
              {stats.canFish && <StatPill label="CAN FISH" value="✓" color="rgba(100,180,255,0.8)" />}
            </div>
          )}
        </div>

        {/* Available to equip */}
        {equippableInInv.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 10, color: "rgba(245,230,200,0.3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              in chest — click to equip
            </p>
            {equippableInInv.map(name => {
              const info = EQUIPPABLE[name];
              const isEquipped = equippedItems.has(name);
              return (
                <div key={name} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10,
                  background: isEquipped ? "rgba(200,230,120,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isEquipped ? "rgba(200,230,120,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}>
                  <span style={{ fontSize: 20, minWidth: 30 }}>{info.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "rgba(200,230,120,0.85)" }}>{info.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(200,230,160,0.4)" }}>
                      {info.slot} slot  ·  {Object.entries(info.stats).map(([k,v]) => `${k}: ${v}`).join("  ")}
                    </div>
                  </div>
                  <button
                    onClick={() => onEquip(name)}
                    style={{
                      padding: "7px 12px", borderRadius: 8,
                      border: `1px solid ${isEquipped ? "rgba(255,100,100,0.25)" : "rgba(200,230,120,0.3)"}`,
                      background: isEquipped ? "rgba(255,100,100,0.06)" : "rgba(200,230,120,0.08)",
                      color: isEquipped ? "rgba(255,140,120,0.8)" : "rgba(200,230,120,0.9)",
                      fontSize: 11, fontFamily: "monospace", cursor: "pointer",
                    }}
                  >
                    {isEquipped ? "unequip" : "equip"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {equippableInInv.length === 0 && (
          <p style={{ fontSize: 11, color: "rgba(245,230,200,0.2)", textAlign: "center" }}>
            craft items to equip them — open the workbench with [C]
          </p>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(245,230,200,0.2)" }}>
          [I] or click outside to close
        </p>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: "4px 9px", borderRadius: 6,
      background: "rgba(200,230,120,0.06)",
      border: "1px solid rgba(200,230,120,0.15)",
    }}>
      <span style={{ fontSize: 9, color: "rgba(200,230,160,0.45)", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: 12, color: color ?? "rgba(200,230,120,0.9)" }}>{value}</span>
    </div>
  );
}

// ─── Character Customization Overlay ────────────────────────────────────────
function CharacterOverlay({ character, onUpdate, onClose }) {
  const [ch, setCh] = React.useState({ ...character });
  const preview = ch;

  function save() { onUpdate(ch); onClose(); }

  const Swatch = ({ active, color, bg, onClick, size = 28 }) => (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: "50%", cursor: "pointer",
      background: bg || color, border: `2px solid ${active ? "#fff" : "rgba(255,255,255,0.1)"}`,
      boxShadow: active ? "0 0 0 2px rgba(200,230,120,0.6)" : "none",
      transition: "all 0.1s",
    }} />
  );

  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(4,10,4,0.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:18 }} onClick={onClose}>
      <div style={{ background:"#141e0e", border:"1px solid rgba(160,200,100,0.3)", borderRadius:16, padding:"24px 28px", width:360, maxWidth:"96vw", maxHeight:"88vh", overflowY:"auto", fontFamily:"monospace", color:"#f5e6c8" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:3 }}>your look</p>
            <h2 style={{ fontSize:18, fontWeight:400, color:"rgba(200,230,120,0.9)" }}>character</h2>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.35)", fontSize:13, fontFamily:"monospace", cursor:"pointer", padding:"4px 10px" }}>✕</button>
        </div>

        {/* Mini character preview */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
          <div style={{ position:"relative", width:56, height:80 }}>
            <svg width="56" height="80" style={{ display:"block" }}>
              {/* Shadow */}
              <ellipse cx="28" cy="72" rx="10" ry="4" fill="rgba(0,0,0,0.2)" />
              {/* Legs */}
              {(() => {
                const legCol = OUTFIT_COLORS.find(o => o.id === ch.outfit)?.legs || "#3a6abf";
                return (<><rect x="16" y="50" width="8" height="14" fill={legCol} /><rect x="26" y="50" width="8" height="14" fill={legCol} /></>);
              })()}
              {/* Body */}
              {(() => {
                const bodyCol = OUTFIT_COLORS.find(o => o.id === ch.outfit)?.body || "#5b8dd9";
                return <rect x="14" y="32" width="22" height="20" fill={bodyCol} />;
              })()}
              {/* Arms */}
              {(() => {
                const bodyCol = OUTFIT_COLORS.find(o => o.id === ch.outfit)?.body || "#5b8dd9";
                return (<><rect x="8" y="33" width="6" height="14" fill={bodyCol} /><rect x="36" y="33" width="6" height="14" fill={bodyCol} /></>);
              })()}
              {/* Head */}
              {(() => {
                const skinCol = SKIN_TONES.find(s => s.id === ch.skin)?.color || "#f5c5a3";
                return <rect x="14" y="14" width="22" height="20" fill={skinCol} />;
              })()}
              {/* Hair */}
              {(() => {
                const hairCol = HAIR_STYLES.find(h => h.id === ch.hair)?.color || "#7a4f2a";
                return <rect x="14" y="14" width="22" height="8" fill={hairCol} />;
              })()}
              {/* Hat */}
              {ch.hat !== "none" && (() => {
                const HAT_COLS = { cap:"#5a3a8a", straw:"#d4a855", beanie:"#c05040" };
                const hc = HAT_COLS[ch.hat];
                if (ch.hat === "cap")    return (<><rect x="12" y="6" width="26" height="10" fill={hc} /><rect x="10" y="3" width="30" height="5" fill={hc} /></>);
                if (ch.hat === "straw")  return (<><rect x="16" y="4" width="18" height="14" fill={hc} /><ellipse cx="25" cy="18" rx="18" ry="6" fill={hc} /></>);
                if (ch.hat === "beanie") return <path d={`M14 14 Q14 4 25 4 Q36 4 36 14`} fill={hc} />;
                return null;
              })()}
              {/* Eyes */}
              <rect x="18" y="26" width="4" height="4" fill="#2a1a0a" />
              <rect x="28" y="26" width="4" height="4" fill="#2a1a0a" />
            </svg>
          </div>
        </div>

        {/* Skin tone */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>skin tone</p>
          <div style={{ display:"flex", gap:8 }}>
            {SKIN_TONES.map(s => (
              <Swatch key={s.id} active={ch.skin===s.id} color={s.color} onClick={() => setCh(c => ({ ...c, skin:s.id }))} />
            ))}
          </div>
        </div>

        {/* Hair style */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>hair</p>
          <div style={{ display:"flex", gap:6 }}>
            {HAIR_STYLES.map(h => (
              <button key={h.id} onClick={() => setCh(c => ({ ...c, hair:h.id }))} style={{
                padding:"6px 10px", borderRadius:8, cursor:"pointer",
                background: ch.hair===h.id ? "rgba(200,230,120,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${ch.hair===h.id ? "rgba(200,230,120,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: ch.hair===h.id ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)",
                fontFamily:"monospace", fontSize:11,
              }}>
                <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:h.color, marginRight:6 }} />
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outfit color */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>outfit</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {OUTFIT_COLORS.map(o => (
              <Swatch key={o.id} active={ch.outfit===o.id} color={o.body} onClick={() => setCh(c => ({ ...c, outfit:o.id }))} />
            ))}
          </div>
        </div>

        {/* Hat */}
        <div style={{ marginBottom:20 }}>
          <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>hat</p>
          <div style={{ display:"flex", gap:6 }}>
            {HAT_STYLES.map(h => (
              <button key={h.id} onClick={() => setCh(c => ({ ...c, hat:h.id }))} style={{
                padding:"6px 10px", borderRadius:8, cursor:"pointer",
                background: ch.hat===h.id ? "rgba(200,230,120,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${ch.hat===h.id ? "rgba(200,230,120,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: ch.hat===h.id ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)",
                fontFamily:"monospace", fontSize:11,
              }}>{h.label}</button>
            ))}
          </div>
        </div>

        <button onClick={save} style={{
          width:"100%", padding:"14px", borderRadius:10, cursor:"pointer",
          background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.3)",
          color:"rgba(200,230,120,0.9)", fontSize:13, fontFamily:"monospace",
        }}>save look →</button>
      </div>
    </div>
  );
}

// ─── Placeables / Decoration overlay ─────────────────────────────────────────
function PlaceablesOverlay({ inventory, onPlace, onClose }) {
  const [craftedMsg, setCraftedMsg] = React.useState(null);

  function handlePlace(id) {
    const info = PLACEABLES[id];
    if (!info) return;
    // Check we have materials
    for (const [item, qty] of Object.entries(info.cost)) {
      if ((inventory?.[item] ?? 0) < qty) return;
    }
    onPlace(id, info);
    setCraftedMsg(`Placed ${info.label}!`);
    setTimeout(() => setCraftedMsg(null), 2000);
  }

  function canAfford(cost) {
    for (const [item, qty] of Object.entries(cost)) {
      if ((inventory?.[item] ?? 0) < qty) return false;
    }
    return true;
  }

  const ITEM_IC = { wood:"🪵", stone:"🪨", sticks:"🪹", herbs:"🌿", leather:"🦴" };
  const ITEM_SHORT = { wood:"wood", stone:"stone", sticks:"sticks", herbs:"herbs", leather:"leathr" };

  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(4,10,4,0.87)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:17 }} onClick={onClose}>
      <div style={{ background:"#141e0e", border:"1px solid rgba(180,220,100,0.3)", borderRadius:16, padding:"24px 28px", width:420, maxWidth:"96vw", maxHeight:"84vh", overflowY:"auto", fontFamily:"monospace", color:"#f5e6c8" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:3 }}>decoration</p>
            <h2 style={{ fontSize:18, fontWeight:400, color:"rgba(200,230,120,0.9)" }}>place items</h2>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.35)", fontSize:13, fontFamily:"monospace", cursor:"pointer", padding:"4px 10px" }}>✕</button>
        </div>

        {craftedMsg && (
          <div style={{ textAlign:"center", fontSize:12, padding:"8px", marginBottom:12, borderRadius:8, background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.25)", color:"rgba(200,230,120,0.9)" }}>
            ✓ {craftedMsg}
          </div>
        )}

        <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>
          decorations (placed at your feet)
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {Object.entries(PLACEABLES).map(([id, info]) => {
            const affordable = canAfford(info.cost);
            return (
              <div key={id} style={{
                padding:"10px 12px", borderRadius:10,
                background: affordable ? "rgba(200,230,120,0.05)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${affordable ? "rgba(200,230,120,0.18)" : "rgba(255,255,255,0.06)"}`,
                opacity: affordable ? 1 : 0.45,
                display:"flex", flexDirection:"column", gap:6,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:22 }}>{info.icon}</span>
                  <span style={{ fontSize:12, color: affordable ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)" }}>{info.label}</span>
                </div>
                <div style={{ fontSize:9, color:"rgba(245,230,200,0.3)", display:"flex", flexWrap:"wrap", gap:4 }}>
                  {Object.entries(info.cost).map(([item, qty]) => {
                    const have = (inventory?.[item] ?? 0);
                    return (
                      <span key={item} style={{ color: have >= qty ? "rgba(200,230,120,0.6)" : "rgba(255,120,100,0.6)" }}>
                        {ITEM_IC[item] ?? ""}{ITEM_SHORT[item] ?? item}:{have}/{qty}
                      </span>
                    );
                  })}
                </div>
                <button disabled={!affordable} onClick={() => handlePlace(id)} style={{
                  padding:"5px 8px", borderRadius:6,
                  border: `1px solid ${affordable ? "rgba(200,230,120,0.25)" : "rgba(255,255,255,0.05)"}`,
                  background: affordable ? "rgba(200,230,120,0.08)" : "transparent",
                  color: affordable ? "rgba(200,230,120,0.9)" : "rgba(255,255,255,0.2)",
                  fontSize:10, fontFamily:"monospace", cursor: affordable ? "pointer" : "default",
                }}>place</button>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign:"center", fontSize:10, color:"rgba(245,230,200,0.2)", marginTop:18 }}>[P] or click outside to close</p>
      </div>
    </div>
  );
}

// ─── Persistent hotbar bar (always visible, click to open menu) ───────────────
const ITEM_ICONS_HOTBAR = {
  axe: "🪓", pickaxe: "⛏️", fishing_rod: "🎣",
  leather_armor: "🛡️", cooked_meat: "🍖", potion_table: "🧪",
  fish: "🐟", big_fish: "🐠", rare_fish: "🐡",
  apples: "🍎", berries: "🫐", mushrooms: "🍄", herbs: "🌿",
};
const ITEM_SHORT_LABELS_HOTBAR = {
  axe:"axe", pickaxe:"pick", fishing_rod:"rod",
  leather_armor:"armor", cooked_meat:"meat", potion_table:"pot",
  fish:"fish", big_fish:"bfish", rare_fish:"rfish",
  apples:"apple", berries:"berry", mushrooms:"mush", herbs:"herb",
};

function HotbarBar({ hotbar, equipment, onOpenMenu, onUseSlot }) {
  return (
    <div style={{
      position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 3,
      zIndex: 5, pointerEvents: "auto",
    }}>
      {hotbar.map((slot, idx) => {
        const isEquipped = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot] === slot?.item;
        return (
          <div
            key={idx}
            onClick={() => slot ? onUseSlot?.(idx) : onOpenMenu("inventory")}
            title={slot ? `${slot.item}${slot.qty != null ? ` ×${slot.qty}` : ""}` : `Slot ${idx + 1} — open inventory to assign`}
            style={{
              width: 44, height: 52, borderRadius: 8, cursor: "pointer",
              background: slot ? "rgba(10,18,6,0.92)" : "rgba(10,18,6,0.55)",
              border: `2px solid ${isEquipped ? "rgba(100,200,255,0.6)" : slot ? "rgba(200,230,120,0.35)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              position: "relative", transition: "border-color 0.15s", gap: 1,
            }}
          >
            {slot ? (
              <>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{ITEM_ICONS_HOTBAR[slot.item] ?? "📦"}</span>
                <span style={{ fontSize: 8, color: "rgba(200,230,120,0.65)", lineHeight: 1, fontFamily: "monospace", maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ITEM_SHORT_LABELS_HOTBAR[slot.item] ?? slot.item}
                </span>
                {slot.qty != null && (
                  <span style={{ fontSize: 9, color: "rgba(200,230,120,0.8)", lineHeight: 1, marginTop: 1 }}>{slot.qty}</span>
                )}
                {isEquipped && (
                  <div style={{
                    position: "absolute", top: 2, right: 2, width: 6, height: 6,
                    borderRadius: "50%", background: "rgba(100,200,255,0.95)",
                  }} />
                )}
              </>
            ) : (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", fontFamily: "monospace" }}>{idx + 1}</span>
            )}
          </div>
        );
      })}
      {/* Tab hint button */}
      <div
        onClick={() => onOpenMenu("inventory")}
        style={{
          marginLeft: 8, width: 36, height: 36, borderRadius: 8, cursor: "pointer",
          background: "rgba(10,18,6,0.7)",
          border: "1px solid rgba(200,230,120,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(200,230,120,0.5)", fontSize: 10, fontFamily: "monospace",
        }}
        title="Open menu (Tab)"
      >
        ⊞
      </div>
    </div>
  );
}

// ─── Unified Tab Menu (Minecraft-style) ───────────────────────────────────────
const ALL_ITEM_ICONS = {
  wood: "🪵", stone: "🪨", sticks: "🪹", herbs: "🌿",
  leather: "🦴", meat: "🥩", silk: "🕸️",
  coal: "🖤", gems: "💎", crystal: "🔷",
  apples: "🍎", berries: "🫐", mushrooms: "🍄",
  fish: "🐟", big_fish: "🐠", rare_fish: "🐡",
  axe: "🪓", pickaxe: "⛏️", fishing_rod: "🎣",
  crafting_station: "🔨", leather_armor: "🛡️",
  cooked_meat: "🍖", potion_table: "🧪",
};

const REC_ICONS = {
  axe:"🪓", pickaxe:"⛏️", fishing_rod:"🎣",
  crafting_station:"🔨", leather_armor:"🛡️",
  cooked_meat:"🍖", potion_table:"🧪",
};
const REC_LABELS = {
  axe:"Axe", pickaxe:"Pickaxe", fishing_rod:"Fishing Rod",
  crafting_station:"Crafting Station", leather_armor:"Leather Armor",
  cooked_meat:"Cooked Meat", potion_table:"Potion Table",
};

const TABS = [
  { id: "inventory",  label: "Inventory", icon: "🎒" },
  { id: "crafting",   label: "Crafting",  icon: "🔨" },
  { id: "equipment",  label: "Equipment", icon: "⚔️"  },
  { id: "decor",      label: "Decor",     icon: "🌸"  },
  { id: "character",  label: "Character", icon: "🧑"  },
];

function TabMenu({
  activeTab, onTabChange, onClose,
  inventory, equipment, onEquipItem,
  hotbar, onHotbarChange,
  onCraft, character, onCharacterUpdate,
  onPlace, onStartGhostPlace,
}) {
  const [craftMsg, setCraftMsg] = React.useState(null);
  const [placeMsg, setPlaceMsg] = React.useState(null);
  const [ch, setCh] = React.useState({ ...character });
  const [dragOverSlot, setDragOverSlot] = React.useState(null);
  const [invSubTab, setInvSubTab] = React.useState("consumables");

  // Prevent spacebar from scrolling the browser while this menu is open
  React.useEffect(() => {
    const block = (e) => { if (e.key === " " || e.code === "Space") e.preventDefault(); };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  function assignToHotbarSlot(itemName, slotIdx) {
    const isConsumable = !!HOTBAR_ITEMS[itemName];
    const isGear = !!EQUIPPABLE[itemName];
    if (!isConsumable && !isGear) return;
    const qty = isConsumable ? (inventory?.[itemName] ?? 0) : undefined;
    const newHotbar = [...hotbar];
    newHotbar[slotIdx] = isConsumable ? { item: itemName, qty } : { item: itemName };
    onHotbarChange?.(newHotbar);
  }

  function assignToHotbar(itemName, qty) {
    const isConsumable = !!HOTBAR_ITEMS[itemName];
    if (!isConsumable) return;
    const emptyIdx = hotbar.findIndex(s => !s);
    const slotIdx = emptyIdx >= 0 ? emptyIdx : 0;
    const newHotbar = [...hotbar];
    newHotbar[slotIdx] = { item: itemName, qty };
    onHotbarChange?.(newHotbar);
  }

  // ── Hotbar drop zone (sticky, rendered outside the scroll pane) ─────────────
  function HotbarDropZone() {
    function handleSlotDrop(e, idx) {
      e.preventDefault();
      const itemName = e.dataTransfer.getData("hotbar_item");
      if (itemName) assignToHotbarSlot(itemName, idx);
      setDragOverSlot(null);
    }
    function handleSlotDragOver(e, idx) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOverSlot(idx);
    }
    function handleSlotClear(idx) {
      const next = [...hotbar]; next[idx] = null; onHotbarChange?.(next);
    }
    return (
      <div style={{
        padding: "10px 20px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "#0f1709",
      }}>
        <p style={{ fontSize:9, color:"rgba(245,230,200,0.22)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:7 }}>
          hotbar — drag any item onto a slot
        </p>
        <div style={{ display: "flex", gap: 5 }}>
          {hotbar.map((slot, idx) => {
            const isOver = dragOverSlot === idx;
            const isEq = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot] === slot?.item;
            return (
              <div
                key={idx}
                onDrop={e => handleSlotDrop(e, idx)}
                onDragOver={e => handleSlotDragOver(e, idx)}
                onDragLeave={() => setDragOverSlot(null)}
                style={{
                  width: 50, height: 54, borderRadius: 9,
                  background: isOver ? "rgba(200,230,120,0.18)" : slot ? "rgba(10,18,6,0.7)" : "rgba(255,255,255,0.03)",
                  border: `2px solid ${isOver ? "rgba(200,230,120,0.9)" : isEq ? "rgba(100,200,255,0.5)" : slot ? "rgba(200,230,120,0.3)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 2, position: "relative", transition: "all 0.1s",
                  boxShadow: isOver ? "0 0 0 3px rgba(200,230,120,0.25)" : "none",
                }}
              >
                {slot ? (
                  <>
                    <span style={{ fontSize: 18 }}>{ITEM_ICONS_HOTBAR[slot.item] ?? "📦"}</span>
                    <span style={{ fontSize: 8, color: "rgba(200,230,120,0.6)", lineHeight: 1, fontFamily: "monospace", maxWidth: 46, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ITEM_SHORT_LABELS_HOTBAR[slot.item] ?? slot.item}
                    </span>
                    {slot.qty != null && <span style={{ fontSize: 9, color: "rgba(200,230,120,0.7)" }}>{slot.qty}</span>}
                    {isEq && <div style={{ position: "absolute", top: 3, right: 3, width: 6, height: 6, borderRadius: "50%", background: "rgba(100,200,255,0.9)" }} />}
                    <button onClick={() => handleSlotClear(idx)} style={{
                      position: "absolute", top: -5, right: -5, width: 15, height: 15,
                      borderRadius: "50%", background: "rgba(255,80,80,0.8)", border: "none",
                      color: "#fff", fontSize: 9, cursor: "pointer", lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                  </>
                ) : (
                  <span style={{ fontSize: isOver ? 18 : 11, color: isOver ? "rgba(200,230,120,0.7)" : "rgba(255,255,255,0.12)", fontFamily: "monospace", transition: "all 0.1s" }}>
                    {isOver ? "+" : idx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Tab: Inventory ──────────────────────────────────────────────────────────
  function InventoryTab() {
    const items = Object.entries(inventory ?? {}).filter(([, v]) => v > 0);
    const resources  = items.filter(([k]) => !EQUIPPABLE[k] && !HOTBAR_ITEMS[k] && !PLACEABLES[k]);
    const consumables = items.filter(([k]) => !!HOTBAR_ITEMS[k]);
    const gear        = items.filter(([k]) => !!EQUIPPABLE[k]);
    const placeables  = items.filter(([k]) => !!PLACEABLES[k]);

    function handleDragStart(e, itemName) {
      e.dataTransfer.setData("hotbar_item", itemName);
      e.dataTransfer.effectAllowed = "copy";
    }

    const INV_SUB_TABS = [
      { id: "consumables", label: "Consumables", count: consumables.length },
      { id: "gear",        label: "Gear",        count: gear.length },
      { id: "placeables",  label: "Placeables",  count: placeables.length },
      { id: "resources",   label: "Resources",   count: resources.length },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Sub-tab bar */}
        <div style={{ display:"flex", gap:2, borderBottom:"1px solid rgba(255,255,255,0.06)", paddingBottom:0, marginBottom:2 }}>
          {INV_SUB_TABS.map(st => {
            const active = invSubTab === st.id;
            return (
              <button key={st.id} onClick={() => setInvSubTab(st.id)} style={{
                padding:"7px 11px", background:"transparent", border:"none",
                borderBottom:`2px solid ${active ? "rgba(200,230,120,0.7)" : "transparent"}`,
                color: active ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.32)",
                fontSize:10, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap",
                letterSpacing:"0.05em", transition:"color 0.1s",
              }}>
                {st.label}{st.count > 0 ? ` (${st.count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Consumables sub-tab — draggable to hotbar */}
        {invSubTab === "consumables" && (
          <>
            {consumables.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {consumables.map(([item, qty]) => (
                  <div
                    key={item}
                    draggable
                    onDragStart={e => handleDragStart(e, item)}
                    onClick={() => {
                      const emptyIdx = hotbar.findIndex(s => !s);
                      const slotIdx = emptyIdx >= 0 ? emptyIdx : 0;
                      const newHotbar = [...hotbar];
                      newHotbar[slotIdx] = { item, qty };
                      onHotbarChange?.(newHotbar);
                    }}
                  title="Drag to a hotbar slot, or click to assign to first empty slot"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: 10, cursor: "grab",
                    background: "rgba(255,200,80,0.07)",
                    border: "1px solid rgba(255,200,80,0.25)",
                    transition: "background 0.12s", userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{ALL_ITEM_ICONS[item] ?? "📦"}</span>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,210,100,0.9)" }}>{item.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>×{qty}  ·  drag → hotbar</div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "16px 0" }}>
                no consumables yet — go on a run to find food and herbs
              </p>
            )}
          </>
        )}

        {/* Gear sub-tab */}
        {invSubTab === "gear" && (
          <>
            {gear.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {gear.map(([item, qty]) => {
                  const info = EQUIPPABLE[item];
                  const isEq = equipment?.[info?.slot] === item;
                  return (
                    <div
                      key={item}
                      draggable
                      onDragStart={e => handleDragStart(e, item)}
                      onClick={() => onEquipItem?.(item)}
                      title="Drag to hotbar or click to equip"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: 10, cursor: "grab",
                        background: isEq ? "rgba(100,200,255,0.08)" : "rgba(200,230,120,0.05)",
                        border: `1px solid ${isEq ? "rgba(100,200,255,0.35)" : "rgba(200,230,120,0.2)"}`,
                        userSelect: "none",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{ALL_ITEM_ICONS[item] ?? "📦"}</span>
                      <div>
                        <div style={{ fontSize: 12, color: isEq ? "rgba(100,200,255,0.9)" : "rgba(200,230,120,0.85)" }}>
                          {item.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                          {isEq ? "✓ equipped" : "click to equip  ·  drag → hotbar"}{qty > 1 ? `  ·  ×${qty}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "16px 0" }}>
                no gear yet — craft some in the Crafting tab
              </p>
            )}
          </>
        )}

        {/* Placeables sub-tab */}
        {invSubTab === "placeables" && (
          <>
            {placeables.length > 0 ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                {placeables.map(([id, qty]) => {
                  const info = PLACEABLES[id];
                  if (!info) return null;
                  return (
                    <div key={id} style={{
                      padding:"10px 12px", borderRadius:10, display:"flex", flexDirection:"column", gap:5,
                      background:"rgba(200,230,120,0.05)",
                      border:"1px solid rgba(200,230,120,0.18)",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:22 }}>{info.icon}</span>
                        <div>
                          <div style={{ fontSize:12, color:"rgba(200,230,120,0.9)" }}>{info.label}</div>
                          <div style={{ fontSize:10, color:"rgba(245,230,200,0.3)" }}>×{qty} in chest</div>
                        </div>
                      </div>
                      <button onClick={() => onStartGhostPlace?.(id, info)} style={{
                        padding:"5px 8px", borderRadius:6, fontSize:10, fontFamily:"monospace",
                        cursor:"pointer",
                        border:"1px solid rgba(200,230,120,0.25)",
                        background:"rgba(200,230,120,0.08)",
                        color:"rgba(200,230,120,0.9)",
                      }}>place →</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "16px 0" }}>
                no placeables yet — craft a Crafting Station or other items first
              </p>
            )}
          </>
        )}

        {/* Resources sub-tab */}
        {invSubTab === "resources" && (
          <>
            {resources.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
                {resources.map(([item, qty]) => (
                  <div key={item} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <span style={{ fontSize: 18 }}>{ALL_ITEM_ICONS[item] ?? "📦"}</span>
                    <div>
                      <div style={{ fontSize: 9, color: "rgba(245,230,200,0.4)" }}>{item.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 15, color: "rgba(200,230,120,0.9)" }}>{qty}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "16px 0" }}>
                no resources yet — go on a run first
              </p>
            )}
          </>
        )}

        {items.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "24px 0" }}>
            chest is empty — go on a run first!
          </p>
        )}
      </div>
    );
  }

  // ── Tab: Crafting ───────────────────────────────────────────────────────────
  function CraftingTab() {
    function handleCraft(name) {
      const newInv = craftItem(name, inventory);
      if (newInv) {
        onCraft?.(newInv, name);
        setCraftMsg(`Crafted ${REC_LABELS[name] ?? name}!`);
        setTimeout(() => setCraftMsg(null), 2200);
      }
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {craftMsg && (
          <div style={{ textAlign:"center", fontSize:12, padding:"8px 14px", borderRadius:8,
            background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.3)",
            color:"rgba(200,230,120,0.9)" }}>
            ✓ {craftMsg}
          </div>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:4 }}>
          {Object.entries(inventory ?? {}).filter(([,v]) => v > 0 && !EQUIPPABLE[v === 0 ? "" : ""] && !EQUIPPABLE["x"]).filter(([k, v]) => v > 0 && !EQUIPPABLE[k]).map(([item, qty]) => (
            <span key={item} style={{ fontSize:10, padding:"3px 7px", borderRadius:5,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
              color:"rgba(245,230,200,0.6)" }}>
              {ALL_ITEM_ICONS[item]??""} {qty} {item.replace(/_/g," ")}
            </span>
          ))}
        </div>
        {Object.entries(RECIPES).map(([name, recipe]) => {
          const craftable = canCraft(recipe, inventory ?? {});
          return (
            <div key={name} style={{
              display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
              borderRadius:10,
              background: craftable ? "rgba(200,230,120,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${craftable ? "rgba(200,230,120,0.22)" : "rgba(255,255,255,0.06)"}`,
              opacity: craftable ? 1 : 0.5,
            }}>
              <span style={{ fontSize:24, minWidth:32 }}>{REC_ICONS[name] ?? "📦"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color: craftable ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)", marginBottom:3 }}>
                  {REC_LABELS[name] ?? name}
                </div>
                <div style={{ fontSize:10, color:"rgba(245,230,200,0.3)", display:"flex", flexWrap:"wrap", gap:5 }}>
                  {Object.entries(recipe).map(([item, qty]) => {
                    const have = (inventory ?? {})[item] ?? 0;
                    return (
                      <span key={item} style={{ color: have >= qty ? "rgba(200,230,120,0.6)" : "rgba(255,100,80,0.7)" }}>
                        {ALL_ITEM_ICONS[item]??""} {item.replace(/_/g," ")} {have}/{qty}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button disabled={!craftable} onClick={() => handleCraft(name)} style={{
                padding:"8px 14px", borderRadius:8, cursor: craftable ? "pointer" : "default",
                border: `1px solid ${craftable ? "rgba(200,230,120,0.3)" : "rgba(255,255,255,0.06)"}`,
                background: craftable ? "rgba(200,230,120,0.1)" : "transparent",
                color: craftable ? "rgba(200,230,120,0.9)" : "rgba(255,255,255,0.2)",
                fontSize:11, fontFamily:"monospace",
              }}>craft</button>
              {/* If this recipe produces a placeable and you have one in inventory, show place button */}
              {PLACEABLES[name] && (inventory?.[name] ?? 0) > 0 && (
                <button onClick={() => onStartGhostPlace?.(name, PLACEABLES[name])} style={{
                  padding:"8px 12px", borderRadius:8, cursor:"pointer",
                  border:"1px solid rgba(180,230,255,0.3)",
                  background:"rgba(180,230,255,0.07)",
                  color:"rgba(180,230,255,0.9)",
                  fontSize:11, fontFamily:"monospace", marginLeft:4,
                }}>place →</button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Tab: Equipment ──────────────────────────────────────────────────────────
  function EquipmentTab() {
    const equippedItems = new Set(Object.values(equipment ?? {}).filter(Boolean));
    const equippableInInv = Object.keys(EQUIPPABLE).filter(name => (inventory?.[name] ?? 0) > 0);
    const stats = getEquipStats(equipment ?? {});
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Slots */}
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <p style={sectionLabel}>equipped</p>
          {["weapon","armor","accessory"].map(slot => {
            const equipped = equipment?.[slot];
            const info = equipped ? EQUIPPABLE[equipped] : null;
            return (
              <div key={slot} style={{
                display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                borderRadius:10,
                background: equipped ? "rgba(200,230,120,0.06)" : "rgba(255,255,255,0.02)",
                border:`1px solid ${equipped ? "rgba(200,230,120,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <span style={{ fontSize:22, minWidth:32, opacity: equipped ? 1 : 0.3 }}>
                  {info?.icon ?? { weapon:"🗡", armor:"🫥", accessory:"○" }[slot]}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"rgba(200,230,160,0.4)", marginBottom:2 }}>
                    { {weapon:"⚔️ Weapon", armor:"🛡 Armor", accessory:"✨ Accessory"}[slot] }
                  </div>
                  <div style={{ fontSize:13, color: equipped ? "rgba(200,230,120,0.9)" : "rgba(255,255,255,0.2)" }}>
                    {info?.label ?? "— empty —"}
                  </div>
                  {info && (
                    <div style={{ fontSize:10, color:"rgba(200,230,160,0.5)", marginTop:2 }}>
                      {Object.entries(info.stats).map(([k,v]) => `${k}: ${v}`).join("  ·  ")}
                    </div>
                  )}
                </div>
                {equipped && (
                  <button onClick={() => onEquipItem?.(equipped)} style={{
                    padding:"6px 10px", borderRadius:7,
                    border:"1px solid rgba(255,100,100,0.25)",
                    background:"rgba(255,100,100,0.06)",
                    color:"rgba(255,140,120,0.7)", fontSize:10,
                    fontFamily:"monospace", cursor:"pointer",
                  }}>unequip</button>
                )}
              </div>
            );
          })}
        </div>
        {/* Active bonuses */}
        <div style={{ padding:"10px 14px", borderRadius:10,
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ ...sectionLabel, marginBottom:8 }}>active bonuses</p>
          {Object.entries(stats).filter(([,v]) => v && v !== 0 && v !== false).length === 0 ? (
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.18)" }}>no bonuses active</p>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {stats.attackBonus > 0 && <StatPill label="ATK" value={`+${stats.attackBonus}`} />}
              {stats.defense > 0 && <StatPill label="DEF" value={`+${stats.defense}`} />}
              {stats.maxHpBonus > 0 && <StatPill label="HP" value={`+${stats.maxHpBonus}`} />}
              {stats.attackRange > 0 && <StatPill label="RANGE" value={`+${stats.attackRange}`} />}
              {stats.herbBonus > 0 && <StatPill label="HERB" value={`×${stats.herbBonus}`} />}
              {stats.stoneYield > 0 && <StatPill label="STONE" value={`×${stats.stoneYield}`} />}
              {stats.canFish && <StatPill label="CAN FISH" value="✓" color="rgba(100,180,255,0.8)" />}
            </div>
          )}
        </div>
        {/* Available to equip */}
        {equippableInInv.length > 0 && (
          <div>
            <p style={sectionLabel}>in chest — click to equip</p>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {equippableInInv.map(name => {
                const info = EQUIPPABLE[name];
                const isEq = equippedItems.has(name);
                return (
                  <div key={name} style={{
                    display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                    borderRadius:10, cursor:"pointer",
                    background: isEq ? "rgba(200,230,120,0.06)" : "rgba(255,255,255,0.02)",
                    border:`1px solid ${isEq ? "rgba(200,230,120,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }} onClick={() => onEquipItem?.(name)}>
                    <span style={{ fontSize:20, minWidth:30 }}>{info.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:"rgba(200,230,120,0.85)" }}>{info.label}</div>
                      <div style={{ fontSize:10, color:"rgba(200,230,160,0.4)" }}>
                        {info.slot} slot · {Object.entries(info.stats).map(([k,v])=>`${k}: ${v}`).join("  ")}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onEquipItem?.(name); }} style={{
                      padding:"7px 12px", borderRadius:8,
                      border:`1px solid ${isEq ? "rgba(255,100,100,0.25)" : "rgba(200,230,120,0.3)"}`,
                      background: isEq ? "rgba(255,100,100,0.06)" : "rgba(200,230,120,0.08)",
                      color: isEq ? "rgba(255,140,120,0.8)" : "rgba(200,230,120,0.9)",
                      fontSize:11, fontFamily:"monospace", cursor:"pointer",
                    }}>
                      {isEq ? "unequip" : "equip"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {equippableInInv.length === 0 && (
          <p style={{ fontSize:11, color:"rgba(245,230,200,0.2)", textAlign:"center" }}>
            craft items first — switch to the Crafting tab
          </p>
        )}
      </div>
    );
  }

  // ── Tab: Decor ──────────────────────────────────────────────────────────────
  function DecorTab() {
    const ITEM_IC = { wood:"🪵", stone:"🪨", sticks:"🪹", herbs:"🌿", leather:"🦴" };
    function handlePlace(id) {
      const info = PLACEABLES[id];
      if (!info) return;
      for (const [item, qty] of Object.entries(info.cost)) {
        if ((inventory?.[item] ?? 0) < qty) return;
      }
      // Close menu and enter ghost placement mode
      onStartGhostPlace?.(id, info);
    }
    function canAfford(cost) {
      for (const [item, qty] of Object.entries(cost)) {
        if ((inventory?.[item] ?? 0) < qty) return false;
      }
      return true;
    }
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <p style={sectionLabel}>decorations — tap place → to position before confirming</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {Object.entries(PLACEABLES).map(([id, info]) => {
            const affordable = canAfford(info.cost);
            return (
              <div key={id} style={{
                padding:"10px 12px", borderRadius:10, display:"flex", flexDirection:"column", gap:5,
                background: affordable ? "rgba(200,230,120,0.05)" : "rgba(255,255,255,0.02)",
                border:`1px solid ${affordable ? "rgba(200,230,120,0.18)" : "rgba(255,255,255,0.06)"}`,
                opacity: affordable ? 1 : 0.45,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:22 }}>{info.icon}</span>
                  <span style={{ fontSize:12, color: affordable ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)" }}>{info.label}</span>
                </div>
                <div style={{ fontSize:9, color:"rgba(245,230,200,0.3)", display:"flex", flexWrap:"wrap", gap:3 }}>
                  {Object.entries(info.cost).map(([item, qty]) => {
                    const have = (inventory?.[item] ?? 0);
                    return (
                      <span key={item} style={{ color: have >= qty ? "rgba(200,230,120,0.6)" : "rgba(255,100,80,0.6)" }}>
                        {ITEM_IC[item]??""}{have}/{qty}
                      </span>
                    );
                  })}
                </div>
                <button disabled={!affordable} onClick={() => handlePlace(id)} style={{
                  padding:"4px 8px", borderRadius:6, fontSize:10, fontFamily:"monospace",
                  cursor: affordable ? "pointer" : "default",
                  border:`1px solid ${affordable ? "rgba(200,230,120,0.25)" : "rgba(255,255,255,0.05)"}`,
                  background: affordable ? "rgba(200,230,120,0.08)" : "transparent",
                  color: affordable ? "rgba(200,230,120,0.9)" : "rgba(255,255,255,0.2)",
                }}>place →</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Tab: Character ──────────────────────────────────────────────────────────
  function CharacterTab() {
    const Swatch = ({ active, color, onClick, size=28 }) => (
      <button onClick={onClick} style={{
        width:size, height:size, borderRadius:"50%", cursor:"pointer",
        background: color, border:`2px solid ${active ? "#fff" : "rgba(255,255,255,0.1)"}`,
        boxShadow: active ? "0 0 0 2px rgba(200,230,120,0.6)" : "none",
        transition:"all 0.1s",
      }} />
    );
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Mini preview */}
        <div style={{ display:"flex", justifyContent:"center" }}>
          <div style={{ position:"relative", width:56, height:80 }}>
            <svg width="56" height="80" style={{ display:"block" }}>
              <ellipse cx="28" cy="72" rx="10" ry="4" fill="rgba(0,0,0,0.2)" />
              {(() => { const legCol = OUTFIT_COLORS.find(o=>o.id===ch.outfit)?.legs||"#3a6abf"; return (<><rect x="16" y="50" width="8" height="14" fill={legCol}/><rect x="26" y="50" width="8" height="14" fill={legCol}/></>); })()}
              {(() => { const bodyCol = OUTFIT_COLORS.find(o=>o.id===ch.outfit)?.body||"#5b8dd9"; return <rect x="14" y="32" width="22" height="20" fill={bodyCol}/>; })()}
              {(() => { const bodyCol = OUTFIT_COLORS.find(o=>o.id===ch.outfit)?.body||"#5b8dd9"; return (<><rect x="8" y="33" width="6" height="14" fill={bodyCol}/><rect x="36" y="33" width="6" height="14" fill={bodyCol}/></>); })()}
              {(() => { const skinCol = SKIN_TONES.find(s=>s.id===ch.skin)?.color||"#f5c5a3"; return <rect x="14" y="14" width="22" height="20" fill={skinCol}/>; })()}
              {(() => { const hairCol = HAIR_STYLES.find(h=>h.id===ch.hair)?.color||"#7a4f2a"; return <rect x="14" y="14" width="22" height="7" fill={hairCol}/>; })()}
              {(() => { const hc = HAT_STYLES.find(h=>h.id===ch.hat)?.color; if(!hc||ch.hat==="none") return null;
                if(ch.hat==="cap") return (<><rect x="12" y="6" width="26" height="10" fill={hc}/><rect x="10" y="3" width="30" height="5" fill={hc}/></>);
                if(ch.hat==="straw") return (<><rect x="16" y="4" width="18" height="14" fill={hc}/><ellipse cx="25" cy="18" rx="18" ry="6" fill={hc}/></>);
                if(ch.hat==="beanie") return <path d={`M14 14 Q14 4 25 4 Q36 4 36 14`} fill={hc}/>;
                return null;
              })()}
              <rect x="18" y="26" width="4" height="4" fill="#2a1a0a"/>
              <rect x="28" y="26" width="4" height="4" fill="#2a1a0a"/>
            </svg>
          </div>
        </div>
        <div>
          <p style={sectionLabel}>skin tone</p>
          <div style={{ display:"flex", gap:8 }}>
            {SKIN_TONES.map(s => <Swatch key={s.id} active={ch.skin===s.id} color={s.color} onClick={()=>setCh(c=>({...c,skin:s.id}))}/>)}
          </div>
        </div>
        <div>
          <p style={sectionLabel}>hair</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {HAIR_STYLES.map(h => (
              <button key={h.id} onClick={()=>setCh(c=>({...c,hair:h.id}))} style={{
                padding:"6px 10px", borderRadius:8, cursor:"pointer",
                background: ch.hair===h.id ? "rgba(200,230,120,0.1)" : "rgba(255,255,255,0.03)",
                border:`1px solid ${ch.hair===h.id ? "rgba(200,230,120,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: ch.hair===h.id ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)",
                fontFamily:"monospace", fontSize:11,
              }}>
                <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:h.color, marginRight:6 }}/>
                {h.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={sectionLabel}>outfit</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {OUTFIT_COLORS.map(o => <Swatch key={o.id} active={ch.outfit===o.id} color={o.body} onClick={()=>setCh(c=>({...c,outfit:o.id}))}/>)}
          </div>
        </div>
        <div>
          <p style={sectionLabel}>hat</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {HAT_STYLES.map(h => (
              <button key={h.id} onClick={()=>setCh(c=>({...c,hat:h.id}))} style={{
                padding:"6px 10px", borderRadius:8, cursor:"pointer",
                background: ch.hat===h.id ? "rgba(200,230,120,0.1)" : "rgba(255,255,255,0.03)",
                border:`1px solid ${ch.hat===h.id ? "rgba(200,230,120,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: ch.hat===h.id ? "rgba(200,230,120,0.9)" : "rgba(245,230,200,0.5)",
                fontFamily:"monospace", fontSize:11,
              }}>{h.label}</button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { onCharacterUpdate?.(ch); onClose(); }}
          style={{
            width:"100%", padding:"13px", borderRadius:10, cursor:"pointer",
            background:"rgba(200,230,120,0.1)", border:"1px solid rgba(200,230,120,0.3)",
            color:"rgba(200,230,120,0.9)", fontSize:13, fontFamily:"monospace",
          }}
        >save look →</button>
      </div>
    );
  }

  const sectionLabel = {
    fontSize:10, color:"rgba(245,230,200,0.3)",
    letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8,
  };

  const tabContent = {
    inventory: <InventoryTab />,
    crafting:  <CraftingTab />,
    equipment: <EquipmentTab />,
    decor:     <DecorTab />,
    character: <CharacterTab />,
  };

  // Prevent wheel events from ever escaping to the browser, but still
  // allow scrolling inside the content pane.
  //
  // Strategy:
  //   • overlay gets a non-passive preventDefault listener (catches anything that bubbles up)
  //   • content div gets a listener that calls stopPropagation() only when it can
  //     still scroll in that direction — so the overlay's block never fires mid-scroll.
  //   • When content hits its boundary the event bubbles to the overlay, which
  //     swallows it before the browser sees it.
  const overlayRef = React.useRef(null);
  const contentRef = React.useRef(null);
  React.useEffect(() => {
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    // Block everything at the overlay level
    const blockOverlay = (e) => e.preventDefault();
    overlay.addEventListener("wheel", blockOverlay, { passive: false });

    // Let the content scroll, but stop propagation only while scrollable
    const handleContent = (e) => {
      const atTop    = content.scrollTop <= 0;
      const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
      const scrollingUp   = e.deltaY < 0;
      const scrollingDown = e.deltaY > 0;
      if ((scrollingUp && !atTop) || (scrollingDown && !atBottom)) {
        // Content can scroll — stop the event from reaching the overlay blocker
        e.stopPropagation();
      }
      // At boundary: event bubbles to overlay, which calls preventDefault → no browser scroll
    };
    content.addEventListener("wheel", handleContent, { passive: true });

    return () => {
      overlay.removeEventListener("wheel", blockOverlay);
      content.removeEventListener("wheel", handleContent);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position:"absolute", inset:0,
        background:"rgba(4,12,4,0.86)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:20, backdropFilter:"blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:"#111a0b",
          border:"1px solid rgba(180,220,100,0.22)",
          borderRadius:18,
          width: 540,
          maxWidth:"97vw",
          maxHeight:"88vh",
          display:"flex",
          flexDirection:"column",
          fontFamily:"monospace",
          color:"#f5e6c8",
          overflow:"hidden",
          boxShadow:"0 24px 80px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 18px 0 18px",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          paddingBottom:0,
        }}>
          <div style={{ fontSize:11, color:"rgba(200,230,120,0.5)", letterSpacing:"0.2em", textTransform:"uppercase", paddingBottom:14 }}>
            🌿 hearthroot — menu
          </div>
          <button onClick={onClose} style={{
            background:"transparent", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:7, color:"rgba(255,255,255,0.3)", fontSize:12,
            fontFamily:"monospace", cursor:"pointer", padding:"3px 9px", marginBottom:14,
          }}>✕  esc</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display:"flex", overflowX:"auto",
          borderBottom:"1px solid rgba(255,255,255,0.07)",
          padding:"0 6px",
          scrollbarWidth:"none",
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
                flex:"0 0 auto",
                padding:"10px 14px",
                background:"transparent",
                border:"none",
                borderBottom:`2px solid ${active ? "rgba(200,230,120,0.8)" : "transparent"}`,
                color: active ? "rgba(200,230,120,0.95)" : "rgba(245,230,200,0.4)",
                fontSize:12, fontFamily:"monospace", cursor:"pointer",
                display:"flex", alignItems:"center", gap:6,
                transition:"color 0.12s",
                whiteSpace:"nowrap",
              }}>
                <span style={{ fontSize:14 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sticky hotbar — shown on inventory tab so you can always drop items */}
        {activeTab === "inventory" && <HotbarDropZone />}

        {/* Content */}
        <div ref={contentRef} style={{
          flex:1, overflowY:"auto", padding:"18px 20px",
          scrollbarWidth:"thin",
          scrollbarColor:"rgba(200,230,120,0.15) transparent",
        }}>
          {tabContent[activeTab]}
        </div>

        {/* Footer hint */}
        <div style={{
          padding:"8px 18px",
          borderTop:"1px solid rgba(255,255,255,0.05)",
          fontSize:9, color:"rgba(245,230,200,0.2)",
          textAlign:"center", letterSpacing:"0.08em",
        }}>
          Tab / Esc to close  ·  hotbar persists to every run
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomesteadView({ room, chestInventory, chestOpen, onStartRun, onJoinRun, onOpenChest, onCloseChest, onChestUpdate, equipment, onEquipItem, placedObjects: placedObjectsProp, onObjectsUpdate, character, onCharacterUpdate, hotbar, onHotbarChange }) {
  const canvasRef      = useRef(null);
  const rafRef         = useRef(null);
  const keysRef        = useRef({});
  const stateRef       = useRef(null);
  const tileMapRef     = useRef(buildTileMap());
  const objectsRef     = useRef(defaultObjects());
  const inventoryRef   = useRef(emptyInventory());
  const characterRef   = useRef(character);
  const equipmentRef   = useRef(equipment);
  const hotbarRef      = useRef(hotbar);
  const chestOpenRef   = useRef(chestOpen);
  const [inventory,    setInventory]    = useState(emptyInventory());
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [runJoinPrompt, setRunJoinPrompt] = useState(null); // { runType, seed } | null
  const [tabMenuOpen,    setTabMenuOpen]    = useState(false);
  const [activeTab,      setActiveTab]      = useState("inventory");
  // Ghost placement mode — { id, info, rotation } | null
  const [ghostPlacement, setGhostPlacement] = useState(null);
  const ghostRef = useRef(null); // mirrors ghostPlacement for canvas loop
  // Partner appearance (character + equipment) received via broadcast
  const partnerAppearanceRef = useRef({ character: null, equipment: null });

  // Sync external placed objects to local ref
  useEffect(() => {
    if (placedObjectsProp && placedObjectsProp.length > 0) {
      objectsRef.current = placedObjectsProp;
    }
  }, [placedObjectsProp]);

  // Sync prop → ref so the canvas HUD always shows current chest contents
  useEffect(() => {
    if (chestInventory) {
      inventoryRef.current = chestInventory;
      setInventory({ ...chestInventory });
    }
  }, [chestInventory]);

  useEffect(() => { characterRef.current = character; }, [character]);
  useEffect(() => { equipmentRef.current = equipment; }, [equipment]);
  useEffect(() => { hotbarRef.current = hotbar; }, [hotbar]);
  useEffect(() => { chestOpenRef.current = chestOpen; }, [chestOpen]);
  useEffect(() => { ghostRef.current = ghostPlacement; }, [ghostPlacement]);

  // ── Supabase handlers ──────────────────────────────────────────────────────
  const handlers = useRef({
    onPlayerMove: ({ x, y, facing }) => {
      if (stateRef.current) {
        stateRef.current.partnerX      = x;
        stateRef.current.partnerY      = y;
        stateRef.current.partnerFacing = facing;
        stateRef.current.partnerVisible = true;
      }
    },
    onPlayerReady: () => setPartnerOnline(true),
    onPlayerAppearance: ({ character: ch, equipment: eq }) => {
      partnerAppearanceRef.current = { character: ch, equipment: eq };
    },
    onChestUpdated: ({ inventory: inv }) => {
      inventoryRef.current = inv;
      setInventory({ ...inv });
    },
    onObjectPlaced:  ({ obj }) => { objectsRef.current = [...objectsRef.current, obj]; },
    onObjectRemoved: ({ id })  => { objectsRef.current = objectsRef.current.filter(o => o.id !== id); },
    onRunQueued: ({ runType, seed }) => {
      setRunJoinPrompt({ runType, seed });
    },
    onRunCancelled: () => {
      setRunJoinPrompt(null);
    },
  }).current;

  const { sendPlayerMove, sendPlayerReady, sendPlayerAppearance } = useHearthroom(room?.id ?? null, handlers);

  useEffect(() => { sendPlayerReady(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast appearance to partner whenever it changes
  useEffect(() => {
    sendPlayerAppearance(character, equipment, hotbar);
  }, [character, equipment, hotbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init ───────────────────────────────────────────────────────────────────
  function initState() {
    return {
      px: 8 * TILE, py: 9 * TILE,        // player world position (center-bottom)
      facing: "down",
      step: 0, stepTimer: 0,
      interactTarget: null,
      camX: 0, camY: 0,
      lastTime: performance.now(),
      lastBroadcast: 0,
      // Partner ghost
      partnerX: 0, partnerY: 0, partnerFacing: "down", partnerVisible: false,
    };
  }

  // ── Key handlers ──────────────────────────────────────────────────────────
  const onKeyDown = useCallback((e) => {
    keysRef.current[e.key] = true;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    if (e.key === "e" || e.key === "E") {
      const target = stateRef.current?.interactTarget;
      if (!target) return;
      if (target.type === OBJ.CHEST)  { setActiveTab("inventory"); setTabMenuOpen(true); }
      if (target.type === OBJ.BOARD)  onStartRun?.();
      if (target.type === "crafting_station") { setActiveTab("crafting"); setTabMenuOpen(true); }
    }
    if (e.key === "Tab") { e.preventDefault(); setTabMenuOpen(v => !v); }
    if (e.key === "c" || e.key === "C") setTabMenuOpen(v => !v);
    if (e.key === "Escape") { onCloseChest?.(); setTabMenuOpen(false); }
  }, [onOpenChest, onStartRun, onCloseChest]);

  const onKeyUp = useCallback((e) => { delete keysRef.current[e.key]; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    const onWheel = (e) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });

    stateRef.current = initState();

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state) return;

      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t = ts / 1000;

      // ── Input → movement ──────────────────────────────────────────────
      let dx = 0, dy = 0;
      if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
      if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; state.facing = "up"; }
      if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; state.facing = "down"; }
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      // Pseudo entity for moveEntity helper
      const ent = { x: state.px, y: state.py, w: PLAYER_W, h: PLAYER_H, speed: 120 };
      moveEntity(ent, dx, dy, dt, tileMapRef.current, objectsRef.current);
      state.px = ent.x;
      state.py = ent.y;

      // Step animation
      if (dx !== 0 || dy !== 0) {
        state.stepTimer += dt;
        if (state.stepTimer > 0.22) { state.stepTimer = 0; state.step = (state.step + 1) % 4; }
      } else { state.step = 0; state.stepTimer = 0; }

      // Interact target
      state.interactTarget = findInteractTarget(state.px, state.py, objectsRef.current);

      // Camera
      const cam = { x: state.camX, y: state.camY };
      updateCamera(cam, state.px, state.py, W, H);
      state.camX = cam.x; state.camY = cam.y;

      // Broadcast position ~20/s
      if (ts - state.lastBroadcast > 50) {
        sendPlayerMove(Math.round(state.px), Math.round(state.py), state.facing);
        state.lastBroadcast = ts;
      }

      // ── DRAW ─────────────────────────────────────────────────────────
      const camX = state.camX, camY = state.camY;
      const tileMap = tileMapRef.current;
      const objects = objectsRef.current;

      ctx.fillStyle = "#4a7a20"; ctx.fillRect(0, 0, W, H);

      // Tiles
      const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
      const c1 = Math.min(WORLD_COLS, c0 + Math.ceil(W / TILE) + 2);
      const r0 = Math.max(0, Math.floor(camY / TILE) - 1);
      const r1 = Math.min(WORLD_ROWS, r0 + Math.ceil(H / TILE) + 2);

      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          drawTile(ctx, r, c, c * TILE - camX, r * TILE - camY, tileMap[r][c]);
        }
      }

      // Painter's algorithm: draw objects + player sorted by y (bottom edge)
      // Separate decor (no depth sort needed) from solid objects
      const decor  = objects.filter(o => o.type === OBJ.FENCE_H || o.type === OBJ.FENCE_V || o.type === OBJ.FLOWERS || o.type === OBJ.SIGN);
      const solids = objects.filter(o => !decor.includes(o));

      decor.forEach(o => {
        const sx = o.tx * TILE - camX, sy = o.ty * TILE - camY;
        if (sx > W + TILE * 4 || sx < -TILE * 4 || sy > H + TILE * 4 || sy < -TILE * 4) return;
        drawObject(ctx, o, sx, sy, false);
      });

      // Collect drawables: objects + player (+ partner)
      const drawables = [];
      solids.forEach(o => {
        const sy = (o.ty + o.h) * TILE;
        drawables.push({ sortY: sy, draw: () => {
          const sx = o.tx * TILE - camX, sby = o.ty * TILE - camY;
          if (sx > W + TILE * 4 || sx < -TILE * 4 || sby > H + TILE * 4 || sby < -TILE * 4) return;
          drawObject(ctx, o, sx, sby, state.interactTarget?.id === o.id);
        }});
      });

      const playerScreenX = state.px - camX;
      const playerScreenY = state.py - camY;
      const localWeapon = equipmentRef.current?.weapon ?? null;
      drawables.push({ sortY: state.py, draw: () =>
        drawPlayer(ctx, playerScreenX, playerScreenY, state.facing, state.step, 0, t, characterRef.current, localWeapon)
      });

      // Partner ghost
      if (state.partnerVisible) {
        const gpx = state.partnerX - camX, gpy = state.partnerY - camY;
        const pa = partnerAppearanceRef.current;
        drawables.push({ sortY: state.partnerY, draw: () => {
          ctx.globalAlpha = 0.55;
          drawPlayer(ctx, gpx, gpy, state.partnerFacing, 0, 0, t, pa.character, pa.equipment?.weapon ?? null);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.font = "9px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("P2", gpx, gpy - 26);
        }});
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      // ── Ghost placement preview ───────────────────────────────────────
      const ghost = ghostRef.current;
      if (ghost) {
        const info = ghost.info;
        // Place ghost 2 tiles in front of player (or directly adjacent)
        const PLACE_DIST = 2;
        const facingMap = { down:[0,1], up:[0,-1], left:[-1,0], right:[1,0] };
        const [fdx, fdy] = facingMap[state.facing] ?? [0,1];
        const gtx = Math.floor(state.px / TILE) + fdx * PLACE_DIST + (ghost.rotation % 2 === 1 ? -Math.floor(info.h / 2) : -Math.floor(info.w / 2));
        const gty = Math.floor(state.py / TILE) + fdy * PLACE_DIST + (ghost.rotation % 2 === 1 ? -Math.floor(info.w / 2) : -Math.floor(info.h / 2));
        const gsx = gtx * TILE - camX;
        const gsy = gty * TILE - camY;
        // Determine effective w/h with rotation
        const gw = ghost.rotation % 2 === 0 ? info.w : info.h;
        const gh = ghost.rotation % 2 === 0 ? info.h : info.w;
        // Ghost tile highlight
        ctx.fillStyle = "rgba(200,230,120,0.18)";
        ctx.fillRect(gsx, gsy, gw * TILE, gh * TILE);
        ctx.strokeStyle = "rgba(200,230,120,0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(gsx + 1, gsy + 1, gw * TILE - 2, gh * TILE - 2);
        ctx.setLineDash([]);
        // Ghost emoji
        ctx.save();
        ctx.globalAlpha = 0.72;
        const gcx = gsx + (gw * TILE) / 2;
        const gcy = gsy + (gh * TILE) / 2;
        if (ghost.rotation !== 0) {
          ctx.translate(gcx, gcy);
          ctx.rotate((ghost.rotation * Math.PI) / 2);
          ctx.translate(-gcx, -gcy);
        }
        const fontSize = Math.max(gw, gh) * TILE * 0.65;
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(info.icon, gcx, gcy - 4);
        ctx.restore();
        // Store ghost tile pos for confirm handler
        ghostRef.current = { ...ghost, gtx, gty, gw, gh };
      }

      drawHUD(ctx, W, H, inventoryRef.current, state.interactTarget, t);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("wheel",   onWheel);
    };
  }, [room, onKeyDown, onKeyUp, sendPlayerMove]);

  return (
    <div style={{ width:"100%", height:"100svh", background:"#0d0d0a", position:"relative", overflow:"hidden", userSelect:"none" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
      />
      <PartnerWidget joinCode={room?.join_code ?? ""} partnerOnline={partnerOnline} />
      {runJoinPrompt && !chestOpen && !tabMenuOpen && (
        <RunJoinPrompt
          runType={runJoinPrompt.runType}
          onJoin={() => {
            setRunJoinPrompt(null);
            onJoinRun?.(runJoinPrompt.seed, runJoinPrompt.runType);
          }}
          onDecline={() => setRunJoinPrompt(null)}
        />
      )}
      {tabMenuOpen && (
        <TabMenu
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setTabMenuOpen(false)}
          inventory={chestInventory}
          equipment={equipment}
          onEquipItem={onEquipItem}
          hotbar={hotbar ?? []}
          onHotbarChange={onHotbarChange}
          onCraft={(newInv) => { onChestUpdate?.(newInv); }}
          character={character}
          onCharacterUpdate={onCharacterUpdate}
          onPlace={(id, info) => {
            const newInv = { ...chestInventory };
            for (const [item, qty] of Object.entries(info.cost)) {
              newInv[item] = (newInv[item] ?? 0) - qty;
            }
            onChestUpdate?.(newInv);
            const state = stateRef.current;
            const tx = state ? Math.floor(state.px / 32) + 1 : 12;
            const ty = state ? Math.floor(state.py / 32) + 1 : 12;
            const newObj = {
              id: `${id}_${Date.now()}`,
              type: id,
              tx, ty,
              w: info.w, h: info.h,
              solid: false,
              interact: false,
              label: info.label,
              isPlaceable: true,
            };
            const newObjects = [...objectsRef.current, newObj];
            objectsRef.current = newObjects;
            onObjectsUpdate?.(newObjects);
          }}
          onStartGhostPlace={(id, info) => {
            setTabMenuOpen(false);
            const ghost = { id, info, rotation: 0, gtx: 12, gty: 12, gw: info.w, gh: info.h };
            setGhostPlacement(ghost);
            ghostRef.current = ghost;
          }}
        />
      )}
      {/* Ghost placement overlay */}
      {ghostPlacement && (
        <div style={{
          position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)",
          display:"flex", alignItems:"center", gap:10, zIndex:20,
          background:"rgba(10,18,6,0.88)", border:"1px solid rgba(200,230,120,0.4)",
          borderRadius:14, padding:"10px 16px", fontFamily:"monospace",
          boxShadow:"0 4px 24px rgba(0,0,0,0.5)",
        }}>
          <span style={{ fontSize:20 }}>{ghostPlacement.info.icon}</span>
          <span style={{ fontSize:12, color:"rgba(200,230,120,0.8)" }}>{ghostPlacement.info.label}</span>
          <span style={{ fontSize:10, color:"rgba(245,230,200,0.3)", marginLeft:2 }}>move to position</span>
          <button
            onClick={() => {
              setGhostPlacement(g => {
                const next = { ...g, rotation: (g.rotation + 1) % 4 };
                ghostRef.current = next;
                return next;
              });
            }}
            style={{
              background:"rgba(200,230,120,0.08)", border:"1px solid rgba(200,230,120,0.25)",
              borderRadius:8, color:"rgba(200,230,120,0.9)", fontSize:14, fontFamily:"monospace",
              cursor:"pointer", padding:"4px 10px",
            }}
            title="rotate"
          >↻</button>
          <button
            onClick={() => {
              // Consume materials and place
              const g = ghostRef.current;
              if (!g) return;
              const newInv = { ...chestInventory };
              // If the item itself is in inventory (pre-crafted), consume it instead of raw materials
              if ((newInv[g.id] ?? 0) > 0) {
                newInv[g.id] = newInv[g.id] - 1;
              } else {
                for (const [item, qty] of Object.entries(g.info.cost)) {
                  newInv[item] = (newInv[item] ?? 0) - qty;
                }
              }
              onChestUpdate?.(newInv);
              const newObj = {
                id: `${g.id}_${Date.now()}`,
                type: g.id,
                tx: g.gtx, ty: g.gty,
                w: g.gw, h: g.gh,
                solid: g.info.solid ?? false,
                interact: g.info.interact ?? false,
                label: g.info.interact ? (g.info.interactLabel ?? `[E] ${g.info.label}`) : g.info.label,
                isPlaceable: true,
              };
              const newObjects = [...objectsRef.current, newObj];
              objectsRef.current = newObjects;
              onObjectsUpdate?.(newObjects);
              ghostRef.current = null;
              setGhostPlacement(null);
            }}
            style={{
              background:"rgba(200,230,120,0.14)", border:"1px solid rgba(200,230,120,0.5)",
              borderRadius:8, color:"rgba(200,230,120,1)", fontSize:12, fontFamily:"monospace",
              cursor:"pointer", padding:"5px 14px", fontWeight:"bold",
            }}
          >okay ✓</button>
          <button
            onClick={() => { ghostRef.current = null; setGhostPlacement(null); }}
            style={{
              background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:8, color:"rgba(255,255,255,0.35)", fontSize:11, fontFamily:"monospace",
              cursor:"pointer", padding:"4px 8px",
            }}
          >✕</button>
        </div>
      )}
      <HotbarBar
        hotbar={hotbar ?? []}
        equipment={equipment}
        onOpenMenu={(tab) => { setActiveTab(tab ?? "inventory"); setTabMenuOpen(true); }}
        onUseSlot={(idx) => {
          const slot = (hotbar ?? [])[idx];
          if (!slot) return;
          if (EQUIPPABLE[slot.item]) {
            onEquipItem?.(slot.item);
          } else if (HOTBAR_ITEMS[slot.item]) {
            const newInv = { ...chestInventory, [slot.item]: Math.max(0, (chestInventory?.[slot.item] ?? 1) - 1) };
            onChestUpdate?.(newInv);
            const newHotbar = [...(hotbar ?? [])];
            const newQty = (slot.qty ?? 1) - 1;
            newHotbar[idx] = newQty > 0 ? { ...slot, qty: newQty } : null;
            onHotbarChange?.(newHotbar);
          }
        }}
      />
    </div>
  );
}