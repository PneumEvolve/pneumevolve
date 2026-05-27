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

const PLAYER_SPEED   = 120;
const PLAYER_HP      = 5;
const INVINCIBLE_S   = 1.2;
const RUN_DURATION   = 180;
const ATTACK_REACH   = 40;
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
    unlock: () => { try { getCtx(); } catch {} },
    hit:    () => beep("square",   120, 60,   0.18, 0.2),
    swing:  () => beep("sine",     300, 150,  0.10, 0.12),
    pickup: () => beep("sine",     800, 1200, 0.12, 0.1),
    hurt:   () => beep("sawtooth", 200, 50,   0.28, 0.2),
    chip:   () => beep("square",   200, 100,  0.08, 0.15),
    deny:   () => beep("square",   220, 180,  0.10, 0.06),
    drop:   () => beep("sine",     300, 180,  0.10, 0.07),
  };
}

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
    ctx.fillRect(px + 7, py - 14 + bobY + armSw, 10, 4);
    ctx.fillRect(px - 10, py - 9 + bobY - armSw, 3, 8);
  } else if (facing === "left") {
    ctx.fillRect(px - 17, py - 14 + bobY + armSw, 10, 4);
    ctx.fillRect(px + 7, py - 9 + bobY - armSw, 3, 8);
  } else {
    ctx.fillRect(px - 10, py - 9 + bobY + armSw, 3, 8);
    ctx.fillRect(px + 7,  py - 9 + bobY - armSw, 3, 8);
  }
  ctx.fillStyle = skinCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);
  if (hat !== 'none' && HATS_C[hat]) {
    ctx.fillStyle = HATS_C[hat];
    if (hat === 'cap')    { ctx.fillRect(px - 8, py - 27 + bobY, 16, 6); ctx.fillRect(px - 10, py - 28 + bobY, 20, 3); }
    if (hat === 'straw')  { ctx.beginPath(); ctx.ellipse(px, py - 27 + bobY, 12, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px-6, py-35+bobY, 12, 10); }
    if (hat === 'beanie') { ctx.beginPath(); ctx.arc(px, py - 24 + bobY, 8, Math.PI, 0); ctx.fill(); }
  }
  // Pickaxe hint on attack
  if (attackFlash > 0) {
    const fx = facing === "right" ? px + 16 : facing === "left" ? px - 16 : px;
    ctx.fillStyle = "#c0a050"; ctx.fillRect(fx - 1, py - 10 + bobY - 12, 3, 14);
    ctx.fillStyle = "#909090"; ctx.fillRect(facing === "right" ? fx - 2 : fx - 5, py - 10 + bobY - 16, 8, 5);
  }
}

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
              background: slot ? "rgba(10,8,4,0.92)" : "rgba(10,8,4,0.55)",
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
                <ItemIcon id={slot.item} size={22} />
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
      <div onClick={() => onOpenMenu?.("inventory")} style={{ marginLeft:8, width:36, height:36, borderRadius:8, cursor:"pointer", background:"rgba(10,8,4,0.7)", border:"1px solid rgba(200,230,120,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(200,230,120,0.5)", fontSize:10, fontFamily:"monospace" }} title="Open menu (Tab)">⊞</div>
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
          📦 Your shared chest is back at the homestead. You can see what's in it, but you can't deposit or withdraw from out here in the mine.
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
                {item && slot === "weapon" && (() => {
                  const dur = getWeaponDurability(equipment);
                  if (!dur) return null;
                  const [cur, max] = dur; const pct = cur / max;
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
              {stats.canMine&&<StatPill label="MINE" value="✓" color="rgba(180,180,180,0.8)"/>}
            </div>
          }
        </div>
        {equippableInBag.length>0&&(
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            <p style={{ fontSize:10,color:"rgba(245,230,200,0.3)",letterSpacing:"0.12em",textTransform:"uppercase" }}>in bag — click to equip</p>
            {equippableInBag.map(name=>{const info=EQUIPPABLE[name];const isEq=equipment?.[info?.slot]===name;return(
              <div key={name} onClick={()=>onEquipItem?.(name)} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:"pointer",background:isEq?"rgba(200,230,120,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${isEq?"rgba(200,230,120,0.2)":"rgba(255,255,255,0.06)"}` }}>
                <ItemIcon id={name} size={26} />
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
          <div style={{ fontSize:11,color:"rgba(200,230,120,0.5)",letterSpacing:"0.2em",textTransform:"uppercase",paddingBottom:14 }}>⛏️ mine — menu</div>
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
    const { rocks, gems, enemies } = generateMiningRun(seed ?? Date.now());
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
          onEquipItem?.(brokenId);
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
      {pauseOpen && (
        <div style={{ position:"absolute", inset:0, background:"rgba(4,4,10,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:30 }}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(160,180,230,0.25)", borderRadius:16, padding:"28px 32px", maxWidth:300, width:"90%", fontFamily:"monospace", color:"#f5e6c8", textAlign:"center", display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:10, letterSpacing:"0.18em", color:"rgba(160,180,230,0.4)", textTransform:"uppercase" }}>paused</p>
            <h2 style={{ fontSize:20, fontWeight:400, color:"rgba(180,210,255,0.9)" }}>⛏️ Mining Run</h2>
            <button onClick={() => { setPauseOpen(false); pauseOpenRef.current = false; }} style={{ padding:"13px", borderRadius:10, border:"1px solid rgba(160,180,230,0.35)", background:"rgba(160,180,230,0.1)", color:"rgba(180,210,255,0.95)", fontSize:13, fontFamily:"monospace", cursor:"pointer" }}>▶ Resume</button>
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