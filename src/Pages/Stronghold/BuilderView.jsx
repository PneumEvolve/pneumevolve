// src/Pages/Stronghold/BuilderView.jsx
import { drawBuilding as drawBuildingIllustrated } from "./drawBuildings";
import { initAudio, setMood, sfxPlaceBuilding, sfxWorkerDeath, sfxBuilderDanger } from "./audio";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useStrongholdRoom } from "./useStrongholdRoom";
import {
  WORLD, BUILDING_TYPES, PLACEABLE_BUILDINGS,
  STARTING_GOLD, TOWNSPEOPLE_START, PROTECTOR_MAX_HP,
  createInitialMap, lerp, dist, calcTownspeople, clampWorkers,
} from "./strongholdEngine";

const BUILDER_SPEED  = 150;
const PLACE_RANGE    = 80;
const MOVE_THROTTLE  = 50;

export default function BuilderView({ room, onGameOver }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef(null);
  const keysRef     = useRef({});
  const joystickRef = useRef({ active: false, vec: { x: 0, y: 0 }, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } });
  const rafRef      = useRef(null);
  const lastMoveRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const [phase,             setPhase]             = useState("build");
  const [waveNumber,        setWaveNumber]         = useState(0);
  const [selectedType,      setSelectedType]       = useState(null);
  const [hasPlacedThisRound,setHasPlacedThisRound] = useState(false);
  const [countdown,         setCountdown]          = useState(0);
  const [chatInput,         setChatInput]          = useState("");
  const [chatLog,           setChatLog]            = useState([]);
  const [gold,              setGold]               = useState(STARTING_GOLD);
  const [townspeople,       setTownspeople]        = useState(TOWNSPEOPLE_START);
  const [assignPanel,       setAssignPanel]        = useState(null); // { buildingId, x, y }
  const [, forceUpdate]                            = useState(0);

  const handlers = useRef({
    onP1Move: ({ x, y }) => {
      if (!stateRef.current) return;
      stateRef.current.protectorTarget = { x, y };
    },
    onBuildingHealth: ({ buildings }) => {
      if (!stateRef.current) return;
      buildings.forEach(({ id, hp, workers }) => {
        const b = stateRef.current.buildings.find(b => b.id === id);
        if (b) { b.hp = hp; if (workers !== undefined) b.workers = workers; }
      });
    },
    onEnemyUpdate: ({ enemies }) => {
      if (!stateRef.current) return;
      stateRef.current.enemies = enemies;
    },
    onUnitUpdate: ({ units }) => {
      if (!stateRef.current) return;
      stateRef.current.units = units;
    },
    onGoldUpdate: ({ gold }) => {
      if (!stateRef.current) return;
      stateRef.current.gold = gold;
      setGold(gold);
    },
    onPhaseChange: ({ phase, waveNumber, won, gold, townspeople: tp, bonusGold }) => {
      if (!stateRef.current) return;
      stateRef.current.phase = phase;
      setPhase(phase);
      if (waveNumber !== undefined) { stateRef.current.waveNumber = waveNumber; setWaveNumber(waveNumber); }
      if (gold !== undefined) { stateRef.current.gold = gold; setGold(gold); }
      if (tp !== undefined) {
        stateRef.current.townspeople = tp;
        // Clamp assigned workers in case homes were lost
        clampWorkers(stateRef.current.buildings, tp);
        setTownspeople(tp);
      }
      if (phase === "breather") {
        stateRef.current.hasPlacedThisRound = false;
        setHasPlacedThisRound(false);
        setSelectedType(null);
        setMood("cozy");
      }
      if (phase === "wave") { setAssignPanel(null); setMood("tense"); }
      if (phase === "gameover") { setMood(null); onGameOver({ won }); }
    },
    onCountdown: ({ seconds }) => {
      setCountdown(Math.ceil(seconds));
    },
    onChat: ({ text, from }) => {
      const msg = { text, from, ts: Date.now() };
      stateRef.current?.chatMessages?.unshift(msg);
      setChatLog(prev => [msg, ...prev].slice(0, 20));
    },
  }).current;

  const { sendP2Move, sendBuildingPlace, sendChat, sendWorkerAssign } =
    useStrongholdRoom(room?.id ?? null, handlers);

  function initState() {
    const map = createInitialMap();
    return {
      builder:         { x: WORLD / 2 - 200, y: WORLD / 2 - 200 },
      protectorPos:    { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
      protectorTarget: { x: WORLD / 2 + 200, y: WORLD / 2 + 200 },
      buildings:       map.buildings,
      enemies:         [],
      units:           [],
      phase:           "build",
      waveNumber:      0,
      hasPlacedThisRound: false,
      cam:             { x: WORLD / 2 - 400, y: WORLD / 2 - 300 },
      chatMessages:    [],
      nextBuildingId:  1,
      gold:            STARTING_GOLD,
      townspeople:     TOWNSPEOPLE_START,
      builderHp:       PROTECTOR_MAX_HP,
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

  // ── Drawing ───────────────────────────────────────────────────────────────
  function draw(ctx, state, t, W, H) {
    const { cam, builder, protectorPos, buildings, enemies, units, gold, townspeople, builderHp } = state;

    ctx.fillStyle = "#0a0d0f";
    ctx.fillRect(0, 0, W, H);

    // World border — red during wave
    ctx.strokeStyle = state.phase === "wave" ? `rgba(200,40,40,${0.04 + 0.04 * Math.sin(t * 3)})` : "rgba(255,255,255,0.04)";
    ctx.lineWidth = state.phase === "wave" ? 8 : 1;
    ctx.strokeRect(-cam.x, -cam.y, WORLD, WORLD);

    // Placement preview ring
    if ((state.phase === "build" || state.phase === "breather") && selectedType) {
      const { cx, cy } = worldToCanvas(builder.x, builder.y);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, PLACE_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,200,255,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke();
      ctx.restore();
    }

    // Garden zones
    buildings.forEach(b => {
      if (b.type !== "garden" || b.hp <= 0) return;
      const { cx, cy } = worldToCanvas(b.x, b.y);
      ctx.save(); ctx.globalAlpha = 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, BUILDING_TYPES.garden.slowRadius + (b.workers ?? 0) * 10, 0, Math.PI * 2);
      ctx.fillStyle = "#66dd88"; ctx.fill(); ctx.restore();
    });

    // Buildings
    buildings.forEach(b => drawBuilding(ctx, b, t, W, H));

    // Units
    units.forEach(u => {
      const { cx, cy } = worldToCanvas(u.x, u.y);
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9966"; ctx.fill(); ctx.restore();
    });

    // Enemies
    enemies.forEach(e => {
      const { cx, cy } = worldToCanvas(e.x, e.y);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = e.chasingBuilder ? "#ff44aa" : "#cc2222"; ctx.fill();
      ctx.restore();
    });

    // Protector
    const { cx: ppx, cy: ppy } = worldToCanvas(protectorPos.x, protectorPos.y);
    ctx.save();
    ctx.beginPath(); ctx.arc(ppx, ppy, 11 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.1)"; ctx.fill();
    ctx.beginPath(); ctx.arc(ppx, ppy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,60,0.9)"; ctx.fill();
    ctx.restore();

    // Builder
    const { cx: bpx, cy: bpy } = worldToCanvas(builder.x, builder.y);
    ctx.save();
    // danger flash if enemies chasing
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

    // HUD
    drawHUD(ctx, state, t, W, H);
  }

  function drawBuilding(ctx, b, t, W, H) {
    const def = BUILDING_TYPES[b.type];
    const { cx, cy } = worldToCanvas(b.x, b.y);
    if (cx < -60 || cx > W + 60 || cy < -60 || cy > H + 60) return;
    const hpPct = b.hp / b.maxHp;

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
    const { phase, waveNumber, gold, townspeople, builderHp } = state;
    ctx.save();
    ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
    let label = "";
    if (phase === "build") label = waveNumber === 0 ? "plan your stronghold" : "build phase";
    else if (phase === "countdown") label = `wave ${waveNumber + 1} incoming in ${countdown}…`;
    else if (phase === "wave") label = `wave ${waveNumber} / 3`;
    else if (phase === "breather") label = `next wave in ${countdown}s`;
    ctx.fillText(label, W / 2, 28);

    // Breather progress bar (counts down — fills from left as time runs out)
    if (phase === "breather") {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(0, 0, W * (1 - countdown / 45), 3);
      ctx.globalAlpha = 1;
    }

    // Gold
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,215,0,0.7)"; ctx.font = "13px sans-serif";
    ctx.fillText(`${Math.floor(gold)} g`, W - 14, H - 18);

    // Townspeople pool dots
    const total = state.townspeople;
    const assigned = state.buildings.reduce((s, b) => s + (b.workers ?? 0), 0);
    const free = total - assigned;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(180,220,255,0.4)"; ctx.font = "11px sans-serif";
    ctx.fillText(`${free} free / ${total} people`, W - 14, H - 36);

    // Builder HP
    const hpFrac = Math.max(0, builderHp) / PROTECTOR_MAX_HP;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.roundRect(14, H - 28, 80, 5, 3); ctx.fill();
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(120,200,255,0.7)" : "rgba(255,100,100,0.8)";
    ctx.roundRect(14, H - 28, 80 * hpFrac, 5, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`${Math.ceil(builderHp)} hp`, 14, H - 32);

    // Builder label
    ctx.fillStyle = "rgba(120,200,255,0.25)"; ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("BUILDER", W - 14, 20);

    ctx.restore();
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  function loop(ts) {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const state = stateRef.current;
    const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = ts;

    const keys = keysRef.current;
    const joy  = joystickRef.current;
    let vx = 0, vy = 0;
    if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) vx -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) vx += 1;
    if (keys["ArrowUp"]    || keys["w"] || keys["W"]) vy -= 1;
    if (keys["ArrowDown"]  || keys["s"] || keys["S"]) vy += 1;
    if (joy.active) { vx += joy.vec.x; vy += joy.vec.y; }
    const len = Math.sqrt(vx*vx+vy*vy);
    if (len > 0) {
      state.builder.x = Math.max(20, Math.min(WORLD-20, state.builder.x + (vx/len)*BUILDER_SPEED*dt));
      state.builder.y = Math.max(20, Math.min(WORLD-20, state.builder.y + (vy/len)*BUILDER_SPEED*dt));
    }

    if (ts - lastMoveRef.current > MOVE_THROTTLE) {
      sendP2Move(state.builder.x, state.builder.y);
      lastMoveRef.current = ts;
    }

    const camTargetX = state.builder.x - W / 2;
    const camTargetY = state.builder.y - H / 2;
    state.cam.x = lerp(state.cam.x, camTargetX, 0.08);
    state.cam.y = lerp(state.cam.y, camTargetY, 0.08);
    state.protectorPos.x = lerp(state.protectorPos.x, state.protectorTarget.x, 0.18);
    state.protectorPos.y = lerp(state.protectorPos.y, state.protectorTarget.y, 0.18);

    // Danger sfx — fire once when an enemy first starts chasing builder
    const nowInDanger = state.enemies.some(e => e.chasingBuilder);
    if (nowInDanger && !state._wasDangerous) sfxBuilderDanger();
    state._wasDangerous = nowInDanger;

    draw(ctx, state, ts / 1000, W, H);
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Place building ────────────────────────────────────────────────────────
  function handleCanvasClick(e) {
    const state = stateRef.current;
    if (!state) return;

    // Assignment panel: tap a building
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const { wx, wy } = canvasToWorld(cx, cy);

    // Check building tap for assignment (any phase)
    for (const b of state.buildings) {
      if (b.hp <= 0) continue;
      const def = BUILDING_TYPES[b.type];
      if (dist(wx, wy, b.x, b.y) < def.radius + 12) {
        setAssignPanel({ buildingId: b.id, screenX: cx, screenY: cy });
        return;
      }
    }

    setAssignPanel(null);

    // Place building (build or breather phase)
    if ((state.phase !== "build" && state.phase !== "breather") || !selectedType || state.hasPlacedThisRound) return;
    if (dist(state.builder.x, state.builder.y, wx, wy) > PLACE_RANGE) return;

    const def = BUILDING_TYPES[selectedType];
    const cost = def.cost ?? 0;
    if (state.gold < cost) return;

    const building = {
      id:    state.nextBuildingId++,
      type:  selectedType,
      x:     wx, y: wy,
      hp:    def.maxHp, maxHp: def.maxHp,
      workers: 0,
    };
    state.buildings.push(building);
    state.gold -= cost;
    state.hasPlacedThisRound = true;
    sendBuildingPlace(building);
    sfxPlaceBuilding();
    setGold(state.gold);
    setHasPlacedThisRound(true);
    setSelectedType(null);
  }

  // ── Worker assignment ─────────────────────────────────────────────────────
  function adjustWorkers(buildingId, delta) {
    const s = stateRef.current;
    if (!s) return;
    const b = s.buildings.find(b => b.id === buildingId);
    if (!b) return;
    const totalAssigned = s.buildings.reduce((sum, b) => sum + (b.workers ?? 0), 0);
    const free = s.townspeople - totalAssigned;
    if (delta > 0 && free <= 0) return;
    if (delta < 0 && (b.workers ?? 0) <= 0) return;
    b.workers = Math.max(0, (b.workers ?? 0) + delta);
    sendWorkerAssign(buildingId, b.workers);
    forceUpdate(n => n + 1);
  }

  function handleChatSend() {
    const text = chatInput.trim();
    if (!text) return;
    sendChat(text, "Builder");
    const msg = { text, from: "Builder", ts: Date.now() };
    stateRef.current?.chatMessages?.unshift(msg);
    setChatLog(prev => [msg, ...prev].slice(0, 20));
    setChatInput("");
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

  const inBuildPhase = phase === "build" || phase === "breather";
  const canPlace = inBuildPhase && selectedType && !hasPlacedThisRound;

  // Assignment panel building
  const panelBuilding = assignPanel ? stateRef.current?.buildings.find(b => b.id === assignPanel.buildingId) : null;
  const totalAssigned = stateRef.current ? stateRef.current.buildings.reduce((s, b) => s + (b.workers ?? 0), 0) : 0;
  const freeWorkers = townspeople - totalAssigned;

  return (
    <div style={{ width: "100%", height: "100svh", background: "#0a0d0f", position: "relative", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", cursor: canPlace ? "crosshair" : "default" }}
        onClick={handleCanvasClick}
      />

      {/* Building selector */}
      {inBuildPhase && !hasPlacedThisRound && (
        <div style={{ position: "absolute", bottom: 130, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: "90vw" }}>
          {PLACEABLE_BUILDINGS.map(b => {
            const affordable = (stateRef.current?.gold ?? 0) >= (b.cost ?? 0);
            return (
              <button key={b.id} onClick={() => setSelectedType(selectedType === b.id ? null : b.id)} style={{
                background:   selectedType === b.id ? `rgba(${hexToRgb(b.color)},0.15)` : "rgba(255,255,255,0.03)",
                border:       `0.5px solid ${selectedType === b.id ? b.color : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10, color: selectedType === b.id ? b.color : affordable ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)",
                fontSize: 11, padding: "7px 12px", cursor: affordable ? "pointer" : "not-allowed",
                whiteSpace: "nowrap", transition: "all 0.12s",
              }}>
                {b.label} <span style={{ opacity: 0.6, fontSize: 10 }}>{b.cost}g</span>
              </button>
            );
          })}
        </div>
      )}

      {canPlace && (
        <div style={{ position: "absolute", bottom: 175, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(120,200,255,0.5)", pointerEvents: "none", whiteSpace: "nowrap" }}>
          tap within range to place {BUILDING_TYPES[selectedType]?.label}
        </div>
      )}

      {hasPlacedThisRound && inBuildPhase && (
        <div style={{ position: "absolute", bottom: 175, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(120,255,120,0.6)", pointerEvents: "none" }}>
          building placed ✓
        </div>
      )}

      {/* Worker assignment panel */}
      {assignPanel && panelBuilding && panelBuilding.hp > 0 && (
        <div onClick={() => setAssignPanel(null)} style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: "absolute",
            left: Math.min(assignPanel.screenX - 94, window.innerWidth - 210),
            top:  Math.max(assignPanel.screenY - 130, 10),
            width: 188, background: "#0f1316",
            border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: BUILDING_TYPES[panelBuilding.type]?.color, marginBottom: 6 }}>
              {BUILDING_TYPES[panelBuilding.type]?.label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 10, lineHeight: 1.5 }}>
              {BUILDING_TYPES[panelBuilding.type]?.description}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>workers assigned</div>
            <div style={{ display: "flex", gap: 3, marginBottom: 12, flexWrap: "wrap", minHeight: 14 }}>
              {Array.from({ length: panelBuilding.workers ?? 0 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(180,220,255,0.65)", border: "0.5px solid rgba(180,220,255,0.35)" }} />
              ))}
              {Array.from({ length: townspeople - (panelBuilding.workers ?? 0) }).map((_, i) => (
                <div key={`e${i}`} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => adjustWorkers(panelBuilding.id, -1)} style={{
                width: 28, height: 28, borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 16,
                cursor: "pointer", opacity: (panelBuilding.workers ?? 0) > 0 ? 1 : 0.3,
              }}>−</button>
              <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.8)", minWidth: 20, textAlign: "center" }}>
                {panelBuilding.workers ?? 0}
              </span>
              <button onClick={() => adjustWorkers(panelBuilding.id, 1)} style={{
                width: 28, height: 28, borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 16,
                cursor: "pointer", opacity: freeWorkers > 0 ? 1 : 0.3,
              }}>+</button>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 4 }}>{freeWorkers} free</span>
            </div>
            <div onClick={() => setAssignPanel(null)} style={{ position: "absolute", top: 8, right: 10, fontSize: 18, color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "2px 4px" }}>×</div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "8px 12px 12px", background: "rgba(10,13,15,0.85)",
        borderTop: "0.5px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ marginBottom: 6, minHeight: 32 }}>
          {chatLog.slice(0, 2).map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              <span style={{ color: "rgba(255,210,80,0.65)" }}>{m.from}: </span>{m.text}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleChatSend()}
            placeholder="message protector…"
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.8)", fontSize: 13, outline: "none" }}
          />
          <button onClick={handleChatSend} style={{ background: "rgba(120,200,255,0.08)", border: "0.5px solid rgba(120,200,255,0.18)", borderRadius: 8, color: "rgba(120,200,255,0.7)", fontSize: 13, padding: "6px 14px", cursor: "pointer" }}>send</button>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}