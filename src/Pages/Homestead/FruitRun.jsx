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

const PLAYER_SPEED  = 140;
const RUN_DURATION  = 150;
const PICKUP_R      = 26;
const LOOT_FLOAT_DUR = 1.4;
const TOAST_DUR      = 1.8;
const MOVE_THROTTLE  = 50;

// ─── Sound engine ─────────────────────────────────────────────────────────────

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
    unlock:  () => { try { getCtx(); } catch {} },
    pluck:   () => beep("sine",    880, 660, 0.15, 0.12),
    collect: () => beep("sine",    660, 880, 0.10, 0.10),
    pickup:  () => beep("sine",    600, 900, 0.10, 0.08),
    deny:    () => beep("square",  220, 180, 0.10, 0.06),
    drop:    () => beep("sine",    300, 180, 0.10, 0.07),
  };
}

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
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, py + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, py + 2, 5, 9 - legSw);
  ctx.fillStyle = bodyCol; ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);
  // Basket hint on the side
  ctx.fillStyle = "#c8a050";
  ctx.fillRect(px + 7, py - 6 + bobY, 12, 10);
  ctx.strokeStyle = "#8a6020"; ctx.lineWidth = 1;
  ctx.strokeRect(px + 7, py - 6 + bobY, 12, 10);
  const armSw = (step === 1 || step === 3) ? 2 : 0;
  ctx.fillStyle = bodyCol;
  ctx.fillRect(px - 10, py - 9 + bobY + armSw, 3, 8);
  ctx.fillStyle = skinCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);
  if (hat !== 'none' && HATS_C[hat]) {
    ctx.fillStyle = HATS_C[hat];
    if (hat === 'cap')    { ctx.fillRect(px - 8, py - 27 + bobY, 16, 6); ctx.fillRect(px - 10, py - 28 + bobY, 20, 3); }
    if (hat === 'straw')  { ctx.beginPath(); ctx.ellipse(px, py - 27 + bobY, 12, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px-6, py-35+bobY, 12, 10); }
    if (hat === 'beanie') { ctx.beginPath(); ctx.arc(px, py - 24 + bobY, 8, Math.PI, 0); ctx.fill(); }
  }
}

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
                <ItemIcon id={slot.item} size={26} />
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
  onDropItem,
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

  useEffect(() => {
    const block = (e) => { if (e.key===" "||e.code==="Space") e.preventDefault(); };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

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
    const newItems = { ...(playerInventory?.items ?? {}) };
    if (newItems[itemId] > 0) delete newItems[itemId];
    if (displaced?.item && displaced.item !== itemId) {
      newItems[displaced.item] = (newItems[displaced.item] ?? 0) + (displaced.qty ?? 1);
    }
    onPlayerInventoryUpdate?.({ ...playerInventory, items: newItems });
    onHotbarChange?.(newHotbar);
  }

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
                    <ItemIcon id={slot.item} size={22} />
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
          <button title="Drop 1" onClick={(e)=>{e.stopPropagation();dropFromBag(id,1);}} style={{ fontSize:10, padding:"3px 8px", cursor:"pointer", background:"rgba(255,100,80,0.06)", border:"none", borderRight: qty > 1 ? "1px solid rgba(255,100,80,0.18)" : "none", color:"rgba(255,150,130,0.85)", fontFamily:"monospace", lineHeight:1.4 }}>drop</button>
          {qty > 1 && <button title={`Drop all (${qty})`} onClick={(e)=>{e.stopPropagation();dropFromBag(id,qty);}} style={{ fontSize:10, padding:"3px 6px", cursor:"pointer", background:"rgba(255,100,80,0.10)", border:"none", color:"rgba(255,160,140,0.8)", fontFamily:"monospace", lineHeight:1.4 }}>all</button>}
        </div>
      );
    }
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(200,230,120,0.04)", border:"1px solid rgba(200,230,120,0.12)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:10, color:"rgba(200,230,120,0.5)", letterSpacing:"0.1em", textTransform:"uppercase" }}>inventory</span>
            <span style={{ fontSize:11, color: usedSlotsCount >= totalSlots ? "rgba(255,120,80,0.9)" : "rgba(200,230,120,0.7)", fontFamily:"monospace" }}>{usedSlotsCount}/{totalSlots} slots</span>
          </div>
          <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(usedSlotsCount/totalSlots)*100}%`, background: usedSlotsCount >= totalSlots ? "rgba(255,120,80,0.7)" : "rgba(200,230,120,0.6)", transition:"width 0.3s" }} />
          </div>
          {usedSlotsCount >= totalSlots && <p style={{ fontSize:10, color:"rgba(255,120,80,0.7)", marginTop:6 }}>Bag full — drop items below to free up space.</p>}
        </div>
        {allItems.length === 0 && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.2)", padding:"24px 0" }}>bag is empty</p>}
        {resources.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Resources</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:6 }}>
              {resources.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", cursor:"grab" }}>
                  <ItemIcon id={id} size={22} />
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
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Consumables — drag to hotbar to use mid-run</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {consumables.map(([id, qty]) => (
                <div key={id} draggable onDragStart={e=>{e.dataTransfer.setData("hotbar_item",id);e.dataTransfer.effectAllowed="copy";}}
                  onClick={()=>{const ei=hotbar?.findIndex(s=>!s)??-1;const si=ei>=0?ei:0;if(si<(hotbarSlots??HOTBAR_BASE_SLOTS)){const nh=[...(hotbar??[])];nh[si]={item:id,qty};onHotbarChange?.(nh);}}}
                  style={{ ...itemStyle, background:"rgba(255,200,80,0.07)", border:"1px solid rgba(255,200,80,0.25)" }}>
                  <ItemIcon id={id} size={26} />
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
            <p style={{ fontSize:10, color:"rgba(245,230,200,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Gear</p>
            {gear.map(([id, qty]) => {
              const info = EQUIPPABLE[id]; const isEq = equipment?.[info?.slot] === id;
              return (
                <div key={id} onClick={()=>onEquipItem?.(id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, cursor:"pointer", background:isEq?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)", border:`1px solid ${isEq?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}`, marginBottom:6 }}>
                  <ItemIcon id={id} size={26} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:"rgba(200,230,120,0.85)" }}>{info?.label??id}</div>
                    <div style={{ fontSize:10, color:"rgba(200,230,160,0.4)" }}>{info?.slot} slot</div>
                  </div>
                  <button style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${isEq?"rgba(255,100,100,0.25)":"rgba(200,230,120,0.3)"}`, background:isEq?"rgba(255,100,100,0.06)":"rgba(200,230,120,0.08)", color:isEq?"rgba(255,140,120,0.8)":"rgba(200,230,120,0.9)", fontSize:11, fontFamily:"monospace", cursor:"pointer" }}>{isEq?"unequip":"equip"}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function ChestTab() {
    const chestMap = normalizeChest(chest)?.items ?? {};
    const allItems = Object.entries(chestMap).filter(([,v])=>v>0);
    const subTabs = [
      { id:"resources",   label:"Resources",   list: allItems.filter(([k])=>!EQUIPPABLE[k]&&!HOTBAR_ITEMS[k]) },
      { id:"consumables", label:"Consumables", list: allItems.filter(([k])=>!!HOTBAR_ITEMS[k]) },
      { id:"gear",        label:"Gear",        list: allItems.filter(([k])=>!!EQUIPPABLE[k]) },
    ].filter(s => s.list.length > 0);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(180,200,100,0.04)", border:"1px solid rgba(180,200,100,0.1)", fontSize:11, color:"rgba(245,230,200,0.35)", lineHeight:1.6 }}>
          📦 Your shared chest is back at the homestead. You can see what's in it, but you can't deposit or withdraw from out here in the orchard.
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
            {(subTabs.find(s => s.id === chestTab)?.list ?? []).map(([id, qty]) => (
              <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(180,200,100,0.04)", border:"1px solid rgba(180,200,100,0.12)" }}>
                <ItemIcon id={id} size={26} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:"rgba(180,200,100,0.85)" }}>{ITEMS[id]?.label??id}</div>
                  <div style={{ fontSize:10, color:"rgba(245,230,200,0.35)" }}>×{qty} at home</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  function CraftingTab() {
    function handleCraft(key) {
      const newInv = craftItemByKey(key, playerInventory);
      if (newInv) {
        onPlayerInventoryUpdate?.(newInv);
        const outputId = resolveHandRecipeKey(key);
        setCraftMsg(`Crafted ${ITEMS[outputId]?.label??outputId}!`);
        setTimeout(()=>setCraftMsg(null),2200);
      }
    }
    const handCraftables = expandedHandRecipes();
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {craftMsg && <div style={{ textAlign:"center",fontSize:12,padding:"8px 14px",borderRadius:8,background:"rgba(200,230,120,0.1)",border:"1px solid rgba(200,230,120,0.3)",color:"rgba(200,230,120,0.9)" }}>✓ {craftMsg}</div>}
        <div style={{ padding:"14px",borderRadius:12,background:"rgba(200,230,120,0.04)",border:"1px solid rgba(200,230,120,0.15)" }}>
          <p style={{ fontSize:10,color:"rgba(200,230,120,0.5)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12 }}>⚒ craft by hand</p>
          {handCraftables.length === 0 && <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textAlign:"center" }}>nothing to hand-craft</p>}
          {handCraftables.map(([key, recipe]) => {
            const outputId = resolveHandRecipeKey(key);
            const craftable = canCraftByKey(key, playerInventory); const it = ITEMS[outputId];
            return (
              <div key={key} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:craftable?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${craftable?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}`,opacity:craftable?1:0.5,marginTop:8 }}>
                <ItemIcon id={outputId} size={26} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,color:"rgba(200,230,120,0.85)" }}>{it?.label??outputId}</div>
                  <div style={{ fontSize:10,color:"rgba(245,230,200,0.4)" }}>
                    {Object.entries(recipe).map(([ing,qty])=>{const have=playerItems[ing]??0;return <span key={ing} style={{ marginRight:8,color:have>=qty?"rgba(200,230,120,0.7)":"rgba(255,100,80,0.7)" }}>{ITEM_ICONS[ing]??""} {have}/{qty} {ITEMS[ing]?.label??ing}</span>;})}
                  </div>
                </div>
                <button disabled={!craftable} onClick={()=>handleCraft(key)} style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${craftable?"rgba(200,230,120,0.35)":"rgba(255,255,255,0.06)"}`,background:craftable?"rgba(200,230,120,0.1)":"transparent",color:craftable?"rgba(200,230,120,0.9)":"rgba(255,255,255,0.2)",fontSize:11,fontFamily:"monospace",cursor:craftable?"pointer":"default" }}>craft</button>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"12px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.1)",textAlign:"center",fontSize:11,color:"rgba(245,230,200,0.35)" }}>
          🔒 Station recipes are only available at the homestead.
        </div>
      </div>
    );
  }

  function EquipmentTab() {
    const stats = getEquipStats(equipment);
    const equippableInBag = Object.entries(playerItems).filter(([k,v])=>v>0&&EQUIPPABLE[k]).map(([k])=>k);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {["weapon","armor","accessory"].map(slot=>{
          const item=equipment?.[slot]; const info=item?EQUIPPABLE[item]:null;
          return(
            <div key={slot} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:item?"rgba(200,230,120,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${item?"rgba(200,230,120,0.18)":"rgba(255,255,255,0.06)"}` }}>
              <ItemIcon id={item} size={26} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.1em",textTransform:"uppercase" }}>{slot}</div>
                <div style={{ fontSize:13,color:item?"rgba(200,230,120,0.85)":"rgba(255,255,255,0.18)" }}>{info?.label??"empty"}</div>
                {info&&<div style={{ fontSize:10,color:"rgba(200,230,160,0.4)" }}>{Object.entries(info.stats??{}).map(([k,v])=>`${k}:${v}`).join("  ")}</div>}
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
              {stats.canChop&&<StatPill label="CHOP" value="✓" color="rgba(120,200,60,0.8)"/>}
              {stats.canFish&&<StatPill label="FISH" value="✓" color="rgba(80,200,255,0.8)"/>}
            </div>
          }
        </div>
        {equippableInBag.length>0&&(
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase" }}>in bag — click to equip</p>
            {equippableInBag.map(name=>{const info=EQUIPPABLE[name];const isEq=equipment?.[info?.slot]===name;return(
              <div key={name} onClick={()=>onEquipItem?.(name)} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:"pointer",background:isEq?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${isEq?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}` }}>
                <ItemIcon id={id} size={26} />
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

  const tabContent = { inventory:<InventoryTab/>, chest:<ChestTab/>, crafting:<CraftingTab/>, equipment:<EquipmentTab/> };

  return (
    <div ref={overlayRef} style={{ position:"absolute",inset:0,background:"rgba(4,12,4,0.86)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20,backdropFilter:"blur(2px)" }} onClick={onClose}>
      <div style={{ background:"#111a0b",border:"1px solid rgba(180,220,100,0.22)",borderRadius:18,width:540,maxWidth:"97vw",maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:"monospace",color:"#f5e6c8",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:0 }}>
          <div style={{ fontSize:11,color:"rgba(200,230,120,0.5)",letterSpacing:"0.2em",textTransform:"uppercase",paddingBottom:14 }}>🍎 orchard — menu</div>
          <button onClick={onClose} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,color:"rgba(255,255,255,0.3)",fontSize:12,fontFamily:"monospace",cursor:"pointer",padding:"3px 9px",marginBottom:14 }}>✕  esc</button>
        </div>
        <div style={{ display:"flex",overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 6px",scrollbarWidth:"none" }}>
          {RUN_TABS.map(tab=>{const active=activeTab===tab.id;return(
            <button key={tab.id} onClick={()=>onTabChange(tab.id)} style={{ flex:"0 0 auto",padding:"10px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${active?"rgba(200,230,120,0.8)":"transparent"}`,color:active?"rgba(200,230,120,0.95)":"rgba(245,230,200,0.4)",fontSize:12,fontFamily:"monospace",cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" }}>
              {tab.icon}
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
    const { trees, bushes, flowers } = generateFruitRun(seed ?? Date.now());
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
    soundRef.current = makeSounds();

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
      {pauseOpen && (
        <div style={{ position:"absolute", inset:0, background:"rgba(4,12,4,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:30 }}>
          <div style={{ background:"#0e1a0a", border:"1px solid rgba(180,230,120,0.25)", borderRadius:16, padding:"28px 32px", maxWidth:300, width:"90%", fontFamily:"monospace", color:"#f5e6c8", textAlign:"center", display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(180,230,120,0.4)", textTransform:"uppercase" }}>paused</p>
            <h2 style={{ fontSize:20, fontWeight:400, color:"rgba(180,230,120,0.9)" }}>🍎 Fruit Run</h2>
            <button onClick={() => { setPauseOpen(false); pauseOpenRef.current = false; }} style={{ padding:"13px", borderRadius:10, border:"1px solid rgba(180,230,120,0.35)", background:"rgba(180,230,120,0.1)", color:"rgba(180,230,120,0.95)", fontSize:13, fontFamily:"monospace", cursor:"pointer" }}>▶ Resume</button>
            <button onClick={() => { setPauseOpen(false); pauseOpenRef.current = false; finishRun(stateRef.current); }} style={{ padding:"10px", borderRadius:10, border:"1px solid rgba(255,150,100,0.3)", background:"rgba(255,100,60,0.07)", color:"rgba(255,160,120,0.85)", fontSize:12, fontFamily:"monospace", cursor:"pointer" }}>Abandon run (keep loot so far)</button>
          </div>
        </div>
      )}
      <HotbarBar
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