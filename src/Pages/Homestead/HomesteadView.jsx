// src/Pages/Homestead/HomesteadView.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  TILE, WORLD_COLS, WORLD_ROWS, WORLD_PX_W, WORLD_PX_H,
  T, OBJ,
  buildTileMap, defaultObjects, tileNoise,
  moveEntity, updateCamera, findInteractTarget,
  PLAYER_W, PLAYER_H,
  emptyInventory,
  RECIPES, canCraft, craftItem,
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
}

// ─── Player drawing ───────────────────────────────────────────────────────────
function drawPlayer(ctx, px, py, facing, step, invincible, t) {
  const bobY  = (step === 1 || step === 3) ? -1 : 0;
  const legSw = (step === 1 || step === 3) ?  3 : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.fillStyle = "#3a6abf";
  ctx.fillRect(px - 6, py + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, py + 2, 5, 9 - legSw);

  // Body
  ctx.fillStyle = "#5b8dd9";
  ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);

  // Arms
  const armSw = (step === 1 || step === 3) ? 2 : 0;
  ctx.fillStyle = "#5b8dd9";
  ctx.fillRect(px - 10, py - 9 + bobY + armSw, 3, 8);
  ctx.fillRect(px + 7,  py - 9 + bobY - armSw, 3, 8);

  // Head
  if (!(invincible > 0 && Math.floor(t * 8) % 2 === 0)) {
    ctx.fillStyle = "#f5c5a3"; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
    ctx.fillStyle = "#7a4f2a"; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);
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
    `🪵${inv.wood ?? 0}  🪨${inv.stone ?? 0}  🌿${inv.herbs ?? 0}  🦴${inv.leather ?? 0}`,
    W - 14, 15
  );

  // Interact prompt
  if (interactTarget) {
    const msg   = interactTarget.label ?? "[E] Interact";
    ctx.font    = "bold 11px monospace";
    const mw    = ctx.measureText(msg).width + 28;
    const bx    = W / 2 - mw / 2, by = H - 58;
    ctx.fillStyle = "rgba(18,10,4,0.88)"; ctx.fillRect(bx, by, mw, 24);
    ctx.strokeStyle = "rgba(255,220,80,0.75)"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, mw, 24);
    ctx.fillStyle = "#f5e6b0"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(msg, W / 2, by + 12);
  }

  // Bottom hint bar
  ctx.fillStyle = "rgba(18,10,4,0.72)"; ctx.fillRect(0, H - 22, W, 22);
  ctx.fillStyle = "rgba(245,230,200,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD / arrows to move  ·  E to interact  ·  C to craft", W / 2, H - 11);
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
};

function ChestOverlay({ inventory, onClose }) {
  const entries = Object.entries(inventory ?? {}).filter(([, v]) => v > 0);
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

        {/* Items */}
        {entries.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(245,230,200,0.22)", padding: "16px 0" }}>
            chest is empty
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {entries.map(([item, qty]) => (
              <div key={item} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8, padding: "8px 12px",
              }}>
                <span style={{ fontSize: 18 }}>{ITEM_ICONS[item] ?? "📦"}</span>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(245,230,200,0.45)" }}>{item}</div>
                  <div style={{ fontSize: 16, color: "rgba(200,230,120,0.9)", fontWeight: 400 }}>{qty}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(245,230,200,0.2)", marginTop: 18 }}>
          [E] or click outside to close
        </p>
      </div>
    </div>
  );
}

// ─── Run Join Prompt overlay ─────────────────────────────────────────────────
function RunJoinPrompt({ runType, onJoin, onDecline }) {
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
            🌲 Forest Run
          </h2>
          <p style={{ fontSize: 12, color: "rgba(245,230,200,0.45)", marginTop: 8, lineHeight: 1.6 }}>
            Your partner just queued a forest run. Join them for a co-op run?
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
            {Object.entries(inventory ?? {}).filter(([,v]) => v > 0).map(([item, qty]) => (
              <span key={item} style={{
                fontSize: 11, padding: "4px 8px", borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(245,230,200,0.7)",
              }}>
                {ITEM_ICONS_CRAFT[item] ?? "📦"} {qty} {item}
              </span>
            ))}
            {Object.values(inventory ?? {}).every(v => !v) && (
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomesteadView({ room, chestInventory, chestOpen, onStartRun, onJoinRun, onOpenChest, onCloseChest, onChestUpdate }) {
  const canvasRef      = useRef(null);
  const rafRef         = useRef(null);
  const keysRef        = useRef({});
  const stateRef       = useRef(null);
  const tileMapRef     = useRef(buildTileMap());
  const objectsRef     = useRef(defaultObjects());
  const inventoryRef   = useRef(emptyInventory());
  const [inventory,    setInventory]    = useState(emptyInventory());
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [runJoinPrompt, setRunJoinPrompt] = useState(null); // { runType, seed } | null
  const [craftingOpen,  setCraftingOpen]  = useState(false);

  // Sync prop → ref so the canvas HUD always shows current chest contents
  useEffect(() => {
    if (chestInventory) {
      inventoryRef.current = chestInventory;
      setInventory({ ...chestInventory });
    }
  }, [chestInventory]);

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

  const { sendPlayerMove, sendPlayerReady } = useHearthroom(room?.id ?? null, handlers);

  useEffect(() => { sendPlayerReady(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (target.type === OBJ.CHEST)  onOpenChest?.();
      if (target.type === OBJ.BOARD)  onStartRun?.();
    }
    if (e.key === "c" || e.key === "C") setCraftingOpen(v => !v);
    if (e.key === "Escape") { onCloseChest?.(); setCraftingOpen(false); }
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
      drawables.push({ sortY: state.py, draw: () =>
        drawPlayer(ctx, playerScreenX, playerScreenY, state.facing, state.step, 0, t)
      });

      // Partner ghost
      if (state.partnerVisible) {
        const gpx = state.partnerX - camX, gpy = state.partnerY - camY;
        drawables.push({ sortY: state.partnerY, draw: () => {
          ctx.globalAlpha = 0.55;
          drawPlayer(ctx, gpx, gpy, state.partnerFacing, 0, 0, t);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.font = "9px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("P2", gpx, gpy - 26);
        }});
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      drawHUD(ctx, W, H, inventoryRef.current, state.interactTarget, t);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, [room, onKeyDown, onKeyUp, sendPlayerMove]);

  return (
    <div style={{ width:"100%", height:"100svh", background:"#0d0d0a", position:"relative", overflow:"hidden", userSelect:"none" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
      />
      <PartnerWidget joinCode={room?.join_code ?? ""} partnerOnline={partnerOnline} />
      {chestOpen && (
        <ChestOverlay inventory={chestInventory} onClose={onCloseChest} />
      )}
      {runJoinPrompt && !chestOpen && !craftingOpen && (
        <RunJoinPrompt
          runType={runJoinPrompt.runType}
          onJoin={() => {
            setRunJoinPrompt(null);
            onJoinRun?.(runJoinPrompt.seed);
          }}
          onDecline={() => setRunJoinPrompt(null)}
        />
      )}
      {craftingOpen && (
        <CraftingOverlay
          inventory={chestInventory}
          onCraft={(newInv) => {
            onChestUpdate?.(newInv);
          }}
          onClose={() => setCraftingOpen(false)}
        />
      )}
    </div>
  );
}