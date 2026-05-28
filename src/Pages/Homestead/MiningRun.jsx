// src/Pages/Homestead/MiningRun.jsx
// Cave mining run — architecture mirrors ForestRun exactly:
// shared HotbarBar + RunTabMenu, real playerInventory (slot-capped),
// full 2-player co-op, Tab menu with bag / chest / crafting / equipment.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  MINE_W, MINE_H, BAT_R, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_CD, ENEMY_DAMAGE,
  generateMiningRun, MINE_LOOT_TABLE, rollLoot,
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
  getWeaponDurability, drainWeaponDurability,
} from "./Items";
import { ItemIcon } from "./ItemIcon";
import { makeSounds } from "./audio_sounds";
import { RunTabMenu } from "./player_RunTabMenu";
import { drawPlayerLegacyRun as drawPlayer } from "./drawing_drawPlayer";

const PLAYER_SPEED   = 120;
const PLAYER_HP      = 5;
const INVINCIBLE_S   = 1.2;
const RUN_DURATION   = 180;
const ATTACK_REACH   = 40;
const LOOT_FLOAT_DUR = 1.4;
const TOAST_DUR      = 1.8;
const MOVE_THROTTLE  = 50;

// ─── Sound engine ─────────────────────────────────────────────────────────────

// makeSounds now lives in ./audio/sounds.js and takes a palette name.
// The palette for this run is "mining".

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawCaveBackground(ctx, camX, W, H, t) {
  ctx.fillStyle = "#1a1410"; ctx.fillRect(0, 0, W, H);
  const tileSize = 48;
  for (let row = 0; row < Math.ceil(H / tileSize) + 1; row++) {
    for (let col = 0; col < Math.ceil(W / tileSize) + 2; col++) {
      const wx  = col * tileSize - (camX % tileSize);
      const wy  = row * tileSize;
      const wc  = Math.floor((col * tileSize + Math.floor(camX / tileSize) * tileSize) / tileSize);
      const n   = ((wc * 773 + row * 41 + 13) & 0x7fffffff) / 0x7fffffff;
      ctx.fillStyle = n > 0.7 ? "#221c18" : n > 0.4 ? "#1e1814" : "#1a1410";
      ctx.fillRect(wx, wy, tileSize - 1, tileSize - 1);
      if (n > 0.6) {
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(wx + n * 20, wy + n * 20); ctx.lineTo(wx + n * 40, wy + n * 36); ctx.stroke();
      }
    }
  }
  const torchSpacing = 320;
  for (let i = 0; i < Math.ceil(MINE_W / torchSpacing) + 2; i++) {
    const tx = i * torchSpacing - (camX % torchSpacing) + (((i * 137) % 60) - 30);
    const flicker = 0.7 + 0.3 * Math.sin(t * 7 + i * 2.3);
    const grd = ctx.createRadialGradient(tx, H / 2, 0, tx, H / 2, 120 * flicker);
    grd.addColorStop(0, `rgba(255,180,60,${0.18 * flicker})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7a4f2a"; ctx.fillRect(tx - 4, 12, 8, 18);
    ctx.fillStyle = `rgba(255,180,60,${0.9 * flicker})`;
    ctx.beginPath(); ctx.arc(tx, 10, 5 * flicker, 0, Math.PI * 2); ctx.fill();
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawRockNode(ctx, rock, camX, t) {
  const sx = rock.x - camX, sy = rock.y;
  if (sx < -60 || sx > 9999) return;
  const shake = rock.hitFlash > 0 ? Math.sin(t * 40) * 2 * rock.hitFlash : 0;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(sx + 4, sy + 18, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  const col = rock.type === 'gem'
    ? (rock.hitFlash > 0 ? "#ffffff" : "#4a90d9")
    : rock.type === 'crystal'
    ? (rock.hitFlash > 0 ? "#ffffff" : "#9a60c0")
    : (rock.hitFlash > 0 ? "#ffffff" : "#807060");
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(sx + shake, sy, 18, 0, Math.PI * 2); ctx.fill();
  if (rock.type === 'gem' || rock.type === 'crystal') {
    ctx.fillStyle = rock.type === 'gem' ? "#88ccff" : "#cc88ff";
    ctx.beginPath(); ctx.arc(sx + shake - 5, sy - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx + shake, sy - 14); ctx.lineTo(sx + shake + 8, sy + 4); ctx.lineTo(sx + shake - 8, sy + 4); ctx.closePath(); ctx.stroke();
  }
  if (rock.hp < rock.maxHp) {
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < rock.maxHp - rock.hp; i++) {
      const angle = (i / rock.maxHp) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(sx + shake, sy); ctx.lineTo(sx + shake + Math.cos(angle) * 18, sy + Math.sin(angle) * 18); ctx.stroke();
    }
  }
  if (rock.hp < rock.maxHp) {
    const bw = 36, bh = 4;
    const bx = sx - bw / 2, by = sy - 28;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#a0a0c0"; ctx.fillRect(bx, by, bw * (rock.hp / rock.maxHp), bh);
  }
}

function drawBat(ctx, bat, camX, t) {
  const sx = bat.x - camX, sy = bat.y;
  const wingFlap = Math.sin(t * 12 + bat.x * 0.05);
  const blink = bat.hitFlash > 0;
  ctx.save(); ctx.globalAlpha = blink ? 1 : 0.85;
  ctx.fillStyle = blink ? "#ffffff" : "#3a2040";
  const ww = 16 + wingFlap * 8;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - ww, sy - 8, sx - ww - 4, sy + 6); ctx.quadraticCurveTo(sx - ww * 0.5, sy + 4, sx, sy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + ww, sy - 8, sx + ww + 4, sy + 6); ctx.quadraticCurveTo(sx + ww * 0.5, sy + 4, sx, sy); ctx.fill();
  ctx.fillStyle = blink ? "#ffffff" : "#2a1830";
  ctx.beginPath(); ctx.ellipse(sx, sy, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ff4040";
  ctx.beginPath(); ctx.arc(sx - 3, sy - 3, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 3, sy - 3, 2, 0, Math.PI * 2); ctx.fill();
  const bw = 24, bh = 3, bx = sx - bw / 2, by = sy - 22;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = bat.hp <= 1 ? "#e24b4a" : "#9b59b6";
  ctx.fillRect(bx, by, bw * (bat.hp / bat.maxHp), bh);
  ctx.restore();
}

// drawPlayer is now shared in ./drawing/drawPlayer.js (imported below).

function drawDroppedItem(ctx, drop, camX, t) {
  const sx = drop.x - camX, sy = drop.y;
  const bob = Math.sin(t * 2.5 + drop.born * 0.001) * 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(sx, sy + 6, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#f5e6a0"; ctx.beginPath(); ctx.arc(sx, sy + bob - 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(ITEM_ICONS[drop.item] ?? "📦", sx, sy + bob - 2);
  if (drop.qty > 1) { ctx.fillStyle = "rgba(245,230,160,0.95)"; ctx.font = "bold 9px monospace"; ctx.fillText(`×${drop.qty}`, sx + 8, sy + bob + 8); }
  ctx.restore();
}

function drawHUD(ctx, W, H, state, items, t, slotsUsed, slotsTotal, weaponDur) {
  ctx.fillStyle = "rgba(10,8,4,0.92)"; ctx.fillRect(0, 0, W, 32);
  // HP hearts
  const maxHp = state.maxHp ?? PLAYER_HP;
  for (let i = 0; i < maxHp; i++) {
    ctx.beginPath(); ctx.arc(16 + i * 22, 16, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < state.hp ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.1)"; ctx.fill();
  }
  // Timer
  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#e0c880";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);
  // Slot indicator
  ctx.textAlign = "right"; ctx.font = "10px monospace";
  ctx.fillStyle = slotsUsed >= slotsTotal ? "rgba(255,120,80,0.9)" : "rgba(220,200,140,0.6)";
  ctx.fillText(`🎒 ${slotsUsed}/${slotsTotal}`, W - 14, 16);
  // Weapon durability bar
  if (weaponDur) {
    const [cur, max] = weaponDur;
    const pct = cur / max;
    const bw = 60, bh = 5, bx = 16, by = H - 44;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    const barCol = pct > 0.5 ? "#80d860" : pct > 0.25 ? "#e8c840" : "#e04840";
    ctx.fillStyle = barCol; ctx.fillRect(bx, by, Math.round(bw * pct), bh);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(200,210,160,0.55)"; ctx.font = "8px monospace"; ctx.textBaseline = "middle";
    ctx.fillText(`⚒ ${cur}/${max}`, bx + bw + 5, by + 2);
  }
  // Bottom bar
  ctx.fillStyle = "rgba(10,8,4,0.75)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(230,210,160,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD move  ·  click/space mine & attack  ·  1-6 hotbar  ·  [Tab] menu  ·  [Esc] home", W / 2, H - 13);
}

// ─── HotbarBar (same visual as ForestRun) ─────────────────────────────────────

// HotbarBar (now <Hotbar/>) is shared from ./player/Hotbar.jsx — imported below.

// ─── Run Tab Menu ─────────────────────────────────────────────────────────────

// RUN_TABS and StatPill are now shared with the other runs (and HomesteadView).
import { Hotbar as HotbarBar } from "./player_Hotbar";
import { PauseOverlay } from "./runs_PauseOverlay";
const __HB_THEME = "mining";

// RunTabMenu is now shared from ./player/RunTabMenu.jsx — imported above.

// ─── Component ────────────────────────────────────────────────────────────────

export default function MiningRun({
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
  const doAttackRef     = useRef(null);

  const equipmentRef        = useRef(equipment ?? {});
  const onEquipmentUpdateRef = useRef(onEquipmentUpdate);
  const characterRef        = useRef(character ?? {});
  const hotbarRef           = useRef(hotbar ?? []);
  const hotbarSlotsRef      = useRef(hotbarSlots ?? HOTBAR_BASE_SLOTS);
  const playerInvRef        = useRef(playerInventory ?? { items:{}, slots: INVENTORY_BASE_SLOTS });
  const chestRef            = useRef(normalizeChest(chest));
  const partnerAppearanceRef = useRef({ character: null, equipment: null });

  useEffect(() => { equipmentRef.current        = equipment        ?? {}; }, [equipment]);
  useEffect(() => { onEquipmentUpdateRef.current = onEquipmentUpdate; }, [onEquipmentUpdate]);
  useEffect(() => { characterRef.current        = character        ?? {}; }, [character]);
  useEffect(() => { hotbarRef.current           = hotbar           ?? []; }, [hotbar]);
  useEffect(() => { hotbarSlotsRef.current      = hotbarSlots      ?? HOTBAR_BASE_SLOTS; }, [hotbarSlots]);
  useEffect(() => { playerInvRef.current        = playerInventory  ?? { items:{}, slots: INVENTORY_BASE_SLOTS }; }, [playerInventory]);
  useEffect(() => { chestRef.current            = normalizeChest(chest); }, [chest]);

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

  const RUN_WEAPONS = { axe: true, pickaxe: true };

  const selectHotbarSlot = useCallback((idx) => {
    setSelectedHotbarSlot(idx);
    selectedSlotRef.current = idx;
    const entry = hotbarRef.current?.[idx];
    if (entry && RUN_WEAPONS[entry.item]) {
      onEquipItem?.(entry.item);
    }
  }, [onEquipItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const useHotbarItem = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.over) return;
    if (tabMenuOpenRef.current) return;
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
    if (info.useEffect?.heal) {
      const equipStats = getEquipStats(equipmentRef.current);
      const maxHp = PLAYER_HP + (equipStats.maxHpBonus ?? 0);
      if (state.hp >= maxHp) { pushToast("already at full health", "#f5c060"); soundRef.current?.deny?.(); return; }
      state.hp = Math.min(maxHp, state.hp + info.useEffect.heal);
      const newHb = [...hb];
      const newQty = (entry.qty ?? 1) - 1;
      newHb[slot] = newQty > 0 ? { ...entry, qty: newQty } : null;
      onHotbarChange?.(newHb);
      soundRef.current?.pickup();
      pushLootFloat(`+${info.useEffect.heal} HP`, state.px, state.py - 20, "#80f080");
    }
  }, [onHotbarChange, pushToast, pushLootFloat]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendPlayerAppearanceRef = useRef(null);
  const sendEnemyHitRef        = useRef(null);
  const sendEnemyKilledRef     = useRef(null);
  const sendDepositHitRef      = useRef(null);
  const sendDepositKilledRef   = useRef(null);
  const sendRunStateSyncRef    = useRef(null);

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
    onDepositHit: ({ id, hp }) => {
      if (!stateRef.current) return;
      const d = [...(stateRef.current.rocks ?? []), ...(stateRef.current.gems ?? [])].find(r => r.id === id);
      if (d) { d.hp = hp; d.hitFlash = 1; }
    },
    onDepositKilled: ({ id }) => {
      if (!stateRef.current) return;
      const d = [...(stateRef.current.rocks ?? []), ...(stateRef.current.gems ?? [])].find(r => r.id === id);
      if (d) { d.alive = false; d.hp = 0; d.hitFlash = 0; }
    },
    onRunStateRequest: () => {
      if (!stateRef.current) return;
      const deadEnemyIds  = stateRef.current.enemies.filter(e => !e.alive).map(e => e.id);
      const deadDepositIds = [...(stateRef.current.rocks ?? []), ...(stateRef.current.gems ?? [])].filter(r => !r.alive).map(r => r.id);
      sendRunStateSyncRef.current?.({ collectedIds:[], deadEnemyIds, deadTreeIds:[], deadDepositIds });
    },
    onRunStateSync: ({ deadEnemyIds, deadDepositIds }) => {
      if (!stateRef.current) return;
      deadEnemyIds?.forEach(id => {
        const e = stateRef.current.enemies.find(en => en.id === id);
        if (e) { e.alive = false; e.hp = 0; }
      });
      deadDepositIds?.forEach(id => {
        const d = [...(stateRef.current.rocks ?? []), ...(stateRef.current.gems ?? [])].find(r => r.id === id);
        if (d) { d.alive = false; d.hp = 0; }
      });
    },
  }).current;

  const { sendRunMove, sendEnemyHit, sendEnemyKilled,
          sendDepositHit, sendDepositKilled,
          sendRunComplete, sendRunStateRequest, sendRunStateSync,
          sendPlayerAppearance } =
    useHearthroom(room?.id ?? null, handlers, ":run");

  useEffect(() => { sendPlayerAppearanceRef.current = sendPlayerAppearance; }, [sendPlayerAppearance]);
  useEffect(() => { sendEnemyHitRef.current        = sendEnemyHit; }, [sendEnemyHit]);
  useEffect(() => { sendEnemyKilledRef.current     = sendEnemyKilled; }, [sendEnemyKilled]);
  useEffect(() => { sendDepositHitRef.current      = sendDepositHit; }, [sendDepositHit]);
  useEffect(() => { sendDepositKilledRef.current   = sendDepositKilled; }, [sendDepositKilled]);
  useEffect(() => { sendRunStateSyncRef.current    = sendRunStateSync; }, [sendRunStateSync]);

  useEffect(() => {
    sendPlayerAppearance(character, equipment, hotbar);
  }, [character, equipment, hotbar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!coOp) return;
    let attempts = 0, timer;
    function tryRequest() {
      if (stateRef.current?.partnerVisible || attempts >= 6) return;
      sendRunStateRequest(); attempts++;
      timer = setTimeout(tryRequest, 1500);
    }
    timer = setTimeout(tryRequest, 900);
    return () => clearTimeout(timer);
  }, [coOp]); // eslint-disable-line react-hooks/exhaustive-deps

  function initState() {
    const { rocks, gems, enemies } = generateMiningRun(seed ?? Date.now(), coOp);
    const equipStats = getEquipStats(equipmentRef.current);
    const maxHp = PLAYER_HP + (equipStats.maxHpBonus ?? 0);
    return {
      px: 80, py: MINE_H / 2, facing: "right",
      step: 0, stepTimer: 0,
      hp: maxHp, maxHp, invincible: 0, hitFlash: 0,
      attackFlash: 0, attackCooldown: 0,
      camX: 0, elapsed: 0, kills: 0, over: false,
      noPickaxeFlash: 0,
      rocks, gems, enemies,
      partnerX: 0, partnerY: 0, partnerFacing: "right", partnerVisible: false,
      lastTime: performance.now(),
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
    sendRunComplete({ ...delta, kills: state.kills });
    // Pass final equipment state so the parent can persist durability changes.
    onRunComplete?.({
      _alreadyApplied: true,
      _delta: delta,
      kills: state.kills,
      _finalEquipment: equipmentRef.current,
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundRef.current = makeSounds("mining");

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = initState();
    lootFloatsRef.current = [];
    toastRef.current = [];
    droppedItemsRef.current = [];
    runDeltaRef.current = {};
    startInvRef.current = { ...(playerInvRef.current?.items ?? {}) };

    function doAttack() {
      const state = stateRef.current;
      if (!state || state.over || state.attackCooldown > 0) return;
      if (tabMenuOpenRef.current) return;
      state.attackFlash = 0.4; state.attackCooldown = 0.45;
      soundRef.current?.swing();

      const equipStats  = getEquipStats(equipmentRef.current);
      const hasPickaxe  = equipStats.canMine;
      const allNodes    = [...state.rocks, ...state.gems];
      let hitAnyNode    = false;
      let hitAnyEnemy   = false;

      // Attack enemies in range
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const dist = Math.hypot(state.px - e.x, state.py - e.y);
        if (dist > ATTACK_REACH + (BAT_R ?? 12)) continue;
        const dmg = 1 + (equipStats.attackBonus ?? 0);
        e.hp = Math.max(0, e.hp - dmg); e.hitFlash = 1; hitAnyEnemy = true;
        soundRef.current?.hit();
        if (e.hp <= 0) {
          e.alive = false; state.kills++;
          if (coOp) sendEnemyKilledRef.current?.(e.id);
          // Bat loot
          if (e.type === "bat") {
            const { gained } = tryGainItem("leather", 1);
            if (gained > 0) pushLootFloat(`+1 leather`, e.x, e.y - 20, "#c8a050");
          }
        } else {
          if (coOp) sendEnemyHitRef.current?.(e.id, e.hp);
        }
      }

      // Attack rock nodes
      for (const node of allNodes) {
        if (!node.alive) continue;
        const dist = Math.hypot(state.px - node.x, state.py - node.y);
        if (dist > ATTACK_REACH + 18) continue;
        if (!hasPickaxe) { state.noPickaxeFlash = 1.5; continue; }
        node.hp--; node.hitFlash = 1; hitAnyNode = true;
        soundRef.current?.chip();
        if (node.hp <= 0) {
          node.alive = false;
          if (coOp) sendDepositKilledRef.current?.(node.id);
          const drops = rollLoot(MINE_LOOT_TABLE[node.type], randRef.current);
          if (equipStats.stoneYield > 0) drops.forEach(d => { if (d.item === 'stone') d.qty += equipStats.stoneYield; });
          drops.forEach((d, i) => {
            const { gained, overflowQty } = tryGainItem(d.item, d.qty);
            if (gained > 0) pushLootFloat(`+${gained} ${ITEMS[d.item]?.label ?? d.item}`, node.x + (i%2===0?-14:14), node.y - i * 16);
            if (overflowQty > 0) {
              droppedItemsRef.current.push({ id:`loot_${d.item}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, item:d.item, qty:overflowQty, x:node.x, y:node.y, born:performance.now() });
              if (gained === 0) pushToast(`🎒 bag full! ${ITEMS[d.item]?.label ?? d.item} dropped`, "#ff9080");
            }
          });
        } else {
          if (coOp) sendDepositHitRef.current?.(node.id, node.hp);
        }
      }

      // Weapon durability
      const anyHit = hitAnyNode || hitAnyEnemy;
      if (anyHit) {
        const newEq = drainWeaponDurability(equipmentRef.current, (brokenId) => {
          pushToast(`💔 ${ITEMS[brokenId]?.label ?? brokenId} broke!`, "#ff6060");

          // Remove 1 copy from player inventory
          const inv = playerInvRef.current ?? { items: {}, slots: INVENTORY_BASE_SLOTS };
          const nextItems = { ...inv.items };
          if ((nextItems[brokenId] ?? 0) > 1) {
            nextItems[brokenId] -= 1;
          } else {
            delete nextItems[brokenId];
          }
          const nextInv = { ...inv, items: nextItems };
          playerInvRef.current = nextInv;
          onPlayerInventoryUpdate?.(nextInv);

          // Clear the tool from any hotbar slot
          const newHotbar = (hotbarRef.current ?? []).map(s =>
            s?.item === brokenId ? null : s
          );
          hotbarRef.current = newHotbar;
          onHotbarChange?.(newHotbar);
        });
        if (newEq !== equipmentRef.current) {
          equipmentRef.current = newEq;
          onEquipmentUpdateRef.current?.(newEq);
        }
      }
    }
    doAttackRef.current = doAttack;

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (e.key === "Escape") {
        if (tabMenuOpenRef.current) { setTabMenuOpen(false); return; }
        setPauseOpen(v => { pauseOpenRef.current = !v; return !v; });
      }
      if (e.key === "Tab") { e.preventDefault(); setTabMenuOpen(v => !v); setActiveTab("inventory"); }
      if (e.key === " ") { e.preventDefault(); doAttack(); }
      if (e.key >= "1" && e.key <= "6") selectHotbarSlot(parseInt(e.key) - 1);
      if (e.key === "e" || e.key === "E" || e.key === "f" || e.key === "F") useHotbarItem();
    };
    const onKeyUp   = (e) => { delete keysRef.current[e.key]; };
    const onClick   = () => { soundRef.current?.unlock(); doAttack(); };
    const onWheel   = (e) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("click",   onClick);
    canvas.addEventListener("wheel",   onWheel, { passive: false });

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state || state.over) return;
      if (tabMenuOpenRef.current || pauseOpenRef.current) { state.lastTime = ts; return; }

      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t = ts / 1000;

      state.elapsed += dt;
      if (state.elapsed >= RUN_DURATION || state.hp <= 0) { finishRun(state); return; }

      let dx = 0, dy = 0;
      if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
      if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; state.facing = "up"; }
      if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; state.facing = "down"; }
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      state.px = Math.max(20, Math.min(MINE_W - 20, state.px + dx * PLAYER_SPEED * dt));
      state.py = Math.max(30, Math.min(MINE_H - 30, state.py + dy * PLAYER_SPEED * dt));

      if (dx !== 0 || dy !== 0) {
        state.stepTimer += dt;
        if (state.stepTimer > 0.2) { state.stepTimer = 0; state.step = (state.step + 1) % 4; }
      } else { state.step = 0; state.stepTimer = 0; }

      if (state.invincible   > 0) state.invincible   = Math.max(0, state.invincible   - dt);
      if (state.hitFlash     > 0) state.hitFlash     = Math.max(0, state.hitFlash     - dt * 3);
      if (state.attackFlash  > 0) state.attackFlash  = Math.max(0, state.attackFlash  - dt * 4);
      if (state.attackCooldown > 0) state.attackCooldown = Math.max(0, state.attackCooldown - dt);
      if (state.noPickaxeFlash > 0) state.noPickaxeFlash = Math.max(0, state.noPickaxeFlash - dt * 1.2);

      // Bat AI
      for (const bat of state.enemies) {
        if (!bat.alive) continue;
        if (bat.hitFlash > 0) bat.hitFlash = Math.max(0, bat.hitFlash - dt * 5);
        if (bat.attackCooldown > 0) bat.attackCooldown = Math.max(0, bat.attackCooldown - dt);
        const dist = Math.hypot(state.px - bat.x, state.py - bat.y);
        if (dist < 160) {
          const spd = bat.speed * dt;
          bat.x += ((state.px - bat.x) / dist) * spd;
          bat.y += ((state.py - bat.y) / dist) * spd;
        } else {
          bat.x += bat.dir * bat.speed * 0.4 * dt;
          bat.y += Math.sin(t * 2.4 + (bat.phase ?? 0)) * 30 * dt;
          if (bat.x < 60)          { bat.x = 60;          bat.dir =  1; }
          if (bat.x > MINE_W - 60) { bat.x = MINE_W - 60; bat.dir = -1; }
        }
        bat.y = Math.max(35, Math.min(MINE_H - 35, bat.y));
        if (state.invincible === 0 && dist < 22 && bat.attackCooldown === 0) {
          const equipStats = getEquipStats(equipmentRef.current);
          const dmgTaken = Math.max(1, ENEMY_DAMAGE - (equipStats.defense ?? 0));
          state.hp = Math.max(0, state.hp - dmgTaken);
          state.invincible = INVINCIBLE_S;
          state.hitFlash = 1;
          bat.attackCooldown = ENEMY_ATTACK_CD ?? 1.5;
          soundRef.current?.hurt();
        }
      }

      // Rock hitFlash decay
      for (const r of [...state.rocks, ...state.gems]) {
        if (r.hitFlash > 0) r.hitFlash = Math.max(0, r.hitFlash - dt * 4);
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
      const targetCamX = Math.max(0, Math.min(MINE_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      if (ts - lastMoveRef.current > MOVE_THROTTLE) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // ── DRAW ──────────────────────────────────────────────────────────
      const camX = state.camX;
      drawCaveBackground(ctx, camX, W, H, t);

      // Dropped items
      for (const drop of droppedItemsRef.current) {
        if (drop.collected) continue;
        const sx = drop.x - camX;
        if (sx < -20 || sx > W + 20) continue;
        drawDroppedItem(ctx, drop, camX, t);
      }

      const drawables = [];
      for (const r of [...state.rocks, ...state.gems]) {
        if (!r.alive) continue;
        const sx = r.x - camX;
        if (sx < -50 || sx > W + 50) continue;
        drawables.push({ sortY: r.y + 18, draw: () => drawRockNode(ctx, r, camX, t) });
      }
      for (const bat of state.enemies) {
        if (!bat.alive) continue;
        const sx = bat.x - camX;
        if (sx < -40 || sx > W + 40) continue;
        drawables.push({ sortY: bat.y, draw: () => drawBat(ctx, bat, camX, t) });
      }
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
        const age = (now - lf.born) / (LOOT_FLOAT_DUR * 1000);
        ctx.save(); ctx.globalAlpha = 1 - age;
        ctx.fillStyle = lf.color ?? "#f5e6a0"; ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, lf.worldX - camX, lf.worldY - age * 40);
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
      const weaponDur  = getWeaponDurability(equipmentRef.current);
      drawHUD(ctx, W, H, state, items, t, slotsUsed, slotsTotal, weaponDur);

      // "Need pickaxe" toast overlay
      if (state.noPickaxeFlash > 0) {
        const alpha = Math.min(1, state.noPickaxeFlash);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(10,8,4,0.85)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 84, H / 2 - 20, 168, 30, 6); ctx.fill();
        ctx.fillStyle = "#f5c060"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("[pickaxe] need a pickaxe to mine", W / 2, H / 2 - 5);
        ctx.restore();
      }

      // Pause dim
      if (tabMenuOpen) {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore();
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

  const onUseSlotIdx = useCallback((idx) => {
    setSelectedHotbarSlot(idx);
    selectedSlotRef.current = idx;
    const entry = hotbarRef.current?.[idx];
    if (entry && RUN_WEAPONS[entry.item]) {
      onEquipItem?.(entry.item);
      doAttackRef.current?.();
      return;
    }
    useHotbarItem();
  }, [onEquipItem, useHotbarItem]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width:"100%", height:"100svh", background:"#0a0804", position:"relative", userSelect:"none" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
      />
      {/* Pause / abandon overlay */}
      <PauseOverlay
        open={pauseOpen}
        theme="mining"
        runLabel="⛏️ Mining Run"
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