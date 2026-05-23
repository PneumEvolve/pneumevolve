// src/Pages/Homestead/FishingRun.jsx
// Fishing run — cast your rod, watch for the bob, tap to catch!
import React, { useEffect, useRef } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  LAKE_W, LAKE_H,
  generateFishingRun, FISH_TABLE,
  seededRand, addToInventory, fullEmptyInventory,
} from "./gameEngine";

const PLAYER_SPEED  = 110;
const RUN_DURATION  = 180;
const CAST_R        = 30;   // distance to fishing spot
const BOB_DELAY_MIN = 2;    // seconds before fish bites
const BOB_DELAY_MAX = 6;
const CATCH_WINDOW  = 0.9;  // seconds to react

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
    splash:  () => beep("sine", 300, 80, 0.3, 0.15),
    bite:    () => { beep("sine",600,800,0.08,0.2); beep("sine",800,600,0.08,0.2); },
    catch:   () => beep("sine",  880, 1200, 0.25, 0.15),
    miss:    () => beep("sawtooth", 200, 80, 0.2, 0.12),
  };
}

function drawLakeBackground(ctx, camX, W, H, t) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.35);
  skyGrad.addColorStop(0, "#b8d8f0");
  skyGrad.addColorStop(1, "#d8eef8");
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H * 0.35);

  // Distant shore/hills
  ctx.fillStyle = "#5a9632";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.35);
  for (let x = 0; x <= W; x += 40) {
    const wx = x + (Math.floor(camX / 40) * 40) - (camX % 40);
    const wc = Math.floor((x + Math.floor(camX / 40) * 40) / 40);
    const n = ((wc * 137) & 0xffff) / 0xffff;
    ctx.lineTo(wx, H * 0.3 + n * 20);
  }
  ctx.lineTo(W, H * 0.35); ctx.closePath(); ctx.fill();

  // Water
  const waterGrad = ctx.createLinearGradient(0, H * 0.35, 0, H);
  waterGrad.addColorStop(0, "#4a8abf");
  waterGrad.addColorStop(1, "#2a5a8f");
  ctx.fillStyle = waterGrad; ctx.fillRect(0, H * 0.35, W, H * 0.65);

  // Water shimmer
  ctx.save(); ctx.globalAlpha = 0.15;
  for (let i = 0; i < 12; i++) {
    const wx = ((i * 120 - camX * 0.4 + t * 25) % (W + 60)) - 20;
    const wy = H * 0.4 + i * (H * 0.05);
    const ww = 30 + ((i * 37) % 40);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath(); ctx.ellipse(wx, wy, ww, 2 + Math.sin(t + i) * 1, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Lily pads
  for (let i = 0; i < 8; i++) {
    const lx = ((i * 260 + 80 - camX * 0.7) % (W + 100)) - 30;
    const ly = H * 0.45 + ((i * 43) % (H * 0.3));
    ctx.fillStyle = "#2a6820";
    ctx.beginPath(); ctx.ellipse(lx, ly, 14, 9, i * 0.5, 0, Math.PI * 2); ctx.fill();
    // notch
    ctx.fillStyle = "#4a8abf";
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, 14, -0.3, 0.3); ctx.closePath(); ctx.fill();
  }

  // Reeds at bottom
  for (let i = 0; i < 16; i++) {
    const rx = ((i * 80 + 20 - camX * 0.9) % (W + 60)) - 20;
    const rh = 40 + ((i * 23) % 30);
    ctx.strokeStyle = "#5a7a20"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx, H);
    ctx.quadraticCurveTo(rx + Math.sin(t + i) * 6, H - rh * 0.5, rx + Math.sin(t + i) * 10, H - rh);
    ctx.stroke();
    // Reed head
    ctx.fillStyle = "#8a5a20";
    ctx.beginPath(); ctx.ellipse(rx + Math.sin(t + i) * 10, H - rh, 4, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawFishingSpot(ctx, spot, camX, t) {
  if (!spot.active) return;
  const sx = spot.x - camX, sy = spot.y;
  // Ripple rings
  for (let i = 0; i < 3; i++) {
    const r = 8 + i * 10 + Math.sin(t * 1.5 + i) * 3;
    ctx.strokeStyle = `rgba(255,255,255,${0.3 - i * 0.08})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
  }
  // Glowing center
  const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
  grd.addColorStop(0, "rgba(255,220,80,0.5)");
  grd.addColorStop(1, "rgba(255,220,80,0)");
  ctx.fillStyle = grd; ctx.fillRect(sx - 14, sy - 14, 28, 28);
}

function drawFishingPlayer(ctx, px, py, facing, step, casting, t, character) {
  const bobY = (step === 1 || step === 3) ? -1 : 0;
  const { skin = 'light', outfit = 'blue', hair = 'short', hat = 'none' } = character || {};
  const SKINS    = { light:'#f5c5a3', medium:'#d4956a', tan:'#c07840', brown:'#8b5a2b', dark:'#5a3018' };
  const OUTFITS  = { blue:['#5b8dd9','#3a6abf'], green:['#5a9a4a','#3a7a2a'], red:['#c05040','#8a2820'],
                     purple:['#7a5ab0','#5a3a8a'], orange:['#d07830','#a05010'], teal:['#4a9a8a','#2a7a6a'] };
  const HAIRS    = { short:'#7a4f2a', long:'#3a2010', curly:'#c88040', braid:'#884020' };
  const HATS_COL = { cap:'#5a3a8a', straw:'#d4a855', beanie:'#c05040' };

  const skinCol = SKINS[skin] || '#f5c5a3';
  const [bodyCol, legCol] = OUTFITS[outfit] || ['#5b8dd9','#3a6abf'];
  const hairCol = HAIRS[hair] || '#7a4f2a';

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = legCol;
  ctx.fillRect(px - 6, py + 2, 5, 9);
  ctx.fillRect(px + 1, py + 2, 5, 9);

  ctx.fillStyle = bodyCol; ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);

  // Arms (rod holding pose if casting)
  if (casting) {
    ctx.fillStyle = bodyCol;
    ctx.fillRect(px + 7, py - 16 + bobY, 3, 12);
    ctx.fillRect(px - 10, py - 9 + bobY, 3, 8);
    // Fishing rod
    ctx.strokeStyle = "#c8a050"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + 10, py - 16 + bobY); ctx.lineTo(px + 28, py - 30 + bobY); ctx.stroke();
    // Line
    ctx.strokeStyle = "rgba(200,200,200,0.7)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px + 28, py - 30 + bobY); ctx.lineTo(px + 28 + 14, py - 14 + bobY); ctx.stroke();
  } else {
    ctx.fillStyle = bodyCol;
    ctx.fillRect(px - 10, py - 9 + bobY, 3, 8);
    ctx.fillRect(px + 7,  py - 9 + bobY, 3, 8);
  }

  ctx.fillStyle = skinCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = hairCol; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);

  if (hat !== 'none' && HATS_COL[hat]) {
    ctx.fillStyle = HATS_COL[hat];
    if (hat === 'straw') {
      ctx.beginPath(); ctx.ellipse(px, py - 27 + bobY, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 6, py - 35 + bobY, 12, 10);
    } else if (hat === 'cap') {
      ctx.fillRect(px - 8, py - 27 + bobY, 16, 6);
      ctx.fillRect(px - 10, py - 28 + bobY, 20, 3);
    } else if (hat === 'beanie') {
      ctx.beginPath(); ctx.arc(px, py - 24 + bobY, 8, Math.PI, 0); ctx.fill();
    }
  }
}

function drawBobber(ctx, bx, by, bobbing, t) {
  const bob = bobbing ? Math.sin(t * 20) * 5 : Math.sin(t * 2) * 2;
  // Line
  ctx.strokeStyle = "rgba(200,200,200,0.6)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx, by - 20); ctx.lineTo(bx, by + bob); ctx.stroke();
  // Float
  ctx.fillStyle = "#ff4444";
  ctx.beginPath(); ctx.arc(bx, by + bob, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(bx, by + bob, 6, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by + bob, 6, 0, Math.PI * 2); ctx.stroke();

  if (bobbing) {
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "bold 14px monospace";
    ctx.textAlign = "center"; ctx.fillText("! PULL !", bx, by + bob - 18);
  }
}

function drawFishingHUD(ctx, W, H, state, inventory, t) {
  ctx.fillStyle = "rgba(4,12,20,0.88)"; ctx.fillRect(0, 0, W, 32);

  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#80d8f0";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);

  ctx.textAlign = "right"; ctx.font = "11px monospace"; ctx.fillStyle = "#a0d8f0";
  ctx.fillText(`🐟${inventory.fish??0}  🐠${inventory.big_fish??0}  🐡${inventory.rare_fish??0}  💎${inventory.gems??0}`, W - 14, 16);

  ctx.textAlign = "left"; ctx.fillStyle = "rgba(120,210,255,0.7)"; ctx.font = "11px monospace";
  ctx.fillText(`${state.catches ?? 0} caught`, 16, 16);

  // Casting instruction
  if (!state.casting) {
    ctx.fillStyle = "rgba(4,12,20,0.72)"; ctx.fillRect(0, H - 50, W, 50);
    ctx.fillStyle = "rgba(160,210,255,0.5)"; ctx.font = "9px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("WASD to move  ·  walk near glowing spots  ·  [Space/Click] to cast", W / 2, H - 32);
    ctx.fillStyle = "rgba(160,210,255,0.35)";
    ctx.fillText("[Esc] return home", W / 2, H - 18);
  }

  if (state.casting) {
    const info = state.catchState === 'biting'
      ? "🐟 FISH IS BITING! Press [Space] or [Click] to pull!"
      : state.catchState === 'waiting'
      ? "waiting for a bite..."
      : "casting...";
    ctx.fillStyle = "rgba(4,12,20,0.82)"; ctx.fillRect(0, H - 36, W, 36);
    ctx.fillStyle = state.catchState === 'biting' ? "#ffe080" : "rgba(160,210,255,0.5)";
    ctx.font = state.catchState === 'biting' ? "bold 12px monospace" : "10px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(info, W / 2, H - 18);
  }
}

export default function FishingRun({ room, seed, coOp = false, onRunComplete, character }) {
  const canvasRef     = useRef(null);
  const rafRef        = useRef(null);
  const keysRef       = useRef({});
  const stateRef      = useRef(null);
  const soundRef      = useRef(null);
  const randRef       = useRef(seededRand(seed ?? Date.now()));
  const lootFloatsRef = useRef([]);

  const handlers = useRef({}).current;
  const { sendRunMove } = useHearthroom(room?.id ?? null, handlers, ":run");

  function initState() {
    const { spots } = generateFishingRun(seed ?? Date.now());
    return {
      px: 80, py: LAKE_H * 0.45, facing: "right",
      step: 0, stepTimer: 0,
      camX: 0, elapsed: 0, over: false,
      spots,
      inventory: { ...fullEmptyInventory() },
      catches: 0,
      // Fishing state machine
      casting: false,
      castSpot: null,  // { x, y }
      catchState: null, // 'waiting' | 'biting' | 'missed'
      biteTimer: 0,
      catchTimer: 0,
      lastTime: performance.now(),
    };
  }

  function rollFish(rand) {
    const roll = rand();
    let cumulative = 0;
    for (const entry of FISH_TABLE) {
      cumulative += entry.rarity;
      if (roll < cumulative) return entry;
    }
    return FISH_TABLE[0];
  }

  function finishRun(state) {
    if (state.over) return;
    state.over = true;
    onRunComplete?.({ ...state.inventory, kills: 0 });
  }

  function handleCast(state) {
    if (state.over) return;
    if (state.casting) {
      // Try to pull
      if (state.catchState === 'biting') {
        const fish = rollFish(randRef.current);
        addToInventory(state.inventory, fish.item, 1);
        state.catches++;
        state.casting = false;
        state.catchState = null;
        if (state.castSpot) state.castSpot.active = false;
        soundRef.current?.catch();
        lootFloatsRef.current.push({
          text: `${fish.icon} ${fish.label}!`,
          worldX: state.px,
          worldY: state.py - 30,
          born: performance.now(),
        });
      } else if (state.catchState === 'waiting') {
        // Reel in early — miss
        state.casting = false;
        state.catchState = null;
        soundRef.current?.miss();
      }
      return;
    }
    // Find nearest active spot
    const nearSpot = state.spots.find(s => s.active && Math.hypot(state.px - s.x, state.py - s.y) < CAST_R * 2.5);
    if (nearSpot) {
      state.casting = true;
      state.castSpot = nearSpot;
      state.catchState = 'waiting';
      state.biteTimer = BOB_DELAY_MIN + randRef.current() * (BOB_DELAY_MAX - BOB_DELAY_MIN);
      soundRef.current?.splash();
    }
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

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (e.key === "Escape") finishRun(stateRef.current);
      if (e.key === " ") handleCast(stateRef.current);
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };
    const onClick = () => { soundRef.current?.unlock(); handleCast(stateRef.current); };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("click",   onClick);

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
      if (state.elapsed >= RUN_DURATION) { finishRun(state); return; }

      // Only move if not casting
      if (!state.casting) {
        let dx = 0, dy = 0;
        if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
        if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
        if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; state.facing = "up"; }
        if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; state.facing = "down"; }
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        state.px = Math.max(20, Math.min(LAKE_W - 20, state.px + dx * PLAYER_SPEED * dt));
        state.py = Math.max(30, Math.min(LAKE_H - 30, state.py + dy * PLAYER_SPEED * dt));

        if (dx !== 0 || dy !== 0) {
          state.stepTimer += dt;
          if (state.stepTimer > 0.22) { state.stepTimer = 0; state.step = (state.step + 1) % 4; }
        } else { state.step = 0; state.stepTimer = 0; }
      }

      // Fishing state machine
      if (state.casting && state.catchState === 'waiting') {
        state.biteTimer -= dt;
        if (state.biteTimer <= 0) {
          state.catchState = 'biting';
          state.catchTimer = CATCH_WINDOW;
          soundRef.current?.bite();
        }
      } else if (state.casting && state.catchState === 'biting') {
        state.catchTimer -= dt;
        if (state.catchTimer <= 0) {
          // Missed the window
          state.casting = false;
          state.catchState = null;
          soundRef.current?.miss();
          lootFloatsRef.current.push({
            text: "got away...", worldX: state.px, worldY: state.py - 20, born: performance.now(),
          });
        }
      }

      // Camera
      const targetCamX = Math.max(0, Math.min(LAKE_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      if (ts - lastMoveRef.current > 50) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // DRAW
      const camX = state.camX;
      drawLakeBackground(ctx, camX, W, H, t);

      // Fishing spots
      for (const spot of state.spots) {
        const sx = spot.x - camX;
        if (sx < -40 || sx > W + 40) continue;
        drawFishingSpot(ctx, spot, camX, t);
      }

      // Bobber
      if (state.casting && state.castSpot) {
        drawBobber(ctx, state.castSpot.x - camX, state.castSpot.y, state.catchState === 'biting', t);
      }

      // Player
      drawFishingPlayer(ctx, state.px - camX, state.py, state.facing, state.step, state.casting, t, character);

      // Catch window bar
      if (state.casting && state.catchState === 'biting') {
        const bw = 160, bh = 8;
        const bx = W / 2 - bw / 2, by = canvas.height / 2 - 60;
        const pct = state.catchTimer / CATCH_WINDOW;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = pct > 0.4 ? "#40e080" : "#ff8040";
        ctx.fillRect(bx, by, bw * pct, bh);
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
      }

      // Loot floats
      const now = performance.now();
      lootFloatsRef.current = lootFloatsRef.current.filter(lf => now - lf.born < 1600);
      for (const lf of lootFloatsRef.current) {
        const age = (now - lf.born) / 1600;
        ctx.save(); ctx.globalAlpha = 1 - age;
        ctx.fillStyle = "#80e8ff"; ctx.font = "bold 12px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, lf.worldX - camX, lf.worldY - age * 36);
        ctx.restore();
      }

      drawFishingHUD(ctx, W, H, state, state.inventory, t);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("click",   onClick);
    };
  }, [seed]);

  return (
    <div style={{ width:"100%", height:"100svh", background:"#4a8abf", position:"relative", userSelect:"none" }}>
      <canvas ref={canvasRef} style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }} />
    </div>
  );
}