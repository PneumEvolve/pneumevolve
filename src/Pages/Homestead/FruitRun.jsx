// src/Pages/Homestead/FruitRun.jsx
// Peaceful fruit-picking run — no enemies, just gather!
import React, { useEffect, useRef } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  ORCHARD_W, ORCHARD_H,
  generateFruitRun, FRUIT_LOOT_TABLE, rollLoot,
  seededRand, addToInventory, fullEmptyInventory,
} from "./gameEngine";

const PLAYER_SPEED  = 140;
const RUN_DURATION  = 150;
const PICKUP_R      = 26;

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
    pluck:  () => beep("sine",   880, 660, 0.15, 0.12),
    collect:() => beep("sine",   660, 880, 0.10, 0.10),
  };
}

function drawOrchardBackground(ctx, camX, W, H, t) {
  // Sunny sky + meadow
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyGrad.addColorStop(0, "#87ceeb");
  skyGrad.addColorStop(1, "#c8e6f0");
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H * 0.4);

  // Ground
  const groundGrad = ctx.createLinearGradient(0, H * 0.4, 0, H);
  groundGrad.addColorStop(0, "#7ec850");
  groundGrad.addColorStop(1, "#5a9632");
  ctx.fillStyle = groundGrad; ctx.fillRect(0, H * 0.4, W, H * 0.6);

  // Grass detail
  for (let col = 0; col < Math.ceil(W / 40) + 2; col++) {
    const wx = col * 40 - (camX % 40);
    const wc = Math.floor((col * 40 + Math.floor(camX / 40) * 40) / 40);
    const n  = ((wc * 997 + 42) & 0x7fffffff) / 0x7fffffff;
    if (n > 0.5) {
      ctx.fillStyle = n > 0.75 ? "#5a9632" : "#6db840";
      ctx.fillRect(wx, H * 0.4 + n * (H * 0.3), 40, 4);
    }
  }

  // Floating clouds
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 380 - camX * 0.15 + t * 8) % (W + 200)) - 60;
    const cy = 30 + i * 18;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.ellipse(cx, cy, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 28, cy + 4, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 24, cy + 6, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Butterflies
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
    // Empty tree (harvested)
    ctx.fillStyle = "#7a4f2a"; ctx.fillRect(sx - 5, sy - 10, 10, 30);
    ctx.fillStyle = "#4a8030"; ctx.beginPath(); ctx.arc(sx, sy - 22, 20, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.beginPath(); ctx.arc(sx, sy - 22, 20, 0, Math.PI*2); ctx.fill();
    return;
  }
  const shake = tree.shakeTime > 0 ? Math.sin(t * 20) * 3 * Math.min(1, tree.shakeTime) : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(sx + 4, sy + 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

  // Trunk
  ctx.fillStyle = "#8a5a2a"; ctx.fillRect(sx - 6 + shake, sy - 8, 12, 28);

  // Canopy
  ctx.fillStyle = "#2d8a2d";
  ctx.beginPath(); ctx.arc(sx + shake, sy - 28, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3aa03a";
  ctx.beginPath(); ctx.arc(sx + shake - 10, sy - 38, 18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + shake + 12, sy - 34, 16, 0, Math.PI * 2); ctx.fill();

  // Apples!
  const applePositions = [[-14,-28],[8,-36],[18,-22],[-8,-42],[0,-28]];
  for (const [ax, ay] of applePositions) {
    ctx.fillStyle = "#e83030";
    ctx.beginPath(); ctx.arc(sx + shake + ax, sy + ay, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c02020";
    ctx.beginPath(); ctx.arc(sx + shake + ax + 1, sy + ay + 1, 2, 0, Math.PI * 2); ctx.fill();
    // Stem
    ctx.strokeStyle = "#5a3010"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx + shake + ax, sy + ay - 5); ctx.lineTo(sx + shake + ax + 2, sy + ay - 9); ctx.stroke();
  }
}

function drawBush(ctx, bush, camX, t) {
  const sx = bush.x - camX, sy = bush.y;
  if (!bush.alive) return;

  const shake = bush.shakeTime > 0 ? Math.sin(t * 20) * 2 * Math.min(1, bush.shakeTime) : 0;

  if (bush.type === 'mushroom') {
    // Mushroom
    ctx.fillStyle = "#b83020";
    ctx.beginPath(); ctx.arc(sx + shake, sy - 4, 16, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#c04030";
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath(); ctx.arc(sx + shake - 8 + i * 6, sy - 8, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e8d0a0"; ctx.fillRect(sx + shake - 5, sy - 4, 10, 12);
  } else {
    // Berry bush
    ctx.fillStyle = "#2a6820";
    ctx.beginPath(); ctx.arc(sx + shake, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + shake - 10, sy + 6, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + shake + 10, sy + 4, 11, 0, Math.PI * 2); ctx.fill();
    // Berries
    const berryPos = [[-8,-6],[4,-10],[12,-2],[-4,4],[8,2],[-12,2]];
    for (const [bx, by] of berryPos) {
      ctx.fillStyle = "#8020a0";
      ctx.beginPath(); ctx.arc(sx + shake + bx, sy + by, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a030c0";
      ctx.beginPath(); ctx.arc(sx + shake + bx - 1, sy + by - 1, 1.5, 0, Math.PI * 2); ctx.fill();
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
    const fx = sx - 18 + n * 36;
    const fy = sy - 12 + n2 * 24;
    const sway = Math.sin(t * 2 + i + flower.x * 0.01) * 2;
    ctx.fillStyle = "#5a9632"; ctx.fillRect(fx + sway - 1, fy, 2, 8);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(fx + sway, fy - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawOrchardPlayer(ctx, px, py, facing, step, t, character) {
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

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = legCol;
  const legSw = (step === 1 || step === 3) ? 3 : 0;
  ctx.fillRect(px - 6, py + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, py + 2, 5, 9 - legSw);

  ctx.fillStyle = bodyCol; ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);
  const armSw = (step === 1 || step === 3) ? 2 : 0;
  ctx.fillRect(px - 10, py - 9 + bobY + armSw, 3, 8);
  ctx.fillRect(px + 7,  py - 9 + bobY - armSw, 3, 8);

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

  // Basket hint
  ctx.fillStyle = "#c8a050";
  ctx.fillRect(px + 7, py - 6 + bobY, 12, 10);
  ctx.strokeStyle = "#8a6020"; ctx.lineWidth = 1;
  ctx.strokeRect(px + 7, py - 6 + bobY, 12, 10);
}

function drawOrchardHUD(ctx, W, H, state, inventory, t) {
  ctx.fillStyle = "rgba(12,8,4,0.88)"; ctx.fillRect(0, 0, W, 32);

  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#a0e870";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);

  ctx.textAlign = "right"; ctx.font = "11px monospace"; ctx.fillStyle = "#d8f0a0";
  ctx.fillText(`🍎${inventory.apples??0}  🫐${inventory.berries??0}  🍄${inventory.mushrooms??0}  🌿${inventory.herbs??0}`, W - 14, 16);

  ctx.textAlign = "left"; ctx.fillStyle = "rgba(160,230,80,0.7)"; ctx.font = "11px monospace";
  const harvested = Object.values(state.harvested || {}).reduce((a,b) => a+b, 0);
  ctx.fillText(`${harvested} harvested`, 16, 16);

  ctx.fillStyle = "rgba(12,8,4,0.72)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(200,240,160,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD to move  ·  walk near plants to harvest  ·  [Esc] return home", W / 2, H - 13);
}

export default function FruitRun({ room, seed, coOp = false, onRunComplete, character }) {
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
    const { trees, bushes, flowers } = generateFruitRun(seed ?? Date.now());
    return {
      px: 80, py: ORCHARD_H / 2, facing: "right",
      step: 0, stepTimer: 0,
      camX: 0, elapsed: 0, over: false,
      trees, bushes, flowers,
      inventory: { ...fullEmptyInventory() },
      harvested: {},
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
    };
    const onKeyUp = (e) => { delete keysRef.current[e.key]; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

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

      let dx = 0, dy = 0;
      if (keysRef.current["ArrowLeft"]  || keysRef.current["a"] || keysRef.current["A"]) { dx -= 1; state.facing = "left"; }
      if (keysRef.current["ArrowRight"] || keysRef.current["d"] || keysRef.current["D"]) { dx += 1; state.facing = "right"; }
      if (keysRef.current["ArrowUp"]    || keysRef.current["w"] || keysRef.current["W"]) { dy -= 1; state.facing = "up"; }
      if (keysRef.current["ArrowDown"]  || keysRef.current["s"] || keysRef.current["S"]) { dy += 1; state.facing = "down"; }
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      state.px = Math.max(20, Math.min(ORCHARD_W - 20, state.px + dx * PLAYER_SPEED * dt));
      state.py = Math.max(30, Math.min(ORCHARD_H - 30, state.py + dy * PLAYER_SPEED * dt));

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
          tree.alive = false;
          tree.shakeTime = 0.6;
          soundRef.current?.pluck();
          const drops = rollLoot(FRUIT_LOOT_TABLE.apple_tree, randRef.current);
          drops.forEach((d, i) => {
            addToInventory(state.inventory, d.item, d.qty);
            state.harvested[d.item] = (state.harvested[d.item] ?? 0) + d.qty;
            lootFloatsRef.current.push({
              text: `+${d.qty} ${d.item}`, worldX: tree.x + (i%2===0?-14:14),
              worldY: tree.y - i * 16, born: performance.now(),
            });
          });
        }
      }

      for (const bush of state.bushes) {
        if (!bush.alive) continue;
        if (Math.hypot(state.px - bush.x, state.py - bush.y) < PICKUP_R - 4) {
          bush.alive = false;
          bush.shakeTime = 0.5;
          soundRef.current?.collect();
          const drops = rollLoot(FRUIT_LOOT_TABLE[bush.type], randRef.current);
          drops.forEach((d, i) => {
            addToInventory(state.inventory, d.item, d.qty);
            state.harvested[d.item] = (state.harvested[d.item] ?? 0) + d.qty;
            lootFloatsRef.current.push({
              text: `+${d.qty} ${d.item}`, worldX: bush.x + (i%2===0?-14:14),
              worldY: bush.y - i * 14, born: performance.now(),
            });
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
            addToInventory(state.inventory, d.item, d.qty);
            state.harvested[d.item] = (state.harvested[d.item] ?? 0) + d.qty;
            lootFloatsRef.current.push({
              text: `+${d.qty} ${d.item}`, worldX: fl.x, worldY: fl.y - i * 14, born: performance.now(),
            });
          });
        }
      }

      // Camera
      const targetCamX = Math.max(0, Math.min(ORCHARD_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      if (ts - lastMoveRef.current > 50) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // DRAW
      const camX = state.camX;
      drawOrchardBackground(ctx, camX, W, H, t);

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
        drawOrchardPlayer(ctx, state.px - camX, state.py, state.facing, state.step, t, character)
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      const now = performance.now();
      lootFloatsRef.current = lootFloatsRef.current.filter(lf => now - lf.born < 1400);
      for (const lf of lootFloatsRef.current) {
        const age = (now - lf.born) / 1400;
        ctx.save(); ctx.globalAlpha = 1 - age;
        ctx.fillStyle = "#a0f060"; ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, lf.worldX - camX, lf.worldY - age * 38);
        ctx.restore();
      }

      drawOrchardHUD(ctx, W, H, state, state.inventory, t);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, [seed]);

  return (
    <div style={{ width:"100%", height:"100svh", background:"#5a9632", position:"relative", userSelect:"none" }}>
      <canvas ref={canvasRef} style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }} />
    </div>
  );
}