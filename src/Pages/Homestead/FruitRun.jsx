// src/Pages/Homestead/FruitRun.jsx
// Peaceful fruit-picking run — no enemies, just gather!
// Architecture mirrors ForestRun: shared HotbarBar + RunTabMenu, real playerInventory,
// full 2-player co-op via useHearthroom, Tab menu with bag / chest / crafting / equipment.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  ORCHARD_W, ORCHARD_H, ORCHARD_GROUND_Y,
  generateFruitRun, FRUIT_LOOT_TABLE, rollLoot,
  seededRand,
} from "./gameEngine";
import {
  ITEMS, ITEM_ICONS,
  EQUIPPABLE, HOTBAR_ITEMS, PLACEABLES, UPGRADES,
  RECIPES,
  getEquipStats,
  HOTBAR_SIZE,
  INVENTORY_BASE_SLOTS,
  HOTBAR_BASE_SLOTS,
  canCraft, craftItem,
  expandedHandRecipes, canCraftByKey, craftItemByKey, resolveHandRecipeKey,
  addToPlayerInventory,
  normalizeChest,
  getWeaponDurability,
} from "./Items";
import { ItemIcon } from "./ItemIcon";
import { makeSounds } from "./audio_sounds";
import { RunTabMenu } from "./player_RunTabMenu";
import { drawPlayerLegacyRun as drawPlayer } from "./drawing_drawPlayer";

const PLAYER_SPEED  = 140;
const RUN_DURATION  = 150;
const PICKUP_R      = 26;
const LOOT_FLOAT_DUR = 1.4;
const TOAST_DUR      = 1.8;
const MOVE_THROTTLE  = 50;

// ─── Sound engine ─────────────────────────────────────────────────────────────

// makeSounds now lives in ./audio/sounds.js and takes a palette name.
// The palette for this run is "fruit".

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawOrchardBackground(ctx, camX, W, H, t) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyGrad.addColorStop(0, "#87ceeb");
  skyGrad.addColorStop(1, "#c8e6f0");
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H * 0.4);

  const groundGrad = ctx.createLinearGradient(0, H * 0.4, 0, H);
  groundGrad.addColorStop(0, "#7ec850");
  groundGrad.addColorStop(1, "#5a9632");
  ctx.fillStyle = groundGrad; ctx.fillRect(0, H * 0.4, W, H * 0.6);

  for (let col = 0; col < Math.ceil(W / 40) + 2; col++) {
    const wx = col * 40 - (camX % 40);
    const wc = Math.floor((col * 40 + Math.floor(camX / 40) * 40) / 40);
    const n  = ((wc * 997 + 42) & 0x7fffffff) / 0x7fffffff;
    if (n > 0.5) {
      ctx.fillStyle = n > 0.75 ? "#5a9632" : "#6db840";
      ctx.fillRect(wx, H * 0.4 + n * (H * 0.3), 40, 4);
    }
  }

  for (let i = 0; i < 5; i++) {
    const cx = ((i * 380 - camX * 0.15 + t * 8) % (W + 200)) - 60;
    const cy = 30 + i * 18;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.ellipse(cx, cy, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 28, cy + 4, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 24, cy + 6, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
  }

  for (let i = 0; i < 4; i++) {
    const bx = ((i * 280 + camX * 0.3 + t * 20 * (i + 1)) % (W + 60)) - 20;
    const by = H * 0.35 + Math.sin(t * 2 + i) * 30;
    const flap = Math.sin(t * 8 + i) > 0 ? 1 : -1;
    ctx.save(); ctx.globalAlpha = 0.7;
    const cols = ['#ff8fab','#f9c74f','#90e0ef','#c77dff'];
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.ellipse(bx - 5 * flap, by, 6, 4, -0.4 * flap, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + 5 * flap, by, 6, 4, 0.4 * flap, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawFruitTree(ctx, tree, camX, t) {
  const sx = tree.x - camX, sy = tree.y;
  if (!tree.alive) {
    ctx.fillStyle = "#7a4f2a"; ctx.fillRect(sx - 5, sy - 10, 10, 30);
    ctx.fillStyle = "#4a8030"; ctx.beginPath(); ctx.arc(sx, sy - 22, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.beginPath(); ctx.arc(sx, sy - 22, 20, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const shake = tree.shakeTime > 0 ? Math.sin(t * 20) * 3 * Math.min(1, tree.shakeTime) : 0;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(sx + 4, sy + 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8a5a2a"; ctx.fillRect(sx - 6 + shake, sy - 8, 12, 28);
  ctx.fillStyle = "#2d8a2d";
  ctx.beginPath(); ctx.arc(sx + shake, sy - 28, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3aa03a";
  ctx.beginPath(); ctx.arc(sx + shake - 10, sy - 38, 18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + shake + 12, sy - 34, 16, 0, Math.PI * 2); ctx.fill();
  const applePositions = [[-14,-28],[8,-36],[18,-22],[-8,-42],[0,-28]];
  for (const [ax, ay] of applePositions) {
    ctx.fillStyle = "#e83030";
    ctx.beginPath(); ctx.arc(sx + shake + ax, sy + ay, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c02020";
    ctx.beginPath(); ctx.arc(sx + shake + ax + 1, sy + ay + 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5a3010"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx + shake + ax, sy + ay - 5); ctx.lineTo(sx + shake + ax + 2, sy + ay - 9); ctx.stroke();
  }
}

function drawBush(ctx, bush, camX, t) {
  const sx = bush.x - camX, sy = bush.y;
  if (!bush.alive) return;
  const shake = bush.shakeTime > 0 ? Math.sin(t * 20) * 2 * Math.min(1, bush.shakeTime) : 0;
  if (bush.type === 'mushroom') {
    ctx.fillStyle = "#b83020";
    ctx.beginPath(); ctx.arc(sx + shake, sy - 4, 16, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath(); ctx.arc(sx + shake - 8 + i * 6, sy - 8, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e8d0a0"; ctx.fillRect(sx + shake - 5, sy - 4, 10, 12);
  } else {
    ctx.fillStyle = "#2a6820";
    ctx.beginPath(); ctx.arc(sx + shake, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + shake - 10, sy + 6, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + shake + 10, sy + 4, 11, 0, Math.PI * 2); ctx.fill();
    const berryPos = [[-8,-6],[4,-10],[12,-2],[-4,4],[8,2],[-12,2]];
    for (const [bx, by] of berryPos) {
      ctx.fillStyle = "#8020a0";
      ctx.beginPath(); ctx.arc(sx + shake + bx, sy + by, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFlowerPatch(ctx, flower, camX, t) {
  const sx = flower.x - camX, sy = flower.y;
  if (!flower.alive) return;
  const colors = ['#f9c74f','#ff8fab','#ffffff','#ff6b6b','#90e0ef'];
  for (let i = 0; i < 6; i++) {
    const n  = ((flower.x * 31 + flower.y * 7 + i * 13) & 0xffff) / 0xffff;
    const n2 = ((flower.x * 7 + flower.y * 31 + i * 17) & 0xffff) / 0xffff;
    const fx = sx - 18 + n * 36, fy = sy - 12 + n2 * 24;
    const sway = Math.sin(t * 2 + i + flower.x * 0.01) * 2;
    ctx.fillStyle = "#5a9632"; ctx.fillRect(fx + sway - 1, fy, 2, 8);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(fx + sway, fy - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
}

// drawPlayer is now shared in ./drawing/drawPlayer.js (imported below).

function drawHUD(ctx, W, H, state, items, t, slotsUsed, slotsTotal) {
  ctx.fillStyle = "rgba(12,8,4,0.88)"; ctx.fillRect(0, 0, W, 32);
  // HP (none for fruit run — peaceful, no enemies)
  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#a0e870";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);
  // Slot indicator
  ctx.textAlign = "left"; ctx.font = "10px monospace";
  ctx.fillStyle = slotsUsed >= slotsTotal ? "rgba(255,120,80,0.9)" : "rgba(200,240,120,0.6)";
  ctx.fillText(`🎒 ${slotsUsed}/${slotsTotal}`, 14, 16);
  // Key hints bottom bar
  ctx.fillStyle = "rgba(12,8,4,0.72)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(200,240,160,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD move  ·  walk near plants to harvest  ·  [Tab] menu  ·  [Esc] home", W / 2, H - 13);
}

// ─── HotbarBar (same visual as ForestRun) ─────────────────────────────────────

// HotbarBar (now <Hotbar/>) is shared from ./player/Hotbar.jsx — imported below.

// ─── Run Tab Menu ─────────────────────────────────────────────────────────────

// RUN_TABS and StatPill are now shared with the other runs (and HomesteadView).
import { Hotbar as HotbarBar } from "./player_Hotbar";
import { PauseOverlay } from "./runs_PauseOverlay";
const __HB_THEME = "fruit";

// RunTabMenu is now shared from ./player/RunTabMenu.jsx — imported above.

// ─── Component ────────────────────────────────────────────────────────────────

export default function FruitRun({
  room, seed, coOp = false, onRunComplete,
  character, equipment, onEquipItem,
  onEquipmentUpdate,
  hotbar, onHotbarChange,
  hotbarSlots, onHotbarSlotsUpdate,
  playerInventory, onPlayerInventoryUpdate,
  chest,
  onCharacterUpdate,
}) {
  const canvasRef       = useRef(null);
  const rafRef          = useRef(null);
  const keysRef         = useRef({});
  const stateRef        = useRef(null);
  const soundRef        = useRef(null);
  const lastMoveRef     = useRef(0);
  const randRef         = useRef(seededRand(seed ?? Date.now()));
  const lootFloatsRef   = useRef([]);
  const toastRef        = useRef([]);
  const droppedItemsRef = useRef([]);

  const equipmentRef        = useRef(equipment ?? {});
  const characterRef        = useRef(character ?? {});
  const hotbarRef           = useRef(hotbar ?? []);
  const hotbarSlotsRef      = useRef(hotbarSlots ?? HOTBAR_BASE_SLOTS);
  const playerInvRef        = useRef(playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS });
  const chestRef            = useRef(normalizeChest(chest));
  const partnerAppearanceRef = useRef({ character: null, equipment: null });

  useEffect(() => { equipmentRef.current   = equipment   ?? {}; }, [equipment]);
  useEffect(() => { characterRef.current   = character   ?? {}; }, [character]);
  useEffect(() => { hotbarRef.current      = hotbar      ?? []; }, [hotbar]);
  useEffect(() => { hotbarSlotsRef.current = hotbarSlots ?? HOTBAR_BASE_SLOTS; }, [hotbarSlots]);
  useEffect(() => { playerInvRef.current   = playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS }; }, [playerInventory]);
  useEffect(() => { chestRef.current       = normalizeChest(chest); }, [chest]);

  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
  const selectedSlotRef = useRef(0);
  useEffect(() => { selectedSlotRef.current = selectedHotbarSlot; }, [selectedHotbarSlot]);

  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const [activeTab,   setActiveTab]   = useState("inventory");
  const tabMenuOpenRef = useRef(false);
  useEffect(() => { tabMenuOpenRef.current = tabMenuOpen; }, [tabMenuOpen]);

  // Pause / abandon overlay (shown when player presses Escape mid-run)
  const [pauseOpen, setPauseOpen] = useState(false);
  const pauseOpenRef = useRef(false);
  useEffect(() => { pauseOpenRef.current = pauseOpen; }, [pauseOpen]);

  const runDeltaRef  = useRef({});
  const startInvRef  = useRef({});

  const pushToast = useCallback((text, color) => {
    toastRef.current.push({ text, born: performance.now(), color });
  }, []);

  const pushLootFloat = useCallback((text, worldX, worldY, color) => {
    lootFloatsRef.current.push({ text, worldX, worldY, born: performance.now(), color });
  }, []);

  const tryGainItem = useCallback((itemId, qty) => {
    const inv = playerInvRef.current ?? { items:{}, slots: INVENTORY_BASE_SLOTS };
    const { next, overflow } = addToPlayerInventory(inv, itemId, qty);
    const overflowQty = overflow?.[itemId] ?? 0;
    const gained = qty - overflowQty;
    if (gained > 0) {
      runDeltaRef.current[itemId] = (runDeltaRef.current[itemId] ?? 0) + gained;
      onPlayerInventoryUpdate?.(next);
      playerInvRef.current = next;
    }
    return { gained, overflowQty };
  }, [onPlayerInventoryUpdate]);

  const dropItemAtPlayer = useCallback((itemId, qty) => {
    const state = stateRef.current;
    if (!state) return;
    const DROP_DIST = 36;
    const facingOffset = {
      right: { ox: DROP_DIST, oy: 0 }, left: { ox: -DROP_DIST, oy: 0 },
      up: { ox: 0, oy: -DROP_DIST }, down: { ox: 0, oy: DROP_DIST },
    }[state.facing] ?? { ox: DROP_DIST, oy: 0 };
    droppedItemsRef.current.push({
      id: `dropped_${itemId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      item: itemId, qty,
      x: state.px + facingOffset.ox, y: state.py + facingOffset.oy,
      born: performance.now(),
    });
    soundRef.current?.drop?.();
    pushLootFloat(`-${qty} ${ITEMS[itemId]?.label ?? itemId}`, state.px, state.py - 18, "#ff9080");
  }, [pushLootFloat]);

  const selectHotbarSlot = useCallback((idx) => {
    setSelectedHotbarSlot(idx);
    selectedSlotRef.current = idx;
  }, []);

  const useHotbarItem = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.over) return;
    const hb = hotbarRef.current;
    const slot = selectedSlotRef.current;
    const entry = hb?.[slot];
    if (!entry) return;
    const info = HOTBAR_ITEMS[entry.item];
    if (!info?.useEffect?.heal) return;
    pushLootFloat(`used ${entry.item}`, state.px, state.py - 20, "#a0f060");
    const newHb = [...hb];
    const newQty = (entry.qty ?? 1) - 1;
    newHb[slot] = newQty > 0 ? { ...entry, qty: newQty } : null;
    onHotbarChange?.(newHb);
    soundRef.current?.pickup();
  }, [onHotbarChange, pushLootFloat]);

  const sendPlayerAppearanceRef = useRef(null);

  const handlers = useRef({
    onConnected: () => {
      setTimeout(() => {
        sendPlayerAppearanceRef.current?.(characterRef.current, equipmentRef.current, hotbarRef.current);
      }, 80);
    },
    onRunMove: ({ x, y, facing }) => {
      if (stateRef.current) {
        stateRef.current.partnerX = x;
        stateRef.current.partnerY = y;
        stateRef.current.partnerFacing = facing;
        stateRef.current.partnerVisible = true;
      }
    },
    onPlayerAppearance: ({ character: ch, equipment: eq }) => {
      partnerAppearanceRef.current = { character: ch, equipment: eq };
    },
  }).current;

  const { sendRunMove, sendRunComplete, sendPlayerAppearance } =
    useHearthroom(room?.id ?? null, handlers, ":run");

  useEffect(() => { sendPlayerAppearanceRef.current = sendPlayerAppearance; }, [sendPlayerAppearance]);
  useEffect(() => {
    sendPlayerAppearance(character, equipment, hotbar);
  }, [character, equipment, hotbar]); // eslint-disable-line react-hooks/exhaustive-deps

  function initState() {
    const { trees, bushes, flowers } = generateFruitRun(seed ?? Date.now(), coOp);
    return {
      px: 80, py: ORCHARD_H / 2,
      facing: "right",
      step: 0, stepTimer: 0,
      elapsed: 0,
      harvested: {},
      over: false,
      trees, bushes, flowers,
      partnerX: 0, partnerY: 0, partnerFacing: "right", partnerVisible: false,
      lastTime: performance.now(),
      camX: 0,
    };
  }

  function finishRun(state) {
    if (state.over) return;
    state.over = true;
    const currentItems = playerInvRef.current?.items ?? {};
    const startItems   = startInvRef.current ?? {};
    const delta = {};
    const allKeys = new Set([...Object.keys(currentItems), ...Object.keys(startItems)]);
    for (const key of allKeys) {
      const gained = (currentItems[key] ?? 0) - (startItems[key] ?? 0);
      if (gained > 0) delta[key] = gained;
    }
    sendRunComplete({ ...delta, kills: 0 });
    // Pass final equipment state so the parent can persist durability changes.
    onRunComplete?.({
      _alreadyApplied: true,
      _delta: delta,
      kills: 0,
      _finalEquipment: equipmentRef.current,
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundRef.current = makeSounds("fruit");

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = initState();
    lootFloatsRef.current = [];
    toastRef.current = [];
    droppedItemsRef.current = [];
    runDeltaRef.current = {};
    startInvRef.current = { ...(playerInvRef.current?.items ?? {}) };

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (e.key === " ") e.preventDefault();
      if (e.key === "Escape") {
        if (tabMenuOpenRef.current) { setTabMenuOpen(false); return; }
        setPauseOpen(v => { pauseOpenRef.current = !v; return !v; });
      }
      if (e.key === "Tab") { e.preventDefault(); setTabMenuOpen(v => !v); setActiveTab("inventory"); }
      if (e.key >= "1" && e.key <= "6") selectHotbarSlot(parseInt(e.key) - 1);
      if (e.key === "e" || e.key === "E" || e.key === "f" || e.key === "F") useHotbarItem();
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };
    const onWheel = (e) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("wheel",   onWheel, { passive: false });

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state || state.over) return;
      if (tabMenuOpenRef.current || pauseOpenRef.current) return; // pause when menu or pause overlay is open

      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t = ts / 1000;

      state.elapsed += dt;
      if (state.elapsed >= RUN_DURATION) { finishRun(state); return; }

      let dx = 0, dy = 0;
      if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
      if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; state.facing = "up"; }
      if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; state.facing = "down"; }
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      state.px = Math.max(20, Math.min(ORCHARD_W - 20, state.px + dx * PLAYER_SPEED * dt));
      state.py = Math.max(ORCHARD_GROUND_Y + 10, Math.min(ORCHARD_H - 30, state.py + dy * PLAYER_SPEED * dt));

      if (dx !== 0 || dy !== 0) {
        state.stepTimer += dt;
        if (state.stepTimer > 0.18) { state.stepTimer = 0; state.step = (state.step + 1) % 4; }
      } else { state.step = 0; state.stepTimer = 0; }

      // Shake timers
      for (const node of [...state.trees, ...state.bushes]) {
        if (node.shakeTime > 0) node.shakeTime = Math.max(0, node.shakeTime - dt * 2);
      }

      // Auto-harvest when close
      for (const tree of state.trees) {
        if (!tree.alive) continue;
        if (Math.hypot(state.px - tree.x, state.py - tree.y) < PICKUP_R) {
          tree.alive = false; tree.shakeTime = 0.6;
          soundRef.current?.pluck();
          const drops = rollLoot(FRUIT_LOOT_TABLE.apple_tree, randRef.current);
          drops.forEach((d, i) => {
            const { gained, overflowQty } = tryGainItem(d.item, d.qty);
            state.harvested[d.item] = (state.harvested[d.item] ?? 0) + (gained);
            if (gained > 0) pushLootFloat(`+${gained} ${ITEMS[d.item]?.label ?? d.item}`, tree.x + (i%2===0?-14:14), tree.y - i * 16);
            if (overflowQty > 0) pushToast(`🎒 bag full! ${ITEMS[d.item]?.label ?? d.item} dropped`, "#ff9080");
          });
        }
      }
      for (const bush of state.bushes) {
        if (!bush.alive) continue;
        if (Math.hypot(state.px - bush.x, state.py - bush.y) < PICKUP_R - 4) {
          bush.alive = false; bush.shakeTime = 0.5;
          soundRef.current?.collect();
          const drops = rollLoot(FRUIT_LOOT_TABLE[bush.type], randRef.current);
          drops.forEach((d, i) => {
            const { gained, overflowQty } = tryGainItem(d.item, d.qty);
            state.harvested[d.item] = (state.harvested[d.item] ?? 0) + gained;
            if (gained > 0) pushLootFloat(`+${gained} ${ITEMS[d.item]?.label ?? d.item}`, bush.x + (i%2===0?-14:14), bush.y - i * 14);
            if (overflowQty > 0) pushToast(`🎒 bag full! ${ITEMS[d.item]?.label ?? d.item} dropped`, "#ff9080");
          });
        }
      }
      for (const fl of state.flowers) {
        if (!fl.alive) continue;
        if (Math.hypot(state.px - fl.x, state.py - fl.y) < PICKUP_R - 6) {
          fl.alive = false;
          soundRef.current?.collect();
          const drops = rollLoot(FRUIT_LOOT_TABLE.flower_patch, randRef.current);
          drops.forEach((d, i) => {
            const { gained, overflowQty } = tryGainItem(d.item, d.qty);
            state.harvested[d.item] = (state.harvested[d.item] ?? 0) + gained;
            if (gained > 0) pushLootFloat(`+${gained} ${ITEMS[d.item]?.label ?? d.item}`, fl.x, fl.y - i * 14);
            if (overflowQty > 0) pushToast(`🎒 bag full! ${ITEMS[d.item]?.label ?? d.item} dropped`, "#ff9080");
          });
        }
      }

      // Auto-pickup dropped items
      for (const drop of droppedItemsRef.current) {
        if (drop.collected) continue;
        if (Math.hypot(state.px - drop.x, state.py - drop.y) < 20) {
          const { gained } = tryGainItem(drop.item, drop.qty);
          if (gained > 0) { drop.collected = true; soundRef.current?.pickup(); }
        }
      }
      droppedItemsRef.current = droppedItemsRef.current.filter(d => !d.collected && performance.now() - d.born < 60000);

      // Camera
      const targetCamX = Math.max(0, Math.min(ORCHARD_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      if (ts - lastMoveRef.current > MOVE_THROTTLE) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // ── DRAW ──────────────────────────────────────────────────────────
      const camX = state.camX;
      drawOrchardBackground(ctx, camX, W, H, t);

      // Dropped items on ground
      for (const drop of droppedItemsRef.current) {
        if (drop.collected) continue;
        const sx = drop.x - camX;
        if (sx < -20 || sx > W + 20) continue;
        const bob = Math.sin(t * 2.5 + drop.born * 0.001) * 2;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(sx, drop.y + 6, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.35; ctx.fillStyle = "#a0f060"; ctx.beginPath(); ctx.arc(sx, drop.y + bob - 2, 11, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(ITEM_ICONS[drop.item] ?? "📦", sx, drop.y + bob - 2);
        if (drop.qty > 1) { ctx.fillStyle = "#a0f060"; ctx.font = "bold 9px monospace"; ctx.fillText(`×${drop.qty}`, sx + 8, drop.y + bob + 8); }
        ctx.restore();
      }

      const drawables = [];
      for (const fl of state.flowers) {
        if (!fl.alive) continue;
        const sx = fl.x - camX;
        if (sx < -60 || sx > W + 60) continue;
        drawables.push({ sortY: fl.y, draw: () => drawFlowerPatch(ctx, fl, camX, t) });
      }
      for (const bush of state.bushes) {
        if (!bush.alive) continue;
        const sx = bush.x - camX;
        if (sx < -60 || sx > W + 60) continue;
        drawables.push({ sortY: bush.y + 14, draw: () => drawBush(ctx, bush, camX, t) });
      }
      for (const tree of state.trees) {
        const sx = tree.x - camX;
        if (sx < -80 || sx > W + 80) continue;
        drawables.push({ sortY: tree.y + 24, draw: () => drawFruitTree(ctx, tree, camX, t) });
      }
      drawables.push({ sortY: state.py, draw: () =>
        drawPlayer(ctx, state.px - camX, state.py, state.facing, state.step, 0, 0, t, characterRef.current, null)
      });

      // Partner ghost
      if (state.partnerVisible) {
        const gpx = state.partnerX - camX, gpy = state.partnerY;
        const pa = partnerAppearanceRef.current;
        drawables.push({ sortY: gpy, draw: () => {
          ctx.save(); ctx.globalAlpha = 0.5;
          drawPlayer(ctx, gpx, gpy, state.partnerFacing, 0, 0, 0, t, pa.character, null);
          ctx.restore();
          ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.font = "9px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("P2", gpx, gpy - 26);
        }});
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      // Floating loot text
      const now = performance.now();
      lootFloatsRef.current = lootFloatsRef.current.filter(lf => now - lf.born < LOOT_FLOAT_DUR * 1000);
      for (const lf of lootFloatsRef.current) {
        const age = (now - lf.born) / (LOOT_FLOAT_DUR * 1000);
        ctx.save(); ctx.globalAlpha = 1 - age;
        ctx.fillStyle = lf.color ?? "#a0f060"; ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, lf.worldX - camX, lf.worldY - age * 38);
        ctx.restore();
      }

      // Toasts
      toastRef.current = toastRef.current.filter(ts2 => now - ts2.born < TOAST_DUR * 1000);
      let ty = 50;
      for (const toast of toastRef.current) {
        const age = (now - toast.born) / (TOAST_DUR * 1000);
        const alpha = age < 0.85 ? 1 : (1 - age) / 0.15;
        ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = "bold 11px monospace";
        const tw = ctx.measureText(toast.text).width;
        ctx.fillStyle = "rgba(10,8,4,0.88)";
        ctx.beginPath(); ctx.roundRect(W / 2 - tw/2 - 12, ty - 12, tw + 24, 22, 6); ctx.fill();
        ctx.fillStyle = toast.color ?? "#f5c060";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(toast.text, W / 2, ty - 1);
        ctx.restore();
        ty += 28;
      }

      // HUD
      const items = playerInvRef.current?.items ?? {};
      const slotsUsed  = Object.values(items).filter(v => v > 0).length;
      const slotsTotal = playerInvRef.current?.slots ?? INVENTORY_BASE_SLOTS;
      drawHUD(ctx, W, H, state, items, t, slotsUsed, slotsTotal);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("wheel",   onWheel);
    };
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const onUseSlotIdx = useCallback((idx) => {
    setSelectedHotbarSlot(idx);
    selectedSlotRef.current = idx;
    useHotbarItem();
  }, [useHotbarItem]);

  return (
    <div style={{ width:"100%", height:"100svh", background:"#5a9632", position:"relative", userSelect:"none" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
      />
      {/* Pause / abandon overlay */}
      <PauseOverlay
        open={pauseOpen}
        theme="fruit"
        runLabel="🍎 Fruit Run"
        onResume={() => { setPauseOpen(false); pauseOpenRef.current = false; }}
        onAbandon={() => { setPauseOpen(false); pauseOpenRef.current = false; finishRun(stateRef.current); }}
      />
      <HotbarBar theme={__HB_THEME}
        hotbar={hotbar ?? []}
        hotbarSlots={hotbarSlots ?? HOTBAR_BASE_SLOTS}
        equipment={equipment ?? {}}
        selectedIdx={selectedHotbarSlot}
        onSelectIdx={selectHotbarSlot}
        onOpenMenu={(tab) => { setActiveTab(tab ?? "inventory"); setTabMenuOpen(true); }}
        onUseSlot={onUseSlotIdx}
      />
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