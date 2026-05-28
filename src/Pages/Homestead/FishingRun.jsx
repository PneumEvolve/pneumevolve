// src/Pages/Homestead/FishingRun.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  LAKE_W, LAKE_H, FISH_TABLE, generateFishingRun,
  seededRand, addToInventory, fullEmptyInventory, getEquipStats,
  HOTBAR_ITEMS, HOTBAR_SIZE,
} from "./gameEngine";
import { ItemIcon } from "./ItemIcon";
import { makeSounds } from "./audio_sounds";
import { PauseOverlay } from "./runs_PauseOverlay";

const PLAYER_SPEED   = 110;
const RUN_DURATION   = 180; // 3 minutes
const MOVE_THROTTLE  = 50;
const LOOT_FLOAT_DUR = 1.4;

// ─── Fishing state machine ────────────────────────────────────────────────────
// idle → casting → waiting → biting → reeling → caught/missed
const FISH_CAST_DIST  = 180;     // how far the lure lands in front of player
const FISH_WAIT_MIN   = 2.5;     // min seconds before a bite
const FISH_WAIT_MAX   = 7.0;
const FISH_BITE_WINDOW = 1.8;    // seconds to reel before fish escapes
const FISH_REEL_TIME  = 1.2;     // hold space to reel it in

// makeSounds now lives in ./audio/sounds.js and takes a palette name.
// The palette for this run is "fishing".

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawLakeBackground(ctx, camX, W, H, t) {
  // Sky
  ctx.fillStyle = "#2a4a7a"; ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 317 + 42) & 0x7fff) / 0x7fff * W;
    const sy = ((i * 173 + 13) & 0x7fff) / 0x7fff * (H * 0.45);
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.2 + i * 0.8));
    ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.8})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // Moon
  ctx.fillStyle = "#f5ead0";
  ctx.beginPath(); ctx.arc(W * 0.8, 40, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a4a7a";
  ctx.beginPath(); ctx.arc(W * 0.8 + 10, 35, 24, 0, Math.PI * 2); ctx.fill();

  // Water
  const waterY = H * 0.42;
  ctx.fillStyle = "#1a2d4a"; ctx.fillRect(0, waterY, W, H - waterY);

  // Water shimmer rows
  for (let row = 0; row < 8; row++) {
    const wy = waterY + row * 32;
    for (let col = 0; col < Math.ceil(W / 48) + 2; col++) {
      const wx = col * 48 - (camX * 0.6 % 48);
      const wc = Math.floor((col * 48 + Math.floor(camX * 0.6 / 48) * 48) / 48);
      const n  = ((wc * 773 + row * 41 + 13) & 0x7fffffff) / 0x7fffffff;
      if (n > 0.6) {
        const shimmer = 0.03 + 0.04 * Math.sin(t * 2.5 + wc * 0.4 + row);
        ctx.fillStyle = `rgba(100,180,255,${shimmer})`;
        ctx.fillRect(wx, wy + n * 20, 20 + n * 24, 2);
      }
    }
  }

  // Water reflection of moon
  const reflY = waterY + 20;
  for (let i = 0; i < 6; i++) {
    const alpha = (0.08 - i * 0.01) * (0.6 + 0.4 * Math.sin(t * 1.8 + i));
    ctx.fillStyle = `rgba(245,234,208,${alpha})`;
    ctx.fillRect(W * 0.78 - i * 8, reflY + i * 18, 18 + i * 14, 4);
  }

  // Shore (top of water)
  ctx.fillStyle = "#3a5a28"; ctx.fillRect(0, waterY - 18, W, 22);
  // Shore grass tufts
  for (let i = 0; i < Math.ceil(W / 30) + 2; i++) {
    const gx = i * 30 - (camX % 30);
    const n  = ((i * 137) & 0x7fff) / 0x7fff;
    if (n > 0.4) {
      ctx.fillStyle = "#4a7a30";
      ctx.fillRect(gx, waterY - 22, 3, 8 + n * 6);
    }
  }

  // Dark vignette edges
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,10,0.5)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawFishingSpot(ctx, spot, camX, t) {
  if (!spot.active) return;
  const sx = spot.x - camX;
  if (sx < -30 || sx > 9999) return;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + spot.x * 0.01);
  ctx.save();
  ctx.globalAlpha = 0.25 + pulse * 0.15;
  ctx.strokeStyle = "#4aafff";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(sx, spot.y, 22 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, spot.y, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawLure(ctx, lx, ly, camX, t, fishState) {
  if (fishState === "idle") return;
  const sx = lx - camX;
  const bob = fishState === "waiting" || fishState === "biting"
    ? Math.sin(t * 2.8) * 3
    : 0;

  // Line from somewhere offscreen top (player) to lure
  ctx.strokeStyle = "rgba(200,200,160,0.6)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(sx, ly + bob - 40); ctx.lineTo(sx, ly + bob); ctx.stroke();
  ctx.setLineDash([]);

  // Lure float
  const lureCol = fishState === "biting" ? "#ff6040" : "#f0c840";
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(sx + 2, ly + bob + 4, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lureCol;
  ctx.beginPath(); ctx.ellipse(sx, ly + bob, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath(); ctx.ellipse(sx - 2, ly + bob - 3, 2, 4, -0.4, 0, Math.PI * 2); ctx.fill();

  if (fishState === "biting") {
    // Dramatic ripples
    ctx.strokeStyle = "rgba(255,100,40,0.6)";
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 3; r++) {
      const rad = 14 + r * 12 + ((t * 60) % 12);
      ctx.globalAlpha = Math.max(0, 1 - rad / 50);
      ctx.beginPath(); ctx.arc(sx, ly + bob, rad, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawFishPlayer(ctx, px, py, facing, step, t, character) {
  const bobY = (step === 1 || step === 3) ? -1 : 0;
  const { skin = "light", outfit = "blue", hair = "short", hat = "none" } = character || {};

  const SKINS   = { light:"#f5c5a3", medium:"#d4956a", tan:"#c07840", brown:"#8b5a2b", dark:"#5a3018" };
  const OUTFITS = { blue:["#5b8dd9","#3a6abf"], green:["#5a9a4a","#3a7a2a"], red:["#c05040","#8a2820"],
                    purple:["#7a5ab0","#5a3a8a"], orange:["#d07830","#a05010"], teal:["#4a9a8a","#2a7a6a"] };
  const HAIRS   = { short:"#7a4f2a", long:"#3a2010", curly:"#c88040", braid:"#884020" };
  const HATS_C  = { cap:"#5a3a8a", straw:"#d4a855", beanie:"#c05040" };

  const skinCol = SKINS[skin] || "#f5c5a3";
  const [bodyCol, legCol] = OUTFITS[outfit] || ["#5b8dd9","#3a6abf"];
  const hairCol = HAIRS[hair] || "#7a4f2a";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, py + 2, 5, 9);
  ctx.fillRect(px + 1, py + 2, 5, 9);

  // Body
  ctx.fillStyle = bodyCol;
  ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);

  // Arms — casting pose (both arms extend toward facing)
  ctx.fillStyle = bodyCol;
  if (facing === "right") {
    ctx.fillRect(px + 7, py - 14 + bobY, 12, 4);
    ctx.fillRect(px - 10, py - 9 + bobY, 3, 8);
  } else {
    ctx.fillRect(px - 19, py - 14 + bobY, 12, 4);
    ctx.fillRect(px + 7, py - 9 + bobY, 3, 8);
  }

  // Head
  ctx.fillStyle = skinCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);

  // Hat
  if (hat !== "none" && HATS_C[hat]) {
    ctx.fillStyle = HATS_C[hat];
    if (hat === "cap")    { ctx.fillRect(px - 8, py - 27 + bobY, 16, 6); ctx.fillRect(px - 10, py - 28 + bobY, 20, 3); }
    if (hat === "straw")  { ctx.beginPath(); ctx.ellipse(px, py - 27 + bobY, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px - 6, py - 35 + bobY, 12, 10); }
    if (hat === "beanie") { ctx.beginPath(); ctx.arc(px, py - 24 + bobY, 8, Math.PI, 0); ctx.fill(); }
  }

  // Fishing rod held up
  const rodX = facing === "right" ? px + 16 : px - 16;
  ctx.strokeStyle = "#8b6020"; ctx.lineWidth = 2; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(facing === "right" ? px + 7 : px - 7, py - 8 + bobY);
  ctx.lineTo(rodX + (facing === "right" ? 12 : -12), py - 30 + bobY);
  ctx.stroke();
}

function drawFishHUD(ctx, W, H, state, inventory, t) {
  ctx.fillStyle = "rgba(10,20,36,0.92)"; ctx.fillRect(0, 0, W, 32);

  // Timer
  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#80d0ff";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2, "0")}`, W / 2, 16);

  // Catch counts
  ctx.textAlign = "right"; ctx.font = "11px monospace"; ctx.fillStyle = "#a8d8f0";
  ctx.fillText(
    `🐟${inventory.fish ?? 0}  🐠${inventory.big_fish ?? 0}  🐡${inventory.rare_fish ?? 0}  💎${inventory.gems ?? 0}`,
    W - 14, 16
  );

  // Cast counter (left)
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(200,220,255,0.5)"; ctx.font = "10px monospace";
  ctx.fillText(`${state.catches} caught`, 14, 16);

  // Bottom tip bar
  ctx.fillStyle = "rgba(10,20,36,0.75)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(180,210,255,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  const hint =
    state.fishState === "idle"    ? "WASD to move  ·  walk to a glowing spot & press Space to cast  ·  [Esc] pause" :
    state.fishState === "casting" ? "casting..." :
    state.fishState === "waiting" ? "waiting for a bite..." :
    state.fishState === "biting"  ? "!! BITE !! — hold Space to reel!" :
    state.fishState === "reeling" ? "reeling in... keep holding!" :
    "WASD to move  ·  Space to cast  ·  [Esc] pause";

  ctx.fillText(hint, W / 2, H - 13);
}

function drawReelBar(ctx, W, H, reelProgress) {
  const bw = 200, bh = 14;
  const bx = W / 2 - bw / 2, by = H / 2 + 30;
  ctx.fillStyle = "rgba(10,20,36,0.88)";
  ctx.beginPath(); ctx.roundRect(bx - 12, by - 8, bw + 24, bh + 16, 8); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = `hsl(${140 + reelProgress * 80}, 70%, 55%)`;
  ctx.fillRect(bx, by, bw * reelProgress, bh);
  ctx.strokeStyle = "rgba(80,200,255,0.6)"; ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = "#80d8ff"; ctx.font = "bold 11px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText("reel!", W / 2, by - 2);
}

// ─── Hotbar overlay ───────────────────────────────────────────────────────────
const HOTBAR_DISPLAY_ICONS = {
  axe:"🪓", pickaxe:"⛏️", fishing_rod:"🎣",
  leather_armor:"🛡️", cooked_meat:"🍖", potion_table:"🧪",
  fish:"🐟", big_fish:"🐠", rare_fish:"🐡", apples:"🍎",
  berries:"🫐", mushrooms:"🍄", herbs:"🌿",
};

function FishHotbar({ hotbar, selectedSlot, onSelectSlot, equipment }) {
  return (
    <div style={{
      position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 4, padding: "6px 8px",
      background: "rgba(10,20,36,0.88)", borderRadius: 12,
      border: "1px solid rgba(80,200,255,0.2)",
      zIndex: 5, pointerEvents: "auto",
    }}>
      {(hotbar.length ? hotbar : Array(HOTBAR_SIZE).fill(null)).map((slot, idx) => {
        const isSelected = idx === selectedSlot;
        const isEquipped = slot?.item === "fishing_rod" && equipment?.weapon === "fishing_rod";
        return (
          <div key={idx}
            onClick={() => onSelectSlot(idx)}
            style={{
              width: 44, height: 44, borderRadius: 8, cursor: "pointer",
              background: isSelected ? "rgba(80,200,255,0.15)" : "rgba(255,255,255,0.03)",
              border: `2px solid ${isSelected ? "rgba(80,200,255,0.8)" : isEquipped ? "rgba(80,200,255,0.5)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              position: "relative", transition: "border-color 0.1s",
            }}
          >
            {slot ? (
              <>
                <ItemIcon id={slot.item} size={22} />
                {slot.qty != null && (
                  <span style={{ fontSize: 9, color: "rgba(80,200,255,0.8)", lineHeight: 1, position: "absolute", bottom: 2, right: 4 }}>
                    {slot.qty}
                  </span>
                )}
                {isEquipped && (
                  <div style={{ position: "absolute", top: 2, right: 2, width: 6, height: 6, borderRadius: "50%", background: "rgba(80,200,255,0.9)" }} />
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function FishingRun({ room, seed, coOp = false, onRunComplete, character, equipment, hotbar, onHotbarChange }) {
  const canvasRef      = useRef(null);
  const rafRef         = useRef(null);
  const keysRef        = useRef({});
  const stateRef       = useRef(null);
  const soundRef       = useRef(null);
  const lastMoveRef    = useRef(0);
  const randRef        = useRef(seededRand(seed ?? Date.now()));
  const lootFloatsRef  = useRef([]);
  const equipmentRef   = useRef(equipment ?? {});
  const characterRef   = useRef(character ?? {});
  const hotbarRef      = useRef(hotbar ?? []);
  const spaceHeldRef   = useRef(false);
  const partnerAppearanceRef = useRef({ character: null, equipment: null });

  useEffect(() => { equipmentRef.current = equipment ?? {}; }, [equipment]);
  useEffect(() => { characterRef.current = character ?? {}; }, [character]);
  useEffect(() => { hotbarRef.current = hotbar ?? []; }, [hotbar]);

  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
  const selectedSlotRef = useRef(0);
  useEffect(() => { selectedSlotRef.current = selectedHotbarSlot; }, [selectedHotbarSlot]);

  // Pause / abandon overlay (shown when player presses Escape mid-run)
  const [pauseOpen, setPauseOpen] = useState(false);
  const pauseOpenRef = useRef(false);
  useEffect(() => { pauseOpenRef.current = pauseOpen; }, [pauseOpen]);

  const useHotbarItem = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.over) return;
    const hb = hotbarRef.current;
    const slot = selectedSlotRef.current;
    const entry = hb?.[slot];
    if (!entry) return;
    const info = HOTBAR_ITEMS[entry.item];
    if (!info?.useEffect?.heal) return;
    lootFloatsRef.current.push({
      text: `used ${entry.item}`,
      worldX: state.px, worldY: state.py - 20,
      born: performance.now(),
    });
    const newHb = [...hb];
    const newQty = (entry.qty ?? 1) - 1;
    newHb[slot] = newQty > 0 ? { ...entry, qty: newQty } : null;
    hotbarRef.current = newHb;
    onHotbarChange?.(newHb);
    soundRef.current?.pickup();
  }, [onHotbarChange]);

  // Supabase sync
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
  }).current;

  const { sendRunMove, sendPlayerAppearance } =
    useHearthroom(room?.id ?? null, handlers, ":run");

  useEffect(() => {
    sendPlayerAppearance(character, equipment, hotbar);
  }, [character, equipment, hotbar]); // eslint-disable-line react-hooks/exhaustive-deps

  function rollCatch(rand) {
    const r = rand();
    let cumulative = 0;
    for (const entry of FISH_TABLE) {
      cumulative += entry.rarity;
      if (r < cumulative) return entry;
    }
    return FISH_TABLE[0];
  }

  function initState() {
    const { spots } = generateFishingRun(seed ?? Date.now());
    return {
      px: 80, py: LAKE_H / 2, facing: "right",
      step: 0, stepTimer: 0,
      camX: 0, elapsed: 0,
      catches: 0, over: false,
      // Fishing state machine
      fishState: "idle",    // idle|casting|waiting|biting|reeling
      lureX: 0, lureY: 0,
      fishWaitTimer: 0,     // countdown to bite
      fishWaitMax: 4,
      biteTimer: 0,         // countdown until fish escapes
      reelProgress: 0,      // 0..1
      nearSpotId: null,
      spots,
      inventory: { ...fullEmptyInventory() },
      partnerX: 0, partnerY: 0, partnerFacing: "right", partnerVisible: false,
      lastTime: performance.now(),
    };
  }

  function finishRun(state) {
    if (state.over) return;
    state.over = true;
    onRunComplete?.({ ...state.inventory, kills: 0 });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundRef.current = makeSounds("fishing");

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current = initState();
    lootFloatsRef.current = [];

    function doCast() {
      const state = stateRef.current;
      if (!state || state.over) return;
      const equipStats = getEquipStats(equipmentRef.current);

      if (!equipStats.canFish) {
        state.noRodFlash = 1.8;
        return;
      }

      if (state.fishState !== "idle") return;
      if (state.nearSpotId === null) return;

      const spot = state.spots.find(s => s.id === state.nearSpotId);
      if (!spot || !spot.active) return;

      state.fishState = "casting";
      state.lureX = state.px + (state.facing === "left" ? -FISH_CAST_DIST : FISH_CAST_DIST);
      state.lureY = state.py - 20;
      soundRef.current?.splash();

      state.lureX = spot.x + (randRef.current() - 0.5) * 40;
      state.lureY = spot.y + (randRef.current() - 0.5) * 20;

      setTimeout(() => {
        if (!stateRef.current || stateRef.current.over) return;
        stateRef.current.fishState = "waiting";
        const wait = FISH_WAIT_MIN + randRef.current() * (FISH_WAIT_MAX - FISH_WAIT_MIN);
        stateRef.current.fishWaitTimer = wait;
        stateRef.current.fishWaitMax   = wait;
      }, 400);
    }

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();

      if (e.key === "Escape") {
        setPauseOpen(v => { pauseOpenRef.current = !v; return !v; });
        return;
      }

      if (pauseOpenRef.current) return; // swallow gameplay keys while paused

      if (e.key >= "1" && e.key <= "6") {
        const idx = parseInt(e.key) - 1;
        setSelectedHotbarSlot(idx);
        selectedSlotRef.current = idx;
      }
      if (e.key === "f" || e.key === "F" || e.key === "e" || e.key === "E") {
        useHotbarItem();
      }

      if (e.key === " ") {
        e.preventDefault();
        spaceHeldRef.current = true;
        const state = stateRef.current;
        if (!state) return;
        if (state.fishState === "idle")   doCast();
        if (state.fishState === "biting") { /* handled in tick */ }
      }
    };
    const onKeyUp = (e) => {
      delete keysRef.current[e.key];
      if (e.key === " ") spaceHeldRef.current = false;
    };
    const onClick = () => {
      soundRef.current?.unlock();
      if (pauseOpenRef.current) return;
      const state = stateRef.current;
      if (!state) return;
      if (state.fishState === "idle") doCast();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("click",   onClick);

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      const state = stateRef.current;
      if (!canvas || !state || state.over) return;

      // Pause world updates while pause overlay is open
      if (pauseOpenRef.current) { state.lastTime = ts; return; }

      const ctx  = canvas.getContext("2d");
      const W    = canvas.width, H = canvas.height;
      const dt   = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;
      const t    = ts / 1000;

      state.elapsed += dt;
      if (state.elapsed >= RUN_DURATION) { finishRun(state); return; }

      // ── Movement (only when idle / not actively reeling) ──────────────
      let dx = 0, dy = 0;
      const canMove = state.fishState === "idle";
      if (canMove) {
        if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
        if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
        if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; }
        if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        state.px = Math.max(20, Math.min(LAKE_W - 20, state.px + dx * PLAYER_SPEED * dt));
        state.py = Math.max(30, Math.min(LAKE_H - 30, state.py + dy * PLAYER_SPEED * dt));
      }

      if (dx !== 0 || dy !== 0) {
        state.stepTimer += dt;
        if (state.stepTimer > 0.22) { state.stepTimer = 0; state.step = (state.step + 1) % 4; }
      } else { state.step = 0; state.stepTimer = 0; }

      if (state.noRodFlash > 0) state.noRodFlash = Math.max(0, state.noRodFlash - dt * 1.0);

      // ── Detect nearest fishing spot ───────────────────────────────────
      if (state.fishState === "idle") {
        let nearId = null, nearDist = 80;
        for (const spot of state.spots) {
          if (!spot.active) continue;
          const d = Math.hypot(state.px - spot.x, state.py - spot.y);
          if (d < nearDist) { nearDist = d; nearId = spot.id; }
        }
        state.nearSpotId = nearId;
      }

      // ── Fishing state machine ─────────────────────────────────────────
      if (state.fishState === "waiting") {
        state.fishWaitTimer -= dt;
        if (state.fishWaitTimer <= 0) {
          state.fishState = "biting";
          state.biteTimer = FISH_BITE_WINDOW;
          soundRef.current?.nibble();
        }
      }

      if (state.fishState === "biting") {
        state.biteTimer -= dt;
        if (spaceHeldRef.current) {
          state.fishState = "reeling";
          state.reelProgress = 0;
        } else if (state.biteTimer <= 0) {
          state.fishState = "idle";
          state.nearSpotId = null;
          soundRef.current?.miss();
          lootFloatsRef.current.push({
            text: "got away!",
            worldX: state.lureX, worldY: state.lureY - 20,
            born: performance.now(),
          });
        }
      }

      if (state.fishState === "reeling") {
        if (spaceHeldRef.current) {
          state.reelProgress += dt / FISH_REEL_TIME;
          if (state.reelProgress >= 1) {
            state.fishState = "idle";
            state.catches++;
            soundRef.current?.catch_();
            const caught = rollCatch(randRef.current);
            const qty = caught.min + Math.floor(randRef.current() * (caught.max - caught.min + 1));
            addToInventory(state.inventory, caught.item, qty);
            lootFloatsRef.current.push({
              text: `${caught.icon} +${qty} ${caught.label}`,
              worldX: state.lureX, worldY: state.lureY - 10,
              born: performance.now(),
            });
            const spot = state.spots.find(s => s.id === state.nearSpotId);
            if (spot) {
              spot.active = false;
              const reactivate = 18 + randRef.current() * 20;
              setTimeout(() => { if (spot) spot.active = true; }, reactivate * 1000);
            }
            state.nearSpotId = null;
          }
        } else {
          state.reelProgress -= dt * 0.8;
          if (state.reelProgress <= 0) {
            state.fishState = "idle";
            state.nearSpotId = null;
            soundRef.current?.miss();
            lootFloatsRef.current.push({
              text: "slipped away...",
              worldX: state.lureX, worldY: state.lureY - 20,
              born: performance.now(),
            });
          }
        }
      }

      // ── Camera ────────────────────────────────────────────────────────
      const targetCamX = Math.max(0, Math.min(LAKE_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      // Broadcast position
      if (ts - lastMoveRef.current > MOVE_THROTTLE) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // ── DRAW ──────────────────────────────────────────────────────────
      const camX = state.camX;
      drawLakeBackground(ctx, camX, W, H, t);

      for (const spot of state.spots) {
        drawFishingSpot(ctx, spot, camX, t);
      }

      if (state.nearSpotId && state.fishState === "idle") {
        const spot = state.spots.find(s => s.id === state.nearSpotId);
        if (spot) {
          ctx.save();
          ctx.strokeStyle = "rgba(255,240,100,0.7)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(spot.x - camX, spot.y, 32, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,240,100,0.8)"; ctx.font = "bold 10px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("[Space] cast", spot.x - camX, spot.y - 34);
          ctx.restore();
        }
      }

      drawLure(ctx, state.lureX, state.lureY, camX, t, state.fishState);
      drawFishPlayer(ctx, state.px - camX, state.py, state.facing, state.step, t, characterRef.current);

      if (state.partnerVisible) {
        const gpx = state.partnerX - camX, gpy = state.partnerY;
        const pa = partnerAppearanceRef.current;
        ctx.save(); ctx.globalAlpha = 0.5;
        drawFishPlayer(ctx, gpx, gpy, state.partnerFacing, 0, t, pa.character);
        ctx.restore();
        ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.font = "9px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText("P2", gpx, gpy - 26);
      }

      if (state.fishState === "reeling") {
        drawReelBar(ctx, W, H, state.reelProgress);
      }

      if (state.fishState === "biting") {
        const alpha = 0.6 + 0.4 * Math.sin(t * 12);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ff6040"; ctx.font = "bold 18px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("!! BITE !!", W / 2, H / 2 - 20);
        ctx.restore();
        const bw = 160, bh = 6;
        const bx = W / 2 - bw / 2, by = H / 2 - 4;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#ff6040";
        ctx.fillRect(bx, by, bw * (state.biteTimer / FISH_BITE_WINDOW), bh);
      }

      const now = performance.now();
      lootFloatsRef.current = lootFloatsRef.current.filter(lf => now - lf.born < LOOT_FLOAT_DUR * 1000);
      for (const lf of lootFloatsRef.current) {
        const age   = (now - lf.born) / (LOOT_FLOAT_DUR * 1000);
        const alpha = 1 - age;
        const fx    = lf.worldX - camX;
        const fy    = lf.worldY - age * 44;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = "#a8e8ff"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, fx, fy);
        ctx.restore();
      }

      drawFishHUD(ctx, W, H, state, state.inventory, t);

      if (state.noRodFlash > 0) {
        const alpha = Math.min(1, state.noRodFlash);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(10,20,36,0.9)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 104, H / 2 - 20, 208, 30, 6); ctx.fill();
        ctx.fillStyle = "#80d0ff"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🎣 need a fishing rod to fish", W / 2, H / 2 - 5);
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
    };
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: "100%", height: "100svh", background: "#1a2d4a", position: "relative", userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      />
      {/* Pause / abandon overlay */}
      <PauseOverlay
        open={pauseOpen}
        theme="fishing"
        runLabel="🎣 Fishing Trip"
        onResume={() => { setPauseOpen(false); pauseOpenRef.current = false; }}
        onAbandon={() => { setPauseOpen(false); pauseOpenRef.current = false; finishRun(stateRef.current); }}
      />
      <FishHotbar
        hotbar={hotbar ?? []}
        selectedSlot={selectedHotbarSlot}
        onSelectSlot={idx => { setSelectedHotbarSlot(idx); selectedSlotRef.current = idx; }}
        equipment={equipment}
      />
    </div>
  );
}