// src/Pages/Stronghold/BuilderView.jsx
import { drawBuilding as drawBuildingIllustrated } from "./drawBuildings";
import { initAudio, setMood, sfxPlaceBuilding, sfxWorkerDeath, sfxBuilderDanger } from "./audio";
import React, { useEffect, useRef, useState } from "react";
import { useStrongholdRoom } from "./useStrongholdRoom";
import {
  createJoystick, joystickTouchStart, joystickTouchMove, joystickTouchEnd, drawJoystick,
} from "./mobileControls";
import {
  WORLD, BUILDING_TYPES, PLACEABLE_BUILDINGS,
  STARTING_GOLD, TOWNSPEOPLE_START, PROTECTOR_MAX_HP,
  BUILDER_DIRECT_REPAIR_RADIUS, BUILDER_TOTAL_MAX_HP, REVIVE_RADIUS,
  BUILDER_PLACE_RANGE_BONUS,
  createInitialMap, lerp, dist, calcTownspeople, clampWorkers,
  applyConstructionAura, sellBuilding,
} from "./strongholdEngine";

const BUILDER_SPEED  = 150;
const BASE_PLACE_RANGE = 80;
const MOVE_THROTTLE  = 50;

export default function BuilderView({ room, onGameOver }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef = useRef(createJoystick());
  const rafRef      = useRef(null);
  const lastMoveRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const selectedTypeRef = useRef(null);

  const [phase,         setPhase]         = useState("build");
  const [waveNumber,    setWaveNumber]     = useState(0);
  const [selectedType,  setSelectedTypeRaw] = useState(null);
  const setSelectedType = (v) => { selectedTypeRef.current = v; setSelectedTypeRaw(v); };
  const [countdown,     setCountdown]     = useState(0);
  const [gold,          setGold]          = useState(STARTING_GOLD);
  const [townspeople,   setTownspeople]   = useState(TOWNSPEOPLE_START);
  const [assignPanel,   setAssignPanel]   = useState(null);
  const [ready,         setReady]         = useState(false);
  const [waveSummary,   setWaveSummary]   = useState(null);
  const [upgrades,      setUpgrades]      = useState([]); // mirror for re-render
  const [, forceUpdate]                   = useState(0);

  const handlers = useRef({
    onP1Move: ({ x, y }) => {
      if (!stateRef.current) return;
      stateRef.current.protectorTarget = { x, y };
    },
    onBuildingHealth: ({ buildings, builderHp, protectorHp, lockedWorkers }) => {
      if (!stateRef.current) return;
      buildings.forEach(({ id, hp, workers }) => {
        const b = stateRef.current.buildings.find(b => b.id === id);
        if (b) { b.hp = hp; if (workers !== undefined) b.workers = workers; }
      });
      if (builderHp !== undefined) stateRef.current.builderHp = builderHp;
      if (protectorHp !== undefined) stateRef.current.protectorHp = protectorHp;
      if (lockedWorkers !== undefined) stateRef.current.lockedWorkers = lockedWorkers;
    },
    onEnemyUpdate:  ({ enemies }) => { if (stateRef.current) stateRef.current.enemies = enemies; },
    onUnitUpdate:   ({ units })   => { if (stateRef.current) stateRef.current.units   = units;   },
    onGoldUpdate: ({ gold, from }) => {
  if (from === "builder") return;   // ← ignore own echoes
  if (stateRef.current) { stateRef.current.gold = gold; setGold(gold); }
},
    onPhaseChange: ({ phase, waveNumber, won, gold, townspeople: tp, bonusGold, builderHp }) => {
      if (!stateRef.current) return;
      stateRef.current.phase = phase;
      setPhase(phase);
      if (waveNumber !== undefined) { stateRef.current.waveNumber = waveNumber; setWaveNumber(waveNumber); }
      if (gold      !== undefined) { stateRef.current.gold = gold; setGold(gold); }
      if (tp        !== undefined) {
        stateRef.current.townspeople = tp;
        clampWorkers(stateRef.current.buildings, tp);
        setTownspeople(tp);
      }
      if (builderHp !== undefined) stateRef.current.builderHp = builderHp;
      if (phase === "breather") { stateRef.current.lockedWorkers = 0; setSelectedType(null); setMood("cozy"); }
      if (phase === "wave")     { setAssignPanel(null);  setMood("tense"); }
      if (phase === "gameover") { setMood(null); onGameOver({ won, waveReached: waveNumber ?? stateRef.current?.waveNumber ?? 0, standing: stateRef.current?.buildings?.filter(b => b.hp > 0).length ?? 0, total: stateRef.current?.buildings?.length ?? 0, enemiesKilled: stateRef.current?.enemies?.filter(e => e.dead).length ?? 0 }); }
    },
    onCountdown: ({ seconds }) => setCountdown(Math.ceil(seconds)),
    onChat: ({ text, from }) => {
      if (!stateRef.current) return;
      stateRef.current.chatMessages?.unshift({ text, from, ts: Date.now() });
    },
    onRevive: ({ target }) => {
      // Protector revived the builder
      const s = stateRef.current;
      if (!s || target !== "builder") return;
      if ((s.builderHp ?? BUILDER_TOTAL_MAX_HP) <= 0) {
        s.builderHp = Math.floor(BUILDER_TOTAL_MAX_HP * 0.4);
      }
    },
    onPing: ({ x, y, from }) => {
      const s = stateRef.current;
      if (!s) return;
      if (!s.activePings) s.activePings = [];
      s.activePings.push({ x, y, from, ts: Date.now() });
    },
    onWaveSummary: (data) => {
      setWaveSummary(data);
      setTimeout(() => setWaveSummary(null), 6000);
    },
    onRestart: ({ seed, swap }) => {
      // Protector triggered a restart — tell parent so index.jsx can remount
      // with the correct new role and seed
      if (!stateRef.current) return;
      const currentWave = stateRef.current?.waveNumber ?? 0;
      const standing    = stateRef.current?.buildings?.filter(b => b.hp > 0).length ?? 0;
      const total       = stateRef.current?.buildings?.length ?? 0;
      onGameOver({
        waveReached: currentWave, standing, total,
        enemiesKilled: stateRef.current?.enemies?.filter(e => e.dead).length ?? 0,
        _restart: true, _seed: seed, _swap: swap,
      });
    },
  }).current;

  const { sendP2Move, sendBuildingPlace, sendChat, sendWorkerAssign, sendPlayerReady, sendGoldUpdate, sendRevive, sendPing } =
    useStrongholdRoom(room?.id ?? null, handlers);

  // ── State init ────────────────────────────────────────────────────────────
  function initState() {
    const map = createInitialMap();
    const bx = WORLD / 2 - 200, by = WORLD / 2 - 200;
    const workerWander = Array.from({ length: TOWNSPEOPLE_START }, (_, i) => ({
      x: bx + Math.cos((i / TOWNSPEOPLE_START) * Math.PI * 2) * 22,
      y: by + Math.sin((i / TOWNSPEOPLE_START) * Math.PI * 2) * 22,
      phaseX:  Math.random() * Math.PI * 2,
      phaseY:  Math.random() * Math.PI * 2,
      radiusX: 16 + Math.random() * 20,
      radiusY: 14 + Math.random() * 18,
      speed:   0.6 + Math.random() * 0.5,
    }));
    return {
      builder:         { x: bx, y: by },
      protectorPos:    { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
      protectorTarget: { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
      buildings:       map.buildings,
      enemies: [], units: [],
      phase: "build", waveNumber: 0,
      cam: { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },
      chatMessages: [], nextBuildingId: 1,
      gold: STARTING_GOLD, townspeople: TOWNSPEOPLE_START,
      builderHp: BUILDER_TOTAL_MAX_HP,
      protectorHp: PROTECTOR_MAX_HP,
      lockedWorkers: 0,
      workerWander,
      activePings: [],
      upgrades: [],
    };
  }

  function worldToCanvas(wx, wy) {
    const cam = stateRef.current?.cam ?? { x: 0, y: 0 };
    return { cx: wx - cam.x, cy: wy - cam.y };
  }
  function canvasToWorld(cx, cy) {
    const cam = stateRef.current?.cam ?? { x: 0, y: 0 };
    return { wx: cx + cam.x, wy: cy + cam.y };
  }

  // ── Shared placement / tap logic ──────────────────────────────────────────
  function handleTap(screenX, screenY) {
    const state = stateRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;

    // Minimap tap → ping
    const MM = 90, pad = 10;
    const mx = W - MM - pad, my = pad;
    if (screenX >= mx && screenX <= mx + MM && screenY >= my && screenY <= my + MM) {
      const worldX = ((screenX - mx) / MM) * WORLD;
      const worldY = ((screenY - my) / MM) * WORLD;
      if (!state.activePings) state.activePings = [];
      state.activePings.push({ x: worldX, y: worldY, from: "p2", ts: Date.now() });
      sendPing(worldX, worldY, "p2");
      return;
    }

    const { wx, wy } = canvasToWorld(screenX, screenY);

    // Check building tap for worker assignment (any phase)
    for (const b of state.buildings) {
      if (b.hp <= 0) continue;
      const def = BUILDING_TYPES[b.type];
      if (dist(wx, wy, b.x, b.y) < def.radius + 12) {
        setAssignPanel({ buildingId: b.id, screenX, screenY });
        return;
      }
    }

    setAssignPanel(null);

    // Place building
    if ((state.phase !== "build" && state.phase !== "breather") || !selectedTypeRef.current) {
      // World tap with no building selected → ping
      if (!selectedTypeRef.current) {
        doPing(state, wx, wy);
      }
      return;
    }
    const placeRange = BASE_PLACE_RANGE + ((state.upgrades ?? []).includes("place_range") ? BUILDER_PLACE_RANGE_BONUS : 0);
    if (dist(state.builder.x, state.builder.y, wx, wy) > placeRange) {
      // Out of range tap → ping
      doPing(state, wx, wy);
      return;
    }

    const def  = BUILDING_TYPES[selectedTypeRef.current];
    const cost = def.cost ?? 0;
    if (state.gold < cost) return;

    const building = {
      id: state.nextBuildingId++,
      type: selectedTypeRef.current,
      x: wx, y: wy,
      hp: def.maxHp, maxHp: def.maxHp,
      workers: 0,
    };
    // (applyConstructionAura no-op — overheal happens via direct repair now)
    state.buildings.push(building);
    state.gold -= cost;
    sendBuildingPlace(building);
    sendGoldUpdate({ gold: state.gold, from: "builder" });
    sfxPlaceBuilding();
    setGold(state.gold);
  }

  // Mouse click on desktop
  function handleCanvasClick(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    handleTap(e.clientX - rect.left, e.clientY - rect.top);
  }

  // ── Worker assignment ─────────────────────────────────────────────────────
  function adjustWorkers(buildingId, delta) {
    const s = stateRef.current;
    if (!s) return;
    const b = s.buildings.find(b => b.id === buildingId);
    if (!b) return;
    const totalAssigned = s.buildings.reduce((sum, b) => sum + (b.workers ?? 0), 0);
    const lockedWorkers = s.lockedWorkers ?? 0;
    const free = s.townspeople - totalAssigned - lockedWorkers;
    // Adding to barracks is blocked while any workers are locked (grieving)
    if (delta > 0 && b.type === "barracks" && lockedWorkers > 0) return;
    if (delta > 0 && free <= 0) return;
    if (delta < 0 && (b.workers ?? 0) <= 0) return;
    b.workers = Math.max(0, (b.workers ?? 0) + delta);
    sendWorkerAssign(buildingId, b.workers);
    forceUpdate(n => n + 1);
  }

  // ── Sell building ──────────────────────────────────────────────────────────
  function handleSell(buildingId) {
    const s = stateRef.current;
    if (!s) return;
    const b = s.buildings.find(b => b.id === buildingId);
    if (!b || b.type === "town_center") return;
    const { buildings: newBuildings, gold: newGold, refund } = sellBuilding(buildingId, s.buildings, s.gold, s.upgrades ?? []);
    s.buildings = newBuildings;
    s.gold = newGold;
    sendGoldUpdate({ gold: s.gold, from: "builder" });
    setGold(s.gold);
    setAssignPanel(null);
    forceUpdate(n => n + 1);
  }

  // ── Ping helper ────────────────────────────────────────────────────────────
  function doPing(state, worldX, worldY) {
    if (!state.activePings) state.activePings = [];
    const now = Date.now();
    const recent = state.activePings.find(p => p.from === "p2" && now - p.ts < 1000);
    if (recent) return;
    state.activePings.push({ x: worldX, y: worldY, from: "p2", ts: now });
    sendPing(worldX, worldY, "p2");
  }

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
    const canvas = canvasRef.current;
    const rect   = canvas?.getBoundingClientRect();
    for (const touch of e.changedTouches) {
      joystickTouchIds.current.delete(touch.identifier);
      const result = joystickTouchEnd(joystickRef.current, touch);
      if (result && result.wasTap && rect) {
        handleTap(result.x - rect.left, result.y - rect.top);
      }
    }
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function draw(ctx, state, t, W, H) {
    const { cam, builder, protectorPos, buildings, enemies, units } = state;

    ctx.fillStyle = "#0a0d0f";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = state.phase === "wave"
      ? `rgba(200,40,40,${0.04 + 0.04 * Math.sin(t * 3)})`
      : "rgba(255,255,255,0.04)";
    ctx.lineWidth = state.phase === "wave" ? 8 : 1;
    ctx.strokeRect(-cam.x, -cam.y, WORLD, WORLD);

    // Placement preview ring
    if ((state.phase === "build" || state.phase === "breather") && selectedTypeRef.current) {
      const { cx, cy } = worldToCanvas(builder.x, builder.y);
      const placeRange = BASE_PLACE_RANGE + ((state.upgrades ?? []).includes("place_range") ? BUILDER_PLACE_RANGE_BONUS : 0);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, placeRange, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,200,255,0.5)"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }

    // Garden slow zones
    buildings.forEach(b => {
      if (b.type !== "garden" || b.hp <= 0) return;
      const { cx, cy } = worldToCanvas(b.x, b.y);
      ctx.save(); ctx.globalAlpha = 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, BUILDING_TYPES.garden.slowRadius + (b.workers ?? 0) * 10, 0, Math.PI * 2);
      ctx.fillStyle = "#66dd88"; ctx.fill(); ctx.restore();
    });

    // Repair shop range rings
    buildings.forEach(b => {
      if (b.type !== "repair_shop" || b.hp <= 0) return;
      const { cx, cy } = worldToCanvas(b.x, b.y);
      const def     = BUILDING_TYPES.repair_shop;
      const workers = b.workers ?? 0;
      const radius  = def.repairRadius + workers * 20;
      const builderIn = dist(builder.x, builder.y, b.x, b.y) < def.radius + 20;
      ctx.save();
      ctx.globalAlpha = builderIn ? 0.07 : 0.04;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#66bbff"; ctx.fill();
      ctx.globalAlpha = builderIn ? 0.35 : 0.15;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#66bbff"; ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 18; ctx.stroke();
      ctx.setLineDash([]);
      if (builderIn) {
        ctx.globalAlpha = 0.5;
        ctx.font = "9px sans-serif"; ctx.fillStyle = "#66bbff"; ctx.textAlign = "center";
        ctx.fillText("repair aoe active", cx, cy - def.radius - 10);
      }
      ctx.restore();
    });

    buildings.forEach(b => drawBuilding(ctx, b, t, W, H));

    units.forEach(u => {
      const { cx, cy } = worldToCanvas(u.x, u.y);
      const hpFrac = Math.max(0, (u.hp ?? 1) / (u.maxHp ?? 1));
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = hpFrac > 0.5 ? "#ff9966" : "#ff4444"; ctx.fill(); ctx.restore();
      if (hpFrac < 1) {
        ctx.save(); ctx.globalAlpha = 0.7;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(cx - 7, cy - 9, 14, 2.5);
        ctx.fillStyle = hpFrac > 0.5 ? "#88ff88" : "#ff5555";
        ctx.fillRect(cx - 7, cy - 9, 14 * hpFrac, 2.5);
        ctx.restore();
      }
    });

    enemies.forEach(e => {
      const { cx, cy } = worldToCanvas(e.x, e.y);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, e.radius ?? 7, 0, Math.PI * 2);
      const fill = e.type === "demolisher"
        ? (e.chasingBuilder ? "#cc44ff" : "#7722cc")
        : e.chasingBuilder ? "#ff44aa" : "#cc2222";
      ctx.fillStyle = fill; ctx.fill();
      if (e.type === "demolisher") {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
        const r = (e.radius ?? 13) * 0.4;
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
      }
      ctx.restore();
    });

    // Free workers wandering around builder
    if (state.workerWander) {
      const totalAssigned = state.buildings.reduce((s, b) => s + (b.workers ?? 0), 0);
      const freeCount = Math.max(0, state.townspeople - totalAssigned);
      state.workerWander.forEach((w, i) => {
        if (i >= freeCount) return;
        const { cx: tpx, cy: tpy } = worldToCanvas(w.x, w.y);
        const pulse = 0.55 + 0.2 * Math.sin(t * 2.2 + i * 1.3);
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(tpx, tpy, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,200,100,0.08)"; ctx.fill();
        ctx.beginPath(); ctx.arc(tpx, tpy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,190,80,0.85)"; ctx.fill();
        ctx.restore();
      });
      if (freeCount > 0 && (state.phase === "build" || state.phase === "breather")) {
        const { cx: bpxL, cy: bpyL } = worldToCanvas(builder.x, builder.y);
        ctx.save(); ctx.globalAlpha = 0.3;
        ctx.font = "10px sans-serif"; ctx.fillStyle = "rgba(255,200,100,0.9)"; ctx.textAlign = "center";
        ctx.fillText(`${freeCount} free`, bpxL, bpyL - 26);
        ctx.restore();
      }
    }

    // Protector dot — with revive ring when downed
    const { cx: ppx, cy: ppy } = worldToCanvas(protectorPos.x, protectorPos.y);
    ctx.save();
    if ((state.protectorHp ?? PROTECTOR_MAX_HP) <= 0 && state.phase === "wave") {
      const pulse = 0.5 + 0.3 * Math.sin(t * 5);
      ctx.globalAlpha = pulse * 0.5;
      ctx.beginPath(); ctx.arc(ppx, ppy, REVIVE_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,100,60,0.9)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = pulse * 0.1;
      ctx.beginPath(); ctx.arc(ppx, ppy, REVIVE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,100,60,1)"; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(ppx, ppy, 11 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.1)"; ctx.fill();
    ctx.beginPath(); ctx.arc(ppx, ppy, 6, 0, Math.PI * 2);
    ctx.fillStyle = (state.protectorHp ?? PROTECTOR_MAX_HP) <= 0 ? "rgba(255,100,60,0.3)" : "rgba(255,100,60,0.9)"; ctx.fill();
    ctx.restore();

    // Builder dot
    const { cx: bpx, cy: bpy } = worldToCanvas(builder.x, builder.y);
    ctx.save();
    const inDanger = enemies.some(e => e.chasingBuilder);
    if (inDanger) {
      ctx.beginPath(); ctx.arc(bpx, bpy, 18 + 4 * Math.sin(t * 8), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,60,180,${0.1 + 0.08 * Math.sin(t * 8)})`; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(bpx, bpy, 12 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.arc(bpx, bpy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.95)"; ctx.fill();
    ctx.restore();

    // Ping markers
    if (state.activePings) {
      state.activePings = state.activePings.filter(p => Date.now() - p.ts < 3000);
      state.activePings.forEach(p => {
        const age = (Date.now() - p.ts) / 1000;
        const { cx: px, cy: py } = worldToCanvas(p.x, p.y);
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
    }

    drawHUD(ctx, state, t, W, H);
    drawMinimap(ctx, state, t, W, H);
    drawJoystick(ctx, joystickRef.current);
  }

  // ── Builder minimap ────────────────────────────────────────────────────────
  function drawMinimap(ctx, state, t, W, H) {
    const MM = 90, pad = 10;
    const mx = W - MM - pad, my = pad;
    const scale = MM / WORLD;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#0a0d0f";
    ctx.roundRect(mx, my, MM, MM, 6); ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.5;
    ctx.roundRect(mx, my, MM, MM, 6); ctx.stroke();
    ctx.globalAlpha = 0.7;
    state.buildings.forEach(b => {
      if (b.hp <= 0) return;
      const def = BUILDING_TYPES[b.type];
      ctx.beginPath(); ctx.arc(mx + b.x * scale, my + b.y * scale, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = def.color; ctx.fill();
    });
    // Pings
    if (state.activePings) {
      state.activePings.forEach(p => {
        const age = (Date.now() - p.ts) / 1000;
        if (age > 3) return;
        ctx.globalAlpha = Math.max(0, 1 - age / 3) * 0.9;
        ctx.beginPath(); ctx.arc(mx + p.x * scale, my + p.y * scale, 3 + age * 2, 0, Math.PI * 2);
        ctx.strokeStyle = p.from === "p1" ? "rgba(255,100,60,1)" : "rgba(120,200,255,1)";
        ctx.lineWidth = 1; ctx.stroke();
      });
    }
    ctx.globalAlpha = 0.55;
    state.enemies.forEach(e => {
      if (e.dead) return;
      ctx.beginPath(); ctx.arc(mx + e.x * scale, my + e.y * scale, e.type === "demolisher" ? 2 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = e.type === "demolisher" ? "#cc44ff" : "#cc2222"; ctx.fill();
    });
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(mx + state.protectorPos.x * scale, my + state.protectorPos.y * scale, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,1)"; ctx.fill();
    ctx.beginPath(); ctx.arc(mx + state.builder.x * scale, my + state.builder.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.9)"; ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.font = "8px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText("tap to ping", mx + MM / 2, my + MM + 9);
    ctx.restore();
  }

  function drawBuilding(ctx, b, t, W, H) {
    const def = BUILDING_TYPES[b.type];
    const { cx, cy } = worldToCanvas(b.x, b.y);
    if (cx < -60 || cx > W + 60 || cy < -60 || cy > H + 60) return;
    const hpPct = b.hp / b.maxHp;

    drawBuildingIllustrated(ctx, b, cx, cy, t);

    if (b._beingRepaired && b.hp > 0 && b.hp < b.maxHp) {
      ctx.save();
      const pulse = 0.4 + 0.3 * Math.sin(t * 6);
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.arc(cx, cy, def.radius + 8 + 3 * Math.sin(t * 6), 0, Math.PI * 2);
      ctx.strokeStyle = "#88ffbb"; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = pulse * 0.3;
      ctx.beginPath(); ctx.arc(cx, cy, def.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = "#88ffbb"; ctx.fill();
      ctx.restore();
    }

    if (b.hp > 0 && hpPct < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
      ctx.strokeStyle = hpPct > 0.5 ? "rgba(100,255,100,0.7)" : hpPct > 0.25 ? "rgba(255,200,60,0.8)" : "rgba(255,60,60,0.9)";
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }

    // Overheal arc — gold ring segment beyond the normal hp arc
    if (b.hp > 0 && b.hp > b.maxHp) {
      const overhealFrac = Math.min((b.hp - b.maxHp) / (b.maxHp * 0.15), 1); // 0..1 representing 100%→115%
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, def.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * overhealFrac);
      ctx.strokeStyle = `rgba(255,215,0,${0.6 + 0.2 * Math.sin(t * 3)})`;
      ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    if (b.hp > 0) {
      const workers = b.workers ?? 0;
      for (let i = 0; i < workers; i++) {
        const angle = (i / Math.max(workers, 1)) * Math.PI * 2 - Math.PI / 2 + t * 0.4;
        const wx = cx + Math.cos(angle) * (def.radius + 11);
        const wy = cy + Math.sin(angle) * (def.radius + 11);
        ctx.save(); ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,220,255,0.8)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(120,180,255,0.4)"; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.font = "10px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(def.label, cx, cy + def.radius + 16);
      ctx.restore();
    }
  }

  function drawHUD(ctx, state, t, W, H) {
    const { phase, waveNumber, gold, townspeople, builderHp } = state;
    ctx.save();
    ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
    let label = "";
    if (phase === "build")      label = waveNumber === 0 ? "plan your stronghold" : "build phase";
    else if (phase === "countdown") label = `wave ${waveNumber + 1} incoming…`;
    else if (phase === "wave")  label = `wave ${waveNumber}`;
    else if (phase === "breather") label = `next wave in ${countdown}s`;
    ctx.fillText(label, W / 2, 28);

    if (phase === "breather") {
      ctx.globalAlpha = 0.15; ctx.fillStyle = "#ff4444";
      ctx.fillRect(0, 0, W * (1 - countdown / 45), 3);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,215,0,0.7)"; ctx.font = "13px sans-serif";
    ctx.fillText(`${Math.floor(gold)} g`, W - 14, H - 18);

    const assigned = state.buildings.reduce((s, b) => s + (b.workers ?? 0), 0);
    const locked   = state.lockedWorkers ?? 0;
    const free     = state.townspeople - assigned - locked;
    ctx.fillStyle = "rgba(180,220,255,0.4)"; ctx.font = "11px sans-serif";
    ctx.fillText(`${free} free${locked > 0 ? ` / ${locked} grieving` : ""} / ${state.townspeople} people`, W - 14, H - 36);

    const hpFrac    = Math.max(0, Math.min(builderHp, PROTECTOR_MAX_HP)) / PROTECTOR_MAX_HP;
    const shieldFrac = Math.max(0, (builderHp - PROTECTOR_MAX_HP)) / (BUILDER_TOTAL_MAX_HP - PROTECTOR_MAX_HP);
    const barW = 80;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.roundRect(14, H - 28, barW, 5, 3); ctx.fill();
    // Base HP (blue)
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(120,200,255,0.7)" : "rgba(255,100,100,0.8)";
    ctx.roundRect(14, H - 28, barW * hpFrac, 5, 3); ctx.fill();
    // Shield on top (bright cyan, separate bar above)
    if (shieldFrac > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.roundRect(14, H - 36, barW, 3, 2); ctx.fill();
      ctx.fillStyle = "rgba(160,240,255,0.85)";
      ctx.roundRect(14, H - 36, barW * shieldFrac, 3, 2); ctx.fill();
    }
    ctx.textAlign = "left";
    if (builderHp <= 0 && phase === "wave") {
      ctx.fillStyle = "rgba(255,80,80,0.7)"; ctx.font = "10px sans-serif";
      ctx.fillText("DOWN — walk to revive", 14, H - 40);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "10px sans-serif";
      const shieldHp = Math.max(0, builderHp - PROTECTOR_MAX_HP);
      ctx.fillText(`${Math.ceil(Math.min(builderHp, PROTECTOR_MAX_HP))} hp${shieldHp > 0 ? ` + ${Math.ceil(shieldHp)} shield` : ""}`, 14, H - 40);
    }

    ctx.fillStyle = "rgba(120,200,255,0.25)"; ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("BUILDER", W - 14, 20);

    // Protector down indicator
    if ((state.protectorHp ?? PROTECTOR_MAX_HP) <= 0 && phase === "wave") {
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,100,60,0.6)";
      ctx.font = "10px sans-serif";
      ctx.fillText("protector down — walk near to revive", W - 14, H - 50);
    }

    ctx.restore();
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  function loop(ts) {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const ctx   = canvas.getContext("2d");
    const W     = canvas.width, H = canvas.height;
    const state = stateRef.current;
    const dt    = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = ts;

    const builderDown = (state.builderHp ?? PROTECTOR_MAX_HP) <= 0;

    const keys = keysRef.current;
    const joy  = joystickRef.current;
    let vx = 0, vy = 0;
    if (!builderDown) {
      if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) vx -= 1;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) vx += 1;
      if (keys["ArrowUp"]    || keys["w"] || keys["W"]) vy -= 1;
      if (keys["ArrowDown"]  || keys["s"] || keys["S"]) vy += 1;
      if (joy.active) { vx += joy.vec.x; vy += joy.vec.y; }
    }
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      state.builder.x = Math.max(20, Math.min(WORLD - 20, state.builder.x + (vx / len) * BUILDER_SPEED * dt));
      state.builder.y = Math.max(20, Math.min(WORLD - 20, state.builder.y + (vy / len) * BUILDER_SPEED * dt));
    }

    if (!builderDown && ts - lastMoveRef.current > MOVE_THROTTLE) {
      sendP2Move(state.builder.x, state.builder.y);
      lastMoveRef.current = ts;
    }

    const camTargetX = state.builder.x - W / 2;
    const camTargetY = state.builder.y - H / 2;
    state.cam.x = lerp(state.cam.x, camTargetX, 0.08);
    state.cam.y = lerp(state.cam.y, camTargetY, 0.08);
    state.protectorPos.x = lerp(state.protectorPos.x, state.protectorTarget.x, 0.18);
    state.protectorPos.y = lerp(state.protectorPos.y, state.protectorTarget.y, 0.18);

    if (state.workerWander) {
      const totalAssigned = state.buildings.reduce((s, b) => s + (b.workers ?? 0), 0);
      const freeCount = Math.max(0, state.townspeople - totalAssigned);
      state.workerWander.forEach((w, i) => {
        if (i >= freeCount) return;
        const targetX = state.builder.x + Math.sin(ts * 0.001 * w.speed + w.phaseX) * w.radiusX;
        const targetY = state.builder.y + Math.cos(ts * 0.001 * w.speed * 0.7 + w.phaseY) * w.radiusY;
        w.x = lerp(w.x, targetX, 0.04);
        w.y = lerp(w.y, targetY, 0.04);
      });
    }

    const nowInDanger = !builderDown && state.enemies.some(e => e.chasingBuilder);
    if (nowInDanger && !state._wasDangerous) sfxBuilderDanger();
    state._wasDangerous = nowInDanger;

    // Builder revives downed protector by walking near them during a wave
    if (state.phase === "wave") {
      const protectorDown = (state.protectorHp ?? PROTECTOR_MAX_HP) <= 0;
      if (protectorDown && !builderDown) {
        const dToProtector = dist(state.builder.x, state.builder.y, state.protectorPos.x, state.protectorPos.y);
        if (dToProtector < REVIVE_RADIUS) {
          state.protectorHp = Math.floor(PROTECTOR_MAX_HP * 0.4);
          sendRevive("protector");
        }
      }
    }

    draw(ctx, state, ts / 1000, W, H);
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);
    stateRef.current = initState();
    rafRef.current   = requestAnimationFrame(loop);
    initAudio();
    setMood("cozy");

    function onKeyDown(e) {
      keysRef.current[e.key] = true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    }
    function onKeyUp(e) { keysRef.current[e.key] = false; }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

    canvas.addEventListener("touchstart",  onTouchStart, { passive: true  }); // passive until drag confirmed
    canvas.addEventListener("touchmove",   onTouchMove,  { passive: false }); // may need to block scroll
    canvas.addEventListener("touchend",    onTouchEnd,   { passive: true  });
    canvas.addEventListener("touchcancel", onTouchEnd,   { passive: true  });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize",  resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      canvas.removeEventListener("touchstart",  onTouchStart);
      canvas.removeEventListener("touchmove",   onTouchMove);
      canvas.removeEventListener("touchend",    onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [room]);

  const inBuildPhase = phase === "build" || phase === "breather";
  const canPlace     = inBuildPhase && !!selectedType;
  const selectedDef  = selectedType ? BUILDING_TYPES[selectedType] : null;
  const showReadyUp  = phase === "build" && waveNumber === 0;

  const panelBuilding = assignPanel ? stateRef.current?.buildings.find(b => b.id === assignPanel.buildingId) : null;
  const totalAssigned = stateRef.current ? stateRef.current.buildings.reduce((s, b) => s + (b.workers ?? 0), 0) : 0;
  const lockedWorkers = stateRef.current?.lockedWorkers ?? 0;
  const freeWorkers   = townspeople - totalAssigned - lockedWorkers;
  const canAddToBarracks = (panelBuilding?.type === "barracks") ? lockedWorkers === 0 : true;

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0d0f", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", touchAction: "pan-y" }}>
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: "100%", display: "block", touchAction: "pan-y", cursor: canPlace ? "crosshair" : "pointer" }}
        onClick={handleCanvasClick}
      />

      {/* Building description tooltip — floats above the bar, never pushes layout */}
      {inBuildPhase && selectedDef && (
        <div style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "min(340px, 90vw)",
          background: "rgba(10,13,15,0.92)",
          border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          textAlign: "center",
          lineHeight: 1.5,
          pointerEvents: "none",
          zIndex: 5,
          backdropFilter: "blur(4px)",
          whiteSpace: "normal",
        }}>
          <span style={{ color: selectedDef.color, fontWeight: 500 }}>{selectedDef.label}</span>
          {" — "}{selectedDef.description}
          {canPlace && (
            <span style={{ color: "rgba(120,200,255,0.5)", display: "block", fontSize: 10, marginTop: 2 }}>
              tap within range to place
            </span>
          )}
        </div>
      )}

      {/* Building selector — outside canvas, scrolls freely */}
      {inBuildPhase && (
        <div style={{
          background: "rgba(10,13,15,0.95)",
          borderTop:  "0.5px solid rgba(255,255,255,0.06)",
          padding:    "10px 0 env(safe-area-inset-bottom, 10px)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 8, overflowX: "auto", padding: "0 12px",
            scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-x",
          }}>
            {PLACEABLE_BUILDINGS.map(b => {
              const affordable = gold >= (b.cost ?? 0);
              const isSelected = selectedType === b.id;
              return (
                <button key={b.id} onClick={() => setSelectedType(isSelected ? null : b.id)} style={{
                  flexShrink: 0,
                  background:   isSelected ? `rgba(${hexToRgb(b.color)},0.15)` : "rgba(255,255,255,0.03)",
                  border:       `1px solid ${isSelected ? b.color : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12,
                  color:        isSelected ? b.color : affordable ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
                  fontSize: 12, padding: "10px 14px", minHeight: 48, minWidth: 80,
                  cursor: affordable ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap", transition: "all 0.12s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <span>{b.label}</span>
                  <span style={{ opacity: 0.55, fontSize: 10 }}>{b.cost}g</span>
                </button>
              );
            })}

            {showReadyUp && (
              <button onClick={() => { if (!ready) { setReady(true); sendPlayerReady("p2"); } }} style={{
                flexShrink: 0, padding: "10px 18px", borderRadius: 12,
                minHeight: 48, minWidth: 90, fontSize: 12,
                background: ready ? "rgba(120,255,120,0.08)" : "rgba(120,200,255,0.08)",
                border: `1px solid ${ready ? "rgba(120,255,120,0.3)" : "rgba(120,200,255,0.25)"}`,
                color:  ready ? "rgba(120,255,120,0.7)" : "rgba(120,200,255,0.9)",
                cursor: ready ? "default" : "pointer", letterSpacing: "0.04em", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ready ? "ready ✓" : "ready up"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Worker assignment panel */}
      {assignPanel && panelBuilding && panelBuilding.hp > 0 && (
        <div onClick={() => setAssignPanel(null)} style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: "absolute",
            left: Math.min(assignPanel.screenX - 94, window.innerWidth - 210),
            top:  Math.max(assignPanel.screenY - 130, 10),
            width: 200, background: "#0f1316",
            border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: BUILDING_TYPES[panelBuilding.type]?.color, marginBottom: 6 }}>
              {BUILDING_TYPES[panelBuilding.type]?.label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 10, lineHeight: 1.5 }}>
              {BUILDING_TYPES[panelBuilding.type]?.description}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>workers assigned</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap", minHeight: 14 }}>
              {Array.from({ length: panelBuilding.workers ?? 0 }).map((_, i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(180,220,255,0.65)", border: "0.5px solid rgba(180,220,255,0.35)" }} />
              ))}
              {Array.from({ length: lockedWorkers }).map((_, i) => (
                <div key={`l${i}`} title="grieving — unavailable until breather" style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,80,80,0.5)", border: "0.5px solid rgba(255,80,80,0.4)" }} />
              ))}
              {Array.from({ length: Math.max(0, townspeople - (panelBuilding.workers ?? 0) - lockedWorkers) }).map((_, i) => (
                <div key={`e${i}`} style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => adjustWorkers(panelBuilding.id, -1)} style={{
                width: 36, height: 36, borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 20,
                cursor: "pointer", opacity: (panelBuilding.workers ?? 0) > 0 ? 1 : 0.3,
              }}>−</button>
              <span style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.8)", minWidth: 20, textAlign: "center" }}>
                {panelBuilding.workers ?? 0}
              </span>
              <button onClick={() => adjustWorkers(panelBuilding.id, 1)} style={{
                width: 36, height: 36, borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 20,
                cursor: "pointer", opacity: (freeWorkers > 0 && canAddToBarracks) ? 1 : 0.3,
              }}>+</button>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 2 }}>{freeWorkers} free</span>
            </div>
            {lockedWorkers > 0 && panelBuilding.type === "barracks" && (
              <div style={{ fontSize: 10, color: "rgba(255,100,100,0.55)", marginTop: 8, lineHeight: 1.4 }}>
                {lockedWorkers} grieving — available at breather
              </div>
            )}
            {/* Sell button — only in build/breather phase, not for town center */}
            {inBuildPhase && panelBuilding.type !== "town_center" && (
              <button onClick={() => handleSell(panelBuilding.id)} style={{
                marginTop: 12, width: "100%", padding: "8px", borderRadius: 8,
                background: "rgba(255,60,60,0.06)", border: "0.5px solid rgba(255,60,60,0.2)",
                color: "rgba(255,100,80,0.7)", fontSize: 11, cursor: "pointer", letterSpacing: "0.04em",
              }}>
                sell ({Math.floor((stateRef.current?.upgrades ?? []).includes("sell_refund") ? 75 : 50)}% refund)
              </button>
            )}
            <div onClick={() => setAssignPanel(null)} style={{ position: "absolute", top: 8, right: 10, fontSize: 20, color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}>×</div>
          </div>
        </div>
      )}

      {/* Wave summary card */}
      {waveSummary && (
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
    </div>
  );
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}