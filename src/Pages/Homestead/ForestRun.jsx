// src/Pages/Homestead/ForestRun.jsx
// Redesigned: the run uses the SAME inventory + hotbar + Tab menu as Homestead.
//
// Pickups go directly into the player's real (slot-capped) inventory via
// onPlayerInventoryUpdate.  If the bag is full, the pickup stays on the
// ground and a "bag full" toast plays — the player must drop something
// (or use it) to make room.  Tab opens the inventory menu, identical in
// look and feel to Homestead's.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  FOREST_W, FOREST_H,
  WOLF_R, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_CD, ENEMY_DAMAGE,
  generateForestRun, updateForestEnemies,
  playerAttack, seededRand,
} from "./gameEngine";
import {
  ITEMS, ITEM_ICONS,
  EQUIPPABLE, HOTBAR_ITEMS, PLACEABLES, UPGRADES,
  RECIPES,
  rollLoot, getEquipStats,
  HOTBAR_SIZE,
  INVENTORY_BASE_SLOTS,
  HOTBAR_BASE_SLOTS,
  canCraft, craftItem,
  addToPlayerInventory, spendFromPlayerInventory,
  applyUpgrade,
  normalizeChest, chestToMap,
  getWeaponDurability, drainWeaponDurability, TOOL_MAX_DURABILITY,
} from "./Items";

const PLAYER_SPEED   = 130;
const PLAYER_HP      = 5;
const INVINCIBLE_S   = 1.2;
const RUN_DURATION   = 180; // 3 minutes max
const MOVE_THROTTLE  = 50;  // ms between position broadcasts
const PICKUP_R       = 18;
const LOOT_FLOAT_DUR = 1.4; // seconds loot numbers float
const TOAST_DUR      = 1.8;

// Tiny sound engine (same pattern as InkRun)
function makeSounds() {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const beep = (type, f0, f1, dur, vol) => {
    try {
      const ac = getCtx(), osc = ac.createOscillator(), g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(f0, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch {}
  };
  return {
    unlock: () => { try { getCtx(); } catch {} },
    hit:    () => beep("sawtooth", 180, 40,  0.25, 0.18),
    swing:  () => beep("sine",     400, 200, 0.08, 0.10),
    pickup: () => beep("sine",     600, 900, 0.10, 0.08),
    hurt:   () => beep("sawtooth", 220, 60,  0.30, 0.22),
    drop:   () => beep("sine",     300, 180, 0.10, 0.07),
    deny:   () => beep("square",   220, 180, 0.10, 0.06),
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawForestBackground(ctx, camX, W, H, t) {
  ctx.fillStyle = "#1a2a14"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2d4a1e"; ctx.fillRect(0, 0, W, H);

  for (let row = 0; row < Math.ceil(H / 32) + 1; row++) {
    for (let col = 0; col < Math.ceil(W / 32) + 1; col++) {
      const wx = col * 32 + (Math.floor(camX / 32) * 32) - camX;
      const wy = row * 32;
      const wc = Math.floor((col * 32 + Math.floor(camX / 32) * 32) / 32);
      const wr = row;
      const n = ((wc * 997 + wr * 31 + 42) & 0x7fffffff) / 0x7fffffff;
      if (n > 0.6) {
        ctx.fillStyle = n > 0.8 ? "#3a5c28" : "#284018";
        ctx.fillRect(wx, wy, 32, 32);
      }
    }
  }

  ctx.fillStyle = "#1a3010";
  const treeParallax = camX * 0.3;
  for (let i = 0; i < 40; i++) {
    const tx = ((i * 180 - treeParallax) % (W + 200)) - 60;
    ctx.beginPath(); ctx.arc(tx, -10, 38, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 30, -6, 28, 0, Math.PI); ctx.fill();
  }

  const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,10,0,0.55)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawForestTree(ctx, tree, camX, t) {
  const sx = tree.x - camX;
  const sy = tree.y;
  if (sx < -60 || sx > 9999) return;

  const shake = tree.hitFlash > 0 ? Math.sin(t * 40) * 3 * tree.hitFlash : 0;

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(sx + shake + 4, sy + 22, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = tree.alive ? "#5a3a18" : "#3a2a0a";
  ctx.fillRect(sx + shake - 7, sy - 10, 14, 32);

  if (!tree.alive) {
    ctx.fillStyle = "#4a2e14";
    ctx.fillRect(sx - 10, sy - 10, 20, 12);
    return;
  }

  const col = tree.hitFlash > 0 ? "#ffffff" : "#2d7a2d";
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(sx + shake, sy - 24, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = tree.hitFlash > 0 ? "#ddffdd" : "#338a33";
  ctx.beginPath(); ctx.arc(sx + shake - 8, sy - 36, 18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + shake + 10, sy - 30, 16, 0, Math.PI * 2); ctx.fill();

  if (tree.hp < tree.maxHp) {
    const bw = 40, bh = 5;
    const bx = sx - bw / 2, by = sy - 56;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#5cb85c"; ctx.fillRect(bx, by, bw * (tree.hp / tree.maxHp), bh);
  }
}

function drawStoneDeposit(ctx, dep, camX, t) {
  const sx = dep.x - camX;
  const sy = dep.y;
  if (sx < -60 || sx > 9999) return;

  const shake = dep.hitFlash > 0 ? Math.sin(t * 40) * 2.5 * dep.hitFlash : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(sx + shake + 3, sy + 16, 20, 6, 0, 0, Math.PI * 2); ctx.fill();

  // Main rock body
  const baseCol = dep.hitFlash > 0 ? "#ffffff" : "#7a7060";
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.moveTo(sx + shake - 18, sy + 12);
  ctx.lineTo(sx + shake - 12, sy - 10);
  ctx.lineTo(sx + shake + 2,  sy - 16);
  ctx.lineTo(sx + shake + 18, sy - 6);
  ctx.lineTo(sx + shake + 16, sy + 12);
  ctx.closePath();
  ctx.fill();

  // Secondary boulder chunk
  ctx.fillStyle = dep.hitFlash > 0 ? "#dddddd" : "#908070";
  ctx.beginPath();
  ctx.moveTo(sx + shake + 8,  sy + 12);
  ctx.lineTo(sx + shake + 10, sy - 4);
  ctx.lineTo(sx + shake + 20, sy + 2);
  ctx.lineTo(sx + shake + 20, sy + 12);
  ctx.closePath();
  ctx.fill();

  // Highlight streak
  ctx.fillStyle = dep.hitFlash > 0 ? "#ffffff" : "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(sx + shake - 6, sy - 12);
  ctx.lineTo(sx + shake + 4, sy - 14);
  ctx.lineTo(sx + shake + 2, sy - 6);
  ctx.lineTo(sx + shake - 8, sy - 4);
  ctx.closePath();
  ctx.fill();

  // Cracks as HP drops
  if (dep.hp < dep.maxHp) {
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 1.5;
    const crackPts = [
      [[sx+shake-4, sy-2], [sx+shake+2, sy+8]],
      [[sx+shake+6, sy-6], [sx+shake-2, sy+4]],
    ];
    for (let i = 0; i < dep.maxHp - dep.hp && i < crackPts.length; i++) {
      ctx.beginPath();
      ctx.moveTo(...crackPts[i][0]);
      ctx.lineTo(...crackPts[i][1]);
      ctx.stroke();
    }
  }

  // HP bar
  if (dep.hp < dep.maxHp) {
    const bw = 40, bh = 5;
    const bx = sx - bw / 2, by = sy - 26;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#a0a0c0"; ctx.fillRect(bx, by, bw * (dep.hp / dep.maxHp), bh);
  }

  // Pickaxe icon hint on undamaged deposit
  if (dep.hp === dep.maxHp) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + dep.x);
    ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("⛏️", sx + shake, sy - 20);
    ctx.restore();
  }
}

function drawPickup(ctx, pickup, camX, t) {
  const sx = pickup.x - camX, sy = pickup.y;
  const pulse = 0.7 + 0.3 * Math.sin(t * 3 + pickup.x);
  ctx.save(); ctx.globalAlpha = pulse;
  ctx.fillStyle = "#f5e6a0";
  ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c4a240"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#8b6020";
  ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Dropped items rendered as their actual item icon on the ground
function drawDroppedItem(ctx, drop, camX, t) {
  const sx = drop.x - camX, sy = drop.y;
  const bob = Math.sin(t * 2.5 + drop.born * 0.001) * 2;
  ctx.save();
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(sx, sy + 6, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Soft glow
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#f5e6a0";
  ctx.beginPath(); ctx.arc(sx, sy + bob - 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Icon
  ctx.font = "16px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(ITEM_ICONS[drop.item] ?? "📦", sx, sy + bob - 2);
  // Qty
  if (drop.qty > 1) {
    ctx.fillStyle = "rgba(245,230,160,0.95)";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`×${drop.qty}`, sx + 8, sy + bob + 8);
  }
  ctx.restore();
}

function drawEnemy(ctx, e, camX, t) {
  const sx = e.x - camX, sy = e.y;
  const pulse = 0.75 + 0.25 * Math.sin(t * 3 + e.x * 0.05);
  ctx.save(); ctx.globalAlpha = e.hitFlash > 0 ? 1 : pulse;

  if (e.type === "wolf") {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(sx, sy + WOLF_R - 2, WOLF_R * 0.7, WOLF_R * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#9a8060";
    ctx.beginPath(); ctx.ellipse(sx, sy, WOLF_R, WOLF_R * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#8a7050";
    ctx.beginPath(); ctx.arc(sx + e.dir * WOLF_R * 0.7, sy - WOLF_R * 0.2, WOLF_R * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? "#ffdddd" : "#c0906a";
    const ex = sx + e.dir * WOLF_R * 0.7;
    ctx.beginPath(); ctx.moveTo(ex + e.dir * 4, sy - WOLF_R * 0.7); ctx.lineTo(ex + e.dir * 9, sy - WOLF_R * 1.2); ctx.lineTo(ex - e.dir * 1, sy - WOLF_R * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#cc4400";
    ctx.beginPath(); ctx.arc(ex + e.dir * 4, sy - WOLF_R * 0.3, 3, 0, Math.PI * 2); ctx.fill();
    const bw = WOLF_R * 2.4, bh = 4, bx = sx - bw / 2, by = sy - WOLF_R - 12;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.hp <= 1 ? "#e24b4a" : "#5cb85c";
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
  }

  if (e.type === "spider") {
    const r = WOLF_R + 2;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(sx, sy + r - 2, r * 0.7, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.hitFlash > 0 ? "#ffffff" : "#4a2860";
    ctx.lineWidth = 2;
    const legAngles = [-0.3, 0.1, 0.5, 0.9];
    for (const side of [-1, 1]) {
      for (const la of legAngles) {
        const angle = side * (Math.PI * 0.5 + la);
        const kx = sx + Math.cos(angle) * r * 0.7, ky = sy + Math.sin(angle) * r * 0.5;
        const fx = sx + Math.cos(angle) * r * 1.6, fy = sy + Math.sin(angle) * r * 1.2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(kx, ky + Math.sin(t * 6 + la) * 4, fx, fy); ctx.stroke();
      }
    }
    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#6a3890";
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? "#ffddff" : "#4a1860";
    ctx.beginPath(); ctx.arc(sx, sy - 4, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff4040";
    for (let ei = 0; ei < 4; ei++) {
      ctx.beginPath(); ctx.arc(sx - 6 + ei * 4, sy - 6, 2, 0, Math.PI * 2); ctx.fill();
    }
    const bw = r * 2.4, bh = 4, bx = sx - bw / 2, by = sy - r - 14;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.hp <= 2 ? "#e24b4a" : "#9b59b6";
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
  }

  ctx.restore();
}

function drawPlayer(ctx, px, py, facing, step, invincible, attackFlash, t, character, weapon) {
  const blink = invincible > 0 && Math.floor(t * 8) % 2 === 0;
  if (blink) return;

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

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, py + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, py + 2, 5, 9 - legSw);

  ctx.fillStyle = attackFlash > 0 ? "#88ccff" : bodyCol;
  ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);

  const armSw = attackFlash > 0 ? 6 : (step === 1 || step === 3) ? 2 : 0;
  ctx.fillStyle = attackFlash > 0 ? "#88ccff" : bodyCol;
  if (facing === "right") {
    ctx.fillRect(px + 7,  py - 14 + bobY + armSw, 10, 4);
    ctx.fillRect(px - 10, py - 9  + bobY - armSw, 3, 8);
  } else if (facing === "left") {
    ctx.fillRect(px - 17, py - 14 + bobY + armSw, 10, 4);
    ctx.fillRect(px + 7,  py - 9  + bobY - armSw, 3, 8);
  } else {
    ctx.fillRect(px - 10, py - 9  + bobY + armSw, 3, 8);
    ctx.fillRect(px + 7,  py - 9  + bobY - armSw, 3, 8);
  }

  ctx.fillStyle = skinCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);

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
  } else if (facing === "left") {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px - 5, py - 16 + bobY, 3, 3);
  } else if (facing === "right") {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px + 2, py - 16 + bobY, 3, 3);
  }

  const WEAPON_ICONS = { axe:"🪓", pickaxe:"⛏️", fishing_rod:"🎣" };
  if (weapon && WEAPON_ICONS[weapon]) {
    const handX = facing === "left" ? px - 16 : px + 16;
    const handY = py - 8 + bobY + (attackFlash > 0 ? -4 : 0);
    ctx.font = "14px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(WEAPON_ICONS[weapon], handX, handY);
  } else if (attackFlash > 0) {
    const fx = facing === "right" ? px + 18 : facing === "left" ? px - 18 : px;
    const fy = py - 12 + bobY;
    ctx.fillStyle = skinCol;
    ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHUD(ctx, W, H, state, playerItems, t, slotsUsed, slotsTotal, weaponDurability) {
  ctx.fillStyle = "rgba(10,18,6,0.92)"; ctx.fillRect(0, 0, W, 32);

  const maxHp = state.maxHp ?? PLAYER_HP;
  for (let i = 0; i < maxHp; i++) {
    ctx.beginPath(); ctx.arc(16 + i * 22, 16, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < state.hp ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.12)";
    ctx.fill();
  }

  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#c8e890";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);

  // Bag indicator (top-right) — same idea as homestead
  ctx.textAlign = "right";
  const full = slotsUsed >= slotsTotal;
  ctx.fillStyle = full ? "rgba(255,120,80,0.95)" : "rgba(200,230,120,0.85)";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`🎒 ${slotsUsed}/${slotsTotal}`, W - 14, 16);

  // Weapon durability bar (bottom-left, above kill counter)
  if (weaponDurability) {
    const [cur, max] = weaponDurability;
    const pct = cur / max;
    const bw = 60, bh = 5, bx = 16, by = H - 44;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    const barCol = pct > 0.5 ? "#80d860" : pct > 0.25 ? "#e8c840" : "#e04840";
    ctx.fillStyle = barCol; ctx.fillRect(bx, by, Math.round(bw * pct), bh);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(200,230,160,0.55)";
    ctx.font = "8px monospace"; ctx.textBaseline = "middle";
    ctx.fillText(`⚒ ${cur}/${max}`, bx + bw + 5, by + 2);
  }

  // Kill counter
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,180,80,0.8)"; ctx.font = "11px monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${state.kills} kills`, 16, H - 14);

  ctx.fillStyle = "rgba(18,10,4,0.7)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(245,230,200,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD move  ·  click/space attack  ·  [Tab] menu  ·  [Esc] return home", W / 2, H - 13);

  if (state.attackFlash > 0) {
    const faceAngle = { right:0, left:Math.PI, down:Math.PI/2, up:-Math.PI/2 }[state.facing] ?? 0;
    const px = state.px - state.camX, py = state.py - state.camY;
    ctx.save();
    ctx.globalAlpha = state.attackFlash * 0.25;
    ctx.fillStyle = "#88ccff";
    ctx.beginPath();
    ctx.moveTo(px, py - 8);
    ctx.arc(px, py - 8, 38, faceAngle - Math.PI * 0.375, faceAngle + Math.PI * 0.375);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ─── Hotbar (matches Homestead's HotbarBar) ───────────────────────────────────
function HotbarBar({ hotbar, hotbarSlots, equipment, selectedIdx, onSelectIdx, onOpenMenu, onUseSlot }) {
  const visible = Math.min(hotbarSlots ?? HOTBAR_BASE_SLOTS, HOTBAR_SIZE);
  return (
    <div style={{ position:"absolute", bottom:36, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:3, zIndex:5, pointerEvents:"auto" }}>
      {Array.from({ length: visible }).map((_, idx) => {
        const slot = (hotbar ?? [])[idx];
        const isEquipped = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot] === slot?.item;
        const isSelected = idx === selectedIdx;
        const icon = slot ? (ITEM_ICONS[slot.item] ?? "📦") : null;
        const category = slot ? ITEMS[slot.item]?.category : null;
        let borderColor = "rgba(255,255,255,0.1)";
        if (isSelected)  borderColor = "rgba(255,220,60,0.85)";
        else if (isEquipped) borderColor = "rgba(100,200,255,0.6)";
        else if (slot)   borderColor = "rgba(200,230,120,0.35)";
        return (
          <div key={idx} onClick={() => { if (slot) { onSelectIdx?.(idx); onUseSlot?.(idx); } else onOpenMenu?.("inventory"); }}
            style={{ width:44, height:52, borderRadius:8, cursor:"pointer",
              background: slot ? "rgba(10,18,6,0.92)" : "rgba(10,18,6,0.55)",
              border: `2px solid ${borderColor}`,
              boxShadow: isSelected ? "0 0 10px rgba(255,210,40,0.35), inset 0 0 6px rgba(255,210,40,0.08)" : "none",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", gap:1,
              transform: isSelected ? "translateY(-3px)" : "none",
              transition: "transform 0.1s, box-shadow 0.1s, border-color 0.1s",
            }}>
            {isSelected && slot && (
              <div style={{ position:"absolute", top:-16, left:"50%", transform:"translateX(-50%)", fontSize:8, color:"rgba(255,220,60,0.8)", whiteSpace:"nowrap", fontFamily:"monospace", letterSpacing:"0.06em", pointerEvents:"none" }}>
                {category==="food"?"🍴 eat":category==="tool"||EQUIPPABLE[slot.item]?"⚡ use":category==="placeable"?"🏗 place":""}
              </div>
            )}
            {slot ? (
              <>
                <span style={{ fontSize:18, lineHeight:1 }}>{icon}</span>
                <span style={{ fontSize:8, color:"rgba(200,230,120,0.65)", lineHeight:1, fontFamily:"monospace", maxWidth:40, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {ITEMS[slot.item]?.label?.toLowerCase().slice(0,6) ?? slot.item}
                </span>
                {slot.qty != null && <span style={{ fontSize:9, color:"rgba(200,230,120,0.8)", lineHeight:1, marginTop:1 }}>{slot.qty}</span>}
                {isEquipped && <div style={{ position:"absolute", top:2, right:2, width:6, height:6, borderRadius:"50%", background:"rgba(100,200,255,0.95)" }} />}
              </>
            ) : (
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.12)", fontFamily:"monospace" }}>{idx+1}</span>
            )}
          </div>
        );
      })}
      <div onClick={() => onOpenMenu?.("inventory")} style={{ marginLeft:8, width:36, height:36, borderRadius:8, cursor:"pointer", background:"rgba(10,18,6,0.7)", border:"1px solid rgba(200,230,120,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(200,230,120,0.5)", fontSize:10, fontFamily:"monospace" }} title="Open menu (Tab)">⊞</div>
    </div>
  );
}

// ─── Run Tab Menu ─────────────────────────────────────────────────────────────
// Same visual structure as HomesteadView's TabMenu, with run-appropriate tabs:
//   My Bag        — drop items (or quick-deposit to chest is unavailable in forest)
//   Chest         — read-only view of what's at home
//   Crafting      — hand-craft only (no station in the forest)
//   Equipment     — switch gear mid-run
//
// While this menu is open, the game loop pauses.

const RUN_TABS = [
  { id:"inventory", label:"My Bag",    icon:"🎒" },
  { id:"chest",     label:"Chest",     icon:"📦" },
  { id:"crafting",  label:"Crafting",  icon:"🔨" },
  { id:"equipment", label:"Equipment", icon:"⚔️" },
];

function StatPill({ label, value, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 9px", borderRadius:6, background:"rgba(200,230,120,0.06)", border:"1px solid rgba(200,230,120,0.15)" }}>
      <span style={{ fontSize:9, color:"rgba(200,230,160,0.45)", letterSpacing:"0.1em" }}>{label}</span>
      <span style={{ fontSize:12, color:color??"rgba(200,230,120,0.9)" }}>{value}</span>
    </div>
  );
}

function RunTabMenu({
  activeTab, onTabChange, onClose,
  playerInventory, onPlayerInventoryUpdate,
  hotbarSlots, onHotbarSlotsUpdate,
  chest,
  equipment, onEquipItem,
  hotbar, onHotbarChange,
  onDropItem, // (itemId, qty) — drops to the ground at the player's feet
}) {
  const [craftMsg, setCraftMsg]     = useState(null);
  const [dragOverSlot, setDragOver] = useState(null);
  const [chestTab, setChestTab]     = useState("resources");
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  const playerItems = playerInventory?.items ?? {};
  const hotbarItemIds = new Set((hotbar ?? []).filter(Boolean).map(s => s.item));
  const usedSlotsCount = Object.entries(playerItems).filter(([k, v]) => v > 0 && !hotbarItemIds.has(k)).length;
  const totalSlots = playerInventory?.slots ?? INVENTORY_BASE_SLOTS;

  // Block spacebar scroll while menu open
  useEffect(() => {
    const block = (e) => { if (e.key===" "||e.code==="Space") e.preventDefault(); };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  // Confine wheel events so the world behind doesn't scroll
  useEffect(() => {
    const overlay = overlayRef.current, content = contentRef.current;
    if (!overlay || !content) return;
    const blockOverlay = (e) => e.preventDefault();
    overlay.addEventListener("wheel", blockOverlay, { passive:false });
    const handleContent = (e) => {
      const atTop = content.scrollTop <= 0;
      const atBottom = content.scrollTop+content.clientHeight >= content.scrollHeight-1;
      if ((e.deltaY < 0 && !atTop)||(e.deltaY > 0 && !atBottom)) e.stopPropagation();
    };
    content.addEventListener("wheel", handleContent, { passive:true });
    return () => { overlay.removeEventListener("wheel", blockOverlay); content.removeEventListener("wheel", handleContent); };
  }, []);

  function assignToHotbarSlot(itemId, slotIdx) {
    const qty = (playerItems[itemId] ?? 0) > 0 ? playerItems[itemId] : undefined;
    const newHotbar = [...(hotbar ?? [])];
    const displaced = newHotbar[slotIdx];
    newHotbar[slotIdx] = qty != null ? { item:itemId, qty } : { item:itemId };
    // Move item out of inventory
    const newItems = { ...(playerInventory?.items ?? {}) };
    if (newItems[itemId] > 0) delete newItems[itemId];
    // Return displaced item to inventory (if it was a different item)
    if (displaced?.item && displaced.item !== itemId) {
      newItems[displaced.item] = (newItems[displaced.item] ?? 0) + (displaced.qty ?? 1);
    }
    onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
    onHotbarChange?.(newHotbar);
  }

  // ── Hotbar drop zone (shown in My Bag tab) ──────────────────────────────────
  function HotbarDropZone() {
    const visible = Math.min(hotbarSlots ?? HOTBAR_BASE_SLOTS, HOTBAR_SIZE);
    return (
      <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"#0f1709" }}>
        <p style={{ fontSize:9, color:"rgba(245,230,200,0.22)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:7 }}>hotbar — drag any item onto a slot</p>
        <div style={{ display:"flex", gap:5 }}>
          {Array.from({ length: visible }).map((_, idx) => {
            const slot = (hotbar ?? [])[idx];
            const isOver = dragOverSlot===idx;
            const isEq = slot && equipment?.[EQUIPPABLE[slot?.item]?.slot]===slot?.item;
            return (
              <div key={idx}
                onDrop={e=>{e.preventDefault();const n=e.dataTransfer.getData("hotbar_item");if(n)assignToHotbarSlot(n,idx);setDragOver(null);}}
                onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";setDragOver(idx);}}
                onDragLeave={()=>setDragOver(null)}
                style={{ width:50, height:54, borderRadius:9, background:isOver?"rgba(200,230,120,0.18)":slot?"rgba(10,18,6,0.7)":"rgba(255,255,255,0.03)", border:`2px solid ${isOver?"rgba(200,230,120,0.9)":isEq?"rgba(100,200,255,0.5)":slot?"rgba(200,230,120,0.3)":"rgba(255,255,255,0.1)"}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, position:"relative", transition:"all 0.1s" }}>
                {slot ? (
                  <>
                    <span style={{ fontSize:18 }}>{ITEM_ICONS[slot.item]??"📦"}</span>
                    <span style={{ fontSize:8, color:"rgba(200,230,120,0.6)", lineHeight:1, fontFamily:"monospace", maxWidth:46, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ITEMS[slot.item]?.label?.toLowerCase()?.slice(0,6)??slot.item}</span>
                    {slot.qty!=null&&<span style={{ fontSize:9, color:"rgba(200,230,120,0.7)" }}>{slot.qty}</span>}
                    {isEq&&<div style={{ position:"absolute", top:3, right:3, width:6, height:6, borderRadius:"50%", background:"rgba(100,200,255,0.9)" }}/>}
                    <button onClick={()=>{const n=[...(hotbar??[])];const s=n[idx];n[idx]=null;onHotbarChange?.(n);if(s?.item){const ni={...(playerInventory?.items??{}),[s.item]:(playerInventory?.items?.[s.item]??0)+(s.qty??1)};onPlayerInventoryUpdate?.({...playerInventory,items:ni})}}} style={{ position:"absolute", top:-5, right:-5, width:15, height:15, borderRadius:"50%", background:"rgba(255,80,80,0.8)", border:"none", color:"#fff", fontSize:9, cursor:"pointer", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  </>
                ) : (
                  <span style={{ fontSize:isOver?18:11, color:isOver?"rgba(200,230,120,0.7)":"rgba(255,255,255,0.12)", fontFamily:"monospace" }}>{isOver?"+":idx+1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Helper: remove `qty` of itemId from the player inventory.
  function removeFromBag(itemId, qty) {
    const items = { ...(playerInventory?.items ?? {}) };
    const have = items[itemId] ?? 0;
    const removed = Math.min(have, qty);
    if (removed <= 0) return null;
    items[itemId] = have - removed;
    if (items[itemId] <= 0) delete items[itemId];
    onPlayerInventoryUpdate?.({ ...playerInventory, items });
    return removed;
  }

  function dropFromBag(itemId, qty) {
    const removed = removeFromBag(itemId, qty);
    if (removed > 0) onDropItem?.(itemId, removed);
  }

  // ── Tab: My Bag ─────────────────────────────────────────────────────────────
  function InventoryTab() {
    const allItems = Object.entries(playerItems).filter(([,v])=>v>0);
    const resources   = allItems.filter(([k])=>!EQUIPPABLE[k]&&!HOTBAR_ITEMS[k]&&!PLACEABLES[k]&&!UPGRADES[k]);
    const consumables = allItems.filter(([k])=>!!HOTBAR_ITEMS[k]);
    const gear        = allItems.filter(([k])=>!!EQUIPPABLE[k]);
    const upgrades    = allItems.filter(([k])=>!!UPGRADES[k]);

    const itemStyle = { display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, cursor:"grab", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", userSelect:"none" };

    function DropButtons({ id, qty }) {
      return (
        <div style={{ display:"flex", alignItems:"center", gap:0, borderRadius:6, overflow:"hidden", border:"1px solid rgba(255,100,80,0.22)", flexShrink:0 }}>
          <button
            title="Drop 1"
            onClick={(e)=>{e.stopPropagation();dropFromBag(id,1);}}
            style={{ fontSize:10, padding:"3px 8px", cursor:"pointer", background:"rgba(255,100,80,0.06)", border:"none", borderRight: qty > 1 ? "1px solid rgba(255,100,80,0.18)" : "none", color:"rgba(255,150,130,0.85)", fontFamily:"monospace", lineHeight:1.4 }}
          >drop</button>
          {qty > 1 && (
            <button
              title={`Drop all (${qty})`}
              onClick={(e)=>{e.stopPropagation();dropFromBag(id,qty);}}
              style={{ fontSize:10, padding:"3px 6px", cursor:"pointer", background:"rgba(255,100,80,0.10)", border:"none", color:"rgba(255,160,140,0.8)", fontFamily:"monospace", lineHeight:1.4 }}
            >all</button>
          )}
        </div>
      );
    }

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Slot capacity bar */}
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(200,230,120,0.04)", border:"1px solid rgba(200,230,120,0.12)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:10, color:"rgba(200,230,120,0.5)", letterSpacing:"0.1em", textTransform:"uppercase" }}>inventory</span>
            <span style={{ fontSize:11, color: usedSlotsCount >= totalSlots ? "rgba(255,120,80,0.9)" : "rgba(200,230,120,0.7)", fontFamily:"monospace" }}>{usedSlotsCount}/{totalSlots} slots</span>
          </div>
          <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(usedSlotsCount/totalSlots)*100}%`, background: usedSlotsCount >= totalSlots ? "rgba(255,120,80,0.7)" : "rgba(200,230,120,0.6)", transition:"width 0.3s" }} />
          </div>
          {usedSlotsCount >= totalSlots && (
            <p style={{ fontSize:10, color:"rgba(255,120,80,0.7)", marginTop:6 }}>Bag full — drop items below to free up space.</p>
          )}
        </div>

        {allItems.length === 0 && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)", padding:"24px 0" }}>bag is empty</p>}

        {resources.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Resources</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:6 }}>
              {resources.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", cursor:"grab" }}>
                  <span style={{ fontSize:18 }}>{ITEM_ICONS[id]??"📦"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:9, color:"rgba(245,230,200,0.4)" }}>{ITEMS[id]?.label??id}</div>
                    <div style={{ fontSize:15, color:"rgba(200,230,120,0.9)" }}>{qty}</div>
                  </div>
                  <DropButtons id={id} qty={qty} />
                </div>
              ))}
            </div>
          </div>
        )}

        {consumables.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Consumables — drag to hotbar to use mid-fight</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {consumables.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  onClick={()=>{const ei=hotbar?.findIndex(s=>!s)??-1;const si=ei>=0?ei:0;if(si<(hotbarSlots??HOTBAR_BASE_SLOTS)){const nh=[...(hotbar??[])];nh[si]={item:id,qty};onHotbarChange?.(nh);}}}
                  style={{ ...itemStyle, background:"rgba(255,200,80,0.07)", border:"1px solid rgba(255,200,80,0.25)" }}>
                  <span style={{ fontSize:22 }}>{ITEM_ICONS[id]??"📦"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>×{qty} · drag → hotbar</div>
                  </div>
                  <DropButtons id={id} qty={qty} />
                </div>
              ))}
            </div>
          </div>
        )}

        {gear.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Gear — click to equip</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {gear.map(([id, qty]) => {
                const eq = EQUIPPABLE[id]; const isEq = equipment?.[eq?.slot]===id;
                return (
                  <div key={id} onClick={()=>onEquipItem?.(id)} style={{ ...itemStyle, cursor:"pointer", background:"rgba(200,230,120,0.05)", border:"1px solid rgba(200,230,120,0.2)" }}>
                    <span style={{ fontSize:22 }}>{ITEM_ICONS[id]??"📦"}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:"rgba(200,230,120,0.85)" }}>{ITEMS[id]?.label??id}</div>
                      <div style={{ fontSize:10, color:isEq?"rgba(100,200,255,0.7)":"rgba(255,255,255,0.3)" }}>{isEq?"✓ equipped":"click to equip"}</div>
                    </div>
                    <DropButtons id={id} qty={qty} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upgrades.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Upgrades — click to apply</p>
            {upgrades.map(([id, qty]) => {
              const it = ITEMS[id];
              return (
                <div key={id} onClick={() => {
                  const { inv: newInv, hotbarSlots: newHbs } = applyUpgrade(playerInventory, hotbarSlots ?? HOTBAR_BASE_SLOTS, id);
                  onPlayerInventoryUpdate?.(newInv);
                  onHotbarSlotsUpdate?.(newHbs);
                }} style={{ ...itemStyle, cursor:"pointer", background:"rgba(120,80,200,0.08)", border:"1px solid rgba(120,80,200,0.25)" }}>
                  <span style={{ fontSize:22 }}>{it?.icon??"📦"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"rgba(180,150,230,0.9)" }}>{it?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{it?.description}</div>
                  </div>
                  <span style={{ fontSize:11, color:"rgba(120,80,200,0.8)", fontFamily:"monospace" }}>use</span>
                  <DropButtons id={id} qty={qty} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Chest (read-only, at home) ─────────────────────────────────────────
  function ChestTab() {
    const allItems = Object.entries(chestToMap(normalizeChest(chest))).filter(([,v])=>v>0);
    const resources   = allItems.filter(([k])=>!EQUIPPABLE[k]&&!HOTBAR_ITEMS[k]&&!PLACEABLES[k]);
    const consumables = allItems.filter(([k])=>!!HOTBAR_ITEMS[k]);
    const gear        = allItems.filter(([k])=>!!EQUIPPABLE[k]);
    const placeables  = allItems.filter(([k])=>!!PLACEABLES[k]);

    const subTabs = [
      { id:"resources",   label:"Resources",   list: resources },
      { id:"consumables", label:"Food",        list: consumables },
      { id:"gear",        label:"Gear",        list: gear },
      { id:"placeables",  label:"Placeables",  list: placeables },
    ].filter(s => s.list.length > 0);

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(180,200,100,0.04)", border:"1px solid rgba(180,200,100,0.12)", fontSize:10, color:"rgba(180,200,100,0.55)", lineHeight:1.6 }}>
          📦 Your shared chest is back at the homestead. You can see what's in it, but you can't deposit or withdraw from out here in the forest.
        </div>

        {allItems.length === 0 && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)", padding:"24px 0" }}>chest is empty</p>}

        {subTabs.length > 0 && (
          <>
            <div style={{ display:"flex", gap:2, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {subTabs.map(st => (
                <button key={st.id} onClick={() => setChestTab(st.id)} style={{ padding:"7px 11px", background:"transparent", border:"none", borderBottom:`2px solid ${chestTab===st.id?"rgba(180,200,100,0.7)":"transparent"}`, color:chestTab===st.id?"rgba(180,200,100,0.9)":"rgba(245,230,200,0.32)", fontSize:10, fontFamily:"monospace", cursor:"pointer", whiteSpace:"nowrap" }}>
                  {st.label} ({st.list.length})
                </button>
              ))}
            </div>
            {(subTabs.find(s => s.id === chestTab)?.list ?? []).map(([id, qty]) => {
              const it = ITEMS[id];
              return (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(180,200,100,0.04)", border:"1px solid rgba(180,200,100,0.12)" }}>
                  <span style={{ fontSize:22 }}>{ITEM_ICONS[id]??"📦"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:"rgba(180,200,100,0.85)" }}>{it?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(245,230,200,0.35)" }}>×{qty} at home</div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  // ── Tab: Crafting (hand-craft only, no station in the forest) ───────────────
  function CraftingTab() {
    function handleCraft(name) {
      const newInv = craftItem(name, playerInventory);
      if (newInv) {
        onPlayerInventoryUpdate?.(newInv);
        setCraftMsg(`Crafted ${ITEMS[name]?.label??name}!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }
    const handCraftables = Object.entries(RECIPES);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {craftMsg && <div style={{ textAlign:"center",fontSize:12,padding:"8px 14px",borderRadius:8,background:"rgba(200,230,120,0.1)",border:"1px solid rgba(200,230,120,0.3)",color:"rgba(200,230,120,0.9)" }}>✓ {craftMsg}</div>}
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
          {Object.entries(playerItems).filter(([,v])=>v>0).map(([id,qty])=>(
            <span key={id} style={{ fontSize:10,padding:"3px 7px",borderRadius:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(245,230,200,0.6)" }}>
              {ITEM_ICONS[id]??""} {qty} {ITEMS[id]?.label??id}
            </span>
          ))}
        </div>
        <div style={{ padding:"14px",borderRadius:12,background:"rgba(200,230,120,0.04)",border:"1px solid rgba(200,230,120,0.15)" }}>
          <p style={{ fontSize:10,color:"rgba(200,230,120,0.5)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12 }}>⚒ craft by hand</p>
          {handCraftables.length === 0 && <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textAlign:"center" }}>nothing to hand-craft</p>}
          {handCraftables.map(([name, recipe]) => {
            const craftable = canCraft(name, playerInventory);
            const it = ITEMS[name];
            return (
              <div key={name} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:craftable?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${craftable?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}`,opacity:craftable?1:0.5,marginTop:8 }}>
                <span style={{ fontSize:22,minWidth:30 }}>{it?.icon??"📦"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{it?.label??name}</div>
                  <div style={{ fontSize:10,color:"rgba(245,230,200,0.4)" }}>
                    {Object.entries(recipe).map(([ing,qty])=>{const have=playerItems[ing]??0;return <span key={ing} style={{ marginRight:8,color:have>=qty?"rgba(200,230,120,0.7)":"rgba(255,100,80,0.7)" }}>{ITEM_ICONS[ing]??""} {have}/{qty} {ITEMS[ing]?.label??ing}</span>;})}
                  </div>
                </div>
                <button disabled={!craftable} onClick={()=>handleCraft(name)} style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${craftable?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.06)"}`,background:craftable?"rgba(200,230,120,0.1)":"transparent",color:craftable?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:craftable?"pointer":"default" }}>craft</button>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"12px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",textAlign:"center",fontSize:11,color:"rgba(245,230,200,0.35)" }}>
          🔒 Station recipes (smelting, cooking, brewing, gear) are only available at the homestead.
        </div>
      </div>
    );
  }

  // ── Tab: Equipment ──────────────────────────────────────────────────────────
  function EquipmentTab() {
    const stats = getEquipStats(equipment);
    const equippableInBag = Object.entries(playerItems).filter(([k,v])=>v>0&&EQUIPPABLE[k]).map(([k])=>k);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {["weapon","armor","accessory"].map(slot=>{
          const item=equipment?.[slot]; const info=item?EQUIPPABLE[item]:null;
          return(
            <div key={slot} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:item?"rgba(200,230,120,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${item?"rgba(200,230,120,0.18)":"rgba(255,255,255,0.06)"}` }}>
              <span style={{ fontSize:22,minWidth:30 }}>{info?.icon??"○"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.1em",textTransform:"uppercase" }}>{slot}</div>
                <div style={{ fontSize:13,color:item?"rgba(200,230,120,0.85)":"rgba(255,255,255,0.18)" }}>{info?.label??"empty"}</div>
                {info&&<div style={{ fontSize:10,color:"rgba(200,230,160,0.4)" }}>{Object.entries(info.stats??{}).map(([k,v])=>`${k}:${v}`).join("  ")}</div>}
                {item && slot === "weapon" && (() => {
                  const dur = getWeaponDurability(equipment);
                  if (!dur) return null;
                  const [cur, max] = dur;
                  const pct = cur / max;
                  const barCol = pct > 0.5 ? "#80d860" : pct > 0.25 ? "#e8c840" : "#e04840";
                  return (
                    <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:60, height:5, background:"rgba(0,0,0,0.4)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${pct*100}%`, height:"100%", background:barCol, borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:9, color:"rgba(200,230,160,0.5)" }}>{cur}/{max}</span>
                    </div>
                  );
                })()}
              </div>
              {item&&<button onClick={()=>onEquipItem?.(item)} style={{ padding:"6px 10px",borderRadius:7,border:"1px solid rgba(255,100,100,0.25)",background:"rgba(255,100,100,0.06)",color:"rgba(255,140,120,0.8)",fontSize:11,fontFamily:"monospace",cursor:"pointer" }}>unequip</button>}
            </div>
          );
        })}
        <div style={{ padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>active bonuses</p>
          {Object.entries(stats).filter(([,v])=>v&&v!==0&&v!==false).length===0
            ?<p style={{ fontSize:11,color:"rgba(255,255,255,0.18)" }}>no bonuses active</p>
            :<div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {stats.attackBonus>0&&<StatPill label="ATK" value={`+${stats.attackBonus}`}/>}
              {stats.defense>0&&<StatPill label="DEF" value={`+${stats.defense}`}/>}
              {stats.maxHpBonus>0&&<StatPill label="HP" value={`+${stats.maxHpBonus}`}/>}
              {stats.attackRange>0&&<StatPill label="RANGE" value={`+${stats.attackRange}`}/>}
              {stats.canChop&&<StatPill label="CHOP" value="✓" color="rgba(120,200,60,0.8)"/>}
              {stats.canMine&&<StatPill label="MINE" value="✓" color="rgba(180,180,180,0.8)"/>}
            </div>
          }
        </div>
        {equippableInBag.length>0&&(
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase" }}>in bag — click to equip</p>
            {equippableInBag.map(name=>{const info=EQUIPPABLE[name];const isEq=equipment?.[info?.slot]===name;return(
              <div key={name} onClick={()=>onEquipItem?.(name)} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:"pointer",background:isEq?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${isEq?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}` }}>
                <span style={{ fontSize:20,minWidth:30 }}>{info.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{info.label}</div>
                  <div style={{ fontSize:10,color:"rgba(200,230,160,0.4)" }}>{info.slot} slot</div>
                </div>
                <button style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${isEq?"rgba(255,100,100,0.25)":"rgba(200,230,120,0.3)"}`,background:isEq?"rgba(255,100,100,0.06)":"rgba(200,230,120,0.08)",color:isEq?"rgba(255,140,120,0.8)":"rgba(200,230,120,0.9)",fontSize:11,fontFamily:"monospace",cursor:"pointer" }}>
                  {isEq?"unequip":"equip"}
                </button>
              </div>
            );})}
          </div>
        )}
      </div>
    );
  }

  const tabContent = {
    inventory: <InventoryTab/>,
    chest:     <ChestTab/>,
    crafting:  <CraftingTab/>,
    equipment: <EquipmentTab/>,
  };

  return (
    <div ref={overlayRef} style={{ position:"absolute",inset:0,background:"rgba(4,12,4,0.86)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20,backdropFilter:"blur(2px)" }} onClick={onClose}>
      <div style={{ background:"#111a0b",border:"1px solid rgba(180,220,100,0.22)",borderRadius:18,width:540,maxWidth:"97vw",maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:"monospace",color:"#f5e6c8",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:0 }}>
          <div style={{ fontSize:11,color:"rgba(200,230,120,0.5)",letterSpacing:"0.2em",textTransform:"uppercase",paddingBottom:14 }}>🌲 forest — menu</div>
          <button onClick={onClose} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,color:"rgba(255,255,255,0.3)",fontSize:12,fontFamily:"monospace",cursor:"pointer",padding:"3px 9px",marginBottom:14 }}>✕  esc</button>
        </div>
        <div style={{ display:"flex",overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 6px",scrollbarWidth:"none" }}>
          {RUN_TABS.map(tab=>{const active=activeTab===tab.id;return(
            <button key={tab.id} onClick={()=>onTabChange(tab.id)} style={{ flex:"0 0 auto",padding:"10px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${active?"rgba(200,230,120,0.8)":"transparent"}`,color:active?"rgba(200,230,120,0.95)":"rgba(245,230,200,0.4)",fontSize:12,fontFamily:"monospace",cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" }}>
              <span style={{ fontSize:14 }}>{tab.icon}</span>{tab.label}
            </button>
          );})}
        </div>
        {activeTab==="inventory" && <HotbarDropZone/>}
        <div ref={contentRef} style={{ flex:1,overflowY:"auto",padding:"18px 20px",scrollbarWidth:"thin",scrollbarColor:"rgba(200,230,120,0.15) transparent" }}>
          {tabContent[activeTab]}
        </div>
        <div style={{ padding:"8px 18px",borderTop:"1px solid rgba(255,255,255,0.05)",fontSize:9,color:"rgba(245,230,200,0.2)",textAlign:"center",letterSpacing:"0.08em" }}>
          Tab / Esc to close  ·  drop items to free up bag slots
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForestRun({
  room, seed, coOp = false, onRunComplete,
  character, equipment, onEquipItem,
  onEquipmentUpdate,
  hotbar, onHotbarChange,
  hotbarSlots, onHotbarSlotsUpdate,
  playerInventory, onPlayerInventoryUpdate,
  chest,
  onCharacterUpdate, // unused in run but accepted for symmetry
}) {
  const canvasRef       = useRef(null);
  const rafRef          = useRef(null);
  const keysRef         = useRef({});
  const stateRef        = useRef(null);
  const soundRef        = useRef(null);
  const lastMoveRef     = useRef(0);
  const randRef         = useRef(seededRand(seed ?? Date.now()));
  const lootFloatsRef   = useRef([]); // { text, worldX, worldY, born, color? }
  const toastRef        = useRef([]); // { text, born, color? }
  const droppedItemsRef = useRef([]); // ground loot from drops / bag-full overflow

  // Prop refs (so the loop always sees latest)
  const equipmentRef    = useRef(equipment ?? {});
  const onEquipmentUpdateRef = useRef(onEquipmentUpdate);
  const characterRef    = useRef(character ?? {});
  const hotbarRef       = useRef(hotbar ?? []);
  const hotbarSlotsRef  = useRef(hotbarSlots ?? HOTBAR_BASE_SLOTS);
  const playerInvRef    = useRef(playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS });
  const chestRef        = useRef(normalizeChest(chest));
  const partnerAppearanceRef = useRef({ character: null, equipment: null });

  useEffect(() => { equipmentRef.current   = equipment   ?? {}; }, [equipment]);
  useEffect(() => { onEquipmentUpdateRef.current = onEquipmentUpdate; }, [onEquipmentUpdate]);
  useEffect(() => { characterRef.current   = character   ?? {}; }, [character]);
  useEffect(() => { hotbarRef.current      = hotbar      ?? []; }, [hotbar]);
  useEffect(() => { hotbarSlotsRef.current = hotbarSlots ?? HOTBAR_BASE_SLOTS; }, [hotbarSlots]);
  useEffect(() => { playerInvRef.current   = playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS }; }, [playerInventory]);
  useEffect(() => { chestRef.current       = normalizeChest(chest); }, [chest]);

  // Hotbar selection
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
  const selectedSlotRef = useRef(0);
  useEffect(() => { selectedSlotRef.current = selectedHotbarSlot; }, [selectedHotbarSlot]);

  // Tab menu open/close
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const [activeTab,   setActiveTab]   = useState("inventory");
  const tabMenuOpenRef = useRef(false);
  useEffect(() => { tabMenuOpenRef.current = tabMenuOpen; }, [tabMenuOpen]);

  // Track delta gained during the run for the loot summary screen.
  // We snapshot inventory at run-start and diff at run-end so only items
  // that are *actually in the bag* when you leave are shown — drops are excluded.
  const runDeltaRef     = useRef({});
  const startInvRef     = useRef({});

  // Ref so inner useEffect closures can always call the latest doAttack
  const doAttackRef = useRef(null);

  // ── Helpers that talk to the parent player inventory ──────────────────────
  const RUN_WEAPONS = { axe: true, pickaxe: true };

  const pushToast = useCallback((text, color) => {
    toastRef.current.push({ text, born: performance.now(), color });
  }, []);

  const pushLootFloat = useCallback((text, worldX, worldY, color) => {
    lootFloatsRef.current.push({ text, worldX, worldY, born: performance.now(), color });
  }, []);

  // Try to add (item, qty) to player inventory. Returns the amount that fit
  // (0 if the bag is full and the item is a new type).
  const tryGainItem = useCallback((itemId, qty) => {
    const inv = playerInvRef.current ?? { items:{}, slots: INVENTORY_BASE_SLOTS };
    const { next, overflow } = addToPlayerInventory(inv, itemId, qty);
    const overflowQty = overflow?.[itemId] ?? 0;
    const gained = qty - overflowQty;
    if (gained > 0) {
      // Save delta for end-of-run summary
      runDeltaRef.current[itemId] = (runDeltaRef.current[itemId] ?? 0) + gained;
      // Push to parent (this will trigger re-render and update playerInvRef on next tick)
      onPlayerInventoryUpdate?.(next);
      // Optimistically update the ref immediately so back-to-back pickups in the same frame don't all hit the same "stale" inv
      playerInvRef.current = next;
    }
    return { gained, overflowQty };
  }, [onPlayerInventoryUpdate]);

  // Drop `qty` of itemId from the player's bag onto the ground at the player's feet
  const dropItemAtPlayer = useCallback((itemId, qty) => {
    const state = stateRef.current;
    if (!state) return;
    const DROP_DIST = 36;
    const facingOffset = {
      right: { ox: DROP_DIST, oy: 0 },
      left:  { ox: -DROP_DIST, oy: 0 },
      up:    { ox: 0, oy: -DROP_DIST },
      down:  { ox: 0, oy: DROP_DIST },
    }[state.facing] ?? { ox: DROP_DIST, oy: 0 };
    droppedItemsRef.current.push({
      id: `dropped_${itemId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      item: itemId, qty,
      x: state.px + facingOffset.ox,
      y: state.py + facingOffset.oy,
      born: performance.now(),
    });
    soundRef.current?.drop?.();
    pushLootFloat(`-${qty} ${ITEMS[itemId]?.label ?? itemId}`, state.px, state.py - 18, "#ff9080");
  }, [pushLootFloat]);

  const selectHotbarSlot = useCallback((idx) => {
    setSelectedHotbarSlot(idx);
    selectedSlotRef.current = idx;
    const entry = hotbarRef.current?.[idx];
    if (entry && RUN_WEAPONS[entry.item]) {
      // Auto-equip the weapon immediately
      onEquipItem?.(entry.item); // parent toggles equip; we expect it to set, not toggle, so use forceEquip pattern
    }
  }, [onEquipItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use the selected hotbar slot item
  const useHotbarItem = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.over) return;
    const hb = hotbarRef.current;
    const slot = selectedSlotRef.current;
    const entry = hb?.[slot];
    if (!entry) return;

    if (RUN_WEAPONS[entry.item]) {
      doAttackRef.current?.();
      return;
    }

    const info = HOTBAR_ITEMS[entry.item];
    if (!info) return;

    // Consumable: heal
    if (info.useEffect?.heal) {
      const maxHp = PLAYER_HP + (getEquipStats(equipmentRef.current).maxHpBonus ?? 0);
      if (state.hp >= maxHp) {
        pushToast("already at full health", "#f5c060");
        soundRef.current?.deny?.();
        return;
      }
      state.hp = Math.min(maxHp, state.hp + info.useEffect.heal);
      // Item lives on the hotbar now — just decrement the hotbar slot qty
      const newHb = [...hb];
      const newQty = (entry.qty ?? 1) - 1;
      newHb[slot] = newQty > 0 ? { ...entry, qty: newQty } : null;
      onHotbarChange?.(newHb);
      soundRef.current?.pickup();
      pushLootFloat(`+${info.useEffect.heal} HP`, state.px, state.py - 20, "#80f080");
    }
  }, [onPlayerInventoryUpdate, onHotbarChange, pushToast, pushLootFloat]);

  // ── Supabase: sync co-op partner if present ───────────────────────────────
  const handlers = useRef({
    onRunMove: ({ x, y, facing }) => {
      if (stateRef.current) {
        stateRef.current.partnerX       = x;
        stateRef.current.partnerY       = y;
        stateRef.current.partnerFacing  = facing;
        stateRef.current.partnerVisible = true;
      }
    },
    onPlayerAppearance: ({ character: ch, equipment: eq }) => {
      partnerAppearanceRef.current = { character: ch, equipment: eq };
    },
    onEnemyKilled: ({ id }) => {
      if (!stateRef.current) return;
      const e = stateRef.current.enemies.find(en => en.id === id);
      if (e) { e.alive = false; e.hp = 0; }
    },
    onPickupCollected: ({ id }) => {
      if (!stateRef.current) return;
      const p = stateRef.current.pickups.find(pk => pk.id === id);
      if (p) p.collected = true;
    },
    onRunStateRequest: () => {
      if (!stateRef.current) return;
      const collectedIds  = stateRef.current.pickups.filter(p => p.collected).map(p => p.id);
      const deadEnemyIds  = stateRef.current.enemies.filter(e => !e.alive).map(e => e.id);
      const deadTreeIds   = stateRef.current.trees.filter(t => !t.alive).map(t => t.id);
      sendRunStateSyncRef.current?.({ collectedIds, deadEnemyIds, deadTreeIds });
    },
    onRunStateSync: ({ collectedIds, deadEnemyIds, deadTreeIds }) => {
      if (!stateRef.current) return;
      collectedIds?.forEach(id => {
        const p = stateRef.current.pickups.find(pk => pk.id === id);
        if (p) p.collected = true;
      });
      deadEnemyIds?.forEach(id => {
        const e = stateRef.current.enemies.find(en => en.id === id);
        if (e) { e.alive = false; e.hp = 0; }
      });
      deadTreeIds?.forEach(id => {
        const t = stateRef.current.trees.find(tr => tr.id === id);
        if (t) { t.alive = false; t.hp = 0; }
      });
    },
  }).current;

  const { sendRunMove, sendEnemyKilled, sendPickupCollected, sendRunComplete,
          sendRunStateRequest, sendRunStateSync, sendPlayerAppearance } =
    useHearthroom(room?.id ?? null, handlers, ":run");

  const sendRunStateSyncRef = useRef(null);
  useEffect(() => { sendRunStateSyncRef.current = sendRunStateSync; }, [sendRunStateSync]);

  useEffect(() => {
    sendPlayerAppearance(character, equipment, hotbar);
  }, [character, equipment, hotbar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!coOp) return;
    const t = setTimeout(() => sendRunStateRequest(), 900);
    return () => clearTimeout(t);
  }, [coOp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init ───────────────────────────────────────────────────────────────────
  function initState() {
    const { enemies, pickups, trees, stoneDeposits } = generateForestRun(seed ?? Date.now());
    const equipStats = getEquipStats(equipmentRef.current);
    const maxHp = PLAYER_HP + (equipStats.maxHpBonus ?? 0);
    return {
      px: 80, py: FOREST_H / 2,
      facing: "right",
      step: 0, stepTimer: 0,
      hp: maxHp, maxHp, invincible: 0, hitFlash: 0,
      attackFlash: 0, attackCooldown: 0,
      camX: 0, camY: 0,
      elapsed: 0,
      kills: 0,
      over: false,
      noAxeFlash: 0,
      noPickaxeFlash: 0,
      enemies, pickups, trees, stoneDeposits,
      partnerX: 0, partnerY: 0, partnerFacing: "right", partnerVisible: false,
      lastTime: performance.now(),
    };
  }

  function finishRun(state) {
    if (state.over) return;
    state.over = true;
    // Compute delta as (current bag) - (snapshot at run-start).
    // This ensures only items physically in the bag are shown — anything
    // picked up then dropped is correctly excluded.
    const currentItems = playerInvRef.current?.items ?? {};
    const startItems   = startInvRef.current ?? {};
    const delta = {};
    const allKeys = new Set([...Object.keys(currentItems), ...Object.keys(startItems)]);
    for (const key of allKeys) {
      const gained = (currentItems[key] ?? 0) - (startItems[key] ?? 0);
      if (gained > 0) delta[key] = gained;
    }
    sendRunComplete({ ...delta, kills: state.kills });
    onRunComplete?.({ _alreadyApplied: true, _delta: delta, kills: state.kills });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundRef.current = makeSounds();

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = initState();
    lootFloatsRef.current = [];
    toastRef.current = [];
    droppedItemsRef.current = [];
    runDeltaRef.current = {};
    // Snapshot what the player had before the run so we can diff at end
    startInvRef.current = { ...(playerInvRef.current?.items ?? {}) };

    function doAttack() {
      const state = stateRef.current;
      if (!state || state.over || state.attackCooldown > 0) return;
      if (tabMenuOpenRef.current) return;
      state.attackFlash    = 0.35;
      state.attackCooldown = 0.5;
      soundRef.current?.swing();
      const equipStats = getEquipStats(equipmentRef.current);
      const { hitEnemies, hitTrees, hitDeposits, lootDrops, blockedTree, blockedDeposit } = playerAttack(
        state.px, state.py, state.facing,
        state.enemies, state.trees,
        randRef.current,
        equipStats,
        state.stoneDeposits
      );
      if (blockedTree) state.noAxeFlash = 1.5;
      if (blockedDeposit) state.noPickaxeFlash = 1.5;

      // Drain 1 durability for any successful hit (enemy, tree, or deposit)
      const anyHit = hitEnemies.length > 0 || hitTrees.length > 0 || (hitDeposits?.length ?? 0) > 0;
      if (anyHit) {
        const newEq = drainWeaponDurability(equipmentRef.current, (brokenId) => {
          pushToast(`💔 ${ITEMS[brokenId]?.label ?? brokenId} broke!`, "#ff6060");
          onEquipItem?.(brokenId); // unequip the broken tool
        });
        if (newEq !== equipmentRef.current) {
          equipmentRef.current = newEq;
          onEquipmentUpdateRef.current?.(newEq);
        }
      }

      hitEnemies.forEach(id => {
        const e = state.enemies.find(en => en.id === id);
        if (e && !e.alive) {
          state.kills++;
          sendEnemyKilled(id, []);
          soundRef.current?.hit();
        }
      });

      lootDrops.forEach((drop, i) => {
        const { gained, overflowQty } = tryGainItem(drop.item, drop.qty);
        const wx = drop.x + (i % 2 === 0 ? -12 : 12);
        const wy = drop.y - i * 16;
        if (gained > 0) {
          pushLootFloat(`+${gained} ${ITEMS[drop.item]?.label ?? drop.item}`, wx, wy);
        }
        if (overflowQty > 0) {
          // Bag full — drop the rest on the ground where it landed
          droppedItemsRef.current.push({
            id: `loot_${drop.item}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            item: drop.item, qty: overflowQty,
            x: drop.x, y: drop.y,
            born: performance.now(),
          });
          if (gained === 0) {
            pushToast(`🎒 bag full! ${ITEMS[drop.item]?.label ?? drop.item} dropped on the ground`, "#ff9080");
          }
        }
      });
    }
    doAttackRef.current = doAttack;

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (e.key === "Tab") {
        e.preventDefault();
        setTabMenuOpen(v => {
          const next = !v;
          if (next) keysRef.current = {};
          return next;
        });
        return;
      }
      if (e.key === "Escape") {
        if (tabMenuOpenRef.current) { setTabMenuOpen(false); return; }
        finishRun(stateRef.current);
        return;
      }
      if (tabMenuOpenRef.current) return; // swallow gameplay keys while menu open
      if (e.key === " ") { e.preventDefault(); doAttack(); }
      if (e.key >= "1" && e.key <= "9") selectHotbarSlot(parseInt(e.key) - 1);
      if (e.key === "f" || e.key === "F") useHotbarItem();
      const visSlots = Math.min(hotbarSlotsRef.current, HOTBAR_SIZE);
      if (e.key === "q" || e.key === "Q") {
        const next = (selectedSlotRef.current - 1 + visSlots) % visSlots;
        selectHotbarSlot(next);
      }
      if (e.key === "e" || e.key === "E") {
        const next = (selectedSlotRef.current + 1) % visSlots;
        selectHotbarSlot(next);
      }
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };
    const onClick = (e) => {
      soundRef.current?.unlock();
      if (tabMenuOpenRef.current) return;
      doAttack();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("click",   onClick);
    const onWheel = (e) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state || state.over) return;

      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t = ts / 1000;

      // Pause world updates while the tab menu is open (still redraw the static scene)
      const paused = tabMenuOpenRef.current;

      if (!paused) {
        state.elapsed += dt;
        if (state.elapsed >= RUN_DURATION) { finishRun(state); return; }
        if (state.hp <= 0)                 { finishRun(state); return; }

        // Movement
        let dx = 0, dy = 0;
        if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
        if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
        if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; state.facing = "up"; }
        if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; state.facing = "down"; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

        state.px = Math.max(20, Math.min(FOREST_W - 20, state.px + dx * PLAYER_SPEED * dt));
        state.py = Math.max(30, Math.min(FOREST_H - 30, state.py + dy * PLAYER_SPEED * dt));

        if (dx !== 0 || dy !== 0) {
          state.stepTimer += dt;
          if (state.stepTimer > 0.2) { state.stepTimer = 0; state.step = (state.step + 1) % 4; }
        } else { state.step = 0; state.stepTimer = 0; }

        // Timers
        if (state.invincible  > 0) state.invincible  = Math.max(0, state.invincible  - dt);
        if (state.hitFlash    > 0) state.hitFlash    = Math.max(0, state.hitFlash    - dt * 3);
        if (state.attackFlash > 0) state.attackFlash = Math.max(0, state.attackFlash - dt * 4);
        if (state.attackCooldown > 0) state.attackCooldown = Math.max(0, state.attackCooldown - dt);
        if (state.noAxeFlash  > 0) state.noAxeFlash  = Math.max(0, state.noAxeFlash  - dt * 1.2);
        if (state.noPickaxeFlash > 0) state.noPickaxeFlash = Math.max(0, state.noPickaxeFlash - dt * 1.2);
        // Decay hitFlash on trees and stone deposits
        state.trees.forEach(tree => { if (tree.hitFlash > 0) tree.hitFlash = Math.max(0, tree.hitFlash - dt * 5); });
        (state.stoneDeposits ?? []).forEach(dep => { if (dep.hitFlash > 0) dep.hitFlash = Math.max(0, dep.hitFlash - dt * 5); });

        // Enemies
        updateForestEnemies(state.enemies, state.px, state.py, dt, t);

        // Enemy attacks player
        if (state.invincible === 0) {
          for (const e of state.enemies) {
            if (!e.alive || e.state !== "attack") continue;
            if (e.attackCooldown > 0) continue;
            if (Math.hypot(state.px - e.x, state.py - e.y) < ENEMY_ATTACK_RANGE + 4) {
              state.hp         = Math.max(0, state.hp - ENEMY_DAMAGE);
              state.invincible = INVINCIBLE_S;
              state.hitFlash   = 1;
              e.attackCooldown = ENEMY_ATTACK_CD;
              soundRef.current?.hurt();
            }
          }
        }

        // Pickups (ground sparkles): try to gain, leave any overflow on the ground
        for (const p of state.pickups) {
          if (p.collected) continue;
          if (Math.hypot(state.px - p.x, state.py - p.y) < PICKUP_R) {
            const drops = rollLoot(
              [{ item:"sticks",min:1,max:3 },{ item:"stone",min:0,max:1 },{ item:"herbs",min:0,max:2 }],
              randRef.current
            );
            let anyGained = false;
            let allBlocked = drops.length > 0;
            drops.forEach((d, i) => {
              const { gained, overflowQty } = tryGainItem(d.item, d.qty);
              const wx = p.x + (i % 2 === 0 ? -12 : 12);
              const wy = p.y - i * 16;
              if (gained > 0) {
                anyGained = true; allBlocked = false;
                pushLootFloat(`+${gained} ${ITEMS[d.item]?.label ?? d.item}`, wx, wy);
              }
              if (overflowQty > 0) {
                droppedItemsRef.current.push({
                  id: `loot_${d.item}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                  item: d.item, qty: overflowQty,
                  x: wx, y: p.y + 4,
                  born: performance.now(),
                });
              }
            });
            // Only consume the sparkle if SOMETHING was picked up. Otherwise leave it
            // for the player to come back to after they free a slot.
            if (anyGained || drops.length === 0) {
              p.collected = true;
              sendPickupCollected(p.id);
              soundRef.current?.pickup();
            } else if (allBlocked && !state._bagFullNotified) {
              pushToast(`🎒 bag is full — drop or use items (Tab)`, "#ff9080");
              soundRef.current?.deny?.();
              state._bagFullNotified = performance.now();
              // Allow notification again after a couple seconds
              setTimeout(() => { if (stateRef.current) stateRef.current._bagFullNotified = 0; }, 2500);
            }
          }
        }

        // Dropped items on the ground — walk over them to pick back up (if room)
        droppedItemsRef.current = droppedItemsRef.current.filter(drop => {
          // Don't auto-pickup what we just dropped this frame (small cooldown)
          if (performance.now() - drop.born < 600) return true;
          if (Math.hypot(state.px - drop.x, state.py - drop.y) > PICKUP_R) return true;
          const { gained, overflowQty } = tryGainItem(drop.item, drop.qty);
          if (gained > 0) {
            pushLootFloat(`+${gained} ${ITEMS[drop.item]?.label ?? drop.item}`, drop.x, drop.y - 8);
            soundRef.current?.pickup();
          }
          if (overflowQty > 0) {
            // Update the ground pile to hold whatever didn't fit
            drop.qty = overflowQty;
            return true;
          }
          return false;
        });

        // Camera
        const targetCamX = Math.max(0, Math.min(FOREST_W - W, state.px - W / 2));
        state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

        // Broadcast position
        if (ts - lastMoveRef.current > MOVE_THROTTLE) {
          sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
          lastMoveRef.current = ts;
        }
      }

      // ── DRAW ───────────────────────────────────────────────────────────
      const camX = state.camX;

      drawForestBackground(ctx, camX, W, H, t);

      // Pickups
      for (const p of state.pickups) {
        if (p.collected) continue;
        const sx = p.x - camX;
        if (sx < -20 || sx > W + 20) continue;
        drawPickup(ctx, p, camX, t);
      }

      // Painter's algo: trees + enemies + dropped + player sorted by y
      const drawables = [];

      state.trees.forEach(tree => {
        if (!tree.alive && tree.hp <= 0) return;
        const sx = tree.x - camX;
        if (sx < -80 || sx > W + 80) return;
        drawables.push({ sortY: tree.y + 20, draw: () => drawForestTree(ctx, tree, camX, t) });
      });

      (state.stoneDeposits ?? []).forEach(dep => {
        if (!dep.alive) return;
        const sx = dep.x - camX;
        if (sx < -60 || sx > W + 60) return;
        drawables.push({ sortY: dep.y + 12, draw: () => drawStoneDeposit(ctx, dep, camX, t) });
      });

      state.enemies.forEach(e => {
        if (!e.alive) return;
        const sx = e.x - camX;
        if (sx < -60 || sx > W + 60) return;
        drawables.push({ sortY: e.y + WOLF_R, draw: () => drawEnemy(ctx, e, camX, t) });
      });

      droppedItemsRef.current.forEach(drop => {
        const sx = drop.x - camX;
        if (sx < -20 || sx > W + 20) return;
        drawables.push({ sortY: drop.y + 6, draw: () => drawDroppedItem(ctx, drop, camX, t) });
      });

      drawables.push({ sortY: state.py, draw: () =>
        drawPlayer(ctx, state.px - camX, state.py, state.facing, state.step, state.invincible, state.attackFlash, t, characterRef.current, equipmentRef.current?.weapon ?? null)
      });

      if (state.partnerVisible) {
        const gpx = state.partnerX - camX, gpy = state.partnerY;
        const pa = partnerAppearanceRef.current;
        drawables.push({ sortY: gpy, draw: () => {
          ctx.save(); ctx.globalAlpha = 0.5;
          drawPlayer(ctx, gpx, gpy, state.partnerFacing, 0, 0, 0, t, pa.character, pa.equipment?.weapon ?? null);
          ctx.restore();
          ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.font = "9px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("P2", gpx, gpy - 26);
        }});
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      if (state.hitFlash > 0) {
        ctx.save(); ctx.globalAlpha = state.hitFlash * 0.3;
        ctx.fillStyle = "#ff3333"; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // Floating loot text
      const now = performance.now();
      lootFloatsRef.current = lootFloatsRef.current.filter(lf => now - lf.born < LOOT_FLOAT_DUR * 1000);
      for (const lf of lootFloatsRef.current) {
        const age   = (now - lf.born) / (LOOT_FLOAT_DUR * 1000);
        const alpha = 1 - age;
        const fx    = lf.worldX - camX;
        const fy    = lf.worldY - age * 44;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = lf.color ?? "#f5e6a0"; ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, fx, fy);
        ctx.restore();
      }

      // HUD
      const items = playerInvRef.current?.items ?? {};
      const slotsUsed  = Object.values(items).filter(v => v > 0).length;
      const slotsTotal = playerInvRef.current?.slots ?? INVENTORY_BASE_SLOTS;
      const weaponDur = getWeaponDurability(equipmentRef.current);
      drawHUD(ctx, W, H, state, items, t, slotsUsed, slotsTotal, weaponDur);

      // Toasts (centered top under the HUD bar)
      toastRef.current = toastRef.current.filter(ts2 => now - ts2.born < TOAST_DUR * 1000);
      let ty = 50;
      for (const toast of toastRef.current) {
        const age = (now - toast.born) / (TOAST_DUR * 1000);
        const alpha = age < 0.85 ? 1 : (1 - age) / 0.15;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        const text = toast.text;
        ctx.font = "bold 11px monospace";
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(10,8,4,0.88)";
        ctx.beginPath(); ctx.roundRect(W / 2 - tw/2 - 12, ty - 12, tw + 24, 22, 6); ctx.fill();
        ctx.fillStyle = toast.color ?? "#f5c060";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text, W / 2, ty - 1);
        ctx.restore();
        ty += 28;
      }

      // "Need pickaxe" toast
      if (state.noPickaxeFlash > 0) {
        const alpha = Math.min(1, state.noPickaxeFlash);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(10,8,4,0.85)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 88, H / 2 + 16, 176, 30, 6); ctx.fill();
        ctx.fillStyle = "#a0c0ff"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("[pickaxe] need a pickaxe to mine", W / 2, H / 2 + 31);
        ctx.restore();
      }

      // "Need axe" toast
      if (state.noAxeFlash > 0) {
        const alpha = Math.min(1, state.noAxeFlash);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(10,8,4,0.85)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 72, H / 2 - 20, 144, 30, 6); ctx.fill();
        ctx.fillStyle = "#f5c060"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("[axe] need an axe to chop", W / 2, H / 2 - 5);
        ctx.restore();
      }

      // Pause indicator
      if (paused) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("click",   onClick);
      canvas.removeEventListener("wheel",   onWheel);
    };
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use a hotbar slot — same effect as onUseSlot in HomesteadView's HotbarBar
  const onUseSlotIdx = useCallback((idx) => {
    setSelectedHotbarSlot(idx);
    selectedSlotRef.current = idx;
    const entry = hotbarRef.current?.[idx];
    if (entry && RUN_WEAPONS[entry.item]) {
      // Auto-equip on click and swing
      onEquipItem?.(entry.item);
      doAttackRef.current?.();
      return;
    }
    useHotbarItem();
  }, [onEquipItem, useHotbarItem]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width:"100%", height:"100svh", background:"#0a120a", position:"relative", userSelect:"none" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
      />
      {/* Hotbar at the bottom — mirrors HomesteadView */}
      <HotbarBar
        hotbar={hotbar ?? []}
        hotbarSlots={hotbarSlots ?? HOTBAR_BASE_SLOTS}
        equipment={equipment ?? {}}
        selectedIdx={selectedHotbarSlot}
        onSelectIdx={selectHotbarSlot}
        onOpenMenu={(tab) => { setActiveTab(tab ?? "inventory"); setTabMenuOpen(true); }}
        onUseSlot={onUseSlotIdx}
      />
      {/* Tab menu overlay — mirrors HomesteadView */}
      {tabMenuOpen && (
        <RunTabMenu
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setTabMenuOpen(false)}
          playerInventory={playerInventory}
          onPlayerInventoryUpdate={onPlayerInventoryUpdate}
          hotbarSlots={hotbarSlots}
          onHotbarSlotsUpdate={onHotbarSlotsUpdate}
          chest={chest}
          equipment={equipment}
          onEquipItem={onEquipItem}
          hotbar={hotbar}
          onHotbarChange={onHotbarChange}
          onDropItem={dropItemAtPlayer}
        />
      )}
    </div>
  );
}