// src/Pages/Homestead/MiningRun.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  MINE_W, MINE_H, BAT_R, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_CD, ENEMY_DAMAGE,
  generateMiningRun, MINE_LOOT_TABLE, rollLoot,
  seededRand, addToInventory, fullEmptyInventory, getEquipStats,
  HOTBAR_ITEMS, HOTBAR_SIZE,
} from "./gameEngine";

const PLAYER_SPEED   = 120;
const PLAYER_HP      = 5;
const INVINCIBLE_S   = 1.2;
const RUN_DURATION   = 180;
const PICKUP_R       = 22;
const ATTACK_REACH   = 40;

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
    hit:    () => beep("square",  120, 60,   0.18, 0.2),
    swing:  () => beep("sine",    300, 150,  0.10, 0.12),
    pickup: () => beep("sine",    800, 1200, 0.12, 0.1),
    hurt:   () => beep("sawtooth",200, 50,   0.28, 0.2),
    chip:   () => beep("square",  200, 100,  0.08, 0.15),
  };
}

function drawCaveBackground(ctx, camX, W, H, t) {
  // Dark stone background
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, W, H);

  // Stone tile grid
  const tileSize = 48;
  for (let row = 0; row < Math.ceil(H / tileSize) + 1; row++) {
    for (let col = 0; col < Math.ceil(W / tileSize) + 2; col++) {
      const wx  = col * tileSize - (camX % tileSize);
      const wy  = row * tileSize;
      const wc  = Math.floor((col * tileSize + Math.floor(camX / tileSize) * tileSize) / tileSize);
      const n   = ((wc * 773 + row * 41 + 13) & 0x7fffffff) / 0x7fffffff;
      const col2 = n > 0.7 ? "#221c18" : n > 0.4 ? "#1e1814" : "#1a1410";
      ctx.fillStyle = col2;
      ctx.fillRect(wx, wy, tileSize - 1, tileSize - 1);
      // cracks
      if (n > 0.6) {
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(wx + n * 20, wy + n * 20);
        ctx.lineTo(wx + n * 40, wy + n * 36);
        ctx.stroke();
      }
    }
  }

  // Torch light pools
  const torchSpacing = 320;
  for (let i = 0; i < Math.ceil(MINE_W / torchSpacing) + 2; i++) {
    const tx = i * torchSpacing - (camX % torchSpacing) + (((i * 137) % 60) - 30);
    const flicker = 0.7 + 0.3 * Math.sin(t * 7 + i * 2.3);
    const grd = ctx.createRadialGradient(tx, H / 2, 0, tx, H / 2, 120 * flicker);
    grd.addColorStop(0, `rgba(255,180,60,${0.18 * flicker})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    // Torch object on wall
    ctx.fillStyle = "#7a4f2a";
    ctx.fillRect(tx - 4, 12, 8, 18);
    ctx.fillStyle = `rgba(255,180,60,${0.9 * flicker})`;
    ctx.beginPath(); ctx.arc(tx, 10, 5 * flicker, 0, Math.PI * 2); ctx.fill();
  }

  // Dark vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawRockNode(ctx, rock, camX, t) {
  const sx = rock.x - camX, sy = rock.y;
  if (sx < -60 || sx > 9999) return;

  const shake = rock.hitFlash > 0 ? Math.sin(t * 40) * 2 * rock.hitFlash : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(sx + 4, sy + 18, 20, 7, 0, 0, Math.PI * 2); ctx.fill();

  const col = rock.type === 'gem'
    ? (rock.hitFlash > 0 ? "#ffffff" : "#4a90d9")
    : rock.type === 'crystal'
    ? (rock.hitFlash > 0 ? "#ffffff" : "#9a60c0")
    : (rock.hitFlash > 0 ? "#ffffff" : "#807060");

  // Rock body
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(sx + shake, sy, 18, 0, Math.PI * 2);
  ctx.fill();

  // Gem sparkle
  if (rock.type === 'gem' || rock.type === 'crystal') {
    const glint = rock.type === 'gem' ? "#88ccff" : "#cc88ff";
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.arc(sx + shake - 5, sy - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // facets
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + shake, sy - 14);
    ctx.lineTo(sx + shake + 8, sy + 4);
    ctx.lineTo(sx + shake - 8, sy + 4);
    ctx.closePath(); ctx.stroke();
  }

  // HP cracks
  if (rock.hp < rock.maxHp) {
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < rock.maxHp - rock.hp; i++) {
      const angle = (i / rock.maxHp) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(sx + shake, sy);
      ctx.lineTo(sx + shake + Math.cos(angle) * 18, sy + Math.sin(angle) * 18);
      ctx.stroke();
    }
  }
}

function drawBat(ctx, bat, camX, t) {
  const sx = bat.x - camX, sy = bat.y;
  const wingFlap = Math.sin(t * 12 + bat.x * 0.05);
  const blink = bat.hitFlash > 0;

  ctx.save();
  ctx.globalAlpha = blink ? 1 : 0.85;

  // Wings
  ctx.fillStyle = blink ? "#ffffff" : "#3a2040";
  const ww = 16 + wingFlap * 8;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(sx - ww, sy - 8, sx - ww - 4, sy + 6);
  ctx.quadraticCurveTo(sx - ww * 0.5, sy + 4, sx, sy);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(sx + ww, sy - 8, sx + ww + 4, sy + 6);
  ctx.quadraticCurveTo(sx + ww * 0.5, sy + 4, sx, sy);
  ctx.fill();

  // Body
  ctx.fillStyle = blink ? "#ffffff" : "#2a1830";
  ctx.beginPath(); ctx.ellipse(sx, sy, 7, 9, 0, 0, Math.PI * 2); ctx.fill();

  // Eyes
  ctx.fillStyle = "#ff4040";
  ctx.beginPath(); ctx.arc(sx - 3, sy - 3, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 3, sy - 3, 2, 0, Math.PI * 2); ctx.fill();

  // HP
  const bw = 24, bh = 3, bx = sx - bw / 2, by = sy - 22;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = bat.hp <= 1 ? "#e24b4a" : "#9b59b6";
  ctx.fillRect(bx, by, bw * (bat.hp / bat.maxHp), bh);

  ctx.restore();
}

function drawMinePlayer(ctx, px, py, facing, step, invincible, attackFlash, t, character) {
  const blink = invincible > 0 && Math.floor(t * 8) % 2 === 0;
  if (blink) return;

  const bobY  = (step === 1 || step === 3) ? -1 : 0;
  const { skin = 'light', outfit = 'blue', hair = 'short', hat = 'none' } = character || {};

  const SKINS    = { light:'#f5c5a3', medium:'#d4956a', tan:'#c07840', brown:'#8b5a2b', dark:'#5a3018' };
  const OUTFITS  = { blue:['#5b8dd9','#3a6abf'], green:['#5a9a4a','#3a7a2a'], red:['#c05040','#8a2820'],
                     purple:['#7a5ab0','#5a3a8a'], orange:['#d07830','#a05010'], teal:['#4a9a8a','#2a7a6a'] };
  const HAIRS    = { short:'#7a4f2a', long:'#3a2010', curly:'#c88040', braid:'#884020' };
  const HATS_COL = { cap:'#5a3a8a', straw:'#d4a855', beanie:'#c05040' };

  const skinCol  = SKINS[skin] || '#f5c5a3';
  const [bodyCol, legCol] = OUTFITS[outfit] || ['#5b8dd9','#3a6abf'];
  const hairCol  = HAIRS[hair]  || '#7a4f2a';

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, py + 2, 5, 9);
  ctx.fillRect(px + 1, py + 2, 5, 9);

  ctx.fillStyle = attackFlash > 0 ? "#ffffff" : bodyCol;
  ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);
  ctx.fillRect(px - 10, py - 9 + bobY, 3, 8);
  ctx.fillRect(px + 7,  py - 9 + bobY, 3, 8);

  ctx.fillStyle = skinCol;
  ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol;
  ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);

  // Hat
  if (hat !== 'none' && HATS_COL[hat]) {
    ctx.fillStyle = HATS_COL[hat];
    if (hat === 'cap')    { ctx.fillRect(px - 8, py - 27 + bobY, 16, 6); ctx.fillRect(px - 10, py - 28 + bobY, 20, 3); }
    if (hat === 'straw')  { ctx.beginPath(); ctx.ellipse(px, py - 27 + bobY, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px-6, py-35+bobY, 12, 10); }
    if (hat === 'beanie') { ctx.beginPath(); ctx.arc(px, py - 24 + bobY, 8, Math.PI, 0); ctx.fill(); }
  }

  // Mining tool (pickaxe visual on attack)
  if (attackFlash > 0) {
    const fx = facing === "right" ? px + 16 : facing === "left" ? px - 16 : px;
    const fy = py - 10 + bobY;
    ctx.fillStyle = "#c0a050";
    ctx.fillRect(fx - 1, fy - 12, 3, 14);
    ctx.fillStyle = "#909090";
    ctx.fillRect(facing === "right" ? fx - 2 : fx - 5, fy - 16, 8, 5);
  }
}

function drawMineHUD(ctx, W, H, state, inventory, t) {
  ctx.fillStyle = "rgba(10,8,4,0.92)"; ctx.fillRect(0, 0, W, 32);

  // HP
  for (let i = 0; i < PLAYER_HP; i++) {
    ctx.beginPath(); ctx.arc(16 + i * 22, 16, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < state.hp ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.1)";
    ctx.fill();
  }

  // Timer
  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#e0c880";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);

  // Loot
  ctx.textAlign = "right"; ctx.font = "11px monospace"; ctx.fillStyle = "#e0d8a0";
  ctx.fillText(`🪨stone:${inventory.stone??0}  💎gems:${inventory.gems??0}  🔷crystl:${inventory.crystal??0}  coal:${inventory.coal??0}`, W - 14, 16);

  // Bottom
  ctx.fillStyle = "rgba(10,8,4,0.75)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(230,210,160,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD to move  ·  click / space to mine & attack  ·  1-6 select hotbar  ·  [E/F] use item  ·  [Esc] home", W / 2, H - 13);
}

// ─── Hotbar overlay ───────────────────────────────────────────────────────────
const HOTBAR_DISPLAY_ICONS = {
  axe:"🪓", pickaxe:"⛏️", fishing_rod:"🎣",
  leather_armor:"🛡️", cooked_meat:"🍖", potion_table:"🧪",
  fish:"🐟", big_fish:"🐠", rare_fish:"🐡",
  apples:"🍎", berries:"🫐", mushrooms:"🍄", herbs:"🌿",
};
const HOTBAR_SHORT_LABELS = {
  axe:"axe", pickaxe:"pick", fishing_rod:"rod",
  leather_armor:"armor", cooked_meat:"meat", potion_table:"pot",
  fish:"fish", big_fish:"bfish", rare_fish:"rfish",
  apples:"apple", berries:"berry", mushrooms:"mush", herbs:"herb",
};

function MineHotbar({ hotbar, selectedSlot, onSelectSlot, onUseItem, equipment }) {
  return (
    <div style={{
      position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 4, padding: "6px 8px",
      background: "rgba(10,8,4,0.88)", borderRadius: 12,
      border: "1px solid rgba(220,180,80,0.2)",
      zIndex: 5, pointerEvents: "auto",
    }}>
      {(hotbar.length ? hotbar : Array(HOTBAR_SIZE).fill(null)).map((slot, idx) => {
        const isSelected = idx === selectedSlot;
        const isEquipped = slot?.item === "pickaxe" && equipment?.weapon === "pickaxe";
        return (
          <div key={idx}
            onClick={() => { onSelectSlot(idx); if (idx === selectedSlot && slot) onUseItem(); }}
            style={{
              width: 44, height: 52, borderRadius: 8, cursor: "pointer",
              background: isSelected ? "rgba(220,180,80,0.15)" : "rgba(255,255,255,0.03)",
              border: `2px solid ${isSelected ? "rgba(220,180,80,0.8)" : isEquipped ? "rgba(100,200,255,0.5)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              position: "relative", transition: "border-color 0.1s", gap: 1,
            }}
          >
            {slot ? (
              <>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{HOTBAR_DISPLAY_ICONS[slot.item] ?? "📦"}</span>
                <span style={{ fontSize: 8, color: "rgba(220,180,80,0.65)", lineHeight: 1, fontFamily: "monospace", maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {HOTBAR_SHORT_LABELS[slot.item] ?? slot.item}
                </span>
                {slot.qty != null && (
                  <span style={{ fontSize: 9, color: "rgba(220,180,80,0.8)", lineHeight: 1, position: "absolute", bottom: 2, right: 4 }}>
                    {slot.qty}
                  </span>
                )}
                {isEquipped && (
                  <div style={{ position: "absolute", top: 2, right: 2, width: 6, height: 6, borderRadius: "50%", background: "rgba(100,200,255,0.9)" }} />
                )}
              </>
            ) : (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>{idx + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MiningRun({ room, seed, coOp = false, onRunComplete, character, equipment, hotbar, onHotbarChange }) {
  const canvasRef     = useRef(null);
  const rafRef        = useRef(null);
  const keysRef       = useRef({});
  const stateRef      = useRef(null);
  const soundRef      = useRef(null);
  const randRef       = useRef(seededRand(seed ?? Date.now()));
  const lootFloatsRef = useRef([]);
  const equipmentRef  = useRef(equipment ?? {});
  const hotbarRef     = useRef(hotbar ?? []);
  useEffect(() => { equipmentRef.current = equipment ?? {}; }, [equipment]);
  useEffect(() => { hotbarRef.current = hotbar ?? []; }, [hotbar]);

  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
  const selectedSlotRef = useRef(0);
  useEffect(() => { selectedSlotRef.current = selectedHotbarSlot; }, [selectedHotbarSlot]);

  const useHotbarItem = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.over) return;
    const hb = hotbarRef.current;
    const slot = selectedSlotRef.current;
    const entry = hb?.[slot];
    if (!entry) return;
    const info = HOTBAR_ITEMS[entry.item];
    if (!info) return;
    if (info.useEffect?.heal) {
      if (state.hp >= PLAYER_HP) return;
      state.hp = Math.min(PLAYER_HP, state.hp + info.useEffect.heal);
      const newHb = [...hb];
      const newQty = (entry.qty ?? 1) - 1;
      newHb[slot] = newQty > 0 ? { ...entry, qty: newQty } : null;
      hotbarRef.current = newHb;
      onHotbarChange?.(newHb);
      soundRef.current?.pickup();
      lootFloatsRef.current.push({
        text: `+${info.useEffect.heal} HP`,
        worldX: state.px, worldY: state.py - 20,
        born: performance.now(),
      });
    }
  }, [onHotbarChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlers = useRef({}).current;
  const { sendRunMove } = useHearthroom(room?.id ?? null, handlers, ":run");

  function initState() {
    const { rocks, gems, enemies } = generateMiningRun(seed ?? Date.now());
    return {
      px: 80, py: MINE_H / 2, facing: "right",
      step: 0, stepTimer: 0,
      hp: PLAYER_HP, invincible: 0, hitFlash: 0,
      attackFlash: 0, attackCooldown: 0,
      camX: 0, elapsed: 0, kills: 0, over: false,
      noPickaxeFlash: 0,
      rocks, gems, enemies,
      inventory: { ...fullEmptyInventory() },
      lastTime: performance.now(),
    };
  }

  function finishRun(state) {
    if (state.over) return;
    state.over = true;
    onRunComplete?.({ ...state.inventory, kills: state.kills });
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
    const lastMoveRef = { current: 0 };

    function doAttack() {
      const state = stateRef.current;
      if (!state || state.over || state.attackCooldown > 0) return;
      state.attackFlash = 0.4; state.attackCooldown = 0.45;
      soundRef.current?.swing();

      const equipStats  = getEquipStats(equipmentRef.current);
      const hasPickaxe  = equipStats.stoneYield > 0; // pickaxe gives stoneYield bonus

      const allNodes = [...state.rocks, ...state.gems];
      for (const node of allNodes) {
        if (!node.alive) continue;
        const dist = Math.hypot(state.px - node.x, state.py - node.y);
        if (dist > ATTACK_REACH + 18) continue;
        if (!hasPickaxe) { state.noPickaxeFlash = 1.5; continue; } // need pickaxe
        node.hp--; node.hitFlash = 1;
        soundRef.current?.chip();
        if (node.hp <= 0) {
          node.alive = false;
          const drops = rollLoot(MINE_LOOT_TABLE[node.type], randRef.current);
          // Pickaxe bonus: extra stone yield
          if (equipStats.stoneYield > 0) {
            drops.forEach(d => { if (d.item === 'stone') d.qty += equipStats.stoneYield; });
          }
          drops.forEach((d, i) => {
            addToInventory(state.inventory, d.item, d.qty);
            lootFloatsRef.current.push({
              text: `+${d.qty} ${d.item}`, worldX: node.x + (i%2===0?-14:14),
              worldY: node.y - i * 16, born: performance.now(),
            });
          });
        }
      }

      for (const e of state.enemies) {
        if (!e.alive) continue;
        const dist = Math.hypot(state.px - e.x, state.py - e.y);
        if (dist > ATTACK_REACH + BAT_R) continue;
        e.hp--; e.hitFlash = 1;
        if (e.hp <= 0) {
          e.alive = false;
          state.kills++;
          soundRef.current?.hit();
          const drops = rollLoot(MINE_LOOT_TABLE.bat, randRef.current);
          drops.forEach((d, i) => {
            addToInventory(state.inventory, d.item, d.qty);
            lootFloatsRef.current.push({
              text: `+${d.qty} ${d.item}`, worldX: e.x + (i%2===0?-14:14),
              worldY: e.y - i * 16, born: performance.now(),
            });
          });
        }
      }
    }

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (e.key === "Escape") finishRun(stateRef.current);
      if (e.key === " ") { e.preventDefault(); doAttack(); }
      // Number keys 1-6 select hotbar slot
      if (e.key >= "1" && e.key <= "6") {
        const idx = parseInt(e.key) - 1;
        setSelectedHotbarSlot(idx);
        selectedSlotRef.current = idx;
      }
      // E or F = use selected hotbar item
      if (e.key === "e" || e.key === "E" || e.key === "f" || e.key === "F") {
        useHotbarItem();
      }
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

      if (state.invincible  > 0) state.invincible  = Math.max(0, state.invincible  - dt);
      if (state.hitFlash    > 0) state.hitFlash    = Math.max(0, state.hitFlash    - dt * 3);
      if (state.attackFlash > 0) state.attackFlash = Math.max(0, state.attackFlash - dt * 4);
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
          bat.y += Math.sin(t * 2.4 + bat.x * 0.008) * 30 * dt;
          if (bat.x < 60)           { bat.x = 60;           bat.dir =  1; }
          if (bat.x > MINE_W - 60)  { bat.x = MINE_W - 60;  bat.dir = -1; }
        }
        bat.y = Math.max(35, Math.min(MINE_H - 35, bat.y));

        // Attack player
        if (state.invincible === 0 && dist < 22 && bat.attackCooldown === 0) {
          state.hp = Math.max(0, state.hp - 1);
          state.invincible = INVINCIBLE_S;
          state.hitFlash = 1;
          bat.attackCooldown = 1.5;
          soundRef.current?.hurt();
        }
      }

      // Rock hitFlash decay
      for (const r of [...state.rocks, ...state.gems]) {
        if (r.hitFlash > 0) r.hitFlash = Math.max(0, r.hitFlash - dt * 4);
      }

      // Camera
      const targetCamX = Math.max(0, Math.min(MINE_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      if (ts - lastMoveRef.current > 50) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // DRAW
      const camX = state.camX;
      drawCaveBackground(ctx, camX, W, H, t);

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
        drawMinePlayer(ctx, state.px - camX, state.py, state.facing, state.step, state.invincible, state.attackFlash, t, character)
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      if (state.hitFlash > 0) {
        ctx.save(); ctx.globalAlpha = state.hitFlash * 0.28;
        ctx.fillStyle = "#ff3333"; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      const now = performance.now();
      lootFloatsRef.current = lootFloatsRef.current.filter(lf => now - lf.born < 1400);
      for (const lf of lootFloatsRef.current) {
        const age = (now - lf.born) / 1400;
        ctx.save(); ctx.globalAlpha = 1 - age;
        ctx.fillStyle = "#f5e6a0"; ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, lf.worldX - camX, lf.worldY - age * 40);
        ctx.restore();
      }

      drawMineHUD(ctx, W, H, state, state.inventory, t);

      // "Need pickaxe" toast
      if (state.noPickaxeFlash > 0) {
        const alpha = Math.min(1, state.noPickaxeFlash);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(10,8,4,0.85)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 84, H / 2 - 20, 168, 30, 6); ctx.fill();
        ctx.fillStyle = "#f5c060"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("[pickaxe] need a pickaxe to mine", W / 2, H / 2 - 5);
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
  }, [seed]);

  return (
    <div style={{ width:"100%", height:"100svh", background:"#0a0804", position:"relative", userSelect:"none" }}>
      <canvas ref={canvasRef} style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }} />
      <MineHotbar
        hotbar={hotbar ?? []}
        selectedSlot={selectedHotbarSlot}
        onSelectSlot={idx => { setSelectedHotbarSlot(idx); selectedSlotRef.current = idx; }}
        onUseItem={useHotbarItem}
        equipment={equipment}
      />
    </div>
  );
}