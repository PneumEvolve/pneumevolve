// src/Pages/Stronghold/ProtectorView.jsx
import { drawBuilding as drawBuildingIllustrated } from "./drawBuildings";
import { initAudio, setMood, sfxKill, sfxBuildingHit, sfxBuildingFall, sfxWaveStart, sfxWaveClear, sfxPurchaseUpgrade, sfxPlaceBuilding } from "./audio";
import React, { useEffect, useRef, useCallback, useState } from "react";
import { useStrongholdRoom } from "./useStrongholdRoom";
import {
  WORLD, BUILDING_TYPES, UPGRADES,
  PROTECTOR_MAX_HP, PROTECTOR_HEAL_RATE,
  STARTING_GOLD, BREATHER_DURATION,
  TOWNSPEOPLE_START,
  createInitialMap, spawnWave, movePlayer,
  updateEnemies, updateEnemyAttacks, updateUnitCombat,
  updateUnitMovement, updateBuilderRepair,
  updateProtectorAttack, updateProtectorHeal,
  updateProjectiles, updateBuilderDanger,
  getSlowZones, calculateScore, calcWaveEndGold,
  calcTownspeople, clampWorkers,
  lerp, dist,
} from "./strongholdEngine";

const PLAYER_SPEED   = 160;
const MOVE_THROTTLE  = 50;
const SYNC_THROTTLE  = 80;
const TOTAL_WAVES    = 3;
const COUNTDOWN_SECS = 5;

export default function ProtectorView({ room, onGameOver }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef = useRef({ active: false, vec: { x: 0, y: 0 }, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } });
  const rafRef      = useRef(null);
  const lastMoveRef = useRef(0);
  const lastSyncRef = useRef(0);

  const [showShop,   setShowShop]   = useState(false);
  const [shopTick,   setShopTick]   = useState(0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlers = useRef({
    onP2Move: ({ x, y }) => {
      if (!stateRef.current) return;
      stateRef.current.builderTarget = { x, y };
    },
    onBuildingPlace: ({ building }) => {
      const s = stateRef.current;
      if (!s) return;
      s.buildings.push({ ...building, workers: 0 });
      if (building.type === "barracks") spawnSoldiers(s, building);
    },
    onWorkerAssign: ({ buildingId, workers }) => {
      const s = stateRef.current;
      if (!s) return;
      const b = s.buildings.find(b => b.id === buildingId);
      if (b) b.workers = workers;
    },
    onChat: ({ text, from }) => {
      if (!stateRef.current) return;
      stateRef.current.chatMessages.unshift({ text, from, ts: Date.now() });
      if (stateRef.current.chatMessages.length > 20) stateRef.current.chatMessages.pop();
    },
  }).current;

  const {
    sendP1Move, sendEnemyUpdate, sendBuildingHealth,
    sendUnitUpdate, sendPhaseChange,
    sendCountdown, sendGameOver, sendChat, sendGoldUpdate,
  } = useStrongholdRoom(room?.id ?? null, handlers);

  // ── Spawn soldiers from a barracks ───────────────────────────────────────
  function spawnSoldiers(s, building) {
    const extra = (s.upgrades ?? []).includes("soldier_cnt") ? 1 : 0;
    const count = 1 + extra;
    const hp    = 40 + ((s.upgrades ?? []).includes("soldier_hp") ? 20 : 0);
    for (let i = 0; i < count; i++) {
      s.units.push({
        id:    s.units.length,
        x:     building.x + 30 + i * 14,
        y:     building.y,
        hp, maxHp: hp, radius: 6,
        attackCooldown: 0,
        projectiles: [],
      });
    }
  }

  // ── State init ────────────────────────────────────────────────────────────
  function initState() {
    const map = createInitialMap();
    return {
      player:          { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
      builderPos:      { x: WORLD / 2 - 200, y: WORLD / 2 - 200 },
      builderTarget:   { x: WORLD / 2 - 200, y: WORLD / 2 - 200 },
      playerHp:        PROTECTOR_MAX_HP,
      builderHp:       PROTECTOR_MAX_HP,
      buildings:       map.buildings,
      units:           [],
      enemies:         [],
      projectiles:     [],
      phase:           "build",
      waveNumber:      0,
      countdownLeft:   0,
      breatherLeft:    0,
      enemiesKilled:   0,
      gold:            STARTING_GOLD,
      upgrades:        [],
      townspeople:     TOWNSPEOPLE_START,
      attackCooldown:  0,
      lastTime:        performance.now(),
      chatMessages:    [],
      cam:             { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },
    };
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function worldToCanvas(wx, wy, cam) { return { cx: wx - cam.x, cy: wy - cam.y }; }

  function draw(ctx, state, t, W, H) {
    const { cam, player, builderPos, buildings, units, enemies, phase,
            countdownLeft, breatherLeft, waveNumber, chatMessages,
            playerHp, gold, projectiles } = state;

    ctx.fillStyle = "#0a0d0f";
    ctx.fillRect(0, 0, W, H);

    // World border — red pulse during wave
    const { cx: bx, cy: by } = worldToCanvas(0, 0, cam);
    if (phase === "wave") {
      const pulse = 0.04 + 0.04 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(200,40,40,${pulse})`;
      ctx.lineWidth = 8;
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(bx, by, WORLD, WORLD);

    // Garden slow zones
    buildings.forEach(b => {
      if (b.type !== "garden" || b.hp <= 0) return;
      const { cx, cy } = worldToCanvas(b.x, b.y, cam);
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, BUILDING_TYPES.garden.slowRadius + (b.workers ?? 0) * 10, 0, Math.PI * 2);
      ctx.fillStyle = "#66dd88"; ctx.fill();
      ctx.restore();
    });

    // Buildings
    buildings.forEach(b => {
      drawBuilding(ctx, b, cam, t, W, H);
    });

    // Projectiles — protector
    if (projectiles) projectiles.forEach(p => {
      const progress = p.age / p.ttl;
      const { cx: sx, cy: sy } = worldToCanvas(p.x, p.y, cam);
      const { cx: ex, cy: ey } = worldToCanvas(p.tx, p.ty, cam);
      const px = sx + (ex - sx) * progress;
      const py = sy + (ey - sy) * progress;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.restore();
    });

    // Units + their projectiles
    units.forEach(u => {
      const { cx, cy } = worldToCanvas(u.x, u.y, cam);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9966"; ctx.fill();
      ctx.restore();
      // unit projectiles
      (u.projectiles ?? []).forEach(p => {
        const progress = p.age / p.ttl;
        const { cx: sx, cy: sy } = worldToCanvas(p.x, p.y, cam);
        const { cx: ex, cy: ey } = worldToCanvas(p.tx, p.ty, cam);
        const ppx = sx + (ex - sx) * progress;
        const ppy = sy + (ey - sy) * progress;
        ctx.save();
        ctx.globalAlpha = 0.7 * (1 - progress);
        ctx.beginPath(); ctx.arc(ppx, ppy, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.restore();
      });
    });

    // Enemies
    enemies.forEach(e => {
      if (e.dead) return;
      const { cx, cy } = worldToCanvas(e.x, e.y, cam);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      const hpPct = e.hp / e.maxHp;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(cx, cy, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.chasingBuilder ? "#ff44aa" : "#cc2222"; ctx.fill();
      // hp bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(cx - 8, cy - e.radius - 6, 16, 3);
      ctx.fillStyle = e.chasingBuilder ? "#ff88cc" : "#ff4444";
      ctx.fillRect(cx - 8, cy - e.radius - 6, 16 * hpPct, 3);
      ctx.restore();
    });

    // Builder
    const { cx: bpx, cy: bpy } = worldToCanvas(builderPos.x, builderPos.y, cam);
    ctx.save();
    ctx.beginPath(); ctx.arc(bpx, bpy, 10 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(bpx, bpy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.9)"; ctx.fill();
    ctx.restore();

    // Protector
    const { cx: ppx, cy: ppy } = worldToCanvas(player.x, player.y, cam);
    ctx.save();
    ctx.beginPath(); ctx.arc(ppx, ppy, 13 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(ppx, ppy, 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.95)"; ctx.fill();
    // Attack range ring (faint, build phase only)
    if (phase === "build") {
      ctx.globalAlpha = 0.06;
      ctx.beginPath(); ctx.arc(ppx, ppy, 80, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,160,60,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();

    // ── HUD ──────────────────────────────────────────────────────────────
    drawHUD(ctx, state, t, W, H);
    drawJoystick(ctx);
  }

  function drawBuilding(ctx, b, cam, t, W, H) {
    const def = BUILDING_TYPES[b.type];
    const { cx, cy } = worldToCanvas(b.x, b.y, cam);
    if (cx < -60 || cx > W + 60 || cy < -60 || cy > H + 60) return;
    const hpPct = b.hp / b.maxHp;
    const wasAlive = (b._prevHp ?? b.maxHp) > 0;
    // Detect building just fell — fire sfx once
    if (wasAlive && b.hp <= 0) { sfxBuildingFall(); b._prevHp = 0; }
    else if (b.hp > 0 && b._prevHp !== undefined && b.hp < b._prevHp - 8) sfxBuildingHit();
    b._prevHp = b.hp;

    // Illustrated building art
    drawBuildingIllustrated(ctx, b, cx, cy, t);

    // HP ring overlay (outside the illustration)
    if (b.hp > 0 && hpPct < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
      ctx.strokeStyle = hpPct > 0.5 ? "rgba(100,255,100,0.7)" : hpPct > 0.25 ? "rgba(255,200,60,0.8)" : "rgba(255,60,60,0.9)";
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }

    // Worker dots orbiting building
    if (b.hp > 0) {
      const workers = b.workers ?? 0;
      for (let i = 0; i < workers; i++) {
        const angle = (i / Math.max(workers, 1)) * Math.PI * 2 - Math.PI / 2 + t * 0.4;
        const wx = cx + Math.cos(angle) * (def.radius + 11);
        const wy = cy + Math.sin(angle) * (def.radius + 11);
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,220,255,0.8)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(120,180,255,0.4)"; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();
      }
      // Label
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.font = "10px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(def.label, cx, cy + def.radius + 16);
      ctx.restore();
    }
  }

  function drawHUD(ctx, state, t, W, H) {
    const { phase, waveNumber, countdownLeft, breatherLeft, playerHp, gold, upgrades, townspeople } = state;

    // Phase label
    ctx.save();
    ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
    let phaseLabel = "";
    if (phase === "build")     phaseLabel = waveNumber === 0 ? "plan your stronghold" : "build phase";
    else if (phase === "wave") phaseLabel = `wave ${waveNumber} / ${TOTAL_WAVES}`;
    else if (phase === "breather") phaseLabel = `next wave in ${Math.ceil(breatherLeft)}s`;
    ctx.fillText(phaseLabel, W / 2, 28);

    // Breather countdown — big and prominent
    if (phase === "breather") {
      const frac = breatherLeft / (BREATHER_DURATION[waveNumber] ?? 45);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(0, 0, W * (1 - frac), 3);
      ctx.globalAlpha = 1;
    }

    // Wave dots
    for (let i = 0; i < TOTAL_WAVES; i++) {
      ctx.beginPath(); ctx.arc(W / 2 - (TOTAL_WAVES - 1) * 10 + i * 20, 44, 4, 0, Math.PI * 2);
      const done = i < waveNumber;
      const active = i === waveNumber - 1 && phase === "wave";
      ctx.fillStyle = done ? "rgba(255,210,80,0.9)" : active ? "rgba(255,100,60,0.9)" : "rgba(255,255,255,0.12)";
      ctx.fill();
    }

    // Protector HP bar
    const hpBarW = 90, hpBarH = 5;
    const hpBarX = 14, hpBarY = H - 28;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 3);
    ctx.fill();
    const hpFrac = Math.max(0, playerHp) / PROTECTOR_MAX_HP;
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(255,100,60,0.8)" : hpFrac > 0.25 ? "rgba(255,200,60,0.8)" : "rgba(255,60,60,0.9)";
    ctx.roundRect(hpBarX, hpBarY, hpBarW * hpFrac, hpBarH, 3);
    ctx.fill();
    ctx.font = "10px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.textAlign = "left";
    ctx.fillText(`${Math.ceil(playerHp)} hp`, hpBarX, hpBarY - 4);

    // Gold
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,215,0,0.7)";
    ctx.font = "13px sans-serif";
    ctx.fillText(`${Math.floor(gold)} g`, W - 14, H - 18);

    // Townspeople count
    ctx.fillStyle = "rgba(180,220,255,0.5)";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${townspeople} people`, W - 14, H - 36);

    // Upgrade shop hint (build phase, shop exists, no modal open)
    if (phase === "build" || phase === "breather") {
      const hasShop = state.buildings.some(b => b.type === "upgrade_shop" && b.hp > 0);
      if (hasShop) {
        const inRange = dist(state.player.x, state.player.y,
          state.buildings.find(b => b.type === "upgrade_shop").x,
          state.buildings.find(b => b.type === "upgrade_shop").y) < 80;
        if (inRange) {
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(200,140,255,0.6)";
          ctx.font = "12px sans-serif";
          ctx.fillText("tap to open upgrade shop", W / 2, H - 80);
        }
      }
    }

    // Protector label
    ctx.save();
    ctx.font = "11px sans-serif"; ctx.fillStyle = "rgba(255,100,60,0.25)";
    ctx.textAlign = "right"; ctx.letterSpacing = "0.1em";
    ctx.fillText("PROTECTOR", W - 14, 20);
    ctx.restore();

    // Chat
    if (state.chatMessages.length > 0) {
      const msg = state.chatMessages[0];
      const age = (Date.now() - msg.ts) / 1000;
      if (age < 5) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age / 5);
        ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(120,200,255,0.8)"; ctx.textAlign = "center";
        ctx.fillText(`${msg.from}: ${msg.text}`, W / 2, H - 50);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!stateRef.current || !canvasRef.current) return;
    const state = stateRef.current;
    if (state.phase === "gameover") return;

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
    state.lastTime = ts;
    const t = ts / 1000;

    // Movement
    const keys = keysRef.current;
    const joy  = joystickRef.current;
    let vx = 0, vy = 0;
    if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) vx -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) vx += 1;
    if (keys["ArrowUp"]    || keys["w"] || keys["W"]) vy -= 1;
    if (keys["ArrowDown"]  || keys["s"] || keys["S"]) vy += 1;
    if (joy.active) { vx += joy.vec.x; vy += joy.vec.y; }
    state.player = movePlayer(state.player.x, state.player.y, vx, vy, dt, PLAYER_SPEED);

    if (ts - lastMoveRef.current > MOVE_THROTTLE) {
      sendP1Move(state.player.x, state.player.y);
      lastMoveRef.current = ts;
    }

    state.builderPos.x = lerp(state.builderPos.x, state.builderTarget.x, 0.18);
    state.builderPos.y = lerp(state.builderPos.y, state.builderTarget.y, 0.18);

    // Heal at town center (build + breather phases too)
    updateProtectorHeal(state, dt);

    // Breather timer — auto-starts next wave when it runs out
    if (state.phase === "breather") {
      state.breatherLeft -= dt;
      sendCountdown(state.breatherLeft);
      if (state.breatherLeft <= 0) {
        if (state.waveNumber >= TOTAL_WAVES) endGame(state, true);
        else startWave(state);
      }
    }

    // Wave logic
    if (state.phase === "wave") {
      const slowZones = getSlowZones(state.buildings, state.upgrades);
      updateEnemies(state.enemies, state.buildings, state.builderPos.x, state.builderPos.y, dt, slowZones);
      updateEnemyAttacks(state.enemies, state.buildings, dt);
      updateUnitCombat(state.units, state.enemies, dt, state.upgrades);
      updateUnitMovement(state.units, state.player.x, state.player.y, dt);
      updateBuilderRepair(state.builderPos.x, state.builderPos.y, state.buildings, dt, state.upgrades);
      updateBuilderDanger(state.builderPos.x, state.builderPos.y, state.enemies, dt);
      updateProtectorAttack(state, dt);
      updateProjectiles(state, dt);

      const prevKilled = state.enemiesKilled;
      state.enemiesKilled = state.enemies.filter(e => e.dead).length;
      if (state.enemiesKilled > prevKilled) sfxKill();

      if (ts - lastSyncRef.current > SYNC_THROTTLE) {
        sendEnemyUpdate(state.enemies.filter(e => !e.dead).map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, chasingBuilder: e.chasingBuilder, type: e.type })));
        sendBuildingHealth(state.buildings.map(b => ({ id: b.id, hp: b.hp, workers: b.workers })));
        sendUnitUpdate(state.units.map(u => ({ id: u.id, x: u.x, y: u.y })));
        sendGoldUpdate(state.gold);
        lastSyncRef.current = ts;
      }

      const tc = state.buildings.find(b => b.type === "town_center");
      if (tc && tc.hp <= 0) { endGame(state, false); return; }
      if (state.playerHp <= 0) { endGame(state, false); return; }

      const allDead = state.enemies.every(e => e.dead);
      if (allDead && state.enemies.length > 0) {
        enterBreather(state);
      }
    }

    // Camera
    const camTargetX = state.player.x - W / 2;
    const camTargetY = state.player.y - H / 2;
    state.cam.x = lerp(state.cam.x, camTargetX, 0.08);
    state.cam.y = lerp(state.cam.y, camTargetY, 0.08);

    draw(ctx, state, t, W, H);
    rafRef.current = requestAnimationFrame(loop);
  }

  function startWave(state) {
    state.waveNumber += 1;
    state.phase = "wave";
    state.enemies = spawnWave(state.waveNumber, room.map_seed);
    setMood("tense");
    sfxWaveStart();
    sendPhaseChange("wave", { waveNumber: state.waveNumber });
  }

  function enterBreather(state) {
    const bonus = calcWaveEndGold(state.buildings);
    state.gold += bonus;
    // Recalculate townspeople from standing homes, then clamp assigned workers
    const newTotal = calcTownspeople(state.buildings);
    state.townspeople = newTotal;
    clampWorkers(state.buildings, newTotal);
    state.phase = "breather";
    state.breatherLeft = BREATHER_DURATION[state.waveNumber] ?? 45;
    setMood("cozy");
    sfxWaveClear();
    sendPhaseChange("breather", { waveNumber: state.waveNumber, gold: state.gold, townspeople: state.townspeople, bonusGold: bonus });
  }

  function endGame(state, won) {
    state.phase = "gameover";
    setMood(null);
    const score = { ...calculateScore(state.buildings, state.enemiesKilled, TOTAL_WAVES), won, enemiesKilled: state.enemiesKilled };
    sendPhaseChange("gameover", { won });
    onGameOver(score);
  }

  // ── Buy upgrade ───────────────────────────────────────────────────────────
  function handleBuyUpgrade(upgradeId) {
    const s = stateRef.current;
    if (!s) return;
    const upg = UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;
    if (s.gold < upg.cost) return;
    if (s.upgrades.includes(upgradeId)) return;
    if (upg.needs && !s.buildings.some(b => b.type === upg.needs && b.hp > 0)) return;
    s.gold -= upg.cost;
    s.upgrades.push(upgradeId);
    sfxPurchaseUpgrade();
    sendGoldUpdate(s.gold);
    setShopTick(n => n + 1);
  }

  // ── Canvas click ──────────────────────────────────────────────────────────
  function handleCanvasClick(e) {
    const s = stateRef.current;
    if (!s) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const W = canvas.width, H = canvas.height;

    // Upgrade shop tap (build or breather phase)
    if (s.phase === "build" || s.phase === "breather") {
      const shop = s.buildings.find(b => b.type === "upgrade_shop" && b.hp > 0);
      if (shop) {
        const inRange = dist(s.player.x, s.player.y, shop.x, shop.y) < 80;
        if (inRange) { setShowShop(true); return; }
      }
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);
    stateRef.current = initState();
    rafRef.current = requestAnimationFrame(loop);
    initAudio();
    setMood("cozy");
    function onKeyDown(e) {
      keysRef.current[e.key] = true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    }
    function onKeyUp(e) { keysRef.current[e.key] = false; }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [room]);

  function onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    joystickRef.current = { active: true, origin: { x: touch.clientX, y: touch.clientY }, current: { x: touch.clientX, y: touch.clientY }, vec: { x: 0, y: 0 } };
  }
  function onTouchMove(e) {
    if (!joystickRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const origin = joystickRef.current.origin;
    const dx = touch.clientX - origin.x, dy = touch.clientY - origin.y;
    const d = Math.sqrt(dx*dx+dy*dy), maxR = 48, angle = Math.atan2(dy, dx);
    joystickRef.current.current = { x: touch.clientX, y: touch.clientY };
    joystickRef.current.vec = { x: Math.cos(angle)*Math.min(d,maxR)/maxR, y: Math.sin(angle)*Math.min(d,maxR)/maxR };
  }
  function onTouchEnd(e) {
    e.preventDefault();
    joystickRef.current = { active: false, vec: { x: 0, y: 0 }, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
  }

  function drawJoystick(ctx) {
    const joy = joystickRef.current;
    if (!joy.active) return;
    const ox = joy.origin.x, oy = joy.origin.y;
    const maxR = 48;
    const dx = joy.current.x - ox, dy = joy.current.y - oy;
    const d = Math.sqrt(dx*dx+dy*dy), angle = Math.atan2(dy, dx);
    const knobR = Math.min(d, maxR);
    const kx = ox + Math.cos(angle)*knobR, ky = oy + Math.sin(angle)*knobR;
    ctx.save();
    ctx.beginPath(); ctx.arc(ox, oy, maxR, 0, Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fill();
    ctx.beginPath(); ctx.arc(kx, ky, 18, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  // ── Upgrade shop modal ────────────────────────────────────────────────────
  const UpgradeShop = () => {
    const s = stateRef.current;
    if (!s) return null;
    const trees = ["personal", "army", "town"];
    const treeLabels = { personal: "personal", army: "army", town: "town" };
    const treeColors = { personal: "rgba(255,100,60,0.8)", army: "rgba(255,150,80,0.8)", town: "rgba(200,140,255,0.8)" };

    return (
      <div style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 20,
      }} onClick={() => setShowShop(false)}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "#0f1316", border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 18, padding: "20px 22px", width: "min(360px, 92vw)", maxHeight: "80vh", overflowY: "auto",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.1em", color: "rgba(200,140,255,0.8)", textTransform: "uppercase" }}>upgrade shop</span>
            <span style={{ fontSize: 14, color: "rgba(255,215,0,0.8)", fontWeight: 500 }}>{Math.floor(s.gold)} g</span>
          </div>
          {trees.map(tree => (
            <div key={tree} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.08em", color: treeColors[tree], textTransform: "uppercase", marginBottom: 8 }}>{treeLabels[tree]}</div>
              {UPGRADES.filter(u => u.tree === tree).map(upg => {
                const owned    = s.upgrades.includes(upg.id);
                const canBuy   = !owned && s.gold >= upg.cost;
                const locked   = upg.needs && !s.buildings.some(b => b.type === upg.needs && b.hp > 0);
                return (
                  <div key={upg.id} onClick={() => !locked && !owned && handleBuyUpgrade(upg.id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 10, marginBottom: 6,
                    background: owned ? "rgba(255,255,255,0.04)" : locked ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                    border: `0.5px solid ${owned ? "rgba(255,255,255,0.08)" : canBuy ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                    opacity: locked ? 0.35 : 1,
                    cursor: owned || locked ? "default" : canBuy ? "pointer" : "not-allowed",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: owned ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)", marginBottom: 2 }}>
                        {upg.label} {owned && "✓"}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{upg.desc}</div>
                      {locked && <div style={{ fontSize: 10, color: "rgba(255,100,100,0.5)", marginTop: 2 }}>needs {upg.needs?.replace("_", " ")}</div>}
                    </div>
                    {!owned && <div style={{
                      fontSize: 12, color: canBuy ? "rgba(255,215,0,0.8)" : "rgba(255,215,0,0.3)",
                      minWidth: 40, textAlign: "right", fontWeight: 500,
                    }}>{upg.cost}g</div>}
                  </div>
                );
              })}
            </div>
          ))}
          <button onClick={() => setShowShop(false)} style={{
            width: "100%", padding: "10px", borderRadius: 10, marginTop: 4,
            background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer",
          }}>close</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0d0f", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} onClick={handleCanvasClick} />
      {showShop && <UpgradeShop />}
    </div>
  );
}