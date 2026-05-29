// src/Pages/Homestead/ForestRun.jsx
// Redesigned: the run uses the SAME inventory + hotbar + Tab menu as Homestead.
//
// Pickups go directly into the player's real (slot-capped) inventory via
// onPlayerInventoryUpdate.  If the bag is full, the pickup stays on the
// ground and a "bag full" toast plays — the player must drop something
// (or use it) to make room.  Tab opens the inventory menu, identical in
// look and feel to Homestead's.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRunLoop } from "./runs_useRunLoop";
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
  expandedHandRecipes, canCraftByKey, craftItemByKey, resolveHandRecipeKey,
  addToPlayerInventory, spendFromPlayerInventory,
  applyUpgrade,
  normalizeChest, chestToMap,
  getWeaponDurability, drainWeaponDurability, TOOL_MAX_DURABILITY,
} from "./Items";
import { ItemIcon } from "./ItemIcon";
import { RunTabMenu } from "./player_RunTabMenu";
import { drawPlayerLegacyRun as drawPlayer } from "./drawing_drawPlayer";
import { MobileControls } from "./MobileControls";


const PLAYER_SPEED   = 130;
const PLAYER_HP      = 5;
const INVINCIBLE_S   = 1.2;
const RUN_DURATION   = 180; // 3 minutes max
const MOVE_THROTTLE  = 50;  // ms between position broadcasts
const PICKUP_R       = 18;
const LOOT_FLOAT_DUR = 1.4; // seconds loot numbers float
const TOAST_DUR      = 1.8;

// Tiny sound engine (same pattern as InkRun)
// makeSounds now lives in ./audio/sounds.js and takes a palette name.
// The palette for this run is "forest".

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

// drawPlayer is now shared in ./drawing/drawPlayer.js (imported below).

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
// HotbarBar (now <Hotbar/>) is shared from ./player/Hotbar.jsx — imported below.

// ─── Run Tab Menu ─────────────────────────────────────────────────────────────
// Same visual structure as HomesteadView's TabMenu, with run-appropriate tabs:
//   My Bag        — drop items (or quick-deposit to chest is unavailable in forest)
//   Chest         — read-only view of what's at home
//   Crafting      — hand-craft only (no station in the forest)
//   Equipment     — switch gear mid-run
//
// While this menu is open, the game loop pauses.

// RUN_TABS and StatPill are now shared with the other runs (and HomesteadView).
import { Hotbar as HotbarBar } from "./player_Hotbar";
import { PauseOverlay } from "./runs_PauseOverlay";
const __HB_THEME = "forest";

// RunTabMenu is now shared from ./player/RunTabMenu.jsx — imported above.

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForestRun({
  room, seed, coOp = false, isHost = true, onRunComplete,
  character, equipment, onEquipItem,
  onEquipmentUpdate,
  hotbar, onHotbarChange,
  hotbarSlots, onHotbarSlotsUpdate,
  playerInventory, onPlayerInventoryUpdate,
  chest,
  onCharacterUpdate, // unused in run but accepted for symmetry
}) {
  // State refs that we keep ownership of so the hearthroom handlers (defined
  // below, BEFORE useRunLoop runs) can close over them directly. The hook
  // accepts them via its `stateRef` / `partnerAppearanceRef` options.
  const stateRef        = useRef(null);
  const partnerAppearanceRef = useRef({ character: null, equipment: null });
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
  // Remaining seconds of active strength-potion buff (0 = inactive)
  const strengthActiveRef = useRef(0);

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
    // If the item is already on the hotbar, stack onto it there rather than
    // treating it as a new slot in the inventory (which could hit the slot cap).
    const hotbarIdx = (hotbarRef.current ?? []).findIndex(s => s?.item === itemId);
    if (hotbarIdx >= 0) {
      const newHotbar = (hotbarRef.current ?? []).map((s, i) =>
        i === hotbarIdx ? { ...s, qty: (s.qty ?? 0) + qty } : s
      );
      hotbarRef.current = newHotbar;
      onHotbarChange?.(newHotbar);
      runDeltaRef.current[itemId] = (runDeltaRef.current[itemId] ?? 0) + qty;
      return { gained: qty, overflowQty: 0 };
    }

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
  }, [onPlayerInventoryUpdate, onHotbarChange]);

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
    // Strength buff (may stack with heal, e.g. strength potion gives both)
    if (info.useEffect?.strengthDuration) {
      strengthActiveRef.current = info.useEffect.strengthDuration;
      if (!info.useEffect?.heal) {
        // Consume from hotbar only if heal didn't already do it
        const newHb = [...hb];
        const newQty = (entry.qty ?? 1) - 1;
        newHb[slot] = newQty > 0 ? { ...entry, qty: newQty } : null;
        onHotbarChange?.(newHb);
        soundRef.current?.pickup();
      }
      pushToast(`⚔️ Strength x1.5 for ${info.useEffect.strengthDuration}s`, "#ff9944");
    }
  }, [onPlayerInventoryUpdate, onHotbarChange, pushToast, pushLootFloat]);

  // ── Supabase: sync co-op partner if present ───────────────────────────────
  const sendPlayerAppearanceRef = useRef(null);

  const handlers = useRef({
    onConnected: () => {
      // Re-broadcast appearance every time the socket (re)connects so the partner
      // always has our character/equipment even if they joined after us or reconnected.
      setTimeout(() => {
        sendPlayerAppearanceRef.current?.(
          characterRef.current,
          equipmentRef.current,
          hotbarRef.current,
        );
      }, 80);
    },
    // When the partner leaves the room/run (closes tab, returns home, etc.)
    // the server emits partner_disconnected. Hide their sprite immediately
    // so they no longer appear as a stuck ghost on our screen.
    onPartnerDisconnected: () => {
      const s = stateRef.current;
      if (s) {
        s.partnerVisible = false;
        s.partnerLerpT = 1;
      }
      partnerAppearanceRef.current = null;
    },
    onRunMove: ({ x, y, facing, jumpVY }) => {
      const s = stateRef.current;
      if (s) {
        // Begin a new lerp from current render position to the newly received target
        s.partnerFromX   = s.partnerVisible ? s.partnerRenderX : x;
        s.partnerFromY   = s.partnerVisible ? s.partnerRenderY : y;
        s.partnerToX     = x;
        s.partnerToY     = y;
        s.partnerLerpT   = 0;
        s.partnerLerpDur = 0.12;
        s.partnerX       = x;
        s.partnerY       = y;
        s.partnerFacing  = facing;
        s.partnerVisible = true;
        if (jumpVY) s.partnerJumpVY = jumpVY;
      }
    },
    onPlayerAppearance: ({ character: ch, equipment: eq }) => {
      partnerAppearanceRef.current = { character: ch, equipment: eq };
    },
    onEnemyHit: ({ id, hp }) => {
      if (!stateRef.current) return;
      const e = stateRef.current.enemies.find(en => en.id === id);
      if (e) { e.hp = hp; e.hitFlash = 1; }
    },
    onEnemyKilled: ({ id }) => {
      if (!stateRef.current) return;
      const e = stateRef.current.enemies.find(en => en.id === id);
      if (e) { e.alive = false; e.hp = 0; }
    },
    onTreeHit: ({ id, hp }) => {
      if (!stateRef.current) return;
      const t = stateRef.current.trees.find(tr => tr.id === id);
      if (t) { t.hp = hp; t.hitFlash = 1; }
    },
    onTreeKilled: ({ id }) => {
      if (!stateRef.current) return;
      const t = stateRef.current.trees.find(tr => tr.id === id);
      if (t) { t.alive = false; t.hp = 0; t.hitFlash = 0; }
    },
    onDepositHit: ({ id, hp }) => {
      if (!stateRef.current) return;
      const d = (stateRef.current.stoneDeposits ?? []).find(dep => dep.id === id);
      if (d) { d.hp = hp; d.hitFlash = 1; }
    },
    onDepositKilled: ({ id }) => {
      if (!stateRef.current) return;
      const d = (stateRef.current.stoneDeposits ?? []).find(dep => dep.id === id);
      if (d) { d.alive = false; d.hp = 0; d.hitFlash = 0; }
    },
    onPickupCollected: ({ id }) => {
      if (!stateRef.current) return;
      const p = stateRef.current.pickups.find(pk => pk.id === id);
      if (p) p.collected = true;
    },
    onRunStateRequest: () => {
      if (!stateRef.current) return;
      const collectedIds    = stateRef.current.pickups.filter(p => p.collected).map(p => p.id);
      const deadEnemyIds    = stateRef.current.enemies.filter(e => !e.alive).map(e => e.id);
      const deadTreeIds     = stateRef.current.trees.filter(t => !t.alive).map(t => t.id);
      const deadDepositIds  = (stateRef.current.stoneDeposits ?? []).filter(d => !d.alive).map(d => d.id);
      // Also include current enemy positions so follower can snap to them immediately
      const enemySnapshots  = stateRef.current.enemies.map(e => ({
        id: e.id, x: Math.round(e.x), y: Math.round(e.y),
        hp: e.hp, alive: e.alive, state: e.state, dir: e.dir,
        attackCooldown: Math.round(e.attackCooldown * 100) / 100,
      }));
      sendRunStateSyncRef.current?.({ collectedIds, deadEnemyIds, deadTreeIds, deadDepositIds, enemySnapshots });
    },
    onRunStateSync: ({ collectedIds, deadEnemyIds, deadTreeIds, deadDepositIds, enemySnapshots }) => {
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
      deadDepositIds?.forEach(id => {
        const d = (stateRef.current.stoneDeposits ?? []).find(dep => dep.id === id);
        if (d) { d.alive = false; d.hp = 0; }
      });
      // Snap enemy positions immediately so follower starts in sync
      enemySnapshots?.forEach(snap => {
        const e = stateRef.current.enemies.find(en => en.id === snap.id);
        if (!e) return;
        e.x = snap.x; e.y = snap.y; e.hp = snap.hp; e.alive = snap.alive;
        e.state = snap.state; e.dir = snap.dir; e.attackCooldown = snap.attackCooldown;
      });
    },
    // ── Host → Follower: real-time enemy positions ─────────────────────────
    onEnemySync: ({ enemies: synced }) => {
      if (!stateRef.current || !synced) return;
      // Only the follower applies incoming enemy state; host ignores its own broadcast
      if (isHost) return;
      // Mark that we received a sync — used to detect when host goes silent
      lastEnemySyncReceivedRef.current = performance.now();
      for (const snap of synced) {
        const e = stateRef.current.enemies.find(en => en.id === snap.id);
        if (!e) continue;
        e.x             = snap.x;
        e.y             = snap.y;
        e.hp            = snap.hp;
        e.alive         = snap.alive;
        e.state         = snap.state;
        e.dir           = snap.dir;
        e.attackCooldown = snap.attackCooldown;
        // Preserve local hitFlash (set by our own attack hits) — don't reset it
      }
    },
  }).current;

  const { sendRunMove, sendEnemyHit, sendEnemyKilled,
          sendTreeHit, sendTreeKilled, sendDepositHit, sendDepositKilled,
          sendPickupCollected, sendRunComplete,
          sendRunStateRequest, sendRunStateSync, sendEnemySync, sendPlayerAppearance,
          canvasRef, soundRef, keysRef, lastMoveRef,
          pauseOpen, setPauseOpen, pauseOpenRef } =
    useRunLoop({
      room,
      palette: "forest",
      initState: () => initState(),
      tick: (state, ctx, dt, t, W, H, helpers) =>
        tick(state, ctx, dt, t, W, H, helpers),
      handlers,
      onRunComplete,
      character, equipment, hotbar,
      extraPauseRef: tabMenuOpenRef,
      stateRef,
      partnerAppearanceRef,
      movementThrottleMs: MOVE_THROTTLE,
    });

  const sendRunStateSyncRef  = useRef(null);
  const sendTreeHitRef       = useRef(null);
  const sendTreeKilledRef    = useRef(null);
  const sendDepositHitRef    = useRef(null);
  const sendDepositKilledRef = useRef(null);
  const sendEnemyHitRef      = useRef(null);
  const sendEnemyKilledRef   = useRef(null);
  const sendEnemySyncRef     = useRef(null);
  const lastEnemySyncRef         = useRef(0);                  // ts of last enemy_sync SENT (host)
  const lastEnemySyncReceivedRef = useRef(performance.now()); // ts of last enemy_sync RECEIVED (follower)
  useEffect(() => { sendRunStateSyncRef.current  = sendRunStateSync;  }, [sendRunStateSync]);
  useEffect(() => { sendTreeHitRef.current       = sendTreeHit;       }, [sendTreeHit]);
  useEffect(() => { sendTreeKilledRef.current    = sendTreeKilled;    }, [sendTreeKilled]);
  useEffect(() => { sendDepositHitRef.current    = sendDepositHit;    }, [sendDepositHit]);
  useEffect(() => { sendDepositKilledRef.current = sendDepositKilled; }, [sendDepositKilled]);
  useEffect(() => { sendEnemyHitRef.current      = sendEnemyHit;      }, [sendEnemyHit]);
  useEffect(() => { sendEnemyKilledRef.current   = sendEnemyKilled;   }, [sendEnemyKilled]);
  useEffect(() => { sendEnemySyncRef.current     = sendEnemySync;     }, [sendEnemySync]);
  useEffect(() => { sendPlayerAppearanceRef.current = sendPlayerAppearance; }, [sendPlayerAppearance]);

  // In co-op, request the current world state from our partner with retries.
  // We keep asking until partnerVisible flips (meaning we received at least one
  // run_move or run_state_sync from them), up to 6 attempts spaced 1.5 s apart.
  useEffect(() => {
    if (!coOp) return;
    let attempts = 0;
    let timer;
    function tryRequest() {
      if (stateRef.current?.partnerVisible || attempts >= 6) return;
      sendRunStateRequest();
      attempts++;
      timer = setTimeout(tryRequest, 1500);
    }
    timer = setTimeout(tryRequest, 900);
    return () => clearTimeout(timer);
  }, [coOp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init ───────────────────────────────────────────────────────────────────
  function initState() {
    const { enemies, pickups, trees, stoneDeposits } = generateForestRun(seed ?? Date.now(), coOp);
    const equipStats = getEquipStats(equipmentRef.current);
    const maxHp = PLAYER_HP + (equipStats.maxHpBonus ?? 0);
    // Reset per-run scratch state. useRunLoop calls initState once on mount,
    // so this is the right place to clear floating-loot toasts, dropped
    // items, and to snapshot the inventory we'll diff against at run end.
    lootFloatsRef.current = [];
    toastRef.current = [];
    droppedItemsRef.current = [];
    runDeltaRef.current = {};
    startInvRef.current = { ...(playerInvRef.current?.items ?? {}) };
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
      partnerStep: 0, partnerStepTimer: 0, partnerPrevX: 0, partnerPrevY: 0,
      partnerFromX: 0, partnerFromY: 0,
      partnerToX: 0,   partnerToY: 0,
      partnerLerpT: 1, partnerLerpDur: 0.1,
      partnerRenderX: 0, partnerRenderY: 0,
      jumpZ: 0, jumpVY: 0,
      partnerJumpZ: 0, partnerJumpVY: 0,
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
    // Pass final equipment state so the parent can persist durability changes.
    onRunComplete?.({
      _alreadyApplied: true,
      _delta: delta,
      kills: state.kills,
      _finalEquipment: equipmentRef.current,
    });
  }

  // ── doAttack ────────────────────────────────────────────────────────────
  function doAttack() {
    const state = stateRef.current;
    if (!state || state.over || state.attackCooldown > 0) return;
    if (tabMenuOpenRef.current) return;
    state.attackFlash    = 0.35;
    state.attackCooldown = 0.5;
    soundRef.current?.swing();
    const equipStats = getEquipStats(equipmentRef.current);
    const damageMultiplier = strengthActiveRef.current > 0 ? 1.5 : 1;
    const { hitEnemies, hitTrees, hitDeposits, lootDrops, blockedTree, blockedDeposit } = playerAttack(
      state.px, state.py, state.facing,
      state.enemies, state.trees,
      randRef.current,
      equipStats,
      state.stoneDeposits,
      damageMultiplier
    );
    if (blockedTree) state.noAxeFlash = 1.5;
    if (blockedDeposit) state.noPickaxeFlash = 1.5;

    // Drain 1 durability for any successful hit (enemy, tree, or deposit)
    const anyHit = hitEnemies.length > 0 || hitTrees.length > 0 || (hitDeposits?.length ?? 0) > 0;
    if (anyHit) {
      const drained = drainWeaponDurability(
        equipmentRef.current,
        playerInvRef.current ?? { items: {}, slots: INVENTORY_BASE_SLOTS },
        hotbarRef.current ?? [],
        (brokenId) => {
          pushToast(`💔 ${ITEMS[brokenId]?.label ?? brokenId} broke!`, "#ff6060");
        }
      );
      if (drained.inventory !== playerInvRef.current) {
        playerInvRef.current = drained.inventory;
        onPlayerInventoryUpdate?.(drained.inventory);
      }
      if (drained.hotbar !== hotbarRef.current) {
        hotbarRef.current = drained.hotbar;
        onHotbarChange?.(drained.hotbar);
      }
      if (drained.equipment !== equipmentRef.current) {
        equipmentRef.current = drained.equipment;
        onEquipmentUpdateRef.current?.(drained.equipment);
      }
    }

    hitEnemies.forEach(id => {
      const e = state.enemies.find(en => en.id === id);
      if (!e) return;
      if (!e.alive) {
        state.kills++;
        sendEnemyKilledRef.current?.(id, []);
        soundRef.current?.hit();
      } else {
        // Intermediate hit — partner needs to see the HP bar update
        if (coOp) sendEnemyHitRef.current?.(id, e.hp);
        soundRef.current?.hit();
      }
    });

    hitTrees.forEach(id => {
      const tree = state.trees.find(tr => tr.id === id);
      if (!tree) return;
      if (!tree.alive) {
        if (coOp) sendTreeKilledRef.current?.(id);
      } else {
        if (coOp) sendTreeHitRef.current?.(id, tree.hp);
      }
    });

    (hitDeposits ?? []).forEach(id => {
      const dep = (state.stoneDeposits ?? []).find(d => d.id === id);
      if (!dep) return;
      if (!dep.alive) {
        if (coOp) sendDepositKilledRef.current?.(id);
      } else {
        if (coOp) sendDepositHitRef.current?.(id, dep.hp);
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

  // Mobile jump — same logic as the space-bar handler
const mobileJump = useCallback(() => {
  soundRef.current?.unlock();
  if (stateRef.current && stateRef.current.jumpZ === 0 && stateRef.current.jumpVY === 0) {
    stateRef.current.jumpVY = -220;
    sendRunMove(Math.round(stateRef.current.px), Math.round(stateRef.current.py), stateRef.current.facing, -220);
    lastMoveRef.current = performance.now();
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── tick (called every frame by useRunLoop) ───────────────────────────
  // `state` is the run state, `ctx` the 2D canvas context, `helpers`
  // exposes pause/keys/sound. `keysRef` / `soundRef` from useRunLoop are
  // closed over directly via lexical scope — refs are stable.
  function tick(state, ctx, dt, t, W, H, helpers) {
    // rAF timestamp in ms — original tick body uses `ts` for throttle
    // checks (lastEnemySyncRef, lastMoveRef). useRunLoop hands us `t` in
    // seconds, so reconstruct.
    const ts = t * 1000;

    // Pause world updates while the tab menu or pause overlay is open (still redraw the static scene)
    const paused = tabMenuOpenRef.current || pauseOpenRef.current;

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

      // Jump physics
      if (state.jumpZ !== 0 || state.jumpVY !== 0) {
        state.jumpVY += 600 * dt;
        state.jumpZ  += state.jumpVY * dt;
        if (state.jumpZ >= 0) { state.jumpZ = 0; state.jumpVY = 0; }
      }

      // Partner jump physics
      if (state.partnerJumpZ !== 0 || state.partnerJumpVY !== 0) {
        state.partnerJumpVY += 600 * dt;
        state.partnerJumpZ  += state.partnerJumpVY * dt;
        if (state.partnerJumpZ >= 0) { state.partnerJumpZ = 0; state.partnerJumpVY = 0; }
      }

      // Timers
      if (state.invincible  > 0) state.invincible  = Math.max(0, state.invincible  - dt);
      if (state.hitFlash    > 0) state.hitFlash    = Math.max(0, state.hitFlash    - dt * 3);
      if (state.attackFlash > 0) state.attackFlash = Math.max(0, state.attackFlash - dt * 4);
      if (state.attackCooldown > 0) state.attackCooldown = Math.max(0, state.attackCooldown - dt);
      if (state.noAxeFlash  > 0) state.noAxeFlash  = Math.max(0, state.noAxeFlash  - dt * 1.2);
      if (state.noPickaxeFlash > 0) state.noPickaxeFlash = Math.max(0, state.noPickaxeFlash - dt * 1.2);
      if (strengthActiveRef.current > 0) strengthActiveRef.current = Math.max(0, strengthActiveRef.current - dt);
      // Decay hitFlash on trees and stone deposits
      state.trees.forEach(tree => { if (tree.hitFlash > 0) tree.hitFlash = Math.max(0, tree.hitFlash - dt * 5); });
      (state.stoneDeposits ?? []).forEach(dep => { if (dep.hitFlash > 0) dep.hitFlash = Math.max(0, dep.hitFlash - dt * 5); });
      // Decay hitFlash on enemies (always — host handles it via updateForestEnemies,
      // but follower needs it too since hitFlash is set locally when we land hits)
      if (coOp && !isHost) {
        state.enemies.forEach(e => { if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4); });
      }

      // Enemies — host runs authoritative AI; follower uses positions pushed via onEnemySync.
      // If the follower hasn't received a sync for >600ms (host died or disconnected),
      // fall back to running enemy AI locally so enemies don't freeze.
      const followerSyncStale = coOp && !isHost &&
        (performance.now() - lastEnemySyncReceivedRef.current > 600);
      if (!coOp || isHost || followerSyncStale) {
        // Pass partner position so enemies chase the nearest of the two players
        const p2x = (coOp && stateRef.current.partnerVisible) ? stateRef.current.partnerX : null;
        const p2y = (coOp && stateRef.current.partnerVisible) ? stateRef.current.partnerY : null;
        updateForestEnemies(state.enemies, state.px, state.py, dt, t, p2x, p2y);

        // Broadcast compact enemy state to follower at ~10 Hz (host only)
        if (coOp && isHost && ts - lastEnemySyncRef.current > 100) {
          lastEnemySyncRef.current = ts;
          const snap = state.enemies.map(e => ({
            id: e.id,
            x:  Math.round(e.x),
            y:  Math.round(e.y),
            hp: e.hp,
            alive: e.alive,
            state: e.state,
            dir:   e.dir,
            attackCooldown: Math.round(e.attackCooldown * 100) / 100,
          }));
          sendEnemySyncRef.current?.(snap);
        }
      }

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

      // Broadcast position (only in co-op — no point sending if solo)
      if (coOp && ts - lastMoveRef.current > MOVE_THROTTLE && (dx !== 0 || dy !== 0 || state.jumpVY !== 0)) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing, state.jumpVY < 0 ? state.jumpVY : 0);
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
      drawPlayer(ctx, state.px - camX, state.py, state.facing, state.step, state.invincible, state.attackFlash, t, characterRef.current, equipmentRef.current?.weapon ?? null, state.jumpZ)
    });

    if (state.partnerVisible) {
      const partnerChar = partnerAppearanceRef.current?.character ?? { hair:"short", skin:"medium", outfit:"blue", hat:"none" };

      // Advance lerp — smoothly glide from last known position to new network snapshot
      if (state.partnerLerpT < 1) {
        state.partnerLerpT = Math.min(1, state.partnerLerpT + dt / Math.max(state.partnerLerpDur, 0.001));
        const ease = 1 - Math.pow(1 - state.partnerLerpT, 2);
        state.partnerRenderX = state.partnerFromX + (state.partnerToX - state.partnerFromX) * ease;
        state.partnerRenderY = state.partnerFromY + (state.partnerToY - state.partnerFromY) * ease;
      }

      // Walk animation: based on how fast the render position is moving
      const pdx = state.partnerRenderX - state.partnerPrevX;
      const pdy = state.partnerRenderY - state.partnerPrevY;
      const partnerMoving = Math.abs(pdx) > 0.3 || Math.abs(pdy) > 0.3;
      if (partnerMoving) {
        state.partnerStepTimer += dt;
        if (state.partnerStepTimer > 0.18) { state.partnerStep = (state.partnerStep + 1) % 4; state.partnerStepTimer = 0; }
      } else {
        state.partnerStep = 0; state.partnerStepTimer = 0;
      }
      state.partnerPrevX = state.partnerRenderX;
      state.partnerPrevY = state.partnerRenderY;

      const gpx = state.partnerRenderX - camX;
      const gpy = state.partnerRenderY;
      drawables.push({ sortY: gpy, draw: () => {
        drawPlayer(ctx, gpx, gpy, state.partnerFacing, state.partnerStep, 0, 0, t, partnerChar, partnerAppearanceRef.current?.equipment?.weapon ?? null, state.partnerJumpZ);
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
    const weaponDur = getWeaponDurability(equipmentRef.current, playerInvRef.current, hotbarRef.current);
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
  }

  // ── Keyboard + click + wheel listeners ─────────────────────────────────
  // Mount once. useRunLoop already owns canvas/RAF/resize/sound; this
  // effect only wires up input. All callbacks read from refs, so a stale
  // capture is fine.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        setPauseOpen(v => { pauseOpenRef.current = !v; return !v; });
        return;
      }
      if (tabMenuOpenRef.current) return; // swallow gameplay keys while menu open
      if (e.key === " ") {
        e.preventDefault();
        if (stateRef.current && stateRef.current.jumpZ === 0 && stateRef.current.jumpVY === 0) {
          stateRef.current.jumpVY = -220;
          // Broadcast jump immediately — don't wait for the throttled move broadcast
          sendRunMove(Math.round(stateRef.current.px), Math.round(stateRef.current.py), stateRef.current.facing, -220);
          lastMoveRef.current = performance.now();
        }
        return;
      }
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


    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("click",   onClick);
      canvas.removeEventListener("wheel",   onWheel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Pause / abandon overlay */}
      <PauseOverlay
        open={pauseOpen}
        theme="forest"
        runLabel="🌲 Forest Run"
        onResume={() => { setPauseOpen(false); pauseOpenRef.current = false; }}
        onAbandon={() => { setPauseOpen(false); pauseOpenRef.current = false; finishRun(stateRef.current); }}
      />
      {/* Hotbar at the bottom — mirrors HomesteadView */}
      <HotbarBar theme={__HB_THEME}
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
          onEquipmentUpdate={onEquipmentUpdate}
          hotbar={hotbar}
          onHotbarChange={onHotbarChange}
          onDropItem={dropItemAtPlayer}
        />
      )}
      <MobileControls
  keysRef={keysRef}
  onUse={() => { soundRef.current?.unlock(); doAttackRef.current?.(); }}
  onJump={mobileJump}
  onPause={() => { setPauseOpen(v => { pauseOpenRef.current = !v; return !v; }); }}
/>
    </div>
  );
}