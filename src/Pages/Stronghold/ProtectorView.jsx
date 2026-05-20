// src/Pages/Stronghold/ProtectorView.jsx
import { drawBuilding as drawBuildingIllustrated } from "./drawBuildings";
import { initAudio, setMood, sfxKill, sfxBuildingHit, sfxBuildingFall, sfxWaveStart, sfxWaveClear, sfxPurchaseUpgrade, sfxPlaceBuilding } from "./audio";
import React, { useEffect, useRef, useCallback, useState } from "react";
import { useStrongholdRoom } from "./useStrongholdRoom";
import {
  createJoystick, joystickTouchStart, joystickTouchMove, joystickTouchEnd, drawJoystick,
} from "./mobileControls";
import {
  WORLD, BUILDING_TYPES, UPGRADES,
  PROTECTOR_MAX_HP, PROTECTOR_HEAL_RATE,
  STARTING_GOLD, BREATHER_DURATION, getBreatherDuration,
  TOWNSPEOPLE_START,
  createInitialMap, spawnWave, movePlayer,
  updateEnemies, updateEnemyAttacks, updateUnitCombat,
  updateUnitMovement, updateBuilderRepair,
  updateProtectorAttack, updateProtectorHeal,
  updateProjectiles, updateBuilderDanger, updateBuilderHealth,
  updateBuilderShield, BUILDER_TOTAL_MAX_HP, REVIVE_RADIUS,
  updateEnemyAttackUnits,
  getSlowZones, calculateScore, calcWaveEndGold,
  calcTownspeople, clampWorkers,
  lerp, dist,
} from "./strongholdEngine";

const PLAYER_SPEED   = 160;
const MOVE_THROTTLE  = 50;
const SYNC_THROTTLE  = 80;
const COUNTDOWN_SECS = 5;

export default function ProtectorView({ room, onGameOver }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef = useRef(createJoystick());
  const rafRef      = useRef(null);
  const lastMoveRef = useRef(0);
  const lastSyncRef = useRef(0);

  const [showShop,   setShowShop]   = useState(false);
  const [shopTick,   setShopTick]   = useState(0);
  const [p1Ready,    setP1Ready]    = useState(false);
  const [p2Ready,    setP2Ready]    = useState(false);
  const p1ReadyRef = useRef(false);
  const p2ReadyRef = useRef(false);

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
      if (!b) return;
      const prevWorkers = b.workers ?? 0;
      b.workers = workers;

      // Barracks: worker count directly controls extra soldiers
      if (b.type === "barracks" && b.hp > 0) {
        const extra = (s.upgrades ?? []).includes("soldier_cnt") ? 1 : 0;
        const targetCount = 1 + workers + extra;
        const currentCount = s.units.filter(u => u.barracksId === buildingId).length;

        if (workers > prevWorkers) {
          // Added workers — spawn one soldier per new worker
          const toAdd = workers - prevWorkers;
          const hp = 50 + ((s.upgrades ?? []).includes("soldier_hp") ? 20 : 0);
          for (let i = 0; i < toAdd; i++) {
            s.units.push({
              id:         Date.now() + Math.random(),
              barracksId: buildingId,
              x:          b.x + 30 + (currentCount + i) * 14,
              y:          b.y,
              hp, maxHp: hp, radius: 6,
              attackCooldown: 0,
              projectiles: [],
            });
          }
        } else if (workers < prevWorkers) {
          // Removed workers — dismiss one soldier per removed worker (prefer healthy ones last)
          const toRemove = prevWorkers - workers;
          const owned = s.units.filter(u => u.barracksId === buildingId);
          // Sort: remove lowest-hp soldiers first (dismiss the weakest)
          owned.sort((a, b) => a.hp - b.hp);
          const toKill = new Set(owned.slice(0, toRemove).map(u => u.id));
          s.units = s.units.filter(u => !toKill.has(u.id));
        }
      }
    },
    onGoldUpdate: ({ gold, from }) => {
      if (from === "protector") return; // ignore own echoes
      if (stateRef.current) stateRef.current.gold = gold;
    },
    onChat: ({ text, from }) => {
      if (!stateRef.current) return;
      stateRef.current.chatMessages.unshift({ text, from, ts: Date.now() });
      if (stateRef.current.chatMessages.length > 20) stateRef.current.chatMessages.pop();
    },
    onPlayerReady: ({ role }) => {
      if (role === "p2") {
        p2ReadyRef.current = true;
        setP2Ready(true);
        if (p1ReadyRef.current && stateRef.current?.phase === "build" && stateRef.current?.waveNumber === 0) {
          startWave(stateRef.current);
        }
      }
    },
    onRevive: ({ target }) => {
      // Builder revived the protector
      const s = stateRef.current;
      if (!s || target !== "protector") return;
      if ((s.playerHp ?? PROTECTOR_MAX_HP) <= 0) {
        s.playerHp = Math.floor(PROTECTOR_MAX_HP * 0.4); // revive at 40% hp
      }
    },
  }).current;

  const {
    sendP1Move, sendEnemyUpdate, sendBuildingHealth,
    sendUnitUpdate, sendPhaseChange,
    sendCountdown, sendGameOver, sendChat, sendGoldUpdate, sendPlayerReady, sendWorkerAssign,
    sendRevive,
  } = useStrongholdRoom(room?.id ?? null, handlers);

  // ── Spawn soldiers ────────────────────────────────────────────────────────
  function spawnSoldiers(s, building) {
    const extra   = (s.upgrades ?? []).includes("soldier_cnt") ? 1 : 0;
    const workers = building.workers ?? 0;
    const count   = 1 + workers + extra; // 1 base + 1 per worker + upgrade bonus
    const hp      = 50 + ((s.upgrades ?? []).includes("soldier_hp") ? 20 : 0);
    for (let i = 0; i < count; i++) {
      s.units.push({
        id:         Date.now() + Math.random(),
        barracksId: building.id,           // track which barracks owns this soldier
        x:          building.x + 30 + i * 14,
        y:          building.y,
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
      builderHp:       BUILDER_TOTAL_MAX_HP,
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
      floaters:        [],
      lockedWorkers:   0,
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

    // World border
    const { cx: bx, cy: by } = worldToCanvas(0, 0, cam);
    ctx.save();
    if (phase === "wave") {
      const pulse = 0.04 + 0.04 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(200,40,40,${pulse})`;
      ctx.lineWidth = 8;
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(bx, by, WORLD, WORLD);
    ctx.restore();

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
    buildings.forEach(b => drawBuilding(ctx, b, cam, t, W, H));

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
      const hpFrac = Math.max(0, u.hp / u.maxHp);
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = hpFrac > 0.5 ? "#ff9966" : "#ff4444"; ctx.fill();
      ctx.restore();
      // Tiny HP bar above soldier — only show when damaged
      if (hpFrac < 1) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(cx - 7, cy - 9, 14, 2.5);
        ctx.fillStyle = hpFrac > 0.5 ? "#88ff88" : "#ff5555";
        ctx.fillRect(cx - 7, cy - 9, 14 * hpFrac, 2.5);
        ctx.restore();
      }
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
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(cx - 8, cy - e.radius - 6, 16, 3);
      ctx.fillStyle = e.chasingBuilder ? "#ff88cc" : "#ff4444";
      ctx.fillRect(cx - 8, cy - e.radius - 6, 16 * hpPct, 3);
      ctx.restore();
    });

    // Builder dot
    const { cx: bpx, cy: bpy } = worldToCanvas(builderPos.x, builderPos.y, cam);
    ctx.save();
    ctx.beginPath(); ctx.arc(bpx, bpy, 10 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(bpx, bpy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.9)"; ctx.fill();
    ctx.restore();

    // Protector dot
    const { cx: ppx, cy: ppy } = worldToCanvas(player.x, player.y, cam);
    ctx.save();
    ctx.beginPath(); ctx.arc(ppx, ppy, 13 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(ppx, ppy, 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.95)"; ctx.fill();
    ctx.restore();

    drawHUD(ctx, state, t, W, H);

    // Joystick overlay — drawn last so it's always on top
    drawJoystick(ctx, joystickRef.current);

    // Gold floaters
    if (state.floaters && state.floaters.length > 0) {
      ctx.save();
      state.floaters.forEach(f => {
        const progress = f.age / f.ttl;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

        let sx, sy;
        if (f.worldX !== undefined) {
          // World-space floater (per-kill): rises upward from enemy position
          const { cx, cy } = worldToCanvas(f.worldX, f.worldY, cam);
          sx = cx;
          sy = cy - progress * 38;
        } else {
          // Screen-space floater (wave bonus): centred near top
          sx = W / 2;
          sy = 80 + progress * -22;
        }

        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = `${f.size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = f.color;
        // subtle dark shadow for legibility
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 4;
        ctx.fillText(f.text, sx, sy);
        ctx.shadowBlur = 0;
      });
      ctx.restore();
    }
  }

  function drawBuilding(ctx, b, cam, t, W, H) {
    const def = BUILDING_TYPES[b.type];
    const { cx, cy } = worldToCanvas(b.x, b.y, cam);
    if (cx < -60 || cx > W + 60 || cy < -60 || cy > H + 60) return;
    const hpPct = b.hp / b.maxHp;
    const wasAlive = (b._prevHp ?? b.maxHp) > 0;
    if (wasAlive && b.hp <= 0) { sfxBuildingFall(); b._prevHp = 0; }
    else if (b.hp > 0 && b._prevHp !== undefined && b.hp < b._prevHp - 8) sfxBuildingHit();
    b._prevHp = b.hp;

    drawBuildingIllustrated(ctx, b, cx, cy, t);

    if (b.hp > 0 && hpPct < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
      ctx.strokeStyle = hpPct > 0.5 ? "rgba(100,255,100,0.7)" : hpPct > 0.25 ? "rgba(255,200,60,0.8)" : "rgba(255,60,60,0.9)";
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }

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
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.font = "10px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(def.label, cx, cy + def.radius + 16);
      ctx.restore();
    }
  }

  function drawHUD(ctx, state, t, W, H) {
    const { phase, waveNumber, countdownLeft, breatherLeft, playerHp, gold, upgrades, townspeople } = state;

    ctx.save();
    ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
    let phaseLabel = "";
    if (phase === "build")         phaseLabel = waveNumber === 0 ? "plan your stronghold" : "build phase";
    else if (phase === "wave")     phaseLabel = `wave ${waveNumber}`;
    else if (phase === "breather") phaseLabel = `next wave in ${Math.ceil(breatherLeft)}s`;
    ctx.fillText(phaseLabel, W / 2, 28);

    // Survive-as-long-as-you-can counter
    if (waveNumber > 0) {
      ctx.font = "10px sans-serif";
      ctx.fillStyle = phase === "wave" ? "rgba(255,100,60,0.45)" : "rgba(255,210,80,0.32)";
      ctx.textAlign = "center";
      ctx.fillText(phase === "wave" ? "survive as long as you can" : `${waveNumber} survived`, W / 2, 44);
    }

    if (phase === "breather") {
      const frac = breatherLeft / getBreatherDuration(waveNumber);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(0, 0, W * (1 - frac), 3);
      ctx.globalAlpha = 1;
    }

    // HP bar
    const hpBarW = 90, hpBarH = 5;
    const hpBarX = 14, hpBarY = H - 28;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 3); ctx.fill();
    const hpFrac = Math.max(0, playerHp) / PROTECTOR_MAX_HP;
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(255,100,60,0.8)" : hpFrac > 0.25 ? "rgba(255,200,60,0.8)" : "rgba(255,60,60,0.9)";
    ctx.roundRect(hpBarX, hpBarY, hpBarW * hpFrac, hpBarH, 3); ctx.fill();
    ctx.font = "10px sans-serif"; ctx.textAlign = "left";
    if (playerHp <= 0 && phase === "wave") {
      ctx.fillStyle = "rgba(255,80,80,0.7)";
      ctx.fillText("DOWN — next wave", hpBarX, hpBarY - 4);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText(`${Math.ceil(playerHp)} hp`, hpBarX, hpBarY - 4);
    }

    // Builder down indicator (bottom-right area, near gold)
    if (state.builderHp <= 0 && phase === "wave") {
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(120,200,255,0.6)";
      ctx.font = "10px sans-serif";
      ctx.fillText("builder down — walk near to revive", W - 14, H - 50);
    }

    // Gold
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,215,0,0.7)";
    ctx.font = "13px sans-serif";
    ctx.fillText(`${Math.floor(gold)} g`, W - 14, H - 18);

    // Townspeople
    ctx.fillStyle = "rgba(180,220,255,0.5)";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${townspeople} people`, W - 14, H - 36);

    // Upgrade shop hint
    if (phase === "build" || phase === "breather") {
      const hasShop = state.buildings.some(b => b.type === "upgrade_shop" && b.hp > 0);
      if (hasShop) {
        const shop = state.buildings.find(b => b.type === "upgrade_shop");
        const inRange = dist(state.player.x, state.player.y, shop.x, shop.y) < 80;
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
    ctx.textAlign = "right";
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

    const keys = keysRef.current;
    const joy  = joystickRef.current;
    const protectorAlreadyDown = (state.playerHp ?? PROTECTOR_MAX_HP) <= 0;
    let vx = 0, vy = 0;
    if (!protectorAlreadyDown) {
      if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) vx -= 1;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) vx += 1;
      if (keys["ArrowUp"]    || keys["w"] || keys["W"]) vy -= 1;
      if (keys["ArrowDown"]  || keys["s"] || keys["S"]) vy += 1;
      if (joy.active) { vx += joy.vec.x; vy += joy.vec.y; }
    }
    state.player = movePlayer(state.player.x, state.player.y, vx, vy, dt, PLAYER_SPEED);

    if (!protectorAlreadyDown && ts - lastMoveRef.current > MOVE_THROTTLE) {
      sendP1Move(state.player.x, state.player.y);
      lastMoveRef.current = ts;
    }

    state.builderPos.x = lerp(state.builderPos.x, state.builderTarget.x, 0.18);
    state.builderPos.y = lerp(state.builderPos.y, state.builderTarget.y, 0.18);

    if (state.phase === "build" || state.phase === "breather") {
  updateProtectorHeal(state, dt);
}

    if (state.phase === "breather") {
      state.breatherLeft -= dt;
      sendCountdown(state.breatherLeft);
      if (state.breatherLeft <= 0) {
        // Infinite waves — always start the next wave, never end on breather
        startWave(state);
      }
    }

    if (state.phase === "wave") {
      const protectorDown = (state.playerHp ?? PROTECTOR_MAX_HP) <= 0;
      const builderDown   = (state.builderHp ?? PROTECTOR_MAX_HP) <= 0;

      // Town center — used as unit rally point when protector is dead
      const tc = state.buildings.find(b => b.type === "town_center");

      const slowZones = getSlowZones(state.buildings, state.upgrades);

      // Enemies track protector only while alive; builder only while alive
      updateEnemies(
        state.enemies, state.buildings,
        builderDown   ? null : state.builderPos.x,
        builderDown   ? null : state.builderPos.y,
        dt, slowZones,
        protectorDown ? null : state.player.x,
        protectorDown ? null : state.player.y,
      );

      // Enemies always attack buildings; also attack protector if alive
      state.playerHp = updateEnemyAttacks(
        state.enemies, state.buildings, dt,
        protectorDown ? undefined : state.player.x,
        protectorDown ? undefined : state.player.y,
        state.playerHp,
      );

      updateUnitCombat(state.units, state.enemies, dt, state.upgrades);

      // Enemies also attack soldiers — soldiers can die
      const { survivors, casualties } = updateEnemyAttackUnits(state.enemies, state.units, dt);
      state.units = survivors;

      // For each dead soldier: pull their worker out of the barracks and lock them
      if (casualties.length > 0) {
        if (!state.lockedWorkers) state.lockedWorkers = 0;
        casualties.forEach(({ barracksId }) => {
          const barracks = state.buildings.find(b => b.id === barracksId && b.hp > 0);
          if (barracks && (barracks.workers ?? 0) > 0) {
            barracks.workers = Math.max(0, barracks.workers - 1);
            state.lockedWorkers += 1;
            sendWorkerAssign(barracksId, barracks.workers);
          }
        });
      }

      // Units follow protector; if protector is down they guard the town center
      const rallyX = tc?.x ?? state.player.x;
      const rallyY = tc?.y ?? state.player.y;
      updateUnitMovement(
        state.units,
        protectorDown ? null : state.player.x,
        protectorDown ? null : state.player.y,
        dt, state.enemies,
        rallyX, rallyY,
      );

      // Builder repairs only while alive
      if (!builderDown) {
        updateBuilderRepair(state.builderPos.x, state.builderPos.y, state.buildings, dt, state.upgrades);
        updateBuilderDanger(state.builderPos.x, state.builderPos.y, state.enemies, dt);
        state.builderHp = updateBuilderHealth(state.builderPos.x, state.builderPos.y, state.enemies, state.builderHp, dt);
        // Shield regen when not being chased
        updateBuilderShield(state, dt);
      }

      // Protector revives downed builder by walking near them
      if (builderDown && !protectorDown) {
        const dToBuilder = dist(state.player.x, state.player.y, state.builderPos.x, state.builderPos.y);
        if (dToBuilder < REVIVE_RADIUS) {
          state.builderHp = Math.floor(BUILDER_TOTAL_MAX_HP * 0.4); // revive at 40%
          sendRevive("builder");
        }
      }

      // Protector attacks only while alive
      if (!protectorDown) {
        updateProtectorAttack(state, dt);
      }

      updateProjectiles(state, dt);

      const prevKilled = state.enemiesKilled;
      state.enemiesKilled = state.enemies.filter(e => e.dead).length;
      if (state.enemiesKilled > prevKilled) {
        sfxKill();
        // Spawn a small gold floater over each newly-killed enemy
        if (!state.floaters) state.floaters = [];
        state.enemies.forEach(e => {
          if (!e.dead || e._floaterSpawned) return;
          e._floaterSpawned = true;
          const goldAmt = 20 + Math.floor(Math.random() * 11);
          state.floaters.push({
            text: `+${goldAmt} g`,
            worldX: e.x, worldY: e.y, // world-space, converted in draw
            age: 0, ttl: 1.4,
            color: "rgba(255,215,0,0.9)",
            size: 13,
          });
        });
      }

      if (ts - lastSyncRef.current > SYNC_THROTTLE) {
        sendEnemyUpdate(state.enemies.filter(e => !e.dead).map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, chasingBuilder: e.chasingBuilder, type: e.type })));
        sendBuildingHealth(state.buildings.map(b => ({ id: b.id, hp: b.hp, workers: b.workers })), state.builderHp, state.playerHp, state.lockedWorkers ?? 0);
        sendUnitUpdate(state.units.map(u => ({ id: u.id, x: u.x, y: u.y })));
        sendGoldUpdate({ gold: state.gold, from: "protector" });
        lastSyncRef.current = ts;
      }

      if (tc && tc.hp <= 0) { endGame(state, false); return; }

      const allDead = state.enemies.every(e => e.dead);
      if (allDead && state.enemies.length > 0) enterBreather(state);
    }

    // Camera
    const camTargetX = state.player.x - W / 2;
    const camTargetY = state.player.y - H / 2;
    state.cam.x = lerp(state.cam.x, camTargetX, 0.08);
    state.cam.y = lerp(state.cam.y, camTargetY, 0.08);

    // Tick floaters
    if (state.floaters) {
      state.floaters.forEach(f => { f.age += dt; });
      state.floaters = state.floaters.filter(f => f.age < f.ttl);
    }

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
    const newTotal = calcTownspeople(state.buildings);
    state.townspeople = newTotal;
    clampWorkers(state.buildings, newTotal);
    state.builderHp  = BUILDER_TOTAL_MAX_HP;
    state.playerHp   = PROTECTOR_MAX_HP;
    // Restore all surviving soldiers to full hp between waves
    state.units.forEach(u => { u.hp = u.maxHp; });
    // Unlock all locked workers at the breather
    state.lockedWorkers = 0;
    state.phase = "breather";
    state.breatherLeft = getBreatherDuration(state.waveNumber);
    setMood("cozy");
    sfxWaveClear();

    // Show wave-clear gold bonus as a floating label in screen-space
    if (!state.floaters) state.floaters = [];
    if (bonus > 0) {
      state.floaters.push({
        text: `+${bonus} g  wave bonus`,
        screenX: null, // null = centred
        screenY: null, // null = upper-middle
        age: 0, ttl: 2.8,
        color: "rgba(255,215,0,0.95)",
        size: 16,
      });
    }

    sendPhaseChange("breather", { waveNumber: state.waveNumber, gold: state.gold, townspeople: state.townspeople, bonusGold: bonus, builderHp: PROTECTOR_MAX_HP, lockedWorkers: 0 });
  }

  function endGame(state, won) {
    state.phase = "gameover";
    setMood(null);
    const score = { ...calculateScore(state.buildings, state.enemiesKilled, state.waveNumber), won, enemiesKilled: state.enemiesKilled };
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
    sendGoldUpdate({ gold: s.gold, from: "protector" });
    setShopTick(n => n + 1);
  }

  // ── Canvas click (right half only for shop tap on mobile) ─────────────────
  function handleCanvasClick(e) {
    const s = stateRef.current;
    if (!s) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Upgrade shop tap — only trigger if click is in right half of screen on mobile
    if (s.phase === "build" || s.phase === "breather") {
      const shop = s.buildings.find(b => b.type === "upgrade_shop" && b.hp > 0);
      if (shop) {
        const inRange = dist(s.player.x, s.player.y, shop.x, shop.y) < 80;
        if (inRange) { setShowShop(true); return; }
      }
    }
  }

  // Track which touch IDs were claimed by the joystick (started in bottom half)
  const joystickTouchIds = useRef(new Set());

  // ── Touch handlers — joystick owns bottom 50%, top 50% scrolls freely ───
  function onTouchStart(e) {
    const canvas = canvasRef.current;
    for (const touch of e.changedTouches) {
      const rect = canvas?.getBoundingClientRect();
      const inBottomHalf = rect && touch.clientY >= rect.top + rect.height / 2;
      if (inBottomHalf) {
        joystickTouchIds.current.add(touch.identifier);
        joystickTouchStart(joystickRef.current, touch);
      }
      // top-half touches are left alone — browser scrolls naturally
    }
  }

  function onTouchMove(e) {
    let isDrag = false;
    for (const touch of e.changedTouches) {
      if (!joystickTouchIds.current.has(touch.identifier)) continue;
      if (joystickTouchMove(joystickRef.current, touch) === "drag") isDrag = true;
    }
    if (isDrag) e.preventDefault(); // only block scroll for joystick drags
  }

  function onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      joystickTouchIds.current.delete(touch.identifier);
      joystickTouchEnd(joystickRef.current, touch);
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
    canvas.addEventListener("touchstart",  onTouchStart, { passive: true  });
    canvas.addEventListener("touchmove",   onTouchMove,  { passive: false }); // may block scroll
    canvas.addEventListener("touchend",    onTouchEnd,   { passive: true  });
    canvas.addEventListener("touchcancel", onTouchEnd,   { passive: true  });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
      canvas.removeEventListener("touchcancel",onTouchEnd);
    };
  }, [room]);

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
                const owned  = s.upgrades.includes(upg.id);
                const canBuy = !owned && s.gold >= upg.cost;
                const locked = upg.needs && !s.buildings.some(b => b.type === upg.needs && b.hp > 0);
                return (
                  <div key={upg.id} onClick={() => !locked && !owned && handleBuyUpgrade(upg.id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 10, marginBottom: 6,
                    background: owned ? "rgba(255,255,255,0.04)" : locked ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                    border: `0.5px solid ${owned ? "rgba(255,255,255,0.08)" : canBuy ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                    opacity: locked ? 0.35 : 1,
                    cursor: owned || locked ? "default" : canBuy ? "pointer" : "not-allowed",
                    // Bigger tap target on mobile
                    minHeight: 52,
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
            width: "100%", padding: "14px", borderRadius: 10, marginTop: 4,
            background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer",
          }}>close</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0d0f", position: "relative", overflow: "hidden", touchAction: "pan-y" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }}
        onClick={handleCanvasClick}
      />
      {showShop && <UpgradeShop />}

      {/* Ready-up button — only before wave 1 */}
      {!showShop && stateRef.current?.phase === "build" && stateRef.current?.waveNumber === 0 && (
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          // Sits in right half so it doesn't overlap the joystick zone
        }}>
          {p2Ready && !p1Ready && (
            <div style={{ fontSize: 11, color: "rgba(120,200,255,0.55)" }}>builder is ready</div>
          )}
          <button
            onClick={() => {
              if (p1Ready) return;
              p1ReadyRef.current = true;
              setP1Ready(true);
              sendPlayerReady("p1");
              if (p2ReadyRef.current && stateRef.current?.phase === "build" && stateRef.current?.waveNumber === 0) {
                startWave(stateRef.current);
              }
            }}
            style={{
              padding: "12px 32px", borderRadius: 14, fontSize: 13,
              background: p1Ready ? "rgba(120,255,120,0.08)" : "rgba(255,210,80,0.08)",
              border: `1px solid ${p1Ready ? "rgba(120,255,120,0.3)" : "rgba(255,210,80,0.3)"}`,
              color: p1Ready ? "rgba(120,255,120,0.7)" : "rgba(255,210,80,0.85)",
              cursor: p1Ready ? "default" : "pointer",
              letterSpacing: "0.05em",
              transition: "all 0.2s",
              // Ensure good tap target
              minHeight: 48,
              minWidth: 140,
            }}
          >
            {p1Ready ? "ready ✓" : "ready up"}
          </button>
        </div>
      )}
    </div>
  );
}