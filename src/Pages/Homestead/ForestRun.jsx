// src/Pages/Homestead/ForestRun.jsx
import React, { useEffect, useRef } from "react";
import { useHearthroom } from "./useHearthroom";
import {
  FOREST_W, FOREST_H,
  WOLF_R, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_CD, ENEMY_DAMAGE,
  generateForestRun, updateForestEnemies,
  playerAttack, rollLoot, LOOT_TABLE,
  seededRand, addToInventory, emptyInventory,
} from "./gameEngine";

const PLAYER_SPEED   = 130;
const PLAYER_HP      = 5;
const INVINCIBLE_S   = 1.2;
const RUN_DURATION   = 180; // 3 minutes max
const MOVE_THROTTLE  = 50;  // ms between position broadcasts
const PICKUP_R       = 18;
const LOOT_FLOAT_DUR = 1.4; // seconds loot numbers float

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
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawForestBackground(ctx, camX, W, H, t) {
  // Sky gradient (hardcoded — doesn't invert)
  ctx.fillStyle = "#1a2a14"; ctx.fillRect(0, 0, W, H);

  // Ground
  ctx.fillStyle = "#2d4a1e"; ctx.fillRect(0, 0, W, H);

  // Grass texture rows
  for (let row = 0; row < Math.ceil(H / 32) + 1; row++) {
    for (let col = 0; col < Math.ceil(W / 32) + 1; col++) {
      const wx = col * 32 + (Math.floor(camX / 32) * 32) - camX;
      const wy = row * 32;
      const wc = Math.floor((col * 32 + Math.floor(camX / 32) * 32) / 32);
      const wr = row;
      // Deterministic grass shade
      const n = ((wc * 997 + wr * 31 + 42) & 0x7fffffff) / 0x7fffffff;
      if (n > 0.6) {
        ctx.fillStyle = n > 0.8 ? "#3a5c28" : "#284018";
        ctx.fillRect(wx, wy, 32, 32);
      }
    }
  }

  // Distant treeline (parallax)
  ctx.fillStyle = "#1a3010";
  const treeParallax = camX * 0.3;
  for (let i = 0; i < 40; i++) {
    const tx = ((i * 180 - treeParallax) % (W + 200)) - 60;
    const th = 60 + ((i * 37) % 50);
    ctx.beginPath(); ctx.arc(tx, -10, 38, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 30, -6, 28, 0, Math.PI); ctx.fill();
  }

  // Fog of war vignette at edges
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,10,0,0.55)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawForestTree(ctx, tree, camX, t) {
  const sx = tree.x - camX;
  const sy = tree.y;
  if (sx < -60 || sx > 9999) return; // viewport cull handled by caller

  const shake = tree.hitFlash > 0 ? Math.sin(t * 40) * 3 * tree.hitFlash : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(sx + shake + 4, sy + 22, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

  // Trunk
  ctx.fillStyle = tree.alive ? "#5a3a18" : "#3a2a0a";
  ctx.fillRect(sx + shake - 7, sy - 10, 14, 32);

  if (!tree.alive) {
    // Stump
    ctx.fillStyle = "#4a2e14";
    ctx.fillRect(sx - 10, sy - 10, 20, 12);
    return;
  }

  // Canopy
  const col = tree.hitFlash > 0 ? "#ffffff" : "#2d7a2d";
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(sx + shake, sy - 24, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = tree.hitFlash > 0 ? "#ddffdd" : "#338a33";
  ctx.beginPath(); ctx.arc(sx + shake - 8, sy - 36, 18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + shake + 10, sy - 30, 16, 0, Math.PI * 2); ctx.fill();

  // HP bar for damaged trees
  if (tree.hp < tree.maxHp) {
    const bw = 40, bh = 5;
    const bx = sx - bw / 2, by = sy - 56;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#5cb85c"; ctx.fillRect(bx, by, bw * (tree.hp / tree.maxHp), bh);
  }
}

function drawPickup(ctx, pickup, camX, t) {
  const sx = pickup.x - camX, sy = pickup.y;
  const pulse = 0.7 + 0.3 * Math.sin(t * 3 + pickup.x);
  ctx.save(); ctx.globalAlpha = pulse;
  ctx.fillStyle = "#f5e6a0";
  ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c4a240"; ctx.lineWidth = 1.5; ctx.stroke();
  // dot
  ctx.fillStyle = "#8b6020";
  ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e, camX, t) {
  const sx = e.x - camX, sy = e.y;
  const pulse = 0.75 + 0.25 * Math.sin(t * 3 + e.x * 0.05);
  ctx.save(); ctx.globalAlpha = e.hitFlash > 0 ? 1 : pulse;

  if (e.type === "wolf") {
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(sx, sy + WOLF_R - 2, WOLF_R * 0.7, WOLF_R * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#9a8060";
    ctx.beginPath(); ctx.ellipse(sx, sy, WOLF_R, WOLF_R * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#8a7050";
    ctx.beginPath(); ctx.arc(sx + e.dir * WOLF_R * 0.7, sy - WOLF_R * 0.2, WOLF_R * 0.55, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = e.hitFlash > 0 ? "#ffdddd" : "#c0906a";
    const ex = sx + e.dir * WOLF_R * 0.7;
    ctx.beginPath(); ctx.moveTo(ex + e.dir * 4, sy - WOLF_R * 0.7); ctx.lineTo(ex + e.dir * 9, sy - WOLF_R * 1.2); ctx.lineTo(ex - e.dir * 1, sy - WOLF_R * 0.9); ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = "#cc4400";
    ctx.beginPath(); ctx.arc(ex + e.dir * 4, sy - WOLF_R * 0.3, 3, 0, Math.PI * 2); ctx.fill();
    // HP bar
    const bw = WOLF_R * 2.4, bh = 4, bx = sx - bw / 2, by = sy - WOLF_R - 12;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.hp <= 1 ? "#e24b4a" : "#5cb85c";
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
  }

  if (e.type === "spider") {
    const r = WOLF_R + 2;
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(sx, sy + r - 2, r * 0.7, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Legs (4 each side)
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
    // Body
    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#6a3890";
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? "#ffddff" : "#4a1860";
    ctx.beginPath(); ctx.arc(sx, sy - 4, r * 0.6, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = "#ff4040";
    for (let ei = 0; ei < 4; ei++) {
      ctx.beginPath(); ctx.arc(sx - 6 + ei * 4, sy - 6, 2, 0, Math.PI * 2); ctx.fill();
    }
    // HP bar
    const bw = r * 2.4, bh = 4, bx = sx - bw / 2, by = sy - r - 14;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.hp <= 2 ? "#e24b4a" : "#9b59b6";
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
  }

  ctx.restore();
}

function drawPlayer(ctx, px, py, facing, step, invincible, attackFlash, t) {
  const blink = invincible > 0 && Math.floor(t * 8) % 2 === 0;
  if (blink) return;

  const bobY  = (step === 1 || step === 3) ? -1 : 0;
  const legSw = (step === 1 || step === 3) ?  3 : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(px, py + 12, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.fillStyle = "#3a6abf";
  ctx.fillRect(px - 6, py + 2, 5, 9 + legSw);
  ctx.fillRect(px + 1, py + 2, 5, 9 - legSw);

  // Body
  ctx.fillStyle = attackFlash > 0 ? "#88ccff" : "#5b8dd9";
  ctx.fillRect(px - 7, py - 10 + bobY, 14, 13);

  // Arms (swing on attack)
  const armSw = attackFlash > 0 ? 6 : (step === 1 || step === 3) ? 2 : 0;
  ctx.fillStyle = "#5b8dd9";
  if (facing === "right") {
    ctx.fillRect(px + 7,  py - 14 + bobY + armSw, 10, 4); // extended right
    ctx.fillRect(px - 10, py - 9  + bobY - armSw, 3, 8);
  } else if (facing === "left") {
    ctx.fillRect(px - 17, py - 14 + bobY + armSw, 10, 4); // extended left
    ctx.fillRect(px + 7,  py - 9  + bobY - armSw, 3, 8);
  } else {
    ctx.fillRect(px - 10, py - 9  + bobY + armSw, 3, 8);
    ctx.fillRect(px + 7,  py - 9  + bobY - armSw, 3, 8);
  }

  // Head
  ctx.fillStyle = "#f5c5a3"; ctx.fillRect(px - 7, py - 22 + bobY, 14, 12);
  ctx.fillStyle = "#7a4f2a"; ctx.fillRect(px - 7, py - 22 + bobY, 14, 5);
  if (facing === "down") {
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(px - 4, py - 16 + bobY, 3, 3);
    ctx.fillRect(px + 1,  py - 16 + bobY, 3, 3);
  } else if (facing === "left") {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px - 5, py - 16 + bobY, 3, 3);
  } else if (facing === "right") {
    ctx.fillStyle = "#2a1a0a"; ctx.fillRect(px + 2, py - 16 + bobY, 3, 3);
  }

  // Fist weapon hint
  if (attackFlash > 0) {
    const fx = facing === "right" ? px + 18 : facing === "left" ? px - 18 : px;
    const fy = py - 12 + bobY;
    ctx.fillStyle = "#f5c5a3";
    ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHUD(ctx, W, H, state, inventory, t) {
  // Top bar
  ctx.fillStyle = "rgba(10,18,6,0.92)"; ctx.fillRect(0, 0, W, 32);

  // HP pips
  for (let i = 0; i < PLAYER_HP; i++) {
    ctx.beginPath(); ctx.arc(16 + i * 22, 16, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < state.hp ? "rgba(220,80,80,0.9)" : "rgba(255,255,255,0.12)";
    ctx.fill();
  }

  // Run timer
  const timeLeft = Math.max(0, Math.ceil(RUN_DURATION - state.elapsed));
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  ctx.fillStyle = timeLeft < 30 ? "#ff8080" : "#c8e890";
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${mins}:${String(secs).padStart(2,"0")}`, W / 2, 16);

  // Loot preview (top right)
  ctx.textAlign = "right"; ctx.font = "11px monospace"; ctx.fillStyle = "#d8eaa0";
  const inv = inventory;
  ctx.fillText(`🪵${inv.wood ?? 0}  🪨${inv.stone ?? 0}  🌿${inv.herbs ?? 0}  🦴${inv.leather ?? 0}`, W - 14, 16);

  // Kill counter
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,180,80,0.8)"; ctx.font = "11px monospace";
  ctx.fillText(`${state.kills} kills`, 16, H - 14);

  // Sticks/silk (smaller items this run)
  ctx.textAlign = "right"; ctx.fillStyle = "rgba(200,230,160,0.6)"; ctx.font = "10px monospace";
  ctx.fillText(`🪹${inv.sticks ?? 0}  🕸${inv.silk ?? 0}`, W - 14, H - 14);

  // Leave hint
  ctx.fillStyle = "rgba(18,10,4,0.7)"; ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "rgba(245,230,200,0.4)"; ctx.font = "9px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("WASD to move  ·  click / space to attack  ·  [Esc] return home", W / 2, H - 13);

  // Attack arc indicator
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForestRun({ room, seed, onRunComplete }) {
  const canvasRef      = useRef(null);
  const rafRef         = useRef(null);
  const keysRef        = useRef({});
  const stateRef       = useRef(null);
  const soundRef       = useRef(null);
  const lastMoveRef    = useRef(0);
  const randRef        = useRef(seededRand(seed ?? Date.now()));
  const lootFloatsRef  = useRef([]); // { text, x, y, born }

  // ── Supabase: sync co-op partner if present ───────────────────────────────
  const handlers = useRef({
    onRunMove:      ({ x, y, facing }) => {
      if (stateRef.current) {
        stateRef.current.partnerX      = x;
        stateRef.current.partnerY      = y;
        stateRef.current.partnerFacing = facing;
        stateRef.current.partnerVisible = true;
      }
    },
    onEnemyKilled: ({ id }) => {
      if (!stateRef.current) return;
      const e = stateRef.current.enemies.find(en => en.id === id);
      if (e) e.alive = false;
    },
    onPickupCollected: ({ id }) => {
      if (!stateRef.current) return;
      const p = stateRef.current.pickups.find(pk => pk.id === id);
      if (p) p.collected = true;
    },
  }).current;

  const { sendRunMove, sendEnemyKilled, sendPickupCollected, sendRunComplete } =
    useHearthroom(room?.id ?? null, handlers, ":run");

  // ── Init ───────────────────────────────────────────────────────────────────
  function initState() {
    const { enemies, pickups, trees } = generateForestRun(seed ?? Date.now());
    return {
      px: 80, py: FOREST_H / 2,
      facing: "right",
      step: 0, stepTimer: 0,
      hp: PLAYER_HP, invincible: 0, hitFlash: 0,
      attackFlash: 0, attackCooldown: 0,
      camX: 0,
      elapsed: 0,
      kills: 0,
      over: false,
      enemies, pickups, trees,
      inventory: emptyInventory(),
      partnerX: 0, partnerY: 0, partnerFacing: "right", partnerVisible: false,
      lastTime: performance.now(),
    };
  }

  function finishRun(state) {
    if (state.over) return;
    state.over = true;
    sendRunComplete({ ...state.inventory, kills: state.kills });
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

    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      soundRef.current?.unlock();
      if (e.key === "Escape") finishRun(stateRef.current);
      if (e.key === " ") doAttack();
    };
    const onKeyUp   = (e) => { delete keysRef.current[e.key]; };
    const onClick   = (e) => { soundRef.current?.unlock(); doAttack(); };

    function doAttack() {
      const state = stateRef.current;
      if (!state || state.over || state.attackCooldown > 0) return;
      state.attackFlash    = 0.35;
      state.attackCooldown = 0.5;
      soundRef.current?.swing();
      const { hitEnemies, hitTrees, lootDrops } = playerAttack(
        state.px, state.py, state.facing,
        state.enemies, state.trees,
        randRef.current
      );
      hitEnemies.forEach(id => {
        const e = state.enemies.find(en => en.id === id);
        if (e && !e.alive) {
          state.kills++;
          sendEnemyKilled(id, []);
          soundRef.current?.hit();
        }
      });
      lootDrops.forEach((drop, i) => {
        addToInventory(state.inventory, drop.item, drop.qty);
        lootFloatsRef.current.push({
          text: `+${drop.qty} ${drop.item}`,
          worldX: drop.x + (i % 2 === 0 ? -12 : 12),
          worldY: drop.y - i * 16,
          born: performance.now(),
        });
      });
    }

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
      if (state.hp <= 0)                 { finishRun(state); return; }

      // ── Movement ───────────────────────────────────────────────────────
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

      // ── Timers ─────────────────────────────────────────────────────────
      if (state.invincible  > 0) state.invincible  = Math.max(0, state.invincible  - dt);
      if (state.hitFlash    > 0) state.hitFlash    = Math.max(0, state.hitFlash    - dt * 3);
      if (state.attackFlash > 0) state.attackFlash = Math.max(0, state.attackFlash - dt * 4);
      if (state.attackCooldown > 0) state.attackCooldown = Math.max(0, state.attackCooldown - dt);

      // ── Enemy update ───────────────────────────────────────────────────
      updateForestEnemies(state.enemies, state.px, state.py, dt, t);

      // Enemy attack player
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

      // Pickup collection
      for (const p of state.pickups) {
        if (p.collected) continue;
        if (Math.hypot(state.px - p.x, state.py - p.y) < PICKUP_R) {
          p.collected = true;
          sendPickupCollected(p.id);
          soundRef.current?.pickup();
          // Roll ground loot
          const drops = rollLoot(
            [{ item:"sticks",min:1,max:3 },{ item:"stone",min:0,max:1 },{ item:"herbs",min:0,max:2 }],
            randRef.current
          );
          drops.forEach((d, i) => {
            addToInventory(state.inventory, d.item, d.qty);
            lootFloatsRef.current.push({
              text: `+${d.qty} ${d.item}`,
              worldX: p.x + (i % 2 === 0 ? -12 : 12),
              worldY: p.y - i * 16,
              born: performance.now(),
            });
          });
        }
      }

      // Camera — follow player, clamp to world
      const targetCamX = Math.max(0, Math.min(FOREST_W - W, state.px - W / 2));
      state.camX += (targetCamX - state.camX) * Math.min(1, 8 * dt);

      // Broadcast position
      if (ts - lastMoveRef.current > MOVE_THROTTLE) {
        sendRunMove(Math.round(state.px), Math.round(state.py), state.facing);
        lastMoveRef.current = ts;
      }

      // ── DRAW ───────────────────────────────────────────────────────────
      const camX = state.camX;

      drawForestBackground(ctx, camX, W, H, t);

      // Forest floor items (pickups)
      for (const p of state.pickups) {
        if (p.collected) continue;
        const sx = p.x - camX;
        if (sx < -20 || sx > W + 20) continue;
        drawPickup(ctx, p, camX, t);
      }

      // Painter's algo: trees + enemies + player sorted by y
      const drawables = [];

      state.trees.forEach(tree => {
        if (!tree.alive && tree.hp <= 0) return; // skip dead stumps in list (drawn separately)
        const sx = tree.x - camX;
        if (sx < -80 || sx > W + 80) return;
        drawables.push({ sortY: tree.y + 20, draw: () => drawForestTree(ctx, tree, camX, t) });
      });

      state.enemies.forEach(e => {
        if (!e.alive) return;
        const sx = e.x - camX;
        if (sx < -60 || sx > W + 60) return;
        drawables.push({ sortY: e.y + WOLF_R, draw: () => drawEnemy(ctx, e, camX, t) });
      });

      // Player
      drawables.push({ sortY: state.py, draw: () =>
        drawPlayer(ctx, state.px - camX, state.py, state.facing, state.step, state.invincible, state.attackFlash, t)
      });

      // Partner ghost
      if (state.partnerVisible) {
        const gpx = state.partnerX - camX, gpy = state.partnerY;
        drawables.push({ sortY: gpy, draw: () => {
          ctx.save(); ctx.globalAlpha = 0.5;
          drawPlayer(ctx, gpx, gpy, state.partnerFacing, 0, 0, 0, t);
          ctx.restore();
          ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.font = "9px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText("P2", gpx, gpy - 26);
        }});
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      drawables.forEach(d => d.draw());

      // Hit flash overlay
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
        ctx.fillStyle = "#f5e6a0"; ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lf.text, fx, fy);
        ctx.restore();
      }

      drawHUD(ctx, W, H, state, state.inventory, t);
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
    <div style={{ width:"100%", height:"100svh", background:"#0a120a", position:"relative", userSelect:"none" }}>
      <canvas
        ref={canvasRef}
        style={{ width:"100%", height:"100%", display:"block", imageRendering:"pixelated" }}
      />
    </div>
  );
}