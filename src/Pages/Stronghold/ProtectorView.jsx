// src/Pages/Stronghold/ProtectorView.jsx
import { drawBuilding as drawBuildingIllustrated } from "./drawBuildings";
import { initAudio, setMood, sfxKill, sfxBuildingHit, sfxBuildingFall, sfxWaveStart, sfxWaveClear, sfxPurchaseUpgrade, sfxPlaceBuilding, sfxPing } from "./audio";
import React, { useEffect, useRef, useCallback, useState } from "react";
import { useStrongholdRoom } from "./useStrongholdRoom";
import {
  createJoystick, joystickTouchStart, joystickTouchMove, joystickTouchEnd, drawJoystick,
} from "./mobileControls";
import {
  WORLD, BUILDING_TYPES, UPGRADES,
  PROTECTOR_MAX_HP, PROTECTOR_HEAL_RATE,
  STARTING_GOLD, getBreatherDuration,
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
  lerp, dist, wasWaveFlawless, scoutWave,
  updateTurrets, updateMarketIncome, updateFireTraps,
  upgradeCount, repeatableCost, getMovementSpeed, PROTECTOR_SPEED_BASE,
  segmentCrossesWall,
} from "./strongholdEngine";

const PLAYER_SPEED   = 160;
const MOVE_THROTTLE  = 50;
const SYNC_THROTTLE  = 80;
const COUNTDOWN_SECS = 5;
const DASH_SPEED     = 520;
const DASH_DURATION  = 0.18;
const DASH_COOLDOWN  = 4.0;

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
  const [pings,      setPings]      = useState([]);
  const [waveSummary, setWaveSummary] = useState(null);
  const [dashReady,   setDashReady]  = useState(true); // tracks cooldown for mobile button
  const pingsRef     = useRef([]);

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
      // Homes grant +2 population immediately on placement
      if (building.type === "home") {
        const bonus = BUILDING_TYPES.home.workersGranted ?? 2;
        s.townspeople = (s.townspeople ?? TOWNSPEOPLE_START) + bonus;
      }
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
              follows:    b.allegiance ?? "protector",
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
    onPing: ({ x, y, from }) => {
      const now = Date.now();
      // Add to canvas state so the draw loop renders it
      const s = stateRef.current;
      if (s) {
        if (!s.activePings) s.activePings = [];
        s.activePings.push({ x, y, from, ts: now });
      }
      pingsRef.current = [...pingsRef.current, { x, y, from, ts: now }].filter(p => now - p.ts < 4000);
      setPings([...pingsRef.current]);
      sfxPing();
    },
    onWaveSummary: (data) => {
      setWaveSummary(data);
      setTimeout(() => setWaveSummary(null), 6000);
    },
    onAllegianceChange: ({ buildingId, allegiance }) => {
      const s = stateRef.current;
      if (!s) return;
      const b = s.buildings.find(b => b.id === buildingId);
      if (!b || b.type !== "barracks") return;
      b.allegiance = allegiance;
      // Update follows on all soldiers from this barracks
      s.units.forEach(u => {
        if (u.barracksId === buildingId) u.follows = allegiance;
      });
    },
  }).current;

  const {
    sendP1Move, sendEnemyUpdate, sendBuildingHealth,
    sendUnitUpdate, sendPhaseChange,
    sendCountdown, sendGameOver, sendChat, sendGoldUpdate, sendPlayerReady, sendWorkerAssign,
    sendRevive, sendPing, sendWaveSummary, sendAllegianceChange,
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
        follows:    building.allegiance ?? "protector",
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
    // Reset ready-up flags so a same-seed restart doesn't skip the ready-up gate
    p1ReadyRef.current = false;
    p2ReadyRef.current = false;
    setP1Ready(false);
    setP2Ready(false);

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
      // Dash
      dashCooldown:    0,
      isDashing:       false,
      dashTimer:       0,
      dashVx:          0,
      dashVy:          0,
      // Flawless tracking
      flawlessWaves:   0,
      waveDowns:       0,
      waveBuildingDmgStart: 0,
      totalDowns:      0,
      // Scout — stores per-side enemy counts once protector reaches border
      scoutData:       null, // { perSide:[n,n,n,n], demolishersPerSide:[...], total, demolisherCount }
      scoutPulse:      0,
      // Pings
      activePings:     [],
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

    // Fire trap AOE range rings
    buildings.forEach(b => {
      if (b.type !== "fire_trap" || b.hp <= 0) return;
      const { cx, cy } = worldToCanvas(b.x, b.y, cam);
      const workers = b.workers ?? 0;
      const aoeRange = BUILDING_TYPES.fire_trap.aoeRange + workers * 15;
      const flash = b._fireFlash ?? 0;
      ctx.save();
      ctx.globalAlpha = flash > 0 ? 0.2 + flash * 0.35 : 0.05;
      ctx.beginPath(); ctx.arc(cx, cy, aoeRange, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6600"; ctx.fill();
      ctx.globalAlpha = flash > 0 ? 0.65 : 0.15;
      ctx.beginPath(); ctx.arc(cx, cy, aoeRange, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff6600"; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 12; ctx.stroke();
      ctx.setLineDash([]);
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
      const isBuilderUnit = u.follows === "builder";
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      // Builder-allegiance soldiers are gold; protector soldiers are orange
      ctx.fillStyle = isBuilderUnit
        ? (hpFrac > 0.5 ? "#ffdd44" : "#ffaa00")
        : (hpFrac > 0.5 ? "#ff9966" : "#ff4444");
      ctx.fill();
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
      // Demolisher = dark purple, brute = red, raider = orange-red
      const fill = e.type === "demolisher"
        ? (e.chasingBuilder ? "#cc44ff" : "#7722cc")
        : e.chasingBuilder ? "#ff44aa" : "#cc2222";
      ctx.fillStyle = fill; ctx.fill();
      // Demolisher gets an X mark
      if (e.type === "demolisher") {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
        const r = e.radius * 0.45;
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(cx - 8, cy - e.radius - 6, 16, 3);
      ctx.fillStyle = e.type === "demolisher" ? "#cc88ff" : e.chasingBuilder ? "#ff88cc" : "#ff4444";
      ctx.fillRect(cx - 8, cy - e.radius - 6, 16 * hpPct, 3);
      ctx.restore();
    });

    // Builder dot
    const { cx: bpx, cy: bpy } = worldToCanvas(builderPos.x, builderPos.y, cam);
    ctx.save();
    // Revive ring — pulse when builder is down
    if (state.builderHp <= 0 && phase === "wave") {
      const pulse = 0.5 + 0.3 * Math.sin(t * 5);
      ctx.globalAlpha = pulse * 0.5;
      ctx.beginPath(); ctx.arc(bpx, bpy, REVIVE_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,200,255,0.9)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = pulse * 0.12;
      ctx.beginPath(); ctx.arc(bpx, bpy, REVIVE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120,200,255,1)"; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(bpx, bpy, 10 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(bpx, bpy, 5, 0, Math.PI * 2);
    ctx.fillStyle = state.builderHp <= 0 ? "rgba(120,200,255,0.35)" : "rgba(120,200,255,0.9)"; ctx.fill();
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

    // ── Minimap ────────────────────────────────────────────────────────────
    drawMinimap(ctx, state, t, W, H);

    // ── Threat arrows — off-screen enemies attacking buildings ──────────
    if (phase === "wave") drawThreatArrows(ctx, state, W, H);

    // ── Scout ring (build phase + breather) ─────────────────────────────
    if ((phase === "build" && state.waveNumber === 0) || phase === "breather") {
      const { cx: pcx, cy: pcy } = worldToCanvas(WORLD / 2, WORLD / 2, cam);
      // Subtle world border patrol hint
      if (!state.scoutData) {
        ctx.save();
        ctx.globalAlpha = 0.04 + 0.02 * Math.sin(t * 1.2);
        ctx.strokeStyle = "rgba(255,210,80,0.5)"; ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]); ctx.strokeRect(pcx - WORLD / 2, pcy - WORLD / 2, WORLD, WORLD);
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.28;
        ctx.font = "11px sans-serif"; ctx.fillStyle = "rgba(255,210,80,0.7)"; ctx.textAlign = "center";
        ctx.fillText(phase === "breather" ? `walk to the border to scout wave ${waveNumber + 1}` : "walk to the border to scout incoming enemies", W / 2, H - 56);
        ctx.restore();
      } else {
        // Show per-side counts
        const sd = state.scoutData;
        const sideLabels = ["▲ top", "▶ right", "▼ bottom", "◀ left"];
        const sidePositions = [
          [W / 2, 54],           // top
          [W - 14, H / 2],       // right
          [W / 2, H - 56],       // bottom
          [14, H / 2],           // left
        ];
        const sideAligns = ["center", "right", "center", "left"];
        ctx.save();
        sd.perSide.forEach((n, i) => {
          if (n === 0) return;
          const [sx, sy] = sidePositions[i];
          const dem = sd.demolishersPerSide[i];
          ctx.textAlign = sideAligns[i];
          ctx.globalAlpha = 0.85;
          ctx.font = "12px sans-serif";
          ctx.fillStyle = "rgba(255,180,60,0.9)";
          ctx.fillText(`${sideLabels[i]}: ${n}${dem > 0 ? ` (+${dem} ✕)` : ""}`, sx, sy);
        });
        ctx.globalAlpha = 0.4;
        ctx.font = "10px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
        ctx.fillText(`${sd.total} total — ${sd.demolisherCount} demolisher${sd.demolisherCount !== 1 ? "s" : ""}`, W / 2, H - 40);
        ctx.restore();
      }
    }

    // ── Ping markers on canvas ────────────────────────────────────────────
    if (state.activePings) {
      state.activePings.forEach(p => {
        const age = (Date.now() - p.ts) / 1000;
        if (age > 3) return;
        const { cx: px, cy: py } = worldToCanvas(p.x, p.y, cam);
        const alpha = Math.max(0, 1 - age / 3);
        const ring  = 12 + age * 18;
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath(); ctx.arc(px, py, ring, 0, Math.PI * 2);
        ctx.strokeStyle = p.from === "p1" ? "rgba(255,100,60,0.9)" : "rgba(120,200,255,0.9)";
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.from === "p1" ? "rgba(255,100,60,0.9)" : "rgba(120,200,255,0.9)"; ctx.fill();
        ctx.restore();
      });
      // Clean old pings
      state.activePings = state.activePings.filter(p => Date.now() - p.ts < 3000);
    }

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

    // Walls: draw a slim HP bar along the top edge instead of an arc
    if (def.isWall) {
      if (b.hp > 0 && hpPct < 1) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(b.angle ?? 0);
        const barW = def.halfW * 2;
        const barH = 3;
        const barY = -(def.halfH + 8);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(-def.halfW, barY, barW, barH);
        ctx.fillStyle = hpPct > 0.5 ? "rgba(100,255,100,0.8)" : hpPct > 0.25 ? "rgba(255,200,60,0.9)" : "rgba(255,60,60,1)";
        ctx.fillRect(-def.halfW, barY, barW * hpPct, barH);
        ctx.restore();
      }
      return; // no workers, no label on walls
    }

    if (b.hp > 0 && hpPct < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
      ctx.strokeStyle = hpPct > 0.5 ? "rgba(100,255,100,0.7)" : hpPct > 0.25 ? "rgba(255,200,60,0.8)" : "rgba(255,60,60,0.9)";
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }

    // Overheal gold arc — visible to protector too
    if (b.hp > 0 && b.hp > b.maxHp) {
      const overhealFrac = Math.min((b.hp - b.maxHp) / (b.maxHp * 0.15), 1);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * overhealFrac);
      ctx.strokeStyle = `rgba(255,215,0,${0.6 + 0.2 * Math.sin(t * 3)})`;
      ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    // Turret: draw range ring and projectiles
    if (b.type === "turret" && b.hp > 0) {
      const ringRange = b._effectiveRange ?? def.attackRange;
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, ringRange, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,68,136,0.8)"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      (b.turretProjectiles ?? []).forEach(p => {
        const progress = p.age / p.ttl;
        const { cx: sx, cy: sy } = worldToCanvas(p.x, p.y, cam);
        const { cx: ex, cy: ey } = worldToCanvas(p.tx, p.ty, cam);
        const ppx = sx + (ex - sx) * progress;
        const ppy = sy + (ey - sy) * progress;
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - progress);
        ctx.beginPath(); ctx.arc(ppx, ppy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,68,136,0.9)"; ctx.fill();
        ctx.restore();
      });
    }

    if (b.hp > 0) {
      const workers = b.workers ?? 0;
      if (!def.noWorkers) {
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
      }
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.font = "10px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(def.label, cx, cy + def.radius + 16);
      // Market: show income rate when active
      if (b.type === "market" && (stateRef.current?.waveNumber ?? 0) >= 1) {
        const rate = (def.goldPerSec ?? 1.5) + Math.min(workers, 3) * 0.5;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "rgba(255,215,0,0.8)";
        ctx.font = "9px sans-serif";
        ctx.fillText(`+${rate.toFixed(1)}g/s`, cx, cy + def.radius + 27);
      }
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

    // Dash cooldown bar (only if dash upgrade owned)
    if ((state.upgrades ?? []).includes("dash")) {
      const coolFrac = state.dashCooldown > 0 ? 1 - (state.dashCooldown / DASH_COOLDOWN) : 1;
      const barW = 60, barH = 4;
      const bx = 14, by = H - 48;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.roundRect(bx, by, barW, barH, 2); ctx.fill();
      ctx.fillStyle = coolFrac >= 1 ? "rgba(255,200,60,0.8)" : "rgba(255,200,60,0.35)";
      ctx.roundRect(bx, by, barW * coolFrac, barH, 2); ctx.fill();
      ctx.font = "9px sans-serif"; ctx.textAlign = "left";
      ctx.fillStyle = coolFrac >= 1 ? "rgba(255,200,60,0.7)" : "rgba(255,255,255,0.2)";
      ctx.fillText(coolFrac >= 1 ? "dash ready" : "dash…", bx, by - 3);
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

  // ── Minimap ───────────────────────────────────────────────────────────────
  function drawMinimap(ctx, state, t, W, H) {
    const MM = 90, pad = 10;
    const mx = W - MM - pad, my = pad;
    const scale = MM / WORLD;

    ctx.save();
    // Background
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#0a0d0f";
    ctx.roundRect(mx, my, MM, MM, 6); ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.5;
    ctx.roundRect(mx, my, MM, MM, 6); ctx.stroke();

    // Buildings
    ctx.globalAlpha = 0.7;
    state.buildings.forEach(b => {
      if (b.hp <= 0) return;
      const def = BUILDING_TYPES[b.type];
      const bx = mx + b.x * scale;
      const by = my + b.y * scale;
      ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = def.color; ctx.fill();
    });

    // Pings on minimap
    if (state.activePings) {
      state.activePings.forEach(p => {
        const age = (Date.now() - p.ts) / 1000;
        if (age > 3) return;
        const px = mx + p.x * scale;
        const py = my + p.y * scale;
        ctx.globalAlpha = Math.max(0, 1 - age / 3) * 0.9;
        ctx.beginPath(); ctx.arc(px, py, 3 + age * 2, 0, Math.PI * 2);
        ctx.strokeStyle = p.from === "p1" ? "rgba(255,100,60,1)" : "rgba(120,200,255,1)";
        ctx.lineWidth = 1; ctx.stroke();
      });
    }

    // Enemies (red dots)
    ctx.globalAlpha = 0.55;
    state.enemies.forEach(e => {
      if (e.dead) return;
      const ex = mx + e.x * scale;
      const ey = my + e.y * scale;
      ctx.beginPath(); ctx.arc(ex, ey, e.type === "demolisher" ? 2 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = e.type === "demolisher" ? "#cc44ff" : "#cc2222"; ctx.fill();
    });

    // Builder (blue)
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(mx + state.builderPos.x * scale, my + state.builderPos.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.9)"; ctx.fill();

    // Protector (orange)
    ctx.beginPath(); ctx.arc(mx + state.player.x * scale, my + state.player.y * scale, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,1)"; ctx.fill();

    // Tap-to-ping hint
    ctx.globalAlpha = 0.18;
    ctx.font = "8px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText("tap to ping", mx + MM / 2, my + MM + 9);

    ctx.restore();
  }

  // ── Threat arrows — arrows pointing at off-screen enemies near buildings ──
  function drawThreatArrows(ctx, state, W, H) {
    const { cam, buildings, enemies } = state;
    // Find enemies actively hitting buildings (not chasing players)
    const threatening = enemies.filter(e => !e.dead && !e.chasingProtector && !e.chasingBuilder);
    threatening.forEach(e => {
      // Is this enemy near any building?
      const nearBuilding = buildings.some(b => b.hp > 0 && dist(e.x, e.y, b.x, b.y) < 80);
      if (!nearBuilding) return;
      const { cx, cy } = { cx: e.x - cam.x, cy: e.y - cam.y };
      // Only draw if off-screen
      if (cx >= 0 && cx <= W && cy >= 0 && cy <= H) return;
      // Angle from screen center to enemy
      const angle = Math.atan2(cy - H / 2, cx - W / 2);
      const edgeX = W / 2 + Math.cos(angle) * (W / 2 - 22);
      const edgeY = H / 2 + Math.sin(angle) * (H / 2 - 22);
      const clampedX = Math.max(22, Math.min(W - 22, edgeX));
      const clampedY = Math.max(22, Math.min(H - 22, edgeY));
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(Date.now() / 200);
      ctx.translate(clampedX, clampedY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fillStyle = e.type === "demolisher" ? "rgba(180,60,255,0.9)" : "rgba(255,60,60,0.9)";
      ctx.fill();
      ctx.restore();
    });
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

    // ── Dash ──────────────────────────────────────────────────────────────
    const hasDash = (state.upgrades ?? []).includes("dash");
    const prevCooldown = state.dashCooldown ?? 0;
    state.dashCooldown = Math.max(0, prevCooldown - dt);
    // Update mobile button when cooldown expires
    if (prevCooldown > 0 && state.dashCooldown === 0) setDashReady(true);
    if (state.isDashing) {
      state.dashTimer -= dt;
      if (state.dashTimer <= 0) {
        state.isDashing = false;
      } else {
        state.player = movePlayer(state.player.x, state.player.y, state.dashVx, state.dashVy, dt, DASH_SPEED);
        // Damage all enemies within melee range during dash
        const DASH_DAMAGE = 25;
        const DASH_HIT_RADIUS = 22;
        const upgrades = state.upgrades ?? [];
        const dashDmg = DASH_DAMAGE + (upgrades.includes("atk_damage") ? 10 : 0);
        if (!state.dashHitSet) state.dashHitSet = new Set();
        state.enemies.forEach(e => {
          if (e.dead || state.dashHitSet.has(e.id)) return;
          if (dist(state.player.x, state.player.y, e.x, e.y) < DASH_HIT_RADIUS + e.radius) {
            e.hp -= dashDmg;
            state.dashHitSet.add(e.id);
            if (e.hp <= 0 && !e.dead) {
              e.dead = true;
              const goldDrop = 20 + Math.floor(Math.random() * 11);
              e._goldDrop = goldDrop;
              e._goldAwardedByProtector = true;
              state.gold = (state.gold ?? 0) + goldDrop;
              if (upgrades.includes("lifesteal")) {
                state.playerHp = Math.min(PROTECTOR_MAX_HP, (state.playerHp ?? PROTECTOR_MAX_HP) + 3);
              }
            }
          }
        });
      }
    } else {
      state.dashHitSet = null; // clear hit set when not dashing
      state.player = movePlayer(state.player.x, state.player.y, vx, vy, dt, getMovementSpeed(state.upgrades ?? [], "move_speed", PROTECTOR_SPEED_BASE));
    }

    // ── Scout mechanic (build phase wave 0) ───────────────────────────────
    // Scout works during pre-wave build phase and each inter-wave breather
    const canScout = (state.phase === "build" && state.waveNumber === 0) || state.phase === "breather";
    if (canScout && state.scoutData === null) {
      const margin = 180;
      const px = state.player.x, py = state.player.y;
      const atEdge = px < margin || px > WORLD - margin || py < margin || py > WORLD - margin;
      if (atEdge) {
        state.scoutData = scoutWave(state.waveNumber + 1, room.map_seed);
      }
    }

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
      // Run builder repair on the authoritative (protector) side so HP changes persist and sync correctly
      updateBuilderRepair(state.builderPos.x, state.builderPos.y, state.buildings, dt, state.upgrades ?? []);

      // Either player can revive the other during the breather
      const protectorDown = (state.playerHp ?? PROTECTOR_MAX_HP) <= 0;
      const builderDown   = (state.builderHp ?? BUILDER_TOTAL_MAX_HP) <= 0;
      if (builderDown && !protectorDown) {
        const dToBuilder = dist(state.player.x, state.player.y, state.builderPos.x, state.builderPos.y);
        if (dToBuilder < REVIVE_RADIUS) {
          state.builderHp = Math.floor(BUILDER_TOTAL_MAX_HP * 0.4);
          sendRevive("builder");
        }
      }
      if (protectorDown && !builderDown) {
        const dToProtector = dist(state.player.x, state.player.y, state.builderPos.x, state.builderPos.y);
        if (dToProtector < REVIVE_RADIUS) {
          state.playerHp = Math.floor(PROTECTOR_MAX_HP * 0.4);
          sendRevive("protector");
        }
      }

      state.breatherLeft -= dt;
      sendCountdown(state.breatherLeft);
      // Market income ticks during breather too (wave 1+ only)
      const breatherMarketIncome = updateMarketIncome(state.buildings, dt, state.waveNumber);
      if (breatherMarketIncome > 0) state.gold = (state.gold ?? 0) + breatherMarketIncome;
      // Sync building HP during breather so both players see repairs
      if (ts - lastSyncRef.current > SYNC_THROTTLE) {
        sendBuildingHealth(state.buildings.map(b => ({ id: b.id, hp: b.hp, workers: b.workers, upgradeTier: b.upgradeTier, _fireFlash: b._fireFlash, _aoeRange: b._aoeRange })), state.builderHp, state.playerHp, state.lockedWorkers ?? 0);
        lastSyncRef.current = ts;
      }
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

      // Turrets auto-attack
      updateTurrets(state.buildings, state.enemies, dt);

      // Fire trap AOE bursts
      updateFireTraps(state.buildings, state.enemies, dt);

      // Market passive income (starts from wave 1 onward)
      const marketIncome = updateMarketIncome(state.buildings, dt, state.waveNumber);
      if (marketIncome > 0) state.gold = (state.gold ?? 0) + marketIncome;

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
        builderDown ? null : state.builderPos.x,
        builderDown ? null : state.builderPos.y,
      );

      // Builder repairs only while alive
      if (!builderDown) {
        updateBuilderRepair(state.builderPos.x, state.builderPos.y, state.buildings, dt, state.upgrades);
        updateBuilderDanger(state.builderPos.x, state.builderPos.y, state.enemies, dt);
        state.builderHp = updateBuilderHealth(state.builderPos.x, state.builderPos.y, state.enemies, state.builderHp, dt);
        // Shield regen when not being chased
        updateBuilderShield(state, dt);
      }

      // Protector revives downed builder by walking near them (wave or breather)
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
        // Spawn a gold floater for each newly-killed enemy and award any pending gold drops
        // (soldier/turret kills store _goldDrop but can't directly mutate state.gold)
        if (!state.floaters) state.floaters = [];
        state.enemies.forEach(e => {
          if (!e.dead || e._floaterSpawned) return;
          e._floaterSpawned = true;
          // Award gold from soldier/turret kills (protector kills already added in updateProtectorAttack)
          // _goldDrop is set by all kill sources; protector kills also add to state.gold directly,
          // so only add here if protector didn't already award it (i.e. _goldDrop set but not from protector)
          if (e._goldDrop !== undefined && !e._goldAwardedByProtector) {
            state.gold = (state.gold ?? 0) + e._goldDrop;
          }
          const goldAmt = e._goldDrop ?? (20 + Math.floor(Math.random() * 11));
          state.floaters.push({
            text: `+${goldAmt} g`,
            worldX: e.x, worldY: e.y,
            age: 0, ttl: 1.4,
            color: "rgba(255,215,0,0.9)",
            size: 13,
          });
        });
      }

      // Flawless tracking — record damage taken this wave
      const totalBuildingHp = state.buildings.reduce((s, b) => s + b.hp, 0);
      if (state._waveBuildingHpStart === undefined) state._waveBuildingHpStart = totalBuildingHp;
      const prevProtectorDown = state._wasProtectorDown ?? false;
      const prevBuilderDown   = state._wasBuilderDown   ?? false;
      if (protectorDown && !prevProtectorDown) state.waveDowns = (state.waveDowns ?? 0) + 1;
      if (builderDown   && !prevBuilderDown)   state.waveDowns = (state.waveDowns ?? 0) + 1;
      state._wasProtectorDown = protectorDown;
      state._wasBuilderDown   = builderDown;

      if (ts - lastSyncRef.current > SYNC_THROTTLE) {
        sendEnemyUpdate(state.enemies.filter(e => !e.dead).map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, chasingBuilder: e.chasingBuilder, type: e.type })));
        sendBuildingHealth(state.buildings.map(b => ({ id: b.id, hp: b.hp, workers: b.workers, turretProjectiles: b.turretProjectiles ?? [] })), state.builderHp, state.playerHp, state.lockedWorkers ?? 0);
        sendUnitUpdate(state.units.map(u => ({ id: u.id, x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp })));
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
    state.waveDowns = 0;
    state._waveBuildingHpStart = undefined;
    state._wasProtectorDown = false;
    state._wasBuilderDown   = false;
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
    // Restore all surviving soldiers to full hp between waves
    state.units.forEach(u => { u.hp = u.maxHp; });
    // Unlock all locked workers at the breather
    state.lockedWorkers = 0;

    // Flawless check
    const totalBuildingHp = state.buildings.reduce((s, b) => s + b.hp, 0);
    const buildingDmgTaken = (state._waveBuildingHpStart ?? totalBuildingHp) - totalBuildingHp;
    const flawless = wasWaveFlawless(Math.max(0, buildingDmgTaken), state.waveDowns ?? 0);
    if (flawless) {
      state.flawlessWaves = (state.flawlessWaves ?? 0) + 1;
      const flawlessGold = 75;
      state.gold += flawlessGold;
      if (!state.floaters) state.floaters = [];
      state.floaters.push({
        text: `✦ flawless wave! +${flawlessGold} g`,
        age: 0, ttl: 3.2,
        color: "rgba(255,230,80,1)",
        size: 17,
      });
    }
    state.totalDowns = (state.totalDowns ?? 0) + (state.waveDowns ?? 0);

    state.phase = "breather";
    state.breatherLeft = getBreatherDuration(state.waveNumber);
    state.scoutData = null; // reset so protector can scout the next wave
    setMood("cozy");
    sfxWaveClear();

    // Wave summary — sent to both players
    const summary = {
      waveNumber: state.waveNumber,
      enemiesKilled: state.enemies.filter(e => e.dead).length,
      totalEnemies: state.enemies.length,
      bonusGold: bonus,
      flawless,
      flawlessBonus: flawless ? 75 : 0,
      downs: state.waveDowns ?? 0,
      buildingsStanding: state.buildings.filter(b => b.hp > 0).length,
      totalBuildings: state.buildings.length,
    };
    setWaveSummary(summary);
    sendWaveSummary(summary);
    setTimeout(() => setWaveSummary(null), 6000);

    // Show wave-clear gold bonus as a floating label in screen-space
    if (!state.floaters) state.floaters = [];
    if (bonus > 0) {
      state.floaters.push({
        text: `+${bonus} g  wave bonus`,
        screenX: null,
        screenY: null,
        age: 0, ttl: 2.8,
        color: "rgba(255,215,0,0.95)",
        size: 16,
      });
    }

    // Flush empty enemy list immediately so builder's screen clears — don't wait for next throttled sync
    sendEnemyUpdate([]);
    sendPhaseChange("breather", { waveNumber: state.waveNumber, gold: state.gold, townspeople: state.townspeople, bonusGold: bonus, builderHp: PROTECTOR_MAX_HP, lockedWorkers: 0 });
  }

  function endGame(state, won) {
    state.phase = "gameover";
    setMood(null);
    const score = { ...calculateScore(state.buildings, state.enemiesKilled, state.waveNumber, state.flawlessWaves ?? 0, state.totalDowns ?? 0), won, enemiesKilled: state.enemiesKilled };
    sendPhaseChange("gameover", { won });
    onGameOver(score);
  }

  // ── Buy upgrade ───────────────────────────────────────────────────────────
  function handleBuyUpgrade(upgradeId) {
    const s = stateRef.current;
    if (!s) return;
    const upg = UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;
    if (upg.needs && !s.buildings.some(b => b.type === upg.needs && b.hp > 0)) return;

    if (upg.repeatable) {
      const owned = upgradeCount(s.upgrades, upgradeId);
      if (upg.maxTier && owned >= upg.maxTier) return;
      const cost = repeatableCost(upg.cost, owned + 1);
      if (s.gold < cost) return;
      s.gold -= cost;
      // First purchase stored as bare id, subsequent as "id_2", "id_3"...
      s.upgrades.push(owned === 0 ? upgradeId : `${upgradeId}_${owned + 1}`);
    } else {
      if (s.upgrades.includes(upgradeId)) return;
      if (s.gold < upg.cost) return;
      s.gold -= upg.cost;
      s.upgrades.push(upgradeId);
    }

    sfxPurchaseUpgrade();
    sendGoldUpdate({ gold: s.gold, from: "protector" });
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
    const W  = canvas.width, H = canvas.height;

    // Minimap tap → ping at that world position
    const MM = 90, pad = 10;
    const mx = W - MM - pad, my = pad;
    if (cx >= mx && cx <= mx + MM && cy >= my && cy <= my + MM) {
      const worldX = ((cx - mx) / MM) * WORLD;
      const worldY = ((cy - my) / MM) * WORLD;
      doPing(s, worldX, worldY);
      return;
    }

    // Upgrade shop tap
    if (s.phase === "build" || s.phase === "breather") {
      const shop = s.buildings.find(b => b.type === "upgrade_shop" && b.hp > 0);
      if (shop) {
        const inRange = dist(s.player.x, s.player.y, shop.x, shop.y) < 80;
        if (inRange) { setShowShop(true); return; }
      }
    }

    // World tap → ping at that world position
    const worldX = cx + s.cam.x;
    const worldY = cy + s.cam.y;
    doPing(s, worldX, worldY);
  }

  function doPing(s, worldX, worldY) {
    if (!s.activePings) s.activePings = [];
    // Debounce: don't allow another ping within 1s
    const now = Date.now();
    const recentPing = s.activePings.find(p => p.from === "p1" && now - p.ts < 1000);
    if (recentPing) return;
    s.activePings.push({ x: worldX, y: worldY, from: "p1", ts: now });
    sendPing(worldX, worldY, "p1");
    sfxPing();
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
      // Dash on spacebar
      if (e.key === " ") {
        const s = stateRef.current;
        if (!s) return;
        const hasDash = (s.upgrades ?? []).includes("dash");
        if (!hasDash || s.dashCooldown > 0 || s.isDashing || (s.playerHp ?? PROTECTOR_MAX_HP) <= 0) return;
        const keys = keysRef.current;
        let dvx = 0, dvy = 0;
        if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) dvx -= 1;
        if (keys["ArrowRight"] || keys["d"] || keys["D"]) dvx += 1;
        if (keys["ArrowUp"]    || keys["w"] || keys["W"]) dvy -= 1;
        if (keys["ArrowDown"]  || keys["s"] || keys["S"]) dvy += 1;
        const len = Math.sqrt(dvx * dvx + dvy * dvy);
        if (len === 0) { dvx = 1; dvy = 0; } // default dash right if no direction
        s.isDashing   = true;
        s.dashTimer   = DASH_DURATION;
        s.dashCooldown = DASH_COOLDOWN;
        s.dashVx      = len > 0 ? dvx / len : dvx;
        s.dashVy      = len > 0 ? dvy / len : dvy;
        s.dashHitSet  = new Set();
      }
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
  const shopScrollRef = useRef(0);
  const shopScrollElRef = useRef(null);

  const UpgradeShop = () => {
    const s = stateRef.current;
    if (!s) return null;
    const trees = ["personal", "army", "town", "workshop"];
    const treeLabels = { personal: "personal", army: "army", town: "town", workshop: "workshop (builder)" };
    const treeColors = { personal: "rgba(255,100,60,0.8)", army: "rgba(255,150,80,0.8)", town: "rgba(200,140,255,0.8)", workshop: "rgba(120,200,255,0.8)" };

    // Deduplicate: show each unique upgrade id once per tree
    const seen = new Set();

    return (
      <div style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 20,
      }} onClick={() => setShowShop(false)}>
        <div onClick={e => e.stopPropagation()} ref={el => {
          if (el && shopScrollElRef.current !== el) {
            shopScrollElRef.current = el;
            el.scrollTop = shopScrollRef.current;
          }
        }} onScroll={e => { shopScrollRef.current = e.currentTarget.scrollTop; }}
        style={{
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
              {UPGRADES.filter(u => {
                if (u.tree !== tree) return false;
                if (seen.has(u.id)) return false;
                seen.add(u.id);
                return true;
              }).map(upg => {
                const locked = upg.needs && !s.buildings.some(b => b.type === upg.needs && b.hp > 0);

                if (upg.repeatable) {
                  const owned = upgradeCount(s.upgrades, upg.id);
                  const maxed = upg.maxTier && owned >= upg.maxTier;
                  const nextCost = maxed ? null : repeatableCost(upg.cost, owned + 1);
                  const canBuy = !maxed && !locked && nextCost !== null && s.gold >= nextCost;
                  return (
                    <div key={upg.id} onClick={() => !locked && !maxed && handleBuyUpgrade(upg.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "9px 12px", borderRadius: 10, marginBottom: 6, minHeight: 52,
                      background: owned > 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)",
                      border: `0.5px solid ${canBuy ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
                      opacity: locked ? 0.35 : 1,
                      cursor: maxed || locked ? "default" : canBuy ? "pointer" : "not-allowed",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>
                          {upg.label}
                          {owned > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>
                            tier {owned}{upg.maxTier ? `/${upg.maxTier}` : ""}
                          </span>}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{upg.desc}</div>
                        {locked && <div style={{ fontSize: 10, color: "rgba(255,100,100,0.5)", marginTop: 2 }}>needs {upg.needs?.replace("_", " ")}</div>}
                      </div>
                      <div style={{
                        fontSize: 12, minWidth: 44, textAlign: "right", fontWeight: 500,
                        color: maxed ? "rgba(255,255,255,0.2)" : canBuy ? "rgba(255,215,0,0.8)" : "rgba(255,215,0,0.3)",
                      }}>
                        {maxed ? "max" : `${nextCost}g`}
                      </div>
                    </div>
                  );
                }

                // One-time upgrade
                const owned  = s.upgrades.includes(upg.id);
                const canBuy = !owned && !locked && s.gold >= upg.cost;
                return (
                  <div key={upg.id} onClick={() => !locked && !owned && handleBuyUpgrade(upg.id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 10, marginBottom: 6, minHeight: 52,
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

      {/* Mobile dash button — only when dash upgrade owned */}
      {!showShop && stateRef.current?.upgrades?.includes("dash") && (
        <button
          onTouchStart={e => {
            e.preventDefault();
            const s = stateRef.current;
            if (!s || s.dashCooldown > 0 || s.isDashing || (s.playerHp ?? PROTECTOR_MAX_HP) <= 0) return;
            const joy = joystickRef.current;
            const dvx = joy.active ? joy.vec.x : 0;
            const dvy = joy.active ? joy.vec.y : 0;
            const len = Math.sqrt(dvx * dvx + dvy * dvy);
            s.isDashing    = true;
            s.dashTimer    = DASH_DURATION;
            s.dashCooldown = DASH_COOLDOWN;
            s.dashVx       = len > 0.1 ? dvx / len : 1;
            s.dashVy       = len > 0.1 ? dvy / len : 0;
            setDashReady(false);
          }}
          style={{
            position: "absolute",
            bottom: 36,
            right: 24,
            width: 58, height: 58,
            borderRadius: "50%",
            background: dashReady ? "rgba(255,200,60,0.14)" : "rgba(255,200,60,0.04)",
            border: `1.5px solid ${dashReady ? "rgba(255,200,60,0.5)" : "rgba(255,200,60,0.15)"}`,
            color: dashReady ? "rgba(255,200,60,0.9)" : "rgba(255,200,60,0.25)",
            fontSize: 22,
            cursor: dashReady ? "pointer" : "not-allowed",
            touchAction: "none",
            userSelect: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          ⚡
        </button>
      )}

      {/* Wave summary card */}
      {waveSummary && !showShop && (
        <div style={{
          position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
          background: "rgba(10,13,15,0.92)", border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "14px 20px", minWidth: 230, zIndex: 15,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: waveSummary.flawless ? "rgba(255,220,60,0.9)" : "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 10 }}>
            {waveSummary.flawless ? "✦ flawless wave!" : `wave ${waveSummary.waveNumber} clear`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              ["enemies killed", `${waveSummary.enemiesKilled} / ${waveSummary.totalEnemies}`],
              ["buildings standing", `${waveSummary.buildingsStanding} / ${waveSummary.totalBuildings}`],
              ["downs", `${waveSummary.downs}`],
              ["wave bonus", `+${waveSummary.bonusGold} g`],
              ...(waveSummary.flawless ? [["flawless bonus", "+75 g"]] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{label}</span>
                <span style={{ fontSize: 12, color: label === "downs" && waveSummary.downs > 0 ? "rgba(255,100,80,0.8)" : "rgba(255,255,255,0.7)", fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready-up button — only before wave 1 */}
      {!showShop && stateRef.current?.phase === "build" && stateRef.current?.waveNumber === 0 && (
        <div style={{
          position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
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